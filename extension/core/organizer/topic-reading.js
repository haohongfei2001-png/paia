import {prefix,fail,idOK} from '../thought-model.js';
import {entryTime} from './topic-chronology.js';
import {thoughtTopicDescriptorPage,invalidateThoughtTopicIndex} from '../thought-read-index.js';

const normalized=value=>String(value||'').normalize('NFKC').toLocaleLowerCase();
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const activePlacement=p=>p?.lifecycle==='active';
const sectionCursorOK=(cursor,topic)=>!cursor||(cursor.topicId===topic.id&&cursor.generation===topic.activeLayoutGeneration&&cursor.organizationRevision===topic.organizationRevision);

async function describePlacement(s,t,topic,p){
 if(!activePlacement(p))return null;
 const row=await t.get('thoughts',p.entryId);
 if(!row||row.storageSchema!==2||row.lifecycle!=='active')return null;
 const time=await entryTime(t,row.id),effectiveTime=time.sourceSentAt||time.capturedAt||row.createdAt||null;
 return {
  topicId:topic.id,layoutGeneration:topic.activeLayoutGeneration,
  entryId:p.entryId,sectionId:p.sectionId,sectionRank:p.sectionRank,rank:p.rank,
  placementRevision:p.revision,
  ...time,effectiveTime,
  timeBasis:time.sourceSentAt?'source':time.capturedAt?'capture':row.createdAt?'created':'unknown'
 };
}
const descriptorReader=s=>(t,topic,p)=>describePlacement(s,t,topic,p);
const cursorView=cursor=>cursor?{generation:cursor.generation,viewKey:cursor.viewKey,sort:cursor.sort,key:cursor.key}:null;
const wrapCursor=(topicId,query,cursor)=>cursor?{topicId,query,...cursor}:null;

export async function topicSectionsPage(s,{topicId,cursor=null,limit=100}={}){
 if(!idOK(topicId)||!Number.isInteger(limit)||limit<1||limit>100)fail();
 await s.finishFoundation();
 return s.run(()=>s.repository.transaction(false,async t=>{
  const topic=await s.canonicalTopic(t,topicId);
  if(!sectionCursorOK(cursor,topic))return {cursorInvalid:true,topic,items:[],nextCursor:null};
  const page=await t.rangePage('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),cursor?.key||null,limit),items=[];
  for(const {value:raw} of page.rows){
   const row=s.safeOrganization?await s.safeOrganization(t,'section',raw):raw;
   if(row?.lifecycle==='active'&&!row.redirectTo)items.push(row);
  }
  return {
   topic,items,
   nextCursor:page.next?{topicId:topic.id,generation:topic.activeLayoutGeneration,organizationRevision:topic.organizationRevision,key:page.next}:null
  };
 }));
}

export async function topicAdjacency(s,{topicId,kind,id,direction,sectionId=null}={}){
 if(!idOK(topicId)||!idOK(id)||!['section','entry'].includes(kind)||!['up','down'].includes(direction)||kind==='entry'&&!idOK(sectionId))fail();
 await s.finishFoundation();
 return s.run(()=>s.repository.transaction(false,async t=>{
  const topic=await s.canonicalTopic(t,topicId);
  const store=kind==='section'?'sections':'placements',index=kind==='section'?'byTopicOrder':'bySectionOrder';
  const range=kind==='section'?prefix([topic.id,topic.activeLayoutGeneration,0]):prefix([topic.id,topic.activeLayoutGeneration,sectionId,0]);
  let cursor=null,previous=null,found=false,scanned=0;
  for(let batches=0;batches<100;batches++){
   const page=await t.rangePage(store,index,range,cursor,100);
   for(const {value:raw} of page.rows){
    scanned++;
    const active=raw?.lifecycle==='active'&&!raw.redirectTo;
    if(!active)continue;
    const currentId=kind==='section'?raw.sectionId:raw.entryId;
    if(found)return {id:currentId,boundary:false,scanned};
    if(currentId===id){
     if(direction==='up')return {id:previous,boundary:previous===null,scanned};
     found=true;continue;
    }
    previous=currentId;
   }
   if(!page.next)break;cursor=page.next;
  }
  if(found&&direction==='down')return {id:null,boundary:true,scanned};
  return {id:null,boundary:true,missing:true,scanned};
 }));
}

async function sectionRowsFor(s,topic,ids){
 const unique=[...new Set(ids.filter(Boolean))],out=[];
 if(!unique.length)return out;
 return s.run(()=>s.repository.transaction(false,async t=>{
  for(const id of unique){
   const raw=await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,id]));
   const row=raw&&(s.safeOrganization?await s.safeOrganization(t,'section',raw):raw);
   if(row?.lifecycle==='active'&&!row.redirectTo)out.push(row);
  }
  return out;
 }));
}

async function invalidateForTimeMismatch(s,topicId){
 await s.run(()=>s.repository.transaction(true,t=>invalidateThoughtTopicIndex(s,t,topicId,{sourceTime:true})));
}

