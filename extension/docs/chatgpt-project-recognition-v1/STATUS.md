# Canonical Status — PAIA ChatGPT Project Recognition v1

package_id: `PAIA-CHATGPT-PROJECT-RECOGNITION-v1`

package_status: `HISTORICAL_EVIDENCE_ONLY`

canonical_branch: `main`

current_round: `NONE`

current_round_status: `NOT_EXECUTABLE — ABSORBED_BY_CONSUMER_PRODUCT_v1`

writer_status: `RELEASED`

blocking_dependency: `NONE — PRD-02 COMPLETE`

## Round queue

| Round | State | Goal |
|---|---|---|
| CPR-00 | COMPLETE | Live capability discovery and evidence-contract freeze |
| CPR-01 | COMPLETE | Trusted automatic current-Project observer and admission |
| CPR-02 | COMPLETE | Lifecycle + Navigator integration and fallback correctness |
| CPR-03 | ABSORBED | Real normal-use certification requirements carried into Consumer Product v1 |

## Current routing after Consumer Product v1 activation

This package is historical evidence only. CPR-00 through CPR-02 remain truthful
completed evidence. CPR-03 is not a separate executable queue; its useful
normal-use requirements are carried by Consumer Product v1, especially VS-02.
Do not resume this package unless the active Consumer Product round explicitly
requests a bounded historical artifact.

## Required package exit

All three must be production-`verified` on the supported current ChatGPT
surface:

- `projectIdentity`;
- `projectName`;
- `membership`.

Package completion is forbidden if those three remain
`unverified/unavailable`.

`projectOrder`, Project deletion and account-wide Project enumeration are not
minimum completion requirements for this package and remain governed by their own
evidence.

## Historical boundary

ANS-01..09 remain COMPLETE under their original fallback-capable contract. This
package does not rewrite their receipts or relabel their certifications.


## Activation

PRD-02 closed COMPLETE / PASS on 2026-09-22.

The blocking dependency is resolved. CPR-00 is READY but **NOT_STARTED**.

No Project Recognition implementation or live capability discovery has been
performed by the PRD-02 closure execution. A separate owner continuation
instruction is required to claim CPR-00.


## CPR-00 execution claim

execution_id: `CPR00-20260922-live01`

execution_start_main: `20708e87df9d0036990aeda8eb80807fb70fc5dd`

writer_branch: `manager/cpr00-live-discovery-20260922`

scope:

- passive, privacy-safe discovery of current ChatGPT Project evidence;
- development-only/sanitized probe support as needed;
- freeze of an exact provider evidence contract if real observations support it;
- no production capability flag promotion in CPR-00;
- no Project mutation, account-wide crawl, new permission, PRD-03 or CPR-01
  implementation.

CPR-00 may finish PASS only if real current-site evidence can establish
projectIdentity, projectName and current membership with explicit negative
cases. Otherwise it must finish FAIL/BLOCKED honestly.


## CPR-00 engineering publication

pr: `#44`

candidate_head:
`eda0857d454c7f18fb129be839f483e2742ba09b`

candidate_certification:
`PAIA Certification #493 / run 35701966427 / attempt 1 / SUCCESS`

merged_runtime_main:
`8f72cc87c66ed382e6ab131834e1f2a152270672`

exact_main_certification:
`PAIA Certification #494 / run 35706677451 / attempt 1 / SUCCESS`

engineering_state:
`PASS — privacy-safe CPR-00 discovery probe published and exact-main certified`

All required current jobs passed, including Current Browser, Full Suite,
Unit 1-4, Adapter/privacy, current release guards, macOS Secure Store and the
final Certification gate.

The frozen ChatGPT capture adapter remains byte-identical to its authorized
Capture Foundation baseline. CPR-00 discovery lives in the source-structure
bridge and development-only helper path. No manifest permission, Source/message
identity, production capability flag or durable Project fact was changed.

remaining_dependency:
`one sanitized real-site PAIA_CPR00_PROJECT_DISCOVERY result from normal use`

CPR-00 remains `IN_PROGRESS`. CPR-01 remains `PLANNED` and must not start
until the live evidence is classified and CPR-00 is canonically closed.


## CPR-00 first live discovery result

result_time: `2026-09-22`

format: `paia-cpr00-project-discovery-v1`

