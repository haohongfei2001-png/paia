# 开发模式兼容性采样与 Golden 回放

本工作流替代 QA 登录自动化。真实 QA 入口已停用，不读任何浏览器 profile、Cookie、session 或 Keychain。首次真实样本尚待用户在正常已登录Chrome中点击一次生成，未取得前绝不把合成样本称为真实Golden。

开发包构建：`python3 scripts/package_development.py`。正式manifest不加载development代码，正常打包不包含采样器。开发包保持原权限，增加当前ChatGPT页上的“生成脱敏兼容性样本”“ChatGPT兼容性自检”按钮。没有新增网络请求，采样仅旁路clone网站已有同源合格JSON，不读请求体/凭证。点击导出前只保留有界脱敏结构和最小身份/时间映射；不保留正文。点击后再次扫描，不合格拒绝下载。

结构键名只保留经审核的公共schema键；动态mapping/message/conversation ID键和引用一起替换。未知键可能本身就是私人文字，不能同时保证原样保留及脱敏，必须UNKNOWN_SCHEMA_KEY拒绝，不能偷偷改名或导出。所有一般字符串替换为安全占位，role/内容类型保留有限枚举，数字除时间均归零。create/update共同平移到2001-02-03，保留类型、先后及间隔；时间跨度超过十年拒绝。私密字段名、URL/email/长ID/自然语言/非测试时间不能通过扫描。

DOM使用有限AST，保留canonical相关tag、嵌套、公开选择器属性与身份关系，正文文本节点直接替换，不读其值。草稿、附件、账号界面和main以外内容不采样。无需截图，不读取整页innerHTML。

fixture是一个JSON文件容器，含5个命名文件（response.json、dom.json、identity-map.json、expected-time.json、fingerprint.json）。浏览器只有点击时下载它。代理运行 `node scripts/import_golden.mjs <本地脱敏样本路径>`：再次扫描后写tests/golden/chatgpt-real-structure-v1；拒绝任意路径/额外文件。未输入真实样本时该目录明确UNAVAILABLE。

回放只由离线页面fetch发起，使用原MAIN observer/strict detector、开发期受控buffer/drain、原isolated bridge、canonical adapter、SourceTimeResolver、store及archive UI。开发buffer只保留已解析的最小user时间元数据，且只有原后台同意门禁后才向原bridge交付；不会更改SourceTimeResolver或发布正式provider。合成工具链测试与真实Golden回放证据分开。候选发布脚本要求真实Golden存在并通过；缺少它不能宣称兼容性验证完成。

正式运行时代码不含开发hook；构建脚本仅在临时副本中注入observer回调、自检只读后台分支和独立MAIN/ISOLATED脚本。不得把开发provider的成功当作正式provider已修复。采样包无新增权限，只有storage；不读取配置文件、Cookie或任何登录态。

自动执行 `node scripts/test.mjs`。完整测试成功后记录源码/fixture摘要；任何相关修改都会使打包门禁失效。正式 `scripts/package.py` 要求已导入真实Golden且无skip；初次 `scripts/package_development.py` 允许真实Golden尚未采集，但要求其他测试与审计通过。Node不在PATH时用PAIA_NODE指定运行时路径。构建目标必须为空，避免旧文件误入ZIP。

Golden导入会检查五个文件、AST、identity关系与完整结构指纹，并用SHA-256 receipt绑定整个容器。receipt只用于完整性，不是对真实来源的密码学证明；实际来源必须是用户那次明确采样。测试自建数据使用constructed-test，不能作为正式发布依据。DOM候选的预期仲裁独立计算，保持现有1秒容差；resolver代码不改。

采样按钮使用现有PAIA同意/启用门禁后才调用canonical adapter；DOM AST只保留当前验证成功的user和安全assistant结构，隐去未通过canonical的user节点，保留相关隐藏状态。采样请求还绑定当前conversation，SPA跨聊天请求不导出。每份fixture只描述本次已观察范围，不代表未加载消息或整页布局。
