import {PromptSyncJournal} from './browser-native-sync/prompt-journal.js';
import {requireHistoricalCandidateSession} from './ai-usage/historical-candidate-session.js';
import {prepareInputSearchContext,prepareInputSearchArrival,matchesInputSearchArrival} from './qualified-input-search.js';
import {PROMPT_HISTORY_SCOPE,queryPromptHistory,readPromptHistory,readPromptHistoryInTransaction,validPromptSelectionRef,selectPromptRange} from './prompt-selection.js';
import {NextFamilyView} from './next-family-view.js';
import {ArchiveError,CONSENT_VERSION} from './constants.js';
import {requireConsumerPublicationSettled} from './browser-native-sync/consumer-publication-state.js';
const publicationSettled=async t=>{try{await requireConsumerPublicationSettled(t);}catch(e){if(e.code==='BNS_CONSUMER_PUBLICATION_PENDING')throw new ArchiveError(e.code);throw e;}};
import {readPromptReuseMaterial,observedPromptReuseMaterial,promptMaterialReadIsStatic} from './manual-materials.js';
import {originalFoundationPromptQueueOwner} from './thought-store.js';
import {observeOriginalPromptControlPublication,requireOriginalPromptControlObservation,originalControlIdentityFailure} from './indexed-store.js';
import {originalRepositoryTransactionOwner,observeRepositoryWriteFence,requireRepositoryWriteFence,requireRepositoryTransactionDataMethods,requireRepositoryTransactionSucceeded} from './idb-repository.js';
import {controlPublicationEncoding} from './local-control-publication.js';
import {memoryRange,validateMemoryRow} from './memory/model.js';
import {projectPromptFamilies} from './prompt-family.js';
import {PROMPT_REUSE_ROW,own,validPromptText,quickPromptEligible,readPromptPreferences,validPromptPreferences} from './prompt-reuse-preferences.js';
const fail=()=>{throw new ArchiveError('INVALID_REQUEST');};
const changed=()=>{throw new ArchiveError('MEMORY_STALE');};
// Only this module's completed static-read guard can issue this denial. Public
// error codes and original snapshot failures never authorize a replacement read.
const fenceOnlyFailures=new WeakMap();
// Bounded body-free refusal evidence for the existing isolated owner test.
// No result/body/ID/epoch/hash, persistence, network or public RPC is added.
const promptReadRefusals=[];
const refusalCodes=new Set(['MEMORY_STALE','STALE_BASE','CONTROL_PUBLICATION_CHANGED','CONTROL_PUBLICATION_REQUIRED','BNS_CONSUMER_PUBLICATION_PENDING','CONSENT_REQUIRED','STORAGE_FAILED']);
const recordPromptRefusal=(phase,reason,read=null,proof=null)=>{
 // Evidence must never invoke an adapter error's accessor or change refusal.
 try{
  // Do not reflect on arbitrary adapter-thrown objects, including Proxies.
  const code=typeof reason==='string'?reason:null;
  const row={phase,code:refusalCodes.has(code)?code:'OTHER',active:read?.active===true,static:read?.static===true,joined:read?.joined===true,ownerChanged:read?.ownerChanged===true,refused:read?.refused===true,noFresh:read?.noFresh===true};
  if(proof)for(const [key,value]of Object.entries(proof))if(typeof value==='boolean')row[key]=value;
  promptReadRefusals.push(Object.freeze(row));if(promptReadRefusals.length>16)promptReadRefusals.shift();
 }catch{/* Diagnostics cannot replace an original result or rejection. */}
};
export function readPromptReuseRefusalEvidence(){return promptReadRefusals.map(row=>({...row}));}

