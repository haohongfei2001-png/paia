# Original Organize sources-only worker wiring — independent review

2026-10-25. Read the current root checkout five-file wiring after exact integration of original Organize `64d158d`/`1644f5d` as `9a2772b`/`239041b`: worker coordinator, service-worker construction, synthetic worker bridge, existing sources fixture and new Organize worker tests. Reviewer did not run tests or modify runtime. **No runtime blocker identified for this sources-only composition.**

## Scope and ownership

The coordinator accepts the actual already-constructed bounded organizer from the original service worker. Only the sources scope appends its fixed original hold/current/release entry. The local-maintenance scope is unchanged. The fixed imported exports close over the original Organize module registries; passing a matching prototype/store lookalike cannot manufacture a valid child token. The structural source-current checks are preliminary identity checks; the actual hold/current path still performs private registry qualification for the exact bounded owner and its two children.

All original admissions are called in the existing synchronous map before the first aggregate await. The bounded original helper in turn holds its own and both original child admissions synchronously. Existing busy work is refused, not cancelled; later ordinary completion remains accurately tracked. The existing aggregate rollback releases only acquired tokens, observes already-started promises, and releases late successful tokens through their captured original owner. It cannot clear another holder's token. No task-set cleanup or replay is added.

The coordinator's original shared 30-second deadline still covers acquisition and every subsequent fence. Organize's synchronous current check is sufficient only for its default, idle, admission-closed owner profile; it supplies no asynchronous historical settlement or financial check. The aggregate deadline can expire before an individual owner's private deadline and still refuses the aggregate proof. Failure retains the original coordinator cleanup rules rather than extending a deadline.

The original worker establishes store/database identity before constructing the three Organize owners and passes the bounded instance without rebuilding it. The synthetic bridge exposes those already-created originals only in its copied worker fixture; production exports no test hook or new RPC. Existing generation selection configuration and hard gate are unchanged.

## Tests and evidence handling

The source fixture now constructs the same three strict-default owners instead of a fake status placeholder. New synthetic actual-worker cases cover all three held admissions including detached factory status, a queued genuine status task with direct bounded BUSY refusal and aggregate refusal/cleanup, plus preserved historical UNKNOWN rows with activation still unavailable.

Initial recorded **2/3** failure was an overly specific aggregate error expectation: the original aggregate can observe earlier owners' rollback as NOT_QUIET while direct bounded acquisition reports BUSY. The corrected test adds the exact direct-owner assertion and expects the existing aggregate behavior; runtime was not changed to match the test. This is not evidence that UNKNOWN rows are settled.

During review a trailing line comment accidentally swallowed `assert.equal(statusEnded,true)` after the aggregate rejection assertion. Root was notified to restore that assertion on a separate line before finalizing the combination. No test execution was performed by reviewer. Final root combination evidence will be appended separately rather than inferred from the candidate design.

This package is live admission plumbing, not cold host closure, financial settlement or permission to activate a whole-library switch. Global integration still needs complete original owner and durable-outcome proof.

## Final local evidence and assertion closure

Root's nine complete owning files recorded **99/99**, 8603.040583 ms, zero fail/cancel/skip/todo, in `organize-worker-combined.log`. That invocation used the saved test snapshot whose line comment swallowed the completion assertion. After review, root restored only `assert.equal(statusEnded,true)` on its own line and the queued-status targeted case recorded **1/1**, with zero fail/cancel/skip/todo, in `organize-worker-assert.log`. Both summaries and the corrected current source were read. These are separate results: the 99-case combination did not include the restored assertion. The initial 2/3 source/log and intermediate source/vector remain retained. Runtime did not change for this correction. No remaining review blocker.

Final reviewed SHA256:
- application-worker-coordination.js: `075960e0b33461099044bcddabad1e135fd7fb1e2d230f37449a587a992abd9d`
- service-worker.js: `bdf8b0e75db22febb734854aaa8b27e1f92e341d9ea84f880e819c175acf5a04`
- application-worker-sources.test.mjs: `655d2037d9b77da88e2044eff836dfdf8a789baf3d5235ab878b4d531bc77b87`
- harness/selection-admission-worker.mjs: `379dd38dd016fb6fac634b1d6eb3e1dd6aae3ce55a474f15719d3ee87bc8628c`
- application-worker-organize-hold.test.mjs: `e82da3c9384fbc2b986c5e302f974daea90b9f9ff43bdf3f3fb67b2f930af636`
