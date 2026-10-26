import {originalSelectionHoldBinding,chargeOriginalSelectionHold,trackOriginalSelectionHoldWork,invalidateOriginalSelectionHold,originalSelectionHoldPinned,originalSelectionHoldRemaining,bindOriginalSelectionHoldRepository} from '../local-tool-selection-hold.js';
import {AssistReplyLease,assistReplyLeaseRemaining,assertAssistReplyLeaseCurrent,assertAssistReplyLeaseFacts} from '../../background/assist-reply-lease.js';
import {holdAssistAutomaticConsentForSelection,assistAutomaticConsentSelectionHeld,releaseAssistAutomaticConsentSelection,requireAssistAutomaticConsentOwner,assistAutomaticConsentReadsQuiet,drainAssistAutomaticConsentReads,captureAssistAutomaticConsent,assertAssistAutomaticConsentFacts,assistAutomaticConsentBoundary,releaseAssistAutomaticConsent} from '../../background/assist-consent.js';
import {readAssistContextProcessingPermit,assertAssistContextSelectionFacts} from './assist-context-selector.js';
import {assertContextScopeTransactionIdentity,assertContextScopeWorkBudgetFacts} from '../context-topic-scope.js';
import {contextLineageAdmission} from '../context-item-lineage.js';
import {equal,canonical,fail} from './contracts.js';

