// Prepared only: no test registration or browser launch. The integration owner
// calls this on an original instrumentedExtension disposable copy, then passes
// its existing isolated FakeChatGPT instance to the runner below.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {root} from './storage-harness.mjs';
import {chooseConsumerGroup} from '../harness/settings-consumer-presentation.mjs';
import {observeANS07Consent} from '../harness/ans07-seed-evidence.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function prepareSyncLifecycleNative(extension,{device='A',remote=[]}={}){
 assert.ok(extension?.path&&extension.path!==root&&typeof extension.cleanup==='function','owned disposable extension required');assert.ok(['A','B','C'].includes(device));
 const configPath=join(extension.path,'background/sync-lifecycle-configuration.js'),workerPath=join(extension.path,'background/service-worker.js');
 const before=await readFile(configPath,'utf8');assert.equal(before,await readFile(join(root,'background/sync-lifecycle-configuration.js'),'utf8'));
 const helper=await readFile(join(root,'tests/harness/checkpoint-publication-http.mjs'),'utf8');
 const adapted=helper.replace("from '../../core/browser-native-sync/value.js'","from '../core/browser-native-sync/value.js'").replace('return {files,requests,request,loseNextPost(){lose=true;}};',"return {files,requests,request,restore(saved){files.clear();for(const f of saved){files.set(f.id,{...f,raw:new Uint8Array(f.raw)});}next=Math.max(0,...saved.map(f=>Number(f.id.replace('SYNTHETIC_file_',''))||0));},loseNextPost(){lose=true;}};");
 assert.notEqual(adapted,helper);await writeFile(join(extension.path,'background/sync-synthetic-http.js'),adapted);
 const config=`import {fakeGoogleCheckpointHTTP} from './sync-synthetic-http.js';
const binding={subject:'SYNTHETIC_native_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_native_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']},cloud=fakeGoogleCheckpointHTTP(binding),initial=${JSON.stringify(remote)},KEY='SYNTHETIC_native_remote';let loaded=false;
async function load(){if(loaded)return;const saved=(await chrome.storage.local.get(KEY))[KEY]??initial;cloud.restore(saved);loaded=true;}
export async function syntheticRemote(){await load();return [...cloud.files.values()].map(f=>({...f,raw:Array.from(f.raw)}));}
export function readSyncLifecycleConfiguration(){return {provider:'google-drive',datasetId:'SYNTHETIC_native_local_sync',deviceId:'SYNTHETIC_native_${device}',binding,isCurrent:()=>true,request:async r=>{await load();const result=await cloud.request(r);await chrome.storage.local.set({[KEY]:await syntheticRemote()});return result;}};}
`;
 const bridge=`
import {syntheticRemote} from './sync-lifecycle-configuration.js';
import {sealOperation as syntheticSeal} from '../core/browser-native-sync/core.js';
globalThis.__localSyncNative={ready,remote:syntheticRemote,async inspect(){await ready;return {native:store.repository.db instanceof IDBDatabase,view:await syncLifecycle.snapshot(),task:(await chrome.storage.local.get('paia-sync-local-lifecycle:v1'))['paia-sync-local-lifecycle:v1']?.task,journals:[store.sourceBootstrapJournal,store.sourcePurgeJournal,store.filterIntentJournal,store.inputWorkingJournal,store.consumerPreferenceJournal,promptReuse.service.syncJournal].every(j=>j?.core.repository===store.repository)};},async capture(){await ready;return store.capture({epoch:(await store.status()).epoch,adapterVersion:'0.3.0',chat:{id:'SYNTHETIC_native_sync',url:'https://chatgpt.com/c/SYNTHETIC_native_sync',title:'SYNTHETIC local sync'},messages:[{sourceMessageId:'SYNTHETIC_one',pageOrder:1,originalText:'SYNTHETIC original retained'}]});},async conflict(){await ready;const core=promptReuse.service.syncJournal.core,id='prompt-reuse:v1',h=await core.read('head','promptPreferences',id),bh=await core.read('head','promptBinding',id),a=(await core.read('revision',h.revisions[0])).operation,ba=(await core.read('revision',bh.revisions[0])).operation,value=structuredClone(a.value);value.overrides[0].text='SYNTHETIC remote manual choice';const make=(type,sequence,value)=>syntheticSeal({protocol:1,datasetId:core.datasetId,deviceId:'SYNTHETIC_native_remote_branch',sequence,operationId:crypto.randomUUID(),type,entityId:id,codecVersion:1,kind:'put',actor:'user',parents:[],value});const b=await make('promptPreferences',1,value),bb=await make('promptBinding',2,{...structuredClone(ba.value),promptRevisionId:b.revisionId});return [(await core.receive(b)).state,(await core.receive(bb)).state];}};
`;
 let diagnostic=null;
 if(process.env.PAIA_SYNC_NATIVE_DIAGNOSTIC==='1'){
  const path=join(extension.path,'core/browser-native-sync/group-checkpoint-scope.js'),original=await readFile(path,'utf8');
  const modified=original.replace("if(backupMetaAllowed(key))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');","if(backupMetaAllowed(key)){globalThis.__syncScopeRejectedMeta={key:['organizer-controls','originalOrganizerCheckpoint','aiOrganizerCheckpoint','originalOrganizerBootstrap','organizer-budget','thought-layout:v1','revisit-policy:v1','capture-policy:v1','thought-suppression-key','thought-sequence','thought-epoch'].includes(key)?key:'OTHER_CANONICAL_META',fields:Object.keys(await t.get('meta',key)).sort()};fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}").split('\n').map((line,i)=>line.replaceAll("fail('BNS_GROUP_CANONICAL_UNREPRESENTED')",`(globalThis.__syncScopeDiagnostic={line:${i+1}},fail('BNS_GROUP_CANONICAL_UNREPRESENTED'))`)).join('\n').replace("if(!equal(actual,expected))(globalThis.__syncScopeDiagnostic=", "if(!equal(actual,expected))(globalThis.__syncScopeMismatch=Object.keys(actual).filter(k=>!equal(actual[k],expected[k])),globalThis.__syncScopeDiagnostic=");
  const repositoryPath=join(extension.path,'core/idb-repository.js'),repositoryOriginal=await readFile(repositoryPath,'utf8'),catchMarker='catch(e){try{tx.abort();}catch{}await done.catch(()=>{});',repositoryInstrumented=repositoryOriginal.replace(catchMarker,"catch(e){globalThis.__syncRepositoryDiagnostic={name:e?.name??null,code:e?.code??null,frames:String(e?.stack??'').split('\\n').slice(1,9)};try{tx.abort();}catch{}await done.catch(()=>{});");assert.notEqual(repositoryInstrumented,repositoryOriginal);await writeFile(repositoryPath,repositoryInstrumented);
  assert.notEqual(modified,original);await writeFile(path,modified);diagnostic={originalSha256:sha(original),instrumentedSha256:sha(modified),repositoryOriginalSha256:sha(repositoryOriginal),repositoryInstrumentedSha256:sha(repositoryInstrumented),scope:'fixed guard line and error code/name/stack frames without message or content'};
 }
 const originalWorker=await readFile(workerPath,'utf8'),worker=process.env.PAIA_SYNC_NATIVE_DIAGNOSTIC==='1'?originalWorker.replace('  handle(request, sender)\n',"  handle(request, sender).catch(error=>{globalThis.__syncHandlerDiagnostic={type:request.type,name:error?.name??null,code:error?.code??null,frames:String(error?.stack??'').split('\\n').slice(1,10)};throw error;})\n"):originalWorker;await writeFile(configPath,config);await writeFile(workerPath,worker+bridge);
 return {diagnostic,configurationSha256:sha(config),originalWorkerSha256:sha(originalWorker),instrumentedWorkerSha256:sha(worker),bridgeSha256:sha(bridge),syntheticHttpSha256:sha(adapted),claim:'PREPARED_ONLY_NO_NATIVE_RESULT'};
}
export async function runSyncLifecycleNative(h,{device='A'}={}){
 // This uses the visible original Settings modal inside the headless harness,
 // not a parallel Sync page or a direct lifecycle.handle replacement.
 const p=h.archive,worker=()=>h.context.serviceWorkers().find(w=>w.url()===`chrome-extension://${h.extensionId}/background/service-worker.js`),inspect=()=>worker().evaluate(()=>globalThis.__localSyncNative.inspect());
 // Match the original Settings owning native fixture: the default small CDP
 // window uses compact navigation and legitimately hides the desktop sidebar.
 // Resize the owned headless window/viewport; never force a hidden UI control.
 const session=await h.context.newCDPSession(p),{windowId}=await session.send('Browser.getWindowForTarget');
 try{await session.send('Browser.setWindowBounds',{windowId,bounds:{width:1280,height:900}});const {bounds}=await session.send('Browser.getWindowBounds',{windowId});assert.equal(bounds.width,1280);assert.equal(bounds.height,900);}finally{await session.detach();}
 await p.setViewportSize({width:1280,height:900});
 // FakeChatGPT's ordinary onboarding entry already advances the welcome page.
 // Consume the genuine one-click consent path and await its actual readback.
 await p.evaluate(`(()=>{const observe=${observeANS07Consent.toString()};globalThis.__syncConsentTrace={};globalThis.__syncConsentObservation=observe(chrome.runtime,__syncConsentTrace);})()`);
 let consent;
 try{await p.locator('#enable-consent').waitFor({state:'visible'});await p.locator('#enable-consent').click();consent=await p.evaluate(async()=>{await __syncConsentObservation.complete();return __syncConsentTrace.consent;});}
 finally{await p.evaluate(()=>{__syncConsentObservation.stop();delete globalThis.__syncConsentObservation;delete globalThis.__syncConsentTrace;});}
 assert.deepEqual(consent,{dispatched:1,settled:1,acknowledged:1});
 await p.locator('.sidebar-bottom [data-view=settings]').click();await p.locator('#settings-panel').waitFor({state:'visible'});await chooseConsumerGroup(p,'data');await p.locator('#settings-sync').click();
 const button=name=>p.locator(`#settings-sync-dialog [data-sync-command=${name}]`);
 const clickAcknowledged=async command=>{
  assert.ok(['RESUME','NOW','RESTORE'].includes(command));
  await p.evaluate(command=>{const send=chrome.runtime.sendMessage;let pending,count=0;const type='PAIA_SYNC_'+command;const observed=function(message,...args){const result=Reflect.apply(send,this,[message,...args]);if(message?.type===type){count++;pending=result;}return result;};chrome.runtime.sendMessage=observed;globalThis.__syncActionObservation={async complete(){if(count!==1||!pending)throw Error('SYNC_ACTION_NOT_DISPATCHED_ONCE');const response=await pending;if(count!==1||response?.ok!==true)throw Error('SYNC_ACTION_ACK_'+JSON.stringify({command,count,ok:response?.ok,error:response?.error}));return {command,dispatched:count,acknowledged:1};},stop(){if(chrome.runtime.sendMessage===observed)chrome.runtime.sendMessage=send;}};},command);
  try{await button(command).click();return await p.evaluate(()=>__syncActionObservation.complete());}
  catch(error){if(process.env.PAIA_SYNC_NATIVE_DIAGNOSTIC==='1')error.message+=' SCOPE_DIAGNOSTIC '+JSON.stringify(await worker().evaluate(()=>({guard:globalThis.__syncScopeDiagnostic??null,families:globalThis.__syncScopeMismatch??null,meta:globalThis.__syncScopeRejectedMeta??null})));throw error;}
  finally{await p.evaluate(()=>{__syncActionObservation.stop();delete globalThis.__syncActionObservation;});}
 };

 await button('RESUME').waitFor({state:'visible'});
 const rpc=async(type,extra={})=>{try{return await p.evaluate(async({type,extra})=>{const r=await chrome.runtime.sendMessage({type,...extra});if(!r?.ok)throw Error(JSON.stringify(r));return r.data;},{type,extra});}catch(error){if(process.env.PAIA_SYNC_NATIVE_DIAGNOSTIC==='1')error.message+=' REPOSITORY_DIAGNOSTIC '+JSON.stringify(await worker().evaluate(()=>({repository:globalThis.__syncRepositoryDiagnostic??null,handler:globalThis.__syncHandlerDiagnostic??null})));throw error;}};
 let manual;
 if(device==='A'){await rpc('UPDATE_PREFERENCES',{changes:{language:'en',appearance:'dark',fontSize:'large',readingWidth:'wide',timeDisplay:'date_only',timeEmphasis:'standard'}});await rpc('FILTER_MODE',{mode:'off'});const q=await rpc('PAIA_PROMPT_QUERY');manual=await rpc('PAIA_PROMPT_CHANGE',{change:{action:'create',revision:q.revision,text:'SYNTHETIC original manual work'}});}
 await clickAcknowledged('RESUME');await button('NOW').waitFor({state:'visible'});
 if(device==='A')assert.equal((await worker().evaluate(()=>globalThis.__localSyncNative.capture())).added,1);
 else{await clickAcknowledged('RESTORE');await p.waitForFunction(()=>document.querySelector('[data-sync-command=RESTORE]')?.disabled===false);const restored=await inspect();assert.equal(restored.view.task.phase,'confirmed');assert.equal(restored.view.task.kind,'restore');const q=await rpc('PAIA_PROMPT_QUERY');assert.equal(q.items.find(x=>x.id.startsWith('manual:')).text,device==='B'?'SYNTHETIC original manual work':'SYNTHETIC remote manual choice');}
 if(device==='B'){await rpc('UPDATE_PREFERENCES',{changes:{appearance:'light',fontSize:'small'}});await rpc('FILTER_MODE',{mode:'light'});assert.deepEqual(await worker().evaluate(()=>globalThis.__localSyncNative.conflict()),['conflict','conflict']);const q=await rpc('PAIA_PROMPT_QUERY');assert.equal(q.manualConflict.state,'available');await rpc('PAIA_PROMPT_CONFLICT_RESOLVE',{resolution:{token:q.manualConflict.token,choice:'other'}});assert.equal((await rpc('PAIA_PROMPT_QUERY')).manualConflict.state,'none');}
 if(device!=='C'){await clickAcknowledged('NOW');await p.waitForFunction(()=>document.querySelector('[data-sync-command=NOW]')?.disabled===false);const done=await inspect();assert.equal(done.view.task.kind,'checkpoint');assert.equal(done.view.task.phase,'confirmed');assert.equal(done.task.reference.kind,'checkpoint-manifest');}
 const result=await inspect();assert.equal(result.native,true);assert.equal(result.journals,true);assert.equal(result.view.wholeArchiveComplete,false);
 assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 return {status:'ACTUAL_SETTINGS_WORKER_CHECKPOINT_PROMPT_'+device,consent,native:true,wholeArchiveComplete:false,checkpointProduced:device!=='C',confirmedRestore:device!=='A',explicitBoundConflictResolved:device==='B',remote:await worker().evaluate(()=>globalThis.__localSyncNative.remote())};
}
