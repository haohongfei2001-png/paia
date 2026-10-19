# Settings locale fixture and original Assist owner

PR302 Full39175581389 Unit3 actually failed the Settings locale/reopen test at its extracted `syncSettingsLocale` call: its VM context omitted the existing `promptAssist` lexical variable. The actual Settings source declares that variable with the other owners and calls its optional `sync()` during locale/reopen. This is an incomplete isolated-function fixture, not an undefined production variable.

The exact3010918 source test (Git blob f66854e1b731d2cb41247d80a4d4d973d16194d2) was materialized unchanged and reproduced **17 passed / 1 failed** locally. `/tmp/paia-settings-consumer-assist-vm-red.tap` SHA256 is `36b03d73f880be8eac15cff592ebf861a0096efd956ab553ba24a494d4a42bf2`.

The minimal test-only correction provides the real owner name in the extracted function's VM context and adds an exact assertion that its `sync` is called twice for the two existing production-function invocations, in each of the three locale transitions. All original History-owned text/write checks, draft/focus preservation and zero-RPC assertions remain. No runtime, oracle removal, skip or timeout changed.

The complete original file then passed **18/18, 0 failed/cancelled/skipped, 426.984355 ms**. `/tmp/paia-settings-consumer-assist-vm-green.tap` SHA256 is `c909f88174f0dd90cb86cf9ec5bc09bb8ca5e9ba300859a612ff9dacec889b4b`; the test SHA256 is `5623d4d8d6b6b3b54f3a22c544a1faafdb1c7ca487eba66d26b03f0992a6fe89`. The Settings runtime hash was checked unchanged before/after. The failed Full identity remains failed; this local result does not replace a changed-head Full run or resolve its other failing tests.
