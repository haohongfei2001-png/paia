from pathlib import Path
import hashlib,re,subprocess
R=Path.cwd();D=R/'extension/docs/consumer-product-v1'
base='b8a09bbfd4b57447c71f8b18bb1e528c65e0668e'
url=f'https://github.com/haohongfei2001-png/paia/blob/{base}/extension/docs/consumer-product-v1/'
def historical(name):
 raw=subprocess.check_output(['git','show',base+':extension/docs/consumer-product-v1/'+name],cwd=R)
 sha=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
 return f'Full preceding file: [{name} at {base[:8]}]({url}{name}), Git blob `{sha}`. All linked implementation receipts and older incorporated baselines remain in place. Historical failures keep their original identities and conclusions; this index does not recertify them.\n'
def put(name,text):(D/name).write_text(text.rstrip()+'\n')
put('STATUS.md',f'''# PAIA — Current execution

This is the **only current task index**. [AUTHORITY](AUTHORITY.md) selects product/authorization boundaries; the seven existing plans specify outcomes; this file selects current work. [SEVEN](SEVEN_PLAN_EXECUTION_2026-10-08.md) describes stable ownership, not another queue. Do not append candidate histories here or copy this status into MASTER/SEVEN/EXECUTION_PROTOCOL.

## Read fresh evidence before acting

Snapshot base: remote main `{base}`, product **0.43.25**, PR #262 integrated. This is source identity, not a claim of installation or full current-live certification. PR #263 is the active Settings continuation at this snapshot; read its actual head/body/checks before working. Subsequent GitHub main, PR heads, changed paths and Actions results supersede this snapshot. Open legacy PRs do not become active assignments merely because they are open.

At batch start and before integration, read remote main and the relevant active PR, confirm its exclusive files/service boundary, then follow the row below and its owning receipt. Reconstruct only changed dependencies, not every historical round. Do not reset, replace, or duplicate in-flight Settings or SYNC-01 work.

## Current seven lanes — existing owners retained

| Lane / controlling plan | Current continuation and remaining boundary | Existing owner / evidence pointer |
|---|---|---|
| TOPIC / Thought — [plan](TOPIC_ARCHITECTURE_PLAN.md) | Retain integrated identity, Section reading/writing/actions and manual promotion. Close remaining TOPIC-05.7/05.8 and applicable TOPIC-06 evidence against actual receipts; no new UI design or redo of foundations. | Existing Topic/UI owner; shared navigation/data edits through their exclusive owners. [Topic receipts](implementation/topic/) |
| CTX4 — [plan](AI_CONTEXT_CARDS_V2_PLAN.md) | Retain manual Items, Topic desired choices, internal read and dormant maintenance. Continue approved source/release visual/local closure; real connection, processing and final device evidence remain separate. The additional local Context batch mentioned in PR #263 remains with its existing owner, not part of that Settings PR. | Existing Context owner and coordinator; [Context receipts](implementation/context-cards/) |
| SET2 — [plan](SETTINGS_CONSUMER_V2_PLAN.md) | PR #262 Data destinations is integrated. Continue [PR #263](https://github.com/haohongfei2001-png/paia/pull/263) Removed detail and its actual unresolved checks, then remaining SET2-01–05 acceptance. Do not duplicate its pending-history, admission or old-ACK repairs. | Current Settings writer; [owning receipt on its branch](https://github.com/haohongfei2001-png/paia/blob/codex/settings-removed-composite-20261012/extension/docs/consumer-product-v1/implementation/settings/SET2-REMOVED-COMPOSITE-04326.md) |
| SYNC — [plan](BROWSER_NATIVE_SYNC_PLAN.md) | Continue the existing PR #250 convergence batch and mixed Canonical continuation in the exclusive shared-data branch. Integrated scoped configuration/native evidence is not full SYNC-01. Its remaining owner coverage, conflict/deletion, whole recovery, compaction and measured-profile exits stay mandatory. | Existing sole Sync/shared-data writer; [plan §§1.1, 3](BROWSER_NATIVE_SYNC_PLAN.md#3-sync-01--finite-remaining-execution-path) and [current verification receipts](implementation/verification/) |
| AI-COST — [plan](AI_USAGE_PLAN.md) | Preserve integrated local/dormant foundations and current owner-qualified work. Continue only remaining independent approved engineering; actual Qwen/service/entitlement/quality/billing activation remains separately gated. Do not restart AI-COST-01 or certify fixtures as paid service. | Existing AI owner; shared admission/commit boundary remains exclusive. [AI usage authority](AI_USAGE_ARCHITECTURE.md) |
| Prompt / NIB v4 — [plan](NARROW_INPUT_BOARD_V4_PLAN.md) | Preserve implemented S0–S4-local work and manual/Family/IME/fill-only safety; close only outstanding latest-plan gates. S3 Pro and S4-Pro require their own qualified AI-COST/service/processing evidence. No old Side Panel/wide-board/Stage3B revival. | Existing Prompt owner; shared worker/Settings/navigation owners retain their boundaries. [NIB acceptance](NARROW_INPUT_BOARD_V4_ACCEPTANCE.md) |
| Input Archive / IAH-1.1 — [plan](INPUT_ARCHIVE_HOME_PLAN.md) | Selected six-outcome local engineering is recorded closed. Maintain it while other lanes integrate; installed/current-live and applicable scale/device claims remain distinct. No new Home, permanent scope widget or alternate search. | Existing coordinator/Archive owner; [selected acceptance receipt](implementation/verification/COHERENT-04313-IAH11-PROJECT-SEARCH.md) |

## Batch and verification pointer

One batch closes a real existing-plan gap, with its necessary consuming implementation and tests. Its PR/body or owning receipt records the affected gap, exclusive owner/files, finite positive/negative exit, evidence identity and remaining blockers. Inner checkpoints do not require a new PR, full audit or repeated status rewrite.

Use [EXECUTION_PROTOCOL §§4/7/8](EXECUTION_PROTOCOL.md) and [VERIFICATION](VERIFICATION.md): affected inner-loop checks; light ordinary integration; full applicable safety/high-risk/stage certification. Run the existing admission preflight before expensive suites. A failed, skipped, cancelled or unavailable result is never PASS. Source, candidate, tested merge, main, package, installed and current-live evidence remain distinct.

Shared data/schema/transaction/deletion/permission/restore owners stay single-writer. Independent files may proceed under existing assignments; a blocked shared edit does not stop an unrelated lane. Current external/owner gates remain in [DEFERRED_FINAL_GATES](DEFERRED_FINAL_GATES.md) and domain receipts. No paid/account/credential/permission/real-user transfer/deployment/irreversible action is implied.

## Evidence history

{historical('STATUS.md')}
''')
old=subprocess.check_output(['git','show',base+':extension/docs/consumer-product-v1/MASTER_PLAN.md'],cwd=R).decode()
retained=old[old.index('## 1. Preserved baseline and current sequencing'):old.index('## 5. Historical adoption-only task evidence')]
retained=re.sub(r'Initial source review was main .*?\n\n','Historical adoption source identities and their exact evidence remain in the preceding file linked below; they are not current execution pointers.\n\n',retained,flags=re.S)
put('MASTER_PLAN.md',f'''# PAIA Consumer Product v1 — Canonical Master Plan

Product scope, dependencies and acceptance remain here and in the seven original plans. **Only [STATUS](STATUS.md) maintains current assignments and task pointers.** Do not copy candidate, CI or merge logs into this file. Read live GitHub facts through the current task's PR/receipt.

NIB v4 is the latest adopted Prompt follow-up under [AUTHORITY](AUTHORITY.md#latest-runtime-authorization--2026-10-11). Its existing [S0–S4 plan](NARROW_INPUT_BOARD_V4_PLAN.md) and [acceptance](NARROW_INPUT_BOARD_V4_ACCEPTANCE.md) remain: local S0 → S1 → S2 → S4-local; Pro S3 consumes the qualified AI-COST/service boundaries and needs S4-Pro before exposure. Preserve exact manual intent, original query/insertion owners and every replacement gate. Historical documentation-only wording does not override the later scoped authorization.

## Delivery interpretation — no new backlog or reduced goal

Local Chrome's approved Archive, manual Thought/Context, Settings and local/free NIB can reach their applicable usable-product gates without waiting for cross-browser cloud or paid AI. Actual installation, current supported-site, recovery, privacy and affected safety evidence are still required for those claims.

Chrome Sync and actual AI capabilities become available only as their existing plans' engineering, service, account, consent, cost and quality gates close. Complete cross-browser and later capabilities remain mandatory under the unchanged plans; an earlier local delivery is not whole-product completion. No new milestone IDs or additional execution queue are introduced.

{retained.rstrip()}

## Historical evidence

{historical('MASTER_PLAN.md')}
''')
put('SEVEN_PLAN_EXECUTION_2026-10-08.md',f'''# PAIA — Seven-lane coordination

This existing coordination document records **stable dependencies and ownership only**. [STATUS](STATUS.md) is the sole current task index; actual main/PR/Actions are read fresh. No candidate logs, old Agent names, quota observations or duplicate current-phase tables are maintained here. Seven original product lanes and all their approved outcomes remain.

## Dependency and owner boundaries

| Existing lane | Required dependency / exclusive boundary | Independent work that does not wait for whole other lanes |
|---|---|---|
| [TOPIC / Thought](TOPIC_ARCHITECTURE_PLAN.md) | Stable identity, human field/edge intent and original body/Section/Placement owners; shared route edits go through the route owner. | Local reading/writing/visual work does not wait for all paid filtering or cloud transports. AI reading consumes its actual AI-COST-05 output contract. |
| [CTX4](AI_CONTEXT_CARDS_V2_PLAN.md) | Item/protection, actual Topic identity, trusted scope/read owners; shared Context/Sync mutations retain one writer. | Manual/local work, automatic maintenance and real connection use their respective prerequisites; CTX4-05 and 06 do not impose an artificial mutual sequence. |
| [SET2](SETTINGS_CONSUMER_V2_PLAN.md) | Each actual preference/recovery/Context/Prompt owner and acknowledged outcome. The current Settings writer keeps its in-flight files. | Data destinations, unavailable/off states and position reset do not wait for complete Thought visuals, paid models or real cloud activation. No fake connected/success state. |
| [SYNC](BROWSER_NATIVE_SYNC_PLAN.md) | One existing shared-data writer; canonical/outbox, identity, conflicts, deletion, staged activation/rollback and complete restore remain safety dependencies. | PR #250 finite SYNC-01 recovery uses fake transport, not real account/paid/visual prerequisites. SYNC-02–06 retain their provider/platform gates. |
| [AI-COST](AI_USAGE_PLAN.md) | 01 → 02; 03 → 04; 05 and 06 consume 02 plus their actual domain owners. Shared admission and commit owners stay exclusive. | Independent cache/style/Assist engineering need not wait for all filtering; real service/financial/quality acceptance is never inferred from fixtures. |
| [Prompt / NIB v4](NARROW_INPUT_BOARD_V4_PLAN.md) | S0 → S1 → S2 → S4-local, original Archive query and one insertion coordinator. Shared worker/Settings edits are integrated by their owners. | S4-local does not wait for live S3; all Free/manual/IME/draft/position/reuse obligations remain. S3 requires qualified dependencies and S4-Pro before exposure. |
| [IAH-1.1](INPUT_ARCHIVE_HOME_PLAN.md) | Existing Source/Working/search/navigation/edit-save owners; preserve completed selected minimal outcomes. | Ordinary local search/Find/Back does not wait for Sync or AI-COST. No new Home, alternate query/store or external Archive fallback. |

## Existing team, smaller handoffs

Keep the current coordinator, Settings, Sync, Topic, Context, Prompt and AI assignments. This document assigns no replacement developer and starts no parallel implementation. Each shared data/schema/worker/permission/restore boundary has one active writer. Isolated UI and dedicated tests remain with their existing owners; semantic overlap still requires coordination even when filenames differ.

The coordinator selects an existing-plan gap, resolves shared-boundary dependencies and reviews/integrates a coherent result. The implementer keeps context through ordinary internal corrections. Do not require a new branch/PR, full context reconstruction, whole-product review or copied STATUS for each substep. A necessary shared-file change is a bounded handoff to its current owner, not a second owner.

Before integration, re-read main and active changed paths; preserve intervening work. Absorb compatible main changes and validate. If shared files conflict with an active batch, retain the independent PR for safe integration; never force-overwrite, restart that batch, or make it wait for unrelated optimization.

## Convergence and evidence

Apply the existing [EXECUTION_PROTOCOL](EXECUTION_PROTOCOL.md), [VERIFICATION](VERIFICATION.md) and [Sync §§3.3–3.4](BROWSER_NATIVE_SYNC_PLAN.md#33-test--review--ci-cost-and-risk-based-cadence). One owning PR/receipt records the actual capability gap, consumer, finite exit, unchanged/changed evidence dependencies and remaining blockers. Preparatory helpers do not become a substitute delivery goal.

Current browser admission is maintained once in `../../scripts/current-browser-manifest.json`. Disk discovery, frozen historical coverage and partition completeness independently verify it before costly certification. Frozen route fixtures/guards preserve historical evidence; do not edit them or add future-file exclusions when admitting a new test. Product assertions, negative cases, complete source/release and required continuous recovery chains remain mandatory.

An external or owner gate blocks only dependent behavior. Continue independent authorized work without claiming blocked evidence passed. No capture/Source history rewrite, human-work loss, permission widening, false durable acknowledgement or resurrection is acceptable. Paid models, cloud accounts/credentials, real-user transfers, formal release and irreversible actions still need their existing explicit authority.

## History

{historical('SEVEN_PLAN_EXECUTION_2026-10-08.md')}
''')
