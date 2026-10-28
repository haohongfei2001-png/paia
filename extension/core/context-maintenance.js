import {maintenanceQualificationFacts,assertMaintenanceQualification,maintenanceQualificationWorkBudget} from './ai-usage/maintenance-qualification.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {inputProjection} from './thought-evidence.js';
import {MemoryService} from './memory/service.js';
import {createContextScopeWorkBudget,forkContextScopeWorkBudget,contextScopeTransactionReader,readContextProcessingPreflight} from './context-topic-scope.js';
import {validStructuralContextEvidence,structuralContextGroups,structuralContextProperty} from './ai-usage/structural-context-mapping.js';
import {validBoundFields,boundContextEvidence} from './context-bound-entry.js';
import {validAuthoredFields,authoredSelectedFields,authoredContextEvidence} from './context-authored-entry.js';
import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {validContextTemporal,contextTemporalProjection,CONTEXT_TEMPORAL_TEXT_LIMIT} from './context-temporal.js';
import {ContextCardsService,CONTEXT_CARDS_ROW,CONTEXT_LIMITS,CONTEXT_ITEM_CARDS,validContextCards} from './context-cards.js';
import {contextTopicOperationId as uuid,contextTopicEpoch as epochOK,contextTopicDigest as digestOK} from './context-topic-preferences.js';
import {revisionOK,idOK} from './thought-model.js';
import {lineagePlain as plain,lineageExact as exact,lineageArray as array,validContextEvidenceSpecs,captureContextEvidence,contextLineageReady,contextLineageRead,contextLineageAdmission,fenceContextLineage,CONTEXT_LINEAGE_LIMITS,contextEvidenceIdentity,contextEvidenceKey,releaseContextLineage} from './context-item-lineage.js';

