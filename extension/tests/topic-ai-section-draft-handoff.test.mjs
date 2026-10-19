import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as saveFixture} from './harness/ai-reading-flush-fixture.mjs';
import {AIReadingEditor} from '../ui/ai-presentation.js';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {TopicController} from '../ui/topic-workspace.js';
import {capture, derived} from './harness/thought-m1.mjs';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';

const op = () => crypto.randomUUID();
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise, resolve}; };
const humanText = 'SYNTHETIC human B draft entered during A qualification';

// These are real save/recovery and original Section-reading owners. The small
// DOM implements event registration/text only; this is not browser acceptance.
async function fixture({sourceBacked = false} = {}) {
 const f = await saveFixture({revision: 7, lists: true});
 f.editor.dispose();
 const sectionB = await f.s.createSection({topicId: f.topic.id, title: 'SYNTHETIC B', expectedTopicRevision: (await f.s.topic(f.topic.id)).organizationRevision, operationId: op()});
 let b, sourceInput;
 if (sourceBacked) {
  await f.s.capture(capture((await f.s.status()).epoch, 'synthetic-section-handoff-source', 'SYNTHETIC B source input')); await f.s.finishFoundation();
  sourceInput = (await f.s.snapshot()).library.blocks[0]; b = await derived(f.s, [sourceInput.id]);
  await f.s.placeEntry({topicId: f.topic.id, sectionId: sectionB.sectionId, entryId: b.id, expectedEntryRevision: b.revision, expectedTopicRevision: (await f.s.topic(f.topic.id)).organizationRevision, operationId: op()});
 } else b = await f.s.continueThinking({topicId: f.topic.id, sectionId: sectionB.sectionId, body: 'SYNTHETIC original B evidence', operationId: op()});
 const row = await f.read();
 for (const key of ['blockSummary', 'currentView']) row[key] = '';
 for (const key of ['decisions', 'judgments', 'openQuestions', 'possibleEvolution']) row[key] = [];
 row.keyInformation = [{text: 'SYNTHETIC A-only saved field', evidenceEntryIds: [f.entry.id]}];
 row.preferences = [{text: 'SYNTHETIC B-only saved field', evidenceEntryIds: [b.id]}];
 row.evidenceEntryIds = [f.entry.id, b.id];
 await f.s.foundationWrite(t => t.put('meta', row));
 const model = new ThoughtLibraryReadModel(f.s), reader = new ThoughtSectionReading(model);
 const oldPage = await reader.page({topicId: f.topic.id, scopeSectionId: sectionB.sectionId, limit: 1});
 const cached = (await f.s.aiPresentationStatus({topicId: f.topic.id})).topics[0].presentation;
 cached.recoveryEpoch = oldPage.recoveryEpoch;
 const Node = f.editor.root.constructor, nodes = new Map(), pane = new Node();
 document.body = new Node('body'); document.body.append(pane);
 document.getElementById = id => { if (!nodes.has(id)) { const n = new Node(); n.style = {}; nodes.set(id, n); } return nodes.get(id); };
 document.getElementById('topic-heading').append(new Node('h1'));
 const original = new AIReadingEditor(pane, cached, () => {}, (...status) => f.statuses.push(status), {fieldsOnly: true, admittedFields: new Set(['preferences']), sectionEvidence: new Set([b.id])});
 await Promise.all([original.ready, original.recoveryReady]);
 const qualified = deferred(), releaseQualification = deferred(), finalQualification = deferred(), flushEntered = deferred();
 let held = false, released = false;
 const requests = [], publications = [], send = chrome.runtime.sendMessage;
 chrome.runtime.sendMessage = async message => {
  requests.push(message);
  if (message.type === 'GET_LIBRARY_SECTION_PROJECTION') return {ok: true, data: await model.sectionPage(message.options)};
  if (message.type === 'GET_LIBRARY_SECTION_READING') {
   const data = await reader.page(message.options);
   if (!held && message.options.scopeSectionId === f.topic.sectionId && message.options.anchorId === f.entry.id) {
    held = true; qualified.resolve(); await releaseQualification.promise;
   }
   if (held && message.options.scopeSectionId === f.topic.sectionId && !message.options.anchorId && message.options.expectedReadGeneration) finalQualification.resolve();
   return {ok: true, data};
  }
  return send(message);
 };
 const nativeFlush = original.flush.bind(original);
 original.flush = (...args) => { if (released) flushEntered.resolve(); return nativeFlush(...args); };
 const owner = Object.assign(Object.create(TopicController.prototype), {
  id: f.topic.id, serial: 0, view: 'ai', topic: f.topic, activeSectionId: f.topic.sectionId, openIntent: 1,
  aiTopics: new Map([[f.topic.id, {presentation: cached}]]), aiEditor: original,
  aiScopeKey: JSON.stringify([f.topic.id, sectionB.sectionId, true, ['preferences'], oldPage.coverage.activeGeneration, oldPage.recoveryEpoch]),
  aiSectionNavigationRun: {topicId: f.topic.id, intent: 1, published: false, previous: {section: sectionB.sectionId}},
  originalPane: new Node(), aiPane: pane, syncReadingControls() {}, ensurePanes() {}, updateViewStatus: async () => ({}),
  filterAIReading() {}, renderSectionNav() {}, topicAnchor: () => null, topicSectionAnchor: () => null, updateTopicSearchCount() {},
  async resetTopicReader({beforePaint}) {
   const actual = await reader.page({topicId: f.topic.id, scopeSectionId: f.topic.sectionId});
   const accepted = beforePaint(actual) === true; publications.push(accepted);
   return {...actual, paintRefused: !accepted, terminalNext: true, terminalPrevious: true};
  },
 });
 return {...f, owner, original, cached, b, sectionB, sourceInput, requests, publications, qualified, finalQualification, flushEntered,
  release() { released = true; releaseQualification.resolve(); },
  async retry() {
   const latest = (await f.s.aiPresentationStatus({topicId: f.topic.id})).topics[0].presentation; latest.recoveryEpoch = await f.s.recoveryDraftEpoch();
   owner.aiTopics.set(f.topic.id, {presentation: latest});
   assert.equal(await owner.readContentRefresh(), true, 'a fresh canonical read permits the subsequent normal Section handoff');
   assert.deepEqual([...owner.aiEditor.nodes.keys()], ['keyInformation']); assert.equal(owner.aiEditor.row.revision, 8);
   assert.equal(owner.aiPane.textContent.includes(humanText), false, 'B draft never becomes an A field');
  },
  input(text = humanText) { const node = original.nodes.get('preferences')[0]; node.textContent = text; node.listeners.get('input')({inputType: 'insertReplacementText', data: text}); return node; },
  async close() { releaseQualification.resolve(); if (owner.aiEditor && owner.aiEditor !== original) { await Promise.allSettled([owner.aiEditor.ready, owner.aiEditor.recoveryReady]); owner.aiEditor.dispose(); } original.dispose(); await original.recovery.running; await f.close(); },
 };
}

