import {readTopicIdentityProcessingGrantRequest} from './topic-identity-source-processing.js';
import {assertMaintenanceSourceProcessingOwner} from './maintenance-source-processing.js';
import {readMaintenanceProcessingSelection,assertMaintenanceProcessingSelectionFacts} from './local-maintenance-session.js';
import {readMaintenanceProcessingConsent,readMaintenanceProcessingConsentDenial,assertMaintenanceProcessingConsentFacts,assertMaintenanceProcessingConsentSnapshot,releaseMaintenanceProcessingConsent,bindMaintenanceProcessingConsentReceipt,assertMaintenanceProcessingConsentReceiptSnapshot} from '../../background/maintenance-processing-consent.js';
import {createMaintenanceProcessingDenyCell,retireMaintenanceProcessingDenyCell,assertMaintenanceProcessingDenyCellFacts,bindMaintenanceProcessingRawDenials,assertMaintenanceProcessingRawDenialFacts} from './maintenance-processing-denial.js';
import {assertContextScopeWorkBudgetFacts} from '../context-topic-scope.js';
import {equal,fail} from './contracts.js';

// Dormant original policy owner. Saved Maintenance consent is necessary, never
// itself identity authority. The sole source consumer's private original action
// supplies the selector, transaction, field receipt, currentness and first ledger.
// No public DTO, permission switch, persisted grant, provider or scheduler exists.
const owners=new WeakMap(),grants=new WeakMap(),aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,abort=AbortController.prototype.abort;
const wall=Date.now.bind(Date),mono=performance.now.bind(performance),need=value=>{if(!value)fail('UNAVAILABLE');};
function current(r,g){
 need(!r.disposed&&!g.closed&&r.store.repository===r.repository&&r.repository.db===r.database);
 assertMaintenanceSourceProcessingOwner(r.processing,r.store,r.consentOwner,r.caller,r.context);
 g.p.current();const selected=g.selected;assertMaintenanceProcessingSelectionFacts(g.p.sourceSelection,r.store,g.p.budget,selected.client);
 need(selected.token===g.selected.token&&selected.budget===g.p.budget&&selected.caller===r.caller&&selected.plan.processing===r.processing&&selected.plan.context===r.context);
 assertContextScopeWorkBudgetFacts(g.p.budget,{database:r.database});
 need(wall()<g.expiresAt&&mono()<g.monoDeadline&&!aborted.call(g.controller.signal));
 if(g.cap)assertMaintenanceProcessingConsentFacts(g.cap,r.consentOwner,r.store);
 if(g.denial)assertMaintenanceProcessingDenyCellFacts(g.denial);
 if(g.witness)assertMaintenanceProcessingRawDenialFacts(g.witness,r.store);
 return true;
}
function release(r,g){
 if(g.closed)return;g.closed=true;if(g.denial)retireMaintenanceProcessingDenyCell(g.denial);clearTimeout(g.timer);
 for(const [signal,listener]of g.listeners)remove.call(signal,'abort',listener);g.listeners=[];abort.call(g.controller);
 if(g.cap){releaseMaintenanceProcessingConsent(g.cap,r.consentOwner,r.store);g.cap=null;}
 // A stopped acquisition occupies its slot until the actual original read settles.
 if(!g.pending)r.active.delete(g);r.retired.add(g.request);
}
export function createTopicIdentityProcessingGrant({store,consentOwner,caller,context,processing}){
 assertMaintenanceSourceProcessingOwner(processing,store,consentOwner,caller,context);
 const r={store,consentOwner,caller,context,processing,repository:store.repository,database:store.repository.db,disposed:false,active:new Set(),retired:new WeakSet(),owner:null};
 const owner=Object.freeze({
  async acquire(request){
   const p=readTopicIdentityProcessingGrantRequest(request,owner,store,caller);if(r.database==null)r.database=p.budget.database;
   need(!r.disposed&&!r.retired.has(request)&&r.active.size<8&&p.sourceSelection);
   const selected=readMaintenanceProcessingSelection(p.sourceSelection,store,p.transaction);
   need(selected.budget===p.budget&&request.expiresAt<=selected.firstDeadline&&request.topicIds.length>0&&request.topicIds.length<=8&&request.inputIds.length<=20);
   need(equal([...request.topicIds].sort(),p.selectedTopics.map(t=>t.id).sort())&&equal([...request.inputIds].sort(),[...new Set(p.selectedTopics.flatMap(t=>t.scope.map(s=>s.inputId)))].sort()));
   const g={request,p,selected,closed:false,pending:true,cap:null,denial:null,witness:null,facts:null,controller:new AbortController(),listeners:[],timer:null,expiresAt:Math.min(request.expiresAt,selected.firstDeadline),monoDeadline:Math.min(p.monoDeadline,selected.monoDeadline)};r.active.add(g);
   const stop=()=>release(r,g);for(const signal of new Set([request.signal,p.signal,selected.signal])){need(!aborted.call(signal));add.call(signal,'abort',stop,{once:true});g.listeners.push([signal,stop]);}
   g.timer=setTimeout(stop,Math.max(1,Math.ceil(Math.min(g.expiresAt-wall(),g.monoDeadline-mono()))));g.timer?.unref?.();
   try{
    current(r,g);const cap=await readMaintenanceProcessingConsent(consentOwner,store,p.transaction,{workBudget:p.budget,signal:g.controller.signal});
    if(g.closed){releaseMaintenanceProcessingConsent(cap,consentOwner,store);fail('UNAVAILABLE');}g.cap=cap;current(r,g);
    const consent=readMaintenanceProcessingConsentDenial(cap,consentOwner,store);need(consent.restoreEpoch===request.restoreEpoch);
    g.expiresAt=Math.min(g.expiresAt,consent.expiresAt);g.monoDeadline=Math.min(g.monoDeadline,consent.monoDeadline);
    add.call(consent.signal,'abort',stop,{once:true});g.listeners.push([consent.signal,stop]);
    await assertMaintenanceProcessingConsentSnapshot(cap,consentOwner,store,p.transaction,{workBudget:p.budget});current(r,g);
    g.denial=createMaintenanceProcessingDenyCell({store,repository:r.repository,database:r.database,libraryId:consent.libraryId,signals:[g.controller.signal,consent.signal],wallDeadline:g.expiresAt,monoDeadline:g.monoDeadline});
    g.witness=Object.freeze(Object.create(null));bindMaintenanceProcessingRawDenials(g.witness,store,[g.denial,selected.denial,consent.cell],[p.fieldReceipt]);
    bindMaintenanceProcessingConsentReceipt(g.witness,cap,consentOwner,store,{workBudget:p.budget});await assertMaintenanceProcessingConsentReceiptSnapshot(g.witness,store,p.transaction,p.budget);current(r,g);
    const token=Object.freeze(Object.create(null));g.facts=Object.freeze({purpose:'personal-topic-identity',store,caller,selection:request.selection,restoreEpoch:request.restoreEpoch,generation:crypto.randomUUID(),expiresAt:g.expiresAt,revocationSignal:g.controller.signal,denial:g.denial});grants.set(token,{r,g});current(r,g);return token;
   }catch(error){release(r,g);throw error;}finally{g.pending=false;if(g.closed)r.active.delete(g);}
  },
  read(token){const held=grants.get(token);need(held&&held.r===r);try{current(r,held.g);return held.g.facts;}catch(error){release(r,held.g);throw error;}},
  release(token){const held=grants.get(token);need(held&&held.r===r);release(r,held.g);}
 });r.owner=owner;owners.set(owner,r);return owner;
}
export function disposeTopicIdentityProcessingGrant(owner,store){const r=owners.get(owner);need(r&&r.store===store);r.disposed=true;for(const g of [...r.active])release(r,g);}
