# IAH-08 guarded Archive removal undo

Candidate implementation; not merged or installed. The old immediate-removal button could undo a later edit to another Input. Capture the exact original UndoJournal patch-array identity and original editor/navigation identity; history collects current edits before verifying that exact patch is still the stack top. An expired shortcut refuses without undoing subsequent edits. Valid immediate undo uses the original editor/save owner, preserves IME and unknown-save guards, and reports success only after confirmed flush. No store or writer is added.

Production archive.js70480e956705430e6a0629d77955c44799e82cbf and library.jsfa833f397bc1de42d52fad2869ce943ae83f568f; test760426a1eb4b56903ad273da5eb68a815cedc11e. Author15 and independent65 related tests pass. Retained old-runtime counterexample fails as expected. Exact isolated Chrome Source and standard release pass real A removal/immediate undo; after B edit the stale A shortcut refuses, A stays excluded and B remains edited. Zero external network/errors. Combined501-file release guard passes; Context Item basis release navigation also passes against the changed Archive callback. Evidence: work/reviews/PR284-ARCHIVE-REMOVAL-UNDO and PR284-CONTEXT-ITEM-BASIS.

IAH-12 original editor CAS and all history remain. Full candidate/main and latest approved visual acceptance are still separate gates.
