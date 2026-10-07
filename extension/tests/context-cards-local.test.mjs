import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW,validContextCards} from '../core/context-cards.js';
import {hashText} from '../core/dedupe.js';
import {ContextCommitSession} from '../ui/context-commit.js';

const cards=['info','rules','now'];
const operationId=()=>crypto.randomUUID();
const put=(card,overrides={})=>({kind:'put',operationId:operationId(),epoch:'initial',itemId:operationId(),expectedRevision:0,body:'SYNTHETIC independent manual body',section:'SYNTHETIC section',card,...overrides});
const remove=(item,overrides={})=>({kind:'delete',operationId:operationId(),epoch:'initial',itemId:item.id,expectedRevision:item.revision,...overrides});
const restore=(item,deletedBy,overrides={})=>({kind:'restore',operationId:operationId(),epoch:'initial',itemId:item.id,expectedRevision:item.revision,deletedBy,...overrides});
const recovery=(change,overrides={})=>({kind:'context_item',ownerId:change.itemId,epoch:change.epoch,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change},...overrides});
const canonical=s=>s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));
const receipts=s=>s.repository.transaction(false,t=>t.all('operationReceipts'));
const protectedRows=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','thoughts','topics','inputStates','inputRemovals','tombstones','revisions','provenance'].map(async name=>[name,await t.all(name)]))));
async function fixture(){const f=await setup(OrganizerStore);await f.s.finishFoundation();return {...f,c:new ContextCardsService(f.s)};}

test('CTX4-02 local capabilities are truthful without changing default access or creating data',async()=>{
 const {s,c}=await fixture(),before=await protectedRows(s),snapshot=await c.snapshot();
 assert.deepEqual(snapshot.capabilities,{info:true,rules:true,now:true,inputs:false,automatic:false,external:false});
 assert.deepEqual(snapshot.counts,{info:0,rules:0,now:0,inputs:0});
 assert.equal(snapshot.connections,0);
 assert.ok(Object.values(snapshot.access).every(value=>value.enabled===false&&value.revision===0));
 assert.deepEqual(snapshot.items,[]);
 assert.equal(await canonical(s),undefined);
 assert.deepEqual(await protectedRows(s),before);
 assert.equal(s.repository.db.version,5);
});

for(const card of cards)test(`CTX4-02 ${card} create/edit/delete/restore preserves sibling Items, count and identity`,async()=>{
 const {s,c}=await fixture(),changes=cards.flatMap(value=>[put(value),put(value)]);
 for(const change of changes)assert.equal((await c.change(change)).revision,1);
 const initial=await c.snapshot(),target=initial.items.find(item=>item.card===card),siblings=initial.items.filter(item=>item.id!==target.id);
 assert.deepEqual(initial.counts,{info:2,rules:2,now:2,inputs:0});
 assert.equal(new Set(initial.items.map(item=>item.id)).size,6,'same section and body do not merge separate card Items');
 const edit=put(card,{itemId:target.id,expectedRevision:1,body:`SYNTHETIC exact ${card} human rewrite\nsecond line`,section:'SYNTHETIC changed section'});
 assert.deepEqual(await c.change(edit),{ok:true,itemId:target.id,revision:2,lifecycle:'active',deletedBy:null});
 let snapshot=await new ContextCardsService(s).snapshot(),edited=snapshot.items.find(item=>item.id===target.id);
 assert.deepEqual(snapshot.items.filter(item=>item.id!==target.id),siblings);
 assert.equal(edited.card,card);
 assert.equal(edited.body,edit.body);
 assert.equal(edited.section,edit.section);
 assert.equal(edited.order,target.order);
 assert.equal(edited.createdAt,target.createdAt);
 assert.equal(edited.origin,'manual');
 assert.equal(edited.protected,true);
 assert.equal(edited.userEdited,true);
 const deletion=remove(edited);
 assert.equal((await c.change(deletion)).revision,3);
 snapshot=await c.snapshot();
 assert.deepEqual(snapshot.counts,{info:2,rules:2,now:2,inputs:0,[card]:1});
 assert.deepEqual(snapshot.items,siblings);
 const removed=(await canonical(s)).items.find(item=>item.id===target.id);
 assert.equal(removed.lifecycle,'removed');
 assert.equal(removed.deletedBy,deletion.operationId);
 assert.equal(removed.protected,true);
 assert.equal(removed.userEdited,true);
 assert.equal((await c.change(restore(removed,deletion.operationId))).revision,4);
 snapshot=await new ContextCardsService(s).snapshot();
 assert.deepEqual(snapshot.counts,{info:2,rules:2,now:2,inputs:0});
 assert.deepEqual(snapshot.items.filter(item=>item.id!==target.id),siblings);
 assert.equal(snapshot.items.find(item=>item.id===target.id).body,edit.body);
 assert.equal(snapshot.items.find(item=>item.id===target.id).card,card);
 assert.equal(snapshot.items.find(item=>item.id===target.id).deletedBy,null);
 assert.equal(validContextCards(await canonical(s)),true);
});

