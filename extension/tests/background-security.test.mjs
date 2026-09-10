import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
globalThis.IDBKeyRange=IDBKeyRange;
// Synthetic data only. Imports the real service worker with an in-memory Chrome
// API double; it never starts a browser, reads a profile, or contacts a website.
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { emptyStructure, emptyRow, sanitizeStructure } from '../core/diagnostics.js';

globalThis.crypto ??= webcrypto;
const EXTENSION_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}/`;
const CHAT_ID = 'synthetic-chat-001';
const CHAT_URL = `https://chatgpt.com/c/${CHAT_ID}`;
const ui = { id: EXTENSION_ID, url: `${EXTENSION_ORIGIN}ui/archive.html` };
const popup = { id: EXTENSION_ID, url: `${EXTENSION_ORIGIN}ui/popup.html` };
const content = {
  id: EXTENSION_ID, url: CHAT_URL, origin: 'https://chatgpt.com',
  frameId: 0, tab: { id: 23, incognito: false }, documentId: 'synthetic-document-001'
};

function capture(epoch, changes = {}) {
  return {
    type: 'CAPTURE', epoch, adapterVersion: '0.3.0',
    chat: { id: CHAT_ID, url: CHAT_URL, title: '合成测试聊天' },
    messages: [{ sourceMessageId: 'synthetic-message-001', pageOrder: 1, originalText: '虚构测试文字：不会来自真实用户。' }],
    ...changes
  };
}

async function fixture({ isolationFailure = false, delayedIsolation = false } = {}) {
  globalThis.indexedDB=new IDBFactory();
  let listener;
  let persisted = {};
  let reads = 0;
  let writes = 0;
  let isolate;
  const accessRequests = [];
  const isolation = delayedIsolation ? new Promise(resolve => { isolate = resolve; }) : Promise.resolve();
  globalThis.chrome = {
    runtime: {
      id: EXTENSION_ID,
      getManifest: () => ({version:'0.8.1'}),
      getURL: path => `${EXTENSION_ORIGIN}${path}`,
      onMessage: { addListener: callback => { listener = callback; } }
    },
    storage: { local: {
      async setAccessLevel(options) {
        accessRequests.push(structuredClone(options));
        if (isolationFailure) throw new Error('Synthetic storage isolation failure');
        await isolation;
      },
      async get(key) { reads += 1; return { [key]: structuredClone(persisted[key]) }; },
      async set(update) { writes += 1; persisted = { ...persisted, ...structuredClone(update) }; },
      async getBytesInUse() { return Buffer.byteLength(JSON.stringify(persisted)); }
    } }
  };
  await import(`../background/service-worker.js?synthetic-test=${crypto.randomUUID()}`);
  assert.equal(typeof listener, 'function');
  return {
    accessRequests,
    releaseIsolation: () => isolate?.(),
    persisted: () => structuredClone(persisted),
    counts: () => ({ reads, writes }),
    send(request, sender = ui) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Synthetic message timed out')), 2000);
        const keepAlive = listener(request, sender, response => { clearTimeout(timeout); resolve(response); });
        assert.equal(keepAlive, true, 'Async response channel must remain open');
      });
    }
  };
}

async function expectError(promise, code) {
  assert.deepEqual(await promise, { ok: false, error: code });
}

