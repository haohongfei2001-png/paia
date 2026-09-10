import {MemoryService} from '../core/memory/service.js';
import {OnboardingService} from '../core/onboarding.js';
import {IntegrityChecker} from '../core/integrity-checker.js';
import {BackupService} from '../core/backup-service.js';
import {BoundedOrganizerWorkflow} from '../core/organizer/bounded-workflow.js';
import {AIPresentationRunner} from '../core/organizer/ai-presentation.js';
import {bindBudgetSession} from '../core/organizer/budget.js';
import {organizerNetworkGuard} from './organizer-network.js';
import {OrganizerRunner} from '../core/organizer/runner.js';
import {LibraryRunner} from '../core/library-runner.js';
import {FilterRunner} from '../core/filter-runner.js';
import {ImportHandler} from './import-handler.js';
import {safeImportError} from '../core/import/errors.js';
import { ResponseDiagnostics } from './response-diagnostics.js';
const responseDiagnostics = new ResponseDiagnostics();
chrome.tabs?.onRemoved?.addListener(id => responseDiagnostics.removeTab(id));
import { OrganizerStore as IndexedArchiveStore } from '../core/organizer/store.js';
import {SafetyRunner} from '../core/thought-runner.js';
import { ADAPTER_VERSION, ArchiveError, safeErrorCode } from '../core/constants.js';
import { canonicalChat } from '../core/validation.js';
import {DeepSeekOrganizerProvider,DeepSeekSessionCredentials} from '../core/organizer/deepseek.js';
import {SimpleOriginalOrganizerRunner} from '../core/organizer/original-simple.js';

const store = new IndexedArchiveStore(chrome.storage.local);
// Empty production registry: no extraction is scheduled until a provider stage is approved.
const organizer = new OrganizerRunner(store);
// DeepSeek stays outside the generic production registry. Only the explicit
// manual Organizer actions can invoke this provider through their typed DTOs.
const unavailableSession={get:async()=>{throw new ArchiveError('UNAVAILABLE');},set:async()=>{throw new ArchiveError('UNAVAILABLE');},remove:async()=>{throw new ArchiveError('UNAVAILABLE');}};
const deepSeekSession=chrome.storage.session||unavailableSession;
const deepSeekCredentials=new DeepSeekSessionCredentials(deepSeekSession);
const deepSeekProvider=new DeepSeekOrganizerProvider({limits:store.organizerBudget.limits,networkGuard:organizerNetworkGuard()});
const originalOrganizer=new SimpleOriginalOrganizerRunner(store,{provider:deepSeekProvider,credentials:deepSeekCredentials});
const aiOrganizer=new AIPresentationRunner(store,{provider:deepSeekProvider,credentials:deepSeekCredentials});
const boundedOrganizer=new BoundedOrganizerWorkflow(store,{original:originalOrganizer,ai:aiOrganizer});
const onboarding=new OnboardingService(store);
const integrity=new IntegrityChecker(store);
const memory=new MemoryService(store,{session:deepSeekSession});
const backups=new BackupService(store,{appVersion:chrome.runtime.getManifest().version});
const imports = new ImportHandler(store,chrome.runtime);
chrome.runtime.onConnect?.addListener(port=>{if(port.name==='official-export-session')port.onDisconnect.addListener(()=>imports.disconnect(port.sender));});
chrome.runtime.onConnect?.addListener(port=>{if(port.name.startsWith('bounded-organizer:')&&isExtensionPage(port.sender)){const id=port.name.slice('bounded-organizer:'.length);port.onDisconnect.addListener(()=>{if(boundedOrganizer.currentId===id&&boundedOrganizer.running)void boundedOrganizer.stop();});}});
// Fail closed if storage isolation cannot be established; never expose records
// directly to a content script, including the brief worker-startup period.
const prepareBudgetSession=()=>bindBudgetSession(store.organizerLedger,deepSeekSession);
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const providerReady=Promise.resolve(deepSeekSession.setAccessLevel?.({accessLevel:'TRUSTED_CONTEXTS'})).then(()=>prepareBudgetSession());
providerReady.catch(()=>{});
ready.catch(() => {});
const backupReady=ready.then(()=>backups.recoverSettings());backupReady.catch(()=>{});
const originalReady=Promise.all([ready,providerReady,backupReady]).then(()=>Promise.all([originalOrganizer.reconcileInterrupted(),aiOrganizer.reconcileInterrupted(),boundedOrganizer.reconcileInterrupted()]));
originalReady.catch(()=>{});

