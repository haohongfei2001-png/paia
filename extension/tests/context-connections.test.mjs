import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ContextConnections,CONTEXT_CONNECTION_KEY} from '../background/context-connections.js';
import {NativeFrameDecoder,encodeNativeFrame} from '../../services/context-read-bridge/native-framing.mjs';

const op=()=>crypto.randomUUID();
const configuration={version:1,target:'chatgpt',transport:'native-loopback-http-bearer',principalMode:'paired-local-profile',qualificationId:'synthetic-offline-qualification'};
const event=()=>{const listeners=new Set();return {addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn),emit:value=>{for(const fn of [...listeners])fn(value);}};};
async function freePort(){const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function fixture(t,{qualified=true,permitted=true}={}){
 const {s,storage}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');const cards=new ContextCardsService(s),itemId=op();
 await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId,expectedRevision:0,card:'info',section:'Synthetic information',body:'SYNTHETIC complete private item'});
 for(const key of ['global','info'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:0});
 const storageListeners=new Set(),children=[],ports=[],state={sets:0,failSet:false,connects:0,permitted,postHook:null};const api={permissions:{onRemoved:event(),contains:async()=>{await state.permissionHook?.();return state.permitted;}},storage:{local:{get:async k=>{await state.getHook?.(k);return storage.get(k);},set:async values=>{state.sets++;if(state.failSet)throw Error('synthetic storage failure');await storage.set(values);for(const fn of [...storageListeners])fn(Object.fromEntries(Object.entries(values).map(([k,newValue])=>[k,{newValue}])),'local');}},onChanged:{addListener:fn=>storageListeners.add(fn),removeListener:fn=>storageListeners.delete(fn)}},runtime:{connectNative:name=>{
  state.connects++;assert.equal(name,'com.paia.context_read');const child=spawn(process.execPath,[new URL('../../services/context-read-bridge/fixtures/host-process.mjs',import.meta.url).pathname],{stdio:['pipe','pipe','pipe']});children.push(child);let stderr='';child.stderr.on('data',x=>stderr+=x);
  const port={onMessage:event(),onDisconnect:event(),postMessage(message){state.postHook?.(message);child.stdin.write(encodeNativeFrame(message));},disconnect(){child.stdin.end();}};ports.push(port);const decoder=new NativeFrameDecoder(m=>port.onMessage.emit(m),()=>port.disconnect());child.stdout.on('data',b=>decoder.push(b));child.once('exit',()=>{port.onDisconnect.emit();assert.equal(stderr,'');});return port;
 }}};
 const owner=new ContextConnections(s,api,{configuration:qualified?configuration:null});
 t.after(async()=>{owner.dispose();await Promise.all(children.map(async child=>{const timer=setTimeout(()=>child.kill(),1000);timer.unref();if(child.exitCode===null)await once(child,'exit');clearTimeout(timer);}));});
 const pair=async()=>{const port=await freePort(),value=await owner.pair({expectedRevision:(await owner.status()).revision,port});for(let i=0;i<100;i++){if((await owner.status()).connectedCount===1)return {...value,port};await new Promise(r=>setTimeout(r,5));}throw Error('native bridge not ready');};
 const read=async pairing=>{const response=await fetch(`http://127.0.0.1:${pairing.port}/mcp`,{method:'POST',headers:{Authorization:'Bearer '+pairing.credential,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_context',arguments:{limit:1}}})});return {status:response.status,body:await response.json()};};
 return {s,storage,cards,itemId,owner,api,state,ports,pair,read};
}
test('default-null qualification and ungranted native permission never pair/connect or write',async t=>{
 for(const options of [{qualified:false},{permitted:false}]){const f=await fixture(t,options),before=f.state.sets;await assert.rejects(f.owner.pair({expectedRevision:0,port:49200}),{code:'FEATURE_UNAVAILABLE'});assert.equal(f.state.connects,0);assert.equal(f.state.sets,before);assert.equal((await f.owner.status()).connectedCount,0);}
});
test('actual original Context read traverses worker-owned native pipe and real loopback process',async t=>{
 const f=await fixture(t),pairing=await f.pair(),result=await f.read(pairing);assert.equal(result.status,200);assert.equal(result.body.result.structuredContent.available,true);assert.equal(result.body.result.structuredContent.items[0].text,'SYNTHETIC complete private item');
 const stored=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];assert.equal(JSON.stringify(stored).includes(pairing.credential),false);assert.equal(JSON.stringify(stored).includes('SYNTHETIC complete'),false);assert.equal(stored.connections[0].credentialHash.length,64);const status=await f.owner.status();assert.equal(status.connectedCount,1);assert.equal(status.connections[0].principalMode,'paired-local-profile');assert.equal(JSON.stringify(status).includes('credentialHash'),false);assert.equal(status.externalAllowed,false);
});
test('live connection never opens original Global/Card gates or uses an unavailable result as empty success',async t=>{
 const f=await fixture(t),pairing=await f.pair();await f.cards.change({kind:'access',operationId:op(),epoch:'initial',key:'global',enabled:false,expectedRevision:1});const result=await f.read(pairing);assert.equal(result.body.result.isError,true);assert.equal(result.body.result.structuredContent.available,false);assert.equal(JSON.stringify(result.body).includes('SYNTHETIC complete private item'),false);assert.equal((await f.cards.snapshot()).access.global.enabled,false);
});
test('pause closes the actual transport before persistence and storage failure never revives it',async t=>{
 const f=await fixture(t),pairing=await f.pair();f.state.failSet=true;const changing=f.owner.change({id:pairing.id,action:'pause',expectedRevision:pairing.revision});assert.equal((await f.owner.status()).connectedCount,0);await assert.rejects(changing);assert.equal((await f.owner.status()).connectedCount,0);await assert.rejects(f.read(pairing));
});
test('reconnect rotates credential, generation and actual native caller; old credential cannot read',async t=>{
 const f=await fixture(t),pairing=await f.pair(),value=await f.owner.change({id:pairing.id,action:'reconnect',expectedRevision:pairing.revision});assert.notEqual(value.credential,pairing.credential);for(let i=0;i<100&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal((await f.owner.status()).connectedCount,1);assert.equal((await f.read(pairing)).status,401);assert.equal((await f.read({...pairing,...value})).body.result.structuredContent.available,true);
});
test('revoke erases stored credential hash and a cold worker never silently reconnects',async t=>{
 const f=await fixture(t),pairing=await f.pair();await f.owner.change({id:pairing.id,action:'revoke',expectedRevision:pairing.revision});const row=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];assert.equal(row.connections[0].credentialHash,null);assert.equal((await f.owner.status()).connections[0].state,'revoked');const cold=new ContextConnections(f.s,f.api,{configuration});assert.equal((await cold.status()).connectedCount,0);assert.equal(f.state.connects,1);cold.dispose();
});
test('restore epoch drift refuses the old paired connection and never publishes original body',async t=>{
 const f=await fixture(t),pairing=await f.pair();await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));const result=await f.read(pairing).catch(()=>null);if(result)assert.equal(JSON.stringify(result.body).includes('SYNTHETIC complete private item'),false);assert.equal((await f.owner.status()).connectedCount,0);
});
test('request JSON cannot supply account, permissions or an alternative connection generation',async t=>{
 const f=await fixture(t),pairing=await f.pair(),response=await fetch(`http://127.0.0.1:${pairing.port}/mcp`,{method:'POST',headers:{Authorization:'Bearer '+pairing.credential,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_context',arguments:{accountId:'claimed',permission:true,generation:999}}})});assert.equal(response.status,503);assert.equal((await response.text()).includes('SYNTHETIC complete private item'),false);
});

test('pause synchronously cancels an earlier reconnect held before its native port exists',async t=>{
 const f=await fixture(t),pairing=await f.pair();let entered,release;const enteredPromise=new Promise(r=>entered=r),held=new Promise(r=>release=r);f.state.permissionHook=async()=>{f.state.permissionHook=null;entered();await held;};
 const reconnect=f.owner.change({id:pairing.id,action:'reconnect',expectedRevision:pairing.revision});await enteredPromise;const pause=f.owner.change({id:pairing.id,action:'pause',expectedRevision:pairing.revision});release();const results=await Promise.allSettled([reconnect,pause]);
 assert.equal(f.state.connects,1,'an earlier held reconnect must not create a new native port after pause intent');assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');assert.equal((await f.owner.status()).connectedCount,0);assert.equal((await f.owner.status()).connections[0].state,'paused');
});
test('explicit repair after restore binds a new local profile and credential without reviving old pairing',async t=>{
 const f=await fixture(t),old=await f.pair(),oldRow=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));assert.equal((await f.owner.status()).reason,'store_changed');
 const port=await freePort(),next=await f.owner.pair({expectedRevision:old.revision,port},{replaceStale:true});for(let i=0;i<100&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal((await f.owner.status()).connectedCount,1);
 const row=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];assert.notEqual(row.profileId,oldRow.profileId);assert.notEqual(next.credential,old.credential);assert.notEqual(next.id,old.id);assert.equal((await f.read({...next,port})).body.result.structuredContent.available,true);await assert.rejects(f.read(old));
});


test('a restriction during stale repair admission cannot be absorbed by its replacement ticket',async t=>{
 const f=await fixture(t),old=await f.pair();await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));let entered,release;const enter=new Promise(r=>entered=r),hold=new Promise(r=>release=r);
 f.state.getHook=async key=>{if(key!==CONTEXT_CONNECTION_KEY)return;f.state.getHook=null;entered();await hold;};
 const repair=f.owner.pair({expectedRevision:old.revision,port:await freePort()},{replaceStale:true});await enter;f.owner.invalidate();release();await assert.rejects(repair,{code:'CONTEXT_INVALIDATED'});assert.equal(f.state.connects,1);
});
test('native permission revocation synchronously closes the paired transport and rejects later reads',async t=>{
 const f=await fixture(t),pairing=await f.pair();f.state.permitted=false;f.api.permissions.onRemoved.emit({permissions:['nativeMessaging']});assert.equal((await f.owner.status()).connectedCount,0);await assert.rejects(f.read(pairing));
});


test('unknown restriction identities hit a bounded deny-generation reset without reviving any old caller',async t=>{
 const f=await fixture(t),pairing=await f.pair();for(let i=0;i<40;i++)await assert.rejects(f.owner.change({id:op(),action:'pause',expectedRevision:pairing.revision}),{code:'INVALID_REQUEST'});
 assert.equal((await f.owner.status()).connectedCount,0,'bounded deny map safely invalidates all older operation tickets');await assert.rejects(f.read(pairing));const next=await f.owner.change({id:pairing.id,action:'reconnect',expectedRevision:pairing.revision});for(let i=0;i<100&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal((await f.read({...pairing,...next})).body.result.structuredContent.available,true);assert.equal((await f.read(pairing)).status,401);
});
