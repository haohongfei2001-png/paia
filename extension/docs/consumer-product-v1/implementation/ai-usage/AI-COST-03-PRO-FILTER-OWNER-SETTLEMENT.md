# AI-COST-03 — original Pro Filter qualification, settlement and visibility

Scoped successor to the separately archived P1 checkpoint, 2026-10-18. The current implementation follows AI_USAGE_PLAN §5 and the original SmartFilterStore, Repository and AIUsageFoundation owners. It does not establish full Maintenance, live-provider quality, commercial entitlement deployment or whole-product completion.

## Original authority and acquisition order

The source session first obtains the original authenticated reservation through prepareChild. It then selects the exact existing bounded Filter scope, independently resolves an additional processing receipt for at most eight candidates and two neighbors, and calls the source-private synchronous authorizeFilter(scope, qualification). The additional receipt covers only those selected Inputs' body and note, exact job/child/principal/library/consent identity and Filter units. Original processing currentness, expiry and revocation are checked before and after each original qualification read. The service payload still contains its original body-only material; the additional note grant is qualification authority, not model payload or provenance. No additional provider request or physical retry is introduced.

Original Source annotations are distinct from current Input note. The private facts capture projects Source rows to id plus originalText only, while retaining original recordIndex/tombstone identity and restrictions separately. It does not enumerate, serialize or clone Source note, editedText or chat title. Canonical Working block text consists of the independently granted libraryText/body and note fields; other captured rows contain the original qualification's metadata.

## Exact original settlement fence

The original Filter owner retains only the facts acquired by its bounded existing qualification. It freezes every expected Filter row and the exact allocator result before the first put. The same joined transaction checks exact Source/Working/protection/neighbor facts after the original writes and again after Foundation ACK, receipt, job and final NO_CHANGE counter writes. No crypto or scope expansion occurs in the transaction. The global decision sequence may advance between independent operations; its current value is frozen before this operation's writes and checked exactly at settlement. Candidate semantics and prior operation results are never refreshed from live rows.

Private facts include authorized text, so they have a separate explicit budget: 65,536 UTF-8 bytes per serialized row/key, 589,824 total bytes, at most 92 unique get facts and 16 count facts. The total spans the entire capture, including store/key/count-range encodings, and is checked before cloning retained facts and expected-after rows. It is additional to the original 65,536-byte body-free decision proof and original candidate/body limits. A short current neighbor backed by an oversized Original Source is honestly unavailable. Oversized data is not truncated or partially acknowledged.

## Publication and read-only visibility

The original Filter writer creates an opaque private publication binding its exact operation, decisions, original proof, scope, epochs and policy. Its reader requires the original Repository transaction record to prove actual successful completion and callback unwind; a synthetic complete event, callback still running, aborted transaction, copied token or another Store cannot expose it. The new requireRepositoryTransactionSucceeded helper leaves the existing BNS native-only requireRepositoryTransactionCommitted contract unchanged. Native transactions additionally require the original trusted native completion evidence.

Foundation creates a second private settlement attestation only after the exact Filter commit, all ACK/receipt/job/counter writes and the original final fence in that same transaction. It binds the exact publication object, Foundation, transaction, job, child and units. Its reader likewise requires the original completed transaction. A genuine older ACK cannot qualify a different later direct-owner token.

The session publishes only after actual committed coverage and passes both capabilities to the source client. The client independently checks the durable exact ACK/receipt/row evidence and rechecks currentness after asynchronous reads. It then retains a separate read-only visibility lease and releases the completed write capability. hidden() resolves only this dedicated visibility path when supplied by the source authority; it takes operation and decision from the actual Filter row. Visibility cannot prepare another write or dispatch. Legacy direct-owner tests without the optional hook retain their previous compatibility contract.

Storage rollback leaves no readable publication or ACK. The same validated response can retry locally without a second provider call or decode. A lost local return after actual joined commit can recover from the original durable ACK and exact private attestation. Publication expiry, consent/processing revocation, identity disconnection or generation change restores visibility and cannot renew or reconnect an old decision. The source identity observation currently bounds this visibility lease to its original short lifetime; this is not qualification of long-lived product filtering. FILTER may legitimately invalidate a still-pending Context operation under the original isFiltered rule, while KEEP allows the covered same-response Context retry. The source receipt records this remaining combination boundary.

## Failure evidence retained

