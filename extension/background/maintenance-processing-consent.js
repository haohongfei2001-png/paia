import {contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,CONTEXT_TOPIC_SCOPE_LIMITS,assertContextScopeTransactionIdentity} from '../core/context-topic-scope.js';
import {createMaintenanceProcessingDenyCell,retireMaintenanceProcessingDenyCell,assertMaintenanceProcessingDenyCellFacts,assertMaintenanceProcessingRawDenialFacts} from '../core/ai-usage/maintenance-processing-denial.js';
import {ArchiveError} from '../core/constants.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods,registerRepositoryFinalReadFence} from '../core/idb-repository.js';

export const MAINTENANCE_PROCESSING_KEY='aiu:maintenance-processing-consent:v1';
export const MAINTENANCE_PROCESSING_VERSION=1;
const PURPOSE='AI_MAINTENANCE',RESTORE='recovery-restore-epoch',BUSY='backup-recovery-settings';
const rawPurposes=new WeakMap(),finalPurposes=new WeakMap();
const owners=new WeakMap(),captures=new WeakMap(),views=new WeakMap(),peers=new WeakMap(),disableIntents=new WeakMap(),storeDenials=new WeakMap();
const nativeAbort=AbortController.prototype.abort,nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const wall=Date.now.bind(Date),mono=performance.now.bind(performance);
const fail=code=>{throw new ArchiveError(code);};
const value=(object,key)=>{const d=object&&Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))fail('STALE_BASE');return d.value;};
const uuid=s=>typeof s==='string'&&/^[a-f0-9-]{36}$/.test(s);
const scalar=v=>v===null||typeof v==='string'&&v.length<=200||Number.isSafeInteger(v);
const keys=['id','version','purpose','enabled','generation','libraryId','restoreEpoch'];
function row(raw){
 if(raw===undefined||raw===null)return null;
 if(![Object.prototype,null].includes(Object.getPrototypeOf(raw))||Reflect.ownKeys(raw).length!==keys.length||Reflect.ownKeys(raw).some(k=>!keys.includes(k)))fail('UNAVAILABLE');
 const d=Object.getOwnPropertyDescriptors(raw);if(keys.some(k=>!d[k]||!Object.hasOwn(d[k],'value')||!d[k].enumerable))fail('UNAVAILABLE');
 const v=Object.fromEntries(keys.map(k=>[k,d[k].value]));
 if(v.id!==MAINTENANCE_PROCESSING_KEY||v.version!==1||v.purpose!==PURPOSE||typeof v.enabled!=='boolean'||!uuid(v.generation)||typeof v.libraryId!=='string'||!v.libraryId||v.libraryId.length>200||!scalar(v.restoreEpoch))fail('UNAVAILABLE');
 return Object.freeze(v);
}
function restore(raw){if(raw===undefined||raw===null)return null;if(![Object.prototype,null].includes(Object.getPrototypeOf(raw))||Reflect.ownKeys(raw).some(k=>!['id','value'].includes(k))||value(raw,'id')!==RESTORE)fail('UNAVAILABLE');const v=value(raw,'value');if(!scalar(v))fail('UNAVAILABLE');return v;}
const same=(a,b)=>a===null?b===null:b!==null&&keys.every(k=>a[k]===b[k]);
const retireCapture=c=>{c.failed=true;if(c.denial)retireMaintenanceProcessingDenyCell(c.denial);};
// Pure denial records stay in the bounded capture set until ordinary release or
// expiry. No AbortSignal listener or other callback runs from a facts check.
function retireFacts(r,{binding=false}={}){++r.serial;r.valid=false;if(binding)r.bindingFailed=true;for(const cap of r.caps){const c=captures.get(cap);if(c)retireCapture(c);}}
function original(owner,store){const r=owners.get(owner);if(!r||r.store!==store||r.disposed)fail('UNAVAILABLE');if(r.bindingFailed)fail('STALE_BASE');if(r.repository)try{if(value(store,'repository')!==r.repository||value(r.repository,'db')!==r.database||value(store,'databaseId')!==r.libraryId)fail('STALE_BASE');}catch(error){retireFacts(r,{binding:true});throw error;}return r;}
function bind(r,t){const repository=value(r.store,'repository');requireRepositoryTransactionDataMethods(repository,t);const identity=requireRepositoryTransactionScope(repository,t),database=value(repository,'db'),libraryId=value(r.store,'databaseId');if(identity.database!==database||typeof libraryId!=='string'||!libraryId||libraryId.length>200)fail('STALE_BASE');if(r.repository&&(r.repository!==repository||r.database!==database||r.libraryId!==libraryId)){retireFacts(r,{binding:true});fail('STALE_BASE');}r.repository=repository;r.database=database;r.libraryId=libraryId;}
function invalidateFacts(r,{blocked=false}={}){const serial=++r.serial;if(blocked)r.blocked=true;const held=[];for(const cap of r.caps){const c=captures.get(cap);if(c&&!c.released){c.released=true;retireCapture(c);held.push(c);}}r.caps.clear();return {serial,held};}
function releaseSignals(held){for(const c of held){clearTimeout(c.timer);nativeAbort.call(c.controller);}}
function invalidate(r,options){const {serial,held}=invalidateFacts(r,options);releaseSignals(held);return serial;}
function invalidates(r){++r.deny.serial;r.deny.blocked=true;r.deny.intent=r.intent;const changes=[...(peers.get(r.store)||[])].map(p=>{p.intent=r.intent;return invalidateFacts(p,{blocked:true});});for(const change of changes)releaseSignals(change.held);}
function startChange(r,change){const expected=r.serial+1,denySerial=r.deny.serial+1;r.changing=true;r.activeChange=change;invalidates(r);if(r.serial!==expected||r.deny.serial!==denySerial||r.activeChange!==change){if(r.activeChange===change){r.activeChange=null;r.changing=false;}fail('STALE_BASE');}return expected;}
function generation(r){return r.instance+':'+r.serial+':'+(r.stored?.generation||'absent');}
function view(r){const savedEnabled=r.valid&&r.matches&&r.stored?.enabled===true,result=Object.freeze({enabled:!r.blocked&&!r.changing&&savedEnabled,savedEnabled,generation:generation(r),phase:r.changing?'saving':r.blocked?(r.intent===false?'off_unconfirmed':'save_unknown'):!r.valid?'unavailable':savedEnabled?'on':'off',serviceAvailable:false});views.set(result,{r,serial:r.serial});return result;}
async function read(r,t,workBudget=null,signal=null){
 bind(r,t);const check=()=>{original(r.owner,r.store);if(signal!==null&&nativeAborted.call(signal))fail('CONSENT_REQUIRED');requireRepositoryTransactionScope(r.repository,t);};check();if(workBudget!==null)assertContextScopeWorkBudgetFacts(workBudget,{database:r.database});const reader=workBudget===null?t:contextScopeTransactionReader(r.store,t,workBudget);const rawStored=await reader.get('meta',MAINTENANCE_PROCESSING_KEY);check();let stored,epoch;
 try{stored=row(rawStored);}catch(error){retireFacts(r);throw error;}
 check();const rawEpoch=await reader.get('meta',RESTORE);check();try{epoch=restore(rawEpoch);}catch(error){retireFacts(r);throw error;}
 check();const busy=await reader.get('meta',BUSY);check();if(busy){retireFacts(r);fail('BACKUP_BUSY');}original(r.owner,r.store);
 return {stored,epoch,matches:stored===null||stored.libraryId===r.libraryId&&stored.restoreEpoch===epoch};
}
function observe(r,state){if(r.valid&&(!same(r.stored,state.stored)||r.epoch!==state.epoch)){const expected=invalidate(r);original(r.owner,r.store);if(expected!==r.serial)fail('STALE_BASE');}r.stored=state.stored;r.epoch=state.epoch;r.valid=true;r.matches=state.matches;}

