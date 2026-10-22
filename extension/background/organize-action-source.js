import {captureOriginalOrganizeScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope,registerOriginalOrganizePaidMetadataBaseline,retireOriginalOrganizePaidMetadataBaseline,isOriginalOrganizePaidMetadataScope} from '../core/organizer/organize-processing-scope.js';
import {DEFAULT_LIMITS} from '../core/organizer/budget.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {snapshot} from '../core/ai-usage/qwen-request-data.js';
import {canonical,opaque,token,fail} from '../core/ai-usage/contracts.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods} from '../core/idb-repository.js';
import {rootReadAuthority} from '../core/organizer/root-read.js';
import {readOrganizeProcessingGrant} from './organize-processing-policy.js';

const owners=new WeakMap(),actions=new WeakMap(),need=x=>{if(!x)fail('UNAVAILABLE');};
const filterSelections=new WeakMap();
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const originalDate=Date,originalPerformance=performance;
const nativeWall=originalDate.now,nativeMono=originalPerformance.now.bind(originalPerformance),nativeClearTimeout=clearTimeout,nativeAbort=AbortController.prototype.abort;
const wall=nativeWall,mono=nativeMono,earlier=(a,b)=>a<b?a:b;
// First-module intrinsic capture is the clock authority. Public descriptors
// are deny-only observations, never callbacks supplying a later timestamp.
const dateRootDescriptor=Object.getOwnPropertyDescriptor(globalThis,'Date'),performanceRootDescriptor=Object.getOwnPropertyDescriptor(globalThis,'performance');
function captureClockPath(object,key){const path=[];for(let current=object;current;current=Object.getPrototypeOf(current)){const descriptor=Object.getOwnPropertyDescriptor(current,key);path.push({object:current,parent:Object.getPrototypeOf(current),descriptor});if(descriptor)return path;}need(false);}
const dateClockPath=captureClockPath(originalDate,'now'),performanceClockPath=captureClockPath(originalPerformance,'now');
function sameClockDescriptor(a,b){
 if(!a||!b)return a===b;
 if(a.enumerable!==b.enumerable||a.configurable!==b.configurable||Object.hasOwn(a,'value')!==Object.hasOwn(b,'value'))return false;
 return Object.hasOwn(a,'value')?a.value===b.value&&a.writable===b.writable:a.get===b.get&&a.set===b.set;
}
function originalClockFacts(){
 need(sameClockDescriptor(Object.getOwnPropertyDescriptor(globalThis,'Date'),dateRootDescriptor)&&sameClockDescriptor(Object.getOwnPropertyDescriptor(globalThis,'performance'),performanceRootDescriptor));
 for(const [path,key]of [[dateClockPath,'now'],[performanceClockPath,'now']])for(const part of path)need(Object.getPrototypeOf(part.object)===part.parent&&sameClockDescriptor(Object.getOwnPropertyDescriptor(part.object,key),part.descriptor));
 // A platform's original global performance accessor may have a setter. Its
 // hidden replacement value is neither invoked nor used: this owner always
 // samples the originally captured native performance object.
 return true;
}
const dataDescriptor=(object,key)=>{const d=Object.getOwnPropertyDescriptor(object??{},key);need(d&&Object.hasOwn(d,'value'));return d;};
const sameDescriptor=(a,b)=>!!a&&!!b&&Object.hasOwn(a,'value')&&Object.hasOwn(b,'value')&&a.value===b.value&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&a.writable===b.writable;
const closed=(value,keys)=>{let copy;try{copy=snapshot(value,{maxBytes:4096,maxKeys:32,maxString:2048});}catch{fail('INVALID_REQUEST');}need(copy&&Object.keys(copy).length===keys.length&&keys.every(k=>Object.hasOwn(copy,k)));return copy;};
const randomBinding=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');

