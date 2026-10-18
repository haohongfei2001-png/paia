import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {NativeContextBridge} from './native-host.mjs';
import {NativeFrameDecoder,encodeNativeFrame} from './native-framing.mjs';
import {credentialDigest} from './http-boundary.mjs';
test('host clock rollback reports unavailable on its original native generation before retiring HTTP',async t=>{
 const input=new PassThrough(),output=new PassThrough(),messages=[];const decoder=new NativeFrameDecoder(m=>messages.push(m),()=>assert.fail());output.on('data',chunk=>decoder.push(chunk));const host=new NativeContextBridge({input,output,extensionId:'a'.repeat(32),origin:'chrome-extension://'+'a'.repeat(32)+'/'});t.after(()=>host.close());
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));const secret=randomBytes(32).toString('base64url'),hello=messages[0],now=Date.now();input.write(encodeNativeFrame({version:1,type:'configure',hostNonce:hello.hostNonce,connectionId:randomUUID(),generation:1,credentialHash:credentialDigest(secret),expiresAt:now+60000,port}));for(let i=0;i<100&&!messages.some(m=>m.type==='ready');i++)await new Promise(r=>setTimeout(r,2));assert.ok(messages.some(m=>m.type==='ready'));
 const original=Date.now;try{Date.now=()=>now-1000;await fetch(`http://127.0.0.1:${port}/mcp`,{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'ping'})}).then(r=>r.text()).catch(()=>null);}finally{Date.now=original;}
 const unavailable=messages.filter(m=>m.type==='unavailable');assert.equal(unavailable.length,1,'worker must learn that its host stopped being readable');assert.equal(unavailable[0].generation,1);assert.equal(unavailable[0].hostNonce,hello.hostNonce);assert.equal(messages.filter(m=>m.type==='request').length,0);
});
