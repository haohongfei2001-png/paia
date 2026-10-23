from pathlib import Path
import subprocess, json, time, hashlib, os, platform, shutil, sys
root=Path.cwd(); out=root/'work/sync-consumer-integration-20261023'; ext=root/'extension'
plan=json.loads((out/'plan.json').read_text()); node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'; release=out/'release'
env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12',PLAYWRIGHT_MODULE=str(ext/'node_modules/playwright'),PAIA_HEADLESS='1',PAIA_NATIVE_RELEASE_PATH=str(release))
def read(cmd): return subprocess.check_output(cmd,env=env,text=True).strip()
files=read(['git','ls-files','extension/core','extension/background','extension/ui','extension/tests']).splitlines()
def hashes(): return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files if (root/p).is_file()}
receipt=out/'execution.json'
assert not receipt.exists(), 'keep previous execution'
for name in plan['artifacts']: assert not (ext/'work'/name).exists(), 'keep previous native output '+name
for name in plan['owning']+plan['native']: assert (ext/'tests'/name).is_file(), name
assert not any('phased-stage.test' in p or '129' in p for p in plan['owning']+plan['native'])
d={'head':read(['git','rev-parse','HEAD']),'plan':plan,'node':read([str(node),'--version']),'python':read([env['PYTHON'],'--version']),'playwright':json.loads((ext/'node_modules/playwright/package.json').read_text())['version'],'chrome':read(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--version']),'platform':platform.platform(),'before':hashes(),'runs':[]}
receipt.write_text(json.dumps(d,indent=2))
commands=[('node',[str(node),'--test','--test-concurrency=1','--test-reporter=tap',*['tests/'+p for p in plan['owning']]]),('build',[env['PYTHON'],'scripts/build_current_release.py',str(release)]),('native',[str(node),'--test','--test-concurrency=1','--test-reporter=tap',*['tests/'+p for p in plan['native']]])]
for name,cmd in commands:
 log=out/(name+'.log'); assert not log.exists(); start=time.monotonic()
 with log.open('w') as f: result=subprocess.run(cmd,cwd=ext,env=env,stdout=f,stderr=subprocess.STDOUT)
 d['runs'].append({'name':name,'command':cmd,'exitCode':result.returncode,'wallMs':(time.monotonic()-start)*1000}); receipt.write_text(json.dumps(d,indent=2)); print(name,result.returncode,flush=True)
 if result.returncode: break
for name in plan['artifacts']:
 source=ext/'work'/name
 if source.exists(): shutil.copytree(source,out/'native-artifacts'/name)
d['after']=hashes();d['stable']=d['before']==d['after'];receipt.write_text(json.dumps(d,indent=2));print('stable',d['stable'],flush=True)
sys.exit(0 if d['stable'] and len(d['runs'])==3 and all(r['exitCode']==0 for r in d['runs']) else 1)
