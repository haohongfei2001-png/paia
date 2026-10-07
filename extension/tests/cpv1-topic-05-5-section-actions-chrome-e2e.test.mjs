import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const rpc=async(p,type,fields={})=>{const result=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(result?.ok,true,JSON.stringify(result));return result.data;};
for(const variant of ['source','release'])test('TOPIC-05.5 native contextual Section rename/order and protected prose '+variant,{timeout:120000},async()=>{
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:resolve(variant==='release'?'work/current-release':'.')}),p=h.archive;
 try{
  await p.setViewportSize({width:1280,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const f=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID();await s.finishFoundation();const t=await s.createTopic({name:'SYNTHETIC Section actions',operationId:op()}),ids=[];for(const title of ['SYNTHETIC A','SYNTHETIC Empty B'])ids.push((await s.createSection({topicId:t.id,expectedTopicRevision:(await s.topic(t.id)).organizationRevision,title,operationId:op()})).sectionId);const e=await s.continueThinking({topicId:t.id,body:'SYNTHETIC protected prose\n\n中文 paragraph',operationId:op()});return {topic:t.id,defaultId:t.defaultSectionId,ids,entry:e.id};});
  const bodyBefore=(await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body;
  const sections=async()=>(await rpc(p,'GET_LIBRARY_SECTION_PROJECTION',{options:{topicId:f.topic,limit:100}})).items;
  await thoughtPrimary(p,'thoughts');await p.locator(`.personal-topic-block[data-topic-id="${f.topic}"] .personal-topic-link`).click();
  const host=id=>p.locator(`#original-reading-body .topic-section[data-section-id="${id}"]`),menu=id=>host(id).locator('.topic-section-actions'),heading=id=>host(id).locator('h2');
  await heading(f.ids[1]).waitFor({state:'visible'});assert.equal(await host(f.ids[1]).locator('[data-entry-id]').count(),0);assert.equal(await host(f.defaultId).locator('h2,.topic-section-actions').count(),0);
  const activate=async(id,label)=>{const trigger=menu(id).locator('summary');await trigger.focus();await p.keyboard.press('Enter');await menu(id).getByRole('button',{name:label,exact:true}).focus();await p.keyboard.press('Enter');};
  await activate(f.ids[1],'重命名');await p.locator('#library-form input[name="title"]').fill('SYNTHETIC Renamed B');await p.locator('#library-form button[type="submit"]').click();
  await eventually(async()=>await heading(f.ids[1]).textContent()==='SYNTHETIC Renamed B','same Section renamed');assert.equal(await heading(f.ids[1]).evaluate(n=>document.activeElement===n),true,'focus returns to exact Section heading');
  const renamed=(await sections()).find(s=>s.id===f.ids[1]);assert.equal(renamed.title,'SYNTHETIC Renamed B');
  await activate(f.ids[1],'向上移动');await eventually(async()=>{const ids=(await sections()).map(s=>s.id);return ids.indexOf(f.ids[1])<ids.indexOf(f.ids[0]);},'empty Section moves before A');
  await eventually(async()=>{const ids=await p.locator('#original-reading-body .topic-section').evaluateAll(ns=>ns.map(n=>n.dataset.sectionId));return ids.indexOf(f.ids[1])<ids.indexOf(f.ids[0]);},'reader reflects protected Section order');
  await activate(f.ids[1],'向下移动');await eventually(async()=>{const ids=(await sections()).map(s=>s.id);return ids.indexOf(f.ids[1])>ids.indexOf(f.ids[0]);},'Section moves down');
  await eventually(async()=>{const ids=await p.locator('#original-reading-body .topic-section').evaluateAll(ns=>ns.map(n=>n.dataset.sectionId));return ids.indexOf(f.ids[1])>ids.indexOf(f.ids[0])&&await heading(f.ids[1]).evaluate(n=>document.activeElement===n);},'down operation finishes rendering and returns focus before next action');
  // A stale rename proposal may not overwrite a concurrent canonical rename.
  await activate(f.ids[1],'重命名');const current=(await sections()).find(s=>s.id===f.ids[1]);await rpc(p,'EDIT_LIBRARY_SECTION',{edit:{topicId:f.topic,sectionId:f.ids[1],expectedRevision:current.revision,title:'SYNTHETIC concurrent B',operationId:crypto.randomUUID()}});
  await p.locator('#library-form input[name="title"]').fill('SYNTHETIC stale B');await p.locator('#library-form button[type="submit"]').click();await eventually(async()=>await heading(f.ids[1]).textContent()==='SYNTHETIC concurrent B','stale dialog preserves newer canonical title');await eventually(async()=>await heading(f.ids[1]).evaluate(n=>document.activeElement===n)&&await menu(f.ids[1]).locator('button').first().isEnabled(),'conflict recovery has finished before composing');assert.equal((await sections()).find(s=>s.id===f.ids[1]).title,'SYNTHETIC concurrent B');
  await p.evaluate(()=>{globalThis.__sectionEvents=[];for(const type of ['compositionstart','compositionend','focusout'])document.addEventListener(type,e=>globalThis.__sectionEvents.push([type,e.target.closest('[data-entry-id]')?.dataset.entryId]),true);});
  const prose=p.locator(`[data-entry-id="${f.entry}"] [data-entry-field="body"]`);await prose.focus();await prose.evaluate(n=>{globalThis.__actionIME=n;n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));n.textContent+=' SYNTHETIC IME draft';n.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText'}));});
  await activate(f.ids[0],'重命名');assert.equal(await p.locator('#library-dialog').evaluate(n=>n.open),false);assert.equal(await prose.evaluate(n=>n===globalThis.__actionIME&&n.isConnected),true);assert.match(await prose.textContent(),/IME draft/);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,bodyBefore,JSON.stringify(await p.evaluate(()=>globalThis.__sectionEvents)));
  await prose.evaluate((n,body)=>{n.textContent=body;n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));n.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));},bodyBefore);
  await p.reload();await heading(f.ids[1]).waitFor({state:'visible'});assert.equal(await heading(f.ids[1]).textContent(),'SYNTHETIC concurrent B');assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,bodyBefore);assert.equal(await host(f.defaultId).locator('h2,.topic-section-actions').count(),0);
  const dir='work/qa-topic05-section-actions/'+variant;await mkdir(dir,{recursive:true});await p.screenshot({path:dir+'/section-actions.png',fullPage:true});
 }finally{await h.close();}
});
