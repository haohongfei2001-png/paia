import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {AIReadingEditor} from '../ui/ai-presentation.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture({composing=false,selected=true}={}){
 const held=deferred(),entered=deferred(),nodes=new Map();let disposed=0,filtered=0;
 const node=()=>({hidden:false,value:'',children:[{}],querySelectorAll:()=>[],replaceChildren(){},contains:n=>n===text});const text={data:'literal 👩‍💻 é'};
 globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},getSelection:()=>({isCollapsed:!selected,rangeCount:selected?1:0,anchorNode:text,focusNode:text})};
 const editor=Object.assign(Object.create(AIReadingEditor.prototype),{root:node(),ownComposing:composing,excerptEditors:[],nodes:new Map(),row:{revision:1},refreshEvidence:async()=>{entered.resolve();await held.promise;},dispose(){disposed++;throw Error('selected editor was disposed');}});
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,id:'topic-a',view:'ai',topic:{name:'Topic'},aiTopics:new Map([['topic-a',{presentation:{revision:2}}]]),aiEditor:editor,originalPane:node(),aiPane:node(),syncReadingControls(){},ensurePanes(){},updateViewStatus:async()=>({}),filterAIReading(){filtered++;}});
 return {owner,editor,held,entered,disposed:()=>disposed,filtered:()=>filtered,setSelected:v=>selected=v};
}
test('higher saved revision arriving during a Unicode selection preserves the exact editor without highlight reflow',async()=>{
 const f=fixture(),pending=f.owner.readContentRefresh();await f.entered.promise;f.held.resolve();await pending;assert.equal(f.disposed(),0);assert.equal(f.filtered(),0);assert.equal(f.owner.aiEditor,f.editor);
});
test('existing composition protection keeps the editor on higher saved revision',async()=>{
 const f=fixture({composing:true,selected:false}),pending=f.owner.readContentRefresh();await f.entered.promise;f.held.resolve();await pending;assert.equal(f.disposed(),0);assert.equal(f.owner.aiEditor,f.editor);
});
for(const change of ['same','topic','view','intent','editor','disposed'])test('deferred reading revalidates '+change+' owner before rereading',async()=>{
 const f=fixture();let reads=0;f.owner.refresh=async()=>{reads++;};const p=f.owner.readContentRefresh();await f.entered.promise;f.held.resolve();await p;
 if(change==='topic')f.owner.id='other';if(change==='view')f.owner.view='original';if(change==='intent')f.owner.openIntent=2;if(change==='editor')f.owner.aiEditor={};if(change==='disposed')f.editor.disposed=true;
 f.setSelected(false);f.editor.resumeDeferredReading();await Promise.resolve();assert.equal(reads,change==='same'?1:0);f.editor.resumeDeferredReading();assert.equal(reads,change==='same'?1:0);
});
test('a selection created while the read is held is observed at the paint boundary',async()=>{
 const f=fixture({selected:false}),p=f.owner.readContentRefresh();await f.entered.promise;f.setSelected(true);f.held.resolve();await p;assert.equal(f.disposed(),0);
});
test('source eligibility is still checked while selection blocks presentation replacement',async()=>{
 const f=fixture(),p=f.owner.readContentRefresh();await f.entered.promise;assert.equal(f.editor.deferredReadingRefresh,undefined);f.held.resolve();await p;assert.equal(typeof f.editor.deferredReadingRefresh,'function');
});
test('missing saved presentation is not retained by a selection defer',async()=>{
 const f=fixture();f.owner.aiTopics.clear();const p=f.owner.readContentRefresh();await f.entered.promise;f.held.resolve();await assert.rejects(p,/selected editor was disposed/);assert.equal(f.disposed(),1);assert.equal(f.editor.deferredReadingRefresh,undefined);
});
