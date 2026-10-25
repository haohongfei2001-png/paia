import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PresentationNode} from './harness/presentation-dom.mjs';

const html=readFileSync(new URL('../ui/archive.html',import.meta.url),'utf8');
// Parse only the actual shared header markup, so restoration tests cannot hide
// a production sibling-order defect behind a hand-written approximate order.
function headerFromHTML(make){
 const markup=html.match(/<header class="workspace-header">[\s\S]*?<\/header>/)?.[0];assert.ok(markup);
 const root=make('div'),stack=[root],voids=new Set(['input','img','br']);
 for(const token of markup.matchAll(/<(\/?)([a-z][a-z0-9-]*)\b([^>]*)>/g)){
  if(token[1]){stack.pop();continue;}
  const node=make(token[2]);for(const attr of token[3].matchAll(/([\w-]+)(?:="([^"]*)")?/g)){if(attr[1]==='hidden')node.hidden=true;else node.setAttribute(attr[1],attr[2]??'');}
  stack.at(-1).append(node);if(!voids.has(token[2]))stack.push(node);
 }
 return root.children[0];
}
async function fixture(run){
 const prior=new Map(['document','matchMedia','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));const nodes=new Map();
 const make=(tag='div',id=null)=>{const node=new PresentationNode(tag);if(id){node.id=id;nodes.set(id,node);}node.getClientRects=()=>{for(let p=node;p;p=p.parentElement)if(p.hidden)return [];return [{}];};return node;};
 const body=make(),header=headerFromHTML(make);const register=node=>{if(node.id)nodes.set(node.id,node);for(const child of node.children)register(child);};register(header);
 const add=(id,tag='div')=>{if(nodes.has(id))return nodes.get(id);const node=make(tag,id);body.append(node);return node;};
 const main=add('main'),sidebar=add('sidebar'),bottom=add('sidebar-bottom'),panel=add('thought-panel');body.append(main,sidebar);main.append(header,panel);sidebar.append(bottom);
 const source=add('thought-root-source'),tools=add('thought-home-tools'),label=add('thought-source-scope-label'),rootHeading=add('thought-root-heading');panel.append(rootHeading,source,tools);tools.append(label);
 for(const id of ['archive-root-main','archive-root-header','archive-reader-navigator-slot','archive-root-navigator-slot','archive-root-header-actions','archive-reader-search-slot','archive-reader-back-slot','reader-compact-tools','reader-heading-actions','reader-status-slot','archive-root-tools','archive-root-heading'])add(id);
 nodes.get('archive-root-main').append(nodes.get('archive-root-header'),nodes.get('archive-root-tools'),nodes.get('archive-root-navigator-slot'));nodes.get('archive-root-header').append(nodes.get('archive-root-heading'),nodes.get('archive-root-header-actions'));nodes.get('archive-reader-navigator-slot').append(nodes.get('archive-reader-search-slot'));nodes.get('reader-compact-tools').append(nodes.get('archive-reader-back-slot'));
 nodes.get('archive-root-tools').append(add('archive-root-overflow'),add('archive-source-scope-label'));
 const time=add('input-time-order'),prose=add('synthetic-prose'),image=add('brand-image','img');prose.textContent='SYNTHETIC body\n\n🙂';panel.append(prose);const selection={anchorNode:prose,anchorOffset:3,focusNode:prose,focusOffset:7};
 const buttons=['library','thoughts','memory','settings'].map(view=>{const button=make('button');button.dataset.view=view;button.addEventListener('click',()=>view);sidebar.append(button);return button;});
 const find=id=>nodes.get(id)||findDynamic(body,id);function findDynamic(node,id){if(node.id===id)return node;for(const child of node.children){const found=findDynamic(child,id);if(found)return found;}return null;}
 const glyph=findDynamic(header,'document-menu').children[0];
 globalThis.document={body,documentElement:{lang:'en'},activeElement:null,createElement:tag=>make(tag),createElementNS:(ns,tag)=>{const node=make(tag);node.namespaceURI=ns;return node;},getElementById:find,addEventListener(){},querySelectorAll:selector=>selector==='[data-view]'||selector==='.sidebar [data-view]'?buttons:[],querySelector:selector=>selector==='.workspace'?main:selector==='.workspace-header'?header:selector==='.sidebar'?sidebar:selector==='.sidebar-bottom'?bottom:selector==='.document-menu-glyph'?glyph:selector==='.brand img'?image:buttons.find(button=>selector.includes(`[data-view="${button.dataset.view}"]`))};
 globalThis.matchMedia=query=>({matches:query.includes('min-width')});globalThis.chrome={runtime:{sendMessage(){throw Error('UI composition must not acquire data access');}}};
 try{
  const {AppShellController}=await import('../ui/app-shell.js');
  const owner=new AppShellController(),stop=Symbol('unrelated universal search/settings installation');owner.localize=()=>{};owner.installArchivePresentation=function(){AppShellController.prototype.installArchivePresentation.call(this);throw stop;};
  assert.throws(()=>owner.mount(),error=>error===stop);
  await run({owner,header,find,prose,selection,buttons});
 }finally{for(const [key,value]of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}
test('actual shell mount and repeated Archive remount keep Thought Back first, with original listeners and focus',()=>fixture(f=>{
 const back=f.find('back'),handler=()=>{},captured=[...f.owner.archiveHeaderOrder];back.addEventListener('click',handler);back.hidden=false;
 assert.equal(captured[0],back);assert.equal(f.find('thought-topic-header').children.length,0,'retired search slot is actually empty, not a live control to remove');
 for(const [route,desktop,compact]of [[{view:'thoughts',topicId:'t'},true,false],[{view:'library',documentId:'d'},true,false],[{view:'thoughts',topicId:'t'},true,false],[{view:'library',documentId:'d'},false,true],[{view:'thoughts',topicId:'t'},false,true],[{view:'settings'},false,true],[{view:'thoughts',topicId:'t'},true,false],[{view:'library'},true,false],[{view:'thoughts',topicId:'t'},true,false]]){
  f.owner.archiveDesktop.matches=desktop;f.owner.archiveCompact.matches=compact;back.focus();f.owner.present(route,{consented:true});
  if(route.view==='thoughts'){assert.equal(back.parentElement,f.header);assert.equal(f.header.children[0],back,'Back remains first even after the heading has returned from Archive');assert.deepEqual(f.header.children,captured);}
  if(route.documentId)assert.equal(back.parentElement,f.find('archive-reader-back-slot'));
  assert.equal(document.activeElement,back);assert.equal(back.listeners.get('click'),handler);assert.equal(f.selection.anchorNode,f.prose);assert.equal(f.prose.textContent,'SYNTHETIC body\n\n🙂');assert.equal(f.prose.parentElement,f.find('thought-panel'));
 }
 f.prose.focus();f.owner.present({view:'thoughts',topicId:'t'},{consented:true});assert.equal(document.activeElement,f.prose,'repeated presentation does not replace or steal focus from the editor');
 for(const button of f.buttons)assert.equal(button.listeners.size,1);
}));
test('Thought reader CSS anchors the header in normal flow and removes only the empty retired-search reserve',()=>{
 const css=readFileSync(new URL('../ui/thought-reader.css',import.meta.url),'utf8');
 assert.match(css,/body\[data-paia-space="thoughts"\] \.workspace-header\{position:relative;inset:auto;width:auto;justify-content:flex-start;min-height:0;padding:24px 44px 0/);
 assert.doesNotMatch(css,/body\[data-paia-space="thoughts"\][^{}]*\.workspace-header\{[^}]*position:absolute/,'old right-anchored fixed-width header cannot override the left reader axis');
 assert.match(css,/#thought-topic-header:empty[^{}]*\{display:none\}/);assert.match(css,/#thought-topic-header\[hidden\]/);
 assert.match(css,/body\[data-paia-space="thoughts"\] \.workspace-header\{padding:16px 20px 0;gap:8px\}/,'narrow inset remains');
 assert.match(css,/@media\(max-width:767px\),\(pointer:coarse\)\{body\[data-paia-space="thoughts"\] \.workspace-header :is\(#back,#revision-history\)[^{}]*\{min-height:44px;min-width:44px\}/);
 const composition=readFileSync(new URL('../ui/topic-workspace-presentation.css',import.meta.url),'utf8');
 assert.match(composition,/#thought-document\.dvn-topic-composition\{position:relative;max-width:calc\(var\(--paia-prose-width,680px\) \+ 216px\);margin:0;padding-left:216px\}/);
 assert.match(composition,/#thought-document\.dvn-topic-composition #original-reading-body\{max-width:var\(--paia-prose-width,680px\);margin:0\}/,'independent saved prose width and intentional right whitespace remain');
});
