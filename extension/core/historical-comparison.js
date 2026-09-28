// Invocation-local comparison of already admitted historical search results.
// These are expressions, not inferred beliefs or an automatic supersession graph.
import {historicalInstant,historicalSourceTime} from './historical-time.js';

export function historicalComparison(items){
 if(!Array.isArray(items)||items.length!==2)return null;
 const admitted=[];
 for(const item of items){
  const ref=item?.ref,working=item?.working;
  if(item?.kind!=='input'||item.historical!==true||typeof item.id!=='string'||!item.id
   ||ref?.kind!=='source'||ref.id!==item.id||typeof ref.sourceId!=='string'||!ref.sourceId
   ||ref.revision!==0||ref.span!==undefined||typeof item.body!=='string')return null;
  if(working!==null&&working!==undefined&&(typeof working.body!=='string'
   ||!Number.isSafeInteger(working.revision)||working.revision<0))return null;
  admitted.push({id:item.id,sourceId:ref.sourceId,title:typeof item.title==='string'?item.title:'Input',
   source:typeof item.source==='string'?item.source:'',
   sourceSentAt:historicalSourceTime(item.sourceSentAt),body:item.body,
   working:working?{body:working.body,revision:working.revision,
    editedAt:working.revision>0?historicalSourceTime(working.editedAt):null}:null});
 }
 if(admitted[0].id===admitted[1].id||admitted[0].sourceId===admitted[1].sourceId)return null;
 return admitted.sort((a,b)=>{
  const x=historicalInstant(a.sourceSentAt),y=historicalInstant(b.sourceSentAt);
  return (x===null)-(y===null)||(x!==null&&y!==null?x-y:0)||a.id.localeCompare(b.id);
 });
}
