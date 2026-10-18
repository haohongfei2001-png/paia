"""Reproducible browser checks of the OFFLINE design prototype, not the extension.
Uses Chromium's DOM renderer with the exact standalone HTML bytes; no URL loading.
Requires Python playwright and a Chromium executable. Does not install packages.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse, hashlib, json, time
from playwright.sync_api import sync_playwright
from build import build

ROOT=Path(__file__).resolve().parent
RESULTS=[]
ERRORS=[]
REQUESTS=[]

def check(name, fn):
    start=time.monotonic()
    try:
        fn(); result={'name':name,'status':'PASS'}
    except Exception as exc:
        result={'name':name,'status':'FAIL','error':str(exc)[:1800]}
    result['duration_ms']=round((time.monotonic()-start)*1000,1)
    RESULTS.append(result); print(result['status'],name,flush=True)

def must(value, message):
    if not value: raise AssertionError(message)

def rect(page, selector):
    return page.locator(selector).first.evaluate('(e)=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}')

def run(executable):
    html=build(ROOT)
    (ROOT/'PAIA_Float_R1.html').write_text(html,encoding='utf-8')
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=1)
        page=context.new_page();page.set_default_timeout(4000)
        page.on('pageerror',lambda e:ERRORS.append(str(e)))
        page.on('request',lambda r:REQUESTS.append(r.url))
        def reset(mode='collapsed'):
            page.set_viewport_size({'width':1440,'height':960})
            page.emulate_media(color_scheme='light',reduced_motion='no-preference',forced_colors='none')
            page.set_content(html);page.evaluate(f"PaiaDemo.surfaces[0].setMode('{mode}')")
            page.wait_for_timeout(160)
        def evaluate(s): return page.evaluate(s)
        def mode(): return page.locator('.paia').first.get_attribute('data-mode')
        def open_detail():
            page.locator('.ps-row').first.hover();page.locator('.ps-row-more').first.click()
        def start_edit():
            open_detail();page.locator('[data-action=edit]').click()
        def same(a,b): return all(abs(x-y)<.1 for x,y in zip(a,b))
        def geometry():
            reset();anchor=rect(page,'.ps-anchor');front=rect(page,'.ps-front');states=[]
            for m,dx,dy in [('collapsed',-2.5,0),('capsule',-5,0),('board',-5.25,-1.5)]:
                evaluate(f"PaiaDemo.surfaces[0].setMode('{m}')");page.wait_for_timeout(160)
                must(same(anchor,rect(page,'.ps-anchor')),'Anchor moved')
                must(same(front,rect(page,'.ps-front')),'Foreground moved')
                r=rect(page,'.ps-rear');f=rect(page,'.ps-front')
                must(abs(r[0]-f[0]-dx)<.1 and abs(r[1]-f[1]-dy)<.1,'Incorrect rear offset')
                must(abs(f[2]-21)<.1 and abs(f[3]-14)<.1,'Incorrect card dimensions')
                must(page.locator('.ps-glyph rect').count()==2,'Not exactly two cards')
                states.append({'mode':m,'anchor':anchor,'front':f,'rear':r})
            (ROOT/'evidence/geometry.json').write_text(json.dumps(states,indent=2))
        check('01 Same 48px circle / 21×14 cards / exact three rear offsets',geometry)
        def pointer():
            reset();a=rect(page,'.ps-anchor');x,y=a[0]+24,a[1]+24
            for _ in range(4):
                page.mouse.click(x,y);must(mode()=='board','Did not open')
                must(same(a,rect(page,'.ps-anchor')),'Opening moved target')
                page.mouse.click(x,y);must(mode()=='collapsed','Cannot close at same point')
            must(evaluate('PaiaDemo.fixtures[0].effects')==0,'Toggle inserted text')
        check('02 Repeated same-coordinate pointer open/close; no insertion',pointer)
        def motion():
            reset();samples=evaluate("""async()=>{const s=PaiaDemo.surfaces[0],r=e=>{const b=e.getBoundingClientRect();return [b.x,b.y,b.width,b.height]};const a=r(s.anchor),f=r(s.root.querySelector('.ps-front'));s.setMode('board');let out=[];for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);out.push([r(s.anchor),r(s.root.querySelector('.ps-front'))]);}return {a,f,out}}""")
            must(all(same(samples['a'],a) and same(samples['f'],f) for a,f in samples['out']),'Anchor/front drift during motion')
        check('03 Anchor and foreground do not drift during animation frames',motion)
        def capsule():
            reset('capsule');a=rect(page,'.ps-anchor');page.locator('.ps-use-capsule').click()
            must(evaluate('PaiaDemo.fixtures[0].effects')==1 and mode()=='capsule','Capsule use result')
            page.locator('.ps-anchor').click();must(mode()=='board','Capsule toggle did not open')
            page.locator('.ps-anchor').click();must(mode()=='capsule','Wrong return form')
            page.mouse.click(a[0]-3,a[1]+24)
            must(evaluate('PaiaDemo.fixtures[0].effects')==1,'Neck inserted')
        check('04 Capsule body, circle and noninteractive neck stay separate',capsule)
        def selection():
            reset('board');evaluate("(()=>{const f=PaiaDemo.fixtures[0];f.setDraft('prefix SELECTED suffix');f.draft.focus();f.draft.setSelectionRange(7,15);f.draft.dispatchEvent(new Event('select'));})()")
            text=evaluate('PaiaDemo.fixtures[0].data[0].text');page.locator('.ps-row-use').first.click()
            must(page.locator('.host-draft').input_value()=='prefix SELECTED'+text+' suffix','Selected draft was overwritten or inserted at wrong point')
            must(mode()=='board','Insertion closed board')
            must(page.locator('.host-draft').evaluate('(e)=>e===document.activeElement'),'Focus not returned')
            must(page.locator('.host-send').is_disabled(),'Demo send unexpectedly enabled')
        check('05 Pointer insertion preserves selected text and suffix, returns draft focus',selection)
        def keyboard():
            reset();page.locator('.ps-anchor').focus();page.keyboard.press('Enter')
            must(page.locator('.ps-row-use').first.evaluate('(e)=>e===document.activeElement'),'Keyboard open focus')
            page.keyboard.press('ArrowDown');page.keyboard.press('ArrowRight')
            must(page.locator('.ps-row-more').nth(1).evaluate('(e)=>e===document.activeElement'),'Row more not keyboard reachable')
            page.keyboard.press('ArrowLeft');page.keyboard.down('Enter');initial=page.locator('.host-draft').input_value();page.keyboard.down('Enter');page.keyboard.down('Enter');page.keyboard.up('Enter')
            must(page.locator('.host-draft').input_value()==initial,'Held Enter changed host draft')
            must(evaluate('PaiaDemo.fixtures[0].effects')==1,'Held key duplicated insertion')
            must(not evaluate("!!document.querySelector('.ps-row:focus-within')"),'Stale keyboard current row')
        check('06 Keyboard navigation, more access and held-activation suppression',keyboard)
        def double():
            reset('board');page.locator('.ps-row-use').first.dblclick();must(evaluate('PaiaDemo.fixtures[0].effects')==1,'Double-click duplicated effect')
        check('07 Double-click produces one fixture insertion',double)
        def search():
            reset('board');page.locator('[data-action=search]').click();must(page.locator('.ps-row-use').count()==0,'Search zero-query feed')
            page.locator('.ps-query').fill('trade-offs');must(page.locator('.ps-row-use').count()==1,'Later fixture not found');must(page.locator('.ps-row-use').first.get_attribute('data-id')=='fixture-8','Wrong history result');page.locator('[data-action=clear]').click();must(page.locator('.ps-row-use').count()==0,'Clear result state')
        check('08 Search reaches later history fixtures; empty query has no feed',search)
        def ime():
            reset('board');page.locator('[data-action=search]').click();page.locator('.ps-query').fill('trade-offs');q=page.locator('.ps-query');q.dispatch_event('compositionstart');q.fill('natural');must(page.locator('.ps-row-use').first.get_attribute('data-id')=='fixture-8','IME queried early');q.dispatch_event('compositionend');must(page.locator('.ps-row-use').first.get_attribute('data-id')=='fixture-6','IME query not applied')
        check('09 Search defers changes during composition',ime)
        def long_only():
            reset('board');page.locator('[data-action=search]').click();page.locator('.ps-query').fill('Long archive');must(page.locator('.ps-row-use').count()==1,'Long-only falsely absent');page.locator('.ps-row-use').click();must(page.locator('[data-action=use]').count()==0,'Long whole body admitted');must(page.locator('[data-action=open-paia]').count()==1,'No long-view continuation');must(evaluate('PaiaDemo.fixtures[0].effects')==0,'Long body inserted')
        check('10 Long-only search stays truthful and cannot quick-insert whole body',long_only)
        def lengths():
            reset('board');must(evaluate("PaiaRefinement.length('👨‍👩‍👧‍👦')")==1,'Emoji count');must(evaluate("PaiaRefinement.length('a\\r\\nb')")==3,'CRLF count');start_edit();page.locator('.ps-edit-text').fill('字'*150);must(page.locator('[data-action=save]').is_enabled(),'150 refused');page.locator('.ps-edit-text').fill('字'*151);must(page.locator('[data-action=save]').is_disabled(),'151 admitted');must(len(page.locator('.ps-edit-text').input_value())==151,'Oversize input truncated')
        check('11 Grapheme 150/151 boundary and preserved oversize draft',lengths)
        def edit_save():
            reset('board');start_edit();page.locator('.ps-edit-text').fill('保留原意，也说明理由。');page.locator('[data-action=save]').click();must(evaluate('PaiaDemo.fixtures[0].data[0].text')=='保留原意，也说明理由。','Save did not update fixture');must(evaluate('PaiaDemo.fixtures[0].data[0].revision')==2,'Revision unchanged');must(mode()=='board','Save closed board')
        check('12 Edit/save operates on revisioned local fixture data',edit_save)
        def dirty():
            reset('board');start_edit();page.locator('.ps-edit-text').fill('尚未保存的内容');page.locator('.ps-anchor').click();must(mode()=='board','Dirty work closed');page.locator('[data-action=guard-continue]').click();must(page.locator('.ps-edit-text').input_value()=='尚未保存的内容','Dirty work lost');evaluate("PaiaDemo.setTheme('dark')");must(page.locator('.ps-edit-text').input_value()=='尚未保存的内容','Theme lost dirty work');page.locator('.ps-anchor').click();page.locator('[data-action=guard-discard]').click();must(mode()=='collapsed','Explicit discard did not close');must(evaluate('PaiaDemo.fixtures[0].data[0].revision')==1,'Discard changed saved data')
        check('13 Dirty guard and theme switch preserve unsaved work',dirty)
        def rejected_save():
            reset('board');start_edit();page.locator('.ps-edit-text').fill('这段修改必须保留');evaluate('PaiaDemo.fixtures[0].saveReject=true');page.locator('[data-action=save]').click();must(page.locator('.ps-notice').is_visible(),'Failure not shown');must(page.locator('.ps-edit-text').input_value()=='这段修改必须保留','Rejected draft lost');b=page.locator('[data-action=save]');b.scroll_into_view_if_needed();must(b.evaluate('(e)=>{const b=e.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest("button")===e}'),'Status intercepts Save');must(b.evaluate('(e)=>{const r=e.getBoundingClientRect();return [[6,6],[r.width-6,6],[6,r.height-6],[r.width-6,r.height-6]].every(([x,y])=>document.elementFromPoint(r.x+x,r.y+y)?.closest("button")===e)}'),'A Save corner is intercepted');b.click();must(page.locator('.ps-edit-text').input_value()=='这段修改必须保留','Second denial lost text')
        check('14 Persistent save error stays in flow and does not cover Save',rejected_save)
        def management():
            reset('board');open_detail();page.locator('[data-action=hide]').click();page.locator('[data-action=tools]').click();page.locator('[data-action=hidden]').click();must(page.locator('.ps-row-use').count()==1,'Hidden item not available');page.locator('.ps-row-use').click();must(not evaluate('PaiaDemo.fixtures[0].data[0].hidden'),'Restore failed');page.locator('[data-action=back]').click();page.locator('[data-action=tools]').click();page.locator('[data-action=new]').click();page.locator('.ps-edit-text').fill('新建的示例表达');page.locator('[data-action=save]').click();must(evaluate("PaiaDemo.fixtures[0].data.some(x=>x.text==='新建的示例表达')"),'New expression not saved')
        check('15 More operations: hide, restore and create are reachable and functional',management)
        def split():
            reset('board');open_detail();page.locator('[data-action=split]').click();page.locator('.ps-edit-text').fill('第一条表达\n第二条表达');page.locator('[data-action=save]').click();must(evaluate("PaiaDemo.fixtures[0].data.some(x=>x.text==='第一条表达')&&PaiaDemo.fixtures[0].data.some(x=>x.text==='第二条表达')"),'Split failed')
        check('16 Same-board split editor produces two fixture expressions',split)
        def growth():
            reset('board');a=rect(page,'.ps-anchor');c=rect(page,'.host-composer');evaluate("PaiaDemo.fixtures[0].setDraft('第一行\\n第二行\\n第三行\\n第四行\\n第五行')");page.wait_for_timeout(100);b=rect(page,'.ps-anchor');d=rect(page,'.host-composer');must(abs((b[1]-a[1])-(d[1]-c[1]))<.1,'Anchor does not track composer');must(abs(d[1]-(b[1]+b[3])-12)<.1,'Composer gap not 12px');must(mode()=='board','Composer growth changed logical mode')
        check('17 Natural composer growth tracks exactly with a 12px gap',growth)
        def fallback():
            reset('board');start_edit();page.locator('.ps-edit-text').fill('短窗口仍然保留');evaluate("(()=>{const h=document.querySelector('.demo-window');h.style.minHeight='0px';h.style.height='290px';})()");page.wait_for_timeout(100);must(page.locator('.paia').get_attribute('data-space') in ['entry','hidden'],'No insufficient-space fallback');must(mode()=='board','Logical mode changed');evaluate("(()=>{const h=document.querySelector('.demo-window');h.style.minHeight='';h.style.height='';})()");page.wait_for_timeout(100);must(page.locator('.ps-edit-text').input_value()=='短窗口仍然保留','Restoration lost dirty draft');must(page.locator('.ps-edit-text').is_visible(),'Editor not restored')
        check('18 Insufficient-space fallback/restoration preserves editor and logical mode',fallback)
        def short_save():
            reset('board');start_edit();page.locator('.ps-edit-text').fill('在较短视口内仍能保存');evaluate("(()=>{const h=document.querySelector('.demo-window');h.style.minHeight='0px';h.style.height='420px';PaiaDemo.fixtures[0].saveReject=true;})()");page.wait_for_timeout(100);save=page.locator('[data-action=save]');save.scroll_into_view_if_needed();save.click();save.scroll_into_view_if_needed();must(save.evaluate('(e)=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("button")===e}'),'Short-view status blocks Save');must(save.evaluate('(e)=>{const r=e.getBoundingClientRect();return [[6,6],[r.width-6,6],[6,r.height-6],[r.width-6,r.height-6]].every(([x,y])=>document.elementFromPoint(r.x+x,r.y+y)?.closest("button")===e)}'),'Short-view Save corner intercepted');must(page.locator('.ps-edit-text').input_value()=='在较短视口内仍能保存','Short-view draft loss')
        check('19 Short-view editor can scroll to Save even with persistent status',short_save)
        def mobile():
            reset('board');page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100);r=rect(page,'.ps-board');a=rect(page,'.ps-anchor');must(r[0]>=8 and r[0]+r[2]<=382,'Narrow board outside viewport');must(a[2]==48,'Narrow circle size changed');page.locator('.ps-anchor').click();page.locator('.ps-anchor').click();must(mode()=='board','Narrow same-point toggle');page.wait_for_timeout(180);page.mouse.move(2,2);page.screenshot(path=str(ROOT/'evidence/narrow-light.png'),full_page=True)
        check('20 390px viewport: constrained board and unchanged 48px target',mobile)
        def text_scale():
            reset('board');evaluate("document.getElementById('text-scale').value='2';PaiaDemo.applySettings()");must(rect(page,'.ps-board')[3]==312,'200% text grew ordinary board');must(evaluate("getComputedStyle(document.querySelector('.ps-row-use')).fontSize")=='28px','Text not enlarged');page.locator('.ps-row-use').nth(7).scroll_into_view_if_needed();page.locator('.ps-row-use').nth(7).click();must(evaluate('PaiaDemo.fixtures[0].effects')==1,'Enlarged overflow unreachable')
        check('21 200% component text keeps fixed board and reachable internal overflow',text_scale)
        def count():
            reset('board');b=rect(page,'.ps-board');evaluate("PaiaDemo.fixtures[0].data.splice(1);PaiaDemo.surfaces[0].freeze();PaiaDemo.surfaces[0].renderList()");must(same(b,rect(page,'.ps-board')),'One-result resizing');evaluate("PaiaDemo.fixtures[0].data.splice(0);PaiaDemo.surfaces[0].freeze();PaiaDemo.surfaces[0].renderList()");must(same(b,rect(page,'.ps-board')),'Empty board resizing')
        check('22 Empty, one and many results use the same outer geometry',count)
        def reduced():
            reset();page.emulate_media(reduced_motion='reduce');evaluate("PaiaDemo.surfaces[0].setMode('board')");must(evaluate("getComputedStyle(document.querySelector('.ps-rear')).transitionDuration")=='0s','Reduced motion still animates')
        check('23 Reduced-motion preference removes nonessential transitions',reduced)
        def forced():
            reset('board');page.emulate_media(forced_colors='active');page.wait_for_timeout(50);must(evaluate("getComputedStyle(document.querySelector('.ps-front')).stroke") not in ['none','rgba(0, 0, 0, 0)'],'Forced-color card outline absent');page.keyboard.press('Tab');page.locator('.ps-anchor').focus();must(evaluate("getComputedStyle(document.querySelector('.ps-anchor')).outlineStyle")!='none','Focus outline absent')
        check('24 Forced-colors retains card outlines and keyboard focus',forced)
        def deny():
            reset('board');evaluate('PaiaDemo.fixtures[0].revoked=true');page.locator('.ps-row-use').first.click();must(evaluate('PaiaDemo.fixtures[0].effects')==0,'Denied fixture wrote');must(page.locator('.ps-notice').is_visible(),'Denial hidden');evaluate('PaiaDemo.fixtures[0].revoked=false;PaiaDemo.fixtures[0].unknown=true');page.locator('.ps-row-use').first.click();must(evaluate('PaiaDemo.fixtures[0].effects')==0,'Unknown replayed')
        check('25 Explicit demo adapter denial/unknown does not insert or retry',deny)
        def revision():
            reset('board');evaluate("(()=>{const s=PaiaDemo.surfaces[0],fn=s.adapter.insert;s.adapter.insert=arg=>{PaiaDemo.fixtures[0].data[0].revision++;return fn(arg);};})()");page.locator('.ps-row-use').first.click();must(evaluate('PaiaDemo.fixtures[0].effects')==0,'Changed fixture revision wrote')
        check('26 Demo adapter refuses an intervening fixture revision change',revision)
        def hide_rec():
            reset('capsule');evaluate("PaiaDemo.fixtures[0].data[1].hidden=true;PaiaDemo.surfaces[0].syncMode()");must(page.locator('.ps-use-capsule').text_content()!=base_recommendation,'Hidden recommendation still shown')
        base_recommendation='Give me a concrete example.'
        check('27 Hidden recommendation is removed from the capsule',hide_rec)
        def screenshots():
            reset();evaluate("PaiaDemo.setView('compare')");page.wait_for_timeout(180);page.screenshot(path=str(ROOT/'evidence/three-states-light.png'),full_page=True);evaluate("PaiaDemo.setTheme('dark')");page.screenshot(path=str(ROOT/'evidence/three-states-dark.png'),full_page=True)
            evaluate("PaiaDemo.setView('interactive');PaiaDemo.setTheme('light');PaiaDemo.setLanguage('zh');PaiaDemo.setScene('long');PaiaDemo.surfaces[0].setMode('board')");page.wait_for_timeout(180);page.mouse.move(2,2);page.screenshot(path=str(ROOT/'evidence/long-conversation-light.png'),full_page=True)
            start_edit();page.locator('.ps-edit-text').fill('请先区分事实与推测，再说明你作出判断的理由。');evaluate("PaiaDemo.setTheme('dark')");page.screenshot(path=str(ROOT/'evidence/editor-dark.png'),full_page=True)
            c2=browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=2);p2=c2.new_page();p2.set_content(html);p2.evaluate("PaiaDemo.setView('compare')");p2.wait_for_timeout(180);p2.screenshot(path=str(ROOT/'evidence/three-states-light-dpr2.png'),full_page=True);c2.close()
        check('28 Actual Chromium screenshots: three states, two themes, long view, editor, DPR2',screenshots)
        check('29 No unhandled JavaScript errors in the complete offline run',lambda:must(not ERRORS,str(ERRORS)))
        check('30 No network requests from the self-contained prototype',lambda:must(not REQUESTS,str(REQUESTS)))
        browser_version=browser.version;context.close();browser.close()
    report={'scope':'Offline synthetic visual/component prototype only; NOT installed extension / native host / provider qualification','render_method':'Exact self-contained HTML loaded with Chromium page.set_content; managed environment blocks file and localhost URL navigation; no policy change or network used','timestamp_utc':datetime.now(timezone.utc).isoformat(),'browser':browser_version,'executable':executable,'viewport_css':[1440,960],'dpr':[1,2],'narrow_viewport_css':[390,844],'source_sha256':{n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in ['index.html','component.css','component.js','demo.css','demo.js','PAIA_Float_R1.html','build.py','verify.py']},'checks':RESULTS,'passed':sum(x['status']=='PASS' for x in RESULTS),'failed':sum(x['status']=='FAIL' for x in RESULTS),'page_errors':ERRORS,'network_requests':REQUESTS,'not_verified':['Actual Chrome extension/source-release integration','Current authenticated ChatGPT appearance or selectors','Production source/history/privacy/receiver/undo implementation','Screen-reader and OS IME behaviour','Human sustained comfort','Physical 120Hz','Native event-to-paint p95','Live provider usefulness','Safari/Firefox'],'independent_review':'Not performed; self-review and recorded Chromium checks only'}
    (ROOT/'evidence/verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'browser':browser_version}))
    return report['failed']

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--chromium',default='/usr/bin/chromium');args=parser.parse_args()
    raise SystemExit(1 if run(args.chromium) else 0)
