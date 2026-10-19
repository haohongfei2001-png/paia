import {assertAIFilterHistoricalReaderCurrent,assertAIFilterHistoricalReaderFacts} from '../core/ai-usage/filter-visibility-read-session.js';
import {readOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {readOriginalControlSettings,assertOriginalControlSettingsFacts} from '../core/indexed-store.js';
import {requireRepositoryTransactionScope} from '../core/idb-repository.js';
import {requireAIFilterHistoricalReadRequest,projectAIFilterHistoricalRead} from '../core/ai-usage/filter-visibility-qualified-reader.js';
import {readOriginalOrganizeAction,chargeOriginalOrganizeWork} from './organize-action-source.js';
import {validateMemoryRow} from '../core/memory/model.js';
import {canonical,fail} from '../core/ai-usage/contracts.js';
import {snapshot,freeze} from '../core/ai-usage/qwen-request-data.js';
import {AI_FIELDS} from '../core/organizer/ai-contract.js';
import {readPermittedOrganizePresentation} from '../core/organizer/organize-presentation-fields.js';
import {requireRepositoryTransactionDataMethods} from '../core/idb-repository.js';

const originalReaders=new WeakMap(),filterAdmissions=new WeakMap(),nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,nativeWall=Date.now,nativeMono=performance.now.bind(performance);
const grants=new WeakMap(),need=x=>{if(!x)fail('UNAVAILABLE');};
const own=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row??{},key);need(d&&Object.hasOwn(d,'value'));return d.value;};
const optional=(row,key)=>Object.hasOwn(row??{},key)?own(row,key):undefined;
function permit(metadata){
 need(metadata.purpose==='organize-selection-provenance'&&metadata.entries.length>0&&metadata.entries.length<=100&&metadata.restrictions.every(validateMemoryRow)&&!metadata.presentation?.pendingCandidate);
 const topic=metadata.topic.id,entries=new Set(metadata.entries.map(x=>x.id)),inputs=new Set(metadata.inputs.map(x=>x.input.id)),sections=new Set(metadata.placements.map(x=>x.sectionId)),topics=new Map(metadata.restrictionTopics.map(x=>[x.id,x]));
 for(const row of metadata.restrictions){
  need(!(row.kind==='config'&&row.localOnly===true));
  need(!(row.kind==='entry'&&entries.has(row.entryId)||row.kind==='input'&&inputs.has(row.inputId)||row.kind==='section'&&row.topicId===topic&&sections.has(row.sectionId)));
  if(row.kind==='topic'&&['denied','never'].includes(row.decision)||row.kind==='section'){
   let id=row.topicId;const seen=new Set();for(;;){need(!seen.has(id)&&seen.size<32);seen.add(id);const t=topics.get(id);need(t);if(!t.redirectTo){need(t.lifecycle!=='merged');break;}need(['active','merged'].includes(t.lifecycle));id=t.redirectTo;}
   need(!(row.kind==='topic'&&(row.topicId===topic||id===topic)||row.kind==='section'&&row.topicId!==topic&&id===topic));
  }
 }
 need(metadata.sources.every(x=>!x.hidden&&!x.deletedAt));
}

