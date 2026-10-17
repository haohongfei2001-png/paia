import {documentBlocks} from '../core/library.js';
import {archiveYearInstant,archiveYearPrefix} from '../core/archive-year-index.js';
const yearOf=value=>{const at=archiveYearInstant(value);return at===null?'undated':new Date(at).getUTCFullYear();};
// A changed annual index is not permission to rebuild the document. Qualify
// only its mounted original Inputs and fresh continuation through GET_PAGE.
export async function requalifyArchiveYear({documentId,sort,snapshot,includeFiltered=false,recoveryEpoch,rows,pageCursors=[],windowStartCursor=undefined,expected,load,isCurrent=()=>true}={}){
 const fail=(reason,page=null)=>({ok:false,reason,page});
 if(typeof documentId!=='string'||!['asc','desc'].includes(sort)||typeof recoveryEpoch!=='string'||!recoveryEpoch||!Array.isArray(rows)||!rows.length||rows.length>80||typeof load!=='function'||!(expected instanceof Map))return fail('scope_unavailable');
 if(rows.some(row=>typeof row?.id!=='string'))return fail('scope_unavailable');
 if(!Array.isArray(pageCursors)||pageCursors.length>200)return fail('scope_unavailable');
 const ids=rows.map(row=>row.id);if(new Set(ids).size!==ids.length)return fail('scope_unavailable');
 let generation=null,dataGeneration=null,last=null;const blocks=new Map(),records=new Map(),cursors=new Map();
 const base={view:'library',documentId,sort,readingSnapshot:snapshot,includeFiltered,limit:3};
 const valid=page=>{
  if(!isCurrent()||!page||page.contextUnavailable||page.recoveryEpoch!==recoveryEpoch||page.yearReading?.building||!page.conversations?.some(doc=>doc.id===documentId)||typeof page.yearReading?.generation!=='string'||!Number.isSafeInteger(page.dataGeneration))return false;
  if(generation===null){generation=page.yearReading.generation;dataGeneration=page.dataGeneration;}
  return generation===page.yearReading.generation&&dataGeneration===page.dataGeneration;
 };
 try{
  for(const row of rows){
   if(last&&yearOf(row.sourceSentAt)!==yearOf(last.row.sourceSentAt)){
    let boundary=await load({...base,limit:1,cursor:last.cursor,yearReading:{year:last.year.year,phase:last.year.phase,generation},expectedGeneration:dataGeneration});
    if(!valid(boundary))return fail('scope_changed',boundary);
    if(boundary.pageItemIds.length||boundary.nextCursor)return fail('opened_year_gap_changed',boundary);
    if(yearOf(row.sourceSentAt)==='undated'&&boundary.yearReading.continuation){boundary=await load({...base,limit:1,yearReading:boundary.yearReading.continuation,expectedGeneration:dataGeneration});if(!valid(boundary))return fail('scope_changed',boundary);}
    if(boundary.yearReading.nextYear!==yearOf(row.sourceSentAt))return fail('opened_year_gap_changed',boundary);
   }
   const page=await load({...base,contextInputId:row.id,trackedBlockIds:[row.id],yearReading:generation?{generation}:{},...(dataGeneration===null?{}:{expectedGeneration:dataGeneration})});
   if(!valid(page))return fail('scope_changed',page);
   const fresh=documentBlocks(page,documentId).find(item=>item.id===row.id),bound=expected.get(row.id),cursor=page.pageItemCursors?.[row.id];
   if(!fresh||!page.pageItemIds.includes(row.id)||!bound||fresh.revision!==bound.revision||fresh.provenanceSignature!==bound.signature||!Array.isArray(cursor)||cursor.length!==1||typeof cursor[0]!=='string')return fail('input_changed',page);
   if(yearOf(fresh.sourceSentAt)!==yearOf(row.sourceSentAt))return fail('year_changed',page);
   const previous=last?.row;
   if(previous&&yearOf(previous.sourceSentAt)===yearOf(fresh.sourceSentAt)){
    const a=last.cursor[0],b=cursor[0],ascending=page.yearReading.phase==='undated'||sort==='asc';
    if(ascending?a>=b:a<=b)return fail('order_changed',page);
    const adjacent=await load({...base,limit:1,cursor:last.cursor,yearReading:{year:last.year.year,phase:last.year.phase,generation},expectedGeneration:dataGeneration});
    if(!valid(adjacent))return fail('scope_changed',adjacent);
    if(adjacent.pageItemIds?.[0]!==row.id)return fail('mounted_gap_changed',adjacent);
   }
   blocks.set(row.id,page.library.blocks.find(item=>item.id===row.id));for(const record of page.records)if(fresh.provenance?.some(p=>p.sourceRecordId===record.id)||fresh.originalTextReference===record.id)records.set(record.id,record);
   cursors.set(row.id,structuredClone(cursor));last={row:fresh,cursor,year:page.yearReading,page};
  }
  const qualifiedCursors=new Map();
  for(const cursor of pageCursors){
   if(cursor===null||cursor===undefined)continue;
   if(!Array.isArray(cursor)||cursor.length!==1||typeof cursor[0]!=='string'||!cursor[0].startsWith(archiveYearPrefix(documentId)))return fail('cursor_unavailable');
   const old=cursor[0];if(qualifiedCursors.has(old))continue;
   let id;try{id=decodeURIComponent(old.slice(old.lastIndexOf(':')+1));}catch{return fail('cursor_unavailable');}
   const fresh=cursors.get(id);
   if(fresh){qualifiedCursors.set(old,fresh);continue;}
   const boundary=await load({...base,contextInputId:id,yearReading:{generation},expectedGeneration:dataGeneration});
   if(!valid(boundary))return fail('scope_changed',boundary);
   // A pruned page boundary may be reused only after its exact original key
   // has been proved current. Movement outside the mounted window is not
   // permission to replay unqualified old descriptors.
   if(!boundary.pageItemIds.includes(id)||boundary.pageItemCursors?.[id]?.[0]!==old)return fail('cursor_changed',boundary);
   qualifiedCursors.set(old,[old]);
  }
  if(windowStartCursor!==undefined){
   const cursor=windowStartCursor===null?null:qualifiedCursors.get(windowStartCursor?.[0]);
   if(cursor===undefined)return fail('cursor_unavailable');
   const first=await load({...base,limit:1,cursor,yearReading:{year:yearOf(rows[0].sourceSentAt),phase:yearOf(rows[0].sourceSentAt)==='undated'?'undated':'dated',generation},expectedGeneration:dataGeneration});
   if(!valid(first))return fail('scope_changed',first);
   if(first.pageItemIds?.[0]!==rows[0].id)return fail('mounted_gap_changed',first);
  }
  const tail=await load({...base,limit:1,cursor:last.cursor,yearReading:{year:last.year.year,phase:last.year.phase,generation},expectedGeneration:dataGeneration});
  if(!valid(tail))return fail('scope_changed',tail);
  const check=await load({...base,contextInputId:rows[0].id,yearReading:{generation},expectedGeneration:dataGeneration});
  if(!valid(check)||!check.pageItemIds.includes(rows[0].id))return fail('scope_changed',check);
  return {ok:true,generation,dataGeneration,blocks:[...blocks.values()],records:[...records.values()],cursors,pageCursors:qualifiedCursors,year:tail.yearReading,endCursor:tail.pageItemIds.length?last.cursor:tail.nextCursor??null,page:last.page};
 }catch(error){return fail(error?.code==='BACKUP_CHANGED'?'scope_changed':'read_failed');}
}
