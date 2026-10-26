import {requireMaintenanceProcessingSelection} from './maintenance-processing-source-denial.js';
import {readMaintenanceProcessingSelection,readMaintenanceProcessingRequestPermit} from './local-maintenance-session.js';
import {readMaintenanceQualificationRequestPermit} from './maintenance-qualification.js';
import {readMaintenanceServiceProcessingPlan,readMaintenanceServiceProcessingDenial,assertMaintenanceServiceLifecycleFacts} from './maintenance-service-client.js';
import {readMaintenanceProcessingConsent,readMaintenanceProcessingConsentDenial,assertMaintenanceProcessingConsentFacts,assertMaintenanceProcessingConsentSnapshot,releaseMaintenanceProcessingConsent,bindMaintenanceProcessingConsentReceipt,assertMaintenanceProcessingConsentReceiptSnapshot} from '../../background/maintenance-processing-consent.js';
import {createMaintenanceProcessingDenyCell,retireMaintenanceProcessingDenyCell,assertMaintenanceProcessingDenyCellFacts,bindMaintenanceProcessingRawDenials,assertMaintenanceProcessingRawDenialFacts} from './maintenance-processing-denial.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,assertContextScopeTransactionIdentity} from '../context-topic-scope.js';
import {prefix} from '../thought-model.js';
import {structuralContextAllowsTopic,structuralSectionRestoreAllowsTopic,structuralContextScope} from './structural-context-mapping.js';
import {topicContextAllowsTopic,topicNameRestoreAllowsTopic} from './topic-context-mapping.js';
import {validateFreshAuthoredPermit,validateFreshAuthoredPolicy} from './maintenance-authored-source-preparation.js';
import {validateFreshPlacementPermit,validateFreshPlacementPolicy} from './maintenance-placement-source-preparation.js';
import {canonical,equal,exact,fail,opaque} from './contracts.js';
const issuers=new WeakMap(),receipts=new WeakMap();
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,abort=AbortController.prototype.abort;
const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
const wall=Date.now.bind(Date),mono=performance.now.bind(performance),need=value=>{if(!value)fail('UNAVAILABLE');};
const data=(value,key,optional=false)=>{const d=value&&Object.getOwnPropertyDescriptor(value,key);if(!d&&optional)return undefined;need(d&&Object.hasOwn(d,'value'));return d.value;};
const project=(row,fields)=>Object.fromEntries(fields.filter(key=>Object.hasOwn(row,key)).map(key=>{const value=data(row,key);need(value===null||['string','number','boolean'].includes(typeof value));return [key,value];}));
const processingReaderParent=Object.getPrototypeOf;
function originalScope(store,transaction){assertContextScopeTransactionIdentity(transaction,store);const repository=data(store,'repository');let t=transaction;for(let depth=0;t&&depth<16;depth++,t=processingReaderParent(t)){try{requireRepositoryTransactionScope(repository,t);requireRepositoryTransactionDataMethods(repository,t);return t;}catch{}}fail('UNAVAILABLE');}
function currentFamily(r,f){
 need(!r.disposed&&!f.closed);assertMaintenanceProcessingDenyCellFacts(f.denial);assertMaintenanceProcessingDenyCellFacts(f.selection.denial);
 assertMaintenanceServiceLifecycleFacts(f.selection.lifecycleCap,f.selection.client,r.store);
 assertContextScopeWorkBudgetFacts(f.selection.budget,{database:f.database});
 if(f.cap)assertMaintenanceProcessingConsentFacts(f.cap,r.consentOwner,r.store);
 return true;
}
function releaseFamily(r,f){
 if(!f.closed){f.closed=true;try{fail('UNAVAILABLE');}catch(error){f.rejectStop?.(error);}retireMaintenanceProcessingDenyCell(f.denial);clearTimeout(f.timer);for(const [signal,listener]of f.listeners)remove.call(signal,'abort',listener);f.listeners=[];abort.call(f.controller);if(f.cap){releaseMaintenanceProcessingConsent(f.cap,r.consentOwner,r.store);f.cap=null;}f.raws.clear();}
 if(f.pending===0)r.families.delete(f.selection.token);
}
function originalPermit(r,transaction,scope,permit){
 const qualified=readMaintenanceQualificationRequestPermit(permit,r.store,transaction,r.processing);
 const p=readMaintenanceProcessingRequestPermit(qualified?.selectorPermit??permit,r.store,transaction,r.processing);need(p);
 const selected=readMaintenanceProcessingSelection(p.selection,r.store,transaction);
 const plan=readMaintenanceServiceProcessingPlan(p.client,r.store);
 need(plan.processing===r.processing&&plan.context===r.context&&p.caller===r.caller&&plan.caller===r.caller&&plan.resolve===r.processing.resolve&&plan.isCurrent===r.processing.isCurrent&&p.client===selected.client&&p.lifecycleCap===selected.lifecycleCap&&p.budget===selected.budget);
 if(qualified){need(p.kind==='qualification'&&qualified.scope===scope&&qualified.request===p.request&&qualified.selectionSpec===p.selectionSpec&&qualified.phase===p.phase&&qualified.binding===p.binding&&qualified.parent===p.parent&&qualified.budget===p.budget);}
 else need(p.kind==='payload'&&p.scope===scope);
 if(r.client!==null)need(r.client===p.client);else r.client=p.client;
 if(p.authoredEntry){need(!p.structuralRestore&&!p.structuralRename&&!p.freshPlacement);return {...validateFreshAuthoredPermit(p,qualified,scope,plan),selected};}
 if(p.freshPlacement){need(!p.structuralRestore&&!p.structuralRename);return {...validateFreshPlacementPermit(p,qualified,scope,plan),selected};}
 if(p.structuralRename){need(!p.structuralRestore);return renamePermit(p,selected,qualified,scope,plan);}
 if(p.structuralRestore)return restorePermit(p,selected,qualified,scope,plan);
 const structural=!!qualified&&p.request.items.some(i=>i.descriptor.kind!=='input');
 if(p.freshAuthoredPrejob){const d=p.request.items[0]?.descriptor;need(p.freshAuthoredPrejob===true&&qualified&&structural&&p.phase==='prejob'&&!p.authoredEntry&&!p.freshPlacement&&!p.structuralRestore&&!p.structuralRename&&p.request.items.length===1&&d.kind==='library_entry'&&d.human===true&&d.recordId===d.entityId&&d.inputIds.length===0&&d.sourceRecordIds.length===0);}
 need(p.request.items.length>0&&p.request.items.length<=20&&p.request.items.every(i=>!i.descriptor.removed&&!i.descriptor.fenceOnly&&(i.descriptor.kind==='input'?i.descriptor.inputIds.length===1&&i.descriptor.inputIds[0]===i.descriptor.entityId:structural&&['library_entry','placement','topic','section'].includes(i.descriptor.kind))));
 const ids=p.request.items.map(i=>i.descriptor.entityId);need(new Set(ids).size===ids.length&&p.request.coverage.every(u=>p.request.items.some(i=>i.key===u.key)&&u.scope===plan.scope&&['topic','context'].includes(u.facet)));
 const wanted=scope.inputs?.map(i=>i.inputId);need(Array.isArray(wanted)&&new Set(wanted).size===wanted.length&&(structural||wanted.every(id=>ids.includes(id))));
 if(qualified){
  exact(scope,['purpose','phase','binding','batchFingerprint','restoreEpoch','rootAuthority','inputs','sources','entries','structures','journals']);
  need(scope.purpose==='ai-maintenance-qualification'&&['prejob','child-mapping','child'].includes(p.phase)&&scope.phase===p.phase&&equal(scope.binding,p.binding)&&(structural||scope.entries.length===0&&scope.structures.length===0&&scope.journals.length===0));
  need(scope.inputs.every(i=>equal(i.selectedFields,['body','note']))&&scope.sources.every(s=>equal(s.selectedFields,['originalText'])));
  if(structural)need(p.phase==='prejob'&&Object.keys(p.selectionSpec).every(k=>k==='inputIds'));
  need(scope.inputs.length<=20&&scope.sources.length<=20&&new TextEncoder().encode(JSON.stringify(scope)).length<=32768);
  need((p.selectionSpec.inputIds??[]).length===wanted.length&&(p.selectionSpec.inputIds??[]).every(id=>wanted.includes(id)));
 }else{
  exact(scope,['purpose','logicalJobId','childOperationId','principalId','libraryId','consentEpoch','inputs','facets','coverage']);
  need(scope.purpose==='ai-maintenance-payload'&&scope.inputs.length===ids.length&&scope.inputs.every(i=>equal(i.selectedFields,['body']))&&equal(scope.coverage,p.request.coverage)&&equal(scope.facets,[...new Set(p.request.coverage.map(u=>u.facet))].sort()));
  for(const key of ['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'])need(scope[key]===p.binding[key]);
 }
 return {p,selected,qualified,structural,ids:wanted};
}
// A separate fixed selected-restore policy, never an extension of the old
// Input-only receipt. The only route selector is the original private permit's
// genuine mapper object; public DTOs, flags and local qualification do not grant
// outbound fields. The original owner below mints each purpose independently.
function restorePermit(p,selected,qualified,scope,plan){
 const m=p.structuralRestore,topic=topicNameRestoreAllowsTopic(m);need(topic||structuralSectionRestoreAllowsTopic(m));
 need(p.request.items.length===1&&p.request.coverage.length===1);const item=p.request.items[0],unit=p.request.coverage[0],d=item.descriptor;
 need(unit.key===item.key&&unit.facet==='topic'&&unit.scope===plan.scope&&!d.removed&&!d.fenceOnly&&!d.independent&&d.kind===(topic?'topic':'section')&&d.entityId===(topic?m.topicId:m.sectionId)&&d.recordId===m.recordId&&d.revision===(topic?m.topicRevision:m.sectionRevision)&&d.journalId===m.journalId);
 exact(p.binding,['logicalJobId','childOperationId','principalId','libraryId','consentEpoch']);
 const ids=[...new Set(m.entries.map(e=>e.inputId))].sort(),wanted=scope.inputs?.map(i=>i.inputId);need(ids.length>0&&ids.length<=16&&Array.isArray(wanted)&&new Set(wanted).size===wanted.length);
 if(qualified){
  exact(scope,['purpose','phase','binding','batchFingerprint','restoreEpoch','rootAuthority','inputs','sources','entries','structures','journals']);
  need(scope.purpose==='ai-maintenance-qualification'&&['child-mapping','child'].includes(p.phase)&&scope.phase===p.phase&&equal(scope.binding,p.binding));
  need(scope.inputs.every(i=>{exact(i,['inputId','revision','selectedFields']);return equal(i.selectedFields,['body','note']);})&&scope.sources.every(s=>{exact(s,['sourceRecordId','selectedFields']);return equal(s.selectedFields,['originalText']);}));
  if(p.phase==='child-mapping')need(p.parent===null&&Object.keys(p.selectionSpec).every(k=>k==='inputIds')&&wanted.length===0);
  else{
   exact(p.selectionSpec,['inputIds','inputMirrorInputs','entryIds','historyEntryIds','structures','topicIds','localTopicSeeds']);
   need(p.parent&&equal([...wanted].sort(),ids)&&equal([...p.selectionSpec.inputIds].sort(),ids)&&equal([...p.selectionSpec.inputMirrorInputs].sort(),ids)&&equal([...p.selectionSpec.entryIds].sort(),m.entries.map(e=>e.entryId).sort())&&p.selectionSpec.historyEntryIds.length===0&&p.selectionSpec.structures.length===0&&equal(p.selectionSpec.topicIds,[m.topicId])&&p.selectionSpec.localTopicSeeds.length===0);
  }
 }else{
  const group=topic?'structuralTopics':'structuralSections';
  exact(scope,['purpose','logicalJobId','childOperationId','principalId','libraryId','consentEpoch','inputs','entries',group,'facets','coverage']);
  need(p.phase==='payload'&&p.parent===null&&scope.purpose==='ai-maintenance-payload'&&equal([...wanted].sort(),ids)&&scope.inputs.every(i=>{exact(i,['inputId','selectedFields']);return equal(i.selectedFields,['body']);})&&equal(scope.entries,m.entries.map(({entryId,revision})=>({entryId,revision,selectedFields:['body']})))&&equal(scope[group],[structuralContextScope(m)])&&equal(scope.facets,['topic'])&&equal(scope.coverage,p.request.coverage));
  for(const key of ['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'])need(scope[key]===p.binding[key]);
  exact(p.selectionSpec,['inputIds']);need(equal([...p.selectionSpec.inputIds].sort(),ids));
 }
 need(scope.inputs.length<=20&&new TextEncoder().encode(JSON.stringify(scope)).length<=32768);
 return {p,selected,qualified,structural:true,restore:m,ids:wanted};
}
// Fresh original rename policy: independent from restore and Input receipts.
// Both original facets stay in their real child; old Context fields are refused.
function renamePermit(p,selected,qualified,scope,plan){
 const m=p.structuralRename,topic=topicContextAllowsTopic(m);need(topic||m?.kind===undefined&&structuralContextAllowsTopic(m));
 need(!topicNameRestoreAllowsTopic(m)&&!structuralSectionRestoreAllowsTopic(m));
 need(p.request.items.length===1&&p.request.coverage.length>=1&&p.request.coverage.length<=2);const item=p.request.items[0],unit=p.request.coverage.find(u=>u.facet==='topic'),d=item.descriptor,facets=[...new Set(p.request.coverage.map(u=>u.facet))].sort();
 need(unit&&facets.length===p.request.coverage.length&&p.request.coverage.every(u=>u.key===item.key&&u.scope===plan.scope&&['topic','context'].includes(u.facet)));
 need(unit.key===item.key&&unit.facet==='topic'&&unit.scope===plan.scope&&!d.removed&&!d.fenceOnly&&!d.independent&&d.kind===(topic?'topic':'section')&&d.entityId===(topic?m.topicId:m.sectionId)&&d.recordId===m.recordId&&d.revision===(topic?m.topicRevision:m.sectionRevision)&&d.journalId===m.journalId);
 exact(p.binding,['logicalJobId','childOperationId','principalId','libraryId','consentEpoch']);
 const ids=[...new Set(m.entries.map(e=>e.inputId))].sort(),wanted=scope.inputs?.map(i=>i.inputId);need(ids.length>0&&ids.length<=16&&Array.isArray(wanted)&&new Set(wanted).size===wanted.length);
 if(qualified){
  exact(scope,['purpose','phase','binding','batchFingerprint','restoreEpoch','rootAuthority','inputs','sources','entries','structures','journals']);
  need(scope.purpose==='ai-maintenance-qualification'&&['child-mapping','child'].includes(p.phase)&&scope.phase===p.phase&&equal(scope.binding,p.binding));
  need(scope.inputs.every(i=>{exact(i,['inputId','revision','selectedFields']);return equal(i.selectedFields,['body','note']);})&&scope.sources.every(s=>{exact(s,['sourceRecordId','selectedFields']);return equal(s.selectedFields,['originalText']);}));
  if(p.phase==='child-mapping')need(p.parent===null&&Object.keys(p.selectionSpec).every(k=>k==='inputIds')&&wanted.length===0);
  else{
   exact(p.selectionSpec,['inputIds','inputMirrorInputs','entryIds','historyEntryIds','structures','topicIds','localTopicSeeds']);
   need(p.parent&&equal([...wanted].sort(),ids)&&equal([...p.selectionSpec.inputIds].sort(),ids)&&equal([...p.selectionSpec.inputMirrorInputs].sort(),ids)&&equal([...p.selectionSpec.entryIds].sort(),m.entries.map(e=>e.entryId).sort())&&p.selectionSpec.historyEntryIds.length===0&&equal(p.selectionSpec.structures,facets.includes('context')?[{store:topic?'topics':'sections',recordId:m.recordId,selectedFields:[topic?'name':'title']}]:[])&&equal(p.selectionSpec.topicIds,[m.topicId])&&p.selectionSpec.localTopicSeeds.length===0);
  }
 }else{
  const group=topic?'structuralTopics':'structuralSections';
  exact(scope,['purpose','logicalJobId','childOperationId','principalId','libraryId','consentEpoch','inputs','entries',group,'facets','coverage']);
  need(p.phase==='payload'&&p.parent===null&&scope.purpose==='ai-maintenance-payload'&&equal([...wanted].sort(),ids)&&scope.inputs.every(i=>{exact(i,['inputId','selectedFields']);return equal(i.selectedFields,['body']);})&&equal(scope.entries,m.entries.map(({entryId,revision})=>({entryId,revision,selectedFields:['body']})))&&equal(scope[group],[structuralContextScope(m)])&&equal(scope.facets,facets)&&equal(scope.coverage,p.request.coverage));
  for(const key of ['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'])need(scope[key]===p.binding[key]);
  exact(p.selectionSpec,['inputIds']);need(equal([...p.selectionSpec.inputIds].sort(),ids));
 }
 need(scope.inputs.length<=20&&new TextEncoder().encode(JSON.stringify(scope)).length<=32768);
 return {p,selected,qualified,structural:true,rename:m,ids:wanted};
}
// This fixed policy reads only original metadata indexes, not selected bodies.
// External-access, Assist and Filter switches are not Maintenance permission.
async function policy(r,f,transaction,scope,permit){
 const t=contextScopeTransactionReader(r.store,transaction,f.selection.budget),check=()=>currentFamily(r,f);
 const config=await t.get('meta','memory:config');check();if(config!==null&&config!==undefined){need(typeof config==='object'&&!Array.isArray(config)&&[Object.prototype,null].includes(Object.getPrototypeOf(config)));const local=data(config,'localOnly',true);need(local===undefined||local===false);}
 const structural=permit.authored?await validateFreshAuthoredPolicy(r.store,t,scope,permit,check):permit.placement?await validateFreshPlacementPolicy(r.store,t,scope,permit,check):permit.rename?await renamePolicy(r,f,t,scope,permit):permit.restore?await restorePolicy(r,f,t,scope,permit):permit.structural?await structuralPolicy(r,f,t,scope,permit):null,expectedInputs=structural?.inputs;
 const sources=new Set(structural?.sources);for(const id of permit.ids){
  check();const state=await t.get('inputStates',id);check();const index=await t.get('blockIndex',id);check();
  const expected=expectedInputs?.get(id)??permit.p.request.items.find(i=>i.descriptor.kind==='input'&&i.descriptor.entityId===id)?.descriptor;need(expected);
  need(state&&index&&data(state,'id')===id&&data(index,'id')===id&&data(state,'removalState')==='active'&&data(state,'sourcePurged',true)!==true&&data(index,'excluded')===false&&data(state,'contentRevision')===expected.revision&&(data(state,'lastRemovalSequence',true)??0)===expected.removalEpoch);
  const sourceIds=data(state,'sourceRecordIds');need(Array.isArray(sourceIds)&&sourceIds.length<=20&&equal([...sourceIds].sort(),expected.sourceRecordIds)&&equal([...data(index,'recordIds')].sort(),expected.sourceRecordIds));
  if(permit.qualified)need(scope.inputs.find(i=>i.inputId===id).revision===expected.revision);
  for(const source of sourceIds)sources.add(source);
 }
 need(sources.size<=20);if(permit.qualified)need(equal(scope.sources.map(s=>s.sourceRecordId).sort(),[...new Set(permit.ids.flatMap(id=>expectedInputs?.get(id)?.sourceRecordIds??permit.p.request.items.find(i=>i.descriptor.kind==='input'&&i.descriptor.entityId===id)?.descriptor.sourceRecordIds??[]))].sort()));
 for(const id of sources){check();const index=await t.get('recordIndex',id);check();need(index&&data(index,'id')===id);if(permit.structural){need(opaque(data(index,'sourceKey'))&&opaque(data(index,'dedupeKey')));need(await t.count('records',null,IDBKeyRange.only(id))===1);check();}for(const key of ['sourceKey','dedupeKey']){const value=data(index,key,true);if(value){need(typeof value==='string');const deleted=await t.get('tombstones',(key==='sourceKey'?'source:':'snapshot:')+value);check();need(!deleted);}}}
 check();
}
async function restorePolicy(r,f,t,scope,permit){
 const m=permit.restore,topic=m.kind==='topic',fields=topic?['name','summary']:['title'],check=()=>currentFamily(r,f),get=async(table,id)=>{check();const row=await t.get(table,id);check();return row;};
 need(topic?topicNameRestoreAllowsTopic(m):structuralSectionRestoreAllowsTopic(m));
 const parent=await get('topics',m.topicId);need(parent&&data(parent,'revision')===m.topicRevision&&data(parent,'organizationRevision')===m.topicOrganizationRevision&&data(parent,'activeLayoutGeneration')===m.layoutGeneration&&data(parent,'lifecycle')==='active'&&!data(parent,'redirectTo',true)&&!data(parent,'layoutJobId',true));
 const journal=await get('revisions',m.journalId);need(journal&&data(journal,'id')===m.journalId&&data(journal,'kind')===(topic?'topic':'section')&&data(journal,'entityId')===(topic?m.topicId:m.sectionId)&&data(journal,'operationId')===m.operationId&&data(journal,'actor')==='user'&&data(journal,'reason')==='restore'&&data(journal,'important')===true&&equal(data(journal,'fieldMask'),[topic?'name':'title'])&&data(journal,'afterRevision')===(topic?m.topicRevision:m.sectionRevision));
 const expected={inputs:scope.inputs,entries:m.entries.map(e=>({entryId:e.entryId,revision:e.revision,selectedFields:['body','title','note']})),structures:[{store:topic?'topics':'sections',recordId:m.recordId,revision:topic?m.topicRevision:m.sectionRevision,selectedFields:fields}],journals:[{journalId:m.journalId,entityKind:topic?'topic':'section',entityId:topic?m.topicId:m.sectionId,sequence:data(journal,'sequence'),baseRevision:data(journal,'baseRevision'),afterRevision:data(journal,'afterRevision'),selectedFields:fields.flatMap(field=>['before.'+field,'after.'+field])}]};
 // No extra mirrors, old Entries or parent-Topic siblings may be acquired by
 // the generic qualifier. Current Source originals/history remain local only.
 if(permit.qualified)for(const key of ['entries','structures','journals'])need(equal(scope[key],expected[key]));
 const result=await structuralPolicy(r,f,t,expected,permit);need(equal([...result.sources].sort(),m.sourceRecordIds));
 for(const e of m.entries){const p=await get('placements',e.placementId),input=await get('inputStates',e.inputId);need(p&&data(p,'revision')===e.placementRevision&&data(p,'entryId')===e.entryId&&data(p,'topicId')===m.topicId&&data(p,'layoutGeneration')===m.layoutGeneration&&data(p,'rank')===e.rank&&data(p,'sectionId')===(topic?e.sectionId:m.sectionId)&&data(p,'membershipAuthorship')==='user'&&data(p,'sectionProtection')===true&&data(p,'orderProtection')===true&&input&&data(input,'contentRevision')===e.inputRevision&&(data(input,'lastRemovalSequence',true)??0)===e.removalSequence);}
 check();return result;
}
async function renamePolicy(r,f,t,scope,permit){
 const m=permit.rename,topic=m.kind==='topic',fields=topic?['name','summary']:['title'],check=()=>currentFamily(r,f),get=async(table,id)=>{check();const row=await t.get(table,id);check();return row;};
 need(topic?topicContextAllowsTopic(m):structuralContextAllowsTopic(m));
 need(!topicNameRestoreAllowsTopic(m)&&!structuralSectionRestoreAllowsTopic(m));
 const parent=await get('topics',m.topicId);need(parent&&data(parent,'revision')===m.topicRevision&&data(parent,'organizationRevision')===m.topicOrganizationRevision&&data(parent,'activeLayoutGeneration')===m.layoutGeneration&&data(parent,'lifecycle')==='active'&&!data(parent,'redirectTo',true)&&!data(parent,'layoutJobId',true));
 const journal=await get('revisions',m.journalId);need(journal&&data(journal,'id')===m.journalId&&data(journal,'kind')===(topic?'topic':'section')&&data(journal,'entityId')===(topic?m.topicId:m.sectionId)&&data(journal,'operationId')===m.operationId&&data(journal,'actor')==='user'&&data(journal,'reason')==='rename'&&data(journal,'important')===true&&equal(data(journal,'fieldMask'),[topic?'name':'title'])&&data(journal,'afterRevision')===(topic?m.topicRevision:m.sectionRevision));
 const expected={inputs:scope.inputs,entries:m.entries.map(e=>({entryId:e.entryId,revision:e.revision,selectedFields:['body','title','note']})),structures:[{store:topic?'topics':'sections',recordId:m.recordId,revision:topic?m.topicRevision:m.sectionRevision,selectedFields:fields}],journals:[{journalId:m.journalId,entityKind:topic?'topic':'section',entityId:topic?m.topicId:m.sectionId,sequence:data(journal,'sequence'),baseRevision:data(journal,'baseRevision'),afterRevision:data(journal,'afterRevision'),selectedFields:fields.flatMap(field=>['before.'+field,'after.'+field])}]};
 // No extra mirrors, old Entries or parent-Topic siblings may be acquired by
 // the generic qualifier. Current Source originals/history remain local only.
 if(permit.qualified)for(const key of ['entries','structures','journals'])need(equal(scope[key],expected[key]));
 const result=await structuralPolicy(r,f,t,expected,permit);need(equal([...result.sources].sort(),m.sourceRecordIds));
 for(const e of m.entries){const p=await get('placements',e.placementId),input=await get('inputStates',e.inputId);need(p&&data(p,'revision')===e.placementRevision&&data(p,'entryId')===e.entryId&&data(p,'topicId')===m.topicId&&data(p,'layoutGeneration')===m.layoutGeneration&&data(p,'rank')===e.rank&&data(p,'sectionId')===(topic?e.sectionId:m.sectionId)&&data(p,'membershipAuthorship')==='user'&&data(p,'sectionProtection')===true&&data(p,'orderProtection')===true&&input&&data(input,'contentRevision')===e.inputRevision&&(data(input,'lastRemovalSequence',true)??0)===e.removalSequence);}
 check();return result;
}
// Exact original selector closure only. This is field qualification, not Topic
// identity authority. No label, sibling body or historical structure scan is
// inferred from a containing Topic. All reads below use the first selection ledger.
async function structuralPolicy(r,f,t,scope,permit){
 const entries=new Map(),structures=new Map(),journals=new Map(),history=new Set(),inputs=new Map(),topics=new Set(),sources=new Set(),check=()=>currentFamily(r,f);
 const get=async(table,id)=>{check();const row=await t.get(table,id);check();return row;};
 const addEntry=async id=>{if(entries.has(id))return;const row=await get('thoughts',id);need(row&&data(row,'id')===id&&data(row,'lifecycle')==='active');const sourceIds=data(row,'sourceRecordIds',true)||[];need(Array.isArray(sourceIds)&&sourceIds.length<=20&&sourceIds.every(opaque));if(data(row,'bodyBinding',true)==='input'){const inputId=data(row,'workingInputId');need(opaque(inputId));const state=await get('inputStates',inputId),index=await get('blockIndex',inputId);need(state&&index&&data(state,'id')===inputId&&data(index,'id')===inputId&&data(state,'removalState')==='active'&&data(state,'sourcePurged',true)!==true&&data(index,'excluded')===false&&data(state,'contentRevision')===data(row,'bindingRevision')&&equal([...data(state,'sourceRecordIds')].sort(),[...sourceIds].sort())&&equal([...data(index,'recordIds')].sort(),[...sourceIds].sort()));}for(const source of sourceIds)sources.add(source);need(sources.size<=20);entries.set(id,project(row,['id','revision','lifecycle','bodyBinding','workingInputId']));return row;};
 const fields={topic:['name','summary'],section:['title']};
 for(const {descriptor:d}of permit.p.request.items){
  need(Array.isArray(d.sourceRecordIds)&&d.sourceRecordIds.length<=20&&d.sourceRecordIds.every(opaque));for(const id of d.sourceRecordIds)sources.add(id);need(sources.size<=20);
  if(d.kind==='input'){inputs.set(d.entityId,d);continue;}
  if(d.kind==='library_entry'){
   const row=await addEntry(d.entityId);
   if(permit.p.freshAuthoredPrejob){
    // Only metadata precedes the separate local field grant. The original
    // authored mapper will still prove exact current snapshots afterwards.
    const revision=data(row,'revision'),empty=value=>Array.isArray(value)&&value.length===0;
    need(Number.isSafeInteger(d.revision)&&d.revision>=0&&Number.isSafeInteger(revision)&&revision>=d.revision&&data(row,'storageSchema')===2&&data(row,'origin')==='user'&&data(row,'provenanceType')==='user_created'&&data(row,'bodyBinding')==='thought'&&data(row,'formation')==='explicit'&&data(row,'freshness')==='current'&&data(row,'integrity')==='detached'&&data(row,'dependencyRevision')===0&&data(row,'hasHumanAction')===true&&empty(data(row,'sourceRecordIds'))&&empty(data(row,'inputRefs'))&&!['workingInputId','bindingRevision','bindingLength'].some(k=>Object.hasOwn(row,k)));
    const journal=await get('revisions',d.journalId);need(journal&&data(journal,'id')===d.journalId&&data(journal,'kind')==='library_entry'&&data(journal,'entityId')===d.entityId&&data(journal,'actor')==='user'&&data(journal,'afterRevision')===d.revision&&empty(data(journal,'sourceRecordIds')));
   }else need(entries.get(d.entityId).revision===d.revision);
   history.add(d.entityId);continue;
  }
  if(d.kind==='placement'){const row=await get('placements',d.recordId||d.entityId);need(row&&data(row,'id')===d.entityId&&data(row,'revision')===d.revision);await addEntry(data(row,'entryId'));history.add(data(row,'entryId'));topics.add(data(row,'topicId'));continue;}
  const table=d.kind==='topic'?'topics':'sections',row=await get(table,d.recordId||d.entityId);need(row&&data(row,'revision')===d.revision);
  const topicId=d.kind==='topic'?data(row,'id'):data(row,'topicId');topics.add(topicId);
  need(data(row,d.kind==='topic'?'id':'sectionId')===d.entityId);
  structures.set(data(row,'id'),{store:table,recordId:data(row,'id'),revision:data(row,'revision'),selectedFields:fields[d.kind]});
  const range=d.kind==='topic'?prefix([topicId,data(row,'activeLayoutGeneration'),0]):prefix([topicId,data(row,'layoutGeneration'),data(row,'sectionId'),0]),index=d.kind==='topic'?'byTopicOrder':'bySectionOrder';
  const count=await t.count('placements',index,range);check();need(Number.isSafeInteger(count)&&count>=1&&count<=Math.min(16,r.store.organizerBudget.limits.maxInputs));
  const members=await t.all('placements',index,range);check();need(members.length===count);
  for(const member of members){need(data(member,'lifecycle')==='active'&&data(member,'excludedByUser',true)!==true&&data(member,'topicId')===topicId);await addEntry(data(member,'entryId'));}
  const journal=await get('revisions',d.journalId);need(journal&&data(journal,'kind')===d.kind&&data(journal,'entityId')===d.entityId);journals.set(d.journalId,{row:project(journal,['id','kind','entityId','sequence','baseRevision','afterRevision']),fields:fields[d.kind]});
 }
 need(topics.size<=8&&entries.size<=Math.min(20,r.store.organizerBudget.limits.maxInputs));
 need(scope.entries.length===entries.size&&scope.entries.every(e=>{const row=entries.get(e.entryId);return row&&e.revision===data(row,'revision')&&equal(e.selectedFields,['body','title','note']);}));
 need(scope.structures.length===structures.size&&scope.structures.every(s=>equal(s,structures.get(s.recordId))));
 for(const id of history){const range=prefix(['library_entry:'+id]),count=await t.count('revisions','byList',range);check();need(Number.isSafeInteger(count)&&count<=4096);const rows=await t.all('revisions','byList',range);check();need(rows.length===count);for(const row of rows){need(data(row,'kind')==='library_entry'&&data(row,'entityId')===id);journals.set(data(row,'id'),{row:project(row,['id','kind','entityId','sequence','baseRevision','afterRevision']),fields:['body','title','note']});}}
 need(scope.journals.length===journals.size&&scope.journals.every(j=>{const selected=journals.get(j.journalId),row=selected?.row;return row&&j.entityKind===data(row,'kind')&&j.entityId===data(row,'entityId')&&j.sequence===data(row,'sequence')&&j.baseRevision===(data(row,'baseRevision',true)??null)&&j.afterRevision===(data(row,'afterRevision',true)??null)&&equal(j.selectedFields,selected.fields.flatMap(field=>['before.'+field,'after.'+field]));}));
 // Preliminary mapping grants only selected Entry/structure/history fields.
 // A later lifecycle qualification may add only their exact Input mirrors.
 const allowedInputs=new Set([...inputs.keys()]);for(const row of entries.values())if(data(row,'bodyBinding',true)==='input'){const id=data(row,'workingInputId');need(opaque(id));allowedInputs.add(id);}
 need(scope.inputs.every(i=>allowedInputs.has(i.inputId)));
 for(const id of permit.ids)if(!inputs.has(id)){const row=await get('inputStates',id);need(row);inputs.set(id,{revision:data(row,'contentRevision'),removalEpoch:data(row,'lastRemovalSequence',true)??0,sourceRecordIds:[...data(row,'sourceRecordIds')].sort()});}
 check();return {inputs,sources};
}

