import {ArchiveError} from '../core/constants.js';
export const AI_FILTER_CONSENT_KEY='aiFilterAuthorizationV1';
const consentEpochReaders=new WeakMap(),consentSnapshotFacts=new WeakMap();
// Final local facts only: no injected callback, storage read or new receipt.
export const isAIFilterConsentSnapshotCurrent=snapshot=>consentSnapshotFacts.get(snapshot)?.()===true;
// Stable only within the stored browser-session opt-in generation. This reader
// accepts an original current snapshot; a DTO or a copied owner cannot use it.
export const readAIFilterConsentEpoch=(owner,snapshot)=>consentEpochReaders.get(owner)?.(snapshot)??null;
const fail=code=>{throw new ArchiveError(code);};
const exact=(x,keys)=>!!x&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(x,k)||{},'value'));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const valid=x=>exact(x,['version','optIn','remoteProcessing','generation'])&&x.version===1&&typeof x.optIn==='boolean'&&typeof x.remoteProcessing==='boolean'&&typeof x.generation==='string'&&/^[a-f0-9-]{36}$/.test(x.generation);
// Local, session-only choices. They neither attest Pro nor authorize any text
// scope, service identity or provider. Those original owners remain independent.
export class AIFilterConsent {
 #api;#consented;#value=null;#observed=null;#serial=0;#writes=0;#changing=false;#blocked=false;#disposed=false;#tail=Promise.resolve();#instance=crypto.randomUUID();#listeners=new Set();#snapshots=new WeakMap();#storage;#pending=null;
 constructor(api,{consented=async()=>false}={}){
  this.#api=api;this.#consented=consented;consentEpochReaders.set(this,snapshot=>this.isCurrent(snapshot)?this.#observed.generation:null);
  this.#storage=(changes,area)=>{if(area==='session'&&Object.hasOwn(changes||{},AI_FILTER_CONSENT_KEY)){const value=changes[AI_FILTER_CONSENT_KEY]?.newValue??null;if(!this.#pending||!same(value,this.#pending))this.invalidate();}};api.storage?.onChanged?.addListener(this.#storage);
 }
 onInvalidate(fn){if(typeof fn!=='function'||this.#listeners.size>=8)fail('RESOURCE_LIMIT');this.#listeners.add(fn);return ()=>this.#listeners.delete(fn);}
 #revoke(){this.#serial++;this.#value=null;for(const fn of this.#listeners)try{fn();}catch{/* One listener cannot preserve another lease. */}}
 invalidate(){this.#writes++;this.#revoke();}
 #snapshot(){const enabled=!this.#disposed&&!this.#changing&&!this.#blocked,value=Object.freeze({optIn:enabled&&this.#value?.optIn===true,remoteProcessing:enabled&&this.#value?.remoteProcessing===true,generation:this.#instance+':'+this.#serial+':'+(this.#observed?.generation||'off')});this.#snapshots.set(value,this.#serial);consentSnapshotFacts.set(value,()=>this.#current(value));return value;}
 capture(){const value=this.#snapshot();return this.isCurrent(value)?value:null;}
 #current(value){return !this.#disposed&&!this.#changing&&!this.#blocked&&this.#snapshots.get(value)===this.#serial&&value.optIn===true&&value.remoteProcessing===true&&this.#value?.optIn===true&&this.#value?.remoteProcessing===true&&value.generation===this.#instance+':'+this.#serial+':'+(this.#observed?.generation||'off');}
 isCurrent(value){return this.#current(value);}
 async status(){
  const serial=this.#serial;if(this.#disposed||this.#changing||!this.#api.storage?.session)return this.#snapshot();
  let value,consented;try{value=(await this.#api.storage.session.get(AI_FILTER_CONSENT_KEY))[AI_FILTER_CONSENT_KEY]??null;consented=await this.#consented();}catch{if(serial===this.#serial)this.invalidate();return this.#snapshot();}
  if(this.#disposed||this.#changing||serial!==this.#serial)return this.#snapshot();
  const next=consented===true&&valid(value)?value:null;if(!same(this.#observed,next))this.invalidate();this.#observed=next?Object.freeze({...next}):null;this.#value=this.#blocked?null:this.#observed;return this.#snapshot();
 }
 configure(request){
  if(!exact(request,['optIn','remoteProcessing','expectedGeneration'])||typeof request.optIn!=='boolean'||typeof request.remoteProcessing!=='boolean'||typeof request.expectedGeneration!=='string')fail('INVALID_REQUEST');
  if(this.#disposed||!this.#api.storage?.session)fail('UNAVAILABLE');if(this.#changing||request.expectedGeneration!==this.#snapshot().generation)fail('STALE_BASE');
  const {optIn,remoteProcessing}=request,before=this.#observed;this.#revoke();this.#changing=true;this.#blocked=true;const write=++this.#writes;
  const task=async()=>{try{
   if((optIn||remoteProcessing)&&await this.#consented()!==true)fail('CONSENT_REQUIRED');
   const stored=(await this.#api.storage.session.get(AI_FILTER_CONSENT_KEY))[AI_FILTER_CONSENT_KEY]??null;if(!same(stored,before))fail('STALE_BASE');if(this.#disposed||write!==this.#writes)fail('STALE_BASE');
   const value={version:1,optIn,remoteProcessing,generation:crypto.randomUUID()};this.#pending=value;await this.#api.storage.session.set({[AI_FILTER_CONSENT_KEY]:value});
   const saved=(await this.#api.storage.session.get(AI_FILTER_CONSENT_KEY))[AI_FILTER_CONSENT_KEY]??null;if((optIn||remoteProcessing)&&await this.#consented()!==true)fail('CONSENT_REQUIRED');if(!same(saved,value)||this.#disposed||write!==this.#writes)fail('STALE_BASE');
   this.#pending=null;this.#observed=Object.freeze(value);this.#value=this.#observed;this.#blocked=false;this.#changing=false;return this.#snapshot();
  }catch(error){this.#pending=null;this.#value=null;this.#changing=false;throw error;}};
  const result=this.#tail.then(task);this.#tail=result.catch(()=>{});return result;
 }
 dispose(){if(this.#disposed)return;this.#disposed=true;this.#blocked=true;this.invalidate();this.#api.storage?.onChanged?.removeListener(this.#storage);this.#listeners.clear();}
}
