import test from 'node:test';
import assert from 'node:assert/strict';
import { exportJSON, exportMarkdown, textBlock } from '../core/export.js';

// Every value below is synthetic. Never substitute real conversations here.
function example(overrides = {}) {
  return {
    id: 'fixture-record-1',
    platform: 'chatgpt',
    chatId: 'fictional-chat-1',
    chatUrl: 'https://chatgpt.com/c/fictional-chat-1',
    chatTitle: '虚构练习：种一棵树',
    sourceMessageId: 'fixture-message-1',
    pageOrder: 2,
    capturedAt: '2026-01-01T08:00:00.000Z',
    originalText: '这是一条虚构测试消息。\n\n第二段有 emoji 🌱。\n',
    contentHash: 'a'.repeat(64),
    dedupeKey: 'b'.repeat(64),
    sourceKey: 'c'.repeat(64),
    previousVersionId: null,
    note: '虚构备注：用于导出测试。',
    editedText: '虚构整理版。',
    hidden: false,
    deletedAt: null,
    updatedAt: '2026-01-01T09:00:00.000Z',
    ...overrides
  };
}

test('JSON exports all record fields and preserves raw text including whitespace', () => {
  const records = [example({ originalText: '  虚构\r\n\r\n\t文字 🧪\n  ' })];
  const before = structuredClone(records);
  const exported = JSON.parse(exportJSON(records));
  assert.equal(exported.format, 'personal-ai-input-archive');
  assert.equal(exported.schemaVersion, 2);
  assert.equal(exported.recordCount, 1);
  assert.ok(Number.isFinite(Date.parse(exported.exportedAt)));
  assert.deepEqual(exported.records, records);
  assert.deepEqual(records, before);
});

test('exports accept frozen input and leave original, note and edited text separate', () => {
  const record = Object.freeze(example());
  const records = Object.freeze([record]);
  const exported = JSON.parse(exportJSON(records));
  assert.equal(exported.records[0].originalText, record.originalText);
  assert.notEqual(exported.records[0].editedText, record.originalText);
  const markdown = exportMarkdown(records);
  assert.ok(markdown.includes(`### 原文（只读快照）\n\n${textBlock(record.originalText)}`));
  assert.ok(markdown.includes(`### 用户整理版\n\n${textBlock(record.editedText)}`));
  assert.ok(markdown.includes(`### 用户备注\n\n${textBlock(record.note)}`));
  assert.equal(record.originalText, example().originalText);
});

test('Markdown fence is longer than every backtick run in each text field', () => {
  const raw = '虚构代码\n```html\n<span>测试</span>\n```\n````````\n结束';
  const block = textBlock(raw);
  const fence = block.slice(0, block.indexOf('\n'));
  assert.equal(fence, '`'.repeat(9));
  assert.equal(block, `${fence}\n${raw}\n${fence}`);
  const record = example({ originalText: raw, editedText: '```\n整理版', note: '````````````备注' });
  const markdown = exportMarkdown([record]);
  assert.ok(markdown.includes(block));
  assert.ok(markdown.includes(textBlock(record.editedText)));
  assert.ok(markdown.includes(textBlock(record.note)));
});

test('Markdown handles arbitrary fence lengths, empty text and terminal newlines', () => {
  for (const length of [0, 1, 2, 3, 8, 80, 1024]) {
    const raw = `虚构${'`'.repeat(length)}消息\n\n`;
    const fence = '`'.repeat(Math.max(3, length + 1));
    assert.equal(textBlock(raw), `${fence}\n${raw}${fence}`);
  }
  assert.equal(textBlock(''), '```\n\n```');
  assert.equal(textBlock('虚构\r\n下一行\r\n'), '```\n虚构\r\n下一行\r\n```');
});

test('Markdown wraps HTML and malicious-looking metadata as plain code text', () => {
  const malicious = '</textarea><script>throw new Error("synthetic")</script>\n# 虚构标题\n```';
  const record = example({ chatTitle: malicious, originalText: malicious, note: '<img src="synthetic" onerror="synthetic">' });
  const markdown = exportMarkdown([record]);
  assert.ok(markdown.includes(`### 原文（只读快照）\n\n${textBlock(malicious)}`));
  assert.ok(markdown.includes(`### 用户备注\n\n${textBlock(record.note)}`));
  const metadataStart = markdown.indexOf('\n\n', markdown.indexOf('## 记录 1')) + 2;
  const metadataEnd = markdown.indexOf('\n\n### 原文', metadataStart);
  const metadata = markdown.slice(metadataStart, metadataEnd);
  assert.ok(metadata.startsWith('````\n'));
  assert.ok(metadata.endsWith('\n````'));
  assert.ok(metadata.includes(`聊天标题: ${malicious}`));
});

test('empty and multi-record exports retain count, ordering and snapshot metadata', () => {
  assert.deepEqual(JSON.parse(exportJSON([])).records, []);
  assert.match(exportMarkdown([]), /记录数量：0/);
  const records = [example({ id: 'fixture-second', previousVersionId: 'fixture-first', hidden: true }), example({ id: 'fixture-third' })];
  const markdown = exportMarkdown(records);
  assert.match(markdown, /记录数量：2/);
  assert.ok(markdown.indexOf('ID: fixture-second') < markdown.indexOf('ID: fixture-third'));
  assert.ok(markdown.includes('上一快照 ID: fixture-first'));
  assert.ok(markdown.includes('隐藏: 是'));
  assert.equal(JSON.parse(exportJSON(records)).recordCount, 2);
});
