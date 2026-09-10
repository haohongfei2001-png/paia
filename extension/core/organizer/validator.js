import {FAMILY_BY_TYPE} from '../thought-model.js';
import {object,bytes,reject} from './contracts.js';
export class CandidateValidator {
 constructor(budget){this.budget=budget;}
 validate(output,projection){if(typeof output==='string'){if(bytes(output)>this.budget.limits.maxOutputBytes)reject('BUDGET_EXCEEDED');try{output=JSON.parse(output);}catch{reject('INVALID_OUTPUT');}}
  if(bytes(output)>this.budget.limits.maxOutputBytes)reject('BUDGET_EXCEEDED');object(output,['requestId','schemaVersion','providerVersion','modelVersion','result']);if(output.requestId!==projection.request.requestId||output.schemaVersion!==1||typeof output.providerVersion!=='string'||typeof output.modelVersion!=='string')reject('INVALID_OUTPUT');
  if(!Array.isArray(output.result)||output.result.length>this.budget.limits.maxCandidates)reject('INVALID_OUTPUT');
  return output.result.map(c=>{object(c,['action','body','title','type','formation','evidence','entryRef','topicRef','sectionRef','newTopic','newSection','ambiguous'],['action','body','type','formation','evidence']);if(!['create','refresh','classify','assign','exact'].includes(c.action)||typeof c.body!=='string'||!c.body.trim()||bytes(c.body)>16384||c.title!==undefined&&(typeof c.title!=='string'||c.title.length>300)||!Object.hasOwn(FAMILY_BY_TYPE,c.type)||!['explicit','synthesized','inferred'].includes(c.formation)||c.ambiguous!==undefined&&typeof c.ambiguous!=='boolean')reject('INVALID_OUTPUT');
   if(!Array.isArray(c.evidence)||!c.evidence.length||c.evidence.length>10)reject('INVALID_OUTPUT');const contributions=new Set();for(const e of c.evidence){object(e,['ref','field','start','end']);const input=projection.request.inputs.find(x=>x.ref===e.ref),text=input?.fields[e.field];if(typeof text!=='string'||!Number.isSafeInteger(e.start)||!Number.isSafeInteger(e.end)||e.start<0||e.end<=e.start||e.end>text.length)reject('INVALID_OUTPUT');if(input.role!=='context_only')contributions.add(e.ref);}
   if(!contributions.size||c.formation==='synthesized'&&contributions.size<2)reject('INVALID_OUTPUT');
   if(c.entryRef!==undefined&&!projection.entryMap[c.entryRef]||c.action!=='create'&&!c.entryRef||c.topicRef!==undefined&&!projection.topicMap[c.topicRef]||c.sectionRef!==undefined&&(!projection.sectionMap[c.sectionRef]||projection.sectionMap[c.sectionRef].topicRef!==c.topicRef))reject('INVALID_OUTPUT');
   for(const key of ['newTopic','newSection'])if(c[key]!==undefined&&(typeof c[key]!=='string'||!c[key].trim()||c[key].length>100))reject('INVALID_OUTPUT');if(c.newTopic&&c.topicRef||c.newSection&&c.sectionRef||c.newSection&&!c.newTopic&&!c.topicRef)reject('INVALID_OUTPUT');
   if(c.action==='refresh'&&c.formation==='explicit'){const grounded=c.evidence.some(e=>projection.request.inputs.find(x=>x.ref===e.ref)?.role!=='context_only'&&projection.request.inputs.find(x=>x.ref===e.ref)?.fields[e.field].slice(e.start,e.end)===c.body);if(!grounded)c={...c,ambiguous:true};}
   return structuredClone(c);
  });
 }
}
