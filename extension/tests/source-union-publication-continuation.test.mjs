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
async function unchangedRefusal(f,action=()=>qualify(f.c)){const before=await state(f.c),n=writes(f.cloud);await assert.rejects(action);assert.deepEqual(await state(f.c),before);assert.equal(writes(f.cloud),n);}

test('fresh local complete Source group survives cold reopen and publishes both exact original heads',async t=>{
 const f=await restored(t),original=structuredClone(f.original);await unchangedRefusal(f,()=>window(f.c,()=>requireActivatedSourceBootstrapUnion(f.c.core,{store:f.c.store})));await unchangedRefusal(f,()=>recovery(f.c,f.cloud,{restoreId:f.session.restoreId}).continueStored());
 f.c=await reopen(t,f.c);const pub=producer(f.c,f.cloud),prepared=await pub.prepare(),done=await pub.publish();assert.equal(done.ref.id,prepared.ref.id);assert.deepEqual((await manifest(f,done.ref)).parents,f.heads.map(h=>h.ref.id).sort());
 const retained=await new GroupedCheckpointRestore(f.c.core,{store:f.c.store,restoreId:f.session.restoreId}).stage.read('restore');assert.deepEqual(retained,original);
 const d=await fresh(t,'SYNTHETIC_new_installation');await recovery(d,f.cloud).recoverDiscovered();assert.equal((await d.store.snapshot()).records.length,4);assert.deepEqual((await d.store.snapshot()).records.sort((a,b)=>a.id.localeCompare(b.id)),(await f.c.store.snapshot()).records.sort((a,b)=>a.id.localeCompare(b.id)));
});
test('two local groups publish through a genuine sole common descendant retaining both original siblings',async t=>{
 const f=await restored(t,{added:0}),first=producer(f.c,f.cloud);await first.prepare();const parent=await first.publish();await source(f.c,'second_0');await source(f.c,'second_1');
 const pub=producer(f.c,f.cloud);await pub.prepare();const done=await pub.publish();assert.deepEqual((await manifest(f,done.ref)).parents,[parent.ref.id]);assert.deepEqual((await f.restore.stage.read('restore')).sourceCut,f.original.sourceCut);
 const d=await fresh(t,'SYNTHETIC_descendant_installation');await recovery(d,f.cloud).recoverDiscovered();assert.equal((await d.store.snapshot()).records.length,5);
});
test('new local groups retain evaluated original and new filter decisions without changing stable sourceCut',async t=>{
 const f=await restored(t,{added:0}),original=structuredClone(f.original.sourceCut);await new FilterRunner(f.c.store).wake();await source(f.c,'filtered_new');await new FilterRunner(f.c.store).wake();await qualify(f.c);assert.deepEqual((await f.restore.stage.read('restore')).sourceCut,original);
});
test('lost upload acknowledgement with a new local group cold resumes the same publication without duplicate POST',async t=>{
 const f=await restored(t),pub=producer(f.c,f.cloud),prepared=await pub.prepare();f.cloud.loseNextPost();await assert.rejects(pub.publish());f.c=await reopen(t,f.c);const cold=producer(f.c,f.cloud);assert.equal((await cold.status()).taskId,prepared.taskId);assert.equal((await cold.publish()).ref.id,prepared.ref.id);
 const posts=f.cloud.requests.filter(r=>r.method==='POST'),ids=posts.map(r=>new TextDecoder().decode(r.body).match(/"id":"([^"]+)"/)?.[1]);assert.equal(new Set(ids).size,ids.length);
});
for(const kind of ['plain-edit','working','append','foreign-device','same-device-remote','protected','human','context'])test('publication refuses '+kind+' and leaves all current rows untouched',async t=>{
 const f=await restored(t);
 if(kind==='plain-edit'||kind==='working'){
  if(kind==='working'){f.c.store.filterIntentJournal=new FilterIntentSyncJournal(f.c.core);f.c.store.inputWorkingJournal=new InputWorkingSyncJournal(f.c.core,{filterJournal:f.c.store.filterIntentJournal,logicalCommits:true});}
  await inputEdit(f.c.store,(await f.c.store.snapshot()).library.blocks[0].id,{note:'SYNTHETIC unrelated edit'});
 }else if(kind==='append'){const req=capture((await f.c.store.status()).epoch,'SYNTHETIC_second_message','SYNTHETIC second source');req.chat={id:'SYNTHETIC_chat_local_0',url:'https://chatgpt.com/c/SYNTHETIC_chat_local_0',title:'SYNTHETIC local_0'};await f.c.store.capture(req);}
 else if(kind==='foreign-device'||kind==='same-device-remote'){
  const foreign=await fresh(t,kind==='foreign-device'?'SYNTHETIC_foreign':f.c.core.deviceId);
  if(kind==='same-device-remote'){const cp=await buildCheckpoint(f.c.core,transport(f.c,f.cloud),{grouped:{store:f.c.store}}),owner=new StagedSyncRestore(foreign.core,{grouped:{store:foreign.store}});await owner.stageCheckpoint(cp.ref,r=>transport(foreign,f.cloud).get(r));await owner.activate();}
  await source(foreign,'remote_new');const rows=[];for await(const row of foreign.core.rows('revision'))if(row.operation.deviceId===foreign.core.deviceId&&row.operation.type==='sourceBootstrapCommit'&&row.operation.value.sourceId===(await foreign.store.snapshot()).records.find(r=>r.chatId==='SYNTHETIC_chat_remote_new').id)rows.push(row.operation);
  const descriptor=rows[0],ops=[];for await(const row of foreign.core.rows('revision'))if(descriptor.value.members.some(ref=>ref.revisionId===row.operation.revisionId))ops.push(row.operation);ops.push(descriptor);await new SourceBootstrapReceiver(f.c.store,f.c.core).receive(ops);
 }else if(kind==='protected')await new Promise((resolve,reject)=>{const tx=f.c.store.repository.db.transaction('meta','readwrite');tx.objectStore('meta').put({id:'canonical-generation:repository-protection:v1',version:1});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});else await f.c.core.transaction(true,t=>t.put(kind==='human'?'thoughts':'meta',kind==='protected'?{id:'canonical-generation:repository-protection:v1',version:1}:kind==='human'?{id:'SYNTHETIC_foreign_human',body:'SYNTHETIC user content'}:{id:'context-cards:v1',unexpected:true}));
 await unchangedRefusal(f,()=>producer(f.c,f.cloud).prepare());
});

