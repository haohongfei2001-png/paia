import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {SourceSavedWorkReceiver} from '../core/browser-native-sync/saved-work-receive.js';
import {SourceBootstrapReceiver} from '../core/browser-native-sync/source-bootstrap-receive.js';
import {captureSavedWorkBootstrap,prepareSavedWorkBootstrap,applySavedWorkBootstrap,prepareSavedWorkGroupApplication,applySavedWorkGroupStep,prepareSavedWorkPublication,publishSavedWorkBootstrap} from '../core/browser-native-sync/saved-work-bootstrap.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const generator={providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1};
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async k=>[k,await t.all(k)]))));
async function make(t,id){const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.db?.close());const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-saved-work',deviceId:id});return {s,core};}
async function saved(t,{edit=true}={}){const a=await make(t,'synthetic-A');a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));a.input=(await a.s.snapshot()).library.blocks[0];a.evidence=await a.s.evidenceFor([{inputId:a.input.id,role:'primary',selectedFields:['body']}]);a.created=await a.s.createEntry({actor:'ai',operationId:crypto.randomUUID(),body:'SYNTHETIC retained AI artifact',type:'idea',formation:'explicit',evidence:a.evidence,generator});if(edit)await a.s.editEntry({id:a.created.id,expectedRevision:0,operationId:crypto.randomUUID(),changes:{body:'SYNTHETIC human protected result',note:'SYNTHETIC personal note'}});a.source=[];for await(const r of a.core.rows('revision'))a.source.push(r.operation);return a;}
async function cold(t,a,id='synthetic-B'){const b=await make(t,id);await new SourceBootstrapReceiver(b.s,b.core).receive(a.source);return b;}

const cloud=()=>{const rows=new Map();return {async putImmutable(ref,raw){rows.set(ref.id,raw.slice());},async get(ref){return rows.get(ref.id)?.slice();}};};
async function fixture(t){const a=await saved(t),publication=await prepareSavedWorkPublication(a.s,a.core,a.created.id);a.operation=await publishSavedWorkBootstrap(a.s,publication);const transport=cloud(),cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});return {a,transport,cut};}
const semantic=x=>({thoughts:x.thoughts.map(({exactSignature,...r})=>r),provenance:x.provenance.map(({scopeToken,versionToken,...r})=>r),dependencies:x.dependencies.map(({scopeToken,versionToken,...r})=>r),revisions:x.revisions.map(({sequence,listKey,documentList,...r})=>r).sort((a,b)=>a.id.localeCompare(b.id))});
test('saved Source graph exports A, restores cold B and reexports unchanged canonical work to cold C',async t=>{
 const {a,transport,cut}=await fixture(t),b=await make(t,'synthetic-B'),restore=new StagedSyncRestore(b.core,{grouped:{store:b.s}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));assert.equal((await snapshot(b.s)).thoughts.length,0);assert.equal((await restore.activate()).state,'activated');assert.deepEqual(semantic(await snapshot(b.s)),semantic(await snapshot(a.s)));
 const active=await b.core.namespace();assert.notEqual(active,'live');const before=await snapshot(b.s);assert.equal((await restore.activate()).state,'activated');assert.deepEqual(await snapshot(b.s),before);
 const next=await buildCheckpoint(b.core,transport,{grouped:{store:b.s},parents:[cut.ref.id]}),c=await make(t,'synthetic-C'),second=new StagedSyncRestore(c.core,{grouped:{store:c.s}});await second.stageCheckpoint(next.ref,r=>transport.get(r));assert.equal((await second.activate()).state,'activated');assert.deepEqual(semantic(await snapshot(c.s)),semantic(await snapshot(a.s)));
 await b.s.editEntry({id:a.created.id,expectedRevision:1,operationId:crypto.randomUUID(),changes:{note:'SYNTHETIC B later protected change'}});const edited=await snapshot(b.s);await restore.activate();assert.deepEqual(await snapshot(b.s),edited);await assert.rejects(buildCheckpoint(b.core,transport,{grouped:{store:b.s}}));
});

