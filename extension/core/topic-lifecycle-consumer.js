import {ArchiveError} from './constants.js';
import {TopicLifecycleService} from './topic-lifecycle.js';
import {topicLifecyclePolicy} from './topic-lifecycle-policy.js';
// Explicit local dispatch only. No Topic enumeration, scheduler or provider call.
export class TopicLifecycleConsumer {
 #service;#policy;#last;#busy=false;#closed=false;
 constructor(service,{policy,previousObservedAt=null}={}){
  if(!(service instanceof TopicLifecycleService)||previousObservedAt!==null&&(!Number.isSafeInteger(previousObservedAt)||previousObservedAt<0))throw new ArchiveError('TOPIC_ACTIVITY_POLICY_INVALID');
  this.#service=service;this.#policy=topicLifecyclePolicy(policy);this.#last=previousObservedAt;
 }
 close(){this.#closed=true;}
 async run(selected,{now,workBudget}={}){
  if(this.#closed||this.#busy)throw new ArchiveError('TOPIC_ACTIVITY_UNAVAILABLE');
  if(!Number.isSafeInteger(now)||now<0||this.#last!==null&&now<this.#last)return {state:'deferred',reason:'clock_regression',items:[]};
  if(!Array.isArray(selected)||selected.length<1||selected.length>this.#policy.maxTopics)throw new ArchiveError('TOPIC_ACTIVITY_POLICY_INVALID');
  const requests=structuredClone(selected);if(new Set(requests.map(r=>r.id)).size!==requests.length)throw new ArchiveError('TOPIC_ACTIVITY_POLICY_INVALID');
  this.#busy=true;const previousObservedAt=this.#last;this.#last=now;const items=[];
  try{for(const request of requests){if(this.#closed)break;try{const result=await this.#service.changeInactive(request,{policy:this.#policy,now,previousObservedAt,workBudget});items.push({id:request.id,state:result.conflict?'conflict':'settled',result});}catch(error){if(error.code!=='TOPIC_ACTIVITY_DEFERRED'){
   // A thrown original operation may have committed before delivery failed.
   // Preserve earlier receipts and the unresolved action; never infer rollback.
   const partialResult=Object.freeze({state:'interrupted',policyVersion:this.#policy.version,observedAt:now,notAttemptedIds:requests.slice(items.length+1).map(item=>item.id),items:structuredClone([...items,{id:request.id,operationId:request.operationId,state:'unknown',code:error.code||null}])});
   let failure=error;if(!Object.isExtensible(failure)){failure=new Error(error.message,{cause:error});failure.code=error.code;}
   Object.defineProperty(failure,'partialResult',{value:partialResult});throw failure;
  }items.push({id:request.id,state:'deferred',reason:error.reason});}}return {state:this.#closed?'closed':'complete',policyVersion:this.#policy.version,observedAt:now,items};}finally{this.#busy=false;}
 }
}
