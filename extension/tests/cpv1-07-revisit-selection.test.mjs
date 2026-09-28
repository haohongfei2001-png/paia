import test from 'node:test';
import assert from 'node:assert/strict';
import {RevisitService,selectResurface} from '../core/revisit.js';
import {ReaderStateService} from '../core/reader-state.js';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {capture,inputEdit} from './harness/thought-m1.mjs';

for(const meaningfulCount of [0,1,2,3,4,5]){
 test('CPV1-07 Revisit always fills scarce meaningful material first: '+meaningfulCount,()=>{
  const items=Array.from({length:11},(_,i)=>({id:'selection-'+i,
   sourceSentAt:new Date(Date.UTC(2020,0,i+1)).toISOString(),meaningful:i<meaningfulCount}));
  const original=structuredClone(items);
  for(let day=1;day<=31;day++){
   const key='2026-10-'+String(day).padStart(2,'0'),selected=selectResurface(items,key);
   assert.equal(selected.length,4);assert.equal(new Set(selected.map(x=>x.id)).size,4);
   assert.equal(selected.filter(x=>x.meaningful).length,Math.min(meaningfulCount,4));
   assert.ok(selected.slice(0,Math.min(meaningfulCount,4)).every(x=>x.meaningful));
   assert.deepEqual(selectResurface([...items].reverse(),key),selected);
   assert.deepEqual(selectResurface(items,key),selected);
  }
  assert.deepEqual(items,original);
 });
}
for(const limit of [0,-1,1.5,true,NaN,Infinity,'4',null]){
 test('CPV1-07 Revisit finite selection rejects invalid or zero limit: '+String(limit),()=>{
  assert.deepEqual(selectResurface([{id:'synthetic',meaningful:true}], '2026-09-27',limit),[]);
 });
}
test('CPV1-07 Revisit cannot become an unbounded feed through a larger limit',()=>{
 const items=Array.from({length:40},(_,i)=>({id:'bounded-'+i,meaningful:i<2}));
 assert.equal(selectResurface(items,'2026-09-27',1000).length,4);
 assert.equal(selectResurface([],'2026-09-27').length,0);
 assert.equal(selectResurface(items,'2026-09-27',2).length,2);
});

const now=Date.parse('2026-09-27T00:00:00Z');
async function fixture(){
 const texts=Array.from({length:8},(_,i)=>'CPV1_REVISIT_ORIGINAL_'+i+' 原来的表达与反例保持不变。');
 const f=await completeFixture({texts});await f.s.finishFoundation();
 const records=await rows(f.s,'records');
 await f.s.enrich({epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',
  chat:{id:'complete-synthetic',url:'https://chatgpt.com/c/complete-synthetic'},
  messages:records.map((r,i)=>({sourceMessageId:r.value.sourceMessageId,pageOrder:i+1,
   sourceTime:{state:'valid',createTime:1609459200+i,updateTime:1609459201+i}}))});
 const blocks=(await rows(f.s,'blocks')).map(x=>x.value);
 assert.equal(blocks.length,8);
 for(let i=0;i<2;i++)await inputEdit(f.s,blocks[i].id,{
  libraryText:'CPV1_REVISIT_WORKED_'+i+' 这是独立工作版本，原话不改写。'});
 const service=new RevisitService(f.s,{clock:()=>now}),reader=new ReaderStateService(f.s);
 await service.status();
 return {...f,blocks,service,reader};
}
const authority=async s=>({records:await rows(s,'records'),blocks:await rows(s,'blocks'),
 inputStates:await rows(s,'inputStates'),dependencies:await rows(s,'dependencies')});

test('CPV1-07 actual Revisit gives fixed explanations and preserves all source/work evidence',async()=>{
 const f=await fixture(),before=await authority(f.s);
 assert.deepEqual((await f.service.status({includeOld:true})).resurface,[]);
 await f.reader.configure({oldContent:true});
 const result=await f.service.status({includeOld:true});
 assert.equal(result.resurface.length,4);
 assert.deepEqual(new Set(result.resurface.filter(x=>x.meaningful).map(x=>x.id)),
  new Set(f.blocks.slice(0,2).map(x=>x.id)));
 assert.ok(result.resurface.slice(0,2).every(x=>x.revisitReason==='previously_worked'));
 assert.ok(result.resurface.slice(2).every(x=>x.revisitReason==='earlier_material'));
 assert.ok(result.resurface.every(x=>x.sourceSentAt&&x.kind==='input'));
 assert.equal(result.localOnly,true);assert.equal(result.storesBody,false);
 assert.equal(result.newInputs.count,0);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
 await f.reader.configure({oldContent:false});
 assert.deepEqual((await f.service.status({includeOld:true})).resurface,[]);
});

