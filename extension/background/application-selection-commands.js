import {originalBootstrapFreeze} from './native-host-bootstrap.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost,readOriginalBootstrapIndexedDB} from './native-host-bootstrap.js';
import {isProductionApplicationSelectionReservationCoordination,runOriginalApplicationSelectionAction,readOriginalApplicationSelectionCoordinator,trackOriginalApplicationSelectionDriverWork} from './application-selection-reservation-coordination.js';
import {ArchiveError} from '../core/constants.js';
import {DATABASE_NAME} from '../core/idb-repository.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {inspectOriginalApplicationGenerationSelection,cancelOriginalApplicationGenerationSelection} from '../core/browser-native-sync/application-generation-selection.js';
import {readApplicationStoreConfiguration} from './application-store-configuration.js';
const fail=code=>{throw new ArchiveError(code);};
const originalSelections=originalBootstrapWeakMap(),selectionInvocations=originalBootstrapWeakMap(),activityPins=new WeakMap();
export function isOriginalApplicationSelectionCommands(selection,api,activity){const r=originalBootstrapWeakGet(originalSelections,selection);return !!r&&r.api===api&&r.activity===activity;}
export function bindOriginalApplicationSelectionCoordinator(selection,coordinator){const r=originalBootstrapWeakGet(originalSelections,selection);if(!r||r.coordinator||r.origin===productionCommandOrigin&&!isProductionApplicationSelectionReservationCoordination(coordinator)||readOriginalApplicationSelectionCoordinator(coordinator).selection!==selection)fail('GENERATION_SELECTION_CAPABILITY');r.coordinator=coordinator;}
export function requireOriginalApplicationSelectionInvocation(selection,control,owner,coordinator){const r=originalBootstrapWeakGet(selectionInvocations,control),binding=originalBootstrapWeakGet(originalSelections,selection);if(arguments.length!==4||!r||r.selection!==selection||r.owner!==owner||!r.active||!binding||binding.coordinator!==coordinator)fail('GENERATION_SELECTION_CAPABILITY');return originalBootstrapFreeze({senderDocumentId:r.senderDocumentId});}
const unavailable=()=>({version:1,state:'unavailable',canPrepare:false,reloadRequired:false,productionActivation:false});
// Registered before asynchronous startup. Inspection and safe cancellation of
// the original operation remain reachable when pending selection blocks ready.
const productionCommandOrigin=originalBootstrapSymbol(),ordinaryCommandOrigin=originalBootstrapSymbol(),injectedCommandOrigin=originalBootstrapSymbol();
function createSelectionCommands(api,{isolated,ready,lifecycle,activity}={},origin){
 const repositoryFactory=()=>origin===productionCommandOrigin?readOriginalBootstrapIndexedDB():globalThis.indexedDB;
 const mode=readApplicationStoreConfiguration(),enabled=mode?.mode==='validated-existing-generation';let owner=null,busy=false;
 const trusted=(request,sender)=>{const page=sender?.url,archive=api.runtime.getURL('ui/archive.html');if(sender?.id!==api.runtime.id||sender.tab?.incognito||sender.frameId!==undefined&&sender.frameId!==0||!(page===archive||page===api.runtime.getURL('ui/popup.html')||typeof page==='string'&&page.startsWith(archive+'#')&&topicRootTarget(page)!==null))fail('FORBIDDEN');if(!request||Object.getPrototypeOf(request)!==Object.prototype||Object.keys(request).length!==1||typeof Object.getOwnPropertyDescriptor(request,'type')?.value!=='string'||!['PAIA_SYNC_STATUS','PAIA_GENERATION_STATUS','PAIA_GENERATION_PREPARE','PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_CANCEL','PAIA_GENERATION_RESTART'].includes(request.type))fail('INVALID_REQUEST');};
 const present=value=>({version:1,...value,canPrepare:value.state==='not-prepared'&&lifecycle()?.applicationSelectionAvailable?.()===true,reloadRequired:value.state==='selected',busy:false,editorProtection:'unavailable',canActivate:false,canContinue:false,canRestart:false,productionActivation:false});
 const status=async()=>{if(!enabled)return unavailable();await isolated();const names=await repositoryFactory().databases();if(!names.some(row=>row.name===DATABASE_NAME))return unavailable();const value=await inspectOriginalApplicationGenerationSelection(api.storage.local,repositoryFactory());if(value.state==='not-prepared'&&owner)return {...present({state:'review-ready',scope:'exact-existing-cut'}),busy};return {...present(value),busy};};
 const selection=originalBootstrapFreeze({enabled,close(){if(!busy){owner?.close();owner=null;}},async decorate(request,sender,view){trusted(request,sender);return {...view,applicationSelection:await status()};},async handle(request,sender,activityControl){
  trusted(request,sender);if(!enabled){if(request.type==='PAIA_GENERATION_STATUS')return unavailable();fail('GENERATION_SELECTION_UNAVAILABLE');}await isolated();if(request.type==='PAIA_GENERATION_STATUS')return status();
  // The existing page-local save/IME guards cannot prove that every extension
  // page has retained its draft or stopped writing. Neither a selected receipt
  // nor a caller assertion supplies that missing original cross-page proof.
  // CONTINUE can dispatch the original prepared operation, so it shares the
  // same gate; status and undispatched cancellation remain available.
  if(['PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_RESTART'].includes(request.type))fail('GENERATION_EDITOR_PROTECTION_REQUIRED');
  if(busy)fail('GENERATION_SELECTION_BUSY');busy=true;
  try{
   if(request.type==='PAIA_GENERATION_PREPARE'){await ready();owner?.close();owner=lifecycle()?.applicationSelectionOwner?.();if(!owner)fail('GENERATION_SELECTION_UNAVAILABLE');try{await owner.prepare();}catch(error){owner.close();owner=null;throw error;}return present({state:'review-ready',scope:'exact-existing-cut'});}
   if(request.type==='PAIA_GENERATION_ACTIVATE'){const binding=originalBootstrapWeakGet(originalSelections,selection);if(!owner||!binding?.coordinator)fail('GENERATION_SELECTION_UNAVAILABLE');const invocation={selection,owner,senderDocumentId:sender.documentId,active:true};originalBootstrapWeakSet(selectionInvocations,activityControl,invocation);try{return present(await runOriginalApplicationSelectionAction(binding.coordinator,selection,owner,activityControl));}finally{invocation.active=false;}}
   if(request.type==='PAIA_GENERATION_CANCEL'){const value=await cancelOriginalApplicationGenerationSelection(api.storage.local,repositoryFactory());owner?.close();owner=null;return present(value.state==='cancelled'?{state:'not-prepared',priorLibraryRetained:true}:value);}
   fail('INVALID_REQUEST');
  }finally{busy=false;}
 }});
 if(activity!==undefined){const original=originalActivities.get(activity);if(!original)fail('GENERATION_ACTIVITY_INVALID');original.bind(selection);selectionActivities.set(selection,activity);}
 originalBootstrapWeakSet(originalSelections,selection,{api,activity,origin,coordinator:null});return selection;
}

