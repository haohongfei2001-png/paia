import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {MemoryService} from '../core/memory/service.js';
import {key,profileDefault,validateMemoryRow} from '../core/memory/model.js';
import {rootReadAuthority} from '../core/organizer/root-read.js';
import {setTopicLifecycle} from '../core/topic-identity.js';
import {markHuman} from '../core/thought-model.js';
import {BackupService as ExistingFileFixture} from './harness/context-legacy-file.mjs';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';
import {contextTopicOperationReservation,contextTopicSelectionBinding,evaluateContextTopicAccess} from '../core/context-topic-access-policy.js';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const authority=s=>s.repository.transaction(false,t=>rootReadAuthority(t));
const reservations=async(s,topics)=>s.repository.transaction(false,async t=>{const rows=[];for(const id of new Set(topics.map(row=>row.protections?.organization?.operationId).filter(Boolean))){const fact=contextTopicOperationReservation(await t.get('operationReceipts',id));if(fact)rows.push(fact);}return rows;});
const legacyTopic=(topic,decision,profileId='default')=>({id:key('topic',profileId,topic.id),kind:'topic',version:1,profileId,topicId:topic.id,decision,layoutGeneration:topic.activeLayoutGeneration});
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 const created=await s.createTopic({name:'SYNTHETIC personal object',operationId:op()});
 const entry=await s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC independent Thought body',type:'idea',formation:'explicit',evidence:[]});
 const row=await s.entry(entry.id);
 await s.placeEntry({entryId:entry.id,topicId:created.id,operationId:op(),expectedEntryRevision:row.revision,expectedTopicRevision:0});
 const topic=await raw(s,'topics',created.id),input=(await s.snapshot()).library.blocks[0];
 const c=new ContextCardsService(s),m=new MemoryService(s);await m.ready();
 const context=await c.snapshot(),current=await authority(s),legacyRows=(await m.s.repository.transaction(false,t=>m.state(t))).rows;
 // There is no whole-Topic eligibility snapshot producer yet. This finite
 // body-free contract fixture describes known test refs; trusted production
 // aggregation, full content and connection checks remain integration work.
 const scope={complete:true,legacyComplete:true,eligibility:'eligible',topicIds:[topic.id],entryIds:[entry.id],inputIds:[input.id],sections:[{topicId:topic.id,sectionId:topic.defaultSectionId}]};
 const inputSnapshot={context,topics:[topic],topicId:topic.id,selection:null,legacyRows,scope,capturedAuthority:current,currentAuthority:current,organizationReservations:[]};
 return {s,c,m,topic,entry,input,inputSnapshot};
}
async function enabled(f){
 for(const name of ['global','inputs'])await f.c.change({kind:'access',operationId:op(),epoch:'initial',key:name,enabled:true,expectedRevision:0});
 f.inputSnapshot.context=await f.c.snapshot();
 f.inputSnapshot.capturedAuthority=f.inputSnapshot.currentAuthority=await authority(f.s);
 f.inputSnapshot.selection={...contextTopicSelectionBinding(f.topic,'initial'),enabled:true};
 return f.inputSnapshot;
}
const evaluate=evaluateContextTopicAccess;
const denied=value=>{const answer=evaluate(value);assert.equal(answer.policyAllowed,false);assert.equal(answer.externalAllowed,false);return answer;};

// These actual owner fixtures deliberately contain empty Topics. Their complete
// finite scope is known without inventing the still-missing production reader.
async function emptyTopicPair(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 const a=await s.createTopic({name:'SYNTHETIC source object',operationId:op()}),b=await s.createTopic({name:'SYNTHETIC survivor object',operationId:op()}),c=new ContextCardsService(s),m=new MemoryService(s);await m.ready();
 for(const key of ['global','inputs'])await c.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:0});
 const request=async(topicId,selection)=>s.repository.transaction(false,async t=>{
  const epoch=await c.admitted(t),row=await c.row(t),currentAuthority=await rootReadAuthority(t),topics=await t.all('topics'),organizationReservations=[];
  for(const id of new Set(topics.map(row=>row.protections?.organization?.operationId).filter(Boolean))){const fact=contextTopicOperationReservation(await t.get('operationReceipts',id));if(fact)organizationReservations.push(fact);}
  return {context:{version:1,epoch,access:row.access},topics,topicId,selection,legacyRows:(await m.state(t)).rows,scope:{complete:true,legacyComplete:true,eligibility:'eligible',topicIds:[topicId],entryIds:[],inputIds:[],sections:[]},capturedAuthority:currentAuthority,currentAuthority,organizationReservations};
 });
 const selection=async id=>{const topic=await raw(s,'topics',id),facts=await reservations(s,[topic]),binding=contextTopicSelectionBinding(topic,(await c.snapshot()).epoch,facts[0]??null);return binding?{...binding,enabled:true}:null;};
 const merge=async()=>{await s.startLayout({kind:'topic_merge',topicId:a.id,survivorId:b.id,expectedTopicRevision:(await raw(s,'topics',a.id)).organizationRevision,expectedSurvivorRevision:(await raw(s,'topics',b.id)).organizationRevision,operationId:op()});await s.drainLibraryMaintenance();return (await s.revisions({kind:'topic',entityId:b.id})).items.find(x=>x.reason==='merge');};
 const restore=async(rev,side)=>s.restoreRevision({id:rev.id,side,expectedRevision:(await raw(s,'topics',b.id)).revision,operationId:op()});
 return {s,c,m,a,b,request,selection,merge,restore};
}

