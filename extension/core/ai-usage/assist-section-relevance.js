import {ASSIST_LIMITS} from './assist-response.js';
import {CONTEXT_READ_LIMITS} from '../context-read.js';

// A local lexical predicate, not a discovery or processing capability. Callers
// must already hold the current reply and every Section field under their
// independent original grants. It accepts no Item IDs, body, store or callback.
// Keep the original source owner's cumulative read/hash ledger and all final
// revision/expiry fences: these bounds only limit this one pure calculation.
export const ASSIST_SECTION_RELEVANCE_LIMITS = Object.freeze({
  labels: CONTEXT_READ_LIMITS.page,
  labelCodeUnits: 80, // Original Context Item Section schema.
  replyCharacters: ASSIST_LIMITS.replyCharacters,
  replyBytes: ASSIST_LIMITS.replyBytes,
  comparisonCeiling: CONTEXT_READ_LIMITS.page * 80 * (2 * ASSIST_LIMITS.replyCharacters + 1)
});

const generic = new Set([
  'info', 'information', 'context', 'general', 'other', 'misc', 'miscellaneous',
  'personal', 'now', 'rules', 'notes', 'default', 'my information', 'my context',
  '其他', '其它', '默认', '信息', '个人信息', '我的信息', '现在', '我的现在', '通用'
]);
// An explicit, finite precision brake. This is not word-sense disambiguation;
// unknown polysemy remains a documented limitation of lexical relevance.
const ambiguous = new Set([
  'apple', 'java', 'python', 'bank', 'spring', 'bass', 'bat', 'crane', 'mouse',
  'date', 'cell', 'current', 'light', 'rest', 'match', 'pitch', 'draft', 'bug',
  '苹果', '小米', '长城'
]);
const separator = /[;|、]/u;
const separators = /[;|、]/gu;
const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const word = value => /[\p{L}\p{M}\p{N}_]/u.test(value) && !cjk.test(value);
const encodedBytes = value => new TextEncoder().encode(value).byteLength;
const normalize = value => value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
const refuse = code => { throw Object.assign(new TypeError(code), {code}); };
const need = (value, code = 'INVALID_REQUEST') => { if (!value) refuse(code); };

function wellFormed(value) {
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point >= 0xd800 && point <= 0xdfff) return false;
  }
  return true;
}

function checkedString(value, {reply = false} = {}) {
  need(typeof value === 'string');
  // Check cheap storage bounds before normalization, iteration or encoding.
  need(value.length <= (reply ? 2 * ASSIST_LIMITS.replyCharacters : 80), 'RESOURCE_LIMIT');
  need(!value.includes('\0') && wellFormed(value));
  const bytes = encodedBytes(value);
  if (reply) need([...value].length <= ASSIST_LIMITS.replyCharacters && bytes <= ASSIST_LIMITS.replyBytes, 'RESOURCE_LIMIT');
  const normalized = normalize(value);
  // NFKC/case expansion cannot evade the original bounds. Refuse the entire
  // batch; there is no truncation or usable prefix of an oversized result.
  need(normalized.length <= (reply ? 2 * ASSIST_LIMITS.replyCharacters : 80), 'RESOURCE_LIMIT');
  const normalizedBytes = encodedBytes(normalized);
  if (reply) need([...normalized].length <= ASSIST_LIMITS.replyCharacters && normalizedBytes <= ASSIST_LIMITS.replyBytes, 'RESOURCE_LIMIT');
  return {normalized, bytes, normalizedBytes};
}

function labelValues(labels) {
  need(Array.isArray(labels));
  const length = Object.getOwnPropertyDescriptor(labels, 'length')?.value;
  need(Number.isSafeInteger(length) && length >= 0 && length <= CONTEXT_READ_LIMITS.page, 'RESOURCE_LIMIT');
  // Inspect only descriptors. Sparse/accessor/custom-property arrays do not
  // get to execute code or introduce hidden text through the pure API.
  need(Reflect.ownKeys(labels).length === length + 1);
  const values = [];
  for (let index = 0; index < length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(labels, String(index));
    need(descriptor && Object.hasOwn(descriptor, 'value'));
    values.push(descriptor.value);
  }
  return values;
}

