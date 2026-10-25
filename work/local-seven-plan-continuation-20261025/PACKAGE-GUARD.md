# Capture packaging follow-up

Original local build on ca04053 failed: 1 guardrail violation / 24757 checks, because the existing narrowly allowed direct scripting call changed to an exact captured original API reference. Full output and unpublished stage remain retained; no installation occurred.

The package checker now verifies exactly one captured-object declaration, method declaration and identity checks, exactly one availability check and exactly three original pinned invocation prefixes. After removing only these known sites and the original permission event, any residual execute/scripting identifier is rejected. No other source file receives an exemption. Independent review caught an initial residual-alias loophole; its source and initial 10-control test are preserved. Final owner test passes 1/1 with 13 positive/negative checks, including direct extra calls, call/apply aliases, alternate API identity and unrelated-file refusal. Runtime permissions and capture targeting are unchanged.

This closes the specific packaging compatibility issue. The next build result is separately recorded, never inferred from this unit test.
