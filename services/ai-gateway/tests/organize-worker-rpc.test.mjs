import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {organizeServiceFixture} from './organize-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {toolbarRegistrationFixture} from '../../../extension/tests/harness/toolbar-registration.mjs';
import {aiCandidateKey} from '../../../extension/core/organizer/ai-candidate.js';

const source=fileURLToPath(new URL('../../../extension/',import.meta.url));
const registry='core/ai-usage/organize-service-configuration.js';
const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`;
const ui={id,url:origin+'ui/archive.html',frameId:0,documentId:'SYNTHETIC-original-document',tab:{id:7,windowId:9,incognito:false}};

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
 const root=await mkdtemp(join(tmpdir(),'paia-organize-worker-rpc-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await Promise.all(['core','background'].map(path=>cp(join(source,path),join(root,path),{recursive:true})));
 await mkdir(join(root,'ui'));
 await cp(join(source,'ui/input-search.js'),join(root,'ui/input-search.js'));
 await cp(join(source,'package.json'),join(root,'package.json'));
 const key=`SYNTHETIC-organize-worker-${crypto.randomUUID()}`;
 if(configured){
  Object.defineProperty(globalThis,key,{value:f.configuration,configurable:true});
  t.after(()=>delete globalThis[key]);
  await writeFile(join(root,registry),`// Synthetic test-only registry; never shipped.\nexport function readOrganizeServiceConfiguration(){return globalThis[${JSON.stringify(key)}];}\n`);
 }
 const changed=[];
 for(const path of await files(root))if(!(await readFile(join(root,path))).equals(await readFile(join(source,path))))changed.push(path);
 assert.deepEqual(changed,configured?[registry]:[],'only the packaged registry may differ from production source');

 const prior=Object.fromEntries(['chrome','indexedDB','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(()=>{for(const [key,descriptor]of Object.entries(prior)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 globalThis.indexedDB=f.indexedDB;
 globalThis.fetch=async()=>assert.fail('worker must never use an external network');
 let listener;const notices=[],isolation=[];
 const storage={...f.storage,setAccessLevel:async options=>isolation.push(options),getBytesInUse:async()=>0};
 globalThis.chrome={runtime:{id,getURL:path=>origin+path,getManifest:()=>({version:'0.55.0'}),sendMessage:async message=>notices.push(message),onMessage:{addListener:fn=>{assert.equal(listener,undefined,'one original worker RPC listener');listener=fn;}}},storage:{local:storage,session:{setAccessLevel:async()=>{},get:async()=>({}),set:async()=>{},remove:async()=>{}}}};
 toolbarRegistrationFixture(globalThis.chrome);
 const onUpdated=new Set(),onRemoved=new Set();
 const event=listeners=>({addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)});
 globalThis.chrome.tabs={get:async tabId=>{assert.equal(tabId,ui.tab.id);return {...ui.tab,url:ui.url};},onUpdated:event(onUpdated),onRemoved:event(onRemoved)};
 globalThis.chrome.runtime.getContexts=async()=>[{contextType:'TAB',documentId:ui.documentId,documentUrl:ui.url,tabId:ui.tab.id,windowId:ui.tab.windowId,frameId:0,incognito:false}];
 await import(pathToFileURL(join(root,'background/service-worker.js')).href);
 assert.equal(typeof listener,'function');
 const send=(request,sender=ui)=>new Promise(resolve=>assert.equal(listener(request,sender,resolve),true,'original asynchronous runtime.onMessage contract'));
 const read=()=>send({type:'GET_AI_PRESENTATION_STATUS',options:{topicId:f.topic.id}});
 const initial=await read();assert.equal(initial.ok,true,JSON.stringify(initial));
 assert.deepEqual(isolation,[{accessLevel:'TRUSTED_CONTEXTS'}]);
 return {send,read,notices,close:()=>{for(const fn of onRemoved)fn(ui.tab.id);}};
}

