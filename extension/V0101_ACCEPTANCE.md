# PAIA v0.10.1 验收报告

1. **遗留修复**：v0.10.0 targeted 21/21 通过；修正 freshness 与语义 current 混用、长文相关摘录与候选内存边界、移除后残余冲突提示。没有改动事实数据库架构。
2. **名称迁移**：一级导航、Settings、面包屑、预览和诊断统一 AI Context / AI 上下文；内部 memory namespace/route/class 保留。
3. **Retrieval**：先完整资格检查，再正文/Topic/Section 并行词面信号；NFKC、phrase、2/3 字 n-gram、有限弱单字重叠，Topic 不是 Entry 召回前置门槛。
4. **Ranking**：相关性先于人工、置顶、证据与时间。无关条目不能仅因新近或置顶高排；多授权路径选与问题更相关的 Topic。
5. **Currentness / conflict**：日期与人工编辑不等于当前；只对明确原话标当前表述。历史/假设/疑问/混合叙述保守标记；不同观点没有替代证据时显示状态未确认，不推断 superseded。
6. **Dedupe / composition**：同主题/章节/标题/类型/时间/状态的相同完整候选合并并保留全部 evidence；截取过的长条目不合并；人工确认/编辑优先作为重复项来源。章节与条目标题随正文提供，保留其中的条件。不同条件、否定、历史阶段不合并；AI synthesis 不默认外发，仅用于已验证证据的排序辅助。
7. **Builder**：三档硬预算保留；最多 2000 字候选摘录，按条目预算选择相关窗口；不生成新用户结论，不建立独立正文库。
8. **Preview**：连续阅读，弱显示状态/时间/来源/选择原因；无 score 等调试字段。仅本次移除与长期排除保持独立；1440/768/390 视觉与无横向溢出检查通过。
9. **授权与总开关**：Settings 外部开关关闭时后端禁止 Copy/Markdown；本地 Build/Preview、授权、Input/Thought 与 Backup 可用。重新开启不扩大 Topic 授权；never/Entry/Section/session 边界保留。
10. **Profiles**：只有默认 Profile 时隐藏普通选择框，可直接输入问题、Build、Preview、Copy；高级 CRUD/CAS 和草稿保护保留。
11. **Provenance**：每项可回到 Thought Entry/Topic/时间；不回读已删除 Source 正文。
12. **Benchmark**：固定 60 Topic / 1200 Entry / 240 query（120 deterministic + 120 held-out wording）。整体 Top‑1 83.33%→87.50%，Top‑3 85.42%→95.83%，MRR .8565→.9101，Recall@10 100%→97.92%。改写组 Top‑1 66.67%→75%，Top‑3 70.83%→91.67%，MRR .7130→.8201，Recall@10 100%→95.83%。精确查询 Top‑1/Top‑3 保持 100%。同一 fixture hash，未修改标签以迎合结果；另仅变更类型标注复跑，事实/偏好/决定/判断/计划各 48 个正向查询，指标一致，见 typed-benchmark.json；正文、问题与 relevance labels 不变。见 benchmark-comparison.json。
13. **能力上限**：只有 local lexical/structural relevance；真正无共同词面的同义改写仍会漏检。合成 held-out 措辞由本任务编写，不是独立盲评；指标不是实际用户满意度。停止加规则，无 embedding/语义引擎。
14. **隐私**：权限门禁在正文读取前，Source/Input 正文读取为 0；denied/exclusion/never/tombstone/失效依赖自动测试通过。Context Build/Search/Preview/分享准备 0 Provider/0 API；无新权限、后台请求、自动重试。合成助手/凭证标记无泄漏；真实账号/Key 未访问。
15. **Performance**：两种 5000 Entry 分布通过（500 Topic×10 与 5 Topic×1000）；实测详见 performance.json，均低于 15 秒构建、500ms UI 延迟阈值；另保留旧 50/500/1000 Topic 回归。
16. **Migration**：冻结 v0.10.0 同一扩展身份升级，已有 allow/exclude 保留；旧 config 缺字段默认 true 保持先前显式分享能力，绝不授权新主题；重复安全，事务中断回滚。IDB 5 / Thought 2 / Memory meta v1 不变；旧版本连续升级回归通过。
17. **Backup / Restore**：保存 switch、授权、排除和 Profile；关闭外部开关仍可备份；false 空库恢复保留，旧备份继续接受；无 API Key、session grant、query 或 Context 正文缓存。
18. **Tests**：固定代码完整回归 1011/1011，0 fail / 0 skipped；静态包门禁、development privacy/permission/network 审计通过。首次主动中止回归不计入通过；初始测试调用字段错误有单独记录；旧的 1010 项通过及两次主动中止未替代最终门禁；初次 release 紧接编辑构建遇到安全 MEMORY_STALE，正式测试增加只读版本稳定等待后重新完整验证，未新增产品重试逻辑。
19. **Journeys**：A 允许→query→preview→实际复制→来源；B Entry exclusion；C 外部 off；D 明确当前/历史；E 无替代证据不宣布 Current；F Profile scope；G edit→stale→rebuild；H 隐私门禁均有自动覆盖。当前语义/冲突的精确规则由单测覆盖，Chrome 另覆盖新近历史叙述、明确当前与旧预览失效。
20. **Regression**：Capture/Input Archive/Smart Filter/Thought Library/Original/AI Organizer/History Completion/Backup/Revision/Search/v0.9.x UX 与 v0.10.0 数据安全全回归通过。均为合成隔离环境，不声称私人 ChatGPT 登录页面实测。
21. **Package**：internal/release 目录与 ZIP 共四产物已生成；实际产物 13/13 测试通过，0 fail/skip。sourceCommit `46a4bf0f164dd5c4c2f8041d3c4058bc752ad140`。路径及逐文件/ZIP SHA-256 见 artifacts.json。
22. **Deployment**：已部署 `/Users/hhf/Documents/Codex/2026-09-05/chrome-manifest-v3-personal-ai-input/outputs/Personal-AI-Input-Archive`，0.10.0 → 0.10.1，140/140 文件与实际验收 release SHA-256 相同；权限/CSP 不变，没有读写私人数据库、卸载、改 identity 或自动重载原扩展。见 deployment.json。
23. **Checkpoint**：最终交付使用 `checkpoint-v0.10.1-ai-context-quality`，最终 commit 由该 tag 解析。交付 worktree 提交后核验 Git clean；原工作区既有改动保留，71 个旧冻结 refs 不变；不 push。
24. **已知非阻断项**：Recall@10 有上述下降；语义与高重叠近义去重仍保守；最多扫描 20000 placements，会提示部分结果；备份恢复沿用空库、64MB/100000 项限制。新 config 写入后不建议直接运行旧 v0.10.0 parser 降级。
25. **用户唯一操作**：在 Chrome 扩展管理中重新加载原 PAIA 扩展一次。

证据目录：outputs/v0101-acceptance。完整 gap audit：V0101_GAP_AUDIT.md。当前产品契约：AI_CONTEXT.md。
