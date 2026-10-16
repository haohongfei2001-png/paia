import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PersonalTopicRoot} from '../ui/personal-topic-root.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';
import {TopicRootSlots} from '../ui/topic-root-slots.js';

test('ordered column stacking closes committed holes without changing identity nodes or imposing equal heights',()=>{
 const host=new Node('div');host.clientWidth=1000;host.style={setProperty(){}};
 const ids=['a','b','c','d','e','f'],heights=[100,200,150,80,120,90],nodes=new Map(ids.map((id,index)=>{const node=new Node('article');node.dataset.topicId=id;node.style={};node.getBoundingClientRect=()=>({height:heights[index]});return [id,node];}));
 const owner=Object.assign(Object.create(PersonalTopicRoot.prototype),{host,nodes,items:ids.map(id=>({id})),slots:new TopicRootSlots(),complete:true,fit(){},columns:()=>3});
 owner.layout();assert.equal(nodes.get('d').style.gridRow,'119 / span 80');assert.equal(nodes.get('e').style.gridRow,'219 / span 120');assert.equal(nodes.get('f').style.gridRow,'169 / span 90');assert.deepEqual(host.children,ids.map(id=>nodes.get(id)));
 const identity=nodes.get('e');owner.items=ids.filter(id=>id!=='b').map(id=>({id}));owner.layout();assert.equal(nodes.get('e'),identity);assert.equal(identity.dataset.rootSlot,'4');assert.equal(identity.style.gridColumn,'1');assert.equal(identity.style.gridRow,'119 / span 120');assert.equal(nodes.get('f').style.gridRow,'169 / span 90');assert.equal(host.children.length,5);
 heights[0]=135;owner.layout();assert.equal(identity.style.gridRow,'154 / span 120','a genuine content-height change updates only stacking geometry');
 owner.items=ids.map(id=>({id}));owner.layout();assert.equal(identity.style.gridColumn,'2');assert.equal(identity.style.gridRow,'219 / span 120');
});