// Worker ingress is denied before every early dispatcher while the original
// page guard holds that sender. Only audited observation/restriction commands
// remain reachable; their original owners still validate all fields and callers.
// No prefix (including GET/STATUS) grants a blanket bypass to future commands.
const selectionObservations=new Set(['GET_STATUS','RESPONSE_POLL','PAIA_SYNC_STATUS','PAIA_GENERATION_STATUS','PAIA_MAINTENANCE_PROCESSING_STATUS','PAIA_AI_FILTER_STATUS','PAIA_CONTEXT_CONNECTIONS_STATUS','PAIA_PROMPT_ASSIST_STATUS','PAIA_PROMPT_NEXT_STATUS','PAIA_PROMPT_SURFACE_SETTINGS_STATUS','IMPORT_CAPABILITIES','IMPORT_LATEST','IMPORT_TASKS','IMPORT_STATUS']);
const selectionRestrictions=new Set(['PAIA_SYNC_PAUSE','PAIA_SYNC_DISCONNECT','PAIA_PROMPT_ASSIST_INVALIDATE','PAIA_PROMPT_NEXT_INVALIDATE','PAIA_PROMPT_SURFACE_REQUEST_CLOSE','IMPORT_PAUSE','IMPORT_CANCEL','PAIA_BACKUP_CANCEL','PAIA_INTEGRITY_CANCEL','STOP_BOUNDED_ORGANIZER','STOP_AI_PRESENTATION','STOP_ORIGINAL_LIBRARY_VIEW','PAIA_PASSPORT_REVOKE','PAIA_PASSPORT_REVOKE_ALL']);
export function assertApplicationWorkerAdmission(editors,request,sender){
 const type=request?.type;
 const restriction=selectionRestrictions.has(type)||type==='CONSENT'&&request.accepted===false||type==='SET_ENABLED'&&request.enabled===false||type==='PAIA_PROMPT_NEXT_CONFIGURE'&&request.enabled===false||type==='PAIA_MAINTENANCE_PROCESSING_CONFIGURE'&&request.enabled===false||type==='PAIA_PROMPT_ASSIST_CONFIGURE'&&(request.replyAccess===false&&request.remoteProcessing===false)||type==='PAIA_AI_FILTER_CONFIGURE'&&(request.optIn===false&&request.remoteProcessing===false)||type==='PAIA_CONTEXT_CONNECTIONS_CHANGE'&&['pause','revoke'].includes(request.options?.action)||type==='PAIA_PROMPT_SURFACE_RPC'&&(['assist_cancel','assist_dismiss'].includes(request.command?.type)||request.command?.type==='close'&&Object.keys(request.command).length===1);
 if(!selectionObservations.has(type)&&!restriction&&editors.blocksMutation(sender))fail('GENERATION_EDITOR_PROTECTION_REQUIRED');
}
// Observe actual accepted worker promises, including successors added before a
// predecessor settles. Draining is not admission control, an owner receipt, a
// host/provider witness, or a global selection permit. A future admitted
// consumer must first acquire the real ingress/owner holds and revalidate them.
const ActivityPromise=Promise,activityThen=Promise.prototype.then,activityResolve=Promise.resolve,activityApply=Reflect.apply;
const activityNow=performance.now.bind(performance),activitySetTimeout=setTimeout,activityClearTimeout=clearTimeout;
const originalActivities=new WeakMap(),selectionActivities=new WeakMap(),activityControls=new WeakMap();
const observeActivity=(promise,yes,no)=>activityApply(activityThen,promise,[yes,no]);
const resolveActivity=value=>activityApply(activityResolve,ActivityPromise,[value]);

