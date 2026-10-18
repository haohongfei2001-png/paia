import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer,request as httpRequest} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {NativeFrameDecoder,encodeNativeFrame} from './native-framing.mjs';
import {credentialDigest} from './http-boundary.mjs';

async function availablePort(){const s=createServer();await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}
async function fixture(t){
 const child=spawn(process.execPath,[new URL('./fixtures/host-process.mjs',import.meta.url).pathname],{stdio:['pipe','pipe','pipe']}),messages=[],waiters=[];let stderr='';
 child.stderr.on('data',chunk=>{stderr+=chunk;});
 const decoder=new NativeFrameDecoder(message=>{const i=waiters.findIndex(x=>x.type===message.type);if(i<0)messages.push(message);else{const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(message);}},()=>assert.fail('native framing failed'));
 child.stdout.on('data',chunk=>decoder.push(chunk));
 const wait=type=>{const i=messages.findIndex(m=>m.type===type);if(i>=0)return Promise.resolve(messages.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={type,resolve,reject,timer:null};w.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(new Error('timed out '+type));},4000);waiters.push(w);});};
 t.after(async()=>{child.stdin.end();const timer=setTimeout(()=>child.kill(),1000);timer.unref();if(child.exitCode===null)await once(child,'exit');clearTimeout(timer);for(const w of waiters){clearTimeout(w.timer);w.reject(new Error('fixture ended'));}assert.equal(stderr,'','native host must never log bearer, parameters or Context');});
 const hello=await wait('hello'),secret=randomBytes(32).toString('base64url'),port=await availablePort(),connectionId=randomUUID();
 const send=message=>child.stdin.write(encodeNativeFrame({version:1,hostNonce:hello.hostNonce,...message}));
 const configure=async(generation=1,credential=secret)=>{send({type:'configure',connectionId,generation,credentialHash:credentialDigest(credential),expiresAt:Date.now()+60000,port});const ready=await wait('ready');assert.equal(ready.generation,generation);};
 await configure();
 const post=(message,{headers={},token=secret,signal}={})=>fetch(`http://127.0.0.1:${port}/mcp`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25',...headers},body:JSON.stringify(message),signal});
 return {child,messages,wait,send,configure,post,secret,port,hello};
}
const call=(id=1)=>({jsonrpc:'2.0',id,method:'tools/call',params:{name:'read_context',arguments:{limit:1}}});
test('real isolated child process bridges legacy initialize and exact native response over loopback',async t=>{
 const f=await fixture(t),init=await f.post({jsonrpc:'2.0',id:0,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'synthetic-client',version:'1'}}});assert.equal(init.status,200);assert.equal((await init.json()).result.protocolVersion,'2025-11-25');
 const pending=f.post(call()),request=await f.wait('request');assert.equal(request.method,'tools/call');assert.deepEqual(request.arguments,{limit:1});assert.equal(Object.hasOwn(request,'accountId'),false);
 const result={content:[{type:'text',text:'SYNTHETIC bounded Context'}],structuredContent:{available:true,items:[{text:'SYNTHETIC bounded Context'}],complete:true,nextCursor:null}};
 f.send({type:'result',generation:1,requestId:request.requestId,result});const response=await pending;assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{jsonrpc:'2.0',id:1,result});
});
test('real child rejects missing/wrong bearer, webpage Origin and foreign Host without native reads',async t=>{
 const f=await fixture(t);
 for(const options of [{token:randomBytes(32).toString('base64url')},{headers:{Origin:'https://chatgpt.com'}}]){const response=await f.post(call(),options);assert.ok([401,403].includes(response.status));await response.text();}
 const foreign=await new Promise((resolve,reject)=>{const r=httpRequest({host:'127.0.0.1',port:f.port,path:'/mcp',method:'POST',headers:{Host:'attacker.invalid',Authorization:'Bearer '+f.secret,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});r.on('error',reject);r.end(JSON.stringify(call()));});assert.equal(foreign,403);
 assert.equal(f.messages.filter(x=>x.type==='request').length,0);
});
test('real child handles modern discovery and rejects metadata mismatch before native reads',async t=>{
 const f=await fixture(t),params={_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}};
 const response=await f.post({jsonrpc:'2.0',id:1,method:'server/discover',params},{headers:{'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'server/discover'}});assert.equal(response.status,200);const body=await response.json();assert.equal(body.result.resultType,'complete');assert.deepEqual(body.result.supportedVersions,['2026-07-28','2025-11-25']);assert.equal(body.result._meta['io.modelcontextprotocol/serverInfo'].name,'paia-context-read');
 const m=call();m.params._meta=params._meta;const mismatch=await f.post(m,{headers:{'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':'read_topic'}});assert.equal(mismatch.status,400);assert.equal((await mismatch.json()).error.code,-32020);assert.equal(f.messages.filter(x=>x.type==='request').length,0);
});
test('delivered native revocation cancels in-flight HTTP and discards old result; reconnect requires new credential',async t=>{
 const f=await fixture(t),pending=f.post(call()).catch(()=>null),request=await f.wait('request');f.send({type:'revoke',generation:2});await f.wait('revoked');const response=await pending;if(response){assert.equal(response.status,503);assert.equal((await response.text()).includes('SYNTHETIC'),false);}
 f.send({type:'result',generation:1,requestId:request.requestId,result:{content:[{type:'text',text:'SYNTHETIC late body'}]}});
 const next=randomBytes(32).toString('base64url');await f.configure(3,next);const old=await f.post(call());assert.equal(old.status,401);await old.text();
 const current=f.post(call(2),{token:next}),fresh=await f.wait('request');f.send({type:'result',generation:3,requestId:fresh.requestId,result:{content:[],structuredContent:{available:false}}});assert.equal((await current).status,200);
});
test('explicit legacy cancellation clears request and never publishes its later result',async t=>{
 const f=await fixture(t),pending=f.post(call()),request=await f.wait('request');const cancel=await f.post({jsonrpc:'2.0',method:'notifications/cancelled',params:{requestId:1}});assert.equal(cancel.status,202);await cancel.text();assert.equal((await pending).status,408);assert.equal((await f.wait('cancel')).requestId,request.requestId);
 f.send({type:'result',generation:1,requestId:request.requestId,result:{content:[{type:'text',text:'SYNTHETIC cancelled'}]}});
 const ping=await f.post({jsonrpc:'2.0',id:2,method:'ping'});assert.equal(ping.status,200);assert.equal((await ping.text()).includes('cancelled'),false);
});
test('real HTTP duplicate Authorization rejects before native dispatch',async t=>{
 const f=await fixture(t),status=await new Promise((resolve,reject)=>{const r=httpRequest({host:'127.0.0.1',port:f.port,path:'/mcp',method:'POST',headers:['Host',`127.0.0.1:${f.port}`,'Authorization','Bearer '+f.secret,'authorization','Bearer '+f.secret,'Content-Type','application/json','Accept','application/json, text/event-stream']},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});r.on('error',reject);r.end(JSON.stringify(call()));});assert.equal(status,400);assert.equal(f.messages.filter(x=>x.type==='request').length,0);
});
