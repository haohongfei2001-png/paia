import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {STORAGE_KEY} from '../core/constants.js';
globalThis.IDBKeyRange=IDBKeyRange;
test('known before-write publication failure preserves the last acknowledged selection after genuine database reopen',async()=>{
 const data={},indexedDB=new IDBFactory();let rejectPublish=false;
 const local={async get(key){return {[key]:structuredClone(data[key])};},async set(value){if(rejectPublish)throw Error('SYNTHETIC local publication failed before write');Object.assign(data,structuredClone(value));}};
 const store=new LibraryDocumentsStore(local,{indexedDB,name:'SYNTHETIC-preference-before-write-failure'});await store.consent(true);await store.finishFoundation();const before=structuredClone(data[STORAGE_KEY].preferences);rejectPublish=true;await assert.rejects(store.updatePreferences({appearance:'dark'}));assert.deepEqual(data[STORAGE_KEY].preferences,before);rejectPublish=false;store.repository.db.close();
 const cold=new LibraryDocumentsStore(local,{indexedDB,name:'SYNTHETIC-preference-before-write-failure'});try{await cold.finishFoundation();const preferences=await cold.run(()=>cold.repository.transaction(false,async t=>(await cold.control(t)).preferences));assert.equal(preferences.appearance,before.appearance,'failed save preserves the approved last acknowledged selection');}finally{cold.repository.db.close();}
});

test('publication rejection after actual durable local write must be reconciled before reporting a definite failed preference save',async()=>{
 const data={},indexedDB=new IDBFactory();let failAfterWrite=false;const local={async get(key){return {[key]:structuredClone(data[key])};},async set(value){Object.assign(data,structuredClone(value));if(failAfterWrite)throw Error('SYNTHETIC unknown outcome after durable local publication');}};
 const store=new LibraryDocumentsStore(local,{indexedDB,name:'SYNTHETIC-preference-after-write-failure'});try{await store.consent(true);await store.finishFoundation();failAfterWrite=true;const result=await store.updatePreferences({appearance:'dark'});assert.equal(result.ok,true,'only actual durable exact preference readback resolves the unknown save outcome');assert.equal(data[STORAGE_KEY].preferences.appearance,'dark');}finally{store.repository.db?.close();}
});

