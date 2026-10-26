import {originalSelectionHoldBinding,chargeOriginalSelectionHold,retainOriginalSelectionHoldWork,invalidateOriginalSelectionHold,originalSelectionHoldPinned,originalSelectionHoldRemaining} from '../core/local-tool-selection-hold.js';
import {ArchiveError} from '../core/constants.js';
export const ASSIST_AUTH_KEY='promptAssistAutomaticPreferenceV2';
export const ASSIST_CONSENT_VERSION=2;
const originalOwners=new WeakMap(),purposeCaptures=new WeakMap();
const nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,nativeAbort=AbortController.prototype.abort;
const nativeAdd=EventTarget.prototype.addEventListener,nativeRemove=EventTarget.prototype.removeEventListener;
const wall=Date.now.bind(Date),mono=performance.now.bind(performance);
const requireFact=value=>{if(!value)throw new ArchiveError('UNAVAILABLE');};
const ownData=(value,key)=>{const d=value&&Object.getOwnPropertyDescriptor(value,key);requireFact(d&&Object.hasOwn(d,'value'));return d.value;};
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const valid=value=>{if(!value||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;const keys=Reflect.ownKeys(value);if(keys.length!==5||keys.some(k=>!['version','trigger','replyAccess','remoteProcessing','generation'].includes(k)))return false;const d=Object.getOwnPropertyDescriptors(value);if(keys.some(k=>!Object.hasOwn(d[k],'value')||!d[k].enumerable))return false;return value.version===ASSIST_CONSENT_VERSION&&value.trigger==='eligible-reply'&&typeof value.replyAccess==='boolean'&&typeof value.remoteProcessing==='boolean'&&uuid(value.generation);};
// Durable, explicitly confirmed automatic-experience preferences. These are
// not processing capabilities: every current reply/Context and service request
// still needs its original bounded live qualification. Manual v1 session
// consent is deliberately never imported into this new automatic contract.
export class AssistConsent {
 #selectionHold=null;#api;#consented;#listeners=new Set();#serial=0;#instance=crypto.randomUUID();#value=null;#changing=false;#tail=Promise.resolve();#writes=0;#disposed=false;#blocked=false;#store;#captures=new Set();#pendingCaptures=new Set();#captureReads=new Set();#captureSlots=new Set();
 constructor(api,{consented=async()=>false,store=null}={}){this.#api=api;this.#consented=consented;this.#store=store;originalOwners.set(this,{store,capture:options=>this.#capture(options),facts:cap=>this.#facts(cap),release:cap=>this.#release(cap),reads:()=>[...this.#captureReads],selectionHold:action=>this.#holdSelection(action),selectionHeld:token=>this.#selectionHeld(token),selectionRelease:token=>this.#releaseSelection(token)});}
 onInvalidate(fn){if(typeof fn!=='function'||this.#listeners.size>=8)throw new ArchiveError('RESOURCE_LIMIT');this.#listeners.add(fn);return ()=>this.#listeners.delete(fn);}
 #invalidate(){invalidateOriginalSelectionHold(this.#selectionHold);++this.#serial;this.#value=null;for(const stop of [...this.#pendingCaptures])stop();for(const cap of [...this.#captures])this.#release(cap);for(const fn of [...this.#listeners])try{fn();}catch{/* Every original lease still receives invalidation. */}}
 invalidate(){this.#invalidate();}
 // Failed persistence cannot restore automatic authority from the old disk row.
 // Only a new successful explicit configure clears this current-owner latch.
 #snapshot(){return {replyAccess:!this.#blocked&&this.#value?.replyAccess===true,remoteProcessing:!this.#blocked&&this.#value?.remoteProcessing===true,generation:(this.#value?.generation||'off')+':'+this.#instance+':'+this.#serial};}
 isCurrent(snapshot){return !this.#disposed&&!this.#changing&&!this.#blocked&&this.#value?.replyAccess===true&&this.#value?.remoteProcessing===true&&snapshot?.replyAccess===true&&snapshot?.remoteProcessing===true&&snapshot.generation===this.#snapshot().generation;}
 status(){return this.#status();}
 async #status(capture=null){
  const serial=this.#serial,live=()=>!this.#disposed&&!this.#changing&&serial===this.#serial&&(capture===null||capture.active&&(capture.signal===null||!nativeAborted.call(capture.signal))&&wall()<capture.expiresAt&&mono()<capture.monoDeadline);
  if(this.#disposed||this.#changing||!this.#api.storage?.local)return this.#snapshot();
  let value,consented=false;
  try{value=(await this.#api.storage.local.get(ASSIST_AUTH_KEY))[ASSIST_AUTH_KEY];if(!live())return this.#snapshot();consented=await this.#consented();}catch{if(live())this.#invalidate();return this.#snapshot();}
  if(!live())return this.#snapshot();
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
    if(!this.#api.storage?.local)throw new ArchiveError('UNAVAILABLE');
    if((replyAccess||remoteProcessing)&&await this.#consented()!==true)throw new ArchiveError('CONSENT_REQUIRED');
    if(compare){const stored=(await this.#api.storage.local.get(ASSIST_AUTH_KEY))[ASSIST_AUTH_KEY];if(ticket!==this.#serial||JSON.stringify(stored??null)!==JSON.stringify(before))throw new ArchiveError('STALE_BASE');}
    const value={version:ASSIST_CONSENT_VERSION,trigger:'eligible-reply',replyAccess,remoteProcessing,generation:crypto.randomUUID()};
    await this.#api.storage.local.set({[ASSIST_AUTH_KEY]:value});
    if(!this.#disposed&&writeTicket===this.#writes){this.#value=ticket===this.#serial?Object.freeze(value):null;this.#blocked=false;this.#changing=false;return this.#status();}
    return this.#snapshot();
   }catch(error){if(writeTicket===this.#writes){this.#value=null;this.#blocked=true;this.#changing=false;}throw error;}
  };
  const result=this.#tail.then(write);this.#tail=result.catch(()=>{});return result;
 }
 // This is only a V2 purpose prerequisite, never a selected-field grant.
 // Capture outside an IDB transaction: chrome.storage awaits cannot keep the
 // original material transaction alive. Source grants retain this exact owner.
 async #capture({signal=null,expiresAt=null,monoDeadline=null}={}){
  requireFact(!this.#selectionHold&&this.#store&&this.#captures.size+this.#captureSlots.size<8);const serial=this.#serial,firstWall=wall(),firstMono=mono();
  const deadline=Math.min(expiresAt??firstWall+30000,firstWall+30000),monotonicDeadline=Math.min(monoDeadline??firstMono+30000,firstMono+30000);
  requireFact(Number.isSafeInteger(deadline)&&deadline>firstWall&&Number.isFinite(monotonicDeadline)&&monotonicDeadline>firstMono&&(signal===null||!nativeAborted.call(signal)));
  const slot={logical:false,physical:false};this.#captureSlots.add(slot);
  const lifetime={active:true,signal,expiresAt:deadline,monoDeadline:monotonicDeadline};let timer,stop;const stopped=new Promise((_,reject)=>{stop=()=>{lifetime.active=false;reject(new ArchiveError('UNAVAILABLE'));};});this.#pendingCaptures.add(stop);
  if(signal!==null)nativeAdd.call(signal,'abort',stop,{once:true});timer=setTimeout(stop,Math.max(1,Math.ceil(Math.min(deadline-firstWall,monotonicDeadline-firstMono))));timer.unref?.();
  try{
   // Logical abort returns promptly, but the physical chrome.storage/status
   // operation owns its capacity until it actually settles. Cancellation is
   // not permission to accumulate new unresolved original reads.
   const work=this.#status(lifetime);this.#captureReads.add(work);const settled=()=>{this.#captureReads.delete(work);slot.physical=true;if(slot.logical)this.#captureSlots.delete(slot);};void work.then(settled,settled);
   await Promise.race([work,stopped]);requireFact(this.#captures.size<8&&serial===this.#serial&&!this.#changing&&!this.#blocked&&!this.#disposed&&this.#value?.replyAccess===true&&this.#value?.remoteProcessing===true&&(signal===null||!nativeAborted.call(signal))&&wall()<deadline&&mono()<monotonicDeadline);
   const repository=ownData(this.#store,'repository'),database=ownData(repository,'db'),libraryId=ownData(this.#store,'databaseId');requireFact(database&&typeof libraryId==='string');
   const cap=Object.freeze({}),controller=new AbortController();
   const c={owner:this,store:this.#store,repository,database,libraryId,serial:this.#serial,generation:this.#value.generation,controller,firstWall,firstMono,lastWall:firstWall,lastMono:firstMono,expiresAt:deadline,monoDeadline:monotonicDeadline,retired:false,timer:null};
   purposeCaptures.set(cap,c);this.#captures.add(cap);c.timer=setTimeout(()=>this.#release(cap),Math.max(1,Math.ceil(Math.min(deadline-wall(),monotonicDeadline-mono()))));c.timer.unref?.();this.#facts(cap);return cap;
  }finally{slot.logical=true;if(slot.physical)this.#captureSlots.delete(slot);clearTimeout(timer);this.#pendingCaptures.delete(stop);if(signal!==null)nativeRemove.call(signal,'abort',stop);}
 }
 #holdSelection(action){requireFact(!this.#selectionHold&&!this.#disposed);const h={token:Object.freeze({}),valid:true,selection:originalSelectionHoldBinding(action,this,'source-assist-consent')};this.#selectionHold=h;for(const task of this.#captureReads)retainOriginalSelectionHoldWork(h,task);return h.token;}
 #selectionHeld(token){const h=this.#selectionHold;const current=!!h&&h.token===token&&h.valid&&!this.#disposed&&!this.#changing&&this.#captureReads.size===0&&originalSelectionHoldRemaining(h)>0;if(!current&&h)invalidateOriginalSelectionHold(h);return current;}
 #releaseSelection(token){const h=this.#selectionHold;if(!h||h.token!==token)return false;if(originalSelectionHoldPinned(h)){invalidateOriginalSelectionHold(h);return false;}chargeOriginalSelectionHold(h,{operation:'release'},1);this.#selectionHold=null;return true;}
 #facts(cap){
  const c=purposeCaptures.get(cap);requireFact(c&&c.owner===this);
  try{const now=wall(),elapsed=mono();requireFact(!c.retired&&this.#captures.has(cap)&&!this.#disposed&&!this.#changing&&!this.#blocked&&this.#serial===c.serial&&this.#value?.generation===c.generation&&this.#value.replyAccess===true&&this.#value.remoteProcessing===true&&ownData(c.store,'repository')===c.repository&&ownData(c.repository,'db')===c.database&&ownData(c.store,'databaseId')===c.libraryId&&!nativeAborted.call(c.controller.signal)&&now>=c.lastWall&&elapsed>=c.lastMono&&now<c.expiresAt&&elapsed<c.monoDeadline);c.lastWall=now;c.lastMono=elapsed;return true;}catch(error){c.retired=true;throw error;}
 }
 #release(cap){const c=purposeCaptures.get(cap);requireFact(c&&c.owner===this);c.retired=true;this.#captures.delete(cap);clearTimeout(c.timer);nativeAbort.call(c.controller);}
 dispose(){this.#disposed=true;this.#changing=true;this.#invalidate();this.#listeners.clear();}
}

// Fixed private-brand entry points. An isCurrent/status lookalike or a copied
// status object is not an original automatic-purpose owner or capture.
export function requireAssistAutomaticConsentOwner(owner,store){const r=originalOwners.get(owner);requireFact(r&&r.store===store&&store!==null);return true;}
export async function captureAssistAutomaticConsent(owner,store,options){requireAssistAutomaticConsentOwner(owner,store);return originalOwners.get(owner).capture(options);}
export function assertAssistAutomaticConsentFacts(cap,owner,store){requireAssistAutomaticConsentOwner(owner,store);const c=purposeCaptures.get(cap);requireFact(c&&c.store===store&&c.owner===owner);return originalOwners.get(owner).facts(cap);}
export function assistAutomaticConsentBoundary(cap,owner,store){assertAssistAutomaticConsentFacts(cap,owner,store);const c=purposeCaptures.get(cap);return Object.freeze({signal:c.controller.signal,expiresAt:c.expiresAt,monoDeadline:c.monoDeadline,generation:c.generation+':'+c.serial});}
export function releaseAssistAutomaticConsent(cap,owner,store){requireAssistAutomaticConsentOwner(owner,store);return originalOwners.get(owner).release(cap);}

// Original physical capture work, not a cancellation race, owns quiescence.
export function assistAutomaticConsentReadsQuiet(owner,store){requireAssistAutomaticConsentOwner(owner,store);return originalOwners.get(owner).reads().length===0;}
export function holdAssistAutomaticConsentForSelection(owner,store,action){requireAssistAutomaticConsentOwner(owner,store);return originalOwners.get(owner).selectionHold(action);}
export function assistAutomaticConsentSelectionHeld(owner,store,token){requireAssistAutomaticConsentOwner(owner,store);return originalOwners.get(owner).selectionHeld(token);}
export function releaseAssistAutomaticConsentSelection(owner,store,token){requireAssistAutomaticConsentOwner(owner,store);return originalOwners.get(owner).selectionRelease(token);}
export async function drainAssistAutomaticConsentReads(owner,store,action=null){requireAssistAutomaticConsentOwner(owner,store);for(;;){const pending=originalOwners.get(owner).reads();if(!pending.length)return;if(action!==null){const h={selection:{action,owner,kind:'source-assist-consent'}};for(const task of pending)retainOriginalSelectionHoldWork(h,task);}await Promise.allSettled(pending);}}
