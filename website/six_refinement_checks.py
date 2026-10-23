"""Check only the six refinements explicitly approved after the rollback.

Historical freezes still run after reversing the listed homepage edits. Original
cases, main title, identity, closing and independent Demo remain exact. Revised
mobile tests assert real visibility instead of the defective old top thresholds.
"""
from pathlib import Path
from functools import lru_cache
import hashlib,json,re

@lru_cache(maxsize=1)
def scope():return json.loads(Path(__file__).with_name('six_refinement_scope.json').read_text())

def restore_for_prior_checks(name,data):
    record=scope()['edits'].get(name)
    if not record:return data
    lines=data.decode().splitlines(keepends=True)
    for edit in reversed(record['changes']):
        if lines[edit['start']:edit['end']]!=edit['after']:
            raise AssertionError('Unexpected changes beyond six-refinement scope: '+name)
        lines[edit['start']:edit['end']]=edit['before']
    return ''.join(lines).encode()

def verify_static(root,check):
    from art_direction import Fragments
    from launch_checks import find,Text
    data=scope()
    for name,sha in data['generated'].items():
        check(hashlib.sha256(restore_for_prior_checks(name,(root/name).read_bytes())).hexdigest()==sha,name+': original generated output after exactly reversing approved refinements')
    for name,sha in data['protected'].items():
        check(hashlib.sha256((root/name).read_bytes()).hexdigest()==sha,name+': identity, case, product or independent Demo unchanged')
    for name,record in data['edits'].items():
        check(hashlib.sha256(restore_for_prior_checks(name,(root/name).read_bytes())).hexdigest()==record['before_sha'],name+': only declared six-refinement source changes')
    for lang,path in [('en','index.html'),('zh','zh/index.html')]:
        source=(root/path).read_text();p=Fragments(source);prefix='/zh/' if lang=='zh' else '/'
        check('data-six-refinements="20261023"' in source,lang+': explicit scoped delivery')
        for selector,digest in data['home_fragments'][lang].items():
            nodes=find(p,selector);text=''.join(p.outer(n) for n in nodes)
            check(hashlib.sha256(text.encode()).hexdigest()==digest,lang+': retained exact '+selector)
        routes=[n.attrs.get('href') for n in find(p,'.hp-demo-link')]
        check(routes==[prefix+'demo.html#'+k for k in ('input-library','thought-library','prompt-reuse','personal-context')],lang+': four direct section destinations')
        check(not find(p,'.pc-topic-root-head') and not find(p,'.pc-topic-footer'),lang+': only redundant directory guide layers removed')
        check(len(find(p,'[data-topic-block]'))==3,lang+': all three original topics remain')
        check(len(find(p,'[data-story-original] .ad-story-entry'))==4,lang+': all four originals and sources remain')
        check(('外部 AI 连接尚未开放' if lang=='zh' else 'External AI connections are not available yet') in source,lang+': external connection boundary is next to its illustration')
        check(('同步尚未开放' if lang=='zh' else 'SYNC NOT AVAILABLE YET') in source,lang+': sync mapping is not a released capability claim')
        for token in ('Chrome','Google Drive','Edge','OneDrive','Safari','iCloud'):
            check(token in source,lang+': retained ecosystem illustration '+token)
        check(not re.search(r'<(?:input|textarea|select|button)\b',source.split('<main',1)[1].split('</main>',1)[0]),lang+': homepage remains a presentation, not a new simulator')
    js=(root/'assets/website/home-presentation.js').read_text()
    for token in ('fetch(', 'localStorage','sessionStorage','XMLHttpRequest','WebSocket','sendBeacon','setInterval','preventDefault'):
        check(token not in js,'six refinements: no data or scroll-interception API '+token)
    check('setTimeout' in js and 'clearTimeout' in js,'finite selection feedback has cancellation')

def verify_readability_and_routes(page,check,label='home'):
    test=lambda ok,name:check(ok,label+': scoped refinement '+name)
    zh=page.locator('html').get_attribute('lang').startswith('zh');prefix='/zh/' if zh else '/'
    test(page.locator('.hp-demo-link').evaluate_all('es=>es.map(e=>e.getAttribute("href"))')==[prefix+'demo.html#'+k for k in ('input-library','thought-library','prompt-reuse','personal-context')],'each illustration has the right real-demo destination')
    test(page.locator('.pc-topic-root-head,.pc-topic-footer').count()==0,'duplicate guide labels absent')
    selectors='.pc-record-meta time,.pc-record-meta time>span,.pc-date,.pc-origin-chip,.ad-story-date,.ad-original-cue,.ad-ai-cue,.hp-composer-foot>span:first-child,.ad-story-entry time,.ad-story-provenance,.ad-chapter-source,.ad-document-source,.pc-card-permission,.pc-master-permission,[data-card-count],[data-topic-count]'
    actual=page.locator(selectors).evaluate_all('es=>es.map(e=>({font:parseFloat(getComputedStyle(e).fontSize),color:getComputedStyle(e).color}))')
    test(bool(actual) and all(x['font']>=11 for x in actual),'meaningful source and permission labels are at least 11 CSS px at normal zoom')
    if not page.evaluate("matchMedia('(forced-colors:active)').matches"):
        def lum(values):
            a=[v/255 for v in values];a=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a]
            return .2126*a[0]+.7152*a[1]+.0722*a[2]
        # Conservative light-blue bound for existing white/translucent surfaces;
        # this is a targeted check, not a claim of full-site WCAG certification.
        bg=lum((215,237,255))
        ratios=[]
        for x in actual:
            values=[float(v) for v in re.findall(r'[\d.]+',x['color'])[:3]]
            low,high=sorted((lum(values),bg));ratios.append((high+.05)/(low+.05))
        test(all(v>=4.5 for v in ratios),'source/permission colors meet 4.5:1 against the conservative blue surface')
    test(page.locator('.hp-example-state').inner_text()==('示例：已允许' if zh else 'Example: access allowed'),'pre-granted sample state is explicitly illustrative')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal overflow')

