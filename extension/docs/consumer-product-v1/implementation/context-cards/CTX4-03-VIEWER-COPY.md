# CTX4-03 explicit single human-text copy

The approved My Inputs local verification flow includes copying a single original human item (AI_CONTEXT_CARDS_V2_PLAN_PRE_REFINEMENT_2026-10-13.md section1.4, inherited by the current plan). Each item now exposes an explicit copy action. Every click reuses ContinuousTopicReader.expandEntry to read the complete current body and requalify its Section reference, revision, placement, epoch and authority. Mounted prefixes and placeholders are never clipboard sources. The original copyReadingText helper uses fallback:false; clipboard refusal reports failure without creating a stale text dialog. No permission, history, body or persistent cache is written.

Owner close handles both request-close and native close. Back, invalidation, hidden document and closed generation discard late reads before clipboard submission; controls prevent duplicate actions. This does not claim cancellation of an already-submitted OS clipboard operation.

Frozen production4038fae0d5c3ceba11a9b7f41a0c3c7599e23d1e/testbd7c6fca0b190416c5d7ee0f0d28ba8d9a2c55ad. Author91 and independent77 related tests pass. Exact Source and original standard release headless Chrome pass private61st item exact Unicode/newline copy, native-close/reopen, held real Entry response followed by browser Back with no second copy, and unchanged AI choices. Zero external network/errors. Synthetic clipboard verifies payload, not user OS authorization.501-file release guard passes. Evidence work/reviews/PR284-CONTEXT-VIEWER-COPY; initial pagination-label assertion failures retained and corrected to inspect original prose without button labels.

Candidate only: full exact-head/main and latest design gates remain separate; not installed or whole-plan complete.
