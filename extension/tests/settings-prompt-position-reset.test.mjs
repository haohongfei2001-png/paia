import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {PromptSurfaceCommands,validSurface} from '../background/prompt-surface.js';
import {topicRootURL} from '../core/topic-root-target.js';

const KEY='promptSurfaceV1',STATUS='PAIA_PROMPT_SURFACE_SETTINGS_STATUS',RESET='PAIA_PROMPT_SURFACE_RESET_POSITION',HOST='PAIA_PROMPT_SURFACE_HOST';
const clone=value=>structuredClone(value),tick=()=>new Promise(setImmediate);
const initial=()=>({version:1,open:true,position:{x:.2,y:.3}});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const hostSource=await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8');
const layoutSource=await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8');

function ownerFixture(value=initial()){
 const storage={unrelated:{promptFamilies:[{id:'synthetic',text:'保留原文',hidden:true}],pins:['synthetic'],manualOrder:['synthetic'],history:['original'],suggestionConsent:false,remoteConsent:false}};
 if(value!==undefined)storage[KEY]=clone(value);
 const writes=[],sent=[],calls=[],hosts=new Map();let consent=true,owner;
 const tabs=new Map([[7,{id:7,url:'https://chatgpt.com/c/synthetic-one',windowId:1}],[8,{id:8,url:'https://chatgpt.com/c/synthetic-two',windowId:2}]]);
 const api={runtime:{id:'ext',getURL:path=>'chrome-extension://ext/'+path,sendMessage:async()=>{throw Error('no card dispatch');}},
  storage:{local:{get:async key=>({[key]:clone(storage[key])}),set:async patch=>{writes.push(clone(patch));Object.assign(storage,clone(patch));}}},
  tabs:{query:async()=>[...tabs.values()].map(clone),get:async id=>clone(tabs.get(id)),sendMessage:async(id,message,options)=>{
   sent.push([id,clone(message),clone(options)]);if(!hosts.has(id))throw Error('host unavailable');return hosts.get(id).receive(message);
  }}};
 const commands={service:{s:{status:async()=>({consented:consent})},members:async()=>{throw Error('no prompt family reads');}},dispatch:async request=>{calls.push(request);throw Error('no prompt command dispatch');}};
 const archive={id:'ext',url:api.runtime.getURL('ui/archive.html'),frameId:0};
 const f={api,archive,storage,writes,sent,calls,hosts,tabs,get owner(){return owner;},restart(){owner=new PromptSurfaceCommands(commands,api);},
  revoke(){consent=false;},grant(){consent=true;},status(){return owner.handle({type:STATUS},archive);},reset(){return owner.handle({type:RESET},archive);},
  hostSender(id=7){return {id:'ext',tab:{id},frameId:0,url:tabs.get(id).url,documentId:'document-'+id,documentLifecycle:'active'};},
  hostWrite(state,id=7){return owner.handle({type:HOST,state},f.hostSender(id));},hostRead(id=7){return owner.handle({type:HOST},f.hostSender(id));}};
 f.restart();return f;
}

