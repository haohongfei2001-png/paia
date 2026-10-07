# Browser-Native Sync — normative product and architecture contract

BNS-1.0 · 2026-10-07 · design contract, not shipped capability.

Authority: [ADOPTION](BROWSER_NATIVE_SYNC_ADOPTION.md). UX: [UX](BROWSER_NATIVE_SYNC_UX.md). Delivery and unresolved qualification: [PLAN](BROWSER_NATIVE_SYNC_PLAN.md). Official platform sources, designated G/M/A below: [REFERENCES](BROWSER_NATIVE_SYNC_REFERENCES.md).

MUST/MUST NOT express required behavior. Initial engineering profiles are explicitly provisional until their specified tests select them. A missing capability is a release gate, not permission to broaden cloud access, discard canonical state or manufacture success.

## BNS-01. Truth, boundaries and architecture

Canonical truth is PAIA's versioned entity/revision/intent model. A local database and a cloud copy are materializations, not independent merge authorities. A cloud object's latest modified time, ETag or provider version never chooses the correct human edit.

```
Existing canonical domain owners and trusted transactions
                 |
        Portable entity codecs + transactional outbox
                 |
          One provider-neutral Sync Core
    identity / revisions / intent / merge / segments
    checkpoints / restore / deletion / retry / validation
                 |
          One Cloud Adapter contract
     Google Drive | OneDrive | native CloudKit bridge
```

Adapters do authentication, app-container-contained list/get/put/delete, object completion/version/cursor handling and typed provider errors. They do not own business entities, source arbitration, conflict resolution, user permission or another database merge. CloudKit record representation is transport metadata plus opaque assets, not a third native business schema. No whole IndexedDB overwrite and no cloud file per Input.

The Core has no DOM, Chrome-specific account API, Swift UI, cloud SDK or server dependency. Its persistent operations are host-neutral. The extension initially runs one shared Core; Safari's native layer handles Apple transport. Future mobile/desktop hosts either reuse the Core or pass the same conformance vectors with a compatible implementation. First-party MyWrite/voice source identities remain first-party, not impersonated AI messages.

Browser profile login is neither cloud consent nor evidence that the chosen OAuth subject is the same account. v1 defaults are Chrome/Drive, Edge/OneDrive, Safari/iCloud. `host` and `provider` are separate capability fields; no ordinary unsupported cross-provider selector appears. There is no PAIA account or content backend.

## BNS-02. Dataset, installation and account binding

A dataset has a random opaque `datasetId`, protocol version and lifecycle. Each installation creates a random opaque `deviceId`; reinstall creates a new one. Neither derives from email, a provider subject, a hardware serial or an old device approval. Device ID is operation provenance, not cryptographic proof of a trusted physical machine.

An active binding is `(provider, verifiedProviderSubject, application/container identity, datasetId, bindingGeneration)`. Provider subject is verified through the relevant platform authentication path. Display email/name is optional metadata, never the binding key. Local queues, remote IDs and cursors are namespaced by that binding. A different account cannot inherit an old queue merely because it is now the browser default.

Every I/O batch and its local completion revalidates binding generation and authenticated subject. Account-change notifications invalidate in-flight work and pause scheduling. Platforms do not expose all account-switch events identically: the guarantee is **no old dataset transfer to a newly authenticated different subject**, not an unsupported promise of instantly observing every browser profile edit. New-token acquisition and process resume always recheck; late responses from an old generation cannot attach to a new binding.

On account change, retain local content and the old remote reference; offer reconnect original, remain local, or explicitly use another account. Creating a new-cloud copy requires clear confirmation of whose account will receive all relevant local content. Check its existing remote state before transfer. Do not merge account A and B, infer identity from email aliases, or call sign-out authorization to upload elsewhere.

The application identity must remain stable across release/reinstall: extension/OAuth client and app-data association, Entra registration/app-folder association, or Apple team/container/production environment. Development and production CloudKit datasets are different. Packaging identity changes require explicit compatibility planning; same human account alone is insufficient if the app starts using a different remote namespace.

