import {assert} from './generation-purge-assert.mjs';

const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set();
function nativeOptions(options){if(options?.indexedDB!==indexedDB)throw Error('native factory binding');const name='paia-native-human-generation-matrix-'+(++sequence)+'-'+(options.name||'default');ownedNames.add(name);return {...options,name};}
function nativeStore(storage,options){const store=new LibraryDocumentsStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}



export const local = () => { const data = {}; return {async get(k) {return {[k]:structuredClone(data[k])};}, async set(v) {Object.assign(data,structuredClone(v));}}; };
export const capture = (epoch, id = 'm1-synthetic-message-001', text = 'Synthetic explicit working input') => ({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
export async function inputEdit(s,id,changes) {const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
export async function derived(s,ids,extra={}) {const evidence=await s.evidenceFor(ids.map(inputId=>({inputId,role:'primary',selectedFields:['body']})));return s.createEntry({operationId:crypto.randomUUID(),actor:'ai',body:'Synthetic conclusion',type:'judgment',formation:ids.length>1?'synthesized':'explicit',evidence,generator:{providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1},...extra});}



import {ArchiveRepository} from '../core/idb-repository.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';

import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {CanonicalGenerationPublication} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
import {CanonicalGenerationHumanRestore,requireOriginalHumanGenerationActivation,CANONICAL_HUMAN_RESTORE_STATE as STATE} from '../core/browser-native-sync/canonical-generation-human-restore.js';
import {ArchiveError} from '../core/constants.js';

const op=()=>crypto.randomUUID();
async function snapshot(store){return store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));}
async function fixture(t,{checkpoint,existingActive=false}={}){
 const factory=indexedDB,source=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-human-generation-source'});await source.consent(true);await source.finishFoundation();const sourceCore=new BrowserNativeSyncCore(source.repository,{datasetId:'synthetic_human_generation',deviceId:'synthetic_source'});source.humanLibraryJournal=new HumanLibrarySyncJournal(sourceCore);
 const a=await source.createEntry({actor:'user',body:'SYNTHETIC original A',type:'idea',formation:'explicit',evidence:[],operationId:op()});await source.editEntry({id:a.id,expectedRevision:0,changes:{note:'SYNTHETIC note A'},operationId:op()});const b=await source.createEntry({actor:'user',body:'SYNTHETIC original B',type:'idea',formation:'explicit',evidence:[],operationId:op()});const rows=new Map(),transport={async putImmutable(ref,raw){rows.set(ref.id,raw.slice());},async get(ref){return rows.get(ref.id)?.slice();}},cp=await buildCheckpoint(sourceCore,transport,{grouped:{store:source}});
 const registry=nativeRepository(local(),{indexedDB:factory,name:'SYNTHETIC-human-generation-registry'}),publication=new CanonicalGenerationPublication(registry);if(existingActive)await publishMetadata({publication,registry},t);const store=nativeStore(local(),{indexedDB:factory,name:'SYNTHETIC-human-generation-target'}),handle=await publication.attach(store.repository,{generationId:'synthetic_human_generation',databaseId:'synthetic_human_database'});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:sourceCore.datasetId,deviceId:'synthetic_receiver',namespace:'synthetic_fixed_replay'});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store,core});await stage.stageCheckpoint(cp.ref,r=>transport.get(r));const proof=await stage.validate(),restore=new CanonicalGenerationHumanRestore({store,core,checkpoint});t.after(()=>[source.repository,registry,store.repository].forEach(r=>r.db?.close()));return {source,sourceCore,store,core,registry,publication,handle,stage,proof,restore,a,b};
}
test('generation Human steps consume original actual receiver and cold-resume without publishing partial target',async t=>{
 const f=await fixture(t);const first=await f.restore.step(f.proof);assert.equal(first.state,'applying');assert.equal(first.completed,1);assert.deepEqual(await f.publication.active(),{state:'empty'});const newProof=await f.stage.validate(),next=new CanonicalGenerationHumanRestore(f);let result;do{result=await next.step(newProof);}while(result.state!=='complete');assert.equal(result.total,3);assert.equal((await f.store.entry(f.a.id)).note,'SYNTHETIC note A');assert.equal((await f.store.entry(f.b.id)).body,'SYNTHETIC original B');const before=await snapshot(f.store);assert.equal((await next.step(newProof)).state,'complete');assert.deepEqual(await snapshot(f.store),before);assert.deepEqual(await f.publication.active(),{state:'empty'});assert.equal(before.meta.filter(x=>x.id.includes(':outbox:')).length,0);
});

