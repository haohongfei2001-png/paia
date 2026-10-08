import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,capture,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {DIRTY_PREFIX,KNOWN_PREFIX,HUMAN_FENCE} from '../core/ai-usage/delta.js';
import {JOB_TYPES} from '../core/ai-usage/contracts.js';
const read=(s,table,id)=>s.repository.transaction(false,t=>id?t.get(table,id):t.all(table));
const unit=(item,facet='topic',scope='library')=>({key:item.key,facet,scope});
const fixtureProvider=(fn=async()=>({accepted:true,operationReceiptId:'synthetic-receipt'}))=>({describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:fn});
async function fixture(){const f=await setup(OrganizerStore);const permission={allowed:true,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent-1',jobTypes:JOB_TYPES};const commits=[];
 const options={resolveAuthority:async(_t,r)=>({...permission,scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),committers:Object.fromEntries(['topic','context','filter','organize','assist'].map(facet=>[facet,async(t,r)=>{commits.push([facet,r]);await t.put('meta',{id:'synthetic-domain:'+facet,count:commits.length});return {committed:true,coverage:r.units};}]))};
 return {...f,permission,commits,options,ai:new AIUsageFoundation(f.s,options)};
}
async function plan(f,options={}){const {items}=await f.ai.collect();return f.ai.plan({type:'AI_MAINTENANCE',items,coverage:items.flatMap(i=>[unit(i),unit(i,'context','cards')]),contractVersion:'aiu-1',routeVersion:'synthetic-1',intent:'maintenance',...options});}
async function responded(f,options={}){const job=await plan(f,options);await f.ai.reserve(job.id,{reservationId:'synthetic-reservation'});for(const child of job.childIds)await f.ai.dispatch(job.id,child,fixtureProvider());return job;}

test('AI-COST-01 100 captures precede optional AI, have zero mandatory calls and no body queue',async()=>{
 const f=await fixture(),epoch=(await f.s.status()).epoch;for(let i=1;i<100;i++)await f.s.capture(capture(epoch,'synthetic-'+i,'PRIVATE_FIXTURE_BODY_'+i));
 const all=[];let cursor=null;do{const page=await f.ai.collect({cursor,limit:17});assert.ok(page.items.length<=17);all.push(...page.items);cursor=page.nextCursor;}while(cursor);
 assert.equal(all.length,100);assert.equal((await read(f.s,'organizerJobs')).filter(j=>j.kind==='ai_usage_v1').length,0);assert.equal((await f.ai.counters()).physicalAttempt,0);
 const local=(await read(f.s,'meta')).filter(r=>r.id.startsWith('aiu:'));assert.doesNotMatch(JSON.stringify(local),/PRIVATE_FIXTURE_BODY|Synthetic explicit working input|originalText|libraryText|thoughtText/);
});
test('AI-COST-01 duplicate capture, Sync delivery, reads and reopen do not create a semantic job',async()=>{
 const f=await fixture(),first=await f.ai.collect();await f.s.capture(capture((await f.s.status()).epoch));const state=(await read(f.s,'inputStates'))[0];await f.s.foundationWrite(t=>t.put('inputStates',{...state,deltaSequence:999999,syncDeliverySequence:4}));await f.s.input(state.id);await f.s.status();
 assert.deepEqual(await f.ai.collect(),first);const job=await plan(f);const reopened=new AIUsageFoundation(f.s,f.options);assert.equal((await plan({...f,ai:reopened})).id,job.id);assert.equal((await read(f.s,'organizerJobs')).filter(j=>j.kind==='ai_usage_v1').length,1);
});
test('AI-COST-01 rapid edits coalesce latest revision; create/delete before dispatch removes pending work',async()=>{
 const f=await fixture(),id=(await read(f.s,'inputStates'))[0].id;for(let i=0;i<8;i++)await inputEdit(f.s,id,{libraryText:'Synthetic changed body '+i});assert.equal((await f.ai.collect()).items.length,1);assert.equal((await f.ai.collect()).items[0].descriptor.revision,8);
 const job=await plan(f);await inputEdit(f.s,id,{excluded:true});assert.equal((await f.ai.collect()).items.length,0);assert.equal((await f.ai.status(job.id)).state,'CANCELLED_BEFORE_DISPATCH');await assert.rejects(f.ai.reserve(job.id,{reservationId:'synthetic'}),e=>e.code==='CANCELLED');await assert.rejects(f.ai.dispatch(job.id,job.childIds[0],fixtureProvider()),e=>e.code==='CANCELLED');assert.equal((await f.ai.counters()).physicalAttempt,0);
});
test('AI-COST-01 canonical mutation and dirty marker roll back together on flush failure',async()=>{
 const f=await fixture(),before=await read(f.s,'inputStates'),known=await read(f.s,'meta',KNOWN_PREFIX+(await f.ai.collect()).items[0].key);
 await assert.rejects(f.s.foundationWrite(async t=>{const put=t.put.bind(t);t.put=async(table,row,...args)=>{if(table==='meta'&&row.id.startsWith(DIRTY_PREFIX))throw Error('synthetic-storage-failure');return put(table,row,...args);};await t.put('inputStates',{...before[0],contentRevision:99});}));
 assert.deepEqual(await read(f.s,'inputStates'),before);assert.deepEqual(await read(f.s,'meta',known.id),known);
});
test('AI-COST-01 scheduler reads bounded dirty metadata, never all Input bodies or full-state scans',async()=>{
 const f=await fixture(),original=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{const get=t.get.bind(t);t.get=async(name,...a)=>{if(['blocks','records','inputStates'].includes(name))throw Error('scheduler-body-read');return get(name,...a);};t.all=()=>{throw Error('scheduler-full-scan');};return fn(t);},...args);
 const page=await f.ai.collect({limit:1});assert.equal(page.items.length,1);
});
test('AI-COST-01 Topic A success cannot acknowledge Topic B or failed Context, even with larger later sequence',async()=>{
 const f=await fixture(),items=(await f.ai.collect()).items,coverage=[unit(items[0],'topic','A'),unit(items[0],'topic','B'),unit(items[0],'context','cards')],job=await responded(f,{items,coverage});
 await f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[coverage[0]]});assert.equal((await f.ai.collect()).items.length,1);assert.equal((await f.ai.status(job.id)).committedCoverage.length,1);
 await assert.rejects(f.ai.commitFacet(job.id,job.childIds[0],{facet:'context',units:[coverage[1]]}));
 await f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[coverage[1]]});assert.equal((await f.ai.collect()).items.length,1);
 await f.ai.commitFacet(job.id,job.childIds[0],{facet:'context',units:[coverage[2]]});assert.equal((await f.ai.collect()).items.length,0);assert.equal((await f.ai.status(job.id)).state,'COMMITTED');assert.equal(f.commits.length,3);
});
test('AI-COST-01 facet result and exact acknowledgement are atomic; failure retains the hole',async()=>{
 const f=await fixture(),job=await responded(f),items=(await f.ai.collect()).items;const bad=new AIUsageFoundation(f.s,{...f.options,committers:{...f.options.committers,context:async(t)=>{await t.put('meta',{id:'synthetic-uncommitted-domain'});throw Error('synthetic-domain-failure');}}});
 await f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[unit(items[0])]});await assert.rejects(bad.commitFacet(job.id,job.childIds[0],{facet:'context',units:[unit(items[0],'context','cards')]}));assert.equal(await read(f.s,'meta','synthetic-uncommitted-domain'),undefined);assert.equal((await f.ai.status(job.id)).committedCoverage.length,1);assert.equal((await f.ai.collect()).items.length,1);
});
test('AI-COST-01 immutable child attempts survive restart and unknown response without rebilling',async()=>{
 const f=await fixture(),job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic-reservation'});let release,calls=0;const pending=f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(()=>{calls++;return new Promise(resolve=>{release=resolve;});}));while(!release)await new Promise(resolve=>setTimeout(resolve,0));
 const restarted=new AIUsageFoundation(f.s,f.options);await restarted.reconcileInterrupted(job.id);assert.equal((await restarted.status(job.id)).state,'OUTCOME_UNKNOWN');assert.equal((await restarted.dispatch(job.id,job.childIds[0],fixtureProvider())).state,'OUTCOME_UNKNOWN');assert.equal((await restarted.reserve(job.id,{reservationId:'different-reservation'})).state,'OUTCOME_UNKNOWN');assert.equal((await plan({...f,ai:restarted})).id,job.id);
 release({accepted:true,operationReceiptId:'late-receipt'});await pending;assert.equal(calls,1);assert.equal((await restarted.status(job.id)).attempts[0].spendState,'RESERVATION_RETAINED');assert.equal((await restarted.counters()).physicalAttempt,1);
});
test('AI-COST-01 late results cannot overwrite new human edits or revoked processing consent',async()=>{
 for(const mode of ['edit','consent','human-topic']){const f=await fixture(),job=await responded(f),items=(await f.ai.collect()).items;if(mode==='edit')await inputEdit(f.s,items[0].descriptor.entityId,{libraryText:'New human statement'});else if(mode==='consent')f.permission.consentEpoch='revoked';else await f.s.createTopic({name:'Human protected topic',operationId:crypto.randomUUID()});
 await assert.rejects(f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[unit(items[0])]}));assert.equal(f.commits.length,0);}
});
test('AI-COST-01 cancel before dispatch releases; cancel after dispatch never refunds unknown attempt',async()=>{
 const f=await fixture(),job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic'});await f.ai.cancel(job.id);assert.equal((await f.ai.status(job.id)).attempts[0].spendState,'RELEASED_BEFORE_DISPATCH');await assert.rejects(f.ai.dispatch(job.id,job.childIds[0],fixtureProvider()));
 const g=await fixture(),sent=await responded(g);await g.ai.cancel(sent.id);assert.equal((await g.ai.status(sent.id)).attempts[0].spendState,'RESERVATION_RETAINED');assert.equal((await g.ai.status(sent.id)).attempts[0].attemptCount,1);
});
test('AI-COST-01 concurrent plans/dispatches share one flight and one physical operation',async()=>{
 const f=await fixture(),[a,b]=await Promise.all([plan(f),plan(f)]);assert.equal(a.id,b.id);await f.ai.reserve(a.id,{reservationId:'synthetic'});let calls=0;await Promise.all([f.ai.dispatch(a.id,a.childIds[0],fixtureProvider(async()=>{calls++;return {accepted:true,operationReceiptId:'synthetic'};})),f.ai.dispatch(a.id,a.childIds[0],fixtureProvider(async()=>{calls++;return {accepted:true,operationReceiptId:'synthetic'};}))]);assert.equal(calls,1);
 await assert.rejects(plan(f,{routeVersion:'cannot-evade-flight'}),e=>e.code==='REQUEST_ALREADY_IN_FLIGHT');
});
test('AI-COST-01 missing authority and real remote provider fail closed; receipts never retain provider bodies',async()=>{
 const f=await fixture();await assert.rejects(plan({...f,ai:new AIUsageFoundation(f.s)}),e=>e.code==='UNAVAILABLE');const job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic'});let called=false;await assert.rejects(f.ai.dispatch(job.id,job.childIds[0],{describe:()=>({providerId:'remote',version:'1',executionKind:'remote'}),execute:async()=>{called=true;}}),e=>e.code==='UNAVAILABLE');assert.equal(called,false);
 await f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>({accepted:true,operationReceiptId:'synthetic',body:'DO_NOT_PERSIST',prompt:'DO_NOT_PERSIST',error:'DO_NOT_PERSIST'})));assert.doesNotMatch(JSON.stringify(await read(f.s,'organizerUsage')),/DO_NOT_PERSIST|prompt|body/);
});
test('AI-COST-01 local NO_CHANGE and cache intent cost zero and retain exact per-facet holes',async()=>{
 const f=await fixture(),job=await plan(f),items=(await f.ai.collect()).items;await f.ai.resolveLocal(job.id,{facet:'topic',units:[unit(items[0])]});assert.equal((await f.ai.collect()).items.length,1);await f.ai.resolveLocal(job.id,{facet:'context',units:[unit(items[0],'context','cards')]});await f.ai.cacheIntent();const c=await f.ai.counters();assert.equal(c.localResolved,2);assert.equal(c.physicalAttempt,0);assert.equal(c.cacheIntent,1);
});
test('AI-COST-01 DEFER records retry condition without re-dispatching unchanged evidence',async()=>{
 const f=await fixture(),job=await responded(f),items=(await f.ai.collect()).items;await f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[unit(items[0])],outcome:'DEFER',retryCondition:'independent-evidence-required'});assert.equal((await f.ai.status(job.id)).committedCoverage.length,0);assert.equal((await plan(f)).id,job.id);let calls=0;await f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{calls++;}));assert.equal(calls,0);
});
test('AI-COST-01 child bounds are typed and duplicate evidence never creates independent lineage',async()=>{
 const f=await fixture(),items=(await f.ai.collect()).items;assert.equal(new Set(items.flatMap(i=>i.descriptor.lineage)).size,1);await assert.rejects(plan(f,{items:[items[0],items[0]]}));await assert.rejects(plan(f,{children:[[unit(items[0])],[unit(items[0],'context','cards')],[unit(items[0],'context','extra')]]}));
 for(const [type,facet]of [['AI_ORGANIZE','organize'],['AI_ASSIST','assist']]){const g=await fixture(),selected=(await g.ai.collect()).items;const assistIntent={version:1,sessionId:'synthetic',leaseId:'synthetic',replyId:'synthetic',replyGeneration:1,consentEpoch:'synthetic',permissionEpoch:'synthetic'};g.ai.resolveAssistIntent=async(_t,r)=>({allowed:true,remoteProcessing:true,binding:assistIntent,scope:r.scope});const p=await plan(g,{type,items:selected,coverage:[unit(selected[0],facet,'synthetic-scope')],intent:'explicit',...(type==='AI_ASSIST'?{assistIntent}:{})});assert.equal(p.type,type);assert.equal(p.childIds.length,1);}
});

