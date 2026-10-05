// Historical pre-D7 writing contract: 19 unchanged native registrations.
// Not current functional certification: ordinary Write now holds Save/Cancel/return.
// Explicit historical browser group; original bodies and assertions remain unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const op=()=>crypto.randomUUID();
async function ready(h){const p=h.archive;await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});return p;}
const offline=h=>{assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);};
async function shot(p,name){await mkdir('work/ux-r3',{recursive:true});await p.screenshot({path:`work/ux-r3/${name}.png`});}
const nav=(p,view)=>p.locator(`[data-view="${view}"]`).first().click();
test('UX-R3 independent today draft: empty, cancelled, failed save, IME and keyboard recovery; home/modal visual matrix',{timeout:180000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});try{
  const p=await ready(h);await nav(p,'thoughts');await p.locator('#thought-home-tools').getByRole('button',{name:'接着写',exact:true}).click();const dialog=p.locator('#topic-action-dialog'),draft=dialog.getByRole('textbox',{name:'今天的新想法'}),save=dialog.getByRole('button',{name:'保存想法',exact:true});await save.click();await dialog.getByText('先写下一点内容。',{exact:true}).waitFor();await draft.fill('UXR3_TODAY 今天独立记录 👩🏽‍💻');p.once('dialog',d=>d.dismiss());await dialog.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await dialog.isVisible(),true);
  await draft.dispatchEvent('compositionstart');await draft.press('Control+Enter');await pause(100);assert.equal((await rpc(p,'GET_LIBRARY_UNPLACED',{options:{}})).items.length,0);await draft.dispatchEvent('compositionend');
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.r3RestoreSend=()=>chrome.runtime.sendMessage=send;chrome.runtime.sendMessage=(message,...args)=>message.type==='CONTINUE_THINKING'?Promise.resolve({ok:false,error:'STORAGE_FAILED'}):send(message,...args);});await save.click();await dialog.getByText('尚未保存，文字仍在这里。可以重试或复制。',{exact:true}).waitFor();assert.equal(await draft.inputValue(),'UXR3_TODAY 今天独立记录 👩🏽‍💻');await shot(p,'draft-save-error');await p.evaluate(()=>window.r3RestoreSend());
  for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const [width,height]of [[1440,900],[1024,768],[390,844],[320,720]]){await p.setViewportSize({width,height});await pause(80);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot(p,`compose-${appearance}-${width}`);}}
  await draft.press('Control+Enter');await eventually(()=>dialog.isVisible().then(x=>!x));let saved;await eventually(async()=>{saved=(await rpc(p,'GET_LIBRARY_UNPLACED',{options:{}})).items[0];return !!saved;});const row=await rpc(p,'GET_LIBRARY_ENTRY',{id:saved.id});assert.equal(row.body,'UXR3_TODAY 今天独立记录 👩🏽‍💻');assert.equal(row.bodyBinding,'thought');assert.ok(Math.abs(Date.now()-Date.parse(row.createdAt))<60000);assert.equal(row.provenanceType,'user_created');await p.locator('#library-unplaced').click();await p.locator(`[data-unplaced-id="${row.id}"]`).click();await p.locator('#library-dialog [data-entry-field="body"]').waitFor();await p.locator('#library-dialog-close').click();
  for(const name of ['稳定主题一','稳定主题二','稳定主题三'])await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name,operationId:op()}});await eventually(()=>p.locator('#thought-list [data-topic-id]').count().then(x=>x===3));const order=await p.locator('#thought-list [data-topic-id]').evaluateAll(els=>els.map(e=>e.dataset.topicId));await rpc(p,'RECORD_TOPIC_READ',{id:order[2]});await eventually(async()=>((await rpc(p,'LIBRARY_INDEX_PAGE',{options:{mode:'stable'}})).recent||[]).some(item=>item.id===order[2]),'recent-read metadata remains recorded');assert.equal(await p.locator('#thought-recent').count(),0,'Thought home no longer renders the Recent Reading section');assert.deepEqual(await p.locator('#thought-list [data-topic-id]').evaluateAll(els=>els.map(e=>e.dataset.topicId)),order);
  assert.equal((await rpc(p,'GET_THOUGHT_LAYOUT')).layout,'list','frozen D2 compact list is the sole root layout');assert.equal(await p.locator('#thought-list').evaluate(el=>el.classList.contains('topic-compact-list')),true);
  assert.equal(await p.locator('#thought-home-tools').getByRole('button',{name:'列表 / 网格',exact:true}).count(),0,'retired grid control is absent');
  await rpc(p,'SET_THOUGHT_LAYOUT',{layout:'grid'});assert.equal((await rpc(p,'GET_THOUGHT_LAYOUT')).layout,'list','deprecated grid input cannot restore a second layout');
  await p.emulateMedia({reducedMotion:'reduce'});for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const [width,height]of [[1440,900],[1024,768],[390,844],[320,720]]){await p.setViewportSize({width,height});await pause(80);await shot(p,`home-${appearance}-${width}`);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}}await p.evaluate(()=>document.body.style.zoom='2');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement===document.body),false);await shot(p,'home-200-percent');await p.evaluate(()=>document.body.style.zoom='1');await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await p.locator('#thought-home-tools').getByRole('button',{name:'Continue thinking',exact:true}).click();await dialog.getByRole('heading',{name:'Add a thought from today'}).waitFor();await shot(p,'compose-English');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:row.id})).body,row.body);offline(h);
 }finally{await h.close();}
});



