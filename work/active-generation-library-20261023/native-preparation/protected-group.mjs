import {assert} from './generation-purge-assert.mjs';

const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set();
function nativeOptions(options){if(options?.indexedDB!==indexedDB)throw Error('native factory binding');const name=ownedNames.has(options.name)?options.name:'paia-native-protected-group-matrix-'+(++sequence)+'-'+(options.name||'default');ownedNames.add(name);return {...options,name};}
function nativeStore(storage,options){const store=new LibraryDocumentsStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}



export const local = () => { const data = {}; return {async get(k) {return {[k]:structuredClone(data[k])};}, async set(v) {Object.assign(data,structuredClone(v));}}; };
export const capture = (epoch, id = 'm1-synthetic-message-001', text = 'Synthetic explicit working input') => ({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
export async function inputEdit(s,id,changes) {const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
export async function derived(s,ids,extra={}) {const evidence=await s.evidenceFor(ids.map(inputId=>({inputId,role:'primary',selectedFields:['body']})));return s.createEntry({operationId:crypto.randomUUID(),actor:'ai',body:'Synthetic conclusion',type:'judgment',formation:ids.length>1?'synthesized':'explicit',evidence,generator:{providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1},...extra});}




import {ArchiveRepository} from '../core/idb-repository.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';

import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {buildGroupedCheckpoint,GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
import {CanonicalGenerationPublication,CANONICAL_GENERATION_GATE as GATE} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
import {STORAGE_KEY} from '../core/constants.js';

const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async k=>[k,await t.all(k)]))));
async function fixture(t,options={}){
 const factory=indexedDB,storage=local(),registry=nativeRepository(local(),{indexedDB:factory,name:'SYNTHETIC-generation-registry'}),publication=new CanonicalGenerationPublication(registry);
 if(options.existingActive){
  const old=nativeRepository(local(),{indexedDB:factory,name:'SYNTHETIC-existing-active'}),oldHandle=await publication.attach(old,{generationId:'generation_existing',databaseId:'database_existing'});
  t.after(()=>old.db?.close());
  // Metadata infrastructure only: this does not grant graph qualification.
  const oldSeal=await publication.seal(oldHandle,{sealId:'synthetic_old_seal',manifestId:'a'.repeat(64),graphDigest:'b'.repeat(64)});
  await publication.reserve(oldSeal,'synthetic_old_publication');await publication.recover();
 }
 const b=nativeStore(storage,{indexedDB:factory,name:'SYNTHETIC-shadow-target'}),handle=await publication.attach(b.repository,{generationId:'generation_target',databaseId:'database_target'});
 await b.consent(true);await b.finishFoundation();
 const a=nativeStore(local(),{indexedDB:indexedDB,localPublicationTerminal:true});await a.consent(true);await a.finishFoundation();
 t.after(()=>{for(const r of [registry,a.repository,b.repository])r.db?.close();});
 const coreA=new BrowserNativeSyncCore(a.repository,{datasetId:'synthetic-generation-restore',deviceId:'synthetic_A'}),coreB=new BrowserNativeSyncCore(b.repository,{datasetId:'synthetic-generation-restore',deviceId:'synthetic_B'});
 a.sourceBootstrapJournal=new SourceBootstrapJournal(coreA);await a.capture(capture((await a.status()).epoch));
 if(options.consumerPreference){a.consumerPreferenceJournal=new ConsumerPreferenceSyncJournal(coreA);await a.updatePreferences({appearance:'dark'});}
 const objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildGroupedCheckpoint(coreA,transport,{store:a});
 const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store:b,core:coreB,protectRepository:true});if(!options.deferStage)await stage.stageCheckpoint(cut.ref,ref=>transport.get(ref));const proof=options.deferStage?null:await stage.validate();
 const restore=new GroupedCheckpointRestore(coreB,{store:b,restoreId:'synthetic_owner_restore',...options});
 return {a,b,coreA,coreB,registry,publication,handle,stage,proof,restore,transport,cut,storage};
}

test('protected original group consumes actual Source owner and publishes qualified canonical state',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);assert.equal((await f.b.snapshot()).records.length,0);await f.restore.activate();assert.deepEqual((await f.b.snapshot()).records,(await f.a.snapshot()).records);await f.restore.prepareCanonicalGenerationPublication(f.proof);const seal=await f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof);await f.publication.reserve(seal,'synthetic_protected_group');assert.equal((await f.publication.recover()).state,'committed');assert.equal((await f.publication.active()).state,'active');});

