# PRD-02 — Current Logged-in ChatGPT Capture Verification

Execution: `PRD02-20260921-live01`

Passive amendment: `PRD02-20260921-passive01`

Execution start main: `f42e1a7fa5c0944290bd47868da8d0b2512287ad`

Current round: **COMPLETE — LIVE CURRENT-RELEASE CAPTURE PASS**

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

## Passive verifier publication

PR #42 merged the passive normal-use verifier to:

`main@6f91eaaecdfd45fcef291bee8c967de6699bab9e`

The exact PR head passed PAIA Certification #454 / run `35611861162`.

The merged main then passed exact-main PAIA Certification #455 / run
`35615363535` with all required current jobs SUCCESS, including Current Browser,
Full Suite, Unit 1-4, Adapter/privacy, current release guards, macOS Secure Store
and the final Certification gate.

No production runtime, manifest, permission, schema, provider, Source identity,
Backup or AI behavior changed in the passive-verifier amendment.

Therefore the remaining PRD-02 dependency is not CI or implementation. It is one
local read-only `PAIA_PRD02_PASSIVE` result from ordinary ChatGPT use.

## First passive live result — retained FAIL

The first real passive result from ordinary ChatGPT use returned
`paia-prd02-passive-normal-use-v2` with `pass=false`.

Sanitized evidence:

- scanComplete = true;
- recentCapture = true;
- recentConversationObservation = true;
- observationBoundedToCapture = true;
- adapterVersion = true;
- visible user roles = 3;
- accepted user candidates = 2;
- ingestion attempted = 2;
- added = 0;
- duplicates = 2;
- unresolved = 0;
- knownTimes = 0;
- unknownTimes = 2;
- archive active rows = 18;
- distinct Sources = 18;
- distinct messages = 18;
- source-time honesty = PASS;
- adapter status = `ADAPTER_MISMATCH`;
- captureHealth = `NO_ACCEPTED_METADATA`;
- Project recognition remains unverified/unknown.

The result also reported `runtimeParity=false`, but its runtime metadata
(`sourceHead`, `manifestVersion`, `releaseDigest`) were all null. That means
the helper runtime-parity script did not load, so this first result does **not**
prove the loaded extension differs from the certified release.

Investigation found the launcher wrote the helper script using a shell
`printf` escape that can leave an invalid literal backslash-newline token in
JavaScript. The diagnostic follow-up replaces that writer with Python JSON
serialization.

The `ADAPTER_MISMATCH` remains a real live finding. Current diagnostics prove
that one of three visible user-role nodes was rejected, but the v2 shareable
report did not expose enough body-free structure to distinguish a missing
message identity from a zero/multiple-text-leaf or editor-scope case.

The next verifier revision therefore adds only the existing sanitized structural
booleans/counts for rejected roles. It still emits no body, title, URL or
persistent identifier and does not weaken the adapter's fail-closed capture
contract.

This FAIL is historical evidence. A later PASS does not erase it; it must show
why the rejected live role was safe to ignore or how the adapter contract was
corrected.

## Diagnostic follow-up publication

PR #43 published the first-live-failure diagnostic follow-up.

Candidate head:
`1d6f9c3729bb2f5e9e0568c5ddfe1c730b28a571`

Candidate Certification:
`PAIA Certification #458 / run 35674821804 / attempt 2 / SUCCESS`

Attempt 1 is retained as a non-PASS CI event: Current Browser and all light
gates passed, but Full Suite was cancelled at the existing 30-minute job
boundary before `test-summary.json` was emitted. No failing assertion preceded
the cancellation. The unchanged head was rerun through failed jobs only; attempt
2 completed SUCCESS without timeout or assertion weakening.

Merged diagnostic verifier main:
`894ba0cd0c3a4c809a2ff5145d79e68621f03d10`

Exact-main Certification:
`PAIA Certification #459 / run 35684745685 / attempt 1 / SUCCESS`

The exact-main run passed Current Browser, Full Suite, Unit 1-4,
Adapter/privacy, release guards, macOS Secure Store and the final Certification
gate.

The diagnostic follow-up changes only development verifier/tests/docs. It fixes
the runtime-parity helper writer and adds bounded body-free rejected-role
structure to the sanitized report. It does not change the production ChatGPT
adapter or collection rules.

## Production-readiness route amendment

The product owner has explicitly tightened the next-stage acceptance standard.

After PRD-02 is COMPLETE, development must switch to
`PAIA-CHATGPT-PROJECT-RECOGNITION-v1` before PRD-03.

That package is currently `BLOCKED_BY_PRD02`. It may complete only when real
current ChatGPT `projectIdentity`, `projectName` and Conversation→Project
`membership` are all verified from privacy-safe live evidence. Historical ANS
fallback behavior remains valid history but is not sufficient for this new
product requirement.

## Second passive live result — capture PASS, runtime parity FAIL

The second passive result used the repaired verifier and returned
`pass=false` only because `runtimeParity=false`.

