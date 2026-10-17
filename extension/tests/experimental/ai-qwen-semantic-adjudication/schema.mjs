import {AUTHORSHIP, BOUNDARY, MODES, requireThat, digest, freezeDeep} from './trusted.mjs';

const string = {type: 'string', minLength: 1, maxLength: 4000};
const id = {type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9_-]+$'};
const hash = {type: 'string', pattern: '^[a-f0-9]{64}$'};
const integer = {type: 'integer', minimum: 0};
const constant = value => ({const: value});
const array = (items, minItems = 0, maxItems = 256) => ({type: 'array', items, minItems, maxItems, uniqueItems: true});
const object = properties => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
const ref = name => ({$ref: '#/$defs/' + name});
const authored = {authorship: constant(AUTHORSHIP), status: {enum: ['DRAFT', 'UNRESOLVED']}};
const ruleArray = array(ref('rule'), 1, 32);
const ids = array(id, 0, 256);

// This schema is the actual executable structural contract, not a second
// descriptive schema that can silently diverge from the validator.
export const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:paia:heldout-semantic-adjudication-draft:v1',
  ...object({
    version: constant(1),
    kind: constant('PAIA_HELDOUT_SEMANTIC_ADJUDICATION_DRAFT'),
    authorship: constant(AUTHORSHIP),
    dataBoundary: constant(BOUNDARY),
    source: object({
      repository: string, sourceBaseCommit: string, corpusRuntimeBase: string,
      corpusId: id, corpusDigest: hash, heldOutFreezeDigest: hash,
      calibrationDigest: hash, calibrationFreezeDigest: hash,
      reviewContractId: id, reviewContractDigest: hash,
      styleContractVersion: string, styleContractDigest: hash,
      bodyAndSpanDigest: string, envelopeDigest: string, spanUnit: string,
      timeQualification: string, scope: string,
    }),
    statuses: object({
      independentHumanReview: constant('NOT_RUN'), authorAcceptance: constant('NOT_RUN'),
      modelQualityQualification: constant('NOT_RUN'), modelExecution: constant('NOT_RUN'),
      semanticReference: constant(AUTHORSHIP), populationClaim: constant('NO_POPULATION_CLAIM'),
    }),
    coverage: object({
      meaning: constant('DRAFT_EVIDENCE_BINDING_ONLY'), topicIds: ids, entryIds: ids,
      obligationIds: ids, annotationIds: ids, eligibleEntryIds: ids, coveredEntryIds: ids,
      excludedEntryIds: ids, removedEntryIds: ids, unavailableEntryIds: ids,
      exactDedupedEntryIds: ids, humanReviewMissingEntryIds: ids,
    }),
    topics: array(ref('topic'), 1, 12),
    entries: array(ref('entry'), 1, 36),
    adversarialCases: array(ref('adversarial'), 5, 128),
    documentDigest: hash,
  }),
  $defs: {
    supportRef: object({
      topicId: id, entryId: id, revision: integer, bodyDigest: hash, sectionId: id,
      start: integer, end: integer, literal: string, spanDigest: hash,
    }),
    rule: object({...authored, text: string, supportRefs: array(ref('supportRef'), 1, 16)}),
    time: object({kind: {enum: ['known', 'unknown']}, iso: {type: ['string', 'null'], maxLength: 100}}),
    evidenceUnit: object({
      sourceKind: {enum: ['obligation', 'annotation']}, sourceId: id,
      ...authored, supportRefs: array(ref('supportRef'), 1, 1),
      meaningRuleIndexes: array(integer, 1, 32),
    }),
    entry: object({
      topicId: id, entryId: id, revision: integer, bodyDigest: hash,
      sectionId: id, lifecycle: constant('active'), time: ref('time'),
      ...authored, evidenceUnits: array(ref('evidenceUnit'), 2, 32),
      mustPreserve: ruleArray,
      mayCompress: object(Object.fromEntries(MODES.map(mode => [mode, ruleArray]))),
      mustNotInfer: ruleArray, unresolved: array(ref('rule'), 0, 32),
    }),
    relation: object({
      kind: {enum: ['DEPENDENCY', 'CONFLICT', 'CORRECTION', 'TEMPORAL', 'ATTRIBUTION', 'SCOPE']},
      ...authored, text: string, supportRefs: array(ref('supportRef'), 2, 16),
    }),
    topic: object({
      topicId: id, ...authored,
      sections: array(object({id, humanOrdered: constant(true)}), 1, 8),
      sourceFailureObligations: array(object({
        kind: string, entryIds: ids, adjudication: constant('NOT_RUN'),
      }), 1, 16),
      relations: array(ref('relation'), 1, 32),
    }),
    adversarial: object({
      caseId: id, topicId: id, ...authored,
      category: {enum: [
        'NEGATION_FLIP', 'CONDITION_DROPPED', 'SUBJECT_MISMATCH', 'TIME_MISPLACED',
        'FALSE_MERGE', 'CORRECTION_REVERSED', 'UNKNOWN_TIME_INVENTED', 'CONFLICT_ERASED',
      ]},
      style: {enum: MODES}, outputText: string, outputDigest: hash,
      supportRefs: array(ref('supportRef'), 1, 16),
      expectedReferenceValidation: constant('PASS_BINDINGS_ONLY'),
      semanticVerdict: {enum: ['REJECT', 'UNRESOLVED']},
      reason: string, perStyle: object(Object.fromEntries(MODES.map(mode => [mode, string]))),
    }),
  },
};
freezeDeep(schema);

