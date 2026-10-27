import {originalBootstrapFreeze} from './native-host-bootstrap.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost} from './native-host-bootstrap.js';
import {ArchiveError} from '../core/constants.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {requireOriginalApplicationSelectionValidationMember,requireOriginalApplicationSelectionMember,chargeOriginalApplicationSelectionMember,trackOriginalApplicationSelectionMemberWork,invalidateOriginalApplicationSelectionMember,originalApplicationSelectionMemberPinned} from './application-selection-reservation-coordination.js';
export const APPLICATION_EDITOR_PORT='paia-application-editor-guard:v1';
const records=new WeakMap(),originalOwners=originalBootstrapWeakMap(),limit=64;
const OriginalPromise=Promise,apply=Reflect.apply,originalThen=Promise.prototype.then;
const observe=(promise,yes,no)=>apply(originalThen,promise,[yes,no]);
const clock=performance.now.bind(performance),Timer=setTimeout,clearTimer=clearTimeout;
const fail=()=>{throw new ArchiveError('GENERATION_EDITOR_PROTECTION_REQUIRED');};
const exact=(value,keys)=>value&&Object.getPrototypeOf(value)===Object.prototype&&Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.hasOwn(Object.getOwnPropertyDescriptors(value)[key]??{},'value'));
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=128;
function page(api,url){
 if(typeof url!=='string')return false;
 const archive=api.runtime.getURL('ui/archive.html'),popup=api.runtime.getURL('ui/popup.html'),prompt=api.runtime.getURL('ui/prompt-surface.html');
 return url===archive||url===popup||url.startsWith(archive+'#')&&topicRootTarget(url)!==null||url===prompt||url.startsWith(prompt+'#')&&/^#(?:next-)?[A-Za-z0-9_-]{8,128}$/.test(url.slice(prompt.length));
}
// This issuer proves extension-document quiescence only. It deliberately does
// not issue a backend activation capability: content-script and background
// writers require their own original-owner proof before composition is allowed.
const productionOrigin=originalBootstrapSymbol(),ordinaryOrigin=originalBootstrapSymbol(),injectedOrigin=originalBootstrapSymbol();
function createEditorGuard(api,origin){
 const runtime=api?.runtime,getContexts=runtime?.getContexts,getURL=runtime?.getURL,runtimeId=runtime?.id;
 const members=new Map();let generation=0,active=null,closed=false,selectionAction=null;
 const charge=(value,references=0)=>{if(selectionAction)chargeOriginalApplicationSelectionMember(selectionAction,owner,'editor',value,references);};
 const identities=()=>api?.runtime===runtime&&runtime?.getContexts===getContexts&&runtime?.getURL===getURL&&runtime?.id===runtimeId&&[...members.values()].every(m=>m.port.postMessage===m.post&&m.port.disconnect===m.disconnect);
 const requireAction=()=>{if(selectionAction&&!identities()){poison();refuse();}return selectionAction?requireOriginalApplicationSelectionMember(selectionAction,owner,'editor'):null;};
 const pinned=()=>!!selectionAction&&originalApplicationSelectionMemberPinned(selectionAction,owner,'editor');
 const poison=()=>{if(selectionAction)invalidateOriginalApplicationSelectionMember(selectionAction,owner,'editor');};
 const refuse=()=>{poison();fail();};
 const track=promise=>{if(selectionAction)trackOriginalApplicationSelectionMemberWork(selectionAction,owner,'editor',promise);return promise;};
 const post=(member,message,{funded=false}={})=>{try{if(!funded){requireAction();charge(message,1);}apply(member.post,member.port,[message]);if(selectionAction&&['PREPARE','CHECK'].includes(message.type)&&member.wait?.promise){member.wait.accepted=true;track(member.wait.promise);};}catch(error){invalidate();if(!member.wait?.accepted)member.reject?.(error);}};
 function invalidate(expected=active){
  if(!expected||active===expected)generation++;
  poison();if(expected){expected.valid=false;for(const reject of [...expected.publicWaiters])reject(new ArchiveError('GENERATION_EDITOR_PROTECTION_REQUIRED'));if(!selectionAction)for(const entry of [...expected.waiters])entry.reject(new ArchiveError('GENERATION_EDITOR_PROTECTION_REQUIRED'));}
 }
 function acknowledgements(r,field){
  const original=Promise.all(r.members.map(member=>{let entry;const promise=new OriginalPromise((resolve,reject)=>{
   entry={owner:r,settled:false,timer:null,resolve:null,reject:null,accepted:false};
   const finish=(fn,value)=>{if(entry.settled)return;entry.settled=true;clearTimer(entry.timer);r.waiters.delete(entry);fn(value);};
   entry.resolve=()=>finish(resolve);entry.reject=error=>finish(reject,error);
   // An action ACK is physical work: a timer/invalidation does not settle it.
   if(!selectionAction)entry.timer=Timer(()=>{invalidate(r);entry.reject(new ArchiveError('GENERATION_EDITOR_PROTECTION_REQUIRED'));},Math.max(0,r.deadline-clock()));
   r.waiters.add(entry);member[field]=null;member.wait=entry;member.resolve=entry.resolve;member.reject=entry.reject;
  });entry.promise=promise;return promise;}));return original;
 }
 function connect(port){
  if(port?.name!==APPLICATION_EDITOR_PORT)return false;
  const s=port.sender;
  if(closed||s?.id!==api.runtime.id||s.tab?.incognito||!validId(s.documentId)||!page(api,s.url)||s.documentLifecycle&&s.documentLifecycle!=='active'||!Number.isInteger(s.frameId)||s.frameId<0||members.has(s.documentId)||members.size>=limit){invalidate();try{port.disconnect();}catch{}return true;}
  invalidate();const member={port,post:port.postMessage,disconnect:port.disconnect,id:s.documentId,url:s.url,frameId:s.frameId,ready:false,ack:null,check:null,resolve:null,reject:null};members.set(member.id,member);
  const disconnect=()=>{if(members.get(member.id)===member){members.delete(member.id);invalidate();}if(!selectionAction)member.reject?.(new ArchiveError('GENERATION_EDITOR_PROTECTION_REQUIRED'));};
  port.onDisconnect.addListener(disconnect);
  port.onMessage.addListener(value=>{
   if(selectionAction)try{charge(value,1);}catch{invalidate();}
   if(exact(value,['type','version'])&&value.type==='READY'&&value.version===1&&!member.ready&&!active){member.ready=true;generation++;post(member,{type:'REGISTERED',version:1});return;}
   if(exact(value,['type','nonce'])&&['FROZEN','DENIED','INVALIDATED'].includes(value.type)&&active&&value.nonce===active.nonce&&active.members.includes(member)){
    if(value.type!=='FROZEN'||member.ack!==null){member.resolve?.();invalidate();return;}
    member.ack=value.nonce;member.resolve?.();return;
   }
   if(exact(value,['type','nonce','challenge'])&&value.type==='CHECKED'&&active&&value.nonce===active.nonce&&value.challenge===active.challenge&&active.members.includes(member)&&member.check===null){member.check=value.challenge;member.resolve?.();return;}
   invalidate();
  });
  if(active)try{port.disconnect();}catch{}
  return true;
 }
 async function inventory(){
  if(closed||typeof api.runtime.getContexts!=='function')refuse();
  requireAction();charge({},1);const raw=selectionAction?apply(getContexts,runtime,[{}]):api.runtime.getContexts({});track(raw);
  const contexts=selectionAction?await new OriginalPromise((resolve,reject)=>{try{observe(raw,value=>{try{charge(value,Array.isArray(value)?Math.max(1,value.length):1);resolve(value);}catch(error){invalidate();reject(error);}},error=>{invalidate();reject(error);});}catch(error){invalidate();reject(error);}}):await raw;if(!Array.isArray(contexts)||contexts.length>limit+1)refuse();
  const result=[];for(const c of contexts){if(c?.contextType==='BACKGROUND')continue;if(!c||!validId(c.documentId)||!page(api,c.documentUrl)||c.incognito!==false||!Number.isInteger(c.frameId)||c.frameId<0||result.some(x=>x.documentId===c.documentId))refuse();result.push({documentId:c.documentId,url:c.documentUrl,frameId:c.frameId});}
  result.sort((a,b)=>a.documentId.localeCompare(b.documentId));if(result.length!==members.size||!result.length)refuse();
  for(const c of result){const m=members.get(c.documentId);if(!m?.ready||m.url!==c.url||m.frameId!==c.frameId)refuse();}return result;
 }
 const live=r=>!closed&&(!selectionAction||identities())&&active===r&&r.valid&&r.generation===generation&&clock()<r.deadline;
 const wait=(r,pending)=>new OriginalPromise((resolve,reject)=>{
  // Always observe already issued work; timeout never cancels its late result.
  const failWait=error=>{r.publicWaiters.delete(failWait);clearTimer(timer);reject(error);};
  const timer=Timer(()=>{invalidate(r);failWait(new ArchiveError('GENERATION_EDITOR_PROTECTION_REQUIRED'));},Math.max(0,r.deadline-clock()));r.publicWaiters.add(failWait);
  observe(pending,value=>{r.publicWaiters.delete(failWait);clearTimer(timer);if(!live(r))reject(new ArchiveError('GENERATION_EDITOR_PROTECTION_REQUIRED'));else resolve(value);},error=>{invalidate(r);failWait(error);});
 });
 const checked=(token,allowChecking=false)=>{const r=records.get(token);if(!r||r.owner!==owner||r!==active||!live(r)||r.phase==='inventory'||r.checking&&!allowChecking||r.generation!==generation||r.members.some(m=>members.get(m.id)!==m||m.ack!==r.nonce)){if(r?.owner===owner)invalidate(r);refuse();}return r;};
 const owner=originalBootstrapFreeze({connect,
  async freezeExtensionPages(senderDocumentId){
   if(active||closed||!validId(senderDocumentId))refuse();
   // Reserve synchronously before the first inventory await. Only the original
   // registered pages regain their save path during PREPARE, until their ACK.
   const token=Object.freeze(Object.create(null)),r={token,owner,valid:true,generation,nonce:crypto.randomUUID(),members:[],waiters:new Set(),publicWaiters:new Set(),inventory:null,phase:'inventory',deadline:Math.min(clock()+30000,requireAction()?.deadline??Infinity),fenced:false,challenge:null,checking:false};active=r;records.set(token,r);
   try{
    const first=await wait(r,inventory());if(!live(r)||!first.some(c=>c.documentId===senderDocumentId))refuse();
    r.inventory=first;r.members=[...members.values()];r.phase='preparing';
    // Reserve the exact RELEASE operands before any PREPARE is accepted.
    if(selectionAction){for(const member of r.members)charge({type:'RELEASE',nonce:r.nonce},1);r.releaseFunded=true;}
    charge({phase:'preparing',inventory:first,nonce:r.nonce},1);const waiting=acknowledgements(r,'ack');
    for(const member of r.members)post(member,{type:'PREPARE',nonce:r.nonce});await wait(r,waiting);
    await owner.fenceExtensionPages(token);return token;
   }catch(error){owner.release(token);throw error;}
  },
  assertFrozenExtensionPages(token){checked(token);return true;},
  async fenceExtensionPages(token){const r=checked(token);try{r.checking=true;r.fenced=true;r.challenge=crypto.randomUUID();const waiting=acknowledgements(r,'check');for(const member of r.members)post(member,{type:'CHECK',nonce:r.nonce,challenge:r.challenge});await wait(r,waiting);checked(token,true);const now=await wait(r,inventory());checked(token,true);charge({expected:r.inventory,observed:now,challenge:r.challenge},r.members.length+1);if(JSON.stringify(now)!==JSON.stringify(r.inventory)||r.members.some(m=>m.check!==r.challenge))refuse();r.checking=false;return true;}catch(error){invalidate(r);throw error;}},
  release(token){const r=records.get(token);if(!r||r.owner!==owner)return;if(pinned()){invalidate(r);r.releaseRequested=true;return false;}records.delete(token);if(active===r){active=null;generation++;}r.valid=false;for(const entry of [...r.waiters])entry.reject(new ArchiveError('GENERATION_EDITOR_PROTECTION_REQUIRED'));for(const member of r.members){if(member.wait?.owner===r){member.resolve=null;member.reject=null;member.wait=null;member.ack=null;}post(member,{type:'RELEASE',nonce:r.nonce},{funded:r.releaseFunded===true});}if(closed){for(const m of members.values())try{m.port.disconnect();}catch{}members.clear();}return selectionAction?true:undefined;},
  blocksMutation(sender){if(closed)return true;if(!active)return false;if(selectionAction&&!active.valid)return true;if(active.phase==='inventory'||active.fenced)return true;const member=members.get(sender?.documentId);return !member||member.ack===active.nonce;},
  close(){closed=true;invalidate();if(pinned())return;for(const m of members.values())try{m.port.disconnect();}catch{}members.clear();}
 });
 originalBootstrapWeakSet(originalOwners,owner,{api,origin,current:()=>!closed&&identities(),bind(action){if(selectionAction||active||closed)refuse();requireOriginalApplicationSelectionMember(action,owner,'editor');selectionAction=action;charge({owner:'editor',phase:'bound'},1);},action:()=>selectionAction,token:()=>active?.token});return owner;
}