test('CTX4-03 actual merge Undo/redo cannot revive source or survivor bindings, including an unobserved merge',async()=>{
 for(const observeMerged of [false,true]){
  const f=await emptyTopicPair(),ids=[f.a.id,f.b.id],original=new Map();
  for(const id of ids){original.set(id,await f.selection(id));assert.equal(evaluate(await f.request(id,original.get(id))).policyAllowed,true);}
  const rev=await f.merge();
  if(observeMerged){assert.equal(denied(await f.request(f.a.id,original.get(f.a.id))).reason,'topic_unavailable');assert.equal(denied(await f.request(f.b.id,original.get(f.b.id))).reason,'selection_stale');}
  await f.restore(rev,'before');
  const renewed=new Map();
  for(const id of ids){
   const answer=denied(await f.request(id,original.get(id)));assert.equal(answer.reason,'selection_stale');assert.equal(answer.selected,true,'retain the old choice without reviving its allowance');
   renewed.set(id,await f.selection(id));assert.notEqual(renewed.get(id).organizationOperationId,original.get(id).organizationOperationId);assert.equal(evaluate(await f.request(id,renewed.get(id))).policyAllowed,true);
  }
  await f.restore(rev,'after');
  if(observeMerged){assert.equal(denied(await f.request(f.a.id,renewed.get(f.a.id))).reason,'topic_unavailable');assert.equal(denied(await f.request(f.b.id,renewed.get(f.b.id))).reason,'selection_stale');}
  await f.restore(rev,'before');
  for(const id of ids){for(const old of [original.get(id),renewed.get(id)])assert.equal(denied(await f.request(id,old)).reason,'selection_stale');assert.equal(evaluate(await f.request(id,await f.selection(id))).policyAllowed,true);}
 }
});

test('CTX4-03 actual same-Topic layout Undo cannot restore an old selection generation',async()=>{
 const f=await emptyTopicPair(),id=f.b.id,other=await f.s.createSection({topicId:id,title:'SYNTHETIC named section',expectedTopicRevision:0,operationId:op()}),before=await raw(f.s,'topics',id),selection=await f.selection(id);
 await f.s.startLayout({kind:'section_order',topicId:id,sectionId:before.defaultSectionId,otherSectionId:other.sectionId,expectedTopicRevision:before.organizationRevision,operationId:op()});await f.s.drainLibraryMaintenance();
 const rev=(await f.s.revisions({kind:'topic',entityId:id})).items.find(x=>x.reason==='reorder');await f.restore(rev,'before');
 assert.equal((await raw(f.s,'topics',id)).activeLayoutGeneration,before.activeLayoutGeneration);
 assert.equal(denied(await f.request(id,selection)).reason,'selection_stale');assert.equal(evaluate(await f.request(id,await f.selection(id))).policyAllowed,true);
});

test('CTX4-03 current structural operation reservation prevents cross-command reuse after selection',async()=>{
 const f=await emptyTopicPair(),rev=await f.merge();await f.restore(rev,'before');
 const selection=await f.selection(f.b.id),reserved=selection.organizationOperationId,before=await f.s.repository.transaction(false,t=>t.all('topics'));
 assert.equal((await raw(f.s,'operationReceipts',reserved)).namespace,'thought-library');
 await assert.rejects(f.s.startLayout({kind:'topic_merge',topicId:f.a.id,survivorId:f.b.id,expectedTopicRevision:(await raw(f.s,'topics',f.a.id)).organizationRevision,expectedSurvivorRevision:(await raw(f.s,'topics',f.b.id)).organizationRevision,operationId:reserved}));
 await assert.rejects(f.s.renameTopic({id:f.b.id,name:'SYNTHETIC reused operation',expectedRevision:(await raw(f.s,'topics',f.b.id)).revision,operationId:reserved}));
 assert.deepEqual(await f.s.repository.transaction(false,t=>t.all('topics')),before);assert.equal(evaluate(await f.request(f.b.id,selection)).policyAllowed,true);
});

