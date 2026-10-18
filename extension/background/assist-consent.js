import {ArchiveError} from '../core/constants.js';
export const ASSIST_AUTH_KEY='promptAssistAuthorizationV1';
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const valid=value=>{if(!value||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;const keys=Reflect.ownKeys(value);if(keys.length!==4||keys.some(k=>!['version','replyAccess','remoteProcessing','generation'].includes(k)))return false;const d=Object.getOwnPropertyDescriptors(value);if(keys.some(k=>!Object.hasOwn(d[k],'value')||!d[k].enumerable))return false;return value.version===1&&typeof value.replyAccess==='boolean'&&typeof value.remoteProcessing==='boolean'&&uuid(value.generation);};
// Independent, session-only permission for current-reply access and explicit
// remote Assist. Capture, Next and external Context permissions never enter it.
export class AssistConsent {
 #api;#consented;#listeners=new Set();#serial=0;#instance=crypto.randomUUID();#value=null;#changing=false;#tail=Promise.resolve();#writes=0;#disposed=false;
 constructor(api,{consented=async()=>false}={}){this.#api=api;this.#consented=consented;}
 onInvalidate(fn){if(typeof fn!=='function'||this.#listeners.size>=8)throw new ArchiveError('RESOURCE_LIMIT');this.#listeners.add(fn);return ()=>this.#listeners.delete(fn);}
 #invalidate(){++this.#serial;this.#value=null;for(const fn of [...this.#listeners])try{fn();}catch{/* Every original lease still receives invalidation. */}}
 invalidate(){this.#invalidate();}
 #snapshot(){return {replyAccess:this.#value?.replyAccess===true,remoteProcessing:this.#value?.remoteProcessing===true,generation:(this.#value?.generation||'off')+':'+this.#instance+':'+this.#serial};}
 isCurrent(snapshot){return !this.#disposed&&!this.#changing&&this.#value?.replyAccess===true&&this.#value?.remoteProcessing===true&&snapshot?.replyAccess===true&&snapshot?.remoteProcessing===true&&snapshot.generation===this.#snapshot().generation;}
 async status(){
  const serial=this.#serial;
  if(this.#disposed||this.#changing||!this.#api.storage?.session)return this.#snapshot();
  let value,consented=false;
  try{value=(await this.#api.storage.session.get(ASSIST_AUTH_KEY))[ASSIST_AUTH_KEY];consented=await this.#consented();}catch{if(serial===this.#serial)this.#invalidate();return this.#snapshot();}
  if(this.#disposed||this.#changing||serial!==this.#serial)return this.#snapshot();
  const next=consented===true&&valid(value)?value:null;
  if(this.#value&&(!next||JSON.stringify(next)!==JSON.stringify(this.#value)))this.#invalidate();
  this.#value=next?Object.freeze({...next}):null;return this.#snapshot();
 }
 configure({replyAccess,remoteProcessing,expectedGeneration}){
  if(typeof replyAccess!=='boolean'||typeof remoteProcessing!=='boolean')throw new ArchiveError('INVALID_REQUEST');
  if(this.#disposed)throw new ArchiveError('UNAVAILABLE');
  const compare=expectedGeneration!==undefined,before=this.#value?structuredClone(this.#value):null;
  if(compare&&(typeof expectedGeneration!=='string'||this.#changing||expectedGeneration!==this.#snapshot().generation))throw new ArchiveError('STALE_BASE');
  // Revoke before the first await. A concurrent enable can never restore an old
  // lease or overwrite the latest requested state after a delayed storage ACK.
  this.#invalidate();const ticket=this.#serial,writeTicket=++this.#writes;this.#changing=true;
  const write=async()=>{
   try{
    if(!this.#api.storage?.session)throw new ArchiveError('UNAVAILABLE');
    if((replyAccess||remoteProcessing)&&await this.#consented()!==true)throw new ArchiveError('CONSENT_REQUIRED');
    if(compare){const stored=(await this.#api.storage.session.get(ASSIST_AUTH_KEY))[ASSIST_AUTH_KEY];if(ticket!==this.#serial||JSON.stringify(stored??null)!==JSON.stringify(before))throw new ArchiveError('STALE_BASE');}
    const value={version:1,replyAccess,remoteProcessing,generation:crypto.randomUUID()};
    await this.#api.storage.session.set({[ASSIST_AUTH_KEY]:value});
    if(!this.#disposed&&writeTicket===this.#writes){this.#value=ticket===this.#serial?Object.freeze(value):null;this.#changing=false;return this.status();}
    return this.#snapshot();
   }catch(error){if(writeTicket===this.#writes){this.#value=null;this.#changing=false;}throw error;}
  };
  const result=this.#tail.then(write);this.#tail=result.catch(()=>{});return result;
 }
 dispose(){this.#disposed=true;this.#changing=true;this.#invalidate();this.#listeners.clear();}
}
