# PAIA flagship website — revision 3 design review

This branch rebuilds the public website around a simple proposition: **your words remain yours, and your thinking can continue**. It is a website-only design implementation for review. The current authorization permits an independent branch and Draft PR; it does **not** authorize merging or deploying to production. Earlier receipts describe earlier work and do not grant permission for this branch.

## Visual and narrative direction

The third revision gives the product itself more space. A compact, operable product scene sits in the opening, with soft depth around its reading surface. The shared palette uses near-white `#fdfdfd`, ink `#27303f`, secondary text `#687080` and blue `#526eb2`. Translucency is concentrated in navigation and the small prompt companion. Manrope and the self-hosted PAIA Sans SC content subset provide Latin and Chinese typography. The latest soft-blue PAIA symbol and the creator's original girl-and-mailbox drawing are retained.

The opening uses `workspace(..., compact=True)` and the same Archive/Thought controller as the full Demo. It starts with the writing record. A native disclosure exposes Archive search and the other records; visitors can edit working text, check its original, switch spaces, open a Thought Section and return to its directory. The separate Demo route retains the full directory and direct entry points for Archive, Thought, Context and Prompt Reuse. Compact presentation does not remove those journeys.

Farther down the homepage, a separate writing example keeps its original source in a native disclosure. A locally accepted working edit also appears in the subsequent Topic reading. This continuation, the opening workspace and the individual Context examples each own their own in-memory state; they do not simulate a shared account or silently synchronize one another. Prompt Reuse remains a working composer utility, and Context viewing, editing and permissions remain separately operable.

Inner pages use different structures for their content. How it works follows a continuous journey through source disclosure, Topic reading, an actual Prompt Reuse instance and an optional Context explanation. Use cases offers three native expandable scenarios instead of three repeated feature panels. About gives the unchanged original drawing a larger scene and retains the complete unresolved story: the girl approaches, passes and leaves; neither a posting nor her intended expression is known; only the mailbox remains. Notes has one featured article and two quieter entries. Articles use continuous reading, section anchors and a native contents disclosure. Data and permissions retains the complete product boundaries in a distinct reading layout.

The implemented pages and interactions are the design review material. Revision 3's executed source and browser evidence is recorded in [FLAGSHIP_REVIEW.md](FLAGSHIP_REVIEW.md); the current commit's CI result is reported on Draft PR #310. Earlier passes do not approve this revision or determine aesthetic acceptance.

Five actual upstream skills informed separate stages of the work:

- [Impeccable](https://github.com/pbakaus/impeccable): the actual skill and its craft-floor, critique, new-work, distill and polish references informed separate structure, type and finish reviews. Revision 3 removes repeated chapter numbering, varies inner-page composition and ties depth to usable product material. The Impeccable context launcher/binary was unavailable in the research environment; project context and current contracts were read directly. No Impeccable CLI or detector pass is claimed.
- [Designing Beautiful Websites](https://github.com/tristanmanchester/agent-skills/blob/main/designing-beautiful-websites/SKILL.md): the skill, visual-design and content-copy references informed hierarchy built from real PAIA content, distinguishable page purposes and mobile reflow that keeps expressions readable.
- [Anthropic Frontend Design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): the actual skill informed independent art direction and critique of interchangeable landing-page motifs. Its guidance is applied through the implemented composition, not a claimed branded template.
- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): the actual skill, quick reference and targeted typography/interaction reference lookups informed type, reading width, control targets and responsive behavior. Its generic suggested template was not adopted.
- [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines): the skill and linked review guidance informed semantic controls, visible focus, keyboard behavior, responsive layout and media preferences. Reading the guidance is separate from completing the final browser checks.

These sources inform the work; the current owner brief and current PAIA contracts decide conflicts.

## Product boundaries

- **Compact homepage workspace** begins on the fictional writing record. Its expandable Archive directory keeps search and record switching available; the three-space tabs expose the existing Thought directory and independent Context example. It is a separate instance of the Demo controller, not a connected account.
- **Homepage continuation** edits only its own fictional working expression. Saving updates its paired same-page Topic reading while preserving the original source; cancel and Escape retain the last accepted edit. Blank input stays editable, focus returns to the entry when editing ends, and reloading restores the initial example. It does not change the opening workspace, Context permissions or the prompt draft.
- **Input Archive** contains synthetic examples of sent user text. Discovery search filters the conversation choices. Working edits do not overwrite the retained source. Each conversation has its own project, date and earlier expression.
- **Thought Library** opens existing Topics and their plain Section links. A section reads its own material. There is no root search, generic topic creation, invented opinion generation or fake AI processing.
- **AI Context** has My Information, My Rules, My Now and My Inputs. These are four content scopes within external reading, not the four independent product permissions for capture, AI processing, external reading and cloud sync. Every example's global, card and topic choices begin off. Lower choices do not enable parents. Pausing a parent retains the lower choices. Opening, editing, deleting or restoring content never changes permission bits. My Inputs references existing Topics only.
- **Prompt Reuse** is a separate composer utility. Six sample prompts can be edited, pinned, reordered, hidden and restored. Insertion preserves the draft and selected text, respects selection end, returns focus to the composer, and never sends, closes the board or changes the order. Quick-fill wording is limited to 150 graphemes. Unsaved management work survives closing the dialog.

Website examples are page-local and use no archive, model, storage or account APIs. Reloading resets them. They do not certify installed extension behavior or future external connections. Live AI organization, external Context connections, cloud transfer and new-device recovery remain in development. Installation is not open in the current launch manifest: both `chrome_store_url` and `release_version` are null, with the existing evidence date `2026-10-13`. The download action remains disabled until a verified target is supplied; visual work must not invent a release or refresh that evidence date.

The existing contact recipient, FormSubmit endpoint, unchecked required forwarding consent, native no-JS fallback and submission outcome handling are preserved. Privacy policy and terms body wording were retained from the base site. No testimonials, usage figures, capabilities or service commitments were invented.

## Maintained source

| File | Responsibility |
|---|---|
| `build.py` | Stable command-line entry point |
| `flagship_site.py` | Shared head, navigation, footer, route generation and full Demo |
| `flagship_home.py` | Compact opening workspace, writing continuation, Topic reading, Prompt and Context composition |
| `flagship_shared.py` | Language selection, route helpers and line icons |
| `flagship_ui.py` | Shared Archive and Thought markup; optional compact Archive disclosure and writing initial record |
| `flagship_personal_ui.py` | Context and Prompt Reuse example markup |
| `flagship_content.py` | How, use cases, About, principles, notes and articles |
| `flagship_legal.json` | Retained legal wording; obsolete visual-update stamps removed |
| `launch_pages.py`, `launch_manifest.json` | Retained installation, help and contact contracts |
| `assets/website/flagship.css` | Shared component foundations, Demo, forms and legal layout |
| `assets/website/flagship-design.css` | Current art direction, self-hosted Chinese font, homepage and responsive refinements |
| `assets/website/flagship-pages.css` | Distinct inner-page compositions |
| `assets/website/flagship-personal.css` | Personal-content editors and prompt manager |
| `assets/website/flagship.js` | Navigation and each workspace's source-safe Archive edits, search, record selection and Topic reading |
| `assets/website/flagship-home.js` | Page-local homepage edits, original retention, Topic echo and focus restoration |
| `assets/website/flagship-personal.js` | Independent context choices and safe prompt reuse |
| `assets/website/flagship-contact.js` | Isolated inherited contact controller |
| `subset_chinese_font.py`, `CHINESE_FONT.md` | Reproducible Chinese font coverage, pinned source and license instructions |
| `flagship_tests.py` | New-generation contract and browser regression tests |
| `package_flagship.py` | Reproducible standalone review and website-source package |

Generated HTML is never the authoring source. Older modules and visual baselines remain as history but are not loaded by the flagship site. The test entry points explicitly select the correct generation; the existing workflow is unchanged.

There are **19 page types**: home, How it works, Use cases, About, Demo, Get PAIA, Help, Contact, Notes, three articles, Data and permissions, Privacy, Terms, Beta alias, Status alias, Thanks and 404. Root English plus `/zh/` produce 38 language pages; `/en/` retains 19 identical English aliases. The generator owns 57 HTML files, sitemap and robots. Language switching retains the canonical route. Beta and Status aliases canonicalize to Get PAIA and Help; noindex rules remain explicit.

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

The browser suite uses actual generated files over local HTTP, synthetic inputs and intercepted contact responses. It never submits a real contact request. It checks routes and layout, homepage continuation, source retention, permissions, prompt editing/insertion, keyboard access, media preferences, no-JS fallbacks and contact outcomes. Static checks are not browser passes, and browser checks are not aesthetic approval. See [FLAGSHIP_TEST_MIGRATION.md](FLAGSHIP_TEST_MIGRATION.md) for the contracts and [FLAGSHIP_REVIEW.md](FLAGSHIP_REVIEW.md) for the actual executed scope and commit-specific evidence.

The compact opening reuses tested behavior, and its new placement was explicitly reviewed in revision 3. For later changes, recheck: open the record disclosure, search and switch records, make a working edit without changing its source, switch to Thought and open a Section, and inspect the second Context instance. Also check How's live Prompt instance and the native Use cases/contents disclosures. The existing full-Demo regression does not by itself certify those new placements.

After changing visible Chinese or runtime messages, rebuild the pages, regenerate the font subset from the pinned source and run its coverage check as described in [CHINESE_FONT.md](CHINESE_FONT.md). Keep the WOFF2, coverage JSON, OFL license and rebuilding script together. Visitor-entered characters outside the content subset use the retained system-font fallback. A font coverage check does not replace a visual typography review.

For the standalone deliverable, run `python website/package_flagship.py --help` and follow `OFFLINE_PREVIEW.md`. The single HTML embeds all visitor assets, supports the full site and both languages, and intentionally prevents contact submission. The normal generated website keeps the real contact flow.

## Evidence and scope

Revision 3 starts from revision 2 commit `40dc853b69be9165783d2d8ccd031b4d1b4022c8` on the same independent design branch. Earlier revision 1 and revision 2 implementation and verification records remain in the review receipt and Git history. They are historical checkpoints, not frozen visual requirements for the current owner-authorized redesign.

The base studied for this implementation was `5d46cb2578ce76a3442dd056386868dc37c19827`, including the latest soft-blue brand assets and applicable product contracts. The live website, current and previous website implementation, relevant PR discussions, the owner brief, and available PAIA Drive originals informed the design. The requested historical-chat lookup was unavailable; no claim of complete chat-history access is made.

This work changes only the website source, generated public pages, website assets, tests and review documentation. It does not change extension code, the product database, product permission models, deployment workflows or production settings. Any later merge or release requires its own authorization.
