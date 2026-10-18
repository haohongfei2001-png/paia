import test from 'node:test';
import assert from 'node:assert/strict';
import {matchAssistSectionLabels, ASSIST_SECTION_RELEVANCE_LIMITS} from '../core/ai-usage/assist-section-relevance.js';
import {ASSIST_LIMITS} from '../core/ai-usage/assist-response.js';
import {CONTEXT_READ_LIMITS} from '../core/context-read.js';

const decision = (label, reply) => matchAssistSectionLabels(reply, [label]).decisions[0];
const cases = [
  ['Sleep', 'What should I change about sleep?', true, 'exact-phrase'],
  ['Fitness; Sleep', 'What should I change about sleep?', true, 'explicit-part'],
  ['Fitness； Sleep', 'What should I change about sleep?', true, 'explicit-part'],
  ['Fitness | Sleep', 'What should I change about sleep?', true, 'explicit-part'],
  ['Fitness｜Sleep', 'What should I change about sleep?', true, 'explicit-part'],
  ['健康、睡眠', '怎样改善睡眠质量？', true, 'explicit-part'],
  ['健康；AI研究', '请继续讨论AI研究方案。', true, 'explicit-part'],
  ['Fitness and sleep', 'What should I change about sleep?', false],
  ['War and Peace', 'Discuss peace.', false],
  ['War and Peace', 'Discuss War and Peace.', true, 'exact-phrase'],
  ['Research and Development', 'Discuss development.', false],
  ['rock and roll', 'Roll the dough.', false],
  ['研究与开发', '请讨论开发。', false],
  ['战争和和平', '请讨论和平。', false],
  ['Fitness, Sleep', 'Discuss sleep.', false],
  ['Fitness / Sleep', 'Discuss sleep.', false],
  ['AC/DC', 'Discuss DC.', false],
  ['New York', 'Discuss York.', false],
  ['New York', 'Discuss New York.', true, 'exact-phrase'],
  ['Sleep', 'Discuss SLEEP.', true, 'exact-phrase'],
  ['Ｆｉｔｎｅｓｓ；Ｓｌｅｅｐ', 'Discuss sleep.', true, 'explicit-part'],
  ['Café', 'Discuss CAFE\u0301.', true, 'exact-phrase'],
  ['Café', 'Discuss cafe.', false],
  ['naïve reasoning', 'Discuss naive reasoning.', false],
  ['Sleep', 'Discuss sleeping.', false],
  ['Sleep', 'Discuss oversleep.', false],
  ['Health', 'The unhealthy option is unsuitable.', false],
  ['Health', 'Discuss health\u0301.', false],
  ['Sleep', 'Discuss _sleep or sleep2.', false],
  ['Sleep', 'Discuss сонsleep or sleepсон.', false],
  ['AI研究', '讨论AI研究方案。', true, 'exact-phrase'],
  ['AI研究', 'Discuss XAI研究 or AI研究x.', false],
  ['AI研究', '讨论AI研 究方案。', false],
  ['睡眠', '讨论睡 眠。', false],
  ['睡眠', '讨论Sleep睡眠或睡眠Sleep。', false],
  ['睡眠', '讨论睡眠质量。', true, 'exact-phrase'],
  ['旅行计划', '继续旅行计划。', true, 'exact-phrase'],
  ['Sleep; Info', 'Tell me about Info.', false],
  ['Sleep; Info', 'Tell me about sleep.', true, 'explicit-part'],
  ['Info', 'Tell me about info.', false, 'generic-label'],
  ['我的信息', '请讨论我的信息。', false, 'generic-label'],
  ['My Information', 'Discuss my information.', false, 'generic-label'],
  ['Now | Other', 'Discuss now and other.', false, 'no-specific-anchor'],
  ['', 'Anything.', false, 'empty-label'],
  ['  ', 'Anything.', false, 'empty-label'],
  ['A', 'A is a letter.', false, 'short-label'],
  ['AI', 'Discuss AI.', false, 'short-label'],
  ['on', 'Turn it on.', false, 'short-label'],
  ['税', '请讨论税。', false, 'short-label'],
  ['2026', 'Discuss 2026.', false, 'nonlexical-label'],
  ['!!!', 'Discuss !!!.', false, 'nonlexical-label'],
  ['Apple', 'How does Apple work?', false, 'ambiguous-label'],
  ['苹果', '请讨论苹果。', false, 'ambiguous-label'],
  ['Java; Python', 'Discuss Java and Python.', false, 'no-specific-anchor'],
  ['Java programming', 'Discuss Java programming.', true, 'exact-phrase'],
  ['Apple; Sleep', 'How does sleep work?', true, 'explicit-part'],
  ['Sleep;; Fitness', 'Discuss sleep.', false, 'malformed-list'],
  ['Sleep;', 'Discuss sleep.', false, 'malformed-list'],
  ['|Sleep', 'Discuss sleep.', false, 'malformed-list'],
  ['Sleep; sleep', 'Discuss sleep.', true, 'explicit-part'],
  ['Sleep', 'Sleep-related questions remain.', true, 'exact-phrase'],
  ['Sleep', "Shouldn't I prioritize sleep?", true, 'exact-phrase'],
  ['Sleep', 'The claim “sleep is unnecessary” is disputed.', true, 'exact-phrase'],
  ['Sleep', 'I do not sleep well.', true, 'exact-phrase']
];

