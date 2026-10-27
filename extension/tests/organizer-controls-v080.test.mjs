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
 const transaction=f.s.repository.transaction.bind(f.s.repository),reads=[],transactions=[];
 f.s.repository.transaction=(write,fn,stores)=>{transactions.push(write);return transaction(write,t=>{
  const get=t.get.bind(t);t.get=(name,id)=>{reads.push([name,id]);return get(name,id);};
  t.all=()=>{throw Error('controls must not scan usage history');};return fn(t);
 },stores);};
 let controls,settledControls,initialReads,initialTransactions;
 try{
  controls=await organizerControls(f.s);initialReads=reads.splice(0);initialTransactions=transactions.splice(0);
  settledControls=await organizerControls(f.s);
 }finally{f.s.repository.transaction=transaction;}
 assert.deepEqual(controls,{readingSort:'desc',inputReadingSort:'desc',libraryView:'original'});
 const publicationFence=['local-control-publication:revision','local-control-publication:reservation','migration','gate','recovery-restore-epoch'];
 const fenced=keys=>[...publicationFence,...publicationFence,...keys];
 const writeSettlement=['application-generation-selection:v1','canonical-generation:repository-protection:v1'];
 // Each original run brackets its SDK control read with both publication fences.
 // Cold foundation probes precede the existing migration writers; their final
 // selection/protection checks are not reads of usage or provider history.
 assert.deepEqual(initialReads,[
  ...fenced(['thought-binding:v1']),
  ...fenced(['thought-binding:v1','thought-reverse-edit:v1',...writeSettlement]),
  ...fenced(['library-documents-compat-v2']),
  ...fenced(['library-documents-compat-v2',...writeSettlement]),
  ...fenced(['organizer-controls'])
 ].map(id=>['meta',id]));
 assert.deepEqual(initialTransactions,[false,false,false,false,false,true,false,false,false,false,false,true,false,false,false]);
 // Once the original owners have completed initialization, controls need only
 // their own fenced readonly read: no repeated migration probes or writers.
 assert.deepEqual(settledControls,controls);
 assert.deepEqual(reads,fenced(['organizer-controls']).map(id=>['meta',id]));
 assert.deepEqual(transactions,[false,false,false]);
 await setOrganizerControls(f.s,{readingSort:'desc',inputReadingSort:'desc',libraryView:'ai'});
 assert.deepEqual(await organizerControls(f.s),{readingSort:'desc',inputReadingSort:'desc',libraryView:'ai'});
 const saved=await meta(f.s,'organizer-controls');for(const key of ['dailyRequests','batchMode','aiOnboardingSeen'])assert.equal(saved[key],prior[key]);
 assert.equal(await meta(f.s,'organizer-budget'),undefined);assert.equal(f.requests.length,0);
 await assert.rejects(()=>setOrganizerControls(f.s,{apiKey:'never'}),{code:'INVALID_OUTPUT'});
});

test('fresh Topic and Input reading starts newest first while explicit saved oldest-first remains authoritative',async()=>{
 const f=await completeFixture();try{
  assert.equal((await organizerControls(f.s)).readingSort,'desc');
  assert.equal((await organizerControls(f.s)).inputReadingSort,'desc');
  await setOrganizerControls(f.s,{readingSort:'asc',inputReadingSort:'asc'});
  assert.equal((await organizerControls(f.s)).readingSort,'asc');
  await setOrganizerControls(f.s,{libraryView:'ai'});
  assert.equal((await organizerControls(f.s)).readingSort,'asc');
  assert.equal((await organizerControls(f.s)).inputReadingSort,'asc');
 }finally{f.s.repository.db.close();}
});