// Structural owner only. No runtime instantiation, caller authentication,
// extractor, provider, transport, background job, worker route or processing grant exists.
export const CONTEXT_MAINTENANCE_LIMITS=Object.freeze({requestBytes:96*1024,pending:64,verificationMs:1000,requestMs:10000});
const PREFIX='context-maintenance:',NAMESPACE='context-maintenance',SECTION_LIMIT=80;
const requestWithinBudget=c=>new TextEncoder().encode(JSON.stringify(c)).byteLength<=CONTEXT_MAINTENANCE_LIMITS.requestBytes;
const attempts=new WeakMap(),publications=new WeakMap();
export function readContextMaintenancePublication(token,store,{transaction=null}={}){const p=publications.get(token);if(!p||p.store!==store||p.database!==store.repository.db||!p.frozen||!p.committed&&transaction!==p.transaction)return null;return structuredClone({operationId:p.operationId,beforeAuthority:p.beforeAuthority,authority:p.committed?p.afterAuthority:p.stagedAuthority,writes:[]});}
const fail=(code='CONTEXT_INVALIDATED')=>{throw new ArchiveError(code);};
const need=(x,code)=>{if(!x)fail(code);};
const bounded=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n&&!x.includes('\0');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sourceMaterial=row=>row?{id:row.id,value:{originalText:row.value?.originalText}}:row;
function structuralClosureCovered(old,live,scope){
 const selected=old.humanTopic||old.humanSection;if(!selected)return true;
 const property=structuralContextProperty(selected),current=live?.[property],granted=scope[property==='humanTopic'?'structuralTopics':'structuralSections'];
 // Re-evaluation may change selected meaning, never erase or substitute its
 // original Topic/Section owner. Current proof and its independent grant must
 // cover that same selection before novelty or any receipt can be published.
 return !!current&&current.topicId===selected.topicId&&(property==='humanTopic'||current.sectionId===selected.sectionId)&&selected.selectedFields.every(f=>current.selectedFields.includes(f))&&!!granted?.some(s=>same(s,current));
}
// Private selected-field/source snapshot. This does not discover Inputs or
// expand the verifier scope; authored/bound/structural fields remain fenced by
// the original lineage owner. Source originals stay local and are never DTOs.
async function selectedMaterialSnapshot(store,transaction,evidence,budget,qualification=null){
 const t=contextScopeTransactionReader(store,transaction,budget),inputs=[],sources=new Map(),filter=await t.get('meta','smart-filter'),memory=new MemoryService(store),restrictions=[];
 let retainedBytes=0;const retain=value=>{retainedBytes+=new TextEncoder().encode(JSON.stringify(value)).byteLength;need(retainedBytes<=CONTEXT_LINEAGE_LIMITS.hashBytes,'CONTEXT_LIMIT');return value;};
 for(const spec of evidence.filter(e=>!['humanEntry','boundEntry'].includes(e.kind))){
  const p=await inputProjection(store,t,spec.inputId);need(p&&!await store.isFiltered(t,p.block,filter)&&await memory.safeSources(t,p.sourceRecordIds));
  const selected={inputId:p.inputId,documentId:p.documentId,contentRevision:p.contentRevision,lastRemovalSequence:p.lastRemovalSequence,sourceRecordIds:p.sourceRecordIds,sourceIdentityTokens:p.identities,fields:Object.fromEntries(spec.selectedFields.map(field=>[field,p[field]]))};
  need(Object.values(selected.fields).every(text=>typeof text==='string'));inputs.push(retain(selected));
  for(const id of p.sourceRecordIds)if(!sources.has(id))sources.set(id,retain({id,index:await t.get('recordIndex',id),record:sourceMaterial(await t.get('records',id))}));
 }
 await t.scanPrimary('meta','memory:',row=>{if(['config','topic','section','entry','input'].includes(row.kind))restrictions.push(retain(row));});
 const qualificationFacts=qualification?await maintenanceQualificationFacts(qualification,store,t,retain):null;
 return {inputs,sources:[...sources.values()],filter,restrictions,qualificationFacts};
}
const stamp=x=>typeof x==='string'&&x.length<=64&&Number.isFinite(Date.parse(x));
const opaque=x=>bounded(x,200);
const signalOK=x=>typeof AbortSignal!=='undefined'&&x instanceof AbortSignal;
function scopeFor(c){return {...(c.operation==='DUPLICATE_CURRENT'?{currentContextComparison:{version:1,mode:'current_item_text',items:[contextCurrentComparisonDescriptor(c.comparison)]}}:{}),...structuralContextGroups([...new Map(c.evidence.filter(e=>e.humanSection||e.humanTopic).map(e=>[JSON.stringify(e.humanSection||e.humanTopic),e.humanSection||e.humanTopic])).values()],m=>structuredClone(m)),card:c.card,topics:[...new Set(c.evidence.map(e=>e.topicId))].sort(),inputs:c.evidence.filter(e=>!['humanEntry','boundEntry'].includes(e.kind)).map(e=>({inputId:e.inputId,selectedFields:[...e.selectedFields].sort()})).sort((a,b)=>a.inputId.localeCompare(b.inputId)),...(c.evidence.some(e=>e.kind==='humanEntry')?{authoredEntries:c.evidence.filter(e=>e.kind==='humanEntry').map(e=>({entryId:e.entryId,selectedFields:[...e.selectedFields].sort()})).sort((a,b)=>a.entryId.localeCompare(b.entryId))}:{}),...(c.evidence.some(e=>e.kind==='boundEntry')?{boundEntries:c.evidence.filter(e=>e.kind==='boundEntry').map(e=>({entryId:e.entryId,inputId:e.inputId,selectedFields:[...e.selectedFields].sort()})).sort((a,b)=>a.entryId.localeCompare(b.entryId))}:{})};}
function validScope(x){
 const authored=Object.hasOwn(x||{},'authoredEntries'),bound=Object.hasOwn(x||{},'boundEntries'),structural=Object.hasOwn(x||{},'structuralSections'),topicStructural=Object.hasOwn(x||{},'structuralTopics'),comparison=Object.hasOwn(x||{},'currentContextComparison');
 return exact(x,['card','topics','inputs',...(authored?['authoredEntries']:[]),...(bound?['boundEntries']:[]),...(structural?['structuralSections']:[]),...(topicStructural?['structuralTopics']:[]),...(comparison?['currentContextComparison']:[])])&&(!comparison||validComparisonScope(x.currentContextComparison,x.card))&&CONTEXT_ITEM_CARDS.includes(x.card)&&array(x.topics,CONTEXT_LINEAGE_LIMITS.topics,1)&&x.topics.every(idOK)&&new Set(x.topics).size===x.topics.length&&array(x.inputs,CONTEXT_LINEAGE_LIMITS.inputs,authored?0:1)&&new Set(x.inputs.map(i=>i?.inputId)).size===x.inputs.length&&x.inputs.every(i=>exact(i,['inputId','selectedFields'])&&idOK(i.inputId)&&array(i.selectedFields,2,1)&&i.selectedFields.every(f=>['body','note'].includes(f))&&new Set(i.selectedFields).size===i.selectedFields.length)&&(!authored||array(x.authoredEntries,CONTEXT_LINEAGE_LIMITS.inputs,1)&&new Set(x.authoredEntries.map(e=>e?.entryId)).size===x.authoredEntries.length&&x.authoredEntries.every(e=>exact(e,['entryId','selectedFields'])&&idOK(e.entryId)&&validAuthoredFields(e.selectedFields)))&&(!bound||array(x.boundEntries,CONTEXT_LINEAGE_LIMITS.inputs,1)&&new Set(x.boundEntries.map(e=>e?.entryId)).size===x.boundEntries.length&&x.boundEntries.every(e=>exact(e,['entryId','inputId','selectedFields'])&&idOK(e.entryId)&&validBoundFields(e.selectedFields)&&x.inputs.some(i=>i.inputId===e.inputId&&i.selectedFields.includes('body'))))&&(!structural||array(x.structuralSections,CONTEXT_LINEAGE_LIMITS.inputs,1)&&x.structuralSections.every(s=>s?.kind!=='topic'&&validStructuralContextEvidence(s)&&x.topics.includes(s.topicId)&&s.entries.every(e=>x.inputs.some(i=>i.inputId===e.inputId&&i.selectedFields.includes('body')))))&&(!topicStructural||array(x.structuralTopics,CONTEXT_LINEAGE_LIMITS.inputs,1)&&x.structuralTopics.every(s=>s?.kind==='topic'&&validStructuralContextEvidence(s)&&x.topics.includes(s.topicId)&&s.entries.every(e=>x.inputs.some(i=>i.inputId===e.inputId&&i.selectedFields.includes('body')))))&&x.inputs.length+(x.authoredEntries?.length||0)+(x.boundEntries?.length||0)<=CONTEXT_LINEAGE_LIMITS.inputs;
}

