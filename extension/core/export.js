// Content export generation was retired. Keep old imports fail-closed.
import {backupError} from './backup-format.js';
export function exportJSON(){backupError('FEATURE_UNAVAILABLE');}
export function exportMarkdown(){backupError('FEATURE_UNAVAILABLE');}
export function textBlock(){backupError('FEATURE_UNAVAILABLE');}
