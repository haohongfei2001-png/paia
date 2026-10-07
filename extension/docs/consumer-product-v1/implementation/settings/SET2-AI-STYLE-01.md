# Offline AI Organize style preference owner

Status: backend candidate; UI, native and full integrated acceptance pending.

Authority: `AI_ORGANIZE_STYLE_CONTRACT.md` and the current scoped Settings
Consumer v2 plan. This slice stores human preference intent through the existing
preference owner. It does not implement transformation, quota, Sync admission,
model selection or service availability.

## Stored and command contracts

`preferences.aiOrganizeStyle` is optional. Its version-1 envelope contains only
`version`, `value` (`original`, `balanced`, `concise`), positive safe-integer
`revision`, and `explicit: true`. Missing legacy state projects balanced at
revision zero without writing. The first explicit balanced choice records intent;
repeating a current explicit choice is a no-op. Revisions are local CAS, not a
cross-device winner or a transformation-cache key.

The existing `UPDATE_PREFERENCES` command accepts a style-only change containing
`version: 1`, a known `value`, `expectedRevision` and `expectedEpoch`. Stale requests return a
conflict without changing state. Both IndexedDB-backed and legacy store owners
use the same pure contract. The epoch comes from the existing nonportable recovery-restore generation, so a
completed restore cannot reuse a stale numeric CAS from another window. It is
never stored in the portable preference envelope. A failed legacy style write invalidates its cached
state so a lost acknowledgement cannot overwrite a committed newer revision.

`PAIA_SETTINGS_AI_STYLE` reads only the canonical preference projection. Its
exact type-only request and style writes require the trusted top-level Archive
page; existing valid Topic fragments remain admitted. Popup, content, incognito,
foreign and malformed callers are refused. A successful changed style emits only
`PAIA_SETTINGS_AI_STYLE_CHANGED`; no-op, stale and failed writes do not claim a
change. Generic preference maintenance/notification behavior is unchanged.
The dedicated event avoids indirectly waking maintenance through older
`ARCHIVE_CHANGED` listeners that fetch `GET_PAGE`.

## Compatibility and activation boundaries

Unknown versions/enums are retained exactly and expose an unavailable projection;
style edits fail closed. Unrelated preference writes preserve that envelope.
Backup optionally admits only the same four scalar metadata fields with bounded
version and enum token length, a positive safe revision and explicit marker.
No nested extensions, grants, jobs, consent or entitlements are admitted. An
unrecognized resident format with extra fields is preserved locally but cannot
be imported by this older Backup reader. Older backups without the optional key
retain absence. Restore does not authorize generation.

The existing IndexedDB-then-Chrome-local preference boundary remains unchanged.
This preference is outside current Sync admission; no journal/outbox is added.
No new object store, schema migration, Topic enumeration, body rewrite, filter
job, model call or automatic generation accompanies reads or writes.

## Evidence

- Twelve new owning cases exercise both actual store implementations, concurrent
  CAS, explicit balanced intent, A-B-A, no-op, unknown compatibility, failed and
  committed-but-unacknowledged writes, strict Backup and actual existing-file
  restore, exact worker admission, dedicated cross-window reads/notifications,
  and zero filter/maintenance/Topic scans or provider calls.
- The broader pre-message-refinement run passed 122 Settings/Backup/Context
  checks. The final refined backend passed all 13 style and About worker checks.
- Initial package audit: 10712 source guards; 338-file release build passed.
  Final checkpoint validation is recorded separately when rerun.

This backend alone does not add the 22nd Settings row or establish browser,
visual, transformation-quality, Sync or final product acceptance.


## Independent review corrections

The first backend `c1d8c206` had three reproduced recovery races: startup recovery
could overwrite an acknowledged style, a failed in-session restore could leave
pending settings that later overwrite it, and a completed restore could import
the same numeric revision seen by an older window. Those negative probes remain
part of the review record. Style admission now validates caller/schema before
awaiting startup Backup recovery. Every actual IndexedStore style read/write
refuses a pending `backup-recovery-settings` marker in its serialized transaction.
Reads carry the existing `recovery-restore-epoch`; writes require that exact epoch
and revision. No independent recovery writer or new persisted token is added.
Six actual-worker regressions cover startup success and failure before/after
publish, in-session success and failure before/after publish, replay through the
existing Backup owner, and stale pre-restore windows with equal numeric revision.
