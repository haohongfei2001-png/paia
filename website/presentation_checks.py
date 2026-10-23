"""Scroll-first homepage contract; the independent demo keeps its core suite.

No service/submission tests here. Original statements, sources, all other pages
and original product controllers are frozen against the pre-change Git commit.
"""
from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,os,sys,re
ROOT=Path(__file__).resolve().parents[1]


def verify_static_presentation(root,check):
    from art_direction import Fragments
    from launch_checks import Text,find
    from brand_adoption_checks import restore_approved_brand
    fixture=json.loads((root/'website/presentation_invariants.json').read_text())
    for name,sha in fixture['unchanged'].items():
        data = (root/name).read_bytes()
        if name == 'assets/website/launch.css':
            from cool_neutral_white_checks import restore_approved_environment
            data = restore_approved_environment(root, data)
        data = restore_approved_brand(name, data)
        check(hashlib.sha256(data).hexdigest()==sha,'presentation unchanged except approved environment: '+name)
    for name,expectations in fixture['home_text'].items():
        source=(root/name).read_text();p=Fragments(source)
        for selector,text in expectations.items():
            actual=[Text(p.outer(n)).value() for n in find(p,selector)]
            check(actual==text,name+': retained statement/source '+selector)
        check(not re.search(r'<(?:input|textarea|select|button)\b',source.split('<main',1)[1].split('</main>',1)[0]),name+': no simulator widgets in delivered HTML')
        for token in ('data-context-text','data-card-detail','data-working','data-reading-style','data-prompt-pick','data-topic-open','试着直接修改','还原示例','显示建议','Try editing the words below','Reset example'):
            check(token not in source,name+': removed trial hook or instruction '+token)
        for script in ('home-core-v2.js','home-art.js','scroll-story.js','refinement.js'):
            check('src="/assets/website/'+script not in source,name+': simulator owner not loaded '+script)
        check('data-home-mode="presentation"' in source,name+': explicit presentation route')
        check(source.count('home-presentation.js')==1,name+': one native scroll owner')
    check((root/'index.html').read_bytes()==(root/'en/index.html').read_bytes(),'presentation: English alias exact')
    script=(root/'assets/website/home-presentation.js').read_text()
    for token in ('fetch(', 'localStorage','sessionStorage','XMLHttpRequest','WebSocket','sendBeacon','setInterval','wheel\'','preventDefault','addEventListener(\'click\'','addEventListener(\'input\''):
        check(token not in script,'presentation: no data/input/interception API '+token)
    check('if(document.body.dataset.homeMode' in script,'presentation: controller is route-scoped')


