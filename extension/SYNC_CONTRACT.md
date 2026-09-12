# PAIA Sync Contract

Status: **Round 5B contract source of truth — protocol defined, transport not implemented**

Version: **1**

This document defines what a future multi-device sync implementation is allowed to merge, what must remain device-local, and which conflicts require explicit user resolution.

It deliberately does **not** choose a cloud vendor, implement networking, create a remote account system, add encryption code, or copy the local IndexedDB wholesale.

The core rule remains:

> **Sync enriches facts; it never resets user work.**

## 1. Why the contract comes before sync

PAIA already contains several classes of state with different trust semantics:

- immutable Source Records;
- editable Working Inputs;
- document metadata and notes;
- user-edited Thought material;
- permanent tombstones;
- derived AI/search/Revisit projections;
- device-local authorization, audit and product telemetry.

Treating all of these as generic rows and resolving them with latest-write-wins would destroy the distinctions PAIA already relies on.

A future sync backend therefore consumes this contract; it does not define it.

## 2. Sync domains

### 2.1 Canonical sync candidates

The following state may participate in a future encrypted sync protocol:

| Entity class | Policy | Rule |
| --- | --- | --- |
| Source Record | `sync_source_facts` | Original source identity/body is immutable; only trustworthy source facts may enrich it. |
| Working Input | `sync_human_work` | User edits require revision ancestry; concurrent forks are explicit conflicts. |
| Document metadata | `sync_human_work` | User title/note/organization is human work and must not use latest-write-wins. |
| User-authored Thought work | `sync_human_work` | Protected human edits require ancestry and conflict preservation. |
| Explicit user visibility/removal intent | `sync_human_work` | Explicit user intent is revisioned user work, not an automatic derived decision. |

### 2.2 Rebuildable or device-local state

The following state must **not** be treated as canonical synchronized content by default:

| Entity class | Policy |
| --- | --- |
| Automatic Smart Filter decisions | rebuild locally |
| AI-organized projections | rebuild locally |
| Search indexes / lexical caches | rebuild locally |
| Context Package previews/bodies | device-local / ephemeral |
| Passport Grants | device-local authorization |
| Passport access audit | device-local metadata |
| Product Signals | device-local aggregate telemetry |
| Revisit cursor | device-local Reader state |
| Provider credentials | device-local secret |

A future product decision may change one of these scopes, but only through an explicit privacy/security review. They are not included merely because a sync transport can carry them.

## 3. Device identity

A future sync implementation must create a random opaque device identifier per installation.

Properties:

- not derived from user identity, hardware serial, email or machine name;
- not copied by PAIA Backup;
- used only for idempotence, replay detection and revision provenance;
- accompanied by a monotonically increasing per-device sequence;
- the sequence is **not a global logical clock and must not resolve edit conflicts**.

Wall-clock timestamps are useful for display and audit, but they are not authoritative merge order.

## 4. Sync envelope

`core/sync-contract.js` defines a metadata-only envelope used by the merge planner.

A sync envelope contains only bounded metadata such as:

```text
version
entityType
entityId
payloadHash
baseHash
factsHash (Source only)
deviceId
deviceSequence
operationId
permanentTombstone (Source only)
```

It must not carry raw private fields such as body text, title, note, query, Context text or summaries.

A future transport may carry encrypted content blobs separately. The contract intentionally leaves encryption/transport framing unimplemented in Round 5B.

## 5. Merge rules

### 5.1 Source Record

Source Record identity and original source body are immutable.

If two devices have the same Source identity:

- same immutable payload hash + same facts hash → equivalent;
- same immutable payload hash + different source facts → merge only through the existing source-evidence arbitration rules;
- different immutable payload hash → integrity conflict; never overwrite one with the other;
- permanent source tombstone on either side → tombstone wins.

A source fact merge may improve metadata/evidence, but it must not recreate user work from Source or overwrite a Working Input edit.

### 5.2 Human-authored working state

Working Input, user document metadata, protected Thought work and explicit user intent use revision ancestry.

Allowed automatic outcomes:

