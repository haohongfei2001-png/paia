import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {PassThrough} from 'node:stream';
import {endianness} from 'node:os';
import {NativeFrameDecoder,encodeNativeFrame,NATIVE_FRAME_LIMIT} from './native-framing.mjs';
import {authenticateRequest,credentialDigest,validateRPC,BRIDGE_LIMITS} from './http-boundary.mjs';
import {NativeContextBridge} from './native-host.mjs';
import {contextNativeManifest} from './manifest.mjs';

const secret=randomBytes(32).toString('base64url'); // synthetic, process-local test material
const config={port:49215,credentialHash:credentialDigest(secret),expiresAt:Date.now()+60000};
const request=()=>({method:'POST',url:'/mcp',rawHeaders:['Host','127.0.0.1:49215','Authorization','Bearer '+secret,'Content-Type','application/json','Accept','application/json, text/event-stream','MCP-Protocol-Version','2025-11-25']});
const set=(r,k,v)=>{const i=r.rawHeaders.findIndex((x,i)=>i%2===0&&x.toLowerCase()===k.toLowerCase());if(i>=0)r.rawHeaders.splice(i,2,...(v===null?[]:[k,v]));else if(v!==null)r.rawHeaders.push(k,v);};
test('native framing accepts fragmented and concatenated original frames exactly',()=>{
 const messages=[],errors=[],d=new NativeFrameDecoder(x=>messages.push(x),()=>errors.push(true));
 const a=encodeNativeFrame({version:1,value:'SYNTHETIC 中文'}),b=encodeNativeFrame({version:1,value:2});
 d.push(a.subarray(0,2));d.push(a.subarray(2,7));d.push(Buffer.concat([a.subarray(7),b]));d.end();assert.deepEqual(messages,[{version:1,value:'SYNTHETIC 中文'},{version:1,value:2}]);assert.equal(errors.length,0);
});
for(const kind of ['oversize','zero','malformed','invalid_utf8','array','truncated'])test('native framing permanently refuses '+kind,()=>{
 let calls=0,errors=0;const d=new NativeFrameDecoder(()=>calls++,()=>errors++);let frame;
 if(['oversize','zero'].includes(kind)){frame=Buffer.alloc(4);const n=kind==='oversize'?NATIVE_FRAME_LIMIT+1:0;endianness()==='LE'?frame.writeUInt32LE(n):frame.writeUInt32BE(n);}
 else if(kind==='array')frame=encodeNativeFrame([]);
 else if(kind==='truncated')frame=encodeNativeFrame({a:1}).subarray(0,6);
 else{const body=kind==='malformed'?Buffer.from('{x'):Buffer.from([0xc3,0x28]);const h=Buffer.alloc(4);endianness()==='LE'?h.writeUInt32LE(body.length):h.writeUInt32BE(body.length);frame=Buffer.concat([h,body]);}
 d.push(frame);d.end();d.push(encodeNativeFrame({late:true}));assert.equal(calls,0);assert.equal(errors,1);
});
test('exact bearer header admits only the explicit loopback connection',()=>{assert.ok(authenticateRequest(request(),config).headers);});
for(const [name,change,status]of[
 ['missing bearer',r=>set(r,'Authorization',null),401],['bad bearer',r=>set(r,'Authorization','Bearer '+'x'.repeat(43)),401],['oversized bearer',r=>set(r,'Authorization','Bearer '+'x'.repeat(8193)),400],['duplicate bearer',r=>r.rawHeaders.push('authorization','Bearer '+secret),400],['CRLF',r=>set(r,'Authorization','Bearer '+secret+'\r\n'),400],
 ['remote Host',r=>set(r,'Host','attacker.example'),403],['Host duplicate',r=>r.rawHeaders.push('host','127.0.0.1:49215'),400],['browser Origin',r=>set(r,'Origin','https://chatgpt.com'),403],['null Origin',r=>set(r,'Origin','null'),403],['local Origin',r=>set(r,'Origin','http://127.0.0.1:49215'),403],
 ['query bearer',r=>r.url='/mcp?token='+secret,404],['other path',r=>r.url='/read',404],['get',r=>r.method='GET',405],['delete',r=>r.method='DELETE',405],['wrong content type',r=>set(r,'Content-Type','text/plain'),415],['no SSE accept',r=>set(r,'Accept','application/json'),406],['compressed body',r=>set(r,'Content-Encoding','gzip'),415],['big declared body',r=>set(r,'Content-Length',String(BRIDGE_LIMITS.bodyBytes+1)),413],['ambiguous size',r=>set(r,'Content-Length','01'),413],['unsupported version',r=>set(r,'MCP-Protocol-Version','1900-01-01'),400]
])test('HTTP pre-body boundary refuses '+name,()=>{const r=request();change(r);assert.equal(authenticateRequest(r,config).status,status);});
test('unconfigured and expired connections never grant a bearer',()=>{assert.equal(authenticateRequest(request(),null).status,503);assert.equal(authenticateRequest(request(),{...config,expiresAt:Date.now()-1}).status,503);});
const rpc=(method='tools/call')=>({jsonrpc:'2.0',id:1,method,params:method==='tools/call'?{name:'read_context',arguments:{limit:1}}:{}});
test('legacy and modern RPC preserve four bounded tool arguments without identity elevation',()=>{
 const legacy=authenticateRequest(request(),config);assert.ok(validateRPC(rpc(),legacy).message);
 const r=request();set(r,'MCP-Protocol-Version','2026-07-28');set(r,'Mcp-Method','tools/call');set(r,'Mcp-Name','read_context');const m=rpc();m.params._meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientInfo':{name:'untrusted claim'}};
 assert.equal(validateRPC(m,authenticateRequest(r,config)).modern,true);
 set(r,'Mcp-Name','=?base64?'+Buffer.from('read_context').toString('base64')+'?=');assert.equal(validateRPC(m,authenticateRequest(r,config)).modern,true);
});
for(const [name,change]of[
 ['batch',()=>[]],['wrong jsonrpc',m=>({...m,jsonrpc:'1.0'})],['identity top level',m=>({...m,accountId:'untrusted'})],['write method',m=>({...m,method:'context/write'})],['permission params',m=>({...m,params:{...m.params,permission:true}})],['no request ID',m=>{delete m.id;return m;}],['null ID',m=>({...m,id:null})],['array arguments',m=>({...m,params:{name:'read_context',arguments:[]}})]
])test('RPC rejects '+name,()=>{assert.ok(validateRPC(change(rpc()),authenticateRequest(request(),config)).status);});
for(const name of ['version','method','name'])test('modern per-request '+name+' mismatch is HeaderMismatch',()=>{
 const r=request();set(r,'MCP-Protocol-Version','2026-07-28');set(r,'Mcp-Method','tools/call');set(r,'Mcp-Name','read_context');const m=rpc();m.params._meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28'};
 if(name==='version')m.params._meta['io.modelcontextprotocol/protocolVersion']='2025-11-25';if(name==='method')set(r,'Mcp-Method','tools/list');if(name==='name')set(r,'Mcp-Name','read_topic');
 const result=validateRPC(m,authenticateRequest(r,config));assert.equal(result.status,400);assert.equal(result.body.error.code,-32020);
});
test('native caller is bound to a single exact extension origin before handshake',()=>{
 for(const origin of ['https://chatgpt.com','chrome-extension://'+'b'.repeat(32)+'/','chrome-extension://'+'a'.repeat(32)+'/page.html'])assert.throws(()=>new NativeContextBridge({input:new PassThrough(),output:new PassThrough(),origin,extensionId:'a'.repeat(32)}),/CALLER_INVALID/);
 const input=new PassThrough(),output=new PassThrough(),messages=[];output.on('data',b=>new NativeFrameDecoder(m=>messages.push(m),()=>assert.fail()).push(b));const host=new NativeContextBridge({input,output,origin:'chrome-extension://'+'a'.repeat(32)+'/',extensionId:'a'.repeat(32)});assert.equal(messages.length,1);assert.equal(messages[0].type,'hello');assert.deepEqual(Object.keys(messages[0]).sort(),['hostNonce','type','version']);host.close();
});
test('manifest preparation is exact, pure and never widens extension origins',()=>{
 assert.deepEqual(contextNativeManifest({extensionId:'a'.repeat(32),launcherPath:'/synthetic/paia-context-launcher'}).allowed_origins,['chrome-extension://'+'a'.repeat(32)+'/']);assert.throws(()=>contextNativeManifest({extensionId:'*',launcherPath:'/synthetic/host'}));assert.throws(()=>contextNativeManifest({extensionId:'a'.repeat(32),launcherPath:'relative'}));
});