const repositoryShape=repository=>{
 const shape=[];
 for(const name of ['db','factory','name']){const d=Object.getOwnPropertyDescriptor(repository,name);if(!d||!Object.hasOwn(d,'value'))return null;shape.push(Object.freeze({...d}));}
 return Object.freeze(shape);
};
const sameRepositoryShape=(a,b)=>!!a&&!!b&&a.every((d,i)=>['value','writable','enumerable','configurable'].every(key=>d[key]===b[i][key]));
const declineRead=read=>{if(read.unshareable)return;read.unshareable=true;read.decline();};
const generation=async t=>(await t.get('meta','backup-data-generation'))?.value||0;
const originalMethod=(value,name,expected)=>{
 for(let owner=value;owner;owner=Object.getPrototypeOf(owner)){const descriptor=Object.getOwnPropertyDescriptor(owner,name);if(descriptor)return Object.hasOwn(descriptor,'value')&&descriptor.value===expected;}
 return false;
};
export class PromptReuseService{
 #nextFamilyView;#historyCandidates;#pendingRead=null;#manualConflictOffers=new Map();
 constructor(store,{clock=()=>Date.now(),syncJournal=null,historyCandidates=null}={}){this.s=store;this.#historyCandidates=historyCandidates===null?null:requireHistoricalCandidateSession(historyCandidates,store);this.#historyCandidates?.bindPromptOwner(()=>this.snapshot());this.clock=clock;this.#nextFamilyView=new NextFamilyView(clock);this.syncJournal=syncJournal;if(syncJournal&&(typeof syncJournal.prepare!=='function'||typeof syncJournal.commit!=='function'))fail();}
 async syncCorrectionSnapshot(journal){if(!(#nextFamilyView in this)||this.syncJournal!==journal)fail();return this.#snapshot(false);}
 async snapshot(){return this.#snapshot(true);}
 async #snapshot(projectCorrections,observation=null){
  await this.s.finishFoundation();
  let after,base,preferences;const inputs=[];
  do{
   let pageScope=null,originalPage=null;const pageRepository=this.s.repository;
   const page=await this.s.run(()=>this.s.repository.transaction(false,async t=>{
    if(observation&&!observation.unshareable){this.#requireReadShape(observation);pageScope=t;try{requireRepositoryTransactionDataMethods(pageRepository,t);}catch{declineRead(observation);}}
    const current=await generation(t);if(base!==undefined&&base!==current){recordPromptRefusal('snapshot-page-generation','MEMORY_STALE',observation);changed();}
    const prefs=await readPromptPreferences(t),rows=await t.all('meta',null,memoryRange());
    if(rows.some(x=>!validateMemoryRow(x)))fail();
    const memory={s:this.s,state:async()=>({rows})},filter=await t.get('meta','smart-filter');
    const batch=await t.page('inputStates',{after,limit:100}),items=[];
    if(observation)observation.expected+=batch.rows.length;
    for(const {value:m}of batch.rows){
     let item;
     if(observation&&!observation.unshareable){
      this.#requireReadShape(observation);const read=await observedPromptReuseMaterial(memory,t,m.id,filter);this.#requireReadShape(observation);item=read.item;observation.receipts.push(read.token);
      if(!promptMaterialReadIsStatic(this.s,read.token))declineRead(observation);
     }else item=await readPromptReuseMaterial(memory,t,m.id,filter);
     if(item)items.push(item);
    }
    return originalPage={items,next:batch.next,current,prefs};
   }));
   if(observation&&!observation.unshareable){
    this.#requireReadShape(observation);try{if(page!==originalPage||this.s.repository!==pageRepository)throw new Error();requireRepositoryTransactionSucceeded(pageRepository,pageScope);}catch{declineRead(observation);}
   }
   base=page.current;preferences=page.prefs;inputs.push(...page.items);after=page.next??undefined;
  }while(after!==undefined);
  const families=await projectPromptFamilies(inputs,preferences,this.clock());
  await this.s.run(()=>this.s.repository.transaction(false,async t=>{if(base!==await generation(t)){recordPromptRefusal('snapshot-final-generation','MEMORY_STALE',observation);changed();}},['meta']));
  if(observation){
   if(!observation.unshareable)this.#requireReadShape(observation);
   observation.static=!observation.unshareable&&observation.expected===observation.receipts.length&&observation.receipts.every(token=>promptMaterialReadIsStatic(this.s,token,true));
   // Fix the private material before any caller can receive a Family object.
   // Query/resolve never expose these Inputs or preference owner objects.
   if(observation.static)observation.material=Object.freeze({inputs,preferences,generation:base});
  }
  const snapshot={families,preferences,generation:base,inputs};if(projectCorrections&&this.syncJournal?.correctionBindings)return {...snapshot,...await this.syncJournal.projectCorrections(snapshot,this.clock())};return snapshot;
 }
 #originalReadOwner(){return originalFoundationPromptQueueOwner(this.s)&&originalRepositoryTransactionOwner(this.s.repository)&&originalMethod(this,'snapshot',originalSnapshot)&&this.syncJournal===null;}
 async #readBinding(observation=null){
  // Unsupported initial shapes keep the original independent path. Once a
  // read is admitted, a descriptor loss is sticky before any property getter.
  const store=this.s,repository=store.repository,shape=repositoryShape(repository);
  const owns=()=>{
   const sameShape=sameRepositoryShape(shape,repositoryShape(repository))&&(!observation||sameRepositoryShape(shape,observation.binding.shape));
   const current=sameShape&&this.#originalReadOwner();
   if(!current&&observation){recordPromptRefusal('binding-owner-loss','MEMORY_STALE',observation,{sameShape});observation.ownerChanged=true;observation.refused=true;}
   return current;
  };
  if(!owns())return null;
  const db=shape[0].value,local=store.local,clock=this.clock;let binding=null,scope=null,stage='queue';
  try{
   const returned=await store.run(async()=>{
    if(!owns())return null;
    stage='fence-admission';const writeFence=observeRepositoryWriteFence(repository);
    stage='observer';const control=await observeOriginalPromptControlPublication(store);
    stage='owner';if(!owns())return null;
    stage='transaction';const value=await repository.transaction(false,async t=>{
     scope=t;stage='data-methods';requireRepositoryTransactionDataMethods(repository,t);
     stage='publication';await publicationSettled(t);if(!owns())return null;
     const publication=await store.qualifyControlPublicationRead(t);if(!owns())return null;
     stage='control';const settings=(await store.control(t)).settings;if(!owns())return null;
     if(settings.consentVersion!==CONSENT_VERSION){if(observation)observation.refused=true;return null;}
     stage='memory';const memory=await t.all('meta',null,memoryRange());if(!owns())return null;
     if(memory.some(row=>!validateMemoryRow(row))){if(observation)observation.refused=true;return null;}
     stage='generation';const current=await generation(t);if(!owns())return null;
     stage='filter';const filter=await t.get('meta','smart-filter');if(!owns())return null;
     stage='encoding';binding=Object.freeze({store,repository,db,shape,local,get:local.get,set:local.set,clock,writeFence,key:controlPublicationEncoding({control:control.row,publication,memory,filter,generation:current}),deliveryKey:controlPublicationEncoding({control:control.row,publication,generation:current})});
     return binding;
    },['meta']);
    stage='return';if(!owns()||value!==binding){if(observation)observation.refused=true;return null;}
    stage='observer';requireOriginalPromptControlObservation(store,control.token);
    stage='fence-in-run';requireRepositoryWriteFence(repository,writeFence);return binding;
   });
   stage='return';if(!owns()||!binding||returned!==binding||this.s!==store||store.repository!==repository||store.local!==local||this.clock!==clock){if(observation)observation.refused=true;return null;}
   stage='settlement';requireRepositoryTransactionSucceeded(repository,scope);
   stage='fence-after-settlement';requireRepositoryWriteFence(repository,binding.writeFence);return binding;
  }catch(error){
   recordPromptRefusal('binding-'+stage,error,observation,{bindingPresent:!!binding,scopePresent:!!scope,identityFailure:originalControlIdentityFailure(store,error)});
   if(observation){
    if(originalControlIdentityFailure(store,error))observation.ownerChanged=true;
    // Unknown observer failure may still use the existing metadata retry,
    // but can never authorize this read's new fence-only replacement path.
    if(stage==='observer')observation.noFresh=true;else observation.refused=true;
   }
   owns();return null;
  }
 }
 #requireReadShape(read){
  if(read.ownerChanged||read.refused){recordPromptRefusal('shape-sticky','MEMORY_STALE',read);changed();}
  const first=read.binding;
  if(this.s!==first.store||this.s.repository!==first.repository||!sameRepositoryShape(first.shape,repositoryShape(first.repository))){read.ownerChanged=true;read.refused=true;changed();}
 }
 #sameReadAuthority(a,b,observation=null){
  if(observation?.ownerChanged||!a||!b||a.store!==b.store||a.repository!==b.repository||a.db!==b.db||a.local!==b.local||a.get!==b.get||a.set!==b.set||a.clock!==b.clock||a.key!==b.key)return false;
  if(!this.#originalReadOwner()||this.s!==a.store||this.s.repository!==a.repository||this.s.local!==a.local||a.local.get!==a.get||a.local.set!==a.set||this.clock!==a.clock){if(observation)observation.ownerChanged=true;return false;}
  return true;
 }
 #sameReadBinding(a,b,observation=null){
  if(!this.#sameReadAuthority(a,b,observation))return false;
  try{requireRepositoryWriteFence(a.repository,a.writeFence);requireRepositoryWriteFence(b.repository,b.writeFence);return true;}catch{return false;}
 }
 #requireReadAuthority(bindings,read,strictShape=false){
  if(read.ownerChanged||read.refused){recordPromptRefusal('authority-sticky','MEMORY_STALE',read);changed();}
  const first=bindings[0];
  if(strictShape&&(!first||!sameRepositoryShape(first.shape,repositoryShape(first.repository))||bindings.some(binding=>!binding||!sameRepositoryShape(first.shape,binding.shape)))){recordPromptRefusal('authority-shape-mismatch','MEMORY_STALE',read);read.ownerChanged=true;read.refused=true;changed();}
  if(bindings.some(binding=>!this.#sameReadAuthority(binding,first,read))){recordPromptRefusal('authority-mismatch','MEMORY_STALE',read,{bindingsPresent:bindings.every(Boolean),keysEqual:bindings.every(binding=>!!binding&&!!first&&binding.key===first.key)});read.refused=true;changed();}

 }
 #requireReadBindings(caller,first,current,read,allowFenceOnly,oldAnchors=[]){
  if(oldAnchors.length&&read.noFresh){recordPromptRefusal('replacement-uncertain-observer','MEMORY_STALE',read);read.refused=true;changed();}
  const eligible=allowFenceOnly&&!read.active&&read.static&&!read.unshareable;
  this.#requireReadAuthority([current,caller,first,...oldAnchors],read,eligible||oldAnchors.length>0);
  try{for(const binding of [current,caller,first])requireRepositoryWriteFence(binding.repository,binding.writeFence);}
  catch{
   recordPromptRefusal('guard-write-fence','STALE_BASE',read,{eligible,oldAnchors:oldAnchors.length>0});
   if(eligible&&!read.noFresh){const error=new ArchiveError('MEMORY_STALE');fenceOnlyFailures.set(error,{read,caller,first});throw error;}
   read.refused=true;changed();
  }
 }
 async #readStillCurrent(caller,first,read,allowFenceOnly=false,oldAnchors=[]){
  // Observed authority/source loss belongs to the shared read, including its
  // independent replacements. A later restoration cannot revive that read.
  if(read.ownerChanged||read.refused){recordPromptRefusal('current-sticky','MEMORY_STALE',read);changed();}let current=await this.#readBinding(read);
  // Preserve the original single metadata retry for ordinary readonly tail
  // changes. Neither a new anchor nor another retry can wash away old facts.
  if(!current&&!read.ownerChanged&&!read.refused&&this.#sameReadBinding(caller,first,read))current=await this.#readBinding(read);
  this.#requireReadBindings(caller,first,current,read,allowFenceOnly,oldAnchors);
  const {store,repository}=caller,delivery=Object.freeze({});let scope=null;
  try{
   const result=await store.run(()=>{
    this.#requireReadBindings(caller,first,current,read,allowFenceOnly,oldAnchors);
    return repository.transaction(false,async t=>{
    scope=t;requireRepositoryTransactionDataMethods(repository,t);await publicationSettled(t);this.#requireReadBindings(caller,first,current,read,allowFenceOnly,oldAnchors);
    const publication=await store.qualifyControlPublicationRead(t),generationValue=await generation(t);this.#requireReadBindings(caller,first,current,read,allowFenceOnly,oldAnchors);
    const control=store.controlPublicationLoadedRow();
    if(controlPublicationEncoding({control,publication,generation:generationValue})!==caller.deliveryKey){recordPromptRefusal('delivery-key-mismatch','MEMORY_STALE',read);read.refused=true;changed();}
    return delivery;
   },['meta']);});
   if(result!==delivery)changed();requireRepositoryTransactionSucceeded(repository,scope);
  }catch(error){if(fenceOnlyFailures.get(error)?.read===read)throw error;recordPromptRefusal('delivery-original-failure',error,read);read.refused=true;changed();}
  // Keep the final durable validation and synchronous shared sticky check.
  this.#requireReadBindings(caller,first,current,read,allowFenceOnly,oldAnchors);
 }
 async #freshAfterFence(error,caller,first,read){
  const failure=fenceOnlyFailures.get(error);
  if(!failure||failure.read!==read||failure.caller!==caller||failure.first!==first||read.active||!read.static||read.unshareable||read.noFresh)throw error;
  // One fresh original scan, outside the pending slot and without recursion.
  // Old keys remain anchors; only the replacement's own fence may be current.
  try{
   this.#requireReadAuthority([caller,first],read,true);
   const fresh=await this.#readBinding(read);
   this.#requireReadBindings(fresh,fresh,fresh,read,false,[caller,first]);
   const result=await this.snapshot();
   this.#requireReadBindings(fresh,fresh,fresh,read,false,[caller,first]);
   await this.#readStillCurrent(fresh,fresh,read,false,[caller,first]);
   this.#requireReadBindings(fresh,fresh,fresh,read,false,[caller,first]);
   return result;
  }catch(failure){read.refused=true;throw failure;}
 }
 async #querySnapshot(){
  if(!this.#originalReadOwner()||!repositoryShape(this.s.repository))return this.snapshot();
  // A disproved scan remains in its original slot until actual settlement.
  // New callers simply perform their own original work, without observers.
  if(this.#pendingRead?.active&&this.#pendingRead.unshareable)return this.snapshot();
  await this.s.finishFoundation();const binding=await this.#readBinding();
  if(!binding)return this.snapshot();
  const pending=this.#pendingRead;
  if(pending?.active){
   if(pending.unshareable||!this.#sameReadBinding(binding,pending.binding,pending))return this.snapshot();
   pending.joined=true;
   // A private decline conveys no material and grants no scope. It only
   // stops waiting for work that already cannot be reused. Both complete
   // original-currentness guards around the independent scan remain.
   try{await Promise.race([pending.promise,pending.declined]);}catch{
    await this.#readStillCurrent(binding,pending.binding,pending);
    const fresh=await this.snapshot();await this.#readStillCurrent(binding,pending.binding,pending);return fresh;
   }
   if(!pending.static){await this.#readStillCurrent(binding,pending.binding,pending);const fresh=await this.snapshot();await this.#readStillCurrent(binding,pending.binding,pending);return fresh;}
   try{
   await this.#readStillCurrent(binding,pending.binding,pending,true);
   // Only already-waiting callers can use this settled result. Reproject with
   // this caller's original clock and own independent objects, then requalify.
   const material=pending.material,copy={inputs:structuredClone(material.inputs),preferences:structuredClone(material.preferences),generation:material.generation};
   copy.families=await projectPromptFamilies(copy.inputs,copy.preferences,this.clock());
   await this.#readStillCurrent(binding,pending.binding,pending,true);return copy;
   }catch(error){return this.#freshAfterFence(error,binding,pending.binding,pending);}
  }
  const read={binding,active:true,joined:false,ownerChanged:false,refused:false,noFresh:false,unshareable:false,static:false,expected:0,receipts:[],promise:null,declined:null,decline:null};
  read.declined=new Promise(resolve=>{read.decline=resolve;});
  this.#pendingRead=read;read.promise=this.#snapshot(true,read);
  const retire=()=>{read.active=false;read.receipts=[];if(this.#pendingRead===read)this.#pendingRead=null;};
  // Retire at the underlying original settlement, before caller final checks.
  // Never await this work while occupying the Store's serialization queue.
  read.promise.then(retire,retire);
  const result=await read.promise;
  if(read.joined&&read.static){try{await this.#readStillCurrent(binding,binding,read,true);}catch(error){return this.#freshAfterFence(error,binding,binding,read);}}
  return result;
 }
 async members(id){
  const x=await this.snapshot(),family=x.families.find(f=>f.id===id);if(!family)changed();
  return x.inputs.filter(i=>family.members.includes(i.id)).map(i=>({id:i.id,text:i.text}));
 }
 async query({includeHidden=false}={}){
  if(typeof includeHidden!=='boolean')fail();const serial=this.#nextFamilyView.begin(),x=await this.#querySnapshot();
  this.#nextFamilyView.publish(serial,x);
  const eligible=x.families.filter(f=>(includeHidden||!f.hidden)&&(f.useful||f.pinned||f.edited||f.retained));
  const manualConflict=this.syncJournal?await this.manualConflict():null;if(manualConflict?.state==='available'&&manualConflict.revision!==x.preferences.revision)changed();
  return {...(manualConflict?{manualConflict}:{}),revision:x.preferences.revision,generation:x.generation,manualOrder:[...x.preferences.pins],items:eligible.filter(f=>quickPromptEligible(f.text)),oversizedItems:eligible.filter(f=>!quickPromptEligible(f.text)),complete:true,...(x.unresolved?{unresolved:x.unresolved,bindingsComplete:x.bindingsComplete}:{})};
 }
 async historicalCandidateStatus(){return {available:this.#historyCandidates?.available()===true};}
 async refreshHistoricalCandidates(query,source){
  if(!this.#historyCandidates)throw new ArchiveError('UNAVAILABLE');
  const handle=await this.#historyCandidates.prepare({query},source);await this.#historyCandidates.run(handle);return handle;
 }
 async assertHistoricalCandidatesCurrent(handle){if(!this.#historyCandidates)throw new ArchiveError('UNAVAILABLE');await this.#historyCandidates.read(handle);}
 async adoptHistoricalCandidates(handle){
  const local=await this.query();if(!handle||!this.#historyCandidates)return local;
  try{
   const result=await this.#historyCandidates.read(handle);if(result.kind!=='CANDIDATES')return local;
   const items=[];for(const ref of result.refs){const selected=await this.resolveSelection(ref);if(!quickPromptEligible(selected.text))continue;items.push({id:ref.id,text:selected.text,ref:structuredClone(ref),members:[],pinned:false,hidden:false,edited:false,retained:false,useful:true});}
   await this.#historyCandidates.read(handle);
   // Protected human slots remain in their original relative order. AI can add
   // only already-qualified historical IDs, never replace their authored text.
   const protectedItems=local.items.filter(x=>x.pinned||x.edited||x.retained);
   return {...local,items:[...protectedItems,...items],candidateSource:'ai',complete:false};
  }catch(error){if(!['UNAVAILABLE','STALE_BASE','MEMORY_STALE','CANCELLED'].includes(error.code))throw error;return local;}
 }
 async nextFamilyView(){return this.#nextFamilyView.read(expected=>this.assertCurrent(expected));}
 async resolve({id,text}={}){
  if(typeof id!=='string'||!validPromptText(text))fail();const x=await this.#querySnapshot();
  const f=x.families.find(f=>f.id===id&&!f.hidden&&(f.useful||f.pinned||f.edited||f.retained));
  if(!f||f.text!==text)changed();return {id:f.id,text:f.text,generation:x.generation};
 }
 async qualifyArchiveArrival(descriptor){
  const keys=['version','query','scope','searchSnapshot','ref'];
  if(!descriptor||!own(descriptor,keys)||Object.keys(descriptor).length!==keys.length||descriptor.version!==1||typeof descriptor.query!=='string'||descriptor.query.length>1000||!descriptor.scope||Object.keys(descriptor.scope).length!==6||Object.entries(PROMPT_HISTORY_SCOPE).some(([key,value])=>descriptor.scope[key]!==value))fail();
  const ref=descriptor.ref;
  if(!(await this.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(!descriptor.query.trim()){if(ref!==null||descriptor.searchSnapshot!==null)fail();await this.s.run(()=>this.s.repository.transaction(false,publicationSettled,['meta']));return structuredClone(descriptor);}
  if(ref!==null&&(!validPromptSelectionRef(ref)||ref.kind!=='history_input'||ref.generation!==descriptor.searchSnapshot?.generation))fail();
  const searchContext={query:descriptor.query,knownRevision:ref?.contentRevision??0,searchSnapshot:descriptor.searchSnapshot,scope:descriptor.scope};
  const prepared=ref===null?await prepareInputSearchContext(searchContext):await prepareInputSearchArrival(this.s,{documentId:ref.documentId,qualifyContext:true,searchContext});
  await this.s.run(()=>this.s.repository.transaction(false,async t=>{
   await publicationSettled(t);if(await generation(t)!==descriptor.searchSnapshot.generation)changed();
   if(ref){const input=await readPromptHistoryInTransaction(this.s,t,ref);selectPromptRange(input.body);if(!await matchesInputSearchArrival(this.s,t,input,prepared,await t.get('meta','smart-filter')))changed();}
  }));
  return structuredClone(descriptor);
 }
 async queryHistory(options){return queryPromptHistory(this.s,options);}
 async resolveSelection(ref,range=null){
  if(!validPromptSelectionRef(ref))fail();
  if(ref.kind==='history_input')return readPromptHistory(this.s,ref,range);
  // An independent authored override has no historical member or Family
  // qualification. Read its original preference owner twice across the
  // coordinator's initial/final checks, without rebuilding the Input corpus.
  // Edited pf: identities and configured Sync correction owners keep their
  // existing complete qualification; this path grants no portable authority.
  if(this.syncJournal===null&&ref.kind==='manual_reuse'&&/^manual:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(ref.id)){
   let selectedRange;try{selectedRange=range===null?null:structuredClone(range);}catch{fail();}
   return this.#independentManualSelection(structuredClone(ref),selectedRange);
  }
  const x=await this.snapshot();if(x.generation!==ref.generation||x.preferences.revision!==ref.revision)changed();
  const family=x.families.find(f=>f.id===ref.id&&!f.hidden&&(f.useful||f.pinned||f.edited||f.retained));
  if(!family||(family.edited?'manual_reuse':'prompt_family')!==ref.kind)changed();
  return {ref:structuredClone(ref),range:range===null?null:structuredClone(range),text:selectPromptRange(family.text,range),generation:x.generation,familyId:ref.id};
 }
 async #independentManualSelection(ref,range){
  await this.s.finishFoundation();
  return this.s.run(()=>this.s.repository.transaction(false,async t=>{
   await publicationSettled(t);
   const before=await generation(t),{settings}=await this.s.control(t);
   if(settings.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');
   const preferences=await readPromptPreferences(t);
   if(before!==ref.generation||preferences.revision!==ref.revision)changed();
   const override=preferences.overrides.find(row=>row.id===ref.id&&row.text!==undefined&&!row.hidden);
   if(!override)changed();
   const text=selectPromptRange(override.text,range);
   await publicationSettled(t);
   if(await generation(t)!==before)changed();
   if((await this.s.control(t)).settings.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');
   return {ref:structuredClone(ref),range:range===null?null:structuredClone(range),text,generation:before,familyId:ref.id};
  },['meta']));
 }
 async assertSelectionCurrent(selected){
  const current=await this.resolveSelection(selected.ref,selected.range);if(current.text!==selected.text)changed();return current;
 }
 async assertCurrent(expected){return this.s.run(()=>this.s.repository.transaction(false,async t=>{if(expected!==await generation(t)){recordPromptRefusal('final-generation-mismatch','MEMORY_STALE');changed();}},['meta']));}
 async #manualControl(journal,work,expected=null){
  return this.s.run(async()=>{const before=await observeOriginalPromptControlPublication(this.s);if(before.row.settings.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');if(this.syncJournal!==journal||expected&&controlPublicationEncoding(before.row)!==controlPublicationEncoding(expected))changed();const result=await work(before.token);const after=await observeOriginalPromptControlPublication(this.s,before.token);if(controlPublicationEncoding(after.row)!==controlPublicationEncoding(before.row))changed();return {result,control:before.row};});
 }
 async manualConflict(){
  if(!(await this.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(!(this.syncJournal instanceof PromptSyncJournal))return {state:'unavailable'};
  const journal=this.syncJournal,{result:offer,control}=await this.#manualControl(journal,()=>journal.captureManualConflict(this));if(offer.state!=='available')return offer;
  const token=crypto.randomUUID();if(this.#manualConflictOffers.size>=8)this.#manualConflictOffers.delete(this.#manualConflictOffers.keys().next().value);this.#manualConflictOffers.set(token,{journal,control,capability:offer.capability});
  return {state:'available',token,revision:offer.revision,id:offer.id,localText:offer.localText,otherText:offer.otherText};
 }
 async assertManualConflictCurrent(token){const offer=this.#manualConflictOffers.get(token);if(!offer||this.syncJournal!==offer.journal)changed();await this.#manualControl(offer.journal,()=>offer.journal.assertManualConflict(this,offer.capability),offer.control);return true;}
 async resolveManualConflict(request){
  if(!own(request,['token','choice','text'])||typeof request.token!=='string'||typeof request.choice!=='string')fail();await this.assertManualConflictCurrent(request.token);const offer=this.#manualConflictOffers.get(request.token),prepared=await offer.journal.prepareManualResolution(this,offer.capability,request.choice,request.text);
  // The final control observation is performed before native IDB admission.
  // No SDK promise is introduced into the original atomic write transaction.
  const result=await this.s.run(async()=>{const control=await observeOriginalPromptControlPublication(this.s);if(control.row.settings.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');if(controlPublicationEncoding(control.row)!==controlPublicationEncoding(offer.control))changed();return this.s.repository.transaction(true,async t=>{await publicationSettled(t);if(this.syncJournal!==offer.journal)changed();return offer.journal.commitManualResolution(t,this,prepared,control);},['meta']);});this.#manualConflictOffers.delete(request.token);return result;
 }
 async change(change){return this.#change(change);}
 async createFromHistory(ref,text,revision){
  if(!validPromptSelectionRef(ref)||ref.kind!=='history_input')fail();
  return this.#change({action:'create',text,revision},ref);
 }
 async #change(change,origin=null){
  if(!own(change,['action','id','revision','text','order','inputIds','representative'])||!Number.isSafeInteger(change.revision))fail();
  const {action,id}=change,x=await this.snapshot();if(x.preferences.revision!==change.revision)changed();
  const p=structuredClone(x.preferences),f=x.families.find(f=>f.id===id);let o=p.overrides.find(o=>o.id===id);
  if(action==='create'){
   if(id!==undefined||!validPromptText(change.text))fail();if(!quickPromptEligible(change.text))throw new ArchiveError('PROMPT_TOO_LONG');o={id:'manual:'+crypto.randomUUID(),text:change.text,hidden:false,reuseCount:0};p.overrides.push(o);
  }else if(action==='delete'){
   // Delete only independent user-owned reuse work, never a supported Family.
   if(!f||f.members.length!==0||o?.text===undefined)fail();
   p.overrides=p.overrides.filter(x=>x.id!==id);p.pins=p.pins.filter(x=>x!==id);
  }else{
   if(!f&&!o)fail();if(!o){o={id,hidden:false,reuseCount:0};p.overrides.push(o);}
   if(action==='edit'){if(!validPromptText(change.text))fail();if(!quickPromptEligible(change.text))throw new ArchiveError('PROMPT_TOO_LONG');o.text=change.text;}
   else if(action==='representative'){if(!f?.members.includes(change.representative))fail();if(!quickPromptEligible(x.inputs.find(row=>row.id===change.representative)?.text))throw new ArchiveError('PROMPT_TOO_LONG');o.representative=change.representative;}
   else if(action==='hide'||action==='show')o.hidden=action==='hide';
   else if(action==='unpin')p.pins=p.pins.filter(x=>x!==id);
   else if(action==='pin'){
    if(change.order===undefined){if(!p.pins.includes(id))p.pins.push(id);}
    else{if(!Array.isArray(change.order)||new Set(change.order).size!==change.order.length||change.order.length!==new Set([...p.pins,id]).size||![...p.pins,id].every(x=>change.order.includes(x)))fail();p.pins=[...change.order];}
   }else if(action==='split'){
    const ids=change.inputIds;if(!f||!Array.isArray(ids)||!ids.length||ids.length>=f.members.length||new Set(ids).size!==ids.length||!ids.every(id=>f.members.includes(id)))fail();
    const group=crypto.randomUUID();p.splits=p.splits.filter(x=>!ids.includes(x.inputId));p.splits.push(...ids.map(inputId=>({inputId,group})));
   }else fail();
  }
  p.revision++;if(!validPromptPreferences(p))fail();
  // Optional local BNS proof: serialize/hash before opening IDB. The canonical
  // CAS write and durable outbox are acknowledged only after the same commit.
  const syncPrepared=this.syncJournal?await this.syncJournal.prepare(x.preferences,p,{inputs:x.inputs,generation:x.generation}):null;
  await this.s.run(()=>this.s.repository.transaction(true,async t=>{
   await publicationSettled(t);
   if(origin)await readPromptHistoryInTransaction(this.s,t,origin);
   if(await generation(t)!==x.generation||(await readPromptPreferences(t)).revision!==change.revision)changed();await t.put('meta',p);
   if(this.syncJournal)await this.syncJournal.commit(t,syncPrepared);
  }));return {revision:p.revision,id:o.id};
 }
 // Only the trusted insertion coordinator calls this after verified read-back.
 async noteVerifiedReuse(id,verifiedGeneration=null){
  // A coordinator may reuse its just-qualified selection generation. The same
  // canonical CAS below rejects every subsequent deletion/edit/revocation; no
  // usage receipt can recreate a removed override. Legacy callers requalify.
  const x=verifiedGeneration===null?await this.snapshot():{generation:verifiedGeneration};
  if(!Number.isSafeInteger(x.generation)||x.generation<0)fail();
  if(verifiedGeneration===null&&!x.families.some(f=>f.id===id&&!f.hidden))return;
  return this.s.run(()=>this.s.repository.transaction(true,async t=>{
   await publicationSettled(t);
   // A late acknowledgement cannot recreate an override deleted since selection.
   if(await generation(t)!==x.generation)changed();
   const p=await readPromptPreferences(t),before=structuredClone(p);let o=p.overrides.find(x=>x.id===id);if(!o){o={id,hidden:false,reuseCount:0};p.overrides.push(o);}
   o.reuseCount=Math.min(1000000,o.reuseCount+1);p.revision++;if(!validPromptPreferences(p))fail();await t.put('meta',p);if(this.syncJournal?.noteVerifiedReuse)await this.syncJournal.noteVerifiedReuse(t,before,p);
  }));
 }
}
const originalSnapshot=PromptReuseService.prototype.snapshot;
