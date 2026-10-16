import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW,validContextCards,validateContextChange} from '../core/context-cards.js';
import {ContextMaintenanceService,validateContextMaintenanceChange,validateContextMaintenanceNoChange,validateContextMaintenanceInvalidation} from '../core/context-maintenance.js';
import {ContextReadService,CONTEXT_READ_LIMITS} from '../core/context-read.js';
import {contextTemporalProjection,validContextTemporal} from '../core/context-temporal.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {ArchiveError} from '../core/constants.js';

const op=()=>crypto.randomUUID(),deadline='2026-10-17T12:00:00.000Z';
const temporal=(validUntil=deadline)=>({temporalScope:'SYNTHETIC 本阶段\n  精确保留 👩🏽‍💻',uncertainty:'SYNTHETIC 仅为本人有条件的当前陈述',validUntil});
const raw=f=>f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));
const all=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(Array.from(s.repository.db.objectStoreNames).map(async name=>[name,await t.all(name)]))));
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const input=(await s.snapshot()).library.blocks[0],topic=await s.createTopic({operationId:op(),name:'SYNTHETIC explicit temporal evidence'});
 await inputEdit(s,input.id,{libraryText:'SYNTHETIC qualified current user Input',note:'SYNTHETIC qualified note'});
 await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:(await s.input(input.id)).revision,topicIds:[topic.id]});
 const scope=await readContextTopicScope(s,{topicId:topic.id});assert.equal(scope.available,true,scope.reason);
 const projected=await s.repository.transaction(false,t=>inputProjection(s,t,input.id));
 const change={operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'now',expectedRevision:0,body:'SYNTHETIC automatic Now body',section:'SYNTHETIC current section',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(projected.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:projected.lastRemovalSequence}]};
 const caller=Object.freeze({handle:op()}),controller=new AbortController(),expiresAt=Date.now()+600000;
 const verifier={async verify(actual,store,processingScope){if(actual!==caller||store!==s)return null;return {version:1,store:s,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,scope:processingScope,processing:true,expiresAt,revocationSignal:controller.signal};},isCurrent:(actual,r,store)=>actual===caller&&store===s};
 const cards=new ContextCardsService(s),service=new ContextMaintenanceService(s,{processingVerifier:verifier});
 const readCaller={},readState={verifies:0,hook:null},connectionVerifier={async verify(actual,store){readState.verifies++;await readState.hook?.();return actual===readCaller&&store===s?{version:1,store:s,connectionId:'synthetic-connection',accountId:'synthetic-account',authorizationGeneration:1,readable:true,online:true,expiresAt}:null;},isCurrent:actual=>actual===readCaller};
 const reader=new ContextReadService(s,{connectionVerifier});
 return {s,input,topic,change,caller,verifier,controller,cards,service,reader,readCaller,readState,async open(){for(const key of ['global','now','info','rules']){const row=await raw({s});await cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:row.access[key].revision});}},close:()=>s.repository.close()};
}
const maintain=(f,c)=>f.service.maintain(f.caller,c);
const manual=(c,extra={})=>({kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:'SYNTHETIC human takeover',section:c.section,...extra});
const noChange=c=>({operation:'NO_CHANGE',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,associationIds:c.associationIds,evidence:c.evidence});

