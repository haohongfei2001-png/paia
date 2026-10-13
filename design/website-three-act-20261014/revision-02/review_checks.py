from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import json, hashlib, statistics, time
P=Path(__file__).resolve().parent;O=P/'screenshots';O.mkdir(exist_ok=True)
report={'checks':[],'performance':{},'scope':'isolated headless Chromium; not physical monitor or universal FPS certification'}
def ck(ok,label):
 report['checks'].append({'check':label,'pass':bool(ok)})
 if not ok:raise AssertionError(label)
def capture(page,selector,name):
 node=page.locator(selector);node.evaluate("e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-110,behavior:'instant'})");page.wait_for_timeout(120)
 page.screenshot(path=str(O/name),animations='disabled')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 try:
  for locale,name in [('zh','prototype.html'),('en','prototype-en.html')]:
   page=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference');errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://127.0.0.1:8887/'+name,wait_until='networkidle');page.evaluate('document.fonts.ready');page.wait_for_timeout(150)
   ck(page.locator('.open-canvas input,.open-canvas textarea,.open-canvas button,.open-canvas select').count()==0,locale+': no simulator operations')
   ck(page.locator('.oc-directory').count()==4,locale+': only four private directory categories')
   ck(page.locator('.oc-original .oc-entry').count()==4,locale+': four complete original expressions')
   ck(page.locator('.open-canvas [data-context-text],.open-canvas input,.open-canvas textarea').count()==0,locale+': no private body or input descendants')
   ck(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),locale+': fits desktop')
   page.screenshot(path=str(O/(locale+'-hero.png')))
   capture(page,'.oc-archive',locale+'-archive.png')
   capture(page,'.oc-library',locale+'-topics.png')
   for delta,state in [(0,'original'),(250,'organized')]:
    page.evaluate("d=>scrollTo({top:document.querySelector('.oc-reading-run').getBoundingClientRect().top+scrollY-108+d,behavior:'instant'})",delta);page.wait_for_timeout(100)
    ck(page.locator('.oc-reading-run').get_attribute('data-state')==state,locale+': '+state)
    layer='.oc-original' if state=='original' else '.oc-organized'
    ck(page.locator(layer).evaluate('e=>[...e.children].every(x=>x.getBoundingClientRect().bottom<=e.closest(".oc-journal").querySelector("footer").getBoundingClientRect().top+1)'),locale+': '+state+' content does not collide with footer')
    page.screenshot(path=str(O/(locale+'-'+state+'.png')))
   anchors=[]
   for delta,state in [(0,'orb'),(110,'capsule'),(250,'board')]:
    page.evaluate("d=>scrollTo({top:document.querySelector('.oc-chat-run').getBoundingClientRect().top+scrollY-108+d,behavior:'instant'})",delta);page.wait_for_timeout(100)
    ck(page.locator('.oc-chat-run').get_attribute('data-state')==state,locale+': '+state)
    anchors.append(page.locator('.oc-companion').bounding_box())
    page.screenshot(path=str(O/(locale+'-'+state+'.png')))
   ck(max(a['x'] for a in anchors)-min(a['x'] for a in anchors)<1 and max(a['y'] for a in anchors)-min(a['y'] for a in anchors)<1,locale+': anchor fixed within native one-pixel scroll rounding')
   capture(page,'.oc-context',locale+'-context.png');capture(page,'.oc-overview',locale+'-overview.png')
   ck(not errors,locale+': no page errors')
   for width in (1920,1280,1024,768,390,320):
    page.set_viewport_size({'width':width,'height':1000 if width>768 else 844});page.reload(wait_until='networkidle');page.wait_for_timeout(100)
    ck(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{locale}/{width}: no horizontal overflow')
    if width==390:
     page.screenshot(path=str(O/(locale+'-phone-full.png')),full_page=True)
    if width==320:
     page.add_style_tag(content='html{font-size:200%!important}');page.evaluate("dispatchEvent(new Event('resize'))");page.wait_for_timeout(150)
     ck(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),locale+': 200% text reflow')
     ck(page.locator('.oc-standfirst').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=30,locale+': prose actually enlarged at 200%')
   page.close();print(locale,'reviewed',flush=True)
  # Render cost sampled at 180 real rAF intervals, same browser/profile/viewport.
  for name,url,selector,distance in [('previous','http://127.0.0.1:8886/prototype.html','.three-story',2500),('revision','http://127.0.0.1:8887/prototype.html','.oc-reading-run',280)]:
   page=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
   page.goto(url,wait_until='networkidle');page.evaluate('document.fonts.ready');page.wait_for_timeout(200)
   start=page.locator(selector).evaluate('e=>e.getBoundingClientRect().top+scrollY-108')
   page.evaluate('y=>scrollTo({top:y,behavior:"instant"})',start);page.wait_for_timeout(150)
   cdp=page.context.new_cdp_session(page);cdp.send('Performance.enable')
   def metrics():return {x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
   before=metrics()
   deltas=page.evaluate('''async ({start,distance})=>{
    const times=[];let previous;
    for(let i=0;i<180;i++)await new Promise(resolve=>requestAnimationFrame(t=>{
     if(previous)times.push(t-previous);previous=t;
     scrollTo({top:start+distance*i/179,behavior:'instant'});resolve();
    }));return times;
   }''',{'start':start,'distance':distance})
   after=metrics();report['performance'][name]={key:after.get(key,0)-before.get(key,0) for key in ('LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration')}
   report['performance'][name]['raf_interval_p95_ms']=sorted(deltas)[int(len(deltas)*.95)]
   report['performance'][name]['note']='Different transformation ranges, same 180 frames; rendering-work diagnostic, not physical-screen FPS.'
   page.close();print(name,report['performance'][name],flush=True)
 except Exception as err:
  report['checks'].append({'check':'execution','pass':False,'error':str(err)})
 finally:
  b.close()
report['failed']=[x for x in report['checks'] if not x['pass']]
(P/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(report['checks']),'failed':report['failed'],'performance':report['performance']},ensure_ascii=False))
if report['failed']:raise SystemExit(1)
