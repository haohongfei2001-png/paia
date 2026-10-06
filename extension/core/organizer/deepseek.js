import {validateAIPresentation,AI_CONTEXT_BYTES} from './ai-contract.js';
import {bytes,object,reject} from './contracts.js';
import {existingSectionForProposal,isGenericSectionName,stabilizeTopicProposal} from './topic-quality.js';

// Historical model metadata and pure contracts remain for existing saved AI
// output and shared organizer validation. No credentials or provider transport.
export const DEEPSEEK_MODEL='deepseek-v4-flash';
export const TASK_PROFILES=Object.freeze(['original_classification','ai_synthesis']);
const allowedTypes=new Set(['fact','event','preference','decision','judgment','idea','goal_plan','reflection','creation']);
const safeText=x=>typeof x==='string'&&x.length>0;

function validateTopicCandidate(item){object(item,['id','name','sections'],['id','name','sections']);if(!safeText(item.id)||!safeText(item.name)||!Array.isArray(item.sections)||item.sections.length>20)reject('INVALID_OUTPUT');for(const section of item.sections){object(section,['id','name'],['id','name']);if(!safeText(section.id)||!safeText(section.name))reject('INVALID_OUTPUT');}}
export function validateDeepSeekRequest(request,limits){
 object(request,['requestId','taskProfile','inputs','context','topicCandidates','budget'],['requestId','taskProfile','inputs','context','topicCandidates','budget']);
 if(!safeText(request.requestId)||!TASK_PROFILES.includes(request.taskProfile)||!Array.isArray(request.inputs)||!request.inputs.length||request.inputs.length>limits.maxInputs||!Array.isArray(request.context)||request.context.length>limits.maxContext)reject('INVALID_OUTPUT');
 for(const item of [...request.inputs,...request.context]){object(item,['ref','role','text'],['ref','role','text']);if(!safeText(item.ref)||!['primary','context_only'].includes(item.role)||!safeText(item.text))reject('INVALID_OUTPUT');}
 if(!Array.isArray(request.topicCandidates)||request.topicCandidates.length>20)reject('INVALID_OUTPUT');for(const item of request.topicCandidates)validateTopicCandidate(item);
 if(bytes(request.inputs)>limits.maxContentBytes||bytes(request.context)>(request.taskProfile==='ai_synthesis'?AI_CONTEXT_BYTES:limits.maxContextBytes)||bytes(request)>limits.maxRequestBytes)reject('BUDGET_EXCEEDED');
 return structuredClone(request);
}

// This adapter boundary accepts only the already-gated gateway DTO. It never
// receives a store, Source Record, repository handle, or raw archive object.
export function requestFromInputProjection(projection,taskProfile){
 if(!projection?.request||!TASK_PROFILES.includes(taskProfile))reject('INVALID_OUTPUT');const source=projection.request;
 const inputs=source.inputs.filter(x=>x.role!=='context_only').map(x=>({ref:x.ref,role:x.role,text:x.fields?.body}));
 const context=source.inputs.filter(x=>x.role==='context_only').map(x=>({ref:x.ref,role:x.role,text:x.fields?.body}));
 return {requestId:source.requestId,taskProfile,inputs,context,topicCandidates:source.topicCandidates||[],budget:{maxOutputBytes:source.budget?.maxOutputBytes}};
}

