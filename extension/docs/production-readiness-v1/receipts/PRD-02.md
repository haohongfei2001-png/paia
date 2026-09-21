# PRD-02 — Current Logged-in ChatGPT Capture Verification

Execution: `PRD02-20260921-live01`

Passive amendment: `PRD02-20260921-passive01`

Execution start main: `f42e1a7fa5c0944290bd47868da8d0b2512287ad`

Current round: **IN_PROGRESS — LIVE PASSIVE EVIDENCE NOT YET COLLECTED**

## Scope

PRD-02 proves current logged-in ChatGPT capture V05-V09. It does not certify
daily-profile update/restart, Backup restore, semantic retrieval or final
production readiness.

No retrospective account crawl is allowed. Real message bodies, titles, URLs,
conversation/source/message IDs, credentials and Chrome profile paths remain
local and never enter Git evidence.

## Harness history

The first PRD-02 harness used a dedicated synthetic Alpha/Repeat/Post-navigation
conversation. Its engineering/privacy tests passed and PR #41 merged to
`main@6f127dde924d4b8e541d831bb7ae1445fb8c38d4`.

Exact-main PAIA Certification #450 / run `35601275562` completed SUCCESS on
that main.

Normal product use then showed that requiring synthetic test messages imposed
unnecessary owner work and also exposed a distinct product limitation: ChatGPT
Project recognition is not implemented. The provider contract still declares:

- `projectIdentity: unverified`
- `projectName: unverified`
- `membership: unverified`

That source-structure limitation is recorded here rather than being disguised as
a capture failure or a successful Project feature.

## Passive normal-use verifier

The amended verifier requires **no test messages**.

After the owner has used ChatGPT normally, one local read-only check combines:

1. the most recent durable body-free
   `ans:conversation:v1:*` observation;
2. the latest sanitized capture `structure` and `ingestion` diagnostics;
3. the body-free `recordIndex.byChat` rows for that observed conversation;
4. a byte-for-byte comparison between the current release build and the
   Chrome-loaded PAIA runtime.

The verifier does not open the `records` body store. It does not read
`originalText`, `libraryText`, titles or URLs.

## PASS requirements

A passive live PASS requires:

- Chrome-loaded runtime byte parity with the current release;
- recent ChatGPT capture and recent Conversation observation;
- observation and capture evidence bounded to the same recent normal-use window;
- adapter version 0.3.0 and `CAPTURING` state;
- current structural diagnostics available;
- at least one visible user role;
- every visible user role has valid message identity, passes editor/busy gates
  and becomes a final capture candidate;
- capture ingestion attempted count exactly equals the final candidate count;
- current persisted scan count equals ingestion attempted count, while both equal the accepted user-candidate count;
- zero unresolved and zero ignored candidates;
- `knownTimes + unknownTimes = attempted`;
- a repeated observation produced at least one duplicate instead of a second
  logical Source;
- body-free archive indexes contain at least the attempted number of distinct
  Source and message identities with one-to-one identity mapping;
- no malformed source-time value is present in the bounded conversation index.

Together with the current Adapter/Privacy exact-main gates, this demonstrates
that the live capture request is sourced from validated **user-role** candidates,
not assistant bodies or the composer/draft surface.

## Project recognition finding

PRD-02 reports but does not solve ChatGPT Project recognition.

Current `source-structure-contract.js` verifies only
`conversationIdentity`. Project identity, name and membership remain
`unverified`, so Archive's "项目未知/归属未知" state is a real capability gap.

A capture PASS does not change those capability flags and does not authorize
implementation of Project recognition inside PRD-02.

## Privacy output

The only shareable result line begins:

`PAIA_PRD02_PASSIVE`

It contains booleans, counts, fixed enum states, public source HEAD/version and
release digest. It contains no body, title, URL, conversation ID, source ID,
message ID, profile path or credential.

## Pending closure

PRD-02 now requires only:

1. publish the passive verifier through required candidate/exact-main CI;
2. run it once after ordinary ChatGPT use against the existing loaded PAIA;
3. preserve the sanitized `PAIA_PRD02_PASSIVE` result;
4. if PASS, close V05-V09 and mark PRD-02 COMPLETE;
5. stop. Do not start PRD-03 or a Project-recognition package in the same
   execution.
