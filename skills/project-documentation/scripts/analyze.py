"""Static, bounded repository analysis. No project code is imported or executed."""
from __future__ import annotations
import ast
import json
import os
import re
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

SKIP = {'.git', '.venv', 'venv', 'node_modules', 'vendor', 'dist', 'build', 'coverage', '__pycache__', '.next', '.project-docs', '.tox', '.mypy_cache', '.pytest_cache', 'target', 'Pods'}
PRIVATE = re.compile(r'(^|/)(\.env(?:\.|$)|[^/]*\.(?:pem|key|p12|pfx|sqlite|db)$|id_rsa|credentials(?:\.|$)|secrets?(?:\.|$))', re.I)
SOURCE_EXT = {'.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.rs', '.java', '.swift', '.dart', '.sql', '.prisma'}
MAX_FILE = 250_000


def git(root, *args):
    try:
        return subprocess.run(['git', '-C', str(root), *args], capture_output=True, text=True, timeout=3).stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return ''


def files(root):
    root = Path(root).resolve()
    if git(root, 'rev-parse', '--is-inside-work-tree') == 'true':
        names = git(root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0')
    else:
        names = [str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()]
    out = []
    try: self_path=Path(__file__).resolve().parents[1].relative_to(root).as_posix()
    except ValueError: self_path=None
    for name in names:
        if not name or (self_path and (name==self_path or name.startswith(self_path+'/'))) or any(x in SKIP for x in Path(name).parts) or PRIVATE.search(name):
            continue
        p = root / name
        if p.is_file() and not p.is_symlink() and p.stat().st_size <= MAX_FILE:
            out.append(name)
    return sorted(set(out))


def read(root, path):
    if PRIVATE.search(path):
        return ''
    try:
        return (Path(root) / path).read_text(encoding='utf-8', errors='replace')
    except (OSError, UnicodeError):
        return ''


def ev(path, line=1, end=None, kind='implementation', confidence='high'):
    return {'path': path, 'start_line': line, 'end_line': end or line, 'evidence_type': kind, 'confidence': confidence}


def claim(text, sources):
    return {'text': text, 'sources': sources}


def line_of(text, needle):
    i = text.find(needle)
    return text.count('\n', 0, i) + 1 if i >= 0 else 1


def discovery(root, paths):
    names = set(paths)
    try: package = json.loads(read(root, 'package.json') or '{}') if 'package.json' in names else {}
    except json.JSONDecodeError: package = {}
    pyprojects = [p for p in paths if p.endswith('pyproject.toml')]
    pytext = '\n'.join(read(root, p) for p in pyprojects)
    deps = package.get('dependencies', {}) | package.get('devDependencies', {})
    markers = {'React': 'react' in deps, 'Next.js': 'next' in deps or any(p.startswith('app/') and p.endswith('page.tsx') for p in paths), 'Flutter': 'pubspec.yaml' in names, 'Flask': bool(re.search(r'\bFlask[<=>~ ]', pytext, re.I)), 'Django': bool(re.search(r'\bDjango[<=>~ ]', pytext, re.I)), 'FastAPI': bool(re.search(r'\bfastapi[<=>~ ]', pytext, re.I)), 'Express': 'express' in deps, 'NestJS': '@nestjs/core' in deps, 'Spring Boot': any('spring-boot' in read(root,p) for p in paths if Path(p).name in {'pom.xml','build.gradle','build.gradle.kts'}), 'Vite': 'vite' in deps}
    frameworks = [k for k,v in markers.items() if v]
    languages = Counter({ext: sum(Path(p).suffix == ext for p in paths) for ext in SOURCE_EXT})
    langs = [{'name': {'.py':'Python','.ts':'TypeScript','.tsx':'TypeScript/React','.js':'JavaScript','.jsx':'JavaScript/React','.go':'Go','.rs':'Rust','.java':'Java','.swift':'Swift','.dart':'Dart','.sql':'SQL','.prisma':'Prisma'}[ext], 'files': n} for ext,n in languages.most_common() if n]
    proj = package.get('name')
    if not proj and pyprojects:
        m = re.search(r'^name\s*=\s*["\']([^"\']+)', pytext, re.M)
        if m: proj = m.group(1)
    proj = proj or root.name
    display=proj.replace('-', ' ').title()
    for rp in [p for p in paths if Path(p).name.lower().startswith('readme')]:
        head=re.search(r'^#\s+([^\n]+)',read(root,rp),re.M)
        if head:
            token=head.group(1).split()[0]
            if token.casefold()==proj.casefold(): display=token; break
    manifests = [p for p in paths if Path(p).name in {'package.json','pyproject.toml','Cargo.toml','go.mod','pubspec.yaml','pom.xml','build.gradle','build.gradle.kts','Package.swift'}]
    tests = [p for p in paths if (('/test' in p or p.startswith('test') or p.endswith('.test.ts') or p.endswith('_test.go')) and Path(p).suffix in SOURCE_EXT and Path(p).name!='__init__.py')]
    return {'name': proj, 'display_name': display, 'type': 'full-stack' if any(x in frameworks for x in ['React','Next.js','Flutter']) and any(x in frameworks for x in ['Flask','Django','FastAPI','Express','NestJS','Spring Boot']) else ('frontend' if any(x in frameworks for x in ['React','Next.js','Flutter']) else 'backend/library'), 'frameworks': frameworks, 'languages': langs, 'manifests': manifests, 'test_files': tests, 'source_files': [p for p in paths if Path(p).suffix in SOURCE_EXT], 'branch': git(root,'branch','--show-current') or None, 'commit': git(root,'rev-parse','HEAD') or None, 'generated_at': datetime.now(timezone.utc).isoformat(), 'root': str(root)}


def parse_python(text):
    try: return ast.parse(text)
    except SyntaxError: return None


def lit(node):
    try: return ast.literal_eval(node)
    except (ValueError, TypeError, SyntaxError): return None


def ast_name(node):
    if isinstance(node, ast.Name): return node.id
    if isinstance(node, ast.Attribute): return ast_name(node.value)+'.'+node.attr
    if isinstance(node, ast.Call): return ast_name(node.func)
    return ''


def call_kw(node, key):
    if not isinstance(node, ast.Call): return None
    return next((lit(k.value) for k in node.keywords if k.arg == key), None)


def model_tables(root, paths):
    tables, migrations = [], []
    for path in paths:
        if not path.endswith('.py'): continue
        text = read(root,path)
        tree = parse_python(text)
        if not tree: continue
        if '/migrations/' in '/'+path or '/alembic/' in '/'+path:
            wrappers={n.name for n in tree.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and any(isinstance(c,ast.Call) and ast_name(c.func)=='op.create_table' for c in ast.walk(n))}
            for n in ast.walk(tree):
                if isinstance(n, ast.Call) and ast_name(n.func).split('.')[-1] in ({'create_table','add_column','create_index','create_foreign_key'} | wrappers):
                    name = lit(n.args[0]) if n.args else None
                    if isinstance(name,str): migrations.append({'operation': 'create_table' if ast_name(n.func) in wrappers else ast_name(n.func).split('.')[-1], 'name': name, 'source': ev(path,n.lineno,n.end_lineno,'migration')})
        for cls in [n for n in tree.body if isinstance(n,ast.ClassDef)]:
            tab = next((lit(n.value) for n in cls.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='__tablename__' for t in n.targets)),None)
            if not isinstance(tab,str): continue
            cols, constraints = [], []
            for n in cls.body:
                if isinstance(n,ast.AnnAssign) and isinstance(n.target,ast.Name) and isinstance(n.value,ast.Call) and ast_name(n.value.func).split('.')[-1] in {'mapped_column','Column','Field'}:
                    name = n.target.id
                    snippet = ast.get_source_segment(text,n) or ''
                    fk = re.search(r'ForeignKey\(["\']([^"\']+)',snippet)
                    typ = ast_name(n.value.args[0]) if n.value.args else ''
                    cols.append({'name': name, 'type': typ or 'inferred', 'primary_key': 'primary_key=True' in snippet, 'nullable': 'nullable=False' not in snippet, 'foreign_key': fk.group(1) if fk else None, 'source': ev(path,n.lineno,n.end_lineno)})
                if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='__table_args__' for t in n.targets):
                    for q in ast.walk(n.value):
                        if isinstance(q,ast.Call) and ast_name(q.func).split('.')[-1] in {'UniqueConstraint','CheckConstraint','Index'}:
                            constraints.append({'kind': ast_name(q.func).split('.')[-1], 'columns': [x for a in q.args if isinstance((x:=lit(a)),str)], 'source': ev(path,q.lineno,q.end_lineno)})
            tables.append({'name':tab,'class':cls.name,'columns':cols,'constraints':constraints,'source':ev(path,cls.lineno,cls.end_lineno),'migration_sources':[]})
    for path in paths:
        if not path.endswith('.prisma'): continue
        text=read(root,path)
        for match in re.finditer(r'(?ms)^model\s+(\w+)\s*\{(.*?)^\}',text):
            model_name,body=match.group(1),match.group(2)
            mapped=re.search(r'@@map\(\"([^\"]+)\"\)',body)
            name=mapped.group(1) if mapped else model_name
            cols=[]; raw_fields=[]
            for line in body.splitlines():
                m=re.match(r'\s*(\w+)\s+(\w+[?\[\]]*)\s*(.*)',line)
                if not m or m.group(1).startswith('@@'): continue
                field,typ,rest=m.groups(); lineno=text.count('\n',0,match.start())+body[:body.find(line)].count('\n')+2
                raw_fields.append((field,typ,rest,lineno))
                if '@relation' not in rest:
                    cols.append({'name':field,'type':typ,'primary_key':'@id' in rest,'nullable':'?' in typ,'foreign_key':None,'source':ev(path,lineno)})
            for field,typ,rest,lineno in raw_fields:
                rel=re.search(r'@relation\([^)]*fields:\s*\[([^]]+)\]',rest)
                if rel:
                    target=typ.rstrip('?[]')
                    target_name=next((t['name'] for t in tables if t['class']==target),target)
                    for local in [x.strip() for x in rel.group(1).split(',')]:
                        for col in cols:
                            if col['name']==local: col['foreign_key']=target_name+'.id'
            tables.append({'name':name,'class':model_name,'columns':cols,'constraints':[],'source':ev(path,text.count('\n',0,match.start())+1,text.count('\n',0,match.end())+1),'migration_sources':[]})
    for t in tables:
        t['migration_sources']=[m['source'] for m in migrations if m['operation']=='create_table' and m['name']==t['name']]
    tech='SQLAlchemy' if any(t['source']['path'].endswith('.py') for t in tables) else 'Prisma' if tables else None
    dialect=None; dialect_source=None
    for path in paths:
        if Path(path).name not in {'config.py','settings.py','database.py','schema.prisma'}: continue
        code=read(root,path)
        for term,label in [('mysql+pymysql','MySQL'),('postgresql+','PostgreSQL'),('postgres://','PostgreSQL'),('provider = "postgresql"','PostgreSQL'),('provider = "mysql"','MySQL')]:
            if term in code: dialect=label; dialect_source=ev(path,line_of(code,term),'configuration'); break
        if dialect: break
    return {'technology': tech,'dialect':dialect,'dialect_source':dialect_source,'tables':tables,'migrations':migrations,'discrepancies':[f"Model table {t['name']} has no discovered create_table migration" for t in tables if migrations and not t['migration_sources']]}


