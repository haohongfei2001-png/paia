import {prepareMixedRestoredAllocationProof} from '../core/browser-native-sync/mixed-restored-allocation.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {prepareHumanScopeProof} from '../core/browser-native-sync/human-library-scope.js';
import {assertOriginalInitialMixedScopeCompilationProfile} from '../core/browser-native-sync/human-library-plan.js';
import {checkCurrentGroupProtocolRows} from '../core/browser-native-sync/current-group-protocol-rows.js';
import {planInitialMixedSemanticMetadata,planRestoredMixedSemanticMetadata} from '../core/browser-native-sync/source-working-default-meta.js';
import {KNOWN_PREFIX,DIRTY_PREFIX,DELTA_COUNTER,HUMAN_FENCE} from '../core/ai-usage/delta.js';
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
import {prepareGroupCheckpointPlan,prepareCurrentSourceWorkingGroupCheckpointPlan,prepareCurrentMixedGroupCheckpointPlan,requireOriginalCurrentMixedGroupPlan,prepareOriginalCurrentMixedForeignPrefix,measureOriginalMixedPrefixWrappers} from '../core/browser-native-sync/group-checkpoint-plan.js';
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
test('original initial Mixed flush chronology exactly consumes all AIU metadata without replacing journal descriptors by live Thoughts',async()=>{
 const x=await producer();try{
  await x.s.createSection({topicId:x.topic.id,expectedTopicRevision:1,title:'SYNTHETIC named AIU Section',operationId:operationId()});const operations=[];for await(const row of x.core.rows('revision'))operations.push(row.operation);
  const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,operations),scope=await prepareGroupScope(plan,{store:x.s}),actual=(await all(x.s)).meta,expected=planInitialMixedSemanticMetadata(x.core,scope,plan),sorted=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(sorted(expected.known),sorted(actual.filter(row=>row.id.startsWith(KNOWN_PREFIX))));assert.deepEqual(sorted(expected.dirty),sorted(actual.filter(row=>row.id.startsWith(DIRTY_PREFIX))));
  assert.deepEqual(expected.sequence,actual.find(row=>row.id===DELTA_COUNTER));assert.deepEqual(expected.humanFence,actual.find(row=>row.id===HUMAN_FENCE));assert.equal(expected.sequence.value,10);assert.equal(expected.humanFence.value,5);
  const entry=expected.known.find(row=>row.descriptor.kind==='library_entry');assert.equal(entry.descriptor.independent,false);assert.deepEqual(entry.descriptor.lineage,[]);
  assert.throws(()=>planInitialMixedSemanticMetadata(x.core,structuredClone(scope),plan),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
 }finally{await x.s.repository.close();}
});
test('fixed mixed compiler retains genuine append, untouched second Input, Human, Context and Prompt in one original Scope',async()=>{
 const x=await producer();try{const before=await all(x.s),plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations);requireOriginalCurrentMixedGroupPlan(x.core,plan);
 assert.deepEqual(plan,await prepareGroupCheckpointPlan(x.core,[...x.operations].reverse()));const scope=await prepareGroupScope(plan,{store:x.s});requireOriginalCurrentMixedGroupScope(x.core,scope,plan);assertMixedCurrentSourceDerivedRows(x.core,scope,plan,before);checkCurrentGroupProtocolRows(x.core,plan,before,{namespace:'initial',epoch:null,restored:false});assert.throws(()=>requireOriginalCurrentMixedGroupScope(x.core,structuredClone(scope),plan),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});assert.equal(await x.s.repository.transaction(false,t=>requireGroupScope(x.s,t,scope)),true);
 for(const history of scope.expected.humanLibrary.rows.history){const outer=scope.expected.revisions.find(row=>row.id===history.id);assert.notEqual(outer,history);assert.equal(outer.sequence,0);assert.ok(history.sequence>0,'portable history allocation remains independent of outer normalization');}
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
test('native no-alias profile rejects sealed Topic history aliases before keyed Scope construction',async()=>{
 const x=await producer();try{
  const original=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations);assertOriginalInitialMixedScopeCompilationProfile(x.core,original);
  assert.throws(()=>assertOriginalInitialMixedScopeCompilationProfile(x.core,structuredClone(original)),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
  for(const side of ['before','after']){
   const rows=structuredClone(x.operations),history=rows.filter(op=>op.type==='humanLibraryMember'&&op.value.entityType==='history'&&op.value.after.kind==='topic'&&op.value.after.after).sort((a,b)=>a.sequence-b.sequence).at(-1);assert.ok(history,'latest actual Topic history');
   // The owner's creation baseline has null before. A synthetic, codec-valid
   // snapshot supplies that side to exercise the same original identity path.
   if(!history.value.after[side])history.value.after[side]=structuredClone(history.value.after.after);
   const descriptor=rows.find(op=>op.type==='humanLibraryCommit'&&op.value.members.some(ref=>ref.revisionId===history.revisionId));assert.ok(descriptor);
   history.value.after[side].identity.aliases.push({name:'SYNTHETIC retained historical alias',actor:'user',revision:0,operationId:operationId(),at:'2026-10-10T00:00:00.000Z'});
   // Reseal the actual descendant links as well as the changed member and its
   // descriptor. An unrelated causal-gap refusal would not exercise the gate.
   const revisions=new Map();rows.sort((a,b)=>a.sequence-b.sequence);
   for(let i=0;i<rows.length;i++){const op=rows[i],prior=op.revisionId;op.parents=op.parents.map(id=>revisions.get(id)||id);if(op.type==='humanLibraryCommit')op.value.members=op.value.members.map(ref=>({...ref,revisionId:revisions.get(ref.revisionId)||ref.revisionId}));rows[i]=await sealOperation(op);revisions.set(prior,rows[i].revisionId);}
   const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,rows);requireOriginalCurrentMixedGroupPlan(x.core,plan);
   // The original typed compiler accepts this sealed history. The consuming
   // finite native profile, rather than a changed codec/assertion, refuses it.
   assert.throws(()=>assertOriginalInitialMixedScopeCompilationProfile(x.core,plan),{code:'BNS_HUMAN_PROJECTION_REQUIRED'});
  }
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
 const receiverPlan=await prepareCurrentMixedGroupCheckpointPlan(core,x.operations),receiverScope=await prepareGroupScope(receiverPlan,{store:target});assert.equal(await target.repository.transaction(false,t=>requireGroupScope(target,t,receiverScope)),true);
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
test('mixed default and named Sections restore with original receipt allocation then accept a genuine Section-local edit back',async()=>{
 const x=await producer();let target;
 try{
  const topicRow=await x.s.repository.transaction(false,t=>t.get('topics',x.topic.id)),named=await x.s.createSection({topicId:x.topic.id,expectedTopicRevision:topicRow.organizationRevision,title:'SYNTHETIC named Section',operationId:operationId()});assert.equal(named.conflict,undefined);
  const second=await x.s.createEntry({actor:'user',body:'SYNTHETIC second independent owner 中文🙂',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
  await x.s.placeEntry({entryId:second.id,topicId:x.topic.id,sectionId:named.sectionId,expectedEntryRevision:0,expectedTopicRevision:named.topicRevision,operationId:operationId()});
  const operations=[];for await(const row of x.core.rows('revision'))operations.push(row.operation);
  const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,operations),scope=await prepareGroupScope(plan,{store:x.s}),before=await all(x.s);assert.equal(await x.s.repository.transaction(false,t=>requireGroupScope(x.s,t,scope)),true);
  assert.equal(before.meta.find(row=>row.id==='thought-sequence').value,14);assert.equal(before.sections.length,2);assert.equal(before.placements.find(row=>row.entryId===x.entry.id).sectionId,topicRow.defaultSectionId);assert.equal(before.placements.find(row=>row.entryId===second.id).sectionId,named.sectionId);
  const receipt=before.operationReceipts.find(row=>row.ownerId===named.id);assert.deepEqual(receipt.result,named);assert.equal(receipt.operationSequence,9);
  const objects=new Map(),transport={async putImmutable(ref,body){objects.set(ref.id,body.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(x.core,transport,{grouped:{store:x.s}});
  await x.s.repository.close();assert.equal(x.s.repository.db,null);
  target=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=> '2026-10-10T12:00:00.000Z'});await target.consent(true);await target.finishFoundation();const receiver=new BrowserNativeSyncCore(target.repository,{datasetId:x.core.datasetId,deviceId:'SYNTHETIC_mixed_section_receiver'}),restore=new GroupedCheckpointRestore(receiver,{store:target,restoreId:operationId()});await restore.stageCheckpoint(cut.ref,ref=>transport.get(ref));assert.equal((await restore.activate()).state,'activated');let cleanup;do{cleanup=await restore.cleanup({limit:3});}while(!cleanup.complete);
  const restored=await all(target),restoredPlan=await prepareCurrentMixedGroupCheckpointPlan(receiver,operations),restoredScope=await prepareGroupScope(restoredPlan,{store:target});assert.equal(await target.repository.transaction(false,t=>requireGroupScope(target,t,restoredScope)),true);
  assert.deepEqual(restored.sections,before.sections);assert.deepEqual(restored.placements,before.placements);assert.equal((await target.entry(second.id)).body,'SYNTHETIC second independent owner 中文🙂');assert.equal(restored.meta.find(row=>row.id==='thought-sequence').value,14);
  target.humanLibraryJournal=new HumanLibrarySyncJournal(receiver);const currentTopic=restored.topics.find(row=>row.id===x.topic.id),old=restored.placements.find(row=>row.entryId===x.entry.id),edit=await target.placeEntry({entryId:x.entry.id,topicId:x.topic.id,sectionId:named.sectionId,expectedEntryRevision:restored.thoughts.find(row=>row.id===x.entry.id).revision,expectedTopicRevision:currentTopic.organizationRevision,expectedPlacementRevision:old.revision,operationId:operationId()});assert.equal(edit.conflict,undefined);
  const tail=[];for await(const row of receiver.rows('revision'))if(row.operation.deviceId===receiver.deviceId)tail.push(row.operation);assert.ok(tail.length>1);
  // Reopen original A only after fresh-B recovery has finished; no A state or
  // preparation token was available to B. Apply the genuine typed B journal.
  await x.s.repository.open();await x.s.humanLibraryJournal.receive(x.s,tail);const returned=await all(x.s);assert.equal(returned.placements.find(row=>row.entryId===x.entry.id).sectionId,named.sectionId);assert.equal(returned.placements.find(row=>row.entryId===second.id).sectionId,named.sectionId);assert.equal(returned.meta.find(row=>row.id==='thought-sequence').value,17);
  await x.s.humanLibraryJournal.receive(x.s,tail);assert.deepEqual(await all(x.s),returned);
 }finally{if(target)await target.repository.close();await x.s.repository.close();}
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

test('original mixed restored allocation consumes only the authenticated import prefix before genuine local Human and untouched-B edits',async()=>{
 const x=await producer();let target,third;
 try{
  const objects=new Map(),transport={async putImmutable(ref,body){objects.set(ref.id,body.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(x.core,transport,{grouped:{store:x.s}});await x.s.repository.close();
  target=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await target.consent(true);await target.finishFoundation();const core=new BrowserNativeSyncCore(target.repository,{datasetId:x.core.datasetId,deviceId:'SYNTHETIC_mixed_local_tail_receiver'}),restore=new GroupedCheckpointRestore(core,{store:target,restoreId:operationId()});await restore.stageCheckpoint(cut.ref,ref=>transport.get(ref));await restore.activate();let cleanup;do{cleanup=await restore.cleanup({limit:3});}while(!cleanup.complete);
  const before=await all(target),b=before.inputStates.find(row=>row.id!==x.a).id;target.sourceBootstrapJournal=new SourceBootstrapJournal(core);target.filterIntentJournal=new FilterIntentSyncJournal(core);target.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:target.filterIntentJournal,logicalCommits:true});target.humanLibraryJournal=new HumanLibrarySyncJournal(core);
  const human=await target.createEntry({actor:'user',body:'SYNTHETIC genuine B local Human tail 中文🙂',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});await inputEdit(target,b,{libraryText:'SYNTHETIC genuine B local Working tail 中文🙂',note:'SYNTHETIC first appended-B note'});
  const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);const plan=await prepareCurrentMixedGroupCheckpointPlan(core,operations),scope=await prepareGroupScope(plan,{store:target});
  const borrowedPrefix=await prepareOriginalCurrentMixedForeignPrefix(core,plan),referencePrefix=await prepareCurrentMixedGroupCheckpointPlan(core,operations.filter(op=>op.deviceId!==core.deviceId));
  assert.deepEqual(borrowedPrefix,referencePrefix);await assert.rejects(prepareOriginalCurrentMixedForeignPrefix(core,borrowedPrefix),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});for(const group of borrowedPrefix.groups){const owner=plan.groups.find(row=>row.id===group.id);assert.equal(group.operations,owner.operations);assert.equal(group.prepared,owner.prepared);assert.equal(group.capability,owner.capability);}
  assert.ok(measureOriginalMixedPrefixWrappers(core,plan,borrowedPrefix).V>0);assert.throws(()=>measureOriginalMixedPrefixWrappers(core,plan,structuredClone(borrowedPrefix)),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});await assert.rejects(prepareOriginalCurrentMixedForeignPrefix(core,structuredClone(plan)),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
  // A complete valid graph is not a closed prefix if its foreign Working tail
  // depends on Source created by the selected local device. Rebuild original
  // creator/parent edges; never filter dependencies/heads to manufacture a cut.
  const origin=new BrowserNativeSyncCore(target.repository,{datasetId:core.datasetId,deviceId:x.core.deviceId}),originPlan=await prepareCurrentMixedGroupCheckpointPlan(origin,operations);await assert.rejects(prepareOriginalCurrentMixedForeignPrefix(origin,originPlan),{code:'BNS_GROUP_CAUSAL_GAP'});
  const metadata=planRestoredMixedSemanticMetadata(core,scope,plan),actualMeta=(await all(target)).meta,byId=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(byId(metadata.known),byId(actualMeta.filter(row=>row.id.startsWith(KNOWN_PREFIX))));assert.deepEqual(byId(metadata.dirty),byId(actualMeta.filter(row=>row.id.startsWith(DIRTY_PREFIX))));assert.deepEqual(metadata.sequence,actualMeta.find(row=>row.id===DELTA_COUNTER));assert.deepEqual(metadata.humanFence,actualMeta.find(row=>row.id===HUMAN_FENCE));
  assert.throws(()=>planRestoredMixedSemanticMetadata(core,structuredClone(scope),plan),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
  // Current compiler's Human-first ordering differs from historical allocation.
  const localHuman=plan.groups.findIndex(group=>group.type==='humanLibraryCommit'&&group.operations[0].deviceId===core.deviceId),source=plan.groups.findIndex(group=>group.type==='sourceBootstrapCommit');assert.ok(localHuman>=0&&localHuman<source);
  assert.equal(await target.repository.transaction(false,t=>requireGroupScope(target,t,scope)),true);const actual=await all(target);
  for(const history of before.revisions)assert.equal(actual.revisions.find(row=>row.id===history.id).sequence,history.sequence);
  assert.equal(actual.meta.find(row=>row.id==='input-delta-sequence').value,5);assert.equal(actual.inputStates.find(row=>row.id===b).deltaSequence,5);assert.equal(actual.meta.find(row=>row.id==='revision-sequence').value,before.revisions.length+2);
  assert.equal((await target.entry(human.id)).body,'SYNTHETIC genuine B local Human tail 中文🙂');assert.equal((await target.input(b)).libraryText,'SYNTHETIC genuine B local Working tail 中文🙂');
  const freeze=value=>{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
  const wrongGraph=structuredClone(actual.meta),completed=wrongGraph.find(row=>row.id.endsWith(':restore:')),active=wrongGraph.find(row=>row.id===core.prefix+'active');assert.notEqual(completed.graphDigest,plan.digest);completed.graphDigest=plan.digest;active.graphDigest=plan.digest;
  await assert.rejects(prepareMixedRestoredAllocationProof(core,plan,freeze(wrongGraph)),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});
  const wrongManifest=structuredClone(actual.meta),control=wrongManifest.find(row=>row.id.endsWith(':restore:')),pointer=wrongManifest.find(row=>row.id===core.prefix+'active');control.manifest.ownerScope.families[0].digest='f'.repeat(64);const rebuilt=await protocolObject('checkpoint-manifest',bytes(control.manifest));control.manifestRef=rebuilt.ref;control.manifestId=rebuilt.ref.id;pointer.manifestId=rebuilt.ref.id;
  await assert.rejects(prepareMixedRestoredAllocationProof(core,plan,freeze(wrongManifest)),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});assert.deepEqual(await all(target),actual);
  const successor=await buildCheckpoint(core,transport,{grouped:{store:target}});await target.repository.close();
  third=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await third.consent(true);await third.finishFoundation();const nextCore=new BrowserNativeSyncCore(third.repository,{datasetId:core.datasetId,deviceId:'SYNTHETIC_mixed_fresh_third'}),nextRestore=new GroupedCheckpointRestore(nextCore,{store:third,restoreId:operationId()});await nextRestore.stageCheckpoint(successor.ref,ref=>transport.get(ref));await nextRestore.activate();do{cleanup=await nextRestore.cleanup({limit:3});}while(!cleanup.complete);
  const nextPlan=await prepareCurrentMixedGroupCheckpointPlan(nextCore,operations),nextScope=await prepareGroupScope(nextPlan,{store:third});assert.equal(await third.repository.transaction(false,t=>requireGroupScope(third,t,nextScope)),true);
  const thirdMetadata=planRestoredMixedSemanticMetadata(nextCore,nextScope,nextPlan),thirdMeta=(await all(third)).meta;
  assert.deepEqual(byId(thirdMetadata.known),byId(thirdMeta.filter(row=>row.id.startsWith(KNOWN_PREFIX))));assert.deepEqual(byId(thirdMetadata.dirty),byId(thirdMeta.filter(row=>row.id.startsWith(DIRTY_PREFIX))));assert.deepEqual(thirdMetadata.sequence,thirdMeta.find(row=>row.id===DELTA_COUNTER));assert.deepEqual(thirdMetadata.humanFence,thirdMeta.find(row=>row.id===HUMAN_FENCE));
  assert.equal((await third.entry(human.id)).body,'SYNTHETIC genuine B local Human tail 中文🙂');assert.equal((await third.input(b)).libraryText,'SYNTHETIC genuine B local Working tail 中文🙂');const stable=await all(third);await nextRestore.activate();assert.deepEqual(await all(third),stable);
  // Coherent per-Input+mapping corruption is still inconsistent with the
  // separately authenticated import allocation, even when counters are intact.
  await third.repository.transaction(true,async t=>{const edited=stable.inputStates.find(row=>row.id===b),other=stable.inputStates.find(row=>row.id!==b),owner=stable.meta.find(row=>row.id.includes(':workingOwner:')&&row.deltaSequence===edited.deltaSequence);assert.ok(owner);assert.notEqual(edited.deltaSequence,other.deltaSequence);await t.put('inputStates',{...edited,deltaSequence:other.deltaSequence});await t.put('meta',{...owner,deltaSequence:other.deltaSequence});});
  const corrupted=await all(third);assert.deepEqual(corrupted.meta.filter(row=>row.id.includes(':revision:')),stable.meta.filter(row=>row.id.includes(':revision:')));const verdict=await third.repository.transaction(false,async t=>{try{await requireGroupScope(third,t,nextScope);return 'ACCEPTED';}catch(error){return error.code;}});assert.equal(verdict,'BNS_GROUP_CANONICAL_UNREPRESENTED');
 }finally{await third?.repository.close();await target?.repository.close();await x.s.repository.close();}
});

test('initial original mixed Scope rejects coherent Human query sequence and mapping tampering despite unchanged sealed operations',async()=>{
 const x=await producer();try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),scope=await prepareGroupScope(plan,{store:x.s}),before=await all(x.s),entry=before.thoughts[0],mapping=before.meta.find(row=>row.type==='entry'&&row.id.includes(':humanMapping:'));
 assert.ok(mapping);await x.s.repository.transaction(true,async t=>{await t.put('thoughts',{...entry,createdSequence:100,updatedSequence:100,negativeUpdatedSequence:-100});await t.put('meta',{...mapping,local:{createdSequence:100,updatedSequence:100,negativeUpdatedSequence:-100}});await t.put('meta',{id:'thought-sequence',value:101});});
 const changed=await all(x.s);assert.deepEqual(changed.meta.filter(row=>row.id.includes(':revision:')),before.meta.filter(row=>row.id.includes(':revision:')));
 const verdict=await x.s.repository.transaction(false,async t=>{try{await requireGroupScope(x.s,t,scope);return 'ACCEPTED';}catch(error){return error.code;}});assert.equal(verdict,'BNS_GROUP_CANONICAL_UNREPRESENTED');assert.deepEqual(await all(x.s),changed);
 }finally{await x.s.repository.close();}
});
test('initial original mixed Scope rejects altered Human domain result and extra receipt inventory without touching the whole37 cut',async()=>{
 const x=await producer();try{const plan=await prepareCurrentMixedGroupCheckpointPlan(x.core,x.operations),scope=await prepareGroupScope(plan,{store:x.s}),before=await all(x.s),receipt=before.operationReceipts.find(row=>row.namespace==='thought-library');assert.ok(receipt);
 await x.s.repository.transaction(true,async t=>{await t.put('operationReceipts',{...receipt,result:{...receipt.result,revision:999}});await t.put('operationReceipts',{...receipt,id:'SYNTHETIC_extra_receipt',operationSequence:888});});const changed=await all(x.s);
 const verdict=await x.s.repository.transaction(false,async t=>{try{await requireGroupScope(x.s,t,scope);return 'ACCEPTED';}catch(error){return error.code;}});assert.equal(verdict,'BNS_GROUP_CANONICAL_UNREPRESENTED');assert.deepEqual(await all(x.s),changed);
 }finally{await x.s.repository.close();}
});

test('authenticated restored prefix and genuine local Human tail reject physical counters, exact domain receipt phases and unknown retries',async()=>{
 const x=await producer();let target;try{
  const objects=new Map(),transport={async putImmutable(ref,body){objects.set(ref.id,body.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(x.core,transport,{grouped:{store:x.s}});await x.s.repository.close();
  target=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await target.consent(true);await target.finishFoundation();const core=new BrowserNativeSyncCore(target.repository,{datasetId:x.core.datasetId,deviceId:'SYNTHETIC_human_physical_restored'}),restore=new GroupedCheckpointRestore(core,{store:target,restoreId:operationId()});await restore.stageCheckpoint(cut.ref,ref=>transport.get(ref));await restore.activate();let cleanup;do{cleanup=await restore.cleanup({limit:3});}while(!cleanup.complete);
  target.humanLibraryJournal=new HumanLibrarySyncJournal(core);await target.createEntry({actor:'user',body:'SYNTHETIC original local Human after restored prefix',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
  const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);const plan=await prepareCurrentMixedGroupCheckpointPlan(core,operations),scope=await prepareGroupScope(plan,{store:target}),before=await all(target);assert.equal(await target.repository.transaction(false,t=>requireGroupScope(target,t,scope)),true);
  for(const kind of ['entry-and-mapping','thought-counter','topic-physical','receipt-sequence','receipt-clock','receipt-result','unknown-retry']){
   const entry=before.thoughts[0],topic=before.topics[0],mapping=before.meta.find(row=>row.type==='entry'&&row.id.includes(':humanMapping:')&&row.local.createdSequence===entry.createdSequence),receipt=before.operationReceipts[0];
   await target.repository.transaction(true,async t=>{
    if(kind==='entry-and-mapping'){await t.put('thoughts',{...entry,createdSequence:777,updatedSequence:777,negativeUpdatedSequence:-777});await t.put('meta',{...mapping,local:{createdSequence:777,updatedSequence:777,negativeUpdatedSequence:-777}});}
    if(kind==='thought-counter')await t.put('meta',{id:'thought-sequence',value:888});
    if(kind==='topic-physical')await t.put('topics',{...topic,negativeUpdatedSequence:-999});
    if(kind==='receipt-sequence')await t.put('operationReceipts',{...receipt,operationSequence:999});
    if(kind==='receipt-clock')await t.put('operationReceipts',{...receipt,createdAt:'2026-10-11T00:00:00.000Z'});
    if(kind==='receipt-result')await t.put('operationReceipts',{...receipt,result:{...receipt.result,revision:999}});
    if(kind==='unknown-retry')await t.put('operationReceipts',{...receipt,id:'SYNTHETIC_extra_receipt',namespace:'SYNTHETIC_unknown'});
   });const changed=await all(target);assert.deepEqual(changed.meta.filter(row=>row.id.includes(':revision:')),before.meta.filter(row=>row.id.includes(':revision:')));
   const verdict=await target.repository.transaction(false,async t=>{try{await requireGroupScope(target,t,scope);return 'ACCEPTED';}catch(error){return error.code;}});assert.equal(verdict,'BNS_GROUP_CANONICAL_UNREPRESENTED',kind);assert.deepEqual(await all(target),changed);
   await target.repository.transaction(true,async t=>{for(const name of ['thoughts','topics','meta','operationReceipts']){await t.clear(name);for(const row of before[name])await t.put(name,row);}});
   assert.equal(await target.repository.transaction(false,t=>requireGroupScope(target,t,scope)),true,'exact original restoration after '+kind);
  }
 }finally{if(target)await target.repository.close();await x.s.repository.close();}
});
