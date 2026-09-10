import test from 'node:test';
import assert from 'node:assert/strict';
import '../adapter/history-contract.js';
import '../core/history-time.js';
import {structuralHistory} from './fixtures/structural-history.mjs';
const {parse}=globalThis.ChatGPTHistoryContract;
const {Model}=globalThis.HistoryTime;
const chat='fake-history-chat-001', a='fake-history-user-001', b='fake-history-user-002';
const now=1700000000000, stamp=1600000000;
const message=(id,time=stamp)=>({id,author:{role:'user'},create_time:time,update_time:time+1,content:{parts:['FAKE_PRIVATE_TEXT']}});
const fixture=()=>({conversation_id:chat,mapping:{
 one:{message:message(a)},two:{message:message(b,stamp+2)},
 ai:{message:{author:{role:'assistant'},content:{parts:['FAKE_ASSISTANT_TEXT']}}}
}});
function matched(data=fixture(),ids=[a,b]) {const m=new Model();m.reset(chat);m.ingest(parse(data),now);return {m,rows:m.match(ids,now)};}
test('contract: explicit history mapping projects user metadata only and supports a single user',()=>{
 const result=parse(fixture());assert.equal(result.contract,'chatgpt-history-user-v1');assert.equal(result.rows.length,2);
 assert.equal(JSON.stringify(result).includes('FAKE_PRIVATE_TEXT'),false);assert.equal(JSON.stringify(result).includes('FAKE_ASSISTANT_TEXT'),false);
 assert.equal(parse({conversation_id:chat,messages:[message(a)]}).rows.length,1);
 assert.equal(matched().rows.get(a).state,'valid');
});
test('contract: bounded enclosing conversation identity, missing identity and schema change fail closed',()=>{
 assert.equal(parse({data:fixture()}).rows.length,2);
 for(const value of [null,[],{mapping:fixture().mapping},{conversation_id:chat,mapping:'changed'},{conversation_id:chat,items:[message(a)]},{data:fixture(),another:fixture()}])assert.equal(parse(value),null);
});
test('contract: assistant fields, body, drafts and credential values are never read',()=>{
 const f=fixture(),ai=f.mapping.ai.message;
 for(const key of ['id','create_time','update_time','content'])Object.defineProperty(ai,key,{enumerable:true,get(){throw Error('assistant field');}});
 for(const obj of [f,f.mapping.one.message])for(const key of ['content','authorization','draft'])Object.defineProperty(obj,key,{enumerable:true,get(){throw Error('forbidden field');}});
 assert.equal(parse(f).rows.length,2);
});
test('contract: exact conversation and message identity; metadata before DOM and DOM before metadata',()=>{
 const m=new Model();m.reset(chat);assert.equal(m.match([a],now).size,0);
 m.ingest(parse({...fixture(),conversation_id:'fake-another-chat'}),now);assert.equal(m.match([a],now).size,0);
 m.ingest(parse(fixture()),now);assert.equal(m.match(['fake-unknown-id'],now).size,0);assert.equal(m.match([a],now).get(a).state,'valid');
 m.reset('fake-another-chat');assert.equal(m.match([a],now).size,0);
});
test('contract: missing, invalid, milliseconds, future, update inversion and update future are blocked',()=>{
 for(const edit of [m=>delete m.create_time,m=>m.create_time=null,m=>m.create_time='SECRET',m=>m.create_time=now,m=>m.create_time=now/1000+1,m=>m.update_time=stamp-1,m=>m.update_time='SECRET',m=>m.update_time=now/1000+1]) {
  const f=fixture();edit(f.mapping.one.message);const {rows}=matched(f);assert.equal(rows.get(a).state,'blocked');assert.equal(JSON.stringify([...rows]).includes('SECRET'),false);
 }
 const f=fixture();delete f.mapping.one.message.update_time;assert.equal(matched(f).rows.get(a).state,'valid');
});
test('contract: duplicates are stable, conflicting time stays blocked, canonical inversions block matched set',()=>{
 const {m}=matched();m.ingest(parse(fixture()),now);assert.equal(m.match([a,b],now).get(a).state,'valid');
 assert.equal(m.match([b,a],now).get(a).state,'blocked');
 const n=matched().m,f=fixture();f.mapping.one.message.create_time+=0.001;n.ingest(parse(f),now);n.ingest(parse(fixture()),now);
 assert.equal(n.match([a,b],now).get(a).reason,'CONFLICT');
});
test('contract: equal times are valid; shape ambiguity, excessive collections and duplicate invalid IDs reject',()=>{
 const f=fixture();f.mapping.two.message.create_time=stamp;assert.equal(matched(f).rows.get(a).state,'valid');
 f.mapping.two.message.id='bad';assert.equal(parse(f),null);
 const big={conversation_id:chat,messages:Array.from({length:2001},()=>message(a))};assert.equal(parse(big),null);
});
test('contract: unknown standalone assistant-shaped envelopes never read scalar metadata',()=>{
 let reads=0;const m={author:{role:'assistant'}};
 for(const key of ['id','create_time','update_time','content'])Object.defineProperty(m,key,{enumerable:true,get(){reads++;return 'FAKE_SECRET';}});
 assert.equal(parse({conversation_id:chat,message:m}),null);assert.equal(reads,0);
});

