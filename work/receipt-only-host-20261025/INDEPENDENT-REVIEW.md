# Receipt-only core 独立限定审查

日期：2026-10-25。只读源码/既有日志审查；未运行测试、浏览器、构建、网络或云任务，未修改候选。

## 结论与精确身份

在“新文档出生后仅原已验证 receipt 插入；旧原构造不覆盖；旧页不得用于新插入或 selection hold 资格；未知结果不清除”的批准范围内，未发现新增阻断。此结论不是所有 host coverage、global activation 或真实浏览器验收通过。

审查 checkout：`/Users/hhf/Documents/GitHub/paia/work/final-development-takeover-20261025/checkout`。
基线 HEAD：`54e15e911c297dd687d7162b7dcacb576c644c23`，当前差额尚未提交。

| 源码 | SHA256 |
|---|---|
| extension/adapter/chatgpt-composer.js | 9a80cb354fabc906a5f22c63b6f952af350a2b4d9c286aa0d41135bd5a0eaa43 |
| extension/background/prompt-insertion-receipts.js | 7bd38da05529a87f62c0078b81453a896b990bb0bd24bfcd54cf943c66180e69 |

实际 diff 为两 runtime 和七个测试文件。原 `prompt-known-document-roundtrip.test.mjs` 是组合验证中的第八测试文件，未修改。

## 逐链核对

1. `chatgpt-composer.js:48` 的原 Symbol 构造早返回仍保留。新脚本不能替换已加载旧构造、重设旧文档或伪造新 profile。旧构造仍可能执行其原旧行为，因此只读证明不能被描述为所有现存页面从此无写者。
2. `:292–305` 新构造的 accepted task 仍被私有 pending 集合跟踪，真实 Promise settle 才清理；bare 请求在任何 protocol 注册前后均以 `page_refresh_required` 拒绝。原 attempts 的 native 编辑路径已移除，没有新 optout。全文件唯一原 `#once` 调用在 `#withReceipt` 中，原 envelope/完整 message digest、lane、operationId、nonce、注册/QUALIFY、原 final qualifier 和 admission serial 仍先于实际 `execCommand`。
3. `:182` 原 probe 只在原 registered 成功后返回 `receipt-only-v1`。worker `prompt-insertion-receipts.js:71` 分别校验 top frame 与已登记 exact document 的完整精确 profile 字段，保留 nonce、document、window、URL、receiver map identity 和后续 tabs.get 校验。只提交 register 请求不构成 profile 资格。
4. `chatgpt-composer.js:22` HOLD/FENCE 输出新固定 profile；worker `:139` 原 known proof 强制同 profile，不接受缺失、未来版本或降级；仍核原 ownerToken/domain/challenge/document/deadline，未以 profile 替代这些绑定。原失败/迟到 cleanup 可释放精确原 hold，但不能赋资格或清 ledger。
5. worker `:102` 的 profile loss 若发生在 durable PENDING 后直接保持 `OUTCOME_UNKNOWN`，不落 `not_dispatched`；原 post-PENDING 未知记录仍在，物理调用次数不靠重试修复。PENDING 前无 profile 则拒绝新 action。其他原异常分类未扩大。
6. 原 ACK/reconcile 不新增 profile 先决条件，可继续通过精确原 envelope/receiver 结算已有 terminal 证据；旧 UNKNOWN、legacyCoverageUnknown 和 productionActivation=false 不因新 profile 或随后成功被清除。

## 测试证据分账

读取 `work/receipt-only-host-20261025` 的命令、结果、日志及保留源码：

- 初次八文件组合：279/282，exit 1，TAP 59108.491208 ms；失败和当时源码保留。
- 三项夹具纠正：3/3，exit 0，TAP 628.716875 ms；不是重新全量 282/282。
- 原 known-document、roundtrip、composer hold 三完整文件：67/67，exit 0，TAP 1868.720292 ms。
- 新控制覆盖三 lane 出生 bare 拒绝、重复 501 次零 native 编辑、原旧 Symbol 构造保持、top/exact document profile 拒绝、PENDING 后 profile loss 保留 UNKNOWN、旧 ACK 正常结算、HOLD/FENCE 无 profile 拒绝并原精确 release。
- 正控通过原 receipt 测试 issuer/真实私有 adapter 方法，不能把这些 Node/VM 合成结果称为 native Chromium。