def api_routes(root, paths):
    blueprint_prefix = {}
    for path in paths:
        if not path.endswith('.py'): continue
        text=read(root,path)
        tree=parse_python(text)
        if not tree: continue
        for n in ast.walk(tree):
            if isinstance(n,ast.Call) and ast_name(n.func).endswith('register_blueprint') and n.args and isinstance(n.args[0],ast.Name):
                prefix=call_kw(n,'url_prefix')
                if isinstance(prefix,str): blueprint_prefix[n.args[0].id]=prefix
    routes=[]
    for path in paths:
        if not path.endswith('.py'): continue
        text=read(root,path); tree=parse_python(text)
        if not tree: continue
        for n in ast.walk(tree):
            if not isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)): continue
            decos=n.decorator_list
            auth=any('auth_required' in ast_name(d) or 'login_required' in ast_name(d) for d in decos)
            admin=any('admin_required' in ast_name(d) or (ast_name(d)=='auth_required' and call_kw(d,'admin') is True) for d in decos)
            for d in decos:
                if not isinstance(d,ast.Call): continue
                parts=ast_name(d.func).split('.')
                if len(parts)<2 or parts[-1] not in {'route','get','post','put','patch','delete'}: continue
                bp=parts[-2]; suffix=lit(d.args[0]) if d.args else ''
                if not isinstance(suffix,str): continue
                methods=call_kw(d,'methods') if parts[-1]=='route' else [parts[-1].upper()]
                if not isinstance(methods,(list,tuple)): methods=['GET']
                prefix=blueprint_prefix.get(bp,'')
                # A parent API prefix may be registered in an app factory.
                parent='/api/v1' if any('url_prefix="/api/v1"' in read(root,p) or "url_prefix='/api/v1'" in read(root,p) for p in paths if p.endswith('__init__.py')) and path.startswith(('api/','app/')) else ''
                if prefix.startswith('/api/'): parent=''
                route=(parent+prefix+suffix).replace('//','/') or '/'
                body=ast.get_source_segment(text,n) or ''
                status=sorted(set(re.findall(r'\b(?:status|status_code)\s*=\s*(\d{3})\b',body)))
                schema_match=re.search(r'\b(\w+Schema)\(\)\.load\(',body)
                request_schema=schema_match.group(1) if schema_match else None
                query_params=sorted(set(re.findall(r'request\.args\.get\(\s*[\"\']([^\"\']+)',body)))
                routes.append({'request_schema':request_schema,'query_params':query_params,'method':str(methods[0]).upper(),'path':route,'handler':n.name,'auth': 'admin' if admin else 'required' if auth else 'not indicated locally','status_codes':status,'source':ev(path,n.lineno,n.end_lineno),'group':prefix.strip('/').split('/')[0] or 'general'})
    for path in paths:
        if Path(path).suffix not in {'.js','.jsx','.ts','.tsx'}: continue
        text=read(root,path)
        for m in re.finditer(r'\b(?:app|router|server)\.(get|post|put|patch|delete)\(\s*[\"\']([^\"\']+)[\"\']',text):
            method,route=m.groups(); ln=text.count('\n',0,m.start())+1
            routes.append({'method':method.upper(),'path':route,'handler':'declared callback','request_schema':None,'query_params':[],'auth':'not determinable statically','status_codes':[],'source':ev(path,ln),'group':route.strip('/').split('/')[0] or 'general'})
    return {'routes':sorted(routes,key=lambda x:(x['group'],x['path'],x['method']))}


