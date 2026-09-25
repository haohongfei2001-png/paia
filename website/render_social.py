from playwright.sync_api import sync_playwright
from pathlib import Path
import os
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox'])
 for lang in ['zh','en']:
  en=lang=='en'
  heading='Your words.<br>Beyond the chat.' if en else '聊过的想法，<br>不止留在聊天里。'
  sub='A local-first archive for what you tell AI.' if en else '你的私人 AI 输入档案与上下文空间'
  end='FIND · UNDERSTAND · REUSE' if en else '找回 · 理解 · 复用'
  page=b.new_page(viewport={'width':1200,'height':630},device_scale_factor=1)
  page.set_content(f'''<html lang="{'en' if en else 'zh-CN'}"><meta charset="utf-8"><style>*{{box-sizing:border-box}}body{{margin:0;padding:54px 72px;background:#f5f4ef;color:#252d28;font-family:Arial,'Noto Sans CJK SC',sans-serif}}header{{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #cbd3c6;padding-bottom:22px}}b{{font-size:28px;letter-spacing:4px}}header span{{font-size:14px;letter-spacing:2px;color:#385b45}}h1{{font-family:{"Georgia,'Liberation Serif',serif" if en else "'Noto Sans CJK SC',sans-serif"};font-size:{86 if en else 70}px;font-weight:{400 if en else 500};line-height:1.23;letter-spacing:-2px;margin:36px 0 24px}}p{{font-size:24px;color:#606b63;margin:0}}footer{{display:flex;justify-content:space-between;font-size:14px;letter-spacing:2px;color:#385b45;position:absolute;bottom:52px;left:72px;right:72px}}</style><header><b>PAIA</b><span>PRIVATE BETA</span></header><h1>{heading}</h1><p>{sub}</p><footer><span>{end}</span><span>inputarchive.com</span></footer></html>''')
  page.screenshot(path=str(ROOT/f'assets/website/og-{lang}.png'))
  page.close()
 b.close()
