import {requireRepositoryTransactionScope} from './idb-repository.js';
import {assertMaintenanceQualification,assertMaintenanceQualificationFacts,maintenanceQualificationReader} from './ai-usage/maintenance-qualification.js';
import {readAuthoredEntryContext} from './context-authored-entry.js';
import {ContextCardsService} from './context-cards.js';
import {hashText} from './dedupe.js';
import {contextTopicOperationReservation,contextTopicSelectionBinding,evaluateContextTopicAccess} from './context-topic-access-policy.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {identityMetadata,resolveTopicIdentity} from './topic-identity.js';
import {validTopicIdentity,validTopicNameRegistry,validOrganizationIntents} from './topic-identity-backup.js';
import {BINDING_ROW} from './thought-binding.js';
import {inputProjection,readDependencyInputs,dependencyLifecycle,currentMirrorField} from './thought-evidence.js';
import {MemoryService} from './memory/service.js';
import {validateMemoryRow} from './memory/model.js';
import {FILTER_VERSIONS} from './smart-filter.js';
import {idOK,revisionOK,prefix,validateFields,ENTRY_FIELDS} from './thought-model.js';

// A local prerequisite, never an external read or a grant. Canonical owner
// validation may inspect body fields; selected material is not retained here. The caller
// supplies only a stable Topic ID and optional freshness token. All permission
// facts come from one coherent material transaction. Selected-field hashing runs
// after it closes, followed by a metadata-only freshness/consent fence. Do not
// call run, ready or finishFoundation: those owners can initialize storage.
export const CONTEXT_TOPIC_SCOPE_LIMITS=Object.freeze({refs:4096,page:100,reads:131072,hashFields:8192,hashBytes:8*1024*1024});
export const CONTEXT_PROCESSING_PREFLIGHT_LIMITS=Object.freeze({inputs:CONTEXT_TOPIC_SCOPE_LIMITS.refs});
const {refs:MAX_REFS,page:PAGE,reads:MAX_READS,hashFields:MAX_HASH_FIELDS,hashBytes:MAX_HASH_BYTES}=CONTEXT_TOPIC_SCOPE_LIMITS;
const signalAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const workBudgets=new WeakSet(),workCurrent=new WeakMap(),workQualification=new WeakMap(),workRoots=new WeakMap(),workParents=new WeakMap(),workFacts=new WeakMap();
const processingMetadata=new WeakMap();
export function createContextScopeWorkBudget({signal=null,database=null,isCurrent=null,qualification=null}={}){if(isCurrent!==null&&typeof isCurrent!=='function')refuse('stale_authority');const value={reads:0,seen:new Map(),hashBytes:0,hashFields:0,signal,database};workBudgets.add(value);workFacts.set(value,{signal,database,seen:value.seen,counters:null});if(isCurrent)workCurrent.set(value,isCurrent);if(qualification!==null){assertMaintenanceQualification(qualification);workQualification.set(value,qualification);}return value;}
// Different original owner phases retain their own signal/currentness fence,
// while these aliases share one exact request ledger. No phase resets work.
export function forkContextScopeWorkBudget(parent,{signal=parent?.signal??null,database=parent?.database??null,isCurrent=null,qualification=null}={}){
 requireFact(budgetValid(parent)&&database===parent.database,'scope_budget');currentWork(parent);
 const value=createContextScopeWorkBudget({signal,database,isCurrent,qualification}),root=workRoots.get(parent)||parent;
 for(const field of ['reads','hashBytes','hashFields'])Object.defineProperty(value,field,{enumerable:true,configurable:false,get:()=>root[field],set:n=>{root[field]=n;}});
 value.seen=root.seen;workRoots.set(value,root);workParents.set(value,parent);workFacts.set(value,{signal,database,seen:root.seen,counters:Object.fromEntries(['reads','hashBytes','hashFields'].map(key=>[key,Object.getOwnPropertyDescriptor(value,key)]))});return value;
}
// Callback-free terminal facts of this exact branded ledger and all forks.
// Active owner/issuer callbacks are checked separately before this last pass.
export function assertContextScopeWorkBudgetFacts(budget,{database}={}){
 const visit=value=>{
  const held=workFacts.get(value);requireFact(workBudgets.has(value)&&held,'scope_budget');
  const data=key=>{const d=Object.getOwnPropertyDescriptor(value,key);requireFact(d&&Object.hasOwn(d,'value')&&d.enumerable&&d.configurable&&d.writable,'scope_budget');return d.value;};
  requireFact(data('signal')===held.signal&&data('database')===held.database&&data('seen')===held.seen&&(database===undefined||held.database===database),'stale_authority');
  requireFact(held.signal===null||held.signal instanceof AbortSignal&&!signalAborted.call(held.signal),'stale_authority');
  const parent=workParents.get(value);if(parent)visit(parent);
  for(const [key,limit]of [['reads',MAX_READS],['hashBytes',MAX_HASH_BYTES],['hashFields',MAX_HASH_FIELDS]]){
   if(held.counters){const d=Object.getOwnPropertyDescriptor(value,key),old=held.counters[key];requireFact(d&&d.get===old.get&&d.set===old.set&&d.enumerable===old.enumerable&&d.configurable===old.configurable&&!Object.hasOwn(d,'value'),'scope_budget');}
   else{const n=data(key);requireFact(Number.isSafeInteger(n)&&n>=0&&n<=limit,'scope_budget');}
  }
  const qualification=workQualification.get(value);if(qualification)assertMaintenanceQualificationFacts(qualification);
 };
 visit(budget);return true;
}
// Body-free preparation hint from this owner's actual completed admission.
// It is not a grant or a current hidden decision. Consumers must compare the
// captured authority in their original metadata transaction before warming,
// then repeat the original scope checks after that transaction-external await.
// The producing preflight can validate authored body/history fields under its
// original qualification; its complete execution is not metadata-only.
export function readContextProcessingMetadata(result,store,workBudget){
 const held=processingMetadata.get(result);
 if(!held||held.store!==store||held.repository!==store?.repository||held.database!==store.repository.db||held.budget!==workBudget)return null;
 const same=(value,expected)=>{
  const keys=Reflect.ownKeys(value);if(keys.length!==Reflect.ownKeys(expected).length)return false;
  return keys.every(key=>{const d=Object.getOwnPropertyDescriptor(value,key),old=expected[key];return old&&d&&Object.hasOwn(d,'value')&&d.value===old.value&&d.enumerable===old.enumerable&&d.configurable===old.configurable&&d.writable===old.writable;});
 };
 try{
  assertContextScopeWorkBudgetFacts(workBudget,{database:held.database});
  if(!same(result,held.resultFacts)||!same(held.binding,held.bindingFacts))throw Error('Changed original preflight result');
  return held.metadata;
 }catch{processingMetadata.delete(result);return null;}
}
const budgetValid=x=>workBudgets.has(x)&&Number.isSafeInteger(x.reads)&&x.reads>=0&&x.reads<=MAX_READS&&Number.isSafeInteger(x.hashBytes)&&x.hashBytes>=0&&x.hashBytes<=MAX_HASH_BYTES&&Number.isSafeInteger(x.hashFields)&&x.hashFields>=0&&x.hashFields<=MAX_HASH_FIELDS;
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const stamp=x=>typeof x==='string'&&x.length<=64&&Number.isFinite(Date.parse(x));
const token=x=>typeof x==='string'&&x.length>0&&x.length<=500;
const rank=x=>typeof x==='string'&&/^\d{12}$/.test(x);
const emptyScope=()=>({complete:false,legacyComplete:false,eligibility:'unknown',topicIds:[],entryIds:[],inputIds:[],sections:[]});
const unavailableReasons=new Set(['invalid_request','not_ready','storage_unavailable','invalid_facts','scope_budget','incomplete_page','topic_unavailable','organization_unavailable','membership_unavailable','entry_unavailable','input_unavailable','authority_unavailable','stale_authority','consent_unavailable','filter_unavailable','context_unavailable','legacy_unavailable','incomplete_scope','hash_budget','hash_unavailable','legacy_restricted','content_unavailable']);
const unavailable=reason=>({available:false,reason,externalAllowed:false,binding:null,scope:emptyScope(),snapshot:null});
const refuse=reason=>{throw Object.assign(new Error('Context Topic scope unavailable'),{scopeReason:reason});};
const requireFact=(condition,reason='invalid_facts')=>{if(!condition)refuse(reason);};
// Trusted capability, kept outside the budget DTO. Every awaited row boundary
// rechecks synchronously; a Promise or truthy object is never current authority.
function currentWork(budget){const parent=workParents.get(budget);if(parent)currentWork(parent);const qualification=workQualification.get(budget);if(qualification)assertMaintenanceQualification(qualification);if(budget.signal?.aborted)refuse('stale_authority');const check=workCurrent.get(budget);if(!check)return;let value;try{value=check();}catch{refuse('stale_authority');}if(value!==true){Promise.resolve(value).catch(()=>{});refuse('stale_authority');}}
function add(set,id){requireFact(idOK(id));set.add(id);if(set.size>MAX_REFS)refuse('scope_budget');}
function validIds(value){requireFact(Array.isArray(value));if(value.length>MAX_REFS)refuse('scope_budget');requireFact(value.every(idOK)&&new Set(value).size===value.length);return value;}
function bounded(value){requireFact(Array.isArray(value));if(value.length>MAX_REFS)refuse('scope_budget');return value;}

