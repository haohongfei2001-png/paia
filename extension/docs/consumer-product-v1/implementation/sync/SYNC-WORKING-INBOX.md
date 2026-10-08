# SYNC01 bounded InputWorking inbox — local owner evidence

Historical author checkpoint: base e22ffbf1 plus the exact working-tree bytes recorded below, subsequently committed as dc4cb757 (author58df9660). This is not pristine-base or latest-integration certification. No production worker registration, provider, permission, schema, or remote account activation. The original complete receiver remains restricted to existing eligible unreferenced Inputs; this adds explicit injected local segment staging and resume, not full restore.

## Contract

Existing meta stores only verified descriptor refs, group IDs, namespace and restore epoch. No Working/Source bodies are persisted in this inbox. The synthetic immutable transport object bytes survive native restart in the Node test controller, not a worker heap or inbox metadata. Current permission and namespace/epoch are captured before first retrieval and rechecked in admission; final canonical write, ACK and cleanup use one transaction, including duplicate receipt cleanup. Partial returns revalidate exact claim rows and generation. Missing causal parents produce explicit waiting_for_parents plus nextCursor; UUID sort is not assumed causal. An actual reverse-lexical two-edit replay proves cursor progress and retry without early ACK.

The 256 KiB exact metadata budget (including serialized budget row and every group ID) and 512 descriptor local window are candidate bounded resource limits, not whole-corpus protocol capacity. Accounting mismatch refuses work; cleanup removes only stale epochs/namespaces in bounded explicit batches, no TTL or remote deletion. Existing 96-history/128-operation/full-closure limits and generic/checkpoint rejection remain. Default publication and production wiring remain unchanged.

## Actual verification

- Complete browser-native-sync-* owner files: 312/312 PASS, 0 skip/cancel, 5192.517334 ms; /tmp/inbox-sync-regression.log.
- Inbox owner plus existing native compiler and receipt whole files: 30/30 PASS, 1053.963416 ms; /tmp/inbox-owner-compiler.log.
- Independent reviewer actual inbox owner: 20/20 PASS, /tmp/sync-inbox-independent-first.log (1.060 s). Final independent runtime/native/receipt review APPROVED: five source hashes and two artifact hashes actually matched; old 17 cases, new 20 cases and two-restart network evidence reviewed without repeating browser runs.
- Original complete receive native file: source/release 2/2 PASS, 21687.048166 ms; /tmp/inbox-native-first.log. Every variant preserves original 17 exact cases and adds 20 inbox cases. Original strict seven-file receipt remains; inboxHashes additionally binds all eight runtime dependencies. Source/release hashes and case names match. Each variant has two actual distinct worker lifetime transitions with the full paused-before-stop network ledger and zero external attempts/HTTP requests. The second restart resumes a partially staged publication using the real IndexedDB owner.
- Package static audit: 12772 checks /385 resources PASS; /tmp/inbox-package.log. Static audit is not account/device validation.

Actual inbox cases cover delayed same-value restore, namespace changes, consent revocation, missing/corrupt remote objects, Source purge and local edits, corrupted/exact-limit/overflow accounting, shared descriptor group retention, canonical and finalizer rollback, duplicate cleanup, concurrent claim invalidation, receiver recreation and noncausal UUID ordering. The expensive publication measurement is preserved in SYNC-WORKING-INBOX-EXPERIMENT.json; it is synthetic fake-IDB sizing, not native throughput or a product SLO.

## Preserved failures and limits

/tmp/working-inbox-before.log preserves missing-method negatives. /tmp/working-inbox-first.log exposed repository max-page 100 versus requested 513; final bounded scan uses legal pages and proves overflow refusal. /tmp/working-inbox-ten.log contains an invalid consent(false) test setup, corrected to existing setEnabled(false); that failure is not a product defect. Earlier measured arbitrary group/body caps were withdrawn in favor of exact refs-only accounting. No old failures are relabeled pass. Hosted CI admission for the new inbox fields is future coordinator work, not claimed here. No paid calls, user data or full recovery are involved.

