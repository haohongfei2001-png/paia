import {readOriginalOrganizeCandidateWriteIntent,sameOriginalOrganizeCandidateWrite} from '../core/organizer/ai-presentation.js';
import {readOriginalOrganizeScope,hasOriginalOrganizeEmptyRelationship,requireOriginalOrganizeActionScope,requireOriginalOrganizeCommitScope,registerOriginalOrganizeCommitSelectionFence,registerOriginalOrganizeCommitSelectionWrite} from '../core/organizer/organize-processing-scope.js';
import {readOriginalControlSettings,assertOriginalControlSettingsFacts,readOriginalOrganizeControls,assertOriginalOrganizeControlsFacts} from '../core/indexed-store.js';
import {requireRepositoryTransactionScope,registerRepositoryFinalReadFence} from '../core/idb-repository.js';
import {prefix} from '../core/thought-model.js';
import {readOriginalOrganizeAction,chargeOriginalOrganizeWork,assertOriginalOrganizeActionFacts,assertOriginalOrganizeActionCurrent,chargeOriginalOrganizeActionWork} from './organize-action-source.js';
import {validateMemoryRow} from '../core/memory/model.js';
import {canonical,fail} from '../core/ai-usage/contracts.js';
import {snapshot,freeze} from '../core/ai-usage/qwen-request-data.js';
import {AI_FIELDS} from '../core/organizer/ai-contract.js';
import {readPermittedOrganizePresentation} from '../core/organizer/organize-presentation-fields.js';
import {requireRepositoryTransactionDataMethods} from '../core/idb-repository.js';

const originalMaterialAccessors=new WeakMap();
const nativeAddListener=EventTarget.prototype.addEventListener,nativeRemoveListener=EventTarget.prototype.removeEventListener;
function retireReadTemplate(record){record.retired=true;record.rows.clear();}
function clearMaterialFields(state){if(state.materialFields){for(const rows of state.materialFields.values()){for(const fields of rows.values())fields.clear();rows.clear();}state.materialFields.clear();}state.materialFields=null;}
function retireMaterialState(state){state.active=false;clearMaterialFields(state);state.rows.clear();state.ranges.clear();state.writeIntent=null;}
function clearGrantReadTemplates(record){for(const cache of record.readTemplates)retireReadTemplate(cache);record.readTemplates.clear();for(const state of record.materialStates)retireMaterialState(state);record.materialStates.clear();}
// A private template contains only the already-qualified positive projection.
// It never retains a raw repository row or evaluates a field getter. Every
// returned wrapper is fresh; branded field getters keep their original checks.
function copyReadTemplate(value,privateCopy=false,depth=0,budget={keys:0}){
 need(depth<=20);if(value===undefined||value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return value;
 need(value&&typeof value==='object'&&[Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(value)));
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);need((budget.keys+=keys.length)<=16384);const out=Array.isArray(value)?[]:{};
 for(const key of keys){if(key==='length'&&Array.isArray(value))continue;need(typeof key==='string');const d=descriptors[key];if(Object.hasOwn(d,'value'))Object.defineProperty(out,key,{value:copyReadTemplate(d.value,privateCopy,depth+1,budget),enumerable:d.enumerable,configurable:true,writable:true});else{need(d.set===undefined&&originalMaterialAccessors.has(d.get));Object.defineProperty(out,key,{get:d.get,enumerable:d.enumerable,configurable:true});}}
 return privateCopy?Object.freeze(out):out;
}
const nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,nativeWall=Date.now,nativeMono=performance.now.bind(performance);
const grants=new WeakMap(),need=x=>{if(!x)fail('UNAVAILABLE');};
// A static live function binding also works in extension module workers,
// where dynamic import is unavailable. It is called only at scope admission.
import {requireOriginalOrganizeMaterialMethods} from '../core/organizer/store-owner.js';
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
 requireOriginalOrganizeActionScope(selectionProof,source,action,store,t);const intent=readOriginalOrganizeAction(source,action,store,t,selectionProof);permit(intent.metadata);
 const metadata=intent.metadata,scope=freeze({version:1,purpose:'organize-local-qualification',presentations:metadata.presentation?[{id:metadata.presentation.fields.id,revision:metadata.presentation.fields.revision,selectedFields:[...AI_FIELDS,'projection','manifest','cacheBinding','basedOnCheckpoint']}]:[],topic:{id:metadata.topic.id,revision:metadata.topic.revision,selectedFields:['name']},sections:metadata.sections.map(x=>({id:x.id,revision:x.revision,selectedFields:['name','title']})),entries:metadata.entries.map(x=>({id:x.id,revision:x.revision,selectedFields:['body','title','note','type','formation']})),inputs:metadata.inputs.map(x=>({id:x.input.id,revision:x.state.contentRevision,selectedFields:['body','note']})),sources:metadata.sources.map(x=>({id:x.id,selectedFields:['originalText']})),restoreEpoch:metadata.restoreEpoch,scopeBinding:intent.scopeBinding,userActionId:intent.userActionId});
 const grant=Object.freeze({}),record={source,action,store,t,selectionProof,intent,scope,released:false,readTemplates:new Set(),materialStates:new Set(),abortTemplates:null};record.abortTemplates=()=>clearGrantReadTemplates(record);nativeAddListener.call(intent.signal,'abort',record.abortTemplates,{once:true});grants.set(grant,record);return grant;
}
function current(grant,store,t){const r=grants.get(grant);need(r&&!r.released&&r.store===store&&r.t===t);requireOriginalOrganizeActionScope(r.selectionProof,r.source,r.action,store,t);const next=readOriginalOrganizeAction(r.source,r.action,store,t,r.selectionProof);need(next.scopeBinding===r.intent.scopeBinding&&next.signal===r.intent.signal&&next.expiresAt===r.intent.expiresAt);return r;}
export function readOrganizeProcessingGrant(grant,store,t){const r=current(grant,store,t);return Object.freeze({scope:r.scope,expiresAt:r.intent.expiresAt,signal:r.intent.signal});}
export function releaseOrganizeProcessingGrant(grant){const r=grants.get(grant);if(r){r.released=true;clearGrantReadTemplates(r);nativeRemoveListener.call(r.intent.signal,'abort',r.abortTemplates);r.intent=null;grants.delete(grant);}}