// This owner saves one explicit purpose preference. It does not grant any field,
// identity, provider, financial, external-read, or caller-supplied scope access.
// The nonportable meta key is excluded by the original backup/Sync allowlist.
export class MaintenanceProcessingConsent {
 constructor(store){if(!store||!['object','function'].includes(typeof store))fail('INVALID_REQUEST');const group=peers.get(store)||new Set();if(group.size>=8)fail('RESOURCE_LIMIT');const deny=storeDenials.get(store)||{serial:0,blocked:false,intent:null};storeDenials.set(store,deny);const r={owner:this,store,deny,repository:null,database:null,libraryId:null,instance:crypto.randomUUID(),serial:0,stored:null,epoch:null,valid:false,matches:false,blocked:deny.blocked,changing:false,activeChange:null,disposed:false,bindingFailed:false,intent:deny.intent,capturePending:0,caps:new Set()};owners.set(this,r);group.add(r);peers.set(store,group);}
 status(){return maintenanceProcessingConsentStatus(this,owners.get(this)?.store);}
 configure(request){return configureMaintenanceProcessingConsent(this,owners.get(this)?.store,request);}
 dispose(){return disposeMaintenanceProcessingConsent(this,owners.get(this)?.store);}
}
export async function maintenanceProcessingConsentStatus(owner,store){const r=original(owner,store);if(r.changing)return view(r);const serial=r.serial;try{const state=await store.run(()=>store.repository.transaction(false,t=>read(r,t),['meta']));original(owner,store);if(serial===r.serial)observe(r,state);return view(r);}catch(error){if(serial===r.serial){invalidate(r);r.valid=false;}throw error;}}
// This opaque token only carries the original pre-revocation CAS. It denies
// current use immediately, but cannot bypass subsequent document authentication
// or establish a new persistent baseline.
export function beginMaintenanceProcessingDisable(owner,store,expectedGeneration){
 const r=original(owner,store);if(typeof expectedGeneration!=='string')fail('INVALID_REQUEST');
 const expected=generation(r),before=r.stored,epoch=r.epoch,ready=r.valid&&!r.changing;
 r.intent=false;
 if(!ready||expectedGeneration!==expected){const wasChanging=r.changing;r.changing=true;invalidates(r);r.changing=wasChanging;fail('STALE_BASE');}
 const token=Object.freeze({}),intent={r,owner,store,expected,before,epoch,serial:null,denySerial:null,used:false,cancelled:false};
 intent.serial=startChange(r,intent);intent.denySerial=r.deny.serial;disableIntents.set(token,intent);return token;
}
export function cancelMaintenanceProcessingDisable(token,owner,store){const intent=disableIntents.get(token);if(!intent||intent.owner!==owner||intent.store!==store)fail('UNAVAILABLE');if(intent.cancelled)return;intent.cancelled=true;const r=intent.r;if(r.activeChange===intent){r.activeChange=null;r.changing=false;r.blocked=true;invalidate(r,{blocked:true});}}
export function configureMaintenanceProcessingConsent(owner,store,request,{disableIntent=null}={}){
 const r=original(owner,store),fields=['enabled','expectedGeneration','consentVersion','confirmed'];
 if(!request||Object.getPrototypeOf(request)!==Object.prototype||Reflect.ownKeys(request).length!==fields.length||Reflect.ownKeys(request).some(k=>!fields.includes(k)))fail('INVALID_REQUEST');
 const d=Object.getOwnPropertyDescriptors(request);if(fields.some(k=>!d[k]||!Object.hasOwn(d[k],'value')))fail('INVALID_REQUEST');
 const {enabled,expectedGeneration,consentVersion,confirmed}=request;
 if(typeof enabled!=='boolean'||typeof expectedGeneration!=='string'||consentVersion!==1||confirmed!==true)fail('INVALID_REQUEST');
 let before,epoch,serial,denySerial,change;
 if(disableIntent!==null){
  change=disableIntents.get(disableIntent);
  if(enabled||!change||change.owner!==owner||change.store!==store||change.r!==r||change.used||change.cancelled||change.expected!==expectedGeneration||r.activeChange!==change||change.serial!==r.serial||change.denySerial!==r.deny.serial||!r.changing)fail('STALE_BASE');
  change.used=true;({before,epoch,serial,denySerial}=change);
 }else{
  const expected=generation(r);before=r.stored;epoch=r.epoch;const ready=r.valid&&!r.changing;r.intent=enabled;
  // A stale explicit OFF still denies the live owner before the first await.
  if(!ready||expectedGeneration!==expected){if(!enabled){const wasChanging=r.changing;r.changing=true;invalidates(r);r.changing=wasChanging;}fail('STALE_BASE');}
  change={};serial=startChange(r,change);denySerial=r.deny.serial;
 }
 const current=()=>{original(owner,store);if(r.serial!==serial||r.deny.serial!==denySerial||!r.changing||r.activeChange!==change||change.cancelled)fail('STALE_BASE');return true;};
 const next=Object.freeze({id:MAINTENANCE_PROCESSING_KEY,version:1,purpose:PURPOSE,enabled,generation:crypto.randomUUID(),libraryId:r.libraryId,restoreEpoch:epoch});
 return (async()=>{try{
  await store.run(()=>store.repository.transaction(true,async t=>{
   current();const state=await read(r,t);current();if(!same(state.stored,before)||state.epoch!==epoch)fail('STALE_BASE');
   await t.put('meta',next);current();
   const check=function*(get){if(!same(row(yield get(MAINTENANCE_PROCESSING_KEY)),next)||restore(yield get(RESTORE))!==epoch||(yield get(BUSY)))fail('STALE_BASE');return true;};
   registerRepositoryFinalReadFence(r.repository,t,{isCurrent:current,plan:()=>check(key=>({method:'get',table:'meta',key}))});
  },['meta']));current();
  const verified=await store.run(()=>store.repository.transaction(false,t=>read(r,t),['meta']));current();if(!verified.matches||!same(verified.stored,next)||verified.epoch!==epoch)fail('STALE_BASE');
  observe(r,verified);if(r.deny.serial!==denySerial||r.activeChange!==change)fail('STALE_BASE');
  // Only this explicit change's committed and re-read CAS may clear the current
  // Store denial. Existing peers can then acquire new transaction evidence;
  // every earlier cap and every earlier display generation stays retired.
  r.deny.blocked=false;r.deny.intent=enabled;for(const peer of peers.get(store)||[]){peer.blocked=false;peer.intent=enabled;if(peer!==r)peer.valid=false;++peer.serial;}
  r.changing=false;r.activeChange=null;return view(r);
 }catch(error){if(r.activeChange===change){r.blocked=true;r.changing=false;r.activeChange=null;r.valid=false;}throw error;}finally{if(r.activeChange===change){r.activeChange=null;r.changing=false;}}})();
}
export function disposeMaintenanceProcessingConsent(owner,store){const r=owners.get(owner);if(!r||r.store!==store)fail('UNAVAILABLE');if(r.disposed)return; r.disposed=true;invalidate(r,{blocked:true});peers.get(store)?.delete(r);}

