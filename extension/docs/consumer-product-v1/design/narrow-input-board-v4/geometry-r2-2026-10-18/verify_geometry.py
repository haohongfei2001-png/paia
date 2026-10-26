"""R2 geometry checks and reproducible actual Chromium detail renders.
The B render is decision evidence only; it is never a runtime option.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, argparse
from playwright.sync_api import sync_playwright
from build import build
ROOT=Path(__file__).resolve().parent
RESULTS=[]
def must(ok,why):
    if not ok: raise AssertionError(why)
def same(a,b):return all(abs(x-y)<.15 for x,y in zip(a,b))
def check(name,fn):
    try:fn();result={'name':name,'status':'PASS'}
    except Exception as e:result={'name':name,'status':'FAIL','detail':str(e)[:1200]}
    RESULTS.append(result);print(result['status'],name,flush=True)
def rect(page,s):return page.locator(s).first.evaluate('(e)=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(executable):
    html=build(ROOT);errors=[];requests=[];decisions={}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=1)
        page=context.new_page();page.set_default_timeout(3000)
        page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
        def ev(s):return page.evaluate(s)
        def reset(mode='collapsed'):
            page.set_viewport_size({'width':1440,'height':960});page.emulate_media(forced_colors='none',reduced_motion='no-preference')
            page.set_content(html);ev(f"PaiaDemo.surfaces[0].setMode('{mode}')");page.wait_for_timeout(160)
        def continuous_outline():
            reset('capsule');v=ev("""()=>{const s=document.querySelector('.ps-unified-skin'),a=document.querySelector('.ps-anchor'),g=getComputedStyle(s),k=getComputedStyle(a);return [s.clientWidth,s.offsetWidth,s.offsetHeight,g.borderTopLeftRadius,g.borderTopRightRadius,g.borderBottomRightRadius,g.borderBottomLeftRadius,k.backgroundColor,k.borderTopColor,document.querySelectorAll('.ps-capsule-shape').length]}""")
            must(v[:7]==[270,272,48,'24px','24px','24px','24px'],'Not one equal-height stadium')
            must(v[7:]==['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)',0],'Old ring/neck still contributes to outline')
        check('G01 One 272×48 stadium; no old neck SVG or duplicate circle border',continuous_outline)
        def motion():
            reset();d=ev("""async()=>{const s=PaiaDemo.surfaces[0],r=e=>{const a=e.getBoundingClientRect();return [a.x,a.y,a.width,a.height]};const a=r(s.anchor),f=r(s.root.querySelector('.ps-front'));let out=[];for(const mode of ['capsule','board','capsule','collapsed']){s.setMode(mode);for(let i=0;i<10;i++){await new Promise(requestAnimationFrame);out.push({mode,a:r(s.anchor),f:r(s.root.querySelector('.ps-front')),skin:r(s.skin),mask:r(s.capsule),radius:getComputedStyle(s.skin).borderRadius});}}return{a,f,out}}""")
            must(all(same(d['a'],v['a']) and same(d['f'],v['f']) for v in d['out']),'Anchor/front moved')
            must(all(abs(v['skin'][0]+v['skin'][2]-(d['a'][0]+48))<.1 and v['skin'][3]==48 and v['radius']=='24px' for v in d['out']),'End cap/height drift')
            must(all(abs(v['skin'][2]-v['mask'][2])<.2 for v in d['out']),'Text mask and surface widths disagree')
            (ROOT/'evidence/motion-samples.json').write_text(json.dumps(d,indent=2))
        check('G02 Four transition directions: fixed end cap/glyph and synchronous text mask',motion)
        def gap():
            reset('board');a=rect(page,'.ps-anchor');b=rect(page,'.ps-board')
            must(abs(a[1]-b[1]-b[3]-8)<.1,'Gap is not 8px')
            must(abs(a[0]+a[2]-b[0]-b[2])<.1,'Right edges do not align')
            must(ev("(()=>{const s=PaiaDemo.surfaces[0],a=s.anchor.getBoundingClientRect(),b=s.board.getBoundingClientRect();return !document.elementFromPoint(a.x+24,b.bottom+4)?.closest('.paia')})()"),'Gap steals pointer')
            page.mouse.move(a[0]+24,a[1]+24);page.mouse.move(a[0]+24,a[1]-4);page.mouse.move(b[0]+30,b[1]+80)
            must(page.locator('.ps-board').is_visible(),'Crossing gap closed panel')
        check('G03 Exact separate 8px gap, aligned right edges, pointer pass-through',gap)
        def boundary():
            reset('capsule');a=rect(page,'.ps-anchor');body=rect(page,'.ps-use-capsule')
            must(abs(body[0]+body[2]-a[0])<.1,'Targets overlap or leave a neck')
            for x,action in [(a[0]-3,'capsule'),(a[0]+3,'toggle')]:
                got=ev(f"document.elementFromPoint({x},{a[1]+24})?.closest('button')?.dataset.action")
                must(got==action,'Wrong action at seam: '+str(got))
        check('G04 Adjacent body/toggle targets: no overlap, dead neck or visible divider',boundary)
        def anchor_corners():
            reset('board');a=rect(page,'.ps-anchor')
            for x,y in [(6,6),(42,6),(6,42),(42,42),(24,24)]:
                must(ev(f"document.elementFromPoint({a[0]+x},{a[1]+y})?.closest('button')?.dataset.action")=='toggle','Circle corner stolen')
        check('G05 Full unchanged 48px toggle hit rectangle is unobstructed',anchor_corners)
        def last_row():
            reset('board');b=rect(page,'.ps-board');r=rect(page,'.ps-row:nth-child(6)')
            must(r[1]+r[3]<=b[1]+b[3]-1,'Sixth row clipped')
            button=page.locator('.ps-row-use').nth(5)
            must(button.evaluate('(e)=>{const b=e.getBoundingClientRect();return [[6,6],[b.width-6,6],[6,b.height-6],[b.width-6,b.height-6]].every(([x,y])=>document.elementFromPoint(b.x+x,b.y+y)?.closest("button")===e)}'),'Sixth-row corners blocked')
        check('G06 Six complete rows; last-row corner hits avoid all circle geometry',last_row)
        def controls():
            reset('board');page.locator('.ps-row').first.hover();page.locator('.ps-row-more').first.click();page.locator('[data-action=edit]').click();page.locator('.ps-edit-text').fill('保留这次输入。')
            for sel in ['[data-action=cancel]','[data-action=save]']:
                must(page.locator(sel).evaluate('(e)=>{const r=e.getBoundingClientRect();return [[6,6],[r.width-6,6],[6,r.height-6],[r.width-6,r.height-6]].every(([x,y])=>document.elementFromPoint(r.x+x,r.y+y)?.closest("button")===e)}'),'Editor action blocked')
        check('G07 Save/Cancel four-corner targets remain fully in the panel',controls)
        def hover():
            reset('board');page.locator('.ps-anchor').hover();page.wait_for_timeout(820)
            t=rect(page,'.ps-tooltip');b=rect(page,'.ps-board')
            must(t[1]>=b[1]+b[3],'Close tooltip covers last row')
            must(page.locator('.ps-tooltip').is_visible(),'No tooltip')
        check('G08 Board-open tooltip stays below panel rather than over last expression',hover)
        def semantics():
            reset('capsule');page.keyboard.press('Tab');page.locator('.ps-anchor').focus()
            must(page.locator('.ps-anchor').get_attribute('aria-label')=='展开常用表达','Missing toggle label')
            must(page.locator('.ps-anchor').get_attribute('aria-controls')==page.locator('.ps-board').get_attribute('id'),'Lost controlled panel')
            must(ev("getComputedStyle(document.querySelector('.ps-anchor')).outlineStyle")!='none','Keyboard focus not visible')
            page.keyboard.press('Enter');must(page.locator('.ps-anchor').get_attribute('aria-expanded')=='true','Lost expanded state')
            must(page.locator('.ps-board').get_attribute('aria-modal')=='false','Wrong modal semantics')
            must(page.locator('.ps-row-use').first.evaluate('(e)=>e===document.activeElement'),'Keyboard-open focus lost')
        check('G09 Accessible names/control relationship and keyboard focus retained',semantics)
        def fit():
            reset('capsule');page.set_viewport_size({'width':320,'height':844});page.wait_for_timeout(180);s=rect(page,'.ps-unified-skin');must(s[0]>=8 and s[0]+s[2]<=312,'Capsule outside narrow host');a=rect(page,'.ps-anchor');page.locator('.ps-anchor').click();page.wait_for_timeout(160);b=rect(page,'.ps-board');must(b[0]>=8 and b[0]+b[2]<=312,'Board outside narrow host');must(same(a,rect(page,'.ps-anchor')),'Narrow open moved anchor')
        check('G10 320px viewport clamps both shells without shifting the toggle',fit)
        def reduced():
            reset();page.emulate_media(reduced_motion='reduce');ev("PaiaDemo.surfaces[0].setMode('capsule')")
            must(rect(page,'.ps-unified-skin')[2]==272,'Reduced motion not immediately settled')
            must(ev("getComputedStyle(document.querySelector('.ps-unified-skin')).transitionDuration")=='0s','Skin still animates')
        check('G11 Reduced motion switches shared surface immediately',reduced)
        def forced():
            reset('capsule');page.emulate_media(forced_colors='active');must(ev("getComputedStyle(document.querySelector('.ps-unified-skin')).borderTopStyle")=='solid','Shared outline absent')
            must(ev("getComputedStyle(document.querySelector('.ps-front')).stroke")!='none','Card outline absent')
        check('G12 Forced-color shared shell and inherited cards retain outlines',forced)
        def dark():
            reset('capsule');a=rect(page,'.ps-anchor');ev("PaiaDemo.setTheme('dark')");must(same(a,rect(page,'.ps-anchor')),'Theme moved anchor');must(ev("getComputedStyle(document.querySelector('.ps-unified-skin')).backgroundColor")=='rgb(43, 44, 48)','R1 dark surface not inherited')
        check('G13 Dark adaptation reuses original material, without geometry changes',dark)
        def ab():
            reset('board');ev("PaiaDemo.setView('compare')");page.wait_for_timeout(170)
            page.screenshot(path=str(ROOT/'evidence/selected-separate-a.png'),full_page=True)
            a=page.locator('.ps-board').nth(2).bounding_box()
            style=page.add_style_tag(content='''
.paia[data-geometry=r2][data-mode=board] .ps-board{right:0;bottom:0;height:360px!important;border-bottom-right-radius:24px;padding-bottom:48px;}
.paia[data-geometry=r2][data-mode=board] .ps-unified-skin{opacity:0;}
.paia[data-geometry=r2][data-mode=board] .ps-anchor{border-color:var(--border);background:var(--surface);}
''')
            page.wait_for_timeout(160);page.screenshot(path=str(ROOT/'evidence/rejected-embedded-b.png'),full_page=True)
            b=page.locator('.ps-board').nth(2).bounding_box()
            must(a['height']==312 and b['height']==360,'Alternative not actually rendered')
            decisions.update({'selected':'A: separate panel with 8px clear gap','a_board_css':a,'b_board_css':b,'b_reason_rejected':'Reserving the fixed 48px control requires a nearly empty full-width footer to retain the existing six-row content region. More surface area and less independent-circle clarity.','a_tradeoff':'The total envelope is 22px taller than R1; genuine short-height cases use the retained constrained-interior/fallback owner. Neither arrangement eliminates conversational-text occlusion.','r1_envelope_css':[370,346],'r2_envelope_css':[336,368],'b_is_runtime_option':False})
            style.evaluate('(e)=>e.remove()');must(page.locator('.ps-board').nth(2).bounding_box()['height']==312,'B leaked into selected candidate')
        check('G14 Actual A/B geometry rendering; rejected B removed from final component',ab)
        def detail():
            c=browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=3);p=c.new_page();p.set_content(html);p.evaluate("PaiaDemo.setView('compare')");p.wait_for_timeout(180)
            a=p.locator('.ps-anchor').nth(1).bounding_box();b=p.locator('.ps-board').nth(2).bounding_box();last=p.locator('.ps-anchor').nth(2).bounding_box()
            p.screenshot(path=str(ROOT/'evidence/capsule-detail.png'),clip={'x':a['x']+48-272-10,'y':a['y']-10,'width':292,'height':68})
            p.screenshot(path=str(ROOT/'evidence/board-gap-detail.png'),clip={'x':last['x']-116,'y':last['y']-96,'width':174,'height':154})
            c.close()
        check('G15 DPR3 actual rendered capsule end and board-gap detail captures',detail)
        check('G16 No uncaught JavaScript errors or external requests',lambda:must(not errors and not requests,str([errors,requests])))
        version=browser.version;browser.close()
    decisions.update({'scope':'Self-reviewed offline visual comparison, not user preference measurement','screenshots':{p.name:sha(p) for p in [ROOT/'evidence/selected-separate-a.png',ROOT/'evidence/rejected-embedded-b.png']}})
    (ROOT/'evidence/geometry-decision.json').write_text(json.dumps(decisions,ensure_ascii=False,indent=2))
    report={'scope':'R2 offline geometry tests only. Production extension, native screen reader, OS IME, native undo, physical120Hz and human comfort are NOT certified.','timestamp_utc':datetime.now(timezone.utc).isoformat(),'browser':version,'checks':RESULTS,'passed':sum(v['status']=='PASS' for v in RESULTS),'failed':sum(v['status']=='FAIL' for v in RESULTS),'source_sha256':{n:sha(ROOT/n) for n in ['component.css','component.js','demo.css','demo.js','geometry.css','geometry.js','build.py','index.html','verify_geometry.py']},'page_errors':errors,'external_requests':requests}
    (ROOT/'evidence/geometry-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed']}));return report['failed']
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--chromium',default='/usr/bin/chromium');args=parser.parse_args();raise SystemExit(1 if run(args.chromium) else 0)
