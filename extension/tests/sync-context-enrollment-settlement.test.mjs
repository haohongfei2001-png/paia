import test from 'node:test';
import assert from 'node:assert/strict';
import {openConfiguredSyncWorker} from './harness/sync-configured-worker.mjs';
import {fakeGoogleCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
import {local} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,readContextCards} from '../core/context-cards.js';
import {STORAGE_KEY} from '../core/constants.js';
import {readControlPublicationFence,controlPublicationEqual} from '../core/local-control-publication.js';
import {currentOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork} from '../core/idb-repository.js';
const binding={subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']};
const ROW='paia-sync-local-lifecycle:v1';
async function fixture(t){
 const base=local(),cloud=fakeGoogleCheckpointHTTP(binding);let hook=null,worker;
 const storage={async get(key){const value=await base.get(key);if(hook)await hook('get',key,value);return value;},async set(value){if(hook)await hook('set',value);return base.set(value);}};
 worker=await openConfiguredSyncWorker({provider:'google-drive',binding,cloud,deviceId:'SYNTHETIC_context_settlement',storage});t.after(()=>worker.close());
 const other=new OrganizerStore(storage,{indexedDB:worker.factory});await other.finishFoundation();await other.status();const service=new ContextCardsService(other);t.after(()=>other.repository.close());
 const put=async(id=crypto.randomUUID(),expectedRevision=0)=>service.change({kind:'put',operationId:crypto.randomUUID(),epoch:'initial',itemId:id,expectedRevision,body:'SYNTHETIC genuine second Store Context '+expectedRevision,section:'SYNTHETIC',card:'info'});
 return {worker,other,service,put,base,cloud,storage,hook:value=>hook=value,core:worker.bridge.store.sourceBootstrapJournal.core};
}
for(const boundary of ['final-control-read','lifecycle-set'])test(boundary+': changed original Context cannot settle enrollment or report the journal alone as enrolled',async t=>{
 const f=await fixture(t),id=crypto.randomUUID();let scopedReads=0,triggered=false,observation;
 f.hook(async(kind,key)=>{if(triggered||!(boundary==='final-control-read'?kind==='get'&&key===STORAGE_KEY&&new Error().stack.includes('readLocal')&&++scopedReads===2:kind==='set'&&key?.[ROW]?.contextEnrollment))return;
  triggered=true;const before=await f.other.repository.transaction(false,async tx=>({context:await readContextCards(tx),fence:await readControlPublicationFence(tx)}),['meta']),sdkBefore=await f.base.get(STORAGE_KEY);
  const changed=await f.put(id),after=await f.other.repository.transaction(false,async tx=>({context:await readContextCards(tx),fence:await readControlPublicationFence(tx)}),['meta']);
  observation={changeOK:changed.ok,beforeItems:before.context.items.length,afterItems:after.context.items.length,controlFenceUnchanged:controlPublicationEqual(before.fence,after.fence),sdkUnchanged:controlPublicationEqual(sdkBefore,await f.base.get(STORAGE_KEY))};
 });
 const resumed=await f.worker.rpc('PAIA_SYNC_RESUME');f.hook(null);const saved=(await f.base.get(ROW))[ROW],status=await f.worker.rpc('PAIA_SYNC_STATUS');
 console.log(JSON.stringify({boundary,resumed,status,savedEnrollment:saved?.contextEnrollment??null,triggered,...observation,cloudRequests:f.cloud.requests.length}));
 assert.equal(triggered,true);assert.equal(observation.changeOK,true);assert.equal(observation.beforeItems,0);assert.equal(observation.afterItems,1);assert.equal(observation.controlFenceUnchanged,true);assert.equal(observation.sdkUnchanged,true);assert.equal(await f.core.read('head','contextMutationMember',id),undefined);assert.equal(f.cloud.requests.length,0);
 assert.equal(resumed.ok,false,'A late unrepresented Context row must not be reported as successfully enrolled');assert.equal(status.ok,true);assert.equal(status.data.needsContextEnrollment,true);
 if(boundary==='final-control-read')assert.equal(saved,undefined,'No lifecycle write is needed when original qualification refuses before persistence');
 else {assert.ok(saved?.contextEnrollment,'The actual durable SDK write is retained, not claimed absent or blindly rolled back');assert.equal(status.data.state,'settlement-unknown');assert.deepEqual((await f.base.get(ROW))[ROW],saved,'Plain status cannot promote or rewrite the stale receipt');}
});
test('STATUS demotes an empty enrollment after genuine unrepresented Context arrives, without enrolling or editing the receipt',async t=>{
 const f=await fixture(t);assert.equal((await f.worker.rpc('PAIA_SYNC_RESUME')).ok,true);const saved=(await f.base.get(ROW))[ROW],id=crypto.randomUUID();assert.equal((await f.put(id)).ok,true);
 const status=await f.worker.rpc('PAIA_SYNC_STATUS');assert.equal(status.ok,true);assert.equal(status.data.needsContextEnrollment,true);assert.equal(await f.core.read('head','contextMutationMember',id),undefined);assert.deepEqual((await f.base.get(ROW))[ROW],saved);assert.equal(f.cloud.requests.length,0);
});
test('normal empty Resume uses one ticket without lending its active window to SDK persistence',async t=>{
 const f=await fixture(t),tickets=[];let writes=0,rowOperations=0;
 f.hook((kind,key)=>{
  if(kind==='get'&&key===STORAGE_KEY&&new Error().stack.includes('readLocal'))tickets.push(currentOriginalRecoveryWork(f.worker.bridge.store.repository));
  if(kind==='get'&&key===ROW||kind==='set'&&key?.[ROW]){rowOperations++;assert.equal(currentOriginalRecoveryWork(f.worker.bridge.store.repository),null);assert.ok(tickets[0]);checkOriginalRecoveryWork(f.worker.bridge.store.repository,tickets[0]);if(kind==='set')writes++;}
 });
 const resumed=await f.worker.rpc('PAIA_SYNC_RESUME');f.hook(null);assert.equal(resumed.ok,true,JSON.stringify(resumed));assert.equal(resumed.data.needsContextEnrollment,false);assert.equal(writes,2);assert.equal(rowOperations,6);assert.equal(tickets.length,6);assert.ok(tickets[0]);for(const ticket of tickets)assert.equal(ticket,tickets[0]);assert.equal(currentOriginalRecoveryWork(f.worker.bridge.store.repository),null);assert.throws(()=>checkOriginalRecoveryWork(f.worker.bridge.store.repository,tickets[0]),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(f.cloud.requests.length,0);
});

import {createOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork} from '../core/idb-repository.js';
test('successor external Resume refuses an unrelated active ticket before bootstrap or SDK persistence',async t=>{
 const f=await fixture(t),repository=f.worker.bridge.store.repository,ticket=createOriginalRecoveryWork(repository),seen=[];
 f.hook((kind,key)=>{if(kind==='get'&&key===ROW||kind==='set'&&key?.[ROW])seen.push(kind);});
 let resumed;try{await withOriginalRecoveryWork(repository,ticket,async()=>{resumed=await f.worker.rpc('PAIA_SYNC_RESUME');assert.equal(currentOriginalRecoveryWork(repository),ticket);chargeOriginalRecoveryWork(repository,ticket,1,0);});}finally{finishOriginalRecoveryWork(repository,ticket);}
 f.hook(null);assert.equal(resumed.ok,false);assert.equal(resumed.error,'BNS_GROUP_RESOURCE_LIMIT');assert.deepEqual(seen,[]);assert.equal((await f.base.get(ROW))[ROW],undefined);assert.equal(f.cloud.requests.length,0);
});
test('represented item and portable desired access remain enrolled, while stale same-head item changes demote status',async t=>{
 const f=await fixture(t),id=crypto.randomUUID();assert.equal((await f.put(id)).ok,true);assert.equal((await f.worker.rpc('PAIA_SYNC_RESUME')).ok,true);
 const access={kind:'access',operationId:crypto.randomUUID(),epoch:'initial',expectedRevision:0,key:'info',enabled:true};assert.equal((await f.worker.rpc('PAIA_CONTEXT_CARDS_CHANGE',{change:access})).ok,true);
 assert.equal((await f.worker.rpc('PAIA_SYNC_STATUS')).data.needsContextEnrollment,false);assert.equal((await f.worker.rpc('PAIA_SYNC_RESUME')).ok,true);const head=await f.core.read('head','contextMutationMember',id),saved=(await f.base.get(ROW))[ROW];assert.equal(saved.contextEnrollment,null);
 assert.equal((await f.put(id,1)).ok,true);assert.deepEqual(await f.core.read('head','contextMutationMember',id),head);assert.equal((await f.worker.rpc('PAIA_SYNC_STATUS')).data.needsContextEnrollment,true);assert.deepEqual((await f.base.get(ROW))[ROW],saved);assert.equal(f.cloud.requests.length,0);
});
test('a changed represented Context during SDK save remains uncertain even though both snapshots have genuine heads',async t=>{
 const f=await fixture(t);let triggered=false;const id=crypto.randomUUID();
 f.hook(async(kind,value)=>{if(!triggered&&kind==='set'&&value?.[ROW]){triggered=true;const change={kind:'put',operationId:crypto.randomUUID(),epoch:'initial',itemId:id,expectedRevision:0,body:'SYNTHETIC represented concurrent change',section:'SYNTHETIC',card:'info'};assert.equal((await f.worker.rpc('PAIA_CONTEXT_CARDS_CHANGE',{change})).ok,true);}});
 const resumed=await f.worker.rpc('PAIA_SYNC_RESUME');f.hook(null);assert.equal(triggered,true);assert.equal(resumed.ok,false);assert.ok(await f.core.read('head','contextMutationMember',id));const status=await f.worker.rpc('PAIA_SYNC_STATUS');assert.equal(status.data.state,'settlement-unknown');assert.equal(status.data.stopAvailable,true);assert.equal(status.data.needsContextEnrollment,true);assert.equal(f.cloud.requests.length,0);
});
test('exact durable lost SDK acknowledgement still settles once after bounded readback',async t=>{
 const f=await fixture(t);let writes=0;
 f.hook(async(kind,value)=>{if(kind==='set'&&value?.[ROW]){writes++;await f.base.set(value);throw Error('SYNTHETIC committed SDK write acknowledgement lost');}});
 const resumed=await f.worker.rpc('PAIA_SYNC_RESUME');f.hook(null);assert.equal(resumed.ok,true,JSON.stringify(resumed));assert.equal(resumed.data.needsContextEnrollment,false);assert.equal(writes,2);assert.equal((await f.base.get(ROW))[ROW]?.enrollmentSettlement.phase,'confirmed');assert.ok((await f.base.get(ROW))[ROW]?.contextEnrollment);assert.equal(f.cloud.requests.length,0);
});
for(const stop of ['PAUSE','DISCONNECT'])test(stop+' during a committed SDK enrollment write retains the explicit durable stop',async t=>{
 const f=await fixture(t);let enter,release,triggered=false;const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
 f.hook(async(kind,value)=>{if(!triggered&&kind==='set'&&value?.[ROW]?.mode==='active'){triggered=true;await f.base.set(value);enter();await gate;}});
 const pending=f.worker.rpc('PAIA_SYNC_RESUME');await entered;const stopped=f.worker.rpc('PAIA_SYNC_'+stop);await new Promise(resolve=>setImmediate(resolve));release();const [resumed,result]=await Promise.all([pending,stopped]);f.hook(null);
 assert.equal(resumed.ok,false);assert.equal(result.ok,true,JSON.stringify(result));assert.equal((await f.base.get(ROW))[ROW].mode,stop==='PAUSE'?'paused':'disconnected');assert.equal((await f.worker.rpc('PAIA_SYNC_STATUS')).data.state,stop==='PAUSE'?'paused':'disconnected');assert.equal(f.cloud.requests.length,0);
});

test('successor confirmed cold attachment requires a new explicit Resume and never replays the previous attempt',async t=>{
 const f=await fixture(t);assert.equal((await f.worker.rpc('PAIA_SYNC_RESUME')).ok,true);const saved=(await f.base.get(ROW))[ROW],before=await f.other.repository.transaction(false,readContextCards,['meta']),factory=f.worker.factory;
 await f.worker.close();const cold=await openConfiguredSyncWorker({provider:'google-drive',binding,cloud:f.cloud,deviceId:'SYNTHETIC_context_settlement',storage:f.storage,factory});t.after(()=>cold.close());
 assert.equal((await cold.rpc('PAIA_SYNC_STATUS')).data.needsContextEnrollment,true);assert.deepEqual((await f.base.get(ROW))[ROW],saved);assert.deepEqual(await f.other.repository.transaction(false,readContextCards,['meta']),before);assert.equal((await cold.rpc('PAIA_SYNC_NOW')).ok,false);assert.equal(f.cloud.requests.length,0);assert.equal((await cold.rpc('PAIA_SYNC_RESUME')).ok,true);assert.notEqual((await f.base.get(ROW))[ROW].enrollmentSettlement.attempt,saved.enrollmentSettlement.attempt);assert.equal(f.cloud.requests.length,0);
});

test('successor SDK invocation ignores own call properties on the captured get and set functions',async t=>{
 const f=await fixture(t);let calls=0;
 const replacement=()=>{calls++;throw Error('SYNTHETIC substituted call must not execute');};
 Object.defineProperty(f.storage.get,'call',{value:replacement,configurable:true});Object.defineProperty(f.storage.set,'call',{value:replacement,configurable:true});
 let resumed;try{resumed=await f.worker.rpc('PAIA_SYNC_RESUME');}finally{delete f.storage.get.call;delete f.storage.set.call;}
 assert.equal(resumed.ok,true,JSON.stringify(resumed));assert.equal(calls,0);assert.equal((await f.base.get(ROW))[ROW].enrollmentSettlement.phase,'confirmed');assert.equal(f.cloud.requests.length,0);
});

for(const stop of ['PAUSE','DISCONNECT'])test('successor pending enrollment stays UNKNOWN across cold start and explicit '+stop+' does not clear it',async t=>{
 const f=await fixture(t);let changed=false;
 f.hook(async(kind,value)=>{if(!changed&&kind==='set'&&value?.[ROW]?.enrollmentSettlement?.phase==='pending'){changed=true;assert.equal((await f.put()).ok,true);}});
 assert.equal((await f.worker.rpc('PAIA_SYNC_RESUME')).ok,false);f.hook(null);
 const saved=(await f.base.get(ROW))[ROW],factory=f.worker.factory;assert.equal(saved.enrollmentSettlement.phase,'pending');await f.worker.close();
 const cold=await openConfiguredSyncWorker({provider:'google-drive',binding,cloud:f.cloud,deviceId:'SYNTHETIC_context_settlement',storage:f.storage,factory});t.after(()=>cold.close());
 const status=await cold.rpc('PAIA_SYNC_STATUS');assert.equal(status.data.state,'settlement-unknown');assert.equal(status.data.stopAvailable,true);assert.equal(status.data.needsContextEnrollment,true);assert.deepEqual((await f.base.get(ROW))[ROW],saved);
 assert.equal((await cold.rpc('PAIA_SYNC_RESUME')).ok,false);assert.equal((await cold.rpc('PAIA_SYNC_NOW')).ok,false);assert.equal(f.cloud.requests.length,0);
 assert.equal((await cold.rpc('PAIA_SYNC_'+stop)).ok,true);const paused=(await f.base.get(ROW))[ROW];assert.equal(paused.mode,stop==='PAUSE'?'paused':'disconnected');assert.deepEqual(paused.enrollmentSettlement,saved.enrollmentSettlement);assert.equal((await cold.rpc('PAIA_SYNC_STATUS')).data.state,'settlement-unknown');assert.equal(f.cloud.requests.length,0);
});

test('successor legacy lifecycle receipt is preserved but cannot enable cold publication without a fresh Resume',async t=>{
 const f=await fixture(t);assert.equal((await f.worker.rpc('PAIA_SYNC_RESUME')).ok,true);const saved=(await f.base.get(ROW))[ROW];delete saved.enrollmentSettlement;await f.base.set({[ROW]:saved});const factory=f.worker.factory;await f.worker.close();
 const cold=await openConfiguredSyncWorker({provider:'google-drive',binding,cloud:f.cloud,deviceId:'SYNTHETIC_context_settlement',storage:f.storage,factory});t.after(()=>cold.close());
 assert.equal((await cold.rpc('PAIA_SYNC_STATUS')).data.needsContextEnrollment,true);assert.deepEqual((await f.base.get(ROW))[ROW],saved);assert.equal((await cold.rpc('PAIA_SYNC_NOW')).ok,false);assert.equal(f.cloud.requests.length,0);
 assert.equal((await cold.rpc('PAIA_SYNC_RESUME')).ok,true);assert.equal((await f.base.get(ROW))[ROW].enrollmentSettlement.phase,'confirmed');assert.equal(f.cloud.requests.length,0);
});

test('successor Context change during confirmed SDK write cannot become cold enrolled after restart',async t=>{
 const f=await fixture(t);let changed=false;
 f.hook(async(kind,value)=>{if(!changed&&kind==='set'&&value?.[ROW]?.enrollmentSettlement?.phase==='confirmed'){changed=true;assert.equal((await f.put()).ok,true);}});
 assert.equal((await f.worker.rpc('PAIA_SYNC_RESUME')).ok,false);f.hook(null);assert.equal(changed,true);
 const saved=(await f.base.get(ROW))[ROW],factory=f.worker.factory;assert.equal(saved.enrollmentSettlement.phase,'confirmed');assert.equal((await f.worker.rpc('PAIA_SYNC_STATUS')).data.stopAvailable,false);assert.equal((await f.worker.rpc('PAIA_SYNC_PAUSE')).ok,false);assert.deepEqual((await f.base.get(ROW))[ROW],saved);await f.worker.close();
 const cold=await openConfiguredSyncWorker({provider:'google-drive',binding,cloud:f.cloud,deviceId:'SYNTHETIC_context_settlement',storage:f.storage,factory});t.after(()=>cold.close());
 const status=await cold.rpc('PAIA_SYNC_STATUS');assert.equal(status.data.stopAvailable,false);assert.equal(status.data.needsContextEnrollment,true);assert.deepEqual((await f.base.get(ROW))[ROW],saved);assert.equal((await cold.rpc('PAIA_SYNC_NOW')).ok,false);assert.equal(f.cloud.requests.length,0);
});


test('successor pending stop refuses SDK replacement across its original read and keeps UNKNOWN',async t=>{
 const f=await fixture(t);let changed=false;
 f.hook(async(kind,value)=>{if(!changed&&kind==='set'&&value?.[ROW]?.enrollmentSettlement?.phase==='pending'){changed=true;assert.equal((await f.put()).ok,true);}});
 assert.equal((await f.worker.rpc('PAIA_SYNC_RESUME')).ok,false);f.hook(null);const before=(await f.base.get(ROW))[ROW],sdk=f.worker.bridge.store.local,set=sdk.set;let calls=0;
 assert.equal((await f.worker.rpc('PAIA_SYNC_STATUS')).data.stopAvailable,true);
 f.hook((kind,key)=>{if(kind==='get'&&key===ROW)sdk.set=async()=>{calls++;};});
 try{assert.equal((await f.worker.rpc('PAIA_SYNC_PAUSE')).ok,false);}finally{f.hook(null);sdk.set=set;}
 assert.equal(calls,0);assert.deepEqual((await f.base.get(ROW))[ROW],before);assert.equal((await f.worker.rpc('PAIA_SYNC_STATUS')).data.state,'settlement-unknown');assert.equal(f.cloud.requests.length,0);
});
