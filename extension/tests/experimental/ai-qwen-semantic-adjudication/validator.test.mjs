import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {buildDraft} from './build-draft.mjs';
import {digest, AUTHORSHIP, BOUNDARY, SOURCE_BASE} from './trusted.mjs';

// Only tests can select a copied mutant module. The actual validator has no
// alternate corpus, schema, input authority or disabled-check configuration.
const moduleRoot = process.env.PAIA_SEMANTIC_TEST_MODULE_DIR
  ? pathToFileURL(resolve(process.env.PAIA_SEMANTIC_TEST_MODULE_DIR) + '/')
  : new URL('./', import.meta.url);
const {validateAdjudication, validateSupportRefs} = await import(new URL('validator.mjs', moduleRoot));
const {schema} = await import(new URL('schema.mjs', moduleRoot));
const rawDigest = value => createHash('sha256').update(value).digest('hex');
const corpus = JSON.parse(await readFile(new URL('../../fixtures/ai-qwen-offline-v1/held-out-root-v1.json', import.meta.url)));
const sourceEntries = corpus.topics.flatMap(topic => topic.entries.map(entry => ({topic, entry})));
let draftPromise;
const fresh = async () => structuredClone(await (draftPromise ??= buildDraft()));
const seal = document => {
  const {documentDigest, ...content} = document;
  document.documentDigest = digest(content);
  return document;
};
const entryRow = (document, entryId) => document.entries.find(entry => entry.entryId === entryId);
const firstRef = document => document.entries[0].mustPreserve[0].supportRefs[0];
const unresolvedEntry = document => {
  const entry = document.entries.find(item => item.unresolved.length > 0);
  assert.ok(entry, 'baseline explicitly contains an unresolved evidence question');
  return entry;
};

function reference(entryId, start = 0, end = null) {
  const found = sourceEntries.find(item => item.entry.id === entryId);
  assert.ok(found, 'test references an existing frozen Entry');
  const {entry, topic} = found;
  end ??= entry.body.length;
  const literal = entry.body.slice(start, end);
  return {
    topicId: topic.id, entryId, revision: entry.revision, bodyDigest: rawDigest(entry.body),
    sectionId: entry.sectionId, start, end, literal, spanDigest: rawDigest(literal),
  };
}

async function invalid(mutator, codes, {reseal = true} = {}) {
  const document = await fresh();
  await mutator(document);
  if (reseal) seal(document);
  await assert.rejects(validateAdjudication(document), error => {
    assert.ok([].concat(codes).includes(error.code), `expected ${[].concat(codes).join('/')} but received ${error.code}`);
    return true;
  });
}

test('complete existing held-out draft validates from bytes and objects with exact denominators and pending human/model status', async () => {
  const document = await fresh();
  const first = await validateAdjudication(document);
  const second = await validateAdjudication(Buffer.from(JSON.stringify(document)));
  assert.deepEqual(first, second);
  assert.equal(first.structure, 'VALID');
  assert.equal(first.validationScope, 'STRUCTURE_AND_EVIDENCE_BINDINGS_ONLY');
  assert.equal(first.semanticCorrectness, 'NOT_VERIFIED');
  assert.equal(first.authorship, AUTHORSHIP);
  assert.equal(first.dataBoundary, BOUNDARY);
  assert.equal(first.sourceBaseCommit, SOURCE_BASE);
  assert.equal(document.source.corpusRuntimeBase, corpus.runtimeBase);
  assert.notEqual(document.source.sourceBaseCommit, document.source.corpusRuntimeBase);
  assert.equal(first.counts.topics, 12);
  assert.equal(first.counts.entries, 36);
  assert.equal(first.counts.obligations, 36);
  assert.equal(first.counts.annotations, 36);
  assert.equal(first.counts.adversarialCases, 16);
  assert.equal(first.counts.humanJudgments, 0);
  assert.equal(first.counts.missingHumanEntryReviews, 36);
  assert.ok(first.counts.unresolvedDraftItems > 0);
  assert.ok(first.counts.entriesWithUnresolved > 0);
  assert.deepEqual(first.statuses, {
    independentHumanReview: 'NOT_RUN', authorAcceptance: 'NOT_RUN',
    modelQualityQualification: 'NOT_RUN', modelExecution: 'NOT_RUN',
    semanticReference: 'AI_AUTHORED_DRAFT', populationClaim: 'NO_POPULATION_CLAIM',
  });
  assert.deepEqual(document.coverage.entryIds, sourceEntries.map(({entry}) => entry.id));
  assert.deepEqual(document.coverage.obligationIds, sourceEntries.map(({entry}) => entry.obligation.id));
  assert.deepEqual(document.coverage.annotationIds, sourceEntries.flatMap(({entry}) => entry.annotations.map(a => a.id)));
  for (const name of ['excludedEntryIds', 'removedEntryIds', 'unavailableEntryIds', 'exactDedupedEntryIds']) assert.deepEqual(document.coverage[name], []);
  assert.ok(!Object.hasOwn(first, 'score'));
  assert.ok(!Object.hasOwn(first.counts, 'semanticErrors'));
  assert.match(first.limitation, /do not verify meaning/);
});

