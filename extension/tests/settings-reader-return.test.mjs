import test from 'node:test';
import assert from 'node:assert/strict';
import {RouteHistory} from '../ui/route-history.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

// Attribute-only DOM fixture: records are collected synchronously and delivered
// in one microtask, independently of event listeners. It grants no UI consent
// and is not a replacement for the owning native-browser dialog verification.
class PresentationMutationObserver {
 static active=new Set();
 constructor(callback){assert.equal(typeof callback,'function');this.callback=callback;this.targets=new Map();this.records=[];this.queued=false;}
 observe(target,options={}){
  assert.ok(target instanceof Node,'observe requires a presentation node');
  const attributes=options.attributes??(options.attributeFilter!==undefined||options.attributeOldValue!==undefined);
  assert.ok(attributes&&!options.childList&&!options.characterData,'this fixture only models attribute observations');
  const filter=options.attributeFilter===undefined?null:Array.from(options.attributeFilter,String);
  this.targets.set(target,{attributes:true,attributeFilter:filter,attributeOldValue:!!options.attributeOldValue,subtree:!!options.subtree});PresentationMutationObserver.active.add(this);
 }
 takeRecords(){return this.records.splice(0);}
 disconnect(){this.targets.clear();this.records.length=0;PresentationMutationObserver.active.delete(this);}
 record(target,attributeName,oldValue){
  const matches=[...this.targets].filter(([node,options])=>(node===target||(options.subtree&&node.contains(target)))&&(!options.attributeFilter||options.attributeFilter.includes(attributeName)));
  if(!matches.length)return;
  this.records.push({type:'attributes',target,attributeName,attributeNamespace:null,oldValue:matches.some(([,options])=>options.attributeOldValue)?oldValue:null});
  if(this.queued)return;this.queued=true;
  queueMicrotask(()=>{this.queued=false;const records=this.takeRecords();if(records.length)this.callback(records,this);});
 }
}

// Exercise the real shell mount and real Settings Back listener. Only the
// presentation-only DOM and Chrome read boundary are synthetic.
class Node extends PresentationNode {
 constructor(tag='div',namespaceURI){super(tag,namespaceURI);this.style={setProperty(){}};}
 get open(){return this.attributes.has('open');}
 set open(value){if(value)this.setAttribute('open','');else this.removeAttribute('open');}
 get hidden(){return this.attributes.has('hidden');}
 set hidden(value){if(value)this.setAttribute('hidden','');else this.removeAttribute('hidden');}
 setAttribute(name,value){const oldValue=this.getAttribute(name);if(name==='open'||name==='hidden')this.attributes.set(name,String(value));else super.setAttribute(name,value);for(const observer of PresentationMutationObserver.active)observer.record(this,name,oldValue);}
 removeAttribute(name){const oldValue=this.getAttribute(name);if(oldValue===null)return;if(name==='open'||name==='hidden')this.attributes.delete(name);else super.removeAttribute(name);for(const observer of PresentationMutationObserver.active)observer.record(this,name,oldValue);}
 querySelector(){return null;}
 querySelectorAll(){return [];}
 closest(){return this.parentElement;}
 after(...nodes){const parent=this.parentElement,before=this.nextSibling;if(parent)for(const node of nodes)parent.insertBefore(node,before);}
 click(){return this.listeners.get('click')?.();}
}