const denied={code:'GENERATION_REPOSITORY_WRITE_DENIED'},MARKER='canonical-generation:repository-protection:v1';
async function rawMeta(f,mutate){const tx=f.b.repository.db.transaction(['meta'],'readwrite'),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});mutate(tx.objectStore('meta'));await done;}
test('protected group cold resume rebinds original proof and never duplicates canonical application',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const cold=new GroupedCheckpointRestore(f.coreB,{store:f.b,restoreId:f.restore.restoreId}),before=await snapshot(f.b);await assert.rejects(cold.activate(),{code:'BNS_GENERATION_PROOF_REQUIRED'});assert.deepEqual(await snapshot(f.b),before);const proof=await f.stage.validate();await cold.stageCanonicalGeneration(proof);assert.equal((await cold.activate()).state,'activated');const after=await snapshot(f.b);assert.equal((await cold.activate()).state,'activated');assert.deepEqual(await snapshot(f.b),after);});
test('protected group never lends a transaction to custom diagnostic callback',async t=>{let invoked=false;const f=await fixture(t,{checkpoint:async()=>{invoked=true;}}),before=await snapshot(f.b);await assert.rejects(f.restore.stageCanonicalGeneration(f.proof),denied);assert.equal(invoked,false);assert.deepEqual(await snapshot(f.b),before);});
test('protected group cannot acquire genuine authority using forged or foreign proof',async t=>{const f=await fixture(t),before=await snapshot(f.b);await assert.rejects(f.restore.stageCanonicalGeneration({}));const foreign=new GroupedCheckpointRestore(f.coreA,{store:f.a,restoreId:'synthetic_foreign'});await assert.rejects(foreign.stageCanonicalGeneration(f.proof));assert.deepEqual(await snapshot(f.b),before);});
test('protected group keeps token away from mutable repository and Core transaction wrappers',async t=>{const f=await fixture(t);let called=0;const original=f.b.repository.transaction.bind(f.b.repository);f.b.repository.transaction=(write,...args)=>{if(write){called++;throw Error('SYNTHETIC external wrapper');}return original(write,...args);};f.restore.stage.transaction=(write,...args)=>{if(write){called++;throw Error('SYNTHETIC external stage wrapper');}return BrowserNativeSyncCore.prototype.transaction.call(f.restore.stage,write,...args);};f.coreB.transaction=(write,...args)=>{if(write){called++;throw Error('SYNTHETIC external live wrapper');}return BrowserNativeSyncCore.prototype.transaction.call(f.coreB,write,...args);};await f.restore.stageCanonicalGeneration(f.proof);await f.restore.activate();assert.equal(called,0);});
for(const defect of ['gate-phase','checkpoint-item','consent','restore-row','purge-deny'])test('protected original group refuses '+defect+' drift without partial owner writes',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const receipt=await f.restore.stage.read('restore'),key=defect==='gate-phase'?GATE:defect==='checkpoint-item'?'canonical-generation:checkpoint:item:00000000':defect==='consent'?'gate':receipt.id;const row=await f.b.repository.transaction(false,t=>t.get('meta',key),['meta']);await rawMeta(f,s=>{if(defect==='purge-deny')s.put({id:f.coreB.prefix+'sourcePurgeDeny:synthetic',value:true});else s.put(defect==='gate-phase'?{...row,phase:'retired'}:defect==='consent'?{...row,enabled:false}:{...row,syntheticTamper:true});});const before=await snapshot(f.b);await assert.rejects(f.restore.activate());assert.deepEqual(await snapshot(f.b),before);assert.equal((await f.b.snapshot()).records.length,0);});

