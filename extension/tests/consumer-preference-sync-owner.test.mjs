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
