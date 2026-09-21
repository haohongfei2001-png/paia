# PAIA Roadmap

Status: **current roadmap source of truth**

Baseline: **v0.12.0 — Thought Evolution & Shared Context + post-release consolidation rounds**

PAIA is no longer in a phase where the main goal is to add more feature categories. Current priorities are product validation, Reader/Search/Revisit quality, trust-boundary hardening and keeping future expansion cheap.

## Archive Navigation & Source Structure v1

The explicitly authorized ANS package supersedes only the R1–R9 visible navigation,
source metadata and continuous-reading decisions named in its README. Its current
round is determined only by `docs/archive-navigation-source-v1/STATUS.md`, not this
roadmap. ANS-09 integrates the earlier eight deliveries, old-archive/Backup upgrades,
source/release parity and final certification. Completion requires its exact runtime
on main plus the final receipt. There is no ANS-10.

After package completion, Project/order/delete fallback remains a real capability
boundary. Live provider proof, real-use product validation, expanded sources,
semantic retrieval, sync and authorization expansion retain their existing gates;
a successful synthetic integration suite does not open those directions.

## UI execution state

UI Simplification v1 (`docs/ui-simplification/README.md`) supersedes the visible presentation choices it explicitly changes. Its only execution queue and completion state is `docs/ui-simplification/UI_SIMPLIFICATION_STATUS.md`: UIS-01 → UIS-02 → UIS-03 → UIS-04. Once all four are COMPLETE there is no next round; a completed package does not authorize UIS-05 or a new roadmap task.

UX-R1 through UX-R6 and Chrome UI Refresh UIR-01 through UIR-04 are shipped historical evidence, not current execution queues. Their Design Core and trust constraints remain relevant. Do not resume their old branches/status machinery.

Current presentation uses page-scoped search, contextual import/export menus, topic-only AI presentation controls, and no Thought-root Recent Reading section. The internal cross-surface search coordinator and existing read metadata remain reusable. These changes do not alter durable ownership, schema, capture, authorization, Backup or paid-AI behavior and are not evidence that real-use product-validation gates have been met.

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
- Secure-key persistence must follow `SECURE_KEY_PERSISTENCE.md`; absence of an approved OS/hardware secure-store adapter is fail-closed, not permission to downgrade into ordinary app storage.
- Account/device coordination must follow `ACCOUNT_DEVICE_SERVICE.md`; the service may coordinate public trust metadata and short-lived pairing relay state but must not become encryption-key authority or content-merge authority.

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

## Round 4.9 — Core Product Loop Closure

Status: **implementation and automated engineering certification completed 2026-09-13; real activation/return evidence remains open**

Purpose: turn existing Reader, Universal Search, Revisit and Context capabilities into one user-facing loop instead of separate product islands.

Delivered:

- the Input Archive root becomes the task-oriented PAIA home around continue reading, find prior expression and return/revisit;
- AI Context is demoted from primary content navigation to a secondary “用于 AI” action while preserving all existing authorization boundaries;
- existing Universal Search and Revisit services are reused rather than duplicated;
- Input Reader gains an explicit “继续使用” action that routes through the existing save lifecycle into the local Context preparation flow and never auto-sends content;
- search-result reuse is presented as the user task “继续使用” rather than exposing the internal AI Context implementation as the primary concept;
- popup primary action becomes “回到 PAIA”, while Product/Passport diagnostics remain available without competing with the normal entry path;
- four bounded local aggregate `core_loop_action` observations cover continue/find/return/reuse without storing body text, search queries or entity identifiers;
- Product Signals remain observation-only and cannot grant permissions, rank content or alter the core loop;
- no new durable content schema, IndexedDB store, backend, network sync or automatic AI call was introduced;
- the Round 4.9 Chrome journey is part of Current Browser Certification and verifies the loop without hidden external requests.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. The interaction loop is now coherent and measurable, but voluntary return, retrieval and reuse still require real-use observation; this round does not claim retention or product-market evidence.

---

## Round 4.10 — Activation & Return Loop

Status: **implementation and automated engineering certification completed 2026-09-13; real-world activation and retention evidence remains open**

Purpose: make the same Round 4.9 home explain PAIA at first meaningful use and become useful again when the user voluntarily returns, without adding a tutorial subsystem or engagement machinery.

Delivered:

