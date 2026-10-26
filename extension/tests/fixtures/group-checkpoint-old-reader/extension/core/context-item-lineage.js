import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {idOK,revisionOK} from './thought-model.js';
import {inputProjection} from './thought-evidence.js';
import {MemoryService} from './memory/service.js';
import {ContextTopicAccessService} from './context-topic-access.js';
import {readContextTopicScope,readContextProcessingPreflight,createContextScopeWorkBudget,CONTEXT_TOPIC_SCOPE_LIMITS} from './context-topic-scope.js';
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
const specKeys=['topicId','inputId','selectedFields','fieldDigests','expectedTopicBinding','expectedRemovalSequence'];
export function validContextEvidenceSpec(x){
 return lineageExact(x,specKeys)&&idOK(x.topicId)&&idOK(x.inputId)&&fields(x.selectedFields)&&hashes(x.fieldDigests,x.selectedFields)&&validContextTopicBinding(x.expectedTopicBinding)&&x.expectedTopicBinding.topicId===x.topicId&&revisionOK(x.expectedRemovalSequence);
}
export function validContextEvidenceSpecs(xs){return lineageArray(xs,CONTEXT_LINEAGE_LIMITS.inputs,1)&&xs.every(validContextEvidenceSpec)&&unique(xs.map(x=>x.inputId))&&new Set(xs.map(x=>x.topicId)).size<=CONTEXT_LINEAGE_LIMITS.topics;}
export function validContextMaintenance(x){
 if(!lineageExact(x,['version','associationIds','provenance'])||x.version!==1||!lineageArray(x.associationIds,CONTEXT_LINEAGE_LIMITS.associations,1)||!x.associationIds.every(contextTopicOperationId)||!unique(x.associationIds))return false;
 const p=x.provenance;
 return lineageExact(p,['epoch','evidence'])&&contextTopicEpoch(p.epoch)&&lineageArray(p.evidence,CONTEXT_LINEAGE_LIMITS.inputs,1)&&unique(p.evidence.map(e=>e?.inputId))&&new Set(p.evidence.map(e=>e?.topicId)).size<=CONTEXT_LINEAGE_LIMITS.topics&&p.evidence.every(e=>lineageExact(e,[...specKeys,'contentRevision','sourceRecordIds','sourceIdentityTokens'])&&validContextEvidenceSpec(Object.fromEntries(specKeys.map(k=>[k,e[k]])))&&e.expectedTopicBinding.epoch===p.epoch&&revisionOK(e.contentRevision)&&ids(e.sourceRecordIds,CONTEXT_LINEAGE_LIMITS.sources,1)&&sourceFamiliesMatch(e.sourceIdentityTokens,e.sourceRecordIds));
}
export const contextLineageSourceIds=item=>[...new Set(item.maintenance.provenance.evidence.flatMap(e=>e.sourceRecordIds))].sort();
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
 const fence=async t=>{
  const now=await contextLineageAdmission(store,t,captured.epoch);
  need(now.authority===captured.authority&&now.gate===captured.gate);
  if(rowSerialized!==null)need(JSON.stringify(await t.get('meta','context-cards:v1'))===rowSerialized);
 };
 need(contextLineageReady(store));return transaction?fence(transaction):contextLineageRead(store,fence,['meta'],captured.database||store.repository.db);
}

