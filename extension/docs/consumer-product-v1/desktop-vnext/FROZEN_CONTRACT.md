# Frozen interaction and data contract

The following F-rules derive from the owner's final freeze. Completion details are separately identified in GAP_AUDIT. These are target UX rules, not claims about shipped code.

## F-01 Shell and navigation

Only Input Archive, Thought Library, AI Context are primary spaces. Settings is low-frequency. Archive Reader uses primary rail + Project/Conversation navigator + workspace. Roots and Context do not reserve an empty navigator. No fourth column, permanent or semi-permanent Inspector, Home, Inbox, Share, global Projects or knowledge-relationship dashboard.

Project is source organization, Topic is thought organization. Provider groups contain their own Projects and confirmed-unassigned conversations. Unknown membership is not unassigned; detached local organization is not upstream deletion. A quiet `来源变化` entry exposes these distinct states; it must not combine them into a fictitious folder or delete data. Source movement/rename does not change Conversation identity. Historical PAIA content survives upstream deletion.

Back restores selected object, expanded groups, independent query/sort, loaded extent, stable entry anchor and focus. New captures never move an active reader, selection or editor. A contextual `有新内容` action applies the update explicitly. Empty roots explain the next safe action; never invent data or unread debt.

## F-02 Search

Exactly one content search for a searchable surface; no content search in Settings or purpose entry. Root searches its visible scope. Reader searches its selected Conversation; Topic searches that Topic; material selection searches its explicitly displayed eligible scope. A transient search sheet replaces the trigger, not adds a second search.

On Reader entry: label `搜索此会话`; on return: `搜索输入档案`. Topic label `搜索此主题`. Search all eligible content, including unmounted/collapsed rows, not only browser DOM. Indexing/partial results are not an empty complete answer. Stale responses must not replace a newer query or route. Preserve the pre-search anchor on close. Previous/next match and result count appear only with an active query. Preserve current editor before searching; unfinished IME or failed save must not be discarded.

## F-03 Reader

Only user-sent working expression is the normal body, not assistant replies. Plain chronological document with quiet actual expression dates/times, whitespace and natural headings. No per-message cards, timeline line/dots or appended composer. The ordered Input boundaries remain internally distinct even when the document reads continuously. Direct editing changes Working Input, never original Source. There is one order toggle: `↑ 最早在前` / `↓ 最新在前`, no duplicate dropdown.

Selection exposes Copy / Add to Topic / Add to Context / More. The same actions are keyboard reachable. Copy takes precisely selected readable text. Mutation/reuse first flushes the editable owner and revalidates the exact selected text and reference revision. Unicode surrogate/grapheme boundaries must remain valid. For a selection spanning multiple Input owners, Copy remains available; Add actions require explicitly choosing individual items in selection mode rather than silently treating them as one Source. Do not normalize whitespace, clip long text or copy hidden metadata.

Focusing an editable body permits typing without a permanent Edit button. No per-keystroke success noise. Saved means acknowledged durable commit, not keystroke or request start. Drafts remain visible on failure/conflict; leave guards protect work. Native editing/undo and explicit History remain distinct.

## F-04 Original and History

Reader overflow: 查看原始内容 / 查看修改历史 / 导出… / 从档案中移除. No separate permanent Source/Info/History control. No technical IDs, hashes, model, tokens or captured-time panel.

From the Conversation header, Original shows that Conversation's immutable Input sequence, with local position navigation for long content. From a selected Input's More menu it shows only that Input. The title identifies the target. Source is read-only, original send time is shown when known; otherwise `发送时间未知`. Capture time is not substituted. Provider appears only if needed to distinguish scope. Actions: 复制原文 / 关闭. Purged/unavailable source has no recoverable hidden body.

History targets the corresponding existing revision owner; when the backend has only per-Input histories, the modal first offers an Input selector with a short excerpt. Never fabricate a Conversation-wide atomic revision history. Selecting a version previews it; comparison is explicit. Restore, where admitted, writes a new current version with fresh preconditions, preserves later history, and never restores purged Source. Cancel returns to the same anchor/focus. Two modals cannot coexist.

## F-05 Thought Library

Topic root is compact editorial scanning, not cards/dashboard. Show Topic name, an exact attributed excerpt or human-authored cue, quiet time span; no machine-made psychological summary by default. Recent change is factual material change, not an inferred change in belief. No root-wide AI Organize.

Topic defaults to user expression. `内容` is the complete eligible chronological view; `这些年` is a bounded temporal overview with explicitly disclosed sampling/coverage and `查看这一年的全部表达`. These are navigation views, not separate body stores. Do not infer a turning point from an empty year or a later date. Unknown-time evidence has its own section. Quotation/third-party speech must not become the user's belief.

