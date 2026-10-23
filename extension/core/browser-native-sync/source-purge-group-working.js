import {prepareGroupCheckpointPlan,requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope} from './group-checkpoint-scope.js';
import {initialSourcePlan} from './source-bootstrap-plan.js';
import {requireSourceWorkingStoreBinding} from './source-working-binding.js';
import {planInitialFilter} from '../smart-filter-store-owner.js';
import {blockIndex,sourceCount} from '../idb-repository.js';
import {protocolPhysicalId} from './physical-key.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {equal,exact,hash,opaque,count,fail} from './value.js';
const deny=()=>fail('BNS_SOURCE_PURGE_WORKING_UNSUPPORTED'),iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x)),copy=x=>structuredClone(x);
const sorted=a=>[...a].sort((x,y)=>x.id.localeCompare(y.id));
function same(a,b){if(!equalSourceWorkingPhysicalTree(sorted(a),sorted(b)))deny();}
// A bounded, read-only reverse projection after the original typed Working
// graph authenticates every current value. It is never a writer or source of
// portable data. The caller retains the complete raw cut for final closure.
export async function prepareSourcePurgeWorkingCut(store,core,raw,plan,namespace,negative){
 requireOriginalGroupCheckpointPlan(core,plan);const working=plan.groups.filter(g=>g.type==='inputWorkingCommit');
 if(!working.length)return {view:raw,plan,protocol:[],working};
 requireSourceWorkingStoreBinding(store,core);
 if(measureSourceWorkingPhysicalTree(raw).B*4+measureSourceWorkingPhysicalTree(plan).B*4>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
 if(plan.groups.some(g=>!['sourceBootstrapCommit','inputWorkingCommit'].includes(g.type)))deny();
 const bootstrap=await prepareGroupCheckpointPlan(core,plan.groups.filter(g=>g.type==='sourceBootstrapCommit').flatMap(g=>g.operations)),scope=await prepareGroupScope(plan),initial=bootstrap.groups.map(g=>initialSourcePlan(g.capability)),view=copy(raw),protocol=[];
 const localNegative=negative.filter(n=>raw.inputStates.some(r=>r.id===n.intent.inputId)),total=initial.length+localNegative.length,key=(kind,...parts)=>protocolPhysicalId(core.prefix,namespace,kind,parts);
 const changed=new Set(working.map(g=>g.prepared.descriptor.value.inputId)),expected=scope.expected,historyIds=new Set(expected.revisions.map(r=>r.id)),baselineIds=new Set(initial.map(p=>p.baselineRevision.id));
 const meta=new Map(raw.meta.map(r=>[r.id,r]));
 for(const [id,value]of [['input-delta-sequence',total+working.length],['revision-sequence',total+historyIds.size-baselineIds.size],['thought-epoch',localNegative.length*2+working.length]]){if(!equal(meta.get(id),{id,value}))deny();view.meta.find(r=>r.id===id).value=id==='thought-epoch'?localNegative.length*2:total;}
 same(raw.blocks,expected.blocks.map(value=>({id:value.id,value})));same(raw.filterIntents,expected.filterIntents);
 const states=raw.inputStates.filter(r=>changed.has(r.id));
 if(new Set(raw.inputStates.map(r=>r.deltaSequence)).size!==raw.inputStates.length||raw.inputStates.some(r=>!count(r.deltaSequence)||r.deltaSequence<1||r.deltaSequence>total+working.length))deny();
 for(const state of states){const e=expected.inputStates.find(r=>r.id===state.id);if(!e||!equal(state,{...e,deltaSequence:state.deltaSequence}))deny();}
 for(const h of expected.revisions){const actual=raw.revisions.find(r=>r.id===h.id);if(!actual||!count(actual.sequence)||actual.sequence<1||actual.sequence>total+historyIds.size-baselineIds.size||!equal(actual,{...h,sequence:actual.sequence,listKey:[h.entityKey,actual.sequence],documentList:[h.documentId,actual.sequence]}))deny();}
 if(raw.revisions.some(r=>!historyIds.has(r.id)&&!localNegative.some(n=>n.intent.baselineId===r.id))||new Set(raw.revisions.map(r=>r.sequence)).size!==raw.revisions.length)deny();
 for(const head of plan.heads.filter(h=>h.type==='inputWorkingMember')){const op=plan.groups.flatMap(g=>g.operations).find(o=>o.revisionId===head.revisions[0]);if(!op)deny();let row;if(op.value.entityType==='input'){const s=states.find(s=>s.id===op.value.entity.id);if(!s)deny();row={id:key('workingOwner',s.id),revisionId:op.revisionId,deltaSequence:s.deltaSequence};}else if(op.value.entityType==='revision'){const h=raw.revisions.find(h=>h.id===op.value.entity.id);row={id:key('workingHistory',h.id),sequence:h.sequence,revisionId:op.revisionId};}if(row){if(!equal(meta.get(row.id),row))deny();protocol.push(row);}}
 const local=working.filter(g=>g.prepared.descriptor.deviceId===core.deviceId);
 if(raw.operationReceipts.length!==local.length)deny();for(const r of raw.operationReceipts){const g=local.find(g=>g.prepared.descriptor.entityId===r.id);if(!g||!exact(r,['id','namespace','schemaVersion','ownerId','createdAt','digest','result'])||r.namespace!=='working-input'||r.schemaVersion!==1||r.ownerId!==g.prepared.descriptor.value.documentId||!iso(r.createdAt)||!hash(r.digest)||!equal(r.result,{ok:true}))deny();}
 const events=raw.invalidations.filter(r=>r.reason==='source_updated'),seen=new Set();if(events.length!==working.length)deny();for(const r of events){const g=working.find(g=>g.prepared.descriptor.value.inputId===r.inputId&&g.prepared.members.some(m=>m.value.entityType==='inputState'&&m.value.entity.contentRevision===r.contentRevision));if(!g||seen.has(g)||!exact(r,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||!opaque(r.id)||r.eventSchema!==2||r.stateKey!==0||r.state!=='pending'||r.cursor!==null||r.dependencyAck!==false||r.organizerAck!==false||!iso(r.at)||!Number.isSafeInteger(r.sequence)||r.sequence<=localNegative.length*2||r.sequence>localNegative.length*2+working.length)deny();seen.add(g);}if(new Set(events.map(r=>r.sequence)).size!==events.length)deny();
 view.invalidations=view.invalidations.filter(r=>r.reason!=='source_updated');view.operationReceipts=[];view.filterIntents=[];
 for(const p of initial){if(!changed.has(p.input.id))continue;const edits=working.filter(g=>g.prepared.descriptor.value.inputId===p.input.id),actualFilter=raw.filterInputs.find(r=>r.id===p.input.id),base=planInitialFilter(p.input,p.inputState),filter={...base,filterOverride:'keep',userEdited:true,overrideReason:'user_edit',overrideAt:actualFilter?.overrideAt,evaluationRevision:base.evaluationRevision+edits.length,failed:false,pendingKey:1,decision:'keep',reasonCode:'user_protected'};delete filter.filteredKey;delete filter.aiDecision;if(!iso(actualFilter?.overrideAt)||!equal(actualFilter,filter))deny();
  const ri=raw.recordIndex.find(r=>r.id===p.source.id),bi=raw.blockIndex.find(r=>r.id===p.input.id),current=expected.blocks.find(r=>r.id===p.input.id);if(!ri||!bi||!equalSourceWorkingPhysicalTree(bi,blockIndex(current,bi.sequence,[p.source])))deny();
  const finalCount=sourceCount(p.input.documentId,p.source.sourceKey,[p.source],[current],p.source.chatId);if(!equalSourceWorkingPhysicalTree(raw.sourceCounts.find(r=>r.id===finalCount.id),finalCount))deny();
  view.blocks.find(r=>r.id===p.input.id).value=copy(p.input);Object.assign(view.inputStates.find(r=>r.id===p.input.id),copy(p.inputState),{deltaSequence:ri.sequence+1});view.filterInputs=view.filterInputs.map(r=>r.id===p.input.id?base:r);view.blockIndex=view.blockIndex.map(r=>r.id===p.input.id?blockIndex(p.input,bi.sequence,[p.source]):r);const baseCount=sourceCount(p.input.documentId,p.source.sourceKey,[p.source],[p.input],p.source.chatId);view.sourceCounts=view.sourceCounts.map(r=>r.id===baseCount.id?baseCount:r);
 }
 // Full current history and owner allocations were authenticated above. The
 // bootstrap comparison uses the corresponding original Source ordinal; no
 // persisted sequence changes when Working history predates a later Source.
 view.revisions=view.revisions.filter(r=>baselineIds.has(r.id)||!historyIds.has(r.id));for(const p of initial){const h=view.revisions.find(r=>r.id===p.baselineRevision.id);if(!h)deny();const seq=raw.recordIndex.find(r=>r.id===p.source.id)?.sequence+1;if(!Number.isSafeInteger(seq)||seq<1||seq>total)deny();Object.assign(h,copy(p.baselineRevision),{sequence:seq,listKey:[p.baselineRevision.entityKey,seq],documentList:[p.baselineRevision.documentId,seq]});}
 return {view,plan:bootstrap,protocol,working};
}
