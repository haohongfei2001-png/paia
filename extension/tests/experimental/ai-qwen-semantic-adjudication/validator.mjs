import {
  AUTHORSHIP, BOUNDARY, MODES, digest, sha256, requireThat, parseDocument,
  loadTrustedHeldout, sourceIdentity, pendingStatuses, expectedCoverage, graphemeBounds,
} from './trusted.mjs';
import {schema, checkSchema} from './schema.mjs';

const same = (actual, expected, code, path) => requireThat(digest(actual) === digest(expected), code, path);
const unique = (items, key, code, path) => {
  const seen = new Set();
  for (const item of items) {
    const value = key(item);
    requireThat(!seen.has(value), code, path);
    seen.add(value);
  }
};
const sameIds = (actual, expected, code, path) => {
  unique(actual, x => x, code, path);
  same([...actual].sort(), [...expected].sort(), code, path);
};
const sourceEntry = (data, topicId, entryId, path) => {
  const topic = data.corpus.topics.find(t => t.id === topicId);
  requireThat(Boolean(topic), 'UNKNOWN_TOPIC', path);
  const entry = topic.entries.find(e => e.id === entryId);
  requireThat(Boolean(entry), 'UNKNOWN_ENTRY_OR_WRONG_TOPIC', path); // MUTATION:ENTRY_IDENTITY
  return entry;
};

function verifyRef(ref, data, topicId, path) {
  requireThat(ref.topicId === topicId, 'REF_TOPIC', path);
  const entry = sourceEntry(data, topicId, ref.entryId, path);
  requireThat(ref.revision === entry.revision, 'REF_REVISION', path); // MUTATION:REF_REVISION
  requireThat(ref.bodyDigest === sha256(entry.body), 'REF_BODY_DIGEST', path); // MUTATION:REF_BODY_DIGEST
  requireThat(ref.sectionId === entry.sectionId, 'REF_SECTION', path);
  requireThat(ref.start < ref.end && ref.end <= entry.body.length, 'REF_RANGE', path);
  const boundaries = graphemeBounds(entry.body);
  requireThat(boundaries.has(ref.start) && boundaries.has(ref.end), 'REF_GRAPHEME', path); // MUTATION:REF_GRAPHEME
  requireThat(entry.body.slice(ref.start, ref.end) === ref.literal, 'REF_LITERAL', path); // MUTATION:REF_LITERAL
  requireThat(ref.spanDigest === sha256(ref.literal), 'REF_SPAN_DIGEST', path); // MUTATION:REF_SPAN_DIGEST
}
function verifyRefs(refs, data, topicId, path, primaryId = null) {
  unique(refs, r => JSON.stringify([r.topicId, r.entryId, r.revision, r.start, r.end]), 'DUPLICATE_REF', path);
  for (const [index, ref] of refs.entries()) verifyRef(ref, data, topicId, path + '[' + index + ']');
  if (primaryId) requireThat(refs.some(r => r.entryId === primaryId), 'MISSING_PRIMARY_EVIDENCE', path);
}

// This public helper also fixes its own trust source. A caller cannot supply
// replacement corpus bytes or make a self-rehashed foreign Entry authoritative.
export async function validateSupportRefs(refs, topicId) {
  checkSchema(refs, {type: 'array', items: schema.$defs.supportRef, minItems: 1, maxItems: 16, uniqueItems: true});
  checkSchema(topicId, {type: 'string', minLength: 1, maxLength: 128});
  const snapshot = structuredClone(refs);
  verifyRefs(snapshot, await loadTrustedHeldout(), topicId, '$.supportRefs');
  return {structure: 'VALID', validationScope: 'STRUCTURE_AND_EVIDENCE_BINDINGS_ONLY', semanticCorrectness: 'NOT_VERIFIED'};
}

function verifyRule(rule, data, topicId, primaryId, expectedStatus, path) {
  requireThat(rule.status === expectedStatus, 'RULE_STATUS', path); // MUTATION:RULE_STATUS
  verifyRefs(rule.supportRefs, data, topicId, path + '.supportRefs', primaryId);
}

