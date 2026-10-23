from pathlib import Path
import subprocess,json,time,hashlib,os
root=Path.cwd();out=root/'work/saved-structural-milestone-20261023';node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12',PLAYWRIGHT_MODULE=str(root/'extension/node_modules/playwright'),PAIA_HEADLESS='1',PAIA_NATIVE_RELEASE_PATH=str(out/'release'))
files=subprocess.check_output(['git','ls-files','extension/core','extension/background','extension/tests'],text=True).splitlines()
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files if(root/p).is_file()}
cmd=[str(node),'--test','--test-concurrency=1','--test-reporter=tap','extension/tests/native-sync/structural-correction-chrome.test.mjs'];r={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'command':cmd,'releaseFrom':'765f24443e2fa84b4e3db39ecc943c207ccf80bd','runtimeUnchanged':True,'sha256Before':hashes()};start=time.monotonic()
with(out/'structural-corrected.log').open('w') as f:p=subprocess.run(cmd,env=env,stdout=f,stderr=subprocess.STDOUT)
r.update(exitCode=p.returncode,wallMs=(time.monotonic()-start)*1000,sha256After=hashes());r['sourceStable']=r['sha256Before']==r['sha256After'];(out/'structural-corrected-execution.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if not k.startswith('sha256')}))
