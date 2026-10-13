# Settings Consumer v2 — approved unified Settings and auxiliary UI

**SET2-UI-1.1 / OWNER_APPROVED / 2026-10-13.** This is the current presentation amendment to SETTINGS-CV2-1.0, retaining BNS-1.0 and AIOS/AIU semantics. Adoption state: **DESIGN_APPROVED / PLAN_UPDATED / DOCUMENTATION_ONLY**. This task does not implement or certify the production UI.

The owner approved `PAIA_设置与辅助页面_交互原型.html` and the accompanying unified design package and requested direct GitHub development-plan integration. The package contains 33 new screenshots and exact copies of the three previously approved primary-page prototypes. The original notes' DESIGN_CANDIDATE / NOT_WRITTEN_TO_GITHUB labels describe the earlier design task, not the later approval; original bytes are not rewritten.

The existing [PLAN](SETTINGS_CONSUMER_V2_PLAN.md) is revised in place, retaining **SET2-01–05**. [REFERENCES](SETTINGS_CONSUMER_V2_REFERENCES.md) identifies the original artifacts, visual anchors and state coverage. Auxiliary screens remain assigned to their existing domain owners, not a second Settings backend or a new product lane. STATUS alone selects execution; current independent writers, all seven Canonical plans and previously qualified foundations remain.

## 1. Approved final composition

Adopt the restrained blue-white canvas, shared title hierarchy, thin boundaries, line icons, quiet selection, controls and layers from the approved new three-page family. **Settings is a light six-group directory beside flat settings rows, not a card wall, dashboard or permission console.** Cards/paper surfaces are limited to useful self-contained content such as a reading sample, file preflight, Sync state or first-use example.

Ordinary desktop Settings entry selects Input Archive; explicit history/return restores its actual prior group, subsection, scroll and focus. Below the approved compact breakpoint, directory and group are successive views: a group has Back to Settings and its own heading, without repeating the large Settings header. Existing guarded route/history owners implement this; the prototype's simplified navigation is not a replacement router.

Reading & appearance includes a clearly synthetic local reading sample which visibly responds to acknowledged size, width and time preferences. It never reads personal content or writes sample text into Archive/Thought/Context. Production uses one shared preference owner and saved user choices across the actual three spaces; the demonstration's independent iframe preferences are not intended product behavior.

Short confirmations and simple choices use the restrained modal treatment. Source/supported-site inspection uses a temporary drawer. Long documents, Data journeys, Sync and substantive conflict handling use normal secondary content pages; do not squeeze every flow into a small dialog or permanently add a fourth source column. Preserve contextual origin and safe focus on return.

## 2. Full retained inventory and semantics

| Group | Primary actionable rows | Count |
|---|---|---:|
| 输入档案 | 保存我的 AI 输入；智能过滤 | 2 |
| 阅读与外观 | 外观；语言；正文字号；阅读宽度；时间显示 | 5 |
| AI 与提示词 | AI 上下文；下一句建议；AI 整理方式 | 3 |
| 隐私与访问 | 隐藏内容预览；支持的网站 | 2 |
| 数据与恢复 | 同步；导入历史输入；存储空间；从已有 PAIA 备份恢复；已移除的内容；原始来源记录 | 6 |
| 关于 PAIA | 隐私说明；使用条款；帮助；反馈 | 4 |

**22 primary operations: four switches, six selections, twelve destinations.** Appearance remains a selection even when its chooser is a dialog. Prompt position reset remains secondary. Conditional failures, repair actions and consent dialogs are not extra normal settings rows. Capability gating remains truthful; do not manufacture a working control just to satisfy the target count.

Saving applies only to eligible sent/displayed user inputs under the actual capture contract. First enable requires explicit consent; pause retains existing material. Smart Filter affects ordinary visibility, not capture, original existence, Topic membership or AI access. Human edits/Keep/removals outrank automatic behavior. Suggestions retain separately consented, default-off local Stage 3A semantics: no reply backlog, durable assistant body, remote processing or auto-send. NIB/Prompt owns the feature and position-only reset; this adoption changes neither its design nor its stored text/order/hide/pin/open state.

