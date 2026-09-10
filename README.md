# PAIA — Personal AI Input Archive

**PAIA** is a local-first personal archive for what you say to AI. It is designed to preserve user inputs as a readable long-term record, organize them into a Thought Library, and let users explicitly decide what may become AI Context.

This repository contains the public PAIA product website, its browser-local interactive demo, and a public source snapshot of the PAIA Chrome Extension. It does not contain real user data, browser profiles, session credentials, or private archive exports.

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
- `extension/` — current Chrome Extension source snapshot, tests, engineering documents, build/check scripts, and compact acceptance evidence

## Extension source snapshot

The `extension/` directory is based on local source commit `063ddb5cfae3a8b1ec637c2604639cbde11529c7`, tagged `checkpoint-v0.11.1-thought-library-reading-closure` (PAIA v0.11.1).

The public snapshot intentionally excludes the nested local `.git` object database, browser QA profiles/session state, local `work/` scratch material, generated ZIP/release copies, and large historical screenshot/build-output directories. Those files are not required to understand or modify the current product source. See `extension/SOURCE_SNAPSHOT.md` for details.

## Data boundaries

The public website does not connect to a visitor's PAIA archive and currently includes no analytics or behavioral tracking scripts. The interactive demo uses fixed demo data and runs in the browser. The Private Beta application form is the exception: information a visitor explicitly submits is forwarded through FormSubmit to the project contact email.

The public extension source contains no real PAIA archive, browser profile, or API credential. Tests use synthetic fixtures. The extension's product privacy and security boundaries are documented in `extension/PRIVACY.md`, `extension/PRODUCT_SPEC.md`, and related engineering documents.

## Project status

PAIA is an independently designed Chrome Extension in active development and Private Beta. The product model, data structures, interaction details, and optional AI capabilities may continue to evolve as the implementation is tested.
