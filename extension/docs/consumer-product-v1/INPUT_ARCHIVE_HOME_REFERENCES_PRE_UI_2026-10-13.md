# Input Archive minimal optimization — references and evidence

> Execution update: the owner's later explicit seven-lane instruction selects
> IAH-1.1 runtime development. It supersedes earlier documentation-only /
> NOT_SELECTED / exclusion statements in this adoption record, not the confirmed
> minimal design. See [current execution](SEVEN_PLAN_EXECUTION_2026-10-08.md).
> Implementation, tests, exact-main acceptance and user availability remain
> separate claims; none is established by this authorization.


**IAH-1.1 / 2026-10-08.** [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) defines the selected/rejected scope, [CONTRACT](INPUT_ARCHIVE_INTERACTION_CONTRACT.md) behavior and [UX](INPUT_ARCHIVE_HOME_UX.md) presentation. This manifest identifies evidence; it neither adopts the entire B prototype nor grants runtime authorization.

## R1. Current source and review baseline

Initial main for this correction: **99bb95ed114c166347520b58e3216d0e63519379**, tree **9438fb92d215833cdf8cd9d01047ad6ae804ea31**. The visual review used **dc594f047cf44e92bd2e93a463746622b065f548** and ended at **c9fa243d1c347e4ed5d945825e085794e4322bdd**. The comparison through 99bb95e contained coordination/STATUS and Context evidence Markdown only. The earlier CPV1-TOPIC-02 sole-pointer wording is historical, not current scheduling.

Before integration, main advanced to **daf180762e2fe7718dfcddcf345c6a11749aad8e**, tree **cf179b2a0662af33f6ea6c93fa373f7fc27e5f2c**, integrating Personal Topic Root 0.19. This newer commit includes runtime, shared navigation/helper/sender, manifest/package, workflow, test and Root receipt changes. They are preserved unchanged relative to this documentation integration's parent. The four current coordination/canonical entry files were reread and retain the same pre-correction blobs; no concurrent task selection is overwritten.

The prior manifest's complete initial source/blob table and original private-source hashes remain in [REFERENCES_PRE_MINIMAL](INPUT_ARCHIVE_HOME_REFERENCES_PRE_MINIMAL_2026-10-08.md), sections R1–R3. Those tables describe their original source, not an assertion that every shared file remained unchanged through daf1807. Current relevant changed shared blobs are:

| Source at daf1807 | Git blob SHA | Reconciliation |
|---|---|---|
| extension/ui/archive.html | 6ad88bb38966ff54a6bfc5d3baa5f819fce07a42 | Preserve newly integrated Topic stylesheet/markup; actual PAIA primary rail remains |
| extension/ui/archive.js | ab0dd972f9437b9c08f52e36a4735c23e53808e4 | Preserve shared Topic integration and Archive query/Reader owners |
| extension/ui/reader-navigation.js | fbb5d80808601a603dd90616fc3c5d2d923f75cc | Preserve Topic-root slots and explicit Topic/Section target restore |
| extension/ui/search-experience.js | 2849d22fdd2d43df5261da073b501dc513cd41f2 | Existing exact-hit/range helpers remain; preserve the new shared keyboard selector support |
| extension/background/service-worker.js | e4062cdca258a8830d179f5502b7ffb43cae135c | Exact application URLs plus strictly validated Topic fragments; no arbitrary Archive fragment admission |
| extension/docs/consumer-product-v1/implementation/topic/TOPIC-05-ROOT.md | 314a02ae318b9da155daa5f5730940a38dd45ad0 | Owning Root evidence/negative history; continuous Section reader and overall acceptance are separate |

The current relevant source and route/scope plumbing were inspected, including archive.js presentScopeSearch/onProjectSearch, navigator toggleGroup/paint, Reader navigation, range reveal, the newer sender validator and current canonical coordination. Initial exact-entry-only sender descriptions do not authorize reverting new Topic support. Neither the merge nor this source review proves exact-main certification, installed availability or new Archive implementation.

Important observed distinctions: both Archive and Reader search instances already exist but visible placeholders are reset to empty; whole-row Project activation is disclosure; onProjectSearch/conditional clear plumbing alone does not prove a reachable Project-scope action; result title precedes body in current renderResults; exact-hit/highlight/windowing helpers already exist and need end-to-end gap verification, not wholesale reimplementation. Source-informed A is not an installed build screenshot.