async function closeComposeFixture(h,release,primaryFailure){
 let cleanupFailure;try{await h.close();}catch(error){cleanupFailure=error;}try{if(release)await rm(release,{recursive:true,force:true});}catch(error){cleanupFailure??=error;}
 if(cleanupFailure){if(primaryFailure)console.error('Secondary synthetic compose cleanup failure:',cleanupFailure.message);else throw cleanupFailure;}
}

// D5 T05: real worker acknowledgement must remain bound to the submitting draft.
for(const variant of ['source','release'])for(const scenario of ['newer-text','reopened-draft','lost-ack','changed-retry','malformed-ack','malformed-success','ime-settlement'])test(`UX-R3 independent today draft acknowledgement ownership ${scenario} (${variant})`,{timeout:90000},async()=>{
 const release=variant==='release'?await mkdtemp(join(tmpdir(),'paia-compose-ack-')):null;
 if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({onboarding:true,...(release?{extensionPath:release}:{})});const trace={variant,scenario,head:process.env.PAIA_TESTED_HEAD,stage:'start'};let p,failure;
 try{
  p=await ready(h);await p.setViewportSize({width:1440,height:900});await h.open({id:'synthetic-compose-ack-source',title:'SYNTHETIC protected source',messages:[{id:'synthetic-compose-ack-input',text:'SYNTHETIC immutable captured Input 👩‍💻\nSource remains separate.'}]});await eventually(async()=>(await h.state()).records.length===1);
  const initial=await h.state(),protectedBefore={records:initial.records,blocks:initial.library.blocks};await nav(p,'thoughts');
  await p.evaluate(scenario=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__composeAckCalls=[];globalThis.__composeAckCommitted=[];
   chrome.runtime.sendMessage=async(message,...args)=>{
    if(message.type!=='CONTINUE_THINKING')return send(message,...args);
    __composeAckCalls.push(structuredClone(message.thought));
    if(scenario==='changed-retry'&&__composeAckCalls.length===2)return {ok:false,error:'STORAGE_FAILED'};
    const response=await send(message,...args);__composeAckCommitted.push(structuredClone(response));
    if(__composeAckCalls.length===1){if(['lost-ack','changed-retry'].includes(scenario))throw Error('SYNTHETIC message channel interrupted after commit');if(scenario==='malformed-ack')return {ok:false,error:{code:'STORAGE_FAILED'}};if(scenario==='malformed-success')return {ok:true,data:{}};return new Promise(resolve=>globalThis.__releaseComposeAck=()=>resolve(response));}
    return response;
   };
  },scenario);
  const open=()=>p.locator('#thought-home-tools').getByRole('button',{name:'接着写',exact:true}).click();await open();
  const host=p.locator('#topic-action-dialog'),field=host.getByRole('textbox',{name:'今天的新想法'}),save=host.getByRole('button',{name:'保存想法',exact:true});
  const original='SYNTHETIC submitted Thought 👩‍💻\nKeep every authored line.',newer='SYNTHETIC newer unsaved Thought 👩‍💻\nNever close this newer draft.';
  await field.fill(original);await save.click();await eventually(()=>p.evaluate(()=>__composeAckCommitted.length===1),'real worker has committed the first request');const first=await p.evaluate(()=>({call:__composeAckCalls[0],response:__composeAckCommitted[0]}));assert.equal(first.response.ok,true);const id=first.response.data.id;assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id})).body,original);trace.stage='first committed';trace.first=first;
  if(['lost-ack','malformed-ack','malformed-success','changed-retry'].includes(scenario)){
   await eventually(()=>save.isEnabled(),'interrupted acknowledgement permits explicit retry');assert.equal(await field.inputValue(),original);
   if(scenario==='changed-retry')await field.fill(newer);
   await save.click();
   if(scenario==='changed-retry'){await eventually(()=>save.isEnabled(),'failed reconciliation permits another explicit retry');await host.getByText('保存结果尚未确认，文字保留。再次保存会先核对上次提交。',{exact:true}).waitFor();await save.click();await host.getByText('先前提交已保存。这里的新文字或选择尚未保存，仍保留在此。',{exact:true}).waitFor();assert.equal(await field.inputValue(),newer);assert.equal(await host.isVisible(),true);p.once('dialog',dialog=>dialog.accept());await host.getByRole('button',{name:'取消',exact:true}).click();}
   await eventually(()=>host.isHidden(),'same-operation retry confirms the saved Thought');
   const calls=await p.evaluate(()=>__composeAckCalls);assert.equal(calls.length,scenario==='changed-retry'?3:2);for(const call of calls)assert.deepEqual(call,calls[0],'every uncertain retry keeps the original operation and payload');assert.equal((await p.evaluate(()=>__composeAckCommitted.at(-1))).data.id,id);
  }else if(scenario==='ime-settlement'){
   await field.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''})));await p.evaluate(()=>__releaseComposeAck());
   await host.getByText('先前提交已保存。这里的新文字或选择尚未保存，仍保留在此。',{exact:true}).waitFor();assert.equal(await field.inputValue(),original);assert.equal(await host.isVisible(),true);
   await field.press('Control+Enter');assert.equal(await p.evaluate(()=>__composeAckCalls.length),1,'active composition cannot resubmit');
   await field.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''})));await save.click();await eventually(()=>host.isHidden(),'already acknowledged unchanged composition settlement closes without another creation');assert.equal(await p.evaluate(()=>__composeAckCalls.length),1);
  }else{
   if(scenario==='reopened-draft'){p.once('dialog',dialog=>dialog.accept());await host.getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>host.isHidden());await open();}
   await field.fill(newer);await field.evaluate(node=>globalThis.__newerComposeDraft=node);trace.stage='newer draft present before old acknowledgement';await p.evaluate(()=>__releaseComposeAck());await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   trace.after=await p.evaluate(()=>({same:document.querySelector('.thought-draft')===__newerComposeDraft,value:__newerComposeDraft.value,connected:__newerComposeDraft.isConnected}));
   assert.equal(await host.isVisible(),true,'older acknowledgement cannot close a newer draft');assert.equal(await field.evaluate(node=>node===__newerComposeDraft),true,'newer textarea owner is preserved');assert.equal(await field.inputValue(),newer);
   assert.equal(await p.evaluate(()=>__composeAckCalls.length),1,'preserving newer text cannot submit it automatically');
   p.once('dialog',dialog=>dialog.accept());await host.getByRole('button',{name:'取消',exact:true}).click();
  }
  const entries=(await rpc(p,'GET_LIBRARY_UNPLACED',{options:{}})).items;assert.equal(entries.length,1,'one acknowledged creation remains one Thought');assert.equal(entries[0].id,id);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id})).body,original);const current=await h.state();assert.deepEqual({records:current.records,blocks:current.library.blocks},protectedBefore,'compose never changes captured Input or Source');offline(h);trace.stage='PASS';
 }catch(error){failure=error;throw error;}finally{
  if(p){try{trace.calls=await p.evaluate(()=>globalThis.__composeAckCalls||[]);trace.visible=await p.locator('#topic-action-dialog').isVisible();await mkdir('work/ux-r3',{recursive:true});await p.screenshot({path:`work/ux-r3/compose-ack-${scenario}-${variant}.png`});await writeFile(`work/ux-r3/compose-ack-${scenario}-${variant}.json`,JSON.stringify(trace,null,2));}catch{/* Keep the original failure if evidence capture is interrupted. */}}
  await closeComposeFixture(h,release,failure);
 }
});

