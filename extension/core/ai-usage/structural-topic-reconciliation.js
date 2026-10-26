import {equal,fail} from './contracts.js';
import {structuralSectionRestoreAllowsTopic} from './structural-context-mapping.js';
import {topicNameRestoreAllowsTopic} from './topic-context-mapping.js';

// One bounded human rename may be semantically checked against all its current
// Input-backed members. This admits no new identity, membership, Section or
// ordering change. Schema/evidence/policy and publication remain TopicFormation's.
export function assertStructuralTopicAssessment(assessment,view,mapping,material){
 // Section proofs retain their original untagged shape. Their changed title
 // describes an internal aspect of the exact existing parent, not its name.
 const topic=mapping?.kind==='topic',section=mapping?.kind===undefined&&typeof mapping?.sectionId==='string';
 // The original formal adapter represents an explicitly empty wire name as
 // null. Only a genuine restore of the current empty Section title may use
 // that sentinel; it never substitutes for an omitted or nonempty title.
 const name=topic?material?.name:material?.title,sameName=assessment?.name===name||section&&structuralSectionRestoreAllowsTopic(mapping)&&name===''&&assessment?.name===null;
 if(!topic&&!section||!material||material.topicId!==mapping.topicId||!['object','subject'].includes(assessment?.kind)||!sameName||!equal(assessment.section,topic?{kind:'default'}:{kind:'existing',sectionId:mapping.sectionId}))fail('STALE_BASE');
 const ids=mapping.entries.map(e=>e.entryId).sort(),inputs=[...new Set(mapping.entries.map(e=>e.inputId))].sort();
 if(!equal(view.inputs.map(i=>i.id).sort(),inputs)||!equal(view.entries.map(e=>e.id).sort(),ids)||!view.identities.some(t=>t.id===mapping.topicId&&t.canonicalId===mapping.topicId&&t.revision===mapping.topicRevision&&(!topic||t.name===material.name)&&t.available&&t.canonicalLifecycle==='active'))fail('STALE_BASE');
 if(section&&(!view.sections?.some(s=>s.id===mapping.recordId&&s.sectionId===mapping.sectionId&&s.topicId===mapping.topicId&&s.layoutGeneration===mapping.layoutGeneration&&s.revision===mapping.sectionRevision&&s.title===material.title&&s.lifecycle==='active')||assessment.boundary?.reason!=='internal_aspect'))fail('STALE_BASE');
 const complete=citations=>Array.isArray(citations)&&inputs.every(id=>{const input=view.inputs.find(i=>i.id===id),spans=citations.filter(c=>c.inputId===id&&c.field==='body').sort((a,b)=>a.start-b.start);let end=0;for(const span of spans){if(span.start>end)return false;end=Math.max(end,span.end);}return end===input.fields.body.length;});
 if(!complete(assessment.evidence)||section&&!complete(assessment.boundary.citations)||!Array.isArray(assessment.relations)||!assessment.relations.length||assessment.relations.some(r=>r.relation!==(r.topicId===mapping.topicId?(topic?'same':'internal_aspect'):'distinct'))||!complete(assessment.relations.find(r=>r.topicId===mapping.topicId)?.citations)||!Array.isArray(assessment.entries)||!equal(assessment.entries.map(e=>e.entryId).sort(),ids))fail('STALE_BASE');
 for(const e of assessment.entries){const member=mapping.entries.find(m=>m.entryId===e.entryId),input=view.inputs.find(i=>i.id===member.inputId);
  if(!equal(e.additional,[])||!equal(e.span,{inputId:member.inputId,field:'body',start:0,end:input.fields.body.length}))fail('STALE_BASE');
 }
}
export function assertStructuralTopicResult(result,mapping){
 if(result?.outcome!=='reuse'||result.reason!==(mapping.kind==='topic'?'same_identity':'internal_aspect')||result.checks?.humanIntent!==true||!equal(result.topicIds,[mapping.topicId])||!Array.isArray(result.entryIds)||!equal([...result.entryIds].sort(),mapping.entries.map(e=>e.entryId).sort())||!equal(result.createdEntryIds,[])||result.candidateId||result.consumedCandidateId)fail('STALE_BASE');
}

// Restore is a new current human interpretation, not a replay of its historical
// target and not an inherited rename capability. The same original assessment
// and formation result limits apply only after its distinct owner proof closes.
export function assertSectionRestoreTopicAssessment(assessment,view,mapping,material){
 if(!structuralSectionRestoreAllowsTopic(mapping))fail('STALE_BASE');
 assertStructuralTopicAssessment(assessment,view,mapping,material);
}
export function assertSectionRestoreTopicResult(result,mapping){
 if(!structuralSectionRestoreAllowsTopic(mapping))fail('STALE_BASE');
 assertStructuralTopicResult(result,mapping);
}

// Topic-name restoration retains the same current nonempty identity name and
// complete original Topic membership. Section's empty-title sentinel does not
// apply, and no historical target or new Topic may replace this exact owner.
export function assertTopicNameRestoreAssessment(assessment,view,mapping,material){
 if(!topicNameRestoreAllowsTopic(mapping))fail('STALE_BASE');
 assertStructuralTopicAssessment(assessment,view,mapping,material);
}
export function assertTopicNameRestoreResult(result,mapping){
 if(!topicNameRestoreAllowsTopic(mapping))fail('STALE_BASE');
 assertStructuralTopicResult(result,mapping);
}