async function hostFixture(f,id=7,transform=async(_request,data)=>data){
 const nodes=[],frames=[],messageListeners=new Set(),documentHandlers=new Map(),layoutPositions=[],outbound=[];
 let activeElement=null,replyTransform=transform,raf=0;const rafs=[];
 const element=tag=>{
  const attrs=new Map(),handlers=new Map();const node={tag,dataset:{},hidden:false,isConnected:false,handlers,children:[],
   addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:(key)=>handlers.delete(key),
   setAttribute:(key,value)=>attrs.set(key,value),getAttribute:key=>attrs.get(key),
   append(...children){this.children.push(...children);for(const child of children)child.isConnected=true;},
   attachShadow(){this.shadow=element('shadow');return this.shadow;},remove(){this.isConnected=false;},
   getBoundingClientRect(){const style=attrs.get('style')||'',x=Number(/left:([\d.-]+)px/.exec(style)?.[1]||0),y=Number(/top:([\d.-]+)px/.exec(style)?.[1]||0);return {x,y,left:x,top:y,right:x+44,bottom:y+44,width:44,height:44};},
   setPointerCapture(pointerId){this.pointerId=pointerId;},hasPointerCapture(pointerId){return this.pointerId===pointerId;},releasePointerCapture(){this.pointerId=null;},
   focus(){activeElement=this;},closest(){return this;}};
  nodes.push(node);if(tag==='iframe')frames.push(node);return node;
 };
 const html=element('html');html.classList={contains:()=>false};html.isConnected=true;
 const composer={closest(){return this;},getBoundingClientRect:()=>f.composerBounds||({left:600,right:1264,top:760,bottom:884})};
 const document={documentElement:html,hidden:false,createElement:element,get activeElement(){return activeElement;},
  addEventListener:(key,fn)=>documentHandlers.set(key,fn),removeEventListener:key=>documentHandlers.delete(key)};
 const sandbox={document,location:{href:f.tabs.get(id).url},innerWidth:1280,innerHeight:900,crypto:{randomUUID:()=>`${String(id).padStart(8,'0')}-1111-4111-8111-111111111111`},
  getComputedStyle:()=>({colorScheme:'light'}),matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),
  MutationObserver:class{observe(){}disconnect(){}},requestAnimationFrame(fn){rafs.push(fn);return ++raf;},
  PAIAChatGPTComposerAdapter:class{discover(){return {node:composer,status:'visible'};}dispose(){}},
  chrome:{runtime:{id:'ext',getURL:f.api.runtime.getURL,onMessage:{addListener:fn=>messageListeners.add(fn),removeListener:fn=>messageListeners.delete(fn)},
   async sendMessage(request){outbound.push(clone(request));try{return await replyTransform(request,{ok:true,data:await f.owner.handle(request,f.hostSender(id))});}catch(error){return await replyTransform(request,{ok:false,error:error.code||'STORAGE_FAILED'});}}}}};
 sandbox.window={addEventListener(){},removeEventListener(){}};
 const context=vm.createContext(sandbox);vm.runInContext(layoutSource,context);const actualLayout=sandbox.PAIAPromptLayout;
 sandbox.PAIAPromptLayout=(...args)=>{layoutPositions.push(clone(args[3]));return actualLayout(...args);};
 const h={nodes,frames,outbound,sandbox,layoutPositions,get orb(){return nodes.find(node=>node.tag==='button');},get host(){return nodes.find(node=>node.dataset.paiaPromptSurface==='');},
  get frame(){return frames.findLast(node=>node.isConnected);},get position(){return layoutPositions.at(-1);},get focused(){return activeElement;},
  setReplyTransform(fn){replyTransform=fn;},receive(request,sender={id:'ext'}){let response;for(const fn of messageListeners)fn(request,sender,value=>response=value);return response;},
  fire(type,fields={}){this.orb.handlers.get(type)?.({isTrusted:true,button:0,pointerId:1,clientX:240,clientY:250,preventDefault(){},...fields});},
  async flush(){for(let i=0;i<4;i++){await tick();while(rafs.length)rafs.shift()();}},
  async revisit(){documentHandlers.get('visibilitychange')?.();await this.flush();},dispose(){sandbox.PAIAPromptSurface.dispose();}};
 f.hosts.set(id,h);vm.runInContext(hostSource,context);await h.flush();return h;
}

test('Settings reads stored geometry only and reset patches its existing key after durable success',{timeout:5000},async()=>{
 const f=ownerFixture(),before=clone(f.storage.unrelated);assert.deepEqual(await f.status(),{status:'ready',position:'custom'});assert.equal(f.writes.length,0);assert.equal(f.sent.length,0);
 assert.deepEqual(await f.reset(),{status:'reset',changed:true});assert.deepEqual(f.storage[KEY],{...initial(),position:null,positionGeneration:1});
 assert.deepEqual(f.storage.unrelated,before);assert.deepEqual(Object.keys(f.writes[0]),[KEY]);assert.equal(f.calls.length,0);
 assert.deepEqual(await f.status(),{status:'ready',position:'default'});
});

