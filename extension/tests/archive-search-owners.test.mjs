import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validArchiveOrigin} from '../ui/route-history.js';
import {DocumentSearchSessions} from '../ui/document-search-sessions.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const actual=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
test('actual Reader and Thought shortcut owners yield to native browser Find',()=>{
 const context={view:'library',documentId:'d',scopeSearch:{input:{id:'archive'}},$(){throw Error('retired search must not resolve a DOM control');}};
 vm.createContext(context);vm.runInContext(actual('function currentSurfaceSearch(', '\nfunction focusCurrentSurfaceSearch('),context);
 assert.equal(context.currentSurfaceSearch(),null);
 context.view='thoughts';context.documentId=null;assert.equal(context.currentSurfaceSearch(),null);
 context.view='library';assert.equal(context.currentSurfaceSearch(),context.scopeSearch.input);
 for(const retired of ['runDocumentSearch','readerScopeSearch','document-search-retry','document-search-next'])assert.equal(source.includes(retired),false,retired+' is retired, not merely hidden');
});
const navigateCode=actual('async function navigate(', '\nfunction showCollection(');
const archiveInputCode=actual('function onArchiveSearchInput(', '\nfunction presentScopeSearch(');
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
test('actual compact Archive origin restores explicit source without reconstructing an All browse choice',()=>{
 const snapshot={originKind:'search-results',readerDocumentId:'synthetic-doc',view:'library',query:'SYNTHETIC',cursor:null,pages:[],scroll:0,searchProject:null,sourceScope:'claude',navigator:null,dateStart:'',dateEnd:'',includeFiltered:true,focus:null};
 assert.equal(validArchiveOrigin(snapshot),true,'the existing public origin validator actually admits navigator:null');
 const nodes=new Map(),context={searchProject:null,$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},archiveNavigator:{sourceScope:'chatgpt',browseSource:'chatgpt',sourceInitialized:false,sourceSelect:{value:'chatgpt'},state:{select(){}},lastPaintSignature:'old',restoreNavigation(){throw Error('no fabricated tree snapshot');}}};
 vm.createContext(context);vm.runInContext(actual('function restoreArchiveOrigin(', '\nfunction focusArchiveOrigin('),context);context.restoreArchiveOrigin(snapshot);
 assert.equal(context.archiveNavigator.sourceScope,'claude');assert.equal(context.archiveNavigator.browseSource,'claude');assert.equal(context.archiveNavigator.sourceInitialized,true);assert.equal(context.archiveNavigator.sourceSelect.value,'claude');assert.equal(context.archiveNavigator.lastPaintSignature,null);
 context.restoreArchiveOrigin({...snapshot,sourceScope:null});assert.equal(context.archiveNavigator.sourceScope,null);assert.equal(context.archiveNavigator.browseSource,'claude','All keeps a real existing browse choice rather than inferring from Reader');assert.equal(context.archiveNavigator.sourceSelect.value,'');
});

test('ordinary Archive pagination owner still initializes and preserves guarded page transitions',async()=>{
 const handlers=new Map(),nodes=[],context={state:{nextCursor:'second'},element(tag){const node={tag,append(){},addEventListener(type,fn){handlers.set(node,fn);}};nodes.push(node);return node;},$(){return {after(){}};},accepted:true,async leave(){return context.accepted;},async refresh(){context.refreshed=(context.refreshed||0)+1;}};
 vm.createContext(context);vm.runInContext(actual('let pageCursor=null,pageHistory=[];', '\nconst recovery='),context);
 assert.equal(nodes.length,3);await handlers.get(nodes[2])();assert.equal(vm.runInContext('pageCursor',context),'second');assert.equal(vm.runInContext('pageHistory.length',context),1);
 context.accepted=false;await handlers.get(nodes[1])();assert.equal(vm.runInContext('pageCursor',context),'second');context.accepted=true;await handlers.get(nodes[1])();assert.equal(vm.runInContext('pageCursor',context),null);assert.equal(context.refreshed,2);
});
