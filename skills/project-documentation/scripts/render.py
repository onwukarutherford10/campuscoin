"""Deterministic ReportLab composition from project documentation JSON."""
from __future__ import annotations
import json
import math
import re
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import simpleSplit
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, KeepTogether, Table, TableStyle, Flowable, NextPageTemplate
from reportlab.platypus.tableofcontents import TableOfContents
from pygments import lex
from pygments.lexers import get_lexer_by_name
from pygments.token import Token

INK=colors.HexColor('#172235'); MUTED=colors.HexColor('#536070'); ACCENT=colors.HexColor('#1E567A'); LINE=colors.HexColor('#C8D0D8'); LIGHT=colors.HexColor('#F1F4F6'); CODE=colors.HexColor('#111820')
PAGE_W,PAGE_H=letter
LEFT=62; RIGHT=62; TOP=66; BOTTOM=58; WIDTH=PAGE_W-LEFT-RIGHT

styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='ReportTitle',fontName='Times-Bold',fontSize=26,leading=31,textColor=INK,alignment=TA_CENTER,spaceAfter=18))
styles.add(ParagraphStyle(name='ReportSubtitle',fontName='Times-Roman',fontSize=13,leading=18,textColor=MUTED,alignment=TA_CENTER))
styles.add(ParagraphStyle(name='Chapter',fontName='Times-Bold',fontSize=17,leading=22,textColor=INK,spaceBefore=16,spaceAfter=10,keepWithNext=True))
styles.add(ParagraphStyle(name='Section',fontName='Times-Bold',fontSize=12,leading=16,textColor=INK,spaceBefore=13,spaceAfter=7,keepWithNext=True))
styles.add(ParagraphStyle(name='BodyReport',fontName='Times-Roman',fontSize=10.5,leading=15,textColor=INK,spaceAfter=8))
styles.add(ParagraphStyle(name='SmallReport',fontName='Helvetica',fontSize=8,leading=11,textColor=INK))
styles.add(ParagraphStyle(name='Caption',fontName='Times-Italic',fontSize=9,leading=12,textColor=MUTED,spaceBefore=6,spaceAfter=10))
styles.add(ParagraphStyle(name='Meta',fontName='Helvetica',fontSize=9,leading=14,textColor=MUTED,alignment=TA_CENTER))
styles.add(ParagraphStyle(name='TOC',fontName='Times-Roman',fontSize=10.5,leading=17,leftIndent=10,firstLineIndent=-10))


def P(text, style='BodyReport'):
    return Paragraph(escape(str(text)).replace('\n','<br/>'), styles[style])


def source_text(s):
    p=s['path']; start=s.get('start_line',1); end=s.get('end_line',start)
    return f"{p}:{start}"+(f"-{end}" if end!=start else '')


class Diagram(Flowable):
    def __init__(self, spec, width=WIDTH, height=260):
        super().__init__(); self.spec=spec; self.width=width; self.height=height
    def draw(self):
        c=self.canv; nodes=self.spec.get('nodes',[]); edges=self.spec.get('edges',[])
        if not nodes: return
        c.setStrokeColor(LINE); c.setFillColor(LIGHT); c.roundRect(0,0,self.width,self.height,6,stroke=1,fill=1)
        if self.spec.get('kind')=='architecture':
            n=len(nodes); gap=11; bw=min(210,(self.width-48)); bh=min(32,(self.height-38-(n-1)*gap)/n)
            top=self.height-20
            for i,name in enumerate(nodes):
                y=top-(i+1)*bh-i*gap; x=(self.width-bw)/2
                c.setFillColor(colors.white); c.setStrokeColor(ACCENT); c.roundRect(x,y,bw,bh,4,stroke=1,fill=1)
                c.setFillColor(INK); c.setFont('Helvetica-Bold',9)
                c.drawCentredString(self.width/2,y+bh/2-3,name[:40])
                if i<n-1:
                    c.setStrokeColor(ACCENT); c.line(self.width/2,y-2,self.width/2,y-gap+3)
                    c.line(self.width/2,y-gap+3,self.width/2-3,y-gap+7); c.line(self.width/2,y-gap+3,self.width/2+3,y-gap+7)
        else:
            # Six entity boxes per panel keep table labels legible at normal view size.
            cols=2; rows=math.ceil(len(nodes)/cols); gapx=18; gapy=18; margin=18
            bw=(self.width-2*margin-gapx)/2; bh=min(92,(self.height-2*margin-(rows-1)*gapy)/rows)
            pos={}
            for i,node in enumerate(nodes):
                col=i%2; row=i//2; x=margin+col*(bw+gapx); y=self.height-margin-(row+1)*bh-row*gapy; pos[node['name']]=(x,y)
            c.setStrokeColor(colors.HexColor('#AAB6BF'))
            for edge in edges:
                a=pos.get(edge['from']); b=pos.get(edge['to'])
                if a and b:
                    x1,y1=a; x2,y2=b; c.line(x1+bw/2,y1+bh/2,x2+bw/2,y2+bh/2)
            for node in nodes:
                x,y=pos[node['name']]; c.setFillColor(colors.white); c.setStrokeColor(ACCENT); c.rect(x,y,bw,bh,stroke=1,fill=1)
                c.setFillColor(ACCENT); c.rect(x,y+bh-20,bw,20,stroke=0,fill=1)
                c.setFillColor(colors.white); c.setFont('Helvetica-Bold',8.5); c.drawString(x+7,y+bh-13,node['name'][:31])
                c.setFillColor(INK); c.setFont('Helvetica',7.5)
                for j,col in enumerate(node.get('columns',[])[:5]): c.drawString(x+7,y+bh-31-j*11,col['name'][:34])
                if len(node.get('columns',[]))>5: c.drawString(x+7,y+bh-86,'…')


