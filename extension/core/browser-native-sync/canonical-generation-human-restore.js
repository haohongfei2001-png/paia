import {ArchiveError,CONSENT_VERSION} from '../constants.js';
import {originalGenerationRepositoryTransaction,registerRepositoryWorkLimit,registerRepositoryFinalReadFence,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {readCanonicalCheckpointProof,requireCanonicalCheckpointProof,requireCanonicalCheckpointProofForSeal} from './canonical-generation-checkpoint-stage.js';
import {prepareGroupCheckpointPlan,requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope} from './group-checkpoint-scope.js';
import {prepareOriginalHumanGenerationStep,applyOriginalHumanGenerationStep} from './human-library-group.js';
import {equalSourceWorkingPhysicalTree,measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {createGroupPageBudget,chargeGroupPageBytes,checkGroupPageBudget} from './group-page-reader.js';
import {acceptSequence} from './core.js';
import {physical} from './human-library-journal.js';
import {clone,equal,fail,SyncError} from './value.js';

export const CANONICAL_HUMAN_RESTORE_STATE='canonical-generation:human-restore:v1';
const RECEIPT='canonical-generation:human-step:',GATE='canonical-generation:gate:v1',owners=new WeakMap(),publicationPreparations=new WeakMap();
const repositoryAuthorities=new WeakMap(),defaultCheckpoint=async()=>{};
export function readOriginalHumanRepositoryAuthority(token,repository,scope){const r=repositoryAuthorities.get(token);if(!r)return null;bound(r.owner);if(r.owner.repository!==repository||scope!==null&&r.scope!==null&&r.scope!==scope)fail('GENERATION_REPOSITORY_WRITE_DENIED');if(scope!==null&&r.scope===null)r.scope=scope;return r.authority;}
const receiptId=n=>RECEIPT+String(n).padStart(8,'0');
function bound(r){if(r.store.repository!==r.repository||r.core.repository!==r.repository||r.core.prefix!==r.prefix||r.core.fixedNamespace!==r.namespace||r.core.datasetId!==r.datasetId||r.core.deviceId!==r.deviceId||r.store.humanLibraryJournal!==r.journal||r.journal.core!==r.core)fail('BNS_HUMAN_GENERATION_SCOPE');}
function sameState(actual,expected){if(!equal(actual??null,expected??null))fail('BNS_HUMAN_GENERATION_CURSOR');}
function expectedReceipt(p,n){const g=p.plan.groups[n];return {id:receiptId(n),version:1,...p.identity,index:n,groupId:g.id,operationId:g.prepared.descriptor.operationId,domainOperationId:g.prepared.descriptor.value.domainOperationId};}
async function receipts(r,t,p,cursor){
 if((await t.keys('meta',null,IDBKeyRange.bound(RECEIPT,RECEIPT+'\uffff',false,true),4096)).length!==cursor)fail('BNS_HUMAN_GENERATION_CURSOR');
 for(let n=0;n<cursor;n++){const expected=expectedReceipt(p,n),actual=await t.get('meta',expected.id);if(!actual||!equal(Object.fromEntries(Object.entries(actual).filter(([k])=>k!=='ownerReceipt')),expected)||!equal(await t.get('operationReceipts',expected.domainOperationId)??null,actual.ownerReceipt))fail('BNS_HUMAN_GENERATION_CURSOR');}
}
async function committed(core,t,plan){
 requireOriginalGroupCheckpointPlan(core,plan);const expected=new Map(),frontiers=new Map(),devices=new Map(),latest=new Map();let count=0;
 const add=async(kind,ids,value)=>{const id=await core.idIn(t,kind,...ids);expected.set(id,{...value,id});};
 for(const group of plan.groups)for(const op of group.operations){count++;await add('revision',[op.revisionId],{operation:op,redacted:false});await add('receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});await add('sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId});await add('entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));if(op.deviceId===core.deviceId)devices.set(op.deviceId,Math.max(devices.get(op.deviceId)||0,op.sequence));if(op.type==='humanLibraryMember')latest.set(op.entityId,op);}
 for(const head of plan.heads)await add('head',[head.type,head.entityId],head);for(const [deviceId,value]of frontiers)await add('frontier',[deviceId],{...value,deviceId});for(const [deviceId,sequence]of devices)await add('device',[deviceId],{sequence});if(count)await add('generation',[],{value:count});
 for(const [id,op]of latest){const type=op.value.entityType,table={entry:'thoughts',history:'revisions'}[type];if(!table)fail('BNS_HUMAN_GENERATION_SCOPE');const row=await t.get(table,op.value.after.id);if(!row)fail('BNS_GROUP_COMMIT_UNPROVEN');await add('humanMapping',[id],{type,wire:physical(type,op.value.after),local:physical(type,row),revisionId:op.revisionId});}
 const prefix=core.prefix+'generation:'+core.fixedNamespace+':';if((await t.keys('meta',null,IDBKeyRange.bound(prefix,prefix+'\uffff',false,true),4096)).length!==expected.size)fail('BNS_GROUP_COMMIT_UNPROVEN');for(const [id,row]of expected)if(!equal(await t.get('meta',id)??null,row))fail('BNS_GROUP_COMMIT_UNPROVEN');
}
async function terminal(r,t,{seal=false}={}){
 // Original aiu:delta owner is rebuildable, body-free scheduling metadata.
 // This finite profile writes only human Entry/history; navigation stays idle.
 if(t.navigationChanges?.size)fail('BNS_HUMAN_GENERATION_SCOPE');
 const points=[],counts=[],budget=createGroupPageBudget(),ranges=[IDBKeyRange.upperBound('aiu:delta:',true),IDBKeyRange.lowerBound('aiu:delta:\uffff',true)];
 for(const table of t.tx.objectStoreNames){const count=await t.count(table),keys=await t.keys(table,null,null,4097);if(count!==keys.length||count>4096)fail('BNS_GROUP_RESOURCE_LIMIT');
  if(table==='meta'){for(const key of ranges)counts.push({table,key,count:keys.filter(k=>key.includes(k)).length});}else counts.push({table,count});
  for(const key of keys){if(table==='meta'&&(typeof key==='string'&&key.startsWith('aiu:delta:')||seal&&key===GATE))continue;let row=await t.get(table,key);if(table==='meta'&&key==='backup-data-generation'&&t.backupChanged)row={...row,value:row.value+1};chargeGroupPageBytes(budget,measureSourceWorkingPhysicalTree({key,value:row}).B);points.push({table,key,row});}
 }checkGroupPageBudget(budget);
 if(t.backupChanged&&!points.some(x=>x.table==='meta'&&x.key==='backup-data-generation'))fail('BNS_GROUP_COMMIT_UNPROVEN');
 registerRepositoryFinalReadFence(r.repository,t,{isCurrent:()=>{bound(r);return true;},plan:function*(){for(const {table,key,count}of counts)if((yield {method:'count',table,...(key?{key}:{})})!==count)throw new ArchiveError('BNS_HUMAN_GENERATION_CHANGED');for(const {table,key,row}of points)if(!equalSourceWorkingPhysicalTree((yield {method:'get',table,key}),row))throw new ArchiveError('BNS_HUMAN_GENERATION_CHANGED');return true;}});
}
async function tx(r,fn){let semantic;const token=Object.freeze(Object.create(null));repositoryAuthorities.set(token,{owner:r,scope:null,authority:Object.freeze({kind:r.checkpoint===defaultCheckpoint?'human':'human-debug'})});try{return await originalGenerationRepositoryTransaction(r.repository,token,async t=>{registerRepositoryWorkLimit(r.repository,t);requireRepositoryTransactionDataMethods(r.repository,t);try{const c=await r.store.control(t);if(!c.settings.enabled||c.settings.consentVersion!==CONSENT_VERSION)fail('BNS_GROUP_PERMISSION');return await fn(t);}catch(e){if(e instanceof SyncError)semantic=e;throw e;}});}catch(e){throw semantic??e;}finally{repositoryAuthorities.delete(token);}}
async function readState(r){bound(r);return r.repository.transaction(false,t=>t.get('meta',CANONICAL_HUMAN_RESTORE_STATE)??null,['meta']);}
async function preparation(r,proof){
 bound(r);const packet=readCanonicalCheckpointProof(proof,r),operations=packet.items.filter(x=>x.kind==='revision').map(x=>x.operation),plan=await prepareGroupCheckpointPlan(r.core,operations);if(plan.digest!==packet.graphDigest||plan.groups.some(g=>g.type!=='humanLibraryCommit'||!['entry','entry-edit'].includes(g.prepared.descriptor.value.kind)))fail('BNS_HUMAN_GENERATION_SCOPE');
 const state=await readState(r),identity={manifestId:packet.manifestRef.id,graphDigest:packet.graphDigest,generationIdentity:packet.generationIdentity,sourceBase:packet.sourceBase,namespace:r.namespace};
 if(state&&(state.id!==CANONICAL_HUMAN_RESTORE_STATE||state.version!==1||Object.keys(state).sort().join(',')!=='cursor,generationIdentity,graphDigest,id,manifestId,namespace,phase,sourceBase,total,version'||!equal(Object.fromEntries(Object.keys(identity).map(k=>[k,state[k]])),identity)||!Number.isSafeInteger(state.cursor)||state.cursor<0||state.cursor>plan.groups.length||state.total!==plan.groups.length||!['applying','complete'].includes(state.phase)||state.phase==='complete'&&state.cursor!==plan.groups.length))fail('BNS_HUMAN_GENERATION_CURSOR');
 const cursor=state?.cursor??0,prefix=await prepareGroupCheckpointPlan(r.core,plan.groups.slice(0,cursor).flatMap(g=>g.operations)),scope=await prepareGroupScope(prefix,{store:r.store});return {packet,plan,state,identity,cursor,prefix,scope};
}
export class CanonicalGenerationHumanRestore{
 constructor({store,core,checkpoint=defaultCheckpoint}){if(store?.repository!==core?.repository||!core?.fixedNamespace||typeof checkpoint!=='function'||store.humanLibraryJournal?.core!==core)fail('BNS_HUMAN_GENERATION_SCOPE');owners.set(this,{store,core,repository:core.repository,prefix:core.prefix,namespace:core.fixedNamespace,datasetId:core.datasetId,deviceId:core.deviceId,journal:store.humanLibraryJournal,checkpoint});this.store=store;this.live=core;}
 async step(proof){
  const r=owners.get(this),p=await preparation(r,proof);if(p.state?.phase==='complete'){await this.verify(proof);return {state:'complete',completed:p.cursor,total:p.plan.groups.length};}
  const group=p.plan.groups[p.cursor];if(!group)fail('BNS_HUMAN_GENERATION_SCOPE');const owner=await prepareOriginalHumanGenerationStep(r.store,r.core,p.plan,p.cursor),nextPlan=await prepareGroupCheckpointPlan(r.core,p.plan.groups.slice(0,p.cursor+1).flatMap(g=>g.operations)),nextScope=await prepareGroupScope(nextPlan,{store:r.store}),receipt={id:receiptId(p.cursor),version:1,...p.identity,index:p.cursor,groupId:group.id,operationId:group.prepared.descriptor.operationId,domainOperationId:group.prepared.descriptor.value.domainOperationId},next={id:CANONICAL_HUMAN_RESTORE_STATE,version:1,...p.identity,phase:p.cursor+1===p.plan.groups.length?'complete':'applying',cursor:p.cursor+1,total:p.plan.groups.length};
  const result=await tx(r,async t=>{bound(r);await requireCanonicalCheckpointProof(proof,r,t);sameState(await t.get('meta',CANONICAL_HUMAN_RESTORE_STATE),p.state);await requireGroupScope(r.store,t,p.scope);await committed(r.core,t,p.prefix);if(await t.get('meta',receipt.id))fail('BNS_HUMAN_GENERATION_CURSOR');
   await receipts(r,t,p,p.cursor);
   await applyOriginalHumanGenerationStep(t,owner);await requireGroupScope(r.store,t,nextScope);await committed(r.core,t,nextPlan);const actual=await t.get('operationReceipts',receipt.domainOperationId);if(!actual)fail('BNS_HUMAN_GENERATION_CURSOR');await t.put('meta',{...receipt,ownerReceipt:clone(actual)});await t.put('meta',next);await terminal(r,t);await r.checkpoint('after-step',t);return {state:next.phase,completed:next.cursor,total:next.total};
  });await r.checkpoint('committed-step',result);return result;
 }
 async preparePublication(proof){const r=owners.get(this);await this.verify(proof);const p=await preparation(r,proof);if(p.state?.phase!=='complete')fail('BNS_HUMAN_GENERATION_INCOMPLETE');publicationPreparations.set(this,{proof,p});return {state:'prepared',manifestId:p.packet.manifestRef.id,graphDigest:p.packet.graphDigest,generationIdentity:p.packet.generationIdentity};}
 async verify(proof){const r=owners.get(this),p=await preparation(r,proof);if(p.state?.phase!=='complete')fail('BNS_HUMAN_GENERATION_INCOMPLETE');return tx(r,async t=>{await requireCanonicalCheckpointProof(proof,r,t);sameState(await t.get('meta',CANONICAL_HUMAN_RESTORE_STATE),p.state);await requireGroupScope(r.store,t,p.scope);await committed(r.core,t,p.plan);await receipts(r,t,p,p.cursor);await terminal(r,t);return {state:'complete',completed:p.state.cursor,total:p.state.total};});}
}

// Fixed original consumer for the publication owner's same native transaction.
// A preparation only lends the original whole graph; it is never a callback or
// DTO-defined validator. The publication owner alone seals the gate successor.
export async function requireOriginalHumanGenerationActivation(restore,proof,t){
 if(arguments.length!==3)fail('BNS_HUMAN_GENERATION_SCOPE');const r=owners.get(restore),q=publicationPreparations.get(restore);if(!r||!q||q.proof!==proof)fail('BNS_HUMAN_GENERATION_INCOMPLETE');bound(r);if(t.tx.db!==r.repository.db||t.tx.mode!=='readwrite')fail('BNS_HUMAN_GENERATION_SCOPE');registerRepositoryWorkLimit(r.repository,t);requireRepositoryTransactionDataMethods(r.repository,t);
 const c=await r.store.control(t);if(!c.settings.enabled||c.settings.consentVersion!==CONSENT_VERSION)fail('BNS_GROUP_PERMISSION');await requireCanonicalCheckpointProofForSeal(proof,r,t);sameState(await t.get('meta',CANONICAL_HUMAN_RESTORE_STATE),q.p.state);await requireGroupScope(r.store,t,q.p.scope);await committed(r.core,t,q.p.plan);await receipts(r,t,q.p,q.p.cursor);await terminal(r,t,{seal:true});
 return {manifestId:q.p.packet.manifestRef.id,graphDigest:q.p.packet.graphDigest,generationIdentity:q.p.packet.generationIdentity};
}
