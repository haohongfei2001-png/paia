# CPV1-SYNC-01 foundation checkpoint

2026-10-07. **PARTIAL IMPLEMENTATION / NOT SYNC-01 CLOSURE.**

Baseline: main `4a3cb4e663d8ae745f8385c5c854d5b060e26309`, runtime
0.14.0. This bounded development checkpoint adds host-neutral local protocol
mechanics and an explicitly injected production Prompt transaction proof. It
does not instantiate Sync in the service worker, add UI availability, change
manifest permissions/schema/version, create accounts, contact a provider,
migrate a real database, or transfer user data. All fixtures are synthetic.

The subsequent Context 0.15 main integration
`0a438ccc67bb88d686d2939fa03027f09234d4ef` is not part of this checkpoint's
base. Its Rules/Now/Inputs, lineage and desired-Topic owners require a separate
codec review before this branch's integration. The earlier Info-only inventory
below describes this exact base, not the newer main product capability.

## What this checkpoint proves

- `core/browser-native-sync/core.js` uses the actual ArchiveRepository strict
  transactions. Exact operation/digest receipts, per-device sequence collision
  detection, contiguous frontiers and sparse received ranges are durable.
- Full parent closure is retained. Missing parents are isolated, then resolved;
  concurrent human siblings survive without an arrival/time/sequence winner.
  Explicit resolution names every current parent and rechecks the prepared cut.
- `PromptReuseService.change` has an optional injected journal. Hashing and
  serialization happen before IDB; the existing canonical preference CAS/write
  and operation/outbox commit share one transaction. A journal failure rolls
  back the saved template. The ordinary no-journal production path is unchanged.
- Prompt row CAS revision and reuse ranking remain local. A destination can edit
  after several source revisions; verified reuse does not invalidate later
  manual writes. Missing derived families do not erase independent manual text.
- Received batches are validated before a single atomic apply transaction.
  Remote application does not emit an outbox echo. Purges redact covered live,
  historical and pending bodies while retaining exact receipts and body-free
  fences; the fence itself remains publishable.
- Bounded deterministic segments pack ordinary operations together. Large
  operations use exact content-addressed chunks. Publication verifies objects by
  read-back and writes the immutable descriptor last. Unknown outcome retries
  reuse logical IDs. Missing chunks, digest substitution, wrong namespace,
  unknown required codecs and gzip expansion overflow are refused.

These are mechanics and the selected Prompt writer proof. A protocol state
snapshot is not a claim that every existing canonical domain owner is restored.

## Codec admission versus owner inventory

Only four codecs are admitted by the initial Core: immutable Source identity and
original bytes, current-base manual Context Item, per-card desired Context value,
and manual Prompt preferences. Their presence does not authorize a production
writer or restore path. Only the optional Prompt writer/materializer is connected
in the synthetic proof. Source mutable notes/visibility/time and source structure
are **not** smuggled into its immutable envelope.

`CANDIDATE_CODECS` is an explicit field/owner inventory. It is not the registry
used by `validateEntity`; unsupported candidates fail closed. Historical Backup
item validation alone is insufficient for ownership, exact identity hashes and
reference closure. The existing Backup allowlist and restore behavior are not
expanded by this checkpoint. Full activation is explicitly false.

