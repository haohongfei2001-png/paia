# TOPIC-05.8 saved-field summary: coarse pointer and enlarged text

Base: 4569f118, isolated branch codex/topic-ai-summary-accessibility-20261008. This is a bounded evidence increment under TOPIC_ARCHITECTURE_PLAN section 7.8 and visual authority responsive/accessibility requirements, not overall TOPIC-05.8 or TOPIC-06 certification.

## Scope and actual result

The existing durable AI case already measured a narrow summary target of at least 44px (the preliminary audit describing this as only 32px was incorrect). Missing evidence was an explicitly coarse pointer and enlarged label with real interaction. The new assertions were added to the existing source/release cases without adding cases or changing budgets, default collapsed state, locale/IME, exact Entry anchor, full authority snapshot or saved projection assertions.

The first new targeted run passed both variants, `/tmp/topic-summary-access-measured.log`, 8.778622875 seconds. No product defect was demonstrated, so no CSS or runtime was changed. An earlier path error occurred before the test edit; its unchanged-case run `/tmp/topic-summary-access-before.log` is not evidence for the new assertions.

The complete original UIR03 file then passed **8/8**, 33.18593025 seconds, `/tmp/topic-summary-access-complete.log`, no skipped or cancelled cases. Source and isolated audited release both used real CDP coarse-pointer emulation, verified `matchMedia('(pointer:coarse)')`, trusted touch activation of the native summary, and Space restoring its prior open state while keeping focus.

At 320 CSS px and dark theme, the summary's actual computed 13px font was doubled to 26px and restored afterwards. This is 200% summary-label text enlargement, not a claim of browser zoom or whole-page enlarged text. English measured 280×99px, Chinese 280×60px, with no horizontal page overflow, no clipped element line box, center hit testing and actual focus. Both languages retain the real product labels; user text was not translated or replaced. Existing full authority and saved-row checks confirm no content mutation from this matrix.

Actual final release viewport screenshots were inspected: the enlarged English label wraps naturally to two lines; the Chinese label remains one line, and the focus outline and label are visible without observed overlap. This does not claim private-design comparison, every locale, all error states or complete Root/Section accessibility.

## Exact bytes and local artifacts

- Native owner test SHA256: `aa1618b2fa63cc1c57228fde74ebe132ccfaff84b6a61c47dab6b565baf60543`.
- Unchanged topic-workspace runtime: `9c0118069f5ac3e5bded37126a58cb503d8751fea3ec361dd4194786b9fdf4be`.
- Unchanged ai-presentation runtime: `badf4b5913af49732dab59b361250026d3de2637466996060bc988caa6a6c35d`.
- `work/consumer-cleanup/{source,release}-saved-summary-coarse-text200-en.png`: `cec9c93eeaf7ba50bd0afab4252f5c539d033f92046be2aabfbcb04f48939f75`.
- `work/consumer-cleanup/{source,release}-saved-summary-coarse-text200-zh-CN.png`: `97e83ef4aca356f045c29165002d645f448de0c5523ff5a2aaa7e624180cebfe`.

Independent settings_review read the exact increment and approved the bounded label-only scope, actual trusted touch/Space behavior, cleanup and unchanged original assertions; no duplicate browser run was performed.

Local artifacts are not committed. Integration, exact-head CI, merged status and installed-version acceptance remain coordinator-owned.
