import {readOriginalOrganizeCandidateWriteIntent,originalOrganizeWriteShape} from './ai-presentation.js';
import {assertOriginalOrganizeActionCurrent,assertOriginalOrganizeActionFacts,chargeOriginalOrganizeActionWork,readOriginalOrganizeAction,assertOriginalOrganizePaidMetadataFacts,retireOriginalOrganizeMetadataAction} from '../../background/organize-action-source.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods,registerRepositoryFinalReadFence} from '../idb-repository.js';
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
 topic:['id','revision','organizationRevision','activeLayoutGeneration','lifecycle','redirectTo','layoutJobId','defaultSectionId','sourceRecordIds','protections'],
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

const presentationFields=['id','topicId','schemaVersion','presentationVersion','revision','needsUpdate','stale','updatedAt','userEditedAt','recoveryGeneration','recoveryPurgeRevision'];
const provenanceReferenceFields=['sourceRecordId'],organizationSourceFields=['id','present','sourceTombstone','snapshotTombstone'],gateFields=['epoch','enabled'];
const fieldOwnerFields=[...ENTRY_FIELDS,...ORGANIZATION_FIELDS];
const retentionSchemas=[...Object.values(keys),...Object.values(restrictionFields),presentationFields,provenanceReferenceFields,organizationSourceFields,gateFields];
// Facts provenance carries no original transaction/proof/grant. Each resource
// receipt records an actual successful original bounded retain in sequence.
const paidFactsProvenance=new WeakMap(),paidMetadataBaselines=new WeakMap();
const encodedBytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const primitive=value=>value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value);

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

