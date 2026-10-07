import {idOK,reject,validateMemoryRow} from './model.js';
import {prefix} from '../thought-model.js';

// Structural edits cannot discard a saved negative witness. Positive grants and
// explicit permission changes remain owned by Memory; all reads below share the
// caller's canonical write transaction, including generation activation/history.
async function restrictions(t){
 const topics=new Set(),sections=new Set(),sectionTopics=new Set();
 for(const kind of ['topic','section']){
  let after=null;
  do{
   const page=await t.primaryRangePage('meta',{prefix:'memory:'+kind+':',after,limit:100});
   for(const {value:row} of page.rows){
    if(!validateMemoryRow(row))reject();
    if(kind==='topic'&&['denied','never'].includes(row.decision))topics.add(row.topicId);
    if(kind==='section'){sections.add(JSON.stringify([row.topicId,row.sectionId]));sectionTopics.add(row.topicId);}
   }
   after=page.next;
  }while(after);
 }
 return {topics,sections,sectionTopics};
}
function assertRetained(p,topicId,before,after){
 if(before?.lifecycle!=='active')return;
 if(p.topics.has(topicId)&&after?.lifecycle!=='active'||p.sections.has(JSON.stringify([topicId,before.sectionId]))&&(after?.lifecycle!=='active'||after.sectionId!==before.sectionId))reject('MEMORY_DENIED');
}
export async function assertMemoryPlacementChangeAllowed(t,topicId,before,after){
 if(!idOK(topicId))reject();
 if(before?.lifecycle!=='active'||after?.lifecycle==='active'&&before.sectionId===after.sectionId)return;
 assertRetained(await restrictions(t),topicId,before,after);
}
// nextGeneration:null removes this Topic's memberships. A Section mapping is
// used for pre-staging admission; a concrete generation is checked at activation
// and Undo/Redo against actual rows, never a predicted count or cached scope.
export async function assertMemoryTopicTransitionAllowed(t,topic,{nextGeneration=topic.activeLayoutGeneration,sectionId=null,targetSectionId=null}={}){
 if(!idOK(topic?.id)||sectionId!==null&&(!idOK(sectionId)||!idOK(targetSectionId)))reject();
 if(topic.lifecycle!=='active'||topic.redirectTo)return;
 const p=await restrictions(t);if(!p.topics.has(topic.id)&&!p.sectionTopics.has(topic.id))return;let cursor=null;
 do{
  const page=await t.rangePage('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration]),cursor,100);
  for(const {value:before} of page.rows){
   if(before.lifecycle!=='active')continue;
   const after=nextGeneration===null?null:sectionId!==null?{...before,sectionId:before.sectionId===sectionId?targetSectionId:before.sectionId}:nextGeneration===topic.activeLayoutGeneration?before:await t.get('placements',JSON.stringify([topic.id,nextGeneration,before.entryId]));
   assertRetained(p,topic.id,before,after);
  }
  cursor=page.next;
 }while(cursor);
}