test('AI-COST-01 edits supersede a reserved but undispatched job and release only its unused reservation',async()=>{
 const f=await fixture(),old=await plan(f);await f.ai.reserve(old.id,{reservationId:'unused'});const input=(await read(f.s,'inputStates'))[0];await inputEdit(f.s,input.id,{libraryText:'Latest meaningful revision'});const next=await plan(f);assert.notEqual(next.id,old.id);assert.equal((await f.ai.status(old.id)).state,'CANCELLED_BEFORE_DISPATCH');assert.equal((await f.ai.status(old.id)).attempts[0].spendState,'RELEASED_BEFORE_DISPATCH');assert.equal((await f.ai.counters()).physicalAttempt,0);
});
test('AI-COST-01 human Topic and physical Section revisions are reusable without scanning bodies',async()=>{
 const f=await fixture();await f.s.createTopic({name:'Synthetic named topic',operationId:crypto.randomUUID()});const items=(await f.ai.collect()).items;assert.ok(items.some(i=>i.descriptor.kind==='section'));assert.ok(items.some(i=>i.descriptor.kind==='topic'));const job=await plan(f);assert.equal(job.state,'PLANNED');
});
test('AI-COST-01 human Context edits revoke work, and automatic Context maintenance cannot create feedback work',async()=>{
 const f=await fixture(),job=await responded(f),original=(await f.ai.collect()).items;const id=crypto.randomUUID(),manual={id,card:'info',revision:1,origin:'manual',protected:true,lifecycle:'active',body:'PRIVATE_CONTEXT_TEXT'};
 await f.s.foundationWrite(t=>t.put('meta',{id:'context-cards:v1',items:[manual]}));assert.ok((await f.ai.collect()).items.some(i=>i.descriptor.kind==='context_item'));await assert.rejects(f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[unit(original[0])]}));
 const before=await f.ai.collect();await f.s.foundationWrite(t=>t.put('meta',{id:'context-cards:v1',items:[manual,{id:crypto.randomUUID(),card:'now',revision:1,origin:'automatic',protected:false,lifecycle:'active',body:'PRIVATE_AUTOMATIC_TEXT'}]}));assert.deepEqual(await f.ai.collect(),before);assert.doesNotMatch(JSON.stringify((await read(f.s,'meta')).filter(r=>r.id.startsWith('aiu:'))),/PRIVATE_CONTEXT_TEXT|PRIVATE_AUTOMATIC_TEXT/);
});
test('AI-COST-01 later successful Input does not acknowledge an earlier Input hole',async()=>{
 const f=await fixture();await f.s.capture(capture((await f.s.status()).epoch,'second-input','Second substantive input'));const items=(await f.ai.collect()).items,coverage=items.map(i=>unit(i)),job=await responded(f,{items,coverage});await f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[coverage[1]]});const pending=await f.ai.collect({facets:['topic']});assert.equal(pending.items.length,1);assert.equal(pending.items[0].key,coverage[0].key);assert.equal((await f.ai.collect({facets:['context']})).items.length,2);
});
test('AI-COST-01 unauthorized facet scope and source deletion fail at the last current-state fence',async()=>{
 const f=await fixture(),job=await responded(f),item=(await f.ai.collect()).items[0];f.options.resolveAuthority=async()=>({...f.permission,scope:{evidenceKeys:[],coverage:[]}});const denied=new AIUsageFoundation(f.s,f.options);await assert.rejects(denied.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[unit(item)]}),e=>e.code==='UNAVAILABLE');
 await f.s.foundationWrite(t=>t.delete('records',item.descriptor.sourceRecordIds[0]));await assert.rejects(f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:[unit(item)]}),e=>e.code==='STALE_BASE');assert.equal(f.commits.length,0);
});

