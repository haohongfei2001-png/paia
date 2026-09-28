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
