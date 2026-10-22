# PAIA live-site value-story refinement — 22 October 2026

## Scope and authority

The owner asked to modify the current official website following a live-site
review. This website-only branch starts at main
`4349189451821db1e408a669cee5b64b140844f6`. It does not merge, copy or adopt the
rejected flagship PR #310. Extension code, private data, provider configuration,
permissions, release manifests, assets and existing deployment workflows are not
changed or activated by this work.

## Implemented

- Retain the translucent navigation, blue/white palette, product-led opening,
  current mark, Context four-card composition, original floating-orb artwork and
  the original closing illustration/composition.
- Use the same three fictional moving-home expressions in the opening, search
  result and continuous chronological Thought reading. Source expressions are
  not rewritten into inferred beliefs or a claimed live model output.
- Make the saved-phrase panel visible by default. Its local example preserves
  the whole draft and selected text, inserts at selection end, protects active
  IME input and length limits, supports keyboard collapse/reset, and never sends.
- Replace unavailable-installation primary actions with the real web demo.
  Keep a separately named installation-state link and the disabled actual
  installer. Download, Help and first-use guidance agree on this state.
- Correct public sync / external Context wording. Website illustrations do not
  establish available external services or grant real access.
- Preserve root English, Chinese and identical legacy English routes, all
  existing form consent and the independent full Demo controller.

## Engineering and design evidence

Generated source was checked for all 59 outputs. Initial static verification
passed 5,724 checks. The new homepage browser journeys passed 459 checks across
two languages and five widths, including selection preservation, IME, length
refusal, keyboard behavior, no persistence/requests, reduced motion and no-JS.
These counts describe the recorded local runs, not production acceptance.

Actual local HTTP pages were rendered in Chrome at 1440, 390 and 320 pixels.
English/Chinese opening, retrieval, chronological reading, Prompt, Context and
installation pages were visually inspected. Review fixed a narrow date wrap,
Chinese sidebar replacement, long download heading and English mobile word
spacing. No concept image was substituted for the implementation.

The test suite's historical homepage copy/no-widget/CTA expectations were
explicitly superseded for this request. New semantic checks replace those
specific expectations; original full Demo editing/source/permission/keyboard/
IME checks, all-route layout checks, form consent and asset locks remain.
`value_story_preserved.json` hashes inherited owners against the exact original
main commit, including unchanged core checks and controller, design assets,
Context source and closing artwork. The closing structure/copy is separately
compared while allowing only the new truthful primary action.

An early local browser run timed out after two same-frame emulated media
changes. A minimal browser reproduction isolated test-frame synchronization;
waiting for the real preceding animation frame resolved it without altering
motion preferences, browser assertions or production behavior. Failed early
runs are not PASS evidence. Final exact-head full-suite and deployment evidence
belongs to the PR / PAIA Website workflow and its retained artifacts.

## Verification commands

```sh
python website/build.py --check
python website/test.py
python website/verify_live.py
```

The original workflow remains unchanged. Production verification compares all
reviewed generated files and active assets, including both new value-story
files, before its browser checks. A prior CDN copy must fail. No installer,
contact submission, real AI call, private archive access or physical-device
extension certification is included.