test('CTX4-03 actual owner rename, aliases, activity and appended membership preserve the structural binding',async()=>{
 const f=await fixture(),request=await enabled(f),selection=structuredClone(request.selection);
 await f.s.renameTopic({id:f.topic.id,name:'SYNTHETIC same identity renamed',expectedRevision:f.topic.revision,operationId:op()});
 let topic=await raw(f.s,'topics',f.topic.id);assert.ok(topic.identity.aliases.length>0);assert.deepEqual(contextTopicSelectionBinding(topic,'initial'),Object.fromEntries(Object.entries(selection).filter(([key])=>key!=='enabled')));
 for(const to of ['dormant','active']){
  // Use the actual Topic01 lifecycle owner. Activity may separately advance
  // organization revision; that broad revision must not invalidate a choice.
  await f.s.foundationWrite(async t=>{const row=await t.get('topics',f.topic.id);setTopicLifecycle(row,to,{actor:'ai',operationId:op(),at:f.s.clock()});row.revision++;row.organizationRevision++;await t.put('topics',row);});
  request.topics=[await raw(f.s,'topics',f.topic.id)];request.capturedAuthority=request.currentAuthority=await authority(f.s);assert.equal(evaluate(request).policyAllowed,true);
 }
 const entry=await f.s.createEntry({actor:'user',body:'SYNTHETIC later independent body',type:'idea',formation:'explicit',evidence:[],operationId:op()});topic=await raw(f.s,'topics',f.topic.id);
 await f.s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:0,expectedTopicRevision:topic.organizationRevision,operationId:op()});
 request.topics=[await raw(f.s,'topics',topic.id)];request.scope.entryIds.push(entry.id);request.capturedAuthority=request.currentAuthority=await authority(f.s);
 assert.equal(evaluate(request).policyAllowed,true);assert.deepEqual(request.selection,selection);
});

test('CTX4-03 actual Topic remove/restore and same-name recreation never inherit old bindings',async()=>{
 const f=await emptyTopicPair(),id=f.a.id,selection=await f.selection(id);
 await f.s.removeTopic({id,expectedRevision:(await raw(f.s,'topics',id)).revision,operationId:op()});assert.equal(denied(await f.request(id,selection)).reason,'topic_unavailable');
 await f.s.restoreTopicContainer({id,expectedRevision:(await raw(f.s,'topics',id)).revision,operationId:op()});assert.equal(denied(await f.request(id,selection)).reason,'selection_stale');
 const other=await f.s.createTopic({name:(await raw(f.s,'topics',id)).name,operationId:op()});assert.equal(denied(await f.request(other.id,selection)).selected,false);assert.equal(denied(await f.request(other.id,null)).reason,'topic_off');
});

test('CTX4-03 actual existing-file replacement cannot revive a pre-merge selection even when old owner markers return',async()=>{
 const f=await emptyTopicPair(),original=new Map();for(const id of [f.a.id,f.b.id])original.set(id,await f.selection(id));
 const oldFile=await exported(new ExistingFileFixture(f.s));await f.merge();
 const backup=new BackupService(f.s),stage=await prepared(backup,oldFile),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});
 for(const id of [f.a.id,f.b.id]){const request=await f.request(id,original.get(id));assert.equal(request.topics.find(row=>row.id===id).protections.organization,undefined);assert.notEqual(request.context.epoch,original.get(id).epoch);assert.equal(denied(request).reason,'selection_stale');}
});

