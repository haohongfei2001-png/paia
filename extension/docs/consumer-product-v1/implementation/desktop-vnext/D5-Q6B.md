# D5/Q6b — approved T05 workspace and safe origin return

State: IMPLEMENTING / NOT ACCEPTED. Base is verified main `f11675ce73cd7a023889e7a1673f4837283cedc1`, tree `1485e28a4973d629d2e5ccaeabe586a924ed560c`. [Q6a](D5-Q6.md) closes command-acknowledgement ownership; this slice retains those semantics while moving only compose presentation into the canonical main workspace.

## Existing owners and scope

Use AppShell/RouteHistory for one internal compose route mapped to the Thought primary space. TopicActions alone owns the draft, quote, optional relation/Topic choices, attempts and acknowledgements. Route/history state contains only validated object/session references. Save/Cancel/Back request a transition; the navigation leave phase guards and tears down the owner without recursively requesting another return. Expired Forward/reload references cannot recreate or resubmit drafts.

The approved architecture permits safe flush/leave, fresh reads, remount and logical anchor/focus restoration. Do not add a hidden-reader parking subsystem. Preserve live bodies on rejected dirty/IME/failed leave. Native browser undo across intentional remount is distinct from the existing application undo/history owners.

## Demonstrated origin defects and preparation

The existing Topic leave path admits an uncollected composing editor when dirty() is false and then disposes it. It can also dispose a replacement editor or an earlier owner that becomes dirty across asynchronous flush boundaries. Preparation now checks all current owners, then rechecks identity/composition/dirty/saving immediately before any disposal.

Global leave previously failed to capture the complete root session, and reopening could overwrite it using another page’s scroll. Capture existing body-free scope/query/extent/anchor only while the Thought page is active. Guard held Topic/root/unplaced/section reads, queued anchor restoration, Years locale reads, initial/background position reads, and view/sort/section transitions by active page plus the existing leave/render/presentation ownership. Obsolete reads cannot publish into or move the destination.

Existing savedEdit Undo admits off-window rows without comparing cached field versions. Preparation adds the same absent-row expected-version, lifecycle and source-purge admission used by the existing non-saved branch. The core transactional revision/entity/source/CAS/shared-Input checks remain unchanged. Reuse LibraryEntryEditor export/import under one controller-owned, five-owner transient history cache only after accepted global leave. Source purge, backup restore, removal and revision pruning invalidate cached/queued/current journals; an epoch prevents an in-flight export/import from reviving cleared history. Successful CONTINUE_THINKING is not a blanket invalidator. Before/after history strings stay out of RouteHistory and ViewSessions.

## Reader return metadata and fresh authority

ReaderWindowSessions retains at most five owners within a global2MiB metadata budget. It validates dense arrays, complete cursor spines, one/two mounted descriptors, actual page-local context refs, next cursors and logical anchor/focus refs. Oversized or evicted snapshots lose the whole extent and require a truthful fresh anchored fallback; they are never silently sliced. Tests cover101/1001 cursor entries and malformed/sparse/body-bearing metadata.

GET_PAGE exposes the body-free effective cursor passed to queryPage, including Smart Filter contextual seek. readReaderWindow reads at most the saved one/two descriptors and publishes nothing until both succeed on one fresh data generation and current attempt. It uses only fresh records/blocks, limits history tracking, and never displays excluded/branch or history-only rows. Context filtering stays local to the request that produced that page; an excluded/purged context cannot revive filtered material. An effective null contextual cursor may be freshly repositioned by the existing core; changed boundaries must use explicit fallback rather than claiming exact replay.

Exact comparison applies only to the mounted windows: ordered visible IDs plus effective/next cursors must match. On overlap or changed boundaries, choose one complete fresh page containing the surviving anchor or a deterministic nearby page, align its cursor/filter metadata, and announce changed-range restoration. No third automatic read. Older unmounted cursor entries remain navigation hints; forward continuation must use fresh nextCursor, and backward hints must verify adjacency. Fresh text/revision updates never restore cached bodies.

The local candidate now wires these descriptors through the existing Archive navigation/refresh owner, freezes/invalidate paging during leave, suppresses return prefetch, restores grapheme-clamped caret/focus against fresh text, and offers an explicit retry if a two-page return fails. Keep the existing DocumentEditor history export/import and its revision/signature checks. A return failure must leave a readable retry state rather than publish half a mixed-generation window.

## T05 and verification obligations

Implement frozen T05 heading/subtitle,760px prose workspace/gutters, optional Topic selection, literal textarea and Save/Cancel hierarchy. Retain real lazy Topic search/create/retry, Copy, explicit conditional relation and truthful status. No fabricated specimen dropdown or new design.

