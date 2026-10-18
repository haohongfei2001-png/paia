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
 globalThis.document={documentElement:{lang:'en'},createElement:tag=>new Node(tag)};globalThis.chrome={permissions:{request:async request=>{permissions.push(request);return true;}},runtime:{sendMessage:async request=>{calls.push(request);return {ok:true,data:response??status};}}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async value=>copies.push(value)}}});
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
