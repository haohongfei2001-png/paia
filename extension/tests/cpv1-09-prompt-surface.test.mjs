import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
import {PromptSurfaceCommands,validSurface} from '../background/prompt-surface.js';
const nonce='11111111-1111-4111-8111-111111111111',url='https://chatgpt.com/c/synthetic';
function fixture(){const sent=[],writes=[],calls=[],storage={};let consent=true;const preferences={appearance:'system',language:'system',privateSetting:'DO_NOT_EXPOSE'},reads=[];
 const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,getContexts:async()=>[{documentId:'private-current',tabId:7,windowId:4,frameId:2,documentUrl:'chrome-extension://ext/ui/prompt-surface.html#'+nonce}],sendMessage:async()=>{}},storage:{local:{get:async()=>storage,set:async x=>{writes.push(x);Object.assign(storage,x);}}},tabs:{get:async()=>({id:7,url,windowId:4}),sendMessage:async(...args)=>{sent.push(args);return {open:true,nonce,url,dark:false};}}};
 const commands={service:{s:{status:async()=>({consented:consent}),run:async fn=>fn(),repository:{transaction:async(w,fn,stores)=>{reads.push({w,stores});return fn({});}},control:async()=>({preferences})},members:async()=>[],assertCurrent:async generation=>assert.equal(generation,0)},dispatch:async c=>{calls.push(c);return {items:[],generation:0};}};
 const s=new PromptSurfaceCommands(commands,api),sender={id:'ext',tab:{id:7},frameId:2,documentId:'private-current',documentLifecycle:'active',url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce},request={type:'PAIA_PROMPT_SURFACE_RPC',nonce,command:{type:'PAIA_PROMPT_QUERY'}};
 return {s,api,sender,request,sent,writes,calls,preferences,reads,revoke(){consent=false;}};
}
test('surface frames require exact origin, nonce, current host, positive frame and consent',async()=>{
 const f=fixture();assert.deepEqual(await f.s.handle(f.request,f.sender),{items:[],generation:0,target:{url,documentId:'private-current',nonce},theme:'light',displayPreferences:{appearance:'system',language:'system'},surfaceForm:'board',automaticSuggestion:false});
 for(const sender of [{...f.sender,id:'foreign'},{...f.sender,frameId:0},{...f.sender,frameId:undefined},{...f.sender,url},{...f.sender,tab:{id:7,incognito:true}},{...f.sender,url:f.sender.url+'x'}])await assert.rejects(()=>f.s.handle(f.request,sender));
 f.api.tabs.sendMessage=async()=>({open:true,nonce,url:url+'/changed'});await assert.rejects(()=>f.s.handle(f.request,f.sender));f.revoke();await assert.rejects(()=>f.s.handle(f.request,f.sender),e=>e.code==='CONSENT_REQUIRED');
});
test('host gets only geometry; frame insertion is forcibly bound to its own tab and cannot query arbitrary capabilities',async()=>{
 const f=fixture(),sender={...f.sender,frameId:0,url};assert.deepEqual(await f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST'},sender),{version:1,open:false,position:null,displayPreferences:{appearance:'system',language:'system'}});
 await assert.rejects(()=>f.s.handle(f.request,sender));
 await f.s.handle({...f.request,command:{type:'PAIA_PROMPT_INSERT',id:'p',text:'selected',operationId:nonce}},f.sender);assert.deepEqual(f.calls.at(-1),{type:'PAIA_PROMPT_INSERT',id:'p',text:'selected',operationId:nonce,tabId:7,url});
 for(const command of [{type:'GET_STATE'},{type:'PAIA_PROMPT_TARGETS'},{type:'PAIA_PROMPT_INSERT',tabId:99}])await assert.rejects(()=>f.s.handle({...f.request,command},f.sender));
 assert.ok(f.sent.every(x=>!JSON.stringify(x).includes('selected')),'probe contains no template body');
});
test('position is bounded device-only metadata, with no website or archive body storage',async()=>{
 const f=fixture(),sender={...f.sender,frameId:0,url},state={version:1,open:true,position:{x:.25,y:.5}};
 await f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST',state},sender);assert.equal(f.writes.length,1);
 for(const bad of [{...state,text:'private'},{...state,position:{x:NaN,y:0}},{...state,position:{x:2,y:0}},{...state,version:2}]){assert.equal(!!validSurface(bad),false);await assert.rejects(()=>f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST',state:bad},sender));}
 assert.equal(f.writes.length,1);
});
test('safe geometry clamps orb and card, excludes native composer controls at 320px and expanded scale',async()=>{
 const sandbox={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),sandbox);
 for(const width of [320,640,1280])for(const height of [500,800])for(const position of [null,{x:0,y:0},{x:1,y:1},{x:.5,y:.9}]){
  const form={left:8,right:width-8,top:height-140,bottom:height-10},g=sandbox.PAIAPromptLayout(width,height,form,position);assert.ok(g);for(const box of [g.orb,g.card]){assert.ok(box);assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=width&&box.y+box.h<=height);assert.ok(box.y+box.h<=form.top||box.y>=form.bottom);}assert.equal(g.orb.w,48);assert.equal(g.card.y+g.card.h,form.top-12);assert.equal(g.card.w,Math.min(336,width-32,form.right-(width<=530?0:4)));
 }
});
test('surface publishes only one static extension frame, no host library bridge or new privileged host',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));assert.deepEqual(manifest.web_accessible_resources,[{resources:['ui/prompt-surface.html'],matches:['https://chatgpt.com/*']}]);
 for(const file of ['content/prompt-surface.js','background/prompt-surface.js','ui/prompt-surface.js']){const source=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/postMessage\s*\(|localStorage|sessionStorage|\.submit\s*\(|fetch\s*\(|innerHTML|setInterval\s*\(/,file);}
 const host=await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8');assert.doesNotMatch(host,/PAIA_PROMPT_QUERY|PAIA_PROMPT_COPY_TEXT|PAIA_PROMPT_CHANGE/);assert.match(host,/mode:'closed'/);
});
test('popup diagnostic is consent-only, exact-view authorized and returns bounded metadata',async()=>{
 const f=fixture(),sender={id:'ext',url:f.api.runtime.getURL('ui/popup.html')},r={type:'PAIA_PROMPT_SURFACE_DIAGNOSTIC'};
 f.api.tabs.query=async()=>[{id:7,url}];f.api.tabs.get=async()=>({id:7,url,active:true});f.api.tabs.sendMessage=async()=>({status:'composer_unrecognized',text:'PRIVATE_DRAFT'});
 assert.deepEqual(await f.s.handle(r,sender),{status:'composer_unrecognized'});
 for(const bad of [{...sender,id:'foreign'},{...sender,tab:{id:7}},{...sender,url},{...sender,url:f.api.runtime.getURL('ui/archive.html')}])await assert.rejects(()=>f.s.handle(r,bad));
 await assert.rejects(()=>f.s.handle({...r,tabId:7},sender));
 f.api.tabs.sendMessage=async()=>({status:'PRIVATE_DRAFT'});assert.deepEqual(await f.s.handle(r,sender),{status:'page_unavailable'});
 f.api.tabs.sendMessage=async()=>({status:'visible'});assert.deepEqual(await f.s.handle(r,sender),{status:'visible'});
 f.api.tabs.get=async()=>({id:7,url:url+'/changed',active:true});assert.deepEqual(await f.s.handle(r,sender),{status:'page_unavailable'});
 f.api.tabs.query=async()=>[{id:7,url,incognito:true}];assert.deepEqual(await f.s.handle(r,sender),{status:'not_chatgpt'});
 f.revoke();f.api.tabs.query=async()=>{throw Error('must not inspect tabs without consent');};assert.deepEqual(await f.s.handle(r,sender),{status:'consent_required'});assert.equal(f.writes.length,0);assert.equal(f.calls.length,0);
});

test('open geometry uses one visible anchor, projects the attached card into safe bands and restores without drift',async()=>{
 const sandbox={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),sandbox);
 for(const width of [320,390,1280])for(const height of [500,844,900])for(const position of [null,{x:0,y:0},{x:1,y:1},{x:.5,y:.4}]){
  const form={left:16,right:width-16,top:height-140,bottom:height-16},g=sandbox.PAIAPromptLayout(width,height,form,position,true);assert.ok(g?.card);
  assert.equal(g.orb.x,g.card.x+g.card.w-48);assert.equal(g.orb.y,g.card.y+g.card.h-48);
  for(const r of [g.orb,g.card]){assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=width&&r.y+r.h<=height);assert.ok(r.y+r.h<=form.top||r.y>=form.bottom);}
  const saved={x:g.orb.x/(width-48),y:g.orb.y/(height-48)},restored=sandbox.PAIAPromptLayout(width,height,form,saved,true);assert.equal(restored.orb.x,g.orb.x);assert.equal(restored.orb.y,g.orb.y);assert.deepEqual(restored.card,g.card);
 }
});

