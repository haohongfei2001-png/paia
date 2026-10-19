import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [hostSource,layoutSource,uiSource,css,html,tokenSource]=await Promise.all(['content/prompt-surface.js','core/prompt-surface-layout.js','ui/prompt-surface.js','ui/prompt-surface.css','ui/prompt-surface.html','docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18/tokens-r1.json'].map(read));
const tokens=JSON.parse(tokenSource),nonce='11111111-1111-4111-8111-111111111111',tick=()=>new Promise(setImmediate);

// Production host + production layout in a small DOM. This proves wiring and
// state ownership, not native paint, hit-testing, focus or OS IME acceptance.
async function fixture({width=1280,collapsedForm='orb',deferRetirement=false}={}){
 const nodes=[],sent=[],rafs=[],resizeObservers=[],messages=new Set(),retirements=[];let focused=null;
 let bounds={left:40,right:width-40,top:700,bottom:884},currentForm={getBoundingClientRect:()=>({...bounds})};
 const composer={closest:()=>currentForm};
 const element=tag=>{
  const attributes=new Map(),handlers=new Map(),node={tag,dataset:{},style:{},children:[],isConnected:false,hidden:false,
   setAttribute:(name,value)=>attributes.set(name,String(value)),getAttribute:name=>attributes.get(name),
   addEventListener:(name,handler)=>handlers.set(name,handler),removeEventListener:name=>handlers.delete(name),handlers,
   append(...children){for(const child of children){this.children.push(child);child.parent=this;child.isConnected=true;}},
   attachShadow(){return this.shadow=element('shadow');},remove(){this.isConnected=false;},focus(){focused=this;},
   getBoundingClientRect(){const style=attributes.get('style')||'',number=name=>Number(new RegExp(name+':([\\d.-]+)px').exec(style)?.[1]||0),x=number('left'),y=number('top'),width=number('width'),height=number('height');return {x,y,width,height,left:x,right:x+width,top:y,bottom:y+height};},
   setPointerCapture(id){this.pointer=id;},hasPointerCapture(id){return this.pointer===id;},releasePointerCapture(){this.pointer=null;}};
  if(deferRetirement&&tag==='iframe')node.animate=(_frames,options)=>{assert.equal(options.duration,80);return {finished:new Promise(resolve=>retirements.push(resolve))};};
  nodes.push(node);return node;
 };
 const root=element('html');root.isConnected=true;
 const document={documentElement:root,createElement:element,createElementNS:(_namespace,tag)=>element(tag),querySelectorAll:()=>[{getBoundingClientRect:()=>({top:0,bottom:50,width,height:50})}],addEventListener(){},removeEventListener(){}};
 const sandbox={document,setTimeout,clearTimeout,performance,location:{href:'https://chatgpt.com/c/synthetic-juban'},navigator:{language:'zh-CN'},innerWidth:width,innerHeight:900,
  crypto:{randomUUID:()=>nonce},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),
  requestAnimationFrame:fn=>rafs.push(fn),MutationObserver:class{observe(){}disconnect(){}},
  ResizeObserver:class{constructor(callback){this.callback=callback;this.targets=[];resizeObservers.push(this);}observe(node){this.targets.push(node);}disconnect(){this.targets=[];}},
  PAIAChatGPTComposerAdapter:class{discover(){return {status:'visible',node:composer};}find(){return composer;}dispose(){}},
  window:{addEventListener(){},removeEventListener(){}},
  chrome:{runtime:{id:'ext',getURL:path=>'chrome-extension://ext/'+path,onMessage:{addListener:fn=>messages.add(fn),removeListener:fn=>messages.delete(fn)},sendMessage:async request=>{sent.push(structuredClone(request));return {ok:true,data:request.state||{version:1,open:false,position:{x:0,y:1},collapsedForm}};}}}};
 const context=vm.createContext(sandbox);vm.runInContext(layoutSource,context);vm.runInContext(hostSource,context);
 const f={nodes,sent,resizeObservers,sandbox,composer,get form(){return currentForm;},get focus(){return focused;},get host(){return nodes.find(node=>node.dataset.paiaPromptSurface==='');},get orb(){return nodes.find(node=>node.tag==='button');},get frame(){return nodes.findLast(node=>node.tag==='iframe'&&node.isConnected);},
  focusChild(node){focused=node;},
  async finishRetirement(){for(const done of retirements.splice(0))done();await tick();},
  async flush(){for(let i=0;i<4;i++){await tick();while(rafs.length)rafs.shift()();}},
  click(){const r=this.host.getBoundingClientRect();this.orb.handlers.get('click')({isTrusted:true,detail:1,clientX:r.x+22,clientY:r.y+22});},
  receive(request,sender={id:'ext'}){let response;for(const fn of messages)fn(request,sender,value=>response=value);return response;},
  resize(top){bounds={...bounds,top};for(const observer of resizeObservers)observer.callback([]);},
  replaceForm(){currentForm={getBoundingClientRect:()=>({...bounds})};this.resize(bounds.top);},
  placement(){return JSON.parse(JSON.stringify(sandbox.PAIAPromptSurface.nextPlacement()));}};
 await f.flush();return f;
}