test('contract: diagnostic-confirmed wrapped messages preserve exact identity in formal projection',async()=>{
 await import('../adapter/json-fingerprint.js');
 const f=fixture();f.messages=Object.values(f.mapping);delete f.mapping;
 assert.equal(globalThis.ChatGPTJSONFingerprint.inspect(f).detail.candidate,true);
 assert.equal(parse(f)?.rows.length,2);
});

test('structural contract: strict user times, IDs, roles, conversation and unique collection',()=>{
 const reject=edit=>{const {c,data}=structuralHistory();edit(data);assert.equal(globalThis.ChatGPTHistoryContract.parseStructural(data,c.id),null);};
 for(const edit of [d=>delete d.conversation_id,d=>d.conversation_id='fake-wrong-chat',d=>delete d.history_items.entry_54.create_time,d=>d.history_items.entry_54.create_time='1609459200',d=>d.history_items.entry_54.id='bad',d=>d.history_items.entry_54.update_time=1,d=>d.history_items.entry_54.author.role='mystery',d=>d.other=d.history_items,d=>d.history_items.extra={...d.history_items.entry_54},d=>d.history_items.entry_54.create_time=Date.now()])reject(edit);
});
test('structural contract: bounded discovery does not read body, credential or non-user scalar values',()=>{
 const {c,data}=structuralHistory();const ai=data.history_items.entry_0;
 for(const k of ['id','create_time','update_time','content'])Object.defineProperty(ai,k,{enumerable:true,get(){assert.fail('non-user scalar read');}});
 for(const obj of [data,data.history_items.entry_54])for(const k of ['content','authorization','draft'])Object.defineProperty(obj,k,{enumerable:true,get(){assert.fail('forbidden field');}});
 assert.equal(globalThis.ChatGPTHistoryContract.parseStructural(data,c.id).rows.length,5);
 for(const wrapped of [{a:{b:{c:{d:data}}}}, {...structuralHistory().data,extra:Object.fromEntries(Array.from({length:65},(_,i)=>['k'+i,{}]))}])assert.equal(globalThis.ChatGPTHistoryContract.parseStructural(wrapped,c.id),null);
});

test('structural contract: excluded collection entries cannot be silently omitted to accept partial history',()=>{
 const {c,data}=structuralHistory();Object.defineProperty(data.history_items,'content',{enumerable:true,get(){assert.fail('excluded entry read');}});
 assert.equal(globalThis.ChatGPTHistoryContract.parseStructural(data,c.id),null);
});
