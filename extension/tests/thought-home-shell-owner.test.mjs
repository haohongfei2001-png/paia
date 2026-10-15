import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {thoughtRootLayout} from './harness/d7-thought-reference.mjs';

test('actual shell mount keeps Home grid controls behind the existing route and consent boundary',async()=>{
 const prior=globalThis.document,body=new PresentationNode(),nodes=new Map(),make=id=>{const node=new PresentationNode();node.id=id;nodes.set(id,node);body.append(node);return node;};
 const main=make('main'),header=make('header'),panel=make('thought-panel'),slot=make('thought-root-header'),tools=make('thought-home-tools'),input=make('thought-search'),toolbar=make('toolbar'),source=make('thought-root-source'),sourceLabel=make('thought-source-scope-label'),bottom=make('bottom'),glyph=make('glyph');
 main.append(header,panel);header.append(slot);panel.append(tools,source);tools.append(input,toolbar,sourceLabel);
 for(const id of ['scope-search-host','save-status','archive-navigator-toggle','input-time-order','document-menu','thought-topic-header','workspace-heading'])header.append(make(id));
 nodes.get('thought-topic-header').append(make('topic-search'));make('thought-root-heading');
 const nav=new Map(['library','thoughts','memory','settings'].map(view=>[view,make('nav-'+view)]));
 globalThis.document={body,addEventListener(){},documentElement:{lang:'en'},createElement:tag=>new PresentationNode(tag),createElementNS:(ns,tag)=>new PresentationNode(tag,ns),getElementById:id=>nodes.get(id),querySelectorAll:()=>[],querySelector:selector=>selector==='.workspace'?main:selector==='.workspace-header'?header:selector==='.sidebar-bottom'?bottom:selector==='.document-menu-glyph'?glyph:nav.get(selector.match(/data-view="([^"]+)"/)?.[1])};
 // Mount the real shared/Thought composition. Stop only when it reaches the
 // unrelated Archive/settings feature installation, which this fixture omits.
 const {AppShellController}=await import('../ui/app-shell.js');
 const stop=Symbol('unrelated feature boundary'),owner=new AppShellController();owner.installArchivePresentation=()=>{throw stop;};owner.localize=()=>{};owner.presentArchiveComposition=()=>{};
 try{
  assert.throws(()=>owner.mount(),error=>error===stop);
  assert.equal(slot.parentElement,panel);assert.equal(tools.parentElement,slot);assert.equal(header.contains(input),false);assert.equal(sourceLabel.parentElement,source);assert.equal(nodes.get('topic-search').parentElement,nodes.get('thought-topic-header'));
  assert.deepEqual(tools.children,[input,toolbar],'search and existing actions retain their DOM order and identities');
  const visible=node=>{for(let n=node;n;n=n.parentElement)if(n.hidden)return false;return true;};
  for(const [route,options,shown]of [[{view:'thoughts'},{consented:true},true],[{view:'thoughts',topicId:'topic'},{consented:true},false],[{view:'settings'},{consented:true},false],[{view:'thoughts'},{consented:false},false],[{view:'thoughts'},{consented:true,writing:true},false],[{view:'thoughts'},{consented:true},true]]){
   owner.present(route,options);tools.hidden=false;assert.equal(visible(input),shown,'late inner unhide cannot cross the shell visibility boundary');assert.equal(slot.parentElement,panel);assert.equal(tools.parentElement,slot);
  }
  owner.mount();assert.equal(slot.parentElement,panel,'idempotent mount cannot move Root controls back into Reader header');
 }finally{globalThis.document=prior;}
});

test('independent original eyebrow offsets and grid ownership remain strict across all native widths',async()=>{
 const css=await readFile(new URL('../ui/thought-reader.css',import.meta.url),'utf8');
 for(const width of [1440,1280,1024,768,390,320]){const r=thoughtRootLayout(width);assert.deepEqual([r.eyebrowSize,r.eyebrowLine,r.eyebrowGap],width>760?[9,13.5,12]:[8,12,12]);}
 assert.match(css,/#thought-root-header:not\(\[hidden\]\)\{display:contents\}/);
 assert.match(css,/body\[data-paia-space="thoughts"\]\[data-paia-surface="root"\] \.workspace-header\{position:relative;inset:auto;width:auto;min-height:0;margin:0;padding:0 44px\}/);
 assert.doesNotMatch(css,/#thought-root-header\{display:contents/,'hidden must retain the shell privacy gate');
});
