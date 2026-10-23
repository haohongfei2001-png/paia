import {KNOWN_PREFIX,DIRTY_PREFIX,DELTA_COUNTER,HUMAN_FENCE} from '../core/ai-usage/delta.js';
import {planRestoredMixedSemanticMetadata} from '../core/browser-native-sync/source-working-default-meta.js';
import {mixedConfigurationReplay} from '../core/browser-native-sync/mixed-configuration.js';
import {checkCurrentGroupProtocolRows} from '../core/browser-native-sync/current-group-protocol-rows.js';
import {requireGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {prepareCurrentMixedGroupCheckpointPlan,prepareOriginalCurrentMixedSubset,measureOriginalMixedPrefixWrappers} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {prepareMixedRestoredAllocationProof,measureMixedRestoredExpectation} from '../core/browser-native-sync/mixed-restored-allocation.js';
import {readMixedMergeChronology} from '../core/browser-native-sync/mixed-merge-chronology.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
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
globalThis.IDBKeyRange=IDBKeyRange;
const operationId=()=>crypto.randomUUID();
const all=s=>s.repository.transaction(false,async t=>{const rows={};for(const name of s.repository.stores)rows[name]=await t.all(name);return rows;});
async function producer({times=[],append=true}={}){
 let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,10)+70000*tick++).toISOString()});await s.consent(true);await s.finishFoundation();
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
async function freshReceiver(a,device){const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=> '2026-10-23T12:00:00.000Z'});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:a.core.datasetId,deviceId:device});s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
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
test('real merged chronology retains a complete finite allocation expectation for native ownership accounting',async t=>{
 const {target}=await merged(t),p=await proof(target),before=await all(target.s),m=measureMixedRestoredExpectation(target.core,p.scope,p.plan,p.cap);
 for(const key of ['B','T','V','E'])assert.ok(Number.isSafeInteger(m[key])&&m[key]>=0,key);assert.ok(m.B>0&&m.E>0);assert.equal(Object.isFrozen(m),true);assert.deepEqual(await all(target.s),before);
});

for(const initial of [false,true])test('actual '+(initial?'initial A':'restored B')+' merged transactions preserve original semantic replay and cold C consumer',async t=>{
 const {target,a,cloud}=await merged(t,{initial}),p=await proof(target),chronology=await readMixedMergeChronology(target.core,p.plan,p.rows),expected=planRestoredMixedSemanticMetadata(target.core,p.scope,p.plan),byId=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id));
 assert.equal(Object.isFrozen(chronology.transactions),true);assert.equal(chronology.transactions.every(Object.isFrozen),true);assert.equal(Object.isFrozen(chronology.extra),true);
 assert.equal(chronology.namespace,initial?'initial':p.rows.meta.find(r=>r.id===target.core.prefix+'active').namespace);
 assert.deepEqual(byId(expected.known),byId(p.rows.meta.filter(r=>r.id.startsWith(KNOWN_PREFIX))));assert.deepEqual(byId(expected.dirty),byId(p.rows.meta.filter(r=>r.id.startsWith(DIRTY_PREFIX))));assert.deepEqual(expected.sequence,p.rows.meta.find(r=>r.id===DELTA_COUNTER));assert.deepEqual(expected.humanFence,p.rows.meta.find(r=>r.id===HUMAN_FENCE)??null);
 assert.equal(mixedConfigurationReplay(target.core,p.scope,p.plan,true).mode,'light');assert.equal(await target.s.repository.transaction(false,tx=>requireGroupScope(target.s,tx,p.scope)),true);
 checkCurrentGroupProtocolRows(target.core,p.plan,p.rows,{namespace:chronology.namespace,epoch:null,restored:!initial,activeId:chronology.active?.id,completedId:chronology.completedId,merged:true});
 const c=await freshReceiver(a,'SYNTHETIC_merged_native_C');t.after(()=>c.s.repository.close());await receive(target,c,cloud);const pc=await proof(c);assert.equal(await c.s.repository.transaction(false,tx=>requireGroupScope(c.s,tx,pc.scope)),true);assert.equal((await c.s.input(a.a)).note,(await target.s.input(a.a)).note);assert.deepEqual(orderedThoughts((await all(c.s)).thoughts),orderedThoughts(p.rows.thoughts));for(const row of p.rows.thoughts){assert.equal(typeof row.thoughtText,'string');assert.ok(row.thoughtText.length>0);assert.equal((await c.s.entry(row.id)).body,row.thoughtText);}const block=p.rows.blocks.find(r=>r.id===a.a);assert.equal(typeof block.value.note,'string');assert.equal((await c.s.input(a.a)).note,block.value.note);
});

