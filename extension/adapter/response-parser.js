/* MAIN-only finite response contract; candidate format, not a public API guarantee. */
(() => {
  'use strict';
  const ID = /^[A-Za-z0-9_-]{8,128}$/;
  const LIMIT = 2000;
  const validID = value => typeof value === 'string' && ID.test(value);
  function user(message) {
    if (!message || typeof message !== 'object' || typeof message.author?.role !== 'string') throw 0;
    if (message.author.role !== 'user') return null;
    if (!validID(message.id) || (message.create_time !== null && message.create_time !== undefined && (typeof message.create_time !== 'number' || !Number.isFinite(message.create_time)))) throw 0;
    return {id: message.id, role: 'user', time: message.create_time ?? null};
  }
  function parse(value, kind, expected) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0;
    if (kind === 'snapshot') {
      if (value.conversation_id !== expected || !value.mapping || Array.isArray(value.mapping) || typeof value.mapping !== 'object') throw 0;
      const nodes = Object.values(value.mapping);
      if (nodes.length > LIMIT) throw 0;
      const rows = [];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') throw 0;
        if (node.message === null) continue;
        const row = user(node.message);
        if (row) rows.push(row);
      }
      return {chat: expected, rows};
    }
    if (!validID(value.conversation_id) || value.conversation_id !== expected || !value.message) throw 0;
    const row = user(value.message);
    return {chat: expected, rows: row ? [row] : []};
  }
  // Diagnostic-only projection. Never participates in acceptance or reads content.
  function diagnose(value, kind, expected, now = Date.now()) {
    const d = {rootSchemaChecked: true, rootSchemaRecognized: false,
      conversationIdentityChecked: false, conversationIdentityFound: false, conversationIdentityMatches: false,
      messageCollectionChecked: false, messageCollectionFound: false,
      mappingEntryCount: 0, messageEntryCount: 0, inspectedEntryCount: 0, userRoleEntryCount: 0,
      userWithMessageIDCount: 0, userWithValidMessageIDCount: 0, userWithCreateTimeCount: 0,
      createTimeParseableCount: 0, entriesTruncated: false, reason: 'ROOT_NOT_OBJECT', stage: 'root_schema'};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return d;
    d.conversationIdentityChecked = true;
    d.conversationIdentityFound = typeof value.conversation_id === 'string' && value.conversation_id.length > 0;
    d.conversationIdentityMatches = value.conversation_id === expected;
    d.messageCollectionChecked = true;
    const collection = kind === 'snapshot' ? value.mapping : value.message;
    d.messageCollectionFound = Boolean(collection && typeof collection === 'object' && !Array.isArray(collection));
    d.rootSchemaRecognized = d.messageCollectionFound;
    let issue = null;
    if (!d.rootSchemaRecognized) issue = ['root_schema', 'ROOT_SCHEMA_UNKNOWN'];
    else if (!d.conversationIdentityFound) issue = ['conversation_identity', 'CONVERSATION_ID_MISSING'];
    else if (!d.conversationIdentityMatches) issue = ['conversation_identity', 'CONVERSATION_ID_MISMATCH'];
    if (d.messageCollectionFound) {
      const nodes = kind === 'snapshot' ? Object.values(collection) : [{message: collection}];
      d.mappingEntryCount = kind === 'snapshot' ? Math.min(nodes.length, 1000000) : 0;
      d.entriesTruncated = nodes.length > LIMIT;
      if (d.entriesTruncated) issue ||= ['collection', 'COLLECTION_LIMIT'];
      for (const node of nodes.slice(0, LIMIT)) {
        d.inspectedEntryCount++;
        if (!node || typeof node !== 'object') { issue ||= ['message', 'MESSAGE_ENTRY_INVALID']; continue; }
        const m = node.message;
        if (m === null) continue;
        d.messageEntryCount++;
        if (!m || typeof m !== 'object' || typeof m.author?.role !== 'string') { issue ||= ['message', 'MESSAGE_ENTRY_INVALID']; continue; }
        if (m.author.role !== 'user') continue;
        d.userRoleEntryCount++;
        if (m.id !== undefined && m.id !== null) d.userWithMessageIDCount++;
        if (validID(m.id)) d.userWithValidMessageIDCount++;
        else issue ||= ['user_id', 'USER_MESSAGE_ID_INVALID'];
        if (m.create_time !== undefined && m.create_time !== null) {
          d.userWithCreateTimeCount++;
          if (typeof m.create_time !== 'number' || !Number.isFinite(m.create_time)) issue ||= ['create_time', 'CREATE_TIME_TYPE_INVALID'];
          else if (m.create_time >= 946684800 && m.create_time * 1000 <= now + 300000) d.createTimeParseableCount++;
        }
      }
    }
    [d.stage, d.reason] = issue || ['accepted', 'ACCEPTED'];
    return d;
  }
  globalThis.ChatGPTResponseParser = Object.freeze({ID, LIMIT, parse, diagnose});
})();
