import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const rpc=async(p,type,fields={})=>{const result=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(result?.ok,true,JSON.stringify(result));return result.data;};
for(const variant of ['source','release'])test('TOPIC-05.5 native contextual Section rename/order and protected prose '+variant,{timeout:120000},async()=>{
 const release=variant==='release'?await mkdtemp(resolve(tmpdir(),'paia-section-actions-')):null;
 if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release||resolve('.')}),p=h.archive;
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
  await eventually(async()=>await heading(f.ids[1]).textContent()==='SYNTHETIC Renamed B'&&await heading(f.ids[1]).evaluate(n=>document.activeElement===n),'same Section renamed and exact heading focus restored');assert.equal(await heading(f.ids[1]).evaluate(n=>document.activeElement===n),true,'focus returns to exact Section heading');
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
  const cdp=await h.context.newCDPSession(p),checks=[];await menu(f.ids[1]).evaluate(n=>globalThis.__retainedSectionMenu=n);
  try{for(const language of ['en','zh-CN']){
   await rpc(p,'UPDATE_PREFERENCES',{changes:{language,appearance:'dark'}});await eventually(()=>p.evaluate(lang=>document.documentElement.lang===lang,language==='en'?'en':'zh-CN'));
   await p.setViewportSize({width:320,height:900});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   const currentMenu=menu(f.ids[1]),trigger=currentMenu.locator('summary');assert.equal(await currentMenu.evaluate(n=>n===__retainedSectionMenu),true,'language changes retain the actual menu node');await trigger.scrollIntoViewIfNeeded();
   assert.equal(await trigger.getAttribute('aria-label'),language==='en'?'Section actions':'章节操作');
   const target=await trigger.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x+target.width/2,y:target.y+target.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await currentMenu.evaluate(n=>n.open),true);
   assert.deepEqual(await currentMenu.locator('button').allTextContents(),language==='en'?['Rename','Move up','Move down']:['重命名','向上移动','向下移动']);
   await currentMenu.evaluate(n=>{globalThis.__sectionActionScale=[...n.querySelectorAll('summary,button')].map(el=>({el,style:el.getAttribute('style')}));for(const {el}of __sectionActionScale)el.style.fontSize=parseFloat(getComputedStyle(el).fontSize)*2+'px';});
   const geometry=await currentMenu.evaluate(n=>({coarse:matchMedia('(pointer:coarse)').matches,overflow:document.documentElement.scrollWidth-innerWidth,controls:[...n.querySelectorAll('summary,button')].map(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {text:el.textContent,opacity:getComputedStyle(el).opacity,color:getComputedStyle(el).color,width:r.width,height:r.height,left:r.left,right:r.right,hit:hit===el||el.contains(hit),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};})}));
   checks.push({language,...geometry});assert.equal(geometry.coarse,true);assert.ok(geometry.overflow<=2);for(const control of geometry.controls){assert.ok(control.width>=44&&control.height>=44,JSON.stringify(control));assert.ok(control.left>=0&&control.right<=322&&control.hit,JSON.stringify(control));assert.ok(control.scrollWidth<=control.clientWidth,JSON.stringify(control));if(control.text)assert.equal(control.opacity,'1','Section action labels must not inherit faint heading buttons');}
   await p.screenshot({path:dir+'/section-actions-'+language+'-320-dark-text200-touch.png',fullPage:true});
   await p.keyboard.press('Escape');assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);
   await p.evaluate(()=>{for(const {el,style}of __sectionActionScale)if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);delete globalThis.__sectionActionScale;});
  }}finally{await cdp.detach();await writeFile(dir+'/presentation.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,checks,syntheticTextScaling:true},null,2));}

 }finally{await h.close();if(release)await rm(release,{recursive:true,force:true});}
});
