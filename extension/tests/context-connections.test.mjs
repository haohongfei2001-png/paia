import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ContextConnections,CONTEXT_CONNECTION_KEY,CONTEXT_RESUME_WITNESS} from '../background/context-connections.js';
import {NativeFrameDecoder,encodeNativeFrame} from '../../services/context-read-bridge/native-framing.mjs';

const op=()=>crypto.randomUUID();
const configuration={version:1,target:'chatgpt',transport:'native-loopback-http-bearer',principalMode:'paired-local-profile',qualificationId:'synthetic-offline-qualification'};
const event=()=>{const listeners=new Set();return {addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn),emit:value=>{for(const fn of [...listeners])fn(value);}};};
async function freePort(){const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function fixture(t,{qualified=true,permitted=true,sourceConfiguration=configuration}={}){
 const {s,storage}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');const cards=new ContextCardsService(s),itemId=op();
 await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId,expectedRevision:0,card:'info',section:'Synthetic information',body:'SYNTHETIC complete private item'});
 for(const key of ['global','info'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:0});
 const storageListeners=new Set(),children=[],ports=[],state={sets:0,failSet:false,connects:0,permitted,postHook:null};const api={permissions:{onRemoved:event(),contains:async()=>{await state.permissionHook?.();return state.permitted;}},storage:{local:{get:async k=>{await state.getHook?.(k);return storage.get(k);},set:async values=>{state.sets++;await state.setHook?.(values);if(state.failSet)throw Error('synthetic storage failure');await storage.set(values);for(const fn of [...storageListeners])fn(Object.fromEntries(Object.entries(values).map(([k,newValue])=>[k,{newValue}])),'local');}},onChanged:{addListener:fn=>storageListeners.add(fn),removeListener:fn=>storageListeners.delete(fn)}},runtime:{id:'a'.repeat(32),onStartup:event(),onSuspend:event(),onSuspendCanceled:event(),connectNative:name=>{
  state.connects++;assert.equal(name,'com.paia.context_read');const child=spawn(process.execPath,[new URL('../../services/context-read-bridge/fixtures/host-process.mjs',import.meta.url).pathname],{stdio:['pipe','pipe','pipe']});children.push(child);let stderr='';child.stderr.on('data',x=>stderr+=x);
  const port={onMessage:event(),onDisconnect:event(),postMessage(message){if(state.postHook?.(message)===false)return;child.stdin.write(encodeNativeFrame(message));},disconnect(){if(state.disconnectDelay)setTimeout(()=>child.stdin.end(),state.disconnectDelay);else child.stdin.end();}};ports.push(port);const decoder=new NativeFrameDecoder(m=>{if(state.messageHook?.(m,port)!==false)port.onMessage.emit(m);},()=>port.disconnect());child.stdout.on('data',b=>decoder.push(b));child.once('exit',()=>{port.onDisconnect.emit();assert.equal(stderr,'');});return port;
 }}};
 const owner=new ContextConnections(s,api,{configuration:qualified?sourceConfiguration:null});
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

