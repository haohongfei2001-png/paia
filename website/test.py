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
import json, os, re, sys, struct
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
    expected_lang = 'en' if name.startswith('en/') else 'zh-CN'
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
    for attrs in doc.all('a') + doc.all('link') + doc.all('script'):
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

# Stable color token checks, not a claim of a full accessibility audit.
def luminance(color):
    v = [int(color[i:i+2], 16) / 255 for i in (0, 2, 4)]
    v = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in v]
    return .2126*v[0] + .7152*v[1] + .0722*v[2]
for fg, bg, minimum in [('56616b','fbfcfd',4.5),('aebbc4','0b0f13',4.5),('10251a','b5f3cc',4.5),('acbbc5','10161b',4.5),('63717a','ffffff',4.5)]:
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
    html = path.read_text()
    sources = re.findall(r'<script src="([^"]+)"[^>]*></script>', html)
    html = re.sub(r'<script src="[^"]+"[^>]*></script>', '', html)
    html = re.sub(r'<link rel="stylesheet"[^>]+>', '', html)
    css = (ROOT / 'assets/website/site.css').read_text()
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
                page = browser.new_page(viewport={'width':width,'height':900})
                errors, external = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('request', lambda request: external.append(request.url) if request.url.startswith('http') and not request.url.startswith(origin+'/') else None)
                load(page, name)
                check(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{name}: {width}px reflow')
                check(not errors, f'{name}: {width}px no JS errors')
                check(not external, f'{name}: {width}px no unsolicited external requests')
                if width == 320:
                    page.add_style_tag(content='html{font-size:200%!important}')
                    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{name}: 320px with 200% text')
                if name in ('index.html','en/index.html') and width in (1440,390):
                    page.screenshot(path=str(OUT / f'{name.replace("/","-")}-{width}.png'), full_page=True)
                page.close()
        for locale in ['', 'en/']:
            page = browser.new_page(viewport={'width':390,'height':844})
            load(page, locale+'index.html')
            stage = page.locator('[data-context-stage]')
            flow_tabs = stage.get_by_role('tab')
            flow_tabs.nth(2).focus()
            page.keyboard.press('ArrowRight')
            check(flow_tabs.nth(0).get_attribute('aria-selected') == 'true', f'{locale}: homepage keyboard tabs wrap')
            page.keyboard.press('End')
            check(flow_tabs.nth(2).get_attribute('aria-selected') == 'true', f'{locale}: homepage keyboard End selects reuse')
            check(stage.locator('[data-fragment="c"]').is_hidden(), f'{locale}: unselected homepage source excluded')
            stage.locator('[data-context-item="c"]').check()
            check(stage.locator('[data-fragment="c"]').is_visible(), f'{locale}: selected source enters illustration')
            for box in stage.locator('[data-context-item]').all(): box.uncheck()
            check(stage.locator('[data-context-empty]').is_visible(), f'{locale}: empty selection has no fallback data')
            check(stage.locator('.context-fragment:visible').count() == 0, f'{locale}: excluded sources stay out')
            flow_tabs.nth(0).click()
            flow_tabs.nth(2).click()
            check(stage.locator('.context-fragment:visible').count() == 0, f'{locale}: tab switch preserves exclusions')
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
            tabs = page.get_by_role('tab')
            tabs.nth(0).focus()
            page.keyboard.press('ArrowRight')
            check(tabs.nth(1).get_attribute('aria-selected') == 'true', f'{locale}: keyboard tabs')
            original = page.locator('[data-record="b"] .source-text').text_content()
            page.locator('#sample-search').fill('users' if locale else '用户')
            check(page.locator('.sample-record:visible').count() == 2, f'{locale}: real keyword search')
            page.locator('#sample-search').fill('no-matching-sample-xyz')
            check(page.locator('.empty-search').is_visible(), f'{locale}: empty search state')
            page.locator('#sample-search').fill('')
            changed = 'Synthetic revised sentence <img src=x onerror=alert(1)> — not private data.'
            page.locator('#edit-b').fill(changed)
            check(page.locator('[data-record="b"] .source-text').text_content() == original, f'{locale}: original remains immutable')
            tabs.nth(2).click()
            check(changed in page.locator('[data-topic-records]').inner_text(), f'{locale}: topic follows working text')
            check(page.locator('[data-topic-records] img').count() == 0, f'{locale}: edited text cannot inject HTML')
            tabs.nth(3).click()
            page.locator('[data-build]').click()
            prepared = page.locator('#context-preview').input_value()
            check(changed in prepared and original not in prepared, f'{locale}: complete selected working text')
            check('Scope boundary' not in prepared if locale else '实现边界' not in prepared, f'{locale}: unselected material excluded')
            page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__testCopied=text}}})")
            page.locator('[data-copy]').click()
            page.wait_for_function('window.__testCopied !== undefined')
            check(page.evaluate('window.__testCopied') == prepared, f'{locale}: exact reviewed clipboard output')
            if OFFLINE:
                page.evaluate("""window.__nativeObjectURL=URL.createObjectURL; URL.createObjectURL=blob=>{window.__testBlob=blob;return window.__nativeObjectURL(blob)};document.addEventListener('click',e=>{if(e.target.closest('a[download]'))e.preventDefault()},true)""")
                page.locator('[data-export]').click()
                check(page.evaluate('window.__testBlob.text()') == prepared, f'{locale}: export blob equals preview (offline; download not certified)')
            else:
                with page.expect_download() as download:
                    page.locator('[data-export]').click()
                file = download.value.path()
                check(Path(file).read_text() == prepared, f'{locale}: actual downloaded file equals preview')
            page.locator('#sample-task').fill('A different synthetic task')
            check(page.locator('[data-copy]').is_disabled() and page.locator('[data-export]').is_disabled(), f'{locale}: stale output blocked')
            page.locator('[data-build]').click()
            page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('test denial')}}})")
            page.locator('[data-copy]').click()
            page.wait_for_function("document.activeElement.id==='context-preview'")
            check('unavailable' in page.locator('.context-status').inner_text() if locale else '不可用' in page.locator('.context-status').inner_text(), f'{locale}: clipboard failure is not success')
            for choice in page.locator('[data-select]').all(): choice.uncheck()
            page.locator('[data-build]').click()
            check(page.locator('[data-copy]').is_disabled(), f'{locale}: no selection cannot release')
            page.locator('[data-reset]').click()
            check(page.locator('#edit-b').input_value() == original, f'{locale}: reset clears changes')
            check(page.locator('#context-preview').input_value() == '', f'{locale}: reset clears prepared output')
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
            check(page.locator('h1').is_visible() and page.locator('#how').is_visible(), f'{locale}: static core content without JS')
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