export async function validateAdjudication(input) {
  const parsed = input instanceof Uint8Array ? parseDocument(input) : input;
  checkSchema(parsed);
  // Snapshot synchronously before the first await: later caller mutations
  // cannot smuggle unvalidated fields or change the evidence being reported.
  const doc = structuredClone(parsed);
  const data = await loadTrustedHeldout();
  same(doc.source, sourceIdentity(data), 'SOURCE_IDENTITY', '$.source');
  same(doc.statuses, pendingStatuses(), 'QUALIFICATION_STATUS', '$.statuses');
  same(doc.coverage, expectedCoverage(data), 'COVERAGE', '$.coverage'); // MUTATION:COVERAGE
  sameIds(doc.entries.map(e => e.entryId), data.corpus.topics.flatMap(t => t.entries.map(e => e.id)), 'ENTRY_COVERAGE', '$.entries'); // MUTATION:ENTRY_COVERAGE
  sameIds(doc.topics.map(t => t.topicId), data.corpus.topics.map(t => t.id), 'TOPIC_COVERAGE', '$.topics');

  let obligations = 0, annotations = 0, rules = 0, unresolvedDraftItems = 0, entriesWithUnresolved = 0;
  for (const [index, record] of doc.entries.entries()) {
    const path = '$.entries[' + index + ']';
    const entry = sourceEntry(data, record.topicId, record.entryId, path);
    requireThat(record.revision === entry.revision, 'ENTRY_REVISION', path);
    requireThat(record.bodyDigest === sha256(entry.body), 'ENTRY_BODY_DIGEST', path);
    requireThat(record.sectionId === entry.sectionId && record.lifecycle === entry.lifecycle, 'ENTRY_PLACEMENT', path);
    same(record.time, entry.time, 'ENTRY_TIME', path);
    const expectedStatus = record.unresolved.length ? 'UNRESOLVED' : 'DRAFT';
    requireThat(record.status === expectedStatus, 'ENTRY_STATUS', path);
    entriesWithUnresolved += Number(record.status === 'UNRESOLVED');
    for (const [name, list] of [
      ['mustPreserve', record.mustPreserve], ['mustNotInfer', record.mustNotInfer],
      ...MODES.map(mode => ['mayCompress.' + mode, record.mayCompress[mode]]),
      ['unresolved', record.unresolved],
    ]) {
      for (const [ruleIndex, rule] of list.entries()) {
        verifyRule(rule, data, record.topicId, entry.id, name === 'unresolved' ? 'UNRESOLVED' : 'DRAFT', path + '.' + name + '[' + ruleIndex + ']');
        rules++;
        unresolvedDraftItems += Number(rule.status === 'UNRESOLVED');
      }
    }
    const units = [
      {sourceKind: 'obligation', source: entry.obligation},
      ...entry.annotations.map(source => ({sourceKind: 'annotation', source})),
    ];
    unique(record.evidenceUnits, u => u.sourceKind + ':' + u.sourceId, 'DUPLICATE_EVIDENCE_UNIT', path);
    sameIds(record.evidenceUnits.filter(u => u.sourceKind === 'obligation').map(u => u.sourceId), [entry.obligation.id], 'OBLIGATION_COVERAGE', path); // MUTATION:OBLIGATION_COVERAGE
    sameIds(record.evidenceUnits.filter(u => u.sourceKind === 'annotation').map(u => u.sourceId), entry.annotations.map(a => a.id), 'ANNOTATION_COVERAGE', path); // MUTATION:ANNOTATION_COVERAGE
    for (const unit of record.evidenceUnits) {
      const spec = units.find(u => u.sourceKind === unit.sourceKind && u.source.id === unit.sourceId);
      requireThat(Boolean(spec), 'UNKNOWN_EVIDENCE_UNIT', path);
      verifyRefs(unit.supportRefs, data, record.topicId, path + '.evidenceUnits', entry.id);
      const ref = unit.supportRefs[0];
      requireThat(ref.start === spec.source.start && ref.end === spec.source.end, 'EVIDENCE_UNIT_SPAN', path);
      requireThat(unit.status === record.status, 'EVIDENCE_UNIT_STATUS', path);
      sameIds(unit.meaningRuleIndexes, record.mustPreserve.map((_, n) => n), 'EVIDENCE_RULE_COVERAGE', path);
      if (unit.sourceKind === 'obligation') obligations++;
      else annotations++;
    }
  }

  for (const [index, record] of doc.topics.entries()) {
    const path = '$.topics[' + index + ']';
    const topic = data.corpus.topics.find(t => t.id === record.topicId);
    requireThat(Boolean(topic), 'UNKNOWN_TOPIC', path);
    same(record.sections, topic.sections, 'TOPIC_SECTIONS', path);
    same(record.sourceFailureObligations, topic.failureObligations, 'FAILURE_OBLIGATIONS', path);
    const ownEntries = doc.entries.filter(e => e.topicId === record.topicId);
    const isUnresolved = ownEntries.some(e => e.status === 'UNRESOLVED') || record.relations.some(r => r.status === 'UNRESOLVED');
    requireThat(record.status === (isUnresolved ? 'UNRESOLVED' : 'DRAFT'), 'TOPIC_STATUS', path);
    for (const [relationIndex, relation] of record.relations.entries()) {
      verifyRefs(relation.supportRefs, data, topic.id, path + '.relations[' + relationIndex + ']');
      requireThat(new Set(relation.supportRefs.map(r => r.entryId)).size >= 2, 'RELATION_REQUIRES_MULTIPLE_ENTRIES', path);
      unresolvedDraftItems += Number(relation.status === 'UNRESOLVED');
    }
    sameIds([...new Set(record.relations.flatMap(r => r.supportRefs.map(s => s.entryId)))],
      topic.failureObligations.flatMap(o => o.entryIds), 'RELATION_COVERAGE', path);
  }

  unique(doc.adversarialCases, c => c.caseId, 'DUPLICATE_CASE', '$.adversarialCases');
  const categories = new Set(doc.adversarialCases.filter(c => c.semanticVerdict === 'REJECT').map(c => c.category));
  for (const required of ['NEGATION_FLIP', 'CONDITION_DROPPED', 'SUBJECT_MISMATCH', 'TIME_MISPLACED', 'FALSE_MERGE']) {
    requireThat(categories.has(required), 'ADVERSARIAL_CATEGORY_COVERAGE', '$.adversarialCases');
  }
  for (const [index, adversarial] of doc.adversarialCases.entries()) {
    const path = '$.adversarialCases[' + index + ']';
    verifyRefs(adversarial.supportRefs, data, adversarial.topicId, path + '.supportRefs');
    requireThat(adversarial.outputDigest === sha256(adversarial.outputText), 'OUTPUT_DIGEST', path);
    requireThat(adversarial.status === (adversarial.semanticVerdict === 'UNRESOLVED' ? 'UNRESOLVED' : 'DRAFT'), 'ADVERSARIAL_STATUS', path);
    unresolvedDraftItems += Number(adversarial.status === 'UNRESOLVED');
  }
  const {documentDigest, ...content} = doc;
  requireThat(documentDigest === digest(content), 'DOCUMENT_DIGEST'); // MUTATION:DOCUMENT_DIGEST
  return {
    version: 1, kind: 'PAIA_ADJUDICATION_VALIDATION_REPORT',
    structure: 'VALID', validationScope: 'STRUCTURE_AND_EVIDENCE_BINDINGS_ONLY',
    semanticCorrectness: 'NOT_VERIFIED', authorship: AUTHORSHIP, dataBoundary: BOUNDARY,
    sourceBaseCommit: doc.source.sourceBaseCommit, corpusDigest: doc.source.corpusDigest, documentDigest,
    counts: {
      topics: doc.topics.length, entries: doc.entries.length, obligations, annotations,
      draftRules: rules, relations: doc.topics.reduce((n, t) => n + t.relations.length, 0),
      adversarialCases: doc.adversarialCases.length,
      unresolvedDraftItems, entriesWithUnresolved,
      humanJudgments: 0, missingHumanEntryReviews: doc.entries.length,
    },
    statuses: pendingStatuses(),
    limitation: 'Valid bindings do not verify meaning, reviewer identity, private-text absence in authored prose, author preference, or model quality.',
  };
}
