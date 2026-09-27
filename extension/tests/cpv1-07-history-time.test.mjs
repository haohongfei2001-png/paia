import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalInstant,historicalSourceTime,historicalDateBound} from '../core/historical-time.js';
import {inputTimeline} from '../core/universal-search.js';
import {searchMaterialPage} from '../core/search-material-page.js';
import {RevisitService} from '../core/revisit.js';
import {ReaderStateService} from '../core/reader-state.js';
import {completeFixture,rows} from './harness/original-complete.mjs';

test('CPV1-07 historical time accepts actual calendar instants and preserves timezone evidence',()=>{
 const values=['2024-02-29T23:59:59Z','2026-01-01T00:30:00+01:00','2025-12-31T23:30:00.000Z','2026-03-01T01:02:03.4Z'];
 for(const value of values){assert.equal(historicalInstant(value),Date.parse(value));assert.equal(historicalSourceTime(value),value);}
 assert.equal(historicalInstant(values[1]),historicalInstant(values[2]));
 assert.equal(historicalDateBound('2024-02-29'),Date.UTC(2024,1,29));
 assert.equal(historicalDateBound(values[0]),Date.parse(values[0]));
});
for(const value of [null,undefined,0,true,'2026','2026-01-01','01/02/2026',
 '2026-02-29T00:00:00Z','2024-02-30T00:00:00Z','2026-04-31T00:00:00Z',
 '2026-01-01T24:00:00Z','2026-01-01T00:60:00Z','2026-01-01T00:00:60Z',
 '2026-01-01T00:00:00','2026-01-01T00:00:00+01:60','PRIVATE_TIME_CANARY']){
 test('CPV1-07 ambiguous or impossible source time remains unknown: '+String(value),()=>{
  assert.equal(historicalInstant(value),null);assert.equal(historicalSourceTime(value),null);
 });
}
test('CPV1-07 date bounds reject impossible dates and ambiguous locale/year strings',()=>{
 for(const value of ['2026-02-29','2024-02-30','2026-04-31','2026-13-01','2026','02/01/2026','PRIVATE_DATE_CANARY'])
  assert.equal(historicalDateBound(value),null);
});

const expressions=[
 'HIST 原来的提议：所有笔记都合并，但我尚未决定。',
 'HIST 后续修正：我收回全部合并的提议，保留反例。',
 'HIST 引用同事：“全部合并更好”，这不是我的判断。',
 'HIST 时间未知：我仍在考虑不同可能。',
 'HIST 不可能日期：不能把这条放入已知日期。',
 'HIST 缺失时区：不能猜测本机所在时区。',
 'HIST 日期数字不是发送时刻。',
 'HIST 未知时间表达，后来收录不代表后来表达。'
];
const stamps=['2020-01-01T00:00:00Z','2021-02-01T00:00:00.000Z',
 '2020-01-01T00:30:00+01:00',null,'2026-02-30T00:00:00Z',
 '2026-01-01T00:00:00','2026',null];
async function fixture(){
 const f=await completeFixture({texts:expressions});
 await f.s.finishFoundation();
 const sourceRows=await rows(f.s,'records'),allBlocks=(await rows(f.s,'blocks')).map(x=>x.value);
 const blocks=expressions.map(text=>allBlocks.find(b=>sourceRows.find(r=>r.id===b.originalTextReference)?.value.originalText===text));
 assert.equal(blocks.length,8);assert.ok(blocks.every(Boolean));assert.equal(new Set(blocks.map(b=>b.id)).size,8);
 // Model older/malformed migrated evidence without calling a different search
 // implementation. Capture/update times remain separate, untouched authorities.
 await f.s.repository.transaction(true,async t=>{
  for(let i=0;i<blocks.length;i++){
   const b=blocks[i],record=await t.get('records',b.originalTextReference),
    source=await t.get('recordIndex',b.originalTextReference),index=await t.get('blockIndex',b.id);
   record.value.sourceSentAt=stamps[i];source.sourceSentAt=stamps[i];index.sourceSentAt=stamps[i];
   await t.put('records',record);await t.put('recordIndex',source);await t.put('blockIndex',index);
  }
 });
 return {...f,blocks};
}
const authority=async s=>({records:await rows(s,'records'),blocks:await rows(s,'blocks'),
 sourceIndex:await rows(s,'recordIndex'),inputStates:await rows(s,'inputStates')});