const persistentConfiguration={...configuration,version:2,authorizationPolicy:{version:1,id:'synthetic-qualified-lifetime-v1',authorizationLifetimeMs:86400000,runtimeLeaseMs:3600000}};
async function persistentPair(f){const port=await freePort(),value=await f.owner.pair({expectedRevision:(await f.owner.status()).revision,port,authorizationPolicyId:persistentConfiguration.authorizationPolicy.id});for(let i=0;i<100&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));return {...value,port};}
test('explicit persistent pairing can resume its same current authorization after a cold worker without reopening PAIA',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);assert.equal((await f.read(pairing)).status,200);assert.equal((await f.owner.checkpointForSuspend()).checkpointed,1);const original=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];f.owner.dispose();await new Promise(r=>setTimeout(r,20));const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());const result=await cold.resumeAuthorized();assert.equal(result.resumed,1);for(let i=0;i<100&&(await cold.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal((await f.read(pairing)).body.result.structuredContent.available,true);const current=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];assert.equal(current.connections[0].credentialHash,original.connections[0].credentialHash);assert.equal(current.connections[0].authorization.id,original.connections[0].authorization.id);assert.equal(current.connections[0].generation,original.connections[0].generation+1);assert.equal(JSON.stringify(current).includes(pairing.credential),false);
});
test('legacy one-hour pairing never upgrades to persistent authorization on a cold source configuration change',async t=>{
 const f=await fixture(t),pairing=await f.pair(),before=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];f.owner.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});assert.equal(f.state.connects,1);assert.deepEqual((await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY],before);
});
test('persistent pairing requires the exact explicitly displayed source-qualified policy identity',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),sets=f.state.sets;for(const authorizationPolicyId of [undefined,'another-policy'])await assert.rejects(f.owner.pair({expectedRevision:0,port:await freePort(),...(authorizationPolicyId?{authorizationPolicyId}:{})}),{code:'CONTEXT_INVALIDATED'});assert.equal(f.state.sets,sets);assert.equal(f.state.connects,0);
});
test('paused and revoked persistent connections never resume after a cold worker',async t=>{
 for(const action of ['pause','revoke']){const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);await f.owner.change({id:pairing.id,action,expectedRevision:pairing.revision});f.owner.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});assert.equal(f.state.connects,1);if(action==='revoke')assert.equal((await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY].connections[0].authorization,undefined);}
});
test('persistent resume rejects changed qualification or lifetime policy rather than upgrading its original grant',async t=>{
 for(const sourceConfiguration of [{...persistentConfiguration,qualificationId:'replacement'},{...persistentConfiguration,authorizationPolicy:{...persistentConfiguration.authorizationPolicy,authorizationLifetimeMs:172800000}}]){const f=await fixture(t,{sourceConfiguration:persistentConfiguration});await persistentPair(f);f.owner.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:sourceConfiguration});t.after(()=>cold.dispose());assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});assert.equal(f.state.connects,1);}
});
test('persistent resume independently rechecks permission and restore epoch without reconnecting',async t=>{
 for(const cause of ['permission','restore']){const f=await fixture(t,{sourceConfiguration:persistentConfiguration});await persistentPair(f);f.owner.dispose();if(cause==='permission')f.state.permitted=false;else await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());await assert.rejects(cold.resumeAuthorized());assert.equal(f.state.connects,1);}
});
test('pause intent cancels an in-flight cold persistent resume before a replacement native port is created',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);await f.owner.checkpointForSuspend();const expectedRevision=(await f.owner.status()).revision;f.owner.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());let entered,release;const held=new Promise(r=>release=r),waiting=new Promise(r=>entered=r);f.state.permissionHook=async()=>{f.state.permissionHook=null;entered();await held;};const resume=cold.resumeAuthorized();await waiting;const pause=cold.change({id:pairing.id,action:'pause',expectedRevision});release();const results=await Promise.allSettled([resume,pause]);assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');assert.equal(f.state.connects,1);assert.equal((await cold.status()).connectedCount,0);
});
test('actual live-port runtime lease renews under the same finite authorization without rotating the client credential',async t=>{
 const config={...persistentConfiguration,authorizationPolicy:{...persistentConfiguration.authorizationPolicy,runtimeLeaseMs:1000,authorizationLifetimeMs:5000}},f=await fixture(t,{sourceConfiguration:config}),pairing=await persistentPair(f),before=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];
 for(let i=0;i<200&&f.state.connects<2;i++)await new Promise(r=>setTimeout(r,10));assert.ok(f.state.connects>=2);for(let i=0;i<100&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal((await f.read(pairing)).body.result.structuredContent.available,true);const after=(await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];assert.equal(after.connections[0].credentialHash,before.connections[0].credentialHash);assert.deepEqual(after.connections[0].authorization,before.connections[0].authorization);assert.ok(after.connections[0].generation>before.connections[0].generation);assert.ok(after.connections[0].expiresAt<=after.connections[0].authorization.expiresAt);
});
test('a failed persistent pause must not be resurrected by the next cold worker',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);f.state.failSet=true;await assert.rejects(f.owner.change({id:pairing.id,action:'pause',expectedRevision:pairing.revision}));f.state.failSet=false;f.owner.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());const result=await cold.resumeAuthorized();assert.equal(result.resumed,0);assert.equal(f.state.connects,1);
});

