import {BrowserNativeSyncCore,validateOperation,acceptSequence,requireOriginalTopicActivityCoreMethods} from './core.js';
import {clone,equal,fail,bytes} from './value.js';
import {topicActivityIdentity} from './topic-activity-codec.js';
import {topicLifecyclePolicy,evaluateTopicInactivity} from '../topic-lifecycle-policy.js';
import {requireOriginalTopicLifecycleService,captureOriginalTopicActivityIdentity,requireOriginalTopicActivityTransition,runOriginalTopicActivityReceive} from '../topic-lifecycle.js';
import {assertTopicProcessingReadFacts} from '../topic-processing.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods,registerRepositoryFinalReadFence} from '../idb-repository.js';

const journals=new WeakMap(),owners=new WeakMap(),prepared=new WeakMap(),applications=new WeakMap(),incoming=new WeakMap();
const refuse=()=>fail('BNS_TOPIC_ACTIVITY_OWNER_REQUIRED');
function current(r){requireOriginalTopicLifecycleService(r.service);requireOriginalTopicActivityCoreMethods(r.core);if(r.service.store!==r.store||r.store.repository!==r.repository||r.core.repository!==r.repository||r.core.datasetId!==r.datasetId||r.core.fixedNamespace!==r.fixedNamespace||journals.get(r.service)!==r)refuse();}
const clock=p=>{if(performance.now()-p.started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');};
function retain(p,value){p.bytes+=bytes(value).length;if(p.bytes>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');clock(p);return value;}
// Explicit construction only: no background, setting, default policy or grant.
// It records inactivity on an existing original Topic; it cannot create a Topic.
export class TopicActivitySyncJournal {
 constructor(service,core){const store=requireOriginalTopicLifecycleService(service);if(!(core instanceof BrowserNativeSyncCore)||store.repository!==core.repository||journals.has(service))refuse();requireOriginalTopicActivityCoreMethods(core);const r={service,store,core,repository:core.repository,datasetId:core.datasetId,fixedNamespace:core.fixedNamespace,busy:false};owners.set(this,r);journals.set(service,r);}
 close(){const r=owners.get(this);if(!r)return;if(r.busy)refuse();if(journals.get(r.service)===r)journals.delete(r.service);owners.delete(this);}
 async receive(input,{scope,policy,now,previousObservedAt=null,workBudget}={}){
  const heldScope=clone(scope),heldPolicy=topicLifecyclePolicy(policy),r=owners.get(this);if(!r)refuse();current(r);const operation=await validateOperation(input);if(operation.type!=='topicActivity'||operation.datasetId!==r.datasetId)refuse();if(!equal(heldPolicy,operation.value.policy))fail('BNS_TOPIC_ACTIVITY_POLICY_REQUIRED');if(!evaluateTopicInactivity({policy:heldPolicy,now,previousObservedAt,activityAt:'1970-01-01T00:00:00.000Z'}).eligible||operation.value.observedAt>now)fail('BNS_TOPIC_ACTIVITY_CLOCK_REQUIRED');
  const request={id:operation.entityId,to:'dormant',expectedRevision:operation.value.before.revision,operationId:operation.value.domainOperationId,scope:heldScope};
  incoming.set(request,{r,operation});try{return await runOriginalTopicActivityReceive(r.service,request,{policy:heldPolicy,now,previousObservedAt,workBudget});}finally{incoming.delete(request);}
 }
}
export async function prepareOriginalTopicActivity(service,originalRequest,request,activity){
 const r=journals.get(service);if(!r)return null;current(r);if(r.busy)fail('BNS_TOPIC_ACTIVITY_BUSY');r.busy=true;
 const p={r,started:performance.now(),bytes:0,readFacts:null,request:clone(request)};
 try{
  const remote=incoming.get(originalRequest);if(remote&&remote.r!==r)refuse();p.incoming=remote?.operation??null;
  const marker=await r.core.read('topicActivityReceipt',request.operationId);retain(p,marker??null);
  if(marker){
   const held=await duplicateSnapshot(r,request.operationId,p),op=await validateOperation(held.revision?.operation);checkDuplicate(held,op,request,r);
   if(!equal(op.value.policy,activity.policy)||op.value.observedAt!==(remote?.operation.value.observedAt??activity.now)||op.value.previousObservedAt!==((remote?remote.operation.value.previousObservedAt:activity.previousObservedAt))||remote&&!equal(remote.operation,op))fail('BNS_TOPIC_ACTIVITY_CHANGED');p.duplicate=true;p.operation=op;p.duplicateSnapshot=held;
  }else{
   const view=await captureOriginalTopicActivityIdentity(service,request,activity);p.readFacts=view.readFacts;retain(p,view.before);
   if(!view.before||view.before.revision!==request.expectedRevision)fail('BNS_TOPIC_ACTIVITY_CHANGED');
   const value={id:request.id,version:1,domainOperationId:request.operationId,before:view.before,policy:clone(activity.policy),observedAt:remote?.operation.value.observedAt??activity.now,previousObservedAt:(remote?remote.operation.value.previousObservedAt:activity.previousObservedAt),transitionAt:remote?.operation.value.transitionAt??r.store.clock()};
   const head=await r.core.read('head','topicActivity',request.id);p.previousHead=retain(p,head??null);let parents=[];if(head){if(head.purged||head.revisions?.length!==1)fail('BNS_TOPIC_ACTIVITY_CAUSAL_BASE_REQUIRED');const previousRow=await r.core.read('revision',head.revisions[0]),previous=await validateOperation(previousRow?.operation),formationHead=await r.core.read('head','topicFormation',request.id),formationRow=formationHead?.revisions?.length===1?await r.core.read('revision',formationHead.revisions[0]):null,formation=formationRow?await validateOperation(formationRow.operation):null;if(previous.type!=='topicActivity'||previous.entityId!==request.id||!formation||formation.type!=='topicFormation'||formation.entityId!==request.id||formationHead.purged||formation.value.activityRevision!==previous.revisionId||formation.value.before.revision!==previous.value.before.revision+1||view.before.revision!==formation.value.before.revision+1||view.before.organizationRevision!==formation.value.before.organizationRevision+1)fail('BNS_TOPIC_ACTIVITY_CAUSAL_BASE_REQUIRED');const formationMarker=await r.core.read('topicFormationReceipt',formation.value.domainOperationId),formationReceipt=await r.core.read('receipt',formation.operationId),formationDomain=await r.store.repository.transaction(false,t=>t.get('operationReceipts',formation.value.domainOperationId),['operationReceipts']),withoutId=row=>{if(!row)return null;const{id,...v}=row;return v;};if(!equal(withoutId(formationMarker),{revisionId:formation.revisionId,operationId:formation.operationId,result:formation.value.result})||!equal(withoutId(formationReceipt),{digest:formation.revisionId,deviceId:formation.deviceId,sequence:formation.sequence})||!formationDomain||!equal(formationDomain.result,formation.value.result))fail('BNS_TOPIC_ACTIVITY_CAUSAL_BASE_REQUIRED');parents=[previous.revisionId];value.reactivationRevision=formation.revisionId;p.causal=retain(p,{previousRow,formationHead,formationRow,formationMarker,formationReceipt,formationDomain});}
   if(remote){if(!equal(remote.operation.value,value)||!equal(remote.operation.parents,parents))fail('BNS_TOPIC_ACTIVITY_CHANGED');p.operation=remote.operation;}
   else{p.local=await r.core.prepare([{type:'topicActivity',expectedParents:parents,value}],{actor:'activity'});p.operation=p.local.operations[0];}retain(p,p.operation);assertTopicProcessingReadFacts(p.readFacts,r.store);
  }
  const cap=Object.freeze({transitionAt:p.operation.value.transitionAt});prepared.set(cap,p);return cap;
 }catch(error){r.busy=false;throw error;}
}
// A duplicate is checked again after the original domain receipt settles, in
// one read transaction. It is not proof merely because one mapping exists.
async function duplicateSnapshot(r,domainId,p){return r.core.transaction(false,async t=>{
 const read=async(kind,...ids)=>retain(p,await r.core.get(t,kind,...ids)??null);
 const marker=await read('topicActivityReceipt',domainId);if(marker&&(!/^[a-f0-9]{64}$/.test(marker.revisionId)||Object.keys(marker).sort().join(',')!=='id,operationId,result,revisionId'))fail('BNS_TOPIC_ACTIVITY_CHANGED');const revision=marker?await read('revision',marker.revisionId):null,op=revision?.operation;
 return {marker:marker??null,revision:revision??null,domain:retain(p,await t.get('operationReceipts',domainId)??null),head:op?await read('head',op.type,op.entityId):null,receipt:op?await read('receipt',op.operationId):null,sequence:op?await read('sequence',op.deviceId,String(op.sequence).padStart(16,'0')):null,entityRevision:op?await read('entityRevision',op.type,op.entityId,op.revisionId):null};
 },['meta','operationReceipts']);}
function checkDuplicate(held,op,request,r){
 if(op.type!=='topicActivity')fail('BNS_TOPIC_ACTIVITY_CHANGED');
 const result={id:request.id,revision:op.value.before.revision+1,lifecycle:'dormant'},withoutId=row=>{if(!row)return null;const {id,...value}=row;return value;};
 if(op.type!=='topicActivity'||op.datasetId!==r.datasetId||op.value.domainOperationId!==request.operationId||op.entityId!==request.id||!equal(withoutId(held.marker),{revisionId:op.revisionId,operationId:op.operationId,result})||!equal(withoutId(held.revision),{operation:op,redacted:false})||!equal(withoutId(held.head),{type:op.type,entityId:op.entityId,revisions:[op.revisionId],purged:false,fence:null})||!equal(withoutId(held.receipt),{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence})||!equal(withoutId(held.sequence),{operationId:op.operationId,digest:op.revisionId})||!equal(withoutId(held.entityRevision),{revisionId:op.revisionId})||held.domain?.id!==request.operationId||!equal(held.domain?.result??null,result))fail('BNS_TOPIC_ACTIVITY_CHANGED');
}
export async function completeOriginalTopicActivity(cap,result){
 if(!cap)return result;const p=prepared.get(cap);if(!p)refuse();current(p.r);clock(p);if(p.duplicate){const held=await duplicateSnapshot(p.r,p.request.operationId,p);checkDuplicate(held,p.operation,p.request,p.r);if(!equal(held,p.duplicateSnapshot)||!equal(result,held.domain.result))fail('BNS_TOPIC_ACTIVITY_CHANGED');}return result;
}
export function releaseOriginalTopicActivity(cap){if(!cap)return;const p=prepared.get(cap);if(p){p.r.busy=false;prepared.delete(cap);}}
export function requireOriginalTopicActivityProtocolOwner(t,core,operation,origin){const a=applications.get(t);if(!a||a.core!==core||a.operation!==operation||a.origin!==origin||a.scope!==requireRepositoryTransactionScope(core.repository,t))refuse();current(a.p.r);clock(a.p);requireRepositoryTransactionDataMethods(core.repository,t);}
async function protocolIntent(t,p){
 const {core}=p.r,op=p.operation,{type,entityId,revisionId,operationId,deviceId,sequence}=op;
 if(!equal(await core.get(t,'head',type,entityId)??null,p.previousHead)||await core.get(t,'revision',revisionId)||await core.get(t,'receipt',operationId)||await core.get(t,'sequence',deviceId,String(sequence).padStart(16,'0')))fail('BNS_TOPIC_ACTIVITY_CONFLICT');
 const frontier=await core.get(t,'frontier',deviceId),generation=await core.get(t,'generation'),device=deviceId===core.deviceId?await core.get(t,'device',deviceId):null,next=acceptSequence(frontier?{frontier:frontier.frontier,ranges:frontier.ranges}:null,sequence);
 const values=[['head',[type,entityId],{type,entityId,revisions:[revisionId],purged:false,fence:null}],['revision',[revisionId],{operation:op,redacted:false}],['receipt',[operationId],{digest:revisionId,deviceId,sequence}],['sequence',[deviceId,String(sequence).padStart(16,'0')],{operationId,digest:revisionId}],['entityRevision',[type,entityId,revisionId],{revisionId}],['frontier',[deviceId],{...next,deviceId}],['generation',[],{value:(generation?.value||0)+1}],['topicActivityReceipt',[op.value.domainOperationId],{revisionId,operationId,result:{id:entityId,revision:op.value.before.revision+1,lifecycle:'dormant'}}]];
 if(deviceId===core.deviceId)values.push(['device',[deviceId],{sequence:Math.max(device?.sequence||0,sequence)}]);
 values.push(['outbox',[operationId],p.incoming?null:{operationId,revisionId,state:'queued'}]);
 const points=[];for(const [kind,ids,value]of values){const id=await core.idIn(t,kind,...ids);points.push([id,value===null?null:{...value,id}]);}
 for(const [kind,ids]of [['pending',[operationId]],['entityPending',[type,entityId,operationId]],['quarantine',[operationId]]]){const id=await core.idIn(t,kind,...ids);if(await t.get('meta',id))fail('BNS_TOPIC_ACTIVITY_CONFLICT');points.push([id,null]);}
 points.push([await core.idIn(t,'head',type,entityId),{id:await core.idIn(t,'head',type,entityId),type,entityId,revisions:[revisionId],purged:false,fence:null}]);if(p.causal){for(const[k,ids,row]of [['revision',[op.parents[0]],p.causal.previousRow],['head',['topicFormation',entityId],p.causal.formationHead],['revision',[op.value.reactivationRevision],p.causal.formationRow],['topicFormationReceipt',[p.causal.formationRow.operation.value.domainOperationId],p.causal.formationMarker],['receipt',[p.causal.formationRow.operation.operationId],p.causal.formationReceipt]]){if(!equal(await core.get(t,k,...ids)??null,row))fail('BNS_TOPIC_ACTIVITY_CHANGED');points.push([await core.idIn(t,k,...ids),row]);}}retain(p,points);return points;
}
export async function commitOriginalTopicActivity(service,t,cap){
 const p=prepared.get(cap);if(!p||p.r.service!==service||p.duplicate)refuse();const {r}=p;current(r);clock(p);assertTopicProcessingReadFacts(p.readFacts,r.store);
 const actual=requireOriginalTopicActivityTransition(service,t),op=p.operation;if(!equal(actual.request,p.request)||!equal(actual.before,op.value.before)||actual.after.id!==op.entityId||actual.after.lifecycle!=='dormant'||actual.after.revision!==actual.before.revision+1||actual.after.organizationRevision!==actual.before.organizationRevision+1||actual.after.identityRevision!==actual.before.identityRevision+1)fail('BNS_TOPIC_ACTIVITY_CHANGED');
 if(p.causal&&!equal(await t.get('operationReceipts',p.causal.formationDomain.id)??null,p.causal.formationDomain))fail('BNS_TOPIC_ACTIVITY_CHANGED');const expectedTopic=retain(p,clone({metadata:actual.after,identity:actual.identity})),points=await protocolIntent(t,p),scope=requireRepositoryTransactionScope(r.repository,t);applications.set(t,{core:r.core,operation:op,origin:p.incoming?'remote':'local',scope,p});
 try{if(p.incoming){const result=await r.core.applyInTransaction(t,op,{origin:'remote',materialize:false});if(result.state!=='applied')fail('BNS_TOPIC_ACTIVITY_CONFLICT');}else await r.core.commitPrepared(t,p.local,{materialize:false});}finally{applications.delete(t);}
 await r.core.put(t,'topicActivityReceipt',[op.value.domainOperationId],{revisionId:op.revisionId,operationId:op.operationId,result:{id:op.entityId,revision:op.value.before.revision+1,lifecycle:'dormant'}});
 for(const [key,row]of points)if(!equal(await t.get('meta',key)??null,row))fail('BNS_TOPIC_ACTIVITY_CHANGED');
 registerRepositoryFinalReadFence(r.repository,t,{isCurrent:()=>{current(r);clock(p);assertTopicProcessingReadFacts(p.readFacts,r.store);return true;},plan:function*(){if(p.causal&&!equal((yield{method:'get',table:'operationReceipts',key:p.causal.formationDomain.id})??null,p.causal.formationDomain))fail('BNS_TOPIC_ACTIVITY_CHANGED');const topic=yield {method:'get',table:'topics',key:op.entityId};if(!equal(topicActivityIdentity(topic),expectedTopic.metadata)||!equal(topic?.identity??null,expectedTopic.identity))fail('BNS_TOPIC_ACTIVITY_CHANGED');for(const [key,row]of points)if(!equal((yield {method:'get',table:'meta',key})??null,row))fail('BNS_TOPIC_ACTIVITY_CHANGED');return true;}});
}