- the empty Archive home now explains that the first captured AI input will appear locally in PAIA instead of presenting an abstract feature dashboard;
- after the first captured Input, the home states explicitly that PAIA stores the user's inputs rather than AI answers and promotes continuing the recent document;
- no separate onboarding-complete flag or durable activation database was added; activation state is derived from existing Archive content and Revisit state;
- the existing Revisit first-run marker remains the sole baseline for later return-state calculation;
- real post-baseline Inputs or Thought topic updates promote “回来看看” as the primary home action, while a quiet return keeps “继续阅读” primary rather than manufacturing urgency;
- the home responds to the existing privacy-bounded `ARCHIVE_CHANGED` runtime event and also refreshes local state when the PAIA tab becomes visible/focused, with no polling or network request;
- the Round 4.10 browser journey certifies empty activation → first capture → Revisit baseline → later meaningful capture → `return-new` → Revisit detail over the actual extension lifecycle;
- the browser journey separately verifies Revisit semantics before home presentation, so future regressions distinguish data-state errors from UI-refresh errors;
- current-release certification continues to require zero hidden DeepSeek, extension-network or external requests for this path;
- no push notification, streak, opaque recommendation engine, new durable content schema, new IndexedDB store, backend, network sync or automatic AI call was introduced.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. The product now has a coherent first-use explanation and a bounded return-state surface, but whether users understand the value quickly and voluntarily reopen PAIA still requires real daily-use evidence; this round does not claim retention or product-market evidence.

---

# Round 5 — Portability & Sync Readiness

Status: **gated overall; Round 5A, Round 5B, Round 5C, Round 5D, Round 5E, Round 5F and Round 5F.1 were opened by explicit product-owner override**

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

Status: **local key-management/trusted-device protocol implementation and engineering certification completed 2026-09-13; later integrated with the macOS secure-persistence path by Round 5F**

Purpose: replace the Round 5C simulator’s direct shared-root-key shortcut with an explicit local protocol for key lifecycle, trusted-device onboarding, revocation/rotation semantics and offline recovery.

Delivered:

- `TRUSTED_DEVICE_PROTOCOL.md` as the active key-management/trusted-device contract;
- `core/sync-key-management.js` with an in-memory multi-version root-key keyring;
- explicit root-key rotation while retaining older key versions needed for historical ciphertext;
- keyVersion-based opening of Round 5C remote objects;
- random per-install device identity plus ECDSA P-256 long-term device signing credentials;
- one-time ECDH P-256 onboarding sessions;
- joining-device signatures over onboarding requests;
- signed inviter challenge with no keyring material before human confirmation;
- 48-bit human comparison code binding session, both long-term credentials and both ephemeral ECDH public keys;
- trusted-device confirmation is required before a keyring-bearing package can be generated;
- HKDF-SHA-256 + AES-256-GCM wrapping of the complete retained keyring only after approval;
- joining-device challenge verification plus inviter signature verification on the final package;
- explicit fail-closed behavior for request/challenge/package tampering and mismatched comparison codes;
- local `TrustedDeviceRegistry` simulation with trusted/revoked state and latest confirmed key version;
- revocation semantics that do not pretend to erase keys a device already learned: future secrecy requires a fresh root-key rotation and withholding the new key from revoked devices;
- independent high-entropy Recovery Kit using random 256-bit recovery material, HKDF-SHA-256 and AES-256-GCM rather than a password/passphrase-derived root key;
- recovery secret and private/root key material remain outside ordinary PAIA Backup and outside Product/Passport telemetry;
- no new IndexedDB object store, Manifest permission, network request or backend SDK;
- dedicated Round 5D regression tests plus release-document guard integration.

Round 5F later replaces the local-only credential/keyring implementation on the macOS production path without weakening this ceremony or its comparison-code/approval semantics.

Explicit limitations that remain after Round 5F:

- no production account/device directory or authenticated remote authorization service exists;
- no network onboarding relay, invitation expiry service or server-side replay protection exists;
- no automatic background key distribution;
- revocation does not retroactively remove access to old ciphertext encrypted under keys the revoked device already possessed;
- no old-object re-encryption/compaction or old-key retirement workflow;
- no user-facing device/recovery management UI;
- no live multi-device sync.

Engineering exit criterion: **met at protocol level**.

Account/device-service exit criterion: **not met**.

Transport exit criterion: **not met**.

Product exit criterion: **not met**.

## Round 5E — Secure Key Persistence & Account/Device Service Contract

Status: **contract/local-simulation implementation and final engineering certification completed 2026-09-13; macOS secure-store implementation later supplied by Round 5F; production account/backend service not implemented**

Purpose: define the production boundary for durable secret storage and for any future account/device backend before network sync is allowed.

Delivered:

- `SECURE_KEY_PERSISTENCE.md` as the active secret-persistence contract;
- `core/secure-key-persistence.js` production capability gate for root-key and device-private-key storage;
- explicit fail-closed readiness when no approved OS/hardware secure-store adapter exists;
- fail-closed rejection of test-only or inadequate providers in production mode rather than silently using ordinary application storage;
- test-only in-memory provider for lifecycle tests, explicitly incapable of production readiness;
- `ACCOUNT_DEVICE_SERVICE.md` as the maximum-authority contract for a future account/device service;
- `core/account-device-service-contract.js` local in-memory device-directory and pairing-relay simulator;
- service directory stores only public device credentials, trust/revocation state and latest confirmed keyVersion;
- revoked device sessions immediately lose account/device-service authority;
- pairing relay is bounded, expiring and one-shot across request → challenge → final package → consume;
- relay rejects plaintext root/private/recovery secrets, private JWK material and content/merge-authority fields such as entity IDs or revision hashes;
- the real Round 5D onboarding ceremony is exercised end-to-end through the Round 5E relay simulator;
- ordinary PAIA Backup remains separate from secret persistence;
- release packaging requires both new active contracts;
- Round 5E itself introduced no network request, backend SDK or new IndexedDB object store.

Explicit limitations that remain after Round 5F:

- the capability gate prevents accidental product-code downgrade; it does not sandbox malicious code already running inside the PAIA process;
- no production account login/authentication provider exists;
- no durable remote device directory or authorization service exists;
- no network pairing relay, rate limiting, abuse prevention or server-side replay store exists;
- no encrypted remote-object transport/listing service exists;
- no live multi-device sync.

Engineering contract exit criterion: **met**.

Production secure-storage contract exit criterion: **met; first concrete platform implementation is Round 5F**.

Production account/device-service exit criterion: **not met**.

Transport exit criterion: **not met**.

Product exit criterion: **not met**.

## Round 5F — Production Secure Store Adapter

Status: **macOS adapter implementation and automated engineering certification completed 2026-09-13; physical Secure Enclave device validation and signed/notarized native-host distribution remain release gates**

Purpose: implement the first concrete platform secure-storage path satisfying `SECURE_KEY_PERSISTENCE.md` without downgrading root keys or device signing credentials into ordinary extension storage.

Delivered:

- Chrome Native Messaging is the explicit bridge from the extension to the reviewed macOS native host `com.paia.secure_store`;
- `core/macos-native-secure-store.js` pins that host name and exposes only bounded probe/root-secret/signing operations;
- root-key material is stored per retained key version in macOS Keychain using device-local accessibility rather than IndexedDB, `chrome.storage` or normal files;
- the long-term P-256 device signing private key is generated directly in Secure Enclave and is never returned to JavaScript as private-key bytes;
- production readiness requires the real non-exportable signing interface; generic production `store/load` of `device_signing_private` is rejected;
- `core/secure-sync-identity.js` provides persistent root-keyring and hardware-backed device-credential primitives with non-secret restart manifests;
- the Round 5D onboarding ceremony now accepts validated signer/keyring capabilities rather than requiring only in-memory class instances;
- a joining device can persist an approved transferred keyring into its own secure slots; target collisions fail closed and partial writes roll back;
- native-host readiness probes the persistent Secure Enclave create → lookup → delete lifecycle rather than treating temporary key creation as sufficient;
- hosts without persistent Secure Enclave support remain unavailable instead of falling back to an exportable software signing key;
- `nativeMessaging` is the only newly added extension permission; package/privacy/release guards permit only the pinned audited call site and continue to reject other native-messaging access;
- the macOS native host has a developer installer with an exact Chrome extension origin allowlist;
- CI now includes a required macOS secure-store job that compiles the Swift host, exercises real Keychain root-secret lifecycle and certifies the Secure Enclave available-or-fail-closed path;
- all existing unit, privacy/adapter, current-browser and release guards remain green alongside the new macOS gate.

Explicit limitations:

- GitHub-hosted macOS CI does not establish that a physical user Mac can complete the successful persistent Secure Enclave create → sign → process restart → reopen → sign → delete lifecycle; that must be verified on real supported hardware before public production-readiness is claimed;
- the native host is not yet code-signed/notarized or packaged for user-friendly installation/update/removal;
- the current installer is a developer installation path and requires the exact extension ID;
- Windows, iOS, Android and browser-only clients still have no approved secure-store adapter;
- no production account login/device-directory backend exists;
- no network pairing relay exists;
- no encrypted remote-object transport/listing service exists;
- no live multi-device sync or conflict-resolution UI exists.