// Synthetic transport interruption follows a real committed Topic creation.
for(const variant of ['source','release'])test(`UX-R3 independent today draft Topic creation ownership (${variant})`,{timeout:120000},async()=>{
 const release=variant==='release'?await mkdtemp(join(tmpdir(),'paia-compose-topic-')):null;
 if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({onboarding:true,...(release?{extensionPath:release}:{})});let p,failure;const trace={variant,head:process.env.PAIA_TESTED_HEAD,stage:'start'};
 try{
  p=await ready(h);await nav(p,'thoughts');await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__topicCreationCalls=[];globalThis.__topicCreationCommitted=[];globalThis.__dependentThoughtCalls=[];globalThis.__topicCreationMode='held';
   chrome.runtime.sendMessage=async(message,...args)=>{
    if(message.type==='CONTINUE_THINKING')__dependentThoughtCalls.push(structuredClone(message.thought));
    if(message.type!=='CREATE_LIBRARY_TOPIC')return send(message,...args);
    __topicCreationCalls.push(structuredClone(message.topic));
    if(__topicCreationMode==='retry-fails'){__topicCreationMode='retry-succeeds';return {ok:false,error:'STORAGE_FAILED'};}
    const response=await send(message,...args);__topicCreationCommitted.push(structuredClone(response));
    if(__topicCreationMode==='lost'){__topicCreationMode='retry-fails';throw Error('SYNTHETIC lost Topic creation acknowledgement');}
    if(__topicCreationMode==='held')return new Promise(resolve=>globalThis.__releaseTopicCreation=()=>resolve(response));
    return response;
   };
  });
  const open=()=>p.locator('#thought-home-tools').getByRole('button',{name:'接着写',exact:true}).click(),host=p.locator('#topic-action-dialog'),field=host.getByRole('textbox',{name:'今天的新想法'}),save=host.getByRole('button',{name:'保存想法',exact:true});
  for(const scenario of ['held','lost']){
   await p.evaluate(mode=>globalThis.__topicCreationMode=mode,scenario);await open();const body=`SYNTHETIC ${scenario} Topic-bound Thought 👩‍💻\nExact body.`;await field.fill(body);await host.locator('summary').filter({hasText:'选择主题（可不选）'}).click();await host.getByRole('button',{name:'新建主题',exact:true}).click();const name=`SYNTHETIC ${scenario} Topic`;await host.getByLabel('新主题名称',{exact:true}).fill(name);await host.getByRole('button',{name:'创建主题',exact:true}).click();
   await eventually(()=>p.evaluate(name=>__topicCreationCommitted.some(response=>response.ok&&__topicCreationCalls.some(call=>call.name===name)),name),'Topic committed before its acknowledgement is released');assert.equal(await save.isDisabled(),true,'dependent Thought cannot save before Topic identity is confirmed');await field.press('Control+Enter');assert.equal(await p.evaluate(()=>__dependentThoughtCalls.length),scenario==='held'?0:1);
   if(scenario==='held')await p.evaluate(()=>__releaseTopicCreation());
   else{
    const create=host.getByRole('button',{name:'创建主题',exact:true});await eventually(()=>create.isEnabled());assert.equal(await host.getByLabel('新主题名称',{exact:true}).getAttribute('readonly'),'');await create.click();await host.getByText('主题保存结果尚未确认，请重试核对。',{exact:true}).waitFor();assert.equal(await save.isDisabled(),true);await create.click();
   }
   await host.getByLabel(name,{exact:true}).waitFor();assert.equal(await host.getByLabel(name,{exact:true}).isChecked(),true);await eventually(()=>save.isEnabled());await save.click();await eventually(()=>host.isHidden());const calls=await p.evaluate(()=>__dependentThoughtCalls),last=calls.at(-1);assert.equal(last.body,body);assert.ok(last.topicId);const page=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:last.topicId,sort:'asc'}});assert.equal(page.items.length,1);assert.equal(page.items[0].entry.body,body);trace[scenario]={calls:await p.evaluate(()=>__topicCreationCalls),thought:last};
  }
  const calls=await p.evaluate(()=>__topicCreationCalls),lost=calls.filter(call=>call.name==='SYNTHETIC lost Topic');assert.equal(lost.length,3);for(const call of lost)assert.deepEqual(call,lost[0],'unknown Topic retry keeps exact name and operation through definitive retry failure');const topics=(await rpc(p,'LIBRARY_INDEX_PAGE',{options:{mode:'stable'}})).items;assert.equal(topics.length,2);assert.equal(await p.evaluate(()=>__dependentThoughtCalls.length),2);offline(h);trace.stage='PASS';
 }catch(error){failure=error;throw error;}finally{if(p)try{await mkdir('work/ux-r3',{recursive:true});await p.screenshot({path:`work/ux-r3/compose-topic-owner-${variant}.png`});await writeFile(`work/ux-r3/compose-topic-owner-${variant}.json`,JSON.stringify(trace,null,2));}catch{/* Preserve the original failure. */}await closeComposeFixture(h,release,failure);}
});