原旧构造测试读取 `work/receipt-only-host-20261025/before/extension/adapter/chatgpt-composer.js`。交付需将此精确 baseline fixture 与测试一起保存；不是生产 optout，也不能只提交测试而丢失它。

## 尚需迁移的 native 夹具（本轮未改、未运行）

### CPV1-09 manual

`extension/tests/cpv1-09-prompt-insertion-chrome-e2e.test.mjs:23–25` 直接调用真实 worker `PAIA_PROMPT_INSERT`，但 `request()` 只生成 operationId，没有先调用原 `PAIA_PROMPT_INSERT_PREPARE` 并携带其 `insertionAction`。因此不能准确把整文件称作 bare adapter 测试；它的直接 RPC helper 是过期准备链。

当前原 `PromptReuseCommands` 在 `background/prompt-reuse-commands.js:45–48,53,111–115` 已有真实 prepare/action/receipt owner 路径，`ui/prompt-reuse-test.js:20` 的真实 UI 点击也已使用该路径。后续最小准备改动是让 test helper 使用这条原 prepare 返回的 action 和其 operationId，并在 uncertain 同一次请求重放控制中保留同一个原 action。不能自己构造 envelope、签名、ACK 或为 test 禁用生产 receipt。

两个 `signature='legacy'|'current'` 指 DOM composer 形状，不能等同旧 receipt 协议或删掉 legacy DOM 覆盖。原 Unicode/光标/IME/不发送/草稿保留/剪贴板/不重放断言应保留；SPA mismatch 等原 prepare 可能早拒绝的控制应记录真实新边界，不能伪造一次 native 失败来维持旧响应形状。原 `content/prompt-reuse.js:21` 已把完整 insertionMessage 和 manual lane 交给 adapter，不需要新增生产旁路。

### AI Assist native

`extension/tests/harness/ai-assist-native.mjs:18–24,37–48,128–134` 使用真实 LocalAssistSession + 原 AssistResultController，但通过私有 CDP bridge 直接给 composer 无 receipt 的 insertion payload。`content/assist-result-runtime.js:11–20` 有现成 receipt 分支，而该夹具走 bare 末端。因此它的成功插入/重复/IME/草稿变化/uncertain once 等正控需要接真实原 producer/receipt owner。

最小正确依赖是 `background/prompt-assist.js` 已有 `#presentInsertion`、原 insertionAction、`#card` 的 beginInsertion/resolveReceiver/dispatch 路径，保留已有 native reader/provider/session 原权限与真实 gate。不得将 VM mock ACK 移入 native 夹具，或在 CDP 直接编造 insertionReceipt。`LocalAssistSession.insert` 的 session 授权本身不产生 receipt。

受影响 owning chain：`extension/tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs:1` → `harness/ai-cost-session-lifecycle-cases.mjs:11,26` → `verifyPrivateAssistNative`，Source/Release 均需准备；仅改 loader 不足以证明插入协议。该 helper 内不依赖插入的 provider/revoke/consent 负控不应借机删除或迁移成新权限。

两套 native 均无本轮执行额度。可继续精确本地准备与合成校验，但真实浏览器兼容和原断言完整运行保持 NOT_RUN，不能据本次静态审查宣称已完成。

## 仍保留的边界

UI 提示由独立工作包负责，本报告没有审查/认证其完成。不得自动刷新、关闭页面、清 UNKNOWN 或升级旧构造。已知 receivers 的 profile/hold 不是所有未知页面/其他连接的全局静止证明。原 4096 references / 2 MiB / 30 秒预算及云/native 耗尽边界不变。候选外 untracked 文件未纳入或修改。

冻结补核：root `REPORT.md`、`SOURCE-VECTOR.json` 已读，九项最终源码 SHA256 逐项与实际文件相同。`SHA256SUMS` 文件自身 SHA256 为 `1b1c2b1ef7913da95f424c17b5f97150ed848123d95aac3ae99de6b358ceeb4c`；本补核没有重跑测试或新增 runtime 差额。
