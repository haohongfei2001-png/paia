import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DocumentSearchSessions} from '../ui/document-search-sessions.js';
import {readDocumentSearchWindow,resetDocumentSearchPage} from '../ui/document-search-page.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const actual=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const searchCode=actual('async function runDocumentSearch(',"$('document-search-retry')");
function searchFixture({readerQuery='READER_ONLY',archiveQuery='ARCHIVE_ONLY',flush=true}={}){
 const sessions=new DocumentSearchSessions(),calls=[];
 const context={view:'library',documentId:'synthetic-doc',scopeSearch:{input:{value:archiveQuery}},readerScopeSearch:{input:{value:readerQuery}},documentSearchTimer:null,documentSearchIntent:0,clearTimeout(){},documentSearchState:id=>sessions.get(id||'synthetic-doc'),resetDocumentSearchPage,readDocumentSearchWindow,renderDocumentSearch(){},showFilteredCurrent:false,editor:{collect(){},async flush(){return flush;}},async request(type,fields){calls.push({type,...fields});return {items:[{id:'synthetic-hit'}],nextCursor:null,generation:1,complete:true};}};
 vm.createContext(context);vm.runInContext(searchCode,context);return {context,calls,sessions};
}
test('actual Reader search and retry read only the independent Reader control',async()=>{
 const {context,calls,sessions}=searchFixture();await context.runDocumentSearch();await context.runDocumentSearch();
 assert.equal(calls.length,2);for(const call of calls){assert.equal(call.type,'SEARCH_INPUTS');assert.equal(call.options.query,'READER_ONLY');assert.equal(call.options.documentId,'synthetic-doc');assert.equal(call.options.mode,'current');}
 assert.equal(context.scopeSearch.input.value,'ARCHIVE_ONLY');assert.equal(sessions.get('synthetic-doc').query,'READER_ONLY');assert.equal(sessions.get('synthetic-doc').items[0].id,'synthetic-hit');
});
test('blank or unsaved Reader query cannot execute the Archive query',async()=>{
 for(const options of [{readerQuery:''},{flush:false}]){const {context,calls,sessions}=searchFixture(options);await context.runDocumentSearch();assert.equal(calls.length,0);assert.equal(context.scopeSearch.input.value,'ARCHIVE_ONLY');if(options.flush===false)assert.equal(sessions.get('synthetic-doc').unsaved,true);}
});
const navigateCode=actual('async function navigate(', '\nfunction showCollection(');
const archiveInputCode=actual('function onArchiveSearchInput(', '\nfunction onReaderSearchInput(');
function navigationFixture(accepted=true){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'synthetic old content',value:'',hidden:false,replaceChildren(){this.cleared=true;}});return nodes.get(id);},seen=[],timers=[];
 const context={$:get,view:'library',documentId:'synthetic-doc',query:'ARCHIVE_A',archiveSearchIntent:0,scopeSearch:{input:{value:'ARCHIVE_B',disabled:false}},readerScopeSearch:{input:{value:'READER_ONLY',disabled:false}},navigationIntent:0,navigationInFlight:0,startupNavigation:Promise.resolve(),documentSearchIntent:0,documentSearchTimer:null,inputSearchTimer:null,documentSearchStates:new DocumentSearchSessions(),clearTimeout(){},setTimeout(fn){timers.push(fn);return timers.length;},closeDesktopAppearancePreview:()=>true,leave:async()=>accepted,readingModals:{close(){}},returnTo:null,readingSnapshot:null,inputSortSnapshot:null,contextInputId:null,showFilteredCurrent:false,queries:new Map([['library','ARCHIVE_A']]),routeStates:new Map([['library:',{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',pages:[null],scroll:0}]]),pageCursor:null,pageHistory:[],menuId:null,notify(){},beginLoading:()=>()=>{},document:{querySelector:()=>({})},window:{scrollTo(){}},reader:{schedule(){},restore:async()=>{}},routes:{commit(){}},highlightReading(){},async refresh(){seen.push({query:context.query,cursor:context.pageCursor,history:[...context.pageHistory]});}};
 vm.createContext(context);vm.runInContext(navigateCode+'\n'+archiveInputCode,context);return {context,seen,timers,nodes};
}
test('actual Archive query from Reader resets old pagination only after accepted leave',async()=>{
 const {context,seen,timers}=navigationFixture();context.onArchiveSearchInput();assert.equal(seen.length,0);await timers.pop()();
 assert.deepEqual(seen,[{query:'ARCHIVE_B',cursor:null,history:[]}]);assert.equal(context.documentId,null);assert.equal(context.readerScopeSearch.input.value,'READER_ONLY');
});
test('actual refused Archive search keeps Reader content and restores the previous Archive query',async()=>{
 const {context,seen,timers,nodes}=navigationFixture(false);context.onArchiveSearchInput();await timers.pop()();
 assert.equal(context.documentId,'synthetic-doc');assert.equal(context.query,'ARCHIVE_A');assert.equal(context.scopeSearch.input.value,'ARCHIVE_A');assert.equal(seen.length,0);assert.equal(nodes.has('document-body'),false);assert.equal(context.scopeSearch.input.disabled,false);assert.equal(context.readerScopeSearch.input.disabled,false);
});
test('ordinary Back still restores the prior Archive query and page',async()=>{
 const {context,seen}=navigationFixture();await context.navigate('library');assert.deepEqual(seen,[{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',history:[null]}]);
});
