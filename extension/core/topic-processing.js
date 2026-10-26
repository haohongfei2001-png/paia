import {readTopicProcessingAuthority,readTopicProcessingAuthorityFacts,topicProcessingAuthorityWorkBudget,captureTopicProcessingLeaseFacts,assertTopicProcessingLeaseFacts} from './topic-processing-authority.js';
import {requireRepositoryTransactionScope,registerRepositoryFinalReadFence} from './idb-repository.js';
import {contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,CONTEXT_TOPIC_SCOPE_LIMITS} from './context-topic-scope.js';
import {assertMaintenanceQualification,assertMaintenanceQualificationFacts,maintenanceQualificationWorkBudget,maintenanceQualificationReader} from './ai-usage/maintenance-qualification.js';
import {fail,keys,idOK,same} from './thought-model.js';
import {topicIdentityBase,assertTopicIdentityBase} from './topic-identity.js';
import {checkEvidenceInTransaction} from './thought-evidence.js';

// Every actual identity call, including legacy calls, belongs to its original
// transaction. Field qualification never supplies this independent capability.
const processingUses=new WeakMap(),finalCollections=new WeakMap(),readCollections=new WeakMap();
function originalTransaction(store,t){
 for(let scope=t,depth=0;scope&&depth<16;scope=Object.getPrototypeOf(scope),depth++){
  try{return {scope,identity:requireRepositoryTransactionScope(store.repository,scope)};}catch(error){if(Object.hasOwn(scope,'tx'))throw error;}
 }fail();
}
function recordFor(guard,t,{create=false}={}){
 const original=originalTransaction(guard.store,t),records=processingUses.get(guard);let record=records.get(original.scope.tx);
 if(!record&&create){record={...original,uses:[],budget:null,registered:false};records.set(original.scope.tx,record);}
 if(!record||record.scope!==original.scope||record.identity!==original.identity)fail();return record;
}


function processingMode(guard,t){
 const record=recordFor(guard,t);if(!record.uses.length)fail();
 const legacy=record.uses.some(use=>use===null),genuine=record.uses.some(use=>use!==null);
 if(legacy&&genuine)fail();return genuine?'authority':'legacy';
}

function processingCurrent(guard,t){
  const record=recordFor(guard,t);if(!record.uses.length||record.uses.some(x=>x===null)||!record.budget)fail();
  contextScopeTransactionReader(guard.store,record.scope,record.budget);
  for(const use of record.uses){const current=readTopicProcessingAuthority(use.cap,guard.store,t,use.request);if(current.epoch!==use.epoch||current.scope.restoreEpoch!==use.restoreEpoch||topicProcessingAuthorityWorkBudget(use.cap,guard.store,t,use.request)!==record.budget)fail();}
  // A later issuer can synchronously revoke an earlier use or request budget.
  return processingFacts(guard,t);
}
function processingFacts(guard,t,{workBudget=null}={}){
  const record=recordFor(guard,t);if(!record.uses.length||record.uses.some(x=>x===null)||!record.budget||workBudget!==null&&workBudget!==record.budget)fail();
  for(const use of record.uses){const current=readTopicProcessingAuthorityFacts(use.cap,guard.store,t,use.request);if(current.epoch!==use.epoch||current.scope.restoreEpoch!==use.restoreEpoch)fail();}
  assertContextScopeWorkBudgetFacts(record.budget,{database:guard.store.repository.db});return true;
}
// Fixed original-reader dispatch for Repository's final all-owner sweep.
// No public callback or DTO can mint this closed collection capability.
export function requireTopicProcessingFinalFacts(token,repository,t){
 const held=finalCollections.get(token);if(!held||held.store.repository!==repository||held.scope!==t||held.record.scope!==t||!held.record.registered||held.record.uses.length!==held.uses.length||!held.record.uses.every((use,index)=>use===held.uses[index]))fail();
 requireRepositoryTransactionScope(repository,t);if(held.qualification)assertMaintenanceQualificationFacts(held.qualification,held.store);return processingFacts(held.guard,t,{workBudget:held.budget});
}