test('frozen corpus, frozen contract and existing formatter/readback bytes stay unchanged after validation', async () => {
  const paths = [
    '../../fixtures/ai-qwen-offline-v1/calibration.json',
    '../../fixtures/ai-qwen-offline-v1/freeze.json',
    '../../fixtures/ai-qwen-offline-v1/held-out-root-v1.json',
    '../../fixtures/ai-qwen-offline-v1/held-out-root-freeze.json',
    '../../fixtures/ai-qwen-offline-v1/review-contract.json',
    '../ai-qwen-offline/artifacts.mjs', '../ai-qwen-offline/blind/formatter.mjs',
    '../ai-qwen-offline/blind/readback.mjs', '../ai-qwen-offline/blind/run.mjs',
  ];
  const snapshot = async () => Promise.all(paths.map(async path => [path, rawDigest(await readFile(new URL(path, import.meta.url)))]));
  const before = await snapshot();
  await validateAdjudication(await fresh());
  assert.deepEqual(await snapshot(), before);
});

test('validation has no model fetch or evaluation callback', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('NETWORK_FORBIDDEN_IN_OFFLINE_TEST'); };
  try { assert.equal((await validateAdjudication(await fresh())).structure, 'VALID'); }
  finally { globalThis.fetch = previous; }
});

test('schema is immutable at every reachable object and array', () => {
  const inspect = value => {
    if (!value || typeof value !== 'object') return;
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) inspect(child);
  };
  inspect(schema);
});

test('mutation guard: strict JSON duplicate keys', async () => {
  const document = await fresh();
  const text = JSON.stringify(document).replace('"version":1,', '"version":999,"version":1,');
  await assert.rejects(validateAdjudication(Buffer.from(text)), error => error.code === 'JSON_DUPLICATE_KEY');
});

test('escaped duplicate keys and nested duplicate keys are rejected before last-value JSON normalization', async () => {
  const document = await fresh();
  const text = JSON.stringify(document);
  for (const changed of [
    text.replace('"version":1,', '"ver\\u0073ion":1,"version":1,'),
    text.replace('"revision":0,', '"revision":1,"revision":0,'),
  ]) await assert.rejects(validateAdjudication(Buffer.from(changed)), error => error.code === 'JSON_DUPLICATE_KEY');
});

test('mutation guard: numeric lexemes cannot lose precision before integer and digest checks', async () => {
  const text = JSON.stringify(await fresh());
  for (const [before, after] of [
    ['"revision":0', '"revision":1e-9999'],
    ['"end":26', '"end":26.0000000000000001'],
    ['"version":1', '"version":1.0000000000000001'],
    ['"revision":0', '"revision":-0'],
    ['"version":1', '"version":1e0'],
    ['"revision":0', '"revision":1e999'],
    ['"revision":0', '"revision":9007199254740993'],
  ]) {
    assert.ok(text.includes(before), 'lexical negative must mutate a real numeric field');
    const changed = text.replace(before, after);
    // No resealing: lossy JSON.parse previously turned each form into the
    // original parsed integer and incorrectly preserved the original digest.
    await assert.rejects(validateAdjudication(Buffer.from(changed)), error => error.code === 'JSON_NUMBER_FORMAT');
  }
});

