# Settings Consumer v2 — Current Implementation Plan

Current scoped amendment: **AIOS-1.0 / AIU-1.0, 2026-10-07**.
Execution status: **PLANNED; this documentation performs no runtime work**.

## 1. Complete retained implementation baseline

The complete prior source-grounded implementation plan is retained byte-for-byte in [SETTINGS_CONSUMER_V2_PLAN_PRE_AI_USAGE_2026-10-07.md](SETTINGS_CONSUMER_V2_PLAN_PRE_AI_USAGE_2026-10-07.md), blob `e856a1ead2a2442561801b3868db240b3abd6b66`. Its five delivery stages, source-owner audit, dependency/availability requirements, migration/rollback, consumer copy and verification matrix are incorporated here except for the explicit style and inventory amendments below. It is not a second queue. Read the retained plan when implementing each existing stage; none of its nonconflicting acceptance is waived.

Current product authority is [SETTINGS_CONSUMER_V2_ADOPTION.md](SETTINGS_CONSUMER_V2_ADOPTION.md). Its final intended inventory, including BNS and style, supersedes all earlier row-count examples. STATUS alone chooses execution; current Topic closure is not displaced.

## 2. Scoped stage amendments

**SET2-01 — local Settings composition and preferences:** retain existing `ui/settings-preferences.js`, `ui/ux-r1-state.js` normalization, acknowledged UPDATE_PREFERENCES command and current worker/storage owner. Add only the AI 整理方式 selection under AI 与提示词, default balanced with known enums. Preserve existing saved preferences and unknown-version safety. Saving/returning/restoring a style changes no Input, Topic/Section, output body, remote consent or financial state. It makes zero provider calls and performs no full-library enumeration/rebuild. A failed save restores the last acknowledged selection. The global preference can exist while generation remains unavailable; availability copy must remain honest.

**SET2-02 — data/recovery:** unchanged except the already adopted BNS Sync row. Do not create exports, generic destructive commands, cloud consoles or extra diagnostic surfaces. Existing recovery/source/compatibility requirements remain.

**SET2-03 — Context/Prompt owner integration:** retain one Context Settings destination and local Stage 3A semantics. The new style setting does not replace either. Remote Assist/AI Filter permission is separate and never inferred from the old local toggle, Sync, capture or tier upgrade. No additional primary row is required for the AIU design.

**SET2-04 — About/source-facing presentation:** unchanged. No fake subscription/provider status is added.

**SET2-05 — final production verification:** add the style row to the actual 22-row intended composition and retain every existing responsive/accessibility/locale/theme/keyboard/capture/recovery guard. Test all three selection labels/default/acknowledgement, failed persistence, restart, two windows, unsupported preference version, returning to the Topic without generation, cache reuse, service unavailable and exhausted quota. Check that ordinary opens and style selection have zero network dispatch. Existing private 20/21-row prototype counts are historical; do not change their evidence to claim a new PASS.

## 3. Cross-plan dependency ownership

[AI-COST-01/02](AI_USAGE_PLAN.md) own meaningful revision/receipt and shared AI admission. **AI-COST-05** owns the three-mode derivative policy, semantic cache and explicit single-Topic refresh. **TOPIC-05.7** owns integration with the one approved Thought reader. **BNS** owns future cross-device preference transport/compatibility, without transient jobs/caches or active consent restoration. Settings only reads/writes the one consumer preference and presents it.

The precise transformation, evidence and user copy are defined in [AI_ORGANIZE_STYLE_CONTRACT.md](AI_ORGANIZE_STYLE_CONTRACT.md). Quota/budget values are not duplicated in this plan. No per-Topic override, persistent segmented control, second preference store, copied Context body, AI dashboard or automatic provider call is introduced.

## 4. No-activation and preservation

Keep all source/body/human-work and legacy-deny preservation obligations from the retained baseline. Current unavailable capabilities remain unavailable until their own implementation and actual acceptance. Docs adoption is not production visual certification, model qualification, user processing consent, financial authority, cloud setup or release. No production file, schema, manifest, user data, live entitlement or paid service is changed in this task.
