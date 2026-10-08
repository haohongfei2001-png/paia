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
from origin_checks import verify_origin, verify_assets
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
for relative in ('index.html','zh/index.html'):
    text=(ROOT/relative).read_text()
    check(len(Document(text).all('img')) == 6, f'{relative}: three source marks and three purposeful image layers retained')
    check('Watch the film' not in text and 'A PAIA user' not in text, f'{relative}: no invented film or testimonial')
    check(text.count('class="planned"') == 2, f'{relative}: future sources explicitly marked planned')
    check('data-hero-sequence' in text and 'data-scroll-collection' in text, f'{relative}: typography-to-collection sequence exists')
    check(text.count('class="art-icon"') == 2, f'{relative}: two purposeful interface icons, not repeated brand artwork')


# Shared capture dependencies remain byte-frozen. Owner-authorized homepage copy
# refinements may change hero wording only; retain the exact-literal check below.
check(hashlib.sha256((ROOT/'assets/website/site.css').read_bytes()).hexdigest()=='1da775ca6b8f914e0d4e8e66b1fb43e4f4c4189d2ead954afa1e7522a73e26dc', 'frozen byte identity: assets/website/site.css')
check(hashlib.sha256((ROOT/'assets/website/site.js').read_bytes()).hexdigest()=='8f85a04becb98881a8db309e7dbfb53de65b393d56871e072cf0474619481ff2', 'frozen byte identity: assets/website/site.js')
check(hashlib.sha256((ROOT/'assets/website/demo.js').read_bytes()).hexdigest()=='447610004d6f476e4a15edc298526817a8fef6537fea9b6447fd9dab8a6b5c65', 'frozen byte identity: assets/website/demo.js')
home_source=(ROOT/'website/home.py').read_text()
hero_literal=home_source[home_source.index("    hero=f'''"):home_source.index('    from core import render')]
check(hashlib.sha256(hero_literal.encode()).hexdigest()=='c96dad3a9069f1eca9bf381b519bb039106fcfd286f325c5ec45503260bea03a', 'approved hero with 2026-10-08 product copy; all source cards retained')

verify_assets(ROOT, check)

# V7 permits copy/color refinement, but the approved hero DOM and geometry stay.
hero_html=(ROOT/'index.html').read_text()
hero_html=hero_html[hero_html.index('<section class="hero-sequence"'):hero_html.index('<div class="paia-core"')]
hero_structure=[(tag,[(k,v) for k,v in attrs.items() if k not in ('stroke','fill','aria-label')]) for tag,attrs in Document(hero_html).tags if tag != 'br']
check(hashlib.sha256(json.dumps(hero_structure).encode()).hexdigest()=='f8998c1cc8043033db19f0ce8afc7fc489868cb10aca95861c5ce40717276a51', 'approved hero structure, card hierarchy and media geometry retained')


# Stable color token checks, not a claim of a full accessibility audit.
def luminance(color):
    v = [int(color[i:i+2], 16) / 255 for i in (0, 2, 4)]
    v = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in v]
    return .2126*v[0] + .7152*v[1] + .0722*v[2]