test('numbers, quotes and backslashes inside prose strings remain literal text rather than numeric tokens', async () => {
  const document = await fresh();
  document.entries[0].mustPreserve[0].text += ' Numeric notation is quoted text: 1e-9999, 26.0000000000000001, -0, \\"version\\":1.0000000000000001.';
  const report = await validateAdjudication(Buffer.from(JSON.stringify(seal(document))));
  assert.equal(report.structure, 'VALID');
  assert.equal(report.semanticCorrectness, 'NOT_VERIFIED');
});

test('invalid UTF8, empty, truncated, trailing, non-JSON and over-limit input bytes refuse', async () => {
  const valid = Buffer.from(JSON.stringify(await fresh()));
  for (const bytes of [
    Buffer.alloc(0), Buffer.from([0xff, 0xfe]), valid.subarray(0, valid.length - 1),
    Buffer.concat([valid, Buffer.from(' true')]), Buffer.from('{"n":NaN}'),
    Buffer.alloc(1024 * 1024 + 1, 32),
  ]) await assert.rejects(validateAdjudication(bytes), error => error.code === 'INVALID_JSON');
});

test('invalid scalar and container roots refuse as schema type errors', async () => {
  for (const value of [null, true, 1, '', [], 'draft']) {
    await assert.rejects(validateAdjudication(value), error => error.code === 'SCHEMA_TYPE');
  }
});

test('mutation guard: AI authorship cannot become human authorship', async () => {
  await invalid(document => { document.entries[0].mustPreserve[0].authorship = 'HUMAN_AUTHOR'; }, 'SCHEMA_CONST');
});

test('mutation guard: closed schema rejects nested model ratings', async () => {
  await invalid(document => { document.entries[0].mustPreserve[0].ratings = {semantic_fidelity: 5, ownership: 5}; }, 'UNKNOWN_FIELD');
});

test('unknown fields at root, source, Entry, ref, time, coverage, relation and adversarial levels refuse', async () => {
  const paths = [
    d => d, d => d.source, d => d.entries[0], d => firstRef(d), d => d.entries[0].time,
    d => d.coverage, d => d.topics[0].relations[0], d => d.adversarialCases[0],
    d => d.entries[0].mayCompress, d => d.entries[0].evidenceUnits[0],
  ];
  for (const select of paths) await invalid(document => { select(document).unexpected = 'forged'; }, 'UNKNOWN_FIELD');
});

test('required identity, source, meaning, evidence, style and status fields cannot be absent', async () => {
  const deletions = [
    d => { delete d.authorship; }, d => { delete d.source.corpusDigest; },
    d => { delete d.entries[0].revision; }, d => { delete d.entries[0].mustPreserve; },
    d => { delete firstRef(d).spanDigest; }, d => { delete d.entries[0].time.iso; },
    d => { delete d.entries[0].mayCompress.original; }, d => { delete d.statuses.authorAcceptance; },
    d => { delete d.coverage.humanReviewMissingEntryIds; }, d => { delete d.adversarialCases[0].reason; },
  ];
  for (const mutate of deletions) await invalid(mutate, 'MISSING_FIELD');
  await invalid(d => { delete d.documentDigest; }, 'MISSING_FIELD', {reseal: false});
});

test('null, empty required meaning, wrong enums and invalid escaped Unicode do not receive defaults', async () => {
  const cases = [
    [d => { d.entries[0].revision = null; }, 'SCHEMA_TYPE'],
    [d => { d.entries[0].mustPreserve = null; }, 'SCHEMA_TYPE'],
    [d => { d.entries[0].mustPreserve[0].text = '  '; }, 'SCHEMA_EMPTY'],
    [d => { d.entries[0].mustPreserve[0].text = '\ud800'; }, 'INVALID_UNICODE'],
    [d => { d.entries[0].status = 'PASS'; }, 'SCHEMA_ENUM'],
    [d => { d.adversarialCases[0].style = 'max'; }, 'SCHEMA_ENUM'],
    [d => { d.adversarialCases[0].semanticVerdict = 'APPROVED'; }, 'SCHEMA_ENUM'],
    [d => { d.entries[0].mustPreserve[0].text = 'x'.repeat(4001); }, 'SCHEMA_LIMIT'],
  ];
  for (const [mutate, code] of cases) await invalid(mutate, code);
});

