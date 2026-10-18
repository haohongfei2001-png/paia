import {readAuthoredEntryContext,validAuthoredContextEvidence,authoredContextEvidenceMatches,authoredSelectedFields,authoredSelectedText} from './context-authored-entry.js';
import {ArchiveError} from './constants.js';
import {validContextTemporal} from './context-temporal.js';
import {hashText} from './dedupe.js';
import {idOK,revisionOK} from './thought-model.js';
import {inputProjection} from './thought-evidence.js';
import {MemoryService} from './memory/service.js';
import {ContextTopicAccessService} from './context-topic-access.js';
import {readContextTopicScope,readContextProcessingPreflight,createContextScopeWorkBudget,contextScopeTransactionReader,CONTEXT_TOPIC_SCOPE_LIMITS} from './context-topic-scope.js';
import {evaluateContextTopicAccess} from './context-topic-access-policy.js';
import {contextTopicEpoch,contextTopicDigest,contextTopicOperationId,validContextTopicBinding,sameContextTopicBinding} from './context-topic-preferences.js';

// Shared automatic-Item source eligibility, never processing permission. There
// is no source-text cache or persisted read grant. Manual Items bypass this
// owner because their existing contract is independent, source-free human work.
export const CONTEXT_LINEAGE_LIMITS=Object.freeze({topics:8,inputs:16,associations:16,sources:128,readTopics:32,readInputs:256,hashBytes:8*1024*1024});
export const lineagePlain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
export const lineageExact=(x,keys)=>lineagePlain(x)&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export const lineageArray=(x,max,min=0)=>Array.isArray(x)&&x.length>=min&&x.length<=max&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>Object.hasOwn(x,i)).every(Boolean);
const unique=x=>new Set(x).size===x.length;
const ids=(x,max,min=0)=>lineageArray(x,max,min)&&x.every(idOK)&&unique(x);
const fields=x=>lineageArray(x,2,1)&&x.every(f=>['body','note'].includes(f))&&unique(x);
const sourceIdentities=x=>lineageArray(x,CONTEXT_LINEAGE_LIMITS.sources,1)&&unique(x)&&x.every(v=>typeof v==='string'&&(/^[a-f0-9]{64}$/.test(v)||v.startsWith('legacy:')&&idOK(v.slice(7))&&!v.includes('\0')));
function sourceFamiliesMatch(tokens,sourceIds){
 if(!sourceIdentities(tokens))return false;
 const legacy=tokens.filter(x=>x.startsWith('legacy:')).map(x=>x.slice(7)),modern=tokens.length-legacy.length;
 if(!legacy.every(id=>sourceIds.includes(id)))return false;
 const remaining=sourceIds.length-legacy.length;
 // Every legacy family names its exact retained record. Distinct modern
 // families each need a remaining record; several versions may share one key.
 return modern?modern<=remaining:remaining===0;
}
const hashes=(x,selected)=>lineageExact(x,selected)&&selected.every(f=>contextTopicDigest(x[f]));
const fail=reason=>{throw Object.assign(new ArchiveError('CONTEXT_INVALIDATED'),reason?{lineageUnavailable:reason}:{});};
const need=x=>{if(!x)fail();};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const authoredCaptures=new WeakMap();
export const contextEvidenceKey=e=>JSON.stringify([e?.kind==='humanEntry'?'humanEntry':'input',e?.kind==='humanEntry'?e.entryId:e?.inputId]);
export function releaseContextLineage(captured){authoredCaptures.delete(captured);}
export function contextLineageBudgetReader(store,transaction,captured){const held=authoredCaptures.get(captured);return held?contextScopeTransactionReader(store,transaction,held.budget):transaction;}
const specKeys=['topicId','inputId','selectedFields','fieldDigests','expectedTopicBinding','expectedRemovalSequence'];
export function validContextEvidenceSpec(x){
 return x?.kind==='humanEntry'?validAuthoredContextEvidence(x):lineageExact(x,specKeys)&&idOK(x.topicId)&&idOK(x.inputId)&&fields(x.selectedFields)&&hashes(x.fieldDigests,x.selectedFields)&&validContextTopicBinding(x.expectedTopicBinding)&&x.expectedTopicBinding.topicId===x.topicId&&revisionOK(x.expectedRemovalSequence);
}
export function validContextEvidenceSpecs(xs){return lineageArray(xs,CONTEXT_LINEAGE_LIMITS.inputs,1)&&xs.every(validContextEvidenceSpec)&&unique(xs.map(contextEvidenceKey))&&new Set(xs.map(x=>x.topicId)).size<=CONTEXT_LINEAGE_LIMITS.topics;}
export function validContextMaintenance(x){
 if(!lineageExact(x,['version','associationIds','provenance',...(Object.hasOwn(x||{},'invalidation')?['invalidation']:[]),...(Object.hasOwn(x||{},'temporal')?['temporal']:[])])||Object.hasOwn(x,'temporal')&&!validContextTemporal(x.temporal)||x.version!==1||!lineageArray(x.associationIds,CONTEXT_LINEAGE_LIMITS.associations,1)||!x.associationIds.every(contextTopicOperationId)||!unique(x.associationIds))return false;
 return validContextProvenance(x.provenance)&&(!Object.hasOwn(x,'invalidation')||validContextProvenance(x.invalidation));
}
function validContextProvenance(p){
 return lineageExact(p,['epoch','evidence'])&&contextTopicEpoch(p.epoch)&&lineageArray(p.evidence,CONTEXT_LINEAGE_LIMITS.inputs,1)&&unique(p.evidence.map(contextEvidenceKey))&&new Set(p.evidence.map(e=>e?.topicId)).size<=CONTEXT_LINEAGE_LIMITS.topics&&p.evidence.every(e=>e?.kind==='humanEntry'?validAuthoredContextEvidence(e)&&e.expectedTopicBinding.epoch===p.epoch:lineageExact(e,[...specKeys,'contentRevision','sourceRecordIds','sourceIdentityTokens'])&&validContextEvidenceSpec(Object.fromEntries(specKeys.map(k=>[k,e[k]])))&&e.expectedTopicBinding.epoch===p.epoch&&revisionOK(e.contentRevision)&&ids(e.sourceRecordIds,CONTEXT_LINEAGE_LIMITS.sources,1)&&sourceFamiliesMatch(e.sourceIdentityTokens,e.sourceRecordIds));
}
export const contextLineageSourceIds=item=>[...new Set([item.maintenance.provenance,item.maintenance.invalidation].filter(Boolean).flatMap(p=>p.evidence.flatMap(e=>e.kind==='humanEntry'?[]:e.sourceRecordIds)))].sort();
// Evidence identity ignores ordering and ambient grant/operation/time changes.
// Re-evaluation needs changed material or source/Topic identity, not another
// delivery of the same qualified facts. Renames/layout/access epochs and
// revisions of unselected fields do not make unchanged selected text novel.
export function contextEvidenceIdentity(p){
 return JSON.stringify(p.evidence.map(e=>e.kind==='humanEntry'?{kind:'humanEntry',topicId:e.topicId,entryId:e.entryId,entryCreatedAt:e.entryCreatedAt,birthOperationId:e.birthOperationId,...(e.fieldRevisions?{selectedFields:e.selectedFields,fieldRevisions:e.fieldRevisions,fieldOperationIds:e.fieldOperationIds}:{bodyFieldRevision:e.bodyFieldRevision,bodyOperationId:e.bodyOperationId}),fieldDigests:e.fieldDigests,topicCreatedAt:e.expectedTopicBinding.createdAt,membershipOperationId:e.membership.operationId}:{topicId:e.topicId,inputId:e.inputId,selectedFields:[...e.selectedFields].sort(),fieldDigests:Object.fromEntries(Object.entries(e.fieldDigests).sort(([a],[b])=>a.localeCompare(b))),topicCreatedAt:e.expectedTopicBinding.createdAt,sourceRecordIds:[...e.sourceRecordIds].sort(),sourceIdentityTokens:[...e.sourceIdentityTokens].sort()}).sort((a,b)=>contextEvidenceKey(a).localeCompare(contextEvidenceKey(b))||a.topicId.localeCompare(b.topicId)));
}
export function contextLineageReady(store){return !!store?.repository?.db&&!!store.controlCache&&typeof store.readableEntry==='function'&&typeof store.isFiltered==='function';}
export async function contextLineageRead(store,fn,stores,database=store?.repository?.db){
 need(database&&contextLineageReady(store)&&store.repository.db===database);
 const result=await store.repository.transaction(false,async t=>{need(contextLineageReady(store)&&store.repository.db===database);return fn(t);},stores);
 need(contextLineageReady(store)&&store.repository.db===database);return result;
}
export async function contextLineageAdmission(store,t,epoch){
 need(contextLineageReady(store));return new ContextTopicAccessService(store).admission(t,epoch,{scope:true});
}
export async function fenceContextLineage(store,captured,{transaction=null,rowSerialized=null}={}){
 const fence=async transaction=>{
  const heldCapture=authoredCaptures.get(captured),t=heldCapture?contextScopeTransactionReader(store,transaction,heldCapture.budget):transaction;
  const now=await contextLineageAdmission(store,t,captured.epoch);
  need(now.authority===captured.authority&&now.gate===captured.gate);
  if(rowSerialized!==null)need(JSON.stringify(await t.get('meta','context-cards:v1'))===rowSerialized);
  for(const [entryId,held]of authoredCaptures.get(captured)?.rows||[]){need(same(await readAuthoredEntryContext(store,t,entryId),held.mapping));need(same(authoredSelectedText(await t.get('thoughts',entryId),authoredSelectedFields(held.mapping)),held.fields));}
 };
 need(contextLineageReady(store));return transaction?fence(transaction):contextLineageRead(store,fence,authoredCaptures.has(captured)?undefined:['meta'],captured.database||store.repository.db);
}

