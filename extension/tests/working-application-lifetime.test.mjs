import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {InputWorkingCommitReceiver,prepareWorkingApplication,projectOriginalWorkingHistory,releaseOriginalWorkingApplication} from '../core/browser-native-sync/input-working-commit.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
import {CONSUMER_PUBLICATION_PENDING_ID} from '../core/browser-native-sync/consumer-publication-state.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const id=()=>crypto.randomUUID(),snapshot=s=>s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await tx.all(name)]))));
async function device(t,{consumer=false}={}){const storage=local(),set=storage.set;let hook=null;storage.set=async value=>{if(hook)await hook(value);return set(value);};const s=new LibraryDocumentsStore(storage,{indexedDB:new IDBFactory(),localPublicationTerminal:consumer});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.close());const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_working_lifetime',deviceId:id()});if(consumer)s.consumerPreferenceJournal=new ConsumerPreferenceSyncJournal(core);return {s,core,hook:fn=>{hook=fn;}};}
async function fixture(t,{human=false,conflict=false,workingCount=1,preferences=false,checkpoint=async()=>{}}={}){
 const a=await device(t,{consumer:preferences});a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);a.s.filterIntentJournal=new FilterIntentSyncJournal(a.core);a.s.inputWorkingJournal=new InputWorkingSyncJournal(a.core,{filterJournal:a.s.filterIntentJournal,logicalCommits:true});if(human)a.s.humanLibraryJournal=new HumanLibrarySyncJournal(a.core);
 await a.s.capture(capture((await a.s.status()).epoch));const input=(await a.s.snapshot()).library.blocks[0];for(let n=0;n<workingCount;n++)await inputEdit(a.s,input.id,{libraryText:'SYNTHETIC protected Working lifetime',note:n?'SYNTHETIC Working continuation '+n:''});
 if(human)await a.s.createEntry({actor:'user',operationId:id(),body:'SYNTHETIC independent Human',type:'idea',formation:'explicit',evidence:[]});
 if(preferences)await a.s.updatePreferences({appearance:'dark'});
 const objects=new Map(),cloud={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(a.core,cloud,{grouped:{store:a.s}}),b=await device(t,{consumer:preferences});
 if(conflict)await b.s.createEntry({actor:'user',operationId:id(),body:'SYNTHETIC existing unjournaled Human',type:'idea',formation:'explicit',evidence:[]});
 b.owner=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint});await b.owner.stageCheckpoint(cut.ref,ref=>cloud.get(ref));return {a,b,input};
}
// Test-only observation delegates every actual WeakMap write unchanged. It
// neither creates capabilities nor substitutes successful original owners.
function observeWorking(store){const original=WeakMap.prototype.set,issued=[];WeakMap.prototype.set=function(key,value){const result=Reflect.apply(original,this,[key,value]);if(value?.receiver instanceof InputWorkingCommitReceiver&&value.receiver.store===store&&value.prepared?.descriptor?.type==='inputWorkingCommit')issued.push({cap:key,...value});return result;};return {issued,restore(){WeakMap.prototype.set=original;}};}
const project=async row=>{const rows=await snapshot(row.receiver.store);return projectOriginalWorkingHistory(row.receiver.store,row.receiver.core,row.cap,{type:'inputWorkingCommit',id:row.prepared.descriptor.revisionId,operations:[...row.prepared.members,row.prepared.descriptor]},rows.revisions,rows.meta.find(r=>r.id==='revision-sequence')?.value||0,new Map());};
test('actual Human preparation refusal revokes every previously prepared original Working capability',async t=>{
 const {b}=await fixture(t,{human:true,conflict:true}),before=await snapshot(b.s),observed=observeWorking(b.s);try{await assert.rejects(b.owner.activate(),{code:'BNS_HUMAN_RESTORE_REQUIRED'});}finally{observed.restore();}assert.equal(observed.issued.length,1);assert.deepEqual(await snapshot(b.s),before);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});
});
test('successful cold Working activation revokes its original capability only after the real owner completes',async t=>{
 const {b,input}=await fixture(t),observed=observeWorking(b.s);try{assert.equal((await b.owner.activate()).state,'activated');}finally{observed.restore();}assert.equal(observed.issued.length,1);assert.equal((await b.s.input(input.id)).libraryText,'SYNTHETIC protected Working lifetime');await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});
});
async function releaseFixture(t){
 const {a,b}=await fixture(t),operations=[];for await(const row of a.core.rows('revision'))operations.push(row.operation);const descriptor=operations.find(op=>op.type==='inputWorkingCommit'),input=[...descriptor.value.members.map(ref=>operations.find(op=>op.revisionId===ref.revisionId)),descriptor],receiver=new InputWorkingCommitReceiver(b.s,b.core,{filterJournal:new FilterIntentSyncJournal(b.core)}),observed=observeWorking(b.s);let cap;try{cap=await prepareWorkingApplication(receiver,input);}finally{observed.restore();}assert.equal(observed.issued.length,1);return {...b,receiver,input,cap,record:observed.issued[0]};
}
test('exact original release rejects foreign store/core without disposing the valid capability',async t=>{
 const f=await releaseFixture(t),other=await device(t),before=await snapshot(f.s);assert.ok(Object.isFrozen(f.cap));assert.deepEqual(Object.keys(f.cap),[]);assert.equal(releaseOriginalWorkingApplication(f.s,f.core,{...f.cap}),false);
 for(const [store,core]of [[other.s,f.core],[f.s,other.core],[f.s,new BrowserNativeSyncCore(f.s.repository,{datasetId:f.core.datasetId,deviceId:f.core.deviceId})]]){
  assert.throws(()=>releaseOriginalWorkingApplication(store,core,f.cap),{code:'BNS_PREPARATION_REQUIRED'});assert.ok((await project(f.record)).rows.length>0);
 }
 assert.equal(releaseOriginalWorkingApplication(f.s,f.core,f.cap),true);assert.equal(releaseOriginalWorkingApplication(f.s,f.core,f.cap),false);await assert.rejects(project(f.record),{code:'BNS_PREPARATION_REQUIRED'});await assert.rejects(f.receiver.applyRestored(null,f.cap,null),{code:'BNS_PREPARATION_REQUIRED'});assert.deepEqual(await snapshot(f.s),before);
});
test('copied, unknown and separately prepared capabilities cannot release one another',async t=>{
 const f=await releaseFixture(t),observed=observeWorking(f.s);let cap;try{cap=await prepareWorkingApplication(f.receiver,f.input);}finally{observed.restore();}assert.notEqual(cap,f.cap);assert.equal(releaseOriginalWorkingApplication(f.s,f.core,Object.freeze({})),false);await assert.rejects(project({...f.record,cap:{...f.cap}}),{code:'BNS_PREPARATION_REQUIRED'});
 assert.equal(releaseOriginalWorkingApplication(f.s,f.core,f.cap),true);assert.ok((await project(observed.issued[0])).rows.length>0);assert.equal(releaseOriginalWorkingApplication(f.s,f.core,cap),true);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});
});
for(const human of [false,true])test('two actual Working preparations release on '+(human?'real Human refusal':'successful cold apply'),async t=>{
 const {b}=await fixture(t,{human,conflict:human,workingCount:2}),before=await snapshot(b.s),observed=observeWorking(b.s);try{if(human)await assert.rejects(b.owner.activate(),{code:'BNS_HUMAN_RESTORE_REQUIRED'});else assert.equal((await b.owner.activate()).state,'activated');}finally{observed.restore();}assert.equal(observed.issued.length,2);for(const cap of observed.issued)await assert.rejects(project(cap),{code:'BNS_PREPARATION_REQUIRED'});if(human)assert.deepEqual(await snapshot(b.s),before);
});
for(const phase of ['before-activation','after-activation'])test('actual transaction rejection at '+phase+' releases its capability and rolls every table back',async t=>{
 let hit=false;const {b}=await fixture(t,{checkpoint:async point=>{if(point===phase){hit=true;throw Error('SYNTHETIC original activation interruption');}}}),before=await snapshot(b.s),observed=observeWorking(b.s);try{await assert.rejects(b.owner.activate());}finally{observed.restore();}assert.equal(hit,true);assert.equal(observed.issued.length,1);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});assert.deepEqual(await snapshot(b.s),before);
});
test('native transaction abort after original writes releases the capability and allows explicit fresh retry',async t=>{
 let abort=true,hit=0;const {b,input}=await fixture(t,{checkpoint:async(point,tx)=>{if(point==='after-activation'){hit++;if(abort)tx.tx.abort();}}}),before=await snapshot(b.s),observed=observeWorking(b.s);try{await assert.rejects(b.owner.activate());}finally{observed.restore();}assert.equal(hit,1);assert.equal(observed.issued.length,1);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});assert.deepEqual(await snapshot(b.s),before);
 abort=false;const next=observeWorking(b.s);try{assert.equal((await b.owner.activate()).state,'activated');}finally{next.restore();}assert.equal(next.issued.length,1);assert.notEqual(next.issued[0].cap,observed.issued[0].cap);assert.equal((await b.s.input(input.id)).libraryText,'SYNTHETIC protected Working lifetime');await assert.rejects(project(next.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});
});
test('prepared capability stays live through actual owner and before native completion, then is revoked',async t=>{
 let observed,checked=false;const {b}=await fixture(t,{checkpoint:async point=>{if(point!=='after-activation')return;assert.equal(observed.issued.length,1);const row=observed.issued[0];assert.throws(()=>releaseOriginalWorkingApplication({},row.receiver.core,row.cap),{code:'BNS_PREPARATION_REQUIRED'},'wrong binding must find the still-live original capability');checked=true;}});observed=observeWorking(b.s);try{await b.owner.activate();}finally{observed.restore();}assert.equal(checked,true);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});
});
test('failure preparing a later genuine Working group releases the earlier exact preparation without writes',async t=>{
 const {b}=await fixture(t,{workingCount:2}),before=await snapshot(b.s),observed=observeWorking(b.s),original=BrowserNativeSyncCore.prototype.prepareWorkingReceive;let hit=false;
 BrowserNativeSyncCore.prototype.prepareWorkingReceive=async function(...args){if(observed.issued.length){hit=true;throw Error('SYNTHETIC second Working preparation failure');}return Reflect.apply(original,this,args);};
 try{await assert.rejects(b.owner.activate(),/SYNTHETIC second Working preparation failure/);}finally{BrowserNativeSyncCore.prototype.prepareWorkingReceive=original;observed.restore();}assert.equal(hit,true);assert.equal(observed.issued.length,1);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});assert.deepEqual(await snapshot(b.s),before);
});
test('actual owner failure after canonical writes releases the preparation without preserving partial data',async t=>{
 const {b}=await fixture(t),before=await snapshot(b.s),original=b.s.applyRemoteWorking,observed=observeWorking(b.s);let hit=false;b.s.applyRemoteWorking=async function(...args){const result=await Reflect.apply(original,this,args);hit=true;throw Error('SYNTHETIC after real Working owner');};
 try{await assert.rejects(b.owner.activate());}finally{b.s.applyRemoteWorking=original;observed.restore();}assert.equal(hit,true);assert.equal(observed.issued.length,1);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});assert.deepEqual(await snapshot(b.s),before);
});
test('already activated duplicate prepares no new Working capability and preserves every row',async t=>{
 const {b}=await fixture(t);await b.owner.activate();const before=await snapshot(b.s),observed=observeWorking(b.s);try{assert.equal((await b.owner.activate()).state,'activated');}finally{observed.restore();}assert.equal(observed.issued.length,0);assert.deepEqual(await snapshot(b.s),before);
});
test('cold Source and independent Human without Working remains an original successful zero-capability path',async t=>{
 const {b}=await fixture(t,{human:true,workingCount:0}),observed=observeWorking(b.s);try{assert.equal((await b.owner.activate()).state,'activated');}finally{observed.restore();}assert.equal(observed.issued.length,0);assert.equal((await snapshot(b.s)).thoughts.length,1);
});
for(const terminal of ['success','failure'])test('original Working capability remains live through real local preference publication '+terminal+' then releases',async t=>{
 const {b}=await fixture(t,{preferences:true}),observed=observeWorking(b.s),fault=Error('SYNTHETIC terminal local storage refusal');let hit=false;
 b.hook(async()=>{hit=true;assert.equal(observed.issued.length,1);assert.equal((await b.owner.grouped.stage.read('restore')).phase,'publishing');assert.ok((await snapshot(b.s)).meta.some(row=>row.id===CONSUMER_PUBLICATION_PENDING_ID));assert.ok((await project(observed.issued[0])).rows.length>0,'original readonly consumer still accepts while actual SDK completion is pending');if(terminal==='failure')throw fault;});
 try{if(terminal==='failure')await assert.rejects(b.owner.activate(),error=>error===fault);else assert.equal((await b.owner.activate()).state,'activated');}finally{b.hook(null);observed.restore();}
 assert.equal(hit,true);assert.equal(observed.issued.length,1);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});assert.equal((await b.owner.grouped.stage.read('restore')).phase,terminal==='failure'?'publishing':'activated');
});
