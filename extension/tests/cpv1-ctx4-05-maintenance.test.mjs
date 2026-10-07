import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW,validContextCards} from '../core/context-cards.js';
import {ContextMaintenanceService,validateContextMaintenanceChange} from '../core/context-maintenance.js';
import {ContextReadService} from '../core/context-read.js';
import {readContextTopicScope,readContextProcessingPreflight,CONTEXT_PROCESSING_PREFLIGHT_LIMITS} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {contextLineageSourceIds} from '../core/context-item-lineage.js';
import {MemoryService} from '../core/memory/service.js';
import {key} from '../core/memory/model.js';
import {BackupService as ExistingFileFixture} from './harness/historical-backup.mjs';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';
import {BACKUP_SECTIONS,backupHash,projectBackupEntity,validateBackupItem} from '../core/backup-format.js';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const row=f=>raw(f.s,'meta',CONTEXT_CARDS_ROW);
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','records','recordIndex','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance','revisions','operationReceipts','tombstones'].map(async n=>[n,await t.all(n)]))));
const mutation=(s,name,id,fn)=>s.foundationWrite(async t=>{const r=await t.get(name,id);fn(r);await t.put(name,r);});
function authority(s){
 const caller=Object.freeze({handle:op()}),controller=new AbortController(),state={accountId:'synthetic-account',processorId:'synthetic-processor',generation:1,processing:true,expiresAt:Date.now()+600000,hook:null,currentHook:null,scope:null};
 const verifier={async verify(actual,store,scope){state.scope=structuredClone(scope);if(state.hook)await state.hook();if(actual!==caller||store!==s)return null;return {version:1,store:s,accountId:state.accountId,processorId:state.processorId,authorizationGeneration:state.generation,scope,processing:state.processing,expiresAt:state.expiresAt,revocationSignal:controller.signal};},isCurrent(actual,r,store){state.currentHook?.();return actual===caller&&store===s&&r.accountId===state.accountId&&r.processorId===state.processorId&&r.authorizationGeneration===state.generation;}};
 return {caller,controller,state,verifier,service:new ContextMaintenanceService(s,{processingVerifier:verifier})};
}
async function fixture({body='SYNTHETIC eligible source body'}={}){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');const input=(await f.s.snapshot()).library.blocks[0],topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC processing Topic'});
 await inputEdit(f.s,input.id,{libraryText:body,note:'SYNTHETIC eligible note'});
 const current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 return {...f,input,topic,cards:new ContextCardsService(f.s),...authority(f.s)};
}
async function request(f,{card='info',fields=['body'],...extra}={}){
 const scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.equal(scope.available,true,scope.reason);
 const input=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,f.input.id)),fieldDigests={};for(const field of fields)fieldDigests[field]=await hashText(input[field]);
 return {operationId:op(),epoch:scope.binding.epoch,itemId:op(),card,expectedRevision:0,body:'SYNTHETIC extracted candidate',section:'SYNTHETIC section',associationIds:[op()],evidence:[{topicId:f.topic.id,inputId:f.input.id,selectedFields:fields,fieldDigests,expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence}],...extra};
}
const put=(f,c)=>f.service.maintain(f.caller,c);
const manual=(c,body='SYNTHETIC human takeover')=>({kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body,section:'SYNTHETIC human section'});
async function outcome(f,c){return f.service.outcome(f.caller,{operationId:c.operationId,digest:await hashText(JSON.stringify(c)),epoch:c.epoch,scope:f.state.scope});}
async function open(f){for(const key of ['global','info','rules','now']){const current=await row(f);await f.cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:current?.access[key].revision||0});}}
function reader(f){const caller={},verifier={async verify(actual,store){return actual===caller?{version:1,store,connectionId:'synthetic-connection',accountId:'synthetic-account',authorizationGeneration:1,readable:true,online:true,expiresAt:Date.now()+60000}:null;},isCurrent(actual){return actual===caller;}};return {caller,service:new ContextReadService(f.s,{connectionVerifier:verifier})};}
const draft=c=>({kind:'context_item',ownerId:c.itemId,epoch:c.epoch,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change:manual(c)}});

for(const card of ['info','rules','now'])test('CTX4-05 '+card+' actual-store create/update is separate from external toggles and source bodies',async()=>{
 const f=await fixture(),c=await request(f,{card}),before=await snapshot(f.s),created=await put(f,c);assert.equal(created.disposition,'created');assert.equal(created.revision,1);
 const edited={...c,operationId:op(),expectedRevision:1,body:'SYNTHETIC reliable update',associationIds:[...c.associationIds,op()]};assert.equal((await put(f,edited)).revision,2);
 const stored=await row(f);assert.equal(validContextCards(stored),true);assert.equal(stored.items[0].id,c.itemId);assert.equal(stored.items[0].origin,'automatic');assert.equal(stored.items[0].protected,false);assert.equal(stored.items[0].maintenance.associationIds.length,2);
 const local=await f.cards.snapshot();assert.equal(local.items[0].body,edited.body);assert.equal(local.counts[card],1);assert.equal(local.capabilities.automatic,false);assert.equal(local.capabilities.external,false);assert.equal(local.access.global.enabled,false);
 const after=await snapshot(f.s);for(const name of Object.keys(before).filter(n=>!['meta','operationReceipts'].includes(n)))assert.deepEqual(after[name],before[name],name);
 const receipt=await raw(f.s,'operationReceipts','context-maintenance:'+edited.operationId);assert.equal(receipt.digest,await hashText(JSON.stringify(edited)));assert.ok(!JSON.stringify(receipt).includes('SYNTHETIC'));assert.deepEqual(await put(f,edited),{ok:true,itemId:c.itemId,revision:2,disposition:'updated',externalAllowed:false});
});

