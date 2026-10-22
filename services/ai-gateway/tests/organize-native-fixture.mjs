// Test-only configuration/observation of the existing signed-service fixture.
// The original worker constructs its own action source and forwards the sender.
import assert from 'node:assert/strict';
import {after} from 'node:test';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {organizeServiceFixture} from './organize-client-fixture.mjs';
import {FakeChatGPT,eventually} from '../../../extension/tests/harness/fake-chatgpt.mjs';
import {rpc,openTopic} from '../../../extension/tests/harness/consumer-ai-browser.mjs';
export {rpc,eventually};
const root=fileURLToPath(new URL('../../../extension/',import.meta.url));
let releaseTemplate=null;
after(async()=>{if(releaseTemplate)await rm(releaseTemplate,{recursive:true,force:true});});
const replaceOnce=(text,from,to)=>{assert.equal(text.split(from).length,2,from);return text.replace(from,to);};
export async function nativeFixture(t,{variant='source',count=1,holdProviderResponse=null,...options}={}){
 const backend=await organizeServiceFixture(t,{count:1,...options});
 const temporary=await mkdtemp(join(tmpdir(),'paia-organize-native-')),staged=join(temporary,'extension');let h;
 t.after(async()=>{if(h)await h.close();await backend.s.repository.close();await rm(temporary,{recursive:true,force:true});});
 if(variant==='release'){if(!releaseTemplate){releaseTemplate=await mkdtemp(join(tmpdir(),'paia-organize-native-release-'));execFileSync(process.env.PYTHON||'python3',[join(root,'scripts/build_current_release.py'),join(releaseTemplate,'extension')],{stdio:'pipe'});}await cp(join(releaseTemplate,'extension'),staged,{recursive:true});}
 else await cp(root,staged,{recursive:true,filter:p=>!['node_modules','work','tests','docs','spikes','.git'].includes(p.slice(root.length).split('/')[0])});
 const data={origin:backend.configuration.origin,profile:backend.configuration.profile,routeVersion:backend.configuration.routeVersion,manifest:backend.server.manifest,now:backend.server.now};
 await writeFile(join(staged,'background/organize-native-test-only.js'),`
import {TopicProcessingAuthority} from '../core/topic-processing-authority.js';
import {TopicProcessingGuard} from '../core/topic-processing.js';
import {createContextScopeWorkBudget} from '../core/context-topic-scope.js';
export function nativeTestConfiguration(store){
 const data=${JSON.stringify(data)},manifest=data.manifest;let live=true,listener;
 let source;
 const transport=async request=>{
  if(request.signal.aborted)throw new DOMException('Aborted','AbortError');
  const id=crypto.randomUUID(),body=Array.from(new Uint8Array(await request.clone().arrayBuffer()));
  return new Promise((resolve,reject)=>{
   const abort=()=>{void chrome.runtime.sendMessage({nativeOrganizeBridge:true,id,abort:true}).catch(()=>{});reject(new DOMException('Aborted','AbortError'));};
   request.signal.addEventListener('abort',abort,{once:true});
   if(request.signal.aborted){request.signal.removeEventListener('abort',abort);abort();return;}
   chrome.runtime.sendMessage({nativeOrganizeBridge:true,id,url:request.url,method:request.method,headers:Object.fromEntries(request.headers),body}).then(result=>{
    if(request.signal.aborted)return;
    if(result?.error)throw Error(result.error);
    resolve(new Response(Uint8Array.from(result.body),{status:result.status,headers:result.headers}));
   }).catch(reject).finally(()=>request.signal.removeEventListener('abort',abort));
  });
 };
 const configuration={origin:data.origin,profile:data.profile,routeVersion:data.routeVersion,clock:()=>data.now,
  resolveAuthority:async(_tx,r)=>({allowed:live,principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),
  onInvalidate:fn=>{listener=fn;return ()=>{};},readProfile:async()=>structuredClone(manifest),currentProfile:()=>structuredClone(manifest),
  tokenize:async q=>({profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:80,protocolOverheadTokens:20,inputTokens:100,expiresAt:data.now+50000}),isCurrentTokenizer:()=>live,
  readProofs:async request=>{const response=await transport(new Request(data.origin+'/test/proofs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)}));if(!response.ok)throw Error('SYNTHETIC proof bridge refused');return response.json();},fetch:transport};
 globalThis.__organizeNative={store,source,senders:[],results:[],revoke(){live=false;listener?.();}};
 globalThis.__organizeNative.installTerminal=(mode,topicId)=>{
  const state={attached:0,hit:0,events:[]},caller=Object.freeze({}),controller=new AbortController(),budget=createContextScopeWorkBudget({database:store.repository.db});let enabled=false;
  const processing={resolve:async(_tx,scope)=>Object.freeze({version:1,store,caller,scope,epoch:'synthetic-native-terminal',processing:true,expiresAt:Date.now()+30000,revocationSignal:controller.signal}),isCurrent:()=>{
   const stack=new Error().stack;
   if(enabled&&mode!=='control'&&!state.hit&&stack.includes('currentFinalAuthorities')&&!stack.includes('runFinalReadFences')){state.hit++;const withdraw=()=>{state.events.push({kind:'invalidate'});source.invalidate();};if(mode==='queued')queueMicrotask(withdraw);else withdraw();}return true;
  }};
  const authority=new TopicProcessingAuthority(store,{processing,caller,binding:{operationId:crypto.randomUUID()},workBudget:budget}),guard=new TopicProcessingGuard(store,{resolveProcessing:(tx,request)=>authority.authorize(tx,request)}),repository=store.repository,transaction=repository.transaction;
  repository.transaction=function(write,fn,...rest){return transaction.call(this,write,async tx=>{const out=await fn(tx);
   if(write&&!state.attached&&out?.type==='AI_ORGANIZE'&&out.state==='COMMITTED'){
    if(!(await tx.get('meta','aiPresentation:'+topicId))?.candidate)throw Error('Missing original candidate transaction');state.attached++;
    for(const kind of ['complete','abort'])tx.tx.addEventListener(kind,event=>state.events.push({kind,trusted:event.isTrusted}),{once:true});
    await guard.processing(tx,[],[topicId]);guard.registerProcessingFinalFence(tx);enabled=true;
   }return out;},...rest);};
  globalThis.__organizeNative.terminal=state;globalThis.__organizeNative.restoreTerminal=()=>{repository.transaction=transaction;authority.release();};
 };
 globalThis.__organizeNative.failNextACK=()=>{
  const original=IDBObjectStore.prototype.put;let fired=false;
  IDBObjectStore.prototype.put=function(row,...args){if(!fired&&this.name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){fired=true;IDBObjectStore.prototype.put=original;throw Error('SYNTHETIC original CAS failure');}return Reflect.apply(original,this,[row,...args]);};
  globalThis.__organizeNative.failedACK=()=>fired;
 };
 return {configuration,observeActionSource(value){source=value;globalThis.__organizeNative.source=value;}};
}
`);
 const workerPath=join(staged,'background/service-worker.js');let worker=await readFile(workerPath,'utf8');
 worker="import {nativeTestConfiguration} from './organize-native-test-only.js';\n"+worker;
 worker=replaceOnce(worker,'const organizeConfiguration=readOrganizeServiceConfiguration();','const nativeTest=nativeTestConfiguration(store);\nconst organizeConfiguration=nativeTest.configuration;');
 worker=replaceOnce(worker,'const aiOrganizer=createConfiguredOrganizeRunner(store,organizeConfiguration,{actionSource:organizeActionSource});','nativeTest.observeActionSource(organizeActionSource);\nconst aiOrganizer=createConfiguredOrganizeRunner(store,organizeConfiguration,{actionSource:organizeActionSource});\nglobalThis.__organizeNative.runner=aiOrganizer;');
 for(const type of ['GET_AI_PRESENTATION_SCOPE','UPDATE_AI_PRESENTATION'])worker=replaceOnce(worker,`case '${type}': return aiOrganizer.handle(request,sender);`,`case '${type}': {globalThis.__organizeNative.lastSender=sender;globalThis.__organizeNative.senders.push({type:request.type,id:sender.id,documentId:sender.documentId,frameId:sender.frameId,url:sender.url,tabId:sender.tab?.id});const result=await aiOrganizer.handle(request,sender);globalThis.__organizeNative.results.push({type:request.type,result});return result;}`);
 await writeFile(workerPath,worker);
 const runnerPath=join(staged,'core/organizer/configured-organize-runner.js');const runnerSource=await readFile(runnerPath,'utf8');const observedRunner=replaceOnce(runnerSource,'state.sourceAction=await actionSource.consume(sender,{topicId,scopeBinding,userActionId});','state.sourceAction=await actionSource.consume(sender,{topicId,scopeBinding,userActionId});globalThis.__organizeNative.lastAction=state.sourceAction;');await writeFile(runnerPath,replaceOnce(observedRunner,'}catch(error){state.error=',"}catch(error){globalThis.__organizeNative.failure={code:error.code,stack:error.stack};state.error="));
 await writeFile(join(staged,'ui/organize-native-bridge.html'),'<!doctype html><title>Synthetic test transport</title>');
 h=await FakeChatGPT.start({extensionPath:staged,headless:true,onboarding:true});
 const pending=new Map(),retired=new Set(),bridge={requests:0,aborts:0,errors:[]};
 // Extension SW fetches are not intercepted by this browser's context.route.
 // Relay only Request bytes and abort notification; authority stays worker-local.
 const relay=await h.context.newPage();await relay.goto('chrome-extension://'+h.extensionId+'/ui/organize-native-bridge.html');
 await relay.exposeFunction('__nativeOrganizeHTTP',async message=>{
  if(message.abort){retired.add(message.id);if(pending.has(message.id)){bridge.aborts++;pending.get(message.id).abort();}return {};}
  const controller=new AbortController();pending.set(message.id,controller);bridge.requests++;
  if(retired.has(message.id))controller.abort();
  try{
   const body=Buffer.from(message.body),input=new Request(message.url,{method:message.method,headers:message.headers,body,signal:controller.signal});
   assert.equal(new URL(input.url).origin,'https://service.invalid');
   assert.deepEqual(Buffer.from(await input.clone().arrayBuffer()),body,'HTTP boundary preserves exact bytes');
   const response=new URL(input.url).pathname==='/test/proofs'?Response.json(await backend.configuration.readProofs(await input.json())):await backend.configuration.fetch(input);
   if(new URL(input.url).pathname==='/api/provider')await holdProviderResponse?.();
   return {status:response.status,headers:Object.fromEntries(response.headers),body:Array.from(new Uint8Array(await response.arrayBuffer()))};
  }catch(error){if(!controller.signal.aborted)bridge.errors.push(String(error));return {error:String(error)};}finally{pending.delete(message.id);retired.delete(message.id);}
 });
 await relay.evaluate(()=>chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.nativeOrganizeBridge!==true)return;
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('background/service-worker.js')||sender.tab){reply({error:'SYNTHETIC bridge sender refused'});return;}
  globalThis.__nativeOrganizeHTTP(message).then(reply,error=>reply({error:String(error)}));return true;
 }));
 const p=h.archive,workerContext=h.context.serviceWorkers()[0]||await h.context.waitForEvent('serviceworker');
 assert.equal(await workerContext.evaluate(()=>!!globalThis.__organizeNative?.source),true);
 const start=p.locator('#onboarding-start');if(await start.isVisible())await start.click();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);
 if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
 const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC native organize',operationId:crypto.randomUUID()}}),entries=[];
 for(let i=0;i<count;i++)entries.push(await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topic.id,body:'SYNTHETIC original native entry '+i,operationId:crypto.randomUUID()}}));
 await openTopic(p,topic);
 const snapshot=()=>workerContext.evaluate(async topicId=>{const {store}=globalThis.__organizeNative;return store.repository.transaction(false,async tx=>({jobs:await tx.all('organizerJobs'),usage:await tx.all('organizerUsage'),work:await tx.all('organizerWorkItems'),candidate:await tx.get('meta','aiPresentation:'+topicId),marker:await tx.get('libraryMigrationItems','ai-presentation-candidate-fence:'+topicId),entries:await tx.all('thoughts')}));},topic.id);
 const select=()=>rpc(p,'GET_AI_PRESENTATION_SCOPE',{options:{topicId:topic.id}});
 const request=scope=>({type:'UPDATE_AI_PRESENTATION',topicId:topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()});
 const run=async()=>{const message=request(await select());return rpc(p,message.type,Object.fromEntries(Object.entries(message).filter(([key])=>key!=='type')));};
 const quiet=()=>{assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);assert.deepEqual(bridge.errors,[]);};
 return {h,p,worker:workerContext,topic,entries,backend,bridge,snapshot,select,request,run,quiet,temporary,staged};
}
