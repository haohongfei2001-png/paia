# 本次实际验证记录

本记录证明离线实现、交付文件和测试的执行情况。语义裁定仍全部为 **`AI_AUTHORED_DRAFT`**；机械通过不构成人类认可或模型质量结论。

## 基准与运行环境

- 开始时最新 `main` / 本分支父提交：`2cc827e8e4bed9d7d7a2a57fce1d6a8f5724c3a8`。
- 分支：`codex/ai-cost07-semantic-adjudication-pro-20261018`。
- 本次实际运行日期：**2026-10-17 UTC**；分支按协作要求使用 `20261018` 后缀。
- Node：**v24.19.0**；Linux；无 npm 安装、外部服务、API 密钥或模型调用。
- 最终全套测试完成后，只增加本记录和修正文档措辞，没有修改受测实现、测试或草案内容。

提交前再次读取远端时，`main` 已推进到 `76e2cb1e34f9c579896211c456534f0e3d2e4f9c`，是以本次基准为父的独立 UI 文档/参考资产提交。其变更不涉及本目录、固定合成证据或复用的离线工具。本分支继续保持用户要求的“开始时最新 main”基准；没有把后续并行工作改写进本专项。最终完整 HEAD SHA 在 Draft PR 描述中给出，以免在被哈希的提交内写入自引用 SHA。

## 最终完整测试：91 / 91 PASS

仓库根目录实际执行：

```bash
node --test extension/tests/experimental/ai-qwen-semantic-adjudication/*.test.mjs \
  extension/tests/audits/ai-qwen-heldout-root.test.mjs
```

| 测试来源 | 实际通过 |
| --- | ---: |
| `validator.test.mjs` | 45 |
| `cli.test.mjs` | 42 |
| `offline.test.mjs` | 1 |
| `delivery.test.mjs` | 2 |
| 未修改的 `ai-qwen-heldout-root.test.mjs` | 1 |
| 合计 | **91** |

Node 运行汇总：`tests 91 / pass 91 / fail 0 / cancelled 0 / skipped 0 / todo 0`，实际总耗时 `6206.370927 ms`。子进程操作系统错误和超时会让测试失败，不能以未执行测试冒充通过。

测试包括：

- 全 12 Topic / 36 Entry / 36 obligation / 36 annotation 正例；源身份、修订、正文摘要、跨度和文档摘要分别破坏后拒绝，重新封装 document digest 不能掩盖坏引用。
- 所有层级的未知/缺失字段、重复键及转义同名键、重复 ID、相同 ID 的不同对象、非法枚举、空值、非法 UTF-8、非 JSON 对象、schema 自身不可变性。
- 未知时间、表达参考时间、Section 归属和完整分母；遗漏 Entry、人类评审缺失列表或源义务不能变成较小分母上的“成功”。
- 真实 `HELD-R11` 中组合字符与 ZWJ 家庭 emoji：完整字素通过，拆开字素、改成 NFC 或截取单个家庭成员均拒绝。
- 人类/模型资格状态、公开非盲边界、伪造 human receipt / LLM ratings / 私有 assignment 字段拒绝。
- 16 个反例的引用有效；不含自动语义评分。重新封装一个明显错误的规则文本仍只得到 `NOT_VERIFIED`，以固定机械验证器的能力边界。
- CLI 严格参数、输入文件身份和大小、新目录/独占文件创建、仓库路径及符号链接绕过、已有/部分输出拒绝、权限、只读验证和逐字节可复现。
- 输出到第二个文件时注入写入失败：保留第一个文件、没有完成回执、非零退出，重试仍拒绝覆盖。
- 网络入口被替换为抛错函数的子进程内，构建及完整验证仍通过，观测到的网络尝试为 0；该子进程环境只保留 PATH 和 LANG。
- 随提交的 `adjudication.json`、`schema.json`、`report.json`、`receipt.json` 与从当前实现新建的离线输出逐字节相同。

## 真实源码变异：13 / 13 KILLED

