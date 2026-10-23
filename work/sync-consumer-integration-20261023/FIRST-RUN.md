# First combined local consumer invocation

Frozen head: `548a91f7c38b2891f7cc6a2b8bd5c7636315e72c`. Node 22.23.3, Python 3.12.14, Playwright 1.63.0, Chrome 156.0.8078.47, macOS arm64. All tracked core/background/ui/test bytes are unchanged before/after the invocation.

- Eighteen complete owning Node files: **315/315**, exit 0, TAP 39848.808334 ms.
- One original development build: **682 files**, 23568 package guardrails / 658 runtime resources, version 0.55.9 Development. It is not installed or deployed.
- Three paired native packages: **4/6**, exit 1, TAP 119956.41875 ms. Working/permanent-negative recovery executes 18 original cases per Source/Release variant; manual Prompt conflict executes 23 original cases per variant. All four parents pass with native IndexedDB and zero external HTTP.
- Both Settings/lifecycle parents fail at the first Settings navigation click because the prepared test's sidebar target is hidden. Those failures precede its unknown-outcome/pause/cold-restart and Prompt DOM assertions. They do not pass by association with the other four parents or the Node checks. The owning preparation is being reconciled against the existing responsive navigation and Settings group owner; no production guard is weakened.

The full failed log and all six per-variant receipts are retained. Any later test-only correction and affected paired execution will have a separate identity and receipt; this invocation will never be reported as 6/6.

No checkpoint producer under review, successful remote transfer, whole-archive Sync, real account, scale/capacity, Full, main/PR313 update or installation is certified here. The consumed 129-group overall FAIL remains unchanged.
