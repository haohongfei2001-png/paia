# Native Maintenance qualification refusal fixture

## Exact failed native checkpoint

Head `419b8727608ef4c35046ba88f4d93fd685fd98c5`, tree `4587c9ab188608f1a2a1defa8e5ad66ca286b0b1`, run `39172409473`, job `117808052920` ran the complete original Source/release Maintenance file with Node 22.23.3 and Chrome 155.0.8059.39. Its result is **148 tests: 144 pass, 4 fail, 0 cancelled, 0 skipped**. The two failed leaves are Source and release `unified-maintenance-authored-context-grant-denied`; the two failed parent suites are included in the four. This failed run remains failed. Earlier 148/148 native evidence on the preceding checkpoint does not certify this head.

The complete downloaded original job log is `paia-native-ci-39172409473-job117808052920.log`, SHA256 `b4799c4ac94b5ffc7250ce6482344b6edd20ffae285302f85ac93424eeaac20a`. Both leaves throw the original `UNAVAILABLE` from `createMaintenanceQualification` line 163, through `withMaintenanceQualification`, before `session.prepare` returns. The fixture sets `state.processing=false` for every processing purpose. The newly explicit pre-job field qualification correctly refuses there; the older fixture only expected refusal from `session.run` and did not catch prepare rejection.

## Narrow test-only correction

The original `grant-denied` phase remains an all-purpose denial. It now explicitly requires `prepare` to reject with `UNAVAILABLE` and return no handle. It preserves zero physical calls, zero organizer usage, zero ACKs, zero Context Items, and exact equality of all nine original Source/Input/Thought/Topic/Section/Placement/dependency/provenance owner snapshots. It additionally observes selected text getters only during the denied session prepare and requires zero dereferences, zero jobs, and qualification-only processing requests.

A separate `payload-grant-denied` phase permits the independently requested qualification receipts and denies only `purpose='ai-maintenance-payload'`. It retains the original `run` result of `UNAVAILABLE` and all the same physical-call, usage, ACK, Item and owner preservation assertions. No default processing permissions, production behavior, exception classification, test timeout, provider or workflow changed.

Test file SHA256: `a9790d371849076f01ebdba8de83a68a9ea60ec15dbee0ff884f41c3a5c202e5`. Minimal diff SHA256: `70c43efc0302e4c8d84bf524b4df48f234a38a8f879a992e3ad0707168a78756` (`paia-native419-grant-fixture.patch`).

## Local evidence and remaining gate

The exact original native fixture function was evaluated against the repository's fake IndexedDB solely as a fixture preflight. Before the correction, its all-purpose refusal reproduced the same uncaught `UNAVAILABLE` (`paia-native419-authored-fixture-reproduction-red.log`, SHA256 `921eba6085cf99bc3f1fc48e68322b2d9976932993a02ce8267355eed393a161`). After the correction, all ten authored phases passed: complete, body-edit, coalesced-placement, restore, edit-restore, grant-denied, payload-grant-denied, ACK abort, restore drift and hash race. The all-purpose case recorded zero text getters and only a qualification request; the payload-only case recorded qualification followed by the denied payload purpose. Log: `paia-native419-authored-fixture-10-green.log`, SHA256 `66703f483c2ff9ae39be676cf6840413179cea9bd48c6ec01dbe72d85d4dbb6b`.

These local checks are **fake IndexedDB**, not Chrome/native evidence. Local browser execution remained unavailable under the existing access restriction and was not retried through another route. The changed full native file now contains 150 total tests, including Source/release counterparts of the additional refusal phase. Its exact-head remote CI is **pending** at this receipt. The original synthetic mapper, no-provider boundary and all previously disclosed whole-programme qualification limits remain.
