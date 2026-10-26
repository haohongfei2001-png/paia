import {bindMaintenanceProcessingRawDenials,assertMaintenanceProcessingRawDenialFacts} from './maintenance-processing-denial.js';
import {captureMaintenanceIdentityLifecycleSelection,readMaintenanceTopicIdentityPermit} from './local-maintenance-session.js';
import {prefix} from '../thought-model.js';
import {ArchiveError} from '../constants.js';
import {TopicLifecycleDispatch} from '../topic-lifecycle-dispatch.js';
import {contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {requireRepositoryTransactionScope,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {canonical,equal,fail,opaque} from './contracts.js';

// An explicit, dormant candidate, not a scheduler or installed grant/default.
export const TOPIC_IDENTITY_LIFECYCLE_POLICY=Object.freeze({version:'personal-topic-activity-v1',inactivityMs:90*24*60*60*1000,maxTopics:16});
export function createTopicIdentityLifecycleDispatch(session,store,handle,{previousObservedAt=null}={}){
 return new TopicLifecycleDispatch(store,captureMaintenanceIdentityLifecycleSelection(session,store,handle),{policy:TOPIC_IDENTITY_LIFECYCLE_POLICY,previousObservedAt});
}
const issuers=new WeakMap(),receipts=new WeakMap(),grantRequests=new WeakMap(),workStops=new WeakMap(),aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const abort=AbortController.prototype.abort,add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
const wall=Date.now.bind(Date),mono=performance.now.bind(performance),need=value=>{if(!value)fail('UNAVAILABLE');};
function data(object,key){const descriptor=object&&Object.getOwnPropertyDescriptor(object,key);need(descriptor&&Object.hasOwn(descriptor,'value'));return descriptor.value;}
function shape(value,fields){need(value&&[Object.prototype,null].includes(Object.getPrototypeOf(value)));const keys=Reflect.ownKeys(value);need(keys.length===fields.length&&keys.every(k=>fields.includes(k)));return Object.fromEntries(fields.map(key=>[key,data(value,key)]));}
function project(value,fields){if(value===null||value===undefined)return null;const out={};for(const key of fields){const d=Object.getOwnPropertyDescriptor(value,key);if(d){need(Object.hasOwn(d,'value'));const v=d.value;need(v===null||['string','number','boolean'].includes(typeof v)||v===undefined);out[key]=v;}}return out;}
const lists=(row,key)=>{const value=data(row,key);need(Array.isArray(value)&&value.length<=20&&value.every(opaque)&&new Set(value).size===value.length);return [...value].sort();};
function inputState(row){return row?{...project(row,['id','contentRevision','removalState','sourcePurged','lastRemovalSequence']),sourceRecordIds:lists(row,'sourceRecordIds')}:null;}
function inputIndex(row){return row?{...project(row,['id','excluded']),recordIds:lists(row,'recordIds')}:null;}
function topicMetadata(row){const result=project(row,['id','revision','lifecycle','redirectTo','layoutJobId','pinKey']);if(!result)return null;const protections=Object.getOwnPropertyDescriptor(row,'protections');if(protections){need(Object.hasOwn(protections,'value'));result.locks={};for(const key of ['keep','lifecycle']){const d=Object.getOwnPropertyDescriptor(protections.value||{},key);if(d){need(Object.hasOwn(d,'value'));result.locks[key]=project(d.value,['locked']);}}}return result;}
function ownerFacts(r,f){
 need(!r.disposed&&data(r.store,'repository')===r.repository&&data(r.repository,'db')===r.database&&!f.closed);
 for(const key of ['acquire','read','release'])need(data(r.grantOwner,key)===r.methods[key]);
 f.permit.current();assertContextScopeWorkBudgetFacts(f.permit.budget,{database:r.database});
 const at=wall(),tick=mono();need(Number.isSafeInteger(at)&&Number.isFinite(tick)&&at>=f.lastWall&&tick>=f.lastMono&&at<f.expiresAt&&tick<f.monoDeadline);f.lastWall=at;f.lastMono=tick;
 need(!aborted.call(f.controller.signal)&&!aborted.call(f.permit.signal));return true;
}
function grantFacts(r,f){
 ownerFacts(r,f);need(f.grant);
 const facts=shape(r.methods.read.call(r.grantOwner,f.grant),['purpose','store','caller','selection','restoreEpoch','generation','expiresAt','revocationSignal','denial']);
 need(facts.purpose==='personal-topic-identity'&&facts.store===r.store&&facts.caller===r.caller&&facts.selection===f.permit.selection&&facts.restoreEpoch===f.restoreEpoch&&opaque(facts.generation)&&Number.isSafeInteger(facts.expiresAt)&&facts.expiresAt>wall()&&facts.revocationSignal instanceof AbortSignal&&!aborted.call(facts.revocationSignal));
 if(f.facts)for(const key of Object.keys(facts))need(facts[key]===f.facts[key]);else{f.facts=Object.freeze(facts);f.witness=Object.freeze(Object.create(null));bindMaintenanceProcessingRawDenials(f.witness,r.store,[facts.denial],[f.permit.fieldReceipt]);}
 ownerFacts(r,f);assertMaintenanceProcessingRawDenialFacts(f.witness,r.store);return facts;
}
function closeFamily(r,f){if(f.closed)return;f.closed=true;try{fail('UNAVAILABLE');}catch(error){f.rejectStop?.(error);}clearTimeout(f.timer);for(const [signal,listener]of f.listeners)remove.call(signal,'abort',listener);f.listeners=[];abort.call(f.controller);if(f.grant){const grant=f.grant;f.grant=null;try{r.methods.release.call(r.grantOwner,grant);}catch{}}r.retiredSelections.add(f.permit.selection);if(!f.acquiring)r.families.delete(f.permit.selection);}
function current(r,f){try{return grantFacts(r,f);}catch(error){closeFamily(r,f);throw error;}}
// These are fixed metadata projections. IDB physically returns full Topic and
// metadata rows; this issuer never reads/hashes/copies their semantic fields.
// The independent original field gate still reads/hashes selected Input bodies.
async function policy(r,f,transaction,scope,p){
 const t=contextScopeTransactionReader(r.store,transaction,p.budget),checks=[];
 const get=async(table,key,projector)=>{current(r,f);const row=projector(await t.get(table,key));current(r,f);checks.push({table,key,projector,row});return row;};
 need((await get('meta','recovery-restore-epoch',r=>r?project(r,['value']):null))?.value===scope.restoreEpoch||scope.restoreEpoch===null&&checks.at(-1).row===null);
 const config=await get('meta','memory:config',r=>project(r,['localOnly']));need(config?.localOnly===undefined||config.localOnly===false);
 const sources=new Set();for(const id of scope.inputIds){
  const state=await get('inputStates',id,inputState),index=await get('blockIndex',id,inputIndex);
  need(state?.id===id&&index?.id===id&&state.removalState==='active'&&state.sourcePurged!==true&&index.excluded===false&&state.contentRevision===p.fieldScope.inputs.find(i=>i.inputId===id)?.revision&&equal(state.sourceRecordIds,index.recordIds)&&state.sourceRecordIds.every(id=>p.fieldScope.sources.some(s=>s.sourceRecordId===id)));
  for(const source of state.sourceRecordIds)sources.add(source);
 }
 need(sources.size<=20);for(const id of sources){
  const source=await get('recordIndex',id,r=>project(r,['id','sourceKey','dedupeKey']));need(source?.id===id&&opaque(source.sourceKey)&&opaque(source.dedupeKey));
  for(const [prefix,key]of [['source:',source.sourceKey],['snapshot:',source.dedupeKey]])need(await get('tombstones',prefix+key,row=>row===null||row===undefined?null:true)===null);
  current(r,f);const count=await t.count('records',null,IDBKeyRange.only(id));current(r,f);need(count===1);checks.push({table:'records',key:id,count:1});
 }
 for(const id of scope.topicIds){const original=await t.get('topics',id),row=topicMetadata(original);current(r,f);
  // A selected Section is not a grant over its containing Topic. Count first;
  // an incomplete cut never enumerates or inspects a sibling Entry.
  if(p.expectedTopic.entryIds){const range=prefix([id,data(original,'activeLayoutGeneration'),0]),count=await t.count('placements','byTopicOrder',range);current(r,f);if(count!==p.expectedTopic.entryIds.size){const error=new ArchiveError('TOPIC_ACTIVITY_DEFERRED');error.reason='incomplete_activity';throw error;}const members=await t.all('placements','byTopicOrder',range);current(r,f);need(members.length===count&&members.every(member=>p.expectedTopic.entryIds.has(data(member,'entryId'))&&data(member,'lifecycle')==='active'&&project(member,['excludedByUser']).excludedByUser!==true));}
  need(row?.id===id&&id===p.expectedTopic.id&&row.revision===p.expectedTopic.expectedRevision&&row.lifecycle==='active'&&!row.redirectTo&&!row.layoutJobId&&row.pinKey!==0&&!row.locks?.keep?.locked&&!row.locks?.lifecycle?.locked);}
 if(requireRepositoryTransactionScope(r.repository,p.transaction).mode==='readwrite')registerRepositoryFinalReadFence(r.repository,p.transaction,{isCurrent:()=>{current(r,f);return true;},plan:function*(){
  current(r,f);for(const check of checks){need(p.budget.reads<CONTEXT_TOPIC_SCOPE_LIMITS.reads);p.budget.reads++;const value=yield check.count===1?{method:'count',table:check.table,key:IDBKeyRange.only(check.key)}:{method:'get',table:check.table,key:check.key};current(r,f);if(!(check.count===1?value===1:equal(check.projector(value),check.row))){closeFamily(r,f);fail('UNAVAILABLE');}}return true;
 }});
 current(r,f);
}
export function createTopicIdentitySourceProcessing({store,caller,grantOwner}){
 need(store?.repository&&caller&&Object.isFrozen(caller)&&grantOwner&&Object.isFrozen(grantOwner));
 const methods=shape(grantOwner,['acquire','read','release']);need(Object.values(methods).every(v=>typeof v==='function'));
 const r={store,repository:store.repository,database:store.repository.db,caller,grantOwner,methods,disposed:false,families:new Map(),executions:new Set(),workStops:new Set(),retiredSelections:new WeakSet(),processing:null};
 const processing=Object.freeze({
  async resolve(transaction,scope,permit){
   assertTopicIdentitySourceProcessing(processing,store,caller);
   const p=readMaintenanceTopicIdentityPermit(permit,store,transaction,processing,scope),s=shape(scope,['version','purpose','binding','restoreEpoch','inputIds','topicIds']);
   need(s.restoreEpoch===p.restoreEpoch&&p.fieldScope.restoreEpoch===(p.restoreEpoch??'initial'));
   need(s.version===1&&s.purpose==='personal-topic-identity'&&p.caller===caller&&s.binding.operationId===p.operationId&&s.binding.mode==='topic_activity'&&s.inputIds.length<=20&&s.topicIds.length<=8&&s.topicIds.every(id=>id===p.expectedTopic.id)&&s.inputIds.every(id=>p.expectedTopic.inputIds.has(id)));
   need(!r.retiredSelections.has(p.selection));let f=r.families.get(p.selection);
   if(!f){need(r.families.size<8);f={permit:p,restoreEpoch:s.restoreEpoch,grant:null,facts:null,controller:new AbortController(),closed:false,lastWall:wall(),lastMono:mono(),expiresAt:p.deadline,monoDeadline:p.monoDeadline,listeners:[],timer:null,pending:null,rejectStop:null,epoch:crypto.randomUUID()};f.stopped=new Promise((_,reject)=>{f.rejectStop=reject;});f.stopped.catch(()=>{});r.families.set(p.selection,f);
    const stop=()=>closeFamily(r,f);add.call(p.signal,'abort',stop,{once:true});f.listeners.push([p.signal,stop]);
    f.timer=setTimeout(stop,Math.max(1,Math.ceil(Math.min(f.expiresAt-wall(),f.monoDeadline-mono()))));f.timer?.unref?.();
   }
   try{ownerFacts(r,f);need(s.restoreEpoch===f.restoreEpoch);
    if(!f.pending)f.pending=(async()=>{f.acquiring=true;const request=Object.freeze({purpose:'personal-topic-identity',store,caller,selection:p.selection,restoreEpoch:s.restoreEpoch,inputIds:Object.freeze([...new Set(p.selectedTopics.flatMap(x=>x.scope.map(i=>i.inputId)))]),topicIds:Object.freeze(p.selectedTopics.map(x=>x.id)),expiresAt:f.expiresAt,signal:f.controller.signal});grantRequests.set(request,{r,f,p});let grant;try{grant=await methods.acquire.call(grantOwner,request);}finally{f.acquiring=false;if(f.closed)r.families.delete(p.selection);}
     if(f.closed){methods.release.call(grantOwner,grant);fail('UNAVAILABLE');}f.grant=grant;need(grant&&typeof grant==='object'&&Object.isFrozen(grant)&&Reflect.ownKeys(grant).length===0);const facts=grantFacts(r,f);f.expiresAt=Math.min(f.expiresAt,facts.expiresAt);f.monoDeadline=Math.min(f.monoDeadline,f.lastMono+f.expiresAt-f.lastWall);const stop=()=>closeFamily(r,f);add.call(facts.revocationSignal,'abort',stop,{once:true});f.listeners.push([facts.revocationSignal,stop]);current(r,f);})();
    await Promise.race([f.pending,f.stopped]);current(r,f);await policy(r,f,transaction,scope,p);current(r,f);
    const raw=Object.freeze({version:1,store,caller,scope,epoch:f.epoch,processing:true,expiresAt:f.expiresAt,revocationSignal:f.controller.signal});bindMaintenanceProcessingRawDenials(raw,store,[f.facts.denial],[p.fieldReceipt]);receipts.set(raw,{r,f,p,scopeKey:canonical(scope)});return raw;
   }catch(error){closeFamily(r,f);throw error;}
  },
  isCurrent(raw,s){const held=receipts.get(raw);if(!held||held.r!==r||s!==store)return false;try{current(r,held.f);held.p.current();need(canonical(raw.scope)===held.scopeKey);assertMaintenanceProcessingRawDenialFacts(raw,store);return true;}catch{return false;}}
 });r.processing=processing;issuers.set(processing,r);return processing;
}
export function assertTopicIdentitySourceProcessing(processing,store,caller){const r=issuers.get(processing);need(r&&!r.disposed&&r.store===store&&r.caller===caller&&store.repository===r.repository);if(r.database==null&&r.repository.db!=null)r.database=r.repository.db;need(r.repository.db===r.database);return true;}
export function disposeTopicIdentitySourceProcessing(processing,store){const r=issuers.get(processing);need(r&&r.store===store);r.disposed=true;for(const f of [...r.families.values()])closeFamily(r,f);}

// Only the original consumer records this request immediately before acquire.
// A copied request, owner, transaction, selector or action is never accepted.
export function readTopicIdentityProcessingGrantRequest(request,owner,store,caller){const held=grantRequests.get(request);need(held&&held.r.grantOwner===owner&&held.r.store===store&&held.r.caller===caller&&held.f.permit===held.p);ownerFacts(held.r,held.f);return held.p;}

// Exact original lifecycle/preparation lifetime, not a quiescence guess. A
// disable retains its synchronous deny, then waits for these actual promises
// (including native transaction unwind) before writing its saved OFF state.
export function runTopicIdentitySourceWork(processing,store,action){const r=issuers.get(processing);need(r&&r.store===store&&!r.disposed&&r.workStops.size===0&&typeof action==='function'&&r.executions.size<8);const pending=(async()=>await action())();r.executions.add(pending);const settled=()=>r.executions.delete(pending);pending.then(settled,settled);return pending;}
export async function settleTopicIdentitySourceWork(processing,store){const r=issuers.get(processing);need(r&&r.store===store);await Promise.allSettled([...r.executions]);need(r.executions.size===0);}

export function holdTopicIdentitySourceWork(processing,store){const r=issuers.get(processing);need(r&&r.store===store);const token=Object.freeze(Object.create(null));workStops.set(token,r);r.workStops.add(token);return token;}
export function releaseTopicIdentitySourceWork(processing,store,token){const r=issuers.get(processing);need(r&&r.store===store&&workStops.get(token)===r&&r.workStops.has(token));r.workStops.delete(token);workStops.delete(token);}
