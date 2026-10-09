"""Build a font-free, offline, website-only Owner review bundle.

Usage: python website/review_bundle.py --evidence /path/to/review-evidence --output /path/to/review.zip
The four prototypes derive from the generated website. Images are inlined; no
font bytes, installation code, live AI or personal archive is included.
"""
from pathlib import Path
from html import escape
from urllib.parse import urlsplit
import argparse, base64, hashlib, json, mimetypes, re, shutil, tempfile, zipfile

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--evidence',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
pairs={'/':'home-en.html','/index.html':'home-en.html','/en/':'home-en.html','/en/index.html':'home-en.html','/zh/':'home-zh.html','/zh/index.html':'home-zh.html','/demo.html':'demo-en.html','/en/demo.html':'demo-en.html','/zh/demo.html':'demo-zh.html'}
image_types={'.png','.webp','.jpg','.jpeg','.svg','.gif'}

def data_image(path):
    path=ROOT/path.lstrip('/')
    if path.suffix.lower() not in image_types:raise ValueError(f'Not a permitted image: {path.name}')
    return 'data:'+mimetypes.guess_type(path.name)[0]+';base64,'+base64.b64encode(path.read_bytes()).decode()

def stylesheet(path):
    css=(ROOT/path.lstrip('/')).read_text()
    css=re.sub(r'@font-face\s*\{[^}]*\}','',css,flags=re.S)
    def asset(match):
        url=match.group(1).strip('"\' ')
        if url.startswith('/assets/'):
            return 'url("'+data_image(urlsplit(url).path)+'")'
        if any(ext in url.lower() for ext in ['.woff','.ttf','.otf']):raise ValueError('Font reference survived removal')
        return match.group(0)
    return re.sub(r'url\(([^)]+)\)',asset,css)

def prototype(relative):
    source=(ROOT/relative).read_text()
    def link(match):
        tag=match.group(0)
        href=re.search(r'href="([^"]+)"',tag)
        if not href:return tag
        target=href.group(1)
        if 'rel="stylesheet"' in tag:return '<style>'+stylesheet(urlsplit(target).path)+'</style>'
        if 'rel="preload"' in tag or 'rel="preconnect"' in tag or 'rel="dns-prefetch"' in tag:return ''
        if 'icon' in tag and target.startswith('/assets/'):return tag.replace(target,data_image(urlsplit(target).path))
        return tag
    source=re.sub(r'<link\b[^>]*>',link,source)
    def script(match):
        path=urlsplit(match.group(1)).path
        if not path.startswith('/assets/website/'):raise ValueError('Unexpected script owner')
        body=(ROOT/path.lstrip('/')).read_text().replace('</script','<\\/script')
        # Run after the document exists, matching the original defer behavior.
        return '<script>document.addEventListener("DOMContentLoaded",()=>{\n'+body+'\n});</script>'
    source=re.sub(r'<script\s+src="([^"]+)"[^>]*>\s*</script>',script,source)
    source=re.sub(r'src="(/assets/[^"?]+)(?:\?[^"]*)?"',lambda m:'src="'+data_image(m.group(1))+'"',source)
    def href(match):
        value=match.group(1)
        if not value.startswith('/'):return match.group(0)
        path,sep,fragment=value.partition('#')
        destination=pairs.get(path,'https://inputarchive.com'+path)
        return 'href="'+destination+(sep+fragment if sep else '')+'"'
    source=re.sub(r'href="([^"]+)"',href,source)
    banner='<aside class="offline-review-note" style="position:relative;padding:10px 18px;border-bottom:1px solid #cedaea;background:#f0f5fc;color:#233e62;font:13px/1.6 system-ui">'+('离线设计原型 · 虚构数据 · 不读取私人档案或调用 AI · 字体使用系统回退 · 申请与政策链接将打开现有官网。' if relative.startswith('zh/') else 'Offline design prototype · Fictional data · No personal archive or AI · System-font fallback · Application and policy links open the existing website.')+' <a href="START.html">'+('返回审阅目录' if relative.startswith('zh/') else 'Review index')+'</a></aside>'
    source=re.sub(r'(<body\b[^>]*>)',lambda m:m.group(1)+banner,source,count=1)
    if re.search(r'\.(woff2?|ttf|otf)([\?\"\)\s]|$)',source,re.I):raise ValueError('Font asset must never enter the review bundle')
    if re.search(r'<script[^>]+src=|<link[^>]+rel="stylesheet"',source):raise ValueError('External runtime dependency survived inlining')
    return source