// A separate purpose decision after the actual original UPDATE intent. The
// metadata ticket by itself, external-read switches and entitlement grant no
// permission. This local qualification covers the selected current Entry/Input
// and original Source fields; it is not the child payload/dispatch authority.
export function captureOrganizeProcessingGrant(source,action,store,t,selectionProof){
 const intent=readOriginalOrganizeAction(source,action,store,t,selectionProof);permit(intent.metadata);
 const metadata=intent.metadata,scope=freeze({version:1,purpose:'organize-local-qualification',presentations:metadata.presentation?[{id:metadata.presentation.fields.id,revision:metadata.presentation.fields.revision,selectedFields:[...AI_FIELDS,'projection','manifest','cacheBinding','basedOnCheckpoint']}]:[],topic:{id:metadata.topic.id,revision:metadata.topic.revision,selectedFields:['name']},sections:metadata.sections.map(x=>({id:x.id,revision:x.revision,selectedFields:['name','title']})),entries:metadata.entries.map(x=>({id:x.id,revision:x.revision,selectedFields:['body','title','note','type','formation']})),inputs:metadata.inputs.map(x=>({id:x.input.id,revision:x.state.contentRevision,selectedFields:['body','note']})),sources:metadata.sources.map(x=>({id:x.id,selectedFields:['originalText']})),restoreEpoch:metadata.restoreEpoch,scopeBinding:intent.scopeBinding,userActionId:intent.userActionId});
 const grant=Object.freeze({});grants.set(grant,{source,action,store,t,selectionProof,intent,scope,released:false});return grant;
}
function current(grant,store,t){const r=grants.get(grant);need(r&&!r.released&&r.store===store&&r.t===t);const next=readOriginalOrganizeAction(r.source,r.action,store,t,r.selectionProof);need(next.scopeBinding===r.intent.scopeBinding&&next.signal===r.intent.signal&&next.expiresAt===r.intent.expiresAt);return r;}
export function readOrganizeProcessingGrant(grant,store,t){const r=current(grant,store,t);return Object.freeze({scope:r.scope,expiresAt:r.intent.expiresAt,signal:r.intent.signal});}
export function releaseOrganizeProcessingGrant(grant){const r=grants.get(grant);if(r){r.released=true;r.intent=null;grants.delete(grant);}}

