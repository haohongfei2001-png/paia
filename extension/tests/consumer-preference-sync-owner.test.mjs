import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {CODECS,CANDIDATE_CODECS,projectEntity,validateEntity,validateCoverage} from '../core/browser-native-sync/codecs.js';
import {CODECS as originalReaderCodecs,validateCoverage as originalReaderCoverage} from './fixtures/source-append-old-reader/extension/core/browser-native-sync/codecs.js';
import {consumerPreferenceRenderingValue} from '../core/browser-native-sync/consumer-preference-codec.js';
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
