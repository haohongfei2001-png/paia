import { ArchiveError, MAX_BATCH_SIZE, MAX_MESSAGE_LENGTH, ADAPTER_VERSION } from './constants.js';
import './history-time.js';
import {SourceTimeResolver} from './source-time-resolver.js';

function requireThat(condition, code = 'INVALID_REQUEST') {
  if (!condition) throw new ArchiveError(code);
}

export function canonicalChat(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.origin !== 'https://chatgpt.com' || url.username || url.password) return null;
    if (['temporary-chat', 'temporary', 'temporary_chat'].some(key => url.searchParams.has(key))) return null;
    const match = url.pathname.match(/^\/(?:g\/[a-zA-Z0-9_-]+\/)?c\/([a-zA-Z0-9_-]{1,128})\/?$/);
    if (!match) return null;
    return { id: match[1], url: `${url.origin}${url.pathname.replace(/\/$/, '')}` };
  } catch { return null; }
}

export function validateCapture(request) {
  requireThat(request.adapterVersion === ADAPTER_VERSION);
  requireThat(Number.isSafeInteger(request.epoch) && request.epoch >= 0);
  const chat = canonicalChat(request.chat?.url);
  requireThat(chat && chat.id === request.chat.id);
  requireThat(typeof request.chat.title === 'string' && request.chat.title.length <= 500);
  requireThat(Array.isArray(request.messages) && request.messages.length > 0 && request.messages.length <= MAX_BATCH_SIZE);
  const messages = request.messages.map(message => {
    requireThat(message && typeof message.sourceMessageId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(message.sourceMessageId));
    requireThat(Number.isSafeInteger(message.pageOrder) && message.pageOrder > 0 && message.pageOrder <= 1000000);
    requireThat(typeof message.originalText === 'string' && message.originalText.trim().length > 0);
    requireThat(message.originalText.length <= MAX_MESSAGE_LENGTH, 'MESSAGE_TOO_LARGE');
    return { sourceMessageId: message.sourceMessageId, pageOrder: message.pageOrder, originalText: message.originalText, sourceTime: globalThis.HistoryTime.sanitize(message.sourceTime),domTime:SourceTimeResolver.normalize(message.domTime,{chatId:chat.id,sourceMessageId:message.sourceMessageId}) };
  });
  requireThat(new Set(messages.map(m=>m.sourceMessageId)).size===messages.length);
  validateTimeOrder(messages);
  return { epoch: request.epoch, chat: { ...chat, title: request.chat.title || '未命名聊天' }, messages };
}

export function validateEnrichment(request) {
  requireThat(request.adapterVersion === ADAPTER_VERSION);
  requireThat(Number.isSafeInteger(request.epoch) && request.epoch >= 0);
  const chat = canonicalChat(request.chat?.url);
  requireThat(chat && chat.id === request.chat.id);
  requireThat(Object.keys(request.chat).every(key => ['id', 'url'].includes(key)));
  requireThat(Array.isArray(request.messages) && request.messages.length > 0 && request.messages.length <= MAX_BATCH_SIZE);
  const messages = request.messages.map(message => {
    requireThat(message && Object.keys(message).every(key => ['sourceMessageId','pageOrder','sourceTime','domTime'].includes(key)));
    requireThat(typeof message.sourceMessageId === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(message.sourceMessageId));
    requireThat(Number.isSafeInteger(message.pageOrder) && message.pageOrder > 0 && message.pageOrder <= 1000000);
    return {sourceMessageId: message.sourceMessageId, pageOrder: message.pageOrder, sourceTime: globalThis.HistoryTime.sanitize(message.sourceTime),domTime:SourceTimeResolver.normalize(message.domTime,{chatId:chat.id,sourceMessageId:message.sourceMessageId})};
  });
  requireThat(new Set(messages.map(message => message.sourceMessageId)).size === messages.length);
  validateTimeOrder(messages);
  return {chat, messages};
}

function validateTimeOrder(messages) {
  // Recheck time order in the trusted writer without changing canonical text order.
  let previousTime = null, inverted = false;
  for (const message of [...messages].sort((a, b) => a.pageOrder - b.pageOrder)) {
    if (message.sourceTime?.state !== 'valid') { previousTime = null; continue; }
    const time = message.sourceTime.createTime;
    if (previousTime !== null && time < previousTime) inverted = true;
    previousTime = time;
  }
  if (inverted) for (const message of messages) {
    if (message.sourceTime) message.sourceTime = { state: 'blocked', reason: 'ORDER' };
  }
}

export function validateChanges(changes) {
  requireThat(changes && typeof changes === 'object' && !Array.isArray(changes));
  const allowed = new Set(['note', 'editedText', 'hidden']);
  for (const key of Object.keys(changes)) requireThat(allowed.has(key));
  if ('note' in changes) requireThat(typeof changes.note === 'string' && changes.note.length <= MAX_MESSAGE_LENGTH);
  if ('editedText' in changes) requireThat(typeof changes.editedText === 'string' && changes.editedText.length <= MAX_MESSAGE_LENGTH);
  if ('hidden' in changes) requireThat(typeof changes.hidden === 'boolean');
  return { ...changes };
}
