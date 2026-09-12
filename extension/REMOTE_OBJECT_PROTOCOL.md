# PAIA Remote Object Protocol

Status: **Round 5C protocol source of truth — encryption/device/local remote simulation implemented; real transport and key distribution not implemented**

Version: **1**

This document defines the encrypted object boundary that a future PAIA sync transport must carry. It builds on `SYNC_CONTRACT.md`; it does not replace the Round 5B merge rules.

Round 5C deliberately implements only standard local cryptographic primitives and an in-memory remote-store simulation. There is still no cloud account, network sync, key recovery system, device-registration service or production multi-device transport.

## 1. Layering

The intended future stack is:

```text
canonical PAIA entity
    ↓
Round 5B Sync Envelope + private payload
    ↓
Round 5C encrypted Remote Object
    ↓
transport/backend (not implemented)
```

The backend is a carrier of encrypted objects, not the authority for entity merge semantics.

The client decrypts a remote object first, validates its Round 5B Sync Envelope, and only then invokes the Round 5B merge planner.

## 2. Cryptographic primitives

Round 5C uses browser/Node Web Crypto only:

- root key material: 256 random bits;
- per-object key derivation: HKDF-SHA-256;
- encryption/authentication: AES-256-GCM;
- HKDF salt: 128 random bits per object;
- AES-GCM nonce: 96 random bits per object;
- authentication tag: 128 bits;
- object identifiers: random opaque identifiers.

PAIA does not define a custom cipher, stream construction or MAC.

### 2.1 Per-object key derivation

Each remote object derives a fresh AES key from the current root key:

```text
HKDF(
  rootKey,
  salt = random 128-bit object salt,
  info = "paia-sync-object/v1/<objectId>/key/<keyVersion>"
)
→ AES-256-GCM object key
```

The random salt and opaque object ID provide per-object key separation. AES-GCM also receives a fresh random 96-bit nonce.

`keyVersion` exists as protocol routing metadata for a future keyring/rotation design. Round 5C does **not** implement key rotation or key recovery.

## 3. Root-key boundary

`generateRootKeyMaterial()` creates 32 random bytes.

Round 5C does not persist this key and does not define how a second real device obtains it.

The local simulator passes the same root-key material to two simulated devices explicitly so encryption/decryption behavior can be tested.

Before real multi-device sync, a separate security design must define at least:

- initial account/device onboarding;
- secure root-key transfer or wrapping;
- recovery when all trusted devices are lost;
- rotation and revocation;
- how old key versions remain decryptable during migration;
- whether platform secure storage is required and how it is addressed on Web/Desktop/mobile.

PAIA must not silently replace this problem with a user password, server-readable key or backup-embedded secret without an explicit security decision.

## 4. Device identity

A device identity is generated randomly per installation.

It contains:

```text
version
deviceId
local sequence
```

Rules:

- `deviceId` is not derived from account ID, email, hardware serial, hostname or machine name;
- a reinstall/reset creates a new device ID and restarts its local sequence;
- device identity is not copied by PAIA Backup;
- device sequence is replay/idempotence metadata only;
- device sequence is never conflict-resolution authority.

Device ID and operation ID are inside the encrypted object payload. The simulated remote backend does not need to see them.

## 5. Public remote object

The backend-visible object is deliberately small:

```text
protocolVersion
objectId
keyVersion
cipher = AES-256-GCM
kdf = HKDF-SHA-256
salt
nonce
ciphertext
```

The public header does **not** contain:

- entity type or entity ID;
- Source/Input/Thought identity;
- device ID;
- device sequence;
- operation ID;
- revision ancestry/base hash;
- payload hash/facts hash;
- tombstone target;
- body/title/note/query/Context text.

The public header is canonicalized and passed to AES-GCM as additional authenticated data (AAD). Altering the object ID, key version, algorithm label, salt or nonce therefore causes decryption to fail.

## 6. Encrypted bundle

After successful AES-GCM decryption, the trusted client obtains:

