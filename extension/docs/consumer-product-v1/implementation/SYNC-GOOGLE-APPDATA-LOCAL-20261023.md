# Google appData local transport and original recovery composition

2026-10-23. Local implementation under the user's explicit Sync-resumption
instruction. No OAuth, account/credential read, live HTTP, cloud run, installation,
deployment, permission change or production activation was performed.

## Consuming path

`GoogleDriveAppDataTransport` implements original immutable `putImmutable/get`
and paginated `listCheckpoints`. A deliberately injected HTTP capability supplies
verified subject/client/generation binding; there is no default fetch or token
storage. Exact minimal app-data scope is required. Ordinary Settings remains
honestly unavailable until the missing real host/account qualification exists.

One synthetic test uses the actual Source bootstrap and Input Working owners,
original grouped `buildCheckpoint`, this adapter's request construction and a
fake HTTP Drive. It closes sender A and restores fresh B through the original
`LocalSyncRecoverySession`, comparing exact Source and Working canonical state.
No second business-record merger or replacement restore owner is introduced.

All URLs are fixed official Google API origins/routes. Queries require appData
space and hashed dataset/protocol metadata; metadata and original byte digest
are independently checked before returning content. Foreign objects are not
modified. Only original-owner validated final grouped manifests receive the
recovery index; the builder's internal unscoped manifests remain stored but are
not consumer discovery candidates. Discovery still validates the complete graph.
The index is a hint, not authorization or a retention proof.

Immutable publication reserves a generated file ID through original Core's
transactional metadata, keyed by dataset, client and subject. Concurrent callers
share that durable allocation. Unknown create/local-commit completion, restart
and same-ID 409 are reconciled by exact contained readback. No overwrite/delete,
rename-to-resolve, filename uniqueness assumption, automatic retry or new ID on
unknown publication occurs. Generation/namespace changes fence late reads;
closing after POST dispatch reports completion unknown, because abort cannot
prove the server did not commit. Later same-account reconciliation uses the
same durable ID. This does not promise cloud-content retirement or orphan GC.

## Resource and host boundary

Each public operation serializes on its transport instance, has a maximum
30-second request/continuation budget, 4096 request ceiling and 2 MiB cumulative
received-body ceiling. Exact-object search additionally caps at 16 pages;
list pages cap at 100 entries/256 KiB; metadata at64 KiB; object media at the
original reference length, at most1 MiB. Allowed404/409 bodies are metered too.
Outgoing multipart bytes are bounded by the original object limit plus bounded
metadata. The2 MiB figure is received bytes, not combined wire traffic.
Original repository transaction and recovery discovery guards remain intact.

The injected host must actually enforce response streaming bounds, redirects,
authenticated account binding, minimal token scope and cancellation. Local
post-response size checks bound our copy/parse, not the host's allocations.
A stalled local repository operation is not force-aborted by this adapter;
its original repository owner remains responsible for settlement. Nothing here
is proof that a real extension OAuth registration or all API methods accept the
requested scope in the intended release. Identity is never verified by a
`verified:true` flag or a browser email label.

## Evidence and limitations

Actual Node22.23.3 on macOS arm64. Final owning invocation33/33, exit0 with no
fail/cancel/skip/todo; duration is in the retained TAP. The tests exercise true
fake-IndexedDB transactions and original restore, but every provider request
is simulated. No real browser/Drive/performance/scale claim follows.

The first17/18 batch exposed the internal-manifest discovery incompatibility;
its failure is preserved. Subsequent18/18 and22/22 preceded independent review.
Review found the original opaque client-ID rule rejected actual Google-shaped
OAuth IDs; the fix uses a separate bounded client-ID rule and synthetic official
shape. Review also required explicit unknown-write semantics for held POST and
metering allowed404/409 bodies. Intermediate27/27,29/29 and31/31 and final33/33
are separate recorded invocations, not one concatenated pass. The initial
failure is not erased. Logs and source hashes are in the evidence manifest.

Remaining: real OAuth/HTTP host, identity/token lifecycle and official minimal
scope qualification; provider-backed consumer activation; full declared Sync C
canonical coverage/scale; authenticated real lost-device recovery; retirement,
cloud quota/physical deletion guarantees and native/platform evidence. These
remain open independently of this finite transport implementation.

## Primary references checked

- [Google app data folder](https://developers.google.com/workspace/drive/api/guides/appdata): hidden app-only storage and app-data scope/space.
- [Generate IDs](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/generateIds): appDataFolder space and pre-generated create IDs.
- [Create files](https://developers.google.com/workspace/drive/api/guides/create-file#generate-ids-to-use-with-your-files): same-ID retry/conflict behavior.
- [Multipart uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads): metadata and binary content in one bounded create.
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect): client-ID shape and separately verified identity.