Use year headings and compact jump links rather than a timeline diagram. Uneven years remain uneven. Display `没有已收录记录` only for a known empty year within the observed interval, not `这一年你没有想过`. Dense previews state shown/remaining extent. Search expands the exact matched year/input and returns to the prior expansion state when closed.

Add Thought creates independent human expression with current creation time and optional Topic. It is not an Input appended to a captured Conversation. Existing/old Thought edit semantics remain B-01-gated: preserve supported safe operations, but do not create new old-Thought mutation or reverse-Archive editing policies. Saved AI presentation edits remain protected human work.

## F-06 AI Organize

Original → scope review → authorized request → candidate → compare → choose Adopt/Keep → one commit. Existing saved presentation can be opened immediately; viewing is not permission to regenerate. Generation operates inside one Topic, showing actual eligible scope, excluded/unavailable coverage and the actual processing provider before an external request. Do not call an eight-material batch a complete 160-material organization.

Running never changes Current or locks local originals. No speculative semantic animation before validated output; no fake percentage or automatic paid retry. Leaving the page does not imply cancellation or success; reconcile with the actual job owner. Explicit cancellation may not undo an already sent external request.

Compare asks `这还是你的意思吗？`. Distinguish unchanged human evidence, structure-only changes and `AI 新写 · 不是用户原话`. Preserve uncertainty, negation, authorship, conditionals, causality, emotion and chronology. A materially distorted candidate is an acceptance failure, not made correct by having a Keep button.

Decisions target canonical changed fields. All changed fields require an explicit decision; unchosen is not auto-adopt or auto-keep. Progress text and next-undecided navigation appear only when useful. One CAS commit applies accepted fields; no partial page-save. First generation uses the same explicit review intent; if current service cannot stage it, integration must add that boundary after restart approval, not simulate it with UI-only storage.

Choices are local to the candidate identity and tab. A new candidate or base change invalidates commit. Show prior choices as nonbinding context, do not replay them onto different content. Unknown commit acknowledgement requires readback of the existing operation before retry. No new content database is introduced to persist review choices.

## F-07 AI Context

Purpose → Materials → Supplements → Review → Ready. Preserve an incoming explicit selection even before a purpose is typed. No Context library/dashboard, mandatory Profile creation, automatic AI call or external connector in this scope. Reading permission does not imply write permission.

User-selected materials outrank relevance ranking, **not** denial, revocation, purge, eligibility or safety bounds. Mark origin as `你选择的材料` versus `PAIA 找到的补充`; proposed supplements require explicit inclusion. Whole-Topic/Conversation intent covers the entire intended snapshot, not only visible rows; unavailable enumeration/partial coverage must be disclosed before confirmation.

Review shows exactly the text to be copied/exported, with role and chronology intact. Edits/redactions affect this output only. Denied material is neither previewed nor recoverable by changing to Copy. Local-only blocks automated cloud/connector processing but does not itself forbid user-initiated Copy/Export under the existing manual policy.

Any relevant source revision, exclusion, selection, task or output edit invalidates the previous release binding. Stale pauses Copy/Export and requires review. Preserve manually written output where allowed, but purge/denial fences override draft retention for affected derived content. Never promise every draft survives a tab close when the current service is tab-local.

Hard limits refuse; advisory budgets warn. Do not silently truncate, summarize explicit selections or drop the tail of a long quote. User may remove optional supplements, explicitly deselect material or split into named complete packages. Final readiness requires exact selected-set coverage or an explicitly reviewed partial choice.

Ready: `已准备好` and `尚未发送`. Only 复制 / 导出. Before either effect, domain owner revalidates current references/authorization/output fingerprint. Copy acknowledgement means copied to clipboard, not sent to an AI. Export means file preparation/download initiation as actually observed, not proof the file was saved. Revocation cannot recall previously copied/exported copies. No automatic repeat on uncertain acknowledgement.

## F-08 Removed controls do not remove capabilities

Moving Source/filter/history/permissions out of the Reader does not authorize deleting metadata, revisions, grants, Smart Filter, Backup, capture recovery or existing test guarantees. Settings retains current safe content/capture, reading/appearance, AI processing, privacy, data/recovery and About/advanced responsibilities. Existing human Prompt reuse scope is not erased; its unmerged PR #99 implementation is not activated here.

## F-09 Existing preference migration

The final owner freeze chooses the compact editorial Topic root, replacing prior grid/card alternatives. Migrate only the deprecated display preference to compact while preserving all Topic/content/order/anchor data. Record this deliberate visual preference replacement in the implementation receipt; do not delete preferences or data wholesale. Dark mode and reader-size choices are not superseded.
