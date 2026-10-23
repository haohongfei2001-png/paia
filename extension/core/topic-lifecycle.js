import {assertMemoryTopicTransitionAllowed} from './memory/organization-guard.js';
import {fail,keys,idOK,revisionOK} from './thought-model.js';
import {setTopicLifecycle,resolveTopicIdentity} from './topic-identity.js';
import {TopicProcessingGuard} from './topic-processing.js';
import {journal,observeOriginalOperationReceipt,originalOperationReceiptResult,releaseOriginalOperationReceipt} from './thought-journal.js';
import {registerRepositoryFinalReadFence} from './idb-repository.js';
import {queueSearch} from './library-search.js';
import {ArchiveError} from './constants.js';
import {topicLifecyclePolicy,evaluateTopicInactivity} from './topic-lifecycle-policy.js';
import {captureTopicLifecycleActivity,sealTopicLifecycleActivity} from './topic-lifecycle-activity.js';

// Activity only: no admission, removal, merge, membership or permission write.
// Inactivity policy/dispatch is explicit and local; no background activation.
export class TopicLifecycleService {
 constructor(store,options={}){this.store=store;this.guard=new TopicProcessingGuard(store,options);}
 async change(request){return this.#change(request);}
 async changeInactive(request,options){
  const held={policy:topicLifecyclePolicy(options?.policy),now:options?.now,previousObservedAt:options?.previousObservedAt??null,workBudget:options?.workBudget};
  if(request?.to!=='dormant'||!evaluateTopicInactivity({...held,activityAt:new Date(0).toISOString()}).eligible)fail();
  return this.#change(structuredClone(request),held);
 }
 async #change(request,activity=null){
  keys(request,['id','to','expectedRevision','operationId','scope'],['id','to','expectedRevision','operationId','scope']);
  if(!idOK(request.id)||!['active','dormant'].includes(request.to)||!revisionOK(request.expectedRevision))fail();
  const prepared=await this.guard.prepareWithProcessingMode(request.scope);
  let receiptObserver=null;try{return await this.store.operation(request,async t=>{
   await this.guard.check(t,prepared);if(await this.guard.processing(t,prepared.evidence,[request.id])!==prepared.authority.processingEpoch)fail();
   // Require one privately tracked mode across both preparation reads and all
   // write admissions. Genuine uses are frozen before any success or mutation
   // and fenced after receipt/search/backup finalizers, without renewed grants.
   const strict=this.guard.registerPreparedProcessingFinalFence(t,prepared,{qualification:this.guard.qualification()});
   if(activity){if(!strict)fail();this.guard.assertProcessingFacts(t,{workBudget:activity.workBudget});}
   const row=await resolveTopicIdentity(t,request.id);
   if(row.id!==request.id||row.layoutJobId||!['active','dormant'].includes(row.lifecycle)||!await this.store.sourcePresent(t,row.sourceRecordIds))fail();
   if(row.revision!==request.expectedRevision)return {conflict:true};
   if(activity&&row.lifecycle===request.to){const error=new ArchiveError('TOPIC_ACTIVITY_DEFERRED');error.reason='already_dormant';throw error;}
   if(row.lifecycle===request.to)return {id:row.id,revision:row.revision,lifecycle:row.lifecycle};
   // An explicit lifecycle decision cannot be undone by automatic reactivation.
   if(row.protections?.lifecycle?.locked)fail();
   if(request.to==='dormant')await assertMemoryTopicTransitionAllowed(t,row,{nextGeneration:null});
   const activityCap=activity?await captureTopicLifecycleActivity(this,t,row,activity,prepared.evidence):null;
   const before=structuredClone(row);setTopicLifecycle(row,request.to,{actor:'ai',operationId:request.operationId,at:this.store.clock()});row.revision++;row.organizationRevision++;
   await t.put('topics',row);await queueSearch(t,'topic',row);
   await journal(this.store,t,{kind:'topic',entityId:row.id,before,after:row,fieldMask:['lifecycle'],actor:'ai',reason:'activity',important:true,operationId:request.operationId,baseRevision:before.revision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds||[]},{boundedPrune:!!activity});
   if(activityCap){
    sealTopicLifecycleActivity(this,t,activityCap,row);
    receiptObserver=observeOriginalOperationReceipt(this.store,t,request.operationId);const store=this.store,cap=receiptObserver;
    registerRepositoryFinalReadFence(store.repository,t,{isCurrent:()=>true,plan:function*(){const saved=yield {method:'get',table:'operationReceipts',key:request.operationId};if(JSON.stringify(saved)!==originalOperationReceiptResult(store,t,cap))fail();return true;}});
   }
   return {id:row.id,revision:row.revision,lifecycle:row.lifecycle};
  },activity?{workLimit:{}}:undefined);}finally{if(receiptObserver)releaseOriginalOperationReceipt(receiptObserver);}
 }
}
