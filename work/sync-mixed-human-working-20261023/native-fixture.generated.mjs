import {assert} from './generation-purge-assert.mjs';
import {ArchiveRepository} from '../core/idb-repository.js';

const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set();
function nativeOptions(options){if(options?.indexedDB!==indexedDB)throw Error('native factory binding');const name=ownedNames.has(options.name)?options.name:'paia-native-mixed-human-working-matrix-'+(++sequence)+'-'+(options.name||'default');ownedNames.add(name);return {...options,name};}
function nativeStore(storage,options){const store=new LibraryDocumentsStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}



export const local = () => { const data = {}; return {async get(k) {return {[k]:structuredClone(data[k])};}, async set(v) {Object.assign(data,structuredClone(v));}}; };
export const capture = (epoch, id = 'm1-synthetic-message-001', text = 'Synthetic explicit working input') => ({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
export async function inputEdit(s,id,changes) {const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
export async function derived(s,ids,extra={}) {const evidence=await s.evidenceFor(ids.map(inputId=>({inputId,role:'primary',selectedFields:['body']})));return s.createEntry({operationId:crypto.randomUUID(),actor:'ai',body:'Synthetic conclusion',type:'judgment',formation:ids.length>1?'synthesized':'explicit',evidence,generator:{providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1},...extra});}




import {LibraryDocumentsStore} from '../core/library-documents-store.js';

import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {ContextDesiredSyncJournal} from '../core/browser-native-sync/context-desired-journal.js';
import {ContextCardsService} from '../core/context-cards.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';

const operationId=()=>crypto.randomUUID();
const all=s=>s.repository.transaction(false,async t=>{const rows={};for(const name of s.repository.stores)rows[name]=await t.all(name);return rows;});
async function producer({times=[],append=true}={}){
 let tick=0;const s=nativeStore(local(),{indexedDB:indexedDB,clock:()=>new Date(Date.UTC(2026,9,10)+70000*tick++).toISOString()});await s.consent(true);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_mixed_fixed_dataset',deviceId:'SYNTHETIC_mixed_fixed_device'});
 s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 const epoch=(await s.status()).epoch,requestA=capture(epoch,'SYNTHETIC_A','SYNTHETIC immutable A 中文🙂');if(times[0]!=null)requestA.messages[0].sourceTime={state:'valid',createTime:times[0],updateTime:null};await s.capture(requestA);const a=(await s.snapshot()).library.blocks[0].id;await inputEdit(s,a,{libraryText:'SYNTHETIC genuine edited A 中文🙂',note:'SYNTHETIC first note'});
 if(append){const requestB=capture(epoch,'SYNTHETIC_B','SYNTHETIC immutable untouched B 中文🙂');if(times[1]!=null)requestB.messages[0].sourceTime={state:'valid',createTime:times[1],updateTime:null};await s.capture(requestB);await inputEdit(s,a,{note:'SYNTHETIC later note'});}
 const topic=await s.createTopic({name:'SYNTHETIC mixed Topic',operationId:operationId()}),entry=await s.createEntry({actor:'user',body:'SYNTHETIC independently owned human body 中文🙂',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:operationId()});
 await new PromptReuseService(s,{syncJournal:new PromptSyncJournal(core)}).change({action:'create',revision:0,text:'SYNTHETIC manual Prompt'});
 await new ContextCardsService(s,{syncJournal:new ContextDesiredSyncJournal(core)}).change({kind:'put',card:'info',itemId:operationId(),operationId:operationId(),epoch:'initial',expectedRevision:0,body:'SYNTHETIC protected manual Info',section:'SYNTHETIC'});
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);return {s,core,operations,a,topic,entry};
}

const fakeCloud=()=>{const objects=new Map();return {async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};};
async function freshReceiver(a,device){const s=nativeStore(local(),{indexedDB:indexedDB,clock:()=> '2026-10-23T12:00:00.000Z'});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:a.core.datasetId,deviceId:device});s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function receive(source,target,cloud){const cut=await buildCheckpoint(source.core,cloud,{grouped:{store:source.s}}),restore=new GroupedCheckpointRestore(target.core,{store:target.s,restoreId:operationId()});await restore.stageCheckpoint(cut.ref,ref=>cloud.get(ref));assert.equal((await restore.activate()).state,'activated');let step;do{step=await restore.cleanup({limit:64});}while(!step.complete);return restore;}
test('simultaneous Human and Working incoming commits through both original owners and exports cold C',async t=>{
 const a=await producer({append:false}),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_joint_B');let c;t.after(async()=>{for(const f of[a,b,c])await f?.s.repository.close();});await receive(a,b,cloud);
 const own=await a.s.createEntry({actor:'user',body:'SYNTHETIC retained local A work',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 await inputEdit(b.s,a.a,{note:'SYNTHETIC joint incoming Working'});
 const entry=await b.s.createEntry({actor:'user',body:'SYNTHETIC joint incoming Human',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 const outbox=(await all(a.s)).meta.filter(r=>r.id.includes(':outbox:'));await receive(b,a,cloud);
 assert.equal((await a.s.entry(entry.id)).body,'SYNTHETIC joint incoming Human');assert.equal((await a.s.input(a.a)).note,'SYNTHETIC joint incoming Working');assert.equal((await a.s.entry(own.id)).body,'SYNTHETIC retained local A work');assert.deepEqual((await all(a.s)).meta.filter(r=>r.id.includes(':outbox:')),outbox);
 c=await freshReceiver(a,'SYNTHETIC_joint_C');await receive(a,c,cloud);assert.equal((await c.s.entry(entry.id)).body,'SYNTHETIC joint incoming Human');assert.equal((await c.s.input(a.a)).note,'SYNTHETIC joint incoming Working');
});

async function joint(t,{checkpoint,structured=false,multiple=false,coalesced=false,fork=null}={}){
 const a=await producer({append:false}),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_joint_sender');t.after(async()=>{for(const f of[a,b])await f.s.repository.close();});await receive(a,b,cloud);
 const local=await a.s.createEntry({actor:'user',body:'SYNTHETIC local pending preserved',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 let entry,topic,section;
 if(structured){topic=await b.s.createTopic({name:'SYNTHETIC simultaneous Topic',operationId:operationId()});section=await b.s.createSection({topicId:topic.id,expectedTopicRevision:0,title:'SYNTHETIC simultaneous Section',operationId:operationId()});}
 entry=await b.s.createEntry({actor:'user',body:'SYNTHETIC simultaneous entry',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 if(structured)await b.s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:section.sectionId,expectedEntryRevision:0,expectedTopicRevision:1,operationId:operationId()});
 await inputEdit(b.s,a.a,{note:'SYNTHETIC simultaneous Working 1'});
 if(multiple){await b.s.editEntry({id:entry.id,expectedRevision:structured?1:0,changes:{note:'SYNTHETIC human future note'},operationId:operationId()});await inputEdit(b.s,a.a,{note:'SYNTHETIC simultaneous Working 2'});}
 if(coalesced)await b.s.editEntry({id:entry.id,expectedRevision:structured?2:1,changes:{note:'SYNTHETIC coalesced last note'},operationId:operationId()});
 if(fork==='Working')await inputEdit(a.s,a.a,{note:'SYNTHETIC competing local Working'});
 if(fork==='Human'){await a.s.editEntry({id:a.entry.id,expectedRevision:1,changes:{note:'SYNTHETIC local Human fork'},operationId:operationId()});await b.s.editEntry({id:a.entry.id,expectedRevision:1,changes:{note:'SYNTHETIC remote Human fork'},operationId:operationId()});}
 const cut=await buildCheckpoint(b.core,cloud,{grouped:{store:b.s}}),restore=new GroupedCheckpointRestore(a.core,{store:a.s,restoreId:operationId(),checkpoint});await restore.stageCheckpoint(cut.ref,r=>cloud.get(r));return {a,b,cloud,restore,entry,topic,section,local};
}

for(const profile of [{structured:true,multiple:false},{structured:false,multiple:true}])test('Human structure or consecutive Working histories share future graph '+JSON.stringify(profile),async t=>{
 const d=await joint(t,profile),oldOutbox=(await all(d.a.s)).meta.filter(r=>r.id.includes(':outbox:'));await d.restore.activate();
 if(profile.multiple)assert.equal((await d.a.s.entry(d.entry.id)).note,'SYNTHETIC human future note');assert.equal((await d.a.s.input(d.a.a)).note,'SYNTHETIC simultaneous Working '+(profile.multiple?2:1));assert.deepEqual((await all(d.a.s)).meta.filter(r=>r.id.includes(':outbox:')),oldOutbox);
 const actual=await all(d.a.s);if(profile.structured){assert.ok(actual.sections.some(r=>r.sectionId===d.section.sectionId&&r.title==='SYNTHETIC simultaneous Section'));assert.ok(actual.placements.some(r=>r.entryId===d.entry.id&&r.sectionId===d.section.sectionId));}
 let cleanup;do{cleanup=await d.restore.cleanup({limit:64});}while(!cleanup.complete);
 const current=await d.a.s.entry(d.entry.id);await d.a.s.editEntry({id:d.entry.id,expectedRevision:current.revision,changes:{body:'SYNTHETIC actual receiver continued body'},operationId:operationId()});await inputEdit(d.a.s,d.a.a,{note:'SYNTHETIC actual receiver continued Working'});
 const c=await freshReceiver(d.a,'SYNTHETIC_joint_structural_C');t.after(()=>c.s.repository.close());await receive(d.a,c,d.cloud);assert.equal((await c.s.entry(d.entry.id)).body,'SYNTHETIC actual receiver continued body');assert.equal((await c.s.input(d.a.a)).note,'SYNTHETIC actual receiver continued Working');assert.equal((await c.s.entry(d.local.id)).body,'SYNTHETIC local pending preserved');
});

test('lost successful return is settled from the durable merged receipt without another owner write',async t=>{
 const d=await joint(t),original=d.restore.activate.bind(d.restore);d.restore.activate=async()=>{await original();throw Error('SYNTHETIC lost successful return');};await assert.rejects(d.restore.activate(),/lost successful return/);const after=await all(d.a.s);
 const reopened=new GroupedCheckpointRestore(d.a.core,{store:d.a.s,restoreId:d.restore.restoreId});assert.equal((await reopened.activate()).state,'activated');assert.deepEqual(await all(d.a.s),after);
});
for(const family of ['Human','Working'])test('simultaneous incoming '+family+' fork preserves all local state',async t=>{const d=await joint(t,{fork:family}),before=await all(d.a.s);await assert.rejects(d.restore.activate());assert.deepEqual(await all(d.a.s),before);});

for(const phase of ['Human-return','Working-return','terminal'])for(const mutation of ['old-receipt','Working-history','local-outbox','stage-cursor'])test(phase+' '+mutation+' drift cannot be swallowed by the other owner',async t=>{
 let d,hit=false;const mutate=async tx=>{hit=true;let table='meta',row;if(mutation==='old-receipt'){table='operationReceipts';row=(await tx.all(table))[0];row.digest='0'.repeat(64);}else if(mutation==='Working-history'){table='revisions';row=(await tx.all(table)).find(r=>r.kind==='input');row.after.note='SYNTHETIC injected history';}else if(mutation==='local-outbox'){row=(await tx.all('meta')).find(r=>r.id.includes(':outbox:'));assert.ok(row);await tx.delete('meta',row.id);return;}else{row=await d.restore.stage.get(tx,'restore');row.received++;}await tx.put(table,row);};
 d=await joint(t,{checkpoint:phase==='terminal'?async(point,tx)=>{if(point==='before-mixed-commit')await mutate(tx);}:undefined});
 if(phase==='Human-return'){const original=d.a.s.operationInTransaction.bind(d.a.s);d.a.s.operationInTransaction=async(tx,...args)=>{const result=await original(tx,...args);if(!hit)await mutate(tx);return result;};}
 if(phase==='Working-return'){const original=d.a.s.applyRemoteWorking.bind(d.a.s);d.a.s.applyRemoteWorking=async(tx,...args)=>{const result=await original(tx,...args);if(!hit)await mutate(tx);return result;};}
 const before=await all(d.a.s);await assert.rejects(d.restore.activate());assert.equal(hit,true);assert.deepEqual(await all(d.a.s),before);
});
for(const mutation of ['authority','semantic','work-limit','interrupt'])test('combined terminal '+mutation+' rejects atomically',async t=>{
 let hit=false;const d=await joint(t,{checkpoint:async(point,tx)=>{if(point!=='before-mixed-commit')return;hit=true;if(mutation==='interrupt')throw Error('SYNTHETIC interrupted');if(mutation==='authority'){const row=await tx.get('meta','gate');row.enabled=false;row.epoch++;await tx.put('meta',row);}else if(mutation==='semantic'){const row=await tx.get('meta','aiu:delta:sequence');row.value++;await tx.put('meta',row);}else{try{for(let i=0;i<4097;i++)await tx.get('meta','SYNTHETIC budget');}finally{for(const key of Object.keys(tx.metrics))if(typeof tx.metrics[key]==='number')tx.metrics[key]=0;}}}}),before=await all(d.a.s);await assert.rejects(d.restore.activate());assert.equal(hit,true);assert.deepEqual(await all(d.a.s),before);
});

test('larger combined owner closure retains the unchanged per-transaction budget and fully rolls back',async t=>{const d=await joint(t,{structured:true,multiple:true}),before=await all(d.a.s);await assert.rejects(d.restore.activate(),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.deepEqual(await all(d.a.s),before);});

test('original no-op placed Entry edit preserves its Entry tick while Topic touch and receipt remain exact',async t=>{
 const a=await producer({append:false}),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_joint_noop_B');t.after(async()=>{for(const f of[a,b])await f.s.repository.close();});await receive(a,b,cloud);
 const old=await b.s.entry(a.entry.id);await b.s.editEntry({id:a.entry.id,expectedRevision:old.revision,changes:{body:old.body},operationId:operationId()});await inputEdit(b.s,a.a,{note:'SYNTHETIC no-op paired Working'});
 const before=await all(a.s),rowBefore=before.thoughts.find(r=>r.id===a.entry.id),counter=before.meta.find(r=>r.id==='thought-sequence').value;await receive(b,a,cloud);const after=await all(a.s),row=after.thoughts.find(r=>r.id===a.entry.id);
 assert.equal(row.updatedSequence,rowBefore.updatedSequence);assert.equal(row.revision,rowBefore.revision);assert.equal(after.meta.find(r=>r.id==='thought-sequence').value,counter+2);assert.equal(after.operationReceipts.filter(r=>r.namespace==='thought-library').length,before.operationReceipts.filter(r=>r.namespace==='thought-library').length+1);assert.equal((await a.s.input(a.a)).note,'SYNTHETIC no-op paired Working');
});

test('coalesced original Entry histories and consecutive Working retain real history identities across two receivers',async t=>{
 const d=await joint(t,{multiple:true,coalesced:true}),next=d.restore;await next.activate();
 const source=(await all(d.b.s)).revisions.filter(r=>r.kind==='library_entry'&&r.entityId===d.entry.id),target=(await all(d.a.s)).revisions.filter(r=>r.kind==='library_entry'&&r.entityId===d.entry.id);assert.equal(source.filter(r=>r.reason==='edit').length,1);assert.deepEqual(target.map(r=>r.id).sort(),source.map(r=>r.id).sort());assert.equal((await d.a.s.entry(d.entry.id)).note,'SYNTHETIC coalesced last note');
 let step;do{step=await next.cleanup({limit:64});}while(!step.complete);
 const c=await freshReceiver(d.a,'SYNTHETIC_coalesced_C');t.after(()=>c.s.repository.close());await receive(d.a,c,d.cloud);assert.equal((await c.s.entry(d.entry.id)).note,'SYNTHETIC coalesced last note');assert.equal((await c.s.input(d.a.a)).note,'SYNTHETIC simultaneous Working 2');
});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=="mixed-human-working-matrix")return previous.run(command,...args);
 const passed=[];
 for(const item of cases){const after=[];let failure;
  try{await item.fn({after(fn){if(typeof fn!=='function')throw Error('native after');after.push(fn);}});passed.push(item.name);}
  catch(error){failure=Error(item.name+': '+error.stack);}
  finally{
   for(const fn of after.reverse())try{await fn();}catch(error){failure??=error;}
   for(const repository of repositories.splice(0))try{await repository.close();}catch(error){failure??=error;}
   for(const name of ownedNames){try{await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('native cleanup blocked'));});}catch(error){failure??=error;}}ownedNames.clear();
  }
  if(failure)throw failure;
 }
 return passed;
}};
