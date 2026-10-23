import {readContextEditMapping} from './context-correction.js';
import {sourcePresent} from '../thought-source-presence.js';
import {assertMaintenanceProcessingConsentReceiptSnapshot} from '../../background/maintenance-processing-consent.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {readTopicExactReuseSelection,assertTopicExactReuseSelectionFacts,readTopicExactReuseMutation,assertTopicExactReuseOwnRow,releaseTopicExactReuseSelection} from '../topic-formation.js';
import {captureTopicExactReuseMetadata,topicExactReuseEntryMetadata} from '../topic-exact-reuse-metadata.js';
import {readPromotionQualifiedMutation,assertPromotionQualifiedOwnRow} from '../topic-promotion-commit.js';
import {captureMaintenanceProcessingReceipt,assertMaintenanceProcessingReceipt,assertMaintenanceProcessingReceiptFacts,assertMaintenanceProcessingReceiptCapturedFacts} from './maintenance-processing-receipt.js';
import {rootReadAuthority} from '../organizer/root-read.js';
import {createContextScopeWorkBudget,forkContextScopeWorkBudget,contextScopeTransactionReader,readContextScopeSourcePresence,assertContextScopeSourcePresenceFacts,assertContextScopeTransactionIdentity,assertContextScopeWorkBudgetCapturedFacts,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {prefix,idOK,revisionOK} from '../thought-model.js';
import {canonical,digest,equal,exact,fail,opaque} from './contracts.js';
const freeze=value=>{if(value&&typeof value==='object'){for(const x of Object.values(value))freeze(x);Object.freeze(value);}return value;};
const size=x=>new TextEncoder().encode(JSON.stringify(x)).length;
const signalAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const need=(x,code='UNAVAILABLE')=>{if(!x)fail(code);};
const ENTRY_FIELDS=['body','title','note'],capabilities=new WeakMap(),requestIdentities=new WeakMap(),qualificationReaders=new WeakMap(),requestPermits=new WeakMap();
const own=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row||{},key);need(!d||Object.hasOwn(d,'value'));return d?.value;};
// Positive metadata schemas only: future semantic properties never become
// free metadata, including properties nested in an otherwise known object.
// Descriptor reads reject accessors without invoking them.
const scalar=value=>{need(value===null||value===undefined||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value));return value;};
const list=(value,project=scalar)=>{need(Array.isArray(value));const length=own(value,'length');need(Number.isSafeInteger(length)&&length<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');return Array.from({length},(_,i)=>project(own(value,String(i))));};
const CONTENT_KEYS=['body','title','note','type','formation'],ORGANIZATION_KEYS=['topics','section','order'];
const named=(value,keys,project=scalar)=>{if(value===null||value===undefined)return value;need(typeof value==='object'&&!Array.isArray(value));return Object.fromEntries(keys.filter(k=>Object.hasOwn(value,k)).map(k=>[k,project(own(value,k),k)]));};
const edges=value=>{need(value&&typeof value==='object'&&!Array.isArray(value));const keys=Reflect.ownKeys(value);need(keys.length<=CONTEXT_TOPIC_SCOPE_LIMITS.refs&&keys.every(idOK),'BUDGET_EXCEEDED');return named(value,keys,v=>named(v,['actor','include','operationId','at','reason','revision']));};
function metadataValue(value,key){
 if(['sourceRecordIds','sourceIdentityTokens','fieldMask','selectedFields','roles','inputList','staleReasons','topics','types','listKey','included','excluded','topicIds'].includes(key))return list(value);
 if(key==='inputRefs')return list(value,v=>named(v,['inputBlockId','basedOnContentRevision']));
 if(key==='fieldRevisions')return named(value,CONTENT_KEYS);
 if(key==='fieldDigests')return named(value,['body','note','title']);
 if(key==='authorship')return named(value,[...CONTENT_KEYS,...ORGANIZATION_KEYS],v=>named(v,['actor','everHumanConfirmed','operationId','at']));
 if(key==='protections')return named(value,[...CONTENT_KEYS,...ORGANIZATION_KEYS],v=>named(v,['locked','reason','operationId','at']));
 if(key==='organizationIntents')return named(value,['version','included','excluded','edges','fixed','legacyProtected'],(v,k)=>k==='edges'?edges(v):k==='fixed'?named(v,['topicIds','actor','operationId','revision','at'],metadataValue):metadataValue(v,k));
 if(key==='actualVersion')return named(value,['inputRevision','projectionVersion','selectedFields','fieldDigests'],metadataValue);
 if(key==='generator')return named(value,['providerId','providerVersion','modelVersion','taskSchemaVersion','promptTemplateVersion','policyVersion']);
 if(key==='span')return named(value,['inputId','field','start','end','full']);
 return scalar(value);
}
const pick=(row,keys)=>named(row,keys,metadataValue);
const entryMetadata=row=>pick(row,['id','revision','contentRevision','bodyBinding','workingInputId','bindingRevision','bindingLength','lifecycle','sourceRecordIds','inputRefs']);
const inputMirrorMetadata=row=>({...entryMetadata(row),provenanceType:scalar(own(row,'provenanceType'))});
const journalMetadata=row=>pick(row,['id','kind','entityId','entityKey','documentId','sequence','baseRevision','afterRevision','operationId','fieldMask','actor','reason','important','sourceRecordIds']);
const structureMetadata=row=>pick(row,['id','topicId','sectionId','revision','organizationRevision','activeLayoutGeneration','layoutGeneration','lifecycle']);
const thoughtClosureMetadata=row=>pick(row,['id','storageSchema','family','type','formation','origin','revision','contentRevision','fieldRevisions','organizationRevision','dependencyRevision','createdAt','updatedAt','updatedSequence','createdSequence','hasHumanAction','userEdited','protections','authorship','organizationIntents','lifecycle','freshness','integrity','staleReasons','sourceRecordIds','inputRefs','exactSignature','topics','types','bodyBinding','provenanceType','workingInputId','bindingRevision','bindingLength','thoughtEditedAt','lifecycleKey','activeKey','listKey','negativeUpdatedSequence']);
const placementMetadata=row=>pick(row,['id','topicId','layoutGeneration','entryId','sectionId','rank','sectionRank','revision','activeKey','lifecycle','membershipAuthorship','sectionProtection','orderProtection','excludedByUser','removedWithTopicOperationId']);
const dependencyMetadata=row=>pick(row,['id','inputId','inputList','thoughtId','targetKind','targetId','eligibilityEpochAtUse','basedOnContentRevision','selectedFields','fieldDigests','validatedAgainstContentRevision','status','roles','sourceRecordIds','scopeToken','versionToken']);
const provenanceMetadata=row=>pick(row,['id','ownerKind','ownerId','generationId','inputId','basedOnContentRevision','actualVersion','role','contributionType','formation','generatedAt','generator','inputAuthorshipAtUse','entryFieldAuthorshipAtCommit','sourceRecordIds','sourceIdentityTokens','scopeToken','versionToken','availability','contributionKey','span']);
const sorted=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
const textFields={thoughts:['thoughtText','title','note'],topics:['name','nameKey','summary'],sections:['title'],blocks:['libraryText','note'],records:['originalText','note','editedText','chatTitle']};

// A separately granted, current-session local closure. It is never sent as
// model evidence and never adds coverage. Only unchanged source-free human
// siblings qualify without a separate historical-field grant.
async function localTopicClosure(t,seed,selectedInputs,selectedEntries){
 const topic=await t.get('topics',seed.topicId);need(topic&&topic.lifecycle==='active'&&!topic.redirectTo&&!topic.layoutJobId,'STALE_BASE');
 need(topic.revision===seed.topicRevision&&topic.organizationRevision===seed.topicOrganizationRevision&&topic.activeLayoutGeneration===seed.layoutGeneration,'STALE_BASE');
 const range=prefix([topic.id,topic.activeLayoutGeneration,0]),count=await t.count('placements','byTopicOrder',range);need(Number.isSafeInteger(count)&&count<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');
 const placements=sorted((await t.all('placements','byTopicOrder',range)).map(placementMetadata));need(placements.length===count&&placements.some(p=>p.id===seed.placementId&&p.entryId===seed.entryId&&p.revision===seed.placementRevision),'STALE_BASE');
 const entries=[],births=[],dependencies=[],provenance=[],added=[];
 for(const placement of placements){
  need(placement.lifecycle==='active'&&!placement.excludedByUser);const row=thoughtClosureMetadata(await t.get('thoughts',placement.entryId));need(row&&row.lifecycle==='active');
  if(row.id===seed.entryId)need(row.revision===seed.entryRevision,'STALE_BASE');
  const deps=sorted((await t.all('dependencies','byTarget',prefix(['entry',row.id]))).map(dependencyMetadata)),proofs=sorted((await t.all('provenance','byOwner',prefix(['entry',row.id]))).map(provenanceMetadata)),ids=new Set([...(row.inputRefs||[]).map(x=>x.inputBlockId),...deps.map(d=>d.inputId),...(row.bodyBinding==='input'?[row.workingInputId]:[])]);
  need([...ids].every(id=>selectedInputs.has(id))&&deps.every(d=>d.selectedFields?.every(field=>field==='body')));
  if(row.bodyBinding!=='input'&&!selectedEntries.has(row.id)){
   need(row.storageSchema===2&&row.origin==='user'&&row.provenanceType==='user_created'&&row.bodyBinding==='thought'&&row.hasHumanAction===true&&row.userEdited===true&&row.integrity==='detached'&&row.freshness==='current'&&row.staleReasons?.length===0&&row.inputRefs?.length===0&&row.sourceRecordIds?.length===0&&deps.length===0&&proofs.length===0&&row.dependencyRevision===0&&row.contentRevision===0&&row.formation==='explicit');
   const birth=journalMetadata(await t.edge('revisions','byList',prefix(['library_entry:'+row.id]),'next'));
   need(birth?.kind==='library_entry'&&birth.entityId===row.id&&birth.actor==='user'&&birth.reason==='baseline'&&birth.important===true&&birth.baseRevision===0&&birth.afterRevision===0&&birth.sourceRecordIds?.length===0&&idOK(birth.operationId));
   for(const field of ['body','title','note','type','formation'])need(row.fieldRevisions?.[field]===0&&row.authorship?.[field]?.actor==='user'&&row.authorship[field].everHumanConfirmed===true&&row.authorship[field].operationId===birth.operationId&&row.authorship[field].at===row.createdAt&&row.protections?.[field]?.locked===true&&row.protections[field].operationId===birth.operationId&&row.protections[field].reason==='user_created');
   births.push(journalMetadata(birth));added.push(row.id);
  }
  entries.push(row);dependencies.push(...deps);provenance.push(...proofs);
 }
 return {seed:structuredClone(seed),topic:structureMetadata(topic),placements,entries:sorted(entries),births:sorted(births),dependencies:sorted(dependencies),provenance:sorted(provenance),added:added.sort()};
}
async function assertLocalClosures(t,held){
 for(const [id,expected]of held.inputMirrors||[]){const entry=inputMirrorMetadata(await t.get('thoughts',id)),dependencies=sorted((await t.all('dependencies','byTarget',prefix(['entry',id]))).map(dependencyMetadata)),provenance=sorted((await t.all('provenance','byOwner',prefix(['entry',id]))).map(provenanceMetadata));need(equal({entry,dependencies,provenance},expected),'STALE_BASE');}
 for(const expected of held.localClosures.values())need(equal(await localTopicClosure(t,expected.seed,new Set(held.inputs.keys()),held.originalEntries),expected),'STALE_BASE');
}
// This closure is metadata only. Reading a canonical row is not permission to
// access its text or serialized before/after history. The original validators
// still run, unchanged, only after the exact independent receipt below.
async function metadataClosure(store,t,request,selection={}){
 const entries=new Map(),structures=new Map(),journals=new Map(),historyEntries=new Set(selection.historyEntryIds||[]),addEntry=async id=>{need(idOK(id));if(entries.has(id))return;const row=await t.get('thoughts',id);if(!row)return;const metadata=entryMetadata(row);need(metadata.id===id&&revisionOK(metadata.revision));entries.set(id,metadata);};
 for(const id of selection.entryIds||[])await addEntry(id);
 for(const selected of selection.structures||[]){const row=await t.get(selected.store,selected.recordId);need(row);structures.set(JSON.stringify([selected.store,row.id]),{table:selected.store,metadata:structureMetadata(row),selectedFields:[...selected.selectedFields]});}
 for(const {descriptor:d}of request.items){
  // Current human correction metadata selects original author references only.
  // Author bytes/history remain inaccessible until the separate scope grant.
  if(d.kind==='context_item'){const m=await readContextEditMapping(store,t,d,{qualifyAuthored:false});for(const id of [...(m?.authoredEntryIds||[]),...(m?.boundEntryIds||[])]){await addEntry(id);historyEntries.add(id);}if(m?.structuralSectionIds||m?.structuralTopicIds){const isTopic=!!m.structuralTopicIds,spec=m.provenance.evidence.find(e=>e[isTopic?'humanTopic':'humanSection'])[isTopic?'humanTopic':'humanSection'],table=isTopic?'topics':'sections',fields=isTopic?['name','summary']:['title'],row=await t.get(table,spec.recordId),j=await t.get('revisions',spec.journalId);if(row&&j){const metadata=journalMetadata(j);need(metadata.kind===(isTopic?'topic':'section')&&metadata.entityId===(isTopic?spec.topicId:spec.sectionId));structures.set(JSON.stringify([table,row.id]),{table,metadata:structureMetadata(row),selectedFields:fields});journals.set(j.id,{metadata,selectedFields:fields});for(const e of spec.entries)await addEntry(e.entryId);}}}
  if(d.kind==='library_entry'){await addEntry(d.entityId);historyEntries.add(d.entityId);}
  if(d.kind==='placement'){const row=await t.get('placements',d.recordId||d.entityId);if(row?.id===d.entityId&&idOK(row.entryId)){await addEntry(row.entryId);historyEntries.add(row.entryId);}}
  if(['topic','section'].includes(d.kind)){
   const table=d.kind==='topic'?'topics':'sections',row=await t.get(table,d.recordId||d.entityId);if(!row)continue;
   const fields=d.kind==='topic'?['name','summary']:['title'];
   structures.set(JSON.stringify([table,row.id]),{table,metadata:structureMetadata(row),selectedFields:fields});
   const range=d.kind==='topic'?prefix([row.id,row.activeLayoutGeneration,0]):prefix([row.topicId,row.layoutGeneration,row.sectionId,0]),index=d.kind==='topic'?'byTopicOrder':'bySectionOrder',count=await t.count('placements',index,range);
   need(Number.isSafeInteger(count)&&count>=0,'BUDGET_EXCEEDED');
   // The unchanged original structural validator rejects an oversized count
   // before reading any Entry. Do not grant or acquire a truncated subset.
   if(count<=Math.min(16,store.organizerBudget.limits.maxInputs))for(const p of await t.all('placements',index,range))if(p.lifecycle==='active'&&!p.excludedByUser)await addEntry(p.entryId);
   const j=await t.get('revisions',d.journalId);if(j){const metadata=journalMetadata(j);need(metadata.kind===d.kind&&metadata.entityId===d.entityId);journals.set(j.id,{metadata,selectedFields:fields});}
  }
 }
 // Only exact Topics already selected by an original mapping or authenticated
 // owner publication may contribute qualification-only Entry fields. Every
 // old dependency stays inside this child's independently selected Inputs.
 const selectedInputs=new Set(selection.inputIds||[]),selectedEntries=new Set(entries.keys()),localClosures=new Map(),topicIds=[...new Set(selection.topicIds||[])];
 // A current Input can already have an original complete mirror even when its
 // Entry has no pending semantic delta. Discover only that exact metadata link;
 // it contributes local qualification fields, never payload or ACK coverage.
 const inputMirrors=new Map();
 if(selection.inputMirrorInputs){need(Array.isArray(selection.inputMirrorInputs)&&selection.inputMirrorInputs.every(id=>selectedInputs.has(id)));
  for(const inputId of selection.inputMirrorInputs){const range=prefix([inputId,'entry']),count=await t.count('dependencies','byInputTarget',range);need(Number.isSafeInteger(count)&&count<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');
   for(const dependency of await t.all('dependencies','byInputTarget',range)){const d=dependencyMetadata(dependency);need(d.inputId===inputId&&d.targetKind==='entry');const e=thoughtClosureMetadata(await t.get('thoughts',d.targetId));if(!e||e.lifecycle!=='active'||e.bodyBinding!=='input'||e.provenanceType!=='input_original'||e.workingInputId!==inputId)continue;
    // Already selected Entries receive the same three independent fields below.
    // Their original mapping/Domain proof owns eligibility; do not add a second
    // mirror proof and rescan it for every field read.
    if(entries.has(e.id))continue;
    const deps=(await t.all('dependencies','byTarget',prefix(['entry',e.id]))).map(dependencyMetadata),proofs=(await t.all('provenance','byOwner',prefix(['entry',e.id]))).map(provenanceMetadata);
    need(deps.length&&deps.every(x=>selectedInputs.has(x.inputId)&&x.selectedFields?.every(f=>f==='body'))&&proofs.length&&proofs.every(x=>selectedInputs.has(x.inputId))&&proofs.some(x=>x.inputId===inputId&&x.role==='primary'&&x.contributionType==='exact_excerpt'&&x.span?.full===true&&x.span.field==='body'));
    await addEntry(e.id);selectedEntries.add(e.id);
    inputMirrors.set(e.id,{entry:inputMirrorMetadata(e),dependencies:sorted(deps),provenance:sorted(proofs)});
   }
  }
 }
 need(topicIds.length<=8,'BUDGET_EXCEEDED');
 for(const seed of selection.localTopicSeeds||[]){need(selectedEntries.has(seed.entryId)&&topicIds.includes(seed.topicId));if(localClosures.has(seed.topicId))continue;const topic=await t.get('topics',seed.topicId);need(topic);const range=prefix([topic.id,topic.activeLayoutGeneration,0]),count=await t.count('placements','byTopicOrder',range);need(count<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');let extra=false;for(const p of await t.all('placements','byTopicOrder',range)){const row=await t.get('thoughts',p.entryId);need(row);if(row.bodyBinding!=='input'&&!selectedEntries.has(row.id))extra=true;}if(!extra)continue;const closure=await localTopicClosure(t,seed,selectedInputs,selectedEntries);localClosures.set(seed.topicId,closure);for(const id of closure.added)await addEntry(id);}
 for(const topicId of topicIds){
  const topic=await t.get('topics',topicId);need(topic&&['active','dormant'].includes(topic.lifecycle)&&!topic.redirectTo&&!topic.layoutJobId);
  const range=prefix([topicId,topic.activeLayoutGeneration,0]),count=await t.count('placements','byTopicOrder',range);need(count<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');
  for(const placement of await t.all('placements','byTopicOrder',range)){
   need(placement.lifecycle==='active'&&!placement.excludedByUser);const entry=await t.get('thoughts',placement.entryId);need(entry&&entry.lifecycle==='active');
   const dependencies=await t.all('dependencies','byTarget',prefix(['entry',entry.id])),ids=new Set([...(entry.inputRefs||[]).map(x=>x.inputBlockId),...dependencies.map(d=>d.inputId),...(entry.bodyBinding==='input'?[entry.workingInputId]:[])]);
   need([...ids].every(id=>selectedInputs.has(id))&&dependencies.every(d=>d.selectedFields?.every(field=>field==='body')));
   need(entry.bodyBinding==='input'||selectedEntries.has(entry.id)||localClosures.get(topicId)?.added.includes(entry.id));await addEntry(entry.id);
  }
 }
 for(const id of historyEntries){
  need(entries.has(id));
  const entityKey='library_entry:'+id,count=await t.count('revisions','byList',prefix([entityKey]));need(Number.isSafeInteger(count)&&count<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');
  for(const row of await t.all('revisions','byList',prefix([entityKey]))){const metadata=journalMetadata(row);need(metadata.kind==='library_entry'&&metadata.entityId===id&&metadata.entityKey===entityKey&&revisionOK(metadata.sequence));journals.set(row.id,{metadata,selectedFields:ENTRY_FIELDS});}
 }
 const inputs=new Map(),sources=new Set();for(const id of selection.inputIds||[]){need(idOK(id)&&!inputs.has(id));const state=await t.get('inputStates',id);need(state?.id===id&&state.removalState==='active'&&!state.sourcePurged);inputs.set(id,pick(state,['id','contentRevision','lastRemovalSequence','sourceRecordIds','removalState','sourcePurged']));for(const source of state.sourceRecordIds||[])sources.add(source);}
 need(inputs.size<=20&&sources.size<=128,'BUDGET_EXCEEDED');
 for(const mirror of inputMirrors.values())need([...mirror.entry.sourceRecordIds,...mirror.dependencies.flatMap(x=>x.sourceRecordIds||[]),...mirror.provenance.flatMap(x=>x.sourceRecordIds||[])].every(id=>sources.has(id))); 
 const scope={inputs:[...inputs].map(([inputId,m])=>({inputId,revision:m.contentRevision,selectedFields:['body','note']})),sources:[...sources].sort().map(sourceRecordId=>({sourceRecordId,selectedFields:['originalText']})),entries:[...entries.values()].map(x=>({entryId:x.id,revision:x.revision,selectedFields:[...ENTRY_FIELDS]})).sort((a,b)=>a.entryId.localeCompare(b.entryId)),structures:[...structures.values()].map(x=>({store:x.table,recordId:x.metadata.id,revision:x.metadata.revision,selectedFields:x.selectedFields})).sort((a,b)=>a.recordId.localeCompare(b.recordId)),journals:[...journals.values()].map(({metadata:m,selectedFields})=>({journalId:m.id,entityKind:m.kind,entityId:m.entityId,sequence:m.sequence,baseRevision:m.baseRevision??null,afterRevision:m.afterRevision??null,selectedFields:selectedFields.flatMap(f=>['before.'+f,'after.'+f])})).sort((a,b)=>a.journalId.localeCompare(b.journalId))};
 if(inputMirrors.size)scope.inputMirrorQualifications=[...inputMirrors.values()].sort((a,b)=>a.entry.id.localeCompare(b.entry.id));
 if(localClosures.size)scope.localQualificationTopics=[...localClosures.values()].map(c=>({seed:c.seed,topic:c.topic,placements:c.placements,entries:c.entries.map(entryMetadata),births:c.births,dependencies:c.dependencies,provenance:c.provenance,additionalEntryIds:c.added}));
 need(size(scope)<=32768,'BUDGET_EXCEEDED');return {scope,entries,structures,journals,inputs,sources,localClosures,inputMirrors,originalEntries:selectedEntries};
}
function scopeData(value){
 let bytes=0,keys=0;const seen=new WeakSet(),encoder=new TextEncoder(),charge=n=>{bytes+=n;need(bytes<=32768,'BUDGET_EXCEEDED');};
 const walk=(x,depth)=>{need(depth<=16);if(x===null||typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x)){charge(24);return x;}if(typeof x==='string'){charge(encoder.encode(JSON.stringify(x)).length);return x;}need(x&&typeof x==='object'&&!seen.has(x));seen.add(x);const array=Array.isArray(x);need(array||[Object.prototype,null].includes(Object.getPrototypeOf(x)));const names=Reflect.ownKeys(x);need(names.every(k=>typeof k==='string')&&(keys+=names.length)<=4096);charge(2+names.length);const out=array?[]:{};for(const key of names){const d=Object.getOwnPropertyDescriptor(x,key);need(d&&Object.hasOwn(d,'value'));if(array&&key==='length')continue;need(d.enumerable);charge(encoder.encode(JSON.stringify(key)).length);out[key]=walk(d.value,depth+1);}if(array)need(out.length===Object.getOwnPropertyDescriptor(x,'length').value);return out;};return walk(value,0);
}
function textGuard(object,fields,allowed,current){
 if(!object||typeof object!=='object')return object;
 object=Object.defineProperties({},Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(object)).map(([key,d])=>[key,{...d,configurable:true}])));
 for(const field of fields){const d=Object.getOwnPropertyDescriptor(object,field);if(!d)continue;
  Object.defineProperty(object,field,{enumerable:d.enumerable,configurable:true,get(){current();need(allowed(field));const value=Object.hasOwn(d,'value')?d.value:d.get?.call(object);current();return value;}});
 }return object;
}
// Strict identity consumers have a separately granted label universe. Keep
// only the original identity metadata schema; unknown semantic objects cannot
// be acquired by identityMetadata() or the original Source sanitizer clone.
function strictTopicIdentityRow(row){
 const projected=pick(row,['id','revision','organizationRevision','activeLayoutGeneration','defaultSectionId','lifecycle','redirectTo','layoutJobId','sourceRecordIds','createdAt','createdBy','updatedAt','pinKey','pinRank']);
 if(Object.hasOwn(row,'protections'))projected.protections=named(own(row,'protections'),['name','title','keep','lifecycle','organization'],v=>named(v,['locked','reason','operationId','at']));
 if(Object.hasOwn(row,'identity')){
  const identity=own(row,'identity');need(identity&&typeof identity==='object'&&!Array.isArray(identity));need(own(identity,'scope')===null);
  projected.identity=named(identity,['version','revision','origin','scope','legacy','noRecreation','nameToken','aliases','lifecycleIntent'],(value,key)=>key==='aliases'?list(value,v=>named(v,['token','actor','revision','operationId','at'])):key==='lifecycleIntent'?named(value,['actor','operationId','at','previous','to']):scalar(value));
 }
 for(const field of ['name','nameKey']){const descriptor=Object.getOwnPropertyDescriptor(row,field);if(descriptor)Object.defineProperty(projected,field,{...descriptor,configurable:true});}
 return projected;
}
// The original Promotion writer alone can attest a same-transaction metadata
// advance. Its pre-put before must match this held grant, and its unchanged
// semantic data must still match the actual row before any text getter runs.
function ownMetadata(t,table,row,expected,project,fields,{ownMutation,store,qualification},current){
 current();const actual=project(row),publication=ownMutation===null||ownMutation===undefined?null:readPromotionQualifiedMutation(ownMutation,store,t,qualification),intent=publication?.rows.find(x=>x.table===table&&x.key===own(row,'id'));
 if(!intent){need(equal(actual,expected),'STALE_BASE');return false;}
 need(equal(project(intent.before),expected)&&equal(project(intent.after),actual),'STALE_BASE');
 // The issuer may run code. Recheck the complete row projection and all
 // selected data descriptors together after the last callback, without
 // calling an issuer between fields or acquiring any semantic getter.
 current();need(equal(project(row),project(intent.after)),'STALE_BASE');
 for(const field of fields){const a=Object.getOwnPropertyDescriptor(intent.before,field),b=Object.getOwnPropertyDescriptor(intent.after,field),c=Object.getOwnPropertyDescriptor(row,field);need((!a&&!b&&!c)||(a&&b&&c&&Object.hasOwn(a,'value')&&Object.hasOwn(b,'value')&&Object.hasOwn(c,'value')&&Object.is(a.value,b.value)&&Object.is(b.value,c.value)),'STALE_BASE');}
 assertPromotionQualifiedOwnRow(ownMutation,store,t,qualification,table,row);return true;
}
const exactQualifiedRows=new WeakMap();
function originalExactRow(row,qualification){const proof=exactQualifiedRows.get(row);if(!proof)return row;need(proof.qualification===qualification);const descriptors=Object.getOwnPropertyDescriptors(row),keys=Reflect.ownKeys(descriptors);need(keys.length===Reflect.ownKeys(proof.descriptors).length);for(const key of keys){const a=descriptors[key],b=proof.descriptors[key];need(b&&['value','get','set','writable','enumerable','configurable'].every(field=>Object.hasOwn(a,field)===Object.hasOwn(b,field)&&Object.is(a[field],b[field])));}return proof.original;}
function exactReuseMetadata(t,row,held,current,{ownMutation,store,qualification}){
 const expected=held.exactReuse.entries.find(x=>x.id===own(row,'id'));if(!expected)return false;
 current();const actual=topicExactReuseEntryMetadata(row);
 const publication=ownMutation===null?null:readTopicExactReuseMutation(ownMutation,store,t,qualification),intent=publication?.rows.find(x=>x.key===actual.id);
 if(!intent){need(equal(actual,expected),'STALE_BASE');return false;}
 need(equal(topicExactReuseEntryMetadata(intent.before),expected)&&equal(topicExactReuseEntryMetadata(intent.after),actual),'STALE_BASE');
 current();assertTopicExactReuseOwnRow(ownMutation,store,t,qualification,row);return true;
}
function qualifiedReader(t,held,current,{topicLabels=false,strictTopicIdentity=false,metadataReader=t,ownMutation=null,store,qualification,purposeSnapshot=null}={}){
 const context={ownMutation,store,qualification};
 const wrap=(table,row)=>{current();if(!row)return row;if(table==='thoughts'&&held.exactReuse)row=originalExactRow(row,qualification);const original=row;let fieldCurrent=current;const isExact=table==='thoughts'&&held.exactReuse?.entries.some(x=>x.id===own(original,'id'));const mutationCurrent=()=>{current();if(isExact)assertTopicExactReuseOwnRow(ownMutation,store,t,qualification,original);else assertPromotionQualifiedOwnRow(ownMutation,store,t,qualification,table,original);};if(strictTopicIdentity&&table==='topics')row=strictTopicIdentityRow(row);
  if(table==='thoughts'){const expected=held.entries.get(row.id);if(expected&&(isExact?exactReuseMetadata(t,original,held,current,context):ownMetadata(t,table,original,expected,entryMetadata,textFields.thoughts,context,current)))fieldCurrent=mutationCurrent;row=textGuard(row,textFields.thoughts,()=>!!expected,fieldCurrent);}
  else if((table==='topics'||table==='sections')&&!topicLabels){const expected=held.structures.get(JSON.stringify([table,row.id]));if(expected&&ownMetadata(t,table,original,expected.metadata,structureMetadata,expected.selectedFields.flatMap(f=>f==='name'?['name','nameKey']:[f]),context,current))fieldCurrent=mutationCurrent;row=textGuard(row,textFields[table],field=>!!expected&&expected.selectedFields.includes(field==='nameKey'?'name':field),fieldCurrent);}
  else if(table==='revisions'){const expected=held.journals.get(row.id);if(expected)need(equal(journalMetadata(row),expected.metadata),'STALE_BASE');row={...row};for(const side of ['before','after'])row[side]=textGuard(row[side],['body','title','note','name','nameKey','summary'],field=>!!expected&&expected.selectedFields.includes(field==='nameKey'?'name':field),current);}
  else if(table==='blocks'||table==='records'){const selected=table==='blocks'?held.inputs.has(row.id):held.sources.has(row.id);row={...row,value:textGuard(row.value,textFields[table],field=>selected&&(table==='blocks'?['libraryText','note'].includes(field):field==='originalText'),current)};}
  else if(table==='inputStates'&&held.inputs.has(row.id))need(equal(pick(row,['id','contentRevision','lastRemovalSequence','sourceRecordIds','removalState','sourcePurged']),held.inputs.get(row.id)),'STALE_BASE');
  fieldCurrent();if(isExact)exactQualifiedRows.set(row,{qualification,original,descriptors:Object.getOwnPropertyDescriptors(row)});return row;
 };
 const before=async()=>{current();if(purposeSnapshot)await purposeSnapshot();current();};
 const checked=async table=>{current();if(['thoughts','blocks','records','revisions'].includes(table))await assertLocalClosures(metadataReader,held);current();};
 const reader=Object.create(t);reader.get=async(...args)=>{await before();const row=await t.get(...args);await checked(args[0]);return wrap(args[0],row);};reader.edge=async(...args)=>{await before();const row=await t.edge(...args);await checked(args[0]);return wrap(args[0],row);};
 reader.all=async(...args)=>{await before();const rows=await t.all(...args);await checked(args[0]);return rows.map(row=>wrap(args[0],row));};for(const method of ['rangePage','page','primaryRangePage','indexPrimaryPage'])reader[method]=async(...args)=>{await before();const page=await t[method](...args);await checked(args[0]);for(const row of page.rows)row.value=wrap(args[0],row.value);return page;};
 return reader;
}
// Mint outside a transaction. The digest binds the complete original metadata
// batch; later qualifications may select only exact captured items and units.
export async function prepareMaintenanceQualificationRequest(request,{workBudget=null}={}){
 need(Array.isArray(request?.items)&&request.items.length<=100&&Array.isArray(request.coverage)&&request.coverage.length<=100);
 const value=structuredClone({items:request.items,coverage:request.coverage}),encoded=canonical(value);
 if(workBudget){const bytes=new TextEncoder().encode(encoded).length;need(workBudget.hashBytes+bytes<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes&&workBudget.hashFields+1<=CONTEXT_TOPIC_SCOPE_LIMITS.hashFields,'BUDGET_EXCEEDED');workBudget.hashBytes+=bytes;workBudget.hashFields++;}
 const fingerprint=await digest(value),token=Object.freeze({});requestIdentities.set(token,{fingerprint,items:value.items.map(canonical),coverage:value.coverage.map(canonical)});return token;
}
function requestFingerprint(request,identity){
 if(identity===null)return canonical({items:request.items,coverage:request.coverage});
 const held=requestIdentities.get(identity);need(held);
 const indexes=(values,original)=>{const out=values.map(x=>original.indexOf(canonical(x)));need(out.every(x=>x>=0)&&new Set(out).size===out.length,'STALE_BASE');return out.sort((a,b)=>a-b);};
 return canonical({batch:held.fingerprint,items:indexes(request.items,held.items),coverage:indexes(request.coverage,held.coverage)});
}
const qualificationReaderParent=Object.getPrototypeOf,qualificationReaderDescriptor=Object.getOwnPropertyDescriptor;
function qualificationOriginalScope(store,transaction){assertContextScopeTransactionIdentity(transaction,store);const repository=own(store,'repository');let t=transaction;for(let depth=0;t&&depth<16;depth++,t=qualificationReaderParent(t)){try{requireRepositoryTransactionScope(repository,t);return t;}catch{}}need(false);}
export function readMaintenanceQualificationRequestPermit(permit,store,transaction,processing){
 const r=requestPermits.get(permit);if(!r)return null;
 need(r.store===store&&r.processing.resolve===processing?.resolve&&r.processing.isCurrent===processing?.isCurrent);
 need(qualificationOriginalScope(store,transaction)===qualificationOriginalScope(store,r.transaction));
 return Object.freeze({...r});
}
export async function createMaintenanceQualification(store,transaction,request,options={}){return createQualification(store,transaction,request,options);}
async function createQualification(store,transaction,request,{processing,caller,binding,isCurrent,signal=null,selection={},phase='prejob',parent=null,workBudget=null,requestIdentity=null,processingPermit=null}={},acquisition=null){
 need(typeof isCurrent==='function');const database=store.repository.db,check=()=>{need(store.repository.db===database&&!signal?.aborted&&isCurrent()===true);};check();
 need(typeof processing?.resolve==='function'&&typeof processing?.isCurrent==='function');
 const budget=workBudget??createContextScopeWorkBudget({database,signal});need(budget.database===database);const t=acquisition?acquisition.reader(transaction,budget):contextScopeTransactionReader(store,transaction,budget),authority=await rootReadAuthority(t),restore=(await t.get('meta','recovery-restore-epoch'))?.value??'initial',held=await metadataClosure(store,t,request,selection);
 const scope=freeze({purpose:'ai-maintenance-qualification',phase,binding:structuredClone(binding),batchFingerprint:requestFingerprint(request,requestIdentity),restoreEpoch:restore,rootAuthority:authority,...held.scope});need(size(scope)<=32768,'BUDGET_EXCEEDED');check();
 let permit=null;if(processingPermit!==null){permit=Object.freeze({});requestPermits.set(permit,{selectorPermit:processingPermit,store,transaction,processing,scope,request,selectionSpec:selection,phase,binding,parent,budget});}
 const raw=await (acquisition?acquisition.resolve(processing,t,scope,budget):processing.resolve(t,scope,permit));acquisition?.check();check();exact(raw,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal']);
 need(Reflect.ownKeys(raw).every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(raw,k),'value'))&&raw.version===1&&raw.store===store&&raw.caller===caller&&Object.isFrozen(caller)&&opaque(raw.epoch)&&raw.processing===true&&Number.isSafeInteger(raw.expiresAt)&&raw.expiresAt>Date.now()&&raw.revocationSignal instanceof AbortSignal&&!raw.revocationSignal.aborted&&equal(scopeData(raw.scope),scope));
 if(parent){assertMaintenanceProcessingReceipt(parent,processing,store);need(parent.store===store&&parent.caller===caller&&parent.epoch===raw.epoch&&parent.revocationSignal===raw.revocationSignal&&parent.expiresAt>=raw.expiresAt);}
 const receipt=captureMaintenanceProcessingReceipt(raw,{processing,store,caller,scope}),record={store,repository:store.repository,database,requestSignal:signal,held,receipt,workBudget:budget,released:false,current:null};
 record.current=()=>{check();need(!record.released);assertMaintenanceProcessingReceipt(receipt,processing,store);};record.current();need(await rootReadAuthority(t)===authority,'STALE_BASE');record.current();
 const token=Object.freeze({});capabilities.set(token,record);return token;
}
function qualified(token,store){const record=capabilities.get(token);need(record&&record.store===store&&record.database===store.repository.db);record.current();return record;}
export function assertMaintenanceQualification(token,store=null){const r=capabilities.get(token);need(r);qualified(token,store??r.store);return true;}
// Only the originally captured facts, with no host/issuer callback. A caller
// must first perform the normal active qualification/identity checks.
export function assertMaintenanceQualificationFacts(token,store=null){const r=capabilities.get(token);need(r&&!r.released&&(store===null||r.store===store)&&r.store.repository===r.repository&&r.repository.db===r.database&&(r.requestSignal===null||r.requestSignal instanceof AbortSignal&&!signalAborted.call(r.requestSignal)));assertMaintenanceProcessingReceiptFacts(r.receipt,r.store);for(const component of r.components||[])assertMaintenanceQualificationFacts(component,r.store);if(r.exactSelection)assertTopicExactReuseSelectionFacts(r.exactSelection,r.store,r.baseQualification);return true;}
// Post-current closing facts for the supported source-presence qualification.
// Independent exact-reuse remains outside this Input-only source operation.
export function assertMaintenanceQualificationCapturedFacts(token,store=null){
 const r=capabilities.get(token);need(r&&!r.released&&(store===null||store===r.store)&&!r.exactSelection);
 need(own(r.store,'repository')===r.repository&&own(r.repository,'db')===r.database&&(r.requestSignal===null||r.requestSignal instanceof AbortSignal&&!signalAborted.call(r.requestSignal)));
 assertMaintenanceProcessingReceiptCapturedFacts(r.receipt,r.store);for(const component of r.components||[])assertMaintenanceQualificationCapturedFacts(component,r.store);need(!r.released);return true;
}
export function maintenanceQualificationReceipt(token,store){return qualified(token,store).receipt;}
export function maintenanceQualificationReader(token,store,t,{account=true,...options}={}){
 const r=qualified(token,store);need(r.workBudget.reads<CONTEXT_TOPIC_SCOPE_LIMITS.reads&&r.workBudget.hashBytes<CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes&&r.workBudget.hashFields<CONTEXT_TOPIC_SCOPE_LIMITS.hashFields,'BUDGET_EXCEEDED');
 // Metadata closure checks use the same ledger even when the outer original
 // owner accounts its own point read. Reuse only this exact branded reader's
 // underlying metadata facade, preventing recursive qualification wrappers.
 let ancestor=t,metadataReader=null;for(let depth=0;ancestor&&depth<16;depth++,ancestor=Object.getPrototypeOf(ancestor)){const held=qualificationReaders.get(ancestor);if(held?.record===r){metadataReader=held.metadataReader;break;}}
 metadataReader??=contextScopeTransactionReader(store,t,r.workBudget);const reader=qualifiedReader(account?contextScopeTransactionReader(store,t,r.workBudget):t,r.held,r.current,{...options,metadataReader,store,qualification:token,purposeSnapshot:()=>assertMaintenanceProcessingConsentReceiptSnapshot(r.receipt,store,t,r.workBudget)});qualificationReaders.set(reader,{record:r,token,metadataReader,transaction:t,parent:qualificationReaderParent(reader),failed:false,get:Object.getOwnPropertyDescriptor(reader,'get'),identityMethods:Object.fromEntries(['get','has'].map(k=>[k,qualificationReaderDescriptor(reader,k)]))});return reader;
}
// Fixed identity-only counterpart for the original private context-reader chain.
export function assertMaintenanceQualificationTransactionIdentity(reader,store,depth=0){
 need(Number.isSafeInteger(depth)&&depth>=0&&depth<16);const held=qualificationReaders.get(reader);
 if(held){
  need(held.record.store===store);if(held.failed)need(false);
  try{
   const r=held.record;need(!r.released&&own(store,'repository')===r.repository&&own(r.repository,'db')===r.database&&qualificationReaderParent(reader)===held.parent);
   for(const [key,old]of Object.entries(held.identityMethods)){const v=qualificationReaderDescriptor(reader,key);need(old===undefined?v===undefined:!!v&&Object.hasOwn(v,'value')&&v.value===old.value&&v.writable===old.writable&&v.enumerable===old.enumerable&&v.configurable===old.configurable);}
   assertContextScopeTransactionIdentity(held.parent,store,depth+1);assertMaintenanceQualificationCapturedFacts(held.token,store);return true;
  }catch(error){held.failed=true;throw error;}
 }
 const repository=own(store,'repository'),database=own(repository,'db'),identity=requireRepositoryTransactionScope(repository,reader);
 need(identity.database===database);requireRepositoryTransactionDataMethods(repository,reader);need(own(store,'repository')===repository&&own(repository,'db')===database);return true;
}
// Exact original qualified reader only. Neither this operation nor the
// context reader producer exposes its underlying transaction or private ledger.
function sourcePresenceReader(reader,store){
 const held=qualificationReaders.get(reader);need(held&&held.record.store===store&&!held.failed);
 try{const d=Object.getOwnPropertyDescriptor(reader,'get'),old=held.get;need(d&&Object.hasOwn(d,'value')&&d.value===old.value&&d.enumerable===old.enumerable&&d.writable===old.writable&&d.configurable===old.configurable);return held;}catch(error){held.failed=true;throw error;}
}
export async function readMaintenanceQualifiedSourcePresence(reader,store,ids){
 const held=sourcePresenceReader(reader,store),selected=list(ids);need(selected.every(id=>held.record.held.sources.has(id)));
 try{const result=await readContextScopeSourcePresence(held.transaction,store,selected,held.token,held.record.workBudget);sourcePresenceReader(reader,store);assertContextScopeSourcePresenceFacts(held.transaction,store,held.token,held.record.workBudget);return result;}catch(error){held.failed=true;throw error;}
}
// Invoked by the original private context-reader chain. Unknown wrappers never
// pass the native scope brand, and a real reader for another cap cannot replace it.
export async function readMaintenanceQualificationSourcePresenceAtTransaction(token,store,transaction,ids,workBudget,depth=0){
 need(Number.isSafeInteger(depth)&&depth>=0&&depth<16);const r=capabilities.get(token);need(r&&r.store===store&&r.workBudget===workBudget);
 if(qualificationReaders.has(transaction)){const held=sourcePresenceReader(transaction,store);need(held.record===r);try{const result=await readContextScopeSourcePresence(held.transaction,store,ids,token,workBudget,depth+1);sourcePresenceReader(transaction,store);assertContextScopeSourcePresenceFacts(held.transaction,store,token,workBudget,depth+1);return result;}catch(error){held.failed=true;throw error;}}
 const scope=transaction,identity=requireRepositoryTransactionScope(r.repository,scope),selected=list(ids);need(identity.database===r.database&&selected.every(id=>r.held.sources.has(id)));
 const binding=()=>{need(!r.released&&own(store,'repository')===r.repository&&own(r.repository,'db')===r.database&&requireRepositoryTransactionScope(r.repository,scope)===identity);requireRepositoryTransactionDataMethods(r.repository,scope);};
 const check=()=>{binding();r.current();binding();assertMaintenanceProcessingReceiptFacts(r.receipt,store);binding();};check();
 await assertMaintenanceProcessingConsentReceiptSnapshot(r.receipt,store,scope,r.workBudget);check();
 const metadata=contextScopeTransactionReader(store,scope,r.workBudget),indexed=new Set(),tombstones=new Set();
 const facade=Object.freeze({get:async(table,key)=>{check();let value;
  if(table==='recordIndex'){need(selected.includes(key));const row=await metadata.get(table,key);if(row){const sourceKey=own(row,'sourceKey'),dedupeKey=own(row,'dedupeKey');need(typeof sourceKey==='string'&&typeof dedupeKey==='string');indexed.add(key);tombstones.add('source:'+sourceKey);tombstones.add('snapshot:'+dedupeKey);value=Object.freeze({sourceKey,dedupeKey});}}
  else if(table==='records'){need(indexed.has(key));value=await metadata.has(table,key)?Object.freeze({id:key}):undefined;}
  else if(table==='tombstones'){need(tombstones.has(key));value=await metadata.get(table,key);}
  else fail('UNAVAILABLE');check();return value;}});
 const present=await sourcePresent(facade,selected);check();assertMaintenanceQualificationSourcePresenceAtTransactionFacts(token,store,scope,workBudget,depth);return present;
}
export function assertMaintenanceQualificationSourcePresenceAtTransactionFacts(token,store,transaction,workBudget,depth=0){
 need(Number.isSafeInteger(depth)&&depth>=0&&depth<16);const r=capabilities.get(token);need(r&&r.store===store&&r.workBudget===workBudget);
 if(qualificationReaders.has(transaction)){const held=qualificationReaders.get(transaction);need(held.record===r);try{sourcePresenceReader(transaction,store);assertMaintenanceQualificationCapturedFacts(token,store);return assertContextScopeSourcePresenceFacts(held.transaction,store,token,workBudget,depth+1);}catch(error){held.failed=true;throw error;}}
 assertMaintenanceQualificationCapturedFacts(token,store);need(own(store,'repository')===r.repository&&own(r.repository,'db')===r.database);const identity=requireRepositoryTransactionScope(r.repository,transaction);need(identity.database===r.database);requireRepositoryTransactionDataMethods(r.repository,transaction);assertContextScopeWorkBudgetCapturedFacts(workBudget,{database:r.database});assertMaintenanceQualificationCapturedFacts(token,store);return true;
}
export function maintenanceQualificationWorkBudget(token,store){return qualified(token,store).workBudget;}
export function chargeMaintenanceQualificationHash(token,store,text){const r=qualified(token,store);need(typeof text==='string');const bytes=new TextEncoder().encode(text).length;need(r.workBudget.hashBytes+bytes<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes&&r.workBudget.hashFields+1<=CONTEXT_TOPIC_SCOPE_LIMITS.hashFields,'BUDGET_EXCEEDED');r.workBudget.hashBytes+=bytes;r.workBudget.hashFields++;r.current();return true;}
// Original owner final facts only. This reads precisely the independently
// qualified fields through the same currentness/byte-accounted reader. The
// caller supplies its existing aggregate retention budget, never a new one.
export async function maintenanceQualificationFacts(token,store,transaction,retain){
 need(typeof retain==='function');const r=qualified(token,store),t=maintenanceQualificationReader(token,store,transaction),facts=[];
 const add=value=>facts.push(retain(value));
 await assertLocalClosures(contextScopeTransactionReader(store,transaction,r.workBudget),r.held);for(const closure of r.held.localClosures.values())add({localQualificationTopic:closure});for(const mirror of r.held.inputMirrors.values())add({inputMirrorQualification:mirror});
 for(const selected of qualificationScopes(r).flatMap(x=>x.entries)){const row=await t.get('thoughts',selected.entryId);need(row);add({table:'thoughts',id:selected.entryId,metadata:entryMetadata(row),fields:Object.fromEntries(selected.selectedFields.map(field=>[field,row[field==='body'?'thoughtText':field]]))});}
 for(const selected of qualificationScopes(r).flatMap(x=>x.inputs)){const row=await t.get('blocks',selected.inputId),state=await t.get('inputStates',selected.inputId);need(row&&state);add({table:'blocks',id:selected.inputId,state:pick(state,['id','contentRevision','lastRemovalSequence','sourceRecordIds','removalState','sourcePurged']),fields:Object.fromEntries(selected.selectedFields.map(field=>[field,row.value?.[field==='body'?'libraryText':field]]))});}
 for(const selected of qualificationScopes(r).flatMap(x=>x.sources)){const row=await t.get('records',selected.sourceRecordId);need(row);add({table:'records',id:selected.sourceRecordId,fields:{originalText:row.value?.originalText}});}
 for(const selected of qualificationScopes(r).flatMap(x=>x.structures)){const row=await t.get(selected.store,selected.recordId);need(row);add({table:selected.store,id:selected.recordId,metadata:structureMetadata(row),fields:Object.fromEntries(selected.selectedFields.map(field=>[field,row[field]]))});}
 for(const selected of qualificationScopes(r).flatMap(x=>x.journals)){const row=await t.get('revisions',selected.journalId);need(row);add({table:'revisions',id:selected.journalId,metadata:journalMetadata(row),fields:Object.fromEntries(selected.selectedFields.map(field=>{const [side,key]=field.split('.');return [field,row[side]?.[key]];}))});}
 r.current();return facts;
}
function qualificationScopes(record){return [record.receipt.scope,...(record.extraQualification?[capabilities.get(record.extraQualification).receipt.scope]:[])];}
// Only this original exact-reuse producer can reserve an acquisition. Aborting
// its caller releases the Store queue, but a real pending issuer continues to
// occupy its same-store slot until that original Promise actually settles.
const exactAcquisitions=new WeakMap();
function exactAcquisition(store,original,signal,parent){
 const pending=exactAcquisitions.get(store)||new Set();need(pending.size<8,'BUDGET_EXCEEDED');
 const timeout=store.organizerBudget.limits.timeoutMs;need(Number.isSafeInteger(timeout)&&timeout>0,'BUDGET_EXCEEDED');
 const expiresAt=Math.min(original.receipt.expiresAt,parent.expiresAt),deadline=performance.now()+timeout;
 const signals=[...new Set([signal,original.receipt.revocationSignal,parent.revocationSignal].filter(Boolean))];
 need(signals.every(s=>s instanceof AbortSignal&&!signalAborted.call(s))&&expiresAt>Date.now());
 const slot=Object.freeze({}),controller=new AbortController(),forks=new WeakMap();let issued=false,closed=false,timer=null,rejectStop;
 const stopped=new Promise((_,reject)=>{rejectStop=reject;});stopped.catch(()=>{});
 const stop=()=>{if(!signalAborted.call(controller.signal)){controller.abort();try{fail('UNAVAILABLE');}catch(error){rejectStop(error);}}};
 const facts=()=>{need(signals.every(s=>!signalAborted.call(s))&&Date.now()<expiresAt&&performance.now()<deadline);};
 const check=()=>{if(closed||signals.some(s=>signalAborted.call(s))||Date.now()>=expiresAt||performance.now()>=deadline)stop();need(!signalAborted.call(controller.signal));};
 const expire=()=>{if(closed)return;const remaining=Math.min(expiresAt-Date.now(),deadline-performance.now());if(remaining<=0)stop();else{timer=setTimeout(expire,Math.min(remaining,2147483647));timer?.unref?.();}};
 const release=()=>{pending.delete(slot);if(!pending.size&&exactAcquisitions.get(store)===pending)exactAcquisitions.delete(store);};
 exactAcquisitions.set(store,pending);pending.add(slot);for(const s of signals)EventTarget.prototype.addEventListener.call(s,'abort',stop,{once:true});expire();
 const reader=(transaction,budget)=>{check();let fork=forks.get(budget);if(!fork){fork=forkContextScopeWorkBudget(budget,{signal:controller.signal,isCurrent:()=>{check();return true;}});forks.set(budget,fork);}const guarded=contextScopeTransactionReader(store,transaction,fork);check();return guarded;};
 return {check,facts,reader,async resolve(processing,t,scope,budget){
  check();need(!issued);const guarded=reader(t,budget);check();issued=true;
  // A private await preserves native Promise semantics: an issuer's own
  // mutable .then can neither counterfeit actual settlement nor leak a slot.
  const raw=(async()=>await processing.resolve(guarded,scope))();
  // Neither branch reads, captures, or validates a late returned receipt.
  raw.then(release,release);const receipt=await Promise.race([raw,stopped]);check();return receipt;
 },close(){if(closed)return;closed=true;clearTimeout(timer);for(const s of signals)EventTarget.prototype.removeEventListener.call(s,'abort',stop);if(!issued)release();stop();}};
}
// Separate local grant for the exact original byExact selection. A caller DTO
// cannot replace that selection, either receipt, or the original shared ledger.
export async function createMaintenanceTopicExactReuseQualification(store,transaction,selection,{base,processing,caller,parent,isCurrent,signal=null}={}){
 const original=qualified(base,store),selected=readTopicExactReuseSelection(selection,store,base),budget=original.workBudget;
 need(original.receipt.caller===caller&&original.receipt.scope.phase!=='topic-exact-reuse');
 assertMaintenanceProcessingReceipt(parent,processing,store);assertMaintenanceQualificationFacts(base,store);
 const acquisition=exactAcquisition(store,original,signal,parent);let extra=null,token=null;try{acquisition.check();
 const t=acquisition.reader(transaction,budget),capture=()=>captureTopicExactReuseMetadata(t,{matches:selected.matches,sentInputIds:selected.sentInputIds,maxInputs:Math.min(20,store.organizerBudget.limits.maxInputs),charge:text=>chargeMaintenanceQualificationHash(base,store,text)});
 need(equal(await capture(),selected.metadata)&&await rootReadAuthority(t)===selected.authority,'STALE_BASE');
 acquisition.check();
  extra=await createQualification(store,transaction,{items:[],coverage:[]},{processing,caller,parent,isCurrent,signal,workBudget:budget,phase:'topic-exact-reuse',binding:{...original.receipt.scope.binding,exactReuseOperationId:selected.operationId,exactReuseSelection:selected.metadata},selection:{entryIds:selected.metadata.entries.map(x=>x.id),inputIds:selected.metadata.inputs.map(x=>x.id)}},acquisition);
  acquisition.check();need(equal(await capture(),selected.metadata)&&await rootReadAuthority(t)===selected.authority,'STALE_BASE');
  const additional=qualified(extra,store),held={};
  for(const key of ['entries','structures','journals','inputs','localClosures','inputMirrors']){held[key]=new Map(original.held[key]);for(const [id,value]of additional.held[key]){if(held[key].has(id))need(equal(held[key].get(id),value),'STALE_BASE');else held[key].set(id,value);}}
  for(const key of ['sources','originalEntries'])held[key]=new Set([...original.held[key],...additional.held[key]]);
  need(held.inputs.size<=Math.min(20,store.organizerBudget.limits.maxInputs),'BUDGET_EXCEEDED');held.exactReuse=selected.metadata;
  const record={store,repository:original.repository,database:original.database,requestSignal:signal,held,receipt:original.receipt,workBudget:budget,released:false,components:[base,extra],baseQualification:base,extraQualification:extra,exactSelection:selection,current:null};
  record.current=()=>{need(!record.released);assertMaintenanceQualification(base,store);assertMaintenanceQualification(extra,store);assertMaintenanceQualificationFacts(base,store);assertMaintenanceQualificationFacts(extra,store);assertTopicExactReuseSelectionFacts(selection,store,base);};record.current();
  token=Object.freeze({});capabilities.set(token,record);const release=()=>releaseMaintenanceQualification(token),signals=[signal,original.receipt.revocationSignal,additional.receipt.revocationSignal].filter(Boolean);for(const s of new Set(signals))s.addEventListener('abort',release,{once:true});record.removeExact=()=>{for(const s of new Set(signals))s.removeEventListener('abort',release);};
  const expiresAt=Math.min(original.receipt.expiresAt,additional.receipt.expiresAt),expire=()=>{if(Date.now()>=expiresAt){release();return;}record.exactTimer=setTimeout(expire,Math.min(expiresAt-Date.now(),2147483647));record.exactTimer?.unref?.();};expire();record.current();acquisition.check();acquisition.close();record.current();acquisition.facts();assertMaintenanceQualificationFacts(token,store);return token;
 }catch(error){if(token)releaseMaintenanceQualification(token);else if(extra)releaseMaintenanceQualification(extra);throw error;}finally{acquisition.close();}
}
export function readMaintenanceTopicExactReuseQualification(token,store,selection,base){const record=qualified(token,store);need(record.exactSelection===selection&&record.baseQualification===base&&record.extraQualification);return {metadata:record.held.exactReuse,qualification:token};}
export function releaseMaintenanceQualification(token){const r=capabilities.get(token);if(!r)return;r.released=true;r.removeExact?.();clearTimeout(r.exactTimer);if(r.extraQualification)releaseMaintenanceQualification(r.extraQualification);if(r.exactSelection)releaseTopicExactReuseSelection(r.exactSelection);for(const key of ['entries','structures','journals','inputs','sources','localClosures','inputMirrors','originalEntries'])r.held[key].clear();capabilities.delete(token);}
export async function withMaintenanceQualification(store,transaction,request,options,fn){
 need(typeof fn==='function');if(!request.items.some(x=>['library_entry','placement','topic','section'].includes(x.descriptor.kind)))return fn(transaction);
 const token=await createMaintenanceQualification(store,transaction,request,options);try{const result=await fn(maintenanceQualificationReader(token,store,transaction));assertMaintenanceQualification(token,store);need(await rootReadAuthority(transaction)===maintenanceQualificationReceipt(token,store).scope.rootAuthority,'STALE_BASE');assertMaintenanceQualification(token,store);return result;}finally{releaseMaintenanceQualification(token);}
}