// This source proves an authenticated Archive refresh intent and its exact
// metadata selection. It does not grant text access, entitlement or dispatch.
// The separate Organize purpose policy must still authorize the actual fields.
// GET alone has no processing meaning; UPDATE consumes one original ticket.
export function createOrganizeActionSource(store,api){
 originalClockFacts();const repositoryDescriptor=dataDescriptor(store,'repository'),repository=repositoryDescriptor.value;need(repository&&api?.runtime&&api?.tabs);
 // ArchiveRepository does not own db until its first open. Observe absence
 // without evaluating accessors; the first real use still pins the original
 // repository and its exact own database descriptor in base().
 let databaseDescriptor=Object.getOwnPropertyDescriptor(repository,'db');
 need(databaseDescriptor?Object.hasOwn(databaseDescriptor,'value'):!('db' in repository));
 let database=databaseDescriptor?.value??null,disposed=false,generation=0,bindingRetired=false;
 const tickets=new Map(),live=new Set(),pending=new Set();let lastWall=wall(),lastMono=mono(),lastNativeWall=nativeWall(),lastNativeMono=nativeMono();
 const marked=new Set();
 // A terminal facts check never dispatches abort listeners. Deny first; the
 // ordinary sampled/current, release, timer or disposal path notifies later.
 const markRetired=r=>{if(r.retired)return;r.retired=true;if(r.action)retireOriginalOrganizePaidMetadataBaseline(source,r.action);r.paidMetadata=null;r.paidMetadataState='retired';tickets.delete(r.binding);live.delete(r);r.metadata=null;r.metadataCanonical=null;r.comparedProofs=null;marked.add(r);};
 const retire=r=>{markRetired(r);if(r.notified)return;r.notified=true;nativeClearTimeout(r.timer);marked.delete(r);nativeAbort.call(r.controller);};
 const invalidateFacts=()=>{generation++;for(const r of [...live])markRetired(r);};
 const invalidate=()=>{invalidateFacts();for(const r of [...marked])retire(r);};
 const tighten=r=>{const remaining=earlier(r.deadlineWall-lastWall,r.deadlineMono-lastMono);r.sampledNativeDeadlineWall=earlier(r.sampledNativeDeadlineWall,lastNativeWall+remaining);r.sampledNativeDeadlineMono=earlier(r.sampledNativeDeadlineMono,lastNativeMono+remaining);};
 const time=()=>{
  try{originalClockFacts();}catch(error){invalidate();throw error;}
  const nw=nativeWall(),nm=nativeMono(),w=nw,m=nm;
  if(![w,m,nw,nm].every(Number.isFinite)||w<lastWall||m<lastMono||nw<lastNativeWall||nm<lastNativeMono){invalidate();fail('UNAVAILABLE');}
  lastWall=w;lastMono=m;lastNativeWall=nw;lastNativeMono=nm;for(const r of live)tighten(r);return {w,m,nw,nm};
 };
 const ownURL=url=>{const base=api.runtime.getURL('ui/archive.html');return url===base||typeof url==='string'&&url.startsWith(base+'#')&&topicRootTarget(url)!==null;};
 const senderIdentity=sender=>{
  need(sender?.id===api.runtime.id&&sender.frameId===0&&Number.isSafeInteger(sender.tab?.id)&&sender.tab.id>=0&&Number.isSafeInteger(sender.tab?.windowId)&&sender.tab.windowId>=0&&sender.tab.incognito===false&&opaque(sender.documentId)&&ownURL(sender.url)&&(!sender.documentLifecycle||sender.documentLifecycle==='active'));
  return Object.freeze({documentId:sender.documentId,tabId:sender.tab.id,windowId:sender.tab.windowId,url:sender.url});
 };
 const bindingFacts=()=>{
  try{need(!disposed&&!bindingRetired&&sameDescriptor(Object.getOwnPropertyDescriptor(store,'repository'),repositoryDescriptor)&&database&&sameDescriptor(Object.getOwnPropertyDescriptor(repository,'db'),databaseDescriptor));}
  catch(error){bindingRetired=true;invalidateFacts();throw error;}
 };
 const base=()=>{
  // The worker can construct the source before the original Repository opens.
  // Bind that first real database once; a replacement never establishes a new source.
  if(database===null&&!bindingRetired&&!disposed){const d=dataDescriptor(repository,'db');if(d.value){database=d.value;databaseDescriptor=d;}}
  bindingFacts();
 };
 const pureFacts=r=>{
  try{
   originalClockFacts();bindingFacts();const nw=nativeWall(),nm=nativeMono(),remaining=earlier(r.deadlineWall-lastWall,r.deadlineMono-lastMono);
   need(!r.retired&&r.generation===generation&&live.has(r)&&r.metadata&&!aborted.call(r.controller.signal)&&lastWall<r.deadlineWall&&lastMono<r.deadlineMono&&Number.isFinite(nw)&&Number.isFinite(nm)&&nw>=r.nativeStartedWall&&nm>=r.nativeStartedMono&&remaining>0&&remaining<=DEFAULT_LIMITS.timeoutMs&&nw<r.sampledNativeDeadlineWall&&nm<r.sampledNativeDeadlineMono);
   return true;
  }catch(error){markRetired(r);throw error;}
 };
 const facts=r=>{try{base();pureFacts(r);time();return pureFacts(r);}catch(error){retire(r);throw error;}};
 const authenticate=async sender=>{
  base();const identity=senderIdentity(sender),start=generation;
  const tab=await api.tabs.get(identity.tabId);base();need(start===generation&&tab?.id===identity.tabId&&tab.windowId===identity.windowId&&tab.url===identity.url&&tab.incognito===false&&!tab.pendingUrl);
  need(typeof api.runtime.getContexts==='function');const contexts=await api.runtime.getContexts({contextTypes:['TAB'],documentIds:[identity.documentId]});base();need(start===generation&&Array.isArray(contexts)&&contexts.length<=64&&contexts.some(c=>c?.contextType==='TAB'&&c.documentId===identity.documentId&&c.documentUrl===identity.url&&c.tabId===identity.tabId&&c.windowId===identity.windowId&&c.frameId===0&&c.incognito===false));return identity;
 };
 const readMetadata=async(topicId,action=null)=>store.run(()=>repository.transaction(false,async t=>{const proof=await captureOriginalOrganizeScope(store,t,topicId,action===null?null:source,action);try{return readOriginalOrganizeScope(proof,store,t);}finally{releaseOriginalOrganizeScope(proof);}}));
 const begin=sender=>{base();need(pending.size<8);const p={sender:senderIdentity(sender),cancelled:false};pending.add(p);return p;};
 const pendingCurrent=p=>{base();need(pending.has(p)&&!p.cancelled);};
 const removed=tabId=>{for(const p of pending)if(p.sender.tabId===tabId)p.cancelled=true;for(const r of [...live])if(r.sender.tabId===tabId)retire(r);};
 const changed=(tabId,change)=>{if(change&&(change.url||change.status==='loading'))removed(tabId);};
 need(typeof api.tabs.onUpdated?.addListener==='function'&&typeof api.tabs.onUpdated?.removeListener==='function'&&typeof api.tabs.onRemoved?.addListener==='function'&&typeof api.tabs.onRemoved?.removeListener==='function');
 api.tabs.onUpdated.addListener(changed);try{api.tabs.onRemoved.addListener(removed);}catch(error){api.tabs.onUpdated.removeListener(changed);throw error;}
 const source=Object.freeze({
  async select(sender,request){
   const {topicId}=closed(request,['topicId']);need(opaque(topicId));const p=begin(sender),start=generation;
   try{
    const started=time();
    for(const r of [...live])try{facts(r);}catch{retire(r);}need(live.size+marked.size<8);
    const identity=await authenticate(sender),metadata=await readMetadata(topicId);base();need(generation===start);const after=await authenticate(sender);need(canonical(identity)===canonical(after)&&generation===start);
    pendingCurrent(p);const now=time(),lifetime=DEFAULT_LIMITS.timeoutMs;pendingCurrent(p);need(generation===start&&live.size+marked.size<8&&now.w<started.w+lifetime&&now.m<started.m+lifetime);
    const binding=randomBinding(),r={binding,sender:identity,topicId,metadata,paidMetadata:null,paidMetadataState:'pending',action:null,metadataCanonical:canonical(metadata),comparedProofs:new WeakMap(),generation:start,start,deadlineWall:started.w+lifetime,deadlineMono:started.m+lifetime,nativeStartedWall:started.nw,nativeStartedMono:started.nm,nativeDeadlineWall:started.nw+lifetime,nativeDeadlineMono:started.nm+lifetime,sampledNativeDeadlineWall:started.nw+lifetime,sampledNativeDeadlineMono:started.nm+lifetime,controller:new AbortController(),retired:false,notified:false,consumed:false,userActionId:null,timer:null,work:{reads:0,bytes:0}};
    r.timer=setTimeout(()=>retire(r),Math.max(0,r.deadlineWall-now.w));r.timer.unref?.();tickets.set(binding,r);live.add(r);tighten(r);
    try{pendingCurrent(p);pureFacts(r);return Object.freeze({available:true,topicId,scopeBinding:binding,eligibleCount:metadata.entries.length,maxRequests:4,complete:true,blockedReason:null});}catch(error){retire(r);throw error;}
   }finally{pending.delete(p);}
  },
  async consume(sender,request){
   const {topicId,scopeBinding,userActionId}=closed(request,['topicId','scopeBinding','userActionId']);need(opaque(topicId)&&token(scopeBinding)&&opaque(userActionId));const r=tickets.get(scopeBinding);need(r&&!r.consumed&&r.topicId===topicId&&canonical(r.sender)===canonical(senderIdentity(sender)));facts(r);
   const p=begin(sender);r.consumed=true;r.userActionId=userActionId;tickets.delete(scopeBinding);
   // Register this invocation privately before its first await. The capability
   // is not returned until authentication and the same selection both pass.
   // Internal metadata reads debit this record, and STOP can only deny it.
   const action=Object.freeze({});actions.set(action,{source,record:r});r.action=action;
   try{
    need(canonical(await authenticate(sender))===canonical(r.sender));facts(r);const current=await readMetadata(topicId,action);facts(r);need(canonical(current)===r.metadataCanonical);need(canonical(await authenticate(sender))===canonical(r.sender));facts(r);
    pendingCurrent(p);
    // Initial consumed capture is always complete and charged. Readiness is
    // established only after both authentications and every original fact.
    // The fixed scope registrar also requires its own paid-capture provenance.
    r.paidMetadata=current;r.paidMetadataState='registering';
    const registered=registerOriginalOrganizePaidMetadataBaseline(source,action,store,current);
    r.paidMetadataState=registered?'registered':'never-eligible';r.metadata=current;
    if(!registered)r.paidMetadata=null;
    pureFacts(r);pendingCurrent(p);return action;
   }catch(error){actions.delete(action);retire(r);throw error;}finally{pending.delete(p);}
  },
  async current(action,sender){const a=actions.get(action);need(a?.source===source);try{facts(a.record);need(canonical(await authenticate(sender))===canonical(a.record.sender));facts(a.record);return true;}catch{retire(a.record);return false;}},
  release(action){const a=actions.get(action);if(a?.source===source){retire(a.record);actions.delete(action);}},
  invalidate,
  dispose(){if(disposed)return;disposed=true;invalidate();api.tabs.onUpdated.removeListener(changed);api.tabs.onRemoved.removeListener(removed);}
 });
 const denyRequest=request=>{
  for(const record of live)if(record.consumed&&record.userActionId===request.userActionId&&record.topicId===request.topicId&&record.binding===request.scopeBinding){markRetired(record);return true;}
  return false;
 };
 owners.set(source,{store,repository,base,facts,pureFacts,retire,markRetired,denyRequest});return source;
}

