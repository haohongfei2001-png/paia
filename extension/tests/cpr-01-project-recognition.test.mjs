import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture} from './harness/original-complete.mjs';
import {SourceStructureStore} from '../core/source-structure-store.js';
import {
  admitSourceStructureDTO,CHATGPT_PROJECT_STRUCTURE_POLICY,chatGPTSourceStructurePolicy
} from '../core/source-structure-admission.js';

const at='2026-09-22T11:00:00.000Z';
const session='cpr01-unit-session';
const projectId='g-p-'+'a'.repeat(32);
const namespace='chatgpt-project';

function dtos(conversationId,name='Synthetic Project'){
  const common={
    schemaVersion:1,contractId:CHATGPT_PROJECT_STRUCTURE_POLICY.contractId,
    contractVersion:CHATGPT_PROJECT_STRUCTURE_POLICY.contractVersion,
    providerKey:'chatgpt',channel:CHATGPT_PROJECT_STRUCTURE_POLICY.channel,
    scope:CHATGPT_PROJECT_STRUCTURE_POLICY.scope,epoch:9,session,generation:1,observedAt:at
  };
  return [
    {
      ...common,capability:'membership',
      subject:{kind:'conversation',conversationId},
      observation:{
        membership:{state:'project',namespace,projectId},
        projectName:name
      }
    },
    {
      ...common,capability:'projectName',
      subject:{kind:'project',namespace,projectId,witnessConversationId:conversationId},
      observation:{currentName:name}
    }
  ];
}

test('CPR-01 frozen Project DTOs admit atomically without changing Source/Input truth',async()=>{
  const {s}=await completeFixture({texts:['CPR01 stable source','CPR01 stable source']});
  const before=await s.snapshot();
  const conversationId=before.conversations[0].sourceConversationId;
  const structure=new SourceStructureStore(s);
  const admitted=[];
  for(const value of dtos(conversationId)){
    admitted.push(await admitSourceStructureDTO(value,chatGPTSourceStructurePolicy(value)));
  }
  const result=await structure.observeAdmittedBatch(admitted);
  assert.deepEqual(result,{settled:true,excluded:false,changed:true,event:true});

  const conversation=await structure.conversation({platform:'chatgpt',sourceConversationId:conversationId});
  assert.equal(conversation.membership.state,'project');
  assert.deepEqual(conversation.membership.projectRef,{providerKey:'chatgpt',namespace,projectId});
  assert.equal(conversation.lastKnownSourceProject.name,'Synthetic Project');
  assert.equal(conversation.relationshipRevision,1);

  const project=await structure.project({providerKey:'chatgpt',namespace,projectId});
  assert.equal(project.currentName,'Synthetic Project');
  assert.equal(project.relationshipRevision,1);

  const after=await s.snapshot();
  assert.deepEqual(
    after.records.map(r=>[r.id,r.sourceKey,r.dedupeKey,r.contentHash,r.originalText]),
    before.records.map(r=>[r.id,r.sourceKey,r.dedupeKey,r.contentHash,r.originalText])
  );
  assert.deepEqual(
    after.library.blocks.map(b=>[b.id,b.revision,b.libraryText,b.note]),
    before.library.blocks.map(b=>[b.id,b.revision,b.libraryText,b.note])
  );

  const duplicate=await structure.observeAdmittedBatch(admitted);
  assert.equal(duplicate.settled,true);
  assert.equal(duplicate.event,false);
  assert.equal((await structure.history({kind:'conversation',conversationRef:{platform:'chatgpt',sourceConversationId:conversationId}})).items.length,1);
  assert.equal((await structure.history({kind:'project',projectRef:{providerKey:'chatgpt',namespace,projectId}})).items.length,1);
});

test('CPR-01 frozen admission rejects incomplete, malformed and cross-namespace Project evidence',async()=>{
  const conversationId='cpr01-conversation-001';
  const [membership,name]=dtos(conversationId);

  for(const invalid of [
    {...membership,observation:{membership:{state:'project',namespace,projectId}}},
    {...membership,observation:{membership:{state:'unassigned'},projectName:'Synthetic Project'}},
    {...membership,observation:{membership:{state:'project',namespace,projectId:'project-not-g-p'},projectName:'Synthetic Project'}},
    {...membership,observation:{membership:{state:'project',namespace:'other-account',projectId},projectName:'Synthetic Project'}},
    {...name,subject:{...name.subject,projectId:'g-p-'+'z'.repeat(32)}},
    {...name,subject:{...name.subject,namespace:'other-account'}}
  ]){
    await assert.rejects(
      ()=>admitSourceStructureDTO(invalid,chatGPTSourceStructurePolicy(invalid)),
      error=>error?.code==='INVALID_REQUEST'
    );
  }
});

test('CPR-01 old identity policy still rejects Project claims and unknown contracts',async()=>{
  const [membership]=dtos('cpr01-conversation-002');
  const old={...membership,contractId:'chatgpt.current-conversation-presence',channel:'isolated_route'};
  await assert.rejects(
    ()=>admitSourceStructureDTO(old,chatGPTSourceStructurePolicy(old)),
    error=>error?.code==='UNAVAILABLE'
  );
  assert.throws(
    ()=>chatGPTSourceStructurePolicy({...membership,contractId:'unknown.contract'}),
    error=>error?.code==='UNAVAILABLE'
  );
});
