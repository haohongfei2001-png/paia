import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {toolbarRegistrationFixture} from '../../../extension/tests/harness/toolbar-registration.mjs';
import {capture,inputEdit} from '../../../extension/tests/harness/thought-m1.mjs';
import {providerFixture} from './provider-fixtures.mjs';
import {publicationProtocol} from './client-declaration-fixtures.mjs';
import {createDeclarationHandler} from '../client-declaration-entry.mjs';
import {createGatewayHandler} from '../request-entry.mjs';
import {createProviderHandler} from '../provider-entry.mjs';
import {createResultHandler} from '../result-entry.mjs';
import {createPostgresResultService} from '../result-service.mjs';
import {createOperationStatusHandler} from '../operation-status-entry.mjs';
import {createPostgresOperationStatusService} from '../operation-status-service.mjs';
import {createMaintenanceRunner} from '../../../extension/core/ai-usage/maintenance-runner.js';


const source=fileURLToPath(new URL('../../../extension/',import.meta.url));
const registry='core/ai-usage/maintenance-service-configuration.js';
const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`;
const ui={id,url:origin+'ui/archive.html'};

async function files(root,relative=''){
 const result=[];
 for(const entry of await readdir(join(root,relative),{withFileTypes:true})){
  const path=join(relative,entry.name);
  if(entry.isDirectory())result.push(...await files(root,path));else result.push(path);
 }
 return result.sort();
}

// The worker and all its owners execute their original bytes. Only the packaged
// source-owned registry is substituted, before worker construction. Neither a
// message field nor the fixture's directly constructed runner supplies authority.
// Chrome below only registers listeners and provides synthetic local storage.
// The production store uses fake-indexeddb, and signed handlers use synthetic
// SQL/HTTPS adapters. This is not native Chrome, PostgreSQL or live-Qwen proof.
async function worker(t,f,{configured=true}={}){
 const root=await mkdtemp(join(tmpdir(),'paia-maintenance-worker-rpc-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await Promise.all(['core','background'].map(path=>cp(join(source,path),join(root,path),{recursive:true})));
 await mkdir(join(root,'ui'));
 await cp(join(source,'ui/input-search.js'),join(root,'ui/input-search.js'));
 await cp(join(source,'package.json'),join(root,'package.json'));
 const key=`SYNTHETIC-maintenance-worker-${crypto.randomUUID()}`;let workerStore;
 if(configured){
  Object.defineProperty(globalThis,key,{value:store=>{workerStore=store;const c=f.configuration,p=c.processing,v=c.service.context.processingVerifier;return {...c,processing:{resolve:async(t,scope)=>({...await p.resolve(t,scope),store}),isCurrent:r=>p.isCurrent({...r,store:f.s},f.s)},service:{...c.service,context:{...c.service.context,processingVerifier:{verify:async(caller,_store,scope)=>({...await v.verify(caller,f.s,scope),store}),isCurrent:(caller,r)=>v.isCurrent(caller,{...r,store:f.s},f.s)}}}};},configurable:true});
  t.after(()=>delete globalThis[key]);
  await writeFile(join(root,registry),`// Synthetic test-only registry; never shipped.\nexport function readMaintenanceServiceConfiguration(store){return globalThis[${JSON.stringify(key)}](store);}\n`);
 }
 const changed=[];
 for(const path of await files(root))if(!(await readFile(join(root,path))).equals(await readFile(join(source,path))))changed.push(path);
 assert.deepEqual(changed,configured?[registry]:[],'only the packaged registry may differ from production source');

 const prior=Object.fromEntries(['chrome','indexedDB','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(()=>{for(const [key,descriptor]of Object.entries(prior)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 globalThis.indexedDB=f.indexedDB;
 globalThis.fetch=async()=>assert.fail('worker must never use an external network');
 let listener,startup;const notices=[],isolation=[];
 const storage={...f.storage,setAccessLevel:async options=>isolation.push(options),getBytesInUse:async()=>0};
 globalThis.chrome={runtime:{id,getURL:path=>origin+path,getManifest:()=>({version:'0.55.0'}),sendMessage:async message=>notices.push(message),onStartup:{addListener:fn=>{startup=fn;}},onMessage:{addListener:fn=>{assert.equal(listener,undefined,'one original worker RPC listener');listener=fn;}}},storage:{local:storage,session:{setAccessLevel:async()=>{},get:async()=>({}),set:async()=>{},remove:async()=>{}}}};
 toolbarRegistrationFixture(globalThis.chrome);
 await import(pathToFileURL(join(root,'background/service-worker.js')).href);
 // This is the same file URL used by this exact worker, hence the same private
 // WeakMap. Importing the source checkout module would prove nothing here.
 const {consumeCommittedSemanticWrite}=await import(pathToFileURL(join(root,'core/idb-repository.js')).href);
 assert.equal(typeof listener,'function');
 const send=(request,sender=ui)=>new Promise(resolve=>assert.equal(listener(request,sender,resolve),true,'original asynchronous runtime.onMessage contract'));
 const read=()=>send({type:'GET_STATUS'});
 const initial=await read();assert.equal(initial.ok,true,JSON.stringify(initial));
 assert.deepEqual(isolation,[{accessLevel:'TRUSTED_CONTEXTS'}]);
 return {send,read,notices,startup,store:workerStore,consumeCommittedSemanticWrite};
}


async function finished(f){
 for(let i=0;i<200;i++){const jobs=await rows(f.s,'organizerJobs');if(jobs.some(j=>j.state==='COMMITTED'&&j.resultReport?.state==='ACKNOWLEDGED')){await new Promise(setImmediate);return jobs;}await new Promise(r=>setTimeout(r,10));}
 assert.fail(JSON.stringify({jobs:await rows(f.s,'organizerJobs'),calls:f.calls.map(c=>c.path),physical:f.physical()}));
}
async function until(check,message){for(let i=0;i<200;i++){if(await check())return;await new Promise(r=>setTimeout(r,10));}assert.fail(message);}
const committed=f=>rows(f.s,'organizerJobs').then(jobs=>jobs.filter(j=>j.state==='COMMITTED'&&j.resultReport?.state==='ACKNOWLEDGED').length);
const turn=()=>new Promise(r=>setTimeout(r,100));
const workingEdit=async(w,f,text)=>{
 const input=await f.s.input((await rows(f.s,'inputStates'))[0].id);
 const edit={operationId:crypto.randomUUID(),documentId:input.documentId,blocks:[{id:input.id,expectedRevision:input.revision,libraryText:text,note:input.note,excluded:input.excluded}]};
 const response=await w.send({type:'EDIT_DOCUMENT',edit});assert.equal(response.ok,true,JSON.stringify(response));assert.equal(response.data.ok,true);return edit;
};
const newCapture=async(w,key,text='Synthetic newly captured maintenance obligation '+key)=>{
 const request={type:'CAPTURE',contentVersion:'0.55.0',...capture((await w.read()).data.epoch,key,text)};
 const sender={id,url:request.chat.url,frameId:0,tab:{id:1,url:request.chat.url,incognito:false}};
 const result=await w.send(request,sender);assert.equal(result.ok,true,JSON.stringify(result));return {request,sender,result};
};
// Refresh actual synthetic signed-service authority at the next server instant.
// Preserve the original ledger; do not alter cadence or client admission rules.
// Local processing time stays real; only the service and monotonic hint advance.
function serviceTimeline(t,f){
 let current={...f.configuration},server=f.server,monotonic=0;
 t.mock.method(performance,'now',()=>monotonic);
 for(const key of ['clock','fetch','readProfile','currentProfile','tokenize','readProofs'])f.configuration[key]=(...args)=>current[key](...args);
 return {get server(){return server;},advance(interval=8*3600000){
  const next=providerFixture({at:server.now+interval});next.setSaved(server.saved());
  const validity=structuredClone(next.manifest.profile.validity);Object.assign(next.manifest,structuredClone(f.server.manifest));next.manifest.profile.validity=validity;
  const publication=publicationProtocol(next),publisher=publication.publisher(),runner=next.runner();
  const handlers={'/api/declarations':createDeclarationHandler({publisher}),'/api/reservations':createGatewayHandler({service:next.service}),'/api/provider':createProviderHandler({resolveRunner:()=>({runner,isCurrent:()=>true})}),'/api/results':createResultHandler({service:createPostgresResultService({...next.config,pool:next.reservationPool})}),'/api/operation-status':createOperationStatusHandler({service:createPostgresOperationStatusService({...next.config,pool:next.reservationPool})})};
  current={clock:()=>next.now,readProfile:async()=>structuredClone(next.manifest),currentProfile:()=>structuredClone(next.manifest),tokenize:next.config.tokenize,
   readProofs:async request=>{next.principals.set([request.principalId,request.libraryId].join('/'),next.principal(request));publication.principals.set([request.principalId,request.libraryId].join('/'),next.principal(request));const {request:_,...proofs}=next.bundle(request);return proofs;},
   fetch:async request=>{const path=new URL(request.url).pathname,data=await request.clone().json();f.calls.push({path,data});const response=await handlers[path](request);if(path==='/api/declarations')for(const [id,row]of publication.rows())next.grants.set(id,row);return response;}};
  server=next;monotonic+=interval;return next;
 }};
}

test('active original worker offers fresh capture at the next real service eligibility without restarting',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);
 const next=timeline.advance(),before=f.calls.length,{result}=await newCapture(w,'SYNTHETIC-active-next');assert.equal(result.data.added,1);
 assert.ok((await rows(f.s,'meta')).some(row=>row.id.startsWith('aiu:delta:pending:')),'capture durably retains new semantic work before optional service work');
 await until(()=>f.calls.length>before,'a successful new capture must offer the next eligible Maintenance opportunity');
 await until(async()=>(await rows(f.s,'organizerJobs')).filter(j=>j.state==='COMMITTED'&&j.resultReport?.state==='ACKNOWLEDGED').length===2,'second original domain cycle commits');
 assert.equal(f.physical(),2);assert.equal(next.saved().rows.length,2);assert.ok(next.saved().rows.every(r=>r.resultCommitted===true));
});

