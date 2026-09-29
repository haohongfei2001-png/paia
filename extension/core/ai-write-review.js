// CPV1-12.2: detached trusted review bridge. No provider, worker route or
// permission grant is registered here. The caller must supply a trusted local
// human/policy authorization function; provider output reaches stage() only.
import {hashText} from './dedupe.js';
import {inputProjection} from './thought-evidence.js';
import {AIWriteProposalError, validateAIWriteProposal} from './ai-write-proposal.js';

const fail = code => { throw new AIWriteProposalError(code); };
const live = row => row && row.lifecycle === 'active'
  && !row.redirectTo && !row.layoutJobId;
function approvalCopy(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('AI_WRITE_REVIEW_REQUIRED');
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 3 || keys.some(k =>
      !['proposalId', 'digest', 'decision'].includes(k)
      || !Object.getOwnPropertyDescriptor(value, k)?.enumerable
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, k), 'value'))) fail('AI_WRITE_REVIEW_REQUIRED');
  return {proposalId: value.proposalId, digest: value.digest, decision: value.decision};
}

export class AIWriteReviewService {
  #store; #authorize; #staged = new Map(); #epoch = 0;
  constructor({store, authorizeReview}) {
    if (!store || typeof store.topic !== 'function'
        || typeof store.entry !== 'function'
        || typeof store.placeEntry !== 'function'
        || typeof store.editTopic !== 'function'
        || typeof authorizeReview !== 'function') fail('AI_WRITE_UNAVAILABLE');
    this.#store = store;
    this.#authorize = authorizeReview;
  }
  revoke() { this.#epoch++; this.#staged.clear(); }

  async #evidenceCurrent(refs) {
    const store = this.#store;
    await store.finishFoundation();
    for (const ref of refs) {
      if (ref.kind === 'thought') {
        let row;
        try { row = await store.entry(ref.id); } catch { fail('AI_WRITE_STALE'); }
        if (row.lifecycle !== 'active' || row.revision !== ref.revision
            || row.staleReasons?.length) fail('AI_WRITE_STALE');
      } else if (ref.kind === 'input') {
        const current = await store.run(() => store.repository.transaction(false,
          async t => {
            const row = await inputProjection(store, t, ref.id);
            if (!row) return null;
            const filtered = await store.isFiltered(t, row.block,
              await t.get('meta', 'smart-filter'));
            return {revision: row.contentRevision, filtered};
          }));
        if (!current || current.filtered || current.revision !== ref.revision)
          fail('AI_WRITE_STALE');
      } else fail('AI_WRITE_PROPOSAL_INVALID');
    }
  }
  async #base(proposal) {
    const store = this.#store;
    if (proposal.action === 'topic.rename') {
      let row;
      try { row = await store.topic(proposal.target.id); } catch { fail('AI_WRITE_STALE'); }
      if (!live(row) || row.id !== proposal.target.id
          || row.revision !== proposal.target.baseRevision) fail('AI_WRITE_STALE');
      return {before: {name: row.name}, after: {name: proposal.value.name}};
    }
    let entry, topic;
    try {
      entry = await store.entry(proposal.target.id);
      topic = await store.topic(proposal.destination.topicId);
    } catch { fail('AI_WRITE_STALE'); }
    if (entry.lifecycle !== 'active' || entry.staleReasons?.length
        || entry.revision !== proposal.target.baseRevision
        || !live(topic) || topic.id !== proposal.destination.topicId
        || topic.revision !== proposal.destination.baseRevision
        || topic.organizationRevision !== proposal.destination.organizationRevision) fail('AI_WRITE_STALE');
    const placement = await store.run(() => store.repository.transaction(false,
      t => t.get('placements', JSON.stringify([
        topic.id, topic.activeLayoutGeneration, entry.id
      ]))));
    if ((placement?.revision ?? null) !== proposal.destination.placementRevision) fail('AI_WRITE_STALE');
    return {before: {topicIds: [...(entry.topics || [])]},
      after: {topicId: topic.id, topicName: topic.name}};
  }
  async stage(untrusted) {
    const epoch = this.#epoch;
    const proposal = validateAIWriteProposal(untrusted);
    if (this.#staged.has(proposal.proposalId)) fail('AI_WRITE_DUPLICATE');
    await this.#evidenceCurrent(proposal.evidence);
    const diff = await this.#base(proposal);
    if (epoch !== this.#epoch) fail('AI_WRITE_REVOKED');
    const digest = await hashText(JSON.stringify(proposal));
    const review = {
      proposalId: proposal.proposalId, digest,
      action: proposal.action, scope: proposal.scope,
      target: structuredClone(proposal.target), before: diff.before, after: diff.after,
      rationale: proposal.rationale, evidence: structuredClone(proposal.evidence),
    };
    this.#staged.set(proposal.proposalId, {proposal, digest, review, epoch, inFlight: false, receipt: null});
    return structuredClone(review);
  }
  async commit(value) {
    const approval = approvalCopy(value), staged = this.#staged.get(approval.proposalId);
    if (!staged || staged.epoch !== this.#epoch) fail('AI_WRITE_REVIEW_REQUIRED');
    if (approval.digest !== staged.digest || approval.decision !== 'approve') fail('AI_WRITE_REVIEW_REQUIRED');
    if (staged.receipt) return structuredClone(staged.receipt);
    if (staged.inFlight) fail('AI_WRITE_IN_FLIGHT');
    staged.inFlight = true;
    try {
      // The trusted UI/policy bridge must verify the actual human event and
      // current local permission. A provider cannot authorize its own proposal.
      if (await this.#authorize(structuredClone(staged.review), approval) !== true)
        fail('AI_WRITE_REVIEW_REQUIRED');
      if (staged.epoch !== this.#epoch || this.#staged.get(approval.proposalId) !== staged)
        fail('AI_WRITE_REVOKED');
      await this.#evidenceCurrent(staged.proposal.evidence);
      await this.#base(staged.proposal);
      if (staged.epoch !== this.#epoch) fail('AI_WRITE_REVOKED');
      const p = staged.proposal, operationId = crypto.randomUUID();
      const result = p.action === 'topic.rename'
        ? await this.#store.editTopic({
            id: p.target.id, expectedRevision: p.target.baseRevision,
            changes: {name: p.value.name}, operationId,
          })
        : await this.#store.placeEntry({
            entryId: p.target.id, topicId: p.destination.topicId,
            expectedEntryRevision: p.target.baseRevision,
            expectedTopicRevision: p.destination.organizationRevision,
            expectedTopicMetadataRevision: p.destination.baseRevision,
            ...(p.destination.placementRevision === null ? {}
              : {expectedPlacementRevision: p.destination.placementRevision}),
            operationId,
          });
      if (result?.conflict) fail('AI_WRITE_STALE');
      const receipt = {proposalId: p.proposalId, proposalDigest: staged.digest,
        action: p.action, scope: p.scope, objectId: p.target.id,
        baseRevision: p.target.baseRevision, operationId,
        committedRevision: result.revision, reviewed: true};
      staged.receipt = receipt;
      return structuredClone(receipt);
    } finally {
      staged.inFlight = false;
    }
  }
}
