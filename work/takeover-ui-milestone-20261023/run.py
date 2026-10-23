from pathlib import Path
import subprocess,os,json,time,hashlib,platform,shutil
root=Path.cwd();out=root/'work/takeover-ui-milestone-20261023';ext=root/'extension';node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node';env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12',PLAYWRIGHT_MODULE=str(ext/'node_modules/playwright'),PAIA_HEADLESS='1',NIB_RELEASE_PATH=str(root/'work/nonempty-manual-recovery-20261023/release'))
def text(c):return subprocess.check_output(c,env=env,text=True).strip()
files=text(['git','ls-files','extension/core','extension/ui','extension/content','extension/adapter','extension/background','extension/scripts','extension/tests']).splitlines()
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files if(root/p).is_file()}
outputs=['ux-r6','qa-dvn-settings','ux-r1','nib-approved','current-context-scope']
for name in outputs:
 d=ext/'work'/name
 if d.exists():shutil.copytree(d,out/'prior-artifacts'/name)
items=[('settings',['tests/uir-04-settings-chrome-e2e.test.mjs']),('shell',['--test-name-pattern=UX-R1 shell uses real','tests/ux-r1-shell-chrome-e2e.test.mjs']),('context',['tests/uir-04-context-chrome-e2e.test.mjs']),('prompt',['--test-name-pattern=approved fixed three forms','tests/nib-approved-fixed-chrome-e2e.test.mjs'])]
r={'headBefore':text(['git','rev-parse','HEAD']),'node':text([str(node),'--version']),'python':text([env['PYTHON'],'--version']),'playwright':json.loads((ext/'node_modules/playwright/package.json').read_text())['version'],'chrome':text(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--version']),'platform':platform.platform(),'headless':True,'sha256Before':hashes(),'invocations':[]};(out/'execution.json').write_text(json.dumps(r,indent=2))
for label,args in items:
 cmd=[str(node),'--test','--test-concurrency=1','--test-reporter=tap',*args];start=time.monotonic()
 with(out/(label+'.tap')).open('w') as f:p=subprocess.run(cmd,cwd=ext,env=env,stdout=f,stderr=subprocess.STDOUT)
 r['invocations'].append({'label':label,'command':cmd,'exitCode':p.returncode,'wallMs':(time.monotonic()-start)*1000});(out/'execution.json').write_text(json.dumps(r,indent=2));print(label,p.returncode,flush=True)
r.update(headAfter=text(['git','rev-parse','HEAD']),sha256After=hashes());r['sourceStable']=r['sha256Before']==r['sha256After']
for name in outputs:
 d=ext/'work'/name
 if d.exists():shutil.copytree(d,out/'artifacts'/name)
(out/'execution.json').write_text(json.dumps(r,indent=2));print('sourceStable',r['sourceStable'],flush=True)
