import {ArchiveError} from '../core/constants.js';
import {DATABASE_NAME} from '../core/idb-repository.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {inspectOriginalApplicationGenerationSelection,continueOriginalApplicationGenerationSelection,cancelOriginalApplicationGenerationSelection} from '../core/browser-native-sync/application-generation-selection.js';
import {readApplicationStoreConfiguration} from './application-store-configuration.js';
const fail=code=>{throw new ArchiveError(code);};
const unavailable=()=>({version:1,state:'unavailable',canPrepare:false,reloadRequired:false,productionActivation:false});
// Registered before asynchronous startup. Recovery of the fixed original local
// operation remains reachable when pending selection correctly blocks ready.
export function createApplicationSelectionCommands(api,{isolated,ready,lifecycle}={}){
 const mode=readApplicationStoreConfiguration(),enabled=mode?.mode==='validated-existing-generation';let owner=null,busy=false,reloadUsed=false;
 const trusted=(request,sender)=>{const page=sender?.url,archive=api.runtime.getURL('ui/archive.html');if(sender?.id!==api.runtime.id||sender.tab?.incognito||sender.frameId!==undefined&&sender.frameId!==0||!(page===archive||page===api.runtime.getURL('ui/popup.html')||typeof page==='string'&&page.startsWith(archive+'#')&&topicRootTarget(page)!==null))fail('FORBIDDEN');if(!request||Object.getPrototypeOf(request)!==Object.prototype||Object.keys(request).length!==1||typeof Object.getOwnPropertyDescriptor(request,'type')?.value!=='string'||!['PAIA_SYNC_STATUS','PAIA_GENERATION_STATUS','PAIA_GENERATION_PREPARE','PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_CANCEL','PAIA_GENERATION_RESTART'].includes(request.type))fail('INVALID_REQUEST');};
 const present=value=>({version:1,...value,canPrepare:value.state==='not-prepared'&&lifecycle()?.applicationSelectionAvailable?.()===true,reloadRequired:value.state==='selected',busy:false,productionActivation:false});
 const status=async()=>{if(!enabled)return unavailable();await isolated();const names=await globalThis.indexedDB.databases();if(!names.some(row=>row.name===DATABASE_NAME))return unavailable();const value=await inspectOriginalApplicationGenerationSelection(api.storage.local,globalThis.indexedDB);if(value.state==='not-prepared'&&owner)return {...present({state:'review-ready',scope:'exact-existing-cut'}),busy};return {...present(value),busy};};
 return Object.freeze({enabled,close(){if(!busy){owner?.close();owner=null;}},async decorate(request,sender,view){trusted(request,sender);return {...view,applicationSelection:await status()};},async handle(request,sender){
  trusted(request,sender);if(!enabled){if(request.type==='PAIA_GENERATION_STATUS')return unavailable();fail('GENERATION_SELECTION_UNAVAILABLE');}await isolated();if(request.type==='PAIA_GENERATION_STATUS')return status();if(busy)fail('GENERATION_SELECTION_BUSY');busy=true;
  try{
   if(request.type==='PAIA_GENERATION_PREPARE'){await ready();owner?.close();owner=lifecycle()?.applicationSelectionOwner?.();if(!owner)fail('GENERATION_SELECTION_UNAVAILABLE');try{await owner.prepare();}catch(error){owner.close();owner=null;throw error;}return present({state:'review-ready',scope:'exact-existing-cut'});}
   if(request.type==='PAIA_GENERATION_ACTIVATE'){await ready();if(!owner)fail('GENERATION_SELECTION_NOT_PREPARED');const release=lifecycle()?.reserveApplicationSelection?.();if(!release)fail('GENERATION_SELECTION_UNAVAILABLE');try{return present(await owner.activate());}finally{let safe=false;try{safe=(await inspectOriginalApplicationGenerationSelection(api.storage.local,globalThis.indexedDB)).state==='not-prepared';}catch{}release(safe);if(safe){owner.close();owner=null;}}}
   if(request.type==='PAIA_GENERATION_CONTINUE'){const value=await continueOriginalApplicationGenerationSelection(api.storage.local,globalThis.indexedDB);if(value.state==='selected')lifecycle()?.suspend();return present(value);}
   if(request.type==='PAIA_GENERATION_CANCEL'){const value=await cancelOriginalApplicationGenerationSelection(api.storage.local,globalThis.indexedDB);owner?.close();owner=null;return present(value.state==='cancelled'?{state:'not-prepared',priorLibraryRetained:true}:value);}
   if(request.type==='PAIA_GENERATION_RESTART'){const value=await status();if(value.state!=='selected'||!value.reloadRequired||reloadUsed||typeof api.runtime.reload!=='function')fail('GENERATION_SELECTION_PENDING');reloadUsed=true;lifecycle()?.suspend();api.runtime.reload();return present({state:'restart-requested',priorLibraryRetained:true});}
   fail('INVALID_REQUEST');
  }finally{busy=false;}
 }});
}
