import {ArchiveError} from './constants.js';
import {normalizeSearch,searchExcerpt} from './search-service.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const AI_FIELDS=Object.freeze({
 blockSummary:'主题速览',currentView:'当前理解',keyInformation:'核心信息',preferences:'偏好与原则',decisions:'重要决定',judgments:'判断',openQuestions:'待解决问题',possibleEvolution:'可能变化'
});

async function collect(read,query,limit,maxPages=12){
 let cursor=null,pages=0,indexing=false;const items=[];
 do{
  const page=await read({query,cursor,ranked:true,limit:Math.min(100,Math.max(1,limit-items.length))});pages++;indexing||=page.indexing===true;
  items.push(...(page.items||[]));cursor=page.nextCursor??null;
 }while(cursor&&items.length<limit&&pages<maxPages);
 return {items:items.slice(0,limit),complete:cursor===null,indexing,nextCursor:cursor,pages};
}

export function aiProjectionMatches(topics,query,limit=8){
 const q=normalizeSearch(query);if(!q)return [];const matches=[];
 for(const topic of topics||[]){const presentation=topic?.presentation;if(!presentation)continue;
  for(const [field,label] of Object.entries(AI_FIELDS)){
   const raw=presentation[field],parts=Array.isArray(raw)?raw.map(x=>x?.text||''):[raw||''],text=parts.join(' ').trim();
   if(!normalizeSearch(text).includes(q))continue;
   matches.push({kind:'ai',topicId:topic.topicId,topicName:topic.name||'未命名主题',aiField:field,sectionTitle:'AI整理 · '+label,snippet:searchExcerpt(text,q,220),updatedAt:presentation.updatedAt||null});
   break;
  }
  if(matches.length>=limit)break;
 }
 return matches;
}

export function inputTimeline(items){
 const dated=[...(items||[])].sort((a,b)=>{
  const x=Date.parse(a.sourceSentAt||''),y=Date.parse(b.sourceSentAt||'');
  if(Number.isFinite(x)!==Number.isFinite(y))return Number.isFinite(x)?-1:1;
  return (Number.isFinite(x)&&Number.isFinite(y)?x-y:0)||String(a.id).localeCompare(String(b.id));
 });
 const groups=[];let last=null,current=null;
 for(const item of dated){const at=Date.parse(item.sourceSentAt||''),key=Number.isFinite(at)?new Date(at).toISOString().slice(0,7):'unknown';if(key!==last){current={key,items:[]};groups.push(current);last=key;}current.items.push(item);}
 return groups;
}

export function contextReuseQuery(item,query=''){
 const focus=String(item?.snippet||item?.title||item?.topicName||'').trim().slice(0,620),current=String(query||'').trim().slice(0,300);
 return [`重点参考我以前的这段表达：${focus}`,current?`我现在想继续了解：${current}`:''].filter(Boolean).join('\n\n').slice(0,1000);
}

export class UniversalSearchService {
 constructor(store,{aiStatus=()=>store.aiPresentationStatus(),maxPages=12}={}){this.store=store;this.aiStatus=aiStatus;this.maxPages=maxPages;}
 async search({query='',inputLimit=24,thoughtLimit=18,aiLimit=8}={}){
  if(typeof query!=='string'||query.length>300||!query.trim()||![inputLimit,thoughtLimit,aiLimit].every(n=>Number.isInteger(n)&&n>=1&&n<=50))invalid();
  const [input,thought,aiState]=await Promise.all([
   collect(options=>this.store.searchInputs(options),query,inputLimit,this.maxPages),
   collect(options=>this.store.searchLibrary(options),query,thoughtLimit,this.maxPages),
   this.aiStatus().catch(()=>({topics:[]}))
  ]);
  const inputs=input.items.map(item=>({kind:'input',id:item.id,documentId:item.documentId,title:item.title||'独立整理文档',snippet:searchExcerpt(item.text||'',query,240),sourceSentAt:item.sourceSentAt||null,filtered:item.filtered===true,rank:item.rank}));
  const thoughts=thought.items.map(item=>({...item,snippet:item.snippet||item.sectionTitle||item.topicName||item.title||''}));
  const ai=aiProjectionMatches(aiState?.topics,query,aiLimit);
  return {query:query.trim(),input:{...input,items:inputs},thought:{...thought,items:thoughts},ai:{items:ai,complete:true},timeline:inputTimeline(inputs),hasAny:!!(inputs.length||thoughts.length||ai.length)};
 }
}
