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
 append(node){this.insertBefore(node,null);}
 prepend(node){this.insertBefore(node,this.children[0]);}
 after(node){this.parentElement.insertBefore(node,this.parentElement.children[this.parentElement.children.indexOf(this)+1]);}
}

test('Archive navigator explicitly mounts in root/Reader slots without observer relocation',async()=>{
 const root=new Node('archive-root-navigator-slot'),reader=new Node('archive-reader-navigator-slot'),host=new Node('archive-navigator');
 const nav={host};ArchiveNavigator.prototype.mount.call(nav,root);
 assert.deepEqual(root.children.map(n=>n.id),['archive-navigator']);
 const moves=root.moves;ArchiveNavigator.prototype.mount.call(nav,root);assert.equal(root.moves,moves,'stable explicit presentation does not move DOM');
 ArchiveNavigator.prototype.mount.call(nav,reader);assert.equal(root.children.length,0);assert.deepEqual(reader.children.map(n=>n.id),['archive-navigator']);
 ArchiveNavigator.prototype.mount.call(nav,root);assert.equal(reader.children.length,0);assert.equal(host.parentElement,root);
 assert.throws(()=>ArchiveNavigator.prototype.mount.call(nav,null),/ARCHIVE_NAVIGATOR_SLOT_MISSING/);
 const html=await source('archive.html'),runtime=await source('archive-navigator.js');
 assert.ok(html.indexOf('id="archive-root-tools"')<html.indexOf('id="archive-root-navigator-slot"'),'tools precede explicit root tree slot');
 assert.doesNotMatch(runtime,/MutationObserver|place\(\)/,'retired observer/relocation path stays removed');
});

test('popup sizing declares intrinsic width independently of the initial browser viewport',async()=>{
 const css=await source('popup.css');
 assert.match(css,/html\{width:350px;min-width:350px\}/);
 assert.match(css,/body\{width:100%;/,'body fills the intrinsic root width');
 assert.match(css,/html\[data-popup-view="document"\]\{width:min\(350px,100vw\);min-width:0\}/,'only a document tab can reflow below intrinsic native width');
 assert.doesNotMatch(css,/max-width:100vw/,'the initial action viewport must not constrain intrinsic width');
 assert.match(css,/\.count\{[^}]*flex-wrap:wrap/);
 assert.match(css,/\.count>span\{[^}]*flex:1 0 132px/,'CJK label keeps a readable line width');
 assert.match(css,/\.count>strong\{[^}]*max-width:100%;overflow-wrap:anywhere/,'unusually large counts remain bounded');
 // This is a source contract; native action-popup geometry is a separate browser gate.
});

test('default light canvases are white and Reader removes filter chrome while Settings keeps recovery',async()=>{
 const [core,popup,html,archive,nav]=await Promise.all(['desktop-tokens.css','popup.css','archive.html','archive.js','archive-navigator.js'].map(source));
 assert.match(core,/--bg:#ffffff/i);assert.match(core,/--paia-canvas:var\(--bg\)/);assert.match(popup,/--paia-canvas:#FFFFFF/);
 assert.match(core,/--rail:#f7f8f6/,'frozen DVN rail is distinct from the white reading canvas');
 assert.doesNotMatch(html,/id="(?:archive-root-recent|archive-root-continue|document-filter-toggle|document-search-include-filtered)"/);
 assert.doesNotMatch(archive,/filtered-input-note|document-filter-toggle|document-search-include-filtered/);
 assert.match(html,/id="smart-filter-settings"/);assert.match(html,/id="filter-recent-open"/);assert.match(html,/id="search-include-filtered"/);
 assert.match(archive,/includeFiltered:showFilteredCurrent/,'existing trusted filter visibility path remains');
 assert.match(archive,/stamp.hidden=false/,'Reader timestamps remain unconditionally visible');
 assert.doesNotMatch(nav,/archive-navigator-window-cue|archive-navigator-window-time|archive-navigator-detail/);
});
