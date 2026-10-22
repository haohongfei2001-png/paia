# Visual 字体准备接入方案（未实施）— 2026-10-22

回应 [PR313 /6343541481](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6343541481)。独立文档分支 `codex/visual-font-integration-plan-20261022`，基线 `fdb55c99b1869dbc39f9302d59e50ea1b386d8e0`；所读 Visual workflow 与原失败 tested merge `0d6b88464c9b248674337b666b19b15b00a7da7e` 相同。没有修改或执行脚本、workflow、字体安装、测试、构建或 CI。

## 已有证据的准确范围

Dot 报告 [39795580095](https://github.com/haohongfei2001-png/paia/actions/runs/39795580095) attempt1 / head `c466a794b2ddbe22984dee23b3e613762ac2daa5` 已完成：冻结 helper `a20509de1b89d016f29c9981340ec517c0fd4bfa`，signed plan10.966s、cold acquisition/install13.720s、总24.862s，两包68,701,402 bytes；中文及三字体族检查成功。同 job 私有字节副本验真成功，**不是 Actions cache 暖命中**。实际14:25:47–14:26:18执行，先前 API queued 是滞后状态。

本次只读核对该精确提交的隔离 workflow/validator：明确使用 `ubuntu-24.04`；父提交/冻结 helper SHA256 `3713f58ed8d3e48f12c72c2aae1a08d119180c50c34a5e5cf7afd61ee4e2d510` 受校验；直接调用原 plan/install，无 mirror 重写、无远程 cache、无 browser/Full。成功计时来自 dot 的已发布工程记录，本次未重复下载/验证结果 artifact，也未重跑。一次快冷启动不保证以后下载时长。

Visual39789515221仍是独立15m限时失败：原 font step 从 http azure获取 CJK61.2MB 时取消，capture skipped。新 native 成功不能把这个失败改为已修或 Visual 通过。

## 不能直接照抄的差异

| 项目 | 已审 helper / current_browser | 当前 Visual |
| --- | --- | --- |
|请求包|固定 `fonts-wqy-zenhei`、`fonts-noto-cjk`|`fonts-noto-cjk`、`fonts-noto-color-emoji`；必须保留 Emoji|
|平台|helper仅准入 Ubuntu24.04/amd64/APT2.8.3；native固定ubuntu-24.04|`ubuntu-latest`，可能迁移到未支持平台，不能删除 helper 平台保护|
|镜像准备|current_browser原workflow有精确 azure→archive HTTPS地址替换；**本次native validator没有这一步**|无该步骤；helper本身验证原source/mirror，不能声称它自动改成HTTPS或解决网络波动|
|cache服务|current_browser准备补丁含独立restore/save，可信push main才save|PR、手动runtime_ref及evidence分支；不可把这些事件借作可信main写入|

## 建议的最小接入候选，须由 dot 明确选定实施范围

未来代码面限定 **3个文件**，不得整分支混入无关祖先：

1. `.github/workflows/paia-prompt-visual.yml` 的 `jobs.visual.runs-on` 与现有 **Use hosted full Chrome and Chinese fonts** 准备步骤。平台固定已验证的ubuntu-24.04；保留原Chrome选择、Node/Python、15m、触发事件/checkout runtime_ref、contents:read、并发、全部capture/compare、artifact失败门。以新鲜job-local state执行同一受审helper的plan→install，不再旁路执行第二套apt安装。首版**不增加 Actions cache restore/save**，使用空的私有cache目录；没有缓存服务权限或新触发事件。
2. `extension/scripts/prepare-browser-fonts.py` 仅增加两个封闭字体集合的选择：默认 browser 保持原两包；显式 prompt-visual 精确为CJK+color-emoji。不接受任意包参数，不给Visual额外装文泉驿，也不删Emoji。选择在plan/install一致，原`requested`已进入精确key；install必须核对该封闭集合，拒绝跨集合/被篡改plan。原signed fresh indexes、native resolver/SHA256/metadata、APT路由/强策略、一次获取、quarantine及fatal install全部复用。这个新字体集合尚无原生资格，不能继承原两包的成功结论。
3. `extension/tests/cpv1-02-hosted-browser-setup.test.mjs` 增加上述封闭集合、plan/install一致性和Visual静态接线控制；保留默认browser及全部既有安全负例。证明原15m、完整capture/compare、无远程cache save/任意包/额外获取路径。安装后核对两包实际版本和文件；CJK/Emoji实际匹配需检查返回family/文件，不能只以`fc-match`退出0作准（它可返回替代字体）。不改capture的已批准视觉内容。

以上明确**超出原 current_browser-only 准备实施范围**：新增Visual共享workflow消费者、固定runner标签和新的封闭包集合；当前只获准交方案，未实施或启用。建议不同时推广其他jobs。若 dot 选择复制原current_browser的精确HTTPS地址替换，须把这项额外source准备变更写入明确范围，保留套件/签名/所有source检查；它不是本次native已验证的步骤。不得擅自换其他镜像、放宽TLS/签名或新增重试。

## 必要验证与唯一剩余决定

Dot需决定是否授权上述三文件隔离实施，以及是否纳入原精确HTTPS准备；不需要重开字体产品设计。获准后先跑新增封闭集合/负控和受影响原helper合同，不运行无变化Full。随后由dot在既定额度内协调**精确整合候选的实际Visual**：核对平台/包集合/plan身份、真实安装与字体匹配、原全部capture/compare和artifact结果。准备或字体检查失败必须阻断capture，不得用跳过门、扩大15m、循环下载或无变化重跑消耗额度。远程cache冷暖资格保持未验证；将来若另行准入，仍不得放松原可信push-main保存门。

即使采用此方案，网络传输仍可能超过预算；本方案提供受审一致的准备链和准确失败边界，不承诺根除全部下载延迟。四文件分片候选073eb0ef/fdb55c99已单独交付，不受此方案阻塞。Organize对账a8204dda未发现新明确代码缺口；仍待精确整合/所属native/Full与外部服务及人类验收，不重复实现。
