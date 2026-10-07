# Browser-Native Sync — sources, exact artifacts and evidence limits

Checked: **2026-10-07**. BNS-1.0. This is the primary-source/reference manifest for [ADOPTION](BROWSER_NATIVE_SYNC_ADOPTION.md), [CONTRACT](BROWSER_NATIVE_SYNC_CONTRACT.md), [UX](BROWSER_NATIVE_SYNC_UX.md) and [PLAN](BROWSER_NATIVE_SYNC_PLAN.md).

Official documentation establishes a supported design path or a stated limit, not actual PAIA client qualification. No cloud console, live authorization, private dataset, new container, paid account or installed extension was changed. Never convert an example or archived limit into a current test result.

## 1. Repository and private product sources

Initial and final pre-integration remote main: `948ea06a57cd932c187407faf7140d9fb6714eff`; tree `78dbc060a3406ce301d1ca9b5f2d183d801ac619`. This merge introduces CTX4-01; runtime metadata is 0.14.0. Re-read actual main when implementing rather than relying on older PLANNED/0.12.1 status sentences. This documentation does not certify unrelated main workflows.

Read sources included extension AGENTS, PRODUCT, ARCHITECTURE, SYNC_CONTRACT, REMOTE_OBJECT_PROTOCOL, ACCOUNT_DEVICE_SERVICE, TRUSTED_DEVICE_PROTOCOL, SECURE_KEY_PERSISTENCE; consumer AUTHORITY, PRODUCT_INTENT, TECHNICAL_PLAN, MASTER_PLAN, STATUS, UX; Settings Consumer v2 adoption/plan/exact references; PT-1 architecture/final Thought visual authority; Context Cards v2 adoption/plan and actual Context owner; Prompt Reuse canonical contract and actual family/preference/service owners; actual storage/backup/manifest interfaces. Remote reads take precedence over historical design packages.

The downloaded candidate release archive was used as a read-only local reference, not assumed to be a main certification. Artifact ID `11477105382`, associated workflow `37609207581`, SHA-256 `1be8fc330773023b60bf4c74543f512d6cbc7f27b8b576b6fda0c722d91ad09a`. Inspected files were checked against exact remote identities where used for critical claims. Examples: AGENTS blob `1dcbbdea32c8e3694c824322288995b111891b56`; SYNC_CONTRACT `80610e4970e67e2c6aba7701737e9a8d128ee2b5`; context-cards.js `5af0fae7a1ee20d525586cb6ac057f0712b9be32`; sync-contract.js `e444f3cbef14e904cfe0831c9b2583283ee07d10`. Candidate or previous full-suite evidence is not BNS implementation evidence.

Latest accessible Google Drive product source: **PAIA设计想法.docx**, modified `2026-09-29T16:52:57.461Z`, 1,135,544 bytes, SHA-256 `0bad2846f9169fa55ce8a1a18c30280cdc55e4f9371492c85eaf3fcd11b1f109`. Its internal title identifies the revised product design manuscript. Relevant source themes are long-term ownership, local/cloud transparency, separate Import/Sync/AI Refresh, exact deletion, user-side data center and complementary desktop/mobile capture. The later explicit Browser-Native Sync task supplies the fixed no-PAIA-account/provider decisions. Deprecated historical pay-per-sync proposals in the source are not adopted.

No private Drive text, account metadata, original owner prompt, real archive examples or source-file sharing permissions are copied into this public repository. Access to a private reference in one task does not grant public redistribution of its bytes.

## 2. Google official verification

### G1 — App-specific storage and scope