test('CTX4-03 structural binding requires explicit null or a valid current owner marker and never upgrades an old shape',async()=>{
 const f=await fixture(),request=await enabled(f);assert.equal(request.selection.organizationOperationId,null);
 const old=structuredClone(request);delete old.selection.organizationOperationId;assert.equal(denied(old).reason,'invalid_selection');
 for(const value of [undefined,7,'short','',{},false]){const next=structuredClone(request);next.selection.organizationOperationId=value;assert.equal(denied(next).reason,'invalid_selection');}
 const absent=structuredClone(request);absent.topics[0].protections={};assert.equal(evaluate(absent).policyAllowed,true,'genuine absent organization marker has an explicit null baseline');
 for(const protections of [undefined,null,[],{organization:null},{organization:undefined},{organization:{}},
  {organization:{locked:false,reason:'restore',operationId:op(),at:f.s.clock()}},
  {organization:{locked:true,reason:'legacy_unknown',operationId:op(),at:f.s.clock()}},
  {organization:{locked:true,reason:'legacy_unknown',operationId:null,at:f.s.clock()}},
  {organization:{locked:true,reason:'restore',operationId:'short',at:f.s.clock()}},
  {organization:{locked:true,reason:'restore',operationId:op(),at:'invalid'}},
  {organization:{locked:true,reason:'restore',operationId:op(),at:f.s.clock(),grant:true}}
 ]){
  const next=structuredClone(request);next.topics[0].protections=protections;
  assert.equal(denied(next).reason,'invalid_snapshot');assert.equal(contextTopicSelectionBinding(next.topics[0],'initial'),null);
 }
 const changed=structuredClone(request),id=op();changed.topics[0].protections.organization={locked:true,reason:'restore',operationId:id,at:f.s.clock()};assert.equal(denied(changed).reason,'organization_unavailable');assert.equal(contextTopicSelectionBinding(changed.topics[0],'initial'),null);
 const fact=contextTopicOperationReservation({id,namespace:'thought-library',schemaVersion:1,ownerId:f.topic.id,operationSequence:1,createdAt:f.s.clock(),digest:'a'.repeat(64),result:{id:f.topic.id,revision:1}});changed.organizationReservations=[fact];assert.equal(denied(changed).reason,'selection_stale');
 changed.selection={...contextTopicSelectionBinding(changed.topics[0],'initial',fact),enabled:true};assert.equal(evaluate(changed).policyAllowed,true);
});

test('CTX4-03 raw operation reservation validates committed truthy results without transporting them',async()=>{
 const f=await emptyTopicPair(),rev=await f.merge();await f.restore(rev,'before');const selection=await f.selection(f.b.id),receipt=await raw(f.s,'operationReceipts',selection.organizationOperationId),fact=contextTopicOperationReservation(receipt);
 assert.deepEqual(fact,{operationId:receipt.id,sequence:receipt.operationSequence,digest:receipt.digest});assert.deepEqual(Object.keys(fact),['operationId','sequence','digest']);assert.equal(Object.hasOwn(fact,'result'),false);
 const mutations=[
  row=>{delete row.result;},row=>{row.result=null;},row=>{row.result=false;},row=>{row.result=0;},row=>{row.result='committed';},row=>{row.result={};},row=>{row.result={id:row.ownerId,conflict:true};},row=>{row.result={id:row.ownerId,revision:1,body:'SYNTHETIC forbidden payload'};},
  row=>{row.result.id=op();},row=>{row.result.revision=-1;},row=>{row.namespace='context-cards';},row=>{row.schemaVersion=2;},row=>{row.operationSequence=0;},row=>{row.operationSequence=NaN;},row=>{row.digest='unknown';},row=>{delete row.digest;},row=>{row.createdAt='unknown';},row=>{row.id='short';},row=>{row.extra=true;}
 ];
 for(const mutate of mutations){const next=structuredClone(receipt);mutate(next);assert.equal(contextTopicOperationReservation(next),null);}
 for(const value of [undefined,null,[],false])assert.equal(contextTopicOperationReservation(value),null);
 const topic=await raw(f.s,'topics',f.b.id);assert.equal(contextTopicSelectionBinding(topic,'initial'),null);assert.equal(contextTopicSelectionBinding(topic,'initial',{...fact,operationId:op()}),null);
 const request=await f.request(f.b.id,selection);
 for(const value of [undefined,null,[],[fact,fact],[{...fact,body:'SYNTHETIC forbidden body'}],[{...fact,sequence:0}],[{...fact,digest:'unknown'}],Array(4097).fill(fact)]){const next=structuredClone(request);next.organizationReservations=value;assert.equal(denied(next).reason,'organization_unavailable');}
 const replaced=structuredClone(request);replaced.organizationReservations=replaced.organizationReservations.map(row=>row.operationId===fact.operationId?{...row,sequence:row.sequence+1}:row);assert.equal(denied(replaced).reason,'selection_stale');
 const changed=structuredClone(request);changed.organizationReservations=changed.organizationReservations.map(row=>row.operationId===fact.operationId?{...row,digest:'b'.repeat(64)}:row);assert.equal(denied(changed).reason,'selection_stale');
});