// Original Assist-only source. Preferences, external ContextConnections reads,
// Maintenance grants, facade copies and caller-selected DTOs cannot issue a raw.
// Nothing here enables a service or persists a processing capability.
const sources=new WeakMap(),facades=new WeakMap(),selections=new WeakMap(),raws=new WeakMap();
const need=value=>{if(!value)fail('UNAVAILABLE');};
const data=(value,key)=>{const d=value&&Object.getOwnPropertyDescriptor(value,key);need(d&&Object.hasOwn(d,'value'));return d.value;};
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,abort=AbortController.prototype.abort;
const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
const originalLease=Object.freeze({metadata:AssistReplyLease.prototype.metadata,subscribe:AssistReplyLease.prototype.onInvalidate});
const wall=Date.now.bind(Date),mono=performance.now.bind(performance);
function facts(f){
 try{
  const r=f.r;need(!r.disposed&&!f.closed&&data(r.store,'repository')===r.repository&&data(r.repository,'db')===r.database&&data(r.store,'databaseId')===r.libraryId);
  assertAssistAutomaticConsentFacts(f.consent,r.consent,r.store);assertAssistReplyLeaseFacts(r.lease,f.lease);
  const now=wall(),elapsed=mono();need(!aborted.call(f.controller.signal)&&!aborted.call(f.boundary.signal)&&now>=f.lastWall&&elapsed>=f.lastMono&&now<f.boundary.expiresAt&&elapsed<f.boundary.monoDeadline);f.lastWall=now;f.lastMono=elapsed;
  if(f.selector)assertAssistContextSelectionFacts(f.selector,r.store,f.token);
  return true;
 }catch(error){f.closed=true;throw error;}
}
function current(f){facts(f);assertAssistReplyLeaseCurrent(f.r.lease,f.lease);facts(f);}
function close(f){
 if(f.released)return;f.closed=true;f.released=true;clearTimeout(f.timer);remove.call(f.boundary.signal,'abort',f.stop);abort.call(f.controller);
 releaseAssistAutomaticConsent(f.consent,f.r.consent,f.r.store);f.r.active.delete(f.token);f.receipts.clear();
}
function source(value,store,lease){const r=sources.get(value);need(r&&!r.disposed&&!r.hold&&r.store===store&&r.lease===lease);return r;}
export function createAssistContextProcessingSource(store,{consent,lease}={}){
 requireAssistAutomaticConsentOwner(consent,store);need(lease instanceof AssistReplyLease);
 const repository=data(store,'repository'),database=data(repository,'db'),libraryId=data(store,'databaseId');need(database&&typeof libraryId==='string');
 const token=Object.freeze({}),r={token,store,consent,lease,repository,database,libraryId,disposed:false,hold:null,active:new Map(),pending:0,pendingStops:new Set(),opportunities:new WeakMap(),unsubscribe:null};
 const create=purpose=>{
  const facade=Object.freeze({
   async resolve(transaction,scope,permit){
    const p=readAssistContextProcessingPermit(permit,store,transaction,facade,scope),f=selections.get(p.sourceSelection);
    need(f&&f.r===r);
    try{
     need(scope.purpose===purpose);current(f);need(f.selector===null||f.selector===p.selection);f.selector=p.selection;
     assertContextScopeTransactionIdentity(transaction,store);assertContextScopeWorkBudgetFacts(p.budget,{database:r.database});
     // Source policy consumes the same bounded original transaction and exact
     // restore/gate snapshot. No new transaction, body scan, or caller callback.
     const admission=await contextLineageAdmission(store,transaction,p.admission.epoch);current(f);
     need(admission.gate===p.admission.gate&&admission.authority===p.admission.authority);
     const config=await transaction.get('meta','memory:config');current(f);
     if(config!==null&&config!==undefined){need(config&&typeof config==='object'&&!Array.isArray(config));const d=Object.getOwnPropertyDescriptor(config,'localOnly');need(!d||Object.hasOwn(d,'value')&&d.value===false);}
     if(purpose==='assist-context-discovery')need(scope.contextItems.length>0&&scope.contextItems.every(i=>equal(i.selectedFields,['section'])));
     else need(scope.contextItems.length>0);
     const key=canonical(scope),prior=f.receipts.get(purpose);if(prior){need(prior.key===key);assertAssistContextProcessingReceiptFacts(prior.raw,store);return prior.raw;}
     // Processing and discovery are separate original raw brands and epochs.
     // Both inherit the first opportunity's deadline; repeat resolve never tops up.
     let epoch=f.opportunity.epochs.get(purpose+':'+key);if(epoch===undefined){need(f.opportunity.epochs.size<16);epoch=crypto.randomUUID();f.opportunity.epochs.set(purpose+':'+key,epoch);}
     const raw=Object.freeze({version:1,store,scope,epoch,processing:true,expiresAt:f.boundary.expiresAt,revocationSignal:f.controller.signal});
     raws.set(raw,{f,facade,purpose,key});f.receipts.set(purpose,{raw,key});current(f);return raw;
    }catch(error){close(f);throw error;}
   },
   isCurrent(raw,actualStore){const held=raws.get(raw);if(!held||held.facade!==facade||actualStore!==store)return false;try{current(held.f);assertAssistContextProcessingReceiptFacts(raw,store);return true;}catch{close(held.f);return false;}}
  });facades.set(facade,{r,purpose});return facade;
 };
 r.processing=create('assist-context-processing');r.discovery=create('assist-context-discovery');sources.set(token,r);
 r.unsubscribe=originalLease.subscribe.call(lease,()=>{if(r.applicationHold)invalidateOriginalSelectionHold(r.applicationHold);for(const controller of r.pendingStops)abort.call(controller);for(const f of [...r.active.values()])close(f);});return token;
}
export function assistContextProcessingOptions(value,store,lease){const r=source(value,store,lease);return Object.freeze({contextSource:value,contextSelector:null,contextProcessing:r.processing,contextDiscovery:r.discovery});}
export function isAssistContextProcessingFacade(value){return facades.has(value);}
export async function prepareAssistContextProcessingSelection(value,store,lease,cap,{signal=null}={}){
 const r=source(value,store,lease);need(r.active.size+r.pending<8);need(signal===null||!aborted.call(signal));r.pending++;const pending=new AbortController(),firstWall=wall(),firstMono=mono();r.pendingStops.add(pending);const stop=()=>abort.call(pending);if(signal!==null)add.call(signal,'abort',stop,{once:true});let consent=null,f=null;
 try{
  assertAssistReplyLeaseCurrent(lease,cap);const metadata=originalLease.metadata.call(lease,cap),remaining=Math.min(30000,assistReplyLeaseRemaining(lease,cap).remainingMilliseconds);
  let opportunity=r.opportunities.get(cap);if(!opportunity){opportunity={token:Object.freeze({}),generation:null,expiresAt:Math.floor(firstWall+remaining),monoDeadline:firstMono+remaining,epochs:new Map()};r.opportunities.set(cap,opportunity);}
  need(wall()<opportunity.expiresAt&&mono()<opportunity.monoDeadline);
  consent=await captureAssistAutomaticConsent(r.consent,store,{signal:pending.signal,expiresAt:opportunity.expiresAt,monoDeadline:opportunity.monoDeadline});need(!r.disposed&&!r.hold&&!aborted.call(pending.signal));assertAssistReplyLeaseCurrent(lease,cap);need(equal(originalLease.metadata.call(lease,cap),metadata));
  const token=Object.freeze({}),boundary=assistAutomaticConsentBoundary(consent,r.consent,store),controller=new AbortController();
  need(opportunity.generation===null||opportunity.generation===boundary.generation);opportunity.generation=boundary.generation;
  f={r,token,opportunity,consent,boundary,controller,lease:cap,metadata,selector:null,closed:false,released:false,lastWall:wall(),lastMono:mono(),receipts:new Map(),timer:null,stop:null};
  f.stop=()=>close(f);selections.set(token,f);r.active.set(token,f);add.call(boundary.signal,'abort',f.stop,{once:true});
  f.timer=setTimeout(f.stop,Math.max(1,Math.ceil(Math.min(boundary.expiresAt-wall(),boundary.monoDeadline-mono()))));f.timer.unref?.();current(f);return token;
 }catch(error){if(f)close(f);else if(consent)releaseAssistAutomaticConsent(consent,r.consent,store);throw error;}finally{if(signal!==null)remove.call(signal,'abort',stop);r.pendingStops.delete(pending);r.pending--;}
}
export function assertAssistContextProcessingSelectionBinding(token,store,binding,replyBinding){const f=selections.get(token);need(f&&f.r.store===store);try{facts(f);need(equal(f.metadata.binding,binding)&&equal(f.metadata.replyBinding,replyBinding));return true;}catch(error){close(f);throw error;}}
// No callbacks in this final sweep: a later issuer cannot revive an earlier
// revoked source/owner/selection by returning true or masking signal.aborted.
export function assertAssistContextProcessingReceiptFacts(raw,store){const held=raws.get(raw);if(!held)return null;need(held.f.r.store===store);facts(held.f);need(held.f.receipts.get(held.purpose)?.raw===raw);return true;}
export function releaseAssistContextProcessingSelection(token,store){const f=selections.get(token);if(!f)return;need(f.r.store===store);close(f);}
export function disposeAssistContextProcessingSource(value,store,lease){const r=sources.get(value);need(r&&r.store===store&&r.lease===lease);if(r.disposed)return;invalidateOriginalSelectionHold(r.applicationHold);r.disposed=true;r.unsubscribe?.();for(const controller of r.pendingStops)abort.call(controller);for(const f of [...r.active.values()])close(f);}