def architecture(root, paths, disc, db, api):
    groups=[]
    specs=[('Client application',lambda p:p.startswith(('src/','app/')) and p.endswith(('.tsx','.jsx','.dart','.swift'))),('HTTP routes',lambda p:'/api/' in '/'+p and ('routes.' in p or p.endswith('/api.py'))),('Application services',lambda p:'/services/' in '/'+p),('Persistence layer',lambda p:'/repositories/' in '/'+p or '/models/' in '/'+p),('Migration history',lambda p:'/migrations/' in '/'+p),('Background commands',lambda p:'/commands/' in '/'+p or '/workers/' in '/'+p),('Tests',lambda p:'/tests/' in '/'+p or p.startswith('tests/'))]
    for label,pred in specs:
        found=[p for p in paths if pred(p) and Path(p).suffix in SOURCE_EXT]
        if found: groups.append({'name':label,'count':len(found),'sources':[ev(p) for p in found[:4]]})
    nodes=[g['name'] for g in groups if g['name'] not in {'Migration history','Tests','Background commands'}]
    edges=[]
    for a,b in [('Client application','HTTP routes'),('HTTP routes','Application services'),('Application services','Persistence layer')]:
        if a in nodes and b in nodes:
            sources=next(g['sources'] for g in groups if g['name']==b)
            edges.append({'from':a,'to':b,'label':'calls / uses','sources':sources,'confidence':'medium'})
    if db['tables'] and 'Persistence layer' in nodes:
        nodes.append('Database'); edges.append({'from':'Persistence layer','to':'Database','label':'ORM mapping','sources':[db['tables'][0]['source']],'confidence':'high'})
    return {'components':groups,'nodes':nodes,'edges':edges}


