# Surface contracts

Each row is a normative target. Shared error and leave behavior comes from STATE_MATRIX. Every listed screen is reachable independently from the documentation screen index. Specimens illustrate state/layout, not production behavior.

| ID / screen | Entry and normal structure | Actions and exit | Critical non-happy path / data owner |
|---|---|---|---|
| A01 archive-root | Primary Archive; collapsed provider/Project groups plus confirmed-unassigned | One scope search; open Conversation; overflow Import/Export | Partial index != no matches; never infer membership; navigator query owner |
| A02 reader | Open selected Conversation; original navigator moves left; readable Working Input | One current search, order toggle, overflow; Back restores root | New arrivals wait for user; DocumentEditor owns drafts, not route |
| A03 selection | Noncollapsed selection inside one body; toolbar adjacent and viewport-clamped | Copy / 加入主题 / 用于本次 AI / More; Escape dismisses visual toolbar | Flush then exact substring+revision check; no cross-Input flattening |
| A04 editing | Focus existing Working body; caret without separate editor mode | Native typing/undo; local save status; safe Back | Composing cannot persist partial IME; pin dirty DOM during paging |
| A05 save-failure | Confirmed write failure after edit | 保留页面 / 重试保存 / 复制未保存文字 | Full local draft remains; no Saved until receipt; separate uncertain ack |
| A06 overflow | Header More or selected-Input More; explicit target retained | Original / History / Export / Remove; Escape returns trigger | Menu closes before modal; no permanent purge in first-level menu |
| A07 original | Overflow with Conversation or explicit Input target | Read-only sequence, copy complete original, Close | Purged/unavailable body absent; known send time only; no restore here |
| A08 history | Overflow; selected revision-owner target | Version preview; compare; confirm restore as new revision | Source is not revision1 by invention; unavailable/changed base blocks restore |
| A09 reader-search | Current-search trigger or Cmd/Ctrl+F outside native editable context | Search, result position, next/previous, close to pre-search anchor | Full indexed domain not DOM; pending save, partial coverage, stale result |
| A10 source-changes | Quiet navigator footer | Choose known-deleted/unknown/detached view; return | Distinct groups; no upstream deletion cascade into PAIA |
| A11 remove | Explicit target from overflow | Explain local removal; Remove; Undo only if actually supported | Fresh target and safe drafts; no purge implicitly; reimport obeys tombstone |
| A12 purge-blocked | Settings Data controls, not Reader first menu | Preview consequence; blocked mixed derivatives; return safely | B-02 unresolved; no fake confirm action or destruction in specimen |
| T01 topics-root | Primary Thought Library; compact editorial rows, no empty middle column | One Topic search; open Topic; write independent Thought | Exact quotes/cues; empty library does not require AI to begin |
| T02 topic-original | Topic open; title, tabs 内容/这些年, 写下想法, AI整理 | Read originals; Topic search; Back restores root | B-01 does not become new direct-old-body editing permission |
| T03 topic-dense | Same Topic with uneven years and 160 entries | Year anchors; reveal next batch/accessible Load more; restore reading | 159 dated+1 unknown; 2022 known-empty; no hidden AI importance pruning |
| T04 longitudinal | User selects 这些年 | Temporal excerpts with shown/total labels; read full year; return to 内容 | Deterministic disclosed preview unless approved semantic owner; no fabricated turning points |
| T05 add-thought | 写下想法 in Topic or root; optional destination | Plain writing; 保存想法; cancel with dirty guard | Current actual date; independent human body; failure leaves draft |
| T06 topics-dense | 300-Topic synthetic root | Same root controls; 40-row contiguous reveal/search | No 300 permanent DOM nodes required; empty supplied image is rejected evidence |
| O01 organize-scope | AI整理 → generation/update (not viewing saved result) | Actual Topic scope/time/new+excluded material/provider; explicit Start | No partial-batch-as-whole claim; missing key/offline/denied stop request |
| O02 organize-running | Confirmed job request | Original remains available; leave or explicit Cancel | No fake progress; no Current mutation; actual cancellation/ack status only |
| O03 candidate | Completed, schema/evidence-valid result | 当前稿未改变; compare actual changed units; keep current | Invalid result leaves last valid current; generated fidelity not certified by schema |
| O04 compare | Candidate review | Current vs Candidate; AI-new text label; Adopt/Keep per canonical field | Must preserve quote/role/uncertainty distinctions; no Git color-only diff |
| O05 decisions | All changed fields intentionally chosen | 修改选择; 保存这些选择; one commit; show acknowledged success | CAS recheck; disable while commit pending; unknown ack readback |
| O06 candidate-stale | Topic evidence/current presentation changed | Show reason and previous choices; explicit regenerate or return | Old choices cannot authorize new candidate; paid rerun confirmation |
| O07 many-changes | Many canonical units or long content inside existing fields | n/m已决定; next undecided; collapsible reviewed units | UI cannot split an atomic service field into independent commits |
| C01 context-task | Primary Context or incoming explicit selection | Purpose text, 2 quiet examples max; 选择材料; retain incoming selection | Purpose empty: keep draft, no build; no provider request on entry |
| C02 context-select | Task selection or selected Archive span | Temporary scope list of Input/Conversation/Topic, explicit checkboxes | Whole selection is full snapshot, all-page count/coverage honest |
| C03 context-retrieve | User asks for eligible supplements | One scoped lexical query; included user material distinct; add suggestions | Empty retrieval not empty selected set; partial index disclosed |
| C04 context-review | Build complete reviewable local output | Exact readable output; 编辑或隐去内容; 调整材料; confirm | Role labels and origin trace available on demand, no metadata sidebar |
| C05 context-redact | Review edit action | Output-only editor, save review draft, undo; return | Never mutate Archive; no live release binding while dirty/composing |
| C06 context-stale | Source/selection/restriction changed after review | 核对这处变化 / 从本次移除; Copy/Export unavailable | Preserve safe local edits, purge forbidden derivations; revalidate all refs |
| C07 context-budget | Complete intended material exceeds budget or domain hard cap | Remove supplements/deselect/split; explicit package coverage | No silent truncation; lower detail cannot silently rewrite explicit quote |
| C08 context-ready | Explicit confirmation of current full output | 已准备好 · 尚未发送; Copy / Export | Final fresh validation required at action, not just on entry |
| C09 context-copied | Clipboard promise acknowledged | 已复制；尚未由 PAIA 发送给 AI; return to review | Clipboard denial offers approved full-text manual selection; no clipboard read |
| C10 context-denied | Current policy denies affected material | Remove blocked item / manage existing eligibility / return | No denied body in result, output, DOM fallback or diagnostics |
| S01 settings | Bottom Settings | Existing safe groups; preference applies immediately or rolls back | No content Search; no new provider/cloud permission from design |
| S02 recovery | Actual unfinished recoverable work only | Continue / copy / compare if stale / explicitly discard | Recovery storage != canonical body; purge fences still apply |
| S03 capture-status | Existing status/popup | Enabled/paused, applicability, refresh/reconnect as needed | Healthy capture != complete imported history; unsupported not errorless |
| S04 import-backup | Existing Settings/Archive overflow | Select → validate → impact preview → confirm → staged operation | Import != Backup != Sync; current safe formats/limits, no schema redesign |

