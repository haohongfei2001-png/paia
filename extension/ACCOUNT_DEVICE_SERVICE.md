# PAIA Account & Device Service Contract

Status: **Round 5E source of truth — local account/device directory and pairing-relay contract simulation implemented; production account/backend service not implemented**

Version: **1**

This document defines the maximum authority a future PAIA account/device service may have.

It builds on `TRUSTED_DEVICE_PROTOCOL.md`, `REMOTE_OBJECT_PROTOCOL.md` and `SYNC_CONTRACT.md`.

The service may coordinate public device trust metadata and short-lived onboarding relay messages. It must not become root-key authority, plaintext content authority or merge authority.

## 1. Server-visible device directory

A production service may need to know bounded public device metadata:

```text
accountId
device public credential
trusted / revoked state
latest confirmed keyVersion
membership epoch / service-side timestamps
```

The public credential may contain the ECDSA verification key and opaque device/credential IDs.

The service must not store:

- root-key material;
- device private signing key;
- Recovery Secret;
- Source/Input/Thought body or title;
- entity IDs or revision graph as merge metadata;
- payload/base/facts hashes for deciding content conflicts;
- Passport/private Context contents.

## 2. Account authentication boundary

Round 5E uses opaque local session tokens only to simulate an authenticated account session.

This is **not** a production login design.

A future service must authenticate the account/device session independently from PAIA content encryption. Account login credentials must not silently become the root encryption key.

## 3. Device trust state

The service directory can represent:

```text
trusted
revoked
```

A trusted device may perform account/device-management actions allowed by the future service policy.

A revoked device loses service authority immediately. Its existing local root keys are not magically erased; Round 5D rotation semantics still apply for future data secrecy.

The service must not claim that changing a directory row retroactively revokes old ciphertext already decryptable by that device.

## 4. Pairing relay

The account service may provide a short-lived relay for the Round 5D onboarding ceremony.

The relay state machine is:

```text
request
  ↓ trusted device publishes signed challenge
challenge
  ↓ trusted device publishes final encrypted package after local human approval
package
  ↓ joining device consumes once
consumed
```

An expired relay becomes unusable.

The relay is not allowed to decide whether the pairing code matched. That decision remains on the trusted client before the keyring-bearing package is generated.

## 5. Relay artifact rules

Relay artifacts are bounded JSON messages.

The contract rejects plaintext secret/content/merge-authority fields such as:

- root-key or key-material fields;
- private keys;
- Recovery Secret;
- Source/Input body/title/note/query;
- entity IDs or revision hashes intended for content merge authority.

Public onboarding credentials, public ECDH keys, signatures, salts/nonces and ciphertext are permitted because the Round 5D protocol authenticates/encrypts the sensitive keyring payload.

A future service should treat relay data as short-lived state, not a permanent device-history archive.

## 6. Replay and expiry

Round 5E local simulation enforces:

- bounded relay lifetime;
- one challenge publication per relay;
- one final package publication per relay;
- one final package consumption;
- explicit access token for the joining side;
- trusted account session for inviter-side relay mutations.

A production service still needs durable expiry, replay protection, rate limiting and abuse controls.

## 7. Merge authority remains client-side

The account/device service is not allowed to choose the winning Source/Input/Thought revision.

It does not replace `SYNC_CONTRACT.md`.

The service must never use:

- arrival time;
- account-session order;
- device directory status;
- keyVersion;
- server timestamp;

as a substitute for the Round 5B ancestry/tombstone merge rules.

## 8. Local simulator

`core/account-device-service-contract.js` provides an in-memory service simulator.

It can exercise:

- bootstrap of the first trusted public device credential;
- authenticated local service sessions;
- adding a second trusted device after local onboarding;
- revoking a device and invalidating its service session;
- short-lived pairing relay request/challenge/package/consume flow;
- relay expiry and one-shot behavior;
- rejection of plaintext secret or merge-authority fields.

It has no network, database, account provider or backend SDK.

## 9. Production gates after Round 5E

Before a live service may ship, PAIA still needs:

1. a real account authentication model independent from content encryption;
2. durable device-directory authorization and revocation semantics;
3. authenticated pairing relay with server-side expiry/replay/rate-limit controls;
4. privacy review of account/device/relay metadata leakage;
5. integration with actual platform secure-key persistence;
6. bounded encrypted remote-object listing/cursor/retention/compaction;
7. conflict-resolution UI and actual offline multi-device testing.

Round 5E therefore defines and simulates the service contract; it does not connect PAIA to a production account backend.
