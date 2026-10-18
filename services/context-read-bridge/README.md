# PAIA Context read bridge: first ChatGPT qualification target

This is executable, offline-tested source for the approved first ChatGPT target. It is **not installed or activated**. Extension `readContextConnectionConfiguration()` and `host-configuration.json` remain default-null. No tunnel, credential, account grant, paid provider, real Context transmission or public server has been created.

## Data path and authority

A Chrome-launched `com.paia.context_read` native host is one process with two interfaces: the private Chrome Native Messaging pipe, and a fixed-path `/mcp` HTTP listener bound only to `127.0.0.1`. There is no second-process untrusted local IPC and no direct IndexedDB/disk/profile reading. A packaging-time exact extension ID is required in both the native host configuration and generated native manifest `allowed_origins`.

The extension's source-owned ContextConnections owner alone creates a native port. Explicit pairing binds its actual private port/caller to the current local PAIA profile, database, restore epoch, connection generation and a one-hour connection expiry. It creates a random 256-bit per-connection bearer credential; only its SHA-256 digest persists. The raw credential appears once in the explicit local pairing UI, is hidden after 60 seconds, and can only be copied by the user's copy button. The host receives the digest through its trusted native pipe, never through HTTP parameters. Pause, revoke, permission removal and store restoration invalidate callers. Reconnect rotates the credential; restored libraries require a separate explicit repair pairing with a new profile and connection identity. Cold startup never silently reconnects.

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

## Remaining qualification and implementation limits

- Real native-host packaging/installation for an approved OS and exact extension identity; no manifest is registered by this source.
- Real ChatGPT account/workspace eligibility, forwarding behavior, tunnel sharing, OAuth/per-connection credential delivery and supported client behavior.
- Actual authenticated end-to-end Chrome native host + official tunnel + ChatGPT tools, disconnection/offline/resume/region behavior and real scope/quality acceptance.
- The current connection lease is one hour and requires explicit reconnect; cold worker startup also requires explicit reconnect. This does not yet meet CTX4-06 daily reuse after a single initial permission. Trusted renewal/resumption that preserves pause, revoke, restore and account boundaries remains an implementation gap, not merely an acceptance step.
- Native UI screenshots, accessibility and high-fidelity comparison require actual visible review; passing DOM/style checks is not visual acceptance.

Official protocol references: [MCP transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), [MCP discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover), [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging), [ChatGPT custom MCP](https://developers.openai.com/api/docs/guides/custom-mcp-server), [tunnel auth forwarding](https://github.com/openai/tunnel-client/blob/master/docs/architecture.md#auth-and-data-flow-matrix).