def sanitize(text):
    # Never serialize candidate lines that resemble inline credentials or credentialed URLs.
    out=[]
    for line in text.splitlines():
        if (re.search(r'(?i)\b(password|secret(?:[_-]?key)?|api[_-]?key|access[_-]?token|private[_-]?key|credential[s]?)\s*[:=].*["\']',line)
                or re.search(r'(?i)://[^\s/@:]+:[^\s/@]+@',line)
                or re.search(r'AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}',line)):
            out.append('[redacted credential line]')
        else: out.append(line)
    return '\n'.join(out)


def code_figures(root, paths, arch, db, api):
    candidates=[]
    for group in ['HTTP routes','Application services','Persistence layer']:
        g=next((g for g in arch['components'] if g['name']==group),None)
        if g:
            layer_pattern={'HTTP routes':r'/routes\.(py|ts|js)$', 'Application services':r'/services/.+\.(py|ts|js)$', 'Persistence layer':r'/models/.+\.(py|ts|js)$'}[group]
            source_paths=[p for p in paths if re.search(layer_pattern,p) and not p.endswith('__init__.py')]
            priority={'HTTP routes':r'/(auth|transactions?)/', 'Application services':r'/(transactions?|auth)\.', 'Persistence layer':r'/(transactions?|auth|user)\.'}.get(group)
            if priority:
                source_paths.sort(key=lambda path:(not bool(re.search(priority,path)),path))
            if source_paths: candidates.append((group,source_paths[0]))
    figures=[]; seen=set()
    for group,path in candidates:
        if path in seen or len(figures)>=3: continue
        seen.add(path)
        raw=read(root,path)
        if not raw or len(raw)>MAX_FILE: continue
        lines=raw.splitlines()
        start=next((i for i,l in enumerate(lines) if l.startswith(('def ','class ','export class ','export function ')) or l.startswith('@')),0)
        start=min(start,max(0,len(lines)-12)); end=min(len(lines),start+24)
        excerpt=sanitize('\n'.join(lines[start:end]))
        if '[redacted credential line]' in excerpt: continue
        why={'HTTP routes':'The handler maps an HTTP operation to application behavior and shows any local access boundary.', 'Application services':'The service layer coordinates domain operations behind the route boundary.', 'Persistence layer':'The model declares stored fields and relationships used by persistence code.'}.get(group,'This excerpt marks a component boundary.')
        figures.append({'path':path,'start_line':start+1,'end_line':end,'language':Path(path).suffix.lstrip('.'),'code':excerpt,'caption':f'{group}: {path}', 'explanation':why, 'source':ev(path,start+1,end)})
    return figures


