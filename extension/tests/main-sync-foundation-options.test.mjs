// Prepared for the main-based Sync integration. Do not treat authored cases as
// executed evidence. Fresh synthetic fake-IDB only; no browser/provider/network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {formationFixture,runFormation,rows,raw,op,parameters} from './harness/topic-03.mjs';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {originalFoundationConstructor} from '../core/thought-store-owner.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {originalLibraryDocumentsConstructor,requireOriginalLibraryDocumentsStore,isOriginalLibraryDocumentsNativeStore} from '../core/library-documents-owner.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {originalOrganizerConstructor} from '../core/organizer/store-owner.js';
import {createOriginalRecoveryWork,withOriginalRecoveryWork,currentOriginalRecoveryWork,readOriginalRecoveryTransactionWork,remainingOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork} from '../core/idb-repository.js';
import {BINDING_ROW} from '../core/thought-binding.js';
import {MaintenanceProcessingCommands,configureMaintenanceProcessingSource} from '../background/maintenance-processing-commands.js';
import {createConfiguredMaintenanceSession} from '../core/ai-usage/configured-maintenance-session.js';
import {createTopicIdentityLifecycleDispatch} from '../core/ai-usage/topic-identity-source-processing.js';
import {advanceThoughtTopicIndex} from '../core/thought-read-index.js';
import {descriptorReader} from '../core/organizer/topic-reading.js';

globalThis.IDBKeyRange=IDBKeyRange;
const limited=error=>error?.code==='BNS_GROUP_RESOURCE_LIMIT';
const gate=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const read=(store,table,id)=>store.repository.transaction(false,tx=>tx.get(table,id),[table]);

async function storeFixture(t,{cold=false}={}){
 const storage=local(),indexedDB=new IDBFactory(),options={indexedDB,name:'SYNTHETIC-main-sync-foundation-'+op()};
 let store=new LibraryDocumentsStore(storage,options);
 // Use the real consent/initialization owner, not injected control or migration
 // rows. Cold reopening deliberately leaves Bindings/Docs completion to the
 // tested finishFoundation path; no loaded flags or receipts are forged.
 await store.consent(true);
 if(cold){await store.repository.close();store=new LibraryDocumentsStore(storage,options);}
 else await store.finishFoundation();
 t.after(()=>store.repository.close());return store;
}

function observeTransactions(t,store){
 const repository=store.repository,original=repository.transaction,seen=[];
 repository.transaction=function(write,fn,...args){return original.call(this,write,async tx=>{
  seen.push({write,ticket:readOriginalRecoveryTransactionWork(repository,tx)});return fn(tx);
 },...args);};
 const stop=()=>{repository.transaction=original;};t.after(stop);return {seen,stop};
}

test('MAIN Sync Foundation: facade and lazy owners retain one original constructor and private Docs brand',async t=>{
 assert.equal(LibraryFoundationStore,originalFoundationConstructor());
 assert.equal(LibraryDocumentsStore,originalLibraryDocumentsConstructor());
 assert.equal(OrganizerStore,originalOrganizerConstructor());
 assert.equal(Object.getPrototypeOf(LibraryDocumentsStore.prototype),LibraryFoundationStore.prototype);
 assert.equal(Object.getPrototypeOf(OrganizerStore.prototype),LibraryDocumentsStore.prototype);
 const store=await storeFixture(t);
 assert.ok(store instanceof LibraryFoundationStore);
 assert.ok(store instanceof LibraryDocumentsStore);
 requireOriginalLibraryDocumentsStore(store);
 assert.equal(isOriginalLibraryDocumentsNativeStore(store),true);
 const prototypeOnly=Object.create(LibraryDocumentsStore.prototype);
 assert.equal(isOriginalLibraryDocumentsNativeStore(prototypeOnly),false);
 assert.throws(()=>requireOriginalLibraryDocumentsStore(prototypeOnly));
});

