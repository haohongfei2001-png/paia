"""Build a self-contained, offline HTML from the adjacent review sources."""
from pathlib import Path
import argparse

def build(root: Path) -> str:
    html = (root / 'index.html').read_text(encoding='utf-8')
    for name in ('demo.css', 'component.css'):
        html = html.replace(f'<link rel="stylesheet" href="{name}">', '<style>\n' + (root/name).read_text(encoding='utf-8') + '\n</style>')
    scripts = []
    for name in ('component.js', 'demo.js'):
        html = html.replace(f'<script defer src="{name}"></script>', '')
        source = (root/name).read_text(encoding='utf-8')
        if '</script' in source.lower():
            raise ValueError(f'Unsafe script terminator in {name}')
        scripts.append('<script>\n'+source+'\n</script>')
    return html.replace('</body>', '\n'.join(scripts)+'\n</body>')

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent/'PAIA_Float_R1.html')
    args=parser.parse_args()
    args.output.write_text(build(Path(__file__).resolve().parent),encoding='utf-8')
    print(args.output)
