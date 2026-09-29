import test from 'node:test';
import assert from 'node:assert/strict';
import {createMyWriteVoiceReview} from '../core/mywrite-voice-review.js';
import {createMyWriteVoicePanel} from '../ui/mywrite-voice-review.js';
import {createMyWriteWorkspace} from '../ui/mywrite-workspace.js';
import {MAX_MESSAGE_LENGTH} from '../core/constants.js';

const whole=Array.from({length:1000},(_,i)=>'语音第'+i+'段：保留否定与换行🧭。\n').join('')+
 '最后：不要自动保存或发送。';
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.listeners=new Map();this.style={};
  this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.parent=null;}
 setAttribute(key,value){this[key]=value;}
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 replaceChildren(...children){for(const child of this.children)child.parent=null;this.children=[];this.append(...children);}
 addEventListener(type,handler){this.listeners.set(type,handler);}
 removeEventListener(type,handler){if(this.listeners.get(type)===handler)this.listeners.delete(type);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}
 focus(){this.focused=true;}
 click(){this.listeners.get('click')?.({isTrusted:true});}
}
const document={createElement:tag=>new Node(tag)};
const find=(root,predicate)=>predicate(root)?root:root.children.map(x=>find(x,predicate)).find(Boolean);
const named=(root,label)=>find(root,x=>x.tag==='button'&&x.textContent===label);
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('CPV1-10.3 detached voice panel explicitly records, reviews full corrected text and hands it to the draft owner without saving',async()=>{
 const count={start:0,stop:0,save:0},session={
  async stop(){count.stop++;return {synthetic:true};},async cancel(){}
 };
 const flow=createMyWriteVoiceReview({capture:{async start(){count.start++;return session;}},
  transcribe:async audio=>{assert.equal(audio.synthetic,true);return whole;}});
 let inserted=null;
 const panel=createMyWriteVoicePanel({document,flow,onReviewedText:text=>{inserted=text;return true;}});
 const root=panel.element,body=find(root,x=>x.tag==='textarea');
 const start=named(root,'开始录音'),stop=named(root,'停止并转写');
 const apply=named(root,'将核对后的全文加入草稿');
 assert.deepEqual(count,{start:0,stop:0,save:0});assert.equal(panel.canLeave(),true);
 start.click();await settle();assert.equal(flow.state().phase,'recording');assert.equal(panel.canLeave(),false);
 stop.click();await settle();assert.equal(body.value,whole);assert.equal(body.parent.hidden,false);
 assert.equal(count.save,0);assert.equal(inserted,null);
 const corrected=whole+'\n我已经核对全文。';body.value=corrected;
 apply.click();assert.equal(inserted,corrected);assert.equal(body.value,'');
 assert.equal(count.save,0);assert.equal(panel.canLeave(),true);
 panel.dispose();
});

test('CPV1-10.3 detached voice panel retains the full review when the editor cannot accept and retries the same correction explicitly',async()=>{
 const session={async stop(){return null;},async cancel(){}};
 const flow=createMyWriteVoiceReview({capture:{async start(){return session;}},transcribe:async()=>whole});
 let calls=0,inserted=null,allow=false;
 const panel=createMyWriteVoicePanel({document,flow,onReviewedText:text=>{
  calls++;if(!allow)return false;inserted=text;return true;
 }});
 const root=panel.element,body=find(root,x=>x.tag==='textarea');
 named(root,'开始录音').click();await settle();
 named(root,'停止并转写').click();await settle();
 const corrected=whole+'\n保留修改';body.value=corrected;
 named(root,'将核对后的全文加入草稿').click();
 assert.equal(calls,1);assert.equal(body.value,corrected);assert.equal(panel.canLeave(),false);
 assert.equal(named(root,'开始录音').disabled,true);
 allow=true;named(root,'将核对后的全文加入草稿').click();
 assert.equal(calls,2);assert.equal(inserted,corrected);assert.equal(panel.canLeave(),true);
 panel.dispose();
});

test('CPV1-10.4 detached voice panel cancellation fences a late capture and removes private review on disposal',async()=>{
 let resolveStart,cancelled=0;
 const waiting=new Promise(resolve=>{resolveStart=resolve;});
 const session={async stop(){throw new Error('must not stop');},async cancel(){cancelled++;}};
 const flow=createMyWriteVoiceReview({capture:{start:()=>waiting},transcribe:async()=>whole});
 const panel=createMyWriteVoicePanel({document,flow,onReviewedText:()=>{throw new Error('must not apply');}});
 const root=panel.element,body=find(root,x=>x.tag==='textarea');
 named(root,'开始录音').click();await settle();
 named(root,'取消录音或审阅').click();await settle();resolveStart(session);await settle();
 assert.equal(cancelled,1);assert.equal(flow.state().phase,'idle');
 assert.equal(body.value,'');assert.equal(panel.canLeave(),true);
 panel.dispose();assert.equal(body.value,'');assert.equal(root.children.length,0);
});


