import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {PromptInsertionReceipts,PROMPT_INSERTION_RUNTIME,promptInsertionDigest} from '../background/prompt-insertion-receipts.js';
import {BackupService} from '../core/backup-service.js';
import {chargeOriginalRecoveryWork,tightenOriginalRecoveryWork} from '../core/idb-repository.js';
import {BackupService as HistoricalEncoder} from './harness/historical-backup.mjs';
import {backupMetaAllowed,validateBackupItem} from '../core/backup-format.js';
const uuid=()=>crypto.randomUUID(),url='https://chatgpt.com/c/synthetic-insertion';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t){
 const {s,storage}=await setup(OrganizerStore);await s.finishFoundation();const receiver={tabId:9,windowId:2,documentId:'synthetic-top-document',nonce:uuid()},sender={id:'a'.repeat(32),tab:{id:9,windowId:2},frameId:0,documentId:receiver.documentId,documentLifecycle:'active',url},state={sent:[],outcome:'inserted',sendHook:null,tab:{id:9,windowId:2,url,active:true}},read=()=>s.repository.transaction(false,t=>t.get('meta',PROMPT_INSERTION_RUNTIME),['meta']);
 let owner;
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://'+sender.id+'/'+p,sendMessage:async()=>{}},storage:{local:storage,onChanged:event()},windows:{get:async()=>({focused:true})},tabs:{get:async()=>({...state.tab}),sendMessage:async(tabId,m,options)=>{if(m.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE'){if(state.probeHook)return state.probeHook(m,options);return {version:1,nonce:receiver.nonce};}if(m.type==='PAIA_PROMPT_INSERTION_EPOCH_RETIRE'){state.retired=m;if(state.retireHook)return state.retireHook(m);return {retired:true};}assert.equal(options.documentId,receiver.documentId);const row=await read();assert.equal(row.claims.find(c=>c.envelope.claimId===m.insertionReceipt.claimId).state,'pending');state.sent.push(structuredClone(m));if(state.sendHook)return state.sendHook(m);await (state.activeOwner??owner).handleQualify({type:'PAIA_PROMPT_INSERTION_QUALIFY',version:1,envelope:m.insertionReceipt},sender);return {status:state.outcome==='inserted'?'inserted':state.outcome==='not_inserted'?'failed':'uncertain',verified:state.outcome==='inserted',insertionAck:{version:1,envelope:m.insertionReceipt,outcome:state.outcome}};}}};
 owner=new PromptInsertionReceipts(s,api);let cap;const register=owner.registerProducer;owner.registerProducer=function(...args){cap=register.apply(this,args);return cap;};const service=new PromptReuseService(s),producer=new PromptReuseCommands(service,api,{insertionReceipts:owner});delete owner.registerProducer;
 await owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:receiver.nonce},sender);
 const binding=async()=>({receiptEpoch:owner.admissionEpoch(cap),receiver,sourceDigest:await owner.digest(['manual','synthetic expression']),authorizationDigest:await owner.digest(['consent',true]),initiatorDigest:await owner.digest(['private-frame',uuid()])});
 const action=async()=>{const d=await binding();return {d,action:await owner.issueAction(cap,d)};};
 const dispatch=(a,current=async()=>{})=>owner.dispatch(cap,{action:a.action,sourceDigest:a.d.sourceDigest,authorizationDigest:a.d.authorizationDigest,initiatorDigest:a.d.initiatorDigest,receiver,message:{type:'PAIA_PROMPT_INSERT_SELECTED',text:'synthetic expression',url,operationId:a.action.operationId}},current);
 t.after(()=>{owner.dispose();producer.dispose();});return {s,storage,owner,cap,producer,api,state,read,receiver,sender,action,dispatch};
}

