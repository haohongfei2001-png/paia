import {reject} from './contracts.js';

// The single provider/persistence contract. Runtime metadata never belongs here.
export const AI_SCHEMA_VERSION=1;
export const AI_CONTEXT_BYTES=16384;
export const AI_LIST_FIELDS=Object.freeze(['keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution']);
export const AI_FIELDS=Object.freeze(['blockSummary','currentView',...AI_LIST_FIELDS]);
export const AI_TEXT_LIMITS=Object.freeze({blockSummary:300,currentView:4000,item:2000,items:20,evidence:100});
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);

export function validateAIPresentation(output,request){
 if(!record(output)||Object.keys(output).some(key=>!['topicId',...AI_FIELDS,'evidenceEntryIds','fieldEvidenceEntryIds'].includes(key))||output.topicId!==request.topicCandidates[0]?.id||!AI_FIELDS.some(f=>typeof output[f]==='string'||Array.isArray(output[f])))reject('INVALID_OUTPUT');
 // A truncated suffix or omitted list item can change meaning (negation, conditions, corrections).
 // Refuse the complete response before normalization; never persist a plausible clipped statement.
 for(const field of ['blockSummary','currentView'])if(typeof output[field]==='string'&&output[field].trim().length>AI_TEXT_LIMITS[field])reject('INVALID_OUTPUT');
 for(const field of AI_LIST_FIELDS)if(Array.isArray(output[field])&&(output[field].length>AI_TEXT_LIMITS.items||output[field].some(row=>typeof row?.text==='string'&&row.text.trim().length>AI_TEXT_LIMITS.item)))reject('INVALID_OUTPUT');
 let old=null;try{old=JSON.parse(request.context?.find(x=>x.ref==='existing-presentation')?.text||'null');}catch{reject('INVALID_OUTPUT');}
 const allowed=new Set([...request.inputs.map(x=>x.ref),...(Array.isArray(old?.evidenceEntryIds)?old.evidenceEntryIds:[])]);
 // Missing legal defaults remain compatible. Explicit malformed or unsupported
 // fields fail as one response, before normalization can hide lost meaning.
 const evidence=ids=>{if(!Array.isArray(ids)||ids.length>AI_TEXT_LIMITS.evidence||ids.some(id=>typeof id!=='string'||!allowed.has(id)))reject('INVALID_OUTPUT');return [...new Set(ids)];};
 const roots=output.evidenceEntryIds===undefined?[...allowed]:evidence(output.evidenceEntryIds);
 const result={topicId:output.topicId,blockSummary:'',currentView:''},fieldEvidenceEntryIds={};
 for(const field of ['blockSummary','currentView']){
  if(output[field]!==undefined&&typeof output[field]!=='string')reject('INVALID_OUTPUT');
  result[field]=(output[field]||'').trim();
  const ids=output.fieldEvidenceEntryIds?.[field]===undefined?roots:evidence(output.fieldEvidenceEntryIds[field]);
  if(ids.some(id=>!roots.includes(id))||result[field]&&!ids.length)reject('INVALID_OUTPUT');fieldEvidenceEntryIds[field]=ids;
 }
 for(const field of AI_LIST_FIELDS){
  if(output[field]!==undefined&&!Array.isArray(output[field]))reject('INVALID_OUTPUT');result[field]=[];
  for(const row of output[field]||[]){if(!record(row)||Object.keys(row).some(key=>!['text','evidenceEntryIds'].includes(key))||typeof row.text!=='string'||!row.text.trim())reject('INVALID_OUTPUT');const ids=evidence(row.evidenceEntryIds);if(!ids.length)reject('INVALID_OUTPUT');result[field].push({text:row.text.trim(),evidenceEntryIds:ids});}
  fieldEvidenceEntryIds[field]=[...new Set(result[field].flatMap(row=>row.evidenceEntryIds))];
 }
 if(output.fieldEvidenceEntryIds!==undefined&&(!record(output.fieldEvidenceEntryIds)||Object.keys(output.fieldEvidenceEntryIds).length!==AI_FIELDS.length||AI_FIELDS.some(field=>!Array.isArray(output.fieldEvidenceEntryIds[field])||JSON.stringify(evidence(output.fieldEvidenceEntryIds[field]))!==JSON.stringify(fieldEvidenceEntryIds[field]))))reject('INVALID_OUTPUT');
 if(!result.blockSummary&&!result.currentView&&!AI_LIST_FIELDS.some(field=>result[field].length))reject('INVALID_OUTPUT');
 return {...result,evidenceEntryIds:[...new Set([...roots,...Object.values(fieldEvidenceEntryIds).flat()])],fieldEvidenceEntryIds};
}

export function isStoredAIPresentation(row,allowed){
 if(!record(row)||typeof row.topicId!=='string'||!Number.isSafeInteger(row.revision)||!Array.isArray(row.evidenceEntryIds)||row.evidenceEntryIds.some(id=>!allowed.has(id)))return false;
 if(['blockSummary','currentView'].some(f=>typeof row[f]!=='string'||row[f].length>AI_TEXT_LIMITS[f]||row[f].trim()&&!row.evidenceEntryIds.length))return false;
 return AI_LIST_FIELDS.every(f=>Array.isArray(row[f])&&row[f].length<=20&&row[f].every(x=>record(x)&&typeof x.text==='string'&&x.text.length<=2000&&Array.isArray(x.evidenceEntryIds)&&x.evidenceEntryIds.length>0&&x.evidenceEntryIds.every(id=>allowed.has(id))));
}
export const presentationContent=row=>Object.fromEntries(['topicId',...AI_FIELDS,'evidenceEntryIds'].map(k=>[k,structuredClone(row[k])]));
