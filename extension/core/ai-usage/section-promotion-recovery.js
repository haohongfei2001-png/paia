import {assertSectionPromotionPendingLocator} from './section-promotion-checkpoint.js';
import {readSectionPromotionRecoveryAuthority,assertSectionPromotionRecoveryAuthorityFacts,assertSectionPromotionRecoveryAuthoritySnapshot} from './section-promotion-recovery-authority.js';
import {fail,equal} from './contracts.js';
import {freeze} from './qwen-request-data.js';
import {SectionPromotionService,PROMOTION_WORK_PREFIX} from '../topic-promotion.js';
import {topicIdentityBase} from '../topic-identity.js';
import {keyedHash} from '../thought-model.js';
import {rootReadAuthority} from '../organizer/root-read.js';
import {contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';

const captures=new WeakMap(),monoNow=globalThis.performance.now.bind(globalThis.performance);
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const need=x=>{if(!x)fail('STALE_BASE');};
function copy(row){
 const active=new WeakSet(),encoder=new TextEncoder();let bytes=0,keys=0;const charge=n=>{bytes+=n;need(bytes<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes);};
 const visit=(value,depth)=>{
  need(depth<=24);if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)){charge(24);return value;}
  if(typeof value==='string'){charge(encoder.encode(JSON.stringify(value)).length);return value;}
  need(value&&typeof value==='object'&&!active.has(value));const array=Array.isArray(value);need(array||[Object.prototype,null].includes(Object.getPrototypeOf(value)));active.add(value);
  const names=Reflect.ownKeys(value);keys+=names.length;need(keys<=65536&&names.every(k=>typeof k==='string'));charge(names.length+2);const out=array?[]:{};
  if(array){const length=Object.getOwnPropertyDescriptor(value,'length');need(length&&Object.hasOwn(length,'value')&&Number.isSafeInteger(length.value)&&length.value>=0&&names.length===length.value+1&&names.every(k=>k==='length'||/^(0|[1-9][0-9]*)$/.test(k)&&Number(k)<length.value));}
  for(const key of names){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);need(d&&Object.hasOwn(d,'value')&&d.enumerable);charge(encoder.encode(JSON.stringify(key)).length);Object.defineProperty(out,key,{value:visit(d.value,depth+1),enumerable:true,writable:true,configurable:true});}
  active.delete(value);return Object.freeze(out);
 };return visit(row,0);
}
function current(p){const wall=Date.now(),mono=monoNow();need(!p.released&&p.store.repository===p.repository&&p.repository.db===p.database&&!aborted.call(p.signal)&&(!p.requestSignal||!aborted.call(p.requestSignal)));if(!Number.isSafeInteger(wall)||wall<p.wall||mono<p.mono||wall>=p.expiresAt||mono>=p.deadlineMono){p.released=true;fail('STALE_BASE');}p.wall=wall;p.mono=mono;assertContextScopeWorkBudgetFacts(p.workBudget,{database:p.database});return true;}
function recoveryCurrent(p){if(p.recoveryAuthority!==null){assertSectionPromotionPendingLocator(p.locator,p.store);const view=readSectionPromotionRecoveryAuthority(p.recoveryAuthority,p.store,p.locator);need(view.operationId===p.operationId);current(p);assertSectionPromotionRecoveryAuthorityFacts(p.recoveryAuthority,p.store,p.locator);}return true;}
async function recoverySnapshot(p,transaction){if(p.recoveryAuthority!==null){recoveryCurrent(p);await assertSectionPromotionRecoveryAuthoritySnapshot(p.recoveryAuthority,p.store,p.locator,transaction,{workBudget:p.workBudget});recoveryCurrent(p);}return true;}
export function readSectionPromotionRecovery(cap,store){const p=captures.get(cap);need(p&&p.store===store);current(p);recoveryCurrent(p);return p.metadata;}
export function releaseSectionPromotionRecovery(cap){const p=captures.get(cap);if(p){p.released=true;p.envelope=null;captures.delete(cap);}}
// Local verification of an already user-confirmed signed work envelope. This
// acquires no Input/Entry/Topic text and does not issue a processing grant. An
// unverified envelope can never become a selection or recovery capability.
export async function captureSectionPromotionRecovery(store,operationId,{workBudget,signal=null,isCurrent=()=>true,recoveryAuthority=null,locator=null}={}){
 need((recoveryAuthority===null)===(locator===null));
 need(typeof operationId==='string'&&operationId.length>=8&&operationId.length<=200&&!operationId.includes(':')&&(!signal||signal instanceof AbortSignal)&&typeof isCurrent==='function');
 const controller=new AbortController(),p={store,repository:store.repository,database:store.repository.db,workBudget,recoveryAuthority,locator,operationId,signal:controller.signal,requestSignal:signal,released:false,wall:Date.now(),mono:monoNow(),expiresAt:Infinity,deadlineMono:Infinity},started={wall:p.wall,mono:p.mono},workId=PROMOTION_WORK_PREFIX+operationId,abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal&&aborted.call(signal))abort();
 const alive=()=>{current(p);const value=isCurrent();if(value!==true){if(value instanceof Promise)value.catch(()=>{});fail('STALE_BASE');}recoveryCurrent(p);return current(p);};
 const read=()=>store.run(()=>p.repository.transaction(false,async transaction=>{alive();await recoverySnapshot(p,transaction);alive();const t=contextScopeTransactionReader(store,transaction,workBudget),root=await rootReadAuthority(t),identity=await topicIdentityBase(t),gate=await t.get('meta','gate'),library=await t.get('meta','thought-library'),work=copy(await t.get('organizerWorkItems',workId));alive();need(gate?.enabled&&!library?.sealed);const authority={gateEpoch:gate.epoch,thoughtEpoch:(await t.get('meta','thought-epoch'))?.value??0,generation:(await t.get('meta','backup-data-generation'))?.value??0,restoreEpoch:identity.restoreEpoch};need(await rootReadAuthority(t)===root);await recoverySnapshot(p,transaction);alive();return {root,identity,authority,work};}));
 try{
  const captured=await read(),owner=new SectionPromotionService(store);owner.validateWork(captured.work);const c=captured.work.confirmed,{processingEpoch,...originalAuthority}=c.authority;need(c.request.operationId===operationId&&equal(originalAuthority,captured.authority));p.expiresAt=c.expiresAt;p.deadlineMono=started.mono+c.expiresAt-started.wall;alive();
  const signed=['confirmed-section-promotion-v1',c],bytes=new TextEncoder().encode(JSON.stringify(signed)).length;need(workBudget.hashBytes+bytes<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes&&workBudget.hashFields+1<=CONTEXT_TOPIC_SCOPE_LIMITS.hashFields);workBudget.hashBytes+=bytes;workBudget.hashFields++;alive();const signature=await keyedHash(captured.identity.secret,signed);alive();need(signature===captured.work.signature);
  const final=await read();need(equal(final,captured));alive();const cap=Object.freeze({});p.envelope=captured.work;p.metadata=freeze({workId,operationId,request:c.request,entryIds:c.plan.entryIds,identityIds:c.identityIds,expiresAt:c.expiresAt,rootAuthority:captured.root});captures.set(cap,p);return cap;
 }catch(error){p.released=true;throw error;}
 finally{signal?.removeEventListener('abort',abort);}
}

