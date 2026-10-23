from pathlib import Path
import subprocess,json,time,hashlib,os,platform
root=Path.cwd();out=root/'work/saved-structural-milestone-20261023';node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node';release=out/'release'
env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12',PLAYWRIGHT_MODULE=str(root/'extension/node_modules/playwright'),PAIA_HEADLESS='1',PAIA_NATIVE_RELEASE_PATH=str(release))
def text(c):return subprocess.check_output(c,text=True,env=env).strip()
files=text(['git','ls-files','extension/core','extension/background','extension/tests']).splitlines()
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files if(root/p).is_file()}
r={'head':text(['git','rev-parse','HEAD']),'node':text([str(node),'--version']),'python':text([env['PYTHON'],'--version']),'playwright':json.loads((root/'extension/node_modules/playwright/package.json').read_text())['version'],'chrome':text(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--version']),'platform':platform.platform(),'headless':True,'sha256Before':hashes(),'runs':[]}
def run(name,command,cwd=root):
 start=time.monotonic()
 with(out/(name+'.log')).open('w') as f:p=subprocess.run(command,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
 item={'name':name,'command':list(map(str,command)),'cwd':str(cwd),'exitCode':p.returncode,'wallMs':(time.monotonic()-start)*1000};r['runs'].append(item);(out/'execution.json').write_text(json.dumps(r,indent=2));print(json.dumps(item),flush=True);return p.returncode
names=['ai-cost-03-structural-context','ai-cost-03-topic-context','browser-native-sync-saved-group','saved-work-bootstrap','browser-native-sync-group-checkpoint-restore','browser-native-sync-group-checkpoint-plan','browser-native-sync-group-paging','browser-native-sync-nonempty-manual-recovery','browser-native-sync-source-bootstrap','repository-final-read-fence','repository-budgeted-all']
status=run('combined-owning',[str(node),'--test','--test-concurrency=1','--test-reporter=tap']+['extension/tests/'+n+'.test.mjs' for n in names])
if status==0:status=run('build',[env['PYTHON'],'scripts/build_current_release.py',str(release)],root/'extension')
if status==0:status=run('native',[str(node),'--test','--test-concurrency=1','--test-reporter=tap','extension/tests/native-sync/saved-group-chrome.test.mjs','extension/tests/native-sync/structural-correction-chrome.test.mjs'])
r['sha256After']=hashes();r['sourceStable']=r['sha256Before']==r['sha256After'];(out/'execution.json').write_text(json.dumps(r,indent=2));print(json.dumps({'sourceStable':r['sourceStable'],'finalExit':status}),flush=True)
