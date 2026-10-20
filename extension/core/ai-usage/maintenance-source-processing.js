import {requireMaintenanceProcessingSelection} from './maintenance-processing-source-denial.js';
import {readMaintenanceProcessingSelection,readMaintenanceProcessingRequestPermit} from './local-maintenance-session.js';
import {readMaintenanceQualificationRequestPermit} from './maintenance-qualification.js';
import {readMaintenanceServiceProcessingPlan,readMaintenanceServiceProcessingDenial,assertMaintenanceServiceLifecycleFacts} from './maintenance-service-client.js';
import {readMaintenanceProcessingConsent,readMaintenanceProcessingConsentDenial,assertMaintenanceProcessingConsentFacts,assertMaintenanceProcessingConsentSnapshot,releaseMaintenanceProcessingConsent,bindMaintenanceProcessingConsentReceipt,assertMaintenanceProcessingConsentReceiptSnapshot} from '../../background/maintenance-processing-consent.js';
import {createMaintenanceProcessingDenyCell,retireMaintenanceProcessingDenyCell,assertMaintenanceProcessingDenyCellFacts,bindMaintenanceProcessingRawDenials,assertMaintenanceProcessingRawDenialFacts} from './maintenance-processing-denial.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,assertContextScopeTransactionIdentity} from '../context-topic-scope.js';
import {canonical,equal,exact,fail,opaque} from './contracts.js';
const issuers=new WeakMap(),receipts=new WeakMap();
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,abort=AbortController.prototype.abort;
const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
const wall=Date.now.bind(Date),mono=performance.now.bind(performance),need=value=>{if(!value)fail('UNAVAILABLE');};
const data=(value,key,optional=false)=>{const d=value&&Object.getOwnPropertyDescriptor(value,key);if(!d&&optional)return undefined;need(d&&Object.hasOwn(d,'value'));return d.value;};
const processingReaderParent=Object.getPrototypeOf;
function originalScope(store,transaction){assertContextScopeTransactionIdentity(transaction,store);const repository=data(store,'repository');let t=transaction;for(let depth=0;t&&depth<16;depth++,t=processingReaderParent(t)){try{requireRepositoryTransactionScope(repository,t);requireRepositoryTransactionDataMethods(repository,t);return t;}catch{}}fail('UNAVAILABLE');}
function currentFamily(r,f){
 need(!r.disposed&&!f.closed);assertMaintenanceProcessingDenyCellFacts(f.denial);assertMaintenanceProcessingDenyCellFacts(f.selection.denial);
 assertMaintenanceServiceLifecycleFacts(f.selection.lifecycleCap,f.selection.client,r.store);
 assertContextScopeWorkBudgetFacts(f.selection.budget,{database:f.database});
 if(f.cap)assertMaintenanceProcessingConsentFacts(f.cap,r.consentOwner,r.store);
 return true;
}
function releaseFamily(r,f){
 if(!f.closed){f.closed=true;try{fail('UNAVAILABLE');}catch(error){f.rejectStop?.(error);}retireMaintenanceProcessingDenyCell(f.denial);clearTimeout(f.timer);for(const [signal,listener]of f.listeners)remove.call(signal,'abort',listener);f.listeners=[];abort.call(f.controller);if(f.cap){releaseMaintenanceProcessingConsent(f.cap,r.consentOwner,r.store);f.cap=null;}f.raws.clear();}
 if(f.pending===0)r.families.delete(f.selection.token);
}
function originalPermit(r,transaction,scope,permit){
 const qualified=readMaintenanceQualificationRequestPermit(permit,r.store,transaction,r.processing);
 const p=readMaintenanceProcessingRequestPermit(qualified?.selectorPermit??permit,r.store,transaction,r.processing);need(p);
 const selected=readMaintenanceProcessingSelection(p.selection,r.store,transaction);
 const plan=readMaintenanceServiceProcessingPlan(p.client,r.store);
 need(plan.processing===r.processing&&plan.context===r.context&&p.caller===r.caller&&plan.caller===r.caller&&plan.resolve===r.processing.resolve&&plan.isCurrent===r.processing.isCurrent&&p.client===selected.client&&p.lifecycleCap===selected.lifecycleCap&&p.budget===selected.budget);
 if(qualified){need(p.kind==='qualification'&&qualified.scope===scope&&qualified.request===p.request&&qualified.selectionSpec===p.selectionSpec&&qualified.phase===p.phase&&qualified.binding===p.binding&&qualified.parent===p.parent&&qualified.budget===p.budget);}
 else need(p.kind==='payload'&&p.scope===scope);
 if(r.client!==null)need(r.client===p.client);else r.client=p.client;
 need(p.request.items.length>0&&p.request.items.length<=20&&p.request.items.every(i=>i.descriptor.kind==='input'&&!i.descriptor.removed&&!i.descriptor.fenceOnly&&i.descriptor.inputIds.length===1&&i.descriptor.inputIds[0]===i.descriptor.entityId));
 const ids=p.request.items.map(i=>i.descriptor.entityId);need(new Set(ids).size===ids.length&&p.request.coverage.every(u=>p.request.items.some(i=>i.key===u.key)&&u.scope===plan.scope&&['topic','context'].includes(u.facet)));
 const wanted=scope.inputs?.map(i=>i.inputId);need(Array.isArray(wanted)&&new Set(wanted).size===wanted.length&&wanted.every(id=>ids.includes(id)));
 if(qualified){
  exact(scope,['purpose','phase','binding','batchFingerprint','restoreEpoch','rootAuthority','inputs','sources','entries','structures','journals']);
  need(scope.purpose==='ai-maintenance-qualification'&&['prejob','child-mapping','child'].includes(p.phase)&&scope.phase===p.phase&&equal(scope.binding,p.binding)&&scope.entries.length===0&&scope.structures.length===0&&scope.journals.length===0);
  need(scope.inputs.every(i=>equal(i.selectedFields,['body','note']))&&scope.sources.every(s=>equal(s.selectedFields,['originalText'])));
  need((p.selectionSpec.inputIds??[]).length===wanted.length&&(p.selectionSpec.inputIds??[]).every(id=>wanted.includes(id)));
 }else{
  exact(scope,['purpose','logicalJobId','childOperationId','principalId','libraryId','consentEpoch','inputs','facets','coverage']);
  need(scope.purpose==='ai-maintenance-payload'&&scope.inputs.length===ids.length&&scope.inputs.every(i=>equal(i.selectedFields,['body']))&&equal(scope.coverage,p.request.coverage)&&equal(scope.facets,[...new Set(p.request.coverage.map(u=>u.facet))].sort()));
  for(const key of ['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'])need(scope[key]===p.binding[key]);
 }
 return {p,selected,qualified,ids:wanted};
}
// This fixed policy reads only original metadata indexes, not selected bodies.
// External-access, Assist and Filter switches are not Maintenance permission.
async function policy(r,f,transaction,scope,permit){
 const t=contextScopeTransactionReader(r.store,transaction,f.selection.budget),check=()=>currentFamily(r,f);
 const config=await t.get('meta','memory:config');check();if(config!==null&&config!==undefined){need(typeof config==='object'&&!Array.isArray(config)&&[Object.prototype,null].includes(Object.getPrototypeOf(config)));const local=data(config,'localOnly',true);need(local===undefined||local===false);}
 const sources=new Set();for(const id of permit.ids){
  check();const state=await t.get('inputStates',id);check();const index=await t.get('blockIndex',id);check();
  const expected=permit.p.request.items.find(i=>i.descriptor.entityId===id).descriptor;
  need(state&&index&&data(state,'id')===id&&data(index,'id')===id&&data(state,'removalState')==='active'&&data(state,'sourcePurged',true)!==true&&data(index,'excluded')===false&&data(state,'contentRevision')===expected.revision&&(data(state,'lastRemovalSequence',true)??0)===expected.removalEpoch);
  const sourceIds=data(state,'sourceRecordIds');need(Array.isArray(sourceIds)&&sourceIds.length<=20&&equal([...sourceIds].sort(),expected.sourceRecordIds)&&equal([...data(index,'recordIds')].sort(),expected.sourceRecordIds));
  if(permit.qualified)need(scope.inputs.find(i=>i.inputId===id).revision===expected.revision);
  for(const source of sourceIds)sources.add(source);
 }
 need(sources.size<=20);if(permit.qualified)need(equal(scope.sources.map(s=>s.sourceRecordId).sort(),[...sources].sort()));
 for(const id of sources){check();const index=await t.get('recordIndex',id);check();need(index&&data(index,'id')===id);for(const key of ['sourceKey','dedupeKey']){const value=data(index,key,true);if(value){need(typeof value==='string');const deleted=await t.get('tombstones',(key==='sourceKey'?'source:':'snapshot:')+value);check();need(!deleted);}}}
 check();
}
export function createMaintenanceSourceProcessing({store,consentOwner,caller,context}){
 need(store&&consentOwner&&caller&&Object.isFrozen(caller));
 const r={store,consentOwner,caller,context,processing:null,client:null,disposed:false,families:new Map()};
 const processing=Object.freeze({
  async resolve(transaction,scope,permit){
   need(!r.disposed);const original=originalScope(store,transaction),selected=originalPermit(r,original,scope,permit);let f=r.families.get(selected.selected.token);
   if(!f){
    need(r.families.size<8);const s=selected.selected,controller=new AbortController(),database=data(data(store,'repository'),'db');
    f={selection:s,database,controller,closed:false,pending:0,cap:null,capPromise:null,raws:new Map(),epoch:crypto.randomUUID(),expiresAt:s.firstDeadline,monoDeadline:s.monoDeadline,denial:null,listeners:[],timer:null,rejectStop:null};
    f.denial=createMaintenanceProcessingDenyCell({store,repository:data(store,'repository'),database,signals:[controller.signal,s.signal],wallDeadline:f.expiresAt,monoDeadline:f.monoDeadline});
    f.stopped=new Promise((_,reject)=>{f.rejectStop=reject;});f.stopped.catch(()=>{});
    const stop=()=>{try{fail('UNAVAILABLE');}catch(error){f.rejectStop(error);}releaseFamily(r,f);};
    const signals=[s.signal];for(const signal of signals){need(!aborted.call(signal));add.call(signal,'abort',stop,{once:true});f.listeners.push([signal,stop]);}
    f.timer=setTimeout(stop,Math.max(1,Math.ceil(Math.min(f.expiresAt-wall(),f.monoDeadline-mono()))));f.timer?.unref?.();r.families.set(s.token,f);
   }
   currentFamily(r,f);need(f.pending<8);f.pending++;
   const work=(async()=>{
    if(!f.capPromise)f.capPromise=(async()=>{const cap=await readMaintenanceProcessingConsent(consentOwner,store,original,{workBudget:f.selection.budget,signal:f.controller.signal});if(f.closed){releaseMaintenanceProcessingConsent(cap,consentOwner,store);fail('UNAVAILABLE');}f.cap=cap;const purpose=readMaintenanceProcessingConsentDenial(cap,consentOwner,store);f.expiresAt=Math.min(f.expiresAt,purpose.expiresAt);f.monoDeadline=Math.min(f.monoDeadline,purpose.monoDeadline);const stop=()=>releaseFamily(r,f);add.call(purpose.signal,'abort',stop,{once:true});f.listeners.push([purpose.signal,stop]);return cap;})();
    await f.capPromise;currentFamily(r,f);
    await assertMaintenanceProcessingConsentSnapshot(f.cap,consentOwner,store,original,{workBudget:f.selection.budget});currentFamily(r,f);
    await policy(r,f,original,scope,selected);currentFamily(r,f);
    const key=canonical(scope),prior=f.raws.get(key);if(prior){await assertMaintenanceProcessingConsentReceiptSnapshot(prior,store,original,f.selection.budget);currentFamily(r,f);return prior;}
    need(f.raws.size<8);if(selected.p.parent){const parent=receipts.get(selected.p.parent);need(parent&&parent.r===r&&parent.f===f);currentFamily(r,f);}
    const raw=Object.freeze({version:1,store,caller,scope,epoch:f.epoch,processing:true,expiresAt:f.expiresAt,revocationSignal:f.controller.signal});
    const purpose=readMaintenanceProcessingConsentDenial(f.cap,consentOwner,store),client=readMaintenanceServiceProcessingDenial(f.selection.lifecycleCap,f.selection.client,store);
    bindMaintenanceProcessingRawDenials(raw,store,[f.denial,f.selection.denial,purpose.cell,client]);bindMaintenanceProcessingConsentReceipt(raw,f.cap,consentOwner,store,{workBudget:f.selection.budget});
    await assertMaintenanceProcessingConsentReceiptSnapshot(raw,store,original,f.selection.budget);currentFamily(r,f);
    receipts.set(raw,{r,f});f.raws.set(key,raw);return raw;
   })();
   const settled=()=>{f.pending--;if(f.closed&&f.pending===0)r.families.delete(f.selection.token);};work.then(settled,settled);
   try{const raw=await Promise.race([work,f.stopped]);currentFamily(r,f);return raw;}catch(error){releaseFamily(r,f);throw error;}
  },
  isCurrent(raw,s){const held=receipts.get(raw);if(!held||held.r!==r||s!==store)return false;try{currentFamily(r,held.f);assertMaintenanceProcessingRawDenialFacts(raw,store);return true;}catch{return false;}}
 });r.processing=processing;issuers.set(processing,r);requireMaintenanceProcessingSelection(processing);return processing;
}
export function disposeMaintenanceSourceProcessing(processing,store){const r=issuers.get(processing);need(r&&r.store===store);r.disposed=true;for(const f of r.families.values())releaseFamily(r,f);}
