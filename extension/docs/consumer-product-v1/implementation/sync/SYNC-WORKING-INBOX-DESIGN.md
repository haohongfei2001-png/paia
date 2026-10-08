# SYNC-01 bounded receive inbox — design for independent review

Base: `e22ffbf1`. This document and the dedicated experiment do not implement an inbox or change product behavior. No provider, account, permission, schema, object store, worker registration, CI or version changes. Existing optional receiver still requires an existing unreferenced Input and a complete logical commit; no full restore claim.

## Authority and existing mechanisms

- BNS_CONTRACT BNS-05 (lines 89–94): canonical state, receipt and contiguous frontier commit together, or a bounded staging generation activates atomically. Local journals are not portable canonical truth; the Backup allowlist is not a serializer for arbitrary meta.
- BNS-06 (98–110): decode/hash/dependency limits apply before visibility; only published complete transport descriptors are candidate truth; durable progress resumes interruption; no cleanup based on age/guessed success.
- BNS-07 (116–122): independent staged restore and permanent negative fences remain mandatory. This work cannot shortcut activation or source creation.
- Current `CORE_LIMITS.batch=128`, `batchBytes=4 MiB` already bound complete Working receipt. These are inherited limits, not newly chosen inbox constants. The current receiver also imposes history<=96 and Keep<=16. Segment profile admits 512 operations and 4 MiB decoded operation bytes; one segment can contain multiple incomplete logical commits.
- Existing `PreparedPublicationJournal` keeps references and a blueprint, not another body copy. Its local metadata cap is 256 KiB and object cap 512. These numbers describe one prepared publication and are **not** an existing global inbox budget.
- Core keys use dataset prefix plus namespace. `JournalRestoreFence` reads `recovery-restore-epoch` and `ownerRecoveryEpoch`. Backup replace clears only `backupMetaAllowed` rows, leaving arbitrary BNS protocol metadata in place while changing the restore epoch. Switching a staged Core namespace also does not purge arbitrary old namespaces. An inbox must not assume its rows are removed by either mechanism.

## Measured production-chain experiment

`tests/experiments/input-working-inbox-study.mjs` calls real Input edit/journal, PreparedPublicationJournal.prepare/run, packer and readSegmentDescriptor. It uses synthetic canonical data, fake IndexedDB and an immutable in-memory object transport. It verifies exact published revision inventory after decoding. It does **not** measure native IndexedDB disk/RAM, real MV3 lifetime, provider quotas, or a lowest-host latency SLO.

Two execution batches produced 13 cases. First ten ran before adding the varied-CJK option; the original repeated-CJK generator remains byte-equivalent. The second batch ran only the three added varied-CJK cases (`--varied-only`), avoiding another execution of the unchanged ten. Both raw reports remain under `/tmp/input-working-inbox-study-{final,varied}.json`; the combined checked-in experiment JSON includes limits, metrics, final script hash and unchanged production hashes. IDs/order are random, so timing and arrival span are observations, not universal bounds.

| Case | Target KiB | Operations / groups | Published descriptors | Peak incomplete groups | Body-free descriptor/group index bytes |
|---|---:|---:|---:|---:|---:|
| 32 non-coalesced 1,024-character edits | 64 | 688 / 32 | 78 | 32 | 42,979 |
| same lawful scenario | 256 | 688 / 32 | 18 | 32 | 19,897 |
| same lawful scenario | 1024 | 688 / 32 | 6 | 32 | 7,738 |
| one-operation publication cuts | 64 | 6 / 1 | 6 | 1 | 1,771 |
| maximum 200,000-character varied CJK note | 64 / 256 | 6 / 1 | 1 | 1 | 298 |
| same maximum varied CJK note | 1024 | 6 / 1 | 2 | 1 | 591 |

The 32-edit operation corpus is 4,401,282 bytes; its largest single logical group is 37 operations / 260,827 bytes. The maximum-note single group is 1,207,846 bytes. Repeating every descriptor reference in every group would cost 723,489 bytes at 64KiB, rather than the measured 42,979 bytes with each descriptor stored once and a group-ID index. Retaining operation bodies would amplify local sensitive data by megabytes without an existing cleanup owner.

**The earlier proposal of four pending groups is withdrawn.** It would reject this ordinary 32-edit arrival pattern before enough groups finish. No new eight-MiB body budget is justified by these observations.

## Proposed minimal consumer path (not implemented)

Extend the **existing** InputWorkingCommitReceiver with `receiveSegment(ref,get)` and bounded `resume({limit:1,get})`; it directly calls existing `readSegmentDescriptor` and eventually the existing complete `receive` owner. No parallel dispatcher, alternate materializer, permissive generic Core handler, provider scheduler or public RPC is created. The producer remains the actual optional journal/publication path. Mixed unsupported codec segments refuse this specialized path explicitly; it cannot silently drop unrelated operations or pretend whole-provider discovery is complete.

Prefer **body-free inbox metadata**, not persisted operation payloads:

