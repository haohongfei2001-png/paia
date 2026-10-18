# PAIA Context read bridge: first ChatGPT qualification target

This is executable, offline-tested source for the approved first ChatGPT target. It is **not installed or activated**. Extension `readContextConnectionConfiguration()` and `host-configuration.json` remain default-null. No tunnel, credential, account grant, paid provider, real Context transmission or public server has been created.

## Data path and authority

A Chrome-launched `com.paia.context_read` native host is one process with two interfaces: the private Chrome Native Messaging pipe, and a fixed-path `/mcp` HTTP listener bound only to `127.0.0.1`. There is no second-process untrusted local IPC and no direct IndexedDB/disk/profile reading. A packaging-time exact extension ID is required in both the native host configuration and generated native manifest `allowed_origins`.

The extension's source-owned ContextConnections owner alone creates a native port. Explicit pairing binds its actual private port/caller to the current local PAIA profile, database, restore epoch, connection generation and a finite runtime lease. Explicit source-qualified version-2 authorization separates that lease from the independently disclosed authorization lifetime; no production lifetime is selected by default. It creates a random 256-bit per-connection bearer credential; only its SHA-256 digest persists. The raw credential appears once in the explicit local pairing UI, is hidden after 60 seconds, and can only be copied by the user's copy button. The host receives the digest through its trusted native pipe, never through HTTP parameters. Pause, revoke, permission removal and store restoration invalidate callers. Reconnect rotates the credential; restored libraries require a separate explicit repair pairing with a new profile and connection identity. Legacy one-hour records never upgrade. A version-2 authorization can renew under its actual current native port and can resume after a confirmed clean checkpoint. A live replacement first blocks the old caller and requires the exact old host's versioned listener-close acknowledgement before starting another process. A native pipe disconnect alone is never treated as that acknowledgement. The original IDB meta owner atomically consumes each checkpoint into a dirty write-ahead witness before any new native port; Chrome metadata alone cannot grant restoration. Paused, revoked, changed-source, restored, missing-witness, pending or dirty states cannot auto-resume.

The bearer authenticates possession of **this local paired PAIA connection**, not a verified ChatGPT account. No JSON `accountId`, MCP clientInfo, session ID, trace header, tunnel ID or runtime API key is accepted as a user identity. If the eventual tunnel client statically injects this bearer, every party with access to that dedicated tunnel inherits this connection's PAIA read scope; qualification must verify organization/workspace, Use role, app sharing and credential forwarding before activation. Multiple-user isolation would require a separately implemented authenticated boundary.

After authentication, only four bounded read tools exist:
- `read_context`: original Info/Rules/Now shallow reader
- `list_topics`: original permitted Topic-name directory
- `search_topic`: one permitted Topic's original bounded search
- `read_topic`: original complete-bound Input/notes paging

All execute through ContextReadService, original Global/Card/Topic permissions, automatic Item lineage, Now currentness and original source/restore fences. Partial/unavailable/continuation metadata is preserved. Original-store publication revalidation and the native port send occur under the same readonly transaction lock. No model-generated grant, implicit whole-Topic export, write tool, Sync tunnel or new navigation destination exists.

## Transport contract

The HTTP adapter supports the legacy `2025-11-25` initialization flow and the current `2026-07-28` stateless discovery/header contract. It rejects query strings, any Origin, a Host other than the exact bound loopback address/port, missing/duplicate/invalid bearer headers, duplicate headers, unsupported methods/versions, unrecognized fields and oversized requests before reading user Context. SHA-256 credentials are compared in constant time. CORS is not authentication. Limits are four pending requests, 120 admitted calls/minute, 16 KiB request bodies, 768 KiB HTTP results and a 15-second timeout. Chrome native frames are bounded to 1 MiB, with strict UTF-8 and fragmentation/coalescing handling. Cancellation and late responses are generation-bound; stderr contains only fixed body-free startup failures.

