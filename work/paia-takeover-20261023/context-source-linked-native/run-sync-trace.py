from pathlib import Path
import subprocess,os,json,time,hashlib,platform
root=Path.cwd(); out=root/'work/paia-takeover-20261023/context-source-linked-native'; node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'; env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/bin/python3.12',PLAYWRIGHT_MODULE=str(root/'extension/node_modules/playwright'),PAIA_HEADLESS='1')
def text(c):return subprocess.check_output(c,env=env,text=True).strip()
files=text(['git','ls-files','extension/core','extension/ui','extension/background','extension/scripts','extension/tests/harness','extension/tests/native-sync','extension/tests/cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs']).splitlines()
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files}
cmd=[str(node),'--test','--test-concurrency=1','--test-reporter=tap','--test-name-pattern=finite Source-linked cold graph native source','tests/native-sync/group-checkpoint-chrome.test.mjs']
r={'headBefore':text(['git','rev-parse','HEAD']),'command':cmd,'cwd':str(root/'extension'),'node':text([str(node),'--version']),'python':text([env['PYTHON'],'--version']),'playwright':json.loads((root/'extension/node_modules/playwright/package.json').read_text())['version'],'chrome':text(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--version']),'platform':platform.platform(),'headless':True,'sha256Before':hashes()}
(out/'execution-sync-trace.json').write_text(json.dumps(r,indent=2)); t=time.monotonic()
with (out/'native-sync-trace.tap').open('w') as f:p=subprocess.run(cmd,cwd=root/'extension',env=env,stdout=f,stderr=subprocess.STDOUT)
r.update(exitCode=p.returncode,wallMs=(time.monotonic()-t)*1000,headAfter=text(['git','rev-parse','HEAD']),sha256After=hashes());r['sourceStable']=r['sha256Before']==r['sha256After'];(out/'execution-sync-trace.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if not k.startswith('sha256')}))