class CodeFigure(Flowable):
    def __init__(self,fig):
        super().__init__(); self.fig=fig; self.width=WIDTH; self.lines=fig['code'].splitlines(); self.height=28+len(self.lines)*10.2+10
    def draw(self):
        c=self.canv; c.setFillColor(CODE); c.roundRect(0,0,self.width,self.height,4,stroke=0,fill=1)
        c.setFillColor(colors.HexColor('#B8C7D1')); c.setFont('Helvetica',8); c.drawString(12,self.height-17,self.fig['path'])
        c.setStrokeColor(colors.HexColor('#334353')); c.line(12,self.height-24,self.width-12,self.height-24)
        try: lexer=get_lexer_by_name({'tsx':'typescript','ts':'typescript','py':'python','js':'javascript','jsx':'javascript'}.get(self.fig['language'],self.fig['language']))
        except Exception: lexer=None
        for i,line in enumerate(self.lines):
            y=self.height-36-i*10.2; c.setFillColor(colors.HexColor('#728596')); c.setFont('Courier',7); c.drawRightString(32,y,str(self.fig['start_line']+i))
            shown=line.expandtabs(2)
            if len(shown)>88: shown=shown[:85]+'…'
            x=43
            parts=list(lex(shown,lexer)) if lexer else [(Token.Text,shown)]
            for token,value in parts:
                if '\n' in value: value=value.split('\n')[0]
                if not value: continue
                col='#E0E8EE'
                if token in Token.Keyword: col='#D7A5E9'
                elif token in Token.String: col='#9DCEA4'
                elif token in Token.Comment: col='#8496A5'
                elif token in Token.Name.Function or token in Token.Name.Class: col='#85C7E9'
                elif token in Token.Number: col='#E9BA83'
                c.setFillColor(colors.HexColor(col)); c.setFont('Courier',7); c.drawString(x,y,value)
                x+=len(value)*4.2