export function captureOriginalOrganizeScope(store,t,topicId,source=null,action=null){need((source===null)===(action===null));return captureScope(store,t,topicId,source,action,false);}
export function captureOriginalOrganizeCommitScope(store,t,topicId,source,action){need(source&&action);return captureScope(store,t,topicId,source,action,true);}
async function captureScope(store,t,topicId,source,action,commit){
 try{
  if(source!==null&&!commit){
   assertOriginalOrganizeActionFacts(source,action,store);
   const baseline=paidMetadataBaselines.get(action);
   if(baseline){
    need(baseline.source===source&&baseline.store===store&&baseline.state!=='retired');
    if(baseline.state==='registered')return await capturePaidScope(store,t,topicId,source,action,baseline);
    need(baseline.state==='never-eligible');assertOriginalOrganizePaidMetadataFacts(source,action,store,null);
   }else assertOriginalOrganizePaidMetadataFacts(source,action,store,null);
  }
  return await captureFullScope(store,t,topicId,source,action,commit);
 }catch(error){if(source!==null&&!commit)retireOriginalOrganizeMetadataAction(source,action,store);throw error;}
}
async function captureFullScope(store,t,topicId,source,action,commit){
 need(typeof topicId==='string'&&idOK(topicId));if(source!==null)assertOriginalOrganizeActionFacts(source,action,store);const repository=own(store,'repository'),identity=requireRepositoryTransactionScope(repository,t),database=own(repository,'db'),bound=source!==null;
 need(identity.database===database&&identity.mode===(commit?'readwrite':'readonly'));let usedBytes=0,usedKeys=0,rows=0;
 const observations=new Map(),ranges=[],paidReceipts=bound&&!commit&&!paidMetadataBaselines.has(action)?[]:null;
 const privateFacts=()=>{need(own(store,'repository')===repository&&own(repository,'db')===database&&requireRepositoryTransactionScope(repository,t)===identity);requireRepositoryTransactionDataMethods(repository,t);if(bound)assertOriginalOrganizeActionFacts(source,action,store);};
 const current=()=>{privateFacts();if(bound)assertOriginalOrganizeActionCurrent(source,action,store);privateFacts();};
 const debit=(reads,bytes)=>{if(bound)chargeOriginalOrganizeActionWork(source,action,store,reads,bytes);};
 const observe=(table,key,row)=>{if(!commit)return;need(typeof table==='string'&&typeof key==='string');const projection=commitMetadataProjection(table,key,row),tag=JSON.stringify([table,key]),encoded=JSON.stringify(projection),prior=observations.get(tag);if(prior)need(prior.encoded===encoded);else{debit(0,new TextEncoder().encode(encoded).length);observations.set(tag,{table,key,projection,encoded});}};
 const retain=(row,fields)=>{
  need(row&&typeof row==='object'&&!Array.isArray(row));const value={};
  for(const key of fields)if(Object.hasOwn(row,key))value[key]=metadata(own(row,key),key);
  let copied;try{copied=snapshot(value,{maxBytes:ORGANIZE_PROCESSING_SCOPE_LIMITS.bytes-usedBytes,maxKeys:ORGANIZE_PROCESSING_SCOPE_LIMITS.keys-usedKeys,maxString:8192});}catch{fail('RESOURCE_LIMIT');}
  const retainedBytes=new TextEncoder().encode(JSON.stringify(copied)).length,retainedKeys=countKeys(copied),priorBytes=usedBytes,priorKeys=usedKeys;debit(0,retainedBytes);usedBytes+=retainedBytes;usedKeys+=retainedKeys;need(++rows<=ORGANIZE_PROCESSING_SCOPE_LIMITS.rows);freeze(copied);
  if(paidReceipts){const schema=retentionSchemas.indexOf(fields);need(schema>=0);const metrics=Object.freeze([schema,priorBytes,priorKeys,retainedBytes,retainedKeys]);debit(0,encodedBytes(metrics));paidReceipts.push(Object.freeze({value:copied,metrics}));}
  return copied;
 };
 const get=async(table,id)=>{current();debit(1,0);const value=await t.get(table,id);current();observe(table,id,value);return value;};
 // Only use methods captured by the original Repository scope. Its legacy
 // all/edge convenience methods are not part of that exact-method capability.
 const all=async(table,index,key,limit)=>{current();debit(1,0);const page=await t.rangePage(table,index,key,null,limit+1);current();need(page&&array(page.rows,limit)&&page.next===null);const values=page.rows.map(row=>own(row,'value'));if(commit){ranges.push(Object.freeze({method:'count',table,index:index??undefined,key,expected:values.length}));for(const row of values)observe(table,own(row,'id'),row);}return values;};
 const gate=await get('meta','gate'),library=await get('meta','thought-library'),restore=await get('meta','recovery-restore-epoch');
 need(optional(gate,'enabled')===true&&optional(library,'sealed')!==true&&!await get('meta','backup-recovery-settings'));
 const rawTopic=await get('topics',topicId);need(rawTopic&&own(rawTopic,'id')===topicId&&own(rawTopic,'lifecycle')==='active'&&!optional(rawTopic,'redirectTo')&&!optional(rawTopic,'layoutJobId'));
 const topic=retain(rawTopic,keys.topic),generation=topic.activeLayoutGeneration;need(Number.isSafeInteger(generation)&&generation>0);
 const presentationRow=await get('meta','aiPresentation:'+topicId),presentation=presentationRow?freeze({fields:retain(presentationRow,presentationFields),pendingCandidate:Object.hasOwn(presentationRow,'candidate')}):null;
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
  const refs=rawRefs.map(p=>retain(p,provenanceReferenceFields));for(const p of refs)addId(sourceIds,p.sourceRecordId,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);
  inputs.push(freeze({input,state:inputState,provenance:refs}));
 }
 for(const id of [...sourceIds].sort()){
  const raw=await get('recordIndex',id);need(raw&&own(raw,'id')===id);const source=retain(raw,keys.source);
  need(!await get('tombstones','source:'+source.sourceKey)&&!await get('tombstones','snapshot:'+source.dedupeKey));sources.push(source);
 }
 // The original Topic label owner needs Source existence to sanitize an
 // unconfirmed derived name. These are metadata-only presence observations;
 // they are deliberately separate from sources that receive originalText grants.
 const organizationSources=[],organizationSourceIds=new Set();
 need(array(topic.sourceRecordIds||[],ORGANIZE_PROCESSING_SCOPE_LIMITS.sources));
 for(const id of topic.sourceRecordIds||[])addId(organizationSourceIds,id,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);
 need(new Set([...sourceIds,...organizationSourceIds]).size<=ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);
 for(const id of [...organizationSourceIds].sort()){
  const rawIndex=await get('recordIndex',id);let index=null,present=false,sourceTombstone=false,snapshotTombstone=false;
  if(rawIndex){need(own(rawIndex,'id')===id);index=retain(rawIndex,keys.source);const record=await get('records',id);present=!!record;if(present)need(own(record,'id')===id);
   const sourceKey='source:'+index.sourceKey,snapshotKey='snapshot:'+index.dedupeKey,sourceRow=await get('tombstones',sourceKey),snapshotRow=await get('tombstones',snapshotKey);
   sourceTombstone=!!sourceRow;snapshotTombstone=!!snapshotRow;if(sourceRow)need(own(sourceRow,'id')===sourceKey);if(snapshotRow)need(own(snapshotRow,'id')===snapshotKey);
  }
  organizationSources.push(freeze({...retain({id,present,sourceTombstone,snapshotTombstone},organizationSourceFields),index}));
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
 const handle=Object.freeze({}),facts=freeze({version:1,purpose:'organize-selection-provenance',topic,presentation,placements,sections,entries,dependencies,provenance,inputs,sources,organizationSources,restrictions,restrictionTopics:[...restrictionTopics.values()],gate:retain(gate,gateFields),restoreEpoch:optional(restore,'value')??'initial'});
 if(paidReceipts){
  // Charge the actual new receipt sequence container. Tuple contents were
  // charged when created, never serialized together with metadata a second time.
  debit(0,2+(paidReceipts.length?paidReceipts.length-1:0));Object.freeze(paidReceipts);
  paidFactsProvenance.set(facts,Object.freeze({source,action,store,repository,database,facts,receipts:paidReceipts,rows,usedBytes,usedKeys,eligible:primitive(facts.restoreEpoch)}));
 }
 current();const record={store,repository,database,t,identity,facts,released:false,commit,source,action,observations,ranges,writeIntent:null,writeCap:null,actionSignal:null};held.set(handle,record);if(bound)try{record.actionSignal=readOriginalOrganizeAction(source,action,store,t,handle).signal;}catch(error){releaseOriginalOrganizeScope(handle);throw error;}return handle;
}
export function readOriginalOrganizeScope(handle,store,t){
 const r=held.get(handle);
 // Foreign caller arguments do not establish an observed owner failure.
 need(r&&!r.released&&r.store===store&&r.t===t);
 try{
  need(r.repository===own(store,'repository')&&r.database===own(r.repository,'db')&&requireRepositoryTransactionScope(r.repository,t)===r.identity);requireRepositoryTransactionDataMethods(r.repository,t);
  if(r.paidReuse){const baseline=paidMetadataBaselines.get(r.action);need(baseline?.state==='registered'&&baseline.source===r.source&&baseline.store===store&&baseline.stamp===r.paidReuse);assertOriginalOrganizeActionFacts(r.source,r.action,store);}
  return r.facts;
 }catch(error){if(r?.paidReuse){r.released=true;retireOriginalOrganizeMetadataAction(r.source,r.action,r.store);}throw error;}
}
// The GET selection proof is never a substitute for a consumed-action proof.
export function requireOriginalOrganizeActionScope(handle,source,action,store,t){
 const r=held.get(handle);need(r&&r.source===source&&r.action===action&&source!==null&&action!==null);
 try{const facts=readOriginalOrganizeScope(handle,store,t);assertOriginalOrganizeActionFacts(source,action,store);return facts;}catch(error){r.released=true;throw error;}
}
// Deny-only bridge for an independently granted consumer of this exact
// readonly snapshot. A returned boolean grants no row, field or later txn.
export function hasOriginalOrganizeEmptyRelationship(handle,source,action,store,t,table,entryId){
 const facts=requireOriginalOrganizeActionScope(handle,source,action,store,t),r=held.get(handle);
 need(table==='dependencies'||table==='provenance');
 return !r.commit&&r.identity.mode==='readonly'&&(table==='dependencies'?r.observation?.emptyDependencies:r.observation?.emptyProvenance)===true&&facts.entries.some(entry=>entry.id===entryId);
}
export function releaseOriginalOrganizeScope(handle){const r=held.get(handle);if(r){r.released=true;r.facts=null;held.delete(handle);}}

