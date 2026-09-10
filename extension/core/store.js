import {syncWorkspace,applyDocumentEdit,validatePreferences} from './workspace.js';
import {emptyLibrary, syncLibrary, detachSources, validateLibraryChanges, memoryContext} from './library.js';
import {
  ADAPTER_VERSION, CONSENT_VERSION, STORAGE_KEY, QUOTA_BYTES,
  ArchiveError, STATUS_CODES, ERROR_CODES, safeErrorCode
} from './constants.js';
import { identify, identifySource, knownKeys, hashText } from './dedupe.js';
import { validateCapture, validateChanges, validateEnrichment, canonicalChat } from './validation.js';
import { sanitizeStructure, sanitizeDiagnostics } from './diagnostics.js';
import {unknownTime,applySourceTime} from './record-time.js';

export function initialState() {
  return {
    schemaVersion: 5,
    library: emptyLibrary(), memoryAccessPolicy: {enabled: false, status: 'disabled'},
    settings: { consentVersion: 0, consentAt: null, enabled: false, epoch: 0 },
    records: [], tombstones: [], sourceTimes: {},
    diagnostics: {
      status: 'CONSENT_REQUIRED', adapterVersion: ADAPTER_VERSION,
      lastScanAt: null, lastSuccessAt: null, lastError: null, scanned: 0, added: 0,
      structure: null, structureAt: null
    }
  };
}

// Resolve only source-bound evidence. A historical local order is not identity.
async function resolveSource(records, chat, messageId, sourceKey) {
  const matches=[];
  for(const record of records) {
    const savedChat=canonicalChat(record.chatUrl);
    if(record.platform!=='chatgpt'||record.chatId&&record.chatId!==chat.id||
       record.chatUrl&&savedChat?.id!==chat.id||record.sourceMessageId&&record.sourceMessageId!==messageId||
       record.sourceKey&&record.sourceKey!==sourceKey)continue;
    let exact=record.sourceKey===sourceKey||
      (record.chatId===chat.id||savedChat?.id===chat.id)&&record.sourceMessageId===messageId;
    // The saved hash binds a source identity AND a snapshot hash. Never hash or
    // compare old body text to migrate identity; matching content alone is insufficient.
    if(!exact&&(record.chatId===chat.id||savedChat?.id===chat.id)&&
       /^[a-f0-9]{64}$/.test(record.contentHash||'')&&/^[a-f0-9]{64}$/.test(record.dedupeKey||'')&&
       records.filter(r=>r.dedupeKey===record.dedupeKey).length===1)
      exact=record.dedupeKey===await hashText(JSON.stringify([sourceKey,record.contentHash]));
    if(exact)matches.push(record);
  }
  let changed=false;
  for(const record of matches)for(const [key,value] of Object.entries({chatId:chat.id,sourceMessageId:messageId,sourceKey}))
    if(record[key]==null){record[key]=value;changed=true;}
  return {records:matches,changed};
}

// One service-worker instance is the sole writer. Commit one complete state value,
// then publish it in memory; failed writes cannot mutate the previous snapshot.
export class ArchiveStore {
  constructor(storage, { clock = () => new Date().toISOString(), uuid = () => crypto.randomUUID() } = {}) {
    this.storage = storage;
    this.clock = clock;
    this.uuid = uuid;
    this.state = null;
    this.tail = Promise.resolve();
    this.volatileError = null;
    this.lastDiagnosticCommitAt = 0;
  }

  async load() {
    if (this.state) return;
    const saved = (await this.storage.get(STORAGE_KEY))[STORAGE_KEY];
    if (saved && (![1,2,4,5].includes(saved.schemaVersion) || !Array.isArray(saved.records) || !Array.isArray(saved.tombstones) || !saved.settings || !saved.diagnostics)) {
      throw new ArchiveError('STORAGE_FAILED');
    }
    const next = saved || initialState();
    const migrating = saved && saved.schemaVersion !== 5;
    if(next.schemaVersion===1) {
      next.records=next.records.map(r=>({...r,...unknownTime()}));
      next.sourceTimes={};next.schemaVersion=2;
    }
    if(!next.sourceTimes||typeof next.sourceTimes!=='object'||Array.isArray(next.sourceTimes))throw new ArchiveError('STORAGE_FAILED');
    next.diagnostics = sanitizeDiagnostics(next.diagnostics);
    if (next.settings.consentVersion !== CONSENT_VERSION || !next.settings.enabled) {
      next.diagnostics.structure = null;
      next.diagnostics.structureAt = null;
    }
    syncLibrary(next);
    syncWorkspace(next);
    next.schemaVersion = 5;
    if (migrating) await this.storage.set({[STORAGE_KEY]: next});
    // Publish only after every load check passes, including on later retries.
    this.state = next;
    this.lastDiagnosticCommitAt = Date.parse(this.state.diagnostics.lastScanAt) || 0;
  }