// Private, short-lived purpose evidence, read from the original transaction.
// Future field issuers must separately recheck this exact snapshot in their own
// original read plan; pure facts never claim to observe a later database write.
export async function readMaintenanceProcessingConsent(owner,store,t,{workBudget=null,signal=null}={}){const r=original(owner,store);if(r.changing||r.blocked||r.deny.blocked||r.caps.size+r.capturePending>=8)fail('UNAVAILABLE');r.capturePending++;try{const serial=r.serial,state=await read(r,t,workBudget,signal);original(owner,store);if(serial!==r.serial||r.changing||r.blocked||r.deny.blocked||!state.matches||state.stored?.enabled!==true)fail('CONSENT_REQUIRED');observe(r,state);original(owner,store);if(r.blocked||r.deny.blocked||r.changing)fail('CONSENT_REQUIRED');const cap=Object.freeze({}),controller=new AbortController(),c={owner,store,r,serial:r.serial,denySerial:r.deny.serial,stored:state.stored,epoch:state.epoch,controller,wall:wall(),mono:mono(),released:false,failed:false,timer:null};c.denial=createMaintenanceProcessingDenyCell({store,repository:r.repository,database:r.database,libraryId:r.libraryId,signals:[controller.signal],wallDeadline:c.wall+30000,monoDeadline:c.mono+30000});captures.set(cap,c);r.caps.add(cap);c.timer=setTimeout(()=>releaseMaintenanceProcessingConsent(cap,owner,store),30000);return cap;}finally{r.capturePending--;}}
export function assertMaintenanceProcessingConsentFacts(cap,owner,store){
 const c=captures.get(cap);if(!c||c.owner!==owner||c.store!==store)fail('CONSENT_REQUIRED');
 try{try{assertMaintenanceProcessingDenyCellFacts(c.denial);}catch{fail('CONSENT_REQUIRED');}const r=original(owner,store);if(c.failed||c.released||c.r!==r||c.serial!==r.serial||c.denySerial!==r.deny.serial||r.blocked||r.deny.blocked||r.changing||nativeAborted.call(c.controller.signal)||wall()-c.wall>=30000||mono()-c.mono>=30000||wall()<c.wall||mono()<c.mono)fail('CONSENT_REQUIRED');return true;}catch(error){retireCapture(c);throw error;}
}
export async function assertMaintenanceProcessingConsentSnapshot(cap,owner,store,t,{workBudget=null}={}){
 assertMaintenanceProcessingConsentFacts(cap,owner,store);const c=captures.get(cap);
 try{const state=await read(c.r,t,workBudget,c.controller.signal);assertMaintenanceProcessingConsentFacts(cap,owner,store);if(!state.matches||state.epoch!==c.epoch||!same(state.stored,c.stored)){retireFacts(c.r);fail('CONSENT_REQUIRED');}return true;}catch(error){retireCapture(c);throw error;}
}
export function releaseMaintenanceProcessingConsent(cap,owner,store){const c=captures.get(cap);if(!c||c.owner!==owner||c.store!==store)fail('UNAVAILABLE');if(c.released)return;c.released=true;retireCapture(c);clearTimeout(c.timer);c.r.caps.delete(cap);nativeAbort.call(c.controller);}

