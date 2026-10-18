"""Execute all 30 inherited prototype checks with two explicit visual substitutions.
04: the R2 capsule replaces the old dead neck with usable expression area.
21: the fixed R3 board is 328px instead of the historical 312px.
No production assertion or native-extension evidence is modified by this harness.
"""
from pathlib import Path
import argparse,hashlib
ROOT=Path(__file__).resolve().parent

def regression_source():
 raw=(ROOT/'verify_r1_inherited.py').read_bytes()
 if hashlib.sha256(raw).hexdigest()!='e42d5178af2a366d1a130583de2e633da77339b8d004b67cf96fa9882ca1b4ad':
  raise RuntimeError('Inherited verifier identity changed')
 s=raw.decode()
 patches=[("page.mouse.click(a[0]-3,a[1]+24)\n            must(evaluate('PaiaDemo.fixtures[0].effects')==1,'Neck inserted')","page.wait_for_timeout(160)\n            page.mouse.click(a[0]-3,a[1]+24)\n            must(evaluate('PaiaDemo.fixtures[0].effects')==2,'Unified body region failed to insert')"),('04 Capsule body, circle and noninteractive neck stay separate','04 Unified capsule body and fixed toggle have separate actions'),("rect(page,'.ps-board')[3]==312","rect(page,'.ps-board')[3]==328")]
 for a,b in patches:
  if s.count(a)!=1:raise RuntimeError('Expected precise substitution not found: '+a)
  s=s.replace(a,b)
 s=s.replace('PAIA_Float_R1.html','PAIA_Float_R3.html')
 s=s.replace("'demo.css','demo.js','PAIA_Float_R3.html'","'demo.css','demo.js','fusion.css','fusion.js','verify_r1_inherited.py','PAIA_Float_R3.html'")
 s=s.replace('managed environment blocks file and localhost URL navigation; no policy change or network used','file navigation is tested separately; no network used')
 return s

def run(executable):
 ns={'__file__':str(ROOT/'verify.py'),'__name__':'r3_regression'}
 exec(compile(regression_source(),'exact-R1-with-declared-R3-geometry-substitutions','exec'),ns)
 return ns['run'](executable)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--chromium',default='/usr/bin/chromium');args=p.parse_args()
 raise SystemExit(bool(run(args.chromium)))