## BNS-03. Portable canonical scope

A versioned codec registry specifies entity keys, exact body encoding/hash, parents, references, ownership/protection, lifecycle/tombstones, allowed author operations and migration behavior. Sync MUST NOT enumerate arbitrary database stores or meta rows as user truth. It serializes logical entities, not their incidental current storage layout.

| Family | Portable canonical state | Excluded or special boundary |
|---|---|---|
| Source and source structure | Stable source/provider/message/conversation/project identities and lawful source facts, immutable original payload, evidence-qualified metadata/time, branch/provenance links and permanent source fences | Navigation/search materializations are rebuildable. Unknown time remains unknown; capture time is not original send time. Conflicting immutable payloads under one identity are integrity failures, not last-write wins. |
| Working Input and independent Thought | Exact committed body, revision ancestry, visibility/exclusion/removal intent, legitimate independent authored Thought and necessary provenance | Archive and Thought references to the same Working Input synchronize one body. Detached/protected independent Thought is not silently collapsed. Ambiguous legacy body binding retains B-01/B-02 protection. |
| Revisions and conflict state | Required human version history, parent/digest identities, unresolved sibling versions and explicit resolution operations | A checkpoint cannot erase unresolved branches or rewrite chronology. Permanent purge removes covered body-bearing history while retaining body-free deletion fences. |
| Personal Topic / Section / Placement | Stable identities/default Sections, names, durable order, membership edges, aliases/redirects/lifecycle, established AI-managed identity facts, explicit human moves, pins, keep-separate, negative membership and never-recreate intent | One Placement per Entry within a Topic, references across Topics. Human order survives. Hidden formation candidates, viewport geometry and transient reading headings are not permanent Section truth. |
| Protected saved work | Lawfully retained human-edited/adopted AI artifacts and their protected versions where current ownership makes them durable | A paid or non-reproducible saved human artifact is not discarded as an expendable cache. An unprotected ephemeral reading projection does not gain durable structural authority. |
| Context Items | Independent Info/Rules/Now Items, manual bodies/edits, order, protection and removed intent, with legitimate body-free provenance references | Current code only implements manual Info. Future codecs cannot be marked implemented early. Items do not reverse-write Source or clone Topic bodies. |
| Context desired access | Card/Topic desired access selections and durable negative/removed intent keyed by stable identities | No live global access acknowledgement, connection grant/token, operation receipt, trusted device consent or access epoch is imported as active authority. Restoring desired scope never reopens an external AI. |
| Prompt user work | Manual reusable template bodies/overrides, pin/manual order, hide, representative choices and family split/do-not-merge corrections | Automatic family clusters/rank/use projections rebuild. Content-derived family IDs need stable manual-work mapping. Orb position/open state per host and Stage 3A reply/candidates remain local/ephemeral. Prompt edits never edit historical Inputs. |
| Consumer preferences | Explicit language, appearance, supported body size/reading width, time-display and Smart Filter preference values | New-install defaults do not overwrite existing explicit values. Capture consent, new website permissions, paid processing authorization and device-specific protections are not auto-enabled. Unsupported display values remain stored and use a local safe rendering fallback. |

Derived search indexes, semantic cache, runtime task state, diagnostic cache, DOM/hover/selection/scroll, Revisit cursor, unsaved composition/recovery drafts, cloud credentials, remote SDK session state and browser-specific UI geometry are not portable canonical truth. Local processing can rebuild them without another authoritative body copy or hidden paid call.

Existing local removal/exclusion, permanent deletion, permission denial and author-protection are distinct typed intents. Do not turn an ordinary Topic access switch into permanent source purge, or a local data reset into a cross-device deletion operation.

The codec registry includes a coverage manifest. A reader that lacks a populated required family/version MUST preserve the remote objects and refuse a claim of full restoration. No "MVP complete" statement may silently exclude existing Context or Prompt work. Missing future product capability blocks that capability's integration, not all independent Core work.

