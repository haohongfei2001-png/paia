import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {AIReadingEditor} from '../ui/ai-presentation.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture({composing=false,selected=true}={}){
 const held=deferred(),entered=deferred(),nodes=new Map(),reads=[];let disposed=0,filtered=0,evidenceEntered=false;
 const node=()=>({hidden:false,value:'',children:[{}],dataset:{},style:{},querySelectorAll:()=>[],replaceChildren(){},contains:n=>n===text,append(){},setAttribute(){}});const text={data:'literal 👩‍💻 é'};
 globalThis.document={documentElement:{lang:'en'},createElement:()=>node(),getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},getSelection:()=>({isCollapsed:!selected,rangeCount:selected?1:0,anchorNode:text,focusNode:text})};
 const topic={id:'topic-a',name:'Topic'},section={id:'section-a',sectionId:'section-a',topicId:topic.id},cached={topicId:topic.id,recoveryEpoch:'epoch-a',revision:2,currentView:'Saved scoped reading',evidenceEntryIds:['entry-a']},page={topic,sections:[section],recoveryEpoch:cached.recoveryEpoch,authority:{topicId:topic.id},coverage:{activeGeneration:'generation-a'},items:[{entry:{id:'entry-a',lifecycle:'active'},placement:{topicId:topic.id,sectionId:section.id}}]};
 globalThis.chrome={runtime:{sendMessage:async message=>{reads.push(message);if(message.type==='GET_LIBRARY_SECTION_PROJECTION')return {ok:true,data:{topic,items:[section]}};if(message.type==='GET_LIBRARY_SECTION_READING'){assert.equal(message.options.topicId,topic.id);assert.equal(message.options.scopeSectionId,section.id);return {ok:true,data:page};}throw Error('unexpected original reading request '+message.type);}}};
 const editor=Object.assign(Object.create(AIReadingEditor.prototype),{root:node(),ownComposing:composing,excerptEditors:[],nodes:new Map(),row:{...cached,revision:1},refreshEvidence:async()=>{evidenceEntered=true;entered.resolve();await held.promise;},dispose(){disposed++;throw Error('selected editor was disposed');}});
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,id:topic.id,view:'ai',topic,activeSectionId:section.id,aiTopics:new Map([[topic.id,{presentation:cached}]]),aiScopeKey:JSON.stringify([topic.id,section.id,true,['currentView'],'generation-a',cached.recoveryEpoch]),aiEditor:editor,originalPane:node(),aiPane:node(),syncReadingControls(){},ensurePanes(){},updateViewStatus:async()=>({}),filterAIReading(){filtered++;},renderSectionNav(){},topicAnchor:()=>null,topicSectionAnchor:()=>null,resetTopicReader:async({beforePaint}={})=>{if(beforePaint)assert.equal(beforePaint(page),true,'original authority and recovery fence admits synchronous publication');return {stale:false};}});
 return {owner,editor,held,entered,reads,evidenceEntered:()=>evidenceEntered,disposed:()=>disposed,filtered:()=>filtered,setSelected:v=>selected=v};
}
async function beginRefresh(f){const pending=f.owner.readContentRefresh();assert.equal(await Promise.race([f.entered.promise.then(()=>true),pending.then(()=>false)]),true,'original source eligibility is reached before selection or IME can defer presentation replacement');return {pending};}
test('higher saved revision arriving during a Unicode selection preserves the exact editor without highlight reflow',async()=>{
 const f=fixture(),{pending}=await beginRefresh(f);f.held.resolve();await pending;assert.equal(f.disposed(),0);assert.equal(f.filtered(),0);assert.equal(f.owner.aiEditor,f.editor);
});
test('existing composition protection keeps the editor on higher saved revision',async()=>{
 const f=fixture({composing:true,selected:false}),{pending}=await beginRefresh(f);f.held.resolve();await pending;assert.equal(f.disposed(),0);assert.equal(f.owner.aiEditor,f.editor);
});
for(const change of ['same','topic','view','intent','editor','disposed'])test('deferred reading revalidates '+change+' owner before rereading',async()=>{
 const f=fixture();let reads=0;f.owner.refresh=async()=>{reads++;};const {pending:p}=await beginRefresh(f);f.held.resolve();await p;
 if(change==='topic')f.owner.id='other';if(change==='view')f.owner.view='original';if(change==='intent')f.owner.openIntent=2;if(change==='editor')f.owner.aiEditor={};if(change==='disposed')f.editor.disposed=true;
 f.setSelected(false);f.editor.resumeDeferredReading();await Promise.resolve();assert.equal(reads,change==='same'?1:0);f.editor.resumeDeferredReading();assert.equal(reads,change==='same'?1:0);
});
test('a selection created while the read is held is observed at the paint boundary',async()=>{
 const f=fixture({selected:false}),{pending:p}=await beginRefresh(f);f.setSelected(true);f.held.resolve();await p;assert.equal(f.disposed(),0);
});
test('source eligibility is still checked while selection blocks presentation replacement',async()=>{
 const f=fixture(),{pending:p}=await beginRefresh(f);assert.equal(f.editor.deferredReadingRefresh,undefined);f.held.resolve();await p;assert.equal(typeof f.editor.deferredReadingRefresh,'function');
});
test('missing saved presentation is not retained by a selection defer',async()=>{
 const f=fixture();f.owner.aiTopics.clear();const {pending:p}=await beginRefresh(f);f.held.resolve();await assert.rejects(p,/selected editor was disposed/);assert.equal(f.disposed(),1);assert.equal(f.editor.deferredReadingRefresh,undefined);
});
