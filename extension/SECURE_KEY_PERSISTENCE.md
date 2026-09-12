# PAIA Secure Key Persistence Contract

Status: **Round 5E source of truth — secure-persistence capability contract and local test provider implemented; production platform secure storage not implemented**

Version: **1**

This contract defines what a storage provider must guarantee before PAIA is allowed to persist root-key material or a trusted-device private signing credential.

It builds on `TRUSTED_DEVICE_PROTOCOL.md`. It does not weaken the Round 5D rule that ordinary PAIA Backup is not a secret-key backup.

## 1. Secrets in scope

Production secret persistence is limited to explicit secret classes:

- retained sync root-key keyring material;
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

A provider that merely stores bytes in normal extension/browser application storage is not allowed to claim production readiness.

The capability gate is an **integration safety boundary**, not a sandbox against code that has already compromised the PAIA process. A production provider is trusted code: its capability claims must be backed by an actual reviewed platform adapter and platform-specific tests. An in-process malicious provider could lie about its own capabilities; Round 5E does not claim to defend against that threat.

## 3. Current Chrome Extension status

The current PAIA Chrome Extension has no integrated OS/hardware keystore provider.

Therefore `currentExtensionSecurePersistenceReadiness()` returns:

```text
available = false
reason = SECURE_OS_KEYSTORE_PROVIDER_REQUIRED
```

This is deliberate fail-closed behavior.

Round 5E does not place raw root keys or private signing keys into ordinary browser persistence as a temporary shortcut.

## 4. Test-only provider

`TestMemorySecretProvider` exists only so lifecycle semantics can be exercised in automated tests.

Properties:

- process-memory only;
- explicitly `testOnly = true`;
- never production-ready;
- rejected unless the caller explicitly enables a test provider;
- byte arrays are copied on write/read to avoid accidental aliasing in tests.

It is not a model for production storage.

## 5. Secret slots

A secret slot identifies only the local secure-storage destination:

```text
version
accountId
deviceId
secretClass
keyVersion   // only for root-key material
```

The slot is not a remote sync entity and must not become merge authority.

## 6. Backup and telemetry exclusion

Root keys and trusted-device private keys must remain excluded from:

- ordinary PAIA Backup;
- Product Signals;
- Passport Grants/audit;
- Reader/Search/Revisit projections;
- logs and diagnostics;
- remote account/device directory metadata.

A future explicit encrypted recovery/export workflow must remain separate from normal content backup.

## 7. Platform integration gate

Before live multi-device sync on any platform, that client must provide a concrete secure-storage adapter and pass platform-specific tests.

Examples of platform integrations may include OS/hardware-backed credential facilities, but Round 5E deliberately does not claim that any particular platform API has already been integrated.

The Web/Chrome client must not claim equivalence with a native OS keystore when such a bridge does not exist.

## 8. Failure semantics

If production secure storage is unavailable:

- PAIA may keep an in-memory protocol simulation;
- PAIA may offer recovery/export design separately;
- PAIA must not silently downgrade to ordinary app storage;
- live background sync requiring durable root keys must remain disabled.

## 9. Remaining work

Round 5E does not implement:

- macOS/iOS Keychain integration;
- Secure Enclave integration;
- Android Keystore integration;
- Windows credential protection;
- a native-host bridge for Chrome/Desktop;
- persistent non-exportable signing-key restoration;
- recovery-secret UX;
- key-store migration/rotation between platform providers.

Production secure-key persistence therefore remains an implementation gate after this contract round.
