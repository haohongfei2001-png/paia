import '../core/json-fingerprint.js';
export function formatFingerprints(value) {
  const s = globalThis.JSONFingerprintProtocol.sanitize(value);
  if (!s) return '等待单个已授权普通聊天的结构诊断…';
  const lines = [`单标签诊断资格：${s.allowed}；读取/解析失败或超限：${s.failures}；分组超限丢弃：${s.dropped}`,
    '仅 other JSON；不是正式接受。分组按结构计数，不使用 endpoint、ID、正文或时间值。'];
  if (!s.groups.length) lines.push('暂无指纹；可能尚无合格响应、授权未就绪或超限，不能据此否定历史来源。');
  s.groups.forEach((g, i) => {
    const f = g.shape, d = g.detail;
    lines.push('', `JSON fingerprint #${i + 1}`, `occurrence: ${g.occurrence}；root: ${f.rootType}；topLevelKeyCount: ${f.topLevelKeyCount}`,
      `mapping-like: ${f.mappingLike}；messages-like: ${f.messagesLike}；conversation identity field: ${f.conversationIdentityField}`,
      `collection size min/max: ${f.minCollectionSize}/${f.maxCollectionSize}；max depth: ${f.maxDepth}；depth-limited: ${f.depthLimited}；resource-truncated: ${f.truncated}`);
    for (const [key, count] of Object.entries(f.fields)) lines.push(`${key}: present=${count > 0}, count=${count}`);
    lines.push(`historical_conversation_schema_candidate: ${d.candidate}`);
    if (d.candidate) lines.push(`message count: ${d.messageCount}；user-role count: ${d.userRoleCount}`,
      `user with ID: ${d.userWithIDCount}；user with create_time: ${d.userWithCreateTimeCount}；parseable: ${d.parseableCount}`,
      `candidate conversation identity present: ${d.identityPresent}`,
      `canonical user count: ${g.canonical}；exact conversation identity + message ID matches: ${g.matched}`);
  });
  lines.push('', '候选详情与匹配数对应每组最近一次响应；occurrence 为本次内存会话累计。',
    '最大深度 4；截断只提供局部指纹，不确认历史候选。字段存在不证明发送时间语义。',
    '刷新、切换、暂停或失去单标签资格后清空；只截取本区域，不含地址栏。');
  return lines.join('\n');
}
