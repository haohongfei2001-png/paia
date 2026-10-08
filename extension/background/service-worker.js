import {NextPromptCommands} from './prompt-next.js';
import {readSettingsUpdateStatus} from '../core/settings-update-status.js';
import {isAIStyleOnlyRequest} from '../core/ai-organize-style-preference.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {PromptSurfaceCommands} from './prompt-surface.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptReuseCommands} from './prompt-reuse-commands.js';
import {ArchiveOriginalQuery} from '../core/archive-original-query.js';
import {installCaptureRecovery} from './capture-recovery.js';
import {ArchiveNavigationQuery} from '../core/archive-navigation-query.js';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {RevisitService} from '../core/revisit.js';
import {ReaderStateService} from '../core/reader-state.js';
import {OnboardingService} from '../core/onboarding.js';
import {IntegrityChecker} from '../core/integrity-checker.js';
import {BackupService} from '../core/backup-service.js';
import {LegacyUsageRecords} from '../core/legacy-usage-records.js';
import {assertFeatureAvailable} from '../core/feature-availability.js';
import {BoundedOrganizerWorkflow} from '../core/organizer/bounded-workflow.js';
import {AIPresentationRunner} from '../core/organizer/ai-presentation.js';
import {LibraryRunner} from '../core/library-runner.js';
import {FilterRunner} from '../core/filter-runner.js';
import {ImportHandler} from './import-handler.js';
import {safeImportError} from '../core/import/errors.js';
import { OrganizerStore as IndexedArchiveStore } from '../core/organizer/store.js';
import {SafetyRunner} from '../core/thought-runner.js';
import { ADAPTER_VERSION, ArchiveError, safeErrorCode } from '../core/constants.js';
import { canonicalChat } from '../core/validation.js';
import {canonicalProjectChat,canonicalPlainChat} from '../core/project-route-validation.js';
import {SourceStructureStore} from '../core/source-structure-store.js';
import {subjectRef,sourceStructureSnapshot} from '../core/source-structure-model.js';
import {admitChatGPTSourceStructureBatch,CHATGPT_PROJECT_STRUCTURE_POLICY} from '../core/source-structure-admission.js';
import {ArchiveOrderPreferenceService,SourceOrderRegistry,unavailableSourceOrderProvider} from '../core/source-ordering.js';
import {unavailableAIProvider,unavailableAICredentials} from '../core/organizer/unavailable-service.js';
import {SimpleOriginalOrganizerRunner} from '../core/organizer/original-simple.js';
import {RecoveryDraftStore} from '../core/recovery-draft.js';

