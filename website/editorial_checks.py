"""Owner-approved editorial finish: protect Context directories and true actions.

Pure DOM checks join the existing typography/browser journeys. The optional
standalone run uses the same bytes in a local HTTP browser; --offline-render
records an exact-source, inline-assets fallback, never live-site certification.
"""
from pathlib import Path
import hashlib, json, os, sys, re

ROOT = Path(__file__).resolve().parents[1]

def verify_editorial(page, check, label='site'):
    def test(ok, what): check(ok, label + ': editorial ' + what)
    test(page.locator('body.ed-ready').count() == 1, 'progressive presentation initialized once')
    links = page.locator('.mobile-menu nav a').evaluate_all('es=>es.map(e=>e.getAttribute("href"))')
    test(len(links) == len(set(links)), 'mobile destinations are unique')
    test(page.locator('.header-actions>.ed-mobile-primary').count() == 1, 'one phone-appropriate demo entry')
    demo = page.locator('.header-actions>.ed-mobile-primary')
    zh = page.locator('html').get_attribute('lang').startswith('zh')
    prefix = '/zh/' if zh else '/'
    test(demo.get_attribute('href') == prefix + 'demo.html', 'mobile action leads to the real example route')
    route = page.locator('body').get_attribute('data-page')
    narrow = page.evaluate("matchMedia('(max-width:640px)').matches")
    if narrow:
        test(demo.is_visible(), 'phone action is visible without pretending to install')
    else:
        test(not demo.is_visible(), 'desktop keeps its existing Get action')
    if route in ('help.html', 'status.html', 'contact.html'):
        expected = ('联系 PAIA' if zh else 'Contact PAIA') if route == 'contact.html' else ('帮助中心' if zh else 'Help')
        test(page.locator('main h1').inner_text() == expected, 'utility heading names the task')
        test(page.locator('main h1').evaluate('e=>parseFloat(getComputedStyle(e).fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize)') <= 3.01, 'utility title is not a marketing billboard')
    if route == 'how-it-works.html':
        test(page.locator('.ed-start').count() == 1, 'one short first-use guide')
        test(page.locator('.ed-start li').count() == 3, 'install, consented capture, source verification')
        test(page.locator('.ed-start a').evaluate_all('es=>es.map(e=>e.getAttribute("href"))') == [prefix+'download.html', '#capture', '#archive'], 'guide links use existing entry and section owners')
    if route in ('index.html', 'demo.html'):
        # Never inspect private values to generate a card preview. Only assert
        # that the existing overview remains the four-directory UI.
        test(page.locator('[data-context-card]').count() == 4, 'four Context directories retained')
        test(page.locator('[data-context-overview] textarea,[data-context-overview] input').count() == 0, 'no personal field in the directory')
        test(page.locator('[data-context-overview] [data-context-text]').count() == 0, 'editable personal bodies belong only to explicit details')
        test(page.locator('[data-context-overview] [data-thought-text],[data-context-overview] .ad-story-entry').count() == 0, 'no topic contents are repurposed as Context cards')
    if route == 'index.html':
        test(page.locator('.ed-desktop-link').count() == 1, 'single explicit copy-link handoff')
        test(page.locator('.hero-actions a').evaluate_all('es=>es.map(e=>e.getAttribute("href"))') == [prefix+'download.html',prefix+'demo.html'], 'original desktop hero destinations stay exact')
        test(page.locator('.pv-context-card textarea,.pv-context-card input').count() == 0, 'hero Context preview is directory-only too')
        if zh:
            test(abs(page.locator('#hero-title').evaluate('e=>parseFloat(getComputedStyle(e).letterSpacing)/parseFloat(getComputedStyle(e).fontSize)') + .028)<.001, 'Chinese tracking is optically distinct from Latin')
        if narrow:
            test(page.locator('.hero-secondary').is_visible() and page.locator('.ed-desktop-link').is_visible(), 'phone can try now or copy for later')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'no horizontal page overflow')


def verify_static_editorial(root, check):
    script = (root/'assets/website/site.js').read_text().split('/* EDITORIAL_FINISH_20261013:',1)[1]
    script = re.sub(r'/\*.*?\*/', '', script, flags=re.S)
    script = re.sub(r'^\s*//.*$', '', script, flags=re.M)
    # No new storage, provider, navigation or original-input writer.
    for word in ['localStorage','sessionStorage','fetch(', 'XMLHttpRequest','WebSocket','sendBeacon','location.href', 'data-context-text','data-thought-text']:
        check(word not in script, 'editorial does not add ' + word)
    check('navigator.clipboard.writeText(url)' in script, 'link copying stays behind explicit activation')
    sheet = (root/'assets/website/launch.css').read_text().split('/* EDITORIAL_FINISH_20261013',1)[1]
    check('@font-face' not in sheet and 'url(' not in sheet, 'no additional font/image/download dependency')
    check('data-scroll-story' not in sheet and 'pc-palette-wrap' not in sheet, 'scroll thresholds and companion anchor are not restyled')


