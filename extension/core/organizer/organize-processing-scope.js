import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {snapshot,freeze} from '../ai-usage/qwen-request-data.js';
import {prefix,idOK,ENTRY_FIELDS,ORGANIZATION_FIELDS} from '../thought-model.js';
import {fail} from '../ai-usage/contracts.js';

// Selection provenance only. This producer grants no field access, processing,
// entitlement or remote dispatch. The original explicit-action owner and its
// separate purpose policy must still authorize every selected field.
export const ORGANIZE_PROCESSING_SCOPE_LIMITS=Object.freeze({entries:100,inputs:100,sources:400,sections:100,rows:4096,bytes:262144,keys:16384});
const held=new WeakMap(),need=x=>{if(!x)fail('UNAVAILABLE');};
const own=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row||{},key);need(d&&Object.hasOwn(d,'value'));return d.value;};
const optional=(row,key)=>Object.hasOwn(row||{},key)?own(row,key):undefined;
const keys={
 topic:['id','revision','organizationRevision','activeLayoutGeneration','lifecycle','redirectTo','layoutJobId','defaultSectionId'],
 placement:['id','topicId','layoutGeneration','entryId','sectionId','revision','order','rank','lifecycle','excludedByUser','membershipAuthorship'],
 entry:['id','storageSchema','revision','dependencyRevision','contentRevision','lifecycle','bodyBinding','workingInputId','bindingRevision','bindingLength','sourceRecordIds','provenanceType','origin','hasHumanAction','fieldRevisions','authorship','protections','createdAt','updatedAt'],
 section:['id','topicId','layoutGeneration','sectionId','revision','rank','lifecycle','redirectTo','protections','authorship'],
 dependency:['id','targetKind','targetId','inputId','basedOnContentRevision','selectedFields','roles','fieldDigests','status','eligibilityEpochAtUse','sourceRecordIds'],
 provenance:['id','ownerKind','ownerId','inputId','role','selectedFields','sourceRecordIds','basedOnContentRevision','contributionType','span'],
 input:['id','documentId','revision','excluded','branchStatus','originalTextReference'],
 state:['id','contentRevision','lastRemovalSequence','removalState','sourcePurged'],
 source:['id','sequence','sourceKey','dedupeKey','contentHash','sourceSentAt','hidden','deletedAt']
};
const restrictionFields={
 config:['id','kind','version','revision','defaultPolicy','budget','retentionDays','onboarded','userTouched','externalAccess','localOnly','includeUnorganizedInputs'],
 topic:['id','kind','version','profileId','topicId','decision','layoutGeneration'],
 section:['id','kind','version','topicId','sectionId','excluded'],
 entry:['id','kind','version','entryId','excluded'],
 input:['id','kind','version','inputId','excluded']
};
const array=(v,max)=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&own(v,'length')<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,String(i))).every(Boolean);
const countKeys=v=>v&&typeof v==='object'?Reflect.ownKeys(v).length+Object.values(v).reduce((n,x)=>n+countKeys(x),0):0;
const scalar=value=>{need(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value));return value;};
const pick=(row,fields,project=scalar)=>{need(row&&typeof row==='object'&&!Array.isArray(row));return Object.fromEntries(fields.filter(k=>Object.hasOwn(row,k)).map(k=>[k,project(own(row,k),k)]));};
// Metadata objects are positive schemas too. A future semantic property nested
// under a known metadata field must never be copied into this selection proof.
function metadata(value,key){
 if(['sourceRecordIds','selectedFields','roles'].includes(key)){need(array(value,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources));return Array.from({length:value.length},(_,i)=>scalar(own(value,String(i))));}
 if(key==='fieldRevisions')return pick(value,ENTRY_FIELDS);
 if(key==='fieldDigests')return pick(value,['body','title','note']);
 if(key==='authorship')return pick(value,[...ENTRY_FIELDS,...ORGANIZATION_FIELDS],v=>pick(v,['actor','everHumanConfirmed','operationId','at']));
 if(key==='protections')return pick(value,[...ENTRY_FIELDS,...ORGANIZATION_FIELDS],v=>pick(v,['locked','reason','operationId','at']));
 if(key==='membershipAuthorship')return typeof value==='string'?value:pick(value,['actor','operationId','at','reason','revision']);
 if(key==='span')return pick(value,['inputId','field','start','end','full']);
 return scalar(value);
}

