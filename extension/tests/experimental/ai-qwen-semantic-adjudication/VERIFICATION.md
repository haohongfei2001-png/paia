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