test('AI-COST-01 default production owner is present, denies execution and performs no constructor work',async()=>{
 const f=await fixture();assert.ok(f.s.aiUsageFoundation instanceof AIUsageFoundation);await assert.rejects(plan({...f,ai:f.s.aiUsageFoundation}),e=>e.code==='UNAVAILABLE');assert.equal((await read(f.s,'organizerJobs')).filter(j=>j.kind==='ai_usage_v1').length,0);
});
test('AI-COST-01 lost transient usage rows cannot remint a dispatched attempt after library recovery',async()=>{
 const f=await fixture(),job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic'});await f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{throw Error('unknown');}));
 await f.s.foundationWrite(async t=>{await t.clear('organizerJobs');await t.clear('organizerUsage');await t.clear('organizerWorkItems');await t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-restored'});});
 await assert.rejects(plan(f),e=>e.code==='OUTCOME_UNKNOWN');assert.ok((await read(f.s,'meta')).some(row=>row.id.startsWith('aiu:dispatched:')));assert.equal((await f.ai.counters()).physicalAttempt,1);
});
test('AI-COST-01 one successful child cannot hide another child unknown outcome',async()=>{
 const f=await fixture(),items=(await f.ai.collect()).items,coverage=[unit(items[0]),unit(items[0],'context','cards')],job=await plan(f,{items,coverage,children:coverage.map(u=>[u])});await f.ai.reserve(job.id,{reservationId:'synthetic'});await f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{throw Error('unknown');}));await f.ai.dispatch(job.id,job.childIds[1],fixtureProvider());assert.equal((await f.ai.status(job.id)).state,'OUTCOME_UNKNOWN');
});

