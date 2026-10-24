"""Build the single offline R2 HTML. No dependencies or external resources."""
from pathlib import Path
import argparse
CSS=('demo.css','component.css','geometry.css')
JS=('component.js','geometry.js','demo.js')
def build(root:Path)->str:
    html=(root/'index.html').read_text(encoding='utf-8')
    for name in CSS:
        html=html.replace(f'<link rel="stylesheet" href="{name}">','<style>\n'+(root/name).read_text(encoding='utf-8')+'\n</style>')
    scripts=[]
    for name in JS:
        html=html.replace(f'<script defer src="{name}"></script>','')
        source=(root/name).read_text(encoding='utf-8')
        if '</script' in source.lower():raise ValueError('Unsafe script terminator: '+name)
        scripts.append('<script>\n'+source+'\n</script>')
    return html.replace('</body>','\n'.join(scripts)+'\n</body>')
if __name__=='__main__':
    root=Path(__file__).resolve().parent
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=root/'PAIA_Float_R2.html');args=parser.parse_args()
    args.output.write_text(build(root),encoding='utf-8');print(args.output)
