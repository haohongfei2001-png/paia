import {assertFeatureAvailable} from '../core/feature-availability.js';
import {beginMaintenanceRead} from './maintenance-recovery.js';
export const STATUS_LABELS = Object.freeze({
  FEATURE_UNAVAILABLE: '此功能已停用，已有资料仍保留',
  AI_SERVICE_UNAVAILABLE: 'AI 服务尚未上线，已有整理内容仍可查看',
  SOURCE_PURGE_OWNER_GATE: '删除边界尚未确定，没有删除材料或恢复草稿',
  REMOVAL_SCOPE_UNAVAILABLE: '无法完整核对移出范围，尚未移出任何内容',
  SOURCE_PURGE_UNAVAILABLE: '无法完整核对删除范围，没有删除材料',
  ADAPTER_LIMIT: '页面内身份缓存已达上限，请刷新该聊天后继续',
  CAPTURING: '最近一次扫描完成',
  WAITING_CHAT: '等待普通聊天生成正式聊天 ID',
  TEMPORARY_CHAT: '已跳过临时聊天',
  NO_MESSAGES: '未找到已显示的用户文字',
  ADAPTER_MISMATCH: '页面结构不匹配，已跳过',
  ADAPTER_VERSION_MISMATCH: '内容脚本版本不一致，请刷新 ChatGPT 标签页',
  UNSTABLE_PAGE: '页面正在变化，等待稳定',
  PAUSED: '收录已暂停',
  CONSENT_REQUIRED: '等待你的阅读与同意',
  CAPTURE_FAILED: '收录未完成，请刷新 ChatGPT 后重试',
  MESSAGE_TOO_LARGE: '文字超出单条存储限制，已跳过',
  CONTEXT_INVALIDATED: '扩展已更新，请刷新 ChatGPT 标签页',
  STORAGE_FULL: '存储空间不足，请保留现有资料并检查本机可用空间',
  STORAGE_FAILED: '本地保存失败，请重试',
  INVALID_REQUEST: '操作内容无效，未保存',
  FORBIDDEN: '此操作不被允许',
  STALE_CAPTURE: '已丢弃暂停或旧启用状态下的捕获',
  UNAVAILABLE: '扩展暂时不可用，请重新打开此页面',
  CREDENTIAL_FAILURE: 'AI 服务尚未上线',
  RATE_LIMIT: '服务限流，请稍后重试',
  TIMEOUT: '连接超时，请重试',
  CANCELLED: '连接已取消',
  INVALID_CREDENTIAL: 'AI 服务暂不可用',
  RATE_LIMITED: '请求受限，请稍后重试',
  PROVIDER_TIMEOUT: '服务响应超时，当前内容保留',
  PROVIDER_BAD_REQUEST: 'Provider 请求格式无效',
  MODEL_NOT_AVAILABLE: '当前模型不可用',
  PROVIDER_UNAVAILABLE: '服务暂不可用，当前内容保留',
  NETWORK_ERROR: '网络连接失败',
  INVALID_PROVIDER_OUTPUT: '服务响应异常',
  NO_CREDENTIAL: 'AI 服务尚未上线',
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
  BUDGET_EXCEEDED: '本次处理超出安全范围，当前内容保留',
  STALE_BASE: '内容或组织已更新，请重读后再次整理',
  BUDGET_RESERVATION_FAILED: '本次整理超出当前处理预算',
  HOST_PERMISSION_MISSING: '当前 AI 服务不可用',
  HOST_PERMISSION_NOT_GRANTED: '当前 AI 服务不可用',
  CSP_BLOCKED: '安全设置阻止了该服务连接',
  WRONG_FETCH_CONTEXT: '请求未在可信后台执行',
  INTERNAL_RUNTIME_ERROR: '整理运行异常，请查看具体阶段'
});

export function statusLabel(code) {
  if(typeof document!=='undefined'&&document.documentElement.lang==='en'){
    if(code==='SOURCE_PURGE_OWNER_GATE')return 'Deletion policy is unresolved; no material or recovery draft was deleted';
    if(code==='REMOVAL_SCOPE_UNAVAILABLE')return 'The complete removal scope could not be checked; no input was removed';
    if(code==='SOURCE_PURGE_UNAVAILABLE')return 'The complete deletion scope could not be checked; no material was deleted';
  }
  return STATUS_LABELS[code] || '操作未完成，请重试或查看诊断详情。';
}

export async function request(type, fields = {}) {
  const maintenanceRead=beginMaintenanceRead(type,fields);
  try {
    assertFeatureAvailable({type,...fields});
    const response = await chrome.runtime.sendMessage({ type, ...fields });
    if (response?.ok) {maintenanceRead({data:response.data});return response.data;}
    const code = typeof response?.error==='string'&&/^[A-Z][A-Z0-9_]{1,63}$/.test(response.error) ? response.error : 'UNAVAILABLE';
    throw Object.assign(new Error(statusLabel(code)), { code, ...(typeof response?.phase==='string'&&/^[a-z_]{1,40}$/.test(response.phase)?{phase:response.phase}:{}) });
  } catch (error) {
    const interrupted=/message port|receiving end|message channel|context invalidated/i.test(error?.message||'');
    const code = typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{1,63}$/.test(error.code) ? error.code : interrupted?'MESSAGE_CHANNEL_INTERRUPTED':'UNAVAILABLE';
    maintenanceRead({error:{code}});
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
  return settings.enabled ? '收录已启用' : '收录已暂停';
}

export function diagnosticText(state) {
  if (!state?.settings?.consentVersion || !state.settings.enabled) return '';
  const status = state.diagnostics?.status;
  if (!status || ['CAPTURING','WAITING_CHAT','TEMPORARY_CHAT','NO_MESSAGES','UNSTABLE_PAGE'].includes(status)) return '';
  return statusLabel(status);
}

// Bounded local capture metadata, not a completeness claim or a source timestamp.
export function captureHealthText(diagnostics={}) {
  const h=diagnostics.captureHealth,i=diagnostics.ingestion;
  const count=value=>Number.isSafeInteger(value)&&value>=0?Math.min(value,1000000):0;
  const states={NOT_OBSERVED:'尚未观察到响应',READING:'正在读取有限响应副本',ACCEPTED:'存在通过契约的用户时间元数据',NO_ACCEPTED_METADATA:'响应未提供可接受的用户时间元数据',LIMIT:'时间读取或缓存达到上限',READ_FAILED:'时间证据读取失败'};
  const parts=[];
  if(h)parts.push(`时间证据：${states[h.responseState]||'状态不可用'}。响应候选：可用 ${count(h.sourceTimesAvailable)}，缺失 ${count(h.sourceTimesMissing)}，拒绝 ${count(h.sourceTimesBlocked)}；尚未确认落盘的来源 ${count(h.unsettledSources)}。`);
  if(i)parts.push(`最近一批${i.kind==='enrich'?'补全':'抓取'}：新增快照 ${count(i.added)}，重复抑制 ${count(i.duplicates)}，忽略 ${count(i.ignored)}，来源未落盘 ${count(i.unresolved)}；存储时间已知 ${count(i.knownTimes)}，未知 ${count(i.unknownTimes)}。`);
  return parts.join(' ')||'捕获底座：尚无本机诊断记录。';
}
