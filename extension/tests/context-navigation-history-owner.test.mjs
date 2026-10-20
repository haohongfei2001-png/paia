import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const base=process.env.PAIA_ANS01_SOURCE?resolve(process.env.PAIA_ANS01_SOURCE):resolve(import.meta.dirname,'..');
const archive=await readFile(base+'/ui/archive.js','utf8'),nav=await readFile(base+'/ui/reader-navigation.js','utf8'),cards=await readFile(base+'/ui/context-cards.js','utf8');
const {RouteHistory,validRoute,routeViews}=await import(pathToFileURL(base+'/ui/route-history.js'));
const {isComposing}=await import(pathToFileURL(base+'/ui/session-lifecycle.js'));
const topic=await readFile(base+'/ui/topic-workspace.js','utf8');
const {appShellRoute,presentAppShell}=await import(pathToFileURL(base+'/ui/app-shell-state.js'));
function segment(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`original source anchors: ${start}`);return text.slice(a,b);}
const navigate=segment(archive,'async function navigate(next,','function showCollection()');
const refresh=segment(archive,'function refresh(){','function inputRemovalIsCurrent(');
const render=segment(archive,'function render(){','//'); // One-line original render, comments following it delimit the function.
const leave=segment(archive,'async function leave(preserve=','\nfunction ');
const install=nav.slice(nav.indexOf('export function installReaderNavigation')).replace('export function','function');
const contextOpen=segment(cards,' async open(card=null){',' async refresh(');
const contextRefresh=segment(cards,' async refresh({rebuild=false,force=false}={}){',' finishNavigation(){');
const contextFinish=segment(cards,' finishNavigation(){',' renderLoadFailure(){');
const topicLeave=segment(topic,' async leave({historyIntent=null}={}){',' async open(id,');
const topicLeaveEditors=segment(topic,' async leaveEditors({historyIntent=null}={}){',' installOriginalTabs(){');
const contextFlush=segment(cards,' async flush(){if(this.moveCommit',' unconfirmed(text)');
const contextLeave=segment(cards,' async leave(){if(this.homeSearch',' close(){this.connectionsView');
const contextClose=segment(cards,' close(){this.connectionsView','\n}');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function fixture({holdPage=false}={}){
 const pageEntered=deferred(),pageReply=deferred(),entered=deferred(),reply=deferred(),events=[],nodes=new Map(),listeners=new Map(),errors=[];let pending=[];
 const noop=()=>{},asyncNoop=async()=>{},node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,open:false,dataset:{},disabled:false,value:'',checked:false,textContent:'',classList:{toggle:noop,add:noop,remove:noop},replaceChildren:noop,append:noop,focus:noop,getBoundingClientRect:()=>({top:0}),contains:()=>false,querySelector:()=>null,querySelectorAll:()=>[],setAttribute:noop});return nodes.get(id);};
 const document={documentElement:{lang:'zh-CN'},activeElement:null,getElementById:node,querySelector:s=>node(s),querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners.set('document:'+type,fn),dispatchEvent:noop};
 let stack=[{}],at=0;
 const history={get state(){return stack[at];},replaceState(value){stack[at]=structuredClone(value);events.push({kind:'replace',view:value.paiaReader?.view,topicId:value.paiaReader?.topicId});},pushState(value){stack.splice(at+1);stack.push(structuredClone(value));at++;events.push({kind:'push',view:value.paiaReader?.view,topicId:value.paiaReader?.topicId});},async back(){assert.ok(at>0);at--;const target=structuredClone(stack[at]);events.push({kind:'back',view:target.paiaReader?.view,topicId:target.paiaReader?.topicId});const p=Promise.resolve(listeners.get('popstate')({state:target}));pending.push(p);return p;},async forward(){assert.ok(at+1<stack.length);at++;const target=structuredClone(stack[at]);events.push({kind:'forward',view:target.paiaReader?.view,topicId:target.paiaReader?.topicId});const p=Promise.resolve(listeners.get('popstate')({state:target}));pending.push(p);return p;}};
 const state={settings:{consentVersion:1},records:[],conversations:[],library:{blocks:[]},pageItemIds:[],nextCursor:null};
 const context={console,structuredClone,crypto:globalThis.crypto,Map,Set,JSON,Object,Array,Promise,clearTimeout,history,document,location:{href:'chrome-extension://synthetic/ui/archive.html'},window:{scrollY:0,scrollTo:noop,scrollBy:noop,addEventListener:(type,fn)=>listeners.set(type,fn)},Event:class{},CustomEvent:class{},RouteHistory,validRoute,views:routeViews,isComposing,stopMemoryRecomposition:noop,appShellRoute,presentAppShell,topicRootTarget:()=>null,readTopicRootSlots:()=>({snapshot:()=>null}),
 closeDesktopAppearancePreview:()=>true,startupNavigation:Promise.resolve(),navigationInFlight:0,navigationIntent:0,scopeSearch:{input:node('scope-search')},inputSearchTimer:null,view:'thoughts',documentId:null,contextInputId:null,returnTo:null,query:'',serial:0,state,partHistory:null,editor:null,readerStream:null,latestRefresh:null,writingRefreshPending:false,lastSuccessfulRefresh:null,inputSearchInProgress:false,qualifySearchContext:null,readingSnapshot:null,annualReading:{},annualRestore:null,inputSortSnapshot:null,contextPositionOnly:false,showFilteredCurrent:false,menuId:null,archiveOriginKey:null,pageCursor:null,pageHistory:[],infoIds:[],searchProject:null,routeStates:new Map(),queries:new Map(),positions:new Map(),archiveOrigins:new Map(),documentHistories:new Map(),
 closeContextDesignView:()=>context.contextCards.close(),readingModals:{close:noop},revisitPage:{leave:asyncNoop,show:asyncNoop},reader:{schedule:noop,capture:()=>null,unmount:noop},topicActions:{surface:null,leave:async()=>true,clearActionFeedback:noop},thoughts:{clearActionFeedback:noop,id:null,view:'original',serial:0,statusEpoch:0,statusReadSerial:0,rootCueEpoch:0,openIntent:0,rootTargetIntent:0,readRetry:node('read-retry'),rememberTimeline:noop,rememberView:noop,cancelTopicRestore:noop,retirePendingTopicPosition:noop,beginRootEntry:noop,async open(id){this.id=id;context.render();}},archiveNavigator:{state:{select:noop},sourceScope:null,sync:noop},onboarding:{load:asyncNoop,paint:noop},smartFilter:{home:noop},inputRecovery:{sync:noop},review:{paint:noop},names:{thoughts:'Thought Library',memory:'Context'},appShell:{viewLabel:x=>x},presentScopeSearch:noop,updateSearchProjectScope:noop,paintArchiveBack:noop,highlightReading:noop,status:noop,nextButtonState:noop,notify:noop,beginLoading:()=>noop,recovery:node('recovery'),pager:node('pager'),previous:node('previous'),error:text=>errors.push(text),tc:x=>x,
 archivePageRequest:async(type)=>{assert.equal(type,'GET_PAGE');if(holdPage){events.push({kind:'page-entered'});pageEntered.resolve();await pageReply.promise;}return structuredClone(state);},request:async(type)=>{assert.equal(type,'PAIA_CONTEXT_CARDS_SNAPSHOT');events.push({kind:'snapshot-entered'});entered.resolve();return reply.promise;},refreshThoughts:asyncNoop,
 editable:card=>['info','rules','now'].includes(card),contextCards:{accessCommit:{},deleteCommit:{},reorderCommit:{},moveCommit:{},recoverNew:asyncNoop,card:null,active:false,page:null,renderedCard:null,openGeneration:0,readGeneration:0,editors:new Map(),host:{querySelector:()=>null},leave:async()=>true,render(){this.page={inert:false,contains:()=>false,querySelector:()=>null};this.renderedCard=this.card;events.push({kind:'context-rendered'});},renderLoadFailure(){events.push({kind:'context-load-failed'});},localizeEditable:noop,paintAccess:noop,paintHomeEntries:noop,orderItems:noop,paintEmpty:noop}
 };
 context.$=node;node('library-view-switch').parentElement=node('.workspace-header');node('info-dialog').open=false;
 vm.createContext(context);
 vm.runInContext(`${navigate}\n${leave}\n${render}\n${refresh}\n${install}\nObject.assign(contextCards,(()=>{const routes={info:true,rules:true,now:true,inputs:true,connections:true};return {${contextOpen},${contextRefresh},${contextFinish},${contextFlush},${contextLeave},${contextClose}};})());Object.assign(thoughts,{${topicLeave},${topicLeaveEditors}});\nthis.navigate=navigate;this.render=render;this.refresh=refresh;this.routes=installReaderNavigation({navigate,current:()=>({view,documentId,topicId:view==='thoughts'?thoughts.id:null,contextCard:view==='memory'?contextCards.card:null,returnTo,searchQuery:query}),present:(route,options)=>presentAppShell(document,route,options)});`,context);
 context.routes.commit();context.thoughts.id='synthetic-retained-topic';context.render();context.routes.commit();
 assert.equal(history.state.paiaReader.topicId,'synthetic-retained-topic');
 return{context,history,pageEntered,pageReply,entered,reply,events,errors,node,async cleanup(){pageReply.resolve();reply.resolve({items:[],epoch:'synthetic-context'});await Promise.allSettled(pending);},get stack(){return structuredClone(stack);}};
}
for(const ready of [false,true])test(`original Context navigation ${ready?'completed read':'pending read'} preserves exact Topic on real Back`,async()=>{
 const f=fixture();let run;
 try{
  run=f.context.navigate('memory');await Promise.race([f.entered.promise,run.then(()=>{throw Error('navigation ended before original Context snapshot');})]);
  assert.equal(f.node('thought-panel').hidden,true);
  assert.equal(f.node('memory-panel').hidden,false);
  if(ready){f.reply.resolve({items:[],epoch:'synthetic-context'});assert.equal(await run,true);assert.equal(f.history.state.paiaReader.view,'memory');assert.equal(f.node('memory-panel').hidden,false);}
  await f.history.back();
  if(!ready){f.reply.resolve({items:[],epoch:'synthetic-context'});assert.equal(await run,false,'late original Context load cannot publish over accepted history navigation');}
  const expected='synthetic-retained-topic';
  assert.equal(f.history.state.paiaReader.topicId,expected);
  assert.equal(f.context.thoughts.id,expected);
  assert.equal(f.context.view,'thoughts');assert.equal(f.node('thought-panel').hidden,false);
  assert.deepEqual(f.errors,[]);console.log(JSON.stringify({ready,events:f.events,finalTopic:f.context.thoughts.id}));
 }finally{f.reply.resolve({items:[],epoch:'synthetic-context'});if(run)await Promise.allSettled([run]);await f.cleanup();}
});

