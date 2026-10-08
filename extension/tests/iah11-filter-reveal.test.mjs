import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {SmartFilterStore} from '../core/smart-filter-store.js';
globalThis.IDBKeyRange=IDBKeyRange;
const presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};
async function fixture({evaluate=true}={}){
 const data={},storage={get:async k=>({[k]:structuredClone(data[k])}),set:async x=>Object.assign(data,structuredClone(x))};
 const s=new SmartFilterStore(storage,{indexedDB:new IDBFactory()});await s.consent(true);
 async function capture(chat,texts){await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:chat,url:'https://chatgpt.com/c/'+chat,title:chat},messages:texts.map((originalText,i)=>({sourceMessageId:chat+'-message-'+i,pageOrder:i+1,originalText,presence}))});}
 await capture('reveal-primary',['普通内容一','继续','请继续','开始吧','普通内容二']);await capture('reveal-other',['另一个对话']);
 const snapshot=await s.snapshot(),rows=snapshot.library.blocks.map(b=>({...b,text:snapshot.records.find(r=>r.id===b.sourceRecordId)?.originalText}));const target=rows.find(x=>x.text==='请继续');
 assert.ok(target);const documentId=target.documentId,all=rows.filter(x=>x.documentId===documentId),normal=all.filter(x=>x.text.startsWith('普通')).map(x=>x.id),other=rows.find(x=>x.documentId!==documentId);
 if(evaluate)await s.evaluateFilters();
 const stored=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['records','blocks','filterInputs','filterIntents','revisions','meta','tombstones'].map(async n=>[n,await t.all(n)]))));
 return {s,target,documentId,all,normal,other,stored};
}
for(const sort of ['asc','desc'])test('temporary filtered target does not reveal filtered neighbours: '+sort,async()=>{
 const f=await fixture();try{
 const ordinary=await f.s.page({documentId:f.documentId,sort});assert.deepEqual([...ordinary.pageItemIds].sort(),[...f.normal].sort());
 const before=await f.stored(),result=await f.s.page({documentId:f.documentId,contextInputId:f.target.id,sort});
 assert.equal(result.contextUnavailable,false);assert.ok(result.pageItemIds.includes(f.target.id));
 assert.deepEqual(await f.stored(),before,'read does not change originals, filter decisions/intents, revisions or metadata');
 assert.deepEqual((await f.s.page({documentId:f.documentId,sort})).pageItemIds,ordinary.pageItemIds,'ordinary read remains filtered');
 assert.deepEqual(result.pageItemIds,(await f.s.page({documentId:f.documentId,sort,includeFiltered:true})).pageItemIds.filter(id=>id===f.target.id||f.normal.includes(id)),'only target is an exception, retaining requested order');
 }finally{await f.s.repository.close();}
});
test('explicit includeFiltered still admits every filtered row',async()=>{
 const f=await fixture();try{for(const sort of ['asc','desc']){const result=await f.s.page({documentId:f.documentId,contextInputId:f.target.id,includeFiltered:true,sort});assert.deepEqual([...result.pageItemIds].sort(),f.all.map(x=>x.id).sort());}}finally{await f.s.repository.close();}
});
for(const kind of ['excluded','wrong-document','tombstone'])test('unavailable context target is never revealed: '+kind,async()=>{
 const f=await fixture();try{
 if(kind==='excluded')await f.s.excludeLibrary(f.target.id,true);
 if(kind==='tombstone')await f.s.permanentDelete(f.target.sourceRecordId);
 const documentId=kind==='wrong-document'?f.other.documentId:f.documentId,before=await f.stored();
 const result=await f.s.page({documentId,contextInputId:f.target.id});assert.equal(result.contextUnavailable,true);assert.ok(!result.pageItemIds.includes(f.target.id));assert.deepEqual(result.pageItemIds,(await f.s.page({documentId})).pageItemIds);assert.deepEqual(await f.stored(),before);
 }finally{await f.s.repository.close();}
});
test('a legitimate earlier readingSnapshot retains its pre-decision visibility',async()=>{
 const f=await fixture({evaluate:false});try{const initial=await f.s.page({documentId:f.documentId});await f.s.evaluateFilters();const frozen=await f.s.page({documentId:f.documentId,contextInputId:f.target.id,readingSnapshot:initial.readingSnapshot});assert.deepEqual(frozen.pageItemIds,initial.pageItemIds);assert.deepEqual((await f.s.page({documentId:f.documentId})).pageItemIds,initial.pageItemIds.filter(id=>f.normal.includes(id)));}finally{await f.s.repository.close();}
});
