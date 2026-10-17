import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseStrict, digest} from '../ai-qwen-offline/artifacts.mjs';

// Reuse only the existing pure parser/canonical digest. Do not call its
// calibration replay loader: its historical runtime freeze is a different scope.
export {digest};
export const SOURCE_BASE = '2cc827e8e4bed9d7d7a2a57fce1d6a8f5724c3a8';
export const AUTHORSHIP = 'AI_AUTHORED_DRAFT';
export const BOUNDARY = 'PUBLIC_SYNTHETIC_NOT_BLIND';
export const MODES = Object.freeze(['original', 'balanced', 'concise']);
export const FIXTURE_PREFIX = 'tests/fixtures/ai-qwen-offline-v1/';
export const TRUSTED_FILES = Object.freeze({
  [FIXTURE_PREFIX + 'calibration.json']: '56891aeb3abcc82e330e542007e849a2efb1c5b819274e11d2234cc2637d8d9b',
  [FIXTURE_PREFIX + 'freeze.json']: 'fc7e0aefbff87cd0453a712ac6a7bea78ddbd328c127e9ba380d6256f3de2877',
  [FIXTURE_PREFIX + 'held-out-root-freeze.json']: '3f04c17e7bb3a076475d62829d426bf97c9d25a528eedf3ae1f50cf17cfcbee1',
  [FIXTURE_PREFIX + 'held-out-root-v1.json']: '1ed69045f9787f34dc695b9f2b7187f1e8806ffa1c3abc83cded89f90d9ff88c',
  [FIXTURE_PREFIX + 'review-contract.json']: '0cda0babef3e2503e3efd8cb28f1f2fd143e8a953fd28dd38ff999adc1b400d3',
  'docs/consumer-product-v1/AI_ORGANIZE_STYLE_CONTRACT.md': '893e79a05bcb782d5761b20f289bd9eb595cf6a45858e329c57289531babcec7',
});
const extensionRoot = new URL('../../../', import.meta.url);
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export class AdjudicationError extends Error {
  constructor(code, path = '$') {
    super(code);
    this.name = 'AdjudicationError';
    this.code = code;
    this.path = path;
  }
}
export function requireThat(condition, code, path = '$') {
  if (!condition) throw new AdjudicationError(code, path);
}
export function parseDocument(bytes) {
  try {
    requireThat(bytes instanceof Uint8Array && bytes.byteLength > 0 && bytes.byteLength <= 1024 * 1024, 'INVALID_JSON');
    // This draft file format has only nonnegative safe-integer numeric fields.
    // Inspect lexemes before JSON.parse can underflow or round them. Strings
    // (including escaped quotes, dates and prose about numbers) are untouched;
    // the reused parser below remains responsible for the full JSON grammar.
    const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    let quoted = false, escaped = false;
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '-' || /[0-9]/.test(char)) {
        let end = index + 1;
        while (end < text.length && !' \t\r\n{},:[]'.includes(text[end])) end++;
        const token = text.slice(index, end);
        requireThat(/^(?:0|[1-9][0-9]*)$/.test(token) && Number.isSafeInteger(Number(token)), 'JSON_NUMBER_FORMAT'); // MUTATION:NUMBER_FORMAT
        index = end - 1;
      }
    }
    return parseStrict(bytes); // MUTATION:STRICT_JSON
  } catch (error) {
    const known = new Set(['JSON_DUPLICATE_KEY', 'JSON_DEPTH', 'JSON_KEY_LIMIT', 'JSON_STRING_LIMIT', 'JSON_NUMBER_FORMAT']);
    throw new AdjudicationError(known.has(error.code) ? error.code : 'INVALID_JSON');
  }
}
export function freezeDeep(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}
export const graphemeBounds = text => new Set([
  0, text.length,
  ...Array.from(new Intl.Segmenter('und', {granularity: 'grapheme'}).segment(text), item => item.index),
]);

