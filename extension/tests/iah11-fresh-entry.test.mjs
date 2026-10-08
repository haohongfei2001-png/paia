import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DocumentSearchSessions} from '../ui/document-search-sessions.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const actual=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const navigateCode=actual('async function navigate(', '\nfunction showCollection(');
const archiveInputCode=actual('function onArchiveSearchInput(', '\nfunction onReaderSearchInput(');
function navigationFixture(accepted=true){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'synthetic old content',value:'',hidden:false,replaceChildren(){this.cleared=true;}});return nodes.get(id);},seen=[],timers=[];
 const context={$:get,view:'library',documentId:'synthetic-doc',query:'ARCHIVE_A',archiveSearchIntent:0,scopeSearch:{input:{value:'ARCHIVE_B',disabled:false}},readerScopeSearch:{input:{value:'READER_ONLY',disabled:false}},navigationIntent:0,navigationInFlight:0,startupNavigation:Promise.resolve(),documentSearchIntent:0,documentSearchTimer:null,inputSearchTimer:null,documentSearchStates:new DocumentSearchSessions(),clearTimeout(){},setTimeout(fn){timers.push(fn);return timers.length;},closeDesktopAppearancePreview:()=>true,leave:async()=>accepted,readingModals:{close(){}},returnTo:null,readingSnapshot:null,inputSortSnapshot:null,contextInputId:null,showFilteredCurrent:false,queries:new Map([['library','ARCHIVE_A']]),routeStates:new Map([['library:',{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',pages:[null],scroll:0}]]),pageCursor:null,pageHistory:[],menuId:null,notify(){},beginLoading:()=>()=>{},document:{querySelector:()=>({})},window:{scrollTo(){}},reader:{schedule(){},restore:async()=>{}},routes:{commit(){}},highlightReading(){},async refresh(){seen.push({query:context.query,cursor:context.pageCursor,history:[...context.pageHistory]});}};
 vm.createContext(context);vm.runInContext(navigateCode+'\n'+archiveInputCode,context);return {context,seen,timers,nodes};
}

function freshFixture(accepted=true){const f=navigationFixture(accepted);f.context.searchProject={ref:{providerKey:'chatgpt',projectId:'synthetic'}};f.context.archiveNavigator={sourceScope:'chatgpt',sourceSelect:{value:'chatgpt'},lastPaintSignature:'old',state:{selectedPath:{documentId:'synthetic-doc'},select(path){this.selectedPath=path;}}};return f;}
test('primary Archive clears scope, target, query and pagination after accepted leave; Back retains them',async()=>{
 for(const fresh of [false,true]){const {context,seen}=freshFixture(),origin=context.routeStates.get('library:');origin.scroll=420;const scrolls=[];context.window.scrollTo=(...args)=>scrolls.push(args);await context.navigate('library',null,null,fresh?{freshArchiveEntry:true}:{});
 assert.deepEqual(seen,[fresh?{query:'',cursor:null,history:[]}:{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',history:[null]}]);
 assert.equal(context.routeStates.get('library:'),origin,'fresh entry retains the existing origin snapshot');assert.deepEqual(scrolls,[[0,fresh?0:420]]);
 assert.equal(context.archiveNavigator.sourceScope,fresh?null:'chatgpt');assert.equal(context.archiveNavigator.state.selectedPath===null,fresh);assert.equal(context.searchProject===null,fresh);assert.equal(context.documentId,null);if(fresh)assert.equal(context.queries.get('library'),'');
 }
});
test('refused save or composition leave does not reset any Archive state',async()=>{
 const {context,seen}=freshFixture(false),project=context.searchProject,path=context.archiveNavigator.state.selectedPath;
 assert.equal(await context.navigate('library',null,null,{freshArchiveEntry:true}),false);assert.deepEqual(seen,[]);assert.equal(context.documentId,'synthetic-doc');assert.equal(context.query,'ARCHIVE_A');assert.equal(context.searchProject,project);assert.equal(context.archiveNavigator.state.selectedPath,path);assert.equal(context.archiveNavigator.sourceScope,'chatgpt');assert.equal(context.routeStates.has('library:'),true);
});
test('held leave keeps scope intact and superseded navigation cannot commit the reset',async()=>{
 const {context}=freshFixture();let release,entered;const started=new Promise(resolve=>entered=resolve);context.leave=()=>new Promise(resolve=>{release=resolve;entered();});const pending=context.navigate('library',null,null,{freshArchiveEntry:true});await started;
 assert.equal(context.archiveNavigator.sourceScope,'chatgpt');context.navigationIntent++;release(true);assert.equal(await pending,false);assert.equal(context.archiveNavigator.sourceScope,'chatgpt');assert.equal(context.query,'ARCHIVE_A');
});
test('only explicit primary Archive passes fresh intent; Back retains the common navigation owner',()=>{
 assert.ok(source.includes("b.dataset.view==='library'?{freshArchiveEntry:true}:{}"));assert.ok(source.includes("navigate(returnTo|| (documentId?view:view==='legacy'?'settings':'library'))"));
});

test('fresh entry leaves the saved query and page available to the existing return path',async()=>{
 const {context,seen}=freshFixture(),origin=context.routeStates.get('library:');await context.navigate('library',null,null,{freshArchiveEntry:true});
 assert.equal(context.routeStates.get('library:'),origin);await context.navigate('library');assert.deepEqual(seen.at(-1),{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',history:[null]});
});

 test('Archive result click delegates reveal solely to completed navigation',()=>{
 const binding=actual('wireScopeSearchKeyboard(scopeSearch.input,','wireScopeSearchKeyboard(readerScopeSearch.input,');
 let captured;
 vm.runInNewContext(binding,{scopeSearch:{input:{}},$:id=>({id}),wireScopeSearchKeyboard:(_input,pages)=>{captured=pages;}});
 assert.equal(captured.length,1);assert.equal(captured[0].results.id,'document-list');
 assert.equal(captured[0].revealOnClick,false,'Archive click must not start the unguarded generic reveal before navigation completes');
 assert.ok(navigateCode.includes('options.searchArrival'));
 assert.ok(navigateCode.includes('revealSearchResult(contextId,arrival.query,{isCurrent:current,'));
 });