test('warm hold is readonly, retains legacy unknown, rejects new admissions and does not revive old actions',async t=>{
 const f=await fixture(t),a=await f.action(),before=await f.read(),token=await f.owner.holdForApplicationSelection();
 assert.equal(f.owner.applicationSelectionSourceIs(f.s,f.api),true);assert.equal(f.owner.applicationSelectionSourceIs(f.s,{...f.api}),false);assert.equal(f.owner.applicationSelectionHeld(token),true);assert.equal(await f.owner.fenceApplicationSelection(token),true);
 assert.equal(await f.read(),before);assert.equal((await f.owner.inspect()).legacyCoverageUnknown,true);
 assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});assert.throws(()=>f.dispatch(a),{code:'PROMPT_INSERTION_HELD'});
 await assert.rejects(f.owner.issueAction(f.cap,a.d),{code:'PROMPT_INSERTION_HELD'});
 await assert.rejects(f.owner.resolveReceiver(9,url),{code:'PROMPT_INSERTION_HELD'});
 await assert.rejects(f.owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:f.receiver.nonce},f.sender),{code:'PROMPT_INSERTION_HELD'});
 assert.equal(f.owner.releaseApplicationSelection({}),false);assert.equal(f.owner.releaseApplicationSelection(token),true);assert.equal(f.owner.releaseApplicationSelection(token),false);
 assert.throws(()=>f.dispatch(a));assert.equal((await f.dispatch(await f.action())).status,'inserted');assert.equal(f.state.sent.length,1);
});
test('hold drains already issued physical transport and its original terminal ledger settlement',async t=>{
 const f=await fixture(t),entered=deferred(),release=deferred();let sent;
 f.state.sendHook=m=>{sent=m;entered.resolve();return release.promise;};const operation=f.dispatch(await f.action());await entered.promise;
 let acquired=false;const holding=f.owner.holdForApplicationSelection().then(token=>{acquired=true;return token;});await new Promise(r=>setImmediate(r));assert.equal(acquired,false);
 release.resolve({insertionAck:{version:1,envelope:sent.insertionReceipt,outcome:'inserted'}});assert.equal((await operation).status,'inserted');const token=await holding;
 assert.equal((await f.read()).claims[0].state,'inserted');assert.equal(f.owner.applicationSelectionHeld(token),true);assert.equal(f.state.sent.length,1);f.owner.releaseApplicationSelection(token);
});
test('pending before physical send becomes original not_dispatched and does not send after hold',async t=>{
 const f=await fixture(t),entered=deferred(),release=deferred();let calls=0;
 const operation=f.dispatch(await f.action(),async()=>{if(++calls===2){entered.resolve();await release.promise;}});operation.catch(()=>{});await entered.promise;
 assert.equal((await f.read()).claims[0].state,'pending');const holding=f.owner.holdForApplicationSelection();release.resolve();await assert.rejects(operation);const token=await holding;
 assert.equal((await f.read()).claims[0].state,'not_dispatched');assert.equal(f.state.sent.length,0);assert.equal(f.owner.applicationSelectionHeld(token),true);f.owner.releaseApplicationSelection(token);
});
test('settled transport with unknown native outcome refuses hold until exact original ACK settles',async t=>{
 const f=await fixture(t);f.state.outcome='unknown';await f.dispatch(await f.action());const before=await f.read();let failure;
 try{await f.owner.holdForApplicationSelection();assert.fail();}catch(error){failure=error;assert.equal(error.code,'OUTCOME_UNKNOWN');}
 assert.deepEqual(await f.read(),before);assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});assert.equal(f.owner.releaseFailedApplicationSelection({...failure}),false);
 const ack={version:1,envelope:before.claims[0].envelope,outcome:'inserted'};await assert.rejects(f.owner.handleAck({type:'PAIA_PROMPT_INSERTION_ACK',ack},f.sender),{code:'PROMPT_INSERTION_HELD'});
 assert.equal(f.owner.releaseFailedApplicationSelection(failure),true);assert.deepEqual(await f.owner.handleAck({type:'PAIA_PROMPT_INSERTION_ACK',ack},f.sender),{settled:true});const token=await f.owner.holdForApplicationSelection();assert.equal(f.owner.applicationSelectionHeld(token),true);assert.equal((await f.owner.inspect()).legacyCoverageUnknown,true);assert.equal(f.state.sent.length,1);f.owner.releaseApplicationSelection(token);
});
test('held receiver registration is an actual drain task, not an empty-set completion',async t=>{
 const f=await fixture(t),entered=deferred(),release=deferred(),get=f.api.tabs.get;
 // Construct another original owner with this fixed SDK rather than changing its bound method.
 f.owner.dispose();f.producer.dispose();f.api.tabs.get=async id=>{entered.resolve();await release.promise;return get(id);};const owner=new PromptInsertionReceipts(f.s,f.api);t.after(()=>owner.dispose());
 const registering=owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:f.receiver.nonce},f.sender);await entered.promise;
 let acquired=false;const holding=owner.holdForApplicationSelection().then(token=>{acquired=true;return token;});await new Promise(r=>setImmediate(r));assert.equal(acquired,false);release.resolve();await registering;const token=await holding;assert.equal(owner.applicationSelectionHeld(token),true);owner.releaseApplicationSelection(token);
});
test('timeout keeps the actual underlying transport and pending claim until it really settles',async t=>{
 const f=await fixture(t),entered=deferred(),release=deferred();let sent;
 f.state.sendHook=m=>{sent=m;entered.resolve();return release.promise;};const a=await f.action();t.mock.timers.enable({apis:['setTimeout']});const operation=f.dispatch(a);operation.catch(()=>{});await entered.promise;
 const holding=f.owner.holdForApplicationSelection();holding.catch(()=>{});t.mock.timers.tick(30001);let failure;try{await holding;assert.fail();}catch(error){failure=error;assert.equal(error.code,'OUTCOME_UNKNOWN');}
 assert.equal((await f.read()).claims[0].state,'pending');assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});assert.equal(f.owner.releaseFailedApplicationSelection(failure),true);
 let acquired=false;const again=f.owner.holdForApplicationSelection().then(token=>{acquired=true;return token;});await new Promise(r=>setImmediate(r));assert.equal(acquired,false);
 release.resolve({insertionAck:{version:1,envelope:sent.insertionReceipt,outcome:'inserted'}});await assert.rejects(operation,{code:'BNS_GROUP_RESOURCE_LIMIT'});let secondFailure;try{await again;assert.fail();}catch(error){secondFailure=error;assert.equal(error.code,'OUTCOME_UNKNOWN');}assert.equal((await f.read()).claims[0].state,'pending');f.owner.releaseFailedApplicationSelection(secondFailure);await f.owner.handleAck({type:'PAIA_PROMPT_INSERTION_ACK',ack:{version:1,envelope:sent.insertionReceipt,outcome:'inserted'}},f.sender);const token=await f.owner.holdForApplicationSelection();assert.equal(f.owner.applicationSelectionHeld(token),true);assert.equal(f.state.sent.length,1);f.owner.releaseApplicationSelection(token);t.mock.timers.reset();
});
for(const fact of ['ledger','gate','epoch','generation'])test('fence rejects changed '+fact+' without repairing it',async t=>{
 const f=await fixture(t);await f.dispatch(await f.action());const token=await f.owner.holdForApplicationSelection();
 await f.s.repository.transaction(true,async tx=>{if(fact==='ledger'){const row=await tx.get('meta',PROMPT_INSERTION_RUNTIME);row.revision++;await tx.put('meta',row);}else{const key={gate:'gate',epoch:'recovery-restore-epoch',generation:'backup-data-generation'}[fact],row=await tx.get('meta',key);await tx.put('meta',{...(row??{id:key}),...(fact==='epoch'?{value:'SYNTHETIC_changed'}:fact==='gate'?{enabled:!row.enabled}:{generation:(row?.generation??0)+1})});}},['meta']);
 const before=await f.read().catch(()=>null);await assert.rejects(f.owner.fenceApplicationSelection(token));assert.equal(f.owner.applicationSelectionHeld(token),false);assert.deepEqual(await f.read().catch(()=>null),before);assert.equal(f.owner.releaseApplicationSelection(token),true);
});
test('late registered original continuation invalidates ready hold and remains tracked for a later hold',async t=>{
 const f=await fixture(t),epoch=f.owner.admissionEpoch(f.cap),token=await f.owner.holdForApplicationSelection(),held=deferred();
 f.owner.trackContinuation(f.cap,held.promise,epoch);assert.equal(f.owner.applicationSelectionHeld(token),false);f.owner.releaseApplicationSelection(token);
 let done=false;const next=f.owner.holdForApplicationSelection().then(value=>{done=true;return value;});await new Promise(r=>setImmediate(r));assert.equal(done,false);held.resolve();const fresh=await next;assert.equal(f.owner.applicationSelectionHeld(fresh),true);f.owner.releaseApplicationSelection(fresh);
});
test('original owner identity refuses method and API-object replacement without using forged hold results',async t=>{
 const f=await fixture(t),original=f.api.tabs;f.api.tabs={...original};await assert.rejects(f.owner.holdForApplicationSelection());f.api.tabs=original;
 f.owner.inspect=async()=>({});assert.equal(f.owner.applicationSelectionSourceIs(f.s),false);await assert.rejects(f.owner.holdForApplicationSelection(),{code:'PROMPT_INSERTION_CAPABILITY'});delete f.owner.inspect;assert.equal(f.owner.applicationSelectionSourceIs(f.s),true);
});