test('CTX4-02 manual changes across all cards leave nonempty Source, Working Input and Thought owners untouched',async()=>{
 const {s,c}=await fixture(),input=(await s.snapshot()).library.blocks[0];
 await inputEdit(s,input.id,{libraryText:'SYNTHETIC protected Working Input rewrite',note:'SYNTHETIC authored note'});
 const thought=await derived(s,[input.id],{body:'SYNTHETIC retained Thought evidence'});
 await s.editEntry({id:thought.id,expectedRevision:0,operationId:operationId(),changes:{title:'SYNTHETIC human Thought title'}});
 const before=await protectedRows(s);
 assert.ok(before.records.length&&before.blocks.length&&before.thoughts.length&&before.revisions.length);
 for(const card of cards){
  const first=put(card);await c.change(first);
  await c.change(put(card,{itemId:first.itemId,expectedRevision:1,body:'SYNTHETIC unrelated Context rewrite'}));
  const deletion=remove({id:first.itemId,revision:2});await c.change(deletion);
  await c.change(restore({id:first.itemId,revision:3},deletion.operationId));
 }
 assert.deepEqual(await protectedRows(s),before);
});

test('CTX4-02 concurrent card creates and revision races preserve every independent Item',async()=>{
 const {s,c}=await fixture(),changes=cards.map(card=>put(card));
 const created=await Promise.all(changes.map(change=>new ContextCardsService(s).change(change)));
 assert.ok(created.every(result=>result.ok&&result.revision===1));
 const edits=changes.flatMap(first=>['A','B'].map(writer=>put(first.card,{itemId:first.itemId,expectedRevision:1,body:`SYNTHETIC ${first.card} concurrent writer ${writer}`})));
 const results=await Promise.all(edits.map(change=>new ContextCardsService(s).change(change)));
 const snapshot=await c.snapshot();
 assert.deepEqual(snapshot.counts,{info:1,rules:1,now:1,inputs:0});
 for(let index=0;index<cards.length;index++){
  const pair=results.slice(index*2,index*2+2);
  assert.equal(pair.filter(result=>result.ok===true).length,1);
  assert.equal(pair.filter(result=>result.conflict===true).length,1);
  const item=snapshot.items.find(value=>value.id===changes[index].itemId),winner=pair.findIndex(result=>result.ok===true);
  assert.equal(item.revision,2);
  assert.equal(item.card,cards[index]);
  assert.equal(item.body,edits[index*2+winner].body);
 }
});

