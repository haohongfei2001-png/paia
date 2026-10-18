import test from 'node:test';
import assert from 'node:assert/strict';
import {readProviderResponse} from '../provider-response.mjs';
import {prepareProviderRequest,snapshotProviderInput} from '../provider-request.mjs';
import {providerFixture,completion,sseCompletion} from './provider-fixtures.mjs';

async function material(stream=false){const f=providerFixture();await f.reserve();f.input.stream=stream;return prepareProviderRequest({input:snapshotProviderInput(f.input),manifest:f.manifest,tokenize:f.config.tokenize,row:f.saved().rows[0],facts:f.routeRow.facts,now:f.now});}
const response=(body,headers={})=>new Response(body,{headers:{'content-type':'application/json',...headers}});
const isUnknown=result=>{assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);assert.equal(result.retryAllowed,false);assert.equal(result.financialAuthority,false);};

test('reader rejects duplicate JSON names, malformed UTF-8, excess bytes and false declared length',async()=>{
 const m=await material();
 for(const r of [response(JSON.stringify(completion()).replace('"id":','"id":"duplicate","id":')),
  response(new Uint8Array([0xc3,0x28])),response('x'.repeat(m.usageBinding.limits.maxBytes+1)),
  response(JSON.stringify(completion()),{'content-length':'1'}),response(JSON.stringify(completion()),{'content-encoding':'gzip'}),
  response(JSON.stringify(completion()),{'content-type':'text/html'})])isUnknown(await readProviderResponse(r,m));
});
test('strict response schema and unsupported tools/refusal never become protected output',async()=>{
 const m=await material();
 for(const message of [
  {role:'assistant',content:'{"action":"KEEP","unapproved":1}'},
  {role:'assistant',content:'{"action":"DELETE"}'},
  {role:'assistant',content:'{"action":"KEEP","action":"DEFER"}'},
  {role:'assistant',content:'{"action":"KEEP"}',refusal:'SYNTHETIC refusal'},
  {role:'assistant',content:'{"action":"KEEP"}',tool_calls:[{id:'SYNTHETIC-tool'}]},
 ]){
  const result=await readProviderResponse(response(JSON.stringify(completion({choices:[{index:0,message,finish_reason:'stop'}]}))),m);isUnknown(result);assert.equal(JSON.stringify(result).includes('SYNTHETIC refusal'),false);
 }
});
test('SSE early, duplicate and post-DONE frames fail closed without inferred completion',async()=>{
 const m=await material(true),body=sseCompletion();
 for(const value of ['data: [DONE]\n\n'+body,body+'data: [DONE]\n\n',body.replace('data: [DONE]\n\n','data: [DONE]\n'),body+'data: {}\n\n']){
  isUnknown(await readProviderResponse(response(value,{'content-type':'text/event-stream'}),m));
 }
});
test('byte-bound streaming remains chunk-independent and excludes reasoning strings',async()=>{
 const m=await material(true),body=sseCompletion(),bytes=new TextEncoder().encode(body);
 const stream=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}});
 const result=await readProviderResponse(response(stream,{'content-type':'text/event-stream'}),m);assert.equal(result.decision,'response_received');assert.deepEqual({...result.value},{action:'KEEP'});
});
test('abort interrupts a stalled body reader and disposes its stream',async()=>{
 const m=await material(),control=new AbortController();let cancelled=0,entered;
 const ready=new Promise(resolve=>entered=resolve);
 const r=response(new ReadableStream({pull(){entered();return new Promise(()=>{});},cancel(){cancelled++;}}));
 const pending=readProviderResponse(r,m,{signal:control.signal});await ready;control.abort();isUnknown(await pending);assert.equal(cancelled,1);
});
