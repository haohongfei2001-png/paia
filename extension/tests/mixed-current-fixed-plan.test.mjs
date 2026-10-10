import {prepareHumanScopeProof} from '../core/browser-native-sync/human-library-scope.js';
import {checkCurrentGroupProtocolRows} from '../core/browser-native-sync/current-group-protocol-rows.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore,sealOperation,prepareOriginalCurrentMixedGroupReceive} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {ContextDesiredSyncJournal} from '../core/browser-native-sync/context-desired-journal.js';
import {ContextCardsService} from '../core/context-cards.js';
import {prepareGroupCheckpointPlan,prepareCurrentSourceWorkingGroupCheckpointPlan,prepareCurrentMixedGroupCheckpointPlan,requireOriginalCurrentMixedGroupPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope,requireOriginalCurrentMixedGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {assertMixedCurrentSourceDerivedRows} from '../core/browser-native-sync/mixed-current-source-derived.js';
import {projectEntity} from '../core/browser-native-sync/codecs.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
globalThis.IDBKeyRange=IDBKeyRange;
const operationId=()=>crypto.randomUUID();
const all=s=>s.repository.transaction(false,async t=>{const rows={};for(const name of s.repository.stores)rows[name]=await t.all(name);return rows;});
async function producer({times=[]}={}){
 let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,10)+70000*tick++).toISOString()});await s.consent(true);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_mixed_fixed_dataset',deviceId:'SYNTHETIC_mixed_fixed_device'});
 s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 const epoch=(await s.status()).epoch,requestA=capture(epoch,'SYNTHETIC_A','SYNTHETIC immutable A 中文🙂');if(times[0]!=null)requestA.messages[0].sourceTime={state:'valid',createTime:times[0],updateTime:null};await s.capture(requestA);const a=(await s.snapshot()).library.blocks[0].id;await inputEdit(s,a,{libraryText:'SYNTHETIC genuine edited A 中文🙂',note:'SYNTHETIC first note'});
 const requestB=capture(epoch,'SYNTHETIC_B','SYNTHETIC immutable untouched B 中文🙂');if(times[1]!=null)requestB.messages[0].sourceTime={state:'valid',createTime:times[1],updateTime:null};await s.capture(requestB);await inputEdit(s,a,{note:'SYNTHETIC later note'});
 const topic=await s.createTopic({name:'SYNTHETIC mixed Topic',operationId:operationId()}),entry=await s.createEntry({actor:'user',body:'SYNTHETIC independently owned human body 中文🙂',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:operationId()});
 await new PromptReuseService(s,{syncJournal:new PromptSyncJournal(core)}).change({action:'create',revision:0,text:'SYNTHETIC manual Prompt'});
 await new ContextCardsService(s,{syncJournal:new ContextDesiredSyncJournal(core)}).change({kind:'put',card:'info',itemId:operationId(),operationId:operationId(),epoch:'initial',expectedRevision:0,body:'SYNTHETIC protected manual Info',section:'SYNTHETIC'});
 const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);return {s,core,operations,a,topic,entry};
}
test('fixed mixed compiler retains genuine append, untouched second Input, Human, Context and Prompt in one original Scope',async()=>{
 const x=await producer();try{const before=await all(x.s),plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations);requireOriginalCurrentMixedGroupPlan(x.core,plan);
 assert.deepEqual(plan,await prepareGroupCheckpointPlan(x.core,[...x.operations].reverse()));const scope=await prepareGroupScope(plan,{store:x.s});requireOriginalCurrentMixedGroupScope(x.core,scope,plan);assertMixedCurrentSourceDerivedRows(x.core,scope,plan,before);checkCurrentGroupProtocolRows(x.core,plan,before,{namespace:'initial',epoch:null,restored:false});assert.throws(()=>requireOriginalCurrentMixedGroupScope(x.core,structuredClone(scope),plan),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});assert.equal(await x.s.repository.transaction(false,t=>requireGroupScope(x.s,t,scope)),true);
 assert.equal(scope.expected.records.length,2);assert.equal(scope.expected.blocks.length,2);assert.equal(scope.expected.documents.length,1);assert.equal(scope.expected.humanLibrary.rows.entry.length,1);assert.equal(scope.expected.context.length,1);assert.equal(scope.expected.prompt.overrides.length,1);
 const untouched=scope.expected.blocks.find(row=>row.id!==x.a);assert.equal(untouched.libraryText,null);assert.equal(scope.expected.inputStates.find(row=>row.id===untouched.id).contentRevision,0);
 assert.deepEqual(await all(x.s),before);await assert.rejects(prepareCurrentSourceWorkingGroupCheckpointPlan(x.core,x.operations),{code:'BNS_GROUP_OWNER_UNSUPPORTED'});
 assert.throws(()=>requireOriginalCurrentMixedGroupPlan(x.core,structuredClone(plan)),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
 }finally{await x.s.repository.close();}
});
test('fixed mixed compiler never invokes supplied Source/Working family or new public dispatcher getters',async()=>{
 const x=await producer();let calls=0;try{for(const name of ['prepareSourceBootstrapReceive','prepareSourceAppendReceive','prepareWorkingReceive','prepareCurrentMixedGroupReceive'])Object.defineProperty(x.core,name,{configurable:true,get(){calls++;throw Error('SYNTHETIC supplied method');}});
 const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations);requireOriginalCurrentMixedGroupPlan(x.core,plan);assert.equal(calls,0);assert.equal(plan.groups.filter(g=>g.type==='sourceAppendCommit').length,1);
 await assert.rejects(prepareGroupCheckpointPlan(x.core,x.operations),/SYNTHETIC supplied method/);assert.equal(calls,1);
 }finally{await x.s.repository.close();}
});
test('fixed mixed compiler refuses omitted append member and complete bootstrap ancestor without partial acceptance',async()=>{
 const x=await producer();try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),append=plan.groups.find(g=>g.type==='sourceAppendCommit'),bootstrap=plan.groups.find(g=>g.type==='sourceBootstrapCommit');
 await assert.rejects(prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations.filter(op=>op.revisionId!==append.operations[0].revisionId)),{code:'BNS_GROUP_INCOMPLETE'});
 const removed=new Set(bootstrap.operations.map(op=>op.revisionId));await assert.rejects(prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations.filter(op=>!removed.has(op.revisionId))),{code:'BNS_GROUP_CAUSAL_GAP'});
 }finally{await x.s.repository.close();}
});
test('fixed mixed compiler and all four original group validators refuse async Core rebinding without getter reads',async()=>{
 const x=await producer();try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),calls=[()=>prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),...['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit','humanLibraryCommit'].map(type=>()=>prepareOriginalCurrentMixedGroupReceive(x.core,type,plan.groups.find(g=>g.type===type).operations))];
 for(const prepare of calls){const original=Object.getOwnPropertyDescriptor(x.core,'datasetId');let reads=0;try{const pending=prepare();queueMicrotask(()=>Object.defineProperty(x.core,'datasetId',{configurable:true,get(){reads++;return original.value;}}));await assert.rejects(pending,{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.equal(reads,0);}finally{Object.defineProperty(x.core,'datasetId',original);}}
 }finally{await x.s.repository.close();}
});
test('original general plan cannot authenticate as the mixed compiler result',async()=>{
 const x=await producer();try{const before=await all(x.s),plan=await prepareGroupCheckpointPlan(x.core,x.operations);assert.throws(()=>requireOriginalCurrentMixedGroupPlan(x.core,plan),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});assert.deepEqual(await all(x.s),before);}finally{await x.s.repository.close();}
});