for(const count of [1,40])test(`actual worker RPC (${count} entries): signed service, candidate CAS, original adoption and settled spend`,async t=>{
 const f=await organizeServiceFixture(t,{count}),w=await worker(t,f);
 // The original worker may maintain the derived search-index watermark.
 const humanEntry=({indexedSearchVersion,...entry})=>entry;
 const entriesBefore=(await Promise.all(f.entries.map(e=>f.s.entry(e.id)))).map(humanEntry);
 assert.equal((await w.read()).data.serviceAvailable,true);
 const wrongCallers=[
  {...ui,id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'},
  {...ui,url:origin+'ui/arbitrary.html'},
  {...ui,url:origin+'ui/archive.html?service=synthetic'},
  {...ui,url:origin+'ui/archive.html#arbitrary'},
  {id,url:'https://chatgpt.com/c/SYNTHETIC',frameId:0,tab:{id:7,url:'https://chatgpt.com/c/SYNTHETIC',incognito:false}},
 ];
 for(const sender of wrongCallers)for(const type of ['GET_AI_PRESENTATION_SCOPE','UPDATE_AI_PRESENTATION','GET_AI_PRESENTATION_STATUS','EDIT_AI_PRESENTATION']){
  const reply=await w.send({type,topicId:f.topic.id,options:{topicId:f.topic.id}},sender);
  assert.equal(reply.ok,false);assert.equal(reply.error,'FORBIDDEN');
 }
 assert.equal(f.calls.length,0);assert.equal(f.physical(),0);
 const scoped=await w.send({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}});
 assert.equal(scoped.ok,true,JSON.stringify(scoped));assert.match(scoped.data.scopeBinding,/^[a-f0-9]{64}$/);
 const request={type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:scoped.data.scopeBinding};
 const injected=await w.send({...request,configuration:{origin:'https://untrusted.invalid'}});
 assert.equal(injected.ok,false);assert.equal(injected.error,'INVALID_REQUEST');assert.equal(f.calls.length,0);
 const result=await w.send(request);
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.data.completed,true,JSON.stringify(result));assert.equal(result.data.candidateCreated,true);
 assert.equal(f.physical(),Math.ceil(count/20));assert.equal(result.data.requestCount,f.physical());
 const jobs=await rows(f.s,'organizerJobs'),usage=await rows(f.s,'organizerUsage');
 assert.equal(jobs.length,1);assert.equal(jobs[0].state,'COMMITTED');assert.equal(jobs[0].routeVersion,f.configuration.routeVersion);
 assert.equal(usage.length,f.physical());assert.ok(usage.every(row=>row.executionKind==='server-backed'&&row.attemptCount===1&&row.financialSettlement.state==='SETTLED'&&row.financialSettlement.settledSpendMicros===120));
 const calls=path=>f.calls.filter(call=>call.path===path);
 assert.equal(calls('/api/declarations').filter(call=>call.data.action==='publish').length,f.physical());
 assert.equal(calls('/api/reservations').filter(call=>call.data.action==='reserve').length,f.physical());
 assert.equal(calls('/api/provider').length,f.physical());assert.ok(calls('/api/operation-status').length>=f.physical());
 assert.equal(calls('/api/results').length,1);assert.equal(calls('/api/results')[0].data.result.outcome,'COMMITTED');
 assert.equal(calls('/api/results')[0].data.result.children.length,f.physical());
 assert.equal(f.server.saved().rows.filter(row=>row.resultCommitted===true).length,1);
 assert.equal(f.server.saved().rows.reduce((sum,row)=>sum+row.settlement.usdMicros,0),120*f.physical());
 assert.doesNotMatch(JSON.stringify({jobs,usage}),/SYNTHETIC organize evidence|principalToken|entitlementToken/);
 assert.doesNotMatch(JSON.stringify(calls('/api/results')),/SYNTHETIC organize evidence/);

 const before=await w.read(),candidate=before.data.topics[0].candidate;
 assert.ok(candidate);assert.equal(candidate.stale,false);assert.equal(before.data.topics[0].presentation,null);
 const edit={topicId:f.topic.id,expectedRevision:candidate.expectedRevision,expectedCandidateKey:aiCandidateKey(candidate),candidateDecisions:Object.fromEntries(candidate.changedFields.map(field=>[field,'adopt'])),operationId:crypto.randomUUID()};
 const stale=await w.send({type:'EDIT_AI_PRESENTATION',edit:{...edit,expectedCandidateKey:edit.expectedCandidateKey+'SYNTHETIC-stale'}});
 assert.equal(stale.ok,false);assert.equal(stale.error,'STALE_BASE');
 assert.deepEqual((await w.read()).data.topics[0].candidate,candidate);assert.equal((await w.read()).data.topics[0].presentation,null);
 const adopted=await w.send({type:'EDIT_AI_PRESENTATION',edit});
 assert.equal(adopted.ok,true,JSON.stringify(adopted));assert.equal(adopted.data.hasCurrent,true);assert.deepEqual(adopted.data.adopted,candidate.changedFields);assert.equal(adopted.data.revision,candidate.expectedRevision+1);
 const after=await w.read();assert.equal(after.data.serviceAvailable,true);assert.equal(after.data.topics[0].candidate,null);
 for(const entry of entriesBefore)assert.ok(after.data.topics[0].presentation.currentView.includes(entry.body));
 assert.deepEqual((await Promise.all(f.entries.map(e=>f.s.entry(e.id)))).map(humanEntry),entriesBefore,'derivative adoption cannot edit human Entry bodies or revisions');
 assert.equal(f.physical(),Math.ceil(count/20),'status, rejected CAS and original adoption never dispatch another provider');
 assert.equal(calls('/api/results').length,1);assert.ok(w.notices.some(message=>message.type==='ARCHIVE_CHANGED'&&message.cause==='EDIT_AI_PRESENTATION'));
});

test('untouched packaged worker registry remains unavailable and public messages cannot configure service',async t=>{
 const f=await organizeServiceFixture(t),w=await worker(t,f,{configured:false});
 const status=await w.read();assert.equal(status.data.serviceAvailable,false);assert.equal(status.data.topics[0].candidate,null);
 const scope=await w.send({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}});
 assert.equal(scope.ok,false);assert.equal(scope.error,'AI_SERVICE_UNAVAILABLE');
 for(const supplied of [{},{configuration:{origin:'https://service.invalid'},pro:true}]){
  const update=await w.send({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:'a'.repeat(64),...supplied});
  assert.deepEqual(update,{ok:false,phase:'message_handler',error:'AI_SERVICE_UNAVAILABLE'});
 }
 assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.deepEqual(await rows(f.s,'organizerUsage'),[]);assert.deepEqual(await rows(f.s,'organizerJobs'),[]);
});

for(const kind of ['document','frame','closed'])test('configured original worker refuses a '+kind+' scope ticket before dispatch',async t=>{
 const f=await organizeServiceFixture(t),w=await worker(t,f);
 const scoped=await w.send({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}});
 assert.equal(scoped.ok,true,JSON.stringify(scoped));
 const sender=structuredClone(ui);if(kind==='document')sender.documentId='SYNTHETIC-other-document';if(kind==='frame')sender.frameId=2;if(kind==='closed')w.close();
 const result=await w.send({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:scoped.data.scopeBinding},sender);
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.data.error,'UNAVAILABLE');
 assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.deepEqual(await rows(f.s,'organizerUsage'),[]);assert.deepEqual(await rows(f.s,'organizerJobs'),[]);
});
