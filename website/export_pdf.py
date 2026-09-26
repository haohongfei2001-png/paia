"""Export the actual website, not a mockup pasted into a PDF.

Run from a checked out source tree:
  pip install playwright pymupdf Pillow
  playwright install chromium
  python website/export_pdf.py --output ./website-pdf

All rendering uses a temporary local HTTP server, fixed fictional sample data and
read-only interactions. No form submission, provider call or archive access.
Screen media preserves the art direction. Reduced-motion produces the completed
hero for full-site PDFs; a separate keyframe PDF/GIF records normal scroll motion.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlsplit
import argparse, json, hashlib, os, math, subprocess
import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',default=os.environ.get('WEBSITE_PDF_OUTPUT','/tmp/website-v4-proof'))
args=parser.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
SHOTS=OUT/'screens';SHOTS.mkdir(exist_ok=True)
PAGES=['index.html','how-it-works.html','use-cases.html','demo.html','about.html','blog.html','article-context.html','article-beliefs.html','article-reuse.html','principles.html','beta.html','status.html','privacy-policy.html','terms.html','thanks.html','404.html']
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
manifest={'evidence':'ACTUAL_WEBSITE_LOCAL_HTTP','base':'inputarchive.com','forms_submitted':False,'private_data':False,'files':{},'routes':[]}
try:manifest['source_commit']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
except Exception:manifest['source_commit']=None
manifest['website_bytes_sha256']=hashlib.sha256(b''.join((ROOT/p).read_bytes() for p in (ROOT/'website/generated-paths.txt').read_text().splitlines())+(ROOT/'assets/website/site.css').read_bytes()+(ROOT/'assets/website/site.js').read_bytes()).hexdigest()

def ready(page):
    page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
    page.evaluate('document.fonts.ready')
    page.wait_for_function('Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)')
    page.wait_for_timeout(90)

def native(page):
    page.evaluate("scrollTo({top:0,behavior:'instant'})")
    # Eight CSS pixels absorb Chromium's fractional point rounding without
    # shrinking content, clipping a route, or dropping overflow PDF pages.
    height=page.evaluate('Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight))')+8
    data=page.pdf(width='1440px',height=f'{height}px',margin={'top':'0','bottom':'0','left':'0','right':'0'},print_background=True,prefer_css_page_size=False,scale=1)
    doc=fitz.open(stream=data,filetype='pdf')
    assert len(doc)==1,f'Unexpected website PDF pagination: {height}px, {len(doc)} pages'
    assert len(doc[0].get_text().strip())>20,'PDF text is empty'
    return doc

def public_links(doc):
    for p in doc:
        for link in p.get_links():
            u=link.get('uri','')
            if u.startswith(origin):
                link['uri']='https://inputarchive.com'+u[len(origin):];p.update_link(link)

with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox'])
    for lang in ['EN','ZH']:
        print(f'Exporting {lang}',flush=True)
        prefix='' if lang=='EN' else 'zh/'
        combined=fitz.open();toc=[]
        page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1,reduced_motion='reduce')
        page.emulate_media(media='screen',reduced_motion='reduce')
        for route in PAGES:
            response=page.goto(origin+'/'+prefix+route,wait_until='networkidle')
            assert response.ok,(route,response.status)
            ready(page)
            title=page.locator('h1').inner_text().replace('\n',' ')
            toc.append([1,title,len(combined)+1])
            single=native(page);combined.insert_pdf(single);single.close()
            page.screenshot(path=str(SHOTS/f'{lang.lower()}-{Path(route).stem}-desktop.png'),full_page=True)
            manifest['routes'].append({'locale':lang,'route':prefix+route,'pdf_page':len(combined),'title':title})
        # Complete interactive-demo views, not fake feature screenshots.
        page.goto(origin+'/'+prefix+'demo.html',wait_until='networkidle');ready(page)
        for n in [1,2,3]:
            tab=page.get_by_role('tab').nth(n);tab.click()
            if n==3:page.locator('[data-build]').click()
            ready(page)
            title=('Example — ' if lang=='EN' else '交互示例 — ')+tab.inner_text().replace('\n',' ')
            toc.append([1,title,len(combined)+1]);single=native(page);combined.insert_pdf(single);single.close()
            page.screenshot(path=str(SHOTS/f'{lang.lower()}-demo-view-{n}.png'),full_page=True)
        # Print hidden homepage tab content as labelled, separate product regions.
        page.goto(origin+'/'+prefix+'index.html',wait_until='networkidle');ready(page)
        for view in ['topic','context']:
            page.locator(f'[data-mini-tab={view}]').click();ready(page)
            box=page.locator('.product-section').bounding_box()
            sy=page.evaluate('scrollY');clip=fitz.Rect(0,(box['y']+sy)*.75,1080,(box['y']+sy+box['height'])*.75)
            single=native(page)
            # Copy the native PDF page, then crop only this EXTRA tab specimen.
            # Full canonical routes above remain uncropped. Avoid retaining a
            # cross-document form graft after closing its source document.
            combined.insert_pdf(single)
            target=combined[-1]
            target.set_cropbox(clip)
            del target
            toc.append([1,('Homepage example — ' if lang=='EN' else '首页交互示例 — ')+view,len(combined)])
            single.close()
        public_links(combined);combined.set_toc(toc)
        combined.set_metadata({'title':f'PAIA — Complete Website — {lang}','author':'PAIA','subject':'Actual rendered website. Scroll motion is represented separately. Synthetic example data.','keywords':'PAIA, website, actual HTML, context'})
        filename=f'PAIA-Website-{lang}.pdf';combined.save(OUT/filename,garbage=4,deflate=True,use_objstms=1)
        # Every page gets an inspectable proof, with long pages kept proportional.
        for i,p in enumerate(combined):
            scale=min(320/p.rect.width,750/p.rect.height)
            p.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False).save(SHOTS/f'pdf-{lang}-{i+1:02d}.png')
        manifest['files'][filename]={'pages':len(combined),'sha256':hashlib.sha256((OUT/filename).read_bytes()).hexdigest()}
        del p
        combined.close();page.close()
        print(f'Verified {filename}',flush=True)
    # Normal-motion keyframes from actual DOM/scroll positions.
    page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1,reduced_motion='no-preference')
    page.goto(origin+'/',wait_until='networkidle');ready(page)
    keydoc=fitz.open();frames=[]
    for i in range(31):
        y=660*i/30
        page.evaluate("y=>scrollTo({top:y,behavior:'instant'})",y);page.wait_for_timeout(40)
        data=page.screenshot()
        import io
        frame=Image.open(io.BytesIO(data)).convert('RGB');frame.thumbnail((960,600));frames.append(frame.copy())
        if i in [0,10,20,30]:
            p=keydoc.new_page(width=1080,height=675);p.insert_image(p.rect,stream=data)
            (SHOTS/f'motion-{i:02d}.png').write_bytes(data)
    keydoc.set_toc([[1,title,n+1] for n,title in enumerate(['Text-only first frame','Inputs emerge','Sources gather','Completed context'])])
    keydoc.set_metadata({'title':'PAIA — Scroll sequence — actual website','subject':'Static keyframes sampled from the real implemented homepage.'})
    keydoc.save(OUT/'PAIA-Motion-Keyframes.pdf',garbage=4,deflate=True)
    keydoc.close()
    durations=[100]*len(frames);durations[0]=1000;durations[-1]=1800
    frames[0].save(OUT/'PAIA-Scroll.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=True)
    page.close()
    for lang in ['en','zh']:
        page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='reduce')
        page.goto(origin+('/zh/' if lang=='zh' else '/'),wait_until='networkidle');ready(page)
        page.screenshot(path=str(SHOTS/f'{lang}-home-mobile.png'),full_page=True);page.close()
    b.close()
server.shutdown()
(OUT/'pdf-render-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pdf_files':manifest['files'],'route_count':len(manifest['routes'])},ensure_ascii=False))
