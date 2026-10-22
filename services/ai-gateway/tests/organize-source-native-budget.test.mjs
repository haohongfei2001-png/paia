// Original action-owner budget check in real Chrome/native IndexedDB. This
// isolates cumulative metadata reads; it is not a 2MiB material stress test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './organize-native-fixture.mjs';
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