test('CTX4-05 missing authority and caller JSON cannot read or write a store',async()=>{
 const f=await fixture(),c=await request(f),before=await snapshot(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let reads=0;f.s.repository.transaction=(...args)=>{reads++;return transaction(...args);};
 await assert.rejects(new ContextMaintenanceService(f.s).maintain({processing:true},c));await assert.rejects(f.service.maintain({...f.caller},c));assert.equal(reads,0);f.s.repository.transaction=transaction;assert.deepEqual(await snapshot(f.s),before);
});
for(const fault of ['store','account','processor','scope','generation','expired','signal','extra','async_current','processing'])test('CTX4-05 strict constructor authority refuses '+fault,async()=>{
 const f=await fixture(),c=await request(f),before=await snapshot(f.s),base=f.verifier.verify.bind(f.verifier);
 f.verifier.verify=async(...a)=>{const r=await base(...a);if(fault==='store')r.store={};if(fault==='account')r.accountId='';if(fault==='processor')r.processorId='';if(fault==='scope')r.scope={...r.scope,card:'now'};if(fault==='generation')r.authorizationGeneration=-1;if(fault==='expired')r.expiresAt=1;if(fault==='signal')r.revocationSignal={aborted:false};if(fault==='extra')r.extra=true;if(fault==='processing')r.processing=false;return r;};if(fault==='async_current')f.verifier.isCurrent=async()=>true;
 await assert.rejects(put(f,c));assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-05 exact bounded parsing rejects untrusted extensions, sparse arrays and invalid evidence',async()=>{
 const f=await fixture(),c=await request(f);
 for(const change of [{...c,permission:true},{...c,card:'inputs'},{...c,body:'x'.repeat(8193)},{...c,associationIds:Array(2)},{...c,associationIds:[c.associationIds[0],c.associationIds[0]]},{...c,evidence:[]},{...c,evidence:[{...c.evidence[0],sourceRecordIds:['forged']}]},{...c,evidence:[{...c.evidence[0],selectedFields:['body','body']}]},{...c,evidence:[{...c.evidence[0],fieldDigests:{body:'x'}}]}])assert.throws(()=>validateContextMaintenanceChange(change),{code:'INVALID_REQUEST'});
});

test('CTX4-05 supplied relationship suppresses synonymous and new-source duplicate bodies under stable identity',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);
 for(const body of ['SYNTHETIC synonymous wording','SYNTHETIC another source supports this']){const duplicate={...c,operationId:op(),itemId:op(),body};const r=await put(f,duplicate);assert.equal(r.disposition,'duplicate');assert.equal(r.itemId,c.itemId);}
 assert.equal((await row(f)).items.length,1);assert.equal((await row(f)).items[0].revision,1);
});

test('CTX4-05 human takeover permanently preserves association and source lineage',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const before=(await row(f)).items[0];await f.cards.change(manual(c));const saved=(await row(f)).items[0];assert.equal(saved.protected,true);assert.equal(saved.userEdited,true);assert.equal(saved.origin,'automatic');assert.deepEqual(saved.maintenance,before.maintenance);
 for(const itemId of [c.itemId,op()])assert.equal((await put(f,{...c,operationId:op(),itemId,expectedRevision:2,body:'SYNTHETIC must never replace human work'})).disposition,'protected');
 assert.equal((await row(f)).items[0].body,'SYNTHETIC human takeover');assert.equal((await row(f)).items.length,1);
});

test('CTX4-05 deletion and Undo preserve no-recreation and permanent automatic protection',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const deletion={kind:'delete',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1};await f.cards.change(deletion);
 assert.equal((await put(f,{...c,operationId:op(),itemId:op()})).disposition,'removed');assert.equal((await f.cards.snapshot()).items.length,0);
 await f.cards.change({kind:'restore',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:2,deletedBy:deletion.operationId});assert.equal((await put(f,{...c,operationId:op(),expectedRevision:3})).disposition,'protected');assert.equal((await row(f)).items[0].body,c.body);
});

test('CTX4-05 exact CAS, association substitution and operation substitution do not rewrite saved work',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const before=(await row(f)).items[0];
 assert.equal((await put(f,{...c,operationId:op(),expectedRevision:0,body:'SYNTHETIC stale'})).conflict,true);
 assert.equal((await put(f,{...c,operationId:op(),expectedRevision:1,associationIds:[op()]})).conflict,true);
 await assert.rejects(put(f,{...c,body:'SYNTHETIC substitution'}),{code:'INVALID_REQUEST'});assert.deepEqual((await row(f)).items[0],before);
});

for(const phase of ['item','receipt'])for(const kind of ['cancel','revoke','storage'])test('CTX4-05 '+kind+' after '+phase+' write aborts the same transaction and receipt',async()=>{
 const f=await fixture(),c=await request(f),before=await snapshot(f.s),controller=new AbortController(),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,value)=>{const valueOut=await put(name,value);if(!reached&&(phase==='item'?name==='meta'&&value.id===CONTEXT_CARDS_ROW:name==='operationReceipts'&&value.namespace==='context-maintenance')){reached=true;if(kind==='storage')throw Error('SYNTHETIC private storage failure');(kind==='cancel'?controller:f.controller).abort();}return valueOut;};}return fn(t);},stores);
 await assert.rejects(f.service.maintain(f.caller,c,{signal:controller.signal}));assert.equal(reached,true);f.s.repository.transaction=transaction;assert.deepEqual(await snapshot(f.s),before);assert.equal((await outcome(f,c)).state,'not_committed');
});

test('CTX4-05 pending operation cannot report not committed or substitute another request',async()=>{
 const f=await fixture(),c=await request(f);let release,entered;const reached=new Promise(r=>{entered=r;});let first=true;
 f.state.hook=()=>{if(!first)return;first=false;entered();return new Promise(r=>{release=r;});};const pending=put(f,c);await reached;
 assert.equal(put(f,c),pending);assert.equal((await outcome(f,c)).state,'unknown');await assert.rejects(put(f,{...c,body:'SYNTHETIC substitution'}),{code:'INVALID_REQUEST'});release();await pending;assert.equal((await outcome(f,c)).state,'committed');
});

for(const change of ['generation','account','processor','same-generation','same-generation-revoked','caller-cancel-after-commit'])test('CTX4-05 '+change+' at the committed-but-unsettled boundary preserves the original acknowledgement and fences new joins',async()=>{
 const f=await fixture(),c=await request(f),transaction=f.s.repository.transaction.bind(f.s.repository),controller=new AbortController();
 let joined,joinedResult,stored,reached=false,receiptWrites=0,writeTransactions=0;
 try{
  f.s.repository.transaction=async(write,fn,stores)=>{
   const result=await transaction(write,async t=>{if(write){writeTransactions++;const save=t.put.bind(t);t.put=async(name,value)=>{if(name==='operationReceipts'&&value.namespace==='context-maintenance')receiptWrites++;return save(name,value);};}return fn(t);},stores);
   if(write&&!reached&&result?.ok&&result.itemId===c.itemId){
    reached=true;stored=await snapshot(f.s);
    if(change==='generation')f.state.generation++;
    if(change==='account')f.state.accountId='synthetic-regranted-account';
    if(change==='processor')f.state.processorId='synthetic-regranted-processor';
    if(change==='same-generation-revoked'){f.state.processing=false;f.controller.abort();}
    if(change==='caller-cancel-after-commit')controller.abort();
    joined=f.service.maintain(f.caller,c,{signal:controller.signal});
    joinedResult=joined.then(value=>({value}),error=>({code:error.code}));
   }
   return result;
  };
  const original=f.service.maintain(f.caller,c,{signal:controller.signal}),committed=await original,retry=await joinedResult;
  const changed=['generation','account','processor'].includes(change);
  assert.equal(reached,true);assert.equal(committed.ok,true);assert.equal(committed.revision,1);
  assert.equal(joined===original,!changed);
  if(changed)assert.deepEqual(retry,{code:'CONTEXT_INVALIDATED'});else assert.deepEqual(retry,{value:committed});
  assert.equal(receiptWrites,1);assert.equal(writeTransactions,1);
  assert.deepEqual(await snapshot(f.s),stored);
  assert.equal((await raw(f.s,'operationReceipts','context-maintenance:'+c.operationId)).authorizationGeneration,1);
  assert.equal((await row(f)).items[0].revision,1);
  assert.deepEqual(await outcome(f,c),changed?{state:'unknown',externalAllowed:false}:{state:'committed',result:committed,externalAllowed:false});
  assert.deepEqual(await snapshot(f.s),stored,'queries never rewrite committed history');
 }finally{f.s.repository.transaction=transaction;await f.s.repository.close();}
});

