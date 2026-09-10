import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import '../adapter/json-fingerprint.js';
import '../core/json-fingerprint.js';
import {formatFingerprints} from '../ui/fingerprint-display.js';
const {inspect} = globalThis.ChatGPTJSONFingerprint;
const {Model, sanitize} = globalThis.JSONFingerprintProtocol;
const chat = 'synthetic-chat-001';
const ids = ['synthetic-message-001', 'synthetic-message-002'];
const time = 1700000000;
const fixture = () => ({conversation_id: chat, mapping: Object.fromEntries(ids.map((id, i) => [id, {parent:null,children:[],message:{id,author:{role:'user',metadata:{}},create_time:time+i,content:{parts:['SYNTHETIC_SECRET']}}}]))});
test('bounded fingerprints identify multi-message schema without exposing any raw values or using them for grouping', () => {
  const result = inspect(fixture());
  assert.equal(result.detail.candidate, true); assert.equal(result.detail.userRoleCount, 2);
  assert.equal(result.detail.parseableCount, 2); assert.equal(result.shape.fields.create_time, 2);
  assert.equal(result.shape.maxDepth, 4); assert.equal(result.shape.depthLimited, true);
  const m = new Model(); m.ingest(result); m.ingest(inspect(fixture()));
  const summary = m.summary(chat, ids, true); assert.equal(summary.groups[0].matched, 2); assert.equal(summary.groups[0].occurrence, 2);
  assert.equal(m.summary('another-chat-001', ids, true).groups[0].matched, 0);
  const text = JSON.stringify(summary)+formatFingerprints(summary);
  for (const secret of [chat,...ids,String(time),'SYNTHETIC_SECRET','https://']) assert.equal(text.includes(secret), false);
  const changed=fixture(); changed.conversation_id='different-chat-001'; for (const node of Object.values(changed.mapping)) node.message.create_time++;
  m.ingest(inspect(changed)); assert.equal(m.summary(chat, ids, true).groups.length,1); assert.equal(m.summary(chat, ids, true).groups[0].matched,0);
});
test('no candidate for isolated field names, deep structures, truncated collections or unrelated role/ID fields', () => {
  for (const root of [null,[],42,{message:'text',mapping:'text',role:'user',create_time:time},{a:{b:{c:{d:{e:fixture()}}}}}, {messages:[{id:'synthetic-id-001'},{author:{role:'user'}},{create_time:time}]}]) assert.equal(inspect(root).detail.candidate,false);
  const big=fixture(); for(let n=0;n<70;n++) big.mapping['synthetic-'+n]={message:{id:'synthetic-id-'+n,author:{role:'user'},create_time:time}};
  assert.equal(inspect(big).shape.truncated,true); assert.equal(inspect(big).detail.candidate,false);
});
test('body and assistant value getters are never touched; identity cannot be inferred from ID alone', () => {
  const data=fixture(); const assistant=Object.values(data.mapping)[0].message; assistant.author.role='assistant';
  for(const field of ['content','id','create_time']) Object.defineProperty(assistant,field,{enumerable:true,get(){throw Error('forbidden assistant value');}});
  const result=inspect(data); assert.equal(result.detail.candidate,true); assert.equal(result.detail.userRoleCount,1);
  const missing=fixture(); delete missing.conversation_id; missing.id=chat;
  const out=inspect(missing); assert.equal(out.detail.candidate,true); assert.equal(out.detail.identityPresent,false); assert.equal(out.matches.length,0);
});
test('whitelist projects nested groups, caps memory and prioritizes historical candidates over incidental shapes', () => {
  const m=new Model();
  for(let n=0;n<15;n++) m.ingest(inspect(Object.fromEntries(Array.from({length:n},(_,i)=>['field'+i,0]))));
  assert.equal(m.groups.size,12); assert.equal(m.dropped,3);
  m.ingest(inspect(fixture())); assert.equal(m.groups.size,12); assert.ok(m.summary(chat,ids,true).groups.some(g=>g.detail.candidate));
  const s=m.summary(chat,ids,true); s.groups[0].unsafe='secret'; assert.equal(JSON.stringify(sanitize(s)).includes('secret'),false);
  s.groups[0].shape.rootType='secret'; assert.equal(sanitize(s),null);
  m.clear(); assert.equal(m.groups.size,0);
});
const parser=await readFile(new URL('../adapter/response-parser.js',import.meta.url),'utf8');
const fp=await readFile(new URL('../adapter/json-fingerprint.js',import.meta.url),'utf8');
const observer=await readFile(new URL('../content/response-observer.js',import.meta.url),'utf8');
async function observed({allow=true,type='application/json',origin='https://chatgpt.com',ok=true,redirect=false,body=JSON.stringify(fixture()),declared=null,path='/backend-api/unknown-history?variant=synthetic'}={}) {
  const sent=[];const handlers=new Map();const response=new Response(body,{headers:{'content-type':type}});
  Object.defineProperties(response,{url:{value:origin+path},ok:{value:ok},redirected:{value:redirect}});
  if(declared) response.headers.set('content-length',declared);
  const promise=Promise.resolve(response);let calls=0;
  const window={fetch(){calls++;return promise;},addEventListener(k,f){handlers.set(k,f);},postMessage(v){sent.push(v);}};
  const c=vm.createContext({window,location:{pathname:'/c/'+chat},Response,URL,TextDecoder,setTimeout,clearTimeout});
  vm.runInContext(parser,c);vm.runInContext(fp,c);vm.runInContext(observer,c);
  handlers.get('message')({source:window,origin:'https://chatgpt.com',data:{channel:'archive-response-control-v1',active:true,chat,epoch:1,session:'test',fingerprint:allow}});
  assert.equal(window.fetch('synthetic-input'),promise);
  await new Promise(r=>setTimeout(r,35));
  assert.equal(await response.text(),body);assert.equal(calls,1);
  return sent;
}
test('other query URL JSON gets diagnostic-only analysis and never enters conversation acceptance', async () => {
  for(const type of ['application/json','Application/JSON','application/problem+json']) {
    const sent=await observed({type});assert.equal(sent.filter(v=>v.fingerprint).length,1);
    assert.equal(sent.some(v=>v.rows),false);assert.equal(sent.find(v=>v.trace).trace.outcome,'skipped');
  }
});
test('single-chat authorization, origin, HTTP, redirect, type and strict byte limit gate the diagnostic branch', async () => {
  for(const opts of [{allow:false},{origin:'https://example.invalid'},{ok:false},{redirect:true},{type:'text/plain'},{type:'text/event-stream'},{path:'/api/auth/session'},{body:'x'.repeat(524289)},{declared:'524289'},{body:'{'}]) {
    const sent=await observed(opts);assert.equal(sent.some(v=>v.fingerprint),false);assert.equal(sent.some(v=>v.rows),false);
  }
});


