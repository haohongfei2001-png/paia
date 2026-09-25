"""Read-only production readback. No user data, form submission or archive access."""
from pathlib import Path
from urllib.request import Request, urlopen
from playwright.sync_api import sync_playwright
import hashlib, json, os

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('WEBSITE_TEST_OUTPUT', ROOT/'website-test-artifacts'))
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://inputarchive.com'
paths = [p for p in (ROOT/'website/generated-paths.txt').read_text().splitlines() if p not in ('404.html', 'en/404.html')]
paths += ['assets/website/site.css', 'assets/website/site.js', 'assets/website/demo.js', 'assets/website/og-zh.png', 'assets/website/og-en.png']
checks = []
try:
    for relative in paths:
        url = BASE + '/' + relative
        request = Request(url, headers={'User-Agent':'PAIA-Website-Readback/1.0','Cache-Control':'no-cache'})
        with urlopen(request, timeout=30) as response:
            body = response.read(2_000_000)
            if response.geturl().split('/')[2] != 'inputarchive.com':
                raise AssertionError('Unexpected production host redirect')
            expected = (ROOT/relative).read_bytes()
            match = body == expected
            checks.append({'path':relative,'status':response.status,'exact_bytes':match,'sha256':hashlib.sha256(body).hexdigest()})
            if not match:
                raise AssertionError('Deployment not at reviewed website bytes: '+relative)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width in (1440,390):
            for relative in ('index.html','en/index.html','beta.html','en/beta.html','demo.html','en/demo.html'):
                page = browser.new_page(viewport={'width':width,'height':900})
                errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                response=page.goto(BASE+'/'+relative,wait_until='networkidle',timeout=45000)
                assert response and response.ok
                assert page.locator('h1').is_visible()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert not errors, errors
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
