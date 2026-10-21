"""Flagship website contracts, independent of the retired visual freeze.

Default execution uses the existing CI Playwright installation and real local
HTTP. --static-only runs no browser. All inputs are synthetic; contact transport
is intercepted, including pending and ambiguous outcomes. Nothing is submitted.
The earlier suites and baselines remain historical files, not current art
requirements. See FLAGSHIP_TEST_MIGRATION.md for the contract mapping.
"""
from collections import Counter
from functools import partial
from hashlib import sha256
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import unquote, urlsplit
import json
import os
import re
import struct
import subprocess
import sys
import traceback

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('WEBSITE_TEST_OUTPUT', ROOT / 'website-test-artifacts'))
DESIGN = 'flagship-20261021'
PAGES = ('index.html', 'how-it-works.html', 'use-cases.html', 'about.html',
         'demo.html', 'download.html', 'help.html', 'contact.html', 'blog.html',
         'article-beliefs.html', 'article-context.html', 'article-reuse.html',
         'principles.html', 'privacy-policy.html', 'terms.html', 'beta.html',
         'status.html', 'thanks.html', '404.html')
NOINDEX = {'demo.html', 'beta.html', 'status.html', 'thanks.html', '404.html'}
CONTACT_FIELDS = {'email', 'frequency', 'goal', 'contact_consent', 'language',
                  '_subject', '_template', '_captcha', '_honey'}
CONTACT_URL = 'https://formsubmit.co/haohongfei2001@gmail.com'
AJAX_URL = 'https://formsubmit.co/ajax/haohongfei2001@gmail.com'
RESULTS = []


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.source = source
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def all(self, tag):
        return [attrs for kind, attrs in self.tags if kind == tag]

    def with_attr(self, name):
        return [attrs for _, attrs in self.tags if name in attrs]


def check(condition, label):
    RESULTS.append({'check': label, 'pass': bool(condition)})
    if not condition:
        raise AssertionError(label)