// Owners such as readableEntry/readDependencyInputs use all(). Supply a bounded
// transaction facade so their exact eligibility semantics remain the authority
// without allowing an unbounded getAll. It retains no body cache. All pages and
// point reads count against real per-store and total-work limits; no truncation.
const budgetReaders=new WeakMap(),budgetOrigins=new WeakMap();
// This is only an original transaction-origin proof. It returns no native
// transaction or reader and conveys no processing or Filter permission.
// Actual reads still use this exact bounded/qualified facade and its guards.
export function assertContextScopeTransactionOrigin(transaction,repository,workBudget=null){return checkContextScopeTransactionOrigin(transaction,repository,workBudget,true);}
function checkContextScopeTransactionOrigin(transaction,repository,workBudget,checkCurrent){
 const first=budgetOrigins.get(transaction);requireFact(first&&first.repository===repository&&(workBudget===null||workBudget===first.budget),'stale_authority');
 const chain=[],seen=new Set();
 const descriptors=(row,held)=>{const keys=Reflect.ownKeys(row),old=Reflect.ownKeys(held);return keys.length===old.length&&keys.every(key=>{const a=Object.getOwnPropertyDescriptor(row,key),b=held[key];return a&&b&&a.value===b.value&&a.get===b.get&&a.set===b.set&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&a.writable===b.writable;});};
 const collect=row=>{const h=budgetOrigins.get(row);requireFact(h&&!h.revoked&&!seen.has(row),'stale_authority');seen.add(row);if(h.parent)collect(h.parent);chain.push([row,h]);};
 const facts=()=>{for(const [row,h]of chain){requireFact(!h.revoked&&h.repository===repository&&h.store.repository===repository&&repository.db===h.database&&Object.getPrototypeOf(row)===h.prototype&&descriptors(row,h.methods)&&descriptors(h.prototype,h.prototypeFacts),'stale_authority');assertContextScopeWorkBudgetFacts(h.budget,{database:h.database});requireRepositoryTransactionScope(repository,h.original);}};
 const checked=new Set(),current=budget=>{if(checked.has(budget))return;checked.add(budget);const parent=workParents.get(budget);if(parent)current(parent);const qualification=workQualification.get(budget);if(qualification)assertMaintenanceQualification(qualification);const check=workCurrent.get(budget);if(check){let value;try{value=check();}catch{refuse('stale_authority');}if(value!==true){Promise.resolve(value).catch(()=>{});refuse('stale_authority');}}};
 try{collect(transaction);facts();if(checkCurrent)for(const [,held]of chain)current(held.budget);facts();return true;}catch(error){first.revoked=true;throw error;}
}

