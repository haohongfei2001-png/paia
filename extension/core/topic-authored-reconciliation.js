import {readAuthoredEntryContext,authoredSelectedFields,authoredSelectedText} from './context-authored-entry.js';
import {keys,same,fail} from './thought-model.js';

// Exact typed evidence for an already human-anchored Entry. This is not an
// Input/Source, recurrence contribution, or authority to create/move a Topic.
// Callers must supply independent field and Topic processing qualification.
export async function readAuthoredTopicReconciliation(store,t,entryId,descriptor=null){
 const mapping=await readAuthoredEntryContext(store,t,entryId,descriptor);if(!mapping)return null;
 const topic=await t.get('topics',mapping.topicId),entry=await t.get('thoughts',entryId);
 // Human-created source-free identity labels need no additional Source read.
 // Generated labels retain their independent source qualification requirement.
 if(topic?.createdBy!=='user'||topic.identity?.origin!=='user'||topic.sourceRecordIds?.length||typeof topic.name!=='string'||!topic.name.trim()||topic.name.length>300)return null;
 const fields=authoredSelectedFields(mapping),text=authoredSelectedText(entry,fields);
 if(fields.some(field=>typeof text[field]!=='string'))return null;
 return {mapping,material:{version:1,kind:'human_entry_same_topic',entryId,entryRevision:mapping.entryRevision,topicId:mapping.topicId,topicRevision:mapping.topicRevision,topicOrganizationRevision:mapping.topicOrganizationRevision,topicName:topic.name,selectedFields:[...fields],fields:text}};
}
export function evaluateAuthoredTopicReconciliation(assessment,material){
 keys(assessment,['version','kind','entryId','topicId','relation','citations'],['version','kind','entryId','topicId','relation','citations']);
 if(material?.version!==1||material.kind!=='human_entry_same_topic'||assessment.version!==1||assessment.kind!==material.kind||assessment.entryId!==material.entryId||assessment.topicId!==material.topicId||assessment.relation!=='same'||!Array.isArray(assessment.citations)||assessment.citations.length>100)fail();
 const selected=material.selectedFields;if(!Array.isArray(selected)||!same(selected,[...new Set(selected)].sort()))fail();
 const spans=new Map(selected.map(field=>[field,[]]));
 for(const c of assessment.citations){
  keys(c,['entryId','field','start','end'],['entryId','field','start','end']);const text=material.fields[c.field];
  if(c.entryId!==material.entryId||!spans.has(c.field)||typeof text!=='string'||!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||c.end<=c.start||c.end>text.length)fail();spans.get(c.field).push(c);
 }
 for(const field of selected){const text=material.fields[field];if(typeof text!=='string')fail();let end=0;for(const span of spans.get(field).sort((a,b)=>a.start-b.start)){if(span.start>end)fail();end=Math.max(end,span.end);}if(end!==text.length)fail();}
 return {outcome:'reuse',reason:'same_human_entry_identity',topicIds:[material.topicId],entryIds:[material.entryId],createdEntryIds:[],checks:{humanIntent:true,selectedFields:true,semanticIdentity:true}};
}
