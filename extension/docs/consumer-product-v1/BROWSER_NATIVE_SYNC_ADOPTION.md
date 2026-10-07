# Browser-Native Sync — adoption and scoped supersession

Date: 2026-10-07. Contract: **BNS-1.0**. Workstream: **CPV1-SYNC** inside Consumer Product v1.

**Owner-directed product model: ADOPTED. Architecture and delivery plan: documented by this task. Runtime implementation: NOT_STARTED_BY_THIS_TASK. Real-provider qualification: NOT_RUN. Subsequent owner pixel approval: NOT_CLAIMED.**

The owner explicitly selected the browser-native cloud direction and requested design, architecture, implementation planning and canonical GitHub integration in the same documentation-only task. This is not an invitation to reopen PAIA Cloud versus personal cloud, and not evidence that any provider works in the installed extension.

## 1. Settled product decision

> PAIA 跟着用户，而不是跟着这一次浏览器安装。

PAIA remains local-first. An explicit Sync action connects its durable canonical user state to the user's own cloud account. Chrome defaults to Google Drive appDataFolder; Edge to OneDrive App Folder; Safari to CloudKit private database through its Apple native container/bridge. The browser selects a default ecosystem; it does not grant cloud access by itself. The authenticated cloud subject, not an email label or whichever browser account happens to be visible, controls the binding.

There is no PAIA username, password, phone account, identity database, recovery-key backend or PAIA-hosted content store in this v1. Normal use is `开启同步 -> 必要的云厂商确认 -> 自动同步/恢复`. This is one PAIA activation action, not a promise that provider MFA, account selection, iCloud setup or reauthorization takes exactly one click.

A new installation can recover all supported, successfully synchronized canonical user state using the same ecosystem account and stable PAIA application/container identity, without the old device, a recovery phrase, QR pairing or backup file. This requires the remote data still to exist, the account to remain accessible and the reader to support its schema. Unsynced local changes and independently erased cloud data cannot be promised back.

Browser-native does **not** mean browser settings Sync, chrome.storage.sync, or automatic permission to read the user's general cloud drive. v1 has one provider per local active dataset, no ordinary provider chooser, no transparent Chrome/Drive -> Safari/iCloud transfer, and no three-way cloud replication. Host and provider remain distinct interfaces for later expressly authorized capabilities.

## 2. One authority set

- [BROWSER_NATIVE_SYNC_CONTRACT.md](BROWSER_NATIVE_SYNC_CONTRACT.md): normative data, transport, trust, recovery and provider contract.
- [BROWSER_NATIVE_SYNC_UX.md](BROWSER_NATIVE_SYNC_UX.md): journeys, state/copy/interaction matrix and the limited Settings amendment.
- [BROWSER_NATIVE_SYNC_PLAN.md](BROWSER_NATIVE_SYNC_PLAN.md): actual code gaps, ordered slices, parameter qualification and acceptance.
- [BROWSER_NATIVE_SYNC_REFERENCES.md](BROWSER_NATIVE_SYNC_REFERENCES.md): dated primary-source findings, private artifact hashes and evidence limits.
- This adoption records the owner decision and exact supersession. [AUTHORITY.md](AUTHORITY.md) resolves precedence; [STATUS.md](STATUS.md) alone selects actual execution.

These documents resolve **B-03 only for this opt-in v1 personal-cloud storage and provider-trust product choice**. Provider setup, region/legal disclosure, production authorization, budget, live qualification and deployment remain separate gates. No AI model/processing/connection entitlement is created by Sync. B-01/B-02 and unrelated paid-service/consent gates are not silently resolved.

## 3. Current facts, not retroactive implementation claims

The design and final pre-integration reads used remote main `948ea06a57cd932c187407faf7140d9fb6714eff`, tree `78dbc060a3406ce301d1ca9b5f2d183d801ac619`, whose merge introduces local CTX4-01. Runtime metadata is 0.14.0, not proof of the owner's installed version. Existing status/plan prose contains older phase snapshots; current code controls capability claims.

The actual Context service stores independent manual My Information Items in `meta/context-cards:v1`; its Rules, Now, Inputs, automatic and external capabilities remain false. Its acknowledgements are installation/restore-epoch-local. Existing Backup serialization is not a complete cloud canonical-state codec and does not make those acknowledgements portable. Prompt manual preferences exist, while its automatic family IDs/rankings require careful rebuild mapping. The existing sync planner and encrypted/device services are useful simulations, not a deployed cloud service.

Current manifest permissions/network policy do not enable the proposed Drive/Graph flows. This task changes no manifest, runtime, database, test, credentials, user installation, cloud registration, payment, release or deployment. Production CI of prior commits is not Sync evidence.