test('Settings commands admit only the trusted top-level Archive and exact type-only requests',{timeout:5000},async()=>{
 const f=ownerFixture();
 for(const sender of [ {...f.archive,id:'foreign'},{...f.archive,frameId:1},{...f.archive,tab:{id:7,incognito:true}},
  {...f.archive,documentLifecycle:'cached'}, {...f.archive,url:f.archive.url+'?query=1'}, {...f.archive,url:f.archive.url+'#spoof'},
  {...f.archive,url:f.api.runtime.getURL('ui/popup.html')},{...f.archive,url:f.api.runtime.getURL('ui/prompt-surface.html')},
  {...f.archive,url:'https://chatgpt.com/c/synthetic-one'}, {...f.archive,url:'chrome-extension://foreign/ui/archive.html'}]){
  for(const type of [STATUS,RESET])await assert.rejects(()=>f.owner.handle({type},sender),error=>error.code==='FORBIDDEN');
 }
 for(const type of [STATUS,RESET])for(const extra of [{tabId:7},{state:initial()},{position:null}])await assert.rejects(()=>f.owner.handle({type,...extra},f.archive),error=>error.code==='FORBIDDEN');
 await assert.rejects(()=>f.owner.handle({type:HOST,state:initial()},f.archive),error=>error.code==='FORBIDDEN');
 assert.equal(f.writes.length,0);assert.equal(f.sent.length,0);f.revoke();assert.deepEqual(await f.status(),{status:'consent_required'});
 await assert.rejects(()=>f.reset(),error=>error.code==='CONSENT_REQUIRED');assert.equal(f.writes.length,0);
});

test('generation is the sole optional legacy-compatible field; unknown geometry remains untouched',{timeout:5000},async()=>{
 for(const state of [initial(),{...initial(),positionGeneration:0},{...initial(),positionGeneration:1}])assert.equal(!!validSurface(state),true);
 for(const state of [{...initial(),version:2},{...initial(),future:true},null,{...initial(),positionGeneration:-1},{...initial(),positionGeneration:1.1},{...initial(),positionGeneration:Number.MAX_SAFE_INTEGER+1},{...initial(),positionGeneration:null},{...initial(),position:{x:.3,y:.4,text:'private'}}]){
  assert.equal(!!validSurface(state),false);const f=ownerFixture(state),before=clone(f.storage);
  assert.deepEqual(await f.status(),{status:'unavailable'});await assert.rejects(()=>f.reset());await assert.rejects(()=>f.hostRead());await assert.rejects(()=>f.hostWrite(initial()));assert.deepEqual(f.storage,before);assert.equal(f.writes.length,0);
 }
 const f=ownerFixture({...initial(),positionGeneration:Number.MAX_SAFE_INTEGER});await assert.rejects(()=>f.reset(),error=>error.code==='INVALID_REQUEST');assert.equal(f.writes.length,0);
});

test('default-position reset still fences in-progress drags and a missing record stays read-only until reset',{timeout:5000},async()=>{
 const f=ownerFixture();delete f.storage[KEY];assert.deepEqual(await f.status(),{status:'ready',position:'default'});assert.equal(KEY in f.storage,false);
 assert.deepEqual(await f.reset(),{status:'reset',changed:false});assert.deepEqual(f.storage[KEY],{version:1,open:false,position:null,positionGeneration:1});
 assert.deepEqual(await f.reset(),{status:'reset',changed:false});assert.equal(f.storage[KEY].positionGeneration,2);
 await assert.rejects(()=>f.hostWrite({...initial(),positionGeneration:1}),error=>error.code==='STALE_BASE');assert.equal(f.storage[KEY].open,false);
});

test('stale legacy and modern saves cannot alter open or position after reset, including worker restart',{timeout:5000},async()=>{
 const f=ownerFixture();await f.reset();f.restart();const saved=clone(f.storage[KEY]);
 for(const state of [{...initial(),open:false},{...initial(),open:false,positionGeneration:0},{...initial(),positionGeneration:2}])await assert.rejects(()=>f.hostWrite(state),error=>error.code==='STALE_BASE');
 assert.deepEqual(f.storage[KEY],saved);assert.equal(f.writes.length,1);
 const current=await f.hostRead();assert.deepEqual(await f.hostWrite({...current,position:{x:.4,y:.2},open:false}),{...current,position:{x:.4,y:.2},open:false});
});

test('serialized host writes and reset do not interleave lost updates; writes in either order remain fenced',{timeout:5000},async()=>{
 const f=ownerFixture(),gate=deferred(),entered=deferred(),originalSet=f.api.storage.local.set;
 f.api.storage.local.set=async patch=>{entered.resolve();await gate.promise;return originalSet(patch);};
 const oldWrite=f.hostWrite({...initial(),open:false});await entered.promise;const reset=f.reset();await tick();assert.equal(f.writes.length,0);
 gate.resolve();await oldWrite;await reset;assert.deepEqual(f.storage[KEY],{version:1,open:false,position:null,positionGeneration:1});
 await assert.rejects(()=>f.hostWrite(initial()),error=>error.code==='STALE_BASE');assert.equal(f.storage[KEY].open,false);
});

