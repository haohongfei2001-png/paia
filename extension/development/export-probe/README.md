# 本地导出结构检查器（开发前置工具）

用桌面 Chrome 打开本目录 index.html。普通本地文件页面、无服务器/权限/联网/数据库；不是扩展安装包，不改变已验收的 v0.5.0。用户勾选本次读取同意后，主动选择官方 ZIP 或 JSON。每次选择后同意失效；重选需要再次勾选。停止/关闭清空内存。不得把真实 ZIP 放进仓库、fixture、日志或上传对话。

只查看界面内脱敏摘要，输出固定白名单路径与 JSON 类型、角色枚举计数、identity 对等计数、parent/current 引用是否可找到。短 ID 暂留有界内存进行等值校验，真实值不输出；所有正文字符串最多临时缓冲 258 字符用于词法解析，超过即持续丢弃，未重建原文，不生成混合对象树。未知字段只计数、不输出名称或值。采样后不返回任何身份表。

这是候选结构探针，不是 ExportAdapter。它观察 mapping 等候选公共字段是否存在，不能证明 author/user 文字已发送、时间单位、schema 稳定或全包兼容。正式规则必须结合用户此次官方来源和实际采样结果再确定，现有合成测试不是官方格式证据。

边界：64 KiB 分块，最多 16 MiB 解压文本、3 个 conversation、单 conversation 4096 个 node、深度 32、每 object 最多 8192 个 key。ZIP 目录逐条读、总目录上限 32 MiB；只解压首个根目录 conversations.json 或候选编号名（如 conversations-1.json），其他项不解压。完整读完单个目标 entry 时验证 CRC 和实际长度；提前停止只能报告未校验。ZIP64、加密、多磁盘、非 stored/deflate、声明或实际比例超过 200、目录/本地头不一致拒绝。未知编号名不会被猜为官方文件。以上是前置采样上限，不是最终产品大文件能力承诺。

结果 `STRUCTURE_SAMPLED` 是已读取范围的结构统计；`SAMPLE_LIMIT` 是有界提前停止；`UNSUPPORTED_STRUCTURE` 或安全错误码不是成功。`archiveValidated` 永远 false。没有写入导入任务、Original Archive、Library 或 sourceSentAt。

单元与隔离 Chrome 合成文件交互测试由 Codex 执行。真实样本尚未取得；不生成/下载脱敏 fixture，避免额外私人副本。当前电脑控制尝试打开 file:// 本地检查页被浏览器 URL 安全策略拒绝；没有绕过策略、改用其他界面或连接日常 Chrome 的调试端口。隔离 Chrome 的合成自动测试已验证页面交互，但不构成日常 Chrome / 真实官方文件验证。用户尚未取得文件，因此当前不要求用户运行诊断或抄写数字；后续真实检查需先具备工具允许访问的验证条件。
