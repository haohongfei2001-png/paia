# PAIA website product consistency — 8 October 2026

This is a traceability record for the website implementation, not a new product
plan. The owner authorized website code, verification, PR delivery and normal
deployment when existing release conditions are met. Product implementation,
permissions, services and the coordinated product writers are outside this work.

Website writer: `feat/website-product-consistency-20261008`.
Source reconciliation began at main `075fd12288c4c922eaf85e417e4da507061a9422`.
Integration review at main `c877ded684b0ebc492839755daf964914f407fc8` found
unchanged approved contracts and the newly integrated 0.24 local Prompt Next
foundation; the availability wording below includes that update.
The site is the root static website in this repository, published through the
existing GitHub Pages process to `https://inputarchive.com`.

## Product authority

The controlling source is [AUTHORITY](../extension/docs/consumer-product-v1/AUTHORITY.md),
especially its current authority order and preserved domain table. The
[Master Plan](../extension/docs/consumer-product-v1/MASTER_PLAN.md) §2 maps the
approved domains; [Product Intent](../extension/docs/consumer-product-v1/PRODUCT_INTENT_CONTRACT.md)
incorporates its complete nonconflicting predecessor. A file named PRE is not
automatically obsolete when a current contract explicitly incorporates it.
Latest scoped Owner decisions override conflicting older wording. Implementation
proves what exists, not what the completed product should be.

Current execution is recorded in [STATUS](../extension/docs/consumer-product-v1/STATUS.md)
and the [seven-lane ledger](../extension/docs/consumer-product-v1/SEVEN_PLAN_EXECUTION_2026-10-08.md).
Old open PRs and the unapproved website design draft #91 do not select a new
product or website direction. The latest adopted contracts resolve this site's
product conflicts without requiring a new product decision or private Drive
material to be copied into the public repository.

## Final consumer product

PAIA is a local-first personal archive of attributable expression sent to AI,
with three main spaces: Input Archive, Thought Library and AI Context. People
can find, edit, organize and reuse their words while preserving sources and
human decisions. Personal Prompt Reuse is a companion on supported AI pages.
Approved AI assistance acts on permitted material, without replacing original
words or silently granting an external AI access to the archive.

## Claim-to-source mapping

All paths below refer to `extension/docs/consumer-product-v1/` unless stated
otherwise. Website illustrations are synthetic and page-local. None certify a
live service, an installed extension or product release.

| Website claim and placement | Approved product source | Availability treatment |
|---|---|---|
| Personal input archive; homepage title, opening, story | `PRODUCT_INTENT_CONTRACT.md`, retained baseline §§1–5 | Current local foundation; no claim of universal capture or public distribution |
| Find an exact sent input by conversation/time/keyword, continuous reading, working edits and original readback; Archive example, how-to | `INPUT_ARCHIVE_INTERACTION_CONTRACT.md`; current Product Intent §§4/6/9 | Current Chrome/ChatGPT foundation; sample Reader is already explicitly opened, not a proposed new Archive Home |
| Local reversible reading filters, explicit history import; how-to, data page | Retained Product Intent §§4–6; current Archive Find clarification | Filters are not deletion or permission; no complete-account-history promise |
| Personal Topic → Section → Entry; source and timeline, human organization priority; Thought example and how-to | `TOPIC_ARCHITECTURE.md` PT-01–11; `THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md` | Integrated foundations, final experience still completing. Preset grouping is not live AI |
| Three whole-input references follow the corresponding working edit in this example | `TOPIC_ARCHITECTURE.md` PT-02; retained Technical Plan body binding; `extension/ARCHITECTURE.md` whole one-to-one binding | Narrowly labelled reference example. Independently edited Thought bodies are not overwritten |
| AI finds related themes in permitted material; three derivative reading styles, Original-first / Balanced / More concise | `TOPIC_ARCHITECTURE.md` PT-03–08; `AI_ORGANIZE_STYLE_CONTRACT.md` §§1–4; `AI_USAGE_ARCHITECTURE.md` §1.2 | Planned. Preset text retains chronological changes and becomes visibly stale after a source edit |
| Personal prompt wording, pinning/order, intentional insertion; Prompt example and essay | `PROMPT_REUSE_SURFACE.md` §§4–8 and 11; `PROMPT_REUSE_STAGE_3A.md` | Local core implemented; example has no external composer. Existing draft is preserved; never auto-sends. Local default-off Stage 3A is integrated in 0.24; real-site and installed-build validation remain separate. New model-generated suggestions remain planned. The website reply suggestion is a preset, not a live result |
| Four independent Context cards; overview, separate editing, removal/undo, My Inputs topic controls | `AI_CONTEXT_CARDS_V2_PLAN.md` §§1.1–1.3; adoption and current `extension/AI_CONTEXT.md` | Local foundations; no real connection. The website uses a compact illustration, not an asserted product screenshot |
| Global, card and Topic access start off; pause retains lower choices; opening lower scope never opens parents; no Archive fallback | `AI_CONTEXT_CARDS_V2_PLAN.md` §§1.3–1.4, CTX4-03–06 | Demonstrated as permission scope only. No real grants, client, reads or network traffic. Closing a Topic does not erase independent card Items |
| Connected AI can read open Context and eligible complete Topic content on demand; no per-task materials packet | `AI_CONTEXT_CARDS_V2_PLAN.md` §1.4 | Explicitly planned/unavailable. No fictitious “Connect” button. Revocation cannot recall already-delivered external content |
| Permitted automatic maintenance respects user edits and removals | `AI_USAGE_ARCHITECTURE.md` §§1.2/4; Context contract | Planned; manual local editing remains available independently of AI service |
| Optional same-ecosystem sync through Chrome/Drive, Edge/OneDrive, Safari/iCloud | `BROWSER_NATIVE_SYNC_ADOPTION.md` §1; `BROWSER_NATIVE_SYNC_CONTRACT.md` BNS-01/03/08–12 | Planned. User-enabled, personal account, successfully synced material only. No cross-ecosystem automatic sync or new PAIA content-cloud account |
| Ordinary capture/search/editing/manual Context/local prompts require no PAIA remote model | `AI_USAGE_ARCHITECTURE.md` §1.1 | Everyday local behavior distinguished from separately permitted remote processing, AI reading and sync |
| Web example, beta application and contact are the actual CTA destinations | Current site routes/form, manifest and GitHub releases readback | No verified public release assets or store link found. Apply is not install. Form consent retained; delivery not tested by submitting a message |

