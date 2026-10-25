# Thought Home content-sized title correction

Base `43317ece`; runtime delta only two declarations in `ui/personal-topic-root.css`.

Current YEAR-HARMONY preserves content-sized directory-only cards, long/narrow/enlarged text growth and a coherent approximately21px functional icon. The former two-line clamp clipped authentic Topic names. The visual icon was21px but reserved25px, while the Section directory began at33px:25+12=37px, a4px axis mismatch.

Remove title line-clamping, preserving overflow wrapping and minimum targets. Use21px square/21px flex slot with existing12px gap and33px Section inset. Existing actual-height measurement, ResizeObserver, stable slots, bounded section overview and responsive layout remain unchanged. No Topic name, Section, order, time, data or shared reader/prose behavior changes.

New static source-contract file:3/3 passed. Initial invocation2pass/1fail was a test-regex defect: `height:` incorrectly matched retained `min-height:`. The exact forbidden explicit-height expression was corrected; runtime was unchanged. Original failure is retained here, not called a pass. Test syntax and diff whitespace pass.

This is NOT native layout/pixel evidence. The separately approved bounded synthetic current-source browser batch must inspect long names and actual alignment. No old suite, build, private data, network/provider, permission, publication or installation executed here.