test('MAIN Sync Foundation: cold foundationWrite keeps one original Q4 ticket through Foundation, Bindings and Docs',async t=>{
 const store=await storeFixture(t,{cold:true}),repository=store.repository,observed=observeTransactions(t,store);
 const ticket=createOriginalRecoveryWork(repository),beforeMs=remainingOriginalRecoveryWork(repository,ticket),id='SYNTHETIC-main-sync-cold-write';
 const result=await withOriginalRecoveryWork(repository,ticket,()=>store.foundationWrite(async tx=>{
  assert.equal(readOriginalRecoveryTransactionWork(repository,tx),ticket);
  await tx.put('meta',{id,value:1});return {id,value:1};
 },{recoveryWork:ticket}));
 assert.deepEqual(result,{id,value:1});
 assert.ok(observed.seen.length>1);
 assert.ok(observed.seen.some(x=>x.write));
 assert.ok(observed.seen.every(x=>x.ticket===ticket),'every cold prelude, migration and write must retain the same admitted ticket');
 assert.equal(store.foundationLoaded,true);assert.equal(store.bindingsLoaded,true);assert.equal(store.documentsLoaded,true);
 assert.ok(remainingOriginalRecoveryWork(repository,ticket)<=beforeMs);
 assert.equal(currentOriginalRecoveryWork(repository),null);checkOriginalRecoveryWork(repository,ticket);
 observed.stop();
 assert.equal((await read(store,'meta',BINDING_ROW)).complete,true);
 assert.equal((await read(store,'meta','library-documents-compat-v2')).complete,true);
 assert.deepEqual(await read(store,'meta',id),{id,value:1});
});

test('MAIN Sync Foundation: operation forwards independent recoveryWork and workLimit to the original durable receipt',async t=>{
 const store=await storeFixture(t),repository=store.repository,observed=observeTransactions(t,store);
 const ticket=createOriginalRecoveryWork(repository),beforeMs=remainingOriginalRecoveryWork(repository,ticket);
 const request={operationId:op(),id:'SYNTHETIC-main-sync-operation'},expected={id:request.id,revision:1};
 const result=await withOriginalRecoveryWork(repository,ticket,()=>store.operation(request,async tx=>{
  assert.equal(readOriginalRecoveryTransactionWork(repository,tx),ticket);
  await tx.put('meta',{id:request.id,value:1});return expected;
 },{recoveryWork:ticket,workLimit:{references:4096,bytes:2*1024*1024,ms:30000}}));
 assert.deepEqual(result,expected);
 assert.ok(observed.seen.some(x=>x.write));assert.ok(observed.seen.every(x=>x.ticket===ticket));
 assert.ok(remainingOriginalRecoveryWork(repository,ticket)<=beforeMs);
 observed.stop();
 assert.deepEqual((await read(store,'operationReceipts',request.operationId)).result,expected);
 assert.equal((await read(store,'meta',request.id)).value,1);
 // A plain main-style operation, without either new option, remains valid.
 assert.deepEqual(await store.operation(request,()=>assert.fail('durable duplicate must not re-enter the mutation')),expected);
});

test('MAIN Sync Foundation: ordinary polling cannot borrow an active owner action ticket between admitted writes',async t=>{
 const store=await storeFixture(t),repository=store.repository,ticket=createOriginalRecoveryWork(repository);
 const ready=gate(),release=gate(),owned=[],request={operationId:op(),id:'SYNTHETIC-main-sync-poll-owner'};
 t.after(()=>release.resolve());
 const action=withOriginalRecoveryWork(repository,ticket,async()=>{
  await store.foundationWrite(async tx=>{owned.push(readOriginalRecoveryTransactionWork(repository,tx));await tx.put('meta',{id:request.id,value:1});},{recoveryWork:ticket});
  ready.resolve();await release.promise;
  return store.operation(request,async tx=>{owned.push(readOriginalRecoveryTransactionWork(repository,tx));return {id:request.id,value:(await tx.get('meta',request.id)).value};},{recoveryWork:ticket});
 });
 action.catch(()=>{});
 try{
  await Promise.race([ready.promise,action.then(()=>assert.fail('owner action missed its gap'))]);
  assert.equal(currentOriginalRecoveryWork(repository),ticket);
  const ordinary=await store.run(()=>repository.transaction(false,async tx=>{
   assert.equal(readOriginalRecoveryTransactionWork(repository,tx),null,'ambient owner window must not grant the ordinary Store poll its ticket');
   return tx.get('meta',request.id);
  },['meta']));
  assert.equal(ordinary.value,1);release.resolve();
  assert.deepEqual(await action,{id:request.id,value:1});assert.deepEqual(owned,[ticket,ticket]);
  assert.equal(currentOriginalRecoveryWork(repository),null);checkOriginalRecoveryWork(repository,ticket);
 }finally{release.resolve();await action.catch(()=>{});}
});

