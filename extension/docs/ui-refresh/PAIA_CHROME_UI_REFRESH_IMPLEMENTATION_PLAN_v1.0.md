# PAIA Chrome UI Refresh Implementation Plan v1.0

基线 `c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`；分支 `chrome-ui-refresh-v1`；固定4轮。设计阶段仅提交文档。

## 1. 为什么是四轮

当前运行层是原生ES modules，archive.html + archive.js拥有统一主入口，core-loop动态重排Shell/Settings；Reader/Search/Thought/Context已有独立控制器与现成可信服务。无需换框架、引入新模型或重做UX-R1～UX-R6。

先统一Shell和宽度，后改Archive/Reader，再改Thought/AI，最后完成Context/Settings和跨页验收，可以减少同一DOM被两轮反复重排。R4语义和R5AI流程已存在，本次不再拆成实现新权限/新pipeline的工程。四轮的工作量是不均匀的；UIR-04预留较多时间给最终完整回归，不把“回归”挤成不存在的第五轮。

## 2. 依赖与退出条件

| Round | 输入 | 核心交付 | 输出/下一轮进入条件 |
|---|---|---|---|
| UIR-01 | 文档bootstrap完成，产品等于冻结main | Shell、nav、搜索入口、tokens、单h1、Archive主/辅布局框架；其余页面保持可用 | focused+release+真实桌面图通过；所有旧功能仍可进入；STATUS把02设下一轮 |
| UIR-02 | 01 COMPLETE，无未解决Shell阻塞 | 真实列表、Search/Revisit/Input Reader、来源/版本与编辑状态 | 原R2定位/编辑与R4搜索复用不退化；图/行为通过；03可进入 |
| UIR-03 | 02 COMPLETE，正文/返回框架稳定 | Thought首页/Topic、已有AI文档、processing/candidate | R3 bindings/human protection与R5不隐式调用/候选/unknown保持；04可进入 |
| UIR-04 | 03 COMPLETE，核心阅读体验已具备 | Context/Settings/低频工具、跨页状态与完整响应式/最终回归 | full current suite + release +现有mandatory CI +视觉矩阵通过；整体COMPLETE，等待用户决定合并 |

一轮失败不进入下一轮，也不再创建“R1修复campaign”。同一个round内修复、重跑受影响gate即可。若前轮已有确定完成的代码，后轮只能为本轮真实依赖做小修，报告指出，不做顺手全局重构。

## 3. 总体路径安排

路径相对extension，除特别注明仓库根。下表未写目录的JS/CSS/HTML运行文件短名均位于`ui/`；`foo.js/css`表示同目录的`foo.js`与`foo.css`两个文件，不是字面路径。`scripts/`、`tests/`、`core/`等明确前缀保持不变。

| 文件/组件 | 主要owner round | 其他轮允许的交接 |
|---|---|---|
| archive.html、core-loop.js/css、ux-r1-shell-coordinator.js | 01 | 02列表/Reader、03Topic、04Settings的具体挂载点；保持同一owner |
| ui-refresh.css（小范围共享布局，可增加） | 01 | 后续只追加已定义的共享间距/布局状态，不变成第二套主题引擎 |
| archive.js / reader-navigation.js | 02（01最小Shell接线） | 03/04仅必要入口/返回；保留intent、flush、history |
| reader-experience.js、reader.css、library.js呈现 | 02 | 03相同阅读样式/04窄屏修复，不改编辑模型 |
| universal-search.js/css、search-experience.js、input-search.js呈现 | 02 | 04材料入口对齐；不换query服务 |
| revisit.js/css | 02 | 04最终矩阵 |
| thoughts.js、thoughts-base.js、thought-reader.css、thought-copy.js | 03 | 04回归修复，仅本轮必要 |
| ai-presentation.js、ai-candidate.js、ai-first-generation.js、memory-recomposition.js | 03 | 04 shared/error/a11y修复，不改AI业务 |
| memory.js、material-tray.js、reuse.css | 04 | 02/03只保持现有调用入口，不提前重排输出 |
| r6-settings.js、r6.css、backup.js、smart-filter.js、product-signals页面 | 04 | r6.css的preview遮挡selector可在02/03随DOM同步 |
| tests/ux-r1～r6 当前测试 | 对应页面round | 修改定位/纯旧视觉值需保留全部行为与安全断言 |
| scripts/build_daily_use.py、scripts/test-groups.mjs、根.github/workflows/paia-certification.yml | 谨慎例外 | 只为被证明的DOM发布耦合/当前测试注册/原证据上传调整；不建新gate体系 |
| core / background / adapter / content / manifest / native-hosts / 根网站 / overnight | 默认冻结 | 只有round列明的最小只读DTO例外，绝无写入/权限/schema例外 |