def verify_home_hero(page,check,en=True,motion=False):
    prefix='EN' if en else 'ZH'
    def test(ok,name):check(ok,prefix+' presentation hero: '+name)
    test(page.locator('[data-product-hero]').count()==1,'one approved product opening')
    test(page.locator('#hero-title').is_visible(),'value visible without a click')
    test(page.locator('[data-preview-tab]').count()==0,'no tab-gated product tour')
    test(page.locator('[data-hero-space]').evaluate_all('es=>es.map(e=>e.dataset.heroSpace)')==['archive','thought','context'],'three static product-space labels')
    test(page.locator('[data-preview-panel="archive"]').is_visible(),'Archive always visible')
    test(page.locator('.hero-stack i').evaluate_all('es=>es.filter(e=>getComputedStyle(e).display!=="none").length')<=1,'approved single supporting plane')
    test(page.locator('.pv-context-card textarea,.pv-context-card input').count()==0,'no personal hero overview')
    prefix_path='/' if en else '/zh/'
    test(page.locator('.hero-actions a').evaluate_all('es=>es.map(e=>e.getAttribute("href"))')==[prefix_path+'download.html',prefix_path+'demo.html'],'real site actions retained')
    if motion:
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate("scrollTo({top:0,behavior:'instant'})")
        page.wait_for_function("Number(document.querySelector('[data-product-hero]').dataset.progress)===0")
        art=page.locator('[data-scroll-art]').first
        before=art.evaluate('e=>getComputedStyle(e).transform')
        y=page.evaluate("()=>{const y=document.querySelector('[data-product-hero]').offsetHeight*.3;scrollTo({top:y,behavior:'instant'});return y;}")
        page.wait_for_function("Number(document.querySelector('[data-product-hero]').dataset.progress)>.1")
        test(abs(page.evaluate('scrollY')-y)<2,'native scroll not intercepted')
        test(art.evaluate('e=>getComputedStyle(e).transform')!=before,'existing optical motion retained')
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.documentElement.dataset.motion==='off'")
        test(page.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'"),'reduced motion honored')


def verify_presentation(page,check,label='home',motion=False):
    def test(ok,name):check(ok,label+': presentation '+name)
    page.wait_for_selector('body.hp-ready')
    test(page.locator('[data-home-presentation]').count()==1,'one homepage presentation')
    core=page.locator('[data-home-presentation]')
    test(core.locator('input,textarea,select,button,[contenteditable],[role=button],[role=switch],[role=tab]').count()==0,'no editing, permission or choice widgets')
    test(core.locator('details,summary,[data-card-detail],[data-context-text]').count()==0,'no hidden personal-details or modal subtrees')
    test(core.locator('[data-context-card]').count()==4,'four safe Context directories')
    test(page.locator('.pc-instruction,.pc-disclosure,.pc-prompt-caption,.pc-suggestion-wrap,.pf-mobile-views').count()==0,'trial guidance and manual stage selectors absent')
    test(page.locator('.hp-input-text').count()==3,'original archive expressions remain text')
    test(page.locator('[data-story-original] .ad-story-entry').count()==4,'all four complete original expressions retained')
    test(page.locator('[data-story-organized] p').count()==4,'organized view does not invent new statements')
    test(page.locator('.pc-prompt-row').count()==3,'three saved phrases visible as product content')
    test(page.locator('.ad-morph-button').evaluate('e=>e.tagName')=='SPAN','floating silhouette is not a dead button')
    test(page.locator('.pc-context-card').evaluate_all('es=>es.every(e=>!e.querySelector("input,textarea,[data-context-text]"))'),'Context first surface is metadata only')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal overflow')
    test(page.locator('script[src]').evaluate_all(r'es=>es.every(e=>!/(home-core-v2|home-art|scroll-story|refinement)\.js/.test(e.src))'),'no interactive product controllers requested')
    if not motion:return
    page.emulate_media(reduced_motion='no-preference')
    width=page.viewport_size['width']
    if width>640:
        anchors=[];frames=[]
        for name,states in [('thought',['cards','open','organize']),('prompt',['orb','capsule','board'])]:
            for pixels,state in zip((0,110,320),states):
                page.evaluate('''([name,pixels])=>{const t=document.querySelector('[data-scroll-story="'+name+'"]');scrollTo({top:t.getBoundingClientRect().top+scrollY-105+pixels,behavior:'instant'});}''',[name,pixels])
                page.wait_for_function('''([name,state])=>document.querySelector('[data-scroll-story="'+name+'"]').dataset.phase===state''',arg=[name,state])
                page.wait_for_timeout(650)
                test(page.locator('[data-scroll-story="'+name+'"]').get_attribute('data-phase')==state,'native scroll reveals '+name+'/'+state)
                if name=='thought' and state!='cards':frames.append(page.locator('[data-story-document]').bounding_box())
                if name=='prompt':
                    icon=page.locator(('.pc-orb-button' if state=='board' else '.ad-morph-button')+' .paia-orb')
                    a=icon.bounding_box();h=page.locator('[data-ad-host]').bounding_box();anchors.append((a['x']+a['width']/2-h['x'],a['y']+a['height']/2-h['y']))
        test(all(abs(frames[0][k]-frames[1][k])<1 for k in ('x','width','height')),'original and organized retain one exact frame')
        test(all(abs(a[k]-anchors[0][k])<1 for a in anchors for k in (0,1)),'orb center anchored through all forms')
    else:
        # On phones all rectangular topics are already visible in normal flow;
        # scroll—not tabs—changes the following single reading rectangle.
        for y_ratio,state in [(.65,'open'),(.12,'organize')]:
            page.evaluate('(ratio)=>{const e=document.querySelector(".ad-thought-scenes");scrollTo({top:e.getBoundingClientRect().top+scrollY-innerHeight*ratio,behavior:"instant"});}',y_ratio)
            page.wait_for_function('(state)=>document.querySelector("[data-scroll-story=thought]").dataset.phase===state',arg=state)
            test(page.locator('.ad-thought-scenes').is_visible(),'phone reveals '+state+' without a click')
        for ratio,state in [(.72,'orb'),(.42,'capsule'),(.12,'board')]:
            page.evaluate('(ratio)=>{const e=document.querySelector("[data-ad-host]");scrollTo({top:e.getBoundingClientRect().top+scrollY-innerHeight*ratio,behavior:"instant"});}',ratio)
            page.wait_for_function('(state)=>document.querySelector("[data-scroll-story=prompt]").dataset.phase===state',arg=state)
            test(page.locator('[data-scroll-story=prompt]').get_attribute('data-phase')==state,'phone companion '+state+' from native scrolling')
    # Reach finished result; scroll never mutates real inputs or permissions.
    test(page.locator('.pc-palette').is_visible(),'board outcome visible without activation')
    page.wait_for_function("getComputedStyle(document.querySelector('.hp-composer-phrase')).opacity==='1'")
    test(page.locator('.hp-composer-phrase').evaluate('e=>getComputedStyle(e).opacity')=='1','saved phrase appears in non-editable composer')
    box=page.locator('.pc-palette').bounding_box();composer=page.locator('.pc-composer').bounding_box();bar=page.locator('.pc-window-bar').bounding_box()
    test(box['width']<=336.1,'board respects narrow design')
    test(box['y']+box['height']<=composer['y']-10,'board avoids the input area')
    test(box['y']>=bar['y']+bar['height'],'board avoids host header')
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_selector('body.hp-static')
    test(page.locator('[data-story-organized]').is_visible(),'reduced-motion viewer receives the complete outcome')
    test(page.locator('[data-topic-overview]').is_visible(),'reduced-motion viewer still sees the topic cards')
    test(page.locator('.ad-scroll-sticky').first.evaluate('e=>getComputedStyle(e).position')!='sticky','no static/reduced scroll gate')
    zoom=page.add_style_tag(content='html{font-size:200%!important}')
    page.wait_for_timeout(120)
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'200% text reflows')
    zoom.evaluate('e=>e.remove()')
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')


