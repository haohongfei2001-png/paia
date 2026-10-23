from pathlib import Path
import subprocess,json,time,hashlib,os,shutil,sys
root=Path.cwd();out=root/'work/recovery-completion-milestone-20261023';ext=root/'extension'
node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12',PLAYWRIGHT_MODULE=str(ext/'node_modules/playwright'),PAIA_HEADLESS='1',PAIA_NATIVE_RELEASE_PATH=str(out/'release'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
old=json.loads((out/'execution.json').read_text())
assert old['stable'] and next(r for r in old['runs'] if r['name']=='build')['exitCode']==0
unchanged={p:v for p,v in old['after'].items() if p.startswith(('extension/core/','extension/background/','extension/ui/'))}
assert all(digest(root/p)==v for p,v in unchanged.items()),'existing build must match runtime'
label=sys.argv[1] if len(sys.argv)==2 else 'affected'
assert label in ['affected','final-affected']
path=out/(label+'-execution.json');assert not path.exists()
before={p:digest(root/p) for p in old['after']}
d={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'originalBuildHead':old['head'],'runtimeUnchanged':True,'before':before,'runs':[]}
for name,cmd in [(label+'-node',[str(node),'--test','--test-concurrency=1','--test-reporter=tap','tests/canonical-recovery-completion.test.mjs']),(label+'-native',[str(node),'--test','--test-concurrency=1','--test-reporter=tap','tests/native-sync/canonical-recovery-completion-chrome.test.mjs'])]:
 log=out/(name+'.log');assert not log.exists();start=time.monotonic()
 with log.open('w') as f:p=subprocess.run(cmd,cwd=ext,env=env,stdout=f,stderr=subprocess.STDOUT)
 d['runs'].append({'name':name,'command':cmd,'exitCode':p.returncode,'wallMs':(time.monotonic()-start)*1000});path.write_text(json.dumps(d,indent=2));print(name,p.returncode,flush=True)
 if p.returncode:break
source=ext/'work/qa-canonical-recovery-completion-native'
if source.exists():shutil.copytree(source,out/(label+'-native-artifacts')/source.name)
d['after']={p:digest(root/p) for p in before};d['stable']=d['before']==d['after'];path.write_text(json.dumps(d,indent=2));print('stable',d['stable'],flush=True)
sys.exit(0 if d['stable'] and len(d['runs'])==2 and all(r['exitCode']==0 for r in d['runs']) else 1)
