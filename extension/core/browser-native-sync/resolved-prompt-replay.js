import {requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {equal,fail} from './value.js';

// A complete original plan may pass through a retained two-head Prompt conflict
// before its explicit paired resolution. This permits only that intermediate
// protocol state; the original materializers and final canonical/head checks
// still run in the same atomic activation transaction.
export function requireResolvedPromptReplayConflict(core,plan,group,result){
 requireOriginalGroupCheckpointPlan(core,plan);
 const deny=()=>fail('BNS_GROUP_CAUSAL_GAP'),types=['promptPreferences','promptBinding'];
 const index=plan.groups.indexOf(group),operation=group?.operations?.[0];
 if(index<0||group.operations.length!==1||!types.includes(group.type)||operation.type!==group.type||result?.state!=='conflict'||!Array.isArray(result.revisions)||result.revisions.length!==2||new Set(result.revisions).size!==2||!result.revisions.includes(operation.revisionId))deny();
 const parents=result.revisions.slice().sort();
 const resolver=plan.groups.slice(index+1).find(g=>g.type===group.type&&g.operations.length===1&&g.operations[0].entityId===operation.entityId&&equal(g.operations[0].parents.slice().sort(),parents))?.operations[0];
 if(!resolver||resolver.actor!=='user'||resolver.kind!=='put')deny();
 const operations=plan.groups.flatMap(g=>g.operations),byRevision=new Map(operations.map(op=>[op.revisionId,op]));
 const prompt=group.type==='promptPreferences'?resolver:byRevision.get(resolver.value.promptRevisionId);
 const companion=group.type==='promptBinding'?resolver:operations.find(op=>op.type==='promptBinding'&&op.value.promptRevisionId===resolver.revisionId);
 if(!prompt||!companion||prompt.type!=='promptPreferences'||companion.type!=='promptBinding'||prompt.entityId!==operation.entityId||companion.entityId!==operation.entityId||prompt.actor!=='user'||companion.actor!=='user'||prompt.kind!=='put'||companion.kind!=='put'||prompt.parents.length!==2||companion.parents.length!==2)deny();
 const linked=[];
 for(const ref of companion.parents){const prior=byRevision.get(ref),priorPrompt=prior&&byRevision.get(prior.value.promptRevisionId);if(!prior||prior.type!=='promptBinding'||prior.entityId!==operation.entityId||!priorPrompt||priorPrompt.type!=='promptPreferences'||priorPrompt.entityId!==operation.entityId||!prompt.parents.includes(priorPrompt.revisionId))deny();linked.push(priorPrompt.revisionId);}
 if(new Set(linked).size!==2)deny();
 // Every final entity head must still be unique and causally cover this exact
 // resolver. A later unrelated newest value is not a resolution receipt.
 for(const resolved of [prompt,companion]){
  const head=plan.heads.find(h=>h.type===resolved.type&&h.entityId===resolved.entityId);
  if(!head||head.purged||head.revisions.length!==1)deny();
  const pending=head.revisions.slice(),seen=new Set();let covered=false;
  while(pending.length){const ref=pending.pop();if(seen.has(ref))continue;seen.add(ref);if(ref===resolved.revisionId){covered=true;break;}const op=byRevision.get(ref);if(!op||op.type!==resolved.type||op.entityId!==resolved.entityId)deny();pending.push(...op.parents);}
  if(!covered)deny();
 }
}