test('explicit temporal schema is exact, bounded and canonical without rewriting unknown or literal text',()=>{
 const value=temporal();assert.equal(validContextTemporal(value),true);assert.equal(validContextTemporal({temporalScope:null,uncertainty:null,validUntil:null}),true);
 assert.equal(validContextTemporal({...value,temporalScope:' ',uncertainty:'x'.repeat(512)}),true);
 for(const bad of [null,[],{...value,extra:true},{...value,validUntil:undefined},{temporalScope:null,uncertainty:null},{...value,temporalScope:''},{...value,temporalScope:'x'.repeat(513)},{...value,uncertainty:'x\0y'},{...value,validUntil:'2026-10-17T12:00:00Z'},{...value,validUntil:'2026-10-17T20:00:00.000+08:00'},{...value,validUntil:'2026-02-30T12:00:00.000Z'},{...value,validUntil:0}])assert.equal(validContextTemporal(bad),false,JSON.stringify(bad));
 const item={lifecycle:'active',origin:'automatic',card:'now',protected:false,userEdited:false,maintenance:{temporal:value}},at=Date.parse(deadline);
 assert.equal(contextTemporalProjection(item,at-1).temporalStatus,'not_expired');assert.equal(contextTemporalProjection(item,at).temporalStatus,'expired');assert.equal(contextTemporalProjection(item,at+1).temporalStatus,'expired');
 assert.equal(contextTemporalProjection(item,NaN).temporalStatus,'unknown');assert.equal(contextTemporalProjection(item,Infinity).temporalStatus,'unknown');
 for(const patch of [{origin:'manual'},{protected:true},{userEdited:true},{card:'info'},{card:'rules'},{lifecycle:'removed'},{lifecycle:'invalidated'}])assert.equal(contextTemporalProjection({...item,...patch},at).temporalStatus,'unknown');
 assert.equal(contextTemporalProjection({...item,maintenance:{temporal:temporal(null)}},at).temporalStatus,'unknown');assert.equal(contextTemporalProjection({...item,maintenance:{}},at),null);
 const projection=contextTemporalProjection(item,at);assert.deepEqual(projection.temporal,value);projection.temporal.temporalScope='CHANGED';assert.deepEqual(item.maintenance.temporal,value);
});

test('actual maintenance atomically stores temporal evidence under original digest, receipt and exact replay',async()=>{
 const f=await fixture();try{const c={...f.change,temporal:temporal()},before=await all(f.s),result=await maintain(f,c),row=await raw(f);assert.equal(result.disposition,'created');assert.equal(validContextCards(row),true);assert.deepEqual(row.items[0].maintenance.temporal,c.temporal);assert.equal(row.items[0].revision,1);
  const receipt=await f.s.repository.transaction(false,t=>t.get('operationReceipts','context-maintenance:'+c.operationId));assert.equal(receipt.digest,await hashText(JSON.stringify(c)));assert.ok(!JSON.stringify(receipt).includes('SYNTHETIC'));assert.deepEqual(await maintain(f,structuredClone(c)),result);assert.deepEqual(await raw(f),row);
  const after=await all(f.s);for(const name of ['records','blocks','thoughts','topics','sections','placements','dependencies','provenance','tombstones'])assert.deepEqual(after[name],before[name],name);
  for(const temporalValue of [temporal(null),{...c.temporal,uncertainty:'different'},undefined]){const changed={...c,temporal:temporalValue};if(temporalValue===undefined)delete changed.temporal;await assert.rejects(maintain(f,changed),{code:'INVALID_REQUEST'});assert.deepEqual(await all(f.s),after);}
 }finally{await f.close();}
});

test('legacy request bytes replay unchanged and an UPDATE without temporal clears the old body deadline',async()=>{
 const f=await fixture();try{const legacy=structuredClone(f.change),serialized=JSON.stringify(legacy);assert.equal(validateContextMaintenanceChange(legacy),legacy);const result=await maintain(f,legacy);assert.deepEqual(await maintain(f,JSON.parse(serialized)),result);let row=await raw(f);assert.equal(Object.hasOwn(row.items[0].maintenance,'temporal'),false);assert.equal(Object.hasOwn((await f.cards.snapshot()).items[0],'temporalStatus'),false);
  const updated={...legacy,operationId:op(),expectedRevision:1,body:'SYNTHETIC explicit dated update',temporal:temporal()};await maintain(f,updated);assert.deepEqual((await raw(f)).items[0].maintenance.temporal,updated.temporal);
  const cleared={...legacy,operationId:op(),expectedRevision:2,body:'SYNTHETIC new body with unknown time'};await maintain(f,cleared);row=await raw(f);assert.equal(row.items[0].body,cleared.body);assert.equal(row.items[0].revision,3);assert.equal(Object.hasOwn(row.items[0].maintenance,'temporal'),false);assert.equal(contextTemporalProjection(row.items[0]),null);
 }finally{await f.close();}
});