def main():
    from playwright.sync_api import sync_playwright
    from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
    from threading import Thread
    from functools import partial
    results=[];server=None
    def check(ok,name):
        results.append({'check':name,'pass':bool(ok)})
        if not ok:raise AssertionError(name)
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*a):pass
    try:
        verify_static_presentation(ROOT,check)
        if '--static-only' not in sys.argv:
            server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start()
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
                for locale,path in [('zh','/zh/'),('en','/')]:
                    for width in (1440,1024,768,390,320):
                        page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='no-preference')
                        errors=[];requests=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.on('request',lambda r:requests.append(r.url) if r.method!='GET' or r.resource_type in ('fetch','xhr','websocket') else None)
                        page.goto('http://127.0.0.1:'+str(server.server_port)+path,wait_until='networkidle');page.evaluate('document.fonts.ready')
                        verify_presentation(page,check,locale+'/'+str(width),motion=True)
                        check(not errors,locale+'/'+str(width)+': no script errors')
                        check(not requests,locale+'/'+str(width)+': no calls or submissions')
                        page.close()
                    context=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
                    page=context.new_page();page.goto('http://127.0.0.1:'+str(server.server_port)+path,wait_until='load')
                    check(page.locator('[data-story-organized]').is_visible(),locale+': no-JS complete reading')
                    check(page.locator('.pc-palette').is_visible(),locale+': no-JS complete prompt illustration')
                    check(page.locator('[data-home-presentation] input,[data-home-presentation] button').count()==0,locale+': no-JS has no broken trial controls')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),locale+': no-JS mobile reflow')
                    context.close()
                browser.close()
    except Exception as e:
        import traceback
        results.append({'check':'execution','pass':False,'error':str(e),'traceback':traceback.format_exc()})
    finally:
        if server:server.shutdown()
        out=Path(os.environ.get('WEBSITE_ART_OUTPUT',ROOT/'website-presentation-artifacts'));out.mkdir(parents=True,exist_ok=True)
        report={'scope':'homepage natural-scroll presentation; isolated demo tested by original core suite','checks':len(results),'passed':sum(r['pass'] for r in results),'failed':[r for r in results if not r['pass']],'results':results}
        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False))
    return 1 if report['failed'] else 0
if __name__=='__main__':raise SystemExit(main())
