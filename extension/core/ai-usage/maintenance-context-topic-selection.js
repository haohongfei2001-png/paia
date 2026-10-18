import {equal,fail} from './contracts.js';
import {idOK,revisionOK,prefix} from '../thought-model.js';
import {rootReadAuthority} from '../organizer/root-read.js';
import {inputProjection} from '../thought-evidence.js';
import {hashText} from '../dedupe.js';
import {readContextProcessingPreflight,readContextTopicScope,createContextScopeWorkBudget,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {evaluateContextTopicAccess} from '../context-topic-access-policy.js';

// This module selects among current ordinary Input memberships. It owns no
// receipt, processing grant, Item, membership or persistent selection. A plain
// selection/Topic result is data, NOT proof of an original committed owner call.
export const MAINTENANCE_CONTEXT_TOPIC_SELECTION_LIMITS=Object.freeze({dependencies:100,memberships:100,topics:8,sources:128,bodyBytes:8*1024*1024});
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const array=(x,max)=>Array.isArray(x)&&x.length<=max&&Object.keys(x).length===x.length;
const ids=(x,max)=>array(x,max)&&x.every(idOK)&&new Set(x).size===x.length;
const need=x=>{if(!x)fail('STALE_BASE');};
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const sorted=x=>[...x].sort();
const fields=['topicId','entryId','entryRevision','entryContentRevision','bindingRevision','layoutGeneration','topicRevision','topicOrganizationRevision','sectionId','sectionRevision','placementId','placementRevision'];
const candidateValid=x=>plain(x)&&Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k))&&['topicId','entryId','sectionId'].every(k=>idOK(x[k]))&&fields.filter(k=>!['topicId','entryId','sectionId','placementId'].includes(k)).every(k=>revisionOK(x[k]))&&x.layoutGeneration>0&&x.placementId===JSON.stringify([x.topicId,x.layoutGeneration,x.entryId]);

// Pure data selection only. The trusted caller must independently authenticate
// topicId against this child's actual committed original Topic result, or the
// exact original Item provenance. Never choose first/sorted membership, infer a
// main Topic from an arbitrary result.topicIds array, or duplicate one Input's
// evidence under additional Topics.
export function selectMaintenanceContextTopic(memberships,{inputId,topicId}={}){
 need(plain(memberships)&&memberships.inputId===inputId&&idOK(inputId)&&idOK(topicId)&&array(memberships.candidates,MAINTENANCE_CONTEXT_TOPIC_SELECTION_LIMITS.memberships)&&memberships.candidates.every(candidateValid));
 need(new Set(memberships.candidates.map(c=>c.placementId)).size===memberships.candidates.length);
 need(new Set(memberships.candidates.map(c=>c.topicId)).size<=MAINTENANCE_CONTEXT_TOPIC_SELECTION_LIMITS.topics);
 need(memberships.candidates.some(c=>c.topicId===topicId));return topicId;
}