with tempfile.TemporaryDirectory(prefix='paia-review-') as working:
    out=Path(working)
    for relative,name in [('index.html','home-en.html'),('zh/index.html','home-zh.html'),('demo.html','demo-en.html'),('zh/demo.html','demo-zh.html')]:
        (out/name).write_text(prototype(relative))
    evidence=out/'evidence';evidence.mkdir()
    for file in sorted(args.evidence.iterdir()):
        if file.is_file() and file.suffix.lower() in {'.png','.json','.md','.gz'}:shutil.copy2(file,evidence/file.name)
    (out/'README.md').write_text('''# PAIA website review / 官网设计审阅

Open START.html in a desktop browser. The four HTML prototypes also work when opened directly, without a server. All data is fictional and page-local; reload resets it. Do not enter private information. Copying requires an explicit user action and may be denied by a browser's local-file policy; insertion remains available.

打开 START.html，或直接打开四份原型。它们无需安装扩展、填写邮箱或连接 AI。先在首页主题中选“用上这句话”，核对后填入草稿；再去完整 Demo 体验来源、编辑、主题和权限。复制功能可能受本地文件权限限制，不会谎报成功。

No font files are included. Offline HTML uses system fallbacks, so text wrapping can differ slightly from the actual site's fonts. The screenshots show the actual repository build. Beta/status/legal links deliberately open the unchanged public site; these prototypes are not deployed, not extension installers and not a promise of live AI/Pro/cloud availability.

没有合并或部署授权；请在审阅 PR 后明确决定。测试是工程及模拟交互验证，不是消费者研究或留存证明。
''')
    runtime=[ROOT/x for x in (ROOT/'website/generated-paths.txt').read_text().splitlines()]
    runtime += [ROOT/'assets/website'/x for x in ['site.css','interior.css','product-experience.css','flagship.css','site.js','home-core-v2.js','narrow-board.js']]
    hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in runtime}
    (out/'source-manifest.json').write_text(json.dumps({'kind':'WEBSITE_ONLY_OFFLINE_PROTOTYPE','base_main':'d516c43b01d4f2f7f3dda93f037ce2145bee5109','deployed':False,'font_files_included':False,'runtime_sha256':hashes},indent=2))
    previews=[('home-zh.html','中文首页'),('demo-zh.html','中文完整 Demo'),('home-en.html','English home'),('demo-en.html','English full demo')]
    image_names=[p.name for p in sorted(evidence.glob('*.png'))]
    image_html=''.join(f'<figure><a href="evidence/{escape(name)}"><img src="evidence/{escape(name)}" loading="lazy" alt="{escape(name)}"></a><figcaption>{escape(name)}</figcaption></figure>' for name in image_names)
    (out/'START.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PAIA 官网旗舰体验审阅</title><style>body{margin:0;background:#f5f8fd;color:#172d49;font:16px/1.7 system-ui}main{max-width:1120px;padding:48px 24px;margin:auto}h1{font-size:clamp(28px,5vw,44px);line-height:1.25}a{color:#2458bb;text-underline-offset:4px}.choices{display:flex;flex-wrap:wrap;gap:16px;margin:30px 0}.choices a{background:white;border:1px solid #d4dfef;border-radius:12px;padding:14px 22px;text-decoration:none}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}figure{margin:0;padding:12px;background:white;border:1px solid #dde6f1;border-radius:14px}img{display:block;width:100%;height:270px;object-fit:contain;object-position:top}figcaption{font-size:12px;overflow-wrap:anywhere;margin-top:10px}:focus-visible{outline:3px solid #2458bb;outline-offset:4px}</style><main><p>PAIA / WEBSITE DESIGN REVIEW / 2026-10-10</p><h1>对 AI 说过的话，<br>下次接着用。</h1><p>这是一组可操作的官网原型，不是扩展安装包。虚构数据，仅在本页运行；没有真实 AI 服务。尚未合并或部署。</p><nav class="choices" aria-label="打开原型">'''+''.join(f'<a href="{f}">{name} ↗</a>' for f,name in previews)+'''</nav><p>建议先用首页中“给家人的食谱”主题的一句原话，再到完整 Demo 修改工作文字、核对来源，最后尝试只开放一个主题。离线原型使用系统字体；下方截图来自实际网站构建。点击截图可查看原尺寸。</p><h2>桌面与移动端 / 改造前后</h2><div class="gallery">'''+image_html+'''</div><p><a href="README.md">使用与边界说明</a> · <a href="source-manifest.json">构建指纹</a></p></main></html>''')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(args.output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for file in sorted(out.rglob('*')):
            if file.is_file():z.write(file,file.relative_to(out).as_posix())
print(json.dumps({'bundle':str(args.output),'bytes':args.output.stat().st_size,'font_files':0,'deployed':False}))
