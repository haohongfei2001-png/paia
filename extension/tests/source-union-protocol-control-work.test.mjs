import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {RecoverableCheckpointPublication} from '../core/browser-native-sync/checkpoint-publication.js';
import {GOOGLE_APPDATA_SCOPE} from '../core/browser-native-sync/providers/google-drive.js';
import {fakeGoogleCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
import {requireSourcePurgeProtocolControlReceipts} from '../core/browser-native-sync/source-purge-protocol-controls.js';
import {createOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork} from '../core/idb-repository.js';
import {measureSourceWorkingPhysicalTree} from '../core/browser-native-sync/source-working-physical.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {STORAGE_KEY} from '../core/constants.js';
globalThis.IDBKeyRange=IDBKeyRange;
const binding={subject:'SYNTHETIC_control_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_control_generation',scopes:[GOOGLE_APPDATA_SCOPE]};
async function actualPublication(t){
 const data={},storage={receiptReads:0,hold:null,async get(key){if(key.startsWith('paia-sync-checkpoint-publication:v1:')){this.receiptReads++;if(this.hold)await this.hold;}return {[key]:structuredClone(data[key])};},async set(value){Object.assign(data,structuredClone(value));}},store=new LibraryDocumentsStore(storage,{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();t.after(()=>store.repository.db?.close());
 const core=new BrowserNativeSyncCore(store.repository,{datasetId:'SYNTHETIC_protocol_control',deviceId:'SYNTHETIC_protocol_writer'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);await store.capture(capture((await store.status()).epoch));
 const cloud=fakeGoogleCheckpointHTTP(binding),publication=new RecoverableCheckpointPublication(core,{store,binding:{...binding,provider:'google-drive-appdata'},request:cloud.request,isCurrent:()=>true});await publication.prepare();await publication.publish();const rows=[];for await(const row of core.rows('google-appdata-allocation'))rows.push(row);assert.ok(rows.length>0);return {store,core,storage,data,rows,cloud};
}
async function window(f,fn,options){const ticket=createOriginalRecoveryWork(f.core.repository,options);try{return await withOriginalRecoveryWork(f.core.repository,ticket,fn);}finally{finishOriginalRecoveryWork(f.core.repository,ticket);}}

test('original publication control authentication preserves no-ticket behavior and supports same-ticket actual receipt reads',async t=>{const f=await actualPublication(t),expected=await requireSourcePurgeProtocolControlReceipts(f.store,f.core,f.rows,'initial');assert.deepEqual(expected,f.rows);assert.deepEqual(await window(f,()=>requireSourcePurgeProtocolControlReceipts(f.store,f.core,f.rows,'initial')),expected);});

test('actual original IDB read leaves insufficient bytes for authentic local publication receipt result on the same ticket',async t=>{
 const f=await actualPublication(t),receiptKey=Object.keys(f.data).find(key=>key.startsWith('paia-sync-checkpoint-publication:v1:')),identity={datasetId:f.core.datasetId,deviceId:f.core.deviceId,databaseId:f.store.databaseId};
 const prior=bytes(f.rows).length+bytes(identity).length+bytes(STORAGE_KEY).length+bytes({[STORAGE_KEY]:f.data[STORAGE_KEY]}).length+bytes(receiptKey).length,responseBytes=bytes({[receiptKey]:f.data[receiptKey]}).length,remaining=prior+Math.floor(responseBytes/2),payloadKey='SYNTHETIC_actual_metered_payload',payload={id:payloadKey,value:''};
 payload.value='x'.repeat(2*1024*1024-remaining-measureSourceWorkingPhysicalTree(payloadKey).B-measureSourceWorkingPhysicalTree(payload).B);await f.core.transaction(true,tx=>tx.put('meta',payload),['meta']);const reads=f.storage.receiptReads,network=f.cloud.requests.length;
 await assert.rejects(window(f,async()=>{await f.core.transaction(false,tx=>tx.get('meta',payloadKey),['meta']);return requireSourcePurgeProtocolControlReceipts(f.store,f.core,f.rows,'initial');}),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.equal(f.storage.receiptReads,reads+1,'the actual local receipt result, not fake prepayment, crossed the same original limit');assert.equal(f.cloud.requests.length,network);assert.equal((await f.store.snapshot()).records.length,1);
});

test('held authentic local receipt uses original deadline and late resolution cannot escape a closed ticket',async t=>{const f=await actualPublication(t);let release;f.storage.hold=new Promise(resolve=>release=resolve);const network=f.cloud.requests.length,start=performance.now();await assert.rejects(window(f,()=>requireSourcePurgeProtocolControlReceipts(f.store,f.core,f.rows,'initial'),{ms:25}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.ok(performance.now()-start<500);release();await new Promise(resolve=>setImmediate(resolve));f.storage.hold=null;assert.equal(f.cloud.requests.length,network);assert.equal((await f.store.snapshot()).records.length,1);});
