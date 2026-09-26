"""Build sharing cards using the actual site's typography and rendered copy."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox'])
  for lang in ['en','zh']:
   page=browser.new_page(viewport={'width':1200,'height':630},reduced_motion='reduce')
   page.goto(f'http://127.0.0.1:{server.server_port}/'+('zh/' if lang=='zh' else ''),wait_until='networkidle')
   page.add_style_tag(content='''.desktop-nav,.header-actions,.mobile-menu,.hero-actions,.hero-scope,.scroll-cue,.collection{display:none!important}.hero-stage{height:540px!important;min-height:540px!important}.hero-copy{left:0!important;top:47%;width:1050px!important}.hero-copy h1{font-size:76px!important;line-height:1.04}.hero-description{font-size:22px;margin-bottom:0}.hero-inner{padding:0}.header-inner{min-height:88px}html[lang=zh-CN] .hero-copy h1{font-size:66px!important;line-height:1.35}''')
   page.evaluate('document.fonts.ready');page.screenshot(path=str(ROOT/f'assets/website/og-{lang}.png'))
   page.close()
  browser.close()
finally:server.shutdown()