test('async vector growth cannot create a mixed Plan beyond the original 128 operation limit',async()=>{
 const core=new BrowserNativeSyncCore({}, {datasetId:'SYNTHETIC_mixed_growing_dataset',deviceId:'SYNTHETIC_mixed_growing_device'}),operations=[];let parent=null;
 for(let i=0;i<129;i++){const op=await sealOperation({protocol:1,datasetId:core.datasetId,deviceId:core.deviceId,operationId:operationId(),sequence:i+1,type:'promptPreferences',entityId:'prompt-reuse:v1',codecVersion:1,kind:'put',actor:'user',parents:parent?[parent]:[],value:{id:'prompt-reuse:v1',version:1,pins:[],overrides:[],splits:[]}});operations.push(op);parent=op.revisionId;}
 const growing=operations.slice(0,127),pending=prepareCurrentMixedGroupCheckpointPlan(core,growing);queueMicrotask(()=>growing.push(...operations.slice(127)));
 await assert.rejects(pending,{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(growing.length,129);
});

// Original general grouped transport/restore composition only. This establishes
// the consuming mixed corpus and original allocator semantics; it does not
// admit this shape into either existing current-native exporter.
test('source-closed original mixed restore preserves both body owners, untouched append and manual work without duplicate writes',async()=>{
 for(const times of [[],[1609459200,null],[null,1609459200],[1609459200,1640995200],[1640995200,1609459200]]){
 const x=await producer({times});let target;
 try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),scope=await prepareGroupScope(plan,{store:x.s});requireOriginalCurrentMixedGroupScope(x.core,scope,plan);
 const original=await all(x.s),objects=new Map(),transport={async putImmutable(ref,body){objects.set(ref.id,body.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(x.core,transport,{grouped:{store:x.s}});
 await x.s.repository.close();
 target=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await target.consent(true);await target.finishFoundation();const core=new BrowserNativeSyncCore(target.repository,{datasetId:x.core.datasetId,deviceId:'SYNTHETIC_mixed_fixed_receiver'}),restore=new GroupedCheckpointRestore(core,{store:target,restoreId:operationId()});
 await restore.stageCheckpoint(cut.ref,ref=>transport.get(ref));assert.equal((await restore.activate()).state,'activated');let cleanup;do{cleanup=await restore.cleanup({limit:3});}while(!cleanup.complete);
 const restored=await all(target);assertMixedCurrentSourceDerivedRows(x.core,scope,plan,restored);assert.deepEqual(restored.records,original.records);assert.deepEqual(restored.times,original.times);assert.deepEqual(restored.blocks,original.blocks);assert.equal((await target.entry(x.entry.id)).body,'SYNTHETIC independently owned human body 中文🙂');assert.equal((await target.topic(x.topic.id)).name,'SYNTHETIC mixed Topic');
 const prompt=(await new PromptReuseService(target).snapshot()).preferences;assert.deepEqual(projectEntity('promptPreferences',prompt),scope.expected.prompt);assert.equal(prompt.overrides[0].reuseCount,0);
 const context=await new ContextCardsService(target).snapshot();assert.equal(context.items.length,1);assert.equal(context.items[0].body,'SYNTHETIC protected manual Info');assert.equal(context.access.global.enabled,false);
 assert.equal(new Set(restored.revisions.map(row=>row.sequence)).size,restored.revisions.length);assert.equal(restored.meta.find(row=>row.id==='revision-sequence').value,Math.max(...restored.revisions.map(row=>row.sequence)));assert.equal(restored.meta.filter(row=>row.id.includes(':outbox:')).length,0);
 const untouched=restored.inputStates.find(row=>row.id!==x.a);assert.equal(untouched.contentRevision,0);assert.ok(untouched.deltaSequence>0);
 const stable=await all(target);await restore.activate();assert.deepEqual(await all(target),stable);
 }finally{if(target)await target.repository.close();await x.s.repository.close();}
 }
});

test('mixed derived formation rejects cross-wired Source partitions, allocator order, coerced zero and cloned authority',async()=>{
 const x=await producer();try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),scope=await prepareGroupScope(plan,{store:x.s}),rows=await all(x.s);assertMixedCurrentSourceDerivedRows(x.core,scope,plan,rows);
 for(const change of [r=>r.recordIndex[0].sequence=99,r=>r.blockIndex[0].recordIds=r.blockIndex[1].recordIds,r=>r.sourceCounts[0].views.reverse(),r=>r.documents[0].displayKey[0]=0,r=>delete r.recordIndex[0].legacyChat,r=>r.sourceCounts.pop()]){const corrupt=structuredClone(rows);change(corrupt);assert.throws(()=>assertMixedCurrentSourceDerivedRows(x.core,scope,plan,corrupt));}
 assert.throws(()=>assertMixedCurrentSourceDerivedRows(x.core,structuredClone(scope),plan,rows),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});assert.deepEqual(await all(x.s),rows);
 }finally{await x.s.repository.close();}
});

