# Prompt Reuse Visual Contract v1

This file specifies how to read the literal masters. The images are the final
reference for pure visual appearance; these notes make implementation intent
explicit.

## 1. Core visual idea

The Prompt Reuse surface should feel like a small personal object that lives near
the AI composer, not like an extension dashboard.

The visual sequence is:

**quiet iridescent orb → one continuous frosted card → user's own prompt text**

The orb and card must feel like the same object in two states.

## 2. Orb

Reference:

- visible sphere: **40 px**;
- effective interaction target: at least **44 px**;
- circular, not a pill;
- no permanent `PAIA` word inside the sphere;
- no flat white button treatment;
- soft iridescent material: white + pale blue + pale violet + a restrained mint
  reflection;
- one bright specular highlight and subtle depth;
- low-contrast outer edge;
- soft shadow only;
- no continuous glow, pulse, spinning gradient or decorative animation.

The orb may use a tiny brand glyph in a later revision only if it does not destroy
the glass-object character. Text is not the identity mechanism.

## 3. Expanded card

Reference desktop width: **336 px**.

Reference visual height in the normal six-row master: about **350 px**; production
may grow only up to the existing product max-height contract.

The card is:

- one uninterrupted glass object;
- approximately **20 px** radius;
- soft cool-white glass in light mode;
- deep neutral translucent glass in dark mode;
- visually lighter than a settings panel;
- free of a permanent title bar;
- free of statistics, use counts, source labels, similarity scores and section
  headers in the normal state.

The orb overlaps/attaches near the card's upper-right edge, creating a visible
relationship between collapsed and expanded state.

The card should not look like six bordered form rows. Whitespace is primary.
Separators, where present, are extremely quiet.

## 4. Typography

Use the existing PAIA/system CJK-safe sans stack. Do not ship a network font.

Normal row:

- approximately 13–14 px UI text;
- medium-low contrast hierarchy, but AA-readable;
- natural line height;
- full prompt remains the semantic value even when visually clamped.

The user's language is the visual content. Do not surround every prompt with
metadata.

## 5. Row behavior

### Normal

Only prompt text is visually dominant.

### Hover / keyboard focus

A very light row wash may appear. Management affordances emerge quietly:

- drag grip;
- edit;
- overflow / contextual management.

Controls must not permanently compete with the prompt text.

### Edit

Edit stays inside the card and preserves the same material language. It must not
turn into a separate modal or full settings form. Save/cancel are compact and
secondary.

### Drag

The dragged row gets a small elevation/focus treatment and a clear insertion
line. Do not add large handles or colored cards.

## 6. Scrolling

A long list may scroll internally.

The normal desktop scrollbar must be visually restrained:

- thin;
- low contrast;
- no heavy native gray gutter;
- visible enough to communicate position;
- never visually stronger than prompt text.

## 7. Light and dark

Light:

- background surface remains mostly white/cool-blue;
- card edge comes from material/shadow, not a dark border;
- text remains dark neutral.

Dark:

- card becomes deep neutral glass rather than pure black;
- separators remain quiet;
- text becomes soft off-white;
- the iridescent orb keeps the same identity rather than turning monochrome.

Switching themes must not change hierarchy or card geometry.

## 8. Compact

At 390 × 844 / narrow layouts:

- same object, not a second mobile design;
- safe viewport gutters;
- card remains prompt-first;
- no horizontal scroll;
- management actions remain reachable;
- orb/card must not cover the host's essential composer controls.

## 9. Explicit rejection of the pre-convergence runtime appearance

The pre-convergence runtime shown after PR #148 is **not** a visual target.

Do not preserve these traits merely because they already exist:

- flat white circle with the word `PAIA`;
- generic utility-panel appearance;
- strong/native-looking gray scrollbar;
- visually heavy row dividers;
- controls that make the card read like settings UI;
- weak material relationship between orb and card.

Existing runtime code is a functional base only.

## 10. State authority

V01–V08 are literal visual states.

No state is visually complete merely because dimensions, source/release parity,
accessibility geometry or automated screenshot stability pass. Those are
necessary engineering checks, not design acceptance.
