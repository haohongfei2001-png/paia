"""Finishing regressions. All form responses are intercepted synthetic responses.

Default: actual local HTTP. --offline-render uses exact source DOM when a managed
browser disallows loopback navigation; this is not deployment certification.
No real FormSubmit request is ever sent; no private data or state is used.
"""
from pathlib import Path
from io import BytesIO
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import os, sys, json, re, base64, mimetypes, traceback
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('WEBSITE_REFINEMENT_OUTPUT', ROOT/'website-refinement-artifacts'))
OFFLINE = '--offline-render' in sys.argv
results = []

def check(ok, label):
    results.append({'check':label,'pass':bool(ok)})
    if not ok: raise AssertionError(label)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def inline_source(name):
    html=(ROOT/name).read_text();scripts=[]
    def script(m):
        scripts.append((ROOT/m[1].split('?')[0].lstrip('/')).read_text());return ''
    html=re.sub(r'<script src="([^"]+)"[^>]*></script>',script,html)
    def data_url(path):
        p=ROOT/path.lstrip('/')
        mime=mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
        return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
    def style(m):
        css=(ROOT/m[1].split('?')[0].lstrip('/')).read_text()
        css=re.sub(r'url\([\'"]?(/[^\'"\)]+)[\'"]?\)',lambda m:'url("'+data_url(m[1])+'")',css)
        return '<style>'+css+'</style>'
    html=re.sub(r'<link rel="stylesheet" href="([^"]+)"[^>]*>',style,html)
    html=re.sub(r'((?:src|href)=")(/assets/website/[^"?]+)"',lambda m:m[1]+data_url(m[2])+'"',html)
    if name.endswith(('index.html','how-it-works.html','contact.html')):
        css=data_url('/assets/website/refinement.css')
        html=html.replace('</head>','<link data-paia-refinement rel="stylesheet" href="'+css+'"></head>')
        scripts.append((ROOT/'assets/website/refinement.js').read_text())
    html=html.replace('</body>',''.join('<script>'+s.replace('</script','<\\/script')+'</script>' for s in scripts)+'</body>')
    return html