for(const kind of ['missing-outbox','acknowledged-outbox','foreign-outbox','device-sequence','extra-device','head','generation','unknown-protocol','missing-member','old-revision','restore-device','restore-database','restore-selection','sourceCut-origin','active-origin'])test('publication refuses tampered '+kind+' provenance before any upload',async t=>{
 const f=await restored(t);await f.c.core.transaction(true,async tx=>{
  const awaitPrefix=await f.c.core.idIn(tx,'revision');const revisions=(await tx.all('meta')).filter(row=>row.id.startsWith(awaitPrefix)),local=revisions.find(row=>row.operation.deviceId===f.c.core.deviceId),old=revisions.find(row=>row.operation.deviceId!==f.c.core.deviceId);
  if(kind==='missing-outbox')await tx.delete('meta',await f.c.core.idIn(tx,'outbox',local.operation.operationId));
  else if(kind==='acknowledged-outbox')await f.c.core.put(tx,'outbox',[local.operation.operationId],{operationId:local.operation.operationId,revisionId:local.operation.revisionId,state:'sent'});
  else if(kind==='foreign-outbox')await f.c.core.put(tx,'outbox',[old.operation.operationId],{operationId:old.operation.operationId,revisionId:old.operation.revisionId,state:'queued'});
  else if(kind==='device-sequence'||kind==='extra-device')await f.c.core.put(tx,'device',[kind==='extra-device'?'SYNTHETIC_other':f.c.core.deviceId],{sequence:8});
  else if(kind==='head')await tx.delete('meta',await f.c.core.idIn(tx,'head',local.operation.type,local.operation.entityId));
  else if(kind==='generation')await f.c.core.put(tx,'generation',[],{value:29});
  else if(kind==='unknown-protocol')await f.c.core.put(tx,'unknown',[],{value:1});
  else if(kind==='missing-member')await tx.delete('meta',local.id);
  else if(kind==='old-revision')await tx.put('meta',{...old,redacted:true});
  else if(kind==='active-origin'){const row=await tx.get('meta',f.c.core.prefix+'active');row.restoreId+='_other';await tx.put('meta',row);}
  else{const row=await f.restore.stage.get(tx,'restore');if(kind==='restore-device')row.deviceId='SYNTHETIC_foreign';if(kind==='restore-database')row.databaseId='SYNTHETIC_other';if(kind==='restore-selection')row.selection.selectionId='f'.repeat(64);if(kind==='sourceCut-origin')row.sourceCut.metadata.find(x=>x.id==='thought-epoch').row={id:'thought-epoch',value:999};await tx.put('meta',row);}
 });await unchangedRefusal(f,()=>producer(f.c,f.cloud).prepare());
});
for(const kind of ['old-input-allocation','new-input-allocation','old-history-allocation','new-history-allocation','record-counter','history-counter','delta-counter','record-index','block-index','document-sequence','filter-stable','filter-runtime','extra-filter','source-count'])test('publication refuses changed '+kind+' physical state',async t=>{
 const f=await restored(t);await f.c.core.transaction(true,async tx=>{
  const oldId=f.original.sourceCut.inputStates[0].id,states=await tx.all('inputStates'),newState=states.find(x=>!f.original.sourceCut.inputStates.some(old=>old.id===x.id));
  if(kind.includes('input-allocation')){const row=await tx.get('inputStates',kind.startsWith('old')?oldId:newState.id);row.deltaSequence+=10;await tx.put('inputStates',row);}
  else if(kind.includes('history-allocation')){const histories=await tx.all('revisions'),row=kind.startsWith('old')?histories.find(x=>f.original.sourceCut.revisionAllocations.some(old=>old.id===x.id)):histories.find(x=>!f.original.sourceCut.revisionAllocations.some(old=>old.id===x.id));row.sequence+=10;row.listKey[1]=row.sequence;row.documentList[1]=row.sequence;await tx.put('revisions',row);}
  else if(['record-counter','history-counter','delta-counter'].includes(kind)){const id=kind==='record-counter'?'sequence':kind==='history-counter'?'revision-sequence':'input-delta-sequence',row=await tx.get('meta',id);if(id==='sequence')row.records++;else row.value++;await tx.put('meta',row);}
  else if(['record-index','block-index','document-sequence','source-count'].includes(kind)){const table={'record-index':'recordIndex','block-index':'blockIndex','document-sequence':'documents','source-count':'sourceCounts'}[kind],row=(await tx.all(table))[0];if(kind==='source-count')row.views=[];else row.sequence+=10;await tx.put(table,row);}
  else{const row=await tx.get('filterInputs',newState.id);if(kind==='filter-stable')row.evaluationRevision++;if(kind==='filter-runtime')row.decision='filter';if(kind==='extra-filter')row.id='SYNTHETIC_extra_filter';await tx.put('filterInputs',row);}
 });await unchangedRefusal(f);
});
test('real repeated reads and new proof share the original reference quota without renewal',async t=>{
 const f=await restored(t);let reads=0;await unchangedRefusal(f,()=>window(f.c,async()=>{await f.c.core.transaction(false,async tx=>{for(let i=0;i<3900;i++){await tx.get('meta','gate');reads++;}},['meta']);return requireSourceBootstrapUnionPublication(f.c.core,{store:f.c.store});}));assert.equal(reads,3900);await qualify(f.c);
});
test('expired original ticket cannot mint a publication continuation after held work resolves',async t=>{
 const f=await restored(t);await unchangedRefusal(f,()=>window(f.c,async()=>{await new Promise(resolve=>setTimeout(resolve,30));return requireSourceBootstrapUnionPublication(f.c.core,{store:f.c.store});},{ms:20}));
});