test('Settings Back preserves the existing Reader parent through repeated returns and history reload',async()=>{
 const names=['document','navigator','chrome','CustomEvent','window','history','location','MutationObserver'],previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const nodes=[],make=(tag='div',id='',namespaceURI)=>{const node=new Node(tag,namespaceURI);node.id=id;nodes.push(node);return node;},body=make(),main=make(),header=make(),bottom=make(),menuGlyph=make('span');
 const buttons=new Map(['library','thoughts','memory','settings'].map(view=>[view,make('button')]));
 const doc={body,documentElement:Object.assign(make(),{lang:'zh-CN'}),activeElement:null,createElement:tag=>make(tag),createElementNS:(namespace,tag)=>make(tag,'',namespace),addEventListener(){},dispatchEvent(){},getElementById:id=>nodes.find(node=>node.id===id)||null,querySelectorAll:()=>[],querySelector:selector=>selector==='.workspace'?main:selector==='.workspace-header'?header:selector==='.sidebar-bottom'?bottom:selector==='.document-menu-glyph'?menuGlyph:buttons.get(selector.match(/^\.sidebar \[data-view="(.*)"\]$/)?.[1])||null};
 for(const id of ['scope-search-host','archive-navigator-toggle','input-time-order','document-menu','save-status','thought-root-header','thought-home-tools','thought-root-source','thought-source-scope-label','thought-topic-header','topic-search','settings-panel','settings-prompt-status','universal-search-dialog','revisit-open','ux-example-dialog','toggle-capture'])make('div',id);
 // Mirror archive.html's actual Home container before the shared shell mounts.
 const thoughtPanel=make('section','thought-panel');main.append(thoughtPanel);header.append(doc.getElementById('thought-root-header'));thoughtPanel.append(doc.getElementById('thought-home-tools'),doc.getElementById('thought-root-source'));
 make().append(make('input','consent-check'));const heading=make('div','workspace-heading');header.append(heading);make('div','archive-root-heading');make('div','thought-root-heading');
 const reads=[];
 for(const [name,value]of Object.entries({MutationObserver:PresentationMutationObserver,document:doc,navigator:{language:'zh-CN'},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},chrome:{runtime:{getManifest:()=>({version:'0.15.0'}),onMessage:{addListener(){}},sendMessage:async message=>{reads.push(message);if(message.type==='PAIA_PROMPT_ASSIST_STATUS'){assert.deepEqual(message,{type:'PAIA_PROMPT_ASSIST_STATUS'});return {ok:true,data:{replyAccess:false,remoteProcessing:false,generation:'synthetic-assist-session',serviceAvailable:false}};}if(message.type==='PAIA_PROMPT_NEXT_STATUS'){assert.deepEqual(message,{type:'PAIA_PROMPT_NEXT_STATUS'});return {ok:true,data:{enabled:false,generation:'synthetic-session'}};}if(message.type==='PAIA_PROMPT_SURFACE_SETTINGS_STATUS'){assert.deepEqual(message,{type:'PAIA_PROMPT_SURFACE_SETTINGS_STATUS'});return {ok:true,data:{status:'consent_required'}};}if(message.type==='PAIA_SETTINGS_AI_STYLE'){assert.deepEqual(message,{type:'PAIA_SETTINGS_AI_STYLE'});return {ok:true,data:{available:true,value:'balanced',revision:0,explicit:false,epoch:'initial'}};}assert.deepEqual(message,{type:'GET_PAGE',page:{view:'settings'}});return {ok:true,data:{settings:{consentVersion:0},preferences:{}}};}}}}))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 try{
  const {AppShellController}=await import('../ui/app-shell.js');
  const owner=new AppShellController(),calls=[];
  owner.installArchivePresentation=()=>{};owner.presentArchiveComposition=()=>{};owner.localize=()=>{};
  owner.navigate=(...args)=>{calls.push(args);return false;};
  owner.mount();await new Promise(resolve=>setImmediate(resolve));
  const dialog=doc.getElementById('settings-maintenance-consent'),observers=[...PresentationMutationObserver.active];
  assert.ok(dialog);assert.equal(observers.length,1,'real shell creates its mandatory Maintenance observer');
  assert.equal(observers[0].targets.size,1);assert.deepEqual(observers[0].targets.get(dialog),{attributes:true,attributeFilter:['open'],attributeOldValue:true,subtree:false},'the real presenter observes its own dialog open attribute with prior values');
  const back=doc.getElementById('ux-settings-back');assert.ok(back);assert.deepEqual(reads.map(message=>message.type).sort(),['GET_PAGE','PAIA_PROMPT_ASSIST_STATUS','PAIA_PROMPT_NEXT_STATUS','PAIA_PROMPT_SURFACE_SETTINGS_STATUS','PAIA_SETTINGS_AI_STYLE']);
  const history=new RouteHistory();
  for(const parent of ['library','archive','revisit']){
   const before={originKey:'11111111-1111-4111-8111-111111111111',view:parent==='archive'?'archive':'library',documentId:'synthetic-conversation',topicId:null,returnTo:parent,searchQuery:'SYNTHETIC reader query',anchor:{documentId:'synthetic-conversation',inputId:'synthetic-input',offset:12,sort:'desc'}};
   for(let round=0;round<2;round++){
    owner.route=before;owner.present({view:'settings'},{consented:true});owner.present({view:'settings'},{consented:true});
    assert.equal(owner.settingsReturn,before,'Settings refresh cannot replace its captured Reader');
    assert.equal(back.click(),false,'Back preserves the navigation owner leave refusal');
    assert.equal(doc.getElementById('ux-settings-back'),back,'same Back control and listener remain mounted');
    const [view,id,contextId,options]=calls.at(-1);
    assert.deepEqual([view,id,contextId],[before.view,before.documentId,null]);
    assert.equal(options.originKey,before.originKey,'Settings retains the opaque same-tab Archive origin');
    assert.equal(options.returnTo,parent,'the Reader parent must not become Settings');
    assert.equal(options.searchQuery,before.searchQuery);assert.equal(options.anchor,before.anchor);
    assert.equal(owner.route.view,'settings','a refused navigation is not bypassed by the shell');
    const saved=history.encode({...before,returnTo:options.returnTo});
    const restored=new RouteHistory().decode(saved);assert.equal(restored.returnTo,parent,'reload without tab-local view sessions keeps the Reader parent');
    assert.equal(restored.documentId,before.documentId);assert.deepEqual(restored.anchor,before.anchor);
   }
  }
  owner.route={view:'thoughts',topicId:'synthetic-topic',returnTo:'revisit'};owner.present({view:'settings'},{consented:true});back.click();
  assert.deepEqual(calls.at(-1),['thoughts',null,null,{topicId:'synthetic-topic',returnTo:'revisit',searchQuery:undefined,anchor:undefined}]);
  for(const contextCard of ['info','rules','now','inputs','connections']){owner.route={view:'memory',contextCard,returnTo:null};owner.present({view:'settings'},{consented:true});back.click();assert.equal(calls.at(-1)[3].contextCard,contextCard,'Settings returns to the same Context detail');const encoded=history.encode(owner.settingsReturn);assert.equal(new RouteHistory().decode(encoded).contextCard,contextCard,'cold history preserves each Context page');}
  for(const prior of [{view:'memory',contextCard:'info'},{view:'library',documentId:'cold-doc',returnTo:'archive',anchor:{documentId:'cold-doc',inputId:'cold-input',offset:33,sort:'asc'}}]){const saved=history.encode({view:'settings',settingsGroup:'reading',settingsReturn:prior});owner.settingsReturn={view:'library'};owner.restoreSettingsRoute(new RouteHistory().decode(saved));back.click();const [view,id,,options]=calls.at(-1);assert.equal(view,prior.view);assert.equal(id,prior.documentId||null);assert.equal(options.contextCard,prior.contextCard);assert.deepEqual(options.anchor,prior.anchor||null);}
  const fresh={view:'library',documentId:'fresh-reader',anchor:{documentId:'fresh-reader',inputId:'latest',offset:99}};owner.route={view:'library',documentId:'fresh-reader',anchor:{inputId:'stale',offset:0}};owner.rememberSettingsOrigin(fresh);owner.present({view:'settings'},{consented:true});back.click();assert.equal(calls.at(-1)[3].anchor,fresh.anchor);
  owner.route={view:'library',documentId:null,returnTo:null};owner.present({view:'settings'},{consented:true});back.click();
  assert.deepEqual(calls.at(-1),['library',null,null,{topicId:undefined,returnTo:null,searchQuery:undefined,anchor:undefined}]);
  globalThis.window={addEventListener(){}};globalThis.location={href:'chrome-extension://synthetic/ui/archive.html'};globalThis.history={state:null,replaceState(state){this.state=state;},pushState(state){this.state=state;}};
  const routes=owner.connect({current:()=>owner.route,navigate:async(view,id,contextId,options)=>{calls.push([view,id,contextId,options]);owner.present({view,documentId:id,contextCard:options.contextCard,returnTo:options.returnTo,anchor:options.anchor},{consented:true});return true;}});
  for(const origin of [{view:'memory',contextCard:'now'},{view:'library',documentId:'reload-doc',returnTo:'archive',anchor:{documentId:'reload-doc',inputId:'reload-input',offset:71}}]){owner.route={view:'library'};owner.settingsReturn={view:'library'};globalThis.history.state={paiaReader:new RouteHistory().encode({view:'settings',settingsGroup:'reading',settingsReturn:origin})};await routes.restore();assert.equal(owner.captureSettingsRoute().settingsGroup,'reading');assert.equal(owner.settingsReturn.view,origin.view);await back.click();const [view,id,,options]=calls.at(-1);assert.equal(view,origin.view);assert.equal(id,origin.documentId||null);assert.equal(options.contextCard,origin.contextCard);assert.deepEqual(options.anchor,origin.anchor||null);}
 }finally{
  for(const observer of PresentationMutationObserver.active)observer.disconnect();
  for(const [name,value]of previous)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];
  for(const [name,value]of previous)assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis,name),value,'restore exact global descriptor: '+name);
 }
});


