import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {key,policy,profileDefault,validateMemoryRow} from '../core/memory/model.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as FixtureBackup} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';

const op=()=>crypto.randomUUID();
const tables=['records','recordIndex','blocks','inputStates','thoughts','topics','sections','placements','provenance','dependencies','revisions','operationReceipts','organizerJobs'];
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(tables.map(async name=>[name,await t.all(name)]))));
const topic=(s,name)=>s.createTopic({name,operationId:op()});

async function legacyAllow(f,id,profileId='default'){
 // Synthetic retained pre-retirement permission. Production grant creation
 // remains unavailable and is not re-enabled by this regression fixture.
 const row={id:key('topic',profileId,id),kind:'topic',version:1,profileId,topicId:id,decision:'allowed',layoutGeneration:(await f.s.topic(id)).activeLayoutGeneration};
 assert.equal(validateMemoryRow(row),true);
 await f.s.foundationWrite(t=>t.put('meta',row));
}
async function fixture({targetAllowed=false,sourceLast=false}={}){
 const {s}=await setup(OrganizerStore);await s.setFilterMode('off');
 const input=(await s.snapshot()).library.blocks[0];let entry=await derived(s,[input.id],{body:'One synthetic body shared by two independent Topics.'});
 const uuid=s.uuid;if(sourceLast)s.uuid=()=>`zz-source-${op()}`;
 const a=await topic(s,'Restricted source A');s.uuid=uuid;
 const b=await topic(s,'Previously allowed B'),c=await topic(s,'Default-off C');
 for(const owner of [a,b]){await s.placeEntry({entryId:entry.id,topicId:owner.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(owner.id)).organizationRevision,operationId:op()});entry=await s.entry(entry.id);}
 const memory=new MemoryService(s);await memory.ready();
 const f={s,memory,input,entryId:entry.id,a,b,c};await legacyAllow(f,b.id);if(targetAllowed)await legacyAllow(f,c.id);return f;
}
async function request(f){return {entryId:f.entryId,sourceTopicId:f.a.id,targetTopicId:f.c.id,expectedEntryRevision:(await f.s.entry(f.entryId)).revision,expectedSourceRevision:(await f.s.topic(f.a.id)).organizationRevision,expectedTargetRevision:(await f.s.topic(f.c.id)).organizationRevision,operationId:op()};}
async function access(f,profileId='default'){
 return f.s.repository.transaction(false,async t=>{
  const topics=new Map((await t.all('topics')).map(row=>[row.id,row])),state=await f.memory.state(t);
  assert.ok(state.rows.every(validateMemoryRow));
  const p=policy(state.rows,profileId,{},topics);
  return {paths:(await f.memory.permittedPaths(t,f.entryId,topics,p)).map(path=>path.topic.id).sort(),permissions:state.rows};
 });
}
async function deny(f,decision='denied',profileId='default'){
 if(profileId!=='default')await f.s.foundationWrite(t=>t.put('meta',{...profileDefault(),id:key('profile',profileId),profileId,name:'Synthetic retained profile'}));
 await f.memory.authorize({profileId,topicIds:[f.a.id],decision});
}

for(const variant of ['denied','never','section','other_profile_never'])test('TOPIC-01 move preserves effective access and all data under '+variant,async()=>{
 const f=await fixture();
 if(variant==='section')await f.memory.exclude({topicId:f.a.id,sectionId:f.a.sectionId,excluded:true});
 else await deny(f,variant==='other_profile_never'?'never':variant,variant==='other_profile_never'?'retained':'default');
 const before=await snapshot(f.s),scope=await access(f);assert.equal(scope.paths.length,0);
 assert.equal(scope.permissions.find(row=>row.kind==='config').externalAccess,false);
 await assert.rejects(f.s.moveMembership(await request(f)),{code:'MEMORY_DENIED'});
 assert.deepEqual(await access(f),scope);assert.deepEqual(await snapshot(f.s),before);
 await assert.rejects(f.memory.build(),{code:'FEATURE_UNAVAILABLE'});
});

