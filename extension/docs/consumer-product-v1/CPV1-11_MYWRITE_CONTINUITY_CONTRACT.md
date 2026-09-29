# CPV1-11.0 MyWrite continuity metadata boundary

Status: **EXPERIMENTAL / DEFAULT_OFF / NON-BLOCKING**. This bounded local/synthetic contract does not admit MyWrite to the existing v1 Sync entity policy or enable cloud/device transport.

## Scope

A MyWrite draft has a stable `draft:` identity. The detached planner accepts only finite metadata: opaque write and parent-write identities, device identity/sequence, revision, deletion flag, and a fixed SHA-256 payload hash. No text, Topic label, title, context or private body is allowed in the planner input or output. The currently local MyWrite store remains the sole real writer. A future adapter would have to derive and authenticate parent-write lineage and carry any body only through an approved protected payload path; this work supplies neither adapter nor transport.

Direct parent-write lineage permits a one-step fast-forward. Divergent edits and unproven ancestry require explicit human conflict resolution; device sequence and wall-clock time cannot choose a winner. A proved deletion wins over its parent. An old device's edit cannot resurrect a tombstone. A concurrent delete/edit keeps deletion in force and returns only the edit hash for a future protected conflict view. Actual preservation and recovery of the encrypted edit payload are **not implemented or certified** here.

The synthetic two-device matrix covers concurrent offline edits, an explicit deletion, delayed reconnect, direct descendants, operation collision, malformed lineage, body-bearing tombstone refusal, and metadata-only admission. It does not establish real key recovery, device trust/revoke, account policy, Backup/Sync interaction or real multi-device continuity. DFG-CPV1-006 and B-03 remain owner decisions for deployment/privacy/authority. No new network, paid service, remote plaintext authority, Source/Input promotion or production sync activation is authorized by this document.
