import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {withTopicActions,tick,clickText,find} from './harness/topic-action-dom.mjs';

const compared=id=>({ok:true,data:{entry:{id,thoughtText:'SYNTHETIC independent Thought '+id,revision:2},input:{body:'SYNTHETIC current original Input '+id,revision:3}}});
async function fixture(f){
 const actions=f.owner;actions.close(true);const host=document.createElement('section');document.body.append(host);const remounts=[];
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',activeSectionId:'section',openIntent:1,view:'original',presentationIntent:1,actions,mountSectionEndWriter(){remounts.push(this.activeSectionId);}});
 actions.flush=()=>owner.flushEditors();
 const mount=async()=>{const handle=await actions.compose({topicId:'topic',sectionId:'section',inline:{host,onAcknowledged:async()=>true}});handle.field.matches=()=>false;Object.defineProperty(handle.field,'innerText',{get:()=>handle.field.textContent});owner.sectionEndWriter=handle;return handle;};
 const handle=await mount();
 return {...f,actions,owner,host,handle,remounts,mount,closeEvent(){const close=actions.dialog.listeners.get('close');actions.dialog.listeners.delete('close');close?.();}};
}
const withComparison=run=>withTopicActions(async f=>run(await fixture(f)));

test('actual empty inline writer leaves once before one existing Entry comparison, then remounts only on modal close',()=>withComparison(async f=>{
 const field=f.handle.field,pending=f.owner.compareEntry('entry');await tick();assert.equal(field.isConnected,false);assert.equal(f.owner.sectionEndWriter,null);assert.deepEqual(f.rpcCalls.map(call=>call.type),['COMPARE_THOUGHT_INPUT']);assert.deepEqual(f.remounts,[]);
 await f.respond(compared('entry'));assert.equal(await pending,true);assert.equal(f.actions.dialog.open,true);assert.equal(f.actions.comparing,true);assert.equal(f.owner.entryComparison,undefined);assert.deepEqual(f.remounts,[],'an open comparison cannot remount or steal its inline writer');
 // Claim release must not retire the actual displayed comparison's restore.
 clickText(f.actions.content,'恢复为档案当前文字');await tick();assert.equal(f.rpcCalls.at(-1).type,'RESTORE_THOUGHT_INPUT');assert.equal(f.rpcCalls.at(-1).edit.expectedRevision,2);assert.equal(f.rpcCalls.at(-1).edit.expectedInputRevision,3);
 await f.respond({ok:true,data:{}});assert.equal(f.actions.dialog.open,false);f.closeEvent();assert.deepEqual(f.remounts,['section']);
}));

test('comparison waits for the original in-flight mount and leaves its actual returned handle',()=>withComparison(async f=>{
 await f.handle.leave();f.owner.sectionEndWriter=null;let release;const gate=new Promise(resolve=>release=resolve);f.owner.endWriterMounting=true;f.owner.endWriterMountDone=gate;
 const pending=f.owner.compareEntry('entry');await tick();assert.equal(f.rpcCalls.length,0);assert.ok(f.owner.entryComparison);
 const handle=await f.mount();f.owner.endWriterMounting=false;release();await tick();assert.equal(handle.field.isConnected,false);assert.equal(f.owner.sectionEndWriter,null);assert.equal(f.rpcCalls.length,1);
 await f.respond(compared('entry'));assert.equal(await pending,true);assert.equal(f.actions.dialog.open,true);
}));

test('the actual mount owner does not start a second writer while comparison owns the transition',()=>withComparison(async f=>{
 let release;f.owner.flushEditors=()=>new Promise(resolve=>release=resolve);const pending=f.owner.compareEntry('entry');await tick();const before=f.actions.surface;
 assert.equal(await TopicController.prototype.mountSectionEndWriter.call(f.owner),undefined);assert.equal(f.actions.surface,before);assert.equal(f.rpcCalls.length,0);release(false);assert.equal(await pending,false);assert.equal(f.handle.field.isConnected,true);
}));

