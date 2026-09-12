# PAIA Secure Key Persistence Contract

Status: **Round 5F.1 source of truth — macOS Chrome native-host adapter and signed/notarized distribution pipeline implemented; physical Secure Enclave validation and execution of the real Developer ID/notarization pipeline remain required before public production readiness**

Version: **3**

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

The macOS Native Messaging boundary does **not** claim to resist arbitrary code already executing as the same local user. Chrome enforces the native-host manifest and `allowed_origins` when Chrome launches the host, but the host executable is still a local executable; a separate same-user process can attempt to invoke it directly outside Chrome's mediation. The caller origin passed by Chrome is public routing context, not cryptographic proof of caller identity. Therefore Round 5F/5F.1 claims are limited to isolating secret persistence from ordinary extension/web storage and keeping the device signing private key non-exportable. Defending against arbitrary same-user local malware would require a stronger OS service/access-control design and is outside this adapter's current threat model.

## 3. macOS Chrome adapter

Round 5F adds the first concrete platform adapter:

```text
Chrome Extension
  -> explicit optional nativeMessaging grant
  -> chrome.runtime.sendNativeMessage("com.paia.secure_store")
  -> macOS native messaging host
  -> Keychain for root-key material
  -> Secure Enclave P-256 key for the device signing credential
```

The packaged JavaScript adapter is `core/macos-native-secure-store.js`.

The native host source is `native-hosts/macos/paia-secure-store.swift` and is distributed separately from the Chrome extension package. Chrome's native-host manifest restricts access to an explicit extension ID.

The extension keeps its ambient required permissions at `storage` only. `nativeMessaging` is declared as the sole optional permission. PAIA must not request it during normal archive/Reader/Search/Thought operation or during a passive readiness probe. A future user-facing secure-sync flow must explain the need and invoke the explicit permission-request helper from a user gesture before the native host can be contacted.

Root-key slots use macOS Keychain generic-password items with `ThisDeviceOnly` accessibility. Replacement uses `SecItemUpdate`; deletion uses `SecItemDelete`.

The device signing credential is different: the extension never supplies or receives private-key bytes. The host generates a P-256 private key directly with `kSecAttrTokenIDSecureEnclave`, persists the private key under a slot-derived application tag, exports only the public key, and exposes signing as an operation.

If Secure Enclave is unavailable, the provider is **not** production-ready and device-key creation fails closed. It must not fall back to an exportable software private key.

## 4. Chrome readiness semantics

`currentExtensionSecurePersistenceReadiness()` remains a conservative static baseline and therefore returns unavailable until a platform provider is actually probed.

On macOS, `probeCurrentExtensionSecurePersistenceReadiness()` is passive with respect to privileges:

- if `nativeMessaging` has not already been granted, it returns `SECURE_NATIVE_MESSAGING_PERMISSION_REQUIRED` and makes **zero** native-host calls;
- it never requests the optional permission itself;
- after an explicit grant, it performs the real native-host handshake.

After permission is already granted, the probe returns `available=true` only when:

- the reviewed native host is installed and reachable;
- the protocol version and provider identity are valid;
- Keychain-backed secret operations are exposed;
- persistent Secure Enclave key creation/lookup/delete capability is available;
- the provider advertises every capability required by the production gate.

Missing optional permission, missing native host, forbidden host access, protocol mismatch or missing persistent Secure Enclave capability all remain fail-closed states.

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
- the existing Round 5D onboarding ceremony accepts these validated signing/keyring capabilities without weakening its pairing-code or human-confirmation rules;
- an approved transferred keyring can be imported into the joining device's own secure slots only when those slots are empty; partial writes roll back;
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

A denied optional native-messaging permission must be treated as the user's choice, not as an error to retry automatically.

A Secure Enclave failure must not silently create an exportable software ECDSA private key.

## 11. Physical hardware validation gate

Round 5F.1 adds `native-hosts/macos/verify-physical.mjs` as the canonical physical-device lifecycle check.

A physical validation pass must run the installed host across separate processes and prove all of the following on a real supported Mac:

