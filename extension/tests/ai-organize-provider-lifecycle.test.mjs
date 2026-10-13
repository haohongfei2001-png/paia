import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {LocalOrganizeSession} from '../core/organizer/local-organize-session.js';
import {aiCandidateKey} from '../core/organizer/ai-candidate.js';
const id=()=>crypto.randomUUID();
async function fixture(version=1){const {s}=await setup(OrganizerStore),input=(await s.snapshot()).library.blocks[0],permission={allowed:true};let calls=0;
const options={resolveAuthority:async(_t,r)=>({...permission,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),profile:{contractVersion:'local-synthetic-v1',modelVersion:'synthetic',promptVersion:'synthetic'},routeVersion:'local-synthetic',incrementalVersion:version};
const session=new LocalOrganizeSession(s,options),provider={describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async q=>{calls++;if(version>=2)return {version:2,blocks:q.inputs.flatMap(i=>[{field:'currentView',text:i.text,evidenceEntryIds:[i.ref],sourceSpans:[{entryId:i.ref,revision:i.revision,start:0,end:i.text.length}]}])};return {presentation:{topicId:q.topicId,currentView:q.inputs[0].text,blockSummary:'Synthetic summary',evidenceEntryIds:q.inputs.map(x=>x.ref)},sourceSpans:[]};}};
async function topic(){const entry=await derived(s,[input.id]),topic=await s.createTopic({name:'Sequential '+id(),operationId:id()});await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:(await s.entry(entry.id)).revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:id()});return topic;}
async function adopt(topic,mode='adopt'){const c=(await s.aiPresentationStatus({topicId:topic.id})).topics[0].candidate;const edit={topicId:topic.id,expectedRevision:c.expectedRevision,expectedCandidateKey:aiCandidateKey(c),candidateDecisions:Object.fromEntries(c.changedFields.map((k,i)=>[k,mode==='partial'?(i===0?'adopt':'keep'):mode])),operationId:id()};await s.editAIPresentation(edit);return edit;}
return {s,session,provider,topic,adopt,permission,calls:()=>calls};}

const all=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
for(const [version,children,completed] of [[1,1,0],[2,1,0],[3,1,0],[2,2,0],[3,2,0],[2,2,1],[3,2,1]])for(const stop of ['timeout','dispose'])for(const late of ['resolve','reject'])test(`V${version} ${children} children ${completed} completed ${stop} bounds physical wait and ignores late ${late}`,async()=>{
 const f=await fixture(version);let resolve,reject,started,options,calls=0,reads=0;
 const begun=new Promise(r=>started=r),physical=new Promise((a,b)=>{resolve=a;reject=b;});
 try{
  f.s.organizerBudget.limits.timeoutMs=25;
  const t=await f.topic();if(children===2)for(let i=0;i<20;i++){const e=await f.s.createEntry({actor:'user',operationId:id(),body:'Additional input '+i,type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({topicId:t.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await f.s.topic(t.id)).organizationRevision,operationId:id()});}
  const h=await f.session.prepare({topicId:t.id,children});
  const provider={...f.provider,execute:(_q,o)=>{calls++;if(calls<=completed)return f.provider.execute(_q);options=o;started();return physical;}};
  const running=f.session.run(h,provider);await begun;if(stop==='dispose')f.session.dispose();
  const result=await Promise.race([running,new Promise(r=>setTimeout(()=>r({state:'STILL_PENDING'}),150))]);
  assert.equal(result.state,'OUTCOME_UNKNOWN');assert.equal(options.signal.aborted,true);assert.equal(calls,completed+1);
  const before=await all(f.s);assert.equal(before.organizerUsage.filter(x=>x.attemptCount===1).length,completed+1);const attempt=before.organizerUsage.find(x=>x.state==='OUTCOME_UNKNOWN');assert.equal(attempt.state,'OUTCOME_UNKNOWN');assert.equal(attempt.spendState,'RESERVATION_RETAINED');assert.equal(before.organizerWorkItems.length,0);const writes=f.s.repository.metrics.writes;
  if(late==='resolve')resolve(Object.defineProperty({},'private',{enumerable:true,get(){reads++;throw Error('late body inspected');}}));else reject(Error('late provider failure'));
  await physical.catch(()=>{});await new Promise(r=>setImmediate(r));
  const after=await all(f.s);
  assert.equal(reads,0);assert.deepEqual(after,before);assert.equal(f.s.repository.metrics.writes,writes);assert.equal(calls,completed+1);await assert.rejects(f.session.run(h,provider));assert.equal(calls,completed+1);
 }finally{resolve?.({});f.session.dispose();await f.s.repository.close();}
});
