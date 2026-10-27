import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveNavigator,navigatorScopeKey} from '../ui/archive-navigator.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

// Original navigator component and message boundary, with a small non-layout DOM.
// This is not browser, storage, visual or whole-Archive acceptance.
class Node extends PresentationNode {
 querySelectorAll(selector){
  const match=node=>selector.startsWith('.')?node.classList.contains(selector.slice(1)):selector.startsWith('[data-ans-nav-key=')?node.dataset.ansNavKey===selector.slice(19,-2):false;
  const found=[];for(const child of this.children){if(match(child))found.push(child);found.push(...child.querySelectorAll?.(selector)||[]);}return found;
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 fire(type){return this.listeners.get(type)?.({preventDefault(){}});}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};};
const provider={providerKey:'chatgpt'},group={providerKey:'chatgpt',groupKind:'unassigned'};
const windowRow=id=>({...group,documentId:id,title:'SYNTHETIC '+id});
const page=(items=[],nextCursor=null,extra={})=>({coverage:{state:'complete'},generation:'synthetic-generation',items,nextCursor,...extra});
async function fixture(run){
 const names=['document','window','chrome','matchMedia','CSS','CustomEvent','setTimeout','clearTimeout'],previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)])),timers=[],calls=[];
 const body=new Node('body'),document={body,activeElement:null,documentElement:{lang:'en'},createElement:tag=>new Node(tag),createElementNS:(_ns,tag)=>new Node(tag),createTextNode:text=>{const node=new Node('#text');node.textContent=text;return node;},getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},dispatchEvent(){}};
 let handler=async message=>message.page.groupKind==='providers'?page([provider]):message.page.groupKind==='groups'?page([group]):page([windowRow('one')]);
 const globals={document,window:{addEventListener(){}},chrome:{runtime:{sendMessage:async message=>{if(message.type==='PAIA_ARCHIVE_ORDER_PREFERENCE')return {ok:true,data:{mode:'paia'}};assert.equal(message.type,'PAIA_ARCHIVE_NAV_PAGE');calls.push(message);return {ok:true,data:await handler(message)};}}},matchMedia:()=>({matches:false,addEventListener(){}}),CSS:{escape:value=>value},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},setTimeout:(fn,delay)=>{const timer={fn,delay,cleared:false};timers.push(timer);return timer;},clearTimeout:timer=>{if(timer)timer.cleared=true;}};
 for(const [name,value]of Object.entries(globals))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 try{
  const nav=new ArchiveNavigator();body.append(nav.host);nav.active=true;nav.reader=true;nav.selectedDocumentId='reader-kept';nav.sourceScope=nav.browseSource='chatgpt';await tick();
  const seed=(options,items,nextCursor=null)=>Object.assign(nav.state.scope(options),page(items,nextCursor));
  const seedTree=()=>{seed({groupKind:'providers'},[provider]);seed({providerKey:'chatgpt',groupKind:'groups'},[group]);nav.state.expanded.add(JSON.stringify(['chatgpt','unassigned',null]));};
  await run({nav,calls,timers,seed,seedTree,setHandler:value=>handler=value,fail:()=>{throw Object.assign(Error('Synthetic read failure'),{code:'STORAGE_FAILED'});},retry:()=>nav.tree.querySelector('.archive-navigator-retry'),rows:()=>nav.tree.querySelectorAll('.archive-navigator-window')});
 }finally{for(const [name,value]of previous)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}
}

test('failed provider read waits for visible explicit Retry instead of a 40ms retry loop',()=>fixture(async f=>{
 f.setHandler(f.fail);await f.nav.refresh();
 assert.equal(f.calls.length,1);assert.equal(f.timers.filter(timer=>timer.delay===40&&!timer.cleared).length,0);
 assert.match(f.nav.tree.textContent,/unavailable/i);assert.doesNotMatch(f.nav.status.textContent,/Building|Preparing/);
 const retry=f.retry();assert.ok(retry);f.setHandler(async message=>message.page.groupKind==='providers'?page([provider]):page([]));retry.fire('click');await tick();
 assert.equal(f.calls.filter(call=>call.page.groupKind==='providers').length,2);assert.equal(f.nav.state.scope({groupKind:'providers'}).error,null);assert.equal(f.nav.selectedDocumentId,'reader-kept');assert.equal(f.retry(),null);
}));

