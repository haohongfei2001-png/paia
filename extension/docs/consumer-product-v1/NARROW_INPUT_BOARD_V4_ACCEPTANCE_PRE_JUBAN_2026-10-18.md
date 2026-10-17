# Floating input — revised acceptance within the existing NIB matrix

**PAIA-FLOAT-UI-1.0 / 2026-10-16.** [SPEC](NARROW_INPUT_BOARD_V4_SPEC.md) and [ADOPTION](NARROW_INPUT_BOARD_V4_ADOPTION.md) govern. This file defines checks, not a result claiming they ran.

## 1. Full retained matrix and changed rules

The complete previous environment, fixtures, G/Q/U/M/A/E cases, Popup replacement ledger and closure rules are preserved in [PRE_FIXED](NARROW_INPUT_BOARD_V4_ACCEPTANCE_PRE_FIXED_2026-10-16.md), exact blob `409dbeb7863d8b9cdb8542ee64ff4712a050f161`. **All nonconflicting cases remain required.** This scoped update does not reset prior valid runs, reduce privacy gates, remove test corpora, skip cases or change existing timeouts to get green.

Only the following expected behavior is replaced:

| Original case | Revised observable expectation |
|---|---|
| G01 | Normal desktop336px width in every internal view; exceptional narrow viewport clamps safely through the existing owner and never increases width |
| G02 | Normal board336×312 for0/1/3/6/many/loading/error/empty/search; rows remain44px and single-line; overflow internal, no small-count height shrink |
| G03 | Fixed board translates to avoid the entire composer/top controls first; only genuine insufficient space constrains the view; logical mode unchanged |
| Q01 | Original qualified history query returns identical ordered IDs/revisions/snapshot/coverage as its canonical query owner; visible quick results are the ordered<=150 projection, not a six-item or Family-only query |
| U01 | First row/capsule click uses exact eligible<=150 full body even if ellipsized or multiline; zero compulsory CHECK_TEXT or second insert/copy choice |
| U02 | Optional complete text/range viewing stays same-size and truthful; >150 whole expressions never enter quick insertion; no silent truncation and no archive deletion |

Old reference heights336×178/310/490/294 are historical v4 cases, not new geometry targets. Native dimensions override proportions of objects enlarged in the approved poster. G04–G08, Q02–Q07, U03–U10, M01–M06, A01–A08 and E01–E08 remain in force except these explicit scope-specific substitutions. For U03, an explicit quick range must itself be<=150; invalid selections never fall back whole. Preserve full long-archive discovery and access outside the quick surface.

## 2. Approved-design delta cases

| ID | Scenario | Required result |
|---|---|---|
| F01 | Compare all three forms at actual40/44,272×44,336×312 CSS sizes on ordinary white host | Selected smoky-blue/indigo frosted sphere; restrained neutral panel; no face/send/assistant prompt, duplicated widgets, category dots or fake shortcuts |
| F02 | Inspect enlarged sphere plus native40px; matched light/dark/complex host backgrounds | Source's soft volume/depth and discernible rim remain; not a white plastic button, opaque gradient ball, chrome marble, double ring, neon/rainbow or continuous bloom |
| F03 | Normal rows, hover/focus, search, details, edit and empty board | One actual expression per row; no subtitle/summary, repeated ball, permanent shortcut or separate row card; one compact header, no permanent count/rule footer; outer rectangle stable |
| F04 | 150/151 boundary, Latin/Chinese/punctuation/spaces/CRLF/combining emoji | One shared grapheme policy at all quick-admission and final-use owners;150 admitted,151 refused without losing draft or altering stored original |
| F05 | Existing oversized Family/manual records; import/restore/sync recovery; AI/reply candidates | Long originals, IDs, human edits/pins/order/hide/split and source restrictions preserved; no truncate/delete/AI rewrite; long whole bodies withheld from quick use only |
| F06 | Search a seventh/later-page history Input, long-only matches and incomplete pagination | Relevant quick hits beyond six appear in canonical order; long-only outcome has truthful PAIA continuation; no false no-result/completeness or global corpus length filter |
| F07 | Eligible clipped/multiline<=150 row and capsule in nonempty draft | First intentional click inserts exact text and returns host focus; no confirmation/copy branch, no Send; optional more can view/edit without changing main click semantics |
| F08 | Composer grows, extreme/narrow viewport,200% text, recovery after shortage | Whole-board avoidance first, safe constrained interior only if needed, controls/real caret not covered; no lost query/dirty work/mode or forced sidebar |
| F09 | Cold initialization versus repeated warm opens/inserts, representative corpus sizes | Report separate actual event-to-usable and event-to-visible-verified-text p50/p95/failure/long-tail observations; do not present script-only time or animation duration as performance |
| F10 | Rapid open/close/insert, idle, late recommendations, reduced motion | Approx120/80ms nonblocking transitions, no frame churn or continuous motion; local success only, stable order and no blur/idle/insertion collapse |
| F11 | Two inserts, real native undo/redo, selected draft, IME, held activation key and double click | Correct per-host undo and preserved draft; no auto-repeat leak into host Send, no duplicate effect and no destructive snapshot rewind |
| F12 | Target/content/revision/permission changes; UNKNOWN; hostile host observes DOM | No wrong receiver, stale body, default clipboard disclosure, silent retry or private-body leak; existing frame/nonce/worker/caller checks remain effective |

## 3. Measurement and evidence discipline

Use current source and independently built release in isolated synthetic browser profiles, with the original actual extension worker/data/frame/coordinator and controlled host fixtures. Keep all inherited human-work, Source removal/purge, Archive return, strict caller, independent Next and AI financial-admission coverage. No private account/cookies/archives or paid provider activation is introduced to obtain evidence.

Warm p95<=50ms open/use is a working optimization target, not an observed pass or replacement for existing gate thresholds. Record host/browser/OS/hardware, zoom/DPR/viewport, corpus size, cold/warm distinction, paint/receiver visibility, failures and long tails. Do not make a 120Hz claim from a JavaScript timer; physical high-refresh and OS IME evidence are separately identified when available.

Record exact source/release hashes and the selected original-reference SHA. Show the component on the unchanged host with the whole composer/top controls visible, not only a cropped marketing render. Final-size and enlarged comparison serve different purposes. Keep any inability to retrieve exact approved artwork or run a native case explicit; it blocks that specific claim, not unrelated safe engineering. The owner already approved the direction; fidelity review must not reopen arbitrary exploration.

This documentation action has not rerun the V6 historical111 checks, the old193 checks or any production test. Image inspection, reference hashes, link/contract checks and a documentation commit are not proof of native insertion, cross-origin isolation, scale performance, provider quality, installation or S0–S4 completion.