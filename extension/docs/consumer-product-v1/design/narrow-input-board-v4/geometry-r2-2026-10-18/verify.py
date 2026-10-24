"""Run R1's exact regression suite against R2, with one explicit geometry substitution.
No tests are skipped. Only case04's old noninteractive neck expectation is replaced:
the neck no longer exists, and the adjoining text region now inserts the expression.
The source remains inspectable in verify_r1_inherited.py and is hash-pinned below.
"""
from pathlib import Path
import argparse,hashlib
ROOT=Path(__file__).resolve().parent

def regression_source()->str:
    p=ROOT/'verify_r1_inherited.py';raw=p.read_bytes()
    expected='e42d5178af2a366d1a130583de2e633da77339b8d004b67cf96fa9882ca1b4ad'
    if hashlib.sha256(raw).hexdigest()!=expected:raise RuntimeError('R1 baseline verifier changed')
    s=raw.decode('utf-8')
    before="page.mouse.click(a[0]-3,a[1]+24)\n            must(evaluate('PaiaDemo.fixtures[0].effects')==1,'Neck inserted')"
    after="page.wait_for_timeout(160)\n            page.mouse.click(a[0]-3,a[1]+24)\n            must(evaluate('PaiaDemo.fixtures[0].effects')==2,'Unified text area near the old neck is not usable')"
    if s.count(before)!=1:raise RuntimeError('Expected original case04 not found exactly once')
    s=s.replace(before,after)
    s=s.replace('04 Capsule body, circle and noninteractive neck stay separate','04 Unified capsule body and fixed-circle toggle are separate; old neck is gone')
    s=s.replace('PAIA_Float_R1.html','PAIA_Float_R2.html')
    s=s.replace("'demo.css','demo.js','PAIA_Float_R2.html'","'demo.css','demo.js','geometry.css','geometry.js','verify_r1_inherited.py','PAIA_Float_R2.html'")
    s=s.replace('Exact self-contained HTML loaded with Chromium page.set_content; managed environment blocks file and localhost URL navigation; no policy change or network used','Exact self-contained R2 HTML rendered with Chromium page.set_content; file navigation was not part of this verification')
    return s

def run(executable:str)->int:
    namespace={'__file__':str(ROOT/'verify.py'),'__name__':'r2_regression'}
    exec(compile(regression_source(),'R1-regression-with-explicit-R2-case04','exec'),namespace)
    return namespace['run'](executable)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--chromium',default='/usr/bin/chromium');args=parser.parse_args()
    raise SystemExit(1 if run(args.chromium) else 0)
