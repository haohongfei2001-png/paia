export async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function identifySource(chatId, sourceMessageId) {
  return hashText(JSON.stringify(['chatgpt', chatId, sourceMessageId]));
}

export async function identify(chatId, sourceMessageId, originalText) {
  const contentHash = await hashText(originalText);
  const sourceKey = await identifySource(chatId, sourceMessageId);
  const dedupeKey = await hashText(JSON.stringify([sourceKey, contentHash]));
  return { contentHash, sourceKey, dedupeKey };
}

export function knownKeys(state) {
  return new Set([...state.records.map(record => record.dedupeKey), ...state.tombstones]);
}