// Must be called while the original metadata producer still owns the current
// transaction. Matching public scope fields or a copied action never suffice.
export function readOriginalOrganizeAction(source,action,store,t,selectionProof){
 const owner=owners.get(source),a=actions.get(action);need(owner&&owner.store===store&&a?.source===source&&a.record.consumed&&a.record.userActionId);owner.facts(a.record);
 const metadata=readOriginalOrganizeScope(selectionProof,store,t),record=a.record;
 // Only memoize the pure comparison of this original immutable facts identity.
 // The original proof still checks the same live transaction on every call.
 if(record.comparedProofs.get(selectionProof)!==metadata&&!isOriginalOrganizePaidMetadataScope(selectionProof,source,action,store,t,metadata))need(canonical(metadata)===record.metadataCanonical);
 owner.facts(record);record.comparedProofs.set(selectionProof,metadata);
 return Object.freeze({purpose:'organize-explicit-intent',topicId:a.record.topicId,userActionId:a.record.userActionId,scopeBinding:a.record.binding,metadata,expiresAt:a.record.deadlineWall,signal:a.record.controller.signal});
}

// Work is cumulative across every qualification transaction of one original
// intent. Reissuing a fresh exact-field receipt cannot reset the local budget.
export function chargeOriginalOrganizeWork(source,action,store,t,selectionProof,{reads=0,bytes=0}={}){
 readOriginalOrganizeAction(source,action,store,t,selectionProof);
 need(Number.isSafeInteger(reads)&&reads>=0&&Number.isSafeInteger(bytes)&&bytes>=0);
 const owner=owners.get(source),record=actions.get(action).record;record.work.reads+=reads;record.work.bytes+=bytes;
 if(record.work.reads>4096||record.work.bytes>DEFAULT_LIMITS.sessionBytes){owner.retire(record);fail('BUDGET_EXCEEDED');}
 owner.facts(record);
}