test('clean different-field Section handoff still publishes actual destination authority', {timeout: 10000}, async () => {
 const f = await fixture(); let reading;
 try {
  reading = f.owner.readContentRefresh(); await f.qualified.promise;
  assert.equal(f.original.dirty(), false); f.release(); assert.equal(await reading, true);
  assert.deepEqual(f.publications, [true]); assert.equal(f.original.disposed, true);
  assert.notEqual(f.owner.aiEditor, f.original); assert.deepEqual([...f.owner.aiEditor.nodes.keys()], ['keyInformation']);
  assert.equal(f.owner.aiPane.textContent.includes('B-only saved field'), false); assert.equal(f.edits.length, 0);
 } finally { f.release(); await Promise.allSettled([reading]); await f.close(); }
});

test('late real input during destination qualification saves or retains the still-authorized old Section owner', {timeout: 10000}, async () => {
 const f = await fixture(); let reading;
 try {
  reading = f.owner.readContentRefresh(); await f.qualified.promise;
  const node = f.input(); assert.equal(f.original.dirty(), true); f.release(); await reading;
  const afterRead = await f.read();
  assert.ok(afterRead.preferences[0].text === humanText || (!f.original.disposed && f.owner.aiEditor === f.original), 'different destination fields alone must not retire the live old-Section draft');
  if (afterRead.preferences[0].text !== humanText) { assert.equal(f.original.nodes.get('preferences')[0], node); assert.equal(await f.original.flush(), true); }
  const saved = await f.read(); assert.equal(saved.preferences[0].text, humanText); assert.equal(saved.revision, 8);
  assert.equal(f.edits.length, 1); assert.equal(f.edits[0].edit.expectedRevision, 7); assert.deepEqual(saved.keyInformation, f.cached.keyInformation);
  assert.deepEqual(f.publications, [], 'the changed revision cannot publish the stale destination cache'); await f.retry();
 } finally { f.release(); await Promise.allSettled([reading]); await f.close(); }
});

