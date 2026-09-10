# PAIA — Personal AI Input Archive

**PAIA** is a local-first personal archive for what you say to AI. It is designed to preserve user inputs as a readable long-term record, organize them into a Thought Library, and let users explicitly decide what may become AI Context.

This repository is the **authoritative development source for PAIA**. It contains the public PAIA product website, its browser-local interactive demo, and the current PAIA Chrome Extension source under `extension/`. Local clones and unpacked Chrome folders are working/runtime copies; `main` is the source of truth for future development.

The repository does not contain real user data, browser profiles, session credentials, or private archive exports.

## Product site

https://haohongfei2001-png.github.io/paia/

The site is organized around three layers:

- **Home** — what PAIA is and the problem it is designed to solve.
- **Demo** — a deterministic interactive simulation of Input Archive, Thought Library, AI Context, editing, filtering, sync, provenance, and authorization state.
- **Principles** — the product decisions that constrain how PAIA uses automation and AI.

Additional pages document privacy boundaries, terms, project background, and the current Private Beta.

## Repository structure

- `index.html` — product home
- `demo.html` — interactive product demo
- `demo.js` / `demo.css` — browser-local demo state and UI
- `principles.html` — product principles
- `about.html` — product and project background
- `privacy-policy.html` / `terms.html` — public policies
- `styles.css` / `polish.css` — shared responsive styles
- `i18n.js` / `site-copy-base.js` / `experience.js` — localization and shared site behavior
- `assets/screenshots/` — synthetic, sanitized product visuals used for public presentation
- `extension/` — authoritative Chrome Extension source, tests, engineering documents, build/check scripts, and compact acceptance evidence

## Development source of truth

The initial `extension/` import was based on local source commit `063ddb5cfae3a8b1ec637c2604639cbde11529c7`, tagged `checkpoint-v0.11.1-thought-library-reading-closure` (PAIA v0.11.1). That commit is the migration baseline only.

From the 2026-09-11 migration onward, **future PAIA development should be based on this repository's `main` branch**. Changes made through ChatGPT, Codex, GitHub Desktop, or another development environment should converge back to `main`; local copies should not become a competing source of truth.

The initial migration intentionally excluded the nested local `.git` object database, browser QA profiles/session state, local `work/` scratch material, generated ZIP/release copies, and large historical screenshot/build-output directories. Those files are not required to understand, modify, test, or continue the current product source. See `extension/SOURCE_SNAPSHOT.md` for the migration record.

## Data boundaries

The public website does not connect to a visitor's PAIA archive and currently includes no analytics or behavioral tracking scripts. The interactive demo uses fixed demo data and runs in the browser. The Private Beta application form is the exception: information a visitor explicitly submits is forwarded through FormSubmit to the project contact email.

The public extension source contains no real PAIA archive, browser profile, or API credential. Tests use synthetic fixtures. The extension's product privacy and security boundaries are documented in `extension/PRIVACY.md`, `extension/PRODUCT_SPEC.md`, and related engineering documents.

## Project status

PAIA is an independently designed Chrome Extension in active development and Private Beta. The product model, data structures, interaction details, and optional AI capabilities may continue to evolve as the implementation is tested.
