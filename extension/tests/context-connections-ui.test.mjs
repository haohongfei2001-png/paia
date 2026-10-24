import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {ContextConnectionsView} from '../ui/context-connections-view.js';
class Node extends PresentationNode{
 querySelectorAll(selector){const all=this.children.flatMap(n=>[n,...(n.querySelectorAll?.('*')||[])]);return selector==='*'?all:all.filter(n=>selector.split(',').some(s=>s.startsWith('.')?n.classList.contains(s.slice(1)):n.tagName.toLowerCase()===s.toLowerCase()));}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const base={available:true,reason:'ready',revision:2,connections:[],connectedCount:0,externalAllowed:false};
const connection={id:'synthetic-connection',state:'connected',target:'chatgpt',principalMode:'paired-local-profile'};
const tick=()=>new Promise(r=>setImmediate(r));
async function fixture(t,status=base){
 const previous=new Map(['document','chrome','navigator'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));let response=null;const calls=[],copies=[],permissions=[];
 globalThis.document={documentElement:{lang:'en'},createElement:tag=>new Node(tag)};globalThis.chrome={permissions:{request:async request=>{permissions.push(request);return true;}},runtime:{sendMessage:async request=>{calls.push(request);if(typeof response==='function')return response(request);return {ok:true,data:response??status};}}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async value=>copies.push(value)}}});
 const host=new Node('section'),view=new ContextConnectionsView({host,status:structuredClone(status)});t.after(()=>{view.close();for(const [key,value]of previous)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];});return {host,view,calls,copies,permissions,setResponse:value=>response=value,click:async label=>{const node=host.querySelectorAll('button').find(n=>n.textContent===label);assert.ok(node,label);await node.listeners.get('click')();await tick();}};
}
test('unqualified connection detail is honest and has no pairing/permission/remote side effect',async t=>{
 const f=await fixture(t,{...base,available:false,reason:'qualification_required'});assert.match(f.host.textContent,/External connections are unavailable/);assert.equal(f.host.querySelectorAll('input').length,0);assert.deepEqual(f.calls,[]);assert.deepEqual(f.permissions,[]);await f.view.pair();assert.deepEqual(f.calls,[]);
});
test('qualified pairing still requires explicit acknowledgement before native permission',async t=>{
 const f=await fixture(t);await f.view.pair();assert.deepEqual(f.permissions,[]);assert.match(f.host.textContent,/leaves this device and passes through OpenAI/);f.view.ack.checked=true;f.view.port.value='49215';f.setResponse({credential:'SYNTHETIC connection credential'});await f.view.pair();assert.deepEqual(f.permissions,[{permissions:['nativeMessaging']}]);assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0],{type:'PAIA_CONTEXT_CONNECTIONS_PAIR',options:{expectedRevision:2,port:49215}});assert.equal(f.view.secretInput.type,'password');assert.deepEqual(f.copies,[]);
});
test('invalid port or denied native permission does not dispatch a pairing operation',async t=>{
 const f=await fixture(t);f.view.ack.checked=true;f.view.port.value='0';await f.view.pair();assert.deepEqual(f.permissions,[]);assert.deepEqual(f.calls,[]);f.view.port.value='49215';chrome.permissions.request=async()=>false;await f.view.pair();assert.deepEqual(f.calls,[]);
});
test('restore repair requires its explicit new-library acknowledgement and exact repair route',async t=>{
 const f=await fixture(t,{...base,reason:'store_changed',connections:[{...connection,state:'reconnect_required'}]});assert.match(f.host.textContent,/Old connections are invalid/);assert.match(f.host.textContent,/replaces their bindings/);assert.equal(f.host.querySelectorAll('button').some(n=>n.textContent==='Pair again'),false);f.view.ack.checked=true;f.setResponse({credential:'SYNTHETIC repair credential'});await f.view.pair();assert.equal(f.calls[0].type,'PAIA_CONTEXT_CONNECTIONS_REPAIR');
});
test('credential copies only after its explicit button and clears on close without persistence',async t=>{
 const f=await fixture(t);f.view.showCredential('SYNTHETIC one-time credential');assert.deepEqual(f.copies,[]);const field=f.view.secretInput;await f.click('Copy credential');assert.deepEqual(f.copies,['SYNTHETIC one-time credential']);assert.deepEqual(f.calls,[]);f.view.close();assert.equal(field.value,'');assert.equal(f.view.secret,null);assert.equal(f.host.children.length,0);
});
test('credential expires from the original UI timer even without another user action',async t=>{
 const f=await fixture(t),original=globalThis.setTimeout;let callback;globalThis.setTimeout=(fn,delay)=>{assert.equal(delay,60000);callback=fn;return {synthetic:true};};try{f.view.showCredential('SYNTHETIC expires');}finally{globalThis.setTimeout=original;}const field=f.view.secretInput;callback();await tick();assert.equal(field.value,'');assert.equal(f.view.secret,null);assert.equal(f.calls[0].type,'PAIA_CONTEXT_CONNECTIONS_STATUS');
});
test('connected status names the local principal and pause/revoke do not silently enable other scope',async t=>{
 const f=await fixture(t,{...base,connections:[connection]});assert.match(f.host.textContent,/not a verified ChatGPT account/);await f.click('Pause');assert.deepEqual(f.calls[0],{type:'PAIA_CONTEXT_CONNECTIONS_CHANGE',options:{id:connection.id,action:'pause',expectedRevision:2}});assert.deepEqual(f.permissions,[]);assert.equal(f.calls.some(c=>c.type==='PAIA_CONTEXT_CARDS_CHANGE'),false);
});
test('closed detail discards a late credential response and cannot copy it',async t=>{
 const f=await fixture(t);let resolve;const promise=new Promise(r=>resolve=r);chrome.runtime.sendMessage=()=>promise;f.view.ack.checked=true;const work=f.view.pair();await tick();f.view.close();resolve({ok:true,data:{credential:'SYNTHETIC late secret'}});await work;assert.equal(f.view.secret,null);assert.equal(f.host.children.length,0);assert.deepEqual(f.copies,[]);
});


