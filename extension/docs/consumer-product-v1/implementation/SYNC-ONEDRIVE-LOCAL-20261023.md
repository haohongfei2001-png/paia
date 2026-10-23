# OneDrive AppFolder transport and bounded HTTP — local implementation

2026-10-23. Base a9fb362b39cad49ff271c7bcaa0c4c295def88fc. Implements an injected personal-account AppFolder provider for the existing Browser Native Sync immutable-object protocol. No real network, OAuth, account, token, production activation, browser, build or cloud run was used. Settings remains unavailable until a qualified host is supplied.

## Implemented boundary

The constructor binds subject, personal tenant, registered-client-shaped ID, generation, namespace and only Files.ReadWrite.AppFolder. These are host-supplied capability claims, not proof of a real OAuth identity. The provider pins the special AppFolder's item and drive IDs, rejects root/delta/sites/foreign-parent/remote/deleted objects, uses canonical dataset-bound object names, and verifies lengths, digests and metadata after download. Listing exposes only original validated grouped checkpoint manifests. Discovery does not make an arbitrary object a recovery authority.

Uploads create a conflict-fail upload session for one bounded immutable object. A durable original-Core meta reservation precedes dispatch. Lost session-creation responses retain an unknown outcome instead of blindly creating another session; a later complete object can be read back. Lost final PUT responses can recover through immutable readback. An unexpired attempt is retained across adapter restart; separate adapter instances share the reservation CAS. No overwrite, delete, rename, automatic retry, root scan or account fallback exists.

Graph requests alone receive an ephemeral bearer from an injected issuer. Upload and download asset requests are unsigned and never invoke that issuer. The closed personal-CDN profile accepts only qualified-shape HTTPS subdomains of up.1drv.com or files.1drv.com for their respective methods; actual regional/provider compatibility remains unverified and unknown hosts fail closed. Signed URLs are transient, not persisted or logged.

The HTTP capability snapshots requests before awaits, admits exact routes/methods/query/header/body forms, omits cookies/referrer, rejects redirects and constrains returned URL/status/type. Response chunks are metered before copying; interrupted and late streams are cancelled without waiting indefinitely for cancellation. Each adapter operation retains 30 seconds, 4096 requests and 2 MiB received, each content object at most its original 1 MiB reference bound. Native network buffering inside an injected fetch remains outside this proof.

An actual composed HTTP test exercises original adapter reservation, unsigned PUT/GET and immutable readback. A separate original grouped Source/Working checkpoint test closes the sender and restores a fresh B through LocalSyncRecoverySession. No alternate serializer, recovery owner or default HTTP activation was introduced. The package scanner admits only the exact literal sets in the two dedicated modules; changed scopes, endpoints, extra duplicates and unrelated modules remain rejected.

## Verification and retained failures

Node22.23.3 on macOS arm64; Python3.12.14 package scan. First transport run 22/23 exposed an incorrect call shape to the original grouped-manifest validator; corrected to its existing core option, followed by 24/24. Additional boundary run 33/34 exposed a wrong test expectation: after POST dispatch an oversized response leaves completion unknown. The oracle was corrected without weakening the outcome rule, followed by 34/34. HTTP first run 31/31. Final single owning batch: 66/66 (34 transport, 31 HTTP, one package test containing 20 negative variants), exit 0, 643.57275 ms, no fail/cancel/skip/todo. Package scan: 21472 checks, 616 resources. All earlier logs remain separately retained; these are not native/browser or live-provider results.

Negative cases cover lost POST/PUT, held requests, account/namespace change, concurrent reservation, stale metadata, foreign parents, malicious pagination, scope/tenant mismatch, status errors without retries, unsigned URL escapes, stream limits, token binding/expiry and request mutation. Source hashes are in source-vector.json; SHA256SUMS binds this report and the evidence logs.

## Remaining qualification

The official AppFolder guide describes the minimal AppFolder scope and special/approot path, including that the user may modify or delete the folder. The upload-session reference documents conflict-fail creation, unsigned upload URL PUT and completion/conflict results. Its listed permissions and the AppFolder guide do not establish this entire candidate sequence under the actual minimal scope. A future explicitly authorized host qualification must prove the registered personal client, issuer, exact methods/scope and actual CDN profile. No broader permission fallback is approved or implemented.

Primary sources read: [AppFolder guide](https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder), [createUploadSession reference](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0). This finite provider package does not complete platform/auth/Sync UI or the full product plan.
