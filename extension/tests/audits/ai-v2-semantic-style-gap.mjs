import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../harness/thought-m1.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {LocalOrganizeSession} from '../../core/organizer/local-organize-session.js';
import {aiCandidateKey} from '../../core/organizer/ai-candidate.js';
const profile={contractVersion:'local-incremental-v2',modelVersion:'synthetic',promptVersion:'synthetic'},authority=async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
async function fixture(){const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Incremental',operationId:crypto.randomUUID()}),pref=await s.aiStylePreference();await s.updatePreferences({aiOrganizeStyle:{version:1,value:'original',expectedRevision:pref.revision,expectedEpoch:pref.epoch}});return {s,topic,ids:[],payloads:[]};}
async function add(f,n){for(let i=0;i<n;i++){const e=await f.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'e'+f.ids.length,type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({topicId:f.topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});f.ids.push(e.id);}}
async function refresh(f,{holdCandidate=false,answer=null}={}){const session=new LocalOrganizeSession(f.s,{resolveAuthority:authority,profile,routeVersion:'synthetic',incrementalVersion:2}),h=await session.prepare({topicId:f.topic.id});if(h.state==='NO_DELTA'){session.dispose();return h;}const result=await session.run(h,{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async r=>{f.payloads.push(structuredClone(r));if(answer)return answer(r);return {version:2,blocks:r.inputs.map(i=>({field:'currentView',text:i.text,evidenceEntryIds:[i.ref],sourceSpans:[{entryId:i.ref,revision:i.revision,start:0,end:i.text.length}]}))};}});const status=(await f.s.aiPresentationStatus({topicId:f.topic.id})).topics[0],candidate=status.candidate;assert.ok(candidate);if(holdCandidate){session.dispose();return candidate;}await f.s.editAIPresentation({topicId:f.topic.id,expectedRevision:candidate.expectedRevision,expectedCandidateKey:aiCandidateKey(candidate),candidateDecisions:Object.fromEntries(candidate.changedFields.map(k=>[k,'adopt'])),operationId:crypto.randomUUID()});session.dispose();return result;}

async function roundtrip(f){for(const value of ['concise','original']){const p=await f.s.aiStylePreference();await f.s.updatePreferences({aiOrganizeStyle:{version:1,value,expectedRevision:p.revision,expectedEpoch:p.epoch}});}}
const open=f=>new LocalOrganizeSession(f.s,{resolveAuthority:authority,profile,routeVersion:'synthetic',incrementalVersion:2});
test('canonical semantic A-B-A: unchanged accepted V2 scope is locally NO_DELTA without another call',async()=>{
 const f=await fixture();await add(f,2);await refresh(f);const before=(await f.s.aiPresentationStatus({topicId:f.topic.id})).topics[0].presentation;await roundtrip(f);
 const session=open(f);try{const handle=await session.prepare({topicId:f.topic.id});assert.equal(handle.state,'NO_DELTA');assert.equal(f.payloads.length,1);assert.deepEqual((await f.s.aiPresentationStatus({topicId:f.topic.id})).topics[0].presentation,before);}finally{session.dispose();}
});
test('canonical semantic A-B-A: five appended Entries remain the only selected delta',async()=>{
 const f=await fixture();await add(f,20);await refresh(f);await roundtrip(f);await add(f,5);const session=open(f);try{const handle=await session.prepare({topicId:f.topic.id}),request=await session.assemble(handle);assert.equal(request.inputs.length,5);assert.deepEqual(request.inputs.map(x=>x.ref),f.ids.slice(-5));assert.equal(f.payloads.length,1);}finally{session.dispose();}
});