// Metadata-only membership projection, read in the caller's coherent readonly
// transaction. Count the entire dependency/membership union before retrieving
// Entry values (which contain bodies), blocks, or Source records. Original
// canonical eligibility and shared-Entry restrictions are checked separately.
export async function readMaintenanceContextMemberships(store,t,inputId){
 need(store?.repository?.db&&idOK(inputId)&&typeof t?.count==='function'&&typeof t?.all==='function');
 const limits=MAINTENANCE_CONTEXT_TOPIC_SELECTION_LIMITS,range=prefix([inputId,'entry']),count=await t.count('dependencies','byInputTarget',range);
 if(!revisionOK(count)||count>limits.dependencies)fail('BUDGET_EXCEEDED');
 const dependencies=await t.all('dependencies','byInputTarget',range,limits.dependencies+1);
 need(array(dependencies,limits.dependencies)&&dependencies.length===count&&new Set(dependencies.map(d=>d.id)).size===count);
 for(const d of dependencies)need(d.inputId===inputId&&d.targetKind==='entry'&&idOK(d.targetId)&&d.id===JSON.stringify([inputId,'entry',d.targetId]));
 const eligible=dependencies.filter(d=>d.status==='valid'&&array(d.selectedFields,2)&&d.selectedFields.includes('body')&&array(d.roles,3)&&d.roles.includes('primary'));
 const entries=[...new Set(eligible.map(d=>d.targetId))],ranges=[];let total=0;
 for(const entryId of entries){
  const range=prefix([entryId]),count=await t.count('placements','byEntry',range);
  if(!revisionOK(count)||(total+=count)>limits.memberships)fail('BUDGET_EXCEEDED');ranges.push({entryId,range,count});
 }
 const memberships=[];
 for(const query of ranges){
  const rows=await t.all('placements','byEntry',query.range,limits.memberships+1);
  need(array(rows,limits.memberships)&&rows.length===query.count);
  for(const p of rows){need(p.entryId===query.entryId&&idOK(p.topicId)&&idOK(p.sectionId)&&revisionOK(p.layoutGeneration)&&p.layoutGeneration>0&&revisionOK(p.revision)&&p.id===JSON.stringify([p.topicId,p.layoutGeneration,p.entryId])&&['active','removed','quarantined'].includes(p.lifecycle)&&(p.excludedByUser===undefined||typeof p.excludedByUser==='boolean'));memberships.push(p);}
 }
 need(new Set(memberships.map(p=>p.id)).size===memberships.length);
 const topicIds=[...new Set(memberships.filter(p=>p.lifecycle==='active').map(p=>p.topicId))];
 if(topicIds.length>limits.topics)fail('BUDGET_EXCEEDED');
 const state=await t.get('inputStates',inputId),index=await t.get('blockIndex',inputId);
 need(state?.id===inputId&&revisionOK(state.contentRevision)&&revisionOK(state.lastRemovalSequence??0)&&state.removalState==='active'&&!state.sourcePurged&&index?.id===inputId&&index.excluded===false&&ids(state.sourceRecordIds,limits.sources)&&state.sourceRecordIds.length);
 const topics=new Map(),sections=new Map(),candidates=[];
 for(const id of topicIds){const topic=await t.get('topics',id);need(topic?.id===id&&revisionOK(topic.revision)&&revisionOK(topic.organizationRevision)&&revisionOK(topic.activeLayoutGeneration));topics.set(id,topic);}
 for(const entryId of entries){
  const entry=await t.get('thoughts',entryId);
  if(!entry||entry.lifecycle!=='active'||entry.bodyBinding!=='input'||entry.workingInputId!==inputId||entry.inputRefs?.length!==1||entry.inputRefs[0]?.inputBlockId!==inputId||entry.provenanceType!=='input_original'||entry.integrity!=='complete')continue;
  need(revisionOK(entry.revision)&&revisionOK(entry.contentRevision)&&entry.bindingRevision===state.contentRevision);
  for(const p of memberships.filter(p=>p.entryId===entryId&&p.lifecycle==='active'&&!p.excludedByUser)){
   const topic=topics.get(p.topicId);
   if(topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId||topic.activeLayoutGeneration!==p.layoutGeneration)continue;
   const key=JSON.stringify([topic.id,topic.activeLayoutGeneration,p.sectionId]);
   if(!sections.has(key))sections.set(key,await t.get('sections',key));const section=sections.get(key);
   if(!section||section.lifecycle!=='active'||section.redirectTo)continue;
   need(section.id===key&&section.topicId===topic.id&&section.sectionId===p.sectionId&&section.layoutGeneration===p.layoutGeneration&&revisionOK(section.revision));
   candidates.push({topicId:topic.id,entryId,entryRevision:entry.revision,entryContentRevision:entry.contentRevision,bindingRevision:entry.bindingRevision,layoutGeneration:p.layoutGeneration,topicRevision:topic.revision,topicOrganizationRevision:topic.organizationRevision,sectionId:p.sectionId,sectionRevision:section.revision,placementId:p.id,placementRevision:p.revision});
  }
 }
 return {inputId,revision:state.contentRevision,removalSequence:state.lastRemovalSequence??0,sourceRecordIds:sorted(state.sourceRecordIds),authority:await rootReadAuthority(t),candidates};
}

