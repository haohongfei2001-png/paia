import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readDocumentSearchPage,readDocumentSearchWindow,resetDocumentSearchPage} from '../ui/document-search-page.js';
import {readSourceExport} from '../ui/source-export.js';
import {continueThought} from '../ui/continue-thought.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {exportJSON,exportMarkdown} from '../core/export.js';

test('Reader search discards changed generations including empty intermediate pages and stale intents',async()=>{
 const make=(generation,items,nextCursor,changed=false)=>({generation,items,nextCursor,changed});
 assert.deepEqual(await readDocumentSearchPage({generation:1,cursor:'old',read:async()=>make(2,[{id:'wrong'}],null,true)}),{restart:true});
 const pages=[make(1,[],'next'),make(2,[{id:'mixed'}],null)];assert.deepEqual(await readDocumentSearchPage({read:async()=>pages.shift()}),{restart:true});
 assert.equal(await readDocumentSearchPage({isCurrent:()=>false,read:async()=>make(1,[{id:'late'}],null)}),null);
 const stable=[make(7,[],'next'),make(7,[{id:'fresh'}],null)];assert.deepEqual((await readDocumentSearchPage({read:async()=>stable.shift()})).items,[{id:'fresh'}]);
 await assert.rejects(()=>readDocumentSearchPage({read:async()=>make(1,[],'loop')}),/INVALID_SEARCH_CURSOR/);
 const state={query:'needle',savedAnchor:{inputId:'keep',offset:2},activeInputId:'keep',items:[{snippet:'old'}],cursor:'old',history:['older'],nextCursor:'next',generation:1};resetDocumentSearchPage(state,{keepActive:true});
 assert.equal(state.query,'needle');assert.deepEqual(state.savedAnchor,{inputId:'keep',offset:2});assert.equal(state.activeInputId,'keep');assert.deepEqual(state.items,[]);assert.deepEqual(state.history,[]);assert.equal(state.generation,null);
});

