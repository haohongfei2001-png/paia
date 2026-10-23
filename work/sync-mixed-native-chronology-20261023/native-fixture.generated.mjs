import {assert} from './generation-purge-assert.mjs';
import {ArchiveRepository} from '../core/idb-repository.js';

const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set();
function nativeOptions(options){if(options?.indexedDB!==indexedDB)throw Error('native factory binding');const name=ownedNames.has(options.name)?options.name:'paia-native-mixed-native-chronology-matrix-'+(++sequence)+'-'+(options.name||'default');ownedNames.add(name);return {...options,name};}
function nativeStore(storage,options){const store=new LibraryDocumentsStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}



export const local = () => { const data = {}; return {async get(k) {return {[k]:structuredClone(data[k])};}, async set(v) {Object.assign(data,structuredClone(v));}}; };
export const capture = (epoch, id = 'm1-synthetic-message-001', text = 'Synthetic explicit working input') => ({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
export async function inputEdit(s,id,changes) {const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
export async function derived(s,ids,extra={}) {const evidence=await s.evidenceFor(ids.map(inputId=>({inputId,role:'primary',selectedFields:['body']})));return s.createEntry({operationId:crypto.randomUUID(),actor:'ai',body:'Synthetic conclusion',type:'judgment',formation:ids.length>1?'synthesized':'explicit',evidence,generator:{providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1},...extra});}

import {buildGroupedCheckpoint} from '../core/browser-native-sync/group-checkpoint.js';
import {beginHumanQualificationWork,releaseHumanQualificationLease} from '../core/browser-native-sync/human-qualification-budget.js';
import {KNOWN_PREFIX,DIRTY_PREFIX,DELTA_COUNTER,HUMAN_FENCE} from '../core/ai-usage/delta.js';
import {planRestoredMixedSemanticMetadata} from '../core/browser-native-sync/source-working-default-meta.js';
import {mixedConfigurationReplay} from '../core/browser-native-sync/mixed-configuration.js';
import {checkCurrentGroupProtocolRows} from '../core/browser-native-sync/current-group-protocol-rows.js';
import {requireGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {prepareCurrentMixedGroupCheckpointPlan,prepareOriginalCurrentMixedSubset,measureOriginalMixedPrefixWrappers} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {prepareMixedRestoredAllocationProof,measureMixedRestoredExpectation} from '../core/browser-native-sync/mixed-restored-allocation.js';
import {readMixedMergeChronology} from '../core/browser-native-sync/mixed-merge-chronology.js';



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

async function merged(t,{initial=false}={}){
 const a=await producer({append:false}),cloud=fakeCloud(),b=await freshReceiver(a,'SYNTHETIC_merged_native_B');t.after(async()=>{await a.s.repository.close();await b.s.repository.close();});await receive(a,b,cloud);
 await b.s.createEntry({actor:'user',body:'SYNTHETIC B local Human',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 if(initial)await receive(b,a,cloud);else{await inputEdit(a.s,a.a,{note:'SYNTHETIC incoming A delta'});await receive(a,b,cloud);}
 return {a,b,target:initial?a:b,cloud};
}
const portableThought=row=>Object.fromEntries(['id','thoughtText','note','type','formation','origin','revision','contentRevision','fieldRevisions','protections','authorship','sourceRecordIds','inputRefs'].map(key=>[key,row[key]]));
const orderedThoughts=rows=>rows.map(portableThought).sort((a,b)=>a.id.localeCompare(b.id));
const frozen=v=>{if(v&&typeof v==='object'){for(const value of Object.values(v))frozen(value);Object.freeze(v);}return v;};
async function proof(x){const ops=[];for await(const row of x.core.rows('revision'))ops.push(row.operation);const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,ops),rows=frozen(await all(x.s)),cap=await prepareMixedRestoredAllocationProof(x.core,plan,rows.meta),scope=await prepareGroupScope(plan,{store:x.s,mixedAllocationProof:cap});return {plan,rows,cap,scope};}

const pool=()=>{const ticket=beginHumanQualificationWork('graph',8*1024*1024);releaseHumanQualificationLease(ticket);};
const publish=(x,cloud)=>buildGroupedCheckpoint(x.core,cloud,{store:x.s,currentMixedProjection:true});
const consume=async(c,cut,cloud)=>{const r=new GroupedCheckpointRestore(c.core,{store:c.s,restoreId:operationId()});await r.stageCheckpoint(cut.ref,ref=>cloud.get(ref));assert.equal((await r.activate()).state,'activated');let result;do{result=await r.cleanup({limit:64});}while(!result.complete);return r;};
for(const initial of [false,true])test('actual currentMixedProjection exports '+(initial?'initial A':'restored B')+' merged cut through closed senders to C and reexports genuine C edits',async t=>{
 const {a,b,target,cloud}=await merged(t,{initial}),before=await all(target.s),cut=await publish(target,cloud);assert.deepEqual(await all(target.s),before);pool();
 await a.s.repository.close();await b.s.repository.close();assert.equal(a.s.repository.db,null);assert.equal(b.s.repository.db,null);
 const c=await freshReceiver(a,'SYNTHETIC_native_merged_C');t.after(()=>c.s.repository.close());await consume(c,cut,cloud);assert.deepEqual(orderedThoughts((await all(c.s)).thoughts),orderedThoughts(before.thoughts));for(const row of before.thoughts){assert.equal(typeof row.thoughtText,'string');assert.ok(row.thoughtText.length>0);assert.equal((await c.s.entry(row.id)).body,row.thoughtText);}const block=before.blocks.find(r=>r.id===a.a);assert.equal(typeof block.value.note,'string');assert.equal((await c.s.input(a.a)).note,block.value.note);
 const stable=await all(c.s),again=new GroupedCheckpointRestore(c.core,{store:c.s,restoreId:operationId()});await again.stageCheckpoint(cut.ref,ref=>cloud.get(ref));await again.activate();let step;do{step=await again.cleanup({limit:64});}while(!step.complete);assert.deepEqual((await all(c.s)).thoughts,stable.thoughts);
 await inputEdit(c.s,a.a,{note:'SYNTHETIC genuine native C tail'});const nextBefore=await all(c.s),next=await publish(c,cloud);assert.deepEqual(await all(c.s),nextBefore);assert.ok(next.ref.id!==cut.ref.id);pool();assert.equal(a.s.repository.db,null);assert.equal(b.s.repository.db,null);
});

test('actual native merged exporter refuses forged chronology controls and unchanged8Mi resource overflow before publishing',async t=>{
 const {target,cloud}=await merged(t),snapshot=await all(target.s),timeline=snapshot.meta.find(r=>r.id.endsWith(':mixedTimeline:'));
 for(const mode of ['wrong-before','missing-receipt','oversized-control']){
  const bad=structuredClone(timeline);if(mode==='wrong-before')bad.batches[0].before='f'.repeat(64);if(mode==='oversized-control')bad.unexpected='x'.repeat(512000);
  const receipt=snapshot.meta.find(r=>r.id.includes(':mergeCommit:'));await target.s.repository.transaction(true,async tx=>{if(mode==='missing-receipt')await tx.delete('meta',receipt.id);else await tx.put('meta',bad);});const before=await all(target.s);let puts=0;
  try{await assert.rejects(publish(target,{...cloud,async putImmutable(...args){puts++;return cloud.putImmutable(...args);}}),error=>mode==='oversized-control'?['BNS_HUMAN_GRAPH_LIMIT','BNS_HUMAN_QUALIFICATION_LIMIT'].includes(error.code):['BNS_GROUP_CANONICAL_UNREPRESENTED','BNS_GROUP_COMMIT_UNPROVEN'].includes(error.code));assert.equal(puts,0);assert.deepEqual(await all(target.s),before);pool();}
  finally{await target.s.repository.transaction(true,tx=>tx.put('meta',mode==='missing-receipt'?receipt:timeline));}
 }
 assert.deepEqual(await all(target.s),snapshot);
});

test('actual native merged publication refuses a genuine late owner edit and retains the new local outbox',async t=>{
 const {target,a,cloud}=await merged(t);let changed=false;
 await assert.rejects(publish(target,{...cloud,async putImmutable(ref,raw){await cloud.putImmutable(ref,raw);if(ref.kind==='checkpoint-manifest'&&new TextDecoder().decode(raw).includes('ownerScope')){assert.equal(changed,false);await inputEdit(target.s,a.a,{note:'SYNTHETIC native late local owner'});changed=true;}}}),{code:'BNS_SNAPSHOT_CHANGED'});
 assert.equal(changed,true);assert.equal((await target.s.input(a.a)).note,'SYNTHETIC native late local owner');assert.ok((await all(target.s)).meta.some(r=>r.id.includes(':outbox:')&&r.state==='queued'));pool();
});

const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=="mixed-native-chronology-matrix")return previous.run(command,...args);
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