test('CPV1-07 exclusions and purge remove priority candidates without replay or cached previews',async()=>{
 const f=await fixture();await f.reader.configure({oldContent:true});
 await f.reader.configure({kind:'input',id:f.blocks[0].id,excluded:true});
 let result=await f.service.status({includeOld:true});
 assert.equal(result.resurface.length,4);
 assert.equal(result.resurface.some(x=>x.id===f.blocks[0].id),false);
 assert.equal(result.resurface[0].id,f.blocks[1].id);
 await f.s.permanentDelete(f.blocks[1].originalTextReference);
 result=await f.service.status({includeOld:true});
 assert.equal(result.resurface.length,4);
 assert.ok(result.resurface.every(x=>!f.blocks.slice(0,2).some(b=>b.id===x.id)));
 assert.doesNotMatch(JSON.stringify(result),/CPV1_REVISIT_WORKED_[01]/);
 await f.reader.configure({kind:'document',id:f.blocks[2].documentId,excluded:true});
 assert.deepEqual((await f.service.status({includeOld:true})).resurface,[]);
 assert.equal(f.requests.length,0);
});

test('CPV1-07 fresh old-dated capture explains visit provenance and never becomes unread debt',async()=>{
 const f=await fixture();await f.reader.configure({oldContent:true});
 const request=capture((await f.s.status()).epoch,'cpv1-revisit-fresh',
  'CPV1_REVISIT_FRESH 原话时间较早，但这次才保存。');
 request.messages[0].sourceTime={state:'valid',createTime:1609459200,updateTime:1609459201};
 await f.s.capture(request);
 const before=await authority(f.s),result=await f.service.status({includeOld:true});
 assert.equal(result.newInputs.count,1);
 assert.equal(result.newInputs.items[0].revisitReason,'saved_since_visit');
 assert.ok(result.resurface.every(x=>x.id!==result.newInputs.items[0].id));
 assert.equal(result.resurface.length,4);
 assert.equal(Object.hasOwn(result,'unread'),false);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});

test('CPV1-07 real close/open visit boundary keeps old-dated new captures distinct without read debt',async()=>{
 const f=await completeFixture({texts:[]}),service=new RevisitService(f.s,{clock:()=>now}),
  reader=new ReaderStateService(f.s);
 await service.status();
 for(let i=0;i<8;i++){
  const request=capture((await f.s.status()).epoch,'cpv1-visit-cycle-'+i,
   'CPV1_VISIT_CYCLE_'+i+' 原话日期早于这次保存，不能冒充已读。');
  request.messages[0].sourceTime={state:'valid',createTime:1609459200+i,updateTime:1609459201+i};
  await f.s.capture(request);
 }
 await f.s.finishFoundation();await reader.configure({oldContent:true});
 const before=await authority(f.s),first=await service.open(),fresh=await service.status({
  windowId:first.id,includeOld:true});
 assert.equal(first.start,0);assert.equal(first.end,8);
 assert.equal(fresh.newInputs.count,8);assert.equal(fresh.newInputs.items.length,5);
 assert.ok(fresh.newInputs.items.every(item=>item.revisitReason==='saved_since_visit'));
 assert.deepEqual(fresh.resurface,[]);assert.deepEqual(await reader.recent(),[]);
 assert.deepEqual(await authority(f.s),before);
 await service.close({windowId:first.id});
 const next=await service.open(),older=await service.status({windowId:next.id,includeOld:true});
 assert.equal(next.start,8);assert.equal(next.end,8);
 assert.equal(older.newInputs.count,0);assert.equal(older.resurface.length,4);
 assert.ok(older.resurface.every(item=>item.revisitReason==='earlier_material'));
 assert.deepEqual(await reader.recent(),[]);assert.equal(Object.hasOwn(older,'unread'),false);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});