test('white Topic card adds only an inert shared symbol and preserves exact native identity links',()=>{
 const previous={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection};
 globalThis.document={documentElement:{lang:'zh-CN'},createElement:tag=>new Node(tag),createElementNS:(ns,tag)=>new Node(tag,ns)};
 globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:true});
 try{
  const opened=[],owner=Object.assign(Object.create(PersonalTopicRoot.prototype),{open:(...args)=>opened.push(args)});
  const item={id:'topic-1',name:'SYNTHETIC 量子 👩‍💻',sectionOverview:{items:[{id:'section-1',title:'SYNTHETIC 章一'}],complete:true}},before=JSON.stringify(item),tile=owner.tile(item);
  const [title,sections,more]=tile.children,[symbol,link]=title.children;
  assert.equal(title.textContent,item.name);assert.equal(link.textContent,item.name);assert.equal(symbol.getAttribute('aria-hidden'),'true');assert.equal(symbol.children[0].getAttribute('focusable'),'false');assert.equal(symbol.children[0].dataset.paiaIcon,'thoughts');
  assert.equal(tile.children.length,3,'approved Root creates only title, real Sections and continuation');assert.equal(tile.children.some(node=>node.classList.contains('personal-topic-preview')),false);assert.equal(sections.children[0].textContent,item.sectionOverview.items[0].title);assert.equal(sections.children[0].dataset.sectionId,'section-1');assert.equal(more.textContent,'更多章节');
  link.listeners.get('click')({button:0,detail:1,preventDefault(){}});sections.children[0].listeners.get('click')({button:0,detail:1,preventDefault(){}});
  assert.deepEqual(opened,[['topic-1',null],['topic-1','section-1']]);assert.equal(JSON.stringify(item),before);assert.equal(tile.textContent.includes('undefined'),false);
 }finally{for(const [key,value]of Object.entries(previous))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
test('retained UX section5 card roles preserve actual chapter links, content sizing and coarse focus targets',async()=>{
 const css=await readFile(new URL('../ui/personal-topic-root.css',import.meta.url),'utf8');
 assert.match(css,/personal-topic-block\{[^}]*padding:22px;[^}]*border-radius:16px/);assert.match(css,/personal-topic-title\{[^}]*font:500 16px\/1\.6 var\(--font\);font-synthesis:none/);assert.match(css,/personal-section-link\{[^}]*font:400 13\.5px\/1\.65 var\(--font\)/);assert.match(css,/column-gap:18px;row-gap:0;grid-auto-rows:1px;width:100%/);assert.match(css,/personal-topic-sections\{[^}]*margin-left:33px/);assert.doesNotMatch(css,/personal-(?:topic-sections|section-link)[^{}]*::before/,'approved durable Section links have no malformed connector');
 assert.match(css,/align-items:start/);assert.match(css,/@media\(pointer:coarse\)[^\n]*min-height:44px/);assert.match(css,/a:focus-visible\{outline:2px solid/);assert.match(css,/personal-entry-preview\{display:none!important\}/);
 assert.doesNotMatch(css,/\.personal-topic-block\{[^}]*height:[1-9]/);assert.match(css,/personal-topic-block\[data-search-state="true"\]/);
});
test('white Home shell isolates the approved desktop axis and keeps writing while generic Topic creation stays retired',async()=>{
 const css=await readFile(new URL('../ui/thought-reader.css',import.meta.url),'utf8'),source=await readFile(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');
 assert.match(css,/body\[data-paia-space="thoughts"\]\[data-paia-surface="root"\] #thought-panel\{display:grid;grid-template-columns:minmax\(0,1fr\);column-gap:0;row-gap:0;max-width:none;margin:0;padding:46px 62px 80px/);
 assert.match(css,/#thought-collection\{grid-row:2;width:100%;max-width:1060px/);assert.match(css,/#thought-root-heading\{display:none;margin:0/);assert.doesNotMatch(css,/--root-head-gap:|grid-template-columns:minmax\(0,1fr\) 282px|thought-root-heading h1\{font-size:34px/,'retired headline and search geometry cannot reserve empty Root rows');assert.match(css,/thought-root-actions>button\{min-height:44px;min-width:44px/);
 assert.match(css,/thought-root-actions>\.library-actions>summary\{min-height:36px;min-width:36px;display:grid/);
 assert.match(css,/@media\(max-width:767px\),\(pointer:coarse\)\{[^\n]*thought-root-actions>\.library-actions>summary\{min-height:44px;min-width:44px/);
 assert.match(source,/rootActions\.append\(homeMenu,button\(tc\('写下想法'\),\(\)=>this\.createStandalone\(\)\)\)/);assert.doesNotMatch(source,/rootActions\.append[^;]*createTopic/);
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

test('approved metadata-only Thought Home keeps its independent writing toolbar without eyebrow or query UI',async()=>{
 const reference=JSON.parse(await readFile(new URL('./fixtures/white-refinement/thought-home-shell.json',import.meta.url),'utf8'));
 const css=await readFile(new URL('../ui/thought-reader.css',import.meta.url),'utf8'),source=await readFile(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');
 assert.equal(reference.sha256,'d4c99ec834b4af42eba8ece001a9165e644d0ce9b9e18c46e9cc8e9ec6e43541');
 assert.deepEqual([reference.desktopHeadGap,reference.tabletHeadGap,reference.smallHeadGap,reference.mobileSearchGap,reference.toolbarMinHeight,reference.toolbarBottomGap],[23,29,25,22,33,17]);
 // This immutable 1.3 receipt remains historical; YEAR-HARMONY section0
 // retains PRE_YEAR section5's compact content roles, not a retired h1 reserve.
 const contract=await readFile(new URL('../docs/consumer-product-v1/UX_CONTRACT.md',import.meta.url),'utf8'),retained=await readFile(new URL('../docs/consumer-product-v1/UX_CONTRACT_PRE_YEAR_2026-10-16.md',import.meta.url),'utf8');
 assert.match(contract,/All nonconflicting sections 0–6/);assert.match(retained,/Topic title16px\/500/);assert.match(retained,/approximately1060px maximum workspace,18px gutters,22px interior spacing and16px radius/);
 assert.match(css,/thought-root-toolbar\{grid-column:1 \/ -1;grid-row:1;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:33px;margin-bottom:17px;padding:0 2px;max-width:1060px\}/);
 assert.match(css,/thought-root-toolbar\{[^}]*max-width:1060px/);assert.match(css,/#thought-collection\{grid-row:2;width:100%;max-width:1060px/);
 assert.doesNotMatch(css,/--root-head-gap:|thought-root-eyebrow\{|thought-search-row\{grid-column:1;grid-row:2;margin-top:22px/,'retired eyebrow/search must not leave active layout reserves');
 assert.match(source,/rootToolbar\.append\(rootActions\);\$\('thought-home-tools'\)\.append\(rootToolbar\)/);
 assert.match(source,/\$\('thought-root-heading'\)\.replaceChildren\(\)/);assert.doesNotMatch(source,/element\('div','thought-root-eyebrow'/);const html=await readFile(new URL('../ui/archive.html',import.meta.url),'utf8');assert.doesNotMatch(html,/<input[^>]*id="thought-search"/);
 const copy=await import('../ui/thought-copy.js'),prior=globalThis.document;
 try{globalThis.document={documentElement:{lang:'en'}};assert.equal(copy.thoughtCopy('我的主题'),'My topics');document.documentElement.lang='zh';assert.equal(copy.thoughtCopy('我的主题'),'我的主题');}finally{globalThis.document=prior;}
});