## BNS-04. Revisions, operations and deterministic safe merge

Each committed logical operation carries protocol/entity schema, dataset, entity ID/type, unique operation ID, installation ID and sequence, immutable parent revision IDs, payload/reference hashes, operation kind, explicit actor/authority, and lifecycle/intent data. Timestamps are provenance/display evidence only. Sequences order one installation's operations; they are not cross-device clocks or edit authority.

Store an exact operation-ID -> digest receipt. Same operation/digest is idempotent; same ID/different digest is a hard collision. Track each device's **contiguous accepted frontier plus holes and known operation digests**. Receiving sequence 12 before 11 must not discard 11 later. The historical `replayDecision(lastAcceptedSequence)` helper cannot be used unchanged as an unordered-cloud replay policy.

Content hashes identify bytes, not full revision identity or authorization. Two revisions with the same text may still have different parentage, removal intent or protection. A revision ID covers its canonical envelope and references as well as its payload. No Unicode/newline/paraphrase normalization of user bodies is allowed for dedupe; search normalization is derivative only. Unsupported encoding must fail safely, not be repaired silently.

Merge rules:

1. Validate namespace, schema, complete referenced content, intent authority and deletion fences before considering merge. Quarantine malformed/colliding objects; do not partially apply them.
2. Permanent covered deletion dominates stale content and revision replays. It cannot be reversed by ordinary restore, an old Source, an AI projection or a high sequence number.
3. Identical canonical operations dedupe. Proven descendants fast-forward; proven ancestors do not replace descendants. Traverse necessary parent closure rather than comparing only the immediate base hash.
4. Independent field/edge operations commute only under an explicit entity rule with proven independence. For example, a protected rename and a lawful additional membership need not conflict. Same-Entry structural moves/order cycles or overlapping human body edits do not become independent just because storage rows differ.
5. Concurrent human bodies and unprovable ancestry preserve all live siblings, then ask only for the affected choice. No latest-time/arrival/max-sequence/longest-text/AI silent winner. Unrelated entities continue synchronizing.
6. An explicit resolution is a new revision referring to every resolved parent, not deletion of evidence to hide the conflict. A stale choice is revalidated before commit. "Keep both" is offered only where a safe second human object exists, such as an independent template/Thought; it never creates two incompatible immutable Source payloads under one ID.
7. Concurrent permission changes keep restrictive effective access until resolved. Names, aliases, redirects, merges and additional placements cannot union grants or expand external eligibility. An imported desired range is not a connection authorization.

Duplicate bootstrap source identities must match exact original data/provenance before dedupe. Similar words, similar names, model confidence and a common cloud account are not proof that separate human objects are identical.

## BNS-05. Transactional local integration

Existing trusted domain services remain sole writers of canonical content. UI and provider adapters cannot write IndexedDB directly. Extend the existing durable repository transaction to commit the domain revision, operation digest and portable outbox entry atomically. Compute expensive serialization/hashes outside a live IDB transaction, then recheck the read revisions inside the committing transaction. A save acknowledgement follows actual transaction completion.

Outbox records are replayable after worker termination. Segment construction reads a consistent committed cut; a new edit is queued for a later segment. Persist prepared payload identity and upload outcome before discarding a queue item. Only verified publication acknowledgement may advance the local uploaded frontier; a request timeout is an unknown outcome, not a new operation.

Remote application uses the same validated ownership and revision path with `origin=remote`, producing no echo operation. Applying canonical state, its receipt and the contiguous frontier is one durable transaction or a bounded staging generation activated atomically. Permission invalidation reaches trusted release/read boundaries, not merely visual switches. Existing active EditorSession/IME/unsaved text cannot be overwritten by background re-render.