test('CTX4-03 actual imported unreserved marker cannot create a choice or revive one through later ID reuse',async()=>{
 const f=await emptyTopicPair(),unreserved=op();
 await f.s.foundationWrite(async t=>{for(const id of [f.a.id,f.b.id]){const row=await t.get('topics',id);markHuman(row,'organization',unreserved,f.s.clock());await t.put('topics',row);}});
 const file=await exported(new ExistingFileFixture(f.s)),backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});
 assert.equal(await raw(f.s,'operationReceipts',unreserved),undefined);
 for(const id of [f.a.id,f.b.id]){assert.equal(await f.selection(id),null);assert.equal(denied(await f.request(id,null)).reason,'organization_unavailable');}
 const rev=await f.merge();await f.s.restoreRevision({id:rev.id,side:'before',expectedRevision:(await raw(f.s,'topics',f.b.id)).revision,operationId:unreserved});
 for(const id of [f.a.id,f.b.id]){assert.equal(denied(await f.request(id,null)).reason,'topic_off');const fresh=await f.selection(id);assert.equal(fresh.organizationOperationId,unreserved);assert.equal(evaluate(await f.request(id,fresh)).policyAllowed,true);}
});

test('CTX4-03 actual restored null or false receipt results are not operation reservations',async()=>{
 for(const result of [null,false]){
  const f=await emptyTopicPair(),marker=op();
  await f.s.foundationWrite(async t=>{const row=await t.get('topics',f.a.id);markHuman(row,'organization',marker,f.s.clock());await t.put('topics',row);await t.put('operationReceipts',{id:marker,namespace:'thought-library',schemaVersion:1,ownerId:f.a.id,operationSequence:1,createdAt:f.s.clock(),digest:'a'.repeat(64),result});});
  const file=await exported(new ExistingFileFixture(f.s)),backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);
  await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});
  const receipt=await raw(f.s,'operationReceipts',marker);assert.equal(receipt.result,result);assert.equal(contextTopicOperationReservation(receipt),null);assert.equal(await f.selection(f.a.id),null);assert.equal(denied(await f.request(f.a.id,null)).reason,'organization_unavailable');
 }
});

test('CTX4-03 pure prerequisites default off and never manufacture a current external capability',async()=>{
 const f=await fixture(),before=structuredClone(f.inputSnapshot);
 assert.deepEqual(evaluate(f.inputSnapshot),{selected:false,policyAllowed:false,externalAllowed:false,reason:'topic_off'});
 assert.deepEqual(f.inputSnapshot,before);
 const ready=await enabled(f);
 assert.equal(ready.context.capabilities.inputs,false,'real owner still has no Topic reader');
 assert.equal(ready.context.capabilities.external,false);
 assert.deepEqual(evaluate(ready),{selected:true,policyAllowed:true,externalAllowed:false,reason:'policy_allowed'});
});

test('CTX4-03 real Context parent toggles retain the same child choice and independent Item bytes',async()=>{
 const f=await fixture();await f.c.change({kind:'put',itemId:op(),operationId:op(),epoch:'initial',expectedRevision:0,body:'SYNTHETIC independent Info item',section:'Manual'});
 const request=await enabled(f),selection=structuredClone(request.selection),items=structuredClone(request.context.items);
 for(const key of ['global','inputs']){
  const current=request.context.access[key];await f.c.change({kind:'access',key,enabled:false,expectedRevision:current.revision,operationId:op(),epoch:'initial'});
  request.context=await f.c.snapshot();request.capturedAuthority=request.currentAuthority=await authority(f.s);
  const answer=denied(request);assert.equal(answer.selected,true);assert.equal(answer.reason,key==='global'?'global_off':'inputs_off');
  assert.deepEqual(request.selection,selection);assert.deepEqual(request.context.items,items);
  await f.c.change({kind:'access',key,enabled:true,expectedRevision:request.context.access[key].revision,operationId:op(),epoch:'initial'});
  request.context=await f.c.snapshot();request.capturedAuthority=request.currentAuthority=await authority(f.s);
 }
 request.selection.enabled=false;assert.equal(denied(request).reason,'topic_off');assert.deepEqual((await f.c.snapshot()).items,items);
});

