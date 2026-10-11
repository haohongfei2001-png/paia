# D · Supersession Map

**SETTINGS-CV2-1.0：只替代冲突的 Settings 产品/呈现，不抹掉历史证据。**

| 旧项 / 旧解释 | 最终位置 | 处理与兼容 |
|---|---|---|
| 输入与采集 / 内容与收录 | 输入档案 | 改名，强调过滤不决定保存。 |
| 自动保存 / 暂停捕获 | 输入档案 → 保存我的 AI 输入 | 同一 enabled/consent；不读草稿或完整回复。 |
| Smart Filter 轻度 / 关闭 | 输入档案 → 智能过滤 | light/off 映射开/关，保留人工保护。 |
| 检查未处理历史输入 | 内部维护 / 真实故障恢复 | 不常驻设置，不删除必要底层能力。 |
| 查看过滤内容 | Archive 范围发现 | 不归入“已移除”。 |
| 发送时间 | 阅读与外观 → 时间显示 | date_and_time/seconds 映射标准/详细；旧 date_only 保持现有分钟可见兼容。 |
| 时间标签 / 弱化 / 标准 | 无普通设置 | 固定安静可见；保留旧字段兼容，不意外写覆盖。 |
| 字号 px | 阅读与外观 | 四档小/标准/大/特大，21px 不丢。 |
| 宽度 px | 阅读与外观 | 紧凑/标准/宽，原 640/680/720 不 reset。 |
| 减少动态效果“跟随系统”独立行 | 系统行为 | 无选择且无必要目的地，不单列行。 |
| 档案窗口顺序 | Archive Navigator | 同一 paia/source preference，保留可靠性回退。 |
| AI 服务“尚未开放” / Membership | 删除 | 不展示空服务/购买占位；真实服务仍不可用。 |
| AI 与提示词 → AI 上下文 | 保留唯一入口 | 只读状态＋Context route。 |
| 隐私与访问 → AI 访问 | 删除 | 不再双入口。 |
| local-only / 外部连接开关 | Context 的限制与连接 owner | UI 退出，限制不删除；新可达撤销链完成前保留安全兼容。 |
| 撤销连接与临时授权 | AI Context 内的连接/受限兼容 | 不在 Settings 维护第二份状态。 |
| 隐私 → 数据存储 row | 隐私组极轻本机事实 | 不伪装可操作行。 |
| 数据 → 本机存储 | 数据与恢复 → 存储空间 | 一个占用/详情目的地。 |
| 设备同步不可用行 | 删除 | 不为未来云能力占位。 |
| 隐藏内容预览 | 隐私与访问 | 保留，同一 flag；长解释进帮助。 |
| 支持网站 / host strings | 隐私与访问 → 支持的网站 | 展示服务名与真实支持，不等于 AI 连接。 |
| 历史导入 / Onboarding 重复块 | 数据与恢复 → 导入历史输入 | 一个 flow；Onboarding 自身保留。 |
| Backup restore | 从已有 PAIA 备份恢复 | 选择/校验/预览/冲突/确认；空库/合并/替换真实适用；不生成备份。 |
| 原备份错误接管全设置页 | 原恢复流程内局部失败 | 保留组导航与可用档案，不据错误创建新管理页。 |
| 恢复思想 / 移除主题 / 移除内容 | 已移除的内容 | 入口合并；Input、Topic、Entry、Placement 命令不合并。 |
| 待确认与已移除输入 | 拆分 | 待确认归属留导入结果/Archive；已移除进入统一发现。 |
| 恢复旧版数据 | 仅真实待处理时可达 | 不常驻正常设置，不取消遗留恢复。 |
| 版本历史 / 自动保存 / retention / prune | 内容本身 | Settings 连“了解版本历史”都删除；历史能力与策略保留。 |
| 原始来源记录 | 数据与恢复 | 保留现有真实来源阅读入口。 |
| 永久删除数据… | 删除抽象入口 | 合法永久删除在具体 Source 上；真实影响预检/B-02 保留。 |
| 数据完整性 / 索引修复 / Diagnostics | 条件式 Recovery | 真实故障才出现；超时不视为损坏。 |
| Prompt reuse inert row | 相关组内轻量适用事实 | 无未经定义的总开关，不复制 Prompt manager。 |
| 下一句建议 | AI 与提示词 | 默认关，真实 Stage 3A owner 提供 enable/revoke。 |
| 重置悬浮按钮位置 | 次要动作 | Prompt owner position-only；不改 open、prompt、pin、hidden、顺序。 |
| 关于的版本 / 更新 row | 轻量实际元信息 | 有真实更新动作才展示；不伪造“已是最新”。 |
| 高级兜底、设置搜索、Topic/Prompt 管理 | 删除 / 留真正模块 | 不建第七组，不让未知节点自动进入普通 Settings。 |

## 旧设计与证据

D6.2 Settings S01–S05 及 D7 Settings 对应呈现、横向分组/窄屏 select、旧 Settings IA 正式由本次目标替代；共享主导航、字体、颜色、focus、分割线、暗色与其他空间的角色继续有效。旧 PRODUCT_INTENT 第 15 节 / PRODUCT current-scope 中“Settings Membership / AI service”只是此处 UI 被替代，不能误解为真实 AI 服务已实现。

旧 D7 设计图、实现报告、测试注册及失败/PASS 保持原始记录。后续生产实现应把冲突的 UI 断言替换为等效或更强的新断言，不删除整套安全测试或把失败改写成通过。

前一版设计包保持不变；v2 包只包含本轮修正后的当前目标。本轮样机复验记录及其一次键盘焦点失败/修复保存在 E 和 prototype-checks.json，不提升为 production certification。

## 开发集成

采用记录、完整开发计划、视觉引用分别使用 `SETTINGS_CONSUMER_V2_ADOPTION.md`、`SETTINGS_CONSUMER_V2_PLAN.md`、`SETTINGS_CONSUMER_V2_REFERENCES.md`。canonical AUTHORITY/UX/MASTER/STATUS 接入同一队列；更新前 STATUS/MASTER 通过原 blob 保存精确快照。当前唯一下一开发任务保留 `CPV1-TOPIC-01`：完成已合并身份基础的 exact-main 完整验收与 canonical 收尾，不重复开发已合并代码。Settings 不是第二条并行“下一项”。