for (const [label, reply, matches, reason] of cases) {
  test('bounded lexical contract ' + JSON.stringify([label, reply]), () => {
    const result = decision(label, reply);
    assert.equal(result.disposition, matches ? 'MATCH' : 'DEFER');
    if (reason) assert.equal(result.reason, reason);
    assert.deepEqual(Object.keys(result), ['index', 'disposition', 'reason']);
  });
}

test('the module does not return fact confidence, instructions, text or any Item identity', () => {
  const result = matchAssistSectionLabels('Why should I not prioritize sleep?', ['Sleep']);
  assert.equal(result.decisions[0].disposition, 'MATCH');
  assert.deepEqual(Object.keys(result), ['version', 'decisions', 'work']);
  assert.doesNotMatch(JSON.stringify(result), /sleep|true|confidence|itemId|body|grant|permission/);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.decisions), true);
  assert.equal(Object.isFrozen(result.decisions[0]), true);
  assert.equal(Object.isFrozen(result.work), true);
});

test('same-name labels remain separate indices and never become identity or an arbitrary winner', () => {
  const result = matchAssistSectionLabels('Discuss sleep.', ['Sleep', 'Fitness; Sleep', 'Sleep']);
  assert.deepEqual(result.decisions.map(value => [value.index, value.disposition]), [[0, 'MATCH'], [1, 'MATCH'], [2, 'MATCH']]);
});

test('multiple labels share one deterministic bounded batch and all twenty are examined', () => {
  const labels = Array.from({length: CONTEXT_READ_LIMITS.page}, (_, index) => 'Topic' + index + '; Sleep');
  const result = matchAssistSectionLabels('Discuss sleep.', labels);
  assert.equal(result.work.labels, 20);
  assert.equal(result.decisions.length, 20);
  assert.equal(result.decisions.filter(value => value.disposition === 'MATCH').length, 20);
  assert.ok(result.work.comparisonCeiling <= ASSIST_SECTION_RELEVANCE_LIMITS.comparisonCeiling);
});

test('all eligible list anchors and their comparisons are bounded by the original eighty-unit label', () => {
  const label = Array.from({length: 26}, () => '睡眠').join(';');
  assert.equal(label.length, 77);
  const result = matchAssistSectionLabels('讨论睡眠。', [label]);
  assert.equal(result.decisions[0].disposition, 'MATCH');
  assert.equal(result.work.comparisonCeiling, ('讨论睡眠。'.length + 1) * 2);
});

test('twenty-one labels refuse atomically before any element getter or text conversion', () => {
  const labels = Array(21);
  let touched = 0;
  Object.defineProperty(labels, '0', {get() { touched++; throw Error('unexpected field read'); }});
  assert.throws(() => matchAssistSectionLabels('Sleep', labels), {code: 'RESOURCE_LIMIT'});
  assert.equal(touched, 0);
});