test('service worker enforces caller capabilities, consent and immutable capture', async t => {
  const previousChrome = globalThis.chrome;
  t.after(() => { globalThis.chrome = previousChrome; });
  const app = await fixture({ delayedIsolation: true });

  await t.test('no storage access until trusted-context isolation succeeds', async () => {
    const pending = app.send({ type: 'GET_STATE' });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(app.counts(), { reads: 0, writes: 0 });
    assert.deepEqual(app.accessRequests, [{ accessLevel: 'TRUSTED_CONTEXTS' }]);
    app.releaseIsolation();
    const response = await pending;
    assert.equal(response.ok, true);
    assert.equal(response.data.settings.enabled, false);
    assert.equal(response.data.settings.consentVersion, 0);
    assert.equal(response.data.records.length, 0);
  });

  await t.test('only exact own extension pages may read archive data', async () => {
    for (const sender of [
      {}, { ...ui, id: 'another-extension' },
      { ...ui, url: `${EXTENSION_ORIGIN}ui/archive.html?spoof=1` },
      { ...ui, url: `${EXTENSION_ORIGIN}ui/unlisted.html` },
      { ...ui, url: 'https://example.invalid/ui/archive.html' },
      content, { ...content, frameId: 1 }, { ...content, tab: undefined },
      { ...content, tab: { ...content.tab, incognito: true } }
    ]) {
      await expectError(app.send({ type: 'GET_STATE' }, sender), 'FORBIDDEN');
    }
    assert.equal((await app.send({ type: 'GET_STATE' }, popup)).ok, true);
  });

  await t.test('status exposes only the minimal content-script fields', async () => {
    const response = await app.send({ type: 'GET_STATUS' }, content);
    assert.equal(response.ok, true);
    assert.deepEqual(Object.keys(response.data).sort(), ['adapterVersion', 'consented', 'enabled', 'epoch']);
    assert.equal(response.data.consented, false);
    assert.equal(response.data.enabled, false);
    await expectError(app.send(capture(response.data.epoch), content), 'CONSENT_REQUIRED');
    assert.equal((await app.send({
      type: 'DIAGNOSTIC', code: 'ADAPTER_MISMATCH', scanned: 1,
      adapterVersion: '0.3.0', structure: { ...emptyStructure(), userRoleCount: 1, rows: [emptyRow()] }
    }, content)).ok, true);
    const unconsented = (await app.send({ type: 'GET_STATE' })).data;
    assert.equal(unconsented.diagnostics.status, 'CONSENT_REQUIRED');
    assert.equal(unconsented.diagnostics.structure, null);
    assert.equal(unconsented.diagnostics.structureAt, null);
    assert.equal(unconsented.records.length, 0);
    for (const sender of [
      { ...content, id: 'another-extension' },
      { ...content, url: 'https://chatgpt.com.example.invalid/c/synthetic-chat-001' },
      { ...content, url: 'http://chatgpt.com/c/synthetic-chat-001' },
      { ...content, frameId: 1 }, { ...content, tab: undefined },
      { ...content, tab: { ...content.tab, incognito: true } }
    ]) {
      await expectError(app.send({ type: 'GET_STATUS' }, sender), 'FORBIDDEN');
    }
  });

  await t.test('content scripts cannot grant consent or invoke archive mutations', async () => {
    for (const type of ['CONSENT', 'SET_ENABLED', 'UPDATE_RECORD', 'TRASH_RECORD', 'RESTORE_RECORD', 'PURGE_RECORD']) {
      await expectError(app.send({ type, accepted: true, enabled: true, id: 'synthetic-id', changes: {} }, content), 'FORBIDDEN');
    }
    await expectError(app.send({ type: 'SET_ENABLED', enabled: true }), 'CONSENT_REQUIRED');
    await expectError(app.send({ type: 'CONSENT', accepted: false }), 'INVALID_REQUEST');
    await expectError(app.send({ type: 'CONSENT', accepted: 'true' }), 'INVALID_REQUEST');
    assert.equal((await app.send({ type: 'CONSENT', accepted: true })).ok, true);
  });

  await t.test('capture requires a matching persistent sender chat and correct adapter', async () => {
    const { data: status } = await app.send({ type: 'GET_STATUS' }, content);
    await expectError(app.send(capture(status.epoch)), 'INVALID_REQUEST');
    for (const url of [
      'https://chatgpt.com/', 'https://chatgpt.com/c/another-synthetic-chat',
      `${CHAT_URL}?temporary-chat=true`, `${CHAT_URL}?temporary=1`, `${CHAT_URL}?temporary_chat=1`
    ]) {
      await expectError(app.send(capture(status.epoch), { ...content, url }), 'FORBIDDEN');
    }
    await expectError(app.send(capture(status.epoch, {
      chat: { id: 'another-synthetic-chat', url: CHAT_URL, title: '合成测试聊天' }
    }), content), 'FORBIDDEN');
    await expectError(app.send(capture(status.epoch, { adapterVersion: 'unsupported-test-version' }), content), 'INVALID_REQUEST');
    assert.equal((await app.send(capture(status.epoch), content)).data.added, 1);
    assert.equal((await app.send(capture(status.epoch), content)).data.added, 0);
  });

  await t.test('SPA capture uses the current tab URL and rejects stale or unsafe routes', async () => {
    const { data: status } = await app.send({ type: 'GET_STATUS' }, content);
    const nextChatId = 'synthetic-spa-chat-002';
    const nextChatUrl = `https://chatgpt.com/c/${nextChatId}`;
    const movedSender = { ...content, tab: { ...content.tab, url: nextChatUrl } };
    const nextCapture = capture(status.epoch, {
      chat: { id: nextChatId, url: nextChatUrl, title: '虚构 SPA 切换聊天' }
    });
    // Actual Chrome keeps sender.url at the initial document route after SPA
    // navigation; sender.tab.url reflects its current top-level route.
    assert.equal(movedSender.url, CHAT_URL);
    const accepted = await app.send(nextCapture, movedSender);
    assert.equal(accepted.ok, true);
    assert.equal(accepted.data.added, 1);
    const records = (await app.send({ type: 'GET_STATE' })).data.records;
    assert.equal(records.find(record => record.chatId === nextChatId)?.chatUrl, nextChatUrl);
    await expectError(app.send(capture(status.epoch), movedSender), 'FORBIDDEN');

    for (const currentUrl of [
      'https://chatgpt.com/', `${nextChatUrl}?temporary-chat=true`,
      `${nextChatUrl}?temporary=1`, `${nextChatUrl}?temporary_chat=1`,
      `https://example.invalid/c/${nextChatId}`, '',
      `https://chatgpt.com.example.invalid/c/${nextChatId}`
    ]) {
      const unsafeSender = { ...content, tab: { ...content.tab, url: currentUrl } };
      await expectError(app.send(nextCapture, unsafeSender), 'FORBIDDEN');
      await expectError(app.send(capture(status.epoch), unsafeSender), 'FORBIDDEN');
    }
    assert.equal((await app.send({ type: 'GET_STATE' })).data.records.length, records.length);
  });

  await t.test('notes remain separate and immutable originals reject mutation attempts', async () => {
    const original = (await app.send({ type: 'GET_STATE' })).data.records[0];
    assert.equal((await app.send({ type: 'UPDATE_RECORD', id: original.id, changes: {
      note: '虚构备注', editedText: '虚构整理版'
    } })).ok, true);
    for (const field of ['originalText', 'contentHash', 'dedupeKey', 'sourceMessageId', 'chatId', 'capturedAt']) {
      await expectError(app.send({ type: 'UPDATE_RECORD', id: original.id, changes: { [field]: 'synthetic overwrite' } }), 'INVALID_REQUEST');
    }
    const updated = (await app.send({ type: 'GET_STATE' })).data.records[0];
    assert.equal(updated.originalText, original.originalText);
    assert.equal(updated.contentHash, original.contentHash);
    assert.equal(updated.note, '虚构备注');
    assert.equal(updated.editedText, '虚构整理版');
  });

  await t.test('pause and resumed consent epochs reject delayed batches in queue order', async () => {
    const oldEpoch = (await app.send({ type: 'GET_STATUS' }, content)).data.epoch;
    const pause = app.send({ type: 'SET_ENABLED', enabled: false }, popup);
    const delayed = app.send(capture(oldEpoch), content);
    assert.equal((await pause).ok, true);
    await expectError(delayed, 'PAUSED');
    const resume = app.send({ type: 'SET_ENABLED', enabled: true }, popup);
    const stale = app.send(capture(oldEpoch), content);
    assert.equal((await resume).ok, true);
    await expectError(stale, 'STALE_CAPTURE');
    const newEpoch = (await app.send({ type: 'GET_STATUS' }, content)).data.epoch;
    assert.ok(newEpoch > oldEpoch);
    assert.equal((await app.send(capture(newEpoch), content)).data.added, 0);
  });

  await t.test('diagnostics whitelist fields and strip arbitrary content', async () => {
    await expectError(app.send({ type: 'DIAGNOSTIC', code: 'unapproved-test-code', scanned: 1, adapterVersion: '0.3.0' }, content), 'INVALID_REQUEST');
    for (const scanned of [-1, '1', NaN, Infinity, 0.5, 1000001]) {
      await expectError(app.send({ type: 'DIAGNOSTIC', code: 'CAPTURE_FAILED', scanned, adapterVersion: '0.3.0' }, content), 'INVALID_REQUEST');
    }
    const privateSentinel = 'SYNTHETIC_PRIVATE_DIAGNOSTIC_SENTINEL';
    const structure = {
      ...emptyStructure(), userRoleCount: 1, mainPresent: true,
      originalText: privateSentinel, chatTitle: privateSentinel, url: privateSentinel,
      messageId: privateSentinel, contentHash: privateSentinel, error: { message: privateSentinel },
      rows: [{ ...emptyRow(), textMatches: 2, safeTextMatches: 2, nested: { originalText: privateSentinel } }]
    };
    assert.equal((await app.send({
      type: 'DIAGNOSTIC', code: 'ADAPTER_MISMATCH', scanned: 0,
      adapterVersion: '0.3.0', originalText: privateSentinel, title: privateSentinel,
      url: privateSentinel, error: { message: privateSentinel }, structure
    }, content)).ok, true);
    const diagnostics = (await app.send({ type: 'GET_STATE' })).data.diagnostics;
    assert.deepEqual(Object.keys(diagnostics).sort(), ['adapterVersion', 'added', 'lastError', 'lastScanAt', 'lastSuccessAt', 'scanned', 'status', 'structure', 'structureAt']);
    assert.deepEqual(Object.keys(diagnostics.lastError).sort(), ['at', 'code']);
    assert.deepEqual(diagnostics.structure, sanitizeStructure(structure));
    assert.ok(diagnostics.structureAt);
    assert.equal(JSON.stringify(app.persisted()).includes(privateSentinel), false);

    const writes = app.counts().writes;
    structure.rows[0].textMatches = 0;
    assert.equal((await app.send({ type: 'DIAGNOSTIC', code: 'ADAPTER_MISMATCH', scanned: 0, adapterVersion: '0.3.0', structure }, content)).ok, true);
    assert.equal(app.counts().writes, writes + 1);
    assert.equal((await app.send({ type: 'GET_STATE' })).data.diagnostics.structure.rows[0].textMatches, 0);

    structure.rows[0].textMatches = '0';
    assert.equal((await app.send({ type: 'DIAGNOSTIC', code: 'ADAPTER_MISMATCH', scanned: 0, adapterVersion: '0.3.0', structure }, content)).ok, true);
    assert.equal((await app.send({ type: 'GET_STATE' })).data.diagnostics.structure, null);
  });

  await t.test('diagnostics require the current adapter except for the fixed version-mismatch code', async () => {
    const structure = { ...emptyStructure(), userRoleCount: 1, rows: [emptyRow()] };
    const records = (await app.send({ type: 'GET_STATE' })).data.records;
    const request = { type: 'DIAGNOSTIC', code: 'ADAPTER_MISMATCH', scanned: 1, adapterVersion: '0.1.0', structure };
    await expectError(app.send(request, content), 'INVALID_REQUEST');
    await expectError(app.send({ ...request, adapterVersion: undefined }, content), 'INVALID_REQUEST');
    const privateSentinel = 'SYNTHETIC_OLD_CONTENT_PRIVATE_SENTINEL';
    assert.equal((await app.send({
      ...request, code: 'ADAPTER_VERSION_MISMATCH', adapterVersion: privateSentinel,
      scanned: privateSentinel, structure, originalText: privateSentinel,
      url: privateSentinel, title: privateSentinel, messageId: privateSentinel,
      error: { message: privateSentinel }
    }, content)).ok, true);
    const after = (await app.send({ type: 'GET_STATE' })).data;
    assert.equal(after.diagnostics.status, 'ADAPTER_VERSION_MISMATCH');
    assert.equal(after.diagnostics.adapterVersion, '0.3.0');
    assert.equal(after.diagnostics.scanned, 0);
    assert.equal(after.diagnostics.structure, null);
    assert.equal(after.diagnostics.structureAt, null);
    assert.equal(JSON.stringify(app.persisted()).includes(privateSentinel), false);
    assert.deepEqual(after.records, records);
  });

  await t.test('every diagnostic code including the version exception requires the trusted top-level ChatGPT sender', async () => {
    for (const code of ['ADAPTER_MISMATCH', 'ADAPTER_VERSION_MISMATCH']) {
      const request = { type: 'DIAGNOSTIC', code, scanned: 0, adapterVersion: '0.3.0', structure: emptyStructure() };
      for (const sender of [
        {}, { ...content, id: 'another-extension' },
        { ...content, url: 'https://chatgpt.com.example.invalid/c/synthetic-chat-001' },
        { ...content, url: 'http://chatgpt.com/c/synthetic-chat-001' },
        { ...content, frameId: 1 }, { ...content, tab: undefined },
        { ...content, tab: { ...content.tab, incognito: true } }
      ]) await expectError(app.send(request, sender), 'FORBIDDEN');
      await expectError(app.send(request, ui), 'INVALID_REQUEST');
      await expectError(app.send(request, popup), 'INVALID_REQUEST');
    }
  });

  await t.test('paused diagnostics cannot restore structural data', async () => {
    assert.equal((await app.send({ type: 'SET_ENABLED', enabled: false }, popup)).ok, true);
    assert.equal((await app.send({
      type: 'DIAGNOSTIC', code: 'ADAPTER_MISMATCH', scanned: 1,
      adapterVersion: '0.3.0', structure: { ...emptyStructure(), userRoleCount: 1, rows: [emptyRow()] }
    }, content)).ok, true);
    const diagnostics = (await app.send({ type: 'GET_STATE' })).data.diagnostics;
    assert.equal(diagnostics.status, 'PAUSED');
    assert.equal(diagnostics.structure, null);
    assert.equal(diagnostics.structureAt, null);
  });
});