test('free reads, preferences, Context access and duplicate capture cannot spend pending work; a real Working edit can',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);
 const input=(await rows(f.s,'inputStates'))[0];await inputEdit(f.s,input.id,{libraryText:'Synthetic pending body before free core actions'});
 timeline.advance();const before=f.calls.length;
 for(const request of [{type:'GET_STATUS'},{type:'GET_STATE'},{type:'GET_INPUT',id:input.id},{type:'FILTER_STATUS'},{type:'PAIA_SETTINGS_AI_STYLE'},{type:'UPDATE_PREFERENCES',changes:{fontSize:'large'}},{type:'UPDATE_PREFERENCES',changes:{aiOrganizeStyle:{version:1,value:'concise',expectedRevision:0,expectedEpoch:'initial'}}},{type:'PAIA_CONTEXT_CARDS_CHANGE',change:{kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key:'global',expectedRevision:0,enabled:true}}])assert.equal((await w.send(request)).ok,true,request.type);
 const duplicate=await newCapture(w,'m1-synthetic-message-001','Synthetic explicit working input');assert.equal(duplicate.result.data.added,0);
 await workingEdit(w,f,'Synthetic pending body before free core actions');
 await turn();assert.equal(f.calls.length,before);assert.equal(f.physical(),1);
 await workingEdit(w,f,'Synthetic genuinely revised body after core operations');
 await until(async()=>await committed(f)===2,'real Working edit offers one eligible opportunity');assert.equal(f.physical(),2);
});

