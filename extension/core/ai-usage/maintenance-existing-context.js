import {topicFormationMaintenanceReceipt} from '../topic-formation.js';
import {contextMaintenanceStagedItem,contextMaintenanceTransition} from '../context-maintenance.js';
import {rootReadAuthority} from '../organizer/root-read.js';
import {ContextCardsService,CONTEXT_LIMITS} from '../context-cards.js';
import {contextLineageReady,contextLineageAdmission,readableContextItems,fenceContextLineage,releaseContextLineage,lineageArray,lineageExact} from '../context-item-lineage.js';
import {createContextScopeWorkBudget,contextScopeTransactionReader,readContextScopeMetadata,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {inputProjection,readDependencyInputs} from '../thought-evidence.js';
import {MemoryService} from '../memory/service.js';
import {idOK} from '../thought-model.js';
import {equal,fail,opaque} from './contracts.js';

// Private, request-lifetime preparation only. No persisted schema, read grant,
// caller route, association writer or model-authored identity is introduced.
export const MAINTENANCE_EXISTING_CONTEXT_LIMITS=Object.freeze({items:32,inputs:20,sources:20,topics:8,memberships:100,contentBytes:96*1024,snapshotBytes:CONTEXT_LIMITS.bytes});
const plans=new WeakMap(),witnesses=new WeakMap(),bytes=x=>new TextEncoder().encode(JSON.stringify(x)).length;
const allEvidence=item=>[item.maintenance.provenance,item.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence);
const inputIdsFor=item=>[...new Set(allEvidence(item).map(e=>e.inputId).filter(idOK))].sort();
const relevant=(row,inputIds)=>row.items.filter(item=>item.origin==='automatic'&&allEvidence(item).some(e=>inputIds.includes(e.inputId))).sort((a,b)=>a.id.localeCompare(b.id));
const supported=(item,inputIds)=>item.lifecycle==='active'&&!item.protected&&!item.userEdited&&item.maintenance.provenance.evidence.every(e=>!e.kind&&!e.humanSection&&!e.humanTopic&&equal(e.selectedFields,['body'])&&inputIds.includes(e.inputId));
const scopeFor=(item,inputIds)=>({itemId:item.id,revision:item.revision,card:item.card,lifecycle:item.lifecycle,protected:item.protected,selectedFields:supported(item,inputIds)?['body','section',...(item.maintenance.temporal?['temporal']:[])]:[],inputIds:inputIdsFor(item)});
const frozen=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;};
function requirePlan(store,handle){const plan=plans.get(handle);if(!plan||plan.store!==store||plan.database!==store.repository.db||!contextLineageReady(store))fail('STALE_BASE');return plan;}
function current(held){
 if(plans.get(held.planHandle)!==held.plan||held.signal?.aborted||held.store.repository.db!==held.database||!contextLineageReady(held.store))fail('STALE_BASE');
 const r=held.processingReceipt;
 if(!lineageExact(r,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal'])||!Object.isFrozen(r)||r.version!==1||r.store!==held.store||!r.caller||!Object.isFrozen(r.caller)||!opaque(r.epoch)||r.processing!==true||!Number.isSafeInteger(r.expiresAt)||r.expiresAt<=Date.now()||!(r.revocationSignal instanceof AbortSignal)||r.revocationSignal.aborted||!equal(r.scope,held.processingScope))fail('UNAVAILABLE');
 // The callback belongs to the original LocalMaintenanceSession/constructor
 // processing owner. A promise or request boolean cannot certify currentness.
 const result=held.assertProcessing(r,held.store);if(result!==true){Promise.resolve(result).catch(()=>{});fail('UNAVAILABLE');}
 if(r.revocationSignal.aborted||held.signal?.aborted||r.expiresAt<=Date.now()||!equal(r.scope,held.processingScope))fail('UNAVAILABLE');
}
function requireWitness(store,handle){const held=witnesses.get(handle);if(!held||held.store!==store)fail('STALE_BASE');current(held);return held;}

// Call inside the original processing-request transaction before resolve().
// Only this finite metadata projection belongs in request.existingContextItems.
// The original row stays private, including withdrawn bodies, and is never a
// provider DTO. Keeping the exact row also catches unjournaled same-revision drift.
export async function planMaintenanceExistingContext(store,t,{epoch,inputIds}){
 if(!contextLineageReady(store)||!lineageArray(inputIds,MAINTENANCE_EXISTING_CONTEXT_LIMITS.inputs,1)||!inputIds.every(idOK)||new Set(inputIds).size!==inputIds.length)fail('INVALID_REQUEST');
 const selected=[...inputIds],admission=await contextLineageAdmission(store,t,epoch),row=await new ContextCardsService(store).row(t);
 if(!equal(selected,inputIds))fail('INVALID_REQUEST');const items=relevant(row,selected);
 if(items.length>MAINTENANCE_EXISTING_CONTEXT_LIMITS.items)fail('BUDGET_EXCEEDED');
 const handle=Object.freeze({}),plan={store,database:store.repository.db,epoch:admission.epoch,inputIds:[...inputIds].sort(),admission,items:structuredClone(items),scope:items.map(item=>scopeFor(item,inputIds))};
 plans.set(handle,plan);return handle;
}
export function maintenanceExistingContextScope(handle){const plan=plans.get(handle);if(!plan)fail('STALE_BASE');return frozen(structuredClone(plan.scope));}
// Original resolver's explicit empty scope can authorize ADD only. This private
// synchronous check neither refreshes a plan nor acquires any material.
export function assertMaintenanceExistingContextEmptyPlan(store,planHandle){const plan=requirePlan(store,planHandle);if(plan.items.length!==0||plan.scope.length!==0)fail('STALE_BASE');return true;}

// Record the actual original eligibility owners' dependency reads, not a
// provenance-only guess at their closure. All values stay local and the Context
// row is reduced to access metadata (the selected Items are compared separately).
// Key-only admission precedes membership values; Source unions are checked from
// metadata before inputProjection/readableEntry can acquire record bodies.
function snapshotReader(base,plan,budget){
 const rows=new Map(),sets=new Map(),queries=new Map();let retained=bytes({items:plan.items,rows:[],queries:[]});
 const charge=n=>{if(retained+n>MAINTENANCE_EXISTING_CONTEXT_LIMITS.snapshotBytes)fail('BUDGET_EXCEEDED');retained+=n;};charge(0);
 const add=(kind,id,limit)=>{const ids=sets.get(kind)||new Set();if(!ids.has(id)){if(ids.size>=limit)fail('BUDGET_EXCEEDED');ids.add(id);sets.set(kind,ids);}};
 const sources=ids=>{if(!lineageArray(ids,128)||!ids.every(idOK))fail('STALE_BASE');for(const id of ids)add('sources',id,MAINTENANCE_EXISTING_CONTEXT_LIMITS.sources);};
 const record=(name,id,value)=>{
  if(name==='blocks'&&value){add('inputs',id,MAINTENANCE_EXISTING_CONTEXT_LIMITS.inputs);const refs=value.value?.provenance;if(!lineageArray(refs,128)||!refs.every(p=>idOK(p?.sourceRecordId)))fail('STALE_BASE');sources(refs.map(p=>p.sourceRecordId));}
  if(['inputStates','thoughts','dependencies','provenance'].includes(name)&&value?.sourceRecordIds)sources(value.sourceRecordIds);
  if(name==='topics'&&value)add('topics',id,MAINTENANCE_EXISTING_CONTEXT_LIMITS.topics);
  const projected=name==='meta'&&id==='context-cards:v1'?value?{access:value.access}:null:value??null,key=JSON.stringify([name,id]),entry=[name,id,projected];
  if(rows.has(key)){if(!equal(rows.get(key),entry))fail('STALE_BASE');return;}
  charge(bytes(entry)+1);rows.set(key,structuredClone(entry));
 };
 const t=Object.create(base);
 t.get=async(name,id)=>{if(name==='records')add('sources',id,MAINTENANCE_EXISTING_CONTEXT_LIMITS.sources);const value=await base.get(name,id);record(name,id,value);return value;};
 t.has=async(name,id)=>{const value=await base.has(name,id),key=JSON.stringify(['has',name,id]);if(!rows.has(key)){const entry=['has',name,id,value];charge(bytes(entry)+1);rows.set(key,entry);}else if(rows.get(key)[3]!==value)fail('STALE_BASE');return value;};
 const rangeKey=(name,index,range)=>JSON.stringify([name,index??null,range?[range.lower??null,range.upper??null,!!range.lowerOpen,!!range.upperOpen]:null]);
 async function admitRange(name,index,range){
  if(name!=='placements')return;
  const key=rangeKey(name,index,range);if(queries.has(key))return;
  const count=await base.count(name,index,range);if(!Number.isSafeInteger(count)||count<0||count>MAINTENANCE_EXISTING_CONTEXT_LIMITS.memberships)fail('BUDGET_EXCEEDED');
  // Existing repository key reads are used only after the exact <=100 count.
  // Their union avoids counting shared membership twice across owner indexes.
  const keys=await base.keys(name,index,range);budget.reads+=1+keys.length;if(budget.reads>CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail('BUDGET_EXCEEDED');if(keys.length!==count||!keys.every(idOK))fail('STALE_BASE');
  for(const id of keys)add('memberships',id,MAINTENANCE_EXISTING_CONTEXT_LIMITS.memberships);
  charge(bytes([key,keys])+1);queries.set(key,keys);
 }
 t.scanPrimary=async(name,keyPrefix,consume)=>{await admitRange(name,null,IDBKeyRange.bound(keyPrefix,keyPrefix+'\uffff',false,true));return base.scanPrimary(name,keyPrefix,row=>{record(name,row.id,row);return consume(row);});};
 t.scanRange=async(name,index,range,consume)=>{await admitRange(name,index,range);return base.scanRange(name,index,range,row=>{record(name,row.id,row);return consume(row);});};
 t.all=async(name,index,range)=>{const found=[];await t.scanRange(name,index,range,row=>found.push(row));return found;};
 return {t,value:()=>({items:plan.items,rows:[...rows].sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v),queries:[...queries].sort(([a],[b])=>a.localeCompare(b))})};
}
async function snapshot(store,base,plan,budget,expectedItems=plan.items){
 const recorded=snapshotReader(base,{...plan,items:expectedItems},budget),t=recorded.t;
 const admission=await contextLineageAdmission(store,t,plan.epoch),row=await new ContextCardsService(store).row(t),items=relevant(row,plan.inputIds);
 if(!equal(items,expectedItems)||!equal(admission,plan.admission))fail('STALE_BASE');
 const filter=await t.get('meta','smart-filter'),memory=new MemoryService(store);
 const readInput=async id=>{
  // Bound the complete Source union before the original body reader starts.
  await t.get('blocks',id);await t.get('inputStates',id);await t.get('blockIndex',id);await t.get('filterInputs',id);
  const input=await inputProjection(store,t,id);if(!input||await store.isFiltered(t,input.block,filter)||!await memory.safeSources(t,input.sourceRecordIds))fail('STALE_BASE');
 };
 for(const id of plan.inputIds)await readInput(id);
 // Body-free negatives need only the exact selected Item and current Inputs.
 // Potential automatic body reads require the whole original eligibility graph,
 // including other Topics/Sections reached through shared Entry membership.
 const topicIds=[...new Set(plan.items.filter(item=>supported(item,plan.inputIds)).flatMap(allEvidence).map(e=>e.topicId))].sort();
 for(const topicId of topicIds){
  let scope;try{scope=await readContextScopeMetadata(store,t,topicId,admission);}catch(error){if(error?.code==='BUDGET_EXCEEDED'||error?.scopeReason==='scope_budget')fail('BUDGET_EXCEEDED');fail('UNAVAILABLE');}
  for(const entry of scope.entries){const current=await store.readableEntry(t,entry.id);await readDependencyInputs(store,t,current);await memory.safeSources(t,current.sourceRecordIds);}
  for(const inputId of scope.inputIds)await readInput(inputId);
 }
 // Preserve negative-only legacy restrictions even without a body candidate.
 if(!topicIds.length)await t.scanPrimary('meta','memory:',()=>{});
 return recorded.value();
}

/**
 * processingReceipt is the ORIGINAL session receipt, after resolve() has
 * explicitly accepted the extra exact existingContextItems scope. This helper
 * never calls another resolver or promotes an Input grant to an Item grant.
 * assertProcessing must synchronously recheck that same original receipt and
 * return true. read is the existing foundation/owner read callback.
 */
export async function captureMaintenanceExistingContext(store,planHandle,{processingReceipt,assertProcessing,read,limits,signal=null}){
 const plan=requirePlan(store,planHandle);
 if(typeof assertProcessing!=='function'||typeof read!=='function'||!limits||!Number.isSafeInteger(limits.maxContentBytes)||limits.maxContentBytes<1)fail('INVALID_REQUEST');
 const contentLimit=Math.min(limits.maxContentBytes,MAINTENANCE_EXISTING_CONTEXT_LIMITS.contentBytes),scope=processingReceipt?.scope;
 if(scope?.purpose!=='ai-maintenance-payload'||!Array.isArray(scope.inputs)||!equal(scope.inputs.map(i=>i.inputId).sort(),plan.inputIds)||!scope.inputs.every(i=>equal(i.selectedFields,['body']))||!scope.facets?.includes('context')||!equal(scope.existingContextItems,plan.scope))fail('UNAVAILABLE');
 const held={store,database:plan.database,plan,planHandle,processingReceipt,processingScope:structuredClone(scope),assertProcessing,signal,budget:createContextScopeWorkBudget({signal,database:plan.database}),lineage:null};
 current(held);
 try{
  held.snapshot=await read(transaction=>snapshot(store,contextScopeTransactionReader(store,transaction,held.budget),plan,held.budget));current(held);
  const candidates=plan.items.filter(item=>supported(item,plan.inputIds)),readable=await readableContextItems(store,candidates,{epoch:plan.epoch,expectedAuthority:plan.admission.authority,retainAuthoredCapture:true});
  held.lineage=readable.captured;current(held);if(readable.automaticEvaluation)fail(readable.automaticEvaluation.reason==='budget_exceeded'?'BUDGET_EXCEEDED':'UNAVAILABLE');
  const allowed=new Set(readable.items.map(item=>item.id));
  held.records=plan.items.map((item,index)=>{
   const state=item.lifecycle==='removed'?'removed':item.protected||item.userEdited?'protected':item.lifecycle==='invalidated'?'invalidated':allowed.has(item.id)?'available':'unavailable';
   return {ref:'c'+index,revision:item.revision,card:item.card,state,inputIds:inputIdsFor(item).filter(id=>plan.inputIds.includes(id)),...(state==='available'?{body:item.body,section:item.section,...(item.maintenance.temporal?{temporal:structuredClone(item.maintenance.temporal)}:{})}:{})};
  });
  if(bytes(held.records)>contentLimit)fail('BUDGET_EXCEEDED');
  const handle=Object.freeze({});witnesses.set(handle,held);
  try{await read(t=>assertMaintenanceExistingContext(store,t,handle));current(held);return handle;}catch(error){witnesses.delete(handle);throw error;}
 }catch(error){releaseContextLineage(held.lineage);throw error;}
}
export function readMaintenanceExistingContext(handle){const held=witnesses.get(handle);if(!held)fail('STALE_BASE');current(held);return frozen(structuredClone(held.records));}

// Private adapter-only identity lookup. Returned IDs are original stored facts,
// never accepted from a model response. Original maintain/noChange/invalidate
// owners still independently check operation, scope, evidence and revision.
export function resolveMaintenanceExistingContext(handle,ref){
 const held=witnesses.get(handle);if(!held)fail('STALE_BASE');current(held);
 const index=held.records.findIndex(record=>record.ref===ref);if(index<0)fail('INVALID_REQUEST');
 const item=held.plan.items[index];return frozen({ref,state:held.records[index].state,itemId:item.id,revision:item.revision,card:item.card,lifecycle:item.lifecycle,protected:item.protected,associationIds:[...item.maintenance.associationIds],provenance:structuredClone(item.maintenance.provenance),...(item.maintenance.invalidation?{invalidation:structuredClone(item.maintenance.invalidation)}:{})});
}
export async function assertMaintenanceExistingContext(store,transaction,handle,outcome=null){
 const held=requireWitness(store,handle),t=contextScopeTransactionReader(store,transaction,held.budget);
 await assertSettledContextReceipts(held,t);if(held.lineage)await fenceContextLineage(store,held.lineage,{transaction:t});
 const expected=outcome?{...held.snapshot,items:held.snapshot.items.map(item=>contextMaintenanceStagedItem(outcome,store,transaction,item)??item)}:held.snapshot;
 if(outcome&&!held.snapshot.items.some(item=>contextMaintenanceStagedItem(outcome,store,transaction,item)))fail('STALE_BASE');
 if(!equal(await snapshot(store,t,held.activePlan??held.plan,held.budget,expected.items),expected))fail('STALE_BASE');
 // Nothing asynchronous follows the owner's original currentness check.
 current(held);return true;
}
// The sent packet never changes. Only this exact original receipt-only Topic
// outcome may advance its two bookkeeping counters; all traced eligibility
// facts, grants, selected Items, bodies and request references remain exact.
async function topicTransitionExpected(held,proof,phase){
 const expected=structuredClone(held.snapshot),before=proof.before,after=proof[phase];
 for(const [id,key]of [['thought-sequence','thoughtSequence'],['backup-data-generation','backupGeneration']]){
  const row=expected.rows.find(r=>r[0]==='meta'&&r[1]===id);
  if(!row||(row[2]?.value??0)!==before[key])fail('STALE_BASE');row[2]={id,value:after[key]};
 }
 const authority=await rootReadAuthority({get:async(name,id)=>expected.rows.find(r=>r[0]===name&&r[1]===id)?.[2]??null});
 return {expected,plan:{...(held.activePlan??held.plan),admission:{...held.plan.admission,authority}}};
}
async function topicReceipt(t,result,proof){
 const receipt=await t.get('operationReceipts',proof.operationId);
 if(receipt?.namespace!=='thought-library'||receipt.digest!==proof.digest||receipt.operationSequence!==proof.staged.thoughtSequence||!equal(receipt.result,result))fail('STALE_BASE');
}
export function bindMaintenanceExistingContextTopicOperation(store,handle,childId,operationId){
 const held=requireWitness(store,handle);
 if(childId!==held.processingScope.childOperationId||!opaque(operationId)||held.topicOperationId&&held.topicOperationId!==operationId)fail('STALE_BASE');
 held.topicOperationId=operationId;
}
export async function assertMaintenanceExistingContextTopicStage(store,transaction,handle,result){
 const held=requireWitness(store,handle),proof=topicFormationMaintenanceReceipt(result,store,transaction);
 if(!proof||proof.operationId!==held.topicOperationId||proof.settled||held.topicSettled||held.pendingTopic||!equal(proof.inputIds,held.plan.inputIds)||!held.plan.items.some(item=>allEvidence(item).some(e=>e.topicId===proof.topicId)))fail('STALE_BASE');
 const t=contextScopeTransactionReader(store,transaction,held.budget),{expected,plan}=await topicTransitionExpected(held,proof,'staged');
 await topicReceipt(t,result,proof);
 if(!equal(await snapshot(store,t,plan,held.budget),expected))fail('STALE_BASE');current(held);
 const pending={result,proof};held.pendingTopic=pending;
 transaction.tx.addEventListener('abort',()=>{if(held.pendingTopic===pending)held.pendingTopic=null;},{once:true});return true;
}
export async function settleMaintenanceExistingContextTopic(store,handle,result,{read}){
 const held=requireWitness(store,handle),pending=held.pendingTopic,proof=topicFormationMaintenanceReceipt(result,store);
 if(typeof read!=='function'||!pending||pending.result!==result||!proof?.settled||held.topicSettled||!equal({...proof,settled:false},pending.proof))fail('STALE_BASE');
 const {expected,plan}=await topicTransitionExpected(held,proof,'committed');
 const check=async transaction=>{const t=contextScopeTransactionReader(store,transaction,held.budget);await topicReceipt(t,result,proof);if(!equal(await snapshot(store,t,plan,held.budget),expected))fail('STALE_BASE');current(held);};
 await read(check);current(held);
 const readable=await readableContextItems(store,held.plan.items.filter(item=>supported(item,held.plan.inputIds)),{epoch:plan.epoch,expectedAuthority:plan.admission.authority,retainAuthoredCapture:true});
 try{
  if(readable.automaticEvaluation||!equal(readable.items.map(i=>i.id).sort(),held.records.filter(r=>r.state==='available').map(r=>held.plan.items[held.records.indexOf(r)].id).sort()))fail('STALE_BASE');
  await read(check);current(held);
  releaseContextLineage(held.lineage);held.lineage=readable.captured;held.snapshot=expected;held.activePlan=plan;held.topicSettled=true;held.pendingTopic=null;return true;
 }catch(error){releaseContextLineage(readable.captured);throw error;}
}
// Sequential groups retain the original sent claims and processing receipt.
// Only an exact original Context outcome may advance one Item and this write's
// backup counter. No other changed Item, membership or authority fact is admitted.
export function bindMaintenanceExistingContextContextOperation(store,handle,childId,operationId,itemId){
 const held=requireWitness(store,handle),bound=held.contextOperation;
 if(childId!==held.processingScope.childOperationId||!opaque(operationId)||!held.snapshot.items.some(i=>i.id===itemId)||held.usedContextItems?.has(itemId)||held.usedContextOperations?.has(operationId)||bound&&(bound.operationId!==operationId||bound.itemId!==itemId))fail('STALE_BASE');
 held.contextOperation={operationId,itemId};
}
async function contextTransitionExpected(held,proof,phase){
 const {expected,plan}=await topicTransitionExpected(held,proof,phase),index=expected.items.findIndex(i=>i.id===proof.itemId);
 if(index<0||!equal(expected.items[index],proof.beforeItem))fail('STALE_BASE');expected.items[index]=structuredClone(proof.afterItem);
 return {expected,plan};
}
async function assertSettledContextReceipts(held,t){for(const receipt of held.contextReceipts||[])if(!equal(await t.get('operationReceipts',receipt.id),receipt))fail('STALE_BASE');}
async function contextReceipt(t,result,proof){
 const receipt=await t.get('operationReceipts','context-maintenance:'+proof.operationId);
 if(!equal(receipt,proof.receipt)||!equal(receipt?.result,result))fail('STALE_BASE');
}
export async function assertMaintenanceExistingContextContextStage(store,transaction,handle,result){
 const held=requireWitness(store,handle),proof=contextMaintenanceTransition(result,store,transaction),bound=held.contextOperation;
 if(!proof||proof.settled||held.pendingContext||!bound||bound.operationId!==proof.operationId||bound.itemId!==proof.itemId)fail('STALE_BASE');
 const t=contextScopeTransactionReader(store,transaction,held.budget),{expected,plan}=await contextTransitionExpected(held,proof,'staged');
 await assertSettledContextReceipts(held,t);await contextReceipt(t,result,proof);if(!equal(await snapshot(store,t,plan,held.budget,expected.items),expected))fail('STALE_BASE');current(held);
 const pending={result,proof};held.pendingContext=pending;
 transaction.tx.addEventListener('abort',()=>{if(held.pendingContext===pending)held.pendingContext=null;},{once:true});return true;
}
export async function settleMaintenanceExistingContextContext(store,handle,result,{read}){
 const held=requireWitness(store,handle),pending=held.pendingContext,proof=contextMaintenanceTransition(result,store);
 if(typeof read!=='function'||!pending||pending.result!==result||!proof?.settled||!equal({...proof,settled:false},pending.proof))fail('STALE_BASE');
 const {expected,plan}=await contextTransitionExpected(held,proof,'committed');
 const check=async transaction=>{const t=contextScopeTransactionReader(store,transaction,held.budget);await assertSettledContextReceipts(held,t);await contextReceipt(t,result,proof);if(!equal(await snapshot(store,t,plan,held.budget,expected.items),expected))fail('STALE_BASE');current(held);};
 await read(check);current(held);
 const readable=await readableContextItems(store,expected.items.filter(item=>supported(item,held.plan.inputIds)),{epoch:plan.epoch,expectedAuthority:plan.admission.authority,retainAuthoredCapture:true});
 try{
  const allowed=held.records.flatMap((record,index)=>record.state==='available'&&expected.items.find(i=>i.id===held.plan.items[index].id)?.lifecycle==='active'?[held.plan.items[index].id]:[]).sort();
  if(readable.automaticEvaluation||!equal(readable.items.map(i=>i.id).sort(),allowed))fail('STALE_BASE');await read(check);current(held);
  releaseContextLineage(held.lineage);held.lineage=readable.captured;held.snapshot=expected;held.activePlan=plan;
  (held.contextReceipts??=[]).push(structuredClone(proof.receipt));(held.usedContextItems??=new Set()).add(proof.itemId);(held.usedContextOperations??=new Set()).add(proof.operationId);held.pendingContext=null;held.contextOperation=null;return true;
 }catch(error){releaseContextLineage(readable.captured);throw error;}
}
export function maintenanceExistingContextReadyForSibling(store,handle){
 const held=requireWitness(store,handle);return held.topicSettled===true&&!held.pendingTopic&&!held.pendingContext&&!held.contextOperation;
}
export function releaseMaintenanceExistingContext(handle){const held=witnesses.get(handle);if(held){releaseContextLineage(held.lineage);witnesses.delete(handle);plans.delete(held.planHandle);}plans.delete(handle);}