test('TOPIC-01 a denial in another retained profile survives global movement',async()=>{
 const f=await fixture();await deny(f,'denied','retained');await legacyAllow(f,f.b.id,'retained');
 const before=await snapshot(f.s),defaultScope=await access(f),retained=await access(f,'retained');
 assert.deepEqual(defaultScope.paths,[f.b.id]);assert.equal(retained.paths.length,0);
 await assert.rejects(f.s.moveMembership(await request(f)),{code:'MEMORY_DENIED'});
 assert.deepEqual(await access(f),defaultScope);assert.deepEqual(await access(f,'retained'),retained);assert.deepEqual(await snapshot(f.s),before);
});

test('TOPIC-01 current source restriction is checked after request preparation',async()=>{
 const f=await fixture({targetAllowed:true}),r=await request(f);await deny(f);const before=await snapshot(f.s),scope=await access(f);
 await assert.rejects(f.s.moveMembership(r),{code:'MEMORY_DENIED'});assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await access(f),scope);
});

test('TOPIC-01 complete paged permission scan reaches a valid late denial',async()=>{
 const f=await fixture({sourceLast:true});
 for(let i=0;i<126;i++){const extra=await topic(f.s,'Synthetic unrelated permission '+i);await legacyAllow(f,extra.id);}
 await deny(f);let pages=0,visited=0;const transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const page=t.primaryRangePage.bind(t);t.primaryRangePage=async(name,options)=>{const result=await page(name,options);if(write&&name==='meta'&&options.prefix==='memory:topic:'){pages++;visited+=result.rows.length;assert.ok(result.rows.length<=100);}return result;};return fn(t);},stores);
 const before=await snapshot(f.s),scope=await access(f);
 await assert.rejects(f.s.moveMembership(await request(f)),{code:'MEMORY_DENIED'});
 assert.ok(pages>=2);assert.ok(visited>=128);assert.deepEqual(await access(f),scope);assert.deepEqual(await snapshot(f.s),before);
});

for(const variant of ['default_off','allowed','entry_excluded','unrelated_denial'])test('TOPIC-01 lawful move keeps existing permission meaning for '+variant,async()=>{
 const f=await fixture();
 if(variant==='allowed')await legacyAllow(f,f.a.id);
 if(variant==='entry_excluded')await f.memory.exclude({entryId:f.entryId,excluded:true});
 if(variant==='unrelated_denial'){const other=await topic(f.s,'Unrelated restricted Topic');await f.memory.authorize({topicIds:[other.id],decision:'never'});}
 const before=await access(f),facts=await f.s.repository.transaction(false,async t=>({records:await t.all('records'),blocks:await t.all('blocks'),provenance:await t.all('provenance')}));
 const result=await f.s.moveMembership(await request(f));assert.equal(result.conflict,undefined);
 const after=await access(f);assert.deepEqual(after.permissions,before.permissions);assert.deepEqual(after.paths,variant==='entry_excluded'?[]:[f.b.id]);assert.ok(!after.paths.includes(f.c.id));
 const entry=await f.s.entry(f.entryId);assert.ok(entry.organizationIntents.included.includes(f.c.id));assert.ok(entry.organizationIntents.excluded.includes(f.a.id));
 assert.equal(entry.thoughtText,'One synthetic body shared by two independent Topics.');
 assert.deepEqual(await f.s.repository.transaction(false,async t=>({records:await t.all('records'),blocks:await t.all('blocks'),provenance:await t.all('provenance')})),facts);
});

test('TOPIC-01 only a separate permission-owner change can remove the source restriction',async()=>{
 const f=await fixture();await deny(f);const r=await request(f);await assert.rejects(f.s.moveMembership(r),{code:'MEMORY_DENIED'});
 await f.memory.authorize({topicIds:[f.a.id],decision:'default'});const before=await access(f);
 await f.s.moveMembership(r);const after=await access(f);assert.deepEqual(after.permissions,before.permissions);assert.deepEqual(after.paths,[f.b.id]);
});

