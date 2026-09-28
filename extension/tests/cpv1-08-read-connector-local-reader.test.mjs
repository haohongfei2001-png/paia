import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {createReadConnectorBoundary} from '../core/read-connector-boundary.js';
import {createLocalReadConnectorReader} from '../core/read-connector-local-reader.js';

const request=ref=>({tool:'get_by_ref',args:{ref}});
const grant=()=>({grantId:'synthetic-read-grant',consumer:'supported-ai',
 profileId:'default',permission:'read_connector',purpose:'read_only_query',
 resourceScope:'profile',scopeRevision:1,allowedTools:['get_by_ref'],
 allowedKinds:['input'],expiresAt:100000,revokedAt:null});
async function fixture(texts=null){
 const text='EXACT_ORIGINAL 👩🏽‍💻\n'+'long source '.repeat(300);
 const f=await completeFixture({texts:texts??[text]});
 const memory=new MemoryService(f.s);await memory.ready();
 await memory.settings({includeUnorganizedInputs:true});
 const block=(await rows(f.s,'blocks'))[0].value;
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async()=>grant(),read:createLocalReadConnectorReader(memory)});
 return {...f,memory,block,boundary,text};
}

test('VS-08 detached trusted read returns exact current and bounded source material',async()=>{
 const f=await fixture(),input={kind:'input',id:f.block.id,revision:f.block.revision};
 const current=await f.boundary.handle('connection-1',request(input));
 assert.equal(current.data.body,f.text);
 assert.equal(current.data.role,'human');
 assert.deepEqual(current.data.ref,input);
 const source={kind:'source',id:f.block.id,
  sourceId:f.block.originalTextReference,revision:0,span:{start:0,end:14}};
 const original=await f.boundary.handle('connection-1',request(source));
 assert.equal(original.data.role,'source');
 assert.equal(original.data.body,f.text.slice(0,14));
 assert.equal(f.requests.length,0);
});

test('VS-08 detached reader refuses excluded, stale and unknown-profile material',async()=>{
 const f=await fixture(),ref={kind:'input',id:f.block.id,revision:f.block.revision};
 await assert.rejects(f.boundary.handle('connection-1',request({...ref,revision:ref.revision+1})),
  {code:'MEMORY_UNAVAILABLE'});
 await f.memory.exclude({inputId:f.block.id,excluded:true});
 await assert.rejects(f.boundary.handle('connection-1',request(ref)),
  {code:'MEMORY_UNAVAILABLE'});
 const reader=createLocalReadConnectorReader(f.memory);
 await assert.rejects(reader(request(ref),{grantId:'g',profileId:'absent',
  allowedKinds:['input']}),{code:'MEMORY_DENIED'});
 assert.equal(f.requests.length,0);
});


test('VS-08 get-by-ref requires current profile eligibility before any body release',async()=>{
 const f=await fixture(),ref={kind:'input',id:f.block.id,revision:f.block.revision};
 const allowed=await f.boundary.handle('connection-1',request(ref));
 assert.equal(allowed.data.body,f.text);
 await f.memory.settings({includeUnorganizedInputs:false});
 await assert.rejects(f.boundary.handle('connection-1',request(ref)),
  {code:'MEMORY_UNAVAILABLE'});
 const direct=createLocalReadConnectorReader(f.memory);
 await assert.rejects(direct(request({kind:'topic_note',id:'private-topic',revision:0}),
  {grantId:'g',profileId:'default',allowedKinds:['topic']}),
  {code:'MEMORY_DENIED'});
 assert.equal(f.requests.length,0);
});


test('VS-08 local profile list/query use bounded opaque pages and lexical results',async()=>{
 const f=await fixture(['alpha private example','beta private example',
  'gamma private example']);
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async()=>({...grant(),allowedTools:['list_material','query'],
   allowedKinds:['input']}),read:createLocalReadConnectorReader(f.memory)});
 const req=cursor=>({tool:'list_material',args:{kinds:['input'],limit:1,
  ...(cursor?{cursor}:{})}});
 const first=await boundary.handle('connection-list',req());
 assert.equal(first.data.items.length,1);
 assert.equal(first.data.complete,false);
 assert.match(first.data.nextCursor,/^[A-Za-z0-9_-]+$/);
 const second=await boundary.handle('connection-list',req(first.data.nextCursor));
 assert.equal(second.data.items.length,1);
 assert.equal(second.data.complete,false);
 await assert.rejects(boundary.handle('connection-list',req(first.data.nextCursor)),
  {code:'MEMORY_UNAVAILABLE'});
 const third=await boundary.handle('connection-list',req(second.data.nextCursor));
 assert.equal(third.data.items.length,1);
 assert.equal(third.data.complete,true);
 assert.equal(third.data.nextCursor,null);
 const ids=[...first.data.items,...second.data.items,...third.data.items]
  .map(x=>x.id);
 assert.equal(new Set(ids).size,3);
 const found=await boundary.handle('connection-query',
  {tool:'query',args:{text:'beta',kinds:['input'],limit:20}});
 assert.equal(found.data.items.length,1);
 assert.equal(found.data.items[0].ref.kind,'input');
 assert.match(found.data.items[0].snippet,/beta/);
 assert.equal(found.data.complete,true);
 assert.equal(f.requests.length,0);
});