The intended upstream is the official Secure MCP Tunnel's loopback HTTP forwarding. It needs a separately qualified Platform organization/workspace relationship, tunnel ID, restricted runtime credentials, the local bridge/tunnel-client process and actual ChatGPT app/account eligibility. This source does not create or start any of them. Read content returned to ChatGPT **leaves the device and passes through OpenAI**. No claim of zero retention, free service or local-only model processing is made.

This boundary protects against unpaired HTTP callers, other web origins and unapproved extension identities. It does not claim protection against a malicious process already controlling the same operating-system user, reading that user's browser memory or replacing installed host files.

## Offline development checks

From the repository root:

```
node --test services/context-read-bridge/bridge-boundary.test.mjs services/context-read-bridge/bridge-process.test.mjs
node --test extension/tests/context-connections.test.mjs extension/tests/context-read-publication.test.mjs
```

The process tests launch the real Node host and real loopback HTTP with a **synthetic** Chrome parent pipe and fake IndexedDB original owners. They do not install a Chrome native host or prove a real ChatGPT/Tunnel connection. Browser Source/release tests separately exercise the real extension page, default-deny worker and layout; explicitly synthetic qualified component states are presentation evidence only. Screenshots remain job-local unless separately authorized for delivery and visible inspection.

## Offline host package

`package.mjs` builds an exact-extension-ID POSIX host package for a separately approved macOS/Linux target: fixed source modules, absolute Node/entry launcher paths, native manifest and SHA-256 inventory. It writes only a new staging directory, never registers the manifest, changes executable permissions, installs dependencies, configures a tunnel or activates access. `verifyContextHostPackage` compares the complete source/manifest inventory and rejects foreign, extra or symlinked files. The exact extension ID, approved Node executable, installation path and source qualification still require real target validation. Windows packaging is not implemented or silently substituted.

## Remaining qualification and implementation limits

- The source package builder is implemented for macOS/Linux; actual installation/registration and supported-target qualification are pending. No manifest is registered by this source.
- Real ChatGPT account/workspace eligibility, forwarding behavior, tunnel sharing, OAuth/per-connection credential delivery and supported client behavior.
- Actual authenticated end-to-end Chrome native host + official tunnel + ChatGPT tools, disconnection/offline/resume/region behavior and real scope/quality acceptance.
- Runtime renewal and clean-checkpoint restoration are implemented for a newly explicit version-2 finite authorization. Chrome does not guarantee asynchronous `onSuspend` completion; an interrupted/unknown stop requires explicit reauthorization. Actual daily reuse under real browser/OS shutdown remains to be qualified, and no claim of seamless restoration after every close is made.
- Restrictions close current reads immediately and succeed only after durable acknowledgement. If every durable write fails before a cold owner can claim a prior clean authorization, that owner blocks further automatic restoration, and the UI reports unconfirmed failure. A completely new process cannot infer an intent that no storage recorded; it may still see the previous clean authorization. This physical failure boundary is not permanent-revocation success.
- A missing/foreign/old listener-close ACK, timeout or old host without the versioned capability stops replacement. A cold process or an already disconnected old host can still temporarily hold the requested port: it safely fails rather than retrying unbounded port/process creation. This is an explicit daily-reuse availability limit, not a grant bypass.
- The bounded IDB runtime witness contains only registry metadata and credential hashes, is excluded from original backup export, and is invalid after restore. It is not a new account, credential store, Sync path or four-card permission.
- Native UI screenshots, accessibility and high-fidelity comparison require actual visible review; passing DOM/style checks is not visual acceptance.

Official protocol references: [MCP transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), [MCP discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover), [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging), [ChatGPT custom MCP](https://developers.openai.com/api/docs/guides/custom-mcp-server), [tunnel auth forwarding](https://github.com/openai/tunnel-client/blob/master/docs/architecture.md#auth-and-data-flow-matrix).