test('capture returns before safety finishes and a same-flight burst waits for original local drains once',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);timeline.advance();
 const before=f.calls.length,original=w.store.processPurgeCleanup.bind(w.store);let release,entered=false,held=true,drains=0;
 const gate=new Promise(r=>{release=r;});t.after(()=>release());
 t.mock.method(w.store,'processPurgeCleanup',async(...args)=>{drains++;if(held){entered=true;await gate;}return original(...args);});
 const first=await newCapture(w,'SYNTHETIC-safety-one');assert.equal(first.result.data.added,1);await until(()=>entered,'original local safety drain was entered');
 const second=await newCapture(w,'SYNTHETIC-safety-two');assert.equal(second.result.data.added,1);assert.equal(f.calls.length,before,'no paid work precedes local safety');
 held=false;release();await until(async()=>await committed(f)===2,'coalesced safe opportunity completes');
 assert.equal(f.physical(),2);assert.ok(drains>=2,'each successful capture still wakes the original local owners');
 const payload=f.calls.filter(c=>c.path==='/api/provider').at(-1).data.payload;assert.equal(payload.material.inputs.length,2);
});

test('a new delta during active provider flight retains the original stale guard, paid result and pending work',async t=>{
 let hold=false,entered=false,release;const gate=new Promise(r=>{release=r;});t.after(()=>release());
 const f=await maintenanceServiceFixture(t,{beforeSend:async()=>{if(hold){entered=true;await gate;}}}),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);
 timeline.advance();hold=true;await newCapture(w,'SYNTHETIC-held-first');await until(()=>entered,'provider held');
 await newCapture(w,'SYNTHETIC-held-later');assert.equal(f.physical(),2);hold=false;release();
 await until(async()=>(await rows(f.s,'organizerUsage')).some(r=>r.state==='EXPIRED_UNCOMMITTED'&&r.financialSettlement?.settledSpendMicros===120),'original stale guard preserves actual paid settlement');await turn();
 assert.equal(f.physical(),2);assert.ok((await rows(f.s,'meta')).some(row=>row.id.startsWith('aiu:delta:pending:')),'later delta is not falsely ACKed');
 assert.equal(await committed(f),1);assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,2);
 await newCapture(w,'SYNTHETIC-after-stale');await turn();assert.equal(f.physical(),2,'new events do not replay the paid stale operation');
});

