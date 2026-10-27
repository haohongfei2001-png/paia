import {configDefault} from '../memory/model.js';
import {equal,fail} from './value.js';
// The original UI lazily materializes this exact denied, untouched default.
// It is local initialization, never portable permission or user history.
export function requireOriginalDefaultMemoryRow(row){if(!equal(row,configDefault()))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
export function consumeOriginalDefaultMemoryRow(rows){if(rows.has('memory:config')){requireOriginalDefaultMemoryRow(rows.get('memory:config'));rows.delete('memory:config');}}
