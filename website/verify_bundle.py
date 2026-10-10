"""Exercise the font-free V2 review bundle as real local files; no external requests."""
from pathlib import Path
import argparse,json,os,tempfile,zipfile
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--bundle',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
results=[]
with tempfile.TemporaryDirectory(prefix='paia-v2-offline-') as directory:
    root=Path(directory)
    with zipfile.ZipFile(args.bundle) as z:
        for name in z.namelist():
            assert '..' not in Path(name).parts and not name.startswith('/')
            assert Path(name).suffix.lower() not in {'.woff','.woff2','.ttf','.otf'}
        z.extractall(root)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True)
        for locale in ['en','zh']:
            for kind in ['home','demo']:
                for width in [1440,390]:
                    page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
                    external=[];errors=[]
                    page.on('request',lambda r:external.append(r.url) if r.url.startswith('http') else None)
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    page.goto((root/f'{kind}-{locale}.html').as_uri(),wait_until='load')
                    assert page.locator('h1').is_visible()
                    if kind=='home':
                        page.locator('[data-preview-tab="thought"]').click()
                        initial=page.locator('#pc-composer').input_value()
                        page.locator('[data-story-reuse="a"]').click()
                        assert page.locator('#pc-composer').input_value()==initial
                        page.locator('[data-nb-insert-full]').click()
                        assert page.locator('[data-proof-line="a"]').get_attribute('data-state')=='included'
                        if width<=760:page.locator('[data-proof-view-pick="reading"]').click()
                        page.locator('[data-story-reuse="c"]').click();page.locator('[data-nb-insert-full]').click()
                        assert page.locator('[data-proof-line][data-state=included]').count()==2
                        page.locator('[data-proof-reset]').click()
                        assert page.locator('#pc-composer').input_value()==initial and page.locator('[data-proof-line][data-state=included]').count()==0
                    else:
                        original=page.locator('[data-original="a"]').text_content()
                        page.locator('[data-working="a"]').fill('Offline example edit.')
                        assert page.locator('[data-original="a"]').text_content()==original
                        page.locator('[data-topic-block="product"] h3 a').click()
                        assert page.locator('[data-thought-text="a"]').inner_text()=='Offline example edit.'
                        page.locator('[data-topic-reader="product"] [data-topic-back]').click()
                        assert page.locator('[data-context-global]').get_attribute('aria-pressed')=='false'
                        page.locator('[data-card-allow="rules"]').click()
                        assert page.locator('[data-context-global]').get_attribute('aria-pressed')=='false'
                        page.locator('[data-prompt-toggle]').click();page.locator('[data-prompt-pick="1"]').click()
                        if page.locator('[data-nb-insert-full]').is_visible():page.locator('[data-nb-insert-full]').click()
                        assert page.locator('#pc-composer').input_value()
                    assert not errors and not external
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    results.append({'page':f'{kind}-{locale}','width':width,'pass':True,'scriptErrors':errors,'externalRequests':external})
                    page.close()
        browser.close()
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'transport':'local files, inlined images/scripts, system font fallback','realAI':False,'fontFiles':0,'scenarios':results},indent=2))
print(json.dumps({'scenarios':len(results),'passed':sum(x['pass'] for x in results),'externalRequests':0}))
