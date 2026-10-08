import {assertAssistIntent,validateAssistIntent,qualifiedCoverageId} from './assist-intent-binding.js';
import {validateOrganizeStyle,styleSemantics,assertOrganizeStyle} from './organize-style-binding.js';
import {DIRTY_PREFIX,KNOWN_PREFIX,HUMAN_FENCE,deltaDescription,deltaSignature} from './delta.js';
import {JOB_TYPES,CHILD_LIMITS,fail,opaque,integer,exact,equal,canonical,digest,unitKey,validateCoverage,validateAuthority,localProviderDescriptor} from './contracts.js';
const KIND='ai_usage_v1',COUNTERS='aiu:counters:v1';
const terminal=new Set(['COMMITTED','CANCELLED_BEFORE_DISPATCH','REJECTED','EXPIRED_UNCOMMITTED']);
const coverId=(key,facet,scope)=>'aiu:coverage:'+canonical([key,facet,scope]);
const receiptId=id=>'aiu:attempt:'+id;
const dispatchFenceId=id=>'aiu:dispatched:'+id;
const safeJob=j=>({id:j.id,type:j.type,state:j.state,childIds:[...j.childIds],committedCoverage:[...j.committedCoverage],cancelEpoch:j.cancelEpoch});
async function count(t,key){const row=await t.get('meta',COUNTERS)||{id:COUNTERS,skippedNoDelta:0,localResolved:0,cacheIntent:0,physicalAttempt:0};if(!Object.hasOwn(row,key)||!integer(row[key]))fail();row[key]++;await t.put('meta',row);}

