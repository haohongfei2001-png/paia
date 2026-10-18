import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {appShellRoute} from '../ui/app-shell-state.js';
import {RouteHistory,validRoute,routeViews} from '../ui/route-history.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const section=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,start);return source.slice(a,b).replace(/^export /gm,'');};
const archive=read('../ui/archive.js'),settings=read('../ui/settings-preferences.js'),raw=read('./harness/raw-source-navigation.mjs');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Execute the actual helper, navigation, full refresh and Settings group owners.
// Only browser/DOM delivery is adapted. The held Memory status still reaches the
// real MemoryService and original Store after release, including its generation.
// This proves ordering, not native Chrome acceptance or the old failure's cause.
async function fixture({group='content',width=1440}={}){
 const {s}=await setup(OrganizerStore),snapshot=await s.snapshot(),canonical=snapshot.conversations[0],service=new MemoryService(s);
 const before=await s.page({view:'settings'}),memory=deferred(),memoryEntered=deferred(),migration=deferred(),migrationEntered=deferred();
 const trace=[],errors=[],tasks=[],nodes=new Map();let stopped=false;
 const get=id=>{if(!nodes.has(id))nodes.set(id,{id,dataset:{},hidden:false,open:false,value:'',textContent:'',disabled:false,children:[],addEventListener(){},setAttribute(k,v){this[k]=v;},getAttribute(k){return this[k]??null;},replaceChildren(){},insertBefore(){},append(){},after(){},contains(){return false;}});return nodes.get(id);};
 get('settings-panel').hidden=true;get('archive-compact-navigation').open=false;
 const c={assert,console,Map,Promise,Date,structuredClone,crypto,appShellRoute,RouteHistory,validRoute,views:routeViews,location:{href:'chrome-extension://synthetic/ui/archive.html'},innerWidth:width,$:get,view:'library',documentId:canonical.id,query:'',serial:0,navigationIntent:0,navigationInFlight:0,startupNavigation:Promise.resolve(),inputSearchTimer:null,returnTo:null,contextInputId:null,contextPositionOnly:false,qualifySearchContext:null,readingSnapshot:null,inputSortSnapshot:null,showFilteredCurrent:false,archiveOriginKey:null,archiveOrigins:new Map(),annualReading:{},annualRestore:null,routeStates:new Map(),queries:new Map(),pageCursor:null,pageHistory:[],menuId:null,readerStream:null,editor:null,partHistory:null,documentHistories:new Map(),infoIds:[],latestRefresh:null,lastSuccessfulRefresh:null,inputSearchInProgress:false,state:before,
  clearTimeout(){},closeDesktopAppearancePreview:()=>true,leave:async(_preserve,accepted)=>{accepted?.();return true;},captureArchiveOrigin:()=>null,readingModals:{close(){}},notify(){},beginLoading:()=>()=>{},reader:{schedule(){},restore:async()=>{}},thoughts:{clearActionFeedback(){}},appShell:{rememberSettingsOrigin(){}},scopeSearch:{input:{value:'',disabled:false}},archiveNavigator:{sourceScope:null},onboarding:{load:async()=>{}},topicActions:{surface:null},recovery:get('recovery'),pager:get('pager'),previous:get('previous'),migrationSummary:get('migration'),nextButtonState(){},error:value=>errors.push(value),history:{state:{paiaReader:{view:'library',documentId:canonical.id},paiaShell:{view:'library'}}},
  document:{addEventListener(){},activeElement:null,documentElement:{lang:'zh-CN'},querySelector:()=>get('workspace'),getElementById:get},window:{addEventListener(){},scrollTo(){}},scrollY:0,group,groupFocusSerial:0,settingsVisible:false,about:null,style:null,promptPosition:null,promptNext:null,positions:new Map(),syncSettingsLocale(){},rememberPosition(){},requestAnimationFrame(){},setProductState(){},copy:zh=>zh,
  groups:new Map(['content','privacy','data'].map(key=>[key,get('ux-settings-'+key+'-group')])),tabs:new Map(['content','privacy','data'].map(key=>[key,get('ux-settings-'+key+'-link')]))};
 c.document.body=get('body');c.document.activeElement=c.document.body;
 c.render=()=>{get('settings-panel').hidden=c.view!=='settings';c.settingsVisible=c.view==='settings';get('body').dataset.paiaSpace=c.view;trace.push('render:'+c.view);};
 for(const method of ['pushState','replaceState'])c.history[method]=value=>{c.history.state=value;trace.push('commit:'+value.paiaReader.view+':'+c.group);};
 c.onRouteChange=()=>c.routes.commit();
 c.request=async(type,fields={})=>{
  trace.push('request:'+type);
  if(type==='GET_PAGE')return {...await s.page(fields.page),recoveryEpoch:'synthetic-epoch'};
  if(type==='PAIA_MEMORY_STATUS'){memoryEntered.resolve();await memory.promise;const result=await service.status();trace.push('memory:completed');return result;}
  if(type==='GET_MIGRATION_STATUS'){migrationEntered.resolve();await migration.promise;trace.push('migration:completed');return {phase:'active',verified:true,recoveryVerified:true};}
  if(type==='IMPORT_LATEST')return null;
  if(type==='FILTER_STATUS')return {mode:'off'};
  throw Error('unexpected RPC '+type);
 };
 c.archivePageRequest=c.request;c.chrome={runtime:{sendMessage:async({type,...fields})=>({ok:true,data:await c.request(type,fields)})}};
 c.historyPanel={latest:()=>c.request('IMPORT_LATEST')};c.smartFilter={home(){},settings:()=>c.request('FILTER_STATUS')};
 // Event-loop rendezvous, not an elapsed-time sleep or a replacement timeout.
 c.eventually=async(fn,label)=>{while(!await fn()){if(stopped)throw Error('fixture stopped: '+label);await tick();}};
 vm.createContext(c);
 vm.runInContext(section(settings,'export function captureSettingsView(', '\nfunction setupSettingsShell('),c);
 vm.runInContext(section(read('../ui/reader-navigation.js'),'export function installReaderNavigation(', '\n}')+'\n}',c);
 c.routes=c.installReaderNavigation({navigate:(...args)=>c.navigate(...args),current:()=>({view:c.view,documentId:c.documentId,returnTo:c.returnTo}),captureSettings:()=>c.captureSettingsView(),present(){}});
 c.routes.commit({replace:true});
 vm.runInContext(read('../ui/memory.js').replace(/^import .*;\n/gm,'').replace('export class','class')+'\nthis.MemoryPanel=MemoryPanel;',c);c.memory=new c.MemoryPanel();
 vm.runInContext(section(archive,'async function navigate(', '\nfunction showCollection(')+'\n'+section(archive,'function refresh(){','\nfunction inputRemovalIsCurrent('),c);
 vm.runInContext(section(read('./harness/current-thought-navigation.mjs'),'export async function thoughtPrimary(', '\nexport async function openThoughtMenu(')+'\n'+section(read('./harness/archive-navigator.mjs'),'const visible=', '\nexport async function openArchiveWindow(')+'\n'+section(raw,'const rpc=', '\nexport async function openRawInputOriginal('),c);
 const primary={parentElement:{id:width<768?'archive-compact-nav-items':'primary-nav',classList:{contains:()=>false}},closest:()=>width<768&&!get('archive-compact-navigation').open?get('archive-compact-navigation'):null};
 function launch(next,id){const run=c.navigate(next,id);tasks.push(run);run.catch(error=>errors.push(error.message));}
 function locator(selector){const node=selector.startsWith('#')?get(selector.slice(1)):selector.startsWith('.sidebar')?primary:null;
  const result={filter(){return this;},first(){return this;},locator:child=>locator(selector+' '+child),async evaluate(fn,arg){return fn(node,arg);},async getAttribute(name){return selector==='body'&&name==='data-paia-space'?get('body').dataset.paiaSpace:selector==='.conversation-document'&&name==='data-document-id'?canonical.id:node?.getAttribute(name);},async count(){return selector==='#document-body .original-prose'&&c.view==='archive'&&c.documentId===canonical.id?1:0;},async isVisible(){if(selector==='#settings-panel')return !get('settings-panel').hidden;if(selector==='[data-settings-group="data"]')return c.settingsVisible&&(width>=1024||c.group==='index');if(selector==='#ux-settings-data-group')return c.settingsVisible&&c.group==='data';if(selector==='.conversation-document')return c.view==='archive'&&!c.documentId;return false;},async waitFor(){await c.eventually(()=>this.isVisible(),selector+' visible');},async click(){
   if(selector==='.sidebar [data-view="settings"]')launch('settings');
   else if(selector==='#archive-compact-nav-label')get('archive-compact-navigation').open=true;
   else if(selector==='#ux-settings-group-back'){trace.push('group:index');c.activateGroup('index');}
   else if(selector==='[data-settings-group="data"]'){trace.push('group:data');c.activateGroup('data');}
   else if(selector==='#settings-source-records'){trace.push('source:click');launch('archive');}
   else if(selector==='.conversation-document')launch('archive',canonical.id);
   else throw Error('unexpected click '+selector);
  }};return result;
 }
 const page={locator,keyboard:{press:async()=>{get('archive-compact-navigation').open=false;}},evaluate:async(fn,arg)=>fn(arg)};
 return {s,c,page,trace,errors,canonical,before,snapshot,memory,memoryEntered,migration,migrationEntered,async close(){memory.resolve();migration.resolve();stopped=true;await Promise.allSettled(tasks);await s.repository.close();}};
}

