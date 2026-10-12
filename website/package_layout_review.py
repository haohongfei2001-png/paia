"""Create an offline review of the current-live layout patch, without font files."""
from pathlib import Path
from urllib.parse import urlsplit
import base64, json, mimetypes, re, zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'website/receipts/layout-20261011'
OUT.mkdir(parents=True,exist_ok=True)
paths={'/':'home-en.html','/index.html':'home-en.html','/en/':'home-en.html','/zh/':'home-zh.html','/zh/index.html':'home-zh.html','/demo.html':'demo-en.html','/zh/demo.html':'demo-zh.html'}
def image(url):
 p=ROOT/url.lstrip('/')
 if p.suffix.lower() not in ['.png','.jpg','.jpeg','.webp','.svg']:raise ValueError(url)
 return 'data:'+mimetypes.guess_type(p.name)[0]+';base64,'+base64.b64encode(p.read_bytes()).decode()
def css(url):
 text=(ROOT/urlsplit(url).path.lstrip('/')).read_text()
 text=re.sub(r'@font-face\s*\{[^}]*\}','',text,flags=re.S)
 return re.sub(r'url\([\"\']?(/assets/[^)\"\']+)[\"\']?\)',lambda m:'url("'+image(m.group(1))+'")',text)
def html(path):
 text=(ROOT/path).read_text()
 text=re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>',lambda m:'<style>'+css(m.group(1))+'</style>',text)
 text=re.sub(r'<script\s+src="([^"]+)"[^>]*>\s*</script>',lambda m:'<script>document.addEventListener("DOMContentLoaded",()=>{\n'+(ROOT/urlsplit(m.group(1)).path.lstrip('/')).read_text().replace('</script','<\\/script')+'\n});</script>',text)
 text=re.sub(r'src="(/assets/[^"?]+)(?:\?[^"]*)?"',lambda m:'src="'+image(m.group(1))+'"',text)
 text=re.sub(r'<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>','',text)
 def link(m):
  url=m.group(1);p,sep,frag=url.partition('#')
  return 'href="'+paths.get(p,'https://inputarchive.com'+p)+(sep+frag if sep else '')+'"'
 text=re.sub(r'href="(/[^\"]*)"',link,text)
 assert not re.search(r'\.(woff2?|ttf|otf)["\')\s]',text,re.I)
 return text
files={name:html(path) for path,name in [('index.html','home-en.html'),('zh/index.html','home-zh.html'),('demo.html','demo-en.html'),('zh/demo.html','demo-zh.html')]}
for name,body in files.items():(OUT/name).write_text(body)
readme='''PAIA 现官网局部调整 / Current website layout patch

打开 home-zh.html 查看中文候选；home-en.html 为英文，demo-zh.html / demo-en.html 保留原完整 Demo。

首屏、标题、正文及示例原话沿用现官网。首页去掉 1–4 二级导航；下方档案删去重复整套软件外框，只保留紧凑编辑区；思想库和 AI Context 在宽屏图文并排；提示词区可以切换悬浮球、悬浮胶囊和悬浮板。球和胶囊是两种收起形态，点击展开同一浮板，不是自动三步流程。

这是本地网页示例，使用虚构数据，不读取真实档案或调用 AI。编辑不持久保存，填入不发送。未修改任何真实权限。申请、政策和其他页面链接打开现有正式网站。没有字体文件，离线页面使用系统字体，因此细微换行可能不同于实际构建截图。

未合并、未发布；等待你审核这一版局部调整。
'''
(OUT/'README.txt').write_text(readme)
with zipfile.ZipFile(OUT/'PAIA-Current-Site-Layout-Review.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,body in files.items():z.writestr(name,body)
 z.writestr('README.txt',readme)
 for p in sorted(OUT.glob('*.png')):z.write(p,'screenshots/'+p.name)
 for p in sorted(OUT.glob('*.json')):z.write(p,'verification/'+p.name)
print(json.dumps({'zip':str(OUT/'PAIA-Current-Site-Layout-Review.zip'),'html':list(files),'font_files':0}))