def static_contracts():
    generated = (ROOT / 'website/generated-paths.txt').read_text().splitlines()
    expected = {prefix + page for prefix in ('', 'en/', 'zh/') for page in PAGES}
    check(set(generated) == expected | {'robots.txt', 'sitemap.xml'},
          'all 57 retained HTML routes and discovery files are generated')
    completed = subprocess.run([sys.executable, str(ROOT / 'website/build.py'), '--check'],
                               capture_output=True, text=True)
    check(completed.returncode == 0, 'generator exactly matches the checked-in website: ' + completed.stdout.strip())
    docs = {path: Document((ROOT / path).read_text()) for path in sorted(expected)}
    for name, doc in docs.items():
        prefix = 'zh/' if name.startswith('zh/') else ''
        route = name.rsplit('/', 1)[-1]
        canonical = {'beta.html': 'download.html', 'status.html': 'help.html'}.get(route, route)
        local = prefix + ('' if canonical == 'index.html' else canonical)
        check(doc.all('html')[0].get('lang') == ('zh-CN' if prefix else 'en'), name + ': static language')
        check(doc.all('body')[0].get('data-design') == DESIGN, name + ': current source generation')
        check(len(doc.all('h1')) == 1, name + ': one main heading')
        ids = [a['id'] for _, a in doc.tags if a.get('id')]
        check(not [key for key, count in Counter(ids).items() if count > 1], name + ': unique element identities')
        links = doc.all('link')
        check([a['href'] for a in links if a.get('rel') == 'canonical'] == ['https://inputarchive.com/' + local], name + ': canonical route')
        alternates = {a.get('hreflang'): a.get('href') for a in links if a.get('rel') == 'alternate'}
        suffix = '' if canonical == 'index.html' else canonical
        check(alternates == {'en': 'https://inputarchive.com/' + suffix,
                             'zh-Hans': 'https://inputarchive.com/zh/' + suffix,
                             'x-default': 'https://inputarchive.com/' + suffix}, name + ': paired language routes')
        check(any(a.get('name') == 'description' and a.get('content') for a in doc.all('meta')), name + ': meaningful metadata')
        robots = [a.get('content', '') for a in doc.all('meta') if a.get('name') == 'robots']
        check(any('noindex' in value for value in robots) == (route in NOINDEX), name + ': appropriate indexing boundary')
        for attrs in doc.with_attr('aria-labelledby') + doc.with_attr('aria-describedby') + doc.with_attr('aria-controls'):
            for attr in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
                for target in attrs.get(attr, '').split():
                    check(target in ids, name + ': valid ' + attr + ' target ' + target)
        for attrs in doc.all('a') + links + doc.all('script') + doc.all('img'):
            value = attrs.get('href', attrs.get('src', ''))
            parsed = urlsplit(value)
            if parsed.scheme in ('mailto', 'tel') or (parsed.netloc and parsed.netloc != 'inputarchive.com'):
                continue
            if not parsed.path:
                target = ROOT / name
            elif parsed.path.startswith('/'):
                target = ROOT / unquote(parsed.path).lstrip('/')
            else:
                target = ROOT / name
                target = target.parent / unquote(parsed.path)
            if target.is_dir():
                target /= 'index.html'
            check(target.is_file(), name + ': internal destination ' + value)
            if parsed.fragment and target.suffix == '.html':
                target_doc = Document(target.read_text())
                check(parsed.fragment in [a.get('id') for _, a in target_doc.tags], name + ': fragment ' + value)
        for img in doc.all('img'):
            check('alt' in img, name + ': image has an explicit text alternative')
        scripts = doc.all('script')
        check(all(s.get('src', '').startswith('/assets/website/') for s in scripts), name + ': website-owned scripts only')
        contact_scripts = [s for s in scripts if 'flagship-contact.js' in s.get('src', '')]
        check(len(contact_scripts) == (1 if route == 'contact.html' else 0), name + ': contact transport has one explicit owner')
        check(all('defer' in s for s in contact_scripts), name + ': contact binds after static form markup')
        check(not any('refinement.js' in s.get('src', '') or s.get('src', '').split('?')[0].endswith('/site.js') for s in scripts), name + ': no duplicate legacy controller')
        check(not any(a.get('href', '').endswith(('/beta.html', '/status.html')) for a in doc.all('a')), name + ': navigation uses current entries')
        social = [a.get('content') for a in doc.all('meta') if a.get('property') == 'og:image']
        check(len(social) == 1, name + ': one social image')
        social_path = ROOT / urlsplit(social[0]).path.lstrip('/')
        with social_path.open('rb') as stream:
            header = stream.read(24)
        check(header[:8] == b'\x89PNG\r\n\x1a\n' and struct.unpack('>II', header[16:24]) == (1200, 630), name + ': usable social image dimensions')

    for page in PAGES:
        check((ROOT / page).read_bytes() == (ROOT / 'en' / page).read_bytes(), page + ': exact English legacy alias')
    manifest = json.loads((ROOT / 'website/launch_manifest.json').read_text())
    for prefix in ('', 'zh/'):
        for page in ('download.html', 'beta.html'):
            doc = docs[prefix + page]
            installs = [(tag, attrs) for tag, attrs in doc.tags if 'release-install' in attrs.get('class', '').split()]
            check(len(installs) == 1, prefix + page + ': single installation action')
            tag, attrs = installs[0]
            if manifest['chrome_store_url'] is None:
                check(tag == 'button' and 'disabled' in attrs and attrs.get('aria-describedby') == 'install-availability', prefix + page + ': no false installation target')
            else:
                check(tag == 'a' and attrs.get('href') == manifest['chrome_store_url'], prefix + page + ': exact verified installation target')
        contact = docs[prefix + 'contact.html']
        check(len(contact.all('form')) == 1 and contact.all('form')[0].get('action') == CONTACT_URL and contact.all('form')[0].get('method', '').upper() == 'POST', prefix + ': retained native contact destination')
        consent = [a for a in contact.all('input') if a.get('name') == 'contact_consent']
        check(len(consent) == 1 and 'required' in consent[0] and 'checked' not in consent[0], prefix + ': fresh explicit forwarding consent')
        email = [a for a in contact.all('input') if a.get('name') == 'email'][0]
        check(email.get('type') == 'email' and 'required' in email and email.get('maxlength') == '254', prefix + ': native email validation')
        check('name="_subject" value="PAIA — Contact"' in contact.source, prefix + ': contact purpose is not a beta application')
        check(len(docs[prefix + 'help.html'].all('details')) >= 12, prefix + ': complete practical help retained')
        principles = docs[prefix + 'principles.html'].source
        permission_names = ('保存自己的输入', '允许 AI 整理', '允许外部 AI 读取', '同步到自己的云账号') if prefix else ('Keep your inputs', 'Allow AI organization', 'Allow external AI reading', 'Sync to your own cloud account')
        check(all(name in principles for name in permission_names), prefix + ': capture processing external reading and sync remain four separate permissions')
        for page in ('index.html', 'demo.html'):
            doc = docs[prefix + page]
            check([a['data-space'] for a in doc.with_attr('data-space')] == ['archive', 'thought', 'context'], prefix + page + ': three main product spaces')
            check(doc.with_attr('data-archive-search') and not doc.with_attr('data-thought-search'), prefix + page + ': archive discovery search remains available')
            contexts = doc.with_attr('data-context')
            check(len(doc.with_attr('data-context-scope')) == 4 * len(contexts), prefix + page + ': four independent context scopes')
            check(all(a.get('aria-checked') == 'false' and a.get('role') == 'switch' for a in doc.with_attr('data-context-scope') + doc.with_attr('data-context-global')), prefix + page + ': fresh permissions are closed')
            check(all('type' in a and a['type'] == 'button' for a in doc.with_attr('data-prompt-pick')), prefix + page + ': prompt selection cannot submit a form')
            check(len(doc.with_attr('data-prompt-manage')) == len(doc.with_attr('data-prompt-demo')) == len(doc.with_attr('data-prompt-manager')), prefix + page + ': prompt management has a dedicated accessible entry')
            check(all('title' not in a for _, a in doc.tags if any(key.startswith('data-prompt-') for key in a)), prefix + page + ': prompt surface has no native hover hints')
    legal = json.loads((ROOT / 'website/flagship_legal.json').read_text())
    for lang, prefix in [('en', ''), ('zh', 'zh/')]:
        for page in ('privacy-policy.html', 'terms.html'):
            check(legal[lang][page] in docs[prefix + page].source, prefix + page + ': retained legal content source')
    sitemap = (ROOT / 'sitemap.xml').read_text()
    check('/beta.html' not in sitemap and '/status.html' not in sitemap, 'legacy aliases stay out of sitemap')
    for route in ('download.html', 'help.html', 'contact.html'):
        check('/' + route in sitemap, route + ': current route remains discoverable')
    check(sha256((ROOT / 'assets/website/brand/paia-logo-v1.webp').read_bytes()).hexdigest() == 'e94ce73c20a46d40aa60d33eb87065906f256527da4948062c9ff30f6923a137', 'creator artwork is byte-preserved')
    runtime = '\n'.join(path.read_text() for path in (ROOT / 'assets/website').glob('flagship*.js') if path.name != 'flagship-contact.js')
    check(not re.search(r'\b(?:fetch|WebSocket|XMLHttpRequest|sendBeacon)\s*\(', runtime), 'page-local demonstrations have no network transport')
    check(not re.search(r'\b(?:localStorage|sessionStorage|indexedDB)\s*\.', runtime), 'demonstrations do not persist private edits')
    inherited = (ROOT / 'assets/website/refinement.js').read_text()
    contact_runtime = (ROOT / 'assets/website/flagship-contact.js').read_text()
    start = inherited.index('  function refineApplication() {')
    end = inherited.index('\n  const style = document.querySelector', start)
    check(inherited[start:end] in contact_runtime, 'existing complete contact controller is preserved byte-for-byte')


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def browser_contracts():
    # This function is never entered by --static-only; browser execution belongs
    # to the existing website CI or an explicitly permitted browser environment.
    from playwright.sync_api import sync_playwright
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = 'http://127.0.0.1:' + str(server.server_port)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_EXECUTABLE'), args=['--no-sandbox'])
            version = browser.version
            context = browser.new_context()
            external = []
            errors = []
            def route_request(route):
                if route.request.url.startswith(origin + '/'):
                    route.continue_()
                else:
                    external.append({'url': route.request.url, 'method': route.request.method})
                    route.abort()
            context.route('**/*', route_request)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            for width in (1440, 768, 390, 320):
                page.set_viewport_size({'width': width, 'height': 900})
                for prefix in ('', 'zh/'):
                    for route in PAGES:
                        name = prefix + route
                        response = page.goto(origin + '/' + name, wait_until='load')
                        page.evaluate('document.fonts.ready')
                        tag = name + '/' + str(width)
                        check(response.status == 200, tag + ': real HTTP route')
                        check(page.locator('h1').is_visible(), tag + ': visible main heading')
                        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), tag + ': no horizontal page overflow')
                        check(page.evaluate('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0||i.loading==="lazy")'), tag + ': image assets load')
                        check(not errors, tag + ': no JavaScript errors')
                        check(not external, tag + ': no unsolicited external requests')
                        if width == 320:
                            page.add_style_tag(content='html{font-size:200%!important}')
                            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), tag + ': 200% text reflows')
                            mobile = page.locator('.mobile-menu')
                            mobile.locator('summary').focus()
                            page.keyboard.press('Enter')
                            check(mobile.evaluate('e=>{const r=e.querySelector("nav").getBoundingClientRect();return e.open&&r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}'), tag + ': enlarged navigation stays reachable in the viewport')
                            page.keyboard.press('Escape')
                            check(not mobile.evaluate('e=>e.open') and mobile.locator('summary').evaluate('e=>e===document.activeElement'), tag + ': enlarged menu restores focus')
                        if route in ('index.html', 'demo.html', 'about.html') and width in (1440, 390):
                            page.emulate_media(reduced_motion='reduce')
                            page.screenshot(path=str(OUT / (name.replace('/', '-') + '-' + str(width) + '.png')), full_page=True)
                            page.emulate_media(reduced_motion='no-preference')
            for prefix in ('', 'zh/'):
                page.set_viewport_size({'width': 390, 'height': 844})
                page.goto(origin + '/' + prefix + 'index.html')
                menu = page.locator('.mobile-menu')
                menu.locator('summary').focus()
                page.keyboard.press('Enter')
                check(menu.evaluate('e=>e.open'), prefix + ': keyboard opens mobile navigation')
                page.keyboard.press('Escape')
                check(not menu.evaluate('e=>e.open') and menu.locator('summary').evaluate('e=>e===document.activeElement'), prefix + ': Escape closes menu and restores focus')
                page.emulate_media(reduced_motion='reduce')
                check(page.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'"), prefix + ': reduced motion respects native reading')
                page.emulate_media(forced_colors='active', reduced_motion='reduce')
                check(page.locator('h1').evaluate("e=>{const s=getComputedStyle(e);return s.color!==s.backgroundColor&&!['transparent','rgba(0, 0, 0, 0)'].includes(s.webkitTextFillColor)}"), prefix + ': title remains readable in forced colors')
                page.emulate_media(forced_colors='none', reduced_motion='no-preference')
                for width in (1280, 390):
                    page.set_viewport_size({'width': width, 'height': 900})
                    exercise_demo(page, origin, prefix)
                exercise_contact(browser, origin, prefix)
            check(not external, 'complete page-local journeys make no external requests')
            check(not errors, 'complete page-local journeys have no JavaScript errors')
            context.close()
            for prefix in ('', 'zh/'):
                nojs = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
                nojs.route('**/*', route_request)
                page = nojs.new_page()
                for route in ('index.html', 'about.html', 'how-it-works.html', 'help.html', 'contact.html', 'download.html'):
                    page.goto(origin + '/' + prefix + route, wait_until='load')
                    check(page.locator('h1').is_visible() and page.locator('main').inner_text().strip(), prefix + route + ': essential content without JavaScript')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), prefix + route + ': no-JS mobile reflow')
                    if route == 'contact.html':
                        check(page.locator('form').get_attribute('action') == CONTACT_URL and page.locator('form').get_attribute('method') == 'POST', prefix + ': native no-JS contact fallback retained')
                        check(not page.locator('[name=contact_consent]').is_checked(), prefix + ': no-JS consent remains explicit')
                    if route == 'download.html':
                        if json.loads((ROOT / 'website/launch_manifest.json').read_text())['chrome_store_url'] is None:
                            check(page.locator('.release-install').is_disabled(), prefix + ': no-JS cannot bypass unavailable installation')
                    if route == 'help.html':
                        first = page.locator('details.nr-details').first
                        first.locator('summary').click()
                        check(first.evaluate('e=>e.open'), prefix + ': native help works without JavaScript')
                nojs.close()
            check(not external, 'no-JS pages make no unsolicited external requests')
            browser.close()
            return version
    finally:
        server.shutdown()