function itemFailure(inputRef,code='INVALID_PROVIDER_OUTPUT'){return {inputRef,code};}
function validateOriginalItem(row,request){
 object(row,['inputRef','topic','section','type','relatedGroupingCandidate','spans','uncertain'],['inputRef','spans','uncertain']);
 if(!safeText(row.inputRef)||!request.inputs.some(x=>x.ref===row.inputRef)||typeof row.uncertain!=='boolean'||!Array.isArray(row.spans)||row.spans.length>10)reject('INVALID_OUTPUT');
 if(row.type!==undefined&&!allowedTypes.has(row.type))reject('INVALID_OUTPUT');
 if(row.relatedGroupingCandidate!==undefined&&row.relatedGroupingCandidate!==null&&!safeText(row.relatedGroupingCandidate))reject('INVALID_OUTPUT');
 // Classification uncertainty must not discard a validated original quotation.
 const topicValue=row.topic??{},sectionValue=row.section??{};object(topicValue,['existingTopicId','proposedName'],[]);object(sectionValue,['existingSectionId','proposedName'],[]);
 const topic={},section={},existingTopic=request.topicCandidates.find(x=>x.id===topicValue.existingTopicId);
 if(existingTopic)topic.existingTopicId=existingTopic.id;else if(safeText(topicValue.proposedName))topic.proposedName=topicValue.proposedName.trim().slice(0,200);
 const existingSection=existingTopic?.sections.find(x=>x.id===sectionValue.existingSectionId);
 if(existingSection)section.existingSectionId=existingSection.id;else if(safeText(sectionValue.proposedName))section.proposedName=sectionValue.proposedName.trim().slice(0,200);
 const input=request.inputs.find(x=>x.ref===row.inputRef),spans=[];for(const span of row.spans){object(span,['start','end'],['start','end']);if(!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||span.end<=span.start||span.end>input.text.length)reject('SPAN_VALIDATION_FAILED');spans.push({...span});}
 // Round 5 Topic Quality: preserve a model-selected valid existing Topic, but
 // conservatively rescue near-duplicate or low-durability new Topic proposals.
 // This is a local deterministic post-validation policy and never adds a request.
 if(!topic.existingTopicId){const stability=stabilizeTopicProposal({inputText:input.text,proposedName:topic.proposedName,relatedGroupingCandidate:row.relatedGroupingCandidate,topicCandidates:request.topicCandidates});if(stability.existingTopicId){delete topic.proposedName;topic.existingTopicId=stability.existingTopicId;const candidate=request.topicCandidates.find(x=>x.id===stability.existingTopicId);if(!section.existingSectionId){const matched=existingSectionForProposal(candidate,section.proposedName);if(matched){delete section.proposedName;section.existingSectionId=matched;}else if(stability.promotedSectionName&&(!section.proposedName||isGenericSectionName(section.proposedName))){const promoted=existingSectionForProposal(candidate,stability.promotedSectionName);if(promoted){delete section.proposedName;section.existingSectionId=promoted;}else section.proposedName=stability.promotedSectionName;}else if(section.proposedName&&isGenericSectionName(section.proposedName))delete section.proposedName;}}else if(stability.suppressNewTopic){for(const key of Object.keys(topic))delete topic[key];for(const key of Object.keys(section))delete section[key];}}
 else if(!section.existingSectionId&&section.proposedName){const candidate=request.topicCandidates.find(x=>x.id===topic.existingTopicId),matched=existingSectionForProposal(candidate,section.proposedName);if(matched){delete section.proposedName;section.existingSectionId=matched;}}
 return {inputRef:row.inputRef,topic,section,type:row.type||'idea',relatedGroupingCandidate:row.relatedGroupingCandidate??null,spans,uncertain:row.uncertain};
}

export function validateDeepSeekResponse(profile,output,request,limits){
 if(typeof output==='string'){if(bytes(output)>limits.maxOutputBytes)reject('INVALID_PROVIDER_OUTPUT');try{output=JSON.parse(output);}catch{reject('INVALID_OUTPUT');}}
 if(bytes(output)>limits.maxOutputBytes)reject('INVALID_PROVIDER_OUTPUT');
 if(profile==='original_classification'){
  object(output,['items'],['items']);if(!Array.isArray(output.items)||output.items.length>request.inputs.length*2)reject('INVALID_OUTPUT');
  const accepted=[],failures=[],seen=new Set();for(const row of output.items){const ref=safeText(row?.inputRef)&&request.inputs.some(x=>x.ref===row.inputRef)?row.inputRef:null;if(!ref)continue;if(seen.has(ref)){failures.push(itemFailure(ref));continue;}seen.add(ref);try{accepted.push(validateOriginalItem(row,request));}catch(error){failures.push(itemFailure(ref,error?.code==='SPAN_VALIDATION_FAILED'?'SPAN_VALIDATION_FAILED':'INVALID_PROVIDER_OUTPUT'));}}
  for(const input of request.inputs)if(!seen.has(input.ref))failures.push(itemFailure(input.ref));
  const failedRefs=new Set(failures.map(x=>x.inputRef));return {items:accepted.filter(x=>!failedRefs.has(x.inputRef)),invalidItems:[...new Map(failures.map(x=>[x.inputRef,x])).values()]};
 }
 return validateAIPresentation(output,request);
}