```text
bundleVersion = 1
syncEnvelope = Round 5B validated envelope
payload = private canonical entity payload or null for a permanent Source tombstone
```

Permanent Source tombstones stay body-free. A tombstone remote object contains only the encrypted deletion envelope and `payload = null`; it never needs the deleted Source body in order to propagate deletion.

Round 5C limits plaintext bundle size to 2 MiB per object. A future chunking/large-object protocol, if needed, must be designed separately rather than silently bypassing this limit.

## 7. Backend knowledge and leakage

With this protocol, a future backend can still observe some metadata:

- number of remote objects;
- encrypted object sizes;
- upload/download timing at the transport layer;
- random object IDs;
- protocol and key versions;
- cipher/KDF identifiers.

It should not learn entity IDs, device IDs, operation IDs, revision graph edges or private content from the remote object format itself.

Round 5C does not implement padding, batching or traffic-analysis defenses. Those are separate transport/privacy decisions.

## 8. Local remote simulation

`core/sync-simulator.js` provides an in-memory remote object store and simulated devices.

It exists to exercise protocol semantics before any vendor/backend is chosen.

The simulator can verify:

- two devices using the same root key can exchange encrypted objects;
- a wrong root key cannot decrypt another account/key domain;
- ciphertext or authenticated-header tampering fails closed;
- the remote store never needs plaintext entity/device metadata;
- duplicate identical object IDs are idempotent;
- same object ID with different ciphertext is an explicit collision;
- two offline edits still reach the Round 5B explicit conflict path after decryption;
- permanent tombstones remain body-free and dominate stale Source objects;
- device reinstall generates a new opaque identity.

The simulator has no network, IndexedDB, `chrome.storage`, account system or backend SDK.

## 9. Remote object identity

`objectId` is random and opaque. It is not a stable entity ID and is not derived from the entity hash.

A future remote index may contain multiple objects concerning the same logical entity/revision history. Entity grouping happens only after trusted-device decryption.

This avoids making the backend's primary key a plaintext map of the user's Source/Input/Thought graph.

A production transport will need a bounded listing/cursor strategy, compaction policy and garbage-collection design. Round 5C does not implement these.

## 10. Replay and operation semantics

Round 5C does not replace Round 5B replay rules.

After decrypting an object:

1. validate the Sync Envelope;
2. use `deviceId + deviceSequence` for per-device replay checks;
3. use `operationId` for exact-operation idempotence;
4. use revision ancestry / Source tombstone rules for merge;
5. never use object arrival time, remote list order or remote object ID to choose the winning human edit.

## 11. Key/version mismatch behavior

AES-GCM decryption is fail-closed.

Wrong root key material, tampered ciphertext, or authenticated-header mutation returns no plaintext bundle.

`keyVersion` is authenticated public metadata. A future keyring must choose the correct root-key material for that version before decryption. Round 5C has a single in-memory root key per simulated device and therefore does not claim rotation support.

## 12. Security/non-goals

Round 5C does **not** claim protection against:

- a compromised trusted device after decryption;
- malicious browser/OS code reading live plaintext or key material;
- traffic analysis based on timing/object size;
- account recovery attacks, because account recovery is not implemented;
- key exfiltration from a future storage layer that has not yet been designed.

The protocol is a necessary encrypted-object boundary, not a complete end-to-end sync security system.

## 13. Production gate after Round 5C

Before a real remote transport may ship, PAIA still needs explicit design and tests for:

1. root-key onboarding/distribution/recovery/rotation;
2. secure local key storage per platform;
3. authenticated device registration/revocation;
4. remote object listing, pagination, retention and compaction;
5. conflict-resolution UI creating a new revision rather than mutating history;
6. offline retry/out-of-order/tombstone scenarios from `SYNC_CONTRACT.md`;
7. remote-service authorization that never becomes plaintext merge authority;
8. privacy review of remaining metadata/timing/size leakage.

Round 5C is therefore **local protocol simulation**, not live multi-device sync.