import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
for(const path of ['ack','reconcile'])test('an already entered '+path+' original native read drains before the warm fence',async t=>{
 const f=await fixture(t);f.state.outcome='unknown';await f.dispatch(await f.action());const row=await f.read(),ack={version:1,envelope:row.claims[0].envelope,outcome:'inserted'},get=IDBObjectStore.prototype.get,entered=deferred(),release=deferred();let armed=true,released=false;
 IDBObjectStore.prototype.get=function(key){const request=Reflect.apply(get,this,[key]);if(armed&&this.name==='meta'&&key===PROMPT_INSERTION_RUNTIME){armed=false;const objectStore=this;Object.defineProperty(request,'onsuccess',{configurable:true,set(callback){request.addEventListener('success',event=>{const alive=()=>{if(released)return;const next=Reflect.apply(get,objectStore,['SYNTHETIC_hold']);next.onsuccess=alive;};alive();entered.resolve();void release.promise.then(()=>callback.call(request,event));},{once:true});}});}return request;};
 const request=path==='ack'?{type:'PAIA_PROMPT_INSERTION_ACK',ack}:{type:'PAIA_PROMPT_INSERTION_RECONCILE',version:1,ownerToken:f.owner.admissionEpoch(f.cap),recoveryToken:f.owner.admissionEpoch(f.cap),acks:[ack]};
 let operation,holding;try{operation=path==='ack'?f.owner.handleAck(request,f.sender):f.owner.handleReconcile(request,f.sender);await entered.promise;let acquired=false;holding=f.owner.holdForApplicationSelection().then(token=>{acquired=true;return token;});await new Promise(r=>setImmediate(r));assert.equal(acquired,false);released=true;release.resolve();await operation;const token=await holding;assert.equal((await f.read()).claims[0].state,'inserted');assert.equal(f.owner.applicationSelectionHeld(token),true);await assert.rejects(f.owner.handleAck({type:'PAIA_PROMPT_INSERTION_ACK',ack},f.sender),{code:'PROMPT_INSERTION_HELD'});assert.equal(f.state.sent.length,1);f.owner.releaseApplicationSelection(token);}finally{released=true;release.resolve();IDBObjectStore.prototype.get=get;await Promise.allSettled([operation,holding].filter(Boolean));}
});
test('captured SDK invocation ignores own call replacement',async t=>{
 const f=await fixture(t),a=await f.action();let calls=0;
 f.api.tabs.get.call=()=>{calls++;throw Error('SYNTHETIC replaced SDK call');};f.api.tabs.sendMessage.call=f.api.tabs.get.call;
 try{assert.equal((await f.dispatch(a)).status,'inserted');const token=await f.owner.holdForApplicationSelection();assert.equal(await f.owner.fenceApplicationSelection(token),true);assert.equal(f.owner.applicationSelectionHeld(token),true);assert.equal(calls,0);f.owner.releaseApplicationSelection(token);}finally{delete f.api.tabs.get.call;delete f.api.tabs.sendMessage.call;}
});
test('substituted Promise race and finally cannot manufacture drain completion while a real continuation remains pending',async t=>{
 const f=await fixture(t),held=deferred(),race=Promise.race,finallyMethod=Promise.prototype.finally;f.owner.trackContinuation(f.cap,held.promise,f.owner.admissionEpoch(f.cap));let done=false,holding;
 Promise.race=()=>Promise.resolve({});Promise.prototype.finally=function(){return Promise.resolve({});};
 try{holding=f.owner.holdForApplicationSelection().then(value=>{done=true;return value;});await new Promise(r=>setImmediate(r));assert.equal(done,false);}finally{Promise.race=race;Promise.prototype.finally=finallyMethod;held.resolve();}
 const token=await holding;assert.equal(f.owner.applicationSelectionHeld(token),true);f.owner.releaseApplicationSelection(token);
});

