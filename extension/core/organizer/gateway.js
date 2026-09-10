import {inputProjection,checkEvidenceInTransaction} from '../thought-evidence.js';
import {prefix} from '../thought-model.js';
import {bytes,reject} from './contracts.js';
export class InputProjectionGateway {
 constructor(store,budget){this.store=store;this.budget=budget;}
 async project(job){const s=this.store;await s.finishFoundation();const specs=job.specs;
  if(!Array.isArray(specs)||!specs.length||specs.length>this.budget.limits.maxInputs)reject('BUDGET_EXCEEDED');
  const evidence=await s.evidenceFor(specs);
  return s.run(()=>s.repository.transaction(false,async t=>{
   const gate=await t.get('meta','gate');if(!gate?.enabled||gate.epoch!==job.consentEpoch)reject('CANCELLED');await checkEvidenceInTransaction(s,t,evidence);
   const inputs=[],maps={},documents=new Set();let contextBytes=0,suppressedTargets=0,targetCount=0;
   for(let i=0;i<evidence.length;i++){const e=evidence[i],p=await inputProjection(s,t,e.inputId);documents.add(p.documentId);const suppressed=await t.all('thoughtSuppressions','byScope',e.scopeToken,100);if(suppressed.length===100)reject('BUDGET_EXCEEDED');if(e.role!=='context_only'){targetCount++;if(suppressed.some(x=>x.status==='active'))suppressedTargets++;}
    const ref='i'+i,fields=Object.fromEntries(e.selectedFields.map(f=>[f,p[f]]));inputs.push({ref,role:e.role,fields});maps[ref]=e;if(e.role==='context_only')contextBytes+=bytes(fields);
   }
   if(suppressedTargets===targetCount)reject('CANCELLED');
   if(documents.size!==1||!inputs.some(x=>x.role!=='context_only'))reject('INVALID_OUTPUT');
   // Only entries explicitly selected by the coordinator and connected to this
   // task's inputs can be compared. No title, URL, snapshot or database DTO.
   const entries=[],entryMap={};for(const id of job.entryIds||[]){if(entries.length>=4)reject('BUDGET_EXCEEDED');const e=await s.readableEntry(t,id),deps=await t.all('dependencies','byTarget',prefix(['entry',id]),11);if(e.lifecycle!=='active'||!deps.some(d=>evidence.some(x=>x.inputId===d.inputId)))reject('INVALID_OUTPUT');const ref='e'+entries.length;entries.push({ref,body:e.thoughtText,type:e.type});entryMap[ref]={id,revision:e.revision,organizationRevision:e.organizationRevision,dependencyRevision:e.dependencyRevision};}
   const topics=[],topicMap={},sections=[],sectionMap={};for(const id of job.topicIds||[]){if(topics.length>=20)reject('BUDGET_EXCEEDED');const topic=await s.canonicalTopic(t,id);if(topic.id!==id||topic.lifecycle!=='active'||topic.layoutJobId)reject('STALE_BASE');let related=false;for(const eid of job.entryIds||[]){const p=await t.get('placements',JSON.stringify([id,topic.activeLayoutGeneration,eid]));if(p?.lifecycle==='active')related=true;}if(!related)reject('INVALID_OUTPUT');const ref='t'+topics.length;topics.push({ref,name:topic.name});topicMap[ref]={id,revision:topic.revision,organizationRevision:topic.organizationRevision,generation:topic.activeLayoutGeneration};const page=await t.rangePage('sections','byTopicOrder',prefix([id,topic.activeLayoutGeneration,0]),null,20);for(const {value:rawSection}of page.rows){const section=await s.safeOrganization(t,'section',rawSection);if(sections.length>=20)break;const sr='s'+sections.length;sections.push({ref:sr,topicRef:ref,title:section.title});sectionMap[sr]={id:section.id,revision:section.revision,topicRef:ref};}}
   const request={requestId:job.requestId,taskKind:'organize',schemaVersion:1,scopeToken:job.scopeToken,inputs,entries,allowedTopicRefs:topics,allowedSectionRefs:sections,budget:{maxCandidates:this.budget.limits.maxCandidates,maxOutputBytes:this.budget.limits.maxOutputBytes},locale:'zh-CN'};
   const result=this.budget.evaluate({inputCount:inputs.length,targetCount:inputs.filter(x=>x.role!=='context_only').length,contextCount:inputs.filter(x=>x.role==='context_only').length,contextBytes,contentBytes:bytes({inputs,entries,topics,sections}),requestBytes:bytes(request)});if(result.decision!=='allow')reject('BUDGET_EXCEEDED');
   return {request,maps,entryMap,topicMap,sectionMap,evidence};
  }));
 }
}