## R2. Exact IAH-1.0 history, not parallel active authority

These five predecessor snapshots have the exact original Git blobs. They preserve the original wording, references and evidence; their old normative/adopted labels describe history. Only the current five unsuffixed files and the explicit IAH-1.1 ledger control Archive. Earlier PRE_ARCHIVE_HOME snapshots remain untouched.

| Current path | Historical snapshot | Pre-correction Git blob |
|---|---|---|
| INPUT_ARCHIVE_HOME_ADOPTION.md | INPUT_ARCHIVE_HOME_ADOPTION_PRE_MINIMAL_2026-10-08.md | 18c4a498c824a3b4d6da763541453ae83f7353ca |
| INPUT_ARCHIVE_INTERACTION_CONTRACT.md | INPUT_ARCHIVE_INTERACTION_CONTRACT_PRE_MINIMAL_2026-10-08.md | a617f7b53129c2dfffc969cae91ff32523f9bc9f |
| INPUT_ARCHIVE_HOME_UX.md | INPUT_ARCHIVE_HOME_UX_PRE_MINIMAL_2026-10-08.md | cae05dd37c5bd90faf96938f241b15a14b1cec47 |
| INPUT_ARCHIVE_HOME_PLAN.md | INPUT_ARCHIVE_HOME_PLAN_PRE_MINIMAL_2026-10-08.md | d6fd48841f3de1d424f2d0b8407710876f121c7c |
| INPUT_ARCHIVE_HOME_REFERENCES.md | INPUT_ARCHIVE_HOME_REFERENCES_PRE_MINIMAL_2026-10-08.md | c0b883565d90aedf2ea72c61a850b84e1b084e3a |

The seven shared canonical predecessors are also recoverable exactly at main 99bb95e and daf1807; current edits are scoped Archive corrections, not shortened replacements of unrelated requirements. Pre-correction blobs: AUTHORITY c2639c6ae0c344c5ed06b4be28c63c63ce2fb656; PRODUCT_INTENT_CONTRACT 13fdb9b868e01218c0f65e69518dc76d6b8d7b1b; UX_CONTRACT 1d69cb3ca9e3f32c3de66003f1d9906a6fac1dd9; TECHNICAL_PLAN a3b7cc7449b2400fc75cd6f5df268574881aed43; MASTER_PLAN 84d8ddd2217e876caf49dbcd9e1d3e505913a76f; STATUS 0a193316d0255e720bbb234b17eaed7f1d369808; extension/AGENTS 4385ee75c8c799739b09755bc5d6f9b3a83247be.

## R3. Private review package identity

The latest owner message is titled PAIA Input Archive — Final Visual Adoption & Canonical Correction. It selectively approves necessary B changes and rejects name/arrow splitting, sticky return, P1/P3/C and other unselected details. It is a conversation instruction, not the older supplied final-freeze Markdown; no invented byte hash is assigned to that message. The older 19211-byte instruction remains historical under R2, not the current decision.

All packages, actual screenshots, full report/instructions, Input examples and prototype bytes remain private in the owner's conversation materials. Do not upload them to public GitHub. Public hashes/filenames identify the originals without copying their content. No fonts are packaged here.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| PAIA-Archive-UI-Review.zip | 6652583 | 4c9f88c17690898c3dd3fe6e97e07cd8f9c9d78d84ff38c2a5a66de8073be737 |
| PAIA-Archive-PNGs.zip | 2987448 | caf60bf0b37c257b7368850320ae6e632baa008e570715393d354944c24a43ba |
| Review-Report.md | 22067 | 150ab7a46938b5df6df82538657e67decb737e0cb31c9be2720abf50c1bbf54d |
| PAIA-Archive-Prototype.html | 61465 | 440f918a25b89af8889aa09cfe276c3755fa075c74c6a87775031ffaf39144b3 |
| PAIA-Archive-Review.html | 5123588 | 44bc79c42de6de36517b271487baa1b6fb79d1e7f4e0cee6db29c74cfa717d47 |
| Checksums.json inside full review package | 4373 | 83ff0a8e969da5a9b3deeef07319d39802f6125cb1ea2f0b00fece928ed34ad1 |
| Screenshots.json inside full review package | 13061 | dc5dc329195093543ef3cc220cf8174a2511f86b7a7d4bacb88990b948a488b4 |
| Prototype-Test-Results.json | 3647 | 7b5aa1ff46ab936e13cae9019c2bd60c1ff10fea3c8507cf28b9bb2449bdf06e |
| Visual-Checks.json inside full review package | 290 | 6a97e609e9d02a786ea754c1bd284a26b3b558d1fccfac523ebfb20dc2e6b5eb |

