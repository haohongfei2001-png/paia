import {ContextReadService} from '../core/context-read.js';
import {ContextMCPAdapter} from '../core/context-mcp-adapter.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {readContextConnectionConfiguration} from './context-connection-configuration.js';
import {ArchiveError} from '../core/constants.js';
import {qualifyContextConnectionConfiguration,validContextPairingAuthorization,isCurrentContextPairingAuthorization} from './context-connection-policy.js';

export const CONTEXT_CONNECTION_KEY='paia.context-connections.v1';
const HOST='com.paia.context_read',LEASE=3600000;
export const CONTEXT_RESUME_WITNESS='context-connection-runtime:v1';
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&Object.keys(x).every(k=>keys.includes(k));
const fail=(code='INVALID_REQUEST')=>{throw new ArchiveError(code);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const revision=x=>Number.isSafeInteger(x)&&x>=0;
const validRow=row=>exact(row,['version','revision','profileId','databaseId','restoreEpoch','connections'])&&row.version===1&&revision(row.revision)&&uuid(row.profileId)&&typeof row.databaseId==='string'&&row.databaseId.length<=200&&typeof row.restoreEpoch==='string'&&row.restoreEpoch.length<=512&&Array.isArray(row.connections)&&row.connections.length<=8&&new Set(row.connections.map(c=>c.id)).size===row.connections.length&&row.connections.every(c=>exact(c,['id','target','state','generation','credentialHash','expiresAt','port',...(Object.hasOwn(c,'authorization')?['authorization','resumeState']:[])])&&(!Object.hasOwn(c,'authorization')||validContextPairingAuthorization(c.authorization)&&['dirty','clean'].includes(c.resumeState))&&uuid(c.id)&&c.target==='chatgpt'&&['enabled','paused','revoked'].includes(c.state)&&revision(c.generation)&&c.generation>0&&(c.credentialHash===null||/^[a-f0-9]{64}$/.test(c.credentialHash))&&(c.state==='revoked'?c.credentialHash===null:typeof c.credentialHash==='string')&&Number.isSafeInteger(c.expiresAt)&&Number.isSafeInteger(c.port)&&c.port>=1024&&c.port<=65535);

const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
const credential=()=>{const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};

// Only the local worker owns this runtime and calls connectNative. Request
// DTOs cannot attach a port, mint callers or choose an account/store binding.
// The principal is an explicitly paired local PAIA profile, NOT an attested
// ChatGPT account. Every data read still uses the original Context read owner.
export class ContextConnections {
 #selectionHold=null;#admissionGeneration=0;#serialTasks=new Set();#nativeTasks=new Set();#unsettledHosts=0;#unobservedHosts=false;#loaded=false;#observedRow=null;
 #api;#store;#configuration;#row=null;#ports=new Map();#callers=new WeakMap();#receipts=new WeakMap();#tail=Promise.resolve();#pendingWrite=null;#disposed=false;#storageListener;#permissionListener;#lastClock=Date.now();#epochGeneration=0;#denials=new Map();#service;#adapter;#suspending=false;#checkpoint=null;#witness=null;#commands=0;#blocked=new Set();#automaticBlocked=false;
 constructor(store,api,{configuration=readContextConnectionConfiguration()}={}){
  this.#api=api;this.#store=store;this.#configuration=qualifyContextConnectionConfiguration(configuration);
  this.#service=new ContextReadService(store,{connectionVerifier:{verify:(caller,s)=>this.#verify(caller,s),isCurrent:(caller,r,s)=>this.#current(caller,r,s),fenceInTransaction:(caller,r,s,t)=>this.#fence(caller,r,s,t)}});this.#adapter=new ContextMCPAdapter(this.#service);
  this.#storageListener=(changes,area)=>{if(area==='local'&&Object.hasOwn(changes,CONTEXT_CONNECTION_KEY)&&!same(changes[CONTEXT_CONNECTION_KEY]?.newValue,this.#pendingWrite??this.#row))this.invalidate();};api.storage?.onChanged?.addListener(this.#storageListener);
  this.#permissionListener=change=>{if(change?.permissions?.includes('nativeMessaging'))this.invalidate();};api.permissions?.onRemoved?.addListener(this.#permissionListener);
 }
 #ticket(id=null){return {epoch:this.#epochGeneration,admission:this.#admissionGeneration,denial:id?this.#denials.get(id)||0:0};}
 #allowed(ticket,id=null){return !this.#disposed&&ticket?.epoch===this.#epochGeneration&&(!id||ticket.denial===(this.#denials.get(id)||0));}
 #assertTicket(ticket,id=null){if(!this.#allowed(ticket,id))fail('CONTEXT_INVALIDATED');}
 #serial(work){const task=this.#tail.then(work);this.#serialTasks.add(task);const settled=()=>this.#serialTasks.delete(task);void task.then(settled,settled);this.#tail=task.catch(()=>{});return task;}
 #command(work){this.#commands++;return this.#serial(work).finally(()=>{this.#commands--;});}
 #ready(){return !this.#disposed&&new ContextTopicAccessService(this.#store).ready();}
 async #epoch(){if(!this.#ready())fail('CONTEXT_INVALIDATED');return this.#store.repository.transaction(false,async t=>{if(!this.#ready())fail('CONTEXT_INVALIDATED');return (await new ContextTopicAccessService(this.#store).admission(t)).epoch;},['meta']);}
 async #load(){
  if(!this.#ready())fail('CONTEXT_INVALIDATED');const value=(await this.#api.storage.local.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];
  if(value!==undefined&&!validRow(value)){this.invalidate();fail('STORAGE_FAILED');}
  // A cold registry is not evidence that a preceding native listener stopped.
  if(!this.#loaded){this.#loaded=true;this.#unobservedHosts=!!value?.connections.length;}
  else if(!same(this.#observedRow,value??null)&&!same(this.#pendingWrite,value))this.#unobservedHosts=true;
  this.#observedRow=structuredClone(value??null);
  const epoch=await this.#epoch();
  const witness=await this.#store.repository.transaction(false,t=>t.get('meta',CONTEXT_RESUME_WITNESS),['meta']);
  if(witness!==undefined&&witness!==null&&(!exact(witness,['id','version','operationId','phase','row'])||witness.id!==CONTEXT_RESUME_WITNESS||witness.version!==1||!uuid(witness.operationId)||!['pending','settled'].includes(witness.phase)||!validRow(witness.row)))fail('STORAGE_FAILED');
  this.#witness=witness??null;if(value&&(value.databaseId!==this.#store.databaseId||value.restoreEpoch!==epoch)){this.invalidate();return {stale:true,row:value,epoch};}
  const uncertain=!!(value?.connections.some(c=>c.authorization)||witness)&&(!witness||witness.phase!=='settled'||!same(witness.row,value));
  if(this.#row&&!same(this.#row,value??null))this.invalidate();this.#row=value??null;this.#witness=witness??null;return {stale:false,uncertain,row:this.#row,epoch};
 }
 async #persist(row,ticket,id=null){
  this.#assertTicket(ticket,id);if(!validRow(row))fail('STORAGE_FAILED');this.#pendingWrite=row;
  const useWitness=!!this.#witness||row.connections.some(c=>c.authorization),prior=structuredClone(this.#witness),pending={id:CONTEXT_RESUME_WITNESS,version:1,operationId:crypto.randomUUID(),phase:'pending',row:structuredClone(row)};
  const transition=async(expected,next)=>this.#store.repository.transaction(true,async t=>{
   this.#assertTicket(ticket,id);if(!this.#ready()||((await t.get('meta','recovery-restore-epoch'))?.value||'initial')!==row.restoreEpoch)fail('CONTEXT_INVALIDATED');
   if(!same((await t.get('meta',CONTEXT_RESUME_WITNESS))??null,expected))fail('STALE_BASE');await t.put('meta',next);this.#assertTicket(ticket,id);
  },['meta']);
  try{
   // Chrome storage has no CAS. The original IDB meta transaction owns a
   // bounded write-ahead witness. Any unknown/interrupted mirror write remains
   // pending, so a clean-looking Chrome row alone never authorizes cold resume.
   if(useWitness){await transition(prior,pending);this.#witness=structuredClone(pending);}
   await this.#api.storage.local.set({[CONTEXT_CONNECTION_KEY]:row});this.#assertTicket(ticket,id);const read=(await this.#api.storage.local.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY];this.#assertTicket(ticket,id);if(!same(row,read))fail('STALE_BASE');
   if(useWitness){const settled={...pending,phase:'settled'};await transition(pending,settled);this.#witness=structuredClone(settled);}
   this.#row=structuredClone(row);this.#observedRow=structuredClone(row);this.#loaded=true;
  }catch(error){this.invalidate();throw error;}finally{this.#pendingWrite=null;}
 }
 #notify(){try{this.#api.runtime.sendMessage?.({type:'PAIA_CONTEXT_CARDS_CHANGED'})?.catch(()=>{});}catch{/* Observation does not grant transport access. */}}
 #close(id,expected=null){const state=this.#ports.get(id);if(!state||expected&&expected!==state)return;this.#ports.delete(id);state.current=false;if(state.closure==='configured'){state.closure='unknown';this.#unsettledHosts++;}clearTimeout(state.timer);clearTimeout(state.renewTimer);state.retiring?.reject(new ArchiveError('CONTEXT_INVALIDATED'));state.retiring=null;for(const request of state.requests.values())request.abort();state.requests.clear();try{state.port.disconnect();}catch{/* Already disconnected. */}this.#notify();}
 async #handover(id,ticket,{allowStarting=false}={}){
  const state=this.#ports.get(id);if(!state)return;this.#assertTicket(ticket,id);
  // Disable old callers immediately. A native-pipe disconnect does not prove
  // that its child process has released the loopback listener. Only the exact
  // source host's versioned close ACK may permit a replacement live process.
  if(!state.ready&&!allowStarting||state.handover!=='closed-listener-ack-v1'){this.#close(id,state);fail('CONTEXT_INVALIDATED');}
  state.ready=false;clearTimeout(state.timer);clearTimeout(state.renewTimer);for(const request of state.requests.values())request.abort();state.requests.clear();this.#notify();
  try{await new Promise((resolve,reject)=>{state.closeGeneration=state.generation+1;state.retiring={generation:state.closeGeneration,resolve,reject};state.timer=setTimeout(()=>reject(new ArchiveError('CONTEXT_INVALIDATED')),3000);state.port.postMessage({version:1,type:'revoke',hostNonce:state.hostNonce,generation:state.retiring.generation});});this.#assertTicket(ticket,id);}finally{this.#close(id,state);}
 }
 invalidate(){if(this.#selectionHold)this.#selectionHold.valid=false;this.#epochGeneration++;this.#denials.clear();for(const id of [...this.#ports.keys()])this.#close(id);this.#row=null;}
 async status(){
  try{
   const {row,stale,uncertain}=await this.#load();return {available:!!this.#configuration,reason:!this.#configuration?'qualification_required':stale?'store_changed':uncertain?'reconnect_required':'ready',revision:row?.revision??0,...(this.#configuration?.authorizationPolicy?{authorizationPolicy:{id:this.#configuration.authorizationPolicy.id,authorizationLifetimeMs:this.#configuration.authorizationPolicy.authorizationLifetimeMs}}:{}),connections:(row?.connections??[]).map(c=>({id:c.id,target:c.target,state:stale||uncertain?'reconnect_required':c.state==='revoked'?'revoked':c.state==='paused'?'paused':c.expiresAt<=Date.now()?'expired':this.#live(this.#ports.get(c.id))?'connected':'disconnected',generation:c.generation,expiresAt:c.expiresAt,...(c.authorization?{authorizationExpiresAt:c.authorization.expiresAt,persistent:true}:{}),principalMode:'paired-local-profile'})),connectedCount:stale||uncertain?0:[...this.#ports.values()].filter(p=>this.#live(p)).length,externalAllowed:false};
  }catch{return {available:false,reason:'unavailable',revision:null,connections:[],connectedCount:0,externalAllowed:false};}
 }
 async #permission(){if(!this.#configuration||this.#disposed||await this.#api.permissions?.contains?.({permissions:['nativeMessaging']})!==true)fail('FEATURE_UNAVAILABLE');}
 async pair({expectedRevision,port,authorizationPolicyId=null},{replaceStale=false}={}){
  if(this.#suspending||this.#selectionHold)fail('CONTEXT_INVALIDATED');if(!revision(expectedRevision)||!Number.isSafeInteger(port)||port<1024||port>65535)fail();if(typeof replaceStale!=='boolean')fail();let ticket=this.#ticket();
  return this.#command(async()=>{
   await this.#permission();this.#assertTicket(ticket);const {row,epoch,stale}=await this.#load();if(stale&&replaceStale){if(this.#epochGeneration!==ticket.epoch+1)fail('CONTEXT_INVALIDATED');ticket={...this.#ticket(),admission:ticket.admission};}this.#assertTicket(ticket);if(stale&&!replaceStale||replaceStale&&!stale)fail('CONTEXT_INVALIDATED');if((row?.revision??0)!==expectedRevision)fail('STALE_BASE');const retained=stale?[]:row?.connections.filter(c=>c.state!=='revoked')??[];if(retained.length>=8||retained.some(c=>c.port===port))fail('RESOURCE_LIMIT');
   const authorization=this.#authorize(authorizationPolicyId),token=credential(),credentialHash=await hash(token),id=crypto.randomUUID(),connection={id,target:'chatgpt',state:'enabled',generation:1,credentialHash,expiresAt:this.#leaseEnd(authorization),port,...(authorization?{authorization,resumeState:'dirty'}:{})};
   const next=row&&!stale?{...structuredClone(row),connections:structuredClone(retained)}:{version:1,revision:row?.revision??0,profileId:crypto.randomUUID(),databaseId:this.#store.databaseId,restoreEpoch:epoch,connections:[]};next.revision++;next.connections.push(connection);
   // Persist only a one-way hash. The raw credential is returned once to the
   // explicit local pairing UI; never in status, logs, native frames or tools.
   await this.#persist(next,ticket);await this.#connect(connection,ticket);this.#notify();return {id,revision:next.revision,credential:token,expiresAt:connection.expiresAt,...(connection.authorization?{authorizationExpiresAt:connection.authorization.expiresAt,persistent:true}:{}),principalMode:'paired-local-profile'};
  });
 }
 async change({id,action,expectedRevision,authorizationPolicyId=null}){
  if(this.#suspending)fail('CONTEXT_INVALIDATED');if(!uuid(id)||!['pause','revoke','reconnect'].includes(action)||!revision(expectedRevision))fail();
  if(this.#selectionHold){if(action==='reconnect')fail('CONTEXT_INVALIDATED');this.#selectionHold.valid=false;}
  // Restrictions apply before the first await, even if persistence later fails.
  if(action!=='reconnect'){if(this.#blocked.size<32)this.#blocked.add(id);else this.#automaticBlocked=true;if(!this.#denials.has(id)&&this.#denials.size>=32)this.invalidate();this.#denials.set(id,(this.#denials.get(id)||0)+1);this.#close(id);}const ticket=this.#ticket(id);
  return this.#command(async()=>{
   this.#assertTicket(ticket,id);const {row,stale,uncertain}=await this.#load();this.#assertTicket(ticket,id);if(!row||row.revision!==expectedRevision)fail('STALE_BASE');if(stale)fail('CONTEXT_INVALIDATED');const next=structuredClone(row),connection=next.connections.find(c=>c.id===id);if(!connection)fail();
   let token=null;if(action==='reconnect'){
    await this.#permission();this.#assertTicket(ticket,id);const authorization=this.#authorize(authorizationPolicyId);await this.#handover(id,ticket);token=credential();connection.credentialHash=await hash(token);connection.expiresAt=this.#leaseEnd(authorization);connection.state='enabled';delete connection.authorization;delete connection.resumeState;if(authorization){connection.authorization=authorization;connection.resumeState='dirty';}
   }else{connection.state=action==='pause'?'paused':'revoked';if(action==='revoke'){connection.credentialHash=null;delete connection.authorization;delete connection.resumeState;}}
   connection.generation++;next.revision++;await this.#persist(next,ticket,id);if(action==='reconnect'){await this.#connect(connection,ticket);this.#blocked.delete(id);}this.#notify();
   return {id,revision:next.revision,state:connection.state,...(token?{credential:token,expiresAt:connection.expiresAt,...(connection.authorization?{authorizationExpiresAt:connection.authorization.expiresAt,persistent:true}:{}),principalMode:'paired-local-profile'}:{})};
  });
 }
 #authorizationCurrent(authorization){return isCurrentContextPairingAuthorization(authorization,this.#configuration,this.#api.runtime.id,Date.now());}
 #authorize(policyId){
  const policy=this.#configuration?.authorizationPolicy;if(!policy){if(policyId!==null)fail('CONTEXT_INVALIDATED');return null;}
  const now=Date.now();if(policyId!==policy.id||!/^[a-p]{32}$/.test(this.#api.runtime.id)||!Number.isSafeInteger(now+policy.authorizationLifetimeMs)||now<this.#lastClock)fail('CONTEXT_INVALIDATED');
  return {version:1,id:crypto.randomUUID(),policyId:policy.id,qualificationId:this.#configuration.qualificationId,extensionId:this.#api.runtime.id,host:HOST,grantedAt:now,expiresAt:now+policy.authorizationLifetimeMs};
 }
 #leaseEnd(authorization){return Math.min(Date.now()+(authorization?this.#configuration.authorizationPolicy.runtimeLeaseMs:LEASE),authorization?.expiresAt??Number.MAX_SAFE_INTEGER);}
 // This source-only method has no RPC route. Cold resumption retains exactly an
 // explicit current persistent authorization; legacy one-hour rows never gain it.
 // Stop intake before publishing a clean resume checkpoint. Browser suspend
 // callbacks do not guarantee async completion: unacknowledged/dirty state is
 // never promoted by recovery. This is not an automatic clean-crash fiction.
 checkpointForSuspend(){
  if(this.#selectionHold)this.#selectionHold.valid=false;
  if(this.#checkpoint)return this.#checkpoint;if(this.#disposed)return Promise.resolve({checkpointed:0});
  const expected=structuredClone(this.#row),selected=(this.#commands?[]:[...this.#ports.values()]).filter(state=>this.#live(state)).map(state=>state.connectionId).filter(id=>expected?.connections.find(c=>c.id===id)?.authorization);
  this.#suspending=true;this.#epochGeneration++;const ticket=this.#ticket();for(const id of [...this.#ports.keys()])this.#close(id);
  const task=this.#serial(async()=>{
   this.#assertTicket(ticket);await this.#permission();this.#assertTicket(ticket);const {row,stale,uncertain}=await this.#load();this.#assertTicket(ticket);if(stale||uncertain||!row||!same(row,expected))return {checkpointed:0};const next=structuredClone(expected);let checkpointed=0;
   for(const id of selected){const c=next.connections.find(c=>c.id===id);if(c.state==='enabled'&&c.resumeState==='dirty'&&this.#authorizationCurrent(c.authorization)){c.resumeState='clean';checkpointed++;}}
   if(checkpointed){next.revision++;await this.#persist(next,ticket);}return {checkpointed};
  });this.#checkpoint=task;return task;
 }
 async resumeAfterSuspend(){if(!this.#suspending)return {resumed:0};let confirmed=true;try{await this.#checkpoint;}catch{confirmed=false;}this.#checkpoint=null;this.#suspending=false;return confirmed?this.resumeAuthorized():{resumed:0};}
 async resumeAuthorized(){
  if(!this.#configuration?.authorizationPolicy||this.#disposed||this.#suspending||this.#selectionHold||this.#automaticBlocked)return {resumed:0};const epoch=this.#epochGeneration,admission=this.#admissionGeneration,denials=new Map(this.#denials);
  return this.#serial(async()=>{
   let resumed=0;await this.#permission();this.#assertTicket({epoch});const {row,stale,uncertain}=await this.#load();this.#assertTicket({epoch});if(stale||uncertain||!row)return {resumed};
   for(const c of row.connections)if(c.state==='enabled'&&c.resumeState==='clean')this.#assertTicket({epoch,denial:denials.get(c.id)||0},c.id);
   const ids=row.connections.filter(c=>!this.#blocked.has(c.id)&&c.state==='enabled'&&c.resumeState==='clean'&&this.#authorizationCurrent(c.authorization)).map(c=>c.id);
   for(const id of ids){const ticket={epoch,admission,denial:denials.get(id)||0};if(await this.#resumeOne(id,ticket))resumed++;}return {resumed};
  });
 }
 async #resumeOne(id,ticket,expectedState=null){
  this.#assertTicket(ticket,id);if(this.#selectionHold||this.#automaticBlocked||this.#blocked.has(id))return false;await this.#permission();this.#assertTicket(ticket,id);if(this.#selectionHold)return false;if(expectedState&&!this.#live(expectedState))fail('CONTEXT_INVALIDATED');
  const {row,stale,uncertain}=await this.#load();this.#assertTicket(ticket,id);if(this.#selectionHold)return false;if(stale||uncertain||!row)fail('CONTEXT_INVALIDATED');const current=row.connections.find(c=>c.id===id);
  if(!current||current.state!=='enabled'||!this.#authorizationCurrent(current.authorization)||!expectedState&&current.resumeState!=='clean')return false;
  if(expectedState&&(this.#ports.get(id)!==expectedState||current.generation!==expectedState.generation))fail('CONTEXT_INVALIDATED');if(!expectedState&&this.#live(this.#ports.get(id)))return false;
  const next=structuredClone(row),connection=next.connections.find(c=>c.id===id);await this.#handover(id,ticket);connection.generation++;connection.resumeState='dirty';connection.expiresAt=this.#leaseEnd(connection.authorization);next.revision++;
  await this.#persist(next,ticket,id);if(!this.#authorizationCurrent(connection.authorization))fail('CONTEXT_INVALIDATED');await this.#connect(connection,ticket);this.#notify();return true;
 }
 #scheduleRenewal(state){
  if(this.#selectionHold)return;const c=this.#row?.connections.find(c=>c.id===state.connectionId);if(!c?.authorization||!this.#authorizationCurrent(c.authorization)||c.authorization.expiresAt<=state.expiresAt)return;
  const delay=Math.max(1,state.expiresAt-Date.now()-Math.min(60000,Math.floor(this.#configuration.authorizationPolicy.runtimeLeaseMs/5)));
  state.renewTimer=setTimeout(()=>{void this.#serial(()=>this.#resumeOne(state.connectionId,state.ticket,state)).catch(()=>this.#close(state.connectionId,state));},delay);
 }
 async #connect(connection,ticket){
  if(this.#selectionHold||ticket.admission!==this.#admissionGeneration)fail('CONTEXT_INVALIDATED');await this.#permission();this.#assertTicket(ticket,connection.id);if(this.#selectionHold||ticket.admission!==this.#admissionGeneration)fail('CONTEXT_INVALIDATED');if(!this.#row||!this.#ready()||connection.state!=='enabled'||connection.expiresAt<=Date.now()||connection.authorization&&!this.#authorizationCurrent(connection.authorization))fail('CONTEXT_INVALIDATED');
  const port=this.#api.runtime.connectNative(HOST);if(this.#selectionHold||ticket.admission!==this.#admissionGeneration||!this.#allowed(ticket,connection.id)){try{port.disconnect();}catch{}fail('CONTEXT_INVALIDATED');}const state={port,ticket,caller:Object.freeze({}),connectionId:connection.id,generation:connection.generation,expiresAt:connection.expiresAt,profileId:this.#row.profileId,restoreEpoch:this.#row.restoreEpoch,databaseId:this.#row.databaseId,hostNonce:null,ready:false,current:true,closure:'not-configured',closeGeneration:null,requests:new Map(),timer:null,renewTimer:null};
  this.#ports.set(connection.id,state);this.#callers.set(state.caller,state);
  const send=port.postMessage.bind(port); // actual source NativePort primitive
  // A delayed old disconnect/message/expiry must not close a replacement port
  // reusing this connection ID. Bind every lifecycle callback to this object.
  const retire=()=>{if(this.#ports.get(connection.id)===state)this.#close(connection.id);};
  port.onDisconnect.addListener(retire);
  port.onMessage.addListener(message=>{const task=this.#message(state,message,send).catch(retire);this.#nativeTasks.add(task);const settled=()=>this.#nativeTasks.delete(task);void task.then(settled,settled);});
  state.timer=setTimeout(retire,5000);
 }
 #live(state){
  const now=Date.now();if(now<this.#lastClock){this.invalidate();return false;}this.#lastClock=now;
  const c=this.#row?.connections.find(c=>c.id===state?.connectionId);
  return !this.#suspending&&!this.#selectionHold&&!!state&&state.ticket.admission===this.#admissionGeneration&&this.#allowed(state.ticket,state.connectionId)&&this.#ready()&&state.current&&state.ready&&this.#ports.get(state.connectionId)===state&&state.expiresAt>now&&this.#row?.databaseId===this.#store.databaseId&&this.#row.profileId===state.profileId&&this.#row.restoreEpoch===state.restoreEpoch&&c?.state==='enabled'&&c.generation===state.generation&&c.expiresAt===state.expiresAt&&(!c.authorization||this.#authorizationCurrent(c.authorization)&&this.#witness?.phase==='settled'&&same(this.#witness.row,this.#row));
 }
 async #verify(caller,store){
  const state=this.#callers.get(caller);if(store!==this.#store||!this.#live(state))return null;
  await this.#permission();if(!this.#live(state))return null;const {stale,uncertain}=await this.#load();if(stale||uncertain||!this.#live(state))return null;
  const receipt={version:1,store,connectionId:state.connectionId,accountId:state.profileId,authorizationGeneration:state.generation,readable:true,online:true,expiresAt:state.expiresAt};
  // ContextRead copies the receipt. Bind by the private caller and all original
  // fields, never by a JSON object supplied in a tool request.
  this.#receipts.set(caller,receipt);return receipt;
 }
 async #fence(caller,receipt,store,t){if(!this.#current(caller,receipt,store))return false;const epoch=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';if(this.#witness){const witness=await t.get('meta',CONTEXT_RESUME_WITNESS);if(witness?.phase!=='settled'||!same(witness,this.#witness)||!same(witness.row,this.#row))return false;}return epoch===this.#callers.get(caller)?.restoreEpoch&&this.#current(caller,receipt,store);}
 #current(caller,receipt,store){const state=this.#callers.get(caller),original=this.#receipts.get(caller);return store===this.#store&&this.#live(state)&&!!original&&receipt.store===store&&['version','connectionId','accountId','authorizationGeneration','expiresAt','readable','online'].every(k=>receipt[k]===original[k]);}
 async #message(state,message,send){
  // A late exact source ACK can settle only its original retired transport.
  // Disconnect, timeout and a different host/generation never supply this fact.
  if(state.closure==='unknown'&&this.#closeAcknowledged(state,message)){state.closure='closed';this.#unsettledHosts--;return;}
  if(!state.current||!this.#allowed(state.ticket,state.connectionId)||this.#ports.get(state.connectionId)!==state||!plain(message)||message.version!==1)fail();
  if(this.#selectionHold&&!state.retiring&&message.type==='request')return;
  if(message.type==='hello'){
   const enhanced=exact(message,['version','type','hostNonce','handover'])&&message.handover==='closed-listener-ack-v1';if(state.hostNonce||!enhanced&&!exact(message,['version','type','hostNonce'])||!uuid(message.hostNonce))fail();state.hostNonce=message.hostNonce;state.handover=enhanced?message.handover:null;
   const connection=this.#row?.connections.find(c=>c.id===state.connectionId);if(!connection||connection.authorization&&!enhanced||connection.generation!==state.generation||await this.#epoch()!==state.restoreEpoch||!state.current)fail();
   if(state.ticket.admission!==this.#admissionGeneration)return;state.closure='configured';send({version:1,type:'configure',hostNonce:state.hostNonce,connectionId:connection.id,generation:connection.generation,credentialHash:connection.credentialHash,expiresAt:connection.expiresAt,port:connection.port});return;
  }
  if(state.retiring){if(this.#closeAcknowledged(state,message)){const retirement=state.retiring;state.closure='closed';state.retiring=null;retirement.resolve();}return;}
  if(message.hostNonce!==state.hostNonce||message.generation!==state.generation)fail();
  if(message.type==='ready'){
   const connection=this.#row?.connections.find(c=>c.id===state.connectionId);if(!exact(message,['version','type','hostNonce','generation','port'])||state.ready||message.port!==connection?.port||await this.#epoch()!==state.restoreEpoch||!state.current)fail();if(state.ticket.admission!==this.#admissionGeneration)return;state.ready=true;clearTimeout(state.timer);state.timer=setTimeout(()=>this.#close(state.connectionId,state),Math.max(1,state.expiresAt-Date.now()));this.#scheduleRenewal(state);this.#notify();return;
  }
  if(message.type==='unavailable'){this.#close(state.connectionId);return;}
  if(message.type==='cancel'){
   if(!exact(message,['version','type','hostNonce','generation','requestId'])||!uuid(message.requestId))fail();state.requests.get(message.requestId)?.abort();state.requests.delete(message.requestId);return;
  }
  if(message.type!=='request'||!this.#live(state)||!uuid(message.requestId)||state.requests.has(message.requestId)||state.requests.size>=4)fail();
  if(message.method==='tools/list'){
   if(!exact(message,['version','type','hostNonce','generation','requestId','method']))fail();await this.#verify(state.caller,this.#store);if(this.#selectionHold||state.ticket.admission!==this.#admissionGeneration)return;if(!this.#live(state))fail();send({version:1,type:'result',hostNonce:state.hostNonce,generation:state.generation,requestId:message.requestId,result:{tools:this.#adapter.list()}});return;
  }
  if(message.method!=='tools/call'||!exact(message,['version','type','hostNonce','generation','requestId','method','name','arguments']))fail();
  const controller=new AbortController();state.requests.set(message.requestId,controller);
  try{await this.#adapter.call(state.caller,message.name,message.arguments,{signal:controller.signal,publish:result=>{if(!this.#live(state)||controller.signal.aborted||state.requests.get(message.requestId)!==controller)fail('CONTEXT_INVALIDATED');send({version:1,type:'result',hostNonce:state.hostNonce,generation:state.generation,requestId:message.requestId,result});}});}
  catch{if(this.#live(state)&&!controller.signal.aborted)send({version:1,type:'result',hostNonce:state.hostNonce,generation:state.generation,requestId:message.requestId,unavailable:true});}
  finally{state.requests.delete(message.requestId);}
 }
 #closeAcknowledged(state,message){return state.closeGeneration!==null&&state.handover==='closed-listener-ack-v1'&&exact(message,['version','type','hostNonce','generation','handover'])&&message.version===1&&message.type==='revoked'&&message.hostNonce===state.hostNonce&&message.generation===state.closeGeneration&&message.handover===state.handover;}
 #selectionCurrent(hold){return this.#selectionHold===hold&&hold.valid&&!this.#disposed&&!this.#suspending&&!this.#checkpoint&&hold.epoch===this.#epochGeneration&&hold.repository===this.#store.repository&&hold.database===this.#store.repository.db&&hold.databaseId===this.#store.databaseId;}
 async #drainSelection(hold){
  for(;;){if(!this.#selectionCurrent(hold))fail('CONTEXT_INVALIDATED');const tasks=[...this.#serialTasks,...this.#nativeTasks];if(!tasks.length)return;await Promise.allSettled(tasks);}
 }
 // Source-only Context proof, not a global activation capability. Stop intake,
 // settle original work, and require listener closure rather than map emptiness.
 // Admission generations also retire pre-hold continuations after failed/cancelled
 // acquisition; clearing the hold cannot reauthorize old connects or transports.
 async holdForApplicationSelection(){
  if(this.#disposed||this.#suspending||this.#checkpoint||this.#selectionHold)fail('CONTEXT_INVALIDATED');
  const token=Object.freeze(Object.create(null)),hold={token,valid:true,epoch:this.#epochGeneration,repository:this.#store.repository,database:this.#store.repository.db,databaseId:this.#store.databaseId,row:null,witness:null,restoreEpoch:null,ready:false};this.#selectionHold=hold;this.#admissionGeneration++;
  for(const state of this.#ports.values()){clearTimeout(state.renewTimer);for(const request of state.requests.values())request.abort();}
  let timer;
  const acquire=async()=>{
   await this.#drainSelection(hold);
   for(const [id,state]of [...this.#ports]){
    if(!this.#selectionCurrent(hold))fail('CONTEXT_INVALIDATED');
    // The source host cannot listen before configure is sent. A pending hello
    // has drained above; after close its currentness check forbids configure.
    if(state.closure==='not-configured')this.#close(id,state);
    else await this.#handover(id,state.ticket,{allowStarting:true});
   }
   await this.#drainSelection(hold);
   if(this.#configuration)await this.#permission();
   const {row,epoch,stale,uncertain}=await this.#load();if(stale||uncertain||!this.#selectionCurrent(hold)||this.#unobservedHosts||this.#unsettledHosts)fail('CONTEXT_INVALIDATED');
   hold.row=structuredClone(row);hold.witness=structuredClone(this.#witness);hold.restoreEpoch=epoch;hold.ready=true;
   if(!this.applicationSelectionHeld(token))fail('CONTEXT_INVALIDATED');return token;
  };
  try{return await Promise.race([acquire(),new Promise((_,reject)=>{timer=setTimeout(()=>{hold.valid=false;reject(new ArchiveError('CONTEXT_INVALIDATED'));},30000);})]);}
  catch(error){hold.valid=false;for(const [id,state]of [...this.#ports])if(state.ticket.admission!==this.#admissionGeneration)this.#close(id,state);if(this.#selectionHold===hold)this.#selectionHold=null;throw error;}
  finally{clearTimeout(timer);}
 }
 applicationSelectionHeld(token){const h=this.#selectionHold;return !!h&&h.token===token&&h.ready&&this.#selectionCurrent(h)&&this.#ready()&&!this.#commands&&!this.#pendingWrite&&!this.#serialTasks.size&&!this.#nativeTasks.size&&!this.#ports.size&&!this.#unobservedHosts&&!this.#unsettledHosts&&same(h.row,this.#row)&&same(h.witness,this.#witness);}
 async fenceApplicationSelection(token){
  if(!this.applicationSelectionHeld(token))fail('CONTEXT_INVALIDATED');const h=this.#selectionHold;
  try{if(this.#configuration)await this.#permission();const {row,epoch,stale,uncertain}=await this.#load();if(stale||uncertain||epoch!==h.restoreEpoch||!same(row,h.row)||!same(this.#witness,h.witness)||!this.applicationSelectionHeld(token))fail('CONTEXT_INVALIDATED');return true;}
  catch(error){h.valid=false;throw error;}
 }
 // Release never manufactures a clean suspend witness or restarts a host.
 // A cancelled selection uses the original explicit reconnect path. Unknown
 // prior transports remain unqualified until their own exact ACK is observed;
 // a cold nonempty registry needs a future original-owner durable closure proof.
 releaseApplicationSelection(token){if(this.#selectionHold?.token!==token)return false;this.#selectionHold.valid=false;this.#selectionHold=null;return true;}
 dispose(){if(this.#disposed)return;this.#disposed=true;this.invalidate();this.#api.storage?.onChanged?.removeListener(this.#storageListener);this.#api.permissions?.onRemoved?.removeListener(this.#permissionListener);}
}