test('Back before the original GET_PAGE returns restores Topic and retires the late Context refresh',async()=>{
 const f=fixture({holdPage:true});let run;
 try{run=f.context.navigate('memory');await Promise.race([f.pageEntered.promise,run.then(()=>{throw Error('navigation ended before original GET_PAGE');})]);
 assert.equal(f.history.state.paiaReader.view,'memory');assert.equal(f.events.filter(x=>x.kind==='snapshot-entered').length,0);
 await f.history.back();assert.equal(f.context.view,'thoughts');assert.equal(f.context.thoughts.id,'synthetic-retained-topic');
 f.pageReply.resolve();assert.equal(await run,false);assert.equal(f.history.state.paiaReader.topicId,'synthetic-retained-topic');assert.equal(f.context.view,'thoughts');assert.equal(f.node('thought-panel').hidden,false);assert.equal(f.node('memory-panel').hidden,true);assert.equal(f.events.filter(x=>x.kind==='snapshot-entered').length,0);assert.deepEqual(f.errors,[]);
 }finally{f.pageReply.resolve();f.reply.resolve({items:[],epoch:'synthetic-context'});if(run)await Promise.allSettled([run]);await f.cleanup();}
});

for(const reason of ['ime','failed-save'])test(`original Topic ${reason} refusal creates no Context history or read`,async()=>{
 const f=fixture();let flushed=0;
 try{f.context.thoughts.editor={composing:reason==='ime',collect(){},async flush(){flushed++;return false;},dirty:()=>true};const before=f.stack;
 assert.equal(await f.context.navigate('memory'),false);assert.deepEqual(f.stack,before);assert.equal(f.context.view,'thoughts');assert.equal(f.events.filter(x=>x.kind==='snapshot-entered').length,0);assert.equal(flushed,reason==='ime'?0:1);
 }finally{await f.cleanup();}
});
test('Context commit is unique across refresh, completed read, Back and Forward',async()=>{
 const f=fixture();try{f.reply.resolve({items:[],epoch:'synthetic-context'});await f.context.navigate('memory');await f.context.refresh();await f.context.refresh();assert.equal(f.events.filter(x=>x.kind==='push'&&x.view==='memory').length,1);const length=f.stack.length;await f.history.back();assert.equal(f.context.thoughts.id,'synthetic-retained-topic');await f.history.forward();assert.equal(f.context.view,'memory');assert.equal(f.stack.length,length);assert.equal(f.events.filter(x=>x.kind==='push'&&x.view==='memory').length,1);assert.deepEqual(f.errors,[]);}finally{await f.cleanup();}
});
test('Context card switch adds one exact route and restore never pushes',async()=>{
 const f=fixture();try{f.reply.resolve({items:[],epoch:'synthetic-context'});await f.context.navigate('memory');await f.context.navigate('memory',null,null,{contextCard:'info'});assert.equal(f.history.state.paiaReader.contextCard,'info');assert.equal(f.events.filter(x=>x.kind==='push'&&x.view==='memory').length,2);const length=f.stack.length;await f.context.routes.restore();assert.equal(f.stack.length,length);assert.equal(f.history.state.paiaReader.contextCard,'info');await f.history.back();assert.equal(f.context.view,'memory');assert.equal(f.context.contextCards.card,null);await f.history.back();assert.equal(f.context.thoughts.id,'synthetic-retained-topic');assert.deepEqual(f.errors,[]);}finally{await f.cleanup();}
});
for(const replaceHistory of [false,true])test(`Context load failure preserves Back and original replaceHistory=${replaceHistory} semantics`,async()=>{
 const f=fixture();let run;try{const length=f.stack.length;run=f.context.navigate('memory',null,null,{replaceHistory});await Promise.race([f.entered.promise,run.then(()=>{throw Error('no Context read');})]);f.reply.reject(Error('synthetic snapshot unavailable'));assert.equal(await run,true);assert.equal(f.stack.length,length+(replaceHistory?0:1));assert.equal(f.history.state.paiaReader.view,'memory');assert.ok(f.events.some(x=>x.kind==='context-load-failed'));await f.history.back();assert.equal(f.context.thoughts.id,replaceHistory?null:'synthetic-retained-topic');assert.deepEqual(f.errors,[]);}finally{f.reply.resolve({items:[],epoch:'synthetic-context'});if(run)await Promise.allSettled([run]);await f.cleanup();}
});
