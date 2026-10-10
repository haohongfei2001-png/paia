"""Read-only live baseline and portable, font-free website review evidence.

No archive, form submission, credentials, service activation or deployment.
The source snapshot is for reviewing the exact candidate without depending on
an author's computer being online; it is not an extension installer.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from playwright.sync_api import sync_playwright
import hashlib, json, os, subprocess, zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('WEBSITE_TEST_OUTPUT','website-test-artifacts'))
OUT.mkdir(parents=True,exist_ok=True)
observations=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
        for relative in ('index.html','zh/index.html','beta.html','zh/beta.html','demo.html','zh/demo.html','status.html'):
            url='https://inputarchive.com/'+relative
            with urlopen(Request(url,headers={'User-Agent':'PAIA-Website-Review/2.0'}),timeout=25) as response:
                source=response.read(2_000_000)
                record={'path':relative,'http_status':response.status,'sha256':hashlib.sha256(source).hexdigest()}
            for width in (1440,390):
                page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
                errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.goto(url,wait_until='networkidle',timeout=40000)
                page.evaluate('document.fonts.ready')
                record[str(width)]={'title':page.title(),'h1':page.locator('h1').all_text_contents(),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),'script_errors':errors}
                if width==1440:record['visible_copy']=page.locator('main').inner_text()
                page.screenshot(path=str(OUT/f'before-{relative.replace("/","-")}-{width}.png'),full_page=True)
                if relative.endswith('index.html'):
                    for key in ('thought','context'):
                        tab=page.locator(f'[data-preview-tab="{key}"]')
                        if tab.count():
                            tab.click()
                            record[str(width)][key+'_selected']=tab.get_attribute('aria-selected')=='true'
                page.close()
            observations.append(record)
            print('LIVE_BASELINE '+json.dumps(record,ensure_ascii=False))
        browser.close()
except Exception as error:
    observations.append({'observation_error':str(error)})
    print('LIVE_BASELINE_UNAVAILABLE '+str(error))
(OUT/'before-live.json').write_text(json.dumps({'evidence':'CURRENT_LIVE_BASELINE','no_form_submission':True,'observations':observations},ensure_ascii=False,indent=2),encoding='utf-8')

# Add the exact website source and non-font assets to the existing review
# artifact. Formal product documents are read-only references, not edited files.
tracked=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
manifest={}
with zipfile.ZipFile(OUT/'website-review-source.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for relative in tracked:
        path=ROOT/relative
        wanted=(relative.startswith(('website/','assets/website/','en/','zh/')) or relative in {'index.html','demo.html','beta.html','principles.html','status.html','about.html','privacy-policy.html','terms.html','thanks.html','404.html','how-it-works.html','use-cases.html','blog.html','article-context.html','article-beliefs.html','article-reuse.html','sitemap.xml','robots.txt','WEBSITE_DESIGN.md','.github/workflows/paia-website.yml'})
        reference=relative.startswith('extension/docs/consumer-product-v1/') and path.suffix=='.md' and '/implementation/' not in relative and '/desktop-vnext/' not in relative
        if not (wanted or reference) or not path.is_file():continue
        if path.suffix.lower() in {'.woff','.woff2','.ttf','.otf'}:continue
        if '/receipts/' in relative and path.suffix.lower() not in {'.md','.json'}:continue
        if path.stat().st_size>3_000_000:continue
        content=path.read_bytes()
        archive.writestr(relative,content)
        manifest[relative]=hashlib.sha256(content).hexdigest()
    archive.writestr('REVIEW_SOURCE.json',json.dumps({'commit':head,'font_files_included':False,'product_documents':'read-only candidate-branch references; latest main must be checked separately','sha256':manifest},indent=2))
print('REVIEW_SOURCE '+json.dumps({'commit':head,'files':len(manifest),'font_files':0}))

# Include the reviewed V2 offline deliverable in the existing CI evidence.
# Copying a website review ZIP does not deploy it or enable any service.
from shutil import copyfile
review_bundle=ROOT/'website/receipts/flagship-v2-20261010/PAIA-Website-V2-2026-10-10.zip'
if review_bundle.is_file():
    copyfile(review_bundle,OUT/review_bundle.name)
    print('V2_REVIEW_BUNDLE '+json.dumps({'file':review_bundle.name,'sha256':hashlib.sha256(review_bundle.read_bytes()).hexdigest(),'deployed':False}))