for(const mode of ['current-after-wait','stale-captured'])test('CTX4-05 prebinding coalescence '+mode+' uses one verification without assuming an earlier generation',async()=>{
 const f=await fixture(),c=await request(f),verify=f.verifier.verify.bind(f.verifier);let release,enter,first=true;
 const reached=new Promise(resolve=>{enter=resolve;});
 f.verifier.verify=async(...args)=>{if(!first)return verify(...args);first=false;const captured=mode==='stale-captured'?await verify(...args):null;enter();await new Promise(resolve=>{release=resolve;});return captured||verify(...args);};
 try{
  const before=await snapshot(f.s),original=put(f,c);await reached;f.state.generation++;
  const joined=put(f,c);assert.equal(joined,original);release();const outcomes=await Promise.allSettled([original,joined]);
  if(mode==='stale-captured'){assert.ok(outcomes.every(x=>x.status==='rejected'&&x.reason.code==='CONTEXT_INVALIDATED'));assert.deepEqual(await snapshot(f.s),before);}
  else{assert.ok(outcomes.every(x=>x.status==='fulfilled'&&x.value.ok));assert.equal((await row(f)).items[0].revision,1);assert.equal((await raw(f.s,'operationReceipts','context-maintenance:'+c.operationId)).authorizationGeneration,2);}
 }finally{release?.();await f.s.repository.close();}
});

test('CTX4-05 pending joins are authority-bound before the first request hash',async()=>{
 const f=await fixture(),c=await request(f),digest=crypto.subtle.digest;let release,enter;
 const reached=new Promise(resolve=>{enter=resolve;});
 crypto.subtle.digest=async function(...args){const result=digest.apply(this,args);if(new TextDecoder().decode(args[1])===JSON.stringify(c)){enter();await new Promise(resolve=>{release=resolve;});}return result;};
 let original;
 try{
  const before=await snapshot(f.s);original=put(f,c);const originalResult=original.then(()=>({ok:true}),error=>({code:error.code}));await reached;f.state.generation++;
  const joined=put(f,c);assert.notEqual(joined,original);await assert.rejects(joined,{code:'CONTEXT_INVALIDATED'});release();assert.deepEqual(await originalResult,{code:'CONTEXT_INVALIDATED'});assert.deepEqual(await snapshot(f.s),before);
 }finally{release?.();await original?.catch(()=>{});crypto.subtle.digest=digest;await f.s.repository.close();}
});

test('CTX4-05 revoked processing can acknowledge an exact historic commit without new maintenance',async()=>{
 const f=await fixture(),c=await request(f),committed=await put(f,c),before=await snapshot(f.s);f.state.processing=false;f.controller.abort();assert.deepEqual(await put(f,c),committed);assert.equal((await outcome(f,c)).state,'committed');await assert.rejects(put(f,{...c,operationId:op(),expectedRevision:1}));assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-05 regrant generation cannot replay a prior-generation receipt but may commit a fresh authorized operation',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);
 const receipt=await raw(f.s,'operationReceipts','context-maintenance:'+c.operationId);
 f.state.processing=false;f.controller.abort();f.state.generation++;f.state.processing=true;
 const granted=new AbortController(),verify=f.verifier.verify.bind(f.verifier);
 f.verifier.verify=async(...args)=>({...await verify(...args),revocationSignal:granted.signal});
 const before=await snapshot(f.s);
 await assert.rejects(put(f,c),{code:'INVALID_REQUEST'});
 assert.deepEqual(await outcome(f,c),{state:'unknown',externalAllowed:false});
 assert.deepEqual(await snapshot(f.s),before,'cross-generation acknowledgement cannot write or replace history');
 const fresh={...c,operationId:op(),expectedRevision:1,body:'SYNTHETIC authorized current-generation update'};
 assert.equal((await put(f,fresh)).revision,2);assert.equal((await outcome(f,fresh)).state,'committed');
 assert.equal((await raw(f.s,'operationReceipts','context-maintenance:'+fresh.operationId)).authorizationGeneration,f.state.generation);
 assert.deepEqual(await raw(f.s,'operationReceipts','context-maintenance:'+c.operationId),receipt,'original historical receipt remains intact');
 assert.deepEqual(await outcome(f,c),{state:'unknown',externalAllowed:false});
 const after=await snapshot(f.s);for(const name of Object.keys(before).filter(n=>!['meta','operationReceipts'].includes(n)))assert.deepEqual(after[name],before[name],name);
});

for(const fault of ['namespace','epoch','owner','digest','scopeDigest','extra','result'])test('CTX4-05 malformed resident receipt '+fault+' never acknowledges a substituted commit',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await mutation(f.s,'operationReceipts','context-maintenance:'+c.operationId,r=>{if(fault==='namespace')r.namespace='other';if(fault==='epoch')delete r.epoch;if(fault==='owner')r.ownerId=op();if(fault==='digest')r.digest='0'.repeat(64);if(fault==='scopeDigest')r.scopeDigest='0'.repeat(64);if(fault==='extra')r.privateBody='SYNTHETIC';if(fault==='result')r.result={ok:true};});
 const before=await snapshot(f.s);await assert.rejects(put(f,c),{code:'INVALID_REQUEST'});assert.equal((await outcome(f,c)).state,'unknown');assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-05 selected-field freshness keeps body-only evidence through an unrelated note edit',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await inputEdit(f.s,f.input.id,{note:'SYNTHETIC unrelated changed note'});assert.equal((await f.cards.snapshot()).items[0].id,c.itemId);
 await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC changed selected body'});assert.deepEqual((await f.cards.snapshot()).items,[]);assert.equal((await row(f)).items[0].body,c.body);
});

test('CTX4-05 source changes hide automatic and protected bodies while keeping manual Items and recovery source ownership',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await open(f);await f.cards.change(manual(c));const independent={...manual(c,'SYNTHETIC independent manual'),itemId:op(),operationId:op(),expectedRevision:0};await f.cards.change(independent);
 const d=draft(c);d.operation.change.expectedRevision=2;const sources=await f.cards.recoverySources(d);assert.deepEqual(sources,contextLineageSourceIds((await row(f)).items[0]));assert.ok(sources.length);
 assert.deepEqual(await f.cards.recoverySources({...d,sourceRecordIds:sources},{stored:true}),sources);await assert.rejects(f.cards.recoverySources(d,{stored:true}));
 const read=reader(f);assert.equal((await read.service.shallow(read.caller)).items.length,2);
 await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC source invalidation'});const local=await f.cards.snapshot();assert.deepEqual(local.items.map(i=>i.id),[independent.itemId]);assert.equal(local.counts.info,1);
 const external=await read.service.shallow(read.caller);assert.deepEqual(external.items.map(i=>i.itemId),[independent.itemId]);await assert.rejects(f.cards.recoverySources({...d,sourceRecordIds:sources},{stored:true}),{code:'UNAVAILABLE'});assert.equal((await row(f)).items[0].body,'SYNTHETIC human takeover');
});

