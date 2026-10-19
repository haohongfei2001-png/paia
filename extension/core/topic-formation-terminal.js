import {registerRepositoryFinalReadFence} from './idb-repository.js';
import {assertMaintenanceQualification,maintenanceQualificationWorkBudget} from './ai-usage/maintenance-qualification.js';
import {CONTEXT_TOPIC_SCOPE_LIMITS} from './context-topic-scope.js';
import {fail,same} from './thought-model.js';
const rootIds=['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','recovery-restore-epoch','backup-data-generation'];
const own=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row||{},key);if(d&&!Object.hasOwn(d,'value'))fail();return d?.value;};
const scalar=value=>{if(value!==null&&!['undefined','string','number','boolean'].includes(typeof value))fail();return value;};
const pick=(row,keys)=>row?Object.fromEntries(keys.filter(k=>Object.hasOwn(row,k)).map(k=>[k,scalar(own(row,k))])):null;
const strings=value=>{if(!Array.isArray(value)||value.length>1000)fail();return Array.from({length:value.length},(_,i)=>scalar(own(value,String(i))));};
const text=(row,key,current)=>{current();const value=row?.[key];current();if(value!==undefined&&value!==null&&typeof value!=='string')fail();return value;};
const block=(row,current)=>{if(!row)return null;const v=own(row,'value'),out=pick(v,['id','documentId','excluded','branchStatus','originalTextReference']);if(!v)fail();for(const key of ['libraryText','note'])if(Object.hasOwn(v,key))out[key]=text(v,key,current);const refs=own(v,'provenance');if(!Array.isArray(refs)||refs.length>1000)fail();out.provenance=Array.from({length:refs.length},(_,i)=>pick(own(refs,String(i)),['sourceRecordId']));return {id:scalar(own(row,'id')),value:out};};
const source=(row,current)=>{if(!row)return null;const v=own(row,'value'),out=pick(v,['sourceKey','contentHash','deletedAt','previousVersionId','platform','chatId','timeConfidence','sourceSentAt']);if(!v)fail();out.originalText=text(v,'originalText',current);return {id:scalar(own(row,'id')),value:out};};
const inputState=row=>{const out=pick(row,['id','contentRevision','lastRemovalSequence','removalState','sourcePurged']);if(row&&Object.hasOwn(row,'sourceRecordIds'))out.sourceRecordIds=strings(own(row,'sourceRecordIds'));return out;};
const filter=row=>{if(!row)return null;const out=pick(row,['id','decision','authorship','userEdited','presenceInvalid','filterOverride','basedOnContentRevision','filterVersion','policyVersion','classifierVersion','decisionSequence','aiOperationId']);if(Object.hasOwn(row,'presence'))out.presence=pick(own(row,'presence'),['version','attachment','reference','confidence']);const ai=own(row,'aiDecision');out.aiDecision=ai?pick(ai,['version','sequence']):null;return out;};
// Exact owner write intents are compared as data descriptors. An injected or
// future semantic getter is rejected before it can be evaluated by JSON/clone.
export function sameTopicWriteData(actual,expected,depth=0){
 if(Object.is(actual,expected))return true;if(depth>64||!actual||!expected||typeof actual!=='object'||typeof expected!=='object'||Array.isArray(actual)!==Array.isArray(expected))return false;
 const a=Object.getOwnPropertyDescriptors(actual),b=Object.getOwnPropertyDescriptors(expected),keys=Reflect.ownKeys(b);if(Reflect.ownKeys(a).length!==keys.length)return false;
 for(const key of keys)if(!a[key]||!Object.hasOwn(a[key],'value')||!Object.hasOwn(b[key],'value')||!sameTopicWriteData(a[key].value,b[key].value,depth+1))return false;return true;
}
// This original-owner snapshot contains only fields already read under the
// exact evidence grant. Source legacy annotations and unknown row fields never
// enter it. Its retention is charged by the caller's existing aggregate cap.
export async function captureTopicFormationTerminal(store,t,evidence,{retain,current}){
 const facts=[],seen=new Set(),add=async(table,key,project)=>{const ref=JSON.stringify([table,key]);if(seen.has(ref))return facts.find(x=>x.ref===ref).expected;seen.add(ref);current();const row=await t.get(table,key);current();const expected=retain(project(row,current));facts.push({ref,table,key,project,expected});return expected;};
 for(const id of ['gate','thought-library'])await add('meta',id,row=>pick(row,['id','enabled','epoch','sealed']));await add('meta','thought-suppression-key',row=>{if(!row)return null;const value=strings(own(row,'value'));if(value.length!==32||value.some(x=>!Number.isInteger(x)||x<0||x>255))fail();return {id:scalar(own(row,'id')),value};});
 for(const e of evidence){const b=await add('blocks',e.inputId,block);await add('inputStates',e.inputId,inputState);await add('filterInputs',e.inputId,filter);if(!b)fail();
  for(const ref of b.value.provenance){const id=ref.sourceRecordId,index=await add('recordIndex',id,row=>pick(row,['id','sourceKey','dedupeKey']));await add('records',id,source);if(index){await add('tombstones','source:'+index.sourceKey,row=>pick(row,['id','key','kind','deletedAt','removedAt','revision','sequence']));await add('tombstones','snapshot:'+index.dedupeKey,row=>pick(row,['id','key','kind','deletedAt','removedAt','revision','sequence']));await add('filterIntents',index.sourceKey,row=>row?{id:scalar(own(row,'id')),present:true}:null);}}
 }
 current();return facts;
}
export function registerTopicFormationTerminal(store,t,{facts,intents,baselines,root,qualification,current,compatibilityRecheck}){
 const expectedRoot=structuredClone(root);if(t.backupChanged)expectedRoot[5]=(expectedRoot[5]||0)+1;const writes=[...intents.values()].map(x=>structuredClone(x)),expected=new Map((baselines||[]).map(row=>[row.id,row]));for(const w of writes)if(w.store==='organizerWorkItems'&&expected.has(w.id))expected.set(w.id,w.value);
 const check=()=>{current();if(qualification)assertMaintenanceQualification(qualification,store);return true;};
 const get=function*(table,key){check();if(qualification){const budget=maintenanceQualificationWorkBudget(qualification,store);if(budget.reads>=CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail();budget.reads++;}const row=yield {method:'get',table,key};check();if(qualification&&row){const budget=maintenanceQualificationWorkBudget(qualification,store),ids=budget.seen.get(table)||new Set();ids.add(own(row,'id'));if(ids.size>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();budget.seen.set(table,ids);}return row;};
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:check,compatibilityRecheck,plan:function*(){
  const actual=[];for(const id of rootIds)actual.push((yield*get('meta',id))?.value??null);const f=yield*get('meta','smart-filter');actual.push(['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion'].map(k=>f?.[k]??null));if(!same(actual,expectedRoot))fail();
  for(const fact of facts)if(!same(fact.project(yield*get(fact.table,fact.key),check),fact.expected))fail();
  for(const [id,row]of expected)if(!sameTopicWriteData((yield*get('organizerWorkItems',id))??null,row))fail();
  for(const {store:table,id,value}of writes)if(!sameTopicWriteData((yield*get(table,id))??null,value))fail();
  return true;
 }});
}
