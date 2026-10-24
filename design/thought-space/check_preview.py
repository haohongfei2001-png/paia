"""Finite browser checks for an isolated visual study, not product certification.
Run with PREVIEW_URL and CHROMIUM_EXECUTABLE set for local or public readback.
No real accounts, text entry, email, grant or model transport is exercised.
"""
from pathlib import Path
import os,json,re,hashlib,sys
from playwright.sync_api import sync_playwright
BASE=os.environ.get('PREVIEW_URL','http://127.0.0.1:8784/design/thought-space/')
OUT=Path(os.environ.get('PREVIEW_OUTPUT','/tmp/paia-spatial-checks'));OUT.mkdir(exist_ok=True,parents=True)
checks=[]
def check(ok,label):
 checks.append({'check':label,'pass':bool(ok)})
 if not ok:raise AssertionError(label)
def progress(page,p):
 page.evaluate('p=>{const e=document.querySelector(".experience"),s=document.querySelector(".sticky-scene");scrollTo({top:p*(e.offsetHeight-s.clientHeight),behavior:"instant"});dispatchEvent(new Event("scroll"))}',p)
 page.wait_for_function('p=>Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue("--progress"))-p)<.025',arg=p,timeout=8000)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'))
  for w,h in [(1440,1000),(1280,720),(1024,800),(768,1024),(390,844),(320,740)]:
   page=browser.new_page(viewport={'width':w,'height':h},reduced_motion='no-preference');errors=[];transport=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:transport.append(r.url) if r.method!='GET' or r.resource_type in ('fetch','xhr','websocket') else None)
   response=page.goto(BASE,wait_until='networkidle');page.evaluate('document.fonts.ready')
   check(response.ok,f'{w}: HTTP OK');check(page.locator('h1').count()==1,f'{w}: one headline')
   check('散落的表达' in page.locator('h1').inner_text(),f'{w}: retained narrative')
   check(page.locator('.topic').count()==3,f'{w}: three existing topics')
   check(page.locator('.topic p,.topic input').count()==0,f'{w}: no topic excerpts or search fields')
   original=page.locator('.reader .entry').all_text_contents();page.evaluate('window.__originals=[...document.querySelectorAll(".reader .entry")]')
   for step in [0,.58,.92]:
    progress(page,step)
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{w}/{step}: no document overflow')
    check(page.locator('.reader .entry').all_text_contents()==original,f'{w}/{step}: same words')
    check(page.evaluate('window.__originals.every((e,i)=>e===document.querySelectorAll(".reader .entry")[i])'),f'{w}/{step}: same content nodes')
   check(page.locator('.reader').evaluate('e=>getComputedStyle(e).opacity==="1" && !e.inert'),f'{w}: readable final state')
   check(page.locator('.projection').evaluate('e=>getComputedStyle(e).transform==="none"'),f'{w}: precise front view after motion')
   check(page.locator('[data-view=".92"]').get_attribute('aria-pressed')=='true',f'{w}: accurate view control')
   check(page.locator('.reader-body').evaluate('e=>getComputedStyle(e).overflowY==="auto"'),f'{w}: full long content remains reachable')
   page.locator('#motion-toggle').click();page.wait_for_function('document.body.dataset.motion==="static"')
   check(page.locator('h1').evaluate('e=>getComputedStyle(e.closest(".intro")).opacity==="1"'),f'{w}: static mode retains heading')
   check(page.locator('.reader').is_visible(),f'{w}: static mode retains body')
   page.locator('[data-view="0"]').click();page.wait_for_function('document.body.dataset.view==="0"');check(page.locator('body').get_attribute('data-motion')=='scroll',f'{w}: restore native scroll')
   check(not errors,f'{w}: no script errors');check(not transport,f'{w}: no transmissions')
   page.close();print('PASS',w,h,flush=True)
  for reduced,js in [('reduce',True),('reduce',False)]:
   for w in [1440,390]:
    page=browser.new_page(viewport={'width':w,'height':900},reduced_motion=reduced,java_script_enabled=js)
    page.goto(BASE,wait_until='networkidle');page.evaluate('document.fonts.ready')
    check(page.locator('.reader').is_visible(),f'{w}/JS{js}: nonanimated complete reader')
    check(page.locator('h1').is_visible(),f'{w}/JS{js}: readable heading')
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{w}/JS{js}: static reflow')
    page.close()
  page=browser.new_page(viewport={'width':390,'height':844},forced_colors='active',reduced_motion='reduce');page.goto(BASE,wait_until='networkidle')
  check(page.locator('.reader').evaluate('e=>getComputedStyle(e).color!=="transparent"'),'high contrast retains reading');page.close()
  browser.close()
except Exception as error:
 import traceback
 checks.append({'check':'execution','pass':False,'error':str(error),'traceback':traceback.format_exc()})
finally:
 result={'scope':BASE,'checks':len(checks),'failed':[x for x in checks if not x['pass']],'results':checks}
 (OUT/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='results'},ensure_ascii=False))
 if result['failed']:sys.exit(1)