export function createMaintenanceSourceProcessing({store,consentOwner,caller,context}){
 need(store&&consentOwner&&caller&&Object.isFrozen(caller));
 const r={store,consentOwner,caller,context,processing:null,client:null,disposed:false,families:new Map()};
 const processing=Object.freeze({
  async resolve(transaction,scope,permit){
   need(!r.disposed);const original=originalScope(store,transaction),selected=originalPermit(r,original,scope,permit);let f=r.families.get(selected.selected.token);
   if(!f){
    need(r.families.size<8);const s=selected.selected,controller=new AbortController(),database=data(data(store,'repository'),'db');
    f={selection:s,database,controller,closed:false,pending:0,cap:null,capPromise:null,raws:new Map(),epoch:crypto.randomUUID(),expiresAt:s.firstDeadline,monoDeadline:s.monoDeadline,denial:null,listeners:[],timer:null,rejectStop:null};
    f.denial=createMaintenanceProcessingDenyCell({store,repository:data(store,'repository'),database,signals:[controller.signal,s.signal],wallDeadline:f.expiresAt,monoDeadline:f.monoDeadline});
    f.stopped=new Promise((_,reject)=>{f.rejectStop=reject;});f.stopped.catch(()=>{});
    const stop=()=>{try{fail('UNAVAILABLE');}catch(error){f.rejectStop(error);}releaseFamily(r,f);};
    const signals=[s.signal];for(const signal of signals){need(!aborted.call(signal));add.call(signal,'abort',stop,{once:true});f.listeners.push([signal,stop]);}
    f.timer=setTimeout(stop,Math.max(1,Math.ceil(Math.min(f.expiresAt-wall(),f.monoDeadline-mono()))));f.timer?.unref?.();r.families.set(s.token,f);
   }
   currentFamily(r,f);need(f.pending<8);f.pending++;
   const work=(async()=>{
    if(!f.capPromise)f.capPromise=(async()=>{const cap=await readMaintenanceProcessingConsent(consentOwner,store,original,{workBudget:f.selection.budget,signal:f.controller.signal});if(f.closed){releaseMaintenanceProcessingConsent(cap,consentOwner,store);fail('UNAVAILABLE');}f.cap=cap;const purpose=readMaintenanceProcessingConsentDenial(cap,consentOwner,store);f.expiresAt=Math.min(f.expiresAt,purpose.expiresAt);f.monoDeadline=Math.min(f.monoDeadline,purpose.monoDeadline);const stop=()=>releaseFamily(r,f);add.call(purpose.signal,'abort',stop,{once:true});f.listeners.push([purpose.signal,stop]);return cap;})();
    await f.capPromise;currentFamily(r,f);
    await assertMaintenanceProcessingConsentSnapshot(f.cap,consentOwner,store,original,{workBudget:f.selection.budget});currentFamily(r,f);
    await policy(r,f,original,scope,selected);currentFamily(r,f);
    if(selected.restore&&selected.p.phase==='child'){const parent=receipts.get(selected.p.parent);need(parent&&parent.r===r&&parent.f===f&&parent.restore===selected.restore&&selected.p.parent.scope.purpose==='ai-maintenance-payload');for(const key of ['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'])need(selected.p.parent.scope[key]===selected.p.binding[key]);currentFamily(r,f);}
    if(selected.rename&&selected.p.phase==='child'){const parent=receipts.get(selected.p.parent);need(parent&&parent.r===r&&parent.f===f&&parent.rename===selected.rename&&selected.p.parent.scope.purpose==='ai-maintenance-payload');for(const key of ['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'])need(selected.p.parent.scope[key]===selected.p.binding[key]);currentFamily(r,f);}
    if(selected.authored&&selected.p.phase==='child'){const parent=receipts.get(selected.p.parent);need(parent&&parent.r===r&&parent.f===f&&parent.authored===selected.authored&&selected.p.parent.scope.purpose==='ai-maintenance-payload');for(const key of ['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'])need(selected.p.parent.scope[key]===selected.p.binding[key]);currentFamily(r,f);}
    if(selected.placement&&selected.p.phase==='child'){const parent=receipts.get(selected.p.parent);need(parent&&parent.r===r&&parent.f===f&&parent.placement===selected.placement&&selected.p.parent.scope.purpose==='ai-maintenance-payload');for(const key of ['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'])need(selected.p.parent.scope[key]===selected.p.binding[key]);currentFamily(r,f);}
    const key=canonical(scope),prior=f.raws.get(key);if(prior){if(selected.authored)need(receipts.get(prior)?.authored===selected.authored);if(selected.placement)need(receipts.get(prior)?.placement===selected.placement);if(selected.rename)need(receipts.get(prior)?.rename===selected.rename);if(selected.restore)need(receipts.get(prior)?.restore===selected.restore);await assertMaintenanceProcessingConsentReceiptSnapshot(prior,store,original,f.selection.budget);currentFamily(r,f);return prior;}
    need(f.raws.size<8);if(selected.p.parent){const parent=receipts.get(selected.p.parent);need(parent&&parent.r===r&&parent.f===f);currentFamily(r,f);}
    const raw=Object.freeze({version:1,store,caller,scope,epoch:f.epoch,processing:true,expiresAt:f.expiresAt,revocationSignal:f.controller.signal});
    const purpose=readMaintenanceProcessingConsentDenial(f.cap,consentOwner,store),client=readMaintenanceServiceProcessingDenial(f.selection.lifecycleCap,f.selection.client,store);
    bindMaintenanceProcessingRawDenials(raw,store,[f.denial,f.selection.denial,purpose.cell,client]);bindMaintenanceProcessingConsentReceipt(raw,f.cap,consentOwner,store,{workBudget:f.selection.budget});
    await assertMaintenanceProcessingConsentReceiptSnapshot(raw,store,original,f.selection.budget);currentFamily(r,f);
    receipts.set(raw,{r,f,...(selected.restore?{restore:selected.restore}:{}),...(selected.rename?{rename:selected.rename}:{}),...(selected.authored?{authored:selected.authored}:{}),...(selected.placement?{placement:selected.placement}:{})});f.raws.set(key,raw);return raw;
   })();
   const settled=()=>{f.pending--;if(f.closed&&f.pending===0)r.families.delete(f.selection.token);};work.then(settled,settled);
   try{const raw=await Promise.race([work,f.stopped]);currentFamily(r,f);return raw;}catch(error){releaseFamily(r,f);throw error;}
  },
  isCurrent(raw,s){const held=receipts.get(raw);if(!held||held.r!==r||s!==store)return false;try{currentFamily(r,held.f);assertMaintenanceProcessingRawDenialFacts(raw,store);return true;}catch{return false;}}
 });r.processing=processing;issuers.set(processing,r);requireMaintenanceProcessingSelection(processing);return processing;
}
export function disposeMaintenanceSourceProcessing(processing,store){const r=issuers.get(processing);need(r&&r.store===store);r.disposed=true;for(const f of r.families.values())releaseFamily(r,f);}

// Original owner identity only; no grant, body or refresh is returned.
export function assertMaintenanceSourceProcessingOwner(processing,store,consentOwner,caller,context){const r=issuers.get(processing);need(r&&!r.disposed&&r.store===store&&r.consentOwner===consentOwner&&r.caller===caller&&r.context===context);return true;}