实际执行：

```bash
node extension/tests/experimental/ai-qwen-semantic-adjudication/mutation-tests.mjs
```

完整机器结果见 `mutation-report.json`。runner 先实际执行全部 **45** 项验证器测试，要求 45 pass、0 fail/skip/cancel/todo；再在 `os.tmpdir()` 专属副本中逐一移除或替换源码守卫，运行**同一项原负例**。

| 被变异的真实检查 | 结果 |
| --- | --- |
| `STRICT_JSON`：重复 JSON 键检查 | KILLED |
| `NUMBER_FORMAT`：原始数值 token 精确性 | KILLED |
| `SCHEMA_CONST`：AI 来源不能变成人类 | KILLED |
| `CLOSED_SCHEMA`：嵌套模型评分等未知字段 | KILLED |
| `COVERAGE`：源及缺失评审分母 | KILLED |
| `ENTRY_COVERAGE`：Entry 全集 | KILLED |
| `REF_REVISION`：真实修订 | KILLED |
| `REF_BODY_DIGEST`：完整正文摘要 | KILLED |
| `REF_GRAPHEME`：完整字素边界 | KILLED |
| `REF_LITERAL`：实际原文匹配 | KILLED |
| `REF_SPAN_DIGEST`：跨度正文摘要 | KILLED |
| `RULE_STATUS`：未决规则不能伪作普通裁定 | KILLED |
| `DOCUMENT_DIGEST`：整体 canonical 摘要 | KILLED |

结果：**13 killed / 0 survived / 0 invalid mutations**。每个变异的 TAP 记录必须证明其唯一目标测试实际执行，并因坏输入被接纳而产生 `Missing expected rejection`。语法错误、导入错误、错误的冻结数据、超时、无测试或 `EPERM` 均不计入 KILLED。原 `.mjs` 前后摘要逐项相同，变异副本清理；未改原工具或 fixtures。此结果只是被列出的检查对相应负例敏感，不是所有潜在缺陷已穷尽的证明。

审计实证并修复了三个边界问题：递归冻结导出的 schema；两处对象 API 在首次 `await` 前取得校验后的快照；草案 JSON 字节入口在数值被舍入/下溢前拒绝非规范整数 token。对应回归均进入上述最终 91 项结果。上游 review contract 的原小数阈值未改。

## 交付内容与摘要

实际命令 `node .../cli.mjs draft --out=/tmp/paia-semantic-delivery-20261018` 向尚不存在的目录生成四个文件，随后以拒绝覆盖方式复制到本目录。没有复用或覆盖先前试运行的输出。

| 项目 | 结果 |
| --- | --- |
| 草案文档字节数 | 406243 |
| 草案文件 SHA-256 | `6e7b4cbaa06e1590cbe1e36613f67295fb01ee7f32a647ed85fcfbdd8144b9b1` |
| 草案 canonical `documentDigest` | `b4a6366016e8dd66621dfd1b406e6b134344ffa3f4df3a3802d04fa80a911f57` |
| `schema.json` SHA-256 | `2a8750391aa61aa2fef7a06d5ff5ce8500e4eb8f5d7b79d7add8c9a82d6fd27a` |
| `mutation-report.json` SHA-256 | `b6133d71037c7eedc6a8b789e965779cc70375e057119efa688a9d3f3e3f7d59` |

`receipt.json` 逐项记录三个生成文件的字节摘要与大小，以及七个实际实现/内容模块的摘要。该回执只是确定性文件生成记录，不记录或认证人类身份、语义评分或作者同意。

## 冻结与共享范围

本次核对了以下范围内全部 **21 个既有 Git blob**，工作区字节与基准提交完全一致，缺失文件数为 0：

- `extension/tests/fixtures/ai-qwen-offline-v1/` 的全部 5 个文件。
- `extension/tests/experimental/ai-qwen-offline/` 的全部既有文件，包括 blind formatter/readback/README。
- `extension/tests/audits/ai-qwen-heldout-root.test.mjs`。