for(const kind of ['rejected','unobservable'])test('a '+kind+' original continuation cannot become warm proof after task-set removal',async t=>{
 const f=await fixture(t),epoch=f.owner.admissionEpoch(f.cap),held=deferred();let task;
 if(kind==='unobservable')Object.defineProperty(held.promise,'constructor',{value:{get [Symbol.species](){throw Error('SYNTHETIC unobservable original promise');}},configurable:true});
 task=f.owner.trackContinuation(f.cap,held.promise,epoch);task.catch(()=>{});if(kind==='rejected')held.reject(Error('SYNTHETIC publication result unknown'));else held.resolve();await Promise.allSettled([task]);
 let failure;try{await f.owner.holdForApplicationSelection();assert.fail();}catch(error){failure=error;assert.equal(error.code,'OUTCOME_UNKNOWN');}assert.equal(f.owner.releaseFailedApplicationSelection(failure),true);await assert.rejects(f.owner.holdForApplicationSelection(),{code:'OUTCOME_UNKNOWN'});assert.equal(await f.read(),undefined);
});

// The original asynchronous admission cannot mint a surviving action after a hold.
test('action admission entered before hold cannot mint a usable capability after its native read resumes',async t=>{
 const f=await fixture(t),prior=await f.action(),get=IDBObjectStore.prototype.get,entered=deferred(),release=deferred();let armed=true,released=false;
 IDBObjectStore.prototype.get=function(key){const request=Reflect.apply(get,this,[key]);if(armed&&this.name==='meta'&&key===PROMPT_INSERTION_RUNTIME){armed=false;const objectStore=this;Object.defineProperty(request,'onsuccess',{configurable:true,set(callback){request.addEventListener('success',event=>{const alive=()=>{if(released)return;const next=Reflect.apply(get,objectStore,['SYNTHETIC_hold']);next.onsuccess=alive;};alive();entered.resolve();void release.promise.then(()=>callback.call(request,event));},{once:true});}});}return request;};
 let operation,holding;try{operation=f.owner.issueAction(f.cap,prior.d);operation.catch(()=>{});await entered.promise;holding=f.owner.holdForApplicationSelection();released=true;release.resolve();await assert.rejects(operation,{code:'PROMPT_INSERTION_HELD'});const token=await holding;assert.equal(f.owner.applicationSelectionHeld(token),true);assert.equal(await f.read(),undefined);assert.equal(f.state.sent.length,0);f.owner.releaseApplicationSelection(token);assert.throws(()=>f.dispatch(prior));assert.equal((await f.dispatch(await f.action())).status,'inserted');}finally{released=true;release.resolve();IDBObjectStore.prototype.get=get;await Promise.allSettled([operation,holding].filter(Boolean));}
});
