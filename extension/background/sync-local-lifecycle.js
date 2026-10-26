import {originalBootstrapHostSupported,originalBootstrapNow} from './native-host-bootstrap.js';
import {originalBootstrapFreeze} from './native-host-bootstrap.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {isProductionApplicationStore} from './application-store-selection.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost,readOriginalBootstrapLocal,readOriginalBootstrapIndexedDB} from './native-host-bootstrap.js';
import {measureSourceWorkingPhysicalTree} from '../core/browser-native-sync/source-working-physical.js';
import {requireOriginalApplicationSelectionCoordinatorStart,readOriginalSelectionAdmissionDeadline,chargeOriginalSelectionAdmissionWork,chargeOriginalSelectionAdmissionResult,noteOriginalSelectionAdmissionHold,requireOriginalApplicationSelectionDriverSettlement,chargeOriginalApplicationSelectionDriverWork} from './application-selection-reservation-coordination.js';
import {assertSourceBootstrapUnionSelection} from '../core/browser-native-sync/source-bootstrap-union.js';
import {createOriginalRecoveryWork,currentOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,remainingOriginalRecoveryWork,finishOriginalRecoveryWork} from '../core/idb-repository.js';
import {ContextCardsService,readContextCards} from '../core/context-cards.js';
import {originalContextMutationConstructor} from '../core/browser-native-sync/context-mutation-journal-owner.js';
import {readOriginalContextEnrollmentObservation} from '../core/browser-native-sync/context-mutation-journal-owner.js';
import {createOriginalApplicationSelectionForLifecycle,readOriginalApplicationSelectionReview,holdOriginalApplicationSelectionReview,requireOriginalApplicationSelectionReviewHold,releaseOriginalApplicationSelectionReviewHold,requalifyOriginalApplicationSelectionReviewHold,invalidateOriginalApplicationSelectionReviewHold,readOriginalApplicationSelectionReviewHoldDeadline} from '../core/browser-native-sync/application-generation-selection.js';
import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
import {CONSUMER_PREFERENCE_KEYS} from '../core/browser-native-sync/consumer-preference-codec.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {PROMPT_REUSE_ROW,readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {RecoverableCheckpointPublication} from '../core/browser-native-sync/checkpoint-publication.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {SourcePurgeJournal} from '../core/browser-native-sync/source-purge-journal.js';
import {ArchiveError,safeErrorCode} from '../core/constants.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {PreparedPublicationJournal} from '../core/browser-native-sync/publications.js';
import {LocalSyncRecoverySession} from '../core/browser-native-sync/recovery-session.js';
import {GoogleDriveAppDataTransport} from '../core/browser-native-sync/providers/google-drive.js';
import {OneDriveAppFolderTransport} from '../core/browser-native-sync/providers/onedrive.js';
import {bytes,clone,digest,equal,exact,hash,opaque} from '../core/browser-native-sync/value.js';
import {assertProtocolObjectReference} from '../core/browser-native-sync/segments.js';
import {readSyncLifecycleConfiguration} from './sync-lifecycle-configuration.js';

const ROW='paia-sync-local-lifecycle:v1';
const fail=code=>{throw new ArchiveError(code);};
const unavailable=()=>Object.freeze({version:1,state:'unavailable',reason:'provider-not-configured',productionActivation:false});
const states=new Set(['active','paused','disconnected','account-changed']);
const safeError=error=>typeof error?.code==='string'&&/^(BNS_|STORAGE_|CONTROL_|BACKUP_)[A-Z_]+$/.test(error.code)?error.code:'BNS_SYNC_OUTCOME_UNKNOWN';
export const syncLifecycleError=error=>typeof error?.code==='string'&&/^(BNS_|STORAGE_|CONTROL_|BACKUP_)[A-Z_]+$/.test(error.code)?error.code:safeErrorCode(error);
const owners=new WeakMap(),lifecycleOrigins=originalBootstrapWeakMap(),productionLifecycleOrigin=originalBootstrapSymbol(),ordinaryLifecycleOrigin=originalBootstrapSymbol(),injectedLifecycleOrigin=originalBootstrapSymbol();
const selectionOwners=new WeakMap(),selectionReservations=new WeakMap(),selectionActionSessions=new WeakMap();
const selectionNow=originalBootstrapHostSupported()?originalBootstrapNow:performance.now.bind(performance);
const selectionClone=globalThis.structuredClone,selectionFreeze=Object.freeze,selectionSetPrototype=Object.setPrototypeOf,selectionDescriptors=Object.getOwnPropertyDescriptors,selectionOwnKeys=Reflect.ownKeys,selectionHasOwn=Object.hasOwn,selectionIsArray=Array.isArray,selectionPrototype=Object.getPrototypeOf,selectionObjectPrototype=Object.prototype,selectionArrayPrototype=Array.prototype,selectionSetHas=Set.prototype.has,selectionSetForEach=Set.prototype.forEach,selectionSetSize=Object.getOwnPropertyDescriptor(Set.prototype,'size').get;
// Only call on a fresh captured-native-clone result. No node has escaped to
// the SDK, an update callback, or a currentness callback before this traversal.
function freezeOwnedSyncRow(value,allowArrays){
 if(value===null||typeof value!=='object')return value;
 const array=selectionIsArray(value),prototype=selectionPrototype(value);
 if(array&&!allowArrays)fail('BNS_SYNC_SELECTION_ROW_PROFILE');
 if(array?prototype!==selectionArrayPrototype:prototype!==selectionObjectPrototype&&prototype!==null)fail('BNS_SYNC_STATE_CORRUPT');
 const descriptors=selectionDescriptors(value),keys=selectionOwnKeys(descriptors);
 if(array){
  const length=descriptors.length;
  if(!length||!selectionHasOwn(length,'value')||length.enumerable||keys.length!==length.value+1)fail('BNS_SYNC_STATE_CORRUPT');
  for(let i=0;i<length.value;i++){const descriptor=descriptors[i];if(!descriptor||!selectionHasOwn(descriptor,'value')||!descriptor.enumerable)fail('BNS_SYNC_STATE_CORRUPT');freezeOwnedSyncRow(descriptor.value,allowArrays);}
 }else{
  for(let i=0;i<keys.length;i++){const descriptor=descriptors[keys[i]];if(typeof keys[i]!=='string'||!selectionHasOwn(descriptor,'value')||!descriptor.enumerable)fail('BNS_SYNC_STATE_CORRUPT');freezeOwnedSyncRow(descriptor.value,allowArrays);}
  selectionSetPrototype(value,null);
 }
 selectionFreeze(value);return value;
}

// These fixed exports inspect original private instances only. They never
// register caller callbacks, accept DTO authority, or grant a global hold.
export function isOriginalSyncSelectionOwner(owner){return selectionOwners.has(owner);}
export function openOriginalSyncSelectionAction(lifecycle,coordinator,owner){if(originalBootstrapWeakGet(lifecycleOrigins,lifecycle)?.origin===productionLifecycleOrigin)fail('GENERATION_NATIVE_HOST_ACCOUNTING_UNAVAILABLE');const o=selectionOwners.get(owner);if(!o||o.lifecycle!==lifecycle)fail('BNS_SYNC_SELECTION_INVALID');requireOriginalApplicationSelectionCoordinatorStart(coordinator,lifecycle,owner);return o.begin(coordinator);}
export function readOriginalSyncSelectionActionSession(session,coordinator){const r=selectionActionSessions.get(session);if(!r||r.coordinator!==coordinator)fail('BNS_SYNC_SELECTION_INVALID');return session;}
export function requireOriginalSyncSelectionReservation(token,owner){const r=selectionReservations.get(token);if(!r||r.owner!==owner)fail('BNS_SYNC_SELECTION_INVALID');r.check();return true;}
export function markOriginalSyncSelectionAttempt(token,owner,phase){
 requireOriginalSyncSelectionReservation(token,owner);const r=selectionReservations.get(token);
 if(phase==='marker'&&r.phase!=='sdk')r.phase='marker';
 else if(phase==='sdk'&&r.phase==='marker')r.phase='sdk';
 else{r.invalid=true;invalidateOriginalApplicationSelectionReviewHold(r.reviewHold,r.owner);fail('BNS_SYNC_SELECTION_INVALID');}
}
// The imported ESM class binding is the original owning definition. Do not
// read it eagerly across the fixed static graph; no public prototype snapshot.
const OriginalSettlementPromise=Promise,originalSettlementThen=Promise.prototype.then,settlementApply=Reflect.apply;
// Observe only settlement of the original promises. A public race/finally or
// species return value cannot shorten the enrollment invocation or bless it.
const settlementRace=tasks=>new OriginalSettlementPromise((resolve,reject)=>{for(const task of tasks)try{settlementApply(originalSettlementThen,task,[resolve,reject]);}catch(error){reject(error);}});

