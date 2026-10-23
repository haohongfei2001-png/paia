from pathlib import Path
import subprocess,json,time,hashlib,os,platform,shutil
root=Path.cwd();out=root/'work/takeover-composed-native-20261023';ext=root/'extension';node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node';release=out/'release'
env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12',PLAYWRIGHT_MODULE=str(ext/'node_modules/playwright'),PAIA_HEADLESS='1',PAIA_NATIVE_RELEASE_PATH=str(release))
def text(c):return subprocess.check_output(c,env=env,text=True).strip()
files=text(['git','ls-files','extension/core','extension/background','extension/ui','extension/tests']).splitlines()
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files if (root/p).is_file()}
assert not (out/'execution.json').exists(),'preserve earlier execution'
d={'head':text(['git','rev-parse','HEAD']),'node':text([str(node),'--version']),'python':text([env['PYTHON'],'--version']),'playwright':json.loads((ext/'node_modules/playwright/package.json').read_text())['version'],'chrome':text(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--version']),'platform':platform.platform(),'before':hashes(),'runs':[]}
nodefiles=['tests/ai-cost-03-bound-entry-fields.test.mjs','tests/browser-native-sync-saved-successor.test.mjs','tests/topic-lifecycle-dispatch.test.mjs','tests/thought-m1.test.mjs']
nativefiles=['tests/native-sync/mixed-correction-chrome.test.mjs','tests/native-sync/saved-successor-chrome.test.mjs','tests/native-sync/topic-lifecycle-dispatch-chrome.test.mjs']
for name,cmd in [('owning',[str(node),'--test','--test-concurrency=1','--test-reporter=tap',*nodefiles]),('build',[env['PYTHON'],'scripts/build_current_release.py',str(release)]),('native',[str(node),'--test','--test-concurrency=1','--test-reporter=tap',*nativefiles])]:
 assert not (out/(name+'.log')).exists(),'preserve earlier log'
 start=time.monotonic()
 with (out/(name+'.log')).open('w') as f:p=subprocess.run(cmd,cwd=ext,env=env,stdout=f,stderr=subprocess.STDOUT)
 d['runs'].append({'name':name,'command':cmd,'exitCode':p.returncode,'wallMs':(time.monotonic()-start)*1000});print(name,p.returncode,flush=True)
 if p.returncode:break
for name in ['mixed-context-correction-native','qa-bns-saved-successor-native','qa-topic-lifecycle-dispatch-native']:
 art=ext/'work'/name
 if art.exists():shutil.copytree(art,out/'artifacts'/name)
d.update(after=hashes());d['stable']=d['before']==d['after'];(out/'execution.json').write_text(json.dumps(d,indent=2));print('stable',d['stable'],flush=True)
