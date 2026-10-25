import {createOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork,currentOriginalRecoveryWork,chargeOriginalRecoveryWork} from '../core/idb-repository.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {LocalSyncRecoverySession} from '../core/browser-native-sync/recovery-session.js';
import {RecoverableCheckpointPublication} from '../core/browser-native-sync/checkpoint-publication.js';
import {GoogleDriveAppDataTransport,GOOGLE_APPDATA_SCOPE} from '../core/browser-native-sync/providers/google-drive.js';
import {readObject} from '../core/browser-native-sync/segments.js';
import {fakeGoogleCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='SYNTHETIC_union_runtime',binding={subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:[GOOGLE_APPDATA_SCOPE]};
async function fresh(t,deviceId,{storage=local()}={}){const factory=new IDBFactory(),store=new LibraryDocumentsStore(storage,{indexedDB:factory});await store.consent(true);await store.finishFoundation();t.after(()=>store.repository.db?.close());const core=new BrowserNativeSyncCore(store.repository,{datasetId,deviceId});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);return {store,core,storage,factory};}
async function reopen(t,f){const deviceId=f.core.deviceId;await f.store.repository.close();const store=new LibraryDocumentsStore(f.storage,{indexedDB:f.factory});await store.finishFoundation();t.after(()=>store.repository.db?.close());const core=new BrowserNativeSyncCore(store.repository,{datasetId,deviceId});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);return {...f,store,core};}
async function source(f,name){const request=capture((await f.store.status()).epoch,'SYNTHETIC_message_'+name,'SYNTHETIC exact '+name+' 中文🙂');request.chat={id:'SYNTHETIC_chat_'+name,url:'https://chatgpt.com/c/SYNTHETIC_chat_'+name,title:'SYNTHETIC '+name};await f.store.capture(request);}
async function appendSource(f,chatName,name,{time=null,order=2}={}){const request=capture((await f.store.status()).epoch,'SYNTHETIC_append_'+name,'SYNTHETIC exact append '+name+' 中文🙂');request.chat={id:'SYNTHETIC_chat_'+chatName,url:'https://chatgpt.com/c/SYNTHETIC_chat_'+chatName,title:'SYNTHETIC '+chatName};request.messages[0].pageOrder=order;if(time!==null)request.messages[0].sourceTime={state:'valid',createTime:time,updateTime:null};await f.store.capture(request);}
const transport=(f,cloud)=>new GoogleDriveAppDataTransport(f.core,{binding,request:cloud.request,isCurrent:()=>true});
const producer=(f,cloud)=>new RecoverableCheckpointPublication(f.core,{store:f.store,binding:{...binding,provider:'google-drive-appdata'},request:cloud.request,isCurrent:()=>true});
const recovery=(f,cloud,options={})=>new LocalSyncRecoverySession(f.core,{store:f.store,transport:transport(f,cloud),...options});
const canonical=f=>f.store.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all([...tx.tx.objectStoreNames].filter(k=>k!=='meta').map(async k=>[k,await tx.all(k)]))));
const writes=cloud=>cloud.requests.filter(r=>['POST','PUT'].includes(r.method)).length;
async function fixture(t,{receiverStorage}={}){const cloud=fakeGoogleCheckpointHTTP(binding),seed=await fresh(t,'SYNTHETIC_seed');await source(seed,'ancestor');const ancestor=await buildCheckpoint(seed.core,transport(seed,cloud),{grouped:{store:seed.store}}),heads=[];
 for(const name of ['left','right']){const f=await fresh(t,'SYNTHETIC_'+name);const owner=new StagedSyncRestore(f.core,{grouped:{store:f.store}});await owner.stageCheckpoint(ancestor.ref,ref=>transport(f,cloud).get(ref));await owner.activate();await source(f,name);heads.push(await buildCheckpoint(f.core,transport(f,cloud),{grouped:{store:f.store},parents:[ancestor.ref.id]}));}
 return {cloud,seed,ancestor,heads,c:await fresh(t,'SYNTHETIC_receiver',receiverStorage?{storage:receiverStorage}:{})};}

import {GroupedCheckpointRestore,requireActivatedSourceBootstrapUnion,requireSourceBootstrapUnionPublication} from '../core/browser-native-sync/group-checkpoint.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {SourceBootstrapReceiver} from '../core/browser-native-sync/source-bootstrap-receive.js';
import {FilterRunner} from '../core/filter-runner.js';
const state=f=>f.store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
async function window(f,fn,options){const ticket=createOriginalRecoveryWork(f.core.repository,options);try{return await withOriginalRecoveryWork(f.core.repository,ticket,()=>fn(ticket));}finally{finishOriginalRecoveryWork(f.core.repository,ticket);}}
const qualify=f=>window(f,()=>requireSourceBootstrapUnionPublication(f.core,{store:f.store}));
async function restored(t,{added=1}={}){const f=await fixture(t),session=recovery(f.c,f.cloud);await session.recoverDiscovered();const restore=new GroupedCheckpointRestore(f.c.core,{store:f.c.store,restoreId:session.restoreId});while(!(await window(f.c,()=>restore.cleanup())).complete){}const original=await restore.stage.read('restore');for(let i=0;i<added;i++)await source(f.c,'local_'+i);return {...f,session,restore,original};}
async function manifest(f,ref){return JSON.parse(new TextDecoder().decode(await readObject(ref,r=>transport(f.c,f.cloud).get(r))));}
async function unchangedRefusal(f,code,action=()=>qualify(f.c)){const before=await state(f.c),n=writes(f.cloud);await assert.rejects(action,{code});assert.deepEqual(await state(f.c),before);assert.equal(writes(f.cloud),n);}

