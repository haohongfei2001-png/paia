// Additive physical v5 schema. The old stores/keys remain intact.
export const LIBRARY_STORES = Object.freeze(['topics','sections','placements','provenance','thoughtSuppressions','organizerJobs','organizerWorkItems','organizerSuggestions','entryRelations','librarySearchTerms','libraryMigrationItems','organizerUsage']);
const multi = path => ({path, multiEntry:true});
const unique = path => ({path, unique:true});
export const LIBRARY_INDEXES = Object.freeze({
 thoughts:{byQuarantine:['quarantineKey','id'],byLifecycle:['lifecycleKey','id'],byExact:'exactKey',byType:['type','id'],byUpdated:['activeKey','negativeUpdatedSequence','id']},
 dependencies:{byTarget:['targetKind','targetId','id'],byInputTarget:['inputId','targetKind','targetId','id'],bySource:multi('sourceRecordIds')},
 revisions:{byOperation:'operationId',byEntitySequence:['entityKey','sequence']},
 operationReceipts:{byOwner:['namespace','ownerId','operationSequence'],byCreated:['createdAt','id']},
 invalidations:{byPending:['stateKey','sequence','id'],byInputSequence:['inputId','sequence','id'],bySequence:unique('sequence')},
 topics:{byIndex:['activeKey','pinKey','pinRank','negativeUpdatedSequence','id'],byName:'nameKey',byRedirect:'redirectTo'},
 sections:{byTopicOrder:['topicId','layoutGeneration','activeKey','rank','sectionId'],bySection:['sectionId','layoutGeneration'],byRedirect:'redirectTo'},
 placements:{byTopicEntry:unique(['topicId','layoutGeneration','entryId']),byEntry:['entryId','topicId','layoutGeneration'],bySectionOrder:['topicId','layoutGeneration','sectionId','activeKey','rank','entryId'],byTopicOrder:['topicId','layoutGeneration','activeKey','sectionRank','rank','entryId']},
 provenance:{byOwner:['ownerKind','ownerId','id'],byInputVersion:['inputId','basedOnContentRevision','id'],bySource:multi('sourceRecordIds'),byContribution:unique('contributionKey')},
 thoughtSuppressions:{byEntry:'deletedEntryId',byScope:multi('scopeTokens'),byExact:'exactSignature',byStatus:['status','id']},
 organizerJobs:{byMaintenance:['kind','stateKey','sequence','id'],byReady:['stateKey','nextAttemptAt','priority','sequence','id'],byDedupe:unique('dedupeKey'),byParent:['parentJobId','sequence','id'],bySource:multi('sourceRecordIds')},
 organizerWorkItems:{byJob:['jobId','stateKey','sequence','id'],byInput:multi('inputIds'),bySource:multi('sourceRecordIds')},
 organizerSuggestions:{byTarget:['targetKind','targetId','statusKey','sequence','id'],byTopic:multi('topicStatusKeys'),byStatus:['statusKey','sequence','id'],byLogicalKey:'logicalKey',bySource:multi('sourceRecordIds')},
 entryRelations:{byFrom:['fromEntryId','kind','id'],byTo:['toEntryId','kind','id'],byIdentity:unique('relationKey'),bySource:multi('sourceRecordIds')},
 librarySearchTerms:{byToken:['tokenHash','ownerKind','ownerId','field'],byOwner:['ownerKind','ownerId','id'],bySource:multi('sourceRecordIds')},
 libraryMigrationItems:{byStatus:['statusKey','entityKind','id'],bySource:multi('sourceRecordIds')},
 organizerUsage:{byJob:['jobId','sequence','id'],byWindow:multi('windowIds'),byState:['kind','stateKey','sequence','id'],byCreated:['kind','createdAt','id']}
});
export function upgradeLibrarySchema(transaction) {
 for (const [name, indexes] of Object.entries(LIBRARY_INDEXES)) {
  const store = transaction.objectStore(name);
  for (const [index, definition] of Object.entries(indexes)) {
   const spec = typeof definition === 'object' && !Array.isArray(definition) ? definition : {path:definition};
   if (!store.indexNames.contains(index)) store.createIndex(index,spec.path,{unique:spec.unique===true,multiEntry:spec.multiEntry===true});
  }
 }
}
