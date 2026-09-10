export const STATUS_LABELS = Object.freeze({
  CAPTURING: '最近一次扫描完成',
  WAITING_CHAT: '等待普通聊天生成正式聊天 ID',
  TEMPORARY_CHAT: '已跳过临时聊天',
  NO_MESSAGES: '未找到已显示的用户文字',
  ADAPTER_MISMATCH: '页面结构不匹配，已跳过',
  ADAPTER_VERSION_MISMATCH: '内容脚本版本不一致，请刷新 ChatGPT 标签页',
  UNSTABLE_PAGE: '页面正在变化，等待稳定',
  PAUSED: '捕获已暂停',
  CONSENT_REQUIRED: '等待你的阅读与同意',
  CAPTURE_FAILED: '捕获未完成，请刷新 ChatGPT 后重试',
  MESSAGE_TOO_LARGE: '文字超出单条存储限制，已跳过',
  CONTEXT_INVALIDATED: '扩展已更新，请刷新 ChatGPT 标签页',
  STORAGE_FULL: '存储空间不足，请先导出备份，再管理原始档案',
  STORAGE_FAILED: '本地保存失败，请重试',
  INVALID_REQUEST: '操作内容无效，未保存',
  FORBIDDEN: '此操作不被允许',
  STALE_CAPTURE: '已丢弃暂停或旧启用状态下的捕获',
  UNAVAILABLE: '扩展暂时不可用，请重新打开此页面',
  CREDENTIAL_FAILURE: '请先在 Settings 配置 DeepSeek API Key',
  RATE_LIMIT: '服务限流，请稍后重试',
  TIMEOUT: '连接超时，请重试',
  CANCELLED: '连接已取消',
  INVALID_CREDENTIAL: 'API Key 无效或无权限',
  RATE_LIMITED: '请求受限，请稍后重试',
  PROVIDER_TIMEOUT: 'DeepSeek 响应超时，当前内容保留',
  PROVIDER_BAD_REQUEST: 'Provider 请求格式无效',
  MODEL_NOT_AVAILABLE: '当前模型不可用',
  PROVIDER_UNAVAILABLE: 'DeepSeek 暂时无法处理请求，当前内容保留',
  NETWORK_ERROR: '网络连接失败',
  INVALID_PROVIDER_OUTPUT: '服务响应异常',
  NO_CREDENTIAL: '未配置 API Key',
  REQUEST_NOT_SENT: '请求尚未发送',
  SPAN_VALIDATION_FAILED: '原文引用位置无效',
  BASE_CHANGED: '输入或组织已变化，请重试',
  COMMIT_FAILED: '思想库提交未完成，请重试',
  WORKER_INTERRUPTED: '后台任务已中断，可继续整理',
  MANUAL_RECOVERY_REQUIRED: '整理任务需要人工恢复',
  REQUEST_ALREADY_IN_FLIGHT: '已有一次整理请求正在进行',
  OUTCOME_UNKNOWN: '上一次请求结果未知，为避免重复收费已暂停。请核对当前内容后，再决定是否重试',
  RESPONSE_BODY_READ_FAILED: '读取服务响应失败',
  INVALID_JSON: 'AI整理返回格式异常，本次没有修改思想库',
  INVALID_SCHEMA: 'AI整理返回格式异常，本次没有修改思想库',
  MESSAGE_CHANNEL_INTERRUPTED: '后台消息通道已中断',
  MESSAGE_RESPONSE_TIMEOUT: '后台未在 35 秒内返回结果',
  PREPARE_LEDGER_WRITE_FAILED: '整理请求记录写入失败',
  BATCH_STATE_WRITE_FAILED: '整理批次状态写入失败',
  SINGLE_FLIGHT_ACQUIRE_FAILED: '无法取得本次整理执行权',
  TRACE_WRITE_FAILED: '整理诊断状态写入失败',
  BOOTSTRAP_STATE_WRITE_FAILED: '首次整理进度写入失败',
  LIBRARY_COMMIT_FAILED: '思想库提交失败',
  BUDGET_EXCEEDED: '今日 AI 整理额度或本批处理大小已达到设置上限',
  STALE_BASE: '内容或组织已更新，请重读后再次整理',
  BUDGET_RESERVATION_FAILED: '本次整理超出当前处理预算',
  HOST_PERMISSION_MISSING: '扩展未声明 DeepSeek 网络权限',
  HOST_PERMISSION_NOT_GRANTED: 'Chrome 尚未授予 DeepSeek 网络权限',
  CSP_BLOCKED: '扩展安全策略阻止 DeepSeek 连接',
  WRONG_FETCH_CONTEXT: '请求未在可信后台执行',
  INTERNAL_RUNTIME_ERROR: '整理运行异常，请查看具体阶段'
});

export function statusLabel(code) {
  return STATUS_LABELS[code] || '操作未完成，请重试或查看诊断详情。';
}

export async function request(type, fields = {}) {
  try {
    const response = await chrome.runtime.sendMessage({ type, ...fields });
    if (response?.ok) return response.data;
    const code = typeof response?.error==='string'&&/^[A-Z][A-Z0-9_]{1,63}$/.test(response.error) ? response.error : 'UNAVAILABLE';
    throw Object.assign(new Error(statusLabel(code)), { code, ...(typeof response?.phase==='string'&&/^[a-z_]{1,40}$/.test(response.phase)?{phase:response.phase}:{}) });
  } catch (error) {
    const interrupted=/message port|receiving end|message channel|context invalidated/i.test(error?.message||'');
    const code = typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{1,63}$/.test(error.code) ? error.code : interrupted?'MESSAGE_CHANNEL_INTERRUPTED':'UNAVAILABLE';
    throw Object.assign(new Error(statusLabel(code)), { code, ...(typeof error?.phase==='string'&&/^[a-z_]{1,40}$/.test(error.phase)?{phase:error.phase}:{}) });
  }
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function dateLabel(value, includeTime = true) {
  if (!value || Number.isNaN(Date.parse(value))) return '尚无记录';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : {})
  }).format(new Date(value));
}

export function sizeLabel(bytes = 0) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function enabledLabel(settings) {
  if (!settings?.consentVersion) return '尚未启用';
  return settings.enabled ? '捕获已启用' : '捕获已暂停';
}

export function diagnosticText(state) {
  if (!state?.settings?.consentVersion) return statusLabel('CONSENT_REQUIRED');
  if (!state.settings.enabled) return statusLabel('PAUSED');
  const diagnostics = state.diagnostics || {};
  const lastScan = Date.parse(diagnostics.lastScanAt || '');
  if (!Number.isFinite(lastScan)) return '等待 ChatGPT 页面首次扫描';
  const stale = Date.now() - lastScan > 60_000;
  return `${statusLabel(diagnostics.status)}${stale ? ' · 状态已过期，请查看 ChatGPT 标签页' : ' · 仅代表最近一次扫描'}`;
}
