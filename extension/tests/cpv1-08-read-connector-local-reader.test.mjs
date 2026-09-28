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
async function fixture(){
 const text='EXACT_ORIGINAL 👩🏽‍💻\n'+'long source '.repeat(300);
 const f=await completeFixture({texts:[text]});
 const memory=new MemoryService(f.s);await memory.ready();
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
