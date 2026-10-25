# Local invocation identity

Existing runtime used (no download/install):
`/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`

Working directory: `/Users/hhf/Documents/GitHub/paia/work/final-development-takeover-20261025/warm-reverse-durable`.

- Retained original positive calls: absolute Node `--test --test-name-pattern='same live selected owner' extension/tests/application-selection-reverse-durable.test.mjs`; each log distinct. See report; do not replay.
- New refusal control: absolute Node `--test --test-name-pattern='known remaining CAS budget' extension/tests/application-selection-reverse-durable.test.mjs`.
- Final fixed-key controls: absolute Node `--test --test-name-pattern='terminal return metadata' extension/tests/application-selection-reverse-durable.test.mjs`.
- Fresh forward-only size calibration: absolute Node `work/warm-reverse-durable-20261025/measure-forward-cut.mjs`.
- Final parse only: absolute Node `--check` once per four vector files; results in syntax-check.json.

The actual counter diagnostic temporarily changes only finishOriginalRecoveryWork to print cumulative references/bytes/failed. The IDB source before/during is preserved. It was restored in finally; no counter logger remains in final runtime. No complete final successful test invocation is claimed.
