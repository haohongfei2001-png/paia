import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {consumeCommittedSemanticWrite as consume} from '../core/idb-repository.js';

const rows=(s,name)=>s.repository.transaction(false,t=>t.all(name));
async function fixture(t){const {s}=await setup(OrganizerStore);await s.finishFoundation();t.after(()=>s.repository.db?.close());return s;}

test('real committed capture is repository-bound, uncloneable and consumable once with no DTO or storage change',async t=>{
 const s=await fixture(t),r=await s.capture(capture((await s.status()).epoch,'synthetic-new-receipt','Synthetic novel input'));
 const keys=Reflect.ownKeys(r),before={...s.repository.metrics};
 assert.equal(consume({},r),false);assert.equal(consume(s.repository,structuredClone(r)),false);assert.equal(consume(s.repository,{...r}),false);
 assert.equal(consume(s.repository,r),true);assert.equal(consume(s.repository,r),false);
 assert.deepEqual(Reflect.ownKeys(r),keys);assert.deepEqual(s.repository.metrics,before,'observation performs no reads or writes');
 assert.equal(consume(s.repository,await s.capture(capture((await s.status()).epoch,'synthetic-new-receipt','Synthetic novel input'))),false);
});

test('original Working no-op, persisted operation replay and unrelated readonly results have no new receipt',async t=>{
 const s=await fixture(t),input=(await rows(s,'inputStates'))[0],b=await s.input(input.id),edit={operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'Synthetic actual semantic edit',note:b.note,excluded:b.excluded}]};
 const result=await s.editDocument(edit);assert.equal(consume(s.repository,result),true);
 const replay=await s.editDocument(edit);assert.deepEqual(replay,result);assert.equal(consume(s.repository,replay),false);
 const noop=await inputEdit(s,b.id,{libraryText:'Synthetic actual semantic edit'});assert.equal(noop.ok,true);assert.equal(consume(s.repository,noop),false);
 const read=await s.repository.transaction(false,async tx=>(await tx.get('operationReceipts',edit.operationId)).result);assert.equal(consume(s.repository,read),false);
});

test('semantic receipt is absent during the transaction and native completion event, present only after original done',async t=>{
 const s=await fixture(t),input=(await rows(s,'inputStates'))[0],result={ok:true};let completed=false;
 const value=await s.repository.transaction(true,async tx=>{
  tx.tx.addEventListener('complete',()=>{completed=true;assert.equal(consume(s.repository,result),false);});
  await tx.put('inputStates',{...input,contentRevision:input.contentRevision+1});assert.equal(consume(s.repository,result),false);return result;
 });
 assert.equal(completed,true);assert.equal(value,result);assert.equal(consume(s.repository,value),true);
});

test('abort after semantic flush planning rolls back dirty metadata and cannot bind a result',async t=>{
 const s=await fixture(t),input=(await rows(s,'inputStates'))[0],before=await rows(s,'meta'),result={ok:true};
 await assert.rejects(s.repository.transaction(true,async tx=>{
  const put=tx.put.bind(tx);tx.put=async(name,row,...args)=>{const value=await put(name,row,...args);if(name==='meta'&&row.id==='aiu:delta:sequence')tx.tx.abort();return value;};
  await tx.put('inputStates',{...input,contentRevision:input.contentRevision+1});return result;
 }));
 assert.equal(consume(s.repository,result),false);assert.deepEqual(await rows(s,'inputStates'),[input]);assert.deepEqual(await rows(s,'meta'),before);
});

test('fence-only, removal and same known delta are not eligible dirty receipts',async t=>{
 const s=await fixture(t),input=(await rows(s,'inputStates'))[0];
 for(const work of [async tx=>tx.put('meta',{id:'topicKeepSeparate:synthetic',revision:1,operationId:'synthetic-fence'}),async tx=>tx.put('inputStates',{...input,removalState:'removed'}),async tx=>tx.put('inputStates',{...input,removalState:'removed'})]){
  const r=await s.repository.transaction(true,async tx=>{await work(tx);return {ok:true};});assert.equal(consume(s.repository,r),false);
 }
 const r=await s.repository.transaction(true,async tx=>{await tx.put('inputStates',{...input,contentRevision:input.contentRevision+1});return {ok:true};});assert.equal(consume(s.repository,r),true,'a genuine restoration creates eligible dirty again');
});

test('original single-item fields wrapper retains one receipt and persisted replay cannot regain it',async t=>{
 const s=await fixture(t),entry=await s.createEntry({operationId:crypto.randomUUID(),actor:'user',body:'Synthetic authored body',type:'idea',formation:'explicit',evidence:[]});
 const row=(await rows(s,'thoughts')).find(r=>r.id===entry.id),edit={operationId:crypto.randomUUID(),id:row.id,expectedRevision:row.revision,expectedFieldRevisions:{note:row.fieldRevisions.note},changes:{note:'Synthetic edited note'}};
 const r=await s.editLibraryFields(edit);assert.ok(r.revisionId);assert.equal(consume(s.repository,r),true);assert.equal(consume(s.repository,r),false);assert.equal(consume(s.repository,await s.editLibraryFields(edit)),false);
 const next=(await rows(s,'thoughts')).find(r=>r.id===entry.id),batch=await s.editLibraryBatch({operationId:crypto.randomUUID(),entries:[{id:next.id,expectedRevision:next.revision,expectedFieldRevisions:{note:next.fieldRevisions.note},changes:{note:'Synthetic newer note'}}]});
 assert.equal(consume(s.repository,batch.items[0]),true);assert.equal(consume(s.repository,batch),false,'top and alias share exactly one observation');assert.equal(consume(s.repository,batch.items[0]),false);
});

