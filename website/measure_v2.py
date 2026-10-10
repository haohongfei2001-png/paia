"""Bounded cold loopback observations, not public Core Web Vitals or user analytics."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
import gzip,json,os,subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('WEBSITE_V2_OUTPUT','/tmp/paia-v2-review'));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
rows=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True)
        for route in ['index.html','zh/index.html','demo.html','zh/demo.html']:
            for width in [1440,390]:
                for repeat in range(3):
                    context=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce')
                    page=context.new_page();external=[]
                    page.on('request',lambda r:external.append(r.url) if r.url.startswith('http') and not r.url.startswith(origin+'/') else None)
                    page.add_init_script('window.__observed={cls:0,lcp:null};try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__observed.cls+=e.value})).observe({type:"layout-shift",buffered:true});new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__observed.lcp=e.startTime)).observe({type:"largest-contentful-paint",buffered:true})}catch{}')
                    page.goto(origin+'/'+route,wait_until='networkidle');page.evaluate('document.fonts.ready');page.wait_for_timeout(200)
                    value=page.evaluate('()=>{const n=performance.getEntriesByType("navigation")[0],r=performance.getEntriesByType("resource");return {...window.__observed,domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd,resourceCount:r.length,encodedResourceBytes:r.reduce((s,e)=>s+e.encodedBodySize,0),domElements:document.querySelectorAll("*").length,overflow:document.documentElement.scrollWidth>innerWidth+1}}')
                    assert not external and not value['overflow']
                    rows.append({'route':route,'width':width,'iteration':repeat+1,'browser':browser.version,**value,'externalRequests':external})
                    context.close()
        browser.close()
finally:server.shutdown()
paths=['index.html','zh/index.html','demo.html','zh/demo.html','assets/website/site.css','assets/website/product-experience.css','assets/website/flagship.css','assets/website/home-core-v2.js','assets/website/narrow-board.js','assets/website/value-proof.js','assets/website/usage.css']
sizes=[]
for name in paths:
    data=(ROOT/name).read_bytes()
    old=subprocess.run(['git','show','ae5f8daf4ea38909c687232c32c13c387d25c829:'+name],cwd=ROOT,capture_output=True)
    sizes.append({'path':name,'bytes':len(data),'gzipBytes':len(gzip.compress(data,mtime=0)),'v1Bytes':len(old.stdout) if old.returncode==0 else 0,'v1GzipBytes':len(gzip.compress(old.stdout,mtime=0)) if old.returncode==0 else 0})
report={'method':'24 cold browser-context loopback observations; no throttling; 900px height; reduced motion; cache isolated per observation; fonts ready. Not a public/mobile-device performance score. Gzip sizes are calculated, not a claim about CDN headers.','observations':rows,'fileSizes':sizes}
(OUT/'performance.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps({'observations':len(rows),'maxCLS':max(r['cls'] for r in rows),'noExternalRequests':all(not r['externalRequests'] for r in rows)}))