// The separately versioned current-Item comparison scope is a selected text
// grant, never authority for the Item's old Input/Source/Topic lineage.
export function contextCurrentComparisonDescriptor(item){return {kind:'currentContextItem',itemId:item.itemId,revision:item.revision,card:item.card,origin:item.origin,protected:item.protected,userEdited:item.userEdited,lifecycle:item.lifecycle,selectedFields:['body','section',...(Object.hasOwn(item,'temporal')?['temporal']:[])]};}
function validComparisonDescriptor(item){
 return exact(item,['kind','itemId','revision','card','origin','protected','userEdited','lifecycle','selectedFields'])&&item.kind==='currentContextItem'&&uuid(item.itemId)&&revisionOK(item.revision)&&item.revision>0&&CONTEXT_ITEM_CARDS.includes(item.card)&&['automatic','manual'].includes(item.origin)&&typeof item.protected==='boolean'&&item.userEdited===item.protected&&(item.origin!=='manual'||item.protected)&&item.lifecycle==='active'&&(same(item.selectedFields,['body','section'])||item.card==='now'&&same(item.selectedFields,['body','section','temporal']));
}
function validComparisonScope(scope,card){return exact(scope,['version','mode','items'])&&scope.version===1&&scope.mode==='current_item_text'&&array(scope.items,1,1)&&validComparisonDescriptor(scope.items[0])&&scope.items[0].card===card;}
export function validCurrentContextComparisonItem(item){
 const temporal=Object.hasOwn(item||{},'temporal');return exact(item,['itemRef','itemId','revision','card','origin','protected','userEdited','lifecycle','body','section',...(temporal?['temporal','temporalStatus']:[])])&&bounded(item.itemRef,80)&&validComparisonDescriptor(contextCurrentComparisonDescriptor(item))&&bounded(item.body,CONTEXT_LIMITS.body)&&item.body.trim()&&bounded(item.section,SECTION_LIMIT)&&item.section.trim()&&(!temporal||item.card==='now'&&validContextTemporal(item.temporal)&&['expired','not_expired','unknown'].includes(item.temporalStatus));
}
function comparisonItem(item,itemRef){return {itemRef,itemId:item.id,revision:item.revision,card:item.card,origin:item.origin,protected:item.protected,userEdited:item.userEdited,lifecycle:item.lifecycle,body:item.body,section:item.section,...(item.card==='now'?contextTemporalProjection(item):{})};}
export function validateContextMaintenanceDuplicateCurrent(c){
 need(exact(c,['version','operation','operationId','epoch','itemId','card','expectedRevision','comparison','evidence'])&&c.version===1&&c.operation==='DUPLICATE_CURRENT'&&uuid(c.operationId)&&epochOK(c.epoch)&&uuid(c.itemId)&&CONTEXT_ITEM_CARDS.includes(c.card)&&revisionOK(c.expectedRevision)&&c.expectedRevision>0&&validCurrentContextComparisonItem(c.comparison)&&c.comparison.itemId===c.itemId&&c.comparison.card===c.card&&c.comparison.revision===c.expectedRevision&&validContextEvidenceSpecs(c.evidence)&&c.evidence.every(e=>e.expectedTopicBinding.epoch===c.epoch),'INVALID_REQUEST');
 need(requestWithinBudget(c),'INVALID_REQUEST');return c;
}

// A negative-only pre-dispatch byte check, never evidence or processing authority.
// Reserve the largest legal command text (including six-byte JSON escapes),
// association list, optional temporal text and binding metadata. Complete
// membership repeats once per Input in the existing original owner schema;
// a large Section may therefore remain pending even with short Input bodies.
export function structuralContextRequestWithinBudget(sections,{inputIds=[],authoredEntries=[],boundEntries=[]}={}){
 if(!array(sections,CONTEXT_LINEAGE_LIMITS.inputs,1)||!sections.every(validStructuralContextEvidence)||!array(inputIds,20)||!inputIds.every(idOK)||!array(authoredEntries,20)||!array(boundEntries,20))return false;
 const escaped=n=>'\u0001'.repeat(n),id='00000000-0000-0000-0000-000000000000',hash='0'.repeat(64),maximum=Number.MAX_SAFE_INTEGER,evidence=[],binding=topicId=>({topicId,epoch:id,createdAt:escaped(64),layoutGeneration:maximum,removalOperationId:escaped(200),organizationOperationId:escaped(200),organizationOperationSequence:maximum,organizationOperationDigest:hash});
 for(const section of sections)for(const inputId of new Set(section.entries.map(e=>e.inputId)))evidence.push({topicId:section.topicId,inputId,selectedFields:['body'],fieldDigests:{body:hash},expectedRemovalSequence:maximum,[structuralContextProperty(section)]:{...section,topicRevision:maximum,topicOrganizationRevision:maximum},expectedTopicBinding:binding(section.topicId)});
 // The adapter may combine every Context unit in this child into one command.
 // Account for nonstructural Inputs and the original authored/bound projections;
 // never assume it will split the result or omit independently required fields.
 const included=new Set(evidence.map(e=>e.inputId));
 for(const inputId of inputIds)if(!included.has(inputId)){included.add(inputId);evidence.push({topicId:escaped(200),inputId,selectedFields:['body','note'],fieldDigests:{body:hash,note:hash},expectedRemovalSequence:maximum,expectedTopicBinding:binding(escaped(200))});}
 try{for(const entry of authoredEntries)evidence.push(authoredContextEvidence(entry,binding(entry.topicId),Object.fromEntries(authoredSelectedFields(entry).map(f=>[f,hash]))));for(const entry of boundEntries)evidence.push(boundContextEvidence(entry,binding(entry.topicId),Object.fromEntries(entry.selectedFields.map(f=>[f,hash]))));}catch{return false;}
 if(evidence.length>CONTEXT_LINEAGE_LIMITS.inputs||new Set(evidence.map(contextEvidenceKey)).size!==evidence.length)return false;
 return requestWithinBudget({operationId:id,epoch:id,itemId:id,card:'rules',expectedRevision:maximum,body:escaped(CONTEXT_LIMITS.body),section:escaped(SECTION_LIMIT),associationIds:Array(CONTEXT_LINEAGE_LIMITS.associations).fill(id),evidence,temporal:{temporalScope:escaped(CONTEXT_TEMPORAL_TEXT_LIMIT),uncertainty:escaped(CONTEXT_TEMPORAL_TEXT_LIMIT),validUntil:'+275760-09-13T00:00:00.000Z'}});
}

