import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture} from './harness/original-complete.mjs';
import {SourceStructureStore} from '../core/source-structure-store.js';
import {
  admitChatGPTSourceStructureBatch,
  CHATGPT_PROJECT_STRUCTURE_POLICY,
  CHATGPT_PROJECT_ABSENCE_POLICY
} from '../core/source-structure-admission.js';

const namespace='chatgpt-project';
const A='g-p-'+'a'.repeat(32);
const B='g-p-'+'b'.repeat(32);
const session='cpr02-unit-session';
const iso=n=>new Date(Date.UTC(2026,8,22,16,n,0)).toISOString();

function projectBatch(conversationId,projectId,name,generation,observedAt){
  const common={
    schemaVersion:1,contractId:CHATGPT_PROJECT_STRUCTURE_POLICY.contractId,
    contractVersion:CHATGPT_PROJECT_STRUCTURE_POLICY.contractVersion,
    providerKey:'chatgpt',channel:CHATGPT_PROJECT_STRUCTURE_POLICY.channel,
    scope:CHATGPT_PROJECT_STRUCTURE_POLICY.scope,epoch:19,session,generation,observedAt
  };
  return [
    {
      ...common,capability:'membership',
      subject:{kind:'conversation',conversationId},
      observation:{membership:{state:'project',namespace,projectId},projectName:name}
    },
    {
      ...common,capability:'projectName',
      subject:{kind:'project',namespace,projectId,witnessConversationId:conversationId},
      observation:{currentName:name}
    }
  ];
}
function absence(conversationId,generation,observedAt){
  return [{
    schemaVersion:1,contractId:CHATGPT_PROJECT_ABSENCE_POLICY.contractId,
    contractVersion:CHATGPT_PROJECT_ABSENCE_POLICY.contractVersion,
    providerKey:'chatgpt',capability:'membership',channel:CHATGPT_PROJECT_ABSENCE_POLICY.channel,
    scope:CHATGPT_PROJECT_ABSENCE_POLICY.scope,epoch:19,session,generation,observedAt,
    subject:{kind:'conversation',conversationId},
    observation:{membership:{state:'unassigned'}}
  }];
}
async function apply(structure,values){
  return structure.observeAdmittedBatch(await admitChatGPTSourceStructureBatch(values));
}
const stable=state=>({
  records:state.records.map(r=>[r.id,r.sourceKey,r.dedupeKey,r.contentHash,r.originalText,r.sourceSentAt,r.capturedAt]),
  blocks:state.library.blocks.map(b=>[b.id,b.revision,b.libraryText,b.note,b.provenance])
});

test('CPR-02 lifecycle preserves unknown/unassigned/last-known semantics and dedupes reload evidence',async()=>{
  const {s}=await completeFixture({texts:['CPR02 canonical source','CPR02 canonical source']});
  const before=await s.snapshot(),conversationId=before.conversations[0].sourceConversationId;
  const ref={platform:'chatgpt',sourceConversationId:conversationId};
  const structure=new SourceStructureStore(s);
  assert.equal(await structure.conversation(ref),null,'no provider relationship remains unknown before evidence');

  let result=await apply(structure,projectBatch(conversationId,A,'Project Alpha',1,iso(1)));
  assert.equal(result.event,true);
  let row=await structure.conversation(ref);
  assert.equal(row.membership.state,'project');
  assert.equal(row.membership.projectRef.projectId,A);
  assert.equal(row.lastKnownSourceProject.name,'Project Alpha');
  assert.equal(row.relationshipRevision,1);

  result=await apply(structure,projectBatch(conversationId,A,'Project Alpha Renamed',2,iso(2)));
  assert.equal(result.event,true);
  row=await structure.conversation(ref);
  assert.equal(row.membership.projectRef.projectId,A);
  assert.equal(row.lastKnownSourceProject.name,'Project Alpha Renamed');
  assert.equal(row.relationshipRevision,2);
  const projectA=await structure.project({providerKey:'chatgpt',namespace,projectId:A});
  assert.equal(projectA.currentName,'Project Alpha Renamed');
  assert.equal(projectA.relationshipRevision,2);

  // Temporary inability to observe the Project-home link produces no DTO at all;
  // the durable relationship therefore remains last-known rather than becoming unknown/unassigned.
  const beforeGap=structuredClone(row);
  row=await structure.conversation(ref);
  assert.deepEqual(row.membership,beforeGap.membership);
  assert.deepEqual(row.lastKnownSourceProject,beforeGap.lastKnownSourceProject);
  assert.equal(row.relationshipRevision,2);

  result=await apply(structure,projectBatch(conversationId,B,'Project Beta',3,iso(3)));
  assert.equal(result.event,true);
  row=await structure.conversation(ref);
  assert.equal(row.membership.projectRef.projectId,B);
  assert.equal(row.lastKnownSourceProject.name,'Project Beta');
  assert.equal(row.relationshipRevision,3);

  result=await apply(structure,absence(conversationId,4,iso(4)));
  assert.equal(result.event,true);
  row=await structure.conversation(ref);
  assert.equal(row.membership.state,'unassigned');
  assert.equal(row.membership.projectRef,null);
  assert.equal(row.lastKnownSourceProject.projectRef.projectId,B,'unassigned preserves last-known Project');
  assert.equal(row.lastKnownSourceProject.name,'Project Beta');
  assert.equal(row.relationshipRevision,4);

  result=await apply(structure,projectBatch(conversationId,B,'Project Beta',5,iso(5)));
  assert.equal(result.event,true);
  row=await structure.conversation(ref);
  assert.equal(row.membership.state,'project');
  assert.equal(row.membership.projectRef.projectId,B);
  assert.equal(row.relationshipRevision,5);

  result=await apply(structure,projectBatch(conversationId,B,'Project Beta',6,iso(6)));
  assert.equal(result.event,false,'reload/re-observation updates evidence without relationship history spam');
  row=await structure.conversation(ref);
  assert.equal(row.relationshipRevision,5);
  const history=await structure.history({kind:'conversation',conversationRef:ref});
  assert.equal(history.items.length,5);
  assert.deepEqual(history.items.map(x=>x.observationSequence),[1,2,3,4,5]);

  const projectB=await structure.project({providerKey:'chatgpt',namespace,projectId:B});
  assert.equal(projectB.currentName,'Project Beta');
  assert.equal(projectB.relationshipRevision,1,'repeated same-name Project evidence does not create rename spam');

  assert.deepEqual(stable(await s.snapshot()),stable(before),'source/input truth is untouched by lifecycle reconciliation');
});