// The fixed source host, not an RPC or stored identity record, supplies current
// authenticated binding and the existing bounded request capability. In this
// build it is absent. This consumer never acquires/persists tokens or a grant.
async function createSyncLifecycle(store,api,origin){
 if(arguments.length!==3)fail('BNS_SYNC_CONFIGURATION');
 const config=readSyncLifecycleConfiguration();
 if(config===null){const controller=originalBootstrapFreeze({attachPromptService:async()=>{},attachContextService:async()=>{},snapshot:async()=>unavailable(),reconcile:async()=>unavailable(),suspend:()=>{},resumeAfterSuspend:async()=>unavailable(),handle:async(request,sender)=>{trusted(request,sender,api);if(request.type!=='PAIA_SYNC_STATUS')fail('BNS_SYNC_UNAVAILABLE');return unavailable();}});originalBootstrapWeakSet(lifecycleOrigins,controller,{store,api,origin});return controller;}
 if(!exact(config,['provider','datasetId','deviceId','binding','request','isCurrent'])||!['google-drive','onedrive'].includes(config.provider)||!opaque(config.datasetId)||!opaque(config.deviceId)||typeof config.request!=='function'||typeof config.isCurrent!=='function'||!store?.repository||!api?.storage?.local)fail('BNS_SYNC_CONFIGURATION');
 if(owners.has(api.storage.local))fail('BNS_SYNC_OWNER_BUSY');
 const reservation={};owners.set(api.storage.local,reservation);let controller;
 try{
  const identity=clone(config.binding),core=new BrowserNativeSyncCore(store.repository,{datasetId:config.datasetId,deviceId:config.deviceId});
  // Reuse the original provider's exact binding validation, without a request.
  const probe=new (config.provider==='google-drive'?GoogleDriveAppDataTransport:OneDriveAppFolderTransport)(core,{binding:identity,request:config.request,isCurrent:config.isCurrent});probe.close();
  const account={provider:config.provider,datasetId:config.datasetId,deviceId:config.deviceId,database:store.repository.name,binding:{...identity}};delete account.binding.generation;
  const bindingId=await digest(account),generation=await digest(identity.generation);
  await store.finishFoundation();
  // Fixed configured consumer only. Never overwrite another owner's journals.
  if(store.sourceBootstrapJournal||store.filterIntentJournal||store.inputWorkingJournal||store.sourcePurgeJournal||store.consumerPreferenceJournal)fail('BNS_SYNC_OWNER_BUSY');
  controller=new SyncLifecycle(store,api,config,identity,bindingId,generation,core);owners.set(api.storage.local,controller);
  await controller.attachPreferences();
  await controller.reconcile();
  store.sourceBootstrapJournal=new SourceBootstrapJournal(core);
  store.sourcePurgeJournal=new SourcePurgeJournal(core);
  store.filterIntentJournal=new FilterIntentSyncJournal(core);
  store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});
  originalBootstrapWeakSet(lifecycleOrigins,controller,{store,api,origin});return controller;
 }catch(error){if(controller)controller.suspend();else if(owners.get(api.storage.local)===reservation)owners.delete(api.storage.local);throw error;}

}
function trusted(request,sender,api){
 const page=sender?.url,archive=api.runtime.getURL('ui/archive.html');
 if(sender?.id!==api.runtime.id||sender.tab?.incognito||sender.frameId!==undefined&&sender.frameId!==0||!([archive,api.runtime.getURL('ui/popup.html')].includes(page)||typeof page==='string'&&page.startsWith(archive+'#')&&topicRootTarget(page)!==null))fail('FORBIDDEN');
 if(!exact(request,['type'])||!['PAIA_SYNC_STATUS','PAIA_SYNC_NOW','PAIA_SYNC_RESTORE','PAIA_SYNC_CONTINUE','PAIA_SYNC_PAUSE','PAIA_SYNC_RESUME','PAIA_SYNC_DISCONNECT'].includes(request.type))fail('INVALID_REQUEST');
}
function checked(row){
 if(!exact(row,['version','bindingId','generation','revision','mode','task','error','contextEnrollment','enrollmentSettlement'])||row.version!==1||!hash(row.bindingId)||!hash(row.generation)||!Number.isSafeInteger(row.revision)||row.revision<1||!states.has(row.mode)||row.error!==null&&(typeof row.error!=='string'||!/^(BNS_|STORAGE_|CONTROL_|BACKUP_)[A-Z_]+$/.test(row.error)))fail('BNS_SYNC_STATE_CORRUPT');
 if(row.contextEnrollment!==undefined&&row.contextEnrollment!==null){const value=row.contextEnrollment;if(!exact(value,['version','databaseId','namespace','epoch'])||Object.keys(value).length!==4||value.version!==1||!opaque(value.databaseId)||value.namespace!=='initial'&&!opaque(value.namespace)||value.epoch!==null&&!opaque(value.epoch))fail('BNS_SYNC_STATE_CORRUPT');}
 if(row.enrollmentSettlement!==undefined&&row.enrollmentSettlement!==null){
  const value=row.enrollmentSettlement;
  if(!exact(value,['version','attempt','bindingId','generation','startRevision','phase','confirmedRevision'])||Object.keys(value).length!==7||value.version!==1||!opaque(value.attempt)||value.bindingId!==row.bindingId||value.generation!==row.generation||!Number.isSafeInteger(value.startRevision)||value.startRevision<1||value.startRevision>row.revision||!['pending','confirmed'].includes(value.phase)||value.phase==='pending'&&value.confirmedRevision!==null||value.phase==='confirmed'&&(!Number.isSafeInteger(value.confirmedRevision)||value.confirmedRevision!==value.startRevision+1||value.confirmedRevision>row.revision))fail('BNS_SYNC_STATE_CORRUPT');
 }
 if(row.task!==null){const task=row.task;if(!exact(task,['kind','id','phase','reference'])||!['publication','checkpoint','restore'].includes(task.kind)||!opaque(task.id)||!['reserved','running','unknown','confirmed'].includes(task.phase))fail('BNS_SYNC_STATE_CORRUPT');if(task.kind==='publication'&&task.reference!==null)fail('BNS_SYNC_STATE_CORRUPT');if(task.reference!==null){if(task.kind==='restore'&&task.reference.kind==='source-bootstrap-union')assertSourceBootstrapUnionSelection(task.reference);else{assertProtocolObjectReference(task.reference);if(task.reference.kind!=='checkpoint-manifest')fail('BNS_SYNC_STATE_CORRUPT');}}}
 return row;
}

