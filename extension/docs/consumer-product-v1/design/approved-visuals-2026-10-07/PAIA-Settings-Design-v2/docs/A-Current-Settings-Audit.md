# A · Current Settings Audit

**Settings Consumer v2 / 2026-10-07 / 最终定向修正**

本轮重新核对远端 main：`29940a921e4797c463a5e7e8436bafe6125f9f1d`，tree `441510f4212e25776cc4175242e6c5cc97da0ac0`。运行包声明 0.12.1；这不是用户本机安装确认。已批准 Context 四卡、Thought PT-1 与 Prompt Reuse 的方向不变。本文件是审计，不表示运行代码已修改。

## 1. 当前真实组合方式

静态 `extension/ui/archive.html#settings-panel` 提供时间、过滤、会员占位、历史导入、旧访问、已有备份恢复、移除恢复、版本和来源控件；`settings-preferences.js:setupSettingsShell()` 动态移动这些节点并把剩余节点收进 Advanced。`r6-settings.js` 又在旧 memory/backup 容器内安装预览遮罩与存储信息。最终样式是 `settings-preferences.css` 与后加载的 `app-shell.css` 共同作用，不能只按一份早期 CSS 实现。

因此当前问题不是缺少圆角或统一颜色，而是不同职责共用旧容器、重复入口、无效占位、正常设置与恢复维护混杂。直接删除 DOM 会破坏仍然硬绑定这些节点的 `archive.js`、SmartFilterUI、r6 等调用链。

## 2. 核实后保留的真实能力

| 能力 | 当前依据 | 最终处理 |
|---|---|---|
| 保存用户已发送文字 | `archive.js` → CONSENT / SET_ENABLED → worker/store | 保留，命名“保存我的 AI 输入”，不改变采集边界。 |
| Smart Filter | `ui/smart-filter.js` 与 FILTER_MODE/STATUS/PROTECT/KEEP | 保留 light/off，显示开/关；编辑保护不能随旧按钮删除。 |
| 字号 / 宽度 | `settings-preferences.js` 的 FONT_PX / WIDTH_PX | 四档 16/17/19/21；三档 640/680/720，保留原值，只改显示名称。 |
| 时间 | timeDisplay / timeEmphasis | 前者简化名称；后者从普通 UI 退役，正文统一安静但可见。 |
| 隐藏预览 | `r6-settings.js:setPreviewMask/syncPrivacy` | 独立挂载到新隐私组；保留读取失败不泄露、失败回退。 |
| 导入 / 备份恢复 | initHistoryCompletion / ImportHandler；BackupPanel / BackupService | 复用真实校验、冲突、暂停继续、确认与激活。 |
| 移除恢复 / 来源 / 版本 | InputReview、TopicController、typed worker commands、OriginalSurface | 一个恢复发现入口，底层不同操作不合并；版本只在内容自身。 |
| 索引或数据修复 | `maintenance-recovery.js` | 当前已按真实问题条件显示，不误报为所有诊断都常驻；保留并改善呈现。 |
| 更新信息 | worker 的 `paia-consumer-update:v1` 事件状态 | 有现成状态事实，不代表已具备完整检查/发布/安装闭环。 |

## 3. 本轮最终减法

上一版 Settings 两处 AI 入口收敛为唯一入口；本机存储与数据存储不再各占一行；版本历史说明也退出 Settings；笼统“永久删除数据”被删除。第一组改为“输入档案”，避免把过滤误读为采集准入。Prompt 的适用状态以及 About 的版本、更新信息改成轻量事实，不伪装成不可操作的设置行。

最终完整目标：20 个主要可操作行，另有 1 个次要重置动作。此数不包含分组目录、事实说明、条件故障、临时对话框或将来真实更新动作；不是要求在功能尚未接通时填满 20 行。

## 4. 容易被误判为已有的接口

当前 Prompt Surface 的 `promptSurfaceV1` 是受 Prompt owner 管理的单站点状态，只有 version/open/position。Settings 不能冒充网页内容脚本调用 HOST。重置位置需要在同一 owner 内增加受限命令，并解决活跃页面缓存位置、延迟拖动写回与重置的竞争。

当前四卡与 Stage 3A 的正式计划不等于 main 已具备可用 runtime。Settings 只显示真实状态；没有连接证据不能展示“已连接”，没有 Stage 3A owner 不能让开关仅在界面上变绿。

当前 Source 已存在具体对象的预检与永久删除保护。删除 Settings 抽象入口不取消这些能力，也不解除 B-02。旧 deny/local-only/revoked 与撤销路径必须安全承接，不是删 UI 时一起删掉。

## 5. 重新读取的依据

主要源：`extension/AGENTS.md`；Consumer Product v1 的 AUTHORITY、STATUS、MASTER_PLAN、EXECUTION_PROTOCOL、PRODUCT_INTENT_CONTRACT、UX_CONTRACT；四卡 PLAN/ADOPTION/REFERENCES；PT-1 VISUAL_AUTHORITY；Prompt SURFACE/STAGE_3A；当前 Consumer Cleanup 历史记录；D7-CURRENT-CERTIFICATION 与 D7-UI-COHERENCE。

实际代码：archive.html、archive.js、settings-preferences.js/css、r6-settings.js、ux-r1-state.js、app-shell.js/css、smart-filter.js、archive-order-settings.js、maintenance-recovery.js、background/service-worker.js、background/prompt-surface.js、content/prompt-surface.js、core/feature-availability.js、manifest/package。

原 D7 的 PASS/FAIL、历史 UI 和旧设计包保持原样。本轮新增的是最终目标与可执行计划，不是重跑了旧生产认证。


## 提交前远端更新核对

最终读取 main `288e17fb7adaf05b63a4af72458c1d6787488e0d`，manifest/package 为 0.13.0。初始 29940a9 审计仍记录其当时事实。新增 Topic-01 身份/人工意图与严格恢复兼容已合并；Settings UI、Context、Prompt 文件未因这批提交变化。回执仍待完整 exact-main 验收与 canonical 收尾，不将“已合并”写成阶段完成，也不重复开发已合并基础。数据恢复对接当前 Topic 身份图、名称围栏及人工组织约束校验。
