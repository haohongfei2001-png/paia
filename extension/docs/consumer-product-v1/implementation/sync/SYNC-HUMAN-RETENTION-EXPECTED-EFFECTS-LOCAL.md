# Dormant retention expected effects — local calculation evidence

Date: 2026-10-09. Code: `a4a14e15c045adef2e6b73584c462de86408ba81`, tree `56a9ff2273091e153f0426289438c7f515ca00b7`, based on `20ec13664e9e9d9a29791054f02d39fd13834343`. Branch: `codex/retention-expected-effects-20261009`.

## Scope and remaining gate

The original Plan now contains a private, **uncalled** pure calculation. It consumes its own claimed retention record and already-owned immutable protocol/precut; it performs no database reads, native transactions, writes, authentication, or commit authorization. No current runtime caller activates it and no planner export exposes the output. This is not full positive-effect verification or native/source+release retention certification. A future separately reviewed original-owner readback/closing boundary remains required. Earlier actual false-success records and existing native evidence remain intact; they are not relabelled by these local tests.

The finite implementation follows the approved external design bundle: `RETENTION_PURE_EXPECTED_EFFECT_PLAN_DESIGN_20261009.md` (`0152201b1645e32a12a3294c3a938b7ba29e394fe02c5c8e3a1ff11c576ef191`), resource REV2 (`fdb453bdd323c39438c7b1cbb9ea3a847679c6c52a7c9b696c56a1757c6f4609`), frontier REV3 (`a01a2566d82b3b6cf950dedfb63fc20f872fd79e380c2f1176b3536a3994fb6f`) and encoding addendum (`c56586426038b01ea4bb388935070495dbc1ec7a500b1a36164399c576b81686`). The rejected initial resource amendment is not implementation authority.

## Implementation

- One new `physical-key.js` exposes exactly the original key encoding and physical-ID concatenation helpers. Ordinary Core `idIn` captures `this.prefix+''` before awaiting its original `bind`, preserving getter, default ToPrimitive, Symbol failure and bind-mutation ordering. Original `get`, `put`, `bind` bodies and Repository bytes are unchanged.
- Fresh calculation produces full physical row payloads and original digests for `5N+2` rows, where N includes the descriptor. It reuses the owned expected head vectors, original operations and original `acceptSequence`, preserves sparse ranges, and increments generation N times with the original null-to-zero default. Complete duplicate instead retains the recorded rows/nulls, generation/frontier and zero writes. The fresh two-head condition is **fresh-only**; duplicate does not inherit it. Missing selectors differ from explicitly observed null.
- Unchanged/absent obligations retain the protocol cut and original semantic read references. Fresh base explicitly excludes the generation field. These facts are computational output, not authenticated reads. New row payloads and the new final frontier/range/pair tree are frozen without cloning; borrowed operation/head/read references remain owned and frozen.
- No independent quota: fixed 16 KiB scan prepayment, retained M and temporary S are debited to the original store/owner budget, still 8 MiB total. The frozen private scan uses bounded depth/nodes and incremental UTF-8 sizing without an input-sized keys vector. Existing mutable `branchRawSize` callers retain original `Object.keys` snapshot/accessor behavior.
- M includes the newly retained frontier tree (`128*(f+N)+256`). S covers simultaneous frontier folds, encoding/digest work, and the approved extra comparison bound `4W+128V+4096` for original `equal`. W/V cover operations, expected heads, and all recorded protocol rows actually compared or hashed. Semantic facts are borrowed and are not encoded by this helper. These are conservative **logical accounting** units, not a general native clone/heap theorem.
- Original private capability/state identity owns the reservation. Public finish during an awaited digest revokes the handle but escrows the entire old raw+work charge and busy slot until inner aliases unwind. Concurrent derive/retry is refused; successful retained M is released by original forget, and failures refund exactly once.

Only runtime changes are Core, Plan and the new pure key module. One existing isolated source VM changes its extraction endpoint because Core's local key declaration moved to the import; its original assertions remain. No Repo, native fixture, CI, version, UI, account or deployment changes.

## Exact local validation

Node `v22.23.3`, executable `/private/tmp/paia-ci-node22/node-v22.23.3-darwin-arm64/bin/node`. Final command from the isolated tree:

```sh
node --test extension/tests/native-sync/retention-core-data-profile-contract.test.mjs extension/tests/native-sync/retention-owner-phase-contract.test.mjs extension/tests/native-sync/retention-dispatch-contract.test.mjs extension/tests/retention-data-method-provenance.test.mjs extension/tests/human-retention-nonnative-refusal.test.mjs extension/tests/browser-native-sync-core.test.mjs extension/tests/browser-native-sync-human-library-group.test.mjs extension/tests/browser-native-sync-human-library-journal.test.mjs extension/tests/retention-expected-effects.test.mjs
```

**86/86 PASS: original 72 plus 14 new tests; zero failed/skipped/cancelled.** New tests cover complete literal payload inventory/digests, borrowed identity and freezing; null/missing/partial/duplicate selectors; ordered input, sparse gaps and generation overflow; 128 operations; 4096 retained frontier ranges; admission refusal without hash/eviction; digest failure/refund; public-finish cancellation and competing work; mutable meter compatibility; duplicate >2-head preservation; and actual current versus frozen-original `idIn` coercion behavior. The original one-line oracle is embedded with provenance/hash and has no Git-history dependency. The synthetic fixture executes actual private Plan source in an isolated lexical environment, using original validated codec groups and owned synthetic cuts. It does **not** claim those synthetic cuts have passed native or complete retention semantic qualification.

Build command: `python3 scripts/build_current_release.py` from `extension/`. PASS: 13,910 package guardrails, 413 runtime resources, 437 release files. Artifact remains local `0.42.0`; no version bump or install. Source fingerprint: `e71357619462eddcbb3b86939c4cefaf39f163ec1a3c1898529807ef9228c71b`.

Actual Node imports of Core/Plan/key in both source and generated release pass, including their cycle, ordinary Core ID call, exactly two key exports, absence of a planner export, and byte equality of all three changed runtime modules. No browser/native run was performed for this code.

| Evidence | SHA256 |
| --- | --- |
| `/tmp/retention-expected-effects-full.log` | `3dd7ed908781103ebd16f8b5edb24915737caea9e09e40f12601efdab6183d26` |
| `/tmp/retention-expected-effects-build.log` | `a67e79d0d4421a6558b72919b324f0014cc5461e2b04b584c138970fce4e1bc2` |
| `/tmp/retention-expected-effects-import.log` | `89cdef0a29cc974e7b190e2da9e788e069c94b3fa5cbb78cc109dcfd6926e9ed` |
| Core source = release | `3f815f2fce94c502a32af19ed03732df61bc76f323bc2c69192f075b84f37048` |
| Plan source = release | `fdd8f2147a03737991bfc71e5972cf8533ec9f9b46ebeee6c7c93b0db6b96110` |
| Pure key source = release | `f273a2c19f44628a66afad0f45b96366674bea7838b3e07c7381427ff7cc138f` |
| New owning test | `49819456e15728d97cd5167a33a48047fed7c082f1fdf9aecec74e1a36fdf701` |

Predecessor `7f37ed0dcaf5b322fd5b1521aa454e3673db11c4` had 85 passing tests but independent review found its duplicate two-head restriction incorrect. That code and `/tmp/retention-expected-effects-7f37-{full,build,import}.log` are preserved; those passes are not reused for the final code. The final full run above follows the repair plus regression. Independent CODE review and integration are still pending at this receipt.