test('CPV1-07 actual historical date scope excludes unknown/malformed evidence and keeps source bodies',async()=>{
 const f=await fixture(),before=await authority(f.s);
 const all=await searchMaterialPage(f.s,{query:'HIST',mode:'history',limit:20});
 assert.equal(all.items.length,8);assert.equal(all.complete,true);
 for(let i=0;i<f.blocks.length;i++){
  const item=all.items.find(x=>x.id===f.blocks[i].id);
  assert.equal(item.body,expressions[i]);assert.equal(item.ref.kind,'source');
  assert.equal(item.ref.sourceId,f.blocks[i].originalTextReference);assert.equal(item.historical,true);
  assert.equal(item.sourceSentAt,i<3?stamps[i]:null);
 }
 const scoped=await searchMaterialPage(f.s,{query:'HIST',mode:'history',
  dateFrom:'2020-01-01',to:'2020-12-31',limit:20});
 assert.deepEqual(scoped.items.map(x=>x.id),[f.blocks[0].id]);
 const earlier=await searchMaterialPage(f.s,{query:'HIST',mode:'history',to:'2019-12-31',limit:20});
 assert.deepEqual(earlier.items.map(x=>x.id),[f.blocks[2].id]);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 actual historical read refuses invalid/reversed date requests without rewriting evidence',async()=>{
 const f=await fixture(),before=await authority(f.s);
 for(const bounds of [{dateFrom:'2026-02-30'},{to:'2026-04-31'},
  {dateFrom:'2026'},{to:'PRIVATE_DATE_CANARY'},{dateFrom:'2026-01-02',to:'2026-01-01'}]){
  await assert.rejects(searchMaterialPage(f.s,{query:'HIST',mode:'history',...bounds}),{code:'INVALID_REQUEST'});
 }
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 original negation/correction/quotation survive current rewrites and source deletion stays absent',async()=>{
 const f=await fixture(),b=f.blocks[0];
 await f.s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[
  {id:b.id,expectedRevision:b.revision,libraryText:'CURRENT_ONLY 今天改写与当年原话不同',note:'',excluded:false}]});
 const before=await authority(f.s);
 const past=await searchMaterialPage(f.s,{query:'HIST',mode:'history',limit:20});
 assert.equal(past.items.find(x=>x.id===b.id).body,expressions[0]);
 assert.equal(past.items.find(x=>x.id===f.blocks[1].id).body,expressions[1]);
 assert.equal(past.items.find(x=>x.id===f.blocks[2].id).body,expressions[2]);
 assert.equal((await searchMaterialPage(f.s,{query:'CURRENT_ONLY',mode:'history'})).items.length,0);
 assert.equal((await searchMaterialPage(f.s,{query:'CURRENT_ONLY'})).items.length,1);
 assert.equal(past.items.some(x=>Object.hasOwn(x,'currentBelief')||Object.hasOwn(x,'supersedes')),false);
 assert.deepEqual(await authority(f.s),before);
 await f.s.permanentDelete(f.blocks[2].originalTextReference);
 assert.equal((await searchMaterialPage(f.s,{query:'HIST',mode:'history',limit:20})).items.some(x=>x.id===f.blocks[2].id),false);
 assert.equal(f.requests.length,0);
});
test('CPV1-07 chronological grouping uses actual timezone instants and preserves unknown evidence last',()=>{
 const items=[{id:'jan',sourceSentAt:'2026-01-01T00:00:00Z'},
  {id:'offset',sourceSentAt:'2026-01-01T00:30:00+01:00'},
  {id:'bad',sourceSentAt:'2026-02-30T00:00:00Z',capturedAt:'2020-01-01T00:00:00Z'},
  {id:'missing',sourceSentAt:null,capturedAt:'2010-01-01T00:00:00Z'},
  {id:'ambiguous',sourceSentAt:'2026',capturedAt:'2000-01-01T00:00:00Z'}];
 const before=structuredClone(items),groups=inputTimeline(items);
 assert.deepEqual(groups.map(x=>x.key),['2025-12','2026-01','unknown']);
 assert.equal(groups[0].items[0].id,'offset');
 assert.deepEqual(groups[2].items.map(x=>x.id),['ambiguous','bad','missing']);
 assert.deepEqual(items,before);
});
test('CPV1-07 finite Revisit never resurfaces impossible or ambiguous time as dated old material',async()=>{
 const f=await fixture(),before=await authority(f.s),
  service=new RevisitService(f.s,{clock:()=>Date.parse('2026-09-27T00:00:00Z')});
 await service.status();await new ReaderStateService(f.s).configure({oldContent:true});
 const result=await service.status({includeOld:true});
 assert.equal(result.resurface.length,3);
 assert.deepEqual(new Set(result.resurface.map(x=>x.id)),new Set(f.blocks.slice(0,3).map(x=>x.id)));
 assert.ok(result.resurface.every(x=>x.sourceSentAt&&historicalInstant(x.sourceSentAt)!==null));
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
