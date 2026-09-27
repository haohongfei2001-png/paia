from pathlib import Path
import hashlib
root=Path('.')
p=root/'assets/website/site.css'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='b113334e3a6598f45b2f3b0150455628d2264f5cd6257ef23cad534aaf4e051e'
s=p.read_text()
old='html[lang="zh-CN"] .product-copy h2 em,html[lang="zh-CN"] .closing-copy h2 em{font-style:normal;font-weight:300}'
new=old+'\nhtml[lang="zh-CN"] .product-copy h2 em{color:#bfdbc5}'
assert old in s;s=s.replace(old,new,1);p.write_text(s)
p=root/'website/test.py'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='12a9375b8f27f24410767a893159167aac3487d26e1a60d162c2dfaf6e1cfb5b'
s=p.read_text();old="                check(not external, f'{name}: {width}px no unsolicited external requests')\n"
new=old+'''                if name in ('index.html','zh/index.html'):
                    # Check computed locale styles, not only nominal color tokens.
                    colors = page.evaluate("[getComputedStyle(document.querySelector('.product-copy h2 em')).color,getComputedStyle(document.querySelector('.product-section')).backgroundColor]")
                    shades = [''.join(f'{int(v):02x}' for v in re.findall(r'\\d+', color)[:3]) for color in colors]
                    low, high = sorted(luminance(color) for color in shades)
                    check((high+.05)/(low+.05) >= 4.5, f'{name}: {width}px actual product heading contrast')
'''
assert old in s;s=s.replace(old,new,1);p.write_text(s)
