# UI Refresh v1.0 — 文档交付核对

日期：2026-09-15。性质：本次设计档案的交叉检查与GitHub交付记录；不是产品测试报告，也不是新的baseline审查。

## 1. 来源与持久提交

继续使用上一轮已完成的审查、映射与设计。恢复tree `18486af0142582298c2e4e097be1075bb62c97bc`，没有重新启动设计。

开始时重新读取GitHub确认：main和已存在的chrome-ui-refresh-v1均为 `c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`；该ref的extension/docs下仅有ux，尚无ui-refresh。随后只向chrome-ui-refresh-v1写入：

| 提交 | 真实交付 |
|---|---|
| 9fcd1d19a6c6a3d361a41213b34cc651b04b365b | 恢复已有7份文档，parent为冻结main；compare仅7份Markdown；update_ref成功后重新核对HEAD |
| c1a73f3ad464b6b98295810ab138991b5a74934d | 补齐UIR-03、UIR-04、STATUS、Developer Run Prompt；update_ref成功后重新核对HEAD；相对main为11份新增Markdown |
| 包含本报告的最终文档提交 | AGENTS限域指引、计划中的路径文字勘误、STATUS置设计READY及本核对记录；最终SHA从GitHub分支ref解析，不写自引用SHA |

所有分支更新均为普通fast-forward（force=false）。没有向main、ux-r2、overnight写入，没有创建PR或执行merge/部署。完整最终diff须在发布此提交时再经GitHub Compare API核对，它是本次main...chrome-ui-refresh-v1范围核验依据，不把本地无法联网的git命令冒充已经执行。

## 2. 完整文件清单

以下12份均以 `extension/docs/ui-refresh/` 为路径前缀；另有 `extension/AGENTS.md` 的限域执行说明更新。

| 相对路径 | 内容状态 |
|---|---|
| README.md | 完整，权威顺序/分支/四轮入口 |
| BASELINE_AUDIT.md | 上一轮已完成审查原样保留，未重做 |
| CAPABILITY_TO_UI_MAPPING.md | 完整，四图采用/拒绝与真实能力映射 |
| PAIA_CHROME_UI_REFRESH_SPEC_v1.0.md | 完整，上一轮设计裁决保留 |
| PAIA_CHROME_UI_REFRESH_IMPLEMENTATION_PLAN_v1.0.md | 完整，仅纠正文件路径写法、不改设计或轮次 |
| UI_REFRESH_STATUS.md | 完整，设计READY，四轮NOT_STARTED，当前UIR-01 |
| DEVELOPER_RUN_PROMPT.md | 完整，唯一可重复发送的短指令 |
| rounds/UIR_01_SHELL_AND_ARCHIVE_FRAME.md | 完整，沿用已完成任务书 |
| rounds/UIR_02_ARCHIVE_SEARCH_READER.md | 完整，沿用已完成任务书 |
| rounds/UIR_03_THOUGHT_AND_AI_PRESENTATION.md | 完整，补齐所有实施/验收/交接要求 |
| rounds/UIR_04_CONTEXT_SETTINGS_AND_ACCEPTANCE.md | 完整，补齐Context/Settings与最终完整gate |
| DELIVERY_VERIFICATION.md | 本次文档核对记录 |

不存在未补完的设计任务书。UIR_0N_REPORT.md与evidence/UIR-0N/是各未来实施轮必须产出的真实报告/截图，当前没有实际运行故意不创建，不属于缺失设计文档。不以空白报告或旧截图伪装实施完成。

## 3. 相互一致性检查

方法：读取GitHub已提交文档及此次新增全文，逐项交叉比对；核对分支ref和GitHub compare文件列表。下列是文档检查结果，不是自动化产品测试PASS。

| 检查项 | 结果与限定 |
|---|---|
| 仓库/基线/分支 | 一致：haohongfei2001-png/paia、c7d132a…、chrome-ui-refresh-v1；后续entry来自前轮实际提交，不回退基线 |
| 固定轮次和路径 | 一致：01 Shell→02 Archive/Search/Reader→03 Thought/AI→04 Context/Settings/final；四个实际任务文件与README/STATUS一致 |
| 权威与旧流程 | AGENTS新增限域overlay；设计核与信任语义仍有效，旧UX只作能力证据；不会把旧ux-r2/overnight状态当UIR派发 |
| 视觉与真实能力 | 列表无新增snippet查询，页面宽/正文读宽分离，无山水/假统计/taxonomy/固定成长模板，现有可选AI字段不删 |
| 安全与编辑 | Source/Input/Thought、人工保护、候选/CAS、manual/Grant、local-only、externalAccess、purge/tombstone、Backup语义一致保留 |
| 独立可执行性 | 四任务书均有entry/保持项、具体结构/状态/交互、responsive/theme、principal与禁止路径、复用点、命令/journey/截图、完成/失败/回退/report/下一轮条件 |
| 两级gate | 各轮focused+guards+release smoke+真实图/实际视觉检查；04最终完整current suite/release/mandatory CI与矩阵；不额外新建认证体系 |
| 当前测试入口 | 沿用已有UX-R1～R6/current脚本；单文件node --test、分组用现有runner；新增UIR文件必须注册current，不得落入historical；未声称本次已运行 |
| 交付和状态 | 设计READY与实施NOT_STARTED分离；前轮完成才推进，04完成也不授权merge/部署；唯一短prompt与此规则一致 |
| HEAD与证据 | STATUS只存更新前核对快照；实时HEAD经GitHub读取；代码验证SHA/文档checkpoint分开，不追逐自引用hash |
| 内部文档引用 | README的设计/计划/状态/prompt与四轮任务链接均有对应文档；未来report/evidence明确为待实施产物 |

路径勘误仅三处：总计划说明未带目录的运行UI短文件名对应ui/；把含糊的r6-settings.js/css明确为ui/r6-settings.js与ui/r6.css；把test-groups.mjs写明scripts/test-groups.mjs。没有据此重新设计或改变功能。

## 4. 本次验证的边界

本次未改产品代码、测试代码、workflow、依赖、manifest、schema、网站或native-hosts。未跑单元/浏览器/full suite、未创建新视觉after，也未调用真实Provider。旧baseline证据只作继承依据；所有新的实现验证都已写入未来任务书。

最终发布检查只接受12份本目录Markdown加extension/AGENTS.md文档差异；若compare出现其他文件，先修正再更新分支。GitHub已成功写入，不使用fallback ZIP替代本次持久交付。文件完整性以GitHub实际提交/tree/blob为依据，本报告不编造未计算的SHA-256。
