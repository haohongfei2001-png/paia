# D7 — Archive and Reader whole-page appearance

Status: IMPLEMENTING. Runtime base: `4cba58db72ef14f756676d0048cbd0709c6df2c9`.

The owner asked to continue with high fidelity to the approved D6.2 drawings after the bounded D5 appearance merge. This batch implements the existing Archive root and Reader as complete pages: primary rail, navigator, title/subtitle, search, sorting/overflow, reading column, compact navigation and their existing local statuses. No new content store, data semantics, permission, provider or feature workflow is introduced.

Authority: actual A01/A02 full-window SVG masters and the corrected A02-320 in `desktop-vnext/d6-final-visual-master/`. The base image archive SHA256 is `ee090564d016edec90b20d95b8437448a57d0e3cc61301728212e526ae90ca59`; correction SHA256 is `ea777e562da5e173fc941d216aa20620087cc0ccce5283719350aa5e2b98b6b7`. The initial reference review used the stored SVGs rendered with installed Noto CJK fonts; hosted comparison uses the same fixed assets in Chromium, never a replacement runtime mockup.

## Implementation boundaries

- Keep the title inside the existing DocumentEditor root. Relocate the same search, Back, sort, menu and status nodes; preserve handlers, focus, query and route owners. Compact navigation reuses the same destination buttons.
- Replace Archive-scoped geometry and palette. Preserve other adopted D5 surfaces and non-Archive Reader geometry.
- Retain saved reading preferences. The current normalized default is indistinguishable from an explicitly selected standard value, so17px/680px remains truthful where present; do not silently migrate it to the drawing's16px/800px. Record the actual preference and canonical reference separately.
- Project descriptions and navigator dates are absent from the current read model. Do not fabricate them. Current exact plaintext remains editable text; a drawn rich code panel does not authorize rewriting Source or introducing a new rich-text owner. Existing compact sort/overflow controls stay reachable even when the static master omits them.
- AI Context remains display-only pending redesign. Thought/writing/export full workflows remain deferred under the latest owner amendment; this batch does not restart them.

## Bounded verification

Retain original targets and actual complete source/release windows, exact tested head, five widths (1440/1280/1024/768/320) and both themes for Archive and Reader. Add two200%-text views and one trusted coarse-touch view:23 mandatory rows per variant. Missing standalone artboard states are explicitly labeled responsive/palette derivatives, not falsely presented as supplied images.

The existing UIR-01 complete journey keeps its interaction/privacy assertions; only its obsolete D5 visual comparator is replaced by the D6.2 Archive comparison. UIR-01 also retains its ten-row Reader comparison in the normal full-suite route, using the same new helper and a single captured Conversation while retaining the existing fixture. Exact captured body/time, live editor-node, search, unique sort, keyboard and Back requirements remain represented; the separate full comparison adds the bounded durable-edit and stress checks. Existing CPV1-02.1 changes only the source chooser's disclosed entry. No case timeout or full-suite partition changes. Whole-page geometry keeps a2px comparison bound where the target defines fixed geometry. Pixel judgment remains separate from numeric checks.

Required before adoption: independent source review, complete affected native evidence, original Source equality, durable exact Working Input readback, no external requests, package/privacy/unit gates, actual whole-window design review, exact-head merge and main verification. Screenshots and all checks remain pending. Public consumer release/install delivery remains held.

The package audit records only the two reviewed extension-UI keyboard listeners as exact code/count matches: compact menu Escape and native search history isolation. Mutant checks reject duplicate, altered, broader or foreign-path listeners; all other keyboard restrictions remain.