/**
 * read is the original session's guarded readonly callback. assertSelection
 * is synchronous, REQUIRED, and must authenticate this child's exact settled operation/result
 * and Input against private owner state, or assert the original existing-Item
 * handle and return that Input's exact provenance Topic. It returns one Topic ID,
 * never a boolean, model claim or JSON "proof". The original session must not
 * install this callback for missing/unknown ACK, another child, replay or stale
 * provenance. This helper does not establish authentication by itself.
 *
 * All original processing permission, evidence and final Context transaction
 * guards remain required after this read. No independentContext/evidenceFor or
 * initialization/mutation owner is called here.
 */
export async function readMaintenanceContextTopicSelection(store,{input,read,assertSelection,scopeBudget=null}={}){
 if(typeof read!=='function'||typeof assertSelection!=='function')fail('UNAVAILABLE');
 need(store?.repository?.db&&plain(input)&&idOK(input.inputId)&&revisionOK(input.revision)&&revisionOK(input.removalSequence)&&digest(input.digest)&&ids(input.sourceRecordIds,128)&&input.sourceRecordIds.length&&array(input.sourceIdentityTokens,128)&&input.sourceIdentityTokens.length&&input.sourceIdentityTokens.every(x=>typeof x==='string'&&x.length>0&&x.length<=500));
 const expected=Object.fromEntries(['inputId','revision','removalSequence','digest','sourceRecordIds','sourceIdentityTokens'].map(k=>[k,structuredClone(input[k])])),database=store.repository.db;
 const current=()=>need(store.repository.db===database);
 const inspect=async t=>{
  current();const topicId=assertSelection(t,expected.inputId);current();if(!idOK(topicId)){Promise.resolve(topicId).catch(()=>{});fail('STALE_BASE');}
  const memberships=await readMaintenanceContextMemberships(store,t,expected.inputId);
  need(memberships.revision===expected.revision&&memberships.removalSequence===expected.removalSequence&&equal(memberships.sourceRecordIds,sorted(expected.sourceRecordIds)));
  return {memberships,topicId:selectMaintenanceContextTopic(memberships,{inputId:expected.inputId,topicId})};
 };
 const selected=await read(inspect);current();
 const budget=scopeBudget??createContextScopeWorkBudget({database});
 const options={topicId:selected.topicId,expectedAuthority:selected.memberships.authority};
 const preflight=await readContextProcessingPreflight(store,{...options,inputIds:[expected.inputId]},budget);current();
 if(!preflight.available)fail(['scope_budget','hash_budget'].includes(preflight.reason)?'BUDGET_EXCEEDED':'STALE_BASE');
 const scope=await readContextTopicScope(store,options,budget);current();
 if(!scope.available)fail(['scope_budget','hash_budget'].includes(scope.reason)?'BUDGET_EXCEEDED':'STALE_BASE');
 need(scope.scope.inputIds.includes(expected.inputId)&&evaluateContextTopicAccess(scope.snapshot).reason==='topic_off');
 const body=await read(async t=>{
  need(equal(await inspect(t),selected));
  const p=await inputProjection(store,t,expected.inputId);current();
  need(p&&p.contentRevision===expected.revision&&p.lastRemovalSequence===expected.removalSequence&&equal(p.sourceRecordIds,sorted(expected.sourceRecordIds))&&equal(p.identities,sorted(expected.sourceIdentityTokens))&&!await store.isFiltered(t,p.block,await t.get('meta','smart-filter')));
  if(typeof p.body!=='string'||p.body.length>MAINTENANCE_CONTEXT_TOPIC_SELECTION_LIMITS.bodyBytes)fail('BUDGET_EXCEEDED');
  budget.hashBytes+=new TextEncoder().encode(p.body).length;budget.hashFields++;
  if(budget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||budget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('BUDGET_EXCEEDED');return p.body;
 });
 need(await hashText(body)===expected.digest);current();
 await read(async t=>need(equal(await inspect(t),selected)));current();
 return {topicId:selected.topicId,scope};
}