test('unknown dirty shutdown never reuses a persistent authorization',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration});await persistentPair(f);f.owner.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});assert.equal(f.state.connects,1);
});
test('two cold owners cannot both consume the same clean checkpoint',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration});await persistentPair(f);assert.equal((await f.owner.checkpointForSuspend()).checkpointed,1);f.owner.dispose();const a=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration}),b=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>{a.dispose();b.dispose();});const results=await Promise.allSettled([a.resumeAuthorized(),b.resumeAuthorized()]);assert.equal(results.filter(x=>x.status==='fulfilled'&&x.value.resumed===1).length,1);assert.equal(f.state.connects,2);
});
test('a late clean Chrome write cannot overwrite a newer durable pause witness',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);let entered,release;const held=new Promise(r=>release=r),waiting=new Promise(r=>entered=r);f.state.setHook=async values=>{if(values[CONTEXT_CONNECTION_KEY]?.connections[0]?.resumeState!=='clean')return;f.state.setHook=null;entered();await held;};const checkpoint=f.owner.checkpointForSuspend();checkpoint.catch(()=>{});await waiting;const other=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>other.dispose());assert.deepEqual(await other.resumeAuthorized(),{resumed:0});await other.change({id:pairing.id,action:'pause',expectedRevision:pairing.revision});release();await assert.rejects(checkpoint);f.owner.dispose();other.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});assert.equal(f.state.connects,1);const witness=await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_RESUME_WITNESS),['meta']);assert.equal(witness.phase,'settled');assert.equal(witness.row.connections[0].state,'paused');
});
test('permission loss and restore while a clean write awaits acknowledgement never produce a resumable witness',async t=>{
 for(const cause of ['permission','restore']){const f=await fixture(t,{sourceConfiguration:persistentConfiguration});await persistentPair(f);let entered,release;const held=new Promise(r=>release=r),waiting=new Promise(r=>entered=r);f.state.setHook=async()=>{f.state.setHook=null;entered();await held;};const checkpoint=f.owner.checkpointForSuspend();checkpoint.catch(()=>{});await waiting;if(cause==='permission'){f.state.permitted=false;f.api.permissions.onRemoved.emit({permissions:['nativeMessaging']});}else await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));release();await assert.rejects(checkpoint);f.owner.dispose();f.state.permitted=true;const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());await cold.resumeAuthorized().catch(()=>{});assert.equal(f.state.connects,1);const witness=await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_RESUME_WITNESS),['meta']);assert.equal(witness.phase,'pending');}
});
test('accepted failing restriction before suspend cannot publish a clean checkpoint',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);f.state.failSet=true;const pause=f.owner.change({id:pairing.id,action:'pause',expectedRevision:pairing.revision});pause.catch(()=>{});const checkpoint=f.owner.checkpointForSuspend();await assert.rejects(pause);await checkpoint.catch(()=>{});f.owner.dispose();f.state.failSet=false;const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});assert.equal(f.state.connects,1);
});
test('a sealed owner does not accept a later pause or claim that it was persisted',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);const result=await f.owner.checkpointForSuspend();assert.equal(result.checkpointed,1);await assert.rejects(f.owner.change({id:pairing.id,action:'pause',expectedRevision:(await f.owner.status()).revision}),{code:'CONTEXT_INVALIDATED'});assert.equal((await f.storage.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY].connections[0].state,'enabled');
});
test('missing runtime witness never treats a clean Chrome registry or backup data as authorization',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration});await persistentPair(f);await f.owner.checkpointForSuspend();f.owner.dispose();await f.s.repository.transaction(true,t=>t.delete('meta',CONTEXT_RESUME_WITNESS),['meta']);const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});assert.equal(f.state.connects,1);const {backupMetaAllowed}=await import('../core/backup-format.js');assert.equal(backupMetaAllowed(CONTEXT_RESUME_WITNESS),false);
});
test('explicit reconnect rotates authorization after an unknown persistence outcome',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);f.state.failSet=true;await assert.rejects(f.owner.change({id:pairing.id,action:'pause',expectedRevision:pairing.revision}));f.state.failSet=false;assert.equal((await f.owner.status()).reason,'reconnect_required');const next=await f.owner.change({id:pairing.id,action:'reconnect',expectedRevision:pairing.revision,authorizationPolicyId:persistentConfiguration.authorizationPolicy.id});assert.notEqual(next.credential,pairing.credential);for(let i=0;i<100&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal((await f.read({...pairing,...next})).body.result.structuredContent.available,true);
});