另核对固定 style contract 的 SHA。固定源清单如下，均与基准相同：

| 原文件 | SHA-256 |
| --- | --- |
| `calibration.json` | `56891aeb3abcc82e330e542007e849a2efb1c5b819274e11d2234cc2637d8d9b` |
| `freeze.json` | `fc7e0aefbff87cd0453a712ac6a7bea78ddbd328c127e9ba380d6256f3de2877` |
| `held-out-root-freeze.json` | `3f04c17e7bb3a076475d62829d426bf97c9d25a528eedf3ae1f50cf17cfcbee1` |
| `held-out-root-v1.json` | `1ed69045f9787f34dc695b9f2b7187f1e8806ffa1c3abc83cded89f90d9ff88c` |
| `review-contract.json` | `0cda0babef3e2503e3efd8cb28f1f2fd143e8a953fd28dd38ff999adc1b400d3` |
| `AI_ORGANIZE_STYLE_CONTRACT.md` | `893e79a05bcb782d5761b20f289bd9eb595cf6a45858e329c57289531babcec7` |

代码与记录只提交本新目录；没有修改生产 runtime、UI、Now、版本、STATUS、MASTER_PLAN、CI 或旧验收阈值。未运行生产浏览器/发布资格全套，也不借本次离线结果声称那些验收通过。

## 仍需人类判断

36 条合成 Entry 的独立人类语义评审仍全部缺失。当前共有 277 条 Entry 规则（含 108 条三风格规则）、30 条跨 Entry 关系、16 个反例；15 条 Entry 和 11 条关系合计保留 26 个未决项。

人类仍需逐项判断草案是否忠于原意、三风格是否合适、反例理由是否正确，以及未决关系如何处理。任何新的人类评审都需要真实来源与回执，不可由此工具或 AI 自填。

`independentHumanReview`、`authorAcceptance`、`modelQualityQualification`、`modelExecution` 继续 **`NOT_RUN`**；`semanticCorrectness` 为 **`NOT_VERIFIED`**；12 个公开合成主题不代表真实作者群体。本分支供 dot 审查整合，没有执行合并或部署。

## 2026-10-17 独立整合审查与文件竞争修复

原 Pro 交付 HEAD `ddb9056ddf3db23a328cb531917c1238a7861017` 保留为原始历史，原新增范围为 19 文件。独立审查先在未修改的该 HEAD 重跑上述完整命令：**91/91 PASS**，零 fail/cancel/skip/todo，`5869.860608 ms`；原真实变异仍为 **13/13 KILLED**。对最新 main `75905c3555d7e7929b5a96f706b9cf9ec1d9c699` 的未提交合并试验没有冲突，合并树 `dd9a58d43a9130cf6bdb2a59285f67cc2560ba99` 也通过 **91/91**，`6425.039761 ms`。这些是原版证据，不是下述修复版的测试次数。

在原版实际函数上，用子进程 preload 仅安排真实文件系统竞争，复现了两个缺口：

1. 原 `cli.mjs:81–82,118–125`：原子 mkdir 完成后，把刚创建的目录重命名、原路径替换为指向仓库内已有目录的符号链接。原版随后按绝对路径写入四个文件，并以退出码 0 返回 `VALID`；原新目录为空，仓库内替代目标收到全部文件。
2. 原 `cli.mjs:45–47`：lstat 普通输入后、open 前，将它换成 FIFO。原 `O_RDONLY | O_NOFOLLOW` 会等待 FIFO 对端，尚未到后面的类型/inode 检查。独立控制在 1500ms 命中 `ETIMEDOUT`、`SIGTERM`，stdout/stderr 均为空。这是原失败，不是通过。

