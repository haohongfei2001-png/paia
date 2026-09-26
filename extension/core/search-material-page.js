import {ArchiveError} from './constants.js';
import {normalizeSearch,searchExcerpt} from './search-service.js';
import {inputProjection} from './thought-evidence.js';
import {prefix} from './thought-model.js';
import {hashText} from './dedupe.js';
import {AI_FIELDS,isStoredAIPresentation} from './organizer/ai-contract.js';
import {own} from './manual-materials.js';
const fail=code=>{throw new ArchiveError(code||'INVALID_REQUEST');};
const idOK=s=>typeof s==='string'&&s.length>0&&s.length<=200;
export async function searchMaterialPage(s,o={}){
 if(!own(o,['query','mode','documentId','topicId','source','dateFrom','to','types','includeRemoved','includeFiltered','cursor','limit']))fail();
 const {query='',mode='current',documentId=null,topicId=null,source='',dateFrom='',to='',types=['input','thought','ai'],includeRemoved=false,includeFiltered=false,cursor=null,limit=40}=o;
 if(typeof query!=='string'||query.length>300||!['current','history'].includes(mode)||documentId!==null&&!idOK(documentId)||topicId!==null&&!idOK(topicId)||typeof source!=='string'||source.length>80||typeof dateFrom!=='string'||typeof to!=='string'||dateFrom&&!Number.isFinite(Date.parse(dateFrom))||to&&!Number.isFinite(Date.parse(to))||!Array.isArray(types)||types.some(v=>!['input','thought','ai'].includes(v))||typeof includeRemoved!=='boolean'||typeof includeFiltered!=='boolean'||!Number.isInteger(limit)||limit<1||limit>100)fail();
 await s.finishFoundation();const signature=await hashText(JSON.stringify([query,mode,documentId,topicId,source,dateFrom,to,types,includeRemoved,includeFiltered])),q=normalizeSearch(query);
 if(cursor&&(!own(cursor,['stage','after','generation','signature'])||!Number.isInteger(cursor.stage)||cursor.stage<0||cursor.stage>2||cursor.after!==null&&!idOK(cursor.after)&&!(Array.isArray(cursor.after)&&cursor.after.length<=10&&cursor.after.every(x=>typeof x==='number'||typeof x==='string'&&x.length<=200))||cursor.signature!==signature))fail();
 return s.run(()=>s.repository.transaction(false,async t=>{
  const generation=(await t.get('meta','backup-data-generation'))?.value||0;const filterState=await t.get('meta','smart-filter');const changed=!!cursor&&cursor.generation!==generation;
  let stage=cursor?.stage||0,after=cursor?.after??undefined,scanned=0;const items=[];
  async function paths(id){const out=[];for(const p of await t.all('placements','byEntry',prefix([id]))){const topic=await t.get('topics',p.topicId);if(topic?.lifecycle==='active'&&p.lifecycle==='active'&&p.layoutGeneration===topic.activeLayoutGeneration)out.push({topicId:p.topicId,topicName:topic.name,sectionId:p.sectionId});}return out;}
  async function topicInput(id){if(!topicId)return true;for(const p of await t.all('provenance','byInputVersion',prefix([id])))if(p.ownerKind==='entry'&&(await paths(p.ownerId)).some(x=>x.topicId===topicId))return true;return false;}
  function matches(item,body){if(dateFrom&&(!item.sourceSentAt||Date.parse(item.sourceSentAt)<Date.parse(dateFrom))||to&&(!item.sourceSentAt||Date.parse(item.sourceSentAt)>Date.parse(to)+86400000-1))return false;if(source&&item.source!==source)return false;return !q||normalizeSearch(body).includes(q)||mode!=='history'&&normalizeSearch(item.title).includes(q);}
  while(stage<3&&scanned<200&&items.length<limit){
   if(mode==='history'&&stage>0){stage=3;break;}if(!types.includes(['input','thought','ai'][stage])){stage++;after=undefined;continue;}const table=['inputStates','thoughts','meta'][stage],page=stage===0&&documentId?await t.rangePage('blockIndex','byList',prefix([documentId]),after,Math.min(200-scanned,100)):await t.page(table,{after,limit:Math.min(200-scanned,100)});let consumed=0;
   for(const {key,value}of page.rows){after=key;scanned++;consumed++;const row=stage===0&&documentId?await t.get('inputStates',value.id):value;if(!row)continue;let item=null,body='';
    if(stage===0&&types.includes('input')){
     if(row.sourcePurged||row.removalState!=='active'&&!includeRemoved)continue;const p=await inputProjection(s,t,row.id),b=p?.block||(await t.get('blocks',row.id))?.value;if(!b||documentId&&documentId!==b.documentId||!await topicInput(row.id))continue;const filtered=await s.isFiltered(t,b,filterState);if(filtered&&!includeFiltered)continue;
     const sourceId=b.originalTextReference,ix=sourceId&&await t.get('recordIndex',sourceId),record=sourceId&&await t.get('records',sourceId);if(sourceId&&(!record||!ix||await t.get('tombstones','source:'+ix.sourceKey)||await t.get('tombstones','snapshot:'+ix.dedupeKey)))continue;if(mode==='history'&&!record)continue;
     body=mode==='history'?record.value.originalText:p?.body??b.libraryText??record?.value.originalText??'';
     const doc=(await t.get('libraryDocuments',b.documentId))?.value||(await t.get('documents',b.documentId))?.value||{};
     item={kind:'input',id:row.id,documentId:b.documentId,title:doc.userTitle||doc.originalConversationTitle||doc.originalTitle||doc.title||'Input',source:record?.value?.platform||ix?.platform||doc.platform||'chatgpt',sourceSentAt:ix?.sourceSentAt||null,removed:row.removalState!=='active',historical:mode==='history',filtered,ref:mode==='history'?{kind:'source',id:row.id,sourceId,revision:0}:{kind:'input',id:row.id,revision:row.contentRevision}};
    }else if(stage===1&&mode==='current'&&types.includes('thought')){
     const e=await s.readableEntry(t,row.id);if(!e||e.lifecycle!=='active')continue;const locations=await paths(e.id);if(topicId&&!locations.some(p=>p.topicId===topicId))continue;if(documentId){let belongs=false;for(const dep of e.inputRefs||[])if((await t.get('blocks',dep.inputBlockId))?.value?.documentId===documentId)belongs=true;if(!belongs)continue;}
     if(e.bodyBinding==='input'&&e.workingInputId&&types.includes('input'))continue;body=e.thoughtText;item={kind:'thought',id:e.id,entryId:e.id,paths:locations,title:e.title||locations[0]?.topicName||'Thought',source:'thought',sourceSentAt:null,ref:{kind:'thought',id:e.id,revision:e.revision}};
    }else if(stage===2&&mode==='current'&&types.includes('ai')&&row.id.startsWith('aiPresentation:')){
     if(documentId||topicId&&row.topicId!==topicId||!isStoredAIPresentation(row,new Set(row.evidenceEntryIds||[])))continue;const topic=await t.get('topics',row.topicId);if(topic?.lifecycle!=='active')continue;let safe=true;for(const id of row.evidenceEntryIds){const e=await s.readableEntry(t,id);if(!e||e.lifecycle!=='active'||!e.thoughtText){safe=false;break;}}if(!safe)continue;
     // One whole saved presentation is represented by its matching canonical field;
     // selection explicitly identifies that field and its saved revision.
     for(const field of AI_FIELDS){const raw=row[field],text=typeof raw==='string'?raw:raw.map(x=>x.text).join('\n\n');if(!text.trim()||q&&!normalizeSearch(text).includes(q))continue;body=text;item={kind:'ai',id:row.topicId,topicId:row.topicId,title:topic.name,source:'ai',sourceSentAt:null,aiField:field,ref:{kind:'ai',id:row.topicId,field,revision:row.revision}};break;}
    }
    if(item&&body&&matches(item,body)){items.push({...item,snippet:searchExcerpt(body,query,240),...(mode==='history'?{body}:{})});if(items.length===limit)break;}
   }
   if(consumed===page.rows.length&&!page.next){stage++;after=undefined;}if(!page.rows.length&&stage>=3)break;
  }
  return {query,mode,items,nextCursor:stage<3?{stage,after:after??null,generation:cursor?.generation??generation,signature}:null,complete:stage>=3,changed,indexing:false,scanned,coverage:mode==='history'?'readable_input_sources':'all_archive_and_thought',generation};
 }));
}
