import {queueOriginalApplicationSelectionRead} from '../indexed-store.js';
import {retainOriginalSelectionHoldWork,originalSelectionHoldBinding,chargeOriginalSelectionHold,trackOriginalSelectionHoldWork,invalidateOriginalSelectionHold,originalSelectionHoldPinned,originalSelectionHoldRemaining,bindOriginalSelectionHoldRepository} from '../local-tool-selection-hold.js';
import {savedFinancialCancellation,savedDomainResultReceipt} from './domain-result-receipt.js';
import {prefix} from '../thought-model.js';
import {quickPromptEligible} from '../prompt-reuse-preferences.js';
import {assistServicePayload,validateAssistServiceResponse} from './assist-service-response.js';
import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../idb-repository.js';
import {requireAssistServiceClient} from './assist-service-client.js';
import {AIUsageFoundation} from './foundation.js';
import {exact,equal,canonical,fail,localProviderDescriptor,validateCoverage} from './contracts.js';
import {selectAssistContext,captureAssistContext,assistContextValue,assertAssistContext,assistContextCurrent,releaseAssistContext} from './assist-context-selector.js';
import {ASSIST_LIMITS,assembleAssistPayload,assertAssistPayload,validateAssistResponse} from './assist-response.js';
// The configured worker composes these original local lease/result owners.
// Capabilities are trusted host dependencies; reply/result bytes stay transient.
export class LocalAssistSession {
 #tasks=new Set();#selectionHold=null;#admission=0;#unprovedDispatch=false;#insertionUnknown=false;
 #store;#service;#lease;#provider;#selector;#contextProcessing;#contextDiscovery;#states=new Map();#preparations=new Set();#handles=new WeakMap();#disposed=false;#generation=0;#clock;#last=0;#unsubscribe;#intent;
 constructor(store,{lease,provider=null,service=null,resolveAuthority=null,contextSelector=null,contextProcessing=null,contextDiscovery=null,intent='explicit',contractVersion='assist-local-v1',routeVersion='unavailable',clock=()=>performance.now()}={}){
  if(!['explicit','automatic_assist'].includes(intent))fail('UNAVAILABLE');this.#intent=intent;this.#store=store;this.#service=service===null?null:requireAssistServiceClient(service);this.#lease=lease;this.#unsubscribe=lease.onInvalidate(()=>this.#invalidate());this.#provider=provider;this.#selector=contextSelector;this.#contextProcessing=contextProcessing;this.#contextDiscovery=contextDiscovery;this.#clock=clock;this.contractVersion=contractVersion;this.routeVersion=routeVersion;
  this.foundation=new AIUsageFoundation(store,{resolveAuthority,resolveAssistIntent:(t,r)=>this.#resolve(t,r),assistResult:(t,r)=>this.#commit(t,r)});
 }
 #now(){const n=this.#clock();if(!Number.isFinite(n)||n<0||n<this.#last){this.dispose();fail('UNAVAILABLE');}this.#last=n;return n;}
 #track(task){retainOriginalSelectionHoldWork(this.#selectionHold,task);this.#tasks.add(task);const done=()=>this.#tasks.delete(task);void task.then(done,done);return task;}
 #admit(){if(this.#disposed||this.#selectionHold)fail('STALE_BASE');return this.#admission;}
 #assertAdmission(admission){if(this.#disposed||this.#selectionHold||admission!==this.#admission)fail('STALE_BASE');}
 #invalidate(forSelection=false){if(this.#selectionHold&&!forSelection)invalidateOriginalSelectionHold(this.#selectionHold);this.#admission++;this.#generation++;for(const controller of this.#preparations)controller.abort();this.#preparations.clear();for(const s of this.#states.values()){s.controller.abort();if(this.#service&&s.job)void this.#track(this.foundation.cancelServer(s.job.id)).catch(()=>{});releaseAssistContext(s.contextHandle);s.published=null;s.validated=null;s.snapshot=null;s.payload=null;}this.#states.clear();this.#handles=new WeakMap();}
 #valid(s){return !!s&&!s.controller.signal.aborted&&!this.#disposed&&!this.#selectionHold&&s.generation===this.#generation&&this.#states.get(s.key)===s&&this.#now()-s.created<ASSIST_LIMITS.ttl&&this.#lease.isCurrent(s.lease)===true&&(this.#intent!=='automatic_assist'||this.#lease.automaticCurrent?.(s.lease)===true)&&assistContextCurrent(s.contextHandle);}
 #get(handle){const s=this.#handles.get(handle);if(!this.#valid(s))fail('STALE_BASE');return s;}
 // Retire only unusable, idle private memory; durable jobs/attempts remain the
 // no-redispatch authority. A planning or running operation owns its slot.
 async #retireInvalid(){
  const idle=[...this.#states.values()].filter(s=>!s.planning&&!s.running);if(!idle.length)return;
  const retired=await this.foundation.read(async t=>{const out=[];for(const s of idle){
   if(s.planning||s.running||this.#states.get(s.key)!==s)continue;
   if(!this.#valid(s)){out.push(s);continue;}
   const row=await t.get('organizerJobs',s.job.id);if(!row){out.push(s);continue;}
   try{await this.foundation.current(t,await this.foundation.job(t,s.job.id));}
   catch(error){if(!['STALE_BASE','UNAVAILABLE','CANCELLED'].includes(error.code))throw error;out.push(s);}
  }return out;});
  for(const s of retired){if(s.planning||s.running||this.#states.get(s.key)!==s)continue;this.#states.delete(s.key);this.#handles.delete(s.handle);releaseAssistContext(s.contextHandle);s.published=null;s.validated=null;s.snapshot=null;s.payload=null;s.context=null;}
 }

 async #resolve(t,{binding,scope}){
  const s=[...this.#states.values()].find(x=>equal(x.binding,binding)&&equal(x.obligation,scope.replyObligation));
  if(!this.#valid(s))fail('STALE_BASE');
  if(!equal(scope,{evidenceKeys:s.items.map(i=>i.key).sort(),coverage:s.coverage,replyObligation:s.obligation}))fail('STALE_BASE');
  await assertAssistContext(this.#store,t,s.contextHandle);if(!this.#valid(s))fail('STALE_BASE');
  return {allowed:true,remoteProcessing:true,binding:structuredClone(binding),scope:structuredClone(scope)};
 }
 async prepare(options={}){const admission=this.#admit();return this.#track(this.#prepare(options,admission));}
 async #prepare({lease,assertCurrent=null},admission){
  if(this.#service&&typeof assertCurrent!=='function')fail('UNAVAILABLE');if(assertCurrent)await assertCurrent();this.#assertAdmission(admission);
  if(this.#disposed||this.#intent==='automatic_assist'&&this.#lease.automaticCurrent?.(lease)!==true)fail('UNAVAILABLE');const recoveryGeneration=this.#generation;if(this.#service)await this.#service.recover(this.foundation,{retainJob:id=>[...this.#states.values()].some(s=>s.job?.id===id&&(s.running||s.validated||s.published)),isCurrent:()=>!this.#disposed&&this.#generation===recoveryGeneration});await this.#retireInvalid();this.#assertAdmission(admission);if(this.#states.size>=8&&![...this.#states.values()].some(s=>s.lease===lease&&this.#valid(s)))fail('RESOURCE_LIMIT');
  const generation=this.#generation,meta=this.#lease.metadata(lease),snapshot=await this.#lease.snapshot(lease);
  // Reject an oversized reply before selecting or acquiring any Context.
  assembleAssistPayload(snapshot,[]);
  const current=()=>!this.#disposed&&!this.#selectionHold&&admission===this.#admission&&generation===this.#generation&&this.#lease.isCurrent(lease)===true;
  const controller=new AbortController();this.#preparations.add(controller);
  let contextHandle=null,owner=null,retained=false;
  try{
   contextHandle=await this.foundation.read(async t=>{const narrow=this.#selector===null?null:structuredClone(await this.#selector(t,{replyBinding:meta.replyBinding}));return selectAssistContext(this.#store,t,{binding:meta.binding,replyBinding:meta.replyBinding,replyText:snapshot.text,narrow,isCurrent:current,signal:controller.signal});});
   await captureAssistContext(this.#store,contextHandle,{read:fn=>this.foundation.read(fn),processing:this.#contextProcessing,discovery:this.#contextDiscovery,onRevoke:()=>{controller.abort();if(owner){owner.published=null;owner.validated=null;owner.payload=null;owner.snapshot=null;if(this.#service&&owner.job)void this.#track(this.foundation.cancelServer(owner.job.id)).catch(()=>{});}}});
   const selected=assistContextValue(contextHandle),payload=assembleAssistPayload(snapshot,selected.context),key=await this.#lease.evaluationKey(lease,selected.dependencies,this.contractVersion,this.routeVersion);
   if(!current()||controller.signal.aborted)fail('STALE_BASE');
   const old=this.#states.get(key);if(old){await old.ready;if(!this.#valid(old))fail('STALE_BASE');old.assertSurface=assertCurrent;return old.handle;}
   await this.#retireInvalid();if(!current()||controller.signal.aborted)fail('STALE_BASE');
   // A same-key preparation may have published while retirement awaited IDB.
   const concurrent=this.#states.get(key);if(concurrent){await concurrent.ready;if(!this.#valid(concurrent))fail('STALE_BASE');concurrent.assertSurface=assertCurrent;return concurrent.handle;}
   if(this.#states.size>=ASSIST_LIMITS.capacity)fail('RESOURCE_LIMIT');
   const replyKey=this.#service?await this.#lease.replyKey(lease):null;if(this.#service)await this.#service.assertCanPlan(this.foundation,replyKey,meta.binding.sessionId);
   if(!current()||controller.signal.aborted)fail('STALE_BASE');
   const finalConcurrent=this.#states.get(key);if(finalConcurrent){await finalConcurrent.ready;if(!this.#valid(finalConcurrent))fail('STALE_BASE');finalConcurrent.assertSurface=assertCurrent;return finalConcurrent.handle;}if(this.#states.size>=ASSIST_LIMITS.capacity)fail('RESOURCE_LIMIT');
   const handle=Object.freeze({}),items=selected.items,obligation={version:1,evaluationKey:key},coverage=items.length?validateCoverage(items.map(i=>({key:i.key,facet:'assist',scope:key})),'AI_ASSIST'):[];
   const s={key,replyKey,handle,lease,assertSurface:assertCurrent,serviceRegistered:false,binding:meta.binding,replyBinding:meta.replyBinding,generation,created:this.#now(),contextHandle,items,coverage,obligation,payload,snapshot,controller,planning:true,job:null,validated:null,published:null,running:null};
   owner=s;this.#states.set(key,s);this.#handles.set(handle,s);retained=true;
   try{s.ready=this.foundation.plan({type:'AI_ASSIST',intent:this.#intent,items,coverage,replyObligation:obligation,assistIntent:s.binding,contractVersion:this.contractVersion,routeVersion:this.routeVersion}).then(job=>{s.job=job;});await s.ready;if(!this.#valid(s))fail('STALE_BASE');return handle;}
   catch(error){if(this.#states.get(key)===s)this.#states.delete(key);this.#handles.delete(handle);retained=false;throw error;}
   finally{s.planning=false;}
  }finally{this.#preparations.delete(controller);if(!retained){controller.abort();releaseAssistContext(contextHandle);}}

 }
 // The private provider may ignore cancellation. Bound only its physical
 // await with the existing owner budget; late completion has no validation
 // continuation. Foundation retains a stopped dispatched attempt as UNKNOWN.
 async #executeBounded(s,payload){
  if(!this.#valid(s))fail('STALE_BASE');const timeoutMs=this.foundation.s.organizerBudget.limits.timeoutMs;
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)fail('UNAVAILABLE');
  const controller=new AbortController();let timer;
  let abort;const stopped=new Promise((_,reject)=>{abort=()=>{controller.abort();reject(Object.assign(Error('ASSIST_STOPPED'),{code:'OUTCOME_UNKNOWN'}));};});
  s.controller.signal.addEventListener('abort',abort,{once:true});if(s.controller.signal.aborted)abort();timer=setTimeout(abort,timeoutMs);
  try{
   const work=this.#track(Promise.resolve().then(async()=>{const repository=this.#store.repository,fence=observeRepositoryWriteFence(repository);await this.#qualified(s);if(this.#store.repository!==repository||!this.#valid(s)||s.controller.signal.aborted||controller.signal.aborted)fail('STALE_BASE');requireRepositoryWriteFence(repository,fence);return this.#provider.execute(structuredClone(payload),Object.freeze({signal:controller.signal,timeoutMs}));}));
   const value=await Promise.race([work,stopped]);if(!this.#valid(s)||s.controller.signal.aborted)fail('STALE_BASE');return value;
  }finally{clearTimeout(timer);s.controller.signal.removeEventListener('abort',abort);}
 }
 async #qualified(s){
  if(s.assertSurface)await s.assertSurface();
  if(!this.#valid(s))fail('STALE_BASE');const snapshot=await this.#lease.snapshot(s.lease);if(!equal(snapshot,s.snapshot)||!this.#valid(s))fail('STALE_BASE');
  await this.foundation.read(async t=>{const job=await this.foundation.job(t,s.job.id);await this.foundation.current(t,job);});if(s.assertSurface)await s.assertSurface();if(!this.#valid(s))fail('STALE_BASE');
 }
 async #commit(t,r){
  const s=[...this.#states.values()].find(x=>x.job?.id===r.logicalJobId);if(!this.#valid(s)||!s.validated||s.validated.childId!==r.childOperationId||s.validated.receipt!==r.operationReceiptId||!equal(s.obligation,r.replyObligation))fail('STALE_BASE');
  await assertAssistContext(this.#store,t,s.contextHandle);if(!this.#valid(s))fail('STALE_BASE');
  return {committed:true,outcome:s.validated.value.kind,isCurrent:()=>this.#valid(s)&&!!s.validated,fenceAfterSettlement:async transaction=>{if(transaction!==t)fail('STALE_BASE');await assertAssistContext(this.#store,t,s.contextHandle);if(!this.#valid(s)||!s.validated)fail('STALE_BASE');}};
 }
 #presentation(value){return this.#intent==='automatic_assist'&&value.kind==='SUGGESTION'&&(value.condition||!quickPromptEligible(value.text))?Object.freeze({version:1,kind:'DEFER',reason:'PREREQUISITE_UNMET'}):value;}
 canReevaluateContext(handle){const s=this.#handles.get(handle);return !!s?.published&&!s.running&&this.#valid(s);}
 canResumeRetained(handle){const s=this.#handles.get(handle);return !!s?.validated&&this.#valid(s);}
 run(handle){const s=this.#get(handle);if(s.running)return s.running;const task=this.#track(this.#run(s));s.running=task;return task.finally(()=>{if(s.running===task)s.running=null;});}
 // Only the exact original returned response closes this call. A thrown
 // settlement ACK may follow physical dispatch; later successes cannot erase it.
 // Active calls are retained by their original run task, not historical tokens.
 async #dispatch(...args){let proved=false;try{const response=await this.foundation.dispatch(...args);proved=response?.state==='RESPONSE_RECORDED';return response;}finally{if(!proved)this.#unprovedDispatch=true;}}
 async #run(s){
  await this.#qualified(s);if(s.published){if(this.#service)try{await this.#service.report(this.foundation,s.job);}catch{/* Replay only the original body-free report. */}await this.#qualified(s);return structuredClone(s.published);}
  const status=await this.foundation.status(s.job.id);if(status.state==='COMMITTED'&&!s.validated)fail('UNAVAILABLE');
  if(this.#service){await this.#runService(s,status);}
  else if(status.state!=='COMMITTED'){
   const descriptor=localProviderDescriptor(this.#provider);await this.foundation.reserve(s.job.id,{reservationId:'private-assist:'+s.key,executionKind:descriptor.executionKind});
   const childId=s.job.childIds[0];await this.#dispatch(s.job.id,childId,{describe:()=>descriptor,execute:async usage=>{
    await this.#qualified(s);const payload={...s.payload,usage};assertAssistPayload(payload);if(!this.#valid(s))fail('STALE_BASE');
    const raw=await this.#executeBounded(s,payload);if(!this.#valid(s))fail('STALE_BASE');const value=this.#presentation(validateAssistResponse(raw));s.validated={childId,receipt:'assist:'+childId,value};return {accepted:true,operationReceiptId:s.validated.receipt};
   }});
   if(!this.#valid(s))fail('STALE_BASE');if(!s.validated)fail('OUTCOME_UNKNOWN');await this.#qualified(s);await this.foundation.commitAssistResult(s.job.id);
  }
  const current=await this.foundation.status(s.job.id);await this.#qualified(s);if(current.state!=='COMMITTED'||current.attempts.length!==1||current.attempts[0].state!=='COMMITTED'||!this.#valid(s)||!s.validated)fail('STALE_BASE');
  s.published=Object.freeze({...s.validated.value});return structuredClone(s.published);
 }
 async #runService(s,prior){
  const report=async()=>{try{await this.#service.report(this.foundation,s.job);}catch{/* Body-free result stays pending; no physical retry. */}};
  if(prior.state==='COMMITTED'){await report();return;}
  if(!s.validated){
   if(prior.state!=='PLANNED'||prior.attempts.length)fail('OUTCOME_UNKNOWN');
   let operation;
   try{
    await this.#qualified(s);
    const usage=await this.foundation.read(async t=>{const job=await this.foundation.job(t,s.job.id);await this.foundation.current(t,job);return this.foundation.childRequest(job,0);});
    const payload=assistServicePayload({...s.payload,usage});
    operation=await this.#service.prepare(this.foundation,s.job,[payload],{replyKey:s.replyKey,sessionId:s.binding.sessionId,assertCurrent:()=>this.#qualified(s),isCurrent:()=>this.#valid(s)&&!s.controller.signal.aborted,
     assertBeforeSend:async()=>{const repository=this.#store.repository,fence=observeRepositoryWriteFence(repository);await this.#qualified(s);return ()=>{if(this.#store.repository!==repository||!this.#valid(s)||s.controller.signal.aborted)fail('STALE_BASE');requireRepositoryWriteFence(repository,fence);};}
    });
    s.serviceRegistered=true;await this.#qualified(s);
    const childId=s.job.childIds[0],response=await this.#dispatch(s.job.id,childId,operation.providers[0],{signal:s.controller.signal,timeoutMs:this.#store.organizerBudget.limits.timeoutMs});
    if(response.state!=='RESPONSE_RECORDED')fail('OUTCOME_UNKNOWN');
    await this.#qualified(s);
    const value=this.#presentation(validateAssistServiceResponse(response.value)),status=await this.foundation.status(s.job.id),receipt=status.attempts.find(r=>r.childId===childId);
    if(receipt?.state!=='RESPONSE_RECORDED'||receipt.executionKind!=='server-backed'||!receipt.operationReceiptId)fail('OUTCOME_UNKNOWN');
    s.validated={childId,receipt:receipt.operationReceiptId,value};
   }catch(error){if(operation)try{await this.foundation.cancelServer(s.job.id);}catch{/* UNKNOWN retains the original hold. */}await report();throw error;}
   finally{operation?.dispose();}
  }
  // A failed local transaction may reuse only this exact retained result.
  await this.#qualified(s);await this.foundation.commitAssistResult(s.job.id);await report();
 }
 async stop(handle){return this.#track(this.#stop(handle));}
 async #stop(handle){const s=this.#handles.get(handle);if(!s)return {stopped:true};s.controller.abort();releaseAssistContext(s.contextHandle);s.published=null;s.validated=null;s.snapshot=null;s.payload=null;
  // Before original financial registration, prepare owns the exact publication
  // outcome. Abort immediately, but do not turn a proven never-published plan
  // into an irreversible terminal receipt. Attempted publication keeps its
  // original marker; prepare cancels any registration completed across this edge.
  if(this.#service&&!s.serviceRegistered)return {stopped:true};
  return s.job?this.#service?this.foundation.cancelServer(s.job.id):this.foundation.cancel(s.job.id):{stopped:true};
 }
 async qualifyCurrentScope(handle){this.#admit();return this.#track(this.#qualifyCurrentScope(handle));}
 async #qualifyCurrentScope(handle){const s=this.#get(handle);await this.#qualified(s);return true;}
 async qualify(handle){this.#admit();return this.#track(this.#qualify(handle));}
 async #qualify(handle){const s=this.#get(handle);await this.#qualified(s);if(!s.published)fail('UNAVAILABLE');return true;}
 async recover(){this.#admit();return this.#track(this.#recover());}
 async #recover(){if(!this.#service)fail('UNAVAILABLE');const generation=this.#generation;return this.#service.recover(this.foundation,{retainJob:id=>[...this.#states.values()].some(s=>s.job?.id===id&&(s.running||s.validated||s.published)),isCurrent:()=>!this.#disposed&&generation===this.#generation});}
 async status(handle){this.#admit();return this.#track(this.#status(handle));}
 async #status(handle){const s=this.#get(handle);return this.foundation.status(s.job.id);}
 get available(){return !this.#disposed&&this.#service?.available()===true;}
 async result(handle){this.#admit();return this.#track(this.#result(handle));}
 async #result(handle){const s=this.#get(handle);await this.#qualified(s);if(!s.published)fail('UNAVAILABLE');return structuredClone(s.published);}
 async insert(handle,options={}){this.#admit();return this.#track(this.#insert(handle,options));}
 async #insert(handle,{controller,operationId,conditionPresented=false}={}){const s=this.#get(handle),value=await this.result(handle);if(value.kind!=='SUGGESTION')fail('UNAVAILABLE');if(typeof operationId!=='string'||!operationId||operationId.length>200)fail();let proved=false;try{const result=await controller.insert({binding:s.replyBinding,text:value.text,condition:value.condition,operationId,conditionPresented,qualify:async()=>{await this.#qualified(s);return this.#valid(s)&&s.published?.text===value.text;},isCurrent:()=>this.#valid(s)&&s.published?.text===value.text});proved=result?.status==='failed'||result?.status==='inserted'&&result.verified===true;return result;}finally{if(!proved)this.#insertionUnknown=true;}}
 dismiss(handle){const s=this.#handles.get(handle);if(s){s.controller.abort();releaseAssistContext(s.contextHandle);s.published=null;s.validated=null;s.snapshot=null;s.payload=null;this.#states.delete(s.key);this.#handles.delete(handle);}}
 // A source-task proof only. It does not certify a cold composer/insertion.
 // An unproven controller throw (including pre-send qualification) is purposely
 // conservative. Constant-space UNKNOWN flags have no local reset: only a future
 // original durable operation owner may establish cold/uncertain completion.
 // Original durable UNKNOWN and unobserved bounded provider completion remain
 // restrictive; map invalidation and an abort/race result never settle them.
 #held(hold){return this.#selectionHold===hold&&hold.valid&&!this.#disposed&&hold.admission===this.#admission&&hold.repository===this.#store.repository&&hold.database===this.#store.repository.db&&hold.databaseId===this.#store.databaseId;}
 async #drain(hold){for(;;){if(!this.#held(hold))fail('STALE_BASE');const tasks=[...this.#tasks];if(!tasks.length){if(!this.#held(hold))fail('STALE_BASE');return;}for(const task of tasks)retainOriginalSelectionHoldWork(hold,task);await Promise.allSettled(tasks);}}
 async #sourceSnapshot(hold=this.#selectionHold){const read=async t=>{
  const page=await t.rangePage('organizerJobs','byMaintenance',prefix(['ai_assist_result_v1']),null,hold?.selection?100:4096);if(page.next!==null||page.rows.length*3+3>4096)fail('RESOURCE_LIMIT');
  const rows=[];let refs=0;for(const {value:job}of page.rows){
   if(++refs>4096||job.childIds?.length!==1)fail('RESOURCE_LIMIT');const attempt=await t.get('organizerUsage','aiu:attempt:'+job.childIds[0]),dispatch=await t.get('meta','aiu:dispatched:'+job.childIds[0]);refs+=2;if(refs>4096)fail('RESOURCE_LIMIT');
   if(!['PLANNED','COMMITTED','CANCELLED_BEFORE_DISPATCH','REJECTED','EXPIRED_UNCOMMITTED'].includes(job.state)||attempt&&!['COMMITTED','CANCELLED_BEFORE_DISPATCH','REJECTED','EXPIRED_UNCOMMITTED'].includes(attempt.state)||job.resultReport&&job.resultReport.state!=='ACKNOWLEDGED')fail('OUTCOME_UNKNOWN');
   if(attempt?.executionKind==='server-backed'&&attempt.financialSettlement?.state!=='SETTLED'&&!savedFinancialCancellation(attempt))fail('OUTCOME_UNKNOWN');
   if(job.state==='PLANNED'&&(attempt||dispatch))fail('OUTCOME_UNKNOWN');if(job.state!=='PLANNED'&&!await savedDomainResultReceipt(t,job))fail('OUTCOME_UNKNOWN');rows.push({job,attempt:attempt??null,dispatch:dispatch??null});
  }
  const preflight=await t.get('meta','aiu:assist-service-preflight:v1');if(preflight){const row=rows.find(r=>r.job.id===preflight.jobId);if(!row||!row.attempt||row.job.childIds[0]!==preflight.childId)fail('OUTCOME_UNKNOWN');}
  const value={rows,preflight:preflight??null,epoch:(await t.get('meta','recovery-restore-epoch'))??null,gate:(await t.get('meta','gate'))??null};if(new TextEncoder().encode(JSON.stringify(value)).length>2097152)fail('RESOURCE_LIMIT');return value;
 };return trackOriginalSelectionHoldWork(hold,hold.work?queueOriginalApplicationSelectionRead(this.#store,hold.selection.action,hold.selection.owner,hold.selection.kind,hold.work,read,['meta','organizerJobs','organizerUsage']):this.foundation.read(read));}
 applicationSelectionMembers(store){if(this.#disposed||this.#store!==store)fail('STALE_BASE');return Object.freeze([Object.freeze({owner:this,kind:'source-assist-session'})]);}
 async holdForApplicationSelection(action=null){
  this.#admit();if(this.#selector!==null||this.#contextProcessing!==null||this.#contextDiscovery!==null)fail('GENERATION_WORKER_CAPABILITY');const selection=originalSelectionHoldBinding(action,this,'source-assist-session');const token=Object.freeze(Object.create(null)),hold={selection,token,valid:true,repository:this.#store.repository,database:this.#store.repository.db,databaseId:this.#store.databaseId,ready:false,snapshot:null};this.#selectionHold=hold;for(const task of this.#tasks)retainOriginalSelectionHoldWork(hold,task);if(selection&&(this.#states.size||this.#preparations.size)){chargeOriginalSelectionHold(hold,{operation:'live-assist-refused',states:this.#states.size,preparations:this.#preparations.size},1);invalidateOriginalSelectionHold(hold);fail('OUTCOME_UNKNOWN');}hold.work=bindOriginalSelectionHoldRepository(hold,this.#store.repository);this.#invalidate(true);hold.admission=this.#admission;let timer;
  const acquire=async()=>{await this.#drain(hold);if(this.#unprovedDispatch||this.#insertionUnknown)fail('OUTCOME_UNKNOWN');hold.snapshot=await this.#sourceSnapshot(hold);if(!this.#held(hold)||this.#tasks.size)fail('STALE_BASE');hold.ready=true;return token;};
  try{return await Promise.race([trackOriginalSelectionHoldWork(hold,acquire()),new Promise((_,reject)=>{timer=setTimeout(()=>{invalidateOriginalSelectionHold(hold);reject(Object.assign(Error('ASSIST_DRAIN_TIMEOUT'),{code:'OUTCOME_UNKNOWN'}));},originalSelectionHoldRemaining(hold));})]);}
  catch(error){invalidateOriginalSelectionHold(hold);if(this.#selectionHold===hold&&!originalSelectionHoldPinned(hold)){this.#selectionHold=null;}throw error;}finally{clearTimeout(timer);}
 }
 applicationSelectionHeld(token){const hold=this.#selectionHold;const current=!!hold&&hold.token===token&&hold.ready&&this.#held(hold)&&!this.#tasks.size&&!this.#unprovedDispatch&&!this.#insertionUnknown&&(!hold.selection||originalSelectionHoldRemaining(hold)>0);if(!current&&hold?.selection)invalidateOriginalSelectionHold(hold);return current;}
 async fenceApplicationSelection(token){if(!this.applicationSelectionHeld(token))fail('STALE_BASE');const hold=this.#selectionHold;try{const snapshot=await this.#sourceSnapshot(hold);chargeOriginalSelectionHold(hold,[snapshot,hold.snapshot],0);if(!equal(snapshot,hold.snapshot)||!this.applicationSelectionHeld(token))fail('STALE_BASE');return true;}catch(error){invalidateOriginalSelectionHold(hold);throw error;}}
 releaseApplicationSelection(token,action=null){const hold=this.#selectionHold;if(!hold||hold.token!==token&&!(token===undefined&&hold.selection?.action===action))return false;if(originalSelectionHoldPinned(hold)){invalidateOriginalSelectionHold(hold);return false;}chargeOriginalSelectionHold(hold,{operation:'release'},1);hold.valid=false;this.#selectionHold=null;return true;}
 dispose(){this.#disposed=true;try{this.#unsubscribe?.();}finally{this.#invalidate();}}
}

const originalLocalAssistSelectionMethods=Object.freeze({prototype:LocalAssistSession.prototype,hold:LocalAssistSession.prototype.holdForApplicationSelection,current:LocalAssistSession.prototype.applicationSelectionHeld,fence:LocalAssistSession.prototype.fenceApplicationSelection,release:LocalAssistSession.prototype.releaseApplicationSelection,members:LocalAssistSession.prototype.applicationSelectionMembers});
export function readOriginalLocalAssistSelectionMethods(){return originalLocalAssistSelectionMethods;}
