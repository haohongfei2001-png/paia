import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {completeFixture,rows,append} from './harness/original-complete.mjs';import {ImportLedger} from '../core/import/ledger.js';import {ImportCoordinator} from '../core/import/coordinator.js';import {officialExportAdapter} from '../core/import/chatgpt-export.js';import {OfficialExportProvider} from '../core/import/provider.js';import {ImportHandler} from '../background/import-handler.js';import {conversation,historyFile} from './fixtures/history-v090.mjs';
test('all durable tables exclude non-user payload, selected filename and unrelated account fields',async()=>{
 const f=await completeFixture({texts:[]}),c=conversation(1,4),nodes=Object.values(c.mapping).slice(1);
 for(const [i,role]of ['assistant','system','tool'].entries())nodes[i].message={content:{content_type:'text',parts:['SYNTHETIC_NONUSER_SECRET_'+role]},author:{role},id:nodes[i].message.id};
 c.account={api_key:'SYNTHETIC_EXPORT_ACCOUNT_SECRET'};const file=historyFile([c]);Object.defineProperty(file,'name',{value:'SYNTHETIC_PRIVATE_FILENAME.json'});
 const ledger=new ImportLedger(f.s),session=new OfficialExportProvider().createSession({transport:(m,q)=>ledger[m](q,'privacy-page')});
 await session.select(file,{consent:true});await session.preflight();
 for(const name of f.s.repository.stores){const text=JSON.stringify(await rows(f.s,name));assert.doesNotMatch(text,/SYNTHETIC_NONUSER|SYNTHETIC_EXPORT_ACCOUNT|SYNTHETIC_PRIVATE_FILENAME/);if(name.startsWith('import'))assert.ok(!text.includes(nodes[3].message.content.parts[0]));}
 await session.commit();assert.equal((await rows(f.s,'records')).length,1);
 for(const name of f.s.repository.stores)assert.doesNotMatch(JSON.stringify(await rows(f.s,name)),/SYNTHETIC_NONUSER|SYNTHETIC_EXPORT_ACCOUNT|SYNTHETIC_PRIVATE_FILENAME/);
 assert.equal(f.requests.length,0);assert.equal(session.hasFile,false);assert.equal(session.session.file,null);
});
test('every new history mutation rejects content, foreign, subframe and incognito callers',async()=>{
 const runtime={id:'synthetic-extension',getURL:p=>'chrome-extension://synthetic-extension/'+p},handler=new ImportHandler({},runtime),ui={id:runtime.id,url:runtime.getURL('ui/archive.html'),documentId:'doc'};
 for(const type of ['IMPORT_CANCEL','IMPORT_RESOLVE_BRANCH','IMPORT_LATEST','IMPORT_BEGIN','IMPORT_COMMIT'])for(const sender of [{...ui,url:'https://chatgpt.com/'},{...ui,id:'other'},{...ui,frameId:2},{...ui,tab:{incognito:true}}])await assert.rejects(handler.handle({type,payload:{}},sender),{code:'FORBIDDEN'});
 await assert.rejects(handler.handle({type:'IMPORT_RESOLVE_BRANCH',payload:{id:'x',expectedRevision:0,operationId:'abc',originalText:'forbidden'}},ui),{code:'INVALID_REQUEST'});
});
test('import commits recheck concurrent capture, user edits, removal and Source tombstone in current model',async()=>{
 const f=await completeFixture({texts:[]}),c=conversation(1,3),nodes=Object.values(c.mapping).slice(1);
 for(const n of nodes)await append(f.s,n.message.content.parts[0],n.message.id,c.id);
 const records=(await rows(f.s,'records')).map(x=>x.value),byMessage=id=>records.find(r=>r.sourceMessageId===id),blocks=(await rows(f.s,'blocks')).map(x=>x.value),block=n=>blocks.find(b=>b.sourceRecordId===byMessage(nodes[n].message.id).id);
 const ledger=new ImportLedger(f.s),controller=new ImportCoordinator({adapter:officialExportAdapter,transport:(m,q)=>ledger[m](q,'privacy-page')});await controller.select(historyFile([c]),{consent:true});await controller.preflight();
 await Promise.all([f.s.updateLibrary(block(0).id,{libraryText:'Synthetic concurrent edit',note:'Synthetic concurrent note'}),f.s.excludeLibrary(block(1).id,true),f.s.permanentDelete(byMessage(nodes[2].message.id).id)]);
 const pending=controller.commit();await append(f.s,'Synthetic live capture during import','synthetic-concurrent-new',c.id);const result=await pending;
 assert.equal(result.counts.ignored,1);assert.equal((await f.s.input(block(0).id)).libraryText,'Synthetic concurrent edit');assert.equal((await f.s.input(block(1).id)).excluded,true);assert.equal((await rows(f.s,'records')).length,3);assert.equal(f.requests.length,0);
});
test('history provider is explicitly local and permissions/CSP remain frozen v081 boundaries',async()=>{
 const provider=new OfficialExportProvider();assert.equal(provider.describe().network,false);assert.equal(provider.describe().input,'user_selected_file');assert.equal(provider.describe().realExportVerified,false);
 const current=JSON.parse(await readFile('manifest.json','utf8'));assert.deepEqual(current.permissions,['storage']);assert.deepEqual(current.host_permissions,['https://api.deepseek.com/*']);
 for(const file of ['core/import/chatgpt-export.js','core/import/detector.js','core/import/reader.js','core/import/provider.js','core/import/coordinator.js','core/import/ledger.js'])assert.doesNotMatch(await readFile(file,'utf8'),/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|document\.cookie|chrome\.storage\.sync/);
});