test('language change localizes a visible credential without renewing its hide deadline or copying it',async t=>{
 const f=await fixture(t);f.view.showCredential('SYNTHETIC fixed deadline');const timer=f.view.secretTimer,field=f.view.secretInput;document.documentElement.lang='zh-CN';f.view.localize();assert.equal(f.view.secretTimer,timer);assert.equal(f.view.secretInput,field);assert.match(f.host.textContent,/保存这次连接凭证/);assert.deepEqual(f.copies,[]);assert.equal(field.value,'SYNTHETIC fixed deadline');
});

test('persistent policy is disclosed before acknowledgement and its exact identity is sent only for authorization',async t=>{
 const status={...base,authorizationPolicy:{id:'qualified-policy',authorizationLifetimeMs:86400000}},f=await fixture(t,status);assert.match(f.host.textContent,/lasts up to 1 day/);assert.match(f.host.textContent,/unconfirmed shutdown states do not resume automatically/);await f.view.pair();assert.equal(f.calls.length,0);f.view.ack.checked=true;f.setResponse({credential:'SYNTHETIC persistent',persistent:true,authorizationExpiresAt:Date.now()+86400000});await f.view.pair();assert.equal(f.calls[0].options.authorizationPolicyId,'qualified-policy');assert.match(f.host.textContent,/authorization is valid until/);assert.equal(f.host.textContent.includes('expires in one hour'),false);assert.deepEqual(f.copies,[]);
});
test('unknown persistent state offers explicit reauthorization rather than silently resuming or hiding recovery',async t=>{
 const status={...base,reason:'reconnect_required',authorizationPolicy:{id:'qualified-policy',authorizationLifetimeMs:86400000},connections:[{...connection,state:'reconnect_required'}]},f=await fixture(t,status);assert.match(f.host.textContent,/not durably confirmed/);await f.click('Authorize and pair again');assert.equal(f.calls[0].options.authorizationPolicyId,'qualified-policy');assert.equal(f.calls[0].options.action,'reconnect');assert.deepEqual(f.permissions,[]);
});
test('a persistent connection restriction does not transmit policy as renewed authorization',async t=>{
 const f=await fixture(t,{...base,authorizationPolicy:{id:'qualified-policy',authorizationLifetimeMs:86400000},connections:[connection]});await f.click('Pause');assert.equal(Object.hasOwn(f.calls[0].options,'authorizationPolicyId'),false);
});

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const legacyStatus=(revision=2,state='disconnected')=>({...base,available:false,reason:'qualification_required',revision,connections:[{...connection,state}]});
const statusReply=status=>({ok:true,data:status});
const unavailableReply={ok:false,error:'UNAVAILABLE'};

