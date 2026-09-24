// Volatile search acceleration. IndexedDB remains the only durable source of truth.
import {normalizeSearch} from './search-service.js';

const PAGE=500,MAX_CHARS=16_000_000;
export async function buildInputSearchCache(repository,expectedGeneration){
 const rows=[],documents=new Map();let after,characters=0;
 for(;;){
  const page=await repository.transaction(false,async t=>{
   const indexes=await t.page('blockIndex',{index:'bySequence',after,limit:PAGE});
   const blocks=await Promise.all(indexes.rows.map(({value:ix})=>ix.excluded?null:t.get('blocks',ix.id)));
   const sourceIds=[...new Set(blocks.filter(Boolean).map(row=>row.value?.originalTextReference).filter(Boolean))];
   const recordRows=await Promise.all(sourceIds.map(id=>t.get('records',id))),records=new Map(sourceIds.map((id,i)=>[id,recordRows[i]?.value]));
   const documentIds=[...new Set(indexes.rows.map(({value:ix})=>ix.documentId).filter(id=>!documents.has(id)))];
   const documentRows=await Promise.all(documentIds.map(id=>t.get('documents',id)));
   documentIds.forEach((id,i)=>documents.set(id,documentRows[i]?.value??null));
   return {indexes,blocks,records};
  });
  for(let i=0;i<page.indexes.rows.length;i++){
   const ix=page.indexes.rows[i].value,b=page.blocks[i]?.value,doc=documents.get(ix.documentId);
   if(!b||b.branchStatus||!doc)continue;
   const text=b.libraryText??page.records.get(b.originalTextReference)?.originalText??'',title=doc.userTitle||doc.originalConversationTitle||'';
   characters+=text.length+title.length+(b.note?.length||0);
   if(characters>MAX_CHARS)return {generation:expectedGeneration,unavailable:true,rows:null};
   rows.push({id:b.id,documentId:b.documentId,sequence:ix.sequence,title,text,sourceSentAt:ix.sourceSentAt,providerKey:doc.platform,titleSearch:normalizeSearch(title),bodySearch:normalizeSearch(text+' '+(b.note||''))});
  }
  after=page.indexes.next;if(after===null)break;
 }
 const generation=await repository.transaction(false,async t=>(await t.get('meta','backup-data-generation'))?.value||0);
 return generation===expectedGeneration?{generation,rows}:null;
}

export function lookupInputSearchCache(cache,{needle,cursor,limit,providerKey}){
 const phase=cursor?.phase||0,offset=cursor?.offset??-1,items=[];
 let index=0;while(index<cache.rows.length&&cache.rows[index].sequence<=offset)index++;
 for(;index<cache.rows.length;index++){
  const row=cache.rows[index];if(providerKey&&row.providerKey!==providerKey)continue;
  const titleRank=row.titleSearch===needle?0:row.titleSearch.includes(needle)?1:-1;
  if(phase<2?titleRank!==phase:titleRank>=0||!row.bodySearch.includes(needle))continue;
  items.push({...row,rank:phase});
  if(items.length===limit)return {items,nextCursor:{phase,offset:row.sequence}};
 }
 return {items,nextCursor:phase<2?{phase:phase+1,offset:null}:null};
}
