# Sync native milestone entry — prepared, not executed

Parent integrated da37 as 1d23560e. This successor adds only the native driver, not another production change. Dependency: parent already owns `tests/harness/manual-prompt-conflict-pane-native.mjs` and the actual Prompt view; they are not copied or rewritten on this lane.

Entry: `extension/tests/native-sync/sync-local-lifecycle-chrome.test.mjs`.

Two cases: Source and Release actual Settings→original worker→original same-store journals→bounded synthetic request refusal→retained unknown task→explicit pause→cold worker preservation. Each case then runs the existing bounded Prompt conflict pane helper in the same Archive page. Prompt receipt distinguishes controlled composition from physical IME and excludes full visual qualification.

An absolute existing `PAIA_NATIVE_RELEASE_PATH` is mandatory before either case can launch. No build fallback, new launch flags or alternate launcher exists. Uses original headless FakeChatGPT and instrumentedExtension, original network isolation and static synthetic source configuration. Exact current source/loaded runtime hashes are bound, including original release omissions (worker FILTER_DIAGNOSTICS branch and three diagnostic UI modules). The driver checks tracked source before/after and writes `extension/work/qa-sync-local-lifecycle/source.json` and `release.json`, including failure evidence.

Only `node --check` was performed. Browser, build and actual driver cases are **NOT_RUN**. Parent may run this entry in its authorized combined native milestone after integrating the checkpoint producer consumer and one final release build. The current helper deliberately refuses transport before HTTP; it proves no successful upload, no newly generated recovery point and no entire Sync closure. Root must retain those distinctions if expanding the helper after the producer API freezes. No cloud, credentials, real account, large seed or scale restore.