class SyncLifecycle {
 #taskFailure=null;#store;#api;#config;#binding;#bindingId;#generation;#core;#journal;#row=null;#write=Promise.resolve();#uncertain=false;#continuationSaving=false;#busy=false;#suspended=false;#selectionHeld=false;#blocked=false;#serial=0;#transport=null;#restore=null;#checkpoint=null;#promptService=null;#promptJournal=null;#preferenceJournal=null;#contextService=null;#contextJournal=null;#contextSettled=false;#contextFailure=null;#local;#localGet;#localSet;#entries=new Set();#selection=null;#selectionIdentity;#selectionIdentityFacts;
 constructor(store,api,config,binding,bindingId,generation,core){this.#store=store;this.#api=api;this.#local=api.storage.local;this.#localGet=this.#local.get;this.#localSet=this.#local.set;
  const repository=store.repository,database=repository.db,storage=api.storage,request=config.request,isCurrent=config.isCurrent,provider=config.provider,datasetId=config.datasetId,deviceId=config.deviceId;
  this.#selectionIdentityFacts=(reservation=null,admission=null)=>owners.get(this.#local)===this&&store.repository===repository&&repository.db===database&&core.repository===repository&&core.datasetId===datasetId&&core.deviceId===deviceId&&api.storage===storage&&storage.local===this.#local&&store.local===this.#local&&this.#local.get===this.#localGet&&this.#local.set===this.#localSet&&config.request===request&&config.isCurrent===isCurrent&&config.provider===provider&&config.datasetId===datasetId&&config.deviceId===deviceId&&this.#selectionEqual(config.binding,this.#binding,reservation,admission);this.#selectionIdentity=(reservation=null,admission=null)=>this.#selectionIdentityFacts(reservation,admission)&&this.#hostCurrent();this.#config=config;this.#binding=binding;this.#bindingId=bindingId;this.#generation=generation;this.#core=core;this.#journal=new PreparedPublicationJournal(core,{checkpoint:()=>this.#allowed()});}
 #hostCurrent(){try{return this.#config.isCurrent(this.#binding)===true;}catch{return false;}}
 #allowed(){if(this.#suspended||this.#blocked||this.#uncertain||!this.#row||this.#row.mode!=='active'||this.#row.bindingId!==this.#bindingId||this.#row.generation!==this.#generation||!this.#hostCurrent())fail('BNS_SYNC_PAUSED');if(this.#contextService&&!this.#contextSettled)fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');}
 #invalidate(){if(this.#selection){this.#selection.invalid=true;invalidateOriginalApplicationSelectionReviewHold(this.#selection.reviewHold,this.#selection.owner);}if(this.#continuationSaving)this.#uncertain=true;++this.#serial;this.#transport?.close();this.#transport=null;this.#restore?.pause();this.#checkpoint?.pause();}
 // Ownership copies are charged only to their actual original operation's
 // work ticket. In particular an independent stop never borrows a selection
 // action ticket. The same physical bound also applies without a work ticket.
 #rowOperand(work,operation,value,references=0){const measured=measureSourceWorkingPhysicalTree({operation,value},2*1024*1024);if(work)chargeOriginalRecoveryWork(this.#store.repository,work,measured.B,references);}
 #rowCopy(value,work,operation){this.#rowOperand(work,operation+'-input',value,1);const copy=selectionClone(value);this.#rowOperand(work,operation+'-result',copy);return copy;}
 #ownRow(value,work){const owned=this.#rowCopy(value,work,'owned-row-copy');this.#rowOperand(work,'owned-row-freeze-input',owned);freezeOwnedSyncRow(owned,true);this.#rowOperand(work,'owned-row-freeze-result',owned);return checked(owned);}
 async #read(work=null,settlement=null){
  if(settlement)settlement.check();if(work)chargeOriginalRecoveryWork(this.#store.repository,work,bytes(ROW).length,1);
  const value=(await (settlement?settlementApply(this.#localGet,this.#local,[ROW]):this.#api.storage.local.get(ROW)))?.[ROW];
  if(settlement)settlement.check();if(work)chargeOriginalRecoveryWork(this.#store.repository,work,bytes(value??null).length,0);return value===undefined?null:this.#ownRow(value,work);
 }
 async #save(update,work=null,settlement=null,allowUncertainStop=false){
  if(this.#uncertain&&!allowUncertainStop||this.#suspended)fail('BNS_SYNC_OUTCOME_UNKNOWN');
  const write=async()=>{
   if(this.#uncertain&&!allowUncertainStop||this.#suspended)fail('BNS_SYNC_OUTCOME_UNKNOWN');const before=this.#row,current=await this.#read(work,settlement);if(!equal(current,before)){this.#uncertain=true;this.#invalidate();fail('BNS_SYNC_STATE_CHANGED');}
   const next=this.#ownRow(checked({...update(this.#rowCopy(before,work,'update-row-copy')),revision:(before?.revision??0)+1}),work),sdkNext=this.#rowCopy(next,work,'sdk-row-copy');
   // The SDK receives a separate mutable wire copy. The owned immutable intent
   // remains the SAME #row / confirmed(next) / return identity after readback.
   // A rejected storage acknowledgement is not proof of rollback. Read the
   // exact durable row once; do not repeat the write or perform any transfer.
   let writeError=null;try{if(work)chargeOriginalRecoveryWork(this.#store.repository,work,bytes({[ROW]:sdkNext}).length,1);if(settlement){settlement.check();settlement.dispatched();await settlementApply(this.#localSet,this.#local,[{[ROW]:sdkNext}]);settlement.check();}else await this.#api.storage.local.set({[ROW]:sdkNext});if(work)checkOriginalRecoveryWork(this.#store.repository,work);}catch(error){writeError=error;}
   let observed;try{observed=await this.#read(work,settlement);}catch{this.#uncertain=true;this.#invalidate();fail('BNS_SYNC_OUTCOME_UNKNOWN');}
   if(!equal(observed,next)){this.#uncertain=true;this.#invalidate();fail(writeError?'BNS_SYNC_OUTCOME_UNKNOWN':'BNS_SYNC_STATE_CHANGED');}
   this.#row=next;if(settlement)settlement.confirmed(next);return next;
  };
  // Only the enrollment flow adds original-promise settlement provenance. The
  // unrelated existing lifecycle save path keeps its prior queue semantics.
  const action=settlement?new OriginalSettlementPromise((resolve,reject)=>{try{settlementApply(originalSettlementThen,this.#write,[()=>{try{settlementApply(originalSettlementThen,write(),[resolve,reject]);}catch(error){reject(error);}},reject]);}catch(error){reject(error);}}):this.#write.then(write);
  this.#write=settlement?new OriginalSettlementPromise(resolve=>{settlementApply(originalSettlementThen,action,[()=>resolve(),()=>resolve()]);}):action.catch(()=>{});return action;
 }
 #stopAvailable(){return this.#uncertain&&!this.#suspended&&this.#hostCurrent()&&this.#row?.bindingId===this.#bindingId&&this.#row?.generation===this.#generation&&this.#row?.enrollmentSettlement?.phase==='pending';}
 #view(){const recoveryError=this.#taskFailure?.revision===this.#row?.revision?this.#taskFailure?.error:null;return Object.freeze({version:1,scope:this.#promptService?'source-working-prompt':'source-working-only',wholeArchiveComplete:false,contextCommands:!!this.#contextService,needsContextEnrollment:!!this.#contextService&&(!this.#contextSettled||this.#contextService.syncJournal!==this.#contextJournal),purgeProtection:'original-journal-fail-closed',portablePreferences:this.#store.consumerPreferenceJournal===this.#preferenceJournal,needsPreferenceEnrollment:this.#store.consumerPreferenceJournal!==this.#preferenceJournal,needsPromptEnrollment:!!this.#promptService&&this.#promptService.syncJournal!==this.#promptJournal,stopAvailable:this.#stopAvailable(),resumeAvailable:!this.#suspended&&!this.#uncertain&&!this.#busy&&this.#hostCurrent()&&(!this.#row||this.#row.bindingId===this.#bindingId&&(this.#row.mode!=='disconnected'||this.#row.generation!==this.#generation)),unsupportedOwners:this.#promptService?['human-library',this.#contextService?'automatic-context':'context','topic','nonportable-settings','edited-source-purge']:['human-library','prompt','context','topic','nonportable-settings','edited-source-purge'],state:this.#suspended?'suspended':this.#uncertain?'settlement-unknown':this.#row?.mode??'not-started',busy:this.#busy,task:this.#row?.task?{kind:this.#row.task.kind,phase:recoveryError&&this.#row.task.phase!=='confirmed'?'unknown':this.#row.task.phase}:null,error:this.#contextFailure??recoveryError??this.#row?.error??null,productionActivation:false});}
 async #attachPreferences(){
  this.#preferenceJournal=new ConsumerPreferenceSyncJournal(this.#core);
  // Existing original intents/terminal receipts are recovered by the original
  // owner. An un-enrolled device keeps its ordinary Settings behavior until
  // the user's explicit Resume, without inventing historical explicitness.
  let represented=false;for(const key of CONSUMER_PREFERENCE_KEYS)if(await this.#core.read('head','consumerPreference',key)){represented=true;break;}
  if(represented){this.#store.consumerPreferenceJournal=this.#preferenceJournal;await this.#preferenceJournal.recover(this.#store);}
 }
 async #enrollPreferences(){
  if(this.#store.consumerPreferenceJournal!==null&&this.#store.consumerPreferenceJournal!==this.#preferenceJournal)fail('BNS_SYNC_OWNER_BUSY');
  this.#store.consumerPreferenceJournal=this.#preferenceJournal;
  await this.#preferenceJournal.recover(this.#store);
  await this.#preferenceJournal.bootstrap(this.#store);
 }
 async #attachPromptService(service){
  if(this.#promptService||!(service instanceof PromptReuseService)||service.s!==this.#store||service.syncJournal!==null)fail('BNS_SYNC_OWNER_BUSY');
  this.#promptService=service;this.#promptJournal=new PromptSyncJournal(this.#core,{correctionBindings:true});
  // A cold original owner is reattached without a write. Unmanaged local work
  // is enrolled only by an explicit Resume action, never by status/startup.
  if(await this.#core.read('head','promptPreferences',PROMPT_REUSE_ROW)&&await this.#core.read('head','promptBinding',PROMPT_REUSE_ROW)){service.syncJournal=this.#promptJournal;await service.snapshot();}
 }
 async #enrollPrompt(){
  if(!this.#promptService)return;
  const service=this.#promptService,journal=this.#promptJournal;
  if(service.syncJournal!==null&&service.syncJournal!==journal)fail('BNS_SYNC_OWNER_BUSY');
  service.syncJournal=journal;
  const preferences=await this.#store.repository.transaction(false,readPromptPreferences,['meta']),head=await this.#core.read('head','promptPreferences',PROMPT_REUSE_ROW),binding=await this.#core.read('head','promptBinding',PROMPT_REUSE_ROW);
  if(!binding&&(head||preferences.pins.length||preferences.overrides.length||preferences.splits.length))await journal.bootstrap(service);
 }
 async #attachContextService(service){
  if(this.#contextService||!(service instanceof ContextCardsService)||service.s!==this.#store||service.syncJournal!==null)fail('BNS_SYNC_OWNER_BUSY');
  this.#contextService=service;this.#contextJournal=new (originalContextMutationConstructor())(this.#core,{store:this.#store});
  // A previous process cannot witness the terminal observation of an SDK
  // enrollment write. Neither a legacy empty receipt nor a confirmed marker
  // grants this process enrollment. Only a new explicit Resume can do so.
  // Pending attempts remain UNKNOWN and are never replayed by attachment.
  this.#contextSettled=false;
  if(this.#row?.enrollmentSettlement?.phase==='pending'){this.#uncertain=true;this.#blocked=true;this.#contextFailure='BNS_SYNC_OUTCOME_UNKNOWN';}

 }
 async #contextHead(item){return await this.#core.read('head','contextMutationMember',item.id)??await this.#core.read('head',({info:'contextItem',rules:'contextRulesItem',now:'contextNowItem'})[item.card],item.id);}
 async #enrollContext(){
  if(!this.#contextService)return null;
  const service=this.#contextService,journal=this.#contextJournal;
  if(service.syncJournal!==null&&service.syncJournal!==journal)fail('BNS_SYNC_OWNER_BUSY');
  service.syncJournal=journal;
  const row=await this.#store.repository.transaction(false,readContextCards,['meta']);
  // Each fixed owner rechecks its original canonical row in the same strict
  // transaction. Failure retains earlier exact receipts; no bulk rewrite.
  for(const item of row.items)if(!await this.#contextHead(item))await journal.bootstrapItem(service,item.id);
  for(const key of ['info','rules','now','inputs'])if(row.access[key].revision>0&&!await this.#core.read('head','contextDesired',key))await journal.bootstrapAccess(key);

 }
 // Admission is recorded before calling the original async body. Timeouts and
 // suspend do not remove a still-running original promise from this set.
 #entry(kind,body){
  if(this.#selectionHeld&&!['view','stop','release','release-read','selection-requalify'].includes(kind))return new OriginalSettlementPromise((_,reject)=>reject(new ArchiveError('BNS_SYNC_PAUSED')));
  const entry={kind};this.#entries.add(entry);let task;
  try{task=body(entry);}catch(error){this.#settledEntry(entry);return new OriginalSettlementPromise((_,reject)=>reject(error));}
  return new OriginalSettlementPromise((resolve,reject)=>{settlementApply(originalSettlementThen,task,[value=>{this.#settledEntry(entry);resolve(value);},error=>{this.#settledEntry(entry);reject(error);}]);});
 }
 #settledEntry(entry){
  this.#entries.delete(entry);const r=this.#selection;
  // An invalid selection must not suspend a genuine stop queued behind an
  // earlier SDK write. Only actual settlement of the last accepted stop ends
  // this deferral; the selection restriction remains closed throughout.
  if(entry.kind==='stop'&&r?.suspendPending&&![...this.#entries].some(active=>active.kind==='stop')){r.suspendPending=false;this.suspend();}
 }
 #selectionRowCurrent(r){if(!r.rowSnapshotInstalled)return this.#selectionEqual(this.#row,r.before);return !r.invalid&&!r.released&&this.#selection===r&&selectionNow()<r.deadline&&this.#row===r.immutableRow&&r.before===r.immutableRow;}
 #selectionEqual(a,b,reservation=null,admission=null){
  const action=this.#selection?.actionSession?.action;
  if(reservation?.rowSnapshotInstalled){
   if(reservation!==this.#selection||!action||reservation.actionSession?.action!==action)fail('BNS_SYNC_SELECTION_INVALID');
   // One actual same-invocation debit pays BOTH full live binding operands
   // and the following private-row identity operation. No price/limit change;
   // the second debit's self-accounting call no longer executes. Host callbacks
   // still precede a fresh row/deadline check and the final original core check.
   chargeOriginalApplicationSelectionDriverWork(action,{binding:[a,b],rowIdentity:{operation:'private-row-identity'}},0);
  }else if(action)chargeOriginalApplicationSelectionDriverWork(action,[a,b],0);
  else if(admission)chargeOriginalSelectionAdmissionWork(admission.coordinator,this,admission.owner,[a,b],0);
  return equal(a,b);
 }
 applicationSelectionAvailable(){return this.#selectionAvailable();}
 #selectionAvailable(admission=null){return !this.#entries.size&&!this.#busy&&!this.#blocked&&!this.#uncertain&&!this.#suspended&&!this.#selectionHeld&&this.#selectionIdentity(null,admission)&&(!this.#row||this.#row.bindingId===this.#bindingId&&this.#row.generation===this.#generation&&!['disconnected','account-changed'].includes(this.#row.mode))&&(!this.#row?.task||this.#row.task.phase==='confirmed');}
 reserveApplicationSelection(owner){
  if(arguments.length!==1)fail('BNS_SYNC_SELECTION_INVALID');return this.#reserveSelection(owner);
 }
 #reserveSelection(owner,admission=null){
  if(selectionOwners.get(owner)?.lifecycle!==this)fail('BNS_SYNC_SELECTION_INVALID');
  // Read-only preparation may inspect an unenrolled Context cut. Reserving
  // that original review still requires the separately settled Context owner.
  if(!this.#selectionAvailable(admission)||this.#contextService&&!this.#contextSettled)fail('BNS_SYNC_TASK_PENDING');
  const earlier=admission?readOriginalSelectionAdmissionDeadline(admission.coordinator,this,owner):null;
  const review=readOriginalApplicationSelectionReview(owner,this.#store,this.#core,this.#local),reviewHold=holdOriginalApplicationSelectionReview(owner,this.#store,this.#core,this.#local,earlier);
  if(admission)noteOriginalSelectionAdmissionHold(admission.coordinator,this,owner);
  const deadline=readOriginalApplicationSelectionReviewHoldDeadline(reviewHold,owner);
  // The SAME original hold clock begins before copying, not after it. Shape /
  // size validation bounds even this synchronous pre-registration work; its
  // original input/result and bookkeeping are debited when the action registers.
  const sourceRow=this.#row;let before,copyWork;try{
   if(admission)chargeOriginalSelectionAdmissionWork(admission.coordinator,this,owner,{operation:'original-reserve-row-copy-input',measure:sourceRow,clone:sourceRow},1);
   copyWork=measureSourceWorkingPhysicalTree(sourceRow,2*1024*1024);before=selectionClone(sourceRow);
   if(admission)chargeOriginalSelectionAdmissionResult(admission.coordinator,this,owner,{operation:'original-reserve-row-copy-result',value:before,work:copyWork});
   if(selectionNow()>=deadline)fail('BNS_SYNC_SELECTION_EXPIRED');}catch(error){invalidateOriginalApplicationSelectionReviewHold(reviewHold,owner);this.#blocked=true;throw error;}
  this.#invalidate();this.#busy=true;this.#selectionHeld=true;
  const r={owner,reviewHold,operationId:review.operationId,serial:this.#serial,sourceRow,before,copyWork,copyWorkCharged:admission!==null,rowSnapshotInstalled:false,immutableRow:null,deadline,phase:'reserved',invalid:false,released:false,releasing:false,renewing:false,suspendPending:false};
  r.check=(entry=null,factsOnly=false)=>{
   if(entry===null&&r.actionSession)entry=r.actionSession.entry;
   try{
    if(r.invalid||r.released||r.releasing&&!entry||this.#selection!==r||!this.#selectionHeld||!this.#busy||this.#serial!==r.serial||this.#blocked||this.#uncertain||this.#suspended||this.#contextService&&!this.#contextSettled||selectionNow()>=r.deadline||!(factsOnly?this.#selectionIdentityFacts(r):this.#selectionIdentity(r))||!this.#selectionRowCurrent(r)||[...this.#entries].some(active=>active!==entry&&active.kind!=='view')||entry&&!this.#entries.has(entry))fail('BNS_SYNC_SELECTION_INVALID');
    if(readOriginalApplicationSelectionReview(owner,this.#store,this.#core,this.#local).operationId!==r.operationId)fail('BNS_SYNC_SELECTION_INVALID');if(r.actionSession)r.actionSession.portal.current(r.actionSession.action);else requireOriginalApplicationSelectionReviewHold(reviewHold,owner);
   }catch(error){r.invalid=true;invalidateOriginalApplicationSelectionReviewHold(r.reviewHold,r.owner);throw error;}
  };
  const token=Object.freeze(Object.create(null));selectionReservations.set(token,r);this.#selection=r;return token;
 }
 // Consume only this lifecycle's original reservation. The caller cannot
 // provide a review, readiness callback, replacement owner or a fresh clock.
 requalifyApplicationSelection(token){
  const r=selectionReservations.get(token);
  if(arguments.length!==1||!r||this.#selection!==r||r.released||r.releasing||r.renewing)return new OriginalSettlementPromise((_,reject)=>reject(new ArchiveError('BNS_SYNC_SELECTION_INVALID')));
  let timer;
  const action=this.#entry('selection-requalify',entry=>this.#requalifySelection(r,entry));
  const timeout=new OriginalSettlementPromise((_,reject)=>{timer=setTimeout(()=>{this.#invalidateSelectionReview(r);reject(new ArchiveError('BNS_SYNC_SELECTION_EXPIRED'));},Math.max(0,r.deadline-selectionNow()));});
  // Only the public wait expires. #entry keeps observing the original action
  // until its actual settlement; late work cannot revive or release the hold.
  return new OriginalSettlementPromise((resolve,reject)=>{settlementApply(originalSettlementThen,settlementRace([action,timeout]),[value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);}]);});
 }
 #invalidateSelectionReview(r){
  r.invalid=true;invalidateOriginalApplicationSelectionReviewHold(r.reviewHold,r.owner);
  if(this.#selection!==r)return;
  if([...this.#entries].some(entry=>entry.kind==='stop'))r.suspendPending=true;
  else this.suspend();
 }
 async #requalifySelection(r,entry){
  r.renewing=true;
  const read=async()=>{r.check(entry);const raw=await settlementApply(this.#localGet,this.#local,[ROW]);r.check(entry);const actual=raw[ROW]===undefined?null:clone(checked(raw[ROW]));if(!equal(actual,r.before))fail('BNS_SYNC_STATE_CHANGED');};
  try{
   r.check(entry);if(r.phase!=='reserved')fail('BNS_SYNC_SELECTION_INVALID');await read();
   const result=await requalifyOriginalApplicationSelectionReviewHold(r.reviewHold,r.owner);
   r.check(entry);await read();r.check(entry);
   return Object.freeze({...result,productionActivation:false});
  }catch(error){this.#invalidateSelectionReview(r);throw error;}
  finally{r.renewing=false;}
 }
 releaseApplicationSelection(token){
  const r=selectionReservations.get(token);
  if(arguments.length!==1||!r||this.#selection!==r||r.released||r.releasing||r.renewing)return new OriginalSettlementPromise((_,reject)=>reject(new ArchiveError('BNS_SYNC_SELECTION_INVALID')));
  return this.#entry('release',entry=>this.#releaseSelection(token,entry));
 }
 async #releaseSelection(token,entry){
  const r=selectionReservations.get(token);if(!r||this.#selection!==r||r.released||r.releasing)fail('BNS_SYNC_SELECTION_INVALID');
  r.releasing=true;let timer;
  try{
   r.check(entry);if(r.phase!=='reserved')fail('BNS_SYNC_SELECTION_INVALID');
   const read=this.#entry('release-read',async()=>{const raw=await settlementApply(this.#localGet,this.#local,[ROW]);return raw[ROW]===undefined?null:clone(checked(raw[ROW]));});
   const timeout=new OriginalSettlementPromise((_,reject)=>{timer=setTimeout(()=>reject(new ArchiveError('BNS_SYNC_SELECTION_EXPIRED')),Math.max(0,r.deadline-selectionNow()));});
   const actual=await settlementRace([read,timeout]);r.check(entry);if(!equal(actual,r.before))fail('BNS_SYNC_STATE_CHANGED');
   releaseOriginalApplicationSelectionReviewHold(r.reviewHold,r.owner);r.released=true;this.#selection=null;this.#selectionHeld=false;this.#busy=false;return true;
  }catch(error){r.released=true;this.#invalidateSelectionReview(r);return false;}
  finally{clearTimeout(timer);}
 }
 #beginSelectionAction(coordinator,owner,portal){
  const deadline=readOriginalSelectionAdmissionDeadline(coordinator,this,owner),admission={coordinator,owner,deadline};
  const token=this.#reserveSelection(owner,admission),r=selectionReservations.get(token),entry={kind:'selection-action'};this.#entries.add(entry);
  let action;try{action=portal.begin(r.reviewHold);}catch(error){this.#entries.delete(entry);this.#invalidateSelectionReview(r);throw error;}
  const state={entry,portal,action};r.actionSession=state;
  const session=Object.freeze({action,portal,deadline:r.deadline,token,
   initialize:()=>{
    r.check(entry);if(r.phase!=='reserved'||r.rowSnapshotInstalled)fail('BNS_SYNC_SELECTION_INVALID');
    if(!r.copyWorkCharged){chargeOriginalApplicationSelectionDriverWork(action,{operation:'original-reserve-row-copy',work:r.copyWork},1);chargeOriginalApplicationSelectionDriverWork(action,[r.before,r.before],0);}
    // r.before was made by the captured original structuredClone and has never
    // escaped. All clone/compare/freeze work stays on this exact action ticket.
    chargeOriginalApplicationSelectionDriverWork(action,[this.#row,r.before],0);if(!equal(this.#row,r.before))fail('BNS_SYNC_STATE_CHANGED');
    chargeOriginalApplicationSelectionDriverWork(action,r.before,0);const snapshot=freezeOwnedSyncRow(r.before,false);chargeOriginalApplicationSelectionDriverWork(action,snapshot,0);if(snapshot!==null)checked(snapshot);
    // No SDK alias is frozen or retained. The original savedRow equality
    // contract is preserved. Actual SDK reads still pay full raw CAS operands.
    const entryCount=settlementApply(selectionSetSize,this.#entries,[]);chargeOriginalApplicationSelectionDriverWork(action,{operation:'owned-row-final-publication',entries:entryCount},entryCount+1);
    r.check(entry,true);
    // Every #row producer now owns its immutable tree before any SDK escape.
    // After the last executable validator, check only captured/private facts;
    // no portal, meter, dynamic collection method, or caller code can run
    // between this fence and publication. A genuine reentrant stop still wins.
    if(settlementApply(selectionSetSize,this.#entries,[])!==entryCount)fail('BNS_SYNC_SELECTION_INVALID');
    let unexpectedEntry=false;settlementApply(selectionSetForEach,this.#entries,[active=>{if(active!==entry&&active.kind!=='view')unexpectedEntry=true;}]);
    if(unexpectedEntry||!settlementApply(selectionSetHas,this.#entries,[entry])||r.invalid||r.released||r.releasing||this.#selection!==r||!this.#selectionHeld||!this.#busy||this.#serial!==r.serial||this.#blocked||this.#uncertain||this.#suspended||this.#contextService&&!this.#contextSettled||this.#row!==r.sourceRow||r.before!==snapshot||selectionNow()>=r.deadline)fail('BNS_SYNC_SELECTION_INVALID');
    this.#row=snapshot;r.before=snapshot;r.immutableRow=snapshot;r.rowSnapshotInstalled=true;return true;
   },
   check:()=>r.check(entry),facts:()=>r.check(entry,true),
   read:async()=>{r.check(entry);chargeOriginalApplicationSelectionDriverWork(action,ROW,1);const raw=await settlementApply(this.#localGet,this.#local,[ROW]);chargeOriginalApplicationSelectionDriverWork(action,raw,0);r.check(entry);const actual=raw[ROW]===undefined?null:clone(checked(raw[ROW]));if(!this.#selectionEqual(actual,r.before)){this.#invalidateSelectionReview(r);fail('BNS_SYNC_STATE_CHANGED');}return true;},
   marker:()=>{r.check(entry);if(r.phase==='sdk')fail('BNS_SYNC_SELECTION_INVALID');r.phase='marker';},
   sdk:()=>{r.check(entry);if(r.phase!=='marker')fail('BNS_SYNC_SELECTION_INVALID');r.phase='sdk';},
   invalidate:()=>this.#invalidateSelectionReview(r),
   retire:()=>{requireOriginalApplicationSelectionDriverSettlement(action);this.#settledEntry(entry);this.#invalidateSelectionReview(r);portal.retire(action);return true;}
  });selectionActionSessions.set(session,{coordinator,lifecycle:this,owner});return session;
 }
 applicationSelectionOwner(){if(!this.applicationSelectionAvailable())fail('BNS_SYNC_TASK_PENDING');const {owner,portal}=createOriginalApplicationSelectionForLifecycle(this.#store,this.#core,this.#local);selectionOwners.set(owner,{lifecycle:this,begin:coordinator=>this.#beginSelectionAction(coordinator,owner,portal)});return owner;}
 attachPreferences(){return this.#entry('attach',()=>this.#attachPreferences());}
 attachPromptService(service){return this.#entry('attach',()=>this.#attachPromptService(service));}
 attachContextService(service){return this.#entry('attach',()=>this.#attachContextService(service));}
 snapshot(){return this.#entry('view',async()=>this.#selectionHeld?this.#view():this.#snapshot());}
 reconcile(){return this.#entry('reconcile',()=>this.#reconcile());}
 resumeAfterSuspend(){return this.#entry('resume',()=>this.#resumeAfterSuspend());}
 handle(request,sender){
  try{trusted(request,sender,this.#api);}catch(error){return new OriginalSettlementPromise((_,reject)=>reject(error));}
  const kind=request.type==='PAIA_SYNC_STATUS'?'view':['PAIA_SYNC_PAUSE','PAIA_SYNC_DISCONNECT'].includes(request.type)?'stop':'handle';
  return this.#entry(kind,()=>this.#handle(request,sender));
 }
 async #snapshot(){
  // Status can withdraw a settled observation, never enroll, repair a receipt,
  // or turn an unknown SDK outcome into a successful settlement.
  if(this.#contextSettled&&!this.#busy&&!this.#suspended&&!this.#uncertain){
   try{await readOriginalContextEnrollmentObservation(this.#contextJournal,this.#contextService);}
   catch(error){this.#contextSettled=false;this.#contextFailure=safeError(error);}
  }
  return this.#view();
 }
 async #reconcile(){
  if(this.#busy)fail('BNS_SYNC_BUSY');if(this.#suspended)fail('BNS_SYNC_PAUSED');this.#row=await this.#read();
  if(!this.#row)return this.#view();
  if(this.#row.enrollmentSettlement?.phase==='pending'){this.#uncertain=true;this.#blocked=true;this.#contextFailure='BNS_SYNC_OUTCOME_UNKNOWN';return this.#view();}
  if(this.#row.bindingId!==this.#bindingId||this.#row.generation!==this.#generation||!this.#hostCurrent()){
   this.#blocked=true;this.#invalidate();if(this.#row.mode!=='disconnected'&&this.#row.mode!=='account-changed')await this.#save(row=>({...row,mode:'account-changed',error:'BNS_PROVIDER_BINDING_CHANGED'}));return this.#view();
  }
  // Startup only reconciles original local receipts. It never repeats an IO
  // whose completion is unknown, or silently resumes an explicit user pause.
  if(this.#row.task?.kind==='publication'&&this.#row.task.phase!=='confirmed'){
   const state=await this.#journal.state(this.#row.task.id);if(state?.state==='confirmed')await this.#save(row=>({...row,task:{...row.task,phase:'confirmed'},error:null}));
  }
  if(this.#row.task?.kind==='checkpoint'&&this.#row.task.phase!=='confirmed'){
   const owner=this.#checkpointOwner();try{const state=await owner.status();if(state.taskId!==this.#row.task.id||!equal(state.ref,this.#row.task.reference))fail('BNS_SYNC_STATE_CHANGED');if(state.state==='confirmed')await this.#save(row=>({...row,task:{...row.task,phase:'confirmed'},error:null}));}finally{owner.close();}
  }
  return this.#view();
 }
 suspend(){
  if(this.#suspended)return;
  // Every suspension ingress shares the same original stop-settlement rule;
  // no caller can retire an already accepted durable stop by choosing a
  // different invalidation path. Admission remains closed by the reservation.
  if(this.#selection&&[...this.#entries].some(entry=>entry.kind==='stop')){this.#selection.suspendPending=true;this.#invalidate();return;}
  this.#suspended=true;this.#invalidate();if(owners.get(this.#local)===this)owners.delete(this.#local);
 }
 async #resumeAfterSuspend(){if(this.#selectionHeld)return this.snapshot();if(!this.#suspended)return this.snapshot();if(owners.has(this.#api.storage.local))fail('BNS_SYNC_OWNER_BUSY');this.#suspended=false;owners.set(this.#api.storage.local,this);return this.reconcile();}
 async #stop(mode){
  const check=()=>{if(!this.#stopAvailable())fail('BNS_SYNC_OUTCOME_UNKNOWN');if(this.#api.storage.local!==this.#local||this.#store.local!==this.#local||this.#local.get!==this.#localGet||this.#local.set!==this.#localSet)fail('BNS_SYNC_STATE_CHANGED');};
  const pendingStop=this.#uncertain?{check,dispatched:check,confirmed:check}:null;if(pendingStop)check();
  this.#blocked=true;this.#invalidate();await this.#save(row=>({...this.#initial(row),mode,error:null}),null,pendingStop,true);return this.#view();
 }
 #initial(row){return row??{version:1,bindingId:this.#bindingId,generation:this.#generation,task:null};}
 async #resume(){
  if(this.#busy)fail('BNS_SYNC_BUSY');if(this.#uncertain)fail('BNS_SYNC_OUTCOME_UNKNOWN');if(this.#suspended||!this.#hostCurrent())fail('BNS_PROVIDER_BINDING_CHANGED');
  if(this.#row?.bindingId!==undefined&&this.#row.bindingId!==this.#bindingId)fail('BNS_SYNC_ACCOUNT_CHANGED');
  // Disconnect requires a new independently qualified source binding generation.
  // Resume is not a local credential cache or an implied account authorization.
  if(this.#row?.mode==='disconnected'&&this.#row.generation===this.#generation)fail('BNS_SYNC_REAUTHORIZATION_REQUIRED');
  // Public Resume has no private nested-invocation binding. Temporal overlap
  // with another repository window must never borrow its ticket.
  if(currentOriginalRecoveryWork(this.#store.repository))fail('BNS_GROUP_RESOURCE_LIMIT');
  this.#busy=true;const serial=this.#serial;
  const current=()=>{if(serial!==this.#serial||this.#suspended||!this.#hostCurrent())fail('BNS_RECOVERY_INTERRUPTED');};
  try{
   await this.#enrollPreferences();current();
   await this.#enrollPrompt();current();
   this.#contextSettled=false;this.#contextFailure=null;
   await this.#enrollContext();current();
   if(this.#contextService)await this.#settleEnrollment(current);else await this.#save(row=>{current();return {...this.#initial(row),generation:this.#generation,mode:'active',error:null};});current();this.#blocked=false;return Object.freeze({...this.#view(),busy:false});
  }finally{this.#busy=false;}
 }
 async #settleEnrollment(current){
  const repository=this.#store.repository,database=repository.db;
  let retired=false,dispatched=false,saved=false,savedRow=null,pendingObservation=null,timer;
  const work=createOriginalRecoveryWork(repository,{isCurrent:()=>!retired&&repository.db===database});
  const envelope=()=>{
   const active=currentOriginalRecoveryWork(repository);
   if(retired||repository.db!==database||(active!==null&&active!==work))fail('BNS_GROUP_RESOURCE_LIMIT');
   if(this.#api.storage.local!==this.#local||this.#store.local!==this.#local||this.#local.get!==this.#localGet||this.#local.set!==this.#localSet)fail('BNS_SYNC_STATE_CHANGED');
   checkOriginalRecoveryWork(repository,work);
  };
  const check=()=>{current();envelope();};
  const observe=async()=>{
   const pending=readOriginalContextEnrollmentObservation(this.#contextJournal,this.#contextService,work);pendingObservation=pending;
   try{return await pending;}finally{if(pendingObservation===pending)pendingObservation=null;}
  };
  try{
   const settle=async()=>{
    envelope();const interruption=new OriginalSettlementPromise((_,reject)=>{timer=setTimeout(()=>{retired=true;reject(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT'));},remainingOriginalRecoveryWork(repository,work));});
    const action=(async()=>{
     check();const before=this.#contextService?await observe():null;check();
     const attempt=crypto.randomUUID();
     await this.#save(row=>{check();return {...this.#initial(row),generation:this.#generation,mode:'active',error:null,...(before?{contextEnrollment:before.receipt}:{}),enrollmentSettlement:{version:1,attempt,bindingId:this.#bindingId,generation:this.#generation,startRevision:(row?.revision??0)+1,phase:'pending',confirmedRevision:null}};},work,{check:envelope,dispatched:()=>{check();dispatched=true;},confirmed:row=>{envelope();saved=true;savedRow=row;}});
     check();if(!dispatched||!saved||this.#row!==savedRow)fail('BNS_SYNC_OUTCOME_UNKNOWN');
     const after=this.#contextService?await observe():null;check();
     if(!equal(before,after))fail('BNS_CONTEXT_OWNER_CHANGED');
     await this.#save(row=>{check();if(row!==null&&(row.enrollmentSettlement?.attempt!==attempt||row.enrollmentSettlement?.phase!=='pending'))fail('BNS_SYNC_STATE_CHANGED');return {...row,enrollmentSettlement:{...row.enrollmentSettlement,phase:'confirmed',confirmedRevision:row.revision+1}};},work,{check:envelope,dispatched:()=>{check();saved=false;},confirmed:row=>{envelope();saved=true;savedRow=row;}});
     check();if(!saved||this.#row!==savedRow)fail('BNS_SYNC_OUTCOME_UNKNOWN');
     const terminal=this.#contextService?await observe():null;check();
     if(!equal(after,terminal))fail('BNS_CONTEXT_OWNER_CHANGED');
     this.#contextSettled=!!this.#contextService;
    })();
    await settlementRace([action,interruption]);
   };
   await settle();
  }catch(error){
   this.#contextSettled=false;this.#contextFailure=safeError(error);
   // A real SDK write cannot be cancelled or presumed absent. Preserve its row
   // and report unknown settlement, with no rollback, cleanup or second budget.
   // A confirmed SDK row interrupted by the user's Pause/Disconnect still lets
   // that queued stop retain its original ordering and durable mode.
   if(dispatched&&(!saved||error?.code!=='BNS_RECOVERY_INTERRUPTED')){this.#uncertain=true;this.#blocked=true;this.#invalidate();}
   throw error;
  }finally{
   retired=true;clearTimeout(timer);
   {
    if(pendingObservation&&currentOriginalRecoveryWork(repository)===work)try{await settlementRace([pendingObservation]);}catch{}
    finishOriginalRecoveryWork(repository,work);
   }
  }
 }
 #openTransport(serial){
  const current=binding=>serial===this.#serial&&!this.#blocked&&!this.#suspended&&!this.#uncertain&&this.#row?.mode==='active'&&equal(binding,this.#binding)&&this.#hostCurrent();
  this.#transport=new (this.#config.provider==='google-drive'?GoogleDriveAppDataTransport:OneDriveAppFolderTransport)(this.#core,{binding:this.#binding,request:this.#config.request,isCurrent:current});return this.#transport;
 }
 #checkpointOwner(){
  const binding={...this.#binding,provider:this.#config.provider==='google-drive'?'google-drive-appdata':'onedrive-appfolder'},serial=this.#serial;
  return new RecoverableCheckpointPublication(this.#core,{store:this.#store,binding,request:this.#config.request,isCurrent:current=>equal(current,binding)&&serial===this.#serial&&!this.#suspended&&!this.#uncertain&&this.#hostCurrent()});
 }
 async #publishCheckpoint(){
  this.#allowed();if(this.#busy)fail('BNS_SYNC_BUSY');const old=this.#row.task;
  if(old&&old.phase!=='confirmed'&&old.kind!=='checkpoint'){if(old.kind==='publication')return this.#task('publication');fail('BNS_SYNC_TASK_PENDING');}
  if(this.#promptService&&this.#promptService.syncJournal!==this.#promptJournal)fail('BNS_PROMPT_BINDING_REQUIRED');
  if(this.#contextService&&(!this.#contextSettled||this.#contextService.syncJournal!==this.#contextJournal))fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');
  this.#busy=true;const serial=this.#serial;this.#checkpoint=this.#checkpointOwner();
  const current=()=>{this.#allowed();if(serial!==this.#serial)fail('BNS_RECOVERY_INTERRUPTED');};
  try{
   const status=await this.#checkpoint.status();current();
   // Owner status is durable; a prior local response loss does not authorize
   // making another cut. Its exact task/ref are adopted, never regenerated.
   let prepared=status;
   if(status.state==='idle'||status.state==='confirmed'&&(!old||old.phase==='confirmed'))prepared=await this.#checkpoint.prepare();
   current();if(old?.kind==='checkpoint'&&old.phase!=='confirmed'&&old.reference&&(!equal(old.reference,prepared.ref)||old.id!==prepared.taskId))fail('BNS_SYNC_STATE_CHANGED');
   await this.#save(row=>({...row,task:{kind:'checkpoint',id:prepared.taskId,phase:prepared.state==='confirmed'?'confirmed':'running',reference:clone(prepared.ref)},error:null}));current();
   if(prepared.state!=='confirmed')await this.#checkpoint.publish();current();
   await this.#save(row=>({...row,task:{...row.task,phase:'confirmed'},error:null}));return Object.freeze({...this.#view(),busy:false});
  }catch(error){this.#invalidate();if(this.#row?.task?.kind==='checkpoint'&&!this.#uncertain&&!this.#suspended)await this.#save(row=>({...row,task:row.task.phase==='confirmed'?row.task:{...row.task,phase:'unknown'},error:safeError(error)}));throw error;}
  finally{this.#checkpoint?.close();this.#checkpoint=null;this.#busy=false;}
 }
 async #task(kind,continuation=false){
  this.#allowed();if(this.#busy)fail('BNS_SYNC_BUSY');
  const old=this.#row.task;if(old&&old.phase!=='confirmed'&&old.kind!==kind)fail('BNS_SYNC_TASK_PENDING');
  if(continuation&&(!old||old.kind!=='restore'))fail('BNS_RESTORE_NOT_READY');
  this.#taskFailure=null;this.#busy=true;const serial=this.#serial;let boundedRecovery=kind==='restore';
  try{
   const current=()=>{this.#allowed();if(serial!==this.#serial)fail('BNS_RECOVERY_INTERRUPTED');};
   const reserve=!old||old.phase==='confirmed'&&!continuation,id=reserve?crypto.randomUUID():old.id;
   if(kind==='publication'&&reserve)await this.#save(row=>({...row,task:{kind,id,phase:'reserved',reference:null},error:null}));
   current();const transport=this.#openTransport(serial);
   if(kind==='publication'){
    let state=await this.#journal.state(id);current();
    if(!state){state=await this.#journal.prepare({publicationId:id});current();if(state.state==='nothing_to_prepare'){await this.#save(row=>({...row,task:null,error:null}));return Object.freeze({...this.#view(),busy:false});}}
    await this.#save(row=>({...row,task:{...row.task,phase:'running'},error:null}));current();
    // Original owner reconciles every attempted object by read-back before
    // retransmission, including its durable unknown-attempt and missing guards.
    await this.#journal.run(id,transport);
   }else{
    this.#restore=new LocalSyncRecoverySession(this.#core,{store:this.#store,transport,restoreId:id,checkpoint:async(phase,reference)=>{current();if(phase==='reserved-restore-task'){this.#continuationSaving=true;try{await this.#save(row=>{current();if(!reserve||!equal(row.task,old))fail('BNS_SYNC_STATE_CHANGED');return {...row,task:{kind:'restore',id,phase:'reserved',reference:null},error:null};},currentOriginalRecoveryWork(this.#store.repository));}finally{this.#continuationSaving=false;}}else if(['selected-causal-tail','confirmed-causal-tail','selected-source-bootstrap-union','confirmed-source-bootstrap-union'].includes(phase)){this.#continuationSaving=true;try{await this.#save(row=>{current();if(row.task?.kind!=='restore'||row.task.id!==id||phase.startsWith('confirmed-')&&!equal(row.task.reference,reference))fail('BNS_SYNC_STATE_CHANGED');return {...row,task:{...row.task,reference:clone(reference),phase:phase.startsWith('selected-')?'running':'confirmed'},error:null};},currentOriginalRecoveryWork(this.#store.repository));}finally{this.#continuationSaving=false;}}current();}});
    if(reserve)await this.#restore.reserveTask();current();let ref=this.#row.task.reference;if(ref?.kind==='checkpoint-manifest')boundedRecovery=false;
    if(continuation&&ref!==null)await this.#restore.continueTask(ref);
    else{if(ref===null){ref=await this.#restore.discover();current();if(ref.kind!=='source-bootstrap-union'){boundedRecovery=false;await this.#save(row=>({...row,task:{...row.task,reference:clone(ref)},error:null}));}}
     current();if(ref.kind!=='source-bootstrap-union')await this.#save(row=>({...row,task:{...row.task,phase:'running'},error:null}));current();await this.#restore.recover(ref);}
   }
   // A confirmed original commit is retained even when pause arrived after it.
   // Updating this local task state never undoes the user's durable pause.
   if(this.#row.task.phase!=='confirmed')await this.#save(row=>({...row,task:{...row.task,phase:'confirmed'},error:null}));return Object.freeze({...this.#view(),busy:false});
  }catch(error){
   if(error?.code==='BNS_SYNC_OUTCOME_UNKNOWN')this.#uncertain=true;
   // A union or not-yet-classified recovery owns one finite ticket. Failure
   // cannot open a new chrome.local read/write budget to record its own error.
   // Keep the exact durable task for cold continuation; only the view changes.
   if(boundedRecovery)this.#taskFailure={revision:this.#row?.revision,error:safeError(error)};
   this.#invalidate();if(!boundedRecovery&&this.#row?.task&&!this.#uncertain&&!this.#suspended)await this.#save(row=>({...row,task:row.task.phase==='confirmed'?row.task:{...row.task,phase:'unknown'},error:safeError(error)}));throw error;
  }finally{this.#transport?.close();this.#transport=null;this.#restore=null;this.#busy=false;}
 }
 async #handle(request,sender){
  trusted(request,sender,this.#api);
  if(this.#selectionHeld&&request.type==='PAIA_SYNC_STATUS')return this.#view();
  if(request.type==='PAIA_SYNC_STATUS'){if(!this.#hostCurrent()&&this.#row){this.#blocked=true;this.#invalidate();await this.#save(row=>({...row,mode:row.mode==='disconnected'?'disconnected':'account-changed',error:'BNS_PROVIDER_BINDING_CHANGED'}));}return this.snapshot();}
  if(request.type==='PAIA_SYNC_PAUSE')return this.#stop('paused');
  if(request.type==='PAIA_SYNC_DISCONNECT')return this.#stop('disconnected');
  if(!(await this.#store.status()).consented)fail('CONSENT_REQUIRED');
  if(request.type==='PAIA_SYNC_RESUME')return this.#resume();
  if(request.type==='PAIA_SYNC_NOW')return this.#publishCheckpoint();
  return this.#task('restore',request.type==='PAIA_SYNC_CONTINUE');
 }
}

export function createInjectedConfiguredSyncLifecycleForTest(store,api){return createSyncLifecycle(store,api,injectedLifecycleOrigin);}
export async function createConfiguredSyncLifecycle(store,api){if(arguments.length!==2)fail('BNS_SYNC_CONFIGURATION');return createInjectedConfiguredSyncLifecycleForTest(store,api);}
export function createOrdinaryConfiguredSyncLifecycle(store,api){return createSyncLifecycle(store,api,ordinaryLifecycleOrigin);}
export async function createProductionConfiguredSyncLifecycle(store){if(arguments.length!==1)fail('BNS_SYNC_CONFIGURATION');const api=readOriginalBootstrapHost();if(!isProductionApplicationStore(store)||store.local!==readOriginalBootstrapLocal()||store.repository.factory!==readOriginalBootstrapIndexedDB())fail('BNS_SYNC_CONFIGURATION');const controller=await createSyncLifecycle(store,api,productionLifecycleOrigin);requireOriginalBootstrapHost(api);return controller;}
export function isProductionConfiguredSyncLifecycle(owner,store){const api=readOriginalBootstrapHost(),r=originalBootstrapWeakGet(lifecycleOrigins,owner);return !!r&&r.origin===productionLifecycleOrigin&&r.store===store&&r.api===api;}
