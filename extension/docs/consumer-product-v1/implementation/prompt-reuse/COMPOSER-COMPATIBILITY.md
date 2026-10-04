# Prompt Reuse — bounded ChatGPT composer compatibility

Base: `d76ff0147fcb668c3380f5769de11b5c44b9520f` (remote main).
Owner-authorized defect correction, 2026-10-05. Visual acceptance remains PASS.

## Cause and current-site evidence

The old finder required an ID and ProseMirror class together. Surface and insertion
both used that finder; an id-less current composer therefore hid the orb. Capture
pause is not the authorization gate: existing consent is sufficient.
This explains the reported symptom and is reproduced synthetically; it is not a
claim that this environment inspected the owner's authenticated DOM.

Primary implementation evidence consulted:
- [Rosetta current composer note](https://github.com/SyntaxSmith/rosetta/blob/ee490afbd635ca447688a2d4a63ce081f0229903/README.md): 2026-09-30 id-less editor in `form[data-chatgpt-composer]`.
- [ChatGPT Web session implementation](https://github.com/miuuyy/codex-chatgpt-web/blob/b6ca2d3f91f8a2ba140b522fe3b3c50b4ebffa2d/src/chatgpt-session.ts): scoped markdown textbox signature.
- [Maintainer selector configuration](https://gist.github.com/machinefriendly/97784f9a2673cc90f48843e122d871cd): scoped ProseMirror form signature.

The public site read exposed anonymous login UI; direct current-site HTTP access
returned 403. No authenticated profile or login credentials were available.
`REAL_CHATGPT_FINAL_CERTIFICATION = DEFERRED_EXTERNAL_EVIDENCE`.

## Bounded repair

Retain `#prompt-textarea.ProseMirror[contenteditable="true"]` and add:
- `form[data-chatgpt-composer] .ProseMirror[contenteditable="true"]`
- `form[data-chatgpt-composer] [data-composer-markdown][contenteditable="true"][role="textbox"]`

Only exact ChatGPT origin, connected/editable/rendered candidates qualify.
Message/turn/article ancestors, hidden/inert/disabled/readonly nodes and invisible
ancestors are excluded. Candidate and ancestor counts are bounded. More than one
qualifying node fails closed. No arbitrary contenteditable or lexical fallback.
Surface and insertion share the same adapter; draft/selection/IME/read-back and
one-shot insertion code are unchanged. No send or provider calls are added.

Popup's folded low-frequency Prompt Reuse diagnostics area queries only while expanded,
at most once per refresh interval (plus explicit opening). The exact popup sender
is authorized; only current active ChatGPT tab, consent and enum status cross the
boundary. No draft, message, DOM, URL persistence or new schema/permission.

## Verification

Source/release compatibility browser cases, legacy/current ProseMirror insertion
matrix, independent native markdown textbox, existing Surface lifecycle/layout,
owning security tests and standard CI checks are required before merge.
Results and CI links are recorded after execution; pending is not PASS.

No Visual Master, Prompt Family, ranking, Backup, Stage 3, second provider, B-04
or D7 change. Real-site evidence remains deferred separately from synthetic tests.

## Recorded iterations

- Initial head `cd1e9e0628a01be645e8698b533ea09e17b5ba16`: new current-form,
  native markdown, ambiguity/visibility and paused-capture cases passed for source
  and release. Popup source passed, release failed because packaging removes the
  old internal-tools area. Fixed by retaining a separate folded user diagnostic
  in both products; refresh/listener stay present in packaged JavaScript.
- Initial visual workflow failed on an empty `PAIA_VISUAL_STATES` environment
  variable. Capture now treats empty as all eight, as documented; no target or
  runtime material/style change.
- New browser suite exposed the explicit frozen partition inventory. It is now
  registered in Prompt Reuse's existing shard; all previous file placements and
  strict inventory assertions are retained.
- Runtime head `fb4bba92ee0dbf073f3f0a9d30494560285cb218` passed the browser step in
  [Foundation run](https://github.com/haohongfei2001-png/paia/actions/runs/37232814191)
  and [all-eight visual evidence](https://github.com/haohongfei2001-png/paia/actions/runs/37232814212).
  Final aggregate verification follows the partition registration fix.
- Local headless Chrome CDP could not start. One stale generated release contained
  duplicate generated files; rebuilding the disposable output restored clean
  package validation. Source files were unaffected. Cloud clean-checkout browser
  runs supply the runtime evidence. No external visible browser was used.