for(const variant of ['hash','removal','binding','off_scope','legacy'])test('CTX4-05 candidate-time '+variant+' evidence refuses before commit',async()=>{
 const f=await fixture(),c=await request(f);if(variant==='hash')c.evidence[0].fieldDigests.body='0'.repeat(64);if(variant==='removal')c.evidence[0].expectedRemovalSequence++;
 if(variant==='binding')c.evidence[0].expectedTopicBinding.layoutGeneration++;
 if(variant==='off_scope'){await f.s.capture(capture((await f.s.status()).epoch,'synthetic-another-source','SYNTHETIC no Topic membership'));c.evidence[0].inputId=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id).id;}
 if(variant==='legacy'){const memory=new MemoryService(f.s);await memory.ready();await f.s.foundationWrite(t=>t.put('meta',{id:key('topic','default',f.topic.id),kind:'topic',version:1,profileId:'default',topicId:f.topic.id,decision:'never',layoutGeneration:1}));}
 const before=await snapshot(f.s);await assert.rejects(put(f,c));assert.deepEqual(await snapshot(f.s),before);
});

for(const phase of ['scope','last'])for(const path of ['maintain','snapshot','shallow','recovery'])test('CTX4-05 '+path+' re-fences after '+phase+' asynchronous selected-field hashing',async()=>{
 const f=await fixture(),c=await request(f,{fields:['body','note']});if(path!=='maintain')await put(f,c);if(path==='shallow')await open(f);const d=draft(c),sources=path==='recovery'?await f.cards.recoverySources(d):null,read=reader(f),digest=crypto.subtle.digest.bind(crypto.subtle);let fired=false;
 crypto.subtle.digest=async(...a)=>{if(!fired&&new TextDecoder().decode(a[1])===(phase==='scope'?'SYNTHETIC eligible source body':'SYNTHETIC eligible note')){fired=true;await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC changed during hashing'});}return digest(...a);};
 try{if(path==='maintain')await assert.rejects(put(f,c));if(path==='snapshot'){const value=await f.cards.snapshot();assert.deepEqual(value.items,[]);assert.equal(value.counts.info,null);assert.deepEqual(value.automaticEvaluation,{complete:false,reason:'unavailable'});}if(path==='recovery')await assert.rejects(f.cards.recoverySources({...d,sourceRecordIds:sources},{stored:true}));if(path==='shallow'){const r=await read.service.shallow(read.caller);assert.equal(r.available,false);assert.deepEqual(r.items,[]);assert.equal(r.nextCursor,null);assert.equal(r.complete,false);assert.ok(!JSON.stringify(r).includes('SYNTHETIC'));}assert.equal(fired,true);}finally{crypto.subtle.digest=digest;}
});

test('CTX4-05 actual replacement preserves manual/protected/deleted rows and invalidates old automatic lineage',async()=>{
 const source=await fixture(),file=await exported(new ExistingFileFixture(source.s)),f=await fixture(),automatic=await request(f);await put(f,automatic);await f.cards.change(manual(automatic));
 const independent={...manual(automatic,'SYNTHETIC manual survives restore'),itemId:op(),operationId:op(),expectedRevision:0};await f.cards.change(independent);
 const removed=await request(f);await put(f,removed);await f.cards.change({kind:'delete',operationId:op(),epoch:'initial',itemId:removed.itemId,expectedRevision:1});const before=await row(f);
 const backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);await backup.restore({sessionId:stage.sessionId,mode:'replace',confirmation:preview.integrity,targetGeneration:preview.targetGeneration,confirmReplace:true});await f.s.finishFoundation();
 assert.deepEqual(await row(f),before);const read=await f.cards.snapshot();assert.deepEqual(read.items.map(i=>i.id),[independent.itemId]);assert.notEqual(read.epoch,'initial');await assert.rejects(put(f,automatic),{code:'CONTEXT_INVALIDATED'});
});

for(const variant of ['genuine','namespace_only','prefix_only'])test('CTX4-05 '+variant+' maintenance receipts are nonportable through actual staged file import',async()=>{
 const f=await fixture(),base=await exported(new ExistingFileFixture(f.s)),c=await request(f);await put(f,c);const stored=await raw(f.s,'operationReceipts','context-maintenance:'+c.operationId),receipt=projectBackupEntity('receipts',stored);if(variant==='namespace_only')receipt.id=op();if(variant==='prefix_only')receipt.namespace='thought-library';
 const item={type:'item',section:'receipts',value:receipt};assert.throws(()=>validateBackupItem(item),{code:'BACKUP_INVALID'});const rows=[...base.slice(0,-1),item],counts=Object.fromEntries(Object.keys(BACKUP_SECTIONS).map(k=>[k,0]));let digest='';for(const r of rows){digest=await backupHash(digest,r);if(r.type==='item')counts[r.section]++;}rows.push({type:'footer',itemCount:rows.length-1,sectionCounts:counts,integrity:{algorithm:'SHA-256-chain',root:digest}});
 const before=await snapshot(f.s),backup=new BackupService(f.s),{sessionId}=await backup.beginRestore();await assert.rejects(backup.stageRestore({sessionId,items:rows}),{code:'BACKUP_INVALID'});assert.deepEqual(await snapshot(f.s),before);
});

for(const state of ['active','protected','removed'])test('CTX4-05 canonical '+state+' source lineage independently triggers B-02 without any recovery draft',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const automatic=structuredClone((await row(f)).items[0]);
 // Isolate Context admission from unrelated human Input/Thought gates. This
 // second actual store has one untouched Source and no Thought or draft.
 const target=await setup(OrganizerStore);await target.s.finishFoundation();const source=(await target.s.snapshot()).records[0],cards=new ContextCardsService(target.s);
 assert.equal((await target.s.sourcePurgePreflight(source.id)).state,'unambiguous');
 const human={...manual(c,'SYNTHETIC independent source-free human work'),itemId:op(),operationId:op(),expectedRevision:0};await cards.change(human);assert.equal((await target.s.sourcePurgePreflight(source.id)).state,'unambiguous');
 automatic.maintenance.provenance.evidence[0].sourceRecordIds=[source.id];if(state==='protected'){automatic.protected=true;automatic.userEdited=true;}if(state==='removed'){automatic.lifecycle='removed';automatic.deletedBy=op();automatic.protected=true;automatic.userEdited=true;}
 await target.s.write(async t=>{const r=await cards.row(t);automatic.order=r.sequence++;r.items.push(automatic);assert.equal(validContextCards(r),true);await t.put('meta',r);});const before=await snapshot(target.s);
 assert.deepEqual(await target.s.sourcePurgePreflight(source.id),{state:'owner_gate_required',gate:'B-02',targetRef:source.id});await assert.rejects(target.s.permanentDelete(source.id),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await snapshot(target.s),before);
 await target.s.capture(capture((await target.s.status()).epoch,'synthetic-unrelated-purge','SYNTHETIC unrelated untouched source'));const other=(await target.s.snapshot()).records.find(r=>r.id!==source.id);assert.equal((await target.s.sourcePurgePreflight(other.id)).state,'unambiguous');await target.s.permanentDelete(other.id);assert.equal((await cards.snapshot()).items.some(i=>i.id===human.itemId),true);
});