## Historical author source bytes — before strict CI integration

- `core/browser-native-sync/input-working-commit.js`: `cfd7f982152c9e4bd0fb2475b95743cc3d8395f21e7810e57d649b9353419714`
- `core/browser-native-sync/input-working-inbox.js`: `93de1d353fae87d02fa5e3b03f4586d165008c2708102a636826502ee51107d0`
- `tests/browser-native-sync-input-working-inbox.test.mjs`: `e0d914250e205e824b591e3cbaa60ed785f475d6684b820e41bf0cd47fede38f`
- `tests/native-sync/input-working-receive-fixture.mjs`: `b4c0dda88684e1770fa0c4ac441d8c05da6496ca2926cf54c479b6ee576964d4`
- `tests/native-sync/input-working-receive-chrome.test.mjs`: `966a994b1c6466e9c33a9f43337ffa682da696e247170d4076fc0374672aa171`

## Native artifacts

- `work/qa-bns-input-working-receive/source.json` SHA256 `d68653945051d9b11f23d5e80513ed5894a038c69e3dcd554e07a0f44477e985`. Runtime head/tree fields identify base; the above source hashes bind uncommitted implementation.
- `work/qa-bns-input-working-receive/release.json` SHA256 `e1df11a8270beef6b39aebd05058349e01b89034c8f0730ae28d12d30188ca91`. Runtime head/tree fields identify base; the above source hashes bind uncommitted implementation.


## Coordinated 0.30 strict admission

The earlier native-test hash966a994b belongs to the author checkpoint above and is preserved with its original artifacts. Strict integration at2d7c5cc9 changed that test to validate final inbox evidence; its SHA-256 is `09d6796d6c35faa298f336bf4da3c88322b487212bab73c56c6c168beabe9cfa`, unchanged through hosted head290ae884. The author hash is not asserted to describe this later test. Runtime hashes above remain unchanged; each following receipt retains its own tested head/tree.

This is SYNC-01 local foundation work, not canonical SYNC-03 production hardening or a Chrome account connection. The preceding design document remains the historical proposal; implemented behavior and exact scoped proof are recorded here.

Current integration adds no job or timeout: both existing Full/Candidate native jobs now require the original17 exact receive cases and7 original hashes, plus20 exact inbox cases and8 exact hashes. They recompute all8 current checkout hashes and compare source/release. The second restart must follow the first lifetime, preserve the entire prior zero-network ledger prefix and both paused observations, with no open native transaction. Final PASS and strict validation occur only after all inbox evidence exists.

Three added receipt negative tests first failed against the earlier permissive validator (`/tmp/030-inbox-receipt-negative.log`); final strict guards23/23 and combined Sync/receipt/compiler/version owners332/332 passed3447.55ms (`/tmp/030-combined-unit.log`). Independent review validated both actual author artifacts with the new validator and all8 current production hashes. Independent review exposed an omitted0.30 Backup producer whitelist update; old24/26 failure is retained, then exact version boundary was extended through30 with31 still rejected. Final independent26/26 plus the correct historical version owner1/1 passed. No backup schema or format change. The matching0.30 package builds405 files. Candidate/exact-main hosted gates remain required; no delivery, provider or physical-device claim follows from local evidence.


Final committed local candidate `2d7c5cc9db140536b199537b7e3d9bbf4f36b8dd`: all six complete native storage/publication/retirement/Context/Working/receive files passed42/42,0skipped/cancelled,97.876603958s (`/tmp/030-native-combined.log`). The actual Full workflow inline block was extracted unchanged and executed with that exact head/tree against all six receipt families, including the new inbox fields: PASS (`/tmp/030-native-inline.log`). These are synthetic local native-browser proofs; no cloud connection, full restore, deployment or installed-device acceptance is implied.
