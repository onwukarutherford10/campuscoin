# Reference-derived report design specification

Source inspected: supplied *NumberGuesser Documentation.pdf*, 94 pages, US Letter (612 × 792 pt). This is a design and structure reference, not a source of content or branding.

## Observed grammar

- Centered cover with a strong project title, stacked report metadata, and wide vertical spacing. The academic logo, people, organization, and submission wording are project-specific and excluded.
- Body pages have roughly 60–70 pt side margins, a small running project name, bottom page number, and abundant white space. Chapters open with a prominent serif heading; subsection headings use smaller bold serif type.
- Main prose uses Georgia-like serif text around 12 pt with generous line spacing. The TOC uses nested entries, dotted leaders, and page numbers. Tables use fine dark rules and wrapped text. Diagrams are monochrome boxes and connectors with labels; entity diagrams include table fields and relationship lines. Code figures use a dark editor-like surface, line numbers, path label, and syntax color.
- Architecture, database, process, screenshot, source-code, developer-guide, and user-guide material are separate major sections. Explanatory prose usually precedes or follows figures. Long topics continue across pages without forced one-topic-per-page composition.
- The reference has some very small diagrams and dense tables. The reusable version prioritizes legibility by capping diagrams at six entities per panel, enlarging labels, keeping tables compact, and selecting short excerpts.

## Reusable decisions

- US Letter, 62 pt side margins, 66 pt top and 58 pt bottom margins.
- Times-family serif for title, headings, and prose; Helvetica for metadata, small table text, and running header; Courier for code. Restrained navy/teal accents and light gray rules replace project branding.
- Centered report cover; generated TOC; numbered technical sections; running title and page number; evidence references close to claims; captions under visual figures.
- Source-based section inclusion. Avoid academic certification, acknowledgements, fictional requirements, copied text, logos, and copied screenshots.
- Diagram assets come from JSON model specifications. Code is rendered from sanitized excerpts with deterministic syntax highlighting. The PDF renderer only composes the model.
- The DOCX renderer uses the same typographic hierarchy and restrained palette. Headings, prose, tables, and code remain native editable text. Diagram specifications render to embedded high-resolution images to keep labels and connectors together when Google Docs imports the file. The DOCX contents list omits fixed page numbers because Docs repaginates; use Docs' own table-of-contents command after import.

## Limits of inference

The reference does not establish a universal grid, exact brand color system, or figure style for every framework. Use restrained defaults rather than claiming exact reproduction. Its screenshots and project-specific narrative are intentionally not reused.