export function contextScopeTransactionReader(store,transaction,budget){
 requireFact(budgetValid(budget),'scope_budget');currentWork(budget);
 return budgetReaders.get(transaction)===budget?transaction:reader(transaction,store.repository.factory.cmp.bind(store.repository.factory),budget,store);
}
function reader(transaction,compare,budget,store){
 const incoming=transaction;
 let ancestor=transaction,alreadyAccounted=false;for(let depth=0;ancestor&&depth<16;depth++,ancestor=Object.getPrototypeOf(ancestor)){const held=budgetReaders.get(ancestor);if(held&&(workRoots.get(held)||held)===(workRoots.get(budget)||budget)){alreadyAccounted=true;break;}}
 const qualification=workQualification.get(budget);if(qualification)transaction=maintenanceQualificationReader(qualification,store,transaction,{account:false});
 const {seen}=budget;
 const account=(store,row)=>{currentWork(budget);if(row){if(store==='blocks'){requireFact(plain(row.value),'input_unavailable');bounded(row.value.provenance);}for(const key of ['sourceRecordIds','inputRefs','selectedFields','roles'])if(Object.hasOwn(row,key))bounded(row[key]);}if(!alreadyAccounted&&++budget.reads>MAX_READS)refuse('scope_budget');if(!row)return;requireFact(typeof row.id==='string');const ids=seen.get(store)||new Set();ids.add(row.id);seen.set(store,ids);if(ids.size>MAX_REFS)refuse('scope_budget');};
 const t=Object.create(transaction);
 t.get=async(store,id)=>{currentWork(budget);if(!alreadyAccounted&&budget.reads>=MAX_READS)refuse('scope_budget');const row=await transaction.get(store,id);account(store,row);currentWork(budget);return row;};
 t.has=async(store,id)=>{currentWork(budget);if(!alreadyAccounted&&++budget.reads>MAX_READS)refuse('scope_budget');const result=await transaction.has(store,id);currentWork(budget);return result;};
 t.edge=async(...args)=>{currentWork(budget);if(!alreadyAccounted&&budget.reads>=MAX_READS)refuse('scope_budget');const row=await transaction.edge(...args);account(args[0],row);currentWork(budget);return row;};
 for(const method of ['rangePage','page','primaryRangePage','indexPrimaryPage'])t[method]=async(...args)=>{currentWork(budget);if(!alreadyAccounted&&++budget.reads>MAX_READS)refuse('scope_budget');const page=await transaction[method](...args);currentWork(budget);if(!Array.isArray(page?.rows)||page.rows.length>PAGE)refuse('incomplete_page');for(const {value}of page.rows)account(args[0],value);currentWork(budget);return page;};
 t.count=async(store,index,range)=>{
  currentWork(budget);if((!alreadyAccounted||!index&&range!==undefined)&&++budget.reads>MAX_READS)refuse('scope_budget');
  // Repository.count's primary-store overload counts the whole store. Keep
  // the exact native primary range here, within the same readonly transaction.
  const count=index||range===undefined?await transaction.count(store,index,range):await new Promise((resolve,reject)=>{const request=transaction.tx.objectStore(store).count(range);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Scope count unavailable'));});
  currentWork(budget);requireFact(revisionOK(count),'incomplete_page');return count;
 };
 async function scan(store,index,range,next,consume){
  const expected=await t.count(store,index,range);if(expected>MAX_REFS)refuse('scope_budget');
  let after=null,total=0;
  do{
   currentWork(budget);if(++budget.reads>MAX_READS)refuse('scope_budget');const page=await next(after);currentWork(budget);
   requireFact(plain(page)&&Array.isArray(page.rows)&&page.rows.length<=PAGE&&Object.hasOwn(page,'next'),'incomplete_page');
   requireFact(page.next===null||page.rows.length>0,'incomplete_page');
   let previous=after;
   for(const item of page.rows){
    requireFact(plain(item)&&Object.hasOwn(item,'key')&&item.value&&item.key!==undefined,'incomplete_page');
    if(previous!==null)requireFact(compare(previous,item.key)<0,'incomplete_page');
    previous=item.key;if(++total>MAX_REFS)refuse('scope_budget');account(store,item.value);await consume(item.value);currentWork(budget);
   }
   if(page.next!==null)requireFact(compare(page.next,previous)===0&&(after===null||compare(after,page.next)<0),'incomplete_page');
   after=page.next;
  }while(after!==null);
  currentWork(budget);requireFact(total===expected,'incomplete_page');return total;
 }
 t.scanPrimary=(store,keyPrefix,consume)=>scan(store,null,IDBKeyRange.bound(keyPrefix,keyPrefix+'\uffff',false,true),after=>transaction.primaryRangePage(store,{prefix:keyPrefix,after,limit:PAGE}),consume);
 t.scanRange=(store,index,range,consume)=>scan(store,index,range,after=>transaction.rangePage(store,index,range,after,PAGE),consume);
 t.all=async(store,index,range)=>{const rows=[];await t.scanRange(store,index,range,row=>rows.push(row));return rows;};
 budgetReaders.set(t,budget);
 // Only an original Repository scope or another exact adapter minted here
 // can carry this optional origin proof. Unknown wrappers get no new brand.
 try{
  const parent=budgetOrigins.has(incoming)?incoming:null,original=parent?budgetOrigins.get(parent).original:incoming;
  if(parent)checkContextScopeTransactionOrigin(parent,store.repository,null,false);
  assertContextScopeWorkBudgetFacts(budget,{database:store.repository.db});requireRepositoryTransactionScope(store.repository,original);
  budgetOrigins.set(t,{store,repository:store.repository,database:store.repository.db,budget,original,parent,prototype:transaction,prototypeFacts:Object.getOwnPropertyDescriptors(transaction),methods:Object.getOwnPropertyDescriptors(t),revoked:false});
 }catch{/* Legacy readers retain their original behavior without a new proof. */}
 return t;
}
function topicProjection(row){
 requireFact(plain(row)&&idOK(row.id)&&stamp(row.createdAt)&&revisionOK(row.revision)&&revisionOK(row.organizationRevision)&&revisionOK(row.activeLayoutGeneration)&&row.activeLayoutGeneration>0&&['candidate','active','dormant','merged','removed'].includes(row.lifecycle),'topic_unavailable');
 requireFact(plain(row.protections)&&Object.hasOwn(row,'identity')&&validTopicIdentity(row.identity),'topic_unavailable');
 bounded(row.identity.aliases);
 requireFact(row.identity.noRecreation===(['removed','merged'].includes(row.lifecycle)||!!row.redirectTo),'topic_unavailable');
 for(const key of ['redirectTo','layoutJobId','removalOperationId'])requireFact(row[key]==null||idOK(row[key]),'topic_unavailable');
 const out=Object.fromEntries(['id','createdAt','revision','organizationRevision','activeLayoutGeneration','lifecycle','redirectTo','layoutJobId','removalOperationId'].filter(key=>row[key]!==undefined).map(key=>[key,row[key]]));
 out.identity=identityMetadata(row);out.protections={};
 if(Object.hasOwn(row.protections,'organization')){
  const marker=row.protections.organization;
  requireFact(plain(marker)&&Object.keys(marker).every(k=>['locked','reason','operationId','at'].includes(k))&&marker.locked===true&&['user_edit','restore','delete'].includes(marker.reason)&&idOK(marker.operationId)&&marker.operationId.length>=8&&stamp(marker.at),'organization_unavailable');
  out.protections.organization={...marker};
 }
 return out;
}
function placementValid(p){
 requireFact(plain(p)&&idOK(p.topicId)&&idOK(p.entryId)&&idOK(p.sectionId)&&revisionOK(p.layoutGeneration)&&p.layoutGeneration>0&&p.id===JSON.stringify([p.topicId,p.layoutGeneration,p.entryId])&&revisionOK(p.revision)&&rank(p.rank)&&rank(p.sectionRank)&&['active','removed','quarantined'].includes(p.lifecycle)&&(p.excludedByUser===undefined||typeof p.excludedByUser==='boolean'),'membership_unavailable');
}
function sectionValid(s){
 requireFact(plain(s)&&idOK(s.topicId)&&idOK(s.sectionId)&&revisionOK(s.layoutGeneration)&&s.layoutGeneration>0&&s.id===JSON.stringify([s.topicId,s.layoutGeneration,s.sectionId])&&revisionOK(s.revision)&&rank(s.rank)&&['active','removed','merged'].includes(s.lifecycle)&&(s.redirectTo==null||idOK(s.redirectTo)),'membership_unavailable');
}
function entryValid(row){
 requireFact(plain(row)&&idOK(row.id)&&row.storageSchema===2&&revisionOK(row.revision)&&revisionOK(row.contentRevision)&&['active','removed','invalidated','quarantined'].includes(row.lifecycle)&&['current','stale'].includes(row.freshness)&&Array.isArray(row.staleReasons)&&typeof row.hasHumanAction==='boolean'&&['user','ai','migration'].includes(row.origin)&&plain(row.protections)&&validOrganizationIntents(row.organizationIntents),'entry_unavailable');
 validateFields({body:row.thoughtText,title:row.title??'',note:row.note,type:row.type,formation:row.formation});
 requireFact(ENTRY_FIELDS.every(f=>plain(row.protections[f])&&typeof row.protections[f].locked==='boolean'&&revisionOK(row.fieldRevisions?.[f])),'entry_unavailable');
 validIds(row.sourceRecordIds);bounded(row.inputRefs);requireFact(row.inputRefs.every(x=>idOK(x?.inputBlockId)&&revisionOK(x.basedOnContentRevision)),'entry_unavailable');
 requireFact(['input','thought'].includes(row.bodyBinding),'entry_unavailable');
 if(row.bodyBinding==='input')requireFact(idOK(row.workingInputId)&&revisionOK(row.bindingRevision)&&revisionOK(row.bindingLength),'entry_unavailable');
}
function dependencyValid(dep,entryId){
 requireFact(plain(dep)&&idOK(dep.inputId)&&dep.targetKind==='entry'&&dep.targetId===entryId&&dep.id===JSON.stringify([dep.inputId,'entry',entryId])&&revisionOK(dep.basedOnContentRevision)&&revisionOK(dep.eligibilityEpochAtUse??0)&&['valid','source_updated','input_removed','source_purged','version_unknown'].includes(dep.status),'entry_unavailable');
 bounded(dep.roles);bounded(dep.selectedFields);validIds(dep.sourceRecordIds);
 requireFact(dep.roles.every(x=>['primary','supporting','context_only'].includes(x))&&dep.selectedFields.every(x=>['body','note'].includes(x)),'entry_unavailable');
 if(dep.status==='valid')requireFact(dep.roles.length>0&&dep.selectedFields.length>0&&plain(dep.fieldDigests)&&dep.selectedFields.every(f=>typeof dep.fieldDigests[f]==='string'&&/^[a-f0-9]{64}$/.test(dep.fieldDigests[f])),'entry_unavailable');
}

// Validate every serialized scalar before constructing a freshness token. The
// final call uses only meta, including the same current consent/gate contract.
async function admission(store,t){
 for(const id of ['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','backup-data-generation']){const row=await t.get('meta',id);requireFact(!row||revisionOK(row.value),'authority_unavailable');}
 const restore=await t.get('meta','recovery-restore-epoch');requireFact(!restore||typeof restore.value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(restore.value),'authority_unavailable');
 const gate=await t.get('meta','gate'),control=await store.control(t);
 requireFact(plain(control?.settings)&&gate&&revisionOK(gate.epoch)&&typeof gate.enabled==='boolean'&&gate.epoch===control.settings.epoch&&gate.enabled===control.settings.enabled,'consent_unavailable');
 const cards=new ContextCardsService(store);let epoch;
 try{epoch=await cards.admitted(t);}catch{refuse('consent_unavailable');}
 requireFact(typeof epoch==='string'&&epoch.length>0&&epoch.length<=128,'authority_unavailable');
 const foundation=await t.get('meta','thought-library'),bindings=await t.get('meta',BINDING_ROW),filter=await t.get('meta','smart-filter');
 requireFact(foundation?.phase==='active'&&foundation.verified===true&&foundation.sealed===0&&bindings?.version===1&&bindings.complete===true,'not_ready');
 requireFact(filter?.phase==='active'&&['off','light'].includes(filter.mode)&&Object.entries(FILTER_VERSIONS).every(([k,v])=>filter[k]===v)&&revisionOK(filter.policyEpoch)&&revisionOK(filter.decisionSequence),'filter_unavailable');
 const authority=await rootReadAuthority(t);requireFact(token(authority),'authority_unavailable');
 return {authority,epoch,filter,gate:JSON.stringify([gate.epoch,gate.enabled,control.settings.consentVersion])};
}


// Shared complete membership/negative-restriction facts. This phase never reads
// blocks/records/Input fields and never hashes. Full eligibility remains below.
async function scopeMetadata(store,t,topicId,admitted){
 const {epoch,authority:currentAuthority}=admitted;
   const cards=new ContextCardsService(store);
   let contextRow;try{contextRow=await cards.row(t);}catch{refuse('context_unavailable');}
   const context={version:1,epoch,access:structuredClone(contextRow.access)},topics=new Map(),reservations=new Map(),legacyRows=[];
   const readTopic=async id=>{
    if(topics.has(id))return topics.get(id);
    const raw=await t.get('topics',id);requireFact(raw?.id===id,'topic_unavailable');const row=topicProjection(raw);
    topics.set(id,row);if(topics.size>MAX_REFS)refuse('scope_budget');
    for(const name of [row.identity.nameToken,...row.identity.aliases.map(x=>x.token)].filter(Boolean)){
     const registry=await t.get('meta','personalTopicName:'+name);requireFact(validTopicNameRegistry(registry)&&registry.topicIds.includes(id),'topic_unavailable');bounded(registry.topicIds);
    }
    const marker=row.protections.organization;
    if(marker&&!reservations.has(marker.operationId)){
     const reservation=contextTopicOperationReservation(await t.get('operationReceipts',marker.operationId));
     requireFact(reservation&&reservation.operationId===marker.operationId,'organization_unavailable');reservations.set(marker.operationId,reservation);
    }
    return row;
   };
   const target=await readTopic(topicId);
   // Resolve through the actual identity owner while retaining every raw hop.
   // Only negative legacy evidence traverses this mapping. The requested ID is
   // never silently replaced by its survivor and grants never follow redirects.
   const ancestry=async id=>{const proxy=Object.create(t);proxy.get=async(name,key)=>name==='topics'?readTopic(key):t.get(name,key);try{return await resolveTopicIdentity(proxy,id);}catch(error){if(error?.scopeReason)throw error;refuse('legacy_unavailable');}};
   await t.scanPrimary('meta','memory:',row=>{
    requireFact(validateMemoryRow(row),'legacy_unavailable');
    if(['config','topic','section','entry','input'].includes(row.kind))legacyRows.push(structuredClone(row));
   });
   for(const row of legacyRows)if(row.kind==='topic'&&['denied','never'].includes(row.decision)||row.kind==='section')await ancestry(row.topicId);
   requireFact(['active','dormant'].includes(target.lifecycle)&&!target.redirectTo&&!target.layoutJobId&&!target.identity.noRecreation,'topic_unavailable');
   const topicIds=new Set([target.id]),entryIds=new Set(),inputIds=new Set(),sections=new Map();let eligible=true;
   const addSection=async(row,topic)=>{
    sectionValid(row);requireFact(row.topicId===topic.id&&row.layoutGeneration===topic.activeLayoutGeneration,'membership_unavailable');
    requireFact(row.lifecycle==='active'&&!row.redirectTo,'membership_unavailable');
    const key=JSON.stringify([topic.id,row.sectionId]);sections.set(key,{topicId:topic.id,sectionId:row.sectionId});if(sections.size>MAX_REFS)refuse('scope_budget');
   };
   const targetPrefix=JSON.stringify([target.id,target.activeLayoutGeneration]).slice(0,-1)+',';
   const sectionCount=await t.scanPrimary('sections',targetPrefix,async row=>{sectionValid(row);requireFact(row.topicId===target.id&&row.layoutGeneration===target.activeLayoutGeneration,'membership_unavailable');if(row.lifecycle==='active')await addSection(row,target);});
   requireFact(sectionCount===await t.count('sections','byTopicOrder',prefix([target.id,target.activeLayoutGeneration])),'membership_unavailable');
   // A genuine empty Topic still has a real active default Section. Missing
   // compatibility facts never turn an unknown Topic into a complete empty one.
   const targetRaw=await t.get('topics',target.id);requireFact(idOK(targetRaw.defaultSectionId)&&sections.has(JSON.stringify([target.id,targetRaw.defaultSectionId])),'membership_unavailable');
   const placementCount=await t.scanPrimary('placements',targetPrefix,p=>{placementValid(p);requireFact(p.topicId===target.id&&p.layoutGeneration===target.activeLayoutGeneration,'membership_unavailable');if(p.lifecycle==='active'){add(entryIds,p.entryId);if(p.excludedByUser)eligible=false;requireFact(sections.has(JSON.stringify([target.id,p.sectionId])),'membership_unavailable');}});
   requireFact(placementCount===await t.count('placements','byTopicEntry',prefix([target.id,target.activeLayoutGeneration])),'membership_unavailable');
   const entries=[];
   for(const entryId of entryIds){
    await t.scanRange('placements','byEntry',prefix([entryId]),async p=>{
     placementValid(p);requireFact(p.entryId===entryId,'membership_unavailable');const topic=await readTopic(p.topicId);
     if(p.lifecycle!=='active'||p.layoutGeneration!==topic.activeLayoutGeneration||!['active','dormant'].includes(topic.lifecycle)||topic.redirectTo)return;
     // excludedByUser never suppresses a current shared negative witness.
     add(topicIds,topic.id);requireFact(!topic.layoutJobId&&!topic.identity.noRecreation,'topic_unavailable');
     const section=await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,p.sectionId]));await addSection(section,topic);
    });
    const raw=await t.get('thoughts',entryId);entryValid(raw);
    for(const ref of raw.inputRefs)add(inputIds,ref.inputBlockId);
    if(raw.bodyBinding==='input')add(inputIds,raw.workingInputId);
    // Bound/validate dependency and provenance collections before eligibility
    // owners inspect them. Only current dependency Input IDs are output.
    const dependencies=await t.all('dependencies','byTarget',prefix(['entry',entryId]));
    for(const dep of dependencies){dependencyValid(dep,entryId);add(inputIds,dep.inputId);}
    if(raw.lifecycle==='active'&&raw.freshness==='current'){
     const sources=new Set(dependencies.flatMap(dep=>dep.sourceRecordIds));
     requireFact(raw.inputRefs.length===dependencies.length&&raw.inputRefs.every(ref=>dependencies.some(dep=>dep.inputId===ref.inputBlockId&&dep.basedOnContentRevision===ref.basedOnContentRevision))&&raw.sourceRecordIds.length===sources.size&&raw.sourceRecordIds.every(id=>sources.has(id)),'entry_unavailable');
    }
    await t.scanRange('provenance','byOwner',prefix(['entry',entryId]),p=>{requireFact(p.ownerKind==='entry'&&p.ownerId===entryId&&idOK(p.inputId),'entry_unavailable');validIds(p.sourceRecordIds);});
    entries.push(raw);
   }
   for(const legacy of legacyRows)if(legacy.kind==='section'&&topicIds.has(legacy.topicId)&&!sections.has(JSON.stringify([legacy.topicId,legacy.sectionId]))){
    const topic=topics.get(legacy.topicId),section=await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,legacy.sectionId]));
    // No portable Section mapping exists for an old merged/absent witness.
    requireFact(section?.lifecycle==='active'&&!section.redirectTo,'legacy_unavailable');
   }
 return {context,target,topics,reservations,legacyRows,topicIds,entryIds,inputIds,sections,eligible,entries};
}

