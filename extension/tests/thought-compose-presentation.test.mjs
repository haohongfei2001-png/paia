import test from 'node:test';
import assert from 'node:assert/strict';
import {withTopicActions,tick,find,clickText} from './harness/topic-action-dom.mjs';

const topics=[{id:'career',name:'职业方向'},{id:'writing',name:'SYNTHETIC writing'}];
const descendants=node=>[node,...node.children.flatMap(descendants)];
const named=(root,text)=>find(root,node=>node.tagName==='BUTTON'&&node.textContent===text);
const host=()=>{const section=document.createElement('section');document.body.append(section);return section;};
async function preview(f,options={}){
 const mount=host(),work=f.owner.compose({topicId:'career',...options,workspacePreview:{host:mount}});
 await tick();assert.equal(f.rpcCalls.at(-1).type,'LIBRARY_INDEX_PAGE');
 await f.respond({ok:true,data:{items:topics,nextCursor:null}});await work;
 return mount;
}

test('T05 preview mounts the actual compose session in an ordinary section without opening a dialog',()=>withTopicActions(async f=>{
 const mount=await preview(f),surface=f.owner.surface,field=f.owner.draft;
 assert.equal(surface.content.parentElement,mount);
 assert.equal(surface.content.tagName,'SECTION');
 assert.equal(surface.content.className,'thought-compose-workspace');
 assert.equal(surface.content.role,undefined);assert.equal(surface.content['aria-modal'],undefined);
 assert.equal(f.owner.dialog.open,false);assert.equal(f.owner.dialog.children.length,0);
 assert.equal(f.owner.composeSession.draft,field);assert.equal(field.parentElement,surface.content);
 assert.equal(descendants(mount).filter(node=>node.tagName==='TEXTAREA').length,1);
 assert.equal(find(mount,node=>node.tagName==='H1').textContent,'写下想法');
 assert.notEqual(document.activeElement,field,'the ordinary workspace does not take focus away from the shell');
}));

test('T05 preview preserves literal draft editing and IME on the sole production session',()=>withTopicActions(async f=>{
 await preview(f);const field=f.owner.draft,session=f.owner.composeSession;
 field.value='  SYNTHETIC 本页草稿\n👩🏽‍💻 é\n';
 field.listeners.get('compositionstart')();assert.equal(session.composing,true);
 field.listeners.get('compositionend')();assert.equal(session.composing,false);
 assert.equal(session.draft,field);assert.equal(field.value,'  SYNTHETIC 本页草稿\n👩🏽‍💻 é\n');
 assert.equal(f.calls.length,0);
}));

test('T05 native Topic choice and existing detailed choice share one selected owner',()=>withTopicActions(async f=>{
 const mount=await preview(f),select=find(mount,node=>node.tagName==='SELECT');
 const boxes=()=>find(mount,node=>node.className==='topic-choice-list').children.map(label=>label.children[0]);
 assert.equal(select.value,'career');assert.deepEqual(boxes().map(box=>box.checked),[true,false]);
 select.value='writing';select.onchange();assert.deepEqual(boxes().map(box=>box.checked),[false,true]);
 const career=boxes()[0];career.checked=true;career.onchange();assert.equal(select.value,'career');assert.deepEqual(boxes().map(box=>box.checked),[true,false]);
 select.value='';select.onchange();assert.deepEqual(boxes().map(box=>box.checked),[false,false]);
 assert.equal(f.rpcCalls.length,1);assert.equal(f.calls.length,0);
}));

test('T05 detailed Topic search and paging retain the native selected Topic',()=>withTopicActions(async f=>{
 const mount=host(),work=f.owner.compose({topicId:'career',workspacePreview:{host:mount}});
 await tick();await f.respond({ok:true,data:{items:topics,nextCursor:'synthetic-next'}});await work;
 const select=find(mount,node=>node.tagName==='SELECT'),search=find(mount,node=>node.type==='search');
 search.value='writing';search.oninput();assert.equal(select.value,'career');
 assert.equal(select.children.length,3);
 clickText(mount,'加载更多主题');await tick();assert.equal(f.rpcCalls.at(-1).options.cursor,'synthetic-next');
 await f.respond({ok:true,data:{items:[{id:'later',name:'SYNTHETIC later Topic'}],nextCursor:null}});
 assert.equal(select.children.length,4);assert.equal(select.value,'career');assert.equal(f.calls.length,0);
}));

test('T05 preview blocks every unwired write and dismissal even if its disabled handlers are invoked directly',()=>withTopicActions(async f=>{
 let flushes=0;f.owner.flush=async()=>{flushes++;return true;};
 const mount=await preview(f),surface=f.owner.surface;
 f.owner.draft.value='SYNTHETIC retained';
 for(const label of ['保存想法','取消','新建主题']){const control=named(mount,label);assert.equal(control.disabled,true);assert.ok(control['aria-describedby']);control.onclick();}
 surface.onChoicePending();await tick();
 assert.equal(named(mount,'保存想法').disabled,true);
 assert.equal(f.owner.surface,surface);assert.equal(f.owner.draft.value,'SYNTHETIC retained');
 assert.equal(flushes,0);assert.deepEqual(f.rpcCalls.map(call=>call.type),['LIBRARY_INDEX_PAGE']);
 assert.match(find(mount,node=>node.id==='thought-compose-preview-note').textContent,/保存与返回尚未接通/);
}));

