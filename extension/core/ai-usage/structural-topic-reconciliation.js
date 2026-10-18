import {equal,fail} from './contracts.js';

// One bounded human rename may be semantically checked against all its current
// Input-backed members. This admits no new identity, membership, Section or
// ordering change. Schema/evidence/policy and publication remain TopicFormation's.
export function assertStructuralTopicAssessment(assessment,view,mapping,material){
 if(mapping?.kind!=='topic'||!material||material.topicId!==mapping.topicId||!['object','subject'].includes(assessment?.kind)||assessment.name!==material.name||!equal(assessment.section,{kind:'default'}))fail('STALE_BASE');
 const ids=mapping.entries.map(e=>e.entryId).sort(),inputs=[...new Set(mapping.entries.map(e=>e.inputId))].sort();
 if(!equal(view.inputs.map(i=>i.id).sort(),inputs)||!equal(view.entries.map(e=>e.id).sort(),ids)||!view.identities.some(t=>t.id===mapping.topicId&&t.canonicalId===mapping.topicId&&t.revision===mapping.topicRevision&&t.name===material.name&&t.available&&t.canonicalLifecycle==='active'))fail('STALE_BASE');
 const complete=citations=>Array.isArray(citations)&&inputs.every(id=>{const input=view.inputs.find(i=>i.id===id),spans=citations.filter(c=>c.inputId===id&&c.field==='body').sort((a,b)=>a.start-b.start);let end=0;for(const span of spans){if(span.start>end)return false;end=Math.max(end,span.end);}return end===input.fields.body.length;});
 if(!complete(assessment.evidence)||!Array.isArray(assessment.relations)||!assessment.relations.length||assessment.relations.some(r=>r.relation!==(r.topicId===mapping.topicId?'same':'distinct'))||!complete(assessment.relations.find(r=>r.topicId===mapping.topicId)?.citations)||!Array.isArray(assessment.entries)||!equal(assessment.entries.map(e=>e.entryId).sort(),ids))fail('STALE_BASE');
 for(const e of assessment.entries){const member=mapping.entries.find(m=>m.entryId===e.entryId),input=view.inputs.find(i=>i.id===member.inputId);
  if(!equal(e.additional,[])||!equal(e.span,{inputId:member.inputId,field:'body',start:0,end:input.fields.body.length}))fail('STALE_BASE');
 }
}
export function assertStructuralTopicResult(result,mapping){
 if(result?.outcome!=='reuse'||result.reason!=='same_identity'||result.checks?.humanIntent!==true||!equal(result.topicIds,[mapping.topicId])||!equal([...result.entryIds].sort(),mapping.entries.map(e=>e.entryId).sort())||!equal(result.createdEntryIds,[])||result.candidateId||result.consumedCandidateId)fail('STALE_BASE');
}
