import test from 'node:test';
import assert from 'node:assert/strict';
import entry from '../api/provider.mjs';
import {parseProviderHttpRequest} from '../provider-entry.mjs';
import {providerFixture} from './provider-fixtures.mjs';
const http=(body,options={})=>new Request('https://service.invalid/api/provider',{method:'POST',headers:{'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body),...options});
test('actual provider API defaults off and valid input uses the original DTO owner',async()=>{
 const f=providerFixture(),parsed=await parseProviderHttpRequest(http(f.input));
 assert.equal(parsed.declaration.payloadDigest,f.input.declaration.payloadDigest);
 const response=await entry.fetch(http(f.input));assert.equal(response.status,503);
 assert.equal((await response.json()).reason,'PROVIDER_DISABLED');
});

import {createHash} from 'node:crypto';
import {canonical} from '../../../extension/core/ai-usage/contracts.js';
import {createProviderHandler,PROVIDER_HTTP_LIMITS} from '../provider-entry.mjs';
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
function withPayload(input,payload){const value=structuredClone(input);value.payload=payload;value.declaration.payloadDigest=digest(payload);value.declaration.contentGeneration=value.declaration.payloadDigest;return value;}

test('nested purpose DTO supports arrays and multibyte UTF-8 within original bounds',async()=>{
 const input=withPayload(providerFixture().input,{version:1,items:[{text:'合成 😀',flags:[true,false,null],number:1.25e2}],more:{a:{b:{c:'x'}}}});
 const bytes=Buffer.from(JSON.stringify(input));
 const stream=new ReadableStream({start(c){for(let at=0;at<bytes.length;at+=31)c.enqueue(bytes.subarray(at,at+31));c.close();}});
 assert.deepEqual(JSON.parse(JSON.stringify(await parseProviderHttpRequest(http('',{body:stream,duplex:'half'})))),input);
});
test('route, method, media, content length and encoding are checked before resolution',async()=>{
 let calls=0;const handler=createProviderHandler({resolveRunner:()=>{calls++;}}),input=providerFixture().input;
 const cases=[
  [new Request('https://service.invalid/api/provider?model=x',{method:'POST',body:'{}'}),404],
  [new Request('https://service.invalid/api/provider#x',{method:'POST',body:'{}'}),404],
  [new Request('https://service.invalid/api/other',{method:'POST',body:'{}'}),404],
  [http(input,{method:'PUT'}),405],
  [http(input,{headers:{'content-type':'application/json; charset=latin1'}}),415],
  [http(input,{headers:{'content-type':'application/json','content-encoding':'gzip'}}),415],
  [http(input,{headers:{'content-type':'application/json','content-length':'1'}}),400],
  [http(input,{headers:{'content-type':'application/json','content-length':'1e5'}}),413],
  [http(input,{headers:{'content-type':'application/json','content-length':String(PROVIDER_HTTP_LIMITS.bytes+1)}}),413],
 ];
 for(const [request,status] of cases)assert.equal((await handler(request)).status,status);
 assert.equal(calls,0);
});
test('duplicates including escaped names at every depth, invalid Unicode and extra authority fields fail before resolution',async()=>{
 const input=providerFixture().input,valid=JSON.stringify(input);let calls=0;
 const handler=createProviderHandler({resolveRunner:()=>{calls++;}});
 const invalid=[valid.replace('{','{"stream":true,'),valid.replace('{','{"str\\u0065am":true,'),valid.replace('"payload":{','"payload":{"text":"different",'),valid.replace('"payload":{','"payload":{"te\\u0078t":"different",'),valid.replace('"bundle":{','"bundle":{"request":{},'),valid+'{}',valid.replace('SYNTHETIC_PRIVATE_BODY','\\ud800'),'null','[]','{"x":1e999}',Buffer.from([0xff,0xfe])];
 for(const key of ['url','model','registry','tokenizer','providerOptions','credential','financialAuthority','tier','resolveRunner','__proto__'])invalid.push(valid.replace('{',`{${JSON.stringify(key)}:true,`));
 for(const body of invalid){const response=await handler(http('',{body}));assert.equal(response.status,400);assert.doesNotMatch(JSON.stringify(await response.json()),/SYNTHETIC|PRIVATE|principalToken/);}
 assert.equal(calls,0);
});
test('byte, nested depth, string, array and combined-member bounds reject before resolution',async()=>{
 const input=providerFixture().input;let calls=0;const handler=createProviderHandler({resolveRunner:()=>{calls++;}});
 let deep={value:1};for(let i=0;i<17;i++)deep={x:deep};
 for(const payload of [deep,{x:'x'.repeat(PROVIDER_HTTP_LIMITS.stringBytes)},{x:'汉'.repeat(45000)},{x:Array(4097).fill(0)},Object.fromEntries(Array.from({length:4100},(_,i)=>[`k${i}`,0]))])assert.equal((await handler(http(withPayload(input,payload)))).status,400);
 assert.equal((await handler(http('x'.repeat(PROVIDER_HTTP_LIMITS.bytes+1)))).status,413);
 assert.equal(calls,0);
});
test('body streams are bounded, errors sanitized, pre-aborted and consumed requests refused',async()=>{
 let calls=0;const handler=createProviderHandler({resolveRunner:()=>{calls++;}}),input=providerFixture().input;
 const streams=[new ReadableStream({start(c){c.error(Error('SYNTHETIC_PRIVATE_STREAM'));}}),new ReadableStream({start(c){for(let i=0;i<513;i++)c.enqueue(new Uint8Array());c.close();}})];
 for(const body of streams)assert.equal((await handler(http('',{body,duplex:'half'}))).status,400);
 const controller=new AbortController();controller.abort();assert.equal((await handler(http(input,{signal:controller.signal}))).status,400);
 const used=http(input);await used.text();assert.equal((await handler(used)).status,400);assert.equal(calls,0);
});
test('five-second slow body deadline cancels the reader without resolving deployment',async()=>{
 let cancelled=false,calls=0;const stream=new ReadableStream({cancel(){cancelled=true;}});
 const response=await createProviderHandler({resolveRunner:()=>{calls++;}})(http('',{body:stream,duplex:'half'}));
 assert.equal(response.status,408);assert.equal(cancelled,true);assert.equal(calls,0);
});
test('parser snapshots mutable stream chunks before its next await',async()=>{
 const input=providerFixture().input,bytes=Buffer.from(JSON.stringify(input));let sends=0;
 const request=http(input);
 Object.defineProperty(request,'body',{value:{getReader:()=>({async read(){if(sends++===0)return {value:bytes,done:false};bytes.fill(120);return {done:true};},async cancel(){},releaseLock(){}})}});
 assert.equal((await parseProviderHttpRequest(request)).bundle.request.operationId,input.bundle.request.operationId);
});
test('HTTP passes exact original DTO once and forwards abort; late returned derivatives stay private',async()=>{
 const input=providerFixture().input,controller=new AbortController();let calls=0,received,signal;
 const handler=createProviderHandler({resolveRunner:async()=>({isCurrent:()=>true,runner:{async run(value,options){calls++;received=value;signal=options.signal;controller.abort();return {decision:'response_received',value:{private:'SYNTHETIC_PRIVATE'}};}}})});
 const response=await handler(http(input,{signal:controller.signal}));assert.equal(response.status,503);assert.equal(calls,1);assert.ok(signal instanceof AbortSignal);assert.equal(signal.aborted,true);
 assert.deepEqual(JSON.parse(JSON.stringify(received)),input);assert.doesNotMatch(JSON.stringify(await response.json()),/SYNTHETIC_PRIVATE/);
});
test('asynchronous currentness and throwing runner fail closed with no replay',async()=>{
 const input=providerFixture().input;let calls=0;
 for(const isCurrent of [()=>false,async()=>true,async()=>{throw Error('PRIVATE');}]){
  const handler=createProviderHandler({resolveRunner:()=>({isCurrent,runner:{run(){calls++;}}})});assert.equal((await handler(http(input))).status,503);
 }
 assert.equal(calls,0);
 const handler=createProviderHandler({resolveRunner:()=>({isCurrent:()=>true,runner:{run(){calls++;throw Error('SYNTHETIC_PRIVATE');}}})});
 const response=await handler(http(input));assert.equal(response.status,503);assert.equal(calls,1);assert.doesNotMatch(JSON.stringify(await response.json()),/SYNTHETIC_PRIVATE/);
});
test('abort during startup returns promptly and cannot run a late resolved selection',async()=>{
 const input=providerFixture().input,controller=new AbortController();let release,entered,calls=0;
 const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const handler=createProviderHandler({resolveRunner:async()=>{entered();await gate;return {isCurrent:()=>true,runner:{run(){calls++;}}};}});
 const pending=handler(http(input,{signal:controller.signal}));await waiting;controller.abort();assert.equal((await pending).status,400);
 release();await Promise.resolve();assert.equal(calls,0);
});

test('exact raw byte/string/depth boundaries remain usable and the next unit is rejected',async()=>{
 const input=providerFixture().input,body=JSON.stringify(input),atLimit=body+' '.repeat(PROVIDER_HTTP_LIMITS.bytes-Buffer.byteLength(body));
 const headers={'content-type':'application/json','content-length':String(PROVIDER_HTTP_LIMITS.bytes)};
 assert.equal((await parseProviderHttpRequest(http(atLimit,{headers}))).bundle.request.operationId,input.bundle.request.operationId);
 await assert.rejects(parseProviderHttpRequest(http(atLimit+' ')),e=>e.status===413);
 assert.equal((await parseProviderHttpRequest(http(withPayload(input,{text:'x'.repeat(PROVIDER_HTTP_LIMITS.stringBytes-2)})))).payload.text.length,PROVIDER_HTTP_LIMITS.stringBytes-2);
 await assert.rejects(parseProviderHttpRequest(http(withPayload(input,{text:'x'.repeat(PROVIDER_HTTP_LIMITS.stringBytes-1)}))));
 let payload={leaf:'x'};for(let i=0;i<14;i++)payload={x:payload};
 assert.ok((await parseProviderHttpRequest(http(withPayload(input,payload)))).payload);
 await assert.rejects(parseProviderHttpRequest(http(withPayload(input,{x:payload}))));
});
