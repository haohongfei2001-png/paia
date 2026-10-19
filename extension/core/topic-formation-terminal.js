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
export function registerTopicFormationTerminal(store,t,{facts,intents,baselines,root,members=[],qualification,current,compatibilityRecheck}){
 const expectedRoot=structuredClone(root);if(t.backupChanged)expectedRoot[5]=(expectedRoot[5]||0)+1;const writes=[...intents.values()].map(x=>structuredClone(x)),expected=new Map((baselines||[]).map(row=>[row.id,row]));for(const w of writes)if(w.store==='organizerWorkItems'&&expected.has(w.id))expected.set(w.id,w.value);
 const check=()=>{current();if(qualification)assertMaintenanceQualification(qualification,store);return true;};
 const charge=()=>{check();if(qualification){const budget=maintenanceQualificationWorkBudget(qualification,store);if(budget.reads>=CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail();budget.reads++;}};
 const count=function*(table,index,key){charge();const value=yield {method:'count',table,index,key};check();return value;};
 const get=function*(table,key){check();if(qualification){const budget=maintenanceQualificationWorkBudget(qualification,store);if(budget.reads>=CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail();budget.reads++;}const row=yield {method:'get',table,key};check();if(qualification&&row){const budget=maintenanceQualificationWorkBudget(qualification,store),ids=budget.seen.get(table)||new Set();ids.add(own(row,'id'));if(ids.size>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();budget.seen.set(table,ids);}return row;};
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:check,compatibilityRecheck,plan:function*(){
  const actual=[];for(const id of rootIds)actual.push((yield*get('meta',id))?.value??null);const f=yield*get('meta','smart-filter');actual.push(['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion'].map(k=>f?.[k]??null));if(!same(actual,expectedRoot))fail();
  for(const fact of facts)if(!same(fact.project(yield*get(fact.table,fact.key),check),fact.expected))fail();
  for(const [id,row]of expected)if(!sameTopicWriteData((yield*get('organizerWorkItems',id))??null,row))fail();
  for(const {store:table,id,value}of writes)if(!sameTopicWriteData((yield*get(table,id))??null,value))fail();
  for(const {entryId,collections}of members)for(const {table,rows}of collections){const {index,key}=topicFormationMemberRange(table,entryId);if((yield*count(table,index,key))!==rows.length)fail();for(const expected of rows)if(!sameTopicWriteData(topicFormationMemberProjection(table,yield*get(table,expected.id)),expected))fail();}
  return true;
 }});
}

// Complete selected-Entry metadata collections, held by the original prepare.
// These positive projections never acquire future semantic fields or getters.
const memberFields={placements:['id','topicId','layoutGeneration','entryId','sectionId','rank','sectionRank','revision','activeKey','lifecycle','membershipAuthorship','sectionProtection','orderProtection','excludedByUser','removedWithTopicOperationId','membershipOperationId'],dependencies:['id','inputId','inputList','thoughtId','targetKind','targetId','eligibilityEpochAtUse','basedOnContentRevision','selectedFields','fieldDigests','validatedAgainstContentRevision','status','roles','sourceRecordIds','scopeToken','versionToken','lastEventSequence'],provenance:['id','ownerKind','ownerId','generationId','inputId','basedOnContentRevision','actualVersion','role','contributionType','formation','generatedAt','generator','inputAuthorshipAtUse','entryFieldAuthorshipAtCommit','sourceRecordIds','sourceIdentityTokens','scopeToken','versionToken','availability','contributionKey','span']};
const memberNested={fieldDigests:['body','note','title'],actualVersion:['inputRevision','projectionVersion','selectedFields','fieldDigests'],generator:['providerId','providerVersion','modelVersion','taskSchemaVersion','promptTemplateVersion','policyVersion'],span:['inputId','field','start','end','full']};
const memberLists=new Set(['inputList','selectedFields','roles','sourceRecordIds','sourceIdentityTokens']);
function memberValue(value,key){
 if(value===null||value===undefined)return value;
 if(memberLists.has(key)){if(!Array.isArray(value)||value.length>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();return Array.from({length:value.length},(_,i)=>memberScalar(own(value,String(i))));}
 if(memberNested[key]){if(typeof value!=='object'||Array.isArray(value))fail();return Object.fromEntries(memberNested[key].filter(k=>Object.hasOwn(value,k)).map(k=>[k,memberValue(own(value,k),k)]));}
 return memberScalar(value);
}
function memberScalar(value){scalar(value);if(typeof value==='number'&&!Number.isFinite(value)||typeof value==='string'&&value.length>65536)fail();return value;}
export function topicFormationMemberProjection(table,row){if(!row)return null;const fields=memberFields[table];if(!fields)fail();return Object.fromEntries(fields.filter(k=>Object.hasOwn(row,k)).map(k=>[k,memberValue(own(row,k),k)]));}
export function topicFormationMemberOwner(table,row){if(!row)return null;if(table==='thoughts')return own(row,'id');if(table==='placements')return own(row,'entryId');if(table==='dependencies')return own(row,'targetKind')==='entry'?own(row,'targetId'):null;if(table==='provenance')return own(row,'ownerKind')==='entry'?own(row,'ownerId'):null;return null;}
export function topicFormationMemberRange(table,entryId){if(table==='placements')return {index:'byEntry',key:IDBKeyRange.bound([entryId],[entryId,[]],false,true)};if(table==='dependencies')return {index:'byTarget',key:IDBKeyRange.bound(['entry',entryId],['entry',entryId,[]],false,true)};if(table==='provenance')return {index:'byOwner',key:IDBKeyRange.bound(['entry',entryId],['entry',entryId,[]],false,true)};fail();}
export async function captureTopicFormationMembers(t,entryIds,{charge=null}={}){
 if(!Array.isArray(entryIds)||entryIds.length>100||new Set(entryIds).size!==entryIds.length)fail();const members=[],counts=new Map();let bytes=0;
 for(const entryId of entryIds){const collections=[];for(const table of Object.keys(memberFields)){const {index,key}=topicFormationMemberRange(table,entryId),count=await t.count(table,index,key);if(!Number.isSafeInteger(count)||count<0||count>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();const rows=(await t.all(table,index,key,CONTEXT_TOPIC_SCOPE_LIMITS.refs+1)).map(row=>topicFormationMemberProjection(table,row)).sort((a,b)=>a.id.localeCompare(b.id));if(rows.length!==count||rows.some(row=>topicFormationMemberOwner(table,row)!==entryId))fail();counts.set(table,(counts.get(table)||0)+count);if(counts.get(table)>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();const text=JSON.stringify(rows);bytes+=new TextEncoder().encode(text).length;if(bytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes)fail();if(charge)charge(text);collections.push({table,rows});}members.push({entryId,collections});}return members;
}
export function expectedTopicFormationMembers(before,intents){
 return before.map(member=>({entryId:member.entryId,collections:member.collections.map(({table,rows})=>{const expected=new Map(rows.map(row=>[row.id,row]));for(const intent of intents.values())if(intent.store===table){expected.delete(intent.id);if(topicFormationMemberOwner(table,intent.value)===member.entryId)expected.set(intent.id,topicFormationMemberProjection(table,intent.value));}if(expected.size>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();return {table,rows:[...expected.values()].sort((a,b)=>a.id.localeCompare(b.id))};})}));
}
export async function assertTopicFormationMembers(t,members){
 for(const {entryId,collections}of members)for(const {table,rows}of collections){const {index,key}=topicFormationMemberRange(table,entryId);if(await t.count(table,index,key)!==rows.length)fail();for(const expected of rows)if(!sameTopicWriteData(topicFormationMemberProjection(table,await t.get(table,expected.id)),expected))fail();}return true;
}