server=None
try:
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
        def load(page,name):
            if OFFLINE: page.set_content(inline_source(name),wait_until='load')
            else: page.goto(origin+'/'+name,wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            page.wait_for_selector('body.pf-ready',timeout=5000)
        for locale,prefix in [('zh','zh/'),('en','')]:
            for width in [1440,768,390,320]:
                page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='reduce')
                errors=[];requests=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('request',lambda r:requests.append(r.url) if r.method!='GET' or r.resource_type in ('fetch','xhr','websocket') else None)
                load(page,prefix+'index.html')
                def test(ok,label):check(ok,f'{locale}/{width}: '+label)
                test(page.locator('.pc-suggestion-wrap').count()==1,'one suggestion implementation')
                test(page.locator('.ad-host .pc-suggestion-wrap').count()==1,'suggestion belongs to the host conversation')
                test(page.locator('#pc-composer').evaluate('e=>getComputedStyle(e).resize')=='none','composer has no native resize handle')
                test(not page.locator('.pc-prompt-caption').is_visible(),'removed caption remains absent')
                composer=page.locator('#pc-composer');composer.fill('BeforeAfter')
                composer.evaluate("e=>{e.setSelectionRange(6,6);e.dispatchEvent(new Event('select',{bubbles:true}));}")
                phrase=page.locator('#pc-prompt-0').input_value()
                page.locator('[data-prompt-pick="0"]').click()
                if page.locator('.ad-check').is_visible():page.locator('.ad-check-actions button').last.click()
                test(composer.input_value()=='Before\n\n'+phrase+'\n\nAfter','original controller still preserves the complete draft and caret')
                test(page.locator('.pf-picked').count()==1,'only an acknowledged insert marks a row')
                test(page.locator('.pf-inserted').count()==1,'input is visibly acknowledged, no extra writer')
                page.wait_for_timeout(950)
                test(page.locator('.pf-picked').count()==0,'feedback clears without permanent highlight')
                page.locator('[data-suggestion-toggle]').click()
                test(page.locator('[data-suggestion]').is_visible(),'existing optional suggestion remains accessible')
                test(composer.input_value().startswith('Before\n\n'),'opening a suggestion does not write or send')
                if width<=640:
                    test(not page.locator('.pf-mobile-details').evaluate('e=>e.open'),'mobile operations start folded')
                    page.locator('.pf-mobile-details>summary').click()
                    test(page.locator('.pc-prompt-mechanics').is_visible(),'mobile operation detail is reachable')
                    for mode in ['open','organize','cards']:
                        page.locator(f'.pf-mobile-views button[data-view="{mode}"]').click()
                        test(page.locator('.pf-mobile-views button[aria-pressed=true]').count()==1,mode+': one selected view')
                        if mode!='cards':
                            test(page.locator('.ad-thought-scenes').is_visible(),mode+': mobile scene visible by choice')
                            test(page.locator('.ad-thought-scenes').get_attribute('aria-hidden')=='false',mode+': preview accessible to assistive technology')
                            test(page.locator('[data-topic-overview]').evaluate('e=>e.inert'),mode+': hidden links do not capture focus')
                        else:test(page.locator('[data-topic-overview]').is_visible(),'return to topics keeps real links usable')
                else:
                    test(not page.locator('.pf-mobile-views').is_visible(),'desktop gets no new state selector')
                    test(page.locator('.pc-prompt-mechanics').is_visible(),'desktop explanatory composition preserved')
                test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'normal-size viewport does not overflow')
                page.add_style_tag(content='html{font-size:200%!important}')
                test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'200% text reflows without page overflow')
                test(not requests,'no runtime requests on product examples')
                test(not errors,'no script errors')
                page.close()
            page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
            load(page,prefix+'how-it-works.html')
            anchor=page.locator('.pf-how-toggle').evaluate('e=>[e.offsetLeft,e.offsetTop]')
            for mode in ['orb','capsule','board']:
                page.locator('.pf-how-toggle').click()
                check(page.locator('.nr-scene-prompt').get_attribute('data-preview-mode')==mode,locale+': interior '+mode)
                check(page.locator('.pf-how-toggle').evaluate('e=>[e.offsetLeft,e.offsetTop]')==anchor,locale+': interior anchor unchanged')
            page.set_viewport_size({'width':390,'height':844})
            check(not page.locator('.pf-how-reader').evaluate('e=>e.open'),locale+': secondary mobile reader is folded')
            page.locator('.nr-section-links a').first.click()
            check(page.locator('.pf-how-reader').evaluate('e=>e.open'),locale+': chapter link opens the same reader')
            page.close()

            # Deterministic service mocks cover async behavior without a real
            # submission. The default HTTP run intercepts the actual fetch URL.
            for outcome in ['success','false','non-json','server-error','network-error','activation']:
                page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
                load(page,prefix+'contact.html')
                page.evaluate("""()=>{
                    window.pfRequests=[];
                    window.fetch=(url,options)=>new Promise((resolve,reject)=>{
                        window.pfRequests.push({url,method:options.method,headers:options.headers,credentials:options.credentials,referrerPolicy:options.referrerPolicy,payload:JSON.parse(options.body)});
                        window.pfResolve=(body,status=200)=>resolve(new Response(body,{status,headers:{'Content-Type':'application/json'}}));
                        window.pfReject=()=>reject(new TypeError('Synthetic transport error'));
                        options.signal.addEventListener('abort',()=>reject(new DOMException('Synthetic timeout','AbortError')),{once:true});
                    });
                }""")
                form=page.locator('form.beta-form');submit=form.locator('button[type=submit]')
                submit.click();check(page.evaluate('pfRequests.length')==0,locale+': invalid form never transmits')
                page.locator('#beta-email').fill('synthetic@example.test')
                page.locator('#beta-goal').fill('A synthetic application, not user data.')
                submit.click();check(page.evaluate('pfRequests.length')==0,locale+': unchecked consent never transmits')
                page.locator('[name=contact_consent]').check()
                submit.click();page.evaluate("document.querySelector('form.beta-form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))")
                check(page.evaluate('pfRequests.length')==1,locale+'/'+outcome+': concurrent submission is blocked')
                check(form.get_attribute('data-submission')=='pending',locale+'/'+outcome+': waiting is explicit')
                check(page.locator('#beta-email').get_attribute('readonly') is not None,locale+'/'+outcome+': in-flight snapshot cannot drift through editing')
                request=page.evaluate('pfRequests[0]')
                check(request['url']=='https://formsubmit.co/ajax/haohongfei2001@gmail.com',locale+': same consented service and recipient')
                check(request['credentials']=='omit' and request['referrerPolicy']=='no-referrer',locale+': no cookies or referring URL added')
                check(set(request['payload'])=={'email','frequency','goal','contact_consent','language','_subject','_template','_captcha','_honey'},locale+': only declared form fields')
                check(request['payload']['contact_consent']=='yes',locale+': affirmative consent in snapshot')
                if outcome=='network-error':page.evaluate('pfReject()')
                elif outcome=='success':page.evaluate('pfResolve(JSON.stringify({success:"true"}))')
                elif outcome=='false':page.evaluate('pfResolve(JSON.stringify({success:false}))')
                elif outcome=='non-json':page.evaluate('pfResolve("<html>not a confirmation</html>")')
                elif outcome=='server-error':page.evaluate('pfResolve("{}",503)')
                elif outcome=='activation':page.evaluate('pfResolve(JSON.stringify({success:true,message:"Please activate your email"}))')
                expected='received' if outcome=='success' else 'unconfirmed'
                page.wait_for_function('(v)=>document.querySelector("form.beta-form").dataset.submission===v',arg=expected)
                check(form.get_attribute('data-submission')==expected,locale+'/'+outcome+': outcome is not invented')
                check(page.locator('#beta-goal').input_value()=='A synthetic application, not user data.',locale+'/'+outcome+': text remains on this page')
                check(page.evaluate('pfRequests.length')==1,locale+'/'+outcome+': no automatic retry or second native POST')
                if outcome=='success':
                    check(submit.is_disabled(),locale+': acknowledged request cannot be resubmitted accidentally')
                    check(('不等于邮件已送达' if locale=='zh' else 'does not guarantee inbox delivery') in page.locator('.pf-form-result').inner_text(),locale+': service receipt does not invent actual inbox delivery')
                else:
                    check(not submit.is_disabled(),locale+': explicit retry remains available')
                    check(page.locator('#beta-email').get_attribute('readonly') is None,locale+': failure restores editable fields')
                page.close()
        browser.close()
except Exception as error:
    results.append({'check':'execution','pass':False,'error':str(error),'traceback':traceback.format_exc()})
finally:
    if server:server.shutdown()
    OUT.mkdir(parents=True,exist_ok=True)
    report={'transport':'exact-source offline DOM' if OFFLINE else 'local HTTP','form_transport':'deterministic intercepted service responses; no real submission','checks':len(results),'failures':[v for v in results if not v['pass']],'results':results}
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False))
    if report['failures']:raise SystemExit(1)
