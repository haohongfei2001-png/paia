"""V17 website checks: readable product, deliberate interaction, honest access.

The new visual direction intentionally changes the hero and scroll composition.
The previous V16 suite remains available for its version. These checks preserve
the independent source, runtime, publication, consent and product boundaries;
they do not freeze the superseded camera or marketing-fragment geometry.
All browser input is synthetic. No form is submitted or real account connected.
"""
from pathlib import Path
import hashlib
import json
import re

from art_direction import Fragments
from launch_checks import find, Text


def static(root, check):
    # This is the established immutable reference, not a snapshot regenerated
    # from the candidate. It includes the independent demo, all interior routes,
    # existing assets, permission owners, installation manifest and workflows.
    lock = json.loads((root / 'website/atelier/preserved-prism16.json').read_text())
    for path, sha in lock['files'].items():
        check(hashlib.sha256((root / path).read_bytes()).hexdigest() == sha,
              'V17 unchanged independent owner: ' + path)

    for lang, prefix in [('zh', 'zh/'), ('en', '')]:
        source = (root / (prefix + 'index.html')).read_text()
        parsed = Fragments(source)
        label = prefix + 'V17: '
        check('data-atelier-version="17"' in source and
              'data-website-release="atelier17-20261030"' in source,
              label + 'exact current release identity')
        for old, scoped in [('.p13-input p', '#archive .p13-input p'),
                            ('.p13-entry-body p', '#thoughts .p13-entry-body p')]:
            actual = [Text(parsed.outer(n)).value() for n in find(parsed, scoped)]
            check(actual == lock['text'][lang][old],
                  label + 'complete original expression text: ' + scoped)
        check(len(find(parsed, '#thoughts .p16-topic')) == 3 and
              len(find(parsed, '#thoughts .p16-topic-chapters span')) == 9,
              label + 'three original topics and nine chapter labels')
        check(len(find(parsed, '#thoughts .p13-thought-entry')) == 2,
              label + 'complete two-input chapter')
        check(len(find(parsed, '#context .context-card')) == 4,
              label + 'four independent Context content cards')
        switches = find(parsed, '#context .context-switch') + find(parsed, '#context [data-ctx-master]')
        check(len(switches) == 5 and all(n.attrs.get('aria-checked') == 'false' for n in switches),
              label + 'Context permission controls are closed in source')
        check(len(find(parsed, '#thoughts [contenteditable]')) == 0,
              label + 'presentation does not impersonate the editable product')
        check(sum('paia-logo-v1.webp' in n.attrs.get('src', '')
                  for n in parsed.elements if n.tag == 'img') == 1,
              label + 'original brand artwork stays in its one closing use')
        scripts = [n.attrs.get('src', '') for n in parsed.elements if n.tag == 'script']
        check(all(s.startswith('/assets/website/') for s in scripts),
              label + 'only website-owned external scripts')
        check(sum('/presentation17.js?' in s for s in scripts) == 1 and
              not any(re.search(r'/presentation(?:10|11|13|15|16)\.js', s) for s in scripts),
              label + 'one versioned presentation runtime')
        check('/assets/website/atelier/atelier17.css?' in source,
              label + 'versioned V17 stylesheet')
        check(any('/context12.' + lang + '.js' in s for s in scripts),
              label + 'established independent Context owner retained')

        tabs = find(parsed, '[data-preview-tab]')
        panels = find(parsed, '[data-preview-panel]')
        check([n.attrs.get('data-preview-tab') for n in tabs] == ['archive', 'thought', 'reuse'],
              label + 'three concrete preview views')
        check([n.attrs.get('data-preview-panel') for n in panels] == ['archive', 'thought', 'reuse'],
              label + 'all preview content is present in the initial HTML')
        check(all(n.attrs.get('role') == 'tab' and n.attrs.get('aria-controls') for n in tabs),
              label + 'tabs have accessible roles and panel references')
        check(len({n.attrs.get('id') for n in panels}) == 3 and
              all(n.attrs.get('role') == 'tabpanel' for n in panels) and
              all(tab.attrs['aria-controls'] == panel.attrs.get('id') for tab, panel in zip(tabs, panels)),
              label + 'each tab owns its exact unique panel')
        check([n.attrs.get('aria-selected') for n in tabs] == ['true', 'false', 'false'] and
              ['hidden' in n.attrs for n in panels] == [False, True, True],
              label + 'one deterministic no-JavaScript preview')
        check(not any(x in source for x in ['data-open-source', 'data-view-source',
                                            'data-topic-search', 'data-reading-style']),
              label + 'no retired reader controls')

    code = (root / 'assets/website/atelier/presentation17.js').read_text()
    sheet = (root / 'assets/website/atelier/atelier17.css').read_text()
    check(not re.search(r'\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(', code),
          'V17 presentation creates no transport')
    check(not re.search(r'\b(localStorage|sessionStorage|attachShadow)\b', code),
          'V17 presentation has no persistent store or hidden replacement')
    check(not re.search(r'addEventListener\s*\(\s*[\"\'](?:wheel|touchmove)[\"\']', code),
          'V17 does not intercept native scrolling')
    check('prefers-reduced-motion' in sheet,
          'V17 stylesheet respects reduced motion')
    for name in ['component.js', 'fusion.js']:
        approved = root / 'extension/docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18' / name
        actual = root / 'assets/website/atelier' / ('r3-' + name)
        check(approved.read_bytes() == actual.read_bytes(), 'V17 approved R3 ' + name + ' unchanged')


