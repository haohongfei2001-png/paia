import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
import {PromptSurfaceCommands,validSurface} from '../background/prompt-surface.js';
const nonce='11111111-1111-4111-8111-111111111111',url='https://chatgpt.com/c/synthetic';
function fixture(){const sent=[],writes=[],calls=[],storage={};let consent=true;
 const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,sendMessage:async()=>{}},storage:{local:{get:async()=>storage,set:async x=>{writes.push(x);Object.assign(storage,x);}}},tabs:{get:async()=>({id:7,url}),sendMessage:async(...args)=>{sent.push(args);return {open:true,nonce,url,dark:false};}}};
 const commands={service:{s:{status:async()=>({consented:consent})},members:async()=>[]},dispatch:async c=>{calls.push(c);return {items:[]};}};
 const s=new PromptSurfaceCommands(commands,api),sender={id:'ext',tab:{id:7},frameId:2,url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce},request={type:'PAIA_PROMPT_SURFACE_RPC',nonce,command:{type:'PAIA_PROMPT_QUERY'}};
 return {s,api,sender,request,sent,writes,calls,revoke(){consent=false;}};
}
test('surface frames require exact origin, nonce, current host, positive frame and consent',async()=>{
 const f=fixture();assert.deepEqual(await f.s.handle(f.request,f.sender),{items:[],theme:'light'});
 for(const sender of [{...f.sender,id:'foreign'},{...f.sender,frameId:0},{...f.sender,frameId:undefined},{...f.sender,url},{...f.sender,tab:{id:7,incognito:true}},{...f.sender,url:f.sender.url+'x'}])await assert.rejects(()=>f.s.handle(f.request,sender));
 f.api.tabs.sendMessage=async()=>({open:true,nonce,url:url+'/changed'});await assert.rejects(()=>f.s.handle(f.request,f.sender));f.revoke();await assert.rejects(()=>f.s.handle(f.request,f.sender),e=>e.code==='CONSENT_REQUIRED');
});
test('host gets only geometry; frame insertion is forcibly bound to its own tab and cannot query arbitrary capabilities',async()=>{
 const f=fixture(),sender={...f.sender,frameId:0,url};assert.deepEqual(await f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST'},sender),{version:1,open:false,position:null});
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
  const form={left:8,right:width-8,top:height-140,bottom:height-10},g=sandbox.PAIAPromptLayout(width,height,form,position);assert.ok(g);for(const box of [g.orb,g.card]){assert.ok(box);assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=width&&box.y+box.h<=height);assert.ok(box.y+box.h<=form.top||box.y>=form.bottom);}const attached={x:g.card.x+g.card.w-40,y:g.card.y-32,w:44,h:44};assert.ok(attached.y>=0&&attached.y+attached.h<=height);assert.ok(attached.y+attached.h<=form.top||attached.y>=form.bottom);assert.equal(g.orb.w,44);assert.ok(g.card.y+g.card.h<=g.orb.y||g.card.y>=g.orb.y+44);
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
  assert.equal(g.orb.x,g.card.x+g.card.w-40);assert.equal(g.orb.y,g.card.y-32);
  for(const r of [g.orb,g.card]){assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=width&&r.y+r.h<=height);assert.ok(r.y+r.h<=form.top||r.y>=form.bottom);}
  const saved={x:g.orb.x/(width-44),y:g.orb.y/(height-44)},restored=sandbox.PAIAPromptLayout(width,height,form,saved,true);assert.equal(restored.orb.x,g.orb.x);assert.equal(restored.orb.y,g.orb.y);assert.deepEqual(restored.card,g.card);
 }
});