// Positive metadata projections only. Terminal comparisons never enumerate an
// unknown semantic field and never call a row getter.
function commitMetadataProjection(table,key,row){
 if(row===undefined||row===null)return Object.freeze({present:false});
 need(own(row,'id')===key);let value;
 const project=(v,fields)=>pick(v,fields,metadata);
 if(table==='topics')value=project(row,keys.topic);
 else if(table==='thoughts')value=project(row,keys.entry);
 else if(table==='placements')value=project(row,keys.placement);
 else if(table==='sections')value=project(row,keys.section);
 else if(table==='dependencies')value=project(row,keys.dependency);
 else if(table==='provenance')value=project(row,keys.provenance);
 else if(table==='recordIndex')value=project(row,keys.source);
 else if(table==='records'||table==='tombstones')value={id:key};
 else if(table==='inputStates')value=project(row,keys.state);
 else if(table==='blocks'){const b=own(row,'value'),refs=optional(b,'provenance')||[];need(array(refs,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources));value={id:key,value:project(b,keys.input),provenance:refs.map(v=>project(v,['sourceRecordId']))};}
 else if(table==='meta'){
  if(key==='gate')value=project(row,['id','enabled','epoch','consentVersion']);
  else if(key==='thought-library')value=project(row,['id','sealed','phase','schemaVersion','verified']);
  else if(key==='recovery-restore-epoch')value=project(row,['id','value']);
  else if(key==='backup-recovery-settings')value={id:key};
  else if(key.startsWith('aiPresentation:'))value={fields:project(row,['id','topicId','schemaVersion','presentationVersion','revision','needsUpdate','stale','updatedAt','userEditedAt','recoveryGeneration','recoveryPurgeRevision']),pendingCandidate:Object.hasOwn(row,'candidate')};
  else if(key.startsWith('memory:')){const kind=own(row,'kind');if(['profile','activity'].includes(kind))value=project(row,['id','kind']);else{need(Object.hasOwn(restrictionFields,kind));need(Reflect.ownKeys(row).every(k=>typeof k==='string'&&restrictionFields[kind].includes(k)));value=project(row,restrictionFields[kind]);}}
  else fail('UNAVAILABLE');
 }else fail('UNAVAILABLE');
 return freeze({present:true,value:snapshot(value,{maxBytes:262144,maxKeys:16384,maxString:8192})});
}
export function requireOriginalOrganizeCommitScope(handle,store,t){const r=held.get(handle);need(r&&r.commit&&r.store===store&&r.t===t);try{const facts=readOriginalOrganizeScope(handle,store,t);need(r.identity.mode==='readwrite');assertOriginalOrganizeActionFacts(r.source,r.action,store);return facts;}catch(error){r.released=true;throw error;}}
export function* originalOrganizeCommitSelectionPlan(handle,store,t){
 requireOriginalOrganizeCommitScope(handle,store,t);const r=held.get(handle);
 for(const {expected,...spec}of r.ranges){chargeOriginalOrganizeActionWork(r.source,r.action,store,1,0);const count=yield spec;need(count===expected);}
 const writes=r.writeIntent?readOriginalOrganizeCandidateWriteIntent(r.writeIntent,store,t,r.writeCap,true).writes:[];
 for(const observation of r.observations.values()){
  chargeOriginalOrganizeActionWork(r.source,r.action,store,1,new TextEncoder().encode(observation.encoded).length);const row=yield {method:'get',table:observation.table,key:observation.key};
  const written=writes.find(w=>w.table===observation.table&&w.key===observation.key);
  if(written){need(JSON.stringify(commitMetadataProjection(observation.table,observation.key,written.before))===observation.encoded);need(JSON.stringify(commitMetadataProjection(observation.table,observation.key,row))===JSON.stringify(commitMetadataProjection(observation.table,observation.key,written.after)));}
  else need(JSON.stringify(commitMetadataProjection(observation.table,observation.key,row))===observation.encoded);
 }
 requireOriginalOrganizeCommitScope(handle,store,t);return true;
}