verdict: `FAIL / FRESH-RELOAD PROOF ONLY`

Strong live findings:

- runtimeParity = PASS;
- Project conversation observed = PASS;
- Project identity candidate = PASS;
- Project name candidate = PASS;
- Conversation→Project membership candidate = PASS;
- evidence stable across the submitted second observation = PASS;
- ordinary non-Project conversation negative = PASS;
- evidence stable after away/back = PASS;
- same Project conversation identity after return = PASS;
- no raw private emission = PASS.

Observed strong channel:
`route_plus_matching_project_home_link`

The live page exposed a route-bound Project digest and a visible Project-home
link with the same Project digest and one stable Project-name digest. The ordinary
`/c/` conversation emitted no Project channel.

The only failed check was:

- `reloadNewDocument=false`.

The first Project observation, claimed reload observation and later return
observation all carried the same run-local `pageInstanceDigest`. Therefore this
run does not prove that the second observation came from a newly loaded document.
The strong Project evidence is retained, but CPR-00 cannot close until one true
fresh-document observation is demonstrated.

No production capability flag is promoted yet. CPR-01 remains PLANNED.


## CPR-00 second live discovery result

result_time: `2026-09-22`

verdict: `FAIL / FRESH-RELOAD PROOF ONLY`

The second run again established the strong Project channel and ordinary-chat
negative. In this run the later Project-return snapshot carried a different
`pageInstanceDigest`, proving the nonce changes for a genuinely different
content-script document instance. The claimed reload snapshot still reused the
initial digest.

This narrows the issue to helper tab selection rather than the provider evidence
or page-instance mechanism. A development-only helper correction now locks all
four observations to the exact first Project tab. No production capability or
provider contract changes are authorized by this correction.


## CPR-00 helper correction certification

pr: `#45`

candidate_head:
`4237ae62ce43d7885f98dcf4d2fab162333086c6`

candidate_certification:
`PAIA Certification #499 / run 35712059351 / attempt 1 / SUCCESS`

merged_main:
`ea752ea9e8ddfc76e820d66c9fe69a47ade007b9`

exact_main_certification:
`PAIA Certification #500 / run 35714708162 / attempt 1 / SUCCESS`

All required current jobs passed, including Current Browser, Full Suite,
Unit 1-4, Adapter/privacy, release guards, macOS Secure Store and the final
Certification gate.

The correction changes only the development helper, its instructions/tests and
CPR-00 evidence docs. Production Project observation code, the frozen ChatGPT
capture adapter, manifest permissions and capability flags are unchanged.

remaining_dependency:
`one final same-tab PAIA_CPR00_PROJECT_DISCOVERY run with reloadNewDocument=true`

Because the helper correction is development-only, the already loaded certified
PAIA runtime does not need another production Update/Reload solely for this
correction. The owner only needs the latest repository helper files.


## CPR-00 closure

final_live_result_time: `2026-09-22`

final_live_result:
`PASS / paia-cpr00-project-discovery-v1`

final_live_channel:
`route_plus_matching_project_home_link`

final_live_checks:

- runtimeParity = PASS;
- projectObserved = PASS;
- reloadObserved = PASS;
- ordinaryObserved = PASS;
- returnObserved = PASS;
- projectIdentityCandidate = PASS;
- projectNameCandidate = PASS;
- membershipCandidate = PASS;
- stableAcrossReload = PASS;
- reloadSameConversation = PASS;
- reloadNewDocument = PASS;
- ordinaryNegative = PASS;
- stableAfterAwayBack = PASS;
- returnSameConversation = PASS;
- noRawPrivateEmission = PASS.

The final same-tab run proved the same Project identity/name/membership evidence
before and after a true document reload, produced no Project fact on an ordinary
chat, and restored the same Project evidence after navigating back.

Frozen contract:
`docs/chatgpt-project-recognition-v1/CPR-00_FROZEN_PROVIDER_CONTRACT.md`

verdict:
`CPR-00 COMPLETE / PASS`

CPR-01 is READY but **NOT_STARTED**.

Production capability flags remain `unverified` until CPR-01 implements this
frozen provider contract through the trusted source-structure admission path.
PRD-03 remains blocked.


## CPR-01 execution claim

execution_id: `CPR01-20260922-impl01`

execution_start_main: `e9f47e46807f5ea1ff668543895dc393acfbb27d`

