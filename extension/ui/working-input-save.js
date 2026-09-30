import {hashText} from '../core/dedupe.js';
import {request} from './common.js';

const unknown = () => Object.assign(new Error('Save outcome remains unknown'), {code: 'SAVE_OUTCOME_UNKNOWN'});

// Retains only the existing outbound edit snapshot until its outcome is known.
// A newer local draft cannot replace an unacknowledged operation or its digest.
export class WorkingInputSaveSession {
  constructor(send = request) { this.send = send; this.pending = null; }
  get unresolved() { return this.pending?.state === 'unknown'; }
  async read() {
    try { return await this.send('PAIA_ARCHIVE_OPERATION_OUTCOME', {query: this.pending.query}); }
    catch { return {state: 'unknown'}; }
  }
  async save(edit, epoch) {
    if (!this.pending) this.pending = {edit, state: 'new', query: {
      version: 1, namespace: 'working-input', ownerRef: edit.documentId,
      operationId: edit.operationId, requestDigest: await hashText(JSON.stringify(edit)), epoch
    }};
    const attempt = this.pending;
    if (attempt.state === 'unknown') {
      const outcome = await this.read();
      if (outcome.state === 'committed' && outcome.result?.ok === true) {
        this.pending = null; return {edit: attempt.edit, result: outcome.result};
      }
      if (outcome.state !== 'not_committed') throw unknown();
      attempt.state = 'not_committed';
    }
    try {
      const result = await this.send('EDIT_DOCUMENT', {edit: attempt.edit});
      if (result?.ok !== true && result?.conflict !== true) throw unknown();
      this.pending = null; return {edit: attempt.edit, result};
    } catch (error) {
      const outcome = await this.read();
      if (outcome.state === 'committed' && outcome.result?.ok === true) {
        this.pending = null; return {edit: attempt.edit, result: outcome.result};
      }
      attempt.state = outcome.state === 'not_committed' ? 'not_committed' : 'unknown';
      if (attempt.state === 'unknown') throw unknown();
      throw error;
    }
  }
}
