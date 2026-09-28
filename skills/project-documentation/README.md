# Project documentation skill

A reusable, locally reproducible repository-to-PDF technical report generator. It statically discovers source files, creates a schema-versioned JSON documentation model with source ranges, writes deterministic diagram specifications, renders code figures, composes a PDF, and validates the output. It never executes the target project.

## Setup and invocation

Python 3.11+ is required. Create an isolated environment and install `requirements.txt`:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/project_docs.py generate /path/to/repository
```

For review before rendering:

```bash
.venv/bin/python scripts/project_docs.py generate /path/to/repository --analysis-only
```

Use `--output-dir /path/to/build` to put generated artifacts elsewhere. The skill is also invoked by an agent via its `SKILL.md` instructions. Generated output defaults to `<repository>/.project-docs/`; add that directory to the target's ignore rules if needed.

Use `--format both` for PDF and editable DOCX, or `--format docx` for DOCX only. The default remains PDF. Both renderers consume the same JSON model from a single analysis pass.

## Pipeline and artifacts

`analyze.py` performs Git-aware file discovery, manifest/framework detection, Python AST analysis of Flask routes and SQLAlchemy models, bounded Express route and Prisma model parsing, migration cross-referencing, component classification, code excerpt selection, and source-range provenance. The intermediate `analysis/project-documentation.json` follows `schemas/project-documentation.schema.json`. It is the source for all output formats. The renderer does not read target source files.

`render.py` writes `diagrams/architecture.json` and split `diagrams/database-er-N.json` specifications, then uses ReportLab vector drawing for diagrams and Pygments-highlighted code figures. It generates `output/<project>-technical-documentation.pdf` with a cover, TOC, applicable sections, and implementation references. `project_docs.py` validates schema, evidence paths, PDF integrity, expected sections, and obvious credential leakage. It renders representative `qa/page-N.png` images and writes `validation.json`.

`render_docx.py` uses the same model to generate `output/<project>-technical-documentation.docx`. Headings, prose, tables, and syntax-colored code remain editable; diagrams are embedded as high-resolution images generated from the diagram JSON. Its contents list deliberately has no fixed page numbers because Google Docs repaginates after import. In Google Docs, use **Insert > Table of contents** to build a live TOC from the imported headings. `docx-validation.json` checks sections, tables, diagram images, and secret patterns.

## Supported analysis and limitations

Discovery recognizes common Python, JavaScript/TypeScript, Go, Rust, Java, Swift, and Dart manifests/source files. Framework identification covers React, Next.js, Vite, Flask, Django, FastAPI, Express, NestJS, Spring Boot, and Flutter. Deep route and ORM extraction currently covers Flask Blueprint decorators and SQLAlchemy declarative models. Basic static adapters also recognize Express route declarations and Prisma models. FastAPI route decorators are discovered without router mount resolution. Migration cross-reference recognizes Alembic create-table calls and local wrappers. Other stacks receive architecture and manifest summaries, with database and API sections omitted when evidence cannot be extracted. SQLAlchemy migration wrappers, named request validators, selected security controls, CLI commands, and SMTP boundaries are source checked. Dependency presence is never reported as proof of a running integration. Existing OpenAPI, request/response schemas, non-Flask route formats, and deployment topology require future adapters for deep documentation.

Static diagrams show recognized component layers and up to six ORM entities per ER panel. They are not runtime traces. Code figures select small source excerpts and redact obvious credential assignments and credentialed URLs; a human must still inspect final excerpts for unusual secret formats. The renderer does not read `.env` files or private key paths.

The PDF is the fixed-layout publication output. Google Docs' PDF conversion can reflow tables, diagrams, code panels, and the contents page. For faithful viewing in Google Drive, open the PDF in Drive Preview. For manual editing, upload the generated DOCX and open that in Google Docs. Word-to-Docs import can still change pagination, and diagram labels remain part of the images; their source specifications are in `diagrams/`.

## Adding analyzers

Add a bounded parser in `analyze.py` that returns the same normalized route, table, component, or claim records. Use source paths and 1-based line ranges, mark inference confidence, and avoid importing target modules. Extend the JSON schema when adding fields. Add fixture tests in `tests/`; then inspect a generated report for a representative repository. To change appearance, adjust the constants/styles and diagram flowables in `render.py` using `references/design-spec.md` as the design target. Preserve separation between analysis and presentation.

## Troubleshooting

If a section is missing, inspect the analysis JSON first. Unsupported syntax should produce an omission or limitation, not a fabricated section. If rendering fails, check `validation.json` and the generated `qa/` pages after rerunning. If dependency installation fails, install ReportLab, Pygments, jsonschema, and PyMuPDF from `requirements.txt`. For non-Git directories, discovery walks the tree while excluding known generated/private paths.
