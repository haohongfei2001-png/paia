/** Local, user-triggered serialization. No I/O and no HTML interpretation. */
export function exportJSON(records) {
  return JSON.stringify({
    format: 'personal-ai-input-archive',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    records
  }, null, 2);
}

export function textBlock(value) {
  const text = String(value ?? '');
  const runs = text.match(/`+/g) || [];
  const longest = runs.reduce((length, run) => Math.max(length, run.length), 0);
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}\n${text}${text.endsWith('\n') ? '' : '\n'}${fence}`;
}

export function exportMarkdown(records) {
  const parts = [
    '# Personal AI Input Archive',
    `导出时间：${new Date().toISOString()}\n\n记录数量：${records.length}`,
    '原文、整理版与备注分别保存。捕获时间不是实际发送时间；页面顺序是捕获时已加载的用户消息顺序。此文件已离开扩展本地存储，请自行保管。'
  ];
  records.forEach((record, index) => {
    parts.push(`## 记录 ${index + 1}`);
    parts.push(textBlock([
      `ID: ${record.id}`,
      `平台: ${record.platform}`,
      `聊天标题: ${record.chatTitle}`,
      `聊天 ID: ${record.chatId}`,
      `聊天 URL: ${record.chatUrl}`,
      `来源消息 ID: ${record.sourceMessageId}`,
      `页面顺序: ${record.pageOrder}`,
      `捕获时间: ${record.capturedAt}`,
      `发送时间: ${record.sourceSentAt || '发送时间未知'}`,
      `时间来源: ${record.timeSource || 'unknown'}`,
      `时间可信度: ${record.timeConfidence || 'unknown'}`,
      `会话顺序: ${record.conversationOrder ?? 'unknown'}`,
      `内容 SHA-256: ${record.contentHash}`,
      `上一快照 ID: ${record.previousVersionId || '无'}`,
      `隐藏: ${record.hidden ? '是' : '否'}`
    ].join('\n')));
    parts.push('### 原文（只读快照）', textBlock(record.originalText));
    parts.push('### 用户整理版', textBlock(record.editedText));
    parts.push('### 用户备注', textBlock(record.note));
  });
  return `${parts.join('\n\n')}\n`;
}
