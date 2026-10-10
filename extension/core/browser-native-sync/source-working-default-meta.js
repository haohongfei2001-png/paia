import {assertSourceWorkingCanonicalAndProtocolRows,assertSourceWorkingRestoredCanonicalAndProtocolRows} from './source-working-canonical.js';
import {assertSourceWorkingSpecialScalars} from './source-working-derived.js';
import {defaults} from '../workspace.js';
import {CONSENT_VERSION} from '../constants.js';
import {FILTER_VERSIONS} from '../smart-filter.js';
import {REVISION_POLICY} from '../ia-store.js';
import {deltaDescription,deltaSignature,KNOWN_PREFIX,DIRTY_PREFIX,DELTA_COUNTER,HUMAN_FENCE,observeSemanticChange,semanticDeltaLiveEligible,planSemanticDeltaWrite} from '../ai-usage/delta.js';
import {requireOriginalCurrentMixedGroupScope} from './group-checkpoint-scope.js';
import {consumeOriginalMixedManualMeta} from './group-checkpoint-scope.js';
import {requireOriginalMixedNativeBodiesConsumed,originalMixedNativeDerivedMetaIds} from './human-library-plan.js';
import {checkCurrentGroupProtocolRows} from './current-group-protocol-rows.js';
import {physical} from './human-library-journal.js';
import {planInitialFilter} from '../smart-filter-store.js';
import {equal,exact,hash,count,opaque,fail} from './value.js';

