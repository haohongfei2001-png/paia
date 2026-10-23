"""Publication-level contracts, complementing original browser/permission tests.

Only synthetic input and intercepted transports. Installation is verified as
unavailable when no exact public target exists; no installer or email is sent.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import hashlib,json,re,os,sys
from art_direction import Fragments

class Text(HTMLParser):
    def __init__(self,source):
        super().__init__(convert_charrefs=True);self.parts=[];self.feed(source)
    def handle_data(self,data):self.parts.append(data)
    def value(self):return ''.join(self.parts)

def find(nodes,selector):
    """Finite descendant selectors for frozen content, no third-party parser."""
    candidates=nodes.elements
    parents=None
    for token in selector.split():
        if token.startswith('#'):matches=[n for n in candidates if n.attrs.get('id')==token[1:]]
        elif token.startswith('.'):matches=[n for n in candidates if token[1:] in n.attrs.get('class','').split()]
        elif token.startswith('['):matches=[n for n in candidates if token[1:-1] in n.attrs]
        else:matches=[n for n in candidates if n.tag==token]
        if parents is not None:matches=[n for n in matches if any(p.start<n.start and n.end<=p.end for p in parents)]
        parents=matches
    return parents or []

def verify_static_publication(root,check):
    from evidence_fix_checks import restore_confirmed_edits
    original=json.loads((root/'website/launch_invariants.json').read_text())
    if not any(f'data-atelier-version="{v}"' in (root/'index.html').read_text() for v in (9,10)):
        for relative,entries in original['home'].items():
            parsed=Fragments(restore_confirmed_edits(relative,(root/relative).read_bytes()).decode())
            for selector,expected in entries.items():
                mapped = selector
                if 'data-home-mode="presentation"' in parsed.source:
                    mapped = {'.pc-record textarea':'.hp-input-text', '[data-thought-text]':'[data-story-original] .ad-story-entry p'}.get(selector,selector)
                actual=[Text(parsed.outer(n)).value() for n in find(parsed,mapped)]
                check(actual==expected,relative+': original expressions/value statement retained '+selector)
    for relative,sha in original['unmodified_runtime'].items():
        data=(root/relative).read_bytes()
        if relative == 'assets/website/product-experience.css':
            from brand_adoption_checks import restore_approved_brand
            data=restore_approved_brand(relative,data)
        check(hashlib.sha256(data).hexdigest()==sha,relative+': existing geometry/motion/data owner unchanged')
    forbidden=re.compile(r'邀请制|申请内测|测试版|规划能力|同步规划|连接体验 · 规划中|仍在开发|计划中的|当前开发状态|当前计划|current plan|PRIVATE BETA|Private Beta|private beta|PLANNED ·|CONNECTIONS · PLANNED')
    for relative in (root/'website/generated-paths.txt').read_text().splitlines():
        if not relative.endswith('.html'):continue
        parsed=Fragments((root/relative).read_text())
        copy=Text(parsed.source).value()
        check(not forbidden.search(copy),relative+': no development-stage product copy')
        for node in parsed.elements:
            if node.tag=='a':
                href=node.attrs.get('href','')
                check(not href.endswith(('/beta.html','/status.html')),relative+': navigation does not lead to retired beta/status paths')
        check(len([n for n in parsed.elements if n.tag=='h1'])==1,relative+': one primary heading')
    manifest=json.loads((root/'website/launch_manifest.json').read_text())
    for locale in ('','zh/'):
        parsed=Fragments((root/locale/'download.html').read_text())
        buttons=find(parsed,'.release-install')
        check(len(buttons)==1,locale+': one installation action')
        if manifest['chrome_store_url'] is None:
            check(buttons[0].tag=='button' and 'disabled' in buttons[0].attrs,locale+': no fake download before a verified release')
            check('install-availability'==buttons[0].attrs.get('aria-describedby'),locale+': delivery limitation belongs at action')
        else:
            check(buttons[0].attrs.get('href')==manifest['chrome_store_url'],locale+': download uses the one verified target')
        help_nodes=Fragments((root/locale/'help.html').read_text())
        check(len([n for n in help_nodes.elements if n.tag=='details'])>=12,locale+': practical help replaces an engineering-progress matrix')
        contact_nodes=Fragments((root/locale/'contact.html').read_text())
        form=[n for n in contact_nodes.elements if n.tag=='form']
        check(len(form)==1 and form[0].attrs['action']=='https://formsubmit.co/haohongfei2001@gmail.com',locale+': same contact transport and recipient')
        consent=[n for n in contact_nodes.elements if n.attrs.get('name')=='contact_consent']
        check(len(consent)==1 and 'required' in consent[0].attrs and 'checked' not in consent[0].attrs,locale+': fresh explicit consent required')
        source=(root/locale/'contact.html').read_text()
        check('name="_subject" value="PAIA — Contact"' in source,locale+': contact purpose does not masquerade as a beta application')
    site=(root/'sitemap.xml').read_text()
    check('/beta.html' not in site and '/status.html' not in site,'legacy routes omitted from sitemap')
    check(all('/'+s in site for s in ('download.html','help.html','contact.html')),'final entry routes included in sitemap')
    # The style layer cannot replace the original native-scroll contract.
    sheet=(root/'assets/website/launch.css').read_text()
    # Retain the original publication rule; the approved harmony append is
    # separately restricted to appearance-only sheet properties and frozen owners.
    publication_sheet = sheet.split('/* HARMONY_20261013', 1)[0]
    check('data-scroll-story' not in publication_sheet and 'ad-thought-expanded' not in publication_sheet and 'pc-palette-wrap' not in publication_sheet,'publication layer does not redefine approved motion geometry')

if __name__=='__main__':
    ROOT=Path(__file__).resolve().parents[1]
    OUT=Path(os.environ.get('WEBSITE_LAUNCH_OUTPUT',ROOT/'website-launch-artifacts'));OUT.mkdir(parents=True,exist_ok=True)
    results=[]
    def check(ok,label):
        results.append({'check':label,'pass':bool(ok)})
        if not ok:raise AssertionError(label)
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=None
    try:
        if '--browser-only' not in sys.argv:
            verify_static_publication(ROOT,check)
        if '--static-only' not in sys.argv:
            from playwright.sync_api import sync_playwright
            server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
            Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
                for locale,prefix in [('zh','zh/'),('en','')]:
                    for width in (1440,768,390,320):
                        page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='reduce')
                        errors=[];transmits=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.on('request',lambda r:transmits.append(r.url) if r.method!='GET' else None)
                        for route in ('index.html','download.html','help.html','contact.html','beta.html','status.html'):
                            response=page.goto(base+'/'+prefix+route,wait_until='networkidle')
                            page.evaluate('document.fonts.ready')
                            tag=f'{locale}/{width}/{route}: '
                            check(response.status==200,tag+'working HTTP entry')
                            check(page.locator('h1').is_visible(),tag+'visible heading')
                            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),tag+'normal text stays in viewport')
                            if route=='index.html':
                                check(page.locator('.hero-actions a').first.get_attribute('href')=='/'+prefix+'download.html',tag+'primary CTA leads to installation entry')
                                check(page.locator('.hero-actions a').last.get_attribute('href')=='/'+prefix+'demo.html',tag+'secondary CTA leads to demo')
                                check(not page.locator('.pc-prompt-caption').is_visible(),tag+'removed caption stays removed')
                            if route in ('download.html','beta.html'):
                                check(page.locator('.release-install').is_disabled(),tag+'unavailable release is not clickable')
                                check(page.locator('#install-availability').is_visible(),tag+'availability stated exactly where needed')
                            if route in ('help.html','status.html'):
                                entry=page.locator('.release-help-content details').first
                                entry.locator('summary').click();check(entry.evaluate('e=>e.open'),tag+'help answer opens')
                                entry.locator('summary').press('Enter');check(not entry.evaluate('e=>e.open'),tag+'help keyboard toggle works')
                            if route=='contact.html':
                                check(page.locator('form').get_attribute('data-submission')=='idle',tag+'contact reuses existing hardened controller')
                                page.locator('button[type=submit]').click()
                                check(not transmits,tag+'invalid contact form never sends')
                            page.add_style_tag(content='html{font-size:200%!important}')
                            page.wait_for_timeout(80)
                            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),tag+'200% text stays in viewport')
                        check(not errors,f'{locale}/{width}: no script errors')
                        check(not transmits,f'{locale}/{width}: no form or service requests')
                        page.close()
                # Backwards-compatible routes must point to canonical entries.
                for locale,prefix in [('zh','zh/'),('en','')]:
                    ctx=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
                    page=ctx.new_page();page.goto(base+'/'+prefix+'contact.html')
                    check(page.locator('form').get_attribute('method')=='POST',locale+': native no-JS contact remains usable')
                    page.goto(base+'/'+prefix+'download.html')
                    check(page.locator('.release-install').is_disabled(),locale+': no-JS cannot bypass installation availability')
                    ctx.close()
                browser.close()
    except Exception as e:
        import traceback
        results.append({'check':'execution','pass':False,'error':str(e),'traceback':traceback.format_exc()})
    finally:
        if server:server.shutdown()
        report={'scope':'Final website copy/routes; synthetic browser only. No installer opened or real message sent.','checks':len(results),'failed':[x for x in results if not x['pass']],'results':results}
        (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False))
        if report['failed']:raise SystemExit(1)
