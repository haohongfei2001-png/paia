from pathlib import Path
import asyncio,json,os,hashlib,subprocess,sys
from PIL import Image,ImageOps,ImageDraw,ImageFont
from playwright.async_api import async_playwright
root=Path(sys.argv[1]);frames=json.loads((root/'specs/frames.json').read_text());audit={'evidence':'static SVG design proof; NOT website implementation','frames':[],'text_out_of_frame':[]}
async def main():
 async with async_playwright() as p:
  options={'headless':True,'args':['--no-sandbox']}
  if os.getenv('CHROMIUM_EXECUTABLE'):options['executable_path']=os.environ['CHROMIUM_EXECUTABLE']
  browser=await p.chromium.launch(**options)
  audit['browser']=browser.version
  for f in frames:
   page=await browser.new_page(viewport={'width':int(f['width']),'height':min(1100,int(f['height']))},device_scale_factor=1)
   svg=(root/f['svg']).read_text()
   await page.set_content('<!doctype html><html><head><style>html,body{margin:0;padding:0}svg{display:block}</style></head><body>'+svg+'</body></html>')
   await page.evaluate('document.fonts.ready')
   await page.screenshot(path=str(root/f['preview']),full_page=True)
   issues=await page.evaluate('''() => {const s=document.querySelector('svg'), w=s.viewBox.baseVal.width,h=s.viewBox.baseVal.height;return [...s.querySelectorAll('text')].map(t=>{const b=t.getBBox();return {id:t.id,text:t.textContent,x:b.x,y:b.y,width:b.width,height:b.height}}).filter(b=>b.x< -2||b.y< -2||b.x+b.width>w+2||b.y+b.height>h+2)}''')
   for issue in issues:audit['text_out_of_frame'].append({'frame':f['frame'],**issue})
   audit['frames'].append({'frame':f['frame'],'png_sha256':hashlib.sha256((root/f['preview']).read_bytes()).hexdigest(),'size':[f['width'],f['height']],'out_of_frame_count':len(issues)})
   await page.close()
  await browser.close()
asyncio.run(main())
(root/'specs/render-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
family_path=subprocess.check_output(['fc-match','-f','%{file}','Inter'],text=True).strip();font=ImageFont.truetype(family_path,13)
links=[]
for lang in ['en','zh']:
 for width in [1440,390]:
  group=[f for f in frames if f['locale']==lang and f['width']==width]
  tw=290;th=640;cw=tw+28;ch=th+63;cols=4;rows=(len(group)+cols-1)//cols
  sheet=Image.new('RGB',(cols*cw+28,rows*ch+28),'#e7e8e2');d=ImageDraw.Draw(sheet)
  for i,f in enumerate(group):
   im=Image.open(root/f['preview']).convert('RGB');im.thumbnail((tw,th))
   xx=28+(i%cols)*cw;yy=22+(i//cols)*ch;sheet.paste(im,(xx+(tw-im.width)//2,yy));d.text((xx,yy+th+11),f['frame'],font=font,fill='#242e25')
  path=root/'previews'/f'contact-{lang}-{width}.jpg';sheet.save(path,quality=90)
  links.append(f'- [{lang.upper()} · {width}px · all pages]({path.name})')
(root/'previews/CONTACT-SHEETS.md').write_text('# Whole-site composition review\n\nThese are overview sheets. Inspect individual PNGs at 100% for text and state review.\n\n'+'\n'.join(links)+'\n')
env='Authoring commit: '+os.getenv('GITHUB_SHA','local')+'\nBrowser: '+audit['browser']+'\n'
try:env+=subprocess.check_output(['dpkg-query','-W','fonts-ebgaramond','fonts-inter','fonts-noto-cjk'],text=True,stderr=subprocess.DEVNULL)
except subprocess.CalledProcessError:env+='Font package versions are available from the authoring environment.\n'
(root/'specs/render-environment.txt').write_text(env)
files=[f for f in root.rglob('*') if f.is_file() and f.name!='SHA256SUMS']
assert not any(f.suffix.lower() in ['.woff','.woff2','.ttf','.otf','.ttc'] for f in files),'Do not distribute font binaries.'
(root/'SHA256SUMS').write_text('\n'.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f.relative_to(root)) for f in sorted(files))+'\n')
print(json.dumps({'artboards':len(frames),'files':len(files)+1,'text_out_of_frame':len(audit['text_out_of_frame']),'bytes':sum(f.stat().st_size for f in files)}))
if audit['text_out_of_frame']:print(json.dumps(audit['text_out_of_frame'],ensure_ascii=False))