test('AI-COST-01 cancelling a recorded result retains spend but allows later genuinely changed work',async()=>{
 const f=await fixture(),job=await responded(f);assert.equal((await f.ai.cancel(job.id)).state,'EXPIRED_UNCOMMITTED');const input=(await read(f.s,'inputStates'))[0];await inputEdit(f.s,input.id,{libraryText:'New human delta after known response'});const next=await plan(f);assert.notEqual(next.id,job.id);assert.equal((await f.ai.status(job.id)).attempts[0].attemptCount,1);assert.equal((await f.ai.status(job.id)).attempts[0].spendState,'RESERVATION_RETAINED');
});
test('AI-COST-01 unknown outcome reconciliation requires a trusted exact-bound proof and never retries',async()=>{
 const f=await fixture(),job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic'});await f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{throw Error('unknown');}));await assert.rejects(f.ai.reconcileOutcome(job.id,job.childIds[0],{}),e=>e.code==='UNAVAILABLE');
 const invalid=new AIUsageFoundation(f.s,{...f.options,verifyOutcome:async()=>({binding:{},outcome:'NOT_ACCEPTED',operationReceiptId:'wrong-binding'})});await assert.rejects(invalid.reconcileOutcome(job.id,job.childIds[0],{}),e=>e.code==='UNAVAILABLE');
 const valid=new AIUsageFoundation(f.s,{...f.options,verifyOutcome:async binding=>({binding,outcome:'NOT_ACCEPTED',operationReceiptId:'synthetic-proof'})});assert.equal((await valid.reconcileOutcome(job.id,job.childIds[0],{})).state,'REJECTED');assert.equal((await valid.status(job.id)).attempts[0].spendState,'RELEASED_VERIFIED_NOT_ACCEPTED');let calls=0;assert.equal((await valid.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{calls++;}))).state,'REJECTED');assert.equal(calls,0);assert.equal((await valid.counters()).physicalAttempt,1);
});
test('AI-COST-01 jobs, operation fences, coverage and usage are absent from existing portable backup',async()=>{
 const {BackupService}=await import('./harness/historical-backup.mjs');const f=await fixture(),job=await responded(f);const service=new BackupService(f.s),{sessionId,header}=await service.beginExport(),items=[header];let sequence=0;for(;;){const p=await service.exportPage({sessionId,sequence:sequence++});items.push(...p.items);if(p.done)break;}assert.doesNotMatch(JSON.stringify(items),/aiu:|ai_usage_v1|synthetic-reservation|synthetic-consent/);assert.ok((await f.ai.status(job.id)).attempts.length);
});

test('AI-COST-01 pruning or replaying old human journals cannot remove or downgrade current dirty work',async()=>{
 const f=await fixture(),topic=await f.s.createTopic({name:'Initial human name',operationId:crypto.randomUUID()}),journals=await read(f.s,'revisions'),old=journals.find(r=>r.kind==='topic'&&r.entityId===topic.id);await f.s.renameTopic({id:topic.id,name:'Latest human name',expectedRevision:0,operationId:crypto.randomUUID()});const current=await f.ai.collect();await f.s.foundationWrite(t=>t.delete('revisions',old.id));assert.deepEqual(await f.ai.collect(),current);await f.s.foundationWrite(t=>t.put('revisions',old));assert.deepEqual(await f.ai.collect(),current);assert.equal((await plan(f)).state,'PLANNED');
});
test('AI-COST-01 derived revision bookkeeping does not dirty or invalidate human evidence by itself',async()=>{
 const f=await fixture(),topic=await f.s.createTopic({name:'Stable human topic',operationId:crypto.randomUUID()}),job=await responded(f),items=(await f.ai.collect()).items,before=await f.ai.collect();await f.s.foundationWrite(async t=>{const row=await t.get('topics',topic.id);await t.put('topics',{...row,revision:row.revision+1,searchVersion:3,countVersion:4});});assert.deepEqual(await f.ai.collect(),before);await f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:items.map(i=>unit(i))});assert.equal((await f.ai.status(job.id)).state,'VALIDATED');
});

