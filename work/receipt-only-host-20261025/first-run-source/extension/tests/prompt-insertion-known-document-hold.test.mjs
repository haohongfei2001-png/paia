// Synthetic original-owner registrations and body-free protocol replies; no real browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
const {PromptInsertionReceipts,PROMPT_INSERTION_RUNTIME,promptInsertionDigest}=await import(process.env.PAIA_KNOWN_DOCUMENT_MODULE||'../background/prompt-insertion-receipts.js');
import {BackupService} from '../core/backup-service.js';
import {chargeOriginalRecoveryWork,tightenOriginalRecoveryWork} from '../core/idb-repository.js';
import {BackupService as HistoricalEncoder} from './harness/historical-backup.mjs';
import {backupMetaAllowed,validateBackupItem} from '../core/backup-format.js';
const uuid=()=>crypto.randomUUID(),url='https://chatgpt.com/c/synthetic-insertion';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t){
 const {s,storage}=await setup(OrganizerStore);await s.finishFoundation();const receiver={tabId:9,windowId:2,documentId:'synthetic-top-document',nonce:uuid()},sender={id:'a'.repeat(32),tab:{id:9,windowId:2},frameId:0,documentId:receiver.documentId,documentLifecycle:'active',url},state={documents:[],controlHook:null,getHook:null,tabs:new Map(),sent:[],outcome:'inserted',sendHook:null,tab:{id:9,windowId:2,url,active:true}},read=()=>s.repository.transaction(false,t=>t.get('meta',PROMPT_INSERTION_RUNTIME),['meta']);
 let owner;
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://'+sender.id+'/'+p,sendMessage:async()=>{}},storage:{local:storage,onChanged:event()},windows:{get:async()=>({focused:true})},tabs:{get:async id=>{if(state.getHook)await state.getHook(id);return {...(state.tabs.get(id)||state.tab)};},sendMessage:async(tabId,m,options)=>{if(m.type.startsWith('PAIA_PROMPT_INSERTION_DOCUMENT_')){state.documents.push(structuredClone({tabId,m,options}));assert.equal(options.documentId,m.receiver.documentId);if(state.controlHook)return state.controlHook(m,tabId);return m.type.endsWith('RELEASE')?{version:1,released:true,challenge:m.challenge}:{version:1,held:true,receiver:m.receiver,ownerToken:m.ownerToken,domainDigest:m.domainDigest,challenge:m.challenge,remainingMs:30000};}if(m.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE'){if(state.probeHook)return state.probeHook(m,options);return {version:1,nonce:receiver.nonce,profile:'receipt-only-v1'};}if(m.type==='PAIA_PROMPT_INSERTION_EPOCH_RETIRE'){state.retired=m;if(state.retireHook)return state.retireHook(m);return {retired:true};}assert.equal(options.documentId,receiver.documentId);const row=await read();assert.equal(row.claims.find(c=>c.envelope.claimId===m.insertionReceipt.claimId).state,'pending');state.sent.push(structuredClone(m));if(state.sendHook)return state.sendHook(m);await (state.activeOwner??owner).handleQualify({type:'PAIA_PROMPT_INSERTION_QUALIFY',version:1,envelope:m.insertionReceipt},sender);return {status:state.outcome==='inserted'?'inserted':state.outcome==='not_inserted'?'failed':'uncertain',verified:state.outcome==='inserted',insertionAck:{version:1,envelope:m.insertionReceipt,outcome:state.outcome}};}}};
 owner=new PromptInsertionReceipts(s,api);let cap;const register=owner.registerProducer;owner.registerProducer=function(...args){cap=register.apply(this,args);return cap;};const service=new PromptReuseService(s),producer=new PromptReuseCommands(service,api,{insertionReceipts:owner});delete owner.registerProducer;
 await owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:receiver.nonce},sender);
 const binding=async()=>({receiptEpoch:owner.admissionEpoch(cap),receiver,sourceDigest:await owner.digest(['manual','synthetic expression']),authorizationDigest:await owner.digest(['consent',true]),initiatorDigest:await owner.digest(['private-frame',uuid()])});
 const action=async()=>{const d=await binding();return {d,action:await owner.issueAction(cap,d)};};
 const dispatch=(a,current=async()=>{})=>owner.dispatch(cap,{action:a.action,sourceDigest:a.d.sourceDigest,authorizationDigest:a.d.authorizationDigest,initiatorDigest:a.d.initiatorDigest,receiver,message:{type:'PAIA_PROMPT_INSERT_SELECTED',text:'synthetic expression',url,operationId:a.action.operationId}},current);
 t.after(()=>{owner.dispose();producer.dispose();});return {s,storage,owner,cap,producer,api,state,read,receiver,sender,action,dispatch};
}

