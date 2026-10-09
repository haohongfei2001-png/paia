import {READING_ROW,MAX_READING_ANCHORS,safeOffset} from './reader-state.js';
import {keys,fail,idOK,prefix} from './thought-model.js';
import {entryTime} from './organizer/topic-chronology.js';
const readable=row=>row?.lifecycle==='active'&&!(row.staleReasons?.includes('source_purged')&&!row.thoughtText);
async function readingOrder(t,topic,row,placement){
 const section=await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,placement.sectionId])),time=await entryTime(t,row.id);
 return {sectionId:placement.sectionId,sectionRank:String(section?.rank||placement.sectionRank||''),time:Date.parse(time.sourceSentAt||time.capturedAt||row.createdAt)||0,entryId:row.id};
}
const compareOrder=(a,b,sort)=>a.sectionRank.localeCompare(b.sectionRank)||a.sectionId.localeCompare(b.sectionId)||(sort==='desc'?-1:1)*(a.time-b.time||a.entryId.localeCompare(b.entryId));
// Keep only ordering metadata for the old location. Resolving it streams the
// existing placement index and retains two candidates, never a body cache.
async function nearbyPosition(s,t,topic,anchor,previous,placement){
 const order=anchor.position||(previous&&placement?await readingOrder(t,topic,previous,placement):null);let cursor=null,next=null,last=null;
 do{const page=await t.rangePage('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),cursor,100);
  for(const {value:p}of page.rows){let row;try{row=await s.readableEntry(t,p.entryId);}catch{continue;}if(!readable(row))continue;const position=await readingOrder(t,topic,row,p),candidate={entryId:row.id,revision:row.revision,position};
   if(!last||compareOrder(position,last.position,anchor.sort)>0)last=candidate;
   if((!order||compareOrder(position,order,anchor.sort)>=0)&&(!next||compareOrder(position,next.position,anchor.sort)<0))next=candidate;
  }cursor=page.next;
 }while(cursor!==null);
 const found=next||last;return found?{...anchor,...found,offset:0,expanded:[],nearby:true}:{nearby:true,sort:anchor.sort};
}
export async function topicPosition(s,r){
 keys(r,['topicId','entryId','revision','offset','sort','expanded'],['topicId']);if(!idOK(r.topicId))fail();await s.finishFoundation();
 return s.run(()=>s.repository.transaction(!!r.entryId,async t=>{const topic=await s.canonicalTopic(t,r.topicId);if(topic.lifecycle!=='active')return null;const saved=await t.get('meta',READING_ROW)||{id:READING_ROW,version:1,anchors:[]};if(saved.version!==1)fail();
  if(r.entryId){if(!idOK(r.entryId)||!Number.isSafeInteger(r.revision)||!Number.isSafeInteger(r.offset)||r.offset<0||!['asc','desc'].includes(r.sort)||!Array.isArray(r.expanded)||r.expanded.length>100||r.expanded.some(x=>!idOK(x)))fail();const row=await s.readableEntry(t,r.entryId),p=await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,r.entryId]));if(!readable(row)||p?.lifecycle!=='active'||row.revision!==r.revision)return {saved:false};const anchor={...r,kind:'topic',position:await readingOrder(t,topic,row,p),offset:safeOffset(row.thoughtText,r.offset),at:s.clock()};saved.anchors=[anchor,...saved.anchors.filter(x=>x.topicId!==r.topicId)].slice(0,MAX_READING_ANCHORS);await t.put('meta',saved);return {saved:true};}
  const anchor=saved.anchors.find(x=>x.kind==='topic'&&x.topicId===r.topicId);if(!anchor)return null;let row;try{row=await s.readableEntry(t,anchor.entryId);}catch{}const placement=await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,anchor.entryId]));if(!readable(row)||placement?.lifecycle!=='active')return nearbyPosition(s,t,topic,anchor,row,placement);return {...anchor,revision:row.revision,offset:safeOffset(row.thoughtText,anchor.offset)};
 }));
}
