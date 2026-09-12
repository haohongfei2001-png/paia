import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
import {ImportLedger} from '../core/import/ledger.js';
import {ImportCoordinator} from '../core/import/coordinator.js';
import {detectHistoryFile} from '../core/import/detector.js';
import {prepareRows} from '../core/import/contract.js';
import {getOfficialExportAdapter} from '../core/import/registry.js';
globalThis.IDBKeyRange=IDBKeyRange;

const claudeConversation=()=>({
 uuid:'claude-conversation-001',
 name:'Claude product notes',
 current_leaf_message_uuid:'claude-assistant-002',
 chat_messages:[
  {uuid:'claude-human-001',sender:'human',created_at:'2026-01-02T03:04:05.000Z',parent_message_uuid:null,content:[{type:'text',text:'I want PAIA to preserve my own wording.'}]},
  {uuid:'claude-assistant-001',sender:'assistant',created_at:'2026-01-02T03:04:06.000Z',parent_message_uuid:'claude-human-001',content:[{type:'text',text:'Assistant text must never enter my Thought evidence by default.'}]},
  {uuid:'claude-human-branch',sender:'human',created_at:'2026-01-02T03:05:05.000Z',parent_message_uuid:'claude-human-001',content:[{type:'text',text:'An alternate user branch should stay review-only.'}]},
  {uuid:'claude-human-002',sender:'human',created_at:'2026-01-02T03:06:05.000Z',parent_message_uuid:'claude-assistant-001',content:[{type:'text',text:'Reader should make old inputs easier to reuse.'}]},
  {uuid:'claude-assistant-002',sender:'assistant',created_at:'2026-01-02T03:06:06.000Z',parent_message_uuid:'claude-human-002',content:[{type:'text',text:'ok'}]}
 ]
});
const file=()=>new Blob([JSON.stringify([claudeConversation()])]);
async function setup(){let s={};const local={async get(k){return {[k]:structuredClone(s[k])};},async set(v){Object.assign(s,structuredClone(v));},async getBytesInUse(){return 0;}};const store=new IndexedArchiveStore(local,{indexedDB:new IDBFactory()});await store.consent(true);const ledger=new ImportLedger(store);return {store,ledger,transport:(method,q)=>ledger[method](q,'round5a-test')};}

test('Claude structural detector selects exactly the Claude adapter and only human text is projected',async()=>{
 const detected=await detectHistoryFile(file(),{consent:true});
 assert.equal(detected.adapterId,'claude-conversations-v1');
 assert.equal(detected.platform,'claude');
 assert.equal(detected.conversations,1);
 assert.equal(detected.userMessages,3);
 assert.equal(detected.realExportVerified,false);
 assert.equal(detected.review,1);
});

test('platform namespace preserves historical ChatGPT identity while separating an identical Claude source',async()=>{
 const base={chatId:'shared-chat-001',messageId:'shared-message-001',title:'same',text:'same exact text',role:'user',sent:true,contentType:'text',createTime:'2026-01-02T03:04:05.000Z',order:1,branch:'current',parentMessageId:null};
 const implicit=(await prepareRows([base])).rows[0],chatgpt=(await prepareRows([{...base,platform:'chatgpt'}])).rows[0],claude=(await prepareRows([{...base,platform:'claude'}])).rows[0];
 assert.equal(implicit.sourceKey,chatgpt.sourceKey);
 assert.equal(implicit.dedupeKey,chatgpt.dedupeKey);
 assert.notEqual(chatgpt.sourceKey,claude.sourceKey);
 assert.notEqual(chatgpt.dedupeKey,claude.dedupeKey);
});

test('Claude export commits through the existing Source/Input pipeline without a new durable schema',async()=>{
 const {store,transport}=await setup();
 const coordinator=new ImportCoordinator({transport,resolveAdapter:getOfficialExportAdapter});
 await coordinator.select(file(),{consent:true});
 const preview=await coordinator.preflight();
 assert.equal(preview.phase,'ready');
 assert.equal(preview.adapterId,'claude-conversations-v1');
 assert.equal((await store.snapshot()).records.length,0);
 const result=await coordinator.commit();
 assert.equal(result.phase,'partial');
 assert.equal(result.counts.added,3);
 const state=await store.snapshot();
 assert.equal(state.records.length,3);
 assert.ok(state.records.every(r=>r.platform==='claude'));
 assert.ok(state.records.every(r=>r.chatUrl===''));
 assert.equal(state.records.some(r=>r.originalText.includes('Assistant text')),false);
 const current=state.library.blocks.filter(b=>!b.excluded),review=state.library.blocks.filter(b=>b.excluded);
 assert.equal(current.length,2);
 assert.equal(review.length,1);
 assert.equal(review[0].branchStatus,'other');
 assert.equal(state.conversations.length,1);
 assert.equal(state.conversations[0].platform,'claude');
 assert.equal(state.conversations[0].sourceConversationId,'claude-conversation-001');
 const relationRows=await store.repository.transaction(false,t=>t.all('importSources'));
 assert.ok(relationRows.length>=3);
 assert.ok(relationRows.every(r=>r.platform===undefined&&r.profileId==='claude-conversations-v1'));
});

test('format detection refuses to guess when no registered export shape is present',async()=>{
 const detected=await detectHistoryFile(new Blob([JSON.stringify([{uuid:'random-object-001',messages:[{text:'private'}]}])]),{consent:true});
 assert.equal(detected.support,'unknown');
 assert.equal(detected.userMessages,0);
});

test('history completion UI follows the session-resolved adapter instead of a fixed provider',async()=>{
 const ui=await readFile(new URL('../ui/history-completion.js',import.meta.url),'utf8');
 assert.equal(ui.includes('!controller.adapter'),false);
 assert.ok(ui.includes("sourceName(d.adapterId||d.profileId)"));
 assert.ok(ui.includes('sourceName(r.adapterId)'));
 assert.ok(ui.includes('官方导出'));
});
