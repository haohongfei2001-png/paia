import test from 'node:test';
import assert from 'node:assert/strict';
import {openConfiguredSyncWorker} from './harness/sync-configured-worker.mjs';
import {fakeGoogleCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
import {STORAGE_KEY} from '../core/constants.js';
import {readOriginalContextEnrollmentObservation} from '../core/browser-native-sync/context-mutation-journal-owner.js';
import {readOriginalIndexedStoreControlScope} from '../core/indexed-store.js';
import {local} from './harness/thought-m1.mjs';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {ContextMutationSyncJournal} from '../core/browser-native-sync/context-mutation-journal.js';
import {createOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,withOriginalRecoveryWork,currentOriginalRecoveryWork,remainingOriginalRecoveryWork,finishOriginalRecoveryWork} from '../core/idb-repository.js';
const google={subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']};
globalThis.IDBKeyRange=IDBKeyRange;
// Exact original cold case, copied unchanged. The complete original four-case
// history remains in sync-worker-checkpoint-prompt.test.mjs.
test('actual worker cold-start settles original lost Settings ACK without repeating write, intent or transfer',async t=>{
 const base=local();let armed=false,unreadable=false,sets=0;const storage={async get(key){if(unreadable&&key===STORAGE_KEY)throw Error('SYNTHETIC unavailable readback');return base.get(key);},async set(value){sets++;await base.set(value);if(armed&&value[STORAGE_KEY]){armed=false;unreadable=true;throw Error('SYNTHETIC original SDK lost acknowledgement');}}};
 const cloud=fakeGoogleCheckpointHTTP(google),options={provider:'google-drive',binding:google,cloud,deviceId:'SYNTHETIC_same',storage};let current=await openConfiguredSyncWorker(options);t.after(async()=>current?.close());await current.ui('RESUME');armed=true;const result=await current.rpc('UPDATE_PREFERENCES',{changes:{appearance:'dark'}});assert.equal(result.ok,false);unreadable=false;const core=current.bridge.prompt.syncJournal.core,pending=await current.bridge.store.repository.transaction(false,tx=>tx.get('meta','bns:consumer-preference-publication:pending'));assert.equal(pending.terminal,true);const before=await base.get(STORAGE_KEY),count=sets,factory=current.factory;await current.close();current=await openConfiguredSyncWorker({...options,factory});assert.equal(sets,count);assert.deepEqual(await base.get(STORAGE_KEY),before);assert.equal(await current.bridge.store.repository.transaction(false,tx=>tx.get('meta','bns:consumer-preference-publication:pending')),undefined);const h=await current.bridge.store.consumerPreferenceJournal.core.read('head','consumerPreference','appearance');assert.deepEqual(h.revisions,pending.operations.map(x=>x.revisionId));assert.equal(cloud.requests.length,0);assert.equal((await current.rpc('PAIA_SYNC_STATUS')).ok,true);assert.equal(sets,count);
});


async function device(t){
 const base=local(),factory=new IDBFactory();let hook=null,sets=0,gets=0;
 const storage={async get(key){gets++;const value=await base.get(key);return hook?hook(key,value):value;},async set(value){sets++;return base.set(value);}};
 const s=new OrganizerStore(storage,{indexedDB:factory});await s.consent(true);await s.finishFoundation();await s.status();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_cold_controls',deviceId:crypto.randomUUID()}),journal=new ContextMutationSyncJournal(core,{store:s}),service=new ContextCardsService(s);
 t.after(()=>s.repository.close());return {s,core,journal,service,storage,base,factory,hook:value=>hook=value,counts:()=>({gets,sets})};
}
const rows=f=>f.s.repository.transaction(false,async t=>({meta:await t.all('meta'),receipts:await t.all('operationReceipts')}));
function latch(){let release,enter;const held=new Promise(r=>release=r),entered=new Promise(r=>enter=r);return {held,entered,release,enter};}

test('fresh control qualification is readonly and never invokes substituted public run',async t=>{
 const f=await device(t),before=await rows(f),saved=await f.base.get(STORAGE_KEY),counts=f.counts();let calls=0;
 f.s.run=async()=>{calls++;throw Error('SYNTHETIC substituted run');};
 assert.deepEqual(await f.journal.emptyEnrollment(f.service),{version:1,databaseId:f.s.databaseId,namespace:'initial',epoch:null});
 assert.equal(calls,0);assert.equal(f.counts().sets,counts.sets);assert.equal(f.counts().gets-counts.gets,2);assert.deepEqual(await rows(f),before);assert.deepEqual(await f.base.get(STORAGE_KEY),saved);assert.equal(f.service.syncJournal,null);
});

for(const corruption of ['cache','settings','sdk-get','sdk-set','pending-control'])test('fresh qualification refuses altered original '+corruption+' before SDK reload',async t=>{
 const f=await device(t),counts=f.counts(),get=f.storage.get,set=f.storage.set;
 if(corruption==='cache')f.s.controlCache=structuredClone(f.s.controlCache);
 if(corruption==='settings')f.s.controlCache.settings.enabled=!f.s.controlCache.settings.enabled;
 if(corruption==='sdk-get')f.storage.get=async key=>f.base.get(key);
 if(corruption==='sdk-set')f.storage.set=async value=>f.base.set(value);
 if(corruption==='pending-control')f.s.pendingControl=structuredClone(f.s.controlCache);
 const cache=f.s.controlCache,before=await rows(f);
 try{await assert.rejects(f.journal.emptyEnrollment(f.service));assert.equal(f.s.controlCache,cache);assert.deepEqual(await rows(f),before);assert.deepEqual(f.counts(),counts);assert.equal(f.service.syncJournal,null);}finally{f.storage.get=get;f.storage.set=set;}
});

for(const pending of ['consumer','reservation'])test('fresh qualification refuses unsettled '+pending+' without SDK reads or writes',async t=>{
 const f=await device(t);
 await f.s.repository.transaction(true,async tx=>{
  if(pending==='consumer')await tx.put('meta',{id:'bns:consumer-preference-publication:pending',version:1});
  else{const revision=(await tx.get('meta','local-control-publication:revision'))?.revision??1;await tx.put('meta',{id:'local-control-publication:revision',version:1,revision});await tx.put('meta',{id:'local-control-publication:reservation',version:1,revision,nonce:'SYNTHETIC_pending',databaseId:f.s.databaseId,beforeDigest:'0'.repeat(64),afterDigest:null,fenceDigest:null});}
 },['meta']);
 const before=await rows(f),cache=f.s.controlCache,counts=f.counts();await assert.rejects(f.journal.emptyEnrollment(f.service));assert.equal(f.s.controlCache,cache);assert.deepEqual(await rows(f),before);assert.deepEqual(f.counts(),counts);
});

test('closing the original database during held SDK read refuses without reopening or cache publication',async t=>{
 const f=await device(t),gate=latch(),cache=f.s.controlCache,open=f.factory.open;let opens=0;
 f.factory.open=function(...args){opens++;return open.apply(this,args);};f.hook(async(key,value)=>{if(key===STORAGE_KEY){gate.enter();await gate.held;}return value;});
 const pending=f.journal.emptyEnrollment(f.service);pending.catch(()=>{});await gate.entered;await f.s.repository.close();gate.release();await assert.rejects(pending);assert.equal(f.s.repository.db,null);assert.equal(opens,0);assert.equal(f.s.controlCache,cache);
});

test('SDK mutation between original qualification and terminal read refuses without an enrollment result',async t=>{
 const f=await device(t);let reads=0;const before=await rows(f),counts=f.counts();
 f.hook((key,value)=>{if(key===STORAGE_KEY&&++reads===2)value[STORAGE_KEY].preferences.appearance='dark';return value;});
 await assert.rejects(f.journal.emptyEnrollment(f.service),{code:'CONTROL_PUBLICATION_CHANGED'});assert.equal(f.service.syncJournal,null);assert.equal(f.counts().sets,counts.sets);assert.deepEqual(await rows(f),before);
});

for(const resource of ['references','bytes','expired','failed'])test('fresh qualification never replaces an explicit '+resource+' recovery ticket',async t=>{
 const f=await device(t),repository=f.s.repository,ticket=createOriginalRecoveryWork(repository,{ms:resource==='expired'?5:30000}),cache=f.s.controlCache;
 if(resource==='references')chargeOriginalRecoveryWork(repository,ticket,0,4095);
 if(resource==='bytes')chargeOriginalRecoveryWork(repository,ticket,2*1024*1024-8,0);
 if(resource==='failed')assert.throws(()=>chargeOriginalRecoveryWork(repository,ticket,0,4097),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 if(resource==='expired')await new Promise(r=>setTimeout(r,10));
 await assert.rejects(readOriginalContextEnrollmentObservation(f.journal,f.service,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.equal(f.s.controlCache,cache);assert.equal(f.service.syncJournal,null);assert.equal(currentOriginalRecoveryWork(repository),null);finishOriginalRecoveryWork(repository,ticket);
});

test('held SDK completion after explicit deadline cannot mint a new control owner or reset the ticket',async t=>{
 const f=await device(t),repository=f.s.repository,gate=latch(),cache=f.s.controlCache,ticket=createOriginalRecoveryWork(repository,{ms:40});
 f.hook(async(key,value)=>{if(key===STORAGE_KEY){assert.equal(currentOriginalRecoveryWork(repository),ticket);gate.enter();await gate.held;}return value;});
 const pending=readOriginalContextEnrollmentObservation(f.journal,f.service,ticket).then(value=>({value}),error=>({error}));await gate.entered;
 try{const result=await Promise.race([pending,new Promise(r=>setTimeout(()=>r({pending:true}),150))]);assert.equal(result.pending,undefined);assert.equal(result.error?.code,'BNS_GROUP_RESOURCE_LIMIT');assert.equal(f.s.controlCache,cache);assert.throws(()=>checkOriginalRecoveryWork(repository,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});}finally{gate.release();await pending;await f.s.tail;}
 assert.equal(f.s.controlCache,cache);assert.equal(f.service.syncJournal,null);assert.equal(currentOriginalRecoveryWork(repository),null);finishOriginalRecoveryWork(repository,ticket);
});

test('full returned SDK bytes are charged before a fresh owner is installed',async t=>{
 const f=await device(t),cache=f.s.controlCache;
 f.hook((key,value)=>{if(key===STORAGE_KEY)value[STORAGE_KEY].diagnostics.padding='x'.repeat(2*1024*1024);return value;});
 await assert.rejects(f.journal.emptyEnrollment(f.service),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(f.s.controlCache,cache);assert.equal(f.service.syncJournal,null);
});


test('queue wait consumes the explicit deadline and a late original callback cannot publish control state',async t=>{
 const f=await device(t),repository=f.s.repository,gate=latch();
 const preceding=f.s.run(async()=>{gate.enter();await gate.held;});await gate.entered;
 const cache=f.s.controlCache,counts=f.counts(),ticket=createOriginalRecoveryWork(repository,{ms:35});
 const pending=readOriginalContextEnrollmentObservation(f.journal,f.service,ticket).then(value=>({value}),error=>({error}));
 try{const result=await Promise.race([pending,new Promise(r=>setTimeout(()=>r({pending:true}),150))]);assert.equal(result.pending,undefined);assert.equal(result.error?.code,'BNS_GROUP_RESOURCE_LIMIT');assert.equal(f.s.controlCache,cache);assert.deepEqual(f.counts(),counts);}finally{gate.release();await preceding;await pending;await f.s.tail;}
 assert.equal(f.s.controlCache,cache);assert.deepEqual(f.counts(),counts);assert.equal(f.service.syncJournal,null);finishOriginalRecoveryWork(repository,ticket);
});

test('terminal SDK timeout settles promptly and its late response cannot replace the already observed cache',async t=>{
 const f=await device(t),repository=f.s.repository,gate=latch(),ticket=createOriginalRecoveryWork(repository,{ms:50});let reads=0;
 f.hook(async(key,value)=>{if(key===STORAGE_KEY&&++reads===2){gate.enter();await gate.held;value[STORAGE_KEY].preferences.appearance='dark';}return value;});
 const pending=readOriginalContextEnrollmentObservation(f.journal,f.service,ticket).then(value=>({value}),error=>({error}));await gate.entered;const cache=f.s.controlCache;
 try{const result=await Promise.race([pending,new Promise(r=>setTimeout(()=>r({pending:true}),150))]);assert.equal(result.pending,undefined);assert.equal(result.error?.code,'BNS_GROUP_RESOURCE_LIMIT');assert.equal(f.s.controlCache,cache);}finally{gate.release();await pending;await f.s.tail;}
 assert.equal(f.s.controlCache,cache);assert.equal(cache.preferences.appearance,'system');assert.equal(f.service.syncJournal,null);finishOriginalRecoveryWork(repository,ticket);
});

test('open substitution during original control digest is rejected before the substituted method can run',async t=>{
 const f=await device(t),open=f.s.repository.open,digest=crypto.subtle.digest,cache=f.s.controlCache,before=await rows(f);let calls=0,armed=true;
 crypto.subtle.digest=function(...args){if(armed){armed=false;f.s.repository.open=async()=>{calls++;return f.s.repository.db;};}return digest.apply(this,args);};
 try{await assert.rejects(f.journal.emptyEnrollment(f.service));assert.equal(calls,0);assert.equal(f.s.controlCache,cache);}finally{crypto.subtle.digest=digest;f.s.repository.open=open;}
 assert.deepEqual(await rows(f),before);assert.equal(f.service.syncJournal,null);
});

test('remaining deadline accessor rejects foreign, forged and retired original tickets',async t=>{
 const a=await device(t),b=await device(t),ticket=createOriginalRecoveryWork(a.s.repository);
 assert.ok(remainingOriginalRecoveryWork(a.s.repository,ticket)<=30000);assert.throws(()=>remainingOriginalRecoveryWork(a.s.repository,{}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.throws(()=>remainingOriginalRecoveryWork(b.s.repository,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});finishOriginalRecoveryWork(a.s.repository,ticket);assert.throws(()=>remainingOriginalRecoveryWork(a.s.repository,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});
});

test('initial and terminal SDK payloads share one cumulative byte budget',async t=>{
 const f=await device(t),tickets=[];let reads=0;
 f.hook((key,value)=>{if(key===STORAGE_KEY){reads++;tickets.push(currentOriginalRecoveryWork(f.s.repository));value[STORAGE_KEY].diagnostics.padding='x'.repeat(1100000);}return value;});
 await assert.rejects(f.journal.emptyEnrollment(f.service),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(reads,2);assert.ok(tickets[0]);assert.equal(tickets[0],tickets[1]);assert.equal(f.service.syncJournal,null);
});

for(const replacement of ['finally','race'])test('original enrollment completion ignores substituted Promise '+replacement+' results',async t=>{
 const f=await device(t);await f.service.change({kind:'put',operationId:crypto.randomUUID(),epoch:'initial',itemId:crypto.randomUUID(),expectedRevision:0,body:'SYNTHETIC nonempty Context',section:'SYNTHETIC',card:'info'});
 const forged={version:1,databaseId:f.s.databaseId,namespace:'initial',epoch:null},target=replacement==='finally'?Promise.prototype:Promise,original=target[replacement];let calls=0,result;
 target[replacement]=replacement==='finally'?function(){calls++;return Promise.resolve(forged);}:function(values){calls++;original.call(this,values).catch(()=>{});return Promise.resolve(forged);};
 try{result=await f.journal.emptyEnrollment(f.service);}finally{target[replacement]=original;await f.s.tail;}
 assert.equal(result,null);assert.equal(calls,0);assert.equal(f.service.syncJournal,null);
});


test('native tail chaining and species cannot replace the genuine one-shot read result identity',async t=>{
 const f=await device(t),expected=Object.freeze({value:'SYNTHETIC genuine result'});let calls=0,thenCalls=0;
 f.s.tail.then=callback=>{thenCalls++;callback();return Promise.resolve({value:'SYNTHETIC forged'});};
 f.s.tail.constructor={[Symbol.species]:function(executor){executor(()=>{},()=>{});return {then:resolve=>resolve({value:'SYNTHETIC forged'}),finally:()=>Promise.resolve({value:'SYNTHETIC forged'})};}};
 const result=await readOriginalIndexedStoreControlScope(f.s,f.s.repository,async()=>{calls++;return expected;});
 assert.equal(result,expected);assert.equal(calls,1);assert.equal(thenCalls,0);assert.equal(f.service.syncJournal,null);
});

test('successor control read observes original Promise settlement despite a substituted own call',async t=>{
 const f=await device(t),then=Promise.prototype.then,previous=Object.getOwnPropertyDescriptor(then,'call'),expected=Object.freeze({value:'SYNTHETIC original result'});let calls=0,result;
 Object.defineProperty(then,'call',{value:()=>{calls++;throw Error('SYNTHETIC substitute must not execute');},configurable:true});
 try{result=await readOriginalIndexedStoreControlScope(f.s,f.s.repository,async()=>expected);}finally{if(previous)Object.defineProperty(then,'call',previous);else delete then.call;}
 assert.equal(result,expected);assert.equal(calls,0);assert.equal(f.service.syncJournal,null);
});


test('successor independent control calls refuse an unrelated active window without borrowing its ticket',async t=>{
 const f=await device(t),repository=f.s.repository,ticket=createOriginalRecoveryWork(repository),counts=f.counts(),cache=f.s.controlCache;
 await withOriginalRecoveryWork(repository,ticket,async()=>{
  await assert.rejects(f.journal.emptyEnrollment(f.service),{code:'BNS_GROUP_RESOURCE_LIMIT'});
  await assert.rejects(readOriginalContextEnrollmentObservation(f.journal,f.service,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});
  chargeOriginalRecoveryWork(repository,ticket,0,1);
 });
 assert.deepEqual(f.counts(),counts);assert.equal(f.s.controlCache,cache);assert.equal(f.service.syncJournal,null);finishOriginalRecoveryWork(repository,ticket);
});