test('failed original editor flush preserves the same inline writer and sends no comparison RPC',()=>withComparison(async f=>{
 f.owner.flushEditors=async()=>false;assert.equal(await f.owner.compareEntry('entry'),false);assert.equal(f.owner.sectionEndWriter,f.handle);assert.equal(f.handle.field.isConnected,true);assert.equal(f.actions.surface.inline,true);assert.equal(f.rpcCalls.length,0);assert.equal(f.owner.entryComparison,undefined);
}));

test('actual inline IME refuses comparison without discarding the native composing field',()=>withComparison(async f=>{
 const field=f.handle.field;field.listeners.get('compositionstart')();field.textContent='SYNTHETIC 中文正在组合';assert.equal(await f.owner.compareEntry('entry'),false);assert.equal(f.owner.sectionEndWriter,f.handle);assert.equal(f.actions.draft,field);assert.equal(field.isConnected,true);assert.equal(field.textContent,'SYNTHETIC 中文正在组合');assert.equal(f.rpcCalls.length,0);
}));

test('actual writer leave refusal after a successful outer flush preserves its composing native owner',()=>withComparison(async f=>{
 const field=f.handle.field;field.listeners.get('compositionstart')();field.textContent='SYNTHETIC original composing draft';f.owner.flushEditors=async()=>true;
 assert.equal(await f.owner.compareEntry('entry'),false);assert.equal(f.owner.sectionEndWriter,f.handle);assert.equal(f.actions.draft,field);assert.equal(field.isConnected,true);assert.equal(field.textContent,'SYNTHETIC original composing draft');assert.equal(f.rpcCalls.length,0);
}));