test('AI-COST-01 verified rejection of one child retains each unfinished sibling and the single flight',async()=>{
 for(const siblingState of ['RESERVED','RESPONSE_RECORDED','VALIDATED']){
  const f=await fixture(),items=(await f.ai.collect()).items,topic=[unit(items[0],'topic','A'),unit(items[0],'topic','B')],context=unit(items[0],'context','cards'),job=await plan(f,{items,coverage:[...topic,context],children:[topic,[context]]});
  const persisted=await read(f.s,'organizerJobs',job.id),rejectedIndex=persisted.childCoverage.findIndex(c=>c.length===1),rejected=job.childIds[rejectedIndex],sibling=job.childIds[1-rejectedIndex];
  await f.ai.reserve(job.id,{reservationId:'synthetic-two-child'});await f.ai.dispatch(job.id,rejected,fixtureProvider(async()=>{throw Error('synthetic unknown');}));
  if(siblingState!=='RESERVED')await f.ai.dispatch(job.id,sibling,fixtureProvider());
  if(siblingState==='VALIDATED')await f.ai.commitFacet(job.id,sibling,{facet:'topic',units:[topic[0]]});
  const verified=new AIUsageFoundation(f.s,{...f.options,verifyOutcome:async binding=>({binding,outcome:'NOT_ACCEPTED',operationReceiptId:'synthetic-not-accepted'})});
  assert.equal((await verified.reconcileOutcome(job.id,rejected,{})).state,siblingState);
  const after=await verified.status(job.id);assert.equal(after.attempts.find(a=>a.childId===rejected).state,'REJECTED');assert.equal(after.attempts.find(a=>a.childId===sibling).state,siblingState);
  await assert.rejects(plan({...f,ai:verified},{routeVersion:'different-route-cannot-race'}),e=>e.code==='REQUEST_ALREADY_IN_FLIGHT');
  let rejectedCalls=0;assert.equal((await verified.dispatch(job.id,rejected,fixtureProvider(async()=>{rejectedCalls++;}))).state,'REJECTED');assert.equal(rejectedCalls,0);
  if(siblingState==='RESERVED'){let calls=0;await verified.dispatch(job.id,sibling,fixtureProvider(async()=>{calls++;return {accepted:true,operationReceiptId:'synthetic-sibling'};}));assert.equal(calls,1);}
  assert.equal((await verified.counters()).physicalAttempt,2);
 }
});
test('AI-COST-01 Topic-only acknowledgement preserves Context work and explicit Organize remains independently eligible',async()=>{
 const f=await fixture(),items=(await f.ai.collect()).items,topic=unit(items[0]),job=await plan(f,{items,coverage:[topic]});await f.ai.resolveLocal(job.id,{facet:'topic',units:[topic]});
 assert.equal((await f.ai.collect({facets:['topic']})).items.length,0);assert.deepEqual((await f.ai.collect({facets:['context']})).items,items);assert.deepEqual((await read(f.s,'meta',DIRTY_PREFIX+items[0].key)).pendingFacets,['context']);
 const organize=await plan(f,{type:'AI_ORGANIZE',intent:'explicit',items,coverage:[unit(items[0],'organize','synthetic-topic')]});await f.ai.resolveLocal(organize.id,{facet:'organize',units:[unit(items[0],'organize','synthetic-topic')]});assert.equal((await f.ai.collect({facets:['context']})).items.length,1);
 const context=unit(items[0],'context','cards'),remaining=await plan(f,{items,coverage:[context]});await f.ai.resolveLocal(remaining.id,{facet:'context',units:[context]});assert.equal((await f.ai.collect()).items.length,0);
 const described=(await f.ai.describe({keys:[items[0].key]})).items;assert.deepEqual(described,items);assert.equal((await plan(f,{type:'AI_ORGANIZE',intent:'explicit',items:described,coverage:[unit(described[0],'organize','another-explicit-topic')]})).state,'PLANNED');assert.equal((await f.ai.counters()).physicalAttempt,0);
});
test('AI-COST-01 same-revision journal redelivery is not new semantic work or a new human fence',async()=>{
 const f=await fixture(),topic=await f.s.createTopic({name:'Synthetic human topic',operationId:crypto.randomUUID()}),journal=(await read(f.s,'revisions')).find(r=>r.kind==='topic'&&r.entityId===topic.id),before=await f.ai.collect(),fence=await read(f.s,'meta',HUMAN_FENCE);
 await f.s.foundationWrite(t=>t.put('revisions',{...journal,id:crypto.randomUUID()}));assert.deepEqual(await f.ai.collect(),before);assert.deepEqual(await read(f.s,'meta',HUMAN_FENCE),fence);
});
test('AI-COST-01 actual replace restore coalesces human journals by revision rather than UUID order',async()=>{
 const {BackupService}=await import('./harness/historical-backup.mjs'),source=await fixture();let ordinal=999999;source.s.uuid=()=>`00000000-0000-4000-8000-${String(ordinal--).padStart(12,'0')}`;
 const ids=[];for(let n=0;n<8;n++){const topic=await source.s.createTopic({name:'Synthetic initial '+n,operationId:crypto.randomUUID()});ids.push(topic.id);await source.s.renameTopic({id:topic.id,name:'Synthetic revision one '+n,expectedRevision:0,operationId:crypto.randomUUID()});await source.s.renameTopic({id:topic.id,name:'PRIVATE_LATEST_HUMAN_NAME_'+n,expectedRevision:1,operationId:crypto.randomUUID()});}
 const exporter=new BackupService(source.s),{sessionId,header}=await exporter.beginExport(),items=[header];for(let sequence=0;;sequence++){const page=await exporter.exportPage({sessionId,sequence});items.push(...page.items);if(page.done)break;}
 const target=await fixture(),service=new BackupService(target.s),staged=await service.beginRestore();for(let i=0;i<items.length;i+=30)await service.stageRestore({sessionId:staged.sessionId,items:items.slice(i,i+30)});
 const preview=await service.previewRestore({sessionId:staged.sessionId,mode:'replace'});assert.equal(preview.canRestore,true);await service.restore({sessionId:staged.sessionId,confirmation:preview.integrity,mode:'replace',confirmReplace:true,targetGeneration:preview.targetGeneration});
 const dirty=(await target.ai.collect({limit:100})).items.filter(i=>i.descriptor.kind==='topic');assert.equal(dirty.length,ids.length);assert.deepEqual(new Set(dirty.map(i=>i.descriptor.entityId)),new Set(ids));
 for(const item of dirty){const actual=await read(target.s,'topics',item.descriptor.entityId),known=await read(target.s,'meta',KNOWN_PREFIX+item.key);assert.equal(actual.revision,2);assert.equal(item.descriptor.revision,actual.revision);assert.equal(known.descriptor.revision,actual.revision);}
 assert.doesNotMatch(JSON.stringify((await read(target.s,'meta')).filter(r=>r.id.startsWith('aiu:'))),/PRIVATE_LATEST_HUMAN_NAME/);assert.equal((await plan(target)).state,'PLANNED');assert.equal((await target.ai.counters()).physicalAttempt,0);
});
test('AI-COST-01 keep-separate changes rebind only never-dispatched uncommitted plans',async()=>{
 for(const reserved of [false,true]){const f=await fixture(),a=await f.s.createTopic({name:'Synthetic A',operationId:crypto.randomUUID()}),b=await f.s.createTopic({name:'Synthetic B',operationId:crypto.randomUUID()}),items=(await f.ai.collect()).items,request={items,coverage:items.map(i=>unit(i))},old=await plan(f,request);
  if(reserved)await f.ai.reserve(old.id,{reservationId:'synthetic-original'});const before=await read(f.s,'organizerJobs',old.id);await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});await assert.rejects(f.ai.reserve(old.id,{reservationId:'stale-human-fence'}),e=>e.code==='CANCELLED');
  const next=await plan(f,request),saved=await read(f.s,'organizerJobs',next.id);assert.equal(next.id,old.id);assert.deepEqual(next.childIds,old.childIds);assert.equal(saved.planningRevision,1);assert.ok(saved.authority.humanFence>before.authority.humanFence);assert.equal((await f.ai.reserve(next.id,{reservationId:'synthetic-current'})).state,'RESERVED');
  if(reserved)assert.equal((await f.ai.status(next.id)).attempts[0].parentReservationId,'synthetic-original');assert.equal((await f.ai.counters()).physicalAttempt,0);
 }
});
test('AI-COST-01 locally completed child and partial same-child coverage reserve only unresolved units',async()=>{
 for(const split of [false,true]){const f=await fixture(),items=(await f.ai.collect()).items,topic=unit(items[0]),context=unit(items[0],'context','cards'),job=await plan(f,{items,coverage:[topic,context],...(split?{children:[[topic],[context]]}:{})});await f.ai.resolveLocal(job.id,{facet:'topic',units:[topic]});assert.equal((await f.ai.status(job.id)).state,'PLANNED');await f.ai.reserve(job.id,{reservationId:'synthetic-remainder'});
  const requests=[];for(const child of job.childIds)await f.ai.dispatch(job.id,child,fixtureProvider(async request=>{requests.push(request);return {accepted:true,operationReceiptId:'synthetic-remainder'};}));assert.equal(requests.length,1);assert.deepEqual(requests[0].coverage,[context]);assert.equal((await f.ai.counters()).physicalAttempt,1);
  const persisted=await read(f.s,'organizerJobs',job.id),index=persisted.childCoverage.findIndex(c=>c.some(u=>u.facet==='context'));await f.ai.commitFacet(job.id,job.childIds[index],{facet:'context',units:[context]});assert.equal((await f.ai.status(job.id)).state,'COMMITTED');assert.equal((await f.ai.collect()).items.length,0);
 }
});
test('AI-COST-01 route and snapshot metadata changes leave canonical identities, permissions and human work unchanged',async()=>{
 const f=await fixture(),topic=await f.s.createTopic({name:'Synthetic protected identity',operationId:crypto.randomUUID()}),items=(await f.ai.collect()).items,request={type:'AI_ORGANIZE',intent:'explicit',items,coverage:items.map(i=>unit(i,'organize',topic.id))};
 const tables=['records','inputStates','thoughts','topics','sections','placements'],before=await Promise.all(tables.map(table=>read(f.s,table))),permission=structuredClone(f.permission),first=await plan(f,{...request,routeVersion:'opaque-route-main-alias'});await f.ai.cancel(first.id);
 const second=await plan(f,{...request,routeVersion:'opaque-route-fixed-snapshot'});assert.notEqual(second.id,first.id);assert.deepEqual(await Promise.all(tables.map(table=>read(f.s,table))),before);assert.deepEqual(f.permission,permission);assert.equal((await f.ai.counters()).physicalAttempt,0);
 const jobs=await read(f.s,'organizerJobs');assert.deepEqual(jobs.find(j=>j.id===first.id).authority,jobs.find(j=>j.id===second.id).authority);assert.equal((await read(f.s,'topics',topic.id)).id,topic.id);
});
test('AI-COST-01 untrusted provider or native-currency fields cannot select a route or mint an allowance',async()=>{
 const f=await fixture(),items=(await f.ai.collect()).items,request={type:'AI_MAINTENANCE',items,coverage:items.map(i=>unit(i)),contractVersion:'aiu-1',routeVersion:'synthetic-trusted-route',intent:'maintenance'},before=await f.ai.counters();
 for(const extra of [{provider:'qwen'},{model:'qwen3.8-max'},{currency:'CNY',allowance:1000},{budget:{currency:'USD',amount:1000}}])await assert.rejects(f.ai.plan({...request,...extra}),e=>e.code==='INVALID_REQUEST');
 assert.equal((await read(f.s,'organizerJobs')).filter(j=>j.kind==='ai_usage_v1').length,0);assert.deepEqual(await f.ai.counters(),before);assert.equal((await read(f.s,'organizerUsage')).length,0);
});
test('AI-COST-01 canonical clear and bounded metadata cleanup roll back together without body scans or financial reset',async()=>{
 const f=await fixture(),topic=await f.s.createTopic({name:'Synthetic unrelated human owner',operationId:crypto.randomUUID()}),items=(await f.ai.collect()).items,input=items.find(i=>i.descriptor.kind==='input'),job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic-retained-unknown'});await f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{throw Error('synthetic unknown');}));
 const beforeRows=await read(f.s,'inputStates'),beforeMeta=await read(f.s,'meta'),beforeUsage=await read(f.s,'organizerUsage');let pages=0;
 const clear=async(t,name)=>{const get=t.get.bind(t),all=t.all.bind(t),range=t.primaryRangePage.bind(t);t.get=async(store,...args)=>{if(store!=='meta')throw Error('canonical-body-read');return get(store,...args);};t.all=()=>{throw Error('cleanup-full-scan');};t.primaryRangePage=async(store,options)=>{assert.equal(store,'meta');assert.equal(options.limit,100);pages++;return range(store,options);};try{await t.clear(name);}finally{t.get=get;t.all=all;t.primaryRangePage=range;}};
 await assert.rejects(f.s.foundationWrite(async t=>{await clear(t,'inputStates');throw Error('synthetic-clear-rollback');}));assert.deepEqual(await read(f.s,'inputStates'),beforeRows);assert.deepEqual(await read(f.s,'meta'),beforeMeta);assert.deepEqual(await read(f.s,'organizerUsage'),beforeUsage);
 await f.s.foundationWrite(t=>clear(t,'inputStates'));assert.ok(pages>=4);assert.equal(await read(f.s,'meta',KNOWN_PREFIX+input.key),undefined);assert.equal(await read(f.s,'meta',DIRTY_PREFIX+input.key),undefined);assert.deepEqual(await read(f.s,'organizerUsage'),beforeUsage);
 for(const item of items.filter(i=>i.key!==input.key)){assert.deepEqual(await read(f.s,'meta',KNOWN_PREFIX+item.key),beforeMeta.find(r=>r.id===KNOWN_PREFIX+item.key));assert.deepEqual(await read(f.s,'meta',DIRTY_PREFIX+item.key),beforeMeta.find(r=>r.id===DIRTY_PREFIX+item.key));}
 assert.equal((await read(f.s,'topics',topic.id)).lifecycle,'active');assert.deepEqual((await read(f.s,'meta')).filter(r=>r.id.startsWith('aiu:dispatched:')||r.id.startsWith('aiu:flight:')),beforeMeta.filter(r=>r.id.startsWith('aiu:dispatched:')||r.id.startsWith('aiu:flight:')));assert.equal((await f.ai.counters()).physicalAttempt,1);
});
test('AI-COST-01 clear ordering preserves only the valid canonical writes after that clear',async()=>{
 const f=await fixture(),row=(await read(f.s,'inputStates'))[0],key=(await f.ai.collect()).items[0].key;
 await f.s.foundationWrite(async t=>{await t.put('inputStates',{...row,contentRevision:99});await t.clear('inputStates');});assert.equal((await f.ai.collect()).items.length,0);assert.equal(await read(f.s,'meta',KNOWN_PREFIX+key),undefined);
 await f.s.foundationWrite(async t=>{await t.clear('inputStates');await t.put('inputStates',{...row,contentRevision:1});});assert.equal((await f.ai.collect()).items[0].descriptor.revision,1);assert.equal((await read(f.s,'inputStates',row.id)).contentRevision,1);
});
test('AI-COST-01 actual replace discards old dirty owners but retains an unknown dispatched attempt fence',async()=>{
 const {BackupService}=await import('./harness/historical-backup.mjs'),source=await fixture(),target=await fixture(),oldItems=(await target.ai.collect()).items,job=await plan(target);await target.ai.reserve(job.id,{reservationId:'synthetic-unknown-before-restore'});await target.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{throw Error('synthetic unknown');}));
 const fence=await read(target.s,'meta','aiu:dispatched:'+job.childIds[0]),flight=(await read(target.s,'meta')).find(r=>r.id.startsWith('aiu:flight:')),exporter=new BackupService(source.s),{sessionId,header}=await exporter.beginExport(),items=[header];for(let sequence=0;;sequence++){const page=await exporter.exportPage({sessionId,sequence});items.push(...page.items);if(page.done)break;}
 const service=new BackupService(target.s),staged=await service.beginRestore();await service.stageRestore({sessionId:staged.sessionId,items});const preview=await service.previewRestore({sessionId:staged.sessionId,mode:'replace'}),request={sessionId:staged.sessionId,confirmation:preview.integrity,mode:'replace',confirmReplace:true,targetGeneration:preview.targetGeneration};
 const beforeMeta=await read(target.s,'meta'),beforeInputs=await read(target.s,'inputStates'),beforeUsage=await read(target.s,'organizerUsage'),transaction=target.s.repository.transaction.bind(target.s.repository);target.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=async(table,row,...rest)=>{if(table==='meta'&&row.id==='recovery-restore-epoch')throw Error('synthetic-replace-rollback');return put(table,row,...rest);};return fn(t);},...args);
 try{await assert.rejects(service.restore(request));}finally{target.s.repository.transaction=transaction;}assert.deepEqual(await read(target.s,'meta'),beforeMeta);assert.deepEqual(await read(target.s,'inputStates'),beforeInputs);assert.deepEqual(await read(target.s,'organizerUsage'),beforeUsage);await service.restore(request);
 for(const old of oldItems){assert.equal(await read(target.s,'meta',DIRTY_PREFIX+old.key),undefined);assert.equal(await read(target.s,'meta',KNOWN_PREFIX+old.key),undefined);}assert.equal((await target.ai.collect()).items.length,1);assert.deepEqual(await read(target.s,'meta',fence.id),fence);assert.deepEqual(await read(target.s,'meta',flight.id),flight);await assert.rejects(plan(target),e=>e.code==='OUTCOME_UNKNOWN');assert.equal((await target.ai.counters()).physicalAttempt,1);
});
test('AI-COST-01 changed human fence resumes the zero-attempt remainder after local subset or child completion',async()=>{
 for(const split of [false,true]){const f=await fixture(),a=await f.s.createTopic({name:'Synthetic A',operationId:crypto.randomUUID()}),b=await f.s.createTopic({name:'Synthetic B',operationId:crypto.randomUUID()}),items=(await f.ai.collect()).items,topic=items.map(i=>unit(i)),context=items.map(i=>unit(i,'context','cards')),request={items,coverage:[...topic,...context],...(split?{children:[topic,context]}:{})},old=await plan(f,request);
  await f.ai.resolveLocal(old.id,{facet:'topic',units:topic});const prior=await f.ai.status(old.id);await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});const next=await plan(f,request);assert.equal(next.id,old.id);assert.deepEqual(next.childIds,old.childIds);assert.deepEqual(next.committedCoverage,prior.committedCoverage);await f.ai.reserve(next.id,{reservationId:'synthetic-current-remainder'});
  const requests=[];for(const child of next.childIds)await f.ai.dispatch(next.id,child,fixtureProvider(async request=>{requests.push(request);return {accepted:true,operationReceiptId:'synthetic-remainder'};}));assert.equal(requests.length,1);assert.deepEqual(requests[0].coverage.map(u=>u.facet),context.map(()=>'context'));assert.equal((await f.ai.counters()).physicalAttempt,1);
 }
});
test('AI-COST-01 changed human fence cannot rebind a dispatched, recorded or unknown attempt',async()=>{
 for(const unknown of [false,true]){const f=await fixture(),a=await f.s.createTopic({name:'Synthetic A',operationId:crypto.randomUUID()}),b=await f.s.createTopic({name:'Synthetic B',operationId:crypto.randomUUID()}),items=(await f.ai.collect()).items,request={items,coverage:items.map(i=>unit(i))},old=await plan(f,request);await f.ai.reserve(old.id,{reservationId:'synthetic-dispatched'});await f.ai.dispatch(old.id,old.childIds[0],fixtureProvider(unknown?async()=>{throw Error('synthetic unknown');}:undefined));const before=await read(f.s,'organizerJobs',old.id),usage=await read(f.s,'organizerUsage');await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});
  assert.equal((await plan(f,request)).id,old.id);assert.deepEqual((await read(f.s,'organizerJobs',old.id)).authority,before.authority);assert.deepEqual(await read(f.s,'organizerUsage'),usage);await assert.rejects(f.ai.reserve(old.id,{reservationId:'cannot-rebill'}),e=>e.code==='CANCELLED');await assert.rejects(plan(f,{...request,routeVersion:'cannot-evade-attempt'}),e=>e.code==='REQUEST_ALREADY_IN_FLIGHT');assert.equal((await f.ai.counters()).physicalAttempt,1);
 }
});
test('AI-COST-01 canonical cleanup crosses 100-row pages without scanning bodies or deleting other kinds',async()=>{
 const f=await fixture(),epoch=(await f.s.status()).epoch;for(let n=1;n<105;n++)await f.s.capture(capture(epoch,'synthetic-cleanup-'+n,'PRIVATE_CLEANUP_BODY_'+n));await f.s.createTopic({name:'Synthetic retained Topic',operationId:crypto.randomUUID()});let pages=0;
 await f.s.foundationWrite(async t=>{const get=t.get.bind(t),page=t.primaryRangePage.bind(t);t.get=async(store,...args)=>{if(store!=='meta')throw Error('cleanup-body-read');return get(store,...args);};t.all=()=>{throw Error('cleanup-full-scan');};t.primaryRangePage=async(store,options)=>{assert.equal(store,'meta');assert.equal(options.limit,100);const result=await page(store,options);assert.ok(result.rows.length<=100);pages++;return result;};await t.clear('inputStates');});
 assert.equal(pages,4);const pending=await f.ai.collect({limit:100});assert.equal(pending.items.filter(i=>i.descriptor.kind==='input').length,0);assert.ok(pending.items.some(i=>i.descriptor.kind==='topic'));assert.doesNotMatch(JSON.stringify((await read(f.s,'meta')).filter(r=>r.id.startsWith('aiu:'))),/PRIVATE_CLEANUP_BODY/);assert.equal((await f.ai.counters()).physicalAttempt,0);
});

