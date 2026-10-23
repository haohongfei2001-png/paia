import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {TopicLifecycleService} from './topic-lifecycle.js';
import {TopicLifecycleConsumer} from './topic-lifecycle-consumer.js';
import {topicLifecyclePolicy} from './topic-lifecycle-policy.js';
import {readMaintenanceLifecycleSelection} from './ai-usage/local-maintenance-session.js';

// Explicit local consumer of an already-prepared private maintenance selection.
// It neither enumerates Topics nor enables scheduling, providers or Sync.
export class TopicLifecycleDispatch {
 #selection;#consumer;#requests;#running=null;#now=null;#closed=false;
 constructor(store,selection,{policy,previousObservedAt=null}={}){
  const held=readMaintenanceLifecycleSelection(selection,store),checked=topicLifecyclePolicy(policy);
  if(held.selection.length>checked.maxTopics)throw new ArchiveError('TOPIC_ACTIVITY_POLICY_INVALID');
  this.#selection=held;
  this.#consumer=new TopicLifecycleConsumer(new TopicLifecycleService(store,{resolveProcessing:held.resolveProcessing}),{policy:checked,previousObservedAt});
  // The original job and selected revision, plus the whole explicit policy,
  // identify one action. A lost response must not create a new operation ID.
  this.#requests=Promise.all(held.selection.map(async item=>({...structuredClone(item),to:'dormant',operationId:'topic-activity:'+await hashText(JSON.stringify({version:1,jobId:held.jobId,policy:checked,id:item.id,revision:item.expectedRevision}))})));
 }
 close(){this.#closed=true;this.#consumer.close();}
 run({now}={}){
  if(this.#closed)return Promise.reject(new ArchiveError('TOPIC_ACTIVITY_UNAVAILABLE'));
  if(this.#running){if(now!==this.#now)return Promise.reject(new ArchiveError('REQUEST_ALREADY_IN_FLIGHT'));return this.#running;}
  this.#now=now;
  this.#running=this.#run(now).finally(()=>{this.#running=null;});return this.#running;
 }
 async #run(now){
  const held=this.#selection;held.begin();
  try{const requests=await this.#requests;held.assertCurrent();return await this.#consumer.run(requests,{now,workBudget:held.workBudget});}
  finally{held.end();}
 }
}