const store = new IndexedArchiveStore(chrome.storage.local);
const thoughtLibraryRead=new ThoughtLibraryReadModel(store);
const thoughtSectionReading=new ThoughtSectionReading(thoughtLibraryRead);
const promptReuse = new PromptReuseCommands(new PromptReuseService(store),chrome);
const promptSurface = new PromptSurfaceCommands(promptReuse,chrome);
const promptNext = new NextPromptCommands(promptReuse.service,chrome,promptSurface);
promptSurface.next=promptNext;
chrome.tabs?.onRemoved?.addListener(id=>promptNext.removeTab(id));
chrome.tabs?.onUpdated?.addListener((id,change)=>{if(change.url||change.status==='loading')promptNext.removeTab(id);});
chrome.runtime.onInstalled?.addListener(()=>{void promptNext.configure(false).catch(()=>{});});
const legacyUsage = new LegacyUsageRecords(store);
const passport = new PassportService(store);
const revisit = new RevisitService(store);
const readerState = new ReaderStateService(store);
const sourceStructure = new SourceStructureStore(store);
const archiveNavigation = new ArchiveNavigationQuery(store);
const archiveOriginal = new ArchiveOriginalQuery(store);
const archiveOrderPreference = new ArchiveOrderPreferenceService(store);
const sourceOrderRegistry = new SourceOrderRegistry([['chatgpt',unavailableSourceOrderProvider('UNVERIFIED')]]);
let recoveryDrafts=null;
const recoveryDraftStore=()=>recoveryDrafts??=new RecoveryDraftStore(chrome.storage.local);
// Recovery storage and canonical IndexedDB are separate stores. Keep admission,
// storage completion and Source purge in one worker-owned serialized boundary.
let recoveryTail=Promise.resolve();
function withRecoveryFence(work){const result=recoveryTail.then(work);recoveryTail=result.catch(()=>{});return result;}
async function saveRecoveryDraft(draft){
 if(!(await store.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
 if(draft.epoch!==await store.recoveryDraftEpoch())throw new ArchiveError('INVALID_REQUEST');
 const sourceRecordIds=await (draft.kind==='context_item'?contextCards.recoverySources(draft):store.recoveryDraftSourceIds(draft));
 return recoveryDraftStore().save({...draft,sourceRecordIds});
}
async function loadRecoveryDraft({kind,ownerId,epoch}={}){
 const current=await store.recoveryDraftEpoch();if(epoch!==current)throw new ArchiveError('INVALID_REQUEST');
 const draft=await recoveryDraftStore().load(kind,ownerId);if(!draft)return null;
 try{if((draft.epoch||'initial')!==current)throw new ArchiveError('INVALID_REQUEST');if(draft.kind==='context_item'&&await contextCards.recoveryCommitted(draft)){await recoveryDraftStore().clear(kind,ownerId,draft.token);return null;}await (draft.kind==='context_item'?contextCards.recoverySources(draft,{stored:true}):store.recoveryDraftSourceIds(draft));return draft;}
 catch(error){if(!['INVALID_REQUEST','CONTEXT_INVALIDATED'].includes(error?.code))throw error;await recoveryDraftStore().clear(kind,ownerId,draft.token);return null;}
}
// Bind recovery identity to the same read that supplied editor bodies. A
// replacement during a multi-transaction read discards that read; a later
// replacement leaves an old, correctly fenced token on the returned snapshot.
async function recoverySnapshot(read,decorate=(value,epoch)=>({...value,recoveryEpoch:epoch})){
 const epoch=await store.recoveryDraftEpoch(),value=await read();
 if(epoch!==await store.recoveryDraftEpoch())throw new ArchiveError('BACKUP_CHANGED');
 return decorate(value,epoch);
}
function recoveryDocumentPage(page,epoch){
 const tagged=value=>value?{...value,recoveryEpoch:epoch}:value;
 return {...page,recoveryEpoch:epoch,topic:tagged(page.topic),sections:page.sections?.map(tagged),items:page.items?.map(item=>item.entry?{...item,entry:tagged(item.entry)}:tagged(item))};
}

async function purgeWithRecovery(id,permanent){
 // A resident linked human/unknown draft is a B-02 dependency, not permission
 // to clear it. Admission and final revalidation happen before any cleanup.
 return permanent?store.permanentDelete(id):store.purge(id);
}
const UPDATE_STATE_KEY='paia-consumer-update:v1';
// Chrome owns installation. Keep only the version transition as local status;
// never force a worker reload while an archive page may have unsaved edits.
chrome.runtime.onUpdateAvailable?.addListener(details=>{
  if(typeof details?.version!=='string')return;
  void ready.then(()=>chrome.storage.local.set({[UPDATE_STATE_KEY]:{
    state:'available',fromVersion:chrome.runtime.getManifest().version,toVersion:details.version,at:Date.now(),
  }})).catch(()=>{});
});
chrome.runtime.onInstalled?.addListener(details=>{
  if(details?.reason!=='update')return;
  void ready.then(()=>chrome.storage.local.set({[UPDATE_STATE_KEY]:{
    state:'installed',fromVersion:details.previousVersion||null,toVersion:chrome.runtime.getManifest().version,at:Date.now(),
  }})).catch(()=>{});
});
// ChatGPT source ordering remains unavailable until a live provider contract is certified.
// No credential reader or direct provider is constructed by this worker.
const unavailableSession={get:async()=>{throw new ArchiveError('UNAVAILABLE');},set:async()=>{throw new ArchiveError('UNAVAILABLE');},remove:async()=>{throw new ArchiveError('UNAVAILABLE');}};
const privacySession=chrome.storage.session||unavailableSession;
const originalOrganizer=new SimpleOriginalOrganizerRunner(store,{provider:unavailableAIProvider,credentials:unavailableAICredentials});
const aiOrganizer=new AIPresentationRunner(store,{provider:unavailableAIProvider,credentials:unavailableAICredentials});
const boundedOrganizer=new BoundedOrganizerWorkflow(store,{original:originalOrganizer,ai:aiOrganizer});
const onboarding=new OnboardingService(store);
const integrity=new IntegrityChecker(store);
const memory=new MemoryService(store,{session:privacySession});
const contextTopics=new ContextTopicAccessService(store);
const contextCards=new ContextCardsService(store,{topicSummary:(t,epoch)=>contextTopics.summaryInTransaction(t,epoch)});
const backups=new BackupService(store,{appVersion:chrome.runtime.getManifest().version});
const imports = new ImportHandler(store,chrome.runtime);
chrome.runtime.onConnect?.addListener(port=>{if(port.name==='official-export-session')port.onDisconnect.addListener(()=>imports.disconnect(port.sender));});
chrome.runtime.onConnect?.addListener(port=>{if(port.name.startsWith('bounded-organizer:')&&isExtensionPage(port.sender)){const id=port.name.slice('bounded-organizer:'.length);port.onDisconnect.addListener(()=>{if(boundedOrganizer.currentId===id&&boundedOrganizer.running)void boundedOrganizer.stop();});}});
// Fail closed if storage isolation cannot be established; never expose records
// directly to a content script, including the brief worker-startup period.
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const privacyReady=Promise.resolve(privacySession.setAccessLevel?.({accessLevel:'TRUSTED_CONTEXTS'}));
privacyReady.catch(()=>{});
ready.catch(() => {});
installCaptureRecovery(chrome, ready);
const backupReady=ready.then(()=>backups.recoverSettings());backupReady.catch(()=>{});
const originalReady=Promise.all([ready,privacyReady,backupReady]).then(()=>Promise.all([originalOrganizer.reconcileInterrupted(),aiOrganizer.reconcileInterrupted(),boundedOrganizer.reconcileInterrupted()]));
originalReady.catch(()=>{});

function isExtensionPage(sender) {
  if (sender.id !== chrome.runtime.id) return false;
  if (['ui/popup.html', 'ui/archive.html'].some(path => sender.url === chrome.runtime.getURL(path))) return true;
  return typeof sender.url==='string'&&sender.url.startsWith(chrome.runtime.getURL('ui/archive.html')+'#')&&topicRootTarget(sender.url)!==null;
}

function isChatGPTContent(sender) {
  if (sender.id !== chrome.runtime.id || !sender.tab || sender.frameId !== 0 || sender.tab.incognito) return false;
  try { return new URL(sender.url).origin === 'https://chatgpt.com'; }
  catch { return false; }
}

async function handle(request, sender) {
  await ready;
  if (!request || typeof request.type !== 'string') throw new ArchiveError('INVALID_REQUEST');
  if(request.type.startsWith('PAIA_PROMPT_NEXT_'))return promptNext.handle(request,sender);
  if(request.type.startsWith('PAIA_PROMPT_SURFACE_'))return promptSurface.handle(request,sender);
  if(request.type.startsWith('PAIA_PROMPT_'))return promptReuse.handle(request,sender);
  if(request.type.startsWith('IMPORT_'))return imports.handle(request,sender);
  const ui = isExtensionPage(sender);
  const content = isChatGPTContent(sender);
  if (content && request.type === 'RESPONSE_POLL') return {arm:false,fingerprintAllowed:false};
  if (!ui && !content) throw new ArchiveError('FORBIDDEN');
  if (request.type === 'GET_STATUS') {
    const status = await store.status();
    return content ? {...status, runtimeVersion: chrome.runtime.getManifest().version} : status;
  }
  if (content && request.type === 'DIAGNOSTIC') {
    // A mismatched content version may report only this fixed reason, never its
    // own version string, structural payload, or any other page-derived fields.
    if (request.code === 'ADAPTER_VERSION_MISMATCH') {
      return store.diagnose({ code: 'ADAPTER_VERSION_MISMATCH', scanned: 0 });
    }
    if (request.adapterVersion !== ADAPTER_VERSION) throw new ArchiveError('INVALID_REQUEST');
    return store.diagnose({ code: request.code, scanned: request.scanned, structure: request.structure, captureHealth: request.captureHealth });
  }
  if (content && ['CAPTURE', 'ENRICH_SOURCE_METADATA', 'OBSERVE_SOURCE_STRUCTURE'].includes(request.type) &&
      request.contentVersion !== chrome.runtime.getManifest().version) throw new ArchiveError('CONTEXT_INVALIDATED');
  if (content && request.type === 'OBSERVE_SOURCE_STRUCTURE') {
    if(Object.keys(request).some(key=>!['type','epoch','adapterVersion','contentVersion','chat','observations'].includes(key))||
       request.adapterVersion!==ADAPTER_VERSION||!Array.isArray(request.observations)||
       !request.observations.length||request.observations.length>4)throw new ArchiveError('INVALID_REQUEST');
    const source=canonicalChat(sender.tab.url ?? sender.url);
    const target=canonicalChat(request.chat?.url);
    if(!source||!target||source.id!==target.id||source.id!==request.chat?.id)throw new ArchiveError('FORBIDDEN');
    const trustedProject=canonicalProjectChat(sender.tab.url ?? sender.url);
    const trustedPlain=canonicalPlainChat(sender.tab.url ?? sender.url);
    const status=await store.status();
    if(!status.consented)throw new ArchiveError('CONSENT_REQUIRED');
    if(!status.enabled)throw new ArchiveError('PAUSED');
    if(status.epoch!==request.epoch||
       request.observations.some(observation=>observation?.epoch!==request.epoch))throw new ArchiveError('STALE_CAPTURE');
    const admitted=await admitChatGPTSourceStructureBatch(request.observations);
    for(const item of admitted){
      if(item.kind==='conversation'){
        if(item.conversationRef.platform!=='chatgpt'||item.conversationRef.sourceConversationId!==source.id)throw new ArchiveError('FORBIDDEN');
        if(item.membership?.state==='project'){
          if(!trustedProject||trustedProject.id!==source.id||
             item.membership.projectRef.namespace!==CHATGPT_PROJECT_STRUCTURE_POLICY.namespace||
             item.membership.projectRef.projectId!==trustedProject.projectId)throw new ArchiveError('FORBIDDEN');
        }else if(item.membership?.state==='unassigned'){
          if(!trustedPlain||trustedPlain.id!==source.id)throw new ArchiveError('FORBIDDEN');
        }
      }else if(item.kind==='project'){
        if(!trustedProject||trustedProject.id!==source.id||
           item.projectRef.namespace!==CHATGPT_PROJECT_STRUCTURE_POLICY.namespace||
           item.projectRef.projectId!==trustedProject.projectId||
           item.witnessConversationRef?.platform!=='chatgpt'||
           item.witnessConversationRef?.sourceConversationId!==source.id)throw new ArchiveError('FORBIDDEN');
      }else throw new ArchiveError('FORBIDDEN');
    }
    return sourceStructure.observeAdmittedBatch(admitted);
  }
  if (content && ['CAPTURE', 'ENRICH_SOURCE_METADATA'].includes(request.type)) {
    // sender.url can stay at the document's initial address after pushState.
    // Chrome supplies the tab's current URL on MessageSender without a tabs
    // permission. Prefer it to verify SPA routing; never query browser history.
    const source = canonicalChat(sender.tab.url ?? sender.url);
    const target = canonicalChat(request.chat?.url);
    if (!source || !target || source.id !== target.id || source.id !== request.chat?.id) throw new ArchiveError('FORBIDDEN');
    return request.type === 'CAPTURE' ? store.capture(request) : store.enrich(request);
  }
  if (!ui || ['ENRICH_SOURCE_METADATA','OBSERVE_SOURCE_STRUCTURE'].includes(request.type)) throw new ArchiveError('FORBIDDEN');
  const styleRequest=request.type==='PAIA_SETTINGS_AI_STYLE'||isAIStyleOnlyRequest(request);
  if(styleRequest){
    if(sender.url===chrome.runtime.getURL('ui/popup.html')||(sender.frameId!==undefined&&sender.frameId!==0)||sender.tab?.incognito)throw new ArchiveError('FORBIDDEN');
    const allowed=request.type==='PAIA_SETTINGS_AI_STYLE'?['type']:['type','changes'];if(Object.keys(request).some(key=>!allowed.includes(key)))throw new ArchiveError('INVALID_REQUEST');
  }
  if(request.type==='PURGE_SOURCE'&&(request.confirm!==true||Object.keys(request).some(key=>!['type','id','confirm'].includes(key))))throw new ArchiveError('INVALID_REQUEST');
  const needsConsent=request.type==='START_BOUNDED_ORGANIZER'||request.type==='EDIT_DOCUMENT'&&request.edit?.removeScope!==undefined||request.type.startsWith('PAIA_ARCHIVE_')||request.type.startsWith('PAIA_RECOVERY_')||['PURGE_SOURCE','PURGE_RECORD','ADD_TO_TOPICS','CONTINUE_THINKING','COMPARE_THOUGHT_INPUT','RESTORE_THOUGHT_INPUT','THOUGHT_EDIT_HISTORY','THOUGHT_POSITION','GET_THOUGHT_REVERSE_EDIT','SET_THOUGHT_REVERSE_EDIT','GET_THOUGHT_LAYOUT','SET_THOUGHT_LAYOUT'].includes(request.type)||request.type.startsWith('PAIA_CONTEXT_')||request.type.startsWith('PAIA_READER_')||request.type.startsWith('PAIA_MEMORY_')||request.type.startsWith('PAIA_REVISIT_')||request.type.startsWith('PAIA_INTEGRITY_')||request.type.startsWith('PAIA_BACKUP_')||request.type==='PAIA_CORE_LOOP_ACTION'||request.type.includes('LIBRARY')||request.type.includes('AI_PRESENTATION')||request.type==='TOPIC_DOCUMENT_PAGE'||request.type==='PAIA_PASSPORT_CREATE'||request.type==='PAIA_CONTEXT_BIND';
  if(needsConsent&&request.type!=='GET_LIBRARY_FOUNDATION_STATUS'&&!(await store.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  assertFeatureAvailable(request);
  if(['START_BOUNDED_ORGANIZER','STOP_BOUNDED_ORGANIZER','GET_BOUNDED_ORGANIZER','UPDATE_AI_PRESENTATION','GET_AI_PRESENTATION_SCOPE','GET_AI_PRESENTATION_OPERATION_OUTCOME','STOP_AI_PRESENTATION','GET_AI_PRESENTATION_STATUS','EDIT_AI_PRESENTATION','UPDATE_ORIGINAL_LIBRARY_VIEW','STOP_ORIGINAL_LIBRARY_VIEW','GET_ORIGINAL_ORGANIZER_STATUS'].includes(request.type))await originalReady;
  if(request.type.startsWith('PAIA_BACKUP_')||styleRequest)await backupReady;
  switch (request.type) {
    case 'PAIA_SETTINGS_AI_STYLE': return store.aiStylePreference();
    case 'PAIA_SETTINGS_UPDATE_STATUS': {
      if(sender.url===chrome.runtime.getURL('ui/popup.html')||(sender.frameId!==undefined&&sender.frameId!==0)||sender.tab?.incognito)throw new ArchiveError('FORBIDDEN');
      if(Object.keys(request).some(key=>key!=='type'))throw new ArchiveError('INVALID_REQUEST');
      return readSettingsUpdateStatus(chrome.storage.local,chrome.runtime.getManifest().version);
    }
    case 'PAIA_CONTEXT_CARDS_DRAFTS': return withRecoveryFence(async()=>{const captured=await contextCards.recoveryBatchFence(),drafts=[];for(const ref of await recoveryDraftStore().list('context_item')){const draft=await loadRecoveryDraft(ref);if(draft)drafts.push(draft);}await contextCards.recoveryBatchFence(captured);return drafts;});
    case 'PAIA_CONTEXT_CARDS_SNAPSHOT': {const snapshot=await contextCards.snapshot();if(snapshot.automaticEvaluation?.complete===false)throw new ArchiveError('CONTEXT_INVALIDATED');return snapshot;}
    case 'PAIA_CONTEXT_CARDS_CHANGE': return contextCards.change(request.change);
    case 'PAIA_CONTEXT_CARDS_OUTCOME': return contextCards.outcome(request.query);
    case 'PAIA_CONTEXT_TOPICS_PAGE':
      if(Object.keys(request).some(key=>!['type','options'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return contextTopics.page(request.options===undefined?{}:request.options);
    case 'PAIA_CONTEXT_TOPICS_CHANGE':
      if(Object.keys(request).some(key=>!['type','change'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return contextTopics.change(request.change);
    case 'PAIA_CONTEXT_TOPICS_OUTCOME':
      if(Object.keys(request).some(key=>!['type','query'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return contextTopics.outcome(request.query);
    case 'PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT': {
      if(Object.keys(request).some(key=>!['type','id'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return withRecoveryFence(()=>store.sourcePurgePreflight(request.id));
    }
    case 'PAIA_RECOVERY_DRAFT_SAVE': return withRecoveryFence(()=>saveRecoveryDraft(request.draft||{}));
    case 'PAIA_RECOVERY_DRAFT_LOAD': return withRecoveryFence(()=>loadRecoveryDraft(request.draft));
    case 'PAIA_RECOVERY_DRAFT_CLEAR': {const d=request.draft||{};return withRecoveryFence(()=>recoveryDraftStore().clear(d.kind,d.ownerId,d.token??null));}
    case 'PAIA_RECOVERY_DRAFT_CLEAR_MANY': return withRecoveryFence(()=>recoveryDraftStore().clearMany(request.drafts||[]));
    case 'PAIA_RECOVERY_DRAFT_PRUNE': return withRecoveryFence(()=>recoveryDraftStore().prune());
    case 'PAIA_ARCHIVE_OPERATION_OUTCOME': {
      if(Object.keys(request).some(key=>!['type','query'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return store.operationOutcome(request.query);
    }
    case 'PAIA_ARCHIVE_PREPARE_REMOVAL': {
      if(Object.keys(request).some(key=>!['type','removal'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return store.prepareRemoval(request.removal);
    }
    case 'PAIA_ARCHIVE_PREPARE_REVISION': {
      if(Object.keys(request).some(key=>!['type','revision'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return store.prepareWorkingRevision(request.revision);
    }
    case 'PAIA_ARCHIVE_ORIGINAL_PAGE': {
      if(Object.keys(request).some(key=>!['type','page'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return archiveOriginal.page(request.page);
    }
    case 'PAIA_ARCHIVE_NAV_PAGE': return archiveNavigation.page(request.page);
    case 'PAIA_ARCHIVE_NAV_STATUS': return archiveNavigation.status(request.page);
    case 'PAIA_ARCHIVE_ORDER_PREFERENCE': {
      if(Object.keys(request).some(key=>!['type','mode'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      const preference=request.mode===undefined?await archiveOrderPreference.read():await archiveOrderPreference.write(request.mode);
      return {...preference,providers:{chatgpt:sourceOrderRegistry.status('chatgpt')}};
    }
    case 'PAIA_ARCHIVE_SOURCE_DETAIL': {
      if(Object.keys(request).some(key=>!['type','subject'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      const subject=subjectRef(request.subject),current=subject.kind==='conversation'?await sourceStructure.conversation(subject.conversationRef):await sourceStructure.project(subject.projectRef),history=await sourceStructure.history(subject,{limit:40});
      return {subject,current:current?{...sourceStructureSnapshot(current),lastObservedAt:current.lastObservedAt,relationshipRevision:current.relationshipRevision}:null,history:history.items.map(row=>({observedAt:row.observedAt,change:[...row.change],after:structuredClone(row.after)})),hasMore:history.nextCursor!==null};
    }
    case 'PAIA_PRODUCT_STATUS': return legacyUsage.status();
    case 'PAIA_PRODUCT_SETTINGS': return legacyUsage.settings(request.settings);
    case 'PAIA_PRODUCT_CLEAR': if(request.confirm!==true)throw new ArchiveError('INVALID_REQUEST');return legacyUsage.clear();
    case 'PAIA_REVISIT_STATUS': return revisit.status(request.options);
    case 'PAIA_REVISIT_OPEN': return revisit.open(request.options);
    case 'PAIA_REVISIT_CLOSE': return revisit.close(request.options);
    case 'PAIA_READER_RECENT': return readerState.recent();
    case 'PAIA_READER_RESOLVE': return readerState.resolve(request.documentId);
    case 'PAIA_READER_SAVE': return readerState.save(request.anchor);
    case 'PAIA_READER_POLICY': return readerState.policy();
    case 'PAIA_READER_CONFIGURE': return readerState.configure(request.change);
    case 'PAIA_READER_CAPTURE_SCOPE': return readerState.captureScope(request.options);
    case 'PAIA_REVISIT_MARK': return revisit.mark(request.anchor);
    case 'PAIA_PASSPORT_STATUS': return passport.status();
    case 'PAIA_PASSPORT_REVOKE': return passport.revoke(request.grantId);
    case 'PAIA_PASSPORT_REVOKE_ALL': {
      if(Object.keys(request).some(key=>key!=='type'))throw new ArchiveError('INVALID_REQUEST');
      return passport.revokeAll();
    }
    case 'PAIA_PASSPORT_CLEAR_AUDITS': if(request.confirm!==true)throw new ArchiveError('INVALID_REQUEST');return passport.clearAudits();
    case 'REMOVE_LIBRARY_TOPIC': return store.removeTopic(request.edit);
    case 'RESTORE_LIBRARY_TOPIC': return store.restoreTopicContainer(request.edit);
    case 'GET_LIBRARY_REMOVED_TOPICS': return store.removedTopics(request.options);
    case 'GET_LIBRARY_RENAME_SUGGESTIONS': return store.topicRenameSuggestions();
    case 'GET_LIBRARY_MERGE_SUGGESTIONS': return store.topicMergeSuggestions();
    case 'KEEP_LIBRARY_TOPICS_SEPARATE': return store.keepTopicsSeparate(request.options);
    case 'PAIA_MEMORY_STATUS': return memory.status(request.options);
    case 'PAIA_MEMORY_AUTHORIZE': return memory.authorize(request.options);
    case 'PAIA_MEMORY_EXCLUDE': return memory.exclude(request.options);
    case 'PAIA_MEMORY_SETTINGS': {const result=await memory.settings(request.options);if(request.options?.localOnly===true)await boundedOrganizer.stop();return result;}
    case 'PAIA_MEMORY_ENTRIES': return memory.entries(request.options);
    case 'PAIA_INTEGRITY_BEGIN': return integrity.begin();
    case 'PAIA_INTEGRITY_PAGE': return integrity.page(request.options);
    case 'PAIA_INTEGRITY_CANCEL': return integrity.cancel(request.options);
    case 'PAIA_BACKUP_BEGIN_RESTORE': return backups.beginRestore();
    case 'PAIA_BACKUP_STAGE': return backups.stageRestore(request.options);
    case 'PAIA_BACKUP_PREVIEW': return backups.previewRestore(request.options);
    case 'PAIA_BACKUP_RESTORE': return withRecoveryFence(async()=>{await promptNext.configure(false);const result=await backups.restore(request.options);if(request.options?.mode!=='merge')await recoveryDraftStore().clearAll().catch(()=>{});return result;});
    case 'PAIA_BACKUP_CANCEL': return backups.cancel(request.options);
    case 'GET_BOUNDED_ORGANIZER': return boundedOrganizer.status();
    case 'STOP_BOUNDED_ORGANIZER': return boundedOrganizer.stop();
    case 'GET_ONBOARDING': return onboarding.status();
    case 'SET_ONBOARDING': return onboarding.action(request.action);
    case 'GET_ORGANIZER_CONTROLS': return store.organizerControls();
    case 'SET_ORGANIZER_CONTROLS': return store.setOrganizerControls(request.changes);
    case 'GET_AI_PRESENTATION_REVISIONS': return store.aiPresentationRevisions(request.options);
    case 'LIBRARY_UPDATES': return store.suggestionPage(request.options);
    case 'RESOLVE_LIBRARY_UPDATE': return store.resolveSuggestion(request.edit);
    case 'LIBRARY_ORGANIZER_JOBS': return store.organizerJobPage(request.options);
    case 'GET_LIBRARY_DUAL_VIEW_STATUS': return store.dualViewStatus();
    case 'GET_ORIGINAL_ORGANIZER_STATUS': return store.originalOrganizerStatus();
    case 'GET_AI_PRESENTATION_OPERATION_OUTCOME': return store.aiPresentationOperationOutcome(request.options);
    case 'STOP_AI_PRESENTATION': return aiOrganizer.stop({topicId:request.topicId});
    case 'GET_AI_PRESENTATION_STATUS': return recoverySnapshot(()=>store.aiPresentationStatus(request.options),(value,epoch)=>({...value,topics:value.topics.map(topic=>({...topic,recoveryEpoch:epoch,presentation:topic.presentation?{...topic.presentation,recoveryEpoch:epoch}:null}))}));
    case 'RECOVER_AI_PRESENTATION_DRAFT': return store.recoverAIDraft(request.options);
    case 'EDIT_AI_PRESENTATION': return store.editAIPresentation(request.edit);
    case 'STOP_ORIGINAL_LIBRARY_VIEW': return originalOrganizer.stop('CANCELLED');
    case 'CONTROL_LIBRARY_ORGANIZER_JOB': return store.controlOrganizer(request.edit);
    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics();
    case 'FILTER_RECOVER': return store.recoverFilters();
    case 'FILTER_STATUS': return store.filterStatus();
    case 'FILTER_MODE': return store.setFilterMode(request.mode);
    case 'FILTER_NOTICE': return store.takeFilterNotice();
    case 'FILTER_RECENT': return store.recentFiltered(request.options);
    case 'FILTER_PROTECT': return store.protectUserInput(request.id);
    case 'FILTER_KEEP': return store.keepInput(request.id);
    case 'SEARCH_INPUTS': return store.searchInputs(request.options);
    case 'GET_INPUT': return recoverySnapshot(()=>store.input(request.id));
    case 'RECORD_TOPIC_READ': return store.recordTopicRead(request.id);
    case 'LIBRARY_INDEX_PAGE': return store.libraryIndexPage(request.options);
    case 'GET_LIBRARY_ROOT_PROJECTION': return thoughtLibraryRead.rootPage(request.options);
    case 'GET_LIBRARY_SECTION_PROJECTION': return thoughtLibraryRead.sectionPage(request.options);
    case 'GET_LIBRARY_TOPIC_READING_METADATA': {
      if(Object.keys(request).some(key=>!['type','id'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      return thoughtLibraryRead.topicReadingMetadata({id:request.id});
    }
    case 'GET_LIBRARY_SECTION_READING': {
      if(Object.keys(request).some(key=>!['type','options'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      const page=await thoughtSectionReading.page(request.options);
      // Preserve the epoch captured with these bodies; never retag an old read
      // with a separately fetched post-restore epoch. Decoration is synchronous.
      return typeof page.recoveryEpoch==='string'?recoveryDocumentPage(page,page.recoveryEpoch):page;
    }
    case 'GET_LIBRARY_ROOT_SEARCH': {
      const options=request.options;if(!options||typeof options.query!=='string'||!options.query.trim()||Object.keys(options).some(key=>!['query','cursor','authority','limit'].includes(key)))throw new ArchiveError('INVALID_REQUEST');
      const page=await store.libraryIndexPage({mode:'stable',...options});return thoughtLibraryRead.qualifySearchPage(page,options.query);
    }
    case 'TOPIC_DOCUMENT_PAGE': return recoverySnapshot(()=>store.topicDocumentPage(request.options),recoveryDocumentPage);
    case 'GET_LIBRARY_TRACKED_ENTRIES': return store.trackedLibraryEntries(request.options);
    case 'GET_LIBRARY_TOPIC_SECTIONS': return recoverySnapshot(()=>store.topicSectionsPage(request.options),recoveryDocumentPage);
    case 'GET_LIBRARY_TOPIC_ADJACENCY': return store.topicAdjacency(request.options);
    case 'GET_LIBRARY_TOPIC_TIMELINE': return recoverySnapshot(()=>store.topicTimelinePage(request.options),recoveryDocumentPage);
    case 'GET_LIBRARY_TOPIC': return recoverySnapshot(()=>store.topic(request.id));
    case 'THOUGHT_POSITION': return store.topicPosition(request.position);
    case 'THOUGHT_EDIT_HISTORY': return store.thoughtEditHistory(request.edit);
    case 'ADD_TO_TOPICS': return store.addToTopics(request.selection);
    case 'CONTINUE_THINKING': return store.continueThinking(request.thought);
    case 'COMPARE_THOUGHT_INPUT': return store.compareThought(request.id);
    case 'RESTORE_THOUGHT_INPUT': return store.restoreThoughtInput(request.edit);
    case 'GET_THOUGHT_LAYOUT': return store.thoughtLayout();
    case 'SET_THOUGHT_LAYOUT': return store.thoughtLayout(request.layout);
    case 'GET_THOUGHT_REVERSE_EDIT': return store.reverseEditSetting();
    case 'SET_THOUGHT_REVERSE_EDIT': return store.reverseEditSetting(request.enabled);
    case 'GET_LIBRARY_ENTRY': return recoverySnapshot(()=>store.readingEntry(request.id));
    case 'GET_LIBRARY_REMOVED_PLACEMENTS': return store.removedPlacements(request.options);
    case 'RESTORE_LIBRARY_PLACEMENT': return store.restoreRemovedPlacement(request.edit);
    case 'GET_LIBRARY_PLACEMENT': return store.libraryPlacement(request.topicId,request.entryId);
    case 'GET_LIBRARY_PATHS': return store.entryPaths(request.id);
    case 'GET_LIBRARY_PROVENANCE': return store.libraryProvenance(request.id);
    case 'GET_LIBRARY_UNPLACED': return store.unplacedEntries(request.options);
    case 'GET_LIBRARY_REMOVED': return store.removedEntries(request.options);
    case 'SEARCH_LIBRARY': return store.searchLibrary(request.options);
    case 'GET_LIBRARY_LAYOUT': return store.layoutStatus(request.id);
    case 'RETRY_LIBRARY_MAINTENANCE': void libraryRunner.wake({retry:true});return {ok:true};
    case 'REBUILD_LIBRARY_SEARCH': return store.rebuildLibrarySearch();
    case 'CREATE_LIBRARY_ENTRY': {
      const r=request.entry;
      if(!r||Object.keys(r).some(k=>!['title','body','note','type','operationId'].includes(k)))throw new ArchiveError('INVALID_REQUEST');
      return store.createEntry({...r,actor:'user',formation:'explicit',evidence:[]});
    }
    case 'EDIT_LIBRARY_FIELDS': return store.editLibraryFields(request.edit);
    case 'EDIT_LIBRARY_BATCH': return store.editLibraryBatch(request.edit);
    case 'REMOVE_LIBRARY_ENTRY': return store.removeEntry(request.edit);
    case 'RESTORE_LIBRARY_ENTRY': return store.restoreEntry(request.edit);
    case 'CREATE_LIBRARY_TOPIC': return store.createTopic(request.topic);
    case 'EDIT_LIBRARY_TOPIC': return store.editTopic(request.edit);
    case 'CREATE_LIBRARY_SECTION': return store.createSection(request.section);
    case 'EDIT_LIBRARY_SECTION': return store.editSection(request.edit);
    case 'PLACE_LIBRARY_ENTRY': return store.placeEntry(request.placement);
    case 'REORDER_LIBRARY_ENTRY': return store.reorderPlacement(request.placement);
    case 'START_LIBRARY_LAYOUT': return store.startLayout(request.layout);
    case 'GET_LIBRARY_FOUNDATION_STATUS': return store.libraryStatus();
    case 'GET_IA_STATUS': return store.iaStatus();
    case 'GET_REVISIONS': return store.revisions(request.options);
    case 'RESTORE_REVISION': return store.restoreRevision(request.restore);
    case 'PRUNE_REVISIONS': return store.pruneRevisions();
    case 'GET_THOUGHTS': return store.thoughtPage(request.options);
    case 'GET_THOUGHT': return store.thought(request.id);
    case 'EDIT_THOUGHT': return store.editThought(request.edit);
    case 'PURGE_SOURCE': return withRecoveryFence(()=>purgeWithRecovery(request.id,true));
    case 'GET_PAGE': return recoverySnapshot(()=>store.page(request.page));
    case 'GET_MIGRATION_STATUS': {const m=await store.migrationStatus();return m?{phase:m.phase,verified:m.verified,recoveryVerified:m.recoveryVerified,recordCount:m.recordCount,blockCount:m.blockCount}:{phase:'not_started'};}
    case 'RECOVER_MIGRATION': return store.recoverMigration();
    case 'EDIT_DOCUMENT': return store.editDocument(request.edit);
    case 'UPDATE_PREFERENCES': return store.updatePreferences(request.changes);
    case 'RESOLVE_LEGACY': return store.resolveLegacy(request.id,request.include);
    case 'UPDATE_LIBRARY': return store.updateLibrary(request.id, request.changes);
    case 'EXCLUDE_LIBRARY': return store.excludeLibrary(request.id, request.excluded);
    case 'UPDATE_DOCUMENT': return store.updateDocument(request.id, request.changes);
    case 'GET_MEMORY_CONTEXT': return store.memoryContext();
    case 'GET_STATE': return recoverySnapshot(()=>store.snapshot());
    case 'CONSENT': return store.consent(request.accepted);
    case 'SET_ENABLED': return store.setEnabled(request.enabled);
    case 'UPDATE_RECORD': return store.update(request.id, request.changes);
    case 'TRASH_RECORD': return store.trash(request.id);
    case 'RESTORE_RECORD': return store.restore(request.id);
    case 'PURGE_RECORD': return withRecoveryFence(()=>purgeWithRecovery(request.id,false));
    default: throw new ArchiveError('INVALID_REQUEST');
  }
}

const runtime=chrome.runtime;
let importNotification;
function notifyArchiveChanged(type){
 const send=()=>{importNotification=null;return Promise.resolve(chrome.runtime.sendMessage?.({type:'ARCHIVE_CHANGED',cause:type})).catch(()=>{});};
 if(type==='IMPORT_COMMIT'){if(!importNotification)importNotification=setTimeout(()=>{void send();},500);return Promise.resolve();}
 if(importNotification)clearTimeout(importNotification);return send();
}
function notifySourceStructureChanged(){
 return Promise.resolve(chrome.runtime.sendMessage?.({type:'SOURCE_STRUCTURE_CHANGED'})).catch(()=>{});
}
const runner=new FilterRunner(store,{changed:()=>{void runtime.sendMessage?.({type:'ARCHIVE_CHANGED'}).catch(()=>{});}});
const safety=new SafetyRunner(store);
const libraryRunner=new LibraryRunner(store);
// Original Organizer is cost-gated: capture, startup, timers, and rerenders may
// maintain local state but can never dispatch its remote provider.
const scheduleFilter=(options)=>{void safety.wake(options);void libraryRunner.wake(options);return runner.wake(options);};
const localToolRequest=type=>['PAIA_SETTINGS_AI_STYLE','PAIA_SETTINGS_UPDATE_STATUS','GET_LIBRARY_ROOT_PROJECTION','GET_LIBRARY_SECTION_PROJECTION','GET_LIBRARY_SECTION_READING','GET_LIBRARY_TOPIC_READING_METADATA'].includes(type)||type.startsWith('PAIA_PROMPT_')||type.startsWith('PAIA_ARCHIVE_')||type.startsWith('PAIA_RECOVERY_')||['GET_THOUGHT_LAYOUT','SET_THOUGHT_LAYOUT','GET_THOUGHT_REVERSE_EDIT','SET_THOUGHT_REVERSE_EDIT','THOUGHT_POSITION','RECORD_TOPIC_READ','COMPARE_THOUGHT_INPUT','GET_LIBRARY_TRACKED_ENTRIES','GET_LIBRARY_TOPIC_SECTIONS','GET_LIBRARY_TOPIC_ADJACENCY'].includes(type)||type.startsWith('PAIA_READER_')||type.startsWith('PAIA_PRODUCT_')||type.startsWith('PAIA_PASSPORT_')||type.startsWith('PAIA_CONTEXT_')||type.startsWith('PAIA_REVISIT_')||type.startsWith('PAIA_CORE_LOOP_');
runtime.onStartup?.addListener(()=>{void ready.then(()=>scheduleFilter()).catch(()=>{});});
runtime.onInstalled?.addListener(()=>{void ready.then(()=>scheduleFilter()).catch(()=>{});});
// Startup may reconcile an unknown prior outcome, but it never dispatches Original.
if(runtime.onStartup)void ready.then(()=>scheduleFilter()).catch(()=>{});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handle(request, sender)
    .then(async data => {
      const archiveMutation=request.type==='CAPTURE'?(Number(data?.added)>0||data?.timeChanged===true):request.type==='ENRICH_SOURCE_METADATA'?Number(data?.enriched)>0:request.type==='OBSERVE_SOURCE_STRUCTURE'?false:true;
      if(request.type==='PURGE_SOURCE')await notifyArchiveChanged(request.type);
      sendResponse({ ok: true, data });
      if(request.type==='CONSENT')void chrome.tabs.query({url:'https://chatgpt.com/*'}).then(tabs=>Promise.allSettled(tabs.filter(t=>!t.incognito).map(t=>chrome.tabs.sendMessage(t.id,{type:'PAIA_PROMPT_SURFACE_ACTIVATE'},{frameId:0})))).catch(()=>{});
      if(request.type==='OBSERVE_SOURCE_STRUCTURE'&&data?.event===true)void notifySourceStructureChanged();
      if(['PAIA_CONTEXT_CARDS_CHANGE','PAIA_CONTEXT_TOPICS_CHANGE'].includes(request.type)&&data?.ok===true)void chrome.runtime.sendMessage?.({type:'PAIA_CONTEXT_CARDS_CHANGED'}).catch(()=>{});
      if(request.type==='PAIA_PROMPT_CHANGE')void chrome.runtime.sendMessage?.({type:'PAIA_PROMPT_CHANGED'}).catch(()=>{});
      if(isAIStyleOnlyRequest(request)&&data?.ok===true&&data.changed===true)void chrome.runtime.sendMessage?.({type:'PAIA_SETTINGS_AI_STYLE_CHANGED'}).catch(()=>{});
      if(request.type==='SET_THOUGHT_REVERSE_EDIT')notifyArchiveChanged(request.type);
      if(['PAIA_READER_CONFIGURE','PAIA_READER_CAPTURE_SCOPE'].includes(request.type))void chrome.runtime.sendMessage?.({type:'PAIA_READER_POLICY_CHANGED'}).catch(()=>{});
      if(request.type!=='OBSERVE_SOURCE_STRUCTURE'&&!isAIStyleOnlyRequest(request)&&!localToolRequest(request.type)&&(!request.type.startsWith('IMPORT_')||['IMPORT_COMMIT','IMPORT_COMPLETE','IMPORT_RESOLVE_BRANCH'].includes(request.type))&&!['GET_ONBOARDING','SET_ONBOARDING'].includes(request.type)&&!request.type.startsWith('PAIA_MEMORY_')&&!request.type.startsWith('PAIA_INTEGRITY_')&&!request.type.startsWith('PAIA_BACKUP_')&&request.type!=='GET_BOUNDED_ORGANIZER'&&!['GET_AI_PRESENTATION_STATUS','GET_AI_PRESENTATION_SCOPE','GET_AI_PRESENTATION_OPERATION_OUTCOME'].includes(request.type)&&request.type!=='GET_ORIGINAL_ORGANIZER_STATUS'&&request.type!=='GET_DEEPSEEK_STATUS'&&request.type!=='FILTER_DIAGNOSTICS'&&!['SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK'].includes(request.type))void scheduleFilter({retry:['FILTER_RECOVER','FILTER_MODE'].includes(request.type)});
      if(request.type!=='PURGE_SOURCE'&&archiveMutation&&!isAIStyleOnlyRequest(request)&&!localToolRequest(request.type)&&!['PAIA_MEMORY_STATUS','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_MEMORY_ENTRIES'].includes(request.type)&&!request.type.startsWith('PAIA_INTEGRITY_')&&!['PAIA_BACKUP_BEGIN_EXPORT','PAIA_BACKUP_EXPORT_PAGE','PAIA_BACKUP_BEGIN_RESTORE','PAIA_BACKUP_STAGE','PAIA_BACKUP_PREVIEW','PAIA_BACKUP_CANCEL','GET_BOUNDED_ORGANIZER','GET_LIBRARY_REMOVED_TOPICS','GET_LIBRARY_REMOVED_PLACEMENTS','GET_LIBRARY_RENAME_SUGGESTIONS','GET_LIBRARY_MERGE_SUGGESTIONS','GET_ORGANIZER_CONTROLS','GET_AI_PRESENTATION_REVISIONS','GET_AI_PRESENTATION_SCOPE','GET_AI_PRESENTATION_OPERATION_OUTCOME','GET_AI_PRESENTATION_STATUS','GET_ORIGINAL_ORGANIZER_STATUS','GET_DEEPSEEK_STATUS','SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK','LIBRARY_UPDATES','LIBRARY_ORGANIZER_JOBS','GET_LIBRARY_UNPLACED','GET_LIBRARY_PLACEMENT','LIBRARY_INDEX_PAGE','GET_LIBRARY_ROOT_SEARCH','TOPIC_DOCUMENT_PAGE','GET_LIBRARY_TOPIC_TIMELINE','GET_LIBRARY_TOPIC','GET_LIBRARY_ENTRY','GET_LIBRARY_PATHS','GET_LIBRARY_PROVENANCE','GET_LIBRARY_REMOVED','SEARCH_LIBRARY','GET_LIBRARY_LAYOUT','GET_LIBRARY_FOUNDATION_STATUS','GET_LIBRARY_DUAL_VIEW_STATUS','PREVIEW_AI_LIBRARY_UPDATE','FILTER_DIAGNOSTICS','FILTER_STATUS','FILTER_NOTICE','FILTER_RECENT','SEARCH_INPUTS','GET_INPUT','GET_IA_STATUS','GET_REVISIONS','GET_THOUGHTS','GET_THOUGHT','GET_STATUS','GET_STATE','GET_PAGE','GET_MIGRATION_STATUS','RESPONSE_POLL','RESPONSE_VIEW','RESPONSE_ARM','DIAGNOSTIC','GET_ONBOARDING','SET_ONBOARDING','IMPORT_LATEST','IMPORT_CANCEL','IMPORT_CAPABILITIES','IMPORT_TASKS','IMPORT_STATUS','IMPORT_BEGIN','IMPORT_PREFLIGHT','IMPORT_READY','IMPORT_PAUSE'].includes(request.type))notifyArchiveChanged(request.type);
    })
    .catch(error => sendResponse({ ok: false, ...(['UPDATE_AI_PRESENTATION','UPDATE_ORIGINAL_LIBRARY_VIEW'].includes(request?.type)?{phase:'message_handler'}:{}), error: typeof request?.type==='string' && request.type.startsWith('IMPORT_') ? safeImportError(error) : ['UPDATE_AI_PRESENTATION','UPDATE_ORIGINAL_LIBRARY_VIEW'].includes(request?.type)&&!(error instanceof ArchiveError)?'INTERNAL_RUNTIME_ERROR':safeErrorCode(error) }));
  return true;
});