def verify_mobile_visibility(page,check,label='home'):
    test=lambda ok,name:check(ok,label+': mobile visibility '+name)
    def footer(bottom):
        page.locator('.ad-document-source').evaluate("(e,b)=>scrollTo({top:e.getBoundingClientRect().bottom+scrollY-b,behavior:'instant'})",bottom)
    height=page.viewport_size['height']
    footer(height+16);page.wait_for_function("document.querySelector('[data-scroll-story=thought]').dataset.phase==='open'")
    footer(height-32);page.wait_for_timeout(100)
    test(page.locator('[data-scroll-story=thought]').get_attribute('data-phase')=='open','original view remains when source footer first enters the viewport')
    bottom=page.locator('[data-story-original] .ad-story-entry').last.evaluate('e=>e.getBoundingClientRect().bottom')
    test(bottom<=height-24,'last original is visible before organization starts')
    test(page.locator('.ad-document-source').evaluate('(e,h)=>e.getBoundingClientRect().bottom<=h-24',height),'source footer is visible before organization starts')
    footer(height-92);page.wait_for_function("document.querySelector('[data-scroll-story=thought]').dataset.phase==='organize'")
    test(page.locator('[data-story-organized]').is_visible(),'continued scroll reaches organized outcome')
    def anchor(bottom):
        page.locator('.pc-palette-wrap').evaluate("(e,b)=>scrollTo({top:e.getBoundingClientRect().bottom+scrollY-b,behavior:'instant'})",bottom)
    for bottom,state in [(height-48,'orb'),(height-140,'capsule'),(height-224,'board')]:
        anchor(bottom);page.wait_for_function('(state)=>document.querySelector("[data-scroll-story=prompt]").dataset.phase===state',arg=state)
        if state=='orb':
            rect=page.locator('.ad-morph-button .paia-orb').bounding_box()
            top=page.locator('.header-inner').evaluate('e=>e.getBoundingClientRect().bottom')
            test(rect['y']>=top and rect['y']+rect['height']<=height-24,'the entire orb is actually on screen before morphing')
        test(page.locator('[data-scroll-story=prompt]').get_attribute('data-phase')==state,'native scroll reaches '+state)
    # Reverse before the anchor enters, then jump directly to the finished state.
    anchor(height+80);page.wait_for_function("document.querySelector('[data-scroll-story=prompt]').dataset.phase==='orb'")
    anchor(height-240);page.wait_for_function("document.querySelector('[data-scroll-story=prompt]').dataset.phase==='board'")
    page.wait_for_function("document.querySelector('[data-scroll-story=prompt]').dataset.demoStep==='filled'")
    test(page.locator('.pc-palette').is_visible(),'fast scrolling reaches a complete result rather than a hidden stage')

def verify_sequence(page,check,label='home'):
    test=lambda ok,name:check(ok,label+': prompt explanation '+name)
    mobile=page.viewport_size['width']<=640
    def go(finished):
        if mobile:
            h=page.viewport_size['height'];bottom=h-240 if finished else h+80
            page.locator('.pc-palette-wrap').evaluate("(e,b)=>scrollTo({top:e.getBoundingClientRect().bottom+scrollY-b,behavior:'instant'})",bottom)
        else:
            page.locator('[data-scroll-story=prompt]').evaluate("(e,n)=>scrollTo({top:e.getBoundingClientRect().top+scrollY-105+n,behavior:'instant'})",320 if finished else 0)
    go(False);page.wait_for_function("document.querySelector('[data-scroll-story=prompt]').dataset.phase==='orb'")
    page.evaluate("""()=>{window.sixStepLog=[];window.sixObserver?.disconnect();window.sixObserver=new MutationObserver(()=>{const e=document.querySelector('[data-scroll-story=prompt]');const s=e.dataset.demoStep;if(s&&sixStepLog.at(-1)?.state!==s)sixStepLog.push({state:s,time:performance.now()});});sixObserver.observe(document.querySelector('[data-scroll-story=prompt]'),{attributes:true,attributeFilter:['data-demo-step']});}""")
    go(True);page.wait_for_function("document.querySelector('[data-scroll-story=prompt]').dataset.demoStep==='selected'")
    test(page.locator('.hp-composer-phrase').evaluate("e=>getComputedStyle(e).opacity==='0'"),'selection precedes insertion')
    page.wait_for_function("document.querySelector('[data-scroll-story=prompt]').dataset.demoStep==='filled'")
    states=page.evaluate('sixStepLog.map(e=>e.state)')
    test(states==['show','selected','filled'],'finite panel, selection, insertion order')
    test(page.locator('.pc-prompt-row').first.evaluate("e=>getComputedStyle(e).backgroundColor!==getComputedStyle(e.nextElementSibling).backgroundColor"),'chosen row is visually distinguished')
    test(page.locator('.pc-prompt-pick').first.inner_text()==page.locator('.hp-composer-phrase').inner_text(),'same selected expression appears in the composer')
    test(page.locator('.pc-palette button,.pc-composer textarea').count()==0,'no fake real input/send controls added')
    page.evaluate('sixObserver.disconnect()')
