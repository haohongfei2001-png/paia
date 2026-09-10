import test from 'node:test';
import assert from 'node:assert/strict';
import {SourceTimeResolver} from '../core/source-time-resolver.js';
import {ArchiveStore} from '../core/store.js';
import {ADAPTER_VERSION,STORAGE_KEY} from '../core/constants.js';
const identity={chatId:'fake-resolver-chat',sourceMessageId:'fake-resolver-user'};
const base=1609459200000,now=base+86400000;
const candidate=(source,offset=0)=>({source,timestamp:new Date(base+offset).toISOString(),identity});
const dom=(offset=0)=>candidate('chatgpt_dom',offset),response=()=>candidate('chatgpt_response_create_time');
for(const [name,candidates,source,confidence] of [
 ['same',[dom(),response()],'dom+response','very_high'],['subsecond',[dom(999),response()],'dom+response','very_high'],
 ['boundary',[dom(1000),response()],'dom+response','very_high'],['seconds',[dom(3000),response()],'unknown','conflict'],
 ['large conflict',[dom(86400000),response()],'unknown','conflict'],['DOM only',[dom()],'chatgpt_dom','high'],
 ['response only',[response()],'chatgpt_response_create_time','high'],['absent',[],'unknown','unknown'],
 ['malformed DOM',[{...dom(),timestamp:'2021-02-30T00:00:00Z'},response()],'chatgpt_response_create_time','high'],
 ['malformed response',[dom(),{...response(),timestamp:'yesterday'}],'chatgpt_dom','high'],
 ['identity mismatch',[{...dom(),identity:{...identity,sourceMessageId:'fake-other-user'}},response()],'chatgpt_response_create_time','high'],
 ['approx cannot overwrite',[dom(),response(),candidate('firstObservedAt',5000)],'dom+response','very_high'],
 ['export reserved',[candidate('official_export')],'unknown','unknown']
])test('resolver matrix: '+name,()=>{
 const r=SourceTimeResolver.resolve(identity,candidates,{now});assert.equal(r.timeSource,source);assert.equal(r.timeConfidence,confidence);
 assert.equal(r.sourceSentAt,['conflict','unknown'].includes(confidence)?null:new Date(base).toISOString());
});
test('resolver: duplicate same-source identity with incompatible values is conflict',()=>{
 assert.equal(SourceTimeResolver.resolve(identity,[dom(),dom(5000)],{now}).timeConfidence,'conflict');
});

async function storeFixture(){let disk={};const storage={async get(){return structuredClone(disk);},async set(v){disk=structuredClone(v);},async getBytesInUse(){return 0;}};
 const store=new ArchiveStore(storage,{clock:()=>new Date(now).toISOString(),uuid:()=> 'fake-resolver-record'});await store.consent(true);
 const epoch=(await store.status()).epoch,chat={id:identity.chatId,url:'https://chatgpt.com/c/'+identity.chatId,title:'虚构多来源'};
 const request={epoch,adapterVersion:ADAPTER_VERSION,chat,messages:[{sourceMessageId:identity.sourceMessageId,pageOrder:1,originalText:'虚构不可变原文'}]};
 const enrich={...request,chat:{id:chat.id,url:chat.url},messages:[{sourceMessageId:identity.sourceMessageId,pageOrder:1}]};
 return {store,storage,request,enrich,disk:()=>disk};
}
for(const first of ['dom','response'])test('resolver store: '+first+' first, later enrichment, persistence, lower quality ignored and conflict',async()=>{
 const f=await storeFixture(),rtime={state:'valid',createTime:base/1000,updateTime:null};
 if(first==='dom')f.request.messages[0].domTime=dom();else f.request.messages[0].sourceTime=rtime;
 await f.store.capture(f.request);const before=(await f.store.snapshot()).records[0];assert.equal(before.timeConfidence,'high');
 if(first==='dom')f.enrich.messages[0].sourceTime=rtime;else f.enrich.messages[0].domTime=dom(500);
 await f.store.enrich(f.enrich);const agreed=(await f.store.snapshot()).records[0];assert.equal(agreed.timeConfidence,'very_high');assert.equal(agreed.timeSource,'dom+response');
 for(const k of ['originalText','capturedAt','id','contentHash'])assert.equal(agreed[k],before[k]);
 f.enrich.messages[0].domTime={...dom(),source:'firstObservedAt'};f.enrich.messages[0].sourceTime={state:'valid',createTime:'bad',updateTime:null};
 await f.store.enrich(f.enrich);assert.deepEqual((await f.store.snapshot()).records[0],agreed);
 const awake=new ArchiveStore(f.storage,{clock:()=>new Date(now).toISOString()});assert.deepEqual((await awake.snapshot()).records[0],agreed);
 assert.ok(Object.values(f.disk()[STORAGE_KEY].sourceTimes)[0].candidates);
});
test('resolver store: cross-source disagreement clears formal time and retains candidates, not capturedAt',async()=>{
 const f=await storeFixture();f.request.messages[0].sourceTime={state:'valid',createTime:base/1000,updateTime:null};await f.store.capture(f.request);
 const before=(await f.store.snapshot()).records[0];f.enrich.messages[0].domTime=dom(5000);await f.store.enrich(f.enrich);
 const r=(await f.store.snapshot()).records[0];assert.equal(r.sourceSentAt,null);assert.equal(r.timeConfidence,'conflict');assert.equal(r.originalText,before.originalText);assert.equal(r.capturedAt,before.capturedAt);
 assert.equal(Object.keys(Object.values(f.disk()[STORAGE_KEY].sourceTimes)[0].candidates).length,2);
});
test('resolver store: rejected response cannot veto a strict DOM candidate or downgrade very_high',async()=>{
 const f=await storeFixture();f.request.messages[0].domTime=dom();f.request.messages[0].sourceTime={state:'blocked',reason:'UPDATE'};
 await f.store.capture(f.request);assert.equal((await f.store.snapshot()).records[0].timeConfidence,'high');
 const g=await storeFixture();g.request.messages[0].domTime=dom();g.request.messages[0].sourceTime={state:'valid',createTime:base/1000,updateTime:null};
 await g.store.capture(g.request);const before=(await g.store.snapshot()).records[0];assert.equal(before.timeConfidence,'very_high');
 g.enrich.messages[0].sourceTime={state:'blocked',reason:'UPDATE'};await g.store.enrich(g.enrich);
 assert.deepEqual((await g.store.snapshot()).records[0],before);
});