test('non-JSON objects, hidden properties, accessors, array holes and symbols refuse', async () => {
  await invalid(d => { d.entries[0].time = new Date(0); }, 'NON_JSON_VALUE');
  await invalid(d => { Object.defineProperty(d.entries[0].time, 'secret', {value: 'private', enumerable: false}); }, 'NON_JSON_VALUE');
  await invalid(d => { Object.defineProperty(d.entries[0].time, 'iso', {get: () => null, enumerable: true}); }, 'NON_JSON_VALUE');
  await invalid(d => { d.entries[0].time[Symbol('secret')] = true; }, 'NON_JSON_VALUE');
  await invalid(d => { delete d.entries[0].mustPreserve[0]; }, 'NON_JSON_VALUE');
});

test('every fixed source and contract identity rejects a replacement even with a freshly sealed document', async () => {
  for (const key of Object.keys((await fresh()).source)) {
    await invalid(document => {
      const value = document.source[key];
      document.source[key] = /^[a-f0-9]{64}$/.test(value) ? '0'.repeat(64) : /^[a-f0-9]{40}$/.test(value) ? '0'.repeat(40) : 'FOREIGN';
    }, 'SOURCE_IDENTITY');
  }
});

test('public synthetic draft cannot become blind packets, a private seed/map, or production data', async () => {
  for (const kind of ['PRIVATE_BLIND_ASSIGNMENTS', 'PRIVATE_BLIND_SEED', 'CALIBRATION_BLIND_FIXTURE_v1', 'ACTUAL_CALIBRATION_ADOPTED_READBACK']) {
    await invalid(d => { d.kind = kind; }, 'SCHEMA_CONST');
  }
  for (const boundary of ['PRIVATE', 'PUBLIC_BLIND_PACKET', 'REAL_PERSONAL_INPUT']) {
    await invalid(d => { d.dataBoundary = boundary; }, 'SCHEMA_CONST');
  }
  for (const key of ['seed', 'assignments', 'privateAssignments', 'readbacks', 'provider', 'route', 'price', 'model', 'consentReceiptId']) {
    await invalid(d => { d[key] = 'SYNTHETIC_SENTINEL'; }, 'UNKNOWN_FIELD');
  }
});

test('LLM grades, alleged consent and self-asserted human receipts cannot masquerade as completed human review', async () => {
  for (const key of ['ratings', 'reviewerKind', 'reviewerIdOpaque', 'consentReceiptId', 'reviewedAt', 'scaleVersion']) {
    await invalid(d => { d.entries[0][key] = key === 'ratings' ? {voice: 5} : 'HUMAN_AUTHOR'; }, 'UNKNOWN_FIELD');
  }
  for (const key of ['independentHumanReview', 'authorAcceptance', 'modelQualityQualification', 'modelExecution']) {
    await invalid(d => { d.statuses[key] = 'PASS'; }, 'SCHEMA_CONST');
  }
  await invalid(d => { d.statuses.populationClaim = 'ZERO_POPULATION_ERRORS'; }, 'SCHEMA_CONST');
});

test('mutation guard: exact coverage cannot hide missing review or source counts', async () => {
  await invalid(d => { d.coverage.humanReviewMissingEntryIds.pop(); }, 'COVERAGE');
});

test('all Entry, obligation, annotation and coverage lists reject missing, duplicate, unavailable and foreign identities', async () => {
  for (const key of ['topicIds', 'entryIds', 'obligationIds', 'annotationIds', 'eligibleEntryIds', 'coveredEntryIds']) {
    await invalid(d => { d.coverage[key].pop(); }, 'COVERAGE');
    await invalid(d => { d.coverage[key][0] = 'FOREIGN'; }, 'COVERAGE');
    await invalid(d => { d.coverage[key].push(d.coverage[key][0]); }, 'DUPLICATE_ITEM');
  }
  for (const key of ['excludedEntryIds', 'removedEntryIds', 'unavailableEntryIds', 'exactDedupedEntryIds']) {
    await invalid(d => { d.coverage[key].push(d.entries[0].entryId); }, 'COVERAGE');
  }
});