async function removeLocalOutbox(f){const rows=[];for await(const row of f.c.core.rows('outbox'))rows.push(row);assert.ok(rows.length);await f.c.core.transaction(true,tx=>tx.delete('meta',rows[0].id));}
for(const mutation of ['outbox','active-pointer','append'])test('private publication cut rejects '+mutation+' change after discovery before encoding',async t=>{
 const f=await restored(t),pub=producer(f.c,f.cloud);await pub.prepare();const original=LocalSyncRecoverySession.prototype.discoverPublicationParents;let changed=false;t.after(()=>LocalSyncRecoverySession.prototype.discoverPublicationParents=original);
 LocalSyncRecoverySession.prototype.discoverPublicationParents=async function(...args){const result=await original.apply(this,args);if(!changed){changed=true;if(mutation==='outbox')await removeLocalOutbox(f);else if(mutation==='active-pointer')await f.c.core.transaction(true,tx=>tx.delete('meta',f.c.core.prefix+'active'));else{const req=capture((await f.c.store.status()).epoch,'SYNTHETIC_after_proof','SYNTHETIC forbidden later append');req.chat={id:'SYNTHETIC_chat_local_0',url:'https://chatgpt.com/c/SYNTHETIC_chat_local_0',title:'SYNTHETIC local_0'};await f.c.store.capture(req);}}return result;};
 const n=writes(f.cloud);await assert.rejects(pub.publish());assert.equal(changed,true);assert.equal(writes(f.cloud),n);
});
for(const phase of ['allocated-before-post','after-first-post'])test('private complete cut rejects outbox change '+phase+' with truthful dispatched count',async t=>{
 const f=await restored(t),request=f.cloud.request;let armed=false,changed=false;
 const cloud={...f.cloud,request:async r=>{const response=await request(r),url=new URL(r.url);if(armed&&!changed&&(phase==='allocated-before-post'?r.method==='GET'&&response.status===404&&url.pathname.startsWith('/drive/v3/files/SYNTHETIC_file_'):r.method==='POST')){changed=true;await removeLocalOutbox(f);}return response;}};
 const pub=producer(f.c,cloud);await pub.prepare();const n=writes(f.cloud);armed=true;await assert.rejects(pub.publish());assert.equal(changed,true);assert.equal(writes(f.cloud)-n,phase==='after-first-post'?1:0);assert.notEqual((await pub.status()).state,'confirmed');
});