1. Before the first transport get/decoder await, read and capture the actual namespace and restore epoch through the existing fence owner; on resume also capture the exact persisted inbox claim. Fetch one published immutable segment descriptor through the existing bounded decoder. Validate all chunks/hash/count/required coverage and operation identities. Only then derive `{descriptorRef, logicalCommitIds}` metadata; do not store Source/body/note/history strings.
2. In the same transaction that admits pending metadata, re-read and require the namespace/restore epoch to equal the pre-fetch capture; a same-value Backup restore or namespace swap during decode rejects without pending rows, counters, Core acknowledgements or canonical changes. Never stamp fetched old objects with a newly observed epoch. Bind each retained descriptor to exact dataset, captured namespace/epoch and producer/commit identity discovered from validated operations. A descriptor's digest makes its object graph immutable for retries. Group IDs and descriptor refs are hints to locate data, never proof of canonical authority.
3. Store each descriptor once in existing `meta`, with exact metadata-byte/cardinality accounting in the same transaction. Use a dedicated dataset-scoped inbox prefix with explicit namespace/epoch fields so older pending references remain discoverable for bounded accounting; do not create unreachable per-namespace budget leaks. This index is local transfer state, excluded from Backup/canonical codecs.
4. On restart/retry, reload at most one requested group and fetch referenced descriptors sequentially, revalidating their bytes. Retain only that group's operations in memory and deduplicate exact identities. Reject divergent same-ID data; do not splice alternate valid commits. When current exact closure is available, call existing prepareWorkingReceive and the unchanged domain qualification.
5. Refactor only the existing receiver's private internal execution to carry an inbox claim; no caller-supplied write callback. In the final transaction revalidate inbox metadata generation/digest, namespace/epoch and current Source/permission/Working owner. Canonical write + Core receipt/frontier + this group's consumed markers/reference accounting commit atomically. Shared descriptors are retained until all their indexed logical commits are durably applied or a separately justified local invalidation occurs. Duplicate complete ACK may finish exact local transfer bookkeeping without replaying canonical edits.
6. Never mark a logical group applied for partial receipt; generic receive/applyPending/checkpoint paths retain their current rejection. Missing objects, missing parent commits, unavailable transport and stale owners remain explicit blocked/waiting states; a restart alone does not renew authority. Re-fetch cost and inability to complete offline without transport are explicit tradeoffs of avoiding body duplication.

## Bounded policy requiring review

A candidate **256 KiB total encoded inbox metadata** and **512 retained descriptor references**, with no independent arbitrary four-group cap (the complete serialized logicalCommitIds index still consumes the byte bound), reuses already reviewed publication journal/object magnitudes and covers the measured envelope. It is a proposed local admission window, **not** a protocol theorem, automatic permission to support every valid dataset, or a final memory profile. The complete-bundle cap remains the actual Core 128 / 4MiB values. Persisted group-ID indexes and accounting overhead count toward the metadata bound; do not count just descriptor refs.

Admission must calculate exact prospective serialized metadata before writes. Overflow rejects the entire offered segment with no eviction, truncated index, partial frontier or false completion. Existing incomplete groups remain usable. Finite budgets cannot guarantee progress under arbitrarily adversarial interleaving; on overflow the caller needs an explicit bounded rescan/focused retrieval strategy, or the operation stays honestly resource-blocked. A later implementation must test this and cannot advertise general convergence based only on the 32-edit corpus.

Only one descriptor decode and one complete group buffer may be live at a time; do not deserialize every pending group into a single Map. A complete group can legitimately approach 4MiB while unrelated operations in a shared segment add another bounded decode buffer. Native peak amplification remains a subsequent measurement gate before freezing a supported-host profile.

## Restore, removal and cleanup

- Epoch/namespace mismatch must be detected before object retrieval and again before final transaction. No old inbox content reaches a newly restored Input even when textual state is equal.
- Body-free refs avoid adding a second local user-body copy that existing Source purge does not know to erase. They still must never be used to resurrect purged data: final current Source/Working/negative-intent checks remain mandatory.
- Local transfer references may be discarded only on exact successful consumption or proven namespace/epoch invalidation under an explicit local cleanup transaction. Neither action emits provider deletion or a global tombstone. There is no wall-clock TTL, guessed remote absence, or silent retirement of required objects.
- Cleanup/accounting scans remain within the admitted dedicated prefix/count; corrupt/missing accounting does not become zero usage. Recovery recomputation must be bounded or refuse, not enumerate every meta row.

## Proposed ownership and decisive negatives

Proposed production changes only after design approval:

- `core/browser-native-sync/input-working-commit.js`: actual segment/resume consumer and private same-transaction finalizer.
- Optional `core/browser-native-sync/input-working-inbox.js`: strict body-free metadata/index/accounting helpers, using existing repository/Core APIs. No changes expected in public Core capability, codecs, IAStore, Source/Keep owner, schema or worker.
- Dedicated owner tests; existing receive native fixture/file and receipt. Root owns subsequent CI registration.

Required actual-chain cases: publication maxOperations1 plus descriptor-last/duplicates; cross-publication 32-group interleaving; real restart after partial references; wrong digest/missing chunk/unsupported mixed family; same operation ID divergent bytes and cross-commit member swap; exactly-at/over byte and descriptor limits with prior state intact; permission revoke/local edit/Source purge/namespace swap/same-value Backup replace between decode and final commit; specifically hold the decoder/get await, perform a same-value restore or namespace swap, then release it and prove pending admission itself makes zero writes; canonical writer abort and finalizer abort with full snapshot equality; duplicate ACK after later legitimate edits; no outbox echo; no Core receipt/frontier advancement for pending metadata; body-free rows exact allowlist; shared descriptor retained while another group remains; blocked download preserved across restart rather than pretending offline completion.

This is a review proposal. Runtime remains unchanged and no inbox capability has been delivered.

## Independent design review

Root-finish read-only review found and closed the pre-fetch/admission fence ambiguity: initial receive and resume capture the existing namespace/epoch before transport awaits, then verify it in the pending-admission transaction, as well as in final canonical commit. Duplicate cleanup remains a private same-transaction finalizer. All logicalCommitIds count toward the exact metadata byte cap, and invalid-epoch cleanup cannot discard global accounting before bounded row removal. No runtime implementation is authorized by this receipt alone.