test('service worker fails closed if storage isolation fails', async t => {
  const previousChrome = globalThis.chrome;
  t.after(() => { globalThis.chrome = previousChrome; });
  const app = await fixture({ isolationFailure: true });
  await expectError(app.send({ type: 'GET_STATE' }), 'STORAGE_FAILED');
  await expectError(app.send({ type: 'GET_STATUS' }, content), 'STORAGE_FAILED');
  await expectError(app.send({ type: 'CONSENT', accepted: true }), 'STORAGE_FAILED');
  assert.deepEqual(app.counts(), { reads: 0, writes: 0 });
});

test('metadata enrichment uses the same trusted top-level sender and epoch gates as capture',async()=>{
 const app=await fixture();await app.send({type:'CONSENT',accepted:true});const epoch=(await app.send({type:'GET_STATUS'})).data.epoch;
 await app.send(capture(epoch),content);
 const req={type:'ENRICH_SOURCE_METADATA',epoch,adapterVersion:'0.3.0',chat:{id:CHAT_ID,url:CHAT_URL},messages:[{sourceMessageId:'synthetic-message-001',pageOrder:1,sourceTime:{state:'valid',createTime:1609459200,updateTime:null}}]};
 for(const sender of [ui,popup,{...content,id:'fake-wrong-extension'},{...content,frameId:1},{...content,tab:{id:23,url:'https://chatgpt.com/c/fake-other-chat'}},{...content,tab:{id:23,incognito:true}}])await expectError(app.send(req,sender),'FORBIDDEN');
 assert.equal((await app.send(req,content)).ok,true);
 const after=(await app.send({type:'GET_STATE'})).data.records[0];assert.equal(after.timeConfidence,'high');
 await app.send({type:'SET_ENABLED',enabled:false});await expectError(app.send(req,content),'PAUSED');
});


