import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {setIconLabel,setIconOnly} from '../ui/icons.js';
import {validArchiveOrigin} from '../ui/route-history.js';
import {thoughtCopy} from '../ui/thought-copy.js';
import {TopicController} from '../ui/topic-workspace.js';

const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const topicSource=readFileSync(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../ui/archive.html',import.meta.url),'utf8');
function slice(from,to){const start=source.indexOf(from),end=source.indexOf(to,start+from.length);assert.ok(start>=0&&end>start);return source.slice(start,end);}
const paints=slice('function archiveBackLabel(',"document.addEventListener('paia:preferences-applied'");
const backClick=slice("$('back').addEventListener('click',",'let inputSearchTimer;');
const sortClick=slice("$('input-time-toggle').addEventListener('click',",'\n');
const originReturn=slice('function returnArchiveOrigin(', '\nconst startupNavigation=');
const snapshot=kind=>({originKind:kind,readerDocumentId:'doc',view:'library',query:'SYNTHETIC_QUERY',cursor:null,pages:[],scroll:17,searchProject:null,sourceScope:null,navigator:null,dateStart:'',dateEnd:'',includeFiltered:true,focus:null});
async function fixture(run,{lang='zh-CN',sort='desc',view='library',origin=snapshot('search-results')}={}){
 const previous=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const body=new PresentationNode(),back=new PresentationNode('button'),toggle=new PresentationNode('button'),topicToggle=new PresentationNode('button'),controls=new PresentationNode(),prose=new PresentationNode();
 controls.append(topicToggle);controls.querySelectorAll=()=>[topicToggle];body.append(back,toggle,controls,prose);prose.textContent='SYNTHETIC exact\n\n行🙂';const selection={anchorNode:prose,anchorOffset:3,focusNode:prose,focusOffset:9};
 const nodes=new Map([['back',back],['input-time-toggle',toggle],['topic-order-toggle',topicToggle],['topic-time-order',controls]]),events=new Map(),calls=[];
 globalThis.document={body,documentElement:{lang},activeElement:null,createElement:tag=>new PresentationNode(tag),createElementNS:(ns,tag)=>new PresentationNode(tag,ns),getElementById:id=>nodes.get(id),addEventListener:(type,handler)=>events.set(type,handler)};
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message);return {ok:true,data:{}};}}};
 const context={document,view,documentId:'doc',returnTo:'library',archiveOriginKey:'origin',archiveOrigins:{get:()=>origin},validArchiveOrigin,readerCopy:(zh,en)=>document.documentElement.lang==='en'?en:zh,tc:thoughtCopy,$:id=>nodes.get(id),setIconLabel,setIconOnly,state:{readingSort:sort},navigate:(...args)=>calls.push(['navigate',...args]),thoughts:{open:(...args)=>calls.push(['thought-open',...args])}};
 vm.createContext(context);vm.runInContext(paints+originReturn+backClick,context);
 try{await run({context,back,toggle,topicToggle,controls,prose,selection,calls,events,nodes});}finally{for(const [key,value]of previous)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}