## 4. 共同开始检查（普通Git，不建协议）

```sh
git fetch origin
# 工作树必须干净；不reset用户或其他agent未提交的文件。
git status --short
git switch chrome-ui-refresh-v1
git pull --ff-only origin chrome-ui-refresh-v1
git rev-parse HEAD
git rev-parse origin/chrome-ui-refresh-v1
```

读同一固定HEAD的README/SPEC/STATUS/current round。首轮检查代码仍等于设计基线；后续核对前轮report/commit及本轮已有提交。main此后有网站或别的开发进展，不自动merge进UIR；基线冻结，未来集成另行验证。发现远端产品改动无法解释时，写出文件/提交差异，不猜哪个聊天窗口拥有它。

## 5. 两级验证

### A. 每轮 focused gate

每份round给出真实存在的测试入口。当前runner不接受任意文件名作为category，所以单文件/命名组用Node原生test；完整group用原npm命令。

环境沿用现有仓库：Node22（或已验证兼容环境）、Python3、仓库pinned Playwright。新环境：

```sh
cd extension
npm install --no-audit --no-fund
npx playwright install chromium
export PLAYWRIGHT_MODULE=playwright
export PAIA_HEADLESS=1
```

不要更新dependency版本/lockfile来修UI。Linux需要系统依赖时用现有Playwright安装选项；Chrome环境照既有CI明确配置 `CHROME_PATH` / `PAIA_CHROME`。macOS harness默认已知Google Chrome路径；Linux有正式Chrome时用其真实可执行路径，不抄用户本机路径。浏览器不可运行即记录环境BLOCKED，不能改成假DOM测试就称real browser。

focused命令示例形式：

```sh
node --test --test-concurrency=1 tests/ux-r1-shell.test.mjs tests/ux-r1-shell-chrome-e2e.test.mjs
npm run check
node scripts/check_development.mjs
npm run build:release
```

若测试环境需要显示服务，使用原CI的 `xvfb-run -a` 包裹浏览器命令；不更改测试timeout。每轮实际命令与exit/result写报告。完整suite不作为每轮默认重复门槛，但改变trusted/DTO/发布接线可能要求额外相关域测试；现有CI如果被触发，其失败不能忽略。

每轮还要在 `work/current-release` 真实产物上smoke至少一个该轮主journey；现有tests若已用release路径可复用，不另建新harness。其余截图允许来自同一代码的unpacked源扩展，但必须注明哪一版并至少有release after图。

### B. UIR-04 final gate

最终代码冻结后：

```sh
npm run check
node scripts/check_development.mjs
npm run build:release
# 清除已有shard设置，完整、非分片运行；不修改测试断言。
unset PAIA_TEST_SHARD
npm test
```

检查当前work/test-summary.json实际 `fullSuite=true` / `auditPassed=true`、0 failures / 0 skipped、browser/adapter/privacy均被执行且source digest未变。若单独执行 `npm run test:browser` 用于故障定位，也记录，但无须为了报告好看在本地重复同一完整结果。现有CI已经规定的单独browser/full jobs维持原样。

最终通过既有 `.github/workflows/paia-certification.yml` 对该分支的workflow_dispatch，或已经存在且指向该真实代码的普通PR检查；**不为了CI创建carrier/control/frozen-base分支，不触碰PR#28**。Unit shards、contracts、Current Browser、Full Suite、macOS Secure Store、aggregate等当前mandatory jobs不得移除。记录真实run/代码SHA；没有远端执行能力时先如实BLOCKED，不谎称CI成功。

