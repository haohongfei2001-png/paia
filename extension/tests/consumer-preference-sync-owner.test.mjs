import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {CODECS,CANDIDATE_CODECS,projectEntity,validateEntity,validateCoverage} from '../core/browser-native-sync/codecs.js';
import {CODECS as originalReaderCodecs,validateCoverage as originalReaderCoverage} from './fixtures/source-append-old-reader/extension/core/browser-native-sync/codecs.js';
import {consumerPreferenceRenderingValue} from '../core/browser-native-sync/consumer-preference-codec.js';
import {PreparedPublicationJournal} from '../core/browser-native-sync/publications.js';
import {defaults,applyPreferenceChanges} from '../core/workspace.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {STORAGE_KEY} from '../core/constants.js';
import {ConsumerPreferenceSyncJournal,CONSUMER_OWNER_PREFIX} from '../core/browser-native-sync/consumer-preference-journal.js';
import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from '../core/local-control-publication.js';
globalThis.IDBKeyRange=IDBKeyRange;
const value=(id='appearance',choice='dark',explicit=true)=>({id,value:choice,explicit});
async function device(){const repository=new ArchiveRepository({}, {indexedDB:new IDBFactory(),name:'SYNTHETIC-consumer-preference-v2',thoughtLibrary:true,ia:true,smartFilter:true});await repository.open();return new BrowserNativeSyncCore(repository,{datasetId:'dataset_synthetic_pref',deviceId:'device_synthetic_pref'});}
const op=(data,extra={})=>sealOperation({protocol:1,datasetId:'dataset_synthetic_pref',deviceId:'device_synthetic_remote',sequence:1,operationId:crypto.randomUUID(),type:'consumerPreference',entityId:data?.id||'appearance',codecVersion:2,kind:'put',actor:'user',parents:[],value:data,...extra});
test('version dispatch preserves every existing registered version and refuses the old reader before restoration',async()=>{
 assert.equal(CODECS.consumerPreference.version,2);assert.equal(CANDIDATE_CODECS.consumerPreference.version,1);
 for(const [type,codec]of Object.entries(CODECS))if(type!=='consumerPreference')assert.equal(codec.version,1);
 const core=await device();try{const prepared=await core.prepare([{type:'consumerPreference',value:value()}]);assert.equal(prepared.operations[0].codecVersion,2);assert.deepEqual(projectEntity('consumerPreference',value()),value());assert.throws(()=>validateEntity('consumerPreference',value(),1),{code:'BNS_CODEC_UNSUPPORTED'});
 const required=[{type:'consumerPreference',version:2,count:1}];assert.equal(validateCoverage(required),true);assert.throws(()=>originalReaderCoverage(required,Object.fromEntries(Object.entries(originalReaderCodecs).map(([id,c])=>[id,c.version]))),{code:'BNS_REQUIRED_CODEC_UNSUPPORTED'});assert.deepEqual(await core.state(),[]);
 }finally{core.repository.db.close();}
});
test('an unknown historical baseline is bootstrap only; real user selection including the default remains explicit',async()=>{
 const baseline=value('appearance','dark',null);assert.equal((await op(baseline,{actor:'bootstrap'})).value.explicit,null);
 for(const [data,extra]of [[baseline,{}],[value(),{actor:'bootstrap'}],[baseline,{actor:'bootstrap',parents:['a'.repeat(64)]}],[value(),{kind:'purge',value:null}]])await assert.rejects(op(data,extra),e=>['BNS_CONSUMER_PREFERENCE_AUTHORITY','BNS_BOOTSTRAP_AUTHORITY'].includes(e.code));
 const settings=defaults();assert.deepEqual(applyPreferenceChanges(settings,{appearance:settings.appearance}),{ok:true});assert.equal((await op(value('appearance',settings.appearance))).value.explicit,true);
});
test('baseline bootstrap cannot replace an existing explicit head or consume a sequence',async()=>{
 const core=await device();try{const explicit=await core.prepare([{type:'consumerPreference',value:value()}]);await core.commit(explicit);const before=await core.state(),sequence=await core.read('device',core.deviceId);
 await assert.rejects(core.prepare([{type:'consumerPreference',value:value('appearance','light',null),expectedParents:[]}],{actor:'bootstrap'}),{code:'BNS_HEAD_CHANGED'});
 await assert.rejects(core.prepare([{type:'consumerPreference',value:value('appearance','light',null),parents:[]}],{actor:'bootstrap'}),{code:'BNS_BOOTSTRAP_EXISTS'});assert.deepEqual(await core.state(),before);assert.deepEqual(await core.read('device',core.deviceId),sequence);
 }finally{core.repository.db.close();}
});
test('unsupported display intent remains exact with a rendering fallback; Smart Filter modes and authority fields stay restricted',()=>{
 const future=value('readingWidth','future_display_width',null),before=structuredClone(future);assert.deepEqual(projectEntity('consumerPreference',future),before);assert.equal(consumerPreferenceRenderingValue(future),defaults().readingWidth);assert.deepEqual(future,before);
 assert.equal(consumerPreferenceRenderingValue(value('smartFilter','off')),'off');assert.throws(()=>validateEntity('consumerPreference',value('smartFilter','future_mode'),2),{code:'BNS_CODEC_UNSUPPORTED'});
 for(const id of ['autoSave','aiEnabled','aiOrganizeStyle','sidebarCollapsed','hideContentPreviews','captureConsent','globalContextGrant'])assert.throws(()=>validateEntity('consumerPreference',value(id,'enabled'),2),{code:'BNS_CODEC_INVALID'});
 assert.throws(()=>validateEntity('consumerPreference',{...value(),explicit:false},2),{code:'BNS_CODEC_INVALID'});assert.throws(()=>validateEntity('consumerPreference',{...value(),permission:true},2),{code:'BNS_CODEC_INVALID'});
});

