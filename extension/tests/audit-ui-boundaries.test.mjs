import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readDocumentSearchPage,readDocumentSearchWindow,resetDocumentSearchPage} from '../ui/document-search-page.js';
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

test('Retired serializers refuse before reading a Source record or producing a download',()=>{
 let reads=0;const records=new Proxy([], {get(){reads++;throw Error('retired export read data');}});
 for(const serialize of [exportJSON,exportMarkdown])assert.throws(()=>serialize(records),{code:'FEATURE_UNAVAILABLE'});
 assert.equal(reads,0);
});

test('Removed export and explicit-response UI modules cannot be imported by stale entry points',async()=>{
 await assert.rejects(import('../ui/continue-thought.js'),{code:'ERR_MODULE_NOT_FOUND'});
 const {readSourceExport}=await import('../ui/source-export.js');let reads=0;await assert.rejects(readSourceExport({read(){reads++;}}),{code:'FEATURE_UNAVAILABLE'});assert.equal(reads,0);
 const actions=await readFile(new URL('../ui/topic-actions.js',import.meta.url),'utf8');
 assert.doesNotMatch(actions,/relatedThought|GET_THOUGHT_RELATIONS|回应这条|查看关联/);
 assert.match(actions,/CONTINUE_THINKING/,'independent Thought creation remains');
});

test('header menu retains history, removal and search while export handlers are absent',async()=>{
 const source=await readFile(new URL('../ui/archive.js',import.meta.url),'utf8');
 const header=source.slice(source.indexOf('function openDocumentMenu()'),source.indexOf('async function openSourceRecord('));
 assert.match(header,/文档版本历史/);assert.match(header,/会话收录设置/);assert.doesNotMatch(header,/从档案移除|永久删除|copyReadingText|addInputToTopic/);
 assert.match(source,/add\('从档案移除'|view==='excluded'\?'恢复显示':'从档案移除'/);assert.doesNotMatch(source,/menuId\|\|row\.dataset\.itemId/);
 assert.match(source,/smartFilter.changed\(\);invalidateDocumentSearch\(\)/);assert.doesNotMatch(source,/archiveExportBusy|重试导出|readSourceExport|exportJSON|exportMarkdown/);
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
