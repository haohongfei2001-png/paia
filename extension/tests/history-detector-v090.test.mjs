import test from 'node:test';import assert from 'node:assert/strict';
import {detectHistoryFile} from '../core/import/detector.js';import {ImportCoordinator} from '../core/import/coordinator.js';import {officialExportAdapter} from '../core/import/chatgpt-export.js';
import {conversation,historyFile} from './fixtures/history-v090.mjs';import {zip} from './fixtures/import-zip.mjs';
test('ZIP name is only a candidate hint; nested numbered shards and renamed JSON require profile structure',async()=>{
 const f=zip([{name:'bundle/conversations_1.json',text:JSON.stringify([conversation(1)])},{name:'renamed.json',text:JSON.stringify([conversation(2)])},{name:'account.json',text:'NEVER READ'}]),r=await detectHistoryFile(f,{consent:true});assert.equal(r.support,'supported');assert.equal(r.conversations,2);assert.equal(r.userMessages,6);
 assert.equal((await detectHistoryFile(zip([{name:'conversations.json',text:'{"account":"not a conversation"}'}]),{consent:true})).support,'unknown');
});
test('bad identity does not become a supported profile merely by containing mapping',async()=>{
 const c=conversation();delete c.id;delete c.conversation_id;assert.equal((await detectHistoryFile(historyFile([c]),{consent:true})).support,'unknown');
});
test('PAIA Backup NDJSON goes to backup restore and never begins an import task',async()=>{
 let calls=0;const c=new ImportCoordinator({adapter:officialExportAdapter,transport:()=>{calls++;}});await c.select(new Blob(['{"type":"header","format":"PAIA Backup","formatVersion":1}\n{"type":"item"}\n']),{consent:true});const r=await c.preflight();assert.equal(r.reason,'PAIA_BACKUP_FILE');assert.equal(calls,0);assert.equal(c.hasFile,false);
});
for(const [name,options,code]of [['../conversations.json',{},'ZIP_PATH'],['inner.zip',{},'ZIP_NESTED'],['account.json',{encrypted:true},'ZIP_ENCRYPTED'],['picture.png',{localMismatch:true},'ZIP_INVALID']])test('unsafe non-conversation entry refuses the entire container '+code,async()=>{
 const f=zip([{name:'conversations.json',text:JSON.stringify([conversation()])},{name,text:'[]',...options}]);await assert.rejects(detectHistoryFile(f,{consent:true}),{code});
});
test('corrupt later shard never reaches transport, even after a good first shard',async()=>{
 const c=new ImportCoordinator({adapter:officialExportAdapter,transport:()=>{assert.fail('no transport before whole integrity pass');}});
 await c.select(zip([{name:'conversations.json',text:JSON.stringify([conversation()])},{name:'conversations-2.json',text:JSON.stringify([conversation(2)]),badCrc:true}]),{consent:true});await assert.rejects(c.preflight(),{code:'ZIP_INTEGRITY'});assert.equal(c.hasFile,false);
});
test('generic unknown JSON alongside valid conversations is reported as partial',async()=>{
 const r=await detectHistoryFile(zip([{name:'conversations.json',text:JSON.stringify([conversation()])},{name:'unrecognized.json',text:'{"other":true}'}]),{consent:true});assert.equal(r.support,'partial');assert.equal(r.unknownEntries,1);
});
