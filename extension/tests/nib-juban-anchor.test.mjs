import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [hostSource,layoutSource,uiSource,css,html,approvedSVG,tokenSource]=await Promise.all(['content/prompt-surface.js','core/prompt-surface-layout.js','ui/prompt-surface.js','ui/prompt-surface.css','ui/prompt-surface.html','docs/consumer-product-v1/design/narrow-input-board-v4/approved-2026-10-18/assets/PAIA_句瓣_浅色.svg','docs/consumer-product-v1/design/narrow-input-board-v4/approved-2026-10-18/assets/PAIA_视觉参数.json'].map(read));
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
 const sandbox={document,location:{href:'https://chatgpt.com/c/synthetic-juban'},navigator:{language:'zh-CN'},innerWidth:width,innerHeight:900,
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
  const card=frame.getBoundingClientRect();assert.equal(card.width,336);assert.equal(card.height,312);assert.equal(card.bottom,anchor.top);assert.equal(card.right,anchor.right);
  f.click();await f.flush();assert.equal(f.frame,frame);assert.deepEqual(f.sent.filter(x=>x.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'),[{type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce}]);
  f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce:'stale'});f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce},{id:'foreign'});assert.equal(f.frame,frame);
  f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce});await f.flush();assert.equal(f.frame,undefined);assert.deepEqual(f.host.getBoundingClientRect(),anchor);assert.equal(f.orb.getAttribute('aria-expanded'),'false');assert.equal(f.focus,f.orb);
  f.sandbox.PAIAPromptSurface.dispose();
 }
});

test('capsule and board preserve the same private frame, nonce and logical close focus target',async()=>{
 const f=await fixture({collapsedForm:'capsule'}),frame=f.frame,anchor=f.host.getBoundingClientRect();assert.equal(f.orb.hidden,true);assert.equal(frame.getBoundingClientRect().width,272);assert.equal(frame.getBoundingClientRect().height,44);assert.equal(frame.getBoundingClientRect().right,anchor.right);
 f.receive({type:'PAIA_PROMPT_SURFACE_FORM',nonce,form:'board'});await f.flush();assert.equal(f.frame,frame);assert.equal(f.orb.hidden,false);assert.equal(f.orb.getAttribute('aria-expanded'),'true');assert.deepEqual(f.host.getBoundingClientRect(),anchor);
 f.click();await f.flush();assert.equal(f.frame,frame);f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce});await f.flush();assert.equal(f.frame,frame);assert.equal(f.orb.hidden,true);assert.equal(f.orb.getAttribute('aria-expanded'),'false');assert.equal(f.focus,frame);assert.equal(frame.getBoundingClientRect().width,272);assert.equal(frame.src,'chrome-extension://ext/ui/prompt-surface.html#'+nonce);
 assert.match(hostSource,/:host\(\[data-expanded=false\]\) iframe\{border:0/);assert.match(css,/#capsule\{[^}]+box-shadow:inset 0 0 0 1px var\(--line\)/,'capsule stroke cannot shift its exact right-hand 44px target');assert.match(uiSource,/if\(retainedCapsule\)document\.getElementById\('capsule-expand'\)\.focus\(\)/);
 f.sandbox.PAIAPromptSurface.dispose();
});

