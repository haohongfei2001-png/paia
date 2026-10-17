# AI-COST-07：逐证据语义裁定草案与离线文件验证

本目录交付既有独立合成集的逐证据 **`AI_AUTHORED_DRAFT`**，以及确定性的文件结构和证据绑定验证器。`VALID` 只表示这些机械检查通过；语义正确性始终为 **`NOT_VERIFIED`**。独立人类语义审查、原作者验收、模型执行及模型质量资格均为 **`NOT_RUN`**。

## 基准、实际差额与范围

- 开始时最新 `main`：`2cc827e8e4bed9d7d7a2a57fce1d6a8f5724c3a8`。
- 协作分支：`codex/ai-cost07-semantic-adjudication-pro-20261018`；由 dot 统一审查整合。
- 最新代码已有校准集 **24 Topic / 315 Entry**、独立合成集 **12 Topic / 36 Entry**、冻结审计及盲审 formatter/readback。本专项不沿用旧设计文档中“独立样本为 0”的历史状态，也不重新生成数据。
- 实际新增的是：绑定这 36 条真实合成 Entry 的语义草案、引用有效而整句意义错误的反例，以及这一草案格式的严格离线导入门。
- 沿用 `AI_USAGE_PLAN.md`、`AI_ORGANIZE_STYLE_CONTRACT.md` 的身份与三风格合同。纯函数直接复用 `../ai-qwen-offline/artifacts.mjs` 的 `parseStrict` 与 canonical `digest`；不另造盲审格式，不调用其校准 replay loader。
- corpus 自身保留的历史 `runtimeBase` 是 `707dd125bb48d75aaad2cb89b4b98ddc66837bbb`。它与上述本次实现基准各自绑定，不互相覆盖，也不表示对当前生产 runtime 重新认证。

所有提交限于本目录。原 fixtures、原 formatter/readback、生产 runtime、UI、Now、版本、全局 STATUS、MASTER_PLAN、CI 和既有验收阈值均保持原样。

## 文件入口

| 文件 | 用途 |
| --- | --- |
| `adjudication.json` | 可直接审阅、离线验证的完整草案：12 Topic、36 Entry、原 36 obligation / 36 annotation、277 条 Entry 规则、30 条跨 Entry 关系、16 个反例 |
| `draft-content.mjs` | 逐条语义草案的可读源稿；含 108 条分别对应 original / balanced / concise 的压缩边界 |
| `adversarial-content.mjs` | 16 个完整反例的输出、真实引用选择器、裁定理由及三风格说明 |
| `schema.mjs` / `schema.json` | 同一份本地执行 schema 及其序列化副本；不是两个独立维护的定义 |
| `trusted.mjs` / `validator.mjs` | 固定可信源、严格解析、身份/摘要/跨度/完整覆盖/状态检查 |
| `build-draft.mjs` / `cli.mjs` / `output-writer.mjs` | 从静态 AI 草稿绑定真实冻结证据，生成可复核的新输出或验证指定文件 |
| `report.json` / `receipt.json` | 机械校验报告及确定性文件生成回执；回执不是人类评审回执 |
| `*.test.mjs` / `mutation-tests.mjs` | 正反例、CLI、离线能力、交付文件一致性及真实源码变异验证 |
| `VERIFICATION.md` / `mutation-report.json` | 本次实际执行记录与变异结果 |

## 纯离线命令

在仓库根目录使用已安装的 Node.js；本次验证环境为 **Node v24.19.0**。无第三方包安装、网络请求、API 密钥、模型评分或付费调用。命令只读取仓库中已有的公开合成证据。

```bash
SEMANTIC_DIR="$PWD/extension/tests/experimental/ai-qwen-semantic-adjudication"
SEMANTIC_OUT_PARENT="$(mktemp -d /tmp/paia-semantic.XXXXXX)"

# 验证随提交交付的完整草案，报告写标准输出。
node "$SEMANTIC_DIR/cli.mjs" validate --input="$SEMANTIC_DIR/adjudication.json"

# draft / checked 必须尚不存在，且位于仓库外。
node "$SEMANTIC_DIR/cli.mjs" draft --out="$SEMANTIC_OUT_PARENT/draft"
node "$SEMANTIC_DIR/cli.mjs" validate \
  --input="$SEMANTIC_OUT_PARENT/draft/adjudication.json" \
  --out="$SEMANTIC_OUT_PARENT/checked"

# 全部本目录测试，以及未修改的既有 held-out 冻结审计。
node --test "$SEMANTIC_DIR"/*.test.mjs \
  extension/tests/audits/ai-qwen-heldout-root.test.mjs

# 真正移除源码检查后运行同一负例；此命令只输出报告。
node "$SEMANTIC_DIR/mutation-tests.mjs"
```