for (const hold of ['recovery-save', 'field-save', 'field-ack']) test('late real ' + hold + ' cannot be retired solely because destination Section fields differ', {timeout: 10000}, async () => {
 const f = await fixture(), entered = deferred(), release = deferred(); let reading, flush;
 if (hold === 'recovery-save') f.setSave(async (_message, index) => { if (index === 1) { entered.resolve(); await release.promise; } });
 else if (hold === 'field-ack') f.setEdit(async (_message, index) => { if (index === 1) { entered.resolve(); await release.promise; } });
 else { const send = chrome.runtime.sendMessage; let held = false; chrome.runtime.sendMessage = async message => { if (!held && message.type === 'EDIT_AI_PRESENTATION') { held = true; entered.resolve(); await release.promise; } return send(message); }; }
 try {
  reading = f.owner.readContentRefresh(); await f.qualified.promise;
  const node = f.input(); flush = f.original.flush(); await entered.promise;
  assert.equal(f.original.saving, true); assert.equal(f.original.disposed, false);
  f.release(); await Promise.race([reading, f.flushEntered.promise]);
  assert.equal(f.original.disposed, false, 'in-flight original save must settle before a valid cross-Section handoff retires its owner');
  assert.equal(f.original.nodes.get('preferences')[0], node); assert.equal(f.owner.aiEditor, f.original);
  release.resolve(); assert.equal(await flush, true); await reading;
  const saved = await f.read(); assert.equal(saved.preferences[0].text, humanText); assert.equal(saved.revision, 8);
  assert.equal(f.edits.length, 1); assert.equal(f.edits[0].edit.expectedRevision, 7); assert.deepEqual(saved.keyInformation, f.cached.keyInformation);
  assert.deepEqual(f.publications, [], 'the changed revision cannot publish the stale destination cache'); await f.retry();
 } finally { release.resolve(); f.release(); await Promise.allSettled([reading, flush]); await f.close(); }
});

for (const point of ['destination', 'old-scope', 'publication']) for (const cause of ['removed', 'moved', 'restore-epoch', 'historical-source-purge']) test('old Section ' + cause + ' at held ' + point + ' qualification withdraws immediately without saving', {timeout: 10000}, async () => {
 const f = await fixture({sourceBacked: cause === 'historical-source-purge'}), oldEntered = deferred(), oldRelease = deferred(); let reading;
 if (point === 'publication') { const reset = f.owner.resetTopicReader.bind(f.owner); f.owner.resetTopicReader = async options => { oldEntered.resolve(); await oldRelease.promise; return reset(options); }; }
 if (point === 'old-scope') {
  const send = chrome.runtime.sendMessage; let held = false;
  chrome.runtime.sendMessage = async message => {
   const result = await send(message);
   if (!held && message.type === 'GET_LIBRARY_SECTION_READING' && message.options.scopeSectionId === f.sectionB.sectionId && message.options.anchorId === f.b.id) {
    held = true; oldEntered.resolve(); await oldRelease.promise;
   }
   return result;
  };
 }
 try {
  reading = f.owner.readContentRefresh(); await f.qualified.promise;
  if (point !== 'publication') f.input();
  if (point !== 'destination') { f.release(); await oldEntered.promise; }
  if (point === 'publication') f.input();
  if (cause === 'removed') assert.equal((await f.s.removeEntry({id: f.b.id, expectedRevision: (await f.s.entry(f.b.id)).revision, operationId: op()})).conflict, undefined);
  else if (cause === 'moved') {
   const entry = await f.s.entry(f.b.id), topic = await f.s.topic(f.topic.id), placement = await f.s.libraryPlacement(topic.id, entry.id);
   assert.equal((await f.s.placeEntry({entryId: entry.id, topicId: topic.id, sectionId: f.topic.sectionId, expectedEntryRevision: entry.revision, expectedTopicRevision: topic.organizationRevision, expectedPlacementRevision: placement.revision, operationId: op()})).conflict, undefined);
  } else if (cause === 'restore-epoch') await f.s.foundationWrite(t => t.put('meta', {id: 'recovery-restore-epoch', value: 'SYNTHETIC restored epoch'}));
  else await admitPreGatePurgeFixture(f.s, f.sourceInput.originalTextReference, true);
  // IME cannot preserve fields whose original authority has actually gone.
  f.original.nodes.get('preferences')[0].listeners.get('compositionstart')();
  f.release(); oldRelease.resolve(); assert.equal(await reading, false);
  assert.equal(f.original.disposed, true); assert.equal(f.original.recoveryOnly, true);
  assert.equal(f.original.nodes.size, 0); assert.equal(f.owner.aiEditor, f.original);
  assert.equal(f.edits.length, 0); assert.equal((await f.read()).revision, 7);
  assert.deepEqual(f.publications, point === 'publication' ? [false] : [], 'the attempted late publication is refused, and earlier loss never reaches publication');
  assert.equal(f.original.root.textContent.includes('B-only saved field'), false);
 } finally { f.release(); oldRelease.resolve(); await Promise.allSettled([reading]); await f.close(); }
});

