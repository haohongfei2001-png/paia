import {formatFingerprints} from './fingerprint-display.js';
import {formatSemantic, PeriodSelection} from './source-time-display.js';
import '../core/response-time.js';
const {sanitize} = globalThis.ResponseTimeProtocol;
export function format(value) {
  const s = sanitize(value);
  if (!s) return '暂无安全诊断。捕获未启用、连接过期或当前没有唯一普通聊天。';
  const ratio = s.canonical ? `${Math.round(s.matched / s.canonical * 100)}%` : 'unknown';
  return [
    `canonical user message：${s.canonical}`,
    `response user metadata（当前聊天、已观察响应）：${s.metadata}`,
    `精确 conversation + message-ID 匹配：${s.matched}；匹配率：${ratio}`,
    `匹配消息有 create_time：${s.withTime}；可解析且无冲突：${s.parseable}`,
    `response 同一 ID 冲突时间：${s.conflicts}`,
    `Unix timestamp（秒为单位）：${s.parseable}；时区语义：UTC epoch；不是显式时区字符串`,
    `数值精度：整秒 ${s.seconds}；含小数秒 ${s.milliseconds}（不证明测量精度）`,
    `最早时间年龄：${s.earliestAge}；最晚时间年龄：${s.latestAge}`,
    `当前 DOM 顺序相邻可比较对：${s.orderPairs}；时间逆序：${s.orderInversions}`,
    `已接受响应：${s.acceptedResponses}；结构拒绝：${s.rejectedResponses}；超限：${s.limitedResponses}`,
    `容量截断：${s.truncated ? '是，覆盖不完整' : '否'}`,
    `受控验证：${s.armed ? '已开始' : '未开始'}；候选差值秒数：${s.deltas.length ? s.deltas.join(' / ') : '尚无合格样本'}`,
    '刷新后逐 ID 稳定性：unknown；历史时间与 capturedAt 精确比较：未读取记录，未自动验证',
    '年龄分类为距当前时刻：today <24h；days_ago <7天；weeks_ago <28天；older ≥28天。'
  ].join('\n');
}
export function formatRejections(value) {
  const s = sanitize(value);
  if (!s) return '暂无分阶段诊断。';
  const d = s.rejectionDiagnostics;
  const checked = (attempted, passed) => attempted ? String(passed) : '未执行';
  const lines = [`observedFetchResponseCount：${d.observedFetchResponseCount}（仅当前授权期间观察到的 fetch 成功返回；不代表 HTTP 成功）`,
    '每类保留最后一条完成的摘要，计数累计；授权前或旧会话迟到结果不计入。',
    'false 只有在对应检查已执行时才表示不符合；未执行不算失败。'];
  for (const [key, title] of [
    ['conversation_load_candidate', 'B. 打开已有旧聊天（优先调查）'],
    ['message_send_or_stream_candidate', 'A. 新消息发送（独立样本）'],
    ['other', '其他 endpoint（不解析正文）']
  ]) {
    const group = d.byEndpoint[key]; const t = group.last;
    lines.push('', title, `endpointClass：${key}`, `完成诊断数=${group.count}；接受=${group.accepted}；拒绝=${group.rejected}；跳过=${group.skipped}`);
    if (!t) { lines.push('暂无该分类已完成的响应；不能据此断言页面不存在历史时间。'); continue; }
    lines.push(
      `originAllowed：${checked(t.originChecked, t.originAllowed)}`,
      `URL 形态合格=${t.urlShapeAllowed}；无重定向=${t.redirectAllowed}`,
      `HTTP status 合格：${checked(t.httpStatusChecked, t.httpStatusAllowed)}`,
      `content-type 分类：${t.contentTypeChecked ? t.contentTypeClass : '未执行'}`,
      `clone：尝试=${t.cloneAttempted}；成功=${checked(t.cloneAttempted, t.cloneSucceeded)}`,
      `JSON parse：尝试=${t.jsonParseAttempted}；最近一次成功=${checked(t.jsonParseAttempted, t.jsonParseSucceeded)}；成功 JSON 值数量=${t.jsonValueCount}`,
      `root schema 识别：${checked(t.rootSchemaChecked, t.rootSchemaRecognized)}`,
      `conversation identity：找到=${checked(t.conversationIdentityChecked, t.conversationIdentityFound)}；与当前聊天一致=${checked(t.conversationIdentityChecked, t.conversationIdentityMatches)}`,
      `message collection / mapping：找到=${checked(t.messageCollectionChecked, t.messageCollectionFound)}`,
      `mapping 条目=${t.mappingEntryCount}；message 条目=${t.messageEntryCount}；检查条目=${t.inspectedEntryCount}`,
      `user-role 条目=${t.userRoleEntryCount}；有 message ID=${t.userWithMessageIDCount}；ID 格式合法=${t.userWithValidMessageIDCount}`,
      `user 有 create_time=${t.userWithCreateTimeCount}；create_time 可解析=${t.createTimeParseableCount}`,
      `条目诊断截断=${t.entriesTruncated}`,
      `最终 outcome=${t.outcome}；stage=${t.stage}；reasonCode=${t.reason}`
    );
  }
  lines.push('', 'SSE 多事件计数为已检查前缀之和；结构布尔值属于最近检查的 JSON 值，失败后不尝试兼容未知结构。',
    '发送响应缺少完整 metadata 不等于旧聊天方案失败。firstObservedAt 仅有 approximate 观察语义，本版不写入正式记录。');
  return lines.join('\n');
}
if (typeof document !== 'undefined') {
  let busy = false;
  const selection = new PeriodSelection();
  const period = document.getElementById('period');
  let latest = null;
  let receivedAt = 0;
  function semantic(data) {
    period.disabled = !selection.accept(data);
    period.value = selection.period;
    document.getElementById('semantic-summary').textContent = formatSemantic(data?.summary?.semantics, selection.period);
  }
  const arm = document.getElementById('arm');
  async function refresh(start = false) {
    if (busy) return;
    busy = true;
    const startedAt = Date.now();
    try {
      const response = await chrome.runtime.sendMessage({type: start ? 'RESPONSE_ARM' : 'RESPONSE_VIEW'});
      const data = response?.ok && Date.now() - startedAt <= 3000 ? response.data : null;
      latest = data; receivedAt = Date.now(); semantic(data);
      document.getElementById('summary').textContent = data?.pages > 1 ? '存在多个活跃聊天，请只保留一个待测 ChatGPT 标签。' : format(data?.summary);
      document.getElementById('fingerprint-summary').textContent = data?.pages > 1 ? '请只保留一个已授权普通聊天标签。' : formatFingerprints(data?.summary?.fingerprints);
      document.getElementById('rejection-summary').textContent = data?.pages > 1 ? '请只保留一个待测普通聊天。' : formatRejections(data?.summary);
      arm.disabled = !data?.summary?.canonical || data.pages !== 1;
      if (start) document.getElementById('control-status').textContent = '已请求开始；等待诊断显示“已开始”后再发送虚构消息。';
    } catch { latest = null; semantic(null); document.getElementById('summary').textContent = '连接不可用，请刷新诊断页。'; arm.disabled = true; }
    finally { busy = false; }
  }
  arm.addEventListener('click', () => void refresh(true));
  period.addEventListener('change', () => { selection.choose(period.value); semantic(latest); });
  void refresh(); setInterval(() => {
    if (Date.now() - receivedAt > 3000) { latest = null; semantic(null); }
    void refresh();
  }, 1000);
}