test('CTX4-03 actual same-ID rename retains selection after fresh authority but a new same-name identity remains closed',async()=>{
 const f=await fixture(),request=await enabled(f),selection=structuredClone(request.selection);
 await f.s.renameTopic({id:f.topic.id,name:'SYNTHETIC renamed object',expectedRevision:f.topic.revision,operationId:op()});
 request.topics=[await raw(f.s,'topics',f.topic.id)];request.currentAuthority=await authority(f.s);
 assert.equal(denied(request).reason,'stale_authority');request.capturedAuthority=request.currentAuthority;
 assert.equal(evaluate(request).policyAllowed,true);assert.deepEqual(request.selection,selection);
 assert.ok(request.topics[0].identity.aliases.length>0,'actual rename records aliases without changing the access binding');
 const other=await f.s.createTopic({name:'SYNTHETIC renamed object',operationId:op()}),newTopic=await raw(f.s,'topics',other.id);
 request.topics.push(newTopic);request.topicId=newTopic.id;request.scope={complete:true,legacyComplete:true,eligibility:'eligible',topicIds:[newTopic.id],entryIds:[],inputIds:[],sections:[]};
 request.capturedAuthority=request.currentAuthority=await authority(f.s);
 assert.equal(denied(request).selected,false);request.selection=null;assert.equal(denied(request).reason,'topic_off');
});

test('CTX4-03 dormancy retains identity/choice; candidate, removed, merged and layout-in-flight rows refuse',async()=>{
 const f=await fixture(),request=await enabled(f),before=structuredClone(request.selection);
 request.topics[0].lifecycle='dormant';request.topics[0].identity.revision++;
 assert.equal(evaluate(request).policyAllowed,true);assert.deepEqual(request.selection,before);
 for(const lifecycle of ['candidate','removed','merged']){const next=structuredClone(request);next.topics[0].lifecycle=lifecycle;assert.equal(denied(next).reason,'topic_unavailable');assert.equal(contextTopicSelectionBinding(next.topics[0],'initial'),null);}
 for(const patch of [{layoutJobId:op()},{identity:{...f.topic.identity,noRecreation:true}}]){const next=structuredClone(request);Object.assign(next.topics[0],patch);assert.equal(denied(next).reason,'topic_unavailable');}
});

test('CTX4-03 replacement, structural generation, remove/restore and database restore cannot revive an old choice',async()=>{
 const f=await fixture(),request=await enabled(f);
 for(const patch of [{createdAt:'2027-01-01T00:00:00Z'},{activeLayoutGeneration:f.topic.activeLayoutGeneration+1},{removalOperationId:op()}]){
  const next=structuredClone(request);Object.assign(next.topics[0],patch);assert.equal(denied(next).reason,'selection_stale');assert.equal(denied(next).selected,true);
 }
 const restored=structuredClone(request);restored.context.epoch=op();assert.equal(denied(restored).reason,'selection_stale');
 const promoted=structuredClone(request);promoted.topics[0].id=op();promoted.topicId=promoted.topics[0].id;promoted.scope.topicIds=[promoted.topicId];promoted.scope.sections=[];assert.equal(denied(promoted).selected,false);
});

test('CTX4-03 redirect chains, cycles and missing raw identities never transfer or union a selection',async()=>{
 const f=await fixture(),request=await enabled(f),target={...structuredClone(f.topic),id:op()};
 request.topics.push(target);request.topics[0].redirectTo=target.id;request.topics[0].lifecycle='merged';
 assert.equal(denied(request).reason,'topic_unavailable');
 const survivor=structuredClone(request);survivor.topicId=target.id;survivor.scope={complete:true,legacyComplete:true,eligibility:'eligible',topicIds:[target.id],entryIds:[],inputIds:[],sections:[]};assert.equal(denied(survivor).selected,false);
 survivor.selection=null;assert.equal(denied(survivor).reason,'topic_off');
 request.topics[1].redirectTo=f.topic.id;request.topics[1].lifecycle='merged';assert.equal(denied(request).reason,'topic_unavailable');
 request.topics.shift();assert.equal(denied(request).reason,'incomplete_scope');
});