// Bounded, local interpreter for precisely the JSON Schema keywords above.
// There is no schema loading, remote $ref, arbitrary JS, coercion or defaulting.
export function checkSchema(value, shape = schema, path = '$') {
  if (shape.$ref) {
    requireThat(shape.$ref.startsWith('#/$defs/'), 'SCHEMA_REFERENCE', path);
    const target = schema.$defs[shape.$ref.slice(8)];
    requireThat(Boolean(target), 'SCHEMA_REFERENCE', path);
    return checkSchema(value, target, path);
  }
  if (Object.hasOwn(shape, 'const')) requireThat(value === shape.const, 'SCHEMA_CONST', path); // MUTATION:SCHEMA_CONST
  if (shape.enum) requireThat(shape.enum.includes(value), 'SCHEMA_ENUM', path);
  const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const types = shape.type ? [].concat(shape.type) : null;
  if (types) requireThat(types.some(type => type === actualType || (type === 'integer' && Number.isSafeInteger(value) && !Object.is(value, -0))), 'SCHEMA_TYPE', path);
  if (actualType === 'string') {
    requireThat(value.isWellFormed(), 'INVALID_UNICODE', path);
    if (shape.minLength !== undefined) requireThat(value.trim().length >= shape.minLength, 'SCHEMA_EMPTY', path);
    if (shape.maxLength !== undefined) requireThat(value.length <= shape.maxLength, 'SCHEMA_LIMIT', path);
    if (shape.pattern) requireThat(new RegExp(shape.pattern).test(value), 'SCHEMA_PATTERN', path);
  }
  if (actualType === 'number') {
    requireThat(Number.isFinite(value), 'SCHEMA_TYPE', path);
    if (shape.minimum !== undefined) requireThat(value >= shape.minimum, 'SCHEMA_MINIMUM', path);
  }
  if (actualType === 'array') {
    requireThat(Object.getOwnPropertySymbols(value).length === 0 && Object.keys(value).length === value.length && Object.getOwnPropertyNames(value).length === value.length + 1, 'NON_JSON_VALUE', path);
    if (shape.minItems !== undefined) requireThat(value.length >= shape.minItems, 'SCHEMA_MIN_ITEMS', path);
    if (shape.maxItems !== undefined) requireThat(value.length <= shape.maxItems, 'SCHEMA_LIMIT', path);
    const seen = new Set();
    for (let index = 0; index < value.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      requireThat(descriptor && Object.hasOwn(descriptor, 'value'), 'NON_JSON_VALUE', path);
      checkSchema(value[index], shape.items, path + '[' + index + ']');
      if (shape.uniqueItems) {
        const key = digest(value[index]);
        requireThat(!seen.has(key), 'DUPLICATE_ITEM', path);
        seen.add(key);
      }
    }
  }
  if (actualType === 'object') {
    requireThat(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, 'NON_JSON_VALUE', path);
    requireThat(Object.getOwnPropertySymbols(value).length === 0, 'NON_JSON_VALUE', path);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      requireThat(Object.hasOwn(descriptor, 'value') && descriptor.enumerable, 'NON_JSON_VALUE', path);
      requireThat(Object.hasOwn(shape.properties, key), 'UNKNOWN_FIELD', path); // MUTATION:CLOSED_SCHEMA
    }
    for (const key of shape.required) requireThat(Object.hasOwn(value, key), 'MISSING_FIELD', path);
    for (const [key, child] of Object.entries(shape.properties)) if (Object.hasOwn(value, key)) checkSchema(value[key], child, path + '.' + key);
  }
  return true;
}
