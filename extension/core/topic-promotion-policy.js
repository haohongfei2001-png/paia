import {fail,keys,same} from './thought-model.js';
import {evaluateTopicFormation,formationParameters} from './topic-formation-policy.js';
import {validateCitations,entrySpanSupported} from './topic-formation-evidence.js';

// These are finite work bounds, not a maximum Section size or an identity rule.
// Larger selections use a complete paged manifest, never truncation or several
// new Topics as a substitute for one requested structural promotion.
export const PROMOTION_LIMITS=Object.freeze({assessmentPage:100,batch:100,lifetimeMs:24*60*60*1000});
export {formationParameters};

export function evaluateSectionPromotion(assessment,snapshot,identities,parameters){
 keys(assessment,['formation','independence'],['formation','independence']);
 keys(assessment.independence,['reason','citations'],['reason','citations']);
 if(!['direct_naming','direct_inputs','independent_goal','separate_reuse'].includes(assessment.independence.reason))fail();
 validateCitations(assessment.independence.citations,snapshot.evidence.inputs);
 const plan=evaluateTopicFormation(assessment.formation,snapshot.evidence,identities,[],parameters);
 if(plan.outcome!=='create'||assessment.formation.section.kind!=='default'||!plan.entries.length||plan.entries.some(e=>!e.entryId||e.additional.length))fail();
 if(!assessment.independence.citations.every(span=>plan.entries.some(e=>entrySpanSupported(snapshot.evidence.entries.find(x=>x.id===e.entryId),span,snapshot.evidence.inputs))))fail();
 // Membership is selected explicitly and displayed at confirmation. Preserve
 // its existing relative order, even when the assessor enumerates it differently.
 const selected=new Set(plan.entries.map(e=>e.entryId));
 const entryIds=snapshot.placements.filter(p=>selected.has(p.entryId)).map(p=>p.entryId);
 if(entryIds.length!==plan.entries.length||!entryIds.length)fail();
 return {name:plan.name,entryIds,reason:assessment.independence.reason,checks:{...plan.checks,humanIntent:true},lineage:plan.lineage,policyVersion:plan.policyVersion};
}

export const promotionPlacementId=(topic,generation,entry)=>JSON.stringify([topic,generation,entry]);
export const promotionSectionId=(topic,generation,section)=>JSON.stringify([topic,generation,section]);
export function promotionOrganization(entry){
 return {organizationRevision:entry.organizationRevision,organizationIntents:structuredClone(entry.organizationIntents??null),topics:structuredClone(entry.topics||[])};
}
export function samePromotionPlacement(a,b){
 const selected=p=>p&&Object.fromEntries(['id','topicId','layoutGeneration','entryId','sectionId','rank','sectionRank','revision','lifecycle','membershipAuthorship','sectionProtection','orderProtection','membershipOperationId','excludedByUser','removedWithTopicOperationId'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));
 return same(selected(a),selected(b));
}