test('SPA geometry save binds the initial sender URL to the exact live document, without authorizing stale navigation',async()=>{
 const f=fixture(),sender={id:'ext',tab:{id:7},frameId:0,url:url+'?initial',documentId:'document-synthetic',documentLifecycle:'active'},state={version:1,open:true,position:{x:.4,y:.3}},request={type:'PAIA_PROMPT_SURFACE_HOST',state};
 assert.deepEqual(await f.s.handle(request,sender),state);assert.deepEqual(f.sent.at(-1),[7,{type:'PAIA_PROMPT_SURFACE_PROBE'},{documentId:'document-synthetic'}]);
 for(const bad of [{...sender,documentId:undefined},{...sender,documentLifecycle:'cached'},{...sender,url:'https://other.example/'},{...sender,frameId:2}])await assert.rejects(()=>f.s.handle(request,bad));
 f.api.tabs.sendMessage=async()=>({url:url+'/another'});await assert.rejects(()=>f.s.handle(request,sender));
 f.api.tabs.sendMessage=async()=>{f.api.tabs.get=async()=>({id:7,url:url+'/navigated'});return {url};};await assert.rejects(()=>f.s.handle(request,sender));assert.equal(f.writes.length,1);assert.equal(f.calls.length,0);
});

test('open surface preserves legacy metadata without moving the common composer anchor',async()=>{
 const sandbox={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),sandbox);
 const g=sandbox.PAIAPromptLayout(1280,900,{left:600,right:1264,top:770,bottom:884},{x:400/1236,y:500/856},true);assert.equal(g.orb.x,1212);assert.equal(g.card.y+g.card.h,758);assert.equal(g.orb.y,g.card.y+g.card.h-48);assert.equal(g.card.x+g.card.w,1260);assert.ok(g.card.y+g.card.h<=900);
});

