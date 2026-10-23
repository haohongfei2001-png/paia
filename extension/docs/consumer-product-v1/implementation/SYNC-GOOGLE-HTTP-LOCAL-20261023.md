# Bounded Google HTTP host capability — local implementation

2026-10-23. Extends the separately committed appData adapter (`c01994cb`) with
an actual Request/ReadableStream consuming boundary. The host must explicitly
inject both `fetchImpl` and an ephemeral `authorize` issuer. Neither defaults to
real network/account access; Settings activation remains off. Tests use only
synthetic tokens and in-memory responses, never a real credential or endpoint.

The capability snapshots the validated request before any await. It constrains
origin, routes, queries, method, multipart envelope, headers and original byte
limit. Caller authorization headers cannot pass. Exact issuer binding covers
subject/client/generation and the single app-data scope; expired/malformed tokens
are rejected before fetch. This verifies the supplied capability's consistency,
not the authenticity of an OAuth server or an untrusted token claim. Production
must keep the capability private and provide a qualified identity owner.

Native Request settings omit cookies/referrer, disable redirects and caching,
and propagate the original adapter AbortSignal. Response URL/redirect/type and
advertised size are checked before reading. Every actual chunk is metered before
copying, bounded by the adapter's limit and4096 reads; zero-byte streaming cannot
create an unlimited chunk array. Abort/account change fences issuer/fetch/body
completion. Late fetch streams and interrupted/error responses are cancelled;
cancellation itself cannot hold the public operation open. The original adapter
owns its30-second whole-operation and2MiB cumulative received budget. This host
function is not independently scheduled and does not make a statement about
network buffers allocated inside an injected fetch implementation.

A composed test consumes this capability through the actual appData adapter,
transactional pre-generated ID reservation, create and exact readback. Other
cases exercise stream truncation/overflow/error, no Content-Length, empty error
bodies, late issuer/fetch, abort at response settlement, stalled stream and
request mutation while authorization waits. Original appData cold-B recovery
has its separate receipt; these results are not merged into a fictional single
large run or a live Drive acceptance.

Node22.23.3, macOS arm64. First19/20 failed on a fetch-settlement/abort window
where the response had not yet been assigned for cleanup. The implementation
now captures that response before the post-await fence; a distinct regression
case preserves the window. The stalled-body fixture also now uses zero stream
prefetch so its observation actually identifies reader entry. Intermediate
20/20 and24/24 are retained separately. Final26/26, exit0,185.86675ms,
no fail/cancel/skip/todo. Independent source review accepted the final snapshot,
chunk-count, token/egress and cancellation boundaries without repeating tests.

No browser, build, cloud, OAuth, installation, model or paid call occurred.
Real OAuth/identity issuance, registered release/client, exact Google methods
under actual minimal scope, quota/retention and provider-backed consumer UI
remain unqualified. This supersedes the earlier report's missing HTTP
copy/stream/redirect implementation, but not those external qualifications.