// No broad row clone: current metadata is projected from the private original
// selection, and only independently permitted text descriptors are evaluated.
// Accepted prior presentation fields are qualified by the same separate purpose
// policy. Pending proposals and unknown nested fields are never traversed.
export function organizeProcessingReader(grant,store,t){
 const r=current(grant,store,t),m=r.intent.metadata,entries=new Map(m.entries.map(x=>[x.id,x])),inputs=new Map(m.inputs.map(x=>[x.input.id,x])),sources=new Map(m.sources.map(x=>[x.id,x])),sections=new Map(m.sections.map(x=>[x.id,x]));
 const check=()=>current(grant,store,t),charge=text=>{check();need(typeof text==='string');chargeOriginalOrganizeWork(r.source,r.action,store,t,r.selectionProof,{bytes:new TextEncoder().encode(text).length});check();return text;};
 const material=(row,base,fields,nullable=[])=>{need(row);const out={...base};for(const field of fields)if(Object.hasOwn(row,field)){const d=Object.getOwnPropertyDescriptor(row,field);Object.defineProperty(out,field,{enumerable:true,configurable:true,get(){check();need(d&&Object.hasOwn(d,'value'));if(d.value===null&&nullable.includes(field))return null;return charge(d.value);}});}return out;};
 const sameMetadata=(row,expected)=>{
  if(expected===null||typeof expected!=='object'){need(Object.is(row,expected));return;}
  need(row&&typeof row==='object'&&Array.isArray(row)===Array.isArray(expected));if(Array.isArray(expected))need(Reflect.ownKeys(row).length===expected.length+1&&own(row,'length')===expected.length);
  for(const [key,value]of Object.entries(expected))sameMetadata(own(row,key),value);
 };
 const wrap=(table,row)=>{
  check();if(!row)return row;const id=own(row,'id');
  if(table==='thoughts'){const e=entries.get(id);sameMetadata(row,e);const fields=material(row,e,['thoughtText','title','note']);for(const key of ['type','formation','userEdited'])if(Object.hasOwn(row,key)){const v=own(row,key);need(key==='userEdited'?typeof v==='boolean':typeof v==='string'&&v.length<=32);fields[key]=v;}return fields;}
  if(table==='blocks'){const e=inputs.get(id);need(e);const value=own(row,'value');sameMetadata(value,e.input);return {id,value:material(value,{...e.input,provenance:e.provenance},['libraryText','note'],['libraryText','note'])};}
  if(table==='records'){need(sources.has(id));const value=own(row,'value'),base={};for(const key of ['sourceSentAt','capturedAt'])if(Object.hasOwn(value,key))base[key]=own(value,key);return {id,value:material(value,base,['originalText'])};}
  if(table==='topics'){need(id===m.topic.id);sameMetadata(row,m.topic);return material(row,m.topic,['name']);}
  if(table==='sections'){const e=sections.get(id);sameMetadata(row,e);return material(row,e,['name','title']);}
  if(table==='filterInputs'){
   need(inputs.has(id)&&!Object.hasOwn(row,'aiDecision'));
   // Preserve the original deterministic Filter owner. A positive AI decision
   // needs that owner's independently qualified cold-read protocol; this slice
   // defers instead of treating an unavailable AI proof as an unfiltered Input.
   const out={};for(const key of ['id','documentId','authorship','userEdited','filterOverride','evaluationRevision','pendingKey','decision','reasonCode','filterVersion','policyVersion','classifierVersion','basedOnContentRevision','decisionSequence','presenceInvalid','failed','aiOperationId'])if(Object.hasOwn(row,key)){const value=own(row,key);need(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value));out[key]=value;}
   if(Object.hasOwn(row,'presence')){const value=own(row,'presence');if(value===null)out.presence=null;else{out.presence={};for(const key of ['version','attachment','reference','confidence'])if(Object.hasOwn(value,key)){const v=own(value,key);need(['string','number'].includes(typeof v));out.presence[key]=v;}}}
   return out;
  }
  if(table==='filterIntents'){need(m.sources.some(x=>id===(x.sourceKey||'legacy:'+x.id)));return {id};}
  if(table==='inputStates'){const e=inputs.get(id);need(e);sameMetadata(row,e.state);return {...e.state};}
  if(table==='recordIndex'){const e=sources.get(id);sameMetadata(row,e);return {...e};}
  if(table==='dependencies'||table==='provenance'||table==='placements'){const e=m[table].find(x=>x.id===id);sameMetadata(row,e);return {...e};}
  if(table==='meta'){
   if(id==='aiPresentation:'+m.topic.id){need(m.presentation&&!Object.hasOwn(row,'candidate'));sameMetadata(row,m.presentation.fields);return readPermittedOrganizePresentation(row,{topicId:m.topic.id,entryIds:[...entries.keys()],check,charge});}
   const controls={gate:['id','enabled','epoch','consentVersion'],'recovery-restore-epoch':['id','value'],'backup-recovery-settings':['id'],'thought-library':['id','schemaVersion','migrationVersion','fromVersion','targetVersion','phase','cursor','mapped','quarantined','sealed','startedAt','libraryActivation','verified','completedAt'],'smart-filter':['id','mode','phase','filterVersion','policyVersion','classifierVersion','decisionSequence','policyEpoch'],'memory:config':['id','kind','version','revision','defaultPolicy','budget','retentionDays','onboarded','userTouched','externalAccess','localOnly','includeUnorganizedInputs'],aiOrganizerCheckpoint:['id','view','version','lastSequence','updatedAt','state']};need(Object.hasOwn(controls,id));
   const scalar=value=>{need(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value));return value;},pick=(value,fields)=>Object.fromEntries(fields.filter(k=>Object.hasOwn(value,k)).map(k=>[k,scalar(own(value,k))]));
   const projected=pick(row,controls[id]);
   if(id==='aiOrganizerCheckpoint'){
    projected.inputVersions={};projected.topicVersions={};
    if(Object.hasOwn(row,'inputVersions')){const versions=own(row,'inputVersions');need(versions&&typeof versions==='object'&&!Array.isArray(versions));for(const inputId of inputs.keys())if(Object.hasOwn(versions,inputId))projected.inputVersions[inputId]=pick(own(versions,inputId),['contentRevision','removalState','sourcePurged','eligible']);}
    if(Object.hasOwn(row,'topicVersions')){const versions=own(row,'topicVersions');need(versions&&typeof versions==='object'&&!Array.isArray(versions));if(Object.hasOwn(versions,m.topic.id)){const selected=own(versions,m.topic.id);need(selected&&typeof selected==='object'&&!Array.isArray(selected));const ids=Reflect.ownKeys(selected);need(ids.length<=4096&&ids.every(k=>typeof k==='string'&&k.length<=200));projected.topicVersions[m.topic.id]=pick(selected,ids);}}
   }
   const value=snapshot(projected,{maxBytes:262144,maxKeys:16384,maxString:8192});chargeOriginalOrganizeWork(r.source,r.action,store,t,r.selectionProof,{bytes:new TextEncoder().encode(JSON.stringify(value)).length});return value;
  }
  if(table==='tombstones'){need(m.sources.some(x=>id==='source:'+x.sourceKey||id==='snapshot:'+x.dedupeKey));return {id};}
  if(table==='operationReceipts'){need(own(row,'namespace')==='thought-library'&&entries.has(own(row,'ownerId')));const result=own(row,'result'),expression=optional(result,'independentExpression');return {id,namespace:'thought-library',ownerId:own(row,'ownerId'),result:{id:optional(result,'id'),independentExpression:expression&&snapshot(expression,{maxBytes:1024,maxKeys:8,maxString:100})}};}
  fail('UNAVAILABLE');
 };
 const read=async(method,args)=>{
  check();chargeOriginalOrganizeWork(r.source,r.action,store,t,r.selectionProof,{reads:1});let row;
  if(method==='all'||method==='edge'){
   const [table,index,key,requested]=args,limit=method==='edge'?1:requested===undefined?4097:requested;
   need(Number.isSafeInteger(limit)&&limit>0&&limit<=4097);const direction=method==='edge'?(requested??'next'):'next';need(direction==='next'||direction==='prev');
   requireRepositoryTransactionDataMethods(store.repository,t);const page=await t.rangePage(table,index,key,null,method==='all'?limit+1:limit,direction);check();need(page&&Array.isArray(page.rows)&&page.rows.length<=4096);
   if(method==='all')need(page.next===null&&page.rows.length<=limit);
   row=method==='edge'?page.rows[0]?.value:page.rows.map(x=>x.value);
  }else{requireRepositoryTransactionDataMethods(store.repository,t);row=await t[method](...args);}
  check();return row;
 };
 const reader=Object.freeze({
  async get(...args){return wrap(args[0],await read('get',args));},
  async edge(...args){return wrap(args[0],await read('edge',args));},
  async all(...args){const rows=await read('all',args);need(Array.isArray(rows)&&rows.length<=4096);return rows.map(x=>wrap(args[0],x));},
  async count(...args){return read('count',args);}
 });
 originalReaders.set(reader,{grant,store,t,r,inputs:new Set(inputs.keys()),admissions:new Map()});return reader;
}


