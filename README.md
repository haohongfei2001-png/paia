# PAIA — Personal AI Input Archive

**PAIA** is a local-first personal archive for what you say to AI. It is designed to preserve user inputs as a readable long-term record, organize them into a Thought Library, and let users explicitly decide what may become AI Context.

This repository contains the public PAIA product website and its browser-local interactive demo. It does not contain real user data or the complete private Chrome Extension source.

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

## Data boundaries of this public site

The public website does not connect to a visitor's PAIA archive and currently includes no analytics or behavioral tracking scripts. The interactive demo uses fixed demo data and runs in the browser. The Private Beta application form is the exception: information a visitor explicitly submits is forwarded through FormSubmit to the project contact email.

## Project status

PAIA is an independently designed Chrome Extension in active development and Private Beta. The product model, data structures, interaction details, and optional AI capabilities may continue to evolve as the implementation is tested.
