import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ArchiveNavigator,ArchiveNavigatorState,conversationDisambiguators} from '../ui/archive-navigator.js';
const source=name=>readFile(new URL('../ui/'+name,import.meta.url),'utf8');

test('bounded repair distinguishes only duplicate titles without changing source labels or identities',()=>{
 const items=[{documentId:'window-b',title:'A shared title'},{documentId:'window-a',title:'A shared title'},{documentId:'window-c',title:'Different title'}],before=structuredClone(items),known=new Map();
 const labels=conversationDisambiguators(items,known);
 assert.deepEqual([...labels],[['window-b',2],['window-a',1]]);
 assert.equal(labels.has('window-c'),false);
 assert.deepEqual(items,before);
 assert.deepEqual(conversationDisambiguators([...items].reverse(),known),labels,'sorting does not reassign visible identities');
 const next=conversationDisambiguators([{documentId:'earlier-id',title:'A shared title'},...items],known);
 assert.equal(next.get('window-a'),1);assert.equal(next.get('window-b'),2);assert.equal(next.get('earlier-id'),3,'a later page/capture does not renumber prior windows');
 assert.equal(conversationDisambiguators([items[0]],known).size,0,'unique current title has no extra chrome');
 assert.equal(conversationDisambiguators([items[0],items[0]],known).size,0,'repeated projection of one identity is not a distinct window');
});

test('bounded repair handles unnamed and visually identical titles, keeping groups independent',()=>{
 const known=new Map(),items=[{documentId:'a',title:''},{documentId:'b'},{documentId:'c',title:'Cafe\u0301   plan'},{documentId:'d',title:'Café plan'}];
 assert.deepEqual([...conversationDisambiguators(items,known)],[['a',1],['b',2],['c',1],['d',2]]);
 assert.equal(conversationDisambiguators([{documentId:'c',title:'New title'}],known).size,0,'a rename removes the redundant distinction');
 assert.equal(conversationDisambiguators([{documentId:'b',title:'Another project'}],new Map()).size,0);
 assert.equal(new ArchiveNavigatorState().expanded.size,0,'Projects still begin collapsed');
});

class Node {
 constructor(id){this.id=id;this.children=[];this.moves=0;}
 get previousElementSibling(){const rows=this.parentElement?.children||[];return rows[rows.indexOf(this)-1]||null;}
 remove(){if(this.parentElement){const rows=this.parentElement.children;rows.splice(rows.indexOf(this),1);}this.parentElement=null;}
 insertBefore(node,before){node.remove();this.children.splice(before?this.children.indexOf(before):this.children.length,0,node);node.parentElement=this;this.moves++;}
 prepend(node){this.insertBefore(node,this.children[0]);}
 after(node){this.parentElement.insertBefore(node,this.parentElement.children[this.parentElement.children.indexOf(this)+1]);}
}

test('Archive search toolbar precedes the tree with its real nested search structure and after Reader return',()=>{
 const original=globalThis.document,main=new Node('archive-root-main'),tools=new Node('archive-root-tools'),search=new Node('search'),host=new Node('archive-navigator'),panel=new Node('document-panel'),page=new Node('document-page');
 main.prepend(tools);tools.prepend(search);main.prepend(host);panel.prepend(page);
 const nodes=new Map([main,tools,search,host,panel,page].map(n=>[n.id,n]));globalThis.document={getElementById:id=>nodes.get(id)};
 try{
  const nav={active:true,reader:false,host};ArchiveNavigator.prototype.place.call(nav);
  assert.deepEqual(main.children.map(n=>n.id),['archive-root-tools','archive-navigator']);
  const moves=main.moves;ArchiveNavigator.prototype.place.call(nav);assert.equal(main.moves,moves,'MutationObserver re-entry does not move stable DOM');
  nav.reader=true;ArchiveNavigator.prototype.place.call(nav);assert.deepEqual(panel.children.map(n=>n.id),['archive-navigator','document-page']);
  nav.reader=false;ArchiveNavigator.prototype.place.call(nav);assert.deepEqual(main.children.map(n=>n.id),['archive-root-tools','archive-navigator']);
 }finally{globalThis.document=original;}
});

test('popup sizing declares intrinsic width independently of the initial browser viewport',async()=>{
 const css=await source('popup.css');
 assert.match(css,/html,body\{width:350px;min-width:350px;/);
 assert.doesNotMatch(css,/max-width:100vw/,'the initial action viewport must not constrain intrinsic width');
 assert.match(css,/\.count\{[^}]*flex-wrap:wrap/);
 assert.match(css,/\.count>span\{[^}]*flex:1 0 132px/,'CJK label keeps a readable line width');
 assert.match(css,/\.count>strong\{[^}]*max-width:100%;overflow-wrap:anywhere/,'unusually large counts remain bounded');
 // This is a source contract; native action-popup geometry is a separate browser gate.
});

test('default light canvases are white and Reader removes filter chrome while Settings keeps recovery',async()=>{
 const [core,popup,html,archive,nav]=await Promise.all(['core-loop.css','popup.css','archive.html','archive.js','archive-navigator.js'].map(source));
 for(const css of [core,popup]){const light=css.split('html[data-paia-theme="dark"]')[0];assert.match(light,/--paia-canvas:#FFFFFF/);assert.doesNotMatch(light,/#F8FAF8|#F2F6F2|#F0F5F0|#E8F0E9/i);}
 assert.match(core.split('html[data-paia-theme="dark"]')[0],/--paia-sidebar:#FFFFFF/);
 assert.doesNotMatch(html,/id="(?:archive-root-recent|archive-root-continue|document-filter-toggle|document-search-include-filtered)"/);
 assert.doesNotMatch(archive,/filtered-input-note|document-filter-toggle|document-search-include-filtered/);
 assert.match(html,/id="smart-filter-settings"/);assert.match(html,/id="filter-recent-open"/);assert.match(html,/id="search-include-filtered"/);
 assert.match(archive,/includeFiltered:showFilteredCurrent/,'existing trusted filter visibility path remains');
 assert.match(archive,/stamp.hidden=false/,'Reader timestamps remain unconditionally visible');
 assert.doesNotMatch(nav,/archive-navigator-window-cue|archive-navigator-window-time|archive-navigator-detail/);
});
