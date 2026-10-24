import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {prepareSavedWorkPublication,publishSavedWorkBootstrap} from '../core/browser-native-sync/saved-work-bootstrap.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {requireHumanScope} from '../core/browser-native-sync/human-library-scope.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {planSearchQueueLocator,searchBatch} from '../core/library-search.js';
import {local,capture} from './harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const id=()=>crypto.randomUUID();
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
function transport(){const objects=new Map();let writes=0;return {objects,get writes(){return writes;},async putImmutable(ref,raw){writes++;objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};}
async function device(t){
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),name:'SYNTHETIC_'+id()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.close());
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_human_search_completeness',deviceId:id()});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 return {s,core};
}
async function fixture(t){
 const {s,core}=await device(t);
 await s.createTopic({name:'SYNTHETIC complete search Topic',operationId:id()});
 await s.createEntry({actor:'user',body:'SYNTHETIC complete search Entry',type:'idea',formation:'explicit',evidence:[],operationId:id()});
 const rows=await snapshot(s),expected=[['entry','thoughts'],['topic','topics'],['section','sections']].flatMap(([kind,name])=>rows[name].map(row=>planSearchQueueLocator(kind,row)));
 assert.equal(expected.length,3);assert.deepEqual(rows.libraryMigrationItems,[...expected].sort((a,b)=>a.id<b.id?-1:1));assert.equal(rows.librarySearchTerms.length,0);
 return {s,core,expected};
}
test('original untouched Human pending queue remains a complete grouped checkpoint input',async t=>{
 const {s,core}=await fixture(t),before=await snapshot(s),cloud=transport();assert.ok((await buildCheckpoint(core,cloud,{grouped:{store:s}})).ref);assert.ok(cloud.writes>0);assert.deepEqual(await snapshot(s),before);
});
for(const kind of ['entry','topic','section'])test('original grouped exporter refuses a missing '+kind+' search locator before publishing',async t=>{
 const {s,core,expected}=await fixture(t),row=expected.find(row=>row.ownerKind===kind);await s.repository.transaction(true,t=>t.delete('libraryMigrationItems',row.id));
 const before=await snapshot(s),cloud=transport();let rejection;try{await buildCheckpoint(core,cloud,{grouped:{store:s}});}catch(error){rejection=error;}
 assert.deepEqual(await snapshot(s),before);assert.equal(rejection?.code,'BNS_GROUP_CANONICAL_UNREPRESENTED','a missing required locator must not be admitted');assert.equal(cloud.writes,0);
});
async function refuses({s,core}){
 const before=await snapshot(s),cloud=transport();await assert.rejects(buildCheckpoint(core,cloud,{grouped:{store:s}}),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});assert.deepEqual(await snapshot(s),before);assert.equal(cloud.writes,0);
}
test('an entirely absent Human queue is not an empty complete pending cut',async t=>{
 const f=await fixture(t);await f.s.repository.transaction(true,async tx=>{for(const row of f.expected)await tx.delete('libraryMigrationItems',row.id);});await refuses(f);
});
for(const defect of ['same-count foreign owner','wrong version','partial phase','nonzero offset','extra field','unowned migration row'])test('original pending-only scope still refuses '+defect,async t=>{
 const f=await fixture(t),original=f.expected[0];await f.s.repository.transaction(true,async tx=>{
  if(defect==='unowned migration row'){await tx.put('libraryMigrationItems',{id:'SYNTHETIC_unowned',entityKind:'organizer_metadata',statusKey:1});return;}
  const row=structuredClone(original);
  if(defect==='same-count foreign owner'){await tx.delete('libraryMigrationItems',row.id);row.ownerId='SYNTHETIC_foreign';row.id=JSON.stringify(['search',row.ownerKind,row.ownerId]);}
  if(defect==='wrong version')row.version='SYNTHETIC_stale';if(defect==='partial phase')row.phase='write';if(defect==='nonzero offset')row.offset=1;if(defect==='extra field')row.extra=true;
  await tx.put('libraryMigrationItems',row);
 });await refuses(f);
});
test('real removed Human owner retains its mandatory pending locator',async t=>{
 const f=await fixture(t),entry=(await snapshot(f.s)).thoughts[0];await f.s.removeEntry({id:entry.id,operationId:id(),expectedRevision:entry.revision});
 const rows=await snapshot(f.s),removed=rows.thoughts.find(row=>row.id===entry.id);assert.equal(removed.lifecycle,'removed');assert.deepEqual(rows.libraryMigrationItems.find(row=>row.ownerId===entry.id),planSearchQueueLocator('entry',removed));
 const cloud=transport();await buildCheckpoint(f.core,cloud,{grouped:{store:f.s}});assert.ok(cloud.writes>0);assert.deepEqual(await snapshot(f.s),rows);
});
for(const complete of [false,true])test('real '+(complete?'completed':'partially written')+' search is not reclassified as untouched pending search',async t=>{
 const f=await fixture(t);await f.s.createEntry({actor:'user',body:Array.from({length:450},(_,i)=>'SYNTHETIC_token_'+i).join(' '),type:'idea',formation:'explicit',evidence:[],operationId:id()});
 await searchBatch(f.s);
 if(complete){for(let i=0;i<10;i++)if(!(await searchBatch(f.s)).pending)break;assert.equal((await snapshot(f.s)).libraryMigrationItems.length,0);}
 else assert.ok((await snapshot(f.s)).libraryMigrationItems.some(row=>row.phase==='write'&&row.offset>0));
 await refuses(f);
});
test('a same-transaction missing locator rejects and rolls every store back',async t=>{
 const f=await fixture(t),operations=[];for await(const row of f.core.rows('revision'))operations.push(row.operation);
 const scope=await prepareGroupScope(await prepareGroupCheckpointPlan(f.core,operations),{store:f.s}),before=await snapshot(f.s);let reached=false;
 await assert.rejects(f.core.transaction(true,async tx=>{await tx.delete('libraryMigrationItems',f.expected[0].id);await tx.put('meta',{id:'SYNTHETIC_uncommitted_search_probe',value:1});reached=true;await requireHumanScope(f.s,tx,scope);}),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});
 assert.equal(reached,true);assert.deepEqual(await snapshot(f.s),before);
});
for(const missing of [false,true])test('existing source-linked Human pending locator '+(missing?'cannot disappear':'keeps its original source IDs'),async t=>{
 const f=await device(t);f.s.sourceBootstrapJournal=new SourceBootstrapJournal(f.core);await f.s.capture(capture((await f.s.status()).epoch));
 const input=(await f.s.snapshot()).library.blocks[0],evidence=await f.s.evidenceFor([{inputId:input.id,role:'primary',selectedFields:['body']}]);
 const entry=await f.s.createEntry({actor:'user',body:'SYNTHETIC existing linked Human',type:'idea',formation:'explicit',evidence,operationId:id()}),rows=await snapshot(f.s),queue=rows.libraryMigrationItems.find(row=>row.ownerId===entry.id);
 assert.equal(queue.sourceRecordIds.length,1);assert.deepEqual(queue,planSearchQueueLocator('entry',rows.thoughts[0]));
 if(missing){await f.s.repository.transaction(true,tx=>tx.delete('libraryMigrationItems',queue.id));await refuses(f);}
 else{await buildCheckpoint(f.core,transport(),{grouped:{store:f.s}});assert.deepEqual(await snapshot(f.s),rows);}
});
const generator={providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1};
for(const missing of [false,true])test('real Saved partition '+(missing?'cannot substitute for the missing Human locator':'does not inflate Human completeness'),async t=>{
 const f=await device(t),human=await f.s.createEntry({actor:'user',body:'SYNTHETIC independent Human',type:'idea',formation:'explicit',evidence:[],operationId:id()});
 f.s.humanLibraryJournal=null;f.s.sourceBootstrapJournal=new SourceBootstrapJournal(f.core);await f.s.capture(capture((await f.s.status()).epoch));
 const input=(await f.s.snapshot()).library.blocks[0],evidence=await f.s.evidenceFor([{inputId:input.id,role:'primary',selectedFields:['body']}]),saved=await f.s.createEntry({actor:'ai',operationId:id(),body:'SYNTHETIC saved fixture',type:'idea',formation:'explicit',evidence,generator});
 await f.s.editEntry({id:saved.id,expectedRevision:0,operationId:id(),changes:{body:'SYNTHETIC protected saved result'}});await publishSavedWorkBootstrap(f.s,await prepareSavedWorkPublication(f.s,f.core,saved.id));
 const rows=await snapshot(f.s),queue=rows.libraryMigrationItems.find(row=>row.ownerId===human.id);assert.equal(rows.libraryMigrationItems.length,2);assert.ok(rows.libraryMigrationItems.some(row=>row.ownerId===saved.id));
 if(missing){await f.s.repository.transaction(true,tx=>tx.delete('libraryMigrationItems',queue.id));await refuses(f);}
 else{await buildCheckpoint(f.core,transport(),{grouped:{store:f.s}});assert.deepEqual(await snapshot(f.s),rows);}
});