for(const options of [{group:'content',width:1440},{group:'data',width:1440},{group:'privacy',width:390}])test('Raw helper waits before changing Settings group or opening Source: '+JSON.stringify(options),{timeout:5000},async()=>{
 const f=await fixture(options);let settled=false,failure;
 const opening=f.c.openRawDocument(f.page,f.canonical.id).then(result=>{settled=true;return result;},error=>{settled=true;failure=error;});
 try{
  await f.memoryEntered.promise;await tick();
  assert.deepEqual(f.errors,[]);assert.equal(f.c.settingsVisible,true,'actual refresh already rendered Settings');
  assert.equal(await f.s.repository.transaction(false,t=>t.get('meta','memory:config'),['meta']),undefined,'original Memory initialization has not dispatched');
  assert.equal(f.trace.filter(x=>x.startsWith('group:')).length,0,'no Data or compact Back click may manufacture an early Settings route: '+JSON.stringify(f.trace));
  assert.equal(f.trace.includes('source:click'),false,'no Raw navigation while original Settings initialization is held');assert.equal(settled,false);
  assert.equal(f.c.history.state.paiaReader.view,'library','visible Settings is not its original route completion');
  f.memory.resolve();await f.migrationEntered.promise;await tick();
  assert.equal(f.trace.includes('memory:completed'),true);assert.equal((await f.s.page({view:'settings'})).dataGeneration,f.before.dataGeneration+1,'real Memory config writes retain the normal generation change');
  assert.equal(f.trace.filter(x=>x.startsWith('group:')).length,0,'final original Settings read still owns navigation completion');assert.equal(f.trace.includes('source:click'),false);assert.equal(settled,false);
  f.migration.resolve();const opened=await opening;if(failure)throw failure;assert.equal(opened.id,f.canonical.id);
  assert.deepEqual(f.errors,[]);assert.equal(f.trace.filter(x=>x==='source:click').length,1);assert.equal(f.c.history.state.paiaReader.documentId,f.canonical.id);
  const committed=f.trace.indexOf('commit:settings:'+options.group),selected=f.trace.indexOf('group:data');assert.ok(committed>f.trace.indexOf('migration:completed'));assert.ok(selected>committed,'Data selection follows the original Settings navigation commit');
  assert.deepEqual((await f.s.snapshot()).records,f.snapshot.records,'Settings initialization and navigation retain immutable Source bytes');
 }finally{await f.close();await opening;}
});