for(const variant of ['source','release'])test(`UX-R3 independent today draft acknowledged relation digest retains later text (${variant})`,{timeout:90000},async()=>{
 const release=variant==='release'?await mkdtemp(join(tmpdir(),'paia-compose-relation-')):null;if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({onboarding:true,...(release?{extensionPath:release}:{})});let p,failure;const trace={variant,head:process.env.PAIA_TESTED_HEAD,stage:'start'};
 try{
  p=await ready(h);const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC relation owner',operationId:op()}}),prior=await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:'SYNTHETIC earlier Thought remains exact 👩‍💻'}}),before=await rpc(p,'GET_LIBRARY_ENTRY',{id:prior.id});
  await nav(p,'thoughts');await p.locator(`[data-topic-id="${topic.id}"]`).click();const row=p.locator(`#topic-body [data-entry-id="${prior.id}"]`);await row.locator('.library-actions summary').click();await row.getByRole('button',{name:'接着写',exact:true}).click();
  const host=p.locator('#topic-action-dialog'),field=host.getByRole('textbox',{name:'今天的新想法'}),save=host.getByRole('button',{name:'保存想法',exact:true}),relation=host.getByLabel('记录与这条内容的回应关系',{exact:true});assert.equal(await relation.isChecked(),false);await relation.check();await field.fill('SYNTHETIC acknowledged response');
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__relationCalls=[];chrome.runtime.sendMessage=async(message,...args)=>{if(message.type!=='CONTINUE_THINKING')return send(message,...args);__relationCalls.push(structuredClone(message.thought));const response=await send(message,...args);globalThis.__relationResult=response;return new Promise(resolve=>globalThis.__releaseRelationAck=()=>resolve(response));};});
  await save.click();await eventually(()=>p.evaluate(()=>!!globalThis.__releaseRelationAck));assert.equal(await relation.isDisabled(),true);assert.equal(await host.locator('details').last().evaluate(node=>node.inert),true);await field.dispatchEvent('compositionstart');await p.evaluate(()=>__releaseRelationAck());await host.getByText('先前提交已保存。这里的新文字或选择尚未保存，仍保留在此。',{exact:true}).waitFor();await field.dispatchEvent('compositionend');await eventually(()=>save.isEnabled());
  await p.evaluate(()=>{const digest=crypto.subtle.digest.bind(crypto.subtle);globalThis.__restoreRelationDigest=()=>crypto.subtle.digest=digest;crypto.subtle.digest=(...args)=>new Promise(resolve=>globalThis.__releaseRelationDigest=()=>resolve(digest(...args)));});
  await save.click();await eventually(()=>p.evaluate(()=>!!globalThis.__releaseRelationDigest));const later='SYNTHETIC later draft during digest 👩‍💻\nDo not discard.';await field.fill(later);await field.evaluate(node=>globalThis.__relationDraft=node);await p.evaluate(()=>__releaseRelationDigest());await eventually(()=>save.isEnabled());assert.equal(await host.isVisible(),true);assert.equal(await field.evaluate(node=>node===__relationDraft),true);assert.equal(await field.inputValue(),later);assert.equal(await p.evaluate(()=>__relationCalls.length),1);await p.evaluate(()=>__restoreRelationDigest());
  const result=await p.evaluate(()=>__relationResult);assert.equal(result.ok,true);const created=await rpc(p,'GET_LIBRARY_ENTRY',{id:result.data.id});assert.equal(created.body,'SYNTHETIC acknowledged response');const comparison=await rpc(p,'COMPARE_THOUGHT_INPUT',{id:created.id});assert.equal(comparison.relations.length,1);assert.equal(comparison.relations[0].id,prior.id);assert.equal(comparison.relations[0].body,before.body);assert.deepEqual(await rpc(p,'GET_LIBRARY_ENTRY',{id:prior.id}),before);const page=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc'}});assert.equal(page.items.length,2);trace.calls=await p.evaluate(()=>__relationCalls);offline(h);trace.stage='PASS';
 }catch(error){failure=error;throw error;}finally{if(p)try{await mkdir('work/ux-r3',{recursive:true});await p.screenshot({path:`work/ux-r3/compose-relation-digest-${variant}.png`});await writeFile(`work/ux-r3/compose-relation-digest-${variant}.json`,JSON.stringify(trace,null,2));}catch{/* Preserve the original failure. */}await closeComposeFixture(h,release,failure);}
});
