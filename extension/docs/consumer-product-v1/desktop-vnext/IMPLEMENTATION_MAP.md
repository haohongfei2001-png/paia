# Current-code mapping — audited main only

Baseline `368a8ca5065ef8c0ef526be85c667a8389375e95`. This is a read-based mapping, not a runtime execution certificate. Re-read actual main at implementation start. PR #99 is unmerged preserved research; no capability is inherited from it merely because a module exists there.

| Design | Verified current entrypoint / behavior | Implementation class |
|---|---|---|
| Shell | `extension/ui/app-shell-state.js`: appShellRoute/presentAppShell; route contains document/topic/source/query/sort/anchor/navigator | Restyle/coordinate existing route owner; no parallel router |
| Archive Reader, selection | `extension/ui/archive.js`: ReaderExperience, DocumentEditor from library.js; addInputToTopic/addInputMaterial flush and exact selected-substring checks | Preserve domain references, revision/selection guards; change presentation only where possible |
| Current-scope Search | `archive.js`: documentSearchState/renderDocumentSearch/runDocumentSearch/readDocumentSearchPage; SEARCH_INPUTS with documentId, mode current, pagination40 | Existing behavior; eliminate duplicate presentation, not reimplement search in DOM |
| Navigator | `archive.js` imports ArchiveNavigator and installs snapshot/restore callbacks via installReaderNavigation | Reuse actual navigator/history lifecycle; preserve unknown vs unassigned |
| Source/History | Current archive controller and DocumentEditor own info/original/history paths | Replace visual presentation with target-explicit modal; audit exact revision-owner APIs before binding Restore |
| Topic navigation | `extension/ui/thoughts.js`: open/rememberView/TopicAIViewSession, THOUGHT_POSITION and root collection snapshots | Reuse session and durable anchor owners; year view is a read projection |
| Existing Thought editor | `extension/ui/library-entry-editor.js`: PlainTextSurface/AutosaveSession/UndoJournal/RevisionSession/RecoveryDraftSession; EDIT_LIBRARY_BATCH with field/input revision and operationId | Retain trusted current mechanisms; do not expand B-01 semantics. Partial batch success must not be shown as whole-transaction success |
| AI generation | `thoughts.js`: confirmFirstGeneration/previewAIUpdate; firstGenerationCount caps an admitted batch at8 | Scope UI must expose actual batch; full-Topic appearance cannot broaden processing authorization |
| Candidate decisions | `thoughts.js`: candidateState uses aiCandidateKey; saveCandidate checks changedFields/base/key and EDIT_AI_PRESENTATION | Reuse atomic changed-field contract; choices currently in a Map/tab session. First-gen pre-adoption staging may require bounded domain work after approval |
| Context task/materials | `extension/ui/material-tray.js`: PAIA_CONTEXT_MANUAL create/read/add/addSupplement/edit/note/preview with selectionId+generation | Reshape workspace stages over existing owner; do not create new canonical Context body DB |
| Context invalidation | MaterialTray sourceEpoch/rechecking/invalidateOutput; ARCHIVE_CHANGED; MEMORY_* error family | Preserve refresh/race refusal. Blocked materials clear affected drafts; retention promise cannot override exclusion |
| Context permission | material-tray.js connections/mountPassportControls; PAIA_MEMORY_STATUS/PAIA_PASSPORT_STATUS | Keep existing manual-copy vs localOnly/externalAccess distinction; no new permission issuer or connector |
| Existing recovery/Backup | controllers imported by archive.js: session-lifecycle, recovery-draft, BackupPanel, history-completion, SmartFilterUI | Preserve supported capability; settings styling cannot remove service or change format |

Exact search/ref/output DTOs remain the domain authority; these descriptions are not substitute APIs. For each changed component, implementation must record the actual current symbol/message/test path and baseline SHA. Missing authoritative API is an integration gap, not permission to stub a success.

## Planned dependency-safe implementation batches (NOT authorized by this PR)

D1 Shell/Archive: route/controls/direct edit/search/selection/Original/History/recovery. D2 Topic: root/dense chronology/longitudinal/AddThought using approved semantics. D3 Organizer: scoped generation/first-generation review boundary/candidate decisions/stale/commit/motion. D4 Context: stage coordination/manual selections/retrieval/review/budget/stale/release. Existing core/recovery/authorization guarantees must pass for every batch before replacing its old UI owner.

Classify each change as P=presentation, I=interaction-state coordination, D=domain contract extension. Default P/I. Any new durable store, changed Source ownership, changed B-01/B-02 semantics, provider permission, automated external request or distributed task identity is D and needs separate approval. A framework migration is not part of this design request.

## Preserve production tests

This design PR changes no tests. Future implementation adds affected tests and adapts obsolete screenshot/control assertions only after proving the protected invariants still hold. Never delete a failing privacy/data-loss assertion, shrink a stress fixture, increase timeout to mask regression, or reuse historical PASS as evidence of changed code. Existing test commands and exact-main acceptance are governed by current AGENTS/VERIFICATION, not by the documentation specimen.
