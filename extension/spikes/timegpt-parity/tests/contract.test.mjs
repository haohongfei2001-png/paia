import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../contract.js',import.meta.url),'utf8');
const c=vm.createContext({URL});vm.runInContext(source,c);const C=c.ParityContract;
const chat='11111111-1111-4111-8111-111111111111';
const id=i=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12,'0')}`;
const now=Date.now(),time=1609459200;
const value=()=>({conversation_id:chat,mapping:{user:{message:{id:id(0),author:{role:'user'},create_time:time}},ai:{message:{author:{role:'assistant'}}}}});
for(const [name,url,ok] of [
 ['exact','https://chatgpt.com/backend-api/conversation/'+chat,true],['relative','/backend-api/conversation/'+chat,true],
 ['other','/backend-api/other/'+chat,false],['list','/backend-api/conversations',false],['send','/backend-api/conversation',false],
 ['prefix','https://evil.example/backend-api/conversation/'+chat,false],['query','/backend-api/conversation/'+chat+'?x=1',false],
 ['hash','/backend-api/conversation/'+chat+'#x',false],['suffix','/backend-api/conversation/'+chat+'/extra',false],['invalid','/backend-api/conversation/not-an-id',false]
])test('endpoint: '+name,()=>assert.equal(Boolean(C.endpoint(url)),ok));
test('contract uses exact endpoint identity; never accesses assistant details or any content',()=>{
 const v=value();Object.defineProperty(v.mapping.user.message,'content',{get(){throw Error('body read');}});
 for(const key of ['id','create_time','content'])Object.defineProperty(v.mapping.ai.message,key,{get(){throw Error('assistant read');}});
 assert.equal(C.parse(v,chat).length,1);delete v.conversation_id;assert.equal(C.parse(v,chat).length,1);
 v.id='22222222-2222-4222-8222-222222222222';assert.equal(C.parse(v,chat),null);
});
for(const bad of [undefined,null,'1609459200',NaN,Infinity,0,Date.now()/1000+99999])test('time rejected: '+String(bad),()=>{const v=value();v.mapping.user.message.create_time=bad;assert.equal(C.parse(v,chat).length,0);});
test('invalid roles, user IDs, duplicate IDs and mapping/row bounds fail closed',()=>{
 for(const mutate of [v=>v.mapping.user.message.id='bad',v=>v.mapping.user.message.author.role='unknown',v=>v.mapping.second=v.mapping.user,v=>v.mapping=Array(2)]){const v=value();mutate(v);assert.equal(C.parse(v,chat),null);}
 const v=value();v.mapping=Object.fromEntries(Array.from({length:4001},(_,i)=>[i,{}]));assert.equal(C.parse(v,chat),null);
 v.mapping=Object.fromEntries(Array.from({length:2001},(_,i)=>[i,{message:{id:id(i),author:{role:'user'},create_time:time}}]));assert.equal(C.parse(v,chat),null);
});
test('JSON depth/node limits ignore quoted punctuation but reject structural overrun',()=>{
 assert.equal(C.boundedJSON(JSON.stringify({body:'['.repeat(40)+'\\"'})),true);
 assert.equal(C.boundedJSON('['.repeat(21)+']'.repeat(21)),false);
 assert.equal(C.boundedJSON('['+Array(30002).fill('0').join(',')+']'),false);
});
test('buffer merges batches, isolates chats, detects conflicts, expires and caps conversations',()=>{
 const b=new C.Buffer();b.merge(chat,[{id:id(0),time}],now);b.merge(chat,[{id:id(1),time:time+1}],now);
 b.merge(chat,[{id:id(0),time}],now);assert.equal(b.snapshot(chat,now).length,2);
 b.merge(chat,[{id:id(0),time:time+2}],now);assert.equal(b.snapshot(chat,now)[0].time,null);
 b.merge(chat,[{id:id(0),time}],now);assert.equal(b.snapshot(chat,now)[0].time,null);
 assert.equal(b.snapshot(chat,now+C.TTL).length,0);
 for(let i=0;i<9;i++)b.merge(id(i),[{id:id(0),time}],now);
 assert.equal(b.chats.size,8);assert.equal(b.snapshot(id(0),now).length,0);assert.equal(b.snapshot(id(8),now).length,1);
 b.clear();assert.equal(b.chats.size,0);
});
test('buffer denies malformed rows and cumulative per-conversation overflow',()=>{
 const b=new C.Buffer();assert.equal(b.merge(chat,[{id:'bad',time}],now),false);
 b.merge(chat,Array.from({length:2000},(_,i)=>({id:id(i),time})),now);
 assert.equal(b.merge(chat,[{id:id(2000),time}],now),false);assert.equal(b.snapshot(chat,now).length,2000);
});