test('trusted same-point open/close keeps its target and waits for the original nonce-bound guard',async()=>{
 for(const width of [390,1280]){
  const f=await fixture({width}),anchor=f.host.getBoundingClientRect();assert.equal(anchor.right,width-40-(width<=530?0:4));
  assert.equal(f.orb.getAttribute('aria-expanded'),'false');f.click();await f.flush();const frame=f.frame;
  assert.deepEqual(f.host.getBoundingClientRect(),anchor);assert.equal(f.orb.getAttribute('aria-expanded'),'true');assert.equal(f.orb.getAttribute('aria-label'),'收起常用表达');
  const card=frame.getBoundingClientRect();assert.equal(card.width,Math.min(336,anchor.right));assert.equal(card.height,328);assert.equal(card.bottom,anchor.bottom);assert.equal(card.right,anchor.right);
  f.click();await f.flush();assert.equal(f.frame,frame);assert.deepEqual(f.sent.filter(x=>x.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'),[{type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce}]);
  f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce:'stale'});f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce},{id:'foreign'});assert.equal(f.frame,frame);
  f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce});await f.flush();assert.equal(f.frame,undefined);assert.deepEqual(f.host.getBoundingClientRect(),anchor);assert.equal(f.orb.getAttribute('aria-expanded'),'false');assert.equal(f.focus,f.orb);
  f.sandbox.PAIAPromptSurface.dispose();
 }
});

test('capsule and board preserve the same private frame, nonce and logical close focus target',async()=>{
 const f=await fixture({collapsedForm:'capsule'}),frame=f.frame,anchor=f.host.getBoundingClientRect();assert.equal(f.orb.hidden,false);assert.equal(frame.getBoundingClientRect().width,336);assert.equal(frame.getBoundingClientRect().height,328);assert.equal(frame.getBoundingClientRect().right,anchor.right);
 f.receive({type:'PAIA_PROMPT_SURFACE_FORM',nonce,form:'board'});await f.flush();assert.equal(f.frame,frame);assert.equal(f.orb.hidden,false);assert.equal(f.orb.getAttribute('aria-expanded'),'true');assert.deepEqual(f.host.getBoundingClientRect(),anchor);
 f.click();await f.flush();assert.equal(f.frame,frame);f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce});await f.flush();assert.equal(f.frame,frame);assert.equal(f.orb.hidden,false);assert.equal(f.orb.getAttribute('aria-expanded'),'false');assert.equal(f.focus,f.orb);assert.equal(frame.getBoundingClientRect().width,336);assert.equal(frame.src,'chrome-extension://ext/ui/prompt-surface.html#'+nonce);
 assert.match(frame.getAttribute('style'),/clip-path:inset\(280px 0 0 64px round 24px\)/);assert.match(css,/#capsule\{[^}]+background:transparent/,'capsule content shares the one host skin');assert.doesNotMatch(uiSource,/getElementById\('capsule-expand'\)/);
 f.sandbox.PAIAPromptSurface.dispose();
});

test('ResizeObserver follows the complete composer and growth moves the same frame without persistence',async()=>{
 const f=await fixture();f.click();await f.flush();const frame=f.frame,before=f.placement(),writes=f.sent.length;
 assert.equal(f.resizeObservers.length,1);assert.deepEqual(f.resizeObservers[0].targets,[f.form]);assert.ok(!f.resizeObservers[0].targets.includes(f.composer));
 f.resize(550);await f.flush();const after=f.placement();assert.equal(before.orb.y-after.orb.y,150);assert.equal(before.card.y-after.card.y,150);assert.equal(after.card.h,328);assert.equal(f.frame,frame);assert.equal(f.sent.length,writes);
 const oldForm=f.form;f.replaceForm();await f.flush();assert.notEqual(f.form,oldForm);assert.deepEqual(f.resizeObservers[0].targets,[f.form]);f.sandbox.PAIAPromptSurface.dispose();assert.deepEqual(f.resizeObservers[0].targets,[]);
});