test('T05 More retains exact Copy but cannot revive response relationship metadata',()=>withTopicActions(async f=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator'),copied=[];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>copied.push(text)}}});
 try{
  const mount=await preview(f,{quote:'SYNTHETIC earlier quote',relatedThought:{id:'earlier',revision:3,body:'SYNTHETIC earlier body'}});
  const field=f.owner.draft,more=find(mount,node=>node.className==='thought-compose-more');
  assert.equal(more.open,false);assert.equal(named(more,'复制当前文字').disabled,undefined);
  assert.equal(f.owner.quotePreview.parentElement,more);
  assert.equal(descendants(more).some(node=>node.className==='thought-response-choice'),false);
  field.value='\nSYNTHETIC 最新文字 👩‍💻\n';clickText(more,'复制当前文字');await tick();
  assert.deepEqual(copied,[field.value]);assert.equal(f.rpcCalls.length,1);
 }finally{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;}
}));

test('T05 preview Topic failure remains truthful and retries only its existing read',()=>withTopicActions(async f=>{
 const mount=host(),work=f.owner.compose({topicId:'career',workspacePreview:{host:mount}});
 await tick();await f.respond({ok:false,error:'STORAGE_FAILED'});await work;
 const field=f.owner.draft;field.value='SYNTHETIC unsaved';
 assert.equal(f.owner.feedback.textContent,'主题暂未读完，请重试。');
 clickText(mount,'重试读取主题');await tick();await f.respond({ok:true,data:{items:topics,nextCursor:null}});
 assert.equal(find(mount,node=>node.tagName==='SELECT').value,'career');
 assert.equal(f.owner.draft,field);assert.equal(field.value,'SYNTHETIC unsaved');
 assert.deepEqual(f.rpcCalls.map(call=>call.type),['LIBRARY_INDEX_PAGE','LIBRARY_INDEX_PAGE']);
}));

test('T05 old Topic read cannot replace or focus a newer workspace session',()=>withTopicActions(async f=>{
 const firstHost=host(),first=f.owner.compose({topicId:'career',workspacePreview:{host:firstHost}});await tick();
 f.owner.close(true);
 const secondHost=host(),second=f.owner.compose({topicId:'writing',workspacePreview:{host:secondHost}});await tick();
 const current=f.owner.draft,feedback=f.owner.feedback;current.value='SYNTHETIC newer workspace';current.focus();
 await f.respond({ok:true,data:{items:[{id:'obsolete',name:'SYNTHETIC obsolete'}],nextCursor:null}});await first;
 assert.equal(firstHost.children.length,0);assert.equal(f.owner.draft,current);assert.equal(f.owner.feedback,feedback);
 await f.respond({ok:true,data:{items:topics,nextCursor:null}});await second;
 assert.equal(find(secondHost,node=>node.tagName==='SELECT').value,'writing');assert.equal(document.activeElement,current);
 assert.equal(current.value,'SYNTHETIC newer workspace');assert.equal(f.calls.length,0);
}));

test('T05 uses the existing dirty guard when another compose owner requests entry or leave',()=>withTopicActions(async f=>{
 f.owner.draft.value='SYNTHETIC modal draft';globalThis.confirm=()=>false;
 const original=f.owner.surface,mount=host();await f.owner.compose({workspacePreview:{host:mount}});
 assert.equal(f.owner.surface,original);assert.equal(mount.children.length,0);assert.equal(f.rpcCalls.length,0);
 globalThis.confirm=()=>true;await preview(f);const field=f.owner.draft;field.value='SYNTHETIC workspace draft';
 globalThis.confirm=()=>false;assert.equal(f.owner.leave(),false);assert.equal(f.owner.draft,field);
}));

test('T05 refuses modal or detached preview hosts without discarding the active draft',()=>withTopicActions(async f=>{
 const original=f.owner.surface;f.owner.draft.value='SYNTHETIC keep';
 await assert.rejects(f.owner.compose({workspacePreview:{host:document.createElement('section')}}),TypeError);
 const dialog=document.createElement('dialog');document.body.append(dialog);
 await assert.rejects(f.owner.compose({workspacePreview:{host:dialog}}),TypeError);
 assert.equal(f.owner.surface,original);assert.equal(f.owner.draft.value,'SYNTHETIC keep');assert.equal(f.rpcCalls.length,0);
}));

test('T05 presentation leaves the normal production modal and its Save available',()=>withTopicActions(async f=>{
 assert.equal(f.owner.dialog.open,true);assert.equal(f.owner.surface.workspacePreview,undefined);
 assert.equal(f.owner.draft.parentElement,f.owner.content);
 assert.equal(f.owner.content.children.some(node=>node.tagName==='SELECT'),false);
 const save=named(f.owner.content,'保存想法');assert.equal(save.disabled,undefined);
 f.owner.draft.value='SYNTHETIC real save';save.onclick();await tick();assert.equal(f.calls.length,1);
 await f.respond({ok:true,data:{id:'synthetic-saved'}});assert.equal(f.owner.dialog.open,false);
}));
