"""Read-only pre-launch observation of the existing public website. No forms."""
from pathlib import Path
from urllib.request import Request, urlopen
from playwright.sync_api import sync_playwright
import hashlib, json, os

OUT=Path(os.environ.get('WEBSITE_TEST_OUTPUT','website-test-artifacts'))
OUT.mkdir(parents=True,exist_ok=True)
observations=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for relative in ('index.html','beta.html','demo.html'):
            url='https://inputarchive.com/'+relative
            with urlopen(Request(url,headers={'User-Agent':'PAIA-Website-Review/1.0'}),timeout=25) as response:
                source=response.read(2_000_000)
                record={'path':relative,'http_status':response.status,'sha256':hashlib.sha256(source).hexdigest()}
            for width in (1440,390):
                page=browser.new_page(viewport={'width':width,'height':900})
                page.goto(url,wait_until='networkidle',timeout=40000)
                record[str(width)]={'title':page.title(),'h1':page.locator('h1').all_text_contents(),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth+1')}
                if width==1440:
                    record['visible_copy']=page.locator('main').inner_text()[:6000]
                page.screenshot(path=str(OUT/f'before-{relative}-{width}.png'),full_page=True)
                page.close()
            observations.append(record)
            print('LIVE_BASELINE '+json.dumps(record,ensure_ascii=False))
        browser.close()
except Exception as error:
    observations.append({'observation_error':str(error)})
    print('LIVE_BASELINE_UNAVAILABLE '+str(error))
(OUT/'before-live.json').write_text(json.dumps({'evidence':'CURRENT_LIVE_BASELINE','no_form_submission':True,'observations':observations},ensure_ascii=False,indent=2),encoding='utf-8')