Preserve actual preference enums and saved values: body sizes 小/标准/大/特大 correspond to 16/17/19/21px; widths 紧凑/标准/宽 correspond to 640/680/720px; time is 标准/详细, without another emphasis selector. System/light/dark and supported system/Chinese/English language choices remain. Prose preferences do not resize all Settings UI text. Mock initial values are not a migration or a default reset.

The three AI Organize styles remain 原话优先 / 平衡整理（默认）/ 更加概括 for Free and Pro. Saving the preference invokes no model, quota debit, full-library scan/rebuild or automatic regeneration, and changes no original body, Topic/Section identity or access state. AI_ORGANIZE_STYLE_CONTRACT and AI_USAGE remain the semantic and service authorities. Existing saved output stays readable when qualified. A later deliberate refresh uses its actual authorized owner.

Hide content previews remains one fail-closed acknowledged preference: it masks applicable list/search excerpts, including newly designed surfaces, without deleting content or granting access. Explicit local reading follows its own eligibility. The new Home excerpt designs do not override a user's existing hide preference. Support, version, update, storage, connection and cloud labels use real owner facts, not sample values or a request merely on page open. Unknown is not zero/off/connected/latest.

## 3. Auxiliary presentation and domain ownership

| Approved surface | Implementation owner retained | Non-negotiable boundary |
|---|---|---|
| First-use welcome, example and capture permission | Existing onboarding/capture owner; SET2-01 presentation | Only the real first-use/explicit enable journey. Never replace neutral Archive Home; no automatic consent, import, Sync or AI grant. |
| Reading/appearance/style choices and save failure | SET2-01; current shared preferences; AI style owner | Durable acknowledgement, current enums, safe retry and cross-window reconciliation; zero generation on selection. |
| Data directory, import, existing-file restore, storage, removed content and Source access | SET2-02 consuming current import/Backup/typed recovery/Source owners | Validate and preview before authorized activation; preserve all existing lawful modes, conflicts, partial progress and deletion fences. |
| Sync detail, offline/account change, new-device recovery, cloud-copy deletion and human conflict | Existing BNS lane; Settings supplies entry and visual integration | All BNS states and provider-specific boundaries remain. Settings does not implement a cloud account/store or grant permission. |
| AI connection list, no connection, pause/revoke and return | CTX4-06/07 and the current Context connection owner; SET2-03 route only | Belongs in 用于 AI, not the Settings body/group rail. One PAIA scope, no per-client × per-Topic matrix or invented connection. |
| Source inspection, actual content versions and object-specific purge | Existing Archive/Source/editor owners through SET2-02 | Source/Working distinction and current B-01/B-02 remain; no generic Settings purge or history feature. |
| Help/privacy/terms/About/feedback | SET2-04 and verified existing content/contact owners | Long readable documents; actual approved legal content and version; explicit feedback only, no archive/log upload or fake send. |
| Empty/loading/unavailable/failed save/confirmed index failure | The affected owner; SET2-05 convergence | A normal empty state does not hide an error. Repair is contextual, never an always-visible diagnostics dashboard. |

All workflows keep their full product requirements even where a sample omits them. In particular, the two example removed rows do not eliminate Topic/Entry recovery; the merge-only restore example does not cancel other lawful existing-file restore modes; the smaller Sync demonstration does not cancel its complete state machine, adapters, automatic new-device recovery or entity-specific conflict rules. Missing live service blocks the dependent action/claim only, not ordinary local work.

The new connection composition supplements CTX4-UI-1.1's earlier explanatory no-connection dialog. **Its four-card Home, Item editing, Topic permissions and allowed-scope drawer stay unchanged.** Thought TL-PT1-UI-1.1 and Archive IAH-1.2 stay unchanged. The three embedded originals are comparison assets, not permission to redesign them, replace a separately authoritative Logo, change primary navigation, revive Popup/Side Panel or create an iframe-based application.