test('CPV1-10.3 optional detached workspace puts reviewed voice into unsaved complete MyWrite text only on explicit action',async()=>{
 let saves=0;
 const store={read:async()=>null,save:async()=>{saves++;throw new Error('unexpected save');},
  review:async()=>{throw new Error('unexpected review');},list:async()=>({items:[],after:null})};
 const session={async stop(){return {synthetic:true};},async cancel(){}};
 const flow=createMyWriteVoiceReview({capture:{async start(){return session;}},transcribe:async()=>whole});
 const workspace=createMyWriteWorkspace({document,store,draftId:'draft:voice',voiceFlow:flow});
 await workspace.ready;
 const root=workspace.element,body=find(root,x=>x.tag==='textarea'&&x['aria-label']==='草稿正文');
 assert.equal(body.value,'');assert.equal(saves,0);assert.equal(workspace.canReplace(),true);
 named(root,'开始录音').click();await settle();
 named(root,'停止并转写').click();await settle();
 assert.equal(body.value,'');assert.equal(workspace.canReplace(),false);
 named(root,'将核对后的全文加入草稿').click();
 assert.equal(body.value,whole);assert.equal(workspace.canReplace(),false);
 assert.equal(saves,0);workspace.dispose();
});

test('CPV1-10.3 complete draft body is never clipped when reviewed voice exceeds the shared bound',async()=>{
 const store={read:async()=>null,save:async()=>{throw new Error('unexpected save');},
  review:async()=>{throw new Error('unexpected review');},list:async()=>({items:[],after:null})};
 const session={async stop(){return null;},async cancel(){}};
 const flow=createMyWriteVoiceReview({capture:{async start(){return session;}},transcribe:async()=>whole});
 const workspace=createMyWriteWorkspace({document,store,draftId:'draft:bound',voiceFlow:flow});
 await workspace.ready;
 const root=workspace.element,body=find(root,x=>x.tag==='textarea'&&x['aria-label']==='草稿正文');
 body.value='甲'.repeat(MAX_MESSAGE_LENGTH-2);
 // The composition remains user-owned; a full transcript cannot be appended
 // when even its separator plus complete text would exceed the store limit.
 named(root,'开始录音').click();await settle();named(root,'停止并转写').click();await settle();
 const review=find(root,x=>x.tag==='textarea'&&x['aria-label']==='完整语音转写');
 named(root,'将核对后的全文加入草稿').click();
 assert.equal(body.value,'甲'.repeat(MAX_MESSAGE_LENGTH-2));
 assert.equal(review.value,whole);assert.equal(named(root,'开始录音').disabled,true);
 assert.equal(workspace.canReplace(),false);workspace.dispose();
});


test('CPV1-10.4 voice started during a pending draft switch keeps the original editor and complete review owner',async()=>{
 let resolveNext;
 const waitNext=new Promise(resolve=>{resolveNext=resolve;});
 const doc={...document,defaultView:{crypto:{randomUUID:()=> 'next'}}};
 const store={read:async id=>id==='draft:next'?waitNext:null,
  save:async()=>{throw new Error('unexpected save');},review:async()=>{throw new Error('unexpected review');},
  list:async()=>({items:[],after:null})};
 const session={async stop(){return null;},async cancel(){}};
 const flow=createMyWriteVoiceReview({capture:{async start(){return session;}},transcribe:async()=>whole});
 const workspace=createMyWriteWorkspace({document:doc,store,draftId:'draft:first',voiceFlow:flow});
 await workspace.ready;
 const original=workspace.element.children.find(x=>x.className==='mywrite-workspace-editor').children[0];
 named(workspace.element,'新建本地草稿').click();await settle();
 named(workspace.element,'开始录音').click();await settle();
 assert.equal(flow.state().phase,'recording');
 resolveNext(null);await settle();
 const host=workspace.element.children.find(x=>x.className==='mywrite-workspace-editor');
 assert.equal(host.children[0],original);
 assert.equal(workspace.canReplace(),false);
 named(workspace.element,'取消录音或审阅').click();await settle();
 assert.equal(workspace.canReplace(),true);workspace.dispose();
});