CLI 成功退出码为 0；任何拒绝为非 0，stderr 只给稳定错误码，不回显输入正文、路径、seed、map 或异常堆栈。只接受文档所列精确参数，路径必须绝对；不存在 force、覆盖、续写、网络或替代 corpus 参数。

输出父目录应使用自己控制的私有目录（上例 `mktemp -d`），不要使用由其他进程管理的共享可写目录。输出目录用原子 `mkdir` 新建且权限为 `0700`，文件使用 `wx` 与 `0600`。既有文件、目录或符号链接都拒绝复用；仓库内路径及通过父目录符号链接绕回仓库的路径也拒绝。生成顺序为数据/schema、报告、最后才是 `receipt.json`。失败留下的部分目录仍是失败记录，再次运行不能覆盖它。两次成功运行至不同新目录，内容逐字节相同，没有生成时间、随机标识或机器路径混入文件。

输入打开使用 `O_NONBLOCK | O_NOFOLLOW` 后再检查实际 fd，避免检查后被替换成 FIFO 时一直等待。输出使用独立 Node 子进程、继承的目录 fd 和该子进程的 cwd inode 锚，固定文件名始终相对这一目录独占创建；替换路径为符号链接不能重定向写入。每次写入前后核对真实路径、inode、当前 UID 及目录 0700/文件 0600，检测到竞争即非零失败，已打开的完成回执会清空为无效文件。父进程 cwd 不变，子进程不继承环境变量，父子进程均有 30 秒上限；超时或启动失败只返回稳定错误码。

这使用 Node 的 POSIX 目录 fd/cwd 机制，不依赖 Linux `/proc`，保留 macOS/Linux 的同一功能路径。本次只在 Linux Node v24.19.0 实测；没有声称 macOS 实测通过。不支持所需目录打开/继承能力的平台会失败，不退回不安全的路径写入；不带 `--out` 的只读验证不启动子进程。

这不是同权限恶意进程的永久文件系统锁。Node 没有原子 mkdir-and-open：首次取得目录 fd 前，同 UID 对手替换普通目录不能由纯 Node 完整鉴别；取得 fd 后的替换会被核对。其他有重命名权限的进程仍可移动原 inode（包括将已写文件移进仓库），或在核对与写入之间/返回后再改动文件。本工具拒绝观察到的移动并停止后续写入，不声称可以阻止对手自己的移动、保证全过程位置不变或永久保存回执。不要把这些摘要当作抵御同权限修改或物理存储故障的外部证明。

## 证据合同：真实字段如何绑定

| 本格式字段 | 冻结源与检查 |
| --- | --- |
| `topicId` / `entryId` | 对应现有 `HELD-R01`…`HELD-R12` 与 `HELD-Rxx-E00n`；完整 Topic / Entry 集合必须一致，不接受未知、重复或跨 Topic 绑定 |
| `revision` | 对应该 Entry 的实际 `revision`，本冻结集均为 0；日期纠错不伪造成不存在的旧 Entry 修订 |
| `bodyDigest` | 对完整实际 `entry.body` 的原样 UTF-8 字节做 SHA-256；不 trim、不 NFC、不改换行 |
| `sectionId` / Entry `time` | 原样对应现有 Section 与 `{kind, iso}`；不从正文对象名推断 Section，不把表达记录时间当事件日期 |
| `start` / `end` / `literal` | 原文 UTF-16 code unit 下标，左闭右开；要求非空、未越界、完整字素边界，且 `body.slice(start,end) === literal` |
| `spanDigest` | 对 `literal` 原样 UTF-8 字节的 SHA-256；与正文摘要分别检查 |
| `evidenceUnits[].sourceId` | 逐一绑定原有 obligation `O1` 和 annotation `A1` 的真实 ID、所属 Entry、原跨度；不发明源义务 ID |
| `meaningRuleIndexes` | 本 Entry `mustPreserve` 的零基下标，完整映射且不重复；只是本草案中的关系字段，不冒充源数据字段 |
| `coverage` | 固定 12/36 与原 36/36 义务/标注全量集合；excluded、removed、unavailable、exactDeduped 为空，36 条合成 Entry 的独立人类评审仍全部缺失 |
| `documentDigest` | 复用既有 PAIA canonical JSON digest，对移除 `documentDigest` 字段后的整份文档计算；普通对象键顺序不改变其值 |