async function fixture(t){
 const data={},indexedDB=new IDBFactory(),fault=new Error('SYNTHETIC publication acknowledgement lost');let onSet=null,readFault=false,writes=0;
 const local={async get(key){if(readFault)throw Error('SYNTHETIC readback unavailable');return {[key]:structuredClone(data[key])};},async set(value){writes++;Object.assign(data,structuredClone(value));if(onSet)await onSet();}};
 const store=new LibraryDocumentsStore(local,{indexedDB,name:'SYNTHETIC-preference-readback-'+crypto.randomUUID()});await store.consent(true);await store.finishFoundation();t.after(()=>store.repository.db?.close());
 return {store,data,local,fault,setHook:fn=>{onSet=fn;},setReadFault:v=>{readFault=v;},writes:()=>writes,rows:()=>store.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(store.repository.stores.map(async name=>[name,await tx.all(name)]))))};
}
test('exact after-write readback acknowledges once and leaves every original database row and privacy field unchanged',async t=>{
 const f=await fixture(t),before=await f.rows(),control=structuredClone(f.data[STORAGE_KEY]);f.setHook(()=>{throw f.fault;});const writes=f.writes();
 assert.deepEqual(await f.store.updatePreferences({appearance:'dark',language:'en',hideContentPreviews:true}),{ok:true});assert.equal(f.writes(),writes+1);assert.deepEqual(await f.rows(),before);
 const expected=structuredClone(control);Object.assign(expected.preferences,{appearance:'dark',language:'en',hideContentPreviews:true});assert.deepEqual(f.data[STORAGE_KEY],expected);assert.equal(f.store.volatileError,null);
});
test('unreadable actual readback preserves original publication error, never retries or claims acknowledgement',async t=>{
 const f=await fixture(t),before=await f.rows(),writes=f.writes();f.setHook(()=>{f.setReadFault(true);throw f.fault;});await assert.rejects(f.store.updatePreferences({appearance:'dark'}),e=>e===f.fault);
 assert.equal(f.writes(),writes+1);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'dark');assert.equal(f.store.volatileError.code,'STORAGE_FAILED');assert.deepEqual(await f.rows(),before);f.setReadFault(false);f.setHook(null);
 await f.store.updatePreferences({appearance:'light'});assert.equal(f.data[STORAGE_KEY].preferences.appearance,'light');assert.equal(f.writes(),writes+2);
});
for(const mutation of ['database','schema','privacy','unrelatedPreference','undefinedToNull'])test(`full readback refuses ${mutation} divergence even when requested preference matches`,async t=>{
 const f=await fixture(t);if(mutation==='undefinedToNull')f.data[STORAGE_KEY].diagnostics.syntheticOptional=undefined;const before=await f.rows(),writes=f.writes();
 f.setHook(()=>{const c=f.data[STORAGE_KEY];if(mutation==='database')c.databaseId='SYNTHETIC-other-database';if(mutation==='schema')c.schemaVersion=7;if(mutation==='privacy')c.settings.enabled=false;if(mutation==='unrelatedPreference')c.preferences.language='en';if(mutation==='undefinedToNull')c.diagnostics.syntheticOptional=null;throw f.fault;});
 await assert.rejects(f.store.updatePreferences({appearance:'dark'}),e=>e===f.fault);assert.equal(f.writes(),writes+1);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'dark');assert.deepEqual(await f.rows(),before);
});
for(const identity of ['gate','migration','recovery-restore-epoch'])test(`original ${identity} change fences an otherwise matching local publication`,async t=>{
 const f=await fixture(t),writes=f.writes();let changed;
 f.setHook(async()=>{await f.store.repository.transaction(true,async tx=>{const row=await tx.get('meta',identity);changed=identity==='gate'?{...row,epoch:row.epoch+1}:identity==='migration'?{...row,phase:'SYNTHETIC-incompatible'}:{id:identity,value:'SYNTHETIC-restored-epoch'};await tx.put('meta',changed);},['meta']);throw f.fault;});
 await assert.rejects(f.store.updatePreferences({appearance:'dark'}),e=>e===f.fault);assert.equal(f.writes(),writes+1);assert.deepEqual(await f.store.repository.transaction(false,tx=>tx.get('meta',identity),['meta']),changed);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'dark');
});
test('second local readback detects a change after the database identity read, without undoing it',async t=>{
 const f=await fixture(t),original=f.store.repository.transaction.bind(f.store.repository);let published=false,changed=false;f.setHook(()=>{published=true;throw f.fault;});
 f.store.repository.transaction=async(write,fn,stores)=>{const result=await original(write,fn,stores);if(!write&&published&&!changed){changed=true;f.data[STORAGE_KEY].preferences.appearance='light';}return result;};
 await assert.rejects(f.store.updatePreferences({appearance:'dark'}),e=>e===f.fault);assert.equal(changed,true);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'light');
});
test('transaction abort after preference preparation never publishes or acknowledges and preserves every original row',async t=>{
 const f=await fixture(t),before=await f.rows(),control=structuredClone(f.data[STORAGE_KEY]),writes=f.writes(),original=f.store.repository.transaction.bind(f.store.repository);
 f.store.repository.transaction=(write,fn,stores)=>original(write,async tx=>{const result=await fn(tx);if(write)throw Error('SYNTHETIC abort after preparation');return result;},stores);
 await assert.rejects(f.store.updatePreferences({appearance:'dark'}),{code:'STORAGE_FAILED'});assert.equal(f.writes(),writes);assert.deepEqual(f.data[STORAGE_KEY],control);assert.deepEqual(await f.rows(),before);
});
test('AI style keeps its existing separate lost-acknowledgement reconciliation and CAS owner',async t=>{
 const f=await fixture(t),change=(value,revision=0)=>({aiOrganizeStyle:{version:1,value,expectedRevision:revision,expectedEpoch:'initial'}});f.setHook(()=>{throw f.fault;});const writes=f.writes();
 await assert.rejects(f.store.updatePreferences(change('original')),e=>e===f.fault);assert.deepEqual(await f.store.aiStylePreference(),{available:true,value:'original',revision:1,explicit:true,epoch:'initial'});assert.equal(f.writes(),writes+1);
 assert.deepEqual(await f.store.updatePreferences(change('concise')),{conflict:true});assert.deepEqual(await f.store.updatePreferences(change('original',1)),{ok:true,changed:false});assert.equal(f.writes(),writes+1);
});
for(const phase of ['before','during'])test(`AI style keeps backup recovery lock ${phase} publication`,async t=>{
 const f=await fixture(t),row={id:'backup-recovery-settings',value:{preferences:{}}},writes=f.writes();
 if(phase==='before')await f.store.repository.transaction(true,tx=>tx.put('meta',row),['meta']);else f.setHook(async()=>{await f.store.repository.transaction(true,tx=>tx.put('meta',row),['meta']);throw f.fault;});
 await assert.rejects(f.store.updatePreferences({aiOrganizeStyle:{version:1,value:'original',expectedRevision:0,expectedEpoch:'initial'}}),e=>phase==='before'?e.code==='BACKUP_BUSY':e===f.fault);assert.equal(f.writes(),writes+(phase==='during'?1:0));assert.deepEqual(await f.store.repository.transaction(false,tx=>tx.get('meta',row.id),['meta']),row);
});
for(const action of ['consent','setEnabled'])test(`${action} publication remains outside preference-only acknowledgement recovery`,async t=>{
 const f=await fixture(t);f.setHook(()=>{throw f.fault;});await assert.rejects(action==='consent'?f.store.consent(true):f.store.setEnabled(false),e=>e===f.fault);
});
test('queued saves serialize without replaying a prior before-write failure',async t=>{
 const f=await fixture(t),originalSet=f.local.set.bind(f.local);let first=true;
 f.local.set=async value=>{if(first){first=false;throw f.fault;}return originalSet(value);};
 const firstSave=f.store.updatePreferences({appearance:'dark'}),secondSave=f.store.updatePreferences({language:'en'});await assert.rejects(firstSave,e=>e===f.fault);assert.deepEqual(await secondSave,{ok:true});assert.equal(f.data[STORAGE_KEY].preferences.appearance,'system');assert.equal(f.data[STORAGE_KEY].preferences.language,'en');
});
for(const boundary of ['firstLocal','databaseRead','secondLocal'])test(`live original control mutation at ${boundary} cannot acknowledge a rejected publication`,async t=>{
 const f=await fixture(t),get=f.local.get.bind(f.local),transaction=f.store.repository.transaction.bind(f.store.repository);let published=false,reads=0,mutated=false;
 f.setHook(()=>{published=true;throw f.fault;});
 f.local.get=async key=>{const value=await get(key);if(published&&++reads===(boundary==='firstLocal'?1:2)&&boundary!=='databaseRead'){mutated=true;f.store.pendingControl.preferences.appearance='light';}return value;};
 f.store.repository.transaction=async(write,fn,stores)=>{const value=await transaction(write,fn,stores);if(!write&&published&&boundary==='databaseRead'){mutated=true;f.store.pendingControl.preferences.appearance='light';}return value;};
 const n=f.writes();await assert.rejects(f.store.updatePreferences({appearance:'dark'}),e=>e===f.fault);assert.equal(mutated,true);assert.equal(f.writes(),n+1);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'dark');assert.equal(f.store.volatileError.code,'STORAGE_FAILED');
});
test('request mutation at an awaited original read cannot change captured generic intent into AI style',async t=>{
 const f=await fixture(t),changes={appearance:'dark'},original=f.store.repository.transaction.bind(f.store.repository);let mutated=false;f.setHook(()=>{throw f.fault;});
 f.store.repository.transaction=(write,fn,stores)=>original(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(name,id,...rest)=>{if(write&&!mutated&&name==='meta'&&id==='recovery-restore-epoch'){mutated=true;delete changes.appearance;changes.aiOrganizeStyle={version:1,value:'original',expectedRevision:0,expectedEpoch:'initial'};}return get(name,id,...rest);};return fn(tx);},stores);
 assert.deepEqual(await f.store.updatePreferences(changes),{ok:true});assert.equal(mutated,true);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'dark');assert.equal(Object.hasOwn(f.data[STORAGE_KEY].preferences,'aiOrganizeStyle'),false);
});
test('request mutation cannot turn captured AI style into generic acknowledgement',async t=>{
 const f=await fixture(t),changes={aiOrganizeStyle:{version:1,value:'original',expectedRevision:0,expectedEpoch:'initial'}},original=f.store.repository.transaction.bind(f.store.repository);let mutated=false;f.setHook(()=>{throw f.fault;});
 f.store.repository.transaction=(write,fn,stores)=>original(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(name,id,...rest)=>{if(write&&!mutated&&name==='meta'&&id==='backup-recovery-settings'){mutated=true;delete changes.aiOrganizeStyle;changes.appearance='dark';}return get(name,id,...rest);};return fn(tx);},stores);
 await assert.rejects(f.store.updatePreferences(changes),e=>e===f.fault);assert.equal(mutated,true);assert.equal(f.data[STORAGE_KEY].preferences.aiOrganizeStyle.revision,1);assert.equal(f.data[STORAGE_KEY].preferences.appearance,'system');
});
for(const locked of [false,true])test(`uncloneable invalid style keeps original validation or backup-lock priority (${locked})`,async t=>{
 const f=await fixture(t),n=f.writes();if(locked)await f.store.repository.transaction(true,tx=>tx.put('meta',{id:'backup-recovery-settings',value:{preferences:{}}}),['meta']);
 await assert.rejects(f.store.updatePreferences({aiOrganizeStyle:{version:1,value:Symbol('SYNTHETIC invalid style'),expectedRevision:0,expectedEpoch:'initial'}}),{code:locked?'BACKUP_BUSY':'INVALID_REQUEST'});assert.equal(f.writes(),n);assert.equal(Object.hasOwn(f.data[STORAGE_KEY].preferences,'aiOrganizeStyle'),false);
});
