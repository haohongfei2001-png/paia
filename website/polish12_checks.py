"""V12 keeps V11 data/permission/IME tests and adds journey/typography checks.
All tests use fictional inputs. No transport, installer, consent or live AI action.
"""
from pathlib import Path
from html.parser import HTMLParser
import json,re,hashlib
from polish12 import undecorate

class Plain(HTMLParser):
    def __init__(self,s):super().__init__();self.parts=[];self.feed(s)
    def handle_data(self,d):self.parts.append(d)
    def value(self):return ''.join(self.parts)

def static(root,check):
    lock=json.loads((root/'website/atelier/preserved-v12.json').read_text())
    for path,digest in lock['files'].items():
        data=(root/path).read_bytes()
        if path.endswith('.html'):data=undecorate(data.decode()).encode()
        check(hashlib.sha256(data).hexdigest()==digest,'V12 preserved exact owner/copy: '+path)
    for lang,prefix in [('zh','zh/'),('en','')]:
        home=(root/(prefix+'index.html')).read_text();demo=(root/(prefix+'demo.html')).read_text()
        check('data-atelier-version="12"' in home and 'data-atelier-demo="12"' in demo,prefix+': exact current homepage and example')
        check('p12-definition' in home and 'ChatGPT' in home,prefix+': precise product definition present')
        check(home.count('class="p10-thought-line ')==3 and home.count('p11-chapter-label')==3,prefix+': three continuous expressions and chapters')
        check(home.count('class="context-card ')==4 and demo.count('class="context-card ')==4,prefix+': approved quartet retained')
        check(home.count('paia-logo-v1.webp')==1,prefix+': original closing artwork once')
        check('presentation11.js' in home and 'presentation10.js' not in home,prefix+': existing subject-aware motion owner retained')
        check(not any(x in home+demo for x in ['data-open-source','data-view-source','data-topic-search','data-reading-style','查看来源','pc-topic-source']),prefix+': no retired source/search/mode controls')
        check('id="ax-query"' in demo and demo.count('data-example-query=')==2,prefix+': real archive search with two explicit starter queries')
        check(all('id="'+x+'"' in demo for x in ['input-library','thought-library','prompt-reuse','personal-context']),prefix+': existing deep links remain')
        check(f'demo12.{lang}.js' in demo and f'demo11.{lang}.js' not in demo,prefix+': one current example controller')
        for name in [f'demo12.{lang}.js',f'context12.{lang}.js']:
            source=(root/'assets/website/atelier'/name).read_text()
            check(not re.search(r'\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(',source),name+': no transport')
            check(not re.search(r'\b(localStorage|sessionStorage)\b',source),name+': no persistence')
        d=(root/(prefix+'download.html')).read_text()
        check('p12-try-primary' in d and 'id="install-availability"' in d,prefix+': honest actionable demo-first entry')
        check('name="contact_consent"' in (root/(prefix+'contact.html')).read_text(),prefix+': explicit contact consent retained')
    approved=root/'extension/docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18'
    for f in ['component.js','fusion.js']:
        check((approved/f).read_bytes()==(root/'assets/website/atelier'/('r3-'+f)).read_bytes(),'V12 approved R3 '+f+' exact')

def home(page,check,label,deep=False,out=None):
    from refinement11_checks import home as previous
    previous(page,check,label,deep,out)
    check(page.locator('.p12-definition').is_visible(),label+': product definition visible without interaction')
    text=page.locator('.p10-thought-line .p10-phrase').all_text_contents()
    zh=page.locator('html').get_attribute('lang').startswith('zh')
    check(('试了两次' in text[1] and '暂时不急' in text[2]) if zh else ('two attempts' in text[1] and 'not need conclusions yet' in text[2]),label+': concrete evolution retains uncertainty')
    check(page.locator('.context-card-bottom').evaluate_all('es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=10)'),label+': functional access status at least 10px')
    check(page.locator('.context-example button').evaluate_all('es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=12 && e.getBoundingClientRect().height>=43)'),label+': readable directory with comfortable targets')
    check(page.locator('.p10-found-note').evaluate('e=>e.getBoundingClientRect().width>=innerWidth*.40 || innerWidth<641'),label+': recalled expression is the visual focal point')

def demo(page,check,label,deep=False,out=None):
    from refinement11_checks import demo as previous
    zh=page.locator('html').get_attribute('lang').startswith('zh')
    expected='我想每周，写一篇完整的长文。' if zh else 'I want to write one complete essay every week.'
    previous(page,check,label,deep,out,expected_writing=expected)
    page.evaluate("scrollTo({top:0,behavior:'instant'})")
    if page.viewport_size['height']>=850:
        check(page.locator('#ax-query').evaluate('e=>e.getBoundingClientRect().top<650'),label+': real search is in the first viewport')
    check(page.locator('[data-example-query]').count()==2,label+': two optional query suggestions')
    if deep:
        page.locator('[data-example-query]').first.click()
        check(page.locator('#ax-query').input_value()==('第一步' if zh else 'first step'),label+': suggestion runs the explicit exact query')
        check(page.locator('#ax-reading').inner_text()=='' and page.locator('#archive-empty').is_visible(),label+': a suggested query does not select a record')
        check(page.locator('#ax-results [data-archive-target]').count()>0,label+': query returns actual fixture matches')
        page.locator('#ax-clear').click()
        page.locator('#ax-query').dispatch_event('compositionstart',{'data':'未完成'})
        page.locator('[data-example-query]').first.click()
        check(page.locator('#ax-query').input_value()=='',label+': suggestion respects unfinished IME input')
        page.locator('#ax-query').dispatch_event('compositionend',{'data':''})

def support(page,check,label):
    route=page.locator('body').get_attribute('data-page')
    check(page.locator('body').get_attribute('data-site-polish')=='12',label+': shared brand chrome')
    check(page.locator('.header-inner').evaluate('e=>parseFloat(getComputedStyle(e).borderRadius)>=30'),label+': consistent navigation silhouette')
    check(page.locator('h1').is_visible(),label+': clear heading')
    if route in ('download.html','beta.html'):
        cta=page.locator('.p12-try-primary')
        check(cta.is_visible() and cta.get_attribute('href').endswith('/demo.html'),label+': primary action actually opens the available example')
        check(page.locator('.release-install').is_disabled(),label+': no false installation claim')
        check(page.locator('.p12-experience-link').count()==3,label+': three direct matching product destinations')
    if route in ('help.html','status.html'):
        check(page.locator('details.nr-details').count()>=12,label+': complete help retained')
        first=page.locator('details.nr-details').first;first.locator('summary').click()
        check(first.get_attribute('open') is not None,label+': accessible help accordion works')
    if route=='contact.html':
        form=page.locator('form');check(form.get_attribute('action')=='https://formsubmit.co/haohongfei2001@gmail.com',label+': same contact destination')
        check(not page.locator('[name=contact_consent]').is_checked(),label+': no preselected consent')
        check(not form.evaluate('e=>e.checkValidity()'),label+': incomplete form cannot submit')
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),label+': no horizontal overflow')