  run(operation) {
    const task = this.tail.then(async () => {
      await this.load();
      return operation();
    });
    this.tail = task.catch(() => {});
    return task;
  }

  async commit(next) {
    try {
      syncLibrary(next);
      syncWorkspace(next);
      next.diagnostics = sanitizeDiagnostics(next.diagnostics);
      await this.storage.set({ [STORAGE_KEY]: next });
      this.state = next;
      this.volatileError = null;
      this.lastDiagnosticCommitAt = Date.parse(next.diagnostics.lastScanAt) || 0;
    } catch (error) {
      const code = safeErrorCode(error);
      this.volatileError = { code, at: this.clock() };
      throw new ArchiveError(code);
    }
  }

  status() {
    return this.run(() => ({
      enabled: this.state.settings.enabled === true && this.state.settings.consentVersion === CONSENT_VERSION,
      consented: this.state.settings.consentVersion === CONSENT_VERSION,
      epoch: this.state.settings.epoch,
      adapterVersion: ADAPTER_VERSION
    }));
  }

  snapshot() {
    return this.run(async () => {
      const { schemaVersion, library, conversations, preferences, memoryAccessPolicy, settings, records, diagnostics: rawDiagnostics } = structuredClone(this.state);
      const diagnostics = sanitizeDiagnostics(rawDiagnostics);
      if (this.volatileError) {
        diagnostics.lastError = this.volatileError;
        diagnostics.status = this.volatileError.code;
      }
      const bytes = await this.storage.getBytesInUse(STORAGE_KEY);
      return {
        schemaVersion, library, conversations, preferences, memoryAccessPolicy, settings, records, diagnostics, adapterVersion: ADAPTER_VERSION,
        stats: {
          total: records.filter(record => !record.deletedAt).length,
          hidden: records.filter(record => !record.deletedAt && record.hidden).length,
          trash: records.filter(record => record.deletedAt).length,
          bytes, quotaBytes: QUOTA_BYTES
        }
      };
    });
  }

  consent(accepted) {
    return this.run(async () => {
      if (accepted !== true) throw new ArchiveError('INVALID_REQUEST');
      const next = structuredClone(this.state);
      next.settings = {
        consentVersion: CONSENT_VERSION, consentAt: this.clock(), enabled: true,
        epoch: next.settings.epoch + 1
      };
      next.diagnostics.status = 'WAITING_CHAT';
      next.diagnostics.structure = null;
      next.diagnostics.structureAt = null;
      await this.commit(next);
      return { enabled: true };
    });
  }

  setEnabled(enabled) {
    return this.run(async () => {
      if (typeof enabled !== 'boolean') throw new ArchiveError('INVALID_REQUEST');
      if (this.state.settings.consentVersion !== CONSENT_VERSION) throw new ArchiveError('CONSENT_REQUIRED');
      if (this.state.settings.enabled === enabled) return { enabled };
      const next = structuredClone(this.state);
      next.settings.enabled = enabled;
      next.settings.epoch += 1;
      next.diagnostics.status = enabled ? 'WAITING_CHAT' : 'PAUSED';
      next.diagnostics.structure = null;
      next.diagnostics.structureAt = null;
      await this.commit(next);
      return { enabled };
    });
  }