test('a held status cannot undo the original legacy revoke or regress the next exact revision',async t=>{
 const second={...connection,id:'synthetic-second-connection',state:'disconnected'},old={...legacyStatus(),connections:[{...connection,state:'disconnected'},second]},revoked={...old,revision:3,connections:[{...connection,state:'revoked'},second]},f=await fixture(t,old),read=deferred(),change=deferred();let reads=0,changes=0;
 f.setResponse(message=>message.type==='PAIA_CONTEXT_CONNECTIONS_STATUS'?(++reads===1?read.promise:statusReply(revoked)):(++changes===1?change.promise:statusReply({revision:4})));
 const pending=f.view.refresh();await f.click('Revoke connection');await f.view.change(old.connections[0],'revoke');
 assert.equal(f.view.busy,true);assert.equal(changes,1);assert.equal(reads,1);change.resolve(statusReply({revision:3}));await tick();
 assert.equal(f.view.status.revision,3);assert.match(f.host.textContent,/Revoked/);assert.equal(f.host.querySelectorAll('button').filter(n=>n.textContent==='Revoke connection').length,1);
 read.resolve(statusReply(old));await pending;assert.equal(f.view.status.revision,3);assert.match(f.host.textContent,/Revoked/);
 await f.click('Revoke connection');assert.deepEqual(f.calls.filter(c=>c.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE'),[
  {type:'PAIA_CONTEXT_CONNECTIONS_CHANGE',options:{id:connection.id,action:'revoke',expectedRevision:2}},
  {type:'PAIA_CONTEXT_CONNECTIONS_CHANGE',options:{id:second.id,action:'revoke',expectedRevision:3}}
 ]);assert.deepEqual(f.permissions,[]);assert.deepEqual(f.copies,[]);assert.equal(f.calls.some(c=>/PAIR|REPAIR|CARDS_CHANGE/.test(c.type)),false);
});

