# SET2: History import dialog locale

Base: `2aca3d24d5f02f683f67c0a1cc7570cc47b0b586`. Local bounded follow-up, not a full SET2 or hosted release certification.

## Behavior and boundary

The existing resolved document language and `paia:preferences-applied` event now translate explicit product-copy leaves in the history import dialog: consent, actions, phase/error/status text, preview count labels, progress, task controls and static explanatory copy. The event updates marked text/ARIA only, without invoking the import controller, rebuilding the preview, issuing RPCs, changing file consent, or replacing controls. The coordinator, task/session ownership, preview/commit flow, security, storage, permission and provider contracts are unchanged. User bodies and filenames are not translation inputs. Existing truthful limitations on real official-export verification remain visible in both languages.

## Evidence

- Actual owner negative: `/tmp/settings-history-locale-before.log` — English open rendered the old Chinese idle status. Preserved failure.
- New owner file: four cases for English open, real resume-task controls with bidirectional switching, actual task-read failure switching without retry, and phase/partial-format/error/progress copy. Resume keeps the task controls, preview nodes, consent, file object/name, focus and diagnostic values; language events add zero RPCs.
- Final six complete related unit files: `node --test tests/settings-history-locale.test.mjs tests/import-coordinator.test.mjs tests/history-contract.test.mjs tests/history-privacy-v090.test.mjs tests/settings-consumer-local.test.mjs tests/claude-import-round5a.test.mjs`, **46/46 PASS**, 311.703 ms, `/tmp/settings-history-locale-related-fixed.log`.
- Earlier related run preserved in `/tmp/settings-history-locale-related-final.log`: old latest-summary synthetic node omitted the now-used standard `querySelectorAll` interface. Only the fixture gained `querySelectorAll:()=>[]`; original failure containment, language and RPC assertions remain unchanged. Production does not silently ignore malformed DOM.
- Original complete `tests/uir-04-data-chrome-e2e.test.mjs`: **1/1 PASS**, 35.503 s, `/tmp/settings-history-locale-native.log`. This one original top-level test includes source, empty-profile restore, and fresh isolated release journeys. Both source and release now exercise actual ready → pause → same-file reselection → partial import and bidirectional zh/en copy, preserving element/count identity, diagnostic and disabled state, file input/consent/focus, zero language-event RPCs, and all existing durable recovery/CAS/privacy assertions. Original 300 s budget is unchanged. Headless Chrome via explicit Playwright 1.63.0; synthetic local data only. Browser input is cleared by the original file handler; the native test claims preservation of that input state, while successful same-file resume and owner tests cover session continuity. No actual official account/export compatibility claim.
- Package closure: **12586 checks / 379 runtime resources PASS**, `/tmp/settings-history-locale-package.log`, including the new local module. Initial static scanner mistook four quoted English strings ending in the word import for import declarations; those values use template literals, without changing the guard or copy.
- Root independent review: approved explicit product leaves, retained consent input/control identity, no repaint/RPC on language events; independently ran the two full owner files **17/17 PASS**, 99.639 ms, `/tmp/settings-history-locale-root-review.log`.

The native runtime/test bytes below were unchanged after that run. The only subsequent executable change was the old unit fixture interface above, followed by all six complete unit files. No duplicate browser run was performed. No CI, version, schema, shared Settings writer or unrelated navigation was changed. The separate hosted Data cancel-ACK fixture fix is outside this batch and must be integrated by hunk, preserving both sets of assertions.

## Reviewed bytes

- `ui/history-copy.js`: `c6794ddcc2aeea99f096e4f2ef34f9348064ffb168fe3331b0e9859a0c343864`
- `ui/history-completion.js`: `33d797f9bed2afe577894e3e97dd1805f2587044023af166631ca14e320caad7`
- `ui/archive.html`: `4fa1797e87ba45f9e8c35d75e6b3fc52973aee48d902ea3d9d93e67d4266b2e4`
- `tests/settings-history-locale.test.mjs`: `62046c8d87010c9b33a404d55630b1f354f61c961f90e9d9386ddda9df46a219`
- `tests/settings-consumer-local.test.mjs`: `7fa3cc00923a2ae558cdeb9ffe063b29b733d2a02f9ccc74b9dffd691a66624e`
- `tests/uir-04-data-chrome-e2e.test.mjs`: `745ed98676a0ffc15b9d323d47ed82fc404b479238f45ca54e02ae1694fb4a5b`
