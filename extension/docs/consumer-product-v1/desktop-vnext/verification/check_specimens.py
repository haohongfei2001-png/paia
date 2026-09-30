"""DVN documentation validation, never a PAIA production test.
Requires an already installed Playwright and Chromium. No downloads or AI calls.
Run: python3 verification/check_specimens.py [--browser /path/to/chromium]
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import re
import shutil


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', default=shutil.which('chromium') or shutil.which('google-chrome'))
    args = parser.parse_args()
    if not args.browser:
        raise SystemExit('Provide an installed Chromium executable with --browser.')
    root = Path(__file__).resolve().parents[1]
    for path in root.rglob('*.md'):
        for link in re.findall(r'\]\(([^)]+)\)', path.read_text(encoding='utf-8')):
            target = link.split('#')[0]
            if not target or '://' in target or target.startswith('../'):
                continue
            assert (path.parent / target).exists(), (path.name, target)
    manifest = json.loads((root / 'assets/manifest.json').read_text(encoding='utf-8'))
    icon = (root / manifest['included_icon']['path']).read_bytes()
    assert hashlib.sha256(icon).hexdigest() == manifest['included_icon']['sha256']
    html = (root / 'screens/index.html').read_text(encoding='utf-8')
    for href, path in [('../tokens.css', root / 'tokens.css'), ('screens.css', root / 'screens/screens.css')]:
        html = html.replace(f'<link rel="stylesheet" href="{href}">', '<style>' + path.read_text(encoding='utf-8') + '</style>')
    script = (root / 'screens/specimens.js').read_text(encoding='utf-8').replace('../assets/paia-icon-32.png', 'data:image/png;base64,' + base64.b64encode(icon).decode('ascii'))
    html = html.replace('<script src="specimens.js"></script>', '<script>' + script + '</script>')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise SystemExit('Playwright must already be installed; this script installs nothing.') from exc
    checks, errors = [], []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.browser, headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.set_content(html)
        page.wait_for_function('window.DVN && DVN.SCREENS.length === 39')
        scenes = page.evaluate('DVN.SCREENS')
        assert page.evaluate('DVN.evidence.length') == 160
        assert page.evaluate('DVN.topics.length') == 300
        assert page.evaluate('DVN.materials.length') == 120

        def show(route: str) -> None:
            page.evaluate('(r) => { location.hash = r; }', route)
            page.wait_for_function('(r) => document.title === "PAIA DVN · " + r', arg=route)

        for width in [1440, 1280, 1024, 768, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            routes = [s[1] for s in scenes] if width == 1440 else ['reader', 'topic-dense', 'topics-dense', 'compare', 'context-stale', 'original', 'history', 'context-select']
            for route in routes:
                show(route)
                assert page.locator('h1').first.inner_text().strip(), route
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), (route, width)
                checks.append({'route': route, 'width': width})
        page.set_viewport_size({'width': 1440, 'height': 1000})
        show('topic-dense')
        assert page.locator('#y-2026 .input-entry').count() == 3
        page.locator('[data-load-year="2026"]').click()
        assert page.locator('#y-2026 .input-entry').count() == 43
        show('original')
        assert page.locator('.shell').evaluate('(el) => el.inert')
        page.keyboard.press('Escape')
        page.wait_for_function('document.title === "PAIA DVN · reader"')
        browser_version = browser.version
        browser.close()
    assert not errors, errors
    print(json.dumps({'scope': 'DOCUMENTATION_SPECIMEN_ONLY', 'browser': browser_version, 'routes': len(scenes), 'layout_checks': len(checks), 'errors': errors, 'runtime_tests': 'NOT_RUN', 'model_fidelity': 'NOT_RUN', 'scale_performance': 'NOT_RUN', 'full_accessibility_audit': 'NOT_RUN'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
