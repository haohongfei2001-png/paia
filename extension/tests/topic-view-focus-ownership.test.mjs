import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
function fixture(){let finish;const document=new EventTarget(),body={},toggle={disabled:false,checked:false,focus(){document.activeElement=this;}};document.body=body;document.activeElement=toggle;const nodes={'ai-presentation-toggle':toggle,'topic-search':{value:''},'topic-body':{}};document.getElementById=id=>nodes[id];globalThis.document=document;globalThis.scrollTo=()=>{};const owner=Object.assign(Object.create(TopicController.prototype),{id:'synthetic',view:'original',presentationIntent:0,openIntent:1,dialogOpenIntent:0,aiTopics:new Map(),rememberView(){},topicAnchor:()=>null,flushEditors:()=>new Promise(r=>finish=r),rememberTimeline(){},aiViewSession:{setView(){},position:()=>null},clearActionFeedback(){},refresh:async()=>{}});return {owner,toggle,document,release:()=>finish(true),focus(target){document.activeElement=target;const e=new Event('focusin');Object.defineProperty(e,'target',{value:target});document.dispatchEvent(e);}};}
test('real switchView completion cannot steal a later History invoker focus',async()=>{const f=fixture(),pending=f.owner.switchView('ai',{restoreFocus:true}),history={};f.focus(history);f.owner.dialogOpenIntent++;await f.release();await pending;assert.equal(f.document.activeElement,history);});
test('toggle keyboard focus survives its own transition when no other intent takes over',async()=>{const f=fixture(),pending=f.owner.switchView('ai',{restoreFocus:true});f.document.activeElement=f.document.body;f.release();await pending;assert.equal(f.document.activeElement,f.toggle);assert.equal(f.toggle.disabled,false);});
test('a later focused control remains authoritative even after it temporarily blurs to body',async()=>{const f=fixture(),pending=f.owner.switchView('ai',{restoreFocus:true});f.focus({});f.document.activeElement=f.document.body;f.release();await pending;assert.equal(f.document.activeElement,f.document.body);});
test('a superseding same-topic presentation request does not inherit old focus restoration',async()=>{const f=fixture(),pending=f.owner.switchView('ai',{restoreFocus:true});f.owner.presentationIntent++;f.document.activeElement=f.document.body;f.release();await pending;assert.equal(f.document.activeElement,f.document.body);});
test('new-view header ownership changes before asynchronous content becomes actionable',async()=>{const f=fixture(),presentation={view:'original',open:false,sync(){if(this.view!==f.owner.view){this.open=false;this.view=f.owner.view;}}};f.owner.desktopPresentation=presentation;f.owner.refresh=async()=>{assert.equal(presentation.view,'ai','header view must match before new content is exposed');presentation.open=true;await Promise.resolve();presentation.sync();assert.equal(presentation.open,true,'same-view completion retains a newly opened reading menu');};const pending=f.owner.switchView('ai');f.release();await pending;assert.equal(presentation.open,true);});
test('failed view refresh restores header view before the rollback refresh',async()=>{const f=fixture(),presentation={view:'original',sync(){this.view=f.owner.view;}},views=[];f.owner.desktopPresentation=presentation;f.owner.refresh=async()=>{views.push(presentation.view);if(views.length===1)throw Error('synthetic read failure');};const pending=f.owner.switchView('ai');f.release();await assert.rejects(pending,/synthetic read failure/);assert.deepEqual(views,['ai','original']);assert.equal(f.owner.view,'original');assert.equal(f.toggle.disabled,false);});

test('composition beginning during flush or inline leave cannot hide the active Original or AI editor',async()=>{
 for(const from of ['original','ai'])for(const stage of ['flush','inline-leave']){
  const f=fixture(),field={composing:false};f.owner.view=from;f.owner.aiEditor=field;let refreshes=0;f.owner.refresh=async()=>refreshes++;
  if(stage==='inline-leave')f.owner.sectionEndWriter={leave:async()=>{field.composing=true;return true;}};
  const pending=f.owner.switchView(from==='ai'?'original':'ai');if(stage==='flush')field.composing=true;f.release();await pending;
  assert.equal(f.owner.view,from,from+'/'+stage);assert.equal(f.owner.aiEditor,field);assert.equal(refreshes,0);assert.equal(f.toggle.checked,from==='ai');assert.equal(f.toggle.disabled,false);
 }
});

test('composition beginning in the native view-transition wait retains saved view and timeline ownership',async()=>{
 const f=fixture(),field={composing:false},host={style:{},addEventListener(){}},document=f.document;f.owner.editor=field;f.owner.aiTopics=new Map([['synthetic',{presentation:{}}]]);let apply,disposed=0,saved=0,refreshed=0;
 const get=document.getElementById;document.getElementById=id=>id==='topic-body'?host:get(id);document.documentElement={classList:{add(){},remove(){}}};globalThis.matchMedia=()=>({matches:false});
 f.owner.topicTimeline={dispose(){disposed++;}};f.owner.aiViewSession.setView=()=>saved++;f.owner.refresh=async()=>refreshed++;
 document.startViewTransition=callback=>{let resolve;const updateCallbackDone=new Promise(r=>resolve=r);apply=async()=>{await callback();resolve();};return{ready:Promise.resolve(),finished:updateCallbackDone,updateCallbackDone,skipTransition(){}};};
 const pending=f.owner.switchView('ai');f.release();while(!apply)await Promise.resolve();field.composing=true;await apply();await pending;
 assert.equal(f.owner.view,'original');assert.equal(disposed,0);assert.equal(saved,0);assert.equal(refreshed,0);assert.equal(f.toggle.checked,false);
});
