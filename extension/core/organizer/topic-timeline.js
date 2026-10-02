import {keys,idOK,fail} from '../thought-model.js';
import {validProvider} from '../read-projection-keys.js';
import {thoughtTopicExpressionPage,invalidateThoughtTopicIndex} from '../thought-read-index.js';
import {descriptorReader} from './topic-reading.js';
import {expressionTime} from './expression-time.js';

const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase();
export async function topicTimelinePage(s,options={}){
 keys(options,['topicId','sort','year','providerKey','query','direction','cursor','limit','expectedReadGeneration'],['topicId']);
 if(!idOK(options.topicId)||options.providerKey!==undefined&&options.providerKey!==null&&!validProvider(options.providerKey)||options.query!==undefined&&(typeof options.query!=='string'||options.query.length>500))fail();
 const query=normalize((options.query||'').trim()),direction=options.direction||'next';
 options={...options,query,direction};
 await s.finishFoundation();
 const page=await thoughtTopicExpressionPage(s,{...options,describe:descriptorReader(s)});
 const topic=await s.topic(options.topicId);
 if(page.indexing||page.cursorInvalid)return {...page,topic};
 const items=[];let size=bytes(topic)+bytes(page.overview),changed=false,nextCursor=page.nextCursor,previousCursor=page.previousCursor,lastConsumed=null;
 const descriptors=direction==='prev'?[...page.items].reverse():page.items;
 for(const descriptor of descriptors){
  let entry;try{entry=await s.readingEntry(descriptor.entryId);}catch{changed=true;break;}
  const valid=await s.run(()=>s.repository.transaction(false,async t=>{
   const row=await t.get('thoughts',descriptor.entryId),placement=await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,descriptor.entryId]));
   return row?.lifecycle==='active'&&row.revision===descriptor.entryRevision&&entry.revision===row.revision&&placement?.lifecycle==='active'&&placement.revision===descriptor.placementRevision&&JSON.stringify(await expressionTime(s,t,row))===JSON.stringify(descriptor.expressionTime);
  }));
  if(!valid||entry.lifecycle!=='active'){changed=true;break;}
  if(query&&![entry.body,entry.title,entry.note].some(value=>normalize(value).includes(query))){lastConsumed=descriptor._cursorKey;continue;}
  if(bytes(entry)>128*1024)entry={id:entry.id,revision:entry.revision,large:true,title:entry.title,bodyBytes:bytes(entry.body),sourceSentAt:entry.sourceSentAt,capturedAt:entry.capturedAt,createdAt:entry.createdAt,provenanceType:entry.provenanceType};
  const item={entry:{...entry,expressionTime:descriptor.expressionTime},sectionId:descriptor.sectionId},length=bytes(item);
  if(items.length&&size+length>256*1024){
   const boundary={generation:page.coverage.activeGeneration,viewKey:page.coverage.activeKey,sort:options.sort||'asc',year:options.year??null,providerKey:options.providerKey??null,query,key:lastConsumed};
   if(direction==='prev')previousCursor=boundary;else nextCursor=boundary;break;
  }
  size+=length;items.push(item);lastConsumed=descriptor._cursorKey;
 }
 // Reject every old body DTO after any asynchronous authority change.
 const fresh=await thoughtTopicExpressionPage(s,{...options,limit:1,expectedReadGeneration:page.coverage.activeGeneration,describe:descriptorReader(s)});
 if(changed||fresh.cursorInvalid||fresh.indexing){
  if(changed)await s.run(()=>s.repository.transaction(true,t=>invalidateThoughtTopicIndex(s,t,topic.id,{sourceTime:true})));
  return {topic,items:[],nextCursor:null,previousCursor:null,cursorInvalid:true,coverage:fresh.coverage,complete:false};
 }
 if(direction==='prev')items.reverse();
 return {...page,topic,items,nextCursor,previousCursor,complete:direction==='prev'?!previousCursor:!nextCursor};
}
