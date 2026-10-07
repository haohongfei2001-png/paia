import {fail,keys,idOK,revisionOK} from './thought-model.js';
import {setTopicLifecycle,resolveTopicIdentity} from './topic-identity.js';
import {TopicProcessingGuard} from './topic-processing.js';
import {journal} from './thought-journal.js';
import {queueSearch} from './library-search.js';

// Activity only: no admission, removal, merge, membership or permission write.
// Threshold policy and dispatch belong to the future authorized Organizer.
export class TopicLifecycleService {
 constructor(store,options={}){this.store=store;this.guard=new TopicProcessingGuard(store,options);}
 async change(request){
  keys(request,['id','to','expectedRevision','operationId','scope'],['id','to','expectedRevision','operationId','scope']);
  if(!idOK(request.id)||!['active','dormant'].includes(request.to)||!revisionOK(request.expectedRevision))fail();
  const prepared=await this.guard.prepare(request.scope);
  return this.store.operation(request,async t=>{
   await this.guard.check(t,prepared);if(await this.guard.processing(t,prepared.evidence,[request.id])!==prepared.authority.processingEpoch)fail();const row=await resolveTopicIdentity(t,request.id);
   if(row.id!==request.id||row.layoutJobId||!['active','dormant'].includes(row.lifecycle)||!await this.store.sourcePresent(t,row.sourceRecordIds))fail();
   if(row.revision!==request.expectedRevision)return {conflict:true};
   if(row.lifecycle===request.to)return {id:row.id,revision:row.revision,lifecycle:row.lifecycle};
   // An explicit lifecycle decision cannot be undone by automatic reactivation.
   if(row.protections?.lifecycle?.locked)fail();
   const before=structuredClone(row);setTopicLifecycle(row,request.to,{actor:'ai',operationId:request.operationId,at:this.store.clock()});row.revision++;row.organizationRevision++;
   await t.put('topics',row);await queueSearch(t,'topic',row);
   await journal(this.store,t,{kind:'topic',entityId:row.id,before,after:row,fieldMask:['lifecycle'],actor:'ai',reason:'activity',important:true,operationId:request.operationId,baseRevision:before.revision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds||[]});
   return {id:row.id,revision:row.revision,lifecycle:row.lifecycle};
  });
 }
}
