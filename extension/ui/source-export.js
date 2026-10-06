import {ArchiveError} from '../core/constants.js';

// Old callers fail before reading any content or constructing a download.
export async function readSourceExport(){throw new ArchiveError('FEATURE_UNAVAILABLE');}
