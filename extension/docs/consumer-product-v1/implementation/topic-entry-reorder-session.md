# TOPIC Entry up/down: one recoverable ordering intent

The approved Topic plan retains Entry reordering through existing owners and non-drag controls. The real controller + OrganizerStore reproduced a committed DOWN with a lost acknowledgement followed by a retry selecting the next neighbor, moving twice: `[A,B,C]` became `[B,C,A]`.

The original menu now keeps one immutable request per pending Entry intent, including the original neighbor, Topic revision, operation identity and recovery epoch. Unknown acknowledgement retries that exact request. A known result is qualified without another swap. Pending activation, IME, failed editor flush and stale route refuse mutation. The real departure epoch allows only the mutation's own editor-leave transition; switching to Archive while the Topic id remains cannot resume a hidden write.

The original reorder owner accepts an optional recovery epoch, checks it before receipt replay and uses the existing transactional epoch fence for both ordinary swaps and tied-rank layout jobs. Legacy callers remain compatible. Guarded requests refuse an unsupported injected Sync journal before delegation. The original tied-rank layout algorithm and job identity remain. Reorder's stale-route polling stops; other existing layout callers retain their contract, including cancelled jobs represented as paused.

Frozen runtime: `topic-workspace.js` blob449df09ac2429ecbad293768f50556360e055799 and `library-layout.js` blob424346fc9fe95ab3e83ebce8e6bddbad6042b583. Owning test blob30f9a8e7c71915eac812d3638417da6d813dffc3.

Author eight whole files189 PASS; independent eight whole files189 PASS, zero fail/cancel/skip. The final owning14 also exercises the actual mutate/leaveEditors pipeline. Exact Source and standard release each pass five real isolated headless Chrome paths: lost ACK with one swap, late adjacency retaining another Topic reader, actual navigation to Archive with no hidden write, tied-rank layout completion, and recovery replacement after qualification refusing write/receipt. Same-owner CREATE lost-ACK and Entry deletion/Undo standard-release combination journeys also pass. Zero external requests/runtime errors; standard release503-file guard passes.

All failures remain in work/reviews/PR284-ENTRY-REORDER-GAP and PR284-ENTRY-REORDER-SESSION. Corrections include using actual foundation-status epoch instead of a nonexistent Topic field, qualifying real departure, correcting absent-property test oracle, preserving old layout caller behavior, and using the actual Archive navigation control with completion-based waiting. No timeout increase or safety assertion removal. The earlier deb1 UI snapshot passed four journeys but is not the final version evidence.

This candidate is not merged or installed. Whole-head/full/latest approved visual gates remain; Pro owns CI, Sync new features stay paused, and all seven Canonical plans remain intact. No provider/account/permission activation or user-data operation.
