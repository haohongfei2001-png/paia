import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT} from './harness/fake-chatgpt.mjs';
const source=fileURLToPath(new URL('..',import.meta.url));
async function attach(page){return page.evaluate(async()=>{
 const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js'));
 const {AIUsageFoundation}=await import(chrome.runtime.getURL('core/ai-usage/foundation.js'));
 const storage={async get(key){return {[key]:JSON.parse(sessionStorage.getItem('aiu-synthetic-local')||'{}')[key]};},async set(value){sessionStorage.setItem('aiu-synthetic-local',JSON.stringify({...JSON.parse(sessionStorage.getItem('aiu-synthetic-local')||'{}'),...value}));}};
 const s=new OrganizerStore(storage,{name:'aiu-synthetic-native'});
 const options={resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),committers:{topic:async(t,r)=>{await t.put('meta',{id:'synthetic-topic-owner',committed:true});return {committed:true,coverage:r.units};},context:async(t,r)=>{await t.put('meta',{id:'synthetic-context-owner',committed:true});return {committed:true,coverage:r.units};}}};
 globalThis.__aiu={s,ai:new AIUsageFoundation(s,options),options};
 return {defaultDenied:s.aiUsageFoundation.resolveAuthority===null};
});}
for(const label of ['source','release'])test(`AI-COST-01 ${label} native IndexedDB atomic delta, facet holes and page-reload unknown-attempt fence`,{timeout:120000},async()=>{
 let release=null,h;
 try{
  if(label==='release'){release=mkdtempSync(join(tmpdir(),'paia-ai-cost-foundation-'));execFileSync('python3',['scripts/build_current_release.py',release],{cwd:source,stdio:'pipe'});}
  h=await FakeChatGPT.start({extensionPath:release||source,onboarding:true});const p=h.archive;
  assert.deepEqual(await attach(p),{defaultDenied:true});
  const initial=await p.evaluate(async()=>{
   const {s,ai}=__aiu;await s.consent(true);const epoch=(await s.status()).epoch;
   for(let i=0;i<100;i++)await s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'aiu-native-chat',url:'https://chatgpt.com/c/aiu-native-chat',title:'Synthetic'},messages:[{sourceMessageId:'aiu-native-'+i,pageOrder:i+1,originalText:'NATIVE_PRIVATE_BODY_'+i}]});
   const pages=[];let cursor=null;do{const result=await ai.collect({cursor,limit:19});pages.push(...result.items);cursor=result.nextCursor;}while(cursor);
   const items=pages.slice(0,2),coverage=items.flatMap(i=>[{key:i.key,facet:'topic',scope:'library'},{key:i.key,facet:'context',scope:'cards'}]);
   const request={type:'AI_MAINTENANCE',items,coverage,contractVersion:'aiu-1',routeVersion:'synthetic',intent:'maintenance'};
   const job=await ai.plan(request);await ai.reserve(job.id,{reservationId:'synthetic-reservation'});
   const provider={describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:'synthetic-response',body:'DO_NOT_PERSIST_RESPONSE'})};
   await ai.dispatch(job.id,job.childIds[0],provider);await ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:coverage.filter(u=>u.facet==='topic')});
   const partial=await ai.status(job.id),pending=await ai.collect({limit:100});
   await ai.commitFacet(job.id,job.childIds[0],{facet:'context',units:coverage.filter(u=>u.facet==='context')});
   const remaining=await ai.collect({limit:100}),nextItems=remaining.items.slice(0,1),nextCoverage=nextItems.map(i=>({key:i.key,facet:'topic',scope:'library'})),unknownRequest={...request,items:nextItems,coverage:nextCoverage},unknown=await ai.plan(unknownRequest);
   await ai.reserve(unknown.id,{reservationId:'synthetic-unknown'});await ai.dispatch(unknown.id,unknown.childIds[0],{...provider,execute:async()=>{throw Error('synthetic timeout');}});
   sessionStorage.setItem('aiu-synthetic-job',JSON.stringify({unknownRequest,job:unknown}));
   const queue=await s.repository.transaction(false,async t=>({meta:(await t.all('meta')).filter(r=>r.id.startsWith('aiu:')),usage:await t.all('organizerUsage')}));
   return {captured:pages.length,partialState:partial.state,partialCount:partial.committedCoverage.length,pending:pending.items.length,remaining:remaining.items.length,queue:JSON.stringify(queue),attempts:(await ai.counters()).physicalAttempt};
  });
  assert.equal(initial.captured,100);assert.equal(initial.partialState,'VALIDATED');assert.equal(initial.partialCount,2);assert.equal(initial.pending,100);assert.equal(initial.remaining,98);assert.equal(initial.attempts,2);assert.doesNotMatch(initial.queue,/NATIVE_PRIVATE_BODY|DO_NOT_PERSIST_RESPONSE/);
  await p.reload();await attach(p);
  const after=await p.evaluate(async()=>{
   const {s,ai}=__aiu,{unknownRequest,job}=JSON.parse(sessionStorage.getItem('aiu-synthetic-job'));await ai.reconcileInterrupted(job.id);let calls=0;const same=await ai.plan(unknownRequest),outcome=await ai.dispatch(job.id,job.childIds[0],{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>{calls++;}});
   const item=unknownRequest.items[0],before=await s.repository.transaction(false,t=>t.get('inputStates',item.descriptor.entityId));let rolledBack=false;
   try{await s.foundationWrite(async t=>{const put=t.put.bind(t);t.put=async(name,row,...args)=>{if(name==='meta'&&row.id.startsWith('aiu:delta:pending:'))throw Error('synthetic write failure');return put(name,row,...args);};await t.put('inputStates',{...before,contentRevision:99});});}catch{rolledBack=true;}
   const current=await s.repository.transaction(false,t=>t.get('inputStates',before.id));return {sameId:same.id===job.id,outcome:outcome.state,calls,rolledBack,revisionUnchanged:current.contentRevision===before.contentRevision,attempts:(await ai.counters()).physicalAttempt};
  });
  assert.deepEqual(after,{sameId:true,outcome:'OUTCOME_UNKNOWN',calls:0,rolledBack:true,revisionUnchanged:true,attempts:2});
  const invalidation=await p.evaluate(async()=>{
   const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js')),{AIUsageFoundation}=await import(chrome.runtime.getURL('core/ai-usage/foundation.js')),{invalidateSemanticJobs}=await import(chrome.runtime.getURL('core/ai-usage/semantic-invalidation.js'));
   const read=(s,name)=>s.repository.transaction(false,t=>t.all(name));
   const edit=async(s,id,text)=>{const input=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:input.documentId,blocks:[{id,expectedRevision:input.revision,libraryText:text,note:input.note,excluded:input.excluded}]});};
   async function fixture(name,{split=false}={}){
    const local={values:{},async get(k){return {[k]:this.values[k]};},async set(v){Object.assign(this.values,v);}},s=new OrganizerStore(local,{name:'aiu-native-invalidation-'+name}),ai=new AIUsageFoundation(s,__aiu.options);
    await s.consent(true);await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-'+name,url:'https://chatgpt.com/c/synthetic-'+name,title:'Synthetic'},messages:[{sourceMessageId:'synthetic-'+name,pageOrder:1,originalText:'SYNTHETIC bounded evidence'}]});
    const {items}=await ai.collect(),topic=items.map(i=>({key:i.key,facet:'topic',scope:'library'})),context=items.map(i=>({key:i.key,facet:'context',scope:'cards'})),job=await ai.plan({type:'AI_MAINTENANCE',intent:'maintenance',items,coverage:split?[...topic,...context]:topic,...(split?{children:[topic,context]}:{}),contractVersion:'synthetic',routeVersion:'synthetic'});return {s,ai,job,items,topic};
   }
   // Existing page-reloaded unknown attempt remains non-refundable after a real edit.
   const old=JSON.parse(sessionStorage.getItem('aiu-synthetic-job')).job;
   await edit(__aiu.s,JSON.parse(sessionStorage.getItem('aiu-synthetic-job')).unknownRequest.items[0].descriptor.entityId,'SYNTHETIC changed unknown evidence');
   const unknown=await __aiu.ai.status(old.id);
   const local=await fixture('local-child',{split:true});await local.ai.resolveLocal(local.job.id,{facet:'topic',units:local.topic});const completed=(await local.ai.status(local.job.id)).attempts.find(r=>r.state==='COMMITTED');
   await edit(local.s,local.items[0].descriptor.entityId,'SYNTHETIC changed after local commit');const cancelled=await local.ai.status(local.job.id);
   const rollback=await fixture('rollback'),before={inputs:await read(rollback.s,'inputStates'),jobs:await read(rollback.s,'organizerJobs')};let refused=false;
   try{await rollback.s.foundationWrite(async t=>{const put=t.put.bind(t);t.put=async(name,row)=>{if(name==='organizerJobs')throw Error('SYNTHETIC cancellation write failure');return put(name,row);};await t.put('inputStates',{...before.inputs[0],contentRevision:before.inputs[0].contentRevision+1});});}catch{refused=true;}
   const unchanged=JSON.stringify(before)===JSON.stringify({inputs:await read(rollback.s,'inputStates'),jobs:await read(rollback.s,'organizerJobs')});
   const overflow=await fixture('overflow'),original=(await read(overflow.s,'organizerJobs'))[0];await overflow.s.foundationWrite(async t=>{for(let i=0;i<100;i++)await t.put('organizerJobs',{...original,id:'synthetic-overflow-'+i,dedupeKey:'synthetic-overflow-'+i});});const allBefore=JSON.stringify(await read(overflow.s,'organizerJobs'));
   await edit(overflow.s,overflow.items[0].descriptor.entityId,'SYNTHETIC overflow changed evidence');const allUnchanged=allBefore===JSON.stringify(await read(overflow.s,'organizerJobs')),bound=await overflow.s.repository.transaction(false,invalidateSemanticJobs);let staleCode=null;try{await overflow.ai.reserve(overflow.job.id,{reservationId:'synthetic-refused'});}catch(e){staleCode=e.code;}
   return {unknownState:unknown.state,unknownSpend:unknown.attempts[0].spendState,unknownAttempts:unknown.attempts[0].attemptCount,completedExists:!!completed,completedUnchanged:JSON.stringify(cancelled.attempts.find(r=>r.id===completed?.id))===JSON.stringify(completed),cancelledState:cancelled.state,localAttempts:(await local.ai.counters()).physicalAttempt,rolledBack:refused&&unchanged,overflowUnchanged:allUnchanged,bound,staleCode};
  });
  assert.deepEqual(invalidation,{unknownState:'OUTCOME_UNKNOWN',unknownSpend:'RESERVATION_RETAINED',unknownAttempts:1,completedExists:true,completedUnchanged:true,cancelledState:'CANCELLED_BEFORE_DISPATCH',localAttempts:0,rolledBack:true,overflowUnchanged:true,bound:{status:'INCOMPLETE',reason:'SCAN_BOUND',checked:0,cancelled:0},staleCode:'STALE_BASE'});
  const boundedCost=await p.evaluate(async()=>{
 const {OrganizerStore}=await import('../core/organizer/store.js'),{AIUsageFoundation}=await import('../core/ai-usage/foundation.js');
 const local={v:{},async get(k){return {[k]:this.v[k]};},async set(v){Object.assign(this.v,v);}},s=new OrganizerStore(local,{name:'ai-invalidation-cost-synthetic'});await s.consent(true);const epoch=(await s.status()).epoch;
 const capture=(i)=>s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-cost',url:'https://chatgpt.com/c/synthetic-cost',title:'Synthetic'},messages:[{sourceMessageId:'synthetic-cost-'+i,pageOrder:i+1,originalText:'SYNTHETIC performance evidence '+i}]});
 for(let i=0;i<100;i++)await capture(i);
 const ai=new AIUsageFoundation(s,{resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})}),{items}=await ai.collect({limit:100});
 const measure=async(name,action)=>{const before={...s.repository.metrics},start=performance.now();await action();return {name,ms:performance.now()-start,reads:s.repository.metrics.reads-before.reads,writes:s.repository.metrics.writes-before.writes,scans:s.repository.metrics.scans-before.scans};};
 const zero=await measure('capture-zero-jobs',()=>capture(100));
 for(let i=0;i<100;i++)await ai.plan({type:'AI_ORGANIZE',intent:'explicit',items,coverage:items.map(item=>({key:item.key,facet:'organize',scope:'synthetic-topic-'+i})),contractVersion:'synthetic',routeVersion:'synthetic'});
 const cardinality=await s.repository.transaction(false,async t=>{const jobs=(await t.all('organizerJobs')).filter(j=>j.kind==='ai_usage_v1');return {jobs:jobs.length,items:jobs.reduce((n,j)=>n+j.items.length,0),attempts:(await t.all('organizerUsage')).length};});
 const captureCost=await measure('capture-100-jobs-times-100-items',()=>capture(101));
 const edit=await measure('edit-100-jobs-times-100-items',async()=>{const input=await s.input(items[0].descriptor.entityId);await s.editDocument({operationId:crypto.randomUUID(),documentId:input.documentId,blocks:[{id:input.id,expectedRevision:input.revision,libraryText:'SYNTHETIC meaningful changed body',note:input.note,excluded:input.excluded}]});});
 return {cardinality,zero,captureCost,edit,cancelled:await s.repository.transaction(false,async t=>(await t.all('organizerJobs')).filter(j=>j.state==='CANCELLED_BEFORE_DISPATCH').length),defaultAuthorityMissing:s.aiUsageFoundation.resolveAuthority===null};
  });
  assert.deepEqual(boundedCost.cardinality,{jobs:100,items:10000,attempts:0});assert.equal(boundedCost.defaultAuthorityMissing,true);assert.ok(boundedCost.captureCost.reads<500,'bounded capture avoids per-job unchanged-evidence reads');assert.ok(boundedCost.edit.reads<1000,'one changed key cancels all affected scopes without rereading the corpus');assert.equal(boundedCost.cancelled,100);console.log('AI_NATIVE_BOUNDED_COST',label,JSON.stringify(boundedCost));
  const deferredHistory=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),{AIUsageFoundation}=await import('../core/ai-usage/foundation.js'),{readMaintenanceBatch}=await import('../core/ai-usage/maintenance-batch.js');
   const storage={values:{},async get(k){return {[k]:this.values[k]};},async set(v){Object.assign(this.values,v);}},s=new OrganizerStore(storage,{name:'aiu-native-defer-history'}),ai=new AIUsageFoundation(s,__aiu.options);
   await s.consent(true);await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'defer-history',url:'https://chatgpt.com/c/defer-history',title:'Synthetic'},messages:[{sourceMessageId:'defer-one',pageOrder:1,originalText:'SYNTHETIC DEFER unchanged Source'}]});
   const options={scope:'synthetic-defer',contractVersion:'synthetic',routeVersion:'synthetic'};
   const snapshot=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','organizerJobs','organizerWorkItems','organizerUsage','records','inputStates'].map(async name=>[name,await t.all(name)]))));
   const provider={describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:'synthetic-defer'})};
   for(let n=0;n<51;n++){
    const batch=await readMaintenanceBatch(ai,options);if(batch.status!=='CANDIDATE_ONLY')throw Error('legal DEFER setup blocked '+n);
    const job=await ai.plan(batch.request);await ai.reserve(job.id,{reservationId:'synthetic-defer'});for(const childId of job.childIds)await ai.dispatch(job.id,childId,provider);
    for(const facet of ['topic','context'])await ai.commitFacet(job.id,job.childIds[0],{facet,units:batch.request.coverage.filter(u=>u.facet===facet),outcome:'DEFER',retryCondition:'synthetic-needs-context'});
    const input=await s.input(batch.request.items[0].descriptor.entityId);await s.editDocument({operationId:crypto.randomUUID(),documentId:input.documentId,blocks:[{id:input.id,expectedRevision:input.revision,libraryText:'SYNTHETIC new DEFER signature '+n,note:input.note,excluded:input.excluded}]});
   }
   const before=await snapshot(),write=ai.write.bind(ai);let removed=0,error=null;
   ai.write=fn=>write(t=>fn(new Proxy(t,{get(target,key){if(key==='delete')return async(...args)=>{await target.delete(...args);if(++removed===2)throw Error('synthetic abort archival');};const value=target[key];return typeof value==='function'?value.bind(target):value;}})));
   try{await ai.archiveObsoleteDeferred();}catch(e){error=e.code;}finally{ai.write=write;}
   const abortUnchanged=JSON.stringify(await snapshot())===JSON.stringify(before);
   const result=await readMaintenanceBatch(ai,options),after=await snapshot(),histories=after.organizerWorkItems.filter(row=>row.id.startsWith('aiu:defer-history:'));
   const {equal}=await import('../core/ai-usage/contracts.js');const preserved=histories.every(({id,originalId,...fields})=>equal({...fields,id:originalId},before.organizerWorkItems.find(row=>row.id===originalId)));
   // Same unknown/malformed records remain fail-closed; this is a separate
   // deliberate corruption fixture, not the normal-history reproduction.
   await s.foundationWrite(async t=>{for(let n=0;n<101;n++)await t.put('organizerWorkItems',{id:'aiu:defer:malformed-'+n,kind:'ai_usage_v1',state:'DEFERRED'});});
   const malformedBefore=await snapshot(),malformed=await readMaintenanceBatch(ai,options),malformedUnchanged=JSON.stringify(await snapshot())===JSON.stringify(malformedBefore);
   return {nativeFactory:indexedDB instanceof IDBFactory,activeBefore:before.organizerWorkItems.filter(row=>row.id.startsWith('aiu:defer:')).length,error,removed,abortUnchanged,status:result.status,cleanup:result.cleanup,historyCount:histories.length,preserved,jobsUnchanged:JSON.stringify(before.organizerJobs)===JSON.stringify(after.organizerJobs),usageUnchanged:JSON.stringify(before.organizerUsage)===JSON.stringify(after.organizerUsage),recordsUnchanged:JSON.stringify(before.records)===JSON.stringify(after.records),inputsUnchanged:JSON.stringify(before.inputStates)===JSON.stringify(after.inputStates),malformedReason:malformed.reason,malformedUnchanged};
  });
  assert.equal(deferredHistory.nativeFactory,true);assert.equal(deferredHistory.activeBefore,102);assert.equal(deferredHistory.error,'STORAGE_FAILED');assert.equal(deferredHistory.removed,2);assert.equal(deferredHistory.abortUnchanged,true);assert.equal(deferredHistory.status,'CANDIDATE_ONLY');assert.equal(deferredHistory.cleanup.scanned,100);assert.equal(deferredHistory.cleanup.archived,100);assert.equal(deferredHistory.historyCount,100);assert.equal(deferredHistory.preserved,true);for(const key of ['jobsUnchanged','usageUnchanged','recordsUnchanged','inputsUnchanged','malformedUnchanged'])assert.equal(deferredHistory[key],true,key);assert.equal(deferredHistory.malformedReason,'DEFER_SCAN_BOUND');console.log('AI_NATIVE_DEFER_HISTORY',label,JSON.stringify(deferredHistory));
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{try{await h?.close();}finally{if(release)rmSync(release,{recursive:true,force:true});}}
});
