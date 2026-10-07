# AI Context Cards v2 — approved visual references

Owner approval recorded: 2026-10-07. This is a reference manifest, not a new visual design or runtime certificate.

The approved private delivery is `PAIA-AI-Context-Cards-v2.zip`, SHA-256 `a1657d1b4bc36326d4cf8260d4e858f565f707a9e71dd959cd64adc8d6240b2c`.
Its specification is `PAIA-AI-Context-Cards-v2/AI-Context-Design.md`, SHA-256 `d520ff4894d37e1ffe6bb46c36c0976f344b99c91b452db46c7af962d48790e2`.
The package also contains Review.html, AI-Context.html, Screens.json, inherited shell/style assets, prototype checks and their negative history. It contains 22 full state screenshots, not 22 production certificates.

The original spec's review-pending label is historical; the later owner approval recorded in AI_CONTEXT_CARDS_V2_ADOPTION.md changes the design approval status. It does not change the original bytes or claim production visual acceptance. The approved source-code design baseline was 690a7e2bb8d838882f6eb3833f3bb909a158dc4f; the implementation plan is grounded in later main b575ccd9d812b93be9004b73c18eaca8cd4257fd.

## Scoped shared-reading clarification, 2026-10-07

The owner explicitly chose to retain PAIA's existing font size and prose width in Context. Compare detail states using the production shared reading-preference owner and the user's saved choices; the current standard role is 17px/680px rather than the package's 16px/800px. That precise difference is accepted. All other composition, hierarchy, spacing, controls, state, theme, compact-layout and interaction requirements remain applicable. Do not inject screenshot-only styles or change global preferences to imitate the original metrics. This clarification neither changes the private package bytes/hashes nor claims production acceptance or implemented global proportional scaling.

## Access and privacy

Actual visual bytes remain in the owner's approved conversation artifact, not in this public repository. Retrieve that exact named package from the authorized handoff or file library; verify the hash and open the relevant screenshots. Do not use a sandbox URL from another session as a durable repository asset URL. This manifest alone is not a substitute for the images. If the executor cannot obtain them, report VISUAL_REFERENCE_MISSING for the affected visual work; continue independent domain/compatibility work without inventing a replacement design. Do not republish private source documents, archive material or identifying examples.

The documentation download accompanying this adoption contains the unchanged approved design package and the development plan for handoff. No font files are included.

## State mapping

All names below are relative to `PAIA-AI-Context-Cards-v2/screens/`. Use Screens.json for exact viewport and state. Match whole source/release extension windows at equivalent data, locale, fonts, zoom, theme and state. The last phase verifies the complete set; earlier phases verify their affected subset.

| File | State / implementation phase | SHA-256 |
|---|---|---|
| 01-Home.png | Four-card home; CTX4-01/02 | 57c3dec15bd93a85cf77d7b5035c663a1cc9d9ee6e85c9a3f6144b12ec653856 |
| 02-Cards-Off.png | Groups off; CTX4-02 | 5bac715af3debc85ee45848da2e0e85cc647d096808f270fba9753611e2709b8 |
| 03-Global-Off.png | Global pause; CTX4-01/02 | 81d88876909d3b9b0cb99e5e6db749ce549ecef95a5cf5b0f345531353e61ee5 |
| 04-Info.png | Information detail; CTX4-01 | e6130937a71499f814522cf39e95f11263a3cdbaf4b18fa8fd471e72fca9c471 |
| 05-Inline-Editing.png | Direct editing; CTX4-01/02 | 869f5ce8bbce451777216645a168cb31d8e42abf92155c1edbcb3bd157dddaed |
| 06-Rules.png | Rules; CTX4-02 | f2614b3ac63db71f76cdd708dffc7ccfffa606aaa50ddc30331145b5944e2653 |
| 07-Now.png | Current stage; CTX4-02 | 31a239c8182aef0ed0cc14c3928ff0d7a362913a96f10e6c556dd489651be9a6 |
| 08-Inputs-20.png | 20 Topics; CTX4-03 | ad6e30d0f759b043c18837d65ea09dc1c50ff7a1c91101ebddb8925faf1c1c78 |
| 09-Inputs-50.png | 50 Topics; CTX4-03 | c83cb77a5616136f10237663421a77e16b46cf53e8d9fca0f63166e31369e597 |
| 10-Inputs-144.png | Complete 144-Topic page; CTX4-03 | 82b470d9b372c7b60cf38e3d34c02c908c2d5c3e27b1a8fb839a31892c6b83f0 |
| 11-Connections.png | Connections; CTX4-06 | 46ccd3e9b3572cf2c5d0abcc8d589a6db786022bff041dde0f74a5c4727e79ef |
| 12-Compact.png | Compact home; CTX4-02 | 08ef7552adea723fb3f4364048dddc4e29280a78ee52d268e533d71b8c5dc9c9 |
| 13-Dark.png | Dark home; CTX4-02 | a1fd51eccd6dc3bcec9ff439ddc7856e65c87817250bc63398ca8ed148a58d9f |
| 14-Inputs-Paused.png | Inputs group paused; CTX4-03 | 49b6aaef8b82702c0ddf469557f4383ed758fa997a7fe8ac246e236324a0f791 |
| 15-Empty.png | First open; CTX4-01/02 | 42e02e39162a1b2fceb2f1341b3b1663eac77f96e110e03d26d5940bb001e189 |
| 16-Save-Failed.png | Save failure with retained draft; CTX4-01/02 | ab7449bf614ae7b26ccc3f21c402551e0f688c68b4497c5f233b15241773d862 |
| 17-New-Topic.png | New Topic closed; CTX4-03 | 2adfbcf63b02cd2aacf2e9b8b4504569b51cf26250b1a5dbebc18c0abdd31dfd |
| 18-Dark-Inputs.png | Dark Topic access; CTX4-03 | 9e6244a6c9d02c8279790b73cd83afbe06b4dd96300e18a13d62d18362a8a639 |
| 19-Compact-Info.png | Compact detail; CTX4-02 | 0c91cd4886134a1a16a51e1ff1b0c0d0c805652282233f308d375752fcc58e07 |
| 20-Connect.png | Connection permission; CTX4-06 | 58d972cdb3aeb817240ec2fd08bca1385aef5f821a19fa4f81fee90e5d4e9c70 |
| 21-Tablet.png | Tablet inherited rail; CTX4-02 | cfd4bc52087d89902b7bd7779a4e158b3cf7eeb04d42d941da4a7a5aa2437c93 |
| 22-No-AI.png | Content but no connection; CTX4-02/06 | bb3590d189b74c14040fca7f88d3f638f3666cc5c318b8a05a5671ca97ea02d6 |

The earlier prototype's reported 78/78 checks were not rerun by this adoption. They do not certify persistence, authorization, real clients, model fidelity, physical IME, screen readers or performance. Never import the mock's in-memory state or fake connections as production owners.
