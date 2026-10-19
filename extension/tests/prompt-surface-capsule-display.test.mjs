import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolveAppearance,resolveLanguage} from '../ui/ux-r1-state.js';

const ui=await readFile(new URL('../ui/prompt-surface.js',import.meta.url),'utf8');
const hostSource=await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8');
const layoutSource=await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8');
const hostTests=await readFile(new URL('./cpv1-09-prompt-surface.test.mjs',import.meta.url),'utf8');
const section=(source,from,to)=>{const start=source.indexOf(from),end=source.indexOf(to,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

// Execute the unchanged original display and measurement functions. The card
// reports zero width exactly as the real R3 capsule's display:none card does.
function privateFixture({capsule=true,appearance='system',language='system',dark=false,send=async()=>({})}={}){
 const calls=[],frames=[],attrs=new Set(),systemAppearance={matches:dark};
 const card={clientWidth:capsule?0:336},list={querySelector:()=>null},status={},header={height:48};
 const document={title:'',documentElement:{lang:'',dataset:{surfaceForm:capsule?'capsule':'board'},setAttribute:k=>attrs.add(k),removeAttribute:k=>attrs.delete(k)},getElementById:()=>card,querySelector:()=>header};
 const context={document,navigator:{language:'en'},resolveAppearance,resolveLanguage,systemAppearance,card,list,status,header,checking:false,checkText:{},editing:false,editor:{},
  getComputedStyle:()=>({fontSize:'14px'}),flowHeight:node=>node===header?header.height:0,restoreListReturn(){},requestAnimationFrame:fn=>frames.push(fn),rpc:async command=>{calls.push(structuredClone(command));return send(command);}};
 vm.createContext(context);
 vm.runInContext('let displayPreferences='+JSON.stringify({appearance,language})+';let language="zh-CN";const copyBindings=new Map();const localize=x=>x;let layoutScheduled=false,layoutPending=false,pointerGesture=false,layoutDirty=false,disposed=false,lastMeasuredHeight=0,lastMinimumHeight=0,lastAppearance=null,lastLanguage=null,layoutTicket=0,pendingListReturn=null;'+
  section(ui,'function applyDisplay(preferences=displayPreferences)','\nfor(const [selector,label,attribute]')+
  section(ui,'function measureLayout()','\n// A live pointer gesture')+
  ';globalThis.owner={applyDisplay,measureLayout,cache:()=>({lastMeasuredHeight,lastMinimumHeight,lastAppearance,lastLanguage}),pending:()=>layoutPending,pointer:value=>{pointerGesture=value;},releasePointer:()=>{pointerGesture=false;if(layoutDirty){layoutDirty=false;scheduleLayout();}},dispose:()=>{disposed=true;}};',context);
 return {owner:context.owner,document,card,header,list,calls,attrs,systemAppearance,async flush(){for(let i=0;i<20;i++){const next=frames.splice(0);for(const fn of next)fn();await settle();if(!frames.length)break;}}};
}

// Reuse the full original host fixture, replacing only its static media double
// with an observable MediaQueryList. Every host runtime function stays original.
async function hostFixture(preferences={appearance:'system',language:'system'}){
 let dark=false,nextNonce=0;const mediaHandlers=new Set(),media={get matches(){return dark;},addEventListener:(_name,fn)=>mediaHandlers.add(fn),removeEventListener:(_name,fn)=>mediaHandlers.delete(fn)};
 let fixture=section(hostTests,'async function hostFixture(','\ntest(\'disposing the host');
 fixture=fixture.replace("matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})","matchMedia:q=>q.includes('prefers-color-scheme')?media:{matches:true,addEventListener(){},removeEventListener(){}}");
 fixture=fixture.replace('randomUUID:()=>nonce','randomUUID:uuid');
 fixture=fixture.replace("await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8')",'layoutSource').replace("await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8')",'hostSource');
 assert.doesNotMatch(fixture,/import\.meta/);
 const create=new Function('assert','vm','media','layoutSource','hostSource','url','nonce','uuid',fixture+'return hostFixture;')(assert,vm,media,layoutSource,hostSource,'https://chatgpt.com/c/synthetic','11111111-1111-4111-8111-111111111111',()=>`11111111-1111-4111-8111-${String(++nextNonce).padStart(12,'0')}`);
 const f=await create({displayPreferences:preferences,animationFrame:fn=>queueMicrotask(fn)}),host=f.nodes.find(n=>n.dataset.paiaPromptSurface==='');
 const message=request=>new Promise(resolve=>f.listeners.get('message')(request,{id:'ext'},resolve));
 return {...f,host,message,async media(value){dark=value;for(const fn of mediaHandlers)fn();await settle();},async probe(){return message({type:'PAIA_PROMPT_SURFACE_PROBE'});},async measure(appearance,language='en'){const current=await this.probe();return message({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce:current.nonce,height:328,minimumHeight:108,appearance,language});}};
}

test('a hidden R3 card still publishes the capsule system appearance and language without measuring hidden geometry',async()=>{
 const f=privateFixture({dark:true});f.owner.applyDisplay();await f.flush();
 assert.equal(f.document.documentElement.dataset.paiaTheme,'dark');assert.equal(f.calls.length,1);
 assert.deepEqual(f.calls[0],{type:'measure',height:328,minimumHeight:108,appearance:'dark',language:'en'});assert.equal(f.owner.pending(),false);
});
test('a system appearance change in an existing capsule reaches the original host through the original measure message',async()=>{
 const host=await hostFixture();host.fire('click');await settle();await host.measure('light');
 const f=privateFixture({send:command=>host.measure(command.appearance,command.language)});f.owner.applyDisplay();await f.flush();assert.equal(host.host.dataset.theme,'light');
 f.systemAppearance.matches=true;f.owner.applyDisplay();await f.flush();assert.equal(f.document.documentElement.dataset.paiaTheme,'dark');assert.equal(host.host.dataset.theme,'dark');
 assert.deepEqual(f.calls.map(x=>x.appearance),['light','dark']);
});
test('a retired frame cannot impose its light appearance or language on the next dark system capsule',async()=>{
 const f=await hostFixture();f.fire('click');await settle();await f.measure('light','zh-CN');const old=await f.probe();
 await f.message({type:'PAIA_PROMPT_SURFACE_FORM',nonce:old.nonce,form:'orb'});await f.media(true);assert.equal(f.host.dataset.theme,'dark');
 f.sandbox.PAIAPromptSurface.offerSuggestion({source:'local',available:true});await settle();assert.equal(f.host.dataset.surfaceForm,'capsule');assert.equal(f.host.dataset.theme,'dark');
 assert.equal(f.orb.getAttribute('aria-label'),'展开常用表达');
});

test('capsule explicit preferences override system changes, retain exact field-only messages and deduplicate unchanged display',async()=>{
 for(const appearance of ['light','dark']){
  const f=privateFixture({appearance,language:'zh-CN',dark:appearance==='light'});f.owner.applyDisplay();await f.flush();
  f.systemAppearance.matches=!f.systemAppearance.matches;f.owner.applyDisplay();await f.flush();assert.equal(f.calls.length,1);assert.equal(f.calls[0].appearance,appearance);assert.equal(f.calls[0].language,'zh-CN');
  assert.deepEqual(Object.keys(f.calls[0]).sort(),['appearance','height','language','minimumHeight','type']);
  f.owner.applyDisplay({appearance,language:'en'});await f.flush();assert.equal(f.calls.length,2);assert.equal(f.calls[1].language,'en');
 }
});
test('a hidden capsule preserves the last visible accessibility envelope and does not touch its hidden rows',async()=>{
 const f=privateFixture({capsule:false});f.header.height=360;f.owner.applyDisplay();await f.flush();assert.deepEqual([f.calls[0].height,f.calls[0].minimumHeight],[420,420]);
 f.card.clientWidth=0;f.document.documentElement.dataset.surfaceForm='capsule';f.list.querySelector=()=>assert.fail('hidden rows must not be measured');
 f.systemAppearance.matches=true;f.owner.applyDisplay();await f.flush();assert.deepEqual([f.calls[1].height,f.calls[1].minimumHeight],[420,420]);assert.equal(f.calls[1].appearance,'dark');
 f.card.clientWidth=336;f.document.documentElement.dataset.surfaceForm='board';f.list.querySelector=()=>null;f.header.height=48;f.owner.measureLayout();await f.flush();assert.deepEqual([f.calls[2].height,f.calls[2].minimumHeight],[328,108]);
});
test('a live pointer defers the capsule display message until the original gesture boundary',async()=>{
 const f=privateFixture({dark:true});f.owner.pointer(true);f.owner.applyDisplay();await f.flush();assert.equal(f.calls.length,0);
 f.owner.releasePointer();await f.flush();assert.equal(f.calls.length,1);assert.equal(f.calls[0].appearance,'dark');
});
test('display changes during an in-flight original measure publish only after its ACK with the latest display',async()=>{
 let release;const held=new Promise(resolve=>release=resolve);const f=privateFixture({send:()=>held});f.owner.applyDisplay();await f.flush();assert.equal(f.owner.pending(),true);assert.equal(f.calls.length,1);
 f.systemAppearance.matches=true;f.owner.applyDisplay();await f.flush();assert.equal(f.calls.length,1);
 release({});await settle();await f.flush();assert.equal(f.calls.length,2);assert.deepEqual(f.calls.map(x=>x.appearance),['light','dark']);assert.equal(f.owner.pending(),false);
});
test('a disposed capsule or an unmeasurable non-capsule never starts a display message',async()=>{
 const f=privateFixture();f.owner.dispose();f.owner.applyDisplay();await f.flush();assert.equal(f.calls.length,0);
 const other=privateFixture();other.document.documentElement.dataset.surfaceForm='board';other.owner.applyDisplay();await other.flush();assert.equal(other.calls.length,0);
});
test('a failed original measure clears both dimensions before a later hidden capsule retries its bounded envelope',async()=>{
 let failed=true;const f=privateFixture({capsule:false,send:async()=>{if(failed)throw Error('original measure unavailable');return {};}});
 f.header.height=360;f.owner.applyDisplay();await f.flush();assert.equal(f.calls[0].height,420);assert.equal(f.owner.cache().lastMeasuredHeight,0);assert.equal(f.owner.cache().lastMinimumHeight,0);
 failed=false;f.card.clientWidth=0;f.document.documentElement.dataset.surfaceForm='capsule';f.systemAppearance.matches=true;f.owner.applyDisplay();await f.flush();
 assert.deepEqual(f.calls[1],{type:'measure',height:328,minimumHeight:108,appearance:'dark',language:'en'});assert.equal(f.owner.pending(),false);
});
test('the original host rejects late retired-nonce and foreign-source display messages without changing the new capsule',async()=>{
 const f=await hostFixture({appearance:'dark',language:'en'});f.fire('click');await settle();await f.measure('light','zh-CN');const old=await f.probe();
 await f.message({type:'PAIA_PROMPT_SURFACE_FORM',nonce:old.nonce,form:'orb'});f.sandbox.PAIAPromptSurface.offerSuggestion({source:'local',available:true});await settle();
 const current=await f.probe();assert.notEqual(current.nonce,old.nonce);assert.equal(f.host.dataset.theme,'dark');assert.equal(f.orb.getAttribute('aria-label'),'Expand frequent expressions');
 const baseline=f.host.getAttribute('style'),writes=f.sent.length;let replies=0;
 const message={type:'PAIA_PROMPT_SURFACE_MEASURE',nonce:old.nonce,height:800,minimumHeight:700,appearance:'light',language:'zh-CN'};
 f.listeners.get('message')(message,{id:'ext'},()=>replies++);f.listeners.get('message')({...message,nonce:current.nonce},{id:'foreign'},()=>replies++);await settle();
 assert.equal(replies,0);assert.equal(f.host.dataset.theme,'dark');assert.equal(f.host.getAttribute('style'),baseline);assert.equal(f.sent.length,writes);assert.equal((await f.probe()).nonce,current.nonce);
});