test('actual second Store protocol mutation during provider await cannot borrow first repository fence',async t=>{
 const f=await restored(t),peer=new LibraryDocumentsStore(f.c.storage,{indexedDB:f.c.factory});await peer.finishFoundation();t.after(()=>peer.repository.db?.close());const request=f.cloud.request;let armed=false,changed=false;
 const cloud={...f.cloud,request:async r=>{const response=await request(r);if(armed&&!changed&&r.method==='GET'&&response.status===404){changed=true;const rows=[];for await(const row of f.c.core.rows('outbox'))rows.push(row);await peer.repository.transaction(true,tx=>tx.delete('meta',rows[0].id));}return response;}};
 const pub=producer(f.c,cloud);await pub.prepare();const n=writes(f.cloud);armed=true;await assert.rejects(pub.publish());assert.equal(changed,true);assert.equal(writes(f.cloud),n);
});
test('actual repeated complete-cut work exhausts the unchanged outer ledger without a replacement ticket',async t=>{
 const f=await restored(t,{added:0}),first=producer(f.c,f.cloud);await first.prepare();await first.publish();await source(f.c,'budget_local_0');await source(f.c,'budget_local_1');const request=f.cloud.request;let rewrites=0;
 const cloud={...f.cloud,request:async r=>{const response=await request(r);if(r.method==='POST'){const rows=[];for await(const row of f.c.core.rows('outbox'))rows.push(row);await f.c.core.transaction(true,tx=>tx.put('meta',rows[0]));rewrites++;}return response;}};
 const pub=producer(f.c,cloud);await pub.prepare();await assert.rejects(pub.publish(),{code:'BNS_CHECKPOINT_PUBLICATION_LIMIT'});assert.ok(rewrites>0);assert.notEqual((await pub.status()).state,'confirmed');
});
test('ordinary restored union can publish one new local group before disposable stage cleanup',async t=>{
 const f=await fixture(t),session=recovery(f.c,f.cloud);await session.recoverDiscovered();await source(f.c,'uncleaned_local');const pub=producer(f.c,f.cloud);await pub.prepare();assert.equal((await pub.publish()).state,'confirmed');
});

