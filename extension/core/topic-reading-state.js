import {READING_ROW,MAX_READING_ANCHORS,safeOffset} from './reader-state.js';
import {keys,fail,idOK} from './thought-model.js';
export async function topicPosition(s,r){
 keys(r,['topicId','entryId','revision','offset','sort','expanded'],['topicId']);if(!idOK(r.topicId))fail();await s.finishFoundation();
 return s.run(()=>s.repository.transaction(!!r.entryId,async t=>{const topic=await s.canonicalTopic(t,r.topicId);if(topic.lifecycle!=='active')return null;const saved=await t.get('meta',READING_ROW)||{id:READING_ROW,version:1,anchors:[]};if(saved.version!==1)fail();
  if(r.entryId){if(!idOK(r.entryId)||!Number.isSafeInteger(r.revision)||!Number.isSafeInteger(r.offset)||r.offset<0||!['asc','desc'].includes(r.sort)||!Array.isArray(r.expanded)||r.expanded.length>100||r.expanded.some(x=>!idOK(x)))fail();const row=await s.readableEntry(t,r.entryId),p=await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,r.entryId]));if(row.lifecycle!=='active'||p?.lifecycle!=='active'||row.revision!==r.revision)return {saved:false};const anchor={...r,kind:'topic',offset:safeOffset(row.thoughtText,r.offset),at:s.clock()};saved.anchors=[anchor,...saved.anchors.filter(x=>x.topicId!==r.topicId)].slice(0,MAX_READING_ANCHORS);await t.put('meta',saved);return {saved:true};}
  const anchor=saved.anchors.find(x=>x.kind==='topic'&&x.topicId===r.topicId);if(!anchor)return null;let row;try{row=await s.readableEntry(t,anchor.entryId);}catch{}const placement=await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,anchor.entryId]));if(row?.lifecycle!=='active'||placement?.lifecycle!=='active')return {nearby:true,sort:anchor.sort};return {...anchor,revision:row.revision,offset:safeOffset(row.thoughtText,anchor.offset)};
 }));
}
