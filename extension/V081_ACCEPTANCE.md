# PAIA v0.8.1 — Daily Use, Reading Experience & Reliability

状态：CLOSED / FROZEN。完整当前回归、实际产物复验与指定日常文件部署已完成。授权运行起点 2026-09-08 04:00:26 UTC；硬截止 07:50:26 UTC。独立 worktree / `codex/daily-use-reliability-v081`，从冻结的 `b1708bd8139a31e35f6e7bf6a14d3907056cde83` 开始。未访问日常私人数据库、真实 Key 或登录页面。以下报告区分实装、合成验收和真实环境限制。

1. **承接 v0.8.0。** 审计确认 AI canonical contract、缓存持久化、Topic Grid、质量建议和单次成本约束已实装。补齐 Settings 失败状态在后续成功后清除、人工合并旧名的 canonical redirect，以及无效旧 AI cache 中人工保护字段的显式独立内容恢复。历史 INVALID_SCHEMA 原始响应和真实 DeepSeek 结果没有证据，仍不宣称实时云端验证完成。

2. **Reading UX。** 正文最大宽度 760px、18px/1.95 行高；章节结构、克制间距、无 Entry 大卡片边框；正文直接编辑、弱自动保存状态、hover/focus 管理菜单、来源折叠。空标题显隐保持占位，避免焦点变化引起滚动位移和连续新增点击丢失。章节目录能载入不在当前页的内容；原话/AI 主题内查找全在本机。

3. **时间排序。** 正序默认，支持全局记住倒序；只在 Section 内排序，优先实际发送时间，缺失时取 capture/created fallback。不会按 AI 更新时刻重排原话，不改人工 placement rank。月份为弱分隔；精确时间在 provenance。40 条分页，时间/成员变化使旧游标失效，避免跨页重复或遗漏。

4. **智能摘要。** 默认 Grid 从已有正文选取代表片段，优先用户编辑/保护、完整且较新的内容，轻裁剪不代写画像。人工主题摘要优先。AI prompt 要求有信息的短摘要、接近第一人称思想的自然表达、区分事实/决定/疑问/暂定可能，并利用有限 Entry 表达时间区分当前状态与可能演变。

5. **AI Reading。** 当前理解、核心信息、决定、偏好原则、判断、待解决问题与可能变化；空字段不显示“暂无”。独立缓存、证据与人工字段保护保持；开关记忆、位置稳定、260ms 轻动画、零 API。无效生成缓存隐藏，只有人工保护字段可经明确点击保留为独立用户内容。初始化偏好迟到时，本次明确切换/排序操作优先，不会把刚选的视图回退。

6. **连续整理。** Original 明确选择 1/3/5 次请求、最多 50 Inputs；AI 默认一个主题，可授权最多 3 个不同主题/3 次请求。持久请求预留与进度分别和预算/内容提交共用事务。错误、部分结果、取消、授权页面关闭、worker 重启或 outcome unknown 均停止后续请求。无自动续跑、重试或第六次请求。

7. **成本控制。** 普通两类更新各最多一次请求。共享默认 20 次额度、可设 1–200；沿用 24 小时窗口并显示重置时间，不在午夜静默扩大额度。保留现有输入数/字节/并发限制。失败或未知请求不退额；高级区分别显示 Original、AI 与失败/中断计数，不存请求正文。

8. **备份/恢复。** PAIA Backup v1 / UTF-8 NDJSON，明确领域 schema、版本/日期/分区/数量与 SHA-256 完整性链；分块生成。含可恢复的工作层、来源/证据、保护、主题组织、抑制、重要修订、完成的合并历史、必要检查点/设置；无 Key、运行任务或 raw index。校验→预览→明确确认后，以一个 strict IDB 事务恢复到空库；失败全部回滚，设置补写可重启恢复。最大 64 MB，现有工作与已知墓碑冲突均拒绝。详见 BACKUP.md。

9. **Topic 治理。** 相近主题只建议，不自动合并；用户选择保留主题，旧主题 redirect，后续 AI 旧名归入 canonical。短操作型名称只建议，经确认改名，人工命名不覆盖。Grid/Topic ··· 提供 pin/rename/merge/delete/export。删除 Topic 只移除容器/成员，正文进入“未归入主题”；Settings 可恢复。Markdown 默认不含 AI，可明确选择包含已保存 AI 内容。

10. **Settings。** 普通层提供 Key、批次/预算、备份、Revision、Smart Filter；技术错误、phase/HTTP/bytes/trace 在折叠详情。新手说明明确本机原话优先与 AI 综合的区别。版本入口在 Topic ···，区分用户/AI/删除/恢复/合并。Release 移除主动探测与旧任务调试入口，保留有用的只读错误详情和使用审计。

