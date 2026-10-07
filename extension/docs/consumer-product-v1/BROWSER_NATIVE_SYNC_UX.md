# Browser-Native Sync — user journeys and scoped Settings amendment

BNS-1.0 · 2026-10-07. Normative interaction: [CONTRACT](BROWSER_NATIVE_SYNC_CONTRACT.md). Exact private visuals: [REFERENCES](BROWSER_NATIVE_SYNC_REFERENCES.md). These designs are synthetic target states, not provider login implementations or production acceptance.

## 1. Placement and ownership

Keep Settings Consumer v2's six groups and existing AppShell/navigation, title/UI/prose/metadata roles, palette, focus language and responsive model. Add **同步** first in **数据与恢复**. Its ordinary secondary line is `使用你的 Google Drive / OneDrive / iCloud`; connected state is `Google Drive · 已同步` with a meaningful last-success time. The whole row opens Sync Detail. The row never suggests that ordinary browser profile login has already authorized cloud storage.

The final available target contains 21 primary Settings rows, six in Data & recovery; the existing secondary Prompt position reset remains separate. The other five Data destinations remain history import, local storage, existing PAIA backup restore, removed content and original source records. Do not revive backup generation, export, generic data purge, account management or a provider-selection console.

Settings owns row composition/navigation. Sync owns status, authenticated binding and all Sync actions. Existing domain owners own content/revisions/deletion; Context owns AI access/connection permissions; Prompt owns reusable preferences and local geometry. Settings must not copy another service's state into an independent switch store.

Before a provider is genuinely available, no fake enable button is displayed as a working product control. An honest unavailable state is permitted where it helps an installed user's task. Connected examples in the design package are not available features. Replace all-local/no-egress copy only where it becomes false after explicit Sync; local-only users still receive truthful local-only language.

## 2. Normal journeys

### Local user enables for the first time

Open Sync, read `同步你的 PAIA / 使用你的 [cloud]`, activate **开启同步**. The provider handles its necessary account selection, consent or MFA. On return PAIA verifies the subject, preflights local/remote state, creates a new cloud dataset only if genuinely appropriate, uploads bounded canonical content and reports **已同步** only after the complete publication cut is confirmed. No separate registration, upload/download decision, scope checklist, backup step or recovery secret.

### New user, no data anywhere

The same activation establishes an empty dataset. Ordinary use begins immediately; no invented Topic library, example personal information or onboarding data selection. Local capture consent remains independent.

### New installation, cloud data exists

Install -> 开启同步 -> same provider confirmation -> **正在恢复你的 PAIA…**. Read/validate/apply automatically, protect any existing local work, activate a complete generation, rebuild local search/cache. The complete state says **你的 PAIA 已恢复** with one **进入 PAIA** action. It does not ask for a file, old computer or recovery phrase.

Show actual stages, not synthetic percentages: reading/validating canonical data, applying saved versions/organization, rebuilding local search. A percentage is allowed only with a reliable denominator; demo percentages in the private prototype are labeled examples. Canonical recovery and index readiness are separate, and missing content cannot be described as a cache wait.

Context Items and saved desired access ranges return. A quiet note explains that external AI connections require confirmation on this device; this is not an additional condition for recovering/viewing PAIA data and must not automatically reopen global access.

### Routine sync and offline use

Automatic work is quiet. Local save remains the primary durability acknowledgement. Do not show a toast per segment or per keystroke. Sync Detail exposes current provider, last meaningful success, this device and an optional **立即同步** secondary action. Existing local reading/editing remains usable during network loss. Say **等待网络；新修改暂时只保存在此设备** and resume automatically when possible. Do not promise background work while the browser/native host cannot run.

## 3. Account safety and exceptional bootstrap

A subject change stops current scheduling and invalidates late responses. Show **[Google / Microsoft / Apple] 账号已更改** and **PAIA 不会自动把此设备的数据同步到新的账号。** Offer reconnect original, remain local, or use new account. Use verified display identity only when available; private account metadata is not telemetry or public artifact data.

