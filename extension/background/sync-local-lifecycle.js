import {assertSourceBootstrapUnionSelection} from '../core/browser-native-sync/source-bootstrap-union.js';
import {createOriginalRecoveryWork,currentOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,remainingOriginalRecoveryWork,finishOriginalRecoveryWork} from '../core/idb-repository.js';
import {ContextCardsService,readContextCards} from '../core/context-cards.js';
import {ContextMutationSyncJournal} from '../core/browser-native-sync/context-mutation-journal.js';
import {readOriginalContextEnrollmentObservation} from '../core/browser-native-sync/context-mutation-journal-owner.js';
import {OriginalApplicationGenerationSelection,readOriginalApplicationSelectionReview,holdOriginalApplicationSelectionReview,requireOriginalApplicationSelectionReviewHold,releaseOriginalApplicationSelectionReviewHold} from '../core/browser-native-sync/application-generation-selection.js';
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
const owners=new WeakMap();
const selectionOwners=new WeakMap(),selectionReservations=new WeakMap();
const selectionNow=performance.now.bind(performance);
// These fixed exports inspect original private instances only. They never
// register caller callbacks, accept DTO authority, or grant a global hold.
export function isOriginalSyncSelectionOwner(owner){return selectionOwners.has(owner);}
export function requireOriginalSyncSelectionReservation(token,owner){const r=selectionReservations.get(token);if(!r||r.owner!==owner)fail('BNS_SYNC_SELECTION_INVALID');r.check();return true;}
export function markOriginalSyncSelectionAttempt(token,owner,phase){
 requireOriginalSyncSelectionReservation(token,owner);const r=selectionReservations.get(token);
 if(phase==='marker'&&r.phase!=='sdk')r.phase='marker';
 else if(phase==='sdk'&&r.phase==='marker')r.phase='sdk';
 else{r.invalid=true;fail('BNS_SYNC_SELECTION_INVALID');}
}
const originalCore=BrowserNativeSyncCore;
const OriginalSettlementPromise=Promise,originalSettlementThen=Promise.prototype.then,settlementApply=Reflect.apply;
// Observe only settlement of the original promises. A public race/finally or
// species return value cannot shorten the enrollment invocation or bless it.
const settlementRace=tasks=>new OriginalSettlementPromise((resolve,reject)=>{for(const task of tasks)try{settlementApply(originalSettlementThen,task,[resolve,reject]);}catch(error){reject(error);}});

