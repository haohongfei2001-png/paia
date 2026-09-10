# v0.6.2 policy supplement

The current Light policy and evidence limits are specified in LIGHT_FILTER_COVERAGE.md. Earlier descriptions below of a universal unknown-metadata veto and deterministic-light-1 are historical.

---

# v0.6.1.1 Diagnostics supplement

See [SMART_FILTER_DIAGNOSTICS.md](SMART_FILTER_DIAGNOSTICS.md) for the queue repair and current scheduling/diagnostics contract. The v0.6.1 text below is historical where it describes four batches per wake; Light decision rules are unchanged.

---

# v0.6.1 Smart Filter — implemented internal contract

Independent worktree based on frozen 01a6350. No daily deployment or database access. MVP Light (default) / Off; deterministic complete-utterance high-precision filtering, provider-neutral classifier contract and adversarial benchmark. No semantic model is required or installed. No Organizer, Memory, Standard/Strong, new export provider, permissions or network.

Capture saves immutable Source and editable Input first. Minimal trusted attachment/reference presence metadata contains only enums and confidence, never attachment bodies/names or assistant text. Unknown legacy attachment/authorship evidence remains visible. AI-filtered, user-removed and source-tombstoned are independent. User edits, explicit keep and restores permanently protect Input, including undo back to original and same-source recapture. Filtering never changes source/time/content revisions or import checkpoints.

Default reading hides valid decisions using a per-document safe snapshot; late results cannot remove visible text during editing, autosave, focus changes or pagination. Full-text search includes every non-user-removed Input including filtered text, labels search hits subtly, and opens temporary context without granting keep. Settings owns mode and recent-filtered browsing/restoration. Upgraded nonempty archives receive one weak home-only notice consumed once; fresh installations do not.

Migration uses additive indexed stores and resumable batches, retains old logical schema6 and all v0.5.1 stores. Filter workflow/policy/classifier versions and content/presence versions invalidate cached decisions conservatively. Failure/unknown means keep; queue work is bounded and never blocks capture correctness. Filter visibility changes do not remove or rewrite existing Thoughts. Future candidate/context-only access is internal and respects removals/purge.

Tests: lossless upgrade/restart, keep latch and undo/revision, search/context, lifecycle precedence, cached incremental work, late commits, fixed snapshots, one-time onboarding, unknown metadata, adversarial affirmative/choice/constraint/poetry/reference cases, 1k/10k/100k migration/query/evaluation, trusted-context security and zero network. Real Chrome scope is isolated synthetic, never private live evidence. Record benchmark precision and coverage separately; no unearned confidence claims from duplicated fixtures.

## Final technical boundaries

- Physical IndexedDB v4 adds filterInputs and filterIntents; old IA v3/legacy control schema6 and every source/import store are preserved. Old v060 binaries fail closed after v4 activation; Git rollback is not database rollback. Migration marker meta/smart-filter has migrationVersion=1, phase, mapped/legacyCount and verified. Existing records are legacy_unknown, not invented untouched records.
- filterInputs contains no source/body copies. It records presence enums, authorship evidence, monotonic override, pending state, decision/reason, three versions, input content revision and decision sequence. Source-identity keep intents preserve protection across recapture/identity enrichment. Permanent Source purge clears associated filter metadata without touching unrelated source intents.
- Presence collection is optional inside the already-validated adapter, bounded to a single user turn and 256 element nodes. No assistant/attachment text, filenames, source URLs, binary content or DOM markup is retained. Missing trustworthy complete scope is unknown. The prior capture/response/time algorithms remain pinned except the single explicit presence-helper call.
- Capture commits before the optional filtering queue write. Failed queue/inference work leaves the content visible. Queue batches are at most 100; production processes at most four batches per wake. Pending rows persist across worker restarts, and subsequent accepted requests resume work. Light/Off reuses decisions; incompatible classifier/policy versions schedule bounded incremental reevaluation. No alarm permission, model download, cloud fallback or runtime provider is installed.
- Light's initial rule surface intentionally covers only complete continue/retry utterances. Ambiguous confirmations, starts/authorizations, references, quotes, questions, nonstandard Unicode, additional clauses and all protected/unknown inputs remain visible. Only ordinary outer spaces normalize; line endings never disappear during classification.
- Reading uses mode + committed decision-sequence cutoff for the document session, shared across its pages. New/late decisions cannot hide already-visible text. Full search scans all eligible Input rows in bounded pages, including smart-filtered rows; search context is a temporary view exception, never a keep write. Ordinary reading contains no filter controls or placeholders.
- Existing Thoughts are unchanged by filter policy. New internal extraction targets must be eligible primary inputs. Context-only checks require a visible same-document anchor and at most two neighbours; removed/purged content is never authorized this way. No Organizer is implemented.
- Model evaluation is an unused provider-neutral interface, with an empty provider registry. Synthetic benchmark precision, false positives, category totals and coverage are reported separately. The small positive grammar suite is not a population precision confidence guarantee.

## Acceptance

490/490 full-suite tests, 2829 package guardrails and isolated Chrome upgrade/UI acceptance passed. See [acceptance report](outputs/v0.6.1-acceptance.md). No daily deployment or semantic runtime.
