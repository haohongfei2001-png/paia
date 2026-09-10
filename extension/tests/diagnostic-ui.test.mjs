import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyStructure, emptyRow } from '../core/diagnostics.js';
import { formatStructure, briefStructure } from '../ui/structure-diagnostics.js';
import { statusLabel } from '../ui/common.js';

const at = '2026-09-05T00:00:00.000Z';
const now = Date.parse(at) + 5000;
const forbidden = 'SYNTHETIC-SENSITIVE-PAYLOAD';

test('structure UI has a safe missing state for old or malformed diagnostics', () => {
  for (const input of [undefined, null, {}, [], { schemaVersion: 1 }]) {
    assert.match(formatStructure(input, null, now), /暂无结构诊断/);
    assert.match(briefStructure(input, null, now), /暂无/);
  }
});

test('valid zero counts and false booleans are displayed, not treated as missing', () => {
  const input = emptyStructure();
  input.rows = [emptyRow()];
  const full = formatStructure(input, at, now);
  assert.match(full, /user role 节点：总数=0；可见=0/);
  assert.match(full, /最终候选数量：0/);
  assert.match(full, /存在=否；可见=否；忙碌=否/);
  assert.match(full, /安全容器=0/);
  assert.doesNotMatch(full, /暂无结构诊断/);
  assert.match(briefStructure(input, at, now), /最终候选 0/);
});

test('extra keys and synthetic sensitive values cannot appear in rendered feedback', () => {
  const input = emptyStructure();
  Object.assign(input, { text: forbidden, originalText: forbidden, url: `https://example.invalid/${forbidden}`, title: forbidden, messageId: forbidden, contentHash: forbidden, [forbidden]: forbidden });
  input.rows = [{ ...emptyRow(), text: forbidden, messageId: forbidden, html: forbidden, [forbidden]: forbidden }];
  for (const rendered of [formatStructure(input, at, now), briefStructure(input, at, now)]) {
    assert.doesNotMatch(rendered, new RegExp(forbidden));
    assert.doesNotMatch(rendered, /example\.invalid/);
  }
});

test('string counts and non-boolean values reject the whole structure before display', () => {
  const inputs = [
    { ...emptyStructure(), userRoleCount: forbidden },
    { ...emptyStructure(), finalCandidateCount: '0' },
    { ...emptyStructure(), mainVisible: forbidden },
    { ...emptyStructure(), rows: [{ ...emptyRow(), textMatches: forbidden }] },
    { ...emptyStructure(), rows: [{ ...emptyRow(), editorPassed: 'false' }] }
  ];
  for (const input of inputs) {
    assert.match(formatStructure(input, at, now), /暂无结构诊断/);
    assert.doesNotMatch(formatStructure(input, at, now), new RegExp(forbidden));
    assert.match(briefStructure(input, at, now), /暂无/);
  }
});

test('feedback preserves complete totals and caps per-node details at twenty', () => {
  const input = { ...emptyStructure(), userRoleCount: 35, visibleUserRoleCount: 30, rows: Array.from({ length: 30 }, () => emptyRow()) };
  const full = formatStructure(input, at, now);
  assert.match(full, /user role 节点：总数=35；可见=30/);
  assert.match(full, /逐节点明细：20 行；最多 20 行；已截断=是/);
  assert.equal((full.match(/^节点 \d+$/gm) || []).length, 20);
  assert.doesNotMatch(full, /节点 21/);
});

test('structure feedback normalizes time and explicitly distinguishes stale or invalid timestamps', () => {
  const input = emptyStructure();
  assert.match(formatStructure(input, at, now), /收集时间：2026-09-05T00:00:00.000Z/);
  assert.match(formatStructure(input, at, now), /最近一分钟内/);
  assert.match(formatStructure(input, at, now + 61000), /已过期/);
  assert.match(briefStructure(input, at, now + 61000), /非当前状态/);
  assert.match(formatStructure(input, null, now), /时效：未知/);
  assert.match(formatStructure(input, at, now - 10000), /时间异常/);
  assert.doesNotMatch(formatStructure(input, forbidden, now), new RegExp(forbidden));
});

test('DOM mismatch and stale content script versions have distinct fixed UI labels', () => {
  assert.equal(statusLabel('ADAPTER_MISMATCH'), '页面结构不匹配，已跳过');
  assert.equal(statusLabel('ADAPTER_VERSION_MISMATCH'), '内容脚本版本不一致，请刷新 ChatGPT 标签页');
  assert.equal(statusLabel(forbidden), '操作未完成，请重试或查看诊断详情。');
});

test('editor counts identify role scope, optional old turn scope, or unavailable checks', () => {
  for (const [row, label] of [
    [{...emptyRow(), idOnRole: true, editorCheckAvailable: true}, 'user role 子树内'],
    [{...emptyRow(), turnFound: true, editorCheckAvailable: true}, 'turn 内'],
    [emptyRow(), '未确认范围内']
  ]) {
    assert.ok(formatStructure({...emptyStructure(), rows: [row]}, at, now).includes(`${label}可见编辑控件：总数=0`));
  }
});