test('failed source-group read is not indexing or empty and only explicit retry reloads its scope',()=>fixture(async f=>{
 f.seed({groupKind:'providers'},[provider]);f.setHandler(f.fail);await f.nav.refresh();
 assert.equal(f.calls.length,1);assert.match(f.nav.tree.textContent,/unavailable/i);assert.doesNotMatch(f.nav.tree.textContent,/Loading|No archive windows/);assert.equal(f.timers.filter(timer=>timer.delay===40).length,0);
 const retry=f.retry();assert.ok(retry);f.setHandler(async()=>page([group]));retry.fire('click');await tick();
 assert.deepEqual(f.calls.map(call=>call.page.groupKind),['groups','groups']);assert.equal(f.retry(),null);assert.match(f.nav.tree.textContent,/Not assigned to a Project/);
}));

test('failed continuation preserves confirmed rows and cursor; repeated Retry appends once',()=>fixture(async f=>{
 f.seedTree();const cursor={synthetic:'exact-next'},scope=f.seed(group,[windowRow('one')],cursor);f.nav.paint();f.setHandler(f.fail);await f.nav.more(group);
 assert.deepEqual(f.rows().map(node=>node.dataset.documentId),['one']);assert.equal(scope.nextCursor,cursor);assert.match(f.nav.tree.textContent,/unavailable/i);assert.ok(f.retry());
 const held=deferred();f.setHandler(()=>held.promise);const retry=f.retry();retry.fire('click');retry.fire('click');await tick();assert.equal(f.calls.length,2);assert.deepEqual(f.calls[1].page.cursor,cursor);assert.deepEqual(f.rows().map(node=>node.dataset.documentId),['one']);
 held.resolve(page([windowRow('two')]));await tick();assert.deepEqual(f.rows().map(node=>node.dataset.documentId),['one','two']);assert.equal(scope.nextCursor,null);assert.equal(f.nav.selectedDocumentId,'reader-kept');assert.equal(f.retry(),null);
}));

test('failed restore-depth continuation stops without dropping its original depth obligation',()=>fixture(async f=>{
 f.seedTree();const scope=f.seed(group,[windowRow('one')],{synthetic:'next'});f.nav.restoreDepth.set(scope.key,3);const overflow=deferred();let count=0;
 f.setHandler(()=>{count++;if(count===1)return f.fail();return overflow.promise;});const refreshing=f.nav.refresh();await tick();
 try{assert.equal(f.calls.length,1);await refreshing;assert.equal(f.nav.restoreDepth.get(scope.key),3);assert.deepEqual(f.rows().map(node=>node.dataset.documentId),['one']);
  f.setHandler(async message=>message.page.cursor.synthetic==='next'?page([windowRow('two')],{synthetic:'third'}):page([windowRow('three')]));f.retry().fire('click');await tick();assert.deepEqual(f.rows().map(node=>node.dataset.documentId),['one','two','three']);assert.equal(f.nav.restoreDepth.has(scope.key),false);
 }finally{f.nav.serial++;overflow.resolve(page([]));await refreshing;}
}));

test('genuine index-building continuation still schedules and completes normally',()=>fixture(async f=>{
 let count=0;f.setHandler(async message=>message.page.groupKind==='providers'&&count++===0?page([],{synthetic:'building'},{coverage:{state:'building'}}):message.page.groupKind==='providers'?page([provider]):page([]));await f.nav.refresh();
 assert.equal(f.retry(),null);assert.match(f.nav.status.textContent,/Building/);const timer=f.timers.find(timer=>timer.delay===40);assert.ok(timer);timer.fn();await tick();assert.equal(f.nav.state.scope({groupKind:'providers'}).coverage.state,'complete');assert.equal(f.calls.filter(call=>call.page.groupKind==='providers').length,2);
}));

for(const departure of ['replaced-scope','inactive'])test('old Retry and held result cannot affect current Reader after '+departure,()=>fixture(async f=>{
 f.seedTree();const old=f.seed(group,[windowRow('one')],{synthetic:'old-next'});f.setHandler(f.fail);await f.nav.more(group);const retry=f.retry();assert.ok(retry);const held=deferred();f.setHandler(()=>held.promise);retry.fire('click');await tick();
 if(departure==='replaced-scope'){f.nav.state.resetScopes();f.seedTree();f.seed(group,[windowRow('new-scope')]);f.nav.paint();}else f.nav.active=false;
 f.nav.selectedDocumentId='new-reader';retry.fire('click');assert.equal(f.calls.length,2);held.resolve(page([windowRow('old-result')],null,{selectedPath:{available:true,documentId:'new-reader',...group}}));await tick();
 assert.equal(f.nav.selectedDocumentId,'new-reader');assert.equal(f.nav.state.selectedPath,null);assert.deepEqual(old.items.map(row=>row.documentId),['one']);if(departure==='replaced-scope')assert.deepEqual(f.rows().map(node=>node.dataset.documentId),['new-scope']);assert.equal(f.calls.length,2);
}));
