# TOPIC-05.5 — existing whole-Entry Section move safety

Base: `eff3a2e1d5e380246a50bea45d4845d05944910f`.
Branch: `codex/topic-entry-section-move-20261008`.

TOPIC_ARCHITECTURE_PLAN §7.5 and TL-PT1-UI-1.0 §V5 require contextual
non-drag moves, explicit whole-Entry versus selected-span scope, protected
membership/order and safe revision recovery. This batch strengthens the existing
same-Topic move action only. No cross-Topic move, promotion, selected-span move,
new RPC, data schema, provider, CI, version, Settings write or body copy is added.
Existing position/member history and RESTORE_REVISION remain the recovery owner;
no new Undo button or competing journal is introduced.

The initial three controller negative tests failed: navigating while the form
was open still submitted; an externally moved source was overwritten by silently
using its newer revision; an unconfirmed acknowledgement produced a new operation
on retry. The scoped owner now retains route/presentation intent, guards IME and
unsaved editors, rechecks source placement identity/revision/generation and the
chosen destination, and submits existing PLACE_LIBRARY_ENTRY with current Entry
and Topic CAS. Unknown acknowledgements retain the exact operation and payload
for the existing idempotent receipt path. Eight unresolved Entries is a hard
in-memory cap, without eviction; existing retries remain available at the cap.
This is session-local recovery, not restart-persistent uncertain-operation UI.

The destination form explicitly says the entire Entry moves, not selected text,
and includes the stable unnamed default Section. Entry menus now reuse the
existing busy/inert owner through refresh and focus, including rebuilt nodes.
The retained reader node receives the latest qualified placement for this action;
other legacy Entry actions are unchanged. Only the move control joins the existing
live product-copy language owner. No generic CSS or user-body translation occurs.

## Evidence and limits

Whole-file local command:

```sh
node --test extension/tests/topic-entry-section-move.test.mjs extension/tests/cpv1-topic-05-5-section-actions.test.mjs extension/tests/topic-section-create.test.mjs
```

63/63 PASS, zero fail/skip/cancel, 154.850333 ms. Includes original failures,
route round trips, source/target changes, missing destination, generation, IME,
unsaved/cancel/same-destination, exact unknown replay, duplicate activation,
held focus, bounded unresolved map, and the actual OrganizerStore's idempotent
placement/body/protection preservation. The store test uses fake IndexedDB.

Complete new native file, source and fresh guarded isolated release, headless
Chrome with explicit Playwright 1.63.0:

```sh
PAIA_HEADLESS=1 PLAYWRIGHT_MODULE=<installed matching playwright> node --test tests/topic-entry-section-move-chrome-e2e.test.mjs
```

2/2 PASS, zero fail/skip/cancel, 5853.758791 ms. Native keyboard opens the action;
cancel leaves placement unchanged; named move, reload, default move and existing
position-history restore preserve exact body. Retained menu identity, Section,
revision/generation and mapped protection fields match the durable owner after
restore. English 320px dark form has correct explicit scope, Close and no dialog
overflow. Source/release screenshots are synthetic local artifacts; release image
was visually inspected. No claim of all responsive/200%/touch/physical-device,
selection-span relocation, full TOPIC-05.8 or installed acceptance is made.

Package guard: 11635 PASS across 347 runtime resources, unchanged guard code.
Local logs and SHA256 manifest: `work-entry-move-final-unit.log`,
`work-entry-move-native-final.log`, `work-entry-move-final-package.log`,
`work-entry-move-evidence.json`. Images:
`extension/work/qa-entry-move/{source,release}/move-320-dark-en.png`.

Failure history retained locally: `work-entry-move-negative.log` (three original
controller failures); `work-entry-move-owner.log` (new fixture used nonexistent
`s.placement`, corrected to actual `libraryPlacement`); native initial sandbox
launch failure and cleanup typo `h.stop` corrected to `h.close`; identity-fixed
native showed the retained menu problem after history restore. The busy-only
change did not fix that failure, so it is not credited as its cause/fix.
`work-entry-move-native-binding-fixed.log` separately records an overly broad new
DTO comparison: qualified projection uses mapped protection fields and omits
raw store lifecycle fields. The final assertion checks exact action-binding
identity/revision/generation plus mapped protections; no CAS was weakened.

