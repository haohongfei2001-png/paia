import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveNavigator,ArchiveNavigatorState,navigatorGroupKey} from '../ui/archive-navigator.js';

class Node {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.className='';this.textContent='';this.handlers={};this.classList={contains:c=>this.className.split(' ').includes(c),add:c=>{if(!this.classList.contains(c))this.className+=' '+c;},toggle:(c,on)=>{const yes=on??!this.classList.contains(c);this.className=this.className.split(' ').filter(x=>x&&x!==c).concat(yes?[c]:[]).join(' ');return yes;}};}
 get firstElementChild(){return this.children[0]||null;}get nextSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
 get isConnected(){return this===document.body||this.parentElement?.isConnected===true;}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
 remove(){if(this.parentElement)this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);this.parentElement=null;}
 insertBefore(node,before){if(node===before)return;if(node.contains(globalThis.document?.activeElement))document.activeElement=null;node.remove();node.parentElement=this;this.children.splice(before?this.children.indexOf(before):this.children.length,0,node);}
 append(...nodes){for(const node of nodes)this.insertBefore(node,null);}replaceChildren(...nodes){for(const node of [...this.children])node.remove();this.append(...nodes);}
 setAttribute(k,v){this.attrs[k]=String(v);}removeAttribute(k){delete this.attrs[k];}getAttribute(k){return this.attrs[k]??null;}addEventListener(type,fn){this.handlers[type]=fn;}focus(){document.activeElement=this;}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return rows;if(selector.startsWith('.'))return rows.filter(n=>n.classList.contains(selector.slice(1)));const key=selector.match(/^\[data-ans-nav-key="(.*)"\]$/)?.[1];return rows.filter(n=>n.dataset.ansNavKey===key);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
}
async function fixture(run){
 const prior=new Map(['document','chrome','CSS'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const body=new Node('body'),home=new Node(),slot=new Node(),back=new Node('button'),host=new Node('aside'),head=new Node('header'),tree=new Node();home.id='archive-reader-navigator-slot';slot.id='archive-reader-back-slot';back.id='back';body.append(home);home.append(slot,host);slot.append(back);host.append(head,tree);
 globalThis.document={body,documentElement:{lang:'zh-CN'},activeElement:null,createElement:tag=>new Node(tag),getElementById:id=>body.querySelectorAll('*').find(n=>n.id===id)||null};globalThis.CSS={escape:x=>x};globalThis.chrome={runtime:{sendMessage(){throw Error('No data reads/writes admitted by this presentation test');}}};
 try{
  const state=new ArchiveNavigatorState(),groups=['first','second','current'].map((title,i)=>({id:title,kind:'group',providerKey:'chatgpt',groupKind:'project',title,projectRef:{providerKey:'chatgpt',namespace:'synthetic',projectId:String(i)}}));
  const scope=(options,items)=>Object.assign(state.scope(options),{coverage:{state:'complete'},items,nextCursor:'synthetic-next',generation:7});
  scope({groupKind:'providers'},[{providerKey:'other'},{providerKey:'chatgpt'}]);scope({providerKey:'other',groupKind:'groups'},[]);scope({providerKey:'chatgpt',groupKind:'groups'},groups);
  for(const g of groups)scope({providerKey:g.providerKey,groupKind:g.groupKind,projectRef:g.projectRef},[{documentId:g.title==='current'?'selected':g.title,title:g.title,providerKey:g.providerKey,groupKind:g.groupKind,projectRef:g.projectRef}]);
  state.select({available:true,documentId:'selected',providerKey:'chatgpt',groupKind:'project',projectRef:groups[2].projectRef});
  const owner=Object.assign(Object.create(ArchiveNavigator.prototype),{active:true,reader:true,selectedDocumentId:'selected',state,host,tree,media:{matches:false},duplicateLabels:new Map(),mode:'paia',sourceScope:null,sheetOpen:false,onRouteChange(){},syncLegacy(){}});
  await run({owner,state,groups,home,slot,back,host,tree});
 }finally{for(const [k,v]of prior)if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}
}
const titles=tree=>tree.querySelectorAll('.archive-navigator-group-toggle').map(n=>n.textContent);
test('Reader pins current provider and group in DOM while every source scope/order/cursor stays intact',()=>fixture(({owner,state,tree,groups,slot,host,home})=>{
 const before=structuredClone([...state.scopes]);owner.paint();assert.deepEqual(titles(tree),['current','first','second']);assert.equal(tree.children[0].dataset.providerKey,'chatgpt');assert.equal(slot.parentElement,home);assert.equal(slot.nextSibling,host);assert.deepEqual([...state.scopes],before);assert.deepEqual(state.scope({providerKey:'chatgpt',groupKind:'groups'}).items,groups);
}));
test('Collapsed or not-yet-loaded selected window keeps its real group header and collapse handler',()=>fixture(async({owner,state,groups,tree})=>{
 owner.paint();await owner.toggleGroup(groups[2]);assert.equal(state.expanded.has(navigatorGroupKey('chatgpt','project',groups[2].projectRef)),false);assert.equal(titles(tree)[0],'current');const button=tree.querySelector('.archive-navigator-group-toggle');assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(typeof button.handlers.click,'function');
 state.scope(owner.groupOptions(groups[2])).items=[];owner.lastPaintSignature=null;owner.paint();assert.equal(titles(tree)[0],'current');assert.equal(owner.host.classList.contains('has-reader-context'),true);
}));
test('Desktop, compact and Root restore the ordinary DOM order and stable Back slot without losing focused Back',()=>fixture(({owner,tree,slot,home,back,host})=>{
 owner.paint();back.focus();owner.media.matches=true;owner.layout();assert.deepEqual(titles(tree),['first','second','current']);assert.equal(slot.parentElement,home);assert.equal(document.activeElement,back);
 owner.media.matches=false;owner.layout();assert.deepEqual(titles(tree),['current','first','second']);assert.equal(slot.parentElement,home);assert.equal(document.activeElement,back);
 owner.reader=false;owner.paint();assert.deepEqual(titles(tree),['first','second','current']);assert.equal(slot.parentElement,home);assert.equal(document.activeElement,back);
}));
test('Unavailable, stale-document and absent-group selections keep generic Back and every available group',()=>fixture(({owner,state,tree,slot,home})=>{
 for(const path of [{...state.selectedPath,available:false},{...state.selectedPath,documentId:'obsolete'},{...state.selectedPath,projectRef:{providerKey:'chatgpt',namespace:'synthetic',projectId:'absent'}}]){state.selectedPath=path;owner.paint();assert.deepEqual(titles(tree),['first','second','current']);assert.equal(slot.parentElement,home);assert.equal(owner.host.classList.contains('has-reader-context'),false);}
}));
test('The sole layout boundary restores focus only after host visibility and fixed slot stability',()=>fixture(({owner,host,slot,home})=>{
 const phases=[];host.hidden=true;owner.beforeLayout=()=>{phases.push(['before',host.hidden,slot.parentElement]);return()=>phases.push(['after',host.hidden,slot.parentElement]);};
 owner.layout();assert.equal(phases[0][0],'before');assert.equal(phases[0][1],true);assert.deepEqual(phases[1],['after',false,home]);
}));
