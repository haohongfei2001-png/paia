// Executable baseline audit only: demonstrates existing refusal and non-atomic
// per-child settlement. It does not implement a multi-child domain committer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../harness/thought-m1.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {LocalOrganizeSession} from '../../core/organizer/local-organize-session.js';
import {AIUsageFoundation} from '../../core/ai-usage/foundation.js';
const authority=async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
async function fixture(n){const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic closure audit',operationId:crypto.randomUUID()}),keys=[];for(let i=0;i<n;i++){const e=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'e'+i,type:'idea',formation:'explicit',evidence:[]});await s.placeEntry({topicId:topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});keys.push(JSON.stringify(['library_entry',e.id]));}return {s,topic,keys};}
const rows=(s,table)=>s.run(()=>s.repository.transaction(false,t=>t.all(table)));
function request(f,items,size){const coverage=items.map(i=>({key:i.key,facet:'organize',scope:f.topic.id})),children=[];for(let i=0;i<coverage.length;i+=size)children.push(coverage.slice(i,i+size));return {type:'AI_ORGANIZE',intent:'explicit',items,coverage,children,contractVersion:'synthetic-audit',routeVersion:'synthetic-audit'};}
test('actual 60-Entry delta has no current LocalSession three-child assembly',async()=>{const f=await fixture(60),session=new LocalOrganizeSession(f.s,{resolveAuthority:authority,profile:{contractVersion:'synthetic-v2',modelVersion:'synthetic',promptVersion:'synthetic'},routeVersion:'synthetic',incrementalVersion:2});assert.deepEqual(await session.prepare({topicId:f.topic.id,children:3}),{state:'DEFER',reason:'multiple_children_not_supported'});await assert.rejects(session.prepare({topicId:f.topic.id}),{code:'BUDGET_EXCEEDED'});assert.equal((await rows(f.s,'organizerUsage')).length,0);session.dispose();console.log('MULTICHILD_GAP',JSON.stringify({actualEntries:60,currentAssembly:'DEFER',attempts:0}));});
test('existing Foundation three-child dispatch works but separate commitFacet calls persist a partial closure',async()=>{const f=await fixture(60);let rejectChild=false,ownerCalls=0;const ai=new AIUsageFoundation(f.s,{resolveAuthority:authority,committers:{organize:async(t,r)=>{ownerCalls++;await t.put('meta',{id:'synthetic-audit-domain-write',child:r.childOperationId});if(rejectChild)throw Error('Synthetic later-child abort');return {committed:true,coverage:r.units};}}}),{items}=await ai.describe({keys:f.keys}),req=request(f,items,20),job=await ai.plan(req);await ai.reserve(job.id,{reservationId:'synthetic-audit'});const dispatched=[];for(const childId of job.childIds)await ai.dispatch(job.id,childId,{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async r=>{dispatched.push([r.evidence.length,r.coverage.length]);return {accepted:true,operationReceiptId:r.childOperationId};}});assert.deepEqual(dispatched,[[20,20],[20,20],[20,20]]);const stored=await ai.read(t=>ai.job(t,job.id));await ai.commitFacet(job.id,job.childIds[0],{facet:'organize',units:stored.childCoverage[0]});rejectChild=true;await assert.rejects(ai.commitFacet(job.id,job.childIds[1],{facet:'organize',units:stored.childCoverage[1]}));const state=await ai.status(job.id);assert.equal(state.committedCoverage.length,20);assert.deepEqual(state.attempts.map(r=>r.state),['COMMITTED','RESPONSE_RECORDED','RESPONSE_RECORDED']);const domain=await ai.read(t=>t.get('meta','synthetic-audit-domain-write'));assert.equal(domain.child,job.childIds[0]);assert.equal(ownerCalls,2);console.log('MULTICHILD_GAP',JSON.stringify({actualEntries:60,children:3,metadataCounts:dispatched,partialCoverage:state.committedCoverage.length,laterRollbackDoesNotUndoFirst:true}));});
test('existing Foundation accepts four bounded children and rejects five before writes or calls',async()=>{const f=await fixture(80),ai=new AIUsageFoundation(f.s,{resolveAuthority:authority}),{items}=await ai.describe({keys:f.keys}),before=await rows(f.s,'organizerJobs');await assert.rejects(ai.plan(request(f,items,16)),{code:'INVALID_REQUEST'});assert.deepEqual(await rows(f.s,'organizerJobs'),before);assert.equal((await rows(f.s,'organizerUsage')).length,0);const job=await ai.plan(request(f,items,20));assert.equal(job.childIds.length,4);console.log('MULTICHILD_GAP',JSON.stringify({actualEntries:80,fourAccepted:true,fiveRejectedBeforeAttempt:true}));});

// Frozen legacy owner, with only import URLs resolved against unchanged baseline
// dependencies. The complete Foundation implementation bytes are stored verbatim.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const frozen=await readFile(new URL('../fixtures/ai-multichild-old-owner/foundation.mjs',import.meta.url),'utf8');
const dependencyBase=new URL('../../core/ai-usage/',import.meta.url);
const frozenModule=await import('data:text/javascript;base64,'+Buffer.from(frozen.replace(/from '(\.[^']+)'/g,(_m,p)=>`from '${new URL(p,dependencyBase).href}'`)).toString('base64'));
test('frozen old generic job/commitFacet/resolveLocal reject proposed distinct atomic job kind with zero writes',async()=>{
 const f=await fixture(2),old=new frozenModule.AIUsageFoundation(f.s,{resolveAuthority:authority,committers:{organize:()=>{throw Error('must not reach domain owner');}}}),{items}=await old.describe({keys:f.keys}),job=await old.plan(request(f,items,1));
 await old.reserve(job.id,{reservationId:'synthetic-discriminator-audit'});
 for(const id of job.childIds)await old.dispatch(job.id,id,{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:id})});
 const prior=await old.read(t=>old.job(t,job.id));
 // Controlled proposed-format fixture, not a claim that a new producer exists.
 await old.write(async t=>{await t.put('organizerJobs',{...prior,kind:'ai_organize_atomic_v1',commitMode:'organize-atomic-v1'});});
 const snapshot=()=>old.read(async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
 const before=await snapshot();
 await assert.rejects(old.read(t=>old.job(t,job.id)),{code:'INVALID_REQUEST'});
 await assert.rejects(old.commitFacet(job.id,job.childIds[0],{facet:'organize',units:prior.childCoverage[0]}),{code:'INVALID_REQUEST'});
 await assert.rejects(old.resolveLocal(job.id,{facet:'organize',units:prior.childCoverage[0]}),{code:'INVALID_REQUEST'});
 assert.deepEqual(await snapshot(),before);
 console.log('FROZEN_OWNER',JSON.stringify({baseline:'97c87938',sha256:createHash('sha256').update(frozen).digest('hex'),kind:'ai_organize_atomic_v1',entrypoints:3,wholeStoreUnchanged:true}));
});
