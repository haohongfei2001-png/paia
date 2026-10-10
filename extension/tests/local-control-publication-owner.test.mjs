import {observeOriginalControlPublication,requireOriginalControlObservation} from '../core/indexed-store.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {STORAGE_KEY} from '../core/constants.js';
import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,controlPublicationEncoding,controlPublicationDigest} from '../core/local-control-publication.js';
globalThis.IDBKeyRange=IDBKeyRange;
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function fixture(t){
 const data={},indexedDB=new IDBFactory(),name='SYNTHETIC-control-publication-'+crypto.randomUUID();let hook=null,sets=0,capture=false,lease=null;
 const local={async get(key){return {[key]:structuredClone(data[key])};},async set(value){sets++;if(capture)lease=await store.repository.transaction(false,tx=>tx.get('meta',CONTROL_PUBLICATION_RESERVATION),['meta']);if(hook)await hook(value);Object.assign(data,structuredClone(value));}};
 const store=new LibraryDocumentsStore(local,{indexedDB,name});await store.consent(true);await store.finishFoundation();capture=true;const others=[];
 t.after(()=>{store.repository.db?.close();for(const other of others)other.repository.db?.close();});
 return {store,data,local,lease:()=>structuredClone(lease),sets:()=>sets,hook:fn=>{hook=fn;},async second(){const other=new LibraryDocumentsStore(local,{indexedDB,name});await other.finishFoundation();others.push(other);return other;},rows:()=>store.repository.transaction(false,async tx=>{const rows={};for(const name of store.repository.stores)rows[name]=await tx.all(name);return rows;}),meta:id=>store.repository.transaction(false,tx=>tx.get('meta',id),['meta'])};
}
test('real original control writer advances one local revision and settles only its body-free reservation',async t=>{
 const f=await fixture(t),before=await f.rows(),revision=await f.meta(CONTROL_PUBLICATION_REVISION),control=structuredClone(f.data[STORAGE_KEY]),sets=f.sets();
 assert.deepEqual(await f.store.updatePreferences({appearance:'dark'}),{ok:true});assert.equal(f.sets(),sets+1);assert.equal(await f.meta(CONTROL_PUBLICATION_RESERVATION),undefined);assert.deepEqual(await f.meta(CONTROL_PUBLICATION_REVISION),{...revision,revision:revision.revision+1});
 const after=await f.rows();before.meta=before.meta.map(row=>row.id===CONTROL_PUBLICATION_REVISION?{...row,revision:row.revision+1}:row);assert.deepEqual(after,before,'all37 stores differ only in the exactly expected local publication revision');control.preferences.appearance='dark';control.controlPublication={version:1,revision:revision.revision+1,nonce:f.lease().nonce};assert.deepEqual(f.data[STORAGE_KEY],control,'the complete original control and every authority field are exact with the actual lease-derived local stamp');
});
test('an original nonjournal publication in flight excludes a second same-database control writer',async t=>{
 const f=await fixture(t),other=await f.second(),entered=deferred(),release=deferred(),sets=f.sets();f.hook(async()=>{entered.resolve();await release.promise;});
 const first=f.store.updatePreferences({appearance:'dark'});await entered.promise;const rows=await f.rows(),pending=await f.meta(CONTROL_PUBLICATION_RESERVATION);assert.equal(pending.beforeDigest.length,64);assert.equal(pending.afterDigest.length,64);assert.equal(pending.fenceDigest.length,64);assert.deepEqual(Object.keys(pending).sort(),['afterDigest','beforeDigest','databaseId','fenceDigest','id','nonce','revision','version']);
 await assert.rejects(other.updatePreferences({language:'en'}),{code:'CONTROL_PUBLICATION_PENDING'});assert.equal(f.sets(),sets+1);assert.deepEqual(await f.rows(),rows,'refused second writer has no canonical, control, lease or revision side effects');
 release.resolve();assert.deepEqual(await first,{ok:true});f.hook(null);assert.deepEqual(await other.updatePreferences({language:'en'}),{ok:true});assert.equal(f.data[STORAGE_KEY].preferences.appearance,'dark');assert.equal(f.data[STORAGE_KEY].preferences.language,'en');
});
test('a completed publisher fences the stale control of a second instance before original saveControl',async t=>{
 const f=await fixture(t),other=await f.second(),loaded=deferred(),release=deferred(),sets=f.sets(),language=f.data[STORAGE_KEY].preferences.language;
 const stale=other.run(async()=>{const control=await other.repository.transaction(false,tx=>other.control(tx));loaded.resolve();await release.promise;return other.repository.transaction(true,async tx=>{control.preferences.language='en';await other.saveControl(tx,control);});});await loaded.promise;await f.store.updatePreferences({appearance:'dark'});const rows=await f.rows();release.resolve();await assert.rejects(stale,{code:'CONTROL_PUBLICATION_CHANGED'});assert.equal(f.sets(),sets+1);assert.deepEqual(await f.rows(),rows);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'dark');assert.equal(f.data[STORAGE_KEY].preferences.language,language);
});
test('original transaction abort rolls back revision, reservation and all37 rows before any local publication',async t=>{
 const f=await fixture(t),rows=await f.rows(),control=structuredClone(f.data[STORAGE_KEY]),sets=f.sets(),transaction=f.store.repository.transaction.bind(f.store.repository);
 f.store.repository.transaction=(write,fn,stores)=>transaction(write,async tx=>{const value=await fn(tx);if(write)throw Error('SYNTHETIC actual transaction abort');return value;},stores);
 await assert.rejects(f.store.updatePreferences({appearance:'dark'}),{code:'STORAGE_FAILED'});assert.equal(f.sets(),sets);assert.deepEqual(await f.rows(),rows);assert.deepEqual(f.data[STORAGE_KEY],control);
});
test('a cold original instance preserves an unresolved rejected publication without authority replay or timeout stealing',async t=>{
 const f=await fixture(t),fault=Error('SYNTHETIC outcome unavailable'),sets=f.sets();f.hook(()=>{throw fault;});await assert.rejects(f.store.updatePreferences({appearance:'dark'}),e=>e===fault);const rows=await f.rows(),control=structuredClone(f.data[STORAGE_KEY]);assert.ok(await f.meta(CONTROL_PUBLICATION_RESERVATION));f.hook(null);const cold=await f.second();
 assert.equal((await cold.status()).enabled,true,'readonly original owner remains readable');await assert.rejects(cold.setEnabled(false),{code:'CONTROL_PUBLICATION_PENDING'});assert.equal(f.sets(),sets+1);assert.deepEqual(await f.rows(),rows);assert.deepEqual(f.data[STORAGE_KEY],control,'unknown control outcome is never repaired by replaying consent');
});
test('an already committed preference cannot release a foreign reservation installed during the actual local write',async t=>{
 const f=await fixture(t);let foreign;f.hook(async()=>f.store.repository.transaction(true,async tx=>{const own=await tx.get('meta',CONTROL_PUBLICATION_RESERVATION);foreign={...own,nonce:'SYNTHETIC_foreign_nonce'};await tx.put('meta',foreign);},['meta']));
 await assert.rejects(f.store.updatePreferences({appearance:'dark'}),{code:'CONTROL_PUBLICATION_CHANGED'});assert.deepEqual(await f.meta(CONTROL_PUBLICATION_RESERVATION),foreign);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'dark');
});
test('exact local encoding preserves missing, own undefined, signed zero and private text without retaining a body',async()=>{
 const values=[{}, {value:undefined}, {value:null}, {value:0}, {value:-0}, {value:'SYNTHETIC 中文🙂'}],encodings=values.map(controlPublicationEncoding),digests=await Promise.all(values.map(controlPublicationDigest));assert.equal(new Set(encodings).size,values.length);assert.equal(new Set(digests).size,values.length);for(const hash of digests)assert.match(hash,/^[a-f0-9]{64}$/);
});
test('local encoding refuses getters, cycles and aggregate limits before hashing or publishing',()=>{
 let reads=0;const getter={get value(){reads++;return 'SYNTHETIC';}};assert.throws(()=>controlPublicationEncoding(getter),{code:'CONTROL_PUBLICATION_INVALID'});assert.equal(reads,0);const cycle={};cycle.self=cycle;assert.throws(()=>controlPublicationEncoding(cycle),{code:'CONTROL_PUBLICATION_INVALID'});assert.throws(()=>controlPublicationEncoding({a:'x'.repeat(2097153),b:'y'.repeat(2097153)}),{code:'CONTROL_PUBLICATION_LIMIT'});
});

