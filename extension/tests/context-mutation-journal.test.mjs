import test from 'node:test';import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,readContextCards} from '../core/context-cards.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {ContextMutationSyncJournal} from '../core/browser-native-sync/context-mutation-journal.js';
const op=()=>crypto.randomUUID(),datasetId='SYNTHETIC_context_mutation';
async function device(t){const f=await setup(OrganizerStore);await f.s.finishFoundation();const core=new BrowserNativeSyncCore(f.s.repository,{datasetId,deviceId:op()}),journal=new ContextMutationSyncJournal(core,{store:f.s}),service=new ContextCardsService(f.s,{syncJournal:journal});t.after(()=>f.s.repository.close());return {...f,core,journal,service};}
const read=f=>f.s.repository.transaction(false,t=>readContextCards(t));
const put=(extra={})=>({kind:'put',operationId:op(),epoch:'initial',itemId:op(),expectedRevision:0,body:'SYNTHETIC literal\r\nbody',section:'SYNTHETIC',card:'info',...extra});
async function group(f,id){const ops=[];for await(const row of f.core.rows('revision'))ops.push(row.operation);const commit=ops.find(x=>x.type==='contextMutationCommit'&&x.value.domainOperationId===id);return [...commit.value.members.map(ref=>ops.find(x=>x.revisionId===ref.revisionId)),commit];}
const snapshot=f=>f.s.repository.transaction(false,async t=>({meta:await t.all('meta'),receipts:await t.all('operationReceipts')}));
test('actual original Context put commits canonical/outbox and real receiver materializes same literal body',async t=>{const a=await device(t),b=await device(t),c=put();assert.equal((await a.service.change(c)).ok,true);const operations=await group(a,c.operationId);assert.equal(operations.length,2);assert.equal((await b.journal.receive(b.service,operations)).state,'applied');assert.deepEqual(await read(b),await read(a));assert.equal((await b.journal.receive(b.service,operations)).state,'duplicate');assert.equal((await b.service.change({...c,operationId:op(),expectedRevision:1,body:'SYNTHETIC receiver edit'})).ok,true);});
test('actual two owner reorder, cross-card move and undo preserve their original receipts through receive',async t=>{const a=await device(t),b=await device(t),cs=[put(),put()];for(const c of cs){await a.service.change(c);await b.journal.receive(b.service,await group(a,c.operationId));}const reorder={kind:'reorder',operationId:op(),epoch:'initial',itemId:cs[1].itemId,expectedRevision:1,adjacentId:cs[0].itemId,adjacentRevision:1,direction:'up',card:'info',section:'SYNTHETIC'};await a.service.change(reorder);await b.journal.receive(b.service,await group(a,reorder.operationId));let row=await read(a);const move={kind:'move',operationId:op(),epoch:'initial',itemId:cs[1].itemId,expectedRevision:2,fromCard:'info',toCard:'rules',expectedAccess:Object.fromEntries(['global','info','rules'].map(k=>[k,row.access[k]]))};await a.service.change(move);await b.journal.receive(b.service,await group(a,move.operationId));const undo={...move,operationId:op(),expectedRevision:3,fromCard:'rules',toCard:'info',undoOf:move.operationId};await a.service.change(undo);await b.journal.receive(b.service,await group(a,undo.operationId));assert.deepEqual(await read(a),await read(b));});
test('a split group and direct generic remote operation cannot write any canonical or protocol row',async t=>{const a=await device(t),b=await device(t),c=put();await a.service.change(c);const operations=await group(a,c.operationId),before=await snapshot(b);await assert.rejects(b.journal.receive(b.service,operations.slice(0,1)));await assert.rejects(b.core.receiveBatch(operations.slice(0,1)));assert.deepEqual(await snapshot(b),before);});

