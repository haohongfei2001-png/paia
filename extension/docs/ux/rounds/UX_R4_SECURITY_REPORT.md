# UX-R4 DELTA-04 / DELTA-05 security report

## Boundary and ownership

Manual reuse is a new explicit intent inside the existing ContextPackageService. ManualContext owns only bounded worker-RAM sessions; it does not create a body store, Profile, Grant, consumer or background network request. The service worker derives ownership from the trusted extension tab/document sender. A caller cannot supply an owner or promote an old preview into a manual selection. All PAIA_CONTEXT messages require consent and the existing exact trusted sender check.

The manual DTO accepts canonical kind/id/revision, and a validated optional range, Source ID or saved AI field. Full text is resolved by the domain owner from current IndexedDB records. UI snippets never authorize or supply the source body. Every preview and output rechecks dependencies, revisions, removal state, tombstones and explicit restrictions. Source, human Thought and generated AI sections retain distinct roles; an optional task note is new instruction context, never presented as a past fact.

## DELTA-04 threat matrix

| Attempt | Result / verification |
|---|---|
| Content script, foreign extension URL, spoofed sender or missing consent | Trusted worker dispatch rejects. The added background-security test covers the actual message path. |
| Arbitrary manual intent, injected owner, unknown fields or legacy Grant preview ID | Strict DTO validation or MEMORY_EXPIRED; no identity conversion. Unit and real worker tests. |
| Read another tab's selection or replay a stale generation | Owner/generation check rejects. Worker restart and fixed 15-minute lifetime expire the session. |
| Explicit Input/Thought exclusion, never/denied Topic, inherited section/Topic restriction | Canonical provenance checks block the affected item. Only a separate explicit rule-change action can remove that exact rule. Blocked selections remain blocked and require removal/reselection. |
| Source purge, Input removal or revision change after selection | Body is cleared or marked stale; preview/copy/file output cannot return the previous text. Independent context-only human writing is preserved where its body does not depend on the removed source. |
| Hidden truncation, suggested-item replacement or automatic query-based reselection | Selected refs remain fixed. Full bodies are used. Suggestions start unselected and do not replace prior choices. Explicit capacity errors require manual batching. |
| Redacted words reappear after additions, edits or preview rebuild | Global literal redactions apply to resolved items, notes and suggestions; output is the exact server-confirmed preview. Real clipboard sink and downloaded Markdown match byte-for-byte. |
| Copy after stale/blocked/expired state, including a worker restart | Domain share rejects; displayed export text and fallback are invalidated. Browser tests inspect worker state and output controls, not just labels. |

Manual selection deliberately permits otherwise default-ungranted local items. It never permits explicit deny/never/inherited restrictions. Existing automatic retrieval continues using Memory's approved candidate scope and the shared lexical ranking function.

## DELTA-05 network and legacy Grant matrix

- Local-only is a strict boolean in existing Memory configuration. It blocks actual provider dispatch and Passport authorization, and enabling it stops the existing bounded organizer's future processing. Disabling it never replays a task.
- The old externalAccess=false remains a connection denial. It does not disable explicitly selected local manual copy/file output. Existing externalAccess=true does not mint a consumer, Grant or additional permission.
- The legacy Memory/Passport path retains purpose, consumer, Profile, expiry, revocation, once-use atomic consumption and preview-generation checks. Local manual output cannot downgrade a bound package.
- Real worker verification concurrently shares an once Grant twice: exactly one succeeds and useCount is one. A separately revoked Grant rejects. A configured synthetic credential plus actual organizer update under Local-only produces zero extension/provider requests.
- No manifest, host permission, provider endpoint, dependency or physical schema expansion.

## Compatibility and data lifetime

MIG-07 stores no new durable Context text. Sessions are limited to 20 per worker, 200 refs / 4 million material characters, 15 minutes; edits/notes/redactions have explicit bounds. Worker restart deliberately expires selections. Invalidated bodies are not returned in error DTOs; restriction descriptions are body-free.

MIG-08 fills only a missing localOnly=false value; it preserves the previous externalAccess and every Profile/Grant/exclusion. MIG-10 round-trips the strict portable policy through existing Backup validation while excluding transient selection IDs, bodies, queries, generations, edited previews and credentials. Source purge, tombstones and restore tests remain in the full suite.

## Evidence and limits

Domain evidence: ux-r4-selection-preview, ux-r4-context-authorization and ux-r4-search-history tests. Trust evidence: retained Passport/Memory/Backup suites plus background-security and privacy-product. Real browser evidence: ux-r4-search-reuse-chrome-e2e, including exact rule removal, Source purge, once-use/revoke, output redaction, TTL/restart and Local-only provider denial. Exact command counts, final digests and G-01–08 are recorded in UX_R4_REPORT.md.

All test content, credentials and browser profiles are synthetic and isolated. No live AI request or real-user authorization is claimed. The clipboard test captures the actual writeText argument with an isolated sink; Markdown verification downloads the real generated file. A human can manually copy visible text outside PAIA's controlled output path; the application does not claim operating-system clipboard or browser-level DRM.
