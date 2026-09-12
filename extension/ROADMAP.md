# PAIA Roadmap

Status: **current roadmap source of truth**

Baseline: **v0.12.0 — Thought Evolution & Shared Context + post-release consolidation rounds**

PAIA is no longer in a phase where the main goal is to add more feature categories. Current priorities are product validation, Reader/Search/Revisit quality, trust-boundary hardening and keeping future expansion cheap.

## Decision rules

Across all rounds:

- Preserve Source / Working Input / Thought trust boundaries.
- Durable content schema is frozen by default; prefer projections/read models over new fact stores.
- Do not silently overwrite user work.
- Do not introduce hidden background Provider calls or automatic paid retries.
- Do not turn every capability into a separate page/database.
- Security decisions must live on trusted main paths, never in analytics side channels.
- Search/Reader/Revisit projections must not become new content truth layers.
- Retention work must create return value, not push-notification or opaque engagement machinery.
- A product-owner override may change implementation order, but it is not evidence that a product gate was satisfied.
- Multi-device work must follow `SYNC_CONTRACT.md`; a cloud backend may implement the contract but may not redefine merge semantics.
- Encrypted remote transport work must follow `REMOTE_OBJECT_PROTOCOL.md`; a backend must not require plaintext entity/device/revision metadata merely for convenience.
- Trusted-device/key-management work must follow `TRUSTED_DEVICE_PROTOCOL.md`; ordinary Backup, account passwords and server-readable secrets are not substitutes for a real key lifecycle.

---

## Round 1 — Product & Architecture Consolidation

Status: **completed 2026-09-12**

Delivered current product/architecture/roadmap truth sources, documentation authority, release guards and the default durable-schema freeze.

Engineering exit criterion: **met**.

---

## Round 2 — Reader & Unified Search Foundation

Status: **implementation completed 2026-09-12; executable engineering regression later certified by Round 4.8**

Delivered shared lexical Search Service primitives across Input, Thought and Context, ranking compatibility, CJK query terms, Unicode-safe excerpts and exact Input result → Reader positioning.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. Reader/Search advantage still depends on real-use evidence.

---

## Round 3 — Local Product Validation

Status: **instrumentation implemented and executable regression certified 2026-09-12; real-use evidence accumulation still pending explicit local opt-in**

Delivered local-only aggregate Product Signals, fixed privacy-preserving event taxonomy, 90-day aggregate retention and loop metrics for Input/Thought/Universal Search/Revisit/Context behavior.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. Real repeat-use evidence has not yet accumulated.

---

## Round 4 — Context Package & Minimum Passport

Status: **implemented 2026-09-12 by explicit product-owner override; product validation still pending**

Delivered the ephemeral Context Package contract, minimum metadata-only Passport Grant/audit, explicit preview → Grant binding, Backup exclusion and low-frequency management/export UI.

The tactical Round 4 security path was superseded by Round 4.5.

Product exit criterion: **not met**. Broader agent/API work remains unjustified without repeated Context reuse.

---

## Round 4.5 — Runtime Hardening & Context/Passport Architecture Cleanup

Status: **implementation completed 2026-09-12; executable regression/package/Chrome validation later certified by Round 4.8**

Delivered trusted `ContextPackageService` main-path authorization, Grant validation before protected Context reconstruction, Product Signals as observation-only metrics, and explicit Product/Passport/Context/Memory command ownership.

Engineering exit criterion: **met**.

---

## Round 4.6 — Reader & Search Productization

Status: **implementation completed 2026-09-12; current-browser engineering paths later certified by Round 4.8; product validation pending**

Delivered bounded Universal Search over existing Input/Thought/AI-organized projection reads, grouped results, deeper-result navigation, “以前的我” chronology and explicit Search → AI Context preparation without automatic build/share.

Engineering exit criterion: **met**.

Product exit criterion: **not met**.

---

## Round 4.7 — Revisit / Retention Surface

Status: **implementation completed 2026-09-12; current-browser engineering paths later certified by Round 4.8; product validation pending**

Delivered on-demand Revisit over existing local facts, explicit first-run baseline, newly collected Input resurfacing, Thought topics with new material, explainable older-material resurfacing, a lightweight device-local Reader cursor and privacy-safe follow-through metrics.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. Revisit still needs real voluntary return-use evidence.

---

## Round 4.8 — Release Certification & Real-use Observation

Status: **engineering certification completed 2026-09-12; real-use observation remains open**

Completed:

- current Node regression suite executes in CI;
- current release packaging and release/package guards execute successfully;
- targeted Chrome journeys cover Universal Search, Revisit, Search → Reader, Search → Context, Context Package and Passport paths;
- regressions found by executable validation were repaired;
- current certification provides a repeatable merge gate for present daily-use paths.

Still required for product evidence:

- explicitly enable local Product Signals on a real daily-use profile;
- accumulate repeat-use evidence over time;
- determine whether Reader/Search/Revisit produce voluntary reopening, rereading, copying or Context reuse.

Engineering exit criterion: **met**.

Product exit criterion: **not met**.

---

