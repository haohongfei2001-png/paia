# CPV1-09.3V — Prompt Reuse visual convergence

## Final owner acceptance and integration — 2026-10-05

**`VISUAL_ACCEPTED` / `OWNER_VISUAL_ACCEPTANCE = PASS` (V01–V08).**
The owner explicitly accepted all eight states in the task conversation and
authorized PR #151 to merge. This acceptance supersedes the pending owner-review
labels in the historical capture receipts below; original screenshots, hashes,
run identities and failed attempts remain unchanged.

PR #151 was clean against main `3a127c2d69f9d33cc0e7ae90d7d1c5e3ac0e5408` and merged
as `a91943cae2b754202339993174beb9976c6b40e3`. Accepted/tested head:
`293c6c42aed5083f31226fd9f919d03461103b3a`. Both use tree
`3b156a156bfe9a1eb15fcf02003dc85c3e68e8f7`, preserving the tested runtime exactly.

Existing final results remain PASS:
[Foundation 37225100419, attempt 2](https://github.com/haohongfei2001-png/paia/actions/runs/37225100419/attempts/2),
[Visual 37225100429](https://github.com/haohongfei2001-png/paia/actions/runs/37225100429),
and [Certification 37225100413](https://github.com/haohongfei2001-png/paia/actions/runs/37225100413).
Insertion 20/20 and Surface 30/30 registrations (46 browser cases plus four parent
containers), affected local Surface/security 14/14, automatic unit 1,780,
adapter 102, privacy 59, source/release parity and package guards all passed.
Foundation attempt 1 at that head hit the unchanged legacy UX-R3 digest-readiness
race; its isolated file passed 26/26 and only the failed job was rerun. The run
history is retained rather than presented as first-attempt success.

This post-merge closure edits canonical documentation only. It grants no new
runtime capability and does not claim a fresh execution of earlier test runs.
**`REAL_CHATGPT_FINAL_CERTIFICATION = DEFERRED_EXTERNAL_EVIDENCE` remains unchanged.**
No Stage 3, second provider, B-04 or D7 implementation is started.

## Historical engineering and review receipt

The following records the state at capture time, before final owner acceptance.

**ENGINEERING_VISUAL_CONVERGENCE_COMPLETE / OWNER_VISUAL_ACCEPTANCE_PENDING**.
Owner visual acceptance remains `VISUAL_ACCEPTANCE_OPEN`.
Real ChatGPT final certification remains DEFERRED_EXTERNAL_EVIDENCE.

## Scope and authority

Start main: `913aa5273777c842cabdcd2ff09aadb942f67716`.
Reconciled base main: `bf2c1490478c9971286e6c1a219b6882797f2334` (D7 PR150 preserved).
Final runtime candidate: `8abb9e2fbd6a8b082ff0e245ce6cb88815202f0c`.
Tested merge candidate: `2a2375a21426a3506ee95476d9928204bdec287c`.
Both have tree `fb733c2d8f912568a1dbcb4a5d0701a21495f022`.
A documentation/evidence-only closure may follow without changing the verified runtime.
Branch: `feat/prompt-reuse-visual-convergence`.
PR: https://github.com/haohongfei2001-png/paia/pull/151.

The frozen `prompt-reuse-visual-v1` V01–V08 SVGs, contract and tokens control this
presentation. The old runtime appearance was rejected and was used only as the
functional implementation base. No old visual PASS is carried forward.

Production changes are confined to `content/prompt-surface.js`,
`ui/prompt-surface.css`, `ui/prompt-surface.js` and the geometry-only
`core/prompt-surface-layout.js`. The latter reserves space for the attached orb,
uses a 350 px normal card/340 px compact card and keeps the whole object clear of
the composer. The orb remains a 44 px target around a 40 px iridescent sphere.
The independent extension frame and PR #148 theme synchronization are retained.

Prompt Family/ranking, durable preferences/schema, Backup, trusted commands,
provider insertion/no-send, manifest/permissions, Stage 3/B-04 and D7 files are
unchanged. Edit/drag shortcuts call the existing commands and guards; the same
editor node moves into the selected row's place. No separate persistence owner.

## Evidence method

`capture-prompt-convergence.mjs` renders each unmodified target SVG and the actual
source/release extension. The controlled synthetic host reuses only the SVG host
background and composer decoration; it does not draw the orb, card, rows or
controls. All Prompt pixels come from the loaded production extension. The same
synthetic text, persisted site placement, viewport, theme, DPR 1, scale 1 and real
ProseMirror composer rectangle are recorded per state. There is no runtime CSS
injection, screenshot-only component or replacement implementation.

`compare-prompt-convergence.mjs` writes originals, source and release differences,
whole-page comparisons, readable detail views and numeric diagnostics. It asserts
only source/release equivalence, never design acceptance from a difference score.
`comparison.json` records target digests, exact runtime hashes and the conditions.
The release hashes are read from the built assets themselves.
The associated CI artifact is `prompt-visual-convergence`.

## Per-state design review

All eight final comparison boards were visually inspected by the implementing
agent on 2026-10-05 (Asia/Shanghai). The engineering judgment is that the master
material, hierarchy and composition have converged, with the explicit differences
below. This is not a claim that a human owner has accepted them. The requested
human design-conformance judgment remains `OWNER_VISUAL_ACCEPTANCE_PENDING`.

| State | Design-conformance judgment and explicit differences |
|---|---|
| [V01 orb](visual-convergence/V01-comparison.png) | Layered blue/violet/mint sphere, white highlight, translucent edge and soft shadow; no permanent wordmark or continuous animation. 40 px face/44 px target. CSS and SVG radial sampling differ slightly at the edge. |
| [V02 expanded](visual-convergence/V02-comparison.png) | One 336 × 350 glass object with 20 px corners and an attached orb. Prompt text is the only normal primary content. Font, 51 px cadence, quiet dividers and card material follow the master. The real scrollbar's thumb reflects content length; the master paints an illustrative fixed thumb. |
| [V03 hover/focus](visual-convergence/V03-comparison.png) | Six-dot grip, quiet edit and overflow emerge without changing row bounds. Fine-pointer controls use the master's small visual footprint; coarse controls retain 44 px targets. Keyboard focus remains visible. |
| [V04 edit](visual-convergence/V04-comparison.png) | Same glass card and neighboring prompt context remain. Save/Cancel are quiet and the full exact text is editable. The master draws its next prompt through the bottom of the 74 px editor; production reserves approximately 31 px extra vertical flow to avoid that overlap. The sixth row remains available by scrolling while the reserved footer keeps actions reachable. This safety/legibility accommodation is disclosed, not erased from the difference. |
| [V05 reorder](visual-convergence/V05-comparison.png) | Small elevation and pale focus edge on the dragged row; a two-pixel insertion line, no large colored block. Existing pointer/keyboard manual-order commands and semantics are retained. |
| [V06 dark](visual-convergence/V06-comparison.png) | Deep neutral translucent glass, soft off-white text and low-contrast dividers. The orb keeps its colored glass material. No pure black panel and no geometry change. |
| [V07 compact](visual-convergence/V07-comparison.png) | The same surface fits the 390 × 844 reference (322 × 340 card); narrow layouts retain safe gutters and internal scrolling. Footer focus does not move the card content. Additional 320 px/200%/coarse evidence belongs to the affected browser matrix. |
| [V08 inserted](visual-convergence/V08-comparison.png) | Same card and row positions remain open. The real verified insert leaves a quiet status/copy affordance rather than a success banner; this truthful existing feedback is additional to the silent master illustration. Composer gets exact text and focus; send count stays zero. |

## Corrections and negative evidence

Initial comparison exposed extension-document body font scaling, over-visible
footer controls, a 4 px focus scroll in compact mode and Linux's native thin
scrollbar overriding custom styling. Those were corrected in presentation CSS.
The scrollbar now uses a three-pixel track without native arrow buttons.
An initial SVG icon namespace was rejected by the package URL guard; it was
replaced with CSS glyphs instead of weakening that guard.

In the headless OOPIF harness, teleporting the pointer straight outside the frame
can retain the last hovered descendant. Captures now move through neutral card
padding before leaving. No runtime style is modified to manufacture a quiet state.

The attached-orb layout also needs an immediate layout update on Close. A first
regression incorrectly compared positions across a growing composer after text
insertion; it now verifies the close/reopen round trip at unchanged composer
geometry. Production still follows the safe-layout algorithm when drafts grow.

The final full surface journey exposed Save being occluded by the absolute footer
when an unsaved-edit notice was present. Editor/list bottom space now includes
the footer and status, including coarse targets; the original native save, cancel
and unsaved-guard assertions remain. Pointer reorder now exercises the new V03/V05
inline grip; keyboard reorder still exercises the unchanged management command.
Native `chrome.tabs.setZoom(2)` additionally verifies actual doubled DPR, halved
CSS viewport, reachable management and no composer overlap in source/release.

A local generated release cache contained extraneous files suffixed ` 2`; its
package guard failed as intended. These files were not in tracked source. The
cached fingerprint was invalidated; clean cloud builds own the final release
result. No package assertion or allowlist was relaxed.

Image review also exposed hover specificity re-showing edit/overflow during drag.
The moving row now suppresses them explicitly. Inserted-state review found the
hidden navigation strip could cover the final prompt; fine-pointer status and
navigation now share separate parts of the reserved footer, while coarse mode
reserves two 44 px lines. Capture asserts actual last-prompt hit testing and zero
drag-secondary-control opacity as well as inspecting their rendered pixels. These failures/corrections
are not converted into historical PASS.

Documentation-head foundation run 37221951337 exposed a source-only split fixture
timeout (the release split and all other preceding management assertions passed).
The directly seeded archive is now checked through the production Prompt query
before refreshing the UI snapshot; both captured members and the single family
must be present. The UI refresh completion and row/status diagnostics are explicit.
Original split results and byte-identical archive assertions are unchanged. No
production algorithm, request behavior or timeout is changed. The failed attempt
remains negative evidence; the follow-up PR checks own its final verification.

## Verification and remaining gates

The final runtime candidate has [eight-state visual capture and comparison](https://github.com/haohongfei2001-png/paia/actions/runs/37221128708)
and [integration certification](https://github.com/haohongfei2001-png/paia/actions/runs/37221128698)
PASS. The [Prompt Reuse foundation gate](https://github.com/haohongfei2001-png/paia/actions/runs/37221128711)
PASS: all source/release insertion and surface journeys (44 cases; 48 Node
registrations including four parent containers), full unit, adapter/privacy
contracts and package/release guards completed successfully.

- Owning unit tests: 64/64, zero skipped.
- Full unit shards: 1,768/1,768 (425 + 517 + 381 + 445), zero skipped.
- Adapter contracts: 102/102; privacy/security: 59/59, zero skipped.
- Source package guards: 11,421 across 292 runtime resources.
- Built release guards: 10,986 across 285 runtime resources; 309 emitted files.
- Visual source/release parity: 8/8, zero changed pixels; all four actual built
  presentation asset hashes equal source. Target differences are retained.
- Matrix covers light/dark and host/system theme changes; 390 x 844 master,
  320 CSS px, 200% text and native 200% browser zoom; keyboard/coarse pointer/
  reduced motion; native pointer and keyboard reorder; inline edit/save/unsaved
  protection; hidden recovery/delete/split; SPA/reload/tab discard/worker restart;
  exact draft-preserving insertion, composition/uncertain result and no auto-send.
- Browser assertions retain zero send/Enter, provider/network/history requests,
  draft capture and whole-library host exposure. No functional regression observed.

The broader historical browser and macOS jobs are intentionally skipped by the
unchanged integration routing. Affected Prompt Reuse browser files run in full.
No screenshot similarity threshold is an acceptance gate.

No authenticated current ChatGPT compatibility, real user acceptance, public
store release or deployment is claimed. CPV1-09.6, CPV1-09.7 live certification,
Stage 3 and B-04 remain deferred. The owner is not asked to operate DevTools,
Console or chrome://extensions. No merge is part of this request.
