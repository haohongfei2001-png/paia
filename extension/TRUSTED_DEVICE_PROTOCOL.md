# PAIA Trusted Device & Key Management Protocol

Status: **Round 5D protocol source of truth — local key lifecycle, trusted-device onboarding and recovery simulation implemented; production secure storage/account transport not implemented**

Version: **1**

This document defines how PAIA may move the encrypted-sync root-key keyring between trusted devices without making a server, account password or ordinary PAIA Backup the owner of decryption authority.

It builds on:

- `SYNC_CONTRACT.md` — merge/conflict/deletion semantics;
- `REMOTE_OBJECT_PROTOCOL.md` — encrypted remote-object format and per-object key derivation.

Round 5D still does **not** implement a live account backend, cloud sync, OS secure-key storage or production device-management UI.

## 1. Goals

Round 5D must answer four questions before a real multi-device transport is allowed:

1. How does a new device obtain the retained root-key versions?
2. How does the user verify that the pairing endpoint was not silently substituted?
3. How are root keys rotated when a device is revoked?
4. How can a user recover the keyring without putting plaintext root keys into the ordinary PAIA Backup?

The protocol must not replace these questions with a low-entropy account password or a server-readable master key.

## 2. Key hierarchy

PAIA now distinguishes three key classes:

```text
Root-key keyring
  ├─ keyVersion 1
  ├─ keyVersion 2
  └─ ...
       ↓ HKDF (Round 5C)
per-object AES-256-GCM keys

Device signing credential
  └─ ECDSA P-256 private key (local only)

Onboarding ephemeral key
  └─ ECDH P-256 session key pair
```

The root-key keyring is the authority that decrypts remote PAIA objects. A device credential proves possession of a device-specific signing key. The ECDH key pair is temporary and exists only for one onboarding session.

## 3. Local root-key keyring

`core/sync-key-management.js` implements `LocalSyncKeyring`.

Properties:

- first use creates one random 256-bit root key at `keyVersion = 1`;
- rotation creates a fresh random 256-bit key and increments the version;
- old retained key versions stay available so historical remote objects remain decryptable;
- sealing uses the current key version;
- opening selects the root key using the authenticated `keyVersion` in the Round 5C remote-object header;
- missing key versions fail closed.

Round 5D keeps this keyring in memory only. It does **not** serialize root keys to `chrome.storage`, IndexedDB, Product Signals, Passport, logs or ordinary PAIA Backup.

Production persistence requires a separate platform-security decision.

## 4. Device credential

Each trusted installation may create an ECDSA P-256 signing credential.

The public credential contains:

```text
version
deviceId
credentialId
algorithm = ECDSA-P256-SHA256
publicKeyJwk
```

Rules:

- `deviceId` is the existing random per-installation identifier;
- `credentialId` is derived from the canonical public signing key, not from email/hardware/account identity;
- the private signing key never leaves the local credential object in Round 5D;
- a reinstall creates a new device identity and a new signing credential;
- the private credential is not put into ordinary PAIA Backup.

The device signing key authenticates onboarding transcripts. It is not a content-encryption key.

## 5. Trusted-device onboarding

Round 5D uses an explicit two-device pairing ceremony.

### 5.1 Joining device request

The joining device creates:

- a new ephemeral ECDH P-256 key pair;
- a random `sessionId`;
- an onboarding request containing its public device credential and ephemeral public key;
- an ECDSA signature over the request.

The signing key proves that the onboarding request was created by the holder of the joining device credential.

### 5.2 Existing trusted device response

The existing trusted device:

1. validates the joining request and signature;
2. creates its own ephemeral ECDH P-256 key pair;
3. derives a 256-bit shared secret using ECDH;
4. derives an AES-256-GCM wrapping key using HKDF-SHA-256 and a fresh random salt;
5. encrypts the complete retained root-key keyring into an onboarding package;
6. signs the package with its long-term ECDSA device credential.

The package header is authenticated as AES-GCM AAD.

### 5.3 Human verification code

Both devices independently derive the same comparison code from:

```text
sessionId
joining credentialId
inviter credentialId
joining ephemeral public key
inviter ephemeral public key
```

The current display form is 48 bits of the transcript hash:

```text
ABCD-EF12-3456
```

The user must compare the code on both devices before accepting the root-key package.

This code is not a decryption password. It is a short authentication string intended to expose man-in-the-middle public-key substitution.

If the code does not match, onboarding fails closed.

## 6. What the onboarding package contains

The public package carries only the pairing transcript and encrypted keyring material needed for the ceremony.

Inside AES-GCM ciphertext:

```text
bundleVersion
complete retained keyring snapshot
approved joining public credential
```

The keyring snapshot contains raw root-key material and is therefore sensitive plaintext **before encryption and after decryption**. It may exist only inside the trusted-device process boundary during the ceremony.

