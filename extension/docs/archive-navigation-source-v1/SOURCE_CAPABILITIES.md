# Source capability / evidence contract

## 1. 现有能力，不制造真实站点接口

基线 `38804b9…` 有：ChatGPT visible sent-user DOM、稳定 conversation/message IDs、来源时间的被动 response metadata + DOM reconciliation。
基线没有：已认证的 Project identity/name/membership、Project/window ordering provider、rename/move/delete 事件输出。
已支持的 `/g/.../c/<id>` URL形态仅用于保持conversation ID，不能证明 `/g/...` 是 Project；禁止解析route前缀后直接填projectId。
`history-contract.js` 的named/structural/event输出只有user IDs/create/update。其扫描、response fingerprint或diagnostic候选都不是来源结构事实的许可。
本轮未读取授权用户的真实站点响应，不声称有可靠 API 字段名、Project selectors、deletion event 或排序 endpoint；后续也不能根据本文件的概念字段假定网页一定提供。

## 2. 逐能力状态

`capability = unsupported | unverified | verified`；具体observation还可 unavailable/conflict/stale。
一个provider必须独立声明 projectIdentity、projectName、membership、projectOrder、windowOrder、rename、move、conversationDeletion、projectDeletion；不能一个boolean代表全支持。

| 能力 | 规划基线 | 可以接收的合约证明 | 缺失处理 |
|---|---|---|---|
| conversation identity | 既有认证路径 | 当前规范route + 已存档stable ID / DOM proof | 原capture失败规则，不造身份 |
| Project ID/name | unverified | 已明确类型为Project、scope唯一且和当前conversation相关的provider字段/导航控件 | unknown；不按标题/URL前缀猜 |
| membership | unverified | conversation ID与Project ref的显式关系；显式null还须证明其意为无项目 | 保留last-known，初次unknown |
| Project/window order | unverified | 有界complete scope列表或provider显式rank合约，稳定refs和新鲜度可验证 | 单scope PAIA fallback |
| rename/move | unverified | 相同stable ID的新可信name/membership | 保留旧关系、不复制conversation |
| confirmed deletion | unverified | 明确subject ID的删除完成事实，且契约排除权限/登录/暂不可用 | 不标deleted；最多说明暂不可用 |

DeepSeek/Claude/mywrite是未来可注册source ordering provider的例子，不是本包已启用新抓取来源。已有导入文档可提供platform描述符，但不继承ChatGPT的能力声明。

## 3. ANS-03 的实站 capability gate

只在现有允许域、用户已打开并同意收录的当前页面，使用既有observer边界被动观察；不得主动fetch枚举项目、点击用户真实“删除”、移动其真实会话，或导出个人原始响应作为fixture。
没有可合规读取的实站目标时，记录 `LIVE_TARGET_UNAVAILABLE`，仍完成validator、reconciler、synthetic contract和安全fallback，不通过猜接口填补。
执行顺序固定：

1. 重新审查当前adapter/main，确认已有允许数据流和最大范围，没有另一分支的未合并实现可当基线。
2. 在可用实站目标上只取必要结构事实：字段路径/类型/层级、来源控件角色、ID关联规则、scope/pagination/completeness信息；原文/标题内容替换为合成值，保留结构与相等关系。
3. 分别判断 Project 与其他来源容器是否可区分；命名相同、同一prefix、邻近DOM都不构成类型证据。
4. 验证list是当前完整scope、explicit rank或有确切continuation语义；虚拟DOM、搜索结果、pinned/recent子列表、lazy load一页不是全序。
5. 给每种已证明形态写精确contract ID/version、validator、正例/负例fixture、采集方式与范围receipt；只保存脱敏合成fixture，不把真实用户JSON进Git。
6. negative fixtures覆盖同文消息、同名项目、custom container、截断/空中间页、错误账户/namespace、未登录、403/404、请求失败、旧epoch、late response、重复rank、伪造message正文中的project字样。
7. 只有通过对照真实形态的contract与负例测试的能力可标verified。Synthetic-only能力必须显示unverified并在真实adapter返回unavailable。
8. 发布receipt时逐能力列supported/unsupported/unverified、test refs、实站观察是否执行；不能只写“ChatGPT适配完成”。

只观察当前conversation并不能证明全账户项目顺序；该来源可以membership verified而ordering unavailable。
不能仅因页面有按钮名“删除”就认为删除已发生；点击请求发送、乐观DOM移除也不是成功确认。真实删除正例可由已存在的脱敏合约证据支持，不能为认证擅自删除用户内容。

