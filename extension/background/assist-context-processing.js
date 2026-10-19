import {captureAssistConsentProcessing,assistConsentProcessingFacts,isAssistConsentProcessingOwner} from './assist-consent.js';
import {captureAssistReplyProcessing,assistReplyProcessingCurrent,assistReplyProcessingFacts,assistReplyProcessingMetadata,assistReplyProcessingSnapshot,isAssistReplyProcessingOwner} from './assist-reply-lease.js';
import {readOriginalAssistSelection,ASSIST_CONTEXT_LIMITS} from '../core/ai-usage/assist-context-selector.js';
import {validateMemoryRow} from '../core/memory/model.js';
import {equal,fail} from '../core/ai-usage/contracts.js';

const sources=new WeakMap(),preparations=new WeakMap();
const nativeWall=Date.now.bind(Date);
const normalize=s=>s.normalize('NFKC').replace(/\s+/gu,' ').trim().toLowerCase();
const nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const need=x=>{if(!x)fail('UNAVAILABLE');};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fields=(actual,allowed)=>Array.isArray(actual)&&actual.length>0&&new Set(actual).size===actual.length&&actual.every(x=>allowed.includes(x));
// The selector proves provenance, not permission. This separate source policy
// grants only the declared automatic Assist purpose: exact local qualification
// plus selected Context, with every original negative restriction still vetoing.
// Global/Card external-read switches and Pro entitlement create no grant here.
function permitted(p){
 const s=p.scope,discovery=s.purpose==='assist-context-discovery';
 need(s.version===1&&(discovery||s.purpose==='assist-context-processing')&&s.contextItems.length<=20&&s.contextItems.length===p.metadata.length);
 need(p.metadata.every(m=>m.lifecycle==='active'&&['manual','automatic'].includes(m.origin)&&['info','rules','now'].includes(m.card)));
 for(const item of s.contextItems){const m=p.metadata.find(x=>x.id===item.itemId);need(m&&m.revision===item.revision&&m.card===item.card&&fields(item.selectedFields,discovery?['section']:['body','section','temporal']));if(discovery)need(equal(item.selectedFields,['section']));else need(item.origin===m.origin&&item.protected===m.protected&&item.userEdited===m.userEdited&&item.lifecycle===m.lifecycle&&equal(item.selectedFields,['body','section',...(m.hasTemporal?['temporal']:[])]));}
 if(!discovery){need(s.inputs.every(i=>fields(i.selectedFields,['body','note']))&&s.entries.every(e=>fields(e.selectedFields,['body','title','note'])));need(s.sourceRecordIds.length<=ASSIST_CONTEXT_LIMITS.sources);}
 need(p.restrictions.length<=4096&&p.restrictions.every(validateMemoryRow));
 const topics=new Set(p.topicIds),inputs=new Set((s.inputs||[]).map(x=>x.inputId)),entries=new Set((s.entries||[]).map(x=>x.entryId)),sections=new Set(p.sections.map(x=>JSON.stringify([x.topicId,x.sectionId]))),byId=new Map(p.topics.map(x=>[x.id,x]));
 for(const m of p.metadata)for(const e of m.maintenance?.provenance.evidence||[]){topics.add(e.topicId);if(e.inputId)inputs.add(e.inputId);if(e.entryId)entries.add(e.entryId);}
 for(const row of p.restrictions){
  need(!(row.kind==='config'&&(row.localOnly===true||row.userTouched===true&&row.externalAccess===false)));
  need(!(row.kind==='input'&&inputs.has(row.inputId)||row.kind==='entry'&&entries.has(row.entryId)||row.kind==='section'&&sections.has(JSON.stringify([row.topicId,row.sectionId]))));
  if(topics.size&&(row.kind==='topic'&&['denied','never'].includes(row.decision)||row.kind==='section')){
   let id=row.topicId;const seen=new Set();for(;;){need(!seen.has(id)&&seen.size<32);seen.add(id);const t=byId.get(id);need(t);if(!t.redirectTo){need(t.lifecycle!=='merged');break;}need(['active','merged'].includes(t.lifecycle));id=t.redirectTo;}
   need(!(row.kind==='topic'&&(topics.has(row.topicId)||topics.has(id))||row.kind==='section'&&id!==row.topicId&&topics.has(id)));
  }
 }
 return true;
}

