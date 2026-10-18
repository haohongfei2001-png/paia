import {freeze,snapshot,token} from '../../extension/core/ai-usage/qwen-request-data.js';
import {requireSynchronous} from './signed-identity.mjs';
import {readQwenProfileManifest} from '../../extension/core/ai-usage/qwen-profile-source-adapter.js';
import {loadInstalledQwenSourceProfile,installedQwenSourceManifest,installedQwenManifestCapability,inspectInstalledQwenSourceProfile,measureInstalledQwenRequest} from '../../extension/core/ai-usage/qwen-source-profile.js';

const registries=new WeakSet();
// Installation means reviewed server source, not an environment module name,
// remote download, JSON qualification flag, eval, or request-selected code.
// The original owners still check exact profile/tokenizer/whole-wire bindings.
// Registration is NOT qualification and never changes NOT_ESTABLISHED flags.
export function createProviderDeploymentRegistry(entries=[]){
 if(!Array.isArray(entries)||entries.length>16)throw Error('PROVIDER_REGISTRY_INVALID');
 const installed=new Map();
 for(const value of entries){
  if(!value||![Object.prototype,null].includes(Object.getPrototypeOf(value))||
     Reflect.ownKeys(value).length!==4||!['id','manifest','tokenize','isCurrent'].every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(value,k)??{},'value')))throw Error('PROVIDER_REGISTRY_INVALID');
  const {id,manifest,tokenize,isCurrent}=value;
  if(!token(id)||installed.has(id)||typeof isCurrent!=='function'||tokenize!==null&&typeof tokenize!=='function')throw Error('PROVIDER_REGISTRY_INVALID');
  const source=installedQwenManifestCapability(manifest),owned=source?readQwenProfileManifest(manifest):freeze(snapshot(manifest));
  installed.set(id,Object.freeze({id,manifest:owned,tokenize,isCurrent:()=>requireSynchronous(isCurrent())===true&&(!source||inspectInstalledQwenSourceProfile(source)!==null)}));
 }
 const registry=Object.freeze({
  resolve(id){return typeof id==='string'?installed.get(id)??null:null;},
  isCurrent(capability){try{return installed.get(capability?.id)===capability&&requireSynchronous(capability.isCurrent())===true;}catch{return false;}},
 });
 registries.add(registry);return registry;
}
export const isProviderDeploymentRegistry=registry=>registries.has(registry);

// Deliberately empty. Add a static import and entry only when an actual
// model-matched tokenizer and measured conservative full-wire bound are
// independently reviewed. No characters/4 or synthetic receipt is installed.
const sourceInstalled=new Map(),sourcePending=new Map();
export const installedProviderRegistry=Object.freeze({
 async prepare(id){
  if(!token(id))return null;if(sourceInstalled.has(id))return this.isCurrent(sourceInstalled.get(id))?sourceInstalled.get(id):null;
  if(sourcePending.has(id))return sourcePending.get(id);
  if(sourcePending.size>=16)return null;
  const task=(async()=>{const source=await loadInstalledQwenSourceProfile(id),manifest=installedQwenSourceManifest(source);if(!source||!manifest||sourceInstalled.size>=16)return null;
   const entry=Object.freeze({id,manifest,tokenize:value=>measureInstalledQwenRequest(source,value),isCurrent:()=>inspectInstalledQwenSourceProfile(source)!==null});sourceInstalled.set(id,entry);return entry;})();
  sourcePending.set(id,task);try{return await task;}finally{sourcePending.delete(id);}
 },
 resolve(id){return typeof id==='string'?sourceInstalled.get(id)??null:null;},
 isCurrent(entry){try{return sourceInstalled.get(entry?.id)===entry&&entry.isCurrent()===true;}catch{return false;}}
});
registries.add(installedProviderRegistry);