test('TOPIC-01 malformed retained permission fails closed before movement',async()=>{
 const f=await fixture();await f.s.foundationWrite(t=>t.put('meta',{id:'memory:topic:["malformed"]',kind:'topic',version:1,profileId:'default',topicId:f.a.id,decision:'denied',layoutGeneration:1}));
 const before=await snapshot(f.s);await assert.rejects(f.s.moveMembership(await request(f)),{code:'MEMORY_INVALID'});assert.deepEqual(await snapshot(f.s),before);
});

test('TOPIC-01 an actual replace restore cannot supply a stale unrestricted move',async()=>{
 const f=await fixture();await deny(f);const items=await exported(new FixtureBackup(f.s,{appVersion:'0.13.0'}));
 await f.memory.authorize({topicIds:[f.a.id],decision:'default'});const r=await request(f),service=new BackupService(f.s),staged=await prepared(service,items);
 const operation=f.s.operation.bind(f.s);let restoredBefore;
 f.s.operation=async(req,fn)=>{if(req.operationId===r.operationId){const preview=await service.previewRestore({sessionId:staged.sessionId,mode:'replace'});await service.restore({sessionId:staged.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});restoredBefore=await snapshot(f.s);}return operation(req,fn);};
 await assert.rejects(f.s.moveMembership(r),{code:'MEMORY_DENIED'});assert.ok(restoredBefore);assert.deepEqual(await snapshot(f.s),restoredBefore);assert.equal((await access(f)).paths.length,0);
});

test('TOPIC-01 allowed move still rolls back both membership edges on target-write failure',async()=>{
 const f=await fixture(),before=await snapshot(f.s),scope=await access(f),transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const put=t.put.bind(t);t.put=async(name,row,...args)=>{if(write&&name==='placements'&&row.topicId===f.c.id)throw Error('synthetic target write failure');return put(name,row,...args);};return fn(t);},stores);
 await assert.rejects(f.s.moveMembership(await request(f)));assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await access(f),scope);
});

