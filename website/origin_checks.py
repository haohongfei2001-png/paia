"""V7 homepage-only contracts, in addition to the complete existing journeys."""
from pathlib import Path
import hashlib, json

def verify_origin(page, check, en=True):
    def test(ok, label): check(ok, ('EN' if en else 'ZH') + ' origin: ' + label)
    test(page.locator('h1').evaluate('e=>getComputedStyle(e).fontWeight') == '400', 'light primary title')
    test('PAIA Display' in page.locator('.wordmark').first.evaluate('e=>getComputedStyle(e).fontFamily'), 'brand typography unchanged')
    test(page.locator('.pc-nav a').count() == 4 and page.locator('.pc-section').count() == 4, 'direct transition to four scenes')
    for selector in ['body','.site-header','.pc-prompts','.pc-context','.pc-access']:
        rgb=page.locator(selector).first.evaluate('e=>getComputedStyle(e).backgroundColor')
        values=[int(n) for n in rgb.replace('rgba(','').replace('rgb(','').replace(')','').split(',')[:3]]
        test(min(values)>=240 and max(values)-min(values)<=2, selector + ' stays light and neutral')
    pin=page.locator('[data-prompt-row="2"] [data-pin]')
    pin.focus();page.keyboard.press('Enter')
    test(pin.get_attribute('aria-pressed')=='true', 'keyboard pin has explicit selected state')
    test(page.locator('[data-prompt-list]>div').first.get_attribute('data-prompt-row')=='2','pin moves above unpinned prompts')
    test(page.locator('[data-prompt-row="2"] [data-move="1"]').is_disabled(),'ordering cannot silently unpin')
    page.locator('[data-prompt-row="2"] [data-insert]').click()
    test(page.locator('#pc-composer').input_value()==page.locator('#pc-prompt-2').input_value(),'pinned prompt inserts without sending')
    pin.click()
    test(pin.get_attribute('aria-pressed')=='false','unpin is reversible')
    topic=page.locator('.pc-topic-list details').first
    topic.locator('summary').focus();page.keyboard.press('Enter')
    test(topic.evaluate('e=>e.open'), 'topic list expands by keyboard')
    test(page.locator('.pc-topic-source').count()==4,'topic keeps cross-conversation provenance')
    test(page.locator('.pc-thought time').all_text_contents()==['12 AUG 09:42','26 AUG 11:18','10 SEP 18:03','24 SEP 10:26'],'topic preserves long-term chronological trail')
    test(page.locator('[data-pending-fact] details').count()==1,'extracted candidate exposes its source')
    test(('Never used' if en else '尚未使用') in page.locator('.pc-current-use').inner_text(),'real use is not fabricated from example permission')
    test(('0 items read' if en else '实际读取 0 条') in page.locator('.pc-current-use').inner_text(),'current real usage remains zero')
    test(page.locator('.pc-prompts .pc-local-tag').first.inner_text().endswith('PLANNED' if en else '规划示意'),'entire prompt library is labelled planned')


def verify_assets(root, check):
    lock=json.loads((root/'assets/website/asset-lock.json').read_text())
    for path,record in lock.items():
        check(hashlib.sha256((root/path).read_bytes()).hexdigest()==record['sha256'],'asset digest: '+path)
    expected={'paia-icon-v1.png':'3c1ba79d902d14ce5216850583c233f09e632a3f0524d93335cc0e85be6dc3e4','paia-logo-v1.webp':'e94ce73c20a46d40aa60d33eb87065906f256527da4948062c9ff30f6923a137'}
    for name,digest in expected.items():
        check(hashlib.sha256((root/'assets/website/brand'/name).read_bytes()).hexdigest()==digest,'owner brand byte identity: '+name)