Local preparation and review regressions pass, including the actual deferred Undo owner, refusal of a clickable success-notice transition, Reader thaw across data invalidation, and normal conversation-removal admission. A preliminary complete local run was1703PASS/6FAIL: two exact CI dependency guards needed the added candidate job, three existing paging fixtures lacked the new navigation/descriptor fields, and the unchanged10k history-performance fixture again exceeded its bound. The five integration-fixture failures are corrected without weakening their oracles; all105 affected correction cases pass. This preliminary run spanned active review edits and is not exact-tree certification. Privacy58 and static package/development guards pass. Local adapter browser setup failed before its hook; native/browser and complete exact-head acceptance remain hosted gates.

Remaining native source/release proof: deep Archive two-page/query/sort/expanded/body/undo return; deep Thought root/Content/Years scope/extent/anchor return; standalone fresh reopen/undo; rejected dirty/IME/failed leave; held reads and late acknowledgements; Back/Forward/Escape/sidebar, repeated routes and expired sessions; changed/removed/purged origins; exact optional Topic/relation semantics; actual T05 paired pixels at the approved widths/themes,200% text, coarse pointer, keyboard and reduced motion. Run existing complete regressions, independent source/pixel review, full certification and exact-main checks before adoption. Physical devices/IME and final owner visual acceptance remain separate gates. Public consumer release stays held.


## Finite visual-scope boundary

D5 is visual/interaction convergence, as defined by [D5 Visual Convergence §1–2](../../design/foundation/desktop-vnext/D5_VISUAL_CONVERGENCE.md). This batch ends when the existing write Thought → save → return to the same origin → continue editing flow passes actual source/release, paired T05 review and required full/exact-main gates. It adds no business operation or durable data owner.

| Local change | Approved T05 compatibility requirement |
| --- | --- |
| Compose HTML/CSS and AppShell route | Reproduce the frozen main-workspace composer while keeping the existing TopicActions draft/command owner |
| Reader window refs, fresh reads, focus and retry | Replacing a modal with a route must preserve the origin's range, query, sort, current text and usable return; no body in route metadata |
| Topic inactive-read and leave fences | A departed origin cannot remount or scroll/focus over the composer |
| Existing transient Undo export/import and pending-history guard | Intentional safe remount must not drop the existing application Undo or let its old callback overwrite the returned owner |
| Clickable success-notice navigation guard | The new nonmodal presentation must honor a refused or superseded departure |
| Existing native selector migrations, additive8-case browser file and CI guards | Retain old operation assertions and prove the changed route; no skipped old files, timeout increase or reduced aggregate |

Review caught one accidental undefined guard in existing conversation removal. The exact original guard is restored; a retained failing actual-function regression and15 passing owning removal cases distinguish the repair from a new removal feature. Review also retained concrete late-Undo and data-epoch/thaw counterexamples. The local corrections are not browser acceptance.

All68 existing full-browser files retain their exact six-job placement. [Q6b full mapping](D5-Q6B-FULL-MATRIX.json) adds only the complete new source/release file to existing shard6. Its prior577s leaves503s under the unchanged18-minute job cap; actual fit must pass rather than be assumed. The separate12-minute candidate job requires8/8 native cases,8 exact-head final receipts and20 paired comparison rows. Old23-case compose candidate and its20 outcome receipts remain required separately.

After this batch, known remaining visual groups are Topic header/actions/year navigation, Organize representative states, Context representative states, and Settings/recovery/import representative states. The finite D5 exit remains the canonical family/state comparison and retirement ledger plus the exact-candidate review set and explicit owner visual acceptance in D5 §8. Unrelated historical behavior repairs, including the unproven all-empty reload caret case, stay in their separate backlog/evidence class and do not expand this T05 batch.

## First hosted candidate and bounded corrections