test('NO_CHANGE and REMOVE_CANDIDATE cannot smuggle temporal changes; ordinary no-change preserves existing evidence',async()=>{
 const f=await fixture();try{const c={...f.change,temporal:temporal()};await maintain(f,c);const before=await all(f.s),unchanged=noChange(c),invalidated={...unchanged,operation:'REMOVE_CANDIDATE',operationId:op()};
  assert.throws(()=>validateContextMaintenanceNoChange({...unchanged,temporal:c.temporal}),{code:'INVALID_REQUEST'});assert.throws(()=>validateContextMaintenanceInvalidation({...invalidated,temporal:c.temporal}),{code:'INVALID_REQUEST'});
  await assert.rejects(f.service.noChange(f.caller,{...unchanged,temporal:c.temporal}),{code:'INVALID_REQUEST'});await assert.rejects(f.service.invalidate(f.caller,{...invalidated,temporal:c.temporal}),{code:'INVALID_REQUEST'});assert.deepEqual(await all(f.s),before);
  const row=await raw(f);assert.equal((await f.service.noChange(f.caller,unchanged)).disposition,'no_change');assert.deepEqual(await raw(f),row);
  assert.equal((await f.service.invalidate(f.caller,invalidated)).disposition,'invalidated');assert.deepEqual((await raw(f)).items[0].maintenance.temporal,c.temporal);assert.equal(contextTemporalProjection((await raw(f)).items[0]).temporalStatus,'unknown');
 }finally{await f.close();}
});

for(const action of ['edit','move','reorder'])test('actual human '+action+' retains temporal provenance and prevents automatic expiry or overwrite',async()=>{
 const f=await fixture();try{const c={...f.change,temporal:temporal('2000-01-01T00:00:00.000Z')};await maintain(f,c);
  if(action==='edit')await f.cards.change(manual(c));
  if(action==='move'){const row=await raw(f);await f.cards.change({kind:'move',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1,fromCard:'now',toCard:'info',expectedAccess:Object.fromEntries(['global','now','info'].map(key=>[key,row.access[key]]))});}
  if(action==='reorder'){const id=op();await f.cards.change({...manual(c,{itemId:id,expectedRevision:0}),body:'SYNTHETIC adjacent manual Now'});await f.cards.change({kind:'reorder',operationId:op(),epoch:'initial',itemId:c.itemId,expectedRevision:1,card:'now',section:c.section,adjacentId:id,adjacentRevision:1,direction:'down'});}
  const row=await raw(f),item=row.items.find(x=>x.id===c.itemId);assert.equal(validContextCards(row),true);assert.equal(item.protected,true);assert.equal(item.userEdited,true);assert.deepEqual(item.maintenance.temporal,c.temporal);assert.equal((await f.cards.snapshot()).items.find(x=>x.id===c.itemId).temporalStatus,'unknown');
  const result=await maintain(f,{...c,card:item.card,operationId:op(),expectedRevision:item.revision,body:'SYNTHETIC forbidden overwrite'});assert.equal(result.disposition,'protected');assert.deepEqual(await raw(f),row);
  assert.throws(()=>validateContextChange({...manual(c),temporal:c.temporal}),{code:'INVALID_REQUEST'});
 }finally{await f.close();}
});

test('manual rows keep their original schema and no temporal projection',async()=>{
 const f=await fixture();try{await f.cards.change(manual(f.change,{expectedRevision:0}));const row=await raw(f);assert.equal(validContextCards(row),true);assert.equal(row.items[0].origin,'manual');assert.equal(contextTemporalProjection(row.items[0]),null);assert.equal(Object.hasOwn((await f.cards.snapshot()).items[0],'temporalStatus'),false);
 }finally{await f.close();}
});