for(const failure of [false,true]){
 test(`older status ${failure?'failure':'success'} cannot overwrite a newer parent update`,async t=>{
  const old=legacyStatus(),current=legacyStatus(3,'revoked'),f=await fixture(t,old),read=deferred();f.setResponse(()=>read.promise);
  const pending=f.view.refresh();f.view.update(current);const rendered=f.host.textContent,feedback=f.view.feedback;f.view.notice('Current status confirmed.');
  read.resolve(failure?unavailableReply:statusReply(old));await pending;
  assert.equal(f.view.status,current);assert.equal(f.view.feedback,feedback);assert.equal(f.view.feedback.textContent,'Current status confirmed.');assert.equal(f.host.textContent,rendered+'Current status confirmed.');assert.deepEqual(f.permissions,[]);assert.equal(f.calls.length,1);
 });
 test(`older status ${failure?'failure':'success'} cannot overwrite a later refresh`,async t=>{
  const old=legacyStatus(),current=legacyStatus(3,'revoked'),f=await fixture(t,old),read=deferred();let reads=0;f.setResponse(()=>++reads===1?read.promise:statusReply(current));
  const pending=f.view.refresh();await f.view.refresh();const feedback=f.view.feedback;f.view.notice('Latest refresh confirmed.');
  read.resolve(failure?unavailableReply:statusReply(old));await pending;
  assert.equal(f.view.status,current);assert.equal(f.view.feedback,feedback);assert.equal(feedback.textContent,'Latest refresh confirmed.');assert.match(f.host.textContent,/Revoked/);assert.equal(f.calls.length,2);assert.deepEqual(f.permissions,[]);
 });
 test(`starting the original revoke invalidates an older status ${failure?'failure':'success'} before settlement`,async t=>{
  const old=legacyStatus(),current=legacyStatus(3,'revoked'),f=await fixture(t,old),read=deferred(),change=deferred();let reads=0;f.setResponse(message=>message.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE'?change.promise:++reads===1?read.promise:statusReply(current));
  const pending=f.view.refresh();await f.click('Revoke connection');const feedback=f.view.feedback;f.view.notice('Checking the requested change.');read.resolve(failure?unavailableReply:statusReply({...old,revision:1}));await pending;
  assert.equal(f.view.status.revision,2);assert.equal(f.view.feedback,feedback);assert.equal(feedback.textContent,'Checking the requested change.');assert.equal(f.view.busy,true);assert.ok(f.host.querySelectorAll('button').every(n=>n.disabled));
  change.resolve(statusReply({revision:3}));await tick();assert.equal(f.view.status,current);assert.equal(f.view.busy,false);assert.equal(f.calls.filter(c=>c.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE').length,1);assert.equal(reads,2);assert.deepEqual(f.permissions,[]);
 });
 test(`closed detail ignores late status ${failure?'failure':'success'} and starts no new read`,async t=>{
  const old=legacyStatus(),f=await fixture(t,old),read=deferred();f.setResponse(()=>read.promise);const pending=f.view.refresh(),status=f.view.status,feedback=f.view.feedback;
  f.view.notice('Existing feedback.');f.view.close();const replacement=new ContextConnectionsView({host:f.host,status:legacyStatus(3,'revoked')});const rendered=f.host.textContent;
  read.resolve(failure?unavailableReply:statusReply({...old,revision:1}));await pending;await f.view.refresh();f.view.update(old);await f.view.change(connection,'revoke');
  assert.equal(f.view.status,status);assert.equal(feedback.textContent,'Existing feedback.');assert.equal(f.host.textContent,rendered);assert.equal(f.calls.length,1);assert.deepEqual(f.permissions,[]);replacement.close();
 });
}

test('current refresh and mutation failures remain truthful without inventing a durable revocation',async t=>{
 const old=legacyStatus(),current=legacyStatus(3,'revoked'),f=await fixture(t,old);f.setResponse(()=>Promise.resolve(unavailableReply));await f.view.refresh();assert.match(f.view.feedback.textContent,/Could not read connection status/);assert.equal(f.view.status.revision,2);
 await f.click('Revoke connection');assert.match(f.view.feedback.textContent,/not durably confirmed/);assert.match(f.view.feedback.textContent,/does not confirm a pause or revocation/);assert.equal(f.view.status.revision,2);assert.equal(f.view.status.connections[0].state,'disconnected');assert.equal(f.view.busy,false);assert.equal(f.calls.filter(c=>c.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE').length,1);
 f.setResponse(current);await f.view.refresh();assert.equal(f.view.status,current);assert.match(f.host.textContent,/Revoked/);assert.deepEqual(f.permissions,[]);
});


test('a newer parent status invalidates old reads even when its registry revision is unchanged',async t=>{
 const old=legacyStatus(),current={...old,reason:'store_changed',connections:[{...connection,state:'reconnect_required'}]},f=await fixture(t,old),read=deferred();f.setResponse(()=>read.promise);const pending=f.view.refresh();f.view.update(current);read.resolve(statusReply(old));await pending;
 assert.equal(f.view.status,current);assert.match(f.host.textContent,/Old connections are invalid/);assert.equal(f.calls.length,1);assert.deepEqual(f.permissions,[]);
});


for(const failure of [false,true])test(`newer parent update defeats obsolete action ${failure?'failure':'credential success'}`,async t=>{
 const f=await fixture(t,{...base,connections:[connection]}),change=deferred();f.setResponse(()=>change.promise);const pending=f.view.change(connection,'reconnect');assert.equal(f.calls.length,1);
 const current=legacyStatus(4,'revoked');f.view.update(current);f.view.notice('Latest restriction confirmed.');change.resolve(failure?{ok:false,error:'STALE_BASE'}:statusReply({id:connection.id,revision:3,credential:'SYNTHETIC obsolete credential'}));await pending;
 assert.equal(f.view.status,current);assert.equal(f.view.secret,null);assert.equal(f.view.feedback.textContent,'Latest restriction confirmed.');assert.match(f.host.textContent,/Revoked/);assert.equal(f.view.busy,false);assert.equal(f.calls.length,1);assert.deepEqual(f.permissions,[]);assert.deepEqual(f.copies,[]);
});

for(const interruption of ['revision','route','close'])test(`pairing permission settlement cannot retarget after ${interruption}`,async t=>{
 const status={...base,authorizationPolicy:{id:'original-policy',authorizationLifetimeMs:86400000}},f=await fixture(t,status),permission=deferred();chrome.permissions.request=request=>{f.permissions.push(request);return permission.promise;};f.view.ack.checked=true;
 const pending=f.view.pair();await f.view.pair();assert.equal(f.permissions.length,1);assert.equal(f.calls.length,0);
 if(interruption==='close')f.view.close();else f.view.update({...status,revision:interruption==='revision'?3:2,reason:interruption==='route'?'store_changed':'ready',authorizationPolicy:{id:'changed-policy',authorizationLifetimeMs:86400000}});
 permission.resolve(true);await pending;assert.deepEqual(f.calls,[]);assert.deepEqual(f.permissions,[{permissions:['nativeMessaging']}]);assert.equal(f.view.secret,null);assert.equal(f.view.busy,false);if(interruption==='close')assert.equal(f.host.children.length,0);
});

test('closed acknowledged pairing starts no permission prompt or mutation',async t=>{
 const f=await fixture(t);f.view.ack.checked=true;f.view.close();await f.view.pair();assert.deepEqual(f.permissions,[]);assert.deepEqual(f.calls,[]);
});

test('normal deferred pairing keeps its original exact route, revision, port and policy once',async t=>{
 const f=await fixture(t,{...base,reason:'store_changed',authorizationPolicy:{id:'original-policy',authorizationLifetimeMs:86400000}}),permission=deferred();chrome.permissions.request=request=>{f.permissions.push(request);return permission.promise;};f.view.ack.checked=true;f.view.port.value='49216';f.setResponse({credential:'SYNTHETIC original pairing'});
 const pending=f.view.pair();await f.view.pair();assert.equal(f.calls.length,0);permission.resolve(true);await pending;
 assert.deepEqual(f.calls,[{type:'PAIA_CONTEXT_CONNECTIONS_REPAIR',options:{expectedRevision:2,port:49216,authorizationPolicyId:'original-policy'}}]);assert.deepEqual(f.permissions,[{permissions:['nativeMessaging']}]);assert.equal(f.view.secret,'SYNTHETIC original pairing');assert.deepEqual(f.copies,[]);
});

test('a newer status read does not cancel an in-flight current action or duplicate its mutation',async t=>{
 const f=await fixture(t,legacyStatus()),change=deferred();let reads=0;f.setResponse(message=>message.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE'?change.promise:statusReply(++reads===1?legacyStatus():legacyStatus(3,'revoked')));
 const pending=f.view.change(connection,'revoke');await f.view.refresh();await f.view.change(connection,'revoke');change.resolve(statusReply({revision:3}));await pending;
 assert.equal(f.view.status.revision,3);assert.equal(f.view.status.connections[0].state,'revoked');assert.equal(reads,2);assert.equal(f.calls.filter(c=>c.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE').length,1);assert.equal(f.view.busy,false);assert.deepEqual(f.permissions,[]);
});


for(const observedRevision of [2,3])for(const state of ['connected','disconnected'])test(`same-action notification at revision ${observedRevision} and ${state} keeps its genuine credential`,async t=>{
 const initial={...base,connections:[connection]},f=await fixture(t,initial),change=deferred();f.setResponse(()=>change.promise);const pending=f.view.change(connection,'reconnect');f.view.update({...initial,revision:observedRevision,connections:[{...connection,state}]});
 change.resolve(statusReply({id:connection.id,revision:3,state:'enabled',credential:'SYNTHETIC current credential'}));await pending;
 assert.equal(f.view.secret,'SYNTHETIC current credential');assert.equal(f.view.secretInput.value,'SYNTHETIC current credential');assert.equal(f.calls.length,1);assert.equal(f.view.busy,false);assert.deepEqual(f.copies,[]);
});

test('same-revision notification retains a current unconfirmed action error',async t=>{
 const initial=legacyStatus(),f=await fixture(t,initial),change=deferred();f.setResponse(()=>change.promise);const pending=f.view.change(connection,'revoke');f.view.update({...initial});change.resolve(unavailableReply);await pending;
 assert.match(f.view.feedback.textContent,/not durably confirmed/);assert.equal(f.view.status.revision,2);assert.equal(f.calls.length,1);assert.equal(f.view.busy,false);
});

test('parent notification before noncredential completion retains original durable readback',async t=>{
 const initial=legacyStatus(),f=await fixture(t,initial),change=deferred(),current=legacyStatus(3,'revoked');f.setResponse(message=>message.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE'?change.promise:statusReply(current));const pending=f.view.change(connection,'revoke');f.view.update({...initial});change.resolve(statusReply({id:connection.id,revision:3,state:'revoked'}));await pending;
 assert.equal(f.view.status,current);assert.match(f.host.textContent,/Revoked/);assert.equal(f.calls.length,2);assert.equal(f.calls.filter(c=>c.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE').length,1);
});


for(const via of ['update','refresh'])for(const restriction of ['revoked','paused','expired','restored','unknown'])test(`${via} restriction ${restriction} cannot be covered by an obsolete credential`,async t=>{
 const initial={...base,connections:[connection]},current={...initial,revision:restriction==='revoked'?4:3,connections:[{...connection,state:restriction}]};if(restriction==='restored'){current.reason='store_changed';current.connections[0].state='reconnect_required';}if(restriction==='unknown'){current.available=false;current.reason='unavailable';current.revision=null;current.connections=[];}
 const f=await fixture(t,initial),change=deferred();f.setResponse(message=>message.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE'?change.promise:statusReply(current));const pending=f.view.change(connection,'reconnect');if(via==='update')f.view.update(current);else await f.view.refresh();
 change.resolve(statusReply({id:connection.id,revision:3,state:'enabled',credential:'SYNTHETIC superseded credential'}));await pending;assert.equal(f.view.status,current);assert.equal(f.view.secret,null);assert.equal(f.calls.filter(c=>c.type==='PAIA_CONTEXT_CONNECTIONS_CHANGE').length,1);assert.equal(f.calls.length,via==='update'?1:2);assert.deepEqual(f.copies,[]);assert.deepEqual(f.permissions,[]);
});

test('a newer explicit read invalidates pending permission without dispatching its captured mutation',async t=>{
 const f=await fixture(t),permission=deferred();chrome.permissions.request=request=>{f.permissions.push(request);return permission.promise;};f.view.ack.checked=true;const pending=f.view.pair();f.setResponse({...base,revision:3,reason:'store_changed'});await f.view.refresh();permission.resolve(true);await pending;
 assert.deepEqual(f.calls,[{type:'PAIA_CONTEXT_CONNECTIONS_STATUS'}]);assert.deepEqual(f.permissions,[{permissions:['nativeMessaging']}]);assert.equal(f.view.status.revision,3);assert.equal(f.view.secret,null);
});

test('older successful read cannot clear a later current refresh failure or install an old revision',async t=>{
 const f=await fixture(t,legacyStatus()),read=deferred();let reads=0;f.setResponse(()=>++reads===1?read.promise:unavailableReply);const pending=f.view.refresh();await f.view.refresh();const feedback=f.view.feedback;read.resolve(statusReply(legacyStatus(1)));await pending;
 assert.equal(f.view.status.revision,2);assert.equal(f.view.feedback,feedback);assert.match(feedback.textContent,/Could not read connection status/);assert.equal(f.calls.length,2);
});
