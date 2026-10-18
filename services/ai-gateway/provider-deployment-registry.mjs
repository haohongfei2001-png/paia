import {freeze,snapshot,token} from '../../extension/core/ai-usage/qwen-request-data.js';
import {requireSynchronous} from './signed-identity.mjs';

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
  installed.set(id,Object.freeze({id,manifest:freeze(snapshot(manifest)),tokenize,isCurrent}));
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
export const installedProviderRegistry=createProviderDeploymentRegistry([]);
