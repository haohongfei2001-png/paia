import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {ImportCoordinator} from '../core/import/coordinator.js';
import {ImportLedger} from '../core/import/ledger.js';
import {officialExportAdapter} from '../core/import/chatgpt-export.js';
import {conversation,historyFile} from './fixtures/history-v090.mjs';

async function fixture(){
 const f=await completeFixture({texts:[]}),ledger=new ImportLedger(f.s);
 const controller=new ImportCoordinator({adapter:officialExportAdapter,transport:(method,request)=>ledger[method](request,'source-count-refresh-page')});
 await controller.select(historyFile([conversation(1,2),conversation(2,2)]),{consent:true});
 await controller.preflight();
 return {...f,controller};
}

// Observe the original transaction object rather than replacing its identity or
// simulating sourceCount results. Every intercepted delete still uses real IDB.
function observeDeletes(s,observer){
 const repository=s.repository,transaction=repository.transaction;
 repository.transaction=function(write,fn,stores){
  return transaction.call(this,write,async t=>{
   if(write){const remove=t.delete.bind(t);t.delete=async(name,key)=>{
    const before=name==='sourceCounts'?await t.get(name,key):undefined;
    const result=await remove(name,key);
    if(name==='sourceCounts')await observer({key,before});
    return result;
   };}
   return fn(t);
  },stores);
 };
 return ()=>{repository.transaction=transaction;};
}
const snapshot=s=>s.repository.transaction(false,async t=>{
 const result={};for(const name of s.repository.stores)result[name]=await t.all(name);return result;
});

test('one actual historical import batch does not delete absent counts for other Conversations',async()=>{
 const f=await fixture(),deletes=[],restore=observeDeletes(f.s,row=>deletes.push(row));
 try{
  const result=await f.controller.commit();assert.equal(result.counts.added,4);
  const records=await rows(f.s,'records'),blocks=await rows(f.s,'blocks'),counts=await rows(f.s,'sourceCounts');
  assert.equal(records.length,4);assert.equal(blocks.length,4);assert.equal(counts.length,4);
  for(const record of records){
   const block=blocks.find(row=>row.value.sourceRecordId===record.id);assert.ok(block);
   const count=counts.find(row=>row.id===JSON.stringify([block.value.documentId,record.value.sourceKey]));
   assert.ok(count);assert.deepEqual(count.views.sort(),['archive','library'].map(view=>JSON.stringify([block.value.documentId,view])).sort());
  }
  assert.equal(deletes.filter(row=>row.before===undefined).length,0,'unrelated changed Sources must not dispatch an absent-row IDB delete');
  assert.equal(f.requests.length,0);
 }finally{restore();await f.s.repository.close();}
});

test('original nonfinal Source purge removes its existing count and preserves other canonical counts',async()=>{
 const f=await fixture();await f.controller.commit();
 const target=(await rows(f.s,'records'))[0],block=(await rows(f.s,'blocks')).find(row=>row.value.sourceRecordId===target.id);
 const key=JSON.stringify([block.value.documentId,target.value.sourceKey]),before=await rows(f.s,'sourceCounts'),deletes=[],restore=observeDeletes(f.s,row=>deletes.push(row));
 try{
  assert.equal((await f.s.sourcePurgePreflight(target.id)).state,'unambiguous');
  await f.s.permanentDelete(target.id);
  assert.deepEqual(await rows(f.s,'sourceCounts'),before.filter(row=>row.id!==key));
  assert.equal(deletes.filter(row=>row.key===key&&row.before!==undefined).length,1,'the guard must retain an actual existing-row removal');
  assert.equal((await rows(f.s,'records')).length,3);assert.equal((await rows(f.s,'blocks')).length,3);
  assert.equal((await rows(f.s,'documents')).length,2,'the other Source in the target Conversation keeps its document');
  assert.ok((await rows(f.s,'tombstones')).some(row=>row.id==='source:'+target.value.sourceKey));
  assert.equal(f.requests.length,0);
 }finally{restore();await f.s.repository.close();}
});

test('a failure after actual count deletion rolls back the entire original purge transaction',async()=>{
 const f=await fixture();await f.controller.commit();
 const target=(await rows(f.s,'records'))[0],block=(await rows(f.s,'blocks')).find(row=>row.value.sourceRecordId===target.id);
 const key=JSON.stringify([block.value.documentId,target.value.sourceKey]),before=await snapshot(f.s);let intercepted=false;
 const restore=observeDeletes(f.s,row=>{if(row.key===key){assert.ok(row.before);intercepted=true;throw new Error('SYNTHETIC failure after count deletion');}});
 try{
  await assert.rejects(f.s.permanentDelete(target.id),{code:'STORAGE_FAILED'});
  assert.equal(intercepted,true,'failure occurs after the real existing count was deleted inside the original transaction');
  assert.deepEqual(await snapshot(f.s),before,'Source, Working, counts, documents, tombstones and original generation all roll back together');
  assert.equal(f.requests.length,0);
 }finally{restore();await f.s.repository.close();}
});
