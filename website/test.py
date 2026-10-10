"""Website-only regression suite. All browser content and inputs are synthetic.
Default: real local HTTP server. --offline-render: load the SAME generated HTML,
CSS and JS into about:blank when a managed browser blocks local navigation.
The fallback is explicitly recorded and never certifies HTTP/deployment behavior.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json, os, re, sys, struct, hashlib, traceback
from core_checks import verify_core
from layout_checks import verify_layout
from origin_checks import verify_origin, verify_assets, verify_hero, verify_typography
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OFFLINE = '--offline-render' in sys.argv
OUT = Path(os.environ.get('WEBSITE_TEST_OUTPUT', ROOT / 'website-test-artifacts'))
OUT.mkdir(parents=True, exist_ok=True)
results = []

def check(condition, label):
    results.append({'check': label, 'pass': bool(condition)})
    if not condition:
        raise AssertionError(label)

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
    def all(self, tag):
        return [attrs for kind, attrs in self.tags if kind == tag]

PAGES = [ROOT / name for name in (ROOT / 'website/generated-paths.txt').read_text().splitlines() if name.endswith('.html')]
for path in PAGES:
    text = path.read_text()
    doc = Document(text)
    name = path.relative_to(ROOT).as_posix()
    expected_lang = 'zh-CN' if name.startswith('zh/') else 'en'
    check(doc.all('html')[0].get('lang') == expected_lang, f'{name}: static language')
    check(len(doc.all('h1')) == 1, f'{name}: one primary heading')
    links = doc.all('link')
    check(len([x for x in links if x.get('rel') == 'canonical']) == 1, f'{name}: canonical')
    check({x.get('hreflang') for x in links if x.get('rel') == 'alternate'} == {'en', 'zh-Hans', 'x-default'}, f'{name}: locale alternatives')
    metas = doc.all('meta')
    check(any(x.get('name') == 'description' and x.get('content') for x in metas), f'{name}: description')
    for x in metas:
        if x.get('property') == 'og:image':
            image = ROOT / urlparse(x['content']).path.lstrip('/')
            check(image.exists(), f'{name}: social image exists')
            with image.open('rb') as stream:
                header = stream.read(24)
            check(struct.unpack('>II', header[16:24]) == (1200, 630), f'{name}: social dimensions')
    for attrs in doc.all('a') + doc.all('link') + doc.all('script') + doc.all('img'):
        value = attrs.get('href', attrs.get('src', ''))
        parsed = urlparse(value)
        if parsed.scheme in ('mailto', 'tel') or (parsed.netloc and parsed.netloc != 'inputarchive.com'):
            continue
        if not parsed.path:
            target = path
        elif parsed.path.startswith('/'):
            target = ROOT / unquote(parsed.path).lstrip('/')
        else:
            target = path.parent / unquote(parsed.path)
        if target.is_dir():
            target = target / 'index.html'
        check(target.exists(), f'{name}: internal target {value}')
        if parsed.fragment and target.suffix == '.html':
            ids = {a.get('id') for _, a in Document(target.read_text()).tags if a.get('id')}
            check(parsed.fragment in ids, f'{name}: anchor {value}')
    scripts = [x.get('src', '') for x in doc.all('script')]
    check(all(s.startswith('/assets/website/') for s in scripts), f'{name}: only website-owned scripts')
    check('i18n.js' not in text and 'polish.css' not in text, f'{name}: no legacy UI owners')

# English is the default; old /en links stay readable with a canonical root URL.
for relative in ('index.html','beta.html','demo.html','principles.html','status.html','about.html','privacy-policy.html','terms.html','thanks.html','404.html','how-it-works.html','use-cases.html','blog.html','article-context.html','article-beliefs.html','article-reuse.html'):
    root_doc = Document((ROOT/relative).read_text())
    zh_doc = Document((ROOT/'zh'/relative).read_text())
    check((ROOT/relative).read_bytes() == (ROOT/'en'/relative).read_bytes(), f'{relative}: legacy English alias matches canonical page')
    check(next(a['href'] for a in root_doc.all('link') if a.get('rel')=='canonical') == 'https://inputarchive.com/'+('' if relative=='index.html' else relative), f'{relative}: English root canonical')
    check(next(a['href'] for a in zh_doc.all('link') if a.get('rel')=='canonical') == 'https://inputarchive.com/zh/'+('' if relative=='index.html' else relative), f'{relative}: Chinese canonical')
    check(next(a['href'] for a in root_doc.all('link') if a.get('hreflang')=='x-default') == 'https://inputarchive.com/'+('' if relative=='index.html' else relative), f'{relative}: English default metadata')
# The current Owner direction is product-led. Preserve the brand identity and
# claims, not the old photograph count, typography-only frame or frozen CSS.
for relative in ('index.html', 'zh/index.html'):
    source = (ROOT / relative).read_text()
    doc = Document(source)
    check('Watch the film' not in source and 'A PAIA user' not in source, f'{relative}: no invented film or testimonial')
    check(sum('data-product-hero' in attrs for _, attrs in doc.tags) == 1, f'{relative}: current product-led opening exists')
    check([attrs['data-preview-tab'] for _, attrs in doc.tags if 'data-preview-tab' in attrs] == ['archive', 'thought', 'context'], f'{relative}: three approved product spaces')
    check('data-hero-sequence' not in source and 'data-scroll-collection' not in source, f'{relative}: retired opening is not a second visual owner')
    check(sum('/brand/paia-logo-v1.webp' in attrs.get('src', '') for attrs in doc.all('img')) == 1, f'{relative}: original artwork remains confined to its closing use')
for relative in ('index.html', 'zh/index.html', 'demo.html', 'zh/demo.html'):
    source = (ROOT / relative).read_text()
    doc = Document(source)
    styles = [urlparse(attrs['href']).path for attrs in doc.all('link') if attrs.get('rel') == 'stylesheet']
    check('/assets/website/site.css' in styles and '/assets/website/product-experience.css' in styles, f'{relative}: shared product visual system loaded')
    check(not any(name in source for name in ('home-core-v1.css', 'home-origin-v7.css', 'product-consistency.css', '/assets/website/demo.js')), f'{relative}: no retired stylesheet or demo cascade')

verify_assets(ROOT, check)

# Selected D6 text/surface pairs. Visual review also inspects the composited
# translucent layers; token contrast alone is not a full accessibility audit.
def luminance(color):
    values = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    values = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]
for fg, bg in [('17233c', 'ffffff'), ('63728a', 'fafbfd'), ('ffffff', '235dd3'), ('235dd3', 'eaf1ff'), ('25354f', 'ffffff')]:
    low, high = sorted([luminance(fg), luminance(bg)])
    check((high + .05) / (low + .05) >= 4.5, f'D6 text contrast: {fg}/{bg} >= 4.5')

if '--static-only' in sys.argv:
    (OUT / 'report.json').write_text(json.dumps({'evidence': 'STATIC_ONLY', 'browser': 'not run', 'private_data': False, 'beta_form_submitted': False, 'tests': results}, ensure_ascii=False, indent=2))
    print(json.dumps({'checks': len(results), 'failed': [], 'evidence': 'STATIC_ONLY', 'browser': 'not run'}))
    raise SystemExit(0)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = None
if not OFFLINE:
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
else:
    origin = 'about:blank'

def load(page, relative, scripts=True):
    path = ROOT / relative
    if not OFFLINE:
        page.goto(origin + '/' + relative, wait_until='load')
        return
    import base64,mimetypes
    def asset_uri(value):
        f=ROOT/value.lstrip('/').split('?')[0]
        if not f.is_file(): return ''
        return 'data:'+(mimetypes.guess_type(f)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(f.read_bytes()).decode()
    html = path.read_text()
    sources = re.findall(r'<script[^>]*src="([^"]+)"[^>]*></script>', html)
    html = re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', html)
    html = re.sub(r'<link rel="stylesheet"[^>]+>', '', html)
    style_sources = re.findall(r'<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', path.read_text())
    css = '\n'.join((ROOT / source.split('?')[0].lstrip('/')).read_text() for source in style_sources)
    css = re.sub(r"url\(['\"]?(/[^'\"\)]+)['\"]?\)",lambda m:'url("'+asset_uri(m[1])+'")',css)
    html = re.sub(r'(<img[^>]*src=")([^"]+)(")',lambda m:m[1]+asset_uri(m[2])+m[3],html)
    page.set_content(html.replace('</head>', f'<style>{css}</style></head>'), wait_until='load')
    if scripts:
        for source in sources:
            page.add_script_tag(content=(ROOT / source.split('?')[0].lstrip('/')).read_text())

def settle_capture_top(page):
    # Local screenshots may have moved the viewport or left a focused control.
    # Restore the real page origin before capturing a sticky header and hero.
    page.evaluate('document.activeElement?.blur?.()')
    page.evaluate("scrollTo({top:0,behavior:'instant'})")
    page.wait_for_function('scrollY===0')
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')


def capture_stage_viewport(page, selector, filename):
    # Capture the real viewport with the sticky navigation still present.
    page.evaluate('document.activeElement?.blur?.()')
    page.locator(selector).evaluate("el=>scrollTo({top:Math.max(0,scrollY+el.getBoundingClientRect().top-124),behavior:'instant'})")
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    page.screenshot(path=str(OUT / filename), animations='disabled')


def check_reflow(page, label, name, width, state):
    """Keep the strict gate; preserve the actual failing layout before raising."""
    fits = page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    if not fits:
        prefix = f'{name.replace("/", "-")}-{width}-{state}-failure'
        try:
            evidence = page.evaluate("""()=>{
                const cssKeys=['display','position','width','minWidth','maxWidth','gridTemplateColumns','gridTemplateRows','gap','fontSize','lineHeight','whiteSpace','overflowWrap','overflowX','paddingLeft','paddingRight','transform'];
                const identify=e=>{if(e.id)return '#'+CSS.escape(e.id);let name=e.localName+[...e.classList].slice(0,3).map(c=>'.'+CSS.escape(c)).join('');const data=[...e.attributes].find(a=>a.name.startsWith('data-'));if(data)name+='['+data.name+'='+JSON.stringify(data.value)+']';return name;};
                const describe=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {selector:identify(e),parent:e.parentElement?identify(e.parentElement):null,rect:{x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom},scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,css:Object.fromEntries(cssKeys.map(k=>[k,s[k]])),text:e.textContent.trim().slice(0,140)};};
                const elements=[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
                return {viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,rootFontSize:getComputedStyle(document.documentElement).fontSize},document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},body:{scrollWidth:document.body.scrollWidth,clientWidth:document.body.clientWidth},outsideViewport:elements.filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left< -1;}).slice(0,100).map(describe),internalOverflow:elements.filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+1).slice(0,100).map(describe),layoutContainers:[...document.querySelectorAll('.header-inner,.pc-nav,.pc-editor,.pc-reader-tools,.pc-topic-grid,.pc-prompt-row,.pc-prompt-management,.pc-context-stage,.pc-context-grid,.pc-sync,.pc-sync-mapping')].filter(e=>e.getClientRects().length).map(describe)};
            }""")
        except Exception as error:
            evidence = {'diagnostic_error': str(error)}
        evidence.update({'route': name, 'width': width, 'state': state, 'failed_check': label, 'screenshots': []})
        for suffix, full_page in [('viewport', False), ('full', True)]:
            filename = f'{prefix}-{suffix}.png'
            try:
                page.screenshot(path=str(OUT / filename), full_page=full_page)
                evidence['screenshots'].append(filename)
            except Exception as error:
                evidence.setdefault('screenshot_errors', []).append(str(error))
        (OUT / f'{prefix}.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2))
    check(fits, label)


def capture_scenes(page, name, width):
    """Review ordinary and disclosed states with readable, nonmoving surfaces."""
    prefix = f'{name.replace("/", "-")}-{width}'
    page.emulate_media(reduced_motion='reduce')
    page.evaluate('document.fonts.ready')
    settle_capture_top(page)
    if name in ('index.html', 'zh/index.html'):
        page.screenshot(path=str(OUT / f'{prefix}-hero.png'), animations='disabled')
        for key in ('archive', 'thought', 'context'):
            page.locator(f'[data-preview-tab="{key}"]').click()
            page.locator('[data-hero-product]').screenshot(path=str(OUT / f'{prefix}-hero-{key}.png'), animations='disabled')
        page.locator('[data-preview-tab="archive"]').click()
    settle_capture_top(page)
    page.screenshot(path=str(OUT / f'{prefix}.png'), full_page=True, animations='disabled')
    if name not in ('index.html', 'zh/index.html', 'demo.html', 'zh/demo.html'):
        return
    for label, selector in [('archive', '.pc-editor-stage'), ('prompt', '.pc-prompt-scene'), ('topic-root', '[data-topic-stage]'), ('context-overview', '.pc-context-stage')]:
        page.locator(selector).screenshot(path=str(OUT / f'{prefix}-{label}.png'), animations='disabled')
    for label, selector in [('topic-overview', '[data-topic-stage]'), ('context-overview', '.pc-context-stage')]:
        capture_stage_viewport(page, selector, f'{prefix}-{label}-viewport.png')
    page.locator('[data-prompt-manage="0"]').focus()
    page.keyboard.press('Enter')
    page.locator('.pc-prompt-scene').screenshot(path=str(OUT / f'{prefix}-prompt-management.png'), animations='disabled')
    page.locator('#pc-prompt-0').press('Escape')
    page.locator('[data-topic-block="product"] h3 a').click()
    page.locator('[data-topic-stage]').screenshot(path=str(OUT / f'{prefix}-topic-reader.png'), animations='disabled')
    page.locator('[data-topic-reader="product"] [data-topic-back]').click()
    stage = page.locator('.pc-context-stage')
    page.locator('[data-card-open="rules"]').click()
    stage.screenshot(path=str(OUT / f'{prefix}-context-detail.png'), animations='disabled')
    page.locator('[data-card-detail="rules"] [data-context-back]').click()
    page.locator('[data-card-open="inputs"]').click()
    stage.screenshot(path=str(OUT / f'{prefix}-context-topic-scope.png'), animations='disabled')
    page.locator('[data-topic-allow="product"]').click()
    stage.screenshot(path=str(OUT / f'{prefix}-context-topic-revoked.png'), animations='disabled')


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'), headless=True, args=['--no-sandbox'])
        version = browser.version
        # All 48 routes retain the complete four-width reflow and safety matrix.
        review_pages = tuple(path.relative_to(ROOT).as_posix() for path in PAGES if not path.relative_to(ROOT).as_posix().startswith('en/'))
        for width in [1440, 768, 390, 320]:
            for path in PAGES:
                name = path.relative_to(ROOT).as_posix()
                if os.environ.get('WEBSITE_TEST_PROGRESS'):
                    print(width, name, flush=True)
                page = browser.new_page(viewport={'width': width, 'height': 900})
                errors, external = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('request', lambda request: external.append(request.url) if request.url.startswith('http') and not request.url.startswith(origin + '/') else None)
                load(page, name)
                page.evaluate('document.fonts.ready')
                check(page.evaluate('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0 || i.loading==="lazy")'), f'{name}: {width}px image assets available')
                check_reflow(page, f'{name}: {width}px reflow', name, width, 'layout')
                verify_typography(page, check, f'{name}: {width}px')
                if path.name in ('index.html', 'demo.html'):
                    check(page.locator('[data-thought-text]').evaluate_all('els=>els.length===4 && els.every(e=>parseFloat(getComputedStyle(e).fontSize)>=14)'), f'{name}: {width}px Topic body remains readable')
                    check(page.locator('.pc-thought').evaluate_all('els=>els.every(e=>parseFloat(getComputedStyle(e.querySelector(".pc-topic-source")).fontSize)<=parseFloat(getComputedStyle(e.querySelector("[data-thought-text]")).fontSize))'), f'{name}: {width}px provenance stays subordinate to the words')
                    check(page.locator('[data-topic-overview]').is_visible() and page.locator('[data-topic-reader]:visible').count() == 0, f'{name}: {width}px default Topic overview is stable')
                    check(page.locator('.pc-prompt-management:visible').count() == 0, f'{name}: {width}px prompt management stays contextual')
                    page.locator('[data-prompt-manage="0"]').focus()
                    page.keyboard.press('Enter')
                    check(page.locator('[data-pin]:visible').evaluate_all('els=>els.length===1 && els.every(e=>{const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length===1})'), f'{name}: {width}px disclosed Pin label stays on one line')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'{name}: {width}px prompt management does not overflow')
                    page.locator('#pc-prompt-0').press('Escape')
                    if width <= 480:
                        check(page.locator('.pc-topic-grid').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length===1'), f'{name}: {width}px Topic overview uses one readable column')
                        check(page.locator('.pc-context-grid').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length===1'), f'{name}: {width}px Context cards stack for reading')
                    check(page.locator('[data-topic-reader="product"] .pc-thoughts').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length===1'), f'{name}: {width}px Topic reading remains one continuous column')
                if path.name == 'index.html':
                    verify_layout(page, check)
                    check(page.locator('[data-preview-panel="archive"]').is_visible() and page.locator('[data-preview-panel]:visible').count() == 1, f'{name}: {width}px product preview is visible from the start')
                    check(page.locator('[data-preview-tab][aria-selected=true]').get_attribute('data-preview-tab') == 'archive', f'{name}: {width}px Archive is the initial preview')
                if width == 320 and name in ('index.html', 'zh/index.html'):
                    page.evaluate("scrollTo({top:0,behavior:'instant'})")
                    page.screenshot(path=str(OUT / f'{name.replace("/", "-")}-320-header.png'), animations='disabled')
                    check(page.evaluate("""()=>{const selectors=['.brand-lockup','.header-actions','.mobile-menu summary'];const r=selectors.map(s=>document.querySelector(s).getBoundingClientRect());const centers=r.map(e=>e.y+e.height/2);return Math.max(...centers)-Math.min(...centers)<5 && r.every(e=>e.left>=0&&e.right<=innerWidth+1) && r[0].right<=r[1].left+1 && r[1].right<=r[2].left+1;}"""), f'{name}: 320px brand, CTA and menu share a clear header row')
                if name in review_pages and width in (1440, 390):
                    # Evidence starts in a fresh page so prior focus-driven
                    # browser scrolling cannot race screenshot positioning.
                    capture_page = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                    try:
                        capture_page.on('pageerror', lambda error: errors.append(str(error)))
                        capture_page.on('request', lambda request: external.append(request.url) if request.url.startswith('http') and not request.url.startswith(origin + '/') else None)
                        load(capture_page, name)
                        capture_scenes(capture_page, name, width)
                    finally:
                        capture_page.close()
                if width == 320:
                    page.add_style_tag(content='html{font-size:200%!important}')
                    page.evaluate('dispatchEvent(new Event("resize"))')
                    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                    check_reflow(page, f'{name}: 320px with 200% text', name, width, 'text-200')
                    if name in ('index.html', 'zh/index.html'):
                        page.evaluate("scrollTo({top:0,behavior:'instant'})")
                        page.screenshot(path=str(OUT / f'{name.replace("/", "-")}-320-text-200.png'), animations='disabled')
                        menu = page.locator('.mobile-menu')
                        menu.locator('summary').focus()
                        page.keyboard.press('Enter')
                        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                        page.screenshot(path=str(OUT / f'{name.replace("/", "-")}-320-text-200-menu.png'), animations='disabled')
                        check(menu.evaluate('el=>{const r=el.querySelector("nav").getBoundingClientRect();return el.open&&r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}'), f'{name}: 320px with 200% text expanded menu stays within the viewport')
                        page.keyboard.press('Escape')
                        check(not menu.evaluate('el=>el.open') and menu.locator('summary').evaluate('el=>el===document.activeElement'), f'{name}: 320px with 200% text Escape closes the menu and restores focus')
                check(not errors, f'{name}: {width}px no JS errors')
                check(not external, f'{name}: {width}px no unsolicited external requests')
                page.close()

        for locale in ['', 'zh/']:
            en = locale != 'zh/'
            # Native geometry, keyboard tabs, full default motion and system preference.
            page = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='no-preference')
            load(page, locale + 'index.html')
            page.evaluate('document.fonts.ready')
            verify_hero(page, check, en=en, motion=True)
            page.close()
            page = browser.new_page(viewport={'width': 390, 'height': 844})
            load(page, locale + 'index.html')
            verify_hero(page, check, en=en)
            verify_core(page, check, en=en, download_dir=OUT, offline=OFFLINE)
            verify_origin(page, check, en=en)
            menu = page.locator('.mobile-menu')
            menu.locator('summary').click()
            check(menu.evaluate('el=>el.open'), f'{locale}: mobile menu opens')
            page.keyboard.press('Escape')
            check(not menu.evaluate('el=>el.open'), f'{locale}: Escape closes menu')
            check(menu.locator('summary').evaluate('el=>el===document.activeElement'), f'{locale}: menu restores focus')
            page.emulate_media(reduced_motion='reduce')
            check(page.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'"), f'{locale}: reduced motion')
            # Narrow regression for the repaired high-contrast title and Orb.
            page.emulate_media(forced_colors='active', reduced_motion='reduce')
            load(page, locale + 'index.html')
            page.evaluate('document.fonts.ready')
            contrast_locale = 'en' if en else 'zh'
            check(page.evaluate("matchMedia('(forced-colors: active)').matches"), f'{locale}: browser forced colors is active')
            title = page.locator('.hero-heading h1 > span')
            check(title.is_visible() and title.evaluate("e=>{const s=getComputedStyle(e);return s.backgroundImage==='none'&&s.webkitTextFillColor===s.color&&!['transparent','rgba(0,0,0,0)'].includes(s.webkitTextFillColor.replaceAll(' ',''));}"), f'{locale}: high-contrast title uses visible text instead of transparent gradient fill')
            settle_capture_top(page)
            page.screenshot(path=str(OUT / f'{contrast_locale}-390-forced-colors-hero.png'), animations='disabled')
            orb = page.locator('[data-prompt-toggle]')
            check(orb.locator('.paia-orb').evaluate("e=>getComputedStyle(e).display==='none'"), f'{locale}: high-contrast mode hides only the decorative Orb')
            check(orb.is_visible() and orb.evaluate("e=>{const s=getComputedStyle(e);return parseFloat(s.borderTopWidth)>=1&&s.borderTopStyle!=='none'&&s.borderTopColor===s.color&&s.color!==s.backgroundColor;}"), f'{locale}: Orb control retains a contrasting visible button boundary')
            check(orb.evaluate("e=>getComputedStyle(e,'::after').content.includes('−')"), f'{locale}: expanded prompt control has a visible collapse symbol')
            orb.focus()
            page.keyboard.press('Enter')
            check(orb.get_attribute('aria-expanded') == 'false' and not page.locator('#pc-prompt-card').is_visible() and orb.evaluate("e=>getComputedStyle(e,'::after').content.includes('+')"), f'{locale}: keyboard collapses the card and displays an expand symbol')
            page.keyboard.press('Enter')
            check(orb.get_attribute('aria-expanded') == 'true' and page.locator('#pc-prompt-card').is_visible() and orb.evaluate('e=>e===document.activeElement'), f'{locale}: keyboard reopens the prompt card with focus retained')
            page.locator('.pc-prompt-scene').screenshot(path=str(OUT / f'{contrast_locale}-390-forced-colors-prompt.png'), animations='disabled')
            page.locator('[data-context-clear]').click()
            allowed = page.locator('[data-card-allow="rules"]')
            closed = page.locator('[data-card-allow="info"]')
            allowed.focus()
            page.keyboard.press('Enter')
            page.locator('[data-card-open="info"]').focus()
            check(allowed.get_attribute('aria-pressed') == 'true' and closed.get_attribute('aria-pressed') == 'false' and allowed.inner_text() != closed.inner_text(), f'{locale}: Context permission states remain distinct in text and semantics')
            # Engines may retain a computed medium outline width with style
            # `none`; test the visible distinction, not that inert default.
            check(allowed.evaluate("e=>parseFloat(getComputedStyle(e).outlineWidth)>=2&&getComputedStyle(e).outlineStyle!=='none'") and closed.evaluate("e=>getComputedStyle(e).outlineStyle==='none'||parseFloat(getComputedStyle(e).outlineWidth)===0"), f'{locale}: chosen Context permission keeps a visible non-color state outline')
            page.close()
            page = browser.new_page(viewport={'width': 1280, 'height': 900})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            load(page, locale + 'demo.html')
            verify_core(page, check, en=en, download_dir=OUT, offline=OFFLINE)
            verify_origin(page, check, en=en)
            page.locator('[data-card-open="info"]').focus()
            page.keyboard.press('Enter')
            check(page.locator('[data-card-detail="info"]').is_visible(), f'{locale}: keyboard opens the correct card')
            page.locator('[data-card-detail="info"] [data-context-back]').click()
            page.locator('[data-card-allow="info"]').focus()
            page.keyboard.press('Enter')
            check(page.locator('[data-card-allow="info"]').get_attribute('aria-pressed') == 'true', f'{locale}: keyboard toggles explicit card state')
            check(page.locator('[data-context-overview]').is_visible(), f'{locale}: capsule does not navigate into card')
            if not OFFLINE:
                check(not page.evaluate('localStorage.length || sessionStorage.length'), f'{locale}: example does not persist personal edits')
            check(not errors, f'{locale}: interactive demo no JS errors')
            page.close()
            page = browser.new_page()
            load(page, locale + 'beta.html')
            check(page.locator('form').get_attribute('action') == 'https://formsubmit.co/haohongfei2001@gmail.com', f'{locale}: existing beta destination retained')
            check(not page.locator('[name=contact_consent]').is_checked(), f'{locale}: forwarding consent starts unchecked')
            check(not page.locator('form').evaluate('el=>el.checkValidity()'), f'{locale}: empty form blocked')
            page.locator('#beta-email').fill('not-an-email')
            check(not page.locator('form').evaluate('el=>el.checkValidity()'), f'{locale}: invalid email blocked')
            page.locator('#beta-email').fill('synthetic@example.invalid')
            check(not page.locator('form').evaluate('el=>el.checkValidity()'), f'{locale}: explicit consent required')
            page.locator('[name=contact_consent]').check()
            check(page.locator('form').evaluate('el=>el.checkValidity()'), f'{locale}: valid consented form; NOT submitted')
            page.close()
            # All essential text and native Topic links remain readable without JS.
            context = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
            page = context.new_page()
            load(page, locale + 'index.html', scripts=False)
            check(page.locator('h1').is_visible() and page.locator('#input-library').is_visible() and page.locator('#personal-context').is_visible(), f'{locale}: static core content without JS')
            check(page.locator('[data-preview-panel="archive"]').is_visible() and page.locator('[data-hero-glass]').is_visible(), f'{locale}: product-led first view works without JavaScript')
            check(page.locator('[data-topic-reader="product"]').is_visible(), f'{locale}: native Topic anchors still reach readable content without JavaScript')
            page.close()
            context.close()
        browser.close()
except Exception as error:
    results.append({'check': 'suite execution', 'pass': False, 'error': str(error), 'traceback': traceback.format_exc()})
finally:
    if server:
        server.shutdown()
    report = {'evidence': 'SYNTHETIC_BROWSER', 'transport': 'offline exact-source DOM render' if OFFLINE else 'local HTTP', 'browser': locals().get('version', 'unavailable'), 'private_data': False, 'beta_form_submitted': False, 'tests': results}
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    failed = [item for item in results if not item['pass']]
    print(json.dumps({'checks': len(results), 'failed': failed, 'transport': report['transport']}, ensure_ascii=False))
    if failed:
        raise SystemExit(1)