async function pagedPriorityFixture(size,workedPositions){
 const f=await completeFixture({texts:Array.from({length:size},(_,i)=>
  'CPV1_PAGED_ORIGINAL_'+i+' 原来的完整表达、日期证据和独立版本不能丢失。')});
 await f.s.finishFoundation();
 const records=await rows(f.s,'records');
 for(let start=0;start<records.length;start+=100)await f.s.enrich({
  epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',
  chat:{id:'complete-synthetic',url:'https://chatgpt.com/c/complete-synthetic'},
  messages:records.slice(start,start+100).map((r,offset)=>({
   sourceMessageId:r.value.sourceMessageId,pageOrder:start+offset+1,
   sourceTime:{state:'valid',createTime:1609459200+start+offset,
    updateTime:1609459201+start+offset}}))});
 const blocks=(await rows(f.s,'blocks')).map(x=>x.value),
  indexes=(await rows(f.s,'blockIndex')).sort((a,b)=>a.sequence-b.sequence);
 assert.equal(indexes.length,size);
 const worked=workedPositions.map(position=>blocks.find(b=>b.id===indexes[position].id));
 assert.ok(worked.every(Boolean));
 for(let i=0;i<worked.length;i++)await inputEdit(f.s,worked[i].id,{
  libraryText:'CPV1_PAGED_WORKED_'+i+' 完整工作版本保持独立，不能重写原话。'});
 const service=new RevisitService(f.s,{clock:()=>now}),reader=new ReaderStateService(f.s);
 await service.status();await reader.configure({oldContent:true});
 return {...f,worked,indexes,service,reader};
}

test('CPV1-07 Revisit priority spans real cursor pages before selecting its finite set',async()=>{
 const f=await pagedPriorityFixture(205,[0,1,2,3]),before=await authority(f.s);
 const result=await f.service.status({includeOld:true});
 assert.equal(result.resurface.length,4);assert.equal(result.resurfaceTruncated,false);
 assert.deepEqual(new Set(result.resurface.map(x=>x.id)),new Set(f.worked.map(x=>x.id)));
 assert.ok(result.resurface.every(x=>x.meaningful&&x.revisitReason==='previously_worked'));
 assert.deepEqual((await f.service.status({includeOld:true})).resurface,result.resurface);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
 await f.reader.configure({kind:'input',id:f.worked[0].id,excluded:true});
 const excluded=await f.service.status({includeOld:true});
 assert.equal(excluded.resurface.length,4);
 assert.equal(excluded.resurface.some(x=>x.id===f.worked[0].id),false);
 assert.equal(excluded.resurface.filter(x=>x.meaningful).length,3);
 await f.s.permanentDelete(f.worked[1].originalTextReference);
 const purged=await f.service.status({includeOld:true});
 assert.equal(purged.resurface.filter(x=>x.meaningful).length,2);
 assert.ok(purged.resurface.every(x=>!f.worked.slice(0,2).some(b=>b.id===x.id)));
 assert.equal(f.requests.length,0);
});

test('CPV1-07 cross-page priority respects the original1200-row bound and reports partial evidence',async()=>{
 const f=await pagedPriorityFixture(1205,[0,5,6,7,8]),before=await authority(f.s);
 let scanned=0,pages=0;
 const transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{
  const range=t.rangePage.bind(t);
  t.rangePage=async(...args)=>{
   const page=await range(...args);
   if(args[0]==='blockIndex'&&args[1]==='bySequence'){
    scanned+=page.rows.length;pages++;
    assert.ok(args[4]<=100);
   }
   return page;
  };
  return fn(t);
 },...rest);
 const result=await f.service.status({includeOld:true});
 assert.equal(scanned,1200);assert.equal(pages,12);
 assert.equal(result.resurfaceTruncated,true);assert.equal(result.resurface.length,4);
 assert.deepEqual(new Set(result.resurface.map(x=>x.id)),new Set(f.worked.slice(1).map(x=>x.id)));
 assert.equal(result.resurface.some(x=>x.id===f.worked[0].id),false,
  'material beyond the fixed scan boundary is not silently fetched');
 assert.ok(result.resurface.every(x=>x.meaningful&&x.revisitReason==='previously_worked'));
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