// Factory-owned provenance and definitions; no caller callbacks or mutable
// first-use prototype snapshots participate in action admission.
export function isOriginalApplicationEditorGuard(owner,api){const r=originalBootstrapWeakGet(originalOwners,owner);return !!r&&r.api===api&&r.current();}
export function holdOriginalApplicationSelectionEditor(action,owner,senderDocumentId){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r)fail();r.bind(action);return owner.freezeExtensionPages(senderDocumentId);}
export function currentOriginalApplicationSelectionEditor(action,owner,token,frame=null){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r||r.action()!==action)return false;try{if(frame===null)requireOriginalApplicationSelectionMember(action,owner,'editor');else requireOriginalApplicationSelectionValidationMember(frame,action,owner,'editor');return owner.assertFrozenExtensionPages(token)===true;}catch{invalidateOriginalApplicationSelectionMember(action,owner,'editor');return false;}}
export function fenceOriginalApplicationSelectionEditor(action,owner,token){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r||r.action()!==action)fail();requireOriginalApplicationSelectionMember(action,owner,'editor');return owner.fenceExtensionPages(token);}
export function releaseOriginalApplicationSelectionEditor(action,owner,token){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r||r.action()!==action)return false;return owner.release(token??r.token());}

export function createInjectedApplicationEditorGuardForTest(api){return createEditorGuard(api,injectedOrigin);}
export function createApplicationEditorGuard(api){return createInjectedApplicationEditorGuardForTest(api);}
export function createOrdinaryApplicationEditorGuard(api){return createEditorGuard(api,ordinaryOrigin);}
export function createProductionApplicationEditorGuard(){if(arguments.length)fail();const api=readOriginalBootstrapHost(),owner=createEditorGuard(api,productionOrigin);requireOriginalBootstrapHost(api);return owner;}
export function isProductionApplicationEditorGuard(owner){const api=readOriginalBootstrapHost(),r=originalBootstrapWeakGet(originalOwners,owner);return !!r&&r.origin===productionOrigin&&r.api===api&&r.current();}