const pendingId='bns:consumer-preference-publication:pending';
const putPending=core=>core.repository.transaction(true,t=>t.put('meta',{id:pendingId,version:1,namespace:'initial',state:'SYNTHETIC-unsettled'}),['meta']);
const queued=async core=>{const rows=[];for await(const operation of core.outbox())rows.push(operation);return rows;};
async function queuedPreference(core){const prepared=await core.prepare([{type:'consumerPreference',value:value()}]);await core.commit(prepared);return prepared.operations[0];}
test('unsettled portable publication blocks Core yielding and acknowledgement across a namespace switch',async()=>{
 const core=await device();try{const operation=await queuedPreference(core);await putPending(core);
 await assert.rejects(queued(core),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});await assert.rejects(core.acknowledge(operation.operationId,operation.revisionId),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});assert.ok(await core.read('outbox',operation.operationId));
 await core.repository.transaction(true,t=>t.put('meta',{id:core.prefix+'active',namespace:'SYNTHETIC-new-namespace'}),['meta']);await assert.rejects(queued(core),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});
 }finally{core.repository.db.close();}
});
test('direct prepared-publication selection cannot bypass the portable pending barrier',async()=>{
 const core=await device();try{const operation=await queuedPreference(core);await putPending(core);const journal=new PreparedPublicationJournal(core);
 await assert.rejects(journal.prepare({publicationId:'SYNTHETIC-unsettled-cut'}),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});assert.equal(await core.read('publication','SYNTHETIC-unsettled-cut'),undefined);assert.ok(await core.read('outbox',operation.operationId));assert.ok(await core.repository.transaction(false,t=>t.get('meta',pendingId),['meta']));
 }finally{core.repository.db.close();}
});
test('an already reserved portable cut refuses upload until visibility is settled; exact retry retains its queue',async()=>{
 const core=await device();try{const operation=await queuedPreference(core),journal=new PreparedPublicationJournal(core),prepared=await journal.prepare(),before=await core.read('publication',prepared.publicationId);await putPending(core);let puts=0;const objects=new Map(),transport={async putImmutable(ref,data){puts++;objects.set(ref.id,data.slice());},async get(ref){return objects.get(ref.id);}};
 await assert.rejects(journal.run(prepared.publicationId,transport),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});assert.equal(puts,0);assert.deepEqual(await core.read('publication',prepared.publicationId),before);assert.ok(await core.read('outbox',operation.operationId));assert.equal(await core.read('publicationReceipt',prepared.publicationId),undefined);
 await core.repository.transaction(true,t=>t.delete('meta',pendingId),['meta']);assert.equal((await journal.run(prepared.publicationId,transport)).state,'confirmed');assert.ok(puts>0);assert.equal(await core.read('outbox',operation.operationId),undefined);
 }finally{core.repository.db.close();}
});

for(const stage of ['publication-before-ack','publication-after-ack'])test('same-transaction '+stage+' visibility failure rolls back acknowledgement and permits exact retry',async()=>{
 const core=await device();try{const operation=await queuedPreference(core);let injected=true;const journal=new PreparedPublicationJournal(core,{checkpoint:async(name,t)=>{if(name===stage&&injected)await t.put('meta',{id:pendingId,version:1,state:'SYNTHETIC-pending-at-ack'});}}),prepared=await journal.prepare(),objects=new Map(),transport={async putImmutable(ref,data){objects.set(ref.id,data.slice());},async get(ref){return objects.get(ref.id);}};
 await assert.rejects(journal.run(prepared.publicationId,transport),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});assert.ok(await core.read('outbox',operation.operationId));assert.equal(await core.read('publicationReceipt',prepared.publicationId),undefined);assert.notEqual((await core.read('publication',prepared.publicationId)).state,'confirmed');assert.equal(await core.repository.transaction(false,t=>t.get('meta',pendingId),['meta']),undefined,'the original failed transaction rolls back its injected visibility state too');
 injected=false;assert.equal((await journal.run(prepared.publicationId,transport)).state,'confirmed');assert.equal(await core.read('outbox',operation.operationId),undefined);
 }finally{core.repository.db.close();}
});

