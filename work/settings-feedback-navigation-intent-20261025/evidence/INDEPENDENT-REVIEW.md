# Settings guarded navigation: scoped independent review

Baseline: published development commit 510d2c7f5a94367db2411f38ad1017860d9b81d8.
Reviewed runtime SHA256: 76e82fd84dc93b48b60808eaf63ffb3bbc1bd9006e882cf957ad3b5970168faa.

Result: no blocking finding within the approved same-presentation category-navigation flow. This is scoped ordinary UI review, not native, full-product, backend, integration or publication qualification.

The original feedback owner still decides whether leaving is allowed. One original leave promise is shared while saving; newer valid category intent replaces only the destination/options, not the save or its outcome. Admission does not advance groupFocusSerial before success, retaining the existing refused-leave invariant. An About choice advances the existing serial, and hiding Settings retires the pending route; an old completion cannot revive those routes. Invalid groups do not alter valid pending intent. Refusal, composing and unexpected rejection do not navigate or generate a second save. The existing post-admission focus/scroll protection remains unchanged.

The sole existing-test modification is pendingGroupLeave:null in settings-restore-intent.test.mjs's explicit production-body VM context. Its assertions, cases and deadlines are unchanged. The new owning tests use the original feedback leave body with a held synthetic flush and actual production group/visibility bodies.

Independent execution, once, on the frozen source:
node --test extension/tests/settings-feedback-navigation-intent.test.mjs extension/tests/settings-directory-focus-frame.test.mjs extension/tests/settings-restore-intent.test.mjs
External timeout: 30 seconds. Actual duration: 117.365159 ms.
31 tests passed; 0 failed, cancelled, skipped or todo.
Log SHA256: 949188bde909add3d7889929da4b41be51d50531b2c51b071b6a0487d12251a9.
All four source/test hashes in before.sha256 were rechecked unchanged after the run.

No browser, native clipboard, real email, provider, network, Full suite, held Context/sync review or external mutation was performed. No production files were changed by this reviewer. Native dialog/event ordering and combined integration remain separate gates. Author's initial failures remain in the author's evidence; this review does not relabel them.

A broad read-only git diff --numstat encountered an unrelated absent sparse Git object 6fdf24514e3a0540a761a22f636a40924c98648f. Exact scoped runtime and existing fixture diffs were readable and reviewed; no object restoration or alternate fetch was attempted. This does not assert a complete-worktree diff audit.
