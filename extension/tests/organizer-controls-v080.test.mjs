import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,meta} from './harness/original-complete.mjs';
import {organizerControls,setOrganizerControls} from '../core/organizer/controls.js';

test('retired daily limits and batch configuration reject without resetting saved usage or old controls',async()=>{
 const f=await completeFixture();
 const prior={id:'organizer-controls',dailyRequests:3,batchMode:'compact',aiOnboardingSeen:true,readingSort:'desc'};
 const budget={id:'organizer-budget',dailyAt:100,daily:{requests:2,inputs:4,bytes:200}};
 await f.s.repository.transaction(true,async t=>{await t.put('meta',prior);await t.put('meta',budget);});
 for(const changes of [{dailyRequests:1},{dailyRequests:200},{dailyRequests:0},{dailyRequests:'20'},{batchMode:'recommended'},{batchMode:'infinite'},{aiOnboardingSeen:false},{readingSort:'asc',dailyRequests:4}]){
  await assert.rejects(()=>setOrganizerControls(f.s,changes),{code:'AI_SERVICE_UNAVAILABLE'});
  assert.deepEqual(await meta(f.s,'organizer-controls'),prior);assert.deepEqual(await meta(f.s,'organizer-budget'),budget);
 }
 assert.equal(f.requests.length,0);
});

test('reading controls remain local and never scan old request logs or expose usage and provider settings',async()=>{
 const f=await completeFixture();
 const prior={id:'organizer-controls',dailyRequests:7,batchMode:'compact',aiOnboardingSeen:true};
 await f.s.repository.transaction(true,t=>t.put('meta',prior));
 const transaction=f.s.repository.transaction.bind(f.s.repository),reads=[];
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{
  const get=t.get.bind(t);t.get=(name,id)=>{reads.push([name,id]);return get(name,id);};
  t.all=()=>{throw Error('controls must not scan usage history');};return fn(t);
 },stores);
 const controls=await organizerControls(f.s);f.s.repository.transaction=transaction;
 assert.deepEqual(controls,{readingSort:'asc',inputReadingSort:'asc',libraryView:'original'});
 assert.deepEqual(reads,[['meta','thought-binding:v1'],['meta','thought-reverse-edit:v1'],['meta','library-documents-compat-v2'],['meta','organizer-controls']]);
 await setOrganizerControls(f.s,{readingSort:'desc',inputReadingSort:'desc',libraryView:'ai'});
 assert.deepEqual(await organizerControls(f.s),{readingSort:'desc',inputReadingSort:'desc',libraryView:'ai'});
 const saved=await meta(f.s,'organizer-controls');for(const key of ['dailyRequests','batchMode','aiOnboardingSeen'])assert.equal(saved[key],prior[key]);
 assert.equal(await meta(f.s,'organizer-budget'),undefined);assert.equal(f.requests.length,0);
 await assert.rejects(()=>setOrganizerControls(f.s,{apiKey:'never'}),{code:'INVALID_OUTPUT'});
});
