# Factory detached-call admission followup

Base: 64d158d627c7591ef3bc174054529ff546d131ba. Independent source review found that factory wrappers used their dynamic `this` to locate the private owner. Configured methods are closures: detached calls, a foreign `.call` receiver, or a spread copy still invoke the original maintenance but previously bypassed admission and pending tracking. Class methods are not factory closures and retain their original receiver semantics.

The narrow fix binds only instrumentObject wrappers to their original factory target for private records lookup; Reflect.apply still passes the caller receiver to the original method. It preserves valid detached invocation while applying the same original owner's admission and pending accounting. No public DTO, permission, budget, global gate, original provider behavior, or durable outcome is changed.

Four new controls on the original runtime failed 0/4 (exit 1, 309.813875ms); detached-before.log retains actual failures. Three held invocation forms each check original status and wake; the fourth holds original maintenance unresolved and verifies detached status is accounted until actual settlement. Both original runtime source and complete added tests are recoverable from the parent plus this commit's test diff.

After repair, the complete owning test file passed 24/24 (exit 0, 611.25825ms; no cancellation/skip/todo). This is a separate followup run; the earlier 35/36 owning batch and its incorrect expectation failure remain preserved. No native/browser, provider/network, large-scale run, install, CI, cloud, or push.

Exact commands, from this worktree, using existing Node 22.23.3:

```
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test --test-name-pattern='factory private owner binding' extension/tests/organize-application-selection-hold.test.mjs
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test extension/tests/organize-application-selection-hold.test.mjs
```

The factory followup does not certify historical UNKNOWN or configured provider settlement. Existing default-only, warm, idle-only limits remain.
