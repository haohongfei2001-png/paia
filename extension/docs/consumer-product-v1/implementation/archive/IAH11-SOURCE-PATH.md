# IAH-1.1 M2 — truthful search-result source path

Base: `4a248d86`, independent `codex/iah-source-path-20261008`. This is the adopted M2 secondary-attribution gap, not an additional M6 membership-copy redesign. No query/ranking/pagination, navigation, storage schema, permissions, version or CI changes.

## Implementation boundary

`SmartFilterStore.searchInputs` adds a read-only `sourcePath` DTO derived from the existing document and SourceStructure metadata owners. Conversation keys include provider; Project refs include provider, namespace and project ID. Unique documents are joined in chunks of at most 50, using three bulk read transactions per chunk; no transaction per hit and no body-copy metadata. Existing page limit and result order remain intact.

The qualified search's existing generation checks surround this projection. Changes during its asynchronous reads discard the whole qualified page and require restart. The legacy unqualified interface does not acquire a new snapshot-consistency promise. This DTO grants no navigation or write authority.

The existing secondary path displays Source, confirmed current Project name/status, Conversation title, and explicitly labelled last-known attribution where relevant. Missing membership is not confirmed unassigned; source deletion is not PAIA purge. A conversation's observed historical Project name never substitutes for missing current Project metadata. Existing `归属未知`, `未归属 Project`, `来源已删除` copy remains. Input text and actual send-time presentation are unchanged.

## Evidence and preserved failures

- Before implementation, two actual-store tests failed because `sourcePath` was absent: `/tmp/iah-source-path-before.log`.
- The added cross-provider fixture initially used unsupported short Claude message identifiers and then incorrectly assumed a conversation observation created a current Project name. Those fixture failures are preserved in `/tmp/iah-source-path-import-fixture-fail.log` and `/tmp/iah-source-path-cross-provider.log`; the final fixture uses the actual official importer and explicit Project observation.
- Four complete unit files: **32 PASS**, zero skip/cancel, `/tmp/iah-source-path-unit-final.log`. Includes same conversation/project ID across ChatGPT/Claude, same provider with distinct namespaces, current rename, Project and Conversation deletion, last-known versus unassigned/unknown, unchanged metadata on read, bounded 100-document projection, generation invalidation, and bilingual renderer facts. Existing search-identity and source-structure tests retained.
- Independent review: `settings_finish`, no blocking finding; separately ran source-path and renderer complete files, **11 PASS**. Reviewed provider-qualified identity, last-known truth, bounded joins and qualified generation fence.
- Package guard: **11880 PASS / 356 runtime resources**, `/tmp/iah-source-package.log`.
- Complete existing IAH source/release native file: **2 PASS**, zero skip/cancel, 61.23 seconds total; source 30.06s and release 30.29s, `/tmp/iah-source-path-native.log`. All prior assertions and 90-second per-variant budget remain; only secondary path assertion now expects actual owner-observed Source/Project plus the exact original Conversation title.

## Exact candidate bytes

Before and after native run SHA-256 lists matched exactly (`/tmp/iah-source-path-before.sha`, `/tmp/iah-source-path-after.sha`):

- `core/smart-filter-store.js`: `47891221a45c16307a64e6b34f86ccda5c8d9a6368e576d1e2ab76fa1ae330eb`
- `ui/smart-filter.js`: `85c85404e6f5e437673b319c08102cd5cf8f62c5465b8419c725cd0142efef08`
- `tests/iah11-result-presentation-chrome-e2e.test.mjs`: `1a4836960b32798f7bb949dd3a680e73ce05e02ac4179d9146adc2a732f6bca9`

This local batch is not exact-head hosted full certification, main integration, installed-user acceptance, or completion of every IAH outcome. Earlier hosted IAH release timeouts remain failures; local duration cannot prove those resolved.
