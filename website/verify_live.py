"""Read-only production readback. No user data, form submission or archive access."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright
import hashlib, json, os
from core_checks import verify_core
from flagship_checks import verify_home
from origin_checks import verify_hero, verify_origin, verify_typography

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('WEBSITE_TEST_OUTPUT', ROOT/'website-test-artifacts'))
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://inputarchive.com'
generated = (ROOT/'website/generated-paths.txt').read_text().splitlines()
paths = list(generated)
paths += ['assets/website/flagship.css', 'assets/website/narrow-board.js', 'assets/website/product-experience.css', 'assets/website/interior.css', 'assets/website/home-core-v2.js', 'assets/website/site.css', 'assets/website/site.js', 'assets/website/favicon.svg', 'assets/website/og-zh.png', 'assets/website/og-en.png']
paths += ['assets/website/asset-lock.json'] + list(json.loads((ROOT/'assets/website/asset-lock.json').read_text()))
paths = list(dict.fromkeys(paths))
checks = []
try:
    for relative in paths:
        url = BASE + '/' + relative
        request = Request(url, headers={'User-Agent':'PAIA-Website-Readback/1.0','Cache-Control':'no-cache'})
        try:
            response = urlopen(request, timeout=30)
        except HTTPError as error:
            if error.code != 404 or Path(relative).name != '404.html':
                raise
            response = error
        with response:
            body = response.read(2_000_000)
            if response.geturl().split('/')[2] != 'inputarchive.com':
                raise AssertionError('Unexpected production host redirect')
            expected = (ROOT/relative).read_bytes()
            match = body == expected
            checks.append({'path':relative,'status':response.status,'exact_bytes':match,'sha256':hashlib.sha256(body).hexdigest()})
            if not match:
                raise AssertionError('Deployment not at reviewed website bytes: '+relative)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
        review_pages = [p for p in generated if p.endswith('.html') and not p.startswith('en/')]
        review_pages.append('en/index.html')
        for width in (1440,390):
            for relative in review_pages:
                page = browser.new_page(viewport={'width':width,'height':900})
                errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                response=page.goto(BASE+'/'+relative,wait_until='load',timeout=45000)
                assert response and (response.ok or (Path(relative).name == '404.html' and response.status == 404))
                page.evaluate('document.fonts.ready')
                assert page.locator('h1').is_visible()
                assert page.locator('html').get_attribute('lang') == ('zh-CN' if relative.startswith('zh/') else 'en')
                def live_check(value, label):
                    checks.append({'path':relative,'viewport':width,'interaction':label,'pass':bool(value)})
                    if not value: raise AssertionError(label)
                verify_typography(page, live_check, relative)
                if relative in ('index.html', 'zh/index.html'):
                    verify_hero(page, live_check, en=not relative.startswith('zh/'), motion=width == 1440)
                    page.evaluate("scrollTo({top:0,behavior:'instant'})")
                    page.screenshot(path=str(OUT / f'live-{relative.replace("/", "-")}-{width}-hero.png'), animations='disabled')
                if relative in ('index.html','zh/index.html'):
                    verify_home(page, live_check, en=not relative.startswith('zh/'))
                if relative in ('demo.html','zh/demo.html'):
                    verify_core(page, live_check, en=not relative.startswith('zh/'), download_dir=OUT)
                    verify_origin(page, live_check, en=not relative.startswith('zh/'))
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert not errors, errors
                assert page.evaluate('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0 || i.loading==="lazy")')
                page.emulate_media(reduced_motion='reduce')
                page.evaluate('document.fonts.ready')
                page.evaluate('scrollTo(0,document.body.scrollHeight)')
                page.wait_for_timeout(150)
                page.screenshot(path=str(OUT/f'live-{relative.replace("/","-")}-{width}.png'),full_page=True)
                checks.append({'path':relative,'viewport':width,'browser_pass':True})
                page.close()
        browser.close()
except Exception as error:
    checks.append({'failure':str(error)})
finally:
    passed=not any('failure' in check for check in checks)
    (OUT/'live-review.json').write_text(json.dumps({'evidence':'CURRENT_LIVE_WEBSITE','expected_commit':os.environ.get('EXPECTED_WEBSITE_COMMIT',os.environ.get('GITHUB_SHA')),'pass':passed,'physical_device':False,'beta_form_submitted':False,'checks':checks},ensure_ascii=False,indent=2))
    print(json.dumps({'live_pass':passed,'checks':len(checks),'failures':[c['failure'] for c in checks if 'failure' in c]}))
    if not passed: raise SystemExit(1)
