import {prepareOriginalSourcePurge,beginOriginalSourcePurge,finishOriginalSourcePurge,observeOriginalSourcePurgeTombstone,closeOriginalSourcePurge} from './browser-native-sync/source-purge-journal.js';
import {sourceAppendPlan,verifySourceAppendWrite,verifyAppendDocumentPreserved} from './browser-native-sync/source-append-plan.js';
import {initialSourceRecord,initialSourceObjects} from './source-initial.js';
import {initialSourcePlan,verifyInitialSourceWrite} from './browser-native-sync/source-bootstrap-plan.js';
import {prepareRemoval,expandRemoval,validateRemovalEdit} from './archive-removal.js';
import {queryPage} from './archive-query.js';
import {OperationAttemptLedger,validateOperationQuery} from './operation-outcome.js';
import {captureIsExcluded,clearReadingTargets,clearPurgedReaderPolicy} from './reader-state.js';
import {registerRepositoryWorkLimit,requireRepositoryTransactionScope,ArchiveRepository,recordIndex,blockIndex,chatOf,tombstoneId,sourceCount} from './idb-repository.js';
import {ADAPTER_VERSION,CONSENT_VERSION,STORAGE_KEY,ArchiveError,STATUS_CODES,ERROR_CODES} from './constants.js';
import {validateCapture,validateEnrichment,validateChanges,canonicalChat} from './validation.js';
import {identify,identifySource,hashText} from './dedupe.js';
import {unknownTime,applySourceTime} from './record-time.js';
import {syncLibrary,emptyLibrary,detachSources,validateLibraryChanges,memoryContext} from './library.js';
import {applyDocumentEdit,applyPreferenceChanges,validatePreferences} from './workspace.js';
import {AI_STYLE_KEY,readAIStyle,portableAIStyle} from './ai-organize-style-preference.js';
import {sanitizeDiagnostics,sanitizeStructure,sanitizeCaptureHealth} from './diagnostics.js';
import {purgeSourceStructureForRecords} from './source-structure-store.js';
import {assessSourcePurge,sourcePurgePreview} from './source-purge-admission.js';
import {CONTROL_PUBLICATION_RESERVATION,readControlPublicationFence,reserveControlPublication,requireControlPublicationOwner,controlPublicationEqual,controlPublicationDigest,controlPublicationRow,validateControlPublicationStamp,renewControlPublication} from './local-control-publication.js';
import {requireConsumerPublicationSettled} from './browser-native-sync/consumer-publication-state.js';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Optional original-writer budget only, never a caller-provided transaction hook.
export function snapshotWriteWorkLimit(value){
 if(value===null)return null;
 if(!value||Object.getPrototypeOf(value)!==Object.prototype)throw new ArchiveError('INVALID_REQUEST');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);
 if(keys.some(key=>!['references','bytes','ms'].includes(key)||!Object.hasOwn(descriptors[key],'value')))throw new ArchiveError('INVALID_REQUEST');
 const result=Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
 for(const [key,max] of [['references',4096],['bytes',2*1024*1024],['ms',30000]])if(Object.hasOwn(result,key)&&(!Number.isFinite(result[key])||result[key]<=0||result[key]>max||key!=='ms'&&!Number.isSafeInteger(result[key])))throw new ArchiveError('INVALID_REQUEST');
 return Object.freeze(result);
};
// Conservative, bounded equality for a rejected preference publication only.
// Unlike JSON equality, this preserves missing/undefined and exact scalar values.
const publicationEqual=(a,b)=>{
 let nodes=0,characters=0;const seenA=new Set(),seenB=new Set();
 const visit=(x,y,depth)=>{
  if(++nodes>8192||depth>16)return false;
  if(typeof x==='string'){characters+=x.length+(typeof y==='string'?y.length:0);if(characters>4194304)return false;}
  if(Object.is(x,y))return true;
  if(!x||!y||typeof x!=='object'||typeof y!=='object'||Array.isArray(x)!==Array.isArray(y))return false;
  if(![Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(x))||![Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(y))||seenA.has(x)||seenB.has(y))return false;
  seenA.add(x);seenB.add(y);
  const ax=Object.getOwnPropertyDescriptors(x),by=Object.getOwnPropertyDescriptors(y),keys=Reflect.ownKeys(ax);
  if(keys.length!==Reflect.ownKeys(by).length||keys.some(k=>typeof k!=='string'||!Object.hasOwn(by,k)||!Object.hasOwn(ax[k],'value')||!Object.hasOwn(by[k],'value')))return false;
  return keys.every(k=>visit(ax[k].value,by[k].value,depth+1));
 };
 return visit(a,b,0);
};
const error=code=>{throw new ArchiveError(code);};
const protectedConsent=(c,epoch)=>{if(c.settings.consentVersion!==CONSENT_VERSION)error('CONSENT_REQUIRED');if(!c.settings.enabled)error('PAUSED');if(epoch!==c.settings.epoch)error('STALE_CAPTURE');};
const localPublicationOwners=new WeakMap(),originalLocalControls=new WeakMap(),nativeControlObservations=new WeakMap(),originalControlIdentityFailures=new WeakMap();
const promptControlExecutions=new WeakMap(),promptActiveExecutions=new WeakMap(),promptControlObservations=new WeakMap();
// This projection is minted only by the original load/publication assignments.
// It never inspects preference, profile, diagnostic or other semantic material.
const originalControlSettings=new WeakMap(),settingKeys=['enabled','epoch','consentVersion'];
const settingsData=(value,key)=>{const d=Object.getOwnPropertyDescriptor(value??{},key);if(!d||!Object.hasOwn(d,'value'))error('CONTROL_PUBLICATION_CHANGED');return d.value;};
const settingsMethod=(value,key)=>{for(let depth=0;value&&depth<8;depth++,value=Object.getPrototypeOf(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(d){if(!Object.hasOwn(d,'value'))error('CONTROL_PUBLICATION_CHANGED');return d.value;}}error('CONTROL_PUBLICATION_CHANGED');};
function rememberOriginalControlSettings(store){
 try{
  const bound=originalLocalControls.get(store),owner=localPublicationOwners.get(store),repository=settingsData(store,'repository'),cache=settingsData(store,'controlCache'),pending=settingsData(store,'pendingControl'),control=pending||cache,settings=settingsData(control,'settings'),values=Object.fromEntries(settingKeys.map(key=>[key,settingsData(settings,key)]));
  if(!bound||bound.repository!==repository||!owner||typeof values.enabled!=='boolean'||!Number.isSafeInteger(values.epoch)||values.epoch<0||values.consentVersion!==null&&(!Number.isSafeInteger(values.consentVersion)||values.consentVersion<0))throw Error('Unknown settings');
  const restoreEpoch=(owner.fences||owner.before)?.epoch?.value??null,view=Object.freeze({settings:Object.freeze(values),restoreEpoch});originalControlSettings.set(store,{bound,owner,repository,database:repository.db,databaseId:settingsData(store,'databaseId'),cache,pending,control,settings,descriptors:Object.fromEntries(settingKeys.map(key=>[key,Object.getOwnPropertyDescriptor(settings,key)])),view,revoked:false});
 }catch{originalControlSettings.delete(store);}
 try{rememberOriginalOrganizeControls(store);}catch{originalOrganizeControlViews.delete(store);}
}
function originalControlSettingsRecord(store,expected){
 const r=originalControlSettings.get(store);try{
  if(!r||r.revoked||expected!==null&&expected!==r.view||originalLocalControls.get(store)!==r.bound||localPublicationOwners.get(store)!==r.owner||settingsData(store,'repository')!==r.repository||settingsData(r.repository,'db')!==r.database||settingsData(store,'databaseId')!==r.databaseId||settingsData(store,'loaded')!==true||settingsData(store,'local')!==r.bound.local||settingsMethod(r.bound.local,'get')!==r.bound.get||settingsMethod(r.bound.local,'set')!==r.bound.set||settingsData(store,'controlCache')!==r.cache||settingsData(store,'pendingControl')!==r.pending||settingsData(r.control,'settings')!==r.settings)throw Error('Changed original settings');
  for(const key of settingKeys){const current=Object.getOwnPropertyDescriptor(r.settings,key),before=r.descriptors[key];if(!current||!Object.hasOwn(current,'value')||!Object.is(current.value,before.value)||current.enumerable!==before.enumerable||current.configurable!==before.configurable||current.writable!==before.writable)throw Error('Changed settings');}
  return r;
 }catch{if(r)r.revoked=true;error('CONTROL_PUBLICATION_CHANGED');}
}
export function readOriginalControlSettings(store,transaction,expected=null){const r=originalControlSettingsRecord(store,expected);if(requireRepositoryTransactionScope(r.repository,transaction).database!==r.database)error('CONTROL_PUBLICATION_CHANGED');return r.view;}
export function assertOriginalControlSettingsFacts(store,expected){if(!expected)error('CONTROL_PUBLICATION_CHANGED');originalControlSettingsRecord(store,expected);return true;}


// Exact original Organize style/control projection. This is local preference
// metadata only, not an action, field grant, or a substitute Store. Unknown
// preferences are never traversed and every returned view keeps its first data
// descriptors and original publication identity until retirement.
const originalOrganizeControls=new WeakMap(),originalOrganizeControlViews=new WeakMap(),organizeStyleKeys=['version','value','revision','explicit'];
const sameControlDescriptor=(a,b)=>!!a&&!!b&&Object.hasOwn(a,'value')&&Object.hasOwn(b,'value')&&Object.is(a.value,b.value)&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&a.writable===b.writable;
function organizeControlFacts(store,view){
 const r=originalOrganizeControls.get(view);if(!r||r.store!==store)error('CONTROL_PUBLICATION_CHANGED');
 try{
  if(r.retired||originalControlSettingsRecord(store,r.settingsView)!==r.settingsRecord||!sameControlDescriptor(Object.getOwnPropertyDescriptor(r.settingsRecord.control,'preferences'),r.preferencesDescriptor))throw Error('Changed original preferences');
  const current=Object.getOwnPropertyDescriptor(r.preferences,'aiOrganizeStyle');
  if(r.styleDescriptor===undefined){if(current!==undefined)throw Error('Changed absent style');}
  else{
   if(!sameControlDescriptor(current,r.styleDescriptor)||Object.getPrototypeOf(r.style)!==r.stylePrototype||Reflect.ownKeys(r.style).length!==organizeStyleKeys.length)throw Error('Changed style identity');
   for(const key of organizeStyleKeys)if(!sameControlDescriptor(Object.getOwnPropertyDescriptor(r.style,key),r.fields[key]))throw Error('Changed style fields');
  }
  return r;
 }catch{r.retired=true;error('CONTROL_PUBLICATION_CHANGED');}
}
function rememberOriginalOrganizeControls(store){
 const settingsRecord=originalControlSettingsRecord(store,null),settingsView=settingsRecord.view,preferencesDescriptor=Object.getOwnPropertyDescriptor(settingsRecord.control,'preferences');
 if(!preferencesDescriptor||!Object.hasOwn(preferencesDescriptor,'value'))error('CONTROL_PUBLICATION_CHANGED');
 const preferences=preferencesDescriptor.value;if(!preferences||typeof preferences!=='object'||Array.isArray(preferences))error('CONTROL_PUBLICATION_CHANGED');
 const styleDescriptor=Object.getOwnPropertyDescriptor(preferences,'aiOrganizeStyle'),projected={},fields={};let style=null,stylePrototype=null;
 if(styleDescriptor!==undefined){
  if(!Object.hasOwn(styleDescriptor,'value'))error('CONTROL_PUBLICATION_CHANGED');style=styleDescriptor.value;stylePrototype=style&&Object.getPrototypeOf(style);
  if(!style||typeof style!=='object'||Array.isArray(style)||![Object.prototype,null].includes(stylePrototype)||Reflect.ownKeys(style).length!==organizeStyleKeys.length)error('CONTROL_PUBLICATION_CHANGED');
  const value={};for(const key of organizeStyleKeys){const d=Object.getOwnPropertyDescriptor(style,key);if(!d||!Object.hasOwn(d,'value')||!['string','number','boolean'].includes(typeof d.value)||typeof d.value==='number'&&!Number.isFinite(d.value))error('CONTROL_PUBLICATION_CHANGED');fields[key]=d;value[key]=d.value;}if(!portableAIStyle(value))error('CONTROL_PUBLICATION_CHANGED');projected.aiOrganizeStyle=Object.freeze(value);
 }
 const view=Object.freeze({settings:settingsView.settings,preferences:Object.freeze(projected)});
 originalOrganizeControls.set(view,{store,settingsView,settingsRecord,preferencesDescriptor,preferences,styleDescriptor,style,stylePrototype,fields,retired:false});organizeControlFacts(store,view);originalOrganizeControlViews.set(store,view);
}
export function readOriginalOrganizeControls(store,transaction,expected=null){const view=expected===null?originalOrganizeControlViews.get(store):expected,r=organizeControlFacts(store,view);if(requireRepositoryTransactionScope(r.settingsRecord.repository,transaction).database!==r.settingsRecord.database)error('CONTROL_PUBLICATION_CHANGED');return view;}
export function assertOriginalOrganizeControlsFacts(store,expected){organizeControlFacts(store,expected);return true;}

// The original Store reloads its publication owner for each run. A multi-stage
// explicit Organize operation can observe that new original owner only while
// the complete first control projection and original storage identity agree.
// This opaque continuity witness grants no content or remote-processing access.
const originalOrganizeContinuity=new WeakMap();
function organizeContinuityFacts(store,cap){
 const held=originalOrganizeContinuity.get(cap);if(!held||held.store!==store)error('CONTROL_PUBLICATION_CHANGED');
 try{
  if(held.retired||held.latest.retired||held.latest.settingsRecord.revoked)throw Error('Retired original observation');
  const currentView=originalOrganizeControlViews.get(store),current=organizeControlFacts(store,currentView),settings=current.settingsRecord,first=held.first.settingsRecord;
  if(settings.bound!==first.bound||settings.repository!==first.repository||settings.database!==first.database||settings.databaseId!==first.databaseId||settings.view.restoreEpoch!==first.view.restoreEpoch||!same(currentView,held.firstView))throw Error('Changed original control generation');
  held.latest=current;return currentView;
 }catch{held.retired=true;error('CONTROL_PUBLICATION_CHANGED');}
}
export function captureOriginalOrganizeControlContinuity(store,transaction,view){
 readOriginalOrganizeControls(store,transaction,view);const first=originalOrganizeControls.get(view),cap=Object.freeze({});
 originalOrganizeContinuity.set(cap,{store,first,firstView:view,latest:first,retired:false});organizeContinuityFacts(store,cap);return cap;
}
export function readOriginalOrganizeControlContinuity(store,transaction,cap){
 const view=organizeContinuityFacts(store,cap);readOriginalOrganizeControls(store,transaction,view);return view;
}
export function assertOriginalOrganizeControlContinuityFacts(store,cap){organizeContinuityFacts(store,cap);return true;}


// This records only an existing original rejection. It cannot qualify a read
// or turn an adapter's own error into native evidence.
export function originalControlIdentityFailure(store,reason){return originalControlIdentityFailures.has(reason)&&originalControlIdentityFailures.get(reason)===store;}
// Read-only constructor-bound observation. It grants no write, ACK or native
// cut authority; the original native owner meters and compares the result.
export function requireOriginalControlObservation(store,token){
 const p=nativeControlObservations.get(token),bound=originalLocalControls.get(store);
 if(!p||p.store!==store||!bound||p.bound!==bound)error('CONTROL_PUBLICATION_CHANGED');
 if(store.local!==bound.local||bound.local.get!==bound.get||bound.local.set!==bound.set){const reason=new ArchiveError('CONTROL_PUBLICATION_CHANGED');originalControlIdentityFailures.set(reason,store);throw reason;}
 if(localPublicationOwners.get(store)!==p.owner||store.repository.db!==p.db||store.databaseId!==p.databaseId||store.tail!==p.tail||store.controlCache!==p.control||store.pendingControl||p.owner.loadedStamp!==p.stamp)error('CONTROL_PUBLICATION_CHANGED');
 return true;
}
export async function observeOriginalControlPublication(store,token=null){
 if(token===null){const bound=originalLocalControls.get(store),owner=localPublicationOwners.get(store);if(!bound||!owner||!store.repository.db||store.pendingControl)error('CONTROL_PUBLICATION_REQUIRED');token=Object.freeze({});nativeControlObservations.set(token,{store,bound,owner,db:store.repository.db,databaseId:store.databaseId,tail:store.tail,control:store.controlCache,stamp:owner.loadedStamp});}
 requireOriginalControlObservation(store,token);const p=nativeControlObservations.get(token),row=(await p.bound.get.call(p.bound.local,STORAGE_KEY))[STORAGE_KEY];requireOriginalControlObservation(store,token);
 if(Object.hasOwn(row,'controlPublication'))validateControlPublicationStamp(row.controlPublication);
 if(!publicationEqual(row,{schemaVersion:6,databaseId:p.databaseId,...p.control,...(p.stamp?{controlPublication:p.stamp}:{})}))error('CONTROL_PUBLICATION_CHANGED');
 return {token,row,kind:p.bound.kind};
}


// Prompt observes a control row only while its exact original run callback is
// still executing. Merely enqueueing later work changes the public tail but
// cannot execute that work inside this scope. The public/native observer above
// deliberately keeps its original tail contract and cannot accept these tokens.
export function requireOriginalPromptControlObservation(store,token){
 const p=promptControlObservations.get(token),bound=originalLocalControls.get(store),execution=promptControlExecutions.get(store);
 if(!p||p.store!==store||!bound||p.bound!==bound)error('CONTROL_PUBLICATION_CHANGED');
 if(store.local!==bound.local||bound.local.get!==bound.get||bound.local.set!==bound.set||!promptDataIdentity(store,'local',bound.local)||!promptDataIdentity(bound.local,'get',bound.get)||!promptDataIdentity(bound.local,'set',bound.set)){const reason=new ArchiveError('CONTROL_PUBLICATION_CHANGED');originalControlIdentityFailures.set(reason,store);throw reason;}
 if(!execution||execution!==p.execution||!execution.active||execution.interfered||execution.owner!==p.owner||localPublicationOwners.get(store)!==p.owner||store.repository.db!==p.db||store.databaseId!==p.databaseId||store.controlCache!==p.control||store.pendingControl||p.owner.loadedStamp!==p.stamp)error('CONTROL_PUBLICATION_CHANGED');
 return true;
}
export async function observeOriginalPromptControlPublication(store,token=null){
 if(token===null){const bound=originalLocalControls.get(store),owner=localPublicationOwners.get(store),execution=promptControlExecutions.get(store);if(!bound||!owner||!execution?.active||execution.interfered||execution.owner!==owner||!store.repository.db||store.pendingControl)error('CONTROL_PUBLICATION_REQUIRED');token=Object.freeze({});promptControlObservations.set(token,{store,bound,owner,execution,db:store.repository.db,databaseId:store.databaseId,control:store.controlCache,stamp:owner.loadedStamp});}
 requireOriginalPromptControlObservation(store,token);const p=promptControlObservations.get(token),row=(await p.bound.get.call(p.bound.local,STORAGE_KEY))[STORAGE_KEY];requireOriginalPromptControlObservation(store,token);
 if(Object.hasOwn(row,'controlPublication'))validateControlPublicationStamp(row.controlPublication);
 if(!publicationEqual(row,{schemaVersion:6,databaseId:p.databaseId,...p.control,...(p.stamp?{controlPublication:p.stamp}:{})}))error('CONTROL_PUBLICATION_CHANGED');
 return {token,row,kind:p.bound.kind};
}

// Body-free evidence from the original publisher, never a caller ACK flag.
export function requireOriginalConsumerPublicationEvidence(store,reservation,kind){
 const owner=localPublicationOwners.get(store),evidence=owner?.consumerEvidence;
 if(!evidence||evidence.journal!==store.consumerPreferenceJournal||!evidence[kind]||!controlPublicationEqual(evidence.reservation,reservation))error('BNS_CONSUMER_PUBLICATION_PENDING');
}
export class IndexedArchiveStore {
 #preferencePublication=null;
 constructor(local,options={}){originalLocalControls.set(this,{local,get:local.get,set:local.set,kind:local===globalThis.chrome?.storage?.local?'chrome-sdk':'original-injected-adapter'});this.local=local;this.repository=new ArchiveRepository(local,options);originalLocalControls.get(this).repository=this.repository;this.clock=options.clock||(()=>new Date().toISOString());this.uuid=options.uuid||(()=>crypto.randomUUID());this.tail=Promise.resolve();this.loaded=false;this.volatileError=null;this.operationAttempts=new OperationAttemptLedger();this.inputWorkingJournal=options.inputWorkingJournal??null;this.sourceBootstrapJournal=options.sourceBootstrapJournal??null;this.sourcePurgeJournal=options.sourcePurgeJournal??null;this.consumerPreferenceJournal=options.consumerPreferenceJournal??null;this.localPublicationTerminal=local===globalThis.chrome?.storage?.local||options.localPublicationTerminal===true;}
 run(fn){const task=this.tail.then(async()=>{
  // Install before any prelude await. An overlapping genuine run permanently
  // supersedes this opaque execution; neither completion nor this prelude may
  // restore an older execution after a public-tail alias. Any overlap also
  // permanently disqualifies both callbacks, so an older resumed callback
  // cannot adopt the newer callback's still-active control scope.
  const execution={active:true,owner:null,interfered:false};let active=promptActiveExecutions.get(this);
  if(!active){active=new Set();promptActiveExecutions.set(this,active);}
  if(active.size){execution.interfered=true;for(const prior of active)prior.interfered=true;}
  active.add(execution);promptControlExecutions.set(this,execution);
  try{
   if(!this.loaded){await this.repository.initialize();this.loaded=true;}
   const before=await this.repository.transaction(false,readControlPublicationFence,['meta']),local=(await this.local.get(STORAGE_KEY))[STORAGE_KEY],after=await this.repository.transaction(false,readControlPublicationFence,['meta']);
   if(!controlPublicationEqual(before,after))error('CONTROL_PUBLICATION_CHANGED');if(Object.hasOwn(local,'controlPublication'))validateControlPublicationStamp(local.controlPublication);
   const owner={before,beforeDigest:await controlPublicationDigest(local),loadedStamp:local.controlPublication?structuredClone(local.controlPublication):null,nonce:crypto.randomUUID(),reservation:null,fences:null};
   localPublicationOwners.set(this,owner);execution.owner=owner;
   this.controlCache={settings:local.settings,preferences:local.preferences,diagnostics:local.diagnostics,memoryAccessPolicy:local.memoryAccessPolicy,classificationRules:local.classificationRules,filterRules:local.filterRules};this.databaseId=local.databaseId;this.pendingControl=null;if(#preferencePublication in this)this.#preferencePublication=null;this.changedSources=new Set();rememberOriginalControlSettings(this);
   return await fn();
  }finally{execution.active=false;active.delete(execution);if(!active.size)promptActiveExecutions.delete(this);if(promptControlExecutions.get(this)===execution)promptControlExecutions.delete(this);}
 });this.tail=task.catch(()=>{});return task;}
 // Explicit startup repair of an original local publication, never a replay.
 // Prepared but unobserved SDK writes remain held: a restart is not an ACK.
 recoverControlPublication(){const task=this.tail.then(async()=>{
  const bound=originalLocalControls.get(this),pending=()=>({state:'pending'});
  const original=()=>{if(!bound||this.local!==bound.local||bound.local.get!==bound.get||bound.local.set!==bound.set)error('CONTROL_PUBLICATION_CHANGED');};
  original();if(!this.loaded){await this.repository.initialize();this.loaded=true;}
  const snapshot=t=>Promise.all([readControlPublicationFence(t),t.keys('meta',null,'bns:consumer-preference-publication:pending'),t.keys('meta',null,'backup-recovery-settings')]).then(([fence,consumer,backup])=>({fence,blocked:consumer.length>0||backup.length>0}));
  original();const before=await this.repository.transaction(false,snapshot,['meta']),reservation=before.fence.reservation;
  if(!reservation)return {state:'absent'};
  if(before.blocked||this.consumerPreferenceJournal)return pending();
  const actual=(await bound.get.call(bound.local,STORAGE_KEY))[STORAGE_KEY];original();
  if(!actual||actual.schemaVersion!==6||actual.databaseId!==reservation.databaseId||before.fence.migration?.phase!=='active'||before.fence.migration.databaseId!==actual.databaseId)return pending();
  if(Object.hasOwn(actual,'controlPublication'))validateControlPublicationStamp(actual.controlPublication);
  const digest=await controlPublicationDigest(actual),fences={migration:before.fence.migration,gate:before.fence.gate,epoch:before.fence.epoch};
  const undispatched=reservation.afterDigest===null&&reservation.fenceDigest===null&&reservation.beforeDigest===digest;
  const visible=reservation.afterDigest!==null&&reservation.fenceDigest!==null&&reservation.afterDigest===digest&&reservation.fenceDigest===await controlPublicationDigest(fences)&&actual.controlPublication?.revision===reservation.revision&&actual.controlPublication?.nonce===reservation.nonce&&fences.gate?.epoch===actual.settings?.epoch&&fences.gate?.enabled===actual.settings?.enabled;
  if(!undispatched&&!visible)return pending();
  if(!controlPublicationEqual(actual,(await bound.get.call(bound.local,STORAGE_KEY))[STORAGE_KEY]))return pending();original();
  return this.repository.transaction(true,async t=>{
   original();const current=await snapshot(t);original();if(!controlPublicationEqual(before,current))return pending();
   // An undispatched owner must still pass its prepared-write CAS before SDK
   // dispatch, so removal invalidates it. Preserve the restrictive gate and
   // allocated revision, including an interrupted pause or unaccepted consent.
   await t.delete('meta',CONTROL_PUBLICATION_RESERVATION);
   return {state:undispatched?'cancelled-undispatched':'settled-visible'};
  },['meta']);
 });this.tail=task.catch(()=>{});return task;}
 async control(t){const c=structuredClone(this.pendingControl||this.controlCache),gate=await t.get('meta','gate');if(gate&&(gate.epoch!==c.settings.epoch||gate.enabled!==c.settings.enabled))c.settings.enabled=false;return c;}
 async saveControl(t,c){const owner=localPublicationOwners.get(this);if(!owner)error('CONTROL_PUBLICATION_REQUIRED');if(!owner.reservation)owner.reservation=await reserveControlPublication(t,owner.before,{nonce:owner.nonce,databaseId:this.databaseId,beforeDigest:owner.beforeDigest});else await requireControlPublicationOwner(t,owner.reservation,owner.fences);this.pendingControl=structuredClone(c);await t.put('meta',{id:'gate',epoch:c.settings.epoch,enabled:c.settings.enabled});const now=await readControlPublicationFence(t);owner.fences={migration:now.migration,gate:now.gate,epoch:now.epoch};rememberOriginalControlSettings(this);}
 async qualifyControlPublicationRead(t){const owner=localPublicationOwners.get(this),current=await readControlPublicationFence(t);if(!(#preferencePublication in this)||!owner)error('CONTROL_PUBLICATION_REQUIRED');if(current.reservation)error('CONTROL_PUBLICATION_PENDING');if(!controlPublicationEqual(current,owner.before)||current.migration?.phase!=='active'||current.migration.databaseId!==this.databaseId)error('CONTROL_PUBLICATION_CHANGED');return current;}
 async controlPublicationBinding(t){const owner=localPublicationOwners.get(this);if(!(#preferencePublication in this)||!owner?.reservation)error('CONTROL_PUBLICATION_REQUIRED');await requireControlPublicationOwner(t,owner.reservation,owner.fences);return structuredClone({reservation:owner.reservation,fences:owner.fences});}
 controlPublicationLoadedRow(){const owner=localPublicationOwners.get(this);if(!(#preferencePublication in this)||!owner)error('CONTROL_PUBLICATION_REQUIRED');return structuredClone({schemaVersion:6,databaseId:this.databaseId,...this.controlCache,...(owner.loadedStamp?{controlPublication:owner.loadedStamp}:{})});}
 async prepareConsumerPreferenceRecovery(t,journal,token){const owner=localPublicationOwners.get(this);if(!(#preferencePublication in this)||!owner||journal!==this.consumerPreferenceJournal)error('CONTROL_PUBLICATION_REQUIRED');const binding=await journal.authorizeRecovery(t,this,token);if(!controlPublicationEqual(await readControlPublicationFence(t),owner.before))error('CONTROL_PUBLICATION_CHANGED');const control=structuredClone(this.controlCache),result=applyPreferenceChanges(control.preferences,binding.patch,'initial');if(result.ok!==true)error('CONTROL_PUBLICATION_CHANGED');owner.reservation=await renewControlPublication(t,binding.reservation,binding.fences,{beforeDigest:owner.beforeDigest,nonce:owner.nonce});await journal.bindRecoveryPublication(t,this,token,owner.reservation);owner.fences=binding.fences;this.pendingControl=control;rememberOriginalControlSettings(this);}
 async confirmConsumerPreferenceRecoveryVisibility(journal,token){
  const owner=localPublicationOwners.get(this);if(!(#preferencePublication in this)||!owner||journal!==this.consumerPreferenceJournal)error('CONTROL_PUBLICATION_REQUIRED');
  const binding=await journal.authorizeVisibleRecovery(this,token),actual=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];
  if(!controlPublicationEqual(owner.before,binding.fence)||!controlPublicationEqual(actual,this.controlPublicationLoadedRow())||await controlPublicationDigest(actual)!==binding.fence.reservation.afterDigest||await controlPublicationDigest({migration:owner.before.migration,gate:owner.before.gate,epoch:owner.before.epoch})!==binding.fence.reservation.fenceDigest||!controlPublicationEqual(actual,(await this.local.get(STORAGE_KEY))[STORAGE_KEY]))error('BNS_CONSUMER_PUBLICATION_PENDING');
  owner.consumerEvidence={journal,reservation:structuredClone(binding.fence.reservation),visible:true,terminal:false};
 }
 async #confirmPreferencePublication(intent,control){
  try{
   const owns=()=>intent?.committed&&intent===this.#preferencePublication&&control===intent.control&&control===this.pendingControl&&this.databaseId===intent.databaseId&&publicationEqual(controlPublicationRow(control,this.databaseId,localPublicationOwners.get(this).reservation),intent.expected);
   if(!owns())return false;
   const actual=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];
   if(!owns()||!publicationEqual(actual,intent.expected))return false;
   const unchanged=await this.repository.transaction(false,async t=>publicationEqual(await t.get('meta','migration'),intent.migration)&&publicationEqual(await t.get('meta','gate'),intent.gate)&&publicationEqual(await t.get('meta','recovery-restore-epoch'),intent.epoch),['meta']);
   if(!unchanged||!owns())return false;
   // Recheck the original local row after the independent database read.
   const latest=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];
   return owns()&&publicationEqual(latest,intent.expected);
  }catch{return false;}
 }
 async publish(){
  const control=this.pendingControl;if(!control)return;const journal=this.consumerPreferenceJournal;
  const owner=localPublicationOwners.get(this);if(!owner?.reservation)error('CONTROL_PUBLICATION_REQUIRED');
  if(owner.dispatched)error('CONTROL_PUBLICATION_ATTEMPT_USED');
  await this.repository.transaction(false,t=>requireControlPublicationOwner(t,owner.reservation,owner.fences),['meta']);
  const payload=structuredClone(controlPublicationRow(control,this.databaseId,owner.reservation)),afterDigest=await controlPublicationDigest(payload),fenceDigest=await controlPublicationDigest(owner.fences);
  if(control!==this.pendingControl||!publicationEqual(payload,controlPublicationRow(this.pendingControl,this.databaseId,owner.reservation)))error('CONTROL_PUBLICATION_CHANGED');
  const publication=journal?await journal.preparePublication(this):undefined;
  if(journal!==this.consumerPreferenceJournal)error('CONTROL_PUBLICATION_CHANGED');
  const prepared={...owner.reservation,afterDigest,fenceDigest};
  await this.repository.transaction(true,async t=>{await requireControlPublicationOwner(t,owner.reservation,owner.fences);if(journal)await journal.requirePreparedPublication(t,this,publication);await t.put('meta',prepared);},['meta']);owner.reservation=prepared;
  if(control!==this.pendingControl||!publicationEqual(payload,controlPublicationRow(this.pendingControl,this.databaseId,owner.reservation)))error('CONTROL_PUBLICATION_CHANGED');
  if(journal!==this.consumerPreferenceJournal)error('CONTROL_PUBLICATION_CHANGED');
  if(owner.dispatched)error('CONTROL_PUBLICATION_ATTEMPT_USED');owner.dispatched=true;
  try{await this.local.set({[STORAGE_KEY]:payload});}
  catch(e){if(!(#preferencePublication in this)||this.consumerPreferenceJournal&&!this.localPublicationTerminal||!await this.#confirmPreferencePublication(this.#preferencePublication,control)){
   // Only the original Chrome SDK's completed RPC, or an explicitly qualified
   // injected adapter with that same terminal contract, supplies this evidence.
   // A timeout, detached call, wrapper rejection or worker restart cannot.
   if(this.localPublicationTerminal)try{owner.consumerEvidence={journal,reservation:structuredClone(owner.reservation),terminal:true,visible:false};await this.repository.transaction(true,async t=>{await requireControlPublicationOwner(t,owner.reservation,owner.fences);if(this.consumerPreferenceJournal&&await this.consumerPreferenceJournal.markTerminal(t,this,owner.reservation,publication))return;await requireConsumerPublicationSettled(t);await t.delete('meta',CONTROL_PUBLICATION_RESERVATION);},['meta']);}catch{/* Keep foreign/changed or portable-pending state and the original error. */}
   throw e;
  }}
  finally{if(#preferencePublication in this)this.#preferencePublication=null;}
  if(journal!==this.consumerPreferenceJournal)error('CONTROL_PUBLICATION_CHANGED');
  if(this.consumerPreferenceJournal&&this.localPublicationTerminal){owner.consumerEvidence={journal,reservation:structuredClone(owner.reservation),terminal:true,visible:false};await this.repository.transaction(true,async t=>{await requireControlPublicationOwner(t,owner.reservation,owner.fences);await this.consumerPreferenceJournal.markTerminal(t,this,owner.reservation,publication);},['meta']);}
  if(this.consumerPreferenceJournal){const actual=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];if(control!==this.pendingControl||!publicationEqual(actual,payload)||!publicationEqual(payload,controlPublicationRow(this.pendingControl,this.databaseId,owner.reservation)))error('BNS_CONSUMER_PUBLICATION_PENDING');owner.consumerEvidence={journal,reservation:structuredClone(owner.reservation),visible:true,terminal:this.localPublicationTerminal};}
  // An acknowledged write releases only its exact reservation. Lost-worker or
  // failed/unqualified outcomes retain it; neither consent nor a control body is
  // replayed to make an unknown outcome appear successful.
  await this.repository.transaction(true,async t=>{await requireControlPublicationOwner(t,owner.reservation,owner.fences);if(this.consumerPreferenceJournal)await this.consumerPreferenceJournal.settle(t,this,owner.reservation,publication);else await requireConsumerPublicationSettled(t);await t.delete('meta',CONTROL_PUBLICATION_RESERVATION);},['meta']);
  owner.loadedStamp=structuredClone(payload.controlPublication);this.controlCache=control;this.pendingControl=null;rememberOriginalControlSettings(this);
 }
 write(fn,onCommitted=null,prepare=null,workLimit=null){const budget=snapshotWriteWorkLimit(workLimit);return this.run(async()=>{try{const prepared=prepare?await prepare():null,result=await this.repository.transaction(true,async t=>{if(budget)registerRepositoryWorkLimit(this.repository,t,budget);try{await requireConsumerPublicationSettled(t);}catch(e){if(e.code==='BNS_CONSUMER_PUBLICATION_PENDING')error(e.code);throw e;}return fn(t,prepared);});onCommitted?.(result);this.volatileError=null;await this.publish();return result;}catch(e){if(#preferencePublication in this)this.#preferencePublication=null;this.volatileError={code:e.code||'STORAGE_FAILED',at:this.clock()};throw e;}});}
 status(){return this.run(()=>this.repository.transaction(false,async t=>{const {settings:s}=await this.control(t);return {enabled:s.enabled===true&&s.consentVersion===CONSENT_VERSION,consented:s.consentVersion===CONSENT_VERSION,epoch:s.epoch,adapterVersion:ADAPTER_VERSION};}));}
 consent(accepted){if(accepted!==true)return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.write(async t=>{const c=await this.control(t);c.settings={consentVersion:CONSENT_VERSION,consentAt:this.clock(),enabled:true,epoch:c.settings.epoch+1};c.diagnostics.status='WAITING_CHAT';c.diagnostics.structure=null;c.diagnostics.structureAt=null;await this.saveControl(t,c);return {enabled:true};});}
 setEnabled(enabled){return this.write(async t=>{const c=await this.control(t);if(c.settings.consentVersion!==CONSENT_VERSION)error('CONSENT_REQUIRED');if(typeof enabled!=='boolean')error('INVALID_REQUEST');c.settings.enabled=enabled;c.settings.epoch++;c.diagnostics.status=enabled?'WAITING_CHAT':'PAUSED';c.diagnostics.structure=null;c.diagnostics.structureAt=null;await this.saveControl(t,c);return {enabled};});}
 async recordsFor(t,chat,messageId,key,identity,proofs=[]){
  let ix=await t.all('recordIndex','bySource',key);
  // Legacy records without sourceKey are located by conversation metadata only.
  const legacy=await t.all('recordIndex','byLegacyChat','chatgpt:'+chat.id);ix.sort((a,b)=>a.sequence-b.sequence);
  const out=[];for(const row of [...ix,...legacy]){
   const r=(await t.get('records',row.id)).value,saved=canonicalChat(r.chatUrl);
   if(r.platform!=='chatgpt'||r.chatId&&r.chatId!==chat.id||r.chatUrl&&saved?.id!==chat.id||r.sourceMessageId&&r.sourceMessageId!==messageId||r.sourceKey&&r.sourceKey!==key)continue;
   let exact=r.sourceKey===key||(r.chatId===chat.id||saved?.id===chat.id)&&r.sourceMessageId===messageId;
   if(!exact&&(identity&&r.dedupeKey===identity.dedupeKey||proofs.some(p=>p.id===r.id&&p.dedupeKey===r.dedupeKey)))exact=true;
   if(exact){r.chatId??=chat.id;r.sourceMessageId??=messageId;r.sourceKey??=key;out.push({r,index:row});}
  }return out;
 }
 async saveRecord(t,r,index){this.changedSources.add(r.sourceKey||'legacy:'+r.id);await t.put('records',{id:r.id,value:r});await t.put('recordIndex',recordIndex(r,index.sequence));
  for(const ix of await t.all('blockIndex','byRecord',r.id)){const b=(await t.get('blocks',ix.id)).value;if(!index.sourceKey&&r.sourceKey)await t.delete('sourceCounts',JSON.stringify([b.documentId,'legacy:'+r.id]));if(b.sourceRecordId===r.id)await t.put('blockIndex',blockIndex(b,ix.sequence,[r]));}
 }
 async defaultBlock(t,r,sequence,options={}){
  if(await t.get('blocks','block:'+r.id))return;
  let row=(await t.all('documents','byChat',chatOf(r)))[0];
  const initial=initialSourceObjects(r);let doc=initial.document,b=initial.block;
  if(row)b.documentId=row.id;else{doc={...doc,titleRevision:0};delete doc.sourceRecordIds;row={id:doc.id,chatKey:chatOf(r),sequence:sequence.documents++,displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc};await t.put('documents',row);const ld={...doc};delete ld.titleRevision;await t.put('libraryDocuments',{id:doc.id,value:ld});}
  if(options.branch&&options.branch!=='current'){b.excluded=true;b.branchStatus=options.branch;b.status='import_branch_review';}b.revision=0;b.provenanceSignature=JSON.stringify(b.provenance);if(this.prepareInput)await this.prepareInput(t,b,r);await t.put('blocks',{id:b.id,value:b});await t.put('blockIndex',blockIndex(b,sequence.blocks++,[r]));return row.id;
 }
 // Complete validated initial closure only. No fallback creation or post-write repair.
 async applyInitialSource(t,capability){
  const e=initialSourcePlan(capability),r=e.source,b=e.input,c=await this.control(t);protectedConsent(c,c.settings.epoch);
  if(await t.get('records',r.id)||await t.get('blocks',b.id)||await t.get('documents',b.documentId)||await t.count('recordIndex','bySource',r.sourceKey)||await t.count('recordIndex','byDedupe',r.dedupeKey)||await t.get('libraryDocuments',b.documentId)||await t.get('times',r.sourceKey)||await t.count('documents','byChat',chatOf(r))||await t.get('tombstones','source:'+r.sourceKey)||await t.get('tombstones','snapshot:'+r.dedupeKey)||await t.get('inputRemovals',r.sourceKey)||await captureIsExcluded(t,r.chatId))error('BNS_SOURCE_BOOTSTRAP_UNAVAILABLE');
  if(typeof this.applyInitialBaseline!=='function'||typeof this.initialFilter!=='function')error('BNS_SOURCE_BOOTSTRAP_UNSUPPORTED');
  const sequence=await t.get('meta','sequence');await this.saveRecord(t,r,{sequence:sequence.records++});
  if(e.timeEvidence.value!==null)await t.put('times',e.timeEvidence);
  const doc=e.inputDocument.source;await t.put('documents',{id:doc.id,chatKey:chatOf(r),sequence:sequence.documents++,displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc});await t.put('libraryDocuments',{id:doc.id,value:e.inputDocument.working});
  await t.put('blocks',{id:b.id,value:b});await t.put('blockIndex',blockIndex(b,sequence.blocks++,[r]));
  const state=await this.applyInitialBaseline(t,capability);await t.put('filterInputs',this.initialFilter(b,state));
  await this.refreshDoc(t,doc.id);await t.put('meta',sequence);await verifyInitialSourceWrite(t,capability);return {sourceId:r.id,inputId:b.id,documentId:b.documentId};
 }
 async applySourceAppend(t,capability){
  const e=sourceAppendPlan(capability),r=e.source,b=e.input,c=await this.control(t);protectedConsent(c,c.settings.epoch);
  if(await t.count('documents','byChat',chatOf(r))!==1)error('BNS_SOURCE_APPEND_UNAVAILABLE');const docs=await t.all('documents','byChat',chatOf(r));
  if(docs.length!==1||docs[0].id!==b.documentId||!await t.get('libraryDocuments',b.documentId)||await t.get('records',r.id)||await t.get('blocks',b.id)||await t.count('recordIndex','bySource',r.sourceKey)||await t.count('recordIndex','byDedupe',r.dedupeKey)||await t.get('times',r.sourceKey)||await t.get('tombstones','source:'+r.sourceKey)||await t.get('tombstones','snapshot:'+r.dedupeKey)||await t.get('inputRemovals',r.sourceKey)||await captureIsExcluded(t,r.chatId))error('BNS_SOURCE_APPEND_UNAVAILABLE');
  if(typeof this.applyAppendBaseline!=='function'||typeof this.initialFilter!=='function')error('BNS_SOURCE_APPEND_UNSUPPORTED');
  const beforeDocument={documents:structuredClone(docs[0].value),libraryDocuments:structuredClone((await t.get('libraryDocuments',b.documentId)).value)},sequence=await t.get('meta','sequence');await this.saveRecord(t,r,{sequence:sequence.records++});if(e.timeEvidence.value!==null)await t.put('times',e.timeEvidence);
  await t.put('blocks',{id:b.id,value:b});await t.put('blockIndex',blockIndex(b,sequence.blocks++,[r]));const state=await this.applyAppendBaseline(t,capability);await t.put('filterInputs',this.initialFilter(b,state));await this.refreshDoc(t,b.documentId);await t.put('meta',sequence);await verifySourceAppendWrite(t,capability);await verifyAppendDocumentPreserved(t,b.documentId,beforeDocument);return {sourceId:r.id,inputId:b.id,documentId:b.documentId};
 }
 async trackBlock(t,b){for(const p of b.provenance){const r=await t.get('recordIndex',p.sourceRecordId);if(r)this.changedSources.add(r.sourceKey||'legacy:'+r.id);}}
 async refreshDoc(t,id){
  const row=await t.get('documents',id);if(!row)return;
  const count=await t.count('blockIndex','byDocument',id),archiveCount=row.chatKey?await t.count('recordIndex','byChat',row.chatKey):0;if(!count&&!archiveCount){for(const key of await t.keys('sourceCounts','byDocument',id))await t.delete('sourceCounts',key);await t.delete('documents',id);await t.delete('libraryDocuments',id);return;}
  const doc=row.value,ld=(await t.get('libraryDocuments',id)).value;
  for(const key of this.changedSources){const ri=key.startsWith('legacy:')?[await t.get('recordIndex',key.slice(7))].filter(Boolean):await t.all('recordIndex','bySource',key);const bx=new Map();for(const r of ri)for(const b of await t.all('blockIndex','byRecord',r.id))if(b.documentId===id)bx.set(b.id,b);const count=sourceCount(id,key,ri,[...bx.values()],doc.sourceConversationId);if(count.views.length)await t.put('sourceCounts',count);else if(await t.get('sourceCounts',count.id))await t.delete('sourceCounts',count.id);}
  const range=IDBKeyRange.bound([id,0],[id,1],false,true),first=await t.edge('blockIndex','byTime',range),last=await t.edge('blockIndex','byTime',range,'prev');
  const active=await t.count('blockIndex','byExcluded',[id,0]);
  // A detached document must not retain source metadata. Count refs via metadata.
  const remaining=await t.count('blockIndex','byAttached',id);
  for(const d of [doc,ld]){d.firstSourceSentAt=first?.sourceSentAt||null;d.lastSourceSentAt=last?.sourceSentAt||null;d.status=active?'active':'excluded';if(!remaining&&!archiveCount){d.sourceConversationId=null;d.originalConversationTitle='';}}
  for(const view of ['library','archive','excluded']){const available=view==='archive'?(row.chatKey?await t.count('recordIndex','byList',IDBKeyRange.bound([row.chatKey,0],[row.chatKey,1],false,true)):0):await t.count('blockIndex','byExcluded',[id,view==='excluded'?1:0]);if(available){const edge=await t.edge('sourceCounts',view+'Last',IDBKeyRange.bound([id,0],[id,1],false,true),'prev');row[view+'Display']=[-(Date.parse(edge?.[view+'Last'][2])||0),id];}else delete row[view+'Display'];}
  if(!remaining&&!archiveCount)delete row.chatKey;row.displayKey=[-(Date.parse(doc.lastSourceSentAt)||0),doc.id];await t.put('documents',row);await t.put('libraryDocuments',{id,value:ld});
 }
 capture(request){return this.sourceOperation(request,false);}
 enrich(request){return this.sourceOperation(request,true);}
 sourceOperation(request,enrich){if(this.sourceBootstrapJournal)return this.sourceBootstrapJournal.capture(this,request,enrich);return this.run(async()=>{
  await this.repository.transaction(false,async t=>protectedConsent(await this.control(t),request?.epoch));
  const {chat,messages}=(enrich?validateEnrichment:validateCapture)(request);
  const legacy=await this.repository.transaction(false,t=>t.all('recordIndex','byLegacyChat','chatgpt:'+chat.id));
  const prepared=[];for(const m of messages){const key=await identifySource(chat.id,m.sourceMessageId),proofs=[];for(const r of legacy)if(/^[a-f0-9]{64}$/.test(r.contentHash||'')&&r.dedupeKey===await hashText(JSON.stringify([key,r.contentHash])))proofs.push({id:r.id,dedupeKey:r.dedupeKey});prepared.push({m,key,proofs,identity:enrich?null:await identify(chat.id,m.sourceMessageId,m.originalText)});}
  const result=await this.repository.transaction(true,async t=>{
   const c=await this.control(t);protectedConsent(c,request.epoch);
   if(await captureIsExcluded(t,chat.id))return enrich?{enriched:0,excluded:true}:{added:0,duplicates:0,excluded:true,status:'PAUSED'};
   const seq=await t.get('meta','sequence'),docs=new Set(),settled=[];let added=0,enriched=0,timeChanged=false,processedSources=0,knownTimes=0,unknownTimes=0;
   for(const {m,key,identity,proofs}of prepared){
    settled.push(true);
    if(await t.get('tombstones','source:'+key))continue;
    let selected=await this.recordsFor(t,chat,m.sourceMessageId,key,identity,proofs),records=selected.map(x=>x.r);
    const known=identity?await t.count('recordIndex','byDedupe',identity.dedupeKey):0;
    if(!enrich&&!known&&!await t.get('tombstones','snapshot:'+identity.dedupeKey)){
     const now=this.clock(),prior=records.at(-1);const r=initialSourceRecord({id:this.uuid(),chat,message:m,identity,at:now,previousVersionId:prior?.id||null});
     selected.push({r,index:{sequence:seq.records++}});records.push(r);added++;
    }
    // Successful transport is not proof that a source exists yet.
    if(!records.length){settled[settled.length-1]=false;continue;}
    const prior=await t.get('times',key);const s={records,sourceTimes:prior?{[key]:prior.value}:{}};
    const changed=applySourceTime(s,key,m.sourceTime,m.pageOrder,this.clock(),records,m.domTime);timeChanged||=changed;
    // Repeated page scans must not invalidate active exports or derived builds.
    // Compare the complete evidence ledger: new/conflicting evidence still writes.
    const nextTime=s.sourceTimes[key];
    if(nextTime&&!same(prior?.value,nextTime))await t.put('times',{id:key,value:nextTime});
    let recordsChanged=false;for(const {r,index}of selected){const old=await t.get('records',r.id),sourceTimeChanged=!!old&&old.value.sourceSentAt!==r.sourceSentAt;if(!old||!same(old.value,r)){recordsChanged=true;await this.saveRecord(t,r,index);if(sourceTimeChanged&&this.afterSourceTimeChanged)await this.afterSourceTimeChanged(t,r.id);const doc=await this.defaultBlock(t,r,seq);if(doc)docs.add(doc);for(const b of await t.all('blockIndex','byRecord',r.id))docs.add(b.documentId);for(const d of await t.all('documents','byChat',chatOf(r)))docs.add(d.id);}}
    processedSources++;if(records.at(-1).sourceSentAt)knownTimes++;else unknownTimes++;
    if(enrich&&(changed||recordsChanged))enriched+=records.length;
   }
   for(const id of docs)await this.refreshDoc(t,id);await t.put('meta',seq);
   const unresolved=settled.filter(value=>!value).length,ignored=settled.length-unresolved-processedSources;
   const ingestion={schemaVersion:1,kind:enrich?'enrich':'capture',attempted:messages.length,added,duplicates:enrich?0:messages.length-added-ignored-unresolved,ignored,unresolved,knownTimes,unknownTimes};
   if(!same(c.diagnostics.ingestion,ingestion)){
    c.diagnostics.ingestion=ingestion;c.diagnostics.ingestionAt=this.clock();
    if(enrich)await this.saveControl(t,c);
   }
   if(!enrich){const now=this.clock();Object.assign(c.diagnostics,{status:'CAPTURING',lastScanAt:now,lastSuccessAt:now,adapterVersion:ADAPTER_VERSION,scanned:messages.length,added});await this.saveControl(t,c);}
   return enrich?{enriched,settled}:{added,duplicates:messages.length-added,status:'CAPTURING',timeChanged,settled};
  });await this.publish();return result;
 });}
 diagnose({code,scanned=0,structure=null,captureHealth=null}){return this.write(async t=>{if(!STATUS_CODES.has(code)||!Number.isSafeInteger(scanned)||scanned<0||scanned>1000000)error('INVALID_REQUEST');const c=await this.control(t),now=this.clock();const status=!c.settings.consentVersion?'CONSENT_REQUIRED':!c.settings.enabled?'PAUSED':code;const allowed=c.settings.consentVersion===CONSENT_VERSION&&c.settings.enabled&&!['PAUSED','CONSENT_REQUIRED','TEMPORARY_CHAT','WAITING_CHAT','ADAPTER_VERSION_MISMATCH'].includes(status);Object.assign(c.diagnostics,{status,adapterVersion:ADAPTER_VERSION,lastScanAt:now,scanned,added:0,structure:allowed?sanitizeStructure(structure):null,structureAt:allowed?now:null});if(ERROR_CODES.has(status))c.diagnostics.lastError={code,at:now};const health=allowed?sanitizeCaptureHealth(captureHealth):null;if(health){c.diagnostics.captureHealth=health;c.diagnostics.captureHealthAt=now;}else if(!allowed){delete c.diagnostics.captureHealth;delete c.diagnostics.captureHealthAt;}c.diagnostics=sanitizeDiagnostics(c.diagnostics);await this.saveControl(t,c);return {status};});}
 changeRecord(id,fn){return this.write(async t=>{const row=await t.get('records',id);if(!row)error('INVALID_REQUEST');fn(row.value);row.value.updatedAt=this.clock();await this.saveRecord(t,row.value,await t.get('recordIndex',id));for(const b of await t.all('blockIndex','byRecord',id))await this.refreshDoc(t,b.documentId);for(const d of await t.all('documents','byChat',chatOf(row.value)))await this.refreshDoc(t,d.id);return {id};});}
 update(id,changes){return this.changeRecord(id,r=>{if(r.deletedAt)error('INVALID_REQUEST');Object.assign(r,validateChanges(changes));});}
 trash(id){return this.changeRecord(id,r=>{r.deletedAt=this.clock();});}
 restore(id){return this.changeRecord(id,r=>{r.deletedAt=null;});}
 sourcePurgePreflight(id){return this.run(async()=>{
  if(typeof id!=='string'||!id.length||id.length>512)error('INVALID_REQUEST');
  const pre=await this.repository.transaction(false,t=>t.get('records',id));if(!pre)error('INVALID_REQUEST');
  const record=pre.value,key=/^[a-f0-9]{64}$/.test(record.sourceKey||'')?record.sourceKey:(record.chatId&&record.sourceMessageId?await identifySource(record.chatId,record.sourceMessageId):null);if(!key)error('SOURCE_PURGE_UNAVAILABLE');
  const recovery=await this.local.get(null);
  try{return sourcePurgePreview(id,await this.repository.transaction(false,t=>assessSourcePurge(t,{id,key,record},recovery)));}
  catch(e){if(e.code==='SOURCE_PURGE_OWNER_GATE')return {state:'owner_gate_required',gate:'B-02',targetRef:id};if(e.code==='SOURCE_PURGE_UNAVAILABLE')return {state:'unavailable',targetRef:id};throw e;}
 });}
 purge(id,permanent=false){return this.run(async()=>{
  const pre=await this.repository.transaction(false,t=>t.get('records',id));if(!pre||!permanent&&!pre.value.deletedAt)error('INVALID_REQUEST');const r=pre.value,key=/^[a-f0-9]{64}$/.test(r.sourceKey||'')?r.sourceKey:(r.chatId&&r.sourceMessageId?await identifySource(r.chatId,r.sourceMessageId):null);if(!key)error('INVALID_REQUEST');
  // Read Chrome recovery outside IDB transaction lifetime. The production
  // caller holds withRecoveryFence; store.run serializes all canonical writers.
  const rawRecovery=await this.local.get(null);
  await this.repository.transaction(false,t=>assessSourcePurge(t,{id,key,record:r},rawRecovery));
  const purgePlan=await prepareOriginalSourcePurge(this,id,key),finalRecovery=await this.local.get(null);
  const result=await this.repository.transaction(true,async t=>{
   if(purgePlan)registerRepositoryWorkLimit(this.repository,t,{});
   try{
   const current=await t.get('records',id);if(!current||!permanent&&!current.value.deletedAt)error('INVALID_REQUEST');
   await assessSourcePurge(t,{id,key,record:current.value},finalRecovery,!!purgePlan);
   await beginOriginalSourcePurge(t,this,purgePlan);
   this.changedSources.add(key);
   const indexes=await t.all('recordIndex','bySource',key);if(r.chatId&&r.sourceMessageId)for(const ix of await t.all('recordIndex','byIdentity',[chatOf(r),r.sourceMessageId]))if(!/^[a-f0-9]{64}$/.test(ix.sourceKey||'')&&!indexes.some(x=>x.id===ix.id))indexes.push(ix);if(!indexes.some(x=>x.id===id))indexes.push(await t.get('recordIndex',id));const removed=[];for(const ix of indexes)removed.push((await t.get('records',ix.id)).value);
   const docs=new Set((await t.all('documents','byChat',chatOf(r))).map(d=>d.id)),blocks=new Map();for(const r of removed)for(const b of await t.all('blockIndex','byRecord',r.id))blocks.set(b.id,{index:b,value:(await t.get('blocks',b.id)).value});
   await purgeSourceStructureForRecords(this,t,removed);
   if(this.beforeSourcePurge)await this.beforeSourcePurge(t,removed,blocks);
   await clearReadingTargets(t,new Set(blocks.keys()));
   const s={library:{blocks:[...blocks.values()].map(b=>b.value)}};detachSources(s,removed);const kept=new Map(s.library.blocks.map(b=>[b.id,b]));
   const deletedAt=this.clock(),tombstone={id:'source:'+key,sequence:Date.parse(deletedAt),value:{sourceIdentityHash:key,deletedAt,status:'permanently_ignored'}};observeOriginalSourcePurgeTombstone(t,this,purgePlan,tombstone);await t.put('tombstones',tombstone);
   for(const r of removed){await t.delete('records',r.id);await t.delete('recordIndex',r.id);await t.delete('tombstones','snapshot:'+r.dedupeKey);}await t.delete('times',key);
   for(const name of ['importEvidence','importSources'])for(const evidenceId of await t.keys(name,'bySource',key))await t.delete(name,evidenceId);
   for(const [id,old]of blocks){docs.add(old.value.documentId);const b=kept.get(id);if(!b){await t.delete('blocks',id);await t.delete('blockIndex',id);}else{b.revision++;b.recoveryPurgeRevision=b.revision;b.provenanceSignature=JSON.stringify(b.provenance);await t.put('blocks',{id,value:b});const rec=b.sourceRecordId?(await t.get('records',b.sourceRecordId))?.value:null;await t.put('blockIndex',blockIndex(b,old.index.sequence,rec?[rec]:[]));}}
   for(const id of docs)await this.refreshDoc(t,id);await clearPurgedReaderPolicy(t,new Set(blocks.keys()),key);await finishOriginalSourcePurge(t,this,purgePlan);return {id};
   }finally{closeOriginalSourcePurge(t,purgePlan);}
  });await this.publish();return result;
 });}
 prepareRemoval(request){return this.run(()=>this.repository.transaction(false,t=>prepareRemoval(this,t,request)));}
 async editDocument(request){if(request?.removeScope!==undefined)validateRemovalEdit(request);const operationId=request?.operationId;if(operationId!==undefined&&(typeof operationId!=='string'||operationId.length>128||operationId.length<8))error('INVALID_REQUEST');const digest=operationId?await hashText(JSON.stringify(request)):null;const query=operationId&&typeof request.documentId==='string'&&request.documentId.length<=512?{ownerRef:request.documentId,operationId,requestDigest:digest}:null;const attempt=query?this.operationAttempts.begin(query):null;let durable=false,prepared=null;const journal=this.inputWorkingJournal;try{
  if(journal){const replay=await this.run(()=>this.repository.transaction(false,t=>operationId?t.get('operationReceipts',operationId):null));if(replay){if(replay.digest!==digest)error('INVALID_REQUEST');if(attempt)this.operationAttempts.settle(query,attempt,true);return replay.result;}prepared=await journal.prepareEdit(this,request,digest);}
  const outcome=await this.write(async t=>{
  if(attempt)attempt.epoch=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';
  if(request?.removeScope&&(await this.control(t)).settings.consentVersion!==CONSENT_VERSION)error('CONSENT_REQUIRED');
  if(operationId){const receipt=await t.get('operationReceipts',operationId);if(receipt){if(receipt.digest!==digest)error('INVALID_REQUEST');return receipt.result;}}
  if(journal)await journal.authorize(t,prepared,request,digest);
  const canonical=request?.removeScope?await expandRemoval(this,t,request):request;if(canonical?.conflict)return canonical;
  if(!canonical||!Array.isArray(canonical.blocks)||canonical.blocks.length>1000)error('INVALID_REQUEST');const row=await t.get('documents',request.documentId);if(!row)error('INVALID_REQUEST');const ld=await t.get('libraryDocuments',row.id),blocks=[];
  for(const change of canonical.blocks){const b=await t.get('blocks',change.id);if(b)blocks.push(b.value);}
  if(this.validateInputEdit)await this.validateInputEdit(t,canonical);
  const state={conversations:[row.value],library:{documents:[ld.value],blocks}};const before=blocks.map(b=>b.excluded),priorBlocks=structuredClone(blocks),priorTitle=structuredClone(row.value);const result=applyDocumentEdit(state,canonical.removeScope?{...canonical,removeScope:undefined}:canonical,journal?journal.editTime(t):this.clock());if(!result.ok)return result;
  if(this.afterInputEdit)await this.afterInputEdit(t,priorBlocks,blocks,priorTitle,row.value,canonical);
  for(const b of blocks){await t.put('blocks',{id:b.id,value:b});const ix=await t.get('blockIndex',b.id);ix.excluded=b.excluded;ix.excludedKey=b.excluded?1:0;ix.listKey[1]=ix.excludedKey;await t.put('blockIndex',ix);}
  if(request.title!==undefined){await t.put('documents',row);await t.put('libraryDocuments',ld);}
  if(blocks.some((b,i)=>b.excluded!==before[i])){for(const b of blocks)await this.trackBlock(t,b);await this.refreshDoc(t,row.id);}if(operationId)await t.put('operationReceipts',{id:operationId,namespace:'working-input',schemaVersion:1,ownerId:row.id,createdAt:this.clock(),digest,result});if(journal)await journal.commit(t,prepared);return result;
 },result=>{durable=result?.ok===true;});if(attempt)this.operationAttempts.settle(query,attempt,durable);return outcome;}catch(error){if(attempt)this.operationAttempts.settle(query,attempt,durable);throw error;}finally{journal?.release(prepared);}}
 operationOutcome(query){query={...validateOperationQuery(query)};return this.run(()=>this.repository.transaction(false,async t=>{
  if((await this.control(t)).settings.consentVersion!==CONSENT_VERSION)error('CONSENT_REQUIRED');
  const epoch=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';
  if(epoch!==query.epoch||!await t.get('documents',query.ownerRef))return {state:'unknown'};
  const receipt=await t.get('operationReceipts',query.operationId);
  if(receipt){if(receipt.namespace==='working-input'&&receipt.schemaVersion===1&&receipt.ownerId===query.ownerRef&&receipt.digest===query.requestDigest&&receipt.result?.ok===true)return {state:'committed',result:{ok:true}};return {state:'unknown'};}
  return {state:this.operationAttempts.read(query)};
 }));}
 updateLibrary(id,changes){return this.write(async t=>{const row=await t.get('blocks',id);if(!row)error('INVALID_REQUEST');Object.assign(row.value,validateLibraryChanges(changes));row.value.editedAt=this.clock();row.value.revision++;await t.put('blocks',row);return {id};});}
 excludeLibrary(id,excluded){return this.write(async t=>{if(typeof excluded!=='boolean')error('INVALID_REQUEST');const row=await t.get('blocks',id);if(!row)error('INVALID_REQUEST');Object.assign(row.value,{excluded,status:excluded?'excluded_by_user':'active',revision:row.value.revision+1});await t.put('blocks',row);const ix=await t.get('blockIndex',id);Object.assign(ix,{excluded,excludedKey:excluded?1:0});ix.listKey[1]=ix.excludedKey;await t.put('blockIndex',ix);await this.trackBlock(t,row.value);await this.refreshDoc(t,row.value.documentId);return {id};});}
 updateDocument(id,changes){return this.write(async t=>{const row=await t.get('documents',id);if(!row)error('INVALID_REQUEST');Object.assign(row.value,validateLibraryChanges(changes,true));row.value.titleRevision++;const ld=await t.get('libraryDocuments',id);ld.value.userTitle=row.value.userTitle;await t.put('documents',row);await t.put('libraryDocuments',ld);return {id};});}
 updatePreferences(changes){const journal=this.consumerPreferenceJournal;let captured,captureError;if(journal)try{captured=structuredClone(changes);}catch(e){captureError=e;}return this.write(async(t,prepared)=>{
  // Detach before any await; the original validator/CAS applies this private copy.
  let copy,copyError;try{if(captureError)throw captureError;copy=structuredClone(journal?captured:changes);}catch(e){copyError=e;}
  const aiStyle=Object.hasOwn((copyError?changes:copy)||{},AI_STYLE_KEY);if(aiStyle&&await t.get('meta','backup-recovery-settings'))error('BACKUP_BUSY');
  if(copyError){validatePreferences(changes);error('INVALID_REQUEST');}changes=copy;
  const epochRow=await t.get('meta','recovery-restore-epoch'),epoch=aiStyle?epochRow?.value??'initial':'initial',c=await this.control(t);if(prepared)await journal.authorize(t,this,prepared);const result=applyPreferenceChanges(c.preferences,changes,epoch);
  if(result.ok&&result.changed!==false){
   await this.saveControl(t,c);
   if(prepared)await journal.commit(t,this,prepared);
   if(!aiStyle){const migration=await t.get('meta','migration'),gate=await t.get('meta','gate');
    if(#preferencePublication in this&&migration?.phase==='active'&&migration.databaseId===this.databaseId)this.#preferencePublication={committed:false,control:this.pendingControl,databaseId:this.databaseId,expected:structuredClone(controlPublicationRow(this.pendingControl,this.databaseId,localPublicationOwners.get(this).reservation)),migration,gate,epoch:epochRow};
   }
  }
  return result;
 },()=>{if(#preferencePublication in this&&this.#preferencePublication)this.#preferencePublication.committed=true;},journal&&!captureError?()=>journal.prepare(this,captured):null);}
 aiStylePreference(){return this.run(()=>this.repository.transaction(false,async t=>{if(await t.get('meta','backup-recovery-settings'))error('BACKUP_BUSY');return readAIStyle((await this.control(t)).preferences,(await t.get('meta','recovery-restore-epoch'))?.value??'initial');},['meta']));}
 resolveLegacy(id,include){return this.write(async t=>{if(typeof include!=='boolean')error('INVALID_REQUEST');const row=await t.get('records',id);if(!row||!row.value.hidden&&!row.value.deletedAt)error('INVALID_REQUEST');row.value.hidden=false;row.value.deletedAt=null;await this.saveRecord(t,row.value,await t.get('recordIndex',id));for(const ix of await t.all('blockIndex','byRecord',id)){const b=await t.get('blocks',ix.id);if(b.value.sourceRecordId!==id)continue;const prior=structuredClone(b.value);Object.assign(b.value,{excluded:!include,status:include?'active':'excluded_by_user',revision:b.value.revision+1});if(this.afterLegacyResolve)await this.afterLegacyResolve(t,prior,b.value);await t.put('blocks',b);Object.assign(ix,{excluded:!include,excludedKey:include?0:1});ix.listKey[1]=ix.excludedKey;await t.put('blockIndex',ix);await this.refreshDoc(t,b.value.documentId);}return {ok:true};});}
 memoryContext(){return Promise.resolve(memoryContext());}
 migrationStatus(){return this.repository.transaction(false,t=>t.get('meta','migration'));}
 recoverMigration(){const task=this.tail.then(async()=>{await this.repository.recoverMigration();this.loaded=false;return {ok:true};});this.tail=task.catch(()=>{});return task;}
 snapshot(){return this.run(async()=>{if(await this.repository.transaction(false,t=>t.count('records'))>1000)error('INVALID_REQUEST');const s=await this.repository.materialize();const total=s.records.filter(r=>!r.deletedAt).length;return {...s,schemaVersion:6,stats:{total,hidden:s.records.filter(r=>r.hidden&&!r.deletedAt).length,trash:s.records.filter(r=>r.deletedAt).length,bytes:0,quotaBytes:0},diagnostics:this.volatileError?{...s.diagnostics,lastError:this.volatileError}:s.diagnostics,adapterVersion:ADAPTER_VERSION};});}
 page(options={}){return this.run(()=>this.repository.transaction(false,async t=>queryPage(t,await this.control(t),options)));}
}

// Read-only source identity for optional Prompt work reuse. These descriptors
// are fixed by this declaration module, never accepted from a caller/service.
const promptQueuePrototype=IndexedArchiveStore.prototype,promptQueueParent=Object.getPrototypeOf(promptQueuePrototype);
const promptQueueMethods=['run','control','qualifyControlPublicationRead','controlPublicationLoadedRow'].map(name=>[name,Object.getOwnPropertyDescriptor(promptQueuePrototype,name)]);
const promptQueueDescriptor=(actual,expected)=>!!actual&&['value','get','set','writable','enumerable','configurable'].every(key=>actual[key]===expected[key]);
const promptDataIdentity=(object,name,value)=>{
 for(let owner=object;owner;owner=Object.getPrototypeOf(owner)){const descriptor=Object.getOwnPropertyDescriptor(owner,name);if(descriptor)return Object.hasOwn(descriptor,'value')&&descriptor.value===value;}
 return false;
};
export function originalIndexedPromptReadOwner(store){
 const bound=originalLocalControls.get(store);
 if(!bound||!promptDataIdentity(store,'local',bound.local)||!promptDataIdentity(bound.local,'get',bound.get)||!promptDataIdentity(bound.local,'set',bound.set)||Object.getPrototypeOf(promptQueuePrototype)!==promptQueueParent)return false;
 for(const [name,expected] of promptQueueMethods){
  if(!promptQueueDescriptor(Object.getOwnPropertyDescriptor(promptQueuePrototype,name),expected))return false;
  if(name==='run')continue;
  let found=false;for(let owner=store;owner;owner=Object.getPrototypeOf(owner)){const descriptor=Object.getOwnPropertyDescriptor(owner,name);if(descriptor){found=promptQueueDescriptor(descriptor,expected);break;}}
  if(!found)return false;
 }
 return true;
}
