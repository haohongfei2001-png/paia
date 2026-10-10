import {checkCurrentGroupProtocolRows} from './current-group-protocol-rows.js';
import {STORES,FILTER_STORES,IA_STORES} from '../idb-repository.js';
import {LIBRARY_STORES} from '../thought-schema.js';
import {requireOriginalCurrentSourceWorkingGroupScope} from './group-checkpoint-scope.js';
import {assertSourceWorkingDerivedRows,assertSourceWorkingSpecialScalars} from './source-working-derived.js';
import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {FILTER_VERSIONS} from '../smart-filter.js';
import {assertCompletedGroupedRestoreControl} from './completed-group-restore-control.js';
import {equal,exact,hash,count,opaque,fail} from './value.js';

// Defer the body-free schema vector until invocation: this owner can join the
// original Core/Repository static import cycle in an MV3 worker. No imported
// repository binding is read while that original module is still initializing.
let currentStores;
export function sourceWorkingCurrentStores(){return currentStores??=Object.freeze([...STORES,...IA_STORES,...FILTER_STORES,...LIBRARY_STORES]);}
export const sourceWorkingCurrentNonemptyStores=Object.freeze(['meta','records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','sourceCounts','inputStates','revisions','filterInputs','filterIntents','operationReceipts','invalidations']);
const unrepresented=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
const unproven=()=>fail('BNS_GROUP_COMMIT_UNPROVEN');
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
function sameRows(actual,expected){
 if(actual.length!==expected.length)unrepresented();const rows=new Map(actual.map(row=>[row.id,row]));if(rows.size!==actual.length)unrepresented();
 for(const row of expected)if(!equal(rows.get(row.id),row))unrepresented();
}