test('borrowed causal subsets match the original compiler while rejecting missing dependencies and counterfeit plans',async t=>{
 const {target}=await merged(t),p=await proof(target),chronology=await readMixedMergeChronology(target.core,p.plan,p.rows);let groups=[];
 for(const tx of chronology.transactions){groups.push(...tx);const ids=groups.map(g=>g.id),cut=await prepareOriginalCurrentMixedSubset(target.core,p.plan,ids),reference=await prepareCurrentMixedGroupCheckpointPlan(target.core,groups.flatMap(g=>g.operations));assert.deepEqual(cut,reference);for(const group of cut.groups){const original=p.plan.groups.find(g=>g.id===group.id);assert.equal(group.operations,original.operations);assert.equal(group.prepared,original.prepared);assert.equal(group.capability,original.capability);}assert.ok(measureOriginalMixedPrefixWrappers(target.core,p.plan,cut).V>0);await assert.rejects(prepareOriginalCurrentMixedSubset(target.core,cut,ids),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});}
 const working=p.plan.groups.find(g=>g.type==='inputWorkingCommit');await assert.rejects(prepareOriginalCurrentMixedSubset(target.core,p.plan,[working.id]));await assert.rejects(prepareOriginalCurrentMixedSubset(target.core,structuredClone(p.plan),p.plan.groups.map(g=>g.id)),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
 const ids=[p.plan.groups[0].id];let calls=0;Object.defineProperty(ids,'0',{get(){calls++;return p.plan.groups[0].id;}});await assert.rejects(prepareOriginalCurrentMixedSubset(target.core,p.plan,ids),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});assert.equal(calls,0);
});

test('subset membership is detached before real digest suspension and cannot be changed by caller',async t=>{
 const {target}=await merged(t),p=await proof(target),ids=p.plan.groups.map(g=>g.id),subtle=crypto.subtle,old=Object.getOwnPropertyDescriptor(subtle,'digest'),digest=subtle.digest.bind(subtle);let release,enteredResolve;const entered=new Promise(r=>enteredResolve=r),held=new Promise(r=>release=r);let first=true;
 Object.defineProperty(subtle,'digest',{configurable:true,async value(...args){if(first){first=false;enteredResolve();await held;}return digest(...args);}});
 let pending;try{pending=prepareOriginalCurrentMixedSubset(target.core,p.plan,ids);await entered;ids.splice(0,ids.length,'SYNTHETIC_mutated');release();const result=await pending;assert.deepEqual(result,p.plan);}finally{release();if(old)Object.defineProperty(subtle,'digest',old);else delete subtle.digest;await pending?.catch(()=>{});}
});

for(const corrupt of ['before','incoming','partial-receipt','manifest','extra-stage'])test('merged allocation rejects '+corrupt+' chronology and preserves all37 stores',async t=>{
 const {target}=await merged(t),p=await proof(target),meta=structuredClone(p.rows.meta),timeline=meta.find(r=>r.id.endsWith(':mixedTimeline:')),batch=timeline.batches[0],receipt=meta.find(r=>r.id.includes(':mergeCommit:')),stage=meta.find(r=>r.phase==='merged');
 if(corrupt==='before')batch.before='f'.repeat(64);else if(corrupt==='incoming')batch.incoming=[];else if(corrupt==='partial-receipt'){receipt.receipts.pop();stage.mergeReceipts=structuredClone(receipt.receipts);}else if(corrupt==='manifest')stage.manifest.ownerScope.families[0].digest='f'.repeat(64);else meta.push({...stage,id:target.core.prefix+'generation:SYNTHETIC_unknown:restore:'});
 if(corrupt==='extra-stage'){const cap=await prepareMixedRestoredAllocationProof(target.core,p.plan,frozen(meta)),scope=await prepareGroupScope(p.plan,{store:target.s,mixedAllocationProof:cap});await assert.rejects(target.s.repository.transaction(false,tx=>requireGroupScope(target.s,tx,scope)));}
 else await assert.rejects(prepareMixedRestoredAllocationProof(target.core,p.plan,frozen(meta)));assert.deepEqual(await all(target.s),p.rows);
});

test('forged native chronology nonce refuses before any second store reader or native grant',async t=>{
 const {target}=await merged(t),p=await proof(target),before=await all(target.s);let reads=0;const store={get run(){reads++;throw Error('SYNTHETIC forbidden reader');}};
 await assert.rejects(prepareMixedRestoredAllocationProof(target.core,p.plan,p.rows.meta,{nonce:{},store,scope:p.scope}),{code:'BNS_HUMAN_PROJECTION_REQUIRED'});assert.equal(reads,0);assert.deepEqual(await all(target.s),before);
});
