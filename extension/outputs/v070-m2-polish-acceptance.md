# PAIA v0.7.0 M2 UI polish

基线：`48b3405` / `checkpoint-v0.7.0-m2-library-documents`。独立分支 `codex/library-documents-v070-m2-polish`。本轮只做获批 UI polish，不重新设计 Library。

## 改动范围

- Entry 默认阅读保留用户标题/正文、极弱 Type，以及仅异常存在时显示的来源提示。低频操作收进 hover/focus 出现的 `···`：备注、来源、版本历史、添加主题、移动章节、排序、移出主题、删除、位置版本。已展开备注/来源在鼠标移开后仍显示；主动收起后回到安静阅读状态。
- Section heading 仅 hover/focus 时显示 `···`，提供原有 rename/merge/reorder/history。
- Topic 顶部保留“写下内容”“新建章节”；pin/unpin、merge、Topic history 移入弱 `···`。Undo/Redo 快捷键保持，视觉按钮只在正文编辑或按钮自身焦点内弱显示。
- Library Index 保留正常主题视图、搜索、创建与“未归入主题”。已删除内容和索引维护移至 Settings → Thought Library → 内容与维护；原有版本对话框可从 Settings 正常打开并恢复。
- 普通来源 UI 使用“来源已更新”“引用的旧版本已不可用”“来源已移除”等自然语言。引用/当前版本数字仅在另行展开“高级详情”后出现。
- 未加入 synthetic/debug/测试数据生成的 runtime 控件。合成数据与截图仅存在测试/验收产物；internal build 版本标识沿用基线。

## 不变项与边界

`core/`、`background/`、`adapter/`、`content/`、`manifest.json` 与 `48b3405` 完全一致；IndexedDB v5 / 37 stores 不变。`ui/library.js`、`ui/library-entry-editor.js`、`ui/editor-primitives.js` 未修改。所有数据命令、字段保护、CAS、删除/suppression、purge fence、revision retention 与恢复仍使用原实现。

未使用真实私人数据、未部署日常 PAIA、未接入或调用 AI Provider、未发布/升级包、未进入 M3。原 M2 worktree 与 tag 保持不变。

## 验证

**最终全量 592 / 592 passed，0 failed / 0 skipped。** Adapter contract 95、unit 339、browser E2E 115、privacy/security 43。M2 的 9 项 headful Chrome 测试及既有 7 项 Input/IA 编辑回归全部通过。3430 package guardrails / 82 runtime resources 与 development privacy/permission/network audit 通过。

[完整测试摘要](v070-m2-polish-tests.json)。`fullSuite=true`、`auditPassed=true`，测试输入 SHA-256 与最终源码一致：`e400362beee1f26ffd3fbdbfb8b5ebde5d1c97f2b403a437ce6681cebeccaacc`。所有 M2 可见 Chrome 测试断言 page errors = 0、extension network requests = 0。

可见 Chrome 使用全新临时 profile 与 synthetic fixture；截图是实际 UI，未修改 DOM/CSS 来伪造效果。

新增验收覆盖默认工具隐退、hover/focus、Tab/Enter/Escape 菜单交互、焦点返回、备注/来源展开保留、Topic menu、编辑态 Undo/Redo、Settings 删除恢复和索引维护。原有 M2 操作、Input Archive、来源安全及其他回归一起运行。

多段落 Undo/Redo 采用真实增量键盘输入，以持久化正文验证前后完整往返；测试避免用自动化全量 fill 重写多段落时的空行转换作为预期。编辑器行为未改动。

## 截图

| 文件 | 实际状态 |
|---|---|
| [01-empty-index.png](v070-m2-polish-ui/01-empty-index.png) | 空库 Index，无低频维护栏 |
| [02-reading.png](v070-m2-polish-ui/02-reading.png) | 连续阅读：默认不显示 Entry/Section 工具 |
| [03-entry-menu.png](v070-m2-polish-ui/03-entry-menu.png) | Entry hover/focus 菜单展开 |
| [04-expanded-details.png](v070-m2-polish-ui/04-expanded-details.png) | 备注与来源展开后保留 |
| [05-section-menu.png](v070-m2-polish-ui/05-section-menu.png) | Section heading 菜单 |
| [06-topic-menu.png](v070-m2-polish-ui/06-topic-menu.png) | Topic 的 pin/merge/history 菜单 |
| [07-library-index.png](v070-m2-polish-ui/07-library-index.png) | 正常 Index，只保留普通入口 |
| [08-settings-management.png](v070-m2-polish-ui/08-settings-management.png) | Settings 中的已删除内容、恢复和维护 |
| [09-source-natural-language.png](v070-m2-polish-ui/09-source-natural-language.png) | 来源自然语言，技术版本默认不显示 |
| [10-source-advanced.png](v070-m2-polish-ui/10-source-advanced.png) | 主动展开高级详情后的技术版本 |

## Checkpoint

本地标签：`checkpoint-v0.7.0-m2-ui-polish`。指向包含本报告的提交；具体 hash 由交付消息与 Git 标签给出。完成后停止在 M2。

原 M2 worktree 已核对仍为 `48b3405` 且 clean；polish 提交后另行核对工作区 clean。

## 实际文件

运行时代码仅修改 `ui/thoughts.js`、`ui/archive.html`、`ui/archive.css`、`ui/archive.js`。新增菜单 Escape 的静态审计许可严格限于 `ui/thoughts.js` 的 `menu.addEventListener`；未放宽页面捕获规则。更新 `tests/thought-m2-e2e.test.mjs` 的菜单路径并增加两项验收。其余变更为 AGENTS、README、PRODUCT_SPEC、PRIVACY、TEST_PLAN 和本轮验收产物。
