# PAIA Settings Consumer v2 — final design handoff

SETTINGS-CV2-1.0 / 2026-10-07 / OWNER_DIRECTED · ADOPTED · DESIGN_FROZEN.

打开 Review.html 评审交互；Prototype.html 是独立目标样机，查询参数选择状态；Visual-Review.pdf 是当前 26 张浏览器画板；Design-Specification.html 包含 A–G 文档与完整开发计划。

主要设置行 20 个，次要重置位置动作 1 个。六组：输入档案、阅读与外观、AI 与提示词、隐私与访问、数据与恢复、关于 PAIA。

本轮保留原主体视觉，只删除重复 AI 访问、重复存储、版本历史说明、抽象永久删除与无操作价值行。Prompt 管理、Context 权限与 Thought 组织留在真实模块。

所有数据、容量、连接和故障为样例；样机不读取或更改实际 PAIA 数据。144/144 布局与 41/41 演示交互复验不是生产认证，原一次键盘失败与修复见 E。代码基线 main 29940a921e4797c463a5e7e8436bafe6125f9f1d；没有修改运行代码或执行生产迁移/服务/部署。

最终 GitHub 采用文件名为 SETTINGS_CONSUMER_V2_ADOPTION.md、SETTINGS_CONSUMER_V2_PLAN.md、SETTINGS_CONSUMER_V2_REFERENCES.md。后续实际任务只读当前 STATUS 的唯一指针；本包不是第二个执行队列。

不包含字体文件，不需要网络字体。使用系统 CJK 字体，跨平台渲染可能略有差异。旧设计包不覆盖；本包为明确 v2。checksums.json 记录除自身外文件的 SHA-256；公开引用清单只记录标识/hash/状态映射，不复制私人图稿。
