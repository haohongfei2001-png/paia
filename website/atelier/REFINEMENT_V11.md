# Atelier V11 — accepted visual direction, complete example journey

Owner request: implement the preceding refinement review without overturning V10.
Base main: `9d7200555b315e1d89509f12bf78bf62e16418ae`.

## Scope

The paired homepages and actual `/demo.html` + `/zh/demo.html` are updated;
`/en/` aliases remain byte-identical to their canonical English pages.
The extension, model integrations, authentication, storage, permissions,
installation availability, contact transport, legal pages and deployment workflow
are not changed. The working checkout is an isolated website worktree.

## Homepage

The approved headline, colored word outlines, manifesto, four Context card
shapes, privacy orbit, original mark and closing illustration remain. A scoped
finish improves information contrast and reading roles rather than replacing the
brand direction. No new font or remote resource is introduced.

Thought Library is an open editorial spread with three chapter labels. The
existing three expression nodes survive the entire animation. Quotation artwork
supports the expressions instead of competing with them. A continuation line
leaves the theme visibly open-ended; it is not an editable production control.
Archive composition is more compact, and the mobile reuse vignette puts the R3
entry close to the draft. The board is given extra room only when opened.

The motion controller measures visible subject area, not just an intersecting
section edge. Reading the title does not consume the main sequence. Each scene
has its own timing; hidden/offscreen pauses, explicit pause/replay, finite stop,
reduced-motion final states and manual ownership of R3 remain.

## Current product example

The previous demo exposed retired source disclosures and Thought/Reader search.
V11 replaces that public example, instead of hiding obsolete controls behind CSS.
The existing corrected V9 local data model was carried forward into a dedicated,
paired interactive-example controller and a functional layout at reading scale.

- Input Archive: group expansion is separate from selection; a fresh pane stays
  empty with a clear cue. Search matches current working text; content edits
  remain plain text. Selecting a result moves focus to the document.
- Thought Library: real Topic/Section navigation, direct editing, separate
  thought/input working layers, chronological order, added thoughts and an
  explicit preset AI organization switch. Editing invalidates the preset.
  There is no source disclosure, Thought search or reading-style menu.
- The writing example shown on the homepage has the same words and section
  hierarchy in the demo. Its deep link selects the matching writing topic.
- R3: exact approved source/geometry, six expression rows and a memory-only
  adapter. Caret insertion preserves both sides of the existing draft and
  refuses to interfere with composition. No message is sent.
- Context: viewing and allowing are distinct. All choices start off. A Topic
  choice does not grant parents; pausing retains subordinate choices. Input
  scope is read-only. Escape closes details even after focused content changes.

All data is fictional. No account, model call, archive connection, persistent
storage or service transport is present. Refresh clears the example state.

## Verification and test migration

Use the unchanged workflow commands:

```sh
python website/build.py --check
python website/test.py
python website/verify_live.py
```

`refinement11_checks.py` verifies home composition/timing and the current example,
including editing, plain-text safety, stale derivative handling, caret insertion,
IME, focus, permissions and refresh behavior. Old assertions for retired source
buttons and search are not claimed to pass: their implementation-specific demo
branch is retained as legacy code and replaced by tests of the current model.
All unrelated page, form-consent, availability, metadata and asset tests remain.
`preserved-v11.json` locks the other 125 deployed assets/outputs/workflows to the
exact V10 baseline. It excludes only the six explicitly replaced HTML routes.

Browser screenshots are reviewed in addition to layout checks. Passing tests is
not a claim of visual excellence, extension readiness, live AI functionality,
real user data correctness or physical-device acceptance.
