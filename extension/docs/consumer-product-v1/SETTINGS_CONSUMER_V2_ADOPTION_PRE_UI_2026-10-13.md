# Settings Consumer v2 — Current Adoption with Scoped AI Organize Style Amendment

Base: **SETTINGS-CV2-1.0**, with **BNS-1.0** and **AIOS-1.0 / AIU-1.0**, 2026-10-07.
Status: **DESIGN_ADOPTED / IMPLEMENTATION_AND_CURRENT_VISUAL_ACCEPTANCE_NOT_CLAIMED**.

## 1. Preserved baseline

The complete immediately preceding adoption is preserved byte-for-byte in [SETTINGS_CONSUMER_V2_ADOPTION_PRE_AI_USAGE_2026-10-07.md](SETTINGS_CONSUMER_V2_ADOPTION_PRE_AI_USAGE_2026-10-07.md), blob `ebee143012743976fe18e24addd42a9f0d04b949`. Its complete nonconflicting consumer copy, row destinations, dependency states, shared visual roles, owner mapping, migration, privacy/recovery and acceptance requirements are incorporated here. Read it for those detailed retained requirements. It is a baseline record, not a competing current inventory or quota authority.

This amendment does not redesign Settings, reopen Advanced/search/card grids, create a membership/model/budget console or move everyday Thought/Prompt/Context controls into Settings. It adds exactly one low-frequency global style preference under the existing AI group. Browser-Native Sync retains its single Data & recovery row and optional-cloud copy; no new account group appears.

## 2. Current final inventory

Six groups and their order are unchanged:

| Group | Primary actionable rows | Change in this adoption |
|---|---:|---|
| Input Archive | 2 | None |
| Reading & appearance | 5 | None |
| AI & prompts / AI 与提示词 | 3 | Add one AI 整理方式 selection after existing AI Context / next-suggestion entries |
| Privacy & access | 2 | None |
| Data & recovery | 6 | Retain BNS Sync row; no other change |
| About PAIA | 4 | None |
| Total | **22** | **4 switches + 6 selections + 12 destinations** |

The existing secondary Prompt position reset remains secondary, not a 23rd primary row. Earlier 20-row pre-BNS and 21-row BNS inventories are historical for those adoption scopes. This is the intended available target; unavailable dependencies must still use honest capability gating and may not be falsely shown enabled/connected.

## 3. New row and consumer behavior

Row: **AI 整理方式　平衡整理**.

Open a simple single-choice selection:

- **原话优先** — 尽量保留你的原句，只做重新组织。
- **平衡整理 · 默认** — 适度修剪、拼接和优化，让想法更连贯。
- **更加概括** — 提炼和压缩重复表达，突出主要思想。

Helper: **只改变整理后的阅读方式，不修改你的原始内容。**

All styles are available to Free and Pro. This is a consumer preference, not a quality/model-size or payment selector. Default is balanced. No per-Topic override or always-visible Topic segmented control in v1. Topic-local AI Organize ON/OFF remains in the Topic reader.

Selecting a style saves the acknowledged preference only. It does not call a model, debit quota, scan/rebuild the Library or change Topic identity/Sections/original bodies. Existing generated output stays readable when still permitted. A later deliberate single-Topic “按新方式整理” uses the shared admission/cache policy. The preference itself may be saved offline even when generation is unavailable; the UI must not imply that doing so enables the service.

Full semantics, cache/evidence, ownership, fixed examples and acceptance are in [AI_ORGANIZE_STYLE_CONTRACT.md](AI_ORGANIZE_STYLE_CONTRACT.md). Exact entitlement/budget numbers are owned only by [AI_USAGE_ARCHITECTURE.md](AI_USAGE_ARCHITECTURE.md), not repeated here.

## 4. Retained boundaries

Settings remains a lightweight directory/content area, with existing shared shell, appearance, language, reading preference and responsive/accessibility roles. Context/access has one Settings entry under AI & prompts; detailed permission management remains in Context. Privacy retains its minimal copy and supported-site destination; Data alone owns storage details. Version-history navigation/helper and a generic permanent-delete command remain absent from Settings; actual content history and lawful object-specific Source purge are not cancelled.

Prompt frequency, pin/manual order, editing/hiding and daily insertion stay in their surface. Existing next-suggestion settings retain Stage 3A's default-off local ephemeral consent. They do not grant remote AI Assist permission. Any Pro AI Filter or Assist consent belongs in the existing feature-owned detail/action path, not extra primary Settings rows. Ordinary diagnostic/admin controls remain retired; actual-fault recovery remains reachable.

Do not restore old BYO/service keys, union old grants, delete deny/local-only metadata or turn a synchronized desired preference into active external permission. BNS can transport the new style preference under its existing consumer-preference policy, but no transient AI job/cache, provider token or signed entitlement is restored active. User-kept/edited canonical work remains protected by its own BNS rules.

## 5. Implementation and evidence

Use current [SETTINGS_CONSUMER_V2_PLAN.md](SETTINGS_CONSUMER_V2_PLAN.md), which incorporates the unchanged five-stage source-grounded plan plus this amendment. SET2-01 consumes the existing preference owner; AI-COST-05 supplies transformation/cache semantics; SET2-05 verifies actual rendering, keyboard/focus, acknowledgement, failure/restart/cross-window and zero-network-on-selection behavior. No separate preference store or new normal UI dashboard is justified.

Prior private corrected Settings references and BNS references/hashes remain unchanged in SETTINGS_CONSUMER_V2_REFERENCES.md and BROWSER_NATIVE_SYNC_REFERENCES.md. Their earlier prototype checks do not prove this new row's production persistence, accessibility, Sync or AI behavior. No new pixel approval is claimed. The original product adoption and all nonconflicting scope/source/evidence restrictions remain intact.

This documentation changes no production code, schema, data, entitlement, paid model or release. STATUS retains the selected current next task; this is not another active queue.
