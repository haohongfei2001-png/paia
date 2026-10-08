import {STORAGE_KEY} from '../core/constants.js';
import {organizeCacheEvidenceVersion} from '../core/organizer/organize-cache-qualification.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {aiPresentationStatus,readOrganizeCacheSnapshotInTransaction,editAIPresentation} from '../core/organizer/ai-presentation.js';
async function fixture(){
 const {s,storage}=await setup(OrganizerStore),input=(await s.snapshot()).library.blocks[0];
 const made=await derived(s,[input.id]);
 const topic=await s.createTopic({name:'Synthetic cache Topic',operationId:crypto.randomUUID()});
 const entry=await s.entry(made.id);await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 return {s,storage,input,made,topic};
}
test('actual status exposes legacy cache as unqualified without relabeling saved work',async()=>{
 const {s,topic}=await fixture();const before=await aiPresentationStatus(s,{topicId:topic.id});
 assert.equal(before.topics[0].cacheQualification.state,'unavailable');
});
const profile={contractVersion:'synthetic-aios-v1',modelVersion:'synthetic-model-v1',promptVersion:'synthetic-prompt-v1'};
const read=f=>aiPresentationStatus(f.s,{topicId:f.topic.id},profile).then(x=>x.topics[0]);
const tx=(s,write,fn)=>s.run(()=>s.repository.transaction(write,fn));
async function saved({bound=true,checkpoint=true}={}){
 const f=await fixture();await aiPresentationStatus(f.s,{topicId:f.topic.id});
 await tx(f.s,true,async t=>{
  const basis=await readOrganizeCacheSnapshotInTransaction(f.s,t,f.topic.id);
  const row={id:'aiPresentation:'+f.topic.id,topicId:f.topic.id,revision:1,schemaVersion:1,blockSummary:'SYNTHETIC saved derivative',currentView:'SYNTHETIC qualified thought',keyInformation:[],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[],evidenceEntryIds:[f.made.id],protections:{},updatedAt:1};
  if(bound)row.cacheBinding={version:1,topicId:f.topic.id,presentationRevision:1,profile:{...profile},style:{value:'balanced',policyVersion:'AIOS-1.0'},evidenceVersion:basis.evidenceVersion};
  await t.put('meta',row);
  // Synthetic future writer fixture: the existing accepted-checkpoint owner is
  // part of the same saved-result transaction, not retroactively inferred by a read.
  if(checkpoint){const versions=Object.fromEntries(Object.entries(JSON.parse(basis.evidenceVersion).scopeVersions).map(([id,value])=>[id,JSON.parse(value)[0]]));await t.put('meta',{id:'aiOrganizerCheckpoint',view:'ai',version:3,inputVersions:{},topicVersions:{[f.topic.id]:versions},lastSequence:0});}
 });return f;
}
const all=f=>tx(f.s,false,async t=>Object.fromEntries(await Promise.all(['records','blocks','inputStates','thoughts','topics','sections','placements','meta','operationReceipts'].map(async name=>[name,await t.all(name)]))));
test('actual saved legacy remains readable but never gains style or model metadata',async()=>{
 const f=await saved({bound:false}),before=await all(f),r=await read(f);assert.equal(r.cacheQualification.state,'unqualified');assert.equal(r.cacheQualification.reason,'legacy_metadata');assert.equal(r.presentation.currentView,'SYNTHETIC qualified thought');assert.deepEqual(await all(f),before);
});
test('internal synthetic profile qualifies same evidence without writes or provider access; public options cannot configure it',async()=>{
 const f=await saved(),before=await all(f);for(let i=0;i<3;i++){const r=await read(f);assert.deepEqual(r.cacheQualification,{state:'exact',reason:'same_semantic_version',reusable:true,dispatchAllowed:false});}
 const publicResult=await aiPresentationStatus(f.s,{topicId:f.topic.id,expectedProfile:profile});assert.equal(publicResult.topics[0].cacheQualification.reason,'profile_unavailable');assert.deepEqual(await all(f),before);
});
test('A to B to A uses semantic style, not monotonically changing preference revision',async()=>{
 const f=await saved();assert.equal((await read(f)).cacheQualification.state,'exact');
 assert.equal((await f.s.updatePreferences({aiOrganizeStyle:{version:1,value:'concise',expectedRevision:0,expectedEpoch:'initial'}})).ok,true);assert.equal((await read(f)).cacheQualification.reason,'style_changed');
 assert.equal((await f.s.updatePreferences({aiOrganizeStyle:{version:1,value:'balanced',expectedRevision:1,expectedEpoch:'initial'}})).ok,true);assert.equal((await read(f)).cacheQualification.state,'exact');
});
test('unrelated local metadata does not invalidate; changed evidence and same-revision restore epoch do',async()=>{
 const f=await saved();await tx(f.s,true,t=>t.put('meta',{id:'synthetic-unrelated-context',value:2}));assert.equal((await read(f)).cacheQualification.state,'exact');
 await tx(f.s,true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-restored'}));assert.equal((await read(f)).cacheQualification.reason,'evidence_changed');assert.ok((await read(f)).presentation);
 const g=await saved();await inputEdit(g.s,g.input.id,{libraryText:'SYNTHETIC revised permitted Input'});assert.notEqual((await read(g)).cacheQualification.state,'exact');
});
test('partial new Topic material invalidates exact coverage without hiding saved permitted output',async()=>{
 const f=await saved();await f.s.continueThinking({topicId:f.topic.id,operationId:crypto.randomUUID(),body:'SYNTHETIC new local Entry'});const r=await read(f);assert.equal(r.cacheQualification.reason,'evidence_changed');assert.ok(r.presentation);
});
test('protected human fields never become reusable generated cache; no read overwrites them',async()=>{
 const f=await saved();await editAIPresentation(f.s,{topicId:f.topic.id,field:'currentView',value:'SYNTHETIC human words',expectedRevision:1,operationId:crypto.randomUUID()});const before=await all(f),r=await read(f);assert.equal(r.cacheQualification.reason,'human_owned');assert.equal(r.presentation.currentView,'SYNTHETIC human words');assert.deepEqual(await all(f),before);
});
test('removed evidence is never exposed by the cache qualification path',async()=>{
 const f=await saved();await inputEdit(f.s,f.input.id,{excluded:true});const r=await read(f);assert.equal(r.presentation,null);assert.equal(r.cacheQualification.reusable,false);assert.notEqual(r.cacheQualification.state,'stale-but-readable');
});
test('malformed binding and changed expected route fail closed without rewriting saved work',async()=>{
 const f=await saved();const other=await aiPresentationStatus(f.s,{topicId:f.topic.id},{...profile,promptVersion:'synthetic-v2'});assert.equal(other.topics[0].cacheQualification.reason,'profile_changed');
 await tx(f.s,true,async t=>{const row=await t.get('meta','aiPresentation:'+f.topic.id);row.cacheBinding.extra=true;await t.put('meta',row);});assert.equal((await read(f)).cacheQualification.reason,'invalid_metadata');
});
test('existing purge refusal is preserved; explicit tombstoned-state fixture never exposes generated evidence',async()=>{
 const f=await saved(),record=(await f.s.snapshot()).records[0],before=await all(f);await assert.rejects(f.s.purge(record.id,true),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await all(f),before);
 // Read-side negative only: the current Source purge owner does not admit this graph.
 // A persisted tombstone is injected to test existing eligibility, not to simulate successful purge.
 await tx(f.s,true,async t=>{const state=await t.get('inputStates',f.input.id);state.sourcePurged=true;await t.put('inputStates',state);});const r=await read(f);assert.equal(r.presentation,null);assert.equal(r.cacheQualification.reusable,false);assert.deepEqual(Object.keys(r.cacheQualification).sort(),['dispatchAllowed','reason','reusable','state']);assert.equal(JSON.stringify(r.cacheQualification).includes(f.input.id),false);
});
test('future preference and recovery in progress cannot yield exact cache authority',async()=>{
 const f=await saved();const control=await f.storage.get(STORAGE_KEY);control[STORAGE_KEY].preferences.aiOrganizeStyle={version:2,value:'balanced',revision:9,explicit:true};await f.storage.set(control);assert.equal((await read(f)).cacheQualification.reason,'style_unavailable');
 const g=await saved();await tx(g.s,true,t=>t.put('meta',{id:'backup-recovery-settings',value:true}));assert.equal((await read(g)).cacheQualification.reason,'incomplete_evidence');
});
test('saved row, evidence, actual restore epoch and Section facts are read inside the same repository transaction',async()=>{
 const f=await saved(),original=f.s.repository.transaction.bind(f.s.repository),events=[];let serial=0;
 f.s.repository.transaction=(write,run,...args)=>original(write,async t=>{const id=++serial;return run(new Proxy(t,{get(target,key){const fn=target[key];if(typeof fn!=='function')return fn;return(...values)=>{if(key==='get'||key==='all')events.push({id,key,values});return fn.apply(target,values);};}}));},...args);
 try{assert.equal((await read(f)).cacheQualification.state,'exact');}finally{f.s.repository.transaction=original;}
 const row=events.find(e=>e.key==='get'&&e.values[1]==='aiPresentation:'+f.topic.id);assert.ok(row);for(const marker of ['recovery-restore-epoch','gate'])assert.ok(events.some(e=>e.id===row.id&&e.key==='get'&&e.values[1]===marker));for(const name of ['sections','placements','dependencies'])assert.ok(events.some(e=>e.id===row.id&&e.values[0]===name));
});
test('bounded metadata declines exact qualification without truncation or provider invocation',async()=>{
 assert.equal(organizeCacheEvidenceVersion({token:'x'.repeat(256*1024)}),null);
 const f=await saved(),original=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('Unexpected network');};
 try{assert.equal((await read(f)).cacheQualification.state,'exact');assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
test('actual candidate retirement marks needsUpdate without revision change and forbids exact reuse',async()=>{
 const f=await saved();const {clearDerivedMetadata}=await import('../core/organizer/metadata.js');
 await tx(f.s,true,async t=>{const row=await t.get('meta','aiPresentation:'+f.topic.id);row.candidate={};await t.put('meta',row);await clearDerivedMetadata(f.s,t,{ownerKind:'ai_presentation_candidate',ownerId:f.topic.id});});
 const r=await read(f);assert.equal(r.stale,true);assert.equal(r.presentation.revision,1);assert.equal(r.cacheQualification.state,'stale-but-readable');assert.equal(r.cacheQualification.reusable,false);
});
test('a valid pending proposal cannot turn the current saved projection into an exact reusable result',async()=>{
 const f=await saved();const {createAIPresentationCandidate}=await import('../core/organizer/ai-candidate.js');
 await tx(f.s,true,async t=>{const row=await t.get('meta','aiPresentation:'+f.topic.id),e=JSON.parse(row.cacheBinding.evidenceVersion);row.candidate=createAIPresentationCandidate(row,{...row,currentView:'SYNTHETIC pending proposal'},{materialVersions:e.scopeVersions,sourceBinding:{organizationRevision:e.organizationRevision,generation:e.generation,epoch:String(e.gateEpoch),coverage:JSON.stringify([e.coverage.intendedCount,e.coverage.excluded,e.coverage.unavailable]),policy:e.policy}});await t.put('meta',row);});
 const r=await read(f);assert.ok(r.candidate);assert.equal(r.candidate.stale,false);assert.equal(r.presentation.currentView,'SYNTHETIC qualified thought');assert.equal(r.cacheQualification.reusable,false);
});
test('actual consent epoch and retained restrictive policy owner invalidate exact qualification',async()=>{
 const f=await saved();await f.s.setEnabled(false);await f.s.setEnabled(true);assert.notEqual((await read(f)).cacheQualification.state,'exact');
 const g=await saved();const {MemoryService}=await import('../core/memory/service.js');const memory=new MemoryService(g.s);await memory.settings({localOnly:true});assert.equal((await read(g)).cacheQualification.reason,'evidence_changed');await assert.rejects(memory.settings({externalAccess:true}),{code:'FEATURE_UNAVAILABLE'});
});

test('exact cache metadata cannot override the existing owner pending evidence checkpoint',async()=>{
 const f=await saved({checkpoint:false}),r=await read(f);assert.equal(r.stale,true);assert.equal(r.pending,true);assert.equal(r.cacheQualification.reusable,false);assert.ok(r.presentation);
});