writer_branch: `manager/cpr01-trusted-project-observer-20260922`

scope:

- implement only the frozen CPR-00 `route_plus_matching_project_home_link`
  provider contract;
- emit body-free Project identity/name/current-membership DTOs from the
  ChatGPT source-structure provider;
- preserve consent/epoch/current-route/session/exclusion gates;
- validate/admit through the existing source-structure trusted boundary/store;
- promote only `projectIdentity`, `projectName`, and `membership` capability
  flags if the exact frozen contract is implemented and tested;
- no sidebar-proximity fallback, generic header fallback, route-slug name
  inference, account-wide enumeration, CPR-02 lifecycle/Navigator work, or
  PRD-03 work.

CPR-01 must stop after candidate CI, merge, exact-main CI, receipt/status
publication and remote readback.


## CPR-01 closure

verdict:
`CPR-01 COMPLETE / PASS`

pr:
`#46`

candidate_head:
`9061001200ab36a0b71b03a1d48d5cba7ae3e27a`

candidate_certification:
`PAIA Certification #521 / run 35726508816 / attempt 2 / SUCCESS`

merged_main:
`c7b51f85512658a8e127d45a9389b62c38e3218a`

exact_main_certification:
`PAIA Certification #522 / run 35738998605 / attempt 1 / SUCCESS`

Production capabilities now verified:

- `projectIdentity`;
- `projectName`;
- `membership`.

The implementation uses only the CPR-00 frozen
`route_plus_matching_project_home_link` evidence chain and preserves trusted
route binding, consent/epoch/exclusion gates, privacy boundaries and
Source/message identity.

CPR-02 is READY but **NOT_STARTED**.

PRD-03 remains BLOCKED until this entire Project Recognition package is
canonically COMPLETE.


## CPR-02 execution claim

execution_id: `CPR02-20260922-lifecycle01`

execution_start_main: `ba4b2959ee05e7486fc826af38e87f351a5ff556`

writer_branch: `manager/cpr02-lifecycle-navigator-20260922`

scope:

- reconcile verified Project membership/name changes across normal SPA navigation
  and reload without changing Conversation/Source identity;
- represent verified ordinary `/c/` current-conversation evidence as
  unassigned membership when it follows a previously Project-bound Conversation;
- update Project name only from the frozen matching Project-home evidence;
- preserve last-known/history and unknown-vs-unassigned semantics;
- ensure Navigator automatically projects the resulting source-structure state;
- prove Project A→B, Project→ordinary, ordinary→Project, rename, reload and
  temporary evidence loss without duplicate Source or relationship spam;
- no Project ordering, account-wide enumeration, Project mutation, CPR-03
  certification or PRD-03 work.

CPR-02 must stop after candidate CI, merge, exact-main CI, receipt/status
publication and remote readback.


## CPR-02 closure

verdict:
`CPR-02 COMPLETE / PASS`

pr:
`#47`

candidate_head:
`648bed67000d91b8c59e789ef7a367c1b601a213`

candidate_certification:
`PAIA Certification #538 / run 35788531356 / attempt 1 / SUCCESS`

merged_runtime_main:
`cdae3e7b7bda0923f2474fc7f7ffe4101f4edd04`

exact_main_certification:
`PAIA Certification #539 / run 35792666267 / attempt 1 / SUCCESS`

All required current-release jobs passed on exact main: Current Browser, Full
Suite, Unit 1/4 through 4/4, Adapter/privacy, current release build and guards,
macOS Secure Store, and the final Certification gate. Historical Browser Audit
remained skipped by design.

The merged lifecycle implementation preserves verified Project identity/name/
membership admission while reconciling Project A→B, Project→ordinary,
ordinary→Project, rename, reload and temporary strong-evidence loss without
changing Conversation/Source identity or generating relationship spam.

Unknown and explicit unassigned remain distinct. No Project ordering,
account-wide enumeration, Project mutation, CPR-03 or PRD-03 implementation was
added.

writer_release:
`manager/cpr02-lifecycle-navigator-20260922 — RELEASED`

CPR-03 is READY but **NOT_STARTED**.

Per the package one-round rule, this closure does not authorize CPR-03 or
PRD-03. Draft Consumer Product v1 planning PR #48 remains separate and is not
activated by this closure.
