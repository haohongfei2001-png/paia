import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validArchiveOrigin} from '../ui/route-history.js';
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
 assert.equal(calls.length,2);for(const call of calls){assert.equal(call.type,'SEARCH_INPUTS');assert.equal(call.options.query,'READER_ONLY');assert.equal(call.options.documentId,'synthetic-doc');assert.equal(call.options.mode,'current');assert.equal(call.options.includeFiltered,true,'ordinary Reader Find includes eligible filtered Inputs without changing normal Reader visibility');assert.equal(call.options.includeRemoved,false);}
 assert.equal(context.scopeSearch.input.value,'ARCHIVE_ONLY');assert.equal(sessions.get('synthetic-doc').query,'READER_ONLY');assert.equal(sessions.get('synthetic-doc').items[0].id,'synthetic-hit');
});
test('blank or unsaved Reader query cannot execute the Archive query',async()=>{
 for(const options of [{readerQuery:''},{flush:false}]){const {context,calls,sessions}=searchFixture(options);await context.runDocumentSearch();assert.equal(calls.length,0);assert.equal(context.scopeSearch.input.value,'ARCHIVE_ONLY');if(options.flush===false)assert.equal(sessions.get('synthetic-doc').unsaved,true);}
});
const navigateCode=actual('async function navigate(', '\nfunction showCollection(');
const archiveInputCode=actual('function onArchiveSearchInput(', '\nfunction onReaderSearchInput(');
function navigationFixture(accepted=true){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'synthetic old content',value:'',hidden:false,replaceChildren(){this.cleared=true;}});return nodes.get(id);},seen=[],timers=[];
 const context={$:get,view:'library',documentId:'synthetic-doc',query:'ARCHIVE_A',archiveSearchIntent:0,scopeSearch:{input:{value:'ARCHIVE_B',disabled:false}},readerScopeSearch:{input:{value:'READER_ONLY',disabled:false}},navigationIntent:0,navigationInFlight:0,startupNavigation:Promise.resolve(),documentSearchIntent:0,documentSearchTimer:null,inputSearchTimer:null,documentSearchStates:new DocumentSearchSessions(),clearTimeout(){},setTimeout(fn){timers.push(fn);return timers.length;},closeDesktopAppearancePreview:()=>true,leave:async()=>accepted,readingModals:{close(){}},returnTo:null,readingSnapshot:null,inputSortSnapshot:null,contextInputId:null,showFilteredCurrent:false,queries:new Map([['library','ARCHIVE_A']]),routeStates:new Map([['library:',{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',pages:[null],scroll:0}]]),pageCursor:null,pageHistory:[],menuId:null,notify(){},beginLoading:()=>()=>{},document:{querySelector:()=>({})},window:{scrollTo(){}},reader:{schedule(){},restore:async()=>{}},routes:{beginnings:0,beginNavigation(){this.beginnings++;},commit(){}},highlightReading(){},async refresh(){seen.push({query:context.query,cursor:context.pageCursor,history:[...context.pageHistory]});}};
 vm.createContext(context);vm.runInContext(navigateCode+'\n'+archiveInputCode,context);return {context,seen,timers,nodes};
}
test('actual Archive query from Reader resets old pagination only after accepted leave',async()=>{
 const {context,seen,timers}=navigationFixture();context.onArchiveSearchInput();assert.equal(seen.length,0);await timers.pop()();
 assert.deepEqual(seen,[{query:'ARCHIVE_B',cursor:null,history:[]}]);assert.equal(context.documentId,null);assert.equal(context.readerScopeSearch.input.value,'READER_ONLY');assert.equal(context.routes.beginnings,1,'Archive search uses the current navigation owner');
});
test('actual refused Archive search keeps Reader content and restores the previous Archive query',async()=>{
 const {context,seen,timers,nodes}=navigationFixture(false);context.onArchiveSearchInput();await timers.pop()();
 assert.equal(context.documentId,'synthetic-doc');assert.equal(context.query,'ARCHIVE_A');assert.equal(context.scopeSearch.input.value,'ARCHIVE_A');assert.equal(seen.length,0);assert.equal(nodes.has('document-body'),false);assert.equal(context.scopeSearch.input.disabled,false);assert.equal(context.readerScopeSearch.input.disabled,false);
});
test('ordinary Back still restores the prior Archive query and page',async()=>{
 const {context,seen}=navigationFixture();await context.navigate('library');assert.deepEqual(seen,[{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',history:[null]}]);
});
test('actual Reader Find activation uses exact-target arrival and a single navigation-owned reveal',async()=>{
 const calls=[],context={documentId:'synthetic-doc',normalizeSearch:value=>String(value||'').normalize('NFKC').toLowerCase().trim(),readerScopeSearch:{input:{}},documentSearchState:()=>({}),renderDocumentSearch(){},revealSearchResult(){throw Error('unqualified duplicate reveal');},navigate:async(...args)=>{calls.push(args);return true;}};
 vm.createContext(context);vm.runInContext(actual('async function openDocumentSearchItem(', '\nfunction renderDocumentSearch('),context);
 await context.openDocumentSearchItem({query:'needle'},{id:'target',documentId:'synthetic-doc',snippet:'current needle',bodyMatched:true,ref:{kind:'input',revision:7}});
 assert.equal(calls[0][3]?.searchArrival?.bodyMatched,true);assert.equal(calls[0][3]?.searchArrival?.knownRevision,7);assert.equal(calls[0][3]?.searchArrival?.query,'needle');assert.equal(calls[0][2],'target');assert.equal(Object.hasOwn(calls[0][3].searchArrival,'searchSnapshot'),false,'Reader scope does not invent Archive Project metadata');
 for(const patch of [{documentId:'another-doc'},{ref:{kind:'source',revision:7}},{ref:{kind:'input',revision:-1}}])await context.openDocumentSearchItem({query:'needle'},{id:'target',documentId:'synthetic-doc',bodyMatched:true,ref:{kind:'input',revision:7},...patch});assert.equal(calls.length,1,'invalid refs cannot activate a result');
});


test('actual compact Archive origin restores explicit source without reconstructing an All browse choice',()=>{
 const snapshot={originKind:'search-results',readerDocumentId:'synthetic-doc',view:'library',query:'SYNTHETIC',cursor:null,pages:[],scroll:0,searchProject:null,sourceScope:'claude',navigator:null,dateStart:'',dateEnd:'',includeFiltered:true,focus:null};
 assert.equal(validArchiveOrigin(snapshot),true,'the existing public origin validator actually admits navigator:null');
 const nodes=new Map(),context={searchProject:null,$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},archiveNavigator:{sourceScope:'chatgpt',browseSource:'chatgpt',sourceInitialized:false,sourceSelect:{value:'chatgpt'},state:{select(){}},lastPaintSignature:'old',restoreNavigation(){throw Error('no fabricated tree snapshot');}}};
 vm.createContext(context);vm.runInContext(actual('function restoreArchiveOrigin(', '\nfunction focusArchiveOrigin('),context);context.restoreArchiveOrigin(snapshot);
 assert.equal(context.archiveNavigator.sourceScope,'claude');assert.equal(context.archiveNavigator.browseSource,'claude');assert.equal(context.archiveNavigator.sourceInitialized,true);assert.equal(context.archiveNavigator.sourceSelect.value,'claude');assert.equal(context.archiveNavigator.lastPaintSignature,null);
 context.restoreArchiveOrigin({...snapshot,sourceScope:null});assert.equal(context.archiveNavigator.sourceScope,null);assert.equal(context.archiveNavigator.browseSource,'claude','All keeps a real existing browse choice rather than inferring from Reader');assert.equal(context.archiveNavigator.sourceSelect.value,'');
});

test('actual Reader result keeps maskable excerpt separate from title/time and original open action',async()=>{
 const {PresentationNode}=await import('./harness/presentation-dom.mjs'),nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new PresentationNode('div'));return nodes.get(id);},input=new PresentationNode('input'),opened=[];
 const current={query:'needle',items:[{id:'i',title:'Visible title',snippet:'PRIVATE needle exact',sourceSentAt:null}],history:[],nextCursor:null,activeInputId:null};
 const context={$:get,readerScopeSearch:{input},view:'library',documentId:'d',document:{activeElement:null},documentSearchState:()=>current,readerCopy:(_zh,en)=>en,tc:x=>x,element:(tag,cls='',text='')=>{const n=new PresentationNode(tag);n.className=cls;n.textContent=text;return n;},highlightReading:()=>{},openDocumentSearchItem:async(...args)=>opened.push(args),showLocalFailure:()=>{throw Error('unexpected failure');}};
 vm.createContext(context);vm.runInContext(actual('function renderDocumentSearch(', '\nfunction invalidateDocumentSearch('),context);context.renderDocumentSearch();const hit=get('document-search-results').children[0],excerpt=hit.children.find(n=>n.className==='paia-search-preview');assert.equal(excerpt.textContent,current.items[0].snippet);assert.equal(hit.children.filter(n=>n.tagName==='P').length,1);assert.ok(hit.children.some(n=>n.className==='paia-search-preview-mask'));assert.equal(hit.children[0].textContent,'Visible title');assert.equal(hit.getAttribute('title'),null);hit.listeners.get('click')();await Promise.resolve();assert.equal(opened.length,1);assert.equal(opened[0][1],current.items[0]);assert.equal(current.query,'needle');
});
