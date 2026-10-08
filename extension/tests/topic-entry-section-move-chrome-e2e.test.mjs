import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
for(const variant of ['source','release'])test('whole Entry move and existing restore '+variant,{timeout:90000},async()=>{
 const release=variant==='release'?await mkdtemp(resolve(tmpdir(),'paia-entry-move-')):null;
 if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release||resolve('.')}),p=h.archive;
 try{
  await p.setViewportSize({width:1280,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const f=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID();await s.finishFoundation();const t=await s.createTopic({name:'SYNTHETIC Entry movement',operationId:op()}),section=await s.createSection({topicId:t.id,expectedTopicRevision:(await s.topic(t.id)).organizationRevision,title:'SYNTHETIC destination',operationId:op()}),e=await s.continueThinking({topicId:t.id,body:'SYNTHETIC entire Entry\n\n保留条件，不是选中文字。',operationId:op()});return {topic:t.id,defaultId:(await s.topic(t.id)).defaultSectionId,section:section.sectionId,entry:e.id};});
  const before=await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry});await thoughtPrimary(p,'thoughts');await p.locator(`.personal-topic-block[data-topic-id="${f.topic}"] .personal-topic-link`).click();
  const entry=()=>p.locator(`#original-reading-body [data-entry-id="${f.entry}"]`),move=async(label='移动到章节')=>{await eventually(async()=>await entry().locator('.topic-entry-actions').getAttribute('aria-busy')==='false','entry action lifecycle complete');await entry().hover();const menu=entry().locator('.library-actions');await menu.locator('summary').focus();await p.keyboard.press('Enter');await menu.getByRole('button',{name:label,exact:true}).focus();await p.keyboard.press('Enter');await p.locator('#library-form select').waitFor({state:'visible'});};
  await move();assert.match(await p.locator('#library-form select').getAttribute('aria-label'),/整条内容.*不是所选文字/);await p.keyboard.press('Escape');assert.equal((await rpc(p,'GET_LIBRARY_PLACEMENT',{topicId:f.topic,entryId:f.entry})).sectionId,f.defaultId);
  await move();await p.locator('#library-form select').selectOption(f.section);await p.locator('#library-form button[type="submit"]').click();await eventually(async()=>await entry().getAttribute('data-section-id')===f.section,'named Section arrival');assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,before.body);
  await p.reload();await entry().waitFor();assert.equal(await entry().getAttribute('data-section-id'),f.section);
  await move();await p.locator('#library-form select').selectOption(f.defaultId);await p.locator('#library-form button[type="submit"]').click();await eventually(async()=>await entry().getAttribute('data-section-id')===f.defaultId,'default Section arrival');
  await entry().hover();const menu=entry().locator('.library-actions');await menu.locator('summary').click();await menu.getByRole('button',{name:'位置与成员版本',exact:true}).click();await p.locator('.revision-row').first().getByRole('button',{name:'恢复操作前',exact:true}).click();await eventually(async()=>await entry().getAttribute('data-section-id')===f.section,'existing version restores preceding placement');assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,before.body);
  const retained=await entry().evaluate(n=>n.entryMovePlacement),durable=await rpc(p,'GET_LIBRARY_PLACEMENT',{topicId:f.topic,entryId:f.entry});for(const field of ['id','topicId','sectionId','layoutGeneration','revision'])assert.equal(retained[field],durable[field],'retained menu current placement '+field);assert.equal(retained.sectionProtected,durable.sectionProtection);assert.equal(retained.orderProtected,durable.orderProtection);
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await p.setViewportSize({width:320,height:760});await p.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await move('Move to Section');assert.equal(await p.locator('#library-dialog-title').textContent(),'Move entire Entry');assert.equal(await p.locator('#library-form select').getAttribute('aria-label'),'Destination for the entire Entry (not selected text)');assert.equal(await p.locator('#library-dialog-close').textContent(),'Close');assert.ok(await p.locator('#library-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1));const dir='work/qa-entry-move/'+variant;await mkdir(dir,{recursive:true});await p.screenshot({path:dir+'/move-320-dark-en.png',fullPage:true});await p.keyboard.press('Escape');
 }finally{await h.close();if(release)await rm(release,{recursive:true,force:true});}
});