test('terminal-flight new delta waits for a real later event and elapsed windows are never banked',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f);let hold=false,entered=false,release;
 const gate=new Promise(r=>{release=r;}),fetch=f.configuration.fetch;t.after(()=>release());
 f.configuration.fetch=async request=>{const response=await fetch(request);if(hold&&new URL(request.url).pathname==='/api/results'){entered=true;await gate;}return response;};
 const w=await worker(t,f);await finished(f);timeline.advance();hold=true;
 await newCapture(w,'SYNTHETIC-terminal-first');await until(()=>entered,'original result ACK is held');
 await newCapture(w,'SYNTHETIC-terminal-later');assert.equal(f.physical(),2);hold=false;release();
 await until(async()=>await committed(f)===2,'terminal original job completes');await turn();
 assert.equal(f.physical(),2);assert.ok((await rows(f.s,'meta')).some(row=>row.id.startsWith('aiu:delta:pending:')));
 timeline.advance(3*8*3600000);await turn();assert.equal(f.physical(),2,'elapsed windows install no automatic alarm or catch-up');
 await newCapture(w,'SYNTHETIC-later-opportunity');await until(async()=>await committed(f)===3,'one later real event coalesces pending work');
 assert.equal(f.physical(),3);assert.equal(f.calls.filter(c=>c.path==='/api/provider').at(-1).data.payload.material.inputs.length,2);
});

test('the original protected Context put is an opportunity but its exact no-change correction stays local',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);timeline.advance();const before=f.calls.length;
 const item=(await rows(f.s,'meta')).find(r=>r.id==='context-cards:v1').items[0];
 const response=await w.send({type:'PAIA_CONTEXT_CARDS_CHANGE',change:{kind:'put',operationId:crypto.randomUUID(),epoch:'initial',itemId:item.id,card:item.card,expectedRevision:item.revision,body:item.body,section:item.section}});assert.equal(response.data.ok,true);
 await until(async()=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.unit.key===JSON.stringify(['context_item',item.id])).length===2,'original protection correction is locally ACKed');
 assert.equal(f.calls.length,before);assert.equal(f.physical(),1);assert.ok((await rows(f.s,'organizerUsage')).some(r=>r.executionKind==='local'&&r.attemptCount===0&&r.spendState==='NO_PROVIDER_COST'));
});

