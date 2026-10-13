import assert from 'node:assert/strict';

export async function verifyOrganizeLifecycleNative(page,label){
 const report=await page.evaluate(async label=>{
  const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js')),{LocalOrganizeSession}=await import(chrome.runtime.getURL('core/organizer/local-organize-session.js')),{aiCandidateKey}=await import(chrome.runtime.getURL('core/organizer/ai-candidate.js'));
  const results=[];
  for(const version of [1,2,3])for(const abort of [false,true]){
   const local={v:{},async get(k){return {[k]:this.v[k]};},async set(v){Object.assign(this.v,v);}},s=new OrganizerStore(local,{name:'organize-lifecycle-'+label+'-'+version+'-'+abort});await s.consent(true);await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'lifecycle',url:'https://chatgpt.com/c/lifecycle',title:'Synthetic'},messages:[{sourceMessageId:'lifecycle',pageOrder:1,originalText:'SYNTHETIC original lifecycle evidence'}]});
   const input=(await s.snapshot()).library.blocks[0],topics=[];
   for(let i=0;i<9;i++){
    const evidence=await s.evidenceFor([{inputId:input.id,role:'primary',selectedFields:['body']}]),entry=await s.createEntry({operationId:crypto.randomUUID(),actor:'ai',body:'SYNTHETIC lifecycle '+i,type:'judgment',formation:'explicit',evidence,generator:{providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1}}),topic=await s.createTopic({name:'Lifecycle '+i,operationId:crypto.randomUUID()});await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:(await s.entry(entry.id)).revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});topics.push(topic);
   }
   const session=new LocalOrganizeSession(s,{incrementalVersion:version,profile:{contractVersion:'local-synthetic-v1',modelVersion:'synthetic',promptVersion:'synthetic'},routeVersion:'synthetic',resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})});
   let calls=0,abortCode=null,capacityCode=null,rollback=null,retiredCode=null,replay=null,replayCalls=0;const handles=[],states=[];
   const all=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
   const provider={describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async r=>{calls++;return version===1?{presentation:{topicId:r.topicId,currentView:r.inputs[0].text,evidenceEntryIds:r.inputs.map(i=>i.ref)},sourceSpans:[{field:'currentView',index:null,entryId:r.inputs[0].ref,revision:r.inputs[0].revision,start:0,end:r.inputs[0].text.length}]}:{version:2,blocks:r.inputs.map(i=>({field:'currentView',text:i.text,evidenceEntryIds:[i.ref],sourceSpans:[{entryId:i.ref,revision:i.revision,start:0,end:i.text.length}]}))};}};
   const adoption=async topic=>{const c=(await s.aiPresentationStatus({topicId:topic.id})).topics[0].candidate;return {topicId:topic.id,expectedRevision:c.expectedRevision,expectedCandidateKey:aiCandidateKey(c),candidateDecisions:Object.fromEntries(c.changedFields.map(k=>[k,'adopt'])),operationId:crypto.randomUUID()};};
   try{
    for(let i=0;i<8;i++){const h=await session.prepare({topicId:topics[i].id});handles.push(h);states.push((await session.run(h,provider)).state);if(!abort)await s.editAIPresentation(await adoption(topics[i]));}
    if(abort){
     const request=await adoption(topics[0]),before=JSON.stringify(await all()),put=IDBObjectStore.prototype.put;
     IDBObjectStore.prototype.put=function(row,...args){if(this.name==='operationReceipts'&&row.namespace==='thought-library')throw new DOMException('Synthetic lifecycle adoption receipt abort','UnknownError');return put.call(this,row,...args);};
     try{await s.editAIPresentation(request);}catch(e){abortCode=e.code;}finally{IDBObjectStore.prototype.put=put;}
     rollback=before===JSON.stringify(await all());try{await session.prepare({topicId:topics[8].id});}catch(e){capacityCode=e.code;}
     await s.editAIPresentation(request);
    }
    const ninth=await session.prepare({topicId:topics[8].id});states.push((await session.run(ninth,provider)).state);await s.editAIPresentation(await adoption(topics[8]));
    const beforeReplay=JSON.stringify(await all());try{replay=await session.run(handles[0],{...provider,execute:()=>{replayCalls++;throw Error('retired handle must not redispatch');}});}catch(e){retiredCode=e.code;}
    const adopted=[];for(const topic of topics){const status=(await s.aiPresentationStatus({topicId:topic.id})).topics[0];adopted.push(!!status.presentation&&!status.candidate);}const after=await all();results.push({adopted,replayCalls,replayState:replay?.state??null,replayKeys:replay?Object.keys(replay).sort():[],version,abort,calls,states,abortCode,capacityCode,rollback,retiredCode,replayUnchanged:beforeReplay===JSON.stringify(after),attempts:after.organizerUsage.map(r=>r.attemptCount),jobs:after.organizerJobs.map(j=>j.state)});
   }finally{session.dispose();await s.repository.close();}
  }return {nativeFactory:indexedDB instanceof IDBFactory,results};
 },label);
 assert.equal(report.nativeFactory,true);assert.equal(report.results.length,6);
 for(const r of report.results){assert.equal(r.calls,9);assert.equal(r.replayCalls,0);assert.deepEqual(r.adopted,r.abort?[true,...Array(7).fill(false),true]:Array(9).fill(true));if(r.retiredCode===null){assert.equal(r.replayState,'COMMITTED');assert.deepEqual(r.replayKeys,['jobId','state']);}else{assert.equal(r.replayState,null);assert.deepEqual(r.replayKeys,[]);}assert.deepEqual(r.states,Array(9).fill('COMMITTED'));assert.equal(r.replayUnchanged,true);assert.deepEqual(r.attempts,Array(9).fill(1));assert.deepEqual(r.jobs,Array(9).fill('COMMITTED'));assert.ok(r.retiredCode===null||['STALE_BASE','CANCELLED','UNAVAILABLE'].includes(r.retiredCode));if(r.abort){assert.equal(r.abortCode,'STORAGE_FAILED');assert.equal(r.capacityCode,'UNAVAILABLE');assert.equal(r.rollback,true);}else{assert.equal(r.abortCode,null);assert.equal(r.capacityCode,null);assert.equal(r.rollback,null);}}
 console.log('AI_NATIVE_ORGANIZE_LIFECYCLE',label,JSON.stringify(report));
}