// Fixed source-only facts of a successful original read. No transaction can
// use this token as processing authority; it only denies a later source send.
export function captureTopicProcessingReadFacts(guard,t,{qualification=null}={}){
 processingFacts(guard,t);const record=recordFor(guard,t),store=guard.store,uses=Object.freeze([...record.uses]);if(qualification&&maintenanceQualificationWorkBudget(qualification,store)!==record.budget)fail();
 const leases=Object.freeze(uses.map(use=>captureTopicProcessingLeaseFacts(use.cap,store,t,use.request))),token=Object.freeze(Object.create(null));readCollections.set(token,{guard,record,uses,leases,store,repository:store.repository,database:store.repository.db,budget:record.budget,qualification});assertTopicProcessingReadFacts(token,store);return token;
}
export function assertTopicProcessingReadFacts(token,store){
 const r=readCollections.get(token);if(!r||r.store!==store||r.repository!==store.repository||r.database!==store.repository.db||r.record.uses.length!==r.uses.length||!r.record.uses.every((use,i)=>use===r.uses[i]))fail();
 if(r.qualification)assertMaintenanceQualificationFacts(r.qualification,store);for(const lease of r.leases)assertTopicProcessingLeaseFacts(lease,store);assertContextScopeWorkBudgetFacts(r.budget,{database:r.database});return true;
}