test('CTX4-02 replacing the store preserves three-card bodies, protection, counts and exact receipts',async()=>{
 const {s,c,storage,indexedDB}=await fixture(),changes=cards.map(card=>put(card));
 for(const change of changes)await c.change(change);
 const before=await c.snapshot(),beforeRows=await canonical(s),beforeReceipts=await receipts(s),beforeProtected=await protectedRows(s);
 await s.repository.close();
 const replacement=new OrganizerStore(storage,{indexedDB});
 await replacement.finishFoundation();
 const reopened=new ContextCardsService(replacement);
 assert.deepEqual(await reopened.snapshot(),before);
 assert.deepEqual(await canonical(replacement),beforeRows);
 for(const change of changes)assert.deepEqual(await reopened.change(change),{ok:true,itemId:change.itemId,revision:1,lifecycle:'active',deletedBy:null});
 assert.deepEqual(await receipts(replacement),beforeReceipts);
 assert.deepEqual(await protectedRows(replacement),beforeProtected);
 assert.equal(replacement.repository.db.version,5);
});

test('CTX4-02 expanded card validation still rejects malformed persisted Item ownership without repair',async()=>{
 const {s,c}=await fixture(),first=put('now');await c.change(first);
 const original=await canonical(s);
 for(const invalid of [{card:'inputs'},{card:'unknown'},{origin:'automatic'},{protected:false},{userEdited:false}]){
  const row=structuredClone(original);Object.assign(row.items[0],invalid);
  assert.equal(validContextCards(row),false);
  await s.write(t=>t.put('meta',row));
  await assert.rejects(c.snapshot(),{code:'STORAGE_FAILED'});
  assert.deepEqual(await canonical(s),row,'unsupported data must be preserved rather than silently rewritten');
 }
});

test('CTX4-02 legacy omitted-card receipt replays exact historical digest without normalization or writes',async()=>{
 const {s,c}=await fixture();
 const change={kind:'put',operationId:'11111111-1111-4111-8111-111111111111',epoch:'initial',itemId:'22222222-2222-4222-8222-222222222222',expectedRevision:0,body:'SYNTHETIC legacy manual context',section:'SYNTHETIC legacy section'};
 const digest='096f536f8b63696fe744a36713fe155e30155a5e94a52d02d7c46e72f1259034';
 const result={ok:true,itemId:change.itemId,revision:1,lifecycle:'active',deletedBy:null};
 const at='2026-10-01T00:00:00.000Z';
 const row={id:CONTEXT_CARDS_ROW,version:1,sequence:1,access:Object.fromEntries(['global','info','rules','now','inputs'].map(key=>[key,{enabled:false,revision:0}])),items:[{id:change.itemId,card:'info',body:change.body,section:change.section,revision:1,order:0,origin:'manual',protected:true,userEdited:true,lifecycle:'active',createdAt:at,updatedAt:at,deletedBy:null}]};
 const receipt={id:'context:'+change.operationId,namespace:'context-cards',schemaVersion:1,ownerId:change.itemId,createdAt:at,digest,epoch:'initial',result};
 assert.equal(await hashText(JSON.stringify(change)),digest,'literal CTX4-01 payload is pinned to its original digest');
 assert.equal(validContextCards(row),true);
 await s.write(async t=>{await t.put('meta',row);await t.put('operationReceipts',receipt);});
 const beforeReceipts=await receipts(s);
 assert.deepEqual(await c.change(change),result);
 assert.deepEqual(await c.outcome({operationId:change.operationId,digest,epoch:'initial'}),{state:'committed',result});
 assert.deepEqual(await canonical(s),row);
 assert.deepEqual(await receipts(s),beforeReceipts);
 assert.equal(Object.hasOwn(change,'card'),false,'validation must not rewrite caller payloads');
 await assert.rejects(c.change({...change,card:'info'}),{code:'INVALID_REQUEST'},'receipt replay requires exact bytes even for an equivalent card');
 assert.deepEqual(await c.recoverySources(recovery({...change,operationId:operationId(),expectedRevision:1})),[]);
 assert.equal((await c.change({...change,operationId:operationId(),expectedRevision:1,body:'SYNTHETIC legacy edit'})).revision,2);
 assert.equal((await c.snapshot()).items[0].card,'info');
});

