from pathlib import Path
import os,json,hashlib,subprocess,time,datetime
root=Path('/Users/hhf/.codex/worktrees/organize-handoff-validation/paia')
out=root/'work/uxr4-seed-timing-20261023'
start=json.loads((out/'start.json').read_text())
for item in start['sources']:
 assert hashlib.sha256((root/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
assert all(c['pass'] for c in json.loads((out/'synthetic-validation.json').read_text())['cases'])
node=root/'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
env=os.environ.copy()
env.update(PAIA_HEADLESS='1',PAIA_TEST_CONCURRENCY='1',PLAYWRIGHT_MODULE=str(root/'extension/node_modules/playwright'),PYTHON='/opt/homebrew/opt/python@3.12/bin/python3.12')
env['PATH']=str(node.parent)+':/opt/homebrew/opt/python@3.12/libexec/bin:'+env['PATH']
cmd=[str(node),'--test','--test-concurrency=1',str(out/'diagnostic.test.mjs')]
record={'startedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':cmd,'cwd':str(root/'extension'),'environment':{k:env[k] for k in ['PAIA_HEADLESS','PAIA_TEST_CONCURRENCY','PLAYWRIGHT_MODULE','PYTHON']},'node':'22.23.3','npm':'10.9.9','python':'3.12.14','playwright':'1.63.0','chrome':'156.0.8078.47','platform':'darwin-arm64','timeoutMs':300000,'maximumRuns':1,'inputs':100000,'documents':1000,'topics':300,'entries':5000,'batch':500}
with (out/'run-start.json').open('x') as f:json.dump(record,f,indent=2)
t=time.monotonic()
with (out/'full-scale.log').open('x') as log:
 result=subprocess.run(cmd,cwd=root/'extension',env=env,stdout=log,stderr=subprocess.STDOUT)
record.update(exitCode=result.returncode,wallMs=(time.monotonic()-t)*1000,finishedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourcesUnchanged=all(hashlib.sha256((root/i['path']).read_bytes()).hexdigest()==i['sha256'] for i in start['sources']))
(out/'run-result.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
raise SystemExit(result.returncode)