// No broad row clone: current metadata is projected from the private original
// selection, and only independently permitted text descriptors are evaluated.
// Accepted prior presentation fields are qualified by the same separate purpose
// policy. Pending proposals and unknown nested fields are never traversed.
export function organizeProcessingReader(grant,store,t){return createProcessingReader(grant,store,t);}
function createProcessingReader(grant,store,t,controlView=null,materialState=null){
 const r=current(grant,store,t),m=r.intent.metadata,entries=new Map(m.entries.map(x=>[x.id,x])),inputs=new Map(m.inputs.map(x=>[x.input.id,x])),sources=new Map(m.sources.map(x=>[x.id,x])),sections=new Map(m.sections.map(x=>[x.id,x]));
 const repository=own(store,'repository'),transaction=requireRepositoryTransactionScope(repository,t),readTemplate=transaction.mode==='readonly'&&!materialState?.commit?{rows:new Map(),retired:false}:null;
 const check=()=>{try{if(readTemplate){need(!readTemplate.retired&&requireRepositoryTransactionScope(repository,t)===transaction);requireRepositoryTransactionDataMethods(repository,t);}if(controlView){need(materialState?.active===true);requireOriginalOrganizeMaterialMethods(store);assertOriginalOrganizeControlsFacts(store,controlView);}const held=current(grant,store,t);if(controlView){requireOriginalOrganizeMaterialMethods(store);assertOriginalOrganizeControlsFacts(store,controlView);assertOriginalOrganizeActionFacts(r.source,r.action,store);}return held;}catch(error){if(readTemplate)retireReadTemplate(readTemplate);if(materialState)retireMaterialState(materialState);throw error;}},charge=text=>{try{check();need(typeof text==='string');chargeOriginalOrganizeWork(r.source,r.action,store,t,r.selectionProof,{bytes:new TextEncoder().encode(text).length});check();return text;}catch(error){if(readTemplate)retireReadTemplate(readTemplate);if(materialState)retireMaterialState(materialState);throw error;}};
 const material=(row,base,fields,nullable=[],table,id)=>{need(row);const out={...base};for(const field of fields)if(Object.hasOwn(row,field)){const d=Object.getOwnPropertyDescriptor(row,field),getter=function(){try{check();need(d&&Object.hasOwn(d,'value'));const value=d.value===null&&nullable.includes(field)?null:charge(d.value);recordMaterialField(materialState,table,id,field,value);check();return value;}catch(error){if(readTemplate)retireReadTemplate(readTemplate);if(materialState)retireMaterialState(materialState);throw error;}};originalMaterialAccessors.set(getter,{descriptor:d,nullable:nullable.includes(field)});Object.defineProperty(out,field,{enumerable:true,configurable:true,get:getter});}return out;};
 const sameMetadata=(row,expected)=>{
  if(expected===null||typeof expected!=='object'){need(Object.is(row,expected));return;}
  need(row&&typeof row==='object'&&Array.isArray(row)===Array.isArray(expected));if(Array.isArray(expected))need(Reflect.ownKeys(row).length===expected.length+1&&own(row,'length')===expected.length);
  for(const [key,value]of Object.entries(expected))sameMetadata(own(row,key),value);
 };
 const organizationSources=new Map((m.organizationSources||[]).map(x=>[x.id,x])),organizationTombstones=new Map();
 for(const source of organizationSources.values())if(source.index)for(const [key,present]of [['source:'+source.index.sourceKey,source.sourceTombstone],['snapshot:'+source.index.dedupeKey,source.snapshotTombstone]]){need(!organizationTombstones.has(key)||organizationTombstones.get(key)===present);organizationTombstones.set(key,present);}
 const wrap=(table,row,key=null)=>{
  check();
  // Only original presence checks may read these extra metadata keys. No
  // record value or originalText descriptor is exposed without its own grant.
  if((table==='records'||table==='recordIndex')&&organizationSources.has(key)){
   const source=organizationSources.get(key),expected=table==='records'?source.present:!!source.index;need(!!row===expected);if(!row)return row;need(own(row,'id')===key);
   if(!sources.has(key)){if(table==='recordIndex'){sameMetadata(row,source.index);return {...source.index};}return Object.freeze({id:key});}
  }
  if(table==='tombstones'&&organizationTombstones.has(key)){need(!!row===organizationTombstones.get(key));if(!row)return row;need(own(row,'id')===key);return Object.freeze({id:key});}
  if(!row)return row;const id=own(row,'id');
  if(table==='thoughts'){const e=entries.get(id);sameMetadata(row,e);const fields=material(row,e,['thoughtText','title','note'],[],'thoughts',id);for(const key of ['type','formation','userEdited'])if(Object.hasOwn(row,key)){const v=own(row,key);need(key==='userEdited'?typeof v==='boolean':typeof v==='string'&&v.length<=32);recordMaterialField(materialState,'thoughts',id,key,v);fields[key]=v;}return fields;}
  if(table==='blocks'){const e=inputs.get(id);need(e);const value=own(row,'value');sameMetadata(value,e.input);return {id,value:material(value,{...e.input,provenance:e.provenance},['libraryText','note'],['libraryText','note'],'blocks',id)};}
  if(table==='records'){need(sources.has(id));const value=own(row,'value'),base={};for(const key of ['sourceSentAt','capturedAt'])if(Object.hasOwn(value,key))base[key]=own(value,key);return {id,value:material(value,base,['originalText'],[],'records',id)};}
  if(table==='topics'){need(id===m.topic.id);sameMetadata(row,m.topic);return material(row,m.topic,['name'],[],'topics',id);}
  if(table==='sections'){const e=sections.get(id);sameMetadata(row,e);return material(row,e,['name','title'],[],'sections',id);}
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
  check();if(materialState?.commit)permitCommitRead(materialState,m,method,args);
  if(method==='all'&&materialState?.currentOnly&&!materialState.commit&&args.length>=3&&args.length<=4){
   const [table,index,key,requested]=args;
   if(key instanceof IDBKeyRange&&(table==='dependencies'&&index==='byTarget'||table==='provenance'&&index==='byOwner')&&(requested===undefined||Number.isSafeInteger(requested)&&requested>0&&requested<=4097)){
    const range=rangeValue(key),lower=range?.lower,upper=range?.upper;
    if(Array.isArray(lower)&&Array.isArray(upper)&&lower.length===2&&lower[0]==='entry'&&typeof lower[1]==='string'&&upper.length===3&&upper[0]==='entry'&&upper[1]===lower[1]&&Array.isArray(upper[2])&&upper[2].length===0&&range.lowerOpen===false&&range.upperOpen===true&&hasOriginalOrganizeEmptyRelationship(r.selectionProof,r.source,r.action,store,t,table,lower[1])){
     chargeOriginalOrganizeWork(r.source,r.action,store,t,r.selectionProof,{bytes:2});check();return [];
    }
   }
  }
  chargeOriginalOrganizeWork(r.source,r.action,store,t,r.selectionProof,{reads:1});let row;
  if(method==='all'||method==='edge'){
   const [table,index,key,requested]=args,limit=method==='edge'?1:requested===undefined?4097:requested;
   need(Number.isSafeInteger(limit)&&limit>0&&limit<=4097);const direction=method==='edge'?(requested??'next'):'next';need(direction==='next'||direction==='prev');
   requireRepositoryTransactionDataMethods(store.repository,t);const page=await t.rangePage(table,index,key,null,method==='all'?limit+1:materialState?.commit?4097:limit,direction);check();need(page&&Array.isArray(page.rows)&&page.rows.length<=4096);
   if(method==='all')need(page.next===null&&page.rows.length<=limit);
   if(materialState?.commit){need(page.next===null);recordCommitRange(materialState,table,index,key,page.rows.length);for(const item of page.rows){const raw=own(item,'value');recordCommitIndexRow(materialState,table,raw);}}
   row=method==='edge'?page.rows[0]?.value:page.rows.map(x=>x.value);
  }else{requireRepositoryTransactionDataMethods(store.repository,t);row=await t[method](...args);}
  check();return row;
 };
 // A failed original storage/CAS/projection observation retires the same
 // state shared with already returned rows and field getters.
 const guardedRead=async work=>{try{return await work();}catch(error){if(readTemplate)retireReadTemplate(readTemplate);if(materialState)retireMaterialState(materialState);throw error;}};
 const reader=Object.freeze({
  async get(...args){return guardedRead(async()=>{
   // The fixed material owner reads each Thought once. Do not allocate a second
   // retained text template for it; original IO and every field getter still pay.

   check();const [table,key]=args,cacheable=readTemplate&&args.length===2&&typeof table==='string'&&typeof key==='string'&&!(materialState&&table==='thoughts')&&!(table==='meta'&&key.startsWith('aiPresentation:')),prior=cacheable?readTemplate.rows.get(table)?.get(key):null;
   if(prior){if(prior.wrapBytes)chargeOriginalOrganizeWork(r.source,r.action,store,t,r.selectionProof,{bytes:prior.wrapBytes});check();const value=copyReadTemplate(prior.value);check();return value;}
   const value=wrap(table,await read('get',args),key);if(materialState?.commit)recordCommitRow(materialState,table,key,value);
   if(cacheable){const template=copyReadTemplate(value,true),positive=terminalCopy(template),retainedBytes=new TextEncoder().encode(JSON.stringify(positive)??'undefined').length;
    chargeOriginalOrganizeWork(r.source,r.action,store,t,r.selectionProof,{bytes:retainedBytes});check();let rows=readTemplate.rows.get(table);if(!rows){rows=new Map();readTemplate.rows.set(table,rows);}rows.set(key,{value:template,wrapBytes:table==='meta'&&value?retainedBytes:0});r.readTemplates.add(readTemplate);
   }return value;
  });},
  async edge(...args){return guardedRead(async()=>{const value=wrap(args[0],await read('edge',args));if(materialState?.commit&&value)recordCommitRow(materialState,args[0],own(value,'id'),value);return value;});},
  async all(...args){return guardedRead(async()=>{const rows=await read('all',args);need(Array.isArray(rows)&&rows.length<=4096);return rows.map(x=>{const value=wrap(args[0],x);if(materialState?.commit)recordCommitRow(materialState,args[0],own(value,'id'),value);return value;});});},
  async count(...args){return guardedRead(async()=>{const value=await read('count',args);if(materialState?.commit)recordCommitRange(materialState,args[0],args[1],args[2],value);return value;});}
 });
 return reader;
}


