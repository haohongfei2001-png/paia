# PAIA macOS Secure Store Host

Status: **Round 5F.1 distribution hardening implemented; physical Secure Enclave validation on a real user Mac and execution of the real Apple signing/notarization pipeline are still required before public production-readiness may be claimed.**

This directory contains PAIA's macOS Native Messaging host for production-grade sync secret persistence.

## Security boundary

```text
Chrome extension
  -> optional nativeMessaging permission
  -> com.paia.secure_store
  -> macOS native host
  -> Keychain: retained root-key versions
  -> Secure Enclave: non-exportable P-256 device signing key
```

The host name and extension origin are pinned. Wildcard `allowed_origins` are not permitted. The extension must never fall back to IndexedDB, `chrome.storage`, local files or an exportable software signing key when this host is unavailable.

`allowed_origins` is a **Chrome launch boundary**, not cryptographic authentication of every local process. The native host is still a local executable, so this design does not claim to resist arbitrary malicious code already running as the same macOS user. Chrome-provided origin arguments are public routing context and must not be treated as an unforgeable credential outside Chrome's own mediation. Round 5F.1 therefore claims separation from ordinary extension/web storage and non-exportability of the device signing key, not a sandbox against same-user local malware.

Chrome documents the system-wide Google Chrome manifest path on macOS as:

`/Library/Google/Chrome/NativeMessagingHosts/<host-name>.json`

Reference: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

## Developer installation

The developer path is user-scoped and compiles for the current machine:

```sh
zsh native-hosts/macos/install.sh <32-character-extension-id>
```

It installs:

- host binary: `~/Library/Application Support/PAIA/SecureStore/paia-secure-store`
- manifest: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.paia.secure_store.json`

Then run the physical lifecycle verifier:

```sh
node native-hosts/macos/verify-physical.mjs \
  "$HOME/Library/Application Support/PAIA/SecureStore/paia-secure-store" \
  --require-enclave
```

A passing physical verification must prove, across separate native-host processes:

- Keychain write/read;
- atomic root-key replacement;
- root-key deletion;
- persistent Secure Enclave signing-key creation;
- stable public key after process restart;
- two independently verified signatures after restart;
- signing-key deletion and subsequent lookup failure.

The verifier emits only coarse pass/fail evidence. It does not print generated secret material, slot identifiers, public-key fingerprints or machine identifiers.

Exit code `3` means the machine could not satisfy the persistent Secure Enclave requirement. That is a failed production hardware gate, not permission to use a software-key fallback.

Developer uninstall:

```sh
zsh native-hosts/macos/uninstall.sh --user
```

## Production extension identity

A production native-host package must be bound to PAIA's **final, stable Chrome extension ID**. A local unpacked-extension ID is not a production identity.

Do not produce or notarize a public package until the extension distribution channel has fixed that ID (for example, the final Chrome Web Store identity or another deliberately controlled stable extension identity). Rebuilding a native-host package for a temporary ID would create a validly signed package that the eventual production extension cannot use.

The package builder therefore always requires the extension ID as an explicit argument and writes exactly one `allowed_origins` entry.

## Production package build

Production packaging is intentionally fail-closed. It requires both Apple Developer ID identities:

```sh
export PAIA_DEVELOPER_ID_APPLICATION='Developer ID Application: ...'
export PAIA_DEVELOPER_ID_INSTALLER='Developer ID Installer: ...'
export PAIA_SECURE_STORE_VERSION='1.0.0'

zsh native-hosts/macos/build-release.sh \
  <production-extension-id> \
  ./dist
```

The builder:

1. cross-compiles arm64 and x86_64 targets with a macOS 13.0 deployment target;
2. combines them into one universal native host;
3. signs the host with Hardened Runtime and a secure timestamp;
4. verifies the code signature;
5. creates a system-wide Chrome Native Messaging manifest with one exact extension origin;
6. builds a Developer ID Installer-signed `.pkg`;
7. verifies the package payload and signature;
8. writes SHA-256 and non-secret build metadata.

The resulting package is **not** release-ready until notarization succeeds.

### CI-only package mode

Automated certification has no Apple signing identity. It exercises the same package layout using an ad-hoc Hardened Runtime binary and unsigned installer package:

```sh
zsh native-hosts/macos/build-release.sh \
  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  /tmp/paia-secure-store-ci \
  --ci-adhoc
```

Artifacts from `--ci-adhoc` must never be distributed.

## Notarization

Apple's current notarization flow requires Developer ID-signed software and uses `notarytool`; PAIA does not support legacy `altool` notarization.

Reference: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution

Create a notarytool keychain profile outside the repository, then:

```sh
export PAIA_NOTARY_KEYCHAIN_PROFILE='PAIA_NOTARY'
zsh native-hosts/macos/notarize-release.sh \
  ./dist/PAIA-SecureStore-1.0.0.pkg
```

The notarization gate requires all of the following:

- package is signed by a Developer ID Installer identity;
- `notarytool` returns `Accepted`;
- the ticket is stapled successfully;
- stapler validation succeeds;
- Gatekeeper `spctl -t install` accepts the package.

Only after this gate succeeds should the package be distributed.

## System installation and removal

Install the signed and notarized package:

```sh
sudo installer -pkg ./dist/PAIA-SecureStore-1.0.0.pkg -target /
```

System-level removal:

```sh
zsh native-hosts/macos/uninstall.sh --system
```

The filesystem uninstaller deliberately does **not** enumerate or blindly erase Keychain/Secure Enclave secrets. Secret destruction is a separate trusted-device removal operation because uninstalling files and revoking cryptographic device state are different security actions.

## Release gates

A public macOS secure-store release is blocked unless all of these are true:

- repository certification is green;
- the production Chrome extension ID has been fixed and is the exact manifest `allowed_origins` value;
- production package uses Developer ID Application + Developer ID Installer signatures;
- notarization and Gatekeeper checks pass;
- at least one physical supported Mac passes `verify-physical.mjs --require-enclave`;
- no live sync code silently bypasses the secure-store readiness gate.

Round 5F.1 does not add account login, a device-directory backend, a pairing relay, encrypted remote transport or live multi-device sync.