test('cold clean restriction with every durable write failing blocks this owner from later automatic resume',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);await f.owner.checkpointForSuspend();const revision=(await f.owner.status()).revision;f.owner.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());const original=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(write,...args)=>write?Promise.reject(Error('synthetic all durable writes unavailable')):original(write,...args);f.state.failSet=true;await assert.rejects(cold.change({id:pairing.id,action:'pause',expectedRevision:revision}));f.s.repository.transaction=original;f.state.failSet=false;assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});assert.equal(f.state.connects,1);assert.notEqual((await cold.status()).connections[0].state,'paused');
 // No durable mutation could record the refused command. A new process can
 // only see the earlier clean authorization; do not claim permanent revocation.
 const another=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>another.dispose());assert.equal((await another.resumeAuthorized()).resumed,1);
});
test('pause intent during the dirty claim prevents any new native port before its confirmed restriction',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);await f.owner.checkpointForSuspend();const revision=(await f.owner.status()).revision;f.owner.dispose();const cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration});t.after(()=>cold.dispose());let entered,release;const held=new Promise(r=>release=r),waiting=new Promise(r=>entered=r);f.state.setHook=async values=>{if(values[CONTEXT_CONNECTION_KEY]?.connections[0]?.resumeState!=='dirty')return;f.state.setHook=null;entered();await held;};const resume=cold.resumeAuthorized();resume.catch(()=>{});await waiting;const pause=cold.change({id:pairing.id,action:'pause',expectedRevision:revision});pause.catch(()=>{});release();await assert.rejects(resume);await pause.catch(()=>{});assert.equal(f.state.connects,1);assert.deepEqual(await cold.resumeAuthorized(),{resumed:0});
});

test('source lifecycle hooks seal on suspend and restore a confirmed clean runtime on suspend cancellation',async t=>{
 const {installContextConnectionLifecycle}=await import('../background/context-connection-lifecycle.js'),f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f),lifecycle=installContextConnectionLifecycle(f.owner,f.api);t.after(()=>lifecycle.dispose());await new Promise(r=>setTimeout(r,20));f.api.runtime.onSuspend.emit();assert.equal((await f.owner.status()).connectedCount,0);for(let i=0;i<100;i++){const witness=await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_RESUME_WITNESS),['meta']);if(witness.phase==='settled'&&witness.row.connections[0].resumeState==='clean')break;await new Promise(r=>setTimeout(r,5));}f.api.runtime.onSuspendCanceled.emit();for(let i=0;i<100&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal(f.state.connects,2);assert.equal((await f.read(pairing)).body.result.structuredContent.available,true);
});
test('source lifecycle cold start waits original readiness and disposal cancels an unstarted resume',async t=>{
 const {installContextConnectionLifecycle}=await import('../background/context-connection-lifecycle.js'),f=await fixture(t,{sourceConfiguration:persistentConfiguration});await persistentPair(f);await f.owner.checkpointForSuspend();f.owner.dispose();let release;const ready=new Promise(r=>release=r),cold=new ContextConnections(f.s,f.api,{configuration:persistentConfiguration}),lifecycle=installContextConnectionLifecycle(cold,f.api,ready);await new Promise(r=>setTimeout(r,10));assert.equal(f.state.connects,1);lifecycle.dispose();release();await new Promise(r=>setTimeout(r,20));f.api.runtime.onStartup.emit();await new Promise(r=>setTimeout(r,10));assert.equal(f.state.connects,1);
});