def home(page, check, label, deep=False, out=None):
    page.wait_for_selector('body[data-atelier-ready=true]')
    page.evaluate('document.fonts.ready')

    def ck(ok, name):
        check(ok, label + ': ' + name)

    page.emulate_media(reduced_motion='reduce')
    ck(page.locator('h1').count() == 1 and page.locator('#hero-title').is_visible(),
       'one visible primary heading')
    ck(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),
       'no horizontal document overflow')
    ck(page.locator('.a17-preview').is_visible(), 'product appears with the opening')
    ck(page.locator('#archive .p13-input').count() == 4,
       'all original archive inputs remain available')
    ck(page.locator('#thoughts .p16-topic').count() == 3 and
       page.locator('#thoughts .p16-topic-chapters > span').count() == 9,
       'three topics and nine chapters remain readable')
    ck(page.locator('#thoughts .p13-thought-entry').count() == 2,
       'the selected chapter retains both complete input records')
    ck(page.locator('.p16-reader time').evaluate_all('es => es.map(e => e.getAttribute("datetime"))') ==
       ['2026-09-18T21:06', '2026-09-12T10:32'], 'original dates and newest-first order')
    ck(page.locator('#thoughts .p13-entry-body p').evaluate_all(
        'es => es.every(e => parseFloat(getComputedStyle(e).fontSize) >= (innerWidth <= 360 ? 13 : 14))'),
       'complete input text has readable size')
    ck(page.locator('.p16-reader').evaluate('''e => {
        const r = e.getBoundingClientRect();
        return [...e.querySelectorAll('.p13-entry-body p')].every(p => {
            const b = p.getBoundingClientRect();
            return b.left >= r.left - 1 && b.right <= r.right + 1 && b.bottom <= r.bottom + 1;
        });
    }'''), 'chapter text is not clipped by its reading surface')
    ck(page.locator('#context .context-card').count() == 4 and
       page.locator('#context [contenteditable]').count() == 0,
       'Context overview preserves four directory-only cards')
    ck(page.locator('.p16-apparatus').evaluate('e => getComputedStyle(e).transform === "none"'),
       'reduced motion gives a stationary complete reader')
    ck(page.evaluate('getComputedStyle(document.documentElement).scrollBehavior === "auto"'),
       'reduced motion removes animated scrolling')
    ck(page.locator('.p13-reuse').evaluate('''card => {
        const r = card.getBoundingClientRect();
        const controls = [...card.querySelectorAll('.r3-composer, .ps-anchor')];
        return controls.length === 2 && controls.every(control => {
            const b = control.getBoundingClientRect();
            return b.width > 0 && b.height > 0 &&
                b.left >= r.left - 1 && b.right <= r.right + 1 &&
                b.top >= r.top - 1 && b.bottom <= r.bottom + 1;
        });
    }'''), 'reuse composer and entry stay within their visible card')

    if page.locator('.menu-toggle').is_visible():
        button = page.locator('.menu-toggle')
        button.focus()
        page.keyboard.press('Enter')
        ck(page.locator('#mobile-nav').is_visible(), 'keyboard opens mobile navigation')
        page.keyboard.press('Escape')
        ck(not page.locator('#mobile-nav').is_visible() and
           button.evaluate('e => e === document.activeElement'),
           'Escape closes navigation and restores focus')

    if out:
        dest = Path(out)
        dest.mkdir(parents=True, exist_ok=True)
        safe = label.replace('/', '-').replace(' ', '_')
        page.evaluate("scrollTo({top: 0, behavior: 'instant'})")
        page.screenshot(path=str(dest / (safe + '-v17-hero.png')), animations='disabled')
        page.locator('#thoughts').screenshot(path=str(dest / (safe + '-v17-thoughts.png')), animations='disabled')
    if not deep:
        return

    source_words = page.locator('#thoughts .p13-entry-body p').all_text_contents()
    tabs = page.locator('[data-preview-tab]')
    panels = page.locator('[data-preview-panel]')
    for key in ['thought', 'reuse', 'archive']:
        tab = page.locator('[data-preview-tab="' + key + '"]')
        tab.click()
        ck(tab.get_attribute('aria-selected') == 'true' and
           page.locator('[data-preview-panel="' + key + '"]').is_visible() and
           page.locator('[data-preview-panel]:visible').count() == 1,
           'preview selects only the deliberate ' + key + ' view')
    tabs.first.focus()
    page.keyboard.press('ArrowRight')
    ck(tabs.nth(1).get_attribute('aria-selected') == 'true' and
       tabs.nth(1).evaluate('e => e === document.activeElement'),
       'ArrowRight selects and focuses the next preview')
    page.keyboard.press('End')
    ck(tabs.last.get_attribute('aria-selected') == 'true', 'End selects the final preview')
    page.keyboard.press('Home')
    ck(tabs.first.get_attribute('aria-selected') == 'true', 'Home restores the first preview')
    page.keyboard.press('ArrowLeft')
    ck(tabs.last.get_attribute('aria-selected') == 'true', 'ArrowLeft wraps to the final preview')
    ck(tabs.evaluate_all('es => es.filter(e => e.tabIndex === 0).length === 1'),
       'preview tablist has one keyboard tab stop')
    ck(page.locator('#thoughts .p13-entry-body p').all_text_contents() == source_words,
       'hero interactions never rewrite the source chapter')

    switches = page.locator('.context-switch')
    master = page.locator('#context [data-ctx-master]')
    ck(switches.evaluate_all('es => es.every(e => e.getAttribute("aria-checked") === "false")') and
       master.get_attribute('aria-checked') == 'false', 'all access starts closed')
    opener = page.locator('#context [data-ctx-open=information]').first
    opener.click()
    ck(page.locator('#context-dialog').is_visible() and
       switches.nth(0).get_attribute('aria-checked') == 'false',
       'opening personal content does not authorize access')
    page.locator('#context-dialog [data-ctx-edit]').first.fill('Synthetic context edit, this page only.')
    ck(switches.nth(0).get_attribute('aria-checked') == 'false' and
       master.get_attribute('aria-checked') == 'false',
       'editing content does not authorize access')
    page.keyboard.press('Escape')
    ck(not page.locator('#context-dialog').is_visible() and
       opener.evaluate('e => e === document.activeElement'), 'Context closes back to its trigger')
    switches.nth(1).click()
    master.click()
    master.click()
    ck(switches.nth(1).get_attribute('aria-checked') == 'true' and
       master.get_attribute('aria-checked') == 'false',
       'pausing overall access preserves the selected card')
    page.locator('#context [data-ctx-open=inputs]').first.click()
    page.locator('[data-topic-permission=product]').click()
    ck(master.get_attribute('aria-checked') == 'false' and
       switches.nth(3).get_attribute('aria-checked') == 'false',
       'a topic choice never opens either superior permission')
    page.locator('[data-ctx-topic=product]').click()
    ck(page.locator('#context-dialog [contenteditable]').count() == 0,
       'Context input inspection remains read-only')
    page.keyboard.press('Escape')
    ck(not page.locator('#context-dialog').is_visible(), 'Escape closes a transitioned Context modal')

    draft = page.locator('#prompt-draft')
    before = draft.input_value()
    draft.scroll_into_view_if_needed()
    draft_hit = draft.evaluate('''e => {
        const r = e.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === e;
    }''')
    if draft_hit:
        draft.click()
    ck(draft_hit and draft.evaluate('e => document.activeElement === e && e.readOnly'),
       'the readonly example draft accepts pointer focus')
    page.locator('#r3-host .ps-anchor').click()
    rows = page.locator('#r3-host .ps-row')
    ck(page.locator('#r3-host .ps-board').is_visible() and rows.count() == 6,
       'the original six-row R3 panel is usable')
    ck(page.locator('#r3-host .ps-board').evaluate('''board => {
        const b = board.getBoundingClientRect();
        const r = board.closest('.p13-reuse').getBoundingClientRect();
        return b.width > 0 && b.height > 0 &&
            b.left >= r.left - 1 && b.right <= r.right + 1 &&
            b.top >= r.top - 1 && b.bottom <= r.bottom + 1;
    }'''), 'the expanded reuse panel is not clipped by its card')
    rows.nth(1).locator('button').first.click()
    after = draft.input_value()
    ck(after.startswith(before) and len(after) > len(before),
       'deliberate reuse preserves the entire existing draft')
    ck(not page.evaluate('localStorage.length || sessionStorage.length'),
       'interactions create no persistent visitor state')
    page.emulate_media(forced_colors='active')
    ck(page.locator('.p16-reader').is_visible() and
       page.locator('#hero-title').evaluate('e => getComputedStyle(e).color !== "transparent"'),
       'headline and complete reading surface survive forced colors')
    page.emulate_media(forced_colors='none')
