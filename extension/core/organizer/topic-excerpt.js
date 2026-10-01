import {prefix} from '../thought-model.js';
import {bindingRead} from '../thought-binding.js';
import {entryMatchesProvider} from '../thought-source-scope.js';
import {expressionTime} from './expression-time.js';

export function exactExcerpt(body,maxUnits=140){
 let end=0;for(const part of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(body)){const next=part.index+part.segment.length;if(next>maxUnits)break;end=next;}
 return {text:body.slice(0,end),range:{start:0,end},truncated:end<body.length};
}
// Root cue is a bounded transient DTO, never saved in a Topic/read-index row.
// No generated summary becomes the default human-expression cue.
export async function topicRootExcerpt(s,t,topic,providerKey=null){
 if(providerKey===null&&topic.protections?.summary?.locked&&topic.authorship?.summary?.actor==='user'&&topic.summary)return {kind:'human_cue',topicId:topic.id,revision:topic.revision,...exactExcerpt(topic.summary)};
 const page=await t.rangePage('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),null,40);
 for(const {value:p} of page.rows){
  if(p.lifecycle!=='active'||providerKey!==null&&!await entryMatchesProvider(s,t,p.entryId,providerKey))continue;
  let row;try{row=await s.readableEntry(t,p.entryId);}catch{continue;}
  if(row.lifecycle!=='active'||!(row.provenanceType==='input_original'||row.origin==='user'||row.authorship?.body?.actor==='user'))continue;
  row=await bindingRead(s,t,row);const body=row.thoughtText;
  if(typeof body!=='string'||!body.trim())continue;
  return {kind:'exact_excerpt',entryId:row.id,revision:row.revision,...exactExcerpt(body),expressionTime:await expressionTime(s,t,row),role:row.bodyBinding==='input'?'working_input':row.provenanceType==='user_created'?'human_thought':'thought_expression'};
 }
 return null;
}