- `/tmp/paia-filter-final-facts-red.tap`: 24 actual settlement drift failures, all COMMITTED where PARTIAL was required; SHA-256 `958534b63c51ac24cf52fe5fc1a0037cf9c0c9c8c46b3c57871c0ccbd2df8b3c`.
- `/tmp/paia-filter-final-counter-red.tap`: eight actual final NO_CHANGE-counter drift failures; SHA-256 `0fdfe3a401506a739a7cb7177a5420577101c3ffee19e0bd5c3d48c9acb19488`.
- `/tmp/paia-filter-visibility-original-red.tap`: read-only visibility failure plus separate legacy write-grant control; SHA-256 `3cbc954688f836ef1b4b826c924ee520213bab7a3a56a0ad811cc9fbb5f95f3a`.
- `/tmp/paia-filter-publication-sequence-budget-red.tap`: synthetic-complete exposure and independent allocator regression; its initial oversized candidate fixture failed earlier at authored eligibility and is not evidence of oversized acceptance. SHA-256 `ba3018c037e38a88edf45c43de1a08a7b51a3e5ef9be4ea73f55b118a780eab1`.
- `/tmp/paia-filter-oversized-source-red.tap`: corrected short-current-neighbor/long-Original-Source acceptance failure; SHA-256 `c22bacd5b16a717f40affcf52eff603732ce9f3b196df52e7f0286bf25e43d9e`.
- `/tmp/paia-filter-ungranted-note-red.tap`: two actual ungranted candidate/neighbor note getter acquisitions; SHA-256 `bfc0d5f42782ffd4614356c1268618e3985c5c2957afe1b38a992e56cef6b606`.
- `/tmp/paia-filter-legacy-source-fields-red.tap`: two actual unselected Source note/editedText getter acquisitions; SHA-256 `967f0e9005eafaa07391b7dce2cdb0fad66eef6fd030e4b52cbd894273dc5d08`.

These are separate historical failures, not additional final case counts. The final 44 drift cases comprise FILTER at three settlement stages × four drift kinds, plus KEEP and INSUFFICIENT at four stages × four kinds. The fourth stage is the actual final NO_CHANGE counter. The 25 publication/budget cases include exact 64 KiB and one-byte overrun, shared cumulative budget, eight-candidate/two-neighbor legitimate commit/replay, abort and synthetic-complete controls. Six field/currentness cases retain actual positive Filter ACK/one-call checks and expiry/revocation zero-following-text checks.

## Frozen local evidence and identities

Final complete owner combination: 183/183 PASS, 9,177.392999 ms, zero failures/cancelled/skipped/todo. Command runs the unchanged original 50 owner and 54 session cases, new 44 settlement, 25 publication/budget, six field/currentness and four separately documented expiry lifecycle cases. Log `/tmp/paia-filter-owner-final-183-v2.tap`, SHA-256 `c4e2e6104f315b88b648daec80d43e290c5c1460bc9bccaf37b039f2060e05fa`. Before/after full core inventories compare equal at `/tmp/paia-filter-owner-final-v2-before.sha256` and `...-after.sha256`.

Runtime SHA-256:

- ai-filter-owner.js: `953f4864572521ec6bcceee2be2a825a69a7a01822c797a1f7c3d40aaea9a673`
- local-maintenance-session.js: `59042d276f6929fe53780f6ce803168681da31593edfbb54d0d4ea260486a379`
- foundation.js: `bdb4b2bc9032625ad0d9c3f8b7b37771adfc3fbc242228f46fd6b9ff43895f74`
- idb-repository.js: `5b727eace979bdc61f2b6043a64fcc1f486fe80630f1cb57f5d1fe2da9c9fa8a`

New test SHA-256:

- ai-filter-settlement-facts.test.mjs: `fe5498c648941d15116ae00f5abbcf4f85e61682431c4736b61b45b5c1149d92`
- ai-filter-visibility-publication.test.mjs: `1be3de9229e586701fc70bf51ea3c9a61bd7a87e5b17f775a39185a4729ddf6d`
- ai-filter-field-grant.test.mjs: `61ba5eac9b7de0fe89bbf1ff2faa023bd3ceb54a9f386cf735e2803453a9dfcb`

The separate source authority suite and receipt own authenticated-client, identity, consent, source ACK and old-ACK/new-token evidence. Native 148/148 belongs to the earlier separately frozen two-child oracle and original synthetic mapper; it does not qualify this new Filter runtime. Current evidence is synthetic Node/fake IndexedDB, not live entitlement/model quality, installed runtime, native successor or full acceptance.

An additional broader original Context regression run remains explicitly failed: `/tmp/paia-filter-shared-owner-regressions.tap`, SHA-256 `6704095fa05dc7538181f412c3de7222c3a3b2a60d08dd83f10ab3f97bc701d3`, 523/527 PASS. Four original Context early-restriction cases observed two Input/Source acquisitions before rejecting off_scope/input_deny/topic_never/tombstone. That separate P1 preflight gap and its field-grant audit require a successor and are not closed by this Filter suite. Existing idle storage-retry handle cleanup still occurs on next access or host revoke/dispose, not automatically at idle expiry; see its separate receipt. No background timer, installation, provider activation, credentials, deployment or new Sync was added.