const proof=m=>({version:1,held:true,receiver:m.receiver,ownerToken:m.ownerToken,domainDigest:m.domainDigest,challenge:m.challenge,remainingMs:30000});
const released=m=>({version:1,released:true,challenge:m.challenge});
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};
async function add(f,id=10){const receiver={tabId:id,windowId:2,documentId:'synthetic-document-'+id,nonce:uuid()};f.state.tabs.set(id,{id,windowId:2,url,active:true});await f.owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:receiver.nonce},{...f.sender,tab:{id,windowId:2},documentId:receiver.documentId});return receiver;}

test('nonempty entire original known map holds and fences readonly without global or legacy claims',async t=>{
 const f=await fixture(t);await add(f);const before=await f.read(),token=await f.owner.holdKnownDocumentsForApplicationSelection();
 assert.equal(f.owner.knownDocumentsHeldForApplicationSelection(token),true);assert.equal(f.owner.applicationSelectionHeld(token),false);assert.equal(f.owner.releaseApplicationSelection(token),false);
 assert.deepEqual(f.state.documents.filter(e=>e.m.type.endsWith('HOLD')).map(e=>e.tabId),[9,10]);assert.equal(await f.owner.fenceKnownDocumentsForApplicationSelection(token),true);
 assert.equal(await f.read(),before);assert.equal((await f.owner.inspect()).legacyCoverageUnknown,true);assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});
 await assert.rejects(f.owner.holdForApplicationSelection(),{code:'PROMPT_INSERTION_HELD'});await assert.rejects(f.owner.holdKnownDocumentsForApplicationSelection(),{code:'PROMPT_INSERTION_HELD'});
 assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection({}),false);assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection(token),true);assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection(token),false);assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('RELEASE')).length,2);assert.equal(f.state.sent.length,0);
});

test('empty cold receiver map cannot become positive proof',async t=>{
 const f=await fixture(t),cold=new PromptInsertionReceipts(f.s,f.api);t.after(()=>cold.dispose());await assert.rejects(cold.holdKnownDocumentsForApplicationSelection(),{code:'PROMPT_INSERTION_CAPABILITY'});assert.equal(f.state.documents.length,0);
});

test('registration admitted before hold cannot change frozen map after its original tabs await',async t=>{
 const f=await fixture(t),entered=deferred(),finish=deferred();let first=true;f.state.getHook=async()=>{if(first){first=false;entered.resolve();await finish.promise;}};
 const registering=f.owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:f.receiver.nonce},f.sender);registering.catch(()=>{});await entered.promise;
 const holding=f.owner.holdKnownDocumentsForApplicationSelection();await assert.rejects(f.owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:f.receiver.nonce},f.sender),{code:'PROMPT_INSERTION_HELD'});
 finish.resolve();await assert.rejects(registering,{code:'PROMPT_INSERTION_HELD'});const token=await holding;assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection(token),true);
});

for(const field of ['window','url','discarded'])test('actual tab '+field+' change refuses without fallback or discovery',async t=>{
 const f=await fixture(t);if(field==='window')f.state.tab.windowId=44;else if(field==='url')f.state.tab.url+='-changed';else f.state.tab.discarded=true;
 let failure;try{await f.owner.holdKnownDocumentsForApplicationSelection();assert.fail();}catch(e){failure=e;}
 assert.equal(f.state.documents.length,0);assert.equal(await f.owner.releaseFailedKnownDocumentsForApplicationSelection(failure),true);
});

for(const field of ['nonce','owner','domain','challenge','zero','overflow','shape','old'])test('document '+field+' reply rejects and every attempted holder has exact cleanup',async t=>{
 const f=await fixture(t);f.state.controlHook=m=>{if(m.type.endsWith('RELEASE'))return released(m);const r=proof(m);if(field==='nonce')r.receiver={...m.receiver,nonce:uuid()};else if(field==='owner')r.ownerToken=uuid();else if(field==='domain')r.domainDigest='f'.repeat(64);else if(field==='challenge')r.challenge=uuid();else if(field==='zero')r.remainingMs=0;else if(field==='overflow')r.remainingMs=30001;else if(field==='shape')r.extra=true;else return undefined;return r;};
 let failure;try{await f.owner.holdKnownDocumentsForApplicationSelection();assert.fail();}catch(e){failure=e;}
 assert.equal(f.owner.releaseFailedApplicationSelection(failure),false);assert.equal(await f.owner.releaseFailedKnownDocumentsForApplicationSelection({...failure}),false);
 assert.equal(await f.owner.releaseFailedKnownDocumentsForApplicationSelection(failure),true);assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('HOLD')).length,1);assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('RELEASE')).length,1);
});

