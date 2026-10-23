from pathlib import Path
import subprocess,json,time,hashlib,os,shutil
root=Path.cwd();out=root/'work/takeover-composed-native-20261023';ext=root/'extension';node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12',PLAYWRIGHT_MODULE=str(ext/'node_modules/playwright'),PAIA_HEADLESS='1',PAIA_NATIVE_RELEASE_PATH=str(out/'release'))
prior=json.loads((out/'execution.json').read_text());assert prior['stable']
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in prior['before']}
before=hashes();changes=[p for p in before if before[p]!=prior['after'][p]]
assert sorted(changes)==sorted(['extension/tests/native-sync/structural-correction-bridge.mjs','extension/tests/native-sync/saved-successor-fixture.mjs']),changes
assert not (out/'native-corrected.log').exists()
cmd=[str(node),'--test','--test-concurrency=1','--test-reporter=tap','tests/native-sync/mixed-correction-chrome.test.mjs','tests/native-sync/saved-successor-chrome.test.mjs'];start=time.monotonic()
with (out/'native-corrected.log').open('w') as f:p=subprocess.run(cmd,cwd=ext,env=env,stdout=f,stderr=subprocess.STDOUT)
d={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'command':cmd,'exitCode':p.returncode,'wallMs':(time.monotonic()-start)*1000,'changesSinceBuild':changes,'reusedBuildHead':prior['head'],'before':before,'after':hashes()};d['stable']=d['before']==d['after']
for name in ['mixed-context-correction-native','qa-bns-saved-successor-native']:shutil.copytree(ext/'work'/name,out/'corrected-artifacts'/name)
(out/'corrected-execution.json').write_text(json.dumps(d,indent=2));print('native-corrected',p.returncode,'stable',d['stable'],flush=True)