// A separate, transaction-bound admission for the original Filter owner. The
// Organize reader still refuses full aiDecision rows and neighbor text.
const filterOwn=(value,key)=>{const d=Object.getOwnPropertyDescriptor(value??{},key);need(d&&Object.hasOwn(d,'value'));return d.value;};
function filterAdmissionFacts(a,store,reader=null,inputId=null){
 need(a&&a.active&&a.store===store&&(reader===null||reader===a.reader)&&(inputId===null||inputId===a.inputId));
 try{
  need(originalReaders.get(a.reader)===a.original&&grants.get(a.original.grant)===a.record&&!a.record.released&&a.record.intent===a.intent&&a.record.scope===a.scope);
  need(filterOwn(store,'repository')===a.repository&&filterOwn(a.repository,'db')===a.database&&!nativeAborted.call(a.signal)&&nativeWall()<a.deadlineWall&&nativeMono()<a.deadlineMono);
  need(requireRepositoryTransactionScope(a.repository,a.original.t)===a.transaction);requireRepositoryTransactionDataMethods(a.repository,a.original.t);
  need(readOriginalOrganizeScope(a.record.selectionProof,store,a.original.t)===a.metadata);assertOriginalControlSettingsFacts(store,a.settings);
  return true;
 }catch(error){a.active=false;throw error;}
}
function filterAdmissionCurrent(a,store){
 filterAdmissionFacts(a,store);const r=current(a.original.grant,store,a.original.t);need(r===a.record);filterAdmissionFacts(a,store);return a.view;
}
export function captureOriginalOrganizeFilterAdmission(reader,store,inputId){
 const o=originalReaders.get(reader);if(!o)return undefined;
 return (async()=>{
 need(o.store===store&&o.inputs.has(inputId));current(o.grant,store,o.t);
 const prior=o.admissions.get(inputId);if(prior){filterAdmissionCurrent(filterAdmissions.get(prior),store);return prior;}
 const repository=filterOwn(store,'repository'),database=filterOwn(repository,'db'),transaction=requireRepositoryTransactionScope(repository,o.t),r=o.r,intent=r.intent,scope=r.scope,metadata=readOriginalOrganizeScope(r.selectionProof,store,o.t),settings=readOriginalControlSettings(store,o.t);
 need(transaction.mode==='readonly');
 chargeOriginalOrganizeWork(r.source,r.action,store,o.t,r.selectionProof,{reads:1});requireRepositoryTransactionDataMethods(repository,o.t);
 const row=await o.t.get('filterInputs',inputId);current(o.grant,store,o.t);need(filterOwn(store,'repository')===repository&&filterOwn(repository,'db')===database);assertOriginalControlSettingsFacts(store,settings);
 need(row&&filterOwn(row,'id')===inputId);
 if(!Object.hasOwn(row,'aiDecision')||filterOwn(row,'aiDecision')===null)return null;
 const decision=filterOwn(row,'aiDecision'),version=filterOwn(decision,'version'),operationId=filterOwn(row,'aiOperationId');need(version===1&&typeof operationId==='string'&&operationId.length>0&&operationId.length<=200);
 const remaining=intent.expiresAt-Date.now();need(Number.isFinite(remaining)&&remaining>0&&remaining<=30000);
 const view=Object.freeze({inputId,operationId,decisionVersion:version,settings});
 chargeOriginalOrganizeWork(r.source,r.action,store,o.t,r.selectionProof,{bytes:new TextEncoder().encode(JSON.stringify({inputId,operationId,decisionVersion:version,settings:settings.settings})).length});
 const token=Object.freeze({}),a={active:true,store,reader,inputId,original:o,record:r,intent,scope,metadata,settings,view,repository,database,transaction,signal:intent.signal,deadlineWall:Math.min(intent.expiresAt,nativeWall()+remaining),deadlineMono:nativeMono()+remaining,qualified:new WeakMap()};
 filterAdmissions.set(token,a);filterAdmissionCurrent(a,store);o.admissions.set(inputId,token);return token;
 })();
}
export function readOriginalOrganizeFilterAdmission(admission,store){return filterAdmissionCurrent(filterAdmissions.get(admission),store);}
export function assertOriginalOrganizeFilterAdmissionFacts(admission,store,reader=null,inputId=null){return filterAdmissionFacts(filterAdmissions.get(admission),store,reader,inputId);}
export function originalOrganizeFilterQualifiedReader(admission,store,reader,cap){
 const a=filterAdmissions.get(admission);filterAdmissionFacts(a,store,reader);const prior=a.qualified.get(cap);if(prior)return prior;
 const check=()=>filterAdmissionCurrent(a,store),charge=cost=>chargeOriginalOrganizeWork(a.record.source,a.record.action,store,a.original.t,a.record.selectionProof,cost);
 const read=async(method,args)=>{
  check();const permitted=requireAIFilterHistoricalReadRequest(cap,store,admission,method,args);args=permitted.args;charge({reads:1});check();requireRepositoryTransactionDataMethods(a.repository,a.original.t);
  assertAIFilterHistoricalReaderCurrent(cap,store,admission);filterAdmissionFacts(a,store,reader);assertAIFilterHistoricalReaderFacts(cap,store,admission);
  // Only the fixed C permit above can reach these two original methods. No
  // raw transaction, arbitrary callback, range scan or neighbor row escapes.
  const value=await a.original.t[method](...args);check();const result=projectAIFilterHistoricalRead(cap,store,admission,method,args,value);charge({bytes:result.bytes});check();
  // Parent work/clock callbacks finish before the independent Filter lease
  // performs its last configured-clock sample and both private facts tails.
  assertAIFilterHistoricalReaderCurrent(cap,store,admission);filterAdmissionFacts(a,store,reader);assertAIFilterHistoricalReaderFacts(cap,store,admission);
  return result.value;
 };
 const qualified=Object.freeze({get:(...args)=>read('get',args),count:(...args)=>read('count',args)});a.qualified.set(cap,qualified);return qualified;
}