test('renewal waits for the original host listener to close even when pipe disconnection is delayed',async t=>{
 const config={...persistentConfiguration,authorizationPolicy:{...persistentConfiguration.authorizationPolicy,runtimeLeaseMs:1000,authorizationLifetimeMs:5000}},f=await fixture(t,{sourceConfiguration:config}),pairing=await persistentPair(f);f.state.disconnectDelay=500;
 for(let i=0;i<200&&f.state.connects<2;i++)await new Promise(r=>setTimeout(r,10));assert.equal(f.state.connects,2);for(let i=0;i<120&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal((await f.owner.status()).connectedCount,1);assert.equal((await f.read(pairing)).body.result.structuredContent.available,true);
});

for(const restriction of ['pause','revoke','permission','restore'])test('held listener-close ACK cannot revive a replacement after '+restriction,async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);let release,entered;const waiting=new Promise(r=>entered=r);f.state.messageHook=(m,port)=>{if(m.type!=='revoked')return;release=()=>port.onMessage.emit(m);entered();return false;};
 const reconnect=f.owner.change({id:pairing.id,action:'reconnect',expectedRevision:pairing.revision,authorizationPolicyId:persistentConfiguration.authorizationPolicy.id});reconnect.catch(()=>{});await waiting;let change=null;
 if(restriction==='pause'||restriction==='revoke'){change=f.owner.change({id:pairing.id,action:restriction,expectedRevision:pairing.revision});change.catch(()=>{});}else if(restriction==='permission'){f.state.permitted=false;f.api.permissions.onRemoved.emit({permissions:['nativeMessaging']});}else await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));
 release();await assert.rejects(reconnect);if(change)await change;assert.equal(f.state.connects,1);assert.equal((await f.owner.status()).connectedCount,0);await assert.rejects(f.read(pairing));
});
test('foreign old and duplicate listener-close ACKs cannot authorize another native generation',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);let held,oldPort,entered;const waiting=new Promise(r=>entered=r);f.state.messageHook=(m,p)=>{if(m.type!=='revoked')return;held=m;oldPort=p;entered();return false;};
 const reconnect=f.owner.change({id:pairing.id,action:'reconnect',expectedRevision:pairing.revision,authorizationPolicyId:persistentConfiguration.authorizationPolicy.id});await waiting;for(const changed of [{...held,hostNonce:op()},{...held,generation:held.generation-1},{...held,handover:'old-immediate-ack'}]){oldPort.onMessage.emit(changed);await new Promise(r=>setTimeout(r,5));assert.equal(f.state.connects,1);}
 oldPort.onMessage.emit(held);const fresh=await reconnect;for(let i=0;i<100&&(await f.owner.status()).connectedCount!==1;i++)await new Promise(r=>setTimeout(r,5));assert.equal(f.state.connects,2);oldPort.onMessage.emit(held);await new Promise(r=>setTimeout(r,20));assert.equal(f.state.connects,2);assert.equal((await f.owner.status()).connectedCount,1);assert.equal((await f.read({...pairing,...fresh})).status,200);
});
test('missing close ACK times out without creating a second process or claiming successful reconnect',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);f.state.messageHook=m=>m.type!=='revoked';await assert.rejects(f.owner.change({id:pairing.id,action:'reconnect',expectedRevision:pairing.revision,authorizationPolicyId:persistentConfiguration.authorizationPolicy.id}),{code:'CONTEXT_INVALIDATED'});assert.equal(f.state.connects,1);assert.equal((await f.owner.status()).connectedCount,0);await assert.rejects(f.read(pairing));
});
test('a source host without the listener-close capability cannot activate a persistent grant',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration});f.state.messageHook=(m,p)=>{if(m.type!=='hello')return;const old={...m};delete old.handover;p.onMessage.emit(old);return false;};await persistentPair(f);assert.equal((await f.owner.status()).connectedCount,0);assert.equal(f.state.connects,1);
});

test('actual old host exit without its close ACK cannot start a replacement',async t=>{
 const f=await fixture(t,{sourceConfiguration:persistentConfiguration}),pairing=await persistentPair(f);f.state.postHook=m=>{if(m.type!=='revoke')return;f.ports[0].disconnect();return false;};await assert.rejects(f.owner.change({id:pairing.id,action:'reconnect',expectedRevision:pairing.revision,authorizationPolicyId:persistentConfiguration.authorizationPolicy.id}),{code:'CONTEXT_INVALIDATED'});assert.equal(f.state.connects,1);assert.equal((await f.owner.status()).connectedCount,0);
});
