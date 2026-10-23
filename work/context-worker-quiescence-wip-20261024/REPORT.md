# WIP ONLY — Context worker quiescence handoff (2026-10-24)

Stopped immediately on the user's handoff instruction. This candidate is preserved for review, not integrated, not executable qualification and not a claim of completed Context/Assist/Next quiescence.

Parent: fa889ea3ed42963d635691e9961ced4826f950e8.
Working branch: codex/sync-local-lifecycle-20261023.
Working tree: /Users/hhf/.codex/worktrees/paia-scale-consumption/paia.

Only extension/background/context-connections.js contains unfinished runtime changes (27 additions / 8 deletions): private selection hold; tracking existing native-message promises; tentative intake gates for pair/change/resume/renewal; exact existing handover close ACK reuse; serial/native drain; original witness read and token fence. No service-worker integration, no activation capability, no new RPC and no automatic reload. Context lifecycle file, Prompt Assist and Next were not changed.

No test, syntax check, browser/native process, build, CI or cloud run has executed for this WIP. No new failure result exists for this WIP because execution never began. The preceding fa889ea3 result remains 12/12 local synthetic tests for local maintenance only; it does not validate this successor. Existing historical failed logs remain preserved in their original report directories.

Mandatory review and implementation gaps before use:
- The draft blocks all change() calls while held, including pause/revoke. Review and change this so an original security restriction still invalidates the proof and can proceed; never silently suppress revocation.
- #message currently ignores messages while held unless retiring. Verify handshake/ready messages racing hold and exact source close acknowledgement ordering; no timeout or lack-of-message may count as a successful host stop.
- Verify all already-entered serial and native tasks, renewal scheduling races, permission/storage invalidation, suspension cancellation, disposal/closed database, native disconnect and partial handover failures.
- release does not reconstruct a closed native transport or write a clean resume witness. The cancellation UX and explicit original reconnect path remain to be designed and validated; do not imply automatic restoration.
- Confirm the body-free hold/fence observes all required original witness/currentness state and cannot accept a stale or pending mirror write. A private token alone is not sufficient without actual original owner evidence.
- Add finite synthetic tests using original Context owner and fake native ports. The existing context-connections.test.mjs starts local host processes, so it must not be run casually under this no-native handoff.
- Assist/Next still need original task admission/settlement holds and a durable body-free insertion-UNKNOWN witness independent of cards/maps. Both can clear display maps while work or uncertain insertion remains. Qualified LocalAssistSession invalidation can launch unawaited cancelServer and clear its private states; this needs actual original session settlement proof, not just background-map emptiness.
- No global selection authority may accept this incomplete Context WIP or the local-maintenance-only token. Existing command facade still denies ACTIVATE/CONTINUE/RESTART.

Next owner should review the precise WIP diff before cherry-picking; root is saving candidate refs separately rather than blindly merging. No push/main/PR changes performed by this subagent.