if __name__ == '__main__':
    from playwright.sync_api import sync_playwright
    from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
    from functools import partial
    from threading import Thread

    import base64, mimetypes, traceback
    offline = '--offline-render' in sys.argv
    out = Path(os.environ.get('WEBSITE_EDITORIAL_OUTPUT',ROOT/'website-editorial-artifacts'))
    results = []
    def check(ok, name):
        results.append({'check':name,'pass':bool(ok)})
        if not ok: raise AssertionError(name)
    def inline_source(name):
        html=(ROOT/name).read_text();scripts=[]
        def uri(v):
            f=ROOT/v.lstrip('/').split('?')[0]
            return 'data:'+(mimetypes.guess_type(f.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(f.read_bytes()).decode()
        def style(m):
            css=(ROOT/m[1].split('?')[0].lstrip('/')).read_text()
            return '<style>'+re.sub(r'url\([\'"]?(/[^\'"\)]+)[\'"]?\)',lambda m:'url("'+uri(m[1])+'")',css)+'</style>'
        html=re.sub(r'<link rel="stylesheet" href="([^"]+)"[^>]*>',style,html)
        def script(m): scripts.append((ROOT/m[1].split('?')[0].lstrip('/')).read_text()); return ''
        html=re.sub(r'<script src="([^"]+)"[^>]*></script>',script,html)
        html=re.sub(r'((?:src|href)=")(/assets/website/[^"?]+)"',lambda m:m[1]+uri(m[2])+'"',html)
        if name.endswith(('index.html','how-it-works.html','contact.html')):
            html=html.replace('</head>','<link data-paia-refinement rel="stylesheet" href="'+uri('/assets/website/refinement.css')+'"></head>')
            scripts.append((ROOT/'assets/website/refinement.js').read_text())
        return html.replace('</body>',''.join('<script>'+s.replace('</script','<\\/script')+'</script>' for s in scripts)+'</body>')
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*a): pass
    server=None
    try:
        verify_static_editorial(ROOT,check)
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
        Thread(target=server.serve_forever,daemon=True).start()
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
            for zh,prefix in [(True,'zh/'),(False,'')]:
                for width in (1440,768,390,320):
                    page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='reduce')
                    errors=[];bad_requests=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    page.on('request',lambda r:bad_requests.append(r.url) if r.method!='GET' or r.resource_type in ('fetch','xhr','websocket') else None)
                    for name in ('index.html','help.html','contact.html','how-it-works.html','blog.html','about.html','article-context.html','article-beliefs.html','article-reuse.html','download.html'):
                        if offline: page.set_content(inline_source(prefix+name),wait_until='load')
                        else: page.goto(f'http://127.0.0.1:{server.server_port}/'+prefix+name,wait_until='networkidle')
                        page.evaluate('document.fonts.ready')
                        label=f'{prefix}{name}/{width}'
                        verify_editorial(page,check,label)
                        if name=='index.html':
                            # Explicit detail edits must not leak on returning
                            # to the overview, regardless of viewport.
                            page.locator('[data-card-open="info"]').click()
                            field=page.locator('[data-context-text="info"]');field.fill('SYNTHETIC_PRIVATE_BODY_DO_NOT_PREVIEW')
                            page.locator('[data-card-detail="info"] [data-context-back]').click()
                            overview=page.locator('[data-context-overview]')
                            check('SYNTHETIC_PRIVATE_BODY_DO_NOT_PREVIEW' not in overview.inner_text(),label+': edited body remains private on return')
                            check(not field.is_visible(),label+': detail is closed, not rendered in overview')
                            if width<=640:
                                page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async u=>{window.edCopied=u}}})")
                                page.locator('.ed-desktop-link').click()
                                check(page.evaluate('edCopied')=='https://inputarchive.com/'+prefix+'download.html',label+': explicit copy contains only canonical public link')
                                check(page.locator('.ed-copy-feedback').is_visible(),label+': successful copy has feedback')
                                page.evaluate("()=>{navigator.clipboard.writeText=()=>Promise.reject(new Error('synthetic denial'));}")
                                page.locator('.ed-desktop-link').click()
                                fallback=page.locator('.ed-copy-feedback input')
                                check(fallback.is_visible() and fallback.input_value()=='https://inputarchive.com/'+prefix+'download.html',label+': denied clipboard gives a readable manual fallback')
                                check('SYNTHETIC_PRIVATE' not in fallback.input_value(),label+': handoff never contains a user draft')
                        if name=='download.html':
                            check(page.locator('.release-install').is_disabled(),label+': no invented store installation')
                        if name=='help.html':
                            box=page.locator('.release-help-content').bounding_box()
                            check(box['y']<560,label+': actual questions arrive within the opening viewport')
                        page.add_style_tag(content='html{font-size:200%!important}')
                        page.wait_for_timeout(100)
                        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),label+': 200% text reflows without hiding content')
                    check(not errors,f'{prefix}/{width}: no script errors')
                    check(not bad_requests,f'{prefix}/{width}: no actual service or submission calls')
                    page.close()
            browser.close()
    except Exception as e:
        results.append({'check':'execution','pass':False,'error':str(e),'traceback':traceback.format_exc()})
    finally:
        if server:server.shutdown()
        out.mkdir(parents=True,exist_ok=True)
        report={'scope':'synthetic inlined exact-source DOM' if offline else 'synthetic local HTTP','checks':len(results),'failed':[x for x in results if not x['pass']],'results':results}
        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False))
        if report['failed']:raise SystemExit(1)
