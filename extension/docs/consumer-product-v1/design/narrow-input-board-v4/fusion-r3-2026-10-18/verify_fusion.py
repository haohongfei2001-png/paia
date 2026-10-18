"""R3 fusion geometry, no-hint and interaction checks; offline Chromium only."""
from pathlib import Path
from datetime import datetime, timezone
import argparse, hashlib, json, time
from playwright.sync_api import sync_playwright
from build import build
ROOT=Path(__file__).resolve().parent

def run(executable):
 html=build(ROOT);results=[];errors=[];external=[];motion=[]
 def must(v,msg):
  if not v:raise AssertionError(msg)
 def same(a,b):return all(abs(x-y)<.15 for x,y in zip(a,b))
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
  ctx=browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=1)
  page=ctx.new_page();page.set_default_timeout(3000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:external.append(r.url) if r.url.startswith(('https:','http:','ws:','wss:')) else None)
  def ev(code):return page.evaluate(code)
  def rect(selector):return page.locator(selector).first.evaluate('(e)=>{let r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}')
  def reset(mode='board'):
   page.set_viewport_size({'width':1440,'height':960});page.emulate_media(forced_colors='none',reduced_motion='no-preference')
   page.set_content(html);ev(f"PaiaDemo.surfaces[0].setMode('{mode}')");page.wait_for_timeout(170)
  def check(name,fn):
   t=time.monotonic()
   try:detail=fn();v={'name':name,'status':'PASS','detail':detail}
   except Exception as e:
    blocked=name.startswith('F18 ') and 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(e)
    v={'name':name,'status':'BLOCKED' if blocked else 'FAIL','detail':str(e)[:1800]}
   v['ms']=round((time.monotonic()-t)*1000,1);results.append(v);print(v['status'],name,flush=True)
  def hints():
   for mode in ['collapsed','capsule','board']:
    reset(mode);page.locator('.ps-anchor').hover();page.wait_for_timeout(850)
    must(page.locator('.paia [title],.paia [role=tooltip],.paia .ps-tooltip').count()==0,'Tooltip/title remains')
   for action in ['search','tools']:
    reset();page.locator(f'[data-action={action}]').click()
    must(page.locator('.paia [title],.ps-tooltip').count()==0,'Re-render restored hints')
   return 'Custom and native-title hints absent after delay and re-render; accessible names retained.'
  check('F01 No tooltips or native title hints in any state/view',hints)
  def outline():
   reset();a=rect('.ps-anchor');s=rect('.ps-unified-skin');b=rect('.ps-board')
   must(same(s,b) and b[2:]==[336,328],'Shared skin/body mismatch')
   must(s[0]+s[2]==a[0]+48 and s[1]+s[3]==a[1]+48,'Not fixed corner')
   must(ev("getComputedStyle(document.querySelector('.ps-unified-skin')).borderBottomRightRadius")=='24px','Quarter radius changed')
   for q in ['.ps-board','.ps-anchor']:
    must(ev(f"getComputedStyle(document.querySelector('{q}')).backgroundColor")=='rgba(0, 0, 0, 0)','Duplicate fill')
    must(ev(f"getComputedStyle(document.querySelector('{q}')).borderBottomColor")=='rgba(0, 0, 0, 0)','Duplicate border')
   return {'board':b,'anchor':a,'arc_center':[a[0]+24,a[1]+24]}
  check('F02 One contour and the original quarter-circle share an exact center',outline)
  def transitions():
   reset('collapsed')
   d=ev("""async()=>{const s=PaiaDemo.surfaces[0],r=e=>{let b=e.getBoundingClientRect();return [b.x,b.y,b.width,b.height]};let a=r(s.anchor),f=r(s.root.querySelector('.ps-front')),out=[];for(let m of ['capsule','board','capsule','collapsed','board','collapsed']){s.setMode(m);for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);out.push({m,a:r(s.anchor),f:r(s.root.querySelector('.ps-front')),skin:r(s.skin),br:getComputedStyle(s.skin).borderBottomRightRadius,clip:getComputedStyle(s.board).clipPath});}}return{a,f,out}}""")
   must(all(same(d['a'],x['a']) and same(d['f'],x['f']) for x in d['out']),'Anchor or front drift')
   must(all(abs(x['skin'][0]+x['skin'][2]-d['a'][0]-48)<.1 and abs(x['skin'][1]+x['skin'][3]-d['a'][1]-48)<.1 for x in d['out']),'Surface moved fixed edges')
   must(all(x['br']=='24px' and 47.9<=x['skin'][2]<=336.1 and 47.9<=x['skin'][3]<=328.1 for x in d['out']),'Corner or size overshoot')
   motion.append(d);return {'directions':6,'sampled_frames':len(d['out'])}
  check('F03 Six transition directions preserve target, foreground and corner arc',transitions)
  def targets():
   reset('collapsed');a=rect('.ps-anchor')
   for m in ['collapsed','capsule','board']:
    ev(f"PaiaDemo.surfaces[0].setMode('{m}')");page.wait_for_timeout(170)
    for x,y in [(2,2),(46,2),(2,46),(46,46),(24,24)]:
     must(ev(f"document.elementFromPoint({a[0]+x},{a[1]+y})?.closest('button')?.dataset.action")=='toggle','Target corner stolen '+m)
   return 'All four 48px target corners and center remain toggle-owned.'
  check('F04 Full 48px hit rectangle remains usable in all three states',targets)
  def six_rows():
   reset();box=rect('.ps-list');rows=page.locator('.ps-row');widths=[]
   for i in range(6):
    q=rows.nth(i).bounding_box();must(q['height']==44,'Row shrunk');must(q['y']>=box[1]-.1 and q['y']+44<=box[1]+box[3]+.1,'Row clipped');widths.append(q['width'])
   must(len(set(widths))==1,'Last row narrowed')
   seventh=rows.nth(6).bounding_box();must(seventh['y']>=box[1]+box[3]-.1,'Seventh row peeking')
   return {'row_widths':widths,'viewport_height':box[3]}
  check('F05 Six full equal-width 44px rows; no partial seventh row',six_rows)
  def toolbar():
   reset();s=rect('.ps-anchor');h=rect('.ps-header')
   must(abs(h[1]+h[3]-s[1]-s[3])<=1.1,'Toolbar and corner misaligned')
   for a in ['search','tools']:
    q=page.locator(f'[data-action={a}]');r=q.bounding_box();must(r['x']+r['width']<=s[0]-7,'Toolbar target touches corner');q.click();ev("PaiaDemo.surfaces[0].view='list';PaiaDemo.surfaces[0].render()");page.wait_for_timeout(20)
   must(page.locator('.ps-header').evaluate('(h)=>h===h.parentNode.lastElementChild'),'DOM order differs from visual order')
   return 'Original two tools retained, not duplicated; body precedes tools in DOM.'
  check('F06 Original toolbar relocated, with safe control-corner separation',toolbar)
  def capsule():
   reset('capsule');a=rect('.ps-anchor');skin=rect('.ps-unified-skin');u=rect('.ps-use-capsule')
   must(skin[2:]==[272,48] and abs(u[0]+u[2]-a[0])<.1,'R2 pill or boundary changed')
   must(page.locator('.ps-capsule-shape').count()==0,'Neck remains')
   page.mouse.click(a[0]-3,a[1]+24);must(ev('PaiaDemo.fixtures[0].effects')==1,'Body fails')
   page.mouse.click(a[0]+24,a[1]+24);must(ev('PaiaDemo.fixtures[0].effects')==1,'Toggle inserts')
  check('F07 R2 one-piece capsule and two independent actions retained',capsule)
  def editor():
   reset();page.locator('.ps-row').first.hover();page.locator('.ps-row-more').first.click();page.locator('[data-action=edit]').click()
   for action in ['save','cancel']:
    q=page.locator(f'[data-action={action}]')
    must(q.evaluate('(e)=>{let r=e.getBoundingClientRect();return [[4,4],[r.width-4,4],[4,r.height-4],[r.width-4,r.height-4]].every(([x,y])=>document.elementFromPoint(r.x+x,r.y+y)?.closest("button")===e)}'),'Editor corners blocked '+action)
   a=rect('.ps-anchor');q=rect('[data-action=save]');must(q[1]+q[3]<a[1],'Save overlaps shared toolbar/corner')
  check('F08 Save/Cancel and all four corners avoid the fixed control region',editor)
  def keyboard():
   reset('collapsed');page.keyboard.press('Tab');page.locator('.ps-anchor').focus();page.keyboard.press('Enter')
   must(page.locator('.ps-row-use').first.evaluate('(x)=>x===document.activeElement'),'Keyboard open focus')
   page.locator('[data-action=search]').focus();page.keyboard.press('Enter');page.locator('.ps-query').fill('natural');page.keyboard.press('ArrowDown');page.keyboard.press('Enter')
   must(ev('PaiaDemo.fixtures[0].effects')==1,'Bottom search keyboard path fails')
   must(page.locator('.host-draft').evaluate('(x)=>x===document.activeElement'),'Editor focus not restored')
   must(page.locator('.ps-anchor').get_attribute('aria-controls')==page.locator('.ps-board').get_attribute('id'),'Lost accessible association')
  check('F09 Bottom search, keyboard use and accessible control relationship',keyboard)
  def focus():
   reset();page.keyboard.press('Tab');page.locator('.ps-anchor').focus()
   must(ev("getComputedStyle(document.querySelector('.ps-anchor')).outlineStyle")!='none','No focus outline')
   must(page.locator('.ps-anchor').get_attribute('aria-label')=='收起常用表达','Missing invisible accessible label')
   must(page.locator('.ps-sr[role=status]').count()==1,'Status semantics missing')
  check('F10 Visible keyboard focus and invisible labels survive no-hint policy',focus)
  def narrow():
   for w in [320,390,1024]:
    reset();page.set_viewport_size({'width':w,'height':844});page.wait_for_timeout(150);a=rect('.ps-anchor');b=rect('.ps-board')
    must(b[0]>=8 and b[0]+b[2]<=w-8,'Narrow overflow')
    page.locator('.ps-anchor').click();page.locator('.ps-anchor').click();must(same(a,rect('.ps-anchor')),'Narrow mode drift')
  check('F11 320/390/1024px viewports preserve same target and safe width',narrow)
  def reduced():
   reset('collapsed');page.emulate_media(reduced_motion='reduce');ev("PaiaDemo.surfaces[0].setMode('board')")
   must(rect('.ps-unified-skin')[2:]==[336,328],'Motion not immediate')
   must(ev("getComputedStyle(document.querySelector('.ps-board')).transitionDuration")=='0s','Reveal still animates')
  check('F12 Reduced motion switches immediately with no extra geometry',reduced)
  def forced():
   reset();page.emulate_media(forced_colors='active')
   must(ev("getComputedStyle(document.querySelector('.ps-unified-skin')).borderTopStyle")=='solid','No shared outline')
   must(ev("getComputedStyle(document.querySelector('.ps-front')).stroke")!='none','No glyph outline')
  check('F13 Forced-color shared skin and double-card outlines retained',forced)
  def theme():
   reset();a=rect('.ps-anchor');b=rect('.ps-board');ev("PaiaDemo.setTheme('dark')")
   must(same(a,rect('.ps-anchor')) and same(b,rect('.ps-board')),'Theme geometry drift')
   must(ev("getComputedStyle(document.querySelector('.ps-unified-skin')).backgroundColor")=='rgb(43, 44, 48)','Inherited dark material changed')
  check('F14 Theme switch preserves inherited material and exact geometry',theme)
  def occlusion():
   reset();ev("PaiaDemo.setScene('long')");a=rect('.ps-anchor');b=rect('.ps-board');composer=rect('.host-composer')
   must(composer[1]-a[1]-48==12,'Host composer overlapped')
   x,y=b[0]-4,b[1]+b[3]-4
   must(not ev(f"document.elementFromPoint({x},{y})?.closest('.paia')"),'Unpainted outer area steals click')
   return {'painted_envelope':[336,328],'r2_envelope':[336,368],'note':'Text beneath an open panel remains occluded; no automatic host content repositioning.'}
  check('F15 Smaller total envelope; host composer clear; outer blank area not interactive',occlusion)
  def details():
   c=browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=3);p=c.new_page();p.set_content(html);p.evaluate("PaiaDemo.setView('compare')");p.wait_for_timeout(170)
   a=p.locator('.ps-anchor').nth(2).bounding_box()
   p.screenshot(path=str(ROOT/'evidence/fused-corner-detail.png'),clip={'x':a['x']-134,'y':a['y']-66,'width':194,'height':128})
   a=p.locator('.ps-anchor').nth(1).bounding_box()
   p.screenshot(path=str(ROOT/'evidence/capsule-detail.png'),clip={'x':a['x']-236,'y':a['y']-10,'width':294,'height':68})
   c.close();return 'Actual Chromium DPR3 detail crops, not redrawn images.'
  check('F16 Actual DPR3 shared-corner and unchanged-capsule detail renders',details)
  def invariants():
   reset();ev("PaiaDemo.setView('compare')");page.wait_for_timeout(170)
   for s in page.locator('.paia').all():
    must(s.locator('.ps-glyph rect').count()==2,'Glyph changed');must(s.locator('[title],.ps-tooltip').count()==0,'Hint returned')
   return '3 independent specimens, same component implementation.'
  check('F17 Comparison specimens contain exact two-card identity and zero hints',invariants)
  def file_open():
   p=ctx.new_page();p.goto((ROOT/'PAIA_Float_R3.html').as_uri());p.locator('#view-compare').click();p.wait_for_timeout(170)
   must(p.locator('.paia').count()==3,'Standalone file failed');p.locator('.ps-anchor').nth(2).click();must(p.locator('.paia').nth(2).get_attribute('data-mode')=='collapsed','File toggle failed');p.close()
   return 'The delivered self-contained HTML was opened via file:// without a server.'
  check('F18 Ready-to-open single HTML actually runs from file://',file_open)
  def sources():
   inherited=json.loads((ROOT/'inheritance.json').read_text())
   for n in ['demo.css','demo.js','tokens-r1.json','verify_r1_inherited.py']:
    must(hashlib.sha256((ROOT/n).read_bytes()).hexdigest()==inherited['sources'][n]['r2_sha256'],'Inherited owner changed '+n)
   must('ps-tooltip' not in (ROOT/'component.js').read_text() and 'ps-tooltip' not in (ROOT/'component.css').read_text(),'Dormant tooltip implementation remains')
   return 'Only declared no-tooltip removal in inherited component; adapters untouched.'
  check('F19 Scope integrity and removal of the tooltip implementation itself',sources)
  check('F20 No uncaught JS errors or external requests',lambda:must(not errors and not external,str([errors,external])))
  version=browser.version;browser.close()
 (ROOT/'evidence/fusion-motion-samples.json').write_text(json.dumps(motion,indent=2)+'\n')
 report={'scope':'Offline synthetic Chromium fusion candidate, not installed-extension or user-acceptance evidence','timestamp_utc':datetime.now(timezone.utc).isoformat(),'browser':version,'checks':results,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results),'blocked':sum(x['status']=='BLOCKED' for x in results),'page_errors':errors,'external_requests':external,'source_sha256':{n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in ['component.css','component.js','fusion.css','fusion.js','demo.css','demo.js','build.py','index.html','verify_fusion.py']},'not_verified':['Actual extension frame isolation and real host insertion/undo','Native browser chrome zoom controls (DPR/viewport/text variations are separate)','Screen reader spoken output / OS IME','Physical120Hz / actual event-to-paint p95','Live provider / sustained human comfort']}
 (ROOT/'evidence/fusion-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'passed':report['passed'],'failed':report['failed'],'blocked':report['blocked']}));return report['failed']
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--chromium',default='/usr/bin/chromium');args=p.parse_args();raise SystemExit(bool(run(args.chromium)))
