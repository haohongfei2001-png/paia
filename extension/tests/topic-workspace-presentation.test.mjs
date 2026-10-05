import test from 'node:test';
import assert from 'node:assert/strict';
import {topicPresentationFacts} from '../ui/topic-workspace-presentation.js';
import {TopicController} from '../ui/topic-workspace.js';
import {TopicAIViewSession} from '../core/topic-ai-view-session.js';
import {TopicTimelinePositions} from '../ui/topic-timeline-window.js';
test('Topic presentation derives only verified year coverage without inventing conversations',()=>{
 const facts=topicPresentationFacts({coverage:'complete',knownYearCounts:{2026:3,2025:2,2021:1},unknownCount:1});
 assert.equal(facts.caption,'2021—2026 · 已收录的表达');assert.equal(facts.coverage,'按时间完整浏览，不按“重要性”删表达。6条有时间，另1条时间未知。');assert.deepEqual(facts.years,['2026','2025','2021','unknown']);assert.doesNotMatch(facts.caption,/跨会话/);
});
test('Topic presentation respects current order and does not invent empty years',()=>{
 assert.deepEqual(topicPresentationFacts({coverage:'complete',knownYearCounts:{2026:1,2025:0,2021:1},unknownCount:0},'asc').years,['2021','2026']);
});
test('incomplete Topic metadata never claims full count or dates',()=>{
 assert.deepEqual(topicPresentationFacts({coverage:'partial',knownYearCounts:{2026:100}}),{caption:'表达时间范围尚未核对',coverage:'当前仅显示已载入的表达。',years:[]});
});

// DOM doubles support the real Topic owner and its real presentation moves.
// The completed data read is controlled; no replacement lifecycle is implemented.
class Node {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.className='';this.textContent='';this.value='';this.open=false;this.hidden=false;this.handlers=new Map();this.listeners=new Map();this.classList={contains:name=>this.className.split(' ').includes(name),add:name=>{if(!this.classList.contains(name))this.className+=' '+name;},remove:name=>{this.className=this.className.split(' ').filter(value=>value!==name).join(' ');},toggle:(name,force)=>{if(force)this.classList.add(name);else this.classList.remove(name);}};}
 get parentNode(){return this.parentElement;}get nextSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}get isConnected(){return this===document.body||this.parentElement?.isConnected===true;}
 contains(node){return node===this||this.children.some(child=>child.contains(node));}
 focus(options){if(!this.isConnected)return;for(let node=this;node;node=node.parentElement)if(node.hidden||node.inert||node.tagName==='details'&&!node.open&&this!==node.children[0])return;document.activeElement=this;this.focusOptions=options;}
 remove(){if(this.parentElement){if(typeof document!=='undefined'&&this.contains(document.activeElement))document.activeElement=document.body;this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);}this.parentElement=null;}
 insertBefore(node,before){node.remove();node.parentElement=this;this.children.splice(before?this.children.indexOf(before):this.children.length,0,node);}
 append(...nodes){for(const node of nodes)this.insertBefore(node,null);}replaceChildren(...nodes){for(const node of [...this.children])node.remove();this.append(...nodes);}
 after(node){this.parentElement.insertBefore(node,this.nextSibling);}before(node){this.parentElement.insertBefore(node,this);}
 setAttribute(name,value){this[name]=String(value);}addEventListener(type,handler){this.handlers.set(type,handler);if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(handler);}
 click(){for(const handler of this.listeners.get('click')||[])handler({currentTarget:this});}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return rows;if(selector.startsWith('.'))return rows.filter(node=>node.classList.contains(selector.slice(1)));if(selector.startsWith('[data-')){const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());return rows.filter(node=>key in node.dataset);}return rows.filter(node=>node.tagName===selector);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