test('Raw helper refuses an already-Settings route instead of mistaking it for a new navigation completion',async()=>{
 const f=await fixture();try{
  f.c.view='settings';f.c.documentId=null;f.c.settingsVisible=true;f.c.routes.commit();const before=[...f.trace];
  const opening=f.c.openRawDocument(f.page,f.canonical.id);f.memory.resolve();f.migration.resolve();
  await assert.rejects(opening,/must start outside Settings/);
  assert.deepEqual(f.trace,before,'no new read, group mutation or Source navigation is started');
 }finally{await f.close();}
});

const native=read('./ux-r2-reader-revisit-chrome-e2e.test.mjs');
const nativeControls=section(native,'function installRawSettingsInitializationGate(',"\ntest('UX-R2 Raw Settings original initialization");
function nativeGateFixture(send=async()=>({ok:true,data:{}})){
 const dispatched=[],listeners=new Map(),original=async function(message){dispatched.push(message.type);return send(message);};
 const c={chrome:{runtime:{sendMessage:original}},history:{state:{paiaReader:{view:'library'},paiaShell:{view:'library'}}},document:{addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);}}};vm.createContext(c);vm.runInContext(nativeControls,c);c.installRawSettingsInitializationGate('synthetic-input');
 return {c,dispatched,listeners,original,gate:c.__rawSettingsInitialization};
}
test('native held-read control blocks Memory before original dispatch and migration only after original response',async()=>{
 const f=nativeGateFixture(),memory=f.c.chrome.runtime.sendMessage({type:'PAIA_MEMORY_STATUS'});await tick();assert.deepEqual(f.dispatched,[]);assert.equal(f.gate.memoryReturned,false);
 f.gate.releaseMemory();assert.equal((await memory).ok,true);assert.deepEqual(f.dispatched,['PAIA_MEMORY_STATUS']);assert.equal(f.gate.memoryReturned,true);
 let settled=false;const migration=f.c.chrome.runtime.sendMessage({type:'GET_MIGRATION_STATUS'}).then(()=>settled=true);await tick();assert.deepEqual(f.dispatched,['PAIA_MEMORY_STATUS','GET_MIGRATION_STATUS']);assert.equal(f.gate.migrationHeld,true);assert.equal(settled,false);
 f.gate.releaseMigration();await migration;assert.equal(settled,true);f.gate.restore();assert.equal(f.c.chrome.runtime.sendMessage,f.original);assert.equal(f.listeners.size,0);
});
test('native gate records body-free actual click history and exact Original target without retaining message bodies',async()=>{
 const f=nativeGateFixture();f.c.history.state={paiaReader:{view:'settings',settingsGroup:'content',privateBody:'PRIVATE'},paiaShell:{view:'settings'}};
 f.listeners.get('click')({target:{closest:selector=>selector.includes('data-settings-group')?{}:null}});
 await f.c.chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_ORIGINAL_PAGE',page:{target:{kind:'input',ref:'synthetic-input'},body:'PRIVATE'}});
 assert.equal(f.gate.counts.group,1);assert.equal(f.gate.counts.original,1);assert.equal(f.gate.originalTargetMatches,true);assert.equal(f.gate.read().events[0].route.group,'content');assert.doesNotMatch(JSON.stringify(f.gate.read()),/PRIVATE|synthetic-input/);
 await f.c.chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_ORIGINAL_PAGE',page:{target:{kind:'input',ref:'other'}}});assert.equal(f.gate.originalTargetMatches,false);f.gate.restore();
});
test('native gate cleanup releases held calls and preserves original transport rejection',async()=>{
 const failure=Error('original synthetic transport failure'),f=nativeGateFixture(async message=>{if(message.type==='GET_MIGRATION_STATUS')throw failure;return {ok:true};});
 const memory=f.c.chrome.runtime.sendMessage({type:'PAIA_MEMORY_STATUS'});f.gate.restore();assert.equal((await memory).ok,true);assert.equal(f.c.chrome.runtime.sendMessage,f.original);
 await assert.rejects(f.c.chrome.runtime.sendMessage({type:'GET_MIGRATION_STATUS'}),error=>error===failure);assert.equal(f.dispatched.filter(type=>type==='PAIA_MEMORY_STATUS').length,1);
});
test('native metadata reader uses the existing database readonly and never initializes Memory',async()=>{
 const {s,indexedDB}=await setup(OrganizerStore),c={indexedDB};vm.createContext(c);vm.runInContext(nativeControls,c);
 try{const before=await s.page({view:'settings'}),metadata=await c.readRawSettingsInitializationMetadata();assert.equal(metadata.memoryConfigPresent,false);assert.equal(metadata.generation,before.dataGeneration);assert.equal((await s.page({view:'settings'})).dataGeneration,before.dataGeneration);await new MemoryService(s).status();const after=await c.readRawSettingsInitializationMetadata();assert.equal(after.memoryConfigPresent,true);assert.equal(after.generation,before.dataGeneration+1);assert.deepEqual(Object.keys(after).sort(),['generation','memoryConfigPresent']);}finally{await s.repository.close();}
});
test('native metadata reader refuses absent or disappearing original database without creating a replacement',async()=>{
 const {IDBFactory}=await import('./vendor/fake-indexeddb/build/esm/index.js');const db=new IDBFactory(),c={indexedDB:db};vm.createContext(c);vm.runInContext(nativeControls,c);
 await assert.rejects(c.readRawSettingsInitializationMetadata(),/unavailable/);assert.deepEqual(await db.databases(),[]);
 let aborted=0;const request={transaction:{abort(){aborted++;}}};
 c.indexedDB={databases:async()=>[{name:'paia-archive',version:1}],open:(name,version)=>{assert.equal(name,'paia-archive');assert.equal(version,1);setImmediate(()=>request.onupgradeneeded());return request;}};
 await assert.rejects(c.readRawSettingsInitializationMetadata(),/disappeared/);assert.equal(aborted,1,'an unexpected upgrade is aborted before any store read or initialization');
});