// Pure canonical/protocol qualification after original native capture and paid
// compiler/builder frames. No reads, callbacks, writes or capability are exposed.
// The native owner must separately close the entire local/default meta inventory,
// authenticate complete indexes, and pin the complete raw cut at every boundary.
export function assertSourceWorkingCanonicalAndProtocolRows(core,scope,plan,rows){
 if(arguments.length!==4)unrepresented();requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);
 qualifyRows(core,scope,plan,rows,{namespace:'initial',epoch:null,restored:false});
}
// Pure qualification of the original frozen native cut. Completion authentication
// does not read storage or grant a projection; the fixed native caller prepays
// every immutable-control frame before this asynchronous identity check.
export async function assertSourceWorkingRestoredCanonicalAndProtocolRows(core,scope,plan,rows){
 if(arguments.length!==4)unrepresented();requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);measureSourceWorkingPhysicalTree(rows);if(core.fixedNamespace!==null)unrepresented();
 const active=rows.meta.find(row=>row.id===core.prefix+'active'),completed=rows.meta.filter(row=>row.id.startsWith(core.prefix+'generation:')&&row.id.endsWith(':restore:'));
 const epochRow=rows.meta.find(row=>row.id==='recovery-restore-epoch');if(epochRow||!active||completed.length!==1)unrepresented();
 const namespace=active.namespace,epoch=null;
 await assertCompletedGroupedRestoreControl(completed[0],{prefix:core.prefix,datasetId:core.datasetId,active,namespace,epoch});
 qualifyRows(core,scope,plan,rows,{namespace,epoch,restored:true,activeId:active.id,completedId:completed[0].id});
 return plan.groups.filter(group=>group.type==='inputWorkingCommit'&&group.prepared.descriptor.deviceId===core.deviceId).length;
}
function qualifyRows(core,scope,plan,rows,{namespace,epoch,restored,activeId,completedId}){
 requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);
 measureSourceWorkingPhysicalTree(rows);
 const stores=sourceWorkingCurrentStores();
 if(Object.keys(rows).length!==37||stores.some(name=>!Object.hasOwn(rows,name)||!Array.isArray(rows[name])))unrepresented();
 for(const name of stores){
  if(!sourceWorkingCurrentNonemptyStores.includes(name)&&rows[name].length)unrepresented();
  for(const row of rows[name])assertSourceWorkingSpecialScalars(name,row);
 }
 if(rows.meta.length>4096)unrepresented();
 assertSourceWorkingDerivedRows(core,scope,plan,rows);
 const expected=scope.expected,input=expected.blocks[0],document=expected.documents[0],working=plan.groups.filter(group=>group.type==='inputWorkingCommit');
 sameRows(rows.records,expected.records.map(value=>({id:value.id,value})));
 sameRows(rows.blocks,expected.blocks.map(value=>({id:value.id,value})));
 sameRows(rows.libraryDocuments,expected.libraryDocuments.map(value=>({id:value.id,value})));
 sameRows(rows.times,expected.times);sameRows(rows.filterIntents,expected.filterIntents);
 const {meta,key,used,take}=checkCurrentGroupProtocolRows(core,plan,rows,{namespace,epoch,restored,activeId,completedId});
 const inputHead=plan.heads.find(head=>head.type==='inputWorkingMember'&&head.entityId==='input:'+input.id);if(!inputHead)unproven();
 const deltaSequence=working.length+1;take(key('workingOwner',input.id),{revisionId:inputHead.revisions[0],deltaSequence});
 sameRows(rows.inputStates,expected.inputStates.map(row=>({...row,deltaSequence})));
 const localSequences=new Set();if(rows.revisions.length!==expected.revisions.length)unrepresented();
 for(const row of expected.revisions){
  const actual=rows.revisions.find(item=>item.id===row.id),head=plan.heads.find(head=>head.type==='inputWorkingMember'&&head.entityId==='revision:'+row.id);
  if(!actual||!head||!count(actual.sequence)||actual.sequence<1||actual.sequence>rows.revisions.length||localSequences.has(actual.sequence))unproven();localSequences.add(actual.sequence);
  take(key('workingHistory',row.id),{revisionId:head.revisions[0],sequence:actual.sequence});
  if(!equal(actual,{...row,sequence:actual.sequence,listKey:[row.entityKey,actual.sequence],documentList:[row.documentId,actual.sequence]}))unrepresented();
 }
 for(const row of rows.meta)if(row.id.startsWith('bns:')&&!used.has(row.id))unrepresented();
 // UI retry digests authenticate local retry evidence, not portable revision
 // digests; full request bytes are not reconstructed from a typed descriptor.
 const localWorking=restored?working.filter(group=>group.prepared.descriptor.deviceId===core.deviceId):working;
 if(rows.operationReceipts.length!==localWorking.length||new Set(rows.operationReceipts.map(row=>row.id)).size!==localWorking.length)unrepresented();
 for(const row of rows.operationReceipts)if(!exact(row,['id','namespace','schemaVersion','ownerId','createdAt','digest','result'])||!localWorking.some(group=>group.prepared.descriptor.entityId===row.id)||row.namespace!=='working-input'||row.schemaVersion!==1||row.ownerId!==document.id||!iso(row.createdAt)||!hash(row.digest)||!equal(row.result,{ok:true}))unrepresented();
 // Local pending derivatives remain local. Their exact immutable current cut
 // is pinned by the native owner; no history timestamp is invented or uploaded.
 if(rows.invalidations.length!==working.length||new Set(rows.invalidations.map(row=>row.id)).size!==working.length)unrepresented();
 const eventSequences=new Set();for(const row of rows.invalidations){if(!exact(row,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||!opaque(row.id)||row.eventSchema!==2||row.inputId!==input.id||row.reason!=='source_updated'||!count(row.sequence)||row.sequence<1||row.sequence>working.length||row.contentRevision!==row.sequence||!iso(row.at)||row.stateKey!==0||row.state!=='pending'||row.cursor!==null||row.dependencyAck!==false||row.organizerAck!==false||eventSequences.has(row.sequence))unrepresented();eventSequences.add(row.sequence);}
 if(rows.filterInputs.length!==1)unrepresented();const filter=rows.filterInputs[0];
 if(!exact(filter,['id','documentId','authorship','userEdited','filterOverride','presence','evaluationRevision','pendingKey','decision','reasonCode',...Object.keys(FILTER_VERSIONS),'basedOnContentRevision','overrideReason','overrideAt','failed'])||!equal(filter,{id:input.id,documentId:document.id,authorship:'untouched',userEdited:true,filterOverride:'keep',presence:null,evaluationRevision:working.length,pendingKey:1,decision:'keep',reasonCode:'user_protected',...FILTER_VERSIONS,basedOnContentRevision:0,overrideReason:'user_edit',overrideAt:filter.overrideAt,failed:false})||!iso(filter.overrideAt))unrepresented();
}
