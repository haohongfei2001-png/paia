# UIR-02 Visual Review

Final certified code/test HEAD: `786eeee7d5a31c4d49e2b0e56dc834a57dcd07bd`  
Presentation runtime commit: `80aa1a3826afa5f6d827f349a983d86027e7c387`  
Selector-only browser-test fix: `4db9c699d22b1e69a52b687c1ed9479acbfbec53`  
Final Chrome certification: PAIA Certification `#310` / run `35018869252`, attempt 2 Current Browser — `SUCCESS`  
Frozen baseline: `main@c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`

The exact final PNG screenshots reviewed below were produced by the successful targeted Current Browser rerun for certification HEAD `786eeee7…`. They remain preserved in Actions artifact `10418906783` (`ux-r2-evidence-f7b1fcfb740a45611758b36b54f0589accc40347`, artifact SHA-256 `e0ef08d5b880339bca8c5380fdbfb069b22264ee01ec720d914895b98e5617c7`). Test data/profile are isolated and synthetic. The earlier recovery artifact remains documented in `RECOVERY_VISUAL_REVIEW.md`; this file is the final UIR-02 review and does not relabel the recovery checkpoint as final evidence.

| PNG | SHA-256 | State | Review |
|---|---|---|---|
| `uir-02-archive-1440x900-light.png` | `18d6115dc66f0b56f0c6490da8adc778db7af5ec5231890375647c83c9e1b03e` | Archive, 1440×900 light | Real archive rows lead with title, source-time state and message count rather than invented summaries. Search is a lightweight archive tool; the list has first-viewport weight and is not constrained to prose width. |
| `uir-02-current-release-archive-1440x900-light.png` | `eba724db6fe8b5de6f12bbaf24e1752e4e7d7c27cd51d223c48403470ee0d683` | Built release Archive, 1440×900 light | Current-release presentation matches source behavior and keeps the refreshed Archive hierarchy without development-only UI leakage. |
| `uir-02-reader-1440x900-light.png` | `c87aac49d9c85782c8437454d1e4ebba7e9033246a04dc39bbcbe76a58523578` | Reader, 1440×900 light | Continuous text is visually primary, without a thick card around every Input. Header/date/order and per-Input actions remain subordinate to reading. Saved prose width and workspace width remain distinct. |
| `uir-02-reader-1440x900-dark.png` | `da64e62eb97fe70de8d30dda65f73e284ebbfe3e4c47bd020c5151d956b62e78` | Reader, 1440×900 dark | Same hierarchy as light; no unintended bright legacy block or unreadable selected/highlight state was observed. |
| `uir-02-search-1440x900-light.png` | `a784247fac352c60246fd80fa62d34b737c55bded1f5ce0dfd26dc4bb2d465ae` | Universal Search, 1440×900 light | One primary query, mode switch, bounded filter details and results/selection hierarchy read as a workspace rather than a modal. Result metadata is explicit and there is no generic dashboard treatment. |
| `uir-02-revisit-1440x900-light.png` | `3d01e4dba8becc3fd3568959098b5b6d58081806250a30704184e972e5ee1fc2` | Revisit, 1440×900 light | Revisit is a lightweight reading surface: continue/new/topic material are separated without introducing ranking cards or AI filler. Old material remains an opt-in concept rather than ambient history debt. |
| `uir-02-reader-390x844-save-failure.png` | `466d084153f6fb2f162ef3e26a3d1d7f5f78b06b772867eb732bd182b9688aef` | Reader save failure, 390×844 | Real edit buffer remains visible; retry/copy/edit recovery stays reachable in the mobile viewport. The failure is not collapsed into a generic notice and no root horizontal overflow was observed. |
| `uir-02-source-1440x900-light.png` | `fca0eb433193dc108bbf769d2c606e5ab0f521ed4654f70a960c288ab59d8b3b` | `查看当时记录`, 1440×900 light | Source is clearly a read-only historical layer over a de-emphasized Reader. Original text is readable; source details and permanent deletion remain secondary and are not presented as an editor. |
| `uir-02-revision-1440x900-light.png` | `3bd485a3fd35c29d2b141853d60a2eddbefff87efc371fab312031c5d9fe1298` | `版本历史`, 1440×900 light | Revision history is visually distinct from Source. “恢复会建立新版本” is directly visible, so restoration is not confused with history rewriting or permanent deletion. |
| `uir-02-review-removed-1440x900-light.png` | `28e867a1f6a17431538cefd97eb118dfd406c1b8ab1e3d417e1511dbd375daf2` | `已移除` review, 1440×900 light | Removed state is explicit without alarm styling. The copy states that current working text is retained and may be restored to Input Archive while the historical record is unchanged; the restore action is in the same context. |

## Final review checklist

- Archive uses real bounded metadata and does not invent a body snippet, total dashboard or summary layer: **PASS**.
- Archive / Search / Reader / Revisit hierarchy is visually distinct while remaining inside the existing owners: **PASS**.
- Reader light/dark continuous reading remains primary and does not regress to per-paragraph thick cards: **PASS**.
- Search filters, modes, selection and results are readable without becoming a second launcher/modal: **PASS**.
- Search → Reader → Back state restoration is certified by the browser journey; no visual reset was observed in the reviewed Search/Reader states: **PASS**.
- Revisit remains quiet/reading-oriented and does not surface old material before opt-in: **PASS**.
- Source is read-only and named as the historical record; Revision is version history; removed Review is a separate working-layer state: **PASS**.
- Preview masking covers the moved historical Search body while explicit Reader/Source full-text views remain readable; no hidden text was moved into tooltip/ARIA copy by this round: **PASS**.
- 390px save-failure recovery remains visible and actionable; existing 320/390/1024 matrices in the same UX-R2 evidence set remain covered by the underlying browser suite: **PASS**.
- Built-release Archive matches source presentation and the UIR-02 test exercises the built release with zero implicit provider/network behavior: **PASS**.

## Validation and visual-fix chain

The Source/revision/review + mask implementation first exposed a browser-test locator ambiguity: the accessible name `全部结果` also matched `全选全部结果`. The test was corrected with exact matching; no product behavior or assertion strength was reduced.

Certification `#310` attempt 1 then had a single failure in an existing UX-R5 provider-failure recovery browser assertion before the complete browser-suite step. The same untouched UX-R5 assertion passed in that run's Full Suite, which completed `1090 / 1090 PASS`; the earlier UX-R5 focus fluctuation also passed there. A targeted rerun of Current Browser only was therefore used instead of changing unrelated production code. Attempt 2 passed the fixed step-8 set `32 / 32`, complete current browser suite `34 / 34`, UIR-02 browser test, package/development guards, and artifact uploads.

No further UIR-02 visual defect was found after opening the final Archive, built-release Archive, Reader light/dark, Search, Revisit, mobile save-failure, Source, Revision and removed-Review PNGs.