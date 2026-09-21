# ANS-09 legacy fixture provenance

`legacy-38804b9.json` contains only synthetic data produced by the actual
`38804b99153074f54148f875e2e09c76568bc1cd` pre-ANS extension's OrganizerStore,
ReaderStateService and BackupService. The pinned codeload archive was extracted
without editing its source. Its own BackupService accepted the resulting Backup
before it was saved. No current ANS exporter generated or patched these bytes.

The fixture includes a raw 37-store database snapshot and portable Backup:
known/unknown source time, identical text with distinct message IDs, manual Input
and Thought edits, independent new writing, a removed Thought/suppression,
source tombstones, capture/revisit exclusions and the previous sort preference.
`generate-legacy.mjs BASELINE_EXTENSION_DIRECTORY OUTPUT_FILE` reconstructs the
same scenarios with fresh synthetic UUIDs. The checked-in bytes are immutable
regression input; do not regenerate them with current runtime to make tests pass.
No real archive, browser profile, login state or provider credential is included.
The organizer uses the baseline's deterministic local synthetic response harness.

The raw snapshot tests upgrade in place. Portable Backup tests compare every
content item (not only counts), including IDs, Source bytes/hashes/time,
working bodies, provenance, field revisions, permissions and deletion fences.
Documented device-local permissions remain disabled after restore.