// A verified Settings document disappearing can cancel only its pending change.
// It does not erase the saved purpose preference or claim a durable OFF.
export function cancelMaintenanceProcessingConsentChange(owner,store){const r=owners.get(owner);if(!r||r.store!==store)fail('UNAVAILABLE');if(!r.disposed&&r.changing)invalidate(r,{blocked:true});}

export function assertMaintenanceProcessingConsentStatusFacts(result,owner,store){const r=original(owner,store),v=views.get(result);if(!v||v.r!==r||v.serial!==r.serial||result.generation!==generation(r))fail('STALE_BASE');return true;}

// Fixed original-purpose view for the source issuer; no fresh cap or deadline.
export function readMaintenanceProcessingConsentDenial(cap,owner,store){assertMaintenanceProcessingConsentFacts(cap,owner,store);const c=captures.get(cap);return Object.freeze({cell:c.denial,signal:c.controller.signal,expiresAt:c.wall+30000,monoDeadline:c.mono+30000,generation:c.stored.generation,restoreEpoch:c.epoch,libraryId:c.r.libraryId});}

// The association adds a durable-purpose prerequisite to a raw receipt. It
// cannot mint the original source raw brand or authorize a selected field.
export function bindMaintenanceProcessingConsentReceipt(raw,cap,owner,store,{workBudget}={}){
 if(!raw||typeof raw!=='object'||rawPurposes.has(raw))fail('UNAVAILABLE');
 assertMaintenanceProcessingConsentFacts(cap,owner,store);const c=captures.get(cap);
 assertContextScopeWorkBudgetFacts(workBudget,{database:c.r.database});
 rawPurposes.set(raw,{cap,owner,store,workBudget,scopes:new WeakMap()});return true;
}
const purposeReaderParent=Object.getPrototypeOf;
function purposeScope(store,repository,transaction){
 assertContextScopeTransactionIdentity(transaction,store);let scope=transaction;for(let depth=0;scope&&depth<16;depth++,scope=purposeReaderParent(scope)){
  try{const identity=requireRepositoryTransactionScope(repository,scope);requireRepositoryTransactionDataMethods(repository,scope);return {scope,identity};}catch(error){if(depth===15)throw error;}
 }
 fail('UNAVAILABLE');
}
function assertMaintenanceLocalPolicy(config){
 if(config===null||config===undefined)return;
 if(typeof config!=='object'||Array.isArray(config)||![Object.prototype,null].includes(Object.getPrototypeOf(config)))fail('UNAVAILABLE');
 const d=Object.getOwnPropertyDescriptor(config,'localOnly');if(d&&(!Object.hasOwn(d,'value')||typeof d.value!=='boolean'))fail('UNAVAILABLE');
 if(d?.value===true)fail('CONSENT_REQUIRED');
}
export async function assertMaintenanceProcessingConsentReceiptSnapshot(raw,store,transaction,workBudget){
 const binding=rawPurposes.get(raw);if(!binding)return null;
 if(binding.store!==store||binding.workBudget!==workBudget)fail('UNAVAILABLE');
 const {cap,owner}=binding,c=captures.get(cap);assertMaintenanceProcessingConsentFacts(cap,owner,store);
 assertContextScopeWorkBudgetFacts(workBudget,{database:c.r.database});
 const {scope,identity}=purposeScope(store,c.r.repository,transaction),prior=binding.scopes.get(scope);
 if(prior){if(prior.failed)fail('CONSENT_REQUIRED');await prior.promise;assertMaintenanceProcessingConsentFacts(cap,owner,store);assertContextScopeWorkBudgetFacts(workBudget,{database:c.r.database});requireRepositoryTransactionScope(c.r.repository,scope);return true;}
 const observation={failed:false,promise:null};binding.scopes.set(scope,observation);
 observation.promise=(async()=>{
  await assertMaintenanceProcessingConsentSnapshot(cap,owner,store,scope,{workBudget});
  assertMaintenanceProcessingConsentFacts(cap,owner,store);const localPolicy=await contextScopeTransactionReader(store,scope,workBudget).get('meta','memory:config');assertMaintenanceProcessingConsentFacts(cap,owner,store);assertMaintenanceLocalPolicy(localPolicy);
  const current=()=>{assertMaintenanceProcessingConsentFacts(cap,owner,store);assertContextScopeWorkBudgetFacts(workBudget,{database:c.r.database});return true;};current();
  if(identity.mode==='readwrite'){
   const readKey=function*(key){current();if(workBudget.reads>=CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail('BUDGET_EXCEEDED');workBudget.reads++;const seen=workBudget.seen.get('meta')||new Set();seen.add(key);if(seen.size>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail('BUDGET_EXCEEDED');workBudget.seen.set('meta',seen);const value=yield {method:'get',table:'meta',key};current();return value;};
   const plan=function*(){assertMaintenanceLocalPolicy(yield* readKey('memory:config'));if(!same(row(yield* readKey(MAINTENANCE_PROCESSING_KEY)),c.stored)||restore(yield* readKey(RESTORE))!==c.epoch||(yield* readKey(BUSY))){retireFacts(c.r);fail('CONSENT_REQUIRED');}current();return true;};
   const terminal=Object.freeze({});finalPurposes.set(terminal,{raw,cap,owner,store,repository:c.r.repository,database:c.r.database,scope,workBudget});
   registerRepositoryFinalReadFence(c.r.repository,scope,{isCurrent:current,plan,maintenanceProcessingPurpose:terminal});
  }
  current();return true;
 })().catch(error=>{observation.failed=true;retireCapture(c);throw error;});
 await observation.promise;assertMaintenanceProcessingConsentFacts(cap,owner,store);requireRepositoryTransactionScope(c.r.repository,scope);return true;
}

// Minted only by the original purpose-bound raw snapshot above. This token is
// an additional denial group for one live Repository scope, never field or
// source permission. The Repository invokes it after every original callback.
export function requireMaintenanceProcessingPurposeFinalFacts(token,repository,scope){
 const r=finalPurposes.get(token);if(!r||r.repository!==repository||r.scope!==scope)fail('CONSENT_REQUIRED');
 const identity=requireRepositoryTransactionScope(repository,scope);if(identity.mode!=='readwrite'||identity.database!==r.database)fail('CONSENT_REQUIRED');
 assertMaintenanceProcessingConsentFacts(r.cap,r.owner,r.store);
 assertMaintenanceProcessingRawDenialFacts(r.raw,r.store);
 assertContextScopeWorkBudgetFacts(r.workBudget,{database:r.database});
 return true;
}
