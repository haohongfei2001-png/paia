import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {TopicController} from '../ui/topic-workspace.js';
import {TopicWorkspacePresentation,presentTopicSectionNavigation} from '../ui/topic-workspace-presentation.js';

// Node-only fixture for the actual presentation/Section methods, not a layout
// engine or substitute for future source-bound browser acceptance.
class Node extends PresentationNode{
 get parentNode(){return this.parentElement;}
 insertBefore(node,before){const result=super.insertBefore(node,before);if(document.activeElement===null)document.activeElement=document.body;return result;}
 after(node){this.parentElement.insertBefore(node,this.nextSibling);}
 before(node){this.parentElement.insertBefore(node,this);}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);return selector==='*'?rows:rows.filter(node=>selector[0]==='.'?node.classList.contains(selector.slice(1)):selector[0]==='#'?node.id===selector.slice(1):node.tagName.toLowerCase()===selector);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
async function fixture(run){
 const prior=new Map(['document','innerWidth'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),nodes=new Map(),body=new Node();
 globalThis.document={body,activeElement:body,documentElement:{lang:'zh-CN'},getElementById:id=>nodes.get(id)||null,createElement:tag=>new Node(tag),addEventListener(){},removeEventListener(){},querySelector:selector=>selector==='.workspace-header'?nodes.get('header'):body.querySelector(selector)};
 globalThis.innerWidth=390;body.dataset={paiaSpace:'thoughts',paiaSurface:'reader'};
 const make=(id,tag='div',name='')=>{const node=new Node(tag);node.id=id;node.className=name;nodes.set(id,node);body.append(node);return node;},get=id=>nodes.get(id);
 try{
  const header=make('header'),back=make('back','button'),status=make('save-status');header.append(back,status);
  const root=make('thought-document'),title=make('title-row','div','topic-title-row'),heading=make('topic-heading'),toolbar=make('topic-toolbar'),menu=make('topic-menu','details'),menuItems=make('menu-items','div','library-action-list'),historyTools=make('history-tools','div','library-history-tools');
  const tabs=make('topic-original-tabs'),presentation=make('topic-presentation'),reading=make('topic-reading-controls'),order=make('topic-time-order'),outline=make('topic-outline','details'),nav=make('topic-section-nav'),before=make('topic-continuous-before'),prose=make('topic-body'),history=make('revision-history','button');
  root.append(title,toolbar,tabs,reading,outline,order,before,prose);title.append(heading,presentation);toolbar.append(menu,historyTools);menu.append(menuItems);outline.append(nav);header.append(history);
  prose.textContent='SYNTHETIC untouched prose\n\n🙂';
  const calls=[],owner=Object.assign(Object.create(TopicController.prototype),{id:'synthetic-topic',view:'original',activeSectionId:'section-1',sectionDirectory:[{sectionId:'section-1',title:'第一章节'},{sectionId:'section-2',title:'第二章节'}],async navigateTopicSection(id){calls.push(id);return false;},onStatus(){throw Error('Unexpected navigation failure');}});
  owner.renderSectionNav();
  await run({owner,get,root,header,back,outline,nav,before,prose,calls});
 }finally{for(const [key,value]of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}

test('actual mount, responsive moves, dispose and remount retain one original Section selector',()=>fixture(f=>{
 const select=f.nav.querySelector('.topic-section-select'),handler=select.listeners.get('change');
 const presentation=new TopicWorkspacePresentation(f.owner);presentation.options.open=true;
 assert.equal(f.outline.parentElement,f.header);assert.equal(f.back.nextSibling,f.outline);
 for(const narrow of [false,true,true,false,true]){
  select.focus();presentTopicSectionNavigation({narrow,active:true});
  assert.equal(f.outline.parentElement,narrow?f.header:f.root);
  if(narrow)assert.equal(f.back.nextSibling,f.outline);else assert.equal(f.outline.nextSibling,f.before);
  assert.equal(document.activeElement,select);assert.equal(select.value,'section-1');assert.equal(select.listeners.get('change'),handler);
  assert.equal(document.body.querySelectorAll('.topic-section-select').length,1);
  assert.equal(presentation.options.open,true);assert.equal(f.prose.textContent,'SYNTHETIC untouched prose\n\n🙂');
 }
 presentation.dispose();assert.equal(f.outline.parentElement,f.root);assert.equal(document.activeElement,select);
 const remount=new TopicWorkspacePresentation(f.owner);assert.equal(f.back.nextSibling,f.outline);assert.equal(f.nav.querySelector('.topic-section-select'),select);assert.equal(remount.options.open,true);remount.dispose();
}));

test('the original select change handler retains exact Section targeting and refused-switch rollback',()=>fixture(async f=>{
 const presentation=new TopicWorkspacePresentation(f.owner),select=f.nav.querySelector('.topic-section-select');
 select.value='section-2';select.listeners.get('change')();await Promise.resolve();await Promise.resolve();
 assert.deepEqual(f.calls,['section-2']);assert.equal(select.value,'section-1');assert.equal(f.owner.activeSectionId,'section-1');
 assert.equal(f.outline.parentElement,f.header);assert.equal(f.prose.textContent,'SYNTHETIC untouched prose\n\n🙂');presentation.dispose();
}));

test('inactive routes restore the subtree and initial owner sync uses the current viewport without another listener',()=>fixture(f=>{
 const presentation=new TopicWorkspacePresentation(f.owner);
 presentTopicSectionNavigation({narrow:true,active:false});assert.equal(f.outline.parentElement,f.root);
 document.body.dataset.paiaSpace='settings';presentation.sync();assert.equal(f.outline.parentElement,f.root);
 document.body.dataset.paiaSpace='thoughts';globalThis.innerWidth=1280;presentation.sync();assert.equal(f.outline.parentElement,f.root);
 globalThis.innerWidth=390;presentation.sync();assert.equal(f.back.nextSibling,f.outline);
 presentation.dispose();presentTopicSectionNavigation({narrow:true,active:true});assert.equal(f.outline.parentElement,f.root,'disposed owner is never revived by shell composition');
}));

test('scoped CSS uses the existing muted token and compact header controls, while shell reuses its responsive owner',()=>{
 const css=readFileSync(new URL('../ui/topic-workspace-presentation.css',import.meta.url),'utf8');
 assert.match(css,/\.dvn-topic-options>summary\{[^}]*color:var\(--muted\)/);
 const narrow=css.slice(css.lastIndexOf('@media(max-width:1023px)'));
 assert.match(narrow,/\.workspace-header>#topic-outline\{flex:1 1 0;min-width:0;margin:0/);
 assert.match(narrow,/\.workspace-header \.topic-section-select\{[^}]*min-height:44px[^}]*background:var\(--bg\);color:var\(--text\)/);
 assert.match(narrow,/\.workspace-header \.topic-section-directory\{display:none\}/);
 const shell=readFileSync(new URL('../ui/app-shell.js',import.meta.url),'utf8');
 assert.ok(shell.includes("presentTopicSectionNavigation({narrow:!desktop,active:!!options?.consented&&route.view==='thoughts'&&!!route.topicId})"));
 const source=readFileSync(new URL('../ui/topic-workspace-presentation.js',import.meta.url),'utf8');
 const composition=source.slice(source.indexOf('export function presentTopicSectionNavigation'),source.indexOf('// A presentation'));
 assert.doesNotMatch(composition,/addEventListener|matchMedia|replaceChildren|createElement|request\(/);
 assert.match(source,/presentTopicSectionNavigation\(\{active:false\}\);\s*this\.root\.classList\.remove/);
});
