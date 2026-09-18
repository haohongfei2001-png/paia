import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
import {ADAPTER_VERSION} from '../core/constants.js';
import {applySourceTime,unknownTime} from '../core/record-time.js';
globalThis.IDBKeyRange=IDBKeyRange;
const chat='foundation-chat-001',id='foundation-user-001';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function storage(){let data={};return {get:async key=>({[key]:structuredClone(data[key])}),set:async values=>{Object.assign(data,structuredClone(values));},remove:async key=>{delete data[key];}};}
function request(epoch,text='合成原文\n代码 `x` 🙂',messageId=id){return {epoch,adapterVersion:ADAPTER_VERSION,chat:{id:chat,url:'https://chatgpt.com/c/'+chat,title:'Synthetic'},messages:[{sourceMessageId:messageId,pageOrder:1,originalText:text}]};}
function enrichment(q,time=1609459200){return {...q,chat:{id:q.chat.id,url:q.chat.url},messages:q.messages.map(({sourceMessageId,pageOrder})=>({sourceMessageId,pageOrder,sourceTime:{state:'valid',createTime:time,updateTime:null}}))};}

test('foundation: enrichment receipts distinguish missing source from settled unchanged source',async()=>{
 const s=new IndexedArchiveStore(storage(),{indexedDB:new IDBFactory()});await s.consent(true);const q=request((await s.status()).epoch),e=enrichment(q);
 const missing=await s.enrich(e);assert.deepEqual(missing.settled,[false]);assert.equal(missing.enriched,0);
 await s.capture(q);const changed=await s.enrich(e);assert.deepEqual(changed.settled,[true]);assert.equal(changed.enriched,1);
 const repeated=await s.enrich(e);assert.deepEqual(repeated.settled,[true]);assert.equal(repeated.enriched,0);
 const r=(await s.snapshot()).records[0];await s.purge(r.id,true);assert.deepEqual((await s.enrich(e)).settled,[true]);assert.equal((await s.snapshot()).records.length,0);
});
test('foundation: metadata-only CAPTURE exposes mutation without creating another snapshot',async()=>{
 const s=new IndexedArchiveStore(storage(),{indexedDB:new IDBFactory()});await s.consent(true);const q=request((await s.status()).epoch);await s.capture(q);const before=(await s.snapshot()).records[0];
 q.messages[0].sourceTime={state:'valid',createTime:1609459200,updateTime:null};const result=await s.capture(q);
 assert.equal(result.added,0);assert.equal(result.timeChanged,true);const records=(await s.snapshot()).records;assert.equal(records.length,1);assert.equal(records[0].capturedAt,before.capturedAt);assert.equal(records[0].originalText,before.originalText);assert.equal(records[0].sourceSentAt,'2021-01-01T00:00:00.000Z');
});
test('foundation: bad earlier local clock cannot permanently veto later proven source time',()=>{
 const r={...unknownTime(),chatId:chat,sourceMessageId:id,sourceKey:'synthetic',capturedAt:'2020-01-01T00:00:00.000Z',originalText:'unchanged'};const s={records:[r],sourceTimes:{}};
 applySourceTime(s,'synthetic',{state:'valid',createTime:1609459200,updateTime:null},1,'2026-01-01T00:00:00.000Z');
 assert.equal(r.sourceSentAt,'2021-01-01T00:00:00.000Z');assert.equal(r.capturedAt,'2020-01-01T00:00:00.000Z');assert.equal(r.originalText,'unchanged');
});
test('foundation: submillisecond response precision does not create a self-conflict on replay',()=>{
 const r={...unknownTime(),chatId:chat,sourceMessageId:id,sourceKey:'synthetic',capturedAt:'2026-01-01T00:00:00.000Z'};const s={records:[r],sourceTimes:{}};const evidence={state:'valid',createTime:1609459200.123456,updateTime:null};
 for(let i=0;i<3;i++)applySourceTime(s,'synthetic',evidence,1,'2026-01-01T00:00:00.000Z');
 assert.equal(s.sourceTimes.synthetic.blocked,false);assert.equal(r.sourceSentAt,'2021-01-01T00:00:00.123Z');
});