// This is only a one-action metadata preparation witness. It carries neither
// historical Filter field permission nor a hidden decision. The original
// independent purpose grant must be live when the witness is captured.
export async function captureOriginalOrganizeFilterSelection(source,action,store,t,selectionProof,processingGrant){
 const intent=readOriginalOrganizeAction(source,action,store,t,selectionProof),grant=readOrganizeProcessingGrant(processingGrant,store,t);
 need(grant.scope.purpose==='organize-local-qualification'&&grant.scope.scopeBinding===intent.scopeBinding&&grant.scope.userActionId===intent.userActionId&&grant.signal===intent.signal&&grant.expiresAt===intent.expiresAt);
 const inputIds=Object.freeze(intent.metadata.inputs.map(x=>x.input.id).sort());need(inputIds.length<=100&&new Set(inputIds).size===inputIds.length);
 const owner=owners.get(source),record=actions.get(action).record,repository=store.repository,database=repository.db;
 const held={source,action,owner,record,store,repository,database,inputIds,authority:null};
 const authority=await rootReadAuthority(filterMetadataReader(held,store,t));
 readOriginalOrganizeAction(source,action,store,t,selectionProof);readOrganizeProcessingGrant(processingGrant,store,t);filterCurrent(held,store);
 held.authority=authority;const admission=Object.freeze({});filterSelections.set(admission,held);return admission;
}

