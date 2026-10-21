# PAIA 中文字体

官网自托管 Noto Sans SC 的内容子集，文件位于：

```text
assets/website/type/noto-sans-sc-paia.woff2
assets/website/type/noto-sans-sc-paia.json
assets/website/type/NOTO-SANS-SC-OFL.txt
```

WOFF2 保留 `wght` 100–900 变量轴。它覆盖当前 57 个生成页面和这些页面实际加载的 CSS/JavaScript，包括运行时中文提示及 HTML 实体、JavaScript Unicode 转义。全套原始字体不进入网站或交付 ZIP。

## 官方来源与授权

- 原始字体：[Google Fonts / Noto Sans SC](https://github.com/google/fonts/tree/2894aab31764f10f29c421bdfd2340d3b382d384/ofl/notosanssc)。
- 固定上游版本：`2894aab31764f10f29c421bdfd2340d3b382d384`。
- 原始文件：`NotoSansSC[wght].ttf`，17,772,300 字节。
- SHA-256：`a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`。
- 上游 Git blob：`fb0637bafbcd804fe32152370a1225990745b4bc`。
- 授权：上游未改写的 SIL Open Font License 1.1，随字体放在 `NOTO-SANS-SC-OFL.txt`。

子集化属于修改。原有版权与字体名称元数据保留，未使用授权中保留的字体名称 `Source` 作为字体家族名。完整 OFL 文本还保存在子集字体的 `name` 表内，因此 `PAIA-Preview.html` 嵌入 WOFF2 时，授权随字体一起分发。字体子集继续适用 OFL 1.1。

## CSS 接入

CSS 字体别名由主站样式决定；例如：

```css
@font-face {
  font-family: "PAIA Sans SC";
  src: url("/assets/website/type/noto-sans-sc-paia.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}

/* Latin 可由既有西文字体处理；汉字仍有系统字体后备。 */
:lang(zh) {
  font-family: "Manrope", "PAIA Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}
```

该字体是网站内容子集，不是完整汉字库。访客在可编辑示例中输入字集以外的内容时，浏览器按系统字体后备显示。不要删除汉字后备，也不要通过 `unicode-range` 宣称子集具备整个 CJK 字库。

中文标题、正文、标签的字距应由各自阅读角色决定，不应自动继承西文大标题的负字距。这里的脚本只维护字体资源，不覆盖页面排版。

## 文案更新后重建

需要 Python、fontTools 和 Brotli；可在开发环境安装 `fonttools[woff]`。先构建当前页面，再生成字集：

```bash
python3 website/build.py
python3 website/subset_chinese_font.py --source ../NotoSansSC-source.ttf
python3 website/subset_chinese_font.py --check
```

`--source` 指向仓库之外保存的完整原始 TTF。脚本只读取本地内容，不联网下载，也不修改主站 CSS、页面源或生成页面。它会验证原字体的 SHA-256，并在超过 1,000,000 字节时停止。实际文件大小、来源文件、字符覆盖、变量轴和哈希写入随附 JSON。

当前工作环境的 Brotli 安装在任务工具目录，使用：

```bash
PYTHONPATH=/workspace/scratch/d0a3b725bf62/paia-font-tools python3 website/subset_chinese_font.py --source /workspace/scratch/d0a3b725bf62/NotoSansSC-source.ttf
```

如果原始字体缓存丢失，按上方固定官方版本重新取得该 TTF，并核对 SHA-256；不要把完整 TTF 加入仓库。`--check` 不需要完整源 TTF，只使用已交付的 WOFF2、清单与当前页面。

新页面文案还未生成时，可临时传入 `--extra-text path/to/source.py` 或其他 UTF-8 文本文件；最终仍应重新构建全部页面后重建字体。运行时脚本以活动页面实际引用为准，不扫描已停用的旧网站代码或截图回执。

## 离线交付

主站 CSS 引用此 WOFF2 后，`package_flagship.py` 会自动发现并内嵌字体，无需远程字体服务。源码 ZIP 包含字体、授权、清单和重建脚本；完整 TTF 留在源码包之外。生成新的交付包前运行上述覆盖检查，再由主代理重新执行打包器。

静态覆盖检查只能证明当前文字有对应字形、变量轴与授权元数据仍在，不能代替桌面/手机浏览器中的实际排版检查。