async function bridgeFixture(){
 const handlers=new Map(),controls=[],requests=[],timers=[];let persisted=false,serial=0;
 const window={addEventListener(k,fn){handlers.set(k,fn);},postMessage(d){controls.push(d);}};
 class Adapter{static version=ADAPTER_VERSION;route(){return {code:'READY',id:chat};}}
 const c=vm.createContext({window,ChatGPTAdapter:Adapter,Date,crypto:{randomUUID:()=>`synthetic-session-${++serial}`},setTimeout:(fn,delay)=>{if(delay===35000)return 0;timers.push(fn);return timers.length;},clearTimeout(){},chrome:{runtime:{sendMessage:async req=>{
  requests.push(req);if(req.type==='GET_STATUS')return {ok:true,data:{enabled:true,consented:true,epoch:1,adapterVersion:ADAPTER_VERSION}};
  if(req.type==='ENRICH_SOURCE_METADATA')return {ok:true,data:{enriched:0,settled:req.messages.map(()=>persisted)}};
  return {ok:true,data:{fingerprintAllowed:false}};
 }}}});
 for(const path of ['core/json-fingerprint.js','core/history-time.js','core/source-time.js','core/response-time.js','content/response-bridge.js'])vm.runInContext(await readFile(new URL('../'+path,import.meta.url),'utf8'),c);
 await tick();c.ArchiveResponseTime.observe({chat:{id:chat,url:'https://chatgpt.com/c/'+chat},messages:[{sourceMessageId:id,pageOrder:1}]},{epoch:1});
 const g=controls.at(-1);handlers.get('message')({source:window,origin:'https://chatgpt.com',data:{channel:'archive-response-metadata-v1',chat,epoch:1,historySession:g.historySession,history:{contract:'chatgpt-history-user-v1',rows:[{chat,id,create:{state:'value',value:1609459200},update:{state:'missing',value:null}}]}}});await tick();
 return {handlers,requests,timers,persist:()=>{persisted=true;},c};
}
test('foundation: zero-match enrichment is retried after source persists even without another DOM scan',async()=>{
 const f=await bridgeFixture();try{
  const before=f.requests.filter(r=>r.type==='ENRICH_SOURCE_METADATA').length;f.persist();f.timers.shift()();await tick();
  const after=f.requests.filter(r=>r.type==='ENRICH_SOURCE_METADATA');assert.ok(after.length>before);assert.equal(after.at(-1).messages[0].sourceTime.state,'valid');
 }finally{f.handlers.get('pagehide')();}
});
test('foundation: pageshow resumes the authorized metadata bridge after BFCache pagehide',async()=>{
 const f=await bridgeFixture();f.handlers.get('pagehide')();const before=f.requests.filter(r=>r.type==='GET_STATUS').length;
 assert.equal(typeof f.handlers.get('pageshow'),'function');f.handlers.get('pageshow')({persisted:true});await tick();assert.ok(f.requests.filter(r=>r.type==='GET_STATUS').length>before);f.handlers.get('pagehide')();
});

test('foundation diagnostics: health and ingestion schemas cannot retain arbitrary private values',async()=>{
 const {sanitizeDiagnostics}=await import('../core/diagnostics.js');
 const privateText='SYNTHETIC_PRIVATE_DIAGNOSTIC_SENTINEL';
 const h={schemaVersion:1,responseState:'LIMIT',responseRows:9999999,rejectedFrames:0,canonicalProofs:2,unsettledSources:1,sourceTimesAvailable:0,sourceTimesMissing:1,sourceTimesBlocked:1,text:privateText,url:privateText};
 const i={schemaVersion:1,kind:'capture',attempted:2,added:1,duplicates:1,ignored:0,unresolved:0,knownTimes:1,unknownTimes:1,body:privateText};
 const value=sanitizeDiagnostics({captureHealth:h,captureHealthAt:'2026-01-01T00:00:00.000Z',ingestion:i,ingestionAt:'2026-01-01T00:00:00.000Z'});
 assert.equal(value.captureHealth.responseRows,1000000);assert.equal(JSON.stringify(value).includes(privateText),false);
 for(const bad of [{...h,responseState:privateText},{...h,sourceTimesMissing:-1},{...h,sourceTimesBlocked:'1'}])assert.equal(sanitizeDiagnostics({captureHealth:bad}).captureHealth,undefined);
});
test('foundation diagnostics: missing-source reconciliation is distinguishable from stored unknown time',async()=>{
 const s=new IndexedArchiveStore(storage(),{indexedDB:new IDBFactory()});await s.consent(true);const q=request((await s.status()).epoch);
 await s.enrich(enrichment(q));let d=(await s.snapshot()).diagnostics;assert.equal(d.ingestion.unresolved,1);assert.equal(d.ingestion.unknownTimes,0);
 await s.capture(q);d=(await s.snapshot()).diagnostics;assert.equal(d.ingestion.added,1);assert.equal(d.ingestion.unknownTimes,1);
 await s.capture(q);d=(await s.snapshot()).diagnostics;assert.equal(d.ingestion.duplicates,1);assert.equal(d.ingestion.added,0);
});
test('foundation event contract: wrong-chat, assistant and malformed identities fail closed without body getters',async()=>{
 await import('../adapter/history-contract.js');const {parseEvent}=globalThis.ChatGPTHistoryContract;
 const m={id,author:{role:'user'},create_time:1609459200};Object.defineProperty(m,'content',{enumerable:true,get(){throw Error('body accessed');}});
 const result=parseEvent({conversation_id:chat,message:m},chat);assert.equal(result.rows[0].id,id);assert.equal(result.rows.length,1);
 assert.equal(parseEvent({conversation_id:'different-chat-001',message:m},chat),null);
 const assistant={author:{role:'assistant'}};for(const key of ['id','create_time','content'])Object.defineProperty(assistant,key,{enumerable:true,get(){throw Error('assistant field accessed');}});
 assert.equal(parseEvent({conversation_id:chat,message:assistant},chat),null);
 assert.equal(parseEvent({conversation_id:chat,message:{id:'bad',author:{role:'user'},create_time:1609459200}},chat),null);
});