def capabilities(root, paths):
    security=[]; background=[]; integrations=[]
    for path in paths:
        if Path(path).suffix not in SOURCE_EXT: continue
        text=read(root,path)
        if not text: continue
        def add(target,label,needle,kind='implementation'):
            target.append({'name':label,'source':ev(path,line_of(text,needle),kind=kind)})
        if 'jwt.encode(' in text and 'jwt.decode(' in text:
            add(security,'JWT encoding and decoding','jwt.encode(')
        if 'X-CSRF-Token' in text and 'compare_digest' in text:
            add(security,'CSRF header and cookie comparison','X-CSRF-Token')
        if 'set_cookie(' in text and 'httponly=True' in text:
            add(security,'HTTP-only authentication cookies','httponly=True')
        if 'auth_required' in text and 'user.role' in text and 'admin' in text and 'def auth_required' in text:
            add(security,'Role check in authentication decorator','user.role')
        if 'smtplib.SMTP_SSL(' in text: add(integrations,'SMTP over TLS','smtplib.SMTP_SSL(')
        for m in re.finditer(r'@app\.cli\.command\([\"\']([^\"\']+)',text):
            background.append({'name':m.group(1),'source':ev(path,text.count('\n',0,m.start())+1)})
        for m in re.finditer(r'@click\.command\([\"\']([^\"\']+)',text):
            background.append({'name':m.group(1),'source':ev(path,text.count('\n',0,m.start())+1)})
    return security,background,integrations


