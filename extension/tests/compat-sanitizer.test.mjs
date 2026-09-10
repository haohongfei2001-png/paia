import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const c=vm.createContext({Date,URL});vm.runInContext(await readFile(new URL('../development/compat/sanitizer.js',import.meta.url),'utf8'),c);const S=c.PAIACompat;
const chat='private-conversation-12345678',user='private-message-12345678',assistant='private-assistant-12345678';
function source(){return {conversation_id:chat,title:'PRIVATE TITLE 中文',mapping:{[user]:{message:{id:user,author:{role:'user',name:'PRIVATE ACCOUNT'},create_time:1710000000.125,update_time:1710000010.125,content:{content_type:'text',parts:['PRIVATE USER 中文 alice@example.com https://private.invalid abc-token']}}},[assistant]:{message:{id:assistant,author:{role:'assistant'},create_time:1710000003.125,update_time:null,content:{content_type:'text',parts:['PRIVATE ASSISTANT']}}}}};}
const dom={tag:'main',attrs:{},children:[{tag:'div',attrs:{'data-message-author-role':'user','data-message-id':user},children:[{tag:'div',attrs:{class:'whitespace-pre-wrap'},children:[{text:true}]}]}]};
test('preserve structure, identity equality, types and time gaps without any private values',()=>{
 const sample=S.sanitize(source(),chat,{endpointClass:'conversation_load_candidate',contentType:'application/json'});const bundle=S.bundle(sample,dom,[user],'constructed-test');assert.equal(S.scan(bundle),true);
 const text=JSON.stringify(bundle);for(const value of [chat,user,assistant,'PRIVATE','中文','alice@','https://','1710000000'])assert.equal(text.includes(value),false);
 const r=bundle.files['response.json'].body;const m=Object.values(r.mapping).map(x=>x.message);assert.equal(m[1].create_time-m[0].create_time,3);assert.equal(m[0].update_time-m[0].create_time,10);assert.equal(m[1].update_time,null);assert.equal(Object.keys(r.mapping)[0],m[0].id);
 assert.equal(bundle.files['identity-map.json'].messages[0].id,m[0].id);assert.equal(bundle.files['expected-time.json'].messages[0].timeConfidence,'high');
});
test('array nesting and missing/create_time types preserved',()=>{
 const v={conversation_id:chat,data:{messages:[source().mapping[user].message,{id:assistant,author:{role:'assistant'},content:{parts:['secret']}}]}};v.data.messages[0].create_time='not a time';
 const s=S.sanitize(v,chat,{endpointClass:'other',contentType:'application/json'});assert.ok(Array.isArray(s.body.data.messages));assert.equal(typeof s.body.data.messages[0].create_time,'string');assert.equal('create_time' in s.body.data.messages[1],false);
});
test('unknown/private keys, credentials, oversized trees and ambiguous identity refuse export',()=>{
 for(const mutate of [v=>v['Private diary 中文']='x',v=>v.unreviewed_private_name='x',v=>v.authorization='secret',v=>v.mapping.extra={message:{...v.mapping[user].message}}]){const v=source();mutate(v);assert.throws(()=>S.sanitize(v,chat,{endpointClass:'other',contentType:'application/json'}));}
});
test('independent privacy scan rejects natural text, URLs, email, real IDs and original timestamps',()=>{
 const b=S.bundle(S.sanitize(source(),chat,{endpointClass:'other',contentType:'application/json'}),dom,[user],'constructed-test');
 for(const unsafe of ['English private sentence','私人内容','https://example.com','person@example.com','bb333333-4444-5555-6666-777777777777',1710000000]){const copy=JSON.parse(JSON.stringify(b));copy.files['response.json'].body.title=unsafe;assert.equal(S.scan(copy),false);}
 const copy=JSON.parse(JSON.stringify(b));copy.files['response.json'].body['private account']=0;assert.equal(S.scan(copy),false);
});
test('privacy scanner is contextual: even public schema words cannot masquerade as private body text',()=>{
 const b=S.bundle(S.sanitize(source(),chat,{endpointClass:'other',contentType:'application/json'}),dom,[user],'constructed-test');
 for(const text of ['message','assistant','text','user']){const copy=JSON.parse(JSON.stringify(b));Object.values(copy.files['response.json'].body.mapping)[0].message.content.parts=[text];assert.equal(S.scan(copy),false);}
});
test('multiple source types and unmatched canonical identity remain explicit',()=>{
 const v=source();v.mapping[user].message.create_time='2024-03-09T16:00:00.000Z';const s=S.sanitize(v,chat,{endpointClass:'other',contentType:'application/json'});const b=S.bundle(s,dom,[user,'unmatched-message-12345'],'constructed-test');
 assert.equal(typeof Object.values(b.files['response.json'].body.mapping)[0].message.create_time,'string');assert.equal(b.files['identity-map.json'].messages[1].responseMatched,false);assert.equal(b.files['expected-time.json'].messages[1].sourceSentAt,null);
});
test('malformed time containers preserve their original JSON types',()=>{
 for(const bad of [false,{value:'private'},['private',42],-100]){const v=source();v.mapping[user].message.create_time=bad;
  const s=S.sanitize(v,chat,{endpointClass:'other',contentType:'application/json'});const got=Object.values(s.body.mapping)[0].message.create_time;assert.equal(Array.isArray(got),Array.isArray(bad));assert.equal(typeof got,typeof bad);
 }
});

test('expected source arbitration accounts for canonical DOM evidence and refuses duplicate canonical identities',()=>{
 for(const [gap,confidence] of [[0,'very_high'],[0.5,'very_high'],[5,'conflict']]){
  const sample=S.sanitize(source(),chat,{endpointClass:'other',contentType:'application/json'});
  const b=S.bundle(sample,dom,[{id:user,domTime:new Date((1710000000.125+gap)*1000).toISOString()}],'constructed-test');
  assert.equal(b.files['expected-time.json'].messages[0].timeConfidence,confidence);
 }
 assert.throws(()=>S.bundle(S.sanitize(source(),chat,{endpointClass:'other',contentType:'application/json'}),dom,[user,user]));
});
test('public structured JSON media types are kept; unsupported types are refused',()=>{
 const s=S.sanitize(source(),chat,{endpointClass:'other',contentType:'application/problem+json'});assert.equal(s.info.contentType,'application/problem+json');
 assert.throws(()=>S.sanitize(source(),chat,{endpointClass:'other',contentType:'text/html'}));
});

test('bounds and structural fingerprint corruption fail closed',()=>{
 const v=source();v.data=Array.from({length:2001},()=>null);assert.throws(()=>S.sanitize(v,chat,{endpointClass:'other',contentType:'application/json'}));
 const b=S.bundle(S.sanitize(source(),chat,{endpointClass:'other',contentType:'application/json'}),dom,[user],'constructed-test');
 const bad=JSON.parse(JSON.stringify(b));bad.files['fingerprint.json'].entries.pop();assert.equal(S.scan(bad),false);
});
