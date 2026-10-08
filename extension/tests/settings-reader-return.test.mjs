import test from 'node:test';
import assert from 'node:assert/strict';
import {RouteHistory} from '../ui/route-history.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

// Exercise the real shell mount and real Settings Back listener. Only the
// presentation-only DOM and Chrome read boundary are synthetic.
class Node extends PresentationNode {
 constructor(tag='div',namespaceURI){super(tag,namespaceURI);this.style={setProperty(){}};}
 querySelector(){return null;}
 querySelectorAll(){return [];}
 closest(){return this.parentElement;}
 click(){return this.listeners.get('click')?.();}
}

test('Settings Back preserves the existing Reader parent through repeated returns and history reload',async()=>{
 const names=['document','navigator','chrome','CustomEvent','window','history','location'],previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const nodes=[],make=(tag='div',id='',namespaceURI)=>{const node=new Node(tag,namespaceURI);node.id=id;nodes.push(node);return node;},body=make(),main=make(),header=make(),bottom=make(),menuGlyph=make('span');
 const buttons=new Map(['library','thoughts','memory','settings'].map(view=>[view,make('button')]));
 const doc={body,documentElement:Object.assign(make(),{lang:'zh-CN'}),activeElement:null,createElement:tag=>make(tag),createElementNS:(namespace,tag)=>make(tag,'',namespace),addEventListener(){},dispatchEvent(){},getElementById:id=>nodes.find(node=>node.id===id)||null,querySelectorAll:()=>[],querySelector:selector=>selector==='.workspace'?main:selector==='.workspace-header'?header:selector==='.sidebar-bottom'?bottom:selector==='.document-menu-glyph'?menuGlyph:buttons.get(selector.match(/^\.sidebar \[data-view="(.*)"\]$/)?.[1])||null};
 for(const id of ['scope-search-host','archive-navigator-toggle','input-time-order','document-menu','save-status','thought-root-header','thought-home-tools','thought-root-source','thought-source-scope-label','thought-topic-header','topic-search','settings-panel','settings-prompt-status','universal-search-dialog','revisit-open','ux-example-dialog','toggle-capture'])make('div',id);
 make().append(make('input','consent-check'));const heading=make('div','workspace-heading');header.append(heading);make('div','archive-root-heading');make('div','thought-root-heading');
 const reads=[];
 for(const [name,value]of Object.entries({document:doc,navigator:{language:'zh-CN'},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},chrome:{runtime:{getManifest:()=>({version:'0.15.0'}),onMessage:{addListener(){}},sendMessage:async message=>{reads.push(message);if(message.type==='PAIA_PROMPT_NEXT_STATUS'){assert.deepEqual(message,{type:'PAIA_PROMPT_NEXT_STATUS'});return {ok:true,data:{enabled:false,generation:'synthetic-session'}};}if(message.type==='PAIA_PROMPT_SURFACE_SETTINGS_STATUS'){assert.deepEqual(message,{type:'PAIA_PROMPT_SURFACE_SETTINGS_STATUS'});return {ok:true,data:{status:'consent_required'}};}if(message.type==='PAIA_SETTINGS_AI_STYLE'){assert.deepEqual(message,{type:'PAIA_SETTINGS_AI_STYLE'});return {ok:true,data:{available:true,value:'balanced',revision:0,explicit:false,epoch:'initial'}};}assert.deepEqual(message,{type:'GET_PAGE',page:{view:'settings'}});return {ok:true,data:{settings:{consentVersion:0},preferences:{}}};}}}}))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 try{
  const {AppShellController}=await import('../ui/app-shell.js');
  const owner=new AppShellController(),calls=[];
  owner.installArchivePresentation=()=>{};owner.presentArchiveComposition=()=>{};owner.localize=()=>{};
  owner.navigate=(...args)=>{calls.push(args);return false;};
  owner.mount();await new Promise(resolve=>setImmediate(resolve));
  const back=doc.getElementById('ux-settings-back');assert.ok(back);assert.deepEqual(reads.map(message=>message.type).sort(),['GET_PAGE','PAIA_PROMPT_NEXT_STATUS','PAIA_PROMPT_SURFACE_SETTINGS_STATUS','PAIA_SETTINGS_AI_STYLE']);
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
 }finally{for(const [name,value]of previous)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}
});