test('CTX4-02 new omitted-card writes keep their own digest and remain editable as explicit info',async()=>{
 const {s,c}=await fixture(),change=put('info');delete change.card;
 const original=structuredClone(change),digest=await hashText(JSON.stringify(change));
 await c.change(change);
 assert.deepEqual(change,original);
 const receipt=(await receipts(s)).find(row=>row.id==='context:'+change.operationId);
 assert.equal(receipt.digest,digest);
 assert.equal((await c.snapshot()).items[0].card,'info');
 assert.equal((await c.change(put('info',{itemId:change.itemId,expectedRevision:1}))).revision,2);
});

for(const card of cards)test(`CTX4-02 ${card} immutable identity rejects substitution and retains the original receipt`,async()=>{
 const {s,c}=await fixture(),first=put(card);await c.change(first);
 const before=await canonical(s),beforeReceipts=await receipts(s);
 for(const other of cards.filter(value=>value!==card)){
  await assert.rejects(c.change(put(other,{itemId:first.itemId,expectedRevision:1})),{code:'INVALID_REQUEST'});
  await assert.rejects(c.change({...first,card:other}),{code:'INVALID_REQUEST'});
  await assert.rejects(c.recoverySources(recovery(put(other,{itemId:first.itemId,expectedRevision:1}))),{code:'CONTEXT_INVALIDATED'});
 }
 if(card!=='info'){
  const omitted=put(card,{itemId:first.itemId,expectedRevision:1});delete omitted.card;
  await assert.rejects(c.change(omitted),{code:'INVALID_REQUEST'});
  await assert.rejects(c.recoverySources(recovery(omitted)),{code:'CONTEXT_INVALIDATED'});
 }
 assert.deepEqual(await canonical(s),before);
 assert.deepEqual(await receipts(s),beforeReceipts);
 assert.deepEqual(await c.change(first),{ok:true,itemId:first.itemId,revision:1,lifecycle:'active',deletedBy:null});
});

test('CTX4-02 Inputs, automatic origins, protection overrides and extra fields cannot become manual Items',async()=>{
 const {s,c}=await fixture(),first=put('rules');await c.change(first);
 const before=await canonical(s),beforeReceipts=await receipts(s);
 for(const invalid of [
  {...put('inputs')}, {...put('unknown')}, {...put(null)}, {...put('')},
  {...put('rules'),origin:'automatic'}, {...put('now'),actor:'ai'},
  {...put('info'),protected:false}, {...put('rules'),userEdited:false},
  {...put('now'),sourceRecordIds:[]}, {...put('info'),provenance:{type:'automatic'}},
  {...put('rules'),automatic:true}, {...put('now'),unexpected:'SYNTHETIC field'},
  {...remove({id:first.itemId,revision:1}),card:'rules'}
 ])await assert.rejects(c.change(invalid),{code:'INVALID_REQUEST'});
 await assert.rejects(c.change({...put('rules'),kind:'automatic'}),{code:'FEATURE_UNAVAILABLE'});
 assert.deepEqual(await canonical(s),before);
 assert.deepEqual(await receipts(s),beforeReceipts);
});

