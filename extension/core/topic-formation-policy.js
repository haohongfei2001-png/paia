import {fail,keys,idOK,FAMILY_BY_TYPE} from './thought-model.js';
import {isLowDurabilityTopic,isGenericSectionName} from './organizer/topic-quality.js';
import {FORMATION_WORK_LIMITS,citationText,validateCitations,sourceContributionSummary,entrySpanSupported} from './topic-formation-evidence.js';

const returnReasons=['reading','thinking','decision','reuse'];
const transientEnglish=/^(?:next steps?|current progress|new changes|several questions|this update|some ideas|follow[- ]?up plans?|release update)$/iu;
export const automaticFormationName=name=>typeof name==='string'&&!!name.trim()&&name.length<=300&&!isLowDurabilityTopic(name)&&!isGenericSectionName(name)&&!transientEnglish.test(name.trim())&&name.trim()!=='未归入主题';
// No production recurrence constants selected. A trusted installed strategy
// supplies an explicit version and tunable thresholds. A recurrent subject
// needs at least two independent contributions; first-object and internal
// Section-aspect judgments retain their different evidence contracts.
export function formationParameters(value){
 keys(value,['version','subject','section'],['version','subject','section']);if(!idOK(value.version))fail();
 for(const key of ['subject','section']){keys(value[key],['minContributions','minContexts'],['minContributions','minContexts']);for(const [field,number]of Object.entries(value[key]))if(!Number.isSafeInteger(number)||number<(key==='subject'&&field==='minContributions'?2:1)||number>FORMATION_WORK_LIMITS.inputs)fail();}
 return Object.freeze({version:value.version,subject:Object.freeze({...value.subject}),section:Object.freeze({...value.section})});
}
function claim(value,reasons,inputs,{empty=false}={}){keys(value,['reason','citations'],['reason','citations']);if(!reasons.includes(value.reason))fail();validateCitations(value.citations,inputs,{empty});return value;}
const satisfied=(summary,parameters)=>summary.contributions>=parameters.minContributions&&summary.contexts>=parameters.minContexts;
export function evaluateTopicFormation(assessment,snapshot,identities,sections,parameters){
 keys(assessment,['version','kind','name','boundaryKey','substance','boundary','returnValue','continuity','evidence','relations','section','entries'],['version','kind','name','substance','boundary','returnValue','continuity','evidence','relations','section','entries']);
 if(assessment.version!==1||!['object','subject','unresolved'].includes(assessment.kind)||assessment.name!==null&&(typeof assessment.name!=='string'||assessment.name.length>300)||assessment.boundaryKey!==undefined&&!/^[a-f0-9]{64}$/.test(assessment.boundaryKey))fail();
 const inputs=snapshot.inputs;
 claim(assessment.substance,['substantive','incidental','empty'],inputs,{empty:true});
 claim(assessment.boundary,['independent_object','sustained_subject','internal_aspect','incidental','unknown'],inputs,{empty:true});
 claim(assessment.returnValue,[...returnReasons,'none'],inputs,{empty:true});
 claim(assessment.continuity,['ongoing_work','recurring_subject','incidental','unknown'],inputs,{empty:true});
 validateCitations(assessment.evidence,inputs,{empty:true});
 const canonical=new Map(identities.map(x=>[x.canonicalId,x]));
 if(!Array.isArray(assessment.relations)||assessment.relations.length!==canonical.size||new Set(assessment.relations.map(r=>r?.topicId)).size!==canonical.size)fail();
 for(const relation of assessment.relations){keys(relation,['topicId','relation','citations'],['topicId','relation','citations']);if(!canonical.has(relation.topicId)||!['same','distinct','internal_aspect','ambiguous'].includes(relation.relation))fail();validateCitations(relation.citations,inputs,{empty:relation.relation==='ambiguous'});}
 const same=assessment.relations.filter(x=>x.relation==='same'),aspects=assessment.relations.filter(x=>x.relation==='internal_aspect'),ambiguous=assessment.relations.some(x=>x.relation==='ambiguous');
 const lineage=sourceContributionSummary(snapshot,assessment.evidence),continuity=sourceContributionSummary(snapshot,assessment.continuity.citations);
 const checks={boundary:assessment.kind==='object'&&assessment.boundary.reason==='independent_object'||assessment.kind==='subject'&&assessment.boundary.reason==='sustained_subject',returnValue:returnReasons.includes(assessment.returnValue.reason)&&assessment.returnValue.citations.length>0,identity:!ambiguous&&!same.length,notInternalAspect:!aspects.length&&assessment.boundary.reason!=='internal_aspect',provenance:assessment.substance.reason==='substantive'&&assessment.substance.citations.length>0&&lineage.contributions>0&&(assessment.kind==='object'?assessment.continuity.reason==='ongoing_work'&&continuity.contributions>0:assessment.kind==='subject'&&assessment.continuity.reason==='recurring_subject'&&satisfied(lineage,parameters.subject)),humanIntent:false};
 checks.boundary&&=assessment.boundary.citations.length>0;
 let outcome='unassigned',reason='ambiguous_identity',topicId=null;
 if(!ambiguous&&same.length+aspects.length===1){
  topicId=(same[0]||aspects[0]).topicId;
  if(canonical.get(topicId).canonicalLifecycle==='removed'){reason='removed_identity';topicId=null;}
  else if(assessment.substance.reason!=='substantive'||!assessment.substance.citations.length||!lineage.contributions){reason='insufficient_provenance';topicId=null;}
  else{outcome='reuse';reason=same.length?'same_identity':'internal_aspect';}
 }else if(!ambiguous&&!same.length&&!aspects.length){
  reason='insufficient_evidence';
  if(Object.entries(checks).filter(([key])=>key!=='humanIntent').every(([,value])=>value)&&automaticFormationName(assessment.name)){outcome='create';reason='qualified_identity';}
  else if(assessment.substance.reason==='substantive'&&checks.boundary&&checks.returnValue&&lineage.contributions){outcome='candidate';reason=automaticFormationName(assessment.name)?'insufficient_recurrence':'unstable_name';}
 }
 if(!Array.isArray(assessment.entries)||assessment.entries.length>FORMATION_WORK_LIMITS.entries||assessment.entries.length&&(assessment.substance.reason!=='substantive'||!assessment.substance.citations.length))fail();
 const entries=[],entryKeys=new Set();
 for(const entry of assessment.entries){
  keys(entry,['span','type','entryId','additional'],['span','type','additional']);const body=citationText(entry.span,inputs),input=inputs.find(x=>x.id===entry.span.inputId);
  if(input.role!=='primary'||!Object.hasOwn(FAMILY_BY_TYPE,entry.type)||entry.entryId!==undefined&&!snapshot.entries.some(e=>e.id===entry.entryId&&entrySpanSupported(e,entry.span,inputs)))fail();
  const key=entry.entryId||JSON.stringify(entry.span);if(entryKeys.has(key))fail();entryKeys.add(key);
  if(!Array.isArray(entry.additional)||entry.additional.length>20||new Set(entry.additional.map(x=>x?.topicId)).size!==entry.additional.length)fail();
  const additional=[];
  for(const placement of entry.additional){
   keys(placement,['topicId','returnValue'],['topicId','returnValue']);if(!canonical.has(placement.topicId)||placement.topicId===topicId)fail();
   claim(placement.returnValue,[...returnReasons,'lexical','category','none'],inputs,{empty:true});
   if(returnReasons.includes(placement.returnValue.reason)&&placement.returnValue.citations.some(c=>c.inputId===entry.span.inputId&&c.field===entry.span.field&&c.start>=entry.span.start&&c.end<=entry.span.end)&&canonical.get(placement.topicId).canonicalLifecycle==='active'&&assessment.relations.find(r=>r.topicId===placement.topicId)?.relation==='distinct')additional.push(placement.topicId);
  }
  entries.push({...entry,body,additional:outcome==='create'||outcome==='reuse'?additional:[]});
 }
 if(!entries.length&&outcome==='create'){outcome='candidate';reason='no_entry';}
 const section=assessment.section;keys(section,['kind','sectionId','name','aspect','returnValue','relations'],['kind']);if(!['default','existing','named'].includes(section.kind))fail();
 let selectedSection=null,newSection=null;
 if(section.kind==='default'){if(Object.keys(section).length!==1)fail();}
 else if(section.kind==='existing'){
  if(Object.keys(section).length!==2||!idOK(section.sectionId))fail();const row=sections.find(s=>s.sectionId===section.sectionId&&s.topicId===topicId);if(!row||row.lifecycle!=='active'||row.redirectTo)fail();selectedSection=row;
 }else{
  if(!Object.hasOwn(section,'relations')||!Object.hasOwn(section,'name')||!Object.hasOwn(section,'aspect')||!Object.hasOwn(section,'returnValue')||Object.hasOwn(section,'sectionId'))fail();
  claim(section.aspect,['recurring_internal_aspect','incidental','unknown'],inputs,{empty:true});claim(section.returnValue,[...returnReasons,'none'],inputs,{empty:true});
  const existing=sections.filter(s=>s.topicId===topicId&&!s.isDefault&&s.lifecycle==='active'&&!s.redirectTo);
  if(!Array.isArray(section.relations)||section.relations.length!==existing.length||new Set(section.relations.map(r=>r?.sectionId)).size!==existing.length)fail();
  for(const relation of section.relations){keys(relation,['sectionId','relation','citations'],['sectionId','relation','citations']);if(!existing.some(s=>s.sectionId===relation.sectionId)||!['same','distinct','ambiguous'].includes(relation.relation))fail();validateCitations(relation.citations,inputs,{empty:relation.relation==='ambiguous'});}
  const matches=section.relations.filter(r=>r.relation==='same'),uncertain=section.relations.some(r=>r.relation==='ambiguous');
  if(!uncertain&&matches.length===1)selectedSection=existing.find(s=>s.sectionId===matches[0].sectionId);
  else if(!uncertain&&!matches.length&&(outcome==='reuse'||outcome==='create')&&automaticFormationName(section.name)&&section.aspect.reason==='recurring_internal_aspect'&&satisfied(sourceContributionSummary(snapshot,section.aspect.citations),parameters.section)&&returnReasons.includes(section.returnValue.reason)&&section.returnValue.citations.length)newSection=section.name.trim();
 }
 return {sourceInputIds:[...new Set([...assessment.evidence,...assessment.boundary.citations,...assessment.returnValue.citations,...assessment.continuity.citations].map(c=>c.inputId))],sectionInputIds:section.kind==='named'?[...new Set([...section.aspect.citations,...section.returnValue.citations].map(c=>c.inputId))]:[],outcome,reason,topicId,name:assessment.name?.trim()||null,boundaryKey:assessment.boundaryKey||null,checks,lineage,entries,selectedSection,newSection,policyVersion:parameters.version};
}