test('only a single own data item is aliased; no getter or arbitrary body traversal occurs',async t=>{
 const s=await fixture(t);let revision=(await rows(s,'inputStates'))[0],gets=0;
 for(const result of [Object.defineProperty({ok:true},'items',{get(){gets++;throw Error('must not read getter');}}),{items:[{},{}]},{items:Object.assign(Object.create({0:{}}),{length:1})}]){
  const value=await s.repository.transaction(true,async tx=>{revision={...revision,contentRevision:revision.contentRevision+1};await tx.put('inputStates',revision);return result;});
  const items=Object.getOwnPropertyDescriptor(result,'items')?.value;if(Array.isArray(items))for(const item of items)assert.equal(consume(s.repository,item),false);
  assert.equal(value,result);assert.equal(consume(s.repository,result),true);
 }
 assert.equal(gets,0);
});

import {KNOWN_PREFIX,DIRTY_PREFIX,DELTA_COUNTER,HUMAN_FENCE} from '../core/ai-usage/delta.js';
const deltaKey=input=>JSON.stringify(['input',input.id]);
async function pairFixture(t){
 const s=await fixture(t);await s.capture(capture((await s.status()).epoch,'synthetic-pair-second','Synthetic second independent input'));await s.finishFoundation();
 return {s,inputs:await rows(s,'inputStates')};
}
const snapshot=s=>s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await tx.all(name)]))));

test('semantic read pair starts both requests before either resolves and preserves per-entity writes, sequence and final receipt',async t=>{
 const {s,inputs}=await pairFixture(t),before=await rows(s,'meta'),counter=before.find(x=>x.id===DELTA_COUNTER).value,result={ok:true},trace=[];
 let completed=false;
 const value=await s.repository.transaction(true,async tx=>{
  const get=tx.get.bind(tx),put=tx.put.bind(tx),seen=new Map();
  tx.get=async(name,id)=>{
   const kind=name==='meta'?(id.startsWith(KNOWN_PREFIX)?'known':id.startsWith(DIRTY_PREFIX)?'pending':null):null;
   if(!kind)return get(name,id);
   const key=id.slice(kind==='known'?KNOWN_PREFIX.length:DIRTY_PREFIX.length),pair=seen.get(key)||new Set();seen.set(key,pair);pair.add(kind);trace.push(['read-start',key,kind]);
   const row=await get(name,id);
   assert.equal(pair.size,2,'both independent reads must start before either result is awaited');
   trace.push(['read-done',key,kind]);return row;
  };
  tx.put=async(name,row,...rest)=>{const r=await put(name,row,...rest);if(name==='meta'&&(row.id.startsWith(KNOWN_PREFIX)||row.id.startsWith(DIRTY_PREFIX)))trace.push(['write-done',row.id]);return r;};
  tx.tx.addEventListener('complete',()=>{completed=true;assert.equal(consume(s.repository,result),false);});
  for(const input of inputs)await tx.put('inputStates',{...input,contentRevision:input.contentRevision+1});
  assert.equal(consume(s.repository,result),false);return result;
 });
 assert.equal(value,result);assert.equal(completed,true);assert.equal(consume(s.repository,value),true);assert.equal(consume(s.repository,value),false);
 const expected=[];for(const input of inputs){const key=deltaKey(input);expected.push(['read-start',key,'known'],['read-start',key,'pending'],['read-done',key,'known'],['read-done',key,'pending'],['write-done',KNOWN_PREFIX+key],['write-done',DIRTY_PREFIX+key]);}
 assert.deepEqual(trace,expected,'no next-entity read before both previous writes, no missing await or cross-entity flush');
 const meta=await rows(s,'meta');assert.equal(meta.find(x=>x.id===DELTA_COUNTER).value,counter+inputs.length);
 for(const [i,input]of inputs.entries()){const known=meta.find(x=>x.id===KNOWN_PREFIX+deltaKey(input)),pending=meta.find(x=>x.id===DIRTY_PREFIX+deltaKey(input));assert.equal(known.sequence,counter+i+1);assert.equal(pending.sequence,known.sequence);assert.equal(pending.signature,known.signature);assert.equal(known.descriptor.revision,input.contentRevision+1);}
});