test('snapshot and shallow expire exactly at the explicit boundary with zero writes, no omission and no permission change',async()=>{
 const f=await fixture(),now=Date.now,at=now()+10000;try{const c={...f.change,temporal:temporal(new Date(at).toISOString())};await maintain(f,c);await f.open();await f.cards.snapshot();assert.equal((await f.reader.shallow(f.readCaller)).available,true);const before=await all(f.s);
  for(const [clock,status]of [[at-1,'not_expired'],[at,'expired'],[at+1,'expired']]){Date.now=()=>clock;const snap=await f.cards.snapshot(),read=await f.reader.shallow(f.readCaller);assert.equal(snap.items.length,1);assert.equal(snap.items[0].temporalStatus,status);assert.equal(read.available,true,read.reason);assert.equal(read.items.length,1);assert.equal(read.items[0].temporalStatus,status);assert.deepEqual(read.items[0].temporal,c.temporal);assert.equal(read.items[0].text,c.body);assert.ok(new TextEncoder().encode(JSON.stringify(read.items)).length<=CONTEXT_READ_LIMITS.outputBytes);assert.deepEqual(await all(f.s),before);}
  assert.deepEqual((await f.cards.snapshot('home')).items,[],'Home still publishes no private metadata');
 }finally{Date.now=now;await f.close();}
});

test('shallow computes temporal status after the original asynchronous final connection fence',async()=>{
 const f=await fixture(),now=Date.now,at=now()+10000;try{const c={...f.change,temporal:temporal(new Date(at).toISOString())};await maintain(f,c);await f.open();let clock=at-1;Date.now=()=>clock;f.readState.verifies=0;f.readState.hook=()=>{if(f.readState.verifies===2)clock=at;};const before=await all(f.s),read=await f.reader.shallow(f.readCaller);assert.equal(read.available,true,read.reason);assert.equal(read.items[0].temporalStatus,'expired');assert.deepEqual(await all(f.s),before);
 }finally{Date.now=now;await f.close();}
});

test('an actual failed receipt write rolls back temporal body and revision; exact retry commits once',async()=>{
 const f=await fixture();try{let fail=true;const service=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier,writeTransaction:callback=>f.s.repository.transaction(true,async t=>{const put=t.put.bind(t);t.put=async(name,row)=>{if(fail&&name==='operationReceipts'&&row.namespace==='context-maintenance')throw new ArchiveError('STORAGE_FULL');return put(name,row);};return callback(t);})}),c={...f.change,temporal:temporal()},before=await all(f.s);await assert.rejects(service.maintain(f.caller,c),{code:'STORAGE_FULL'});assert.deepEqual(await all(f.s),before);fail=false;assert.equal((await service.maintain(f.caller,c)).revision,1);assert.deepEqual((await raw(f)).items[0].maintenance.temporal,c.temporal);
 }finally{await f.close();}
});

for(const boundary of ['purged-source','restore-epoch'])test('temporal proposals and read projections preserve original '+boundary+' refusal',async()=>{
 const f=await fixture();try{const c={...f.change,temporal:temporal()};await maintain(f,c);await f.open();
  await f.s.foundationWrite(async t=>{if(boundary==='purged-source')await t.delete('records',f.input.originalTextReference);else await t.put('meta',{id:'recovery-restore-epoch',value:op()});});
  const before=await all(f.s);await assert.rejects(maintain(f,{...c,operationId:op(),expectedRevision:1,body:'SYNTHETIC stale temporal update'}));assert.deepEqual(await all(f.s),before);
  const snap=await f.cards.snapshot(),read=await f.reader.shallow(f.readCaller);assert.equal(snap.items.some(item=>item.id===c.itemId),false);assert.equal(read.items.some(item=>item.itemId===c.itemId),false);assert.ok(!JSON.stringify(read).includes(c.temporal.temporalScope));assert.deepEqual(await all(f.s),before);
 }finally{await f.close();}
});