## Removed or corrected

- Task → Materials → Review → Context package, copy/export and one-task grants.
- Candidate-confirmation inbox behavior and the old three-fact Context model.
- Topic Markdown export, content export, new backup generation and “take it all
  with you” promises. Existing history-file import/recovery remains distinct.
- Claims that the current build sends material to a configured DeepSeek API.
- A September 26 availability summary that treated retired paths as current.
- Normal Prompt-row frequency/similarity counters, and insertion that overwrote
  an existing example draft.
- Descriptions making every remote model operation sound like a separate manual
  call, contradicting separately consented automatic maintenance.

The privacy/terms factual capability wording and date are aligned with these
Owner-approved product decisions. No recipient, form transmission, retention
promise, external service activation, billing or legal jurisdiction is added.

## Preserved design

[WEBSITE_DESIGN](../WEBSITE_DESIGN.md) and the existing V7.1 implementation remain
the visual foundation: text-led first screen; identical hero DOM/card geometry;
native reversible scroll; same source marks, media, fonts and brand assets.
`site.css`, `site.js`, `home-origin-v7.css`, `home-core-v1.css` and the complete
brand/media/font asset set remain unchanged. The hero's short product description
and CTA wording are deliberately updated, with structure checked separately.

The four existing downstream sections retain their order and visual family.
Four-card Context and the additional sync explanation are scoped to those
sections. Girl/mailbox imagery remains only in the existing brand and closing
usage. No new illustration, mascot, theme, endless animation or architecture
diagram is introduced.

## Verification and remaining evidence

Build and source checks operate on all 50 generated files. The existing complete
website browser gate retains all routes, 1440/768/390/320 layouts, 200% text,
native/reduced motion, no-JS, keyboard, form consent and unexpected-request
checks. Shared homepage/standalone journeys verify exact originals, safe draft
insertion, derivative invalidation and the new four-card behavior. The live gate
checks actual deployed bytes, including the previously omitted V7.1 stylesheet
and the new scoped stylesheet, before browser interaction checks.

Local browser installation was attempted, but the execution environment rejects
Chromium's required socket creation. Local static/build results are not passed
off as browser proof: the existing hosted PR gate remains required before merge.
The receipt and PR record actual runs, results and deployed readback separately.

Unresolved product B-01/B-02 deletion/editing details are not given invented
website guarantees. Real AI quality/processing service, external Context clients,
three cloud transports, signed distribution and physical-device acceptance
remain product evidence gaps, not website capabilities activated by this work.
FormSubmit email delivery is not exercised. No product decision is needed to
publish the bounded, accurately labelled website changes.