const refuse=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
// Pure reconstruction of the original INITIAL transaction chronology only.
// Counter fields are derived by the same observe/live/flush decisions used by
// real writes, never final row count or the transport member iteration order.
// This helper creates no native authority, metadata admission or export grant.
export function planInitialMixedSemanticMetadata(core,scope,plan){
 if(arguments.length!==3)refuse();requireOriginalCurrentMixedGroupScope(core,scope,plan);
 if(core.fixedNamespace!==null||plan.groups.some(group=>group.operations.some(op=>op.deviceId!==core.deviceId)))refuse();
 const groups=[...plan.groups].sort((a,b)=>Math.min(...a.operations.map(op=>op.sequence))-Math.min(...b.operations.map(op=>op.sequence))),known=new Map(),dirty=new Map(),inputs=new Map(),journals=new Map(),context=new Map(),owners=Object.fromEntries(['thoughts','topics','sections','placements'].map(name=>[name,new Map()]));
 const tables={library_entry:'thoughts',topic:'topics',section:'sections',placement:'placements'};let sequence=0,fence=0;
 for(const group of groups){
  const changes=new Map();
  if(['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit'].includes(group.type)){
   for(const member of group.prepared.members){const {entityType:type,entity}=member.value;if(type==='inputState'){observeSemanticChange(changes,deltaDescription('inputStates',inputs.get(entity.id)),deltaDescription('inputStates',entity));inputs.set(entity.id,entity);}}
   for(const member of group.prepared.members){const {entityType:type,entity}=member.value;if(['baselineRevision','revision'].includes(type)){observeSemanticChange(changes,deltaDescription('revisions',journals.get(entity.id)),deltaDescription('revisions',entity));journals.set(entity.id,entity);}}
  }else if(group.type==='humanLibraryCommit'){
   if(!['topic','entry','section','placement'].includes(group.prepared.descriptor.value.kind))refuse();
   for(const member of group.prepared.members){const {entityType:type,after}=member.value,name={entry:'thoughts',topic:'topics',section:'sections',placement:'placements'}[type];if(name)owners[name].set(after.id,after);}
   // Original domain journals use their independently sealed shared allocation
   // sequence. Rehashed older history members remain present but unchanged
   // descriptors do not become fresh semantic evidence.
   const history=group.prepared.members.filter(member=>member.value.entityType==='history').map(member=>member.value.after).sort((a,b)=>a.sequence-b.sequence);
   for(const row of history){observeSemanticChange(changes,deltaDescription('revisions',journals.get(row.id)),deltaDescription('revisions',row));journals.set(row.id,row);}
  }else if(['contextItem','contextRulesItem','contextNowItem'].includes(group.type)){
   const row=group.operations[0].value;observeSemanticChange(changes,deltaDescription('context_item',context.get(row.id)),deltaDescription('context_item',row));context.set(row.id,row);
  }
  let human=false;
  for(const {before,after}of changes.values()){
   const table=tables[after.kind];if(!semanticDeltaLiveEligible(after,{ownerPresent:!!table,live:table?owners[table].get(after.recordId):null,topicPresent:true,topic:after.topicId?owners.topics.get(after.topicId):null}))continue;
   const next=planSemanticDeltaWrite(before,after,known.get(after.key),dirty.get(after.key),sequence);if(!next)continue;
   sequence=next.row.sequence;human||=after.human;known.set(after.key,next.row);if(next.dirty===null)dirty.delete(after.key);else dirty.set(after.key,next.dirty);
  }
  if(human)fence++;
 }
 return {known:[...known.values()],dirty:[...dirty.values()],sequence:{id:DELTA_COUNTER,value:sequence},humanFence:fence?{id:HUMAN_FENCE,value:fence}:null};
}
// Complete INITIAL mixed metadata inventory. This branch requires the actual
// original body and query/search consumers on the same nonce; Source-only
// admission below keeps its existing branded guard and exact constants.
export function assertInitialMixedDefaultMeta(core,store,scope,plan,raw,control,databaseId,nonce){
 if(arguments.length!==8)refuse();requireOriginalMixedNativeBodiesConsumed(nonce,store,core,scope,plan,raw,control);
 const rows=raw.rows,{meta,key,used,take}=checkCurrentGroupProtocolRows(core,plan,rows,{namespace:'initial',epoch:null,restored:false}),read=id=>{const row=meta.get(id);if(!row)refuse();return row;};
 qualifyDefaultInfrastructure(rows,control,databaseId,take,read,{records:scope.expected.records.length,blocks:scope.expected.blocks.length,documents:scope.expected.documents.length});
 const operations=plan.groups.flatMap(group=>group.operations);
 for(const head of plan.heads){
  if(head.revisions.length!==1)refuse();const op=operations.find(op=>op.revisionId===head.revisions[0]);if(!op)refuse();
  if(head.type==='inputWorkingMember'&&op.value.entityType==='input'){
   const state=rows.inputStates.find(row=>row.id===op.value.entity.id);if(!state)refuse();take(key('workingOwner',state.id),{revisionId:op.revisionId,deltaSequence:state.deltaSequence});
  }else if(head.type==='inputWorkingMember'&&op.value.entityType==='revision'){
   const row=rows.revisions.find(row=>row.id===op.value.entity.id);if(!row)refuse();take(key('workingHistory',row.id),{revisionId:op.revisionId,sequence:row.sequence});
  }else if(head.type==='humanLibraryMember'){
   const type=op.value.entityType,name={entry:'thoughts',topic:'topics',section:'sections',placement:'placements',suppression:'thoughtSuppressions',history:'revisions'}[type],row=name&&rows[name].find(row=>row.id===op.value.after.id);if(!row)refuse();
   take(key('humanMapping',head.entityId),{type,local:physical(type,row),wire:physical(type,op.value.after),revisionId:op.revisionId});
  }
 }
 const remaining=new Map([...meta].filter(([id])=>!used.has(id)));consumeOriginalMixedManualMeta(core,store,scope,plan,raw,control,nonce,remaining);for(const id of meta.keys())if(!used.has(id)&&!remaining.has(id))used.add(id);
 // Exact original keyed name/pair inventories were already compared by the
 // original Human body consumer. Derived IDs come only from the private query
 // owner after complete exact matching, never arbitrary prefix exemption.
 for(const id of originalMixedNativeDerivedMetaIds(nonce,store,core,scope,plan,raw))used.add(id);
 const working=plan.groups.filter(group=>group.type==='inputWorkingCommit');
 for(const id of ['thought-sequence','input-delta-sequence','revision-sequence'])take(id,{value:read(id).value});
 take('thought-epoch',{value:working.length});
 const semantic=planInitialMixedSemanticMetadata(core,scope,plan);
 for(const row of [...semantic.known,...semantic.dirty,semantic.sequence,...(semantic.humanFence?[semantic.humanFence]:[])]){const {id,...expected}=row;take(id,expected);}
 const backupGroups=plan.groups.filter(group=>['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit','humanLibraryCommit'].includes(group.type)||['promptPreferences','contextItem','contextRulesItem','contextNowItem','contextDesired'].includes(group.type)&&group.operations[0].actor==='user').length;
 const generation=read('backup-data-generation');if(!count(generation.value)||generation.value<backupGroups)refuse();take(generation.id,{value:generation.value});
 qualifyMixedWorkingDerivatives(scope,plan,working,rows);
 for(const row of rows.meta)if(!used.has(row.id))refuse();return true;
}
function qualifyMixedWorkingDerivatives(scope,plan,working,rows){
 const perInput=new Map();for(const group of working){const input=group.prepared.members.find(member=>member.value.entityType==='input')?.value.entity;if(!input)refuse();const list=perInput.get(input.id)??[];list.push(group);perInput.set(input.id,list);}
 if(rows.filterInputs.length!==scope.expected.blocks.length||rows.invalidations.length!==working.length)refuse();
 const sequences=new Set(),matched=new Set(),ordered=[...working].sort((a,b)=>Math.min(...a.operations.map(op=>op.sequence))-Math.min(...b.operations.map(op=>op.sequence)));
 for(const row of rows.invalidations){
  const groups=perInput.get(row.inputId),state=groups?.find(group=>group.prepared.members.some(member=>member.value.entityType==='inputState'&&member.value.entity.contentRevision===row.contentRevision));
  if(!state||matched.has(state)||!exact(row,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||!opaque(row.id)||row.eventSchema!==2||row.reason!=='source_updated'||!count(row.sequence)||row.sequence!==ordered.indexOf(state)+1||sequences.has(row.sequence)||!iso(row.at)||row.stateKey!==0||row.state!=='pending'||row.cursor!==null||row.dependencyAck!==false||row.organizerAck!==false)refuse();sequences.add(row.sequence);matched.add(state);
 }
 const creation=plan.groups.filter(group=>['sourceBootstrapCommit','sourceAppendCommit'].includes(group.type)).flatMap(group=>group.prepared.members);
 const seen=new Set();for(const row of rows.filterInputs){
  const input=scope.expected.blocks.find(input=>input.id===row.id),groups=perInput.get(row.id);if(!input||seen.has(row.id))refuse();
  if(groups){if(!iso(row.overrideAt)||!equal(row,{id:input.id,documentId:input.documentId,authorship:'untouched',userEdited:true,filterOverride:'keep',presence:null,evaluationRevision:groups.length,pendingKey:1,decision:'keep',reasonCode:'user_protected',...FILTER_VERSIONS,basedOnContentRevision:0,overrideReason:'user_edit',overrideAt:row.overrideAt,failed:false}))refuse();}
  else{const baseline=creation.find(member=>member.value.entityType==='input'&&member.value.entity.id===row.id)?.value.entity,state=creation.find(member=>member.value.entityType==='inputState'&&member.value.entity.id===row.id)?.value.entity;if(!baseline||!state||!equal(row,planInitialFilter(baseline,state)))refuse();}
  seen.add(row.id);
 }
}
// Selected initial Source/Working profile only. The original native owner must
// authenticate rows/control/databaseId and pay all original builder/Map/equality
// frames. This pure complete inventory check creates no read or export grant.
export function assertSourceWorkingDefaultMeta(core,scope,plan,rows,control,databaseId){
 if(arguments.length!==6)refuse();assertSourceWorkingCanonicalAndProtocolRows(core,scope,plan,rows);
 qualifyLocal(core,scope,plan,rows,control,databaseId,plan.groups.filter(group=>group.type==='inputWorkingCommit').length+1);
}
export async function assertSourceWorkingRestoredDefaultMeta(core,scope,plan,rows,control,databaseId){
 if(arguments.length!==6)refuse();
 const localWorking=await assertSourceWorkingRestoredCanonicalAndProtocolRows(core,scope,plan,rows);
 qualifyLocal(core,scope,plan,rows,control,databaseId,localWorking+1);
}
function qualifyLocal(core,scope,plan,rows,control,databaseId,aiSequence){
 const meta=new Map(rows.meta.map(row=>[row.id,row])),admitted=new Set(),working=plan.groups.filter(group=>group.type==='inputWorkingCommit').length;
 const take=(id,expected)=>{if(!equal(meta.get(id),{id,...expected}))refuse();admitted.add(id);};
 const read=id=>{const row=meta.get(id);if(!row)refuse();return row;};
 qualifyDefaultInfrastructure(rows,control,databaseId,take,read,{records:1,blocks:1,documents:1});
 take('thought-epoch',{value:working});take('input-delta-sequence',{value:working+1});take('revision-sequence',{value:rows.revisions.length});take(DELTA_COUNTER,{value:aiSequence});
 const generation=read('backup-data-generation');if(!count(generation.value)||generation.value<working+1)refuse();take('backup-data-generation',{value:generation.value});
 const descriptor=deltaDescription('inputStates',rows.inputStates[0]);if(!descriptor)refuse();const signature=deltaSignature(descriptor),sequence=aiSequence;
 take(KNOWN_PREFIX+descriptor.key,{version:1,descriptor,signature,sequence});take(DIRTY_PREFIX+descriptor.key,{version:1,descriptor,signature,sequence,requirements:[],pendingFacets:['topic','context']});
 // The preceding canonical checker individually checked every original protocol
 // ID, including full operations/receipt/head/history and foreign namespaces.
 // No unvalidated protocol prefix or arbitrary local key is exempted here.
 for(const row of rows.meta)if(!admitted.has(row.id)&&!row.id.startsWith('bns:'))refuse();
}

function qualifyDefaultInfrastructure(rows,control,databaseId,take,read,sourceSequence){
 assertSourceWorkingSpecialScalars('meta',control);
 if(!equal(control.preferences,defaults())||!equal(control.memoryAccessPolicy,{enabled:false,status:'disabled'})||!Array.isArray(control.classificationRules)||control.classificationRules.length||!Array.isArray(control.filterRules)||control.filterRules.length)refuse();
 const settings=control.settings;if(!exact(settings,['consentVersion','consentAt','enabled','epoch'])||settings.consentVersion!==CONSENT_VERSION||settings.enabled!==true||!iso(settings.consentAt)||!count(settings.epoch)||settings.epoch<1||!opaque(databaseId))refuse();
 take('sequence',sourceSequence);take('gate',{epoch:settings.epoch,enabled:true});
 const migration=read('migration');if(!hash(migration.digest))refuse();take('migration',{phase:'active',databaseId,cursor:0,digest:migration.digest,verified:true,recoveryVerified:true,recordCount:0,blockCount:0});
 const ddl=read('thought-ddl');if(!count(ddl.fromVersion)||ddl.fromVersion>5)refuse();take('thought-ddl',{fromVersion:ddl.fromVersion,toVersion:5});
 const ia=read('ia-migration');if(!iso(ia.startedAt)||!iso(ia.completedAt))refuse();take('ia-migration',{phase:'active',cursor:null,count:0,version:1,startedAt:ia.startedAt,verified:true,completedAt:ia.completedAt,policy:REVISION_POLICY});
 const filter=read('smart-filter');if(!iso(filter.completedAt))refuse();take('smart-filter',{phase:'active',migrationVersion:1,cursor:null,mapped:0,legacyCount:0,mode:'light',noticePending:false,decisionSequence:0,policyEpoch:0,...FILTER_VERSIONS,verified:true,diagnosticsVersion:1,taskState:'idle',completedAt:filter.completedAt});
 take('thought-binding:v1',{version:1,cursor:null,complete:true,input:0,thought:0});take('thought-reverse-edit:v1',{version:1,enabled:false});
 const library=read('thought-library');if(!count(library.fromVersion)||library.fromVersion>5||library.fromVersion!==ddl.fromVersion||!iso(library.startedAt)||!iso(library.completedAt))refuse();take('thought-library',{schemaVersion:1,migrationVersion:1,fromVersion:library.fromVersion,targetVersion:5,phase:'active',cursor:null,mapped:0,quarantined:0,sealed:0,startedAt:library.startedAt,libraryActivation:'ready',verified:true,completedAt:library.completedAt});
 const compat=read('library-documents-compat-v2');if(!iso(compat.completedAt))refuse();take('library-documents-compat-v2',{cursor:null,complete:true,activeTopics:0,repairedTopics:0,repairedIndexTopics:0,repairedGenerationTopics:0,repairedDefaultSections:0,unresolvedLayouts:0,indexedActiveTopics:0,indexGap:0,completedAt:compat.completedAt});
 const secret=read('thought-suppression-key');if(!Array.isArray(secret.value)||secret.value.length!==32||secret.value.some(value=>!Number.isInteger(value)||value<0||value>255))refuse();take('thought-suppression-key',{value:secret.value});
}