// A native request-boundary fault, outside any supplied consumer callback. It
// changes the same physical TX only after the original owner and snapshot have
// finished. The two gate reads are final proof then repository settlement.
function tailFault(f,{table,key,change}){
 const probe=f.b.repository.db.transaction(['meta'],'readonly').objectStore('meta'),proto=Object.getPrototypeOf(probe),originalGet=proto.get,originalPut=proto.put;
 let armed=false,reads=0,injected=false;
 proto.put=function(value,...rest){if(this.transaction.db===f.b.repository.db&&value?.id===f.coreB.prefix+'active')armed=true;return originalPut.call(this,value,...rest);};
 proto.get=function(wanted){const request=originalGet.call(this,wanted);if(this.transaction.db===f.b.repository.db&&this.transaction.mode==='readwrite'&&armed&&this.name==='meta'&&wanted===GATE&&++reads===2){request.addEventListener('success',()=>{const victim=this.transaction.objectStore(table),read=originalGet.call(victim,key);read.addEventListener('success',()=>{assert.ok(read.result);originalPut.call(victim,change(read.result));injected=true;});});}return request;};
 return {restore(){proto.get=originalGet;proto.put=originalPut;},injected:()=>injected};
}
for(const victim of ['canonical','restore-receipt','checkpoint-item','protection','gate'])test('protected group native terminal '+victim+' drift rolls back original owner and receipt',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const receipt=await f.restore.stage.read('restore'),source=await f.a.repository.transaction(false,t=>t.primaryRangePage('blocks',{limit:1}),['blocks']),table=victim==='canonical'?'blocks':'meta',key=victim==='canonical'?source.rows[0].key:victim==='restore-receipt'?receipt.id:victim==='checkpoint-item'?'canonical-generation:checkpoint:item:00000000':victim==='protection'?MARKER:GATE,before=await snapshot(f.b),fault=tailFault(f,{table,key,change:row=>({...row,syntheticTamper:true})});
 try{await assert.rejects(f.restore.activate());assert.equal(fault.injected(),true);}finally{fault.restore();}assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
test('protected original graph seal retains existing-active migration refusal',async t=>{const f=await fixture(t,{existingActive:true});await f.restore.stageCanonicalGeneration(f.proof);await f.restore.activate();await f.restore.prepareCanonicalGenerationPublication(f.proof);const before=await snapshot(f.b),active=await f.publication.active();await assert.rejects(f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof),{code:'GENERATION_EXISTING_SOURCE_OWNER_REQUIRED'});assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),active);});
for(const [surface,name]of [['stage','put'],['coreB','get'],['b','applyInitialSource'],['b','control']])test('protected group refuses substituted '+surface+'.'+name+' before lending a write transaction',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const target=surface==='stage'?f.restore.stage:f[surface],original=target[name];let writeEntered=false;target[name]=function(tx,...args){if(tx?.tx?.mode==='readwrite')writeEntered=true;return original.call(this,tx,...args);};const before=await snapshot(f.b);await assert.rejects(f.restore.activate(),denied);assert.equal(writeEntered,false);delete target[name];assert.deepEqual(await snapshot(f.b),before);});
test('protected group descriptor guard refuses an owner method getter without executing it',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);let called=false;Object.defineProperty(f.b,'applyInitialSource',{configurable:true,get(){called=true;throw Error('SYNTHETIC getter');}});const before=await snapshot(f.b);await assert.rejects(f.restore.activate(),denied);assert.equal(called,false);delete f.b.applyInitialSource;assert.deepEqual(await snapshot(f.b),before);});
test('protected group rejects a shadowing prototype method before write authority',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const prototype=Object.getPrototypeOf(f.b);assert.equal(Object.hasOwn(prototype,'applyInitialSource'),false);let called=false;Object.defineProperty(prototype,'applyInitialSource',{configurable:true,value:()=>{called=true;}});try{await assert.rejects(f.restore.activate(),denied);assert.equal(called,false);}finally{delete prototype.applyInitialSource;}});
test('protected group restore field getter cannot rebind the private original consumer',async t=>{const f=await fixture(t);let called=false;Object.defineProperty(f.restore,'store',{configurable:true,get(){called=true;return f.b;}});await assert.rejects(f.restore.stageCanonicalGeneration(f.proof),{code:'BNS_GENERATION_PROOF_REQUIRED'});assert.equal(called,false);});
test('protected group cold resume rejects extra durable restore fields',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const state=await f.restore.stage.read('restore');await rawMeta(f,s=>s.put({...state,syntheticInjected:true}));const proof=await f.stage.validate(),before=await snapshot(f.b),cold=new GroupedCheckpointRestore(f.coreB,{store:f.b,restoreId:f.restore.restoreId});await assert.rejects(cold.stageCanonicalGeneration(proof),{code:'BNS_RESTORE_ID_COLLISION'});assert.deepEqual(await snapshot(f.b),before);});
test('protected group native owner failure rolls back and fresh explicit retry reuses original graph',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const before=await snapshot(f.b),probe=f.b.repository.db.transaction(['blocks'],'readonly').objectStore('blocks'),prototype=Object.getPrototypeOf(probe),original=prototype.put;let injected=false;prototype.put=function(value,...args){if(!injected&&this.transaction.db===f.b.repository.db&&this.name==='blocks'&&this.transaction.mode==='readwrite'){injected=true;this.transaction.abort();}return original.call(this,value,...args);};try{await assert.rejects(f.restore.activate());assert.equal(injected,true);}finally{prototype.put=original;}assert.deepEqual(await snapshot(f.b),before);assert.equal((await f.restore.activate()).state,'activated');assert.deepEqual((await f.b.snapshot()).records,(await f.a.snapshot()).records);});
test('protected fixed group publication refuses substituted original consumer methods before write callback',async t=>{const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);await f.restore.activate();await f.restore.prepareCanonicalGenerationPublication(f.proof);let entered=false;const original=f.b.control;f.b.control=function(tx,...args){if(tx?.tx?.mode==='readwrite')entered=true;return original.call(this,tx,...args);};const before=await snapshot(f.b);await assert.rejects(f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof),denied);assert.equal(entered,false);delete f.b.control;assert.deepEqual(await snapshot(f.b),before);});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=="protected-group-matrix")return previous.run(command,...args);
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