// This internal capability is never accepted through a request DTO. Only a
// command owner bound to this factory can exclude its own accepted dispatch.
export function drainOriginalApplicationSelectionActivity(selection,control){
 const activity=selectionActivities.get(selection),state=activity&&originalActivities.get(activity);
 if(!state||!activityControls.has(control))return new ActivityPromise((_,reject)=>reject(new ArchiveError('GENERATION_ACTIVITY_INVALID')));
 return state.drain(control);
}
export function createApplicationWorkerActivity({remaining=()=>[],deadlineMs=30000}={}){
 if(typeof remaining!=='function'||!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>30000)fail('GENERATION_ACTIVITY_INVALID');
 const tasks=new Set();let revision=0,draining=null,activity,selectionOwner=null;
 const register=task=>{tasks.add(task);revision++;const done=()=>{tasks.delete(task);revision++;};observeActivity(task,done,done);return task;};
 const track=value=>register(resolveActivity(value));
 const dispatch=callback=>{
  if(typeof callback!=='function')fail('GENERATION_ACTIVITY_INVALID');
  let resolve,reject;const accepted=new ActivityPromise((yes,no)=>{resolve=yes;reject=no;}),control=Object.freeze({});
  const record={activity,accepted,deadline:activityNow()+deadlineMs,active:true};activityControls.set(control,record);
  // Registration precedes callback invocation, including a synchronous drain.
  register(accepted);observeActivity(accepted,()=>{record.active=false;},()=>{record.active=false;});
  try{observeActivity(resolveActivity(callback(control)),resolve,reject);}catch(error){reject(error);}
  return accepted;
 };
 const drain=async(control=null,retain=false)=>{
  let record=null;
  if(control!==null){record=activityControls.get(control);if(!record||record.activity!==activity||!record.active||activityNow()>=record.deadline)fail('GENERATION_ACTIVITY_INVALID');}
  if(draining)fail('GENERATION_ACTIVITY_BUSY');
  const owner={},deadline=record?.deadline??activityNow()+deadlineMs;draining=owner;
  let timer,expired=false;
  const check=()=>{if(expired||activityNow()>=deadline)fail('GENERATION_ACTIVITY_TIMEOUT');if(record&&!record.active)fail('GENERATION_ACTIVITY_INVALID');};
  const expiration=new ActivityPromise((_,reject)=>{timer=activitySetTimeout(()=>{expired=true;if(record)record.active=false;reject(new ArchiveError('GENERATION_ACTIVITY_TIMEOUT'));},Math.max(0,deadline-activityNow()));});
  const settle=values=>new ActivityPromise((resolve,reject)=>{let left=values.length;if(!left){resolve();return;}for(const value of values){try{observeActivity(resolveActivity(value),()=>{if(!--left)resolve();},()=>{if(!--left)resolve();});}catch(error){reject(error);}}});
  const race=work=>new ActivityPromise((resolve,reject)=>{observeActivity(work,resolve,reject);observeActivity(expiration,resolve,reject);});
  try{
   for(;;){
    check();const at=revision,pending=[...tasks,...remaining()].filter(value=>value&&value!==record?.accepted);
    if(pending.length){await race(settle(pending));continue;}
    await race(resolveActivity());check();
    if(at===revision&&![...tasks,...remaining()].some(value=>value&&value!==record?.accepted))return;
   }
  }finally{activityClearTimeout(timer);if(record&&!retain)record.active=false;if(draining===owner)draining=null;}
 };
 activity=Object.freeze({track,dispatch,drain:()=>drain()});originalActivities.set(activity,{drain,pending:()=>[...tasks,...remaining()],quiet:record=>![...tasks,...remaining()].some(value=>value&&value!==record.accepted),bind:owner=>{if(selectionOwner)fail('GENERATION_ACTIVITY_BUSY');selectionOwner=owner;}});return activity;
}