for(const phase of ['applied-group','before-activation','after-activation'])test('saved group rollback retains every staged and canonical row when '+phase+' fails',async t=>{
 const {a,transport,cut}=await fixture(t),b=await make(t,'synthetic-B');let hit=false;const restore=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint:async name=>{if(name===phase){hit=true;throw Error('SYNTHETIC group failure');}}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));const before=await snapshot(b.s);await assert.rejects(restore.activate());assert.equal(hit,true);assert.deepEqual(await snapshot(b.s),before);
});
for(const drift of ['source','active','stage','saved frontier','saved receipt','source receipt','source sequence','migration','publication','library'])test('saved group final raw fence rejects post-activation '+drift+' drift',async t=>{
 const {a,transport,cut}=await fixture(t),b=await make(t,'synthetic-B');let hit=false,injected=false;const restore=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint:async(name,tx)=>{if(name!=='after-activation')return;const put=tx.put.bind(tx);tx.put=async(table,row,...args)=>{const result=await put(table,row,...args);if(!hit&&table==='meta'&&row.id==='backup-data-generation'){hit=true;const native=tx.tx.objectStore(drift==='source'?'blocks':'meta'),meta=tx.tx.objectStore('meta'),get=(store,id)=>new Promise((resolve,reject)=>{const q=store.get(id);q.onsuccess=()=>resolve(q.result);q.onerror=reject;}),active=await get(meta,b.core.prefix+'active'),key=drift==='source'?a.input.id:drift==='active'?active.id:drift==='stage'?(await get(meta,await restore.stage.idIn(tx,'restore')))?.id:drift==='saved frontier'?b.core.prefix+'generation:'+active.namespace+':frontier:'+a.operation.deviceId:drift==='saved receipt'?b.core.prefix+'generation:'+active.namespace+':receipt:'+a.operation.operationId:drift==='source receipt'?b.core.prefix+'generation:'+active.namespace+':receipt:'+a.source[0].operationId:drift==='source sequence'?b.core.prefix+'generation:'+active.namespace+':sequence:'+a.source[0].deviceId+':'+String(a.source[0].sequence).padStart(16,'0'):drift==='migration'?'migration':drift==='publication'?'local-control-publication:revision':'thought-library',old=await get(native,key);assert.ok(old,'injection finds actual row');const changed=drift==='source'?{...old,value:{...old.value,libraryText:'SYNTHETIC late changed Source'}}:drift==='active'?{...old,namespace:'synthetic-wrong'}:drift==='stage'?{...old,phase:'validated'}:drift==='saved frontier'?{...old,frontier:999}:drift==='saved receipt'||drift==='source receipt'?{...old,sequence:999}:drift==='source sequence'?{...old,digest:'0'.repeat(64)}:drift==='migration'?{...old,databaseId:'synthetic-other'}:drift==='publication'?{...old,revision:999}:{...old,phase:'thoughts',verified:false};await new Promise((resolve,reject)=>{const q=native.put(changed);q.onsuccess=resolve;q.onerror=reject;});injected=true;}return result;};}});
 await restore.stageCheckpoint(cut.ref,r=>transport.get(r));const before=await snapshot(b.s);await assert.rejects(restore.activate());assert.equal(hit,true);assert.equal(injected,true);assert.deepEqual(await snapshot(b.s),before);
});
test('saved graph requires original Source dependency and rejects unrepresented populated canonical rows',async t=>{
 const {a,transport,cut}=await fixture(t);await assert.rejects(prepareGroupCheckpointPlan(a.core,[a.operation]),{code:'BNS_SAVED_WORK_UNSUPPORTED'});
 const b=await make(t,'synthetic-B'),restore=new StagedSyncRestore(b.core,{grouped:{store:b.s}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));await b.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC unrelated local work',type:'idea',formation:'explicit',evidence:[]});const before=await snapshot(b.s);await assert.rejects(restore.activate());assert.deepEqual(await snapshot(b.s),before);
 await a.s.repository.transaction(true,tx=>tx.put('topics',{id:'synthetic-unrepresented-topic'}));await assert.rejects(buildCheckpoint(a.core,transport,{grouped:{store:a.s}}));
});
test('changed Source cannot export stale saved checkpoint evidence',async t=>{const {a,transport}=await fixture(t);await inputEdit(a.s,a.input.id,{libraryText:'SYNTHETIC new Source body'});const before=await snapshot(a.s);await assert.rejects(buildCheckpoint(a.core,transport,{grouped:{store:a.s}}));assert.deepEqual(await snapshot(a.s),before);});