test('MAIN Sync Foundation: standalone workLimit is snapshotted before awaits and still limits original writes without a recovery ticket',async t=>{
 const store=await storeFixture(t),repository=store.repository;
 for(const method of ['foundationWrite','operation']){
  const request={operationId:op(),id:'SYNTHETIC-main-sync-snapshot-'+method},workLimit={references:4096};
  const body=async tx=>{
   assert.equal(readOriginalRecoveryTransactionWork(repository,tx),null);
   for(let i=0;i<4;i++)await tx.get('meta','thought-library');
   await tx.put('meta',{id:request.id,value:1});return {id:request.id};
  };
  const pending=method==='foundationWrite'?store.foundationWrite(body,{workLimit}):store.operation(request,body,{workLimit});
  workLimit.references=1;
  assert.deepEqual(await pending,{id:request.id},'mutating the input after invocation cannot tighten its already captured budget');
  const refused={operationId:op(),id:'SYNTHETIC-main-sync-limited-'+method},overLimit=async tx=>{
   for(let i=0;i<4;i++)await tx.get('meta','thought-library');
   await tx.put('meta',{id:refused.id,value:1});return {id:refused.id};
  };
  await assert.rejects(method==='foundationWrite'?store.foundationWrite(overLimit,{workLimit:{references:1}}):store.operation(refused,overLimit,{workLimit:{references:1}}),limited);
  assert.equal(await read(store,'meta',refused.id),undefined);
  assert.equal(await read(store,'operationReceipts',refused.operationId),undefined);
 }
 assert.equal(currentOriginalRecoveryWork(repository),null);
});

test('MAIN Sync Foundation: an explicit workLimit cannot replenish an already consumed original recovery allowance',async t=>{
 const store=await storeFixture(t),repository=store.repository,ticket=createOriginalRecoveryWork(repository);
 const request={operationId:op(),id:'SYNTHETIC-main-sync-no-refill'};let entered=false;
 // One fixed debit of the genuine owner ledger, not a synthetic issuer or a
 // capacity sweep. The next original acquisition must fail, not mint a ticket.
 chargeOriginalRecoveryWork(repository,ticket,0,4096);
 await assert.rejects(withOriginalRecoveryWork(repository,ticket,()=>store.operation(request,async tx=>{
  entered=true;await tx.put('meta',{id:request.id,value:1});return {id:request.id};
 },{recoveryWork:ticket,workLimit:{references:4096}})),limited);
 assert.equal(entered,false);assert.equal(currentOriginalRecoveryWork(repository),null);
 assert.throws(()=>checkOriginalRecoveryWork(repository,ticket),limited);
 assert.equal(await read(store,'meta',request.id),undefined);
 assert.equal(await read(store,'operationReceipts',request.operationId),undefined);
});