import {ContextManualSyncJournal,contextManualMaterializer} from '../core/browser-native-sync/context-journal.js';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {inputEdit} from './harness/thought-m1.mjs';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
async function automatic(f){
 await f.s.setFilterMode('off');const input=(await f.s.snapshot()).library.blocks[0],topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC context lineage'});
 await inputEdit(f.s,input.id,{libraryText:'SYNTHETIC eligible Context source'});const current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 const caller=Object.freeze({id:op()}),controller=new AbortController(),expiresAt=Date.now()+600000,verifier={async verify(actual,store,scope){if(actual!==caller||store!==f.s)return null;return {version:1,store,accountId:'SYNTHETIC',processorId:'SYNTHETIC',authorizationGeneration:1,scope,processing:true,expiresAt,revocationSignal:controller.signal};},isCurrent(actual,r,store){return actual===caller&&store===f.s&&r.authorizationGeneration===1;}};
 const service=new ContextMaintenanceService(f.s,{processingVerifier:verifier}),scope=await readContextTopicScope(f.s,{topicId:topic.id}),projection=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,input.id));assert.equal(scope.available,true);
 const command={operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC automatic Context',section:'SYNTHETIC',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(projection.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:projection.lastRemovalSequence}]};
 assert.equal((await service.maintain(caller,command)).ok,true);return {command,input,topic};
}
test('existing original manual per-card ancestor remains exact while next move crosses the old codec type',async t=>{
 const a=await device(t),b=await device(t),old=new ContextCardsService(a.s,{syncJournal:new ContextManualSyncJournal(a.core)}),c=put();await old.change(c);const oldHead=await a.core.read('head','contextItem',c.itemId),oldOperation=(await a.core.read('revision',oldHead.revisions[0])).operation;
 b.core.materialize=contextManualMaterializer(b.core);await b.core.receiveBatch([oldOperation]);b.core.materialize=null;
 const row=await read(a),move={kind:'move',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1,fromCard:'info',toCard:'rules',expectedAccess:Object.fromEntries(['global','info','rules'].map(k=>[k,row.access[k]]))};await a.service.change(move);const ops=await group(a,move.operationId);assert.equal(ops[0].value.previous.revisionId,oldOperation.revisionId);await b.journal.receive(b.service,ops);assert.deepEqual(await read(a),await read(b));assert.deepEqual(await a.core.read('head','contextItem',c.itemId),oldHead);
});
test('explicit bootstrap reads existing original manual owner and does not mint a second command receipt',async t=>{
 const a=await device(t),b=await device(t),local=new ContextCardsService(a.s),c=put();await local.change(c);await assert.rejects(a.service.change({...c,operationId:op(),expectedRevision:1,body:'SYNTHETIC blocked until represented'}),e=>e.code==='BNS_CONTEXT_BOOTSTRAP_REQUIRED');const receiptCount=(await snapshot(a)).receipts.length;
 let r;await assert.doesNotReject(async()=>{r=await a.journal.bootstrapItem(a.service,c.itemId);},'local bootstrap');assert.equal((await snapshot(a)).receipts.length,receiptCount);await assert.doesNotReject(async()=>b.journal.receive(b.service,await group(a,r.operationId)),'remote bootstrap');assert.deepEqual(await read(a),await read(b));await assert.doesNotReject(b.service.change({...c,operationId:op(),expectedRevision:1,body:'SYNTHETIC bootstrapped edit'}),'bootstrapped edit');
});
test('real automatic maintenance, human adoption and mixed adjacent reorder retain exact original lineage',async t=>{
 const a=await device(t),f=await automatic(a),before=(await read(a)).items[0];await a.journal.bootstrapItem(a.service,before.id);
 const c=put();await a.service.change(c);await a.service.change({kind:'reorder',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1,adjacentId:before.id,adjacentRevision:1,direction:'up',card:'info',section:'SYNTHETIC'});
 let item=(await read(a)).items.find(x=>x.id===before.id);assert.equal(item.origin,'automatic');assert.deepEqual(item.maintenance,before.maintenance);
 await a.service.change(put({itemId:before.id,expectedRevision:2,body:'SYNTHETIC adopted literal\r\nbody'}));item=(await read(a)).items.find(x=>x.id===before.id);assert.equal(item.protected,true);assert.equal(item.userEdited,true);assert.equal(item.origin,'automatic');assert.deepEqual(item.maintenance,before.maintenance);
 const last=await a.core.read('head','contextMutationMember',before.id),operation=(await a.core.read('revision',last.revisions[0])).operation;assert.equal(operation.value.item.origin,'automatic');assert.deepEqual(operation.value.item.maintenance,before.maintenance);assert.equal(f.input.id,item.maintenance.provenance.evidence[0].inputId);
});
test('cold repository reopen retains original move receipt and allows undo then edit',async t=>{
 const a=await device(t),c=put();await a.service.change(c);const row=await read(a),move={kind:'move',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1,fromCard:'info',toCard:'rules',expectedAccess:Object.fromEntries(['global','info','rules'].map(k=>[k,row.access[k]]))};await a.service.change(move);const name=a.s.repository.name;await a.s.repository.close();
 const s=new OrganizerStore(a.storage,{indexedDB:a.indexedDB,name});await s.finishFoundation();t.after(()=>s.repository.close());const core=new BrowserNativeSyncCore(s.repository,{datasetId,deviceId:a.core.deviceId}),journal=new ContextMutationSyncJournal(core,{store:s}),service=new ContextCardsService(s,{syncJournal:journal});
 const undo={...move,operationId:op(),expectedRevision:2,fromCard:'rules',toCard:'info',undoOf:move.operationId};assert.equal((await service.change(undo)).ok,true);assert.equal((await service.change(put({itemId:c.itemId,expectedRevision:3,body:'SYNTHETIC cold edit'}))).ok,true);
});
for(const failure of ['receipt','protocol'])test('original transaction rolls canonical and all protocol rows back on '+failure+' write failure',async t=>{
 const a=await device(t),b=await device(t),c=put();await a.service.change(c);const ops=await group(a,c.operationId),before=await snapshot(b),original=IDBObjectStore.prototype.put;let hit=false;
 IDBObjectStore.prototype.put=function(value,...args){if(!hit&&(failure==='receipt'?this.name==='operationReceipts'&&value.id==='context:'+c.operationId:this.name==='meta'&&value.operation?.type==='contextMutationCommit')){hit=true;throw Error('SYNTHETIC '+failure+' failure');}return original.call(this,value,...args);};
 try{await assert.rejects(b.journal.receive(b.service,ops));}finally{IDBObjectStore.prototype.put=original;}assert.equal(hit,true);assert.deepEqual(await snapshot(b),before);
});
test('prepared original group cannot survive a late independent local Context edit',async t=>{
 const a=await device(t),b=await device(t),c=put();await a.service.change(c);const p=await b.journal.prepareReceive(b.service,await group(a,c.operationId));await b.service.change(put({body:'SYNTHETIC local wins preservation'}));const before=await snapshot(b);await assert.rejects(b.s.write(t=>b.core.commitContextMutationReceive(t,p.protocol,p.ownerPlan)));assert.deepEqual(await snapshot(b),before);
});
test('cloned preparation and fabricated service cannot mint or consume the original owner capability',async t=>{
 const a=await device(t),b=await device(t),c=put();await a.service.change(c);const ops=await group(a,c.operationId),p=await b.journal.prepareReceive(b.service,ops),before=await snapshot(b);await assert.rejects(b.s.write(t=>b.core.commitContextMutationReceive(t,structuredClone(p.protocol),p.ownerPlan)));await assert.rejects(b.journal.prepareReceive(Object.assign(Object.create(ContextCardsService.prototype),b.service),ops));assert.deepEqual(await snapshot(b),before);
});
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
test('sealed whole graph compiles exact original Context cuts and refuses a missing unchanged predecessor',async t=>{
 const a=await device(t),cs=[put(),put()];for(const c of cs)await a.service.change(c);const row=await read(a),move={kind:'move',operationId:op(),epoch:'initial',itemId:cs[0].itemId,expectedRevision:1,fromCard:'info',toCard:'now',expectedAccess:Object.fromEntries(['global','info','now'].map(k=>[k,row.access[k]]))};await a.service.change(move);const operations=[];for await(const r of a.core.rows('revision'))operations.push(r.operation);const plan=await prepareGroupCheckpointPlan(a.core,operations);assert.equal(plan.groups.length,3);assert.equal(plan.groups.at(-1).prepared.descriptor.value.domainOperationId,move.operationId);await assert.rejects(prepareGroupCheckpointPlan(a.core,operations.filter(x=>x.type==='contextMutationCommit'?x.value.domainOperationId!==cs[1].operationId:x.entityId!==cs[1].itemId)));
});
for(const changed of ['restore epoch','typed head'])test('late '+changed+' write after canonical and protocol apply aborts the whole original transaction',async t=>{
 const a=await device(t),b=await device(t),c=put();await a.service.change(c);const p=await b.journal.prepareReceive(b.service,await group(a,c.operationId)),before=await snapshot(b);
 await assert.rejects(b.s.write(async tx=>{await b.core.commitContextMutationReceive(tx,p.protocol,p.ownerPlan);if(changed==='restore epoch')await tx.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC_late_epoch'});else{const head=await b.core.get(tx,'head','contextMutationMember',c.itemId);await tx.put('meta',{...head,purged:true});}}));assert.deepEqual(await snapshot(b),before);
});
test('automatic bootstrap cannot materialize on another installation without its original Source and Topic lineage',async t=>{
 const a=await device(t),b=await device(t),f=await automatic(a),r=await a.journal.bootstrapItem(a.service,f.command.itemId),before=await snapshot(b);await assert.rejects(b.journal.receive(b.service,await group(a,r.operationId)),e=>e.code==='BNS_CONTEXT_LINEAGE_UNAVAILABLE');assert.deepEqual(await snapshot(b),before);
});
