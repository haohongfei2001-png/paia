"""Current-experience consistency, not an assertion of consumer demand."""
from pathlib import Path
import hashlib, json, re
from story import inputs, title


def verify_v2_static(root, check):
    forbidden = re.compile(r'食谱|菜谱|妈妈|番茄鸡蛋|家常菜|\bcookbook\b|\brecipes?\b|\bmum(?:[’\x27]s)?\b', re.I)
    for route in (root/'website/generated-paths.txt').read_text().splitlines():
        if not route.endswith('.html'): continue
        text=(root/route).read_text()
        check(not forbidden.search(text),f'{route}: rejected example absent from current generated experience')
    for locale in ['', 'zh/']:
        t=lambda cn,en: cn if locale else en
        data=inputs(t)
        home=(root/locale/'index.html').read_text()
        demo=(root/locale/'demo.html').read_text()
        how=(root/locale/'how-it-works.html').read_text()
        check(len(data)==4 and len({r['source'] for r in data})==2,f'{locale}V2: four inputs from two explicit fictional conversations')
        check(title(t) in home and title(t) in demo and title(t) in how,f'{locale}V2: one shared personal topic across home Demo and How')
        from html import escape
        check(all(escape(r['text']) in home and escape(r['text']) in demo for r in data),f'{locale}V2: home and Demo show the same exact current input bodies')
        check('data-proof-fixture' in home and 'value-proof.js' in home,f'{locale}V2: actual local value-guide owner is loaded')
        check('data-core-preview' not in home and 'data-core-preview' in demo,f'{locale}V2: complete product operations belong to Demo')
        check(('AI 访问：关' if locale else 'AI access: off') in how and ('示例已授权' if locale else 'Authorized in this example') not in how,f'{locale}V2: practical-page Context preview is default off too')
        form=re.search(r'<form\b.*?</form>',(root/locale/'beta.html').read_text(),re.S).group(0)
        expected={'':'7aaa4937b7d726529885b6463c8e857246d7bd9460559b37b59bca51395326e2','zh/':'2a157c3ab3911a6df3906fe103d3b8e464c5fe4e3f564b495e09ae9a889292a1'}
        check(hashlib.sha256(form.encode()).hexdigest()==expected[locale],f'{locale}V2: complete beta form bytes and data processing remain unchanged')
        status=(root/locale/'status.html').read_text()
        check('PR229' not in status and 'main d516c43' not in status,f'{locale}V2: availability does not expose stale engineering identifiers')
    sources=['story.py','product_hero.py','flagship_home.py','core.py','topic_preview.py','prompt_preview.py','product_sections.py','product_pages.py','usage_pages.py','pages.py','review_bundle.py']
    for name in sources:
        check(not forbidden.search((root/'website'/name).read_text()),f'{name}: active source and prototype generation use only the current example')
    check('navigator.clipboard' not in (root/'assets/website/value-proof.js').read_text(), 'V2 guide is not an extra copy/transport owner')
