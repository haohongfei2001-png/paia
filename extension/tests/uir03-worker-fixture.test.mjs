import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {LibraryRunner} from '../core/library-runner.js';
import {CONTROL_PUBLICATION_REVISION} from '../core/local-control-publication.js';
import {installLibraryFixtureObservation,failWithBoundedEvidence} from './harness/uir03-worker-fixture.mjs';

async function fixture(reuseWorker){
 const f=await completeFixture({texts:['SYNTHETIC original owner lexical']}),store=f.s;
 const topic=await store.createTopic({name:'SYNTHETIC owner topic',operationId:crypto.randomUUID()}),block=(await rows(store,'blocks'))[0].value;
 const entry=await store.addToTopics({kind:'input',id:block.id,expectedRevision:block.revision,topicIds:[topic.id],operationId:crypto.randomUUID()});
 const publisher=reuseWorker?store:new store.constructor(f.storage,{indexedDB:f.indexedDB});await publisher.finishFoundation();
 const epoch=(await publisher.status()).epoch,runner=new LibraryRunner(store,{yieldBatch:()=>Promise.resolve()}),original=store.repository.transaction,run=store.run,errors=[];
 let injected=false,publication,batches=0;const process=store.processLibraryMaintenance;
 store.processLibraryMaintenance=function(...args){batches++;return process.apply(this,args);};
 store.run=function(fn){let entered=false;return run.call(this,()=>{entered=true;return fn();}).catch(error=>{errors.push({code:error.code,entered});throw error;});};
 store.repository.transaction=async function(write,fn,tables){
  let fence=false;const result=await original.call(this,write,async t=>{const get=t.get.bind(t);t.get=(name,key)=>{if(key===CONTROL_PUBLICATION_REVISION)fence=true;return get(name,key);};return fn(t);},tables);
  if(fence&&!injected){injected=true;publication=publisher.capture({epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-owner-publication',url:'https://chatgpt.com/c/synthetic-owner-publication',title:'SYNTHETIC publisher'},messages:[{sourceMessageId:'one',pageOrder:1,originalText:'SYNTHETIC added provenance'}]});
   // The old fixture owned a different tail, so it could publish across this
   // preflight. The real worker fixture queues on the already active tail.
   if(!reuseWorker)await publication;
  }
  return result;
 };
 const collect=async()=>{let cursor=null,last,items=[];do{last=await store.libraryIndexPage({mode:'stable',providerKey:'chatgpt',query:'original owner lexical',limit:40,cursor});assert.ok(last.items.length<=40);assert.ok((last.operations?.placementRowsRead||0)<=40);items.push(...last.items);cursor=last.nextCursor;}while(cursor);return {...last,items};};
 return {...f,runner,entry,errors,collect,async race(){await runner.wake();await publication;assert.equal(injected,true);},batches:()=>batches,async close(){store.repository.transaction=original;store.run=run;store.processLibraryMaintenance=process;if(publisher!==store)await publisher.repository.close();await store.repository.close();}};
}

test('old second-store capture can latch the real LibraryRunner before callback entry and stall lexical completion',async()=>{
 const f=await fixture(false);try{
  await f.race();assert.equal(f.runner.failed,true);assert.equal(f.s.libraryMaintenanceFailed,true);assert.deepEqual(f.errors,[{code:'CONTROL_PUBLICATION_CHANGED',entered:false}]);
  const before=await rows(f.s,'libraryMigrationItems'),batches=f.batches();
  for(let i=0;i<3;i++){const page=await f.collect();assert.equal(page.complete,false);assert.equal(page.indexing,true);await f.runner.wake();}
  assert.equal(f.batches(),batches,'ordinary reads cannot silently clear a real failure');assert.deepEqual(await rows(f.s,'libraryMigrationItems'),before);assert.equal(f.requests.length,0);
 }finally{await f.close();}
});

test('seeding through the existing worker tail preserves the original runner and completes the real scoped lexical index',async()=>{
 const f=await fixture(true);try{
  await f.race();assert.equal(f.runner.failed,false);assert.notEqual(f.s.libraryMaintenanceFailed,true);assert.deepEqual(f.errors,[]);
  const page=await f.collect();assert.equal(page.cursorInvalid,undefined);assert.equal(page.complete,true);assert.deepEqual(page.items.map(row=>row.entryId),[f.entry.id]);assert.equal(f.requests.length,0);
 }finally{await f.close();}
});

test('fixture observation forwards wakes and original errors without clearing failure, retrying or replacing the Store',async()=>{
 const saved=globalThis.__uir03Worker;
 const failure=Object.assign(Error('SYNTHETIC failure'),{code:'STORAGE_FAILED'});let runs=0,batches=0;
 const store={run:async fn=>{runs++;return fn();},processLibraryMaintenance(){batches++;return this.run(()=>{throw failure;});}},runner=new LibraryRunner(store);
 try{
  globalThis.__uir03Worker={store,library:runner,prefix:()=>null};installLibraryFixtureObservation();await runner.wake();
  const trace=globalThis.__uir03Library;assert.equal(trace.owner,runner);assert.equal(trace.owner.store,store);assert.equal(runner.failed,true);assert.deepEqual(trace.errors,[{code:'STORAGE_FAILED',entered:true}]);
  await runner.wake();assert.equal(runs,1);assert.equal(batches,1);assert.equal(trace.batches,1);
  trace.restore();assert.equal(runner.failed,true);
 }finally{globalThis.__uir03Library?.restore();delete globalThis.__uir03Library;globalThis.__uir03Worker=saved;}
});

test('native UIR03 seeds only the observed worker and keeps strict bounded lexical completion',async()=>{
 const source=await readFile(new URL('./uir-03-thought-original-chrome-e2e.test.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/new (OrganizerStore|LibraryFoundationStore)|retry:true|drainLibraryMaintenance|processLibraryMaintenance\(/);
 assert.equal((source.match(/const store=globalThis\.__uir03Library\.owner\.store/g)||[]).length,3);
 assert.match(source,/scopedSearch.complete===true&&!scopedSearch.cursorInvalid/);assert.match(source,/timeout:300000/);
 assert.match(source,/source lexical compatibility reaches a complete current index/);assert.match(source,/UIR03_LEXICAL_FAILURE/);
});

for(const kind of ['read-rejection','write-rejection','stuck-read','stuck-write','report-rejection'])test('lexical failure survives '+kind+' evidence unchanged and within the diagnostic-only bound',async()=>{
 const original=Error('original lexical assertion'),diagnosticError=Error('SYNTHETIC unavailable'),fallback={diagnosticUnavailable:true},reports=[];let release;const held=new Promise(resolve=>release=resolve);
 const read=()=>kind==='read-rejection'?Promise.reject(diagnosticError):kind==='stuck-read'?held:Promise.resolve({safe:true});
 const persist=()=>kind==='write-rejection'?Promise.reject(diagnosticError):kind==='stuck-write'?held:Promise.resolve();
 await assert.rejects(failWithBoundedEvidence(original,{read,persist,report:value=>{if(kind==='report-rejection')throw diagnosticError;reports.push(value);},fallback,timeoutMs:1}),error=>error===original);
 if(kind!=='report-rejection')assert.deepEqual(reports,[fallback]);release({safe:true});await new Promise(resolve=>setImmediate(resolve));if(kind!=='report-rejection')assert.deepEqual(reports,[fallback],'late completion cannot publish a replacement diagnostic');
});