test('Library and Memory access commands remain restricted to trusted UI contexts', async()=>{
 const app=await fixture();await app.send({type:'CONSENT',accepted:true});const epoch=(await app.send({type:'GET_STATUS'})).data.epoch;
 await app.send(capture(epoch),content);const before=(await app.send({type:'GET_STATE'})).data;
 const b=before.library.blocks[0],d=before.library.documents[0];
 for(const request of [{type:'UPDATE_LIBRARY',id:b.id,changes:{libraryText:'虚构改写'}},{type:'EXCLUDE_LIBRARY',id:b.id,excluded:true},{type:'UPDATE_DOCUMENT',id:d.id,changes:{userTitle:'虚构标题'}},{type:'GET_MEMORY_CONTEXT'}]) {
  await expectError(app.send(request,content),'FORBIDDEN');await expectError(app.send(request,{...ui,id:'other-extension'}),'FORBIDDEN');
 }
 assert.deepEqual((await app.send({type:'GET_STATE'})).data.records,before.records);
 assert.deepEqual((await app.send({type:'GET_MEMORY_CONTEXT'})).data,{status:'disabled',blocks:[]});
});


test('no UI, content script or external caller has a reload message command', async()=>{
 const app=await fixture();
 for(const sender of [ui,popup,content,{...ui,id:'another-extension'}]) {
  const result=await app.send({type:'DEV_RELOAD'},sender);assert.equal(result.ok,false);
 }
 assert.deepEqual(app.counts(),{reads:0,writes:0});
});
test('malformed request types still produce a safe response after import routing',async()=>{const previous=globalThis.chrome;try{const app=await fixture();for(const request of [null,{}, {type:123},{type:{private:'SYNTHETIC'}}])await expectError(app.send(request),'INVALID_REQUEST');}finally{globalThis.chrome=previous;}});

