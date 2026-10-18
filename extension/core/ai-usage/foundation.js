import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../idb-repository.js';
import {qwenFoundationProviderData,qwenFoundationResponse} from './qwen-qualified-request.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {clientOperationStatusTransportOrigin,observedClientOperationStatus} from './client-operation-status-transport.js';
import {clientReservationTransportOrigin,observedClientReservation} from './client-reservation-transport.js';
import {clientResultTransportOrigin,isClientResultTransport} from './client-result-transport.js';
import {snapshot as snapshotData,freeze as freezeData,exact as exactData} from './qwen-request-data.js';
import {domainResultReceipt,savedDomainResultReceipt,savedFinancialCancellation} from './domain-result-receipt.js';
import {unsupportedMaintenanceCoverage} from './maintenance-batch.js';
import {assertAssistIntent,validateAssistIntent,validateHistoricalIntent,qualifiedCoverageId} from './assist-intent-binding.js';
import {validateOrganizeStyle,styleSemantics,assertOrganizeStyle} from './organize-style-binding.js';
import {DIRTY_PREFIX,KNOWN_PREFIX,HUMAN_FENCE,deltaDescription,deltaSignature} from './delta.js';
import {JOB_TYPES,CHILD_LIMITS,fail,opaque,token,integer,exact,equal,canonical,digest,unitKey,validateCoverage,validateAuthority,localProviderDescriptor,ASSIST_RESULT_KIND,validateReplyObligation,isAssistResultJob,HISTORICAL_CANDIDATE_KIND,validateCandidateObligation,isHistoricalCandidateJob,isPrivateResultJob} from './contracts.js';
const ATOMIC='ai_organize_atomic_v1';
const atomicJob=j=>j?.kind===ATOMIC&&j.version===1&&j.commitMode==='organize-atomic-v1'&&j.type==='AI_ORGANIZE'&&j.childIds?.length>=2&&j.childIds.length<=4;
const validOrganizeRequestKey=j=>!Object.hasOwn(j,'organizeRequestKey')||j.type==='AI_ORGANIZE'&&token(j.organizeRequestKey);
const knownJob=j=>!!j&&validOrganizeRequestKey(j)&&(j.kind==='ai_usage_v1'&&!Object.hasOwn(j,'commitMode')||atomicJob(j)||isPrivateResultJob(j));
const KIND='ai_usage_v1',COUNTERS='aiu:counters:v1',HISTORICAL_FLIGHT='aiu:historical-service-preflight:v1';
const terminal=new Set(['COMMITTED','CANCELLED_BEFORE_DISPATCH','REJECTED','EXPIRED_UNCOMMITTED']);
const coverId=(key,facet,scope)=>'aiu:coverage:'+canonical([key,facet,scope]);
const receiptId=id=>'aiu:attempt:'+id;
const dispatchFenceId=id=>'aiu:dispatched:'+id;
const safeJob=j=>({id:j.id,type:j.type,state:j.state,childIds:[...j.childIds],committedCoverage:[...j.committedCoverage],cancelEpoch:j.cancelEpoch});
async function count(t,key){const row=await t.get('meta',COUNTERS)||{id:COUNTERS,skippedNoDelta:0,localResolved:0,cacheIntent:0,physicalAttempt:0};if(!Object.hasOwn(row,key)||!integer(row[key]))fail();row[key]++;await t.put('meta',row);}

// Opt-in historical execution uses the existing original transport deadline.
// A timed-out/aborted dispatch remains possibly billable; late transport output
// is never an ACK, and the feature owner retains any still-live physical call.
async function historicalExecution(provider,request,{signal,timeoutMs}){
 const controller=new AbortController();let timer,abort;
 try{
  const stop=new Promise((_,reject)=>{abort=()=>{controller.abort();reject(Object.assign(Error('CANCELLED'),{code:'CANCELLED'}));};signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('TIMEOUT'),{code:'TIMEOUT'}));},timeoutMs);});
  const response=Promise.resolve().then(()=>{if(controller.signal.aborted)fail('CANCELLED');return provider.execute(request,{signal:controller.signal});});
  return await Promise.race([response,stop]);
 }finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);}
}

