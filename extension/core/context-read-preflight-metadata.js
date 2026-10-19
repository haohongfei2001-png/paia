// Positive metadata views for the original deep-read admission only. These
// functions neither grant fields nor certify semantic/lineage eligibility.
import {CONTEXT_CARDS_ROW,emptyContextCards} from './context-cards.js';
import {CONTEXT_TOPIC_ACCESS_ROW,CONTEXT_TOPIC_BINDING_KEYS,validContextTopicPreferences} from './context-topic-preferences.js';
import {validateMemoryRow,key,isBudget} from './memory/model.js';
import {idOK,revisionOK,ENTRY_FIELDS} from './thought-model.js';
import {validOrganizationIntents} from './topic-identity-backup.js';
const limit=4096,need=(v,r='invalid_facts')=>{if(!v)throw Object.assign(Error('Context metadata unavailable'),{scopeReason:r});};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const own=(v,k)=>{const d=Object.getOwnPropertyDescriptor(v??{},k);need(!d||Object.hasOwn(d,'value'));return d?.value;};
const scalar=v=>{need(v===null||['undefined','string','number','boolean'].includes(typeof v));need(typeof v!=='number'||Number.isFinite(v));need(typeof v!=='string'||v.length<=65536);return v;};
const pick=(v,keys)=>{need(plain(v));return Object.fromEntries(keys.filter(k=>Object.hasOwn(v,k)).map(k=>[k,scalar(own(v,k))]));};
const closed=(v,keys)=>{need(plain(v)&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&keys.includes(k)));return v;};
const list=(v,project=scalar)=>{need(Array.isArray(v));const n=own(v,'length');need(Number.isSafeInteger(n)&&n>=0&&n<=limit&&Reflect.ownKeys(v).length===n+1);return Array.from({length:n},(_,i)=>{need(Object.hasOwn(v,String(i)));return project(own(v,String(i)));});};
const fieldMap=(v,keys,project)=>{need(plain(v));return Object.fromEntries(keys.filter(k=>Object.hasOwn(v,k)).map(k=>[k,project(own(v,k))]));};
const marker=v=>pick(closed(v,['locked','reason','operationId','at']),['locked','reason','operationId','at']);
function identity(v){
 const keys=['version','revision','origin','scope','aliases','legacy','noRecreation','nameToken','lifecycleIntent'];closed(v,keys);
 const out=pick(v,keys.filter(k=>!['aliases','lifecycleIntent'].includes(k)));out.aliases=list(own(v,'aliases'),a=>pick(closed(a,['token','actor','revision','operationId','at']),['token','actor','revision','operationId','at']));
 if(Object.hasOwn(v,'lifecycleIntent'))out.lifecycleIntent=pick(closed(own(v,'lifecycleIntent'),['actor','operationId','at','previous','to']),['actor','operationId','at','previous','to']);return out;
}
function organization(v){
 if(v===undefined)return v;need(plain(v));if(own(v,'version')===undefined)return {};
 const keys=['version','included','excluded','edges','fixed','legacyProtected'];closed(v,keys);const out=pick(v,['version','legacyProtected']);out.included=list(own(v,'included'));out.excluded=list(own(v,'excluded'));
 const edges=own(v,'edges');need(plain(edges)&&Reflect.ownKeys(edges).length<=limit);out.edges=Object.fromEntries(Reflect.ownKeys(edges).map(k=>{need(typeof k==='string'&&idOK(k));return [k,pick(closed(own(edges,k),['actor','include','operationId','at','reason','revision']),['actor','include','operationId','at','reason','revision'])];}));
 const fixed=own(v,'fixed');out.fixed=fixed===null?null:{...pick(closed(fixed,['topicIds','actor','operationId','revision','at']),['actor','operationId','revision','at']),topicIds:list(own(fixed,'topicIds'))};return out;
}
function entry(v){
 const out=pick(v,['id','storageSchema','revision','contentRevision','lifecycle','freshness','hasHumanAction','origin','bodyBinding','workingInputId','bindingRevision','bindingLength']);
 out.staleReasons=list(own(v,'staleReasons'));out.sourceRecordIds=list(own(v,'sourceRecordIds'));out.inputRefs=list(own(v,'inputRefs'),r=>pick(r,['inputBlockId','basedOnContentRevision']));
 out.protections=fieldMap(own(v,'protections'),ENTRY_FIELDS,marker);out.fieldRevisions=pick(own(v,'fieldRevisions'),ENTRY_FIELDS);out.organizationIntents=organization(own(v,'organizationIntents'));return out;
}
export function validContextReadEntryMetadata(row){
 need(idOK(row.id)&&row.storageSchema===2&&revisionOK(row.revision)&&revisionOK(row.contentRevision)&&['active','removed','invalidated','quarantined'].includes(row.lifecycle)&&['current','stale'].includes(row.freshness)&&Array.isArray(row.staleReasons)&&typeof row.hasHumanAction==='boolean'&&['user','ai','migration'].includes(row.origin)&&plain(row.protections)&&validOrganizationIntents(row.organizationIntents),'entry_unavailable');
 need(ENTRY_FIELDS.every(f=>plain(row.protections[f])&&typeof row.protections[f].locked==='boolean'&&revisionOK(row.fieldRevisions[f])),'entry_unavailable');
 need(row.sourceRecordIds.every(idOK)&&new Set(row.sourceRecordIds).size===row.sourceRecordIds.length&&row.inputRefs.every(r=>idOK(r.inputBlockId)&&revisionOK(r.basedOnContentRevision))&&['input','thought'].includes(row.bodyBinding),'entry_unavailable');
 if(row.bodyBinding==='input')need(idOK(row.workingInputId)&&revisionOK(row.bindingRevision)&&revisionOK(row.bindingLength),'entry_unavailable');return true;
}
export function readContextCardsMetadata(row){
 if(!row)row=emptyContextCards();closed(row,['id','version','sequence','access','items']);const out=pick(row,['id','version','sequence']);need(out.id===CONTEXT_CARDS_ROW&&out.version===1&&revisionOK(out.sequence),'context_unavailable');
 const access=closed(own(row,'access'),['global','info','rules','now','inputs']);out.access=Object.fromEntries(['global','info','rules','now','inputs'].map(k=>{const value=pick(closed(own(access,k),['enabled','revision']),['enabled','revision']);need(typeof value.enabled==='boolean'&&revisionOK(value.revision),'context_unavailable');return [k,value];}));return out;
}
export function readContextChoicesMetadata(row){
 need(row,'topic_off');closed(row,['id','version','revision','choices']);const out=pick(row,['id','version','revision']);out.choices=list(own(row,'choices'),c=>({...pick(closed(c,['topicId','enabled','revision','binding']),['topicId','enabled','revision']),binding:pick(closed(own(c,'binding'),CONTEXT_TOPIC_BINDING_KEYS),CONTEXT_TOPIC_BINDING_KEYS)}));need(out.id===CONTEXT_TOPIC_ACCESS_ROW&&validContextTopicPreferences(out),'invalid_facts');return out;
}
const memoryFields={config:['id','kind','version','revision','defaultPolicy','budget','retentionDays','onboarded','userTouched','externalAccess','localOnly','includeUnorganizedInputs'],topic:['id','kind','version','profileId','topicId','decision','layoutGeneration'],entry:['id','kind','version','entryId','excluded'],input:['id','kind','version','inputId','excluded'],section:['id','kind','version','topicId','sectionId','excluded']};
export function readContextLegacyMetadata(row,{keep=false}={}){
 const kind=own(row,'kind');if(memoryFields[kind]){const out=pick(closed(row,memoryFields[kind]),memoryFields[kind]);need(validateMemoryRow(out),'legacy_unavailable');return out;}
 if(kind==='profile'){const keys=['id','kind','version','profileId','name','budget','instruction','revision'];closed(row,keys);const out=pick(row,keys.filter(k=>!['name','instruction'].includes(k)));need(out.version===1&&idOK(out.profileId)&&out.id===key('profile',out.profileId)&&isBudget(out.budget)&&revisionOK(out.revision),'legacy_unavailable');return keep?out:null;}
 if(kind==='activity'){const keys=['id','kind','version','createdAt','profileId','queryDigest','topicIds','entryIds','inputIds','action'];closed(row,keys);const out=pick(row,keys.filter(k=>!['topicIds','entryIds','inputIds'].includes(k)));for(const k of ['topicIds','entryIds','inputIds'])if(Object.hasOwn(row,k))out[k]=list(own(row,k));need(validateMemoryRow(out),'legacy_unavailable');return keep?out:null;}
 need(false,'legacy_unavailable');
}
export function contextReadMetadataRow(table,row){
 if(!row)return row;
 if(table==='meta'){const id=own(row,'id');if(id===CONTEXT_CARDS_ROW)return readContextCardsMetadata(row);if(id===CONTEXT_TOPIC_ACCESS_ROW)return readContextChoicesMetadata(row);if(typeof id==='string'&&id.startsWith('memory:'))return readContextLegacyMetadata(row,{keep:true});
  if(['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','backup-data-generation','recovery-restore-epoch'].includes(id))return pick(row,['id','value']);
  if(id==='gate')return pick(row,['id','epoch','enabled']);if(id==='thought-library')return pick(row,['id','phase','verified','sealed']);if(id==='thought-binding:v1')return pick(row,['id','version','complete']);
  if(id==='smart-filter')return pick(row,['id','phase','mode','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion']);
  if(typeof id==='string'&&id.startsWith('personalTopicName:'))return {...pick(closed(row,['id','version','topicIds']),['id','version']),topicIds:list(own(row,'topicIds'))};
 }
 if(table==='operationReceipts'){const out=pick(row,['id','namespace','schemaVersion','ownerId','operationSequence','createdAt','digest']);out.result=pick(closed(own(row,'result'),['id','jobId','revision','removed','restored']),['id','jobId','revision','removed','restored']);return out;}
 if(table==='inputStates')return {...pick(row,['id','removalState','sourcePurged','contentRevision']),sourceRecordIds:list(own(row,'sourceRecordIds'))};
 if(table==='blockIndex')return pick(row,['id','excluded']);if(table==='recordIndex')return pick(row,['id','sourceKey','dedupeKey','deletedAt','hidden']);
 if(table==='tombstones')return pick(row,['id']);
 if(table==='thoughts')return entry(row);
 if(table==='topics'){const out=pick(row,['id','createdAt','revision','organizationRevision','activeLayoutGeneration','lifecycle','redirectTo','layoutJobId','removalOperationId','defaultSectionId']);out.identity=identity(own(row,'identity'));out.protections=fieldMap(own(row,'protections'),['organization'],marker);return out;}
 if(table==='placements')return pick(row,['id','topicId','entryId','sectionId','layoutGeneration','revision','rank','sectionRank','lifecycle','excludedByUser']);
 if(table==='sections')return pick(row,['id','topicId','sectionId','layoutGeneration','revision','rank','lifecycle','redirectTo']);
 if(table==='dependencies'){const out=pick(row,['id','inputId','targetKind','targetId','basedOnContentRevision','eligibilityEpochAtUse','status']);for(const k of ['roles','selectedFields','sourceRecordIds'])out[k]=list(own(row,k));if(Object.hasOwn(row,'fieldDigests'))out.fieldDigests=pick(own(row,'fieldDigests'),['body','note']);return out;}
 if(table==='provenance')return {...pick(row,['id','ownerKind','ownerId','inputId']),sourceRecordIds:list(own(row,'sourceRecordIds'))};
 return row;
}