function isExtensionPage(sender) {
  if (sender.id !== chrome.runtime.id) return false;
  return ['ui/popup.html', 'ui/archive.html'].some(path => sender.url === chrome.runtime.getURL(path));
}

function isChatGPTContent(sender) {
  if (sender.id !== chrome.runtime.id || !sender.tab || sender.frameId !== 0 || sender.tab.incognito) return false;
  try { return new URL(sender.url).origin === 'https://chatgpt.com'; }
  catch { return false; }
}

async function handle(request, sender) {
  await ready;
  if (!request || typeof request.type !== 'string') throw new ArchiveError('INVALID_REQUEST');
  if(request.type.startsWith('IMPORT_'))return imports.handle(request,sender);
  const ui = isExtensionPage(sender);
  const content = isChatGPTContent(sender);
  const responseUI = sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('ui/response-time.html');
  if (content && request.type === 'RESPONSE_POLL') {
    const status = await store.status();
    return responseDiagnostics.poll(request, sender, status.enabled && status.consented && status.epoch === request.epoch);
  }
  if (responseUI && ['RESPONSE_VIEW', 'RESPONSE_ARM'].includes(request.type)) {
    const status = await store.status();
    return responseDiagnostics.view(status.enabled && status.consented, request.type === 'RESPONSE_ARM');
  }
  if (!ui && !content) throw new ArchiveError('FORBIDDEN');
  if (request.type === 'GET_STATUS') return store.status();
  if (content && request.type === 'DIAGNOSTIC') {
    // A mismatched content version may report only this fixed reason, never its
    // own version string, structural payload, or any other page-derived fields.
    if (request.code === 'ADAPTER_VERSION_MISMATCH') {
      return store.diagnose({ code: 'ADAPTER_VERSION_MISMATCH', scanned: 0 });
    }
    if (request.adapterVersion !== ADAPTER_VERSION) throw new ArchiveError('INVALID_REQUEST');
    return store.diagnose({ code: request.code, scanned: request.scanned, structure: request.structure });
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
  if (!ui || request.type === 'ENRICH_SOURCE_METADATA') throw new ArchiveError('FORBIDDEN');
  if(['GET_DEEPSEEK_STATUS','SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK'].includes(request.type))await providerReady;
  if(['START_BOUNDED_ORGANIZER','STOP_BOUNDED_ORGANIZER','GET_BOUNDED_ORGANIZER','UPDATE_AI_PRESENTATION','GET_AI_PRESENTATION_STATUS','EDIT_AI_PRESENTATION','UPDATE_ORIGINAL_LIBRARY_VIEW','STOP_ORIGINAL_LIBRARY_VIEW','GET_ORIGINAL_ORGANIZER_STATUS'].includes(request.type))await originalReady;
  if(request.type.startsWith('PAIA_BACKUP_'))await backupReady;
  if((request.type.startsWith('PAIA_MEMORY_')||request.type.startsWith('PAIA_INTEGRITY_')||request.type.startsWith('PAIA_BACKUP_')||request.type.includes('LIBRARY')||request.type.includes('AI_PRESENTATION')||request.type==='TOPIC_DOCUMENT_PAGE')&&request.type!=='GET_LIBRARY_FOUNDATION_STATUS'&&!(await store.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(request.type==='PAIA_BACKUP_BEGIN_EXPORT')await memory.ready();
  switch (request.type) {
    case 'REMOVE_LIBRARY_TOPIC': return store.removeTopic(request.edit);
    case 'RESTORE_LIBRARY_TOPIC': return store.restoreTopicContainer(request.edit);
    case 'GET_LIBRARY_REMOVED_TOPICS': return store.removedTopics();
    case 'GET_LIBRARY_RENAME_SUGGESTIONS': return store.topicRenameSuggestions();
    case 'GET_LIBRARY_MERGE_SUGGESTIONS': return store.topicMergeSuggestions();
    case 'KEEP_LIBRARY_TOPICS_SEPARATE': return store.keepTopicsSeparate(request.options);
    case 'PAIA_MEMORY_STATUS': return memory.status(request.options);
    case 'PAIA_MEMORY_AUTHORIZE': return memory.authorize(request.options);
    case 'PAIA_MEMORY_EXCLUDE': return memory.exclude(request.options);
    case 'PAIA_MEMORY_SETTINGS': return memory.settings(request.options);
    case 'PAIA_MEMORY_PROFILE': return memory.profile(request.options);
    case 'PAIA_MEMORY_BUILD': return memory.build(request.options);
    case 'PAIA_MEMORY_SHARE': return memory.share(request.options);
    case 'PAIA_MEMORY_ENTRIES': return memory.entries(request.options);
    case 'PAIA_INTEGRITY_BEGIN': return integrity.begin();
    case 'PAIA_INTEGRITY_PAGE': return integrity.page(request.options);
    case 'PAIA_INTEGRITY_CANCEL': return integrity.cancel(request.options);
    case 'PAIA_BACKUP_BEGIN_EXPORT': return backups.beginExport();
    case 'PAIA_BACKUP_EXPORT_PAGE': return backups.exportPage(request.options);
    case 'PAIA_BACKUP_BEGIN_RESTORE': return backups.beginRestore();
    case 'PAIA_BACKUP_STAGE': return backups.stageRestore(request.options);
    case 'PAIA_BACKUP_PREVIEW': return backups.previewRestore(request.options);
    case 'PAIA_BACKUP_RESTORE': return backups.restore(request.options);
    case 'PAIA_BACKUP_CANCEL': return backups.cancel(request.options);
    case 'GET_BOUNDED_ORGANIZER': return boundedOrganizer.status();
    case 'START_BOUNDED_ORGANIZER': if(!(await store.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');return boundedOrganizer.start(request.options);
    case 'STOP_BOUNDED_ORGANIZER': return boundedOrganizer.stop();
    case 'GET_ONBOARDING': return onboarding.status();
    case 'SET_ONBOARDING': return onboarding.action(request.action);
    case 'GET_ORGANIZER_CONTROLS': return store.organizerControls();
    case 'SET_ORGANIZER_CONTROLS': return store.setOrganizerControls(request.changes);
    case 'GET_AI_PRESENTATION_REVISIONS': return store.aiPresentationRevisions(request.options);
    case 'GET_DEEPSEEK_STATUS': return deepSeekCredentials.status();
    case 'SAVE_DEEPSEEK_CREDENTIAL': {
      if(!request.config||Object.keys(request.config).some(k=>k!=='apiKey'))throw new ArchiveError('INVALID_REQUEST');
      return deepSeekCredentials.configure({apiKey:request.config.apiKey});
    }
    case 'CLEAR_DEEPSEEK': await boundedOrganizer.stop();await aiOrganizer.stop();await originalOrganizer.stop('CANCELLED');return deepSeekCredentials.disable();
    case 'LIBRARY_UPDATES': return store.suggestionPage(request.options);
    case 'RESOLVE_LIBRARY_UPDATE': return store.resolveSuggestion(request.edit);
    case 'LIBRARY_ORGANIZER_JOBS': return store.organizerJobPage(request.options);
    case 'GET_LIBRARY_DUAL_VIEW_STATUS': return store.dualViewStatus();
    case 'GET_ORIGINAL_ORGANIZER_STATUS': return store.originalOrganizerStatus();
    case 'PREVIEW_AI_LIBRARY_UPDATE': return store.previewAIDelta();
    case 'GET_AI_PRESENTATION_STATUS': return store.aiPresentationStatus();
    case 'RECOVER_AI_PRESENTATION_DRAFT': return store.recoverAIDraft(request.options);
    case 'EDIT_AI_PRESENTATION': return store.editAIPresentation(request.edit);
    case 'UPDATE_AI_PRESENTATION': if(boundedOrganizer.running||originalOrganizer.running)return {error:'REQUEST_ALREADY_IN_FLIGHT'};return aiOrganizer.wake({userActionId:request.userActionId,topicId:request.topicId||null});
    case 'UPDATE_ORIGINAL_LIBRARY_VIEW': if(boundedOrganizer.running||aiOrganizer.running)return {error:'REQUEST_ALREADY_IN_FLIGHT'};return originalOrganizer.wake({manual:true,userActionId:typeof request.userActionId==='string'&&request.userActionId.length<=100?request.userActionId:store.uuid()});
    case 'STOP_ORIGINAL_LIBRARY_VIEW': return originalOrganizer.stop('CANCELLED');
    case 'SET_ORIGINAL_LIBRARY_AUTO_UPDATE': return store.setOriginalAutoUpdate(request.enabled);
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
    case 'GET_INPUT': return store.input(request.id);
    case 'RECORD_TOPIC_READ': return store.recordTopicRead(request.id);
    case 'LIBRARY_INDEX_PAGE': return store.libraryIndexPage(request.options);
    case 'TOPIC_DOCUMENT_PAGE': return store.topicDocumentPage(request.options);
    case 'GET_LIBRARY_TOPIC': return store.topic(request.id);
    case 'GET_LIBRARY_ENTRY': return store.entry(request.id).then(e=>store.documentEntry(e));
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
    case 'PURGE_SOURCE': if(request.confirm!==true)throw new ArchiveError('INVALID_REQUEST');return store.permanentDelete(request.id);
    case 'GET_PAGE': return store.page(request.page);
    case 'GET_MIGRATION_STATUS': {const m=await store.migrationStatus();return m?{phase:m.phase,verified:m.verified,recoveryVerified:m.recoveryVerified,recordCount:m.recordCount,blockCount:m.blockCount}:{phase:'not_started'};}
    case 'RECOVER_MIGRATION': return store.recoverMigration();
    case 'EDIT_DOCUMENT': return store.editDocument(request.edit);
    case 'UPDATE_PREFERENCES': return store.updatePreferences(request.changes);
    case 'RESOLVE_LEGACY': return store.resolveLegacy(request.id,request.include);
    case 'UPDATE_LIBRARY': return store.updateLibrary(request.id, request.changes);
    case 'EXCLUDE_LIBRARY': return store.excludeLibrary(request.id, request.excluded);
    case 'UPDATE_DOCUMENT': return store.updateDocument(request.id, request.changes);
    case 'GET_MEMORY_CONTEXT': return store.memoryContext();
    case 'GET_STATE': return store.snapshot();
    case 'CONSENT': return store.consent(request.accepted);
    case 'SET_ENABLED': return store.setEnabled(request.enabled);
    case 'UPDATE_RECORD': return store.update(request.id, request.changes);
    case 'TRASH_RECORD': return store.trash(request.id);
    case 'RESTORE_RECORD': return store.restore(request.id);
    case 'PURGE_RECORD': return store.purge(request.id);
    default: throw new ArchiveError('INVALID_REQUEST');
  }
}

const runtime=chrome.runtime;
let importNotification;
function notifyArchiveChanged(type){
 const send=()=>{importNotification=null;void chrome.runtime.sendMessage?.({type:'ARCHIVE_CHANGED',cause:type}).catch(()=>{});};
 if(type==='IMPORT_COMMIT'){if(!importNotification)importNotification=setTimeout(send,500);}
 else {if(importNotification)clearTimeout(importNotification);send();}
}
const runner=new FilterRunner(store,{changed:()=>{void runtime.sendMessage?.({type:'ARCHIVE_CHANGED'}).catch(()=>{});}});
const safety=new SafetyRunner(store);
const libraryRunner=new LibraryRunner(store);
// Original Organizer is cost-gated: capture, startup, timers, and rerenders may
// maintain local state but can never dispatch its remote provider.
const scheduleFilter=(options)=>{void safety.wake(options);void libraryRunner.wake(options);return runner.wake(options);};
runtime.onStartup?.addListener(()=>{void ready.then(()=>scheduleFilter()).catch(()=>{});});
runtime.onInstalled?.addListener(()=>{void ready.then(()=>scheduleFilter()).catch(()=>{});});
// Startup may reconcile an unknown prior outcome, but it never dispatches Original.
if(runtime.onStartup)void ready.then(()=>scheduleFilter()).catch(()=>{});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handle(request, sender)
    .then(data => {sendResponse({ ok: true, data });if((!request.type.startsWith('IMPORT_')||['IMPORT_COMMIT','IMPORT_COMPLETE','IMPORT_RESOLVE_BRANCH'].includes(request.type))&&!['GET_ONBOARDING','SET_ONBOARDING'].includes(request.type)&&!request.type.startsWith('PAIA_MEMORY_')&&!request.type.startsWith('PAIA_INTEGRITY_')&&!request.type.startsWith('PAIA_BACKUP_')&&request.type!=='GET_BOUNDED_ORGANIZER'&&request.type!=='GET_AI_PRESENTATION_STATUS'&&request.type!=='GET_ORIGINAL_ORGANIZER_STATUS'&&request.type!=='GET_DEEPSEEK_STATUS'&&request.type!=='FILTER_DIAGNOSTICS'&&!['SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK'].includes(request.type))void scheduleFilter({retry:['FILTER_RECOVER','FILTER_MODE'].includes(request.type)});if(!['PAIA_MEMORY_STATUS','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_MEMORY_ENTRIES'].includes(request.type)&&!request.type.startsWith('PAIA_INTEGRITY_')&&!['PAIA_BACKUP_BEGIN_EXPORT','PAIA_BACKUP_EXPORT_PAGE','PAIA_BACKUP_BEGIN_RESTORE','PAIA_BACKUP_STAGE','PAIA_BACKUP_PREVIEW','PAIA_BACKUP_CANCEL','GET_BOUNDED_ORGANIZER','GET_LIBRARY_REMOVED_TOPICS','GET_LIBRARY_RENAME_SUGGESTIONS','GET_LIBRARY_MERGE_SUGGESTIONS','GET_ORGANIZER_CONTROLS','GET_AI_PRESENTATION_REVISIONS','GET_AI_PRESENTATION_STATUS','GET_ORIGINAL_ORGANIZER_STATUS','GET_DEEPSEEK_STATUS','SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK','LIBRARY_UPDATES','LIBRARY_ORGANIZER_JOBS','GET_LIBRARY_UNPLACED','GET_LIBRARY_PLACEMENT','LIBRARY_INDEX_PAGE','TOPIC_DOCUMENT_PAGE','GET_LIBRARY_TOPIC','GET_LIBRARY_ENTRY','GET_LIBRARY_PATHS','GET_LIBRARY_PROVENANCE','GET_LIBRARY_REMOVED','SEARCH_LIBRARY','GET_LIBRARY_LAYOUT','GET_LIBRARY_FOUNDATION_STATUS','GET_LIBRARY_DUAL_VIEW_STATUS','PREVIEW_AI_LIBRARY_UPDATE','FILTER_DIAGNOSTICS','FILTER_STATUS','FILTER_NOTICE','FILTER_RECENT','SEARCH_INPUTS','GET_INPUT','GET_IA_STATUS','GET_REVISIONS','GET_THOUGHTS','GET_THOUGHT','GET_STATUS','GET_STATE','GET_PAGE','GET_MIGRATION_STATUS','RESPONSE_POLL','RESPONSE_VIEW','RESPONSE_ARM','DIAGNOSTIC','GET_ONBOARDING','SET_ONBOARDING','IMPORT_LATEST','IMPORT_CANCEL','IMPORT_CAPABILITIES','IMPORT_TASKS','IMPORT_STATUS','IMPORT_BEGIN','IMPORT_PREFLIGHT','IMPORT_READY','IMPORT_PAUSE'].includes(request.type))notifyArchiveChanged(request.type);})
    .catch(error => sendResponse({ ok: false, ...(['UPDATE_AI_PRESENTATION','UPDATE_ORIGINAL_LIBRARY_VIEW'].includes(request?.type)?{phase:'message_handler'}:{}), error: typeof request?.type==='string' && request.type.startsWith('IMPORT_') ? safeImportError(error) : ['UPDATE_AI_PRESENTATION','UPDATE_ORIGINAL_LIBRARY_VIEW'].includes(request?.type)&&!(error instanceof ArchiveError)?'INTERNAL_RUNTIME_ERROR':safeErrorCode(error) }));
  return true;
});