Choosing new account is a distinct confirmation: **这会把此设备现有的 PAIA 内容复制到新账号。原账号的副本保留，两个来源不会自动同步。** Check the destination before upload. Do not label this action a harmless sign-in switch. No old queue is automatically retargeted.

For unbound local data and an existing cloud dataset, Core should prove an exact duplicate or safe independent union where possible; do not demand review merely because two local IDs differ. If it cannot safely establish identity/intent/ownership compatibility, preserve both, explain **发现另一份 PAIA** and ask only the necessary decision. The prototype's unrelated-data scene intentionally represents this unproven case, not a universal first-enable branch.

Previously bound cloud contents becoming missing is **云端副本已不可用**, not blank-cloud onboarding. Reconfirm the original account or remain local. Re-upload/recreate requires an explicit separate informed action. Do not repeatedly ask ordinary users to inspect a revision graph.

## 4. Sync Detail and low-frequency actions

Normal hierarchy: heading 同步; provider and actual status; optional useful account display; 此设备; automatic-sync fact; secondary immediate Sync. Do not fabricate hardware names, storage percentages, all-device lists or active device revocation controls without real backing evidence. A generic `此电脑 · Chrome` is safer than guessed hardware metadata.

Low-frequency actions: **暂停同步**, **断开此设备**, and **删除云端内容**. Destructive wording stays low-emphasis until its explicit risk flow. No OAuth, CloudKit, segment count, revision hash, cursor, device sequence or merge parameters in normal UI.

- Pause immediately stops future transfers, retains both sides and allows safe local edits. Resume verifies account/fences before continuing.
- Disconnect retains local and remote content, stops this installation and clears its local authorization cache. Provider-wide consent revocation is a distinct clearly scoped action when supported. Explain when revocation affects other devices or requires the provider's own account page. Do not call token cache removal verified provider revocation.
- Local-only deletion belongs to a specific justified local-data action, not a new universal Settings purge button. Stop local writers/sync, identify unsent work, clearly state that the cloud remains. Never emit a cross-device tombstone for this operation.
- Cloud-content deletion clearly names the provider/account, explains loss of this cloud recovery source, retains local data by default, and requires one explicit risk acknowledgement plus the destructive action. Retain a disclosed body-free retirement marker; explain that already downloaded devices and provider retention are not remotely physically erased. Partial deletions remain incomplete, with safe retry.
- Uninstall is not a PAIA cloud-delete command. Only advertise tested retention for the actual release identity/provider. A lost account or manually cleared app data cannot be recreated from nothing by signing in.

## 5. Human conflict surface

Use **有一项修改需要确认** rather than a sync administration inbox. Keep both bodies and clear provenance labels **这台设备的版本 / 另一台设备的版本**. Preserve real paragraphs and the user's existing reading size/width; do not replace them with hash tables or squeezed diff jargon.

Actions are entity-specific: retain this version, retain the other, both where a second independent human object is legitimate, and manual merge where an existing editor safely supports it. The private example uses a reusable prompt, for which both can be separate templates. Do not offer "both" to counterfeit an immutable Source collision or violate one-Placement-per-Topic constraints. A structural conflict shows the actual human destinations/ordering, not a fake body comparison.

Only concurrent human conflicts or unproven ownership/ancestry require this surface. Already-proven descendants and independent changes apply automatically. Unrelated content continues syncing. A user may postpone; both versions remain durable. Revalidate when they choose, because another device may have added a newer revision. A corrupted segment is an integrity error, not a legitimate alternate version for the user to bless.

## 6. State and copy matrix

