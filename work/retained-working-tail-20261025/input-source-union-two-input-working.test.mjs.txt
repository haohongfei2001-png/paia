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
test('two retained Inputs each original Working edit publish and cold restore both exact histories',async t=>{
 const f=await twoWorking(t),expected=await state(f.c);assert.deepEqual(expected.records,f.before.records);assert.equal(expected.revisions.length,5);
 const unedited=f.ids[2];for(const name of ['blocks','inputStates','filterInputs'])assert.deepEqual(expected[name].find(row=>row.id===unedited),f.before[name].find(row=>row.id===unedited));
 for(const id of f.ids.slice(0,2))assert.equal((await f.c.store.input(id)).revision,1);
 f.c=await reopen(t,f.c);const pub=producer(f.c,f.cloud),prepared=await pub.prepare(),done=await pub.publish();assert.equal(done.state,'confirmed');assert.equal(done.ref.id,prepared.ref.id);assert.deepEqual((await manifest(f,done.ref)).parents,f.heads.map(h=>h.ref.id).sort());
 const d=await fresh(t,'SYNTHETIC_two_input_installation');await recovery(d,f.cloud).recoverDiscovered();const cold=await reopen(t,d),actual=await state(cold),sort=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id)),history=rows=>sort(rows.map(({sequence,listKey,documentList,...row})=>row));
 assert.deepEqual(sort(actual.records.map(r=>r.value)),sort(expected.records.map(r=>r.value)));assert.deepEqual(sort(actual.blocks.map(r=>r.value)),sort(expected.blocks.map(r=>r.value)));assert.deepEqual(history(actual.revisions),history(expected.revisions));assert.deepEqual(sort(actual.filterIntents),sort(expected.filterIntents));assert.deepEqual(actual.times,expected.times);assert.deepEqual((await f.restore.stage.read('restore')).sourceCut,f.original.sourceCut);
});

for(const kind of ['source-ref','working-owner','working-history-owner','history-input','global-revision','global-delta','event-input','receipt-owner','unedited-input'])test('two Input Working refuses '+kind+' without publication writes or further row changes',async t=>{
 const f=await twoWorking(t),[a,b,c]=f.ids;
 await f.c.core.transaction(true,async tx=>{
  if(kind==='source-ref'){const row=await tx.get('inputStates',a),other=await tx.get('inputStates',b);await tx.put('inputStates',{...row,sourceRecordIds:other.sourceRecordIds});}
  else if(kind==='working-owner'){const row=await f.c.core.get(tx,'workingOwner',a),other=await f.c.core.get(tx,'workingOwner',b);await tx.put('meta',{...row,revisionId:other.revisionId});}
  else if(kind==='working-history-owner'){const rows=await tx.all('revisions'),ha=rows.find(r=>r.entityId===a&&r.reason!=='baseline'),hb=rows.find(r=>r.entityId===b&&r.reason!=='baseline'),row=await f.c.core.get(tx,'workingHistory',ha.id),other=await f.c.core.get(tx,'workingHistory',hb.id);assert.ok(row&&other);await tx.put('meta',{...row,revisionId:other.revisionId});}
  else if(kind==='history-input'){const row=(await tx.all('revisions')).find(r=>r.entityId===a&&r.reason!=='baseline');assert.ok(row);await tx.put('revisions',{...row,entityId:b,entityKey:'input:'+b});}
  else if(kind==='global-revision'||kind==='global-delta'){const row=await tx.get('meta',kind==='global-revision'?'revision-sequence':'input-delta-sequence');await tx.put('meta',{...row,value:row.value-1});}
  else if(kind==='event-input'){const row=(await tx.all('invalidations')).find(r=>r.inputId===a);assert.ok(row);await tx.put('invalidations',{...row,inputId:b});}
  else if(kind==='receipt-owner'){const row=(await tx.all('operationReceipts')).find(r=>r.ownerId===(f.before.blocks.find(x=>x.id===a).value.documentId));assert.ok(row);await tx.put('operationReceipts',{...row,ownerId:f.before.blocks.find(x=>x.id===b).value.documentId});}
  else{const row=await tx.get('blocks',c);await tx.put('blocks',{...row,value:{...row.value,note:'SYNTHETIC unjournaled third input'}});}
 });
 const code=['working-owner','working-history-owner'].includes(kind)?'BNS_GROUP_COMMIT_UNPROVEN':['source-ref','history-input','unedited-input'].includes(kind)?'BNS_GROUP_CANONICAL_UNREPRESENTED':'BNS_SOURCE_UNION_CONTINUATION_INVALID';
 await unchangedRefusal(f,code,()=>producer(f.c,f.cloud).prepare());
});
for(const kind of ['third-input-delta','repeat-input-parent'])test('retained Working tail refuses '+kind,async t=>{
 const f=await twoWorking(t);await inputEdit(f.c.store,f.ids[kind==='third-input-delta'?2:0],{note:'SYNTHETIC next genuine edit'});
 await f.c.core.transaction(true,async tx=>{
  if(kind==='third-input-delta'){const row=await tx.get('meta','input-delta-sequence');await tx.put('meta',{...row,value:row.value-1});}
  else{const prefix=await f.c.core.idIn(tx,'revision'),rows=(await tx.all('meta')).filter(row=>row.id.startsWith(prefix)&&row.operation.type==='inputWorkingMember'),row=rows.find(row=>row.operation.value.entityType==='input'&&row.operation.parents.length);assert.ok(row);const foreign=rows.find(other=>other.operation.value.entityType==='input'&&other.operation.value.entity.id!==row.operation.value.entity.id);assert.ok(foreign);row.operation.parents=[foreign.operation.revisionId];await tx.put('meta',row);}
 });
 await unchangedRefusal(f,kind==='third-input-delta'?'BNS_SOURCE_UNION_CONTINUATION_INVALID':'BNS_OPERATION_DIGEST',()=>producer(f.c,f.cloud).prepare());
});
