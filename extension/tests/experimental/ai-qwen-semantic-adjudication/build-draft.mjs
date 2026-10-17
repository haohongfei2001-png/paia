import {entryDrafts, topicDrafts} from './draft-content.mjs';
import {adversarialDrafts} from './adversarial-content.mjs';
import {
  AUTHORSHIP, BOUNDARY, MODES, digest, sha256, requireThat,
  loadTrustedHeldout, sourceIdentity, pendingStatuses, expectedCoverage,
} from './trusted.mjs';

// These selectors are authoring conveniences over the existing frozen corpus.
// Serialized source refs always contain the actual IDs, revisions and offsets.
function reference(data, topicId, entryId, literal, start = null, end = null) {
  const topic = data.corpus.topics.find(t => t.id === topicId);
  const entry = topic?.entries.find(e => e.id === entryId);
  requireThat(Boolean(entry), 'AUTHORING_ENTRY');
  if (start === null) {
    start = entry.body.indexOf(literal);
    requireThat(start >= 0 && entry.body.indexOf(literal, start + 1) === -1, 'AUTHORING_QUOTE');
    end = start + literal.length;
  } else literal = entry.body.slice(start, end);
  return {
    topicId, entryId, revision: entry.revision, bodyDigest: sha256(entry.body),
    sectionId: entry.sectionId, start, end, literal, spanDigest: sha256(literal),
  };
}
const uniqueBy = (rows, field) => requireThat(new Set(rows.map(r => r[field])).size === rows.length, 'AUTHORING_DUPLICATE');

export async function buildDraft() {
  const data = await loadTrustedHeldout();
  uniqueBy(entryDrafts, 'entryId');
  uniqueBy(topicDrafts, 'topicId');
  const expectedEntryIds = data.corpus.topics.flatMap(t => t.entries.map(e => e.id));
  requireThat(digest(entryDrafts.map(e => e.entryId).sort()) === digest([...expectedEntryIds].sort()), 'AUTHORING_COVERAGE');
  requireThat(digest(topicDrafts.map(t => t.topicId).sort()) === digest(data.corpus.topics.map(t => t.id).sort()), 'AUTHORING_COVERAGE');
  const bindQuotes = (topicId, quotes) => quotes.map(q => reference(data, topicId, q.entryId, q.literal));
  const rule = (topicId, raw, status = 'DRAFT') => ({
    authorship: AUTHORSHIP, status, text: raw.text, supportRefs: bindQuotes(topicId, raw.quotes),
  });
  const entries = data.corpus.topics.flatMap(topic => topic.entries.map(entry => {
    const authored = entryDrafts.find(e => e.entryId === entry.id);
    const status = authored.unresolved.length ? 'UNRESOLVED' : 'DRAFT';
    const evidenceUnits = [
      {sourceKind: 'obligation', source: entry.obligation},
      ...entry.annotations.map(source => ({sourceKind: 'annotation', source})),
    ].map(({sourceKind, source}) => ({
      sourceKind, sourceId: source.id, authorship: AUTHORSHIP, status,
      supportRefs: [reference(data, topic.id, entry.id, null, source.start, source.end)],
      meaningRuleIndexes: authored.mustPreserve.map((_, index) => index),
    }));
    return {
      topicId: topic.id, entryId: entry.id, revision: entry.revision,
      bodyDigest: sha256(entry.body), sectionId: entry.sectionId, lifecycle: entry.lifecycle,
      time: structuredClone(entry.time), authorship: AUTHORSHIP, status, evidenceUnits,
      mustPreserve: authored.mustPreserve.map(r => rule(topic.id, r)),
      mayCompress: Object.fromEntries(MODES.map(mode => [mode, authored.mayCompress[mode].map(r => rule(topic.id, r))])),
      mustNotInfer: authored.mustNotInfer.map(r => rule(topic.id, r)),
      unresolved: authored.unresolved.map(r => rule(topic.id, r, 'UNRESOLVED')),
    };
  }));
  const topics = data.corpus.topics.map(topic => {
    const authored = topicDrafts.find(t => t.topicId === topic.id);
    const relations = authored.relations.map(r => ({kind: r.kind, ...rule(topic.id, r, r.status)}));
    const unresolved = relations.some(r => r.status === 'UNRESOLVED') || entries.some(e => e.topicId === topic.id && e.status === 'UNRESOLVED');
    return {
      topicId: topic.id, authorship: AUTHORSHIP, status: unresolved ? 'UNRESOLVED' : 'DRAFT',
      sections: structuredClone(topic.sections),
      sourceFailureObligations: structuredClone(topic.failureObligations), relations,
    };
  });
  const adversarialCases = adversarialDrafts.map(c => ({
    caseId: c.caseId, topicId: c.topicId, authorship: AUTHORSHIP,
    status: c.verdict === 'UNRESOLVED' ? 'UNRESOLVED' : 'DRAFT',
    category: c.category, style: c.style, outputText: c.outputText, outputDigest: sha256(c.outputText),
    supportRefs: bindQuotes(c.topicId, c.evidenceQuotes), expectedReferenceValidation: 'PASS_BINDINGS_ONLY',
    semanticVerdict: c.verdict, reason: c.reason, perStyle: {...c.perStyle},
  }));
  const doc = {
    version: 1, kind: 'PAIA_HELDOUT_SEMANTIC_ADJUDICATION_DRAFT',
    authorship: AUTHORSHIP, dataBoundary: BOUNDARY,
    source: sourceIdentity(data), statuses: pendingStatuses(), coverage: expectedCoverage(data),
    topics, entries, adversarialCases,
  };
  return {...doc, documentDigest: digest(doc)};
}