async function twoWorking(t){
 const f=await restored(t,{added:0}),before=await state(f.c),inputs=(await f.c.store.snapshot()).library.blocks;assert.equal(inputs.length,3);
 f.c.store.filterIntentJournal=new FilterIntentSyncJournal(f.c.core);f.c.store.inputWorkingJournal=new InputWorkingSyncJournal(f.c.core,{filterJournal:f.c.store.filterIntentJournal,logicalCommits:true});
 for(const [n,input]of inputs.slice(0,2).entries())await inputEdit(f.c.store,input.id,{note:'SYNTHETIC separate Input '+n});
 return {...f,before,ids:inputs.map(row=>row.id)};
}
let resourceStopped=false;
for(const kind of ['coalesced-2+1','allocated-2+1','three-inputs'])test('retained Working tail '+kind+' publishes exact history and cold restores',async t=>{
 if(resourceStopped){t.skip('Earlier original-budget failure; no further positive execution');return;}
 try{
  const f=await twoWorking(t),first=(await state(f.c)).revisions.find(row=>row.entityId===f.ids[0]&&row.reason!=='baseline');assert.ok(first);
  f.c.store.clock=()=>new Date(Date.parse(first.at)+(kind==='allocated-2+1'?120000:1000)).toISOString();
  await inputEdit(f.c.store,f.ids[kind==='three-inputs'?2:0],{note:'SYNTHETIC third ordered Working intent '+kind});
  const expected=await state(f.c),sort=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id)),history=rows=>sort(rows.map(({sequence,listKey,documentList,...row})=>row));
  assert.deepEqual(expected.records,f.before.records);assert.equal(expected.revisions.length,kind==='coalesced-2+1'?5:6);
  const row=(rows,id)=>rows.find(x=>x.id===id),counter=(snapshot,id)=>{const stored=row(snapshot.meta,id);if(id==='thought-epoch'&&!stored)return 0;assert.ok(stored);return stored.value;};
  assert.equal(counter(expected,'revision-sequence'),kind==='coalesced-2+1'?5:6);
  assert.equal(counter(expected,'input-delta-sequence'),counter(f.before,'input-delta-sequence')+3);
  assert.equal(counter(expected,'thought-epoch'),counter(f.before,'thought-epoch')+3);
  const events=expected.invalidations.slice().sort((a,b)=>a.sequence-b.sequence);assert.deepEqual(events.map(x=>x.inputId),[f.ids[0],f.ids[1],f.ids[kind==='three-inputs'?2:0]]);
  assert.deepEqual(events.map(x=>x.contentRevision),kind==='three-inputs'?[1,1,1]:[1,1,2]);assert.equal(expected.operationReceipts.length,3);
  if(kind!=='three-inputs')for(const name of ['blocks','inputStates','filterInputs'])assert.deepEqual(row(expected[name],f.ids[2]),row(f.before[name],f.ids[2]));
  const last=expected.revisions.filter(x=>x.entityId===f.ids[0]&&x.reason!=='baseline');assert.equal(last.length,kind==='allocated-2+1'?2:1);
  if(kind==='coalesced-2+1'){assert.equal(last[0].id,first.id);assert.equal(last[0].sequence,first.sequence);assert.notEqual(first.sequence,counter(expected,'revision-sequence'));}
  if(kind==='allocated-2+1')assert.equal(Math.max(...last.map(x=>x.sequence)),counter(expected,'revision-sequence'));
  f.c=await reopen(t,f.c);const pub=producer(f.c,f.cloud),prepared=await pub.prepare(),done=await pub.publish();assert.equal(done.state,'confirmed');assert.equal(done.ref.id,prepared.ref.id);assert.deepEqual((await manifest(f,done.ref)).parents,f.heads.map(h=>h.ref.id).sort());
  const d=await fresh(t,'SYNTHETIC_tail_installation_'+kind.replaceAll('+','_'));await recovery(d,f.cloud).recoverDiscovered();const cold=await reopen(t,d),actual=await state(cold);
  assert.deepEqual(sort(actual.records.map(r=>r.value)),sort(expected.records.map(r=>r.value)));assert.deepEqual(sort(actual.blocks.map(r=>r.value)),sort(expected.blocks.map(r=>r.value)));assert.deepEqual(history(actual.revisions),history(expected.revisions));assert.deepEqual(sort(actual.filterIntents),sort(expected.filterIntents));assert.deepEqual(actual.times,expected.times);assert.deepEqual((await f.restore.stage.read('restore')).sourceCut,f.original.sourceCut);
 }catch(error){if(/LIMIT|BOUND|TIMEOUT/.test(error?.code??''))resourceStopped=true;throw error;}
});
