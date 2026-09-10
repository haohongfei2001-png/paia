/* MAIN-only bounded structural inspection. Raw keys/values never form a fingerprint. */
(() => {
  'use strict';
  const FIELDS = ['message', 'messages', 'mapping', 'author', 'role', 'create_time', 'update_time', 'id', 'conversation_id', 'parent', 'children'];
  const ID = /^[A-Za-z0-9_-]{8,128}$/;
  const object = v => v !== null && typeof v === 'object';
  const own = (v, k) => object(v) && Object.hasOwn(v, k);
  const validID = v => typeof v === 'string' && ID.test(v);
  const OMIT = new Set(['content', 'parts', 'text', 'title', 'attachments', 'attachment', 'html', 'body', 'id', 'create_time', 'update_time', 'role', 'conversation_id']);
  const omitted = key => OMIT.has(key) || /token|authorization|cookie|credential|password|secret|header|session/i.test(key);
  // Only user numeric scalars cross to ISOLATED memory; invalid values do not.
  function scalar(value) {
    if (value === null || value === undefined) return {state: 'missing', value: null};
    return typeof value === 'number' && Number.isFinite(value)
      ? {state: 'value', value} : {state: 'invalid', value: null};
  }
  function inspect(root, now = Date.now()) {
    const shape = {rootType: Array.isArray(root) ? 'array' : object(root) ? 'object' : 'primitive', topLevelKeyCount: object(root) ? Object.keys(root).length : 0,
      mappingLike: false, messagesLike: false, conversationIdentityField: false, minCollectionSize: 0, maxCollectionSize: 0, maxDepth: 0, depthLimited: false, truncated: false,
      fields: Object.fromEntries(FIELDS.map(k => [k, 0]))};
    const entries = new Map(); let nodes = 0; let min = Infinity;
    const collections = new Set();
    function collection(value, depth, identity, kind) {
      if (!object(value) || depth > 4 || collections.has(value)) return;
      collections.add(value);
      const keys = Object.keys(value);
      min = Math.min(min, keys.length); shape.maxCollectionSize = Math.max(shape.maxCollectionSize, keys.length);
      if (kind === 'mapping') shape.mappingLike = true; else shape.messagesLike = true;
      if (keys.length > 64) shape.truncated = true;
      for (const key of keys.slice(0, 64).filter(k => !omitted(k))) {
        const item = value[key];
        const wrapped = own(item, 'message');
        const m = wrapped ? item.message : item;
        const messageDepth = depth + (wrapped ? 2 : 1);
        if (messageDepth > 4) { if (object(m)) shape.depthLimited = true; continue; }
        if (object(m) && !Array.isArray(m)) {
          if (entries.size >= 200 && !entries.has(m)) { shape.truncated = true; continue; }
          entries.set(m, {identity, depth: messageDepth});
        }
      }
    }
    function walk(value, depth, identity) {
      if (!object(value)) return;
      if (depth > 4) { shape.depthLimited = true; return; }
      if (++nodes > 1000) { shape.truncated = true; return; }
      shape.maxDepth = Math.max(shape.maxDepth, depth);
      const keys = Object.keys(value);
      if (keys.length > 64) shape.truncated = true;
      let scope = identity;
      if (own(value, 'conversation_id')) {
        shape.conversationIdentityField = true;
        scope = validID(value.conversation_id) ? value.conversation_id : null;
      }
      for (const key of keys.slice(0, 64)) {
        if (FIELDS.includes(key)) shape.fields[key]++;
        if (omitted(key)) continue;
        const child = value[key];
        if ((key === 'mapping' || key === 'messages') && object(child)) collection(child, depth + 1, scope, key === 'mapping' ? 'mapping' : 'messages');
        if (object(child)) walk(child, depth + 1, scope);
      }
      // Direct arrays/dictionaries of message-shaped objects are diagnostic collections too.
      const structuralKeys = keys.slice(0, 64).filter(k => !omitted(k));
      if (depth < 4 && structuralKeys.filter(k => own(value[k], 'author') && own(value[k].author, 'role') && own(value[k], 'id')).length >= 2) collection(value, depth, scope, 'messages');
      // Also recognize unlabeled dictionaries whose entries explicitly wrap messages.
      if (depth < 4 && keys.slice(0, 64).filter(k => !omitted(k) && own(value[k], 'message')).length >= 2) collection(value, depth, scope, 'mapping');
    }
    walk(root, 0, null);
    shape.minCollectionSize = min === Infinity ? 0 : min;
    let roleStructure = 0, idStructure = 0, timeStructure = 0, completeMessages = 0;
    for (const [m, info] of entries) {
      if (info.depth < 4 && own(m, 'author') && own(m.author, 'role')) roleStructure++;
      if (own(m, 'id')) idStructure++;
      if (own(m, 'create_time')) timeStructure++;
      if (info.depth < 4 && own(m.author, 'role') && own(m, 'id') && own(m, 'create_time')) completeMessages++;
    }
    const candidate = !shape.truncated && entries.size >= 2 && completeMessages >= 2 && roleStructure >= 2 && idStructure >= 2 && timeStructure >= 2;
    const detail = {candidate, messageCount: entries.size, userRoleCount: 0, userWithIDCount: 0, userWithCreateTimeCount: 0, parseableCount: 0, identityPresent: [...entries.values()].some(info => validID(info.identity))};
    const matches = [];
    if (candidate) for (const [m, info] of entries) {
      if (m.author?.role !== 'user') continue;
      detail.userRoleCount++;
      if (validID(m.id)) detail.userWithIDCount++;
      if (m.create_time !== null && m.create_time !== undefined) detail.userWithCreateTimeCount++;
      if (typeof m.create_time === 'number' && Number.isFinite(m.create_time) && m.create_time >= 946684800 && m.create_time * 1000 <= now + 300000) detail.parseableCount++;
      if (validID(info.identity)) detail.identityPresent = true;
      if (validID(m.id) && validID(info.identity)) matches.push({chat: info.identity, id: m.id, create: scalar(m.create_time), update: scalar(m.update_time)});
    }
    // IDs and user numeric times stay inside this document, never in safe summaries.
    return {shape, detail, matches};
  }
  globalThis.ChatGPTJSONFingerprint = Object.freeze({inspect});
})();
