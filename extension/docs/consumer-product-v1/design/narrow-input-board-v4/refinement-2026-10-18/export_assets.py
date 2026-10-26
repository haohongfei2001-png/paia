"""Export the one selected double-card glyph as an independent SVG, plus size sheet."""
import json
from pathlib import Path
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parent
T=json.loads((ROOT/'tokens.json').read_text())

def svg(state='collapsed',theme='light',size=48):
    c=T['cards'];p=T[theme];dx,dy=c['rear_offsets'][state]
    def gradient(name,colors,opacities,x):
        return f'<linearGradient id="{name}" x2="{x}" y2="1"><stop stop-color="{colors[0]}" stop-opacity="{opacities[0]}"/><stop offset="1" stop-color="{colors[1]}" stop-opacity="{opacities[1]}"/></linearGradient>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 48 48" role="img" aria-label="PAIA horizontal double cards: {state}">
<title>PAIA-FLOAT-UI-1.2-R1 · {state} · {theme}</title>
<desc>Exactly two equal horizontal cards. Foreground is fixed; only rear offset changes. 48px is the selected component size.</desc>
<defs>{gradient('rear',p['rear_colors'],p['rear_opacities'],'.18')}{gradient('front',p['front_colors'],p['front_opacities'],'.2')}{gradient('edge',p['edge_colors'],p['edge_opacities'],'.25')}</defs>
<circle cx="24" cy="24" r="23.5" fill="{p['surface']}" stroke="{p['border']}"/>
<rect data-layer="rear" x="{c['front_x']}" y="{c['front_y']}" width="21" height="14" rx="3.25" transform="translate({dx} {dy})" fill="url(#rear)" stroke="{p['edge_colors'][1]}" stroke-opacity=".26" stroke-width=".7"/>
<rect data-layer="front" x="{c['front_x']}" y="{c['front_y']}" width="21" height="14" rx="3.25" fill="url(#front)" stroke="url(#edge)" stroke-width=".8"/>
</svg>'''

if __name__=='__main__':
    out=ROOT/'assets';out.mkdir(exist_ok=True)
    import base64
    panels=[]
    for theme in ('light','dark'):
        rows=[]
        for size in (44,48,50):
            cells=[]
            for state in ('collapsed','capsule','board'):
                markup=svg(state,theme,size)
                cells.append('<div><img width="'+str(size)+'" height="'+str(size)+'" src="data:image/svg+xml;base64,'+base64.b64encode(markup.encode()).decode()+'"><span>'+state+'</span></div>')
                if size==48:
                    doc=ET.fromstring(markup)
                    assert len(doc.findall('{http://www.w3.org/2000/svg}rect'))==2
                    (out/f'cards-{state}-{theme}.svg').write_text(markup,encoding='utf-8')
            rows.append(f'<section><b>{size}px</b>'+''.join(cells)+'</section>')
        panels.append(f'<article class="{theme}"><h2>{theme}</h2>'+''.join(rows)+'</article>')
    html='''<!doctype html><meta charset="utf-8"><title>PAIA R1 · Native-size glyph inspection</title><style>body{margin:0;padding:28px;background:#f5f6f8;font:12px Arial,sans-serif;color:#414650}h1{font-size:16px;font-weight:500;margin:0 0 8px}p{margin:0 0 24px;color:#7b818c}.panels{display:grid;grid-template-columns:1fr 1fr;gap:20px}article{border:1px solid #e2e5eb;border-radius:16px;padding:20px;background:white}h2{font-size:12px;font-weight:400;margin:0 0 12px;color:#818996}section{height:98px;display:grid;grid-template-columns:48px 1fr 1fr 1fr;align-items:center}section b{font-weight:400;color:#9299a4}section div{display:flex;flex-direction:column;align-items:center;gap:8px}section span{font-size:10px;color:#9097a2}.dark{background:#24262b;border-color:#393d46;color:#e4e9f0}</style><h1>PAIA · Double cards / native-size check</h1><p>One 48px component. 44px and 50px below are optical inspection scales, not additional product themes.</p><div class="panels">'''+''.join(panels)+'</div>'
    (ROOT/'icon-review.html').write_text(html,encoding='utf-8')
    print('Exported 6 standalone SVGs and native-size inspection sheet.')
