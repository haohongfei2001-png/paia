import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {ADAPTER_VERSION} from '../core/constants.js';
const chat='fake-bridge-chat',id='fake-bridge-user';
async function fixture(){
 const handlers=new Map(),controls=[],timers=[],requests=[];let allowed=true,diagnosticError=false,enrichmentError=false,serial=0;
 const window={addEventListener(k,fn){handlers.set(k,fn);},postMessage(d){controls.push(d);}};
 class Adapter{route(){return {code:'READY',id:chat,url:'https://chatgpt.com/c/'+chat};}}
 const context=vm.createContext({window,ChatGPTAdapter:Adapter,Date,crypto:{randomUUID:()=>`fake-session-${++serial}`},setTimeout:fn=>timers.push(fn),chrome:{runtime:{async sendMessage(req){
  requests.push(req);if(req.type==='GET_STATUS')return {ok:true,data:{enabled:true,consented:true,epoch:1,adapterVersion:ADAPTER_VERSION}};
  if(req.type==='RESPONSE_POLL'){if(diagnosticError)throw Error('fake transient diagnostic outage');return {ok:true,data:{fingerprintAllowed:allowed}};}
  return enrichmentError?{ok:false,error:'STORAGE_FAILED'}:{ok:true,data:{enriched:1}};
 }}}});
 for(const name of ['core/json-fingerprint.js','core/history-time.js','core/source-time.js','core/response-time.js','content/response-bridge.js'])vm.runInContext(await readFile(new URL('../'+name,import.meta.url),'utf8'),context);
 const tick=()=>new Promise(r=>setImmediate(r));await tick();
 const observe=()=>context.ArchiveResponseTime.observe({chat:{id:chat,url:'https://chatgpt.com/c/'+chat},messages:[{sourceMessageId:id,pageOrder:1,originalText:'FAKE_BODY_NOT_FOR_ENRICHMENT'}]},{epoch:1});
 const emit=(g=controls.at(-1),rows=[{chat,id,create:{state:'value',value:1609459200},update:{state:'missing',value:null}}])=>handlers.get('message')({source:window,origin:'https://chatgpt.com',data:{channel:'archive-response-metadata-v1',chat,epoch:1,session:g.session,historySession:g.historySession,history:{contract:'chatgpt-history-user-v1',rows}}});
 const poll=async()=>{timers.shift()();await tick();};
 return {context,controls,requests,observe,emit,tick,poll,allow:v=>allowed=v,error:v=>diagnosticError=v,enrichmentError:v=>enrichmentError=v,close:()=>handlers.get('pagehide')()};
}
test('bridge: diagnostic lease revocation must not invalidate formal history session or pending exact match',async()=>{
 const f=await fixture();try{f.observe();const before=f.controls.at(-1);f.allow(false);await f.poll();
  assert.equal(typeof before.historySession,'string');assert.equal(f.controls.at(-1).historySession,before.historySession);assert.notEqual(f.controls.at(-1).session,before.session);
  f.emit(before);await f.tick();assert.ok(f.requests.some(r=>r.type==='ENRICH_SOURCE_METADATA'&&r.messages[0].sourceTime?.state==='valid'));
 }finally{f.close();}
});
test('bridge: diagnostic transport failure cannot erase formal metadata or the canonical proof cache',async()=>{
 const f=await fixture();try{f.observe();f.emit();await f.tick();f.error(true);await f.poll();
  const m=f.context.ArchiveResponseTime.evidence({chat:{id:chat},messages:[{sourceMessageId:id}]},{epoch:1});assert.equal(m.get(id)?.state,'valid');
 }finally{f.close();}
});
test('bridge: metadata notification sends a minimal retryable enrichment independent of DOM and UI',async()=>{
 const f=await fixture();try{f.observe();f.emit();await f.tick();const req=f.requests.findLast(r=>r.type==='ENRICH_SOURCE_METADATA'&&r.messages[0].sourceTime?.state==='valid');
  assert.ok(req);assert.equal(req.messages[0].pageOrder,1);assert.equal(JSON.stringify(req).includes('FAKE_BODY'),false);
  assert.deepEqual(Object.keys(req.messages[0]).sort(),['pageOrder','sourceMessageId','sourceTime']);
 }finally{f.close();}
});

test('bridge: newly loaded earlier messages use confirmed DOM order instead of cache insertion order',async()=>{
 const f=await fixture();try{
  f.observe();await f.tick();f.emit();await f.tick();const older='fake-bridge-older';
  f.context.ArchiveResponseTime.observe({chat:{id:chat,url:'https://chatgpt.com/c/'+chat},messages:[{sourceMessageId:older,pageOrder:1},{sourceMessageId:id,pageOrder:2}]},{epoch:1});
  const g=f.controls.at(-1);
  f.emit(g,[{chat,id:older,create:{state:'value',value:1609372800},update:{state:'missing',value:null}},{chat,id,create:{state:'value',value:1609459200},update:{state:'missing',value:null}}]);
  await f.tick();
  const requests=f.requests.filter(r=>r.type==='ENRICH_SOURCE_METADATA');
  assert.ok(requests.at(-1).messages.every(m=>m.sourceTime?.state==='valid'));
  assert.equal(requests.findLast(r=>r.messages.some(m=>m.sourceMessageId===id))?.messages.find(m=>m.sourceMessageId===id)?.pageOrder,2);
 }finally{f.close();}
});

test('bridge: failed enrichment keeps the minimal pending evidence and retries after worker transport recovers',async()=>{
 const f=await fixture();try{
  f.enrichmentError(true);f.observe();f.emit();await f.tick();
  const before=f.requests.filter(r=>r.type==='ENRICH_SOURCE_METADATA').length;
  f.enrichmentError(false);await f.poll();
  const attempts=f.requests.filter(r=>r.type==='ENRICH_SOURCE_METADATA');assert.ok(attempts.length>before);assert.equal(attempts.at(-1).messages[0].sourceTime.state,'valid');
 }finally{f.close();}
});