test('VS-08 local page cursor loses authority after profile policy change',async()=>{
 const f=await fixture(['alpha private example','beta private example']);
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async()=>({...grant(),allowedTools:['list_material'],
   allowedKinds:['input']}),read:createLocalReadConnectorReader(f.memory)});
 const first=await boundary.handle('connection-list',
  {tool:'list_material',args:{kinds:['input'],limit:1}});
 assert.ok(first.data.nextCursor);
 await f.memory.settings({includeUnorganizedInputs:false});
 await assert.rejects(boundary.handle('connection-list',
  {tool:'list_material',args:{kinds:['input'],limit:1,
   cursor:first.data.nextCursor}}),{code:'MEMORY_UNAVAILABLE'});
 await assert.rejects(boundary.handle('connection-list',
  {tool:'list_material',args:{kinds:['topic'],limit:1}}),
  {code:'MEMORY_DENIED'});
 assert.equal(f.requests.length,0);
});


test('VS-08 Topic list uses current profile policy and invalidates revoked pages',async()=>{
 const f=await fixture(['private unorganized input']);
 const firstTopic=await f.s.createTopic({operationId:crypto.randomUUID(),name:'Allowed Alpha'});
 const secondTopic=await f.s.createTopic({operationId:crypto.randomUUID(),name:'Allowed Beta'});
 const deniedTopic=await f.s.createTopic({operationId:crypto.randomUUID(),name:'PRIVATE DENIED'});
 await f.memory.authorize({topicIds:[firstTopic.id,secondTopic.id],
  decision:'allowed',confirmed:true});
 await f.memory.authorize({topicIds:[deniedTopic.id],decision:'denied'});
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async()=>({...grant(),allowedTools:['list_material','query'],
   allowedKinds:['topic']}),read:createLocalReadConnectorReader(f.memory)});
 const req=cursor=>({tool:'list_material',args:{kinds:['topic'],limit:1,
  ...(cursor?{cursor}:{})}});
 const one=await boundary.handle('topic-list',req());
 assert.equal(one.data.items.length,1);
 assert.equal(one.data.complete,false);
 const two=await boundary.handle('topic-list',req(one.data.nextCursor));
 assert.equal(two.data.complete,true);
 assert.deepEqual(new Set([...one.data.items,...two.data.items].map(item=>item.id)),
  new Set([firstTopic.id,secondTopic.id]));
 assert.doesNotMatch(JSON.stringify([one.data,two.data]),/PRIVATE DENIED|private unorganized input/);
 const fresh=await boundary.handle('topic-list',req());
 await f.memory.authorize({topicIds:[secondTopic.id],decision:'denied'});
 await assert.rejects(boundary.handle('topic-list',req(fresh.data.nextCursor)),
  {code:'MEMORY_UNAVAILABLE'});
 const remaining=await boundary.handle('topic-list',req());
 assert.deepEqual(remaining.data.items.map(item=>item.id),[firstTopic.id]);
 const topicQuery={tool:'query',args:{text:'Alpha',kinds:['topic'],limit:1}};
 const direct=createLocalReadConnectorReader(f.memory);
 await assert.rejects(direct(topicQuery,{grantId:'synthetic-read-grant',
  profileId:'default',allowedKinds:['topic']}),{code:'MEMORY_DENIED'});
 // The outer boundary intentionally conceals reader admission details.
 await assert.rejects(boundary.handle('topic-query',topicQuery),
  {code:'MEMORY_UNAVAILABLE'});
 await f.memory.authorize({topicIds:[firstTopic.id],decision:'never'});
 const none=await boundary.handle('topic-list',req());
 assert.deepEqual(none.data.items,[]);
 assert.equal(none.data.complete,true);
 assert.equal(f.requests.length,0);
});