## Exact modal decisions

Original width min(720px, viewport minus 32px), History width min(960px, viewport minus 32px), max height viewport minus 48px; content scrolls, heading and close remain reachable. At small reflow they become a single-column overlay with 16px margins or full available window; never a right drawer. History comparison stacks Current then selected past text below 1024px. Menu, Original and History are mutually exclusive.

## Scope and lifecycle details

UI route records opaque domain references, not body copies. Maintain separate anchors for original Topic, saved AI view, longitudinal overview and Context review. Anchor = stable item key + relative block offset + layout mode + sort, with scroll fallback only if item was removed. Switches apply only after leave guard succeeds. Do not restore stale results from an older asynchronous route generation.

Batch reveal appends in place; loading/error stays at the tail, not a full-page skeleton. Focused/dirty/composing/selected items are never unmounted. An accessible Load more action is always available even when the viewport auto-loads. Stop at real end; no fake Next Part or infinite empty scrolling. Search/navigation may load an exact target directly without stepping through every earlier page. Virtualization is an engineering choice with these acceptance constraints, not a new data model.

Context step links permit backtracking without discarding safe in-tab work. Task, selection or output changes invalidate downstream review/ready. Steps cannot jump around missing eligibility/coverage checks. Review copy labels distinguish local prepared text from an actual clipboard/file effect. Temporary selection surfaces use the main workspace/centered modal, never a permanent Reader material tray.