11. **Tests。** 最终当前输入完整回归 867/867 通过，0 failed / 0 skipped；adapter contract 95、unit 584、browser E2E 144、privacy/security 44。前三次完整运行发现的问题及全部修复记录保留于 outputs/v081-acceptance/regression-fixes.json。最后一轮输入 digest `8bb87c27403d4f145d29698bafcfbcd736b773855e9cb3c14701edcc68b04618`；源静态审计 4,862 项 / 113 runtime resources，release 4,450 项 / 106 resources，开发入口审计通过。

12. **Long-term E2E。** 500 合成 Inputs、30 Topics、360 Entries，含 20 个人工编辑、移除 Input、永久墓碑、stale AI、重复主题和重要修订。Node 验证合并/备份/恢复后的正文、人工保护、provenance、重要版本及合并前布局恢复；visible Chrome 验证真实备份文件下载、非空库保护、空库预览恢复和重启后检索。另有 300 Entry Node 分页、150 Entry visible Chrome 跨页目录。精确耗时以输出 receipt 为准，全部为合成测量。

13. **Migration。** 用冻结 v0.7.2c (`102160d`) 与 v0.8.0 (`b1708bd`) 程序创建非空 schema，在同一隔离扩展 ID 中升级。旧删除清理完成后逐表比较来源/时间/墓碑/Input/人工 Entry/Topic/placement/provenance/revision；无效部分 AI cache 安全 stale，重复读取幂等，升级零 Provider。原 v3/v4 非空字段、部分阶段/失败重跑测试保留。v0.8.1 物理 schema 仍 5，没有新增破坏性迁移或日常整库副本。

14. **Privacy。** manifest 仅版本变更；storage 权限、唯一 DeepSeek origin、CSP 和 ChatGPT capture/content 代码不变。新备份/治理/有界入口拒绝 content/foreign caller，正文只在可信扩展上下文处理。外部请求拦截计数 0；确定性 Provider 单独计数。任何已下载旧备份仍在扩展之外；全新库无法知道另一个已删除库后来的墓碑，不对外部文件作无法实现的追溯删除承诺。

15. **Package。** internal unpacked/ZIP 与 release unpacked/ZIP；release 排除主动诊断控件、response probing 工具、旧任务控件、synthetic generators、fixtures 与 dev reload。两个结构均通过 visible Chrome 的 capture→Organizer→Reading→Settings→Backup。实际产物复验已通过（actualArtifacts=true）。目录为 outputs/v081-artifacts/PAIA-v0.8.1-daily-use-reliability-{internal,release}，各自同时有 ZIP 与 .sha256。internal 124 文件 / 471,850 bytes ZIP；release 116 文件 / 457,295 bytes ZIP。完整文件哈希见 outputs/v081-acceptance/artifacts.json；安装包源提交 `5e2ac1d8f2881b462e92341491fda69b1f0d54c3`。

16. **Deployment。** 仅允许覆盖 `/Users/hhf/Documents/Codex/2026-09-05/chrome-manifest-v3-personal-ai-input/outputs/Personal-AI-Input-Archive` 的程序文件。已完成 v0.8.0 → v0.8.1 的 rsync -a --delete，旧 114 文件与冻结部署回执匹配后才开始覆盖，新 124 文件与 internal 产物逐个 SHA-256 一致。回执见 outputs/v081-acceptance/deployment.json；未读、未删、未重建 IndexedDB，未卸载、未创建日常新实例，未代用户 Reload。

17. **Checkpoint。** 本地检查点 `checkpoint-v0.8.1-daily-use-reliability`，冻结时要求 Git clean，不推远端。实现与产物源提交 `5e2ac1d8f2881b462e92341491fda69b1f0d54c3`；最终 tag 同时包含交付回执。冻结 v0.8.0 worktree 仍 clean，v0.8.0 / v0.7.2c commit 保持，原工作目录 HEAD 与 136 项已有状态摘要完全一致。元数据见 outputs/v081-acceptance/checkpoint.json。

18. **Known non-blocking issues。** 未使用真实 Key，实时 DeepSeek 语义质量和历史原始报错仍待真实使用核验；恢复仅空库、64 MB，不做与现有库合并；下载 Blob 和恢复暂存仍需与备份大小相关的内存；旧外部文件不受后续本机删除追溯控制；日额度是已有 24 小时窗口。官方 ChatGPT 历史导出 adapter 仍未注册，真实导入继续关闭。未对日常私人数据库作无证据验收声明。

19. **用户醒来后。** 只需在 Chrome 扩展管理页 Reload 已有 PAIA 扩展，再按原方式使用。无需迁移文件、执行脚本、卸载或重新安装。若完全退出过 Chrome，Key 仍按原会话规则按需重填。