test('mutation guard: an omitted Entry is not a smaller successful denominator', async () => {
  await invalid(d => { d.entries.pop(); }, 'ENTRY_COVERAGE');
});

test('missing, duplicate and unknown Topic and Entry records refuse', async () => {
  await invalid(d => { d.topics.pop(); }, 'TOPIC_COVERAGE');
  await invalid(d => { d.entries[1] = structuredClone(d.entries[0]); }, 'DUPLICATE_ITEM');
  await invalid(d => { d.topics[1] = structuredClone(d.topics[0]); }, 'DUPLICATE_ITEM');
  await invalid(d => { d.entries[0].entryId = 'HELD-R01-E999'; }, 'ENTRY_COVERAGE');
  await invalid(d => { d.topics[0].topicId = 'HELD-R99'; }, 'TOPIC_COVERAGE');
  await invalid(d => { d.entries[0].topicId = 'HELD-R02'; }, 'UNKNOWN_ENTRY_OR_WRONG_TOPIC');
  await invalid(d => { d.entries[0].revision = 1; }, 'ENTRY_REVISION');
  await invalid(d => { d.entries[0].bodyDigest = '0'.repeat(64); }, 'ENTRY_BODY_DIGEST');
  await invalid(d => { d.entries[0].sectionId = 'S2'; }, 'ENTRY_PLACEMENT');
});

test('duplicate identities also refuse when the duplicate objects have different prose, mappings or digest fields', async () => {
  await invalid(d => {
    d.entries[1] = structuredClone(d.entries[0]);
    d.entries[1].mustPreserve[0].text += ' another draft wording';
  }, 'ENTRY_COVERAGE');
  await invalid(d => {
    d.topics[1] = structuredClone(d.topics[0]);
    d.topics[1].relations[0].text += ' another draft wording';
  }, 'TOPIC_COVERAGE');
  await invalid(d => {
    const duplicate = structuredClone(firstRef(d));
    duplicate.bodyDigest = '0'.repeat(64);
    d.entries[0].mustPreserve[0].supportRefs.push(duplicate);
  }, 'DUPLICATE_REF');
  await invalid(d => {
    const duplicate = structuredClone(d.entries[0].evidenceUnits[0]);
    duplicate.meaningRuleIndexes.reverse();
    d.entries[0].evidenceUnits[1] = duplicate;
  }, 'DUPLICATE_EVIDENCE_UNIT');
});

test('unknown time, corpus reference time and human Section membership cannot be invented or moved', async () => {
  await invalid(d => { entryRow(d, 'HELD-R03-E001').time = {kind: 'known', iso: '2026-02-03T00:00:00Z'}; }, 'ENTRY_TIME');
  await invalid(d => { entryRow(d, 'HELD-R07-E001').time.iso = '2026-09-12T00:00:00Z'; }, 'ENTRY_TIME');
  await invalid(d => { entryRow(d, 'HELD-R01-E001').time = {kind: 'unknown', iso: null}; }, 'ENTRY_TIME');
  await invalid(d => { entryRow(d, 'HELD-R08-E002').time = structuredClone(entryRow(d, 'HELD-R08-E001').time); }, 'ENTRY_TIME');
  await invalid(d => { entryRow(d, 'HELD-R12-E003').sectionId = 'S1'; }, 'ENTRY_PLACEMENT');
  await invalid(d => { d.topics.at(-1).sections.reverse(); }, 'TOPIC_SECTIONS');
  await invalid(d => { d.topics.at(-1).sourceFailureObligations[0].entryIds.pop(); }, 'FAILURE_OBLIGATIONS');
});

test('mutation guard: ref revision', async () => {
  await invalid(d => { firstRef(d).revision = 1; }, 'REF_REVISION');
});

test('mutation guard: ref body digest', async () => {
  await invalid(d => { firstRef(d).bodyDigest = '0'.repeat(64); }, 'REF_BODY_DIGEST');
});

test('mutation guard: ref literal', async () => {
  await invalid(d => { const ref = firstRef(d); ref.literal = '没有这项证据。'; ref.spanDigest = rawDigest(ref.literal); }, 'REF_LITERAL');
});

