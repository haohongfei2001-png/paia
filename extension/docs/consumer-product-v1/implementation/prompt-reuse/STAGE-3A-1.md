# Prompt Reuse Stage 3A-1 — candidate implementation

State: ENGINEERING_VERIFYING. Current-live ChatGPT evidence: PENDING.
Stage 1/2 FINAL_CLOSED and its accepted V01–V08 visuals remain unchanged.
This batch does not start 12.3A-2, 3A-3 certification or Stage 3B.

## Scope and authority

Owner-confirmed CPV1-12.3A-1, based on remote main
`967188ab1a15ff2d91e631c1ca3f3d8c17ea67b9` (Stage 3A routing PR163).
The owner authorized implementation, tests, PR and integration, with real-site
limits retained when authenticated ChatGPT is unavailable. No D7 page root,
Provider, host permission, durable schema or original capture parser changes.

## Architecture and conservative limits

- Popup **当前回复建议** is explicit and default OFF. It applies to this browser
  session only. A body-free boolean/random permission generation is held in
  extension session storage, never in Backup. Browser restart, update and restore
  require renewed opt-in; capture pause is independent. Worker restart keeps the
  session opt-in but rotates its authority and discards transient candidates.
- The isolated ChatGPT current-reply adapter is independent from user capture.
  It observes metadata prospectively, requires a Stop-generation cycle, a newly
  observed reply identity within that cycle, a current final Copy action, no
  Stop/Continue/error state, and a 600ms rendering-stability interval. Silence
  alone never completes a reply. Old replies on enable/reload never qualify.
- Ambiguous same-ID Continue/regenerate outcomes DEFER. A fresh reply ID must
  belong to the observed generation; restoring a historical branch or changing
  a final reply cannot reuse the old generation. This is intentionally narrower
  than a current-live compatibility claim.
- The versioned detector implements DIRECT_REPLY, CHOICE and DEFER only. Direct
  v1 recognizes finite Chinese/English standalone literal-request forms and a
  finite list of non-consequential acknowledgement/continuation literals such as
  继续, 已登录, 完成了, ready and done. Unknown literal meaning, arbitrary surrounding
  prose, material requests, quotes, examples, code, conflicting requests,
  negation and sensitive/destructive/permission actions DEFER. It does not claim
  arbitrary natural-language understanding or arbitrary quoted-text extraction.
- Conditions are visible and insert only the exact requested literal. Yes/no
  choices require a supported low-risk question; letter choices require explicit
  finite safe action definitions. Alternatives are peers, with no default.
- The worker stores only one bounded candidate group per document/tab in memory.
  Candidate IDs bind exact text, condition/evidence offsets, reply identity and
  revision, conversation, generation, document and authorization. Snapshots are
  released after analysis; they bypass even the observer-only Product Signals.
  No candidate becomes a durable Prompt Family or enters reuse ranking.
- Capsule content stays in the existing extension-origin frame resource, under
  a separate live nonce. The host page never receives reply snapshots/evidence or
  all choices. Placement avoids the accepted orb/card and whole composer without
  relocating the saved orb. User-idle/busy/IME/drag guards skip automatic display
  rather than queue stale work. Retraction targets 12 seconds, pauses on hover or
  focus, and the still-current suggestion can reopen through 本轮建议.
- The trusted click path revalidates current evidence and permission, then reuses
  the existing ChatGPT composer executor. An optional synchronous guard runs
  after focus and immediately before its native edit to close focus-handler
  navigation races. Draft/caret/selection, exact readback and no-send semantics
  remain. Attempts are one-shot; only failed/uncertain attempts permit copy.

## Evidence and limits

Initial local focused result: 116 new detector/lifecycle/security tests PASS.
The fixed detector corpus contains supported positives and held-out-style safety
regressions; the test prints its actual denominator, precision and supported-rule
coverage. These are finite fixture results, not population accuracy.
Package: 11,638 source checks / 299 resources; release: 11,203 checks / 292
resources, release-product guard 316 files PASS at this candidate checkpoint.
All figures are superseded by final exact-head results when recorded below.

Native browser execution in this cloud workspace failed before any browser case:
Chromium process-singleton socket creation is disallowed (`Operation not
permitted`), including the permitted escalation attempt. This is NOT_RUN browser
evidence, never a product PASS. The existing hosted Prompt Reuse job retains its
original suites and 15-minute budget and adds the complete source/release 3A-1
production-path test and screenshot artifact. Hosted evidence is pending.

Authenticated current ChatGPT is unavailable in this execution environment.
Synthetic production-extension tests will not be relabeled current-live PASS.
The new capsule's final current-live/owner visual certification remains separate.
