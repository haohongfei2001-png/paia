# PAIA v0.10.0 — AI Memory MVP 验收

基线：`d64e85036dea641e96fd9877172d168826a7ad29` / `checkpoint-v0.9.2-product-hardening`。
本轮在独立 `codex/ai-memory-v0100` 分支完成；冻结版本未修改；日常用户数据库未访问或修改。

## 需求落地

| 范围 | 完成行为 | 可核验证据 |
|---|---|---|
| 定义与持久模型 | Thought 上的授权/上下文层，meta namespace v1，无正文副本 | AI_MEMORY.md；memory-safety 测试 |
| Topic/Entry/Section | 默认未授权；长期允许、拒绝、跨 Profile 永不提供；全局单条/章节排除 | 核心隐私测试；scope-ux.json |
| 临时范围 | storage.session；Worker 重启保留，session 重置失效 | journey-cd.json |
| 本地检索 | Topic/Section/Entry + 证据一致的已有 AI 综合；门禁先于 Thought 正文读取 | memory-safety / ranking；performance.json |
| 当前性与冲突 | 人工/有效/置顶/依据/时间排序；旧表述不猜测替代；编辑后旧预览停用 | journey-cd；ranking/current evidence 测试 |
| Context Builder | Provider-neutral、0 API、确定性截取/去重/预算 | 三档预算硬限制测试 |
| Preview | 连续阅读、类型与时间、来源回跳、选择原因、仅本次移除 | journey-abf；ux.json；截图 |
| Copy / Markdown | 明确点击后重新校验；真实 Chrome 写入 clipboard、实际下载 Markdown | journey-abf / ux；未读取 clipboard |
| Profiles / 设置 | 默认 + 自定义 CRUD、详细度和简短使用偏好；CAS 冲突保护草稿 | scope-ux；profile 生命周期测试 |
| Activity | 时间/摘要哈希/IDs，无 query/context 全文；清除与保留期 | metadata 不变量测试 |
| Migration | IDB 5 / logical 6 不变；事务初始化可中断重试；原实体逐字段相同 | migration-v092.json；崩溃测试 |
| Backup / Restore | Backup v1 扩展白名单；空库恢复权限；较新非空配置拒绝覆盖 | journey-e；旧 Backup 兼容测试 |
| Integrity | 增加授权/Topic/Entry/Profile 引用检查，只读 | integrity 故障注入 |
| 既有功能 | 保留 v0.9.2 Settings/阅读排序/单一版本入口/局部错误/主页收口 | 完整回归与实际产物回归 |

第 1、2、4 次完整运行因代码复核主动中断，均不计为通过。补齐异常预算值校验与活动列表的来源删除保护后，核心针对性测试 20/20 通过；第 3 次完整运行 993/996，3 个失败分别为完整性类别旧断言、剪贴板旧禁用契约及快速操作组合时序。已补 Profile 表单初始化/焦点保护、取消过期搜索去抖，并为明确 Copy 写入保留唯一白名单；新增受控 500 ms 延迟与去抖周期断言。25 项核心/隐私/完整性测试、6 项产品/Memory Chrome 复验及最终焦点检查通过。之后统一跨 Profile 永不提供/临时状态与布局变化后的有效授权，增加核心与 Chrome 断言；26 项针对性检查与 5 项 Memory Chrome 旅程通过。最终完整运行单独记录，不拼接局部结果。

## 验证范围与已知边界

所有浏览器证据使用独立、合成数据 Chrome，不读取真实用户配置或 Key。Copy 验证拦截参数并调用真实 writeText；从未读取系统 clipboard。浏览器会话失效通过清除该 synthetic storage.session namespace 并刷新验证，未伪称真实日常浏览器重启。

Source direct body / assistant / denied / excluded / tombstone / credential 泄漏测试均要求为零；Memory 没有 Provider 调用入口。原 AI Organizer 的测试可使用明确点击的 deterministic provider，不代表真实付费请求。

词法检索不是语义推理；token 为估算；20k placement / 每主题 8 项 AI 综合 / 20 Profile / 1000 批量授权上限；预览 15 分钟且保守 generation 失效；恢复仍为空库/64 MB/100000 项。P2 自动注入、AI 压缩和普通搜索权限标记未实现。

## 发布记录

完整源码回归 **997/997，0 fail / 0 skipped**；分类 unit 670 / browser 183 / adapter 95 / privacy 49。当前摘要 `9592a50cf4190500cf04d6fe7e5e4c2fcec6cdbe886dac08eb10f8e8fc71cafd`；源码、开发与兼容性门禁通过。

| 主题 | Thought 条目 | 本地构建 | UI 最大额外延迟 | Source 正文读取 |
|---|---:|---:|---:|---:|
| 50 | 250 | 0.123 s | 6.7 ms | 0 |
| 500 | 2500 | 0.743 s | 1.7 ms | 0 |
| 1000 | 5000 | 1.239 s | 1.3 ms | 0 |

测试原始回执集中于 `outputs/v0100-acceptance/`。实际包验收、部署和 checkpoint 回执在下节追加。

## 实际产物与日常部署

- 实现提交：`aa5d850bc2aed677cfb3ec2672b79ecf11e8f866`。源码完整回归 **997/997**；实际产物 **11/11**（共用产品合同 1、internal Memory 5、release Memory 5），均为 0 fail / 0 skipped。
- 真实产物复验补齐空库首页与 Entry 排除前/后同一薪资查询对照；Copy 实际写入，未读取 clipboard。原有导入、阅读、显式 Organizer、Backup 同时通过。
- internal / release 均生成 unpacked + ZIP；ZIP 逐文件核对与 SHA-256 通过。源码/内部/release 门禁分别为 6378 / 6430 / 5966 项；release 无开发重载、诊断探针或 fixture。
- 原目录已从 **0.9.2 升级至 0.10.0**：`/Users/hhf/Documents/Codex/2026-09-05/chrome-manifest-v3-personal-ai-input/outputs/Personal-AI-Input-Archive`。**139/139 文件 hash 相同**；权限/CSP/content scripts 不变；未卸载、创建新日常 identity、读取/修改私人数据库或触发真实 Provider。
- 冻结 v0.8.0 / v0.8.1 / v0.9.0 / v0.9.1 / v0.9.2 checkpoint 均保持不变；v0.9.2 工作区 clean。原工作目录在日常 assets 以外的既有 Git 变更完整保留。
- 最终本地 checkpoint：`checkpoint-v0.10.0-ai-memory-mvp`，交付分支 `codex/ai-memory-v0100`。checkpoint 后核验交付工作区 Git clean；未 push。最终 commit 可由该 tag 解析。

| 产物 | ZIP SHA-256 |
|---|---|
| internal | `ac2d4d087b194f0d479f8f2712fa367e1bda73577ca12971800a64f51dec2a5e` |
| release | `97cb90681eadb6bc8c18b5750ee53530534f9e9c8a26bba404c5885622bfd1b4` |

可核验回执：`outputs/v0100-acceptance/full-summary.json`、`actual-artifact-tests.json`、`artifacts.json`、`deployment.json`、`preservation.json`。实际包复验脚本与截图亦保存在该目录。

用户唯一操作：在 Chrome 扩展管理页，对原来的 PAIA 扩展点击一次“重新加载”。无需卸载或另装，AI Memory 无需配置 Key 即可使用。
