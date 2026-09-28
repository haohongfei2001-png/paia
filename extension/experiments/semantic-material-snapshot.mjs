// Complete local storage snapshot for a rebuildable derived index.
// Archived experiment, excluded from release. No model admission, loader, network, authority write or A6/C3/R3 activation.
import {materialRead,own} from '../core/manual-materials.js';
import {inputProjection} from '../core/thought-evidence.js';
import {prefix} from '../core/thought-model.js';
import {AI_FIELDS,isStoredAIPresentation} from '../core/organizer/ai-contract.js';
import {historicalSourceTime,historicalDateBound} from '../core/historical-time.js';
import {hashText} from '../core/dedupe.js';
import {DerivedSemanticIndex} from './semantic-index.mjs';

const fail=()=>{throw Error('semantic_snapshot_unavailable');};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=200;
function scopeOptions(raw){
 if(!own(raw,['mode','documentId','topicId','source','dateFrom','to','types']))fail();
 const {mode='current',documentId=null,topicId=null,source='',dateFrom='',to='',types=['input','thought','ai']}=raw;
 if(!['current','history'].includes(mode)||documentId!==null&&!id(documentId)
  ||topicId!==null&&!id(topicId)||typeof source!=='string'||source.length>80
  ||typeof dateFrom!=='string'||typeof to!=='string'
  ||dateFrom&&historicalDateBound(dateFrom)===null||to&&historicalDateBound(to)===null
  ||dateFrom&&to&&historicalDateBound(dateFrom)>historicalDateBound(to)
  ||!Array.isArray(types)||!types.length||new Set(types).size!==types.length
  ||types.some(x=>!['input','thought','ai'].includes(x)))fail();
 return {mode,documentId,topicId,source,dateFrom,to,types:[...types].sort()};
}