## 4. 来源结构观察的 trust budget

新增structure extraction与现有Source time extraction分开validator，但复用现有consent/epoch/session/current route的控制通道；不得让任意MAIN postMessage直接获得DB写权限。
DOM提取只能来自已认证的app navigation/header区域，排除user/assistant正文、输入区、tooltip自由文本、上传附件及脚本内容。
response提取只从已允许被动响应、或同等已审查且不扩大站点权限的精确被动合约中投影最少字段；不读取请求体、认证headers、cookies、token或session credentials。
新增被动endpoint形态也必须列入本轮明确白名单与privacy回归；若必须引入全账户主动请求或凭据读取才能完成，BLOCKED而非偷偷实施。
对未归档会话的标题/关系/内容不持久化；为相对order证明短暂看到的IDs限内存/限量，不创建Source或Conversation。project名字仅保存确有已归档ref所需者。
现有精确conversation capture exclusion阻断其后续source structure观察；已保存关系仍可读。不用导航设置自动重开capture。

## 5. 正例、fallback 与验收措辞

可靠合成provider必须证明完整系统路径：observation→trusted admission→source metadata→Navigator→Settings来源排序→切回PAIA；不能只unit test comparator。
真实ChatGPT支持哪些，最终只报告哪些。未经证明的Project/membership保持unknown，删除无证明就不显示外部已删除，order无证明就明确PAIA fallback。
R8完成要求模块有真实消费者、持久偏好和fallback状态UI，不允许“只有接口，未来再接”。
R6/R7完成要求可用可信证据的通用模型、同步/移动/删除保留行为及浏览器场景已实现；provider coverage必须单列，不能把fallback包装成实站Project识别成功。

## 6. 不需要向产品所有者追问的裁决

没有可靠metadata时使用unknown/last-known；没有可靠顺序时使用PAIA；没有可靠删除事实时不标deleted。这些已由本包用户要求允许。
真正需要block的是：要改来源身份、放松原文/删除/授权保护、读凭据、主动全账户抓取、增加新正文库或改变本包产品范围。此时只停止受影响round并写canonical blocker，不私自把它标COMPLETE。


## 7. ANS-03 completion as-of — 2026-09-19

Certified runtime head: `2a4851ffd9ab734b90802aee58f3306f3ebdf85a`.
Production contract: `chatgpt.current-conversation-presence` v1.

| Capability | As-of state | Certified production behavior |
|---|---|---|
| conversationIdentity | verified | Current canonical ChatGPT conversation route can emit a body-free identity/presence observation only for the matching archived Source |
| projectIdentity | unverified / unavailable | No live typed Project ID contract certified |
| projectName | unverified / unavailable | No live Project name contract certified |
| membership | unverified / unavailable | No explicit live conversation↔Project relation certified |
| projectOrder | unverified / unavailable | No complete-scope/rank live ordering contract certified |
| windowOrder | unverified / unavailable | No complete-scope/rank live ordering contract certified |
| rename | unverified / unavailable | Generic synthetic transition only |
| move | unverified / unavailable | Generic synthetic transition only |
| conversationDeletion | unverified / unavailable | Generic synthetic confirmed-deletion path only; no real deletion performed |
| projectDeletion | unverified / unavailable | No live deletion contract certified |

For Project/order/delete capability discovery in ANS-03, the compliant live target status was `LIVE_TARGET_UNAVAILABLE`. The implementation therefore keeps those production capabilities unavailable instead of guessing endpoint fields, DOM selectors or semantics.

Synthetic fixtures certify the validator/reconciler safety path, including Project A→B, rename, deletion/reappearance and complete-order admission, but **do not** certify ChatGPT real-site support.

The production path remains passive and bounded: no new manifest permission or host, no active source enumeration request, no credential/header/cookie/token access, no assistant/draft/body persistence, no new provider capture, and no AI request. Current-route observation reuses consent/enabled/epoch/route gates and requires the Source to already exist before durable metadata enrichment.

Certification evidence: candidate PAIA Certification #372 / run `35407564216` / attempt 3 success; main PAIA Certification #373 / run `35411623422` / attempt 3 success, both at exact runtime head `2a4851ffd9ab734b90802aee58f3306f3ebdf85a`.
