# SET2-02 existing removed-list ownership and pagination

Base: `fe84b534f416fbdf32ec49ed9cbef7ccb5112878`, preserving the combined Topic writing and AI reading-safety work. This is a local component checkpoint, not SET2 completion, remote certification or user release.

The existing Data → Removed content → removed Topics / removed Entries destinations now share a view-local presenter. A later type selection supersedes earlier reads. An Entry cursor has at most one pending request; consumed controls are removed, duplicate IDs are not appended, and failed reads retain existing rows and allow retry. Settings or Data visibility transitions invalidate prior reads, including leave and reopen before a reply. The observer consumes pending hidden-attribute records before accepting a response.

Restore still uses the exact existing typed commands, object revision and operation ID. An uncertain acknowledgement can retry the same row's exact operation; a late success or failure cannot replace or publish an error on a different list. `TopicController.checked` retains its return/conflict/error behavior and defaults for all existing callers; only this presenter supplies an optional current-view predicate to qualify feedback. Post-restore read failures remain visible on their current list. The later full Topic refresh is bound to that reload generation.

No new store, schema, permission, universal restore, provider, account, export or destructive action is introduced. Topic listing still uses its existing unpaged backend; this batch does not claim bounded Topic pagination. Input/import-pending convergence, Placement recovery and existing asynchronous version-history modal behavior are outside this narrow list fix.

## Retained negative evidence

- `/tmp/settings-removed-before.log`: actual TopicController two failures on the unchanged base: late Topic response overwrites Entry selection; concurrent same-cursor calls issue two reads and append duplicate rows.
- `/tmp/settings-removed-late-error-before.log`: initial presenter still publishes a late restore error after changing type, 7 pass / 1 fail.
- `/tmp/settings-removed-checked-before.log`: independent review identified the real `checked` feedback path that the first fixture stub omitted. Removing the stub reproduced 7 pass / 1 fail. The final fixture calls real checked and verifies both current conflict feedback and stale-error suppression.
- `/tmp/settings-removed-native-first.log` and `-final.log`: earlier complete native passes bind earlier feedback versions only; they are not substituted for final evidence below.

## Final complete-file evidence

`node --test tests/settings-removed-list.test.mjs tests/thought-m1.test.mjs tests/thought-m2.test.mjs tests/background-security.test.mjs tests/settings-reader-return.test.mjs`: 111/111 pass, zero failed/skipped/cancelled, 1252.04 ms, `/tmp/settings-removed-related-complete.log`.

`python3 scripts/check_package.py`: 12247 checks / 370 runtime resources pass, `/tmp/settings-removed-package-complete.log`. No guard changes.

The original whole `tests/uir-04-data-chrome-e2e.test.mjs` keeps its 300000 ms deadline and all original Backup/restore/preview/cancel/no-network assertions. Its source and freshly built isolated release each add real worker creation/removal of 41 Entries (two actual pages) and a Topic, held real read responses across type selection, a disabled in-flight cursor, exactly one durable typed restore despite a late acknowledgement, and Settings group exit/reentry. No synthetic replacement of the data response is used; only delivery is delayed. Headless Chrome with explicit existing Playwright 1.63, synthetic data, no account or paid request. Final complete file: 1/1 pass (source and release inside the one original test), zero failed/skipped/cancelled, 15550.20 ms, `/tmp/settings-removed-native-complete.log`. All four recorded runtime/test hashes matched after execution.

## Exact runtime/test bytes
- `ui/topic-workspace.js`: `2c7ce7bcd2211b6ef2d4152bb211945c6ace756dcb9c4ed4cc5793e037824145`
- `ui/settings-removed-list.js`: `b52bd1e658be77ae63d30e4a279093789f31c38cd1d9eb5c8b924cc8fb1034a5`
- `tests/settings-removed-list.test.mjs`: `9f1c01b09ebd6e65a2e65f3e87d3cdea6cfa3b6f18b33f0bba1ea5a82a25c887`
- `tests/uir-04-data-chrome-e2e.test.mjs`: `433f0f335a4077d2040e52d3e37849889aa710dccc7d9766dba8afec506bd69b`

## Independent review

root_finish independently reviewed the final feedback/current-generation delta and executed the complete new owner file: 10/10 pass, 103 ms. The real checked-path failure is closed, current conflict and read-error feedback remain visible, and defaults for every other caller are unchanged. Review approved this five-file local checkpoint; no native rerun was required after review because runtime bytes stayed frozen.