// Reuse the existing real PT08 qualification route. Settings commands and the
// configured source/session mint their own opaque authority; this fixture does
// not inject a processing grant, private issuer or prepared lifecycle handle.
async function lifecycleFixture(t){
 const f=await formationFixture();t.after(()=>f.s.repository.close());f.s.clock=()=> '2026-01-01T00:00:00.000Z';
 for(const row of await rows(f.s,'recordIndex'))await f.s.changeRecord(row.id,r=>{r.sourceSentAt='2026-01-01T00:00:00.000Z';});
 await runFormation(f);
 const selected=(await rows(f.s,'topics'))[0],entry=(await rows(f.s,'thoughts'))[0],placement=(await rows(f.s,'placements'))[0];
 await f.s.placeEntry({topicId:selected.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:selected.organizationRevision,expectedPlacementRevision:placement.revision,operationId:op()});
 const section=(await rows(f.s,'sections'))[0];
 await f.s.editSection({topicId:selected.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC main Sync selected section',operationId:op()});
 let projected;do{projected=await advanceThoughtTopicIndex(f.s,{topicId:selected.id,describe:descriptorReader(f.s)});}while(projected.pending);
 await f.s.repository.close();f.s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB,clock:()=> '2026-01-01T00:00:00.000Z'});
 const caller=Object.freeze({id:op()}),url='chrome-extension://synthetic/ui/archive.html';
 const sender={id:'synthetic',frameId:0,documentId:'synthetic-foundation-options',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}};
 const api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:sender.documentId,documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url}),onRemoved:{addListener(){}},onUpdated:{addListener(){}}}};
 const commands=new MaintenanceProcessingCommands(f.s,api),status=await commands.handle({type:'PAIA_MAINTENANCE_PROCESSING_STATUS'},sender);
 await commands.handle({type:'PAIA_MAINTENANCE_PROCESSING_CONFIGURE',enabled:true,expectedGeneration:status.generation,consentVersion:1,confirmed:true},sender);
 let physical=0;const deny=()=>{physical++;throw Error('No service/provider execution in Foundation options control');};
 const service={version:1,topic:{decisionVersion:'synthetic-identity-1',parameters,resolveProcessing:deny},context:{caller,processingVerifier:{verify:deny,isCurrent:()=>false}}};
 const configuration=configureMaintenanceProcessingSource(commands,f.s,{origin:'https://synthetic.invalid',scope:'synthetic-foundation-options-identity',contractVersion:'synthetic-1',routeVersion:'synthetic-1',service,processing:null,clock:Date.now,resolveAuthority:async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),isCurrent:()=>true,onInvalidate:()=>()=>{},readProfile:deny,currentProfile:()=>null,tokenize:deny,isCurrentTokenizer:()=>false,readProofs:deny,fetch:deny});
 const session=createConfiguredMaintenanceSession(f.s,configuration);t.after(()=>session.dispose());assert.equal(session.available(),true);
 return {...f,selected,session,physical:()=>physical,options:{scope:configuration.scope,contractVersion:configuration.contractVersion,routeVersion:configuration.routeVersion,cursor:'aiu:delta:pending:'+JSON.stringify(['placement',placement.id])}};
}

test('MAIN Sync Foundation: genuine configured PT08 preparation and lifecycle operation retain one ticket through final receipt',async t=>{
 const f=await lifecycleFixture(t),observed=observeTransactions(t,f.s),handle=await f.session.prepare(f.options);
 const ticket=observed.seen.find(x=>x.ticket)?.ticket;assert.ok(ticket,'the original configured preparation must issue its own repository ticket');
 const beforeMs=remainingOriginalRecoveryWork(f.s.repository,ticket),prepareCount=observed.seen.length;
 const result=await createTopicIdentityLifecycleDispatch(f.session,f.s,handle).run({now:Date.parse('2026-10-01T00:00:00Z')});
 assert.equal(result.items.length,1);assert.equal(result.items[0].state,'settled');assert.equal(result.items[0].result.lifecycle,'dormant');
 assert.ok(observed.seen.length>prepareCount);assert.ok(observed.seen.some(x=>x.write));
 assert.ok(observed.seen.every(x=>x.ticket===ticket),'preparation, original operation and receipt/finalizer must all retain the first ticket');
 assert.ok(remainingOriginalRecoveryWork(f.s.repository,ticket)<=beforeMs);observed.stop();
 const receipts=(await rows(f.s,'operationReceipts')).filter(row=>row.id.startsWith('topic-activity:'));
 assert.equal(receipts.length,1);assert.equal(receipts[0].result.id,f.selected.id);assert.equal(receipts[0].result.lifecycle,'dormant');
 assert.equal((await raw(f.s,'topics',f.selected.id)).lifecycle,'dormant');assert.equal(f.physical(),0);
});
