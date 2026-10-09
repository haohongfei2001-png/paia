# Narrow Input Board v4 — Visual, Prototype and Evidence References

Reference policy: preserve original identity and evidence scope; publish only necessary sanitized design material, not private archives, credentials, large embedded reports or runtime copies of a demo. New product semantics are in [SPEC](NARROW_INPUT_BOARD_V4_SPEC.md), not inferred from sample JavaScript.

## 1. Immediately usable repository reference

[Six-state visual reference](design/narrow-input-board-v4/VISUAL_REFERENCE.html) is a small, self-contained **static design-document excerpt**, using the original v4 layout roles, texts and blue-white glass tokens. It shows the capsule, Free board, Pro board, fixed-width search, long list and shortened list at their CSS size. Clone/download and open the HTML locally; GitHub's code viewer does not execute HTML. It makes no external request, has no product JavaScript and cannot write a draft, archive, permission or clipboard.

It is not a new proposed style, not a replacement for the original complete prototype, and not the file covered by the original193 assertions. The actual filled/hovered row, Pro badge and list-scroll examples are reference states, not claims that new production controls already work. All complete behavior, accessibility and native evidence obligations remain in SPEC/ACCEPTANCE.

## 2. Original v4 artifacts inspected and identity-checked

The owner-supplied conversation delivery `PAIA_Narrow_Input_Board_v4.zip` and its mounted files were inspected. Originals were not altered. The large3.9MB report embeds images; it and the Base64 payloads are **not** copied into production directories or indiscriminately committed. Full prototype/report/state artboards remain preserved in the original owner delivery, identifiable by the hashes below; no invented public download URL or private file ID is used as a repository dependency.

| Original artifact | Bytes | SHA-256 |
|---|---:|---|
| `PAIA_Narrow_Input_Board_v4.zip` | 7626769 | `4ad525372c690bcde6fd179645fbaee165ef491eb0f330cbe6c64c10f801627f` |
| `PAIA_Narrow_Board_v4.html` | 57792 | `4abf08c50c733be88f93a426d10f4d757c1c8a52c0b7b0a7324b0006149ffd59` |
| `PAIA_Narrow_Design_v4.html` | 3905383 | `c868d48f1d2ffd2ce08dd968bcdb564db9ce4a30631cc23f8b46929cc755fa1a` |
| `PAIA_Narrow_States_v4.html` | 82057 | `ac22ae33903e10866ac2623bdaf02d94dc9e3e91d49401e49f0467d46677084d` |
| `INTERACTION_SPEC_v4.md` | 13507 | `37d83bd83017c09cd1f081ad0fa2a62a691e25e894e00860c85314e3be9b5f3f` |
| `evidence/prototype_checks.json` | 78643 | `a4cb1489429915be410faa2c2a18c67a88bfbfaffa312456af487a3359bbb580` |
| `artboards/11_Six_States_336px.png` | 837596 | `d0c0eef1df67f7fde3302aa8824119a288d145c48f265af97978cc8a266949cf` |
| `artboards/09_Height_Adaptation.gif` | 1920275 | `e0d9dfffa0ccd90e76d8e2dcb4d44a6ceaf092509cb9d24f7815e193505dca3a` |

The six-state PNG was visually inspected. Its1160x1223 artboard presents336px components, not a613px search design. The HTML source has review controls, synthetic rows and simulated chat/Archive functions; these are not production requirements. No remote font files are included by this documentation PR.

### Original prototype operation map

Open the original `PAIA_Narrow_Board_v4.html` in a local browser. The external review control strip switches capsule/Free/Pro/search/long/high-composer states,1280x720/1680x920/1024x640/390x740 viewports, theme, top controls, chat and simulated document refresh. The composer-height slider and multiline draft exercise height adaptation. Search `限定条件` to find a truncated long row, check full text and select a range. Row more demonstrates manual edit/up/down. `打开 PAIA` opens a **synthetic** same-data search/arrival demonstration, not the real main app.

The prototype's Pro list is a fixed historical-ID sample. Its array search, in-memory overrides, textarea insertion, fake tier/service and clipboard test stub must not be transplanted into runtime or used to justify another database/index/writer. The canonical native tasks explicitly reuse the existing owners instead.

## 3. Exactly what the test record proves

The inspected JSON reports:

```text
kind: standalone synthetic HTML prototype checks
record date: 2026-10-09
browser: installed Chromium, headless via Playwright set_content
source_sha256: 4abf08c50c733be88f93a426d10f4d757c1c8a52c0b7b0a7324b0006149ffd59
geometry_cases: 56
checks: 193
passed: 193
failed: 0
```

