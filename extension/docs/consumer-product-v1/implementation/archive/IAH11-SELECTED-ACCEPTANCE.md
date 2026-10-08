# IAH-1.1 selected visual/accessibility evidence

Scope: PLAN P6, selected UX U3–U8, existing shell/Reader preservation. This is a
bounded local acceptance slice, not the old D7 full matrix or full IAH closure.
Runtime base0578b798f235e3250cd177e5d665b35588e75d89 remains unchanged. The only
new implementation artifact is tests/iah11-selected-acceptance-chrome-e2e.test.mjs.
No CI, permissions, version, runtime, model or account change is included.

## Exact baseline and production paths

The test extracts exact mainc168b13170d762b4774740ce218613a45e31cde4 into an isolated
temporary directory, then runs that baseline source, current candidate source,
and freshly built candidate release against the same synthetic Conversation,
long title, timestamp,100-paragraph Input and preferences. The actual sidebar,
Archive column/header, Reader page/body/prose geometry compare within2px, with
exact font/color/background/padding/line-height equality. Stable neutral Archive
has blank unselected Main. Actual neutral/Reader screenshots show the intended
placeholder and Back-copy differences without changing the primary rail or
Reader typography. Source/release do not substitute a prototype screenshot.

Additional candidate journeys establish filled-query accessible scope names,
independent Reader Find, exact deep CSS Range arrival, normal-flow Back (no fixed
or sticky ancestor), native Enter activation/return and original-result focus.
At1440dark,320light and320dark/text200 they assert no root horizontal overflow,
actual coarse media,44×44-or-larger result/Back targets, reduced-motion media and
continued keyboard return. Text enlargement follows the existing D7 stress
method: actual font size and numerical line-height doubled on affected controls,
result content and current Reader prose/title, not browser page zoom. The result
font is checked14→28px; Reader computed sizes are checked against originals.
The long title grows vertically without introducing horizontal scroll.

## Final run and byte binding

Command (from extension):
`PAIA_HEADLESS=1 PLAYWRIGHT_MODULE=<existing matching Playwright1.63 module> node --test tests/iah11-selected-acceptance-chrome-e2e.test.mjs`

Complete file:3/3 PASS,0 failed/skipped/cancelled,26883.231209ms. Baseline7543ms,
source9010ms,release9102ms. Builder passes11630 package guardrails across344
runtime resources and release guard368files. Chrome154.0.8037.98; explicit
Playwright1.63.0. Source/release assert zero external/provider requests/errors.

Local artifacts:
- ROOT/work/iah-selected-p6-final.log
- extension/work/iah11-selected/2026-10-08T09-08-15.568Z/evidence.json
- same directory/binding.json and19 image files

The evidence manifest binds exact HEAD, baseline SHA,407 runtime/test/harness/
package file SHA256 values before/after (all equal), dependency path/version and
all19 PNG digests. binding.json binds the final log, manifest and installed Chrome
version. Manifest SHA256:d6a039df8cfcc3be625228db26567ff9f119dc44f1bf4944e383cec8b9007b91.
Log SHA256:33c62ae72124b934e0869080d67efce455b93225aa2d1e4419d7a1a129e36205.
Images and synthetic artifact bodies remain local; they are not public fixtures.

Query timings on this one-Input fixture: baseline215.8ms,source218.9ms,
release214.5ms. Source/release deep arrival114.2/114.4ms and return115.4/115.3ms.
These are observed timings, not statistical improvements or large-corpus resource
certification. Existing bounded scale/identity/IME/safety owners remain separate.

## Preserved diagnosis and limitations

All exploratory failures remain under ROOT/work:
- iah-selected-first.log: fixture incorrectly equated accurate longer Reader
  accessible name with its shorter visible placeholder; now each is exact.
- iah-selected-second.log and iah-selected-aggregate-before.log: Back was36px
  after arrival; the earlier coarse condition had reverted to fine by the actual
  Reader measurement. Initial classification as a product defect was incorrect.
- iah-selected-fixed.log: added font-only Reader stress did not override existing
  important prose rule; corrected fixture checks real doubled computed size.
- iah-selected-final.log and iah-selected-native-context-final.log: retained
  diagnosis before qualifying coarse media at each actual measurement point.
- iah-back-probe.log: short diagnostic did not establish capture prerequisites.
- iah-back-probe-settled.log / iah-back-after-screenshot.log show coarse=true and
  existing44px Back. iah-back-search-enter.log proves coarse=false/36px after
  the actual Search→Enter path. No product fix was justified: all provisional
  reader.css edits were reverted exactly to HEAD.
- iah-selected-qualified-final.log:3PASS intermediate text stress. Final run uses
  established D7 font-plus-leading convention and awaits stable tree first.

Coarse mode is real browser CDP emulation, re-established and asserted at the
actual measurement, not a synthetic UI event or claim of physical touch-device
certification. Reduced-motion media and resulting journey pass, not a new
animation-duration/perceptual audit. Images reviewed include neutral baseline/
source/release, baseline/release Reader and enlarged dark result/Reader states;
no measured contrast-ratio claim or universal accessibility certification is made.
Independent review, new-file CI admission, exact-current-main integration and
installed user availability remain pending. This slice does not close all P6
resource, external or programme-level gates.
