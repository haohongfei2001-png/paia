import {thoughtHistoryAction} from './harness/current-thought-navigation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as baseFixture,rpc,authority,savedRow,editSaved,refusedAI,setAIView,openTopic,noApproval,quiet,screenshotMatrix} from './harness/consumer-ai-browser.mjs';
import {eventually} from './harness/fake-chatgpt.mjs';

import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
async function fixture(variant,options={}){
 if(variant!=='release')return baseFixture(variant,options);
 const path=await mkdtemp(join(tmpdir(),'paia-ai-reading-release-'));
 try{execFileSync('python3',['scripts/build_current_release.py',join(path,'release')],{stdio:'pipe'});const f=await baseFixture(variant,{...options,releasePath:join(path,'release')}),close=f.h.close.bind(f.h);f.h.close=async()=>{try{await close();}finally{await rm(path,{recursive:true,force:true});}};return f;}catch(error){await rm(path,{recursive:true,force:true});throw error;}
}

test('UIR-03 saved Organized presentation remains readable and editable while retired Provider commands refuse in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){const f=await fixture(variant);try{const {p,h,topic}=f,before=await authority(p);await setAIView(p,true);await p.locator('[data-ai-field="currentView"]').waitFor();await noApproval(p);await refusedAI(p,topic.id);await screenshotMatrix(p,'saved-ai',variant);const savedBefore=await savedRow(p,topic.id),savedEdit=await editSaved(f);await thoughtHistoryAction(p,'library-undo');await eventually(async()=>(await savedRow(p,topic.id)).blockSummary===savedBefore.blockSummary,'visible undo targets saved AI');await p.setViewportSize({width:320,height:900});await thoughtHistoryAction(p,'library-redo');await eventually(async()=>(await savedRow(p,topic.id)).blockSummary===savedEdit.blockSummary,'visible redo restores the AI edit');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'open AI menu stays inside narrow viewport');await p.setViewportSize({width:1440,height:900});const after=await authority(p);assert.deepEqual(after.records,before.records);assert.deepEqual(after.thoughts,before.thoughts);const history=await rpc(p,'GET_AI_PRESENTATION_REVISIONS',{options:{topicId:topic.id}});assert.ok(history.items.length>0);await quiet(h);}finally{await f.h.close();}}
});
test('VS-05 long Topic remains interactive across refused AI, navigation and reduced motion in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){const f=await fixture(variant,{count:64});try{const {p,h,topic}=f;await setAIView(p,true);await refusedAI(p,topic.id);await p.emulateMedia({reducedMotion:'reduce'});await setAIView(p,false);await p.locator('#topic-search').fill('原始思想 0');await eventually(async()=>/1\+? 条匹配/.test(await p.locator('#topic-search-count').textContent()));assert.ok(await p.locator('#original-reading-body [data-entry-id]').count()<=60);await p.locator('#topic-search').fill('');await openTopic(p,topic);await setAIView(p,true);await p.locator('[data-ai-field="currentView"]').waitFor();const row=await savedRow(p,topic.id);await setAIView(p,false);await setAIView(p,true);assert.deepEqual(await savedRow(p,topic.id),row,'view transitions do not create phantom revisions');await quiet(h);}finally{await f.h.close();}}
});
for(const variant of ['source','release'])test(`D7 retired worker launch cannot create pending work or replace saved AI (${variant})`,{timeout:180000},async()=>{
 const f=await fixture(variant);try{await setAIView(f.p,true);await refusedAI(f.p,f.topic.id);await f.h.restartWorker();await refusedAI(f.p,f.topic.id);await f.p.locator('[data-ai-field="blockSummary"]').waitFor();await noApproval(f.p);await quiet(f.h);}finally{await f.h.close();}
});

for(const variant of ['source','release'])test(`TOPIC-05.7 saved revision waits for Unicode selection and composition (${variant})`,{timeout:180000},async()=>{
 const f=await fixture(variant);try{const {p,topic}=f;await setAIView(p,true);await p.locator('[data-ai-field="currentView"]').waitFor();
 for(const mode of ['selection','composition']){
  const row=await savedRow(p,topic.id),value='SYNTHETIC newer '+mode+' 👩‍💻 é';
  await p.evaluate(({revision,mode})=>{
   const original=chrome.runtime.sendMessage.bind(chrome.runtime);let release;
   const gate=new Promise(r=>release=r);window.__aiReflow={original,release,mode,held:false,delivered:false,entryReads:0};
   chrome.runtime.sendMessage=async function(message,...args){const result=await original(message,...args);const state=window.__aiReflow;
    if(message.type==='GET_AI_PRESENTATION_STATUS'&&result?.data?.topics?.some(x=>x.presentation?.revision>revision)&&!state.held){state.held=true;await gate;state.delivered=true;}
    if(message.type==='GET_LIBRARY_ENTRY'&&state.delivered)state.entryReads++;
    return result;
   };
  },{revision:row.revision,mode});
  await rpc(p,'EDIT_AI_PRESENTATION',{edit:{topicId:topic.id,field:'currentView',value,expectedRevision:row.revision,operationId:crypto.randomUUID()}});
  await eventually(()=>p.evaluate(()=>window.__aiReflow.held),'actual higher revision response is held');
  await p.evaluate(mode=>{
   const node=document.querySelector('[data-ai-field="currentView"]');node.focus();window.__aiReflow.node=node;window.__aiReflow.text=node.textContent;
   const selection=getSelection();selection.removeAllRanges();
   if(mode==='selection'){const text=node.firstChild,start=text.data.indexOf('👩');if(start<0)throw Error('Unicode fixture absent');const range=document.createRange();range.setStart(text,start);range.setEnd(text,start+'👩‍💻 é'.length);selection.addRange(range);window.__aiReflow.selected=selection.toString();}
   else node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'中'}));
   window.__aiReflow.release();
  },mode);
  await eventually(()=>p.evaluate(()=>window.__aiReflow.entryReads>0),'real eligibility reads continue after held status');
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.deepEqual(await p.evaluate(()=>{const s=window.__aiReflow;return {same:s.node===document.querySelector('[data-ai-field="currentView"]'),text:s.node.textContent===s.text,selected:s.mode!=='selection'||getSelection().toString()===s.selected};}),{same:true,text:true,selected:true});
  await p.evaluate(()=>{const s=window.__aiReflow;chrome.runtime.sendMessage=s.original;if(s.mode==='selection')getSelection().removeAllRanges();else s.node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''}));});
  await eventually(async()=>await p.locator('[data-ai-field="currentView"]').textContent()===value,'current owner rereads saved revision after protected interaction ends');
  assert.equal((await savedRow(p,topic.id)).revision,row.revision+1,'reading never writes an extra saved revision');
 }
 await quiet(f.h);
 }finally{await f.p.evaluate(()=>{if(window.__aiReflow){chrome.runtime.sendMessage=window.__aiReflow.original;window.__aiReflow.release();}}).catch(()=>{});await f.h.close();}
});
