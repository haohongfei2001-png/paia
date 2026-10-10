import {STORES,FILTER_STORES,IA_STORES} from '../idb-repository.js';
import {LIBRARY_STORES} from '../thought-schema.js';
import {requireOriginalCurrentSourceWorkingGroupScope} from './group-checkpoint-scope.js';
import {assertSourceWorkingDerivedRows,assertSourceWorkingSpecialScalars} from './source-working-derived.js';
import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {protocolPhysicalId} from './physical-key.js';
import {acceptSequence} from './core.js';
import {FILTER_VERSIONS} from '../smart-filter.js';
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
 const meta=new Map(rows.meta.map(row=>[row.id,row]));if(meta.size!==rows.meta.length||core.fixedNamespace!==null||meta.has(core.prefix+'active')||meta.has('recovery-restore-epoch'))unrepresented();
 const key=(kind,...parts)=>protocolPhysicalId(core.prefix,'initial',kind,parts),used=new Set();
 const take=(id,value)=>{const row=meta.get(id);if(!row||!equal(row,{...value,id}))unproven();used.add(id);};
 const operations=plan.groups.flatMap(group=>group.operations),frontiers=new Map();
 if(operations.some(op=>op.deviceId!==core.deviceId))unrepresented();
 for(const op of operations){
  take(key('revision',op.revisionId),{operation:op,redacted:false});take(key('receipt',op.operationId),{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});
  take(key('sequence',op.deviceId,String(op.sequence).padStart(16,'0')),{operationId:op.operationId,digest:op.revisionId});take(key('entityRevision',op.type,op.entityId,op.revisionId),{revisionId:op.revisionId});
  frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));
  const out=key('outbox',op.operationId);if(meta.has(out))take(out,{operationId:op.operationId,revisionId:op.revisionId,state:'queued'});
 }
 for(const head of plan.heads)take(key('head',head.type,head.entityId),head);
 for(const [deviceId,value]of frontiers)take(key('frontier',deviceId),{...value,deviceId});
 take(key('device',core.deviceId),{sequence:Math.max(...operations.map(op=>op.sequence))});take(key('generation'),{value:operations.length});take(key('ownerRecoveryEpoch'),{version:1,epoch:null});
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
 if(rows.operationReceipts.length!==working.length||new Set(rows.operationReceipts.map(row=>row.id)).size!==working.length)unrepresented();
 for(const row of rows.operationReceipts)if(!exact(row,['id','namespace','schemaVersion','ownerId','createdAt','digest','result'])||!working.some(group=>group.prepared.descriptor.entityId===row.id)||row.namespace!=='working-input'||row.schemaVersion!==1||row.ownerId!==document.id||!iso(row.createdAt)||!hash(row.digest)||!equal(row.result,{ok:true}))unrepresented();
 // Local pending derivatives remain local. Their exact immutable current cut
 // is pinned by the native owner; no history timestamp is invented or uploaded.
 if(rows.invalidations.length!==working.length||new Set(rows.invalidations.map(row=>row.id)).size!==working.length)unrepresented();
 const eventSequences=new Set();for(const row of rows.invalidations){if(!exact(row,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||!opaque(row.id)||row.eventSchema!==2||row.inputId!==input.id||row.reason!=='source_updated'||!count(row.sequence)||row.sequence<1||row.sequence>working.length||row.contentRevision!==row.sequence||!iso(row.at)||row.stateKey!==0||row.state!=='pending'||row.cursor!==null||row.dependencyAck!==false||row.organizerAck!==false||eventSequences.has(row.sequence))unrepresented();eventSequences.add(row.sequence);}
 if(rows.filterInputs.length!==1)unrepresented();const filter=rows.filterInputs[0];
 if(!exact(filter,['id','documentId','authorship','userEdited','filterOverride','presence','evaluationRevision','pendingKey','decision','reasonCode',...Object.keys(FILTER_VERSIONS),'basedOnContentRevision','overrideReason','overrideAt','failed'])||!equal(filter,{id:input.id,documentId:document.id,authorship:'untouched',userEdited:true,filterOverride:'keep',presence:null,evaluationRevision:working.length,pendingKey:1,decision:'keep',reasonCode:'user_protected',...FILTER_VERSIONS,basedOnContentRevision:0,overrideReason:'user_edit',overrideAt:filter.overrideAt,failed:false})||!iso(filter.overrideAt))unrepresented();
}