async function complete(f){let result;do{result=await f.restore.step(f.proof);}while(result.state!=='complete');return result;}
for(const [name,mutate]of Object.entries({
 cursor:async(t)=>{const row=await t.get('meta',STATE);await t.put('meta',{...row,cursor:row.cursor+1});},
 owner_receipt:async(t)=>{const rows=await t.primaryRangePage('operationReceipts',{limit:1});await t.delete('operationReceipts',rows.rows[0].key);},
 human_body:async(t)=>{const rows=await t.primaryRangePage('thoughts',{limit:1}),row=rows.rows[0].value;await t.put('thoughts',{...row,thoughtText:'SYNTHETIC late mutation'});},
 history:async(t)=>{const rows=await t.primaryRangePage('revisions',{limit:1}),row=rows.rows[0].value;await t.put('revisions',{...row,reason:'SYNTHETIC late reason'});},
 gate:async(t)=>{const row=await t.get('meta','canonical-generation:gate:v1');await t.put('meta',{...row,writeRevision:row.writeRevision+1});},
 extra_member:async(t)=>{await t.put('thoughts',{id:'SYNTHETIC foreign member',thoughtText:'SYNTHETIC'});},
 backup:async(t)=>{const row=await t.get('meta','backup-data-generation');await t.put('meta',{...row,value:row.value+1});},
 oversized:async(t)=>{await t.put('meta',{id:'SYNTHETIC-too-large',value:'x'.repeat(2*1024*1024)});},
 fault:async()=>{throw new ArchiveError('STORAGE_FAILED');}
}))test('generation Human rollback: '+name,async t=>{const f=await fixture(t,{checkpoint:async(phase,tx)=>{if(phase==='after-step')await mutate(tx);}}),before=await snapshot(f.store);await assert.rejects(f.restore.step(f.proof));assert.deepEqual(await snapshot(f.store),before);assert.deepEqual(await f.publication.active(),{state:'empty'});});
test('generation Human lost committed response resumes next exact group',async t=>{let once=true;const f=await fixture(t,{checkpoint:async phase=>{if(phase==='committed-step'&&once){once=false;throw new Error('SYNTHETIC lost response');}}});await assert.rejects(f.restore.step(f.proof),/lost response/);assert.equal((await f.store.repository.transaction(false,t=>t.get('meta',STATE),['meta'])).cursor,1);f.restore=new CanonicalGenerationHumanRestore(f);assert.equal((await complete(f)).completed,3);});
for(const field of ['version','index','manifestId','graphDigest','generationIdentity','sourceBase','domainOperationId'])test('generation Human final receipt rejects '+field+' drift',async t=>{const f=await fixture(t);await complete(f);await f.store.repository.transaction(true,async tx=>{const id='canonical-generation:human-step:00000000',row=await tx.get('meta',id);await tx.put('meta',{...row,[field]:field==='index'||field==='version'?99:'SYNTHETIC changed'});},['meta']);const before=await snapshot(f.store);await assert.rejects(f.restore.verify(f.proof),e=>e.code==='BNS_HUMAN_GENERATION_CURSOR');assert.deepEqual(await snapshot(f.store),before);});
test('generation Human rejects unknown protocol rows before resuming',async t=>{const f=await fixture(t);await f.restore.step(f.proof);await f.core.transaction(true,tx=>f.core.put(tx,'foreign',['x'],{x:1}),['meta']);const before=await snapshot(f.store);await assert.rejects(f.restore.step(f.proof),e=>e.code==='BNS_GROUP_COMMIT_UNPROVEN');assert.deepEqual(await snapshot(f.store),before);});
test('generation Human refuses forged checkpoint proof and paused original collection',async t=>{const f=await fixture(t),before=await snapshot(f.store);await assert.rejects(f.restore.step({}));assert.deepEqual(await snapshot(f.store),before);await f.store.setEnabled(false);const revoked=await snapshot(f.store);await assert.rejects(f.restore.step(f.proof));assert.deepEqual(await snapshot(f.store),revoked);});
test('generation Human fixed original activation requires completed prepared original restore',async t=>{const f=await fixture(t);await assert.rejects(f.core.transaction(true,tx=>requireOriginalHumanGenerationActivation(f.restore,f.proof,tx)));await complete(f);const ready=await f.restore.preparePublication(f.proof);const proof=await f.core.transaction(true,tx=>requireOriginalHumanGenerationActivation(f.restore,f.proof,tx));assert.equal(proof.manifestId,ready.manifestId);assert.equal(proof.graphDigest,ready.graphDigest);await assert.rejects(f.core.transaction(true,tx=>requireOriginalHumanGenerationActivation({...f.restore},f.proof,tx)));});