// No historical Filter reader or service purpose is adopted by this path.
// The original deterministic Filter owner uses the same bounded reader above;
// any aiDecision property is refused there rather than interpreted as visible.
const filterOwn=(value,key)=>{const d=Object.getOwnPropertyDescriptor(value??{},key);need(d&&Object.hasOwn(d,'value'));return d.value;};

// Fixed private adapter for the original read-only material owner. No public
// reader, callback, DTO or replacement Store can mint this capability.
const materialReaders=new WeakMap();
function materialReaderFacts(cap,store,transaction){
 const r=materialReaders.get(cap);need(r&&r.store===store&&r.transaction===transaction);
 try{
  need(r.active&&r.materialState.active&&filterOwn(store,'repository')===r.repository&&filterOwn(r.repository,'db')===r.database&&grants.get(r.grant)===r.record&&!r.record.released&&r.record.intent===r.intent);
  need(requireRepositoryTransactionScope(r.repository,transaction)===r.scope);requireRepositoryTransactionDataMethods(r.repository,transaction);requireOriginalOrganizeActionScope(r.record.selectionProof,r.record.source,r.record.action,store,transaction);
  need(!nativeAborted.call(r.intent.signal)&&nativeWall()<r.deadlineWall&&nativeMono()<r.deadlineMono);assertOriginalOrganizeActionFacts(r.record.source,r.record.action,store);requireOriginalOrganizeMaterialMethods(store);assertOriginalOrganizeControlsFacts(store,r.controls);return r;
 }catch(error){r.active=false;retireMaterialState(r.materialState);throw error;}
}
export function captureOriginalOrganizeScopeReader(grant,store,transaction){return captureScopeReader(grant,store,transaction,false);}
export function captureOriginalOrganizeCurrentScopeReader(grant,store,transaction){return captureScopeReader(grant,store,transaction,false,true);}
export function captureOriginalOrganizeCommitScopeReader(grant,store,transaction){return captureScopeReader(grant,store,transaction,true);}
function captureScopeReader(grant,store,transaction,commit,currentOnly=false){
 requireOriginalOrganizeMaterialMethods(store);const record=current(grant,store,transaction);requireOriginalOrganizeMaterialMethods(store);const repository=filterOwn(store,'repository'),database=filterOwn(repository,'db'),scope=requireRepositoryTransactionScope(repository,transaction);
 need(scope.mode===(commit?'readwrite':'readonly'));if(commit)requireOriginalOrganizeCommitScope(record.selectionProof,store,transaction);const controls=readOriginalOrganizeControls(store,transaction),intent=record.intent;chargeOriginalOrganizeWork(record.source,record.action,store,transaction,record.selectionProof,{bytes:new TextEncoder().encode(JSON.stringify(controls)).length});assertOriginalOrganizeControlsFacts(store,controls);const remaining=intent.expiresAt-Date.now();need(Number.isFinite(remaining)&&remaining>0&&remaining<=30000);
 const materialState={active:true,commit,currentOnly,store,transaction,record,rows:new Map(),ranges:new Map(),writeIntent:null,materialFields:null},reader=createProcessingReader(grant,store,transaction,controls,materialState),cap=Object.freeze({}),view=Object.freeze({reader,controls,topicId:intent.topicId});
 record.materialStates.add(materialState);materialReaders.set(cap,{materialState,store,transaction,repository,database,scope,record,intent,grant,controls,reader,view,active:true,deadlineWall:Math.min(intent.expiresAt,nativeWall()+remaining),deadlineMono:nativeMono()+remaining});readOriginalOrganizeScopeReader(cap,store,transaction);if(commit)registerCommitMaterialFence(cap,store,transaction);return cap;
}
export function readOriginalOrganizeScopeReader(cap,store,transaction){
 const r=materialReaderFacts(cap,store,transaction);try{need(current(r.grant,store,transaction)===r.record);materialReaderFacts(cap,store,transaction);return r.view;}catch(error){r.active=false;retireMaterialState(r.materialState);throw error;}
}
export function assertOriginalOrganizeScopeReaderFacts(cap,store,transaction){materialReaderFacts(cap,store,transaction);return true;}