test('IA capabilities remain trusted-page-only; no Thought creation, AI refresh or source purge without confirmation',async t=>{
 const previous=globalThis.chrome;t.after(()=>{globalThis.chrome=previous;});const app=await fixture();
 for(const type of ['GET_IA_STATUS','GET_INPUT','GET_THOUGHTS','GET_THOUGHT','GET_REVISIONS','EDIT_THOUGHT','RESTORE_REVISION','PRUNE_REVISIONS','PURGE_SOURCE'])await expectError(app.send({type},content),'FORBIDDEN');
 for(const type of ['CREATE_THOUGHT','REFRESH_THOUGHT','AI_ORGANIZE','AI_FILTER'])await expectError(app.send({type}),'INVALID_REQUEST');
 await expectError(app.send({type:'PURGE_SOURCE',id:'synthetic-source'}),'INVALID_REQUEST');
 assert.equal((await app.send({type:'GET_THOUGHTS'})).data.items.length,0);
});


test('Smart Filter commands remain restricted to trusted UI callers',async()=>{
 const h=await fixture();for(const type of ['FILTER_DIAGNOSTICS','FILTER_RECOVER','FILTER_STATUS','FILTER_MODE','FILTER_NOTICE','FILTER_RECENT','FILTER_KEEP','FILTER_PROTECT','SEARCH_INPUTS']){const r=await h.send({type,mode:'off',id:'synthetic',options:{query:'secret'}},content);assert.equal(r.ok,false);assert.equal(r.error,'FORBIDDEN');}
});
test('M2 Library commands are trusted UI only, consent gated and manual-only creation',async()=>{const h=await fixture();const commands=['RETRY_LIBRARY_MAINTENANCE','GET_LIBRARY_UNPLACED','LIBRARY_INDEX_PAGE','TOPIC_DOCUMENT_PAGE','GET_LIBRARY_TOPIC','GET_LIBRARY_ENTRY','GET_LIBRARY_PATHS','GET_LIBRARY_PLACEMENT','GET_LIBRARY_PROVENANCE','GET_LIBRARY_REMOVED','SEARCH_LIBRARY','GET_LIBRARY_LAYOUT','REBUILD_LIBRARY_SEARCH','CREATE_LIBRARY_ENTRY','EDIT_LIBRARY_FIELDS','EDIT_LIBRARY_BATCH','REMOVE_LIBRARY_ENTRY','RESTORE_LIBRARY_ENTRY','CREATE_LIBRARY_TOPIC','EDIT_LIBRARY_TOPIC','CREATE_LIBRARY_SECTION','EDIT_LIBRARY_SECTION','PLACE_LIBRARY_ENTRY','REORDER_LIBRARY_ENTRY','START_LIBRARY_LAYOUT'];for(const type of commands)await expectError(h.send({type},content),'FORBIDDEN');await expectError(h.send({type:'CREATE_LIBRARY_TOPIC',topic:{name:'Synthetic',operationId:crypto.randomUUID()}}),'CONSENT_REQUIRED');await h.send({type:'CONSENT',accepted:true});for(const forbidden of [{actor:'ai'},{generator:{providerId:'real'}},{evidence:[]}])await expectError(h.send({type:'CREATE_LIBRARY_ENTRY',entry:{title:'Synthetic',body:'Synthetic',note:'',type:'idea',operationId:crypto.randomUUID(),...forbidden}}),'INVALID_REQUEST');});


