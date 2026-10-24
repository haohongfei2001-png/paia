import test from 'node:test';
import assert from 'node:assert/strict';
import {assertApplicationWorkerAdmission,createApplicationWorkerActivity} from '../background/application-selection-commands.js';
import {selectionAdmissionWorker,deferred,tick} from './harness/selection-admission-worker.mjs';

test('actual worker page hold covers early Prompt, Import, Sync, settings and capture ingress',async t=>{
 const w=await selectionAdmissionWorker(t);await w.addPage();const token=await w.bridge.editors.freezeExtensionPages(w.sender.documentId);t.after(()=>w.bridge.editors.release(token));
 const calls=[];for(const [name,owner]of Object.entries(w.bridge.owners)){const original=owner.handle;owner.handle=function(...args){calls.push(name);return original.apply(this,args);};}
 const before=(await w.bridge.store.status()).epoch;
 for(const [type,extra] of [['PAIA_PROMPT_QUERY',{}],['PAIA_PROMPT_ASSIST_OFFER',{}],['PAIA_PROMPT_NEXT_OFFER',{}],['PAIA_PROMPT_SURFACE_HOST',{}],['PAIA_ARCHIVE_ARRIVAL_OPEN',{}],['PAIA_MAINTENANCE_PROCESSING_CONFIGURE',{enabled:true}],['IMPORT_BEGIN',{}],['CAPTURE',{}],['UPDATE_PREFERENCES',{changes:{appearance:'dark'}}],['PAIA_SYNC_RESUME',{}]]){
  const result=await w.rpc(type,extra);assert.equal(result.ok,false,type);assert.notEqual(result.error,'INVALID_REQUEST',type+' is denied before owner parsing');
 }
 assert.deepEqual(calls,[]);assert.equal((await w.bridge.store.status()).epoch,before);
 assert.equal((await w.rpc('GET_STATUS')).ok,true);assert.equal((await w.rpc('SET_ENABLED',{enabled:false})).ok,true);assert.equal((await w.rpc('GET_STATUS')).data.enabled,false);
 // Restriction success never upgrades a page-only receipt to activation.
 for(const type of ['PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_RESTART'])assert.equal((await w.rpc(type)).ok,false);
 w.bridge.editors.release(token);assert.equal((await w.rpc('UPDATE_PREFERENCES',{changes:{appearance:'dark'}})).ok,true);
});

test('original page save remains admitted before its FROZEN acknowledgement and denied afterward',async t=>{
 const w=await selectionAdmissionWorker(t),prepared=deferred(),finish=deferred();await w.addPage({prepare:async()=>{prepared.resolve();await finish.promise;return true;}});
 const pending=w.bridge.editors.freezeExtensionPages(w.sender.documentId);await prepared.promise;
 assert.equal((await w.rpc('UPDATE_PREFERENCES',{changes:{appearance:'dark'}})).ok,true);
 finish.resolve();const token=await pending;t.after(()=>w.bridge.editors.release(token));
 assert.equal((await w.rpc('UPDATE_PREFERENCES',{changes:{appearance:'light'}})).ok,false);w.bridge.editors.release(token);
});

test('actual post-response host notification remains in the worker drain until physical settlement',async t=>{
 const w=await selectionAdmissionWorker(t),started=deferred(),finish=deferred();t.after(()=>finish.resolve());
 w.send(message=>{if(message.type==='PAIA_PROMPT_SURFACE_ACTIVATE'){started.resolve();return finish.promise;}return Promise.resolve();});
 assert.equal((await w.rpc('UPDATE_PREFERENCES',{changes:{appearance:'dark'}})).ok,true);await started.promise;
 let quiet=false;const drain=w.bridge.activity.drain().then(()=>quiet=true);await tick();assert.equal(quiet,false,'UI response is not worker settlement');finish.resolve();await drain;assert.equal(quiet,true);
});

test('original delayed Import notification remains tracked through coalesced replacement',async t=>{
 const w=await selectionAdmissionWorker(t),started=deferred(),finish=deferred();t.after(()=>finish.resolve());w.sent.length=0;
 w.send(message=>{if(message.type==='ARCHIVE_CHANGED'){started.resolve();return finish.promise;}return Promise.resolve();});
 await w.bridge.notifyArchiveChanged('IMPORT_COMMIT');await w.bridge.notifyArchiveChanged('IMPORT_COMMIT');let quiet=false;const drain=w.bridge.activity.drain().then(()=>quiet=true);await tick();assert.equal(quiet,false,'pending original timer is retained');
 const replacement=w.bridge.notifyArchiveChanged('PURGE_SOURCE');await started.promise;await tick();assert.equal(quiet,false);assert.deepEqual(w.sent,[{type:'ARCHIVE_CHANGED',cause:'PURGE_SOURCE'}]);finish.resolve();await replacement;await drain;assert.equal(quiet,true);
});