// Separate original dispatch pin: draining does not turn a completed control
// into a lifetime/current-quietness proof. No request can carry this handle.
export function holdOriginalApplicationSelectionActivity(selection,control,action){
 const activity=selectionActivities.get(selection),state=originalActivities.get(activity),record=activityControls.get(control),invocation=originalBootstrapWeakGet(selectionInvocations,control);
 if(!state||!record||record.activity!==activity||!record.active||!invocation?.active||invocation.selection!==selection||activityNow()>=record.deadline)fail('GENERATION_ACTIVITY_INVALID');
 for(const pending of state.pending())if(pending&&pending!==record.accepted)trackOriginalApplicationSelectionDriverWork(action,pending);const token=Object.freeze(Object.create(null));activityPins.set(token,{selection,control,action,state,record,valid:true});return token;
}
export function drainPinnedOriginalApplicationSelectionActivity(selection,token,action){const p=activityPins.get(token);if(!p||p.selection!==selection||p.action!==action||!p.valid)fail('GENERATION_ACTIVITY_INVALID');return p.state.drain(p.control,true);}
export function requirePinnedOriginalApplicationSelectionActivity(selection,token,action){const p=activityPins.get(token);if(!p||p.selection!==selection||p.action!==action||!p.valid||!p.record.active||activityNow()>=p.record.deadline||!p.state.quiet(p.record))fail('GENERATION_ACTIVITY_INVALID');return true;}

export function createInjectedApplicationSelectionCommandsForTest(api,options){return createSelectionCommands(api,options,injectedCommandOrigin);}
export function createApplicationSelectionCommands(api,options){return createInjectedApplicationSelectionCommandsForTest(api,options);}
export function createOrdinaryApplicationSelectionCommands(api,options){return createSelectionCommands(api,options,ordinaryCommandOrigin);}
export function createProductionApplicationSelectionCommands(options){if(arguments.length!==1)fail('GENERATION_SELECTION_CAPABILITY');const api=readOriginalBootstrapHost(),owner=createSelectionCommands(api,options,productionCommandOrigin);requireOriginalBootstrapHost(api);return owner;}
export function isProductionApplicationSelectionCommands(owner,activity){const api=readOriginalBootstrapHost(),r=originalBootstrapWeakGet(originalSelections,owner);return !!r&&r.origin===productionCommandOrigin&&r.api===api&&r.activity===activity;}