export function validateContextMaintenanceChange(c){
 need(exact(c,['operationId','epoch','itemId','card','expectedRevision','body','section','associationIds','evidence',...(Object.hasOwn(c||{},'temporal')?['temporal']:[])])&&(!Object.hasOwn(c,'temporal')||validContextTemporal(c.temporal))&&uuid(c.operationId)&&epochOK(c.epoch)&&uuid(c.itemId)&&CONTEXT_ITEM_CARDS.includes(c.card)&&revisionOK(c.expectedRevision)&&bounded(c.body,CONTEXT_LIMITS.body)&&c.body.trim()&&bounded(c.section,SECTION_LIMIT)&&c.section.trim()&&array(c.associationIds,CONTEXT_LINEAGE_LIMITS.associations,1)&&c.associationIds.every(uuid)&&new Set(c.associationIds).size===c.associationIds.length&&validContextEvidenceSpecs(c.evidence)&&c.evidence.every(e=>e.expectedTopicBinding.epoch===c.epoch),'INVALID_REQUEST');
 need(requestWithinBudget(c),'INVALID_REQUEST');return c;
}
// A declared local-domain outcome, not an inferred equality or model wire.
export function validateContextMaintenanceNoChange(c){return validateContextMaintenanceOutcome(c,'NO_CHANGE');}
export function validateContextMaintenanceInvalidation(c){return validateContextMaintenanceOutcome(c,'REMOVE_CANDIDATE');}
function validateContextMaintenanceOutcome(c,operation){
 need(exact(c,['operation','operationId','epoch','itemId','card','expectedRevision','associationIds','evidence'])&&c.operation===operation&&uuid(c.operationId)&&epochOK(c.epoch)&&uuid(c.itemId)&&CONTEXT_ITEM_CARDS.includes(c.card)&&revisionOK(c.expectedRevision)&&c.expectedRevision>0&&array(c.associationIds,CONTEXT_LINEAGE_LIMITS.associations,1)&&c.associationIds.every(uuid)&&new Set(c.associationIds).size===c.associationIds.length&&validContextEvidenceSpecs(c.evidence)&&c.evidence.every(e=>e.expectedTopicBinding.epoch===c.epoch),'INVALID_REQUEST');
 need(requestWithinBudget(c),'INVALID_REQUEST');return c;
}
function validResult(x){
 return exact(x,['ok','itemId','revision','disposition','externalAllowed'])&&x.ok===true&&uuid(x.itemId)&&revisionOK(x.revision)&&x.revision>0&&['created','updated','duplicate','protected','removed','no_change','invalidated','duplicate_current'].includes(x.disposition)&&x.externalAllowed===false;
}
function validReceipt(r){
 if(r?.schemaVersion===2)return exact(r,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','accountId','processorId','authorizationGeneration','scopeDigest','requestItemId','card','expectedRevision','targetOrigin','result'])&&typeof r.id==='string'&&r.id.startsWith(PREFIX)&&uuid(r.id.slice(PREFIX.length))&&r.namespace===NAMESPACE&&uuid(r.ownerId)&&stamp(r.createdAt)&&digestOK(r.digest)&&epochOK(r.epoch)&&opaque(r.accountId)&&opaque(r.processorId)&&revisionOK(r.authorizationGeneration)&&digestOK(r.scopeDigest)&&r.requestItemId===r.ownerId&&CONTEXT_ITEM_CARDS.includes(r.card)&&revisionOK(r.expectedRevision)&&r.expectedRevision>0&&['manual','automatic'].includes(r.targetOrigin)&&validResult(r.result)&&r.result.disposition==='duplicate_current'&&r.result.itemId===r.ownerId&&r.result.revision===r.expectedRevision;
 return exact(r,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','accountId','processorId','authorizationGeneration','scopeDigest','requestItemId','card','expectedRevision','associationId','associationDigest','result'])&&typeof r.id==='string'&&r.id.startsWith(PREFIX)&&uuid(r.id.slice(PREFIX.length))&&r.namespace===NAMESPACE&&r.schemaVersion===1&&uuid(r.ownerId)&&stamp(r.createdAt)&&digestOK(r.digest)&&epochOK(r.epoch)&&opaque(r.accountId)&&opaque(r.processorId)&&revisionOK(r.authorizationGeneration)&&digestOK(r.scopeDigest)&&uuid(r.requestItemId)&&CONTEXT_ITEM_CARDS.includes(r.card)&&revisionOK(r.expectedRevision)&&uuid(r.associationId)&&digestOK(r.associationDigest)&&validResult(r.result)&&r.result.disposition!=='duplicate_current'&&r.result.itemId===r.ownerId;
}
const identity=r=>JSON.stringify([r.accountId,r.processorId,r.authorizationGeneration,r.scope]);
const result=(item,disposition)=>({ok:true,itemId:item.id,revision:item.revision,disposition,externalAllowed:false});
const conflict=()=>({ok:false,conflict:true,externalAllowed:false});
async function cancellable(work,signals){
 let rejectAbort;const cancelled=new Promise((_,reject)=>{rejectAbort=()=>reject(new ArchiveError('CONTEXT_INVALIDATED'));});
 if(signals.some(signal=>signal.aborted))fail();for(const signal of signals)signal.addEventListener('abort',rejectAbort);
 try{return await Promise.race([Promise.resolve().then(work),cancelled]);}
 finally{for(const signal of signals)signal.removeEventListener('abort',rejectAbort);}
}

/**
 * Constructor-only host verifier:
 * verify(caller, store, scope) returns exactly {version:1,store,accountId,
 * processorId,authorizationGeneration,scope,processing,expiresAt,
 * revocationSignal}. isCurrent(caller, receipt, store) synchronously attests
 * authenticated caller/account/store/generation/scope identity. The host aborts
 * revocationSignal when processing is revoked. Current authenticated identity
 * with processing:false may acknowledge body-free historical receipts only.
 * Scope and processing flags in request JSON are never accepted as authority.
 */
export class ContextMaintenanceService {
 #s;#cards;#verifier;#attempts;#writeTransaction;#resolveQualification;#resolveRecoveryWork;
 constructor(store,{processingVerifier=null,writeTransaction=null,resolveQualification=null,resolveRecoveryWork=null}={}){need(writeTransaction===null||typeof writeTransaction==='function','INVALID_REQUEST');need(resolveQualification===null||typeof resolveQualification==='function','INVALID_REQUEST');need(resolveRecoveryWork===null||typeof resolveRecoveryWork==='function','INVALID_REQUEST');this.#resolveQualification=resolveQualification;this.#resolveRecoveryWork=resolveRecoveryWork;this.#s=store;this.#cards=new ContextCardsService(store);this.#verifier=processingVerifier;this.#writeTransaction=writeTransaction??(fn=>this.#s.repository.transaction(true,fn));if(!attempts.has(store))attempts.set(store,new Map());this.#attempts=attempts.get(store);}
 async #verify(caller,scope,signals=[]){
  const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),CONTEXT_MAINTENANCE_LIMITS.verificationMs);
  try{
   need(plain(caller)&&typeof this.#verifier?.verify==='function'&&typeof this.#verifier?.isCurrent==='function');
   const r=await cancellable(()=>this.#verifier.verify(caller,this.#s,structuredClone(scope)),[...signals,timeout.signal]);
   need(exact(r,['version','store','accountId','processorId','authorizationGeneration','scope','processing','expiresAt','revocationSignal'])&&r.version===1&&r.store===this.#s&&opaque(r.accountId)&&opaque(r.processorId)&&revisionOK(r.authorizationGeneration)&&validScope(r.scope)&&same(r.scope,scope)&&typeof r.processing==='boolean'&&Number.isSafeInteger(r.expiresAt)&&r.expiresAt>Date.now()&&signalOK(r.revocationSignal));
   const receipt=Object.freeze({...r,scope:structuredClone(r.scope)});this.#current(caller,receipt,null,true);return receipt;
  }catch{fail();}finally{clearTimeout(timer);}
 }
 #current(caller,r,signal,history=false){
  try{
   need(r.expiresAt>Date.now());const current=this.#verifier.isCurrent(caller,r,this.#s);
   if(current!==true){Promise.resolve(current).catch(()=>{});fail();}
   if(!history)need(r.processing===true&&!r.revocationSignal.aborted&&!signal?.aborted);
  }catch{fail();}
 }
 async #receipt(t,query,authority,scopeDigest,request=null){
  const r=await t.get('operationReceipts',PREFIX+query.operationId);if(!r)return null;
  need(validReceipt(r)&&r.digest===query.digest&&r.epoch===query.epoch&&r.accountId===authority.accountId&&r.processorId===authority.processorId&&r.authorizationGeneration===authority.authorizationGeneration&&r.scopeDigest===scopeDigest,'INVALID_REQUEST');
  need(r.card===authority.scope.card,'INVALID_REQUEST');
  const item=(await this.#cards.row(t)).items.find(x=>x.id===r.ownerId);
  if(r.schemaVersion===2){
   need(item&&item.origin===r.targetOrigin&&item.card===r.card&&item.revision>=r.result.revision&&validComparisonScope(authority.scope.currentContextComparison,r.card),'INVALID_REQUEST');
   const target=authority.scope.currentContextComparison.items[0];need(target.itemId===r.ownerId&&target.revision===r.expectedRevision&&target.origin===r.targetOrigin,'INVALID_REQUEST');
   if(request)need(request.operation==='DUPLICATE_CURRENT'&&request.itemId===r.ownerId&&request.card===r.card&&request.expectedRevision===r.expectedRevision,'INVALID_REQUEST');
   return r.result;
  }
  need(item?.origin==='automatic'&&item.card===r.card&&item.revision>=r.result.revision&&item.maintenance.associationIds.includes(r.associationId),'INVALID_REQUEST');
  if(['created','updated','invalidated'].includes(r.result.disposition))need(r.requestItemId===r.ownerId&&r.result.revision===r.expectedRevision+1&&(r.result.disposition==='created'?r.expectedRevision===0:r.expectedRevision>0),'INVALID_REQUEST');
  if(r.result.disposition==='no_change')need(r.requestItemId===r.ownerId&&r.expectedRevision>0&&r.result.revision===r.expectedRevision,'INVALID_REQUEST');
  if(r.result.disposition==='duplicate')need(r.requestItemId!==r.ownerId,'INVALID_REQUEST');
  if(['protected','removed'].includes(r.result.disposition))need(item.protected===true,'INVALID_REQUEST');
  if(request)need(r.requestItemId===request.itemId&&r.card===request.card&&r.expectedRevision===request.expectedRevision&&request.associationIds.includes(r.associationId)&&r.associationDigest===query.associationDigest,'INVALID_REQUEST');
  return r.result;
 }
 maintain(caller,input,options={}){return this.#maintain(caller,input,options,validateContextMaintenanceChange);}
 compareDuplicate(caller,input,options={}){return this.#maintain(caller,input,options,validateContextMaintenanceDuplicateCurrent);}
 noChange(caller,input,options={}){return this.#maintain(caller,input,options,validateContextMaintenanceNoChange);}
 invalidate(caller,input,options={}){return this.#maintain(caller,input,options,validateContextMaintenanceInvalidation);}
 #maintain(caller,input,{signal=null}={},validate){
  try{
   need(typeof this.#verifier?.verify==='function'&&typeof this.#verifier?.isCurrent==='function');
   need(signal===null||signalOK(signal),'INVALID_REQUEST');
   const c=structuredClone(validate(input)),serialized=JSON.stringify(c),prior=this.#attempts.get(c.operationId);
   if(prior){need(prior.serialized===serialized&&prior.caller===caller&&prior.verifier===this.#verifier&&prior.signal===signal,'INVALID_REQUEST');if(prior.authority)this.#current(caller,prior.authority,null,true);return prior.promise;}
   need(this.#attempts.size<CONTEXT_MAINTENANCE_LIMITS.pending,'CONTEXT_LIMIT');
   const attempt={serialized,caller,verifier:this.#verifier,signal,promise:null,authority:null,recoveryWork:this.#resolveRecoveryWork===null?null:this.#resolveRecoveryWork()},boundedCall=new AbortController(),abort=()=>boundedCall.abort();this.#attempts.set(c.operationId,attempt);
   if(signal?.aborted)abort();else signal?.addEventListener('abort',abort);
   const timer=setTimeout(abort,CONTEXT_MAINTENANCE_LIMITS.requestMs);
   attempt.promise=Promise.resolve().then(()=>this.#apply(caller,c,serialized,boundedCall.signal,attempt)).catch(error=>{throw new ArchiveError(['INVALID_REQUEST','CONTEXT_INVALIDATED','CONTEXT_LIMIT','STORAGE_FAILED','STORAGE_FULL','CONSENT_REQUIRED','STALE_BASE','UNAVAILABLE'].includes(error?.code)?error.code:'STORAGE_FAILED');}).finally(()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(this.#attempts.get(c.operationId)===attempt)this.#attempts.delete(c.operationId);});return attempt.promise;
  }catch(error){return Promise.reject(error);}
 }
 async #apply(caller,c,serialized,signal,attempt){
  const recoveryWork=attempt.recoveryWork,scope=scopeFor(c),authority=await this.#verify(caller,scope,signal?[signal]:[]);
  attempt.authority=authority;
  const deadline=new AbortController(),phase=new AbortController(),phaseSources=[...new Set([signal,authority.revocationSignal,deadline.signal].filter(Boolean))],cancelPhase=()=>phase.abort();
  for(const source of phaseSources){if(source.aborted)cancelPhase();else source.addEventListener('abort',cancelPhase);}
  const phaseTimer=setTimeout(()=>deadline.abort(),Math.max(0,authority.expiresAt-Date.now()));
  const historical=work=>cancellable(work,[...new Set([signal,deadline.signal].filter(Boolean))]);
  let captured=null;
  try{
  need(contextLineageReady(this.#s));const database=this.#s.repository.db;
  const digest=await historical(()=>hashText(serialized)),scopeDigest=await historical(()=>hashText(JSON.stringify(scope))),associationDigest=c.operation==='DUPLICATE_CURRENT'?null:await historical(()=>hashText(JSON.stringify(c.associationIds))),query={operationId:c.operationId,digest,epoch:c.epoch,associationDigest};
  need(contextLineageReady(this.#s)&&this.#s.repository.db===database);
  const prior=await contextLineageRead(this.#s,async t=>{await this.#cards.admitted(t,c.epoch);const value=await this.#receipt(t,query,authority,scopeDigest,c);this.#current(caller,authority,null,true);return value;},['meta','operationReceipts'],database,recoveryWork);
  if(prior)return prior;
  this.#current(caller,authority,phase.signal);
  const qualification=this.#resolveQualification===null?null:this.#resolveQualification();if(qualification!==null)assertMaintenanceQualification(qualification,this.#s);
  const budgetOptions={signal:phase.signal,database,qualification,isCurrent:()=>{this.#current(caller,authority,phase.signal);return true;}},workBudget=qualification?forkContextScopeWorkBudget(maintenanceQualificationWorkBudget(qualification,this.#s),budgetOptions):createContextScopeWorkBudget(budgetOptions);
  // The added exact final-facts snapshot must obey the original metadata-only
  // rejection order. Sharing this budget cannot acquire body rows before the
  // original off-scope, exclusion, Topic restriction and tombstone preflight.
  const admission=await contextLineageRead(this.#s,t=>contextLineageAdmission(this.#s,contextScopeTransactionReader(this.#s,t,workBudget),c.epoch),['meta'],database,recoveryWork);
  for(const topicId of scope.topics){
   const specs=c.evidence.filter(e=>e.topicId===topicId),entryIds=specs.filter(e=>e.kind==='humanEntry').map(e=>e.entryId);
   const preflight=await cancellable(()=>readContextProcessingPreflight(this.#s,{topicId,inputIds:specs.filter(e=>!['humanEntry','boundEntry'].includes(e.kind)).map(e=>e.inputId),...(entryIds.length?{entryIds}:{}),expectedAuthority:admission.authority},workBudget,recoveryWork),[phase.signal]);
   need(preflight.available&&specs.every(e=>same(e.expectedTopicBinding,preflight.binding)));this.#current(caller,authority,phase.signal);
  }
  const material=await cancellable(()=>contextLineageRead(this.#s,async t=>{await fenceContextLineage(this.#s,admission,{transaction:t});return selectedMaterialSnapshot(this.#s,t,c.evidence,workBudget,qualification);},undefined,database,recoveryWork),[phase.signal]);this.#current(caller,authority,phase.signal);
  captured=await cancellable(()=>captureContextEvidence(this.#s,c.evidence,{epoch:c.epoch,expectedAuthority:admission.authority,signal:phase.signal,workBudget,recoveryWork}),[phase.signal]);this.#current(caller,authority,phase.signal);
  await cancellable(()=>contextLineageRead(this.#s,async t=>{need(same(await selectedMaterialSnapshot(this.#s,t,c.evidence,workBudget,qualification),material));},undefined,database,recoveryWork),[phase.signal]);

  const current=await this.#verify(caller,scope,[phase.signal]);need(identity(current)===identity(authority));this.#current(caller,current,phase.signal);
  let transaction=null,transactionReader=null,expiryTimer=null,expectedItem=null,comparisonAccess=null,publication=null,publicationState=null;
  const publicationToken=()=>publication;
  const seal=()=>{publicationState.stagedAuthority=publicationState.beforeAuthority;const after=JSON.parse(publicationState.beforeAuthority);if(transactionReader.backupChanged)after[5]=(after[5]||0)+1;publicationState.afterAuthority=JSON.stringify(after);publicationState.frozen=true;};
  // Constructor-private capability: never read from a request or model DTO.
  // The expected target is fixed before its first write and survives until the
  // complete joined transaction settles, including its external exact ACK.
  const expectedTarget=()=>expectedItem?{itemId:expectedItem.id,item:structuredClone(expectedItem)}:null;
  const finalFence=async t=>{
   need(transaction&&t===transactionReader&&t.tx===transaction&&contextLineageReady(this.#s)&&this.#s.repository.db===database);
   this.#current(caller,current,phase.signal);this.#current(caller,authority,phase.signal);
   await fenceContextLineage(this.#s,captured.captured,{transaction:t});
   need(same(await selectedMaterialSnapshot(this.#s,t,c.evidence,workBudget,qualification),material));
   const finalCards=await this.#cards.row(t);need(expectedItem&&same(finalCards.items.find(item=>item.id===expectedItem.id),expectedItem));if(comparisonAccess)need(same({global:finalCards.access.global,card:finalCards.access[c.card]},comparisonAccess));need(publicationState&&await rootReadAuthority(t)===publicationState.beforeAuthority);
   this.#current(caller,current,phase.signal);this.#current(caller,authority,phase.signal);return true;
  };
  const abort=()=>{try{transaction?.abort();}catch{}};
  const signals=[...new Set([phase.signal,current.revocationSignal])];
  for(const value of signals)value.addEventListener('abort',abort);
  try{need(contextLineageReady(this.#s)&&this.#s.repository.db===database);const committedResult=await this.#writeTransaction(async t=>{
   need(contextLineageReady(this.#s)&&this.#s.repository.db===database);transaction=t.tx;transactionReader=t;publication=Object.freeze({});publicationState={store:this.#s,database,transaction:t,operationId:c.operationId,beforeAuthority:await rootReadAuthority(t),frozen:false,committed:false};publications.set(publication,publicationState);
   const clearDeadline=()=>{clearTimeout(expiryTimer);expiryTimer=null;};
   transaction.addEventListener('complete',clearDeadline,{once:true});transaction.addEventListener('abort',clearDeadline,{once:true});
   // An explicit-call deadline can only abort this transaction; it never
   // schedules processing. Signals and this deadline remain live through the
   // repository's post-callback generation writes until native completion.
   expiryTimer=setTimeout(abort,Math.min(current.expiresAt,authority.expiresAt)-Date.now());
   const originalPut=t.put.bind(t);t.put=async(...args)=>{this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);const value=await originalPut(...args);this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);return value;};
   this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);
   await fenceContextLineage(this.#s,captured.captured,{transaction:t});this.#current(caller,current,phase.signal);
   const replay=await this.#receipt(t,query,current,scopeDigest,c);this.#current(caller,current,phase.signal);if(replay){expectedItem=structuredClone((await this.#cards.row(t)).items.find(item=>item.id===replay.itemId));await finalFence(t);seal();return replay;}
   const row=await this.#cards.row(t);this.#current(caller,current,phase.signal);
   let item,outcome;
   if(c.operation==='DUPLICATE_CURRENT'){
    item=row.items.find(x=>x.id===c.itemId);
    if(!item||item.lifecycle!=='active'||!row.access.global.enabled||!row.access[c.card].enabled||!same(comparisonItem(item,c.comparison.itemRef),c.comparison))return conflict();
    // Only this new delta was checked. Do not rewrite/requalify old provenance,
    // attach its associations or mutate even a human/protected Item revision.
    comparisonAccess=structuredClone({global:row.access.global,card:row.access[c.card]});outcome=result(item,'duplicate_current');
   }else{
   const matches=row.items.filter(x=>x.origin==='automatic'&&x.maintenance.associationIds.some(id=>c.associationIds.includes(id)));
   if(matches.length>1)return conflict();
   const target=row.items.find(x=>x.id===c.itemId),associated=matches[0];item=associated||target;
   if(associated&&target&&associated.id!==target.id)return conflict();
   if(item?.origin==='manual'||item&&(item.card!==c.card||!associated))return conflict();
   if(item){
    // A known association/revision is not processing authority. The explicit
    // verified request must cover the target's entire old lineage as well as
    // any newly supplied correction; no hidden whole-profile read is added.
    // Active UPDATE must also retain selected structural interpretation; a
    // prior stripping step cannot bypass closure. NO_CHANGE only checks its
    // declared subset and never replaces the existing provenance.
    for(const provenance of [item.maintenance.provenance,item.maintenance.invalidation].filter(Boolean))for(const old of provenance.evidence){
     if(c.operation!=='REMOVE_CANDIDATE'&&item.lifecycle!=='invalidated'&&(c.operation==='NO_CHANGE'||!old.humanTopic&&!old.humanSection))continue;
     const authored=old.kind==='humanEntry',bound=old.kind==='boundEntry',scoped=authored?current.scope.authoredEntries?.find(x=>x.entryId===old.entryId):bound?current.scope.boundEntries?.find(x=>x.entryId===old.entryId&&x.inputId===old.inputId):current.scope.inputs.find(x=>x.inputId===old.inputId),live=captured.provenance.evidence.find(x=>contextEvidenceKey(x)===contextEvidenceKey(old)&&x.topicId===old.topicId);
     if(!structuralClosureCovered(old,live,current.scope)||!current.scope.topics.includes(old.topicId)||!scoped||!old.selectedFields.every(f=>scoped.selectedFields.includes(f))||!live||!old.selectedFields.every(f=>live.selectedFields.includes(f))||(authored||bound?old.entryCreatedAt!==live.entryCreatedAt||old.birthOperationId!==live.birthOperationId||bound&&(old.inputId!==live.inputId||!old.sourceRecordIds.every(id=>live.sourceRecordIds.includes(id))||!old.sourceIdentityTokens.every(id=>live.sourceIdentityTokens.includes(id))):!old.sourceRecordIds.every(id=>live.sourceRecordIds.includes(id))||!old.sourceIdentityTokens.every(id=>live.sourceIdentityTokens.includes(id))))return conflict();
    }
   }
   if(c.operation==='REMOVE_CANDIDATE'){
    if(!item||item.id!==c.itemId||item.card!==c.card||item.lifecycle!=='active'||item.protected||item.userEdited||item.revision!==c.expectedRevision||!c.associationIds.every(id=>item.maintenance.associationIds.includes(id)))return conflict();
    // Keep the exact original body and its lineage. This is automatic
    // invalidation, never a human tombstone or permission change.
    item.lifecycle='invalidated';item.maintenance.invalidation=captured.provenance;
    item.revision++;item.updatedAt=this.#s.clock();need(validContextCards(row),'CONTEXT_LIMIT');
    expectedItem=structuredClone(item);await t.put('meta',row);this.#current(caller,current,phase.signal);outcome=result(item,'invalidated');
   }else if(c.operation==='NO_CHANGE'){
    if(!item||item.id!==c.itemId||item.card!==c.card||item.lifecycle!=='active'||item.protected||item.revision!==c.expectedRevision||!c.associationIds.every(id=>item.maintenance.associationIds.includes(id)))return conflict();
    // Every checked Input/field must belong to this Item's actual registered
    // Source closure. Mere Source overlap or a copied association cannot ACK
    // unrelated evidence. Checking a proper subset never claims full coverage.
    for(const actual of captured.provenance.evidence){const prior=item.maintenance.provenance.evidence.find(e=>contextEvidenceKey(e)===contextEvidenceKey(actual)&&e.topicId===actual.topicId);
     if(!prior||!actual.selectedFields.every(field=>prior.selectedFields.includes(field))||(['humanEntry','boundEntry'].includes(actual.kind)?actual.entryCreatedAt!==prior.entryCreatedAt||actual.birthOperationId!==prior.birthOperationId||actual.kind==='boundEntry'&&(actual.inputId!==prior.inputId||!same(actual.sourceRecordIds,prior.sourceRecordIds)||!same(actual.sourceIdentityTokens,prior.sourceIdentityTokens)):!same(actual.sourceRecordIds,prior.sourceRecordIds)||!same(actual.sourceIdentityTokens,prior.sourceIdentityTokens)))return conflict();
    }
    outcome=result(item,'no_change');
   }else if(item&&(item.lifecycle==='removed'||item.protected))outcome=result(item,item.lifecycle==='removed'?'removed':'protected');
   else if(associated&&associated.id!==c.itemId)outcome=result(associated,'duplicate');
   else{
    if((item?.revision||0)!==c.expectedRevision||item&&(!associated||item.card!==c.card))return conflict();
    if(!item){need(row.items.length<CONTEXT_LIMITS.items,'CONTEXT_LIMIT');item={id:c.itemId,card:c.card,body:c.body,section:c.section,revision:0,order:row.sequence++,origin:'automatic',protected:false,userEdited:false,lifecycle:'active',createdAt:this.#s.clock(),updatedAt:this.#s.clock(),deletedBy:null,maintenance:{version:1,associationIds:[],provenance:captured.provenance}};row.items.push(item);}
    if(item.lifecycle==='invalidated'){
     if(contextEvidenceIdentity(captured.provenance)===contextEvidenceIdentity(item.maintenance.invalidation))return conflict();
     item.lifecycle='active';
    }
    const associationIds=[...new Set([...item.maintenance.associationIds,...c.associationIds])];need(associationIds.length<=CONTEXT_LINEAGE_LIMITS.associations,'CONTEXT_LIMIT');
    // An UPDATE without explicit time evidence clears an older deadline; it
    // cannot silently certify the new body using the prior proposal's time.
    item.body=c.body;item.section=c.section;item.maintenance={version:1,associationIds,provenance:captured.provenance,...(Object.hasOwn(c,'temporal')?{temporal:structuredClone(c.temporal)}:{})};item.revision++;item.updatedAt=this.#s.clock();
    need(validContextCards(row),'CONTEXT_LIMIT');this.#current(caller,current,phase.signal);
    expectedItem=structuredClone(item);await t.put('meta',row);this.#current(caller,current,phase.signal);outcome=result(item,c.expectedRevision===0?'created':'updated');
   }
   }
   if(expectedItem===null)expectedItem=structuredClone(item);
   this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);
   if(c.operation==='DUPLICATE_CURRENT')await t.put('operationReceipts',{id:PREFIX+c.operationId,namespace:NAMESPACE,schemaVersion:2,ownerId:item.id,createdAt:this.#s.clock(),digest,epoch:c.epoch,accountId:current.accountId,processorId:current.processorId,authorizationGeneration:current.authorizationGeneration,scopeDigest,requestItemId:c.itemId,card:c.card,expectedRevision:c.expectedRevision,targetOrigin:item.origin,result:outcome});
   else await t.put('operationReceipts',{id:PREFIX+c.operationId,namespace:NAMESPACE,schemaVersion:1,ownerId:item.id,createdAt:this.#s.clock(),digest,epoch:c.epoch,accountId:current.accountId,processorId:current.processorId,authorizationGeneration:current.authorizationGeneration,scopeDigest,requestItemId:c.itemId,card:c.card,expectedRevision:c.expectedRevision,associationId:c.associationIds.find(id=>item.maintenance.associationIds.includes(id)),associationDigest,result:outcome});
   // Bound human fields and selected Topic/Section interpretation settle with their
   // original Input/Source authority after both Item and receipt are staged.
   // This owner also serves direct callers without a session settlement guard.
   await finalFence(t);
   this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);seal();return outcome;
  },finalFence,expectedTarget,publicationToken);publicationState.committed=true;publicationState.transaction=null;return committedResult;}finally{if(publicationState&&!publicationState.committed)publications.delete(publication);clearTimeout(expiryTimer);transaction=null;transactionReader=null;for(const value of signals)value.removeEventListener('abort',abort);}
  }finally{releaseContextLineage(captured?.captured);clearTimeout(phaseTimer);for(const source of phaseSources)source.removeEventListener('abort',cancelPhase);}
 }
 async outcome(caller,input){
  need(exact(input,['operationId','digest','epoch','scope'])&&uuid(input.operationId)&&digestOK(input.digest)&&epochOK(input.epoch)&&validScope(input.scope),'INVALID_REQUEST');
  const recoveryWork=this.#resolveRecoveryWork===null?null:this.#resolveRecoveryWork(),query=structuredClone(input),authority=await this.#verify(caller,query.scope),database=this.#s.repository.db,scopeDigest=await hashText(JSON.stringify(query.scope));need(contextLineageReady(this.#s));
  return contextLineageRead(this.#s,async t=>{
   await this.#cards.admitted(t,query.epoch);let receipt;
   try{receipt=await this.#receipt(t,query,authority,scopeDigest);}catch(error){if(error?.code==='INVALID_REQUEST')return {state:'unknown',externalAllowed:false};throw error;}
   this.#current(caller,authority,null,true);
   if(receipt)return {state:'committed',result:receipt,externalAllowed:false};
   return {state:this.#attempts.has(query.operationId)?'unknown':'not_committed',externalAllowed:false};
  },['meta','operationReceipts'],database,recoveryWork);
 }
}
