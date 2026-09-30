# State matrix and transition ownership

N=normal, E=empty, L=loading, D=dirty/composing, P=pending commit, S=acknowledged saved, F=failure, U=unknown acknowledgement, X=stale/conflict, Q=partial, O=offline/degraded. `-` means not applicable, not untested PASS.

| Family | N | E | L | D | P | S | F | U | X | Q | O | Narrow/keyboard/reduced motion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Archive/Topic collection | rows | safe capture/write entry | keep prior rows | - | - | - | tail retry | - | invalidate cursor, preserve anchor | explicit coverage | local available | required |
| Archive editable body | current | genuine empty body | preserve old usable text | pin session | no Saved | receipt only | retain full draft | verify op receipt | compare local/persisted | batch-specific saved extent | local save if storage usable | required |
| Original/History | immutable/selected version | unavailable != empty original | no stale private flash | - | restore only | new revision receipt | retain current | read operation | fresh base required | sequence coverage | local available | required |
| Add Thought / AI human editor | draft/current | no false save | scoped | pin session | single attempt | receipt only | retain draft | verify identity | explicit reconciliation | - | no AI dependency for writing | required |
| AI generation | original available | no eligible material | actual request | original may change | - | result is Candidate, not Saved | last valid current intact | job status, no paid retry | candidate invalidated | actual batch disclosure | original readable | required |
| Candidate decisions | unchosen/decided | no-change result | source check | choices local | one CAS request | receipt only | choices preserved | verify operation | disable commit | all changed fields required | inspect cached safe content | required |
| Context selection/retrieval | explicit/suggested distinct | keep explicit selection | retain selection | selection changes | local selection owner | no external-send claim | retain safe in-tab work | reconcile local action | refresh coverage/policy | cannot call complete | lexical/local retained | required |
| Context review/ready | exact reviewed output | no releasable material | final validation | output-only draft | effect pending | copy/file ack accurately | no success toast | state uncertainty | disable release | chosen split/disclosure | local Copy may remain under policy | required |
| Settings/destructive/recovery | current settings | only actual recovery | impact preflight | unsaved preference draft | avoid double command | ack/rollback | old library retained | reconcile transaction | preflight invalidated | explicit affected scope | safe local operations only | required |

## Editor machine

clean → composing → dirty → saving → saved. Composition end produces a complete edit; it is never forged by blur or closing a dialog. On failure: failed(local draft intact) → explicit retry(same logical operation where supported) → saved/failed/unknown. On stale base: conflicted(local+persisted kept separate) → user compare/reconcile → fresh precondition → saving. Do not silently accept last-write-wins. Undo must preserve existing native/custom journal boundaries. A new Save request cannot reuse an operation ID for different text.

A transport failure does not prove a write failed. Unknown acknowledgement → read authoritative receipt/current revision → either mark known saved, recover known-not-committed using the same idempotent attempt, or keep uncertainty. Never duplicate an independent Thought due to a blind retry.

Navigation flushes only after composition is safely complete. When safe approved recovery cannot retain the full draft, block the destructive leave and offer Copy/Stay/explicit discard. Do not promise survival after browser termination if the recovery write itself failed. A paused model/provider does not disable unrelated local writing.

## Candidate machine

none → scope-confirmed → request-pending → candidate-valid → partially-decided → fully-decided → committing → committed. No-change is a terminal read outcome with Current intact. Schema/identity/semantic-invalid paths go to failed or unaccepted, not adopted. Underlying change anywhere before commit → stale; old selected decisions have explanatory value only. Cancel request and leave-view are separate. If the current service commits first-generation output immediately, that path does not satisfy this contract; map it as a bounded integration change, not a UI workaround.

## Context machine

purpose-draft → selected(snapshot intent) → supplemented(optional) → compiled → reviewing → reviewed(binding) → ready → validating → copied/export-started. All effects remain manual. Edit/task/scope/ref changes send reviewed/ready to unreviewed or stale. Current denial/revoke/purge sends affected material to blocked and clears its forbidden release derivatives; unrelated safe user edits remain. Review changed material or explicitly remove it, rebuild the affected output, and acknowledge the new complete binding before Ready.

There is no distributed atomic transaction between a local revision check and another app consuming clipboard content. Associate each release with the exact reviewed snapshot; suppress a detected stale result before clipboard/file effect, and report later changes without claiming to recall a prior copy.

## Shared UI transitions

Loading indicators appear only after 150ms; no timer invents completion. Status is localized near the owner; one polite live announcement per meaningful phase. A severe data-risk message uses an alert and action, not red color alone. Scope switching keeps previous usable content until the new response is admitted, without showing it as the newly selected object. Failure retry is scoped to failed operation, never a whole-library reset.

Menupopover → closed → modal; never two modal focus traps. Escape closes transient UI first; editing Escape does not discard text. Closing a readonly modal returns focus to the exact invoker and reader anchor. Dirty modal Escape invokes the same leave guard as the Close button.