test('SPA geometry save binds the initial sender URL to the exact live document, without authorizing stale navigation',async()=>{
 const f=fixture(),sender={id:'ext',tab:{id:7},frameId:0,url:url+'?initial',documentId:'document-synthetic',documentLifecycle:'active'},state={version:1,open:true,position:{x:.4,y:.3}},request={type:'PAIA_PROMPT_SURFACE_HOST',state};
 assert.deepEqual(await f.s.handle(request,sender),state);assert.deepEqual(f.sent.at(-1),[7,{type:'PAIA_PROMPT_SURFACE_PROBE'},{documentId:'document-synthetic'}]);
 for(const bad of [{...sender,documentId:undefined},{...sender,documentLifecycle:'cached'},{...sender,url:'https://other.example/'},{...sender,frameId:2}])await assert.rejects(()=>f.s.handle(request,bad));
 f.api.tabs.sendMessage=async()=>({url:url+'/another'});await assert.rejects(()=>f.s.handle(request,sender));
 f.api.tabs.sendMessage=async()=>{f.api.tabs.get=async()=>({id:7,url:url+'/navigated'});return {url};};await assert.rejects(()=>f.s.handle(request,sender));assert.equal(f.writes.length,1);assert.equal(f.calls.length,0);
});

test('open surface can move alongside a narrow composer instead of snapping to a vertical band',async()=>{
 const sandbox={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),sandbox);
 const g=sandbox.PAIAPromptLayout(1280,900,{left:600,right:1264,top:770,bottom:884},{x:400/1236,y:500/856},true);assert.equal(g.orb.x,400);assert.equal(g.orb.y,500);assert.ok(g.card.x+g.card.w<600);assert.ok(g.card.y+g.card.h<=900);
});

test('saved open anchor remains viewport-bounded when scrolling moves the composer outside the viewport',async()=>{
 const sandbox={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),sandbox);
 for(const width of [320,1280])for(const form of [{left:16,right:width-16,top:940,bottom:1040},{left:16,right:width-16,top:-200,bottom:-20},{left:width+20,right:width+400,top:300,bottom:500},{left:-400,right:-20,top:300,bottom:500}])for(const position of [{x:0,y:0},{x:1,y:1},{x:.5,y:.5}]){
  const g=sandbox.PAIAPromptLayout(width,900,form,position,true);assert.ok(g?.card);for(const r of [g.orb,g.card])assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=width&&r.y+r.h<=900,JSON.stringify({form,position,g}));
 }
});

async function hostFixture(){
 const nodes=[],sent=[],listeners=new Map();
 const rect={x:500,y:100,width:44,height:44,left:500,right:544,top:100,bottom:144};
 const element=tag=>{
  const attrs=new Map(),handlers=new Map(),node={tag,dataset:{},style:{},hidden:false,isConnected:false,handlers,
   setAttribute(k,v){attrs.set(k,v);},getAttribute:k=>attrs.get(k),addEventListener(k,v){handlers.set(k,v);},removeEventListener(){},
   append(...children){for(const c of children)c.isConnected=true;},attachShadow(){return element('shadow');},remove(){this.isConnected=false;},
   getBoundingClientRect:()=>({...rect}),setPointerCapture(){},focus(){this.focused=true;},closest(){return this;}};nodes.push(node);return node;
 };
 const html=element('html');html.classList={contains:()=>false};
 const document={documentElement:html,createElement:element,addEventListener(){},removeEventListener(){}};
 const sandbox={document,location:{href:url},innerWidth:1280,innerHeight:900,crypto:{randomUUID:()=>nonce},getComputedStyle:()=>({colorScheme:'light'}),
  matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),MutationObserver:class{observe(){}disconnect(){}},
  requestAnimationFrame:f=>{f();},PAIAChatGPTComposerAdapter:class{discover(){return {node:element('form'),status:'visible'};}dispose(){}},
  PAIAPromptLayout:()=>({orb:{x:500,y:100,w:44,h:44},card:{x:204,y:132,w:336,h:350}}),
  chrome:{runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,onMessage:{addListener:f=>listeners.set('message',f),removeListener(){}},sendMessage:async r=>{sent.push(r);return {ok:true,data:{version:1,open:false,position:null}};}}}};
 sandbox.window={addEventListener(){},removeEventListener(){}};
 vm.runInNewContext(await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8'),sandbox);await new Promise(setImmediate);
 const orb=nodes.find(n=>n.tag==='button');return {orb,nodes,sent,sandbox,listeners,fire(type,fields={}){orb.handlers.get(type)?.({isTrusted:true,button:0,pointerId:1,clientX:522,clientY:122,preventDefault(){},...fields});}};
}

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