test('original mixed derived views keep exact qualified known/unknown Source time across both append positions',async()=>{
 for(const times of [[1609459200,null],[null,1609459200],[1609459200,1640995200],[1640995200,1609459200]]){
  const x=await producer({times});try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),scope=await prepareGroupScope(plan,{store:x.s}),rows=await all(x.s);assertMixedCurrentSourceDerivedRows(x.core,scope,plan,rows);
   const latest=new Date(Math.max(...times.filter(t=>t!==null))*1000).toISOString();assert.equal(rows.documents[0].value.lastSourceSentAt,latest);assert.equal(rows.documents[0].displayKey[0],-Date.parse(latest));assert.equal(rows.documents[0].archiveDisplay[0],-Date.parse(latest));assert.equal(rows.times.length,times.filter(t=>t!==null).length);assert.deepEqual(await all(x.s),rows);
  }finally{await x.s.repository.close();}
 }
});

test('mixed original protocol comparison rejects missing exact receipts and frontiers without relaxing its partial scope',async()=>{
 const x=await producer();try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),rows=await all(x.s);checkCurrentGroupProtocolRows(x.core,plan,rows,{namespace:'initial',epoch:null,restored:false});
 for(const suffix of [':receipt:',':frontier:',':entityRevision:',':device:']){const corrupt=structuredClone(rows),at=corrupt.meta.findIndex(row=>row.id.includes(suffix));assert.ok(at>=0);corrupt.meta.splice(at,1);assert.throws(()=>checkCurrentGroupProtocolRows(x.core,plan,corrupt,{namespace:'initial',epoch:null,restored:false}),{code:'BNS_GROUP_COMMIT_UNPROVEN'});}
 assert.deepEqual(await all(x.s),rows);
 }finally{await x.s.repository.close();}
});