test('a failed original safety drain blocks optional Maintenance while capture remains successful',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);timeline.advance();const before=f.calls.length;
 let entered=false;t.mock.method(w.store,'processPurgeCleanup',async()=>{entered=true;throw Error('SYNTHETIC local safety failure');});
 assert.equal((await newCapture(w,'SYNTHETIC-local-safety-failed')).result.data.added,1);await until(()=>entered,'original safety failure observed');await turn();
 assert.equal(f.calls.length,before);assert.equal(f.physical(),1);assert.ok((await rows(f.s,'meta')).some(row=>row.id.startsWith('aiu:delta:pending:')));
});

test('a cloned successful write result cannot offer Maintenance or fail the free core edit',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);timeline.advance();const before=f.calls.length,edit=w.store.editDocument.bind(w.store);
 t.mock.method(w.store,'editDocument',async request=>structuredClone(await edit(request)));
 await workingEdit(w,f,'Synthetic committed edit with an unbranded response');await turn();
 assert.equal(f.calls.length,before);assert.equal(f.physical(),1);assert.ok((await rows(f.s,'meta')).some(row=>row.id.startsWith('aiu:delta:pending:')));
 await w.read();await w.send({type:'FILTER_STATUS'});await turn();assert.equal(f.calls.length,before,'ordinary queries cannot recover an unused write observation');
});

test('default-null runner does not read even scheduling metadata',async t=>{
 const f=await maintenanceServiceFixture(t),runner=createMaintenanceRunner(f.s);t.after(()=>runner.dispose());
 t.mock.method(f.s,'run',()=>assert.fail('unconfigured Maintenance must not read scheduling metadata'));
 assert.equal(runner.consumeSemanticWrite({ok:true}),false);assert.equal((await runner.wake()).state,'UNAVAILABLE');assert.equal(f.calls.length,0);assert.equal(f.physical(),0);
});