# Round 5 — Portability & Sync Readiness

Status: **gated overall; Round 5A, Round 5B, Round 5C and Round 5D were opened by explicit product-owner override**

The override changes implementation order only. It does **not** mean the broader Round 5 product prerequisites have been satisfied, and it does not open live multi-provider capture, cloud sync, Web/Desktop/mobile expansion or broad autonomous-agent access.

Prerequisites for broader Round 5 product work remain:

- core reread/retrieval/return loop has real-use evidence;
- Context/Passport direction is justified by repeated use if later work depends on it;
- current runtime tests remain executable and green;
- schema ownership and conflict semantics are stable enough to preserve user work.

## Round 5A — Second Import Adapter Validation

Status: **engineering implementation and synthetic contract certification completed 2026-09-12; real Claude export verification still pending**

Delivered:

- local-only Claude official-export structural projection alongside ChatGPT export import;
- bounded multi-adapter detection that fails closed on unknown/ambiguous formats;
- legacy low-cost fixed-adapter path remains available;
- non-ChatGPT Source identity is platform-namespaced while historical ChatGPT identity semantics remain compatible;
- only Claude human-authored text may become imported user Input;
- alternate/non-current Claude branches remain review-only;
- Claude records reuse existing Source → Working Input → Reader/Thought semantics;
- History Completion UI is adapter-neutral;
- no Claude permalink is guessed before real-source verification;
- no new durable fact store or IndexedDB schema.

Explicit limitations:

- Claude `realExportVerified=false` until an actual user-exported Claude file is tested;
- no live `claude.ai` capture;
- no Claude capture/network permission added;
- no claim that a second provider is already a retention or market-value driver.

Engineering exit criterion: **met at synthetic-contract level**.

Real-source exit criterion: **not met**.

Product exit criterion: **not met**.

## Round 5B — Sync Contract & Readiness

Status: **protocol/merge-contract implementation and certification completed 2026-09-12; transport and real multi-device sync not implemented**

Purpose: define how PAIA is allowed to synchronize before choosing a cloud/backend implementation.

Delivered:

- `SYNC_CONTRACT.md` as the active sync-specific contract;
- pure `core/sync-contract.js` merge planner with no network/storage/backend dependency;
- explicit sync scope separating canonical Source/user work from rebuildable/device-local state;
- metadata-only sync envelopes that reject raw text/title/note/query/Context fields;
- opaque per-device identity/sequence semantics for replay/idempotence only, not conflict resolution;
- Source merge semantics: immutable original payload, enrichment-only fact merge, immutable-body mismatch conflict;
- body-free permanent Source tombstones that dominate stale remote copies and cannot resurrect deleted Source;
- human-work merge semantics: only ancestry-proven fast-forward is automatic; concurrent or unproven divergence is an explicit user conflict;
- operationId collision protection: only identical envelopes may dedupe as the same operation;
- explicit rejection of latest-write-wins, server-arrival-wins, device-sequence-wins and silent AI conflict resolution;
- release packaging requires the active sync contract;
- dedicated contract regression tests.

Engineering exit criterion: **met at protocol-contract level**.

Transport exit criterion: **not met**.

Product exit criterion: **not met**.

## Round 5C — Encryption / Device Identity / Remote Object Protocol Simulation

Status: **local protocol/simulation implementation and engineering certification completed 2026-09-13; real remote transport and production key persistence/account integration not implemented**

Purpose: prove that the Round 5B merge contract can travel through a backend-neutral encrypted-object layer without exposing PAIA entity/revision/device identity to the remote store.

Delivered:

- `REMOTE_OBJECT_PROTOCOL.md` defines the active encrypted remote-object boundary;
- `core/sync-crypto.js` uses standard Web Crypto primitives only: random 256-bit root key material, HKDF-SHA-256 per-object key derivation and AES-256-GCM authenticated encryption;
- every remote object receives random salt, random 96-bit GCM nonce and opaque random object ID;
- backend-visible header is limited to protocol/object/key versions, cipher/KDF labels, salt, nonce and ciphertext;
- entity ID/type, device identity, operation ID, revision ancestry/hashes, tombstone target and private content remain inside ciphertext;
- public remote header is authenticated as AES-GCM AAD, so header mutation fails closed;
- decrypted private payload is cryptographically authenticated and then semantically bound back to the Round 5B hash contract before merge;
- `core/sync-simulator.js` provides an in-memory remote object store plus simulated devices with no network or persistent storage;
- device identity is random per installation simulation and resets on reinstall rather than deriving from account/hardware identity;
- wrong root key, ciphertext/header tampering, hash mismatch, object-ID collision, concurrent edit conflict and body-free Source tombstone behavior are covered by Round 5C tests;
- release packaging requires the active remote-object protocol document.

Round 5D later adds a local key-management/onboarding protocol on top of this encrypted-object boundary. That does not change the 5C conclusion that a production transport/account/security-storage layer is still absent.

Engineering exit criterion: **met at local protocol/simulation level**.

Transport exit criterion: **not met**.

Product exit criterion: **not met**.

## Round 5D — Key Management & Trusted Device Onboarding

