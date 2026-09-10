import {idOK} from '../thought-model.js';
import {reject} from './contracts.js';
const CURRENT='boundedOrganizerCurrent',ROW='boundedOrganizerAction:';
const active=row=>row?.state==='running';
const publicRow=row=>row?Object.fromEntries(['id','kind','state','maxRequests','maxInputs','maxTopics','requestsReserved','inputsReserved','completedInputs','completedTopics','error','startedAt','updatedAt'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]])):null;

// Called inside the SAME transaction as budget reservation. It also fences
// ordinary single-click dispatches while a bounded authorization owns the flight.
export async function reserveBoundedDispatch(t,job,request){
 const pointer=await t.get('meta',CURRENT),row=pointer&&await t.get('meta',ROW+pointer.actionId),id=job.boundedActionId;
 if(!id){if(active(row))reject('REQUEST_ALREADY_IN_FLIGHT');return;}
 if(!active(row)||pointer.actionId!==id)reject('CANCELLED');
 const kind=job.audit?.taskType==='ai_synthesis'?'ai':'original',count=request.inputs.length;
 if(row.kind!==kind||row.requestsReserved>=row.maxRequests||kind==='original'&&row.inputsReserved+count>row.maxInputs)reject('BUDGET_EXCEEDED');
 if(kind==='ai'){const topicId=request.topicCandidates[0]?.id;if(!row.topicIds.includes(topicId)||row.dispatchedTopicIds.includes(topicId)||row.dispatchedTopicIds.length>=row.maxTopics)reject('BUDGET_EXCEEDED');row.dispatchedTopicIds.push(topicId);}
 row.requestsReserved++;row.inputsReserved+=count;await t.put('meta',row);
}
// Progress commits atomically with Library content and its receipt, so a
// worker killed after the commit cannot lose or double-count a completed batch.
export async function commitBoundedProgress(t,id,{inputs=0,topics=0,partial=false}={}){
 if(!id)return;const row=await t.get('meta',ROW+id);if(!active(row))reject('CANCELLED');row.completedInputs+=inputs;row.completedTopics+=topics;if(partial){row.state='partial';row.error='PARTIAL_RESULT';}await t.put('meta',row);
}
export class BoundedOrganizerWorkflow {
 constructor(store,{original,ai}){this.s=store;this.original=original;this.ai=ai;this.running=null;this.currentId=null;this.stopped=false;}
 async status(){await this.s.finishFoundation();return this.s.run(()=>this.s.repository.transaction(false,async t=>{const p=await t.get('meta',CURRENT);return publicRow(p&&await t.get('meta',ROW+p.actionId));},['meta']));}
 async reconcileInterrupted(){if(this.running)return;return this.s.foundationWrite(async t=>{const p=await t.get('meta',CURRENT),row=p&&await t.get('meta',ROW+p.actionId);if(active(row)){row.state='outcome_unknown';row.error='OUTCOME_UNKNOWN';row.updatedAt=this.s.clock();await t.put('meta',row);}});}
 async start({userActionId,kind,maxRequests=1,maxInputs=20,maxTopics=1,topicId=null}={}){
  if(!idOK(userActionId)||!['original','ai'].includes(kind)||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>(kind==='original'?5:3)||!Number.isInteger(maxInputs)||maxInputs<1||maxInputs>50||!Number.isInteger(maxTopics)||maxTopics<1||maxTopics>3||kind==='ai'&&maxTopics!==maxRequests||topicId!==null&&!idOK(topicId))reject('INVALID_OUTPUT');
  if(this.running||this.original.running||this.ai.running)return {error:'REQUEST_ALREADY_IN_FLIGHT'};
  // Claim in memory before awaits; durable transaction also excludes other tabs.
  this.currentId=userActionId;this.stopped=false;
  this.running=this.run({userActionId,kind,maxRequests,maxInputs,maxTopics,topicId}).finally(()=>{this.running=null;this.currentId=null;});return this.running;
 }
 async patch(id,changes){return this.s.foundationWrite(async t=>{const row=await t.get('meta',ROW+id);if(!row)return null;if(row.state==='running')Object.assign(row,changes,{updatedAt:this.s.clock()});await t.put('meta',row);return publicRow(row);});}
 async run(options){const {userActionId:id,kind,maxRequests,maxInputs,maxTopics,topicId}=options;try{
  const prior=await this.s.run(()=>this.s.repository.transaction(false,t=>t.get('meta',ROW+id),['meta']));if(prior)return publicRow(prior);
  const topicIds=kind==='ai'?(await this.s.aiPresentationStatus()).topics.filter(x=>x.pending&&(!topicId||x.topicId===topicId)).slice(0,maxTopics).map(x=>x.topicId):[];
  const initial=await this.s.foundationWrite(async t=>{const p=await t.get('meta',CURRENT),current=p&&await t.get('meta',ROW+p.actionId);if(active(current))reject('REQUEST_ALREADY_IN_FLIGHT');for(const key of ['originalProviderRequest','aiPresentationRequest']){const pointer=await t.get('meta',key+'Current'),row=pointer&&await t.get('meta',key+':'+pointer.requestId);if(['prepared','sent','response_received','validated'].includes(row?.state))reject('REQUEST_ALREADY_IN_FLIGHT');}const row={id:ROW+id,kind,state:this.stopped?'stopped':'running',maxRequests,maxInputs,maxTopics,topicIds,dispatchedTopicIds:[],requestsReserved:0,inputsReserved:0,completedInputs:0,completedTopics:0,startedAt:this.s.clock(),updatedAt:this.s.clock()};await t.put('meta',row);await t.put('meta',{id:CURRENT,actionId:id});return row;});
  let progress=initial;
  for(let batch=0;batch<maxRequests;batch++){
   if(this.stopped||progress.state!=='running')break;
   if(kind==='original'&&progress.inputsReserved>=maxInputs||kind==='ai'&&batch>=topicIds.length)break;
   const result=kind==='original'?await this.original.wake({userActionId:id+':'+batch,boundedActionId:id,batchLimit:Math.min(this.original.batchLimit,maxInputs-progress.inputsReserved)}):await this.ai.wake({userActionId:id+':'+batch,boundedActionId:id,topicId:topicIds[batch]});
   if(this.stopped)break;
   if(result.error){const state=result.error==='BUDGET_EXCEEDED'?'budget_limited':result.error==='OUTCOME_UNKNOWN'?'outcome_unknown':['CREDENTIAL_FAILURE','NO_CREDENTIAL','INVALID_CREDENTIAL'].includes(result.error)?'credential_missing':'failed';return await this.patch(id,{state,error:result.error});}
   progress=await this.patch(id,{});
   if(result.result?.manualInputCount)return await this.patch(id,{state:'partial',error:'PARTIAL_RESULT'});
   if(kind==='original'&&(!result.pending||!result.providerRequestCount))break;
  }
  return await this.patch(id,{state:this.stopped?'stopped':'completed'});
 }catch(error){const code=['BUDGET_EXCEEDED','REQUEST_ALREADY_IN_FLIGHT','CANCELLED'].includes(error?.code)?error.code:'STORAGE_FAILED';const row=await this.patch(id,{state:'failed',error:code}).catch(()=>null);return row||{state:'failed',error:code};}}
 async stop(){this.stopped=true;const id=this.currentId;if(id)await this.patch(id,{state:'stopped',error:'CANCELLED'});await Promise.all([this.original.stop('CANCELLED'),this.ai.stop()]);return this.status();}
}