test('v081 backup, bounded workflow, Topic governance and AI draft commands reject content and foreign senders',async()=>{
 const h=await fixture();
 for(const type of ['PAIA_BACKUP_BEGIN_EXPORT','PAIA_BACKUP_EXPORT_PAGE','PAIA_BACKUP_BEGIN_RESTORE','PAIA_BACKUP_STAGE','PAIA_BACKUP_PREVIEW','PAIA_BACKUP_RESTORE','PAIA_BACKUP_CANCEL','START_BOUNDED_ORGANIZER','STOP_BOUNDED_ORGANIZER','GET_BOUNDED_ORGANIZER','REMOVE_LIBRARY_TOPIC','RESTORE_LIBRARY_TOPIC','GET_LIBRARY_REMOVED_TOPICS','RECOVER_AI_PRESENTATION_DRAFT'])for(const sender of [content,{...ui,id:'foreign-extension'}, {...ui,url:EXTENSION_ORIGIN+'untrusted.html'}])await expectError(h.send({type,options:{}},sender),'FORBIDDEN');
 await expectError(h.send({type:'PAIA_BACKUP_BEGIN_EXPORT'}),'CONSENT_REQUIRED');
});

test('v0100 Memory commands reject content/foreign callers and all require consent',async()=>{const h=await fixture();for(const type of ['PAIA_MEMORY_STATUS','PAIA_MEMORY_AUTHORIZE','PAIA_MEMORY_EXCLUDE','PAIA_MEMORY_SETTINGS','PAIA_MEMORY_PROFILE','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_MEMORY_ENTRIES']){await expectError(h.send({type,options:{query:'synthetic-only'}},content),'FORBIDDEN');await expectError(h.send({type},{id:'foreign',url:'https://example.invalid'}),'FORBIDDEN');await expectError(h.send({type}),'CONSENT_REQUIRED');}});