test('fixed admission exceptions preserve restrictions but never grant a prefix bypass',()=>{
 const guard={blocksMutation:()=>true};
 for(const request of [{type:'CONSENT',accepted:false},{type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled:false},{type:'PAIA_PROMPT_ASSIST_CONFIGURE',replyAccess:false,remoteProcessing:false},{type:'PAIA_MAINTENANCE_PROCESSING_CONFIGURE',enabled:false},{type:'PAIA_AI_FILTER_CONFIGURE',optIn:false,remoteProcessing:false},{type:'PAIA_CONTEXT_CONNECTIONS_CHANGE',options:{action:'pause'}},{type:'PAIA_CONTEXT_CONNECTIONS_CHANGE',options:{action:'revoke'}},{type:'PAIA_SYNC_PAUSE'},{type:'PAIA_SYNC_DISCONNECT'},{type:'IMPORT_PAUSE'},{type:'IMPORT_CANCEL'},{type:'PAIA_PROMPT_SURFACE_RPC',command:{type:'assist_cancel'}},{type:'PAIA_PROMPT_SURFACE_RPC',command:{type:'close'}}])assert.doesNotThrow(()=>assertApplicationWorkerAdmission(guard,request,{}));
 for(const request of [{type:'PAIA_PROMPT_ASSIST_CONFIGURE',replyAccess:true,remoteProcessing:false},{type:'PAIA_AI_FILTER_CONFIGURE',optIn:true,remoteProcessing:false},{type:'PAIA_PROMPT_SURFACE_RPC',command:{type:'close',insert:true}},{type:'GET_NEW_MUTATION'},{type:'PAIA_NEW_STATUS'},{type:'CONSENT',accepted:true},{type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled:true},{type:'PAIA_CONTEXT_CONNECTIONS_CHANGE',options:{action:'reconnect'}},{type:'PAIA_PROMPT_SURFACE_RPC',command:{type:'assist_insert'}}])assert.throws(()=>assertApplicationWorkerAdmission(guard,request,{}),{code:'GENERATION_EDITOR_PROTECTION_REQUIRED'});
});

test('worker activity observes original nested tails and subsequent local drains without issuing a receipt',async()=>{
 const first=deferred(),second=deferred(),local=deferred();let running=local.promise;const activity=createApplicationWorkerActivity({remaining:()=>[running]});activity.track(first.promise.then(()=>{activity.track(second.promise);}));let done=false;const drained=activity.drain().then(value=>{assert.equal(value,undefined);done=true;});first.resolve();await tick();assert.equal(done,false);second.resolve();await tick();assert.equal(done,false);running=null;local.resolve();await drained;assert.equal(done,true);assert.equal('holdApplicationSources'in activity,false);
});

test('actual local maintenance successor remains in worker drain after its first wake settles',async t=>{
 const w=await selectionAdmissionWorker(t),first=deferred(),second=deferred(),started=deferred(),again=deferred();t.after(()=>{first.resolve();second.resolve();});
 const original=w.bridge.store.processLibraryMaintenance;let count=0;
 w.bridge.store.processLibraryMaintenance=async function(...args){count++;if(count===1){started.resolve();await first.promise;}else if(count===2){again.resolve();await second.promise;}return original.apply(this,args);};
 assert.equal((await w.rpc('RETRY_LIBRARY_MAINTENANCE')).ok,true);await started.promise;
 assert.equal((await w.rpc('RETRY_LIBRARY_MAINTENANCE')).ok,true);let quiet=false;const drain=w.bridge.activity.drain().then(()=>quiet=true);
 first.resolve();await again.promise;await tick();assert.equal(quiet,false,'original runner successor is still active');second.resolve();await drain;assert.ok(count>=2);
});

test('actual Import notification timer drains only after its original publication settles',async t=>{
 const w=await selectionAdmissionWorker(t),started=deferred(),finish=deferred();t.after(()=>finish.resolve());w.sent.length=0;
 w.send(message=>{if(message.type==='ARCHIVE_CHANGED'){started.resolve();return finish.promise;}return Promise.resolve();});
 await w.bridge.notifyArchiveChanged('IMPORT_COMMIT');let quiet=false;const drain=w.bridge.activity.drain().then(()=>quiet=true);await started.promise;await tick();assert.equal(quiet,false);assert.deepEqual(w.sent,[{type:'ARCHIVE_CHANGED',cause:'IMPORT_COMMIT'}]);finish.resolve();await drain;
});


test('actual default unopened Store is initialized before original owners bind their lifetime identity',async t=>{
 const w=await selectionAdmissionWorker(t);assert.ok(w.bridge.store.repository.db);assert.equal(typeof w.bridge.store.databaseId,'string');
 const local=await w.bridge.coordination.holdLocalMaintenance();assert.equal(w.bridge.coordination.assertLocalMaintenanceHeld(local),true);assert.equal(w.bridge.coordination.releaseLocalMaintenance(local),true);
 for(const name of ['promptReuse','promptSurface']){
  const owner=w.bridge.owners[name],token=await owner.holdForApplicationSelection();
  assert.equal(owner.applicationSelectionHeld(token),true,name+' binds the original initialized Store');assert.equal(await owner.fenceApplicationSelection(token),true);assert.equal(owner.releaseApplicationSelection(token),true);
 }
 // Correct warm construction is not missing cold/provider proof. The default
 // Assist session remains absent, so full source coordination still refuses.
 await assert.rejects(w.bridge.coordination.holdApplicationSources(),{code:'GENERATION_WORKER_NOT_QUIET'});
 assert.equal((await w.rpc('PAIA_PROMPT_QUERY')).ok,true,'refused full scope did not strand original manual intake');
});

// Provide the real API shape without fabricating a receiver or native success.
test('synthetic worker tab lookup remains unavailable and emits no receiver message',async t=>{
 const w=await selectionAdmissionWorker(t),before=w.sent.length;
 await assert.rejects(w.api.tabs.get(7),{message:'SYNTHETIC_TAB_UNAVAILABLE'});
 assert.equal(w.sent.length,before,'unavailable lookup cannot create a receiver message or ACK');
});