test('CTX4-05 cancelling an unresolved constructor verification releases the pending attempt without late writes',async()=>{
 const f=await fixture(),c=await request(f),before=await snapshot(f.s),controller=new AbortController();let entered,release;const reached=new Promise(r=>{entered=r;});f.state.hook=()=>{entered();return new Promise(r=>{release=r;});};
 const pending=f.service.maintain(f.caller,c,{signal:controller.signal});await reached;controller.abort();await assert.rejects(pending,{code:'CONTEXT_INVALIDATED'});f.state.hook=null;release();await new Promise(r=>setTimeout(r,0));assert.deepEqual(await snapshot(f.s),before);assert.equal((await outcome(f,c)).state,'not_committed');
});

test('CTX4-05 a genuinely new eligible Input with the same relationship cannot create a duplicate Item',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await f.s.capture(capture((await f.s.status()).epoch,'synthetic-second-evidence','SYNTHETIC second independent source'));
 const input=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id),current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[f.topic.id]});const second=await request({...f,input},{associationIds:c.associationIds,body:'SYNTHETIC synonymous candidate from new evidence'});
 assert.notEqual(second.evidence[0].inputId,c.evidence[0].inputId);assert.equal((await put(f,second)).disposition,'duplicate');assert.equal((await row(f)).items.length,1);assert.equal((await row(f)).items[0].id,c.itemId);
});

for(const restriction of ['off_scope','input_deny','topic_never','tombstone'])test('CTX4-05 '+restriction+' refuses before Input/Source body acquisition or hashing',async()=>{
 const f=await fixture(),c=await request(f);
 if(restriction==='off_scope'){await f.s.capture(capture((await f.s.status()).epoch,'synthetic-unscoped','SYNTHETIC unscoped body'));c.evidence[0].inputId=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id).id;}
 if(restriction==='input_deny')await f.s.foundationWrite(t=>t.put('meta',{id:key('input',f.input.id),kind:'input',version:1,inputId:f.input.id,excluded:true}));
 if(restriction==='topic_never')await f.s.foundationWrite(t=>t.put('meta',{id:key('topic','default',f.topic.id),kind:'topic',version:1,profileId:'default',topicId:f.topic.id,decision:'never',layoutGeneration:1}));
 if(restriction==='tombstone'){const source=(await f.s.snapshot()).records[0];await f.s.foundationWrite(t=>t.put('tombstones',{id:'source:'+source.sourceKey,sequence:1,value:{sourceIdentityHash:source.sourceKey}}));}
 const transaction=f.s.repository.transaction.bind(f.s.repository),digest=crypto.subtle.digest.bind(crypto.subtle);let bodyReads=0,bodyHashes=0;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=(name,id)=>{if(['blocks','records'].includes(name))bodyReads++;return get(name,id);};return fn(t);},stores);
 crypto.subtle.digest=(...args)=>{if(['SYNTHETIC eligible source body','SYNTHETIC unscoped body'].includes(new TextDecoder().decode(args[1])))bodyHashes++;return digest(...args);};
 try{await assert.rejects(put(f,c));assert.equal(bodyReads,0);assert.equal(bodyHashes,0);}finally{f.s.repository.transaction=transaction;crypto.subtle.digest=digest;}
});

test('CTX4-05 receipt request/association/canonical revision proof rejects unrelated suppression acknowledgements',async()=>{
 const f=await fixture(),a=await request(f),b=await request(f);await put(f,a);await put(f,b);const receipt=await raw(f.s,'operationReceipts','context-maintenance:'+a.operationId);
 await mutation(f.s,'operationReceipts',receipt.id,r=>{r.ownerId=b.itemId;r.result={...r.result,itemId:b.itemId,revision:567,disposition:'duplicate'};});await assert.rejects(put(f,a),{code:'INVALID_REQUEST'});assert.equal((await outcome(f,a)).state,'unknown');
 await f.s.foundationWrite(t=>t.put('operationReceipts',receipt));const duplicate={...a,operationId:op(),itemId:op(),associationIds:[op(),...a.associationIds]};assert.equal((await put(f,duplicate)).disposition,'duplicate');
 await f.cards.change({kind:'delete',operationId:op(),epoch:'initial',itemId:a.itemId,expectedRevision:1});assert.equal((await outcome(f,duplicate)).state,'committed');assert.equal((await put(f,duplicate)).disposition,'duplicate');
});

test('CTX4-05 exact DB closure during final host verification refuses without reopening',async()=>{
 const f=await fixture(),c=await request(f),verify=f.verifier.verify.bind(f.verifier),open=f.s.repository.open.bind(f.s.repository);let calls=0,reopens=0;
 f.verifier.verify=async(...args)=>{const r=await verify(...args);if(++calls===2){f.s.repository.db.close();f.s.repository.db=null;}return r;};f.s.repository.open=(...args)=>{if(calls>=2)reopens++;return open(...args);};
 await assert.rejects(put(f,c),{code:'CONTEXT_INVALIDATED'});assert.equal(f.s.repository.db,null);assert.equal(reopens,0);f.s.repository.open=open;
});

test('CTX4-05 expiry after callback during repository generation update aborts Item and receipt',async()=>{
 const f=await fixture(),c=await request(f),before=await snapshot(f.s),transaction=f.s.repository.transaction.bind(f.s.repository),now=Date.now;let expired=false;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{const get=t.get.bind(t);if(write)t.get=async(name,id)=>{const r=await get(name,id);if(name==='meta'&&id==='backup-data-generation'&&t.backupChanged){expired=true;Date.now=()=>f.state.expiresAt+1;}return r;};return fn(t);},stores);
 try{await assert.rejects(put(f,c));assert.equal(expired,true);}finally{Date.now=now;f.s.repository.transaction=transaction;}assert.deepEqual(await snapshot(f.s),before);
});