test('reset failure never acknowledges, broadcasts or changes geometry, and its queue can recover',{timeout:5000},async()=>{
 const f=ownerFixture(),before=clone(f.storage),set=f.api.storage.local.set;f.api.storage.local.set=async()=>{throw Error('quota');};
 await assert.rejects(()=>f.reset());assert.deepEqual(f.storage,before);assert.equal(f.sent.length,0);f.api.storage.local.set=set;assert.deepEqual(await f.reset(),{status:'reset',changed:true});
 const get=f.api.storage.local.get;f.api.storage.local.get=async()=>{throw Error('read failed');};await assert.rejects(()=>f.status());await assert.rejects(()=>f.reset());f.api.storage.local.get=get;
 assert.equal(f.storage[KEY].positionGeneration,1);
});

test('consent revoked while a storage read is pending prevents the reset write',{timeout:5000},async()=>{
 const f=ownerFixture(),get=f.api.storage.local.get;f.api.storage.local.get=async key=>{const state=await get(key);f.revoke();return state;};
 await assert.rejects(()=>f.reset(),error=>error.code==='CONSENT_REQUIRED');assert.equal(f.writes.length,0);assert.equal(f.sent.length,0);
});

test('reset notification is geometry-only, avoids unsupported/private/discarded tabs, and missing hosts do not fabricate acknowledgements',{timeout:5000},async()=>{
 const f=ownerFixture();f.tabs.set(9,{id:9,url:'https://other.example/'});f.tabs.set(10,{id:10,url:'https://chatgpt.com/c/private',incognito:true});f.tabs.set(11,{id:11,url:'https://chatgpt.com/c/discarded',discarded:true});
 assert.deepEqual(await f.reset(),{status:'reset',changed:true});await tick();assert.deepEqual(f.sent.map(([id])=>id),[7,8]);
 for(const [,message,options]of f.sent){assert.deepEqual(message,{type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration:1});assert.deepEqual(options,{frameId:0});}
 f.api.tabs.query=async()=>{throw Error('browser unavailable');};assert.deepEqual(await f.reset(),{status:'reset',changed:false});
});

test('two open windows reconcile geometry during drag without replacing a card, draft, IME or focused editor',{timeout:5000},async()=>{
 const f=ownerFixture(),first=await hostFixture(f,7),second=await hostFixture(f,8),frames=[first.frame,second.frame];
 for(const h of [first,second]){h.frame.editor={draft:'合成草稿 🙂',composing:true,selection:[2,4]};h.frame.focus();}
 first.fire('pointerdown');first.fire('pointermove',{clientX:420,clientY:310});await first.flush();assert.notEqual(first.position,null);
 const before=clone(f.storage.unrelated);assert.deepEqual(await f.reset(),{status:'reset',changed:true});await first.flush();await second.flush();
 for(const [index,h]of [first,second].entries()){assert.equal(h.frame,frames[index]);assert.equal(h.frame.isConnected,true);assert.equal(h.focused,frames[index]);assert.deepEqual(h.frame.editor,{draft:'合成草稿 🙂',composing:true,selection:[2,4]});assert.equal(h.position,null);}
 const count=f.writes.length;first.fire('pointermove',{clientX:600,clientY:400});first.fire('pointerup');first.fire('click',{detail:1});await first.flush();assert.equal(f.writes.length,count);assert.equal(first.frame,frames[0]);assert.equal(f.storage[KEY].position,null);assert.equal(f.storage[KEY].open,true);assert.deepEqual(f.storage.unrelated,before);
 first.fire('pointerdown');first.fire('pointermove',{clientX:300,clientY:260});first.fire('pointerup');await first.flush();assert.notEqual(f.storage[KEY].position,null);assert.equal(f.storage[KEY].positionGeneration,1);assert.equal(first.frame,frames[0]);
});

test('a delayed successful pre-reset save acknowledgement cannot undo reset or a fresh post-reset drag',{timeout:5000},async()=>{
 const f=ownerFixture(),h=await hostFixture(f),gate=deferred(),entered=deferred();
 h.setReplyTransform(async(request,response)=>{if(request.state&&response.ok){entered.resolve();await gate.promise;}return response;});
 h.fire('keydown',{altKey:true,key:'ArrowLeft'});await entered.promise;await f.reset();await h.flush();assert.equal(h.position,null);
 h.setReplyTransform(async(_request,response)=>response);h.fire('keydown',{altKey:true,key:'ArrowRight'});await h.flush();const current=clone(h.position);assert.notEqual(current,null);
 gate.resolve();await h.flush();assert.deepEqual(h.position,current);assert.deepEqual(f.storage[KEY].position,current);
 h.receive({type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration:1});await h.flush();assert.deepEqual(h.position,current,'duplicate delayed reset cannot undo the fresh move');
});