Status: **local key-management/trusted-device protocol implementation and engineering certification completed 2026-09-13; production secure storage/account/device service not implemented**

Purpose: replace the Round 5C simulator’s direct shared-root-key shortcut with an explicit local protocol for key lifecycle, trusted-device onboarding, revocation/rotation semantics and offline recovery.

Delivered:

- `TRUSTED_DEVICE_PROTOCOL.md` as the active key-management/trusted-device contract;
- `core/sync-key-management.js` with an in-memory multi-version root-key keyring;
- explicit root-key rotation while retaining older key versions needed for historical ciphertext;
- keyVersion-based opening of Round 5C remote objects;
- random per-install device identity plus ECDSA P-256 long-term device signing credentials;
- one-time ECDH P-256 onboarding sessions;
- joining-device signatures over onboarding requests and inviter signatures over encrypted onboarding packages;
- HKDF-SHA-256 + AES-256-GCM wrapping of the complete retained keyring;
- 48-bit human comparison code binding session, both long-term credentials and both ephemeral ECDH public keys;
- explicit fail-closed behavior for request/package tampering and mismatched comparison codes;
- local `TrustedDeviceRegistry` simulation with trusted/revoked state and latest confirmed key version;
- revocation semantics that do not pretend to erase keys a device already learned: future secrecy requires a fresh root-key rotation and withholding the new key from revoked devices;
- independent high-entropy Recovery Kit using random 256-bit recovery material, HKDF-SHA-256 and AES-256-GCM rather than a password/passphrase-derived root key;
- recovery secret and private/root key material remain outside ordinary PAIA Backup and outside Product/Passport telemetry;
- no new IndexedDB object store, Manifest permission, network request or backend SDK;
- dedicated Round 5D regression tests plus release-document guard integration.

Explicit limitations:

- root keys, device private signing keys and trusted-device registry are still memory-only in this protocol simulation;
- no production Chrome/Web/macOS/iOS/Android secure-key storage design is implemented;
- no account/device directory or authenticated remote authorization service exists;
- no network onboarding relay, invitation expiry service or server-side replay protection exists;
- no automatic background key distribution;
- revocation does not retroactively remove access to old ciphertext encrypted under keys the revoked device already possessed;
- no old-object re-encryption/compaction or old-key retirement workflow;
- no user-facing device/recovery management UI;
- no live multi-device sync.

Engineering exit criterion: **met at local protocol/simulation level**.

Secure-storage exit criterion: **not met**.

Account/device-service exit criterion: **not met**.

Transport exit criterion: **not met**.

Product exit criterion: **not met**.

## Broader Round 5 work remains gated

The next legitimate steps are not automatically “connect Supabase/Drive/iCloud”. They are, in order of evidence:

1. verify Round 5A against a real Claude export;
2. continue Round 4.8 real-use observation;
3. if multi-device value remains deliberately prioritized, design and implement secure local persistence for the root-key keyring and device private credential per supported platform;
4. define the authenticated account/device directory and pairing relay without turning the server into plaintext merge/key authority;
5. design bounded remote listing/cursor/retention/compaction plus old-key re-encryption/retirement semantics;
6. before any public multi-device release, build explicit conflict-resolution UI and test offline divergence/tombstone/retry/device-reset/revocation scenarios over the actual transport.

Constraints:

- Do not sync by copying the entire local database wholesale.
- Do not silently resolve conflicting human edits with latest-write-wins.
- Sync must enrich source facts while preserving user work and deletion fences.
- Device sequence and wall-clock time are not merge authority.
- Remote object IDs are opaque transport identifiers, not canonical entity IDs.
- Derived caches/projections should be rebuilt locally unless a later explicit design changes their scope.
- Provider credentials, Product Signals, Revisit cursor and Passport Grants remain device-local by default.
- A remote backend must not require plaintext entity/device/revision metadata for convenience.
- Ordinary PAIA Backup must not silently become a root-key/private-device-credential backup.
- Password/passphrase-derived account login must not silently become the encryption root key.
- Device revocation must be described honestly: blocking future key versions is different from erasing historical knowledge.
- Early Passport implementation is not permission for broad autonomous agent access.

---

## Later, only after the gates above

Potential later directions:

- encrypted multi-device sync implementing the approved contracts;
- Web / Desktop / mobile Reader surfaces;
- Google Drive or other portable Context backends;
- MCP/API/agent access through Passport Grants;
- semantic/vector retrieval as a rebuildable Search implementation;
- additional capture sources;
- stronger on-device/hybrid organization.

These are not current commitments.

## Explicitly deprioritized now

- more Thought Library ontology merely because the schema can support it;
- knowledge graph as a product goal;
- Provider proliferation;
- automatic background AI organization;
- cloud sync before product value, secure key persistence, account/device authorization, transport privacy and conflict UI justify it;
- native apps that only duplicate the extension UI;
- broad Passport/agent integration before repeated Context reuse is observed;
- embeddings/vector storage before measured lexical-search failures justify them;
- push notifications, streaks or opaque engagement recommendations merely to increase return frequency.