Actual code integration must account for Source/records and structure, blocks/Working Input, independent Thought and Library stores, revisions/tombstones, Topic intent, `meta/prompt-reuse:v1` and `meta/context-cards:v1`. Context's current `context:` command receipts and recovery epoch are local. The current Backup allowlist is neither a complete BNS serializer nor permission to sync all meta/receipt rows. Choose minimal new durable journal storage by measured need and the existing schema/receipt discipline; this document performs no migration.

## BNS-06. Segment and integrity protocol

A **Sync Segment** is an immutable, bounded batch of canonical operations/revisions. Its logical identity is independent of the provider filename/record ID. Names and searchable provider metadata contain opaque IDs and format facts, not user text, emails, Topic titles or prompt bodies.

The envelope specifies magic/protocol/entity coverage, dataset, producer, segment ID, represented sequence ranges, operation count, codec, exact encoded and decoded byte counts, content digest, required object dependencies and publication generation. Gzip is an optional explicitly identified codec; uncompressed is supported. Unknown codecs, excessive expansion/count/depth and trailing malformed material fail before activation. SHA-256 integrity detects accidental corruption; without a separate secret trust root it is not proof against a malicious cloud account/provider that rewrites both content and hashes.

V1 uses `clientEncryption=none` under the explicit provider-trust model. TLS and provider storage protection are not relabeled PAIA client encryption. A future encrypted format requires a new approved recoverable key model, not an unimplemented key-recovery placeholder.

**Size selection is a measured engineering gate.** SYNC-01 benchmarks 64/256/1024 KiB packing targets. An initial conservative candidate cap is 1 MiB encoded, 4 MiB decoded, 512 operations, two concurrent decoded segments. These are proposed parser/memory/request-amplification controls, not discovered provider limits or measured optimal values. At an assumed 8x in-memory parsing/object expansion, two 4 MiB decoded buffers already imply about 64 MiB before indexes; measure actual peak allocation and reduce the cap/concurrency as needed. Freeze and record a compatible versioned profile before real provider data transfer. Never rely on a 50 MB archived asset limit as a safe memory budget.

A body larger than the segment budget is losslessly split into bounded content chunks referenced by one logical revision. All chunks and references must validate before the body is visible/committed. This does not create one remote object per ordinary Input. There is no truncation or hidden unsupported long-body threshold.

Publication: prepare immutable payload/chunks -> upload under stable logical identity -> verify provider completion, length and digest by a qualified read-back/checksum path -> publish a bounded immutable commit descriptor last. Only published complete descriptors are candidate truth. Heads/cursors are discovery accelerators, not global authority. A manifest does not have to be a single mutable global file; descriptors/index pages are bounded. Drive names are not unique, so physical duplicates with the same logical ID/digest dedupe; a divergent duplicate quarantines. Failed/orphan uploads are collectible only after proving they are unreferenced, not merely old.

Each upload/download interruption, extension update and process death is resumable by durable logical state. No cleanup runs on a guessed success or wall-clock age alone. A checksum mismatch produces a corruption state, never a user-facing choice between an intact and corrupt body.

## BNS-07. Discovery, checkpoints and compaction

Listing is paginated to a real end within the authorized app namespace. Provider cursors/change tokens are opaque optional accelerators; expiry/reset requires bounded rescan. A scan that failed or stopped at its first page cannot establish absence or completeness. No assumption that all providers expose a linearizable global snapshot, unique names, app-folder-compatible root delta or one universal per-device timestamp.

A checkpoint consists of immutable bounded shards plus a final manifest/commit descriptor. It covers a known closed causal frontier, entity/codec inventory, canonical revisions and reference closure, human intent, unresolved conflicts, redirects and body-free tombstones. It records parent generations and covered operation ranges/holes. It is not an IndexedDB dump, nor a replacement file where newest upload wins.

Concurrent checkpoints may represent incomparable frontiers. Discover and merge their nonoverlapping operations and required descendants. Never select one merely by generation integer, timestamp or arrival. Head files may be rebuilt from published evidence. A checkpoint with missing/corrupt shards is not usable.