function filterCurrent(held,store){
 need(held&&held.store===store&&owners.get(held.source)===held.owner&&actions.get(held.action)?.record===held.record);
 held.owner.facts(held.record);need(dataDescriptor(store,'repository').value===held.repository&&dataDescriptor(held.repository,'db').value===held.database);held.owner.pureFacts(held.record);return held;
}
function chargeFilter(held,store,{reads=0,bytes=0}){
 filterCurrent(held,store);need(Number.isSafeInteger(reads)&&reads>=0&&Number.isSafeInteger(bytes)&&bytes>=0);
 held.record.work.reads+=reads;held.record.work.bytes+=bytes;
 if(held.record.work.reads>4096||held.record.work.bytes>DEFAULT_LIMITS.sessionBytes){held.owner.retire(held.record);fail('BUDGET_EXCEEDED');}
 filterCurrent(held,store);
}
const filterRootIds=new Set(['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','recovery-restore-epoch','backup-data-generation','smart-filter']);
const filterOwn=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row??{},key);need(d&&Object.hasOwn(d,'value'));return d.value;};
const filterScalar=value=>{need(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value));return value;};
function filterMetadataReader(held,store,t){
 filterCurrent(held,store);const scope=requireRepositoryTransactionScope(held.repository,t);need(scope.database===held.database&&scope.mode==='readonly');
 const check=()=>{filterCurrent(held,store);need(requireRepositoryTransactionScope(held.repository,t)===scope);requireRepositoryTransactionDataMethods(held.repository,t);};
 return Object.freeze({async get(table,id){
  check();need(table==='meta'&&filterRootIds.has(id)||table==='filterInputs'&&held.inputIds.includes(id));chargeFilter(held,store,{reads:1});
  check();const row=await t.get(table,id);check();if(!row)return row;need(filterOwn(row,'id')===id);const out={id};
  const fields=table==='filterInputs'?['aiOperationId']:id==='smart-filter'?['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion']:['value'];
  for(const key of fields)if(Object.hasOwn(row,key))out[key]=filterScalar(filterOwn(row,key));
  if(table==='filterInputs'&&Object.hasOwn(row,'aiDecision')){const decision=filterOwn(row,'aiDecision');if(decision===null)out.aiDecision=null;else{need(decision&&typeof decision==='object'&&!Array.isArray(decision));out.aiDecision=Object.freeze({version:filterScalar(filterOwn(decision,'version'))});}}
  const projected=Object.freeze(out);chargeFilter(held,store,{bytes:new TextEncoder().encode(JSON.stringify(projected)).length});check();return projected;
 }});
}
export function readOriginalOrganizeFilterSelection(admission,store){
 const held=filterCurrent(filterSelections.get(admission),store);need(typeof held.authority==='string'&&held.authority.length>0);
 return Object.freeze({inputIds:held.inputIds,authority:held.authority});
}
export function originalOrganizeFilterVisibilityReader(admission,store,t){
 const held=filterCurrent(filterSelections.get(admission),store);return filterMetadataReader(held,store,t);
}