async function originalPreferenceFixture(t){
 const data={},indexedDB=new IDBFactory(),name='SYNTHETIC-consumer-original-'+crypto.randomUUID();let setHook=null,sets=0;
 const local={async get(key){return {[key]:structuredClone(data[key])};},async set(value){sets++;if(setHook)await setHook(value);Object.assign(data,structuredClone(value));}};
 const store=new LibraryDocumentsStore(local,{indexedDB,name});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'dataset_synthetic_preferences',deviceId:'device_synthetic_preferences'}),journal=new ConsumerPreferenceSyncJournal(core);store.consumerPreferenceJournal=journal;
 t.after(()=>store.repository.db?.close());return {data,local,indexedDB,name,store,core,journal,sets:()=>sets,setHook:fn=>{setHook=fn;},rows:()=>store.repository.transaction(false,async tx=>{const out={};for(const name of store.repository.stores)out[name]=await tx.all(name);return out;}),meta:id=>store.repository.transaction(false,tx=>tx.get('meta',id),['meta'])};
}
test('the original display writer commits exact explicit intent, genuine outbox and portable pending before one actual local publication',async t=>{
 const f=await originalPreferenceFixture(t),before=structuredClone(f.data[STORAGE_KEY]),sets=f.sets();let seen;
 f.setHook(async()=>{seen=await f.meta(pendingId);assert.equal(seen.operations.length,2);assert.ok(await f.meta(CONTROL_PUBLICATION_RESERVATION));await assert.rejects(queued(f.core),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});for(const ref of seen.operations)assert.equal((await f.core.read('outbox',ref.operationId)).revisionId,ref.revisionId);});
 assert.deepEqual(await f.store.updatePreferences({appearance:'dark',language:'en'}),{ok:true});assert.equal(f.sets(),sets+1);assert.equal(await f.meta(pendingId),undefined);assert.equal(await f.meta(CONTROL_PUBLICATION_RESERVATION),undefined);const expected=structuredClone(before);Object.assign(expected.preferences,{appearance:'dark',language:'en'});assert.deepEqual(f.data[STORAGE_KEY],expected,'only the original display fields changed; all authority stays local');
 const operations=await queued(f.core);assert.equal(operations.length,2);for(const operation of operations){assert.equal(operation.actor,'user');assert.equal(operation.value.explicit,true);assert.equal(operation.codecVersion,2);const owner=await f.meta(CONSUMER_OWNER_PREFIX+operation.entityId);assert.deepEqual(owner.intent,operation.value);assert.equal(owner.revision,1);assert.equal((await f.core.repository.transaction(false,tx=>f.core.materializedOwner(tx,'consumerPreference',operation.entityId),['meta'])).ownerRevision,owner.revision);}
});
test('selecting a display default is a genuine explicit operation; fresh untouched defaults bootstrap no history',async t=>{
 const f=await originalPreferenceFixture(t);assert.deepEqual(await f.journal.bootstrap(f.store),{count:0});assert.deepEqual(await f.core.state(),[]);assert.deepEqual(await f.store.updatePreferences({appearance:defaults().appearance}),{ok:true});const operations=await queued(f.core);assert.equal(operations.length,1);assert.deepEqual(operations[0].value,value('appearance',defaults().appearance,true));
});
test('existing nondefault original preferences bootstrap with unknown explicitness without publishing or changing local authority',async t=>{
 const f=await originalPreferenceFixture(t);f.store.consumerPreferenceJournal=null;await f.store.updatePreferences({appearance:'dark',language:'en'});f.store.consumerPreferenceJournal=f.journal;const before=structuredClone(f.data[STORAGE_KEY]),rows=await f.rows(),sets=f.sets();
 await assert.rejects(f.store.updatePreferences({appearance:'light'}),{code:'BNS_BOOTSTRAP_REQUIRED'});assert.deepEqual(await f.rows(),rows);assert.equal(f.sets(),sets);assert.deepEqual(await f.journal.bootstrap(f.store),{count:2});assert.equal(f.sets(),sets);assert.deepEqual(f.data[STORAGE_KEY],before);for(const operation of await queued(f.core)){assert.equal(operation.actor,'bootstrap');assert.equal(operation.value.explicit,null);assert.deepEqual(operation.parents,[]);}assert.deepEqual(await f.store.updatePreferences({appearance:'light'}),{ok:true});const operations=await queued(f.core),user=operations.find(operation=>operation.actor==='user');assert.deepEqual(user.value,value('appearance','light'));assert.equal(user.parents.length,1);
});
test('actual local publication failure retains committed intent/outbox/pending and blocks every other original control publisher',async t=>{
 const f=await originalPreferenceFixture(t),before=structuredClone(f.data[STORAGE_KEY]),fault=Error('SYNTHETIC original local publication failed'),sets=f.sets();f.setHook(()=>{throw fault;});await assert.rejects(f.store.updatePreferences({appearance:'dark'}),e=>e===fault);assert.equal(f.sets(),sets+1);assert.deepEqual(f.data[STORAGE_KEY],before);const rows=await f.rows(),pending=await f.meta(pendingId);assert.ok(pending);assert.equal((await f.meta(CONSUMER_OWNER_PREFIX+'appearance')).intent.value,'dark');assert.ok(await f.core.read('outbox',pending.operations[0].operationId));await assert.rejects(queued(f.core),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});f.setHook(null);f.store.consumerPreferenceJournal=null;
 await assert.rejects(f.store.setEnabled(false),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});assert.deepEqual(await f.rows(),rows);assert.equal(f.sets(),sets+1);assert.deepEqual(f.data[STORAGE_KEY],before);
});
test('the genuine original transaction abort rolls back portable owner/outbox/pending and the new control revision together',async t=>{
 const f=await originalPreferenceFixture(t),before=await f.rows(),control=structuredClone(f.data[STORAGE_KEY]),sets=f.sets(),transaction=f.store.repository.transaction.bind(f.store.repository);f.store.repository.transaction=(write,fn,stores)=>transaction(write,async tx=>{const result=await fn(tx);if(write)throw Error('SYNTHETIC portable transaction abort');return result;},stores);
 await assert.rejects(f.store.updatePreferences({appearance:'dark'}),{code:'STORAGE_FAILED'});assert.equal(f.sets(),sets);assert.deepEqual(await f.rows(),before);assert.deepEqual(f.data[STORAGE_KEY],control);assert.equal(await f.meta(pendingId),undefined);
});
test('the original Smart Filter mode and portable intent commit atomically without a fictional Chrome publication',async t=>{
 const f=await originalPreferenceFixture(t),sets=f.sets(),control=structuredClone(f.data[STORAGE_KEY]),publicationRevision=await f.meta(CONTROL_PUBLICATION_REVISION),mode=await f.meta('smart-filter');
 assert.deepEqual(await f.store.setFilterMode('off'),{ok:true,mode:'off'});assert.equal(f.sets(),sets);assert.deepEqual(f.data[STORAGE_KEY],control);assert.equal(await f.meta(pendingId),undefined);assert.equal(await f.meta(CONTROL_PUBLICATION_RESERVATION),undefined);assert.deepEqual(await f.meta(CONTROL_PUBLICATION_REVISION),publicationRevision);assert.deepEqual(await f.meta('smart-filter'),{...mode,mode:'off',policyEpoch:mode.policyEpoch+1});const first=(await queued(f.core))[0];assert.deepEqual(first.value,value('smartFilter','off'));assert.equal(first.actor,'user');
 assert.deepEqual(await f.store.setFilterMode('off'),{ok:true,mode:'off'});assert.deepEqual(await f.meta('smart-filter'),{...mode,mode:'off',policyEpoch:mode.policyEpoch+1});const operations=(await queued(f.core)).sort((a,b)=>a.sequence-b.sequence);assert.equal(operations.length,2);assert.equal(operations[0].revisionId,first.revisionId);assert.deepEqual(operations[1].parents,[first.revisionId]);assert.equal((await f.meta(CONSUMER_OWNER_PREFIX+'smartFilter')).revision,2);assert.equal(f.sets(),sets);
});
test('original Smart Filter transaction abort preserves its complete mode/epoch and emits no operation',async t=>{
 const f=await originalPreferenceFixture(t),rows=await f.rows(),sets=f.sets(),transaction=f.store.repository.transaction.bind(f.store.repository);f.store.repository.transaction=(write,fn,stores)=>transaction(write,async tx=>{const result=await fn(tx);if(write)throw Error('SYNTHETIC mode transaction abort');return result;},stores);await assert.rejects(f.store.setFilterMode('off'),{code:'STORAGE_FAILED'});assert.deepEqual(await f.rows(),rows);assert.equal(f.sets(),sets);assert.deepEqual(await f.core.state(),[]);
});