function iconOnly(node,icon,label){
 assert.equal(node.textContent,'');assert.equal(node.children.length,1);assert.equal(node.children[0].dataset.paiaIcon,icon);assert.equal(node.getAttribute('aria-label'),label);assert.equal(node.getAttribute('title'),null);
 assert.equal(node.children[0].getAttribute('aria-hidden'),'true');assert.equal(node.children[0].getAttribute('focusable'),'false');assert.equal(node.children[0].getAttribute('viewBox'),'0 0 18 18');
}
for(const [kind,zh,en]of [['search-results','返回搜索结果','Back to search results'],['project-browse','返回项目浏览','Back to project browsing'],['archive','返回档案','Back to Archive']])test(`icon-only Back preserves ${kind} origin, locale, node, focus and click owner`,()=>fixture(f=>{
 const handler=f.back.listeners.get('click');f.back.focus();
 for(const [lang,label]of [['zh-CN',zh],['en',en],['zh-CN',zh]]){document.documentElement.lang=lang;f.context.paintArchiveBack();iconOnly(f.back,'back',label);assert.equal(f.back.children[0].children[0].getAttribute('d'),'M11 3L5 9l6 6');assert.equal(document.activeElement,f.back);assert.equal(f.back.listeners.get('click'),handler);}
 handler();assert.deepEqual(JSON.parse(JSON.stringify(f.calls)),[['navigate','library',null,null,{returnOriginKey:'origin',replaceHistory:true}]]);
 assert.equal(f.prose.textContent,'SYNTHETIC exact\n\n行🙂');assert.equal(f.selection.anchorNode,f.prose);
},{origin:snapshot(kind)}));
for(const origin of [null,{...snapshot('search-results'),readerDocumentId:'different'}, {...snapshot('search-results'),originKind:'invented'}])test('icon-only Back never invents a missing, different or invalid recorded origin',()=>fixture(f=>{f.context.paintArchiveBack();iconOnly(f.back,'back','返回档案');},{origin}));
test('Thought Back retains its original target and accessible language; non-reader destinations retain visible labels',()=>fixture(f=>{
 f.context.view='thoughts';f.context.paintArchiveBack();iconOnly(f.back,'back','返回思想库');document.documentElement.lang='en';f.context.paintArchiveBack();iconOnly(f.back,'back','Back to Thought Library');f.back.listeners.get('click')();assert.deepEqual(f.calls,[['thought-open',null]]);
 f.context.view='legacy';f.context.documentId=null;f.context.paintArchiveBack();assert.equal(f.back.textContent,'返回设置');assert.equal(f.back.classList.contains('paia-icon-only'),false);assert.equal(f.back.getAttribute('aria-label'),'返回设置','prior Reader aria cannot mask a later visible destination');
}));
for(const sort of ['asc','desc'])test(`Archive ${sort} icon has truthful current state and next action without captions or tooltip`,()=>fixture(f=>{
 const button=f.toggle;button.addEventListener('click',()=>{});const handler=button.listeners.get('click');button.focus();
 for(const [lang,label]of [['zh-CN',sort==='asc'?'输入时间顺序：正序，最早在前。点击切换为倒序。':'输入时间顺序：倒序，最新在前。点击切换为正序。'],['en',`Input time order: ${sort==='asc'?'ascending, oldest first. Switch to descending.':'descending, newest first. Switch to ascending.'}`]]){document.documentElement.lang=lang;f.context.paintInputTimeOrder();iconOnly(button,sort==='asc'?'sort-up':'sort-down',label);assert.equal(button.dataset.currentSort,sort);assert.equal(button.getAttribute('aria-pressed'),String(sort==='desc'));assert.equal(document.activeElement,button);assert.equal(button.listeners.get('click'),handler);}
 assert.match(source,/preferences-applied',\(\)=>\{paintArchiveBack\(\);paintInputTimeOrder\(\);refreshArchiveTimes\(\);\}/,'live locale repaint uses the same control owner, not a document rerender');
},{sort}));
for(const outcome of ['accepted','guard-refused','newer-route','save-failed'])for(const sort of ['asc','desc'])test(`Archive icon click preserves original ${outcome} ${sort} chronology transaction`,()=>fixture(async f=>{
 const before={pageCursor:{at:40},pageHistory:[{at:0}],annualReading:{year:2023},readingSnapshot:'synthetic-generation',contextInputId:'synthetic-target',inputSortSnapshot:sort};
 Object.assign(f.context,structuredClone(before),{navigationIntent:7,reader:{capture:()=>({id:'synthetic-target',top:17}),restore:async a=>f.calls.push(['restore',a]),schedule:()=>f.calls.push('schedule')},leave:async value=>{f.calls.push(['leave',value]);if(outcome==='newer-route')f.context.navigationIntent++;return outcome!=='guard-refused';},request:async(type,args)=>{f.calls.push([type,args]);if(outcome==='save-failed')throw Error('SYNTHETIC_SAVE_FAILURE');},routes:{commit:args=>f.calls.push(['history',args])},refresh:async()=>f.calls.push('refresh'),window:{scrollTo:(...args)=>f.calls.push(['scroll',...args])},error:message=>f.calls.push(['error',message])});
 f.context.paintInputTimeOrder();vm.runInContext(sortClick,f.context);await f.toggle.listeners.get('click')();const calls=JSON.parse(JSON.stringify(f.calls));
 if(['guard-refused','newer-route'].includes(outcome)){assert.deepEqual(calls,[['leave',true]]);for(const key of Object.keys(before))assert.deepEqual(f.context[key],before[key]);}
 else{assert.deepEqual(calls[1],['SET_ORGANIZER_CONTROLS',{changes:{inputReadingSort:sort==='asc'?'desc':'asc'}}]);if(outcome==='accepted'){assert.deepEqual(calls.slice(2),[['history',{replace:true,anchor:null}],'refresh',['scroll',0,0],'schedule']);assert.equal(f.context.inputSortSnapshot,sort==='asc'?'desc':'asc');assert.equal(f.context.pageCursor,null);assert.equal(f.context.contextInputId,null);assert.equal(f.context.readingSnapshot,null);assert.deepEqual(JSON.parse(JSON.stringify(f.context.annualReading)),{});}else{assert.deepEqual(calls.slice(2,5),['refresh',['restore',{id:'synthetic-target',top:17}],'schedule']);assert.equal(calls[5][0],'error');for(const key of Object.keys(before))assert.deepEqual(f.context[key],before[key]);}}
 assert.equal(f.prose.textContent,'SYNTHETIC exact\n\n行🙂');
},{sort}));
for(const sort of ['asc','desc'])test(`Thought ${sort} presentation keeps target value, opening/busy guard and keyboard button semantics`,()=>fixture(f=>{
 const owner=Object.assign(Object.create(TopicController.prototype),{readingSort:sort}),b=f.topicToggle;b.focus();
 for(const [lang,label]of [['zh-CN',sort==='asc'?'时间排序：正序，最早在前。点击切换为倒序。':'时间排序：倒序，最新在前。点击切换为正序。'],['en',`Time order: ${sort==='asc'?'ascending, oldest first. Switch to descending.':'descending, newest first. Switch to ascending.'}`]]){document.documentElement.lang=lang;owner.syncReadingControls();iconOnly(b,sort==='asc'?'sort-up':'sort-down',label);assert.equal(b.dataset.readingSort,sort==='asc'?'desc':'asc');assert.equal(b.getAttribute('aria-pressed'),String(sort==='desc'));assert.equal(document.activeElement,b);assert.equal(b.disabled,false);}
 owner.topicOpening=1;owner.syncReadingControls();assert.equal(b.disabled,true);delete owner.topicOpening;owner.readingSortBusy=true;owner.syncReadingControls();assert.equal(b.disabled,true);owner.readingSortBusy=false;owner.syncReadingControls();assert.equal(b.disabled,false);
}));
for(const outcome of ['accepted','ime','flush-refused','opening','pending-newer-route'])test(`Thought icon action retains actual ${outcome} save/admission owner`,()=>fixture(async f=>{
 let release;const pending=new Promise(resolve=>release=resolve),editor={surface:{composing:outcome==='ime'},collect(){f.calls.push('collect');},async flush(){f.calls.push('flush');return outcome!=='flush-refused';},dirty:()=>outcome==='flush-refused'};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',openIntent:1,rootCueEpoch:0,presentationIntent:1,activeSectionId:'section',readingSort:'desc',editor,topicAnchor:()=>null,async refresh(){f.calls.push('refresh');},originalPane:null});
 if(outcome==='opening')owner.topicOpening=1;if(outcome==='pending-newer-route')owner.refreshRun={promise:pending};owner.syncReadingControls();const registration=topicSource.split('\n').find(line=>line.includes("for(const b of $('topic-time-order').querySelectorAll('button'))b.addEventListener('click'"));assert.ok(registration);vm.runInNewContext('(function(){'+registration+'}).call(owner)',{owner,$:id=>f.nodes.get(id),productAction:action=>action});const action=f.topicToggle.listeners.get('click')();if(outcome==='pending-newer-route'){owner.openIntent++;release();}await action;
 const calls=f.calls.map(row=>typeof row==='string'?row:row.type);
 if(outcome==='accepted'){assert.deepEqual(calls,['collect','flush','SET_ORGANIZER_CONTROLS','refresh']);assert.equal(owner.readingSort,'asc');assert.equal(owner.topicResetFromStart,true);assert.equal(owner.topicTimeEdge,'earliest');assert.equal(f.topicToggle.dataset.readingSort,'desc');assert.equal(f.topicToggle.getAttribute('aria-pressed'),'false');}
 else{assert.deepEqual(calls,outcome==='flush-refused'?['collect','flush']:[]);assert.equal(owner.readingSort,'desc');assert.equal(f.topicToggle.dataset.readingSort,'asc');}
 assert.equal(f.prose.textContent,'SYNTHETIC exact\n\n行🙂');
}));
test('startup reader buttons have accessible names but no fallback captions; primary and AI labels remain',()=>{
 for(const id of ['back','input-time-toggle','topic-order-toggle']){const match=html.match(new RegExp(`<button\\b[^>]*id="${id}"[^>]*>(.*?)<\\/button>`));assert.ok(match);assert.equal(match[1],'');assert.match(match[0],/aria-label="[^"]+"/);assert.doesNotMatch(match[0],/\btitle=/);}
 assert.match(html,/<button data-view="library">Input Archive<\/button>/);assert.match(html,/<button data-view="thoughts">Thought Library<\/button>/);assert.match(html,/<label class="ai-toggle-label">AI整理 /);
});

test('actual Archive preference listener repaints both icon names without replacing the reader or current order',()=>fixture(f=>{
 f.context.refreshArchiveTimes=()=>f.calls.push('dates');const registration=source.split('\n').find(line=>line.startsWith("document.addEventListener('paia:preferences-applied'"));assert.ok(registration);vm.runInContext(registration,f.context);
 f.context.paintArchiveBack();f.context.paintInputTimeOrder();f.toggle.focus();document.documentElement.lang='en';f.events.get('paia:preferences-applied')();
 iconOnly(f.back,'back','Back to search results');iconOnly(f.toggle,'sort-down','Input time order: descending, newest first. Switch to ascending.');assert.equal(document.activeElement,f.toggle);assert.equal(f.context.state.readingSort,'desc');assert.deepEqual(f.calls,['dates']);assert.equal(f.prose.textContent,'SYNTHETIC exact\n\n行🙂');
}));
test('actual Thought preference listener repaints the current sort icon accessible name in the selected language',()=>fixture(f=>{
 const owner=Object.assign(Object.create(TopicController.prototype),{readingSort:'asc',originalPane:null,topicReader:null,id:null,thoughtRootVisible:()=>false,refreshTopicStamps:()=>f.calls.push('dates')});
 const registration=topicSource.split('\n').find(line=>line.includes("document.addEventListener('paia:preferences-applied',()=>{if(this.originalPane)localizeExactRepeats"));assert.ok(registration);vm.runInNewContext('(function(){'+registration+'}).call(owner)',{owner,document});
 owner.syncReadingControls();f.topicToggle.focus();document.documentElement.lang='en';f.events.get('paia:preferences-applied')();
 iconOnly(f.topicToggle,'sort-up','Time order: ascending, oldest first. Switch to descending.');assert.equal(f.topicToggle.dataset.readingSort,'desc');assert.equal(f.topicToggle.getAttribute('aria-pressed'),'false');assert.equal(document.activeElement,f.topicToggle);assert.equal(owner.readingSort,'asc');assert.deepEqual(f.calls,['dates']);assert.equal(f.prose.textContent,'SYNTHETIC exact\n\n行🙂');
}));
