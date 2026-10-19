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
