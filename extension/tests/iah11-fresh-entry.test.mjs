import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validArchiveOrigin} from '../ui/route-history.js';
import {DocumentSearchSessions} from '../ui/document-search-sessions.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const actual=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const navigateCode=actual('async function navigate(', '\nfunction showCollection(');
const archiveInputCode=actual('function onArchiveSearchInput(', '\nfunction onReaderSearchInput(');
function navigationFixture(accepted=true){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'synthetic old content',value:'',hidden:false,replaceChildren(){this.cleared=true;}});return nodes.get(id);},seen=[],timers=[];
 const context={validArchiveOrigin,archiveOriginKey:null,archiveOrigins:{get:()=>null},focusArchiveOrigin(){},readerCopy:(_zh,en)=>en,$:get,view:'library',documentId:'synthetic-doc',query:'ARCHIVE_A',archiveSearchIntent:0,scopeSearch:{input:{value:'ARCHIVE_B',disabled:false}},readerScopeSearch:{input:{value:'READER_ONLY',disabled:false}},navigationIntent:0,navigationInFlight:0,startupNavigation:Promise.resolve(),documentSearchIntent:0,documentSearchTimer:null,inputSearchTimer:null,documentSearchStates:new DocumentSearchSessions(),clearTimeout(){},setTimeout(fn){timers.push(fn);return timers.length;},closeDesktopAppearancePreview:()=>true,leave:async()=>accepted,readingModals:{close(){}},returnTo:null,readingSnapshot:null,inputSortSnapshot:null,contextInputId:null,showFilteredCurrent:false,queries:new Map([['library','ARCHIVE_A']]),routeStates:new Map([['library:',{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',pages:[null],scroll:0}]]),pageCursor:null,pageHistory:[],menuId:null,notify(){},beginLoading:()=>()=>{},document:{querySelector:()=>({})},window:{scrollTo(){}},reader:{schedule(){},restore:async()=>{}},routes:{commit(){}},highlightReading(){},async refresh(){seen.push({query:context.query,cursor:context.pageCursor,history:[...context.pageHistory]});}};
 vm.createContext(context);vm.runInContext(navigateCode+'\n'+archiveInputCode,context);return {context,seen,timers,nodes};
}

function freshFixture(accepted=true){const f=navigationFixture(accepted);f.context.searchProject={ref:{providerKey:'chatgpt',projectId:'synthetic'}};f.context.archiveNavigator={sourceScope:'chatgpt',sourceSelect:{value:'chatgpt'},lastPaintSignature:'old',state:{selectedPath:{documentId:'synthetic-doc'},select(path){this.selectedPath=path;}}};return f;}
test('primary Archive clears scope, target, query and pagination after accepted leave; Back retains them',async()=>{
 for(const fresh of [false,true]){const {context,seen}=freshFixture(),origin=context.routeStates.get('library:');origin.scroll=420;const scrolls=[];context.window.scrollTo=(...args)=>scrolls.push(args);await context.navigate('library',null,null,fresh?{freshArchiveEntry:true}:{});
 assert.deepEqual(seen,[fresh?{query:'',cursor:null,history:[]}:{query:'ARCHIVE_A',cursor:'ARCHIVE_A_PAGE_2',history:[null]}]);
 assert.equal(context.routeStates.get('library:'),origin,'fresh entry retains the existing origin snapshot');assert.deepEqual(scrolls,[[0,fresh?0:420]]);
 assert.equal(context.archiveNavigator.sourceScope,fresh?null:'chatgpt');assert.equal(context.archiveNavigator.state.selectedPath===null,fresh);assert.equal(context.searchProject===null,fresh);assert.equal(context.documentId,null);if(fresh)assert.equal(context.$('search-include-filtered').checked,true);if(fresh)assert.equal(context.queries.get('library'),'');
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

test('Reader origin return restores its own query after another root snapshot replaces the view slot',async()=>{
 const {context,seen}=freshFixture();context.routeStates.set('library:',{query:'OTHER_QUERY_B',cursor:null,pages:[],scroll:0});
 context.archiveOrigins={get:key=>key==='origin-a'?{originKind:'search-results',readerDocumentId:'synthetic-doc',view:'library',query:'ORIGIN_QUERY_A',cursor:{phase:1,offset:200},pages:[null],scroll:420,searchProject:null,sourceScope:null,navigator:null,dateStart:'',dateEnd:'',includeFiltered:false,focus:null}:null};
 context.archiveOriginKey='origin-a';context.restoreArchiveOrigin=()=>{};
 await context.navigate('library',null,null,{returnOriginKey:'origin-a'});
 assert.deepEqual(seen,[{query:'ORIGIN_QUERY_A',cursor:{phase:1,offset:200},history:[null]}]);
});

test('origin restore waits for accepted leave, preserves Reader Find and commits with replacement',async()=>{
 for(const accepted of [false,true]){
  const {context,seen}=freshFixture(accepted),key='11111111-1111-4111-8111-111111111111';
  const snapshot={originKind:'search-results',readerDocumentId:'synthetic-doc',view:'library',query:'ORIGIN_A',cursor:{phase:1,offset:200},pages:[null],scroll:420,searchProject:null,sourceScope:'chatgpt',navigator:null,dateStart:'2024-01-01',dateEnd:'',includeFiltered:true,focus:null};
  context.archiveOrigins={get:()=>snapshot};context.archiveOriginKey=key;let restored=0,focus=0,nav=0;context.restoreArchiveOrigin=value=>{assert.equal(value,snapshot);restored++;};context.focusArchiveOrigin=()=>focus++;const commits=[];context.routes.commit=opts=>commits.push(opts);
  const find=context.documentSearchStates.get('synthetic-doc');find.query='READER_FIND_ONLY';
  await context.navigate('library',null,null,{returnOriginKey:key,replaceHistory:true,applyNavigator:()=>nav++});
  assert.equal(restored,accepted?1:0);assert.equal(focus,accepted?1:0);assert.equal(nav,accepted?1:0);assert.equal(find.query,'READER_FIND_ONLY');
  if(accepted){assert.equal(seen[0].query,'ORIGIN_A');assert.equal(commits.at(-1).replace,true);}else{assert.deepEqual(seen,[]);assert.equal(context.query,'ARCHIVE_A');}
 }
});
test('evicted or mismatched Reader origin degrades to neutral instead of the last query slot',async()=>{
 for(const snapshot of [undefined,{originKind:'search-results',readerDocumentId:'different-doc',view:'library',query:'PRIVATE_OTHER',cursor:null,pages:[],scroll:420,searchProject:null,sourceScope:null,navigator:null,dateStart:'',dateEnd:'',includeFiltered:false,focus:null}]){
  const {context,seen}=freshFixture();context.archiveOrigins={get:()=>snapshot};let restored='pending';context.restoreArchiveOrigin=value=>restored=value;
  await context.navigate('library',null,null,{returnOriginKey:'11111111-1111-4111-8111-111111111111',replaceHistory:true});
  assert.equal(restored,null);assert.deepEqual(seen,[{query:'',cursor:null,history:[]}]);
 }
});

test('actual origin restoration uses its explicit scope/date/tree snapshot, not current tree selection',()=>{
 const {context,nodes}=freshFixture();let restored;
 context.archiveNavigator.restoreNavigation=value=>restored=value;
 vm.runInContext(actual('function restoreArchiveOrigin(', '\nfunction focusArchiveOrigin('),context);
 const snapshot={searchProject:{ref:{providerKey:'chatgpt',namespace:'project',projectId:'A'},title:'Synthetic A'},sourceScope:'chatgpt',navigator:{expanded:['A'],loaded:[],scrollTop:35,narrowCollapsed:false,sourceScope:'chatgpt'},dateStart:'2024-01-01',dateEnd:'2024-12-31',includeFiltered:true};
 context.restoreArchiveOrigin(snapshot);
 assert.equal(context.searchProject,snapshot.searchProject);assert.equal(context.archiveNavigator.sourceScope,'chatgpt');assert.equal(restored,snapshot.navigator);assert.equal(nodes.get('search-date-start').value,'2024-01-01');assert.equal(nodes.get('search-date-end').value,'2024-12-31');assert.equal(nodes.get('search-include-filtered').checked,true);assert.equal(context.archiveNavigator.state.selectedPath,null);
 context.restoreArchiveOrigin(null);assert.equal(context.searchProject,null);assert.equal(context.archiveNavigator.sourceScope,null);assert.equal(nodes.get('search-include-filtered').checked,true);
});

test('superseded accepted leave cannot install a previous origin or mutate navigator scope',async()=>{
 const {context,seen}=freshFixture();let release,entered;const started=new Promise(resolve=>entered=resolve);context.leave=()=>new Promise(resolve=>{release=resolve;entered();});let mutations=0;context.restoreArchiveOrigin=()=>mutations++;
 const task=context.navigate('library',null,null,{returnOriginKey:'11111111-1111-4111-8111-111111111111',applyNavigator:()=>mutations++});await started;context.navigationIntent++;release(true);assert.equal(await task,false);assert.equal(mutations,0);assert.deepEqual(seen,[]);
});

test('superseded leave callback cannot capture or replace origin metadata',async()=>{
 const {context}=freshFixture();let release,entered,captures=0;const started=new Promise(resolve=>entered=resolve);
 context.captureArchiveOrigin=()=>{captures++;return '11111111-1111-4111-8111-111111111111';};
 context.leave=(_preserve,accepted)=>new Promise(resolve=>{release=()=>{accepted();resolve(true);};entered();});
 const pending=context.navigate('library','other-doc',null,{archiveEntry:'tree'});await started;context.navigationIntent++;release();assert.equal(await pending,false);assert.equal(captures,0);
});

 test('actual Back handler preserves non-Archive returnTo and only restores Archive origins',()=>{
 const code=actual("$('back').addEventListener('click',",';let inputSearchTimer');
 for(const returnTo of ['thoughts','memory','revisit','library','archive',null]){
  let click;const seen=[];vm.runInNewContext(code,{view:'library',documentId:'doc',returnTo,$:()=>({addEventListener:(_event,fn)=>click=fn}),thoughts:{open(){}},navigate:view=>seen.push(view),returnArchiveOrigin:()=>seen.push('origin')});click();assert.deepEqual(seen,[['thoughts','memory','revisit'].includes(returnTo)?returnTo:'origin']);
 }
 });
 test('actual tree capture preserves visible Search state but Reader sibling starts neutral',()=>{
 const code=actual('function captureArchiveOrigin(', '\nfunction currentArchiveOrigin(');
 for(const documentId of [null,'reader-doc']){
  const {context}=freshFixture();context.documentId=documentId;context.archiveOriginSignature=null;context.crypto={randomUUID:()=> '11111111-1111-4111-8111-111111111111'};
  context.$('search-include-filtered').checked=false;context.pageCursor={phase:1,offset:50};context.pageHistory=[null];context.window.scrollY=120;
  context.searchProject={ref:{providerKey:'chatgpt',namespace:'project',projectId:'A'},title:'Synthetic A'};context.archiveNavigator.navigationSnapshot=()=>null;
  context.document={activeElement:null,querySelectorAll:()=>[]};let saved;context.archiveOrigins={get:()=>null,set:(_key,value)=>saved=value};vm.runInContext(code,context);
  context.captureArchiveOrigin({kind:'tree',targetId:'sibling-doc',readerDocumentId:'sibling-doc'});assert.ok(saved);
  assert.equal(saved.originKind,'project-browse');assert.equal(saved.includeFiltered,!!documentId,'Reader sibling resets Find coverage; real Search preserves an explicit unchecked filter');assert.equal(saved.query,documentId?'':'ARCHIVE_A');assert.equal(saved.searchProject===null,!!documentId);assert.equal(saved.cursor?.offset??null,documentId?null:50);assert.equal(saved.pages.length,documentId?0:1);
 }
 });
 test('lost recorded origin explains neutral return while direct entry stays quiet',async()=>{
 for(const key of [null,'11111111-1111-4111-8111-111111111111']){
  const {context}=freshFixture();const messages=[];context.notify=text=>messages.push(text);context.restoreArchiveOrigin=()=>{};
  await context.navigate('library',null,null,{returnOriginKey:key,replaceHistory:true});assert.equal(messages.includes('The original search state is unavailable. Returned to Archive.'),!!key);
 }
 });
test('actual same-origin restoration preserves the navigator render identity cache',()=>{
 const {context}=freshFixture();context.archiveNavigator.lastPaintSignature='actual retained tree signature';
 context.archiveNavigator.restoreNavigation=()=>assert.equal(context.archiveNavigator.lastPaintSignature,'actual retained tree signature');
 vm.runInContext(actual('function restoreArchiveOrigin(', '\nfunction focusArchiveOrigin('),context);
 context.restoreArchiveOrigin({navigator:{expanded:[],loaded:[],scrollTop:0},includeFiltered:true});
});