for(const card of cards)test(`CTX4-02 ${card} stale edits, deletion and old undo cannot resurrect an Item`,async()=>{
 const {s,c}=await fixture(),first=put(card);await c.change(first);
 const edit=put(card,{itemId:first.itemId,expectedRevision:1,body:'SYNTHETIC current human text'});await c.change(edit);
 assert.deepEqual(await c.change(put(card,{itemId:first.itemId,expectedRevision:1,body:'SYNTHETIC stale text'})),{ok:false,conflict:true,revision:2,lifecycle:'active'});
 const deletion=remove({id:first.itemId,revision:2});await c.change(deletion);
 for(const expectedRevision of [0,1,2,3]){
  const late=put(card,{itemId:first.itemId,expectedRevision,body:'SYNTHETIC forbidden resurrection'});
  const result=await c.change(late);
  assert.equal(result.conflict,true);
  assert.equal(result.lifecycle,'removed');
  await assert.rejects(c.recoverySources(recovery(late)),{code:'CONTEXT_INVALIDATED'});
 }
 await assert.rejects(c.change(restore({id:first.itemId,revision:3},operationId())),{code:'CONTEXT_INVALIDATED'});
 const undo=restore({id:first.itemId,revision:3},deletion.operationId);await c.change(undo);
 const secondDeletion=remove({id:first.itemId,revision:4});await c.change(secondDeletion);
 assert.equal((await c.change(undo)).revision,4,'a replay acknowledges its old commit without reapplying it');
 await assert.rejects(c.change(restore({id:first.itemId,revision:5},deletion.operationId)),{code:'CONTEXT_INVALIDATED'});
 const stored=(await canonical(s)).items[0];
 assert.equal(stored.lifecycle,'removed');
 assert.equal(stored.revision,5);
 assert.equal(stored.deletedBy,secondDeletion.operationId);
 assert.equal(stored.body,edit.body);
 assert.equal(stored.card,card);
 assert.equal(stored.protected,true);
 assert.equal(stored.userEdited,true);
 assert.equal((await c.snapshot()).counts[card],0);
});

