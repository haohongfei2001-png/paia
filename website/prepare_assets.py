"""One-time asset preparation. No downloads on website visitors' devices.
Reproduction uses the checked-in assets; remote acquisition is explicit.
"""
from pathlib import Path
from urllib.request import urlopen,Request
import json,hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets/website'

def acquire():
    from PIL import Image,ImageEnhance
    from io import BytesIO
    from fontTools.ttLib import TTFont
    manifest={}
    def get(url):
        with urlopen(Request(url,headers={'User-Agent':'PAIA-Website-AssetPreparation/4'}),timeout=40) as r:return r.read()
    for n,file in [('openai','openai.svg'),('claude','claude-color.svg'),('gemini','gemini-color.svg')]:
        target=ASSETS/'marks'/f'{n}.svg';target.parent.mkdir(parents=True,exist_ok=True)
        url='https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/'+file
        if not target.exists():target.write_bytes(get(url))
        manifest[target.relative_to(ROOT).as_posix()]={'source':url,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'role':'Source identification only. No endorsement or partnership; planned sources are labelled.'}
    licenses=ASSETS/'licenses';licenses.mkdir(exist_ok=True)
    for filename,url in [('lobe-icons-MIT.txt','https://raw.githubusercontent.com/lobehub/lobe-icons/master/LICENSE'),('EB-Garamond-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/OFL.txt')]:
        p=licenses/filename
        if not p.exists():p.write_bytes(get(url))
    for name,filename in [('display','EBGaramond%5Bwght%5D.ttf'),('display-italic','EBGaramond-Italic%5Bwght%5D.ttf')]:
        target=ASSETS/'type'/f'{name}.woff2';target.parent.mkdir(exist_ok=True)
        url='https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/'+filename
        if not target.exists():
            font=TTFont(BytesIO(get(url)));font.flavor='woff2';font.save(target)
        manifest[target.relative_to(ROOT).as_posix()]={'source':url,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'license':'SIL OFL 1.1','role':'Self-hosted display type; no runtime third-party font request.'}
    for name in ['coast','light']:
        target=ASSETS/'media'/f'{name}.webp';target.parent.mkdir(exist_ok=True)
        src=ROOT/f'design/website-editorial-v1/assets/{name}.jpg'
        if not target.exists():
            img=Image.open(src);img.thumbnail((1100,1300))
            if name=='coast':img=ImageEnhance.Color(ImageEnhance.Contrast(ImageEnhance.Brightness(img).enhance(1.48)).enhance(.76)).enhance(.65)
            img.save(target,quality=85,method=6)
        manifest[target.relative_to(ROOT).as_posix()]={'source':f'design/website-editorial-v1/assets/{name}.jpg','sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'role':'Fixed photographic role retained from earlier licensed asset; see original manifest. Coast grade: brightness 1.48, contrast .76, saturation .65.'}
    target=ASSETS/'media/arch.webp'
    if not target.exists():raise FileNotFoundError('Owner-selected architectural crop must be supplied, never silently substituted.')
    manifest[target.relative_to(ROOT).as_posix()]={'source':'Owner-supplied selected AI-generated website reference (2026-09-27 request)','crop':[455,1370,840,1683],'source_dimensions':[935,1683],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'role':'Exact architecture crop, no text; not claimed as a high-resolution original photograph.'}
    (ASSETS/'asset-lock.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':acquire()