test('negative HOLD followed by unknown RELEASE retains worker admission without retry',async t=>{
 const f=await fixture(t);f.state.controlHook=m=>m.type.endsWith('RELEASE')?{version:1,released:false}:{version:1,held:false};let failure;
 try{await f.owner.holdKnownDocumentsForApplicationSelection();assert.fail();}catch(e){failure=e;}
 assert.equal(await f.owner.releaseFailedKnownDocumentsForApplicationSelection(failure),false);assert.equal(await f.owner.releaseFailedKnownDocumentsForApplicationSelection(failure),false);
 assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('RELEASE')).length,1);
});

test('locally quiet documents cannot cover durable pending UNKNOWN claims',async t=>{
 const f=await fixture(t);f.state.outcome='unknown';await f.dispatch(await f.action());const before=await f.read();let failure;
 try{await f.owner.holdKnownDocumentsForApplicationSelection();assert.fail();}catch(e){failure=e;assert.equal(e.code,'OUTCOME_UNKNOWN');}
 assert.deepEqual(await f.read(),before);assert.equal(await f.owner.releaseFailedKnownDocumentsForApplicationSelection(failure),true);assert.equal((await f.read()).claims[0].state,'pending');
});

test('frozen membership removal invalidates proof and still cleans exact removed receiver',async t=>{
 const f=await fixture(t),token=await f.owner.holdKnownDocumentsForApplicationSelection();f.owner.removeTab(9);assert.equal(f.owner.knownDocumentsHeldForApplicationSelection(token),false);
 assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection(token),true);assert.equal(f.state.documents.at(-1).options.documentId,f.receiver.documentId);
});

for(const kind of ['gate','generation','ledger'])test('original '+kind+' snapshot change refuses fence without repairing it',async t=>{
 const f=await fixture(t);await f.dispatch(await f.action());const token=await f.owner.holdKnownDocumentsForApplicationSelection();await f.s.repository.transaction(true,async tx=>{const id=kind==='ledger'?PROMPT_INSERTION_RUNTIME:kind==='gate'?'gate':'backup-data-generation',row=await tx.get('meta',id);await tx.put('meta',{...row,...(kind==='ledger'?{revision:row.revision+1}:kind==='gate'?{enabled:!row.enabled}:{generation:(row.generation??0)+1})});},['meta']);
 const before=await f.read();await assert.rejects(f.owner.fenceKnownDocumentsForApplicationSelection(token));assert.deepEqual(await f.read(),before);assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection(token),true);
});

test('one timed-out raw HOLD remains tracked and its actual late result triggers only exact cleanup',async t=>{
 const f=await fixture(t),entered=deferred(),late=deferred();f.state.controlHook=m=>{if(m.type.endsWith('RELEASE'))return released(m);entered.resolve();return late.promise;};
 t.mock.timers.enable({apis:['setTimeout']});const holding=f.owner.holdKnownDocumentsForApplicationSelection();holding.catch(()=>{});await entered.promise;t.mock.timers.tick(30001);let failure;try{await holding;assert.fail();}catch(e){failure=e;}
 assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});assert.equal(f.state.documents.length,1);late.resolve(proof(f.state.documents[0].m));await flush();
 assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('HOLD')).length,1);assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('RELEASE')).length,1);assert.equal(await f.owner.releaseFailedKnownDocumentsForApplicationSelection(failure),false);assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});t.mock.timers.reset();
});

test('dispose invalidates proof but retains exact attempted cleanup records',async t=>{
 const f=await fixture(t),token=await f.owner.holdKnownDocumentsForApplicationSelection();f.owner.dispose();assert.equal(f.owner.knownDocumentsHeldForApplicationSelection(token),false);await flush();assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('RELEASE')).length,1);
});

test('original pending insertion ACK can settle while acquiring all document holders',async t=>{
 const f=await fixture(t),entered=deferred(),transport=deferred();let sent;
 f.state.sendHook=m=>{sent=m;entered.resolve();return transport.promise;};const operation=f.dispatch(await f.action());await entered.promise;
 f.state.controlHook=async m=>{if(m.type.endsWith('RELEASE'))return released(m);if(m.type.endsWith('HOLD')){const ack={version:1,envelope:sent.insertionReceipt,outcome:'inserted'};assert.deepEqual(await f.owner.handleAck({type:'PAIA_PROMPT_INSERTION_ACK',ack},f.sender),{settled:true});transport.resolve({insertionAck:ack});}return proof(m);};
 const token=await f.owner.holdKnownDocumentsForApplicationSelection();assert.equal((await operation).status,'inserted');assert.equal((await f.read()).claims[0].state,'inserted');assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection(token),true);assert.equal(f.state.sent.length,1);
});

