import {exact,opaque,identifier,count,equal,fail,hash,bytes} from './value.js';
import {formationParameters} from '../topic-formation-policy.js';
import {validateHumanAllocationEvents} from './human-library-allocation.js';
const all=(v,k)=>exact(v,k)&&Object.keys(v).length===k.length;
const refuse=()=>fail('BNS_TOPIC_FORMATION_INVALID');
const at=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
function identity(value){
 const required=['version','revision','origin','scope','aliases','legacy','noRecreation'];
 if(!exact(value,[...required,'nameToken','lifecycleIntent'])||required.some(k=>!Object.hasOwn(value,k))||value.version!==1||!count(value.revision)||!['user','ai','unknown'].includes(value.origin)||value.scope!==null||typeof value.legacy!=='boolean'||typeof value.noRecreation!=='boolean'||!Array.isArray(value.aliases)||value.aliases.length>4096)refuse();
 if(value.nameToken!==undefined&&!hash(value.nameToken))refuse();
 for(const a of value.aliases)if(!all(a,['token','actor','revision','operationId','at'])||!hash(a.token)||!['user','ai','unknown'].includes(a.actor)||!count(a.revision)||!opaque(a.operationId)||!at(a.at))refuse();
 if(value.lifecycleIntent!==undefined){const i=value.lifecycleIntent;if(!all(i,['actor','operationId','at','previous','to'])||!['user','ai'].includes(i.actor)||!opaque(i.operationId)||!at(i.at)||!['candidate','active','dormant','removed','merged'].includes(i.previous)||i.to!=='dormant')refuse();}
}

export function formationIdentity(t){return {id:t.id,revision:t.revision,organizationRevision:t.organizationRevision,layoutGeneration:t.activeLayoutGeneration,lifecycle:t.lifecycle,identity:structuredClone(t.identity??null)};}
export function validateTopicFormation(value){
 if(!all(value,['id','version','domainOperationId','before','plan','events','allocation','transitionAt','requestDigest','result','activityRevision','historyDigest'])||value.version!==1||!identifier(value.id)||!opaque(value.domainOperationId))refuse();
 if(value.activityRevision!==null&&!hash(value.activityRevision))refuse();if(!hash(value.historyDigest)||!hash(value.requestDigest)||!all(value.result,['outcome','reason','policyVersion','checks','lineage','decisionVersion','topicIds','entryIds','createdEntryIds'])||bytes(value).length>65536)refuse();const b=value.before,p=value.plan;if(!all(b,['id','revision','organizationRevision','layoutGeneration','lifecycle','identity'])||b.id!==value.id||b.lifecycle!=='dormant'||!['revision','organizationRevision','layoutGeneration'].every(k=>count(b[k]))||b.layoutGeneration<1)refuse();identity(b.identity);const result=value.result;if(!['same_identity','internal_aspect'].includes(result.reason)||result.policyVersion!==p.parameters?.version||!all(result.checks,['boundary','returnValue','identity','notInternalAspect','provenance','humanIntent'])||Object.values(result.checks).some(x=>typeof x!=='boolean')||!all(result.lineage,['contributions','conversations','dates','contexts','unattributed'])||Object.values(result.lineage).some(x=>!count(x)))refuse();
 if(!all(p,['outcome','topicId','entryId','sectionId','decisionVersion','parameters'])||p.outcome!=='reuse'||p.topicId!==value.id||!identifier(p.entryId)||!identifier(p.sectionId)||typeof p.decisionVersion!=='string')refuse();formationParameters(p.parameters);if(value.result.outcome!=='reuse'||value.result.decisionVersion!==p.decisionVersion||!equal(value.result.topicIds,[value.id])||!equal(value.result.entryIds,[p.entryId])||!equal(value.result.createdEntryIds,[]))refuse();
 validateHumanAllocationEvents(value.events,value.allocation);if(!equal(value.events.map(x=>[x.kind,x.role]),[['clock','domain'],['uuid','domain'],['clock','domain'],['clock','domain']])||value.allocation.domainCount!==4||value.allocation.indexGenerationCount!==0||typeof value.transitionAt!=='string'||!Number.isFinite(Date.parse(value.transitionAt)))refuse();return value;
}
export function assertTopicFormationOperation(op){if(op.type!=='topicFormation'||op.kind!=='put'||op.actor!=='activity'||op.parents.length>1||op.value.id!==op.entityId)refuse();validateTopicFormation(op.value);}
