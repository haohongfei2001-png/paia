# PAIA Prompt Reuse Visual Master v1

Status: **OWNER-APPROVED ART DIRECTION / LITERAL VISUAL IMPLEMENTATION TARGET / RUNTIME VISUAL ACCEPTANCE OPEN**

Date: **2026-10-04**

This package turns the already owner-approved Personal Prompt Reuse direction into
literal, versioned visual targets that engineering can compare against. It exists
because the first production implementation met the functional/geometry contract
but still looked like a generic browser-extension utility panel.

The underlying Prompt Family, ordering, editing, insertion, privacy and lifecycle
behavior remain governed by `../PROMPT_REUSE_SURFACE.md`. This package governs
**pure visual presentation only**.

## Authority

For Prompt Reuse:

1. Product/data/privacy/interaction behavior: `../PROMPT_REUSE_SURFACE.md` and
   higher PAIA canonical contracts.
2. Pure visual presentation: this package.
3. Current production implementation and screenshots: evidence only, never the
   visual authority.

If a master image and prose/token note disagree on a pure visual choice, the
master image wins. Engineering may not invent a third visual style to resolve a
difference.

## Why the raw conversation image is not copied verbatim

The public repository should not accumulate private chat artifacts. The approved
direction is therefore translated into these sanitized, synthetic-data artboards.
They preserve the accepted product form: **iridescent frosted orb → compact
anchored glass card → prompt-first rows → one-click insertion**.

No private archive text, real conversation screenshot or user-identifying data is
present.

## Master set

| ID | File | Purpose |
|---|---|---|
| V01 | `screens/01-orb-light.svg` | collapsed orb, light host |
| V02 | `screens/02-card-light.svg` | normal expanded card |
| V03 | `screens/03-card-hover.svg` | hover/focus management reveal |
| V04 | `screens/04-card-edit.svg` | in-card edit state |
| V05 | `screens/05-card-drag.svg` | reorder/drag state |
| V06 | `screens/06-card-dark.svg` | dark host |
| V07 | `screens/07-card-compact.svg` | compact 390 × 844 |
| V08 | `screens/08-inserted-light.svg` | prompt inserted into composer |

Read `VISUAL_CONTRACT.md`, `tokens.css` and `VALIDATION.md` before changing
the production Prompt Reuse surface.

## Current implementation status

Functional engineering through CPV1-09.5 remains complete. Owner review of the
actual runtime appearance after PR #148 did **not** accept the visual result.
Only the visual implementation is reopened as **CPV1-09.3V**.

The next Prompt Reuse engineering task is therefore visual convergence against
V01–V08. It is not Stage 3, a second provider or a redesign of Prompt Family
behavior.
