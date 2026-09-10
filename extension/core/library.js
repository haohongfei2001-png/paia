import {ArchiveError} from './constants.js';

export function emptyLibrary() {
  return {documents: [], blocks: [], classificationRules: [], filterRules: []};
}
export function libraryText(block, records) {
  return block.libraryText ?? records.find(r => r.id === block.originalTextReference)?.originalText ?? '';
}
export function syncLibrary(state) {
  state.library ??= emptyLibrary();
  state.memoryAccessPolicy ??= {enabled: false, status: 'disabled'};
  const {documents, blocks} = state.library;
  for (const r of state.records) {
    let doc = documents.find(d => d.platform === r.platform && d.sourceConversationId === r.chatId);
    if (!doc) {
      doc = {id: `document:${r.id}`, platform: r.platform, sourceConversationId: r.chatId,
        originalConversationTitle: r.chatTitle, userTitle: '', summaryPlaceholder: '摘要预留 · 尚未整理',
        futureAISummary: null, firstSourceSentAt: null, lastSourceSentAt: null, sourceRecordIds: [], status: 'active', aiSuggestionStatus: 'none'};
      documents.push(doc);
    }
    if (!blocks.some(b => b.id === `block:${r.id}`)) {
      const edited = Boolean(r.editedText);
      blocks.push({id: `block:${r.id}`, documentId: doc.id, sourceRecordId: r.id,
        originalTextReference: r.id, libraryText: edited ? r.editedText : null,
        note: r.note || '', editedAt: edited ? r.updatedAt || r.capturedAt : null,
        excluded: Boolean(r.hidden || r.deletedAt), status: r.deletedAt ? 'excluded_legacy_trash' : r.hidden ? 'excluded_legacy_hidden' : 'active',
        provenance: [{sourceRecordId: r.id}], mergedSourceIds: [], aiSuggestionStatus: 'none'});
    }
  }
  for (const doc of documents) {
    const ids = new Set(blocks.filter(b => b.documentId === doc.id).flatMap(b => b.provenance.map(p => p.sourceRecordId)));
    const records = state.records.filter(r => ids.has(r.id));
    doc.sourceRecordIds = records.map(r => r.id);
    const times = records.map(r => r.sourceSentAt).filter(Boolean).sort();
    doc.firstSourceSentAt = times[0] || null;
    doc.lastSourceSentAt = times.at(-1) || null;
    doc.status = blocks.some(b => b.documentId === doc.id && !b.excluded) ? 'active' : 'excluded';
    if (!records.length) {
      doc.sourceConversationId = null;
      doc.originalConversationTitle = '';
    }
  }
  state.library.documents = documents.filter(d => blocks.some(b => b.documentId === d.id));
}
export function detachSources(state, removed) {
  const ids = new Set(removed.map(r => r.id));
  state.library.blocks = state.library.blocks.filter(b => {
    const hit = b.provenance.some(p => ids.has(p.sourceRecordId));
    if (!hit) return true;
    const authored = b.editedAt !== null || b.libraryText !== null || Boolean(b.note) || b.mergedSourceIds.length > 1 || b.provenance.length > 1;
    if (!authored) return false;
    b.provenance = b.provenance.filter(p => !ids.has(p.sourceRecordId));
    b.mergedSourceIds = b.mergedSourceIds.filter(id => !ids.has(id));
    if (ids.has(b.sourceRecordId)) b.sourceRecordId = null;
    if (ids.has(b.originalTextReference)) b.originalTextReference = null;
    return true;
  });
}
export function validateLibraryChanges(changes, document = false) {
  const fields = document ? ['userTitle'] : ['libraryText', 'note'];
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) || !Object.keys(changes).length ||
    Object.entries(changes).some(([k,v]) => !fields.includes(k) || typeof v !== 'string' || v.length > (document ? 300 : 200000))) throw new ArchiveError('INVALID_REQUEST');
  return changes;
}
export function documentBlocks(state, documentId, excluded = false) {
  return state.library.blocks.filter(b => b.documentId === documentId && b.excluded === excluded).map(b => {
    const r = state.records.find(r => r.id === b.sourceRecordId);
    return {...b, text: libraryText(b, state.records), sourceSentAt: r?.sourceSentAt || null,
      conversationOrder: r?.conversationOrder ?? null};
  }).sort((a,b) => {
    if (Boolean(a.sourceSentAt) !== Boolean(b.sourceSentAt)) return a.sourceSentAt ? -1 : 1;
    const time = a.sourceSentAt && b.sourceSentAt ? Date.parse(a.sourceSentAt) - Date.parse(b.sourceSentAt) : 0;
    return time || (a.conversationOrder ?? Infinity) - (b.conversationOrder ?? Infinity) || a.id.localeCompare(b.id);
  });
}
// Access layer only. No third fact store, automatic authorization, or AI calls.
export function memoryContext() { return {status: 'disabled', blocks: []}; }