test('Reader DOM observer filters attributes and batches exact old values at the microtask checkpoint',async t=>{
 const dialog=new Node('dialog'),other=new Node('dialog'),batches=[],observer=new PresentationMutationObserver((records,owner)=>batches.push({records,owner}));t.after(()=>observer.disconnect());
 const options={attributes:true,attributeFilter:['open'],attributeOldValue:true};observer.observe(dialog,options);options.attributeFilter.push('ignored');
 dialog.setAttribute('ignored','yes');other.open=true;dialog.removeAttribute('open');assert.deepEqual(observer.takeRecords(),[],'unobserved targets, filtered attributes and absent removals produce no records');
 dialog.open=true;dialog.open=false;dialog.setAttribute('open','restored');dialog.setAttribute('open','restored');assert.equal(batches.length,0,'callbacks are not synchronous');
 await Promise.resolve();assert.equal(batches.length,1);assert.equal(batches[0].owner,observer);
 assert.deepEqual(batches[0].records.map(({type,target,attributeName,attributeNamespace,oldValue})=>({type,target,attributeName,attributeNamespace,oldValue})),[null,'',null,'restored'].map(oldValue=>({type:'attributes',target:dialog,attributeName:'open',attributeNamespace:null,oldValue})));
 assert.deepEqual(observer.takeRecords(),[]);assert.equal(dialog.open,true);dialog.removeAttribute('open');assert.equal(dialog.open,false);await Promise.resolve();assert.equal(batches.length,2);
});
test('Reader DOM observer drains pending records and disconnects without later delivery',async t=>{
 const dialog=new Node('dialog'),batches=[],observer=new PresentationMutationObserver(records=>batches.push(records));t.after(()=>observer.disconnect());observer.observe(dialog,{attributeFilter:['open'],attributeOldValue:true});
 dialog.open=true;dialog.open=false;assert.deepEqual(observer.takeRecords().map(record=>record.oldValue),[null,'']);assert.deepEqual(observer.takeRecords(),[]);await Promise.resolve();assert.deepEqual(batches,[],'drained records are not delivered again');
 dialog.open=true;observer.disconnect();assert.equal(observer.targets.size,0);assert.deepEqual(observer.takeRecords(),[]);dialog.open=false;await Promise.resolve();assert.deepEqual(batches,[],'disconnect clears queued records and registrations');
 observer.observe(dialog,{attributes:true});dialog.setAttribute('title','first');dialog.setAttribute('title','second');await Promise.resolve();assert.equal(batches.length,1);assert.deepEqual(batches[0].map(record=>record.oldValue),[null,null],'old values require opt-in');
 observer.observe(dialog,{attributes:true,attributeFilter:['open'],attributeOldValue:true});dialog.setAttribute('title','third');assert.deepEqual(observer.takeRecords(),[],'repeat observe replaces options rather than adding a duplicate registration');dialog.open=true;await Promise.resolve();assert.equal(batches.length,2);
});
test('Reader DOM observer respects subtree opt-in and queues callback mutations separately',async t=>{
 const parent=new Node(),child=new Node('dialog'),batches=[],observer=new PresentationMutationObserver(records=>{batches.push(records);if(batches.length===1)child.open=false;});t.after(()=>observer.disconnect());parent.append(child);observer.observe(parent,{attributes:true,attributeFilter:['open']});child.open=true;await Promise.resolve();assert.deepEqual(batches,[]);
 child.open=false;observer.observe(parent,{attributes:true,attributeFilter:['open'],attributeOldValue:true,subtree:true});child.open=true;await Promise.resolve();assert.equal(batches.length,1);assert.equal(batches[0][0].target,child);assert.equal(batches[0][0].oldValue,null);await Promise.resolve();assert.equal(batches.length,2);assert.equal(batches[1][0].oldValue,'');
});