最小修复仍只在本专项目录：输入增加 `O_NONBLOCK` 后 fstat；输出新加 `output-writer.mjs`，继承已打开目录 fd，在独立子进程中以 cwd inode 为锚、只对固定名称作相对 `wx` 写入。写入前后核对实际路径、inode、当前 UID 和目录 0700/文件 0600，不修改外部权限；禁止替换路径重定向写入。完成回执最后写，持有其 fd 直到最后核对，观察到竞争时将自己的回执 inode 清空而不操作替代目录。父 cwd 不改变，子进程环境为空，错误/超时不泄露输入或路径。父进程超时杀停工作进程并等待关闭。新增一个源文件后，专项总范围为 **20 文件**，没有把原 19 文件记录改写为 20。

最终修复版实际执行原完整命令：**105/105 PASS**，`10012.813774 ms`，零 fail/cancel/skip/todo。其中 validator 45、CLI 56、offline 1、delivery 2、原 held-out 冻结审计 1。新增 14 条实际控制涵盖输入 FIFO 竞争、mkdir 后 symlink、写入前 symlink、启动前普通目录替换、原 inode 移进仓库、receipt 写入竞争、输出 leaf 独占、子进程启动/退出/超时、父 cwd 并发保持、空环境/禁网，以及目录/文件权限变化。既有第二文件写入失败测试改为对真实写入子进程注入同一失败，未删除失败断言或放宽超时。

修复过程的首轮新增 CLI 测试为 51 项，保留 **49 PASS / 2 FAIL**：一次 EPIPE 覆盖了子进程已给出的 `OUTPUT_CHANGED`，另一次 inode 移动控制因 /tmp 与仓库分属不同文件系统触发 EXDEV。前者修正错误归因；后者改用仓库外同文件系统的私有 sibling 目录完成真实 rename，未跳过该控制。后续 51/51、53/53 和完整 103/103 属各自中间受测字节，最终身份以上述 105/105 为准。

最终变异命令仍先执行全部 45 项原验证器测试，再真实移除 13 个检查；结果 **13 KILLED / 0 SURVIVED / 0 INVALID**。独立重跑报告 SHA-256 为 `c447fdcd91f0327481ed15f4d9bce003401985c0cb6a4e92d2c6c53dbbe5eae6`；原 `mutation-report.json` 保留其原身份。两份报告仅有 STRICT_JSON / NUMBER_FORMAT 的 mutatedSourceDigest 不同：runner 为临时 trusted.mjs 写入真实 parser/fixture 的绝对 file URL，独立工作区路径不同会改变这两个变异源码摘要；baselineSourceDigest、13 个实际目标、测试结果与其他变异摘要均相同，不能声称跨工作区报告逐字节相同。原 `adjudication.json`、`schema.json`、`report.json` 字节与原交付相同，只有 `receipt.json` 更新实际 CLI 摘要并增加新写入模块摘要。仍为 12 Topic / 36 Entry / 36 obligation / 36 annotation、277 Entry 规则（含 108 风格规则）、30 关系、26 未决项和覆盖全部 12 Topic 的 16 反例。21 个既有冻结/formatter/readback 文件在原基准、Pro HEAD、最新 main 与审查工作区逐字节相同。

功能路径使用 POSIX Node 目录 fd/cwd，不使用 `/proc` 或 Linux-only 分支；这里只在 Linux Node v24.19.0 运行，**macOS 实测未运行**。不支持目录 fd 继承的平台会安全失败而非降级成路径写入。使用可信私有输出父目录；同 UID 对手可在首次 mkdir/open 间替换普通目录，或移动原 inode、在核对之间/返回后直接改动文件，纯 Node 没有永久重命名锁。本修复保证被测试的两种竞争稳定拒绝，并防止钉住 fd 后的路径替换重定向；不把它扩称为完整同权限攻击隔离或物理存储可靠性证明。

以上仍只是离线机械整合审查。人类语义审查、作者接受、模型执行/质量、macOS 实机、生产浏览器/发布全套均没有因此取得通过资格。`AI_AUTHORED_DRAFT`、`NOT_VERIFIED`、四项 `NOT_RUN` 和 `NO_POPULATION_CLAIM` 原样保留。
