# PAIA Website V7.1 Visual Refinement

Owner review only. Keep PR #98 draft. No merge, deployment, or further design iteration.

Refinement parent: `112e6e87c232c53c674819d923fd242a8d0b760b` (V7).
Branch: `design/website-v7-origin-fidelity`. Final head is recorded in PR #98.

## Changes

The V7 page had faint body/metadata text and product scenes that resembled wireframes.
This bounded pass increases contrast and product surface hierarchy while retaining
its existing information architecture and copy. Only the homepage V7 stylesheet
and its cache key change; the three generated homepages contain that cache-key change.

- Body remains exactly `rgb(251, 251, 250)`. Header and section backgrounds retain
  their existing near-white values. Instrument Serif, H1/H2 weight, brand typography
  and all graphic brand assets are unchanged.
- Existing hero card borders, shadows, lines and grayscale photos are slightly
  stronger; photo opacity moves from .32 to .52. Hero markup, composition, card
  sequence and scroll JavaScript retain exact V7 bytes.
- Product text and timestamps are larger/darker; editors, buttons, active rows,
  pinned prompts, provenance, timeline and confirmation/selection/permission
  states have clearer neutral/slate-gray boundaries. No gradient, glass or glow.
- Product sections have less vertical padding; the prompt interface takes more of
  the existing split. No new sections, cards, artwork or slogans.
- Archive retains direct editing, immutable original source and working version.
  Prompt example retains usage counts, preset similarity groups, pin/order/drag,
  edit and insertion-only suggestion. Topic retains cross-conversation chronology.
  Context retains extracted/confirmed/requested/preview/authorized/current-use
  distinctions. Permission never fabricates real AI use.
- A regression from the enlarged mobile version note obscuring the reset control
  was found by the existing Chinese browser journey and corrected by placing that
  note in normal mobile layout flow. No assertion was relaxed or click forced.

## Scope preserved

No changes in this pass to `website/home.py`, `website/core.py`, any JavaScript,
shared `site.css`, `home-core-v1.css`, fonts, asset lock, artwork or test assertions.
Prior V7 receipts stay intact. Non-home pages are unchanged.

No changes to `extension/**`, product STATUS, runtime, workflows, PR #88, PR #91,
main or the separate product checkout. No force push, merge, deployment, form
submission, AI call, account connection or paid resource change.

## Validation

- Source generation and generated-file check pass: 50 files.
- Existing full real-HTTP headless browser suite: **3160 checks, zero failures**.
  Covers both languages, 1440/768/390/320, enlarged text, native/reverse scroll,
  reduced motion, no JS, keyboard, edits, sorting, insertion, actual download,
  candidate confirmation, permission invalidation/revocation and external requests.
- Separate V7-to-V7.1 computed-style comparison: **30 checks pass**, including exact
  body color, unchanged H1/wordmark font/weight/size, readable representative body
  and metadata sizes, and zero actual use after example authorization.
- Screenshots inspected for EN/ZH, full page and actual active UI states. Headless
  Chromium 153 on macOS; the PR workflow independently uses its pinned Linux
  environment. Native CJK font rendering can differ by OS.
- Final-head GitHub CI result belongs in the PR body; no workflow dispatch or
  deployment is necessary. Existing workflow runs once for this branch update.

[1440px three-way comparison and 1:1 crops](v71/README.md). All V7.1 screenshots
are lossless WebP copies of real browser PNG captures. Screenshot sizes, image
hashes and implementation-source hashes are stored alongside the test summary.
The original reference is only one supplied image; its missing lower page is
explicitly left blank in full-page comparisons.
