from pathlib import Path
import subprocess,json,time,hashlib,os,platform
root=Path.cwd(); out=root/'work/nonempty-manual-recovery-20261023'; node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
names=['browser-native-sync-nonempty-manual-recovery','browser-native-sync-group-checkpoint-restore','browser-native-sync-local-recovery','browser-native-sync-manual-owners','browser-native-sync-context-manual','browser-native-sync-group-checkpoint-plan','completed-group-restore-control','browser-native-sync-group-paging','browser-native-sync-group-compaction','browser-native-sync-human-library-group','repository-final-read-fence','saved-work-bootstrap','browser-native-sync-source-bootstrap','thought-m1','browser-native-sync-core','human-source-entry-plan']
cmd=[str(node),'--test','--test-concurrency=1','--test-reporter=tap']+['extension/tests/'+n+'.test.mjs' for n in names]
def call(c): return subprocess.check_output(c,text=True).strip()
files=call(['git','ls-files','extension/core','extension/background','extension/tests']).splitlines()
def hashes(): return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files if (root/p).is_file()}
r={'head':call(['git','rev-parse','HEAD']),'node':call([str(node),'--version']),'platform':platform.platform(),'command':cmd,'sha256Before':hashes()}; (out/'combined-execution.json').write_text(json.dumps(r,indent=2)); start=time.monotonic()
with (out/'combined-owning.tap').open('w') as f: result=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT)
r.update(exitCode=result.returncode,wallMs=(time.monotonic()-start)*1000,sha256After=hashes()); r['sourceStable']=r['sha256Before']==r['sha256After']; (out/'combined-execution.json').write_text(json.dumps(r,indent=2)); print(json.dumps({k:v for k,v in r.items() if not k.startswith('sha256')}))
