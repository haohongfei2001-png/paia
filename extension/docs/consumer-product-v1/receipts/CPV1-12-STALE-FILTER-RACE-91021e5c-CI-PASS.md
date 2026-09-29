# CPV1-12 stale evidence and destination race candidate receipt

- Repository: `haohongfei2001-png/paia`; sole product Draft [#99](https://github.com/haohongfei2001-png/paia/pull/99).
- Exact tested head: `91021e5c84ead37358d29a53dfd7c2fec925626d`.
- Remote main at verification: `9cd74665a46fcf0bb77865afaf2aaf3b2cad2c40`.
- [Candidate Gate 36596198532](https://github.com/haohongfei2001-png/paia/actions/runs/36596198532): completed SUCCESS on this exact SHA.
- Unit smoke: 1330 pass, 0 fail, 0 skipped. The nine `cpv1-12-ai-write-review.test.mjs` cases passed.
- Affected hosted Chrome: 17 pass, 0 fail, 0 skipped; these are existing journeys, not a dedicated CPV1-12 UI acceptance run.
- Contracts/privacy, release product guard (273 files), and aggregate gate: SUCCESS.
- Hosted Mac diagnostic, VS-04 scale probe, full Certification, live provider and device/security acceptance were skipped or not run.

This follow-up checks filtered Input evidence at stage and again before commit. The existing native Thought placement command accepts an optional expected Topic metadata revision and compares it inside its write transaction; the AI review path passes that revision. Existing command callers remain valid. A regression renames the destination Topic between the last review read and native placement and requires a stale rejection with no placement. The earlier [typed-review candidate receipt](CPV1-12-TYPED-REVIEW-CANDIDATE-aa00fcc8.md) remains immutable.

Status: `ENGINEERING_CANDIDATE / DEFAULT_OFF / NOT_ACTIVATED / NOT_CERTIFIED`. There is no external AI storage access, new Context/Passport grant, reply read, unreviewed AI write, automatic send or permanent delete. CPV1-12.3 remains deferred under B-04. Real trusted human UI/provider/security/live evidence and merge remain open.
