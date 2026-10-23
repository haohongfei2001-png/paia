import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='synthetic-group-paging-129';
async function fresh(deviceId){const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId,deviceId});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {store,core};}
const all=store=>store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
test('129 original Human Entry rows refuse a paged staging envelope without publishing canonical state',async()=>{
 const a=await fresh('synthetic-paging-A'),b=await fresh('synthetic-paging-B'),entries=[];
 for(let n=0;n<129;n++)entries.push(await a.store.createEntry({actor:'user',body:'SYNTHETIC paged body '+n,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()}));
 const before=await all(a.store),operations=[];for await(const row of a.core.rows('revision'))operations.push(row.operation);
 assert.equal(before.thoughts.length,129);assert.equal(before.revisions.length,129);assert.ok(operations.length>128);
 console.log(JSON.stringify({syntheticPaging:{entries:before.thoughts.length,history:before.revisions.length,operations:operations.length}}));
 const objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};
 const cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.store}});a.store.repository.close();assert.equal(a.store.repository.db,null);
 const restore=new StagedSyncRestore(b.core,{grouped:{store:b.store}}),stable=await all(b.store),namespace=await b.core.namespace();
 await assert.rejects(restore.stageCheckpoint(cut.ref,ref=>transport.get(ref)),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 const after=await all(b.store);for(const name of Object.keys(stable).filter(name=>name!=='meta'))assert.deepEqual(after[name],stable[name]);
 assert.equal(await b.core.namespace(),namespace);assert.equal((await restore.stage.read('restore')).phase,'staging');await assert.rejects(restore.activate(),{code:'BNS_RESTORE_NOT_READY'});
 b.store.repository.close();
});

import {GROUP_PAGE_LIMITS,createGroupPageBudget,groupPageBudgetSnapshot,chargeGroupPageValue,groupOperationPages,readGroupRows} from '../core/browser-native-sync/group-page-reader.js';
test('original repository rows use bounded ordered pages and one shared transaction byte/ref meter',async()=>{
 const f=await fresh('synthetic-page-rows');await f.store.repository.transaction(true,async t=>{for(let n=0;n<129;n++)await t.put('meta',{id:'synthetic-page:'+String(n).padStart(3,'0'),value:n});},['meta']);
 await f.store.repository.transaction(false,async t=>{const budget=createGroupPageBudget(),rows=await readGroupRows(t,'meta',{prefix:'synthetic-page:',budget});assert.equal(rows.length,129);assert.deepEqual(rows.map(x=>x.value),Array.from({length:129},(_,n)=>n));const facts=groupPageBudgetSnapshot(budget);assert.equal(facts.refs,129);assert.equal(facts.requests,3);assert.ok(facts.bytes>0&&facts.bytes<GROUP_PAGE_LIMITS.bytes);},['meta']);f.store.repository.close();
});
for(const mode of ['backwards','foreign-key','false-next','oversize-page'])test('paged reader rejects '+mode+' before accepting a forged page',async()=>{
 const t={async primaryRangePage(){const row={key:'scope:a',value:{id:'scope:a'}};return mode==='backwards'?{rows:[row,row],next:null}:mode==='foreign-key'?{rows:[{key:'elsewhere',value:{id:'elsewhere'}}],next:null}:mode==='false-next'?{rows:[row],next:'scope:z'}:{rows:Array.from({length:65},(_,n)=>({key:'scope:'+n,value:{id:'scope:'+n}})),next:null};}};
 await assert.rejects(readGroupRows(t,'meta',{prefix:'scope:'}),{code:'BNS_GROUP_PAGE_INVALID'});
});
test('operation paging keeps the 2 MiB/4096 total envelope and 64 element pages',async()=>{
 const sizes=[];for await(const page of groupOperationPages(Array.from({length:129},(_,id)=>({id}))))sizes.push(page.length);assert.deepEqual(sizes,[64,64,1]);
 await assert.rejects(async()=>{for await(const page of groupOperationPages(Array.from({length:4097},(_,id)=>({id}))))void page;},{code:'BNS_GROUP_RESOURCE_LIMIT'});
 const budget=createGroupPageBudget();assert.throws(()=>chargeGroupPageValue(budget,{body:'x'.repeat(GROUP_PAGE_LIMITS.bytes)}),{code:'BNS_GROUP_RESOURCE_LIMIT'});
});
test('paged work deadline is checked after a held page settles and accepts no row',async()=>{
 const budget=createGroupPageBudget(),original=performance.now;let now=original.call(performance);const t={async primaryRangePage(){now+=GROUP_PAGE_LIMITS.ms;return {rows:[{key:'scope:a',value:{id:'scope:a'}}],next:null};}};
 Object.defineProperty(performance,'now',{configurable:true,value:()=>now});try{await assert.rejects(readGroupRows(t,'meta',{prefix:'scope:',budget}),{code:'BNS_GROUP_RESOURCE_LIMIT'});}finally{Object.defineProperty(performance,'now',{configurable:true,value:original});}
});

