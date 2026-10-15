import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PersonalTopicRoot} from '../ui/personal-topic-root.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';
import {TopicRootSlots} from '../ui/topic-root-slots.js';

test('ordered column stacking closes committed holes without changing identity nodes or imposing equal heights',()=>{
 const host=new Node('div');host.clientWidth=1000;host.style={setProperty(){}};
 const ids=['a','b','c','d','e','f'],heights=[100,200,150,80,120,90],nodes=new Map(ids.map((id,index)=>{const node=new Node('article');node.dataset.topicId=id;node.style={};node.getBoundingClientRect=()=>({height:heights[index]});return [id,node];}));
 const owner=Object.assign(Object.create(PersonalTopicRoot.prototype),{host,nodes,items:ids.map(id=>({id})),slots:new TopicRootSlots(),complete:true,fit(){}});
 owner.layout();assert.equal(nodes.get('d').style.gridRow,'121 / span 80');assert.equal(nodes.get('e').style.gridRow,'221 / span 120');assert.equal(nodes.get('f').style.gridRow,'171 / span 90');assert.deepEqual(host.children,ids.map(id=>nodes.get(id)));
 const identity=nodes.get('e');owner.items=ids.filter(id=>id!=='b').map(id=>({id}));owner.layout();assert.equal(nodes.get('e'),identity);assert.equal(identity.dataset.rootSlot,'4');assert.equal(identity.style.gridColumn,'1');assert.equal(identity.style.gridRow,'121 / span 120');assert.equal(nodes.get('f').style.gridRow,'171 / span 90');assert.equal(host.children.length,5);
 heights[0]=135;owner.layout();assert.equal(identity.style.gridRow,'156 / span 120','a genuine content-height change updates only stacking geometry');
 owner.items=ids.map(id=>({id}));owner.layout();assert.equal(identity.style.gridColumn,'2');assert.equal(identity.style.gridRow,'221 / span 120');
});

test('white Topic card adds only an inert shared symbol and preserves exact native identity links',()=>{
 const previous={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection};
 globalThis.document={documentElement:{lang:'zh-CN'},createElement:tag=>new Node(tag),createElementNS:(ns,tag)=>new Node(tag,ns)};
 globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:true});
 try{
  const opened=[],owner=Object.assign(Object.create(PersonalTopicRoot.prototype),{open:(...args)=>opened.push(args)});
  const item={id:'topic-1',name:'SYNTHETIC 量子 👩‍💻',sectionOverview:{items:[{id:'section-1',title:'SYNTHETIC 章一'}],complete:true}},before=JSON.stringify(item),tile=owner.tile(item);
  const [title,sections,preview,more]=tile.children,[symbol,link]=title.children;
  assert.equal(title.textContent,item.name);assert.equal(link.textContent,item.name);assert.equal(symbol.getAttribute('aria-hidden'),'true');assert.equal(symbol.children[0].getAttribute('focusable'),'false');assert.equal(symbol.children[0].dataset.paiaIcon,'thoughts');
  assert.equal(preview.hidden,true);assert.equal(preview.textContent,'');assert.equal(sections.children[0].textContent,item.sectionOverview.items[0].title);assert.equal(sections.children[0].dataset.sectionId,'section-1');assert.equal(more.textContent,'继续阅读');
  link.listeners.get('click')({button:0,detail:1,preventDefault(){}});sections.children[0].listeners.get('click')({button:0,detail:1,preventDefault(){}});
  assert.deepEqual(opened,[['topic-1',null],['topic-1','section-1']]);assert.equal(JSON.stringify(item),before);assert.equal(tile.textContent.includes('undefined'),false);
 }finally{for(const [key,value]of Object.entries(previous))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
test('white card geometry retains reference rounding, chapter tree, content sizing and coarse focus targets',async()=>{
 const css=await readFile(new URL('../ui/personal-topic-root.css',import.meta.url),'utf8');
 assert.match(css,/border-radius:18px/);assert.match(css,/padding:24px 20px 20px/);assert.match(css,/column-gap:20px;row-gap:0;grid-auto-rows:1px;width:100%/);assert.match(css,/personal-topic-sections:not\(:empty\)::before/);assert.match(css,/personal-section-link::before/);
 assert.match(css,/align-items:start/);assert.match(css,/@media\(pointer:coarse\)[^\n]*min-height:44px/);assert.match(css,/a:focus-visible\{outline:2px solid/);assert.match(css,/personal-entry-preview\{display:none!important\}/);
 assert.doesNotMatch(css,/\.personal-topic-block\{[^}]*height:[1-9]/);assert.match(css,/personal-topic-block\[data-search-state="true"\]/);
});
test('white Home shell isolates the approved desktop axis and retains existing create and writing owners',async()=>{
 const css=await readFile(new URL('../ui/thought-reader.css',import.meta.url),'utf8'),source=await readFile(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');
 assert.match(css,/body\[data-paia-space="thoughts"\]\[data-paia-surface="root"\] #thought-panel\{display:grid;grid-template-columns:minmax\(0,1fr\) 282px/);
 assert.match(css,/max-width:1316px;margin:0 auto;padding:46px 62px 80px/);assert.match(css,/thought-root-heading h1\{font-size:34px/);assert.match(css,/thought-root-actions>button\{min-height:44px;min-width:44px/);
 assert.match(source,/rootActions\.append\(button\(tc\('添加主题'\),\(\)=>this\.createTopic\(\)\),homeMenu,button\(tc\('接着写'\),\(\)=>this\.createStandalone\(\)\)\)/);
});

test('successful Root departure releases previews for both Topic and sidebar routes, blocked departure retains them',async()=>{
 const {TopicController}=await import('../ui/topic-workspace.js');
 for(const ok of [false,true]){
  const calls=[],owner=Object.assign(Object.create(TopicController.prototype),{id:null,view:'original',rememberTimeline(){},rememberView(){},leaveEditors:async()=>ok,topicTimeline:{dispose(){calls.push('timeline');}},clearHomeRows(){calls.push('root');}});
  assert.equal(await owner.leave(),ok);assert.deepEqual(calls,ok?['timeline','root']:[]);
 }
 const calls=[],topic=Object.assign(Object.create(TopicController.prototype),{id:'real-topic',view:'original',rememberTimeline(){},rememberView(){},leaveEditors:async()=>true,clearHomeRows(){calls.push('root');}});
 assert.equal(await topic.leave(),true);assert.deepEqual(calls,[]);
});
