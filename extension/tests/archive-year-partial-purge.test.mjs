import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SmartFilterStore} from '../core/smart-filter-store.js';
import {advanceArchiveYearIndex,clearArchiveYearIndex,archiveYearKey,archiveYearMeta} from '../core/archive-year-index.js';
import {equal,exact,opaque,count,fail} from '../core/browser-native-sync/value.js';
import {setup,capture} from './harness/thought-m1.mjs';

// Execute the unchanged private cache consumer, without inventing transport
// scope or claiming this 401-Input corpus fits the original Sync group caps.
const source=readFileSync(new URL('../core/browser-native-sync/source-working-default-meta.js',import.meta.url),'utf8');
const consumerSource=source.slice(source.indexOf('const refuse='),source.indexOf('// Pure reconstruction'));
assert.ok(consumerSource.includes('function consumeArchiveYearMetadata('));
const consume=new Function('archiveYearKey','archiveYearMeta','equal','exact','opaque','count','fail',consumerSource+'\nreturn consumeArchiveYearMetadata;')(archiveYearKey,archiveYearMeta,equal,exact,opaque,count,fail);
const cut=s=>s.repository.transaction(false,async t=>({blockIndex:await t.all('blockIndex'),meta:await t.all('meta')}));
const consumeCut=rows=>consume(new Map(rows.meta.filter(row=>row.id.startsWith('archive-year:v1:')).map(row=>[row.id,row])),rows);

test('original purge of a partial annual build cursor retires only that volatile marker and rebuilds through bounded batches',async()=>{
 const {s}=await setup(SmartFilterStore);
 try{
  const epoch=(await s.status()).epoch;
  for(let start=0;start<400;start+=200){const request=capture(epoch);request.messages=Array.from({length:200},(_,offset)=>({sourceMessageId:'SYNTHETIC_partial_purge_'+(start+offset),pageOrder:2+start+offset,originalText:'SYNTHETIC immutable source '+(start+offset)}));await s.capture(request);}
  const before=await s.snapshot(),documentId=before.library.blocks[0].documentId;assert.equal(before.library.blocks.length,401);
  // Initial capture creates exact derived rows and no build marker. This local
  // cache is valid even though no annual read has yet requested a complete cut.
  consumeCut(await cut(s));
  assert.equal((await cut(s)).meta.some(row=>row.id===archiveYearMeta(documentId)),false);
  await s.repository.transaction(true,t=>clearArchiveYearIndex(t));
  assert.equal(await advanceArchiveYearIndex(s,documentId),false,'401 original Inputs exceed the unchanged four100-row build budget');
  const partial=await cut(s),marker=partial.meta.find(row=>row.id===archiveYearMeta(documentId));assert.equal(marker.complete,false);consumeCut(partial);
  const block=before.library.blocks.find(row=>row.id===marker.cursor);assert.ok(block);
  assert.equal((await s.sourcePurgePreflight(block.sourceRecordId)).state,'unambiguous');
  await s.permanentDelete(block.sourceRecordId);
  const after=await cut(s);assert.equal(after.blockIndex.length,400);assert.equal(after.blockIndex.some(row=>row.id===marker.cursor),false);
  const noMarker={...after,meta:after.meta.filter(row=>row.id!==marker.id)};consumeCut(noMarker);
  const orphan=after.meta.find(row=>row.id===marker.id),invalid={...after,meta:[...noMarker.meta,{...marker,revision:marker.revision+1}]};
  if(orphan){assert.deepEqual(orphan,invalid.meta.at(-1));assert.throws(()=>consumeCut(after),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});}
  assert.throws(()=>consumeCut(invalid),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'},'the unchanged strict consumer must reject a partial marker whose original cursor is gone');
  assert.equal(orphan,undefined,'a retired original cursor cannot remain a partial cache qualification');
  consumeCut(after);
  const expectedRecords=before.records.filter(row=>row.id!==block.sourceRecordId),expectedBlocks=before.library.blocks.filter(row=>row.id!==block.id),actual=await s.snapshot();
  assert.deepEqual(actual.records,expectedRecords,'remaining original Source bytes and metadata stay unchanged');assert.deepEqual(actual.library.blocks,expectedBlocks,'remaining human Working bytes and metadata stay unchanged');
  const retained=partial.meta.filter(row=>row.id.startsWith('archive-year:v1:row:')&&row.inputId!==block.id);for(const row of retained)assert.deepEqual(after.meta.find(value=>value.id===row.id),row,'retiring a marker does not erase other exact derived rows');
  assert.equal(await advanceArchiveYearIndex(s,documentId),false,'the original four100-row budget yields before the actual terminal read, even at an exact400-row boundary');
  const pending=await cut(s),fresh=pending.meta.find(row=>row.id===marker.id);assert.equal(fresh.complete,false);assert.notEqual(fresh.epoch,marker.epoch);consumeCut(pending);
  assert.equal(await advanceArchiveYearIndex(s,documentId),true,'only the original next bounded read may qualify the actual end');
  const rebuilt=await cut(s),next=rebuilt.meta.find(row=>row.id===marker.id);assert.equal(next.complete,true);assert.equal(next.cursor,null);assert.equal(next.epoch,fresh.epoch);consumeCut(rebuilt);assert.deepEqual((await s.snapshot()).records,expectedRecords);
 }finally{await s.repository.close();}
});
