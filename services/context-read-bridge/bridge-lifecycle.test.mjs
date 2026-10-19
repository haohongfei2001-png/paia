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

test('versioned revoked ACK is withheld until the actual server close callback completes',async t=>{
 const {Server}=await import('node:http'),input=new PassThrough(),output=new PassThrough(),messages=[],decoder=new NativeFrameDecoder(m=>messages.push(m),()=>assert.fail());output.on('data',chunk=>decoder.push(chunk));const host=new NativeContextBridge({input,output,extensionId:'a'.repeat(32),origin:'chrome-extension://'+'a'.repeat(32)+'/'});t.after(()=>host.close());
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const hello=messages[0];assert.equal(hello.handover,'closed-listener-ack-v1');input.write(encodeNativeFrame({version:1,type:'configure',hostNonce:hello.hostNonce,connectionId:randomUUID(),generation:1,credentialHash:credentialDigest(randomBytes(32).toString('base64url')),expiresAt:Date.now()+60000,port}));for(let i=0;i<100&&!messages.some(m=>m.type==='ready');i++)await new Promise(r=>setTimeout(r,2));assert.ok(messages.some(m=>m.type==='ready'));
 const original=Server.prototype.close;let complete;Server.prototype.close=function(callback){return original.call(this,()=>{complete=()=>callback?.();});};try{input.write(encodeNativeFrame({version:1,type:'revoke',hostNonce:hello.hostNonce,generation:2}));for(let i=0;i<100&&!complete;i++)await new Promise(r=>setTimeout(r,2));assert.equal(typeof complete,'function');assert.equal(messages.some(m=>m.type==='revoked'),false);complete();for(let i=0;i<100&&!messages.some(m=>m.type==='revoked');i++)await new Promise(r=>setTimeout(r,2));assert.deepEqual(messages.find(m=>m.type==='revoked'),{version:1,type:'revoked',hostNonce:hello.hostNonce,generation:2,handover:'closed-listener-ack-v1'});}finally{Server.prototype.close=original;}
 const replacement=createServer();await new Promise((resolve,reject)=>{replacement.once('error',reject);replacement.listen(port,'127.0.0.1',resolve);});await new Promise(r=>replacement.close(r));
});
