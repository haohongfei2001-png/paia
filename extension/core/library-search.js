import {searchRank,rankSearchPage,searchExcerpt} from './search-service.js';
import {prefix,fail} from './thought-model.js';
export const SEARCH_VERSION=1;
const normalize=s=>s.normalize('NFKC').toLocaleLowerCase();
// Versioned local postings, no second normalized body. Hashes are an index, not encryption.
const hash=s=>{let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
export function tokens(text){const words=normalize(text).match(/[\p{Script=Han}]|[\p{L}\p{N}_]+/gu)||[];return [...new Set(words.map(hash))].sort();}
export const ownerVersion=(kind,r)=>kind==='entry'?`${r.contentRevision}:${r.fieldRevisions?.type||0}:${r.lifecycle}:${r.searchSafetyVersion||0}`:`${r.revision}:${r.lifecycle}:${r.layoutGeneration||0}`;
export const ownerStore=kind=>({entry:'thoughts',topic:'topics',section:'sections'})[kind];
export async function queueSearch(t,kind,row){
 // Durable cleanup locator for generated organization labels, including copied layouts.
 if(['topic','section'].includes(kind)&&row.sourceRecordIds?.length)await t.put('libraryMigrationItems',{id:JSON.stringify(['organizer-metadata',kind,row.id]),entityKind:'organizer_metadata',statusKey:1,ownerKind:kind,ownerId:row.id,sourceRecordIds:row.sourceRecordIds});
 const version=ownerVersion(kind,row);if(row.searchVersion===version)return;
 row.searchVersion=version;await t.put(ownerStore(kind),row);
 await t.put('libraryMigrationItems',{id:JSON.stringify(['search',kind,row.id]),entityKind:'search',statusKey:0,ownerKind:kind,ownerId:row.id,version,phase:'delete',offset:0,sourceRecordIds:row.sourceRecordIds||[]});
}
export async function searchBatch(store){
 await store.finishFoundation();
 const work=await store.run(()=>store.repository.transaction(false,async t=>{const page=await t.rangePage('libraryMigrationItems','byStatus',prefix([0,'search']),null,20),out=[];for(const {value:task}of page.rows)out.push({task,row:await t.get(ownerStore(task.ownerKind),task.ownerId)});return out;}));if(!work.length)return {pending:false};
 // Hash/tokenize outside IDB. A batch has at most 20 owners and 200 posting mutations.
 for(const item of work){const {task,row}=item,fields=task.ownerKind==='entry'?{title:row?.title||'',body:row?.thoughtText||'',type:row?.type||''}:task.ownerKind==='topic'?{name:row?.name||''}:{title:row?.title||''};item.postings=row?.lifecycle==='active'?Object.entries(fields).flatMap(([field,text])=>tokens(text).map(tokenHash=>({tokenHash,field}))):[];}
 return store.libraryMaintenanceWrite(async t=>{let budget=200;
  for(const {task,postings}of work){if(!budget)break;const current=await t.get('libraryMigrationItems',task.id),live=await t.get(ownerStore(task.ownerKind),task.ownerId);if(!current||current.version!==task.version||current.offset!==task.offset||current.phase!==task.phase)continue;
   if(!live||live.searchVersion!==task.version){await t.delete('libraryMigrationItems',task.id);continue;}
   if(current.phase==='delete'){const page=await t.rangePage('librarySearchTerms','byOwner',prefix([task.ownerKind,task.ownerId]),null,budget);for(const {value:r}of page.rows)await t.delete('librarySearchTerms',r.id);budget-=page.rows.length;if(page.next){await t.put('libraryMigrationItems',current);break;}current.phase='write';}
   const allowed=task.ownerKind!=='entry'||await store.sourcePresent(t,live.sourceRecordIds),chunk=allowed?postings.slice(current.offset,current.offset+budget):[];
   for(const p of chunk)await t.put('librarySearchTerms',{id:JSON.stringify([task.ownerKind,task.ownerId,p.field,p.tokenHash]),ownerKind:task.ownerKind,ownerId:task.ownerId,...p,version:task.version,tokenizerVersion:SEARCH_VERSION,sourceRecordIds:live.sourceRecordIds||[]});budget-=chunk.length;current.offset+=chunk.length;
   if(!allowed||current.offset>=postings.length){live.indexedSearchVersion=task.version;await t.put(ownerStore(task.ownerKind),live);await t.delete('libraryMigrationItems',task.id);}else await t.put('libraryMigrationItems',current);
  }return {pending:true};
 });
}
export async function rebuildBatch(store){
 return store.libraryMaintenanceWrite(async t=>{const m=await t.get('meta','library-search-rebuild');if(!m||m.complete)return {pending:false};const kind=['entry','topic','section'][m.phase],page=await t.page(ownerStore(kind),{after:m.cursor??undefined,limit:100});for(const {value:r}of page.rows){if(kind==='entry'&&r.storageSchema!==2)continue;delete r.searchVersion;await queueSearch(t,kind,r);}m.cursor=page.next;if(!page.next){m.phase++;m.cursor=null;}if(m.phase===3)m.complete=true;await t.put('meta',m);return {pending:true};});
}
export async function searchLibrary(store,{query='',cursor=null,limit=40,ranked=false}={}){
 if(typeof query!=='string'||query.length>300||!Number.isInteger(limit)||limit<1||limit>100)fail();
 await store.ensureLibrarySearch();const normalized=normalize(query.trim()),queryTokens=tokens(query);if(!queryTokens.length)return {items:[],complete:true,nextCursor:null};
 if(cursor&&(cursor.query!==normalized||ranked&&![0,1,2].includes(cursor.phase)))fail();const phase=ranked?(cursor?.phase||0):null;
 const snapshot=await store.run(()=>store.repository.transaction(false,async t=>({page:await t.rangePage('librarySearchTerms','byToken',prefix([queryTokens[0]]),cursor?.key||null,200),pending:await t.count('libraryMigrationItems','byStatus',prefix([0,'search'])),rebuild:await t.get('meta','library-search-rebuild')})));
 const items=[],seen=new Set();let lastKey=null,more=!!snapshot.page.next;
 for(const {key,value:p}of snapshot.page.rows){lastKey=key;if(cursor?.lastOwner===p.ownerKind+p.ownerId||seen.has(p.ownerKind+p.ownerId))continue;seen.add(p.ownerKind+p.ownerId);
  const result=await store.run(()=>store.repository.transaction(false,async t=>{
   const row=await t.get(ownerStore(p.ownerKind),p.ownerId);if(!row||row.lifecycle!=='active'||row.searchVersion!==p.version||row.indexedSearchVersion!==p.version||p.tokenizerVersion!==SEARCH_VERSION)return null;
   if(p.ownerKind==='entry')return {kind:'entry',id:row.id};
   if(p.ownerKind==='topic'){if(row.redirectTo||!normalize(row.name).includes(normalized))return null;return {kind:'topic',topicId:row.id,topicName:row.name,rank:searchRank(normalized,row.name),updatedAt:row.updatedAt};}
   const topic=await t.get('topics',row.topicId);if(!topic||topic.lifecycle!=='active'||topic.redirectTo||topic.activeLayoutGeneration!==row.layoutGeneration||row.redirectTo||!normalize(row.title).includes(normalized))return null;
   return {kind:'section',topicId:topic.id,topicName:topic.name,sectionId:row.sectionId,sectionTitle:row.title,rank:searchRank(normalized,row.title),updatedAt:row.updatedAt};
  }));if(!result)continue;
  if(result.kind==='entry'){let e;try{e=await store.entry(result.id);}catch{continue;}if(e.lifecycle!=='active'||![e.title,e.body,e.type].some(x=>normalize(x).includes(normalized)))continue;const paths=await store.entryPaths(e.id);const rank=searchRank(normalized,e.title,e.body+' '+e.type);if(ranked&&rank!==phase)continue;items.push({kind:'entry',entryId:e.id,title:e.title,snippet:searchExcerpt(e.body,normalized,180),type:e.type,paths,rank,updatedAt:e.updatedAt});}else{if(ranked&&result.rank!==phase)continue;items.push(result);}
  if(items.length===limit){more=true;break;}
 }
 const nextCursor=more&&lastKey?{query:normalized,key:lastKey,lastOwner:lastKey[1]+lastKey[2],...(ranked?{phase}:{})}:ranked&&phase<2?{query:normalized,key:null,lastOwner:null,phase:phase+1}:null;
 return {items:rankSearchPage(items),complete:!nextCursor&&!snapshot.pending&&snapshot.rebuild?.complete===true&&!more,indexing:!!snapshot.pending||!snapshot.rebuild?.complete,nextCursor};
}