每条保留、压缩、禁止推断及未决规则都带所属主 Entry 的真实证据。跨 Entry 关系至少有两个不同真实贡献者，且每个 Topic 的关系合计覆盖已有 failure obligation 的全部 Entry。原 obligation/annotation 是整段跨度时，完整保留这个事实；更细的片段放在规则的 `supportRefs` 中。

JSON 入口复用原 strict parser 拒绝重复键，包括解码后重复的转义键、非法 UTF-8 和超限内容；schema 逐层拒绝缺失、null 替代、空必填文本、未知字段、非法枚举、重复项和非 JSON 对象。上限沿用 1 MiB、深度 24、每对象 64 键等已有解析限制，另有限定的数组规模和安全整数范围。

**本草案文件额外要求数字 token 是规范的非负十进制安全整数。** 小数、指数、`-0`，以及会下溢或舍入的 `1e-9999`、`26.0000000000000001`、`1.0000000000000001` 均拒绝；字符串中的同样文字保留。一般 JSON Schema 对等值的 `1.0` / `1e0` 可视作 integer，本文件入口故意更严格，不能只用通用 schema 校验替代 CLI。此词法规则不应用于已按原 SHA 固定的上游 review contract，其原有小数阈值保持不动。

程序 API `validateAdjudication(bytesOrPlainObject)` 与 `validateSupportRefs(refs, topicId)` 自行读取固定可信源，不接收替代数据源。对象入口在首次异步读取前保存同步校验后的内部快照；调用方后续修改不能改变此次被验证的对象。对象 API 无法恢复调用方在调用前已通过 `JSON.parse` 丢失的原数值 token，严格文件词法保证来自字节入口或 CLI。文件入口另外检查真实普通文件、大小、符号链接、打开后的身份以及读取期间的文件变化。

## 逐主题语义边界

| Topic | 必须保持的关系；需要保留的未决范围 |
| --- | --- |
| R01 | 场地费上限只是“考虑”的必要条件；同意询价不等于这次同意付款或确认报名；星期词没有自动获得绝对日期 |
| R02 | 去年认可速读适合所有书、现在不再认同，当前按文体区分；朋友的评价不能改作“我”的立场 |
| R03 | 十二只中包括昨天留下的两只；不能推出“十只今天新放且全到岸”；余下纸船的具体情况及绝对日期仍未决 |
| R04 | “有一点紧张”不升级为害怕；愿意练习不授权别人承诺登台；封闭排练的条件与公开场合未定必须保留 |
| R05 | 一年山城居住是假设；朋友的四十分钟通勤不变成作者实测；未定搬迁和未签约不得升级为事实 |
| R06 | 可能寄送、釉面条件、蓝/绿样品和谁未检查各有范围；未声称已寄不等于独立查证物流；蓝色样品与条件中试验釉面的同一性未决 |
| R07 | 明确保持九月二日 → 查票根 → 九月十二日的句内纠错方向与同一次旅行；不补年份、回程日期或未确认的日期角色 |
| R08 | 相同正文的两条 Entry 有不同表达时间，证据均保留；未提出取消浇水与提出取消自动喷水器不强行合成全面停水，也不先验认定二者冲突 |
| R09 | 灯“太刺眼！”、想调暗而非关闭、一点恼火及原感叹号保留；海报“全部关灯”不是作者命令 |
| R10 | 两组观察、尚未排除温度混杂、下次拟同时控制温度而计划尚未执行，各自保留；关联不变因果，计划不变完成 |
| R11 | 分解形式 `café` 与家庭 ZWJ emoji 原字素保留；图形既不证明真实家庭人数，也不证明真实人数一定不是四人 |
| R12 | 旧码头摄影与新码头测绘不是同一个对象；摄影章节的三幅图片不是测绘项目的三份成果；按真实 Section 保持归属，不猜测名称到 S1/S2 的映射 |