test('mutation guard: ref span digest', async () => {
  await invalid(d => { firstRef(d).spanDigest = '0'.repeat(64); }, 'REF_SPAN_DIGEST');
});

test('wrong ref topic, unknown Entry, wrong Section, duplicate ref and missing primary evidence refuse', async () => {
  await invalid(d => { firstRef(d).topicId = 'HELD-R02'; }, 'REF_TOPIC');
  await invalid(d => { firstRef(d).entryId = 'HELD-R02-E001'; }, 'UNKNOWN_ENTRY_OR_WRONG_TOPIC');
  await invalid(d => { firstRef(d).entryId = 'HELD-R01-E999'; }, 'UNKNOWN_ENTRY_OR_WRONG_TOPIC');
  await invalid(d => { firstRef(d).sectionId = 'S2'; }, 'REF_SECTION');
  await invalid(d => { d.entries[0].mustPreserve[0].supportRefs.push(structuredClone(firstRef(d))); }, 'DUPLICATE_ITEM');
  await invalid(d => { d.entries[0].mustPreserve[0].supportRefs = [reference('HELD-R01-E002')]; }, 'MISSING_PRIMARY_EVIDENCE');
});

test('unsafe integers, fractional, negative, empty, reversed and overflowing UTF16 ranges refuse', async () => {
  for (const value of [-1, -0, 0.5, Number.MAX_SAFE_INTEGER + 1, '0', null]) {
    await invalid(d => { firstRef(d).start = value; }, value === -1 ? 'SCHEMA_MINIMUM' : 'SCHEMA_TYPE');
  }
  for (const [start, end] of [[0, 0], [5, 4], [0, 999], [999, 1000]]) {
    await invalid(d => { Object.assign(firstRef(d), {start, end}); }, 'REF_RANGE');
  }
});

test('actual frozen combining-mark and family-emoji spans accept only intact graphemes', async () => {
  const combining = reference('HELD-R11-E001', 10, 12);
  const family = reference('HELD-R11-E002', 8, 19);
  assert.equal(combining.literal, 'e\u0301');
  assert.equal(family.literal, '👨‍👩‍👧‍👦');
  assert.equal(combining.end - combining.start, 2);
  assert.equal(family.end - family.start, 11);
  for (const ref of [combining, family]) {
    const result = await validateSupportRefs([ref], 'HELD-R11');
    assert.equal(result.structure, 'VALID');
    assert.equal(result.semanticCorrectness, 'NOT_VERIFIED');
  }
  for (const ref of [
    reference('HELD-R11-E001', 10, 11), reference('HELD-R11-E001', 11, 12),
    reference('HELD-R11-E002', 8, 10), reference('HELD-R11-E002', 10, 11),
  ]) await assert.rejects(validateSupportRefs([ref], 'HELD-R11'), error => error.code === 'REF_GRAPHEME');
  await assert.rejects(validateSupportRefs([reference('HELD-R11-E002', 8, 9)], 'HELD-R11'), error => error.code === 'INVALID_UNICODE');
});

test('mutation guard: ref grapheme', async () => {
  await invalid(d => {
    entryRow(d, 'HELD-R11-E001').mustPreserve[0].supportRefs = [reference('HELD-R11-E001', 10, 11)];
  }, 'REF_GRAPHEME');
});

test('visually similar NFC text cannot replace exact decomposed evidence bytes', async () => {
  const ref = reference('HELD-R11-E001', 10, 12);
  ref.literal = '\u00e9';
  ref.spanDigest = rawDigest(ref.literal);
  await assert.rejects(validateSupportRefs([ref], 'HELD-R11'), error => error.code === 'REF_LITERAL');
});

