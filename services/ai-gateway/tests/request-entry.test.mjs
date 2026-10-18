import test from 'node:test';
import assert from 'node:assert/strict';
import entry from '../api/reservations.mjs';
import {parseHttpRequest, MAX_REQUEST_BYTES} from '../request-entry.mjs';
import {request} from './postgres-fixtures.mjs';
const payload = () => ({action:'reserve',request:request('HTTP'),principalToken:'a.b.c',entitlementToken:'d.e.f'});
const http = (body=JSON.stringify(payload()), options={}) => new Request('https://service.invalid/api/reservations', {method:'POST',headers:{'content-type':'application/json'},body,...options});

test('real Vercel fetch entry is closed without service deployment configuration', async () => {
 const result=await entry.fetch(http()); assert.equal(result.status,503);
 assert.deepEqual(await result.json(), {decision:'deny',reason:'SERVICE_UNCONFIGURED',financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
 assert.equal(result.headers.get('cache-control'),'no-store');
});
test('strict raw parser preserves only the original request and two proof strings',async()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(await parseHttpRequest(http()))),payload());
});
test('HTTP route, method, type, length and unsupported encodings fail before service',async()=>{
 for(const req of [http(undefined,{method:'PUT'}),new Request('https://service.invalid/api/reservations?token=bad',{method:'POST',body:'{}'}),http('{}',{headers:{'content-type':'text/plain'}}),http('{}',{headers:{'content-type':'application/json','content-encoding':'gzip'}}),http('{}',{headers:{'content-type':'application/json','content-length':'3'}}),http('{}',{headers:{'content-type':'application/json','content-length':String(MAX_REQUEST_BYTES+1)}})]) assert.ok((await entry.fetch(req)).status>=400);
});
test('duplicate, escaped duplicate, nested, prototype and client authority fields fail',async()=>{
 const valid=JSON.stringify(payload());
 for(const text of [valid.replace('{','{"action":"cancel",'),valid.replace('{','{"act\\u0069on":"cancel",'),valid.replace('"request":{','"request":{"jobId":"other",'),valid.replace('"request":{','"request":{"nested":{"x":{}} ,'),valid.replace('{','{"__proto__":{},'),valid.replace('{','{"readSecurityState":true,'),valid.replace('{','{"tier":"pro",'),valid.replace('"reserve"','"record"'),valid.replace('"reserve"','"settle"'),valid+'{}','[]','{"x":"\\ud800"}']) assert.equal((await entry.fetch(http(text))).status,400);
});
test('actual byte limit holds for chunked streams, invalid UTF-8 and pre-aborted reads',async()=>{
 for(const body of ['x'.repeat(MAX_REQUEST_BYTES+1),new Uint8Array([0xff,0xfe])]) assert.ok((await entry.fetch(http(body))).status>=400);
 const controller=new AbortController(); controller.abort(); assert.equal((await entry.fetch(http(undefined,{signal:controller.signal}))).status,400);
});
test('fragmented bodies, overlong tokens, reader errors and bounded chunk counts cannot evade parsing',async()=>{
 const tooLong=payload();tooLong.principalToken='x'.repeat(8193);assert.equal((await entry.fetch(http(JSON.stringify(tooLong)))).status,400);
 const broken=new ReadableStream({start(controller){controller.error(Error('PRIVATE STREAM BODY'));}});
 assert.equal((await entry.fetch(http(broken,{duplex:'half'}))).status,400);
 const excessive=new ReadableStream({start(controller){for(let i=0;i<513;i++)controller.enqueue(new Uint8Array());controller.close();}});
 assert.equal((await entry.fetch(http(excessive,{duplex:'half'}))).status,400);
});
test('unfinished body is cancelled at the fixed read deadline',async()=>{
 let cancelled=false;const stream=new ReadableStream({cancel(){cancelled=true;}});
 const response=await entry.fetch(http(stream,{duplex:'half'}));assert.equal(response.status,408);assert.equal(cancelled,true);
});
