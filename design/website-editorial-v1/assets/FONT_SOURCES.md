# Font acquisition references

No font binaries are distributed in this design package. The rendered proof records exact font file names and SHA-256 in `specs/font-lock.json`, with authoring-environment package versions in `specs/render-environment.txt`.

- English display: EB Garamond 12, Georg Duffner branch. Official project: https://github.com/georgd/EB-Garamond ; license: https://github.com/georgd/EB-Garamond/blob/master/COPYING (SIL OFL 1.1).
- English body: Inter, Rasmus Andersson. Official project: https://github.com/rsms/inter ; license: https://github.com/rsms/inter/blob/master/LICENSE.txt (SIL OFL 1.1).
- Chinese display/body: Noto CJK Serif/Sans SC, official project https://github.com/notofonts/noto-cjk . Verify the relevant distribution license when acquiring production font files.

Do not assume a different EB Garamond variable-font revival or a new Inter release has identical metrics. Obtain the matching upstream/distribution version, verify the lock and then compare actual line breaks and pixels. System-font fallback is a visible design failure, not an accepted equivalent. The exact original reference font was not identified; the above families are explicit reproducible design choices.
