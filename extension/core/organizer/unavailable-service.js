import {ArchiveError} from '../constants.js';

// Membership service has not launched. These inert dependencies preserve the
// existing saved-result/recovery owners without loading legacy credentials.
const unavailable = () => { throw new ArchiveError('AI_SERVICE_UNAVAILABLE'); };
export const unavailableAIProvider = Object.freeze({
  describe: unavailable,
  supportsTask: () => false,
  execute: async () => unavailable(),
});
export const unavailableAICredentials = Object.freeze({
  acquire: async () => unavailable(),
  revoke: () => ({status:'revoked'}),
});