test('each obligation and annotation must be present once, known, whole-span and mapped to every required meaning rule', async () => {
  await invalid(d => { d.entries[0].evidenceUnits.pop(); }, 'SCHEMA_MIN_ITEMS');
  await invalid(d => { d.entries[0].evidenceUnits.shift(); }, 'SCHEMA_MIN_ITEMS');
  await invalid(d => { d.entries[0].evidenceUnits[1] = structuredClone(d.entries[0].evidenceUnits[0]); }, 'DUPLICATE_ITEM');
  await invalid(d => { d.entries[0].evidenceUnits[0].sourceId = 'HELD-R01-E999-O1'; }, 'OBLIGATION_COVERAGE');
  await invalid(d => { d.entries[0].evidenceUnits[1].sourceId = 'HELD-R01-E999-A1'; }, 'ANNOTATION_COVERAGE');
  await invalid(d => { d.entries[0].evidenceUnits[0].supportRefs = [reference('HELD-R01-E001', 0, 2)]; }, 'EVIDENCE_UNIT_SPAN');
  await invalid(d => { d.entries[0].evidenceUnits[0].meaningRuleIndexes.pop(); }, 'EVIDENCE_RULE_COVERAGE');
  await invalid(d => { d.entries[0].evidenceUnits[0].meaningRuleIndexes.push(99); }, 'EVIDENCE_RULE_COVERAGE');
  await invalid(d => { d.entries[0].evidenceUnits[0].meaningRuleIndexes.push(0); }, 'DUPLICATE_ITEM');
  await invalid(d => {
    const unit = d.entries[0].evidenceUnits[0];
    unit.status = unit.status === 'DRAFT' ? 'UNRESOLVED' : 'DRAFT';
  }, 'EVIDENCE_UNIT_STATUS');
});

test('mutation guard: unresolved rules cannot be silently changed to completed draft decisions', async () => {
  await invalid(d => { unresolvedEntry(d).unresolved[0].status = 'DRAFT'; }, 'RULE_STATUS');
});

test('UNRESOLVED stays explicit, changes counts honestly and cannot be reported as zero error', async () => {
  await invalid(d => { unresolvedEntry(d).status = 'DRAFT'; }, 'ENTRY_STATUS');
  await invalid(d => {
    const topic = d.topics.find(item => item.status === 'UNRESOLVED');
    assert.ok(topic);
    topic.status = 'DRAFT';
  }, 'TOPIC_STATUS');
  await invalid(d => { d.semanticErrors = 0; }, 'UNKNOWN_FIELD');
  await invalid(d => { unresolvedEntry(d).unresolved[0].text = ''; }, 'SCHEMA_EMPTY');
  const document = await fresh();
  const before = await validateAdjudication(document);
  // A repeated category keeps every predeclared required negative represented.
  const chosen = document.adversarialCases.find(c => c.semanticVerdict === 'REJECT' && document.adversarialCases.filter(x => x.category === c.category && x.semanticVerdict === 'REJECT').length > 1);
  assert.ok(chosen);
  chosen.semanticVerdict = 'UNRESOLVED';
  chosen.status = 'UNRESOLVED';
  const after = await validateAdjudication(seal(document));
  assert.equal(after.counts.unresolvedDraftItems, before.counts.unresolvedDraftItems + 1);
  assert.equal(after.counts.humanJudgments, 0);
  assert.equal(after.counts.missingHumanEntryReviews, 36);
  assert.equal(after.semanticCorrectness, 'NOT_VERIFIED');
});

test('cross-Entry relations require distinct real contributors and complete frozen failure-obligation coverage', async () => {
  await invalid(d => { d.topics[0].relations[0].supportRefs = [reference('HELD-R01-E001', 0, 2), reference('HELD-R01-E001', 2, 4)]; }, 'RELATION_REQUIRES_MULTIPLE_ENTRIES');
  await invalid(d => { d.topics[0].relations = []; }, 'SCHEMA_MIN_ITEMS');
  await invalid(d => {
    d.topics[0].relations = [{...d.topics[0].relations[0], supportRefs: [reference('HELD-R01-E001'), reference('HELD-R01-E002')]}];
  }, 'RELATION_COVERAGE');
});