async function topicSeries(f,count){const requests=[];for(let i=0;i<count;i++){if(i){f.topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC bounded Topic '+i});const current=await f.s.input(f.input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:f.input.id,expectedRevision:current.revision,topicIds:[f.topic.id]});}const c=await request(f);await put(f,c);requests.push(c);}return requests;}

test('CTX4-05 thirty-three accepted Topic lineages read across bounded batches without losing completeness',async()=>{
 const f=await fixture(),requests=await topicSeries(f,33),before=await row(f),local=await f.cards.snapshot();assert.equal(local.items.length,33);assert.equal(local.counts.info,33);assert.equal(local.automaticEvaluation,undefined);assert.equal(local.items.at(-1).id,requests.at(-1).itemId);assert.deepEqual(await row(f),before);
});

test('CTX4-05 full existing 512-Item row remains valid and readable with manual bytes preserved',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const base=await row(f);for(let n=1;n<512;n++)base.items.push({id:op(),card:'rules',body:'SYNTHETIC retained manual '+n,section:'SYNTHETIC manual',revision:1,order:n,origin:'manual',protected:true,userEdited:true,lifecycle:'active',createdAt:f.s.clock(),updatedAt:f.s.clock(),deletedBy:null});base.sequence=512;assert.equal(validContextCards(base),true);await f.s.write(t=>t.put('meta',base));
 const local=await f.cards.snapshot();assert.equal(local.items.length,512);assert.equal(local.counts.info,1);assert.equal(local.counts.rules,511);assert.deepEqual(local.items.filter(x=>x.origin==='manual'),base.items.filter(x=>x.origin==='manual'));await assert.rejects(put(f,await request(f)),{code:'CONTEXT_LIMIT'});assert.deepEqual(await row(f),base);
});

test('CTX4-05 request-wide repeated-scope hash budget preserves manual work and refuses external incompleteness',async()=>{
 const f=await fixture({body:'SYNTHETIC bounded material '+('字'.repeat(60000))});await topicSeries(f,50);
 const c=await request(f),human={...manual(c,'SYNTHETIC known manual'),itemId:op(),operationId:op(),expectedRevision:0,card:'rules'};await f.cards.change(human);await open(f);const before=await row(f),local=await f.cards.snapshot();assert.deepEqual(local.items.map(x=>x.id),[human.itemId]);assert.equal(local.counts.info,null);assert.equal(local.counts.rules,1);assert.deepEqual(local.automaticEvaluation,{complete:false,reason:'budget_exceeded'});assert.deepEqual(await row(f),before);
 const r=reader(f),external=await r.service.shallow(r.caller);assert.equal(external.available,false);assert.equal(external.complete,false);assert.equal(external.nextCursor,null);assert.deepEqual(external.items,[]);
});

for(const disposition of ['removed','closed'])test('CTX4-05 '+disposition+' automatic Items cannot block independent open manual reads',async()=>{
 const f=await fixture(),c=await request(f,{card:'now'});await put(f,c);if(disposition==='removed')await f.cards.change({kind:'delete',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1});
 const human={...manual(c,'SYNTHETIC manual remains readable'),itemId:op(),operationId:op(),expectedRevision:0,card:'info'};await f.cards.change(human);await open(f);if(disposition==='closed')await f.cards.change({kind:'access',operationId:op(),epoch:'initial',key:'now',enabled:false,expectedRevision:1});await mutation(f.s,'meta','thought-library',r=>{r.verified=false;});
 const r=reader(f),external=await r.service.shallow(r.caller);assert.equal(external.available,true);assert.deepEqual(external.items.map(x=>x.itemId),[human.itemId]);assert.equal(external.complete,true);
});

for(const change of ['source','restore','restriction'])test('CTX4-05 recovery batch final fence rejects '+change+' after an earlier draft was read',async()=>{
 const f=await fixture(),a=await request(f),b=await request(f);await put(f,a);await put(f,b);const first=draft(a),second=draft(b),as=await f.cards.recoverySources(first),bs=await f.cards.recoverySources(second),captured=await f.cards.recoveryBatchFence();await f.cards.recoverySources({...first,sourceRecordIds:as},{stored:true});
 if(change==='source')await inputEdit(f.s,f.input.id,{note:'SYNTHETIC changed during later draft'});
 if(change==='restore')await f.s.write(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));
 if(change==='restriction')await f.s.foundationWrite(t=>t.put('meta',{id:key('input',f.input.id),kind:'input',version:1,inputId:f.input.id,excluded:true}));
 try{await f.cards.recoverySources({...second,sourceRecordIds:bs},{stored:true});}catch{}
 await assert.rejects(f.cards.recoveryBatchFence(captured),{code:'CONTEXT_INVALIDATED'});
});

for(const kind of ['cancel','revoke','deadline'])test('CTX4-05 '+kind+' while a selected-field hash is pending releases the ledger and prevents late commit',async()=>{
 const f=await fixture(),c=await request(f,{fields:['body','note']}),before=await snapshot(f.s),controller=new AbortController(),digest=crypto.subtle.digest.bind(crypto.subtle);let entered,release;const reached=new Promise(r=>{entered=r;});
 crypto.subtle.digest=async(...args)=>{if(new TextDecoder().decode(args[1])==='SYNTHETIC eligible note'){entered();await new Promise(r=>{release=r;});}return digest(...args);};
 if(kind==='deadline')f.state.expiresAt=Date.now()+1000;
 try{const pending=f.service.maintain(f.caller,c,{signal:controller.signal});await reached;if(kind==='cancel')controller.abort();if(kind==='revoke')f.controller.abort();await assert.rejects(pending,{code:'CONTEXT_INVALIDATED'});f.state.expiresAt=Date.now()+600000;assert.equal((await outcome(f,c)).state,'not_committed');release();await new Promise(r=>setTimeout(r,0));assert.deepEqual(await snapshot(f.s),before);}finally{crypto.subtle.digest=digest;release?.();}
});

test('CTX4-05 unresolved verifier without caller cancellation times out and releases the operation',async()=>{
 const f=await fixture(),c=await request(f),before=await snapshot(f.s);let release;f.state.hook=()=>new Promise(r=>{release=r;});
 await assert.rejects(put(f,c),{code:'CONTEXT_INVALIDATED'});f.state.hook=null;release();await new Promise(r=>setTimeout(r,0));assert.equal((await outcome(f,c)).state,'not_committed');assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-05 explicit request deadline ends a stalled hash even when processing authorization lasts longer',{timeout:15000},async()=>{
 const f=await fixture(),c=await request(f,{fields:['body','note']}),before=await snapshot(f.s),digest=crypto.subtle.digest.bind(crypto.subtle);let entered,release;const reached=new Promise(r=>{entered=r;});
 crypto.subtle.digest=async(...args)=>{if(new TextDecoder().decode(args[1])==='SYNTHETIC eligible note'){entered();await new Promise(r=>{release=r;});}return digest(...args);};
 try{const pending=put(f,c);await reached;await assert.rejects(pending,{code:'CONTEXT_INVALIDATED'});assert.equal((await outcome(f,c)).state,'not_committed');release();await new Promise(r=>setTimeout(r,0));assert.deepEqual(await snapshot(f.s),before);}finally{crypto.subtle.digest=digest;release?.();}
});

test('CTX4-05 stale automatic recovery refuses repeatedly without rebinding, then restores only when the original lineage is eligible',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const d=draft(c),sources=await f.cards.recoverySources(d),saved=structuredClone({...d,sourceRecordIds:sources,token:op()}),before=JSON.stringify(saved);
 await f.s.foundationWrite(t=>t.put('meta',{id:key('input',f.input.id),kind:'input',version:1,inputId:f.input.id,excluded:true}));
 for(let i=0;i<2;i++)await assert.rejects(f.cards.recoverySources(saved,{stored:true}),{code:'UNAVAILABLE'});assert.equal(JSON.stringify(saved),before);
 await f.s.foundationWrite(t=>t.delete('meta',key('input',f.input.id)));assert.deepEqual(await f.cards.recoverySources(saved,{stored:true}),sources);assert.equal(JSON.stringify(saved),before);
 await f.cards.change({kind:'delete',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1});await assert.rejects(f.cards.recoverySources(saved,{stored:true}),{code:'CONTEXT_INVALIDATED'});
});

