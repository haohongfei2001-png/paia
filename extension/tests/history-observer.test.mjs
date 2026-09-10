import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const chat='fake-passive-history';
const value={conversation_id:chat,mapping:{one:{message:{id:'fake-passive-user',author:{role:'user'},create_time:1609459200,update_time:null,content:{parts:['FAKE_BODY']}}}}};
async function observe({active=true,type='application/json',url=`https://chatgpt.com/backend-api/conversation/${chat}`,body=JSON.stringify(value),ok=true,formal=true,expectedClones,streamed=false,cancelHistory=false,startBeforeGate=false,changeDiagnostic=false}={}) {
 const sent=[],handlers=new Map(),copies=[],listeners=new Set();let calls=0,controller;
 // Deadlines only fail stalled tests; successful assertions follow actual completion events.
 function until(predicate) {
  if(predicate())return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const check=()=>{if(predicate()){clearTimeout(timer);listeners.delete(check);resolve();}};
   const timer=setTimeout(()=>{listeners.delete(check);reject(Error('passive reader did not finish'));},2000);
   listeners.add(check);
  });
 }
 class ProbeResponse extends Response {
  clone(){const copy=super.clone();copies.push(copy);return copy;}
 }
 const stream=streamed?new ReadableStream({start(c){controller=c;}}):body;
 const response=new ProbeResponse(stream,{headers:{'content-type':type}});Object.defineProperties(response,{url:{value:url},ok:{value:ok}});
 const original=Promise.resolve(response);
 const request={get body(){assert.fail('request body read');},get headers(){assert.fail('request headers read');},get credentials(){assert.fail('request credentials read');}};
 const window={fetch(...args){calls++;assert.equal(this,window);assert.equal(args[0],request);return original;},addEventListener(k,fn){handlers.set(k,fn);},postMessage(v){sent.push(v);for(const check of listeners)check();}};
 const c=vm.createContext({window,location:{pathname:'/c/'+chat},Response:ProbeResponse,URL,TextDecoder,setTimeout,clearTimeout});
 for(const path of ['adapter/response-parser.js','adapter/json-fingerprint.js','adapter/history-contract.js','content/response-observer.js'])vm.runInContext(await readFile(new URL('../'+path,import.meta.url),'utf8'),c);
 const control=session=>handlers.get('message')({source:window,origin:'https://chatgpt.com',data:{channel:'archive-response-control-v1',active,chat,epoch:1,session,historySession:'fake-history-session',fingerprint:false,history:true}});
 if(!startBeforeGate)control('fake-session');
 const result=window.fetch(request);assert.equal(result,original);
 if(startBeforeGate)control('fake-session');
 try {
  const pageText=result.then(async r=>{
   assert.equal(r,response);assert.equal(r.bodyUsed,false);
   if(expectedClones!==undefined){
    assert.equal(copies.length,expectedClones,'both clones must exist before the page starts reading');
    assert.equal(new Set(copies).size,expectedClones,'side branches own distinct Responses');
    assert.ok(copies.every(copy=>copy.body.locked),'side branches have independent readers');
   }
   const consumed=r.text();
   if(changeDiagnostic)control('fake-next-diagnostic-session');
   if(streamed){
    assert.equal(sent.some(v=>v.history||v.trace),false,'fetch returns before either side finishes parsing');
    const bytes=new TextEncoder().encode(body),split=cancelHistory?2097153:Math.floor(bytes.length/2);
    controller.enqueue(bytes.slice(0,split));
    if(cancelHistory)await until(()=>sent.some(v=>v.fingerprintFailure));
    controller.enqueue(bytes.slice(split));controller.close();
   }
   return consumed;
  });
  assert.equal(await pageText,body,'the page immediately consumes its exact original body');
  assert.equal(response.bodyUsed,true);await assert.rejects(response.text(),TypeError,'a second page consumption still rejects');
  if(active){
   await until(()=>sent.some(v=>changeDiagnostic?v.history:v.trace));
   if(formal)await until(()=>sent.some(v=>v.history||v.fingerprintFailure));
  }
  assert.equal(calls,1);return sent;
 }finally{
  if(streamed){try{controller.close();}catch{}}
  handlers.get('pagehide')();
 }
}
test('formal observer: immediate page body consumption does not break either passive historical or legacy clone',async()=>{
 const sent=await observe({expectedClones:2});assert.ok(sent.some(v=>v.history?.rows.length===1));assert.equal(sent.find(v=>v.trace)?.trace.reason,'ACCEPTED');
});
test('formal observer: both clones precede immediate page reading while streamed body is still pending',async()=>{
 const sent=await observe({expectedClones:2,streamed:true});assert.ok(sent.some(v=>v.history?.rows.length===1));assert.equal(sent.find(v=>v.trace)?.trace.reason,'ACCEPTED');
});
test('formal observer: historical byte-limit cancellation leaves legacy and page readers intact',async()=>{
 const large=structuredClone(value);large.mapping.one.message.content.parts=['FAKE_'+ 'x'.repeat(2150000)];
 const sent=await observe({body:JSON.stringify(large),expectedClones:2,streamed:true,cancelHistory:true});
 assert.equal(sent.some(v=>v.history),false);assert.ok(sent.some(v=>v.fingerprintFailure));assert.equal(sent.find(v=>v.trace)?.trace.reason,'BODY_SIZE_LIMIT');
});
test('formal observer: legacy schema rejection leaves independent formal history intact',async()=>{
 const body=JSON.stringify({conversation_id:chat,messages:[value.mapping.one.message]});
 const sent=await observe({body,expectedClones:2,streamed:true});assert.ok(sent.some(v=>v.history?.rows.length===1));assert.equal(sent.find(v=>v.trace)?.trace.outcome,'rejected');
});
test('formal observer: authorization, HTTP, origin, JSON type, sensitive paths and body bounds still fail closed',async()=>{
 for(const options of [{active:false,formal:false},{ok:false,formal:false},{type:'text/plain',formal:false},{url:'https://example.invalid/history',formal:false},{url:'https://chatgpt.com/api/auth/session',formal:false},{body:'x'.repeat(524289)},{body:'{'}])assert.equal((await observe(options)).some(v=>v.history),false);
});
test('formal observer: other JSON time extraction works independently of single-tab diagnostic permission',async()=>{
 const sent=await observe({url:'https://chatgpt.com/backend-api/fixture-other?case=fake'});assert.ok(sent.some(v=>v.history));assert.equal(sent.some(v=>v.fingerprint),false);
});

test('formal observer: request begun before initial status can be read only when it resolves after authorization',async()=>{
 const sent=await observe({startBeforeGate:true,expectedClones:2});assert.ok(sent.some(v=>v.history));
});
test('formal observer: diagnostic lease changes cannot cancel the authorized formal reader',async()=>{
 const sent=await observe({changeDiagnostic:true,streamed:true,expectedClones:2,formal:false});assert.ok(sent.some(v=>v.history));
});
