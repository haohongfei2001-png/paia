import {requireOriginalSourceWorkingCore,acceptSequence} from './core.js';
import {requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {protocolPhysicalId} from './physical-key.js';
import {equal,fail} from './value.js';
const unrepresented=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
const unproven=()=>fail('BNS_GROUP_COMMIT_UNPROVEN');
// Shared exact protocol-row comparison for the original current compilers.
// This is a partial pure comparison, not a native cut or complete metadata
// admission: the consuming domain owner must check all remaining used IDs.
// Its caller prepays the original Map/Set/operation/frontier/row frames.
export function checkCurrentGroupProtocolRows(core,plan,rows,{namespace,epoch,restored,activeId,completedId}){
 requireOriginalSourceWorkingCore(core);requireOriginalGroupCheckpointPlan(core,plan);
 const meta=new Map(rows.meta.map(row=>[row.id,row]));if(meta.size!==rows.meta.length||core.fixedNamespace!==null||!restored&&(meta.has(core.prefix+'active')||meta.has('recovery-restore-epoch')))unrepresented();
 const key=(kind,...parts)=>protocolPhysicalId(core.prefix,namespace,kind,parts),used=new Set(restored?[activeId,completedId]:[]);
 const take=(id,value)=>{const row=meta.get(id);if(!row||!equal(row,{...value,id}))unproven();used.add(id);};
 const operations=plan.groups.flatMap(group=>group.operations),frontiers=new Map();
 if(!restored&&operations.some(op=>op.deviceId!==core.deviceId))unrepresented();
 for(const op of operations){
  take(key('revision',op.revisionId),{operation:op,redacted:false});take(key('receipt',op.operationId),{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});
  take(key('sequence',op.deviceId,String(op.sequence).padStart(16,'0')),{operationId:op.operationId,digest:op.revisionId});take(key('entityRevision',op.type,op.entityId,op.revisionId),{revisionId:op.revisionId});
  frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));
  const out=key('outbox',op.operationId);if(meta.has(out)){if(restored&&op.deviceId!==core.deviceId)unrepresented();take(out,{operationId:op.operationId,revisionId:op.revisionId,state:'queued'});}
 }
 for(const head of plan.heads)take(key('head',head.type,head.entityId),head);
 for(const [deviceId,value]of frontiers)take(key('frontier',deviceId),{...value,deviceId});
 const local=operations.filter(op=>op.deviceId===core.deviceId);if(local.length)take(key('device',core.deviceId),{sequence:Math.max(...local.map(op=>op.sequence))});take(key('generation'),{value:operations.length});take(key('ownerRecoveryEpoch'),{version:1,epoch});
 return {meta,key,used,take};
}