```text
same payload hash
→ equivalent

remote.baseHash == local.payloadHash
→ accept remote fast-forward

local.baseHash == remote.payloadHash
→ keep local fast-forward
```

Concurrent divergence:

```text
local.baseHash == remote.baseHash
AND local.payloadHash != remote.payloadHash
→ explicit human-edit conflict
```

If ancestry cannot be proven, PAIA must also produce a conflict rather than guess.

The following are forbidden as automatic conflict resolution:

- latest wall-clock timestamp wins;
- largest device sequence wins;
- server arrival order wins;
- longest text wins;
- AI chooses one silently;
- remote silently replaces local user work.

## 6. Permanent deletion

Permanent Source deletion is monotonic.

A source tombstone:

- propagates as deletion intent, not as deleted body text;
- wins over a stale remote Source copy;
- must prevent re-import/re-sync from resurrecting the Source;
- must trigger the same local detach/purge semantics that permanent deletion already uses;
- may not silently delete independent human-authored work that existing PAIA deletion rules preserve after Source detachment.

Ordinary reversible removal/visibility state is **not** a permanent tombstone. It remains revisioned user intent and can conflict with a concurrent restore/edit.

## 7. Conflict object

The merge planner returns a metadata-only conflict descriptor containing revision references/hashes for both sides.

It does not decide the final body.

A future conflict UI must be able to show both decrypted local revisions and let the user choose one, keep both, or manually merge where the entity supports it.

Conflict resolution itself must create a new explicit revision with both conflicting revisions as acknowledged ancestry/evidence; it must not mutate either historical revision in place.

## 8. Replay and idempotence

`deviceId + deviceSequence` and `operationId` are replay/idempotence tools.

They can answer:

- have we already applied this operation?
- is this sequence older than the last accepted sequence from this device?

They cannot answer:

- which concurrent human edit is correct?
- which Source body should replace another immutable Source?

## 9. Server trust model

Round 5B does not select a server or cloud provider.

A future implementation should assume the sync transport/backend is not the owner of personal truth.

Preferred direction:

- client-side encryption before upload;
- opaque remote object identifiers and revision metadata;
- plaintext merge/authorization decisions only on trusted user devices;
- remote service stores encrypted payloads and bounded routing/version metadata;
- provider credentials and Passport Grants remain local unless a later explicit security design changes that rule.

This direction is a contract requirement for future design work, not a claim that encryption is implemented today.

## 10. Initial synchronization

The first future sync must not upload a raw database file.

Instead it should enumerate approved canonical entities and emit versioned sync objects through a bounded export pipeline.

Before upload:

1. validate current local integrity;
2. exclude device-local/rebuildable state;
3. materialize stable entity identity/revision ancestry;
4. preserve Source tombstones and user-work revisions;
5. encrypt approved payloads;
6. upload idempotently.

A second device performs the same merge planner against local state; it does not replace its database wholesale.

## 11. Offline and multi-device cases that must be supported before release

A future sync implementation is not release-ready until tests cover at least:

- two devices independently edit the same Working Input from one ancestor;
- one device edits while another permanently deletes the Source;
- one device removes an Input while another edits/restores it;
- Source metadata enriches on one device while user text is edited on another;
- a stale device reconnects after missing multiple tombstones;
- repeated delivery and out-of-order operations;
- interrupted upload/download and retry;
- device reset/reinstall without reusing the old device identity;
- conflict resolution creates a new revision and preserves both parents;
- derived caches rebuild without being synchronized;
- restore from PAIA Backup does not impersonate an existing sync device.

## 12. Round 5B implementation boundary

Round 5B delivers:

- this protocol contract;
- `core/sync-contract.js` pure merge planner;
- automated contract tests;
- architecture/product/roadmap integration.

Round 5B does **not** deliver:

- cloud account/login;
- remote storage;
- network requests;
- background sync;
- encryption/key management implementation;
- device-registration UI;
- conflict-resolution UI;
- new IndexedDB object stores;
- a syncable Passport/Context history;
- live multi-device functionality.

Those require a separate product/security gate after the merge semantics are accepted and real product value justifies the complexity.
