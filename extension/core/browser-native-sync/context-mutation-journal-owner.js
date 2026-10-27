import {requireOriginalContextMutationCore} from './core.js';
import {originalContextDesiredConstructor,readOriginalContextDesiredOwner} from './context-desired-journal-owner.js';
import {readContextCards,requireOriginalContextCardsService,emptyContextCards} from '../context-cards.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {clone,equal,fail,SyncError} from './value.js';
import {originalRepositoryTransactionOwner,requireRepositoryTransactionDataMethods,requireRepositoryTransactionSucceeded} from '../idb-repository.js';
import {readOriginalIndexedStoreControlScope,readOriginalControlSettings,assertOriginalControlSettingsFacts} from '../indexed-store.js';
import {requireOriginalJournalRestoreFence} from './prompt-journal.js';
const originalJournals=new WeakMap();
const legacy={info:'contextItem',rules:'contextRulesItem',now:'contextNowItem'};
function binding(journal,service,allowUnboundRead=false){
 const bound=originalJournals.get(journal);requireOriginalContextCardsService(service);
 if(Object.getPrototypeOf(journal)!==originalJournalPrototype)fail('BNS_CONTEXT_OWNER_REQUIRED');
 for(const [name,expected]of originalJournalMethods){const actual=Object.getOwnPropertyDescriptor(originalJournalPrototype,name);if(Object.getOwnPropertyDescriptor(journal,name)||!actual||['value','get','set','writable','enumerable','configurable'].some(key=>actual[key]!==expected[key]))fail('BNS_CONTEXT_OWNER_REQUIRED');}
 if(!bound||journal.core!==bound.core||service.syncJournal!==journal&&(!allowUnboundRead||service.syncJournal!==null)||service.s!==bound.store||bound.store.repository!==bound.core.repository)fail('BNS_CONTEXT_OWNER_REQUIRED');
 requireOriginalLibraryDocumentsGenerationMethods(bound.store);requireOriginalContextMutationCore(bound.core);return bound;
}
export function isOriginalContextMutationJournal(journal,service){try{binding(journal,service);return true;}catch{return false;}}
// This local-selection owner retains main's existing manual/access journal.
// Context mutation packets are not admitted by this integration.
let originalConstructor=null,originalJournalPrototype=null,originalJournalMethods=null;
export function originalContextMutationConstructor(){
 if(originalConstructor)return originalConstructor;
 originalConstructor=class LocalContextSelectionJournal extends originalContextDesiredConstructor(){
 constructor(core,{store}){super(core);if(store?.repository!==core?.repository)fail('BNS_CONTEXT_OWNER_REQUIRED');requireOriginalLibraryDocumentsGenerationMethods(store);originalJournals.set(this,{core,store});}
 async emptyEnrollment(service){return (await readEnrollmentObservation(this,service,false)).receipt;}
 async bootstrapItem(service,id){binding(this,service);return this.bootstrap(id);}
 };
 originalJournalPrototype=originalConstructor.prototype;originalJournalMethods=Object.getOwnPropertyNames(originalJournalPrototype).filter(name=>name!=='constructor').map(name=>[name,Object.getOwnPropertyDescriptor(originalJournalPrototype,name)]);
 return originalConstructor;
}
// Fixed source-owned dispatch enters binding before any observation is returned.
// No replaceable journal method or caller DTO can supply settlement evidence.
export async function readOriginalContextEnrollmentObservation(journal,service,work=null){return readEnrollmentObservation(journal,service,true,work);}

async function readEnrollmentObservation(journal,service,represented,work=null){
  const {core,store}=binding(journal,service,true),repository=core.repository,database=repository.db;
  const current=()=>{binding(journal,service,true);requireOriginalJournalRestoreFence(journal.restoreFence,core);if(store.loaded!==true||!database||repository.db!==database||!originalRepositoryTransactionOwner(repository))fail('BNS_CONTEXT_OWNER_CHANGED');};
  current();let scope,controls,semanticError;
  // Do not call public Store.run or open an earlier independent transaction.
  // The exact original Context predicate runs in the final readonly fence,
  // after both SDK reads, with original Core/restore identity and one work ticket.
  // Preserve Core.transaction's SyncError behavior without nesting a transaction.
  try{
   const value=await readOriginalIndexedStoreControlScope(store,repository,async t=>{try{
    current();requireRepositoryTransactionDataMethods(repository,t);scope=t;
    controls=readOriginalControlSettings(store,t);await store.qualifyControlPublicationRead(t);await service.admitted(t);
    const migration=await t.get('meta','migration'),fence=await journal.restoreFence.snapshot(t);
    if(migration?.phase!=='active'||migration.databaseId!==store.databaseId)fail('BNS_CONTEXT_OWNER_CHANGED');
    const row=await readContextCards(t),receipt=equal(row,emptyContextCards())?{version:1,databaseId:migration.databaseId,namespace:fence.namespace,epoch:fence.epoch}:null;
    const contextState=represented?await qualifyEnrollmentRow(t,core,row,fence.epoch??'initial'):null;
    const result={receipt,row,contextState,databaseId:migration.databaseId,namespace:fence.namespace,epoch:fence.epoch};
    current();assertOriginalControlSettingsFacts(store,controls);return result;
   }catch(error){if(error instanceof SyncError)semanticError=error;throw error;}},work);
   requireRepositoryTransactionSucceeded(repository,scope);current();assertOriginalControlSettingsFacts(store,controls);return value;
  }catch(error){throw semanticError||error;}
}

async function qualifyEnrollmentRow(t,core,row,epoch){
 // Reuse the original Item predicate, now with reads in this one original
 // terminal transaction rather than independent Core.read transactions.
 await qualifiedPortableRow(core,row,epoch,t);
 const state=await core.get(t,'contextMutationState');
 if(state)fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');
 // Mirror the existing desired owner's current-value rule: an exact current
 // owner proof can represent a restrictive conflict; otherwise a real current
 // revision must equal the local portable value. Global access stays local.
 for(const id of ['info','rules','now','inputs']){
  const value={id,...row.access[id]},head=await core.get(t,'head','contextDesired',id);
  if(!head){if(value.revision!==0||value.enabled!==false)fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');continue;}
  if(head.purged||!Array.isArray(head.revisions)||!head.revisions.length)fail('BNS_CONTEXT_OWNER_CHANGED');
  const {record:proof}=await readOriginalContextDesiredOwner(t,core,id),heads=[...head.revisions].sort();
  const proven=!!proof&&equal(proof.heads,heads)&&equal(proof.value,value);
  let matched=false;for(const revision of head.revisions){const operation=(await core.get(t,'revision',revision))?.operation;if(!operation||operation.type!=='contextDesired'||operation.entityId!==id||operation.kind!=='put')fail('BNS_CONTEXT_OWNER_CHANGED');if(equal(operation.value,value))matched=true;}
  if(!proven&&!matched)fail('BNS_CONTEXT_OWNER_CHANGED');
 }
 return state??null;
}

async function qualifiedPortableRow(core,row,epoch,t){
 const before=clone(row);
 for(const local of before.items){
  if(await core.get(t,'head','contextMutationMember',local.id))fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');
  if(local.origin!=='manual')fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');
  const type=legacy[local.card],head=await core.get(t,'head',type,local.id),op=head?.revisions.length===1?(await core.get(t,'revision',head.revisions[0]))?.operation:null;
  if(head?.purged||!op||!equal(op.value,local))fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');
 }
 return before;
}