for(const mode of ['known','pending','both-known-first','both-pending-first'])test('semantic read pair '+mode+' rejection rolls back prior entity, canonical rows, metadata and receipt',{timeout:5000},async t=>{
 const {s,inputs}=await pairFixture(t),before=await snapshot(s),target=deltaKey(inputs[1]),result={ok:true},pending=[],rejected=[],written=[];
 const errors={known:Object.assign(new Error('synthetic known read failure'),{code:'STORAGE_FAILED'}),pending:Object.assign(new Error('synthetic pending read failure'),{code:'STORAGE_FAILED'})};
 let aborted=0,completed=0;
 const operation=s.repository.transaction(true,async tx=>{
  const get=tx.get.bind(tx),put=tx.put.bind(tx);
  tx.tx.addEventListener('abort',()=>aborted++);tx.tx.addEventListener('complete',()=>completed++);
  tx.get=(name,id)=>{
   const kind=name==='meta'&&id===KNOWN_PREFIX+target?'known':name==='meta'&&id===DIRTY_PREFIX+target?'pending':null;
   if(!kind)return get(name,id);
   // Use both actual IndexedDB reads before injecting either failure. Both
   // rejected promises are returned to the production join, never caught here.
   const read=get(name,id);return new Promise((resolve,reject)=>{
    pending.push({kind,read,resolve,reject});
    if(pending.length===2)Promise.all(pending.map(x=>x.read)).then(values=>{
     const order=mode==='both-pending-first'?[1,0]:[0,1];
     for(const i of order){const p=pending[i];if(mode.startsWith('both')||mode===p.kind){rejected.push(p.kind);p.reject(errors[p.kind]);}else p.resolve(values[i]);}
    },error=>{for(const p of pending)p.reject(error);});
   });
  };
  tx.put=async(name,row,...rest)=>{const r=await put(name,row,...rest);if(name==='meta'&&row.id.startsWith(KNOWN_PREFIX))written.push(row.id);return r;};
  for(const input of inputs)await tx.put('inputStates',{...input,contentRevision:input.contentRevision+1});return result;
 });
 const first=mode==='pending'||mode==='both-pending-first'?'pending':'known';
 await assert.rejects(operation,e=>e===errors[first]);
 // Let all rejection reactions finish. Node's test runner also fails any
 // unhandled sibling rejection; no process rejection listener suppresses it.
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(pending.map(x=>x.kind),['known','pending']);
 assert.deepEqual(rejected,mode.startsWith('both')?(first==='known'?['known','pending']:['pending','known']):[mode]);
 assert.deepEqual(written,[KNOWN_PREFIX+deltaKey(inputs[0])],'the preceding entity was really written before the failing pair');
 assert.equal(aborted,1);assert.equal(completed,0);assert.equal(consume(s.repository,result),false);assert.deepEqual(await snapshot(s),before);
});

test('same-key writes coalesce and repeated real journals retain newest sequence, pending obligations and owner receipt rules',async t=>{
 const s=await fixture(t),input=(await rows(s,'inputStates'))[0],key=deltaKey(input),before=await rows(s,'meta'),counter=before.find(x=>x.id===DELTA_COUNTER).value;
 const result=await s.repository.transaction(true,async tx=>{await tx.put('inputStates',{...input,contentRevision:input.contentRevision+1});await tx.put('inputStates',{...input,contentRevision:input.contentRevision+2});return {ok:true};});
 let meta=await rows(s,'meta');assert.equal(meta.find(x=>x.id===DELTA_COUNTER).value,counter+1);assert.equal(meta.find(x=>x.id===KNOWN_PREFIX+key).descriptor.revision,input.contentRevision+2);assert.equal(consume(s.repository,result),true);
 const entry=await s.createEntry({operationId:crypto.randomUUID(),actor:'user',body:'Synthetic journal owner',type:'idea',formation:'explicit',evidence:[]});
 const owner=(await rows(s,'thoughts')).find(x=>x.id===entry.id);
 await s.editLibraryFields({operationId:crypto.randomUUID(),id:owner.id,expectedRevision:owner.revision,expectedFieldRevisions:{note:owner.fieldRevisions.note},changes:{note:'Synthetic current note'}});
 const journals=(await rows(s,'revisions')).filter(x=>x.kind==='library_entry'&&x.entityId===entry.id).sort((a,b)=>a.afterRevision-b.afterRevision);
 assert.ok(journals.length>=2,'real birth and edit journals exist');
 const humanKey=JSON.stringify(['library_entry',entry.id]);
 await s.repository.transaction(true,async tx=>{const row=await tx.get('meta',DIRTY_PREFIX+humanKey);await tx.put('meta',{...row,requirements:['synthetic-retained-obligation'],pendingFacets:['context']});});
 const stable=await rows(s,'meta');
 for(const order of [[...journals,...journals].reverse(),journals]){
  const replay=await s.repository.transaction(true,async tx=>{for(const journal of order){await tx.delete('revisions',journal.id);await tx.put('revisions',journal);}return {ok:true};});
  assert.equal(consume(s.repository,replay),false);meta=await rows(s,'meta');
  for(const id of [KNOWN_PREFIX+humanKey,DIRTY_PREFIX+humanKey,DELTA_COUNTER,HUMAN_FENCE])assert.deepEqual(meta.find(x=>x.id===id),stable.find(x=>x.id===id));
 }
});