const commitSelectionRegistrations=new WeakMap();
function selectionAuthority(handle,repository,t){
 const r=held.get(handle);need(r&&r.commit&&!r.released&&r.repository===repository&&r.t===t&&commitSelectionRegistrations.get(t)===handle);
 requireOriginalOrganizeCommitScope(handle,r.store,t);return r;
}
// Fixed deny-only handoff to the original Repository owner. This is the signal
// captured by the already admitted original action, never a caller-supplied
// signal, field grant, fresh authority or replacement transaction.
export function readOriginalOrganizeSelectionAbortSignal(handle,repository,t){const r=selectionAuthority(handle,repository,t);need(r.actionSignal!==null);return r.actionSignal;}
export function requireOriginalOrganizeSelectionFinalFacts(handle,repository,t){selectionAuthority(handle,repository,t);return true;}
export function sampleOriginalOrganizeSelectionFinalFacts(handle,repository,t){const r=selectionAuthority(handle,repository,t);assertOriginalOrganizeActionCurrent(r.source,r.action,r.store);selectionAuthority(handle,repository,t);return true;}
// Original plan-only admission. No field reader, field grant or dispatch right
// is produced by registering this metadata fence.
export function registerOriginalOrganizeCommitSelectionFence(handle,store,t){
 requireOriginalOrganizeCommitScope(handle,store,t);const r=held.get(handle),prior=commitSelectionRegistrations.get(t);
 if(prior){need(prior===handle);selectionAuthority(handle,r.repository,t);return true;}
 commitSelectionRegistrations.set(t,handle);
 try{registerRepositoryFinalReadFence(r.repository,t,{plan:()=>originalOrganizeCommitSelectionPlan(handle,store,t),isCurrent:()=>{assertOriginalOrganizeActionCurrent(r.source,r.action,store);return requireOriginalOrganizeSelectionFinalFacts(handle,r.repository,t);},organizeSelectionAuthority:handle});return true;}catch(error){r.released=true;throw error;}
}

