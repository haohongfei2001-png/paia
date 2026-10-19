import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionFixture,op,rows,confirmed,request} from './harness/topic-04.mjs';

// Real original Repository finalizers run after the domain callback returns.
// These injections are deliberately later than the existing last-count fence.
for(const change of ['processing','Source'])test('original promotion rejects '+change+' changed by Repository final generation write',async()=>{
 const f=await promotionFixture(),r=request(f),work=await confirmed(f,r);await f.service.stage(work.workId);
 const transaction=f.s.repository.transaction.bind(f.s.repository);let receipt=false,injected=0;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{
  if(write){const put=t.put.bind(t);t.put=async(table,row,...rest)=>{
   const result=await put(table,row,...rest);if(table==='operationReceipts'&&row.id===r.operationId)receipt=true;
   if(receipt&&!injected&&table==='meta'&&row.id==='backup-data-generation'){
    injected++;if(change==='processing')f.permission.epoch='synthetic-revoked-by-repository-finalizer';
    else{const source=(await t.all('records'))[0];source.value.originalText+=' SYNTHETIC finalizer drift';await put('records',source);}
   }return result;
  };}return fn(t);
 },...args);
 try{await assert.rejects(f.service.activate(work.workId));assert.equal(injected,1);assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await rows(f.s,'operationReceipts')).some(x=>x.id===r.operationId),false);}
 finally{f.s.repository.transaction=transaction;await f.s.repository.close();}
});
test('original promotion still commits unchanged evidence through the same Repository finalizers',async()=>{
 const f=await promotionFixture(),r=request(f),work=await confirmed(f,r);await f.service.stage(work.workId);const result=await f.service.activate(work.workId);assert.equal(result.operationId,r.operationId);assert.equal(result.intentMode,'ai_proposal');assert.equal((await rows(f.s,'topics')).length,2);await f.s.repository.close();
});
for(const change of ['Working body','Entry body','Source Section','new restriction','new dependency','restore epoch'])test('terminal exact facts reject late '+change+' without absorbing it as own mutation',async()=>{
 const f=await promotionFixture(),r=request(f),work=await confirmed(f,r);await f.service.stage(work.workId);
 const transaction=f.s.repository.transaction.bind(f.s.repository);let receipt=false,injected=0;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(table==='operationReceipts'&&row.id===r.operationId)receipt=true;if(receipt&&!injected&&table==='meta'&&row.id==='backup-data-generation'){
  injected++;if(change==='Working body'){const row=await t.get('blocks',f.scope[0].inputId);row.value.libraryText+=' changed';await put('blocks',row);}
  else if(change==='Entry body'){const row=await t.get('thoughts',f.entryIds[0]);row.thoughtText+=' changed';await put('thoughts',row);}
  else if(change==='Source Section'){const row=await t.get('sections',JSON.stringify([f.parent.id,1,f.section.sectionId]));row.title+=' changed';await put('sections',row);}
  else if(change==='new restriction')await put('meta',{id:'memory:topic:synthetic-terminal',topicId:f.parent.id,decision:'denied'});
  else if(change==='new dependency'){const row=(await t.all('dependencies','byTarget',IDBKeyRange.bound(['entry',f.entryIds[0]],['entry',f.entryIds[0],[]],false,true)))[0];await put('dependencies',{...row,id:'terminal-additional-dependency'});}
  else await put('meta',{id:'recovery-restore-epoch',value:'terminal-restore'});
 }return result;};}return fn(t);},...args);
 try{await assert.rejects(f.service.activate(work.workId));assert.equal(injected,1);assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await rows(f.s,'operationReceipts')).some(row=>row.id===r.operationId),false);}
 finally{f.s.repository.transaction=transaction;await f.s.repository.close();}
});
