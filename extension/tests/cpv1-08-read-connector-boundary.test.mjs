import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadConnectorBoundary} from '../core/read-connector-boundary.js';

const grant=()=>({grantId:'g1',consumer:'supported-ai',profileId:'default',
 permission:'read_connector',purpose:'read_only_query',resourceScope:'profile',
 scopeRevision:1,allowedTools:['list_material','query','get_by_ref',
  'get_task_context','permission_self_check'],
 allowedKinds:['topic','input','thought'],expiresAt:100000,revokedAt:null});
const list={tool:'list_material',args:{kinds:['input'],limit:1}};
const page={items:[{kind:'input',id:'i1',title:'Input'}],nextCursor:null,complete:true};

test('VS-08 detached boundary resolves trusted binding and seals a scoped result',async()=>{
 let calls=0,observed;
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async binding=>{assert.equal(binding,'connection-1');calls++;return grant();},
  read:async(request,scope)=>{observed=scope;
   assert.equal(request.tool,'list_material');return page;}});
 const result=await boundary.handle('connection-1',list);
 assert.equal(calls,2);
 assert.deepEqual(result.data,page);
 assert.equal(observed.profileId,'default');
 assert.equal(observed.grantId,'g1');
 assert.equal(Object.hasOwn(result,'grantId'),false);
 assert.equal(Object.isFrozen(observed),true);
});

test('VS-08 detached boundary refuses legacy export grants, scope and expired grants',async()=>{
 for(const patch of [
  {permission:'context_export'},{purpose:'context_export'},{consumer:''},
  {resourceScope:'all'},{expiresAt:1000},{revokedAt:999},
  {allowedKinds:['topic']},{allowedTools:['query']}
 ]){
  let reads=0;
  const boundary=createReadConnectorBoundary({clock:()=>1000,
   authorize:async()=>({...grant(),...patch}),
   read:async()=>{reads++;return page;}});
  await assert.rejects(boundary.handle('connection-1',list),{code:'MEMORY_DENIED'});
  assert.equal(reads,0);
 }
});

test('VS-08 revocation and scope change during a read suppress all output',async()=>{
 for(const patch of [{revokedAt:1001},{scopeRevision:2},
                     {allowedKinds:['topic']},{profileId:'other'},{consumer:'other-ai'}]){
  let n=0;
  const boundary=createReadConnectorBoundary({clock:()=>1000,
   authorize:async()=>n++?{...grant(),...patch}:grant(),
   read:async()=>page});
  await assert.rejects(boundary.handle('connection-1',list),{code:'MEMORY_DENIED'});
  assert.equal(n,2);
 }
});

test('VS-08 read errors, hidden fields and oversized responses remain private',async()=>{
 const base={clock:()=>1000,authorize:async()=>grant()};
 const error=createReadConnectorBoundary({...base,read:async()=>{throw Error('PRIVATE VALUE');}});
 await assert.rejects(error.handle('connection-1',list),{code:'MEMORY_UNAVAILABLE'});
 const hidden=createReadConnectorBoundary({...base,read:async()=>({
  ...page,grantId:'PRIVATE VALUE'})});
 await assert.rejects(hidden.handle('connection-1',list),{code:'MEMORY_UNAVAILABLE'});
});

test('VS-08 per-binding local rate bound serializes concurrent calls',async()=>{
 let reads=0;
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async()=>grant(),read:async()=>{reads++;return page;}});
 const settled=await Promise.allSettled(Array.from({length:61},
  ()=>boundary.handle('connection-1',list)));
 assert.equal(settled.filter(x=>x.status==='fulfilled').length,60);
 assert.equal(settled.filter(x=>x.status==='rejected').length,1);
 assert.equal(settled.find(x=>x.status==='rejected').reason.code,'MEMORY_LIMIT');
 assert.equal(reads,60);
});


test('VS-08 all remaining read tools cross the normalized boundary',async()=>{
 const ref={kind:'input',id:'i1',revision:0};
 const replies={
  query:{items:[{ref,title:'Input',snippet:'needle'}],nextCursor:null,complete:true},
  get_by_ref:{ref,title:'Input',body:'original body',role:'human'},
  get_task_context:{taskId:'task-1',text:'bounded Context',complete:true},
  permission_self_check:{allowed:true}
 };
 const boundary=createReadConnectorBoundary({clock:()=>1000,
  authorize:async()=>grant(),read:async request=>replies[request.tool]});
 for(const request of [
  {tool:'query',args:{text:'needle',kinds:['input']}},
  {tool:'get_by_ref',args:{ref}},
  {tool:'get_task_context',args:{taskId:'task-1'}},
  {tool:'permission_self_check',args:{}}
 ]){
  const response=await boundary.handle('connection-1',request);
  assert.equal(response.tool,request.tool);
  assert.deepEqual(response.data,replies[request.tool]);
 }
});
