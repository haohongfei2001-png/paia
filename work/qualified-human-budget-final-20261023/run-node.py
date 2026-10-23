from pathlib import Path
import subprocess,json,time,hashlib,os
root=Path.cwd();out=root/'work/qualified-human-budget-final-20261023';ext=root/'extension';node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
env=dict(os.environ,PATH=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+os.environ['PATH'],PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12')
files=['browser-native-sync-source-purge-group.test.mjs','qualified-human-recovery-budget.test.mjs','repository-committed-work.test.mjs','repository-budgeted-all.test.mjs','canonical-generation-repository-gate.test.mjs','canonical-generation-publication.test.mjs','canonical-generation-checkpoint-stage.test.mjs','checkpoint-manifest-storage.test.mjs','checkpoint-manifest-storage-cold.test.mjs','canonical-generation-phased-copy-retirement.test.mjs']
assert all('phased-stage' not in p for p in files)
def text(c):return subprocess.check_output(c,env=env,text=True).strip()
paths=text(['git','ls-files','extension/core','extension/background','extension/tests']).splitlines()
def vector():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}
assert not (out/'node-execution.json').exists()
assert not (out/'node.log').exists()
cmd=[str(node),'--test','--test-concurrency=1','--test-reporter=tap',*['tests/'+p for p in files]]
d={'head':text(['git','rev-parse','HEAD']),'command':cmd,'before':vector(),'node':text([str(node),'--version']),'python':text([env['PYTHON'],'--version'])}
(out/'node-execution.json').write_text(json.dumps(d,indent=2));start=time.monotonic()
with (out/'node.log').open('x') as f:p=subprocess.run(cmd,cwd=ext,env=env,stdout=f,stderr=subprocess.STDOUT)
d.update(exitCode=p.returncode,wallMs=(time.monotonic()-start)*1000,after=vector());d['stable']=d['before']==d['after'];(out/'node-execution.json').write_text(json.dumps(d,indent=2));print(json.dumps({k:d[k] for k in ['head','exitCode','wallMs','stable']}),flush=True)
