import {ArchiveError} from './constants.js';
import {prefix} from './thought-model.js';
import {AI_FIELDS,isStoredAIPresentation} from './organizer/ai-contract.js';
import {MANUAL_CONTEXT_LIMITS} from './context-manifest.js';
const fail=code=>{throw new ArchiveError(code||'MEMORY_INVALID');};
const idOK=v=>typeof v==='string'&&v.length>0&&v.length<=200;
export const validContainerRef=r=>r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).every(k=>['kind','id'].includes(k))&&['conversation','topic'].includes(r.kind)&&idOK(r.id);
const revision=n=>Number.isSafeInteger(n)&&n>=0;
export async function readContextContainer(memory,t,ref){
 if(!validContainerRef(ref))fail();const refs=[],seen=new Set();
 const push=r=>{const key=JSON.stringify(r);if(seen.has(key))return;seen.add(key);refs.push(r);if(refs.length>MANUAL_CONTEXT_LIMITS.items)fail('MEMORY_LIMIT');};
 let title='';
 if(ref.kind==='conversation'){
  const row=await t.get('libraryDocuments',ref.id);if(!row)fail('MEMORY_UNAVAILABLE');const doc=row.value;
  title=doc.userTitle||doc.originalConversationTitle||doc.originalTitle||doc.title||'Conversation';
  let cursor=null;do{
   const page=await t.rangePage('blockIndex','byList',prefix([ref.id,0]),cursor,100);
   for(const {value:index}of page.rows){const state=await t.get('inputStates',index.id),block=(await t.get('blocks',index.id))?.value;
    if(!state||!block)fail('MEMORY_UNAVAILABLE');
    if(state.removalState!=='active'||block.excluded||block.branchStatus||state.sourcePurged)continue;
    if(!revision(state.contentRevision))fail('MEMORY_UNAVAILABLE');
    push({kind:'input',id:index.id,revision:state.contentRevision});
   }cursor=page.next;
  }while(cursor);
 }else{
  const topic=await t.get('topics',ref.id);
  if(!topic||topic.lifecycle!=='active'||topic.redirectTo)fail('MEMORY_UNAVAILABLE');
  if(topic.layoutJobId||!Number.isSafeInteger(topic.activeLayoutGeneration)||topic.activeLayoutGeneration<1)fail('MEMORY_STALE');
  if(typeof topic.summary==='string'&&topic.summary.trim()){if(!revision(topic.revision))fail('MEMORY_UNAVAILABLE');push({kind:'topic_note',id:ref.id,revision:topic.revision});}
  title=await memory.safeLabel(t,topic,'name')||'Topic';let cursor=null;
  do{const page=await t.rangePage('placements','byTopicOrder',prefix([ref.id,topic.activeLayoutGeneration,0]),cursor,100);
   for(const {value:p}of page.rows){const e=await t.get('thoughts',p.entryId);if(!e)fail('MEMORY_UNAVAILABLE');if(e.lifecycle!=='active')continue;if(!revision(e.revision))fail('MEMORY_UNAVAILABLE');push({kind:'thought',id:e.id,revision:e.revision});}
   cursor=page.next;
  }while(cursor);
  const ai=await t.get('meta','aiPresentation:'+ref.id);
  if(ai){if(!isStoredAIPresentation(ai,new Set(ai.evidenceEntryIds||[])))fail('MEMORY_UNAVAILABLE');
   for(const field of AI_FIELDS){const raw=ai[field],body=typeof raw==='string'?raw:Array.isArray(raw)?raw.map(x=>x.text).join('\n\n'):'';
    if(body.trim())push({kind:'ai',id:ref.id,revision:ai.revision,field});
   }
  }
 }
 if(!refs.length)fail('MEMORY_EMPTY');
 return {kind:ref.kind,id:ref.id,title,refs,signature:JSON.stringify(refs),state:'ready'};
}
export async function listContextContainers(memory,t,{kind,cursor=null,limit=40}){
 if(!['conversation','topic'].includes(kind)||!Number.isInteger(limit)||limit<1||limit>50||cursor!==null&&(!cursor||typeof cursor!=='object'||Array.isArray(cursor)||cursor.kind!==kind||Object.keys(cursor).some(k=>!['kind','key'].includes(k))||!Object.hasOwn(cursor,'key')||(kind==='conversation'?typeof cursor.key!=='string'||!cursor.key:!Array.isArray(cursor.key)||cursor.key.length!==5||cursor.key[0]!==0||!cursor.key.every(x=>typeof x==='string'||typeof x==='number'&&Number.isFinite(x)))))fail();
 const page=kind==='conversation'?await t.rangePage('libraryDocuments',null,null,cursor?.key??null,limit):
  await t.rangePage('topics','byIndex',prefix([0]),cursor?.key??null,limit);
 const items=await Promise.all(page.rows.map(async({value:r})=>{const v=kind==='conversation'?r.value:r;return {kind,id:r.id,title:kind==='conversation'?(v.userTitle||v.originalConversationTitle||v.originalTitle||v.title||'Conversation'):(await memory.safeLabel(t,v,'name')||'Topic')};}));
 return {items,nextCursor:page.next?{kind,key:page.next}:null};
}
