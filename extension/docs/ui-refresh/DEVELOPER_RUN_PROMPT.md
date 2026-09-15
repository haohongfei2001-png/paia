# Developer Run Prompt — PAIA Chrome UI Refresh v1.0

以后每轮重复发送下面同一段，不附加轮次号、不重述聊天背景。Agent须使用GitHub实时分支与本目录STATUS决定当前一轮。

```text
在 GitHub 仓库 haohongfei2001-png/paia 的 chrome-ui-refresh-v1 分支，解析真实 HEAD，并在同一固定 SHA 按 extension/docs/ui-refresh/README.md 的权威顺序读取 SPEC、UI_REFRESH_STATUS.md 和当前 round 任务书。只执行 STATUS 指定的一轮，已有未完成工作先续做；不重新设计、不超范围、不改变产品或安全语义。完成规定开发、测试、release smoke、真实浏览器截图和逐图视觉检查，修复本轮问题；提交代码、round report、证据并更新 STATUS，推送后核验 GitHub HEAD。最后报告本轮结果、验证限制和下一轮。不得自动进入下一轮、合并 main 或部署。
```

## 执行解释（无需用户额外发送）

设计交付必须先在STATUS标READY。NOT_STARTED开始指定轮，IN_PROGRESS/BLOCKED仅续做该轮及其真实阻塞修复；前轮未完成不能越过。四轮均COMPLETE时不启动新工作，只核对并报告等待用户合并决定。

本轮准入、principal files、保持项、两级gate与截图要求已在README/SPEC/任务书。普通UI选择已经冻结，不重做baseline审查或请用户选择方案；只因产品/数据所有权/删除/授权/隐私/新durable数据/新付费外部行为或最高约束冲突才要求决策。

只在上述普通开发分支串行提交，不启动旧ux-r2恢复或overnight/CI carrier/control/lease流程。缺执行证据不算通过，旧UX认证不是UIR认证。UIR-04是最后完整验收轮；它完成也不等于授权合并、发布或修改用户加载目录。