async function scopeRead(store,budget,fn,stores){
 const database=budget.database||store.repository.db;
 requireFact(database&&store.repository.db===database&&!budget.signal?.aborted,'not_ready');
 const result=await store.repository.transaction(false,async t=>{requireFact(store.repository.db===database&&!budget.signal?.aborted,'not_ready');return fn(t);},stores);
 requireFact(store.repository.db===database&&!budget.signal?.aborted,'not_ready');return result;
}

export async function readContextTopicScope(store,options={},workBudget=null){
 if(workBudget!==null&&!budgetValid(workBudget))return unavailable('scope_budget');
 if(!plain(options)||Object.keys(options).some(k=>!['topicId','expectedAuthority'].includes(k))||!idOK(options.topicId)||options.expectedAuthority!=null&&!token(options.expectedAuthority))return unavailable('invalid_request');
 // Opening an uninitialized repository can itself create stores. Preparation is
 // explicit owner work, never a side effect of this permission read.
 if(!store?.repository?.db||!store.controlCache||typeof store.readableEntry!=='function'||typeof store.isFiltered!=='function')return unavailable('not_ready');
 let reason='storage_unavailable',capturedAdmission,hashBytes=0;const hashWork=[],readBudget=workBudget||createContextScopeWorkBudget({database:store.repository.db});
 // Only these selected strings survive the material transaction, for this call
 // alone. Bound UTF-8 bytes and hash work before retaining any task. No durable
 // cache, body DTO or alternative hash implementation is introduced.
 const queueHash=(text,expected,currentMirror=false)=>{currentWork(readBudget);
  requireFact(typeof text==='string','input_unavailable');
  if(readBudget.hashFields>=MAX_HASH_FIELDS||text.length>MAX_HASH_BYTES-readBudget.hashBytes)refuse('hash_budget');
  hashBytes=new TextEncoder().encode(text).byteLength;readBudget.hashBytes+=hashBytes;readBudget.hashFields++;if(readBudget.hashBytes>MAX_HASH_BYTES)refuse('hash_budget');
  hashWork.push({text,expected,currentMirror});
 };
 try{const material=await scopeRead(store,readBudget,async transaction=>{
  try{
   const t=reader(transaction,(a,b)=>store.repository.factory.cmp(a,b),readBudget,store);
   const admitted=await admission(store,t),{authority:currentAuthority,epoch,filter}=admitted;
   if(options.expectedAuthority!=null&&options.expectedAuthority!==currentAuthority)refuse('stale_authority');
   capturedAdmission={authority:currentAuthority,epoch,gate:admitted.gate};
   const {context,target,topics,reservations,legacyRows,topicIds,entryIds,inputIds,sections,entries,eligible:metadataEligible}=await scopeMetadata(store,t,options.topicId,admitted);
   let eligible=metadataEligible;const memory=new MemoryService(store);
   for(const raw of entries){
    const entryId=raw.id;const current=await store.readableEntry(t,entryId),items=await readDependencyInputs(store,t,current);
    if(current.lifecycle!=='active'||dependencyLifecycle(current,items)!=='active'||current.freshness!=='current'||current.staleReasons.length||!await memory.safeSources(t,current.sourceRecordIds))eligible=false;
    for(const {dep,input}of items){
     if(!input||dep.status==='version_unknown'||!dep.selectedFields.length){eligible=false;continue;}
     // basedOnContentRevision records evidence origin, not selected-field
     // freshness. A note edit leaves body-only evidence valid. Match the actual
     // dependencyState owner by comparing every selected field's current digest.
     for(const field of dep.selectedFields)queueHash(input[field],dep.fieldDigests?.[field],currentMirrorField(current,dep,input,field));
    }
    if(raw.bodyBinding==='input'&&current.bodyBinding!=='input')eligible=false;
   }
   for(const inputId of inputIds){
    const raw=await t.get('blocks',inputId),state=await t.get('inputStates',inputId);
    requireFact(raw?.id===inputId&&plain(raw.value)&&raw.value.id===inputId&&state?.id===inputId&&revisionOK(state.contentRevision)&&idOK(raw.value.documentId)&&state.documentId===raw.value.documentId,'input_unavailable');
    const refs=bounded(raw.value.provenance);requireFact(refs.every(p=>idOK(p?.sourceRecordId)),'input_unavailable');validIds(state.sourceRecordIds);
    if(state.removalState==='active'&&!state.sourcePurged){const ids=new Set(refs.map(p=>p.sourceRecordId));requireFact(ids.size>0&&state.sourceRecordIds.length===ids.size&&state.sourceRecordIds.every(id=>ids.has(id)),'input_unavailable');}
    requireFact(['active','user_removed','legacy_excluded','branch_pending'].includes(state.removalState)&&(state.sourcePurged===undefined||typeof state.sourcePurged==='boolean')&&typeof raw.value.excluded==='boolean','input_unavailable');
    const input=await inputProjection(store,t,inputId);
    if(input)requireFact(typeof input.body==='string'&&typeof input.note==='string','input_unavailable');
    if(!input||await store.isFiltered(t,input.block,filter)||!await memory.safeSources(t,input.sourceRecordIds))eligible=false;
   }
   const scope={complete:true,legacyComplete:true,eligibility:eligible?'eligible':'ineligible',topicIds:[...topicIds],entryIds:[...entryIds],inputIds:[...inputIds],sections:[...sections.values()]};
   const snapshot={context,topics:[...topics.values()],topicId:target.id,selection:null,legacyRows,scope,capturedAuthority:currentAuthority,currentAuthority,organizationReservations:[...reservations.values()]};
   const verdict=evaluateContextTopicAccess(snapshot);
   if(!['topic_off','legacy_restricted','content_unavailable'].includes(verdict.reason))refuse(verdict.reason==='invalid_snapshot'?'invalid_facts':verdict.reason);
   const binding=contextTopicSelectionBinding(target,epoch,reservations.get(target.protections.organization?.operationId)??null);
   requireFact(binding,'organization_unavailable');
   return {available:true,reason:'scope_ready',externalAllowed:false,binding,scope,snapshot};
  }catch(error){reason=unavailableReasons.has(error?.scopeReason)?error.scopeReason:'invalid_facts';throw error;}
 });
  // WebCrypto must never be awaited inside a live IndexedDB transaction.
  for(const work of hashWork){currentWork(readBudget);let digest;try{digest=await hashText(work.text);}catch{refuse('hash_unavailable');}currentWork(readBudget);if(!work.currentMirror&&digest!==work.expected)material.scope.eligibility='ineligible';work.text='';}
  hashWork.length=0;
  requireFact(store.repository.db,'not_ready');
  await scopeRead(store,readBudget,async transaction=>{
   try{
    const current=await admission(store,reader(transaction,(a,b)=>store.repository.factory.cmp(a,b),readBudget,store));
    requireFact(current.authority===capturedAdmission.authority&&current.epoch===capturedAdmission.epoch&&current.gate===capturedAdmission.gate,'stale_authority');
   }catch(error){reason=unavailableReasons.has(error?.scopeReason)?error.scopeReason:'invalid_facts';throw error;}
  },['meta']);
  return material;
 }catch(error){return unavailable(unavailableReasons.has(error?.scopeReason)?error.scopeReason:reason);}
 finally{hashWork.length=0;}
}