Independent review passed for the final retained-placement binding, scoped live
locale, bounded exact-retry map and busy-through-focus lifecycle. Current
integration gates remain pending. Prior Section
create/rename/order evidence is not relabeled as this new runtime's full browser
certification. Shared authorizations, Source/body owners and external access are
unchanged. Cross-Topic/promotion remain separate bounded follow-up work.

## Frozen tested-byte binding

SHA256 values below were rechecked before the five-file commit. The receipt
itself is excluded from this nonrecursive manifest. No screenshot is committed.

- `extension/ui/topic-workspace.js`: `bb6e7842c2268250c9a7a601a31b89c5b6f0d2c3f171f3fb4a462402eb564c6c`
- `extension/ui/thought-copy.js`: `bbce54932222d88a2d230880490b00d5270d605aed7144534253e24cfdd5cd1c`
- `extension/tests/topic-entry-section-move.test.mjs`: `0ce809afea41e1adf44d317d1473aae686dd7c49b70d602915fda04b5567f467`
- `extension/tests/topic-entry-section-move-chrome-e2e.test.mjs`: `7d949ca64a51ad51eb98290371ed86b8b3cdeb42bf5ff88f5bde3e06c153b62e`
- `work-entry-move-native-final.log`: `16e936b27d6c0013c56dd223b750c2b8343442ea3b0eb9f31c7b140f7e997cff`
- `work-entry-move-final-unit.log`: `05a3e5ebaa25952c384b6ba40e1bb6f1353c09d7ab36a7212dafa0d763459f82`
- `work-entry-move-final-package.log`: `9c0aff359c4742f49e6464e38aff261f6421a74d1897d1ba95411578653f2f5c`
- `extension/work/qa-entry-move/source/move-320-dark-en.png`: `a3742482cdaea48fda2df531cb04e98287b5102ecbdc4345c2073dcb86bae18c`
- `extension/work/qa-entry-move/release/move-320-dark-en.png`: `a3742482cdaea48fda2df531cb04e98287b5102ecbdc4345c2073dcb86bae18c`

## Combination with reviewed Topic / AI / Context head

The five-file Entry move commit is `b9c102a6`. A nonconflicting merge with
`91169a7ad6e43fdb12a14b6994ea2f50cdb43bbc` preserves its Topic reader/runtime
and 0.22 version, incorporates existing AI foundation and the Context refusal
explanation fix, and retains Section creation plus the move slice.

The merged working-tree exact bytes passed six complete related unit files:
EntryMove, SectionActions, SectionCreate, CTX4 Topic UI/access and AI01 foundation,
237/237 PASS, zero fail/skip/cancel, 3752.563083 ms. One serial headless batch
then ran the three full native files SectionReader, SectionActions (including
creation), and EntryMove for source/release: 8/8 PASS, zero fail/skip/cancel,
39835.300708 ms. The 0.22 inherited manifest/package were not edited.

`work-entry-move-combination-bytes.json` records 339 runtime/test/harness file
hashes, all rechecked unchanged after the run. These are local merged-tree
evidence, not a claim that the prior pristine parent passed these new tests.
The following are SHA256 bindings of the uncommitted local evidence artifacts:

- `work-entry-move-combination-unit.log`: `a659f071b5c004738a0831663ba3c8be7b7a9a9d293a250606e557c77d58180f`
- `work-entry-move-combination-native.log`: `9e6f8f88ccab98269429f822cab1da642c2b7656d0f04db939687d6d97cce4b6`
- `work-entry-move-combination-bytes.json`: `58a630e34b02bc7ab4da77755e24f30411295ff2d5593a2557e93e41db7b41fc`

CI whole-file admission and new-head hosted gates remain with the coordinator.


Coordinator integrates the stable Section creation/Entry movement batch into PR203 after independent runtime review. Runtime/native bytes equal18f7e14d, whose237 complete owner units and8 complete source/release browser cases passed with339 unchanged runtime/test/harness hashes. The new complete Entry move native file is explicitly admitted on shard4 at widths4/5/6/7. Independent review evaluated actual parent e2230ed4: all312 old placements remain identical, current79 files are covered once, and the frozen76/304 historical oracle remains unchanged. Sixteen complete CI owner tests and the coverage checker pass; workflows and7×18-minute budgets are byte-identical. Original911 full Unit4 admission mismatch is retained; final combined-head hosted certification is pending.