async function uncleaned(t){const f=await fixture(t),session=recovery(f.c,f.cloud);await session.recoverDiscovered();await source(f.c,'cleanup_local');const restore=new GroupedCheckpointRestore(f.c.core,{store:f.c.store,restoreId:session.restoreId});return {...f,session,restore};}
const stageRows=(f,s)=>s.meta.filter(row=>row.id.startsWith(f.c.core.prefix+'generation:'+f.session.restoreId+':'));
test('publication prepare completes only the proven disposable stage and preserves every other physical row',async t=>{
 const f=await uncleaned(t),before=await state(f.c),original=await f.restore.stage.read('restore'),prefix=f.c.core.prefix+'generation:'+f.session.restoreId+':';assert.ok(stageRows(f,before).length>1);
 const pub=producer(f.c,f.cloud);assert.equal((await pub.prepare()).state,'prepared');const after=await state(f.c),retained=await f.restore.stage.read('restore');
 assert.deepEqual(retained,{...original,cleanup:{namespace:1,after:null,complete:true}});assert.equal(stageRows(f,after).length,1);
 for(const name of Object.keys(before))assert.deepEqual(name==='meta'?after[name].filter(r=>!r.id.startsWith(prefix)):after[name],name==='meta'?before[name].filter(r=>!r.id.startsWith(prefix)):before[name]);
 assert.equal((await pub.publish()).state,'confirmed');
});
test('publication discovery without its private prepare work remains read only',async t=>{
 const f=await uncleaned(t),before=await state(f.c),n=writes(f.cloud);await recovery(f.c,f.cloud).discoverPublicationParents();assert.deepEqual(await state(f.c),before);assert.equal(writes(f.cloud),n);
});
test('forged publication cleanup token cannot authorize the original stage owner',async t=>{
 const f=await uncleaned(t),before=await state(f.c);await assert.rejects(window(f.c,()=>f.restore.cleanup({publication:{}})),{code:'BNS_SOURCE_UNION_PROOF_REQUIRED'});assert.deepEqual(await state(f.c),before);
});
for(const kind of ['active','receipt','stage-item'])test('prepare cleanup refuses post-proof '+kind+' mutation before any deletion or upload',async t=>{
 const f=await uncleaned(t),original=GroupedCheckpointRestore.prototype.cleanup;let injected=false,afterTamper;
 GroupedCheckpointRestore.prototype.cleanup=async function(options){if(options?.publication&&!injected){injected=true;await f.c.core.transaction(true,async tx=>{if(kind==='active'){const row=await tx.get('meta',f.c.core.prefix+'active');await tx.put('meta',{...row,restoreId:'SYNTHETIC_changed_restore'});}else if(kind==='receipt'){const row=await this.stage.get(tx,'restore');await tx.put('meta',{...row,graphDigest:'0'.repeat(64)});}else{const rows=await tx.all('meta'),row=rows.find(x=>x.id.startsWith(f.c.core.prefix+'generation:'+f.session.restoreId+':')&&x.item);await tx.put('meta',{...row,item:{...row.item,unexpected:true}});}});afterTamper=await state(f.c);}return original.call(this,options);};
 t.after(()=>GroupedCheckpointRestore.prototype.cleanup=original);const n=writes(f.cloud);await assert.rejects(producer(f.c,f.cloud).prepare());assert.equal(injected,true);assert.deepEqual(await state(f.c),afterTamper);assert.equal(writes(f.cloud),n);
});
test('pause before prepare cleanup leaves the stage intact and a new explicit prepare can continue',async t=>{
 const f=await uncleaned(t),original=GroupedCheckpointRestore.prototype.cleanup,pub=producer(f.c,f.cloud),before=await state(f.c);let paused=false;
 GroupedCheckpointRestore.prototype.cleanup=async function(options){if(options?.publication&&!paused){paused=true;pub.pause();}return original.call(this,options);};
 try{await assert.rejects(pub.prepare(),{code:'BNS_CHECKPOINT_PUBLICATION_INTERRUPTED'});}finally{GroupedCheckpointRestore.prototype.cleanup=original;}assert.equal(paused,true);assert.deepEqual(await state(f.c),before);pub.resume();assert.equal((await pub.prepare()).state,'prepared');assert.equal((await pub.publish()).state,'confirmed');
});
test('a failed original cleanup page retains progress without publishing and explicit reentry completes safely',async t=>{
 const f=await uncleaned(t),original=GroupedCheckpointRestore.prototype.cleanup,old=await f.restore.stage.read('restore'),n=writes(f.cloud);let injected=false;
 GroupedCheckpointRestore.prototype.cleanup=async function(options){if(options?.publication&&!injected){injected=true;await original.call(this,{...options,limit:1});throw Object.assign(Error('synthetic cleanup interruption'),{code:'BNS_RECOVERY_INTERRUPTED'});}return original.call(this,options);};
 try{await assert.rejects(producer(f.c,f.cloud).prepare(),{code:'BNS_RECOVERY_INTERRUPTED'});}finally{GroupedCheckpointRestore.prototype.cleanup=original;}
 const partial=await f.restore.stage.read('restore');assert.equal(partial.cleanup.complete,false);assert.deepEqual(partial.receipt,old.receipt);assert.deepEqual(partial.sourceCut,old.sourceCut);assert.equal(writes(f.cloud),n);
 const pub=producer(f.c,f.cloud);assert.equal((await pub.prepare()).state,'prepared');assert.equal((await pub.publish()).state,'confirmed');
});