for fg, bg, minimum in [('626960','fdfdfc',4.5),('ffffff','2d3730',4.5),('343e34','ffffff',4.5),('596452','eff2eb',4.5),('30493b','ffffff',4.5),('6b6e73','fbfbfa',4.5),('ffffff','343638',4.5),('66696f','f6f6f5',4.5)]:
    low, high = sorted([luminance(fg), luminance(bg)])
    check((high+.05)/(low+.05) >= minimum, f'contrast: {fg}/{bg} >= {minimum}')

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

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'), headless=True, args=['--no-sandbox'])
        version = browser.version
        # Full page matrix, including 320 CSS px and 200% text.
        for width in [1440, 768, 390, 320]:
            for path in PAGES:
                name = path.relative_to(ROOT).as_posix()
                if os.environ.get('WEBSITE_TEST_PROGRESS'):print(width,name,flush=True)
                page = browser.new_page(viewport={'width':width,'height':900})
                errors, external = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('request', lambda request: external.append(request.url) if request.url.startswith('http') and not request.url.startswith(origin+'/') else None)
                load(page, name)
                page.evaluate('document.fonts.ready')
                check(page.evaluate('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0 || i.loading==="lazy")'), f'{name}: {width}px image assets available')
                check(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{name}: {width}px reflow')
                check(not errors, f'{name}: {width}px no JS errors')
                check(not external, f'{name}: {width}px no unsolicited external requests')
                if width == 320 and name in ('index.html','zh/index.html'):
                    page.screenshot(path=str(OUT / f'{name.replace("/","-")}-320-header.png'))
                    check(page.locator('.mobile-menu summary').bounding_box()['y'] < 60, f'{name}: 320px menu stays in the header row')
                if width == 320:
                    page.add_style_tag(content='html{font-size:200%!important}')
                    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{name}: 320px with 200% text')
                if name in ('index.html','zh/index.html','beta.html','zh/beta.html','demo.html','zh/demo.html') and width in (1440,390):
                    # Review captures should show the complete designed page rather than
                    # preserve below-the-fold reveal opacity. Production motion is unchanged.
                    if name in ('index.html','zh/index.html'):
                        page.emulate_media(reduced_motion='reduce')
                        page.evaluate('document.fonts.ready')
                    page.screenshot(path=str(OUT / f'{name.replace("/","-")}-{width}.png'), full_page=True)
                    if name in ('index.html','zh/index.html'):
                        capture = name.replace('/', '-')
                        stage = page.locator('.pc-context-stage')
                        stage.screenshot(path=str(OUT / f'{capture}-{width}-context-overview.png'))
                        page.locator('[data-card-open="rules"]').click()
                        stage.screenshot(path=str(OUT / f'{capture}-{width}-context-detail.png'))
                        page.locator('[data-card-detail="rules"] [data-context-back]').click()
                        page.locator('[data-context-global]').click()
                        page.locator('[data-card-allow="inputs"]').click()
                        page.locator('[data-card-open="inputs"]').click()
                        page.locator('[data-topic-allow="product"]').click()
                        stage.screenshot(path=str(OUT / f'{capture}-{width}-context-topic-scope.png'))
                page.close()
        # Motion is a reversible scroll progression, never an autoplay gate.
        page = browser.new_page(viewport={'width':1440,'height':900}, reduced_motion='no-preference')
        load(page,'index.html')
        page.evaluate('document.fonts.ready')
        page.evaluate("scrollTo({top:0,behavior:'instant'})")
        page.wait_for_timeout(80)
        check(page.locator('.collection').get_attribute('aria-hidden') == 'true', 'initial artwork excluded from accessibility tree')
        check(page.locator('.card-gpt').evaluate('e=>getComputedStyle(e).opacity') == '0', 'initial hero is typography only')
        check(page.locator('.synthesis-card').evaluate('e=>getComputedStyle(e).opacity') == '0', 'synthesis is not shown before inputs')
        page.evaluate("scrollTo({top:260,behavior:'instant'})")
        page.wait_for_timeout(80)
        check(float(page.locator('.card-gpt').evaluate('e=>getComputedStyle(e).opacity')) > .5, 'source cards emerge on scroll')
        check(page.locator('.synthesis-card').evaluate('e=>getComputedStyle(e).opacity') == '0', 'synthesis emerges after source cards')
        page.evaluate("scrollTo({top:660,behavior:'instant'})")
        page.wait_for_timeout(80)
        check(page.locator('.synthesis-card').evaluate('e=>getComputedStyle(e).opacity') == '1', 'completed collection includes PAIA')
        check(page.locator('.collection').get_attribute('inert') is None, 'visible artwork link becomes operable')
        # Brand marks must not be hidden under another card.
        check(page.evaluate("""Array.from(document.querySelectorAll('.input-card .provider-mark')).every(e=>{const r=e.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit && (hit===e||e.contains(hit))})"""), 'all source marks remain unobscured')
        page.evaluate("scrollTo({top:0,behavior:'instant'})")
        page.wait_for_timeout(80)
        check(page.locator('.card-gpt').evaluate('e=>getComputedStyle(e).opacity') == '0', 'upward scroll restores first frame')
        page.emulate_media(reduced_motion='reduce')
        check(page.locator('.card-gpt').evaluate('e=>getComputedStyle(e).opacity') == '1', 'reduced motion shows complete collection immediately')
        page.close()
        for locale in ['', 'zh/']:
            en = locale != 'zh/'
            page = browser.new_page(viewport={'width':390,'height':844})
            load(page, locale+'index.html')
            verify_core(page, check, en=en, download_dir=OUT, offline=OFFLINE)
            verify_origin(page, check, en=en)
            menu = page.locator('.mobile-menu')
            menu.locator('summary').click()
            check(menu.evaluate('el => el.open'), f'{locale}: mobile menu opens')
            page.keyboard.press('Escape')
            check(not menu.evaluate('el=>el.open'), f'{locale}: Escape closes menu')
            check(menu.locator('summary').evaluate('el=>el===document.activeElement'), f'{locale}: menu restores focus')
            page.emulate_media(reduced_motion='reduce')
            check(page.evaluate('getComputedStyle(document.documentElement).scrollBehavior') == 'auto', f'{locale}: reduced motion')
            page.close()
            page = browser.new_page(viewport={'width':1280,'height':900})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            load(page, locale+'demo.html')
            verify_core(page, check, en=en, download_dir=OUT, offline=OFFLINE)
            page.locator('[data-card-open="info"]').focus()
            page.keyboard.press('Enter')
            check(page.locator('[data-card-detail="info"]').is_visible(), f'{locale}: keyboard opens the correct card')
            page.locator('[data-card-detail="info"] [data-context-back]').click()
            page.locator('[data-card-allow="info"]').focus()
            page.keyboard.press('Enter')
            check(page.locator('[data-card-allow="info"]').get_attribute('aria-pressed')=='true', f'{locale}: keyboard toggles explicit card state')
            check(page.locator('[data-context-overview]').is_visible(), f'{locale}: capsule does not navigate into card')
            check(not page.evaluate('localStorage.length || sessionStorage.length'), f'{locale}: example does not persist personal edits')
            check(not errors, f'{locale}: interactive demo no JS errors')
            page.close()
            page = browser.new_page()
            load(page, locale+'beta.html')
            check(page.locator('form').get_attribute('action') == 'https://formsubmit.co/haohongfei2001@gmail.com', f'{locale}: existing beta destination retained')
            check(not page.locator('form').evaluate('el=>el.checkValidity()'), f'{locale}: empty form blocked')
            page.locator('#beta-email').fill('not-an-email')
            check(not page.locator('form').evaluate('el=>el.checkValidity()'), f'{locale}: invalid email blocked')
            page.locator('#beta-email').fill('synthetic@example.invalid')
            check(not page.locator('form').evaluate('el=>el.checkValidity()'), f'{locale}: explicit consent required')
            page.locator('[name=contact_consent]').check()
            check(page.locator('form').evaluate('el=>el.checkValidity()'), f'{locale}: valid consented form; NOT submitted')
            page.close()
            # JS-off readability and native form capability, without any transmission.
            context = browser.new_context(java_script_enabled=False, viewport={'width':390,'height':844})
            page = context.new_page()
            load(page, locale+'index.html', scripts=False)
            check(page.locator('h1').is_visible() and page.locator('#input-library').is_visible() and page.locator('#personal-context').is_visible(), f'{locale}: static core content without JS')
            page.close(); context.close()
        browser.close()
except Exception as error:
    results.append({'check':'suite execution', 'pass':False, 'error':str(error)})
finally:
    if server: server.shutdown()
    report = {'evidence':'SYNTHETIC_BROWSER','transport':'offline exact-source DOM render' if OFFLINE else 'local HTTP', 'browser':locals().get('version','unavailable'), 'private_data':False, 'beta_form_submitted':False, 'tests':results}
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    failed = [item for item in results if not item['pass']]
    print(json.dumps({'checks':len(results),'failed':failed,'transport':report['transport']},ensure_ascii=False))
    if failed: raise SystemExit(1)