// No alternate corpus path, caller-supplied trust root, network or credentials.
export async function loadTrustedHeldout() {
  const files = {};
  for (const [path, expected] of Object.entries(TRUSTED_FILES)) {
    let bytes;
    try { bytes = await readFile(new URL(path, extensionRoot)); }
    catch { throw new AdjudicationError('TRUSTED_SOURCE_UNAVAILABLE', path); }
    requireThat(sha256(bytes) === expected, 'TRUSTED_SOURCE_DIGEST', path); // MUTATION:TRUST_ROOT
    files[path] = bytes;
  }
  // The pinned upstream review contract includes fractional thresholds. Its
  // bytes are already authenticated above; draft-only integer lexeme rules do
  // not rewrite or reinterpret that existing contract.
  const read = name => parseStrict(files[FIXTURE_PREFIX + name]);
  const corpus = read('held-out-root-v1.json');
  const heldOutFreeze = read('held-out-root-freeze.json');
  const calibrationFreeze = read('freeze.json');
  const reviewContract = read('review-contract.json');
  requireThat(corpus.id === heldOutFreeze.heldOutId && corpus.syntheticOnly === true, 'TRUSTED_SOURCE_IDENTITY');
  requireThat(heldOutFreeze.sha256 === TRUSTED_FILES[FIXTURE_PREFIX + 'held-out-root-v1.json'], 'TRUSTED_SOURCE_IDENTITY');
  requireThat(heldOutFreeze.bytes === files[FIXTURE_PREFIX + 'held-out-root-v1.json'].byteLength, 'TRUSTED_SOURCE_IDENTITY');
  requireThat(heldOutFreeze.calibrationDigest === calibrationFreeze.files['calibration.json'].sha256, 'TRUSTED_SOURCE_IDENTITY');
  requireThat(heldOutFreeze.reviewContractDigest === calibrationFreeze.files['review-contract.json'].sha256, 'TRUSTED_SOURCE_IDENTITY');
  requireThat(corpus.contractVersions.reviewContractDigest === heldOutFreeze.reviewContractDigest, 'TRUSTED_SOURCE_IDENTITY');
  requireThat(corpus.topics.length === 12 && corpus.topics.flatMap(t => t.entries).length === 36, 'TRUSTED_SOURCE_IDENTITY');
  requireThat(digest(corpus.modes) === digest(MODES), 'TRUSTED_SOURCE_IDENTITY');
  requireThat(corpus.modelRunStatus === 'NOT_RUN' && corpus.humanAuthorReviewStatus === 'NOT_RUN', 'TRUSTED_SOURCE_IDENTITY');
  return freezeDeep({corpus, heldOutFreeze, calibrationFreeze, reviewContract});
}

export function sourceIdentity(data) {
  return {
    repository: 'haohongfei2001-png/paia',
    sourceBaseCommit: SOURCE_BASE,
    corpusRuntimeBase: data.corpus.runtimeBase,
    corpusId: data.corpus.id,
    corpusDigest: TRUSTED_FILES[FIXTURE_PREFIX + 'held-out-root-v1.json'],
    heldOutFreezeDigest: TRUSTED_FILES[FIXTURE_PREFIX + 'held-out-root-freeze.json'],
    calibrationDigest: TRUSTED_FILES[FIXTURE_PREFIX + 'calibration.json'],
    calibrationFreezeDigest: TRUSTED_FILES[FIXTURE_PREFIX + 'freeze.json'],
    reviewContractId: data.reviewContract.id,
    reviewContractDigest: TRUSTED_FILES[FIXTURE_PREFIX + 'review-contract.json'],
    styleContractVersion: 'AIOS-1.0',
    styleContractDigest: TRUSTED_FILES['docs/consumer-product-v1/AI_ORGANIZE_STYLE_CONTRACT.md'],
    bodyAndSpanDigest: 'SHA256_UTF8_EXACT_NO_NORMALIZATION',
    envelopeDigest: 'EXISTING_PAIA_CANONICAL_JSON_SHA256',
    spanUnit: 'UTF16_CODE_UNITS_END_EXCLUSIVE',
    timeQualification: 'CORPUS_REFERENCE_ONLY_NOT_EVENT_DATE',
    scope: 'COMPLETE_FROZEN_HELDOUT',
  };
}
export const pendingStatuses = () => ({
  independentHumanReview: 'NOT_RUN',
  authorAcceptance: 'NOT_RUN',
  modelQualityQualification: 'NOT_RUN',
  modelExecution: 'NOT_RUN',
  semanticReference: AUTHORSHIP,
  populationClaim: 'NO_POPULATION_CLAIM',
});

export function expectedCoverage(data) {
  const entries = data.corpus.topics.flatMap(t => t.entries);
  const ids = entries.map(e => e.id);
  return {
    meaning: 'DRAFT_EVIDENCE_BINDING_ONLY',
    topicIds: data.corpus.topics.map(t => t.id),
    entryIds: ids,
    obligationIds: entries.map(e => e.obligation.id),
    annotationIds: entries.flatMap(e => e.annotations.map(a => a.id)),
    eligibleEntryIds: ids,
    coveredEntryIds: ids,
    excludedEntryIds: [],
    removedEntryIds: [],
    unavailableEntryIds: [],
    exactDedupedEntryIds: [],
    humanReviewMissingEntryIds: ids,
  };
}