test('all five required semantic attacks have valid complete refs while their AI-authored semantic verdict remains REJECT', async () => {
  const document = await fresh();
  for (const category of ['NEGATION_FLIP', 'CONDITION_DROPPED', 'SUBJECT_MISMATCH', 'TIME_MISPLACED', 'FALSE_MERGE']) {
    const cases = document.adversarialCases.filter(c => c.category === category);
    assert.ok(cases.length > 0, category);
    for (const item of cases) {
      const refs = await validateSupportRefs(item.supportRefs, item.topicId);
      assert.equal(refs.structure, 'VALID');
      assert.equal(refs.semanticCorrectness, 'NOT_VERIFIED');
      assert.equal(item.authorship, 'AI_AUTHORED_DRAFT');
      assert.equal(item.semanticVerdict, 'REJECT');
      assert.equal(item.expectedReferenceValidation, 'PASS_BINDINGS_ONLY');
      assert.ok(item.reason.trim().length > 0);
      assert.deepEqual(Object.keys(item.perStyle).sort(), ['balanced', 'concise', 'original']);
    }
  }
});

test('valid bindings never constitute automatic semantic acceptance, even for a deliberately false replacement sentence', async () => {
  const document = await fresh();
  const item = document.adversarialCases.find(c => c.category === 'NEGATION_FLIP');
  item.outputText = '我已经同意付款，也确认报名。';
  item.outputDigest = rawDigest(item.outputText);
  item.supportRefs = [reference('HELD-R01-E002')];
  item.topicId = 'HELD-R01';
  const report = await validateAdjudication(seal(document));
  assert.equal(report.structure, 'VALID');
  assert.equal(report.semanticCorrectness, 'NOT_VERIFIED');
  assert.equal(report.statuses.modelQualityQualification, 'NOT_RUN');
  assert.equal(item.semanticVerdict, 'REJECT');
});

test('missing adversarial category, duplicate IDs, missing explanations and unbound output digests refuse', async () => {
  await invalid(d => { d.adversarialCases = d.adversarialCases.filter(c => c.category !== 'SUBJECT_MISMATCH'); }, 'ADVERSARIAL_CATEGORY_COVERAGE');
  await invalid(d => { d.adversarialCases[1].caseId = d.adversarialCases[0].caseId; }, 'DUPLICATE_CASE');
  await invalid(d => { d.adversarialCases[0].reason = ''; }, 'SCHEMA_EMPTY');
  await invalid(d => { delete d.adversarialCases[0].perStyle.original; }, 'MISSING_FIELD');
  await invalid(d => { d.adversarialCases[0].outputText += '新增断言'; }, 'OUTPUT_DIGEST');
  await invalid(d => { d.adversarialCases[0].status = 'UNRESOLVED'; }, 'ADVERSARIAL_STATUS');
});

test('mutation guard: document digest', async () => {
  await invalid(d => { d.documentDigest = '0'.repeat(64); }, 'DOCUMENT_DIGEST', {reseal: false});
});

test('repeated validation yields byte-equivalent reports without generated timestamps or fabricated receipts', async () => {
  const document = await fresh();
  const reports = await Promise.all([validateAdjudication(document), validateAdjudication(Buffer.from(JSON.stringify(document)))]);
  assert.equal(JSON.stringify(reports[0]), JSON.stringify(reports[1]));
  const serialized = JSON.stringify(reports[0]);
  for (const text of ['reviewedAt', 'reviewerIdOpaque', 'consentReceiptId', 'costUsdNormalized', 'fidelityScore']) assert.equal(serialized.includes(text), false);
});

test('object validation binds a synchronous schema-checked snapshot before awaiting source reads', async () => {
  const document = await fresh();
  const originalDigest = document.documentDigest;
  const pending = validateAdjudication(document);
  document.entries[0].mustPreserve[0].ratings = {voice: 5};
  seal(document);
  assert.notEqual(document.documentDigest, originalDigest);
  const report = await pending;
  assert.equal(report.documentDigest, originalDigest, 'post-check mutation must not enter the in-flight validation');
  assert.equal(report.structure, 'VALID');
  await assert.rejects(validateAdjudication(document), error => error.code === 'UNKNOWN_FIELD');
});

test('reference validation also snapshots checked refs before asynchronous trust reads', async () => {
  const refs = [reference('HELD-R01-E001')];
  const pending = validateSupportRefs(refs, 'HELD-R01');
  refs[0].revision = 1;
  refs[0].ratings = {semantic_fidelity: 5};
  assert.equal((await pending).structure, 'VALID', 'in-flight validation must use the original checked revision');
  await assert.rejects(validateSupportRefs(refs, 'HELD-R01'), error => error.code === 'UNKNOWN_FIELD');
});