test('a forged native mixed compilation nonce never opens the original suppression-key reader',async()=>{
 const x=await producer();try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),before=await all(x.s),run=x.s.run;let calls=0;x.s.run=()=>{calls++;throw Error('SYNTHETIC supplied key reader');};
 try{await assert.rejects(prepareGroupScope(plan,{store:x.s,nativeMixedCompilation:Object.freeze({})}),{code:'BNS_HUMAN_PROJECTION_REQUIRED'});assert.equal(calls,0);}finally{x.s.run=run;}assert.deepEqual(await all(x.s),before);
 }finally{await x.s.repository.close();}
});

// Invalid earlier suppression must stop before a later asynchronous keyed hash
// starts. A fail-fast concurrent aggregate otherwise abandons a live operand.
test('original Human scope preparation leaves no later crypto work after an earlier suppression rejects',async()=>{
 const id=operationId(),later={id,deletedEntryId:id,lineageId:id,removedAt:'2026-10-10T00:00:00.000Z',operationId:id,status:'active',scopeVersion:1,scopeTokens:[],evidenceVersionTokens:[],noveltyRuleVersion:1,signatureInput:{body:'SYNTHETIC suppression operand',type:'idea'}};
 const wire={rows:{entry:[],topic:[],section:[],placement:[],history:[],suppression:[{},later],keepSeparate:[]},names:[]},store={run:async()=>Array(32).fill(7)},scope={};
 const subtle=crypto.subtle,original=Object.getOwnPropertyDescriptor(subtle,'importKey');let started=0,finish;
 Object.defineProperty(subtle,'importKey',{configurable:true,value:()=>{started++;return new Promise(resolve=>{finish=()=>resolve({});});}});
 try{await assert.rejects(prepareHumanScopeProof(store,scope,wire),{code:'BNS_HUMAN_SUPPRESSION_UNSUPPORTED'});assert.equal(started,0,'no later keyed operand may outlive failed compilation');}
 finally{if(finish)finish();if(original)Object.defineProperty(subtle,'importKey',original);else delete subtle.importKey;await Promise.resolve();}
});

test('consuming original mixed Scope refuses initial delta swaps and Source/Human local-history collisions even with an unchanged sealed graph',async()=>{
 for(const kind of ['edited-delta-and-map','untouched-append-delta','source-human-history-collision']){
  const x=await producer();try{
   const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),scope=await prepareGroupScope(plan,{store:x.s}),before=await all(x.s);
   assert.equal(await x.s.repository.transaction(false,t=>requireGroupScope(x.s,t,scope)),true);
   await x.s.repository.transaction(true,async t=>{
    if(kind==='source-human-history-collision'){
     const source=before.revisions.find(row=>row.kind==='input'),human=before.revisions.find(row=>row.kind==='topic');
     assert.notEqual(source.sequence,human.sequence);await t.put('revisions',{...source,sequence:human.sequence,listKey:[source.entityKey,human.sequence],documentList:[source.documentId,human.sequence]});
    }else{
     const state=before.inputStates.find(row=>kind==='edited-delta-and-map'?row.id===x.a:row.id!==x.a),other=before.inputStates.find(row=>row.id!==state.id);assert.notEqual(state.deltaSequence,other.deltaSequence);
     await t.put('inputStates',{...state,deltaSequence:other.deltaSequence});
     if(kind==='edited-delta-and-map'){const owner=before.meta.find(row=>row.id.includes(':workingOwner:'));assert.ok(owner);await t.put('meta',{...owner,deltaSequence:other.deltaSequence});}
    }
   });
   const corrupt=await all(x.s);assert.deepEqual(corrupt.meta.filter(row=>row.id.includes(':revision:')),before.meta.filter(row=>row.id.includes(':revision:')));
   const verdict=await x.s.repository.transaction(false,async t=>{try{await requireGroupScope(x.s,t,scope);return 'ACCEPTED';}catch(error){return error.code;}});assert.equal(verdict,'BNS_GROUP_CANONICAL_UNREPRESENTED');
  }finally{await x.s.repository.close();}
 }
});