[Store application-specific data](https://developers.google.com/workspace/drive/api/guides/appdata).

`drive.appdata` is the non-sensitive app-data scope. appDataFolder is hidden application storage, distinct from general Drive files; sharing, moving between spaces and trash behavior are restricted. Use its designated parent/space and bounded listing. Users can remove app data; uninstalling an app through Drive is distinct from the PAIA product's tested extension-uninstall path. Do not promise recovery after the user deletes the cloud source.

### G2 — Chrome extension identity

[chrome.identity](https://developer.chrome.com/docs/extensions/reference/api/identity).

Chrome provides a token broker, interactive flows, redirect handling and account-change signals. Profile information has its own permission and is not cloud consent; getAccounts is not a stable-channel dependency. Cache clearing and provider-wide revocation are different. Exact extension identity, scopes, token-bound subject and cross-account late-response behavior require live qualification.

### G3 — Current Drive usage limits and cost

[Usage limits](https://developers.google.com/workspace/drive/api/guides/limits), page updated 2026-09-11.

The published model changed May 1, 2026. New projects have 1,000,000 quota units/minute/project and 325,000/minute/user/project; the stated daily project egress quantity is 1 TB and daily billing threshold 400,000,000 quota units. Previously active qualifying projects can retain earlier quotas. Listed examples: metadata read 5 units, list 100, download 200, edit 50. Standard usage has no additional cost; over-quota charging is planned later in 2026 with advance notice, and full rates are not supplied by this page. Therefore neither unlimited-free operation nor a specific future PAIA invoice can be asserted. Actual project console quotas/billing were not inspected. Backoff is required for rate limiting.

### G4 — Verified account subject

[OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) and [OIDC reference](https://developers.google.com/identity/openid-connect/reference).

Use the stable verified subject, not email equality. Validate the applicable issuer/audience/signature/expiry/nonce or supported authenticated token-bound user-info path. Exact minimal OIDC scopes must accompany, not broaden, storage permission. No PAIA identity database is required merely to bind a verified provider subject locally.

### G5 — OAuth lifecycle and revocation

[OAuth for native apps](https://developers.google.com/identity/protocols/oauth2/native-app) and [OAuth 2.0 overview](https://developers.google.com/identity/protocols/oauth2).

A browser extension is a public client; no secret is embedded. Provider consent can be revoked or require reauthorization; development/testing token behavior is not production continuity evidence. Revocation may affect grants/tokens for other clients in the project and does not mean local cache clearing is equivalent. Qualify the exact release configuration before advertising a this-device-only disconnect.

### G6 — Distribution registration

[Register as a Chrome Web Store developer](https://developer.chrome.com/docs/webstore/register/).

The official page requires a one-time registration fee. The exact charge was not established from the retrieved page; do not quote an unverified remembered dollar amount. No registration/payment was made.

## 3. Microsoft official verification

### M1 — App Folder containment, availability and privacy

[Using app folder in OneDrive and SharePoint](https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder).

The guide documents `Files.ReadWrite.AppFolder`, `/me/drive/special/approot`, folder creation on first request and home/work/school scenarios. PAIA v1 chooses delegated access, not app-only credentials. Storage counts against the user's appropriate OneDrive quota. The owner can modify/remove files; apps with separate whole-drive access can also access App Folder. It is not a hidden zero-knowledge vault. Do not use the guide's optional broader scopes or sharing possibilities to expand PAIA's scope.

### M2 — Permission reference qualification

[Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference#filesreadwriteappfolder).

At this check, delegated Files.ReadWrite.AppFolder is labeled **preview**; the reference describes personal-account consent and no default admin-consent requirement for that delegated permission. Read this together with M1, not as a blanket certification of every tenant/client. A target registration/tenant that cannot perform the required contained operations with that scope is a blocker. Broad scopes are not a fallback.

### M3 — Edge identity API differences

[Supported APIs for Microsoft Edge extensions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support).

Edge does not provide Chrome's getAuthToken/getAccounts behavior. Use the supported web-auth route and qualified account information. Browser profile metadata cannot silently replace the account actually selected in the cloud flow.

### M4 — Public-client flow and token lifetime

[Authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) and [Refresh tokens](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens).

Use PKCE and exact redirect/client-type registration, with no extension client secret. SPA token lifetimes differ from other client types (the reference lists 24 hours versus a usual 90-day non-SPA default), and refresh tokens can be invalidated earlier. Extension CORS/redirect details and browser SSO restrictions require real tests. Session-only token caching may require vendor reauthorization after session loss; it must not be advertised as persistent silent authentication.

### M5 — Throttling and cost boundary

[Graph throttling](https://learn.microsoft.com/en-us/graph/throttling), [service-specific limits](https://learn.microsoft.com/en-us/graph/throttling-limits), [metered API list](https://learn.microsoft.com/en-us/graph/metered-api-list).

Respect 429/Retry-After and partial failures. No single universal OneDrive AppFolder requests-per-second guarantee was established; limits from unrelated Graph services are not imported. Ordinary AppFolder file CRUD is not the metered operation listed for OneDrive/SharePoint in the current metered catalog; this is not a claim that all Graph services or future usage are free. User licenses/storage and actual project restrictions remain separate.

### M6 — Edge developer registration

[Create a developer account](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account).

The current official page states there is no registration fee to submit Edge extensions. No developer registration or publication was performed.

## 4. Apple official verification

### A1 — CloudKit storage boundary

[CloudKit overview](https://developer.apple.com/icloud/cloudkit/) and [privateCloudDatabase](https://developer.apple.com/documentation/cloudkit/ckcontainer/privateclouddatabase).

CloudKit provides app containers and user-private storage. Its public-data capacity marketing is not a per-user private quota. The detailed privateCloudDatabase page was a JavaScript shell in this retrieval; no unsupported native behavior was inferred from that shell. A2/A3 provide separate official quota and transport evidence. Optional encrypted fields do not by themselves establish PAIA zero knowledge or a cross-platform recoverable E2EE key model.

### A2 — Private quota and user cost

[CKError quotaExceeded](https://developer.apple.com/documentation/cloudkit/ckerror/code/quotaexceeded), [CloudKit JS quota error](https://developer.apple.com/documentation/cloudkitjs/cloudkit.ckerror/quota_exceeded), and archived [Migrating to CloudKit](https://developer.apple.com/library/archive/technotes/tn2241/_index.html).

The current error documentation distinguishes public container storage from the private user's iCloud storage quota. Private PAIA data therefore consumes that user's available iCloud storage. The archived migration note corroborates the distinction; its old public capacity figures are not current price/limit authority. No user storage subscription price or universal per-user CloudKit request allowance was established.

### A3 — Safari/native messaging

[Messaging between the app and JavaScript in a Safari web extension](https://developer.apple.com/documentation/safariservices/messaging-between-the-app-and-javascript-in-a-safari-web-extension).

The native app/extension bridge is a real platform path, but its lifecycle and messaging direction differ across Apple platforms. This is not Chrome-style OAuth directly inside arbitrary page JavaScript. Container/entitlement, profile partition, native caller validation, binding changes and bounded suspended-task recovery need actual implementation evidence. Do not assume an always-running iOS containing app can push into every extension context.

### A4 — Archived payload/request metrics

[CloudKit Web Services property metrics](https://developer.apple.com/library/archive/documentation/DataManagement/Conceptual/CloudKitWebServicesReference/PropertyMetrics.html), archived document last updated 2016-06-13.

This Web Services reference lists 200 operations/request, 200 returned records, 1 MB record size excluding assets and 50 MB asset size. These are **archived Web Services numbers**, not certified current native CKAsset limits. BNS uses small metadata plus bounded opaque assets and must verify actual native limits before SYNC-05 closes. Parser/segment sizes are chosen from measured memory and request tradeoffs, not those historical maxima.

### A5 — Developer cost

[Apple Developer Program: included features](https://developer.apple.com/programs/whats-included/).

The public membership price is USD 99 per year or local currency where available, subject to applicable enrollment terms/waivers. Membership includes relevant development/distribution services. It is not a per-user PAIA archive storage subscription. No paid enrollment, certificate, provisioning profile or container was created here.

### A6 — Safari distribution and current packaging options

[Distributing your Safari web extension](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension), [Safari extensions](https://developer.apple.com/safari/extensions/), [Web extension packaging through App Store Connect](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect).

Safari extensions are distributed with an app and signing requirements. Apple documents App Store routes and Developer ID signing/notarization outside the Mac App Store for macOS. Current web packaging exists; it does not demonstrate that an unmodified generic package supplies BNS's custom native CloudKit bridge/entitlements. Native integration and intended physical-device distribution must still be qualified. No release was performed.

### A7 — Account identity qualification

Use the native CloudKit account-status/current-user and account-change APIs in the actual supported SDK. The public private-database reference and messaging documentation establish the architectural direction, not an executed identity flow. Exact container-scoped identity acquisition, CK account notifications, private-zone enumeration and token/reset behavior remain explicit SYNC-05 qualification items. A website Sign in with Apple identity is not substituted for system iCloud access.

## 5. Platform comparison and unresolved prerequisites

| Provider | Documented feasible path | Not yet established in PAIA |
|---|---|---|
| Google | Chrome token broker + Drive app-data scope | Production app identity/consent, exact subject binding, contained API paths and retry semantics, actual quotas/billing, full old-device-free restore and extension-uninstall retention |
| Microsoft | Edge public-client web auth + delegated AppFolder | Target registration/redirect/CORS, delegated-preview/account-type qualification, session/refresh UX, contained discovery/performance and full restore |
| Apple | Safari native bridge + private CloudKit storage | Custom entitlements/container/production environment, signing/device execution, current native limits, lifecycle/profile isolation and full restore |

These are real untested release dependencies, not proof that all three platforms are impossible or already supported. A failed prerequisite blocks its adapter/account type only. It never authorizes reading the whole drive, switching to PAIA Cloud or labeling a simulation as live evidence.

## 6. Exact private Settings source

Retrieved Library package `PAIA-Settings-Design-v2.zip`, 2,742,577 bytes, SHA-256 `c9d53e2ba34cc29a46124c7cada6de77ac9c2ee24704069beedfb44189b22f7c`, matching SETTINGS_CONSUMER_V2_REFERENCES.md. Its Data & recovery screenshot and standalone prototype were opened. The new Sync design reuses its actual shared composition/styles rather than an earlier token sheet with conflicting colors. Existing Settings owner decisions remain unchanged outside the one-row/copy amendment.

## 7. Exact BNS private handoff

Package: **PAIA-Browser-Native-Sync.zip**, 1,738,615 bytes, SHA-256 **a2bd7f44b35a12537246bc6ff03987fccd88104780f3123dc667cb99b49ee254**.

Paths are relative to `PAIA-Browser-Native-Sync/`:

| File | Role | SHA-256 |
|---|---|---|
| Review.html | Self-contained 27-scenario review viewer | 6afb8e127292c32d7481c2f50c2f499f5c18addb676ed81867a4e7cc9549f71b |
| Prototype.html | Independent product-only interactive target | 9e87698c4a59bb1e8d6d9ec1af37353e76aace97e47c06105afbb824befcdf35 |
| states.json | Scenario IDs, provider and descriptions | 76999c6a9953fbd0e15a62b539bc70dd4e0289bd9b6395f091cd14f91c7990d0 |
| screens.json | 34 screenshot/view/theme/text mappings | 1fbcafa7fc4f885da78a56839a9e08f6043eb6a97503557ac32881d13ae14531 |
| prototype-checks.json | Full prototype matrix, interactions and correction history | 55b86b87cf1e1c907e381ff031af936ddceb40376187dd4d6ec25a2419d22f1d |
| checksums.json | Complete package file hashes, excluding itself | 9cb5e5de82eec6d3ab184f2d1982870b1773b0a8bf6a6e979b992693b2ec1490 |
| README.md | Private handoff and evidence boundary | 2ae7231d12102630112b66f0afd7c797e79a06067a9a59579ba37bf37155e006 |

Boards 01-27 correspond to the states in states.json: Settings row; three first-enable providers; provider-confirmation boundary; syncing; synced/detail; offline; changed account; explicit new-account copy; restore; restore complete; human prompt conflict; quota; outage; reauthorization; paused; disconnect; disconnected; cloud deletion confirmation; deletion complete target; local-only deletion; missing cloud; corruption; iCloud unavailable; unproven separate datasets; canceled authorization. Boards 28-34 add narrow detail/conflict, dark detail/restore, 320px 200% account-change, narrow Settings and dark narrow cloud deletion. Exact paths and all per-image hashes are in the package manifests, not a guessed screenshot list.

All bodies, identities, progress, successes and connections in these boards are synthetic. Provider-owned consent is not reproduced as a fake branded login. Production should use existing actual PAIA component/icon owners rather than treat preview-only navigation symbols as a redesign of unrelated spaces. No font binaries are bundled. The private prototype/artboard bytes and original source instructions are not placed in this public repository; obtain the exact package via the authorized owner handoff. A sandbox URL is not a durable repository URL. Missing reference bytes block affected visual matching, not independent Core correctness work.

## 8. Executed checks and negative history

Independent prototype browser: **Chromium 144.0.7559.96**, container executable `/usr/bin/chromium`. The completed matrix passed **540/540 horizontal-reflow configurations** (27 states x 5 widths [320/390/768/1024/1440] x light/dark x 100%/200% text), **8/8 scripted demonstration interactions**, and viewer state/theme/text/viewport switching, with zero page exceptions on that completed run. Representative desktop, narrow, dark and 200% boards were visually reviewed. This is not a blanket assertion of pixel perfection or overlap/accessibility correctness.

Preserved history: the initial harness could not find its bundled Chromium executable; another harness attempt reused script-global state and timed out before a complete report; resetting each case to about:blank corrected that test setup. Visual inspection found the reused shell's JS-populated primary navigation was initially empty; the three primary spaces and Settings were restored and the full matrix rerun. The first viewer check read a replaced iframe context too early; the successful check waits for actual frame state. These are retained limitations/corrections, not an invented uninterrupted PASS.

No production npm test/build/certification was run by this documentation task; no installed personal database, real restore/migration, provider credentials or paid processing was used. The preview has no network/durable-store integration. It cannot establish physical IME, screen-reader behavior, real provider least privilege, crash durability, malicious account protection, native Safari bridge behavior, migration coverage, quota efficiency or user value. PLAN requires the appropriate independent evidence for each claim.
