import assert from 'node:assert/strict';
export async function verifyOrganizeProviderNative(page,label){
 const report=await page.evaluate(async label=>{
  const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js')),{LocalOrganizeSession}=await import(chrome.runtime.getURL('core/organizer/local-organize-session.js'));
  const results=[];
  for(const [version,children] of [[1,1],[2,1],[3,1],[2,2],[3,2]])for(const stop of ['timeout','dispose'])for(const late of ['resolve','reject']){
   const local={v:{},async get(k){return {[k]:this.v[k]};},async set(v){Object.assign(this.v,v);}},s=new OrganizerStore(local,{name:`provider-${label}-${version}-${children}-${stop}-${late}`});await s.consent(true);await s.finishFoundation();
   const topic=await s.createTopic({name:'Synthetic provider lifecycle',operationId:crypto.randomUUID()});
   for(let i=0;i<(children===2?21:1);i++){const e=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'Synthetic native provider input '+i,type:'idea',formation:'explicit',evidence:[]});await s.placeEntry({topicId:topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});}
   const session=new LocalOrganizeSession(s,{incrementalVersion:version,profile:{contractVersion:'local-synthetic-v1',modelVersion:'synthetic',promptVersion:'synthetic'},routeVersion:'synthetic',resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})});
   const all=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
   let enter,resolve,reject,controls,calls=0,reads=0;const entered=new Promise(r=>enter=r),physical=new Promise((a,b)=>{resolve=a;reject=b;});
   const provider={describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:(r,o)=>{calls++;if(children===2&&calls===1)return {version:2,blocks:r.inputs.map(i=>({field:'currentView',text:i.text,evidenceEntryIds:[i.ref],sourceSpans:[{entryId:i.ref,revision:i.revision,start:0,end:i.text.length}]}))};controls=o;enter();return physical;}};
   try{
    s.organizerBudget.limits.timeoutMs=25;const handle=await session.prepare({topicId:topic.id,children}),running=session.run(handle,provider);await entered;if(stop==='dispose')session.dispose();const result=await running;
    const before=await all(),serialized=JSON.stringify(before),writes=s.repository.metrics.writes;
    if(late==='resolve')resolve(Object.defineProperty({},'private',{enumerable:true,get(){reads++;throw Error('late body read');}}));else reject(Error('synthetic late failure'));
    await physical.catch(()=>{});await new Promise(r=>setTimeout(r,0));let retryCode;try{await session.run(handle,provider);}catch(e){retryCode=e.code;}
    results.push({version,children,stop,late,state:result.state,calls,reads,aborted:controls.signal.aborted,timeout:controls.timeoutMs,unchanged:serialized===JSON.stringify(await all()),writesUnchanged:writes===s.repository.metrics.writes,attempts:before.organizerUsage.map(r=>({attemptCount:r.attemptCount,state:r.state,spendState:r.spendState})),acks:before.organizerWorkItems.length,retryCode});
   }finally{resolve?.({});session.dispose();await s.repository.close();}
  }return {nativeFactory:indexedDB instanceof IDBFactory,results};
 },label);
 assert.equal(report.nativeFactory,true);assert.equal(report.results.length,20);
 for(const r of report.results){assert.equal(r.state,'OUTCOME_UNKNOWN');assert.equal(r.calls,r.children);assert.equal(r.reads,0);assert.equal(r.aborted,true);assert.equal(r.timeout,25);assert.equal(r.unchanged,true);assert.equal(r.writesUnchanged,true);assert.equal(r.acks,0);assert.ok(['UNAVAILABLE','OUTCOME_UNKNOWN'].includes(r.retryCode));assert.equal(r.attempts.length,r.children);assert.ok(r.attempts.every(x=>x.attemptCount===1));assert.equal(r.attempts.filter(x=>x.state==='OUTCOME_UNKNOWN'&&x.spendState==='RESERVATION_RETAINED').length,1);if(r.children===2)assert.equal(r.attempts.filter(x=>x.state==='RESPONSE_RECORDED').length,1);}
 console.log('AI_NATIVE_ORGANIZE_PROVIDER',label,JSON.stringify(report));
}
