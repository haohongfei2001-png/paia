import {ArchiveError} from '../core/constants.js';
import {DATABASE_NAME} from '../core/idb-repository.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {inspectOriginalApplicationGenerationSelection,cancelOriginalApplicationGenerationSelection} from '../core/browser-native-sync/application-generation-selection.js';
import {readApplicationStoreConfiguration} from './application-store-configuration.js';
const fail=code=>{throw new ArchiveError(code);};
const unavailable=()=>({version:1,state:'unavailable',canPrepare:false,reloadRequired:false,productionActivation:false});
// Registered before asynchronous startup. Inspection and safe cancellation of
// the original operation remain reachable when pending selection blocks ready.
export function createApplicationSelectionCommands(api,{isolated,ready,lifecycle}={}){
 const mode=readApplicationStoreConfiguration(),enabled=mode?.mode==='validated-existing-generation';let owner=null,busy=false;
 const trusted=(request,sender)=>{const page=sender?.url,archive=api.runtime.getURL('ui/archive.html');if(sender?.id!==api.runtime.id||sender.tab?.incognito||sender.frameId!==undefined&&sender.frameId!==0||!(page===archive||page===api.runtime.getURL('ui/popup.html')||typeof page==='string'&&page.startsWith(archive+'#')&&topicRootTarget(page)!==null))fail('FORBIDDEN');if(!request||Object.getPrototypeOf(request)!==Object.prototype||Object.keys(request).length!==1||typeof Object.getOwnPropertyDescriptor(request,'type')?.value!=='string'||!['PAIA_SYNC_STATUS','PAIA_GENERATION_STATUS','PAIA_GENERATION_PREPARE','PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_CANCEL','PAIA_GENERATION_RESTART'].includes(request.type))fail('INVALID_REQUEST');};
 const present=value=>({version:1,...value,canPrepare:value.state==='not-prepared'&&lifecycle()?.applicationSelectionAvailable?.()===true,reloadRequired:value.state==='selected',busy:false,editorProtection:'unavailable',canActivate:false,canContinue:false,canRestart:false,productionActivation:false});
 const status=async()=>{if(!enabled)return unavailable();await isolated();const names=await globalThis.indexedDB.databases();if(!names.some(row=>row.name===DATABASE_NAME))return unavailable();const value=await inspectOriginalApplicationGenerationSelection(api.storage.local,globalThis.indexedDB);if(value.state==='not-prepared'&&owner)return {...present({state:'review-ready',scope:'exact-existing-cut'}),busy};return {...present(value),busy};};
 return Object.freeze({enabled,close(){if(!busy){owner?.close();owner=null;}},async decorate(request,sender,view){trusted(request,sender);return {...view,applicationSelection:await status()};},async handle(request,sender){
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
   if(request.type==='PAIA_GENERATION_CANCEL'){const value=await cancelOriginalApplicationGenerationSelection(api.storage.local,globalThis.indexedDB);owner?.close();owner=null;return present(value.state==='cancelled'?{state:'not-prepared',priorLibraryRetained:true}:value);}
   fail('INVALID_REQUEST');
  }finally{busy=false;}
 }});
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
export function createApplicationWorkerActivity({remaining=()=>[]}={}){
 const tasks=new Set();let revision=0;
 const track=value=>{const task=Promise.resolve(value);tasks.add(task);revision++;const done=()=>{tasks.delete(task);revision++;};void task.then(done,done);return task;};
 return Object.freeze({track,async drain(){
  for(;;){const at=revision,pending=[...tasks,...remaining()].filter(Boolean);if(pending.length){await Promise.allSettled(pending);continue;}await Promise.resolve();if(at===revision&&!tasks.size&&!remaining().filter(Boolean).length)return;}
 }});
}
