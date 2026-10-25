import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PresentationNode} from './harness/presentation-dom.mjs';

// Actual production composition method; this small DOM fixture has no layout,
// browser, store or RPC. CSS assertions below are not pixel acceptance.
async function fixture(run){
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),nodes=new Map(),body=new PresentationNode();
 globalThis.document={body,activeElement:null,documentElement:{lang:'en'},createElement:tag=>new PresentationNode(tag),getElementById:id=>nodes.get(id),addEventListener(){}};
 const make=(id,tag='div')=>{const node=new PresentationNode(tag);node.id=id;node.getClientRects=()=>[{}];nodes.set(id,node);body.append(node);return node;},get=id=>nodes.get(id);
 try{
  const {AppShellController}=await import('../ui/app-shell.js');
  const header=make('shared-header'),main=make('archive-root-main'),directory=make('archive-reader-navigator-slot');
  for(const id of ['archive-root-header','archive-root-header-actions','archive-root-tools','archive-root-navigator-slot','archive-reader-search-slot','archive-reader-back-slot','reader-compact-tools','reader-heading-actions','reader-status-slot','archive-compact-nav-items','archive-compact-reader-actions'])make(id);
  main.append(get('archive-root-header'),get('archive-root-tools'),get('archive-root-navigator-slot'));
  get('archive-root-header').append(get('archive-root-header-actions'));directory.append(get('archive-reader-search-slot'));
  get('reader-compact-tools').append(get('archive-reader-back-slot'));
  const controls=['scope-search-host','back','archive-navigator-toggle','input-time-order','document-menu','save-status'];
  for(const id of controls)header.append(make(id));
  const search=make('query','input');search.value='SYNTHETIC discovery query';get('scope-search-host').append(search);
  const source=make('archive-source-scope-label'),select=make('archive-source-scope','select');select.value='synthetic-source';source.append(select);
  const overflow=make('archive-root-overflow','details'),summary=make('overflow-summary','summary'),action=make('existing-overflow-action','button');overflow.append(summary,action);overflow.open=true;
  const listener=()=>{};select.addEventListener('change',listener);action.addEventListener('click',listener);get('archive-root-tools').append(source,overflow);
  const prose=make('unchanged-prose');prose.textContent='SYNTHETIC original body\n\n🙂';
  const nav=make('primary-nav'),buttons=['library','thoughts','memory','settings'].map(view=>{const button=make('nav-'+view,'button');button.dataset.view=view;nav.append(button);return button;});
  const owner=Object.assign(new AppShellController(),{mounted:true,archiveControlHomes:new Map(controls.map(id=>[id,header])),archiveHeaderOrder:[...header.children],archiveNavHomes:buttons.map(node=>({node,parent:nav,next:node.nextSibling})),archiveDesktop:{matches:true},archiveCompact:{matches:false},archiveCompactMenu:make('compact-menu','details')});
  run({owner,get,header,main,directory,source,select,overflow,summary,action,listener,search,prose,buttons});
 }finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
}

test('actual Reader composition shares source row on desktop, medium and compact routes',()=>fixture(f=>{
 for(const [desktop,compact]of [[true,false],[false,false],[false,true],[true,false]]){
  f.owner.archiveDesktop.matches=desktop;f.owner.archiveCompact.matches=compact;f.owner.route={view:'library',documentId:'synthetic-document'};
  f.summary.focus();f.owner.presentArchiveComposition({consented:true});
  assert.equal(f.overflow.parentElement,f.get('archive-root-tools'));
  assert.equal(f.source.parentElement,f.overflow.parentElement);
  assert.ok(f.source.parentElement.children.indexOf(f.source)<f.source.parentElement.children.indexOf(f.overflow));
  assert.equal(document.activeElement,f.summary);assert.equal(f.overflow.open,true);
  assert.equal(f.action.listeners.get('click'),f.listener);assert.equal(f.select.listeners.get('change'),f.listener);
  assert.equal(f.get('back').parentElement,f.get('archive-reader-back-slot'));
  assert.equal(f.get('document-menu').parentElement,f.get(compact?'archive-compact-reader-actions':'reader-heading-actions'));
  assert.equal(f.get('scope-search-host').parentElement,f.get('archive-root-header-actions'),'existing search owner stays intact; its visibility is not recreated here');
  assert.equal(f.prose.textContent,'SYNTHETIC original body\n\n🙂');
 }
}));

test('discovery and other-route return preserve search/source order, identity, focus and handlers',()=>fixture(f=>{
 for(const route of [{view:'library'},{view:'archive',documentId:'synthetic-document'},{view:'library'},{view:'thoughts',topicId:'synthetic-topic'},{view:'library'}]){
  f.owner.route=route;f.search.focus();f.owner.presentArchiveComposition({consented:true});
  const active=['library','archive'].includes(route.view),reader=active&&!!route.documentId;
  assert.equal(f.overflow.parentElement,f.get(active&&!reader?'archive-root-header-actions':'archive-root-tools'));
  assert.equal(f.source.parentElement,f.get('archive-root-tools'));assert.equal(f.select.value,'synthetic-source');
  assert.equal(f.search.parentElement,f.get('scope-search-host'));assert.equal(f.search.value,'SYNTHETIC discovery query');assert.equal(document.activeElement,f.search);
  if(active){assert.equal(f.get('archive-root-header').parentElement,f.directory);assert.equal(f.get('archive-root-header').nextSibling,f.get('archive-root-tools'));}
  else{assert.equal(f.get('archive-root-header').parentElement,f.main);assert.equal(f.get('scope-search-host').parentElement,f.header);}
  if(active&&!reader)assert.deepEqual(f.get('archive-root-header-actions').children,[f.get('scope-search-host'),f.overflow]);
  assert.equal(f.overflow.open,true);assert.equal(f.action.listeners.get('click'),f.listener);
 }
}));

test('inactive consent boundary and compact action/navigation owners are unchanged',()=>fixture(f=>{
 f.owner.route={view:'library',documentId:'synthetic-document'};f.owner.archiveDesktop.matches=false;f.owner.archiveCompact.matches=true;
 f.owner.presentArchiveComposition({consented:true});
 assert.deepEqual(f.get('archive-compact-nav-items').children,[...f.buttons,f.get('archive-compact-reader-actions')]);
 assert.deepEqual(f.get('archive-compact-reader-actions').children,['archive-navigator-toggle','input-time-order','document-menu'].map(f.get));
 f.owner.presentArchiveComposition({consented:false});
 assert.equal(f.get('archive-root-header').parentElement,f.main);assert.equal(f.overflow.parentElement,f.get('archive-root-tools'));
 assert.equal(f.get('back').parentElement,f.header);assert.equal(f.owner.archiveCompactMenu.hidden,true);
}));

test('same-row sizing is restricted to Archive Reader and adds no control hiding',()=>{
 const css=readFileSync(new URL('../ui/app-shell.css',import.meta.url),'utf8');
 assert.ok(css.includes('body:is([data-paia-space="library"],[data-paia-space="archive"]).ans-nav-reader #archive-root-tools{flex-wrap:nowrap}'));
 assert.ok(css.includes('body:is([data-paia-space="library"],[data-paia-space="archive"]).ans-nav-reader #archive-root-tools>#archive-source-scope-label{flex:1 1 auto;min-width:0}'));
});
