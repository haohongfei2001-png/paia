import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {SavedWorkSyncJournal} from '../core/browser-native-sync/saved-work-journal.js';
import {prepareSavedWorkPublication,publishSavedWorkBootstrap} from '../core/browser-native-sync/saved-work-bootstrap.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const generator={providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1};
async function make(t,id){const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.db?.close());return {s,core:new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-multiple-saved',deviceId:id})};}
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async k=>[k,await t.all(k)]))));
const semantic=x=>({thoughts:x.thoughts.map(({exactSignature,...r})=>r),provenance:x.provenance.map(({scopeToken,versionToken,...r})=>r),dependencies:x.dependencies.map(({scopeToken,versionToken,...r})=>r),revisions:x.revisions.map(({sequence,listKey,documentList,...r})=>r).sort((a,b)=>a.id.localeCompare(b.id))});
const cloud=()=>{const objects=new Map();return {async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};};
async function fixture(t){const a=await make(t,'synthetic-multi-A');a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));a.input=(await a.s.snapshot()).library.blocks[0];a.ids=[];a.anchors=[];
 for(let i=0;i<2;i++){const evidence=await a.s.evidenceFor([{inputId:a.input.id,role:'primary',selectedFields:['body']}]),entry=await a.s.createEntry({actor:'ai',operationId:crypto.randomUUID(),body:'SYNTHETIC AI artifact '+i,type:'idea',formation:'explicit',evidence,generator});a.ids.push(entry.id);await a.s.editEntry({id:entry.id,expectedRevision:0,operationId:crypto.randomUUID(),changes:{body:'SYNTHETIC protected result '+i,note:'SYNTHETIC personal note '+i}});a.anchors.push(await publishSavedWorkBootstrap(a.s,await prepareSavedWorkPublication(a.s,a.core,entry.id)));}
 const transport=cloud(),cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});return {a,transport,cut};}