test('original native control observation follows the settled stamp and refuses same-render foreign stamp without writes',async t=>{
 const f=await fixture(t);await f.store.updatePreferences({appearance:'dark'});const rows=await f.rows(),sets=f.sets(),actual=structuredClone(f.data[STORAGE_KEY]),first=await observeOriginalControlPublication(f.store);
 assert.deepEqual(first.row,actual);assert.equal(first.kind,'original-injected-adapter');assert.equal(requireOriginalControlObservation(f.store,first.token),true);
 assert.deepEqual((await observeOriginalControlPublication(f.store,first.token)).row,actual);
 for(const change of [row=>row.controlPublication.nonce=crypto.randomUUID(),row=>row.controlPublication.revision++,row=>row.diagnostics.status='SYNTHETIC_foreign',row=>row.databaseId='SYNTHETIC_foreign']){
  const damaged=structuredClone(actual);change(damaged);f.data[STORAGE_KEY]=damaged;await assert.rejects(observeOriginalControlPublication(f.store,first.token),{code:'CONTROL_PUBLICATION_CHANGED'});assert.deepEqual(f.data[STORAGE_KEY],damaged);assert.deepEqual(await f.rows(),rows);assert.equal(f.sets(),sets);f.data[STORAGE_KEY]=structuredClone(actual);
 }
 assert.deepEqual((await observeOriginalControlPublication(f.store,first.token)).row,actual);
});
test('original native control observation rejects swapped SDK facade and getters and a forged observation capability',async t=>{
 const f=await fixture(t),first=await observeOriginalControlPublication(f.store),rows=await f.rows(),control=structuredClone(f.data[STORAGE_KEY]),sets=f.sets(),get=f.local.get;
 f.store.local={...f.local};await assert.rejects(observeOriginalControlPublication(f.store,first.token),{code:'CONTROL_PUBLICATION_CHANGED'});f.store.local=f.local;
 let called=0;f.local.get=async function(key){called++;return get.call(this,key);};await assert.rejects(observeOriginalControlPublication(f.store,first.token),{code:'CONTROL_PUBLICATION_CHANGED'});assert.equal(called,0);f.local.get=get;
 assert.throws(()=>requireOriginalControlObservation(f.store,Object.freeze({})),{code:'CONTROL_PUBLICATION_CHANGED'});await assert.rejects(observeOriginalControlPublication(f.store,Object.freeze({})),{code:'CONTROL_PUBLICATION_CHANGED'});
 assert.deepEqual(await f.rows(),rows);assert.deepEqual(f.data[STORAGE_KEY],control);assert.equal(f.sets(),sets);assert.deepEqual((await observeOriginalControlPublication(f.store,first.token)).row,control);
});