Compaction first builds a verified equivalent checkpoint from a stable known cut while later writes continue as tail segments. It verifies semantic equivalence, exact bodies/versions/intent and reference closure before marking covered segments eligible for collection. The initial redundancy policy retains two verified complete checkpoint generations and all uncovered/pinned tail objects; this is redundancy, not a promised backup retention service. No segment is collected if required by an active restore, an unresolved branch or an uncommitted replacement generation.

A compacted floor never lets returning old devices recreate deleted content. They first acquire the retained checkpoint/fences, reconcile their unsent local operations with proven ancestry and then publish. Missing old ancestry stays unresolved rather than being assumed safe. Body-free permanent deletion/negative-identity fences have no ordinary TTL. Any future bounded fence collection requires a separate proof that all future stale imports/devices are excluded; inactivity alone does not provide it.

Schema readers negotiate supported required codecs. Older clients must refuse unknown mandatory data, not rewrite the dataset with their smaller known subset. A rollback cannot discard later human work or remove a permanent deletion fence.

## BNS-08. First enable and new-device recovery

After explicit provider confirmation and verified subject binding, preflight local state, remote inventory, compatibility, available local space and required entity coverage.

| Proven condition | Required automatic behavior |
|---|---|
| Local nonempty; remote has no existing or retired PAIA dataset | Create a new dataset binding, bootstrap canonical revisions/outbox and publish a verified recoverable cloud generation. No upload/download questionnaire. |
| Both empty | Establish the binding and an empty canonical dataset; stay normally usable. Do not manufacture Topics, Context or prompts. |
| Local empty; existing compatible remote | Restore automatically. User sees recovery progress, not a backup file chooser. |
| Same dataset with different progress | Fetch missing causal ranges and merge incrementally. Human conflicts alone require attention. |
| Unbound local data plus existing remote | Prove identity compatibility, exact duplicate equivalence and safe independent union before attaching. Different local dataset IDs alone do not require a questionnaire if a safe union is proved. If identity/intent/ownership cannot be reconciled safely, keep both intact and explain the narrow conflict. A previously account-bound dataset never qualifies as an implicitly unbound copy. |
| Previously bound remote disappears or has a retirement marker | Pause. This is not fresh empty-cloud onboarding and must not trigger automatic re-upload. |

New-device sequence: install -> activate Sync -> provider confirmation -> verify account/app namespace -> inventory all published generations -> select/merge a complete causal recovery base -> download and validate shards/tail/dependencies -> apply to bounded staging -> validate exact canonical coverage and deletion/permission invariants -> atomically activate -> rebuild search/cache locally -> report restored/synced truthfully. The new installation has its own device ID and no old-device receipts or secret.

Restoration is allowed to make already validated local content useful before derivative indexing finishes, but the UI must distinguish `content restored / search rebuilding` from fully ready. Missing canonical content is not cache rebuilding. During restore, preserve any existing local dataset and dirty editor; failure leaves it usable. New local edits are either safely held outside the staging cut or the relevant destructive transition is blocked with a clear explanation, never overwritten on activation.

Context desired access and Items are restored, but actual external connections/access acknowledgements start inactive on the new device. Reading restored local Items must not require pretending that cloud consent is capture/AI-processing consent; resolve the current service's consent coupling in its trusted owner. Restoring data is not an instruction to buy processing or regenerate AI content remotely.

The promise covers verified committed remote state, not unknown unsent edits on a lost device. Same account with all app data manually erased is not recoverable merely from the provider login. Provider revocation, retention and account recovery remain provider policies, clearly separated from PAIA behavior.

## BNS-09. Common Cloud Adapter interface

The conceptual interface below is a contract, not implemented symbols:

