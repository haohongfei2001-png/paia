"""Render the website's social cards from authored HTML; no external images or fonts."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox'])
    for lang in ('en','zh'):
        title = 'Turn what you’ve said<br>into <em>what’s next.</em>' if lang=='en' else '说过的，<br>成为下一步的起点。'
        line = 'Your AI context, for what’s next.' if lang=='en' else '属于你的个人 AI 信息与上下文系统。'
        card = 'Your words.<br>Still yours.' if lang=='en' else '你的表达。<br>仍然属于你。'
        page=browser.new_page(viewport={'width':1200,'height':630},device_scale_factor=1)
        page.set_content(f'''<html lang="{lang}"><meta charset="utf-8"><style>*{{box-sizing:border-box}}body{{margin:0;background:#fdfdfc;color:#202521;font-family:Arial,"Noto Sans CJK SC",sans-serif}}.brand{{position:absolute;top:55px;left:66px;font:32px Georgia,"Liberation Serif",serif;letter-spacing:4px}}.label{{position:absolute;top:67px;right:65px;font-size:11px;letter-spacing:2px;color:#626960}}h1{{position:absolute;top:174px;left:65px;font:52px/1.16 Georgia,"Liberation Serif","Noto Serif CJK SC",serif;letter-spacing:-1.8px;margin:0;max-width:770px}}p{{position:absolute;left:67px;top:358px;font-size:18px;color:#626960}}.sheet{{position:absolute;top:130px;right:85px;background:#e9eee4;width:196px;height:295px;transform:rotate(-5deg);padding:25px}}.sheet div{{margin-top:35px;height:130px;background:repeating-linear-gradient(0deg,transparent,transparent 12px,#a8b99e 12px,#a8b99e 13px)}}.card{{position:absolute;right:58px;top:279px;width:229px;padding:33px 25px;border:1px solid #dce2d8;background:#fff;box-shadow:0 10px 30px #23302412;border-radius:6px;font:27px/1.3 Georgia,"Liberation Serif",serif}}.foot{{position:absolute;left:67px;right:67px;bottom:55px;padding-top:24px;border-top:1px solid #e1e5de;color:#626960;font-size:12px;display:flex;justify-content:space-between}}</style><div class="brand">PAIA</div><div class="label">YOUR WORDS. YOUR TERMS.</div><h1>{title}</h1><p>{line}</p><div class="sheet"><small>PAST CONVERSATIONS</small><div></div></div><div class="card">{card}</div><div class="foot"><span>inputarchive.com</span><span>Desktop Chrome · ChatGPT Web · Private beta</span></div></html>''',wait_until='load')
        page.screenshot(path=str(ROOT/f'assets/website/og-{lang}.png'))
        page.close()
    browser.close()