test('CTX4-03 any legacy Profile deny/never dominates a new selection, without converting old allows',async()=>{
 const f=await fixture(),request=await enabled(f),custom={...profileDefault(),id:key('profile','other'),profileId:'other',name:'SYNTHETIC legacy Profile'};
 for(const decision of ['denied','never']){
  request.legacyRows=[custom,legacyTopic(f.topic,'allowed'),legacyTopic(f.topic,decision,'other')];assert.ok(request.legacyRows.every(validateMemoryRow));assert.equal(denied(request).reason,'legacy_restricted');
  request.legacyRows[2].layoutGeneration++;assert.equal(denied(request).reason,'legacy_restricted','stale layout cannot erase a hard restriction');
 }
 request.legacyRows=[legacyTopic(f.topic,'allowed')];request.selection=null;assert.equal(denied(request).reason,'topic_off');
 request.selection={...contextTopicSelectionBinding(f.topic,'initial'),enabled:true};request.legacyRows[0].layoutGeneration++;assert.equal(evaluate(request).policyAllowed,true,'old allow contributes no authority; explicit current choice is independent');
});

test('CTX4-03 real legacy Entry/Input/Section exclusions and local-only controls remain stronger than new allow',async()=>{
 for(const target of ['entry','input','section','local']){
  const f=await fixture(),request=await enabled(f);
  if(target==='entry')await f.m.exclude({entryId:f.entry.id,excluded:true});
  else if(target==='input')await f.m.exclude({inputId:f.input.id,excluded:true});
  else if(target==='section')await f.m.exclude({topicId:f.topic.id,sectionId:f.topic.defaultSectionId,excluded:true});
  else await f.m.settings({localOnly:true});
  request.legacyRows=(await f.s.repository.transaction(false,t=>f.m.state(t))).rows;request.capturedAuthority=request.currentAuthority=await authority(f.s);
  assert.equal(denied(request).reason,'legacy_restricted');
 }
});

test('CTX4-03 restrictive shared membership is not bypassed by an allowed Topic path',async()=>{
 const f=await fixture(),request=await enabled(f),other={...structuredClone(f.topic),id:op()};
 request.topics.push(other);request.scope.topicIds.push(other.id);request.scope.sections.push({topicId:other.id,sectionId:'SYNTHETIC shared section'});
 request.legacyRows.push(legacyTopic(other,'never','another-profile'));assert.equal(denied(request).reason,'legacy_restricted');
 request.legacyRows.pop();request.legacyRows.push({id:key('section',other.id,'SYNTHETIC shared section'),kind:'section',version:1,topicId:other.id,sectionId:'SYNTHETIC shared section',excluded:true});assert.equal(denied(request).reason,'legacy_restricted');
});

test('CTX4-03 legacy denials survive one/two-hop merges but old allows never transfer',async()=>{
 const f=await fixture(),request=await enabled(f);
 const ancestor={...structuredClone(f.topic),id:op(),lifecycle:'merged',redirectTo:f.topic.id,identity:{...f.topic.identity,noRecreation:true}};
 const older={...structuredClone(ancestor),id:op(),redirectTo:ancestor.id};
 request.topics.push(ancestor,older);
 for(const source of [ancestor,older])for(const decision of ['denied','never']){
  request.legacyRows=[legacyTopic(source,decision,'old-profile')];assert.equal(denied(request).reason,'legacy_restricted');
 }
 request.legacyRows=[legacyTopic(older,'allowed')];request.selection=null;
 assert.equal(denied(request).reason,'topic_off');
 request.selection={...contextTopicSelectionBinding(f.topic,'initial'),enabled:true};
 assert.equal(evaluate(request).policyAllowed,true,'a fresh survivor selection can pass only when no hard ancestor restriction exists');
});

test('CTX4-03 merged Section restrictions conservatively cover the survivor and shared paths',async()=>{
 const f=await fixture(),request=await enabled(f),survivor={...structuredClone(f.topic),id:op()},ancestor={...structuredClone(f.topic),id:op(),lifecycle:'merged',identity:{...f.topic.identity,noRecreation:true}};
 ancestor.redirectTo=survivor.id;request.topics.push(ancestor,survivor);request.scope.topicIds.push(survivor.id);
 request.legacyRows=[{id:key('section',ancestor.id,'SYNTHETIC old section'),kind:'section',version:1,topicId:ancestor.id,sectionId:'SYNTHETIC old section',excluded:true}];
 assert.equal(denied(request).reason,'legacy_restricted','shared survivor path cannot discard an unmapped old Section restriction');
});