const results=new WeakMap();
const receiptKeys=['id','namespace','schemaVersion','ownerId','operationSequence','createdAt','digest','result'];
const resultKeys=['kind','version','intentMode','id','operationId','historyOperationId','state','sourceTopicId','sourceSectionId','sourceGeneration','defaultSectionId','entryIds','selection','scope','mappings','sourceTopicRevisionId','topicRevisionId'];
const closed=(value,keys)=>{need(value&&[Object.prototype,null].includes(Object.getPrototypeOf(value)));const names=Reflect.ownKeys(value);need(names.length===keys.length&&names.every(key=>keys.includes(key)));for(const key of keys)need(Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'));};
function resultRow(raw,operationId){
 if(!raw)return null;closed(raw,receiptKeys);closed(raw.result,resultKeys);const row=copy(raw),r=row.result;
 need(row.id===operationId&&row.namespace==='thought-library'&&row.schemaVersion===1&&row.ownerId===r.id&&r.kind==='personal_topic_promotion'&&r.version===1&&r.intentMode==='ai_proposal'&&r.operationId===operationId&&r.historyOperationId===operationId&&r.state==='after');
 need(Array.isArray(r.scope)&&r.scope.length>0&&r.scope.length<=20&&new Set(r.scope.map(x=>x.inputId)).size===r.scope.length);
 for(const input of r.scope){closed(input,['inputId','role','selectedFields']);need(typeof input.inputId==='string'&&input.inputId.length<=200&&['primary','supporting'].includes(input.role)&&Array.isArray(input.selectedFields)&&input.selectedFields.length>0&&input.selectedFields.length<=2&&new Set(input.selectedFields).size===input.selectedFields.length&&input.selectedFields.every(x=>['body','note'].includes(x)));}
 need(Array.isArray(r.entryIds)&&r.entryIds.length>0&&r.entryIds.length<=16&&new Set(r.entryIds).size===r.entryIds.length&&r.entryIds.every(x=>typeof x==='string'&&x.length<=200));return row;
}
// Result lookup is deliberately separate from signed work recovery. This only
// selects the current independent read grant for an already durable original
// receipt, and cannot authorize a new confirm, stage or activation.
export async function captureSectionPromotionResult(store,operationId,{workBudget,signal=null,isCurrent=()=>true,recoveryAuthority=null,locator=null}={}){
 need((recoveryAuthority===null)===(locator===null));
 need(typeof operationId==='string'&&operationId.length>=8&&operationId.length<=200&&!operationId.includes(':')&&(!signal||signal instanceof AbortSignal));const controller=new AbortController(),p={store,repository:store.repository,database:store.repository.db,workBudget,recoveryAuthority,locator,operationId,signal:controller.signal,requestSignal:signal,released:false,wall:Date.now(),mono:monoNow(),expiresAt:Infinity,deadlineMono:Infinity};
 const alive=()=>{current(p);const value=isCurrent();if(value!==true){if(value instanceof Promise)value.catch(()=>{});fail('STALE_BASE');}recoveryCurrent(p);return current(p);};
 const captured=await store.run(()=>p.repository.transaction(false,async original=>{alive();await recoverySnapshot(p,original);alive();const t=contextScopeTransactionReader(store,original,workBudget),root=await rootReadAuthority(t),row=resultRow(await t.get('operationReceipts',operationId),operationId);alive();need(await rootReadAuthority(t)===root);await recoverySnapshot(p,original);alive();return {root,row};}));if(!captured.row)return null;
 const cap=Object.freeze({});p.row=captured.row;p.metadata=freeze({operationId,scope:captured.row.result.scope,result:captured.row.result,rootAuthority:captured.root});results.set(cap,p);return cap;
}
export function readSectionPromotionResult(cap,store){const p=results.get(cap);need(p&&p.store===store);current(p);recoveryCurrent(p);return p.metadata;}
export async function assertSectionPromotionResultSnapshot(cap,store,transaction){const p=results.get(cap);need(p&&p.store===store);current(p);await recoverySnapshot(p,transaction);current(p);const t=contextScopeTransactionReader(store,transaction,p.workBudget);need(await rootReadAuthority(t)===p.metadata.rootAuthority&&equal(resultRow(await t.get('operationReceipts',p.metadata.operationId),p.metadata.operationId),p.row));await recoverySnapshot(p,transaction);current(p);return true;}
export function releaseSectionPromotionResult(cap){const p=results.get(cap);if(p){p.released=true;p.row=null;results.delete(cap);}}