export async function captureOriginalOrganizeScope(store,t,topicId){
 need(store?.repository&&idOK(topicId));const repository=store.repository,identity=requireRepositoryTransactionScope(repository,t),database=repository.db;
 need(identity.database===database&&identity.mode==='readonly');let usedBytes=0,usedKeys=0,rows=0;
 const current=()=>{need(store.repository===repository&&repository.db===database&&requireRepositoryTransactionScope(repository,t)===identity);requireRepositoryTransactionDataMethods(repository,t);};
 const retain=(row,fields)=>{
  need(row&&typeof row==='object'&&!Array.isArray(row));const value={};
  for(const key of fields)if(Object.hasOwn(row,key))value[key]=metadata(own(row,key),key);
  let copied;try{copied=snapshot(value,{maxBytes:ORGANIZE_PROCESSING_SCOPE_LIMITS.bytes-usedBytes,maxKeys:ORGANIZE_PROCESSING_SCOPE_LIMITS.keys-usedKeys,maxString:8192});}catch{fail('RESOURCE_LIMIT');}
  usedBytes+=new TextEncoder().encode(JSON.stringify(copied)).length;usedKeys+=countKeys(copied);need(++rows<=ORGANIZE_PROCESSING_SCOPE_LIMITS.rows);return freeze(copied);
 };
 const get=async(table,id)=>{current();const value=await t.get(table,id);current();return value;};
 // Only use methods captured by the original Repository scope. Its legacy
 // all/edge convenience methods are not part of that exact-method capability.
 const all=async(table,index,key,limit)=>{current();const page=await t.rangePage(table,index,key,null,limit+1);current();need(page&&array(page.rows,limit)&&page.next===null);return page.rows.map(row=>own(row,'value'));};
 const gate=await get('meta','gate'),library=await get('meta','thought-library'),restore=await get('meta','recovery-restore-epoch');
 need(optional(gate,'enabled')===true&&optional(library,'sealed')!==true&&!await get('meta','backup-recovery-settings'));
 const rawTopic=await get('topics',topicId);need(rawTopic&&own(rawTopic,'id')===topicId&&own(rawTopic,'lifecycle')==='active'&&!optional(rawTopic,'redirectTo')&&!optional(rawTopic,'layoutJobId'));
 const topic=retain(rawTopic,keys.topic),generation=topic.activeLayoutGeneration;need(Number.isSafeInteger(generation)&&generation>0);
 const presentationRow=await get('meta','aiPresentation:'+topicId),presentation=presentationRow?freeze({fields:retain(presentationRow,['id','topicId','schemaVersion','presentationVersion','revision','needsUpdate','stale','updatedAt','userEditedAt','recoveryGeneration','recoveryPurgeRevision']),pendingCandidate:Object.hasOwn(presentationRow,'candidate')}):null;
 if(presentation)need(presentation.fields.id==='aiPresentation:'+topicId&&presentation.fields.topicId===topicId);
 const placements=(await all('placements','byTopicOrder',prefix([topicId,generation,0]),ORGANIZE_PROCESSING_SCOPE_LIMITS.entries)).map(row=>retain(row,keys.placement));
 const sectionRows=await all('sections','byTopicOrder',prefix([topicId,generation,0]),ORGANIZE_PROCESSING_SCOPE_LIMITS.sections),sections=sectionRows.map(row=>retain(row,keys.section));
 const entries=[],dependencies=[],provenance=[],inputs=[],sources=[],seenEntries=new Set(),inputIds=new Set(),sourceIds=new Set();
 const addId=(set,id,max)=>{need(idOK(id));set.add(id);need(set.size<=max);};
 for(const placement of placements){
  need(placement.topicId===topicId&&placement.layoutGeneration===generation&&placement.lifecycle==='active'&&!placement.excludedByUser);
  if(seenEntries.has(placement.entryId))continue;addId(seenEntries,placement.entryId,ORGANIZE_PROCESSING_SCOPE_LIMITS.entries);
  const raw=await get('thoughts',placement.entryId);need(raw&&own(raw,'id')===placement.entryId&&own(raw,'storageSchema')===2&&own(raw,'lifecycle')==='active');
  const entry=retain(raw,keys.entry);entries.push(entry);
  need(array(entry.sourceRecordIds||[],ORGANIZE_PROCESSING_SCOPE_LIMITS.sources));for(const id of entry.sourceRecordIds||[])addId(sourceIds,id,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);
  if(entry.bodyBinding==='input')addId(inputIds,entry.workingInputId,ORGANIZE_PROCESSING_SCOPE_LIMITS.inputs);
  for(const row of await all('dependencies','byTarget',prefix(['entry',entry.id]),ORGANIZE_PROCESSING_SCOPE_LIMITS.inputs)){
   const dep=retain(row,keys.dependency);need(dep.targetKind==='entry'&&dep.targetId===entry.id);addId(inputIds,dep.inputId,ORGANIZE_PROCESSING_SCOPE_LIMITS.inputs);dependencies.push(dep);
  }
  for(const row of await all('provenance','byOwner',prefix(['entry',entry.id]),ORGANIZE_PROCESSING_SCOPE_LIMITS.inputs)){
   const p=retain(row,keys.provenance);need(p.ownerKind==='entry'&&p.ownerId===entry.id);addId(inputIds,p.inputId,ORGANIZE_PROCESSING_SCOPE_LIMITS.inputs);provenance.push(p);
   need(array(p.sourceRecordIds||[],ORGANIZE_PROCESSING_SCOPE_LIMITS.sources));for(const id of p.sourceRecordIds||[])addId(sourceIds,id,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);
  }
 }
 for(const id of [...inputIds].sort()){
  const block=await get('blocks',id),raw=block&&own(block,'value'),state=await get('inputStates',id);need(raw&&own(raw,'id')===id&&state&&own(state,'removalState')==='active'&&!optional(state,'sourcePurged')&&!optional(raw,'excluded')&&!optional(raw,'branchStatus'));
  const input=retain(raw,keys.input),inputState=retain(state,keys.state),rawRefs=optional(raw,'provenance')||[];need(array(rawRefs,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources));
  const refs=rawRefs.map(p=>retain(p,['sourceRecordId']));for(const p of refs)addId(sourceIds,p.sourceRecordId,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);
  inputs.push(freeze({input,state:inputState,provenance:refs}));
 }
 for(const id of [...sourceIds].sort()){
  const raw=await get('recordIndex',id);need(raw&&own(raw,'id')===id);const source=retain(raw,keys.source);
  need(!await get('tombstones','source:'+source.sourceKey)&&!await get('tombstones','snapshot:'+source.dedupeKey));sources.push(source);
 }
 const restrictions=[],restrictionTopics=new Map([[topic.id,topic]]);
 for(const row of await all('meta',null,IDBKeyRange.bound('memory:','memory:\uffff'),ORGANIZE_PROCESSING_SCOPE_LIMITS.rows)){
  const kind=own(row,'kind');if(['profile','activity'].includes(kind))continue;need(Object.hasOwn(restrictionFields,kind));
  const fields=restrictionFields[kind];need(Reflect.ownKeys(row).every(key=>typeof key==='string'&&fields.includes(key)));const rule=retain(row,fields);restrictions.push(rule);
  if((kind==='topic'&&['denied','never'].includes(rule.decision))||kind==='section'){
   let id=rule.topicId;const visited=new Set();
   for(;;){need(idOK(id)&&!visited.has(id)&&visited.size<32);visited.add(id);let scope=restrictionTopics.get(id);if(!scope){scope=retain(await get('topics',id),keys.topic);restrictionTopics.set(id,scope);}
    if(!scope.redirectTo)break;id=scope.redirectTo;
   }
  }
 }
 const handle=Object.freeze({}),facts=freeze({version:1,purpose:'organize-selection-provenance',topic,presentation,placements,sections,entries,dependencies,provenance,inputs,sources,restrictions,restrictionTopics:[...restrictionTopics.values()],gate:retain(gate,['epoch','enabled']),restoreEpoch:optional(restore,'value')??'initial'});
 current();held.set(handle,{store,repository,database,t,identity,facts,released:false});return handle;
}
export function readOriginalOrganizeScope(handle,store,t){
 const r=held.get(handle);need(r&&!r.released&&r.store===store&&r.repository===store.repository&&r.database===r.repository.db&&r.t===t&&requireRepositoryTransactionScope(r.repository,t)===r.identity);requireRepositoryTransactionDataMethods(r.repository,t);return r.facts;
}
export function releaseOriginalOrganizeScope(handle){const r=held.get(handle);if(r){r.released=true;r.facts=null;held.delete(handle);}}