async function withTopicPresentation(run,{presentation={revision:1}}={}){
 const prior=new Map(['document','chrome','scrollY','scrollTo'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),body=new Node('body'),nodes=new Map(),make=(id,tag='div')=>{const node=new Node(tag);node.id=id;nodes.set(id,node);return node;};
 const header=make('header'),panel=make('thought-panel'),root=make('thought-document'),title=new Node(),heading=make('topic-heading'),controls=make('topic-presentation'),toolbar=make('topic-toolbar'),menu=make('topic-menu'),menuItems=new Node(),historyTools=new Node();
 title.className='topic-title-row';menuItems.className='library-action-list';historyTools.className='library-history-tools';
 const write=make('create-entry','button'),tabs=make('topic-original-tabs'),reading=make('topic-reading-controls'),outline=make('topic-outline'),history=make('revision-history','button'),topicBody=make('topic-body'),original=make('original-reading-body'),ai=make('ai-reading-body'),toggle=make('ai-presentation-toggle','input'),update=make('ai-library-update','button');
 write.textContent='添加内容';body.append(header,panel);header.append(history);panel.append(root);root.append(title,toolbar,tabs,reading,outline,topicBody);title.append(heading,controls);controls.append(update,toggle);toolbar.append(write,menu,historyTools);menu.append(menuItems);topicBody.append(original,ai);
 reading.append(make('topic-search','input'));panel.append(make('thought-list'),make('thought-search','input'));
 for(const id of ['ai-update-feedback','library-cost-preview','ai-library-retry','bounded-progress','library-update-details'])panel.append(make(id));
 const dialog=make('library-dialog','dialog'),dialogClose=make('library-dialog-close','button');body.append(dialog);dialog.append(make('library-dialog-title'),make('library-dialog-content'),make('library-form'),make('standalone-revisions'),dialogClose);
 // Model the invoker captured at showModal, not the browser's native dialog.
 dialog.showModal=()=>{dialog.invoker=document.activeElement;dialog.open=true;dialogClose.focus();};dialog.close=()=>{if(dialog.open){dialog.open=false;dialog.invoker?.focus();}};
 const clicks=new Map(),handlers=new Map([toggle,update,write,history].map(node=>[node,()=>clicks.set(node,(clicks.get(node)||0)+1)]));for(const [node,handler]of handlers)node.addEventListener('click',handler);
 globalThis.document={body,activeElement:body,documentElement:{lang:'zh-CN'},createElement:tag=>new Node(tag),getElementById:id=>nodes.get(id)||null};globalThis.chrome={runtime:{sendMessage(){throw Error('Presentation restoration must not request or write data');}}};globalThis.scrollY=0;globalThis.scrollTo=()=>{};
 const rendered=[],row={topicId:'topic',presentation},owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'ai',originalMode:'content',readingSort:'asc',topicProviderKey:null,desktopAppearance:true,statusEpoch:0,statusReadSerial:0,serial:0,loadToken:Symbol('read'),readRetry:new Node(),originalPane:original,aiPane:ai,topic:{name:'Synthetic Topic'},aiTopics:new Map([['topic',row]]),aiViewSession:new TopicAIViewSession(),timelinePositions:new TopicTimelinePositions(),contentPositions:new TopicTimelinePositions(),homePositions:new Map(),pages:[],onOpen(){},async readContentRefresh(){return true;},renderCandidate(value){rendered.push(value);},renderAITopicStatus(){}});
 try{await run({owner,nodes,root,title,controls,toolbar,menuItems,historyTools,history,original,ai,handlers,clicks,row,rendered,dialog,dialogClose});}finally{for(const [key,value]of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}
for(const presentation of [{revision:1},null])test(`D7 actual AI refresh restores existing Topic controls after leave with ${presentation?'saved Current':'no Current'}`,()=>withTopicPresentation(async f=>{
 const {owner,root,title,controls,toolbar,menuItems,historyTools,history,handlers,clicks,ai,row}=f;
 owner.enableDesktopPresentation();const initial=owner.desktopPresentation;initial.options.open=true;
 assert.equal(await owner.leaveEditors(),true);assert.equal(initial.disposed,true);assert.equal(owner.desktopPresentation,null);assert.equal(controls.parentElement,title);
 for(let reopen=0;reopen<2;reopen++){
  owner.loadToken=Symbol('reopen');assert.equal(await owner.readRefresh(),true);
  const active=owner.desktopPresentation;assert.ok(active);assert.equal(root.classList.contains('dvn-topic-composition'),true);assert.equal(root.querySelectorAll('.dvn-topic-action-row').length,1);
  assert.equal(controls.parentElement,active.actions);assert.equal(toolbar.parentElement,active.actions);assert.equal(history.parentElement,active.options);assert.equal(historyTools.parentElement,menuItems);
  for(const [node,handler]of handlers){assert.equal(node.isConnected,true);assert.equal(node.handlers.get('click'),handler);assert.equal(node.listeners.get('click').size,1);node.click();assert.equal(clicks.get(node),reopen+1);}
  assert.equal(active.line.hidden,false);assert.equal(active.coverage.hidden,true);assert.equal(active.years.hidden,true);assert.equal(active.options.open,true);assert.equal(await owner.readRefresh(),true);assert.equal(owner.desktopPresentation,active,'same-owner refresh reuses one presentation');
  assert.equal(ai.querySelectorAll('[data-ai-first-generation]').length,row.presentation?0:1);
  await owner.leaveEditors();assert.equal(owner.desktopPresentation,null);assert.equal(root.querySelectorAll('.dvn-topic-action-row').length,0);assert.equal(controls.parentElement,title);
 }
},{presentation}));

for(const invalidation of ['stale-read','left-owner','new-read','other-topic'])test(`D7 obsolete AI completion cannot restore Topic controls after ${invalidation}`,()=>withTopicPresentation(async({owner,root,rendered})=>{
 if(invalidation==='left-owner')owner.enableDesktopPresentation();
 let finish;owner.readContentRefresh=()=>new Promise(resolve=>{finish=resolve;});const pending=owner.readRefresh();
 if(invalidation==='left-owner')await owner.leaveEditors();
 else if(invalidation==='new-read')owner.loadToken=Symbol('newer read');
 else if(invalidation==='other-topic')owner.id='other';
 finish(invalidation!=='stale-read');assert.equal(await pending,false);assert.equal(owner.desktopPresentation??null,null);assert.equal(root.classList.contains('dvn-topic-composition'),false);assert.equal(root.querySelectorAll('.dvn-topic-action-row').length,0);assert.deepEqual(rendered,[]);
}));

test('D7 closed reading options remain closed through same-owner reconstruction',()=>withTopicPresentation(async({owner})=>{
 owner.enableDesktopPresentation();assert.equal(owner.desktopPresentation.options.open,false);
 await owner.leaveEditors();await owner.readRefresh();assert.equal(owner.desktopPresentation.options.open,false);
}));

test('D7 pending first AI leave preserves the presented AI identity through its temporary Original cleanup',()=>withTopicPresentation(async({owner})=>{
 owner.aiPending=true;owner.enableDesktopPresentation().options.open=true;
 await owner.leave();assert.equal(owner.view,'ai');await owner.readRefresh();assert.equal(owner.desktopPresentation.options.open,true);
},{presentation:null}));

test('D7 actual Topic open consumes options state without reviving a prior Topic',()=>withTopicPresentation(async({owner,root})=>{
 // Replace only the completed data render, retaining open/leave and presentation.
 owner.refresh=async()=>{owner.enableDesktopPresentation();};
 owner.enableDesktopPresentation();owner.desktopPresentation.options.open=true;
 await owner.open('topic');assert.equal(owner.desktopPresentation.options.open,true);
 owner.requestedTopicView='ai';await owner.open('other');assert.equal(owner.desktopPresentation.options.open,false);
 owner.requestedTopicView='ai';await owner.open('topic');assert.equal(owner.desktopPresentation.options.open,false);
 assert.equal(root.querySelectorAll('.dvn-topic-options').length,1);
}));

test('D7 actual view switch resets retained options without reviving the prior view',()=>withTopicPresentation(async({owner})=>{
 owner.refresh=async()=>{owner.enableDesktopPresentation();};
 const active=owner.enableDesktopPresentation();active.options.open=true;
 await owner.switchView('original');assert.equal(owner.desktopPresentation,active);assert.equal(active.options.open,false);
 active.options.open=true;await owner.switchView('ai');assert.equal(owner.desktopPresentation,active);assert.equal(active.options.open,false);
 await owner.switchView('original');assert.equal(active.options.open,false);
}));

for(const change of ['topic','view'])test(`D7 reconstruction consumes mismatched ${change} options state once`,()=>withTopicPresentation(async({owner})=>{
 owner.enableDesktopPresentation().options.open=true;await owner.leaveEditors();
 if(change==='topic')owner.id='other';else owner.view='original';
 assert.equal(owner.enableDesktopPresentation().options.open,false);await owner.leaveEditors();
 owner.id='topic';owner.view='ai';assert.equal(owner.enableDesktopPresentation().options.open,false);
}));

for(const control of ['revision-history','ai-presentation-toggle'])test(`D7 disposal preserves only focus lost moving ${control}`,()=>withTopicPresentation(async({owner,nodes})=>{
 const active=owner.enableDesktopPresentation();active.options.open=true;const invoker=nodes.get(control);invoker.focus();assert.equal(document.activeElement,invoker);
 await owner.leaveEditors();assert.equal(document.activeElement,invoker);assert.deepEqual(invoker.focusOptions,{preventScroll:true});
}));

test('D7 disposal does not replace newer focus or restore it again on duplicate disposal',()=>withTopicPresentation(async({owner,history,dialogClose})=>{
 const active=owner.enableDesktopPresentation();active.options.open=true;history.focus();
 const originalParent=active.moves.find(move=>move.node===history).parent,insert=originalParent.insertBefore;
 originalParent.insertBefore=function(node,before){insert.call(this,node,before);if(node===history)dialogClose.focus();};
 await owner.leaveEditors();assert.equal(document.activeElement,dialogClose);
 document.body.focus();active.dispose();assert.equal(document.activeElement,document.body);
}));

test('D7 disposal never restores a disconnected control or a generated summary',()=>withTopicPresentation(async({owner,history})=>{
 let active=owner.enableDesktopPresentation();active.options.open=true;history.focus();
 active.moves.find(move=>move.node===history).parent.remove();await owner.leaveEditors();assert.equal(history.isConnected,false);assert.equal(document.activeElement,document.body);
 // Restore the original header so a second presenter can use the real control.
 const header=document.getElementById('header');document.body.append(header);header.append(history);
 active=owner.enableDesktopPresentation();const summary=active.options.querySelector('summary');summary.focus();assert.equal(document.activeElement,summary);
 await owner.leaveEditors();assert.equal(document.activeElement,document.body);assert.equal(summary.isConnected,false);
}));

for(const presentation of [{revision:1},null])test(`D7 actual AI History keeps its invoker and options across repeated ${presentation?'saved Current':'no Current'} reads`,()=>withTopicPresentation(async({owner,history,dialog,dialogClose,root})=>{
 const requests=[];chrome.runtime.sendMessage=async message=>{requests.push(message);assert.deepEqual(message,{type:'GET_AI_PRESENTATION_REVISIONS',options:{topicId:'topic'}});return {ok:true,data:{items:[]}};};
 owner.refresh=async()=>{owner.loadToken=Symbol('history refresh');return owner.readRefresh();};
 owner.enableDesktopPresentation().options.open=true;
 for(let attempt=0;attempt<2;attempt++){
  history.focus();await owner.aiRevisions();assert.equal(dialog.invoker,history,'owner opens history after disposal with the same focused control');assert.equal(dialog.open,true);assert.equal(document.activeElement,dialogClose,'remount never steals dialog focus');
  assert.equal(owner.desktopPresentation.line.hidden,false);assert.equal(owner.desktopPresentation.options.open,true);assert.equal(history.parentElement,owner.desktopPresentation.options);assert.equal(root.querySelectorAll('.dvn-topic-options').length,1);assert.equal(history.listeners.get('click').size,1);
  await owner.requestCloseDialog();assert.equal(document.activeElement,history);assert.equal(dialog.open,false);
 }
 assert.equal(requests.length,2,'presentation adds no read, save, or authorization request');
},{presentation}));

for(const focus of ['returned-history','newer-before-read','newer-during-mount','disconnected'])test(`D7 actual AI History closed before its refresh preserves only valid focus: ${focus}`,()=>withTopicPresentation(async({owner,history,dialog,nodes})=>{
 const requests=[];chrome.runtime.sendMessage=async message=>{requests.push(message);assert.deepEqual(message,{type:'GET_AI_PRESENTATION_REVISIONS',options:{topicId:'topic'}});return {ok:true,data:{items:[]}};};
 let release,entered;const held=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});
 owner.refresh=async()=>{entered();await held;owner.loadToken=Symbol('late history refresh');return owner.readRefresh();};
 owner.enableDesktopPresentation().options.open=true;history.focus();const pending=owner.aiRevisions();await started;
 assert.equal(dialog.open,true);assert.equal(dialog.invoker,history);assert.equal(owner.desktopPresentation,null);
 await owner.requestCloseDialog();assert.equal(dialog.open,false);assert.equal(document.activeElement,history);assert.equal(history.parentElement.id,'header');
 const newer=nodes.get('thought-search');if(focus==='newer-before-read')newer.focus();
 const create=document.createElement;document.createElement=tag=>{const node=create(tag);if(tag==='nav'){if(focus==='newer-during-mount')newer.focus();if(focus==='disconnected')history.remove();}return node;};
 release();await pending;
 assert.equal(owner.desktopPresentation.options.open,true);assert.equal(history.isConnected,focus!=='disconnected');
 assert.equal(document.activeElement,focus==='disconnected'?document.body:focus.startsWith('newer')?newer:history);assert.equal(requests.length,1);
 if(focus==='returned-history')assert.deepEqual(history.focusOptions,{preventScroll:true});
}));

for(const identity of ['topic','view'])for(const timing of ['before-mount','during-mount'])test(`D7 remount does not restore moved focus for mismatched ${identity} ${timing}`,()=>withTopicPresentation(async({owner,history})=>{
 owner.enableDesktopPresentation().options.open=true;history.focus();await owner.leaveEditors();assert.equal(document.activeElement,history);
 const change=()=>{if(identity==='topic')owner.id='other';else owner.view='original';};
 if(timing==='before-mount')change();else{const create=document.createElement;document.createElement=tag=>{const node=create(tag);if(tag==='nav')change();return node;};}
 const active=owner.enableDesktopPresentation();assert.equal(active.options.open,false);assert.equal(history.isConnected,true);assert.equal(history.parentElement,active.options);assert.equal(document.activeElement,document.body);
}));