test('shortage and hidden fallback restore the exact private frame and simulated query/dirty/IME state',async()=>{
 const f=await fixture();f.click();await f.flush();const frame=f.frame,prior=f.placement(),writes=f.sent.length;
 frame.privateState={query:'synthetic query 中文',dirtyDraft:'unsaved expression',composing:true,selection:[2,7]};const retained=structuredClone(frame.privateState);frame.focus();
 f.resize(140);await f.flush();assert.equal(f.host.hidden,false);assert.equal(frame.hidden,true);assert.equal(f.placement().card,null);assert.equal(f.orb.getAttribute('aria-expanded'),'true');assert.equal(f.host.getBoundingClientRect().bottom,128);
 f.resize(100);await f.flush();assert.equal(f.host.hidden,true);assert.equal(frame.hidden,true);assert.equal(f.placement(),null);
 f.resize(700);await f.flush();assert.equal(f.host.hidden,false);assert.equal(frame.hidden,false);assert.equal(f.frame,frame);assert.deepEqual(f.placement(),prior);assert.deepEqual(frame.privateState,retained);assert.equal(f.focus,frame);assert.equal(f.sent.length,writes);assert.ok(f.sent.every(message=>!JSON.stringify(message).includes('unsaved expression')));
 f.sandbox.PAIAPromptSurface.dispose();
});

test('one static accessible double-card component replaces both old B glyphs without private host text',async()=>{
 const f=await fixture(),svg=f.nodes.find(node=>node.tag==='svg'),cards=f.nodes.filter(node=>node.tag==='rect');
 assert.equal(cards.length,2);assert.equal(svg.getAttribute('viewBox'),'0 0 48 48');assert.equal(svg.getAttribute('width'),'48');assert.equal(svg.getAttribute('height'),'48');assert.equal(svg.getAttribute('aria-hidden'),'true');assert.equal(svg.getAttribute('focusable'),'false');
 assert.doesNotMatch(html,/capsule-expand|<svg|<path|capsule-cue/);assert.doesNotMatch(hostSource,/PAIA_PROMPT_QUERY|textContent=.*item|innerHTML|postMessage|localStorage|sessionStorage/);
 const skin=f.nodes.find(node=>node.className==='surface-skin');assert.equal(skin.getAttribute('aria-hidden'),'true');assert.match(hostSource,/\.surface-skin\{[^}]*pointer-events:none/);assert.equal(f.nodes.some(node=>node.getAttribute('class')==='junction'),false);f.sandbox.PAIAPromptSurface.dispose();
});

