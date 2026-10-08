// Synthetic manual Info/Rules/Now owners only; no provider, full restore or product worker wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,cp,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
for(const variant of ['source','release'])test('BNS manual Context native owner '+variant,{timeout:120000},async()=>{
 const output=await mkdtemp(join(tmpdir(),'paia-context-release-'));let extension,device;
 const evidence={variant,result:'IN_PROGRESS',scope:'manual Info/Rules/Now optional owners only',provider:false,fullCanonicalRestore:false};
 try{
  if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',join(output,'release')],{cwd:root,stdio:'pipe'});
  extension=await instrumentedExtension(variant==='source'?root:join(output,'release'));
  await cp(new URL('./context-info-worker-fixture.mjs',import.meta.url),join(extension.path,'background/bns-native-storage-fixture.mjs'));
  evidence.productionHashes={...extension.hashes};
  for(const path of ['core/browser-native-sync/manual-owners.js','core/context-cards.js','core/browser-native-sync/context-journal.js','core/browser-native-sync/codecs.js','core/browser-native-sync/canonical-readiness.js'])evidence.productionHashes[path]=createHash('sha256').update(await readFile(join(extension.path,path))).digest('hex');
  device=await startNative(extension.path);
  evidence.ownerCases=await device.call('matrix');assert.equal(evidence.ownerCases.length,47);
  const before=await device.call('durable-create');assert.equal(before.prompts.overrides.length,1);assert.equal(before.prompts.overrides[0].text,'SYNTHETIC durable mixed Prompt');assert.equal(before.row.items[0].lifecycle,'removed');assert.deepEqual(before.row.items.map(x=>[x.card,x.lifecycle]),[['info','removed'],['rules','removed'],['now','removed']]);
  evidence.restart=await device.restart();
  assert.deepEqual(await device.call('durable-read'),before,'canonical item, protocol state and local receipt survive actual worker replacement');
  evidence.isolation=await device.isolation();evidence.result='PASS';
 }catch(error){evidence.error=error.stack;throw error;}
 finally{await device?.close();await extension?.cleanup();await rm(output,{recursive:true,force:true});await mkdir(join(root,'work/qa-bns-context-info'),{recursive:true});await writeFile(join(root,'work/qa-bns-context-info',variant+'.json'),JSON.stringify(evidence,null,2));}
});