All live capture-specific checks passed:

- current adapter version;
- CAPTURING status;
- 2 visible user roles / 2 accepted candidates;
- exact ingestion/candidate count match;
- zero unresolved / ignored candidates;
- duplicate observation safety;
- 19 distinct Source/message identities with consistent mapping;
- honest source-time state;
- no structural rejection rows.

The current release evidence was valid this time:

- sourceHead:
  `9fdc406c553f0699374ca889df6b06425946e795`;
- manifestVersion: `0.12.0`;
- releaseDigest:
  `71270fdee2d940d7a5276311c3a699b3492f128fe8f0e0394b6fec6209f9763c`.

Therefore the first live `ADAPTER_MISMATCH` is not reproduced in the second
normal-use window. The remaining gate is genuine current-runtime parity.

### Sequencing correction

The original PRD-02/03 split assumed the daily runtime would already match the
certified release when PRD-02 ran. The actual daily installation is stale, so
PRD-02 cannot satisfy its parity gate without a runtime alignment step, while
PRD-03 is intentionally blocked behind Project Recognition.

A minimal bridge is therefore defined: use the existing updater to deploy the
already-certified release into the same existing runtime path, with its existing
automatic code backup, reload the same extension once, and rerun the passive
verifier.

This bridge is **not** PRD-03 certification. It does not test Chrome restart,
rollback/recovery or update durability and cannot be cited as those gates.

The actual daily-runtime mutation is not performed without explicit owner
approval.

## Post-alignment passive result — parity PASS, page capture context stale

The owner-authorized runtime alignment succeeded.

The next passive result proved:

- `runtimeParity=true`;
- sourceHead `f1d32984c3d4d852d0df1d86b243170309dab4bd`;
- manifest v0.12.0;
- release digest
  `71270fdee2d940d7a5276311c3a699b3492f128fe8f0e0394b6fec6209f9763c`;
- archive identity coverage 20/20;
- ingestion settled;
- duplicate safety and source-time honesty remained green.

It did not yet prove current-page capture because diagnostics were
`CAPTURE_FAILED` with no current structure/visible-role snapshot.

This is consistent with the normal lifecycle after reloading an unpacked Chrome
extension while a ChatGPT tab is already open: PAIA content scripts are declared
at `document_start` / `document_idle`, so an already-open document must be
reloaded to receive the new extension context.

The next and only bounded action is therefore:

1. reload one ordinary ChatGPT conversation page;
2. wait for a fresh capture cycle;
3. rerun the passive verifier.

No runtime update, Chrome restart, Backup restore or data mutation is required.

## Final passive live result — PASS

After the owner-approved runtime alignment and one ordinary ChatGPT page reload
to reinject the current content scripts, the passive verifier returned
`pass=true` with no reasons.

Sanitized final evidence:

- runtimeParity = true;
- scanComplete = true;
- recentCapture = true;
- recentConversationObservation = true;
- observationBoundedToCapture = true;
- adapterVersion = true;
- captureStatus = true;
- structureAvailable = true;
- visibleUserRolesPresent = true;
- allVisibleUserRolesAccepted = true;
- ingestionMatchesVisibleCandidates = true;
- ingestionSettled = true;
- duplicateObservationSeen = true;
- archiveIdentityCoverage = true;
- sourceTimeHonest = true;
- visible user roles = 2;
- accepted user candidates = 2;
- attempted = 2;
- added = 0;
- duplicates = 2;
- unresolved = 0;
- distinct Sources = 13;
- distinct messages = 13;
- structural rejections = none;
- sourceHead =
  `f1d32984c3d4d852d0df1d86b243170309dab4bd`;
- manifestVersion = `0.12.0`;
- releaseDigest =
  `71270fdee2d940d7a5276311c3a699b3492f128fe8f0e0394b6fec6209f9763c`.

The diagnostic object still contains a historical
`lastErrorCode=CAPTURE_FAILED`, but the current status is `CAPTURING` and all
current structural/ingestion checks pass. The historical error field is not
treated as current failure.

### PRD-02 verdict

V05 current live ChatGPT: PASS.

V06 bounded live reconciliation: PASS.

V07 forbidden-content exclusion: PASS under the current user-role/editor safety
contract and current Adapter/privacy certification.

V08 Source identity / duplicate safety: PASS.

V09 timestamp honesty: PASS; unknown source time remains unknown rather than
borrowing capture time.

The earlier FAILs remain in this receipt as historical evidence.

Project Recognition remains a separate known gap:
`projectIdentity/projectName/membership` are still unverified/unknown. PRD-02
does not claim otherwise.

PRD-02 is **COMPLETE / PASS**.

## Closure

PRD-02 is COMPLETE / PASS.

The writer is released. This execution stops here.

Do not start PRD-03. The next package is
`PAIA-CHATGPT-PROJECT-RECOGNITION-v1`, whose CPR-00 round becomes READY only
through its own canonical STATUS and requires a separate continuation execution.
