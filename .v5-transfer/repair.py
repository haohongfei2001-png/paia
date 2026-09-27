from pathlib import Path
import hashlib
root=Path('.')
p=root/'assets/website/site.css'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='e547ebda26a1b2cc0a0ff09cde2687bc23eb92eee1a30ee455beb6a6b99b8994'
p.write_text(p.read_text()+'\n/* Keep complete provider marks clear of the foreground context at small desktop widths. */\n@media(min-width:1200px) and (max-width:1399px){.synthesis-card,.context-sheets{left:35%}}\n')
probe="[...document.querySelectorAll('.input-card .provider-mark')].every(e=>{const r=e.getBoundingClientRect();return [.15,.5,.85].every(x=>[.15,.5,.85].every(y=>{const hit=document.elementFromPoint(r.x+x*r.width,r.y+y*r.height);return hit&&(hit===e||e.contains(hit))}))})"
p=root/'website/test.py';s=p.read_text()
old='''        check(page.evaluate("""Array.from(document.querySelectorAll('.input-card .provider-mark')).every(e=>{const r=e.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit && (hit===e||e.contains(hit))})"""), 'all source marks remain unobscured')'''
new='''        for art_width in (1200,1280,1920,1440):
            page.set_viewport_size({'width':art_width,'height':900})
            page.evaluate("const s=document.querySelector('[data-hero-sequence]');scrollTo({top:s.offsetTop+s.offsetHeight-(innerHeight-88)-88,behavior:'instant'})")
            page.wait_for_timeout(80)
            check(page.evaluate(PROBE), f'{art_width}px: all source mark areas remain unobscured')'''.replace('PROBE',repr(probe))
assert old in s;p.write_text(s.replace(old,new,1))
p=root/'website/review_motion.py';s=p.read_text()
old="[...document.querySelectorAll('.input-card .provider-mark')].every(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit&&(hit===e||e.contains(hit))})"
assert old in s;p.write_text(s.replace(old,probe,1))
print('Applied bounded small-desktop mark clearance and nine-point visible-area regression.')
