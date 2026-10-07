import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {ContextCardsService,CONTEXT_CARDS_ROW,CONTEXT_LIMITS,CONTEXT_ITEM_CARDS,validContextCards} from './context-cards.js';
import {contextTopicOperationId as uuid,contextTopicEpoch as epochOK,contextTopicDigest as digestOK} from './context-topic-preferences.js';
import {revisionOK,idOK} from './thought-model.js';
import {lineagePlain as plain,lineageExact as exact,lineageArray as array,validContextEvidenceSpecs,captureContextEvidence,contextLineageReady,contextLineageRead,fenceContextLineage,CONTEXT_LINEAGE_LIMITS} from './context-item-lineage.js';

// Structural owner only. No runtime instantiation, caller authentication,
// extractor, provider, transport, background job, worker route or processing grant exists.
export const CONTEXT_MAINTENANCE_LIMITS=Object.freeze({requestBytes:96*1024,pending:64,verificationMs:1000,requestMs:10000});
const PREFIX='context-maintenance:',NAMESPACE='context-maintenance';
const attempts=new WeakMap();
const fail=(code='CONTEXT_INVALIDATED')=>{throw new ArchiveError(code);};
const need=(x,code)=>{if(!x)fail(code);};
const bounded=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n&&!x.includes('\0');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const stamp=x=>typeof x==='string'&&x.length<=64&&Number.isFinite(Date.parse(x));
const opaque=x=>bounded(x,200);
const signalOK=x=>typeof AbortSignal!=='undefined'&&x instanceof AbortSignal;
function scopeFor(c){return {card:c.card,topics:[...new Set(c.evidence.map(e=>e.topicId))].sort(),inputs:c.evidence.map(e=>({inputId:e.inputId,selectedFields:[...e.selectedFields].sort()})).sort((a,b)=>a.inputId.localeCompare(b.inputId))};}
function validScope(x){return exact(x,['card','topics','inputs'])&&CONTEXT_ITEM_CARDS.includes(x.card)&&array(x.topics,CONTEXT_LINEAGE_LIMITS.topics,1)&&x.topics.every(idOK)&&new Set(x.topics).size===x.topics.length&&array(x.inputs,CONTEXT_LINEAGE_LIMITS.inputs,1)&&new Set(x.inputs.map(i=>i?.inputId)).size===x.inputs.length&&x.inputs.every(i=>exact(i,['inputId','selectedFields'])&&idOK(i.inputId)&&array(i.selectedFields,2,1)&&i.selectedFields.every(f=>['body','note'].includes(f))&&new Set(i.selectedFields).size===i.selectedFields.length);}
export function validateContextMaintenanceChange(c){
 need(exact(c,['operationId','epoch','itemId','card','expectedRevision','body','section','associationIds','evidence'])&&uuid(c.operationId)&&epochOK(c.epoch)&&uuid(c.itemId)&&CONTEXT_ITEM_CARDS.includes(c.card)&&revisionOK(c.expectedRevision)&&bounded(c.body,CONTEXT_LIMITS.body)&&c.body.trim()&&bounded(c.section,80)&&c.section.trim()&&array(c.associationIds,CONTEXT_LINEAGE_LIMITS.associations,1)&&c.associationIds.every(uuid)&&new Set(c.associationIds).size===c.associationIds.length&&validContextEvidenceSpecs(c.evidence)&&c.evidence.every(e=>e.expectedTopicBinding.epoch===c.epoch),'INVALID_REQUEST');
 need(new TextEncoder().encode(JSON.stringify(c)).byteLength<=CONTEXT_MAINTENANCE_LIMITS.requestBytes,'INVALID_REQUEST');return c;
}
function validResult(x){
 return exact(x,['ok','itemId','revision','disposition','externalAllowed'])&&x.ok===true&&uuid(x.itemId)&&revisionOK(x.revision)&&x.revision>0&&['created','updated','duplicate','protected','removed'].includes(x.disposition)&&x.externalAllowed===false;
}
function validReceipt(r){
 return exact(r,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','accountId','processorId','authorizationGeneration','scopeDigest','requestItemId','card','expectedRevision','associationId','associationDigest','result'])&&typeof r.id==='string'&&r.id.startsWith(PREFIX)&&uuid(r.id.slice(PREFIX.length))&&r.namespace===NAMESPACE&&r.schemaVersion===1&&uuid(r.ownerId)&&stamp(r.createdAt)&&digestOK(r.digest)&&epochOK(r.epoch)&&opaque(r.accountId)&&opaque(r.processorId)&&revisionOK(r.authorizationGeneration)&&digestOK(r.scopeDigest)&&uuid(r.requestItemId)&&CONTEXT_ITEM_CARDS.includes(r.card)&&revisionOK(r.expectedRevision)&&uuid(r.associationId)&&digestOK(r.associationDigest)&&validResult(r.result)&&r.result.itemId===r.ownerId;
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
 #s;#cards;#verifier;#attempts;
 constructor(store,{processingVerifier=null}={}){this.#s=store;this.#cards=new ContextCardsService(store);this.#verifier=processingVerifier;if(!attempts.has(store))attempts.set(store,new Map());this.#attempts=attempts.get(store);}
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
  need(item?.origin==='automatic'&&item.card===r.card&&item.revision>=r.result.revision&&item.maintenance.associationIds.includes(r.associationId),'INVALID_REQUEST');
  if(['created','updated'].includes(r.result.disposition))need(r.requestItemId===r.ownerId&&r.result.revision===r.expectedRevision+1&&(r.result.disposition==='created'?r.expectedRevision===0:r.expectedRevision>0),'INVALID_REQUEST');
  if(r.result.disposition==='duplicate')need(r.requestItemId!==r.ownerId,'INVALID_REQUEST');
  if(['protected','removed'].includes(r.result.disposition))need(item.protected===true,'INVALID_REQUEST');
  if(request)need(r.requestItemId===request.itemId&&r.card===request.card&&r.expectedRevision===request.expectedRevision&&request.associationIds.includes(r.associationId)&&r.associationDigest===query.associationDigest,'INVALID_REQUEST');
  return r.result;
 }
 maintain(caller,input,{signal=null}={}){
  try{
   need(typeof this.#verifier?.verify==='function'&&typeof this.#verifier?.isCurrent==='function');
   need(signal===null||signalOK(signal),'INVALID_REQUEST');
   const c=structuredClone(validateContextMaintenanceChange(input)),serialized=JSON.stringify(c),prior=this.#attempts.get(c.operationId);
   if(prior){need(prior.serialized===serialized&&prior.caller===caller&&prior.verifier===this.#verifier&&prior.signal===signal,'INVALID_REQUEST');if(prior.authority)this.#current(caller,prior.authority,null,true);return prior.promise;}
   need(this.#attempts.size<CONTEXT_MAINTENANCE_LIMITS.pending,'CONTEXT_LIMIT');
   const attempt={serialized,caller,verifier:this.#verifier,signal,promise:null,authority:null},boundedCall=new AbortController(),abort=()=>boundedCall.abort();this.#attempts.set(c.operationId,attempt);
   if(signal?.aborted)abort();else signal?.addEventListener('abort',abort);
   const timer=setTimeout(abort,CONTEXT_MAINTENANCE_LIMITS.requestMs);
   attempt.promise=Promise.resolve().then(()=>this.#apply(caller,c,serialized,boundedCall.signal,attempt)).catch(error=>{throw new ArchiveError(['INVALID_REQUEST','CONTEXT_INVALIDATED','CONTEXT_LIMIT','STORAGE_FAILED','STORAGE_FULL','CONSENT_REQUIRED'].includes(error?.code)?error.code:'STORAGE_FAILED');}).finally(()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(this.#attempts.get(c.operationId)===attempt)this.#attempts.delete(c.operationId);});return attempt.promise;
  }catch(error){return Promise.reject(error);}
 }
 async #apply(caller,c,serialized,signal,attempt){
  const scope=scopeFor(c),authority=await this.#verify(caller,scope,signal?[signal]:[]);
  attempt.authority=authority;
  const deadline=new AbortController(),phase=new AbortController(),phaseSources=[...new Set([signal,authority.revocationSignal,deadline.signal].filter(Boolean))],cancelPhase=()=>phase.abort();
  for(const source of phaseSources){if(source.aborted)cancelPhase();else source.addEventListener('abort',cancelPhase);}
  const phaseTimer=setTimeout(()=>deadline.abort(),Math.max(0,authority.expiresAt-Date.now()));
  const historical=work=>cancellable(work,[...new Set([signal,deadline.signal].filter(Boolean))]);
  try{
  need(contextLineageReady(this.#s));const database=this.#s.repository.db;
  const digest=await historical(()=>hashText(serialized)),scopeDigest=await historical(()=>hashText(JSON.stringify(scope))),associationDigest=await historical(()=>hashText(JSON.stringify(c.associationIds))),query={operationId:c.operationId,digest,epoch:c.epoch,associationDigest};
  need(contextLineageReady(this.#s)&&this.#s.repository.db===database);
  const prior=await contextLineageRead(this.#s,async t=>{await this.#cards.admitted(t,c.epoch);const value=await this.#receipt(t,query,authority,scopeDigest,c);this.#current(caller,authority,null,true);return value;},['meta','operationReceipts'],database);
  if(prior)return prior;
  this.#current(caller,authority,phase.signal);
  const captured=await cancellable(()=>captureContextEvidence(this.#s,c.evidence,{epoch:c.epoch,signal:phase.signal}),[phase.signal]);this.#current(caller,authority,phase.signal);
  const current=await this.#verify(caller,scope,[phase.signal]);need(identity(current)===identity(authority));this.#current(caller,current,phase.signal);
  let transaction=null,expiryTimer=null;
  const abort=()=>{try{transaction?.abort();}catch{}};
  const signals=[...new Set([phase.signal,current.revocationSignal])];
  for(const value of signals)value.addEventListener('abort',abort);
  try{need(contextLineageReady(this.#s)&&this.#s.repository.db===database);return await this.#s.repository.transaction(true,async t=>{
   need(contextLineageReady(this.#s)&&this.#s.repository.db===database);transaction=t.tx;
   const clearDeadline=()=>{clearTimeout(expiryTimer);expiryTimer=null;};
   transaction.addEventListener('complete',clearDeadline,{once:true});transaction.addEventListener('abort',clearDeadline,{once:true});
   // An explicit-call deadline can only abort this transaction; it never
   // schedules processing. Signals and this deadline remain live through the
   // repository's post-callback generation writes until native completion.
   expiryTimer=setTimeout(abort,Math.min(current.expiresAt,authority.expiresAt)-Date.now());
   const originalPut=t.put.bind(t);t.put=async(...args)=>{this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);const value=await originalPut(...args);this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);return value;};
   this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);
   await fenceContextLineage(this.#s,captured.captured,{transaction:t});this.#current(caller,current,phase.signal);
   const replay=await this.#receipt(t,query,current,scopeDigest,c);this.#current(caller,current,phase.signal);if(replay)return replay;
   const row=await this.#cards.row(t);this.#current(caller,current,phase.signal);
   const matches=row.items.filter(x=>x.origin==='automatic'&&x.maintenance.associationIds.some(id=>c.associationIds.includes(id)));
   if(matches.length>1)return conflict();
   const target=row.items.find(x=>x.id===c.itemId),associated=matches[0];let item=associated||target,outcome;
   if(associated&&target&&associated.id!==target.id)return conflict();
   if(item?.origin==='manual'||item&&(item.card!==c.card||!associated))return conflict();
   if(item&&(item.lifecycle==='removed'||item.protected))outcome=result(item,item.lifecycle==='removed'?'removed':'protected');
   else if(associated&&associated.id!==c.itemId)outcome=result(associated,'duplicate');
   else{
    if((item?.revision||0)!==c.expectedRevision||item&&(!associated||item.card!==c.card))return conflict();
    if(!item){need(row.items.length<CONTEXT_LIMITS.items,'CONTEXT_LIMIT');item={id:c.itemId,card:c.card,body:c.body,section:c.section,revision:0,order:row.sequence++,origin:'automatic',protected:false,userEdited:false,lifecycle:'active',createdAt:this.#s.clock(),updatedAt:this.#s.clock(),deletedBy:null,maintenance:{version:1,associationIds:[],provenance:captured.provenance}};row.items.push(item);}
    const associationIds=[...new Set([...item.maintenance.associationIds,...c.associationIds])];need(associationIds.length<=CONTEXT_LINEAGE_LIMITS.associations,'CONTEXT_LIMIT');
    item.body=c.body;item.section=c.section;item.maintenance={version:1,associationIds,provenance:captured.provenance};item.revision++;item.updatedAt=this.#s.clock();
    need(validContextCards(row),'CONTEXT_LIMIT');this.#current(caller,current,phase.signal);
    await t.put('meta',row);this.#current(caller,current,phase.signal);outcome=result(item,c.expectedRevision===0?'created':'updated');
   }
   this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);
   await t.put('operationReceipts',{id:PREFIX+c.operationId,namespace:NAMESPACE,schemaVersion:1,ownerId:item.id,createdAt:this.#s.clock(),digest,epoch:c.epoch,accountId:current.accountId,processorId:current.processorId,authorizationGeneration:current.authorizationGeneration,scopeDigest,requestItemId:c.itemId,card:c.card,expectedRevision:c.expectedRevision,associationId:c.associationIds.find(id=>item.maintenance.associationIds.includes(id)),associationDigest,result:outcome});
   this.#current(caller,current,phase.signal);need(!authority.revocationSignal.aborted);return outcome;
  });}finally{clearTimeout(expiryTimer);transaction=null;for(const value of signals)value.removeEventListener('abort',abort);}
  }finally{clearTimeout(phaseTimer);for(const source of phaseSources)source.removeEventListener('abort',cancelPhase);}
 }
 async outcome(caller,input){
  need(exact(input,['operationId','digest','epoch','scope'])&&uuid(input.operationId)&&digestOK(input.digest)&&epochOK(input.epoch)&&validScope(input.scope),'INVALID_REQUEST');
  const query=structuredClone(input),authority=await this.#verify(caller,query.scope),database=this.#s.repository.db,scopeDigest=await hashText(JSON.stringify(query.scope));need(contextLineageReady(this.#s));
  return contextLineageRead(this.#s,async t=>{
   await this.#cards.admitted(t,query.epoch);let receipt;
   try{receipt=await this.#receipt(t,query,authority,scopeDigest);}catch(error){if(error?.code==='INVALID_REQUEST')return {state:'unknown',externalAllowed:false};throw error;}
   this.#current(caller,authority,null,true);
   if(receipt)return {state:'committed',result:receipt,externalAllowed:false};
   return {state:this.#attempts.has(query.operationId)?'unknown':'not_committed',externalAllowed:false};
  },['meta','operationReceipts'],database);
 }
}