// These exact private-source checks grant no field permission. A transaction
// must still acquire its original selection proof and independent purpose grant.
// Keep the clock-sampling phase separate from the callback-free group tail.
export function requireOriginalOrganizeActionSource(source,store){
 const owner=owners.get(source);need(owner?.store===store);owner.base();return source;
}
function originalActionRecord(source,action,store){
 const owner=owners.get(source),a=actions.get(action);need(owner?.store===store&&a?.source===source&&a.record.consumed&&a.record.userActionId);return {owner,record:a.record};
}
export function assertOriginalOrganizeActionCurrent(source,action,store){
 const {owner,record}=originalActionRecord(source,action,store);owner.facts(record);owner.pureFacts(record);return true;
}
export function assertOriginalOrganizeActionFacts(source,action,store){
 const {owner,record}=originalActionRecord(source,action,store);owner.pureFacts(record);return true;
}

// Deny-only work accounting before metadata qualification and at closed-IDB
// terminal reads. Primitive costs cannot introduce a callback in the pure tail.
// This gives no field, selection or transaction permission. The independent
// original scope/policy must still qualify every actual read.
export function chargeOriginalOrganizeActionWork(source,action,store,reads,bytes){
 const {owner,record}=originalActionRecord(source,action,store);owner.pureFacts(record);
 need(Number.isSafeInteger(reads)&&reads>=0&&Number.isSafeInteger(bytes)&&bytes>=0);
 if(reads>4096-record.work.reads||bytes>DEFAULT_LIMITS.sessionBytes-record.work.bytes){owner.markRetired(record);fail('BUDGET_EXCEEDED');}
 record.work.reads+=reads;record.work.bytes+=bytes;owner.pureFacts(record);
}

// A stop may only deny the exact invocation already registered by consume.
// It cannot mint authority, inspect text, renew a deadline, or release a slot.
// Pure retirement keeps cleanup with the original operation until settlement.
export function denyOriginalOrganizeActionRequest(source,store,request){
 const owner=owners.get(source);need(owner?.store===store);
 const value=closed(request,['topicId','scopeBinding','userActionId']);
 need(opaque(value.topicId)&&token(value.scopeBinding)&&opaque(value.userActionId));
 return owner.denyRequest(value);
}

// No metadata reader is exported. Only the exact scope producer may register
// the already-paid facts after original consume authentication has completed.
export function assertOriginalOrganizePaidMetadataFacts(source,action,store,metadata){
 const {owner,record}=originalActionRecord(source,action,store);owner.pureFacts(record);
 if(record.paidMetadataState==='pending'||record.paidMetadataState==='never-eligible'){need(metadata===null);return false;}
 need((record.paidMetadataState==='registering'||record.paidMetadataState==='registered')&&metadata===record.paidMetadata&&metadata!==null);return true;
}
// Pure denial only: a failed metadata comparison cannot refresh its baseline.
export function retireOriginalOrganizeMetadataAction(source,action,store){
 const owner=owners.get(source),a=actions.get(action);
 if(owner?.store!==store||a?.source!==source)return false;
 owner.markRetired(a.record);return true;
}