Round 5D does not define a relay server. If a future backend relays onboarding messages, it must treat them as bounded pairing artifacts rather than turning them into a permanent plaintext device directory.

## 7. Trusted device registry

`TrustedDeviceRegistry` is a local simulation of trust metadata.

It records:

- public device credential;
- `trusted` or `revoked` state;
- the latest root-key version the device was confirmed to have received.

It does **not** store root keys or private device credentials.

Round 5D does not persist this registry and does not claim that it is a production authorization service.

A real implementation still needs authenticated account/device registration and revocation semantics.

## 8. Revocation semantics

Revocation has an important limitation:

> **Revocation cannot make a device forget root keys it already learned.**

Therefore:

1. marking a device `revoked` only removes it from future key distribution;
2. the remaining trusted device(s) must rotate to a fresh root-key version;
3. future remote objects are sealed under the new version;
4. the revoked device cannot decrypt those future objects because it never receives the new root key.

Historical objects encrypted with an old root key remain readable by any device that already possessed that old key.

Removing historical access would require re-encrypting/recompacting old remote objects under a new key and deleting old ciphertext according to a separately designed remote-retention protocol. Round 5D does not pretend that simple revocation accomplishes this.

## 9. Recovery kit

Round 5D also defines an offline recovery primitive.

`createRecoveryKit()` generates:

- a fresh random 256-bit recovery secret;
- a random recovery package ID;
- fresh HKDF salt and AES-GCM nonce;
- an AES-256-GCM encrypted snapshot of the retained root-key keyring.

The recovery secret is represented as high-entropy random text beginning with `recovery_`.

Important rules:

- it is **not** derived from a user password or passphrase;
- the recovery package does not contain the recovery secret;
- the recovery secret must not be written into ordinary PAIA Backup;
- wrong recovery material fails closed;
- Round 5D does not create recovery-file UI or cloud escrow.

A later product/security round must decide how the user stores the recovery secret and whether the encrypted recovery package is local, remote or both.

## 10. Key rotation

A keyring rotation:

```text
current keyVersion N
    ↓
generate fresh 256-bit root key
    ↓
current keyVersion N+1
```

Old root keys remain retained until a future compaction/migration process proves they are no longer required.

New remote objects use the new current version. Existing trusted devices need another authenticated key-distribution ceremony before they can read objects encrypted under the new version.

Round 5D deliberately does not implement automatic silent key push in the background.

## 11. Recovery vs onboarding

These are separate trust mechanisms:

### Trusted-device onboarding

Requires:

- an already trusted device;
- live user comparison of the pairing code;
- ECDH + signed transcript.

### Recovery kit

Requires:

- the high-entropy recovery secret;
- the encrypted recovery package;
- no previously trusted live device.

The recovery path is more powerful and must therefore be treated like a master recovery credential, not like a convenience login password.

## 12. Secure local storage remains unsolved

Round 5D keeps private keys and root keys in memory for protocol simulation.

It does not yet decide how production clients should persist:

- root-key keyring;
- ECDSA device private key;
- trusted-device registry;
- recovery artifacts.

Before live multi-device sync, PAIA must define platform-specific secure storage, including at minimum the Chrome/Web constraint and any future macOS/iOS/Android/Desktop secure-storage capabilities.

The project must not silently put raw secrets into ordinary IndexedDB or `chrome.storage.local` merely because those APIs are available.

## 13. Threat model and non-goals

Round 5D provides protection against:

- onboarding-request tampering through joining-device signature verification;
- onboarding-package tampering through inviter signature + AES-GCM;
- silent ephemeral-key substitution when the user correctly compares the pairing code;
- accidental plaintext root-key transmission in the onboarding artifact;
- future-object access by a revoked device after root-key rotation;
- low-entropy password-based recovery being introduced by default.

It does not protect against:

- a compromised trusted device reading its live root keys;
- a user approving mismatched devices without comparing the code;
- malware capturing the recovery secret;
- a future insecure storage implementation that leaks private keys;
- retroactively revoking old data from a device that already possessed old root keys;
- traffic analysis or account-layer attacks that are outside this local simulation.

## 14. Production gates after Round 5D

Before a real remote sync service may ship, PAIA still needs:

1. platform-specific secure key storage design and implementation;
2. authenticated account/device directory semantics without making the server plaintext merge authority;
3. onboarding relay transport and expiry/replay limits;
4. device revocation + key-rotation distribution workflow;
5. remote listing/cursor/retention/compaction and old-key retirement rules;
6. explicit conflict-resolution UI;
7. offline retry/out-of-order tests across actual transport;
8. user-facing recovery UX and irreversible-loss warnings;
9. privacy review of device-directory and pairing metadata leakage.

Round 5D is therefore **key-management and trusted-device protocol simulation**, not live account/device sync.
