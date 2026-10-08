# 0.26 saved AI disclosure consumer compatibility

Base: b425105d. Test-only correction for the approved durable Section reader with saved AI fields under a default-closed details disclosure. No runtime, CI, product version, timeout, privacy assertion or case was changed.

The unmodified original UX-R5 ON-01 first case failed after 30 seconds waiting for currentView. Playwright recorded the exact same existing field as hidden 64 times: `/tmp/ai-disclosure-before.log`. This was a targeted negative only, not a complete-file pass. The default-closed disclosure is intentional product behavior.

`consumer-ai-browser` still reexports the unmodified actual `ai-reviewed-browser.setAIView` (real switch click and settled-state wait). A separate explicit `openSavedAI` clicks the actual summary and asserts open. It is used by `editSaved` and only consumers that need visible fields. Normal view switching and UIR03 default-collapsed/keyboard assertions are unaffected.

All six other consumers were audited:

- ux-r5-ai-organize and ux-r5-certification: open the disclosure before direct field visibility/edit access.
- uir-03-preview-mask: open the disclosure; use the exact Entry ID captured from the opened Original to locate the same shared Section body under AI. The retired duplicate evolution-excerpt is no longer a production body owner. All original visibility, text, masked previews and accessible-attribute privacy assertions remain.
- ux-r5-ai-update: its existing editSaved call gets the explicit disclosure. Candidate itself remains outside it; no file change needed.
- uir-03-ai-candidate: editSaved gets the disclosure; existing list-edit case already opens real details. Original candidate/evidence/read-only cases remain unchanged.
- cpv1-05-dvn-organize: only candidate visibility and actual RPC acknowledgement, no direct hidden field edit; unchanged.

The six complete original files ran serially: **18/18 PASS**, 46.593435708 seconds, no skipped or cancelled cases, `/tmp/ai-disclosure-six-native.log`. This includes their existing source/release loops where present, real Source purge, IME, stale CAS, same-operation acknowledgement, unknown/retired provider refusal and no-network assertions. It is not a newly invented full source/release matrix for source-only cases. No unrelated UI or full CI was rerun.

Independent settings_review reviewed all four changed files and the actual negative; no blocking findings. The coordinator owns the final repaired 0.26 head and complete CI; this is not certification of the earlier failing b425 head.

## Tested fixture bytes

- `tests/harness/consumer-ai-browser.mjs`: `44969dc6ce4be4c8dca24b9f85643d8c3079346c1fba53230a2b073507e61774`

- `tests/uir-03-preview-mask-chrome-e2e.test.mjs`: `6520ec043d954d4d54948a33220b89e8ad1dcfe839c694f1c093d754b5fe30a0`

- `tests/ux-r5-ai-organize-chrome-e2e.test.mjs`: `6c66abe441bf040135aa9ac83c7f5021219da4a5abe19aaa9aaf28a19d503f25`

- `tests/ux-r5-certification-chrome-e2e.test.mjs`: `41377da5a18f7e4e24b963c3011ce922045d3ffc910ac8eb3df4e02c5636c921`
