from pathlib import Path
import subprocess, json, time, hashlib, os, platform, shutil, sys

root = Path.cwd()
out = root / 'work/recovery-completion-milestone-20261023'
ext = root / 'extension'
node = root / 'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
release = out / 'release'
env = dict(os.environ, PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'], PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12', PLAYWRIGHT_MODULE=str(ext/'node_modules/playwright'), PAIA_HEADLESS='1', PAIA_NATIVE_RELEASE_PATH=str(release))
def text(command):
    return subprocess.check_output(command, env=env, text=True).strip()
files = text(['git','ls-files','extension/core','extension/background','extension/ui','extension/tests']).splitlines()
def hashes():
    return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files if (root/p).is_file()}
receipt = out/'execution.json'
assert not receipt.exists(), 'prior execution must remain preserved'
owning = ['canonical-recovery-completion.test.mjs','application-store-selection.test.mjs','qualified-human-cold-retirement.test.mjs','browser-native-sync-selected-purge-group.test.mjs','canonical-generation-publication.test.mjs']
native = ['canonical-recovery-completion-chrome.test.mjs','qualified-human-retirement-chrome.test.mjs','selected-purge-group-native.test.mjs']
artifacts = ['qa-canonical-recovery-completion-native','qa-qualified-human-retirement-native','qa-selected-purge-group-native']
for name in artifacts:
    assert not (ext/'work'/name).exists(), 'do not overwrite previous native evidence: '+name
d = {'head':text(['git','rev-parse','HEAD']), 'node':text([str(node),'--version']), 'python':text([env['PYTHON'],'--version']), 'playwright':json.loads((ext/'node_modules/playwright/package.json').read_text())['version'], 'chrome':text(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--version']), 'platform':platform.platform(), 'before':hashes(), 'runs':[], 'scope':'Small original recovery completion, retirement and selected Source positive/negative composition only. No 65/129 or prior phased-stage owning file.'}
receipt.write_text(json.dumps(d,indent=2))
for name,cmd in [('node',[str(node),'--test','--test-concurrency=1','--test-reporter=tap',*['tests/'+p for p in owning]]),('build',[env['PYTHON'],'scripts/build_current_release.py',str(release)]),('native',[str(node),'--test','--test-concurrency=1','--test-reporter=tap',*['tests/native-sync/'+p for p in native]])]:
    log=out/(name+'.log')
    assert not log.exists(), 'preserve earlier log'
    start=time.monotonic()
    with log.open('w') as f:
        p=subprocess.run(cmd,cwd=ext,env=env,stdout=f,stderr=subprocess.STDOUT)
    d['runs'].append({'name':name,'command':cmd,'exitCode':p.returncode,'wallMs':(time.monotonic()-start)*1000})
    receipt.write_text(json.dumps(d,indent=2))
    print(name,p.returncode,flush=True)
    if p.returncode:
        break
for name in artifacts:
    source=ext/'work'/name
    if source.exists():
        shutil.copytree(source,out/'native-artifacts'/name)
d['after']=hashes()
d['stable']=d['before']==d['after']
receipt.write_text(json.dumps(d,indent=2))
print('stable',d['stable'],flush=True)
sys.exit(0 if d['stable'] and len(d['runs'])==3 and all(r['exitCode']==0 for r in d['runs']) else 1)
