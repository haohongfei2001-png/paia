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
import {clone,digest,equal,exact,hash,opaque} from '../core/browser-native-sync/value.js';
import {assertProtocolObjectReference} from '../core/browser-native-sync/segments.js';
import {readSyncLifecycleConfiguration} from './sync-lifecycle-configuration.js';

const ROW='paia-sync-local-lifecycle:v1';
const fail=code=>{throw new ArchiveError(code);};
const unavailable=()=>Object.freeze({version:1,state:'unavailable',reason:'provider-not-configured',productionActivation:false});
const states=new Set(['active','paused','disconnected','account-changed']);
const safeError=error=>typeof error?.code==='string'&&/^(BNS_|STORAGE_|CONTROL_|BACKUP_)[A-Z_]+$/.test(error.code)?error.code:'BNS_SYNC_OUTCOME_UNKNOWN';
export const syncLifecycleError=error=>typeof error?.code==='string'&&/^(BNS_|STORAGE_|CONTROL_|BACKUP_)[A-Z_]+$/.test(error.code)?error.code:safeErrorCode(error);
const owners=new WeakMap();
const originalCore=BrowserNativeSyncCore;

// The fixed source host, not an RPC or stored identity record, supplies current
// authenticated binding and the existing bounded request capability. In this
// build it is absent. This consumer never acquires/persists tokens or a grant.
export async function createConfiguredSyncLifecycle(store,api){
 if(arguments.length!==2)fail('BNS_SYNC_CONFIGURATION');
 const config=readSyncLifecycleConfiguration();
 if(config===null)return Object.freeze({attachPromptService:async()=>{},snapshot:async()=>unavailable(),reconcile:async()=>unavailable(),suspend:()=>{},resumeAfterSuspend:async()=>unavailable(),handle:async(request,sender)=>{trusted(request,sender,api);if(request.type!=='PAIA_SYNC_STATUS')fail('BNS_SYNC_UNAVAILABLE');return unavailable();}});
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
 if(!exact(row,['version','bindingId','generation','revision','mode','task','error'])||row.version!==1||!hash(row.bindingId)||!hash(row.generation)||!Number.isSafeInteger(row.revision)||row.revision<1||!states.has(row.mode)||row.error!==null&&(typeof row.error!=='string'||!/^(BNS_|STORAGE_|CONTROL_|BACKUP_)[A-Z_]+$/.test(row.error)))fail('BNS_SYNC_STATE_CORRUPT');
 if(row.task!==null){const task=row.task;if(!exact(task,['kind','id','phase','reference'])||!['publication','checkpoint','restore'].includes(task.kind)||!opaque(task.id)||!['reserved','running','unknown','confirmed'].includes(task.phase))fail('BNS_SYNC_STATE_CORRUPT');if(task.kind==='publication'&&task.reference!==null)fail('BNS_SYNC_STATE_CORRUPT');if(task.reference!==null){assertProtocolObjectReference(task.reference);if(task.reference.kind!=='checkpoint-manifest')fail('BNS_SYNC_STATE_CORRUPT');}}
 return row;
}