class Report(BaseDocTemplate):
    def __init__(self,path,title):
        super().__init__(str(path),pagesize=letter,leftMargin=LEFT,rightMargin=RIGHT,topMargin=TOP,bottomMargin=BOTTOM,title=title,author='project-documentation skill')
        self.report_title=title
        frame=Frame(LEFT,BOTTOM,WIDTH,PAGE_H-TOP-BOTTOM,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
        self.addPageTemplates([PageTemplate(id='report',frames=[frame],onPage=self.header_footer)])
    def header_footer(self,c,doc):
        n=doc.page
        if n==1: return
        c.setStrokeColor(LINE); c.setLineWidth(.5); c.line(LEFT,PAGE_H-44,PAGE_W-RIGHT,PAGE_H-44)
        c.setFont('Helvetica',8); c.setFillColor(MUTED); c.drawString(LEFT,PAGE_H-36,self.report_title[:70]); c.drawRightString(PAGE_W-RIGHT,35,str(n))
    def afterFlowable(self,flowable):
        if isinstance(flowable,Paragraph) and getattr(flowable,'toc_title',None):
            self.notify('TOCEntry',(0,flowable.toc_title,self.page))


def heading(text,level='Chapter'):
    p=P(text,level)
    if level=='Chapter': p.toc_title=text
    return p


def table(data,widths=None):
    cooked=[[P(x,'SmallReport') for x in row] for row in data]
    t=Table(cooked,colWidths=widths or [WIDTH/len(data[0])]*len(data[0]),repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),LIGHT),('TEXTCOLOR',(0,0),(-1,0),INK),('LINEBELOW',(0,0),(-1,0),.8,ACCENT),('LINEBELOW',(0,1),(-1,-1),.35,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    return t


def architecture_spec(doc):
    a=doc['architecture']; return {'kind':'architecture','nodes':a['nodes'],'edges':a['edges']}


def er_specs(doc):
    tabs=doc['data_model']['tables']
    if not tabs: return []
    incoming={t['name']:0 for t in tabs}
    for t in tabs:
        for col in t['columns']:
            fk=col.get('foreign_key')
            if fk and fk.split('.')[0] in incoming: incoming[fk.split('.')[0]]+=1
    hub_name=max(incoming,key=incoming.get)
    hub=next(t for t in tabs if t['name']==hub_name)
    others=[t for t in tabs if t['name']!=hub_name]
    # Repeat the principal referenced entity so relationships remain visible in split panels.
    if incoming[hub_name] < 2: chunks=[tabs[i:i+6] for i in range(0,len(tabs),6)]
    else: chunks=[[hub]+others[i:i+5] for i in range(0,len(others),5)]
    groups=[]
    for chunk in chunks:
        names={t['name'] for t in chunk}; edges=[]
        for t in chunk:
            for col in t['columns']:
                fk=col.get('foreign_key')
                if fk and fk.split('.')[0] in names: edges.append({'from':t['name'],'to':fk.split('.')[0],'label':col['name']})
        groups.append({'kind':'er','nodes':chunk,'edges':edges})
    return groups


def render(doc,path,diagrams_dir):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True); diagrams_dir=Path(diagrams_dir); diagrams_dir.mkdir(parents=True,exist_ok=True)
    a=architecture_spec(doc); (diagrams_dir/'architecture.json').write_text(json.dumps(a,indent=2))
    ers=er_specs(doc)
    for i,e in enumerate(ers,1): (diagrams_dir/f'database-er-{i}.json').write_text(json.dumps(e,indent=2))
    title=doc['metadata'].get('display_name') or doc['metadata']['name'].replace('-',' ').title(); story=[]
    story += [Spacer(1,104),P('TECHNICAL DOCUMENTATION','Meta'),Spacer(1,34),P(title,'ReportTitle'),P('Repository architecture and implementation report','ReportSubtitle'),Spacer(1,110),P(f"Branch: {doc['metadata'].get('branch') or 'not available'}",'Meta'),P(f"Commit: {(doc['metadata'].get('commit') or 'not available')[:12]}",'Meta'),P(f"Generated: {doc['metadata']['generated_at'][:10]}",'Meta'),Spacer(1,75),P('Prepared from repository implementation and configuration. Source references appear with technical findings.','Meta'),PageBreak()]
    story += [P('Contents','Chapter'),Spacer(1,8)]
    toc=TableOfContents(); toc.levelStyles=[styles['TOC']]; story += [toc,PageBreak()]
    d=doc['metadata']; story += [heading('1. Project Overview'),P(f"{title} is classified by repository structure as a {d['type']} project. This report documents discovered source code, manifests, routes, persistence declarations, and tests at the recorded commit. Classification is a structural inference rather than a runtime deployment claim."),P('Evidence: '+', '.join(d['manifests'][:4]),'Caption')]
    story += [heading('2. Technology Stack')]
    rows=[['Technology','Repository evidence']]
    for f in d['frameworks']: rows.append([f,', '.join(d['manifests'][:3])])
    for l in d['languages'][:6]: rows.append([l['name'],f"{l['files']} source files"])
    if len(rows)>1: story += [table(rows,[WIDTH*.37,WIDTH*.63]),Spacer(1,10)]
    story += [heading('3. System Architecture'),P('The component view reflects source directories and declared integration points. Arrows show likely call direction across recognized layers; verify individual flows against the referenced modules.'),Diagram(a,height=min(370,max(210,55*len(a['nodes'])))),P('Figure 1. Repository component architecture.','Caption')]
    comps=doc['architecture']['components']
    if comps:
        story += [heading('4. Component Architecture'),table([['Component','Files','Example evidence']]+[[g['name'],str(g['count']),source_text(g['sources'][0])] for g in comps],[WIDTH*.35,WIDTH*.1,WIDTH*.55])]
    db=doc['data_model']
    if db['tables']:
        story += [heading('5. Database Design')]
        if db.get('dialect'): story += [P(f"Configured database dialect: {db['dialect']}. Evidence: {source_text(db['dialect_source'])}.")]
        story += [P(f"Static analysis found {len(db['tables'])} {db.get('technology') or 'schema'} model declarations. Migration operations are cross-referenced where present. The ER panels show a bounded selection of columns and relationships; the table descriptions give fields declared directly on each model."),P(f"Detected migration operations: {len(db['migrations'])}.",'Caption')]
        for i,e in enumerate(ers,1):
            relations=', '.join(f"{q['from']}.{q['label']} to {q['to']}" for q in e['edges']) or 'No foreign keys are visible within this panel.'
            story += [P(f'Entity relationship panel {i}','Section'),Diagram(e,height=math.ceil(len(e['nodes'])/2)*112+30),P(f'Figure {i+1}. Entity relationships, panel {i}.','Caption'),P('Visible relationships: '+relations,'SmallReport'),Spacer(1,8)]
        for t in db['tables']:
            story += [heading(t['name'],'Section'),P(f"ORM class {t['class']}. Model: {source_text(t['source'])}. " + (f"Migration: {source_text(t['migration_sources'][0])}." if t['migration_sources'] else 'No matching create-table migration found in static analysis.'))]
            rows=[['Column','Type / relationship']]+[[c['name'],(c['type']+(' → '+c['foreign_key'] if c['foreign_key'] else '')+(' · PK' if c['primary_key'] else ''))] for c in t['columns']]
            if len(rows)>1: story += [table(rows,[WIDTH*.36,WIDTH*.64]),Spacer(1,6)]
            if t['constraints']: story += [P('Constraints and indexes: '+', '.join(q['kind']+'('+', '.join(q['columns'])+')' for q in t['constraints']),'Caption')]
    api=doc['api']['routes']
    if api:
        story += [heading('6. API Design'),P(f"Static decorator analysis identified {len(api)} route handlers. Authentication labels reflect decorators present directly on handlers. Named request schemas are listed where explicit. Response schemas are not inferred from handler names.")]
        groups=sorted(set(r['group'] for r in api))
        for group in groups:
            items=[r for r in api if r['group']==group]
            story += [heading(group.title(),'Section'),table([['Method','Route','Auth','Source']]+[[r['method'],r['path'],r['auth'],source_text(r['source'])] for r in items],[WIDTH*.1,WIDTH*.38,WIDTH*.17,WIDTH*.35]),Spacer(1,8)]
        validated=[r for r in api if r.get('request_schema')]
        if validated:
            story += [heading('Declared request validation','Section'),P('The following handlers explicitly load a named request schema. Other handlers may validate in services or parse parameters directly.'),table([['Method and route','Schema','Source']]+[[r['method']+' '+r['path'],r['request_schema'],source_text(r['source'])] for r in validated],[WIDTH*.48,WIDTH*.25,WIDTH*.27])]
    section_number=7
    if doc.get('security'):
        story += [heading(f'{section_number}. Authentication and Security'),P('These controls were identified from executable source patterns. The list does not represent a complete security audit.'),table([['Control','Implementation evidence']]+[[x['name'],source_text(x['source'])] for x in doc['security']],[WIDTH*.55,WIDTH*.45])]
        section_number+=1
    if doc.get('background_processing') or doc.get('integrations'):
        story += [heading(f'{section_number}. Operations and Integrations'),P('Commands and integration boundaries below are source declarations. Their production scheduling or availability is not established by these declarations alone.')]
        if doc.get('background_processing'): story += [table([['Command','Source']]+[[x['name'],source_text(x['source'])] for x in doc['background_processing']],[WIDTH*.5,WIDTH*.5]),Spacer(1,8)]
        if doc.get('integrations'): story += [table([['Integration','Source']]+[[x['name'],source_text(x['source'])] for x in doc['integrations']],[WIDTH*.5,WIDTH*.5])]
        section_number+=1
    tests=doc['testing']['files']
    if tests:
        from collections import Counter
        groups=Counter('/'.join(p.split('/')[:3]) if len(p.split('/'))>3 else '/'.join(p.split('/')[:2]) for p in tests)
        story += [heading(f'{section_number}. Testing Strategy'),P(f"The repository contains {len(tests)} discovered test files. This count indicates test presence, not measured coverage or passing status."),table([['Test area','Files']]+[[k,str(v)] for k,v in sorted(groups.items())],[WIDTH*.78,WIDTH*.22])]
    if tests: section_number+=1
    if doc['code_figures']:
        story += [heading(f'{section_number}. Selected Implementation')]
        for i,f in enumerate(doc['code_figures'],1):
            story += [KeepTogether([heading(f['caption'],'Section'),P(f['explanation']),CodeFigure(f),P(f"Figure {i+len(ers)+1}. Lines {f['start_line']}-{f['end_line']} of {f['path']}.",'Caption')])]
    if doc['code_figures']: section_number+=1
    if doc['limitations']:
        story += [heading(f'{section_number}. Limits of Repository Evidence')]
        for x in doc['limitations']: story += [P('• '+x)]
    story += [heading('Implementation References'),P('All paths below are relative to the repository root. The JSON analysis artifact retains source ranges for each machine-generated claim.'),table([['Evidence path','Line']]+[[s['path'],str(s['start_line'])] for s in doc['provenance'][:5]],[WIDTH*.78,WIDTH*.22])]
    Report(path,title).multiBuild(story)
    return path
