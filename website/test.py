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
import json, os, re, sys, struct, hashlib
from core_checks import verify_core
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

def capture_scenes(page, name, width):
    """Review ordinary and disclosed states with readable, nonmoving surfaces."""
    prefix = f'{name.replace("/", "-")}-{width}'
    page.emulate_media(reduced_motion='reduce')
    page.evaluate('document.fonts.ready')
    page.evaluate("scrollTo({top:0,behavior:'instant'})")
    if name in ('index.html', 'zh/index.html'):
        page.screenshot(path=str(OUT / f'{prefix}-hero.png'), animations='disabled')
        for key in ('archive', 'thought', 'context'):
            page.locator(f'[data-preview-tab="{key}"]').click()
            page.locator('[data-hero-product]').screenshot(path=str(OUT / f'{prefix}-hero-{key}.png'), animations='disabled')
        page.locator('[data-preview-tab="archive"]').click()
    page.screenshot(path=str(OUT / f'{prefix}.png'), full_page=True, animations='disabled')
    if name not in ('index.html', 'zh/index.html', 'demo.html', 'zh/demo.html'):
        return
    for label, selector in [('archive', '.pc-editor-stage'), ('prompt', '.pc-prompt-scene'), ('topic-root', '[data-topic-stage]'), ('context-overview', '.pc-context-stage')]:
        page.locator(selector).screenshot(path=str(OUT / f'{prefix}-{label}.png'), animations='disabled')
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
    page.locator('[data-context-global]').click()
    page.locator('[data-card-allow="inputs"]').click()
    page.locator('[data-card-open="inputs"]').click()
    page.locator('[data-topic-allow="product"]').click()
    stage.screenshot(path=str(OUT / f'{prefix}-context-topic-scope.png'), animations='disabled')


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'), headless=True, args=['--no-sandbox'])
        version = browser.version
        # All 48 routes retain the complete four-width reflow and safety matrix.
        review_pages = ('index.html', 'zh/index.html', 'beta.html', 'zh/beta.html', 'demo.html', 'zh/demo.html', 'how-it-works.html', 'zh/how-it-works.html', 'principles.html', 'zh/principles.html')
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
                check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'{name}: {width}px reflow')
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
                    check(page.locator('[data-preview-panel="archive"]').is_visible() and page.locator('[data-preview-panel]:visible').count() == 1, f'{name}: {width}px product preview is visible from the start')
                    check(page.locator('[data-preview-tab][aria-selected=true]').get_attribute('data-preview-tab') == 'archive', f'{name}: {width}px Archive is the initial preview')
                if width == 320 and name in ('index.html', 'zh/index.html'):
                    page.evaluate("scrollTo({top:0,behavior:'instant'})")
                    page.screenshot(path=str(OUT / f'{name.replace("/", "-")}-320-header.png'), animations='disabled')
                    check(page.evaluate("""()=>{const selectors=['.brand-lockup','.header-actions','.mobile-menu summary'];const r=selectors.map(s=>document.querySelector(s).getBoundingClientRect());const centers=r.map(e=>e.y+e.height/2);return Math.max(...centers)-Math.min(...centers)<5 && r.every(e=>e.left>=0&&e.right<=innerWidth+1) && r[0].right<=r[1].left+1 && r[1].right<=r[2].left+1;}"""), f'{name}: 320px brand, CTA and menu share a clear header row')
                if name in review_pages and width in (1440, 390):
                    capture_scenes(page, name, width)
                if width == 320:
                    page.add_style_tag(content='html{font-size:200%!important}')
                    page.evaluate('dispatchEvent(new Event("resize"))')
                    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'{name}: 320px with 200% text')
                    if name in ('index.html', 'zh/index.html'):
                        page.evaluate("scrollTo({top:0,behavior:'instant'})")
                        page.screenshot(path=str(OUT / f'{name.replace("/", "-")}-320-text-200.png'), animations='disabled')
                check(not errors, f'{name}: {width}px no JS errors')
                check(not external, f'{name}: {width}px no unsolicited external requests')
                page.close()

        for locale in ['', 'zh/']:
            en = locale != 'zh/'
            # Actual native geometry, keyboard tabs, manual pause and system motion.
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
    results.append({'check': 'suite execution', 'pass': False, 'error': str(error)})
finally:
    if server:
        server.shutdown()
    report = {'evidence': 'SYNTHETIC_BROWSER', 'transport': 'offline exact-source DOM render' if OFFLINE else 'local HTTP', 'browser': locals().get('version', 'unavailable'), 'private_data': False, 'beta_form_submitted': False, 'tests': results}
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    failed = [item for item in results if not item['pass']]
    print(json.dumps({'checks': len(results), 'failed': failed, 'transport': report['transport']}, ensure_ascii=False))
    if failed:
        raise SystemExit(1)