export function registerOriginalOrganizeCommitSelectionWrite(handle,store,t,cap,intent){
 const r=selectionAuthority(handle,own(store,'repository'),t);need(r.store===store&&r.writeIntent===null);const writeView=readOriginalOrganizeCandidateWriteIntent(intent,store,t,cap);
 need(originalOrganizeWriteShape(writeView,r.facts.topic.id));r.writeIntent=intent;r.writeCap=cap;return true;
}

// This registrar does not return the baseline. Its two private owners must
// agree on the exact first paid capture after original consume authentication.
export function registerOriginalOrganizePaidMetadataBaseline(source,action,store,metadata){
 try{
  need(assertOriginalOrganizePaidMetadataFacts(source,action,store,metadata));
  const stamp=paidFactsProvenance.get(metadata),prior=paidMetadataBaselines.get(action);
  need(stamp&&stamp.source===source&&stamp.action===action&&stamp.store===store&&stamp.repository===own(store,'repository')&&stamp.database===own(stamp.repository,'db')&&stamp.facts===metadata);
  if(prior){need(prior.state==='registered'&&prior.source===source&&prior.store===store&&prior.stamp===stamp);return true;}
  const state=stamp.eligible?'registered':'never-eligible';
  paidMetadataBaselines.set(action,{state,source,store,stamp:stamp.eligible?stamp:null});
  return stamp.eligible;
 }catch(error){retireOriginalOrganizeMetadataAction(source,action,store);throw error;}
}
export function retireOriginalOrganizePaidMetadataBaseline(source,action){
 const r=paidMetadataBaselines.get(action);if(r&&r.source===source){r.state='retired';r.stamp=null;}return true;
}
export function isOriginalOrganizePaidMetadataScope(handle,source,action,store,t,metadata){
 const r=held.get(handle);if(!r?.paidReuse)return false;
 const baseline=paidMetadataBaselines.get(action);
 need(baseline?.state==='registered'&&baseline.source===source&&baseline.store===store&&r.source===source&&r.action===action&&r.store===store&&r.t===t&&!r.commit&&r.identity.mode==='readonly'&&r.paidReuse===baseline.stamp&&metadata===baseline.stamp.facts);
 need(readOriginalOrganizeScope(handle,store,t)===metadata&&assertOriginalOrganizePaidMetadataFacts(source,action,store,metadata));return true;
}