test('Source export uses actual generation-fenced GET_PAGE and preserves both serialization formats',async()=>{
 const {s}=await setup(OrganizerStore);const snapshot=await readSourceExport({read:page=>s.page(page)});
 assert.equal(snapshot.records.length,1);await snapshot.verify();
 const json=JSON.parse(exportJSON(snapshot.records));assert.equal(json.format,'personal-ai-input-archive');assert.equal(json.schemaVersion,2);assert.equal(json.recordCount,1);
 assert.match(exportMarkdown(snapshot.records),/# Personal AI Input Archive/);
 const b=(await s.snapshot()).library.blocks[0];await inputEdit(s,b.id,{libraryText:'A canonical change after serialization'});
 await assert.rejects(()=>snapshot.verify(),error=>error.code==='BACKUP_CHANGED');
});

test('Source export rejects changes, cursor cycles and partial failures without returning a download',async()=>{
 const root={dataGeneration:1,documents:[{id:'doc'}],nextCursor:null},part={dataGeneration:1,records:[{id:'one'}],nextCursor:null};
 const calls=[];const snapshot=await readSourceExport({query:'scope',providerKey:'chatgpt',read:async options=>{calls.push(options);return options.documentId?part:root;}});
 assert.equal(calls[0].query,'scope');assert.equal(calls[0].providerKey,'chatgpt');assert.equal(calls[1].expectedGeneration,1);
 await snapshot.verify();assert.equal(calls.at(-1).expectedGeneration,1);
 await assert.rejects(()=>readSourceExport({read:async options=>options.documentId?{...part,dataGeneration:2}:root}),/BACKUP_CHANGED/);
 await assert.rejects(()=>readSourceExport({read:async options=>options.documentId?{...part,records:[],nextCursor:['same']}:root}),/INVALID_EXPORT_CURSOR/);
 await assert.rejects(()=>readSourceExport({read:async options=>{if(options.documentId)throw Error('STORAGE_FAILED');return root;}}),/STORAGE_FAILED/);
});

test('Thought continuation flushes then fetches once; normal refresh cannot invalidate its fresh quote',async()=>{
 let reads=0,composed=null,route=1,serial=1;
 const options={id:'thought',topicId:'topic',flush:async()=>{serial++;return true;},isCurrent:()=>route===1,read:async()=>{reads++;return {id:'thought',body:'Fresh after edit',revision:5,lifecycle:'active'};},compose:async value=>composed=value,unavailable:()=>{}};
 await continueThought(options);assert.equal(reads,1);assert.equal(composed.quote,'Fresh after edit');assert.deepEqual(composed.relatedThought,{id:'thought',revision:5,body:'Fresh after edit'});assert.equal(composed.isCurrent(),true);
 route++;assert.equal(composed.isCurrent(),false);composed=null;
 await continueThought({...options,flush:async()=>false});assert.equal(composed,null);assert.equal(reads,1);
 await continueThought(options);assert.equal(reads,1,'navigation cancels before fetch');
});

test('Thought continuation refuses a late read after navigation and a deleted source',async()=>{
 let composed=false,release,route=1;const options={id:'thought',topicId:'topic',flush:async()=>true,isCurrent:()=>route===1,read:()=>new Promise(r=>release=r),compose:async()=>composed=true,unavailable:()=>{}};
 const pending=continueThought(options);await new Promise(r=>setImmediate(r));route=2;release({id:'thought',body:'late',revision:1,lifecycle:'active'});await pending;assert.equal(composed,false);
 route=1;await continueThought({...options,read:async()=>({id:'thought',body:'purged',revision:2,lifecycle:'active',staleReasons:['source_purged']})});assert.equal(composed,false);
});

test('header menu is document-scoped while per-entry actions, search invalidation and export retry remain wired',async()=>{
 const source=await readFile(new URL('../ui/archive.js',import.meta.url),'utf8');
 const header=source.slice(source.indexOf('function openDocumentMenu()'),source.indexOf('async function openSourceRecord('));
 assert.match(header,/文档版本历史/);assert.match(header,/会话收录设置/);assert.doesNotMatch(header,/从档案移除|永久删除|copyReadingText|addInputToTopic/);
 assert.match(source,/add\('从档案移除'|view==='excluded'\?'恢复显示':'从档案移除'/);assert.doesNotMatch(source,/menuId\|\|row\.dataset\.itemId/);
 assert.match(source,/smartFilter.changed\(\);invalidateDocumentSearch\(\)/);assert.match(source,/if\(archiveExportBusy\)return/);assert.match(source,/finally\{archiveExportBusy=false/);assert.match(source,/重试导出/);
});


test('Reader pagination restarts an actual changed-generation production search and then reads exactly 40 plus 4',async()=>{
 const {s}=await setup(OrganizerStore),request=capture((await s.status()).epoch);request.messages=Array.from({length:45},(_,i)=>({sourceMessageId:'audit-paged-'+i,pageOrder:i+2,originalText:'AUDIT_MATCH synthetic pagination '+i}));await s.capture(request);
 const documentId=(await s.snapshot()).conversations[0].id,options={universal:true,paged:true,query:'AUDIT_MATCH',mode:'current',documentId,types:['input'],limit:40};
 const first=await s.searchInputs(options);assert.equal(first.items.length,40);assert.ok(first.nextCursor);
 await inputEdit(s,first.items[0].id,{libraryText:'Changed working body without the search term'});
 const changed=await s.searchInputs({...options,cursor:first.nextCursor});assert.equal(changed.changed,true);assert.notEqual(changed.generation,first.generation);
 assert.deepEqual(await readDocumentSearchPage({cursor:first.nextCursor,generation:first.generation,read:cursor=>s.searchInputs({...options,cursor})}),{restart:true});
 const window=await readDocumentSearchWindow({cursor:first.nextCursor,generation:first.generation,history:[null],read:cursor=>s.searchInputs({...options,cursor})});assert.equal(window.page.items.length,4);assert.equal(window.history.length,1);assert.equal(window.restarted,true);
 const fresh=await readDocumentSearchPage({read:cursor=>s.searchInputs({...options,cursor})});assert.equal(fresh.items.length,40);assert.ok(!fresh.items.some(item=>item.id===first.items[0].id));
 const next=await readDocumentSearchPage({cursor:fresh.nextCursor,generation:fresh.generation,read:cursor=>s.searchInputs({...options,cursor})});assert.equal(next.items.length,4);assert.equal(next.changed,false);assert.equal(next.generation,fresh.generation);
});


test('Reader page-intent rebuild is bounded, cancels late responses and never returns mixed-generation items',async()=>{
 let count=0;const changing=async cursor=>({generation:++count,changed:!!cursor,items:[{id:'generation-'+count}],nextCursor:{at:count}});
 await assert.rejects(()=>readDocumentSearchWindow({read:changing,cursor:{at:0},generation:0,history:[null]}),/SEARCH_CHANGED/);assert.equal(count,5,'initial attempt plus two bounded fresh-page rebuilds');
 let current=true;const cancelled=await readDocumentSearchWindow({cursor:{at:0},generation:0,history:[null],read:async cursor=>{if(cursor)return {changed:true,generation:1,items:[],nextCursor:null};current=false;return {generation:1,items:[{id:'late'}],nextCursor:null};},isCurrent:()=>current});assert.equal(cancelled,null);
 await assert.rejects(()=>readDocumentSearchWindow({read:changing,cursor:{at:0},generation:0,history:Array(20).fill(null)}),/SEARCH_CHANGED/);
 await assert.rejects(()=>readDocumentSearchWindow({read:changing,cursor:{at:0},generation:0,history:[null],maxReads:1}),/SEARCH_CHANGED/);
});