test('R3 scoped material retains exact light/dark roles and stationary matched clipping',()=>{
 for(const value of ['#fff','#292b31','#6d7480','#dce0e7','#edf0f3','#f3f5f8','#e9edf3','#2b2c30','#e9ebf0','#a5aab4','#454850','#3b3d43'])assert.ok(css.includes(value),value);
 for(const value of ['#93a2be','#8192b1','#899bb9','#667c9f','#c1cee5','#a0b3d2','#d4dff2','#9eb4d6'])assert.ok(hostSource.includes(value),value);
 assert.match(css,/14px\/1\.55 -apple-system/);assert.match(css,/header span\{font-size:12px/);assert.match(hostSource,/18px 18px 24px 18px/);assert.doesNotMatch(hostSource,/translateY\(/);assert.match(hostSource,/duration:80/);assert.match(hostSource,/--speed:120ms/);assert.match(hostSource,/transition:clip-path var\(--speed\) var\(--ease\)/);assert.doesNotMatch(hostSource,/transition-delay|\.hint/);assert.match(hostSource,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/@media\(forced-colors:active\)/);assert.doesNotMatch(hostSource+css,/radial-gradient|linear-gradient|backdrop-filter/);
});

test('verified insertion tints only its original row or capsule and keeps unconfirmed outcomes unchanged',async()=>{
 const insertSource=uiSource.slice(uiSource.indexOf('async function insert('),uiSource.indexOf('\nfunction edit('));
 const eligibilitySource=uiSource.slice(uiSource.indexOf('function setPendingEligibility('),uiSource.indexOf('\nfunction paintCapsule('));
 for(const capsule of [false,true])for(const verified of [false,true]){
  const row={dataset:{}},original={disabled:false,dataset:{},closest:()=>row},button={id:capsule?'capsule-use':'',disabled:false,dataset:{}},item={id:'synthetic',text:'exact expression'},timers=[],calls=[];
  const context=vm.createContext({editing:false,busy:false,refreshing:false,drag:null,composing:false,checking:null,attempted:new Set(),list:{querySelector:()=>original},quickPromptEligible:()=>true,pending(){},tell(){},selectionRef:()=>({id:item.id}),mode:'candidates',candidateTarget:{nonce},crypto:{randomUUID:()=>nonce},rpc:async command=>{calls.push(command);return {status:verified?'inserted':'uncertain',verified};},setTimeout:(fn,ms)=>timers.push({fn,ms}),currentItems:()=>[item],paintCapsule(){},leaveCheck(){},button:()=>({}),status:{append(){}},copyWhole(){}});
  vm.runInContext(eligibilitySource+'\n'+insertSource,context);await context.insert(item,button);
  assert.equal(calls.length,1);assert.equal(calls[0].type,'PAIA_PROMPT_SELECTION_INSERT');assert.equal(row.dataset.inserted,verified&&!capsule?'true':undefined);assert.equal(button.dataset.inserted,verified&&capsule?'true':undefined);
  if(verified){assert.equal(timers.length,1);assert.equal(timers[0].ms,480);timers[0].fn();assert.equal(row.dataset.inserted,undefined);assert.equal(button.dataset.inserted,undefined);}else assert.equal(timers.length,0,'UNKNOWN never gets success feedback or an automatic retry');
  assert.equal(original.disabled,!verified);assert.equal(context.attempted.has(item.id),!verified);
  if(!verified)await context.insert(item,button);
  assert.equal(calls.length,1,'feedback expiry and UNKNOWN never dispatch another insertion');
 }
});

test('verified insertion expiry keeps the original row disabled until a later pending owner settles',async()=>{
 const section=(from,to)=>{const start=uiSource.indexOf(from),end=uiSource.indexOf(to,start);assert.ok(start>=0&&end>start);return uiSource.slice(start,end);};
 const source=section('function pending(value)','\nlet feedbackTimer')+'\n'+section('function setPendingEligibility(','\nfunction paintCapsule(')+'\n'+section('async function insert(','\nfunction edit(');
 for(const capsule of [false,true])for(const refreshing of [false,true])for(const current of [true,false]){
  const row={dataset:{}},original={disabled:false,dataset:{},closest:()=>row},button={id:capsule?'capsule-use':'',disabled:false,dataset:{}},item={id:'synthetic',text:'exact expression'},timers=[],calls=[];
  let items=[item];
  const context=vm.createContext({editing:false,busy:false,refreshing:false,drag:null,composing:false,checking:null,attempted:new Set(),document:{querySelectorAll:()=>[original,button]},searchInput:null,list:{querySelector:()=>original},quickPromptEligible:()=>true,tell(){},selectionRef:()=>({id:item.id}),mode:'candidates',candidateTarget:{nonce},crypto:{randomUUID:()=>nonce},rpc:async command=>{calls.push(command);return {status:'inserted',verified:true};},setTimeout:(fn,ms)=>timers.push({fn,ms}),currentItems:()=>items,paintCapsule(){},leaveCheck(){}});
  vm.runInContext(source,context);await context.insert(item,button);
  assert.equal(calls.length,1);assert.equal(calls[0].type,'PAIA_PROMPT_SELECTION_INSERT');assert.equal(timers.length,1);assert.equal(timers[0].ms,480);
  assert.equal(row.dataset.inserted,capsule?undefined:'true');assert.equal(button.dataset.inserted,capsule?'true':undefined);
  context.refreshing=refreshing;context.pending(true);assert.equal(context.busy,true);assert.equal(original.dataset.pendingDisabled,'1');
  if(!current)items=[];
  timers[0].fn();
  assert.equal(row.dataset.inserted,undefined);assert.equal(button.dataset.inserted,undefined);assert.equal(context.attempted.has(item.id),false);
  assert.equal(original.disabled,true,'feedback cannot enable the original row while another action owns pending');
  assert.equal(original.dataset.pendingDisabled,current?'0':'1','only a still-current original row may update its saved eligibility');
  await context.insert(item,button);assert.equal(calls.length,1,'a gesture during pending cannot insert again');
  context.refreshing=false;context.pending(false);
  assert.equal(original.disabled,!current);assert.equal(Object.hasOwn(original.dataset,'pendingDisabled'),false);assert.equal(calls.length,1);
 }
});

test('original pending eligibility honors busy and refreshing even before a control has a saved pending state',()=>{
 const source=uiSource.slice(uiSource.indexOf('function setPendingEligibility('),uiSource.indexOf('\nfunction paintCapsule('));
 for(const busy of [false,true])for(const refreshing of [false,true])for(const disabled of [false,true]){
  const control={dataset:{},disabled:true},context=vm.createContext({busy,refreshing});vm.runInContext(source,context);context.setPendingEligibility(control,disabled);
  assert.equal(control.disabled,busy||refreshing||disabled);assert.equal(Object.hasOwn(control.dataset,'pendingDisabled'),false);
 }
});


test('guarded capsule close preserves host focus while re-enabling the original pending controls',async()=>{
 const source=uiSource.slice(uiSource.indexOf('async function requestClose('),uiSource.indexOf('\nfunction closeSurfaceTools('));
 for(const outcome of ['closed','refused','editing','composing','search-composing']){
  const events=[],expand={disabled:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},focus(){assert.equal(this.disabled,false,'a disabled capsule target cannot receive native focus');events.push('focus');}},html={dataset:{surfaceForm:'board'}};
  const suggestion={id:nonce,text:'Synthetic retained suggestion'},assistSurface={state:{result:suggestion},dismiss(){this.state.result=null;events.push('assist-dismiss');}};
  const context=vm.createContext({assistSurface,nonce,composing:outcome==='composing',searchComposing:outcome==='search-composing',editing:outcome==='editing',busy:false,refreshing:false,drag:null,document:{documentElement:html,getElementById:()=>expand},pending(value){expand.disabled=value;events.push('pending:'+value);},tell:()=>events.push('notice'),rpc:async command=>{assert.equal(command.type,'close');events.push('rpc');if(outcome==='refused')throw Error('refused');return {closed:true,nonce,form:'capsule'};}});
  vm.runInContext(source,context);await context.requestClose({});
  assert.equal(events.includes('assist-dismiss'),false,'presentation close never cancels the current automatic opportunity');assert.equal(assistSurface.state.result,suggestion);
  if(outcome==='closed'){assert.deepEqual(events,['pending:true','rpc','pending:false']);assert.equal(html.dataset.surfaceForm,'capsule');assert.equal(expand.disabled,false);}
  else{assert.ok(!events.includes('focus'));assert.equal(html.dataset.surfaceForm,'board');if(outcome!=='refused'){assert.ok(!events.includes('rpc'));assert.ok(!events.includes('assist-dismiss'));}}
 }
});

test('same-point native reopening observes its one action without a fallback click',async()=>{
 const native=await readFile(new URL('./cpv1-09-prompt-surface-chrome-e2e.test.mjs',import.meta.url),'utf8');
 const section=native.slice(native.indexOf('// No second mouse.move:'),native.indexOf("for(const key of ['Enter','Space'])"));
 assert.match(section,/await page.mouse.down\(\);await page.mouse.up\(\);await eventually\(\(\)=>!!card\(\)/);
 assert.match(section,/await readyCard\(\)/);assert.doesNotMatch(section,/await open\(|orb.click\(|page.mouse.move\(/);
});

test('delayed real host retirement cannot let the closing child steal the retained orb keyboard focus',async()=>{
 const f=await fixture({deferRetirement:true});f.click();await f.flush();const prior=f.frame;
 const source=uiSource.slice(uiSource.indexOf('async function requestClose('),uiSource.indexOf('\nfunction closeSurfaceTools('));
 const expand={disabled:false,setAttribute(){},focus(){assert.equal(this.disabled,false);f.focusChild(this);}},html={dataset:{surfaceForm:'board'}};
 const suggestion={id:nonce,text:'Synthetic retained suggestion'},assistSurface={state:{result:suggestion},dismissed:0,dismiss(){this.dismissed++;this.state.result=null;}};
 const context=vm.createContext({assistSurface,nonce,composing:false,searchComposing:false,editing:false,busy:false,refreshing:false,drag:null,document:{documentElement:html,getElementById:()=>expand},pending(value){expand.disabled=value;},tell(){},rpc:async command=>{assert.equal(command.type,'close');const ack=f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce});assert.equal(prior.isConnected,true,'original 80ms animation deliberately not settled');assert.equal(f.focus,f.orb,'host already restored its original target');return ack;}});
 vm.runInContext(source,context);await context.requestClose({});assert.equal(assistSurface.dismissed,0);assert.equal(assistSurface.state.result,suggestion,'retiring the private presentation does not cancel the automatic opportunity');assert.equal(f.focus,f.orb,'child must not refocus its retiring iframe');
 await f.finishRetirement();assert.equal(prior.isConnected,false);assert.equal(f.focus,f.orb);assert.equal(html.dataset.surfaceForm,'board','retiring frame does not masquerade as retained capsule');f.sandbox.PAIAPromptSurface.dispose();
});

test('only an exact retained capsule ACK changes form and no child ACK steals host focus',async()=>{
 const source=uiSource.slice(uiSource.indexOf('async function requestClose('),uiSource.indexOf('\nfunction closeSurfaceTools('));
 for(const ack of [undefined,{}, {closed:true},{closed:true,nonce,form:'orb'},{closed:false,nonce,form:'capsule'},{closed:true,nonce:'stale',form:'capsule'},{closed:true,nonce,form:'board'},{closed:true,nonce,form:'capsule'}]){
  const events=[],expand={disabled:false,setAttribute(){},focus(){assert.equal(this.disabled,false);events.push('focus');}},html={dataset:{surfaceForm:'board'}};
  const suggestion={id:nonce,text:'Synthetic retained suggestion'},assistSurface={state:{result:suggestion},dismiss(){this.state.result=null;events.push('assist-dismiss');}};
  const context=vm.createContext({assistSurface,nonce,composing:false,searchComposing:false,editing:false,busy:false,refreshing:false,drag:null,document:{documentElement:html,getElementById:()=>expand},pending(v){expand.disabled=v;events.push('pending:'+v);},tell(){events.push('notice');},rpc:async()=>ack});
  vm.runInContext(source,context);await context.requestClose({});const retained=ack?.closed===true&&ack.nonce===nonce&&ack.form==='capsule';
  assert.deepEqual(events.filter(event=>event.startsWith('pending:')),['pending:true','pending:false']);assert.equal(events.includes('assist-dismiss'),false);assert.equal(assistSurface.state.result,suggestion,'an invalid or valid presentation ACK is never suggestion cancellation');assert.equal(events.includes('focus'),false);assert.equal(html.dataset.surfaceForm,retained?'capsule':'board');assert.equal(expand.disabled,false);
 }
});

// PAIA-FLOAT-UI-1.2 supersedes the old B mark only; these exercise the real
// layout and host owner before any native fidelity claim.
test('double-card production geometry keeps one 48px circle and fixed foreground in all three forms',async()=>{
 const f=await fixture({collapsedForm:'capsule'}),anchor=f.host.getBoundingClientRect();
 assert.equal(anchor.width,48);assert.equal(anchor.height,48);assert.equal(f.orb.hidden,false);
 const cards=f.nodes.filter(node=>node.tag==='rect');assert.equal(cards.length,2);
 const front=cards.find(node=>node.getAttribute('class')==='card-front'),rear=cards.find(node=>node.getAttribute('class')==='card-rear');
 for(const form of ['capsule','board','capsule','orb']){
  f.receive({type:'PAIA_PROMPT_SURFACE_FORM',nonce,form});await f.flush();
  assert.deepEqual(f.host.getBoundingClientRect(),anchor);assert.equal(f.orb.hidden,false);
  for(const card of cards)assert.deepEqual(['x','y','width','height','rx'].map(key=>card.getAttribute(key)),['14.75','17','21','14','3.25']);
  assert.equal(front.getAttribute('transform'),undefined);
  assert.equal(rear.getAttribute('transform'),form==='board'?'translate(-5.25 -1.5)':form==='capsule'?'translate(-5 0)':'translate(-2.5 0)');
 }
 f.sandbox.PAIAPromptSurface.dispose();
});
test('double-card capsule uses a separate private body and leaves close focus on the stable host circle',async()=>{
 const f=await fixture({collapsedForm:'capsule'}),frame=f.frame,anchor=f.host.getBoundingClientRect();
 assert.equal(f.orb.hidden,false);assert.equal(frame.getBoundingClientRect().right,anchor.right);assert.equal(frame.getBoundingClientRect().bottom,anchor.bottom);
 f.click();await f.flush();assert.equal(f.frame,frame);assert.equal(f.sent.at(-1).type,'PAIA_PROMPT_SURFACE_REQUEST_CLOSE');
 f.receive({type:'PAIA_PROMPT_SURFACE_FORM',nonce,form:'board'});await f.flush();
 const board=frame.getBoundingClientRect();assert.equal(board.bottom,anchor.bottom);assert.equal(board.right,anchor.right);assert.equal(board.height,328);
 f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce});await f.flush();assert.equal(f.frame,frame);assert.equal(f.focus,f.orb);assert.equal(f.orb.hidden,false);assert.deepEqual(f.host.getBoundingClientRect(),anchor);
 f.sandbox.PAIAPromptSurface.dispose();
});

test('double-card authenticated capsule opening and board closing use original guards and keep host focus',async()=>{
 const formSource=uiSource.slice(uiSource.indexOf('async function setSurfaceForm('),uiSource.indexOf('\nfunction clipped('));
 const closeSource=uiSource.slice(uiSource.indexOf('async function requestClose('),uiSource.indexOf('\nfunction closeSurfaceTools('));
 const listenerSource=uiSource.slice(uiSource.indexOf('chrome.runtime.onMessage.addListener((r,s,reply)=>'),uiSource.indexOf('\nvoid refresh();'));
 for(const guard of [null,'editing','checking','busy','refreshing','drag','composing','searchComposing']){
  const f=await fixture({collapsedForm:'capsule'}),frame=f.frame,anchor=f.host.getBoundingClientRect(),calls=[];let listener;
  f.orb.focus();
  const suggestion={id:nonce,text:'Synthetic retained suggestion'};
  const state={assistSurface:{state:{result:suggestion},dismissed:0,dismiss(){this.dismissed++;this.state.result=null;}},nonce,editing:false,checking:null,busy:false,refreshing:false,drag:null,composing:false,searchComposing:false,
   document:{documentElement:{dataset:{surfaceForm:'capsule'}}},chrome:{runtime:{id:'ext',onMessage:{addListener:fn=>listener=fn}}},paintCapsule(){},tell(){},
   pending(value){state.busy=value;},rpc:async command=>{calls.push(command);return command.type==='surface_form'?f.receive({type:'PAIA_PROMPT_SURFACE_FORM',nonce,form:command.form}):f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce});}};
  if(guard)state[guard]=true;const context=vm.createContext(state);vm.runInContext(formSource+'\n'+closeSource+'\n'+listenerSource,context);
  for(const [request,sender]of [[{type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce:'stale'},{id:'ext'}],[{type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce},{id:'foreign'}],[{type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce},{id:'ext',tab:{id:7}}]])listener(request,sender,()=>{});
  assert.equal(calls.length,0,'private opening keeps nonce, extension and source-only admission');
  listener({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce},{id:'ext'},()=>{});await f.flush();
  if(guard){assert.equal(state.assistSurface.dismissed,0);assert.equal(calls.length,0);assert.equal(state.document.documentElement.dataset.surfaceForm,'capsule');}
  else{
   assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{type:'surface_form',form:'board'}]);assert.equal(state.document.documentElement.dataset.surfaceForm,'board');assert.equal(f.frame,frame);assert.equal(f.focus,f.orb);assert.deepEqual(f.host.getBoundingClientRect(),anchor);
   listener({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce},{id:'ext'},()=>{});await f.flush();assert.equal(calls[1].type,'close');assert.equal(state.document.documentElement.dataset.surfaceForm,'capsule');assert.equal(f.frame,frame);assert.equal(f.focus,f.orb);assert.deepEqual(f.host.getBoundingClientRect(),anchor);
   // Private Close changes presentation only, including the retained capsule.
   await context.requestClose();assert.equal(state.assistSurface.dismissed,0);assert.equal(calls[2].type,'close');assert.equal(f.focus,f.orb);
  }
  assert.equal(state.assistSurface.dismissed,0);assert.equal(state.assistSurface.state.result,suggestion,'opening, closing and blocked gestures retain the same suggestion');assert.ok(!calls.some(command=>/INSERT|SEND/.test(command.type)));f.sandbox.PAIAPromptSurface.dispose();
 }
});