// The cryptographic material fingerprint is private to this original call.
// Only an actually evaluated branded field or already-permitted scalar enters
// it. Missing fields have no entry; a present null has an entry, and an invalid
// present undefined is still refused by the field's original validator.
function recordMaterialField(state,table,key,field,value){
 if(!state?.materialFields)return;
 need(state.active&&typeof table==='string'&&typeof key==='string'&&typeof field==='string'&&(value===null||typeof value==='string'||typeof value==='boolean'));
 const tables=state.materialFields,rows=tables.get(table),fields=rows?.get(key);
 if(fields?.has(field)){need(Object.is(fields.get(field),value));return;}
 // Retain each table/row identity once, not once per selected field. These
 // increments exactly equal the grouped canonical JSON size, in any read order.
 const encoder=new TextEncoder();let bytes=encoder.encode(JSON.stringify([field,value])).length+(fields?.size?1:0);
 if(!fields)bytes+=encoder.encode(JSON.stringify(key)).length+5+(rows?.size?1:0);
 if(!rows)bytes+=encoder.encode(JSON.stringify(table)).length+5+(tables.size?1:0);
 chargeOriginalOrganizeWork(state.record.source,state.record.action,state.store,state.transaction,state.record.selectionProof,{bytes});
 need(state.active&&state.materialFields===tables);const heldRows=rows??new Map(),heldFields=fields??new Map();heldFields.set(field,value);heldRows.set(key,heldFields);tables.set(table,heldRows);
}
export function beginOriginalOrganizeMaterialRead(cap,store,transaction){
 const r=materialReaderFacts(cap,store,transaction);need(r.materialState.materialFields===null);
 chargeOriginalOrganizeWork(r.record.source,r.record.action,store,transaction,r.record.selectionProof,{bytes:2});materialReaderFacts(cap,store,transaction);r.materialState.materialFields=new Map();
}
export function clearOriginalOrganizeMaterialRead(cap,store,transaction){
 const r=materialReaders.get(cap);need(r&&r.store===store&&r.transaction===transaction);clearMaterialFields(r.materialState);
}
// Private synchronous SHA-256: IDB may auto-close across a WebCrypto await.
// Stream the grouped canonical field-map UTF-8, with fixed-size working
// buffers. This digest binds material; it creates no new processing authority.
const materialSHA256K=Object.freeze([
 0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
 0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
 0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
 0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
 0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
 0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
 0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
 0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
function materialSHA256(parts,charge){
 const state=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),block=new Uint8Array(64),words=new Uint32Array(64),view=new DataView(block.buffer),encoder=new TextEncoder();let used=0,total=0;
 const rotate=(value,bits)=>(value>>>bits)|(value<<(32-bits));
 const compress=()=>{
  for(let i=0;i<16;i++)words[i]=view.getUint32(i*4,false);
  for(let i=16;i<64;i++){const a=words[i-15],b=words[i-2],s0=rotate(a,7)^rotate(a,18)^(a>>>3),s1=rotate(b,17)^rotate(b,19)^(b>>>10);words[i]=(words[i-16]+s0+words[i-7]+s1)>>>0;}
  let [a,b,c,d,e,f,g,h]=state;
  for(let i=0;i<64;i++){const s1=rotate(e,6)^rotate(e,11)^rotate(e,25),choose=(e&f)^(~e&g),t1=(h+s1+choose+materialSHA256K[i]+words[i])>>>0,s0=rotate(a,2)^rotate(a,13)^rotate(a,22),majority=(a&b)^(a&c)^(b&c),t2=(s0+majority)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
  const next=[a,b,c,d,e,f,g,h];for(let i=0;i<8;i++)state[i]=(state[i]+next[i])>>>0;
 };
 const write=text=>{
  const bytes=encoder.encode(text);try{charge(bytes.length);total+=bytes.length;need(Number.isSafeInteger(total)&&total<=Number.MAX_SAFE_INTEGER/8);
   for(let offset=0;offset<bytes.length;){const size=Math.min(64-used,bytes.length-offset);block.set(bytes.subarray(offset,offset+size),used);used+=size;offset+=size;if(used===64){compress();used=0;}}
  }finally{bytes.fill(0);}
 };
 try{
  for(const part of parts)write(part);
  block[used++]=0x80;if(used>56){block.fill(0,used);compress();used=0;}block.fill(0,used,56);view.setUint32(56,Math.floor(total/0x20000000),false);view.setUint32(60,(total*8)>>>0,false);compress();
  return Array.from(state,value=>value.toString(16).padStart(8,'0')).join('');
 }finally{block.fill(0);words.fill(0);state.fill(0);}
}
function* materialFingerprintParts(tables){
 yield '[';let tableIndex=0;
 for(const table of [...tables.keys()].sort()){
  if(tableIndex++)yield ',';yield '['+JSON.stringify(table)+',[';const rows=tables.get(table);let rowIndex=0;
  for(const key of [...rows.keys()].sort()){
   if(rowIndex++)yield ',';yield '['+JSON.stringify(key)+',[';const fields=rows.get(key);let fieldIndex=0;
   for(const field of [...fields.keys()].sort()){if(fieldIndex++)yield ',';yield JSON.stringify([field,fields.get(field)]);}
   yield ']]';
  }
  yield ']]';
 }
 yield ']';
}
export function sealOriginalOrganizeMaterialProof(cap,store,transaction,proofFields){
 const r=materialReaderFacts(cap,store,transaction),state=r.materialState;need(state.materialFields!==null);
 try{
  const charge=bytes=>chargeOriginalOrganizeWork(r.record.source,r.record.action,store,transaction,r.record.selectionProof,{bytes}),digest=materialSHA256(materialFingerprintParts(state.materialFields),charge),proof=JSON.stringify([...proofFields,['original-material-fields-sha256-v2',digest]]);
  // Only the digest survives the material call, never newly collected raw
  // Source/Input values in a retained CAS result. Charge both the exact streamed
  // fingerprint input and the complete newly retained proof representation.
  charge(new TextEncoder().encode(proof).length);materialReaderFacts(cap,store,transaction);return proof;
 }finally{clearOriginalOrganizeMaterialRead(cap,store,transaction);}
}

// Original material snapshots hold only already-qualified positive fields. The
// terminal owner checks data descriptors and never invokes a lazy field getter.
function terminalCopy(value,depth=0,budget={keys:0}){
 need(depth<=20);if(value===undefined||value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return value;
 need(value&&typeof value==='object'&&[Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(value)));const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);need((budget.keys+=keys.length)<=16384);
 const out=Array.isArray(value)?[]:{};
 for(const key of keys){if(key==='length'&&Array.isArray(value))continue;need(typeof key==='string');const descriptor=descriptors[key];let selected;if(Object.hasOwn(descriptor,'value'))selected=descriptor.value;else{const held=originalMaterialAccessors.get(descriptor.get);need(held&&held.descriptor&&Object.hasOwn(held.descriptor,'value'));selected=held.descriptor.value;need(typeof selected==='string'||selected===null&&held.nullable);}out[key]=terminalCopy(selected,depth+1,budget);}
 return freeze(out);
}
function samePositive(actual,expected,depth=0){
 if(Object.is(actual,expected))return true;need(depth<=20);
 if(expected===null||typeof expected!=='object')return false;
 if(!actual||typeof actual!=='object'||Array.isArray(actual)!==Array.isArray(expected))return false;
 if(Array.isArray(expected)&&(own(actual,'length')!==expected.length||Reflect.ownKeys(actual).length!==expected.length+1))return false;
 for(const key of Reflect.ownKeys(expected)){const d=Object.getOwnPropertyDescriptor(actual,key);if(!d){if(expected[key]===undefined)continue;return false;}if(!Object.hasOwn(d,'value')||!samePositive(d.value,expected[key],depth+1))return false;}return true;
}
// Omitted selected fields are significant too. A terminal reread may not add
// one after the material proof was sealed, including an own undefined/null.
function sameMaterialPresence(table,actual,expected){
 const fields=table==='thoughts'?['thoughtText','title','note','type','formation','userEdited']:table==='topics'?['name']:table==='sections'?['name','title']:table==='blocks'?['libraryText','note']:table==='records'?['originalText']:[];
 if(!fields.length||!expected||!actual)return true;
 if(table==='blocks'||table==='records'){expected=optional(expected,'value');if(expected===undefined)return true;const d=Object.getOwnPropertyDescriptor(actual,'value');if(!d||!Object.hasOwn(d,'value'))return false;actual=d.value;}
 return !!actual&&fields.every(field=>Object.hasOwn(actual,field)===Object.hasOwn(expected,field));
}
function commitCost(state,reads,bytes){need(state.active);chargeOriginalOrganizeActionWork(state.record.source,state.record.action,state.store,reads,bytes);}
function mergePositive(previous,next){
 if(Object.is(previous,next))return previous;
 need(previous&&next&&typeof previous==='object'&&typeof next==='object'&&Array.isArray(previous)===Array.isArray(next));
 if(Array.isArray(previous))need(previous.length===next.length);const merged=Array.isArray(previous)?[...previous]:{...previous};
 for(const key of Reflect.ownKeys(next)){if(key==='length'&&Array.isArray(next))continue;merged[key]=Object.hasOwn(previous,key)?mergePositive(previous[key],next[key]):next[key];}return freeze(merged);
}
function recordCommitRow(state,table,key,value,{filter=false,indexOnly=false}={}){
 need(state.active&&typeof table==='string'&&typeof key==='string');const tag=JSON.stringify([table,key]),expected=terminalCopy(value),prior=state.rows.get(tag);
 if(prior){if(prior.forbidAIDecision)need(!expected||!Object.hasOwn(expected,'aiDecision'));const merged=mergePositive(prior.expected,expected),size=new TextEncoder().encode(JSON.stringify(merged)??'undefined').length;commitCost(state,0,Math.max(0,size-prior.bytes));prior.expected=merged;prior.bytes=size;prior.filter ||= filter;return;}
 const forbidAIDecision=table==='filterInputs'&&!filter&&expected!==null&&expected!==undefined;
 const bytes=new TextEncoder().encode(JSON.stringify(expected)??'undefined').length;commitCost(state,0,bytes);state.rows.set(tag,{table,key,expected,filter,indexOnly,forbidAIDecision,bytes});need(state.rows.size<=4096);
}
function rangeValue(key){
 if(key===undefined||typeof key==='string'||typeof key==='number'||Array.isArray(key))return terminalCopy(key);
 need(key instanceof IDBKeyRange);const view={};for(const field of ['lower','upper','lowerOpen','upperOpen']){const d=Object.getOwnPropertyDescriptor(key,field);if(d){need(Object.hasOwn(d,'value'));view[field]=terminalCopy(d.value);}else{const descriptor=Object.getOwnPropertyDescriptor(IDBKeyRange.prototype,field);need(descriptor&&typeof descriptor.get==='function');view[field]=terminalCopy(descriptor.get.call(key));}}return view;
}
function copyRange(key){if(!(key instanceof IDBKeyRange))return terminalCopy(key);const b=rangeValue(key);return b.lower===undefined?IDBKeyRange.upperBound(b.upper,b.upperOpen):b.upper===undefined?IDBKeyRange.lowerBound(b.lower,b.lowerOpen):IDBKeyRange.bound(b.lower,b.upper,b.lowerOpen,b.upperOpen);}
function recordCommitRange(state,table,index,key,expected){need(Number.isSafeInteger(expected)&&expected>=0);const tag=JSON.stringify([table,index,rangeValue(key)]),prior=state.ranges.get(tag);if(prior)need(prior.expected===expected);else state.ranges.set(tag,{table,index:index??undefined,key:copyRange(key),expected});need(state.ranges.size<=4096);}
function recordCommitIndexRow(state,table,row){
 const fields=table==='operationReceipts'?['id','namespace','ownerId','operationSequence']:table==='dependencies'?['id','inputId','targetKind','targetId']:['id'];
 const value={};for(const key of fields)if(Object.hasOwn(row,key))value[key]=own(row,key);recordCommitRow(state,table,own(row,'id'),value,{indexOnly:true});
}
function permitCommitRead(state,m,method,args){
 need(state.active&&Array.isArray(args));const [table,keyOrIndex,key]=args;need(typeof table==='string');
 if(method==='get'){
  need(args.length===2&&typeof keyOrIndex==='string');const id=keyOrIndex;
  need(table==='topics'&&id===m.topic.id||table==='thoughts'&&m.entries.some(x=>x.id===id)||table==='sections'&&m.sections.some(x=>x.id===id)||['blocks','inputStates','filterInputs'].includes(table)&&m.inputs.some(x=>x.input.id===id)||['records','recordIndex'].includes(table)&&[...m.sources,...m.organizationSources].some(x=>x.id===id)||table==='meta'&&['gate','recovery-restore-epoch','backup-recovery-settings','thought-library','smart-filter','memory:config','aiOrganizerCheckpoint','aiPresentation:'+m.topic.id].includes(id)||table==='tombstones'&&[...m.sources,...m.organizationSources.map(x=>x.index).filter(Boolean)].some(x=>id==='source:'+x.sourceKey||id==='snapshot:'+x.dedupeKey)||table==='filterIntents'&&m.sources.some(x=>id===(x.sourceKey||'legacy:'+x.id)));
  return;
 }
 need(['all','edge','count'].includes(method));const possible=[];
 if(table==='placements'&&keyOrIndex==='byTopicOrder'||table==='sections'&&keyOrIndex==='byTopicOrder')possible.push(prefix([m.topic.id,m.topic.activeLayoutGeneration,0]));
 if(table==='dependencies'&&keyOrIndex==='byTarget'||table==='provenance'&&keyOrIndex==='byOwner')for(const e of m.entries)possible.push(prefix(['entry',e.id]));
 if(table==='dependencies'&&keyOrIndex==='byInputTarget')for(const e of m.entries)for(const input of m.inputs)possible.push(prefix([input.input.id,'entry',e.id]));
 if(table==='operationReceipts'&&keyOrIndex==='byOwner')for(const e of m.entries)possible.push(prefix(['thought-library',e.id]));
 const actual=JSON.stringify(rangeValue(key));need(possible.some(range=>JSON.stringify(rangeValue(range))===actual));
}
const commitMaterialScopes=new WeakMap();
function commitMaterial(cap,repository,transaction){const r=materialReaders.get(cap);need(r&&r.materialState.commit&&r.repository===repository&&r.transaction===transaction&&commitMaterialScopes.get(transaction)===cap);materialReaderFacts(cap,r.store,transaction);return r;}
// No configured Filter clock exists in this current-main path. Keep the
// original fixed sampler interface without adding an issuer or callback.
export function sampleOriginalOrganizeMaterialFinalFacts(cap,repository,transaction){return requireOriginalOrganizeMaterialFinalFacts(cap,repository,transaction);}
export function requireOriginalOrganizeMaterialFinalFacts(cap,repository,transaction){const r=commitMaterial(cap,repository,transaction);materialReaderFacts(cap,r.store,transaction);return true;}
function registerCommitMaterialFence(cap,store,transaction){
 const r=materialReaders.get(cap);need(!commitMaterialScopes.has(transaction));commitMaterialScopes.set(transaction,cap);
 registerOriginalOrganizeCommitSelectionFence(r.record.selectionProof,store,transaction);
 registerRepositoryFinalReadFence(r.repository,transaction,{organizeMaterialAuthority:cap,isCurrent:()=>{readOriginalOrganizeScopeReader(cap,store,transaction);return true;},plan:function*(){
  requireOriginalOrganizeMaterialFinalFacts(cap,r.repository,transaction);const state=r.materialState;
  for(const {expected,...spec}of state.ranges.values()){commitCost(state,1,0);const count=yield {method:'count',...spec};need(count===expected);}
  const writes=state.writeIntent?readOriginalOrganizeCandidateWriteIntent(state.writeIntent,store,transaction,cap,true).writes:[];
  for(const observed of state.rows.values()){const written=writes.find(w=>w.table===observed.table&&w.key===observed.key);commitCost(state,1,written?new TextEncoder().encode(JSON.stringify(written.after)).length:observed.bytes);const row=yield {method:'get',table:observed.table,key:observed.key};if(written){need(samePositive(written.before,observed.expected)&&sameOriginalOrganizeCandidateWrite(row,written.after));continue;}need(samePositive(row,observed.expected)&&sameMaterialPresence(observed.table,row,observed.expected));if(observed.table==='filterInputs'&&row){if(observed.forbidAIDecision)need(!Object.hasOwn(row,'aiDecision'));else if(observed.expected?.aiDecision?.proof){const actual=own(own(row,'aiDecision'),'proof'),expected=observed.expected.aiDecision.proof;need(samePositive(actual,expected)&&samePositive(expected,actual));}}}
  for(const written of writes)if(!state.rows.has(JSON.stringify([written.table,written.key]))){commitCost(state,1,new TextEncoder().encode(JSON.stringify(written.after)).length);const row=yield {method:'get',table:written.table,key:written.key};need(sameOriginalOrganizeCandidateWrite(row,written.after));}
  return requireOriginalOrganizeMaterialFinalFacts(cap,r.repository,transaction);
 }});
}

export function requireOriginalOrganizeCommitScopeReader(cap,store,transaction){const r=materialReaderFacts(cap,store,transaction);need(r.materialState.commit&&commitMaterialScopes.get(transaction)===cap);return readOriginalOrganizeScopeReader(cap,store,transaction);}
export function registerOriginalOrganizeCandidateWrite(cap,store,transaction,intent){
 const view=requireOriginalOrganizeCommitScopeReader(cap,store,transaction),r=materialReaders.get(cap),state=r.materialState;need(state.writeIntent===null);
 const writes=readOriginalOrganizeCandidateWriteIntent(intent,store,transaction,cap).writes;need(writes.length===2&&writes[0].table==='meta'&&writes[0].key==='aiPresentation:'+view.topicId&&writes[1].table==='libraryMigrationItems'&&writes[1].key==='ai-presentation-candidate-fence:'+view.topicId);
 state.writeIntent=intent;registerOriginalOrganizeCommitSelectionWrite(r.record.selectionProof,store,transaction,cap,intent);requireOriginalOrganizeCommitScopeReader(cap,store,transaction);return true;
}