This task independently verified the file SHA-256 matches `source_sha256`, that there are193 assertion entries, and all193 recorded `pass` values are true. It **did not rerun** those assertions. Original limits are retained: not a production extension/live ChatGPT test; no native Side Panel/real AI/payment/external connection/true user data; behavior-copy tests use a synthetic write stub; URL navigation was disallowed and rendering used set_content; no operating-system IME or cross-origin frame security certification.

No model usefulness, live throughput, production archive-scale or installed-user claim follows from these numbers. All47 future named production cases in ACCEPTANCE start NOT_RUN. A documentation link/hash check or static reference render is not S0/S1 acceptance.

## 4. Exact production sources used for planning

All paths in this section were inspected against main `47aa4df45fb9010a7be364fe144560e3f22b9887` /0.41 where specified; future execution re-reads fresh main. Prior v4 screenshots were based on0.38, and that visual baseline does not authorize starting implementation from old code.

| Source | Responsibility / evidence |
|---|---|
| `extension/core/prompt-surface-layout.js` | Existing336/322 width rule, geometry-only owner, old height/placement behavior; blob `071a6ffe4ea36c223f00af7a4248e86a3852d209` |
| `extension/ui/prompt-surface.css` | Existing13.3px font and currently51px/three-line rows; blob `00cffa391c0b23e917550a8d2534434bd529ab37` |
| `extension/content/prompt-surface.js` | Original static orb shell, cross-origin frame,20px radius/18px blur, nonce and lifecycle |
| `extension/ui/prompt-surface.js` | Current manual controls, guards, stable list, integrated Next availability generation; blob `d79a521f195e9b9d0b3ccd336e41cf17da31f842` |
| `extension/core/prompt-reuse-service.js` | Original Family projection/overrides/verified reuse and optional journal; blob `6ae19ba1503f00cbb8d67559a30a98b141e5d2bc` |
| `extension/core/qualified-input-search.js` | Current qualified Archive query/snapshot/arrival; blob `185022d1900e6a4f7a2119d136058c4ecd23947d` |
| `extension/ui/input-search.js` / existing search owners | Bounded paging, cancellation and truthful completeness; no separate board index |
| `extension/background/service-worker.js` | Exact UI/host admission and separate Prompt delegates; blob `68802495aafa237eedfd601856e0aabf50100ffa` |
| `extension/background/prompt-reuse-commands.js`, `extension/adapter/chatgpt-composer.js` | Existing resolve/operation/target/native editing/readback path, not an unlimited arbitrary-text write API |
| `extension/background/prompt-next.js`, `extension/ui/settings-next-state.js` | Separate local session permission/revoke/unknown-state ownership |
| `PROMPT_REUSE_SURFACE.md`, `PROMPT_REUSE_STAGE_3A.md` | Retained functional/privacy domains with scoped v4 presentation supersession |
| `AI_USAGE_ARCHITECTURE.md`, `AI_USAGE_PLAN.md` | Sole job/entitlement/quota/budget authority and unqualified real service gates |
| `INPUT_ARCHIVE_INTERACTION_CONTRACT.md`, `TECHNICAL_PLAN.md` | Existing Archive entry/query/arrival/save/Back boundaries |
| `AUTHORITY.md`, `MASTER_PLAN.md`, `STATUS.md`, `SEVEN_PLAN_EXECUTION_2026-10-08.md`, `EXECUTION_PROTOCOL.md` | Original single-programme and file-owner coordination; historical checkpoints preserved |

## 5. Primary platform references

Verified against official documentation during this planning task:

- [Chrome action](https://developer.chrome.com/docs/extensions/reference/api/action): `onClicked` is not delivered for a tab whose action has a configured popup. S4 uses separate isolated old/new entry variants, not an impossible simultaneous action assumption.
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): isolated execution does not make shared host DOM a private archive. Keep private body rendering in the existing protected frame.
- [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage): preserve trusted-context access and existing session semantics; do not expose a new body store or turn session permissions into persistent grants.

These API references do not grant new host permissions or authorize this turn to change the runtime. No native Side Panel API is needed by v4.

## 6. Reference precedence and handoff

Latest explicit owner requirements and SPEC control product meaning; the original v4 selected material and this small six-state excerpt control the retained narrow visual direction; source inspection controls what is actually implemented; production acceptance remains future evidence. Inconsistent old artifacts are marked by ADOPTION, not deleted or silently renamed as current.

If the original private delivery cannot be obtained in a later environment, do not invent screenshots, claim a hash match, or block all local development on unrelated missing Context assets. The checked-in SPEC, exact dimensions/tokens, six-state visual excerpt and acceptance cases are sufficient for bounded implementation. Report any missing exact-original comparison only as that reference gate, and recover the original by the recorded artifact identity before claiming pixel parity.