for(const change of ['missing items','manifest ref','changed item','cloned plan'])test('saved group capability refuses '+change+' without canonical mutation',async t=>{
 const {a,transport,cut}=await fixture(t),b=await make(t,'synthetic-B'),restore=new StagedSyncRestore(b.core,{grouped:{store:b.s}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));let state=await restore.stage.read('restore');const replay=new BrowserNativeSyncCore(b.s.repository,{datasetId:b.core.datasetId,deviceId:b.core.deviceId,namespace:state.replayId}),plan=await prepareGroupCheckpointPlan(replay,[...a.source,a.operation]);
 if(change==='missing items'||change==='changed item')await restore.stage.transaction(true,async tx=>{const key=await restore.stage.idIn(tx,'groupItem','0000');if(change==='missing items')await tx.delete('meta',key);else{const row=await tx.get('meta',key);await tx.put('meta',{...row,item:{...row.item,redacted:true}});}});
 if(change==='manifest ref'){state={...state,manifestId:'0'.repeat(64)};await restore.stage.transaction(true,tx=>restore.stage.put(tx,'restore',[],state));}
 const before=await snapshot(b.s);await assert.rejects(prepareSavedWorkGroupApplication(b.s,replay,change==='cloned plan'?structuredClone(plan):plan,restore.stage,state));assert.deepEqual(await snapshot(b.s),before);
 await assert.rejects(b.s.repository.transaction(true,tx=>applySavedWorkGroupStep(tx,{},plan.groups.at(-1).id)));assert.deepEqual(await snapshot(b.s),before);
});

for(const kind of ['stage','replay'])test('saved terminal scope refuses a new unplanned '+kind+' row after activation',async t=>{const {transport,cut}=await fixture(t),b=await make(t,'synthetic-B');let injected=false;const restore=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint:async(name,tx)=>{if(name!=='after-activation')return;const active=await tx.get('meta',b.core.prefix+'active'),id=kind==='stage'?await restore.stage.idIn(tx,'groupItem','9999'):b.core.prefix+'generation:'+active.namespace+':unplanned:';await tx.put('meta',{id,synthetic:true});injected=true;}});await restore.stageCheckpoint(cut.ref,r=>transport.get(r));const before=await snapshot(b.s);await assert.rejects(restore.activate());assert.equal(injected,true);assert.deepEqual(await snapshot(b.s),before);});


test('saved group private budget survives public metrics reset and rolls back activated scope',async t=>{
 const {transport,cut}=await fixture(t),b=await make(t,'synthetic-B');let entered=false,attempted=0;
 const restore=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint:async(name,tx)=>{
  if(name!=='after-activation')return;entered=true;
  for(let n=0;n<4097;n++){tx.metrics.reads=0;tx.metrics.writes=0;attempted++;await tx.get('meta','synthetic-budget-absent');}
  tx.metrics.reads=0;tx.metrics.writes=0;
 }});
 await restore.stageCheckpoint(cut.ref,r=>transport.get(r));const before=await snapshot(b.s);
 await assert.rejects(restore.activate(),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(entered,true);assert.ok(attempted>0&&attempted<=4097);assert.deepEqual(await snapshot(b.s),before);
});
