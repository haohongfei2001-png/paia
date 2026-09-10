## v0.3.0 多来源解析链路

新增 source-time-resolver.test.mjs 的独立仲裁矩阵与后台持久化/迟到/冲突测试；adapter.test.mjs 验证 canonical DOM 时间语义、正文隔离、assistant 排除、深度/节点上限、唯一祖先和重复 ID；multi-source-e2e.test.mjs 从真实浏览器合成页面的 DOM 属性与 fetch 开始，双向到达直到正式档案 UI，校验安全摘要、时间线、不可变字段、无重复及 worker 重启。没有注入 resolver 或后台时间结果。此前 structural-discovery 的 other JSON 全链路保留。最终结果见 TEST_RESULTS.md 顶部。

## v0.2.4 结构发现到正式档案

全量287通过、0失败/跳过（unit104 / adapter contract93 / browser E2E66 / privacy-security24）。新增structural-discovery.test.mjs：三种结构形态的空库浏览器正例、六个安全反例，以及旧fingerprint统计/匹配对照；所有正例必须经过页面fetch、MAIN other分类、正式投影、bridge/cache exact resolver、store和archive UI。只用本地HTTP fulfil，不注入中间metadata。history-contract增加严格角色/时间/身份/唯一集合、深度/键数、敏感字段与不完整集合检查。定向入口 `node --test tests/history-contract.test.mjs tests/structural-discovery.test.mjs tests/history-observer.test.mjs`。旧产品“集合改名失败”改为结构合法成功并保留缺identity失败，理由见TEST_RESULTS.md。

## v0.2.3 legacy 最后一跳

全量 273 通过、0 失败/跳过，unit 104 / adapter contract 90 / browser E2E 55 / privacy-security 24。新增 6 项后台测试及 2 项临时 Chrome legacy 测试；定向 `node --test tests/enrichment.test.mjs tests/history-store.test.mjs tests/backfill-e2e.test.mjs` 共 35 项。覆盖 dedupe identity/time merge、缺失/null/unknown、来源绑定证明、顺序歧义、缓存先到/后到、high 冲突及无账本情况。A 的安全前提为保留来源证明，只有片段 order 不能迁移；F 的旧撤回断言按用户本轮要求改为 high 保留且未知快照受阻断。详见 TEST_RESULTS.md。

## v0.2.2 分批旧历史回归

全量 265 项通过、0 失败/跳过（unit 98 / adapter contract 90 / browser E2E 53 / privacy-security 24）。新增 fixtures/older-history.mjs、3 项 backfill-e2e 和 2 项 enrichment 测试；既有测试全部保留。重点以 5+15 两批和每条独立日期验证 merge、DOM 两种时序、legacy identity、未知顺序、低可信值与不可变字段；临时 Chrome 覆盖懒加载、Worker suspend/wake、SPA。定向入口 `node --test tests/enrichment.test.mjs tests/backfill-e2e.test.mjs`。测试先在 v0.2.1 原逻辑通过，因此本轮未改动生产回填算法。

## v0.2.1 回填回归

最终全量 260 项通过（unit 96 / adapter contract 90 / browser E2E 50 / privacy/security 24），0 失败/跳过。新增 backfill-e2e、backfill-bridge、enrichment 三个文件；可用 `node --test tests/backfill-e2e.test.mjs tests/backfill-bridge.test.mjs tests/enrichment.test.mjs tests/history-observer.test.mjs` 单独执行。仍只用临时未登录 Chrome 与人工合成数据。

覆盖记录离开 DOM 后的晚到回填、metadata 先到、Worker 停止/唤醒、档案页关闭、补写失败重试、诊断 lease 独立、初始化请求在授权后返回、精确身份缺失字段恢复及低可信元数据不降级。旧测试保留，完整证据见 TEST_RESULTS.md。以下为原 harness 说明和历史结果。

# 本地自动测试环境

扩展没有测试模式。共享 `harness/fake-chatgpt.mjs` 在 Playwright 的临时、未登录 profile 中加载当前 unpacked MV3，以 route.fulfill 返回全部虚构页面和 JSON；未注册的请求 abort，并用 DNS 规则阻断外部主机。无需 HTTP 服务器或外部账号，不触碰日常 Chrome profile、Cookie 或 Keychain。公共 chatgpt.com origin 仅用于测试原 manifest，所有会话路径/ID/正文/来源时间均人工生成。

代理运行 `node scripts/test.mjs` 执行所有测试与权限审计。可按 `unit`、`adapter contract`、`browser E2E`、`privacy/security` 分组执行（带空格的组名用引号）。Node、Playwright 和 Chrome 使用开发环境已有依赖；可用 PLAYWRIGHT_MODULE、CHROME_PATH、PYTHON 指定路径。无需 npm install 或构建。报告生成到忽略的 work/test-summary.json；分组互斥，回归说明可与这些分类重叠。测试失败退出非零，代理负责修复，不交用户排查。

| 能力 | 共享夹具/测试覆盖 |
| --- | --- |
| canonical user/assistant DOM、消息 ID、conversation identity | conversation、fakePage、history-contract、adapter.test |
| 多行、同文不同 ID、未发送草稿、编辑态 | conversation、send/draft/edit；product E2E A/B 与既有捕获门禁 |
| 页面刷新、SPA 路由、历史聊天无需滚动 | page.reload、spa/open；product E2E B/C |
| 历史 conversation JSON、create_time/update_time | response/respond；contract 与后台时间测试 |
| metadata 先到 / DOM 先到 | open 的 metadata-first/manual/empty 场景、render |
| Worker suspend/wake | CDP ServiceWorker.stopWorker，确认 stopped→running 事件并检查旧内存标记消失；Chrome 可能复用 target ID，不能只比较 target ID |
| 多会话隔离、重复响应 | product E2E C/D/B；同一文档 SPA 与两个活跃聊天同时验证 |
| malformed/schema 改变、时间缺失/非法/逆序/冲突/更新关系 | product E2E E 及 history-contract/history-store |
| 时间线/分组/搜索/备注/整理版/不可变原文/回收站/恢复/导出 | product E2E F + 既有 ui.test、export.test |
| 隐私、权限、无遥测/无扩展请求、来源校验 | privacy-product、background-security、脚本静态审计和 E2E G |
| 存储失败、并发去重、跨重启冲突、删除墓碑 | history-store、store 与真实 Worker E2E |

first-use 授权仍是必要条件。自动 metadata-first 夹具等页面收到已授权控制状态才提供响应，这让事件顺序可重复；它不证明真实私有页面的首个请求总会晚于扩展授权初始化。真实 ChatGPT 的实时 DOM/JSON contract 和首个历史响应时序是唯一需要最终 smoke 的兼容性范围。

响应竞态单独运行：`node --test tests/history-observer.test.mjs`。测试在页面第一次读取前直接断言两个独立副本已经建立，以受控流与旁路完成事件验证互不影响，不以固定 sleep 等待成功；测试超时只用于失败退出。最终全量 238 项通过（unit 79 / adapter contract 89 / browser E2E 47 / privacy/security 23），详情见 TEST_RESULTS.md。

最终用户仅需打开一个旧普通聊天，确认自动补录及一条历史记录的原发送日期与捕获时间分开；既有 capturedAt 保留首次值。除此之外无需中间诊断版验收。测试、截图、导出与浏览器 profile 均不进入安装包或 Git（测试源码及纯合成 fixture 除外）。