  capture(request) {
    return this.run(async () => {
      if (this.state.settings.consentVersion !== CONSENT_VERSION) throw new ArchiveError('CONSENT_REQUIRED');
      if (!this.state.settings.enabled) throw new ArchiveError('PAUSED');
      if (request.epoch !== this.state.settings.epoch) throw new ArchiveError('STALE_CAPTURE');
      const { chat, messages } = validateCapture(request);
      const next = structuredClone(this.state);
      const known = knownKeys(next);
      let added = 0, timeChanged = false;
      for (const message of messages) {
        const identity = await identify(chat.id, message.sourceMessageId, message.originalText);
        if (next.tombstones.some(t => t.sourceIdentityHash === identity.sourceKey && t.status === 'permanently_ignored')) continue;
        if (known.has(identity.dedupeKey)) {
          // Tombstones must not reintroduce records or time evidence.
          if(next.records.some(r=>r.dedupeKey===identity.dedupeKey)) {
            const resolved=await resolveSource(next.records,chat,message.sourceMessageId,identity.sourceKey);
            timeChanged=applySourceTime(next,identity.sourceKey,message.sourceTime,message.pageOrder,this.clock(),resolved.records,message.domTime)||resolved.changed||timeChanged;
          }
          continue;
        }
        const prior = next.records.findLast(record => record.sourceKey === identity.sourceKey);
        const now = this.clock();
        next.records.push({
          id: this.uuid(), platform: 'chatgpt', chatId: chat.id, chatUrl: chat.url,
          chatTitle: chat.title, sourceMessageId:message.sourceMessageId, pageOrder:message.pageOrder, originalText:message.originalText, ...identity, ...unknownTime(),
          capturedAt: now, previousVersionId: prior?.id || null,
          note: '', editedText: '', hidden: false, deletedAt: null, updatedAt: now
        });
        timeChanged=applySourceTime(next,identity.sourceKey,message.sourceTime,message.pageOrder,now,undefined,message.domTime)||timeChanged;
        known.add(identity.dedupeKey);
        added += 1;
      }
      const now = this.clock();
      Object.assign(next.diagnostics, {
        status: 'CAPTURING', lastScanAt: now, lastSuccessAt: now,
        adapterVersion: ADAPTER_VERSION, scanned: messages.length, added
      });
      // Duplicate-only scans update a lightweight diagnostic in memory. Persist at
      // most once per minute, keeping observers from rewriting the entire archive.
      if (added || timeChanged || Date.parse(now) - this.lastDiagnosticCommitAt >= 60000 || this.state.diagnostics.status !== 'CAPTURING') {
        await this.commit(next);
      } else {
        this.state = next;
      }
      return { added, duplicates: messages.length - added, status: 'CAPTURING' };
    });
  }

  enrich(request) {
    return this.run(async () => {
      if (this.state.settings.consentVersion !== CONSENT_VERSION) throw new ArchiveError('CONSENT_REQUIRED');
      if (!this.state.settings.enabled) throw new ArchiveError('PAUSED');
      if (request.epoch !== this.state.settings.epoch) throw new ArchiveError('STALE_CAPTURE');
      const {chat, messages} = validateEnrichment(request);
      const next = structuredClone(this.state);
      let enriched = 0;
      for (const message of messages) {
        const sourceKey = await identifySource(chat.id, message.sourceMessageId);
        const resolved=await resolveSource(next.records,chat,message.sourceMessageId,sourceKey);
        const records=resolved.records;
        if (!records.length) continue; // Metadata cannot create or resurrect a record.
        let changed = resolved.changed;
        changed = applySourceTime(next,sourceKey,message.sourceTime,message.pageOrder,this.clock(),records,message.domTime) || changed;
        if (changed) enriched += records.length;
      }
      if (enriched) await this.commit(next);
      return {enriched};
    });
  }

  diagnose({ code, scanned = 0, structure = null }) {
    return this.run(async () => {
      if (!STATUS_CODES.has(code)) throw new ArchiveError('INVALID_REQUEST');
      if (!Number.isSafeInteger(scanned) || scanned < 0 || scanned > 1000000) throw new ArchiveError('INVALID_REQUEST');
      const next = structuredClone(this.state);
      const now = this.clock();
      const status = !next.settings.consentVersion ? 'CONSENT_REQUIRED' : !next.settings.enabled ? 'PAUSED' : code;
      next.diagnostics.status = status;
      next.diagnostics.lastScanAt = now;
      next.diagnostics.scanned = scanned;
      next.diagnostics.added = 0;
      const structureAllowed = next.settings.consentVersion === CONSENT_VERSION && next.settings.enabled &&
        !['PAUSED', 'CONSENT_REQUIRED', 'TEMPORARY_CHAT', 'WAITING_CHAT', 'ADAPTER_VERSION_MISMATCH', 'CONTEXT_INVALIDATED'].includes(status);
      next.diagnostics.structure = structureAllowed ? sanitizeStructure(structure) : null;
      next.diagnostics.structureAt = next.diagnostics.structure ? now : null;
      next.diagnostics.adapterVersion = ADAPTER_VERSION;
      const structureChanged = JSON.stringify(next.diagnostics.structure) !== JSON.stringify(this.state.diagnostics.structure);
      if (ERROR_CODES.has(status)) next.diagnostics.lastError = { code: status, at: now };
      if (structureChanged || this.state.diagnostics.status !== status || Date.parse(now) - this.lastDiagnosticCommitAt >= 60000) {
        await this.commit(next);
      } else {
        this.state = next;
      }
      return { status };
    });
  }