test('an unresolved release cannot silently open admission or send repeated cleanup',async t=>{
 const f=await fixture(t),entered=deferred(),finish=deferred(),token=await f.owner.holdKnownDocumentsForApplicationSelection();f.state.controlHook=m=>{if(m.type.endsWith('RELEASE')){entered.resolve();return finish.promise;}return proof(m);};
 let done=false;const releasing=f.owner.releaseKnownDocumentsForApplicationSelection(token).then(result=>{done=true;return result;});await entered.promise;await flush();assert.equal(done,false);assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});
 const m=f.state.documents.at(-1).m;finish.resolve(released(m));assert.equal(await releasing,true);assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('RELEASE')).length,1);
});

test('all document acquisitions and repeated fences share the original remaining deadline',async t=>{
 const f=await fixture(t);await add(f);const schedule=globalThis.setTimeout,budgets=[];globalThis.setTimeout=(fn,ms,...args)=>{if(ms>1000)budgets.push(ms);return Reflect.apply(schedule,globalThis,[fn,ms,...args]);};
 try{const token=await f.owner.holdKnownDocumentsForApplicationSelection();await new Promise(resolve=>schedule(resolve,20));await f.owner.fenceKnownDocumentsForApplicationSelection(token);assert.ok(budgets.length>8);assert.ok(budgets.every(ms=>ms<=30000));for(let i=1;i<budgets.length;i++)assert.ok(budgets[i]<=budgets[i-1]+1);assert.ok(budgets.at(-1)<budgets[0]-10);assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection(token),true);}finally{globalThis.setTimeout=schedule;}
});

test('unobservable original HOLD Promise never permits cleanup to reopen admission',async t=>{
 const f=await fixture(t),pending=deferred();Object.defineProperty(pending.promise,'constructor',{value:{get [Symbol.species](){throw Error('synthetic unobservable raw transport');}}});
 f.state.controlHook=m=>m.type.endsWith('RELEASE')?released(m):pending.promise;let failure;
 // sendMessage is async in the normal fixture, so preserve its actual raw Promise via a new original owner.
 f.owner.dispose();f.producer.dispose();const prior=f.api.tabs.sendMessage;f.api.tabs.sendMessage=(...args)=>args[1].type.endsWith('DOCUMENT_HOLD')?pending.promise:Reflect.apply(prior,f.api.tabs,args);
 const owner=new PromptInsertionReceipts(f.s,f.api);t.after(()=>owner.dispose());await owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:f.receiver.nonce},f.sender);
 try{await owner.holdKnownDocumentsForApplicationSelection();assert.fail();}catch(e){failure=e;}
 assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('RELEASE')).length,0);assert.equal(await owner.releaseFailedKnownDocumentsForApplicationSelection(failure),false);await assert.rejects(owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:f.receiver.nonce},f.sender),{code:'PROMPT_INSERTION_HELD'});pending.resolve(undefined);await flush();assert.equal(f.state.documents.filter(e=>e.m.type.endsWith('RELEASE')).length,0);
});


test('actual frozen receiver URL bytes consume the one original work budget before HOLD',async t=>{
 const f=await fixture(t);f.state.tab.url='https://chatgpt.com/c/'+ 'x'.repeat(2*1024*1024);await f.owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:f.receiver.nonce},{...f.sender,url:f.state.tab.url});
 await assert.rejects(f.owner.holdKnownDocumentsForApplicationSelection(),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(f.state.documents.length,0);
});

test('each original tabs identity response charges actual URL bytes rather than a fixed allowance',async t=>{
 const f=await fixture(t);f.state.tab.url='https://chatgpt.com/c/'+ 'x'.repeat(300000);await f.owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:f.receiver.nonce},{...f.sender,url:f.state.tab.url});
 const token=await f.owner.holdKnownDocumentsForApplicationSelection();await assert.rejects(f.owner.fenceKnownDocumentsForApplicationSelection(token),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(f.owner.knownDocumentsHeldForApplicationSelection(token),false);assert.equal(await f.owner.releaseKnownDocumentsForApplicationSelection(token),false);assert.throws(()=>f.owner.admissionEpoch(f.cap),{code:'PROMPT_INSERTION_HELD'});
});
