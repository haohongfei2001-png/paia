# AI-COST-05/06 native provider-entry fixture repair

## Scope and preserved failure

This test-only successor preserves the runtime and the original 120000ms lifecycle case limit. PR302 head `2f0de1f1444ae5cde5da400ab712d0c9ec5c6459`, tested merge `8056f8b9b405505bee93b8cdefcb8f9974762607`, run39182287245 Browser3 has a real source lifecycle timeout. Source finished both Organize stages at25036ms and remained in private-assist for95049ms until test abortion at120085ms. Release private-assist completed in4125ms. The later job cancellation is separate and does not replace the earlier failure.

The original phase evidence cannot identify the precise private-assist substep that stalled in that CI run. A deterministic original-runtime control establishes a reachable fixture defect: the original25ms timer begins before asynchronous final qualification, and an unconditionally awaited provider-entry promise never resolves if that deadline settles the attempt before provider execution. Holding the actual third lease.snapshot proves run returns OUTCOME_UNKNOWN with provider0, attempt1, RESERVATION_RETAINED, no ACK and no late call when qualification is released. This is a demonstrated mechanism, not a claim that host load uniquely caused the CI timeout.

## Narrow fixture change

- A separate native control holds the actual final qualification and lets the unchanged25ms deadline elapse naturally. It requires zero provider calls, UNKNOWN, attempt1, retained reservation, zero ACK, no result and unchanged durable rows after release.
- All eight original provider-entered controls still execute the original provider exactly once and preserve timeout/dispose/dismiss/revoke, late resolve/reject, aborted signal, no publication/insertion, UNKNOWN, retained reservation, zero ACK and unchanged-row assertions.
- Their test-owned scheduler intercepts only the original named abort timer with the exact25ms parameter and no extra arguments. After actual provider entry, it arms the same callback through the original native setTimeout with25ms. Other timers pass through. It requires one captured timer, records armed/cancelled state and restores the exact original timer functions in finally after settling the original run.
- Every provider-entry wait races the original run outcome. A run that has already stopped fails immediately with a body-free state message rather than waiting for an event that cannot occur. New journal substages identify setup, pipeline, pre-provider deadline, each entered control and insertion.

No production runtime, timeout, network allowance, dependency version, financial state, permission or original eight-case success oracle changes. The timer control is a test scheduling device; it does not assert the original qualification naturally completed within25ms.

## Local verification

`node --test extension/tests/ai-assist-native-deadline-fixture.test.mjs extension/tests/ai-assist-private-session.test.mjs`

Final coherent Node24.19.0 result:61/61, zero failures/cancellations/skips,4623.237604ms. This includes10 new controls and51 unchanged original private-session tests. Original actual runtime and Foundation owners run with the existing fake IndexedDB fixture. This is mechanism/owner evidence, not Chrome evidence.

The available isolated source dependency inventory contains1487 files and is byte-identical before/after this command:SHA256 `2df0aa2a4f060b6b2f3db12b1be41660d914d9c7c9069b3f09bd997e52bfe0aa`. Final log SHA256 `4ef4863d0c5da50c5c1db2976ec3e5890355a09d894658a95d125ff54a49c193`. Both modified native harnesses and the pure timer helper pass node --check. Local Chrome was not launched; the new complete Source/release native lifecycle remains pending the original CI.

Earlier local diagnostics remain separate: original held-qualification1/1; initial new unit import failed on an unavailable browser dependency, corrected by moving the pure timer fixture to a dependency-free test helper; the next10-test round had4 passes/6 failures because a newly written assert.rejects invocation did not wrap an original synchronous STALE_BASE throw. Correct async wrapping preserves the rejection oracle. An intermediate61/61 precedes the final cleanup-order change and is not substituted for the final coherent61/61.

## Evidence identity

The original CI log SHA256 is `82f0743d2aec0b29395f29685bda7d4ad388ef6cee3b1fc65b072dd7b6d44126`. Source phase journal SHA256 is `b4e57702eee4007a74d5a40f4a2b7576582ff9f42ca7d534dc4f02ef21b3346a`; release is `bd3bf61f2000c288763db36735f16750538e86d9a338285eddd34609495bb2bb`. Original artifact12156744481 has SHA256 `029eaffc856b306cb963be98f62fee490cb5f55d32baeb78f5cceeedef74dda3` as recorded by CI. These historical failed/cancelled results remain unchanged.
