# IAH-1.1 truthful return and ordinary Find coverage — local candidate

Base: `8f0199a114ce91ca3592a217fbe63e7817326baa`; independent `codex/iah11-find-return-20261008` worktree. PR199's active candidate was not edited. Scope is selected M3 and IAH-08, not IAH-1.0 or a new scope control.

The existing normal-flow Back now labels its validated, document-bound tab-local origin as 返回搜索结果 / 返回项目浏览 / 返回档案 (with English equivalents). `originKind` is a strict three-value field in copied bounded ViewSessions metadata only. Missing or wrong-document origins cannot claim exact search restoration. Existing cross-space/Topic/Revisit behavior stays under its original owner. Locale changes repaint only the button label, without refreshing editor DOM or dispatching requests.

Ordinary Archive Find starts with the existing include-filtered checkbox checked. Users can still deliberately uncheck it, and a real saved Search origin restores that explicit choice. Fresh primary Archive, cold neutral fallback and a new neutral tree origin use the normal Find default. Conversation Find asks its existing universal search owner for eligible filtered Inputs while keeping `includeRemoved:false`. Normal Reader GET_PAGE, `showFilteredCurrent`, purge fences and data defaults are unchanged. Activating a found filtered Input uses the existing narrow context target exception; surrounding filtered Inputs remain hidden and no Keep/protect/content write is issued.

## Evidence

- Actual production presentation/search owner negatives: `/tmp/iah-find-return-before-unit.log`, 6 FAIL / 4 PASS. The original Back text, unchecked initial Archive field and Reader request `includeFiltered:false` failed the new contracts.
- Actual native visible Back negative: `/tmp/iah-find-return-before-native-label.log`, expected 返回搜索结果, actual 返回聊天窗口. Earlier `/tmp/iah-find-return-before-native.log` used an incorrect aria-label attribute assumption (the real control uses its visible label); this test-only selector failure is preserved separately and is not product proof.
- Eleven complete related unit files: **67/67 PASS**, no skip/cancel, `/tmp/iah-find-return-full-unit.log`. Includes actual navigation/save/IME scope owner, metadata bounds, Settings return, filter-context exclusion/wrong-document/tombstone guards and presentation.
- First post-fix complete native run: source PASS, release failed the retained final changed-match table equality (`/tmp/iah-find-return-final-native.log`). The only difference was `filterInputs.overrideReason` changing from `user_edit` to `source_user_protected`; the latter is written by existing `SmartFilterStore.sourceOperation` when a still-open synthetic host recaptures a protected source. This is an independent capture write, not an arrival-write claim. The fixture now retains and closes only the completed initial `/c/iah11-results` host before later independent edit/arrival proof; later captures and real worker notifications are untouched. No table equality assertion was removed. A separate live-locale check uses actual UPDATE_PREFERENCES en/zh and verifies the same editable node/body.
- Final complete source/release native file: **2/2 PASS**, zero fail/skip/cancel, 52.59s total (source 25.72s, release 25.51s), `/tmp/iah-find-return-qualified-native.log`. The three production files and native-file SHA-256 were identical before/after. Existing all assertions retained; added real search/tree/cold Back labels, ordinary Archive filtered discovery without calling check(), Reader Find discovery without changing normal visible rows, matched-Input-only arrival, normal filtered visibility after reopen, and unchanged canonical source/working/filter/revision table equality.

No core/query implementation, worker, CI, permissions or product version was changed. Local release still inherits main 0.21 and is a test candidate, not a newly versioned installed IAH delivery. Search DTO generation/revision/scope admission, precise stale removed-target handling and final selected-scope acceptance remain separate open work. Exact reload query recovery is not claimed; the previously reviewed honest neutral fallback remains.

Frozen tested hashes (before final native):

9ed402115bb3dced6630526214b91d1b5118aa129a1a7cf7d7aee0dfbf44e37c  ui/archive.js
ea62e24bb1fa0c8b72c3148e00af68360aa1b7878137e8f31804fc255dc05936  ui/archive.html
898a4c3e98eaaa3537dc6fc492bde0731195fb91c7d501c8ce2566dd2ecd10d7  ui/route-history.js
ce7be35ba4ba8f961ff9abbe4b50e85e6c310db7213a98b3f2375604fd7c2fdd  tests/iah11-result-presentation-chrome-e2e.test.mjs
