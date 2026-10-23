from pathlib import Path
import subprocess,os,json,time,hashlib,platform
root=Path.cwd(); out=root/'work/nonempty-manual-recovery-20261023'; node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'; release=out/'release'; env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12',PLAYWRIGHT_MODULE=str(root/'extension/node_modules/playwright'),PAIA_HEADLESS='1',PAIA_NATIVE_RELEASE_PATH=str(release))
def text(c):return subprocess.check_output(c,env=env,text=True).strip()
files=text(['git','ls-files','extension/core','extension/ui','extension/background','extension/scripts','extension/tests/harness','extension/tests/native-sync','services/ai-gateway/tests/maintenance-context-correction-native.test.mjs']).splitlines()
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files}
cmd=[str(node),'--test','--test-concurrency=1','--test-reporter=tap','extension/tests/native-sync/manual-merge-chrome.test.mjs','services/ai-gateway/tests/maintenance-context-correction-native.test.mjs']
r={'headBefore':text(['git','rev-parse','HEAD']),'command':cmd,'cwd':str(root),'node':text([str(node),'--version']),'python':text([env['PYTHON'],'--version']),'playwright':json.loads((root/'extension/node_modules/playwright/package.json').read_text())['version'],'chrome':text(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--version']),'platform':platform.platform(),'headless':True,'sha256Before':hashes()};(out/'native-execution.json').write_text(json.dumps(r,indent=2));start=time.monotonic()
with (out/'build.log').open('w') as f:b=subprocess.run([env['PYTHON'],'scripts/build_current_release.py',str(release)],cwd=root/'extension',env=env,stdout=f,stderr=subprocess.STDOUT)
r['buildExitCode']=b.returncode
if b.returncode==0:
 with (out/'native-combined.tap').open('w') as f:p=subprocess.run(cmd,cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT)
 r['exitCode']=p.returncode
r.update(wallMs=(time.monotonic()-start)*1000,headAfter=text(['git','rev-parse','HEAD']),sha256After=hashes());r['sourceStable']=r['sha256Before']==r['sha256After'];(out/'native-execution.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if not k.startswith('sha256')}))
