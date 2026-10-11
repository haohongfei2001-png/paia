# Settings Consumer v2 — final design adoption

Decision date: 2026-10-07. Contract: **SETTINGS-CV2-1.0**.
Status: **OWNER_DIRECTED / ADOPTED / DESIGN_FROZEN**.
Implementation by this task: **NOT_STARTED**.

The owner retained the reviewed Settings composition, directed a finite final simplification, and requested immediate design freeze, executable planning and canonical GitHub integration. This adopts those corrections; it is not another concept exploration. The corrected private artifacts are identified in [REFERENCES](SETTINGS_CONSUMER_V2_REFERENCES.md). Their verification is independent-prototype evidence, not production certification or a subsequently observed owner pixel review.

[This document](SETTINGS_CONSUMER_V2_ADOPTION.md) owns Settings product/presentation decisions. [PLAN](SETTINGS_CONSUMER_V2_PLAN.md) owns implementation gaps, stages, compatibility and acceptance. [STATUS](STATUS.md) alone selects execution. Common PAIA shell/tokens and the existing Context, Thought and Prompt contracts retain their own authority.

## 1. Frozen composition and inventory

Desktop uses a lightweight Settings directory plus one content area. Six groups, setting rows and restrained separators; no large card grid, Settings search, Advanced catch-all, third/fourth navigation tree, new brand language or duplicate primary space. First desktop entry selects Input Archive. Below 1024 CSS px, directory and group are stacked destinations; the group has Back to Settings. Text enlargement may trigger stacked composition earlier. Browser history, group/scroll/focus restoration and the existing Reader leave guard are required.

| Group | Normal actionable rows | Count |
|---|---|---:|
| 输入档案 / Input Archive | 保存我的 AI 输入; 智能过滤 | 2 |
| 阅读与外观 / Reading & appearance | 外观; 语言; 正文字号; 阅读宽度; 时间显示 | 5 |
| AI 与提示词 / AI & prompts | AI 上下文; 下一句建议 | 2 |
| 隐私与访问 / Privacy & access | 隐藏内容预览; 支持的网站 | 2 |
| 数据与恢复 / Data & recovery | 导入历史输入; 存储空间; 从已有 PAIA 备份恢复; 已移除的内容; 原始来源记录 | 5 |
| 关于 PAIA / About PAIA | 隐私说明; 使用条款; 帮助; 反馈 | 4 |

The final target has **20 main actionable rows: four switches, five selections, eleven destination rows; plus one secondary position-reset action**. This counts the fully connected design, not capability availability in the current extension. Conditional repair/update actions and temporary dialogs are not permanent rows. Do not manufacture controls to meet a numeric quota.

Prompt Reuse applicability is a compact heading/status beside its relevant preference, not an inert duplicate setting. About shows actual version and update status as unboxed metadata; an update action exists only for a real available update and supported safe route. The local-storage privacy fact is light prose, not a second storage row. Unsupported future languages/sites, membership, cloud controls and fake successes are absent.

## 2. Final consumer decisions

### Input Archive and reading

Saving refers to text **the user sends to a supported AI**, not assistant output. First enablement retains explicit capture consent. Pause/resume does not erase existing material; resuming can capture older eligible inputs still visible on the page. Temporary Chat remains excluded, without a nonfunctional switch.

Smart Filter changes default Archive visibility, not capture, Source existence, Topic membership or external AI access. UI is on/off over the existing light/off modes. Manual edits/keep/restore/exclusions outrank filtering. Historical-processing commands and filter diagnostics are not ordinary settings. Filtered-content discovery remains in Archive and is distinct from removal.

Preserve four actual size choices: 小/标准/大/特大 (16/17/19/21 px internally), and 紧凑/标准/宽 (640/680/720 px internally). Existing stored choices are not reset. Time display is 标准/详细; delete the second emphasis selector. Time is always quiet but legible. Prose choices affect Archive/Thought text, not Settings UI typography. Follow-system appearance/language and Chinese/English remain; no invented supported locale.

### AI and Prompt ownership

The **only Settings AI access destination** is AI & prompts -> AI Context. It displays a read-only truthful status and opens the Context-owned route. Privacy has no second access entry. Global, Card, Topic and Connection state, the four cards and their editing stay in Context. Settings never reads the entire archive to calculate a status or creates a permission store. Unknown/unavailable cannot be labeled connected or open; off is used only for a known off state.

Prompt text, pin/order/edit/hide/split and insertion remain in the cross-site Prompt Surface. No new global enable switch is adopted. Closing the card is not disabling the product. The secondary reset changes **position only**, retaining prompts, manual order, hidden/pinned state, open/closed state and suggestion permission.

下一句建议 is the existing approved Stage 3A preference: default off, explicit enable, local temporary processing of the newly completed latest reply; no historical backlog, durable reply body, upload, model request or auto-send. Capture pause and this permission are independent. Disable clears current suggestions and rejects late results without disabling Stage 1/2. Settings consumes the Prompt-owned implementation; it does not implement a detector, second preference or Stage 3B. Before that implementation exists, a concise truthful unavailable state replaces an actionable enable control.

### Privacy, data and recovery

Hide content previews controls excerpts in lists/search; detailed encryption/screenshot limitations belong in help. Supported websites shows actual supported service names and capability facts, not raw host patterns or an AI-connection matrix. Current local residency is one quiet sentence. Storage space and necessary browser estimates have their sole actionable destination in Data.

