import test from 'node:test';
import assert from 'node:assert/strict';
import {topicPresentationFacts} from '../ui/topic-workspace-presentation.js';
import {TopicController} from '../ui/topic-workspace.js';
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
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.className='';this.textContent='';this.handlers=new Map();this.classList={contains:name=>this.className.split(' ').includes(name),add:name=>{if(!this.classList.contains(name))this.className+=' '+name;},remove:name=>{this.className=this.className.split(' ').filter(value=>value!==name).join(' ');}};}
 get parentNode(){return this.parentElement;}get nextSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}get isConnected(){return this===document.body||this.parentElement?.isConnected===true;}
 remove(){if(this.parentElement)this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);this.parentElement=null;}
 insertBefore(node,before){node.remove();node.parentElement=this;this.children.splice(before?this.children.indexOf(before):this.children.length,0,node);}
 append(...nodes){for(const node of nodes)this.insertBefore(node,null);}replaceChildren(...nodes){for(const node of [...this.children])node.remove();this.append(...nodes);}
 after(node){this.parentElement.insertBefore(node,this.nextSibling);}before(node){this.parentElement.insertBefore(node,this);}
 setAttribute(name,value){this[name]=String(value);}addEventListener(type,handler){this.handlers.set(type,handler);}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return rows;if(selector.startsWith('.'))return rows.filter(node=>node.classList.contains(selector.slice(1)));if(selector.startsWith('[data-')){const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());return rows.filter(node=>key in node.dataset);}return rows.filter(node=>node.tagName===selector);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
async function withTopicPresentation(run,{presentation={revision:1}}={}){
 const prior=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),body=new Node('body'),nodes=new Map(),make=(id,tag='div')=>{const node=new Node(tag);node.id=id;nodes.set(id,node);return node;};
 const header=make('header'),panel=make('thought-panel'),root=make('thought-document'),title=new Node(),heading=make('topic-heading'),controls=make('topic-presentation'),toolbar=make('topic-toolbar'),menu=make('topic-menu'),menuItems=new Node(),historyTools=new Node();
 title.className='topic-title-row';menuItems.className='library-action-list';historyTools.className='library-history-tools';
 const write=make('create-entry','button'),tabs=make('topic-original-tabs'),reading=make('topic-reading-controls'),outline=make('topic-outline'),history=make('revision-history','button'),topicBody=make('topic-body'),original=make('original-reading-body'),ai=make('ai-reading-body'),toggle=make('ai-presentation-toggle','input'),update=make('ai-library-update','button');
 write.textContent='添加内容';body.append(header,panel);header.append(history);panel.append(root);root.append(title,toolbar,tabs,reading,outline,topicBody);title.append(heading,controls);controls.append(update,toggle);toolbar.append(write,menu,historyTools);menu.append(menuItems);topicBody.append(original,ai);
 const handlers=new Map([[toggle,()=>{}],[update,()=>{}],[write,()=>{}]]);for(const [node,handler]of handlers)node.addEventListener('click',handler);
 globalThis.document={body,documentElement:{lang:'zh-CN'},createElement:tag=>new Node(tag),getElementById:id=>nodes.get(id)||null};globalThis.chrome={runtime:{sendMessage(){throw Error('Presentation restoration must not request or write data');}}};
 const rendered=[],row={topicId:'topic',presentation},owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'ai',originalMode:'content',desktopAppearance:true,statusEpoch:0,statusReadSerial:0,serial:0,loadToken:Symbol('read'),readRetry:new Node(),originalPane:original,aiPane:ai,topic:{name:'Synthetic Topic'},aiTopics:new Map([['topic',row]]),async readContentRefresh(){return true;},renderCandidate(value){rendered.push(value);},renderAITopicStatus(){}});
 try{await run({owner,nodes,root,title,controls,toolbar,menuItems,historyTools,history,original,ai,handlers,row,rendered});}finally{for(const [key,value]of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}
for(const presentation of [{revision:1},null])test(`D7 actual AI refresh restores existing Topic controls after leave with ${presentation?'saved Current':'no Current'}`,()=>withTopicPresentation(async f=>{
 const {owner,root,title,controls,toolbar,menuItems,historyTools,history,handlers,ai,row}=f;
 owner.enableDesktopPresentation();const initial=owner.desktopPresentation;
 assert.equal(await owner.leaveEditors(),true);assert.equal(initial.disposed,true);assert.equal(owner.desktopPresentation,null);assert.equal(controls.parentElement,title);
 for(let reopen=0;reopen<2;reopen++){
  owner.loadToken=Symbol('reopen');assert.equal(await owner.readRefresh(),true);
  const active=owner.desktopPresentation;assert.ok(active);assert.equal(root.classList.contains('dvn-topic-composition'),true);assert.equal(root.querySelectorAll('.dvn-topic-action-row').length,1);
  assert.equal(controls.parentElement,active.actions);assert.equal(toolbar.parentElement,active.actions);assert.equal(history.parentElement,active.options);assert.equal(historyTools.parentElement,menuItems);
  for(const [node,handler]of handlers){assert.equal(node.isConnected,true);assert.equal(node.handlers.get('click'),handler);}
  assert.equal(active.line.hidden,true);assert.equal(active.years.hidden,true);assert.equal(await owner.readRefresh(),true);assert.equal(owner.desktopPresentation,active,'same-owner refresh reuses one presentation');
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