当前草案有 15 条 Entry 含相关未决项、11 条跨 Entry 关系为 `UNRESOLVED`，共 26 个未决原子项。其余 21 条 Entry 的 `unresolved` 为空，只表示草案没有提出相关未决点，不表示人工已认可。各草案本身也需要人类纠错。

## 引用有效仍可能整句错误

16 个反例覆盖全部 12 Topic，至少分别包含否定翻转、条件丢失、主体错配、时间错置和错误合并，并增加纠错倒序、未知日期补造等情形。每个反例都有完整真实引用、原样输出与摘要、明确的 AI 草案拒绝理由，以及 original / balanced / concise 三种风格下的边界。

例如 `ADV-01` 引用真实 `HELD-R01-E002` 的“我同意先询价；这不是同意付款，也不是报名确认。”，却输出“我同意付款，也已确认报名。”。该例 `supportRefs` 可以通过 `validateSupportRefs`；其 `semanticVerdict: REJECT` 是 **AI_AUTHORED_DRAFT 的语义意见**，并非验证器从引用推出的自动评分。

测试还把一条规则文字改成明显错误的断言并重新计算 document digest，确认机械验证依然只能报告 `NOT_VERIFIED`。这项正例刻意固定工具能力边界，不能改成“有引用所以语义通过”。这些反例也不是已经观察到生产 Original runtime 接纳错误改写的实测结果。

## 状态、公开/私有边界与人类工作

| 字段/状态 | 含义 |
| --- | --- |
| `AI_AUTHORED_DRAFT` | 所有本次裁定的来源；包括 `REJECT`、`DRAFT` 和 `UNRESOLVED`，均未升级为人类裁定 |
| `DRAFT` | 有待人类判断的具体主张；不是“已解决”或“零错误” |
| `UNRESOLVED` | 证据尚不能确定相关对象、关系或冲突如何解释；必须保留问题与原证据 |
| `NOT_RUN` | 人类语义审查、作者验收、模型执行和质量资格尚未进行；缺失值不得替代成零错误 |
| `VALID` | 结构与固定证据绑定合规；报告同时给出 `STRUCTURE_AND_EVIDENCE_BINDINGS_ONLY` 与 `NOT_VERIFIED` |
| `PUBLIC_SYNTHETIC_NOT_BLIND` | 含风格名称和裁定理由的公开合成草案；不是现有盲审 reviewer packet |

本格式不接受真人评分、LLM 生成的分数、声称已完成的人工回执、真实作者同意或盲审 private assignment/seed/map 字段。把 LLM 评分的角色名改成人类，或把 private corpus 的摘要改成自算值，都不能成为本固定 corpus 的证据。

closed schema 和身份绑定可以拒绝这些已知格式/来源混淆；它们**无法鉴定自由文字中是否混入私人信息、评分是否真由人写、作者是否同意或一句话是否语义正确**。不要向本工具输入真实私人内容。摘要用于绑定和复核，不是隐私证明、访问授权或评审者身份认证。

接下来仍需独立人类逐证据评审草案和反例、判断未决点、判断各风格是否符合作者原意，再通过有真实身份与来源证据的评审流程记录结果。本 v1 不提供伪造或自填人工完成回执的通道。12 个合成主题不能代表真实作者群体，不能支持模型质量或作者接受率结论；若将此已曝光草案用于提示词/模型调优，后续资格评估必须如实处理其调优暴露并换用独立样本，不能继续把它当作未见过的质量证据。

dot 可单独审查/整合本目录；无需修改原冻结数据或现有盲审工具，不接入 UI、生产 runtime、模型供应商或全局 CI。最终提交 SHA、Draft PR 及本次实际测试结果在协作交付中给出；本目录没有合并、部署或质量认证动作。
