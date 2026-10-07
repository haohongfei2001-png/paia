import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveStore} from '../core/store.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
import {STORAGE_KEY} from '../core/constants.js';
import {AI_STYLE_KEY,readAIStyle,portableAIStyle,applyAIStyleChange} from '../core/ai-organize-style-preference.js';
import {validatePreferences,syncWorkspace} from '../core/workspace.js';
globalThis.IDBKeyRange=IDBKeyRange;
const change=(value,expectedRevision)=>({[AI_STYLE_KEY]:{version:1,value,expectedRevision,expectedEpoch:'initial'}});
function local(){const values={};return {values,writes:0,fail:null,async getBytesInUse(){return 0;},async get(k){return {[k]:structuredClone(values[k])};},async set(row){this.writes++;if(this.fail==='before')throw Error('synthetic write failure');Object.assign(values,structuredClone(row));if(this.fail==='after')throw Error('synthetic lost acknowledgement');}};}
async function fixture(Store){const storage=local(),s=new Store(storage,{indexedDB:new IDBFactory()});await s.status();return {s,storage,read:async()=>(await s.snapshot()).preferences};}

for(const Store of [ArchiveStore,IndexedArchiveStore]){
 test(`${Store.name} defaults without a write, records explicit balanced, CAS and A-B-A intent`,async()=>{
  const {s,storage,read}=await fixture(Store),writes=storage.writes,before=await read();
  assert.deepEqual(readAIStyle(before),{available:true,value:'balanced',revision:0,explicit:false,epoch:'initial'});assert.equal(Object.hasOwn(before,AI_STYLE_KEY),false);assert.equal(storage.writes,writes);
  const settings=structuredClone((await s.snapshot()).settings);
  assert.deepEqual(await s.updatePreferences(change('balanced',0)),{ok:true,changed:true});
  assert.deepEqual((await read())[AI_STYLE_KEY],{version:1,value:'balanced',revision:1,explicit:true});
  const once=storage.writes;assert.deepEqual(await s.updatePreferences(change('balanced',1)),{ok:true,changed:false});assert.equal(storage.writes,once);
  const results=await Promise.all([s.updatePreferences(change('original',1)),s.updatePreferences(change('concise',1))]);assert.deepEqual(results,[{ok:true,changed:true},{conflict:true}]);
  assert.deepEqual(await s.updatePreferences(change('balanced',2)),{ok:true,changed:true});assert.equal(readAIStyle(await read()).revision,3);
  assert.deepEqual((await s.snapshot()).settings,settings,'preference does not change consent or epoch');
 });
 test(`${Store.name} unknown version or enum survives unrelated writes and refuses edits`,async()=>{
  for(const saved of [{version:2,value:'balanced',revision:7,explicit:true},{version:1,value:'future-style',revision:8,explicit:true},{version:9,value:'future',revision:9,explicit:true,newField:{opaque:'retained'}}]){
   const {s,storage,read}=await fixture(Store);await s.updatePreferences({appearance:'light'});
   if(Store===ArchiveStore){s.state.preferences[AI_STYLE_KEY]=structuredClone(saved);await s.commit(s.state);}else{const row=await storage.get(STORAGE_KEY);row[STORAGE_KEY].preferences[AI_STYLE_KEY]=structuredClone(saved);await storage.set(row);}
   const serialized=JSON.stringify(saved);assert.equal(readAIStyle(await read()).available,false);
   await assert.rejects(()=>s.updatePreferences(change('original',saved.revision)),e=>e.code==='FEATURE_UNAVAILABLE');
   await s.updatePreferences({fontSize:'xlarge'});assert.equal(JSON.stringify((await read())[AI_STYLE_KEY]),serialized);assert.equal((await read()).fontSize,'xlarge');
  }
 });
 test(`${Store.name} rejected writes and lost acknowledgements reconcile canonical intent before retry`,async()=>{
  const {s,storage,read}=await fixture(Store);await s.updatePreferences(change('original',0));
  storage.fail='before';await assert.rejects(()=>s.updatePreferences(change('concise',1)));storage.fail=null;
  assert.equal(readAIStyle(await read()).value,'original');assert.equal(readAIStyle(await read()).revision,1);
  storage.fail='after';await assert.rejects(()=>s.updatePreferences(change('concise',1)));storage.fail=null;
  assert.equal(readAIStyle(await read()).value,'concise');assert.equal(readAIStyle(await read()).revision,2);
  assert.deepEqual(await s.updatePreferences(change('balanced',1)),{conflict:true});assert.equal(readAIStyle(await read()).value,'concise');
 });
}
test('style preference request and portable envelope reject extra authority, ambiguous types and exhaustion',async()=>{
 for(const value of [null,[],{},'balanced',{version:1,value:'unknown',expectedRevision:0},{version:2,value:'balanced',expectedRevision:0},{version:1,value:'balanced',expectedRevision:-1},{version:1,value:'balanced',expectedRevision:0,grant:true}])assert.throws(()=>validatePreferences({[AI_STYLE_KEY]:value}));
 assert.throws(()=>validatePreferences({...change('balanced',0),appearance:'dark'}));
 const valid={version:5,value:'future_style',revision:4,explicit:true};assert.equal(portableAIStyle(valid),true);
 for(const extra of [{grant:true},{jobs:[]},{consent:true},{value:'x'.repeat(65)},{value:{nested:'style'}},{revision:0},{explicit:false},{version:0}])assert.equal(portableAIStyle({...valid,...extra}),false);
 const state={library:{blocks:[],documents:[]},preferences:{[AI_STYLE_KEY]:valid}};syncWorkspace(state);assert.deepEqual(state.preferences[AI_STYLE_KEY],valid);
 const exhausted={[AI_STYLE_KEY]:{version:1,value:'balanced',revision:Number.MAX_SAFE_INTEGER,explicit:true}};assert.throws(()=>applyAIStyleChange(exhausted,{version:1,value:'original',expectedRevision:Number.MAX_SAFE_INTEGER,expectedEpoch:'initial'}),e=>e.code==='FEATURE_UNAVAILABLE');assert.equal(exhausted[AI_STYLE_KEY].value,'balanced');
});
