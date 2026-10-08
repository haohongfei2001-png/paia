# SET2-02 Backup cancellation and reselection ownership

Base: d44d52ef. Local working-tree evidence; independent review passed, integration pending.

The existing BackupPanel now locks before the first await for cancellation and inspection. Inspection clears the prior session under the same lock, rather than awaiting the public cancel method and reopening admission. The cleanup captures the exact session ID and cannot clear a different session on a late acknowledgement. Cancel completion restores picker availability while keeping Restore disabled without a qualified preview. Failure-return focus happens after unlocking and only while the same Data destination remains visible.

No locale changes, new backup generation, schema, storage, permission, worker, CI or Topic/AI UI changes. Existing cancellation transport-error handling is retained, not reclassified as confirmed remote success. Empty/merge/replace previews, explicit replace confirmation, target generation and integrity values still reach the existing BackupService unchanged. A cancelled preview cannot trigger a restore; no claim of broader cross-window/financial/cloud recovery is made.

## Failure evidence and verification

- `/tmp/settings-backup-session-before.log`: actual BackupPanel methods, three failing negative cases: cancel did not lock; two inspections each began a session after the same cancellation; duplicate cancellation issued two RPCs. No core owner methods were replaced by stubs.
- Independent root review identified cancellation unlocking could re-enable Restore after clearing its preview. The final code recomputes its exact disabled condition; successful and rejected-cancel tests assert the actual control stays disabled.
- `/tmp/settings-backup-session-related-final.log`: five complete files, 16/16 PASS, zero failures/skips, 7.856s. Includes seven new actual presenter cases plus current-version, backup-hardening, CPV1-01.5 and style-backup owners.
- `/tmp/settings-backup-session-native.log`: first whole-file attempt retained as FAIL because invoked from repository root instead of required extension cwd; release builder path did not exist. Not counted as successful release evidence.
- `/tmp/settings-backup-session-native-final.log`: original complete UIR-04 Data file, 1/1 top-level PASS, 18.112s; source/isolated empty-profile restore/current isolated release flows all ran. New source and release coverage holds a real worker CANCEL acknowledgement, invokes duplicate file events/old restore click while held, asserts only one CANCEL and zero BEGIN/RESTORE, then reselects a valid file through the real chooser. Programmatic events deliberately test disabled-control bypass; they are not physical interaction evidence. Original privacy/no-network/library-preservation and removed-list assertions and 300s budget are unchanged.
- `/tmp/settings-backup-session-package-final.log`: 12346 package guardrails across 373 runtime resources PASS. `git diff --check` PASS.
- Headless Playwright 1.63.0 explicitly reused from the matching iah-minimal-results dependency path. No visible browser or external account/model was used.

Runtime/test SHA-256 before and after the final complete browser run matched all three files:

```
5e4edf5d54700d0230b51307c6f2e83dd4e65cddeab35e97c6311e504f7e4521  extension/ui/backup.js
6a0901ecf97cc36389d0c4e237cd5a359b8abd72677f9473c4d1da2908a831f6  extension/tests/settings-backup-session.test.mjs
07724e8e6f21b9d7ef4064a3d763b59437297a02cf80bc2d51816f613ef76998  extension/tests/uir-04-data-chrome-e2e.test.mjs
```

This is a local SET2-02 safety slice, not whole SET2-05 certification, complete cross-device recovery, restored retired exports, or proof of an installed user version.

Independent root review: exact four-file diff approved; actual lock/session ownership, Restore disabled state, existing RPC/replace/error semantics and native real-worker held acknowledgement verified. Root independently ran complete settings-backup-session + backup-v081 files: 27/27 PASS, 1002.9ms, `/tmp/settings-backup-root-review.log`. No whole-product or hosted certification is inferred.
