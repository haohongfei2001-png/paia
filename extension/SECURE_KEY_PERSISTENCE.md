# PAIA Secure Key Persistence Contract

Status: **Round 5F source of truth — macOS Chrome native-host adapter implemented; CI compilation/Keychain certification required; real Secure Enclave device validation remains required before claiming public production readiness**

Version: **2**

This contract defines what a storage provider must guarantee before PAIA is allowed to persist root-key material or a trusted-device private signing credential.

It builds on `TRUSTED_DEVICE_PROTOCOL.md`. It does not weaken the Round 5D rule that ordinary PAIA Backup is not a secret-key backup.

## 1. Secrets in scope

Production secret persistence is limited to explicit secret classes:

- retained sync root-key material;
- trusted-device private signing credential.

Recovery Secret is intentionally separate. PAIA must not silently persist it alongside the normal profile merely because a secure store exists.

## 2. Production provider requirements

A provider is production-ready only when all of the following are true:

- protection is OS-keystore or hardware-keystore class;
- secret storage is isolated from ordinary application/web storage;
- atomic replace is supported;
- secure delete/removal is supported at the provider contract level;
- the device signing credential can remain non-exportable in the production integration;
- the provider is not marked test-only.

`core/secure-key-persistence.js` enforces this capability gate.

Round 5F additionally requires a production provider claiming non-exportable signing support to expose an explicit signer interface. Production callers may not use generic byte `store/load` operations for `device_signing_private` slots.

A provider that merely stores bytes in normal extension/browser application storage is not allowed to claim production readiness.

The capability gate is an **integration safety boundary**, not a sandbox against code that has already compromised the PAIA process. A production provider is trusted code: its capability claims must be backed by an actual reviewed platform adapter and platform-specific tests.

## 3. macOS Chrome adapter

Round 5F adds the first concrete platform adapter:

```text
Chrome Extension
  -> chrome.runtime.sendNativeMessage("com.paia.secure_store")
  -> macOS native messaging host
  -> Keychain for root-key material
  -> Secure Enclave P-256 key for the device signing credential
```

The packaged JavaScript adapter is `core/macos-native-secure-store.js`.

The native host source is `native-hosts/macos/paia-secure-store.swift` and is distributed separately from the Chrome extension package. Chrome's native-host manifest restricts access to an explicit extension ID.

Root-key slots use macOS Keychain generic-password items with `ThisDeviceOnly` accessibility. Replacement uses `SecItemUpdate`; deletion uses `SecItemDelete`.

The device signing credential is different: the extension never supplies or receives private-key bytes. The host generates a P-256 private key directly with `kSecAttrTokenIDSecureEnclave`, persists the private key under a slot-derived application tag, exports only the public key, and exposes signing as an operation.

If Secure Enclave is unavailable, the provider is **not** production-ready and device-key creation fails closed. It must not fall back to an exportable software private key.

## 4. Chrome readiness semantics

`currentExtensionSecurePersistenceReadiness()` remains a conservative static baseline and therefore returns unavailable until a platform provider is actually probed.

On macOS, `probeCurrentExtensionSecurePersistenceReadiness()` performs the real native-host handshake.

It returns `available=true` only when:

- the reviewed native host is installed and reachable;
- the protocol version and provider identity are valid;
- Keychain-backed secret operations are exposed;
- Secure Enclave is available;
- the provider advertises every capability required by the production gate.

Missing native host, forbidden host access, protocol mismatch or missing Secure Enclave all remain fail-closed states.

## 5. Test-only provider

`TestMemorySecretProvider` exists only so lifecycle semantics can be exercised in automated tests.

Properties:

- process-memory only;
- explicitly `testOnly = true`;
- never production-ready;
- rejected unless the caller explicitly enables a test provider;
- byte arrays are copied on write/read to avoid accidental aliasing in tests.

It is not a model for production storage.

## 6. Secret slots

A secret slot identifies only the local secure-storage destination:

```text
version
accountId
deviceId
secretClass
keyVersion   // only for root-key material
```

The slot is not a remote sync entity and must not become merge authority.

For root-key material, Round 5F stores each retained key version in its own secure slot. The non-secret keyring manifest may record `currentVersion` and the retained version numbers, but never key bytes.

## 7. Persistent sync identity primitives

`core/secure-sync-identity.js` provides production-oriented local primitives on top of the secure persistence gate:

- `SecurePersistentSyncKeyring` creates, rotates, reopens and removes versioned root keys through secure slots;
- `SecurePersistentTrustedDeviceCredential` creates or reopens a hardware-backed signer while persisting only a non-secret manifest in ordinary application state;
- reopening verifies that the hardware-backed public key still matches the persisted public credential;
- private signing material never enters ordinary application storage or PAIA Backup.

These primitives do not enable live sync by themselves.

## 8. Backup and telemetry exclusion

Root keys and trusted-device private keys must remain excluded from:

- ordinary PAIA Backup;
- Product Signals;
- Passport Grants/audit;
- Reader/Search/Revisit projections;
- logs and diagnostics;
- remote account/device directory metadata.

A future explicit encrypted recovery/export workflow must remain separate from normal content backup.

## 9. Platform integration gate

Before live multi-device sync on any platform, that client must provide a concrete secure-storage adapter and pass platform-specific tests.

The Web/Chrome client must not claim equivalence with a native OS keystore when such a bridge does not exist.

The macOS adapter is the first implementation of this rule. Windows, Android, iOS and any browser-only environment remain unavailable until separately implemented and reviewed.

## 10. Failure semantics

If production secure storage is unavailable:

- PAIA may keep an in-memory protocol simulation;
- PAIA may offer recovery/export design separately;
- PAIA must not silently downgrade to ordinary app storage;
- live background sync requiring durable root keys must remain disabled.

A Secure Enclave failure must not silently create an exportable software ECDSA private key.

## 11. Certification and remaining work

Round 5F certification requires:

- existing PAIA unit/privacy/browser/release gates remain green;
- JavaScript adapter restart/reopen tests pass against a simulated persistent native host;
- the Swift host compiles on macOS CI;
- macOS CI exercises actual Keychain root-key write/read/replace/delete;
- hosts without Secure Enclave prove the fail-closed path;
- at least one physical Secure Enclave Mac must later verify create -> sign -> process restart -> reopen -> sign -> delete before public production-readiness is claimed.

Still not implemented by Round 5F:

- signed/notarized native-host distribution;
- Windows secure-store adapter;
- iOS Keychain/Secure Enclave adapter;
- Android Keystore adapter;
- account login/device-directory backend;
- network pairing relay;
- encrypted remote-object transport;
- conflict-resolution UI;
- live multi-device sync.
