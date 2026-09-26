# PAIA — Personal AI Input Archive

**PAIA** is a local-first personal AI information and context system. It collects what users tell AI, preserves source evidence, and helps them turn their accumulated inputs into context they can edit, choose and reuse. A good reading experience supports this loop; PAIA is not positioned as a reading app.

This repository is the **authoritative development source for PAIA**. It contains the public product website, its browser-local interactive example, and the current Chrome Extension under `extension/`. Remote `main` and canonical product documents are the source of truth; local copies are working/runtime copies.

The repository does not contain real user archives, browser profiles, session credentials or private archive exports.

## Product website

https://inputarchive.com/

The v4 website implements the owner-selected visual direction, including a text-led opening followed by scroll-progressive input collection. English is the root language; `/zh/` contains complete paired Chinese pages and `/en/` preserves legacy English aliases.

Home, how-it-works, use cases, the interactive example, story, articles, practical data boundaries, private-beta application and legal/status pages form one site. Examples are fictional browser-local simulations, not live extension or AI connections. Source/provider availability is explicitly scoped to the current beta.

Website authority and maintenance:
- `WEBSITE_DESIGN.md` — current selected implementation direction, superseding rejected historical artboards.
- `website/README.md` — build, interaction, localization, verification and PDF instructions.
- `website/build.py`, `website/home.py`, `website/pages.py` — shared shell and bilingual page source.
- `assets/website/site.css`, `site.js`, `demo.js` — active production styles and behavior.
- Root HTML and paired `zh/` / `en/` HTML — generated production outputs.
- `website/export_pdf.py` and `website/pdf-requirements.txt` — actual-browser full-site PDF export and motion keyframes.
- `website/receipts/WEBSITE_V4.md` — implementation evidence and explicit limits.
- `extension/` — authoritative extension source, tests and canonical engineering documents.

Old root CSS/JS and `assets/screenshots/` are not the active v4 website. Do not edit them to change the current site. Website verification does not certify extension behavior.

## Development source of truth

The initial extension import was based on local source commit `063ddb5cfae3a8b1ec637c2604639cbde11529c7`, tagged `checkpoint-v0.11.1-thought-library-reading-closure`. That is the migration baseline only.

From the 2026-09-11 migration onward, development converges into remote `main`. Re-read current canonical status and active PR/head before work. Keep one writer per affected boundary; website changes must not rewrite an active extension writer's runtime, STATUS or receipts.

The initial migration excluded nested Git objects, QA browser profiles, local scratch work, generated release copies and large historical build outputs. See `extension/SOURCE_SNAPSHOT.md` for the migration record.

## Data boundaries

The website does not connect to visitors' PAIA archives and includes no analytics or behavioral tracking scripts. Its interactive example uses fictional data in browser memory. The private-beta form is the exception: data the visitor explicitly submits is forwarded through the existing FormSubmit action to the project contact email, with explicit consent.

Extension privacy and security boundaries are documented in `extension/PRIVACY.md`, `extension/PRODUCT_SPEC.md` and canonical Consumer Product v1 documents. Website styling and examples do not enlarge capture, AI-processing, synchronization or context-sharing permissions.

## Product status

PAIA is in active development and private beta. Product structures and optional AI capabilities may evolve. Current capability and certification statements must come from current canonical documents, not old screenshots or marketing examples.