function anchorReason(anchor) {
  if (!anchor) return 'empty-label';
  if (generic.has(anchor)) return 'generic-label';
  if (ambiguous.has(anchor)) return 'ambiguous-label';
  const letters = [...anchor].filter(character => /\p{L}/u.test(character));
  if (!letters.length) return 'nonlexical-label';
  const cjkLetters = letters.filter(character => cjk.test(character)).length;
  // No guessed expansions of acronyms, one-character CJK, numbers or short
  // function words. More-specific multiword labels remain usable intact.
  if (letters.length < 3 && cjkLetters < 2) return 'short-label';
  if (/^\p{M}/u.test(anchor)) return 'nonlexical-label';
  return null;
}

function anchors(label) {
  // Conjunctions, commas, slashes and ordinary spaces are NOT list evidence:
  // War and Peace, Research and Development, AC/DC and New York stay intact.
  // Only the explicitly documented ; | 、 separator format opts into parts.
  const listed = separator.test(label);
  const parts = listed ? label.split(separators).map(part => part.trim()) : [label];
  if (listed && parts.some(part => !part)) return {parts: [], reason: 'malformed-list', listed};
  const unique = [...new Set(parts)], eligible = unique.filter(part => anchorReason(part) === null);
  return {parts: eligible, listed, reason: eligible.length ? null : unique.length === 1 ? anchorReason(unique[0]) : 'no-specific-anchor'};
}

function pointBefore(value, index) {
  if (index <= 0) return '';
  const last = value.charCodeAt(index - 1);
  return value.slice(index - (last >= 0xdc00 && last <= 0xdfff ? 2 : 1), index);
}

function contains(reply, anchor) {
  let offset = -1;
  while ((offset = reply.indexOf(anchor, offset + 1)) !== -1) {
    const before = pointBefore(reply, offset);
    const afterPoint = reply.codePointAt(offset + anchor.length);
    const after = afterPoint === undefined ? '' : String.fromCodePoint(afterPoint);
    // CJK phrases are complete anchors, never guessed character fragments.
    // Non-CJK letters/marks/digits/underscore cannot touch either boundary;
    // this also prevents accent suffix and mixed-script identifier matches.
    if (!word(before) && !word(after)) return true;
  }
  return false;
}

/**
 * Classify a bounded batch of independently granted labels against the granted
 * current reply. MATCH means lexical relevance only. Questions, quotations and
 * negation do not turn an Item into a true assertion, permission or new fact.
 * The output contains indices/reasons only; it retains neither supplied text.
 */
export function matchAssistSectionLabels(reply, labels) {
  const values = labelValues(labels), current = checkedString(reply, {reply: true});
  const checked = values.map(value => checkedString(value));
  const prepared = checked.map(value => anchors(value.normalized));
  const comparisonCeiling = prepared.reduce((sum, value) => sum + value.parts.reduce((count, part) => count + (current.normalized.length + 1) * part.length, 0), 0);
  need(comparisonCeiling <= ASSIST_SECTION_RELEVANCE_LIMITS.comparisonCeiling, 'RESOURCE_LIMIT');
  const decisions = prepared.map((value, index) => {
    const matched = value.parts.some(part => contains(current.normalized, part));
    return Object.freeze({index, disposition: matched ? 'MATCH' : 'DEFER', reason: matched ? value.listed ? 'explicit-part' : 'exact-phrase' : value.reason || 'unmatched'});
  });
  return Object.freeze({version: 1, decisions: Object.freeze(decisions), work: Object.freeze({
    labels: checked.length,
    sourceBytes: current.bytes + checked.reduce((sum, value) => sum + value.bytes, 0),
    normalizedBytes: current.normalizedBytes + checked.reduce((sum, value) => sum + value.normalizedBytes, 0),
    comparisonCeiling
  })});
}
