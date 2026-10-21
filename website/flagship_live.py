"""Read-only exact-byte and public-browser verification for the flagship site.

Invoked by the unchanged live workflow only after an authorized main deployment.
It is not a deployment command. It never submits contact forms or accesses a
personal archive; the only exercised inputs are ephemeral website examples.
"""
from hashlib import sha256
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen
import json
import os
import posixpath
import re
import traceback

from flagship_tests import (ROOT, OUT, Document, RESULTS, check, static_contracts,
                            exercise_demo)

BASE = 'https://inputarchive.com'


def active_paths():
    """Reviewed generated routes plus their actual linked assets and CSS fonts.

    The inventory follows current source dependencies, not retired visual files.
    No request is made while collecting it, and every listed path must exist.
    """
    generated = (ROOT / 'website/generated-paths.txt').read_text().splitlines()
    paths = set(generated)
    pending_css = []

    def add_asset(value, parent=''):
        if not value:
            return
        parsed = urlsplit(value)
        if parsed.scheme == 'data' or (parsed.netloc and parsed.netloc != 'inputarchive.com'):
            return
        if not parsed.path:
            return
        relative = unquote(parsed.path).lstrip('/') if parsed.path.startswith('/') else posixpath.join(posixpath.dirname(parent), unquote(parsed.path))
        relative = posixpath.normpath(relative)
        if relative.startswith('../') or not (ROOT / relative).is_file():
            raise AssertionError('Invalid active website asset: ' + value)
        if relative not in paths:
            paths.add(relative)
            if relative.endswith('.css'):
                pending_css.append(relative)

    for relative in generated:
        if not relative.endswith('.html'):
            continue
        doc = Document((ROOT / relative).read_text())
        for attrs in doc.all('script') + doc.all('img'):
            add_asset(attrs.get('src'), relative)
        for attrs in doc.all('link'):
            if attrs.get('rel') in ('stylesheet', 'icon', 'apple-touch-icon', 'preload'):
                add_asset(attrs.get('href'), relative)
        for attrs in doc.all('meta'):
            if attrs.get('property') == 'og:image':
                add_asset(attrs.get('content'), relative)
    while pending_css:
        relative = pending_css.pop()
        css = (ROOT / relative).read_text()
        for match in re.finditer(r'url\(\s*([\"\']?)(.*?)\1\s*\)', css):
            add_asset(match.group(2), relative)
    return sorted(paths)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    byte_checks = []
    failure = None
    browser_version = None
    try:
        static_contracts()
        for relative in active_paths():
            expected = (ROOT / relative).read_bytes()
            request = Request(BASE + '/' + relative, headers={
                'User-Agent': 'PAIA-Website-Readback/2.0', 'Cache-Control': 'no-cache'})
            try:
                response = urlopen(request, timeout=30)
            except HTTPError as error:
                if error.code != 404 or Path(relative).name != '404.html':
                    raise
                response = error
            with response:
                final = urlsplit(response.geturl())
                if final.scheme != 'https' or final.netloc != 'inputarchive.com':
                    raise AssertionError('Unexpected production host redirect')
                body = response.read(len(expected) + 1)
                match = body == expected
                byte_checks.append({'path': relative, 'status': response.status,
                                    'exact_bytes': match, 'sha256': sha256(body).hexdigest()})
                if not match:
                    raise AssertionError('Deployment not at reviewed website bytes: ' + relative)

        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
            browser_version = browser.version
            context = browser.new_context()
            unexpected = []
            errors = []

            def observed_request(route):
                if route.request.url.startswith(BASE + '/'):
                    route.continue_()
                else:
                    unexpected.append(route.request.url)
                    route.abort()

            context.route('**/*', observed_request)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            generated = (ROOT / 'website/generated-paths.txt').read_text().splitlines()
            routes = [path for path in generated if path.endswith('.html') and not path.startswith('en/')]
            routes.append('en/index.html')
            for width in (1440, 390):
                page.set_viewport_size({'width': width, 'height': 900})
                for relative in routes:
                    response = page.goto(BASE + '/' + relative, wait_until='load', timeout=45000)
                    page.evaluate('document.fonts.ready')
                    label = 'live/' + relative + '/' + str(width)
                    check(response is not None and (response.ok or (Path(relative).name == '404.html' and response.status == 404)), label + ': actual public HTTP response')
                    check(page.locator('h1').is_visible(), label + ': readable main heading')
                    check(page.locator('html').get_attribute('lang') == ('zh-CN' if relative.startswith('zh/') else 'en'), label + ': correct static language')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), label + ': no horizontal page overflow')
                    check(page.evaluate('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0||i.loading==="lazy")'), label + ': images load')
                    check(not errors and not unexpected, label + ': no script errors or unexpected external requests')
                    if Path(relative).name in ('index.html', 'demo.html', 'about.html'):
                        page.emulate_media(reduced_motion='reduce')
                        page.screenshot(path=str(OUT / ('live-' + relative.replace('/', '-') + '-' + str(width) + '.png')), full_page=True)
                        page.emulate_media(reduced_motion='no-preference')
                for prefix in ('', 'zh/'):
                    exercise_demo(page, BASE, prefix)
            check(not errors and not unexpected, 'live synthetic examples have no script errors or external requests')
            context.close()
            browser.close()
    except Exception as error:
        failure = {'failure': str(error), 'traceback': traceback.format_exc()}
    passed = failure is None and not any(not item['pass'] for item in RESULTS)
    report = {'evidence': 'CURRENT_LIVE_WEBSITE',
              'expected_commit': os.environ.get('EXPECTED_WEBSITE_COMMIT', os.environ.get('GITHUB_SHA')),
              'pass': passed, 'generation': 'flagship-20261021',
              'browser': browser_version or 'NOT_RUN', 'physical_device': False,
              'beta_form_submitted': False, 'contact_submitted': False,
              'production_extension_certified': False, 'byte_checks': byte_checks,
              'checks': RESULTS, 'failure': failure}
    (OUT / 'live-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'live_pass': passed, 'exact_byte_files': len(byte_checks),
                      'checks': len(RESULTS), 'failure': failure}, ensure_ascii=False))
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