// The fixed source host, not an RPC or stored identity record, supplies current
// authenticated binding and the existing bounded request capability. In this
// build it is absent. This consumer never acquires/persists tokens or a grant.
export async function createConfiguredSyncLifecycle(store,api){
 if(arguments.length!==2)fail('BNS_SYNC_CONFIGURATION');
 const config=readSyncLifecycleConfiguration();
 if(config===null)return Object.freeze({attachPromptService:async()=>{},attachContextService:async()=>{},snapshot:async()=>unavailable(),reconcile:async()=>unavailable(),suspend:()=>{},resumeAfterSuspend:async()=>unavailable(),handle:async(request,sender)=>{trusted(request,sender,api);if(request.type!=='PAIA_SYNC_STATUS')fail('BNS_SYNC_UNAVAILABLE');return unavailable();}});
 if(!exact(config,['provider','datasetId','deviceId','binding','request','isCurrent'])||!['google-drive','onedrive'].includes(config.provider)||!opaque(config.datasetId)||!opaque(config.deviceId)||typeof config.request!=='function'||typeof config.isCurrent!=='function'||!store?.repository||!api?.storage?.local)fail('BNS_SYNC_CONFIGURATION');
 if(owners.has(api.storage.local))fail('BNS_SYNC_OWNER_BUSY');
 const reservation={};owners.set(api.storage.local,reservation);let controller;
 try{
  const identity=clone(config.binding),core=new originalCore(store.repository,{datasetId:config.datasetId,deviceId:config.deviceId});
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
  return controller;
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
 #taskFailure=null;#store;#api;#config;#binding;#bindingId;#generation;#core;#journal;#row=null;#write=Promise.resolve();#uncertain=false;#continuationSaving=false;#busy=false;#suspended=false;#selectionHeld=false;#blocked=false;#serial=0;#transport=null;#restore=null;#checkpoint=null;#promptService=null;#promptJournal=null;#preferenceJournal=null;#contextService=null;#contextJournal=null;#contextSettled=false;#contextFailure=null;#local;#localGet;#localSet;#entries=new Set();#selection=null;#selectionIdentity;
 constructor(store,api,config,binding,bindingId,generation,core){this.#store=store;this.#api=api;this.#local=api.storage.local;this.#localGet=this.#local.get;this.#localSet=this.#local.set;
  const repository=store.repository,database=repository.db,storage=api.storage,request=config.request,isCurrent=config.isCurrent,provider=config.provider,datasetId=config.datasetId,deviceId=config.deviceId;
  this.#selectionIdentity=()=>owners.get(this.#local)===this&&store.repository===repository&&repository.db===database&&core.repository===repository&&core.datasetId===datasetId&&core.deviceId===deviceId&&api.storage===storage&&storage.local===this.#local&&store.local===this.#local&&this.#local.get===this.#localGet&&this.#local.set===this.#localSet&&config.request===request&&config.isCurrent===isCurrent&&config.provider===provider&&config.datasetId===datasetId&&config.deviceId===deviceId&&equal(config.binding,this.#binding)&&this.#hostCurrent();this.#config=config;this.#binding=binding;this.#bindingId=bindingId;this.#generation=generation;this.#core=core;this.#journal=new PreparedPublicationJournal(core,{checkpoint:()=>this.#allowed()});}
 #hostCurrent(){try{return this.#config.isCurrent(this.#binding)===true;}catch{return false;}}
 #allowed(){if(this.#suspended||this.#blocked||this.#uncertain||!this.#row||this.#row.mode!=='active'||this.#row.bindingId!==this.#bindingId||this.#row.generation!==this.#generation||!this.#hostCurrent())fail('BNS_SYNC_PAUSED');if(this.#contextService&&!this.#contextSettled)fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');}
 #invalidate(){if(this.#selection)this.#selection.invalid=true;if(this.#continuationSaving)this.#uncertain=true;++this.#serial;this.#transport?.close();this.#transport=null;this.#restore?.pause();this.#checkpoint?.pause();}
 async #read(work=null,settlement=null){
  if(settlement)settlement.check();if(work)chargeOriginalRecoveryWork(this.#store.repository,work,bytes(ROW).length,1);
  const value=(await (settlement?settlementApply(this.#localGet,this.#local,[ROW]):this.#api.storage.local.get(ROW)))?.[ROW];
  if(settlement)settlement.check();if(work)chargeOriginalRecoveryWork(this.#store.repository,work,bytes(value??null).length,0);return value===undefined?null:checked(clone(value));
 }
 async #save(update,work=null,settlement=null,allowUncertainStop=false){
  if(this.#uncertain&&!allowUncertainStop||this.#suspended)fail('BNS_SYNC_OUTCOME_UNKNOWN');
  const write=async()=>{
   if(this.#uncertain&&!allowUncertainStop||this.#suspended)fail('BNS_SYNC_OUTCOME_UNKNOWN');const before=this.#row,current=await this.#read(work,settlement);if(!equal(current,before)){this.#uncertain=true;this.#invalidate();fail('BNS_SYNC_STATE_CHANGED');}
   const next=checked({...update(clone(before)),revision:(before?.revision??0)+1});
   // A rejected storage acknowledgement is not proof of rollback. Read the
   // exact durable row once; do not repeat the write or perform any transfer.
   let writeError=null;try{if(work)chargeOriginalRecoveryWork(this.#store.repository,work,bytes({[ROW]:next}).length,1);if(settlement){settlement.check();settlement.dispatched();await settlementApply(this.#localSet,this.#local,[{[ROW]:next}]);settlement.check();}else await this.#api.storage.local.set({[ROW]:next});if(work)checkOriginalRecoveryWork(this.#store.repository,work);}catch(error){writeError=error;}
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
  this.#contextService=service;this.#contextJournal=new ContextMutationSyncJournal(this.#core,{store:this.#store});
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
  if(this.#selectionHeld&&!['view','stop','release','release-read'].includes(kind))return new OriginalSettlementPromise((_,reject)=>reject(new ArchiveError('BNS_SYNC_PAUSED')));
  const entry={kind};this.#entries.add(entry);let task;
  try{task=body(entry);}catch(error){this.#entries.delete(entry);return new OriginalSettlementPromise((_,reject)=>reject(error));}
  return new OriginalSettlementPromise((resolve,reject)=>{settlementApply(originalSettlementThen,task,[value=>{this.#entries.delete(entry);resolve(value);},error=>{this.#entries.delete(entry);reject(error);}]);});
 }
 applicationSelectionAvailable(){return !this.#entries.size&&!this.#busy&&!this.#blocked&&!this.#uncertain&&!this.#suspended&&!this.#selectionHeld&&this.#selectionIdentity()&&(!this.#row||this.#row.bindingId===this.#bindingId&&this.#row.generation===this.#generation&&!['disconnected','account-changed'].includes(this.#row.mode))&&(!this.#row?.task||this.#row.task.phase==='confirmed');}
 reserveApplicationSelection(owner){
  if(arguments.length!==1||selectionOwners.get(owner)!==this)fail('BNS_SYNC_SELECTION_INVALID');
  // Read-only preparation may inspect an unenrolled Context cut. Reserving
  // that original review still requires the separately settled Context owner.
  if(!this.applicationSelectionAvailable()||this.#contextService&&!this.#contextSettled)fail('BNS_SYNC_TASK_PENDING');
  const review=readOriginalApplicationSelectionReview(owner,this.#store,this.#core,this.#local),before=clone(this.#row),reviewHold=holdOriginalApplicationSelectionReview(owner,this.#store,this.#core,this.#local);
  this.#invalidate();this.#busy=true;this.#selectionHeld=true;
  const r={owner,reviewHold,operationId:review.operationId,serial:this.#serial,before,deadline:selectionNow()+30000,phase:'reserved',invalid:false,released:false,releasing:false};
  r.check=(entry=null)=>{
   try{
    if(r.invalid||r.released||r.releasing&&!entry||this.#selection!==r||!this.#selectionHeld||!this.#busy||this.#serial!==r.serial||this.#blocked||this.#uncertain||this.#suspended||this.#contextService&&!this.#contextSettled||selectionNow()>=r.deadline||!this.#selectionIdentity()||!equal(this.#row,r.before)||[...this.#entries].some(active=>active!==entry&&active.kind!=='view')||entry&&!this.#entries.has(entry))fail('BNS_SYNC_SELECTION_INVALID');
    if(readOriginalApplicationSelectionReview(owner,this.#store,this.#core,this.#local).operationId!==r.operationId)fail('BNS_SYNC_SELECTION_INVALID');requireOriginalApplicationSelectionReviewHold(reviewHold,owner);
   }catch(error){r.invalid=true;throw error;}
  };
  const token=Object.freeze(Object.create(null));selectionReservations.set(token,r);this.#selection=r;return token;
 }
 releaseApplicationSelection(token){
  const r=selectionReservations.get(token);
  if(arguments.length!==1||!r||this.#selection!==r||r.released||r.releasing)return new OriginalSettlementPromise((_,reject)=>reject(new ArchiveError('BNS_SYNC_SELECTION_INVALID')));
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
  }catch(error){r.invalid=true;r.released=true;this.suspend();return false;}
  finally{clearTimeout(timer);}
 }
 applicationSelectionOwner(){if(!this.applicationSelectionAvailable())fail('BNS_SYNC_TASK_PENDING');const owner=new OriginalApplicationGenerationSelection(this.#store,this.#core,this.#local);selectionOwners.set(owner,this);return owner;}
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
 suspend(){if(this.#suspended)return;this.#suspended=true;this.#invalidate();if(owners.get(this.#local)===this)owners.delete(this.#local);}
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
