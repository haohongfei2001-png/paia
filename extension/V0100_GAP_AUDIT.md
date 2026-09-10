# v0.10.0 Full Gap Audit

基线 d64e850 / checkpoint-v0.9.2-product-hardening，Git clean。日常 v0.9.2 release；既有 968 全回归与 29 实际产物检查通过，未发现新 P0。独立工作区不改冻结状态。物理 IDB 5/local schema 6，Thought Entry schema 2；现有 meta 可容纳新的版本化授权而无需改表。

| 需求 | 级别 | 初审与实施决定 |
|---|---|---|
| 0–10,40–45,57,67,75,77 | P0 | 空壳/旧 memoryContext 固定关闭；增加保守授权、全局 Entry 排除、只读门禁、明确 Copy；不复用旧宽泛 policy |
| 11–25,28–32,36–37,54–59 | P0 | 新独立本地 Context Builder；复用 Thought 模型/NFKC，先授权后正文，预算、来源、freshness/分享再校验 |
| 26–27,38–39,46–50 | P1 | 默认+自定义 Profile、简短指令、有限活动可清除、session-only allow；不存 query/context 正文 |
| 51–53,55–56,72–74,85–89 | P0/P1 | 首页/授权/预览三层、返回与空态、键盘响应式，复用产品状态 |
| 33,35,71 | P2 | 不做注入/AI压缩/普通搜索授权标记，保护核心范围 |
| 60–66,68–70,76,78–84,93–94 | P0 | synthetic A–F、隐私硬不变量、50/500/1000 Topic、版本化备份兼容、冻结迁移、全回归 |
| 90–92,95–99 | 交付 | 290分钟/末20分钟冻结、四产物、唯一日常目录、指定checkpoint、Git clean/no push、27项最终报告 |

备份优先保持 v1 sections 不变，在 organizationState 中白名单扩展 memory 行。restore 仍空库且保护任何现有授权配置，不能静默覆盖较新的 Memory 设置。安全相关测试先于实现或以故障注入验证。