test('CTX4-02 recovery accepts source-free new and existing drafts only at their valid owner and epoch',async()=>{
 const {s,c}=await fixture();
 for(const card of cards){
  const newDraft=put(card,{body:''});
  assert.deepEqual(await c.recoverySources(recovery(newDraft)),[]);
  assert.equal(await canonical(s),undefined,'checking recovery eligibility never creates an Item');
  await assert.rejects(c.recoverySources(recovery({...newDraft,expectedRevision:1})),{code:'CONTEXT_INVALIDATED'});
  for(const sourceRecordIds of [['SYNTHETIC source id'],null,{}])assert.throws(()=>c.recoverySources(recovery(newDraft,{sourceRecordIds})),{code:'INVALID_REQUEST'});
  assert.throws(()=>c.recoverySources(recovery(newDraft,{ownerId:operationId()})),{code:'INVALID_REQUEST'});
  assert.throws(()=>c.recoverySources(recovery(newDraft,{epoch:'stale'})),{code:'CONTEXT_INVALIDATED'});
 }
 const first=put('now');await c.change(first);
 assert.deepEqual(await c.recoverySources(recovery({...first,operationId:operationId(),expectedRevision:1,body:''})),[]);
 await s.write(t=>t.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC replacement epoch'}));
 await assert.rejects(c.recoverySources(recovery(first)),{code:'CONTEXT_INVALIDATED'});
 await assert.rejects(c.change({...first,operationId:operationId(),expectedRevision:1}),{code:'CONTEXT_INVALIDATED'});
 await assert.rejects(c.outcome({operationId:first.operationId,digest:await hashText(JSON.stringify(first)),epoch:'initial'}),{code:'CONTEXT_INVALIDATED'});
 assert.equal((await canonical(s)).items[0].revision,1);
});

for(const card of cards)test(`CTX4-02 ${card} body, protection and receipt roll back atomically on storage failure`,async()=>{
 const {s,c}=await fixture(),first=put(card);await c.change(first);
 const before=await canonical(s),beforeReceipts=await receipts(s),original=s.repository.transaction.bind(s.repository);
 s.repository.transaction=(write,fn,stores)=>original(write,t=>{
  const originalPut=t.put.bind(t);
  t.put=(name,row)=>{if(name==='operationReceipts'&&row.namespace==='context-cards')throw Error('SYNTHETIC Context receipt failure');return originalPut(name,row);};
  return fn(t);
 },stores);
 const edit=put(card,{itemId:first.itemId,expectedRevision:1,body:'SYNTHETIC uncommitted body'});
 try{
  await assert.rejects(c.change(edit));
  assert.deepEqual(await canonical(s),before);
  assert.deepEqual(await receipts(s),beforeReceipts);
  assert.deepEqual(await c.outcome({operationId:edit.operationId,digest:await hashText(JSON.stringify(edit)),epoch:'initial'}),{state:'not_committed'});
 }finally{s.repository.transaction=original;}
 assert.equal((await c.change(edit)).revision,2);
});

test('CTX4-02 all cards resolve lost commit replies using exact body-free durable receipts',async()=>{
 const {s,c}=await fixture();
 for(const card of cards){
  const change=put(card),sent=[];
  const session=new ContextCommitSession(async(type,payload)=>{
   sent.push({type,payload:structuredClone(payload)});
   if(type==='PAIA_CONTEXT_CARDS_CHANGE'){await c.change(payload.change);throw Error('SYNTHETIC lost response');}
   return c.outcome(payload.query);
  });
  const result=await session.save(change);
  assert.deepEqual(result.change,change);
  assert.equal(result.result.ok,true);
  assert.equal(session.pending,null);
  assert.deepEqual(sent.map(call=>call.type),['PAIA_CONTEXT_CARDS_CHANGE','PAIA_CONTEXT_CARDS_OUTCOME']);
  assert.equal(sent[1].payload.query.digest,await hashText(JSON.stringify(change)));
  const receipt=(await receipts(s)).find(row=>row.id==='context:'+change.operationId);
  assert.equal(JSON.stringify(receipt).includes(change.body),false);
  assert.equal(JSON.stringify(receipt).includes(change.section),false);
  assert.equal((await c.snapshot()).items.find(item=>item.id===change.itemId).card,card);
 }
});

test('CTX4-02 unknown pending writes reject another card before any additional dispatch',async()=>{
 for(const card of cards)for(const other of cards.filter(value=>value!==card)){
  const first=put(card),sent=[];
  const session=new ContextCommitSession(async(type,payload)=>{sent.push({type,payload:structuredClone(payload)});throw Error('SYNTHETIC offline');});
  await assert.rejects(session.save(first));
  assert.equal(sent.length,2);
  const pending=structuredClone(session.pending);
  await assert.rejects(session.save({...first,card:other,body:'SYNTHETIC newer text'}),{code:'SAVE_PENDING_OTHER'});
  assert.equal(sent.length,2,'cross-card retry never dispatches either the old or replacement write');
  assert.deepEqual(session.pending,pending);
 }
});

test('CTX4-02 pending omitted card equals info while retries preserve exact original payload and digest',async()=>{
 for(const omittedFirst of [true,false]){
  const first=put('info');if(omittedFirst)delete first.card;
  const sent=[];let offline=true;
  const session=new ContextCommitSession(async(type,payload)=>{
   sent.push({type,payload:structuredClone(payload)});
   if(offline)throw Error('SYNTHETIC offline');
   assert.equal(type,'PAIA_CONTEXT_CARDS_CHANGE');
   return {ok:true,itemId:first.itemId,revision:1,lifecycle:'active',deletedBy:null};
  });
  await assert.rejects(session.save(first));
  const digest=await hashText(JSON.stringify(first)),next={...first,operationId:operationId(),body:'SYNTHETIC newer unsaved body'};
  if(omittedFirst)next.card='info';else delete next.card;
  assert.equal(session.pending.digest,digest);
  offline=false;
  const result=await session.save(next);
  assert.deepEqual(result.change,first,'acknowledgement must identify the original saved text');
  assert.deepEqual(sent.at(-1).payload.change,first);
  assert.equal(sent.length,3);
  assert.equal(session.pending,null);
 }
});

test('CTX4-02 pending Rules and Now writes cannot retry with legacy omitted-card identity',async()=>{
 for(const card of ['rules','now']){
  const first=put(card),next={...first};delete next.card;
  let calls=0;
  const session=new ContextCommitSession(async()=>{calls++;throw Error('SYNTHETIC offline');});
  await assert.rejects(session.save(first));
  await assert.rejects(session.save(next),{code:'SAVE_PENDING_OTHER'});
  assert.equal(calls,2);
  assert.deepEqual(session.pending.change,first);
 }
});