async function restore(t,data,id,checkpoint=async()=>{}){const b=await make(t,id),owner=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint});await owner.stageCheckpoint(data.cut.ref,r=>data.transport.get(r));return {...b,owner};}
test('two original saved entities restore together and retain independent typed edits through cold C',async t=>{const data=await fixture(t),b=await restore(t,data,'synthetic-multi-B');await b.owner.activate();assert.deepEqual(semantic(await snapshot(b.s)),semantic(await snapshot(data.a.s)));b.s.humanLibraryJournal=new SavedWorkSyncJournal(b.core);const operations=[];
 for(const [i,id]of data.a.ids.entries()){const request={id,expectedRevision:1,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC B title '+i}};await b.s.editEntry(request);const head=await b.core.read('head','savedWorkSuccessor',id),op=(await b.core.read('revision',head.revisions[0])).operation;assert.equal(op.value.anchor,data.a.anchors[i].revisionId);assert.equal(op.value.after.entry.origin,'ai');assert.deepEqual(op.value.after.generator,generator);operations.push(op);const before=await snapshot(b.s);assert.deepEqual(await b.s.editEntry(request),{id,revision:2});assert.deepEqual(await snapshot(b.s),before);}
 const cut=await buildCheckpoint(b.core,data.transport,{grouped:{store:b.s},parents:[data.cut.ref.id]}),c=await restore(t,{...data,cut},'synthetic-multi-C');await c.owner.activate();assert.deepEqual(semantic(await snapshot(c.s)),semantic(await snapshot(b.s)));for(const op of operations){assert.equal(await c.core.read('outbox',op.operationId),undefined);assert.equal((await c.core.read('receipt',op.operationId)).digest,op.revisionId);}assert.equal((await snapshot(c.s)).thoughts.length,2);
});
const operations=async core=>{const result=[];for await(const row of core.rows('revision'))result.push(row.operation);return result;};
for(const kind of ['history','provenance','created allocation'])test('multi saved graph rejects cross-entity '+kind+' collision before destination mutation',async t=>{
 const {a}=await fixture(t),all=await operations(a.core),first=a.anchors[0],second=structuredClone(a.anchors[1]);
 if(kind==='history')second.value.payload.history[0].id=first.value.payload.history[0].id;
 if(kind==='provenance')second.value.payload.link.provenanceId=first.value.payload.link.provenanceId;
 if(kind==='created allocation')second.value.payload.entry.createdSequence=first.value.payload.entry.createdSequence;
 const forged=await sealOperation(second),before=await snapshot(a.s);await assert.rejects(prepareGroupCheckpointPlan(a.core,all.map(op=>op.revisionId===a.anchors[1].revisionId?forged:op)),{code:'BNS_SAVED_WORK_COLLISION'});assert.deepEqual(await snapshot(a.s),before);
});
test('multi saved successors cannot borrow another entity anchor or parent',async t=>{
 const data=await fixture(t),b=await restore(t,data,'synthetic-multi-B');await b.owner.activate();b.s.humanLibraryJournal=new SavedWorkSyncJournal(b.core);
 for(const id of data.a.ids)await b.s.editEntry({id,expectedRevision:1,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC independent successor'}});
 const all=await operations(b.core),successors=all.filter(op=>op.type==='savedWorkSuccessor'),op=successors[0],other=successors[1],before=await snapshot(b.s);
 for(const mutate of [o=>o.value.anchor=other.value.anchor,o=>o.parents=[other.revisionId]]){const changed=structuredClone(op);mutate(changed);const forged=await sealOperation(changed);await assert.rejects(prepareGroupCheckpointPlan(b.core,all.map(row=>row.revisionId===op.revisionId?forged:row)));assert.deepEqual(await snapshot(b.s),before);}
});
test('multi saved interleaved coalesced edits retain each real typed event through cold C',async t=>{
 const data=await fixture(t),b=await restore(t,data,'synthetic-multi-B');await b.owner.activate();b.s.humanLibraryJournal=new SavedWorkSyncJournal(b.core);
 for(const [index,revision,title]of [[0,1,'one'],[1,1,'two'],[0,2,'three'],[1,2,'four']])await b.s.editEntry({id:data.a.ids[index],expectedRevision:revision,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC '+title}});
 const all=await operations(b.core),typed=all.filter(op=>op.type==='savedWorkSuccessor');assert.equal(typed.length,4);for(const id of data.a.ids)assert.equal((await snapshot(b.s)).revisions.filter(row=>row.kind==='library_entry'&&row.entityId===id).length,3);
 const cut=await buildCheckpoint(b.core,data.transport,{grouped:{store:b.s}}),c=await restore(t,{...data,cut},'synthetic-multi-C');await c.owner.activate();assert.deepEqual(semantic(await snapshot(c.s)),semantic(await snapshot(b.s)));for(const op of typed)assert.equal((await c.core.read('receipt',op.operationId)).digest,op.revisionId);
});
test('multi saved partial member failure rolls back full scope and an explicit retry reprepares owners',async t=>{
 const data=await fixture(t);let enabled=true,savedApplied=0;const b=await restore(t,data,'synthetic-multi-B',async(name,id)=>{if(name==='applied-group'&&data.a.anchors.some(op=>op.revisionId===id)){savedApplied++;if(enabled&&savedApplied===2)throw Error('SYNTHETIC second saved failure');}}),before=await snapshot(b.s);
 await assert.rejects(b.owner.activate());assert.equal(savedApplied,2);assert.deepEqual(await snapshot(b.s),before);enabled=false;assert.equal((await b.owner.activate()).state,'activated');assert.deepEqual(semantic(await snapshot(b.s)),semantic(await snapshot(data.a.s)));
});
for(const drift of ['first Entry','second history','second receipt','thought count','global revision'])test('multi saved raw final fence rejects '+drift+' drift and rolls back every table',async t=>{
 const data=await fixture(t);let injected=false;
 const b=await restore(t,data,'synthetic-multi-B',async(name,tx)=>{if(name!=='after-activation')return;const put=tx.put.bind(tx);tx.put=async(table,row,...args)=>{const result=await put(table,row,...args);if(!injected&&table==='meta'&&row.id==='backup-data-generation'){
  const get=(store,id)=>new Promise((resolve,reject)=>{const q=store.get(id);q.onsuccess=()=>resolve(q.result);q.onerror=reject;}),meta=tx.tx.objectStore('meta'),active=await get(meta,b.core.prefix+'active'),native=tx.tx.objectStore(drift==='first Entry'||drift==='thought count'?'thoughts':drift==='second history'?'revisions':'meta'),key=drift==='first Entry'||drift==='thought count'?data.a.ids[0]:drift==='second history'?data.a.anchors[1].value.payload.history.at(-1).id:drift==='second receipt'?b.core.prefix+'generation:'+active.namespace+':receipt:'+data.a.anchors[1].operationId:'revision-sequence',old=await get(native,key);assert.ok(old);
  const changed=drift==='first Entry'?{...old,note:'SYNTHETIC unauthorized tail'}:drift==='second history'?{...old,actor:'ai'}:drift==='second receipt'?{...old,sequence:999}:drift==='thought count'?{...old,id:'synthetic-extra-entry'}:{...old,value:999};await new Promise((resolve,reject)=>{const q=native.put(changed);q.onsuccess=resolve;q.onerror=reject;});injected=true;
 }return result;};});
 const before=await snapshot(b.s);await assert.rejects(b.owner.activate());assert.equal(injected,true);assert.deepEqual(await snapshot(b.s),before);
});
test('multi saved activation remains bounded despite public metrics resets',async t=>{const data=await fixture(t);let entered=false,attempts=0;const b=await restore(t,data,'synthetic-multi-B',async(name,tx)=>{if(name!=='after-activation')return;entered=true;for(let i=0;i<4097;i++){tx.metrics.reads=0;tx.metrics.writes=0;attempts++;await tx.get('meta','synthetic-never-present');}}),before=await snapshot(b.s);await assert.rejects(b.owner.activate(),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(entered,true);assert.ok(attempts>0&&attempts<4097);assert.deepEqual(await snapshot(b.s),before);});

test('multi saved cannot borrow the original Source baseline revision identity',async t=>{const {a}=await fixture(t),all=await operations(a.core),baseline=(await snapshot(a.s)).revisions.find(row=>row.kind!=='library_entry'),changed=structuredClone(a.anchors[1]);assert.ok(baseline);changed.value.payload.history[0].id=baseline.id;const forged=await sealOperation(changed),before=await snapshot(a.s);await assert.rejects(prepareGroupCheckpointPlan(a.core,all.map(op=>op.revisionId===a.anchors[1].revisionId?forged:op)),{code:'BNS_SAVED_WORK_COLLISION'});assert.deepEqual(await snapshot(a.s),before);});
test('multi saved refuses stale shared Source instead of exporting either protected entity',async t=>{const {a,transport}=await fixture(t);await inputEdit(a.s,a.input.id,{libraryText:'SYNTHETIC replacement Source'});const before=await snapshot(a.s);await assert.rejects(buildCheckpoint(a.core,transport,{grouped:{store:a.s}}));assert.deepEqual(await snapshot(a.s),before);});