// Time-sorted Topic reading now pages a body-free generation projection.
// Only the descriptor chunk selected for this response resolves canonical
// Thought bodies, so a warm next chunk never rescans the entire Topic.
export async function topicReadingPage(s,{topicId,sort='asc',query='',cursor=null,limit=40,trackedEntryIds=[],anchorId=null,sectionCursor=null,direction='next'}={}){
 if(!idOK(topicId)||!['asc','desc'].includes(sort)||!['next','prev'].includes(direction)||typeof query!=='string'||query.length>500||!Number.isInteger(limit)||limit<1||limit>40||!Array.isArray(trackedEntryIds)||trackedEntryIds.length>100||trackedEntryIds.some(id=>!idOK(id))||anchorId!==null&&!idOK(anchorId))fail();
 await s.finishFoundation();const needle=normalized(query.trim());
 if(cursor&&(cursor.topicId!==topicId||cursor.query!==needle||cursor.sort!==sort))return {cursorInvalid:true,items:[],tracked:[]};
 const descriptor=await thoughtTopicDescriptorPage(s,{
  topicId,sort,cursor:cursorView(cursor),limit,direction,
  anchorId:anchorId||null,describe:descriptorReader(s)
 });
 const tracked=trackedEntryIds.length?await s.trackedLibraryEntries({ids:trackedEntryIds}):[];
 const topic=await s.topic(topicId);
 if(descriptor.cursorInvalid)return {cursorInvalid:true,topic,tracked,items:[],coverage:descriptor.coverage,operations:descriptor.operations};
 if(descriptor.indexing)return {topic,tracked,items:[],sort,query:needle,indexing:true,coverage:descriptor.coverage,operations:descriptor.operations,nextCursor:null,previousCursor:null,sections:[],sectionCursor:null,matchCount:null};

 const placements=await s.run(()=>s.repository.transaction(false,async t=>{
  const rows=new Map();
  for(const d of descriptor.items){
   const p=await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,d.entryId]));
   if(activePlacement(p)&&p.revision===d.placementRevision)rows.set(d.entryId,p);
  }
  return rows;
 }));
 if(placements.size!==descriptor.items.length)return {cursorInvalid:true,topic,tracked,items:[],coverage:descriptor.coverage,operations:descriptor.operations};

 const sectionIds=descriptor.items.map(d=>d.sectionId),candidateSections=await sectionRowsFor(s,topic,sectionIds),sectionById=new Map(candidateSections.map(row=>[row.sectionId,row]));
 const items=[];let size=bytes(topic)+bytes(candidateSections),timeMismatch=false;
 for(const d of descriptor.items){
  const p=placements.get(d.entryId),section=sectionById.get(d.sectionId);
  if(!p||!section)continue;
  let e;try{e=await s.readingEntry(d.entryId);}catch{continue;}
  if(e.lifecycle!=='active')continue;
  if((e.sourceSentAt||null)!==(d.sourceSentAt||null)||(e.capturedAt||null)!==(d.capturedAt||null)){timeMismatch=true;break;}
  if(needle&&![e.body,e.title,e.note,section.title].some(value=>normalized(value).includes(needle)))continue;
  let entry={...e,effectiveTime:d.effectiveTime,timeBasis:d.timeBasis};
  if(bytes(entry)>128*1024)entry={id:e.id,revision:e.revision,large:true,title:e.title,bodyBytes:bytes(e.body),sourceSentAt:e.sourceSentAt||null,capturedAt:e.capturedAt||null,effectiveTime:d.effectiveTime,timeBasis:d.timeBasis,createdAt:e.createdAt,provenanceType:e.provenanceType};
  const item={placement:p,entry};
  if(items.length&&size+bytes(item)>256*1024)break;
  items.push(item);size+=bytes(item);
 }
 if(timeMismatch){await invalidateForTimeMismatch(s,topicId);return {cursorInvalid:true,topic,tracked,items:[],coverage:descriptor.coverage,operations:descriptor.operations};}

 const sectionPage=await topicSectionsPage(s,{topicId,cursor:sectionCursor,limit:100});
 if(sectionPage.cursorInvalid)return {cursorInvalid:true,topic,tracked,items:[],coverage:descriptor.coverage,operations:descriptor.operations};
 const sectionMap=new Map(sectionPage.items.map(row=>[row.sectionId,row]));for(const row of candidateSections)sectionMap.set(row.sectionId,row);
 const nextCursor=wrapCursor(topic.id,needle,descriptor.nextCursor),previousCursor=wrapCursor(topic.id,needle,descriptor.previousCursor);
 return {
  currentCursor:cursor||null,
  sectionStarts:{},
  topic,sections:[...sectionMap.values()],sectionCursor:sectionPage.nextCursor,
  items,tracked,sort,query:needle,
  matchCount:needle?null:(descriptor.coverage?.activeCount??null),
  nextCursor,previousCursor,
  complete:descriptor.complete,
  coverage:descriptor.coverage,
  operations:descriptor.operations
 };
}