test('AI-COST-01 planning snapshots caller-owned evidence before asynchronous authority reads',async()=>{
 const f=await fixture(),items=(await f.ai.collect()).items;
 const request={type:'AI_MAINTENANCE',items,coverage:items.flatMap(i=>[unit(i),unit(i,'context','cards')]),contractVersion:'aiu-1',routeVersion:'synthetic-1',intent:'maintenance'};
 const original=f.ai.read.bind(f.ai);let mutated=false;
 f.ai.read=async fn=>{const result=await original(fn);if(!mutated){mutated=true;request.items[0].descriptor.body='PRIVATE_CALLER_MUTATION_BODY';request.coverage[0].scope='mutated-after-authorization';}return result;};
 const job=await f.ai.plan(request),saved=await read(f.s,'organizerJobs',job.id);
 assert.doesNotMatch(JSON.stringify(saved),/PRIVATE_CALLER_MUTATION_BODY|mutated-after-authorization/);
});

test('AI-COST-01 provider metadata is snapshotted before asynchronous dispatch admission',async()=>{
 const f=await fixture(),job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic-reservation'});
 const descriptor={providerId:'synthetic',version:'1',executionKind:'fixture'},original=f.ai.write.bind(f.ai);
 let changed=false;f.ai.write=fn=>{if(!changed){changed=true;descriptor.body='PRIVATE_PROVIDER_MUTATION_BODY';}return original(fn);};
 await f.ai.dispatch(job.id,job.childIds[0],{describe:()=>descriptor,execute:async()=>({accepted:true,operationReceiptId:'synthetic-receipt'})});
 assert.doesNotMatch(JSON.stringify(await f.ai.status(job.id)),/PRIVATE_PROVIDER_MUTATION_BODY/);
});

