"""Regression guards for the owner's current-live, copy-frozen homepage patch."""
import json
from pathlib import Path


def verify_layout(page, check):
    if page.locator('.layout-adjusted').count() == 0:
        return
    width = page.viewport_size['width']
    zh = page.locator('html').get_attribute('lang') == 'zh-CN'
    key = 'zh' if zh else 'en'
    baseline = json.loads((Path(__file__).parent/'layout-copy-baseline.json').read_text())[key]
    source = (Path(__file__).resolve().parents[1]/('zh/index.html' if zh else 'index.html')).read_text()
    selectors = ['.pc-heading h2,.pc-prompt-copy h2', '.pc-intro>p,.pc-prompt-copy>.pc-body-copy,.pc-plan-note', '[data-working]', '[data-thought-text]']
    for name, selector in zip(['headings','intro','working','thought'], selectors):
        actual = page.evaluate('(o)=>[...new DOMParser().parseFromString(o.source,"text/html").querySelectorAll(o.selector)].map(e=>e.textContent)', {'source':source,'selector':selector})
        check(actual == baseline[name], f'{key}/{width} layout-only: original {name} copy unchanged')
    hero = page.evaluate('(s)=>new DOMParser().parseFromString(s,"text/html").querySelector("[data-product-hero]").outerHTML', source)
    check(hero == baseline['hero'], f'{key}/{width} layout-only: original hero DOM unchanged')
    check(page.locator('.pc-nav').count()==0, f'{key}/{width} layout-only: secondary nav removed')
    check(page.locator('#input-library .pc-primary-nav,#input-library .pc-sidebar').count()==0, f'{key}/{width} layout-only: no duplicate application rails')
    if width >= 768:
        for block, visual in [('.pc-review','.pc-editor-stage'),('.pc-topics','.pc-topic-stage'),('.pc-context','.pc-context-stage')]:
            left=page.locator(block+' .pc-heading').bounding_box();right=page.locator(block+' '+visual).bounding_box()
            check(left['x']+left['width']<right['x'], f'{key}/{width} layout-only: {block} copy and UI side by side')
    before=page.locator('#pc-composer').input_value()
    scopes=page.locator('[data-context-global],[data-card-allow],[data-topic-allow]').evaluate_all('es=>es.map(e=>e.getAttribute("aria-pressed"))')
    for state in ['orb','capsule','board']:
        page.locator(f'[data-surface-view="{state}"]').click()
        check(page.locator('.layout-chat-host').get_attribute('data-surface-state')==state, f'{key}/{width} layout-only: {state} is an explicit view')
        check(page.locator('#pc-composer').input_value()==before, f'{key}/{width} layout-only: {state} does not change draft')
    check(page.locator('#pc-prompt-card').bounding_box()['width']<=336.1, f'{key}/{width} layout-only: expanded board does not exceed 336px')
    check(page.locator('[data-context-global],[data-card-allow],[data-topic-allow]').evaluate_all('es=>es.map(e=>e.getAttribute("aria-pressed"))')==scopes, f'{key}/{width} layout-only: view switching does not alter permissions')
    page.locator('[data-surface-view="orb"]').click()
    page.locator('[data-surface-view="board"]').click()
    page.evaluate('scrollTo({top:0,behavior:"instant"})')