Automated engineering adapter exit criterion: **met**.

Physical macOS hardware validation exit criterion: **not met**.

Distribution/release-readiness exit criterion: **not met**.

Production account/device-service exit criterion: **not met**.

Transport exit criterion: **not met**.

Product exit criterion: **not met**.

## Round 5F.1 — Physical macOS Validation & Native Host Distribution Hardening

Status: **implementation and automated CI-level distribution certification completed 2026-09-13; physical Secure Enclave validation, stable production Chrome extension identity and an actually Developer-ID-signed/notarized package remain external release gates**

Purpose: turn the Round 5F native-host prototype into a reproducible macOS validation and direct-distribution path without pretending hosted CI or unsigned artifacts are public-release evidence.

Delivered:

- `native-hosts/macos/verify-physical.mjs` validates Keychain replace/read/delete and persistent Secure Enclave signing across separate native-host processes, including cryptographic signature verification and post-delete lookup failure;
- physical evidence is deliberately coarse and excludes generated secret material, slot identifiers, public-key fingerprints and machine identifiers;
- hosted CI may execute the verifier only in `--allow-no-enclave` mode; only `--require-enclave` on a real supported Mac can close the physical-hardware gate;
- the developer installer now compiles for an explicit macOS 13 target, applies an ad-hoc Hardened Runtime signature and atomically replaces the user-level native-host manifest;
- `build-release.sh` cross-compiles arm64 and x86_64, produces one universal host, pins the system-wide Chrome native-host manifest to one exact extension ID, and has separate CI-only and production modes;
- production package building fails closed unless both Developer ID Application and Developer ID Installer identities are supplied;
- production host signing requires Hardened Runtime and a secure timestamp, and production `.pkg` creation requires Developer ID Installer signing;
- `notarize-release.sh` uses `notarytool`, requires an Accepted result, staples and validates the ticket, requires Gatekeeper install assessment, and promotes companion build metadata only after those checks succeed;
- `uninstall.sh` separates user/system filesystem removal from cryptographic device revocation and does not blindly erase Keychain/Secure Enclave state;
- CI validates script syntax, universal architecture output, ad-hoc Hardened Runtime signing, exact package payload paths, production fail-closed behavior without Apple signing identities and non-distributable CI metadata;
- the secure-persistence contract now states the local-process threat boundary honestly: Chrome `allowed_origins` is a Chrome-mediated launch restriction, not cryptographic caller authentication against arbitrary same-user local code;
- public distribution is explicitly blocked until PAIA has a final stable production Chrome extension ID to bind into `allowed_origins`.

External gates still open:

- no authorized physical Mac is connected to this session, so the real `--require-enclave` lifecycle has not been executed and must not be claimed as passed;
- PAIA's final production Chrome extension ID is not yet fixed;
- no Apple Developer ID identities or notarization credentials are stored in the repository or available to this branch;
- therefore no real Developer-ID-signed/notarized PAIA Secure Store package has been produced yet;
- automatic signed-host update/removal UX remains unimplemented.

CI/distribution-tooling engineering exit criterion: **met**.

Physical macOS hardware validation exit criterion: **not met**.

Signed/notarized distribution exit criterion: **not met**.

Production account/device-service exit criterion: **not met**.

Transport exit criterion: **not met**.

Product exit criterion: **not met**.

## Broader Round 5 work remains gated

The next legitimate steps are not automatically “connect Supabase/Drive/iCloud”. They are, in order of evidence:

1. verify Round 5A against a real Claude export;
2. continue Round 4.8 real-use observation;
3. finish the external Round 5F.1 release gates: fix the production Chrome extension ID, run `verify-physical.mjs --require-enclave` on a real supported Mac, then execute the Developer ID + notarization + Gatekeeper pipeline;
4. if multi-device value remains deliberately prioritized, implement a production account authentication/device-directory/pairing-relay service satisfying `ACCOUNT_DEVICE_SERVICE.md`, without making that service encryption or merge authority;
5. design bounded encrypted remote-object listing/cursor/retention/compaction plus old-key re-encryption/retirement semantics;
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
- Absence of an approved platform secure-store adapter must disable durable live sync rather than trigger an insecure storage fallback.
- The account/device service may coordinate public device trust and short-lived pairing messages but cannot become client-content merge authority.
- Native Messaging must remain pinned to reviewed host/origin boundaries and must not become a general privileged escape hatch from the extension sandbox.
- The macOS native host must not be described as protection against arbitrary same-user local malware; that is outside the current adapter threat model.
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
