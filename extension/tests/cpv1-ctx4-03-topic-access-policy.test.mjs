import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {MemoryService} from '../core/memory/service.js';
import {key,profileDefault,validateMemoryRow} from '../core/memory/model.js';
import {rootReadAuthority} from '../core/organizer/root-read.js';
import {contextTopicSelectionBinding,evaluateContextTopicAccess} from '../core/context-topic-access-policy.js';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const authority=s=>s.repository.transaction(false,t=>rootReadAuthority(t));
// Exact initializeTopicIdentity metadata shape from Topic-01 de28068e,
// core/topic-identity.js. The Topic owner is deliberately not imported/merged
// into this Context-only stack. These are explicit compatible read fixtures,
// not a substitute implementation of its identity resolver or storage owner.
const identityRow=row=>({...row,identity:{version:1,revision:0,origin:'user',scope:null,aliases:[],legacy:false,noRecreation:false}});
const legacyTopic=(topic,decision,profileId='default')=>({id:key('topic',profileId,topic.id),kind:'topic',version:1,profileId,topicId:topic.id,decision,layoutGeneration:topic.activeLayoutGeneration});
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 const created=await s.createTopic({name:'SYNTHETIC personal object',operationId:op()});
 const entry=await s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC independent Thought body',type:'idea',formation:'explicit',evidence:[]});
 const row=await s.entry(entry.id);
 await s.placeEntry({entryId:entry.id,topicId:created.id,operationId:op(),expectedEntryRevision:row.revision,expectedTopicRevision:0});
 const topic=identityRow(await raw(s,'topics',created.id)),input=(await s.snapshot()).library.blocks[0];
 const c=new ContextCardsService(s),m=new MemoryService(s);await m.ready();
 const context=await c.snapshot(),current=await authority(s),legacyRows=(await m.s.repository.transaction(false,t=>m.state(t))).rows;
 // There is no whole-Topic eligibility snapshot producer yet. This finite
 // body-free contract fixture describes known test refs; trusted production
 // aggregation, full content and connection checks remain integration work.
 const scope={complete:true,legacyComplete:true,eligibility:'eligible',topicIds:[topic.id],entryIds:[entry.id],inputIds:[input.id],sections:[{topicId:topic.id,sectionId:topic.defaultSectionId}]};
 const inputSnapshot={context,topics:[topic],topicId:topic.id,selection:null,legacyRows,scope,capturedAuthority:current,currentAuthority:current};
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
 request.topics=[identityRow(await raw(f.s,'topics',f.topic.id))];request.currentAuthority=await authority(f.s);
 assert.equal(denied(request).reason,'stale_authority');request.capturedAuthority=request.currentAuthority;
 assert.equal(evaluate(request).policyAllowed,true);assert.deepEqual(request.selection,selection);
 const other=await f.s.createTopic({name:'SYNTHETIC renamed object',operationId:op()}),newTopic=identityRow(await raw(f.s,'topics',other.id));
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