test('real late input at the final destination paint fence keeps its exact native owner and later saves once', {timeout: 10000}, async () => {
 const f = await fixture(), entered = deferred(), release = deferred(); let reading;
 const reset = f.owner.resetTopicReader.bind(f.owner);
 f.owner.resetTopicReader = async options => { entered.resolve(); await release.promise; return reset(options); };
 try {
  reading = f.owner.readContentRefresh(); await f.qualified.promise; f.release(); await entered.promise;
  const node = f.input(); release.resolve(); assert.equal(await reading, false);
  assert.deepEqual(f.publications, [false]); assert.equal(f.owner.aiEditor, f.original); assert.equal(f.original.disposed, false);
  assert.equal(f.original.nodes.get('preferences')[0], node); assert.equal(await f.original.flush(), true);
  assert.equal((await f.read()).preferences[0].text, humanText); assert.equal(f.edits.length, 1); await f.retry();
 } finally { release.resolve(); f.release(); await Promise.allSettled([reading]); await f.close(); }
});

for (const point of ['destination', 'old-scope']) test('a changed real navigation intent at held ' + point + ' qualification cannot publish or replace the old editor', {timeout: 10000}, async () => {
 const f = await fixture(), entered = deferred(), release = deferred(); let reading;
 if (point === 'old-scope') {
  const send = chrome.runtime.sendMessage; let held = false;
  chrome.runtime.sendMessage = async message => {
   const result = await send(message);
   if (!held && message.type === 'GET_LIBRARY_SECTION_READING' && message.options.scopeSectionId === f.sectionB.sectionId && message.options.anchorId === f.b.id) { held = true; entered.resolve(); await release.promise; }
   return result;
  };
 }
 try {
  reading = f.owner.readContentRefresh(); await f.qualified.promise;
  if (point === 'old-scope') { f.release(); await entered.promise; }
  const node = f.original.nodes.get('preferences')[0]; f.owner.openIntent++;
  f.release(); release.resolve(); assert.equal(await reading, false);
  assert.deepEqual(f.publications, []); assert.equal(f.owner.aiEditor, f.original); assert.equal(f.original.disposed, false);
  assert.equal(f.original.nodes.get('preferences')[0], node); assert.equal(f.edits.length, 0);
 } finally { release.resolve(); f.release(); await Promise.allSettled([reading]); await f.close(); }
});

for (const stop of ['transport-failure', 'serial-retirement']) test('the original checkAllTracked ' + stop + ' exit does not leave stale publication authority', {timeout: 10000}, async () => {
 const f = await fixture(), entered = deferred(), release = deferred(); let reading;
 const entryEditor = new LibraryEntryEditor(new f.original.root.constructor(), [{...await f.s.entry(f.b.id), recoveryEpoch: f.cached.recoveryEpoch}], () => {});
 await entryEditor.recoveryReady; f.owner.editor = {entry: entryEditor};
 const send = chrome.runtime.sendMessage; let tracked = 0;
 chrome.runtime.sendMessage = async message => {
  if (message.type === 'GET_LIBRARY_TRACKED_ENTRIES') {
   if (++tracked === 2) { entered.resolve(); await release.promise; if (stop === 'transport-failure') return {ok: false, error: 'UNAVAILABLE'}; }
   return {ok: true, data: await f.s.trackedLibraryEntries(message.options)};
  }
  return send(message);
 };
 try {
  reading = f.owner.readContentRefresh(); const outcome = reading.then(value => ({value}), error => ({error}));
  await f.qualified.promise; f.release(); await entered.promise;
  f.input(); f.original.nodes.get('preferences')[0].listeners.get('compositionstart')();
  if (stop === 'transport-failure') await f.s.removeEntry({id: f.b.id, expectedRevision: (await f.s.entry(f.b.id)).revision, operationId: op()});
  else f.owner.serial++;
  release.resolve(); const result = await outcome;
  if (stop === 'transport-failure') { assert.equal(result.error?.code, 'UNAVAILABLE'); assert.equal(f.original.disposed, true); assert.equal(f.original.recoveryOnly, true); assert.equal(f.original.nodes.size, 0); }
  else { assert.equal(result.value, false); assert.equal(f.original.disposed, false, 'the retired read cannot withdraw a newer route owner'); }
  assert.deepEqual(f.publications, []); assert.equal(f.edits.length, 0); assert.equal(f.owner.aiEditor, f.original);
 } finally { release.resolve(); f.release(); await Promise.allSettled([reading]); entryEditor.dispose(); await f.close(); }
});