test('AI-COST-01 local and response facet writes retain the submitted coverage snapshot',async()=>{
 for(const local of [true,false]){
  const f=await fixture(),job=local?await plan(f):await responded(f),item=(await f.ai.collect()).items[0],units=[unit(item)];
  const original=f.ai.write.bind(f.ai);let changed=false;f.ai.write=fn=>{if(!changed){changed=true;units[0].scope='changed-by-caller';}return original(fn);};
  const result=local?await f.ai.resolveLocal(job.id,{facet:'topic',units}):await f.ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units});
  assert.deepEqual(result.committedCoverage,[JSON.stringify([item.key,'topic','library'])]);
 }
});

test('AI-COST-01 outcome reconciliation snapshots verified result before asynchronous persistence',async()=>{
 const f=await fixture(),job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic-reservation'});
 await f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{throw Error('synthetic unknown');}));
 let result;f.ai.verifyOutcome=async binding=>(result={binding:{...binding},outcome:'NOT_ACCEPTED',operationReceiptId:'synthetic-verified-rejection'});
 const original=f.ai.write.bind(f.ai);f.ai.write=fn=>{result.outcome='ACCEPTED';result.operationReceiptId='PRIVATE_MUTATED_VERIFIER_BODY';return original(fn);};
 await f.ai.reconcileOutcome(job.id,job.childIds[0],{});
 const saved=await f.ai.status(job.id);assert.equal(saved.state,'REJECTED');assert.equal(saved.attempts[0].operationReceiptId,'synthetic-verified-rejection');assert.equal(saved.attempts[0].spendState,'RELEASED_VERIFIED_NOT_ACCEPTED');assert.doesNotMatch(JSON.stringify(saved),/PRIVATE_MUTATED_VERIFIER_BODY/);
});

