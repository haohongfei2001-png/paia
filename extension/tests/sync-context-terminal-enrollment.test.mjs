import test from 'node:test';
import assert from 'node:assert/strict';
import {openConfiguredSyncWorker} from './harness/sync-configured-worker.mjs';
import {fakeGoogleCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
import {local} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,readContextCards} from '../core/context-cards.js';
import {STORAGE_KEY} from '../core/constants.js';
import {readControlPublicationFence,controlPublicationEqual} from '../core/local-control-publication.js';
const binding={subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']};
const ROW='paia-sync-local-lifecycle:v1';
test('genuine second Store Context write during final SDK await cannot persist stale empty enrollment',async t=>{
 const base=local(),cloud=fakeGoogleCheckpointHTTP(binding);let armed=false,scopedReads=0,triggered=false,other,service,observation;
 const id=crypto.randomUUID();
 const storage={async get(key){const value=await base.get(key);if(armed&&!triggered&&key===STORAGE_KEY&&new Error().stack.includes('readLocal')&&++scopedReads===2){
  triggered=true;
  const before=await other.repository.transaction(false,async tx=>({context:await readContextCards(tx),fence:await readControlPublicationFence(tx)}),['meta']),sdkBefore=await base.get(STORAGE_KEY);
  const changed=await service.change({kind:'put',operationId:crypto.randomUUID(),epoch:'initial',itemId:id,expectedRevision:0,body:'SYNTHETIC late original Context',section:'SYNTHETIC',card:'info'});
  const after=await other.repository.transaction(false,async tx=>({context:await readContextCards(tx),fence:await readControlPublicationFence(tx)}),['meta']);
  observation={beforeItems:before.context.items.length,afterItems:after.context.items.length,changeOK:changed.ok,controlFenceUnchanged:controlPublicationEqual(before.fence,after.fence),sdkUnchanged:controlPublicationEqual(sdkBefore,await base.get(STORAGE_KEY)),restoreEpochBefore:before.fence.epoch??null,restoreEpochAfter:after.fence.epoch??null};
 }return value;},async set(value){return base.set(value);}};
 const worker=await openConfiguredSyncWorker({provider:'google-drive',binding,cloud,deviceId:'SYNTHETIC_late_context',storage});t.after(()=>worker.close());
 other=new OrganizerStore(storage,{indexedDB:worker.factory});await other.finishFoundation();await other.status();service=new ContextCardsService(other);t.after(()=>other.repository.close());
 assert.equal((await base.get(ROW))[ROW],undefined);
 armed=true;const resumed=await worker.rpc('PAIA_SYNC_RESUME');armed=false;
 const saved=(await base.get(ROW))[ROW],core=worker.bridge.store.sourceBootstrapJournal.core,head=await core.read('head','contextMutationMember',id),context=await other.repository.transaction(false,readContextCards,['meta']);
 console.log(JSON.stringify({resumed,triggered,scopedReads,...observation,savedEnrollment:saved?.contextEnrollment??null,currentItems:context.items.length,lateItemRepresented:!!head,cloudRequests:cloud.requests.length}));
 assert.equal(triggered,true,'Reached exactly the second bound SDK read in original scope');assert.equal(observation.changeOK,true);assert.equal(observation.beforeItems,0);assert.equal(observation.afterItems,1);assert.equal(observation.controlFenceUnchanged,true);assert.equal(observation.sdkUnchanged,true);assert.equal(head,undefined);assert.equal(cloud.requests.length,0);
 assert.ok(resumed.ok!==true||saved?.contextEnrollment==null,'An empty enrollment receipt must not be persisted after the genuine Context row changed in the post-callback SDK await');
});

import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {ContextMutationSyncJournal} from '../core/browser-native-sync/context-mutation-journal.js';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {readOriginalIndexedStoreControlScope} from '../core/indexed-store.js';
import {currentOriginalRecoveryWork,requireRepositoryTransactionScope,requireRepositoryTransactionSucceeded,readOriginalCommittedTransactionWork} from '../core/idb-repository.js';
async function fixture(t){
 const base=local(),factory=new IDBFactory();let hook=null;
 const storage={async get(key){const value=await base.get(key);return hook?hook(key,value):value;},async set(value){return base.set(value);}};
 const store=new OrganizerStore(storage,{indexedDB:factory});await store.consent(true);await store.finishFoundation();await store.status();
 const core=new BrowserNativeSyncCore(store.repository,{datasetId:'SYNTHETIC_terminal_context',deviceId:crypto.randomUUID()}),journal=new ContextMutationSyncJournal(core,{store}),service=new ContextCardsService(store);
 t.after(()=>store.repository.close());return {store,core,journal,service,base,storage,factory,hook:value=>hook=value};
}

test('original callback runs inside the final readonly fence after both SDK reads on the same ticket',async t=>{
 const f=await fixture(t),repository=f.store.repository,expected=Object.freeze({value:'SYNTHETIC terminal result'}),tickets=[];let reads=0,scope;
 f.hook((key,value)=>{if(key===STORAGE_KEY){reads++;tickets.push(currentOriginalRecoveryWork(repository));}return value;});
 const result=await readOriginalIndexedStoreControlScope(f.store,repository,async tx=>{scope=tx;const identity=requireRepositoryTransactionScope(repository,tx);assert.equal(identity.mode,'readonly');assert.equal(identity.database,repository.db);assert.equal(reads,2);assert.equal(currentOriginalRecoveryWork(repository),tickets[0]);await tx.get('meta','context-cards:v1');return expected;});
 assert.equal(result,expected);assert.equal(reads,2);assert.equal(tickets[0],tickets[1]);requireRepositoryTransactionSucceeded(repository,scope);const work=readOriginalCommittedTransactionWork(repository,scope);assert.ok(work.references>0);assert.ok(work.bytes>0);assert.equal(currentOriginalRecoveryWork(repository),null);
});

test('terminal Context predicate preserves original restore-fence SyncError rather than wrapper STORAGE_FAILED',async t=>{
 const f=await fixture(t),other=new OrganizerStore(f.storage,{indexedDB:f.factory});await other.finishFoundation();await other.status();t.after(()=>other.repository.close());const marker=await f.core.transaction(false,tx=>f.core.idIn(tx,'ownerRecoveryEpoch'),['meta']);let reads=0;
 f.hook(async(key,value)=>{if(key===STORAGE_KEY&&++reads===2){await other.repository.transaction(true,tx=>tx.put('meta',{id:marker,version:1,epoch:'SYNTHETIC_foreign_epoch'}),['meta']);}return value;});
 await assert.rejects(f.journal.emptyEnrollment(f.service),{code:'BNS_RESTORE_EPOCH_CHANGED'});assert.equal(reads,2);assert.equal(f.service.syncJournal,null);
});
