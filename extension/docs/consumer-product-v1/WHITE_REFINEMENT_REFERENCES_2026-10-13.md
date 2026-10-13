# PAIA existing-design white refinement — approved reference manifest

**PAIA-WHITE-UI-1.0 / OWNER_APPROVED / 2026-10-13.** This is a shared artifact manifest, not a development plan. [UX_CONTRACT.md](UX_CONTRACT.md) owns the white-led visual roles and retained product boundaries; existing Topic, Context, Archive and Settings plans remain their execution owners.

## 1. Exact approval and source selection

Approved: the delivered `PAIA_既有设计精修_交互原型.html` and `PAIA_既有设计精修_完整包.zip`, which refine the four earlier approved HTMLs without adopting the generated six-panel concept collage. The package has 30 files: unified HTML, three independent refined HTMLs, 22 screenshots, design revision notes, two prototype-check reports and artifacts.json. Original DESIGN_CANDIDATE / not-written-to-GitHub statements describe the design delivery before this approval; original files are not edited to counterfeit later evidence.

Production target is **白色主导** with the corresponding dark translation. Screenshot 12 is old-blue comparison evidence only. The palette toggle and scene navigation are review tools, not new user settings. All original synthetic content, activity seeds, permissions, files, clients, cloud states and dates remain demonstrations, not real data or capability evidence.

This adoption checked ZIP CRC, all **29 manifest-listed payload hashes/byte counts**, and the unified HTML plus five standalone supplied PNGs against their package counterparts. The revised style blocks, design notes, check reports and 22 screenshot compositions were inspected. These are reference-integrity/review checks; the reported browser tests were **not rerun** in this task and no production/browser/cloud/client/accessibility tests were performed.

## 2. Package and document identities

All paths after the ZIP are relative to its `PAIA_既有设计精修/` directory. SHA-256 values were computed from actual mounted bytes in this adoption.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| PAIA_既有设计精修_完整包.zip | 2612730 | `860e052ded8232523576ee21911cfd6cbe818ebf70b766c333005d57aa365894` |
| PAIA_既有设计精修_交互原型.html | 595863 | `907ab85581fcad313da41ca9008f7f12fc9a8c4529245cc4621817af2c9c8bd7` |
| PAIA_思想库_白色精修.html | 95286 | `d4c99ec834b4af42eba8ece001a9165e644d0ce9b9e18c46e9cc8e9ec6e43541` |
| PAIA_AI上下文_白色精修.html | 100943 | `ae103313b9d48ee77631b043360a4a3a7c5ce3011d45ff698f652d84030b46ae` |
| PAIA_输入档案_白色精修.html | 147177 | `d3aff7a30aba8724f005b37f129128d398c35c3cd13e4f0aaf72bd8a2e7e1e18` |
| 设计修订记录.md | 9986 | `ea2eefd825fc927ea9b325d392134f65404604b04f8809b832cbd441d8a75ccc` |
| prototype_checks.json | 8683 | `60a0d3c4c498483e0105f6a34e903472c68dc46bc3d0f10429210a15cc66c721` |
| text_scale_checks.json | 882 | `3041f6b577b98ff337ffcadcd8fa8b96ec1ae86a587ec248c8238ec83823aa6a` |
| artifacts.json | 6567 | `fa941a11dbaeacc5508bb788c8dd2c35843cbebf32b5698601f06595b7fe8720` |

Original conversation references: unified HTML `file_00000000df3881f5a7abbad9f5a06dfe`; ZIP `file_000000006d2881f5a2dcc10a8f7b9568`. These identify the exact attachments, not public repository URLs or guaranteed access from another agent. This planning integration does not publicly upload the original HTML/ZIP/PNGs, private fixtures or fonts. Obtain exact bytes through the owner's authorized attachment/Library handoff before exact visual comparison. Do not invent sandbox paths or claim that hashes make an image available. Necessary visual parameters and explicit changes in current UX support independent implementation preparation; missing exact bytes block only the affected comparison, not unrelated work.

## 3. Screenshot identity and implementation mapping

Paths are `screens/<name>`. Desktop images are 1560×960; mobile 15–18 are 390×844. They are prototype browser renders, not installed PAIA screenshots. Actual state coverage remains larger than the depicted set.

