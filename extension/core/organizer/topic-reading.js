import {prefix,fail,idOK} from '../thought-model.js';
import {entryTime} from './topic-chronology.js';
import {hashText} from '../dedupe.js';
const normalized=value=>String(value||'').normalize('NFKC').toLocaleLowerCase();
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
// The time order is a read projection. It never changes manual layout ranks.
// Only lightweight ordered descriptors survive the scan; bodies are paginated.
export async function topicReadingPage(s,{topicId,sort='asc',query='',cursor=null,limit=40,trackedEntryIds=[]}){
 if(!idOK(topicId)||!['asc','desc'].includes(sort)||typeof query!=='string'||query.length>500||!Number.isInteger(limit)||limit<1||limit>100||!Array.isArray(trackedEntryIds)||trackedEntryIds.length>100||trackedEntryIds.some(id=>!idOK(id)))fail();
 await s.finishFoundation();const needle=normalized(query.trim());
 const scan=await s.run(()=>s.repository.transaction(false,async t=>{
  const topic=await s.canonicalTopic(t,topicId),sections=await t.all('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0])),sectionMap=new Map(sections.map(x=>[x.sectionId,x]));
  const generation=topic.activeLayoutGeneration,organizationRevision=topic.organizationRevision;
  if(cursor&&(cursor.topicId!==topic.id||cursor.generation!==generation||cursor.organizationRevision!==organizationRevision||cursor.sort!==sort||cursor.query!==needle||!Number.isInteger(cursor.offset)||cursor.offset<0))return {cursorInvalid:true,topic};
  const descriptors=[];for(const p of await t.all('placements','byTopicOrder',prefix([topic.id,generation,0]))){
   let row;try{row=await s.readableEntry(t,p.entryId);}catch{continue;}if(row.lifecycle!=='active')continue;
   if(needle&&![row.thoughtText,row.title,row.note,sectionMap.get(p.sectionId)?.title].some(v=>normalized(v).includes(needle)))continue;
   const time=await entryTime(t,row.id),effectiveTime=time.sourceSentAt||time.capturedAt||row.createdAt||null;
   descriptors.push({placement:p,time:{...time,effectiveTime,timeBasis:time.sourceSentAt?'source':time.capturedAt?'capture':'created'},value:Date.parse(effectiveTime)||0});
  }
  const direction=sort==='asc'?1:-1;descriptors.sort((a,b)=>String(sectionMap.get(a.placement.sectionId)?.rank||a.placement.sectionRank).localeCompare(String(sectionMap.get(b.placement.sectionId)?.rank||b.placement.sectionRank))||a.placement.sectionId.localeCompare(b.placement.sectionId)||direction*(a.value-b.value||a.placement.entryId.localeCompare(b.placement.entryId)));
  return {topic,sections,descriptors,generation,organizationRevision};
 }));
 const tracked=[];for(const id of trackedEntryIds){try{const e=await s.entry(id);tracked.push({id,lifecycle:e.lifecycle,purged:e.staleReasons?.includes('source_purged')||false,revision:e.revision,fieldRevisions:e.fieldRevisions});}catch{tracked.push({id,lifecycle:'unavailable',purged:true});}}
 if(scan.cursorInvalid)return {...scan,tracked};
 const viewRevision=await hashText(JSON.stringify(scan.descriptors.map(d=>[d.placement.id,d.placement.sectionId,d.value])));
 if(cursor&&cursor.viewRevision!==viewRevision)return {cursorInvalid:true,topic:scan.topic,tracked};
 let offset=cursor?.offset||0,size=bytes(scan.topic)+bytes(scan.sections);const items=[];
 while(offset<scan.descriptors.length&&items.length<limit){const d=scan.descriptors[offset];let e;try{e=await s.entry(d.placement.entryId);}catch{offset++;continue;}if(e.lifecycle!=='active'){offset++;continue;}let entry={...s.documentEntry(e),...d.time,createdAt:e.createdAt,provenanceType:e.provenanceType};if(bytes(entry)>128*1024)entry={id:e.id,revision:e.revision,large:true,title:e.title,bodyBytes:bytes(e.body),...d.time};const item={placement:d.placement,entry};if(items.length&&size+bytes(item)>256*1024)break;items.push(item);size+=bytes(item);offset++;}
 const sectionStarts={};scan.descriptors.forEach((d,i)=>{sectionStarts[d.placement.sectionId]??={topicId:scan.topic.id,generation:scan.generation,organizationRevision:scan.organizationRevision,viewRevision,sort,query:needle,offset:i};});
 return {sectionStarts,topic:scan.topic,sections:scan.sections,sectionCursor:null,items,tracked,matchCount:scan.descriptors.length,sort,query:needle,nextCursor:offset<scan.descriptors.length?{topicId:scan.topic.id,generation:scan.generation,organizationRevision:scan.organizationRevision,viewRevision,sort,query:needle,offset}:null};
}