// Trusted local owner integration, intentionally not a worker/public command.
// Only constructor-injected domain owners can commit. There is no production
// financial service, registry entry, SDK, HTTP path or automatic paid retry.
export class AIUsageFoundation {
 constructor(store,{resolveAuthority=null,verifyOutcome=null,resolveAssistIntent=null,committers={}}={}){this.s=store;this.resolveAssistIntent=resolveAssistIntent;this.resolveAuthority=resolveAuthority;this.verifyOutcome=verifyOutcome;this.committers=Object.freeze({...committers});}
 async read(fn){await this.s.finishFoundation();return this.s.run(()=>this.s.repository.transaction(false,fn));}
 async write(fn){return this.s.foundationWrite(fn);}
 async authority(t,type,scope){
  if(typeof this.resolveAuthority!=='function')fail('UNAVAILABLE');
  const request={purpose:'ai-usage',jobType:type,evidenceKeys:scope.items.map(i=>i.key).sort(),coverage:scope.coverage},resolved=await this.resolveAuthority(t,request);
  if(!equal(resolved?.scope,{evidenceKeys:request.evidenceKeys,coverage:request.coverage}))fail('UNAVAILABLE');
  const {scope:approvedScope,...answer}=resolved,authority=validateAuthority(answer,type),gate=await t.get('meta','gate');
  if(gate?.enabled!==true||(await t.get('meta','thought-library'))?.sealed)fail('UNAVAILABLE');
  return {...authority,gateEpoch:gate.epoch,restoreEpoch:(await t.get('meta','recovery-restore-epoch'))?.value??'initial',humanFence:type==='AI_ASSIST'&&scope.assistIntent?null:(await t.get('meta',HUMAN_FENCE))?.value??0};
 }
 async collect({cursor=null,limit=25,facets=['topic','context','filter']}={}){
  if(!Array.isArray(facets)||!facets.length||facets.some(f=>!['topic','context','filter'].includes(f))||!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&(typeof cursor!=='string'||!cursor.startsWith(DIRTY_PREFIX)))fail();
  const result=await this.read(async t=>{const page=await t.primaryRangePage('meta',{prefix:DIRTY_PREFIX,after:cursor,limit});return {items:page.rows.filter(({value:r})=>(r.pendingFacets||['topic','context']).some(f=>facets.includes(f))).map(({value:r})=>({key:r.descriptor.key,signature:r.signature,descriptor:r.descriptor})),nextCursor:page.next,complete:page.next===null};});
  if(!result.items.length)await this.write(t=>count(t,'skippedNoDelta'));return result;
 }
 async describe({keys}={}){
  if(!Array.isArray(keys)||!keys.length||keys.length>100||keys.some(key=>typeof key!=='string'||key.length>450)||new Set(keys).size!==keys.length)fail();
  return this.read(async t=>{const items=[];for(const key of keys){const row=await t.get('meta',KNOWN_PREFIX+key);if(!row||row.descriptor.removed||row.descriptor.fenceOnly)fail('STALE_BASE');items.push({key,signature:row.signature,descriptor:row.descriptor});}return {items};});
 }
 // Bounded scheduling-index maintenance, not job/receipt deletion or a retry.
 // Preserve every original DEFER field under a non-scheduling history key.
 async archiveObsoleteDeferred({cursor=null,limit=100}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&(typeof cursor!=='string'||!cursor.startsWith('aiu:defer:')||cursor.length>2000))fail();
  return this.write(async t=>{
   const page=await t.primaryRangePage('organizerWorkItems',{prefix:'aiu:defer:',after:cursor,limit});let archived=0;
   for(const {value:row}of page.rows){
    let job;
    try{
     exact(row,['id','kind','jobId','state','stateKey','sequence','unit','retryCondition','signature']);
     job=await t.get('organizerJobs',row.jobId);
     if(row.kind!==KIND||row.state!=='DEFERRED'||row.stateKey!==0||!integer(row.sequence)||!opaque(row.retryCondition)||typeof row.signature!=='string'||!job||job.kind!==KIND)fail();
     validateCoverage([row.unit],job.type);
     if(row.id!=='aiu:defer:'+canonical([row.jobId,unitKey(row.unit)])||!job.childCoverage?.[row.sequence]?.some(u=>equal(u,row.unit))||!job.items?.some(i=>i.key===row.unit.key&&i.signature===row.signature))fail();
    }catch(error){if(error.code==='INVALID_REQUEST')fail('DEFER_RECORD_INVALID');throw error;}
    const known=await t.get('meta',KNOWN_PREFIX+row.unit.key),ack=await t.get('organizerWorkItems',qualifiedCoverageId(row.unit,job));
    const changed=known?.descriptor?.key===row.unit.key&&typeof known.signature==='string'&&(known.signature!==row.signature||known.descriptor.removed===true);
    const acknowledged=ack?.kind===KIND&&ack.state==='ACKNOWLEDGED'&&ack.signature===row.signature&&equal(ack.unit,row.unit);
    if(!changed&&!acknowledged)continue;
    const history={...row,id:'aiu:defer-history:'+row.id.slice('aiu:defer:'.length),originalId:row.id},prior=await t.get('organizerWorkItems',history.id);
    if(prior&&!equal(prior,history))fail('DEFER_HISTORY_CONFLICT');
    if(!prior)await t.put('organizerWorkItems',history);
    await t.delete('organizerWorkItems',row.id);archived++;
   }
   return {scanned:page.rows.length,archived,nextCursor:page.next};
  });
 }
 async counters(){return this.read(async t=>await t.get('meta',COUNTERS)||{id:COUNTERS,skippedNoDelta:0,localResolved:0,cacheIntent:0,physicalAttempt:0});}
 async cacheIntent(){await this.write(t=>count(t,'cacheIntent'));}
 async current(t,job,{allowCancelled=false}={}){
  await assertAssistIntent(this,t,job);
  await assertOrganizeStyle(this.s,t,job);
  if(!equal(await this.authority(t,job.type,job),job.authority)||!allowCancelled&&job.cancelEpoch!==0)fail('CANCELLED');
  for(const item of job.items){const known=await t.get('meta',KNOWN_PREFIX+item.key);if(!known||known.signature!==item.signature||known.descriptor.removed)fail('STALE_BASE');
   if(!await this.s.sourcePresent(t,item.descriptor.sourceRecordIds))fail('STALE_BASE');
   if(item.descriptor.kind==='input'){const live=await t.get('inputStates',item.descriptor.entityId);if(!live||deltaSignature(deltaDescription('inputStates',live))!==item.signature)fail('STALE_BASE');}
   else if(item.descriptor.kind==='context_item'){const row=await t.get('meta','context-cards:v1'),live=row?.items?.find(x=>x.id===item.descriptor.entityId);if(!live||live.lifecycle!=='active'||live.revision!==item.descriptor.revision)fail('STALE_BASE');}
   else {const table={library_entry:'thoughts',topic:'topics',section:'sections',placement:'placements'}[item.descriptor.kind],live=table&&await t.get(table,item.descriptor.recordId||item.descriptor.entityId);if(!live||['removed','invalidated','quarantined'].includes(live.lifecycle))fail('STALE_BASE');}
  }
  await assertAssistIntent(this,t,job);
  await assertOrganizeStyle(this.s,t,job);
 }
 async plan(request){
  // Capture caller-owned evidence before any authority or storage await.
  request=structuredClone(request);
  exact(request,['type','items','coverage','children','contractVersion','routeVersion','intent','organizeStyle','assistIntent'],['type','items','coverage','contractVersion','routeVersion','intent']);
  const {type,items,contractVersion,routeVersion,intent}=request;
  const assisted=Object.hasOwn(request,'assistIntent'),assistIntent=assisted?validateAssistIntent(type,request.assistIntent):null;
  if(type==='AI_ASSIST'&&(!assisted||typeof this.resolveAssistIntent!=='function'))fail('UNAVAILABLE');
  const styled=Object.hasOwn(request,'organizeStyle'),organizeStyle=styled?validateOrganizeStyle(type,request.organizeStyle):null;
  if(!JOB_TYPES.includes(type)||!['explicit','maintenance'].includes(intent)||type!=='AI_MAINTENANCE'&&intent!=='explicit'||!opaque(contractVersion)||!opaque(routeVersion)||!Array.isArray(items)||!items.length||items.length>100)fail();
  const seen=new Set();for(const item of items){exact(item,['key','signature','descriptor']);if(typeof item.key!=='string'||item.key.length>450||typeof item.signature!=='string'||item.signature.length>16000||seen.has(item.key))fail();seen.add(item.key);}
  const coverage=validateCoverage(request.coverage,type);if(coverage.some(u=>!seen.has(u.key))||items.some(i=>!coverage.some(u=>u.key===i.key))||type==='AI_MAINTENANCE'&&coverage.every(u=>u.facet==='filter'))fail();
  const children=(request.children||[coverage]).map(c=>validateCoverage(c,type)).sort((a,b)=>canonical(a).localeCompare(canonical(b)));
  if(!children.length||children.length>CHILD_LIMITS[type]||!equal(children.flat().map(unitKey).sort(),coverage.map(unitKey).sort()))fail();
  const snapshot=await this.read(async t=>{await assertAssistIntent(this,t,{type,items,coverage,...(assisted?{assistIntent}:{})});if(styled)await assertOrganizeStyle(this.s,t,{type,organizeStyle});const authority=await this.authority(t,type,{items,coverage,...(assisted?{assistIntent}:{})});for(const item of items){const known=await t.get('meta',KNOWN_PREFIX+item.key);if(!known||known.signature!==item.signature||!equal(known.descriptor,item.descriptor)||known.descriptor.removed)fail('STALE_BASE');}await assertAssistIntent(this,t,{type,items,coverage,...(assisted?{assistIntent}:{})});return {authority};});
  const scope=items.map(i=>({key:i.key,signature:i.signature})).sort((a,b)=>a.key.localeCompare(b.key));
  const identity={...(assisted?{assistIntent}:{}),type,scope,coverage,children,contractVersion,routeVersion,principalId:snapshot.authority.principalId,libraryId:snapshot.authority.libraryId,consentEpoch:snapshot.authority.consentEpoch};
  const organizeSemanticKey=styled?await digest({...identity,style:styleSemantics(organizeStyle)}):null;
  const id='aiu:job:'+await digest(styled?{...identity,organizeStyle}:identity);
  const childIds=await Promise.all(children.map((c,index)=>digest([id,index,c]).then(hash=>'aiu:child:'+hash)));
  const targetScopes=[...new Set(coverage.map(c=>c.scope))].sort();
  if(type==='AI_ORGANIZE'&&targetScopes.length!==1)fail();
  const flightId='aiu:flight:'+await digest([snapshot.authority.principalId,snapshot.authority.libraryId,type,type==='AI_MAINTENANCE'?'library':targetScopes]);
  const proposed={...(assisted?{assistIntent}:{}),...(styled?{organizeStyle,organizeSemanticKey}:{}),id,kind:KIND,type,version:1,state:'PLANNED',stateKey:0,sequence:0,dedupeKey:id,items:structuredClone(items),coverage,childCoverage:children,childIds,contractVersion,routeVersion,authority:snapshot.authority,flightId,cancelEpoch:0,committedCoverage:[],sourceRecordIds:[...new Set(items.flatMap(i=>i.descriptor.sourceRecordIds))]};
  return this.write(async t=>{
   await this.current(t,proposed);
   const prior=await t.get('organizerJobs',id);if(prior){if(prior.kind!==KIND)fail();
    if(!equal(prior.authority,proposed.authority)&&prior.cancelEpoch===0&&['PLANNED','RESERVED'].includes(prior.state)){
     for(const childId of prior.childIds){const r=await t.get('organizerUsage',receiptId(childId));if(await t.get('meta',dispatchFenceId(childId))||r&&(r.attemptCount!==0||r.state!=='RESERVED'&&!(r.executionKind==='local'&&['PLANNED','COMMITTED'].includes(r.state))))fail('OUTCOME_UNKNOWN');}
     // Rebind a never-dispatched plan to current local fences without changing
     // logical/child identity, local checked coverage, the unused reservation,
     // or any possibly billed attempt.
     prior.authority=proposed.authority;prior.planningRevision=(prior.planningRevision||0)+1;await t.put('organizerJobs',prior);
    }
    return safeJob(prior);
   }
   const active=await t.get('meta',flightId);if(active){const job=await t.get('organizerJobs',active.jobId);if(!job&&active.dispatched)fail('OUTCOME_UNKNOWN');if(job&&!terminal.has(job.state)){
    let stale=false;try{await this.current(t,job);}catch(error){if(!['CANCELLED','STALE_BASE'].includes(error.code))throw error;stale=true;}
    if(!stale||!['PLANNED','RESERVED'].includes(job.state))fail('REQUEST_ALREADY_IN_FLIGHT');
    for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(receipt?.attemptCount)fail('OUTCOME_UNKNOWN');if(receipt){receipt.state='CANCELLED_BEFORE_DISPATCH';receipt.stateKey=1;receipt.spendState='RELEASED_BEFORE_DISPATCH';await t.put('organizerUsage',receipt);}}
    job.cancelEpoch++;job.state='CANCELLED_BEFORE_DISPATCH';job.stateKey=1;await t.put('organizerJobs',job);
   }}
   const allCovered=[];for(const unit of coverage){const saved=await t.get('organizerWorkItems',qualifiedCoverageId(unit,proposed)),item=items.find(i=>i.key===unit.key);if(saved?.signature===item.signature)allCovered.push(unitKey(unit));}
   if(allCovered.length===coverage.length){await count(t,'skippedNoDelta');return {id:null,type,state:'NO_DELTA',childIds:[],committedCoverage:allCovered,cancelEpoch:0};}
   // No coarse checkpoint is advanced: exact incomplete facet/scope units stay.
   if(type==='AI_MAINTENANCE')for(const item of items){let dirty=await t.get('meta',DIRTY_PREFIX+item.key);if(dirty&&dirty.signature!==item.signature)fail('STALE_BASE');if(!dirty)dirty={...(await t.get('meta',KNOWN_PREFIX+item.key)),id:DIRTY_PREFIX+item.key,requirements:[],pendingFacets:[]};const needed=coverage.filter(c=>c.key===item.key&&!allCovered.includes(unitKey(c)));dirty.requirements=[...new Set([...(dirty.requirements||[]),...coverage.filter(c=>c.key===item.key).map(unitKey)])].sort();dirty.pendingFacets=[...new Set([...(dirty.pendingFacets||['topic','context']),...needed.map(c=>c.facet)])].sort();await t.put('meta',dirty);}
   proposed.committedCoverage=allCovered;await t.put('organizerJobs',proposed);await t.put('meta',{id:flightId,jobId:id});return safeJob(proposed);
  });
 }
 async job(t,id){const job=await t.get('organizerJobs',id);if(!job||job.kind!==KIND)fail();return job;}
 async status(id){if(!opaque(id))fail();return this.read(async t=>{const job=await this.job(t,id),attempts=[];for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(receipt)attempts.push(receipt);}return {...safeJob(job),attempts};});}
 async reserve(id,{reservationId,executionKind='fixture'}={}){
  if(!opaque(id)||!opaque(reservationId)||!['fixture','local'].includes(executionKind))fail('UNAVAILABLE');
  return this.write(async t=>{const job=await this.job(t,id);await this.current(t,job);if(job.state!=='PLANNED')return safeJob(job);
   for(let index=0;index<job.childIds.length;index++){const childId=job.childIds[index],existing=await t.get('organizerUsage',receiptId(childId)),covered=job.childCoverage[index].every(u=>job.committedCoverage.includes(unitKey(u)));if(covered&&existing?.state==='COMMITTED')continue;if(await t.get('meta',dispatchFenceId(childId)))fail('OUTCOME_UNKNOWN');if(existing&&(existing.attemptCount!==0||existing.state!=='PLANNED'||existing.executionKind!=='local'))fail('OUTCOME_UNKNOWN');await t.put('organizerUsage',{id:receiptId(childId),kind:KIND,version:1,jobId:id,childId,parentReservationId:reservationId,executionKind,sequence:index,state:covered?'COMMITTED':'RESERVED',stateKey:covered?1:0,windowIds:[],attemptCount:0,spendState:covered?'NO_PROVIDER_COST':'RESERVED_UNPRICED',effectiveResultCount:0});}
   job.state='RESERVED';await t.put('organizerJobs',job);return safeJob(job);
  });
 }
 async dispatch(id,childId,provider){
  const descriptor=localProviderDescriptor(provider);
  const prepared=await this.write(async t=>{const job=await this.job(t,id);await this.current(t,job);const index=job.childIds.indexOf(childId),receipt=await t.get('organizerUsage',receiptId(childId));
   if(index<0||!receipt||receipt.jobId!==id)fail();
   if(terminal.has(job.state))return {reused:true,state:job.state,childId};
   if((await t.get('meta',job.flightId))?.jobId!==id)fail('REQUEST_ALREADY_IN_FLIGHT');
   if(receipt.state!=='RESERVED')return {reused:true,state:receipt.state,childId};
   if(receipt.executionKind!==descriptor.executionKind)fail('UNAVAILABLE');
   if(await t.get('meta',dispatchFenceId(childId)))fail('OUTCOME_UNKNOWN');
   // Minimal nonportable anti-replay fence survives supported library replace,
   // which intentionally clears old transient job/usage rows. It is not a
   // second financial ledger and never grants admission.
   await t.put('meta',{id:dispatchFenceId(childId),version:1,jobId:id,childId});await t.put('meta',{id:job.flightId,jobId:id,dispatched:true});
   receipt.state='DISPATCHED';receipt.attemptCount=1;receipt.provider=descriptor;receipt.spendState='POSSIBLY_BILLABLE';await t.put('organizerUsage',receipt);job.state='DISPATCHED';await t.put('organizerJobs',job);await count(t,'physicalAttempt');
   return {request:{...(job.organizeStyle?{organizeStyle:styleSemantics(job.organizeStyle),organizeSemanticKey:job.organizeSemanticKey}:{}),logicalJobId:id,childOperationId:childId,type:job.type,contractVersion:job.contractVersion,routeVersion:job.routeVersion,coverage:job.childCoverage[index].filter(u=>!job.committedCoverage.includes(unitKey(u))),evidence:job.items.map(i=>({key:i.key,signature:i.signature,lineage:i.descriptor.lineage})),automaticRetries:0}};
  });
  if(prepared.reused)return prepared;
  // Only the provider-neutral metadata boundary is exercised in this slice.
  // Actual bounded body assembly remains with the current source gateways and
  // separately qualified feature owners; no durable prompt/response handoff.
  let response;try{response=await provider.execute(Object.freeze(structuredClone(prepared.request)));}catch{await this.markUnknown(id,childId);return {state:'OUTCOME_UNKNOWN',childId};}
  return this.write(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));if(!receipt||receipt.state!=='DISPATCHED')return {state:receipt?.state||'OUTCOME_UNKNOWN',childId};
   // Never persist arbitrary provider response/error fields.
   if(response?.accepted!==true||!opaque(response.operationReceiptId)){receipt.state='OUTCOME_UNKNOWN';receipt.spendState='RESERVATION_RETAINED';}
   else{receipt.state='RESPONSE_RECORDED';receipt.operationReceiptId=response.operationReceiptId;receipt.spendState='UNSETTLED';}
   await t.put('organizerUsage',receipt);job.state=receipt.state;await this.aggregate(t,job);await t.put('organizerJobs',job);return {state:receipt.state,childId};
  });
 }
 async aggregate(t,job){
  const receipts=[];for(const childId of job.childIds)receipts.push(await t.get('organizerUsage',receiptId(childId))||{state:job.cancelEpoch?'CANCELLED_BEFORE_DISPATCH':'PLANNED',attemptCount:0});
  const states=new Set(receipts.map(r=>r.state));
  if(states.has('OUTCOME_UNKNOWN'))job.state='OUTCOME_UNKNOWN';
  else if(states.has('DISPATCHED'))job.state='DISPATCHED';
  else if(states.has('VALIDATED'))job.state='VALIDATED';
  else if(states.has('RESPONSE_RECORDED'))job.state='RESPONSE_RECORDED';
  else if(states.has('RESERVED'))job.state='RESERVED';
  else if(states.has('PLANNED'))job.state='PLANNED';
  else if(job.coverage.every(u=>job.committedCoverage.includes(unitKey(u))))job.state='COMMITTED';
  else if(states.has('EXPIRED_UNCOMMITTED')||job.cancelEpoch&&receipts.some(r=>r.attemptCount))job.state='EXPIRED_UNCOMMITTED';
  else if(states.has('REJECTED'))job.state='REJECTED';
  else job.state='CANCELLED_BEFORE_DISPATCH';
  job.stateKey=terminal.has(job.state)?1:0;return job;
 }
 async markUnknown(id,childId){return this.write(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));if(!receipt||receipt.jobId!==id||!['DISPATCHED','OUTCOME_UNKNOWN'].includes(receipt.state))fail();receipt.state='OUTCOME_UNKNOWN';receipt.spendState='RESERVATION_RETAINED';job.state='OUTCOME_UNKNOWN';await t.put('organizerUsage',receipt);await t.put('organizerJobs',job);return safeJob(job);});}
 async reconcileInterrupted(id){return this.write(async t=>{const job=await this.job(t,id);let unknown=false;for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(receipt?.state==='DISPATCHED'){receipt.state='OUTCOME_UNKNOWN';receipt.spendState='RESERVATION_RETAINED';await t.put('organizerUsage',receipt);unknown=true;}}if(unknown){job.state='OUTCOME_UNKNOWN';await t.put('organizerJobs',job);}return safeJob(job);});}
 async cancel(id){return this.write(async t=>{const job=await this.job(t,id);if(terminal.has(job.state))return safeJob(job);job.cancelEpoch++;let dispatched=false,unknown=false;
  for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(!receipt)continue;if(receipt.attemptCount){dispatched=true;if(['DISPATCHED','OUTCOME_UNKNOWN'].includes(receipt.state)){receipt.state='OUTCOME_UNKNOWN';unknown=true;}else if(receipt.state!=='COMMITTED'){receipt.state='EXPIRED_UNCOMMITTED';receipt.stateKey=1;}receipt.spendState='RESERVATION_RETAINED';}else{receipt.state='CANCELLED_BEFORE_DISPATCH';receipt.stateKey=1;receipt.spendState='RELEASED_BEFORE_DISPATCH';}await t.put('organizerUsage',receipt);}
  job.state=unknown?'OUTCOME_UNKNOWN':dispatched?'EXPIRED_UNCOMMITTED':'CANCELLED_BEFORE_DISPATCH';job.stateKey=unknown?0:1;await t.put('organizerJobs',job);return safeJob(job);
 });}
 async reconcileOutcome(id,childId,proof){
  if(typeof this.verifyOutcome!=='function')fail('UNAVAILABLE');
  const saved=await this.read(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));if(!job.childIds.includes(childId)||!receipt||receipt.jobId!==id||receipt.state!=='OUTCOME_UNKNOWN')fail();return receipt;});
  // Verification may query a future trusted service, outside IndexedDB. It
  // cannot dispatch, mint a replacement child or return/persist content.
  const binding={logicalJobId:id,childOperationId:childId,parentReservationId:saved.parentReservationId};
  const result=structuredClone(await this.verifyOutcome(Object.freeze(binding),proof));exact(result,['binding','outcome','operationReceiptId']);
  if(!equal(result.binding,binding)||!['ACCEPTED','NOT_ACCEPTED'].includes(result.outcome)||!opaque(result.operationReceiptId))fail('UNAVAILABLE');
  return this.write(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));if(!equal(receipt,saved))fail('STALE_BASE');
   receipt.operationReceiptId=result.operationReceiptId;receipt.outcomeProof=result.outcome;
   receipt.state=result.outcome==='NOT_ACCEPTED'?'REJECTED':job.cancelEpoch?'EXPIRED_UNCOMMITTED':'RESPONSE_RECORDED';receipt.stateKey=['REJECTED','EXPIRED_UNCOMMITTED'].includes(receipt.state)?1:0;
   receipt.spendState=result.outcome==='NOT_ACCEPTED'?'RELEASED_VERIFIED_NOT_ACCEPTED':'UNSETTLED';await t.put('organizerUsage',receipt);
   job.state=receipt.state;await this.aggregate(t,job);job.stateKey=terminal.has(job.state)?1:0;await t.put('organizerJobs',job);return safeJob(job);
  });
 }

 async resolveLocal(id,{facet,units}={}){
  units=structuredClone(units);
  // Validate and commit one local subset atomically. An unresolved sibling (or
  // the remainder of this same child) is still PLANNED and can be reserved once.
  return this.write(async t=>{const job=await this.job(t,id);await this.current(t,job);const validated=validateCoverage(units,job.type),index=job.childCoverage.findIndex(c=>validated.every(u=>u.facet===facet&&c.some(v=>unitKey(u)===unitKey(v))));if(index<0)fail();
   const remaining=validated.filter(u=>!job.committedCoverage.includes(unitKey(u)));if(!remaining.length)return safeJob(job);if(terminal.has(job.state))fail('CANCELLED');
   const childId=job.childIds[index],prior=await t.get('organizerUsage',receiptId(childId));if(prior&&(prior.executionKind!=='local'||prior.attemptCount!==0||prior.state!=='PLANNED'))fail();
   if(!prior)await t.put('organizerUsage',{id:receiptId(childId),kind:KIND,version:1,jobId:id,childId,parentReservationId:'local-no-cost',executionKind:'local',sequence:index,state:'PLANNED',stateKey:0,windowIds:[],attemptCount:0,spendState:'NO_PROVIDER_COST',effectiveResultCount:0});
   return this.applyFacet(t,job,index,{facet,units:validated,outcome:'NO_CHANGE',local:true});
  });
 }
 async commitFacet(id,childId,{facet,units,outcome='COMMITTED',retryCondition=null}={}){
  units=structuredClone(units);
  if(!['COMMITTED','NO_CHANGE','DEFER'].includes(outcome)||retryCondition!==null&&!opaque(retryCondition))fail();
  return this.write(async t=>{const job=await this.job(t,id);await this.current(t,job);const index=job.childIds.indexOf(childId),receipt=await t.get('organizerUsage',receiptId(childId));
   if(index<0||!receipt||receipt.jobId!==id||!['RESPONSE_RECORDED','VALIDATED','COMMITTED'].includes(receipt.state))fail();
   return this.applyFacet(t,job,index,{facet,units,outcome,retryCondition});
  });
 }
 async applyFacet(t,job,index,{facet,units,outcome,retryCondition=null,local=false}){
   const receipt=await t.get('organizerUsage',receiptId(job.childIds[index])),childId=job.childIds[index],id=job.id;
   const validated=validateCoverage(units,job.type),permitted=new Set(job.childCoverage[index].map(unitKey));if(validated.some(u=>u.facet!==facet||!permitted.has(unitKey(u))))fail();
   const remaining=validated.filter(u=>!job.committedCoverage.includes(unitKey(u)));if(!remaining.length)return safeJob(job);
   if(outcome==='DEFER'){if(!retryCondition)fail();for(const unit of remaining)await t.put('organizerWorkItems',{id:'aiu:defer:'+canonical([id,unitKey(unit)]),kind:KIND,jobId:id,state:'DEFERRED',stateKey:0,sequence:index,unit,retryCondition,signature:job.items.find(i=>i.key===unit.key).signature});return {...safeJob(job),deferred:true};}
   const commit=this.committers[facet];if(typeof commit!=='function')fail('UNAVAILABLE');
   const result=await commit(t,Object.freeze({...(job.organizeStyle?{organizeStyle:structuredClone(job.organizeStyle),organizeSemanticKey:job.organizeSemanticKey}:{}),logicalJobId:id,childOperationId:childId,units:structuredClone(remaining),outcome}));
   if(result?.committed!==true||!equal((result.coverage||[]).map(unitKey).sort(),remaining.map(unitKey).sort()))fail('STALE_BASE');
   if(job.organizeStyle||job.assistIntent)await this.current(t,job);
   // Domain mutation, exact coverage and receipt are one IndexedDB transaction.
   for(const unit of remaining){const item=job.items.find(i=>i.key===unit.key);await t.put('organizerWorkItems',{id:qualifiedCoverageId(unit,job),kind:KIND,jobId:id,state:'ACKNOWLEDGED',stateKey:1,sequence:index,unit,signature:item.signature,outcome,inputIds:item.descriptor.inputIds,sourceRecordIds:item.descriptor.sourceRecordIds});job.committedCoverage.push(unitKey(unit));}
   if(job.type==='AI_MAINTENANCE')for(const item of job.items){const dirty=await t.get('meta',DIRTY_PREFIX+item.key);if(!dirty||dirty.signature!==item.signature)continue;const pending=[];for(const facet of dirty.pendingFacets||['topic','context']){const requirements=dirty.requirements.map(encoded=>JSON.parse(encoded)).filter(([,f])=>f===facet);let complete=requirements.length>0;for(const [key,f,scope]of requirements){const ack=await t.get('organizerWorkItems',coverId(key,f,scope));if(ack?.signature!==item.signature){complete=false;break;}}if(!complete)pending.push(facet);}if(!pending.length)await t.delete('meta',DIRTY_PREFIX+item.key);else await t.put('meta',{...dirty,pendingFacets:pending});}
   const childComplete=job.childCoverage[index].every(u=>job.committedCoverage.includes(unitKey(u)));receipt.state=childComplete?'COMMITTED':local?'PLANNED':'VALIDATED';receipt.stateKey=childComplete?1:0;receipt.effectiveResultCount=0;await t.put('organizerUsage',receipt);
   job.state=job.coverage.every(u=>job.committedCoverage.includes(unitKey(u)))?'COMMITTED':'VALIDATED';await this.aggregate(t,job);job.stateKey=job.state==='COMMITTED'?1:0;await t.put('organizerJobs',job);if(outcome==='NO_CHANGE')await count(t,'localResolved');return safeJob(job);
 }
}
