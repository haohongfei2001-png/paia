# Real Golden: UNAVAILABLE

尚未收到用户一次性导出的脱敏兼容性样本。本目录不是已验证的真实fixture，不用合成数据冒充。

格式：response.json（响应结构与类型/endpoint分类）、dom.json（脱敏DOM AST）、identity-map.json（仅测试身份关系）、expected-time.json（平移后预期发送时间）、fingerprint.json（结构类型指纹）。由import_golden.mjs通过隐私扫描后导入，后续所有adapter/source-time自动测试均回放它。
