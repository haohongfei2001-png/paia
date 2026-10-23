// Original action-owner budget check in real Chrome/native IndexedDB. This
// separately isolates cumulative metadata reads and authorized material bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,rpc} from './organize-native-fixture.mjs';
for(const variant of ['source','release'])test('native actual metadata cumulative read bound '+variant,{timeout:60000},async t=>{
 const f=await nativeFixture(t,{count:0,variant,observeActionBudget:true});const selection={...await f.select(),topicId:f.topic.id};
 const report=await f.worker.evaluate(async({selection})=>{
  const n=globalThis.__organizeNative,{source,store,lastSender}=n;
  const {captureOriginalOrganizeScope,releaseOriginalOrganizeScope,assertOriginalOrganizeActionFacts}=n.budget;
  if(!(store.repository.db instanceof IDBDatabase))throw Error('native database required');
  let requests=0,active=false;const saved=[];
  const wrap=(proto,key,fn)=>{const d=Object.getOwnPropertyDescriptor(proto,key);saved.push([proto,key,d]);Object.defineProperty(proto,key,{...d,value:fn(d.value)});};
  const inScope=stack=>stack.includes('/core/organizer/organize-processing-scope.js:');
  for(const [proto,key] of [[IDBObjectStore.prototype,'get'],[IDBObjectStore.prototype,'count'],[IDBObjectStore.prototype,'openCursor'],[IDBIndex.prototype,'openCursor']])wrap(proto,key,original=>function(...args){if(active&&inScope(new Error().stack||''))requests++;return Reflect.apply(original,this,args);});
  let action,error,passes=0;const start=performance.now();
  try{active=true;action=await source.consume(lastSender,{topicId:selection.topicId,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()});
   while(passes<600){await store.run(()=>store.repository.transaction(false,async tx=>{let proof;try{proof=await captureOriginalOrganizeScope(store,tx,selection.topicId,source,action);}finally{releaseOriginalOrganizeScope(proof);}}));passes++;}
  }catch(e){error=e.code;}finally{active=false;for(const [proto,key,d]of saved.reverse())Object.defineProperty(proto,key,d);}
  let refused=false;try{assertOriginalOrganizeActionFacts(source,action,store);}catch{refused=true;}
  const current=await source.current(action,lastSender);source.release(action);
  return {requests,passes,error,refused,current,elapsed:performance.now()-start};
 },{selection});
 t.diagnostic(JSON.stringify({variant,...report}));assert.equal(report.requests,4096,'the original action refuses a 4097th actual metadata request');assert.equal(report.error,'BUDGET_EXCEEDED');assert.equal(report.refused,true);assert.equal(report.current,false);assert.equal(f.backend.physical(),0);const snapshot=await f.snapshot();assert.equal(snapshot.jobs.length,0);assert.equal(snapshot.work.filter(row=>row.state==='ACKNOWLEDGED').length,0);assert.equal(!!snapshot.candidate?.candidate,false);f.quiet();
});
for(const variant of ['source','release'])test('native actual authorized material cumulative 2MiB bound '+variant,{timeout:60000},async t=>{
 const f=await nativeFixture(t,{count:0,variant,observeActionBudget:true}),body='SYNTHETIC byte-bound material '+'x'.repeat(100000);
 const entry=await rpc(f.p,'CONTINUE_THINKING',{thought:{topicId:f.topic.id,body,operationId:crypto.randomUUID()}}),selection={...await f.select(),topicId:f.topic.id};
 const report=await f.worker.evaluate(async({selection,entryId,bodyBytes})=>{
  const {source,store,lastSender,budget:b}=__organizeNative;if(!(store.repository.db instanceof IDBDatabase))throw Error('native database required');
  let action,error,stack,passes=0,requests=0,materialDebits=0,materialBytes=0,lastDebitBytes=0;const original=IDBObjectStore.prototype.get,encode=TextEncoder.prototype.encode;
  TextEncoder.prototype.encode=function(...args){const bytes=Reflect.apply(encode,this,args),caller=new Error().stack.split('\n')[2]||'';if(caller.includes('/background/organize-processing-policy.js:')&&bytes.length>=bodyBytes&&args[0].includes('SYNTHETIC byte-bound material ')){materialDebits++;materialBytes+=bytes.length;lastDebitBytes=bytes.length;}return bytes;};
  IDBObjectStore.prototype.get=function(...args){requests++;return Reflect.apply(original,this,args);};
  try{
   action=await source.consume(lastSender,{topicId:selection.topicId,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()});
   // Each iteration reacquires the original transaction/selection/field grant.
   // None can reset the cumulative budget of this one genuine Chrome action.
   while(passes<30){await store.run(()=>store.repository.transaction(false,async tx=>{
    let proof,grant;try{proof=await b.captureOriginalOrganizeScope(store,tx,selection.topicId,source,action);grant=b.captureOrganizeProcessingGrant(source,action,store,tx,proof);const row=await store.readableEntry(b.organizeProcessingReader(grant,store,tx),entryId);if(new TextEncoder().encode(row.thoughtText).length!==bodyBytes)throw Error('exact synthetic material required');}
    finally{if(grant)b.releaseOrganizeProcessingGrant(grant);b.releaseOriginalOrganizeScope(proof);}
   }));passes++;}
  }catch(e){error=e.code;stack=e.stack;}finally{IDBObjectStore.prototype.get=original;TextEncoder.prototype.encode=encode;}
  let refused=false;try{b.assertOriginalOrganizeActionFacts(source,action,store);}catch{refused=true;}
  const current=await source.current(action,lastSender);source.release(action);
  return {passes,bodyBytes,materialDebits,materialBytes,lastDebitBytes,requests,error,byteOwner:stack?.includes('chargeOriginalOrganizeWork'),refused,current};
 },{selection,entryId:entry.id,bodyBytes:Buffer.byteLength(body)});
 t.diagnostic(JSON.stringify({variant,...report}));assert.equal(report.error,'BUDGET_EXCEEDED');assert.equal(report.byteOwner,true);assert.ok(report.requests<4096);assert.ok(report.passes>0);assert.ok(report.materialBytes-report.lastDebitBytes<=2097152,'successful material charges remain bounded');assert.ok(report.materialBytes>2097152,'actual UTF-8 field/template debits alone cross 2MiB at refusal');assert.equal(report.refused,true);assert.equal(report.current,false);assert.equal(f.backend.physical(),0);
 const snapshot=await f.snapshot();assert.equal(snapshot.jobs.length,0);assert.equal(snapshot.work.filter(row=>row.state==='ACKNOWLEDGED').length,0);assert.equal(!!snapshot.candidate?.candidate,false);assert.equal(snapshot.entries.length,1);assert.equal(snapshot.entries[0].thoughtText,body);f.quiet();
});
