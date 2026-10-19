import {captureOriginalOrganizeScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
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
const wall=()=>Date.now(),mono=()=>performance.now();
const closed=(value,keys)=>{let copy;try{copy=snapshot(value,{maxBytes:4096,maxKeys:32,maxString:2048});}catch{fail('INVALID_REQUEST');}need(copy&&Object.keys(copy).length===keys.length&&keys.every(k=>Object.hasOwn(copy,k)));return copy;};
const randomBinding=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');

// This source proves an authenticated Archive refresh intent and its exact
// metadata selection. It does not grant text access, entitlement or dispatch.
// The separate Organize purpose policy must still authorize the actual fields.
// GET alone has no processing meaning; UPDATE consumes one original ticket.
export function createOrganizeActionSource(store,api){
 const repository=store?.repository;need(repository&&api?.runtime&&api?.tabs);let database=repository.db,disposed=false,generation=0;
 const tickets=new Map(),live=new Set(),pending=new Set();let lastWall=wall(),lastMono=mono();
 const retire=r=>{if(r.retired)return;r.retired=true;clearTimeout(r.timer);r.controller.abort();tickets.delete(r.binding);live.delete(r);r.metadata=null;};
 const invalidate=()=>{generation++;for(const r of [...live])retire(r);};
 const time=()=>{const w=wall(),m=mono();if(!Number.isFinite(w)||!Number.isFinite(m)||w<lastWall||m<lastMono){invalidate();fail('UNAVAILABLE');}lastWall=w;lastMono=m;return {w,m};};
 const ownURL=url=>{const base=api.runtime.getURL('ui/archive.html');return url===base||typeof url==='string'&&url.startsWith(base+'#')&&topicRootTarget(url)!==null;};
 const senderIdentity=sender=>{
  need(sender?.id===api.runtime.id&&sender.frameId===0&&Number.isSafeInteger(sender.tab?.id)&&sender.tab.id>=0&&Number.isSafeInteger(sender.tab?.windowId)&&sender.tab.windowId>=0&&sender.tab.incognito===false&&opaque(sender.documentId)&&ownURL(sender.url)&&(!sender.documentLifecycle||sender.documentLifecycle==='active'));
  return Object.freeze({documentId:sender.documentId,tabId:sender.tab.id,windowId:sender.tab.windowId,url:sender.url});
 };
 const base=()=>{need(!disposed&&store.repository===repository&&repository.db&&(database===null||database===repository.db));database??=repository.db;};
 const facts=r=>{base();const {w,m}=time();need(!r.retired&&r.generation===generation&&live.has(r)&&r.metadata&&!aborted.call(r.controller.signal)&&w<r.deadlineWall&&m<r.deadlineMono);};
 const authenticate=async sender=>{
  base();const identity=senderIdentity(sender),start=generation;
  const tab=await api.tabs.get(identity.tabId);base();need(start===generation&&tab?.id===identity.tabId&&tab.windowId===identity.windowId&&tab.url===identity.url&&tab.incognito===false&&!tab.pendingUrl);
  need(typeof api.runtime.getContexts==='function');const contexts=await api.runtime.getContexts({contextTypes:['TAB'],documentIds:[identity.documentId]});base();need(start===generation&&Array.isArray(contexts)&&contexts.length<=64&&contexts.some(c=>c?.contextType==='TAB'&&c.documentId===identity.documentId&&c.documentUrl===identity.url&&c.tabId===identity.tabId&&c.windowId===identity.windowId&&c.frameId===0&&c.incognito===false));return identity;
 };
 const readMetadata=async topicId=>store.run(()=>repository.transaction(false,async t=>{const proof=await captureOriginalOrganizeScope(store,t,topicId);try{return readOriginalOrganizeScope(proof,store,t);}finally{releaseOriginalOrganizeScope(proof);}}));
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
    for(const r of [...live])try{facts(r);}catch{retire(r);}need(live.size<8);
    const identity=await authenticate(sender),metadata=await readMetadata(topicId);base();need(generation===start);const after=await authenticate(sender);need(canonical(identity)===canonical(after)&&generation===start);
    pendingCurrent(p);const now=time(),lifetime=DEFAULT_LIMITS.timeoutMs;need(live.size<8&&now.w<started.w+lifetime&&now.m<started.m+lifetime);
    const binding=randomBinding(),r={binding,sender:identity,topicId,metadata,generation,start,deadlineWall:started.w+lifetime,deadlineMono:started.m+lifetime,controller:new AbortController(),retired:false,consumed:false,userActionId:null,timer:null,work:{reads:0,bytes:0}};
    r.timer=setTimeout(()=>retire(r),Math.max(0,r.deadlineWall-now.w));r.timer.unref?.();tickets.set(binding,r);live.add(r);
    return Object.freeze({available:true,topicId,scopeBinding:binding,eligibleCount:metadata.entries.length,maxRequests:4,complete:true,blockedReason:null});
   }finally{pending.delete(p);}
  },
  async consume(sender,request){
   const {topicId,scopeBinding,userActionId}=closed(request,['topicId','scopeBinding','userActionId']);need(opaque(topicId)&&token(scopeBinding)&&opaque(userActionId));const r=tickets.get(scopeBinding);need(r&&!r.consumed&&r.topicId===topicId&&canonical(r.sender)===canonical(senderIdentity(sender)));facts(r);
   const p=begin(sender);r.consumed=true;tickets.delete(scopeBinding);
   try{
    need(canonical(await authenticate(sender))===canonical(r.sender));facts(r);const current=await readMetadata(topicId);facts(r);need(canonical(current)===canonical(r.metadata));need(canonical(await authenticate(sender))===canonical(r.sender));facts(r);
    pendingCurrent(p);r.userActionId=userActionId;const action=Object.freeze({});actions.set(action,{source,record:r});return action;
   }catch(error){retire(r);throw error;}finally{pending.delete(p);}
  },
  async current(action,sender){const a=actions.get(action);need(a?.source===source);try{facts(a.record);need(canonical(await authenticate(sender))===canonical(a.record.sender));facts(a.record);return true;}catch{retire(a.record);return false;}},
  release(action){const a=actions.get(action);if(a?.source===source){retire(a.record);actions.delete(action);}},
  invalidate,
  dispose(){if(disposed)return;disposed=true;invalidate();api.tabs.onUpdated.removeListener(changed);api.tabs.onRemoved.removeListener(removed);}
 });
 owners.set(source,{store,repository,facts,retire});return source;
}

// Must be called while the original metadata producer still owns the current
// transaction. Matching public scope fields or a copied action never suffice.
export function readOriginalOrganizeAction(source,action,store,t,selectionProof){
 const owner=owners.get(source),a=actions.get(action);need(owner&&owner.store===store&&a?.source===source&&a.record.consumed&&a.record.userActionId);owner.facts(a.record);
 const metadata=readOriginalOrganizeScope(selectionProof,store,t);need(canonical(metadata)===canonical(a.record.metadata));owner.facts(a.record);
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
 need(held&&held.store===store&&held.repository===store.repository&&held.database===held.repository.db&&owners.get(held.source)===held.owner&&actions.get(held.action)?.record===held.record);
 held.owner.facts(held.record);return held;
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
