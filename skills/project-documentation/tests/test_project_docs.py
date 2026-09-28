import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from analyze import analyze, files, sanitize
from project_docs import validate_model, validate_pdf, validate_docx
from render import render
from render_docx import render_docx


class ProjectDocsTests(unittest.TestCase):
    def fixture(self):
        tmp=tempfile.TemporaryDirectory(); root=Path(tmp.name)
        (root/'package.json').write_text(json.dumps({'name':'fixture-app','dependencies':{'react':'19.0.0'}}))
        (root/'api').mkdir(); (root/'api'/'pyproject.toml').write_text('[project]\nname="fixture-api"\ndependencies=["Flask>=3", "Flask-SQLAlchemy>=3"]\n')
        (root/'api'/'app.py').write_text('from flask import Blueprint\napi = Blueprint("api", __name__)\n@api.get("/items")\ndef items():\n    return []\n')
        (root/'api'/'models.py').write_text('from sqlalchemy.orm import Mapped, mapped_column\nclass Item(db.Model):\n    __tablename__ = "items"\n    name: Mapped[str] = mapped_column(String(50), nullable=False)\n')
        (root/'api'/'migrations').mkdir()
        (root/'api'/'migrations'/'one.py').write_text('def upgrade():\n    op.create_table("items")\n')
        (root/'README.md').write_text('Fixture documentation')
        (root/'.env').write_text('SECRET_KEY=never-copy')
        (root/'node_modules').mkdir(); (root/'node_modules'/'secret.ts').write_text('const password="bad"')
        return tmp,root

    def test_discovery_schema_provenance_and_ignored(self):
        tmp,root=self.fixture()
        with tmp:
            self.assertNotIn('.env',files(root))
            self.assertNotIn('node_modules/secret.ts',files(root))
            doc=analyze(root); validate_model(doc,root)
            self.assertEqual(doc['metadata']['name'],'fixture-app')
            self.assertIn('React',doc['metadata']['frameworks'])
            self.assertEqual(len(doc['data_model']['tables']),1)
            self.assertTrue(doc['data_model']['tables'][0]['migration_sources'])
            self.assertEqual(doc['api']['routes'][0]['path'],'/items')
            self.assertGreater(doc['api']['routes'][0]['source']['start_line'],1)
            self.assertTrue(doc['claims'][0]['sources'])

    def test_redaction(self):
        text='x = 1\nSECRET_KEY = "topsecret"\nurl="mysql://user:password@host/db"'
        self.assertNotIn('topsecret',sanitize(text))
        self.assertNotIn('password@',sanitize(text))
        self.assertNotIn('fallback-value',sanitize('SECRET_KEY = os.getenv("SECRET_KEY", "fallback-value")'))

    def test_optional_sections_and_pdf(self):
        tmp,root=self.fixture()
        with tmp:
            (root/'api'/'app.py').unlink(); (root/'api'/'models.py').unlink(); (root/'api'/'migrations'/'one.py').unlink()
            doc=analyze(root); validate_model(doc,root)
            self.assertFalse(doc['data_model']['tables']); self.assertFalse(doc['api']['routes'])
            out=root/'project-docs-build'; pdf=render(doc,out/'output'/'fixture.pdf',out/'diagrams')
            result=validate_pdf(pdf,doc,out/'qa')
            self.assertGreaterEqual(result['page_count'],3)
            editable=render_docx(doc,out/'output'/'fixture.docx',out/'figures')
            check=validate_docx(editable,doc)
            self.assertEqual(check['diagram_image_count'],1)

    def test_express_and_prisma_adapters(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/'package.json').write_text(json.dumps({'name':'sample','dependencies':{'express':'4.0'}}))
            (root/'server.ts').write_text('const app = express();\napp.get("/health", () => ({}));\n')
            (root/'schema.prisma').write_text('model Account {\n  id String @id\n  email String @unique\n}\n')
            doc=analyze(root); validate_model(doc,root)
            self.assertEqual(doc['api']['routes'][0]['path'],'/health')
            self.assertEqual(doc['data_model']['technology'],'Prisma')
            self.assertEqual(doc['data_model']['tables'][0]['name'],'Account')

    def test_malformed_manifest_degrades(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); (root/'package.json').write_text('{broken')
            doc=analyze(root); validate_model(doc,root)
            self.assertEqual(doc['metadata']['name'],root.name)

    def test_unsupported_or_empty_repository(self):
        with tempfile.TemporaryDirectory() as tmp:
            doc=analyze(tmp); validate_model(doc,tmp)
            self.assertEqual(doc['metadata']['type'],'backend/library')
            self.assertFalse(doc['data_model']['tables'])
            self.assertFalse(doc['api']['routes'])


if __name__=='__main__': unittest.main()