// Scope policy deliberately has no selection: ordinary Global/Card/Topic
// external-read switches cannot grant or revoke internal processing. Strong
// legacy/source restrictions and same-Entry membership vetoes remain intact.
async function assess(store,groups,{epoch,expectedAuthority=null,workBudget=createContextScopeWorkBudget()}={}){
 need(contextLineageReady(store)&&!workBudget.signal?.aborted);
 const database=workBudget.database||store.repository.db,captured=await contextLineageRead(store,t=>contextLineageAdmission(store,t,epoch),['meta'],database);captured.database=database;
 if(expectedAuthority!==null)need(captured.authority===expectedAuthority);
 const specs=groups.flatMap(g=>g.evidence),topics=[...new Set(specs.map(s=>s.topicId))],inputs=[...new Set(specs.filter(s=>s.kind!=='humanEntry').map(s=>s.inputId))],entryIds=[...new Set(specs.filter(s=>s.kind==='humanEntry').map(s=>s.entryId))];
 if(topics.length>CONTEXT_LINEAGE_LIMITS.readTopics||inputs.length+entryIds.length>CONTEXT_LINEAGE_LIMITS.readInputs)fail('budget_exceeded');
 const scopes=new Map();
 for(const topicId of topics){
  need(!workBudget.signal?.aborted);const requested=specs.filter(s=>s.topicId===topicId);
  // Canonical eligibility validation may aggregate accepted Items up to its existing
  //4096-reference graph bound; each maintenance WRITE remains16 Inputs.
  const preflight=await readContextProcessingPreflight(store,{topicId,inputIds:[...new Set(requested.filter(s=>s.kind!=='humanEntry').map(s=>s.inputId))],...(requested.some(s=>s.kind==='humanEntry')?{entryIds:[...new Set(requested.filter(s=>s.kind==='humanEntry').map(s=>s.entryId))]}:{}),expectedAuthority:captured.authority},workBudget);
  if(!preflight.available||requested.some(s=>!sameContextTopicBinding(preflight.binding,s.expectedTopicBinding))){
   if(!preflight.available&&['scope_budget','hash_budget'].includes(preflight.reason))fail('budget_exceeded');
   if(!preflight.available&&!['input_unavailable','entry_unavailable','topic_unavailable','legacy_restricted','content_unavailable'].includes(preflight.reason))fail();
   scopes.set(topicId,null);continue;
  }
  const scope=await readContextTopicScope(store,{topicId,expectedAuthority:captured.authority},workBudget);
  if(!scope.available&&['scope_budget','hash_budget'].includes(scope.reason))fail('budget_exceeded');
  if(!scope.available)fail();
  scopes.set(topicId,scope.available&&evaluateContextTopicAccess(scope.snapshot).reason==='topic_off'?scope:null);
 }
 const material=await contextLineageRead(store,async transaction=>{
  const t=contextScopeTransactionReader(store,transaction,workBudget);
  await fenceContextLineage(store,captured,{transaction:t});
  const rows=new Map(),authored=new Map(),memory=new MemoryService(store),filter=await t.get('meta','smart-filter');
  for(const inputId of inputs){
   if(!specs.some(s=>s.inputId===inputId&&scopes.get(s.topicId)?.scope.inputIds.includes(inputId))){rows.set(inputId,null);continue;}
   const raw=await t.get('blocks',inputId),state=await t.get('inputStates',inputId);
   if(!raw||!state||!lineageArray(raw.value?.provenance,CONTEXT_LINEAGE_LIMITS.sources,1)||!raw.value.provenance.every(p=>idOK(p?.sourceRecordId))){rows.set(inputId,null);continue;}
   const p=await inputProjection(store,t,inputId);
   if(!p||typeof p.body!=='string'||typeof p.note!=='string'||!revisionOK(p.contentRevision)||!revisionOK(p.lastRemovalSequence)||!ids(p.sourceRecordIds,CONTEXT_LINEAGE_LIMITS.sources,1)||await store.isFiltered(t,p.block,filter)||!await memory.safeSources(t,p.sourceRecordIds)){rows.set(inputId,null);continue;}
   const identities=[...new Set(p.identities)].sort();need(sourceIdentities(identities));
   const selected=[...new Set(specs.filter(s=>s.inputId===inputId).flatMap(s=>s.selectedFields))],text={};
   for(const field of selected){workBudget.hashBytes+=new TextEncoder().encode(p[field]).byteLength;workBudget.hashFields++;if(workBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||workBudget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('budget_exceeded');text[field]=p[field];}
   rows.set(inputId,{contentRevision:p.contentRevision,sourceRecordIds:p.sourceRecordIds,sourceIdentityTokens:identities,removalSequence:p.lastRemovalSequence,text,hashes:{}});
  }
  for(const entryId of entryIds){
   const requested=specs.filter(s=>s.kind==='humanEntry'&&s.entryId===entryId);if(!requested.some(s=>scopes.get(s.topicId)?.scope.entryIds.includes(entryId)))continue;
   // Canonical qualification is not permission to materialize newly added
   // fields. Match the verifier-approved evidence selection before any hash.
   const mapping=await readAuthoredEntryContext(store,t,entryId);if(!mapping||!requested.some(spec=>authoredContextEvidenceMatches(spec,mapping)))continue;
   const fields=authoredSelectedText(await t.get('thoughts',entryId),authoredSelectedFields(mapping));for(const text of Object.values(fields)){need(typeof text==='string');workBudget.hashBytes+=new TextEncoder().encode(text).byteLength;workBudget.hashFields++;if(workBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||workBudget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('budget_exceeded');}authored.set(entryId,{mapping,fields,fieldDigests:{}});
  }
  return {rows,authored};
 },undefined,database);
 authoredCaptures.set(captured,{rows:material.authored,budget:workBudget});
 try{
  // WebCrypto runs only after the material transaction has definitively closed.
  for(const row of material.rows.values())if(row)for(const field of Object.keys(row.text)){need(!workBudget.signal?.aborted);row.hashes[field]=await hashText(row.text[field]);row.text[field]='';need(!workBudget.signal?.aborted);}
  for(const held of material.authored.values())for(const [field,text]of Object.entries(held.fields)){need(!workBudget.signal?.aborted);held.fieldDigests[field]=await hashText(text);need(!workBudget.signal?.aborted);}
  await fenceContextLineage(store,captured);
  const results=groups.map(group=>{
   const evidence=[];let eligible=group.epoch===captured.epoch;
   for(const spec of group.evidence){
    const scope=scopes.get(spec.topicId);
    if(spec.kind==='humanEntry'){const held=material.authored.get(spec.entryId);if(!scope||!scope.scope.entryIds.includes(spec.entryId)||!sameContextTopicBinding(scope.binding,spec.expectedTopicBinding)||!held||!authoredContextEvidenceMatches(spec,held.mapping)||!same(spec.fieldDigests,held.fieldDigests)){eligible=false;continue;}evidence.push(structuredClone(spec));continue;}
    const row=material.rows.get(spec.inputId);
    const valid=scope&&scope.scope.inputIds.includes(spec.inputId)&&sameContextTopicBinding(scope.binding,spec.expectedTopicBinding)&&row&&row.removalSequence===spec.expectedRemovalSequence&&spec.selectedFields.every(f=>row.hashes[f]===spec.fieldDigests[f])&&(!Object.hasOwn(spec,'sourceRecordIds')||same(spec.sourceRecordIds,row.sourceRecordIds)&&same(spec.sourceIdentityTokens,row.sourceIdentityTokens));
    if(!valid){eligible=false;continue;}
    evidence.push({...Object.fromEntries(specKeys.map(k=>[k,structuredClone(spec[k])])),contentRevision:row.contentRevision,sourceRecordIds:[...row.sourceRecordIds],sourceIdentityTokens:[...row.sourceIdentityTokens]});
   }
   return {eligible,evidence};
  });
  return {captured,results};
 }catch(error){releaseContextLineage(captured);throw error;}finally{for(const row of material.rows.values())if(row)row.text={};}
}
export async function captureContextEvidence(store,evidence,{epoch,expectedAuthority=null,signal=null}={}){
 need(validContextEvidenceSpecs(evidence));const result=await assess(store,[{epoch,evidence}],{epoch,expectedAuthority,workBudget:createContextScopeWorkBudget({signal,database:store.repository.db})});if(!result.results[0].eligible){releaseContextLineage(result.captured);fail();}
 return {captured:result.captured,provenance:{epoch,evidence:result.results[0].evidence}};
}
export async function readableContextItems(store,items,{epoch,expectedAuthority=null,rowSerialized=null,retainAuthoredCapture=false}={}){
 items=items.filter(item=>item.lifecycle==='active');
 const automatic=items.filter(x=>x.origin==='automatic'&&x.maintenance.provenance.epoch===epoch),manual=items.filter(x=>x.origin!=='automatic');
 if(!automatic.length)return {items:manual,captured:null};
 need(automatic.every(x=>validContextMaintenance(x.maintenance)));
 const allowed=new Set(),workBudget=createContextScopeWorkBudget({database:store.repository.db});let captured=null;
 try{
  // Each batch has bounded retained material; every scope, point read and hash
  // consumes one request-wide budget. No durable Item capacity is reduced.
  for(let index=0;index<automatic.length;){
   const batch=[],topics=new Set(),inputs=new Set();
   while(index<automatic.length){const item=automatic[index],ts=new Set(topics),ins=new Set(inputs);for(const e of item.maintenance.provenance.evidence){ts.add(e.topicId);ins.add(contextEvidenceKey(e));}if(batch.length&&(ts.size>CONTEXT_LINEAGE_LIMITS.readTopics||ins.size>CONTEXT_LINEAGE_LIMITS.readInputs))break;batch.push(item);for(const id of ts)topics.add(id);for(const id of ins)inputs.add(id);index++;}
   const assessed=await assess(store,batch.map(x=>x.maintenance.provenance),{epoch,expectedAuthority:captured?.authority??expectedAuthority,workBudget});if(captured){const held=authoredCaptures.get(captured).rows;for(const [id,value]of authoredCaptures.get(assessed.captured).rows)held.set(id,value);releaseContextLineage(assessed.captured);}else captured=assessed.captured;
   for(let i=0;i<batch.length;i++)if(assessed.results[i].eligible)allowed.add(batch[i].id);
  }
  await fenceContextLineage(store,captured,{rowSerialized});if(!retainAuthoredCapture)releaseContextLineage(captured);
  return {items:items.filter(x=>x.origin!=='automatic'||allowed.has(x.id)),captured};
 }catch(error){releaseContextLineage(captured);
  // Even an empty/manual-only fallback must not return an old row or cross a
  // restore/consent boundary. Automatic source authority remains explicitly
  // unknown; no automatic body or successful completeness claim is returned.
  need(contextLineageReady(store));await contextLineageRead(store,async t=>{await new ContextTopicAccessService(store).admission(t,epoch);if(rowSerialized!==null)need(JSON.stringify(await t.get('meta','context-cards:v1'))===rowSerialized);},['meta'],workBudget.database);
  return {items:manual,captured:null,automaticEvaluation:{complete:false,reason:error?.lineageUnavailable==='budget_exceeded'?'budget_exceeded':'unavailable'}};
 }
}
