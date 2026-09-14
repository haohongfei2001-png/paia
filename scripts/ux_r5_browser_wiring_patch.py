from pathlib import Path


def replace_once(path, old, new):
    p=Path(path); text=p.read_text(); count=text.count(old)
    if count!=1: raise SystemExit(f'{path}: expected one match, found {count}: {old[:120]!r}')
    p.write_text(text.replace(old,new,1))

replace_once('extension/tests/ux-r5-ai-organize-chrome-e2e.test.mjs',"await p.bringToFront();await nav(p,'archive');", "await p.bringToFront();await nav(p,'library');")

p='.github/workflows/paia-certification.yml'
replace_once(p,
"      - name: UX-R1 shell, UX-R2 Reader and UX-R3 Thought and UX-R4 reuse plus current core product journeys\n",
"      - name: UX-R1 shell, UX-R2 Reader, UX-R3 Thought, UX-R4 reuse and UX-R5 AI organize plus current core product journeys\n")
replace_once(p,
"          tests/ux-r4-search-reuse-chrome-e2e.test.mjs\n          tests/release-certification-round48-chrome-e2e.test.mjs\n",
"          tests/ux-r4-search-reuse-chrome-e2e.test.mjs\n          tests/ux-r5-ai-organize-chrome-e2e.test.mjs\n          tests/release-certification-round48-chrome-e2e.test.mjs\n")
old="""      - name: Upload UX-R4 visual and browser evidence
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ux-r4-evidence-${{ github.sha }}
          path: extension/work/ux-r4
          if-no-files-found: warn
          retention-days: 14
"""
new=old+"""      - name: Upload UX-R5 visual and browser evidence
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ux-r5-evidence-${{ github.sha }}
          path: extension/work/ux-r5
          if-no-files-found: warn
          retention-days: 14
"""
replace_once(p,old,new)
