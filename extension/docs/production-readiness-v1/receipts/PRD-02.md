# PRD-02 — Current Logged-in ChatGPT Capture Canary

Execution: `PRD02-20260921-live01`

Execution start main: `f42e1a7fa5c0944290bd47868da8d0b2512287ad`

Writer: `manager/prd02-live-canary-20260921`

Status: **IN_PROGRESS — LIVE EVIDENCE NOT YET COLLECTED**

## Scope

This round may observe only a bounded, owner-authorized live ChatGPT canary.
It does not crawl account history, update/reload the daily extension, restore a
Backup, modify Source identity, broaden permissions or start PRD-03.

## Canary design

The live verifier uses one new ordinary ChatGPT conversation and a random
per-run token. The owner performs four synthetic sends:

1. Alpha once.
2. Repeat twice as two separate user messages.
3. After one page reload and a sidebar navigation away/back, Post-navigation
   once.

A fourth synthetic string is typed into the composer and cleared without being
sent.

The verifier runs before the canary and after the lifecycle exercise. It reads
the existing PAIA IndexedDB locally, compares only against the synthetic run
strings and emits no body text, title, URL, chat ID, source ID, message ID,
profile path or credential.

## Required final invariants

A PASS requires all of the following:

- the Chrome-loaded PAIA runtime byte-matches the current release build;
- exactly 4 canary user records exist in the declared canary chat/window;
- Alpha count = 1;
- Repeat count = 2;
- Post-navigation count = 1;
- Draft-only count = 0;
- all four records belong to one live ChatGPT conversation;
- all four have distinct Source identity, message identity and dedupe identity;
- the two identical Repeat bodies have the same content hash but distinct
  Source/message/dedupe identity;
- no fifth same-chat record exists in the canary window, so assistant output,
  draft/editor content or unrelated material did not enter the archive;
- source time is either a valid provider/DOM-derived time or explicitly unknown;
  capturedAt is never accepted as a substitute;
- the live diagnostic surface reports adapter version 0.3.0 and at least one
  explicit non-capture lifecycle state such as WAITING_CHAT/NO_MESSAGES during
  the blank/new-chat/navigation exercise;
- the scan completes within its local bounded record limit.

## Runtime parity

The launcher does not deploy production runtime bytes. It builds the current
release in a temporary directory and compares that release byte-for-byte with
the already Chrome-loaded PAIA runtime, ignoring only `__paia_*` local
verification helper directories.

If parity is false, PRD-02 does not update/reload PAIA. It reports the mismatch
and stops the canary. Runtime update/restart belongs to PRD-03.

## Privacy

The durable result format is `PAIA_PRD02_LIVE_CANARY` followed by sanitized
JSON containing only:

- booleans and fixed reason codes;
- counts;
- fixed diagnostic enums;
- public source HEAD / manifest version;
- release digest;
- a non-reversible digest of the random canary run token.

Private live content remains local.

## Automation boundary

The verifier and launcher are development-only assets and are excluded from the
release product. They do not call AI, write PAIA storage, delete data, restore
data, reload the extension or change Chrome permissions.

## Pending closure

PRD-02 cannot close from CI alone. The following are still required:

1. publish the verified development-only canary harness;
2. run it against the current logged-in ChatGPT site and the existing
   Chrome-loaded PAIA runtime;
3. preserve the sanitized result;
4. classify any failure without guessing or repairing private data;
5. if the live canary passes, publish the final receipt and exact-main
   engineering certification without starting PRD-03.