import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {planCompaction} from '../core/browser-native-sync/compaction.js';
import {packOperations,publishObjects} from '../core/browser-native-sync/segments.js';
test('129 genuine Prompt history operations cross pages into one original canonical owner row',async()=>{
 const a=await fresh('synthetic-prompt-A'),b=await fresh('synthetic-prompt-B'),old=await fresh('synthetic-prompt-old'),objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};let first;const service=new PromptReuseService(a.store,{syncJournal:new PromptSyncJournal(a.core)});
 await service.change({action:'create',revision:0,text:'SYNTHETIC Prompt 0'});
 for(let n=1;n<129;n++){const row=await a.core.transaction(false,readPromptPreferences);await service.change({action:'edit',id:row.overrides[0].id,revision:row.revision,text:'SYNTHETIC Prompt '+n});if(n===127)first=await buildCheckpoint(a.core,transport,{grouped:{store:a.store}});}
 const ops=[];for await(const row of a.core.rows('revision'))ops.push(row.operation);const descriptors=await publishObjects(packOperations(ops,{datasetId,producer:a.core.deviceId}),transport);
 const cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.store},parents:[first.ref.id]}),expected=await a.core.transaction(false,readPromptPreferences);a.store.repository.close();
 assert.equal(cut.manifest.ownerScope.version,2);const older=new StagedSyncRestore(old.core,{grouped:{store:old.store}});await older.stageCheckpoint(first.ref,r=>transport.get(r));const restore=new StagedSyncRestore(b.core,{grouped:{store:b.store}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));
 const collection=await planCompaction({older,newer:restore,descriptors,get:r=>transport.get(r)});assert.ok(collection.eligible.length);for(const ref of collection.eligible)objects.delete(ref.id);assert.equal(collection.performedDeletion,false);old.store.repository.close();
 const repo=b.store.repository,tx=repo.transaction,transactions=[];repo.transaction=async function(write,fn,stores){return tx.call(this,write,async t=>{const before={...this.metrics};try{return await fn(t);}finally{transactions.push({write,reads:this.metrics.reads-before.reads,writes:this.metrics.writes-before.writes});}},stores);};
 try{assert.equal((await restore.activate()).state,'activated');}finally{repo.transaction=tx;}
 console.log(JSON.stringify({syntheticPrompt129Transactions:transactions.filter(x=>x.write)}));assert.deepEqual((await b.core.transaction(false,readPromptPreferences)).overrides,expected.overrides);b.store.repository.close();
});

