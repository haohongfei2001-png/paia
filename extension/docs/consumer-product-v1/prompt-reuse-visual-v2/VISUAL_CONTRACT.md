# Material contract v2

Required: **frosted / diffused / translucent / low-saturation / soft-rim /
soft-highlight**. Forbidden: **plastic pearl / glossy bead / hard specular /
opaque gradient sphere / hard double rim**. Also reject candy buttons, soap
bubbles, chrome marbles, neon/rainbow or continuous bloom/glow.

## Orb

Keep 40 px face, 44 px target and the same accessible button/interaction owner.
Four broad transparent optical washes blend cool white, pale blue, lavender and
mint. There is no separate reflection element, hard white ellipse or second rim.
The broad highlight is a 3 px blurred radial wash over the full inset surface;
a 4 px blurred inner haze has no hard-edged core. Backdrop blur is 9 px with
saturation .92. Background content contributes to the final material.

Light optical layers use maximum alpha .40 / .30 / .24 / .22, with base white
.32 to cool .15. The one edge is rgba(130,147,171,.16); diffuse inner light is
rgba(255,255,255,.38). Shadow: 0 8px 22px -4px rgba(82,98,127,.14).
Hover/focus gently increases rim/shadow only. The existing visible 2 px keyboard
focus indicator stays. No scaling, placement or interaction behavior changes.
Dark uses the same geometry and lower white energy, a neutral translucent base,
and a low-density dark shadow; it must not become a self-lit white bead.

## Capsule

The master is a thin 34 px visible glass capsule within a minimum 44 px effective
height, joined to the right-hand orb. Text is primary; no filled blue CTA/badge,
notification-card padding or stronger material contrast than the orb. Ordinary
and conditional text share the same object. The ordinary example is “继续深入这个
方向 →”; the conditional example is “登录后 · 已登录 →”. Dark adapts luminance
without changing hierarchy. Main has no Stage 3A capsule runtime; do not add it
for a screenshot. The separate Stage 3A branch will adopt these tokens during a
single-writer integration after owner review.

## Existing card audit and bounded changes

Preserve 336 px width, 20 px radius, existing rows, type, management, footer,
scroll geometry and every interaction. Real differences against the original:
material was .94/.90/.82 opaque, the white rim was .85, ordinary shadow .14,
and separators/scroll thumb slightly stronger than the intended soft glass.
Change only these material values: white/cool glass .72/.62/.54, rim .46,
shadow .10 over 52 px; dark glass .72/.66/.62, edge .12, shadow .28.
Separators .09 → .07; scrollbar light .30 → .22, dark .33 → .25.
No information-architecture or geometry redesign is justified by the reference.

## Frozen behavior

No Family/ranking, management semantics, composer insertion, draft/caret/
selection/IME, no-send, drag, toggle, persistence, layout placement, Detector,
authorization/B-04, schema, permissions, D7 or other B-01–B-05 behavior changes.
No remote images/fonts/shaders, added dependencies or continuous animation.
