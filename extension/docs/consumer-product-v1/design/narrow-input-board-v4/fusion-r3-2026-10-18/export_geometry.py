"""Export exact surface outlines; the inherited card SVGs are never redrawn."""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SURFACES={
 'skin-collapsed.svg':(48,48,'<rect x=".5" y=".5" width="47" height="47" rx="23.5"/>'),
 'skin-capsule.svg':(272,48,'<rect x=".5" y=".5" width="271" height="47" rx="23.5"/>'),
 'skin-board.svg':(336,328,'<path d="M18 .5H318A17.5 17.5 0 0 1 335.5 18V304A23.5 23.5 0 0 1 312 327.5H18A17.5 17.5 0 0 1 .5 310V18A17.5 17.5 0 0 1 18 .5Z"/>')}
for name,(w,h,shape) in SURFACES.items():
 s=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="PAIA R3 surface outline"><g fill="var(--surface,#fff)" stroke="var(--border,#dce0e7)" stroke-width="1">{shape}</g></svg>\n'
 (ROOT/'assets'/name).write_text(s)
