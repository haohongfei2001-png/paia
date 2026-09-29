// CPV1-12.1: untrusted AI output is data, never an archive command.
// This detached contract does not register a provider, message handler or grant.
export const AI_WRITE_PROPOSAL_VERSION = 1;
export const AI_WRITE_SCOPES = Object.freeze({
  'topic.rename': 'topic.name',
  'section.create': 'topic.sections',
  'entry.place': 'entry.topic',
});

export class AIWriteProposalError extends Error {
  constructor(code) { super(code); this.name = 'AIWriteProposalError'; this.code = code; }
}
const invalid = () => { throw new AIWriteProposalError('AI_WRITE_PROPOSAL_INVALID'); };
const encoder = new TextEncoder();
const text = (v, max) => typeof v === 'string' && v.trim().length > 0
  && encoder.encode(v).length <= max;
const revision = v => Number.isSafeInteger(v) && v >= 0;
function record(value, required, allowed = required) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  const keys = Reflect.ownKeys(value);
  if (keys.some(k => typeof k !== 'string' || !allowed.includes(k))
      || required.some(k => !keys.includes(k))) invalid();
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !d.enumerable || !Object.hasOwn(d, 'value')) invalid();
  }
}
function target(value, kind) {
  record(value, ['kind', 'id', 'baseRevision']);
  if (value.kind !== kind || !text(value.id, 200) || !revision(value.baseRevision)) invalid();
  return {kind, id: value.id, baseRevision: value.baseRevision};
}
function sectionTarget(value) {
  record(value, ['kind', 'id', 'baseRevision', 'organizationRevision']);
  if (value.kind !== 'topic' || !text(value.id, 200)
      || !revision(value.baseRevision)
      || !revision(value.organizationRevision)) invalid();
  return {kind: 'topic', id: value.id, baseRevision: value.baseRevision,
    organizationRevision: value.organizationRevision};
}
function evidence(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) invalid();
  const seen = new Set();
  return value.map(item => {
    record(item, ['kind', 'id', 'revision']);
    if (!['input', 'thought'].includes(item.kind)
        || !text(item.id, 200) || !revision(item.revision)) invalid();
    const key = item.kind + ':' + item.id + ':' + item.revision;
    if (seen.has(key)) invalid();
    seen.add(key);
    return {kind: item.kind, id: item.id, revision: item.revision};
  });
}
export function validateAIWriteProposal(input) {
  record(input,
    ['version', 'proposalId', 'action', 'target', 'scope', 'value', 'rationale', 'evidence'],
    ['version', 'proposalId', 'action', 'target', 'scope', 'value', 'rationale', 'evidence', 'destination']);
  if (input.version !== AI_WRITE_PROPOSAL_VERSION
      || !text(input.proposalId, 200) || !Object.hasOwn(AI_WRITE_SCOPES, input.action)
      || input.scope !== AI_WRITE_SCOPES[input.action]
      || !text(input.rationale, 2000)) invalid();
  const common = {
    version: 1, proposalId: input.proposalId, action: input.action,
    scope: input.scope, rationale: input.rationale,
    evidence: evidence(input.evidence),
  };
  if (input.action === 'topic.rename') {
    if (Object.hasOwn(input, 'destination')) invalid();
    record(input.value, ['name']);
    if (!text(input.value.name, 300)) invalid();
    return {...common, target: target(input.target, 'topic'),
      value: {name: input.value.name}};
  }
  if (input.action === 'section.create') {
    if (Object.hasOwn(input, 'destination')) invalid();
    record(input.value, ['title']);
    if (!text(input.value.title, 300)) invalid();
    return {...common, target: sectionTarget(input.target),
      value: {title: input.value.title}};
  }
  record(input.value, ['place']);
  if (input.value.place !== true) invalid();
  record(input.destination, ['topicId', 'baseRevision', 'organizationRevision', 'placementRevision']);
  if (!text(input.destination.topicId, 200)
      || !revision(input.destination.baseRevision)
      || !revision(input.destination.organizationRevision)
      || input.destination.placementRevision !== null
        && !revision(input.destination.placementRevision)) invalid();
  return {...common, target: target(input.target, 'entry'), value: {place: true},
    destination: {topicId: input.destination.topicId,
      baseRevision: input.destination.baseRevision,
      organizationRevision: input.destination.organizationRevision,
      placementRevision: input.destination.placementRevision}};
}
