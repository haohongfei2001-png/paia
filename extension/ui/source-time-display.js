import '../core/source-time.js';
const {sanitize, evaluate, AGES} = globalThis.SourceTimeProtocol;
export function formatSemantic(value, period = 'unknown') {
  const s = sanitize(value);
  if (!s || !s.allowed) return '暂无合格的单普通聊天时间样本；等待诊断连接。timeConfidenceCandidate = unknown';
  const result = evaluate(s, period);
  const percent = s.canonical ? `${Math.floor(s.matched * 100 / s.canonical)}%` : 'unknown';
  return [
    `canonical user count = ${s.canonical}；exact conversation identity + message ID matches = ${s.matched}；exact match rate = ${percent}`,
    `matched with create_time = ${s.withCreate}；parseable and unambiguous = ${s.parseable}`,
    `已见缺失 create_time = ${s.missingCreate}；无效 create_time = ${s.invalidCreate}；同 ID 冲突 = ${s.conflicts}`,
    `conversation order：当前 canonical 相邻可比较对 = ${s.orderPairs}；逆序 = ${s.orderInversions}`,
    `本次诊断采集边界：可比较 = ${s.captureComparable}；create_time 严格早于边界 = ${s.beforeCapture}`,
    '该边界是首次 canonical 采集时刻，位于后续保存之前；未读取旧档案 capturedAt。',
    `update_time：未提供 = ${s.updateMissing}；已提供 = ${s.updatePresent}；无效 = ${s.updateInvalid}；早于 create_time = ${s.updateBeforeCreate}；晚于检查时刻 = ${s.updateFuture}`,
    `年龄分布：today = ${s.ages.today}；1–7天 = ${s.ages.days_ago}；1–4周 = ${s.ages.weeks_ago}；1个月以上 = ${s.ages.older}；unknown = ${s.ages.unknown}`,
    `人工时期 = ${AGES.includes(period) ? period : 'unknown'}；历史候选观察次数 = ${s.observations}；容量截断 = ${s.truncated}`,
    ...Object.entries(result.checks).map(([key, value]) => `${key} = ${value}`),
    `timeSourceCandidate = ${result.timeSourceCandidate}`,
    `timeConfidenceCandidate = ${result.timeConfidenceCandidate}`,
    '结论仅覆盖当前可见样本及本次会话；跨刷新逐 ID 稳定性 = unknown。'
  ].join('\n');
}
// Only a coarse selection and non-identifying counters live in the UI.
export class PeriodSelection {
  constructor() { this.key = null; this.period = 'unknown'; }
  accept(data) {
    const s = sanitize(data?.summary?.semantics);
    const ready = data?.pages === 1 && Number.isSafeInteger(data.generation) && s?.allowed && s.canonical > 0;
    const key = ready ? `${data.generation}:${s.revision}` : null;
    if (key !== this.key || !ready) this.period = 'unknown';
    this.key = key;
    return Boolean(ready);
  }
  choose(value) { this.period = this.key !== null && AGES.includes(value) ? value : 'unknown'; }
}
