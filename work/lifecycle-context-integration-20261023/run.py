from pathlib import Path
import subprocess,json,time,hashlib,os
root=Path.cwd();out=root/'work/lifecycle-context-integration-20261023';node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
files=subprocess.check_output(['git','ls-files','extension/core','extension/background','extension/tests'],text=True).splitlines()
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files if (root/p).is_file()}
names=['cpv1-topic-02-lifecycle','topic-lifecycle-local-consumer','library-documents-owner','thought-m1','ai-cost-03-authored-context','ai-cost-03-bound-context','browser-native-sync-saved-group','browser-native-sync-human-library-indexed-journal','repository-budgeted-all']
command=[str(node),'--test','--test-concurrency=1','--test-reporter=tap']+['extension/tests/'+n+'.test.mjs' for n in names]
d={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'node':subprocess.check_output([str(node),'--version'],text=True).strip(),'command':command,'before':hashes()};start=time.monotonic()
with (out/'owning.log').open('w') as f:r=subprocess.run(command,stdout=f,stderr=subprocess.STDOUT)
d.update(exitCode=r.returncode,wallMs=(time.monotonic()-start)*1000,after=hashes());d['stable']=d['before']==d['after'];(out/'execution.json').write_text(json.dumps(d,indent=2));print(json.dumps({k:v for k,v in d.items() if k not in ['before','after','command']}))