```
authenticate(userGesture, expectedSubject?) -> VerifiedBinding
observeAccountChange() -> invalidation signal
capabilities(binding) -> qualified limits/cursor/conditional-write features
list(binding, cursor?, namespacePartition?) -> page + nextCursor + complete
get(binding, objectRef, range?) -> bytes + completion/version metadata
putImmutable(binding, logicalId, bytes, digest) -> completion or unknownOutcome
publishDescriptor(binding, descriptor) -> completion or unknownOutcome
deleteObject(binding, objectRef, expectedVersion?) -> confirmed/missing/unknown
forgetLocalAuthorization(binding) -> local result
revokeProviderAuthorization(binding, explicitScopeConsent) -> result or unsupported
translateError(error) -> typed safe error + retryAfter + scope + retryability
```

All calls pin bindingGeneration; object references are app-container-contained, not arbitrary URLs. Tokens, resumable-upload URLs and preauthorized download URLs are secrets. If a provider returns signed resource URLs, follow only its qualified trusted transport rules, do not send bearer credentials to an arbitrary redirected host, and never let UI content choose such a URL. Keep secrets out of filenames/logs/canonical operations. Check per-item partial failures; HTTP request success alone is not batch completion.

Core owns scheduling policy and semantic retry. Use bounded delayed batching after committed edits, process/foreground/network resume and a qualified periodic catch-up while the host can actually run. Respect Retry-After and cancellation; no heartbeat-dependent correctness or claim of continuously running an MV3 worker/closed Apple app. Push/webhooks are optional accelerators, not a PAIA backend prerequisite. No user-facing interval slider.

### Google / Chrome

Use the Chrome identity broker with a registered production extension OAuth client; no client secret in the extension. `drive.appdata` is the storage scope. Use a supported token-bound OIDC subject verification path (openid and minimal profile information only as needed), not email matching. Chrome `getProfileUserInfo` requires its relevant permission and reports profile metadata, not automatic consent to use Drive. `getAccounts` is not a stable-channel dependency. Sources G1/G2/G4/G5.

Only appDataFolder/space-contained objects are allowed. No general Drive file picker, full Drive scope, public sharing or trash-based recovery assumption. Resolve logical-object retries through stable IDs/digests, not filename uniqueness. Change feeds, pre-generated IDs, resumable paths and exact per-method scope behavior must be qualified before their optimization is relied on. Paginated contained listing is the correctness fallback.

Broker-managed token refresh is preferred; handle revoked/expired access by a user-initiated reauthorization flow. Clearing a local cached token is not proof that Google's project-level consent was revoked. Provider revocation can affect other clients/devices using that project, so do not silently perform it as a "this device only" action. Cloud retention after real extension uninstall/reinstall must be demonstrated, separately from deleting/uninstalling app data through Drive. Standard API usage and 2026 quota/billing changes are recorded in REFERENCES, not promised indefinitely free.

### Microsoft / Edge

Use a delegated public-client authorization-code flow with PKCE, exact registered redirect, state/nonce and validated issuer/audience/subject. The baseline consumer target is personal Microsoft accounts; work/school tenants are separately qualified rather than silently promised through broad tenant permissions. Edge does not supply Chrome's `identity.getAuthToken`; use its supported web-auth flow. Exact extension redirect/CORS/public-client registration is a live gate, not a made-up completed integration. Sources M1-M4.

Request only `Files.ReadWrite.AppFolder` for storage, plus necessary OIDC/offline-access scopes for the qualified auth flow. Do not request Files.ReadWrite, Files.ReadWrite.All, sites/directory-wide access or app-only credentials to fix a failure. Use `/me/drive/special/approot` and its contained descendants. Initial approot access can create the folder; this does not prove an existing PAIA dataset exists. Do not treat a broad root delta endpoint as automatically usable under AppFolder scope; contained paginated listing remains required.

The current permissions reference labels delegated AppFolder preview even though the app-folder guide describes supported home/work/school scenarios. Record that qualification risk. Files are visible/editable/deletable by the user and accessible to other apps that already have broad OneDrive access. Ignore nonprotocol foreign files; validate protocol objects as untrusted input. Do not scan unrelated folders.