// Trusted local owner integration, intentionally not a worker/public command.
// Only constructor-injected domain owners can commit. The explicit Qwen service
// path has no default endpoint, identity, registry or automatic paid retry.
export class AIUsageFoundation {
 #createdMaintenancePlans=new WeakMap();
 #serverProviders=new Map();#resultReports=new Map();#historicalRecovery=new WeakMap();#organizeRecovery=new WeakMap();
 #qualifyMaintenanceEntries;#qualifyMaintenancePlacements;#qualifyMaintenanceStructures;#qualifyMaintenanceContextEdits;
 constructor(store,{resolveAuthority=null,verifyOutcome=null,resolveAssistIntent=null,resolveHistoricalIntent=null,candidateResult=null,committers={},organizeClosure=null,assistResult=null,qualifyMaintenanceEntries=null,qualifyMaintenancePlacements=null,qualifyMaintenanceStructures=null,qualifyMaintenanceContextEdits=null}={}){if(qualifyMaintenanceEntries!==null&&typeof qualifyMaintenanceEntries!=='function')fail();if(qualifyMaintenancePlacements!==null&&typeof qualifyMaintenancePlacements!=='function')fail();if(qualifyMaintenanceStructures!==null&&typeof qualifyMaintenanceStructures!=='function')fail();if(qualifyMaintenanceContextEdits!==null&&typeof qualifyMaintenanceContextEdits!=='function')fail();this.#qualifyMaintenanceContextEdits=qualifyMaintenanceContextEdits;this.#qualifyMaintenanceStructures=qualifyMaintenanceStructures;this.#qualifyMaintenancePlacements=qualifyMaintenancePlacements;this.#qualifyMaintenanceEntries=qualifyMaintenanceEntries;this.s=store;this.resolveHistoricalIntent=resolveHistoricalIntent;this.candidateResult=candidateResult;this.assistResult=assistResult;this.organizeClosure=organizeClosure;this.resolveAssistIntent=resolveAssistIntent;this.resolveAuthority=resolveAuthority;this.verifyOutcome=verifyOutcome;this.committers=Object.freeze({...committers});}
 async read(fn){await this.s.finishFoundation();return this.s.run(()=>this.s.repository.transaction(false,fn));}
 async write(fn){return this.s.foundationWrite(fn);}
 async authority(t,type,scope){
  if(typeof this.resolveAuthority!=='function')fail('UNAVAILABLE');
  const request={purpose:'ai-usage',jobType:type,evidenceKeys:scope.items.map(i=>i.key).sort(),coverage:scope.coverage},resolved=await this.resolveAuthority(t,request);
  if(!equal(resolved?.scope,{evidenceKeys:request.evidenceKeys,coverage:request.coverage}))fail('UNAVAILABLE');
  const {scope:approvedScope,...answer}=resolved,authority=validateAuthority(answer,type),gate=await t.get('meta','gate');
  if(gate?.enabled!==true||(await t.get('meta','thought-library'))?.sealed)fail('UNAVAILABLE');
  return {...authority,gateEpoch:gate.epoch,restoreEpoch:(await t.get('meta','recovery-restore-epoch'))?.value??'initial',humanFence:type==='AI_ASSIST'&&(scope.assistIntent||scope.historicalIntent)?null:(await t.get('meta',HUMAN_FENCE))?.value??0};
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
 async archiveObsoleteDeferred({cursor=null,limit=100,reconsiderEntryTopics=false,reconsiderEntryContexts=false,reconsiderPlacementContexts=false,reconsiderStructuralContexts=false,reconsiderStructuralTopics=false,reconsiderContextEdits=false,maintenanceRouteVersion=null}={},owner=null){
  if(!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&(typeof cursor!=='string'||!cursor.startsWith('aiu:defer:')||cursor.length>2000))fail();
  if(typeof reconsiderEntryTopics!=='boolean'||typeof reconsiderEntryContexts!=='boolean'||typeof reconsiderPlacementContexts!=='boolean'||typeof reconsiderStructuralContexts!=='boolean'||typeof reconsiderStructuralTopics!=='boolean'||typeof reconsiderContextEdits!=='boolean')fail();
  if((reconsiderEntryContexts||reconsiderPlacementContexts||reconsiderStructuralContexts||reconsiderStructuralTopics||reconsiderContextEdits)&&!opaque(maintenanceRouteVersion))fail();
  const reconsiderEntries=reconsiderEntryTopics||reconsiderEntryContexts||reconsiderPlacementContexts||reconsiderStructuralContexts||reconsiderStructuralTopics||reconsiderContextEdits;
  if(reconsiderEntries){exact(owner,['signal','isCurrent']);if((reconsiderEntryTopics||reconsiderEntryContexts)&&!this.#qualifyMaintenanceEntries||reconsiderPlacementContexts&&!this.#qualifyMaintenancePlacements||(reconsiderStructuralContexts||reconsiderStructuralTopics)&&!this.#qualifyMaintenanceStructures||reconsiderContextEdits&&!this.#qualifyMaintenanceContextEdits||!(owner.signal instanceof AbortSignal)||typeof owner.isCurrent!=='function')fail('UNAVAILABLE');}
  const assertOwner=()=>{if(reconsiderEntries&&(owner.signal.aborted||owner.isCurrent()!==true))fail('CANCELLED');};assertOwner();
  return this.write(async t=>{
   if(reconsiderEntries){const abort=()=>{try{t.tx.abort();}catch{}};owner.signal.addEventListener('abort',abort,{once:true});const cleanup=()=>owner.signal.removeEventListener('abort',abort);t.tx.addEventListener('complete',cleanup,{once:true});t.tx.addEventListener('abort',cleanup,{once:true});}assertOwner();
   const page=await t.primaryRangePage('organizerWorkItems',{prefix:'aiu:defer:',after:cursor,limit});let archived=0,reconsidered=0;
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
    let mappingAvailable=false;
    if(reconsiderEntries&&(!(reconsiderEntryContexts||reconsiderPlacementContexts||reconsiderStructuralContexts||reconsiderStructuralTopics||reconsiderContextEdits)||maintenanceRouteVersion!==job.routeVersion)&&!changed&&!acknowledged&&job.type==='AI_MAINTENANCE'&&((row.unit.facet==='topic'&&reconsiderEntryTopics)||(row.unit.facet==='context'&&reconsiderEntryContexts))&&row.retryCondition===({topic:'TOPIC_MAPPING_UNAVAILABLE',context:'CONTEXT_MAPPING_UNAVAILABLE'})[row.unit.facet]&&known?.signature===row.signature&&known.descriptor?.kind==='library_entry'&&!known.descriptor.removed&&!known.descriptor.fenceOnly&&await this.s.sourcePresent(t,known.descriptor.sourceRecordIds)){
     const dirty=await t.get('meta',DIRTY_PREFIX+row.unit.key);
     if(dirty?.signature===row.signature&&(dirty.pendingFacets||['topic','context']).includes(row.unit.facet)){
      const admitted=await this.#qualifyMaintenanceEntries(t,{items:[{key:known.descriptor.key,signature:known.signature,descriptor:structuredClone(known.descriptor)}],coverage:[structuredClone(row.unit)]});assertOwner();
      if(!Array.isArray(admitted)||admitted.length>1||admitted.length===1&&!equal(validateCoverage(admitted,job.type),[row.unit]))fail('INVALID_REQUEST');
      mappingAvailable=admitted.length===1;
     }
    }
    if(reconsiderPlacementContexts&&maintenanceRouteVersion!==job.routeVersion&&!changed&&!acknowledged&&job.type==='AI_MAINTENANCE'&&row.unit.facet==='context'&&row.retryCondition==='CONTEXT_MAPPING_UNAVAILABLE'&&known?.signature===row.signature&&known.descriptor?.kind==='placement'&&!known.descriptor.removed&&!known.descriptor.fenceOnly&&await this.s.sourcePresent(t,known.descriptor.sourceRecordIds)){
     const dirty=await t.get('meta',DIRTY_PREFIX+row.unit.key);
     if(dirty?.signature===row.signature&&(dirty.pendingFacets||['topic','context']).includes('context')){
      const admitted=await this.#qualifyMaintenancePlacements(t,{items:[{key:known.descriptor.key,signature:known.signature,descriptor:structuredClone(known.descriptor)}],coverage:[structuredClone(row.unit)]});assertOwner();
      if(!Array.isArray(admitted)||admitted.length>1||admitted.length===1&&!equal(validateCoverage(admitted,job.type),[row.unit]))fail('INVALID_REQUEST');mappingAvailable=admitted.length===1;
     }
    }
    if((reconsiderStructuralContexts&&row.unit.facet==='context'||reconsiderStructuralTopics&&row.unit.facet==='topic'&&known?.descriptor?.kind==='topic')&&maintenanceRouteVersion!==job.routeVersion&&!changed&&!acknowledged&&job.type==='AI_MAINTENANCE'&&row.retryCondition===({context:'CONTEXT_MAPPING_UNAVAILABLE',topic:'TOPIC_MAPPING_UNAVAILABLE'})[row.unit.facet]&&known?.signature===row.signature&&['section','topic'].includes(known.descriptor?.kind)&&!known.descriptor.removed&&!known.descriptor.fenceOnly){
     const dirty=await t.get('meta',DIRTY_PREFIX+row.unit.key);
     if(dirty?.signature===row.signature&&(dirty.pendingFacets||['topic','context']).includes(row.unit.facet)){
      const admitted=await this.#qualifyMaintenanceStructures(t,{items:[{key:known.descriptor.key,signature:known.signature,descriptor:structuredClone(known.descriptor)}],coverage:[structuredClone(row.unit)]});assertOwner();
      if(!Array.isArray(admitted)||admitted.length>1||admitted.length===1&&!equal(validateCoverage(admitted,job.type),[row.unit]))fail('INVALID_REQUEST');mappingAvailable=admitted.length===1;
     }
    }
    if(reconsiderContextEdits&&maintenanceRouteVersion!==job.routeVersion&&!changed&&!acknowledged&&job.type==='AI_MAINTENANCE'&&row.unit.facet==='context'&&row.retryCondition==='CONTEXT_MAPPING_UNAVAILABLE'&&known?.signature===row.signature&&known.descriptor?.kind==='context_item'&&!known.descriptor.removed&&!known.descriptor.fenceOnly){
     const dirty=await t.get('meta',DIRTY_PREFIX+row.unit.key);
     if(dirty?.signature===row.signature&&(dirty.pendingFacets||['topic','context']).includes('context')){
      const admitted=await this.#qualifyMaintenanceContextEdits(t,{items:[{key:known.descriptor.key,signature:known.signature,descriptor:structuredClone(known.descriptor)}],coverage:[structuredClone(row.unit)]});assertOwner();
      if(!Array.isArray(admitted)||admitted.length>1||admitted.length===1&&!equal(validateCoverage(admitted,job.type),[row.unit]))fail('INVALID_REQUEST');mappingAvailable=admitted.length===1;
     }
    }
    if(!changed&&!acknowledged&&!mappingAvailable)continue;assertOwner();
    const boundRow=mappingAvailable&&row.unit.facet==='context'&&(known.descriptor.sourceRecordIds||[]).length?await t.get('thoughts',known.descriptor.kind==='placement'?(await t.get('placements',known.descriptor.recordId||known.descriptor.entityId))?.entryId:known.descriptor.entityId):null;
    const boundFields=boundRow&&['note','title'].some(f=>(boundRow[f]??'').trim()||boundRow.fieldRevisions?.[f]>0);
    const history={...row,...(mappingAvailable?{reconsideredBecause:known.descriptor.kind==='context_item'?'HUMAN_CONTEXT_EDIT_MAPPER_V1':known.descriptor.kind==='topic'?(row.unit.facet==='topic'?'HUMAN_TOPIC_RECONCILIATION_V1':'HUMAN_TOPIC_CONTEXT_MAPPER_V1'):known.descriptor.kind==='section'?'HUMAN_SECTION_CONTEXT_MAPPER_V1':boundFields?'BOUND_ENTRY_CONTEXT_MAPPER_V1':known.descriptor.kind==='placement'?'MANUAL_PLACEMENT_CONTEXT_MAPPER_V1':!known.descriptor.sourceRecordIds.length&&!known.descriptor.inputIds.length?'AUTHORED_ENTRY_CONTEXT_MAPPER_V1':row.unit.facet==='topic'?'RESTORED_ENTRY_TOPIC_MAPPER_V1':'RESTORED_ENTRY_CONTEXT_MAPPER_V1'}:{}),id:'aiu:defer-history:'+row.id.slice('aiu:defer:'.length),originalId:row.id},prior=await t.get('organizerWorkItems',history.id);
    if(prior&&!equal(prior,history))fail('DEFER_HISTORY_CONFLICT');
    if(!prior)await t.put('organizerWorkItems',history);
    await t.delete('organizerWorkItems',row.id);archived++;if(mappingAvailable)reconsidered++;assertOwner();
   }
   assertOwner();return {scanned:page.rows.length,archived,nextCursor:page.next,...(reconsiderEntries?{reconsidered}:{} )};
  });
 }
 async counters(){return this.read(async t=>await t.get('meta',COUNTERS)||{id:COUNTERS,skippedNoDelta:0,localResolved:0,cacheIntent:0,physicalAttempt:0});}
 async cacheIntent(){await this.write(t=>count(t,'cacheIntent'));}
 async current(t,job,{allowCancelled=false}={}){
  if(!validOrganizeRequestKey(job))fail('RESULT_BINDING_MISMATCH');
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
  exact(request,['type','items','coverage','children','contractVersion','routeVersion','intent','organizeStyle','organizeRequestKey','assistIntent','commitMode','replyObligation','historicalIntent','candidateObligation'],['type','items','coverage','contractVersion','routeVersion','intent']);
  const {type,items,contractVersion,routeVersion,intent}=request;
  if(!validOrganizeRequestKey(request))fail();const organizeRequest=Object.hasOwn(request,'organizeRequestKey')?{organizeRequestKey:request.organizeRequestKey}:{};
  const reply=Object.hasOwn(request,'replyObligation');const replyObligation=reply?validateReplyObligation(request.replyObligation):null;if(reply&&(type!=='AI_ASSIST'||typeof this.assistResult!=='function'||Object.hasOwn(request,'children')||Object.hasOwn(request,'commitMode')))fail();
  const candidates=Object.hasOwn(request,'candidateObligation'),candidateObligation=candidates?validateCandidateObligation(request.candidateObligation):null;
  if(candidates&&(type!=='AI_ASSIST'||reply||typeof this.candidateResult!=='function'||typeof this.resolveHistoricalIntent!=='function'||Object.hasOwn(request,'assistIntent')||Object.hasOwn(request,'children')||Object.hasOwn(request,'commitMode')))fail();
  const historical=Object.hasOwn(request,'historicalIntent'),historicalIntent=historical?validateHistoricalIntent(type,request.historicalIntent):null;
  if(candidates!==historical)fail();
  const resultBinding=reply?{kind:ASSIST_RESULT_KIND,replyObligation}:candidates?{kind:HISTORICAL_CANDIDATE_KIND,candidateObligation,historicalIntent}:{};
  const privateResult=reply||candidates;
  const atomic=Object.hasOwn(request,'commitMode');if(atomic&&(request.commitMode!=='organize-atomic-v1'||type!=='AI_ORGANIZE'||typeof this.organizeClosure!=='function'))fail();
  const assisted=Object.hasOwn(request,'assistIntent'),assistIntent=assisted?validateAssistIntent(type,request.assistIntent):null;
  if(type==='AI_ASSIST'&&!candidates&&(!assisted||typeof this.resolveAssistIntent!=='function'))fail('UNAVAILABLE');
  const styled=Object.hasOwn(request,'organizeStyle'),organizeStyle=styled?validateOrganizeStyle(type,request.organizeStyle):null;
  if(!JOB_TYPES.includes(type)||!['explicit','maintenance'].includes(intent)||type!=='AI_MAINTENANCE'&&intent!=='explicit'||!opaque(contractVersion)||!opaque(routeVersion)||!Array.isArray(items)||!reply&&!items.length||items.length>100)fail();
  const seen=new Set();for(const item of items){exact(item,['key','signature','descriptor']);if(typeof item.key!=='string'||item.key.length>450||typeof item.signature!=='string'||item.signature.length>16000||seen.has(item.key))fail();seen.add(item.key);}
  const coverage=reply&&Array.isArray(request.coverage)&&!request.coverage.length?[]:validateCoverage(request.coverage,type);if(coverage.some(u=>!seen.has(u.key))||items.some(i=>!coverage.some(u=>u.key===i.key))||type==='AI_MAINTENANCE'&&coverage.every(u=>u.facet==='filter'))fail();
  const children=(request.children||[coverage]).map(c=>reply&&!c.length?[]:validateCoverage(c,type)).sort((a,b)=>canonical(a).localeCompare(canonical(b)));
  if(!children.length||children.length>CHILD_LIMITS[type]||!equal(children.flat().map(unitKey).sort(),coverage.map(unitKey).sort()))fail();
  if(atomic&&(children.length<2||coverage.some(u=>u.facet!=='organize')))fail();
  const snapshot=await this.read(async t=>{await assertAssistIntent(this,t,{type,items,coverage,...resultBinding,...(assisted?{assistIntent}:{})});if(styled)await assertOrganizeStyle(this.s,t,{type,organizeStyle});const authority=await this.authority(t,type,{items,coverage,...(assisted?{assistIntent}:{}),...(historical?{historicalIntent}:{})});for(const item of items){const known=await t.get('meta',KNOWN_PREFIX+item.key);if(!known||known.signature!==item.signature||!equal(known.descriptor,item.descriptor)||known.descriptor.removed)fail('STALE_BASE');}await assertAssistIntent(this,t,{type,items,coverage,...resultBinding,...(assisted?{assistIntent}:{})});return {authority};});
  const scope=items.map(i=>({key:i.key,signature:i.signature})).sort((a,b)=>a.key.localeCompare(b.key));
  const identity={...organizeRequest,...resultBinding,...(atomic?{commitMode:request.commitMode}:{}),...(assisted&&!reply?{assistIntent}:{}),type,scope,coverage,children,contractVersion,routeVersion,principalId:snapshot.authority.principalId,libraryId:snapshot.authority.libraryId,consentEpoch:snapshot.authority.consentEpoch};
  const scopeFingerprint=await digest({type,scope,coverage,children});
  const organizeSemanticKey=styled?await digest({...identity,style:styleSemantics(organizeStyle)}):null;
  const id='aiu:job:'+await digest(styled?{...identity,organizeStyle}:identity);
  const childIds=await Promise.all(children.map((c,index)=>digest([id,index,c]).then(hash=>'aiu:child:'+hash)));
  const targetScopes=[...new Set(coverage.map(c=>c.scope))].sort();
  if(type==='AI_ORGANIZE'&&targetScopes.length!==1)fail();
  const flightId='aiu:flight:'+await digest([snapshot.authority.principalId,snapshot.authority.libraryId,type,type==='AI_MAINTENANCE'?'library':candidates?'historical-candidates':targetScopes]);
  const proposed={...organizeRequest,...(assisted?{assistIntent}:{}),...(styled?{organizeStyle,organizeSemanticKey}:{}),id,kind:reply?ASSIST_RESULT_KIND:candidates?HISTORICAL_CANDIDATE_KIND:atomic?ATOMIC:KIND,...(reply?{replyObligation,resultCommitted:false}:candidates?{candidateObligation,historicalIntent,resultCommitted:false}:{}),...(atomic?{commitMode:request.commitMode}:{}),type,version:1,state:'PLANNED',stateKey:0,sequence:0,dedupeKey:id,items:structuredClone(items),coverage,childCoverage:children,childIds,scopeFingerprint,contractVersion,routeVersion,authority:snapshot.authority,flightId,cancelEpoch:0,committedCoverage:[],sourceRecordIds:[...new Set(items.flatMap(i=>i.descriptor.sourceRecordIds))]};
  let created=false;const result=await this.write(async t=>{
   await this.current(t,proposed);
   const prior=await t.get('organizerJobs',id);if(prior){if(!knownJob(prior)||prior.kind!==proposed.kind)fail();if(prior.organizeRequestKey!==proposed.organizeRequestKey)fail('RESULT_BINDING_MISMATCH');
    if(!equal(prior.authority,proposed.authority)&&prior.cancelEpoch===0&&['PLANNED','RESERVED'].includes(prior.state)){
     for(const childId of prior.childIds){const r=await t.get('organizerUsage',receiptId(childId));if(await t.get('meta',dispatchFenceId(childId))||r&&(r.attemptCount!==0||r.state!=='RESERVED'&&!(r.executionKind==='local'&&['PLANNED','COMMITTED'].includes(r.state))))fail('OUTCOME_UNKNOWN');}
     // Rebind a never-dispatched plan to current local fences without changing
     // logical/child identity, local checked coverage, the unused reservation,
     // or any possibly billed attempt.
     prior.authority=proposed.authority;prior.planningRevision=(prior.planningRevision||0)+1;await t.put('organizerJobs',prior);
    }
    return safeJob(prior);
   }
   const active=await t.get('meta',flightId);if(active){const job=await t.get('organizerJobs',active.jobId);if(!job&&active.dispatched)fail('OUTCOME_UNKNOWN');if(job&&!knownJob(job))fail();if(job&&!terminal.has(job.state)){
    let stale=false;try{await this.current(t,job);}catch(error){if(!['CANCELLED','STALE_BASE'].includes(error.code))throw error;stale=true;}
    if(!stale||!['PLANNED','RESERVED'].includes(job.state))fail('REQUEST_ALREADY_IN_FLIGHT');
    for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(receipt?.attemptCount)fail('OUTCOME_UNKNOWN');if(receipt){receipt.state='CANCELLED_BEFORE_DISPATCH';receipt.stateKey=1;receipt.spendState='RELEASED_BEFORE_DISPATCH';await t.put('organizerUsage',receipt);}}
    job.cancelEpoch++;job.state='CANCELLED_BEFORE_DISPATCH';job.stateKey=1;await this.#putJob(t,job);
   }}
   const allCovered=[];for(const unit of coverage){const saved=await t.get('organizerWorkItems',qualifiedCoverageId(unit,proposed)),item=items.find(i=>i.key===unit.key);if(saved?.signature===item.signature)allCovered.push(unitKey(unit));}
   if(!privateResult&&allCovered.length===coverage.length){await count(t,'skippedNoDelta');return {id:null,type,state:'NO_DELTA',childIds:[],committedCoverage:allCovered,cancelEpoch:0};}
   // No coarse checkpoint is advanced: exact incomplete facet/scope units stay.
   if(type==='AI_MAINTENANCE')for(const item of items){let dirty=await t.get('meta',DIRTY_PREFIX+item.key);if(dirty&&dirty.signature!==item.signature)fail('STALE_BASE');if(!dirty)dirty={...(await t.get('meta',KNOWN_PREFIX+item.key)),id:DIRTY_PREFIX+item.key,requirements:[],pendingFacets:[]};const needed=coverage.filter(c=>c.key===item.key&&!allCovered.includes(unitKey(c)));dirty.requirements=[...new Set([...(dirty.requirements||[]),...coverage.filter(c=>c.key===item.key).map(unitKey)])].sort();dirty.pendingFacets=[...new Set([...(dirty.pendingFacets||['topic','context']),...needed.map(c=>c.facet)])].sort();await t.put('meta',dirty);}
   if(atomic&&allCovered.length)fail('STALE_BASE');
   proposed.committedCoverage=allCovered;await t.put('organizerJobs',proposed);await t.put('meta',{id:flightId,jobId:id});created=true;return safeJob(proposed);
  });
  if(created&&type==='AI_MAINTENANCE')this.#createdMaintenancePlans.set(result,canonical({id,authority:proposed.authority,coverage:proposed.coverage,childIds:proposed.childIds}));return result;
 }
 async #putJob(t,job){
  const receipt=await domainResultReceipt(t,job);
  if(job.domainResultReceipt&&(!receipt||!equal(job.domainResultReceipt,receipt)))fail('RESULT_CONFLICT');
  if(receipt)job.domainResultReceipt=receipt;
  await t.put('organizerJobs',job);
 }
 async #resultAuthority(t,job){
  // Historical metadata replay has no content read or new result admission.
  // Current principal/library/consent and enabled gate still govern transport.
  const now=await this.authority(t,job.type,job);
  if(['principalId','libraryId','consentEpoch'].some(k=>now[k]!==job.authority[k]))fail('CANCELLED');
 }
 async domainResult(id){
  if(!opaque(id))fail();
  return this.read(async t=>{const job=await this.job(t,id);await this.#resultAuthority(t,job);
   const receipt=await savedDomainResultReceipt(t,job);
   return {status:receipt?'LOCAL_DOMAIN_RESULT':terminal.has(job.state)?'MISSING_RECEIPT':'PENDING',receipt,financialAuthority:false,dispatchAllowed:false};
  });
 }
 async #resultEvidence(t,job){
  const local=await savedDomainResultReceipt(t,job);if(!local)fail('RESULT_PENDING');
  const rows=[];for(const childId of job.childIds)rows.push(await t.get('organizerUsage',receiptId(childId)));
  if(rows.some(r=>!r||r.executionKind!=='server-backed')||new Set(rows.map(r=>r.serviceOrigin)).size!==1)fail('FINANCIAL_RECEIPT_UNAVAILABLE');
  const children=[];
  for(let i=0;i<rows.length;i++){
   const r=rows[i];this.#assertServerBinding(job,i,{request:r.financialRequest});
   if(r.state==='CANCELLED_BEFORE_DISPATCH'&&[0,1].includes(r.attemptCount)&&savedFinancialCancellation(r))children.push({operationId:r.childId,receiptId:null});
   else{const f=r.financialSettlement;if(!f||f.state!=='SETTLED'||!opaque(f.receiptId)||f.receiptId!==r.operationReceiptId||!['VALIDATED','FAILED'].includes(f.outcome)||f.effectiveResults!==0||local.outcome==='COMMITTED'&&f.outcome!=='VALIDATED')fail('FINANCIAL_RECEIPT_UNAVAILABLE');children.push({operationId:r.childId,receiptId:f.receiptId});}
  }
  const receipts=children.filter(c=>c.receiptId!==null).map(c=>c.receiptId);if(new Set(receipts).size!==receipts.length)fail('FINANCIAL_RECEIPT_UNAVAILABLE');
  if(local.outcome==='COMMITTED'&&children.some(c=>c.receiptId===null))fail('FINANCIAL_RECEIPT_UNAVAILABLE');
  return {version:1,origin:rows[0].serviceOrigin,request:structuredClone(rows[0].financialRequest),result:{receiptId:local.receiptId,jobId:job.id,outcome:local.outcome,children}};
 }
 reportResult(id,proofs,transport){
  let p;try{p=freezeData(snapshotData(proofs,{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));if(!opaque(id)||!exactData(p,['principalToken','entitlementToken'])||!Object.values(p).every(v=>typeof v==='string'&&v.length>0&&v.length<=8192)||!isClientResultTransport(transport))fail('UNAVAILABLE');}catch(error){return Promise.reject(error);}
  const active=this.#resultReports.get(id);if(active)return active.transport===transport&&equal(active.proofs,p)?active.pending:Promise.reject(Object.assign(Error('RESULT_CONFLICT'),{code:'RESULT_CONFLICT'}));
  const pending=(async()=>{
   const prepared=await this.write(async t=>{const job=await this.job(t,id);await this.#resultAuthority(t,job);const evidence=await this.#resultEvidence(t,job);
    if(evidence.origin!==clientResultTransportOrigin(transport))fail('RESULT_ORIGIN_MISMATCH');
    if(job.resultReport&&!equal(job.resultReport.evidence,evidence))fail('RESULT_CONFLICT');
    if(!job.resultReport){job.resultReport={state:'PENDING',evidence};await t.put('organizerJobs',job);}return {evidence,ack:job.resultReport.ack??null};
   });
   if(prepared.ack)return structuredClone(prepared.ack);
   // The saved event exists before sending. A final read transaction serializes
   // authority with local writes; fetch starts synchronously inside this fence.
   const sent=await this.read(async t=>{const job=await this.job(t,id);await this.#resultAuthority(t,job);if(!equal(await this.#resultEvidence(t,job),prepared.evidence))fail('RESULT_CONFLICT');await this.#resultAuthority(t,job);return {pending:transport.finalize({request:prepared.evidence.request,...p},prepared.evidence.result)};});
   const ack=await sent.pending;
   if(ack.decision!=='finalized')return ack;
   await this.write(async t=>{const job=await this.job(t,id);if(!equal(job.resultReport?.evidence,prepared.evidence))fail('RESULT_CONFLICT');if(job.resultReport.ack&&!equal(job.resultReport.ack,ack))fail('RESULT_CONFLICT');job.resultReport={...job.resultReport,state:'ACKNOWLEDGED',ack:structuredClone(ack)};await t.put('organizerJobs',job);});return ack;
  })();
  const activeReport={pending,transport,proofs:p};this.#resultReports.set(id,activeReport);pending.finally(()=>{if(this.#resultReports.get(id)===activeReport)this.#resultReports.delete(id);}).catch(()=>{});return pending;
 }
 // Explicit original-operation recovery. These private handles capture only
 // original metadata; they never authorize content, dispatch or a new attempt.
 async historicalRecovery(origin){
  const saved=await this.read(async t=>{
   const meta=await t.get('meta',HISTORICAL_FLIGHT);if(!meta)return null;
   const job=await this.job(t,meta.jobId),attempt=await t.get('organizerUsage',receiptId(meta.childId));
   if(!isHistoricalCandidateJob(job)||job.childIds.length!==1||job.childIds[0]!==meta.childId||job.historicalIntent.evaluationKey!==meta.evaluationKey||meta.origin!==origin)fail('RESULT_BINDING_MISMATCH');
   await this.#resultAuthority(t,job);
   if(attempt?.executionKind==='server-backed'){
    this.#assertServerBinding(job,0,{request:clientDeclarationRequestData(attempt.financialRequest)});
    if(attempt.serviceOrigin!==origin||meta.financialRequest&&!equal(attempt.financialRequest,meta.financialRequest))fail('RESULT_BINDING_MISMATCH');
   }
   if(terminal.has(job.state)&&await savedDomainResultReceipt(t,job)&&attempt?.executionKind==='server-backed'&&(attempt.financialSettlement?.state==='SETTLED'||savedFinancialCancellation(attempt)))return {closed:true,jobId:job.id,state:job.state};
   // Old v1 markers have no original request. Do not synthesize or migrate one.
   if(!meta.financialRequest)fail('OUTCOME_UNKNOWN');
   exact(meta,['id','version','jobId','childId','evaluationKey','origin','financialRequest']);
   if(meta.version!==1)fail('OUTCOME_UNKNOWN');
   const request=clientDeclarationRequestData(meta.financialRequest);this.#assertServerBinding(job,0,{request});
   if(attempt&&(attempt.executionKind!=='server-backed'||!equal(attempt.financialRequest,request)||attempt.serviceOrigin!==origin||attempt.jobId!==job.id||attempt.childId!==meta.childId||attempt.sequence!==0||![0,1].includes(attempt.attemptCount)))fail('RESULT_BINDING_MISMATCH');
   const dispatch=await t.get('meta',dispatchFenceId(meta.childId)),flight=await t.get('meta',job.flightId);
   if(flight?.jobId!==job.id||dispatch&&!equal(dispatch,{id:dispatchFenceId(meta.childId),version:1,jobId:job.id,childId:meta.childId}))fail('RESULT_BINDING_MISMATCH');
   return {meta,job,attempt,dispatch,flight};
  });
  if(!saved||saved.closed)return saved;
  const handle=freezeData({jobId:saved.job.id,request:structuredClone(saved.meta.financialRequest),origin});this.#historicalRecovery.set(handle,saved);return handle;
 }
 async #recoveryCurrent(t,handle){
  const saved=this.#historicalRecovery.get(handle);if(!saved)fail('UNAVAILABLE');
  const job=await this.job(t,saved.job.id);await this.#resultAuthority(t,job);
  const meta=await t.get('meta',HISTORICAL_FLIGHT),attempt=await t.get('organizerUsage',receiptId(saved.meta.childId)),dispatch=await t.get('meta',dispatchFenceId(saved.meta.childId)),flight=await t.get('meta',job.flightId);
  if(!equal({meta,job,attempt,dispatch,flight},saved))fail('RESULT_CONFLICT');return saved;
 }
 #recoveryObservation(handle,observation,transport){
  if(!this.#historicalRecovery.has(handle))fail('UNAVAILABLE');
  const observed=observedClientOperationStatus(observation,transport);
  if(!observed||observed.origin!==handle.origin||clientOperationStatusTransportOrigin(transport)!==handle.origin||!equal(observed.request,handle.request))fail('RESULT_BINDING_MISMATCH');return observed;
 }
 #recoveryProofs(value){
  const p=freezeData(snapshotData(value,{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));
  if(!exactData(p,['principalToken','entitlementToken'])||!Object.values(p).every(v=>typeof v==='string'&&v.length>0&&v.length<=8192))fail('UNAVAILABLE');return p;
 }
 async queryHistoricalRecovery(handle,proofs,transport,isCurrent){
  proofs=this.#recoveryProofs(proofs);
  if(typeof isCurrent!=='function'||!this.#historicalRecovery.has(handle)||clientOperationStatusTransportOrigin(transport)!==handle.origin)fail('UNAVAILABLE');
  const sent=await this.read(async t=>{const repository=this.s.repository,token=observeRepositoryWriteFence(repository);await this.#recoveryCurrent(t,handle);if(isCurrent()!==true||this.s.repository!==repository)fail('CANCELLED');requireRepositoryWriteFence(repository,token);return {pending:transport.query({...proofs,request:handle.request})};});return sent.pending;
 }
 async cancelHistoricalRecovery(handle,proofs,observation,status,transport,isCurrent){
  proofs=this.#recoveryProofs(proofs);
  this.#recoveryObservation(handle,observation,status);
  if(!['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(observation.state)||observation.providerEvidenceRecorded!==false||clientReservationTransportOrigin(transport)!==handle.origin||typeof isCurrent!=='function')fail('OUTCOME_UNKNOWN');
  const sent=await this.read(async t=>{const repository=this.s.repository,token=observeRepositoryWriteFence(repository);await this.#recoveryCurrent(t,handle);if(isCurrent()!==true||this.s.repository!==repository)fail('CANCELLED');requireRepositoryWriteFence(repository,token);return {pending:transport.cancel({...proofs,request:handle.request})};});return sent.pending;
 }
 async reconcileHistoricalRecovery(handle,observation,status,{cancellation=null,reservations=null,isCurrent}={}){
  this.#recoveryObservation(handle,observation,status);if(typeof isCurrent!=='function')fail('UNAVAILABLE');
  const settled=observation.state==='SETTLED',cancelled=['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(observation.state)&&observation.providerEvidenceRecorded===false;
  if(!settled&&!cancelled)fail('OUTCOME_UNKNOWN');
  if(cancelled){const ack=observedClientReservation(cancellation,reservations);if(!ack||ack.action!=='cancel'||ack.origin!==handle.origin||!equal(ack.request,handle.request)||ack.reservationMicros!==observation.reservationMicros||Object.hasOwn(cancellation,'window')&&!equal(cancellation.window,observation.window)||cancellation.state!=='CANCELLED_BEFORE_DISPATCH')fail('OUTCOME_UNKNOWN');}
  const result=await this.write(async t=>{
   const saved=await this.#recoveryCurrent(t,handle);if(isCurrent()!==true)fail('CANCELLED');
   const job=structuredClone(saved.job),prior=saved.attempt;
   const incoming=settled?{state:'SETTLED',receiptId:observation.financialSettlement.receiptId,outcome:observation.financialSettlement.outcome,settledSpendMicros:observation.financialSettlement.usdMicros,effectiveResults:0}:null;
   if(job.state==='COMMITTED'||prior?.financialCancellation||prior?.financialSettlement&&!equal(prior.financialSettlement,incoming)||prior?.financialSettlementEvidence&&!equal(prior.financialSettlementEvidence,observation.financialSettlement))fail('RESULT_CONFLICT');
   // A local cancelled domain event can predate knowing whether the service
   // accepted work. Keep that immutable event; enrich only its financial row.
   const previousDomain=job.domainResultReceipt??null;
   if(previousDomain&&(job.state!=='CANCELLED_BEFORE_DISPATCH'||previousDomain.outcome!=='FAILED'))fail('RESULT_CONFLICT');
   const row=prior?structuredClone(prior):{id:receiptId(handle.request.operationId),kind:KIND,version:1,jobId:job.id,childId:handle.request.operationId,parentReservationId:job.id,executionKind:'server-backed',sequence:0,windowIds:[],attemptCount:0,effectiveResultCount:0,financialRequest:structuredClone(handle.request),serviceOrigin:handle.origin};
   row.state=previousDomain?job.state:settled?'EXPIRED_UNCOMMITTED':'CANCELLED_BEFORE_DISPATCH';row.stateKey=1;row.effectiveResultCount=0;
   if(settled){
    const f=observation.financialSettlement;row.attemptCount=1;row.operationReceiptId=f.receiptId;row.financialSettlement=structuredClone(incoming);row.financialSettlementEvidence=structuredClone(f);row.spendState='SETTLED_SERVICE';
   }else{row.attemptCount=prior?.attemptCount??(saved.dispatch?1:0);row.financialCancellation=true;row.financialCancellationEvidence=structuredClone(cancellation);row.spendState='RELEASED_SERVICE_BEFORE_DISPATCH';}
   await t.put('organizerUsage',row);
   if(previousDomain){await savedDomainResultReceipt(t,job);await t.put('organizerJobs',job);}
   else{job.cancelEpoch++;job.state=row.state;job.stateKey=1;await this.#putJob(t,job);}
   const finalMeta=await t.get('meta',HISTORICAL_FLIGHT),finalJob=await this.job(t,job.id);
   if(!equal(finalMeta,saved.meta)||!equal(finalJob,job))fail('RESULT_CONFLICT');if(isCurrent()!==true)fail('CANCELLED');return safeJob(job);
  });
  this.#historicalRecovery.delete(handle);return result;
 }
 // Organize recovery captures the complete ORIGINAL sibling set. It authorizes
 // authenticated financial metadata only, never body recovery or dispatch.
 async #organizeRecoverySnapshot(t,origin,topicId){
  const meta=await t.get('meta','aiu:organize-service-preflight:v1:'+topicId);if(!meta)return null;
  exact(meta,['id','version','jobId','origin','organizeRequestKey','requests']);
  const job=await this.job(t,meta.jobId);await this.#resultAuthority(t,job);
  if(meta.version!==1||meta.origin!==origin||job.type!=='AI_ORGANIZE'||!token(meta.organizeRequestKey)||job.organizeRequestKey!==meta.organizeRequestKey||job.coverage.some(u=>u.scope!==topicId)||!Array.isArray(meta.requests)||meta.requests.length!==job.childIds.length)fail('RESULT_BINDING_MISMATCH');
  const rows=[],dispatches=[];
  for(const [i,childId]of job.childIds.entries()){
   const request=clientDeclarationRequestData(meta.requests[i]);this.#assertServerBinding(job,i,{request});
   const row=await t.get('organizerUsage',receiptId(childId)),dispatch=await t.get('meta',dispatchFenceId(childId));
   if(row&&(row.executionKind!=='server-backed'||row.jobId!==job.id||row.childId!==childId||row.sequence!==i||![0,1].includes(row.attemptCount)||row.serviceOrigin!==origin||!equal(row.financialRequest,request))||dispatch&&!equal(dispatch,{id:dispatchFenceId(childId),version:1,jobId:job.id,childId}))fail('RESULT_BINDING_MISMATCH');
   rows.push(row??null);dispatches.push(dispatch??null);
  }
  const flight=await t.get('meta',job.flightId);if(flight?.jobId!==job.id)fail('RESULT_BINDING_MISMATCH');return {meta,job,rows,dispatches,flight};
 }
 async organizeRecovery(origin,topicId){
  if(!opaque(topicId))fail();const saved=await this.read(t=>this.#organizeRecoverySnapshot(t,origin,topicId));if(!saved)return null;
  const closed=terminal.has(saved.job.state)&&await this.read(t=>savedDomainResultReceipt(t,saved.job))&&saved.rows.every(r=>r?.financialSettlement?.state==='SETTLED'||savedFinancialCancellation(r));
  if(closed)return {closed:true,jobId:saved.job.id,state:saved.job.state};
  const handle=freezeData({jobId:saved.job.id,origin,topicId,requests:structuredClone(saved.meta.requests)});this.#organizeRecovery.set(handle,saved);return handle;
 }
 async #organizeRecoveryCurrent(t,handle){
  const saved=this.#organizeRecovery.get(handle);if(!saved)fail('UNAVAILABLE');
  const current=await this.#organizeRecoverySnapshot(t,handle.origin,handle.topicId);if(!equal(current,saved))fail('RESULT_CONFLICT');return saved;
 }
 async queryOrganizeRecovery(handle,index,proofs,transport,isCurrent){
  proofs=this.#recoveryProofs(proofs);if(!this.#organizeRecovery.has(handle)||!integer(index)||index>=handle.requests.length||typeof isCurrent!=='function'||clientOperationStatusTransportOrigin(transport)!==handle.origin)fail('UNAVAILABLE');
  const sent=await this.read(async t=>{const repository=this.s.repository,token=observeRepositoryWriteFence(repository);await this.#organizeRecoveryCurrent(t,handle);if(isCurrent()!==true||this.s.repository!==repository)fail('CANCELLED');requireRepositoryWriteFence(repository,token);return {pending:transport.query({request:handle.requests[index],...proofs})};});return sent.pending;
 }
 #organizeObservation(handle,index,observation,status){
  const observed=observedClientOperationStatus(observation,status);if(!this.#organizeRecovery.has(handle)||!observed||observed.origin!==handle.origin||clientOperationStatusTransportOrigin(status)!==handle.origin||!equal(observed.request,handle.requests[index]))fail('RESULT_BINDING_MISMATCH');return observed;
 }
 async cancelOrganizeRecovery(handle,index,proofs,observation,status,reservations,isCurrent){
  proofs=this.#recoveryProofs(proofs);this.#organizeObservation(handle,index,observation,status);
  if(!['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(observation.state)||observation.providerEvidenceRecorded!==false||clientReservationTransportOrigin(reservations)!==handle.origin||typeof isCurrent!=='function')fail('OUTCOME_UNKNOWN');
  const sent=await this.read(async t=>{const repository=this.s.repository,token=observeRepositoryWriteFence(repository);await this.#organizeRecoveryCurrent(t,handle);if(isCurrent()!==true||this.s.repository!==repository)fail('CANCELLED');requireRepositoryWriteFence(repository,token);return {pending:reservations.cancel({request:handle.requests[index],...proofs})};});return sent.pending;
 }
 async reconcileOrganizeRecovery(handle,observations,status,{cancellations,reservations,isCurrent}={}){
  if(!this.#organizeRecovery.has(handle)||!Array.isArray(observations)||observations.length!==handle.requests.length||!Array.isArray(cancellations)||cancellations.length!==observations.length||typeof isCurrent!=='function')fail('UNAVAILABLE');
  for(const [i,o]of observations.entries()){
   this.#organizeObservation(handle,i,o,status);if(o.state==='SETTLED')continue;
   const ack=observedClientReservation(cancellations[i],reservations);
   if(!['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(o.state)||o.providerEvidenceRecorded!==false||!ack||ack.action!=='cancel'||ack.origin!==handle.origin||!equal(ack.request,handle.requests[i])||cancellations[i].state!=='CANCELLED_BEFORE_DISPATCH'||cancellations[i].reservationMicros!==o.reservationMicros||Object.hasOwn(cancellations[i],'window')&&!equal(cancellations[i].window,o.window))fail('OUTCOME_UNKNOWN');
  }
  const result=await this.write(async t=>{
   const saved=await this.#organizeRecoveryCurrent(t,handle);if(isCurrent()!==true)fail('CANCELLED');const job=structuredClone(saved.job),previous=job.domainResultReceipt??null;
   if(job.state==='COMMITTED')fail('RESULT_CONFLICT');if(previous&&previous.outcome!=='FAILED')fail('RESULT_CONFLICT');const finalRows=[];
   for(const [i,o]of observations.entries()){
    const before=saved.rows[i],request=handle.requests[i],settled=o.state==='SETTLED',financial=settled?{state:'SETTLED',receiptId:o.financialSettlement.receiptId,outcome:o.financialSettlement.outcome,settledSpendMicros:o.financialSettlement.usdMicros,effectiveResults:0}:null;
    if(before?.financialSettlement&&!equal(before.financialSettlement,financial)||settled&&before?.financialCancellation||before?.financialSettlementEvidence&&!equal(before.financialSettlementEvidence,o.financialSettlement))fail('RESULT_CONFLICT');
    const row=before?structuredClone(before):{id:receiptId(request.operationId),kind:KIND,version:1,jobId:job.id,childId:request.operationId,parentReservationId:job.id,executionKind:'server-backed',sequence:i,windowIds:[],attemptCount:0,effectiveResultCount:0,financialRequest:structuredClone(request),serviceOrigin:handle.origin};
    row.state=previous?previous.children[i].state:settled?'EXPIRED_UNCOMMITTED':'CANCELLED_BEFORE_DISPATCH';row.stateKey=1;row.effectiveResultCount=0;
    if(settled){row.attemptCount=1;row.operationReceiptId=financial.receiptId;row.financialSettlement=financial;row.financialSettlementEvidence=structuredClone(o.financialSettlement);row.spendState='SETTLED_SERVICE';}
    else{row.attemptCount=before?.attemptCount??(saved.dispatches[i]?1:0);row.financialCancellation=true;row.financialCancellationEvidence=structuredClone(cancellations[i]);row.spendState='RELEASED_SERVICE_BEFORE_DISPATCH';}
    await t.put('organizerUsage',row);finalRows.push(row);
   }
   if(previous){await savedDomainResultReceipt(t,job);await t.put('organizerJobs',job);}
   else{job.cancelEpoch++;job.state=observations.some(o=>o.state==='SETTLED')?'EXPIRED_UNCOMMITTED':'CANCELLED_BEFORE_DISPATCH';job.stateKey=1;await this.#putJob(t,job);}
   await this.#resultAuthority(t,job);
   for(const row of finalRows)if(!equal(await t.get('organizerUsage',row.id),row))fail('RESULT_CONFLICT');
   if(!equal(await t.get('meta',saved.meta.id),saved.meta)||!equal(await this.job(t,job.id),job)||!equal(await t.get('meta',job.flightId),saved.flight)||isCurrent()!==true)fail('RESULT_CONFLICT');return safeJob(job);
  });this.#organizeRecovery.delete(handle);return result;
 }
 async cancelServer(id){
  await this.cancel(id);
  const candidates=await this.read(async t=>{const job=await this.job(t,id),rows=[];for(const childId of job.childIds){const row=await t.get('organizerUsage',receiptId(childId));if(row?.executionKind==='server-backed'&&row.state==='CANCELLED_BEFORE_DISPATCH'&&row.attemptCount===0&&!row.financialCancellation)rows.push(row);}return rows;});
  for(const before of candidates){const provider=this.#serverProviders.get(before.childId)?.deref();if(!provider)continue;const response=await provider.cancelReservation(),observed=provider.cancellation(response);if(!observed||!equal(observed.request,before.financialRequest)||observed.origin!==before.serviceOrigin)continue;
   await this.write(async t=>{const row=await t.get('organizerUsage',before.id);if(!equal(row,before))fail('RESULT_CONFLICT');await t.put('organizerUsage',{...row,financialCancellation:true,financialCancellationEvidence:structuredClone(response),spendState:'RELEASED_SERVICE_BEFORE_DISPATCH'});});
   this.#serverProviders.delete(before.childId);qwenFoundationProviderData(provider).retire();
  }
  return this.status(id);
 }
 async job(t,id){const job=await t.get('organizerJobs',id);if(!knownJob(job))fail();if(!validOrganizeRequestKey(job))fail('RESULT_BINDING_MISMATCH');return job;}
 async status(id){if(!opaque(id))fail();return this.read(async t=>{const job=await this.job(t,id),attempts=[];for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(receipt)attempts.push(receipt);}return {...safeJob(job),attempts};});}
 async serverRequest(id,childId,bounds){
  const b=snapshotData(bounds,{maxBytes:256,maxKeys:3,maxDepth:1,maxString:40});
  if(!exactData(b,['inputTokens','outputCap','maxCompletionTokens'])||!Object.values(b).every(integer))fail();
  return this.read(async t=>{const j=await this.job(t,id);await this.current(t,j);const index=j.childIds.indexOf(childId);
   if(index<0||!opaque(j.scopeFingerprint))fail('UNAVAILABLE');
   return {operationId:childId,jobId:id,...Object.fromEntries(['principalId','libraryId','consentEpoch'].map(k=>[k,j.authority[k]])),scopeFingerprint:j.scopeFingerprint,contractVersion:j.contractVersion,routeVersion:j.routeVersion,jobType:j.type,childIndex:index,childCount:j.childIds.length,...b};
  });
 }
 #assertServerBinding(job,index,data){
  const r=data?.request;if(!r||r.operationId!==job.childIds[index]||r.jobId!==job.id||r.jobType!==job.type||r.childIndex!==index||r.childCount!==job.childIds.length||r.scopeFingerprint!==job.scopeFingerprint||r.contractVersion!==job.contractVersion||r.routeVersion!==job.routeVersion||['principalId','libraryId','consentEpoch'].some(k=>r[k]!==job.authority[k]))fail('RESULT_BINDING_MISMATCH');
 }
 async reserveServer(id,providers){
  if(!opaque(id)||!Array.isArray(providers)||!providers.length||providers.length>4)fail('UNAVAILABLE');
  const captured=[...providers],data=captured.map(p=>qwenFoundationProviderData(p));if(data.some(d=>!d)||new Set(data.map(d=>d.origin)).size!==1)fail('UNAVAILABLE');
  const result=await this.write(async t=>{const job=await this.job(t,id);await this.current(t,job);
   if(job.state!=='PLANNED'||job.committedCoverage.length||job.childIds.length!==data.length)fail('UNAVAILABLE');
   for(let i=0;i<data.length;i++){this.#assertServerBinding(job,i,data[i]);data[i].current();const childId=job.childIds[i];
    if(await t.get('organizerUsage',receiptId(childId))||await t.get('meta',dispatchFenceId(childId)))fail('OUTCOME_UNKNOWN');
    await t.put('organizerUsage',{id:receiptId(childId),kind:KIND,version:1,jobId:id,childId,parentReservationId:id,executionKind:'server-backed',sequence:i,state:'RESERVED',stateKey:0,windowIds:[],attemptCount:0,spendState:'RESERVED_SERVICE',effectiveResultCount:0,financialRequest:structuredClone(data[i].request),serviceOrigin:data[i].origin});
   }
   job.state='RESERVED';await this.#putJob(t,job);await this.current(t,job);for(const d of data)d.current();return safeJob(job);
  });
  // Unsent cancellation handles never keep disposed private owners alive.
  for(const [id,ref] of this.#serverProviders){const p=ref.deref();if(!p)this.#serverProviders.delete(id);}
  for(let i=0;i<data.length;i++)this.#serverProviders.set(data[i].request.operationId,new WeakRef(captured[i]));return result;
 }
 async reserve(id,{reservationId,executionKind='fixture'}={}){
  if(!opaque(id)||!opaque(reservationId)||!['fixture','local'].includes(executionKind))fail('UNAVAILABLE');
  return this.write(async t=>{const job=await this.job(t,id);await this.current(t,job);if(job.state!=='PLANNED')return safeJob(job);
   for(let index=0;index<job.childIds.length;index++){const childId=job.childIds[index],existing=await t.get('organizerUsage',receiptId(childId)),covered=isPrivateResultJob(job)?job.resultCommitted===true:job.childCoverage[index].every(u=>job.committedCoverage.includes(unitKey(u)));if(covered&&existing?.state==='COMMITTED')continue;if(await t.get('meta',dispatchFenceId(childId)))fail('OUTCOME_UNKNOWN');if(existing&&(existing.attemptCount!==0||existing.state!=='PLANNED'||existing.executionKind!=='local'))fail('OUTCOME_UNKNOWN');await t.put('organizerUsage',{id:receiptId(childId),kind:KIND,version:1,jobId:id,childId,parentReservationId:reservationId,executionKind,sequence:index,state:covered?'COMMITTED':'RESERVED',stateKey:covered?1:0,windowIds:[],attemptCount:0,spendState:covered?'NO_PROVIDER_COST':'RESERVED_UNPRICED',effectiveResultCount:0});}
   job.state='RESERVED';await this.#putJob(t,job);return safeJob(job);
  });
 }
 childRequest(job,index){
   const id=job.id,childId=job.childIds[index];if(!childId)fail();
   const coverage=job.childCoverage[index].filter(u=>!job.committedCoverage.includes(unitKey(u))),items=new Map();
   for(const item of job.items){if(items.has(item.key))fail();items.set(item.key,item);}
   const evidence=[...new Set(coverage.map(u=>u.key))].map(key=>{const item=items.get(key);if(!item)fail();return {key:item.key,signature:item.signature,lineage:item.descriptor.lineage};});
   return {...(isAssistResultJob(job)?{replyObligation:structuredClone(job.replyObligation)}:isHistoricalCandidateJob(job)?{candidateObligation:structuredClone(job.candidateObligation)}:{}),...(job.organizeStyle?{organizeStyle:styleSemantics(job.organizeStyle),organizeSemanticKey:job.organizeSemanticKey}:{}),logicalJobId:id,childOperationId:childId,type:job.type,contractVersion:job.contractVersion,routeVersion:job.routeVersion,coverage,evidence,automaticRetries:0};
 }
 async dispatch(id,childId,provider,execution=null){
  const server=qwenFoundationProviderData(provider),descriptor=server?provider.describe():localProviderDescriptor(provider);if(execution!==null){exact(execution,['signal','timeoutMs']);if(!(execution.signal instanceof AbortSignal)||!integer(execution.timeoutMs)||execution.timeoutMs!==this.s.organizerBudget.limits.timeoutMs)fail();execution=Object.freeze({signal:execution.signal,timeoutMs:execution.timeoutMs});}
  const prepared=await this.write(async t=>{const job=await this.job(t,id);await this.current(t,job);const index=job.childIds.indexOf(childId),receipt=await t.get('organizerUsage',receiptId(childId));
   if(index<0||!receipt||receipt.jobId!==id||execution!==null&&!isHistoricalCandidateJob(job)&&job.type!=='AI_ORGANIZE')fail();
   if(terminal.has(job.state))return {reused:true,state:job.state,childId};
   if((await t.get('meta',job.flightId))?.jobId!==id)fail('REQUEST_ALREADY_IN_FLIGHT');
   if(receipt.state!=='RESERVED')return {reused:true,state:receipt.state,childId};
   if(receipt.executionKind!==descriptor.executionKind)fail('UNAVAILABLE');
   if(server){this.#assertServerBinding(job,index,server);if(this.#serverProviders.get(childId)?.deref()!==provider||!equal(receipt.financialRequest,server.request)||receipt.serviceOrigin!==server.origin)fail('UNAVAILABLE');server.current();}
   if(await t.get('meta',dispatchFenceId(childId)))fail('OUTCOME_UNKNOWN');
   // Qualification above still covers the entire job. Only the outgoing child
   // metadata is narrowed, with an exact, unambiguous key closure before writes.
   const request=this.childRequest(job,index);
   // Minimal nonportable anti-replay fence survives supported library replace,
   // which intentionally clears old transient job/usage rows. It is not a
   // second financial ledger and never grants admission.
   await t.put('meta',{id:dispatchFenceId(childId),version:1,jobId:id,childId});await t.put('meta',{id:job.flightId,jobId:id,dispatched:true});
   receipt.state='DISPATCHED';receipt.attemptCount=1;receipt.provider=descriptor;receipt.spendState='POSSIBLY_BILLABLE';await t.put('organizerUsage',receipt);job.state='DISPATCHED';await this.#putJob(t,job);await count(t,'physicalAttempt');
   return {request};
  });
  if(prepared.reused)return prepared;
  // Bounded body assembly remains with current source gateways and qualified
  // feature owners. Server-backed providers accept only their private Qwen
  // binding; no durable prompt/response handoff or provider replay is created.
  let response;try{
  try{response=await (execution===null?provider.execute(Object.freeze(structuredClone(prepared.request))):historicalExecution(provider,Object.freeze(structuredClone(prepared.request)),execution));}catch{await this.markUnknown(id,childId);return {state:'OUTCOME_UNKNOWN',childId};}
  const recorded=await this.write(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));
   if(server){
    const observed=qwenFoundationResponse(provider,response);if(!receipt||receipt.executionKind!=='server-backed'||!equal(receipt.financialRequest,server.request))fail('RESULT_BINDING_MISMATCH');
    if(observed){
     if(!equal(observed.request,receipt.financialRequest)||observed.origin!==receipt.serviceOrigin)fail('RESULT_BINDING_MISMATCH');
     if(receipt.financialSettlement&&!equal(receipt.financialSettlement,observed.financialSettlement))fail('RESULT_CONFLICT');
     receipt.financialSettlement=structuredClone(observed.financialSettlement);receipt.operationReceiptId=observed.financialSettlement.receiptId;receipt.spendState='SETTLED_SERVICE';
     let live=job.cancelEpoch===0;try{await this.current(t,job);if(execution?.signal.aborted)fail('CANCELLED');server.contentCurrent();}catch{live=false;}
     receipt.state=live&&receipt.state==='DISPATCHED'?observed.localOutcome:'EXPIRED_UNCOMMITTED';receipt.stateKey=terminal.has(receipt.state)?1:0;
    }else{receipt.state='OUTCOME_UNKNOWN';receipt.spendState='RESERVATION_RETAINED';}
    await t.put('organizerUsage',receipt);await this.aggregate(t,job);await this.#putJob(t,job);
    return {state:receipt.state,childId};
   }
   if(!receipt||receipt.state!=='DISPATCHED')return {state:receipt?.state||'OUTCOME_UNKNOWN',childId};
   // Never persist arbitrary provider response/error fields.
   if(response?.accepted!==true||!opaque(response.operationReceiptId)){receipt.state='OUTCOME_UNKNOWN';receipt.spendState='RESERVATION_RETAINED';}
   else{receipt.state='RESPONSE_RECORDED';receipt.operationReceiptId=response.operationReceiptId;receipt.spendState='UNSETTLED';}
   await t.put('organizerUsage',receipt);job.state=receipt.state;await this.aggregate(t,job);await this.#putJob(t,job);return {state:receipt.state,childId};
  });
  if(server&&recorded.state==='RESPONSE_RECORDED'&&response.accepted===true){
   // The write promise itself can yield after its transaction callback. Check
   // the original content-only owner at the actual publication boundary, after
   // ALL awaits. Successful publication and private retirement are synchronous.
   try{server.contentCurrent();if(execution?.signal.aborted)fail('CANCELLED');}catch{
    response=null;
    return await this.write(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));
     if(receipt?.state==='RESPONSE_RECORDED'&&receipt.financialSettlement){receipt.state='EXPIRED_UNCOMMITTED';receipt.stateKey=1;await t.put('organizerUsage',receipt);await this.aggregate(t,job);await this.#putJob(t,job);}
     return {state:receipt?.state??'OUTCOME_UNKNOWN',childId};
    });
   }
   return {...recorded,value:response.value};
  }
  return recorded;
  }finally{response=null;if(server){this.#serverProviders.delete(childId);server.retire();}}
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
  else if(isPrivateResultJob(job)?job.resultCommitted===true:job.coverage.every(u=>job.committedCoverage.includes(unitKey(u))))job.state='COMMITTED';
  else if(states.has('EXPIRED_UNCOMMITTED')||job.cancelEpoch&&receipts.some(r=>r.attemptCount))job.state='EXPIRED_UNCOMMITTED';
  else if(states.has('REJECTED'))job.state='REJECTED';
  else job.state='CANCELLED_BEFORE_DISPATCH';
  job.stateKey=terminal.has(job.state)?1:0;return job;
 }
 async markUnknown(id,childId){return this.write(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));if(!receipt||receipt.jobId!==id||!['DISPATCHED','OUTCOME_UNKNOWN'].includes(receipt.state))fail();receipt.state='OUTCOME_UNKNOWN';receipt.spendState='RESERVATION_RETAINED';job.state='OUTCOME_UNKNOWN';await t.put('organizerUsage',receipt);await this.#putJob(t,job);return safeJob(job);});}
 async reconcileInterrupted(id){return this.write(async t=>{const job=await this.job(t,id);let unknown=false;for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(receipt?.state==='DISPATCHED'){receipt.state='OUTCOME_UNKNOWN';receipt.spendState='RESERVATION_RETAINED';await t.put('organizerUsage',receipt);unknown=true;}}if(unknown){job.state='OUTCOME_UNKNOWN';await this.#putJob(t,job);}return safeJob(job);});}
 async cancel(id,{beforeDispatchOnly=false}={}){if(typeof beforeDispatchOnly!=='boolean')fail();const result=await this.write(async t=>{
  const job=await this.job(t,id);
  // A rejected preflight may release only its still-unsent plan. Qualify in
  // this transaction so a racing sent sibling retains its original identity.
  if(beforeDispatchOnly){if(!['PLANNED','RESERVED'].includes(job.state))return safeJob(job);for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(await t.get('meta',dispatchFenceId(childId))||receipt&&(receipt.attemptCount!==0||receipt.state!=='RESERVED'))return safeJob(job);}}
  return this.#cancelInTransaction(t,job);
 });
  if(result.cancelEpoch>0)for(const childId of result.childIds){const provider=this.#serverProviders.get(childId)?.deref();if(provider)qwenFoundationProviderData(provider).retireContent();}
  return result;
 }
 async #cancelInTransaction(t,job){if(terminal.has(job.state))return safeJob(job);job.cancelEpoch++;let dispatched=false,unknown=false;
  for(const childId of job.childIds){const receipt=await t.get('organizerUsage',receiptId(childId));if(!receipt)continue;if(receipt.attemptCount){dispatched=true;if(['DISPATCHED','OUTCOME_UNKNOWN'].includes(receipt.state)){receipt.state='OUTCOME_UNKNOWN';unknown=true;}else if(receipt.state!=='COMMITTED'){receipt.state='EXPIRED_UNCOMMITTED';receipt.stateKey=1;}receipt.spendState=receipt.financialSettlement?.state==='SETTLED'?'SETTLED_SERVICE':'RESERVATION_RETAINED';}else{receipt.state='CANCELLED_BEFORE_DISPATCH';receipt.stateKey=1;receipt.spendState='RELEASED_BEFORE_DISPATCH';}await t.put('organizerUsage',receipt);}
  job.state=unknown?'OUTCOME_UNKNOWN':dispatched?'EXPIRED_UNCOMMITTED':'CANCELLED_BEFORE_DISPATCH';job.stateKey=unknown?0:1;await this.#putJob(t,job);return safeJob(job);
 }
 async reconcileOutcome(id,childId,proof){
  if(typeof this.verifyOutcome!=='function')fail('UNAVAILABLE');
  const saved=await this.read(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));if(!job.childIds.includes(childId)||!receipt||receipt.jobId!==id||receipt.state!=='OUTCOME_UNKNOWN')fail();if(receipt.executionKind==='server-backed')fail('UNAVAILABLE');return receipt;});
  // Verification may query a future trusted service, outside IndexedDB. It
  // cannot dispatch, mint a replacement child or return/persist content.
  const binding={logicalJobId:id,childOperationId:childId,parentReservationId:saved.parentReservationId};
  const result=structuredClone(await this.verifyOutcome(Object.freeze(binding),proof));exact(result,['binding','outcome','operationReceiptId']);
  if(!equal(result.binding,binding)||!['ACCEPTED','NOT_ACCEPTED'].includes(result.outcome)||!opaque(result.operationReceiptId))fail('UNAVAILABLE');
  return this.write(async t=>{const job=await this.job(t,id),receipt=await t.get('organizerUsage',receiptId(childId));if(!equal(receipt,saved))fail('STALE_BASE');
   receipt.operationReceiptId=result.operationReceiptId;receipt.outcomeProof=result.outcome;
   receipt.state=result.outcome==='NOT_ACCEPTED'?'REJECTED':job.cancelEpoch?'EXPIRED_UNCOMMITTED':'RESPONSE_RECORDED';receipt.stateKey=['REJECTED','EXPIRED_UNCOMMITTED'].includes(receipt.state)?1:0;
   receipt.spendState=result.outcome==='NOT_ACCEPTED'?'RELEASED_VERIFIED_NOT_ACCEPTED':'UNSETTLED';await t.put('organizerUsage',receipt);
   job.state=receipt.state;await this.aggregate(t,job);job.stateKey=terminal.has(job.state)?1:0;await this.#putJob(t,job);return safeJob(job);
  });
 }

 // Local mapping refusal is not a physical response or an effective result.
 // Only the constructor-local host supplies the final owner/signal fence.
 async deferMaintenanceBeforeDispatch(id,request={},owner=null){
  if(!opaque(id))fail();exact(request,['groups']);const groups=structuredClone(request.groups);exact(owner,['signal','isCurrent','plan'],['signal','isCurrent']);
  if(!(owner.signal instanceof AbortSignal)||typeof owner.isCurrent!=='function')fail('UNAVAILABLE');
  const assertOwner=()=>{if(owner.signal.aborted||owner.isCurrent()!==true)fail('CANCELLED');};assertOwner();
  if(!Array.isArray(groups)||!groups.length||groups.length>6)fail();
  const result=await this.write(async t=>{
   const abort=()=>{try{t.tx.abort();}catch{}};owner.signal.addEventListener('abort',abort,{once:true});
   const cleanup=()=>owner.signal.removeEventListener('abort',abort);t.tx.addEventListener('complete',cleanup,{once:true});t.tx.addEventListener('abort',cleanup,{once:true});
   assertOwner();const job=await this.job(t,id);await this.current(t,job);assertOwner();
   if(job.kind!==KIND||job.version!==1||job.type!=='AI_MAINTENANCE'||job.state!=='PLANNED'||job.cancelEpoch!==0||job.committedCoverage.length!==0||job.childIds.length>2||(await t.get('meta',job.flightId))?.jobId!==id)fail();assertOwner();
   for(const childId of job.childIds){if(await t.get('meta',dispatchFenceId(childId))||await t.get('organizerUsage',receiptId(childId)))fail('OUTCOME_UNKNOWN');assertOwner();}
   let unsupported=unsupportedMaintenanceCoverage(job.items,job.coverage);const all=[],seen=new Set();
   if(this.#qualifyMaintenanceEntries){
    const admitted=await this.#qualifyMaintenanceEntries(t,structuredClone({items:job.items,coverage:job.coverage}));assertOwner();
    if(!Array.isArray(admitted))fail();
    if(admitted.length){const checked=validateCoverage(admitted,job.type);
     if(checked.some(u=>!['topic','context'].includes(u.facet)||!unsupported.some(v=>equal(u,v))||job.items.find(i=>i.key===u.key)?.descriptor.kind!=='library_entry'))fail();
     unsupported=unsupported.filter(u=>!checked.some(v=>equal(u,v)));
    }
   }
   if(this.#qualifyMaintenancePlacements){
    const admitted=await this.#qualifyMaintenancePlacements(t,structuredClone({items:job.items,coverage:job.coverage}));assertOwner();if(!Array.isArray(admitted))fail();
    if(admitted.length){const checked=validateCoverage(admitted,job.type);
     if(checked.some(u=>u.facet!=='context'||!unsupported.some(v=>equal(u,v))||job.items.find(i=>i.key===u.key)?.descriptor.kind!=='placement'))fail();
     unsupported=unsupported.filter(u=>!checked.some(v=>equal(u,v)));
    }
   }
   if(this.#qualifyMaintenanceStructures){
    const admitted=await this.#qualifyMaintenanceStructures(t,structuredClone({items:job.items,coverage:job.coverage}));assertOwner();if(!Array.isArray(admitted))fail();
    if(admitted.length){const checked=validateCoverage(admitted,job.type);
     if(checked.some(u=>!(u.facet==='context'||u.facet==='topic'&&job.items.find(i=>i.key===u.key)?.descriptor.kind==='topic')||!unsupported.some(v=>equal(u,v))||!['section','topic'].includes(job.items.find(i=>i.key===u.key)?.descriptor.kind)))fail();
     unsupported=unsupported.filter(u=>!checked.some(v=>equal(u,v)));
    }
   }
   if(this.#qualifyMaintenanceContextEdits){
    const admitted=await this.#qualifyMaintenanceContextEdits(t,structuredClone({items:job.items,coverage:job.coverage}));assertOwner();if(!Array.isArray(admitted))fail();
    if(admitted.length){const checked=validateCoverage(admitted,job.type);
     if(checked.some(u=>u.facet!=='context'||!unsupported.some(v=>equal(u,v))||job.items.find(i=>i.key===u.key)?.descriptor.kind!=='context_item'))fail();
     unsupported=unsupported.filter(u=>!checked.some(v=>equal(u,v)));
    }
   }
   for(const group of groups){exact(group,['childId','facet','units','retryCondition']);const index=job.childIds.indexOf(group.childId),key=canonical([group.childId,group.facet]);
    if(index<0||seen.has(key)||group.retryCondition!==({topic:'TOPIC_MAPPING_UNAVAILABLE',context:'CONTEXT_MAPPING_UNAVAILABLE',filter:'FILTER_OWNER_UNAVAILABLE'})[group.facet])fail();seen.add(key);
    const units=validateCoverage(group.units,job.type);if(units.some(u=>u.facet!==group.facet||!job.childCoverage[index].some(v=>equal(u,v))))fail();all.push(...units);
   }
   if(!unsupported.length||!equal(all.map(unitKey).sort(),unsupported.map(unitKey).sort()))fail();
   const pool=await t.primaryRangePage('organizerWorkItems',{prefix:'aiu:defer:',limit:100});assertOwner();
   if(pool.next!==null||pool.rows.length+all.length>100){
    // A capacity race may only close this Foundation instance's own fresh
    // never-dispatched plan. A caller DTO cannot forge that cleanup identity.
    if(this.#createdMaintenancePlans.get(owner.plan)!==canonical({id,authority:job.authority,coverage:job.coverage,childIds:job.childIds}))fail('DEFER_SCAN_BOUND');
    await this.current(t,job);assertOwner();const closed=await this.#cancelInTransaction(t,job);
    await this.current(t,job,{allowCancelled:true});assertOwner();return {...closed,deferredUnits:0,reason:'DEFER_SCAN_BOUND'};
   }
   for(const group of groups){await this.applyFacet(t,job,job.childIds.indexOf(group.childId),{facet:group.facet,units:group.units,outcome:'DEFER',retryCondition:group.retryCondition});assertOwner();}
   await this.current(t,job);assertOwner();
   const result=await this.#cancelInTransaction(t,job);
   await this.current(t,job,{allowCancelled:true});assertOwner();return {...result,deferredUnits:all.length};
  });
  if(owner.plan)this.#createdMaintenancePlans.delete(owner.plan);return result;
 }
 async resolveLocal(id,{facet,units}={}){
  units=structuredClone(units);
  // Validate and commit one local subset atomically. An unresolved sibling (or
  // the remainder of this same child) is still PLANNED and can be reserved once.
  return this.write(async t=>{const job=await this.job(t,id);if(atomicJob(job)||isPrivateResultJob(job))fail();await this.current(t,job);const validated=validateCoverage(units,job.type),index=job.childCoverage.findIndex(c=>validated.every(u=>u.facet===facet&&c.some(v=>unitKey(u)===unitKey(v))));if(index<0)fail();
   const remaining=validated.filter(u=>!job.committedCoverage.includes(unitKey(u)));if(!remaining.length)return safeJob(job);if(terminal.has(job.state))fail('CANCELLED');
   const childId=job.childIds[index],prior=await t.get('organizerUsage',receiptId(childId));if(prior&&(prior.executionKind!=='local'||prior.attemptCount!==0||prior.state!=='PLANNED'))fail();
   if(!prior)await t.put('organizerUsage',{id:receiptId(childId),kind:KIND,version:1,jobId:id,childId,parentReservationId:'local-no-cost',executionKind:'local',sequence:index,state:'PLANNED',stateKey:0,windowIds:[],attemptCount:0,spendState:'NO_PROVIDER_COST',effectiveResultCount:0});
   return this.applyFacet(t,job,index,{facet,units:validated,outcome:'NO_CHANGE',local:true});
  });
 }
 // Multiple checked local facets publish together. The constructor-owned
 // committers still prove each exact subset; no provider result is synthesized.
 async resolveLocalSubset(id,{units}={}){
  units=structuredClone(units);
  return this.write(async t=>{const job=await this.job(t,id);if(job.kind!==KIND||job.type!=='AI_MAINTENANCE')fail();await this.current(t,job);const validated=validateCoverage(units,job.type);
   if(validated.some(u=>!job.coverage.some(v=>equal(u,v))))fail();
   const remaining=validated.filter(u=>!job.committedCoverage.includes(unitKey(u)));if(!remaining.length)return safeJob(job);if(terminal.has(job.state))fail('CANCELLED');
   for(let index=0;index<job.childIds.length;index++){
    const selected=remaining.filter(u=>job.childCoverage[index].some(v=>equal(u,v)));if(!selected.length)continue;
    const childId=job.childIds[index],prior=await t.get('organizerUsage',receiptId(childId));if(await t.get('meta',dispatchFenceId(childId))||prior&&(prior.executionKind!=='local'||prior.attemptCount!==0||prior.state!=='PLANNED'))fail();
    if(!prior)await t.put('organizerUsage',{id:receiptId(childId),kind:KIND,version:1,jobId:id,childId,parentReservationId:'local-no-cost',executionKind:'local',sequence:index,state:'PLANNED',stateKey:0,windowIds:[],attemptCount:0,spendState:'NO_PROVIDER_COST',effectiveResultCount:0});
    for(const facet of [...new Set(selected.map(u=>u.facet))])await this.applyFacet(t,job,index,{facet,units:selected.filter(u=>u.facet===facet),outcome:'NO_CHANGE',local:true,requireFinalFence:true});
   }
   // The last applyFacet already ran current authority followed by the
   // required exact owner snapshot and synchronous owner fence. No additional
   // authority await may reopen that final publication boundary.
   return safeJob(job);
  });
 }
 async commitFacet(id,childId,{facet,units,outcome='COMMITTED',retryCondition=null}={}){
  units=structuredClone(units);
  if(!['COMMITTED','NO_CHANGE','DEFER'].includes(outcome)||retryCondition!==null&&!opaque(retryCondition))fail();
  return this.write(async t=>{const job=await this.job(t,id);if(atomicJob(job)||isPrivateResultJob(job))fail();await this.current(t,job);const index=job.childIds.indexOf(childId),receipt=await t.get('organizerUsage',receiptId(childId));
   if(index<0||!receipt||receipt.jobId!==id||!['RESPONSE_RECORDED','VALIDATED','COMMITTED'].includes(receipt.state))fail();
   return this.applyFacet(t,job,index,{facet,units,outcome,retryCondition});
  });
 }
 // Trusted feature callback alone supplies private output and synchronous fence.
 async commitAssistResult(id){
  return this.write(async t=>{
   const job=await this.job(t,id);if(!isAssistResultJob(job))fail();
   await this.current(t,job);if(job.resultCommitted===true)return safeJob(job);
   const childId=job.childIds[0],receipt=await t.get('organizerUsage',receiptId(childId));
   if(receipt?.kind!==KIND||receipt.jobId!==id||receipt.childId!==childId||receipt.state!=='RESPONSE_RECORDED'||!opaque(receipt.operationReceiptId))fail('OUTCOME_UNKNOWN');
   if(typeof this.assistResult!=='function')fail('UNAVAILABLE');
   const result=await this.assistResult(t,Object.freeze({logicalJobId:id,childOperationId:childId,operationReceiptId:receipt.operationReceiptId,replyObligation:structuredClone(job.replyObligation)}));
   if(result?.committed!==true||!['SUGGESTION','DEFER'].includes(result.outcome)||typeof result.isCurrent!=='function')fail('STALE_BASE');
   await this.current(t,job);if(result.isCurrent()!==true)fail('STALE_BASE');
   await t.put('organizerWorkItems',{id:'aiu:assist-result:'+id,kind:ASSIST_RESULT_KIND,version:1,jobId:id,childId,state:'ACKNOWLEDGED',stateKey:1,sequence:0,replyObligation:structuredClone(job.replyObligation),outcome:result.outcome,sourceRecordIds:job.sourceRecordIds});
   receipt.state='COMMITTED';receipt.stateKey=1;receipt.effectiveResultCount=0;await t.put('organizerUsage',receipt);
   job.resultCommitted=true;job.resultOutcome=result.outcome;job.state='COMMITTED';job.stateKey=1;await this.#putJob(t,job);
   if(result.isCurrent()!==true)fail('STALE_BASE');return safeJob(job);
  });
 }
 async commitHistoricalCandidates(id){
  return this.write(async t=>{
   const job=await this.job(t,id);if(!isHistoricalCandidateJob(job))fail();
   await this.current(t,job);if(job.resultCommitted===true)return safeJob(job);
   const childId=job.childIds[0],receipt=await t.get('organizerUsage',receiptId(childId));
   if(receipt?.kind!==KIND||receipt.jobId!==id||receipt.childId!==childId||receipt.state!=='RESPONSE_RECORDED'||!opaque(receipt.operationReceiptId))fail('OUTCOME_UNKNOWN');
   if(typeof this.candidateResult!=='function')fail('UNAVAILABLE');
   const result=await this.candidateResult(t,Object.freeze({logicalJobId:id,childOperationId:childId,operationReceiptId:receipt.operationReceiptId,candidateObligation:structuredClone(job.candidateObligation)}));
   if(result?.committed!==true||!['CANDIDATES','DEFER'].includes(result.outcome)||typeof result.isCurrent!=='function')fail('STALE_BASE');
   await this.current(t,job);if(result.isCurrent()!==true)fail('STALE_BASE');
   await t.put('organizerWorkItems',{id:'aiu:historical-result:'+id,kind:HISTORICAL_CANDIDATE_KIND,version:1,jobId:id,childId,state:'ACKNOWLEDGED',stateKey:1,sequence:0,candidateObligation:structuredClone(job.candidateObligation),outcome:result.outcome,sourceRecordIds:job.sourceRecordIds});
   receipt.state='COMMITTED';receipt.stateKey=1;receipt.effectiveResultCount=0;await t.put('organizerUsage',receipt);
   job.resultCommitted=true;job.resultOutcome=result.outcome;job.state='COMMITTED';job.stateKey=1;await this.#putJob(t,job);
   if(result.isCurrent()!==true)fail('STALE_BASE');return safeJob(job);
  });
 }
 async commitOrganizeClosure(id,{children}={}){
  children=structuredClone(children);
  return this.write(async t=>{
   const job=await this.job(t,id);if(!atomicJob(job)||!Array.isArray(children)||children.length!==job.childIds.length)fail();
   const seen=new Set();for(const child of children){exact(child,['childId','units']);const index=job.childIds.indexOf(child.childId);if(index<0||seen.has(child.childId)||!equal(validateCoverage(child.units,job.type),job.childCoverage[index]))fail();seen.add(child.childId);}
   if(job.state==='COMMITTED'&&equal([...job.committedCoverage].sort(),job.coverage.map(unitKey).sort()))return safeJob(job);
   await this.current(t,job);if(job.committedCoverage.length||typeof this.organizeClosure!=='function')fail('STALE_BASE');
   for(const childId of job.childIds){const r=await t.get('organizerUsage',receiptId(childId));if(r?.kind!==KIND||r.jobId!==id||r.childId!==childId||r.state!=='RESPONSE_RECORDED'||!r.operationReceiptId)fail('OUTCOME_UNKNOWN');}
   const result=await this.organizeClosure(t,Object.freeze({logicalJobId:id,childIds:[...job.childIds],units:structuredClone(job.coverage),children:structuredClone(job.childCoverage)}));
   if(result?.committed!==true||!equal((result.coverage||[]).map(unitKey).sort(),job.coverage.map(unitKey).sort()))fail('STALE_BASE');
   await this.current(t,job);
   if(typeof result.isCurrent!=='function'||result.isCurrent()!==true)fail('STALE_BASE');
   for(let i=0;i<job.childIds.length;i++)await this.settleFacet(t,job,i,job.childCoverage[i],{outcome:'COMMITTED'});
   if(result.isCurrent()!==true)fail('STALE_BASE');
   return safeJob(job);
  });
 }
 async applyFacet(t,job,index,{facet,units,outcome,retryCondition=null,local=false,requireFinalFence=false}){
   if(atomicJob(job)||isPrivateResultJob(job))fail('INVALID_REQUEST');
   const receipt=await t.get('organizerUsage',receiptId(job.childIds[index])),childId=job.childIds[index],id=job.id;
   const validated=validateCoverage(units,job.type),permitted=new Set(job.childCoverage[index].map(unitKey));if(validated.some(u=>u.facet!==facet||!permitted.has(unitKey(u))))fail();
   const remaining=validated.filter(u=>!job.committedCoverage.includes(unitKey(u)));if(!remaining.length)return safeJob(job);
   if(outcome==='DEFER'){if(!retryCondition)fail();for(const unit of remaining)await t.put('organizerWorkItems',{id:'aiu:defer:'+canonical([id,unitKey(unit)]),kind:KIND,jobId:id,state:'DEFERRED',stateKey:0,sequence:index,unit,retryCondition,signature:job.items.find(i=>i.key===unit.key).signature});return {...safeJob(job),deferred:true};}
   const commit=this.committers[facet];if(typeof commit!=='function')fail('UNAVAILABLE');
   const result=await commit(t,Object.freeze({...(job.organizeStyle?{organizeStyle:structuredClone(job.organizeStyle),organizeSemanticKey:job.organizeSemanticKey}:{}),logicalJobId:id,childOperationId:childId,units:structuredClone(remaining),outcome}));
   if(result?.committed!==true||!equal((result.coverage||[]).map(unitKey).sort(),remaining.map(unitKey).sort()))fail('STALE_BASE');
   if(requireFinalFence&&(typeof result.fenceAfterSettlement!=='function'||typeof result.isCurrent!=='function'))fail('STALE_BASE');
   if(job.organizeStyle||job.assistIntent)await this.current(t,job);
   // Optional private owner fence. It is supplied only by a trusted committer,
   // never a request/provider DTO; promises and nonfunctions fail closed.
   const assertOwner=()=>{if(Object.hasOwn(result,'isCurrent')&&(typeof result.isCurrent!=='function'||result.isCurrent()!==true))fail('STALE_BASE');};
   assertOwner();const settled=await this.settleFacet(t,job,index,remaining,{outcome,local});assertOwner();
   // Trusted owner only, never serialized or accepted from a request/provider.
   // This fence follows every settlement write, including NO_CHANGE counters;
   // nothing asynchronous or mutating follows it before the final owner check.
   if(Object.hasOwn(result,'fenceAfterSettlement')&&(typeof result.fenceAfterSettlement!=='function'||await result.fenceAfterSettlement(t)!==true))fail('STALE_BASE');
   assertOwner();return settled;
 }
 async settleFacet(t,job,index,remaining,{outcome,local=false}){
   const id=job.id;
   const receipt=await t.get('organizerUsage',receiptId(job.childIds[index]));
   // Domain mutation, exact coverage and receipt are one IndexedDB transaction.
   for(const unit of remaining){const item=job.items.find(i=>i.key===unit.key);await t.put('organizerWorkItems',{id:qualifiedCoverageId(unit,job),kind:KIND,jobId:id,state:'ACKNOWLEDGED',stateKey:1,sequence:index,unit,signature:item.signature,outcome,inputIds:item.descriptor.inputIds,sourceRecordIds:item.descriptor.sourceRecordIds});job.committedCoverage.push(unitKey(unit));}
   if(job.type==='AI_MAINTENANCE')for(const item of job.items){const dirty=await t.get('meta',DIRTY_PREFIX+item.key);if(!dirty||dirty.signature!==item.signature)continue;const pending=[];for(const facet of dirty.pendingFacets||['topic','context']){const requirements=dirty.requirements.map(encoded=>JSON.parse(encoded)).filter(([,f])=>f===facet);let complete=requirements.length>0;for(const [key,f,scope]of requirements){const ack=await t.get('organizerWorkItems',coverId(key,f,scope));if(ack?.signature!==item.signature){complete=false;break;}}if(!complete)pending.push(facet);}if(!pending.length)await t.delete('meta',DIRTY_PREFIX+item.key);else await t.put('meta',{...dirty,pendingFacets:pending});}
   const childComplete=job.childCoverage[index].every(u=>job.committedCoverage.includes(unitKey(u)));receipt.state=childComplete?'COMMITTED':local?'PLANNED':'VALIDATED';receipt.stateKey=childComplete?1:0;receipt.effectiveResultCount=0;await t.put('organizerUsage',receipt);
   job.state=job.coverage.every(u=>job.committedCoverage.includes(unitKey(u)))?'COMMITTED':'VALIDATED';await this.aggregate(t,job);job.stateKey=job.state==='COMMITTED'?1:0;await this.#putJob(t,job);if(outcome==='NO_CHANGE')await count(t,'localResolved');return safeJob(job);
 }
}
