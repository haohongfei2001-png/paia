# Stage 3A local reopen boundary — reviewed isolated repair

Base is preserved PR164 head `e23dfdd5329e17a7a37ad1a818f1feef8581b6bf`.
The current seven-lane owner authorization includes the existing approved Stage3A
scope. This does not authorize Stage3B, paid calls or new capsule design.

Deterministic tests construct a lawful offer through the actual command owner,
then hold its real surface idle seam. Revoking Stage3A authorization, replacing
the current reply, or revoking capture consent before idle resolves each caused
one stale REOPEN dispatch in the old implementation. All three negative cases
failed; the unchanged lawful case passed. Preserve prompt-reopen-before.log.

The fix reuses assertCurrent(group) once after the yielding idle probe, checking
current authorization, group identity, tab/document binding and live reply before
sending. No new stored reply, permission, transport or UI surface is introduced.
The coordinator independently reviewed the production diff and all four deferred
cases. Complete detector, lifecycle, security, Stage1/2 surface and new reopen
files pass137/137, zero skips/cancellations (prompt-reopen-after.log).

This proves worker dispatch refusal on those races, not an observed production
UI leak, real ChatGPT qualification or complete Stage3A acceptance. PR164 has six
known main integration conflicts and failed/cancelled full evidence; this branch
preserves its work but is not yet reconciled or merged. Source/release browser
and final integration evidence must bind the future combined head.