test('CTX4-05 an old automatic draft cannot acquire replacement provenance after a canonical update',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const old=draft(c),sources=await f.cards.recoverySources(old),saved={...structuredClone(old),sourceRecordIds:sources,token:op()},before=JSON.stringify(saved);
 await f.s.capture(capture((await f.s.status()).epoch,'synthetic-replacement-source','SYNTHETIC replacement source body'));const input=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id),topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC replacement Topic'}),current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 const update=await request({...f,input,topic},{itemId:c.itemId,expectedRevision:1,associationIds:c.associationIds});assert.equal((await put(f,update)).revision,2);assert.notDeepEqual(contextLineageSourceIds((await row(f)).items[0]),sources);
 await assert.rejects(f.cards.recoverySources(old),{code:'UNAVAILABLE'});await assert.rejects(f.cards.recoverySources(saved,{stored:true}),{code:'UNAVAILABLE'});assert.equal(JSON.stringify(saved),before);
});

test('CTX4-05 same-source evidence-field refresh cannot rebind an older resident automatic draft',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const d=draft(c),sources=await f.cards.recoverySources(d),saved={...d,sourceRecordIds:sources,token:op()},before=JSON.stringify(saved);
 const update=await request(f,{itemId:c.itemId,expectedRevision:1,associationIds:c.associationIds,fields:['note']});await put(f,update);assert.deepEqual(contextLineageSourceIds((await row(f)).items[0]),sources);
 await assert.rejects(f.cards.recoverySources(saved,{stored:true}),{code:'UNAVAILABLE'});assert.equal(JSON.stringify(saved),before);assert.deepEqual((await row(f)).items[0].maintenance.provenance.evidence[0].selectedFields,['note']);
});

async function addInputs(f,count){
 for(let start=0;start<count;start+=100){const request=capture((await f.s.status()).epoch);request.messages=Array.from({length:Math.min(100,count-start)},(_,i)=>({sourceMessageId:'synthetic-batch-input-'+(start+i),pageOrder:i+1,originalText:'SYNTHETIC batch Input '+(start+i)}));await f.s.capture(request);}
 const inputs=(await f.s.snapshot()).library.blocks.filter(x=>x.id!==f.input.id);for(const input of inputs){const current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[f.topic.id]});}return inputs;
}

test('CTX4-05 seventeen committed Inputs in one Topic remain readable locally and through shallow read',async()=>{
 const f=await fixture(),first=await request(f);await put(f,first);const inputs=await addInputs(f,16);for(const input of inputs)await put(f,await request({...f,input}));const local=await f.cards.snapshot();assert.equal(local.items.length,17);assert.equal(local.counts.info,17);assert.equal(local.automaticEvaluation,undefined);
 await open(f);const read=reader(f),external=await read.service.shallow(read.caller);assert.equal(external.available,true);assert.equal(external.items.length,17);assert.equal(external.complete,true);
 const scope=await readContextTopicScope(f.s,{topicId:f.topic.id}),maximum=Array.from({length:CONTEXT_PROCESSING_PREFLIGHT_LIMITS.inputs},(_,i)=>'synthetic-metadata-lookup-'+i);
 const accepted=await readContextProcessingPreflight(f.s,{topicId:f.topic.id,inputIds:maximum,expectedAuthority:scope.snapshot.currentAuthority});assert.equal(accepted.reason,'input_unavailable');assert.equal(accepted.kind,'processing_preflight');assert.equal(accepted.bodyEligibility,'not_checked');assert.equal(accepted.externalAllowed,false);assert.equal(accepted.scope,undefined);
 const over=await readContextProcessingPreflight(f.s,{topicId:f.topic.id,inputIds:[...maximum,'one-over'],expectedAuthority:scope.snapshot.currentAuthority});assert.equal(over.reason,'invalid_request');
});

test('CTX4-05 257 distinct Input lineages cross the read batch boundary without a false empty result',async()=>{
 const f=await fixture(),first=await request(f);await put(f,first);const inputs=await addInputs(f,256),scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.equal(scope.available,true);
 const projections=await f.s.repository.transaction(false,async t=>{const rows=[];for(const input of inputs)rows.push(await inputProjection(f.s,t,input.id));return rows;}),canonical=await row(f),template=canonical.items[0];
 for(const p of projections){const item=structuredClone(template);item.id=op();item.order=canonical.sequence++;item.maintenance.associationIds=[op()];item.maintenance.provenance.evidence=[{topicId:f.topic.id,inputId:p.inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence,contentRevision:p.contentRevision,sourceRecordIds:p.sourceRecordIds,sourceIdentityTokens:[...new Set(p.identities)].sort()}];canonical.items.push(item);}
 assert.equal(validContextCards(canonical),true);await f.s.write(t=>t.put('meta',canonical));const local=await f.cards.snapshot();assert.equal(local.items.length,257);assert.equal(local.counts.info,257);assert.equal(local.automaticEvaluation,undefined);assert.deepEqual(await row(f),canonical);
});

test('CTX4-05 closing storage after the scope fence never reopens selected-material or outcome reads',async()=>{
 const f=await fixture(),c=await request(f),transaction=f.s.repository.transaction.bind(f.s.repository),open=f.s.repository.open.bind(f.s.repository);let metaReads=0,closed=false,reopens=0;
 f.s.repository.transaction=async(write,fn,stores)=>{const result=await transaction(write,fn,stores);if(!write&&stores?.length===1&&stores[0]==='meta'&&++metaReads===3){f.s.repository.db.close();f.s.repository.db=null;closed=true;}return result;};f.s.repository.open=(...args)=>{if(closed)reopens++;return open(...args);};
 await assert.rejects(put(f,c),{code:'CONTEXT_INVALIDATED'});assert.equal(closed,true);assert.equal(reopens,0);assert.equal(f.s.repository.db,null);await assert.rejects(outcome(f,c));assert.equal(reopens,0);f.s.repository.open=open;f.s.repository.transaction=transaction;
});

