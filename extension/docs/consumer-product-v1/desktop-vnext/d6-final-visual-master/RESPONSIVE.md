# Responsive and accessibility handoff

The seven native reflow drawings are A02 at1280/1024/768/320, C01 at768/320, and O04 at768. They are independent complete viewport drawings, not a scaled-down1440 image.

| Width | Primary navigation | Contextual navigation | Main |
|---|---|---|---|
| >=1440 |184px rail |312px when Archive Reader |44px default gutters; actual text caps |
|1280–1439 |184px rail |280px |fluid workspace; same hierarchy |
|1024–1279 |160px rail |240px |44px Reader gutter; allow title wrapping |
|768–1023 |64px icon rail with labels accessible on focus |explicit temporary sheet, not a metadata drawer |single reading column; Compare stacks |
|<768 |58px compact top navigation |stacked temporary navigation |20px gutters; title24/35;44px action hit targets |

There is always only one scoped search. Changing position or hiding the contextual navigator must not duplicate the search, replace its owner or lose scope/query. Compact Context shows the current stage plus position, with access to allowed previous stages; it does not skip review or force all five wide labels.

Original min(700,viewport−32) in the D6 drawing; History min(860,viewport−32). These are pure visual replacements for older720/960 defaults after approval. Keep a reachable heading and Close, scroll only the modal body, and stack comparison below1024. No side inspector. At320, the modal uses16px margins, labels wrap and no action moves offscreen. Default viewport height is1000 for drawings; production body flows and scrolls, not a fixed1000px canvas.

Keep menus/toolbars clamped to the visual viewport. Keyboard Escape dismisses transient UI without implicit discard, returns focus to a surviving invoker, and preserves selection/reading anchor. Dirty/composing/focused rows remain pinned during windowing. Use semantic headings, navigation, native buttons, radio groups and dialogs. Do not implement SVG as an interactive canvas or application-role region.

200% text resizing and320CSSpx reflow are different checks. Original body font preference remains effective; action rows wrap; status never covers a focused control. Respect reduced motion. Screen-reader, physical IME and device evidence remain separate from this design-render pass.

D7 must validate every applicable family in dark, wide, compact, long text, keyboard and failure states. A derivative not pictured independently must use these exact layout rules and the mapped master; it is not a license for a new design.
