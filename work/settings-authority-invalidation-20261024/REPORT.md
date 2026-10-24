# Settings Assist external authority invalidation

Date: 2026-10-24 UTC. Bounded local cloud-development evidence only.

## Scope and identity

- Exact base: `d7604d8d1f7f22563734f0a5349493c8ffc55fab`.
- Base tree: `c03a7069f9fbd730d3ee4cdc093ac52e04e542f4`.
- Runtime lock: `extension/ui/settings-assist-state.js` and
  `extension/ui/settings-assist.js`, with no other runtime edits.
- New test: `extension/tests/settings-assist-authority-invalidation.test.mjs`.
- This report is the only other committed file. Raw evidence stays preserved
  in this worktree's same evidence directory, without replacing any failure.
- Node `v24.19.0`; existing dependencies only. Parent integration owns any
  coherent product-version increment, integration and release qualification.

## Reproduced gap

The original mounted storage listener for local
`promptAssistAutomaticPreferenceV2` and runtime listener for
`PAIA_PROMPT_ASSIST_CHANGED` both invoked ordinary `state.load()`. When idle
with acknowledged generation g1, that read did not invalidate editable g1.
During a deferred genuine STATUS request, both original switches remained
available and their trusted handlers could attempt a stale-generation write.

The backend generation CAS remained safe. This was a presentation/admission
gap, not an authorization bypass. No backend, storage schema, permission,
provider, shared data, Sync owner or default-off policy changes here.

Before either runtime edit, the first two mounted-listener regressions failed
0/2, exit 1, at the immediate disabled-switch assertion. Both original storage
and runtime listeners actually started a deferred production STATUS request.
The unmodified baseline state and mount SHA-256 values were respectively:

- `4ccde5074b556fac9d86c4777523ea65b2119c30fc38c8fa3bb7aea7e9d12548`
- `f0456ab223ca0addf3347bea30e472da5c581e7d65f54951e6a5fd94581b7bc0`

The exact first-RED test source is preserved separately as
`first-red.test.mjs`, SHA-256
`a0eb43c7c7ec332a58aff9c0cc3fe064c1397adaac81b7bee8158385dae44e27`.
The failure log `first-red.tap` has SHA-256
`b275d6e9b515612c1d702dcd55fec947c421407420d21414e64f0a99b3975509`.
This is a preserved failed run, not a pass or a native-browser result.

## Bounded repair

The original state owner now exposes `invalidate()` separately from plain
`load()`. An authority-change notice increments the existing epoch, marks a
read pending and immediately keeps the owner busy before any observer can
reenter a write. The original two mounted listeners use this entry point.
Busy notices coalesce; the existing read operation drains until the latest
pending authority settles. Obsolete success and failure reads are ignored.

The existing save finalizer retains ownership of its queued read drain.
A notice during a save cannot make its old ACK actionable. Failed or malformed
latest reads remain fail-closed; no configure request is replayed. The normal
refresh path remains supersedable by a newer acknowledged configure, preserving
the original stale-plain-load contract and its unchanged test.

Both original switches retain their identity, roles, labels, checked-value
semantics and `aria-busy` behavior. An already-open consent confirmation is
also disabled while the state is noneditable, and the existing status node
shows concise permission-check progress. Cancel and explicit subsequent
confirmation keep their original behavior; no new surface or automatic consent
is introduced. Draft text, selection and focus remain untouched.

## Exact final verification

Commands, from this isolated worktree root:

```sh
node --test extension/tests/settings-assist-state.test.mjs extension/tests/prompt-assist-presenter.test.mjs extension/tests/ai-assist-automatic-consent.test.mjs extension/tests/settings-next-state.test.mjs extension/tests/settings-assist-authority-invalidation.test.mjs
node --check extension/ui/settings-assist-state.js
node --check extension/ui/settings-assist.js
node --check extension/tests/settings-assist-authority-invalidation.test.mjs
python3 extension/scripts/check_package.py
```

- Focused expanded run: 36/36 pass, zero failure/cancel/skip/todo.
- Final related run: 53/53 pass, zero failure/cancel/skip/todo. This is the
  unchanged prior 34 related cases plus 19 new cases, not 53 disjoint cases on
  top of the focused run. All original queued-authority-save 17 cases remain.
- All three syntax checks pass.
- Source package audit: 24,719 guardrails across 683 runtime resources pass.
  This static check does not prove native or logged-in browser behavior.
- Scoped source/test/report whitespace check passes.
- Independent exact-byte review reports no blocking finding and 47/47 pass:
  original 17 plus these 19 plus reviewer-owned 11, all overlapping where
  stated. The reviewer's unchanged mounted reproduction moves from baseline
  0/4 to final 4/4. Runtime/test hashes matched before and after that run.
  Reviewer log SHA-256:
  `de9eca494844dc9e09bff1fc0042f46ff8085e636ad9057e74de46312bd30ed0`.

New cases cover both actual mounted event sources and both switches; pending
consent; denial/malformed read plus explicit recovery; concurrent/coalesced
notices; superseded read success and failure; earlier plain refresh success or
failure versus latest authority success or failure; plain-refresh/newer-ACK
compatibility; stale save ACK against newer revocation or denied authority;
synchronous observer reentry and further invalidation; unrelated-event
filtering; and unchanged synthetic human draft/focus/selection.

Final SHA-256:

- State: `317d4ccce00fd5c9c378fa826ad67006c7f953b3a43b5f0aeb225b22e564db18`.
- Mounted UI: `608cb002a536d273689b74bc7ed3403491423faedf80406f30d3a354b24733b2`.
- New tests: `e26a397e4cae6b7e8fb7f65f48de461ab1d24cd6dbba133b7296e02de3e226db`.
- Unchanged original 17-case file: `0a6b67f609f9cef965bc39b325061fe738b365dd334902b654f5ab0db0c02a2a`.
- `final-related.tap`: `5006be268d4331f89b405451eb6920364226d70d15bd07d88acde35f85ad13ef`.
- `source-check.log`: `0657613ed7a7f278ac6a4f78d2581a3b5504e936ac4fd8475c1470d05eb0c0ee`.

## Retained boundaries

The mounted tests use actual production owners/listeners with the existing
synthetic PresentationNode harness. They are not native DOM/layout, browser,
service, real-account or installed-user evidence. No native/browser, Full,
automatic C, 129-group, 100k, old-cloud, provider, paid, install, deployment,
remote write, local Codex or dependency-install operation was performed.
The two-file repair introduces no new data/permission, shared runtime writer,
Sync feature, CI/gate edit or whole-plan completion claim. Broader acceptance
and any final installed-delivery qualification remain separately open.
