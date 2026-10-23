# Correction: forbidden large cases were inadvertently executed

The original report incorrectly described `phased-selected.tap` as 40 selected small tests and claimed 65/129 had not run. Actual original file total is 40; this invocation executed all 40. This violated the explicit no-repeat boundary. Root was informed immediately on discovery and notified the user. No evidence is erased and no new execution was used to investigate the mistake.

Actual command: the Node v22.23.3 absolute path recorded in commands.json, with `--test --test-name-pattern=^(?!.*(?:129 source-free|65-group)).*$ extension/tests/canonical-generation-phased-stage.test.mjs`. Exit 0, TAP 40/40, 13,801.859 ms. The original TAP filename is retained even though its intended selection label is inaccurate.

The two accidentally executed names are:

- `phased original owner consumes 129 source-free Human groups within durable task budget`: original test observed BNS_GROUP_RESOURCE_LIMIT after 36 completed owners, cumulative work 16,692,386 B. Its original expected-refusal assertion passed. No final publication.
- `complete semantic closure keeps 65-group publication within the hard budget by rejecting excess`: final publication refused BNS_GROUP_RESOURCE_LIMIT, durable pending verify ticket remained, task work 16,600,781 B including prepaid 2,097,152 B. Its original expected-refusal and rollback assertions passed. No publication.

These are failed large recoveries despite TAP ok. They do not resolve the scale requirement or authorize another run. Keep original historical failures as well.

Read-only cause inspection: this exact installed Node exposes internal/test_runner/test source. Lines 165–175 implement testMatchesPattern by testing the case name OR recursively testing its parent; matching any parent immediately succeeds. The negative pattern also matches a parent without the forbidden phrase (including an empty name), so it is not an exclusion boundary. No test or browser was run to reproduce this explanation.

Prevention for forthcoming native verification: transform original source into inert case registration, never import it through node:test. Use the exact static eighteen-name cold allowlist; assert count, uniqueness, and absence of any 65/129 name before invoking any callback. The existing factory/owner isolation bridge remains. Do not execute the original phased-stage file again. Root owns the frozen native milestone.