test('VS-08 Topic note retrieval requires profile admission and human authorship',async()=>{
 const f=await fixture(['private Input canary']);
 const topic=await f.s.createTopic({operationId:crypto.randomUUID(),name:'Research note'});
 const note='A human wrote this durable Topic note.';
 const edited=await f.s.editTopic({id:topic.id,expectedRevision:topic.revision,
  operationId:crypto.randomUUID(),changes:{summary:note}});
 const hidden=await f.s.createTopic({operationId:crypto.randomUUID(),name:'PRIVATE topic'});
 const hiddenEdit=await f.s.editTopic({id:hidden.id,
  expectedRevision:hidden.revision,operationId:crypto.randomUUID(),
  changes:{summary:'PRIVATE topic note canary'}});
 await f.memory.authorize({topicIds:[topic.id],decision:'allowed'});
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async()=>({...grant(),allowedKinds:['topic']}),
  read:createLocalReadConnectorReader(f.memory)});
 const ref={kind:'topic_note',id:topic.id,revision:edited.revision};
 const actual=await boundary.handle('topic-note',request(ref));
 assert.deepEqual(actual.data.ref,ref);
 assert.equal(actual.data.body,note);
 assert.equal(actual.data.role,'human');
 await assert.rejects(boundary.handle('topic-note',
  request({kind:'topic_note',id:hidden.id,revision:hiddenEdit.revision})),
  {code:'MEMORY_UNAVAILABLE'});
 await assert.rejects(boundary.handle('topic-note',
  request({...ref,revision:ref.revision+1})),{code:'MEMORY_UNAVAILABLE'});
 await f.memory.authorize({topicIds:[topic.id],decision:'denied'});
 await assert.rejects(boundary.handle('topic-note',request(ref)),
  {code:'MEMORY_UNAVAILABLE'});
 assert.equal(f.requests.length,0);
});


test('VS-08 Topic lexical query releases only profile-authorized human notes',async()=>{
 const f=await fixture(['PRIVATE Input canary']);
 const make=async(name,summary)=>{
  const topic=await f.s.createTopic({operationId:crypto.randomUUID(),name});
  const edit=await f.s.editTopic({id:topic.id,expectedRevision:topic.revision,
   operationId:crypto.randomUUID(),changes:{summary}});
  return {topic,edit};
 };
 const a=await make('Alpha','research canary alpha exact human note');
 const b=await make('Beta','research canary beta exact human note');
 const hidden=await make('PRIVATE hidden','research canary PRIVATE hidden note');
 const empty=await f.s.createTopic({operationId:crypto.randomUUID(),
  name:'research canary no human note'});
 await f.memory.authorize({topicIds:[a.topic.id,b.topic.id,empty.id],
  decision:'allowed'});
 await f.memory.authorize({topicIds:[hidden.topic.id],decision:'denied'});
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async()=>({...grant(),allowedTools:['query','get_by_ref'],
   allowedKinds:['topic']}),read:createLocalReadConnectorReader(f.memory)});
 const query=cursor=>({tool:'query',args:{text:'research canary',
  kinds:['topic'],limit:1,...(cursor?{cursor}:{})}});
 const first=await boundary.handle('topic-query',query());
 assert.equal(first.data.items.length,1);
 assert.equal(first.data.complete,false);
 const second=await boundary.handle('topic-query',query(first.data.nextCursor));
 assert.equal(second.data.items.length,1);
 assert.equal(second.data.complete,true);
 const found=[...first.data.items,...second.data.items];
 assert.deepEqual(new Set(found.map(x=>x.ref.id)),
  new Set([a.topic.id,b.topic.id]));
 assert.ok(found.every(x=>x.ref.kind==='topic_note'
  &&x.snippet.includes('research canary')));
 assert.doesNotMatch(JSON.stringify(found),/PRIVATE hidden|PRIVATE Input|no human note/);
 const exact=await boundary.handle('topic-query',request(found[0].ref));
 assert.equal(exact.data.role,'human');
 assert.equal(exact.data.body,found[0].ref.id===a.topic.id
  ?'research canary alpha exact human note'
  :'research canary beta exact human note');
 const pending=await boundary.handle('topic-query',query());
 await f.memory.authorize({topicIds:[b.topic.id],decision:'denied'});
 await assert.rejects(boundary.handle('topic-query',
  query(pending.data.nextCursor)),{code:'MEMORY_UNAVAILABLE'});
 const remaining=await boundary.handle('topic-query',query());
 assert.deepEqual(remaining.data.items.map(x=>x.ref.id),[a.topic.id]);
 assert.equal(f.requests.length,0);
});