  update(id, changes) {
    return this.changeRecord(id, record => {
      if (record.deletedAt) throw new ArchiveError('INVALID_REQUEST');
      Object.assign(record, validateChanges(changes));
    });
  }

  trash(id) { return this.changeRecord(id, record => { record.deletedAt = this.clock(); }); }
  restore(id) { return this.changeRecord(id, record => { record.deletedAt = null; }); }

  changeRecord(id, transform) {
    return this.run(async () => {
      const next = structuredClone(this.state);
      const record = next.records.find(item => item.id === id);
      if (!record) throw new ArchiveError('INVALID_REQUEST');
      transform(record);
      record.updatedAt = this.clock();
      await this.commit(next);
      return { id };
    });
  }

  purge(id) {
    return this.run(async () => {
      const next = structuredClone(this.state);
      const record = next.records.find(item => item.id === id);
      if (!record?.deletedAt) throw new ArchiveError('INVALID_REQUEST');
      const sourceKey = /^[a-f0-9]{64}$/.test(record.sourceKey || '') ? record.sourceKey
        : record.chatId && record.sourceMessageId ? await identifySource(record.chatId, record.sourceMessageId) : null;
      if (!sourceKey) throw new ArchiveError('INVALID_REQUEST');
      const removed = [];
      for (const r of next.records) {
        const key = r.sourceKey || (r.chatId && r.sourceMessageId ? await identifySource(r.chatId, r.sourceMessageId) : null);
        if (key === sourceKey) removed.push(r);
      }
      const ids = new Set(removed.map(r => r.id));
      next.tombstones = next.tombstones.filter(t => typeof t === 'string' ? !removed.some(r => r.dedupeKey === t) : t.sourceIdentityHash !== sourceKey);
      next.tombstones.push({sourceIdentityHash: sourceKey, deletedAt: this.clock(), status: 'permanently_ignored'});
      next.records = next.records.filter(r => !ids.has(r.id));
      delete next.sourceTimes[sourceKey];
      detachSources(next, removed);
      await this.commit(next);
      return { id };
    });
  }
  libraryChange(id, transform, document = false) {
    return this.run(async () => {
      const next = structuredClone(this.state);
      const item = next.library[document ? 'documents' : 'blocks'].find(b => b.id === id);
      if (!item) throw new ArchiveError('INVALID_REQUEST');
      transform(item);
      await this.commit(next);
      return {id};
    });
  }
  updateLibrary(id, changes) {
    return this.libraryChange(id, block => {
      Object.assign(block, validateLibraryChanges(changes));
      block.editedAt = this.clock();
      block.revision = (block.revision || 0) + 1;
    });
  }
  excludeLibrary(id, excluded) {
    return this.libraryChange(id, block => {
      if (typeof excluded !== 'boolean') throw new ArchiveError('INVALID_REQUEST');
      block.excluded = excluded;
      block.status = excluded ? 'excluded_by_user' : 'active';
      block.revision = (block.revision || 0) + 1;
    });
  }
  updateDocument(id, changes) {
    return this.run(async()=>{const next=structuredClone(this.state);const doc=next.conversations.find(d=>d.id===id);if(!doc)throw new ArchiveError('INVALID_REQUEST');Object.assign(doc,validateLibraryChanges(changes,true));doc.titleRevision++;await this.commit(next);return {id};});
  }
  editDocument(request) {return this.run(async()=>{const next=structuredClone(this.state);const result=applyDocumentEdit(next,request,this.clock());if(result.ok)await this.commit(next);return result;});}
  updatePreferences(changes) {return this.run(async()=>{const next=structuredClone(this.state);Object.assign(next.preferences,validatePreferences(changes));await this.commit(next);return {ok:true};});}
  resolveLegacy(id, include) {return this.run(async()=>{if(typeof include!=='boolean')throw new ArchiveError('INVALID_REQUEST');const next=structuredClone(this.state),r=next.records.find(r=>r.id===id);if(!r||!r.hidden&&!r.deletedAt)throw new ArchiveError('INVALID_REQUEST');r.hidden=false;r.deletedAt=null;for(const b of next.library.blocks.filter(b=>b.sourceRecordId===id)){b.excluded=!include;b.status=include?'active':'excluded_by_user';b.revision++;}await this.commit(next);return {ok:true};});}
  memoryContext() { return this.run(() => memoryContext(this.state)); }

}