test('CTX4-03 restrictive lineage with missing, cyclic, malformed or over-depth redirect facts refuses',async()=>{
 const f=await fixture(),request=await enabled(f),ancestor={...structuredClone(f.topic),id:op(),lifecycle:'merged',redirectTo:f.topic.id};
 for(const alter of [
  row=>{row.redirectTo=op();},row=>{row.redirectTo=row.id;},row=>{delete row.redirectTo;},row=>{row.lifecycle='removed';}
 ]){const next=structuredClone(request),row=structuredClone(ancestor);alter(row);next.topics.push(row);next.legacyRows=[legacyTopic(row,'never')];assert.equal(denied(next).reason,'legacy_unavailable');}
 const missing=structuredClone(request);missing.legacyRows=[legacyTopic(ancestor,'never')];assert.equal(denied(missing).reason,'legacy_unavailable');
 const deep=structuredClone(request);let target=f.topic.id;
 for(let index=0;index<33;index++){const row={...structuredClone(ancestor),id:op(),redirectTo:target};deep.topics.push(row);target=row.id;}
 deep.legacyRows=[legacyTopic(deep.topics.at(-1),'denied')];assert.equal(denied(deep).reason,'legacy_unavailable');
});

test('CTX4-03 real Source purge and missing/unknown eligibility refuse without an Archive fallback',async()=>{
 const f=await fixture(),request=await enabled(f),sourceIds=[f.input.sourceRecordId];
 assert.equal(await f.s.repository.transaction(false,t=>f.m.safeSources(t,sourceIds)),true);
 await f.s.permanentDelete(f.input.sourceRecordId);
 const eligible=await f.s.repository.transaction(false,t=>f.m.safeSources(t,sourceIds));assert.equal(eligible,false);
 request.scope.eligibility=eligible?'eligible':'ineligible';request.capturedAuthority=request.currentAuthority=await authority(f.s);
 assert.equal(denied(request).reason,'content_unavailable');request.scope.eligibility='unknown';assert.equal(denied(request).reason,'content_unavailable');
 delete request.scope.eligibility;assert.equal(denied(request).reason,'incomplete_scope');
});

test('CTX4-03 incomplete, stale or malformed consumed authority fields are never positive',async()=>{
 const f=await fixture(),request=await enabled(f);
 const mutations=[
  next=>{next.currentAuthority+='changed';},next=>{next.capturedAuthority='';},next=>{next.currentAuthority=null;},
  next=>{next.scope.complete=false;},next=>{delete next.scope.legacyComplete;},next=>{next.scope.legacyComplete=false;},next=>{next.scope.eligibility='maybe';},next=>{next.scope.topicIds.push(op());},
  next=>{next.topics.push(structuredClone(next.topics[0]));},next=>{next.topics[0].identity.version=2;},next=>{delete next.topics[0].identity;},
  next=>{next.legacyRows=[{kind:'unknown',id:'memory:unknown',version:1}];},next=>{next.legacyRows.push(structuredClone(next.legacyRows[0]));},
  next=>{next.context.access.inputs.enabled='yes';},next=>{next.selection.layoutGeneration=0;},next=>{next.selection.extraGrant=true;},
  next=>{next.scope.body='SYNTHETIC forbidden body';},next=>{next.connection={authorized:true};},next=>{next.scope.entryIds=[f.entry.id,f.entry.id];}
 ];
 for(const mutate of mutations){const next=structuredClone(request);mutate(next);denied(next);}
 for(const value of [null,[],{},42,'allow'])denied(value);
});

test('CTX4-03 policy reads no Item/Topic body or name and returns only fixed body-free decision fields',async()=>{
 const f=await fixture(),request=await enabled(f);
 for(const key of ['items','counts','connections','capabilities'])Object.defineProperty(request.context,key,{get(){throw Error('must not read content or invent a capability');}});
 for(const key of ['name','summary','body'])Object.defineProperty(request.topics[0],key,{get(){throw Error('must not read a label/body');}});
 const answer=evaluate(request);assert.equal(answer.policyAllowed,true);assert.deepEqual(Object.keys(answer),['selected','policyAllowed','externalAllowed','reason']);
 assert.equal(answer.externalAllowed,false);
});

test('CTX4-03 20/50/144 shared identity snapshots are bounded and never mutate or reorder owner state',async()=>{
 const f=await fixture(),request=await enabled(f);
 for(const size of [20,50,144]){
  const next=structuredClone(request);next.topics=Array.from({length:size},(_,index)=>({...structuredClone(f.topic),id:index?op():f.topic.id}));next.scope.topicIds=next.topics.map(row=>row.id);
  const before=structuredClone(next);assert.equal(evaluate(next).policyAllowed,true);assert.deepEqual(next,before);
 }
 const oversized=structuredClone(request);oversized.topics=Array(4097).fill(f.topic);assert.equal(denied(oversized).reason,'invalid_snapshot');
});
