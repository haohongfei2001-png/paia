import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {createOriginalRecoveryWork,chargeOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork} from '../core/idb-repository.js';
import {prepareSourceBootstrapUnion,prepareStoredSourceBootstrapUnion,readSourceBootstrapUnionProof,requireSourceBootstrapUnionProof,assertSourceBootstrapUnionSelection,createSourceBootstrapUnionSelection} from '../core/browser-native-sync/source-bootstrap-union.js';
globalThis.IDBKeyRange=IDBKeyRange;
const DATASET='SYNTHETIC_source_union';
async function fresh(t,device,ids=[]){const s=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory(),uuid:()=>ids.shift()??crypto.randomUUID()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.db?.close());const core=new BrowserNativeSyncCore(s.repository,{datasetId:DATASET,deviceId:device});s.sourceBootstrapJournal=new SourceBootstrapJournal(core);return {s,core};}
async function source(s,chat,body=chat,message=chat){const q=capture((await s.status()).epoch,message,'SYNTHETIC '+body+' 中文\nexact');q.chat={id:chat,url:'https://chatgpt.com/c/'+chat,title:'SYNTHETIC '+chat};await s.capture(q);}
const cloud=()=>{const objects=new Map();return {objects,async putImmutable(ref,raw){const old=objects.get(ref.id);if(old)assert.deepEqual(old,raw);objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};};
const all=s=>s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all([...tx.tx.objectStoreNames].map(async table=>[table,await tx.all(table)]))));
async function work(target,fn,{refs=0,length=0,ms=30000}={}){const ticket=createOriginalRecoveryWork(target.core.repository,{ms});try{if(refs||length)chargeOriginalRecoveryWork(target.core.repository,ticket,length,refs);return await withOriginalRecoveryWork(target.core.repository,ticket,()=>fn(ticket));}finally{finishOriginalRecoveryWork(target.core.repository,ticket);}}
async function fixture(t,{sameConversation=false,sameDevice=false,working=false,collision=null}={}){
 const ids=[],transport=cloud(),a=await fresh(t,'SYNTHETIC_union_ancestor'),left=await fresh(t,'SYNTHETIC_union_left'),right=await fresh(t,sameDevice?'SYNTHETIC_union_left':'SYNTHETIC_union_right',ids),target=await fresh(t,'SYNTHETIC_union_target');
 await source(a.s,'SYNTHETIC_base');const ancestor=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});
 for(const peer of [left,right]){const restore=new StagedSyncRestore(peer.core,{grouped:{store:peer.s}});await restore.stageCheckpoint(ancestor.ref,transport.get);await restore.activate();}
 await source(left.s,'SYNTHETIC_left','left','left_message');
 const record=(await left.s.snapshot()).records.find(row=>row.chatId==='SYNTHETIC_left');
 if(['source','document','input'].includes(collision))ids.push(record.id,crypto.randomUUID());
 if(collision==='baseline'){const rows=await left.s.repository.transaction(false,t=>t.all('revisions'));ids.push(crypto.randomUUID(),rows.find(row=>row.sourceRecordIds.includes(record.id)).id);}
 const sameIdentity=['sourceKey','dedupeKey'].includes(collision);
 await source(right.s,sameConversation||sameIdentity?'SYNTHETIC_left':'SYNTHETIC_right',collision==='dedupeKey'?'left':'right',sameIdentity?'left_message':'right_message');
 if(working){right.s.filterIntentJournal=new FilterIntentSyncJournal(right.core);right.s.inputWorkingJournal=new InputWorkingSyncJournal(right.core,{filterJournal:right.s.filterIntentJournal,logicalCommits:true});await inputEdit(right.s,(await right.s.snapshot()).library.blocks[0].id,{note:'SYNTHETIC forbidden Working'});}
 const heads=[];for(const peer of [left,right])heads.push(await buildCheckpoint(peer.core,transport,{grouped:{store:peer.s},parents:[ancestor.ref.id]}));
 return {a,left,right,target,transport,ancestor,heads,prepare:()=>prepareSourceBootstrapUnion(target.core,{store:target.s,ancestorRef:ancestor.ref,headRefs:heads.map(h=>h.ref),get:transport.get})};
}
test('two genuine disjoint Source cuts produce a local proof, exact union and no writes',async t=>{
 const f=await fixture(t),before=await all(f.target.s),packet=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));
 assert.equal(packet.operations.length,21);assert.equal(packet.operations.filter(op=>op.type==='sourceBootstrapCommit').length,3);assert.equal(packet.frontiers.length,3);assert.equal(packet.cuts.length,3);assert.deepEqual(packet.deltaGroups.map(g=>g.length),[1,1]);assert.equal(packet.selection.kind,'source-bootstrap-union');assert.equal(packet.selection.id,undefined);assert.equal(packet.selection.manifestId,undefined);
 assert.equal(packet.receipt.cuts.every(cut=>cut.items.filter(item=>item.kind==='revision').every(item=>Object.keys(item).sort().join(',')==='kind,revisionId')),true);assert.equal(JSON.stringify(packet.receipt).includes('originalText'),false);assert.equal(packet.ownerScope.families.find(f=>f.type==='records').count,3);assert.equal(packet.plan,undefined);assert.equal(packet.canonical,undefined);assert.deepEqual(await all(f.target.s),before);
 const originals=[];for(const peer of [f.a,f.left,f.right])for await(const row of peer.core.rows('revision'))originals.push(row.operation);
 for(const operation of packet.operations)assert.deepEqual(operation,originals.find(old=>old.revisionId===operation.revisionId));
});
test('listing/head order does not choose a winner or change local selection identity',async t=>{
 const f=await fixture(t),first=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));
 f.heads.reverse();const second=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));assert.deepEqual(second.selection,first.selection);assert.deepEqual(second.operations,first.operations);assert.equal(second.graphDigest,first.graphDigest);
});
test('body-free receipt reauthenticates original cuts on a new ticket without transport',async t=>{
 const f=await fixture(t),packet=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));
 f.transport.objects.clear();const copy=structuredClone(packet.receipt),operations=structuredClone(packet.operations);
 const cold=await work(f.target,async()=>readSourceBootstrapUnionProof(await prepareStoredSourceBootstrapUnion(f.target.core,{store:f.target.s,receipt:copy,operations}),{core:f.target.core,store:f.target.s}));assert.deepEqual(cold.receipt,packet.receipt);assert.deepEqual(cold.operations,packet.operations);assert.deepEqual(cold.frontiers,packet.frontiers);
});
test('opaque proof is bound to original Core, Store and the same work ticket',async t=>{
 const f=await fixture(t);let proof;await work(f.target,async()=>{proof=await f.prepare();assert.throws(()=>readSourceBootstrapUnionProof({}, {core:f.target.core,store:f.target.s}),{code:'BNS_SOURCE_UNION_PROOF_REQUIRED'});assert.throws(()=>readSourceBootstrapUnionProof(proof,{core:f.left.core,store:f.left.s}),{code:'BNS_SOURCE_UNION_PROOF_REQUIRED'});});
 await assert.rejects(f.prepare(),{code:'BNS_SOURCE_UNION_WORK_REQUIRED'});await work(f.target,async()=>assert.throws(()=>readSourceBootstrapUnionProof(proof,{core:f.target.core,store:f.target.s}),{code:'BNS_SOURCE_UNION_PROOF_REQUIRED'}));
});
for(const option of ['sameConversation','sameDevice','working'])test('original union refuses '+option+' without changing destination',async t=>{const f=await fixture(t,{[option]:true}),before=await all(f.target.s);await assert.rejects(work(f.target,f.prepare));assert.deepEqual(await all(f.target.s),before);});
test('a valid authenticated head cannot claim a parent whose operations it dropped',async t=>{
 const f=await fixture(t),unrelated=await fresh(t,'SYNTHETIC_union_unrelated');await source(unrelated.s,'SYNTHETIC_unrelated');f.heads[1]=await buildCheckpoint(unrelated.core,f.transport,{grouped:{store:unrelated.s},parents:[f.ancestor.ref.id]});const before=await all(f.target.s);await assert.rejects(work(f.target,f.prepare),{code:'BNS_SOURCE_UNION_ANCESTRY'});assert.deepEqual(await all(f.target.s),before);
});
test('empty head delta and non-direct parent remain refused',async t=>{
 for(const mode of ['empty','indirect']){const f=await fixture(t),manifest={...(mode==='empty'?f.ancestor.manifest:f.heads[1].manifest),parents:[mode==='empty'?f.ancestor.ref.id:f.heads[0].ref.id]},object=await protocolObject('checkpoint-manifest',bytes(manifest));await f.transport.putImmutable(object.ref,object.bytes);f.heads[1]={ref:object.ref,manifest};await assert.rejects(work(f.target,f.prepare),{code:'BNS_SOURCE_UNION_ANCESTRY'});}
});
test('corrupt or missing actual checkpoint bytes are not repaired from decoded claims',async t=>{
 for(const mode of ['missing','corrupt']){const f=await fixture(t),ref=f.heads[0].ref;if(mode==='missing')f.transport.objects.delete(ref.id);else{const raw=f.transport.objects.get(ref.id).slice();raw[0]^=1;f.transport.objects.set(ref.id,raw);}await assert.rejects(work(f.target,f.prepare),{code:'BNS_OBJECT_INTEGRITY'});}
});
test('stored receipt refuses changed manifest bytes, reordered evidence, missing or extra operations',async t=>{
 const f=await fixture(t),packet=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));
 for(const mode of ['bytes','order','missing','extra','digest']){const receipt=structuredClone(packet.receipt),operations=structuredClone(packet.operations);if(mode==='bytes')receipt.cuts[1].manifestEncoded='A'+receipt.cuts[1].manifestEncoded.slice(1);if(mode==='order')receipt.cuts[1].items.reverse();if(mode==='missing')operations.pop();if(mode==='extra')operations.push(operations[0]);if(mode==='digest')receipt.graphDigest='f'.repeat(64);await assert.rejects(work(f.target,()=>prepareStoredSourceBootstrapUnion(f.target.core,{store:f.target.s,receipt,operations})));}
});
test('selection refuses duplicates, sparse arrays, extra fields and forged identity',async t=>{
 const f=await fixture(t),packet=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));
 for(const mode of ['duplicate','sparse','extra','digest']){const selection=structuredClone(packet.selection);if(mode==='duplicate')selection.headRefs[1]=selection.headRefs[0];if(mode==='sparse')delete selection.headRefs[0];if(mode==='extra')selection.manifestId=f.ancestor.ref.id;if(mode==='digest')selection.selectionId='f'.repeat(64);await assert.rejects(work(f.target,()=>prepareSourceBootstrapUnion(f.target.core,{store:f.target.s,selection,get:f.transport.get})));}
 assert.equal(assertSourceBootstrapUnionSelection(packet.selection),true);
});
test('all cuts consume the same original reference and byte budgets',async t=>{
 const f=await fixture(t);for(const options of [{refs:4095},{length:2*1024*1024-1}]){let gets=0;await assert.rejects(work(f.target,()=>prepareSourceBootstrapUnion(f.target.core,{store:f.target.s,ancestorRef:f.ancestor.ref,headRefs:f.heads.map(h=>h.ref),get:async ref=>{gets++;return f.transport.get(ref);}}),options),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(gets,0);}
});
test('original ticket expiry during transport cannot produce a late union proof',async t=>{
 const f=await fixture(t);let gets=0;await assert.rejects(work(f.target,()=>prepareSourceBootstrapUnion(f.target.core,{store:f.target.s,ancestorRef:f.ancestor.ref,headRefs:f.heads.map(h=>h.ref),get:async ref=>{gets++;await new Promise(resolve=>setTimeout(resolve,25));return f.transport.get(ref);}}),{ms:15}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(gets,1);
});
test('selection is explicitly local and contains both original parents only',async t=>{
 const f=await fixture(t),selection=await work(f.target,()=>createSourceBootstrapUnionSelection(f.target.core,{store:f.target.s,ancestorRef:f.ancestor.ref,headRefs:f.heads.map(h=>h.ref)}));assert.deepEqual(selection.headRefs.map(r=>r.id).sort(),f.heads.map(h=>h.ref.id).sort());assert.equal(selection.ancestorRef.id,f.ancestor.ref.id);assert.equal(selection.datasetId,DATASET);assert.equal(selection.kind==='checkpoint-manifest',false);
});
for(const collision of ['source','sourceKey','dedupeKey','document','input','baseline'])test('union refuses original '+collision+' identity collision across independently valid heads',async t=>{const f=await fixture(t,{collision}),before=await all(f.target.s);await assert.rejects(work(f.target,f.prepare));assert.deepEqual(await all(f.target.s),before);});
test('selection and receipt getters are refused without executing them',async t=>{
 const f=await fixture(t),packet=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));let calls=0;
 const selection=structuredClone(packet.selection);Object.defineProperty(selection.headRefs[0],'id',{enumerable:true,get(){calls++;return packet.selection.headRefs[0].id;}});
 await assert.rejects(work(f.target,()=>prepareSourceBootstrapUnion(f.target.core,{store:f.target.s,selection,get:f.transport.get})),{code:'BNS_SOURCE_UNION_INVALID'});
 const receipt=structuredClone(packet.receipt);Object.defineProperty(receipt.cuts[0],'items',{enumerable:true,get(){calls++;return [];}});
 await assert.rejects(work(f.target,()=>prepareStoredSourceBootstrapUnion(f.target.core,{store:f.target.s,receipt,operations:packet.operations})),{code:'BNS_SOURCE_UNION_INVALID'});assert.equal(calls,0);
});
test('caller mutation after entry cannot replace the snapshotted selection or operations',async t=>{
 const f=await fixture(t),packet=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));
 await work(f.target,async()=>{const selection=structuredClone(packet.selection),pending=prepareSourceBootstrapUnion(f.target.core,{store:f.target.s,selection,get:f.transport.get});selection.headRefs[0].id='f'.repeat(64);assert.deepEqual(readSourceBootstrapUnionProof(await pending,{core:f.target.core,store:f.target.s}).selection,packet.selection);});
 await work(f.target,async()=>{const operations=structuredClone(packet.operations),receipt=structuredClone(packet.receipt),pending=prepareStoredSourceBootstrapUnion(f.target.core,{store:f.target.s,receipt,operations});operations[0].revisionId='f'.repeat(64);receipt.cuts.length=0;assert.deepEqual(readSourceBootstrapUnionProof(await pending,{core:f.target.core,store:f.target.s}).operations,packet.operations);});
});
test('read proof exposes frozen data but no prepared Source capability or branded plan',async t=>{
 const f=await fixture(t),packet=await work(f.target,async()=>readSourceBootstrapUnionProof(await f.prepare(),{core:f.target.core,store:f.target.s}));
 assert.deepEqual(Object.keys(packet).sort(),['selection','receipt','operations','items','heads','frontiers','ownerScope','graphDigest','deltaGroups','cuts'].sort());
 const visit=value=>{if(!value||typeof value!=='object')return;assert.equal(Object.isFrozen(value),true);for(const key of Object.keys(value)){assert.notEqual(key,'capability');assert.notEqual(key,'prepared');visit(value[key]);}};visit(packet);assert.throws(()=>packet.operations.pop(),TypeError);
});
test('changed restore epoch during real transport invalidates the whole proof',async t=>{
 const f=await fixture(t);let changed=false;await assert.rejects(work(f.target,()=>prepareSourceBootstrapUnion(f.target.core,{store:f.target.s,ancestorRef:f.ancestor.ref,headRefs:f.heads.map(h=>h.ref),get:async ref=>{if(!changed){changed=true;await f.target.core.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()}),['meta']);}return f.transport.get(ref);}})),{code:'BNS_RESTORE_LOCAL_CHANGED'});
});
test('original transactional proof assertion detects a same-ticket epoch change',async t=>{
 const f=await fixture(t);await assert.rejects(work(f.target,async()=>{const proof=await f.prepare();await f.target.core.transaction(false,t=>requireSourceBootstrapUnionProof(proof,{core:f.target.core,store:f.target.s},t),['meta']);await f.target.core.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()}),['meta']);await f.target.core.transaction(false,t=>requireSourceBootstrapUnionProof(proof,{core:f.target.core,store:f.target.s},t),['meta']);}),{code:'BNS_RESTORE_LOCAL_CHANGED'});
});
test('caller replacement of original Source validator cannot mint a proof',async t=>{
 const f=await fixture(t);let calls=0;f.target.core.prepareSourceBootstrapReceive=()=>{calls++;throw Error('must not execute replacement');};await assert.rejects(work(f.target,f.prepare),{code:'GENERATION_REPOSITORY_WRITE_DENIED'});assert.equal(calls,0);
});
