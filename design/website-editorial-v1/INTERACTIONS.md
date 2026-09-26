# Interaction and accessibility states

Static artboards specify appearance; the following specifies future behavior. No interaction is implemented by this design task.

## Navigation

The header is quiet and **not sticky by default**. Home, How it works, Use cases, Our story, Journal and the single early-access CTA have real destinations in ROUTES. Active-page underline is 1.4 px and does not change layout. A locale switch in the footer preserves the route. On compact widths, a 44×44 menu button opens the complete navigation in normal document flow on the paper background; no glass overlay. Show a close control. Focus enters the menu, Escape closes it and focus returns to the trigger. Hidden navigation is not focusable. No body-scroll trap is required because this is not a modal.

## Primary and secondary actions

Primary pill uses the dark-green fill, understated border and rightward arrow. Resting geometry is fixed. Hover changes fill slightly and translates the arrow by 3 px; the pill itself may rise at most 2 px without relayout. Pointer down returns to rest. Keyboard focus has a 2 px contrasting ring, offset 4 px. Never suppress native focus without an equal replacement. Secondary links retain a fine underline and expand its visible stroke/contrast on hover; no jump in width.

## Narrative demonstrations

The hero is an illustrative composition, not a live product screenshot, a login or a promise of an AI reader connector. Its primary content is accompanied by an accessible text description. Decorative images and connectors are hidden from the accessibility tree; original example words remain accessible through the description or the full public example.

The public example page retains the existing synthetic demo's actual behavior boundary. Selection is explicit; unchecked material is excluded; an empty set does not auto-acquire substitutes. Source, working version and selected context remain distinguishable. An edited source or changed task marks the prior preview stale and disables actionable stale copy/export until refreshed. Copy only after a user action, with success announced in a polite status region; a denied clipboard action leaves the text selectable and says it did not complete. Export follows explicit action only. No capture, external AI, persistence or archive connection is implied. Reload clears current-page changes.

## FAQ

The homepage shows five collapsed questions. The complete FAQ page provides the full answers and section anchors, so the content remains available without scripting. An accordion control exposes expanded state, points to the answer region and is keyboard-operable. Plus becomes minus without shifting its hit target. Expand duration 180 ms; in reduced motion, instant. The answer increases layout height; it does not overlay the next question. The first expanded specimen is in the states artboard. Do not shrink or truncate the answer to keep a screenshot's original collapsed height.

## Beta form

Email and forwarding consent are required; the open question is optional. Use real labels above fields, not placeholder-only labels. Input height 53 px; message field 118 px minimum; preserve the caption explaining optionality. Do not collect phone, résumé, archive text, password, source-account credentials or a new persistent user identifier.

The existing FormSubmit recipient/action and privacy substance are the baseline, not permission to add a new service. Nothing is sent by the design renderer or tests. Validate missing/invalid email and missing consent before leaving the page. Error summary receives focus and links to affected fields; each error also appears inline. Preserve typed values. No automatic checked consent, silent resubmission or hidden analytics.

States: pristine; focused; invalid email; required consent missing; valid and ready; submitting with disabled repeat action and “Sending request…”; external redirect; returned without a verified delivery receipt; failed or interrupted submission; user choosing the contact alternative. The supplied thanks page deliberately does not say “You’re in” or claim confirmed delivery. Until delivery evidence is available, do not fabricate it for aesthetics.

## Typography and accessibility

Meaningful main copy is at least 16 px on mobile; body contrast and comfortable measure take precedence over decorative microcopy. The small source text is part of an illustration and requires a complete equivalent description. Controls have at least 44×44 CSS px interactive area even when their visible arrow or icon is smaller. Provide a skip link, landmark structure, one primary page heading, sensible heading order, informative field errors and persistent labels.

Retain readable text at 200% zoom and narrow 320 px width. At high text zoom, text sections reflow intrinsically, navigation can collapse earlier, and illustrations move below copy. Do not uniformly scale down the page. Decorative motion respects reduced-motion preferences; content is visible immediately without JavaScript.

## Motion score

There is no idle-floating animation. Initial appearance may use 240 ms opacity plus at most 10 px translation for the main scene; source sheets follow in a single 60 ms stagger, total under 480 ms. No continuous parallax. Connector lines need not be animated; if introduced later, draw once over 280 ms without changing their end positions. Hover 160 ms, focus immediate, FAQ 180 ms. All motion resolves to the supplied canonical still composition. No essential action waits for an animation.