test('saved open anchor remains viewport-bounded when scrolling moves the composer outside the viewport',async()=>{
 const sandbox={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),sandbox);
 for(const width of [320,1280])for(const form of [{left:16,right:width-16,top:940,bottom:1040},{left:16,right:width-16,top:-200,bottom:-20},{left:width+20,right:width+400,top:300,bottom:500},{left:-400,right:-20,top:300,bottom:500}])for(const position of [{x:0,y:0},{x:1,y:1},{x:.5,y:.5}]){
  const g=sandbox.PAIAPromptLayout(width,900,form,position,true);if(form.top<0){assert.equal(g,null);continue;}assert.ok(g);if(form.right<0)assert.equal(g.card,null,'body yields when the fixed circle has no safe left space');else assert.ok(g.card);for(const r of [g.orb,g.card].filter(Boolean))assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=width&&r.y+r.h<=900,JSON.stringify({form,position,g}));
 }
});

async function hostFixture({displayPreferences,animationFrame=f=>f(),composerTop=700}={}){
 const nodes=[],sent=[],listeners=new Map(),windowHandlers=new Map(),documentHandlers=new Map(),timers=new Map(),mountStates=[];let failHost=false,timerId=0,geometryReads=0;
 const rect={x:500,y:composerTop,width:44,height:44,left:500,right:544,top:composerTop,bottom:composerTop+44};
 const element=tag=>{
  const attrs=new Map(),handlers=new Map(),node={tag,dataset:{},style:{},hidden:false,isConnected:false,handlers,
   setAttribute(k,v){attrs.set(k,v);},getAttribute:k=>attrs.get(k),addEventListener(k,v){handlers.set(k,v);},removeEventListener(){},
   append(...children){for(const c of children){if(c.dataset.paiaPromptSurface==='')mountStates.push({hidden:c.hidden,geometryReads});c.isConnected=true;}},attachShadow(){return element('shadow');},remove(){this.isConnected=false;},
   getBoundingClientRect:()=>{if(tag==='form')geometryReads++;return {...rect};},setPointerCapture(id){this.pointerId=id;},hasPointerCapture(id){return this.pointerId===id;},releasePointerCapture(id){assert.equal(this.pointerId,id);this.pointerId=null;this.releases=(this.releases||0)+1;handlers.get('lostpointercapture')?.({pointerId:id});},focus(){this.focused=true;},closest(){return this;}};nodes.push(node);return node;
 };
 const html=element('html');html.classList={contains:()=>false};
 const document={documentElement:html,createElement:element,createElementNS:(_ns,tag)=>element(tag),addEventListener:(k,f)=>documentHandlers.set(k,f),removeEventListener:k=>documentHandlers.delete(k)};
 const sandbox={document,performance:{now:()=>10000},setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),location:{href:url},innerWidth:1280,innerHeight:900,crypto:{randomUUID:()=>nonce},getComputedStyle:()=>({colorScheme:'light'}),
  matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),MutationObserver:class{observe(){}disconnect(){}},
  requestAnimationFrame:animationFrame,PAIAChatGPTComposerAdapter:class{discover(){return {node:element('form'),status:'visible'};}dispose(){}},
  chrome:{runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,onMessage:{addListener:f=>listeners.set('message',f),removeListener(){}},sendMessage:async r=>{sent.push(r);return failHost&&r.type==='PAIA_PROMPT_SURFACE_HOST'?{ok:false,error:'CONSENT_REQUIRED'}:{ok:true,data:{version:1,open:false,position:null,...(displayPreferences?{displayPreferences}:{})}};}}}};
 sandbox.window={addEventListener:(k,f)=>windowHandlers.set(k,f),removeEventListener:k=>windowHandlers.delete(k)};
 vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),sandbox);
 vm.runInNewContext(await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8'),sandbox);await new Promise(setImmediate);
 const orb=nodes.find(n=>n.tag==='button');return {orb,nodes,sent,sandbox,listeners,windowHandlers,documentHandlers,timers,rect,mountStates,get geometryReads(){return geometryReads;},failHost(){failHost=true;},fire(type,fields={}){orb.handlers.get(type)?.({isTrusted:true,button:0,pointerId:1,clientX:522,clientY:122,preventDefault(){},...fields});}};
}

