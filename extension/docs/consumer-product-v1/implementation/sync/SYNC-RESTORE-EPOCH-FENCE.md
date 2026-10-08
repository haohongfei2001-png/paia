# SYNC journal / actual backup restore epoch fence

Base02779119. This closes a local optional-journal lifecycle gap, not device
identity initialization, provider binding, full restore or worker activation.
Only the two existing journals change. Core, BackupService, checkpoint activation,
codecs, schema, publication state, permissions and worker construction are unchanged.

JournalRestoreFence is shared by Prompt and manual Context journals. It reads the
existing recovery-restore-epoch and the exact Core namespace before asynchronous
preparation. A WeakMap associates that snapshot with the actual Core prepared
capability. Commit checks both again in the existing owner transaction; its first
successful commit writes a version1 ownerRecoveryEpoch marker in the existing Core
namespace. Failures roll back marker, canonical write, outbox and receipt together.
No journal-instance-only cached identity survives as authority across restart.

Malformed markers/epochs reject. A namespace with existing heads, no marker and
nonempty recovery epoch requires explicit reconciliation rather than silently
adopting old history. Head existence uses one bounded primary-range row. An explicit
fresh empty namespace can bootstrap existing legitimate canonical data with the
current epoch; this test-only namespace selection is not a new product reset API.
Staged checkpoint activation does not manufacture that reconciliation, and an
unbound activated namespace after backup recovery stays conservatively blocked.
Context access and existing automatic-item edits retain the already approved local
null-preparation path; they do not become synchronized permissions or manual data.

## Evidence

- Actual production BackupService.restore receives a valid synthetic historical
  backup containing exact Prompt preferences, via its normal stage/preview/confirm
  flow. No production export is re-enabled. Same-value replacement, different
  replacement and both prepared-operation restore interleavings originally failed:
 5/5FAIL `/tmp/sync-epoch-before.log`.
- After the fence, two initial test snapshot comparisons observed legitimate
  finishFoundation rebuilding thought-binding after restore. The fixture now
  establishes this existing prerequisite before its complete meta snapshot; it
  does not drop that row or weaken comparisons. `/tmp/sync-epoch-after.log` retained.
- Thirteen final owner cases cover those paths, durable reconstruction, local-only
  access, malformed marker versions/values, old unbound heads, explicit fresh
  namespace bootstrap, stale prepared namespace, marker rollback and actual
  staged activation remaining unbound. `/tmp/sync-epoch-final-owner.log`13PASS.
- Seven complete related files123/123PASS2991.64ms,
  `/tmp/sync-epoch-related-final.log`: new owner, Core, Info, manual Context,
  coexistence, mixed owners and checkpoints. Original source/privacy/receipt,
  rollback and causal limits remain in their owning files.
- Package11979 checks/359 runtime resources PASS `/tmp/sync-epoch-package.log`.

The native increment preserves all47 previous owner scenarios and adds13. It adds
an actual backup replacement between two real worker replacements, checks the new
service rejects the stale binding without changing the complete post-restore
snapshot, and strengthens exact head/tree, browser-version, source/release byte,
lifecycle and network evidence. Original120000ms per-variant budget remains.
Independent review passed; reviewer executed13/13 owner cases separately in
`/tmp/sync-restore-epoch-independent.log`. Final complete source/release2/2PASS,
60 scenarios per variant plus two real worker replacements,13981.03ms;
source4315.90ms/release4641.92ms. `/tmp/sync-epoch-native.log`,0fail/skip/cancel.
Both actual native lifetime and network-ledger oracles pass; source/release case
names and production digests exactly match. Recorded head/tree are base027 with
these dirty candidate bytes, not a claim the later commit was already executed.
Four runtime/fixture hashes stayed unchanged before/after (below). Current backup
version and complete historical restore regression23/23PASS917.40ms in
`/tmp/sync-epoch-backup-regression.log`, preserving original source/receipt gates.
An initial added stage test omitted its required explicit Prompt owner mapping;
correcting that fixture dependency retained the actual activation/UNBOUND checks.

## Limits

No dataset or installation ID is generated, no account/cloud permission is added,
no existing history/publication/financial metadata is deleted. Existing local
restore behavior is unchanged; rejection prevents a journal from silently writing
into its obsolete namespace. This is not a provider purge or complete source/body
history cleanup implementation. A trusted explicit reconciliation flow is still
needed before enabling journals in the production worker. Local-only Context
service behavior remains available with its existing authority checks.

Exact final candidate bytes:

```
0d9cce5ade88366d2ee8ab6a02f6011405b856f2564edc078dc118fa774cec30  core/browser-native-sync/prompt-journal.js
541e0fcc3f04c0fdd6ee1352f438734358e9f5e1e2745b4306966aa1d60650ab  core/browser-native-sync/context-journal.js
8d31e91876df5158d592e9fde98bd0ecdba7e03552aad8bc2f58c7b7cace16a7  tests/native-sync/context-info-chrome.test.mjs
0dbd8eac7789dbbd90ddf0aedc72b3606dcc7010f69d55e975ca3379dd578913  tests/native-sync/context-info-worker-fixture.mjs
```

### Coherent native CI admission

Root combines manual owners with restore-epoch fencing and the existing Prompt/AI batch under planned 0.24.2. Both existing Sync jobs now run all four complete nested native files, retaining storage/publication/retirement and the unchanged 12-minute budget and aggregate. The Context receipt requires 60 cases per variant, two actual worker restarts, complete zero-network lifetime proof, exact head/tree, and identical source/release hashes for the eleven specified production files. Scope remains optional manual Info/Rules/Now owners; provider and full canonical restore are explicitly false. Independent review passed 5 owning guards, both YAML parses, all Sync job Bash syntax and diff checks. Final runtime combination awaits the independently reviewed Prompt conflict repair; this admission is not live-provider certification.
