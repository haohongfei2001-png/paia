"""Current D6 / PT1 presentation guards, alongside the complete data journeys.

The October 8 Owner visual direction supersedes the old homepage byte/geometry
freeze. These checks protect product roles, operability and motion preferences;
they do not certify a real extension, model service or physical device.
"""
import hashlib
import json


def verify_typography(page, check, label='site'):
    def test(ok, name):
        check(ok, f'{label}: {name}')
    test('sans-serif' in page.locator('h1').evaluate('e=>getComputedStyle(e).fontFamily'), 'primary heading uses the product UI font')
    test('PAIA Display' in page.locator('.wordmark').first.evaluate('e=>getComputedStyle(e).fontFamily'), 'original PAIA brand typography retained')
    test(page.locator('.header-inner').evaluate("e=>getComputedStyle(e).backdropFilter.includes('blur(')"), 'navigation uses the shared glass surface')
    test(page.locator('.site-header').evaluate("e=>getComputedStyle(e).position==='sticky' && getComputedStyle(e).pointerEvents==='none'"), 'floating header leaves its surrounding space pointer transparent')
    test(page.locator('.header-inner').evaluate("e=>getComputedStyle(e).pointerEvents==='auto'"), 'visible navigation panel remains operable')
    test(page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--focus').trim()==='#235dd3'"), 'D6 focus token is available across routes')


def verify_origin(page, check, en=True):
    def test(ok, label):
        check(ok, ('EN' if en else 'ZH') + ' product design: ' + label)
    verify_typography(page, check, ('EN' if en else 'ZH') + ' product design')
    expected = {'#input-library', '#prompt-reuse', '#thought-library', '#personal-context'}
    test(set(page.locator('.pc-nav a').evaluate_all('els=>els.map(e=>e.getAttribute("href"))')) == expected, 'navigation reaches each approved working example')
    for selector in ['.pc-editor-stage', '.pc-palette', '.pc-context-stage']:
        test(page.locator(selector).evaluate("e=>getComputedStyle(e).backdropFilter.includes('blur(')"), selector + ' uses the common optical material')
    for selector in ['.pc-document h3', '.pc-topic-reader-head h3']:
        family = page.locator(selector).first.evaluate('e=>getComputedStyle(e).fontFamily')
        test('Georgia' in family and 'sans-serif' not in family, selector + ' retains the separate reader typography role')
    test(page.locator('.pc-thought').evaluate_all("els=>els.length===4 && els.every(e=>getComputedStyle(e).boxShadow==='none' && parseFloat(getComputedStyle(e).borderTopWidth)===0)"), 'Topic entries remain continuous prose without individual card chrome')
    test(page.locator('.pc-topic-source').count() == 4, 'topic keeps cross-conversation provenance')
    stamps = [' '.join(value.split()) for value in page.locator('.pc-thought time').all_text_contents()]
    test(stamps == ['12 AUG 09:42', '26 AUG 11:18', '10 SEP 18:03', '24 SEP 10:26'], 'topic preserves the chronological trail')
    test(page.locator('[data-context-card]').count() == 4, 'four independent Context cards remain identifiable')
    test(page.locator('[data-context-overview] textarea').count() == 0, 'overview keeps personal bodies in their details')
    test(('not available yet' if en else '尚未开放') in page.locator('.pc-access-boundary').inner_text(), 'real connection availability is honest')
    test(('EXAMPLE' if en else '示例') in page.locator('.pc-prompts').inner_text(), 'personal prompts remain a fictional example')


def verify_hero(page, check, en=True, motion=False):
    """Real preview tabs and optional native-motion checks on a fresh homepage."""
    prefix = 'EN' if en else 'ZH'
    def test(ok, label):
        check(ok, f'{prefix} hero: {label}')
    hero = page.locator('[data-product-hero]')
    test(hero.count() == 1, 'one product-led opening')
    tabs = page.locator('[data-preview-tab]')
    panels = page.locator('[data-preview-panel]')
    keys = ['archive', 'thought', 'context']
    test(tabs.evaluate_all('els=>els.map(e=>e.dataset.previewTab)') == keys, 'the three current product spaces are offered')
    test(panels.count() == 3, 'each space has its own labelled panel')
    for key in keys:
        tab = page.locator(f'[data-preview-tab="{key}"]')
        panel = page.locator(f'[data-preview-panel="{key}"]')
        test(tab.get_attribute('role') == 'tab' and panel.get_attribute('role') == 'tabpanel', f'{key} retains native tab semantics')
        test(tab.get_attribute('aria-controls') == panel.get_attribute('id') and panel.get_attribute('aria-labelledby') == tab.get_attribute('id'), f'{key} tab and panel are associated')
    def selected(key, focused=False):
        test(page.locator('[data-preview-tab][aria-selected=true]').count() == 1, 'exactly one preview tab is selected')
        test(page.locator(f'[data-preview-tab="{key}"]').get_attribute('aria-selected') == 'true', f'{key} exposes its selected state')
        for candidate in keys:
            tab = page.locator(f'[data-preview-tab="{candidate}"]')
            panel = page.locator(f'[data-preview-panel="{candidate}"]')
            test(panel.is_visible() == (candidate == key), f'{candidate} visibility follows selected space')
            test(tab.get_attribute('tabindex') == ('0' if candidate == key else '-1'), f'{candidate} follows roving keyboard focus')
            if candidate != key:
                test(panel.get_attribute('hidden') is not None and panel.evaluate('e=>e.getClientRects().length===0'), f'{candidate} hidden panel is excluded from layout and focus navigation')
        if focused:
            test(page.locator(f'[data-preview-tab="{key}"]').evaluate('e=>e===document.activeElement'), 'keyboard selection retains tab focus')
    selected('archive')
    test(tabs.evaluate_all('els=>els.every(e=>!e.disabled)'), 'tabs are ready without a scroll gate')
    test(page.locator('[data-hero-glass]').evaluate("e=>{for(let n=e;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(n.inert||n.getAttribute('aria-hidden')==='true'||s.visibility==='hidden'||s.display==='none'||Number(s.opacity)===0)return false;}return e.getBoundingClientRect().height>0;}"), 'product UI is visible and never inert before scrolling')
    test(hero.locator('h1').is_visible(), 'the primary value statement remains visible')
    test(page.locator('[data-hero-glass]').evaluate("e=>getComputedStyle(e).backdropFilter.includes('blur(')"), 'preview is framed in optical glass')
    test(page.locator('.optical-field').get_attribute('aria-hidden') == 'true' and page.locator('.optical-field').evaluate("e=>getComputedStyle(e).pointerEvents==='none'"), 'decorative optical layers cannot capture clicks or speech focus')
    locale = '' if en else 'zh/'
    test(page.locator('.hero-actions a').evaluate_all('els=>els.map(e=>e.getAttribute("href"))') == [f'/{locale}demo.html', f'/{locale}beta.html'], 'both hero CTAs reach actual destinations')
    test(('No personal archive or AI connection' if en else '不连接你的档案或 AI') in page.locator('.hero-preview-caption').inner_text(), 'preview availability is explicit')
    page.locator('[data-preview-tab="archive"]').focus()
    for key, expected in [('ArrowRight', 'thought'), ('ArrowDown', 'context'), ('ArrowUp', 'thought'), ('End', 'context'), ('Home', 'archive'), ('ArrowLeft', 'context'), ('ArrowRight', 'archive')]:
        page.keyboard.press(key)
        selected(expected, focused=True)
    test(page.locator('.pv-context-card').count() == 4, 'the hero Context preview uses the same four-card model')
    test(page.locator('.pv-context-card textarea, .pv-context-card input').count() == 0, 'hero card overview does not expose personal bodies')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'tab changes never create horizontal overflow')
    if not motion:
        return

    page.emulate_media(reduced_motion='no-preference')
    toggle = page.locator('[data-motion-toggle]')
    if toggle.get_attribute('aria-pressed') == 'true':
        toggle.click()
    page.wait_for_function("document.documentElement.dataset.motion==='on'")
    page.evaluate("scrollTo({top:0,behavior:'instant'})")
    page.wait_for_function("Number(document.querySelector('[data-product-hero]').dataset.progress)===0")
    before = page.locator('.ribbon-blue').evaluate('e=>getComputedStyle(e).transform')
    distance = page.evaluate("()=>{const hero=document.querySelector('[data-product-hero]');const y=hero.offsetHeight*.35;scrollTo({top:y,behavior:'instant'});return y;}")
    page.wait_for_function("Number(document.querySelector('[data-product-hero]').dataset.progress)>.1")
    test(abs(page.evaluate('scrollY') - distance) <= 2, 'normal browser scrolling reaches the requested geometry without interception')
    test(page.locator('.ribbon-blue').evaluate('e=>getComputedStyle(e).transform') != before, 'scrolling visibly moves the optical layer')
    test(hero.evaluate("e=>Math.abs(Number(e.dataset.progress)-Number(getComputedStyle(e).getPropertyValue('--hero-progress')))<.001"), 'motion progress agrees with the displayed optical state')
    test(page.locator('[data-preview-panel="archive"]').is_visible() and page.locator('[data-hero-glass]').get_attribute('inert') is None, 'scroll animation never gates the product preview')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'scroll motion stays within the viewport')
    page.evaluate("scrollTo({top:0,behavior:'instant'})")
    page.wait_for_function("Number(document.querySelector('[data-product-hero]').dataset.progress)===0")
    test(page.locator('.ribbon-blue').evaluate('e=>getComputedStyle(e).transform') == before, 'upward scroll reverses the optical displacement')
    toggle.click()
    page.wait_for_function("document.documentElement.dataset.motion==='off'")
    test(toggle.get_attribute('aria-pressed') == 'true', 'manual pause is exposed as a pressed control')
    page.locator('[data-preview-tab="context"]').click()
    test(page.locator('[data-preview-panel="context"]').is_visible(), 'tabs remain usable while motion is paused')
    test(page.evaluate("document.getAnimations().every(a=>a.playState!=='running')"), 'pause stops current presentation animations')
    page.evaluate("y=>scrollTo({top:y,behavior:'instant'})", distance)
    page.wait_for_function("Number(document.querySelector('[data-product-hero]').dataset.progress)===0")
    test(page.locator('[data-hero-glass]').evaluate("e=>getComputedStyle(e).transform==='none'"), 'paused product surface remains still')
    toggle.click()
    page.wait_for_function("document.documentElement.dataset.motion==='on'")
    test(toggle.get_attribute('aria-pressed') == 'false', 'motion can be explicitly resumed')
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function("document.documentElement.dataset.motion==='off'")
    test(toggle.is_disabled() and toggle.get_attribute('aria-pressed') == 'true', 'system reduced motion takes priority over the manual toggle')
    test(page.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'"), 'reduced motion removes animated scrolling')
    page.locator('[data-preview-tab="archive"]').click()
    selected('archive')
    test(page.evaluate("document.getAnimations().every(a=>a.playState!=='running')"), 'reduced motion includes tab transitions')
    test(page.locator('[data-hero-glass]').is_visible(), 'reduced motion retains the complete product surface')


def verify_assets(root, check):
    lock = json.loads((root / 'assets/website/asset-lock.json').read_text())
    for path, record in lock.items():
        check(hashlib.sha256((root / path).read_bytes()).hexdigest() == record['sha256'], 'asset digest: ' + path)
    expected = {
        'paia-icon-v1.png': '3c1ba79d902d14ce5216850583c233f09e632a3f0524d93335cc0e85be6dc3e4',
        'paia-logo-v1.webp': 'e94ce73c20a46d40aa60d33eb87065906f256527da4948062c9ff30f6923a137',
    }
    for name, digest in expected.items():
        check(hashlib.sha256((root / 'assets/website/brand' / name).read_bytes()).hexdigest() == digest, 'owner brand byte identity: ' + name)