V1 token cache is trusted-extension session memory/storage.session only unless a separately qualified platform-protected persistent cache is adopted. It is not synced or exposed to content scripts; it is not claimed to be OS-bound encryption. After session loss, attempt only provider-supported silent SSO; otherwise require the provider's own reauthorization on a gesture. SPA versus other-client refresh lifetimes differ; one confirmation is not perpetual silent auth. Do not add a mandatory native-host setup just to hide this limitation. Token lifecycle UX is a production gate. No broad directory permission may be added to revoke all sessions; use a truthful local disconnect and an explicit provider-account authorization-management path when required.

### Apple / Safari

Use the containing app/app extension's native CloudKit access with the correct iCloud/CloudKit entitlements, container, production environment and shared app-group boundary. Use private database only; no public/shared database fallback. Native account status and container-scoped user identity, not Sign in with Apple on a website or an Apple-ID email string, determine binding. Account-change/unavailable signals invalidate the binding and all pending JS/native work. Sources A1-A4/A7.

Bridge only typed bounded transport requests and results between the extension and its native layer. Validate origin/caller, profile/local-dataset partition and binding generation; a content script cannot obtain arbitrary container access or credentials. Native code may persist transport receipts safely for lifecycle resume, but cannot become another business merge owner. Do not assume the containing app can wake and message every Safari extension profile continuously, particularly on iOS.

Use opaque segment/checkpoint assets with small metadata records in a PAIA private custom zone, with deterministic logical identities and server record versions as transport CAS only. CloudKit change tokens/notifications optimize discovery; expired tokens require re-enumeration. CKAsset upload completion and partial errors must be verified before publishing the common descriptor. The archived Web Services record/asset/request limits are not certified current native SDK limits. Current native payload, custom-zone enumeration, account-change and signing/distribution behavior must be qualified in SYNC-05. Built-in CloudKit business-record conflict handling must not replace Core conflict rules.

## BNS-10. Security and recoverability decision

**V1 chooses provider-private/app-scoped storage trust, not PAIA client E2EE or zero knowledge.** The provider controls authentication and storage recovery; TLS protects transport; provider storage encryption/access controls operate within their documented limits. Google app data, OneDrive App Folder and CloudKit private database are not identical privacy boundaries. In particular, App Folder is least privilege for PAIA, not invisibility from the account owner or already broadly authorized apps.

A new device obtains readable canonical objects after provider authentication. There is no lost PAIA decryption key. Storing a client key in the same provider namespace could add representation wrapping but would not provide zero knowledge against that provider/account; it is not used to market an E2EE claim. A future strict E2EE proposal must first solve recovery through an explicitly approved mechanism. "Key recovery later" cannot coexist with the v1 recovery promise.

Protect local execution with existing trusted worker/caller validation, CSP, bounded parsers, no content-script secrets and verified domain ownership. No private bodies/tokens in diagnostics. A checksum protects accidental integrity, not a compromised provider rewriting valid envelopes. Same-account authorized writers, a compromised browser/OS, stolen live tokens, a malicious provider or an app with independent full-drive access remain outside any claimed zero-knowledge protection. Do not imply device-level cryptographic revocation merely from deleting a display device record.

Cloud synchronization itself needs a distinct explicit egress consent describing the relevant user cloud. It is not paid AI processing, an external AI connection or permission to train/analyze the corpus. Reuse legal/region disclosure gates; do not quietly send data through a PAIA proxy or another jurisdiction/service when the selected provider is unavailable.

## BNS-11. Pause, disconnect and deletion