- Keychain root-key write/read survives process restart;
- root-key replacement returns the replacement value rather than stale data;
- root-key deletion is observable;
- a persistent Secure Enclave P-256 signing key can be created;
- the public key is stable after native-host process restart;
- signatures from independent post-restart host processes verify with that public key;
- signing-key deletion makes subsequent lookup fail.

The verifier must not emit secret material, generated slot IDs, public-key fingerprints or machine identifiers into durable evidence.

`--require-enclave` is the only mode that can close the physical production gate. `--allow-no-enclave` exists solely so hosted CI can prove the fail-closed branch without pretending hosted CI is physical hardware evidence.

## 12. macOS distribution gate

Round 5F.1 adds a formal direct-distribution path under `native-hosts/macos/`.

`build-release.sh` production mode must:

- require an exact 32-character Chrome extension ID;
- build both arm64 and x86_64 native-host slices and combine them into one universal executable;
- use an explicit macOS deployment target rather than inheriting the build machine's current OS as the minimum;
- sign the native host with a **Developer ID Application** identity, Hardened Runtime and a secure timestamp;
- place the binary at `/Library/Application Support/PAIA/SecureStore/paia-secure-store`;
- place the Chrome system-wide native-host manifest at `/Library/Google/Chrome/NativeMessagingHosts/com.paia.secure_store.json`;
- pin `allowed_origins` to the exact production extension ID with no wildcard;
- build a `.pkg` signed with a **Developer ID Installer** identity;
- verify package payload and signature before returning success.

`--ci-adhoc` is a separate certification-only mode. It may use an ad-hoc Hardened Runtime binary and unsigned installer package solely to exercise architecture and payload layout. Such artifacts are explicitly non-distributable.

`notarize-release.sh` is the release notarization gate. It must reject a package that is not Developer ID Installer-signed, submit with Apple's current `notarytool` flow, require `Accepted`, staple and validate the ticket, and require Gatekeeper `spctl -t install` acceptance.

No Apple signing identity, private key, notarization credential or keychain profile may be stored in the repository.

An actually signed/notarized package has **not** been produced merely because these scripts exist. That release gate closes only when the production pipeline is executed successfully with authorized Apple credentials.

## 13. Installation and removal semantics

The developer installer remains user-scoped. The production `.pkg` uses system-wide Chrome Native Messaging registration.

Filesystem uninstall and cryptographic device revocation are intentionally separate operations:

- user/system uninstall scripts may remove the host binary, native-host manifest and package receipt;
- they must not blindly enumerate or erase account/device secret state from Keychain or Secure Enclave;
- secret destruction must remain an explicit trusted-device removal operation with account/device context.

This prevents a generic filesystem uninstall from becoming an unaudited bulk cryptographic erase primitive.

## 14. Certification and remaining work

Automated engineering certification now requires:

- existing PAIA unit/privacy/browser/release gates remain green;
- JavaScript adapter restart/reopen tests pass against a simulated persistent native host;
- optional `nativeMessaging` remains unrequested during passive probe and normal product operation;
- the Swift host compiles on macOS CI;
- macOS CI exercises actual Keychain root-key write/read/replace/delete;
- hosts without persistent Secure Enclave capability prove the fail-closed path;
- the Round 5D onboarding ceremony can use persistent credentials and persist the transferred keyring after a simulated restart;
- the physical verifier executes in CI-safe fail-closed mode without treating lack of Secure Enclave as a physical pass;
- the universal package builder succeeds in CI-only mode and proves both architectures plus exact package payload paths;
- all distribution scripts pass syntax checks.

Before public production-readiness is claimed, both external gates remain required:

1. at least one physical supported Secure Enclave Mac passes `verify-physical.mjs --require-enclave` against the installed host;
2. an authorized Developer ID build passes `build-release.sh` production mode and `notarize-release.sh`, including stapler and Gatekeeper validation.

Still not implemented by Round 5F.1:

- a completed real-device physical validation record;
- a real Developer ID-signed/notarized PAIA Secure Store package;
- automatic signed-host update/removal UX;
- Windows secure-store adapter;
- iOS Keychain/Secure Enclave adapter;
- Android Keystore adapter;
- account login/device-directory backend;
- network pairing relay;
- encrypted remote-object transport;
- conflict-resolution UI;
- live multi-device sync.
