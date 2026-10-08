import {ArchiveError} from './constants.js';

// Retired public commands stay explicit so old pages cannot reopen removed
// products. Read/restore/revoke commands are intentionally not in this list.
const retired = new Set([
  'PAIA_BACKUP_BEGIN_EXPORT','PAIA_BACKUP_EXPORT_PAGE',
  'PAIA_CONTEXT_MANUAL','PAIA_CONTEXT_BIND','PAIA_MEMORY_PROFILE',
  'PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_PASSPORT_CREATE',
  'PAIA_PRODUCT_SIGNAL','PAIA_CORE_LOOP_ACTION','RESPONSE_VIEW','RESPONSE_ARM',
]);
const aiUnavailable = new Set([
  'GET_DEEPSEEK_STATUS','SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK',
  'START_BOUNDED_ORGANIZER','UPDATE_AI_PRESENTATION','GET_AI_PRESENTATION_SCOPE',
  'UPDATE_ORIGINAL_LIBRARY_VIEW','SET_ORIGINAL_LIBRARY_AUTO_UPDATE','PREVIEW_AI_LIBRARY_UPDATE',
]);
const retiredMemorySettings = new Set(['budget','retentionDays','onboarded','includeUnorganizedInputs']);
const retiredOrganizerSettings = new Set(['dailyRequests','batchMode','aiOnboardingSeen']);
export function unavailableFeatureCode(request = {}) {
  if (retired.has(request.type)) return 'FEATURE_UNAVAILABLE';
  if (aiUnavailable.has(request.type)) return 'AI_SERVICE_UNAVAILABLE';
  if (request.type === 'CONTINUE_THINKING' && Object.hasOwn(request.thought || {}, 'relation')) return 'FEATURE_UNAVAILABLE';
  if (request.type === 'PAIA_MEMORY_AUTHORIZE' && request.options?.decision === 'allowed') return 'FEATURE_UNAVAILABLE';
  if (request.type === 'PAIA_MEMORY_SETTINGS' && request.options?.externalAccess === true) return 'FEATURE_UNAVAILABLE';
  if (request.type === 'PAIA_MEMORY_SETTINGS' && Object.keys(request.options || {}).some(key => retiredMemorySettings.has(key))) return 'FEATURE_UNAVAILABLE';
  if (request.type === 'SET_ORGANIZER_CONTROLS' && Object.keys(request.changes || {}).some(key => retiredOrganizerSettings.has(key))) return 'AI_SERVICE_UNAVAILABLE';
  if (request.type === 'PAIA_PRODUCT_SETTINGS' && request.settings?.enabled !== false) return 'FEATURE_UNAVAILABLE';
  return null;
}
export function assertFeatureAvailable(request) {
  const code = unavailableFeatureCode(request);
  if (code) throw new ArchiveError(code);
}