// Exact positive-schema comparison without building a normalized projection.
// Raw object prototype/descriptor flags retain the original pick semantics.
function sameMetadataScalar(value,expected){scalar(value);need(value===expected);}
function sameMetadataPick(value,expected,fields,project=sameMetadataScalar){
 need(value&&typeof value==='object'&&!Array.isArray(value)&&expected&&typeof expected==='object'&&!Array.isArray(expected));
 for(const key of fields){const present=Object.hasOwn(value,key);need(present===Object.hasOwn(expected,key));if(present)project(own(value,key),own(expected,key),key);}
}
function sameMetadataValue(value,expected,key){
 if(key==='sourceRecordIds'||key==='selectedFields'||key==='roles'){
  need(Array.isArray(value)&&Object.getPrototypeOf(value)===Array.prototype&&Array.isArray(expected));const length=own(value,'length');
  need(length===expected.length&&length<=ORGANIZE_PROCESSING_SCOPE_LIMITS.sources&&Reflect.ownKeys(value).length===length+1);
  for(let i=0;i<length;i++)sameMetadataScalar(own(value,String(i)),expected[i]);return;
 }
 if(key==='fieldRevisions'){sameMetadataPick(value,expected,ENTRY_FIELDS);return;}
 if(key==='fieldDigests'){sameMetadataPick(value,expected,['body','title','note']);return;}
 if(key==='authorship'){sameMetadataPick(value,expected,fieldOwnerFields,(v,e)=>sameMetadataPick(v,e,['actor','everHumanConfirmed','operationId','at']));return;}
 if(key==='protections'){sameMetadataPick(value,expected,fieldOwnerFields,(v,e)=>sameMetadataPick(v,e,['locked','reason','operationId','at']));return;}
 if(key==='membershipAuthorship'){if(typeof value==='string')sameMetadataScalar(value,expected);else sameMetadataPick(value,expected,['actor','operationId','at','reason','revision']);return;}
 if(key==='span'){sameMetadataPick(value,expected,['inputId','field','start','end','full']);return;}
 sameMetadataScalar(value,expected);
}
async function capturePaidScope(store,t,topicId,source,action,baseline){
 need(typeof topicId==='string'&&idOK(topicId)&&baseline.state==='registered');
 const stamp=baseline.stamp,facts=stamp.facts,repository=own(store,'repository'),database=own(repository,'db'),identity=requireRepositoryTransactionScope(repository,t);
 need(stamp.source===source&&stamp.action===action&&stamp.store===store&&stamp.repository===repository&&stamp.database===database&&identity.database===database&&identity.mode==='readonly'&&facts.topic.id===topicId);
 let usedBytes=0,usedKeys=0,rows=0;
 const privateFacts=()=>{
  need(baseline.state==='registered'&&baseline.stamp===stamp&&paidMetadataBaselines.get(action)===baseline&&own(store,'repository')===repository&&own(repository,'db')===database&&requireRepositoryTransactionScope(repository,t)===identity);
  requireRepositoryTransactionDataMethods(repository,t);need(assertOriginalOrganizePaidMetadataFacts(source,action,store,facts));
 };
 const current=()=>{privateFacts();assertOriginalOrganizeActionCurrent(source,action,store);privateFacts();};
 const debit=(reads,bytes)=>chargeOriginalOrganizeActionWork(source,action,store,reads,bytes);
 const get=async(table,id)=>{current();debit(1,0);const row=await t.get(table,id);current();return row;};
 const all=async(table,index,key,limit)=>{current();debit(1,0);const page=await t.rangePage(table,index,key,null,limit+1);current();need(page&&array(page.rows,limit)&&page.next===null);return page.rows;};
 // An aggregate absence fact is private to this exact readonly transaction.
 // Only these two fixed relationship tables may avoid known-empty ranges.
 const emptyTable=async table=>{
  need(table==='dependencies'||table==='provenance');current();debit(1,0);
  const count=await t.count(table);current();need(Number.isSafeInteger(count)&&count>=0);return count===0;
 };
 const pageRow=(page,i)=>own(own(page,String(i)),'value');
 const resource=(expected,fields)=>{
  const receipt=stamp.receipts[rows];need(receipt&&receipt.value===expected);const m=receipt.metrics;
  need(retentionSchemas[m[0]]===fields&&m[1]===usedBytes&&m[2]===usedKeys);
  usedBytes+=m[3];usedKeys+=m[4];rows++;
  need(rows<=ORGANIZE_PROCESSING_SCOPE_LIMITS.rows&&usedBytes<=ORGANIZE_PROCESSING_SCOPE_LIMITS.bytes&&usedKeys<=ORGANIZE_PROCESSING_SCOPE_LIMITS.keys);return expected;
 };
 const match=(row,fields,expected)=>{sameMetadataPick(row,expected,fields,sameMetadataValue);return resource(expected,fields);};
 const nextValue=()=>{const receipt=stamp.receipts[rows];need(receipt);return receipt.value;};
 const gate=await get('meta','gate'),library=await get('meta','thought-library'),restore=await get('meta','recovery-restore-epoch');
 need(optional(gate,'enabled')===true&&optional(library,'sealed')!==true&&!await get('meta','backup-recovery-settings'));
 need((optional(restore,'value')??'initial')===facts.restoreEpoch);
 const rawTopic=await get('topics',topicId);need(rawTopic&&own(rawTopic,'id')===topicId&&own(rawTopic,'lifecycle')==='active'&&!optional(rawTopic,'redirectTo')&&!optional(rawTopic,'layoutJobId'));
 const topic=match(rawTopic,keys.topic,facts.topic),generation=topic.activeLayoutGeneration;need(Number.isSafeInteger(generation)&&generation>0);
 const presentation=await get('meta','aiPresentation:'+topicId);need(!!presentation===!!facts.presentation);
 if(presentation){match(presentation,presentationFields,facts.presentation.fields);need(Object.hasOwn(presentation,'candidate')===facts.presentation.pendingCandidate&&facts.presentation.fields.id==='aiPresentation:'+topicId&&facts.presentation.fields.topicId===topicId);}
 const placements=await all('placements','byTopicOrder',prefix([topicId,generation,0]),ORGANIZE_PROCESSING_SCOPE_LIMITS.entries);need(placements.length===facts.placements.length);
 for(let i=0;i<placements.length;i++)match(pageRow(placements,i),keys.placement,facts.placements[i]);
 const sections=await all('sections','byTopicOrder',prefix([topicId,generation,0]),ORGANIZE_PROCESSING_SCOPE_LIMITS.sections);need(sections.length===facts.sections.length);
 for(let i=0;i<sections.length;i++)match(pageRow(sections,i),keys.section,facts.sections[i]);
 // Complete placement/section membership and positive fields have already
 // matched the paid immutable closure. A zero table count is stronger than
 // each empty selected range; positive counts retain the original range IO.
 const emptyDependencies=facts.entries.length>=2&&facts.dependencies.length===0&&await emptyTable('dependencies');
 const emptyProvenance=facts.entries.length>=2&&facts.provenance.length===0&&await emptyTable('provenance');
 let entryAt=0,dependencyAt=0,provenanceAt=0;
 for(let at=0;at<facts.placements.length;at++){
  const placement=facts.placements[at];need(placement.topicId===topicId&&placement.layoutGeneration===generation&&placement.lifecycle==='active'&&!placement.excludedByUser);
  let seen=false;for(let earlier=0;earlier<at;earlier++)if(facts.placements[earlier].entryId===placement.entryId){seen=true;break;}if(seen)continue;
  const expected=facts.entries[entryAt++];need(expected&&expected.id===placement.entryId&&entryAt<=ORGANIZE_PROCESSING_SCOPE_LIMITS.entries);
  const raw=await get('thoughts',placement.entryId);need(raw&&own(raw,'id')===placement.entryId&&own(raw,'storageSchema')===2&&own(raw,'lifecycle')==='active');const entry=match(raw,keys.entry,expected);
  // Complete reference arrays were just compared. The original initial
  // closure is immutable, so no second selected-ID index is constructed.
  if(!emptyDependencies){
   const dependencies=await all('dependencies','byTarget',prefix(['entry',entry.id]),ORGANIZE_PROCESSING_SCOPE_LIMITS.inputs);let end=dependencyAt;
   while(end<facts.dependencies.length&&facts.dependencies[end].targetId===entry.id)end++;
   need(dependencies.length===end-dependencyAt);
   for(let i=0;i<dependencies.length;i++){const dep=facts.dependencies[dependencyAt++];match(pageRow(dependencies,i),keys.dependency,dep);need(dep.targetKind==='entry'&&dep.targetId===entry.id);}
  }
  if(!emptyProvenance){
   const provenance=await all('provenance','byOwner',prefix(['entry',entry.id]),ORGANIZE_PROCESSING_SCOPE_LIMITS.inputs);let end=provenanceAt;
   while(end<facts.provenance.length&&facts.provenance[end].ownerId===entry.id)end++;
   need(provenance.length===end-provenanceAt);
   for(let i=0;i<provenance.length;i++){const p=facts.provenance[provenanceAt++];match(pageRow(provenance,i),keys.provenance,p);need(p.ownerKind==='entry'&&p.ownerId===entry.id);}
  }
 }
 need(entryAt===facts.entries.length&&dependencyAt===facts.dependencies.length&&provenanceAt===facts.provenance.length&&facts.inputs.length<=ORGANIZE_PROCESSING_SCOPE_LIMITS.inputs&&facts.sources.length<=ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);
 for(const expected of facts.inputs){
  const id=expected.input.id,block=await get('blocks',id),raw=block&&own(block,'value'),state=await get('inputStates',id);need(raw&&own(raw,'id')===id&&state&&own(state,'removalState')==='active'&&!optional(state,'sourcePurged')&&!optional(raw,'excluded')&&!optional(raw,'branchStatus'));
  match(raw,keys.input,expected.input);match(state,keys.state,expected.state);const refs=optional(raw,'provenance')||[];need(array(refs,ORGANIZE_PROCESSING_SCOPE_LIMITS.sources)&&refs.length===expected.provenance.length);
  for(let i=0;i<refs.length;i++)match(own(refs,String(i)),provenanceReferenceFields,expected.provenance[i]);
 }
 for(const expected of facts.sources){const raw=await get('recordIndex',expected.id);need(raw&&own(raw,'id')===expected.id);match(raw,keys.source,expected);need(!await get('tombstones','source:'+expected.sourceKey)&&!await get('tombstones','snapshot:'+expected.dedupeKey));}
 need(facts.organizationSources.length<=ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);let sourceUnion=facts.sources.length;for(const item of facts.organizationSources){let shared=false;for(const source of facts.sources)if(source.id===item.id){shared=true;break;}if(!shared)sourceUnion++;}need(sourceUnion<=ORGANIZE_PROCESSING_SCOPE_LIMITS.sources);
 for(const expected of facts.organizationSources){
  const id=expected.id,rawIndex=await get('recordIndex',id);need(!!rawIndex===!!expected.index);let present=false,sourceTombstone=false,snapshotTombstone=false;
  if(rawIndex){need(own(rawIndex,'id')===id);match(rawIndex,keys.source,expected.index);const record=await get('records',id);present=!!record;if(present)need(own(record,'id')===id);
   const sourceKey='source:'+expected.index.sourceKey,snapshotKey='snapshot:'+expected.index.dedupeKey,sourceRow=await get('tombstones',sourceKey),snapshotRow=await get('tombstones',snapshotKey);
   sourceTombstone=!!sourceRow;snapshotTombstone=!!snapshotRow;if(sourceRow)need(own(sourceRow,'id')===sourceKey);if(snapshotRow)need(own(snapshotRow,'id')===snapshotKey);
  }
  // The original charged retain precedes its separate wrapper carrying index.
  const retained=nextValue();need(retained.id===id&&retained.present===present&&retained.sourceTombstone===sourceTombstone&&retained.snapshotTombstone===snapshotTombstone&&expected.present===present&&expected.sourceTombstone===sourceTombstone&&expected.snapshotTombstone===snapshotTombstone);resource(retained,organizationSourceFields);
 }
 const restrictions=await all('meta',null,IDBKeyRange.bound('memory:','memory:\uffff'),ORGANIZE_PROCESSING_SCOPE_LIMITS.rows);let restrictionAt=0,topicAt=1;
 need(facts.restrictionTopics[0]===topic);
 for(let i=0;i<restrictions.length;i++){
  const raw=pageRow(restrictions,i),kind=own(raw,'kind');if(kind==='profile'||kind==='activity')continue;
  need(Object.hasOwn(restrictionFields,kind));const fields=restrictionFields[kind];need(Reflect.ownKeys(raw).every(key=>typeof key==='string'&&fields.includes(key)));
  const expected=facts.restrictions[restrictionAt++];need(expected);const rule=match(raw,fields,expected);
  if(kind==='topic'&&['denied','never'].includes(rule.decision)||kind==='section'){
   let id=rule.topicId,hops=0;
   for(;;){need(idOK(id)&&hops++<32);let found=null;for(let j=0;j<topicAt;j++)if(facts.restrictionTopics[j].id===id){found=facts.restrictionTopics[j];break;}
    if(!found){const expectedTopic=facts.restrictionTopics[topicAt++];need(expectedTopic&&expectedTopic.id===id);found=match(await get('topics',id),keys.topic,expectedTopic);}
    if(!found.redirectTo)break;id=found.redirectTo;
   }
  }
 }
 need(restrictionAt===facts.restrictions.length&&topicAt===facts.restrictionTopics.length);match(gate,gateFields,facts.gate);
 need(rows===stamp.receipts.length&&rows===stamp.rows&&usedBytes===stamp.usedBytes&&usedKeys===stamp.usedKeys);
 current();
 const observation=Object.freeze({version:1,retains:rows,keys:usedKeys,bytes:usedBytes,emptyDependencies,emptyProvenance});debit(0,encodedBytes(observation)+2);current();
 const handle=Object.freeze({});held.set(handle,{store,repository,database,t,identity,facts,released:false,commit:false,source,action,paidReuse:stamp,observation});
 try{readOriginalOrganizeAction(source,action,store,t,handle);return handle;}catch(error){releaseOriginalOrganizeScope(handle);throw error;}
}
