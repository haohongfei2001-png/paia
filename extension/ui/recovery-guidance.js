// One bounded next action per visible degraded state. Never infer that a failed
// capture, save, index, AI request or update changed the local archive.
export function recoveryGuidance(code) {
  switch (code) {
    case 'CONTEXT_INVALIDATED':
    case 'ADAPTER_VERSION_MISMATCH':
    case 'MESSAGE_CHANNEL_INTERRUPTED':
    case 'MESSAGE_RESPONSE_TIMEOUT':
    case 'CAPTURE_FAILED':
      return {
        kind: 'capture',
        title: '此聊天暂时没有继续归档',
        detail: '先保存尚未发送的文字，再刷新这个 ChatGPT 页面。已保存到 PAIA 的内容仍可阅读。',
        action: 'return_to_chat', label: '回到聊天页面',
      };
    case 'STORAGE_FULL':
      return {
        kind: 'storage',
        title: '本机空间不足，新内容可能尚未保存',
        detail: '请先检查本机可用空间，并保留当前安装和资料。不要卸载扩展或清理浏览器资料。',
        action: 'open_archive', label: '打开 PAIA 核对',
      };
    case 'STORAGE_FAILED':
      return {
        kind: 'save',
        title: '这次本机保存没有完成',
        detail: '已保存内容仍可阅读；返回 PAIA 核对当前文字，再手动重试保存。',
        action: 'open_archive', label: '打开 PAIA 核对',
      };
    case 'ARCHIVE_READ_FAILED':
      return {
        kind: 'read',
        title: '暂时无法读取本机档案状态',
        detail: '保留当前安装和资料，稍后重试读取；不要卸载扩展或清理浏览器资料。',
        action: 'retry_read', label: '重试读取',
      };
    case 'UPDATE_CHECK_FAILED':
      return {
        kind: 'update',
        title: '暂时无法确认此安装的更新',
        detail: '当前安装和本机资料保持原状。稍后手动重试检查；这不表示更新已安装。',
        action: 'retry_update', label: '重试检查',
      };
    case 'INDEX_UNAVAILABLE':
      return {
        kind: 'index',
        title: '当前聊天暂时无法搜索',
        detail: '聊天原文仍可阅读；重试搜索不会删除或重建档案。',
        action: 'retry_search', label: '重试搜索',
      };
    case 'PROVIDER_UNAVAILABLE':
    case 'MODEL_NOT_AVAILABLE':
    case 'PROVIDER_TIMEOUT':
    case 'NETWORK_ERROR':
      return {
        kind: 'ai',
        title: 'AI 服务尚未上线',
        detail: '已有本机档案与整理内容仍可阅读。本版本不会发起新的 AI 处理。',
        action: 'open_archive', label: '查看已有内容',
      };
    default:
      return null;
  }
}