test('failed, conflicted and foreign write messages do not offer Maintenance',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);const input=await f.s.input((await rows(f.s,'inputStates'))[0].id);await inputEdit(f.s,input.id,{libraryText:'Synthetic pending work'});timeline.advance();const before=f.calls.length;
 assert.equal((await w.send({type:'EDIT_DOCUMENT',edit:{operationId:crypto.randomUUID(),documentId:input.documentId,blocks:[{id:input.id,expectedRevision:input.revision,libraryText:'Synthetic stale write',note:input.note,excluded:input.excluded}]}})).data.conflict,true);
 assert.equal((await w.send({type:'EDIT_DOCUMENT',edit:{}})).ok,false);
 assert.equal((await w.send({type:'CREATE_LIBRARY_ENTRY',entry:{body:'Synthetic foreign body'}},{id:'foreign',url:ui.url})).ok,false);
 const transaction=w.store.repository.transaction.bind(w.store.repository),records=(await rows(f.s,'records')).length;
 t.mock.method(w.store.repository,'transaction',(write,fn,names)=>transaction(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(name,value,...args)=>{const result=await put(name,value,...args);if(name==='records')throw Error('SYNTHETIC capture rollback');return result;};}return fn(tx);},names));
 const request={type:'CAPTURE',contentVersion:'0.55.0',...capture((await w.read()).data.epoch,'SYNTHETIC-rollback','Synthetic rolled-back capture')};
 assert.equal((await w.send(request,{id,url:request.chat.url,frameId:0,tab:{id:1,url:request.chat.url,incognito:false}})).ok,false);
 assert.equal((await rows(f.s,'records')).length,records,'failed canonical transaction leaves no captured source');
 await turn();assert.equal(f.calls.length,before);assert.equal(f.physical(),1);
});
test('actual packaged worker startup reaches signed Maintenance service and original domain transaction',async t=>{
 const f=await maintenanceServiceFixture(t),w=await worker(t,f);const jobs=await finished(f);assert.equal(jobs.length,1);assert.equal(f.physical(),1);
 assert.equal((await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED').length,2);assert.equal(f.server.saved().rows[0].resultCommitted,true);
 const before=f.calls.length;w.startup();w.startup();await new Promise(r=>setTimeout(r,100));assert.equal(f.calls.length,before);assert.equal(f.physical(),1);
});
test('untouched worker registry has no service activity and public message cannot install Maintenance authority',async t=>{
 const f=await maintenanceServiceFixture(t),w=await worker(t,f,{configured:false});await w.read();
 const reply=await w.send({type:'RUN_AI_MAINTENANCE',configuration:f.configuration});assert.equal(reply.ok,false);
 w.startup();await newCapture(w,'SYNTHETIC-default-null');await workingEdit(w,f,'Synthetic default-null Working edit');await turn();assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.deepEqual(await rows(f.s,'organizerUsage'),[]);
});

test('independent review: a no-op Working save cannot borrow a concurrent pin-only semantic fence',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);
 const input=(await rows(f.s,'inputStates'))[0];await inputEdit(f.s,input.id,{libraryText:'Synthetic pending backlog before no-op save'});timeline.advance();
 const before=f.calls.length,edit=w.store.editDocument.bind(w.store);let pinDone=false,proofChecked=false;
 t.mock.method(w.store,'editDocument',async request=>{await new Promise(setImmediate);if(!pinDone){pinDone=true;const topic=(await rows(f.s,'topics'))[0];await w.store.editTopic({id:topic.id,expectedRevision:topic.revision,changes:{pinned:topic.pinKey!==0},operationId:crypto.randomUUID()});t.diagnostic(JSON.stringify({pinBefore:topic.pinKey,sequence:(await rows(f.s,'meta')).find(r=>r.id==='aiu:delta:sequence')}));}const result=await edit(request);assert.equal(w.consumeCommittedSemanticWrite(w.store.repository,result),false,'this exact committed no-op result has no eligible-delta proof');proofChecked=true;return result;});
 await workingEdit(w,f,'Synthetic pending backlog before no-op save');await new Promise(r=>setTimeout(r,750));
 assert.equal(pinDone,true);assert.equal(proofChecked,true);assert.equal(f.calls.length,before,'neither a no-op save nor a cosmetic pin authorizes spending pending maintenance');assert.equal(f.physical(),1);
});

test('same-value Topic name plus pin-only change in one successful message cannot offer Maintenance',async t=>{
 const f=await maintenanceServiceFixture(t),timeline=serviceTimeline(t,f),w=await worker(t,f);await finished(f);
 const input=(await rows(f.s,'inputStates'))[0];await inputEdit(f.s,input.id,{libraryText:'Synthetic pending backlog before cosmetic message'});timeline.advance();const before=f.calls.length,topic=(await rows(f.s,'topics'))[0],edit=w.store.editTopic.bind(w.store);let proofChecked=false;
 t.mock.method(w.store,'editTopic',async request=>{const result=await edit(request);assert.equal(w.consumeCommittedSemanticWrite(w.store.repository,result),false,'this exact cosmetic-only commit has no eligible-delta proof');proofChecked=true;return result;});
 const response=await w.send({type:'EDIT_LIBRARY_TOPIC',edit:{id:topic.id,expectedRevision:topic.revision,changes:{name:topic.name,pinned:topic.pinKey!==0},operationId:crypto.randomUUID()}});
 assert.equal(response.ok,true);assert.equal(proofChecked,true);assert.ok(response.data.revision>topic.revision);await new Promise(r=>setTimeout(r,750));
 assert.equal(f.calls.length,before);assert.equal(f.physical(),1);
 await newCapture(w,'SYNTHETIC-after-pin-only');await until(async()=>await committed(f)===2,'a later genuine capture still offers exactly one opportunity');assert.equal(f.physical(),2);
});