| Current canonical responsibility | Actual writers at baseline | Remaining integration/codec proof |
|---|---|---|
| Source | `indexed-store.js` sourceOperation/saveRecord, update/trash/restore/resolveLegacy/purge; `import/ledger.js` commit through saveRecord/defaultBlock | Separate immutable identity/body from mutable user intent and evidence-qualified time; official import/legacy provenance; source fences; every write path |
| Working Input | `indexed-store.js` editDocument; `ia-store.js` afterInputEdit; `shared-working-content.js` | Atomic blocks, document title, input state/removal, shared binding invalidation and exact history; no UI-only hook |
| Independent Thought | `thought-store.js` create/edit/remove/restore; `library-documents-store.js` batches; IA compatibility, purge and invalidation | Protected independent body, provenance, legacy B-01/B-02 ambiguity, shared Input reference without second body |
| Topic/Section/Placement | thought-store, thought-organization/history, library-layout/revisions, topic-identity/intents | Stable logical identities versus generation-qualified physical rows; publish only completed active layouts; aliases, redirects, order, keep-separate and never-recreate closure |
| Revisions | `thought-journal.js`, IA journal and prune paths | Existing history IDs can coalesce in place and have retention rules. Sync uses independent immutable ancestry; it must not pretend those local IDs are immutable remote revisions |
| Topic identity tokens | topic-identity plus meta/thought-suppression-key | Opaque aliases/name tokens depend on a namespace key. A fresh-key restore cannot claim exact future name/never-recreate matching |
| Context (baseline) | `context-cards.js` change, meta/context-cards:v1 | Logical Items and per-card desired state; no global acknowledgement, epoch, capture consent or context receipt. New-device local reading remains an owner integration question |
| Context (new main) | Context Cards, topic preferences/access/policy, Item lineage/Topic scope, maintenance | Rules/Now/Inputs and automatic provenance require a separate exact-main inventory; desired choices need fresh-device acknowledgement, not imported effective access |
| Prompt manual work | `prompt-reuse-service.js` change | Selected optional atomic proof. Normalizer-independent mapping for pin/hide/representative/split intent is not yet qualified; raw content-derived `pf:` IDs do not prove upgrade safety |
| Prompt local ranking | `prompt-reuse-service.js` noteVerifiedReuse | reuseCount, ranking-only rows and local CAS revision excluded; regression checks retained |
| Consumer preferences | `indexed-store.js` updatePreferences/saveControl/publish | Current values are written to Chrome local after IDB. No atomic IDB-only outbox claim; explicit-versus-default metadata is absent and cannot be invented |
| Smart Filter | `smart-filter-store.js` setFilterMode | Mode has an IDB owner, but task/notice/policy epochs are not portable preferences |
| Whole-dataset restore | `backup-service.js` restore/recoverSettings | Direct-store/Chrome-local bypass must be integrated or activation-gated. Native domain receipts are not portable Sync receipts |

Derived search/cache/task rows, unsaved drafts, device geometry, credentials,
effective external grants and all Context command receipts remain nonportable.
Current permission/Source/purge guards remain in the canonical owners.

## Parameters and explicit limits

The **unfrozen** `bns1-candidate-256` profile has 1 MiB encoded objects, 4 MiB
decoded objects, at most 512 operations per received segment, 64 KiB chunks and
one decoded segment at a time. The packer accepts 64/256/1024 KiB targets. The
initial implementation declares a 4 MiB aggregate reassembled-operation resource ceiling per segment/receive batch;
it must be measured/revisited before any broad long-body support claim. It never
truncates content. These limits are neither provider limits nor a certified
supported-corpus envelope.

Core local preparation accepts 128 logical operations, 128 parents/live conflict
heads, 4,096 sparse gap ranges and 512 pending dependents per missing parent.
Ancestry traversal has a 100,000-read refusal bound. Exceeding a bound aborts the
transaction instead of dropping an ancestor, sibling, deletion fence or sequence.
These refusal paths do not establish the required 500k-Input scaling acceptance.

## Verification at this checkpoint

- 28 new synthetic Core/segment tests: passed.
- Focused Core/segments plus existing Prompt family/security/service/surface:
  102 tests passed, zero skipped.
- Package guard: 10,176 checks across 303 runtime resources passed at the initial
  pre-check; rerun against the exact final checkpoint before publication.
- Full suite, source/release native extension, staged checkpoint restore,
  1k/50k/500k parameter experiment and provider qualification: **not run / not
  closed by this checkpoint**.

## Required next work within SYNC-01

1. Independently review this exact checkpoint and retain negative conformance
   vectors, including typed error/collision and atomic failure paths.
