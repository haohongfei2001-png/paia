import {ArchiveError} from '../core/constants.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {AIFilterConsent} from './ai-filter-consent.js';
import {createAIFilterServiceAssembly} from '../core/ai-usage/filter-visibility-service.js';
import {createAIFilterAuthority} from '../core/ai-usage/ai-filter-authority.js';
const fail=code=>{throw new ArchiveError(code);};
const exact=(x,keys)=>!!x&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(x,k)||{},'value'));
// Existing Archive details adapter only. No content-script, popup, model or
// account label may opt the user into remote Filter processing.
export function createAIFilterRuntime(api,{getStore=()=>null,policy=null}={}){
 let disposed=false;const consent=new AIFilterConsent(api,{consented:async()=>!disposed&&(await getStore()?.status())?.consented===true}),owner=createAIFilterAuthority({getStore,consent,policy});const assembly=createAIFilterServiceAssembly({getStore,consent,policy,authority:owner,storage:api.storage?.session});
 const source=sender=>{const base=api.runtime.getURL('ui/archive.html'),url=sender?.url;if(sender?.id!==api.runtime.id||sender.frameId!==0||sender.tab?.incognito===true||typeof url!=='string'||!(url===base||url.startsWith(base+'#')&&topicRootTarget(url)!==null))fail('FORBIDDEN');};
 const status=async()=>{const value=await consent.status(),qualified=owner.status();return {...value,phase:!value.optIn?'off':!value.remoteProcessing?'awaiting_permission':qualified.available?'available':'awaiting_qualification'};};
 return Object.freeze({authority:owner.authority,serviceFilter:owner.serviceFilter,status,configureService:assembly.configure,
  async handle(request,sender){source(sender);if(disposed)fail('UNAVAILABLE');if(exact(request,['type'])&&request.type==='PAIA_AI_FILTER_STATUS')return status();
   if(!exact(request,['type','optIn','remoteProcessing','expectedGeneration','confirmed'])||request.type!=='PAIA_AI_FILTER_CONFIGURE'||request.confirmed!==true)fail('INVALID_REQUEST');
   await consent.configure({optIn:request.optIn,remoteProcessing:request.remoteProcessing,expectedGeneration:request.expectedGeneration});source(sender);return status();
  },
  invalidate(){consent.invalidate();owner.invalidate();assembly.invalidate();},
  dispose(){disposed=true;assembly.dispose();owner.dispose();consent.dispose();}
 });
}
