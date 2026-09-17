# UIR-04 Final Visual Review

Date: 2026-09-17
Final runtime/test: `c2fd66a34a7a873270def9ddd5d50ab7baca1017`
Certification: `#335` / run `35185601519` — **SUCCESS**

## Method

UIR-04 分四个 execution。每个 execution 都使用隔离 Chrome synthetic profile 生成 source / built-current-release 证据并实际逐图打开；行为正确性仍由 browser/contract tests 证明，截图不替代 owner、权限、stale/purge 或 restore 断言。

Execution 04 只修改 Popup / 本机工具，因此 Context / Settings / Data 的 Execution 01–03 final 图对最终 runtime 等值；Archive / Reader / Thought / Topic 继续引用 UIR-01～03 final visual reviews，并由最终 Current Browser / Full Suite 对同一 runtime/test tree 再验证无 regression。

## Final matrix conclusion

- 1440 light/dark：Archive、Reader、Thought / Topic、Context、Settings、Data 的既有 final matrices 保持有效。
- 1024：Archive / Candidate / 本机工具中宽布局保持无根级横向溢出。
- 390 / 320：Reader、Topic、Context、Settings / Data 与本机工具保持单列或既有 mobile owner；关键动作可达。
- 200% text、keyboard/focus、reduced motion、IME：既有 UIR-01～03 certified journeys 继续进入最终 suite；UIR-04 没重写相关 editor/interaction owner。
- Popup：350×600 light/dark 主状态、输入计数、回到 PAIA、暂停/恢复层级清楚；built release 正确裁剪 `popup-internal-tools`。
- 本机工具：1024 dark 与 390 light 下 Product Signals / Passport / Context Package 仍为单一 owner；返回路径明确；无根级横向溢出。

Execution 04 实际打开的原始图：`uir-04-popup-350x600-light.png`、`uir-04-popup-350x600-dark.png`、`uir-04-local-tools-1024x768-dark.png`、`uir-04-local-tools-390x844-light.png`、`uir-04-current-release-popup-350x600-dark.png`。

这些原始截图和最终 visual/browser evidence 由 #335 UX-R6 artifact `10482342982` 固定，digest `sha256:f747559978fccab7eefb6dc129236635fa6abe155b3b300e407626de0ce52bf3`；docs closure 不重复提交二进制截图。

## Cross-round checks

- Archive/Search/Reader 保持信息密度，prose width 不被全局套用。
- Thought/Topic 保持 current-vs-candidate、staged-vs-saved、full-text-vs-mask 边界。
- Context/Settings/Data/Popup/local tools 使用同一 surface/text/accent/focus/danger token family，没有新增卡片系统或第二套 owner。
- Source 与 built release 的差异仍只来自既定 pruning；没有 release-only 权限漂移。

## Conclusion

**UIR-04 final visual acceptance PASS。** Final Certification #335 对同一 runtime/test SHA SUCCESS；未发现需要重新打开 UIR-04 runtime 的基础视觉问题。

## Limits

Browser evidence 使用隔离 synthetic data/profile，不等同用户日常 macOS Chrome。Synthetic Provider fixture 不等同 live Provider；macOS secure-store CI 不证明物理 Secure Enclave 生命周期。
