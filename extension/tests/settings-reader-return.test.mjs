import test from 'node:test';
import assert from 'node:assert/strict';
import {RouteHistory} from '../ui/route-history.js';

// Exercise the real shell mount and real Settings Back listener. Only the
// presentation-only DOM and Chrome read boundary are synthetic.
class Node {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners=new Map();this.dataset={};this.style={setProperty(){}};this.classList={add(){},toggle(){}};this.hidden=false;this.value='';this.textContent='';}
 append(...nodes){for(const node of nodes){node.parentElement?.children.splice(node.parentElement.children.indexOf(node),1);node.parentElement=this;this.children.push(node);}}
 prepend(...nodes){this.append(...nodes);this.children=[...nodes,...this.children.filter(node=>!nodes.includes(node))];}
 insertBefore(node,before){this.append(node);if(before){this.children.pop();this.children.splice(this.children.indexOf(before),0,node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(name,value){this[name]=value;}
 getAttribute(name){return this[name];}
 addEventListener(type,fn){this.listeners.set(type,fn);}
 querySelector(){return null;}
 querySelectorAll(){return [];}
 closest(){return this.parentElement;}
 click(){return this.listeners.get('click')?.();}
}

test('Settings Back preserves the existing Reader parent through repeated returns and history reload',async()=>{
 const names=['document','navigator','chrome','CustomEvent'],previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const nodes=[],make=(tag='div',id='')=>{const node=new Node(tag);node.id=id;nodes.push(node);return node;},body=make(),main=make(),header=make(),bottom=make();
 const buttons=new Map(['library','thoughts','memory','settings'].map(view=>[view,make('button')]));
 const doc={body,documentElement:Object.assign(make(),{lang:'zh-CN'}),activeElement:null,createElement:tag=>make(tag),createElementNS:(_ns,tag)=>make(tag),addEventListener(){},dispatchEvent(){},getElementById:id=>nodes.find(node=>node.id===id)||null,querySelectorAll:()=>[],querySelector:selector=>selector==='.workspace'?main:selector==='.workspace-header'?header:selector==='.sidebar-bottom'?bottom:buttons.get(selector.match(/^\.sidebar \[data-view="(.*)"\]$/)?.[1])||null};
 for(const id of ['scope-search-host','archive-navigator-toggle','input-time-order','document-menu','save-status','thought-root-header','thought-home-tools','thought-root-source','thought-source-scope-label','thought-topic-header','topic-search','settings-panel','universal-search-dialog','revisit-open','ux-example-dialog'])make('div',id);
 make().append(make('input','consent-check'));const heading=make('div','workspace-heading');header.append(heading);make('div','archive-root-heading');make('div','thought-root-heading');
 const reads=[];
 for(const [name,value]of Object.entries({document:doc,navigator:{language:'zh-CN'},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},chrome:{runtime:{onMessage:{addListener(){}},sendMessage:async message=>{reads.push(message);assert.equal(message.type,'GET_PAGE');return {ok:true,data:{settings:{consentVersion:0},preferences:{}}};}}}}))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 try{
  const {AppShellController}=await import('../ui/app-shell.js');
  const owner=new AppShellController(),calls=[];
  owner.installArchivePresentation=()=>{};owner.presentArchiveComposition=()=>{};owner.localize=()=>{};
  owner.navigate=(...args)=>{calls.push(args);return false;};
  owner.mount();await new Promise(resolve=>setImmediate(resolve));
  const back=doc.getElementById('ux-settings-back');assert.ok(back);assert.equal(reads.length,1);
  const history=new RouteHistory();
  for(const parent of ['library','archive','revisit']){
   const before={view:parent==='archive'?'archive':'library',documentId:'synthetic-conversation',topicId:null,returnTo:parent,searchQuery:'SYNTHETIC reader query',anchor:{documentId:'synthetic-conversation',inputId:'synthetic-input',offset:12,sort:'desc'}};
   for(let round=0;round<2;round++){
    owner.route=before;owner.present({view:'settings'},{consented:true});owner.present({view:'settings'},{consented:true});
    assert.equal(owner.settingsReturn,before,'Settings refresh cannot replace its captured Reader');
    assert.equal(back.click(),false,'Back preserves the navigation owner leave refusal');
    assert.equal(doc.getElementById('ux-settings-back'),back,'same Back control and listener remain mounted');
    const [view,id,contextId,options]=calls.at(-1);
    assert.deepEqual([view,id,contextId],[before.view,before.documentId,null]);
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
  owner.route={view:'library',documentId:null,returnTo:null};owner.present({view:'settings'},{consented:true});back.click();
  assert.deepEqual(calls.at(-1),['library',null,null,{topicId:undefined,returnTo:null,searchQuery:undefined,anchor:undefined}]);
 }finally{for(const [name,value]of previous)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}
});