// Not a generic issuer factory: both original owners must mint their own
// private witnesses, and resolve accepts only a currently executing original
// selector proof. Public scope DTOs, caller IDs and copied proofs never qualify.
export function createAssistContextProcessingSource(store,{consent,leases}={}){
 const repository=store?.repository;let database=repository?.db??null;need(repository&&isAssistConsentProcessingOwner(consent)&&isAssistReplyProcessingOwner(leases));
 const bind=()=>{need(store.repository===repository&&repository.db&&(database===null||repository.db===database));database??=repository.db;};
 let disposed=false,epoch=0;const owners=new Map(),receipts=new WeakMap(),pending=new Set();
 const retire=owner=>{if(owner.retired)return;owner.retired=true;clearTimeout(owner.expiryTimer);for(const r of owner.selections.values()){r.remove();r.controller.abort();}owner.selections.clear();owner.replyText=null;owners.delete(owner.lease);};
 const invalidate=()=>{epoch++;for(const owner of [...owners.values()])retire(owner);};
 // Original brands are checked without enabling a disabled preference.
 // Actual field permission remains tied to each original selection.
 need(typeof consent?.onInvalidate==='function'&&typeof leases?.onInvalidate==='function');
 const stopConsent=consent.onInvalidate(invalidate);let stopLease;try{stopLease=leases.onInvalidate(invalidate);}catch(error){stopConsent();throw error;}
 const facts=owner=>!disposed&&!owner.retired&&owner.epoch===epoch&&owners.get(owner.lease)===owner&&store.repository===repository&&repository.db===database&&assistConsentProcessingFacts(owner.consentWitness,consent)&&assistReplyProcessingFacts(owner.replyWitness,leases,owner.lease);
 const current=owner=>{try{if(!facts(owner)||!assistReplyProcessingCurrent(owner.replyWitness,leases,owner.lease)||!facts(owner)){retire(owner);return false;}return true;}catch{retire(owner);return false;}};
 const source=Object.freeze({
  forLease(lease,snapshot){
   need(!disposed);bind();const prior=owners.get(lease);if(prior){need(prior.value&&current(prior)&&normalize(assistReplyProcessingSnapshot(prior.replyWitness,leases,lease,snapshot).text)===prior.replyText);return prior.value;}
   for(const owner of [...owners.values()])current(owner);need(owners.size<8);const consentWitness=captureAssistConsentProcessing(consent),replyWitness=captureAssistReplyProcessing(leases,lease),metadata=assistReplyProcessingMetadata(replyWitness,leases,lease),replyText=normalize(assistReplyProcessingSnapshot(replyWitness,leases,lease,snapshot).text);
   const owner={lease,consentWitness,replyWitness,metadata,replyText,epoch,retired:false,selections:new Map(),value:null,expiryTimer:null};owners.set(lease,owner);need(current(owner));owner.expiryTimer=setTimeout(()=>retire(owner),Math.max(0,metadata.expiresAt-nativeWall()));owner.expiryTimer.unref?.();
   const make=purpose=>Object.freeze({
    resolve(t,scope,proof){
     need(current(owner));const p=readOriginalAssistSelection(proof,store,t);need(p.replyText===owner.replyText&&p.scope.purpose===purpose&&equal(scope,p.scope)&&equal(p.binding,metadata.binding)&&equal(p.replyBinding,metadata.replyBinding));permitted(p);need(current(owner));
     let selection=owner.selections.get(p.selection);if(!selection){need(owner.selections.size<8);const controller=new AbortController(),abort=()=>{controller.abort();owner.selections.delete(p.selection);};EventTarget.prototype.addEventListener.call(p.signal,'abort',abort,{once:true});selection={controller,remove:()=>EventTarget.prototype.removeEventListener.call(p.signal,'abort',abort),signal:p.signal,restoreEpoch:p.restoreEpoch,grants:new Map()};owner.selections.set(p.selection,selection);}
     need(selection.restoreEpoch===p.restoreEpoch&&!nativeAborted.call(selection.signal)&&!nativeAborted.call(selection.controller.signal));
     const old=selection.grants.get(purpose);if(old){need(equal(old.scope,p.scope));return old;}
     const raw=Object.freeze({version:1,store,scope:freeze(structuredClone(p.scope)),epoch:crypto.randomUUID(),processing:true,expiresAt:metadata.expiresAt,revocationSignal:selection.controller.signal});
     selection.grants.set(purpose,raw);receipts.set(raw,{owner,selection,purpose});need(current(owner));return raw;
    },
    isCurrent(raw,actualStore){const r=receipts.get(raw);return !!r&&r.owner===owner&&r.purpose===purpose&&actualStore===store&&current(owner)&&!nativeAborted.call(r.selection.signal)&&!nativeAborted.call(r.selection.controller.signal)&&r.selection.grants.get(purpose)===raw&&facts(owner);}
   });
   owner.value=Object.freeze({processing:make('assist-context-processing'),discovery:make('assist-context-discovery')});return owner.value;
  },
  dispose(){if(disposed)return;disposed=true;invalidate();stopConsent();stopLease();}
 });
 sources.set(source,{store,repository,database,leases,consent,source,bind,current:()=>!disposed&&store.repository===repository&&(database===null||repository.db===database),pending});return source;
}
// The original session holds this slot through every awaited preparation. A
// revoked/aborted task keeps its slot until its own finally actually settles.
export function requireAssistContextProcessingSource(source,store,leases){const r=sources.get(source);need(r&&r.store===store&&r.leases===leases&&r.current());return source;}
export function beginAssistContextProcessing(source,store,leases,lease){requireAssistContextProcessingSource(source,store,leases);const r=sources.get(source);r.bind();need(r.pending.size<8);const consentWitness=captureAssistConsentProcessing(r.consent),replyWitness=captureAssistReplyProcessing(leases,lease);need(assistConsentProcessingFacts(consentWitness,r.consent));const ticket=Object.freeze({});r.pending.add(ticket);preparations.set(ticket,{r,lease,consentWitness,replyWitness,active:true});return ticket;}
export function resolveAssistContextProcessing(ticket,lease,snapshot){const p=preparations.get(ticket);need(p?.active&&p.lease===lease&&p.r.pending.has(ticket)&&p.r.current()&&assistReplyProcessingCurrent(p.replyWitness,p.r.leases,lease)&&assistConsentProcessingFacts(p.consentWitness,p.r.consent));return p.r.source.forLease(lease,snapshot);}
export function finishAssistContextProcessing(ticket){const p=preparations.get(ticket);if(!p||!p.active)return;p.active=false;p.r.pending.delete(ticket);preparations.delete(ticket);}