## 4. Scoped supersession ledger

| Existing source or interpretation | Remains active | Superseded only for Browser-Native Sync v1 |
|---|---|---|
| `extension/SYNC_CONTRACT.md` | Immutable Source; evidence-aware metadata enrichment; protected Working Input/human work; true ancestry; operation identity; explicit concurrent conflicts; monotonic permanent tombstones; no timestamp/arrival/sequence/AI winner | Its old finite entity list and plaintext-free encrypted transport assumptions are not the complete BNS scope/wire format. BNS uses its own versioned segment protocol and explicit provider trust. |
| `extension/REMOTE_OBJECT_PROTOCOL.md` | Bounded validated objects, collision detection, safe errors and transport/business separation | One encrypted object per old entity and its historical object-size profile are not the new segment/checkpoint contract. Old wire versions are not relabeled BNS. |
| `extension/TRUSTED_DEVICE_PROTOCOL.md` | Threat analysis, opaque device identity, replay prevention, secret separation, no remote erasure of already downloaded plaintext | Trusted-device pairing, approval by an old device and Recovery Secret are not normal installation/recovery prerequisites. Its signing/key hierarchy is not claimed by BNS provenance IDs. |
| `extension/ACCOUNT_DEVICE_SERVICE.md` | Least privilege; scoped authorization; expiry/replay/collision reasoning; truthful revoked/lost state | PAIA account/device coordination backend and its challenge/pairing workflow are not v1 infrastructure or a registration product. |
| `extension/SECURE_KEY_PERSISTENCE.md` | Do not sync credentials with content; do not disguise ordinary storage as OS-bound protection; preserve existing secrets and physical-verification limits | A PAIA account-root encryption key and the old Secure Enclave approval chain are not mandatory keys for provider-only recovery. Provider-token handling has a separate explicit lifecycle, not silently weakened old key storage. |
| PRODUCT / ARCHITECTURE / older TECHNICAL_PLAN Sync wording | Local-first use, user ownership, no silent external access, entity/revision/deletion/restore protections | Universal no-cloud/B-03-undecided wording or mandatory PAIA encrypted account backend does not veto this later owner-approved optional personal-cloud design. It still does not imply live activation. |
| Settings Consumer v2 | Same six groups, ordinary preference owners, existing import/restore/recovery destinations, no fake controls, no extra account console | Its fixed 20-row/five-Data-row inventory gains one Sync row when usable: 21 primary rows, six Data rows. Blanket all-local copy becomes truthful optional-sync copy. Everything else stays. |
| Context Cards v2 / Passport | Independent Items, stable Personal Topic references, restrictive content gates, new identities closed, external connections and local acknowledgements not restored active | Durable desired Card/Topic preferences may travel. This never restores effective external grants, capture consent, connection credentials or device-local permission acknowledgements. |
| Prompt Reuse / PT-1 | One body owner; human override/protection; taxonomy independence; no send; reply-ephemeral Stage 3A; actual Topic/Section/Placement identity | No product redesign. Portable manual Prompt work is synchronized; orb geometry, ephemeral replies and automatic ranking are not canonical truth. |

The named old sync/security documents remain in place, with their evidence and code unchanged. This table and the linked contract override conflicting interpretations, not historical PASS/FAIL records or unrelated native key-persistence work. Do not delete old secrets, migrate old encrypted datasets or claim conversion merely because the new product no longer requires their recovery flow.

## 5. Settings and execution integration

The Sync-owned row belongs first in **数据与恢复** and opens an ordinary Sync Detail page. Settings owns placement/navigation only; Sync owns provider binding, states and actions; domain owners own canonical content; Context owns external-read permission. No account group, cloud dashboard, provider dropdown, sync-frequency knob or resurrected export/backup-generation surface is added.

The first new Sync implementation task is **CPV1-SYNC-01: local two-device canonical Sync Core proof**. All cloud adapters depend on it. This adoption does not interrupt another authorized writer or declare existing Topic/Context exact-main closure complete. STATUS retains the current phase and queues the Sync-first slice; when execution is authorized and selected, there is one actual writer and one current task. No parallel six-provider/feature queue is created.

## 6. Design evidence is bounded

The private handoff has 27 synthetic interactive scenarios and 34 rendered artboards using the exact retrieved Settings Consumer v2 language. Its full horizontal-reflow matrix passed 540/540 configurations; 8/8 scripted demo interactions passed; viewer switching was checked. This is not production, real cloud, security, persistence, native Safari, IME or screen-reader acceptance. Provider-owned sign-in is a labeled boundary, not a forged provider login design. Exact hashes, corrections and missing evidence are recorded in REFERENCES.