2. Implement complete sharded checkpoints, missing-object isolation, staged
   atomic activation, causal tails, verified-equivalent compaction floors and
   stale-device return without losing tombstones or unresolved ancestry.
3. Complete the actual-main codec/owner matrix above, starting with the newly
   merged Context owners and graph-safe Working/Thought/Topic integration.
4. Measure the required packing/scaling matrix, including memory/parse
   amplification, cold/warm restart and request amplification. Freeze a profile
   only from that evidence.
5. Run exact populated-scope new-device conformance and applicable full gates.
   No adapter/OAuth work substitutes for these local requirements.

## Independent review corrections

The first pinned checkpoint was not publication-ready. Independent negative probes
found arrival-dependent repeated purge heads, caller mutation across WebCrypto,
aggregate chunk decompression amplification and a poisoned missing-parent retry.
The corrected checkpoint retains all body-free purge fences deterministically,
snapshots full incoming batches/objects before asynchronous validation, rejects
sparse arrays, bounds aggregate decoded operation bytes before chunk allocation,
uses own-property codec registry admission, and quarantines terminal invalid pending ancestry without failing a valid parent.
Focused regression evidence includes each reproduced failure; no gate was waived.

## Local Prompt receive owner protection follow-up

Based on merged main `c168b13170d762b4774740ce218613a45e31cde4`. Read-only audit found that ordinary `materializePrompt` receive bypassed the unmanaged/changed-owner checks already used by staged restore. Real synthetic `PromptReuseService` writes demonstrated both an independent existing manual template and an unjournaled local edit being overwritten by remote application. `/tmp/sync-prompt-owner-before.log` preserves two missing-rejection failures.

The local correction captures the previous protocol head and its bounded current versions in the same Core transaction before changing the head or redacting history. Remote Prompt application and staged restore then use one existing owner-qualification rule: empty unmanaged owners may accept a first operation; populated unmanaged owners and changed portable canonical content refuse. A refusal rolls back all owner/protocol metadata, including receipts, revisions, heads, frontiers, outbox and generation. Device-local reuse counters remain excluded from the portable comparison and continue to survive valid remote updates. Explicit local commits keep their existing behavior.

`/tmp/sync-prompt-owner-final-unit.log`: seven complete relevant Core/Prompt files, **109/109 PASS**, no skips/cancellations. New tests use real synthetic repositories and actual PromptReuseService actions, compare complete meta rows before/after rejected receive, and cover valid empty first application, managed descendant and duplicate delivery. The existing aggregate Prompt purge rejection is separately asserted with whole-meta rollback; no deletion policy, purge admission, schema, cloud adapter, worker activation or permission changed.

Existing storage-native harness preflight: **6/6 PASS** (`/tmp/sync-prompt-native-preflight.log`). The complete existing `native-sync/storage-chrome.test.mjs` source/release file then passed **32/32**, zero skipped/cancelled, 13.700 seconds (`/tmp/sync-prompt-owner-native.log`). Each variant additionally exercises actual PromptReuseService unmanaged and changed-owner refusal through native IndexedDB, compares every meta row across rollback, and accepts a legitimately empty first receive. These are synthetic local operations through the real owner, not cloud transport. Existing worker-restart, native-factory and zero-network assertions remain intact.

Generated storage receipts retain production byte hashes and report all three new owner outcomes. SHA-256: source `bd6156be8679cfae3fb44c3f2218fd683039db9d8316bd2d7b771ab8c38260e6`; release `7f8fc7e445ae2610b0f4d1b304d96398c764e43a9fc2fd7ccd30899055ed4f9b`. Their HEAD/tree identify the base checkout; `productionHashes` identify the tested, uncommitted candidate bytes.

This is local candidate evidence awaiting independent review and required integration gates. It does not close full Prompt purge/restore, dataset retirement, all-codec restoration, production Sync activation or real cloud recovery. The prior pure-Core retirement fixture still has a deliberate no-op owner and cannot stand in for Prompt purge materialization.
