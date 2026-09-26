"""Build branded metadata images locally; no external fonts or service calls."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox'])
    for lang in ['zh','en']:
        en=lang=='en'
        heading='Your AI.<br><span>Not starting<br>from zero.</span>' if en else '你的 AI，<br><span>不必每次<br>从零开始。</span>'
        sub='YOUR PERSONAL AI CONTEXT' if en else '属于你的个人 AI 信息与上下文系统'
        labels=['Your inputs','Your ideas','Your context'] if en else ['你的输入','你的想法','你的上下文']
        page=browser.new_page(viewport={'width':1200,'height':630},device_scale_factor=1)
        page.set_content(f'''<!doctype html><html lang="{'en' if en else 'zh-CN'}"><meta charset="utf-8"><style>*{{box-sizing:border-box}}body{{margin:0;padding:45px 64px;background:#0b0f13;color:#f4f7fa;font-family:Arial,'Noto Sans CJK SC',sans-serif}}header{{display:flex;justify-content:space-between;align-items:center}}header b{{font-size:30px;letter-spacing:-1.6px}}header small{{font-size:12px;letter-spacing:2px;color:#aebbc4}}h1{{font-size:{77 if en else 73}px;letter-spacing:-3px;line-height:1.13;font-weight:600;margin:42px 0 20px}}h1 span{{color:#b5f3cc}}p{{font-size:16px;letter-spacing:1px;color:#aebbc4}}.right{{position:absolute;left:810px;top:205px;width:305px}}.cell{{border:1px solid #3b4b57;border-radius:12px;padding:23px 26px;color:#bccbd4;font-size:18px;background:#141d24}}.cell:last-child{{background:#b5f3cc;color:#152e20;border-color:#b5f3cc}}.line{{height:24px;width:1px;margin:auto;background:#5a7161}}footer{{position:absolute;bottom:40px;right:64px;color:#aebbc4;font-size:13px;letter-spacing:1px}}</style><header><b>PAIA</b><small>PRIVATE BETA / LOCAL-FIRST</small></header><h1>{heading}</h1><p>{sub}</p><div class="right">{''.join(f'<div class="cell">{label}</div>'+('<div class="line"></div>' if i<2 else '') for i,label in enumerate(labels))}</div><footer>inputarchive.com</footer></html>''')
        page.screenshot(path=str(ROOT/f'assets/website/og-{lang}.png'))
        page.close()
    browser.close()