for(const corruption of ['source_index','input_index'])test('CTX4-05 '+corruption+' omission cannot turn target-related Context lineage into complete purge admission',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const automatic=structuredClone((await row(f)).items[0]),target=await setup(OrganizerStore);await target.s.finishFoundation();const source=(await target.s.snapshot()).records[0],cards=new ContextCardsService(target.s);
 if(corruption==='source_index'){await target.s.capture(capture((await target.s.status()).epoch,source.sourceMessageId,'SYNTHETIC another version'));const version=(await target.s.snapshot()).records.find(x=>x.id!==source.id);automatic.maintenance.provenance.evidence[0].sourceRecordIds=[version.id];await target.s.repository.transaction(true,t=>t.delete('recordIndex',version.id));}
 else{const input=(await target.s.snapshot()).library.blocks[0];automatic.maintenance.provenance.evidence[0].inputId=input.id;automatic.maintenance.provenance.evidence[0].sourceRecordIds=[op()];await target.s.repository.transaction(true,t=>t.delete('blockIndex',input.id));}
 await target.s.write(async t=>{const r=await cards.row(t);automatic.order=r.sequence++;r.items.push(automatic);await t.put('meta',r);});const before=await snapshot(target.s);assert.notEqual((await target.s.sourcePurgePreflight(source.id)).state,'unambiguous');await assert.rejects(target.s.permanentDelete(source.id));assert.deepEqual(await snapshot(target.s),before);
});

test('CTX4-05 complete disjoint lineage and valid pre-restore dangling lineage do not block unrelated Source purge',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);await f.cards.change(manual(c));await f.s.capture(capture((await f.s.status()).epoch,'synthetic-unrelated-current','SYNTHETIC independent current Source'));let source=(await f.s.snapshot()).records.find(r=>r.sourceMessageId==='synthetic-unrelated-current'),before=await row(f);assert.equal((await f.s.sourcePurgePreflight(source.id)).state,'unambiguous');await f.s.permanentDelete(source.id);assert.deepEqual(await row(f),before);
 const imported=await setup(OrganizerStore);await imported.s.finishFoundation();await imported.s.capture(capture((await imported.s.status()).epoch,'synthetic-unrelated-restored','SYNTHETIC unrelated restored Source'));const file=await exported(new ExistingFileFixture(imported.s)),backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true);await backup.restore({sessionId:stage.sessionId,mode:'replace',confirmation:preview.integrity,targetGeneration:preview.targetGeneration,confirmReplace:true});
 const restored=(await f.s.snapshot()).records,sameFamily=restored.find(r=>r.sourceMessageId===f.input.sourceMessageId)||restored.find(r=>r.sourceMessageId==='m1-synthetic-message-001');assert.equal((await f.s.sourcePurgePreflight(sameFamily.id)).state,'owner_gate_required','absent old UUIDs do not erase the same saved Source-family identity');source=restored.find(r=>r.sourceMessageId==='synthetic-unrelated-restored');assert.equal((await f.s.sourcePurgePreflight(source.id)).state,'unambiguous');await f.s.permanentDelete(source.id);assert.deepEqual(await row(f),before);
});

test('CTX4-05 canonical source-family sets preserve multiple versions sharing the same identity',async()=>{
 const f=await fixture(),source=(await f.s.snapshot()).records[0];await f.s.capture(capture((await f.s.status()).epoch,source.sourceMessageId,'SYNTHETIC second source version'));const second=(await f.s.snapshot()).records.find(r=>r.id!==source.id);
 await f.s.foundationWrite(async t=>{const block=await t.get('blocks',f.input.id),index=await t.get('blockIndex',f.input.id),state=await t.get('inputStates',f.input.id);block.value.provenance.push({...block.value.provenance[0],sourceRecordId:second.id});index.recordIds.push(second.id);state.sourceRecordIds.push(second.id);await t.put('blocks',block);await t.put('blockIndex',index);await t.put('inputStates',state);});
 const projection=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,f.input.id));assert.equal(projection.identities.length,2);assert.equal(new Set(projection.identities).size,1);const c=await request(f);await put(f,c);const evidence=(await row(f)).items[0].maintenance.provenance.evidence[0];assert.equal(evidence.sourceRecordIds.length,2);assert.deepEqual(evidence.sourceIdentityTokens,[source.sourceKey]);assert.equal((await f.cards.snapshot()).items.length,1);
});

test('CTX4-05 absent legacy family evidence and malformed family tokens cannot prove unrelated purge authority',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const automatic=structuredClone((await row(f)).items[0]),target=await setup(OrganizerStore);await target.s.finishFoundation();await target.s.capture(capture((await target.s.status()).epoch,'synthetic-different-family','SYNTHETIC unrelated source'));const source=(await target.s.snapshot()).records.find(r=>r.sourceMessageId==='synthetic-different-family'),cards=new ContextCardsService(target.s),missing=op();automatic.maintenance.provenance.evidence[0].inputId=op();automatic.maintenance.provenance.evidence[0].sourceRecordIds=[missing];automatic.maintenance.provenance.evidence[0].sourceIdentityTokens=['legacy:'+missing];
 await target.s.write(async t=>{const r=await cards.row(t);automatic.order=r.sequence++;r.items.push(automatic);await t.put('meta',r);});assert.equal((await target.s.sourcePurgePreflight(source.id)).state,'owner_gate_required');
 const good=await raw(target.s,'meta',CONTEXT_CARDS_ROW);for(const tokens of [[],['invalid family'],Array(129).fill('0'.repeat(64)),['0'.repeat(64),'0'.repeat(64)]]){const broken=structuredClone(good);broken.items[0].maintenance.provenance.evidence[0].sourceIdentityTokens=tokens;assert.equal(validContextCards(broken),false);await target.s.repository.transaction(true,t=>t.put('meta',broken));assert.notEqual((await target.s.sourcePurgePreflight(source.id)).state,'unambiguous');}
});

test('CTX4-05 legacy family tokens bind retained Source IDs and complete possible family cardinalities',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const canonical=await row(f),a='synthetic-absent-A',b='synthetic-absent-B',modern='0'.repeat(64),other='1'.repeat(64);
 for(const [ids,tokens,valid]of [[[a],['legacy:'+b],false],[[a,b],['legacy:'+a],false],[[a],['legacy:'+a,modern],false],[[a],[modern,other],false],[[a,b],[modern],true],[[a,b],['legacy:'+a,modern],true],[[a,b],['legacy:'+a,'legacy:'+b],true]]){const candidate=structuredClone(canonical),e=candidate.items[0].maintenance.provenance.evidence[0];e.sourceRecordIds=ids;e.sourceIdentityTokens=tokens;assert.equal(validContextCards(candidate),valid);}
 const target=await setup(OrganizerStore);await target.s.finishFoundation();const source=(await target.s.snapshot()).records[0],broken=structuredClone(canonical),e=broken.items[0].maintenance.provenance.evidence[0];e.inputId=op();e.sourceRecordIds=[a];e.sourceIdentityTokens=['legacy:'+b];await target.s.repository.transaction(true,t=>t.put('meta',broken));const before=await snapshot(target.s);assert.equal((await target.s.sourcePurgePreflight(source.id)).state,'owner_gate_required');await assert.rejects(target.s.permanentDelete(source.id),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await snapshot(target.s),before);
});