for(const composerTop of [8,700])test('initial host mount stays hidden until held first geometry frame: composer top '+composerTop,async()=>{
 const frames=[],f=await hostFixture({composerTop,animationFrame:fn=>frames.push(fn)}),host=f.nodes.find(n=>n.dataset.paiaPromptSurface==='');
 try{
  assert.equal(host.isConnected,true);assert.equal(frames.length,1);assert.equal(f.geometryReads,0);
  assert.deepEqual(f.mountStates,[{hidden:true,geometryReads:0}],'host is hidden before append, not merely after a later callback');
  assert.equal(host.hidden,true,'unmeasured geometry cannot publish the entry');
  frames.shift()();assert.equal(f.geometryReads,1);assert.equal(host.hidden,composerTop===8,'original geometry alone admits a safe band');
  Object.assign(f.rect,{top:700,y:700,bottom:744});f.windowHandlers.get('resize')();frames.shift()();assert.equal(host.hidden,false,'normal geometry still admits the existing entry');
  Object.assign(f.rect,{top:8,y:8,bottom:52});f.windowHandlers.get('resize')();frames.shift()();assert.equal(host.hidden,true,'later loss of space still withdraws the entry');
  assert.equal(f.nodes.some(n=>n.tag==='iframe'),false);assert.equal(f.orb.focused,undefined);assert.equal(f.sent.some(r=>r.state||r.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'),false,'layout admission does not open, focus, save or close private content');
 }finally{f.sandbox.PAIAPromptSurface.dispose();}
});

test('disposing the host cancels its pending presentation timer and removes composer activity listeners',async()=>{
 const f=await hostFixture(),host=f.nodes.find(n=>n.dataset.paiaPromptSurface==='');
 f.documentHandlers.get('compositionend')();assert.equal(f.timers.size,1);const timer=[...f.timers.values()][0];assert.equal(timer.ms,850);
 f.sandbox.PAIAPromptSurface.dispose();assert.equal(f.timers.size,0);assert.equal(f.documentHandlers.size,0);assert.equal(f.windowHandlers.size,0);assert.equal(host.isConnected,false);
 const calls=f.sent.length,nodes=f.nodes.length;timer.fn();assert.equal(f.sent.length,calls);assert.equal(f.nodes.length,nodes,'a callback already queued before disposal cannot remount a surface');assert.equal(f.timers.size,0);
});

test('open orb requests the private card close policy instead of only focusing or destroying its frame',async()=>{
 const f=await hostFixture();f.fire('click');const frame=f.nodes.find(n=>n.tag==='iframe');assert.equal(frame.isConnected,true);
 f.fire('click');await new Promise(setImmediate);assert.ok(f.sent.some(r=>r.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'&&r.nonce===nonce),'open orb must request the guarded close policy');assert.equal(frame.isConnected,true,'only authenticated close acknowledgement removes the frame');
});

test('orb drag click suppression ends with its gesture and keyboard activation still requests closure',async()=>{
 const f=await hostFixture();f.fire('click');const count=()=>f.sent.filter(r=>r.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE').length;
 f.fire('pointerdown');f.fire('pointermove',{clientX:532});f.fire('pointerup');f.fire('click',{detail:1});assert.equal(count(),0);
 f.fire('pointerdown');f.fire('pointerup');f.fire('click',{detail:1});assert.equal(count(),1,'next pointer click toggles');
 f.fire('pointerdown');f.fire('pointermove',{clientX:532});f.fire('pointercancel');f.fire('click',{detail:0});assert.equal(count(),2,'keyboard click after cancelled drag toggles');
 f.fire('keydown',{key:'Escape',isComposing:true});f.fire('keydown',{key:'Escape',keyCode:229});assert.equal(count(),2);f.fire('keydown',{key:'Escape'});assert.equal(count(),3);
});

test('orb drag temporarily excludes the iframe from hit testing and every terminal path releases capture once',async()=>{
 for(const terminal of ['pointerup','pointercancel','lostpointercapture','blur','reset','close','dispose','authority']){
  const f=await hostFixture();f.fire('click');const frame=f.nodes.find(n=>n.tag==='iframe'),style=()=>frame.getAttribute('style'),writes=()=>f.sent.filter(r=>r.state).length;
  assert.match(style(),/pointer-events:auto/);const before=writes();
  for(const fields of [{isTrusted:false},{button:2},{isPrimary:false}]){f.fire('pointerdown',fields);f.fire('pointermove',{clientX:532});assert.match(style(),/pointer-events:auto/);}
  f.fire('pointerdown');f.fire('pointermove',{clientX:524});assert.match(style(),/pointer-events:auto/,'subthreshold remains an ordinary click');
  f.fire('pointermove',{clientX:532,pointerId:2});assert.match(style(),/pointer-events:auto/,'a different pointer cannot move the owned gesture');
  f.fire('pointermove',{clientX:532});assert.match(style(),/pointer-events:none/);assert.equal(frame.isConnected,true);
  if(terminal==='blur')f.windowHandlers.get('blur')();
  else if(terminal==='reset')f.listeners.get('message')({type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration:1},{id:'ext'},()=>{});
  else if(terminal==='close')f.listeners.get('message')({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce},{id:'ext'},()=>{});
  else if(terminal==='dispose')f.sandbox.PAIAPromptSurface.dispose();
  else if(terminal==='authority'){f.failHost();f.documentHandlers.get('visibilitychange')();await new Promise(setImmediate);}
  else f.fire(terminal);
  assert.equal(f.orb.pointerId,null,terminal+' releases the original capture');assert.equal(f.orb.releases,1,terminal+' releases exactly once');
  if(!['close','dispose','authority'].includes(terminal)){assert.match(style(),/pointer-events:auto/,terminal+' restores hit testing');assert.equal(frame.isConnected,true);}
  const after=writes();assert.equal(after-before,['pointerup','pointercancel','lostpointercapture','blur','close'].includes(terminal)?1:0,terminal+' uses the existing persistence boundary');
  f.fire('pointerup');f.fire('lostpointercapture');f.windowHandlers.get('blur')?.();assert.equal(writes(),after,'repeated terminal events cannot save again');assert.equal(f.orb.releases,1);
 }
});

test('host close request is nonce-only and bound to the exact active top document, consent and live card',async()=>{
 const f=fixture(),broadcast=[];f.api.runtime.sendMessage=async r=>broadcast.push(r);
 const sender={id:'ext',tab:{id:7},frameId:0,url,documentId:'live-document',documentLifecycle:'active'},request={type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce};
 assert.deepEqual(await f.s.handle(request,sender),{});assert.deepEqual(broadcast,[request]);assert.equal(f.writes.length,0);assert.equal(f.calls.length,0);assert.deepEqual(f.sent.at(-1),[7,{type:'PAIA_PROMPT_SURFACE_PROBE'},{documentId:'live-document'}]);
 for(const bad of [{...sender,id:'foreign'},{...sender,frameId:1},{...sender,documentId:undefined},{...sender,documentLifecycle:'cached'},{...sender,tab:{id:7,incognito:true}},{...sender,url:'https://foreign.example/'}])await assert.rejects(()=>f.s.handle(request,bad));
 for(const bad of [{...request,nonce:'invalid'},{...request,text:'private'},{...request,state:{open:false}}])await assert.rejects(()=>f.s.handle(bad,sender));
 for(const response of [{open:false,nonce,url},{open:true,nonce:'22222222-2222-4222-8222-222222222222',url},{open:true,nonce,url:url+'/changed'}]){f.api.tabs.sendMessage=async()=>response;await assert.rejects(()=>f.s.handle(request,sender));}
 assert.equal(broadcast.length,1);f.revoke();await assert.rejects(()=>f.s.handle(request,sender),e=>e.code==='CONSENT_REQUIRED');
});

test('host close request rejects navigation or consent changes during its live probe; SPA uses the live document',async()=>{
 for(const reason of ['navigation','consent']){const f=fixture();let broadcast=0;f.api.runtime.sendMessage=async()=>broadcast++;
  f.api.tabs.sendMessage=async()=>{if(reason==='navigation')f.api.tabs.get=async()=>({id:7,url:url+'/new'});else f.revoke();return {open:true,nonce,url};};
  await assert.rejects(()=>f.s.handle({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce},{id:'ext',tab:{id:7},frameId:0,url,documentId:'live-document'}));assert.equal(broadcast,0);
 }
 const f=fixture();await f.s.handle({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce},{id:'ext',tab:{id:7},frameId:0,url:url+'?initial',documentId:'live-document'});assert.equal(f.calls.length,0);
});

test('approved double-card presentation uses one persistent circle and accessible owner',async()=>{
 const f=await hostFixture(),style=f.nodes.find(n=>n.tag==='style').textContent;
 assert.equal(f.orb.getAttribute('aria-label'),'展开常用表达');
 assert.equal(f.orb.getAttribute('aria-expanded'),'false');
 assert.match(style,/width:48px;height:48px/);assert.match(style,/border-radius:50%/);
 assert.doesNotMatch(style,/backdrop-filter|radial-gradient|linear-gradient/);
 for(const color of ['657999','a4b8d8','fff','2b2c30','dce0e7','454850'])assert.ok(style.includes('#'+color));
 assert.equal(f.nodes.filter(n=>n.tag==='rect').length,2);assert.doesNotMatch(style,/transition-delay:650ms|\.hint/);
 assert.doesNotMatch(style,/inset:-3px|width:14px;height:10px|\.reflection|#fffffffa|#c8dcfff0/);
 assert.equal(f.nodes.some(n=>n.className==='reflection'),false);
 assert.match(style,/button:focus-visible\{outline:2px solid/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(style,/url\((?!#paia-card-)|animation:.*infinite/);
});

 test('authenticated measure is geometry-only, bounded, exact-shaped and nonce-bound',async()=>{
 const f=fixture(),send=command=>f.s.handle({...f.request,command},f.sender);
 for(const command of [{type:'measure',height:134},{type:'measure',height:4096,minimumHeight:1024},{type:'measure',height:200,appearance:'light'},{type:'measure',height:200,minimumHeight:134,appearance:'dark',language:'en'}]){assert.deepEqual(await send(command),{});assert.deepEqual(f.sent.at(-1),[7,{type:'PAIA_PROMPT_SURFACE_MEASURE',nonce,height:command.height,...('minimumHeight'in command?{minimumHeight:command.minimumHeight}:{}),...('appearance'in command?{appearance:command.appearance}:{}),...('language'in command?{language:command.language}:{})},{frameId:0}]);}
 for(const command of [{type:'unknown',height:134},{type:'measure'},{type:'measure',height:0},{type:'measure',height:4097},{type:'measure',height:1.2},{type:'measure',height:NaN},{type:'measure',height:undefined},{type:'measure',height:null},{type:'measure',height:134,body:'private'},...[undefined,null,'system','EN','zh',1,{},['en']].map(language=>({type:'measure',height:134,language})),...[undefined,null,'system','DARK',1,{},['dark']].map(appearance=>({type:'measure',height:134,appearance})),...[undefined,null,NaN,43,1025,135,44.5].map(minimumHeight=>({type:'measure',height:134,minimumHeight}))])await assert.rejects(()=>send(command),e=>e.code==='FORBIDDEN');
 for(const sender of [{...f.sender,id:'foreign'},{...f.sender,frameId:0},{...f.sender,url:f.sender.url+'x'}])await assert.rejects(()=>f.s.handle({...f.request,command:{type:'measure',height:134}},sender));
 await assert.rejects(()=>f.s.handle({...f.request,nonce:'22222222-2222-4222-8222-222222222222',command:{type:'measure',height:134}},f.sender));assert.equal(f.writes.length,0);assert.equal(f.calls.length,0);
 });
 test('host measurement accepts only current private nonce and preserves the frame',async()=>{
 const f=await hostFixture();f.fire('click');const frame=f.nodes.find(n=>n.tag==='iframe'),calls=[];const layout=f.sandbox.PAIAPromptLayout;f.sandbox.PAIAPromptLayout=(...args)=>{calls.push(args[5]);return layout(...args);};
 const receive=(r,s={id:'ext'})=>f.listeners.get('message')(r,s,()=>{});
 receive({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce:'stale',height:200});receive({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce,height:200},{id:'foreign'});receive({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce,height:200},{id:'ext',tab:{id:7}});assert.equal(calls.length,0);
 receive({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce,height:200,appearance:'system'});assert.equal(calls.length,0);receive({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce:'stale',height:200,appearance:'dark'});assert.equal(calls.length,0);
 receive({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce,height:200,minimumHeight:150,appearance:'dark',language:'en'});assert.equal(f.orb.getAttribute('aria-label'),'Collapse frequent expressions');assert.equal(frame.getAttribute('aria-label'),'PAIA Frequent inputs');assert.equal(f.nodes.find(n=>n.dataset.paiaPromptSurface!==undefined).dataset.theme,'dark');assert.equal(calls.at(-1).contentHeight,200);assert.equal(calls.at(-1).minimumHeight,150);assert.equal(frame.isConnected,true);assert.equal(f.nodes.filter(n=>n.tag==='iframe').length,1);
 });

test('measure acknowledgements follow layout and cannot authorize a superseded nonce or generation',async()=>{
 const f=await hostFixture();f.fire('click');const frames=[],replies=[];f.sandbox.requestAnimationFrame=fn=>frames.push(fn);
 const receive=(height,nonceValue=nonce)=>f.listeners.get('message')({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce:nonceValue,height,minimumHeight:134},{id:'ext'},reply=>replies.push({...reply}));
 receive(180,'22222222-2222-4222-8222-222222222222');assert.equal(frames.length,0);receive(180);receive(220);assert.equal(replies.length,0);frames.shift()();assert.deepEqual(replies,[{measured:false}]);frames.shift()();assert.equal(replies.length,1);frames.shift()();assert.deepEqual(replies,[{measured:false},{measured:true}]);assert.equal(f.nodes.filter(n=>n.tag==='iframe').length,1);
});

test('surface exposes only normalized display preferences through the original read-only meta owner',async()=>{
 const f=fixture();Object.assign(f.preferences,{appearance:'dark',language:'en'});
 assert.deepEqual(await f.s.handle(f.request,f.sender),{items:[],generation:0,target:{url,documentId:'private-current',nonce},theme:'light',displayPreferences:{appearance:'dark',language:'en'},surfaceForm:'board',automaticSuggestion:false});
 assert.deepEqual(f.reads,[{w:false,stores:['meta']}]);assert.equal(f.writes.length,0);
 Object.assign(f.preferences,{appearance:'not-a-theme',language:'private-value'});
 assert.deepEqual((await f.s.handle(f.request,f.sender)).displayPreferences,{appearance:'system',language:'system'});
 assert.equal(f.writes.length,0);assert.ok(!JSON.stringify(f.sent).includes('DO_NOT_EXPOSE'));
});

test('private query exposes only a strict automatic-presentation boolean and never host suggestion bodies',async()=>{
 for(const [automaticSuggestion,expected] of [[undefined,false],[null,false],[false,false],[true,true],[0,false],[1,false],['true',false],[{text:'PRIVATE_SUGGESTION_BODY'},false]]){
  const f=fixture();f.api.tabs.sendMessage=async(...args)=>{f.sent.push(args);return {open:true,nonce,url,dark:false,automaticSuggestion,text:'PRIVATE_SUGGESTION_BODY',suggestion:{text:'PRIVATE_SUGGESTION_BODY'}};};
  const result=await f.s.handle(f.request,f.sender);
  assert.deepEqual(result,{items:[],generation:0,target:{url,documentId:'private-current',nonce},theme:'light',displayPreferences:{appearance:'system',language:'system'},surfaceForm:'board',automaticSuggestion:expected});
  assert.equal(typeof result.automaticSuggestion,'boolean');assert.ok(!JSON.stringify(result).includes('PRIVATE_SUGGESTION_BODY'));
  assert.ok(f.sent.length>0);for(const [tabId,message,target]of f.sent){assert.equal(tabId,7);assert.deepEqual(message,{type:'PAIA_PROMPT_SURFACE_PROBE'});assert.deepEqual(target,{frameId:0});}
  assert.equal(f.writes.length,0);assert.ok(!JSON.stringify(f.sent).includes('DO_NOT_EXPOSE'));
 }
});

test('first collapsed host reads only display choices and cannot persist them as geometry',async()=>{
 const f=fixture();Object.assign(f.preferences,{appearance:'light',language:'en'});const sender={...f.sender,frameId:0,url};
 assert.deepEqual(await f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST'},sender),{version:1,open:false,position:null,displayPreferences:{appearance:'light',language:'en'}});
 assert.deepEqual(f.reads,[{w:false,stores:['meta']}]);assert.equal(f.writes.length,0);
 await assert.rejects(()=>f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST',state:{version:1,open:false,position:null,displayPreferences:{appearance:'dark',language:'zh-CN'}}},sender));assert.equal(f.writes.length,0);
});

test('display-only activation never reinitializes an open private editor; consent activation retains its guard',async()=>{
 const f=await hostFixture();f.fire('click');const frame=f.nodes.find(n=>n.tag==='iframe'),before=f.sent.length;
 f.sandbox.chrome.runtime.sendMessage=async r=>{f.sent.push(r);return {ok:false,error:'STORAGE_FAILED'};};
 f.listeners.get('message')({type:'PAIA_PROMPT_SURFACE_ACTIVATE',reason:'display-preferences'},{id:'ext'},()=>{});await new Promise(setImmediate);
 assert.equal(f.sent.length,before);assert.equal(frame.isConnected,true);
 f.listeners.get('message')({type:'PAIA_PROMPT_SURFACE_ACTIVATE'},{id:'ext'},()=>{});await new Promise(setImmediate);
 assert.equal(frame.isConnected,false,'original authority activation still revokes unavailable context');
 const reads=f.sent.length;f.listeners.get('message')({type:'PAIA_PROMPT_SURFACE_ACTIVATE',reason:'display-preferences'},{id:'ext'},()=>{});await new Promise(setImmediate);
 assert.equal(f.sent.length,reads+1,'collapsed display refresh uses the read-only original HOST');
});


test('initial connected orb already has the saved accessible language and theme before its first animation frame',async()=>{
 const pending=[],f=await hostFixture({displayPreferences:{appearance:'dark',language:'en'},animationFrame:callback=>pending.push(callback)}),host=f.nodes.find(node=>node.dataset.paiaPromptSurface==='');
 assert.equal(host.isConnected,true);assert.ok(pending.length>0);assert.equal(f.orb.getAttribute('aria-label'),'Expand frequent expressions');assert.equal(host.dataset.theme,'dark');
 while(pending.length)pending.shift()();assert.equal(f.orb.getAttribute('aria-label'),'Expand frequent expressions');assert.equal(host.dataset.theme,'dark');assert.equal(f.nodes.some(node=>node.tag==='iframe'),false);assert.equal(f.sent.some(request=>request.state),false);
});

test('only an authenticated private frame selects a strict device-local collapsed form',async()=>{
 const f=fixture(),send=form=>f.s.handle({...f.request,command:{type:'surface_form',form}},f.sender);
 assert.equal(validSurface({version:1,open:false,position:null}),true);
 for(const collapsedForm of ['orb','capsule'])assert.equal(validSurface({version:1,open:false,position:null,collapsedForm}),true);
 for(const collapsedForm of [null,'board','sidebar',{},1])assert.equal(validSurface({version:1,open:false,position:null,collapsedForm}),false);
 await send('capsule');const saved=(await f.s.readGeometry());assert.equal(saved.collapsedForm,'capsule');assert.equal('text' in saved,false);
 await f.s.hostGeometry({version:1,open:true,position:{x:.1,y:.2}});assert.equal((await f.s.readGeometry()).collapsedForm,'capsule','late legacy geometry cannot erase selected form');
 await send('board');assert.equal((await f.s.readGeometry()).collapsedForm,'capsule','expanding preserves the selected collapsed form');
 for(const form of ['sidebar','',null,{}])await assert.rejects(send(form),{code:'FORBIDDEN'});
 await assert.rejects(f.s.handle({...f.request,command:{type:'surface_form',form:'orb'}},{...f.sender,frameId:0}),{code:'FORBIDDEN'});
});

test('private close relays only the original nonce-bound host form, never a child-selected or stale form',async()=>{
 for(const form of ['orb','capsule']){
  const f=fixture();f.api.tabs.sendMessage=async(...args)=>{f.sent.push(args);return args[1].type==='PAIA_PROMPT_SURFACE_PROBE'?{open:true,nonce,url}:{closed:true,nonce,form};};
  assert.deepEqual(await f.s.handle({...f.request,command:{type:'close'}},f.sender),{closed:true,nonce,form});
  assert.deepEqual(f.sent.at(-1),[7,{type:'PAIA_PROMPT_SURFACE_CLOSE',nonce},{frameId:0}]);assert.equal(f.calls.length,0);assert.equal(f.writes.length,0);
  await assert.rejects(()=>f.s.handle({...f.request,command:{type:'close',form:'capsule'}},f.sender),e=>e.code==='FORBIDDEN');
 }
 for(const ack of [undefined,null,{}, {closed:true},{closed:false,nonce,form:'capsule'},{closed:true,nonce:'stale',form:'capsule'},{closed:true,nonce,form:'board'},{closed:true,nonce,form:'capsule',body:'unrelated'}]){
  const f=fixture();f.api.tabs.sendMessage=async(_tab,message)=>message.type==='PAIA_PROMPT_SURFACE_PROBE'?{open:true,nonce,url}:ack;
  await assert.rejects(()=>f.s.handle({...f.request,command:{type:'close'}},f.sender),e=>e.code==='FORBIDDEN');assert.equal(f.calls.length,0);assert.equal(f.writes.length,0);
 }
});