Both ZIP CRC checks passed. All 45 entries in the supplied Checksums.json matched extracted bytes. All 33 PNGs matched between the two packages; supplied standalone report/prototype/available figures matched their full-package copies. These are file-integrity checks, not product tests.

## R4. Figure inventory and permitted use

Files below are under the private package's png/ directory. Every B image is partial evidence only: approved labels/result hierarchy/normal reading apply; Project split-click, P1/P3/C, sticky Back, M6 and incidental added controls do not. No figure is an unfiltered production master. The report's source-informed font rendering and synthetic-data limitations remain.

| Figure | Pixels | Bytes | SHA-256 |
|---|---|---:|---|
| 01-A-home.png | 1440x960 | 34382 | 77a0557a3a761c87c51760353b6a851999ea408e27917f8b00ff3ee97aa601f7 |
| 02-B-home.png | 1440x960 | 36093 | 7ae7c4d8062ce1eac7dcbeae230fccfb784ca9ba4b92387ee5869bceb0eda05d |
| 03-B-home-hint.png | 1440x960 | 40116 | dc7d98139c593b65a6dd50ae360f131b2333f4b2e953611340888b6636a51347 |
| 04-C-main-search.png | 1440x960 | 49076 | 3345f93add2bccc78d33a54057160a06e06423a8e5fbcc9ece7a3cf176988a5e |
| 05-A-reader.png | 1440x960 | 108448 | 6afa4855f7b7b578cbf85fd42bbbd28dd96ce111b6ac6bdf08d00efd7047aa96 |
| 06-B-reader.png | 1440x960 | 111518 | f2ef04f73661e6aeefbaee968f63b9ce4bfe920489bc923bc5311dba7fc5d32d |
| 07-B-search-typing.png | 1440x960 | 44117 | d4e25e304f37294c77861da2a3d3a3b61b73888447256fe462fb4bbbcbbb6179 |
| 08-B-results.png | 1440x960 | 143137 | 1b6231f9ca3cace65f0b1ea47183cb4e19642db869772063952e93a54d19d3e2 |
| 09-B-project-browse.png | 1440x960 | 46328 | f2f2b427ee4d07fa39a24051c1cafb52a20fb6a6a3d1e239e5e061e5915dddd1 |
| 10-B-project-search.png | 1440x960 | 130565 | 9f73be130a015843e8f918f34b607dab6f038762cd9e82d1a524dbeca8ae515b |
| 11-B-exact-input.png | 1440x960 | 149540 | 08279e8cadef6641191209a81bbc260df788dd951bfe0b5eae934b5d380a4fed |
| 12-B-filtered-input.png | 1440x960 | 131777 | f471ecf969d1d3e64521ec5cc27ce5df6fb1c464cb80365559dbe0f1fc0a0d2b |
| 13-B-dark-home.png | 1440x960 | 36168 | 65d66f3c6a5f0258a8b1244960adaa4446f81e1a201556cc9af5c970b134668d |
| 14-B-dark-reader.png | 1440x960 | 112969 | 1b4c279bb48ce7d8972e04e405fd221c3010b3296acc3b74032b4d63752c8548 |
| 15-B-dark-results.png | 1440x960 | 145558 | 072b649c7395fa050c68f1d1a069661cea4e22d0528d6e2b441e576d4130db56 |
| 16-B-narrow-home.png | 390x844 | 23295 | fc93b551d92fc6a77b74f8352b5d2ccee4bcf77165f9de903729382543878884 |
| 17-B-narrow-results.png | 390x844 | 72866 | cacf2d6dbe362d6b6528b2b46d1e27f37291f1067cfaa1b8353ff0a52271f7c7 |
| 18-B-narrow-reader.png | 390x844 | 70375 | 046c5b574ff4f762698170006469fd6035482170081c8ca7b9557060f236cd67 |
| 19-B-no-results.png | 1440x960 | 48569 | cb2d4a992786579620cbc5c5e05f534c66fd661915e08383bd7cb544d9c70773 |
| 20-B-incomplete-index.png | 1440x960 | 89090 | 1dfef66b1c6f5d9f7f75afd217dcd4ae827de26f624151ece566b764b2a599f3 |
| 21-B-empty-archive.png | 1440x960 | 32389 | 150939371da629bed49c0dde9a050e19a3ed228edeee0f42dadb4ebd000a8f81 |
| 22-B-long-navigation.png | 1440x960 | 79119 | bf4e0cc3176a670d35b0b395dd75c0f487f304e3a196e54cf574a67917eeb318 |
| 23-B-source-unavailable.png | 1440x960 | 149540 | 08279e8cadef6641191209a81bbc260df788dd951bfe0b5eae934b5d380a4fed |
| 24-A-results.png | 1440x960 | 114679 | 9ea28ec0ec200054f59eae940abefcc589bb78844356d0e09c3097d9f0ff054c |
| 25-A-wide-home.png | 1838x1152 | 37076 | 5597bfb988bc8bdf62b8fed0ff5b89c582dd09b438e64edf312f99c9c42174ca |
| 26-B-wide-home.png | 1838x1152 | 38881 | 1cba07d091cf84bda8d05e6203b816cc2d90cd736ee754a276f130892bf839a1 |
| 27-A-wide-reader.png | 1838x1152 | 122612 | 8643f7e84af170c77cc980d24ffed058933bb6e1d1db50b328d205ef98aa2f77 |
| 28-B-wide-reader.png | 1838x1152 | 125803 | 0d22c9004238938ced2f11196d80bdb79239d364982f01264d78daf398674523 |
| 29-B-narrow-browse.png | 390x844 | 29207 | 5cfb48b4ee9aec203478b31654e6600a6204aff20e69e5fe41ac8d12ff429089 |
| 30-B-medium-reader.png | 900x960 | 79706 | 2d57bd79952ce2234e85e24b189014a0b88792ce4a01ec3f73e79213c300e2aa |
| 31-B-narrow-dark-reader.png | 390x844 | 72576 | a8a8327e273d88b63d99b8208a1c74520c293df7a9109832c3433772978f2406 |
| 32-B-local-find.png | 1440x960 | 107221 | 68d97c18c73f3ef9083c6d16c0dbed081a1d27a0c0cd2643037a6548b4ba661b |
| 33-B-return-results.png | 1440x960 | 143888 | c00c7b16321c7bd4cce0d8a4c38c22da9b5658d91e074c6750c51606fa4df45f |

