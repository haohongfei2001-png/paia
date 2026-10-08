# Section candidate: compact title selection and Content regression

Local evidence only, against the combined candidate after c460ebd3 plus the
independently reviewed normal-pagination live-anchor correction. This is not
hosted CI, installed-version certification or whole TOPIC completion.

The hosted shard5 failure kept the correct title selection but placed its first
character at y6–75 behind the compact navigation rail (bottom59). The old header
measurement was already above the viewport. Topic presentation now measures the
actual sticky rail and scrolls an active, connected title's native range below
it. It never replaces Selection or editable nodes, applies only below768px, and
removes its listener/cancels its pending frame on disposal. Header tests retain
all original hit/selection/budget assertions and additionally check the compact
rail boundary. No fixed59px offset or test-only corrective scroll was added.

Related complete presentation unit files:32/32 PASS. Initial23 fixture failures
were missing standard document event methods; the fixture gained those methods,
with no weakened assertions. Logs `/tmp/section-title-selection-unit.log` and
`/tmp/section-title-selection-unit-fixed.log` preserve both runs.

The first two complete Content runs passed3/4 each but failed release body
visibility before header interaction, at1280/light and390/light. Logs remain:
`extension/work/section-title-selection-native.log` and
`extension/work/section-content-combined-native.log`.

Bounded, read-only Content trace confirmed the165-reference fixture is reset to40
by qualified Section arrival. Subsequent previous-page loads grew80/120/150 while
layout measurement continued. The late render replayed pre-await anchors across
new scrolling and resizing. The diagnostic forwards original calls unchanged;
it neither waits, skips nor supplies oracle values. Its isolated release pass
was diagnostic only, not a fix claim. A command path error also left an earlier
untraced diagnostic run; it is not used as repair evidence.

After the separately reviewed live-anchor production correction, the unchanged
complete Content owner passed all4 cases (D2 and D5 source/release),67.1s,
zero failed/skipped/cancelled. Each release used a unique temporary builder
output. Log: `extension/work/section-content-liveanchor-native.log`.
The four runtime/test SHA-256 values were identical before and after this run:

| File under extension | SHA-256 |
|---|---|
| ui/topic-workspace.js | f632236583bfda3d6a3879399c762b367c38448f2aa3ec682573bad4fe333604 |
| ui/topic-workspace-presentation.js | d9e0ff623078bbb0cb564ea1ed05f89d6660b1a931913e415c6a4e5edf9d0923 |
| tests/cpv1-02-dvn-topic-content-chrome-e2e.test.mjs | 2a49f75c34ff68150cf159d82fc53ef7690c520ce67e670b4cdffec185c2386b |
| tests/harness/d5-topic-header.mjs | cb78afe88bf742d3cec31cf05b559c447759896de8722442fd904d9f0e6bec29 |

No CI, timeout, permission, provider or storage change is included in this batch.
Hosted Linux evidence remains required for the new candidate; local native
source/release success does not retroactively turn earlier failures into passes.
