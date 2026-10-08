import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveNavigator,ArchiveNavigatorState,navigatorGroupKey} from '../ui/archive-navigator.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

class Node extends PresentationNode {
 constructor(tag='div',namespaceURI){super(tag,namespaceURI);this.handlers={};}
 addEventListener(type,fn){this.handlers[type]=fn;}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return rows;if(selector.startsWith('.'))return rows.filter(n=>n.classList.contains(selector.slice(1)));const key=selector.match(/^\[data-ans-nav-key="(.*)"\]$/)?.[1];return rows.filter(n=>n.dataset.ansNavKey===key);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
}
async function fixture(run){
 const prior=new Map(['document','chrome','CSS'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const body=new Node('body'),home=new Node(),slot=new Node(),back=new Node('button'),host=new Node('aside'),head=new Node('header'),tree=new Node();home.id='archive-reader-navigator-slot';slot.id='archive-reader-back-slot';back.id='back';const reader=new Node();reader.id='reader-compact-tools';body.append(home,reader);reader.append(slot);home.append(host);slot.append(back);host.append(head,tree);
 globalThis.document={body,documentElement:{lang:'zh-CN'},activeElement:null,createElement:tag=>new Node(tag),createElementNS:(namespace,tag)=>new Node(tag,namespace),getElementById:id=>body.querySelectorAll('*').find(n=>n.id===id)||null};globalThis.CSS={escape:x=>x};globalThis.chrome={runtime:{sendMessage(){throw Error('No data reads/writes admitted by this presentation test');}}};
 try{
  const state=new ArchiveNavigatorState(),groups=['first','second','current'].map((title,i)=>({id:title,kind:'group',providerKey:'chatgpt',groupKind:'project',title,projectRef:{providerKey:'chatgpt',namespace:'synthetic',projectId:String(i)}}));
  const scope=(options,items)=>Object.assign(state.scope(options),{coverage:{state:'complete'},items,nextCursor:'synthetic-next',generation:7});
  scope({groupKind:'providers'},[{providerKey:'other'},{providerKey:'chatgpt'}]);scope({providerKey:'other',groupKind:'groups'},[]);scope({providerKey:'chatgpt',groupKind:'groups'},groups);
  for(const g of groups)scope({providerKey:g.providerKey,groupKind:g.groupKind,projectRef:g.projectRef},[{documentId:g.title==='current'?'selected':g.title,title:g.title,providerKey:g.providerKey,groupKind:g.groupKind,projectRef:g.projectRef}]);
  state.select({available:true,documentId:'selected',providerKey:'chatgpt',groupKind:'project',projectRef:groups[2].projectRef});
  const owner=Object.assign(Object.create(ArchiveNavigator.prototype),{active:true,reader:true,selectedDocumentId:'selected',state,host,tree,media:{matches:false},duplicateLabels:new Map(),mode:'paia',sourceScope:null,sheetOpen:false,onRouteChange(){},syncLegacy(){}});
  await run({owner,state,groups,home,slot,back,host,tree,reader});
 }finally{for(const [k,v]of prior)if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}
}
const titles=tree=>tree.querySelectorAll('.archive-navigator-group-toggle').map(n=>n.textContent);
test('Reader keeps provider/group DOM order while every source scope/order/cursor stays intact',()=>fixture(({owner,state,tree,groups,slot,reader})=>{
 const before=structuredClone([...state.scopes]);owner.paint();assert.deepEqual(titles(tree),['first','second','current']);assert.equal(tree.children[0].dataset.providerKey,'other');assert.equal(slot.parentElement,reader);assert.deepEqual([...state.scopes],before);assert.deepEqual(state.scope({providerKey:'chatgpt',groupKind:'groups'}).items,groups);
}));
test('Collapsed or not-yet-loaded selected window keeps its real group header and collapse handler',()=>fixture(async({owner,state,groups,tree})=>{
 owner.paint();await owner.toggleGroup(groups[2]);assert.equal(state.expanded.has(navigatorGroupKey('chatgpt','project',groups[2].projectRef)),false);assert.equal(titles(tree)[2],'current');const button=tree.querySelectorAll('.archive-navigator-group-toggle')[2];assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(typeof button.handlers.click,'function');
 state.scope(owner.groupOptions(groups[2])).items=[];owner.lastPaintSignature=null;owner.paint();assert.equal(titles(tree)[2],'current');assert.equal(owner.host.classList.contains('has-reader-context'),false);
}));
test('Desktop, compact and Root restore the ordinary DOM order and stable Back slot without losing focused Back',()=>fixture(({owner,tree,slot,home,back,host,reader})=>{
 owner.paint();back.focus();owner.media.matches=true;owner.layout();assert.deepEqual(titles(tree),['first','second','current']);assert.equal(slot.parentElement,reader);assert.equal(document.activeElement,back);
 owner.media.matches=false;owner.layout();assert.deepEqual(titles(tree),['first','second','current']);assert.equal(slot.parentElement,reader);assert.equal(document.activeElement,back);
 owner.reader=false;owner.paint();assert.deepEqual(titles(tree),['first','second','current']);assert.equal(slot.parentElement,reader);assert.equal(document.activeElement,back);
}));
test('Unavailable, stale-document and absent-group selections keep generic Back and every available group',()=>fixture(({owner,state,tree,slot,home,reader})=>{
 for(const path of [{...state.selectedPath,available:false},{...state.selectedPath,documentId:'obsolete'},{...state.selectedPath,projectRef:{providerKey:'chatgpt',namespace:'synthetic',projectId:'absent'}}]){state.selectedPath=path;owner.paint();assert.deepEqual(titles(tree),['first','second','current']);assert.equal(slot.parentElement,reader);assert.equal(owner.host.classList.contains('has-reader-context'),false);}
}));
test('The sole layout boundary restores focus only after host visibility and fixed slot stability',()=>fixture(({owner,host,slot,home,reader})=>{
 const phases=[];host.hidden=true;owner.beforeLayout=()=>{phases.push(['before',host.hidden,slot.parentElement]);return()=>phases.push(['after',host.hidden,slot.parentElement]);};
 owner.layout();assert.equal(phases[0][0],'before');assert.equal(phases[0][1],true);assert.deepEqual(phases[1],['after',false,reader]);
}));

test('Inactive Archive still projects the shared primary navigation at a breakpoint without touching its tree',()=>{const calls=[];ArchiveNavigator.prototype.layout.call({active:false,beforeLayout(){calls.push('shared layout');return()=>calls.push('restore');},paint(){throw Error('Inactive Archive tree must not repaint');}});assert.deepEqual(calls,['shared layout','restore']);});


test('Selected-only and root/Reader transitions preserve every directory node, expansion and scroll',()=>fixture(({owner,state,groups,tree,host})=>{
 for(const group of groups)state.expanded.add(navigatorGroupKey(group.providerKey,group.groupKind,group.projectRef));
 state.scrollTop=237;owner.paint();const nodes=tree.querySelectorAll('*'),order=titles(tree),expanded=[...state.expanded];assert.equal(host.scrollTop,237);
 for(const [id,reader] of [['first',true],['second',true],[null,false],['selected',true]]){
  owner.selectedDocumentId=id;owner.reader=reader;
  const group=groups.find(g=>(g.title==='current'?'selected':g.title)===id);
  owner.selectPath(group?{available:true,documentId:id,providerKey:group.providerKey,groupKind:group.groupKind,projectRef:group.projectRef}:null);owner.paint();
  const after=tree.querySelectorAll('*');assert.equal(after.length,nodes.length);after.forEach((node,i)=>assert.equal(node,nodes[i]));assert.deepEqual(titles(tree),order);assert.deepEqual([...state.expanded],expanded);assert.equal(host.scrollTop,237);
  assert.deepEqual(tree.querySelectorAll('.archive-navigator-window').filter(n=>n.getAttribute('aria-current')==='page').map(n=>n.dataset.documentId),id?[id]:[]);
 }
}));

test('A late selected-path reply cannot replace a newer selected Conversation or reopen its old group',()=>fixture(async({owner,state,groups})=>{
 let release;chrome.runtime.sendMessage=()=>new Promise(resolve=>release=resolve);const old=structuredClone(state.selectedPath),pending=owner.refreshSelection('selected');
 owner.selectedDocumentId='first';owner.selectPath({available:true,documentId:'first',providerKey:'chatgpt',groupKind:'project',projectRef:groups[0].projectRef});const before=state.snapshot();
 release({ok:true,data:{selectedPath:old}});await pending;assert.deepEqual(state.snapshot(),before);
 owner.selectedDocumentId=null;owner.selectPath(null);const blank=state.snapshot();owner.selectPath(old);assert.deepEqual(state.snapshot(),blank);
}));


test('Same-window metadata refresh never reopens a group the user collapsed',()=>fixture(async({owner,state,groups})=>{
 const path=structuredClone(state.selectedPath);await owner.toggleGroup(groups[2]);const before=state.snapshot();owner.selectPath({...path});assert.deepEqual(state.snapshot(),before);
}));


test('A real selected Conversation membership move still reveals its new source group',()=>fixture(({owner,state,groups})=>{
 const before=state.selectedPath,oldKey=navigatorGroupKey(before.providerKey,before.groupKind,before.projectRef),target=groups[0],newKey=navigatorGroupKey(target.providerKey,target.groupKind,target.projectRef);assert.equal(state.expanded.has(newKey),false);
 owner.selectPath({...before,projectRef:target.projectRef});assert.equal(state.expanded.has(newKey),true);assert.equal(state.expanded.has(oldKey),true,'direct page projection preserves unrelated existing expansion');
 state.expanded.delete(newKey);owner.selectPath({...state.selectedPath});assert.equal(state.expanded.has(newKey),false,'subsequent unchanged metadata respects the user collapse');
}));
