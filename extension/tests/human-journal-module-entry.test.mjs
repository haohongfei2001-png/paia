import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Each import starts a fresh graph: preloading the Library owner would hide the
// original class TDZ reached from the semantic invalidator and restore entries.
for(const entry of ['ai-usage/semantic-invalidation.js','browser-native-sync/human-library-journal.js','browser-native-sync/group-checkpoint.js','browser-native-sync/canonical-generation-publication.js'])test('ordinary cold module entry '+entry,()=>{
 const url=new URL('../core/'+entry,import.meta.url).href;
 const result=spawnSync(process.execPath,['--input-type=module','-e','await import('+JSON.stringify(url)+');'],{encoding:'utf8',timeout:15000});
 assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);assert.equal(result.signal,null);
});
test('defining-module captured journal methods retain private binding and prototype guards',async()=>{
 const j=await import('../core/browser-native-sync/human-library-journal.js');
 const core={},journal=new j.HumanLibrarySyncJournal(core),denied=e=>e.code==='GENERATION_REPOSITORY_WRITE_DENIED';
 assert.equal(j.requireOriginalHumanGenerationJournal(journal,core),true);
 assert.throws(()=>j.prepareOriginalHumanGenerationReceive({},core,{},[]),denied);
 assert.throws(()=>j.commitOriginalHumanGenerationReceive(journal,{},null,null),denied);
 const original=Object.getOwnPropertyDescriptor(j.HumanLibrarySyncJournal.prototype,'prepareReceive');
 try{j.HumanLibrarySyncJournal.prototype.prepareReceive=()=>{throw new Error('replacement must never execute');};assert.throws(()=>j.prepareOriginalHumanGenerationReceive(journal,core,{},[]),denied);}
 finally{Object.defineProperty(j.HumanLibrarySyncJournal.prototype,'prepareReceive',original);}
 journal.commitReceiveInTransaction=()=>{throw new Error('own override must never execute');};
 assert.throws(()=>j.commitOriginalHumanGenerationReceive(journal,core,null,null),denied);
 delete journal.commitReceiveInTransaction;assert.equal(j.requireOriginalHumanGenerationJournal(journal,core),true);
});