| Action | Local canonical data | Remote canonical data | Authorization / stale-writer rule |
|---|---|---|---|
| Pause | Retain and allow safe local work | Retain | Stop uploads/downloads, preserve binding; resume revalidates subject and remote fences. |
| Disconnect this device | Retain by default | Retain | Stop this client, clear its token/cache and active scheduling. Provider-wide revocation is separate if its scope affects other devices or is unsupported. Never label local forgetting as verified global revocation. |
| Delete only this device's data | Delete only after exact local risk confirmation and stopping writes | Retain | Do not emit canonical deletion tombstones. Warn specifically about unuploaded local work. Later reconnect may restore retained cloud data. |
| Permanent canonical content deletion | Apply typed domain purge across covered local generations | Publish body-free tombstones; purge covered cloud payload/history | Stale devices/imports cannot resurrect covered IDs. Ordinary removal/Topic access off is not this operation. |
| Delete cloud PAIA content | Retain this device's local data unless separately selected | Delete app-owned payload/history/checkpoints/segments through explicit high-risk flow | Retire binding/dataset before cleanup; retain a disclosed body-free retirement fence, stop writers and verify deletion outcomes. Other already downloaded copies cannot be magically erased. |
| Extension uninstall | Local extension data may disappear | Not intentionally deleted by PAIA uninstall | Actual provider/packaging retention must be proven. Same account can restore only a still-retained remote copy. |

Cloud-content deletion publishes a durable retirement marker first; conforming clients check it before and after publication and abandon old-generation work. Sweep interrupted/in-flight payloads with idempotent deletion and verify remaining known objects. A partial failure stays "deletion incomplete"; it is not success because the main manifest disappeared. Retain only the disclosed minimal opaque retirement/fence metadata necessary to prevent automatic rebuild, not private titles/body/evidence. Do not claim physical erasure of provider backups, recycle bins or devices outside PAIA's control.

If the user removes even remote metadata through the provider, a previously bound client still treats missing remote state as a pause/reconfirmation event. A completely fresh client cannot distinguish virgin cloud space from an externally erased history with no remaining evidence; disclose that inherent limit. Cloud reset is not permission to resurrect a deleted old dataset automatically. Recreating a copy is a separate explicit informed action, with a new lifecycle and lawful surviving local data, not a deletion bypass.

## BNS-12. Failure and success semantics

`已同步` requires a confirmed current binding, no unacknowledged committed local operations in the stated scope, a completed known remote discovery/apply cut and no undisclosed required-content failure. It means this observed synchronization cut is complete, not that every powered-off device has uploaded unknown work. Unresolved human items have an honest conflict status; unaffected data can continue.

| Failure | Core behavior | Ordinary message / action |
|---|---|---|
| No network | Preserve outbox and local work; resume when host/network allows | 等待网络；新修改暂时只在此设备 |
| Token expired/revoked or consent cancelled | Stop affected binding; no silent switch or upload; cancellation leaves local unchanged | 需要确认账号 / 未开启 |
| Provider quota | Retain local modifications; never drop history to make room without explicit policy/action | 云空间不足；管理云空间或稍后重试 |
| Throttle/outage | Bound retries; honor Retry-After; no busy loop or repeated login popup | 暂时无法同步；稍后重试 |
| Partial/unknown upload | Reconcile stable logical ID/digest before retry; no duplicate semantic operation | 正在等待确认；not 已同步 |
| Partial download/corrupt segment | Keep staging isolated; retry verified alternate copy or checkpoint; no partial activation | 暂时无法完成恢复 |
| Stale checkpoint/cursor expired | Re-enumerate and reconcile all necessary tail/generations | 恢复/同步 continues with honest scope |
| Remote manual clear/retirement | Freeze automatic recreation | 云端副本已不可用 |
| Concurrent human edits | Retain siblings; resolve only affected entity with current revision check | 有一项修改需要确认 |
| Clock incorrect | Ignore clock as merge/GC authority; keep provenance uncertainty | No fabricated chronology or conflict winner |
| Worker termination/extension update | Resume durable stage; preflight schema; protect active editor | Preserve current usable library |
| Missing local disk space | Stop staging before unsafe activation; preserve current generation | 此设备空间不足 |

No provider error message may leak token, account identifier, object URL or user body into public diagnostics. No retry launches a paid AI call. Exact data recovery, provider qualification, deletion convergence and native UX remain future tests under PLAN, not claims made by this documentation.