export async function semanticMaterialSnapshot(memory,options={},maxItems=100000){
 try{
  const scope=scopeOptions(options),s=memory.s;
  if(!Number.isSafeInteger(maxItems)||maxItems<1||maxItems>100000)fail();
  await s.finishFoundation();
  const snapshot=await s.run(()=>s.repository.transaction(false,async t=>{
   const generation=(await t.get('meta','backup-data-generation'))?.value??0;
   if(!Number.isSafeInteger(generation)||generation<0)fail();
   const policy=await memory.state(t),boundary=Object.create(memory);
   // Reuse the exact policy read inside this transaction, never caller-supplied rules.
   boundary.state=async()=>policy;
   const filter=await t.get('meta','smart-filter'),items=[],pathCache=new Map();
   let scanned=0;
   async function entryPaths(entryId){
    if(pathCache.has(entryId))return pathCache.get(entryId);
    const entry=await s.readableEntry(t,entryId),out=[];
    if(entry?.lifecycle==='active')for(const p of await t.all('placements','byEntry',prefix([entryId]))){
     const topic=await t.get('topics',p.topicId);
     if(topic?.lifecycle!=='active'||p.lifecycle!=='active'||p.layoutGeneration!==topic.activeLayoutGeneration)continue;
     if(p.sectionId){const section=await t.get('sections',JSON.stringify([p.topicId,topic.activeLayoutGeneration,p.sectionId]));
      if(section?.lifecycle!=='active')continue;}
     out.push({topicId:p.topicId,sectionId:p.sectionId??null,topicName:await memory.safeLabel(t,topic,'name')||''});
    }
    pathCache.set(entryId,out);return out;
   }
   async function inputPaths(inputId){
    const unique=new Map();
    for(const p of await t.all('provenance','byInputVersion',prefix([inputId])))if(p.ownerKind==='entry')
     for(const location of await entryPaths(p.ownerId))unique.set(JSON.stringify(location),location);
    return [...unique.values()];
   }
   async function add(ref,source,locations,{belongsToDocument=false}={}){
    let value;
    try{value=await materialRead(boundary,t,ref);}
    catch(error){if(['MEMORY_DENIED','MEMORY_UNAVAILABLE'].includes(error.code))return;throw error;}
    const time=historicalSourceTime(value.time),at=time===null?null:Date.parse(time);
    if(scope.source&&scope.source!==source||scope.documentId&&value.documentId!==scope.documentId&&!belongsToDocument
     ||scope.topicId&&!locations.some(x=>x.topicId===scope.topicId)
     ||scope.dateFrom&&(at===null||at<historicalDateBound(scope.dateFrom))
     ||scope.to&&(at===null||at>historicalDateBound(scope.to)+86400000-1))return;
    if(items.length===maxItems)fail();
    items.push({ref:structuredClone(ref),title:value.title,body:value.body,source,time,locations});
   }
   async function visit(table,fn){
    let after;
    for(;;){
     const page=await t.page(table,{after,limit:100});
     for(const row of page.rows){if(++scanned>300000)fail();await fn(row.value);}
     if(!page.next)break;
     if(!page.rows.length)fail();
     after=page.rows[page.rows.length-1].key;
    }
   }
   if(scope.types.includes('input'))await visit('inputStates',async row=>{
    if(row.sourcePurged||row.removalState!=='active')return;
    const projection=await inputProjection(s,t,row.id);
    if(!projection||await s.isFiltered(t,projection.block,filter)||!await memory.safeSources(t,projection.sourceRecordIds))return;
    const block=projection.block,sourceId=block.originalTextReference;
    const record=sourceId&&await t.get('records',sourceId),ix=sourceId&&await t.get('recordIndex',sourceId);
    if(scope.mode==='history'&&(!record||!ix))return;
    const doc=(await t.get('libraryDocuments',block.documentId))?.value||(await t.get('documents',block.documentId))?.value||{};
    const ref=scope.mode==='history'?{kind:'source',id:row.id,sourceId,revision:0}:{kind:'input',id:row.id,revision:row.contentRevision};
    await add(ref,record?.value?.platform||ix?.platform||doc.platform||'chatgpt',await inputPaths(row.id));
   });
   if(scope.mode==='current'&&scope.types.includes('thought'))await visit('thoughts',async row=>{
    const entry=await s.readableEntry(t,row.id);
    if(!entry||entry.lifecycle!=='active'||entry.bodyBinding==='input'&&entry.workingInputId&&scope.types.includes('input'))return;
    if(scope.documentId){
     let belongs=false;for(const dep of entry.inputRefs||[])
      if((await t.get('blocks',dep.inputBlockId))?.value?.documentId===scope.documentId)belongs=true;
     if(!belongs)return;
    }
    // Membership is proven from actual dependencies above, never an option supplied by a caller.
    await add({kind:'thought',id:entry.id,revision:entry.revision},'thought',await entryPaths(entry.id),
     {belongsToDocument:scope.documentId!==null});
   });
   if(scope.mode==='current'&&scope.types.includes('ai')&&!scope.documentId)await visit('meta',async row=>{
    if(!row.id.startsWith('aiPresentation:')||!isStoredAIPresentation(row,new Set(row.evidenceEntryIds||[])))return;
    const topic=await t.get('topics',row.topicId);if(topic?.lifecycle!=='active')return;
    const locations=[{topicId:row.topicId,sectionId:null,topicName:await memory.safeLabel(t,topic,'name')||''}];
    for(const field of AI_FIELDS)await add({kind:'ai',id:row.topicId,field,revision:row.revision},'ai',locations);
   });
   return {generation,items};
  }));
  // WebCrypto awaits stay outside IndexedDB's read transaction.
  return {scope:'semantic-material-v1:'+await hashText(JSON.stringify(scope)),
   generation:snapshot.generation,items:snapshot.items};
 }catch(_error){fail();}
}

export function createMaterialSemanticIndex(memory,{model,encode,scope={},maxItems=100000,maxVectorBytes=268435456}={}){
 const fixedScope=scopeOptions(scope);
 return new DerivedSemanticIndex({model,encode,maxItems,maxVectorBytes,
  readEligible:()=>semanticMaterialSnapshot(memory,fixedScope,maxItems)});
}