class SyncLifecycle {
 #store;#api;#config;#binding;#bindingId;#generation;#core;#journal;#row=null;#write=Promise.resolve();#uncertain=false;#busy=false;#suspended=false;#blocked=false;#serial=0;#transport=null;#restore=null;#checkpoint=null;#promptService=null;#promptJournal=null;#preferenceJournal=null;
 constructor(store,api,config,binding,bindingId,generation,core){this.#store=store;this.#api=api;this.#config=config;this.#binding=binding;this.#bindingId=bindingId;this.#generation=generation;this.#core=core;this.#journal=new PreparedPublicationJournal(core,{checkpoint:()=>this.#allowed()});}
 #hostCurrent(){try{return this.#config.isCurrent(this.#binding)===true;}catch{return false;}}
 #allowed(){if(this.#suspended||this.#blocked||this.#uncertain||!this.#row||this.#row.mode!=='active'||this.#row.bindingId!==this.#bindingId||this.#row.generation!==this.#generation||!this.#hostCurrent())fail('BNS_SYNC_PAUSED');}
 #invalidate(){++this.#serial;this.#transport?.close();this.#transport=null;this.#restore?.pause();this.#checkpoint?.pause();}
 async #read(){const value=(await this.#api.storage.local.get(ROW))?.[ROW];return value===undefined?null:checked(clone(value));}
 async #save(update){
  const action=this.#write.then(async()=>{
   if(this.#uncertain||this.#suspended)fail('BNS_SYNC_OUTCOME_UNKNOWN');const before=this.#row,current=await this.#read();if(!equal(current,before)){this.#uncertain=true;this.#invalidate();fail('BNS_SYNC_STATE_CHANGED');}
   const next=checked({...update(clone(before)),revision:(before?.revision??0)+1});
   // A rejected storage acknowledgement is not proof of rollback. Read the
   // exact durable row once; do not repeat the write or perform any transfer.
   let writeError=null;try{await this.#api.storage.local.set({[ROW]:next});}catch(error){writeError=error;}
   let observed;try{observed=await this.#read();}catch{this.#uncertain=true;this.#invalidate();fail('BNS_SYNC_OUTCOME_UNKNOWN');}
   if(!equal(observed,next)){this.#uncertain=true;this.#invalidate();fail(writeError?'BNS_SYNC_OUTCOME_UNKNOWN':'BNS_SYNC_STATE_CHANGED');}
   this.#row=next;return next;
  });this.#write=action.catch(()=>{});return action;
 }
 #view(){return Object.freeze({version:1,scope:this.#promptService?'source-working-prompt':'source-working-only',wholeArchiveComplete:false,purgeProtection:'original-journal-fail-closed',portablePreferences:this.#store.consumerPreferenceJournal===this.#preferenceJournal,needsPreferenceEnrollment:this.#store.consumerPreferenceJournal!==this.#preferenceJournal,needsPromptEnrollment:!!this.#promptService&&this.#promptService.syncJournal!==this.#promptJournal,resumeAvailable:!this.#suspended&&!this.#uncertain&&!this.#busy&&this.#hostCurrent()&&(!this.#row||this.#row.bindingId===this.#bindingId&&(this.#row.mode!=='disconnected'||this.#row.generation!==this.#generation)),unsupportedOwners:this.#promptService?['human-library','context','topic','nonportable-settings','edited-source-purge']:['human-library','prompt','context','topic','nonportable-settings','edited-source-purge'],state:this.#suspended?'suspended':this.#uncertain?'settlement-unknown':this.#row?.mode??'not-started',busy:this.#busy,task:this.#row?.task?{kind:this.#row.task.kind,phase:this.#row.task.phase}:null,error:this.#row?.error??null,productionActivation:false});}
 async attachPreferences(){
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
 async attachPromptService(service){
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
 async snapshot(){return this.#view();}
 async reconcile(){
  if(this.#busy)fail('BNS_SYNC_BUSY');if(this.#suspended)fail('BNS_SYNC_PAUSED');this.#row=await this.#read();
  if(!this.#row)return this.#view();
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
 suspend(){if(this.#suspended)return;this.#suspended=true;this.#invalidate();if(owners.get(this.#api.storage.local)===this)owners.delete(this.#api.storage.local);}
 async resumeAfterSuspend(){if(!this.#suspended)return this.snapshot();if(owners.has(this.#api.storage.local))fail('BNS_SYNC_OWNER_BUSY');this.#suspended=false;owners.set(this.#api.storage.local,this);return this.reconcile();}
 async #stop(mode){this.#blocked=true;this.#invalidate();await this.#save(row=>({...this.#initial(row),mode,error:null}));return this.#view();}
 #initial(row){return row??{version:1,bindingId:this.#bindingId,generation:this.#generation,task:null};}
 async #resume(){
  if(this.#busy)fail('BNS_SYNC_BUSY');if(this.#suspended||!this.#hostCurrent())fail('BNS_PROVIDER_BINDING_CHANGED');
  if(this.#row?.bindingId!==undefined&&this.#row.bindingId!==this.#bindingId)fail('BNS_SYNC_ACCOUNT_CHANGED');
  // Disconnect requires a new independently qualified source binding generation.
  // Resume is not a local credential cache or an implied account authorization.
  if(this.#row?.mode==='disconnected'&&this.#row.generation===this.#generation)fail('BNS_SYNC_REAUTHORIZATION_REQUIRED');
  await this.#enrollPreferences();
  await this.#enrollPrompt();
  await this.#save(row=>({...this.#initial(row),generation:this.#generation,mode:'active',error:null}));this.#blocked=false;return this.#view();
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
  this.#busy=true;const serial=this.#serial;
  try{
   const current=()=>{this.#allowed();if(serial!==this.#serial)fail('BNS_RECOVERY_INTERRUPTED');};
   if(!old||old.phase==='confirmed'&&!continuation)await this.#save(row=>({...row,task:{kind,id:crypto.randomUUID(),phase:'reserved',reference:null},error:null}));
   current();const id=this.#row.task.id,transport=this.#openTransport(serial);
   if(kind==='publication'){
    let state=await this.#journal.state(id);current();
    if(!state){state=await this.#journal.prepare({publicationId:id});current();if(state.state==='nothing_to_prepare'){await this.#save(row=>({...row,task:null,error:null}));return Object.freeze({...this.#view(),busy:false});}}
    await this.#save(row=>({...row,task:{...row.task,phase:'running'},error:null}));current();
    // Original owner reconciles every attempted object by read-back before
    // retransmission, including its durable unknown-attempt and missing guards.
    await this.#journal.run(id,transport);
   }else{
    this.#restore=new LocalSyncRecoverySession(this.#core,{store:this.#store,transport,restoreId:id,checkpoint:async()=>current()});
    let ref=this.#row.task.reference;
    if(ref===null){ref=await this.#restore.discover();current();await this.#save(row=>({...row,task:{...row.task,reference:clone(ref)},error:null}));}
    current();await this.#save(row=>({...row,task:{...row.task,phase:'running'},error:null}));current();
    await this.#restore.recover(ref);
   }
   // A confirmed original commit is retained even when pause arrived after it.
   // Updating this local task state never undoes the user's durable pause.
   await this.#save(row=>({...row,task:{...row.task,phase:'confirmed'},error:null}));return Object.freeze({...this.#view(),busy:false});
  }catch(error){
   this.#invalidate();if(this.#row?.task&&!this.#uncertain&&!this.#suspended)await this.#save(row=>({...row,task:row.task.phase==='confirmed'?row.task:{...row.task,phase:'unknown'},error:safeError(error)}));throw error;
  }finally{this.#transport?.close();this.#transport=null;this.#restore=null;this.#busy=false;}
 }
 async handle(request,sender){
  trusted(request,sender,this.#api);
  if(request.type==='PAIA_SYNC_STATUS'){if(!this.#hostCurrent()&&this.#row){this.#blocked=true;this.#invalidate();await this.#save(row=>({...row,mode:row.mode==='disconnected'?'disconnected':'account-changed',error:'BNS_PROVIDER_BINDING_CHANGED'}));}return this.snapshot();}
  if(request.type==='PAIA_SYNC_PAUSE')return this.#stop('paused');
  if(request.type==='PAIA_SYNC_DISCONNECT')return this.#stop('disconnected');
  if(!(await this.#store.status()).consented)fail('CONSENT_REQUIRED');
  if(request.type==='PAIA_SYNC_RESUME')return this.#resume();
  if(request.type==='PAIA_SYNC_NOW')return this.#publishCheckpoint();
  return this.#task('restore',request.type==='PAIA_SYNC_CONTINUE');
 }
}