Import remains import, not sync. Existing-file restore remains select -> validate -> preview impact/conflicts -> confirm, using the existing staged/validated activation service. No active library is changed before the authorized commit; isolated validation staging is not activation. Backup generation/export remain cancelled.

Removed content has one discovery entry but retains typed recovery: Input, Topic container/relationship, Entry and Placement operations remain distinct. A relationship restore cannot duplicate a body, undo a stronger deletion/negative intent, restore grants or broaden AI access. Unresolved import destinations are not removed content; use import results/Archive. Source records retain their existing low-frequency read route.

**No version-history row, explanation, retention selector, automatic-version notice or pruning action remains in Settings.** Content-specific history/restore and underlying preservation rules remain. Help may explain them without creating a Settings history feature.

**No abstract permanent-delete-data entry is adopted.** Supported permanent deletion begins on its actual Source/object, previews real scope and preserves the existing unambiguous/B-02 preflight and final revalidation. Mixed-human/unknown derivative boundaries remain gated. Removing an entry point never removes a safety restriction.

Diagnostics are absent normally. A relevant confirmed data/index failure reveals a local action; messaging interruption alone is not corruption. Failed repair keeps the real error visible without claiming success; successful recovery clears obsolete fault presentation. No telemetry/audit expansion follows from this design.

## 3. Shared visual and interaction authority

Retain current AppShell, PrimaryNav, logo, title/UI/prose/metadata fonts, light/dark role palette, content axis, selected/focus roles, control geometry and responsive behavior. The existing final CSS cascade, not an early overwritten declaration, is the implementation reference. Main titles use the shared 28/38 desktop role, reduced appropriately on compact screens; settings text uses shared UI roles. Do not substitute a new font, green canvas, ornamental glass or iOS-style card-list shell.

Rows can wrap, values remain identifiable, switches have labeled on/off states and native semantics. Narrow/coarse targets are at least 44 CSS px. At 320 CSS px and 200% text there is no page overflow, essential clipping or focus obscured by sticky chrome. Use natural flow for enlarged dialogs; no forced fixed heights. Normal reversible changes apply after durable acknowledgement; failure retains/reconciles the last confirmed state with a local retry message. Cross-window changes, IME, dirty Reader state, late responses and focus return remain protected.

## 4. Exact scoped supersession

| Former target | Disposition |
|---|---|
| D6.2 Settings S01-S05 composition, D7 Settings presentation, horizontal groups/mobile group select and older Settings IA | Replaced for Settings by this six-group directory/row design and its corrected references. |
| Input & capture / Content & capture name | Replaced by Input Archive, separating saving from filtering semantics. |
| Membership/AI-service unavailable panel, including the Settings-entry wording in PRODUCT.md current scope and PRODUCT_INTENT_CONTRACT.md section 15 | Removed as ordinary Settings UI. Paid service prerequisites/unavailability remain unchanged. |
| Duplicate Privacy AI access entry; local-only/external toggle console; revoke action as a separate Settings owner | Replaced by the sole Context route. Restrictive legacy state and reachable revocation must be safely handed to the real owner before removing the last usable path. |
| Duplicate data/local storage rows | One Data storage destination; light local-residency prose only in Privacy. |
| Settings version history/helper/retention/prune, generic permanent-delete entry | Removed from Settings. Content history and scoped legitimate Source purge remain. |
| Topic/Section/Organizer permissions and Prompt manager/settings copies | Not Settings responsibilities. PT-1, CTX4 and Prompt contracts unchanged. |
| Ordinary recovery/diagnostics dashboard | Absent; only actual-fault recovery remains. |
| First Settings review's 25-row inventory and duplicate/history/general-purge screens | Superseded by corrected final artifacts; old checks remain historical prototype evidence. |

Frozen D6/D7 artboards, implementation reports, acceptance registrations, failures and historical PASS remain unmodified. Their nonconflicting data/edit/privacy/recovery requirements survive and need equivalent current tests. Shared visual roles still govern all spaces. This does not reopen Thought, Context or Prompt design, change their identity/permissions, or authorize an unrelated feature.

## 5. Adoption boundary

Initial design read: main `29940a921e4797c463a5e7e8436bafe6125f9f1d` (0.12.1). Final integration read: main `288e17fb7adaf05b63a4af72458c1d6787488e0d`, tree `550aab987b33196ea05ed5fec06e93771670b35e`, manifest/package 0.13.0. The intervening Topic-01 integration and strict identity/restore code are retained unchanged; its receipt still requires exact-main full verification and canonical closure. Settings/UI/Context/Prompt source files were unchanged by that intervening work. Corrected prototype verification is recorded in REFERENCES; it is not extension persistence, authorization, migration, physical IME, screen-reader or live-provider evidence.

This adoption changes documents and privately delivered design artifacts only. No production JS/CSS/HTML, manifest, schema, tests, user data, installed extension, AI service, permissions, spending, deployment or release is changed. Current restrictions and existing unfinished work remain. Exact pre-adoption STATUS/MASTER blobs are retained as same-directory PRE_SETTINGS_V2 snapshots. The sole next task remains the one selected in STATUS; Settings stages are planned outcomes, not a parallel execution queue.
