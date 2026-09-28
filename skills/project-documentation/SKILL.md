---
name: project-documentation
description: Inspect a software repository and generate source-grounded technical documentation as a polished PDF, with JSON analysis, diagrams, provenance, and validation. Use for repository architecture or implementation reports; do not use for ordinary README edits.
---

# Project documentation

Use this skill when asked to document a repository as a technical PDF or an editable Word document. The target is a repository directory. Run the local generator with `python scripts/project_docs.py generate /path/to/repository --format both`; use `--format pdf` or `--format docx` for one output. The default build directory is `<repository>/.project-docs/`. See [README.md](README.md) for setup and options, and [design-spec.md](references/design-spec.md) for the report design rules.

## Procedure

1. Read applicable repository instructions and inspect the root, README, manifests, key source files, migrations, tests, and deployment configuration. The script performs bounded static discovery; review its JSON analysis before trusting the prose. Source code and migrations take precedence over README claims. Record disagreements as limitations.
2. Install dependencies from `requirements.txt` in an isolated environment. Run `generate --analysis-only` first. Inspect `analysis/project-documentation.json`, especially `claims`, `architecture`, `data_model.discrepancies`, `api.routes`, `code_figures`, and `limitations`. Correct analyzer defects or add a framework adapter when the target is unsupported. Never fill an absent section by guessing.
3. For a detailed report, write an optional editorial JSON file using the section keys and source records described in README.md. Each block needs a title, connected explanatory paragraphs, and checked file/line evidence. Run `generate --analysis-only --editorial path/to/report.json` to validate it. Keep project-specific prose outside the reusable renderer. Distinguish source facts, interpretation, and recommendations in the text.
4. Run `generate --format both --editorial path/to/report.json` when both publication and editable output are needed. Both renderers consume the same validated JSON model and do not inspect source code. The DOCX uses native headings, tables, and editable code text; diagrams are embedded images generated from the same diagram specs.
5. Inspect `validation.json`, `docx-validation.json`, and representative page renders: cover, contents, architecture, ER, API table, code, and final page. Check page composition and source accuracy, repair issues, and regenerate. Deliver only after visual inspection.

## Evidence and safety

The generator never imports or executes target code. It excludes common generated/ignored directories and private file patterns; it honors Git ignore rules in Git repositories. It rejects private evidence paths and credentialed URLs in the model and output, and redacts candidate code lines with obvious inline credentials. Review excerpts manually for less obvious secrets. Do not read `.env` contents, keys, or credentials into documentation. A filename or dependency alone establishes presence, not runtime behavior. Distinguish structural inference from implementation evidence.

Each significant claim must cite paths and line ranges in the JSON model. The PDF includes concise source references near sections and a final references page. Unsupported request/response, deployment, security, and workflow details remain unasserted. Missing optional database/API sections are omitted.

## Output and failure behavior

`analysis/` contains the schema-versioned model and focused JSON views. `diagrams/` contains deterministic JSON diagram specifications. `figures/` contains DOCX diagram images. `output/` contains the PDF and/or DOCX. `qa/` contains rendered review pages. `validation.json` and `docx-validation.json` record checks. If schema validation, source-path checking, file opening, required headings, or secret scans fail, the command exits with an error; fix the cause before delivery. When a framework is outside the static analyzers, report the limitation and extend the analyzer rather than inventing details.