Use 01/05/24/25/27 as baseline evidence. Use 02/06/07/08/13/14/15/26/28 and applicable 17/19/20/21/22/30/32/33 only through the selected-change list. 03 and 04 are rejected P1/C evidence; 09/10/29 contain unapproved scope-on-Project/extra scope presentation; 11/12/18/31 contain precise-arrival evidence but the sticky return/extra chrome must not be copied. All B membership-copy changes remain outside this approval. Figure 23 is byte-identical to 11 and is not independent visual proof of source-unavailable handling.

The unmodified HTML explicitly contains both the split Project controls and .reader-backline.origin-search sticky rule. Their presence and the earlier prototype assertions do not approve them. Keep the original file for traceability; future production acceptance must use corrected behavior, not reproduce those handlers.

## R5. Evidence classification and publication

Performed in this correction: connected current-main/canonical/source review, full supplied report reading, A/B/C and relevant Reader/dark/narrow image inspection, prototype-source inspection of excluded behavior, ZIP/manifest/standalone byte comparisons, selected-scope documentation and plan alignment. No new design exploration or private archive/database read occurred.

The prior report records 33 standalone-prototype assertions and explicitly limits them: synthetic DOM/Chromium rendering, not actual extension/storage/permission/user-performance/installed-build proof. This correction did not rerun or upgrade those tests; some test behaviors are now explicitly rejected. Hash equality proves identity, not correctness or approval.

NOT_RUN here: production runtime/visual/browser tests, current-live provider entry, real-user task timing, accessibility/performance certification, schema/data migration, model/payment/cloud activity, extension build/install/deploy/release. No prototype or screenshot was altered or uploaded publicly. No new private Input/body/credential handling is authorized.

The integrating commit and its actual parent identify publication. Verify a Markdown-only diff, exact predecessor blobs and current remote readback; do not insert an invented self-referential final SHA. If main moves, reconcile only changed dependencies and preserve concurrent code/receipts/STATUS. Design-scope approval leaves the existing Archive execution exclusion and other coordinated lanes intact.