test('missed reset broadcasts cause one read-only stale-save reconciliation without write replay or card loss',{timeout:5000},async()=>{
 const f=ownerFixture(),h=await hostFixture(f),frame=h.frame,send=f.api.tabs.sendMessage;f.api.tabs.sendMessage=async()=>{throw Error('temporarily unreachable');};
 await f.reset();f.api.tabs.sendMessage=send;h.fire('keydown',{altKey:true,key:'ArrowLeft'});await h.flush();assert.equal(h.position,null);assert.equal(h.frame,frame);assert.equal(f.storage[KEY].position,null);
 assert.equal(h.outbound.filter(request=>request.state).length,2,'initial open save plus one rejected gesture only');assert.equal(f.storage[KEY].positionGeneration,1);
});

test('revisit and next initialization apply persisted reset after a missed broadcast, without changing local open state',{timeout:5000},async()=>{
 const f=ownerFixture(),h=await hostFixture(f),frame=h.frame;f.api.tabs.sendMessage=async()=>{throw Error('host unavailable');};await f.reset();await h.revisit();assert.equal(h.position,null);assert.equal(h.frame,frame);
 f.restart();const second=await hostFixture(f,8);assert.equal(second.position,null);assert.equal(second.frame.isConnected,true);assert.equal(f.storage[KEY].positionGeneration,1);
});

test('untrusted or malformed reset messages do not move the host or disturb an active drag',{timeout:5000},async()=>{
 const f=ownerFixture(),h=await hostFixture(f),before=clone(h.position);h.fire('pointerdown');h.fire('pointermove',{clientX:280});await h.flush();const dragged=clone(h.position);
 for(const [message,sender]of [[{type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration:1},{id:'foreign'}],[{type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration:1},{id:'ext',tab:{id:8}}],...[-1,1.2,NaN,Number.MAX_SAFE_INTEGER+1,undefined].map(positionGeneration=>[{type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration},{id:'ext'}])])h.receive(message,sender);
 await h.flush();assert.deepEqual(h.position,dragged);assert.notDeepEqual(h.position,before);h.fire('pointerup');await h.flush();assert.equal(f.storage[KEY].positionGeneration,0);
});

test('reset acknowledgement waits for persistence and failed reset leaves both live cards and active drag alone',{timeout:5000},async()=>{
 const f=ownerFixture(),first=await hostFixture(f,7),second=await hostFixture(f,8),gate=deferred(),entered=deferred(),set=f.api.storage.local.set;
 const frames=[first.frame,second.frame],positions=[clone(first.position),clone(second.position)];let resolved=false;
 f.api.storage.local.set=async()=>{entered.resolve();await gate.promise;throw Error('storage unavailable');};
 const result=f.reset().then(()=>{resolved=true;},()=>{});await entered.promise;await tick();assert.equal(resolved,false);assert.equal(f.sent.length,0);
 gate.resolve();await result;await first.flush();await second.flush();assert.equal(resolved,false);
 assert.equal(first.frame,frames[0]);assert.equal(second.frame,frames[1]);assert.deepEqual(first.position,positions[0]);assert.deepEqual(second.position,positions[1]);
 f.api.storage.local.set=set;first.fire('keydown',{altKey:true,key:'ArrowRight'});await first.flush();assert.equal(f.storage[KEY].positionGeneration,0);
});

test('two concurrent resets consume distinct generations, and a delayed older broadcast cannot restore a newer drag',{timeout:5000},async()=>{
 const f=ownerFixture(),h=await hostFixture(f);await Promise.all([f.reset(),f.reset()]);await h.flush();assert.equal(f.storage[KEY].positionGeneration,2);
 h.fire('keydown',{altKey:true,key:'ArrowLeft'});await h.flush();const position=clone(h.position);assert.notEqual(position,null);
 h.receive({type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration:1});await h.flush();assert.deepEqual(h.position,position);assert.deepEqual(f.storage[KEY].position,position);
});


