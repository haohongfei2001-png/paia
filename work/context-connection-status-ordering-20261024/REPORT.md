# Context connection-view currentness repair

## Exact scope

Base: `98761c8c627ee66445c20dee452959d644fcd634` (accepted Settings authority integration). Isolated branch: `fix/context-connection-status-ordering-20261024`. The shared root remains at `2f9250fe817dd9eebc0fc1373c05d01dcd7a0ed6`; its staged/untracked work was not modified.

Only `extension/ui/context-connections-view.js`, its complete original owning `extension/tests/context-connections-ui.test.mjs`, this report and its bounded evidence archive are committed. Parent `ContextCardsPage`, connection transport/witness/authority, storage, startup, version/package, permissions requested, and grants remain unchanged. This is a synthetic cloud Node candidate, not installed/native/provider/full-programme acceptance.

## Reproduction and repair

1. An earlier held original STATUS response overwrote revision 3 / Revoked after the original unavailable legacy-row Revoke button completed one CHANGE plus its normal status read. The old view regressed to revision 2 and reused that stale revision for later actions. Late errors also replaced newer feedback; closed views could start another STATUS read.
2. A per-view read generation now invalidates old success/error completions on newer reads, parent updates, mutation admission and close. Closed views start no read. Current failures retain truthful unconfirmed-state wording; no synthetic success or backend authority is introduced.
3. Separately approved same-view action completion checks preserve actual result identity/revision: the owner's own notification may precede a valid one-time credential response. Matching same-action and newer genuine results remain usable; a newer revocation or current paused/expired/restored/unknown state is not covered by obsolete credential/error presentation. Noncredential success retains the original durable readback.
4. Separately approved pairing-lifecycle repair captures the original PAIR/REPAIR route, expected revision, port and policy before native permission settlement. Close or a newer parent/read snapshot abandons the pending mutation rather than retargeting it. A closed acknowledged form requests no permission. The existing permission request contents are unchanged, repeated clicks remain single-flight, and no mutation is retried or duplicated.

The pairing acknowledgement, permission behavior, credential one-time field/copy/hide timer, localization, repair/reconnect policy, CAS and normal current error behavior are covered by the unchanged original tests plus new original-method controls. Tests use only synthetic data; no real connection or account is created.

## Retained evidence, including failures

Every invocation uses complete files, no filters/skips or weakened assertions. `commands.txt`, exact logs, source/test snapshots and `log-sha256.txt` accompany this report in `evidence.zip` (SHA-256 `85631da6729eefca86ed76a72e9a14ff21a8c26e4a601f78053a6b490711f3a7`). The unpacked originals remain preserved in the isolated worktree.

- `baseline-owning.log`: original owning file 12/12 PASS.
- `red-owning.log`: unchanged baseline runtime with added regressions, 13 PASS / 9 FAIL. Original runtime hash `6d7cb03705376b416c0b31b7f478e7e0002e88cdd19cb9ee8fe2d5aab438a868`; expanded RED tests `ec116742772017d40908c7e7048334f1743669515f52eeff2c0c576dc92ad65a`.
- `green-attempt1-fixture-cleanup-fail.log`: minimal fence, 20 PASS / 2 FAIL due to new replacement-view cleanup running after the fixture restored global document. Only that added fixture cleanup order was corrected; the failed invocation remains.
- `status-green-owning.log`: isolated primary STATUS fix, 23/23 PASS.
- `action-pair-red-owning.log`: primary fix plus separately authorized action/pair controls, 25 PASS / 6 FAIL.
- `action-pair-green-owning.log`: initial blanket action-update fence, 31/31 PASS on those controls, subsequently REJECTED by independent review because legitimate owner notifications could hide current credentials. Not final acceptance.
- `action-notification-red-owning.log`: six additional normal owner-notification controls expose that regression, 31 PASS / 6 FAIL. Original notification semantics were retained in the refined source.
- `action-notification-green-owning.log`: refined result-aware action handling, 37/37 PASS.
- `final-scoped.log`: final source/test bytes, four complete synthetic Node files, 174/174 PASS, zero failed/cancelled/skipped/todo. Includes all 49 complete owning connection-view cases. SHA-256 `e93c14b1042fa28e4ed1146d32524bc53ab051f45bf8373ddc65cddcebb5c9ab`.
- `final-static.log`: both edited JavaScript files pass Node syntax checks; `git diff --check` passes.
- `original-test-preservation.log`: all 12 original test bodies/assertions remain an exact prefix after the sole fixture-only dynamic-response hook extension.

Complete final scoped command, from `extension/`:

`node --test tests/context-connections-ui.test.mjs tests/context-cards-local-ui.test.mjs tests/context-connection-policy.test.mjs tests/context-connections-quiescence.test.mjs`

The adjacent quiescence file uses its existing pure synthetic original-owner ports. The native/loopback `context-connections.test.mjs` and browser E2E file were deliberately not run.

## Final source identity and independent review

- View SHA-256: `3b00df7adcb16a8105a053cc7d1810447cac0e197d5bcebae4fae71e322ca46a`.
- Owning tests SHA-256: `a9ed0daa53d7ad9783fe526d31e639a3ed15afd4830ebde935d1ca244d027cdf`.

Independent review of the exact final runtime passed 22/22 adversarial controls and the final complete 49/49 owning cases, with no remaining scoped blocking finding. It separately reproduced baseline defects and rejected the blanket action fence before the correction. Final owning review log SHA-256: `ec4fa0a75d61edf1d6055a7a86ca2e7312e3d8a9c4e1892fbbfd0007f3b7b153`. Exact commit/tree identity is supplied with the freeze handoff rather than self-embedded into the commit.

Independent retained evidence is separate from author runs: refined independent log SHA-256 `87aea10219bc129d2140eb0780a9edbab880fbab250f9c22af956bd144634331`; refined owning log `9928a263d3d6725fd77a0c590c44fa838072ad11f4487ea5f04fb6aa1e059383`.

## Boundaries and remaining gates

No browser/native execution, build/release, Full/C, 129-group/100k, provider/network/account, paid operation, install/deploy, remote or local Codex work was performed. Backend durability/CAS is unchanged, and synthetic presentation tests do not certify real-client or transport behavior. Coherent integration, version reconciliation, applicable native/browser and final release gates remain with their original owners. Existing failures and consumed allowances are not relabeled or reset.
