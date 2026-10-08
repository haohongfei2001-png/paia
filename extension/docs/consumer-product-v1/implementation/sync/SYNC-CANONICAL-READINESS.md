# Local canonical coverage readiness — diagnostic candidate

Base15091f1a282e38e175c8d0c17ae2b24a531c4616; branch
codex/sync-canonical-readiness-20261008. No current Core, checkpoint, backup,
Settings, schema, permission, CI or production caller is changed.

## Actual gap

A protocol checkpoint inventories registered heads. That is not the inventory
of canonical user state in the same local library. The actual synthetic test
creates manual Prompt work, captures Source, creates a Topic/named Section and
manual Context Item, bootstraps only Prompt, and successfully builds a checkpoint
whose coverage contains only promptPreferences. These are valid partial protocol
objects, not evidence of complete recoverability.

The current codec registry admits four types but explicitly lists unrepresented
canonical domains. Only Prompt has an implemented canonical restore function;
its aggregate purge remains unavailable. Even a bound Prompt journal and existing
head cannot prove that a later unjournaled canonical edit is covered. No current
metadata-only local-revision binding supplies that proof. This batch does not
invent one or weaken existing refusal behavior.

## Implementation

readCanonicalReadiness uses the existing CANDIDATE_CODECS store mapping,
CODECS admission registry and CODEC_COVERAGE missing-domain inventory. One real
read transaction counts stores, traverses at most10000 meta keys with the native
key cursor, reads namespace/owner/protocol generations and checks actual Prompt
service/journal/Core identity. Existing source-structure, Topic-name and backup
metadata allowlists classify key names only. Retired export remains retired.
No body-store records are scanned. The aggregate Context row is read only to
count items/access keys; this loads the existing aggregate owner row, including
its stored body fields. Those fields are not compared, serialized, hashed or
returned. Key-only traversal therefore does not mean zero body-bearing row reads.
No payload, entity-name, query or private text is returned or persisted.

Output reports per-family count, candidate/admitted codec version, actual journal
binding, registered Prompt head and current restore-owner availability. Registered
head is explicitly separate from canonical coverage proof. Exact revision coverage
is unavailable in the current registry; graph/other owner support also remains
unqualified. Purged/conflicted Prompt heads cannot be treated as ready. Other
allowlisted portable metadata and incomplete key scans are explicit blockers.

fullCanonicalReady is computed from these blockers and the actual incomplete
registry; it is not an unconditional success for empty protocol coverage.
The current registry cannot certify complete canonical restore. Future support
requires an explicit reviewed owner/matching-proof registry extension, not a
caller-supplied true flag or arbitrary restoration function. inventoryComplete
means the bounded metadata-key scan finished, not complete migration validation.
When that scan is truncated, metadata-family counts reflect only keys seen so
far and are not exact full-library totals; store counts still come from count().
productionActivation remains false and this read is not permission to connect.

## Evidence and limits

Eight new real-owner tests cover populated partial checkpoint, codec-versus-owner,
wrong journal binding, actual generation changes, count/key-only access, bounded
inventory, unjournaled canonical edit and aggregate purge refusal. Complete BNS
files plus Prompt service:108/108 PASS, zero skipped/cancelled,3036.83875ms,
/tmp/sync-readiness-related.log. Package11863 checks/356 runtime resources PASS,
/tmp/sync-readiness-package.log. No browser, cloud or paid API ran.

Preserved /tmp/sync-readiness-first.log:5 PASS/1 FAIL because fixture supplied
an empty Context section forbidden by the actual owner. A real nonempty section
fixed only fixture setup; next6/6 PASS is /tmp/sync-readiness-fixed.log, followed
by the final eight-case/full-related run. Whole-store comparisons prove the new
read does not alter canonical data, receipts or protocol state.

Independent root review found no blocking issue and ran all eight new tests
8/8 PASS (/tmp/sync-readiness-independent.log). Integration remains pending. No full Source graph restore,
Context restore/materialization, Prompt permanent-delete policy, new-device
account restore, migration scale, provider or installed-build certification is
claimed. This narrows and exposes readiness gaps; it does not close them.