[PR132](https://github.com/haohongfei2001-png/paia/pull/132) head `671dfb2373a2604c2fecf3487602b21586d9b854`, tree `d647ec4b66af76e1f78e4d15092e8956714c1405`, ran [Candidate37152565331](https://github.com/haohongfei2001-png/paia/actions/runs/37152565331). All1722 hosted unit cases,102 adapter/58 privacy and release pass. Existing selected browser cases report21/23PASS; new workspace/return cases report3/8PASS. The candidate remains FAIL and full certification was not started.

Artifact11284756268 SHA256 `1b32a77ff3b9f8ad91ab9a876b1d5c8b88768f84f3986c3e4f56bbf43f68fe9a` retains all20 passing fixed production/reference comparisons and actual light/dark/narrow/200%/coarse frames. Source Reader Save→return→Undo passes, as do both source/release held paging, failed-return retry and purge paths. Later workspace navigation, release Reader focus and both Topic return cases fail. Artifact11285016183 SHA256 `05d2b2fa68b99f109b9b46c256b7fd89308819dc80931225b81ddc62677917ef` retains the existing outcome journeys; the two failures expose `Cannot set properties of null (setting 'frozen')` after refusing the new clickable View transition.

The correction adds the missing null guard to rejected leave's Reader-thaw cleanup. An actual-function regression preserves both absent/current-stream refusal. A separate actual-owner reproduction proves self-Undo refresh can replace its journal arrays before the held response completes, losing Redo. Defer valid rows through the existing RevisionSession during that operation; drain only into the same undisposed journal owners. Purged/inactive authority is not deferred solely because Undo is pending, and replaced journals discard queued rows. Regressions retain actual Undo→Redo, clear, disposal, composition and purge protections. This is a demonstrated owner race; the first native artifact has no stage/stack and cannot establish which Topic wait hit it.

The exact release Reader focus assertion now waits for the existing workspace ready state, because mounting current rows precedes awaited recovery/focus restoration. No focus expectation, timeout, pixel tolerance, test selector or case is removed. Bounded synthetic stage/stack/history/focus/RPC diagnostics are added to establish the remaining native failures; they delegate production methods unchanged. Fresh candidate source/release and eventual full certification remain mandatory.

## Second native result: toolbar admission during origin restoration

[Candidate37153668542](https://github.com/haohongfei2001-png/paia/actions/runs/37153668542), head `3a447433b16365f1e31943967794765f88c23ac5` / tree `8ac13af2445f83f82fbc253a3126a3eb8d14734a`, passes6/8 new native cases. Both builds now pass complete workspace/Back/Forward/reload, Reader Save→return→Undo, and interrupted/purge return. The two Topic cases still fail. Artifact11284559119 SHA256 `6d02567aa3ffba8edff2ae4b5b3224f2e5b12c7b6b124b7550fbf04f735558c2` retains exact stage/stack and event ordering.

Both failures occur at `Topic Undo request`, waiting for the first actual history RPC. The toolbar received the click419–440ms before the returned editor imported its retained Undo group. No history method or RPC ran; the later installed editor still has1Undo/0Redo. Thus this native failure is an ownerless toolbar remaining interactive during return, distinct from the independently reproduced self-refresh race.

Extend the existing successful-leave inert boundary from Topic body/heading to the Topic toolbar. Re-enable that same toolbar only when the current read succeeds, alongside body/heading. Rejected leave remains untouched; obsolete/failed reads cannot enable it. The native click and every existing Undo/Redo assertion remain unchanged. Three current/obsolete/failed read regressions plus the existing owning Content/Years suite pass103 cases. Fresh hosted verification is required before adoption.

## Third native result: returned origin capture and bounded read diagnosis

[Candidate37154432277](https://github.com/haohongfei2001-png/paia/actions/runs/37154432277), head `6940af7cab7a0d7ab9d96c819b7c906ffaad7364` / tree `37f6427748e27228d981886cf3a91a310927bc8e`, passes1732 unit, all23 existing creation/ownership cases, contracts/privacy and release. The new file remains FAIL at5/8. Artifact11284819464 SHA256 `578dc5b8761ac93727c04980403d9700672f83faf6c841ba340df580ce15f01b` retains the failures and20 passing paired rows.

The toolbar fix now reaches the actual held Undo operation in both builds. The subsequent compose attempt is refused with the same Topic route and pending history owner, but the expected deep body is absent. Actual `TopicController.open` → `leave` → `rememberRoute` reproduction shows a second origin capture: global navigation already saved the deep Topic/root position, then presents the returned Thought page before `open` runs. Its default leave reads retained DOM at the composer's top-of-page scroll and overwrites the saved anchor. Global navigation now passes `rememberCurrent:false` for this already-captured origin; ordinary internal Topic/root navigation retains default capture, and all leave guards still run. The native journey additionally verifies the exact body after the current workspace reports ready, preserving the original pointer/Undo/refusal assertions.

Release Reader also reports3 intercepted reads where the unchanged return assertion requires2. Its exact mounted pages and focus checks pass first. The retained receipt does not include those request descriptors, so it cannot establish whether the extra call was paging or a competing archive refresh. A separate production-owner reproduction proves a `CONTINUE_THINKING` notification can supersede the first return read and produce the cursor sequence first/first/second without any paging callback; that is a possible race, not attribution of this native failure. Add only bounded GET_PAGE caller/request/result, archive-change cause and failure-time read/visible-row diagnostics. No Reader runtime heuristic, read-count tolerance or assertion reduction is included; fresh hosted evidence and classification remain required before adoption.