for (const kind of ['getter', 'sparse', 'extra', 'symbol', 'object']) test('rejects a ' + kind + ' label container without invoking text code', () => {
  let touched = 0;
  const labels = ['Sleep'];
  if (kind === 'getter') Object.defineProperty(labels, '0', {get() { touched++; return 'Sleep'; }});
  if (kind === 'sparse') delete labels[0];
  if (kind === 'extra') labels.body = 'not a Section';
  if (kind === 'symbol') labels[Symbol('body')] = 'not a Section';
  if (kind === 'object') labels[0] = {toString() { touched++; return 'Sleep'; }};
  assert.throws(() => matchAssistSectionLabels('Sleep', labels), {code: 'INVALID_REQUEST'});
  assert.equal(touched, 0);
});

test('reply coercion cannot acquire a supplied body or masquerade as its original grant', () => {
  let touched = 0;
  assert.throws(() => matchAssistSectionLabels({toString() { touched++; return 'Sleep'; }}, ['Sleep']), {code: 'INVALID_REQUEST'});
  assert.equal(touched, 0);
});

for (const value of ['Sleep\0', '\ud800', '\udc00']) test('rejects malformed field ' + JSON.stringify(value), () => {
  assert.throws(() => matchAssistSectionLabels('Sleep', [value]), {code: 'INVALID_REQUEST'});
  assert.throws(() => matchAssistSectionLabels(value, ['Sleep']), {code: 'INVALID_REQUEST'});
});

test('a final overbound label rejects the batch rather than returning preceding matches', () => {
  assert.throws(() => matchAssistSectionLabels('Sleep', ['Sleep', 'x'.repeat(81)]), {code: 'RESOURCE_LIMIT'});
});

test('raw reply character and byte ceilings remain the original Assist limits', () => {
  assert.equal(ASSIST_SECTION_RELEVANCE_LIMITS.replyCharacters, ASSIST_LIMITS.replyCharacters);
  assert.equal(ASSIST_SECTION_RELEVANCE_LIMITS.replyBytes, ASSIST_LIMITS.replyBytes);
  assert.throws(() => matchAssistSectionLabels('a'.repeat(4097), ['Sleep']), {code: 'RESOURCE_LIMIT'});
  assert.throws(() => matchAssistSectionLabels('界'.repeat(3000), ['Sleep']), {code: 'RESOURCE_LIMIT'});
  assert.throws(() => matchAssistSectionLabels('😀'.repeat(3000), ['Sleep']), {code: 'RESOURCE_LIMIT'});
});

test('NFKC expansion cannot evade the bounded reply or Section schema', () => {
  assert.throws(() => matchAssistSectionLabels('Sleep', ['ﷺ'.repeat(80)]), {code: 'RESOURCE_LIMIT'});
  assert.throws(() => matchAssistSectionLabels('ﷺ'.repeat(500), ['Sleep']), {code: 'RESOURCE_LIMIT'});
});

test('maximum admitted batch has a deterministic operation ceiling without truncation', () => {
  const labels = Array(20).fill('x'.repeat(80)), reply = 'y'.repeat(4096);
  const result = matchAssistSectionLabels(reply, labels);
  assert.equal(result.work.comparisonCeiling, 20 * 80 * 4097);
  assert.equal(result.decisions.length, 20);
  assert.ok(result.decisions.every(value => value.disposition === 'DEFER'));
  assert.equal(result.work.sourceBytes, 4096 + 20 * 80);
  assert.deepEqual(matchAssistSectionLabels(reply, labels), result);
});

test('empty supplied label set is an empty checked set, not a complete-profile claim', () => {
  const result = matchAssistSectionLabels('Sleep', []);
  assert.deepEqual(result.decisions, []);
  assert.equal(result.work.comparisonCeiling, 0);
  assert.equal(Object.hasOwn(result, 'complete'), false);
});

test('batch result leaves caller-owned fields and order untouched', () => {
  const labels = Object.freeze(['Travel', 'Sleep', 'Info']), before = structuredClone(labels);
  assert.deepEqual(matchAssistSectionLabels('Sleep', labels).decisions.map(value => value.disposition), ['DEFER', 'MATCH', 'DEFER']);
  assert.deepEqual(labels, before);
});