test('uncertain actual inline save refuses leave and retains its exact request, draft and field',()=>withComparison(async f=>{
 const field=f.handle.field;field.textContent='SYNTHETIC unconfirmed draft';const first=f.handle.flush();await tick();await f.respond({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'});assert.equal(await first,false);const operation=structuredClone(f.calls[0]);
 const pending=f.owner.compareEntry('entry');await tick();assert.deepEqual(f.calls[1],operation,'comparison may only reconcile the same pending original save');await f.respond({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'});assert.equal(await pending,false);assert.equal(f.owner.sectionEndWriter,f.handle);assert.equal(f.actions.draft,field);assert.equal(field.isConnected,true);assert.equal(field.textContent,'SYNTHETIC unconfirmed draft');assert.equal(f.rpcCalls.some(call=>call.type==='COMPARE_THOUGHT_INPUT'),false);
}));

for(const boundary of ['Topic','Section','open intent','presentation','Root cue','IME'])test('held actual comparison reply cannot open after '+boundary+' retirement',()=>withComparison(async f=>{
 const pending=f.owner.compareEntry('entry');await tick();assert.equal(f.rpcCalls.length,1);
 if(boundary==='Topic')f.owner.id='other';if(boundary==='Section')f.owner.activeSectionId='other';if(boundary==='open intent')f.owner.openIntent++;if(boundary==='presentation')f.owner.presentationIntent++;if(boundary==='Root cue')f.owner.rootCueEpoch=(f.owner.rootCueEpoch||0)+1;if(boundary==='IME')f.owner.editor={composing:true};
 await f.respond(compared('entry'));assert.equal(await pending,false);assert.equal(f.actions.dialog.open,false);assert.equal(f.actions.surface,null);assert.deepEqual(f.remounts,[],'a retired caller cannot mount its old Section writer');
}));

test('overlapping actual comparisons publish only the newest requested Entry',()=>withComparison(async f=>{
 const older=f.owner.compareEntry('older');await tick();const newer=f.owner.compareEntry('newer');await tick();assert.deepEqual(f.rpcCalls.map(call=>call.id),['older','newer']);
 await f.respond(compared('older'));assert.equal(await older,false);assert.equal(f.actions.dialog.open,false);assert.ok(f.owner.entryComparison,'old finally cannot clear the newer transition');await f.respond(compared('newer'));assert.equal(await newer,true);assert.ok(f.actions.content.textContent.includes('SYNTHETIC independent Thought newer'));assert.equal(f.actions.content.textContent.includes('Thought older'),false);
}));

test('a newer refused comparison cannot re-admit an older held comparison after its claim is released',()=>withComparison(async f=>{
 const older=f.owner.compareEntry('older');await tick();assert.equal(f.rpcCalls.length,1);f.owner.flushEditors=async()=>false;assert.equal(await f.owner.compareEntry('newer'),false);assert.equal(f.owner.entryComparison,undefined);
 await f.respond(compared('older'));assert.equal(await older,false,'only a comparison that actually published its modal may retain caller qualification after claim release');assert.equal(f.actions.dialog.open,false);assert.equal(f.actions.surface,null);
}));

test('a displayed comparison cannot write restore CAS after its original Section changes',()=>withComparison(async f=>{
 const pending=f.owner.compareEntry('entry');await tick();await f.respond(compared('entry'));assert.equal(await pending,true);const count=f.rpcCalls.length;f.owner.activeSectionId='other';clickText(f.actions.content,'恢复为档案当前文字');await tick();assert.equal(f.rpcCalls.length,count);f.actions.close(true);f.closeEvent();assert.deepEqual(f.remounts,[]);
}));

test('late actual restore CAS cannot close or notify the retired comparison scope',()=>withComparison(async f=>{
 const pending=f.owner.compareEntry('entry');await tick();await f.respond(compared('entry'));assert.equal(await pending,true);let notices=0;f.actions.notify=()=>notices++;const surface=f.actions.surface;
 clickText(f.actions.content,'恢复为档案当前文字');await tick();assert.equal(f.rpcCalls.at(-1).type,'RESTORE_THOUGHT_INPUT');f.owner.rootCueEpoch=1;await f.respond({ok:true,data:{}});assert.equal(f.actions.surface,surface);assert.equal(f.actions.dialog.open,true);assert.equal(notices,0);
}));

test('actual Entry stale control dispatches exactly one comparison with no hidden second click listener',()=>withComparison(async f=>{
 const prototype=Object.getPrototypeOf(document.createElement('div')),prior=Object.getOwnPropertyDescriptor(prototype,'querySelectorAll');
 prototype.querySelectorAll=function(selector){const descendants=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);return selector==='*'?descendants:descendants.filter(node=>node.tagName===selector.toUpperCase());};
 try{
  f.owner.updateSectionActionControls=()=>{};const row=f.owner.entryNode({standalone:true,entry:{id:'entry',body:'SYNTHETIC unchanged Thought',note:'',type:'idea',archiveChanged:true,bodyBinding:'thought',provenanceType:'user_created'}}),control=find(row,node=>node.classList.contains('entry-stale'));
  assert.equal(control.type,'button');assert.equal(control.listeners.has('click'),false,'rendering must not retain an earlier addEventListener compare owner beside onclick');assert.equal(typeof control.onclick,'function');const pending=control.onclick();await tick();assert.deepEqual(f.rpcCalls.map(call=>[call.type,call.id]),[['COMPARE_THOUGHT_INPUT','entry']]);await f.respond(compared('entry'));assert.equal(await pending,true);
 }finally{if(prior)Object.defineProperty(prototype,'querySelectorAll',prior);else delete prototype.querySelectorAll;}
}));

for(const retired of [false,true])test('actual comparison RPC rejection '+(retired?'cannot report or remount into a newer route':'reports once and restores its empty writer owner'),()=>withComparison(async f=>{
 const statuses=[];f.owner.onStatus=(...args)=>statuses.push(args);const pending=f.owner.compareEntry('entry');await tick();assert.equal(f.rpcCalls.length,1);assert.equal(f.handle.field.isConnected,false);
 if(retired)f.owner.openIntent++;await f.respond({ok:false,error:'UNAVAILABLE'});
 assert.equal(await pending,false,'the actual read rejection settles without an unhandled Promise');assert.equal(f.actions.dialog.open,false);assert.equal(f.actions.surface,null);assert.equal(f.owner.entryComparison,undefined);
 assert.equal(statuses.length,retired?0:1);if(!retired){assert.equal(statuses[0][1],'read_error');assert.match(statuses[0][0],/已保存内容没有改变/);}assert.deepEqual(f.remounts,retired?[]:['section'],'only the current original route may restore its empty inline writer');
}));
