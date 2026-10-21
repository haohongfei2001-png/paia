# PAIA flagship website — independent design review

This branch rebuilds the public website around a simple proposition: **your words remain yours, and your thinking can continue**. It is a website-only design implementation for review. The current authorization permits an independent branch and Draft PR; it does **not** authorize merging or deploying to production. Earlier receipts describe earlier work and do not grant permission for this branch.

## Visual and narrative direction

The site gives human expression the largest readable product surface. White space, dark plum text and a restrained mineral-violet field form the shared visual system. Translucency belongs mainly to navigation and the small prompt companion. The latest soft-blue PAIA symbol is retained; the creator's original girl-and-mailbox drawing is used unchanged in the story and home-page close.

The opening is a working product example, followed by the relation between original words and working edits, the continuity of a personal topic, a small prompt composer, and explicit context choices. The final invitation sits with the original artwork. About, use cases, explanatory pages and articles use different reading structures within the same system.

Internal direction review considered a nostalgic editorial treatment and a dark technology-led treatment. Neither suited an active personal workspace as well as the selected bright, readable direction. These were art-direction judgments, not claims that separate polished concepts were shipped.

Five actual upstream skills informed separate stages of the work:

- [Impeccable](https://github.com/pbakaus/impeccable): separate structure, type and finish reviews; simplification of the repeated closing section. No CLI or detector pass is claimed.
- [Designing Beautiful Websites](https://github.com/tristanmanchester/agent-skills/blob/main/designing-beautiful-websites/SKILL.md): hierarchy built from real PAIA content, and mobile reflow that keeps expressions readable.
- [Anthropic Frontend Design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): independent art direction and critique of interchangeable landing-page motifs.
- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): targeted typography, interaction and accessibility reference lookups. Its generic suggested template was not adopted.
- [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines): semantic controls, visible focus, keyboard behavior, responsive layout and media preferences.

These sources inform the work; the current owner brief and current PAIA contracts decide conflicts.

## Product boundaries

- **Input Archive** contains synthetic examples of sent user text. Discovery search filters the conversation choices. Working edits do not overwrite the retained source. Each conversation has its own project, date and earlier expression.
- **Thought Library** opens existing Topics and their plain Section links. A section reads its own material. There is no root search, generic topic creation, invented opinion generation or fake AI processing.
- **AI Context** has My Information, My Rules, My Now and My Inputs. The global, card and topic choices all begin off. Lower choices do not enable parents. Pausing a parent retains the lower choices. Opening, editing, deleting or restoring content never changes permission bits. My Inputs references existing Topics only.
- **Prompt Reuse** is a separate composer utility. Six sample prompts can be edited, pinned, reordered, hidden and restored. Insertion preserves the draft and selected text, respects selection end, returns focus to the composer, and never sends, closes the board or changes the order. Quick-fill wording is limited to 150 graphemes. Unsaved management work survives closing the dialog.

Website examples are page-local and use no archive, model, storage or account APIs. Reloading resets them. They do not certify installed extension behavior or future external connections. Installation is not open in the current launch manifest; the download page remains truthful and disabled where no store URL exists.

The existing contact recipient, FormSubmit endpoint, unchecked required forwarding consent, native no-JS fallback and submission outcome handling are preserved. Privacy policy and terms body wording were retained from the base site. No testimonials, usage figures, capabilities or service commitments were invented.

## Maintained source

| File | Responsibility |
|---|---|
| `build.py` | Stable command-line entry point |
| `flagship_site.py` | Shared head, navigation, footer, route generation, home and demo |
| `flagship_shared.py` | Language selection, route helpers and line icons |
| `flagship_ui.py` | Archive and Thought Library example markup |
| `flagship_personal_ui.py` | Context and Prompt Reuse example markup |
| `flagship_content.py` | How, use cases, About, principles, notes and articles |
| `flagship_legal.json` | Retained legal wording; obsolete visual-update stamps removed |
| `launch_pages.py`, `launch_manifest.json` | Retained installation, help and contact contracts |
| `assets/website/flagship.css` | Shared system, home, demo, forms and legal layout |
| `assets/website/flagship-pages.css` | Distinct inner-page compositions |
| `assets/website/flagship-personal.css` | Personal-content editors and prompt manager |
| `assets/website/flagship.js` | Navigation, source-safe Archive edits and Topic reading |
| `assets/website/flagship-personal.js` | Independent context choices and safe prompt reuse |
| `assets/website/flagship-contact.js` | Isolated inherited contact controller |
| `flagship_tests.py` | New-generation contract and browser regression tests |
| `package_flagship.py` | Reproducible standalone review and website-source package |

Generated HTML is never the authoring source. Older modules and visual baselines remain as history but are not loaded by the flagship site. The test entry points explicitly select the correct generation; the existing workflow is unchanged.

There are **19 page types**: home, How it works, Use cases, About, Demo, Get PAIA, Help, Contact, Notes, three articles, Data and permissions, Privacy, Terms, Beta alias, Status alias, Thanks and 404. Root English plus `/zh/` produce 38 canonical language pages; `/en/` retains 19 identical English aliases. The generator owns 57 HTML files, sitemap and robots. Language switching retains the route. Beta and Status aliases canonicalize to Get PAIA and Help; noindex rules remain explicit.

## Build and review

```sh
python website/build.py
python website/build.py --check
python website/test.py --static-only
python -m http.server 8000
```

Open `http://localhost:8000/zh/` or the English root. Dependencies for CI browser checks are in `website/requirements.txt`:

```sh
python -m pip install -r website/requirements.txt
python -m playwright install chromium
python website/test.py
```

The browser suite uses actual generated files over local HTTP, synthetic inputs and intercepted contact responses. It never submits a real contact request. It checks routes and layout, source retention, permissions, prompt editing/insertion, keyboard access, media preferences, no-JS fallbacks and contact outcomes. Static checks are not represented as browser passes. See `FLAGSHIP_TEST_MIGRATION.md` and the review receipt for the actual executed scope.

For the standalone deliverable, run `python website/package_flagship.py --help` and follow `OFFLINE_PREVIEW.md`. The single HTML embeds all visitor assets, supports the full site and both languages, and intentionally prevents contact submission. The normal generated website keeps the real contact flow.

## Evidence and scope

The base studied for this implementation was `5d46cb2578ce76a3442dd056386868dc37c19827`, including the latest soft-blue brand assets and applicable product contracts. The live website, current and previous website implementation, relevant PR discussions, the owner brief, and available PAIA Drive originals informed the design. The requested historical-chat lookup was unavailable; no claim of complete chat-history access is made.

This work changes only the website source, generated public pages, website assets, tests and review documentation. It does not change extension code, the product database, product permission models, deployment workflows or production settings. Any later merge or release requires its own authorization.
