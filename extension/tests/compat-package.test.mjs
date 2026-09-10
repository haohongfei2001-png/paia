import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {tmpdir} from 'node:os';import {join} from 'node:path';
test('development build keeps permissions and resolver identical; only generated observer/worker enable sampler',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'compat-package-'));try{
  assert.equal(spawnSync('python3',['scripts/package_development.py',temp]).status,0);
  const original=JSON.parse(await readFile('manifest.json')),dev=JSON.parse(await readFile(join(temp,'manifest.json')));
  for(const key of ['permissions','host_permissions','optional_permissions','content_security_policy','web_accessible_resources'])assert.deepEqual(dev[key],original[key]);
  const runtime=await readFile('content/response-observer.js','utf8');assert.ok(!runtime.includes('PAIADevelopment'));assert.ok((await readFile(join(temp,'content/response-observer.js'),'utf8')).includes('PAIADevelopment.observe'));
  for(const p of ['core/source-time-resolver.js','core/store.js','adapter/chatgpt-adapter.js','content/response-bridge.js'])assert.equal(await readFile(join(temp,p),'utf8'),await readFile(p,'utf8'));
  assert.equal(await readFile(join(temp,'development/compat/sanitizer-main.js'),'utf8'),await readFile('development/compat/sanitizer.js','utf8'));
  assert.ok(!(await readFile('background/service-worker.js','utf8')).includes('DEV_COMPAT_CHECK'));
  assert.ok((await readFile(join(temp,'background/service-worker.js'),'utf8')).includes('DEV_COMPAT_CHECK'));
  assert.notEqual(spawnSync('python3',['scripts/package_development.py',temp],{stdio:'ignore'}).status,0,'refuse stale destination');
 }finally{await rm(temp,{recursive:true,force:true});}
});