test('each of two real maintenance children receives only its exact pending evidence keys',async()=>{
 const f=await fixture();for(let n=1;n<37;n++)await f.s.capture(capture((await f.s.status()).epoch,'child-scope-'+n,'SYNTHETIC child scope '+n));
 const {readMaintenanceBatch}=await import('../core/ai-usage/maintenance-batch.js'),batch=await readMaintenanceBatch(f.ai,{scope:'library',contractVersion:'synthetic',routeVersion:'synthetic'}),job=await f.ai.plan(batch.request);await f.ai.reserve(job.id,{reservationId:'synthetic-scope'});
 assert.equal(job.childIds.length,2);const requests=[];
 for(const child of job.childIds)await f.ai.dispatch(job.id,child,fixtureProvider(async r=>{requests.push(r);return {accepted:true,operationReceiptId:'synthetic:'+child};}));
 for(const request of requests)assert.deepEqual(request.evidence.map(e=>e.key).sort(),[...new Set(request.coverage.map(u=>u.key))].sort());
 assert.deepEqual(requests.map(r=>r.evidence.length).sort((a,b)=>a-b),[12,25]);assert.equal((await f.ai.counters()).physicalAttempt,2);
});

test('partially local-completed Input is absent from remaining child request, without reducing full-job qualification',async()=>{
 const f=await fixture();await f.s.capture(capture((await f.s.status()).epoch,'child-local','SYNTHETIC sibling'));
 const items=(await f.ai.collect()).items,coverage=items.flatMap(i=>[unit(i),unit(i,'context')]),job=await plan(f,{items,coverage});
 for(const facet of ['topic','context'])await f.ai.resolveLocal(job.id,{facet,units:coverage.filter(u=>u.key===items[0].key&&u.facet===facet)});
 await f.ai.reserve(job.id,{reservationId:'synthetic-partial'});let request;
 await f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async r=>{request=r;return {accepted:true,operationReceiptId:'synthetic-partial'};}));
 assert.deepEqual(request.evidence.map(e=>e.key),[items[1].key]);assert.ok(request.coverage.every(u=>u.key===items[1].key));
});

test('missing or ambiguous persisted child evidence refuses before an attempt or receipt change',async()=>{
 for(const corrupt of ['missing','duplicate']){const f=await fixture(),job=await plan(f);await f.ai.reserve(job.id,{reservationId:'synthetic-corrupt'});await f.s.foundationWrite(async t=>{const row=await t.get('organizerJobs',job.id);row.items=corrupt==='missing'?[]:[...row.items,row.items[0]];await t.put('organizerJobs',row);});
 const snapshot=()=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','organizerJobs','organizerUsage'].map(async n=>[n,await t.all(n)])))),before=await snapshot();let calls=0;
 await assert.rejects(f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{calls++;return {accepted:true,operationReceiptId:'synthetic-invalid'};})));assert.equal(calls,0);assert.deepEqual(await snapshot(),before);}
});

test('narrow child metadata never narrows authority or current checks for sibling evidence',async()=>{
 const f=await fixture();await f.s.capture(capture((await f.s.status()).epoch,'child-fence','SYNTHETIC sibling fence'));const items=(await f.ai.collect()).items,coverage=items.map(i=>unit(i)),job=await plan(f,{items,coverage,children:coverage.map(u=>[u])});await f.ai.reserve(job.id,{reservationId:'synthetic-full-fence'});
 const saved=await read(f.s,'organizerJobs',job.id),selected=saved.childCoverage[0][0].key,sibling=items.find(i=>i.key!==selected);await inputEdit(f.s,sibling.descriptor.entityId,{excluded:true});let calls=0;
 await assert.rejects(f.ai.dispatch(job.id,job.childIds[0],fixtureProvider(async()=>{calls++;})),e=>['CANCELLED','STALE_BASE'].includes(e.code));assert.equal(calls,0);assert.equal((await f.ai.counters()).physicalAttempt,0);
});
