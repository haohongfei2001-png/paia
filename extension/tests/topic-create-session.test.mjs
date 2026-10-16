import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TopicController} from '../ui/topic-workspace.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
async function fixture(run){const {s}=await setup(OrganizerStore);const rows=()=>s.repository.transaction(false,t=>t.all('topics'));await run({s,rows});}
// PAIA-SECTION-1.0 retires the generic creation flow. Domain creation still
// serves qualified promotion, import and automation; keep its original fences.
test('ordinary Topic controller has no generic creation action',()=>{assert.equal(TopicController.prototype.createTopic,undefined);});
test('Home and contextual destination picker cannot dispatch generic Topic creation',()=>{
 for(const path of ['../ui/topic-workspace.js','../ui/topic-actions.js','../ui/personal-topic-root.js']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');assert.doesNotMatch(source,/CREATE_LIBRARY_TOPIC|data-create-topic/);
 }
});
test('owner epoch fence rejects old receipt replay and immutable guard changes',()=>fixture(async({s})=>{
 const req={name:'Guarded',operationId:crypto.randomUUID(),expectedRecoveryEpoch:'initial'},result=await s.createTopic(req);assert.deepEqual(await s.createTopic(req),result);await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'new'}));await assert.rejects(()=>s.createTopic(req),e=>e.code==='BACKUP_CHANGED');await assert.rejects(()=>s.createTopic({...req,expectedRecoveryEpoch:'new'}));
}));
test('journal guard refuses before delegation and legacy request stays compatible',()=>fixture(async({s})=>{
 const calls=[];s.humanLibraryJournal={execute:async(...a)=>{calls.push(a);return {legacy:true};}};await assert.rejects(()=>s.createTopic({name:'Guarded',operationId:crypto.randomUUID(),expectedRecoveryEpoch:'initial'}),e=>e.code==='BNS_HUMAN_UNSUPPORTED_MUTATION');assert.equal(calls.length,0);assert.deepEqual(await s.createTopic({name:'Legacy',operationId:crypto.randomUUID()}),{legacy:true});assert.equal(calls.length,1);
}));

test('compatibility post-create transaction cannot mutate a replacement epoch',()=>fixture(async({s})=>{
 const original=s.foundationWrite.bind(s);let replaced=false;
 s.foundationWrite=async fn=>{if(!replaced){replaced=true;await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'new'}));}return original(fn);};
 await assert.rejects(()=>s.createTopic({name:'Guarded compatibility',operationId:crypto.randomUUID(),expectedRecoveryEpoch:'initial'}),e=>e.code==='BACKUP_CHANGED');
}));
for(const value of ['',42,'x'.repeat(201)])test('create rejects malformed optional epoch '+typeof value,()=>fixture(async({s,rows})=>{
 await assert.rejects(()=>s.createTopic({name:'Invalid guard',operationId:crypto.randomUUID(),expectedRecoveryEpoch:value}));assert.equal((await rows()).length,0);
}));