def readme_discrepancies(root, paths):
    issues=[]
    readmes=[p for p in paths if Path(p).name.lower().startswith('readme')]
    for rp in readmes:
        prose=read(root,rp)
        for match in re.finditer(r'defaults? to\s+`([A-Z][A-Z0-9_]+)=([^`]+)`',prose,re.I):
            var,claimed=match.group(1),match.group(2)
            for sp in paths:
                if Path(sp).suffix not in {'.ts','.tsx','.js','.jsx'}: continue
                code=read(root,sp)
                if ('import.meta.env.'+var) not in code: continue
                found=re.search(r'value\s*===\s*undefined\s*\|\|\s*value\s*===\s*[\"\']([^\"\']+)',code)
                if found and found.group(1)!=claimed:
                    issues.append(f"README default {var}={claimed} at {rp}:{line_of(prose,match.group(0))} differs from source fallback {found.group(1)} at {sp}:{line_of(code,found.group(0))}.")
    return issues


def analyze(root):
    root=Path(root).resolve(); paths=files(root)
    disc=discovery(root,paths); db=model_tables(root,paths); api=api_routes(root,paths); arch=architecture(root,paths,disc,db,api)
    security,background,integrations=capabilities(root,paths)
    claims=[claim(f"The repository is classified as {disc['type']} and contains {', '.join(disc['frameworks']) or 'no identified framework'}.",[ev(p,1,kind='configuration') for p in disc['manifests'][:3]])]
    for item in security+background+integrations: claims.append(claim(item['name']+' is present in source.',[item['source']]))
    if db['tables']: claims.append(claim(f"The source declares {len(db['tables'])} ORM tables.",[t['source'] for t in db['tables']]))
    if api['routes']: claims.append(claim(f"Static route analysis found {len(api['routes'])} HTTP handlers.",[r['source'] for r in api['routes']]))
    limitations=[]
    if not db['tables']: limitations.append('No supported ORM table declarations were detected; database design is undetermined.')
    if not api['routes']: limitations.append('No supported decorated HTTP routes were detected.')
    if not any(p in paths for p in ['Dockerfile','docker-compose.yml','compose.yaml','render.yaml','vercel.json','fly.toml']): limitations.append('A deployed topology cannot be determined from committed infrastructure files.')
    if db['discrepancies']: limitations.extend(db['discrepancies'])
    limitations.extend(readme_discrepancies(root,paths))
    doc={'schema_version':'1.0','metadata':disc,'repository_summary':{'readme_paths':[p for p in paths if Path(p).name.lower().startswith('readme')],'file_count':len(paths)},'technology_stack':disc['frameworks'],'architecture':arch,'data_model':db,'api':api,'testing':{'files':disc['test_files']},'security':security,'background_processing':background,'integrations':integrations,'code_figures':code_figures(root,paths,arch,db,api),'claims':claims,'limitations':limitations,'provenance':[s for c in claims for s in c['sources']]}
    return doc