export function assistContextProcessingSelectionSignal(token,store,binding,replyBinding){assertAssistContextProcessingSelectionBinding(token,store,binding,replyBinding);return selections.get(token).controller.signal;}

// The existing LocalAssistSession hold consumes this original physical owner.
// A logical prepare cancellation cannot substitute for storage settlement.
export function readAssistContextProcessingSelectionMembers(value,store,lease){const r=source(value,store,lease);return Object.freeze([Object.freeze({owner:value,kind:'source-assist-context'}),Object.freeze({owner:r.consent,kind:'source-assist-consent'})]);}
export function holdAssistContextProcessingSource(value,store,lease,action=null){const r=source(value,store,lease),token=Object.freeze({});r.applicationHold={valid:true,selection:originalSelectionHoldBinding(action,value,'source-assist-context')};r.applicationHold.consentHold=action===null?null:holdAssistAutomaticConsentForSelection(r.consent,store,action);r.hold=token;for(const controller of r.pendingStops)abort.call(controller);for(const f of [...r.active.values()])close(f);return token;}
function holding(value,store,lease,token){const r=sources.get(value);need(r&&!r.disposed&&r.store===store&&r.lease===lease&&token!==null&&typeof token==='object'&&r.hold===token&&data(store,'repository')===r.repository&&data(r.repository,'db')===r.database&&data(store,'databaseId')===r.libraryId);return r;}
export async function drainAssistContextProcessingSource(value,store,lease,token){const r=holding(value,store,lease,token);await trackOriginalSelectionHoldWork(r.applicationHold,drainAssistAutomaticConsentReads(r.consent,store,r.applicationHold?.selection?.action??null));holding(value,store,lease,token);need(r.pending===0&&r.active.size===0);}
export function assistContextProcessingSourceHeld(value,store,lease,token){try{const r=holding(value,store,lease,token);const current=r.pending===0&&r.active.size===0&&assistAutomaticConsentReadsQuiet(r.consent,store)&&(!r.applicationHold?.selection||r.applicationHold.valid&&assistAutomaticConsentSelectionHeld(r.consent,store,r.applicationHold.consentHold));if(!current&&r.applicationHold?.selection)invalidateOriginalSelectionHold(r.applicationHold);return current;}catch{const r=sources.get(value);if(r?.applicationHold?.selection)invalidateOriginalSelectionHold(r.applicationHold);return false;}}
export function releaseAssistContextProcessingSourceHold(value,store,lease,token){const r=sources.get(value);need(r&&r.store===store&&r.lease===lease);if(r.hold!==token)return false;if(originalSelectionHoldPinned(r.applicationHold)){invalidateOriginalSelectionHold(r.applicationHold);return false;}chargeOriginalSelectionHold(r.applicationHold,{operation:'release'},1);if(r.applicationHold?.consentHold)releaseAssistAutomaticConsentSelection(r.consent,store,r.applicationHold.consentHold);r.hold=null;r.applicationHold=null;return true;}

// Stable opaque original opportunity identity for the selector's shared ledger.
export function assistContextProcessingOpportunity(token,store,binding,replyBinding){assertAssistContextProcessingSelectionBinding(token,store,binding,replyBinding);return selections.get(token).opportunity.token;}
