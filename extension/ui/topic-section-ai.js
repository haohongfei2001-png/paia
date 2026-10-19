// Reading qualification only. The canonical full-Topic presentation and its
// field-level edit/CAS/history remain owned by their existing domain commands.
export const SECTION_AI_FIELDS=Object.freeze(['blockSummary','currentView','keyInformation','decisions','preferences','judgments','openQuestions','possibleEvolution']);
const TEXT_FIELDS=new Set(['blockSummary','currentView']);
const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
const ids=value=>Array.isArray(value)&&value.length>0&&value.length<=200&&value.every(idOK)?[...new Set(value)]:null;
function fieldEvidence(row,field){
 const value=row?.[field],roots=ids(row?.evidenceEntryIds);if(!roots)return null;
 if(TEXT_FIELDS.has(field)){const evidence=typeof value==='string'&&value.trim()?ids(Object.hasOwn(row.fieldEvidenceEntryIds||{},field)?row.fieldEvidenceEntryIds[field]:row.evidenceEntryIds):null;return evidence?.every(id=>roots.includes(id))?evidence:null;}
 if(!Array.isArray(value)||!value.length)return null;
 const result=[];for(const item of value){if(typeof item?.text!=='string'||!item.text.trim())return null;const evidence=ids(item.evidenceEntryIds);if(!evidence)return null;result.push(...evidence);}
 const unique=[...new Set(result)];return unique.length<=200&&unique.every(id=>roots.includes(id))?unique:null;
}
function hasValue(row,field){return TEXT_FIELDS.has(field)?typeof row?.[field]==='string'&&!!row[field].trim():Array.isArray(row?.[field])&&row[field].length>0;}
export function sectionAIFields(row,sectionEvidence){
 const admittedFields=new Set(),withheldFields=new Set(),evidenceIds=new Set();
 for(const field of SECTION_AI_FIELDS){
  if(!hasValue(row,field))continue;
  const evidence=fieldEvidence(row,field);
  if(evidence&&sectionEvidence instanceof Set&&evidence.every(id=>sectionEvidence.has(id))){admittedFields.add(field);for(const id of evidence)evidenceIds.add(id);}
  else withheldFields.add(field);
 }
 return {admittedFields,withheldFields,evidenceIds};
}
export async function qualifySectionAI(row,{topicId=row?.topicId,sectionId,load,isCurrent=()=>true}={}){
 const refuse=reason=>({...sectionAIFields(row,new Set()),sectionEvidence:new Set(),complete:false,reason});
 if(!row||typeof row.recoveryEpoch!=='string'||!row.recoveryEpoch||row.recoveryEpoch.length>200||row.topicId!==topicId||!idOK(topicId)||!idOK(sectionId)||typeof load!=='function'||!isCurrent())return refuse('scope_unavailable');
 if(Array.isArray(row.evidenceEntryIds)&&new Set(row.evidenceEntryIds).size>200)return refuse('evidence_limit');
 const references=[...new Set(SECTION_AI_FIELDS.flatMap(field=>fieldEvidence(row,field)||[]))];
 if(references.length>200)return refuse('evidence_limit');
 const options={topicId,scopeSectionId:sectionId,limit:1};
 let generation=null,recoveryEpoch=null,authority=null;
 const current=page=>{
  if(!isCurrent()||!page||page.cursorInvalid||page.unavailable||page.unsupported||page.indexing||page.topic?.id!==topicId||!page.sections?.some(section=>section.sectionId===sectionId))return false;
  const next=page.coverage?.activeGeneration;
  if(typeof next!=='string'||!next||typeof page.recoveryEpoch!=='string'||!page.recoveryEpoch||page.recoveryEpoch!==row.recoveryEpoch)return false;
  if(generation===null){generation=next;recoveryEpoch=page.recoveryEpoch;authority=JSON.stringify(page.authority??null);}
  return next===generation&&page.recoveryEpoch===recoveryEpoch&&JSON.stringify(page.authority??null)===authority;
 };
 try{
  if(!current(await load(options)))return refuse('scope_changed');
  const sectionEvidence=new Set();
  for(const id of references){
   const page=await load({...options,anchorId:id,expectedReadGeneration:generation});
   if(!isCurrent())return refuse('scope_changed');
   // An exact out-of-Section/missing target is not permission to fall back to
   // another Entry. The final original-scope read still fences all successes.
   if(page?.cursorInvalid&&page.anchorUnavailable)continue;
   if(!current(page))return refuse('scope_changed');
   if(page.items?.some(item=>item.entry?.id===id&&item.entry.lifecycle==='active'&&item.placement?.topicId===topicId&&item.placement.sectionId===sectionId))sectionEvidence.add(id);
  }
  if(!current(await load({...options,expectedReadGeneration:generation})))return refuse('scope_changed');
  return {...sectionAIFields(row,sectionEvidence),sectionEvidence,complete:true,generation,recoveryEpoch,authority};
 }catch{return refuse('read_unavailable');}
}

// A new read generation after a local field ACK must not retire the same
// freshly qualified editor and its native Undo history. This is not authority
// reuse: the caller has just completed the original scope/evidence reads.
export function canRetainSectionAIEditor(editor,cached,projection,previousScope,nextScope){
 if(!editor||editor.disposed||editor.failed||editor.conflicted||editor.recoveryForeign||projection?.complete!==true)return false;
 let prior,next;try{prior=JSON.parse(previousScope);next=JSON.parse(nextScope);}catch{return false;}
 if(!Array.isArray(prior)||!Array.isArray(next)||prior.length!==6||next.length!==6||![0,1,2,3,5].every(index=>JSON.stringify(prior[index])===JSON.stringify(next[index]))||prior[2]!==true)return false;
 const sameSet=(left,right)=>left instanceof Set&&right instanceof Set&&left.size===right.size&&[...left].every(value=>right.has(value));
 if(!sameSet(editor.admittedFields,projection.admittedFields)||!sameSet(editor.sectionEvidence,projection.sectionEvidence))return false;
 const row=editor.row;
 if(!row||!cached)return false;
 // Compare the entire canonical DTO, including protections, optional identity
 // and every revision/evidence field. A draft is not a canonical row change.
 const keys=new Set([...Object.keys(row),...Object.keys(cached)]);
 return [...keys].every(key=>JSON.stringify(row[key])===JSON.stringify(cached[key]));
}