test('ResizeObserver follows the complete composer and growth moves the same frame without persistence',async()=>{
 const f=await fixture();f.click();await f.flush();const frame=f.frame,before=f.placement(),writes=f.sent.length;
 assert.equal(f.resizeObservers.length,1);assert.deepEqual(f.resizeObservers[0].targets,[f.form]);assert.ok(!f.resizeObservers[0].targets.includes(f.composer));
 f.resize(550);await f.flush();const after=f.placement();assert.equal(before.orb.y-after.orb.y,150);assert.equal(before.card.y-after.card.y,150);assert.equal(after.card.h,312);assert.equal(f.frame,frame);assert.equal(f.sent.length,writes);
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

test('entry and capsule reuse both exact approved paths and optical transform at 40 and 19px',async()=>{
 const f=await fixture(),svg=f.nodes.find(node=>node.tag==='svg'),group=f.nodes.find(node=>node.tag==='g'),paths=f.nodes.filter(node=>node.tag==='path').map(node=>node.getAttribute('d')),expected=[...approvedSVG.matchAll(/<path d="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(paths,expected);assert.equal(group.getAttribute('transform'),'matrix(1.04348 0 0 1.12245 -0.6087 -1.4755)');assert.equal(svg.getAttribute('width'),'40');assert.equal(svg.getAttribute('height'),'40');assert.equal(svg.getAttribute('aria-hidden'),'true');assert.equal(svg.getAttribute('focusable'),'false');
 assert.deepEqual([...html.matchAll(/<path d="([^"]+)"/g)].map(match=>match[1]),expected);assert.match(html,/width="19" height="19" aria-hidden="true" focusable="false"/);assert.doesNotMatch(html,/capsule-cue/);f.sandbox.PAIAPromptSurface.dispose();
});

test('scoped themes and motion map exact approved roles without glass or changing host background',()=>{
 for(const theme of ['light','dark']){const t=tokens[theme];for(const role of ['surface','text','muted','border','hover','active','inserted_surface','inserted_text'])assert.ok(css.includes(t[role]),theme+' '+role);assert.ok(hostSource.includes(t.brand));assert.ok(hostSource.includes(t.panel_shadow));}
 assert.match(css,/font:14px\/1\.5714285714 Arial,"PingFang SC","Microsoft YaHei",sans-serif/);assert.match(css,/header span\{font-size:12px/);assert.match(hostSource,/border-radius:\$\{open\?18:23\}px/);assert.match(hostSource,/translateY\(4px\)/);assert.match(hostSource,/duration:80/);assert.match(hostSource,/translateY\(3px\)/);assert.match(hostSource,/transition-delay:650ms/);assert.match(hostSource,/animation:appear \.12s/);assert.match(hostSource,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/@media\(forced-colors:active\)/);assert.doesNotMatch(hostSource+css,/radial-gradient|linear-gradient|backdrop-filter/);
});

test('verified insertion tints only its original row or capsule and keeps unconfirmed outcomes unchanged',async()=>{
 const insertSource=uiSource.slice(uiSource.indexOf('async function insert('),uiSource.indexOf('\nfunction edit('));
 for(const capsule of [false,true])for(const verified of [false,true]){
  const row={dataset:{}},original={disabled:false,closest:()=>row},button={id:capsule?'capsule-use':'',disabled:false,dataset:{}},item={id:'synthetic',text:'exact expression'},timers=[],calls=[];
  const context=vm.createContext({editing:false,busy:false,drag:null,composing:false,checking:null,attempted:new Set(),list:{querySelector:()=>original},quickPromptEligible:()=>true,pending(){},tell(){},selectionRef:()=>({id:item.id}),mode:'candidates',candidateTarget:{nonce},crypto:{randomUUID:()=>nonce},rpc:async command=>{calls.push(command);return {status:verified?'inserted':'uncertain',verified};},setTimeout:(fn,ms)=>timers.push({fn,ms}),currentItems:()=>[item],paintCapsule(){},leaveCheck(){},button:()=>({}),status:{append(){}},copyWhole(){}});
  vm.runInContext(insertSource,context);await context.insert(item,button);
  assert.equal(calls.length,1);assert.equal(calls[0].type,'PAIA_PROMPT_SELECTION_INSERT');assert.equal(row.dataset.inserted,verified&&!capsule?'true':undefined);assert.equal(button.dataset.inserted,verified&&capsule?'true':undefined);
  if(verified){assert.equal(timers.length,1);assert.equal(timers[0].ms,480);timers[0].fn();assert.equal(row.dataset.inserted,undefined);assert.equal(button.dataset.inserted,undefined);}else assert.equal(timers.length,0,'UNKNOWN never gets success feedback or an automatic retry');
 }
});


test('guarded capsule close restores focus only after the original pending controls are enabled',async()=>{
 const source=uiSource.slice(uiSource.indexOf('async function requestClose('),uiSource.indexOf('\nfunction closeSurfaceTools('));
 for(const outcome of ['closed','refused','editing','composing','search-composing']){
  const events=[],expand={disabled:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},focus(){assert.equal(this.disabled,false,'a disabled capsule target cannot receive native focus');events.push('focus');}},html={dataset:{surfaceForm:'board'}};
  const context=vm.createContext({nonce,composing:outcome==='composing',searchComposing:outcome==='search-composing',editing:outcome==='editing',busy:false,refreshing:false,drag:null,document:{documentElement:html,getElementById:()=>expand},pending(value){expand.disabled=value;events.push('pending:'+value);},tell:()=>events.push('notice'),rpc:async command=>{assert.equal(command.type,'close');events.push('rpc');if(outcome==='refused')throw Error('refused');return {closed:true,nonce,form:'capsule'};}});
  vm.runInContext(source,context);await context.requestClose({});
  if(outcome==='closed'){assert.deepEqual(events,['pending:true','rpc','pending:false','focus']);assert.equal(html.dataset.surfaceForm,'capsule');assert.equal(expand.attributes['aria-expanded'],'false');}
  else{assert.ok(!events.includes('focus'));assert.equal(html.dataset.surfaceForm,'board');if(outcome!=='refused')assert.ok(!events.includes('rpc'));}
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
 const context=vm.createContext({nonce,composing:false,searchComposing:false,editing:false,busy:false,refreshing:false,drag:null,document:{documentElement:html,getElementById:()=>expand},pending(value){expand.disabled=value;},tell(){},rpc:async command=>{assert.equal(command.type,'close');const ack=f.receive({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce});assert.equal(prior.isConnected,true,'original 80ms animation deliberately not settled');assert.equal(f.focus,f.orb,'host already restored its original target');return ack;}});
 vm.runInContext(source,context);await context.requestClose({});assert.equal(f.focus,f.orb,'child must not refocus its retiring iframe');
 await f.finishRetirement();assert.equal(prior.isConnected,false);assert.equal(f.focus,f.orb);assert.equal(html.dataset.surfaceForm,'board','retiring frame does not masquerade as retained capsule');f.sandbox.PAIAPromptSurface.dispose();
});

test('only an exact retained capsule ACK can focus the enabled child target',async()=>{
 const source=uiSource.slice(uiSource.indexOf('async function requestClose('),uiSource.indexOf('\nfunction closeSurfaceTools('));
 for(const ack of [undefined,{}, {closed:true},{closed:true,nonce,form:'orb'},{closed:false,nonce,form:'capsule'},{closed:true,nonce:'stale',form:'capsule'},{closed:true,nonce,form:'board'},{closed:true,nonce,form:'capsule'}]){
  const events=[],expand={disabled:false,setAttribute(){},focus(){assert.equal(this.disabled,false);events.push('focus');}},html={dataset:{surfaceForm:'board'}};
  const context=vm.createContext({nonce,composing:false,searchComposing:false,editing:false,busy:false,refreshing:false,drag:null,document:{documentElement:html,getElementById:()=>expand},pending(v){expand.disabled=v;events.push('pending:'+v);},tell(){events.push('notice');},rpc:async()=>ack});
  vm.runInContext(source,context);await context.requestClose({});const retained=ack?.closed===true&&ack.nonce===nonce&&ack.form==='capsule';
  assert.equal(events.includes('focus'),retained);assert.equal(html.dataset.surfaceForm,retained?'capsule':'board');assert.equal(expand.disabled,false);
 }
});
