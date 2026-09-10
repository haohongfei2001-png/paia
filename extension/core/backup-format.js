import {memoryMetaAllowed,validateMemoryRow} from './memory/model.js';
import {ArchiveError} from './constants.js';
// PAIA Backup v1 is a domain interchange stream, not an IndexedDB store dump.
// Indexes, diagnostics, credentials, import staging and runnable jobs are absent.
export const BACKUP_VERSION=1, BACKUP_SCHEMA=5;
export const BACKUP_LIMITS=Object.freeze({lineBytes:8*1024*1024,restoreBytes:64*1024*1024,restoreItems:100000,chunkItems:40});
const fields=text=>text.split(' ');
export const BACKUP_SECTIONS=Object.freeze({
 sources:fields('id platform chatId chatUrl chatTitle sourceMessageId pageOrder originalText contentHash sourceKey dedupeKey sourceSentAt timeSource timeConfidence conversationOrder capturedAt importedAt importProvider importProfile importEvidence previousVersionId note editedText hidden deletedAt updatedAt timeCandidates attachmentPresence referencePresence'),
 inputDocuments:fields('id platform sourceConversationId originalConversationTitle userTitle summaryPlaceholder futureAISummary firstSourceSentAt lastSourceSentAt status aiSuggestionStatus titleRevision'),
 inputs:fields('id documentId sourceRecordId originalTextReference libraryText note editedAt excluded status provenance mergedSourceIds aiSuggestionStatus revision provenanceSignature userTitle branchStatus importOrigin userEdited'),
 inputStates:fields('id documentId contentRevision removalState filteringPolicyState sourceRecordIds deltaSequence sourcePurged lastRemovalSequence lastRemovalAt'),
 removals:fields('id blockId at reason'),
 timeEvidence:fields('id value'),
 filterIntents:fields('id keep reason at'),
 filterStates:fields('id documentId authorship userEdited filterOverride presence presenceInvalid evaluationRevision pendingKey decision reasonCode filterVersion policyVersion classifierVersion basedOnContentRevision evaluatedAt failed overrideReason overrideAt filteredKey'),
 entries:fields('id storageSchema title body note family type formation origin revision contentRevision fieldRevisions organizationRevision dependencyRevision createdAt updatedAt createdSequence updatedSequence meaningfulContentAt hasHumanAction userEdited protections authorship organizationIntents lifecycle freshness integrity staleReasons sourceRecordIds inputRefs exactSignature exactKey topics types provenanceType removedAt removedSequence restoredAt deletionOperationId suppressionId quarantineSealed quarantineKey legacyHumanEvidence staleReason generationId generator'),
 topics:fields('id defaultSectionId name summary sourceRecordIds revision organizationRevision activeLayoutGeneration pinKey pinRank negativeUpdatedSequence lifecycle createdBy createdAt updatedAt protections authorship hasHumanAction userEdited redirectTo layoutSequence removalOperationId removedAt'),
 sections:fields('id topicId layoutGeneration sectionId isDefault title rank revision lifecycle protections authorship sourceRecordIds redirectTo hasHumanAction userEdited'),
 placements:fields('id topicId layoutGeneration entryId sectionId rank sectionRank revision lifecycle membershipAuthorship sectionProtection orderProtection sourceRecordIds membershipOperationId excludedByUser removedWithTopicOperationId'),
 evidence:fields('id ownerKind ownerId generationId inputId basedOnContentRevision actualVersion role contributionType formation generatedAt generator inputAuthorshipAtUse entryFieldAuthorshipAtCommit sourceRecordIds sourceIdentityTokens scopeToken versionToken span availability contributionKey'),
 dependencies:fields('id inputId inputList thoughtId targetKind targetId eligibilityEpochAtUse basedOnContentRevision selectedFields fieldDigests validatedAgainstContentRevision status roles sourceRecordIds scopeToken versionToken'),
 revisions:fields('id kind entityId before after fieldMask actor reason important operationId baseRevision afterRevision sourceRecordIds entityKey documentId sequence at windowStartedAt listKey documentList layoutJobId'),
 suppressions:fields('id deletedEntryId scopeTokens exactSignature status reason createdAt deletedAt operationId sourceRecordIds restoredAt lineageId removedAt scopeVersion evidenceVersionTokens noveltyRuleVersion'),
 relations:fields('id fromEntryId toEntryId kind relationKey sourceRecordIds createdAt actor operationId'),
 completedLayouts:fields('id kind stateKey state sequence phase cursor operationId layoutKind sourceId targetId sourceGeneration targetGeneration newGeneration sourceRevision targetRevision aPosition bPosition orderSequence sectionId targetSectionId aRank bRank sourceDefault targetDefault sourceRecordIds completedTargetRevision completedSourceRevision restored undoTargetRevision undoSourceRevision'),
 receipts:fields('id namespace schemaVersion ownerId operationSequence createdAt digest result'),
 deletionFences:fields('id sequence value'),
 organizationState:fields('id data'),
 settings:fields('id preferences memoryAccessPolicy classificationRules filterRules')
});
export const BACKUP_META_KEYS=new Set(['thought-suppression-key','thought-sequence','revision-sequence','input-delta-sequence','thought-epoch','organizer-controls','originalOrganizerCheckpoint','aiOrganizerCheckpoint','originalOrganizerBootstrap','organizer-budget','smart-filter']);
export const backupMetaAllowed=id=>memoryMetaAllowed(id)||BACKUP_META_KEYS.has(id)||id.startsWith('aiPresentation:')||id.startsWith('topicKeepSeparate:');
export const backupError=code=>{throw new ArchiveError(code);};
export const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function safeJSON(value,depth=0){if(depth>32)backupError('BACKUP_INVALID');if(typeof value==='number'&&!Number.isFinite(value))backupError('BACKUP_INVALID');if(value===null||['string','number','boolean'].includes(typeof value))return;if(Array.isArray(value)){if(value.length>100000)backupError('BACKUP_INVALID');for(const v of value)safeJSON(v,depth+1);return;}if(!plain(value))backupError('BACKUP_INVALID');for(const [key,v]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key)||/^(api.?key|credentials?|authorization|password|access.?token)$/i.test(key))backupError('BACKUP_INVALID');safeJSON(v,depth+1);}}
export function projectBackupEntity(section,value){const result={};for(const key of BACKUP_SECTIONS[section])if(value[key]!==undefined)result[key]=structuredClone(value[key]);if(section==='entries'&&typeof result.title==='string'&&!result.title.trim())delete result.title;return result;}
export function validateBackupHeader(row){safeJSON(row);if(!plain(row)||row.type!=='header'||row.format!=='PAIA Backup'||row.formatVersion!==BACKUP_VERSION||row.schemaVersion!==BACKUP_SCHEMA||typeof row.appVersion!=='string'||!/^0\.(7|8|9|10|11)\.\d+(\.\d+)?$/.test(row.appVersion)||!Number.isFinite(Date.parse(row.createdAt))||JSON.stringify(row.contentSections)!==JSON.stringify(Object.keys(BACKUP_SECTIONS)))backupError('BACKUP_VERSION_UNSUPPORTED');return row;}
export const IMPORT_EVIDENCE_FIELDS=['id','sourceKey','provider','profileId','profileVersion','branch','parentSourceKey','conflict'];
export const projectImportEvidence=row=>Object.fromEntries(IMPORT_EVIDENCE_FIELDS.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
export function validateBackupItem(row){safeJSON(row);if(!plain(row)||row.type!=='item'||!Object.hasOwn(BACKUP_SECTIONS,row.section)||!plain(row.value)||typeof row.value.id!=='string'||!row.value.id.length||row.value.id.length>500||Object.keys(row).some(k=>!['type','section','value','order','state','working'].includes(k))||Object.keys(row.value).some(k=>!BACKUP_SECTIONS[row.section].includes(k)))backupError('BACKUP_INVALID');
 if(row.order!==undefined&&(!Number.isSafeInteger(row.order)||row.order<0))backupError('BACKUP_INVALID');
 if(row.section==='sources'&&(row.value.platform!=='chatgpt'||typeof row.value.originalText!=='string'||!/^https:\/\/chatgpt\.com\/c\/[^/?#]+$/.test(row.value.chatUrl)||!Number.isSafeInteger(row.order)))backupError('BACKUP_INVALID');
 if(row.section==='sources'&&row.value.importEvidence!==undefined){const e=row.value.importEvidence;if(!plain(e)||Object.keys(e).some(k=>!IMPORT_EVIDENCE_FIELDS.includes(k))||e.id!==row.value.sourceKey||e.sourceKey!==row.value.sourceKey||!/^([a-f0-9]{64})$/.test(e.sourceKey)||e.provider!=='official_export'||e.parentSourceKey===e.sourceKey||e.conflict&&e.branch!=='ambiguous'||!['current','other','ambiguous'].includes(e.branch)||e.parentSourceKey!==null&&!/^[a-f0-9]{64}$/.test(e.parentSourceKey)||typeof e.conflict!=='boolean'||e.profileId!==undefined&&(typeof e.profileId!=='string'||!/^[-a-z0-9]{1,80}$/.test(e.profileId))||e.profileVersion!==undefined&&(!Number.isInteger(e.profileVersion)||e.profileVersion<1||e.profileVersion>1000))backupError('BACKUP_INVALID');}
 if(row.section==='inputs'&&(!Array.isArray(row.value.provenance)||typeof row.value.documentId!=='string'||!Number.isSafeInteger(row.order)))backupError('BACKUP_INVALID');
 if(row.section==='inputDocuments'&&(!Number.isSafeInteger(row.order)||!plain(row.working)||row.working.id!==row.value.id||Object.keys(row.working).some(k=>!BACKUP_SECTIONS.inputDocuments.includes(k))))backupError('BACKUP_INVALID');
 if(row.section==='entries'&&(row.value.storageSchema!==2||typeof row.value.body!=='string'||!Array.isArray(row.value.sourceRecordIds)||!plain(row.value.protections)))backupError('BACKUP_INVALID');
 if(row.section==='organizationState'&&(!backupMetaAllowed(row.value.id)||!plain(row.value.data)||row.value.data.id!==row.value.id))backupError('BACKUP_INVALID');
 if(row.section==='organizationState'&&row.value.id.startsWith('memory:')&&!validateMemoryRow(row.value.data))backupError('BACKUP_INVALID');
 if(row.section==='settings'&&row.value.id!=='preferences')backupError('BACKUP_INVALID');
 return row;
}
export async function backupHash(previous,value){const data=new TextEncoder().encode(previous+'\n'+JSON.stringify(value)),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',data));return [...digest].map(x=>x.toString(16).padStart(2,'0')).join('');}
export class BackupValidator {
 constructor(){this.header=null;this.hash='';this.count=0;this.counts=Object.fromEntries(Object.keys(BACKUP_SECTIONS).map(k=>[k,0]));this.seen=new Set();this.complete=false;this.bytes=0;}
 async add(row){const size=new TextEncoder().encode(JSON.stringify(row)).length;this.bytes+=size;if(size>BACKUP_LIMITS.lineBytes||this.bytes>BACKUP_LIMITS.restoreBytes||this.count>BACKUP_LIMITS.restoreItems)backupError('BACKUP_TOO_LARGE');if(this.complete)backupError('BACKUP_INVALID');
  if(!this.header){this.header=validateBackupHeader(row);this.hash=await backupHash('',row);return;}
  if(row.type==='footer'){safeJSON(row);if(row.itemCount!==this.count||JSON.stringify(row.sectionCounts)!==JSON.stringify(this.counts)||row.integrity?.algorithm!=='SHA-256-chain'||row.integrity.root!==this.hash)backupError('BACKUP_INTEGRITY_FAILED');this.complete=true;return;}
  validateBackupItem(row);const key=row.section+':'+row.value.id;if(this.seen.has(key))backupError('BACKUP_INVALID');this.seen.add(key);this.count++;this.counts[row.section]++;this.hash=await backupHash(this.hash,row);
 }
 preview(){if(!this.complete)backupError('BACKUP_INCOMPLETE');return {createdAt:this.header.createdAt,appVersion:this.header.appVersion,formatVersion:this.header.formatVersion,schemaVersion:this.header.schemaVersion,counts:{inputs:this.counts.inputs,topics:this.counts.topics,entries:this.counts.entries,revisions:this.counts.revisions,sources:this.counts.sources},itemCount:this.count,bytes:this.bytes,integrity:this.hash};}
}
