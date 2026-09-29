// CPV1-09.1 local P1 archive reader. No external/profile permission, AI reply,
// provider input, clipboard, dispatcher or network access is introduced here.
import {ArchiveError} from './constants.js';
import {inputProjection} from './thought-evidence.js';
import {readRevisitPolicy,inputRevisitExcluded} from './reader-state.js';
import {validPortableSourceRecord} from './import/contract.js';
import {buildPromptCandidates} from './prompt-reuse.js';
import {BACKUP_LIMITS} from './backup-format.js';

export const PROMPT_ARCHIVE_LIMITS=Object.freeze({pageInputs:100,
 inputCount:BACKUP_LIMITS.singleExportItems,bodyBytes:BACKUP_LIMITS.singleExportBytes,
 sourceRefs:BACKUP_LIMITS.segmentedExportItems});
const fail=code=>{throw new ArchiveError(code);};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)
 &&[Object.prototype,null].includes(Object.getPrototypeOf(value));
function settings(value){
 if(!object(value))fail('PROMPT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(value),allowed=['query','limit','offset'];
 if(Reflect.ownKeys(ds).some(k=>typeof k!=='string'||!allowed.includes(k)
  ||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable))fail('PROMPT_INVALID');
 // Use the existing model's complete page contract before opening storage.
 buildPromptCandidates([],{complete:true,...value});return {...value};
}
async function authority(store,t){
 const control=await store.control(t),gate=await t.get('meta','gate');
 return JSON.stringify([store.databaseId,control.settings.epoch,
  gate?.epoch??null,gate?.enabled??null,
  (await t.get('meta','backup-data-generation'))?.value||0,
  (await t.get('meta','thought-epoch'))?.value||0]);
}
export async function promptInputInTransaction(store,t,inputId,policy,filter){
 const p=await inputProjection(store,t,inputId);if(!p)return null;
 if(await inputRevisitExcluded(t,p.block,policy)
  ||await store.isFiltered(t,p.block,filter))return null;
 if(!p.sourceRecordIds.length||!p.sourceRecordIds.includes(p.block.originalTextReference))
  fail('PROMPT_UNAVAILABLE');
 let primary=null;
 for(const id of p.sourceRecordIds){
  const ix=await t.get('recordIndex',id),record=(await t.get('records',id))?.value;
  // Canonical capture/import admit sent user text only. A foreign role or
  // unknown source cannot silently become a human prompt.
  if(!ix||!record||ix.hidden||ix.deletedAt||record.hidden||record.deletedAt
   ||record.role!==undefined&&record.role!=='user')return null;
  if(!validPortableSourceRecord(record))fail('PROMPT_UNAVAILABLE');
  if(id===p.block.originalTextReference)primary={ix,record};
 }
 if(!primary)fail('PROMPT_UNAVAILABLE');
 const time=primary.ix.sourceSentAt||null;
 if(time!==null&&(time!==primary.record.sourceSentAt||!Number.isFinite(Date.parse(time))))
  fail('PROMPT_UNAVAILABLE');
 return {kind:'input',role:'user',id:p.inputId,revision:p.contentRevision,
  sourceId:p.block.originalTextReference,sourceIds:p.sourceRecordIds,text:p.body,
  sourceSentAt:time,eligible:true};
}
export async function readPromptCandidates(store,options={}){
 const pageSettings=settings(options);
 if(!store?.repository||typeof store.finishFoundation!=='function'
  ||typeof store.isFiltered!=='function')fail('PROMPT_INVALID');
 await store.finishFoundation();
 const initial=await store.run(()=>store.repository.transaction(false,async t=>{
  if(await t.count('inputStates')>PROMPT_ARCHIVE_LIMITS.inputCount)fail('PROMPT_LIMIT');
  return authority(store,t);
 }));
 const rows=[],seen=new Set();let cursor,scanned=0,bodyBytes=0,sourceRefs=0;
 do{
  const part=await store.run(()=>store.repository.transaction(false,async t=>{
   if(await authority(store,t)!==initial)fail('PROMPT_STALE');
   const policy=await readRevisitPolicy(t),filter=await t.get('meta','smart-filter');
   if(!filter||filter.phase!=='active')fail('PROMPT_UNAVAILABLE');
   const page=await t.page('inputStates',{after:cursor,limit:PROMPT_ARCHIVE_LIMITS.pageInputs});
   const items=[];
   for(const {value:state} of page.rows){
    if(seen.has(state.id))fail('PROMPT_UNAVAILABLE');seen.add(state.id);
    if(++scanned>PROMPT_ARCHIVE_LIMITS.inputCount)fail('PROMPT_LIMIT');
    const input=await promptInputInTransaction(store,t,state.id,policy,filter);
    if(!input)continue;
    bodyBytes+=new TextEncoder().encode(input.text).length;sourceRefs+=input.sourceIds.length;
    if(bodyBytes>PROMPT_ARCHIVE_LIMITS.bodyBytes||sourceRefs>PROMPT_ARCHIVE_LIMITS.sourceRefs)
     fail('PROMPT_LIMIT');
    items.push(input);
   }
   return {items,next:page.next};
  }));
  rows.push(...part.items);cursor=part.next;
 }while(cursor!==null);
 // Search and frequency are computed over the complete eligible observation,
 // never over a filtered first page. No accumulated body is durably cached.
 const result=buildPromptCandidates(rows,{complete:true,...pageSettings});
 await store.run(()=>store.repository.transaction(false,async t=>{
  if(await authority(store,t)!==initial)fail('PROMPT_STALE');
 }));
 return Object.freeze({...result,complete:true,scannedInputs:scanned});
}