// Negative-admission probe for explicit internal processing. Input bodies stay
// unacquired; authored canonical validation can inspect body/journal fields but
// retains no selected material and computes no selected-field hashes. This is
// neither a full material eligibility certificate nor a processing grant.
export async function readContextProcessingPreflight(store,options={},workBudget=null){
 const denied=reason=>({available:false,kind:'processing_preflight',reason,externalAllowed:false,bodyEligibility:'not_checked'});
 if(!plain(options)||!['expectedAuthority,inputIds,topicId','entryIds,expectedAuthority,inputIds,topicId'].includes(Object.keys(options).sort().join(','))||!idOK(options.topicId)||!token(options.expectedAuthority)||!Array.isArray(options.inputIds)||!options.inputIds.length&&!options.entryIds?.length||options.inputIds.length>CONTEXT_PROCESSING_PREFLIGHT_LIMITS.inputs||Object.keys(options.inputIds).length!==options.inputIds.length||!options.inputIds.every(idOK)||new Set(options.inputIds).size!==options.inputIds.length)return denied('invalid_request');
 if(options.entryIds!==undefined&&(!Array.isArray(options.entryIds)||!options.entryIds.length||options.entryIds.length>CONTEXT_PROCESSING_PREFLIGHT_LIMITS.inputs||Object.keys(options.entryIds).length!==options.entryIds.length||!options.entryIds.every(idOK)||new Set(options.entryIds).size!==options.entryIds.length))return denied('invalid_request');
 if(!store?.repository?.db||!store.controlCache)return denied('not_ready');
 if(workBudget!==null&&!budgetValid(workBudget))return denied('scope_budget');
 const budget=workBudget||createContextScopeWorkBudget({database:store.repository.db});let captured,metadataInputs,reason='invalid_facts';
 try{
  const result=await scopeRead(store,budget,async tx=>{
   try{
   const t=reader(tx,(a,b)=>store.repository.factory.cmp(a,b),budget,store),a=await admission(store,t);captured=a;
   requireFact(a.authority===options.expectedAuthority,'stale_authority');
   const m=await scopeMetadata(store,t,options.topicId,a);
   requireFact(options.inputIds.every(id=>m.inputIds.has(id)),'input_unavailable');
   for(const entryId of options.entryIds||[]){const authored=await readAuthoredEntryContext(store,t,entryId);requireFact(m.entryIds.has(entryId)&&authored?.topicId===options.topicId,'entry_unavailable');}
   const scope={complete:true,legacyComplete:true,eligibility:'unknown',topicIds:[...m.topicIds],entryIds:[...m.entryIds],inputIds:[...m.inputIds],sections:[...m.sections.values()]};
   const verdict=evaluateContextTopicAccess({context:m.context,topics:[...m.topics.values()],topicId:m.target.id,selection:null,legacyRows:m.legacyRows,scope,capturedAuthority:a.authority,currentAuthority:a.authority,organizationReservations:[...m.reservations.values()]});
   if(verdict.reason==='legacy_restricted')refuse('legacy_restricted');requireFact(verdict.reason==='content_unavailable','invalid_facts');requireFact(m.eligible,'content_unavailable');
   const memory=new MemoryService(store);
   for(const id of m.inputIds){
    const state=await t.get('inputStates',id),index=await t.get('blockIndex',id);
    requireFact(state?.id===id&&index?.id===id&&state.removalState==='active'&&!state.sourcePurged&&index.excluded===false,'input_unavailable');validIds(state.sourceRecordIds);
    requireFact(state.sourceRecordIds.length&&await memory.safeSources(t,state.sourceRecordIds),'input_unavailable');
    // isFiltered consumes ID, exclusion and provenance source identities only.
    // The real Input body remains unacquired until this metadata probe passes.
    requireFact(!await store.isFiltered(t,{id,excluded:false,provenance:state.sourceRecordIds.map(sourceRecordId=>({sourceRecordId}))},a.filter),'input_unavailable');
   }
   const binding=contextTopicSelectionBinding(m.target,a.epoch,m.reservations.get(m.target.protections.organization?.operationId)??null);requireFact(binding,'organization_unavailable');
   // The bounded preparation API never truncates an original complete scope.
   // Larger scopes retain the unchanged preflight result but have no hint.
   metadataInputs=m.inputIds.size<=200?[...m.inputIds].sort():null;
   return {available:true,kind:'processing_preflight',reason:'metadata_admitted',externalAllowed:false,bodyEligibility:'not_checked',binding};
   }catch(error){reason=unavailableReasons.has(error?.scopeReason)?error.scopeReason:'invalid_facts';throw error;}
  });
  requireFact(store.repository.db,'not_ready');await scopeRead(store,budget,async transaction=>{const t=reader(transaction,(a,b)=>store.repository.factory.cmp(a,b),budget,store),a=await admission(store,t);requireFact(a.authority===captured.authority&&a.epoch===captured.epoch&&a.gate===captured.gate,'stale_authority');},['meta']);
  if(workBudget!==null&&metadataInputs)try{
   assertContextScopeWorkBudgetFacts(budget,{database:store.repository.db});
   const binding=result.binding,metadata=Object.freeze({inputIds:Object.freeze(metadataInputs),binding:Object.freeze({...binding}),authority:captured.authority});
   processingMetadata.set(result,{store,repository:store.repository,database:store.repository.db,budget,binding,resultFacts:Object.getOwnPropertyDescriptors(result),bindingFacts:Object.getOwnPropertyDescriptors(binding),metadata});
  }catch{/* An optional hint cannot change the original legacy preflight result. */}
  return result;
 }catch(error){return denied(unavailableReasons.has(error?.scopeReason)?error.scopeReason:reason);}
}
