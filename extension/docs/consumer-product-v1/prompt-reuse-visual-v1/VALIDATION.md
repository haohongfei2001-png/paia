# Prompt Reuse Visual Validation v1

CPV1-09.3V is a **visual convergence** task. It does not reopen Prompt Family,
storage, insertion semantics, authorization or Stage 3.

## Required comparison

For every V01–V08 state:

1. render the stored target SVG;
2. render the real source extension in the same synthetic state;
3. render the built release extension in the same state;
4. match viewport, DPR, theme, text, scale and host-composer geometry;
5. produce target / actual / difference;
6. record a human design-conformance judgment;
7. correct the implementation and repeat until accepted.

Source/release parity by itself proves only that both builds render the same
implementation. It is **not** evidence that the implementation matches the visual
master.

## Fixed visual checks

At minimum inspect:

- orb material, depth and lack of permanent wordmark;
- orb/card spatial relationship;
- card width/radius/material/shadow;
- prompt-first hierarchy;
- row density and divider strength;
- hover/focus affordance restraint;
- edit composition;
- drag composition;
- scrollbar weight;
- light/dark material;
- compact reflow;
- composer overlap.

## Allowed implementation change

CPV1-09.3V may change Prompt Reuse presentation CSS/DOM composition needed to
match the masters.

It must not change:

- Prompt Family grouping/ranking semantics;
- manual ordering behavior;
- template edit/delete/split semantics;
- insertion/no-send behavior;
- trusted command boundaries;
- durable schema;
- host permissions;
- reply-reading/B-04 behavior;
- Desktop vNext D6.2 screens.

If matching the master appears to require one of those changes, stop only that
conflicting detail and record it instead of silently broadening scope.

## Accessibility

Visual convergence must retain:

- visible keyboard focus;
- at least 44 px coarse/touch target where required;
- 200% scaling;
- 320 CSS px reflow;
- reduced motion;
- readable light/dark contrast.

## Exit

CPV1-09.3V closes only when:

- V01–V08 actual production screenshots visually conform to the masters;
- source/release remain behaviorally equivalent;
- affected browser/privacy/package tests pass;
- owner visual acceptance is explicitly recorded.

Until then the correct status is:

`FUNCTIONAL_ENGINEERING_COMPLETE / VISUAL_ACCEPTANCE_OPEN`.
