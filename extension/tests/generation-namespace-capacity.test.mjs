import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository,readOriginalCommittedTransactionWork,createOriginalRecoveryWork,chargeOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork} from '../core/idb-repository.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {buildGroupedCheckpoint,GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
import {CanonicalGenerationPublication} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
globalThis.IDBKeyRange=IDBKeyRange;
const id=()=>crypto.randomUUID(),snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async n=>[n,await t.all(n)]))));
async function fixture(t,{protectedRepository=true,debug=false,generic=false}={}){
 const factory=new IDBFactory(),registry=new ArchiveRepository(local(),{indexedDB:factory,name:'SYNTHETIC_capacity_registry'}),publication=new CanonicalGenerationPublication(registry),b=new LibraryDocumentsStore(local(),{indexedDB:factory,name:'SYNTHETIC_capacity_target'}),handle=await publication.attach(b.repository,{generationId:'generation_target',databaseId:'database_target'});
 await b.consent(true);await b.finishFoundation();const a=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await a.consent(true);await a.finishFoundation();t.after(()=>{for(const r of [registry,a.repository,b.repository])r.db?.close();});
 const coreA=new BrowserNativeSyncCore(a.repository,{datasetId:'SYNTHETIC_capacity',deviceId:'SYNTHETIC_A'}),coreB=new BrowserNativeSyncCore(b.repository,{datasetId:'SYNTHETIC_capacity',deviceId:'SYNTHETIC_B'});a.sourceBootstrapJournal=new SourceBootstrapJournal(coreA);await a.capture(capture((await a.status()).epoch));
 const objects=new Map(),transport={async putImmutable(ref,data){objects.set(ref.id,data.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildGroupedCheckpoint(coreA,transport,{store:a}),restore=new GroupedCheckpointRestore(coreB,{store:b,restoreId:'SYNTHETIC_capacity_restore',...(debug?{checkpoint:async()=>{}}:{})});
 if(generic)return {a,b,coreA,coreB,restore,cut,transport,publication,handle};
 const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store:b,core:coreB,protectRepository:protectedRepository});await stage.stageCheckpoint(cut.ref,r=>transport.get(r));const proof=await stage.validate();return {a,b,coreA,coreB,restore,cut,transport,publication,handle,proof};
}
// Passive fake-IDB instrumentation calls every original method unchanged. It
// observes original transaction phases/work receipts, not replacement owners.
function observe(repository,{onGet=null,onPut=null}={}){
 const set=WeakMap.prototype.set,methods=Object.fromEntries(['openCursor','get','count','put'].map(k=>[k,IDBObjectStore.prototype[k]])),records=[],events=[],tickets=[];
 WeakMap.prototype.set=function(key,value){const result=Reflect.apply(set,this,[key,value]);if(value?.repository===repository&&value.scope&&Array.isArray(value.finalReadFences)&&!records.includes(value))records.push(value);if(value?.repository===repository&&Number.isFinite(value.deadline)&&Number.isInteger(value.refs)&&!tickets.some(x=>x.key===key))tickets.push({key,value});return result;};
 for(const method of Object.keys(methods))IDBObjectStore.prototype[method]=function(...args){const record=records.find(r=>r.transaction===this.transaction);if(record){events.push({method,table:this.name,arg:args[0],record,phase:record.phase});if(method==='get'&&onGet)onGet({store:this,key:args[0],record,methods,tickets});if(method==='put'&&onPut)onPut({store:this,value:args[0],record,methods});}return Reflect.apply(methods[method],this,args);};
 return {records,events,tickets,restore(){WeakMap.prototype.set=set;for(const [k,v]of Object.entries(methods))IDBObjectStore.prototype[k]=v;}};
}
const capacityCursors=(o,f)=>o.events.filter(e=>e.method==='openCursor'&&e.table==='meta'&&e.record.identity.mode==='readwrite'&&typeof e.arg?.lower==='string'&&e.arg.lower.startsWith(f.coreB.prefix+'generation:')&&e.arg.upper===e.arg.lower+'\uffff'&&e.arg.upperOpen===true&&e.arg.lower.endsWith(':')&&!e.arg.lower.slice((f.coreB.prefix+'generation:').length,-1).includes(':'));
for(const phase of ['stage','activate'])test(`protected default ${phase} reuses terminal bodies and keeps original terminal reads and work receipt`,async t=>{
 const f=await fixture(t);if(phase==='activate')await f.restore.stageCanonicalGeneration(f.proof);const o=observe(f.b.repository);try{if(phase==='stage')await f.restore.stageCanonicalGeneration(f.proof);else await f.restore.activate();}finally{o.restore();}
 // The only remaining whole replay-namespace cursor during apply is the
 // original empty-target admission; stage has its original collision check.
 const record=o.records.find(r=>r.shadow?.authority.kind===(phase==='stage'?'group-stage':'group-apply'));assert.ok(record);const work=readOriginalCommittedTransactionWork(f.b.repository,record.scope);assert.ok(work.references>0&&work.references<=4096&&work.bytes>0&&work.bytes<=2*1024*1024);
 const terminal=o.events.filter(e=>e.record===record&&e.phase==='terminal');console.info(JSON.stringify({fixture:'SYNTHETIC_one_Source',phase,namespaceCursors:capacityCursors(o,f).length,terminalGets:terminal.filter(e=>e.method==='get').length,terminalCounts:terminal.filter(e=>e.method==='count').length,work}));assert.equal(capacityCursors(o,f).length,1);assert.ok(terminal.some(e=>e.method==='count'&&e.table==='meta'));assert.ok(terminal.some(e=>e.method==='get'&&typeof e.arg==='string'&&e.arg.startsWith(f.coreB.prefix+'generation:SYNTHETIC_capacity_restore:')));
 if(phase==='activate'){assert.ok(terminal.some(e=>e.method==='count'&&e.table==='records'));assert.ok(terminal.some(e=>e.method==='get'&&e.table==='records'));assert.deepEqual((await f.b.snapshot()).records,(await f.a.snapshot()).records);assert.equal((await f.coreB.read('generation')).value,7);}
});
for(const mode of ['unprotected','debug','generic'])test(`${mode} original admission retains the namespace capacity scan`,async t=>{
 const f=await fixture(t,{protectedRepository:false,debug:mode==='debug',generic:mode==='generic'});if(mode==='generic')await f.restore.stageCheckpoint(f.cut.ref,r=>f.transport.get(r));else await f.restore.stageCanonicalGeneration(f.proof);const o=observe(f.b.repository);try{await f.restore.activate();}finally{o.restore();}assert.equal(capacityCursors(o,f).length,3);assert.deepEqual((await f.b.snapshot()).records,(await f.a.snapshot()).records);
});
test('protected original capacity composition still completes the actual publication owner',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);await f.restore.activate();await f.restore.prepareCanonicalGenerationPublication(f.proof);const seal=await f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof);await f.publication.reserve(seal,'publication_'+id());assert.equal((await f.publication.recover()).state,'committed');assert.equal((await f.publication.active()).receipt.seal.manifestId,f.cut.ref.id);
});
test('protected restore successor mismatch cannot substitute the deferred original capacity preimage',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const before=await snapshot(f.b);let hit=false;const o=observe(f.b.repository,{onPut:({store,value,record,methods})=>{if(hit||record.shadow?.authority.kind!=='group-apply'||store.name!=='meta'||!value.id.endsWith(':restore:')||value.phase!=='activated')return;hit=true;const request=Reflect.apply(methods.put,store,[{...value,syntheticTamper:true}]);request.addEventListener('success',()=>Reflect.apply(methods.put,store,[{...value,phase:'validated'}]));}});
 try{await assert.rejects(f.restore.activate());}finally{o.restore();}assert.equal(hit,true);assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
test('late namespace insertion remains rejected by the complete original terminal count fence',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const before=await snapshot(f.b);let hit=false;const o=observe(f.b.repository,{onGet:({store,record,methods})=>{if(hit||record.phase!=='terminal'||record.shadow?.authority.kind!=='group-apply'||store.name!=='meta')return;hit=true;Reflect.apply(methods.put,store,[{id:f.coreB.prefix+'generation:SYNTHETIC_capacity_restore:late:',value:'SYNTHETIC late namespace mutation'}]);}});
 try{await assert.rejects(f.restore.activate());}finally{o.restore();}assert.equal(hit,true);assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
test('unprotected original terminal reads cannot reset or escape the same cumulative R reference ticket',async t=>{
 const f=await fixture(t,{protectedRepository:false});await f.restore.stageCanonicalGeneration(f.proof);const before=await snapshot(f.b);let hit=false,ticket;const o=observe(f.b.repository,{onGet:({record,tickets})=>{if(hit||record.phase!=='terminal'||record.identity.mode!=='readwrite')return;const held=tickets.find(x=>x.key===ticket);assert.ok(held);const remaining=4096-held.value.refs;assert.ok(remaining>0);chargeOriginalRecoveryWork(f.b.repository,ticket,0,remaining);assert.equal(held.value.refs,4096);hit=true;}});
 try{ticket=createOriginalRecoveryWork(f.b.repository);await assert.rejects(withOriginalRecoveryWork(f.b.repository,ticket,()=>f.restore.activate()),{code:'BNS_GROUP_RESOURCE_LIMIT'});}finally{o.restore();if(ticket)finishOriginalRecoveryWork(f.b.repository,ticket);}assert.equal(hit,true);assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
test('protected generation still refuses an ordinary R ticket instead of silently rebinding either authority',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const before=await snapshot(f.b),ticket=createOriginalRecoveryWork(f.b.repository);try{await assert.rejects(withOriginalRecoveryWork(f.b.repository,ticket,()=>f.restore.activate()),{code:'GENERATION_REPOSITORY_WRITE_DENIED'});}finally{finishOriginalRecoveryWork(f.b.repository,ticket);}assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
