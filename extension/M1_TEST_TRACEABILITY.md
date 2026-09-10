# M1 对 144 项计划的实施追踪

原计划共 144 项。这里逐项界定 **M1 子契约**，不是将 144 项整体标成通过。自动测试数量以最终报告为准；一个自动测试可覆盖多个契约，一个计划行也可能跨 M1–M5。

证据简称均对应 `tests/thought-m1.test.mjs`、`tests/thought-runner.test.mjs`、`tests/thought-m1-e2e.test.mjs`、`tests/storage-performance.test.mjs`、既有冻结语义回归，或 `outputs/v070-m1-worker-smoke.mjs`。最终实测报告为 `outputs/v070-m1-acceptance.md`。

| ID | 原计划场景 | M1 覆盖与验收 | 后续范围 |
|---|---|---|---|
| A01 | explicit fact：人工样本“样例项目采用离线存储。” | M1 子契约已验收：Family/Type 的严格数据映射、纯文本与未知字段拒绝。证据：Type/UTF-8、forged fields 测试 | 内容识别/grounding 为 M4，模型质量为 P1 |
| A02 | explicit event，两个不同时刻同一句陈述 | M1 子契约已验收：Family/Type 的严格数据映射、纯文本与未知字段拒绝。证据：Type/UTF-8、forged fields 测试 | 内容识别/grounding 为 M4，模型质量为 P1 |
| A03 | explicit preference，短句“我偏好纯文本。” | M1 子契约已验收：Family/Type 的严格数据映射、纯文本与未知字段拒绝。证据：Type/UTF-8、forged fields 测试 | 内容识别/grounding 为 M4，模型质量为 P1 |
| A04 | decision：明确选择一个方案 | M1 子契约已验收：Family/Type 的严格数据映射、纯文本与未知字段拒绝。证据：Type/UTF-8、forged fields 测试 | 内容识别/grounding 为 M4，模型质量为 P1 |
| A05 | judgment：带条件和不确定性的判断 | M1 子契约已验收：Family/Type 的严格数据映射、纯文本与未知字段拒绝。证据：Type/UTF-8、forged fields 测试 | 内容识别/grounding 为 M4，模型质量为 P1 |
| A06 | idea：尚未执行的构想 | M1 子契约已验收：Family/Type 的严格数据映射、纯文本与未知字段拒绝。证据：Type/UTF-8、forged fields 测试 | 内容识别/grounding 为 M4，模型质量为 P1 |
| A07 | goal/plan 与 reflection | M1 子契约已验收：Family/Type 的严格数据映射、纯文本与未知字段拒绝。证据：Type/UTF-8、forged fields 测试 | 内容识别/grounding 为 M4，模型质量为 P1 |
| A08 | creation：诗/代码样式纯文本段落 | M1 子契约已验收：Family/Type 的严格数据映射、纯文本与未知字段拒绝。证据：Type/UTF-8、forged fields 测试 | 内容识别/grounding 为 M4，模型质量为 P1 |
| A09 | mixed Input | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| A10 | short important：一个简短明确拒绝/决定 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| A11 | 两个明确 Input 的综合内容 | M1 子契约已验收：多非 context 来源、inferred 禁止 auto、非空证据/输出与限长。证据：multi-source、inferred、empty evidence、Type/UTF-8 | extraction/候选与精确引用验证为 M4 |
| A12 | inferred-only candidate | M1 子契约已验收：多非 context 来源、inferred 禁止 auto、非空证据/输出与限长。证据：multi-source、inferred、empty evidence、Type/UTF-8 | extraction/候选与精确引用验证为 M4 |
| A13 | 空 body、超长 body、输出多余字段/类型 | M1 子契约已验收：多非 context 来源、inferred 禁止 auto、非空证据/输出与限长。证据：multi-source、inferred、empty evidence、Type/UTF-8 | extraction/候选与精确引用验证为 M4 |
| A14 | model confidence=1 但引用偏移无效/无 primary | M1 子契约已验收：多非 context 来源、inferred 禁止 auto、非空证据/输出与限长。证据：multi-source、inferred、empty evidence、Type/UTF-8 | extraction/候选与精确引用验证为 M4 |
| B01 | single Input | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B02 | multiple Input | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B03 | 输入 rev3 被读取，commit 前到 rev4 | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B04 | context_only 普通邻居 | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B05 | filtered neighbor | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B06 | user_removed | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B07 | source tombstoned | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B08 | branch_pending/无可信身份 | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B09 | 实际旧版本 revision 已 prune | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B10 | libraryText 空串或手工改过 | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| B11 | 来源只读关系与 Provider capability | M1 子契约已验收：只读 Source/Input 关系；未向 runtime 增加 AI 写入命令。证据：forged fields、invariant、background security | Provider capability DTO 为 M3 |
| B12 | note/title 不在 selectedFields | M1 子契约已验收：版本/digest/角色、working body、context 与删除资格、旧版本不可冒充。证据：actual version、持久移除序号、context-only、forged evidence、unavailable version、purge | Provider DTO/请求层为 M3；来源展开界面为 M2 |
| C01 | Topic 文档 body/title 直接输入 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| C02 | 750ms debounce/3s max wait、失焦/切页 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| C03 | 保存中继续输入；回执后还有变动 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| C04 | Undo/Redo，快捷键/菜单/跨 Entry selection | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| C05 | body/title/note/type 分别编辑 | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| C06 | 只改 Topic、只移 Section、只排序 | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| C07 | 用户编辑期间 AI task 完成 | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| C08 | 两标签同字段修改 | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| C09 | 两标签不同字段修改 | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| C10 | 独立 authored Entry、无 Input refs | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| C11 | 旧 userEdited=true，字段证据缺失 | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| C12 | write quota/事务中断/回执丢失 | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| C13 | saving 时 remote notification | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| C14 | paste/drop 富文本/HTML/script/长文本 | M1 子契约已验收：字段/组织人工保护、CAS、幂等、独立 authored、纯文本限长。证据：human edit、two-tab CAS、quota abort、independent authored；extra Chrome smoke | 编辑 UI/IME/草稿为 M2；AI suggestion policy 为 M4 |
| D01 | 一个 Entry 多 Topic | M1 子契约已验收：UUID/Section/Placement、稳定 rank/ID、redirect 防环、人工正负组织意图。证据：Topic/Section、ten Topic、redirect/rank、organization revision restore | 组织 UI、Section merge/reorder、pin、rebalance、late AI layout 为 M2/M4 |
| D02 | Topic rename | M1 子契约已验收：UUID/Section/Placement、稳定 rank/ID、redirect 防环、人工正负组织意图。证据：Topic/Section、ten Topic、redirect/rank、organization revision restore | 组织 UI、Section merge/reorder、pin、rebalance、late AI layout 为 M2/M4 |
| D03 | 用户 Topic merge，包括同名 Section/重复 Entry | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| D04 | Section create/rename/merge/reorder | M1 子契约已验收：UUID/Section/Placement、稳定 rank/ID、redirect 防环、人工正负组织意图。证据：Topic/Section、ten Topic、redirect/rank、organization revision restore | 组织 UI、Section merge/reorder、pin、rebalance、late AI layout 为 M2/M4 |
| D05 | pin/unpin 与 rename | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| D06 | manual Entry order 后 AI 插入 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| D07 | rank collision/exhaustion/rebalance | M1 子契约已验收：UUID/Section/Placement、稳定 rank/ID、redirect 防环、人工正负组织意图。证据：Topic/Section、ten Topic、redirect/rank、organization revision restore | 组织 UI、Section merge/reorder、pin、rebalance、late AI layout 为 M2/M4 |
| D08 | AI late output 指向已 merged Topic/Section | M1 子契约已验收：UUID/Section/Placement、稳定 rank/ID、redirect 防环、人工正负组织意图。证据：Topic/Section、ten Topic、redirect/rank、organization revision restore | 组织 UI、Section merge/reorder、pin、rebalance、late AI layout 为 M2/M4 |
| D09 | 手工移出某 Topic 后再 extraction | M1 子契约已验收：UUID/Section/Placement、稳定 rank/ID、redirect 防环、人工正负组织意图。证据：Topic/Section、ten Topic、redirect/rank、organization revision restore | 组织 UI、Section merge/reorder、pin、rebalance、late AI layout 为 M2/M4 |
| D10 | merge 中断/结构并发/正文编辑 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| E01 | 相同 Input/version/candidate retry | M1 子契约已验收：operationId 去重、编辑后签名撤销/更新、人工同文不折叠。证据：receipts、human edit、independent authored | semantic/exact consolidation 为 M4 |
| E02 | 同 assertion/body 不同来源 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| E03 | 同文字不同事件/条件/主体 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| E04 | 相似但演化/否定词/数字/态度变化 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| E05 | mock hash collision | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| E06 | 人工改过 body 或组织的 existing Entry | M1 子契约已验收：operationId 去重、编辑后签名撤销/更新、人工同文不折叠。证据：receipts、human edit、independent authored | semantic/exact consolidation 为 M4 |
| E07 | 多个独立人工同文 Entry | M1 子契约已验收：operationId 去重、编辑后签名撤销/更新、人工同文不折叠。证据：receipts、human edit、independent authored | semantic/exact consolidation 为 M4 |
| E08 | relation schema self-loop/重复/对称/有向 | M1 子契约已验收：relation store 与唯一 relationKey 索引预留、purge 撤销。证据：v5 index inventory、future payload purge | 关系对象校验/行为与展示为后续，M1 没有执行入口 |
| F01 | 用户 delete Thought | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F02 | 相同证据/不同措辞/换 provider 重新提取 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F03 | 同文 recapture/import 新临时 ID | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F04 | 真正新增 independent non-context evidence | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F05 | 仅新 context/note/title/格式变化 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F06 | 同 Input 多 assertion 其中一个已删 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F07 | 唯一有效 Input 整条 remove | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F08 | 多源 remove 一条/最后一条 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F09 | 用户修改后所有 Input 消失 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F10 | permanent Source purge 全路径 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F11 | purge 的混合 authored/AI 历史 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F12 | 10k fan-out purge 中断/重启 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F13 | removed Thought restore vs purged Source | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F14 | prune 90天之后重新提取 | M1 子契约已验收：独立 suppression、context/note 不解锁、remove/purge、断点及历史 fence。证据：suppression、selected-note、multi-source、purge、legacy quarantine、retention；Chrome smoke | 删除/候选 UI 为 M2/M4；F04 仅 future eligibility，不创建或接受候选 |
| F15 | 来源已发到远端后 purge | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | P1 真实 Provider 边界；不在 M1 实现 |
| G01 | Input body rev 改变 | M1 子契约已验收：按所选字段判断 stale、部分/脱离依赖、用户保护、过滤不重置既有内容。证据：note-only、selected note、multi-source、human protection；Smart Filter regression | refresh allowlist/建议为 M4；界面为 M2 |
| G02 | note-only且只用过body | M1 子契约已验收：按所选字段判断 stale、部分/脱离依赖、用户保护、过滤不重置既有内容。证据：note-only、selected note、multi-source、human protection；Smart Filter regression | refresh allowlist/建议为 M4；界面为 M2 |
| G03 | note-only且task用过note；title-only未用title | M1 子契约已验收：按所选字段判断 stale、部分/脱离依赖、用户保护、过滤不重置既有内容。证据：note-only、selected note、multi-source、human protection；Smart Filter regression | refresh allowlist/建议为 M4；界面为 M2 |
| G04 | multi-source一条更新/一条remove | M1 子契约已验收：按所选字段判断 stale、部分/脱离依赖、用户保护、过滤不重置既有内容。证据：note-only、selected note、multi-source、human protection；Smart Filter regression | refresh allowlist/建议为 M4；界面为 M2 |
| G05 | detached authored Entry | M1 子契约已验收：按所选字段判断 stale、部分/脱离依赖、用户保护、过滤不重置既有内容。证据：note-only、selected note、multi-source、human protection；Smart Filter regression | refresh allowlist/建议为 M4；界面为 M2 |
| G06 | 微小否定/数字/条件变化 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| G07 | 可证明无语义变化、未人工改body | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| G08 | stale + 人工body编辑 | M1 子契约已验收：按所选字段判断 stale、部分/脱离依赖、用户保护、过滤不重置既有内容。证据：note-only、selected note、multi-source、human protection；Smart Filter regression | refresh allowlist/建议为 M4；界面为 M2 |
| G09 | accept suggestion 时 base变化 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| G10 | 重复accept/reject、reject后late accept | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| G11 | pending inferred/无Topic候选 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| G12 | filter mode/late decision改变 | M1 子契约已验收：按所选字段判断 stale、部分/脱离依赖、用户保护、过滤不重置既有内容。证据：note-only、selected note、multi-source、human protection；Smart Filter regression | refresh allowlist/建议为 M4；界面为 M2 |
| H01 | timeout / 429 / 5xx | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| H02 | invalid JSON/未知字段/超大响应 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| H03 | prompt injection-like Input | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| H04 | late result after edit/delete/purge/cancel | M1 子契约已验收：迟到证据/epoch/CAS、事务原子性、cursor、无正文 receipt、不可写 Source/Input。证据：delayed output、abort、migration interleave、rapid remove/restore、runner、background security；Chrome restart | Provider job lease/retry/额度/策略执行为 M3/M4 |
| H05 | lease过期接管，旧worker返回 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| H06 | 每个阶段中断/结果后commit前中断 | M1 子契约已验收：迟到证据/epoch/CAS、事务原子性、cursor、无正文 receipt、不可写 Source/Input。证据：delayed output、abort、migration interleave、rapid remove/restore、runner、background security；Chrome restart | Provider job lease/retry/额度/策略执行为 M3/M4 |
| H07 | commit后回执丢失/多标签重复wake | M1 子契约已验收：迟到证据/epoch/CAS、事务原子性、cursor、无正文 receipt、不可写 Source/Input。证据：delayed output、abort、migration interleave、rapid remove/restore、runner、background security；Chrome restart | Provider job lease/retry/额度/策略执行为 M3/M4 |
| H08 | optional enqueue失败/漏通知 | M1 子契约已验收：迟到证据/epoch/CAS、事务原子性、cursor、无正文 receipt、不可写 Source/Input。证据：delayed output、abort、migration interleave、rapid remove/restore、runner、background security；Chrome restart | Provider job lease/retry/额度/策略执行为 M3/M4 |
| H09 | worker idle/no alarm | M1 子契约已验收：迟到证据/epoch/CAS、事务原子性、cursor、无正文 receipt、不可写 Source/Input。证据：delayed output、abort、migration interleave、rapid remove/restore、runner、background security；Chrome restart | Provider job lease/retry/额度/策略执行为 M3/M4 |
| H10 | Provider outages/credential失效/撤销consent | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| H11 | policy版本/人工保护变化 | M1 子契约已验收：迟到证据/epoch/CAS、事务原子性、cursor、无正文 receipt、不可写 Source/Input。证据：delayed output、abort、migration interleave、rapid remove/restore、runner、background security；Chrome restart | Provider job lease/retry/额度/策略执行为 M3/M4 |
| H12 | AI请求改Input/Source/永久delete/purge | M1 子契约已验收：迟到证据/epoch/CAS、事务原子性、cursor、无正文 receipt、不可写 Source/Input。证据：delayed output、abort、migration interleave、rapid remove/restore、runner、background security；Chrome restart | Provider job lease/retry/额度/策略执行为 M3/M4 |
| H13 | 输出重复调用可能重复计费 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| I01 | content script伪造Library/read/provider命令 | M1 子契约已验收：受信 sender、即时读取 gate、无日志正文/新网络、派生 search payload purge。证据：background/privacy suite、package/development audits、purge、Chrome schema | 实际 Provider DTO/credential/audit 为 M3；全文搜索为 M2 |
| I02 | DTO inspection with synthetic sentinel fields | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| I03 | removed/tombstone写后立刻Gateway读 | M1 子契约已验收：受信 sender、即时读取 gate、无日志正文/新网络、派生 search payload purge。证据：background/privacy suite、package/development audits、purge、Chrome schema | 实际 Provider DTO/credential/audit 为 M3；全文搜索为 M2 |
| I04 | 任意URL/redirect/SSRF式provider输出 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| I05 | console/error/diagnostic/receipt/job snapshots | M1 子契约已验收：受信 sender、即时读取 gate、无日志正文/新网络、派生 search payload purge。证据：background/privacy suite、package/development audits、purge、Chrome schema | 实际 Provider DTO/credential/audit 为 M3；全文搜索为 M2 |
| I06 | 默认未启用provider/empty registry | M1 子契约已验收：受信 sender、即时读取 gate、无日志正文/新网络、派生 search payload purge。证据：background/privacy suite、package/development audits、purge、Chrome schema | 实际 Provider DTO/credential/audit 为 M3；全文搜索为 M2 |
| I07 | CredentialProvider权限/撤销/句柄失效 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| I08 | Library search postings/purge | M1 子契约已验收：受信 sender、即时读取 gate、无日志正文/新网络、派生 search payload purge。证据：background/privacy suite、package/development audits、purge、Chrome schema | 实际 Provider DTO/credential/audit 为 M3；全文搜索为 M2 |
| I09 | task scope/额度 | M1 子契约已验收：Input evidence 数量/相邻 context 总量和 4KiB 门禁。证据：context-only、forged evidence | 完整 task BudgetPolicy 为 M3 |
| J01 | v0.6.0物理v3→v5、v0.6.1/.1/.2物理v4→v5 | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J02 | 空thoughts | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J03 | 非空旧thoughts、user_created/edited/multi-source | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J04 | categories名称绑定ID→UUID | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J05 | 未知实验schema/孤儿依赖/无法purge追踪 | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J06 | DDL/mapping/verify/activate每处crash | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J07 | migration期间Input正常edit/capture | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J08 | 完整invariant preservation | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J09 | migration中quota/error | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J10 | blocked connection/versionchange | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J11 | 旧frozen二进制打开v5 | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| J12 | 隔离区内容关联Source purge | M1 子契约已验收：本行属于 M1 的迁移/隔离/逐字段保护/失败恢复/降级门禁。证据：migration、nonempty/unknown legacy、mapping abort/interleave、Chrome schema、实际 frozen binary smoke | 无；隔离区手动纳入 UI 留待后续 |
| K01 | 1k/10k/100k Input + 1k/10k Entry | M1 子契约已验收：1k/10k/100k Input、10k fan-out、复用正文、200KiB/热历史、短事务。证据：storage-performance、ten Topic、hot revision、UTF-8；Chrome worker smoke | 完整 Topic/search/UI/Organizer 性能为 M2–M5；极端尾延迟如实报告 |
| K02 | 每Entry 1/3/10 Topic | M1 子契约已验收：1k/10k/100k Input、10k fan-out、复用正文、200KiB/热历史、短事务。证据：storage-performance、ten Topic、hot revision、UTF-8；Chrome worker smoke | 完整 Topic/search/UI/Organizer 性能为 M2–M5；极端尾延迟如实报告 |
| K03 | Topic分页同时insert/move/merge | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| K04 | 10k fan-out stale/purge | M1 子契约已验收：1k/10k/100k Input、10k fan-out、复用正文、200KiB/热历史、短事务。证据：storage-performance、ten Topic、hot revision、UTF-8；Chrome worker smoke | 完整 Topic/search/UI/Organizer 性能为 M2–M5；极端尾延迟如实报告 |
| K05 | 中文/英文/单字/长句/type/topic/section搜索 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| K06 | Topic/Section rename &多Topic搜索 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| K07 | 搜索index构建中/高频token/取消 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| K08 | 200KiB Entry/32KiB batch/byte cap | M1 子契约已验收：1k/10k/100k Input、10k fan-out、复用正文、200KiB/热历史、短事务。证据：storage-performance、ten Topic、hot revision、UTF-8；Chrome worker smoke | 完整 Topic/search/UI/Organizer 性能为 M2–M5；极端尾延迟如实报告 |
| K09 | 90天+20重要revision、热点长文 | M1 子契约已验收：1k/10k/100k Input、10k fan-out、复用正文、200KiB/热历史、短事务。证据：storage-performance、ten Topic、hot revision、UTF-8；Chrome worker smoke | 完整 Topic/search/UI/Organizer 性能为 M2–M5；极端尾延迟如实报告 |
| K10 | 普通edit/prune/index/Organizer同时进行 | M1 子契约已验收：1k/10k/100k Input、10k fan-out、复用正文、200KiB/热历史、短事务。证据：storage-performance、ten Topic、hot revision、UTF-8；Chrome worker smoke | 完整 Topic/search/UI/Organizer 性能为 M2–M5；极端尾延迟如实报告 |
| K11 | continuous document accessibility | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M2–M5 对应 UI/Organizer/语义/搜索范围；不在 M1 实现 |
| L01 | 两个不同标识/版本/能力的fixture adapters切换 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L02 | 生产registry为空 / NoProvider / 未支持task schema | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L03 | NoCredential/FixtureCredential ready/missing/expired/revoked | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L04 | 混入Source/assistant/removed/tombstone/无关conversation或Topic | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L05 | 8targets+2context/32KiB/4KiB context/48Ki估算/4比较Entry边界 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L06 | 多tab/worker同时reserve最后额度 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L07 | session额度达到/换tab/worker restart/开始新session | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L08 | daily边界/回拨/前跳后回拨 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L09 | 重试/多stage/子任务绕过预算 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L10 | reserve后未发/发出后timeout/crash/cancel/未知结果 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L11 | budget exceeded或policy限额下调 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L12 | 全部标准失败码 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L13 | 每次fixture请求的safeAudit与恶意descriptor/error | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
| L14 | 无破坏Provider升级、usage归档、货币字段未配置 | 不属于 M1 执行范围；没有作为通过或 skipped 自动测试计数 | M3 Provider/Credential/Budget/audit；不在 M1 实现 |