test('cleanup consumes the original cumulative recovery work and never renews an exhausted ticket',async t=>{
 const f=await uncleaned(t),original=GroupedCheckpointRestore.prototype.cleanup,before=await state(f.c),n=writes(f.cloud);let ticket;
 GroupedCheckpointRestore.prototype.cleanup=async function(options){if(options?.publication){ticket=currentOriginalRecoveryWork(f.c.core.repository);assert.ok(ticket);chargeOriginalRecoveryWork(f.c.core.repository,ticket,2*1024*1024);}return original.call(this,options);};
 try{await assert.rejects(producer(f.c,f.cloud).prepare(),{code:'BNS_GROUP_RESOURCE_LIMIT'});}finally{GroupedCheckpointRestore.prototype.cleanup=original;}assert.ok(ticket);assert.deepEqual(await state(f.c),before);assert.equal(writes(f.cloud),n);
});
test('publish never acquires prepare cleanup authority even when the old disposable stage reappears',async t=>{
 const f=await uncleaned(t),originalRows=stageRows(f,await state(f.c)),pub=producer(f.c,f.cloud);await pub.prepare();await f.c.core.transaction(true,async tx=>{for(const row of originalRows)await tx.put('meta',row);});const before=stageRows(f,await state(f.c)),original=GroupedCheckpointRestore.prototype.cleanup;let calls=0;
 GroupedCheckpointRestore.prototype.cleanup=async function(options){if(options?.publication)calls++;return original.call(this,options);};
 try{await assert.rejects(pub.publish(),{code:'BNS_CHECKPOINT_PUBLICATION_LIMIT'});}finally{GroupedCheckpointRestore.prototype.cleanup=original;}assert.equal(calls,0);assert.deepEqual(stageRows(f,await state(f.c)),before);assert.notEqual((await pub.status()).state,'confirmed');
});