test('generation Human pinned Core device identity cannot change during continuation',async t=>{const f=await fixture(t),before=await snapshot(f.store);f.core.deviceId='synthetic_changed_device';await assert.rejects(f.restore.step(f.proof),e=>e.code==='BNS_HUMAN_GENERATION_SCOPE');assert.deepEqual(await snapshot(f.store),before);});


test('fixed Human publication seals only the actual complete canonical target and recovers first registry',async t=>{
 const f=await fixture(t);await complete(f);await f.restore.preparePublication(f.proof);const seal=await f.publication.sealOriginalHumanCheckpoint(f.handle,f.restore,f.proof),operationId=op();await f.publication.reserve(seal,operationId);const result=await f.publication.recover();assert.equal(result.state,'committed');const active=await f.publication.active();assert.equal(active.identity.generationId,'synthetic_human_generation');assert.equal((await f.store.entry(f.a.id)).note,'SYNTHETIC note A');assert.equal((await f.store.entry(f.b.id)).body,'SYNTHETIC original B');
});
for(const mode of ['incomplete','unprepared','foreign restore','wrong owner route'])test('fixed Human publication refuses '+mode+' without canonical or gate writes',async t=>{
 const f=await fixture(t);if(mode!=='incomplete')await complete(f);if(mode==='foreign restore'||mode==='wrong owner route')await f.restore.preparePublication(f.proof);const before=await snapshot(f.store),registry=await f.publication.active();await assert.rejects(mode==='wrong owner route'?f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof):f.publication.sealOriginalHumanCheckpoint(f.handle,mode==='foreign restore'?{...f.restore}:f.restore,f.proof));assert.deepEqual(await snapshot(f.store),before);assert.deepEqual(await f.publication.active(),registry);
});
test('fixed Human publication rechecks original canonical facts after preparation',async t=>{
 const f=await fixture(t);await complete(f);await f.restore.preparePublication(f.proof);await f.store.repository.transaction(true,async tx=>{const row=await tx.get('thoughts',f.a.id);await tx.put('thoughts',{...row,thoughtText:'SYNTHETIC changed after preparation'});});const before=await snapshot(f.store);await assert.rejects(f.publication.sealOriginalHumanCheckpoint(f.handle,f.restore,f.proof));assert.deepEqual(await snapshot(f.store),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
test('fixed Human publication terminal fence rolls back late physical mutation and sealed gate together',async t=>{
 const f=await fixture(t);await complete(f);await f.restore.preparePublication(f.proof);const before=await snapshot(f.store),transaction=f.store.repository.transaction;let injected=false;
 f.store.repository.transaction=function(write,fn,...args){return transaction.call(this,write,async tx=>{const result=await fn(tx);if(write&&!injected){const native=tx.tx.objectStore('thoughts'),old=await new Promise((resolve,reject)=>{const q=native.get(f.a.id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});await new Promise((resolve,reject)=>{const q=native.put({...old,thoughtText:'SYNTHETIC late native mutation'});q.onsuccess=resolve;q.onerror=()=>reject(q.error);});injected=true;}return result;},...args);};
 try{await assert.rejects(f.publication.sealOriginalHumanCheckpoint(f.handle,f.restore,f.proof));assert.equal(injected,true);}finally{f.store.repository.transaction=transaction;}assert.deepEqual(await snapshot(f.store),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});

async function publishMetadata(f,t){
 const repository=nativeRepository(local(),{indexedDB:f.registry.factory,name:'SYNTHETIC-human-existing-active'}),handle=await f.publication.attach(repository,{generationId:'synthetic_prior_generation',databaseId:'synthetic_prior_database'});t.after(()=>repository.db?.close());const seal=await f.publication.seal(handle,{sealId:'synthetic_prior_seal',manifestId:'a'.repeat(64),graphDigest:'b'.repeat(64)});await f.publication.reserve(seal,'synthetic_prior_publication');await f.publication.recover();return f.publication.active();
}
test('fixed Human publication refuses an authenticated existing-active base without migration owner',async t=>{
 const f=await fixture(t,{existingActive:true});await complete(f);await f.restore.preparePublication(f.proof);const before=await snapshot(f.store),active=await f.publication.active(),registry=await f.registry.transaction(false,tx=>tx.all('meta'),['meta']);await assert.rejects(f.publication.sealOriginalHumanCheckpoint(f.handle,f.restore,f.proof),{code:'GENERATION_EXISTING_SOURCE_OWNER_REQUIRED'});assert.deepEqual(await snapshot(f.store),before);assert.deepEqual(await f.publication.active(),active);assert.deepEqual(await f.registry.transaction(false,tx=>tx.all('meta'),['meta']),registry);
});
for(const timing of ['before seal','before reserve'])test('fixed Human publication cannot refresh source base changed '+timing,async t=>{
 const f=await fixture(t);await complete(f);await f.restore.preparePublication(f.proof);const seal=timing==='before reserve'?await f.publication.sealOriginalHumanCheckpoint(f.handle,f.restore,f.proof):null;const active=await publishMetadata(f,t),before=await snapshot(f.store),registry=await f.registry.transaction(false,tx=>tx.all('meta'),['meta']);await assert.rejects(seal?f.publication.reserve(seal,'synthetic_later_publish'):f.publication.sealOriginalHumanCheckpoint(f.handle,f.restore,f.proof),{code:'GENERATION_CHANGED'});assert.deepEqual(await snapshot(f.store),before);assert.deepEqual(await f.publication.active(),active);assert.deepEqual(await f.registry.transaction(false,tx=>tx.all('meta'),['meta']),registry);
});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=="human-generation-matrix")return previous.run(command,...args);
 const passed=[];
 for(const item of cases){const after=[];let failure;
  try{await item.fn({after(fn){if(typeof fn!=='function')throw Error('native after');after.push(fn);}});passed.push(item.name);}
  catch(error){failure=Error(item.name+': '+error.stack);}
  finally{
   for(const fn of after.reverse())try{await fn();}catch(error){failure??=error;}
   for(const repository of repositories.splice(0))try{await repository.close();}catch(error){failure??=error;}
   for(const name of ownedNames){try{await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('native cleanup blocked'));});}catch(error){failure??=error;}}ownedNames.clear();
  }
  if(failure)throw failure;
 }
 return passed;
}};
