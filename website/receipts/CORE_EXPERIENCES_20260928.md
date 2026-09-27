# PAIA post-capture core experiences — implementation receipt

Owner authorization: redesign and deploy the later four homepage functions;
retain the current hero/progressive cards and restrict supplied art to existing
logo/closing use. Design brief: PAIA design ideas v2.5, read before implementation.
Baseline: remote/main `d8eb7b1292a3b5d03f8018761c6ab624d05d05c7`.

## Implemented boundary

Only the homepage after the approved capture sequence is redesigned. English,
Chinese and the legacy English alias are generated together. A short linked
navigation replaces the redundant four-feature overview essay.

1. Archive: editable continuous input reader, real keyword search, chronological
   reversal, source readback, reset and propagation of working text to topics.
2. Prompt reuse: personal recurring expressions with example similarity groups,
   editable wording, drag/arrow ordering, composer insertion without sending,
   and an explicitly preset/permission-dependent future next-step suggestion.
3. Thought Library: the same four records transition between dispersed inputs
   and a chronological topic. No viewpoint is generated or silently replaced.
   Markdown export includes the current edited working text.
4. Personal context: user-added note, confirmed source-derived information and
   unconfirmed candidate are distinct. No empty-scope authorization; candidates
   require confirmation before selection. Changes invalidate prior example
   permission. Authorization and revocation are recorded only in page memory.

No new artwork, fonts, external dependencies, capture, telemetry, account data,
model calls, transmission, persistent storage or extension mutation is added.
The original brand assets, hero CSS/JS and independent demo JS remain identical.
The close keeps the original artwork. There are no feature-section images.

## Verification design and observed preparation evidence

The generated files passed source checking. Before/after exact-source browser
captures of both English and Chinese hero at scroll 0, 260 and 660px are pixel
identical (six comparisons, 1440x900, same Chromium/font environment).
Shared capture CSS/JS and the hero literal are also protected by SHA-256 tests.

The isolated post-capture browser journeys passed at 1440 and 390px in both
languages, including edits, injection inertness, filtering, ordering, context
confirmation, scope, invalidation, revocation and working-text export blobs.
The full existing site suite retains 1440/768/390/320px reflow, enlarged text,
hero motion/reversal, no-JS/reduced motion, independent demo and beta validation.

The authoring container permits exact-source about:blank rendering but blocks
local HTTP navigation. Its results are therefore explicitly offline synthetic
browser evidence, not production or physical-device certification. GitHub PR
checks are the actual HTTP/download gate. The main website workflow then checks
exact deployed bytes and current public browser journeys; its run/artifact is
the release evidence, not a claim inferred from a successful Pages deployment.

`verify_live.py` now tests the current four experiences instead of the removed
v3 context picker. It also verifies both home-only assets. No byte mismatch,
external boundary or failed browser assertion is waived by this change.

Any one-time source-transfer workflow/packet is removed before PR integration.
No automatic changes to the existing unrelated design draft or extension queue.
