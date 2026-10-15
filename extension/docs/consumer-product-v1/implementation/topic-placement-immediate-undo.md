# TOPIC-05.5 immediate placement undo

Candidate implementation; not merged or installed. The approved placement-removal interaction now offers immediate undo through original PLACE_LIBRARY_ENTRY and RESTORE_LIBRARY_PLACEMENT owners. It qualifies the exact removal history, original operation ID, epoch and Entry/Topic/placement revisions. Unknown acknowledgements retain the exact request for reconciliation; route changes cannot publish stale success. No second writer or weaker CAS is introduced.

Production topic-workspace.js blob a82cff9d1ad736a77ba639890c3823f0bb07332e; owning test b81ce844525fb9e2dfaf9783065bee2c5aaad967. Author related113 pass; independent owning28 plus original related61 pass. Final isolated real headless Chrome Source and standard release pass actual removal/undo, visible original body and lost-ack exact-request replay, with zero external network/errors. Standard combined release501-file guard passes. Evidence: work/reviews/PR284-TOPIC-PLACEMENT-UNDO. Earlier failures remain retained.

Full candidate/main and latest approved visual acceptance remain separate. Sync new features remain paused; Pro CI ownership is unchanged.
