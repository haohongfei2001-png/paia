import test from 'node:test';
import assert from 'node:assert/strict';
import {SmartFilterStore} from '../core/smart-filter-store.js';
import {archiveYearKey,archiveYearMeta,advanceArchiveYearIndex} from '../core/archive-year-index.js';
import {setup,capture} from './harness/thought-m1.mjs';
const read=(s,store,key)=>s.repository.transaction(false,t=>t.get(store,key));
async function fixture(){
 const f=await setup(SmartFilterStore),s=f.s,record=(await s.snapshot()).records[0];await s.changeRecord(record.id,row=>{row.sourceSentAt='2026-01-01T00:00:00Z';row.conversationOrder=1000001;});
 const before=await s.snapshot(),block=before.library.blocks[0],page=await s.page({documentId:block.documentId,yearReading:{}});assert.equal(page.yearReading.year,2026);
 return {...f,recordId:record.id,block,before,page};
}
const projection=ix=>({id:archiveYearKey(ix),inputId:ix.id,documentId:ix.documentId,sourceSentAt:ix.sourceSentAt,conversationOrder:ix.conversationOrder});
for(const change of ['same-instant-spelling','same-order-normalization'])test('same normalized annual key updates exact raw '+change+' through original Source owner',async()=>{
 const f=await fixture(),s=f.s;
 try{const beforeIndex=await read(s,'blockIndex',f.block.id),beforeMarker=await read(s,'meta',archiveYearMeta(f.block.documentId));
 await s.changeRecord(f.recordId,row=>{if(change==='same-instant-spelling')row.sourceSentAt='2026-01-01T00:00:00+00:00';else row.conversationOrder=null;});
 const index=await read(s,'blockIndex',f.block.id);assert.equal(archiveYearKey(index),archiveYearKey(beforeIndex),'this update changes original bytes while retaining the same normalized sort key');
 assert.deepEqual(await read(s,'meta',archiveYearKey(index)),projection(index),'disposable local metadata must remain exact for the original strict canonical consumer');
 const marker=await read(s,'meta',archiveYearMeta(f.block.documentId));assert.equal(marker.epoch,beforeMarker.epoch);assert.equal(marker.revision,beforeMarker.revision+1,'raw projection change invalidates the previously qualified annual cut');
 await assert.rejects(s.page({documentId:f.block.documentId,yearReading:{year:2026,generation:f.page.yearReading.generation}}),{code:'BACKUP_CHANGED'});
 assert.equal(await advanceArchiveYearIndex(s,f.block.documentId),true);assert.deepEqual(await read(s,'meta',archiveYearKey(index)),projection(index),'a completed build is not needed to heal a stale row');
 const fresh=await s.page({documentId:f.block.documentId,yearReading:{}});assert.deepEqual(fresh.pageItemIds,[f.block.id]);assert.equal(fresh.yearReading.year,2026);const after=await s.snapshot();assert.equal(after.records[0].originalText,f.before.records[0].originalText);assert.equal(after.library.blocks[0].libraryText,f.before.library.blocks[0].libraryText,'time/order metadata changes never rewrite Source or Working text');
 }finally{await s.repository.close();}
});
test('unrelated original Source metadata keeps the exact annual projection and authority stable',async()=>{
 const f=await fixture(),s=f.s;
 try{const index=await read(s,'blockIndex',f.block.id),row=await read(s,'meta',archiveYearKey(index)),marker=await read(s,'meta',archiveYearMeta(f.block.documentId));await s.changeRecord(f.recordId,record=>{record.timeConfidence='high';});assert.deepEqual(await read(s,'meta',archiveYearKey(index)),row);assert.deepEqual(await read(s,'meta',archiveYearMeta(f.block.documentId)),marker,'unchanged annual data does not invalidate its cursor');assert.deepEqual((await s.page({documentId:f.block.documentId,yearReading:{year:2026,generation:f.page.yearReading.generation}})).pageItemIds,[f.block.id]);
 }finally{await s.repository.close();}
});
test('annual read of a missing original document remains empty without inventing local metadata',async()=>{
 const f=await fixture(),s=f.s;
 try{const before=await s.repository.transaction(false,t=>t.all('meta')),missing='SYNTHETIC_nonexistent_document';assert.equal(await read(s,'documents',missing),undefined);
 const page=await s.page({documentId:missing,yearReading:{}});assert.deepEqual(page.pageItemIds,[]);assert.deepEqual(page.library.documents,[]);assert.equal(await read(s,'meta',archiveYearMeta(missing)),undefined,'a stale or absent reader route must not create an unqualified annual document');assert.deepEqual(await s.repository.transaction(false,t=>t.all('meta')),before,'the missing-document read has no derived writes');
 }finally{await s.repository.close();}
});
test('original permanent purge of the last Input removes only its annual build metadata',async()=>{
 const f=await fixture(),s=f.s;
 try{const originalIndex=await read(s,'blockIndex',f.block.id),request=capture((await s.status()).epoch,'SYNTHETIC_other_document_source','SYNTHETIC unrelated original source');request.chat={id:'synthetic-other-year-document',url:'https://chatgpt.com/c/synthetic-other-year-document',title:'Synthetic unrelated document'};await s.capture(request);const other=(await s.snapshot()).library.blocks.find(row=>row.documentId!==f.block.documentId);assert.ok(other);await s.page({documentId:other.documentId,yearReading:{}});const otherMarker=await read(s,'meta',archiveYearMeta(other.documentId));assert.equal((await s.sourcePurgePreflight(f.recordId)).state,'unambiguous');
 await s.permanentDelete(f.recordId);assert.equal(await read(s,'records',f.recordId),undefined);assert.equal(await read(s,'blocks',f.block.id),undefined);assert.equal(await read(s,'documents',f.block.documentId),undefined);assert.equal(await read(s,'meta',archiveYearMeta(f.block.documentId)),undefined,'a purged document must not leave an orphan annual build marker');assert.equal(await read(s,'meta',archiveYearKey(originalIndex)),undefined);assert.ok(await read(s,'tombstones','source:'+f.before.records[0].sourceKey),'original permanent-ignore authority survives');assert.deepEqual(await read(s,'meta',archiveYearMeta(other.documentId)),otherMarker,'purge cannot invalidate an unrelated document');assert.equal((await s.snapshot()).records[0].originalText,'SYNTHETIC unrelated original source');
 assert.deepEqual((await s.page({documentId:f.block.documentId,yearReading:{}})).pageItemIds,[]);assert.equal(await read(s,'meta',archiveYearMeta(f.block.documentId)),undefined);
 }finally{await s.repository.close();}
});
test('original nonfinal Input purge keeps the remaining annual projection and invalidates the prior cut',async()=>{
 const f=await fixture(),s=f.s;
 try{await s.capture(capture((await s.status()).epoch,'SYNTHETIC_remaining_same_document','SYNTHETIC remaining original source'));const before=await s.snapshot(),remaining=before.library.blocks.find(row=>row.id!==f.block.id);assert.equal(remaining.documentId,f.block.documentId);const page=await s.page({documentId:f.block.documentId,yearReading:{}}),marker=await read(s,'meta',archiveYearMeta(f.block.documentId));assert.equal((await s.sourcePurgePreflight(f.recordId)).state,'unambiguous');await s.permanentDelete(f.recordId);
 const after=await read(s,'meta',archiveYearMeta(f.block.documentId));assert.equal(after.epoch,marker.epoch);assert.equal(after.revision,marker.revision+1);assert.deepEqual(await read(s,'meta',archiveYearKey(await read(s,'blockIndex',remaining.id))),projection(await read(s,'blockIndex',remaining.id)));await assert.rejects(s.page({documentId:f.block.documentId,yearReading:{generation:page.yearReading.generation}}),{code:'BACKUP_CHANGED'});assert.equal((await s.snapshot()).records[0].originalText,'SYNTHETIC remaining original source');
 }finally{await s.repository.close();}
});
test('original human-work purge refusal preserves its annual metadata and current Working body',async()=>{
 const f=await fixture(),s=f.s;
 try{await s.updateLibrary(f.block.id,{libraryText:'SYNTHETIC protected human revision'});const marker=await read(s,'meta',archiveYearMeta(f.block.documentId)),index=await read(s,'blockIndex',f.block.id),row=await read(s,'meta',archiveYearKey(index));assert.equal((await s.sourcePurgePreflight(f.recordId)).state,'owner_gate_required');await assert.rejects(s.permanentDelete(f.recordId),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await read(s,'meta',archiveYearMeta(f.block.documentId)),marker);assert.deepEqual(await read(s,'meta',archiveYearKey(index)),row);assert.equal((await s.input(f.block.id)).libraryText,'SYNTHETIC protected human revision');assert.equal((await s.snapshot()).records[0].originalText,f.before.records[0].originalText);
 }finally{await s.repository.close();}
});