## 4. Finite supersession ledger

| Previous presentation requirement or reading | New approved target | Preserved |
|---|---|---|
| Settings cannot be redesigned; preserve old pixel geometry/colors/28px header exactly | Approved blue-white Settings composition, 34px reference title role, refined directory/rows/controls and layers | Current semantic roles, actual brand, six groups, saved preferences and accessibility; no unrelated global redesign |
| Old 20/21-row pictures or original October-7 Settings geometry are the final masters | New HTML and 33 screenshot states, retaining the established 22-row target | Complete earlier nonconflicting state/function/safety coverage and original PASS/FAIL history |
| Group page on narrow screens repeats Settings header and current group heading | Successive directory/group views; one content heading and a clear contextual Back | Route/scroll/focus restoration and guarded pending work |
| Setting changes require no visible reading example | Local synthetic reading preview responds to acknowledged preferences | No personal-data enumeration, body writes, model or fee |
| A blanket no-card/no-gradient rule forbids the approved auxiliary surfaces | Flat settings rows, restrained useful paper blocks, blue-white canvas and supplied dark translation | No card-wall Settings, marketing hero on normal Home, ornamental animation or inaccessible controls |
| Existing modal-only Data details or old auxiliary styling must be copied unchanged | Adopt the new secondary-page, short-modal and on-demand-drawer compositions by purpose | Existing command/listener/validation/transaction/permission owner; no replacement backend |
| Context's earlier prototype explanation is its complete final connection screen | New Context-owned connection page and no-connection state, integrated through CTX4-06/07 | CTX4-UI-1.1 primary pages, one scope, actual read/revoke journey and default-off policy |
| Unified demo navigation/state is production architecture or proof of completion | Use actual shared application/session/preferences/domain owners | No iframe bridge, base64 app, mock localStorage schema or fake backend in production |
| Prototype success, test report, fixed sample values or copied terms establish live behavior | Use actual acknowledged runtime/service/content facts; certify on the real applicable build | No activation, fabricated claims, automatic spending or publication |

This replaces only the listed conflicting Settings/auxiliary presentation clauses in lower-order UX/Master/Technical/AGENTS/old artboards and domain visual references. All nonconflicting product, source, state, migration, privacy, recovery, caller and verification requirements remain. It is not a mandate to finish obsolete visuals first or restart completed stages. Current scheduling is not edited.

No Advanced/search setting, Profile, material tray, candidate approval, ordinary diagnostic panel, BYO API key, account/model/budget console, export, backup generation, generic data deletion or duplicate AI-access entry is revived. Existing authorized content-specific clipboard copy and feedback copy are not file-export products or mandatory AI preparation.

## 5. History, evidence and task limits

The complete previous adoption is preserved as [PRE_UI](SETTINGS_CONSUMER_V2_ADOPTION_PRE_UI_2026-10-13.md), exact blob `1ea77174a804176c0fa750a5e131258113b20782`. Its full nonconflicting requirements, including the incorporated PRE_AI_USAGE baseline, remain normative. The prior PLAN and REFERENCES are also retained byte-for-byte. Old initial NOT_STARTED/PLANNED and next-task statements describe their dated tasks, not current engineering progress.

This task checked the actual supplied ZIP/manifest/standalone identities, relevant prototype source and screenshot compositions against the current plan. The package's 36/36 synthetic checks and 136 viewport/theme/state renderings remain reported historical prototype evidence, not rerun tests or production certification. The new visual target needs actual source/release and interaction evidence under existing verification rules.

Original files remain in the owner-controlled conversation; this documentation does not publicly upload them or any font/private corpus. No runtime code, schema, test, workflow, version, website, data, consent, account, cloud, service, billing, install or deployment is changed. Existing separately authorized development continues under STATUS without a new writer or queue.
