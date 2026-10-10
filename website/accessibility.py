"""Reproducible axe browser audit. Not a WCAG certification or assistive-device test.

Set WEBSITE_AXE_SCRIPT to an independently obtained axe-core script and optionally
CHROMIUM_EXECUTABLE. The audit serves only repository files on loopback, never
submits the beta form and never accesses an actual archive or model service.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import json, os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('WEBSITE_A11Y_OUTPUT', '/tmp/paia-website-accessibility'))
AXE=Path(os.environ['WEBSITE_AXE_SCRIPT'])
if not AXE.is_file() or AXE.stat().st_size < 100000:
    raise SystemExit('Provide a valid, trusted axe-core distribution through WEBSITE_AXE_SCRIPT.')
OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
reports=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True)
        for width in [1440,390,320]:
            for locale in ['', 'zh/']:
                for route in ['index.html','demo.html','beta.html','status.html','how-it-works.html','use-cases.html','principles.html','about.html','blog.html','article-context.html','article-beliefs.html','article-reuse.html','privacy-policy.html','terms.html','thanks.html','404.html']:
                    page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
                    page.goto(base+'/'+locale+route,wait_until='networkidle')
                    page.evaluate('document.fonts.ready')
                    page.add_script_tag(path=str(AXE))
                    def audit(state):
                        result=page.evaluate('async()=>await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa","best-practice"]}})')
                        reports.append({'route':locale+route,'width':width,'state':state,'engine':browser.version,'axe':result['testEngine']['version'],'violations':result['violations'],'incomplete':result['incomplete'],'passes':len(result['passes'])})
                        print(locale+route,width,state,'violations',len(result['violations']),flush=True)
                    audit('default')
                    if route=='index.html':
                        page.locator('[data-preview-tab="thought"]').click();audit('hero-thought')
                        page.locator('[data-preview-tab="context"]').click();audit('hero-context')
                        page.locator('[data-story-reuse="a"]').click();audit('reuse-inspection')
                        page.locator('[data-nb-insert-full]').click();audit('argument-in-request')
                    if route=='demo.html':
                        page.locator('[data-topic-block="product"] h3 a').click();audit('topic-reader')
                        page.locator('[data-topic-reader="product"] [data-topic-back]').click()
                        page.locator('[data-prompt-toggle]').click();audit('board-candidates')
                        page.locator('[data-prompt-manage="0"]').click();audit('board-edit')
                        page.locator('[data-edit-cancel]').first.click()
                        page.locator('[data-nb-search-open]').click();page.locator('[data-nb-query]').fill('explain' if not locale else '解释');audit('board-search')
                        page.locator('[data-nb-result="a"]').click();audit('board-inspection')
                        page.locator('[data-card-open="inputs"]').click();page.locator('[data-topic-allow="product"]').click();audit('context-topic-parent-off')
                    page.close()
        browser.close()
finally:
    server.shutdown()
    (OUT/'axe-report.json').write_text(json.dumps({'evidence':'AUTOMATED_BROWSER_AUDIT','physical_device_or_screenreader_test':False,'form_submitted':False,'scans':reports},ensure_ascii=False,indent=2))
    violations=[{'route':r['route'],'width':r['width'],'state':r['state'],'id':v['id'],'impact':v['impact'],'nodes':[{'target':n['target'],'summary':n.get('failureSummary')} for n in v['nodes']]} for r in reports for v in r['violations']]
    (OUT/'summary.json').write_text(json.dumps({'scans':len(reports),'violations':violations,'manual_review_items':sum(len(r['incomplete']) for r in reports)},ensure_ascii=False,indent=2))
    print(json.dumps({'scans':len(reports),'violation_instances':len(violations),'report':str(OUT/'summary.json')}))
    if violations:raise SystemExit(1)
