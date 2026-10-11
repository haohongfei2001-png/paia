import {ArchiveError} from './constants.js';
import {inputProjection} from './thought-evidence.js';
import {validPromptText} from './prompt-reuse-preferences.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const stale=()=>{throw new ArchiveError('MEMORY_STALE');};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const id=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const exact=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===fields.length&&fields.every(field=>Object.hasOwn(value,field));
export const PROMPT_HISTORY_SCOPE=Object.freeze({ranked:true,providerKey:null,projectRef:null,includeFiltered:true,dateFrom:'',dateTo:''});
export function validPromptSelectionRef(ref){
 if(ref?.kind==='history_input')return exact(ref,['kind','id','documentId','contentRevision','generation'])&&id(ref.id)&&id(ref.documentId)&&integer(ref.contentRevision)&&integer(ref.generation);
 return ['prompt_family','manual_reuse'].includes(ref?.kind)&&exact(ref,['kind','id','revision','generation'])&&/^(pf:[a-f0-9]{64}|manual:[a-f0-9-]{36})$/.test(ref.id)&&integer(ref.revision)&&integer(ref.generation);
}
// Offsets address the original body, never a normalized search string. Reject
// invalid boundaries rather than rounding or turning an invalid range into all.
export function selectPromptRange(body,range=null){
 if(!validPromptText(body))invalid();
 if(range===null)return body;
 if(!exact(range,['start','end'])||!integer(range.start)||!integer(range.end)||range.end<=range.start||range.end>body.length)invalid();
 const boundaries=new Set([body.length]);for(const item of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(body))boundaries.add(item.index);
 if(!boundaries.has(range.start)||!boundaries.has(range.end))invalid();
 const text=body.slice(range.start,range.end);if(!text.trim())invalid();return text;
}
export async function readPromptHistoryInTransaction(store,t,ref){
 if(!validPromptSelectionRef(ref)||ref.kind!=='history_input')invalid();
 const generation=(await t.get('meta','backup-data-generation'))?.value??0;
 if(generation!==ref.generation)stale();
 const input=await inputProjection(store,t,ref.id);
 if(!input||input.documentId!==ref.documentId||input.contentRevision!==ref.contentRevision||!input.sourceRecordIds.length)stale();
 // Search is broader than recommendation/Context eligibility: filtered Inputs
// remain available, but explicit non-user or removed source evidence never is.
 for(const sourceId of input.sourceRecordIds){const record=(await t.get('records',sourceId))?.value;
  if(!record||record.hidden||record.deletedAt||record.role&&record.role!=='user'||record.author?.role&&record.author.role!=='user'||record.authorship&&record.authorship!=='user')stale();
 }
 if(input.block.role&&input.block.role!=='user')stale();
 return input;
}
export async function readPromptHistory(store,ref,range=null){
 if(!validPromptSelectionRef(ref)||ref.kind!=='history_input')invalid();
 await store.finishFoundation();
 return store.run(()=>store.repository.transaction(false,async t=>{
  const input=await readPromptHistoryInTransaction(store,t,ref),text=selectPromptRange(input.body,range);
  return {ref:structuredClone(ref),range:range===null?null:structuredClone(range),text,generation:ref.generation};
 }));
}
export async function queryPromptHistory(store,options){
 if(!exact(options,['query','cursor','searchSnapshot'])||typeof options.query!=='string'||options.query.length>1000)invalid();
 // Empty SEARCH is not a whole-archive feed.
 if(!options.query.trim()){if(options.cursor!==null||options.searchSnapshot!==null)invalid();return {items:[],nextCursor:null,searchSnapshot:null,searchScope:{...PROMPT_HISTORY_SCOPE},complete:true};}
 const result=await store.searchInputs({...PROMPT_HISTORY_SCOPE,...options,qualified:true,limit:50});
 if(result.changed)return result;
 // The original qualified query is the order/page authority. Verify current
// same-generation Inputs without applying the narrower Family useful filter.
 const items=await store.run(()=>store.repository.transaction(false,async t=>{
  if(((await t.get('meta','backup-data-generation'))?.value??0)!==result.searchSnapshot.generation)stale();
  const rows=[];for(const item of result.items){const ref={kind:'history_input',id:item.id,documentId:item.documentId,contentRevision:item.contentRevision,generation:result.searchSnapshot.generation};
   const input=await readPromptHistoryInTransaction(store,t,ref);if(input.body!==item.text)stale();
   rows.push({...item,ref});
  }return rows;
 }));
 return {...result,items};
}