test('double-card shape changes suppress repeated entry keys and second-click toggles without moving targets',async()=>{
 const f=await fixture({collapsedForm:'capsule'}),anchor=f.host.getBoundingClientRect();let prevented=0;
 for(const key of ['Enter',' '])f.orb.handlers.get('keydown')({isTrusted:true,repeat:true,key,preventDefault(){prevented++;}});
 f.orb.handlers.get('click')({isTrusted:true,detail:2});assert.equal(prevented,2);assert.equal(f.sent.filter(x=>x.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE').length,0);
 f.click();await f.flush();assert.equal(f.sent.filter(x=>x.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE').length,1);assert.deepEqual(f.host.getBoundingClientRect(),anchor);
 assert.match(css,/#capsule-use\{[^}]*right:48px/,'the private capsule insertion target stops before the full fixed toggle');
 assert.match(css,/#card\{position:relative;padding:1px/);assert.match(css,/header\{height:48px;min-height:48px;flex:0 0 48px;padding:2px 55px 0 15px/,'the relocated toolbar reserves the complete shared corner');
 assert.match(css,/#status\[data-quiet=true\][^}]+clip-path:inset\(50%\)/);assert.match(css,/#status:not\(:empty\)\{position:relative/,'persistent actionable status stays in flex flow');
 f.sandbox.PAIAPromptSurface.dispose();
});

// R3 explicitly replaces the old neck/inner-arc and material oracles. The
// earlier1.2 native evidence remains historical; these are production-unit checks.
test('R3 material uses exact quiet rules without replacing verified insertion feedback',()=>{
 assert.match(css,/background:var\(--row-rule\);left:4px;right:4px/);assert.match(css,/--row-rule:#edf0f3/);assert.match(css,/--row-rule:#3b3d43/);assert.match(css,/--row-rule:CanvasText/);
 assert.match(css,/\.row:last-child:after\{display:none\}/);assert.match(css,/\.row\[data-inserted=true\]:after,#capsule-use\[data-inserted=true\]:after\{content:"✓"/);assert.doesNotMatch(css,/\.row:after\{display:none\}/);
 assert.match(hostSource,/--panel-shadow:0 2px 5px #17253e04,0 10px 28px #17253e0c/);assert.match(hostSource,/--panel-shadow:0 2px 5px #00000012,0 12px 32px #00000028/);
});
test('R3 one skin replaces the neck and independent circle rim while preserving both cards',async()=>{
 const f=await fixture(),anchor=f.host.getBoundingClientRect(),skin=f.nodes.find(n=>n.className==='surface-skin');
 assert.equal(f.nodes.some(n=>['anchor-edge','join-edge','junction'].includes(n.getAttribute('class'))),false);
 assert.match(skin.getAttribute('style'),/width:48px;height:48px;border-radius:24px/);
 assert.equal(f.nodes.filter(n=>n.tag==='rect').length,2);f.click();await f.flush();assert.deepEqual(f.host.getBoundingClientRect(),anchor);assert.equal(f.orb.getAttribute('aria-expanded'),'true');assert.match(skin.getAttribute('style'),/width:336px;height:328px;border-radius:18px 18px 24px 18px/);assert.match(f.frame.getAttribute('style'),/clip-path:inset\(0px 0 0 0px round 18px 18px 24px 18px\)/);f.sandbox.PAIAPromptSurface.dispose();
});
test('R3 shared skin yields to a complete circle when the logical open board has insufficient room',async()=>{
 const f=await fixture();f.click();await f.flush();assert.equal(f.host.dataset.surfaceForm,'board');const skin=f.nodes.find(n=>n.className==='surface-skin');
 f.resize(140);await f.flush();assert.equal(f.host.dataset.surfaceForm,'orb');assert.equal(f.orb.getAttribute('aria-expanded'),'true');assert.equal(f.frame.hidden,true);assert.equal(f.orb.hidden,false);assert.match(skin.getAttribute('style'),/width:48px;height:48px;border-radius:24px/);
 f.resize(700);await f.flush();assert.equal(f.host.dataset.surfaceForm,'board');assert.equal(f.frame.hidden,false);f.sandbox.PAIAPromptSurface.dispose();
});
test('forced colors separator wins over both explicit and media-derived dark theme selectors',()=>{
 const forced='@media(forced-colors:active){:root,:root[data-paia-theme],:root:not([data-paia-theme]){--row-rule:CanvasText}}';
 assert.ok(css.includes(forced));assert.ok(css.lastIndexOf(forced)>css.lastIndexOf('--row-rule:#3b3d43'));
});