import {registerRepositoryWorkLimit,registerRepositoryFinalReadFence} from '../core/idb-repository.js';
for(const mode of ['refs','bytes','reset','cursor','late-finalizer'])test('private transaction budget rejects '+mode+' and rolls back despite public metrics mutation',async()=>{
 const f=await fresh('synthetic-budget-'+mode),before=await all(f.store);
 await assert.rejects(f.store.repository.transaction(true,async t=>{
  registerRepositoryWorkLimit(f.store.repository,t,{references:mode==='refs'||mode==='reset'?4:mode==='cursor'?3:100,bytes:mode==='bytes'?128:2*1024*1024});
  await t.put('meta',{id:'synthetic-budget:one',value:1});
  if(mode==='refs'||mode==='reset'){for(let n=0;n<5;n++){t.metrics.reads=0;t.metrics.writes=0;if(mode==='reset')registerRepositoryWorkLimit(f.store.repository,t);await t.get('meta','synthetic-budget:one');}}
  else if(mode==='bytes')await t.put('meta',{id:'synthetic-budget:large',value:'x'.repeat(256)});
  else if(mode==='cursor')await t.keys('meta');
  else registerRepositoryFinalReadFence(f.store.repository,t,{isCurrent:()=>true,plan:function*(){for(let n=0;n<110;n++)yield {method:'count',table:'meta'};return true;}});
 },['meta']),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.deepEqual(await all(f.store),before);f.store.repository.close();
});

test('private work envelope rejects a borrowed scope and cannot be removed by catching its error',async()=>{
 const f=await fresh('synthetic-budget-alias'),before=await all(f.store);
 await assert.rejects(f.store.repository.transaction(true,async t=>{registerRepositoryWorkLimit(f.store.repository,t);await t.put('meta',{id:'synthetic-budget:alias'});const alias=Object.create(Object.getPrototypeOf(t));Object.assign(alias,t);try{await t.get.call(alias,'meta','gate');}catch{}},['meta']),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.deepEqual(await all(f.store),before);f.store.repository.close();
});
test('private transaction deadline rejects the next request after synchronous delayed continuation',async()=>{
 const f=await fresh('synthetic-budget-deadline'),before=await all(f.store);
 await assert.rejects(f.store.repository.transaction(true,async t=>{registerRepositoryWorkLimit(f.store.repository,t,{ms:5});await t.put('meta',{id:'synthetic-budget:deadline'});const start=performance.now();while(performance.now()-start<8){}await t.get('meta','gate');},['meta']),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.deepEqual(await all(f.store),before);f.store.repository.close();
});
import {assertGroupedCheckpointManifest} from '../core/browser-native-sync/group-checkpoint-manifest.js';
test('paged manifest admission is explicit and still bounded; unknown and mixed profiles refuse',()=>{
 const manifest={magic:'PAIA-BNS',protocol:1,kind:'checkpoint-manifest',datasetId,clientEncryption:'none',root:{},level:0,itemCount:387,chain:'a'.repeat(64),coverage:[],parents:[],ownerScope:{version:2,profile:'paged-admitted-local-owners',families:[{type:'humanLibraryMember',count:258,digest:'b'.repeat(64)}]}};
 assert.doesNotThrow(()=>assertGroupedCheckpointManifest(manifest,{core:{datasetId}}));
 for(const change of [{itemCount:4097},{ownerScope:{...manifest.ownerScope,version:1}},{ownerScope:{...manifest.ownerScope,profile:'bounded-admitted-local-owners'}},{ownerScope:{...manifest.ownerScope,families:[{...manifest.ownerScope.families[0],count:4097}]}}])assert.throws(()=>assertGroupedCheckpointManifest({...manifest,...change},{core:{datasetId}}));
});

test('65 genuine Human Entries fit staging but paged activation refuses private transaction work and rolls back every store',async()=>{
 const a=await fresh('synthetic-human65-A'),b=await fresh('synthetic-human65-B');for(let n=0;n<65;n++)await a.store.createEntry({actor:'user',body:'SYNTHETIC '+n,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
 const objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.store}}),restore=new StagedSyncRestore(b.core,{grouped:{store:b.store}});a.store.repository.close();await restore.stageCheckpoint(cut.ref,r=>transport.get(r));
 const before=await all(b.store);await assert.rejects(restore.activate(),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.deepEqual(await all(b.store),before);assert.equal((await restore.stage.read('restore')).phase,'validated');b.store.repository.close();
});

for(const key of ['aiPresentation:synthetic-unrepresented','topicKeepSeparate:synthetic-unrepresented'])test('canonical metadata on either side of Core namespace remains a required owner: '+key,async()=>{
 const a=await fresh('synthetic-scope-range');await a.core.transaction(true,t=>t.put('meta',{id:key,synthetic:true}));
 await assert.rejects(buildCheckpoint(a.core,{async putImmutable(){throw Error('must refuse before publish');}},{grouped:{store:a.store}}),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});a.store.repository.close();
});
