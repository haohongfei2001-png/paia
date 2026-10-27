// NEW main-bound validation dependency; no existing main helper or vendor edit.
// Direct original module graph. Only the initial SDK/IDB dependencies and the
// named injected factories are synthetic; no copied modules, source transforms,
// replacement owners, exported private tickets, or provider requests are used.
import {installInitialHost} from './main-bound-native-host-fixture.mjs';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const signal=()=>{const listeners=new Set();return {addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f),emit:(...args)=>{for(const f of listeners)f(...args);}};};
const savedGlobals=()=>Object.fromEntries(['chrome','indexedDB','IDBKeyRange'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const restoreGlobals=before=>{for(const [key,descriptor]of Object.entries(before)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}};

export async function mainBoundSelectionTailComposition(t,{minimalSource=false,onSelectionLocalRead=null}={}){
 const beforeGlobals=savedGlobals(),cleanup=[],host=installInitialHost(),{api,data,counters}=host;
 const sdk={armed:false,sets:[],gets:[],events:[],accepted:deferred(),ack:deferred(),released:false};
 const releaseSDK=()=>{if(!sdk.released){sdk.released=true;sdk.ack.resolve();}};
 let readAccounting=()=>null;
 // Install the final function identities BEFORE importing native bootstrap.
 // Controlling these closed-over synthetic responses never swaps its methods.
 const get=api.storage.local.get,set=api.storage.local.set,contexts=[],topDocuments=[],topTrace=[];
 const topFor=id=>{const top=topDocuments.find(value=>value.tab.id===id);if(!top)throw Error('NO_SYNTHETIC_TOP_DOCUMENT');return top;};
 api.tabs.query=async request=>{counters.query++;if(JSON.stringify(request)!==JSON.stringify({url:['https://chatgpt.com/*']}))throw Error('UNEXPECTED_SYNTHETIC_QUERY');const result=topDocuments.map(top=>structuredClone(top.tab));topTrace.push({kind:'query',result});return result;};
 api.tabs.get=async id=>{const result=structuredClone(topFor(id).tab);topTrace.push({kind:'get',id,result});return result;};
 api.tabs.sendMessage=async(id,message,options)=>{
  counters.message++;const top=topFor(id);
  if(!(options?.frameId===0||options?.documentId===top.sender.documentId))throw Error('WRONG_SYNTHETIC_TOP_TARGET');
  topTrace.push({kind:'worker-to-top',message:structuredClone(message),options:structuredClone(options)});
  const result=await top.dispatch(structuredClone(message),{id:api.runtime.id});
  topTrace.push({kind:'top-reply',type:message.type,result:structuredClone(result)});return structuredClone(result);
 };
 api.scripting.executeScript=async request=>{
  counters.script++;const top=topFor(request?.target?.tabId),target=request.target;
  if(request.world!=='ISOLATED'||request.files!==undefined||typeof request.func!=='function'||!(target.frameIds?.length===1&&target.frameIds[0]===0||target.documentIds?.length===1&&target.documentIds[0]===top.sender.documentId))throw Error('WRONG_SYNTHETIC_PROBE');
  // Execute the original supplied probe in this synthetic isolated document,
  // as executeScript does. Do not substitute a precomputed identity result.
  const result=[{frameId:0,documentId:top.sender.documentId,result:structuredClone(vm.runInContext('('+Function.prototype.toString.call(request.func)+')()',top.context))}];
  topTrace.push({kind:'probe',target:structuredClone(target),result});return result;
 };
 api.storage.local.get=async keys=>{
  const result=await get.call(api.storage.local,keys);
  if(sdk.armed&&keys==='personalAIArchive'){
   sdk.gets.push(structuredClone(result));
   // Test-only observation of the existing injected host response, with the
   // original function identity installed before production module imports.
   onSelectionLocalRead?.({keys,result,accounting:readAccounting(),stack:new Error().stack});
  }
  return result;
 };
 api.storage.local.set=async value=>{
  const selected=sdk.armed&&Object.hasOwn(value,'personalAIArchive');
  if(selected){sdk.sets.push(structuredClone(value));sdk.events.push({event:'sdk-accepted',accounting:readAccounting()});}
  await set.call(api.storage.local,value);
  if(selected){sdk.events.push({event:'sdk-write-observed',accounting:readAccounting()});sdk.accepted.resolve();await sdk.ack.promise;sdk.events.push({event:'sdk-ack-released',accounting:readAccounting()});}
 };
 api.runtime.getContexts=async()=>structuredClone(contexts);
 t.after(async()=>{
  releaseSDK();const results=[];
  for(const [name,operation]of cleanup.reverse())try{results.push({name,result:(await operation())??null});}catch(error){results.push({name,error:error?.code??error?.message??'unknown'});}
  t.diagnostic('MAIN_BOUND_TAIL_FIXTURE_DISPOSAL '+JSON.stringify({scope:'synthetic disposal; restrictive false is not successful product release',results}));
  restoreGlobals(beforeGlobals);
 });

 // The initial host helper imports only fake IDB. This is the first import of
 // the production core/background graph, after all captured dependencies exist.
 const {existingSelectionFixture}=await import('./main-bound-existing-application-selection.mjs');
 const seed=await existingSelectionFixture({after:fn=>cleanup.push(['seed-repositories',fn])},{sourceLocal:api.storage.local,factory:globalThis.indexedDB,minimalSource});
 for(const repository of [seed.a.repository,seed.b.repository,seed.registry])await repository.close();

 const stores=await import('../../background/application-store-selection.js');
 const startup=await import('../../background/application-startup-events.js');
 const receipts=await import('../../background/prompt-insertion-receipts.js');
 const contextsModule=await import('../../background/context-connections.js');
 const prompts=await import('../../background/prompt-reuse-commands.js');
 const surfaces=await import('../../background/prompt-surface.js');
 const nexts=await import('../../background/prompt-next.js');
 const assists=await import('../../background/prompt-assist.js');
 const workers=await import('../../background/application-worker-coordination.js');
 const captures=await import('../../background/capture-recovery.js');
 const imports=await import('../../background/import-handler.js');
 const tools=await import('../../background/application-local-tools-coordination.js');
 const transports=await import('../../background/application-transport-coordination.js');
 const editors=await import('../../background/application-editor-guard.js');
 const commands=await import('../../background/application-selection-commands.js');
 const sync=await import('../../background/sync-local-lifecycle.js');
 const driver=await import('../../background/application-selection-reservation-coordination.js');
 const {PromptReuseService}=await import('../../core/prompt-reuse-service.js');
 const {SafetyRunner}=await import('../../core/thought-runner.js');
 const {LibraryRunner}=await import('../../core/library-runner.js');
 const {FilterRunner}=await import('../../core/filter-runner.js');
 const {createMaintenanceRunner}=await import('../../core/ai-usage/maintenance-runner.js');
 const {SimpleOriginalOrganizerRunner}=await import('../../core/organizer/original-simple.js');
 const {createConfiguredOrganizeRunner}=await import('../../core/organizer/configured-organize-runner.js');
 const {BoundedOrganizerWorkflow}=await import('../../core/organizer/bounded-workflow.js');
 const {unavailableAIProvider,unavailableAICredentials}=await import('../../core/organizer/unavailable-service.js');
 const {BackupService}=await import('../../core/backup-service.js');
 const {IntegrityChecker}=await import('../../core/integrity-checker.js');
 const {ContextCardsService}=await import('../../core/context-cards.js');
 const {ContextTopicAccessService}=await import('../../core/context-topic-access.js');
 const {installApplicationEditorGuard}=await import('../../ui/application-editor-guard.js');
 const {CONTROL_PUBLICATION_RESERVATION}=await import('../../core/local-control-publication-keys.js');

 const store=await stores.selectOriginalApplicationStore(api.storage.local,{configuration:{mode:'validated-existing-generation'}});
 cleanup.push(['original-source-repository',()=>store.repository.close()]);
 await store.recoverControlPublication();await store.status();
 const events=startup.createInjectedApplicationStartupEventsForTest(api);
 const receipt=receipts.createInjectedPromptInsertionReceiptsForTest(store,api);
 const contextConnections=new contextsModule.ContextConnections(store,events);
 const service=new PromptReuseService(store);
 const promptCommands=new prompts.PromptReuseCommands(service,api,{insertionReceipts:receipt});
 const promptSurface=new surfaces.PromptSurfaceCommands(promptCommands,api,{});
 const promptNext=new nexts.NextPromptCommands(service,api,promptSurface,{insertionReceipts:receipt});promptSurface.next=promptNext;
 const promptAssist=new assists.AssistPromptCommands(store,events,{surface:promptSurface,insertionReceipts:receipt});promptSurface.assist=promptAssist;
 const sourceOptions={store,safety:new SafetyRunner(store),libraryRunner:new LibraryRunner(store),filterRunner:new FilterRunner(store),maintenanceRunner:createMaintenanceRunner(store,null),contextConnections,promptAssist,promptNext,promptCommands,promptSurface,boundedOrganizer:new BoundedOrganizerWorkflow(store,{original:new SimpleOriginalOrganizerRunner(store,{provider:unavailableAIProvider,credentials:unavailableAICredentials}),ai:createConfiguredOrganizeRunner(store,null)})};
 const sourceCoordination=workers.createInjectedApplicationWorkerCoordinationForTest(sourceOptions);
 const captureRecovery=captures.installInjectedCaptureRecoveryForTest(api,Promise.resolve());
 const localImports=new imports.ImportHandler(store,api.runtime),localBackups=new BackupService(store),localIntegrity=new IntegrityChecker(store);
 const localTools=tools.createInjectedApplicationLocalToolsCoordinationForTest({store,imports:localImports,backups:localBackups,integrity:localIntegrity,runtime:api.runtime});
 const transport=transports.createInjectedApplicationTransportCoordinationForTest({store,sourceCoordination,captureRecovery,promptInsertionReceipts:receipt,api});
 const editor=editors.createInjectedApplicationEditorGuardForTest(api),activity=commands.createApplicationWorkerActivity();
 // The main-bound classic adapter retains legacy insert/once behavior and
 // enrolls only its original-empty-inventory-v1 selection profile. Evaluate
 // its complete actual bytes; no synthetic response or logical clock is used.
 // This fresh synthetic document has a retained draft and no insertion attempt.
 const topSender={id:api.runtime.id,url:'https://chatgpt.com/c/synthetic-injected-tail',documentId:'SYNTHETIC_local_tail_top',documentLifecycle:'active',frameId:0,tab:{id:9,windowId:3,incognito:false}};
 const topWindow=new EventTarget(),topDocument=new EventTarget(),topListeners=new Set(),topDraft={data:'SYNTHETIC retained top-document draft'};
 const topNode={nodeType:1,tagName:'DIV',isConnected:true,isContentEditable:true,parentElement:null,childNodes:[topDraft],closest:()=>null,getClientRects:()=>[{}],getBoundingClientRect:()=>({width:500,height:100}),contains:node=>node===topNode||node===topDraft};
 Object.assign(topDraft,{nodeType:3,parentNode:topNode,parentElement:topNode});
 Object.assign(topWindow,{getComputedStyle:()=>({display:'block',visibility:'visible',contentVisibility:'visible',opacity:'1'})});
 Object.assign(topDocument,{defaultView:topWindow,activeElement:topNode,querySelectorAll:()=>[topNode],execCommand:()=>{throw Error('NO_SYNTHETIC_INSERTION_AUTHORIZED');}});
 const topRuntime={id:api.runtime.id,onMessage:{addListener:fn=>topListeners.add(fn),removeListener:fn=>topListeners.delete(fn)},sendMessage:async message=>{
  const request=structuredClone(message);topTrace.push({kind:'top-to-worker',message:request});
  // Match the worker's original activity, private-enrollment exception and
  // admission guard. No message-name stub supplies an enrollment permission.
  try{const data=await activity.dispatch(async()=>{
   if(!receipts.allowOriginalApplicationSelectionReceiptEnrollment(receipt,request,topSender))commands.assertApplicationWorkerAdmission(editor,request,topSender);
   const method={PAIA_PROMPT_INSERTION_RECEIVER_REGISTER:'registerReceiver',PAIA_PROMPT_INSERTION_RECONCILE:'handleReconcile',PAIA_PROMPT_INSERTION_ACK:'handleAck',PAIA_PROMPT_INSERTION_QUALIFY:'handleQualify'}[request.type];
   if(!method)throw Error('NO_SYNTHETIC_TOP_RPC_AUTHORIZED');return receipt[method](request,topSender);
  });const result={ok:true,data:structuredClone(data)};topTrace.push({kind:'worker-reply',type:request.type,result});return result;}
  catch(error){topTrace.push({kind:'worker-rejection',type:request.type,code:error?.code??error?.message});return {ok:false,error:error?.code??'STORAGE_FAILED'};}
 }};
 const topLocation={origin:'https://chatgpt.com',href:topSender.url};
 const topContext=vm.createContext({document:topDocument,location:topLocation,chrome:{runtime:topRuntime},crypto:globalThis.crypto,TextEncoder,queueMicrotask,performance:globalThis.performance,setTimeout,clearTimeout});topContext.top=topContext;
 const adapterURL=new URL('../../adapter/chatgpt-composer.js',import.meta.url),adapterSource=await readFile(adapterURL,'utf8');
 const adapterProvenance={path:adapterURL.href,sha256:createHash('sha256').update(adapterSource).digest('hex'),expectedSelectionProfile:'original-empty-inventory-v1',completeSource:true,sourceTransforms:false,clock:'unchanged host performance.now/setTimeout'};
 vm.runInContext(adapterSource,topContext,{filename:adapterURL.href});
 const topAdapter=new topContext.PAIAChatGPTComposerAdapter({document:topDocument,location:topLocation});
 const top={sender:topSender,tab:{id:9,windowId:3,url:topSender.url,incognito:false,discarded:false,frozen:false},context:topContext,draft:topDraft,initialDraft:topDraft.data,trace:topTrace,adapterProvenance,dispatch:(message,sender)=>new Promise((resolve,reject)=>{
  let answered=false,asynchronous=false;
  try{for(const listener of topListeners)if(listener(message,sender,value=>{answered=true;resolve(value);})===true)asynchronous=true;if(!answered&&!asynchronous)resolve(undefined);}catch(error){reject(error);}
 })};topDocuments.push(top);
 cleanup.push(['original-top-adapter-dispose',()=>{topWindow.dispatchEvent(new Event('pagehide'));topAdapter.dispose();}]);
 let externalRequests=0;
 let configurationCurrent=true;
 const invalidateConfiguration=()=>{configurationCurrent=false;};
 const configuration={provider:'google-drive',datasetId:seed.coreA.datasetId,deviceId:seed.coreA.deviceId,binding:{subject:'SYNTHETIC_local_tail_owner',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_local_tail_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']},request:async()=>{externalRequests++;throw Error('NO_PROVIDER_AUTHORIZED');},isCurrent:()=>configurationCurrent};
 const lifecycle=await sync.createInjectedConfiguredSyncLifecycleForTest(store,api,configuration);
 await lifecycle.attachPromptService(service);
 const topicAccess=new ContextTopicAccessService(store),contextCards=new ContextCardsService(store,{topicSummary:(tx,epoch)=>topicAccess.summaryInTransaction(tx,epoch)});
 await lifecycle.attachContextService(contextCards);
 const selectionOptions={activity,isolated:async()=>{},ready:async()=>{},lifecycle:()=>lifecycle,localComposition:true};
 const selection=commands.createInjectedApplicationSelectionCommandsForTest(api,selectionOptions);
 cleanup.push(['original-selection-close',()=>selection.close()]);
 const coordinator=driver.createInjectedApplicationSelectionReservationCoordinationForTest({store,api,lifecycle,editors:editor,transports:transport,localTools,activity,selection});
 commands.bindOriginalApplicationSelectionCoordinator(selection,coordinator);
 readAccounting=()=>driver.readOriginalApplicationSelectionCoordinator(coordinator).accounting;
 cleanup.push(['original-lifecycle-suspend',()=>lifecycle.suspend()],['original-context-dispose',()=>contextConnections.dispose()],['original-receipt-dispose',()=>receipt.dispose()],['original-sources-close',()=>sourceCoordination.close()],['original-local-tools-close',()=>localTools.close()],['original-transport-close',()=>transport.close()],['original-editor-close',()=>editor.close()]);

 // Use the existing real page protocol and guard on both ends. The synthetic
 // archive page owns no open editor/IME/save operation, not a fabricated HOLD.
 const sender={id:api.runtime.id,url:api.runtime.getURL('ui/archive.html'),frameId:0,documentId:'SYNTHETIC_local_tail_archive',tab:{id:1,windowId:1,incognito:false}};
 const editorTrace=[],pageState={initialized:true,openEditors:0,composing:false,pendingSaves:0,unknown:false,prepares:0,checks:0,releases:0};
 const workerPort={name:editors.APPLICATION_EDITOR_PORT,sender,onMessage:signal(),onDisconnect:signal()};
 const pagePort={onMessage:signal(),onDisconnect:signal()};let disconnected=false;
 workerPort.postMessage=value=>{if(disconnected)throw Error('SYNTHETIC_EDITOR_DISCONNECTED');editorTrace.push({direction:'worker-to-page',...structuredClone(value)});queueMicrotask(()=>pagePort.onMessage.emit(structuredClone(value)));};
 pagePort.postMessage=value=>{if(disconnected)throw Error('SYNTHETIC_EDITOR_DISCONNECTED');editorTrace.push({direction:'page-to-worker',...structuredClone(value)});queueMicrotask(()=>workerPort.onMessage.emit(structuredClone(value)));};
 workerPort.disconnect=pagePort.disconnect=()=>{if(disconnected)return;disconnected=true;workerPort.onDisconnect.emit();pagePort.onDisconnect.emit();};
 contexts.push({contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,frameId:0,incognito:false});
 editor.connect(workerPort);
 const editorCurrent=()=>{pageState.checks++;return pageState.initialized&&pageState.openEditors===0&&!pageState.composing&&pageState.pendingSaves===0&&!pageState.unknown;};
 const pageDocument=new EventTarget(),pageTarget=new EventTarget();
 const page=installApplicationEditorGuard({prepare:async()=>{pageState.prepares++;return editorCurrent();},current:editorCurrent,release:()=>pageState.releases++},{api:{runtime:{connect:()=>pagePort}},document:pageDocument,target:pageTarget});
 cleanup.push(['original-page-dispose',()=>page.dispose()]);await tick();

 const invoke=type=>activity.dispatch(control=>selection.handle({type},sender,control));
 const resume=await lifecycle.handle({type:'PAIA_SYNC_RESUME'},sender);
 const preparation=await invoke('PAIA_GENERATION_PREPARE');
 const content=repository=>repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(['records','blocks','inputStates'].map(async table=>[table,await tx.all(table)]))),['records','blocks','inputStates']);
 const markers=async()=>({source:(await store.repository.transaction(false,tx=>tx.get('meta','application-generation-selection:v1'),['meta']))??null,target:(await seed.b.repository.transaction(false,tx=>tx.get('meta','application-generation-selection:v1'),['meta']))??null,reservation:(await seed.b.repository.transaction(false,tx=>tx.get('meta',CONTROL_PUBLICATION_RESERVATION),['meta']))??null});
 const baseline={source:await content(store.repository),target:await content(seed.b.repository),local:structuredClone(data.personalAIArchive)};
 const activate=()=>{if(sdk.armed)throw Error('SYNTHETIC_SINGLE_COMPOSITION_ONLY');sdk.armed=true;return activity.dispatch(control=>selection.localCompositionActivate(sender,control));};
 return {api,counters,data,seed,store,lifecycle,selection,coordinator,driver,commands,activity,editor,page,pageDocument,pageState,editorTrace,top,sender,resume,preparation,baseline,content,markers,invoke,activate,accounting:readAccounting,externalRequests:()=>externalRequests,sdk,releaseSDK,invalidateConfiguration,localToolOwners:{imports:localImports,backups:localBackups,integrity:localIntegrity,coordination:localTools},localToolAccounting:()=>tools.readInjectedLocalToolsSelectionAccountingForTest(localTools)};
}
