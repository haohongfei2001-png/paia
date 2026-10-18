"""Render actual alternatives for review; never install an appearance picker."""
from pathlib import Path
import argparse,json,hashlib
from playwright.sync_api import sync_playwright
from build import build
ROOT=Path(__file__).resolve().parent
A='''
.paia[data-mode=board]{--board-height:324px!important;}
.paia[data-mode=board] .ps-board{height:324px!important;}
.paia[data-geometry=r3] .ps-header{order:-1;height:43px;min-height:43px;padding:0 7px 0 15px;}
.paia[data-geometry=r3] .ps-header::before{display:none;}
.paia[data-geometry=r3] .ps-body:has(>.ps-list){padding:7px 0 8px;}
.paia[data-geometry=r3] .ps-row:nth-child(n+6){margin-right:56px;}
'''
C='''
.paia[data-mode=board]{--board-height:360px!important;}
.paia[data-mode=board] .ps-board{height:360px!important;padding-bottom:48px;}
.paia[data-geometry=r3] .ps-header{order:-1;height:43px;min-height:43px;padding:0 7px 0 15px;}
.paia[data-geometry=r3] .ps-header::before{display:none;}
.paia[data-geometry=r3] .ps-body:has(>.ps-list){padding:1px 0 2px;}
'''
def run(executable,r2_file=None):
 html=build(ROOT);out={}
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
  p=b.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
  for name,css in [('selected-b-shared-toolbar',''),('alternative-a-shared-last-row',A),('alternative-c-added-footer',C)]:
   p.set_content(html);p.evaluate("PaiaDemo.setView('compare')")
   if css:p.add_style_tag(content=css)
   p.wait_for_timeout(200);p.screenshot(path=str(ROOT/'evidence'/f'{name}.png'),full_page=True)
   out[name]={'panel':p.locator('.ps-board').nth(2).bounding_box(),'last_row':p.locator('.paia').nth(2).locator('.ps-row').nth(5).bounding_box()}
  if r2_file:
   raw=r2_file.read_bytes();p.set_content(raw.decode());p.evaluate("PaiaDemo.setView('compare')");p.wait_for_timeout(200);p.screenshot(path=str(ROOT/'evidence/baseline-r2.png'),full_page=True);out['r2_html_sha256']=hashlib.sha256(raw).hexdigest()
  b.close()
 out['selected']='B: existing toolbar relocated; no additional blank footer or narrowed last row'
 out['scope']='Actual offline render comparison; self-design judgement, not independent preference research'
 (ROOT/'evidence/alternatives.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--chromium',default='/usr/bin/chromium');p.add_argument('--r2-file',type=Path);a=p.parse_args();run(a.chromium,a.r2_file)
