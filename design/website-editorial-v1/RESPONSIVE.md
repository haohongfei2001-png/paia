# Responsive and localization contract

## Canonical frames

Every complete route is drawn at **1440 px desktop** and **390 px mobile**, both English and Chinese. Use these as the fixed endpoints. The SVG is not a responsive website. Do not ship it as an image of the page.

## Width ranges

| Width | Required behavior |
|---|---|
| 1440–1920+ | Maximum composition width 1440, centered. Add equal outer whitespace; do not stretch the semantic scene or headline. At 1920 the frame origin is +240 px relative to the viewport. |
| 1180–1439 | Outer margin 48–76 interpolated. Keep editorial copy at roughly 40% and scene at 60%; scale only decorative scene coordinates within its own box, not live copy, nav or CTAs. Source text that is only illustration has a full accessible alternative. Below the minimum scene width, use the next range rather than overlapping the H1. |
| 1024–1179 | Header collapses to the compact menu. H1 56/60, readable copy max 490. Collage occupies its own row beneath the copy, max 748 wide and centered. First benefit area becomes two editorial columns with the third benefit plus arched manifesto below; no card borders are introduced. |
| 768–1023 | 48 px outer margins; compact header. Main text measure max 620, body 17/27. H1 max 54/59. Hero scene below, with fixed local coordinates fitted inside 672 px; center context paper remains at least 210 px wide. Down-page folios stack text then photo with alternating photo inset. Maximum photo width 480. |
| 430–767 | Mobile composition, centered content max 430. H1 47/49, body 16/25. Do not enlarge every sheet in proportion to viewport; maintain the selected paper's hierarchy and unequal source sizes. |
| 360–429 | Use the supplied 390 frame. Outer margin 24; available text width = viewport minus 48. Rewrap body, not the entire page. Labels, buttons and artwork receive independent layout owners. |
| 320–359 | Outer margin 20, H1 40/44. Compact header shows PAIA and the menu; its early-access action moves into the menu, while the hero CTA remains visible. Body stays 16/25. Context paper at least 210 wide. Move the third background source downward; do not allow horizontal scrolling. |

These intermediate ranges are explicit adaptation rules, not falsely claimed additional approved artboards. Future implementation must capture 320, 768, 1024, 1440 and 1920, and reconcile the intermediate screenshots against the rules before visual closure.

## Normal flow and scene flow

Text content remains normal document flow. The narrative column and the illustration scene are separate layout owners. Absolute positioning is appropriate *inside* the decorative collage and its known coordinate system; it is not appropriate for positioning every section at a hardcoded global y in production. The artboards' global y values specify the target rhythm at the canonical size, while actual text reflow may increase a section's height.

The same rule applies to mobile: foreground sheets can overlap background image or illustrative text, but body copy, navigation, form labels, input errors, FAQ answers and CTAs cannot collide or be clipped. Give open states intrinsic space. At 200% text the page may become longer; preserving readability is not permission to erase photography or typography contrast.

## Localization

English root routes and explicit Chinese `/zh/` routes remain separate, with a same-page locale switch. No geolocation, language fingerprint, persistent forced redirect or guessed country. Existing `/en/` aliases continue to canonical English routes. New detail/article aliases follow the same mapping.

English display: EB Garamond 12 regular and real italic. Chinese display: Noto Serif CJK SC regular, with **no faux italic**. Chinese body: Noto Sans CJK SC. Latin brand PAIA remains a Latin wordmark, not a translated logo. Punctuation follows the locale; manual display breaks are supplied in the geometry files. Do not mechanically reuse English tracking on continuous Chinese paragraphs. Tiny decorative annotations can remain compact, but the meaning must not depend on reading them.

The copy JSONs share stable IDs. Full article content is in `copy/articles.json`. Policy text is carried separately from the baseline; design work does not rewrite policy substance or dates.

## Loading and performance behavior

Use the fixed local photographs and the provided smaller fallbacks. Future production exports should select appropriate image resolutions and modern encoding, without re-cropping the subject or changing the approved grade. Reserve image dimensions to prevent shifts. Load below-fold imagery lazily. Preload only necessary display/body fonts; do not introduce a remote font dependency silently. Font acquisition is a separately verified build input; the design package does not contain font binaries.

No scroll hijacking, parallax dependency, autoplay video, canvas-only copy or animation required to understand content. Image failure keeps the composition using the local lower-resolution fallback and a stable crop; it does not collapse the scene into empty equal rectangles.