// Internal processing is separate from capture and external Context access.
// No production resolver is installed by this slice. A future trusted service
// must authorize the exact bounded Input scope and return its current epoch.
export class TopicProcessingGuard {
 constructor(store,{resolveProcessing=null,resolveQualification=null,resolveOwnMutation=null,strictQualification=false}={}){if(typeof strictQualification!=='boolean')fail();Object.defineProperty(this,'strictQualification',{value:strictQualification});if(resolveQualification!==null&&typeof resolveQualification!=='function')fail();if(resolveOwnMutation!==null&&typeof resolveOwnMutation!=='function')fail();this.resolveOwnMutation=resolveOwnMutation;this.store=store;this.resolveProcessing=resolveProcessing;this.resolveQualification=resolveQualification;processingUses.set(this,new WeakMap());}
 qualification(){if(this.resolveQualification===null){if(this.strictQualification)fail();return null;}const token=this.resolveQualification();assertMaintenanceQualification(token,this.store);return token;}
 reader(t){const token=this.qualification();return token===null?t:maintenanceQualificationReader(token,this.store,t,{topicLabels:!this.strictQualification,strictTopicIdentity:this.strictQualification,ownMutation:this.resolveOwnMutation?.(t,token)??null});}
 async processing(t,evidence,topicIds=[]){
  if(typeof this.resolveProcessing!=='function')fail();
  let prior;try{prior=recordFor(this,t);}catch{}if(prior?.registered)fail();
  const request=Object.freeze({purpose:'personal-topic-identity',inputIds:Object.freeze(evidence.map(e=>e.inputId)),topicIds:Object.freeze([...topicIds])});
  const processing=await this.resolveProcessing(t,request);
  const epoch=processing?.epoch;if(processing?.allowed!==true||!idOK(epoch)||!same(processing.inputIds,request.inputIds)||!same(processing.topicIds,request.topicIds))fail();
  const descriptor=Object.getOwnPropertyDescriptor(processing,'authority');
  if(descriptor&&!Object.hasOwn(descriptor,'value'))fail();
  const cap=descriptor?.value??null;
  // Original direct legacy APIs remain usable, but no legacy call can later be
  // silently upgraded to the strict terminal guarantee.
  if(cap===null){let record;try{record=recordFor(this,t,{create:true});}catch{return epoch;}if(record.registered)fail();record.uses.push(null);return epoch;}
  const record=recordFor(this,t,{create:true});if(record.registered)fail();
  const held=readTopicProcessingAuthority(cap,this.store,t,request),budget=topicProcessingAuthorityWorkBudget(cap,this.store,t,request);
  if(held.epoch!==epoch||record.budget&&record.budget!==budget)fail();
  const reader=contextScopeTransactionReader(this.store,record.scope,budget);
  if(((await reader.get('meta','recovery-restore-epoch'))?.value??null)!==held.scope.restoreEpoch)fail();
  readTopicProcessingAuthority(cap,this.store,t,request);record.budget=budget;record.uses.push(Object.freeze({cap,request,epoch,restoreEpoch:held.scope.restoreEpoch}));
  return epoch;
 }
 processingMode(t){return processingMode(this,t);}
 assertProcessingCurrent(t){return processingCurrent(this,t);}
 assertProcessingFacts(t,options){return processingFacts(this,t,options);}
 registerProcessingFinalFence(t,{qualification=null}={}){
  const record=recordFor(this,t);processingCurrent(this,t);if(record.registered)fail();
  const store=this.store,budget=record.budget,uses=Object.freeze([...record.uses]);if(qualification&&maintenanceQualificationWorkBudget(qualification,store)!==budget)fail();
  const authority=Object.freeze({}),held={guard:this,store,scope:record.scope,record,uses,budget,qualification};finalCollections.set(authority,held);record.finalAuthority=authority;record.registered=true;
  const current=()=>{if(qualification)assertMaintenanceQualification(qualification,store);processingCurrent(this,t);return requireTopicProcessingFinalFacts(authority,store.repository,record.scope);};
  // Original Repository alone executes this one exact IDB control-row read.
  // No async resolver, new receipt, body read or fresh baseline enters terminal.
  registerRepositoryFinalReadFence(store.repository,record.scope,{authority,isCurrent:current,plan:function*(){
   current();if(budget.reads>=CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail();budget.reads++;
   const row=yield {method:'get',table:'meta',key:'recovery-restore-epoch'};current();
   if(row){const seen=budget.seen.get('meta')||new Set();seen.add(row.id);budget.seen.set('meta',seen);if(seen.size>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();}
   const restore=row?.value??null;if(uses.some(use=>use.restoreEpoch!==restore))fail();return true;
  }});return true;
 }
 finalFactsCapability(t){const record=recordFor(this,t);requireTopicProcessingFinalFacts(record.finalAuthority,this.store.repository,record.scope);return record.finalAuthority;}
 async authority(t,evidence,{checkEvidence=true}={}){
  t=this.reader(t);
  const processingEpoch=await this.processing(t,evidence);
  const gate=await t.get('meta','gate'),library=await t.get('meta','thought-library');
  if(!gate?.enabled||library?.sealed)fail();
  if(checkEvidence)await checkEvidenceInTransaction(this.store,t,evidence);
  return {processingEpoch,gateEpoch:gate.epoch,thoughtEpoch:(await t.get('meta','thought-epoch'))?.value??0,generation:(await t.get('meta','backup-data-generation'))?.value??0,...await topicIdentityBase(t)};
 }
 async prepare(scope){
  if(!Array.isArray(scope)||!scope.length||scope.length>100)fail();
  for(const s of scope){keys(s,['inputId','role','selectedFields'],['inputId','role','selectedFields']);if(!idOK(s.inputId)||!['primary','supporting'].includes(s.role))fail();}
  await this.store.finishFoundation();
  const authority=await this.store.run(()=>this.store.repository.transaction(false,t=>this.authority(t,scope,{checkEvidence:false})));
  const evidence=await this.store.evidenceFor(scope,{qualification:this.qualification()});
  await this.store.run(()=>this.store.repository.transaction(false,t=>this.check(t,{evidence,authority})));
  return {evidence,authority};
 }
 async check(t,prepared,{generation=true}={}){
  await assertTopicIdentityBase(t,prepared?.authority);
  const current=await this.authority(t,prepared.evidence);
  const selected=a=>({processingEpoch:a.processingEpoch,gateEpoch:a.gateEpoch,thoughtEpoch:a.thoughtEpoch,restoreEpoch:a.restoreEpoch,...(generation?{generation:a.generation}:{})});
  if(!same(selected(current),selected(prepared.authority)))fail();
 }
}
export function publicTopicAuthority(authority){const {secret,...safe}=authority;return safe;}