async function placementRequest(f,extra={}){
 const p=await f.s.libraryPlacement(f.a.id,f.entryId);
 return {entryId:f.entryId,topicId:f.a.id,sectionId:p.sectionId,expectedPlacementRevision:p.revision,expectedEntryRevision:(await f.s.entry(f.entryId)).revision,expectedTopicRevision:(await f.s.topic(f.a.id)).organizationRevision,operationId:op(),...extra};
}
async function section(f,title){return f.s.createSection({topicId:f.a.id,title,expectedTopicRevision:(await f.s.topic(f.a.id)).organizationRevision,operationId:op()});}
async function layoutRequest(f,kind='topic_merge',extra={}){
 return {kind,topicId:f.a.id,...(kind==='topic_merge'?{survivorId:f.c.id,expectedSurvivorRevision:(await f.s.topic(f.c.id)).organizationRevision}:{}),expectedTopicRevision:(await f.s.topic(f.a.id)).organizationRevision,operationId:op(),...extra};
}
async function restriction(f,kind){if(kind==='section')await f.memory.exclude({topicId:f.a.id,sectionId:(await f.s.libraryPlacement(f.a.id,f.entryId)).sectionId,excluded:true});else await deny(f,kind);}
for(const kind of ['denied','never','section'])for(const route of ['place_remove','topic_remove','topic_merge'])test('TOPIC-01 '+route+' retains current '+kind+' witness atomically',async()=>{
 const f=await fixture();await restriction(f,kind);const scope=await access(f),before=await snapshot(f.s);assert.equal(scope.paths.length,0);
 const action=route==='place_remove'?()=>f.s.placeEntry(placementRequestValue):route==='topic_remove'?()=>f.s.removeTopic({id:f.a.id,expectedRevision:topicRevision,operationId:op()}):()=>f.s.startLayout(layoutRequestValue);
 const placementRequestValue=await placementRequest(f,{remove:true}),topicRevision=(await f.s.topic(f.a.id)).revision,layoutRequestValue=await layoutRequest(f);
 await assert.rejects(action(),{code:'MEMORY_DENIED'});assert.deepEqual(await access(f),scope);assert.deepEqual(await snapshot(f.s),before);
});
test('TOPIC-01 direct Section relocation cannot discard a Section exclusion',async()=>{
 const f=await fixture(),next=await section(f,'New section');await restriction(f,'section');const scope=await access(f),before=await snapshot(f.s);
 await assert.rejects(f.s.placeEntry(await placementRequest(f,{sectionId:next.sectionId})),{code:'MEMORY_DENIED'});assert.deepEqual(await access(f),scope);assert.deepEqual(await snapshot(f.s),before);
});
test('TOPIC-01 same-Section edits and relocation under a retained Topic denial remain valid',async()=>{
 const f=await fixture(),next=await section(f,'New section');await deny(f);const scope=await access(f);
 await f.s.placeEntry(await placementRequest(f,{rank:'000000009999'}));assert.deepEqual(await access(f),scope);
 await f.s.placeEntry(await placementRequest(f,{sectionId:next.sectionId}));assert.deepEqual(await access(f),scope);
});
test('TOPIC-01 placement revision Undo cannot remove a newly denied membership',async()=>{
 const f=await fixture(),p=await f.s.libraryPlacement(f.a.id,f.entryId),rev=(await f.s.revisions({kind:'placement',entityId:p.id})).items.find(row=>row.before===null);
 assert.ok(rev);await deny(f);const before=await snapshot(f.s),scope=await access(f);
 await assert.rejects(f.s.restoreRevision({id:rev.id,side:'before',expectedRevision:p.revision,expectedEntryRevision:(await f.s.entry(f.entryId)).revision,expectedTopicRevision:(await f.s.topic(f.a.id)).organizationRevision,operationId:op()}),{code:'MEMORY_DENIED'});
 assert.deepEqual(await access(f),scope);assert.deepEqual(await snapshot(f.s),before);
});
test('TOPIC-01 Section merge admission retains excluded current Section',async()=>{
 const f=await fixture(),from=await section(f,'From'),to=await section(f,'To');await f.s.placeEntry(await placementRequest(f,{sectionId:from.sectionId}));await restriction(f,'section');const before=await snapshot(f.s),scope=await access(f);
 await assert.rejects(f.s.startLayout(await layoutRequest(f,'section_merge',{sectionId:from.sectionId,targetSectionId:to.sectionId})),{code:'MEMORY_DENIED'});assert.deepEqual(await access(f),scope);assert.deepEqual(await snapshot(f.s),before);
});
for(const kind of ['topic_merge','section_merge'])test('TOPIC-01 late Section exclusion cancels '+kind+' before activation and survives every batch',async()=>{
 const f=await fixture(),from=await section(f,'From'),to=await section(f,'To');await f.s.placeEntry(await placementRequest(f,{sectionId:from.sectionId}));
 const started=await f.s.startLayout(await layoutRequest(f,kind,kind==='section_merge'?{sectionId:from.sectionId,targetSectionId:to.sectionId}:{}));
 while((await f.s.layoutStatus(started.jobId)).phase!=='activate')await f.s.processLibraryMaintenance();
 await f.memory.exclude({topicId:f.a.id,sectionId:from.sectionId,excluded:true});const scope=await access(f);assert.equal(scope.paths.length,0);
 const result=await f.s.processLibraryMaintenance();assert.equal(result.cancelled,true);assert.equal(result.code,'MEMORY_DENIED');assert.equal((await f.s.layoutStatus(started.jobId)).state,'paused');assert.equal((await f.s.repository.transaction(false,t=>t.get('organizerJobs',started.jobId))).state,'cancelled');
 await f.s.drainLibraryMaintenance();assert.deepEqual(await access(f),scope);assert.equal((await f.s.topic(f.a.id)).layoutJobId,undefined);assert.equal((await f.s.topic(f.c.id)).layoutJobId,undefined);assert.equal((await f.s.libraryPlacement(f.a.id,f.entryId)).sectionId,from.sectionId);
 assert.equal((await f.s.topic(f.a.id)).activeLayoutGeneration,1);
 const items=await exported(new FixtureBackup(f.s,{appVersion:'0.13.1'})),service=new BackupService(f.s),staged=await prepared(service,items),preview=await service.previewRestore({sessionId:staged.sessionId,mode:'replace'});await service.restore({sessionId:staged.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});assert.deepEqual(await access(f),scope);
});
for(const kind of ['denied','never','section'])test('TOPIC-01 safe order staging preserves '+kind+' across omitted-map reads, batches and Undo',async()=>{
 const f=await fixture(),next=await section(f,'Another section');await restriction(f,kind);const scope=await access(f);
 const job=await f.s.startLayout(await layoutRequest(f,'section_order',{sectionId:f.a.sectionId,targetSectionId:next.sectionId}));
 for(;;){assert.deepEqual(await access(f),scope);await f.s.repository.transaction(false,async t=>{const rows=(await f.memory.state(t)).rows,all=new Map((await t.all('topics')).map(row=>[row.id,row])),limited=new Map([...all].filter(([id])=>id!==f.a.id));assert.equal((await f.memory.permittedPaths(t,f.entryId,limited,policy(rows,'default',{},limited))).length,0);});if((await f.s.layoutStatus(job.jobId)).state==='complete')break;await f.s.processLibraryMaintenance();}
 const rev=(await f.s.revisions({kind:'topic',entityId:f.a.id})).items.find(row=>row.layoutJobId===job.jobId);assert.ok(rev);
 await f.s.restoreRevision({id:rev.id,side:'before',expectedRevision:(await f.s.topic(f.a.id)).revision,operationId:op()});assert.deepEqual(await access(f),scope);
});
for(const side of ['before','after'])test('TOPIC-01 Topic layout '+side+' history checks current negative witnesses',async()=>{
 const f=await fixture(),job=await f.s.startLayout(await layoutRequest(f));await f.s.drainLibraryMaintenance();const rev=(await f.s.revisions({kind:'topic',entityId:f.c.id})).items.find(row=>row.layoutJobId===job.jobId);
 if(side==='after'){await f.s.restoreRevision({id:rev.id,side:'before',expectedRevision:(await f.s.topic(f.c.id)).revision,operationId:op()});await deny(f);}else await f.memory.authorize({topicIds:[f.c.id],decision:'denied'});
 const before=await snapshot(f.s),scope=await access(f);assert.equal(scope.paths.length,0);
 await assert.rejects(f.s.restoreRevision({id:rev.id,side,expectedRevision:(await f.s.topic(f.c.id)).revision,operationId:op()}),{code:'MEMORY_DENIED'});assert.deepEqual(await access(f),scope);assert.deepEqual(await snapshot(f.s),before);
});
test('TOPIC-01 Section merge Undo cannot lose a newer target Section exclusion',async()=>{
 const f=await fixture(),from=await section(f,'From'),to=await section(f,'To');await f.s.placeEntry(await placementRequest(f,{sectionId:from.sectionId}));const job=await f.s.startLayout(await layoutRequest(f,'section_merge',{sectionId:from.sectionId,targetSectionId:to.sectionId}));await f.s.drainLibraryMaintenance();
 await f.memory.exclude({topicId:f.a.id,sectionId:to.sectionId,excluded:true});const rev=(await f.s.revisions({kind:'topic',entityId:f.a.id})).items.find(row=>row.layoutJobId===job.jobId),before=await snapshot(f.s),scope=await access(f);
 await assert.rejects(f.s.restoreRevision({id:rev.id,side:'before',expectedRevision:(await f.s.topic(f.a.id)).revision,operationId:op()}),{code:'MEMORY_DENIED'});assert.deepEqual(await access(f),scope);assert.deepEqual(await snapshot(f.s),before);
});