test('Archive callers retain strict canonical Root fragments when entering Settings', {timeout:5000},async()=>{
 const f=ownerFixture();
 for(const url of [f.archive.url,topicRootURL('topic:synthetic',null,f.archive.url),topicRootURL('中文 topic','section:1',f.archive.url)]){
  const sender={...f.archive,url};assert.deepEqual(await f.owner.handle({type:STATUS},sender),{status:'ready',position:f.storage[KEY].position===null?'default':'custom'});
  assert.equal((await f.owner.handle({type:RESET},sender)).status,'reset');
 }
 for(const suffix of ['?q=1#paia-thought?topic=t','#paia-thought?topic=t&topic=u','#paia-thought?section=s&topic=t','#paia-thought?topic=','#paia-thought?topic=t&extra=x','#paia-thought?topic=a%20b','#paia-thought?topic=t&section='])for(const type of [STATUS,RESET]){
  await assert.rejects(()=>f.owner.handle({type},{...f.archive,url:f.archive.url+suffix}),error=>error.code==='FORBIDDEN');
 }
 assert.equal(f.writes.length,3);
});

test('a notified host can read the new generation without reentering a locked geometry queue', {timeout:5000},async()=>{
 const f=ownerFixture(),reads=[];f.api.tabs.sendMessage=async(id)=>{reads.push(await f.hostRead(id));};
 await f.reset();await tick();assert.equal(reads.length,2);assert.ok(reads.every(state=>state.position===null&&state.positionGeneration===1));
});

test('a reset arriving before the first HOST reply prevents old initialization from restoring position', {timeout:5000},async()=>{
 const f=ownerFixture(),entered=deferred(),gate=deferred();let first=true;
 const pending=hostFixture(f,7,async(request,response)=>{
  if(first&&!request.state){first=false;entered.resolve();await gate.promise;}return response;
 });
 await entered.promise;await f.reset();gate.resolve();const h=await pending;
 assert.equal(h.position,null);assert.equal(h.frame.isConnected,true);
 assert.equal(h.outbound.find(request=>request.state).state.positionGeneration,1);
 assert.equal(f.storage[KEY].position,null);assert.equal(f.storage[KEY].positionGeneration,1);
});

test('default open geometry uses safe lateral space when a tall composer leaves no vertical band',{timeout:5000},()=>{
 const sandbox={};vm.runInNewContext(layoutSource,sandbox);
 for(const form of [{left:800,right:1200,top:50,bottom:850},{left:80,right:480,top:50,bottom:850},{left:800,right:1400,top:-50,bottom:950},{left:-200,right:480,top:-50,bottom:950}]){
  const actual=sandbox.PAIAPromptLayout(1280,900,form,null,true);assert.ok(actual?.card,'a viable default lateral card must remain visible');
  for(const box of [actual.orb,actual.card]){
   assert.ok(box.x>=8&&box.y>=8&&box.x+box.w<=1272&&box.y+box.h<=892);
   assert.ok(box.x+box.w<=form.left-8||box.x>=form.right+8,'both card and visible handle avoid the tall composer');
  }
  assert.equal(actual.orb.x,actual.card.x+actual.card.w-40);assert.equal(actual.orb.y,actual.card.y-32);
 }
});

test('reset keeps a lateral editor visible and preserves its draft/focus while retaining null device position',{timeout:5000},async()=>{
 let resetBounds;
 for(const position of [{x:.2,y:.3},{x:.05,y:.65}]){
  const f=ownerFixture({...initial(),position});f.composerBounds={left:800,right:1200,top:50,bottom:850};
  const h=await hostFixture(f),frame=h.frame;assert.ok(frame);assert.equal(frame.hidden,false);
  frame.editor={draft:'retained draft 中文',composing:true,selection:[1,4]};frame.focus();
  assert.deepEqual(await f.reset(),{status:'reset',changed:true});await h.flush();
  assert.equal(h.frame,frame);assert.equal(frame.hidden,false);assert.equal(h.focused,frame);
  assert.deepEqual(frame.editor,{draft:'retained draft 中文',composing:true,selection:[1,4]});
  assert.equal(h.position,null);assert.equal(f.storage[KEY].position,null);assert.equal(f.storage[KEY].open,true);
  const bounds=frame.getAttribute('style');if(resetBounds)assert.equal(bounds,resetBounds,'reset placement cannot reuse either previous custom offset');resetBounds=bounds;
  assert.deepEqual(await f.reset(),{status:'reset',changed:false});await h.flush();assert.equal(frame.hidden,false);assert.equal(frame.getAttribute('style'),bounds);
 }
});