def exercise_demo(page, origin, prefix):
    label = prefix + 'demo/' + str(page.viewport_size['width'])
    page.goto(origin + '/' + prefix + 'demo.html', wait_until='load')
    work = page.locator('[data-workspace]')
    tabs = work.locator('[data-space]')
    tabs.first.focus()
    page.keyboard.press('ArrowRight')
    check(work.locator('[data-space="thought"]').get_attribute('aria-selected') == 'true', label + ': arrow key selects a product space')
    page.keyboard.press('End')
    check(work.locator('[data-space="context"]').get_attribute('aria-selected') == 'true', label + ': End reaches Context')
    page.keyboard.press('Home')
    check(work.locator('[data-space="archive"]').get_attribute('aria-selected') == 'true', label + ': Home returns to Archive')
    work.locator('[data-entry="0"]').click()
    source = work.locator('[data-original-text]').text_content()
    original = work.locator('[data-working-text]').text_content()
    check(source == original, label + ': first working expression begins with its exact source')
    work.locator('[data-edit]').click()
    draft = 'A different thought — 不是自动得出的结论。\nKeep this condition: if α > 0. 👩🏽\u200d💻'
    work.locator('[data-edit-text]').fill(draft)
    work.locator('[data-entry="1"]').click()
    check(work.locator('[data-edit-text]').is_visible() and work.locator('[data-edit-text]').input_value() == draft, label + ': unsaved edit survives attempted entry navigation')
    work.locator('[data-save-edit]').click()
    check(work.locator('[data-working-text]').text_content() == draft, label + ': full Unicode and newline edit preserved')
    work.locator('[data-source-toggle]').click()
    check(work.locator('[data-original-text]').text_content() == source, label + ': work edits cannot overwrite the original source')
    work.locator('[data-entry="1"]').click()
    work.locator('[data-entry="0"]').click()
    check(work.locator('[data-working-text]').text_content() == draft, label + ': edits survive same-page navigation')
    work.locator('[data-archive-search]').fill('α > 0')
    check(work.locator('[data-entry]:visible').count() == 1 and work.locator('[data-entry="0"]').is_visible(), label + ': search uses current working expression')
    work.locator('[data-edit]').click()
    draft = draft.replace('α > 0', 'β < 0')
    work.locator('[data-edit-text]').fill(draft)
    work.locator('[data-save-edit]').click()
    check(work.locator('[data-entry]:visible').count() == 0 and work.locator('[data-search-empty]').is_visible(), label + ': saving re-evaluates an already active archive search')
    work.locator('[data-archive-search]').fill('NO_MATCH_7e8e4e9b')
    check(work.locator('[data-entry]:visible').count() == 0 and work.locator('[data-search-empty]').is_visible(), label + ': honest no-match state')
    work.locator('[data-archive-search]').fill('')
    work.locator('[data-space="thought"]').click()
    work.locator('[data-section="writing"]').click()
    check(work.locator('[data-thought-reader]').is_visible() and draft not in work.locator('[data-section-text]').text_content(), label + ': section reading does not mix a sibling entry')
    work.locator('[data-thought-back]').click()
    check(work.locator('.thought-directory').is_visible(), label + ': return to the same topic directory')
    work.locator('[data-space="context"]').click()
    ctx = work.locator('[data-context]')
    check(ctx.locator('[role=switch][aria-checked=true]').count() == 0, label + ': all scopes begin closed')
    ctx.locator('[data-context-open="info"]').click()
    check(ctx.locator('dialog').is_visible() and ctx.locator('[role=switch][aria-checked=true]').count() == 0, label + ': inspecting content grants no access')
    ctx.locator('[data-context-close]').click()
    check(ctx.locator('[data-context-open="info"]').evaluate('e=>e===document.activeElement'), label + ': closing details restores focus')
    for key in ('info', 'rules', 'now'):
        ctx.locator('[data-context-open="' + key + '"]').click()
        editor = ctx.locator('[data-context-text="' + key + '"]')
        personal = 'My own ' + key + ' — 保留自己的措辞。\nAn unfinished thought 👩🏽\u200d💻'
        check(editor.is_visible() and bool(editor.input_value()), label + '/' + key + ': personal content has a direct editor')
        editor.fill(personal)
        ctx.locator('[data-context-remove="' + key + '"]').click()
        check(ctx.locator('[data-context-empty="' + key + '"]').is_visible() and not ctx.locator('[data-context-entry="' + key + '"]').is_visible(), label + '/' + key + ': removal has an explicit empty state')
        ctx.locator('[data-context-undo="' + key + '"]').click()
        check(editor.input_value() == personal, label + '/' + key + ': undo restores the exact edited content')
        check(ctx.locator('[role=switch][aria-checked=true]').count() == 0, label + '/' + key + ': editing removal and undo do not grant access')
        ctx.locator('[data-context-close]').click()
        ctx.locator('[data-context-open="' + key + '"]').click()
        check(editor.input_value() == personal, label + '/' + key + ': direct edit survives closing and reopening')
        ctx.locator('[data-context-close]').click()
    ctx.locator('[data-context-scope="rules"]').click()
    check(ctx.locator('[data-context-global]').get_attribute('aria-checked') == 'false' and not ctx.locator('dialog').is_visible(), label + ': child scope neither opens its parent nor navigates')
    ctx.locator('[data-context-open="inputs"]').click()
    topic = ctx.locator('[data-topic-allow="product"]')
    check(topic.get_attribute('aria-checked') == 'false' and ctx.locator('[data-topic-allow="writing"]').get_attribute('aria-checked') == 'false', label + ': every new Topic starts closed')
    topic.click()
    check(topic.get_attribute('aria-checked') == 'true' and ctx.locator('[data-context-scope="inputs"]').get_attribute('aria-checked') == 'false' and ctx.locator('[data-context-global]').get_attribute('aria-checked') == 'false', label + ': Topic choice cannot open card or global access')
    check(ctx.locator('[data-topic-allow="writing"]').get_attribute('aria-checked') == 'false', label + ': one Topic choice does not open another')
    check(source not in ctx.locator('[data-context-detail]').text_content() and draft not in ctx.locator('[data-context-detail]').text_content(), label + ': My Inputs refers to Topics instead of copying archive bodies')
    ctx.locator('[data-context-close]').click()
    ctx.locator('[data-context-global]').click()
    check(re.search(r'未连接|没有连接|not connected|[Nn]o AI connection', ctx.locator('[data-context-status]').inner_text()), label + ': selected access is not a fake live connection')
    ctx.locator('[data-context-global]').click()
    check(ctx.locator('[data-context-scope="rules"]').get_attribute('aria-checked') == 'true', label + ': global pause retains card choices')
    ctx.locator('[data-context-open="inputs"]').click()
    check(ctx.locator('[data-topic-allow="product"]').get_attribute('aria-checked') == 'true', label + ': pause and reopen retain Topic choice')
    ctx.locator('[data-context-close]').click()
    prompt = page.locator('[data-prompt-demo]')
    composer = prompt.locator('[data-composer]')
    initial_composer = composer.input_value()
    prompt.locator('[data-prompt-toggle]').click()
    row_ids = lambda: prompt.locator('[data-prompt-list] [data-prompt-id]').evaluate_all('rows=>rows.map(e=>e.dataset.promptId)')
    initial_order = row_ids()
    initial_wording = prompt.locator('[data-prompt-list] [data-prompt-id="p2"]').get_attribute('data-prompt-pick')
    prompt.locator('[data-prompt-manage]').click()
    manager = prompt.locator('[data-prompt-manager]')
    check(manager.is_visible() and manager.locator('[data-prompt-manager-row]').count() == 6, label + ': prompt management is reachable with all six examples')
    manager.locator('[data-prompt-edit="p2"]').click()
    field = manager.locator('[data-prompt-text="p2"]')
    cluster = '👩🏽\u200d💻'
    field.fill(cluster * 151)
    manager.locator('[data-prompt-save="p2"]').click()
    check(field.is_visible() and field.input_value() == cluster * 151 and field.get_attribute('aria-invalid') == 'true' and prompt.locator('[data-prompt-list] [data-prompt-id="p2"]').get_attribute('data-prompt-pick') == initial_wording, label + ': 151 graphemes remain editable and never silently enter quick reuse')
    field.fill(cluster * 150)
    manager.locator('[data-prompt-save="p2"]').click()
    check(manager.is_visible() and prompt.locator('[data-prompt-list] [data-prompt-id="p2"]').get_attribute('data-prompt-pick') == cluster * 150, label + ': exactly 150 compound graphemes remain intact and eligible')
    manager.locator('[data-prompt-edit="p2"]').click()
    edited_prompt = '  Keep my exact words — 保留犹豫。\nThen ask a useful question.  '
    field.fill(edited_prompt)
    page.keyboard.press('Escape')
    check(not manager.is_visible() and prompt.locator('[data-prompt-board]').is_visible(), label + ': Escape closes management without collapsing the board')
    prompt.locator('[data-prompt-manage]').click()
    check(field.is_visible() and field.input_value() == edited_prompt, label + ': closing and reopening management preserves the unfinished edit')
    manager.locator('[data-prompt-save="p2"]').click()
    check(manager.is_visible() and prompt.locator('[data-prompt-list] [data-prompt-id="p2"]').get_attribute('data-prompt-pick') == edited_prompt, label + ': prompt save retains all authored whitespace and stays in management')
    unchanged_prompt = manager.locator('[data-prompt-edit="p3"]').text_content()
    manager.locator('[data-prompt-edit="p3"]').click()
    manager.locator('[data-prompt-text="p3"]').fill('This edit is intentionally cancelled.')
    manager.locator('[data-prompt-cancel="p3"]').click()
    check(manager.locator('[data-prompt-edit="p3"]').text_content() == unchanged_prompt, label + ': cancelling a prompt edit leaves its wording intact')
    manager.locator('[data-prompt-pin="p2"]').click()
    check(manager.locator('[data-prompt-pin="p2"]').get_attribute('aria-pressed') == 'true' and row_ids()[0] == 'p2', label + ': explicit pin moves the chosen prompt ahead of unpinned rows')
    pinned_order = row_ids()
    manager.locator('[data-prompt-hide="p2"]').click()
    check('p2' not in row_ids() and manager.locator('[data-prompt-manager-row="p2"]').count() == 0, label + ': hide removes the prompt from both ordinary surfaces')
    manager.locator('[data-prompt-undo]').click()
    check(row_ids() == pinned_order and manager.locator('[data-prompt-pin="p2"]').get_attribute('aria-pressed') == 'true' and prompt.locator('[data-prompt-list] [data-prompt-id="p2"]').get_attribute('data-prompt-pick') == edited_prompt, label + ': undo restores the same prompt identity text pin and order')
    manager.locator('[data-prompt-pin="p4"]').click()
    manager.locator('[data-prompt-down="p2"]').click()
    check(row_ids()[:2] == ['p4', 'p2'] and manager.locator('[data-prompt-manager-row]').evaluate_all('rows=>rows.map(e=>e.dataset.promptManagerRow)') == row_ids(), label + ': explicit manual order stays identical in management and the board')
    manager.locator('[data-prompt-manager-close]').click()
    check(prompt.locator('[data-prompt-manage]').evaluate('e=>e===document.activeElement') and prompt.locator('[data-prompt-board]').is_visible(), label + ': management close restores its invoking control and board state')
    check(composer.input_value() == initial_composer and work.locator('[data-original-text]').text_content() == source and work.locator('[data-working-text]').text_content() == draft, label + ': prompt management does not change the composer or archive')
    draft = 'Begin [keep my selected text] END\n完整草稿 👩🏽\u200d💻'
    composer.fill(draft)
    composer.evaluate("e=>{e.focus();e.setSelectionRange(6, 28);e.dispatchEvent(new Event('select',{bubbles:true}));}")
    at = composer.evaluate('e=>e.selectionEnd')
    pick = prompt.locator('[data-prompt-list] [data-prompt-id="p2"]')
    wording = pick.get_attribute('data-prompt-pick')
    before_order = row_ids()
    pick.click()
    check(composer.input_value() == draft[:at] + '\n\n' + wording + '\n\n' + draft[at:], label + ': exact separated insertion preserves selected and surrounding draft text')
    check(composer.evaluate('e=>e===document.activeElement'), label + ': insertion returns focus to the composer')
    check(prompt.locator('[data-prompt-board]').is_visible() and row_ids() == before_order, label + ': insertion keeps the prompt board open and order stable')
    before = composer.input_value()
    composer.dispatch_event('compositionstart', {'data': '未完成'})
    pick.click()
    check(composer.input_value() == before, label + ': IME composition blocks insertion without losing text')
    composer.dispatch_event('compositionend', {'data': '未完成'})
    prompt.locator('[data-prompt-search]').fill('NO_MATCH_7e8e4e9b')
    check(prompt.locator('.prompt-list [data-prompt-pick]:visible').count() == 0 and prompt.locator('[data-prompt-empty]').is_visible(), label + ': prompt search has an honest empty state')
    prompt.locator('[data-prompt-search]').fill('')
    prompt.locator('[data-prompt-search]').press('Escape')
    check(not prompt.locator('[data-prompt-board]').is_visible() and prompt.locator('[data-prompt-toggle]').evaluate('e=>e===document.activeElement'), label + ': keyboard close restores the stable entry')
    prompt.locator('[data-prompt-reset]').click()
    check(composer.input_value() == initial_composer and row_ids() == initial_order and prompt.locator('[data-prompt-list] [data-prompt-id="p2"]').get_attribute('data-prompt-pick') == initial_wording, label + ': explicit sample reset restores its prompt text order and composer')
    check(ctx.locator('[data-context-scope="rules"]').get_attribute('aria-checked') == 'true' and work.locator('[data-original-text]').text_content() == source, label + ': prompt reset never changes independent context choices or source text')
    check(page.evaluate('localStorage.length===0&&sessionStorage.length===0'), label + ': no persisted personal edits or demo grants')
    page.reload(wait_until='load')
    work = page.locator('[data-workspace]')
    work.locator('[data-entry="0"]').click()
    check(work.locator('[data-working-text]').text_content() == original, label + ': reload clears transient work edits')
    check(page.locator('[data-context] [role=switch][aria-checked=true]').count() == 0, label + ': reload never restores demo grants')


