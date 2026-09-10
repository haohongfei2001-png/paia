# PAIA v0.7.0 M2 — Library Documents 验收报告

M2 完成；仅人工 Thought Library。实现基线为 M1 `7d5df85`，独立 worktree / branch。未进入 M3。

## 1. Schema reconciliation — PASS

IndexedDB 仍为 v5 / 37 stores。早期的 36-store 估算与最终已批准设计不同：`77176f5` 已包含 `organizerUsage`，即 25 existing + 12 new = 37。[37 个完整名称和对账](../M2_LIBRARY_DOCUMENTS.md#schema-reconciliation-gate--pass)。

`organizerUsage` 预留数值预算、请求预占/结算及无正文审计，是实现辅助设施，不增加 durable product entity、私人正文副本或改变 Source/Input/Entry 所有权。M2 不启用 Provider 预算运行。对账通过后直接继续，没有重新设计 M1。

## 2. 实际修改文件

主要改动：后台接入手工 Library 命令；增加文档读取、局部搜索、计数、编辑事务、组织任务及版本恢复模块；连续文档 UI；抽取公共 editor primitives；补充回归与验收。本文末尾列出相对 `7d5df85` 的完整文件清单。

`core/thought-*` 仅增加 M2 所需默认 Section、字段 CAS、组织版本和安全清理钩子。`ui/library.js` 保留 Input 写入和跨 block 逻辑，事件/计时/Undo 辅助委托给 primitives。Smart Filter 测试文件只更新当前 UI 版本断言；规则未修改。manifest 无修改。

## 3. 自动测试 — PASS

590 / 590 passed，0 failed，0 skipped；其中 adapter contract 95、unit 339、browser E2E 113、privacy/security 43。相对 M1 的 557 项新增 33 项。完整摘要见 [v070-m2-tests.json](v070-m2-tests.json)，32 项用户 gate 对应见 [M2_TEST_TRACEABILITY.md](../M2_TEST_TRACEABILITY.md)。

运行 `node scripts/test.mjs`，包含全量继承回归及静态审计。`fullSuite=true`、`auditPassed=true`；测试输入摘要在测试前后保持一致，并与最终源码再次核对：

`51a5813bc4c2b3c7ed5b8f03a2434eee91239343d6848b2a6864d4ee7764408f`

## 4. Input Archive regression — PASS

提取公共 primitives 之前，先运行既有 workspace/IA 的 7 项 characterization tests；全部通过。提取后及最终全量测试中再次通过同一组测试，覆盖 IME、autosave、Undo、focus、空正文、cross-block 行为。完整套件还覆盖 Source、捕获、Smart Filter 与 History Completion 既有语义。

## 5. Topic / Section / Placement — PASS

纵向索引包含摘要、可见计数、更新时间、pin 和搜索；空库显示自然空态，并允许先写独立 Entry 再加入 Topic。Topic rename 保持 UUID；merge 保留 survivor、旧 Topic redirect。Section 默认项、空用户 Section、rename/merge/order 均持久化。

同一 Entry 在多个 Topic 共用正文，各自保存 Section/rank/protection。人工移出写负向 membership，合并时保留；只有显式用户操作可以再加入。合并按批次暂存组织元数据，原布局可读，事务切换 generation；不复制正文。暂停/重启可以继续。

测试覆盖 merge/redirect/revision restore、Topic pin、Section 操作、独立 rank、相同 rank 分组及跨组精确移动、操作重试幂等。布局恢复拒绝覆盖后续组织修改。

## 6. Editor — PASS

实现 PlainTextSurface、AutosaveSession、UndoJournal、RevisionSession。Entry title/body/note 直接编辑，750ms debounce / 3s max wait，IME、纯文本粘贴、空正文、跨 Entry 原子编辑、Undo/Redo、持久 revision、field protection 均通过。

多标签页不同字段可分别提交；同字段冲突保留本地草稿。IME 期间收到远端更新先延后处理，结束时保留草稿并提示冲突。Source purge 清除相关缓存/Undo，并提升被清理字段版本，旧草稿不能写回已清理正文；不影响其他 Entry 的草稿。保存失败可以重试。

Undo/Redo 是新写入，revision counter 不倒退。持久版本覆盖 LibraryEntry、Topic、Section、Placement；延续 90 天 OR 每实体最近 20 个 important revision。用户 actor 与未来 AI actor 保持可区分。

## 7. Local search — PASS

支持 Entry title/body/type、Topic name、Section title，结果显示 Topic → Section → Entry 路径。同一 Entry 只有一份正文所属索引，不因多 Topic 复制。索引为本地 token postings，没有规范化正文副本。

读取结果再次校验 lifecycle、purge fence、active generation、current owner/search version；移除、来源清理和旧索引不能穿透。重建按每批最多 20 owners / 200 posting mutations 工作，支持断点；UI 明确显示索引未完成/继续查找，不能把未完成当作无结果。

## 8. Delete / suppression / restore — PASS

Entry 删除写 removed lifecycle、revision 和 Thought suppression，从正常文档及搜索隐藏。恢复入口位于低频内容/版本管理，没有新增 Trash 一级页面。删除及恢复不修改 Input Archive、Source Record、Input removal marker 或 Source tombstone；恢复继续受 purge fence 约束。

## 9. Stale / provenance — PASS

Input 变化不自动覆盖或删除 Entry 正文；弱提示“来源有更新”或部分来源已移除。来源默认折叠，展开前额外 provenance 请求为零；展开后显示 Input 数、primary/supporting、引用/当前版本及自然语言状态，不默认展示技术 ID 或 Original Snapshot。

Input 被移除再恢复后，旧贡献不能自动变为 current。Source purge、unavailable 和已打开来源面板的状态更新均有测试。

## 10. Performance — PASS

实际 Chrome IndexedDB，全部 synthetic；以下为本机最终全量测试期间的单次测量，不是跨设备性能保证。详情含读写/扫描量见 [v070-m2-performance.json](v070-m2-performance.json)。

| Entries | 首屏 40 | 下一页 | 搜索 | 索引重建 | Topic merge | reorder |
|---|---:|---:|---:|---:|---:|---:|
| 1,000 | 21.4ms | 20.2ms | 6.6ms | 3.21s | 0.88s | 7.9ms |
| 10,000 | 27.6ms | 24.7ms | 52.7ms | 45.72s | 12.41s | 11.7ms |

1 / 3 / 10 Topics per Entry 下首屏都只扫描 40 个 Placement（202 次有限读取、0 写入），10k 条 Topic 首屏 transport 为 77,729 bytes。200KiB Entry 单独完整加载，读回与写入均保持 204,800 bytes。10 Topics 及 merge 后 Entry 数仍为 1k / 10k，没有复制正文；Placement 可包含保留的历史布局元数据。

Editor memory gate 测量的是有界 journal 的序列化大小：1,638,694 JSON 字符、4 个长正文 Undo steps、1 个 mounted Entry；这不是 Chrome 整体 heap 字节测量。常规 Undo 上限 50 steps，并有约 2M JSON 字符总量上限。

## 11. Isolated Chrome UI validation — PASS

7 项 M2 headful Chrome E2E 通过，覆盖首页、连续文档、Section、编辑/autosave/Undo/Redo、rename/merge、多 Topic、reorder、search、provenance、stale、delete/restore，以及冲突与安全清理。

另执行两项独立可见 UI 检查：[界面审查](v070-m2-ui-review.json)、[IME 与远端修改冲突](v070-m2-editor-edge.json)，Chrome `152.0.7977.82`。两份结果均与最终 runtime digest 匹配：`6c8f1296dd90ca013a537df0d805e76400b1b6a9fe5fcdfb63cc445d9e1ae8ce`。另外执行等 rank 边界检查脚本，通过。

截图均为虚构内容：[Library Index](v070-m2-ui/library-index.png)、[Topic document](v070-m2-ui/topic-document.png)、[stale / provenance](v070-m2-ui/provenance-stale.png)。视觉检查确认纵向索引及无 Entry 卡片边框的连续文档。

Chrome 使用新建隔离 profile 和 synthetic fixture；不接触日常 PAIA IndexedDB。未声称登录真实 ChatGPT 或真实导出 golden 验收；继承的 realGolden 状态仍为 UNAVAILABLE。

## 12. Privacy / permission / network audit — PASS

3411 package guardrails / 82 runtime resources 通过；development privacy / permission / network audit 通过。可见 UI 补测记录 0 network requests；界面审查 0 page errors。没有引入 Provider、AI 请求、embedding、凭证或新增权限，manifest 保持基线。正式持久写入仍由后台完成。

未读取或迁移真实用户数据，未记录真实正文/标题/URL，测试及截图均为 synthetic。没有改动捕获规则、Smart Filter 或 History Completion 功能。没有部署日常安装、升级版本、正式打包或推送远端。

## 13. Checkpoint

本地标签：`checkpoint-v0.7.0-m2-library-documents`。

分支：`codex/library-documents-v070-m2`；父 checkpoint 必须是 `7d5df85`。标签指向包含本报告的 M2 提交；具体 commit hash 由交付消息及 Git 标签给出。执行到 M2 后停止。

## 14. Git working tree

交付收口检查要求 M2 commit/tag 建立后工作区 clean，`git diff --check` 通过。M1、最终设计、v0.6.0、v0.6.1、v0.6.1.1、v0.6.2 六个冻结 worktree 已核对 HEAD 与 clean 状态，见 [v070-m2-frozen-worktrees.json](v070-m2-frozen-worktrees.json)。没有在这些 worktree 中实施 M2。

## 15. Known risks / limits

- 搜索为本地 Latin word / 中文字符匹配，没有语义搜索。10k 重建约 45.7 秒，UI 显示未完成；后台按界限推进。
- Undo 是有界页面 session；跨 reload 使用持久 Revision。后续组织修改会使旧布局恢复被拒绝，以保护用户工作。
- 旧 generation 保留组织元数据供受约束恢复；频繁大规模合并可能增加元数据量，后续压缩未包含在 M2。
- Schema v5 沿用 M1 的降级边界；不能把旧 runtime 直接加载到已激活的 v5 数据库。
- 性能为本机 synthetic 测量；editor memory 只验证 journal 边界，不代表完整浏览器 heap。
- 本阶段没有真实 Provider、自动整理、M3、日常部署或正式发布。

## 完整修改文件清单（相对 M1）

- `AGENTS.md`
- `M2_LIBRARY_DOCUMENTS.md`
- `M2_TEST_TRACEABILITY.md`
- `PRIVACY.md`
- `PRODUCT_SPEC.md`
- `README.md`
- `TEST_PLAN.md`
- `background/service-worker.js`
- `core/library-counts.js`
- `core/library-documents-store.js`
- `core/library-edit.js`
- `core/library-layout.js`
- `core/library-revisions.js`
- `core/library-runner.js`
- `core/library-search.js`
- `core/thought-maintenance.js`
- `core/thought-organization.js`
- `core/thought-store.js`
- `outputs/v070-m2-acceptance.md`
- `outputs/v070-m2-editor-edge.json`
- `outputs/v070-m2-editor-edge.mjs`
- `outputs/v070-m2-frozen-worktrees.json`
- `outputs/v070-m2-performance.json`
- `outputs/v070-m2-rank-edge.mjs`
- `outputs/v070-m2-tests.json`
- `outputs/v070-m2-ui-review.json`
- `outputs/v070-m2-ui-review.mjs`
- `outputs/v070-m2-ui/library-index.png`
- `outputs/v070-m2-ui/provenance-stale.png`
- `outputs/v070-m2-ui/topic-document.png`
- `scripts/check_package.py`
- `scripts/test-groups.mjs`
- `tests/background-security.test.mjs`
- `tests/editor-primitives.test.mjs`
- `tests/harness/fake-chatgpt.mjs`
- `tests/smart-filter-diagnostics-e2e.test.mjs`
- `tests/thought-m2-e2e.test.mjs`
- `tests/thought-m2-performance.test.mjs`
- `tests/thought-m2.test.mjs`
- `ui/archive.css`
- `ui/archive.html`
- `ui/archive.js`
- `ui/editor-primitives.js`
- `ui/library-entry-editor.js`
- `ui/library.js`
- `ui/thoughts.js`