test('stale heartbeats never turn two known ordinary documents into a single-tab fingerprint lease', async () => {
  const {ResponseDiagnostics}=await import('../background/response-diagnostics.js');
  await import('../core/response-time.js');
  const base=new globalThis.ResponseTimeProtocol.Model();base.observe(chat,ids);
  const relay=new ResponseDiagnostics();
  const req={session:'s',summary:base.summary()};
  const a={tab:{id:1},documentId:'a'},b={tab:{id:2},documentId:'b'};
  assert.equal(relay.poll(req,a,true,0).fingerprintAllowed,true);
  assert.equal(relay.poll(req,b,true,1).fingerprintAllowed,false);
  assert.equal(relay.poll(req,a,true,5000).fingerprintAllowed,false);
  relay.removeTab(2);assert.equal(relay.poll(req,a,true,5001).fingerprintAllowed,true);
});


test('a direct message-shaped root array is identified without inventing conversation identity', () => {
  const root=Object.values(fixture().mapping).map(node=>node.message);
  const result=inspect(root);
  assert.equal(result.shape.rootType,'array');assert.equal(result.shape.messagesLike,true);
  assert.equal(result.shape.minCollectionSize,2);assert.equal(result.detail.candidate,true);
  assert.equal(result.detail.identityPresent,false);assert.equal(result.matches.length,0);
});


test('credential/header-like fields are excluded without reading their values', () => {
  const root=fixture();
  for(const key of ['accessToken','authorization','cookies','headers','password','session']) Object.defineProperty(root,key,{enumerable:true,get(){throw Error('sensitive field read');}});
  assert.equal(inspect(root).detail.candidate,true);
});