def exercise_contact(browser, origin, prefix):
    outcomes = ('success', 'boolean-success', 'false', 'non-json', 'server-error',
                'network-error', 'activation', 'timeout')
    for outcome in outcomes:
        ctx = browser.new_context(viewport={'width': 390, 'height': 844})
        attempted_real = []
        def refuse_remote(route):
            if route.request.url.startswith(origin + '/'):
                route.continue_()
            else:
                attempted_real.append(route.request.url)
                route.abort()
        ctx.route('**/*', refuse_remote)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(origin + '/' + prefix + 'contact.html', wait_until='load')
        page.evaluate("""()=>{
          window.contractRequests=[];
          window.fetch=(url,options)=>new Promise((resolve,reject)=>{
            window.contractRequests.push({url,method:options.method,credentials:options.credentials,referrerPolicy:options.referrerPolicy,redirect:options.redirect,payload:JSON.parse(options.body)});
            window.contractResolve=(body,status=200)=>resolve(new Response(body,{status,headers:{'Content-Type':'application/json'}}));
            window.contractReject=()=>reject(new TypeError('Synthetic network error'));
            options.signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')),{once:true});
          });
        }""")
        form = page.locator('form.beta-form')
        submit = form.locator('button[type=submit]')
        label = prefix + 'contact/' + outcome
        check(form.get_attribute('data-submission') == 'idle', label + ': controller initialized')
        submit.click()
        check(page.evaluate('contractRequests.length') == 0, label + ': empty form never transmits')
        page.locator('[name=email]').fill('not-an-email')
        submit.click()
        check(page.evaluate('contractRequests.length') == 0, label + ': invalid email never transmits')
        page.locator('[name=email]').fill('synthetic@example.invalid')
        page.locator('[name=goal]').fill('Synthetic message — 保留这段原文。')
        submit.click()
        check(page.evaluate('contractRequests.length') == 0, label + ': unchecked consent never transmits')
        page.locator('[name=contact_consent]').check()
        page.locator('[name=_honey]').evaluate("e=>e.value='not-empty'")
        page.locator('form').evaluate("e=>e.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))")
        check(page.evaluate('contractRequests.length') == 0, label + ': honeypot rejects without transmitting')
        page.locator('[name=_honey]').evaluate("e=>e.value=''")
        submit.click()
        form.evaluate("e=>e.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))")
        check(page.evaluate('contractRequests.length') == 1, label + ': duplicate pending submission is blocked')
        check(form.get_attribute('data-submission') == 'pending', label + ': waiting is explicit')
        check(page.locator('[name=email]').get_attribute('readonly') is not None and page.locator('[name=contact_consent]').is_disabled() and submit.is_disabled(), label + ': pending snapshot is locked')
        request = page.evaluate('contractRequests[0]')
        check(request['url'] == AJAX_URL and request['method'] == 'POST', label + ': exact consented endpoint')
        check(request['credentials'] == 'omit' and request['referrerPolicy'] == 'no-referrer' and request['redirect'] == 'error', label + ': cookies referrer and redirects are excluded')
        check(set(request['payload']) == CONTACT_FIELDS and request['payload']['contact_consent'] == 'yes', label + ': exact fields and affirmative consent only')
        if outcome == 'success':
            page.evaluate('contractResolve(JSON.stringify({success:"true"}))')
        elif outcome == 'boolean-success':
            page.evaluate('contractResolve(JSON.stringify({success:true}))')
        elif outcome == 'false':
            page.evaluate('contractResolve(JSON.stringify({success:false}))')
        elif outcome == 'non-json':
            page.evaluate('contractResolve("<html>not a receipt</html>")')
        elif outcome == 'server-error':
            page.evaluate('contractResolve("{}",503)')
        elif outcome == 'network-error':
            page.evaluate('contractReject()')
        elif outcome == 'activation':
            page.evaluate('contractResolve(JSON.stringify({success:true,message:"Please activate your email"}))')
        # Timeout exercises the actual unchanged 15s AbortController path.
        accepted = outcome in ('success', 'boolean-success')
        expected = 'received' if accepted else 'unconfirmed'
        page.wait_for_function('(expected)=>document.querySelector("form.beta-form").dataset.submission===expected', arg=expected, timeout=18000)
        check(form.get_attribute('data-submission') == expected, label + ': truthful outcome')
        check(page.locator('[name=goal]').input_value() == 'Synthetic message — 保留这段原文。', label + ': all outcome paths retain user text')
        check(page.evaluate('contractRequests.length') == 1, label + ': no automatic retry or second native POST')
        check(page.locator('.pf-form-result').evaluate('e=>e===document.activeElement'), label + ': outcome has accessible focused feedback')
        if accepted:
            check(submit.is_disabled(), label + ': accepted submission cannot be repeated accidentally')
            feedback = page.locator('.pf-form-result').inner_text()
            check('不等于邮件已送达' in feedback or 'does not guarantee inbox delivery' in feedback, label + ': service acceptance is not claimed inbox delivery')
            form.evaluate("e=>e.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))")
            check(page.evaluate('contractRequests.length') == 1, label + ': completed state also rejects a duplicate submit event')
        else:
            check(not submit.is_disabled() and page.locator('[name=email]').get_attribute('readonly') is None and not page.locator('[name=contact_consent]').is_disabled(), label + ': unknown outcome permits an explicit editable retry')
            submit.click()
            check(page.evaluate('contractRequests.length') == 2 and form.get_attribute('data-submission') == 'pending', label + ': one explicit retry creates exactly one fresh request')
            page.evaluate('contractResolve(JSON.stringify({success:false}))')
            page.wait_for_function('document.querySelector("form.beta-form").dataset.submission==="unconfirmed"')
            check(page.evaluate('contractRequests.length') == 2, label + ': explicit retry never starts an automatic follow-up')
        check(not attempted_real and not errors, label + ': no real transmission or script errors')
        ctx.close()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    static_only = '--static-only' in sys.argv
    browser_version = None
    try:
        if '--offline-render' in sys.argv and not static_only:
            raise ValueError('The flagship browser gate requires actual HTTP. Use --static-only when browser access is unavailable; do not relabel a DOM render as HTTP acceptance.')
        static_contracts()
        if not static_only:
            browser_version = browser_contracts()
    except Exception as error:
        RESULTS.append({'check': 'suite execution', 'pass': False,
                        'error': str(error), 'traceback': traceback.format_exc()})
    report = {'generation': DESIGN, 'evidence': 'STATIC_ONLY' if static_only else 'SYNTHETIC_HTTP_BROWSER',
              'browser': browser_version or 'NOT_RUN', 'private_data': False,
              'contact_submitted': False, 'production_or_extension_certified': False,
              'checks': len(RESULTS), 'failed': [r for r in RESULTS if not r['pass']],
              'tests': RESULTS}
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'tests'}, ensure_ascii=False))
    return 1 if report['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