// Scope policy deliberately has no selection: ordinary Global/Card/Topic
// external-read switches cannot grant or revoke internal processing. Strong
// legacy/source restrictions and same-Entry membership vetoes remain intact.
async function assess(store,groups,{epoch,expectedAuthority=null,workBudget=createContextScopeWorkBudget()}={}){
 need(contextLineageReady(store)&&!workBudget.signal?.aborted);
 const database=workBudget.database||store.repository.db,captured=await contextLineageRead(store,t=>contextLineageAdmission(store,t,epoch),['meta'],database);captured.database=database;
 if(expectedAuthority!==null)need(captured.authority===expectedAuthority);
 const specs=groups.flatMap(g=>g.evidence),topics=[...new Set(specs.map(s=>s.topicId))],inputs=[...new Set(specs.map(s=>s.inputId))];
 if(topics.length>CONTEXT_LINEAGE_LIMITS.readTopics||inputs.length>CONTEXT_LINEAGE_LIMITS.readInputs)fail('budget_exceeded');
 const scopes=new Map();
 for(const topicId of topics){
  need(!workBudget.signal?.aborted);const requested=specs.filter(s=>s.topicId===topicId);
  // A body-free metadata probe may aggregate accepted Items up to its existing
  //4096-reference graph bound; each maintenance WRITE remains16 Inputs.
  const preflight=await readContextProcessingPreflight(store,{topicId,inputIds:[...new Set(requested.map(s=>s.inputId))],expectedAuthority:captured.authority},workBudget);
  if(!preflight.available||requested.some(s=>!sameContextTopicBinding(preflight.binding,s.expectedTopicBinding))){
   if(!preflight.available&&['scope_budget','hash_budget'].includes(preflight.reason))fail('budget_exceeded');
   if(!preflight.available&&!['input_unavailable','topic_unavailable','legacy_restricted','content_unavailable'].includes(preflight.reason))fail();
   scopes.set(topicId,null);continue;
  }
  const scope=await readContextTopicScope(store,{topicId,expectedAuthority:captured.authority},workBudget);
  if(!scope.available&&['scope_budget','hash_budget'].includes(scope.reason))fail('budget_exceeded');
  if(!scope.available)fail();
  scopes.set(topicId,scope.available&&evaluateContextTopicAccess(scope.snapshot).reason==='topic_off'?scope:null);
 }
 const material=await contextLineageRead(store,async transaction=>{
  const t=Object.create(transaction);for(const method of ['get','has'])t[method]=async(...args)=>{need(!workBudget.signal?.aborted);if(++workBudget.reads>CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail('budget_exceeded');return transaction[method](...args);};
  await fenceContextLineage(store,captured,{transaction:t});
  const rows=new Map(),memory=new MemoryService(store),filter=await t.get('meta','smart-filter');
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
  return rows;
 },undefined,database);
 try{
  // WebCrypto runs only after the material transaction has definitively closed.
  for(const row of material.values())if(row)for(const field of Object.keys(row.text)){need(!workBudget.signal?.aborted);row.hashes[field]=await hashText(row.text[field]);row.text[field]='';need(!workBudget.signal?.aborted);}
  await fenceContextLineage(store,captured);
  const results=groups.map(group=>{
   const evidence=[];let eligible=group.epoch===captured.epoch;
   for(const spec of group.evidence){
    const scope=scopes.get(spec.topicId),row=material.get(spec.inputId);
    const valid=scope&&scope.scope.inputIds.includes(spec.inputId)&&sameContextTopicBinding(scope.binding,spec.expectedTopicBinding)&&row&&row.removalSequence===spec.expectedRemovalSequence&&spec.selectedFields.every(f=>row.hashes[f]===spec.fieldDigests[f])&&(!Object.hasOwn(spec,'sourceRecordIds')||same(spec.sourceRecordIds,row.sourceRecordIds)&&same(spec.sourceIdentityTokens,row.sourceIdentityTokens));
    if(!valid){eligible=false;continue;}
    evidence.push({...Object.fromEntries(specKeys.map(k=>[k,structuredClone(spec[k])])),contentRevision:row.contentRevision,sourceRecordIds:[...row.sourceRecordIds],sourceIdentityTokens:[...row.sourceIdentityTokens]});
   }
   return {eligible,evidence};
  });
  return {captured,results};
 }finally{for(const row of material.values())if(row)row.text={};}
}
export async function captureContextEvidence(store,evidence,{epoch,expectedAuthority=null,signal=null}={}){
 need(validContextEvidenceSpecs(evidence));const result=await assess(store,[{epoch,evidence}],{epoch,expectedAuthority,workBudget:createContextScopeWorkBudget({signal,database:store.repository.db})});need(result.results[0].eligible);
 return {captured:result.captured,provenance:{epoch,evidence:result.results[0].evidence}};
}
export async function readableContextItems(store,items,{epoch,expectedAuthority=null,rowSerialized=null}={}){
 const automatic=items.filter(x=>x.origin==='automatic'&&x.maintenance.provenance.epoch===epoch),manual=items.filter(x=>x.origin!=='automatic');
 if(!automatic.length)return {items:manual,captured:null};
 need(automatic.every(x=>validContextMaintenance(x.maintenance)));
 const allowed=new Set(),workBudget=createContextScopeWorkBudget({database:store.repository.db});let captured=null;
 try{
  // Each batch has bounded retained material; every scope, point read and hash
  // consumes one request-wide budget. No durable Item capacity is reduced.
  for(let index=0;index<automatic.length;){
   const batch=[],topics=new Set(),inputs=new Set();
   while(index<automatic.length){const item=automatic[index],ts=new Set(topics),ins=new Set(inputs);for(const e of item.maintenance.provenance.evidence){ts.add(e.topicId);ins.add(e.inputId);}if(batch.length&&(ts.size>CONTEXT_LINEAGE_LIMITS.readTopics||ins.size>CONTEXT_LINEAGE_LIMITS.readInputs))break;batch.push(item);for(const id of ts)topics.add(id);for(const id of ins)inputs.add(id);index++;}
   const assessed=await assess(store,batch.map(x=>x.maintenance.provenance),{epoch,expectedAuthority:captured?.authority??expectedAuthority,workBudget});captured??=assessed.captured;
   for(let i=0;i<batch.length;i++)if(assessed.results[i].eligible)allowed.add(batch[i].id);
  }
  await fenceContextLineage(store,captured,{rowSerialized});
  return {items:items.filter(x=>x.origin!=='automatic'||allowed.has(x.id)),captured};
 }catch(error){
  // Even an empty/manual-only fallback must not return an old row or cross a
  // restore/consent boundary. Automatic source authority remains explicitly
  // unknown; no automatic body or successful completeness claim is returned.
  need(contextLineageReady(store));await contextLineageRead(store,async t=>{await new ContextTopicAccessService(store).admission(t,epoch);if(rowSerialized!==null)need(JSON.stringify(await t.get('meta','context-cards:v1'))===rowSerialized);},['meta'],workBudget.database);
  return {items:manual,captured:null,automaticEvaluation:{complete:false,reason:error?.lineageUnavailable==='budget_exceeded'?'budget_exceeded':'unavailable'}};
 }
}