| File | Bytes | SHA-256 | Owner/use |
|---|---:|---|---|
| 01-思想库-首页.png | 140810 | `d6be02b9f200f1e8868b3d3ce9f784a10212b0e05b598ba2b9a7b00cec439aa0` | TOPIC-05.2; three-column cards, no decorative counts |
| 02-思想库-阅读.png | 101735 | `3d07f4286e94f4e2716dff0e1ea290d2ff4053c111682235364e56e3998ee408` | TOPIC-05.4/06; chapter Reader, editing/source/writing |
| 03-AI上下文-首页.png | 142782 | `14edd311dc587dcf976e4519c47e90199ca4b3e5ccf40b9f0dd03ac4761c24e3` | CTX4-01/02; correct four private-directory cards |
| 04-AI上下文-编辑.png | 86115 | `f88edf3de6dcd83e559e3c8d1541f074e53870ea899bfdeaf36ff76d240c2197` | CTX4-02; existing explicit detail and editor |
| 05-输入档案-初始.png | 45987 | `4ca639f5c8930ebaaa3716647d801df4f3acabb7df4e8beda89b2632b7433d3c` | ARCHIVE-HOME-01/03; blank Main, actual single source |
| 06-输入档案-来源切换.png | 54070 | `b33bb2879cfdf57014fa3f946684dd5203eb9d3e1ca59b044faace6c07153ac2` | ARCHIVE-HOME-02/03; source-name menu and query scope |
| 07-输入档案-搜索.png | 153345 | `fd06c49bb83e872e7da912c64053ae284d09263035ef913711fdb91856bdd2c1` | ARCHIVE-HOME-02/04; exact current Input results |
| 08-输入档案-阅读.png | 150384 | `421d454e72e2ac8d3d3270f656e193ecb5c295964f0aff8bc9fe5378e114dc97` | ARCHIVE-HOME-04/05; continuous user text, normal leading |
| 09-输入档案-来源核对.png | 302340 | `85f3c8220f72baf2d097d5a01b4e111c90db255bc8be4618c772fa23f05c3d44` | ARCHIVE-HOME-04/05; source/current drawer |
| 10-设置-阅读与外观.png | 52172 | `9397b017664c36c9d3d081fc591a8fae72fdd82f430654d7e86806848b1db9ae` | SET2-01; compact rows, no reading sample |
| 11-设置-数据与恢复.png | 54445 | `61a349bd4fabec52dd1f66578bd8dda5935ecd8044dad2159cfbf93f483070d8` | SET2-02; retain six Data destinations |
| 12-阅读-原蓝白对照.png | 353814 | `f171d82eff163810c382299a634ac86824d311cb5a74e5e6af195908b5b49c0c` | COMPARISON_ONLY; never the final light target |
| 13-阅读-白色主导对照.png | 152831 | `0d96dca24bfb6a059c28b315f1932510d250f6a24384f12790f08659572dd61c` | White target at matched comparison state |
| 14-首次收录-极简许可.png | 74818 | `ec5b3904cd95a807d2b81f5bb3c165ca30bb6f817a7fb2a2bc09939bb0da26e7` | SET2-01/capture; one informed, dismissible consent |
| 15-手机-思想库.png | 53630 | `265d14e0ca078bc5671838f7fdb0e23134692037481edabd5c422bb2706e8a14` | TOPIC-05.8; narrow card/reading composition |
| 16-手机-AI上下文.png | 60386 | `42be35307e22497191905275063b22d0d357f0ea903679595f924fa53967e8da` | CTX4-07; narrow first-surface privacy and controls |
| 17-手机-输入档案.png | 64401 | `53010ea56eaa07b9eae4dce6b2cdcbf6b3edb99bdc22a942e06bba7e06f3c35b` | ARCHIVE-HOME-05/06; one readable pane |
| 18-手机-设置.png | 26450 | `ed33ab03b89325d4d219684fc7c8a174c700cbc4e7a7853791a467b41cde6b54` | SET2-05; directory/group sequence, compact controls |
| 19-深色-输入档案.png | 152600 | `e20304ffbc421169a0c2d2fe6e553835effae533a1ad0cea50a5640d5b570d48` | Shared dark-role reference; preserve all page dark states |
| 20-辅助页-修改冲突.png | 93026 | `8aa391a6343005b9fe9661ef9d0dafeed400263b005b7ff455bd6ed397cb54ce` | BNS/SET2-02; entity-specific human conflict, not generic overwrite |
| 21-辅助页-同步.png | 71575 | `4aae66d41e882033bdf603a5d63f8ebe12f390d9920a6517937da829f61a05ee` | BNS/SET2-02; actual availability and complete retained Sync goals |
| 22-辅助页-AI连接.png | 50310 | `28f1d8d590d090483aada494a9c6da3d15f2372cac0e3df2e3b33e34ffe3412b` | CTX4-06/07; Context-owned connection, not Settings permissions |

Standalone supplied pictures named PAIA_白色精修_思想库 / AI上下文 / 输入档案 / 设置 / 收录许可 match package 01 / 03 / 08 / 10 / 14 respectively. One screenshot or example count never reduces the full retained functionality, state matrix or scale tests.

## 4. Prototype limitations and production adaptation

The source retains earlier HTML/CSS plus later refinement blocks. Read final styles and revised renderers, not an initial declaration or a hidden old sample element. Production must use its original AppShell, domain stores, EditorSession, query/history/permission owners and real semantic tokens. The iframe/base64 navigator, cached demo frames, postMessage bridge, localStorage enums, sample activity clock, simulated source/client/cloud states and inspection hooks are not the architecture.

The 79/79 reported synthetic checks, zero recorded page errors/HTTP requests, and eight 200%-text horizontal checks retain only their stated environment and scope. They do not prove production persistence, cross-tab/CAS, full accessible behavior, physical IME, correct activity over real imports, full-corpus retrieval, purge/recovery, live AI quality, automatic provider recovery or real client revocation. Earlier negative/corrected prototype observations remain in the unchanged notes/report.

Keep prior Topic sparse/long/144-item coverage; all Context 22 original state classes and subsequent move/preview/connection cases; Archive's ten original visual-state classes plus all nonpictured behavior/error/time/recovery cases; all Settings/auxiliary state classes and BNS's full adapter/state matrix. Previously removed Home snippets/counts/manual sorting/reading samples/tour are not revived merely because old pictures exist. Unpictured legitimate operations continue through their real owners and receive the shared white/dark roles.

Readability/accessibility and actual source/release evidence outrank incidental small targets, low-contrast or demo-only details. This approval is a final visual target, not runtime acceptance. No original source data, credentials, fonts, production code, test/CI, version, website, live service, local Mac or installation is changed by this documentation integration.