| State | What the user sees | Safe action and invariant |
|---|---|---|
| Not enabled | 同步你的 PAIA / 使用你的云 | Enable is the only PAIA activation; never create a PAIA account. |
| Provider confirmation | Actual provider-owned interface | PAIA does not collect provider passwords; prototype uses a labeled simulation boundary. |
| Authorizing cancelled | 未开启 | No content transfer; local unchanged. |
| First upload | 正在同步 | Local remains usable; do not report synced before verified publication. |
| Fully synchronized observed cut | 已同步 · [real last success] | Immediate sync secondary; unknown offline-device edits are not promised covered. |
| Offline | 等待网络 | New saved edits stay local; resume automatically when possible. |
| Needs reauthorization | 需要确认账号 | Reconnect original; new subject takes account-change branch. |
| Subject changed | 账号已更改 | No retargeting/upload to new account before informed confirmation. |
| New-device restore | 正在恢复你的 PAIA… | Stage progress, bounded resume, no old-device request. |
| Restore complete | 你的 PAIA 已恢复 | Enter PAIA; no automatic external AI grant. |
| Concurrent human work | 有一项修改需要确认 | Preserve siblings, show affected entity only. |
| Quota full | [cloud] 空间不足 | Preserve edits, manage provider storage, no automatic purchase/deletion. |
| Throttled / outage | 暂时无法同步 | Bounded Retry-After; no repeated login popups. |
| Corruption / incomplete canonical download | 暂时无法完成恢复 | Preserve old local generation; verify alternate recovery path. |
| Remote clear / retirement | 云端副本已不可用 | Pause; no auto-recreate. |
| iCloud/native unavailable | 先确认 iCloud 状态 | Describe actual missing system/app capability, not a fake Apple web login. |
| Paused | 已暂停 | Both copies retained; resume safely. |
| Disconnected | 已断开此设备 | Both copies retained; re-enable requires provider verification. |
| Cloud deletion partial | 删除尚未完成 | Retired writers stay stopped; retry remaining deletions idempotently. |
| Cloud deletion verified | 云端内容已删除 | No unsupported claim of physical purge of provider backups/devices. |

Unknown clock is not a false last-success date. Last-known status may be shown with its provenance; do not label it current. A successful local save never turns a failing cloud state green.

## 7. Visual, responsive and accessibility contract

Use the current Settings CV2 white/navy restrained shell and its corresponding dark tokens, shared serif headings and system Chinese font fallback. Reuse existing account-independent components and icon system in production; no new Sync brand, illustration, gradient, generic cloud dashboard or provider-colored card set. High-fidelity references use the same group rail and 680px content axis. Body comparisons use current shared reading preferences, not a new Sync font policy.

Wide screens retain the shared primary rail and Settings group navigation. Narrow screens use the existing stacked Settings directory/back model. At 320 CSS px and 200% text, wrap labels and actions rather than clipping risk text or placing desktop columns off-screen. Conflict versions stack on narrow/large-text displays. Controls must preserve appropriate 44px effective touch targets, visible focus, names and keyboard equivalents; no hover-only critical action. Reduced motion and live announcements are semantic, not constant spinner noise.

Use normal secondary pages for Sync Detail and restore; destructive confirmation may use the existing dialog/sheet owner in production if its focus/return behavior preserves this contract. A staged transition does not steal active IME or dirty editor focus. Keep unsent content recoverable on navigation; never perform deletion as a button-preview side effect.

## 8. Private design handoff and limits

`PAIA-Browser-Native-Sync.zip` includes self-contained Review.html, product-only Prototype.html, 27 scenarios, 34 screenshots, mapping, checksums and prototype test evidence. REFERENCES records exact bytes/hashes. Open the images, not merely this prose, when implementing the new Sync-owned composition. The existing Settings reference continues to govern unaffected groups.

The completed prototype run checks horizontal reflow at five widths x two themes x two text scales across 27 states: 540 cases; it does not certify every possible overlap, native platform appearance, screen-reader output or physical IME. Eight demo interactions and the viewer controls were checked. No live cloud, real authorization, persistent store, user corpus or production runtime was exercised. Missing provider/device evidence remains a release gate. A design freeze is not permission to claim implementation, erase earlier evidence failures, or treat simulation buttons as real cloud actions.
