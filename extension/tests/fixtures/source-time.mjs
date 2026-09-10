// Entirely invented history: 55 messages, 5 users, 3 visible canonical users.
export const chat = 'synthetic-semantic-chat';
export const ids = Array.from({length: 5}, (_, i) => `synthetic-semantic-user-${i}`);
export const now = 1800000000000;
export const baseTime = now / 1000 - 40 * 86400;
export function historicalFixture(base = baseTime) {
  const messages = Array.from({length: 55}, (_, i) => ({
    id: i < 5 ? ids[i] : `synthetic-semantic-assistant-${i}`,
    author: {role: i < 5 ? 'user' : 'assistant'},
    create_time: base + i * 60, update_time: i % 2 ? base + i * 60 + 1 : null,
    content: {parts: [i < 5 ? 'SYNTHETIC_USER_RESPONSE_SECRET' : 'SYNTHETIC_ASSISTANT_SECRET']}
  }));
  // Insertion order deliberately differs from conversation/canonical order.
  return {conversation_id: chat, mapping: Object.fromEntries(messages.reverse().map(message => [message.id, {message}]))};
}