`test:historical-browser` 的76份基线历史证据不混称current通过；保持原分组，不把新失败放进去。新增UIR浏览器文件必须真正接入现有current入口，必要时最小修改test-groups与workflow显式列表。

## 6. 视觉证据不替代行为，行为证据不替代视觉

各轮任务书规定截图；final执行SPEC S11。数据只能是隔离合成fixture，真实extension、service worker、IndexedDB，不是静态HTML贴图。原有生成的图片可复用，避免重复拍同一状态。

推荐证据目录：

```text
extension/docs/ui-refresh/evidence/UIR-01/
  archive-1440-light.png
  archive-1440-dark.png
  VISUAL_REVIEW.md
```

后续同理。报告引用实际已提交图片或真实Actions artifact。保留至少关键代表图在GitHub，避免14天artifact过期后只剩“我看过了”。PNG可合理无损优化，但不抹掉错误/隐私提示，不把截图压缩到无法判断字体和布局。日志/大fixture留既有work，不把浏览器profile或私库提交。

VISUAL_REVIEW逐图记录实际观察，不只写“美观PASS”：单h1、内容层级、行宽/工作区宽度、空白、长文本、light/dark、focus、loading/error、遮挡。发现本轮缺陷先修，再更新有效after图；修复后旧图不得标最终。

## 7. 提交、报告与STATUS

建议每轮一个代码/测试提交 `feat(ui): UIR-0N ...`，然后一个报告/状态/证据提交 `docs(ui): record UIR-0N acceptance`。有实际修复可再加普通fix提交，不amend/force改共享历史。不是强制两阶段提交系统，代码与报告同commit也可以，只需验证对象可解释。

报告路径：`rounds/UIR_0N_REPORT.md`。至少记录：

- entry head、代码/测试commit、文档checkpoint、实际GitHub分支；
- 完成/未完成scope、旧能力新入口、真实差异与principal files；
- adapter/build/test-registration例外及最小性证明（无则写无）；
- 保留的域/隐私/授权/保存状态、任何回归风险；
- 逐条命令/环境/exit/pass/fail/skip、release smoke与Provider/network断言；
- 截图链接、实际视觉检查、发现及修复；
- source与evidence版本关系、已知blocker/限制、下一轮进入条件。

STATUS只维护baseline、branch、已核对HEAD、当前round、四轮状态、最后完成/下一轮、blocker、最后验证。不加lease/owner/state JSON。HEAD快照按“更新STATUS前已核对”标明；实时HEAD仍从GitHub解析，不能追逐自引用SHA无限提交。

结束时核对 `git diff --name-status <entry>..HEAD` 与本轮允许范围，推送后再读GitHub HEAD。没有推送成功不能告诉用户文档已在GitHub。

## 8. 失败、回退、变更控制

保存/选择/权限回归优先修复，不能用隐藏控件避开失败。未知缺陷先定位到本轮改动，保留失败日志；需要回退时用普通revert撤回本轮相关UI提交，不重置用户库、不退数据库版本。

若release因HTML marker变化失败：恢复marker或做等价精确transform后重跑release/security，不放宽audit。若读位置偏移：恢复window-scroll与稳定编辑节点，修DOM而不是把reader-state偏移随意归零。若candidate stale：修复展示/交互连接，不修改CAS。若权限/导出失败：先检查新入口是否调用原trusted action，不能拼DOM文本绕过。

普通视觉微调直接执行，保持SPEC方向。超过本轮已批准范围、新能力、新durable state、新付费/权限或重大产品冲突才停止并说明。不要让用户逐项决定padding、圆角或菜单位置。

## 9. 当前交付边界

本计划交付时四轮均未实施。基线曾通过的测试、已下载的R6截图不作为UIR PASS。最终完成后只表示本分支已达到可使用基础与现有工程回归要求；是否合并main、更新用户已加载的扩展、发布商店版或开展Phase B，需新的明确决定。
