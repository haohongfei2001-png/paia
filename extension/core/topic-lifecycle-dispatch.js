import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {TopicLifecycleService} from './topic-lifecycle.js';
import {TopicLifecycleConsumer} from './topic-lifecycle-consumer.js';
import {topicLifecyclePolicy} from './topic-lifecycle-policy.js';
import {readMaintenanceLifecycleSelection} from './ai-usage/local-maintenance-session.js';

// Explicit local consumer of an already-prepared private maintenance selection.
// It neither enumerates Topics nor enables scheduling, providers or Sync.
export class TopicLifecycleDispatch {
 #selection;#policy;#consumer;#requests;#running=null;#now=null;#closed=false;
 constructor(store,selection,{policy,previousObservedAt=null}={}){
  const held=readMaintenanceLifecycleSelection(selection,store),checked=topicLifecyclePolicy(policy);
  if(held.selection.length>checked.maxTopics)throw new ArchiveError('TOPIC_ACTIVITY_POLICY_INVALID');
  this.#selection=held;this.#policy=checked;
  const service=new TopicLifecycleService(store,{resolveProcessing:held.resolveProcessing,...(held.strictQualification?{resolveQualification:held.resolveQualification,strictQualification:true}:{})});
  if(held.enterAction){const change=service.changeInactive;service.changeInactive=async(request,options)=>{held.enterAction(request);try{return await change.call(service,request,options);}finally{held.leaveAction();}};}
  this.#consumer=new TopicLifecycleConsumer(service,{policy:checked,previousObservedAt});
  // The original job and selected revision, plus the whole explicit policy,
  // identify one action. A lost response must not create a new operation ID.
  this.#requests=Promise.all(held.selection.map(async item=>({...structuredClone(item),to:'dormant',operationId:'topic-activity:'+await hashText(JSON.stringify({version:1,jobId:held.jobId,policy:checked,id:item.id,revision:item.expectedRevision}))})));
 }
 close(){this.#closed=true;this.#consumer.close();}
 run({now}={}){
  if(this.#closed)return Promise.reject(new ArchiveError('TOPIC_ACTIVITY_UNAVAILABLE'));
  if(this.#running){if(now!==this.#now)return Promise.reject(new ArchiveError('REQUEST_ALREADY_IN_FLIGHT'));return this.#running;}
  // Reserve the original session before entering its shared work window. A
  // second dispatcher must not poison the first invocation's consumed ticket.
  const held=this.#selection;try{if(held.reserve)held.reserve();else held.begin();}catch(error){return Promise.reject(error);}
  this.#now=now;
  let task;try{task=held.withWork?held.withWork(()=>this.#run(now)):this.#run(now);}catch(error){held.end();return Promise.reject(error);}
  this.#running=task.finally(()=>{held.end();this.#running=null;});return this.#running;
 }
 async #run(now){
  const held=this.#selection,requests=await this.#requests,incomplete=held.preflight?await held.preflight(requests):[];
  if(incomplete.length){held.assertCurrent();return {state:'complete',policyVersion:this.#policy.version,observedAt:now,items:requests.map(request=>({id:request.id,state:'deferred',reason:incomplete.includes(request.id)?'incomplete_activity':'selection_incomplete'}))};}
  if(held.reserve)await held.begin(requests,this.#policy);held.assertCurrent();return this.#consumer.run(requests,{now,workBudget:held.workBudget});
 }
}
