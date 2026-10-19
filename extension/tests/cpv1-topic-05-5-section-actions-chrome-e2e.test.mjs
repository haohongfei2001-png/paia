import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const rpc=async(p,type,fields={})=>{const result=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(result?.ok,true,JSON.stringify(result));return result.data;};
const seedSections=async p=>{
 await eventually(async()=>{const status=await rpc(p,'GET_STATUS');return status.consented===true&&status.enabled===true;},'the original worker acknowledges consent before Section setup');
 const foundation=await rpc(p,'GET_LIBRARY_FOUNDATION_STATUS');assert.equal(foundation.phase,'active');assert.equal(foundation.bindingMigration.complete,true);
 const op=()=>crypto.randomUUID(),t=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC Section actions',operationId:op()}}),ids=[];
 for(const title of ['SYNTHETIC A','SYNTHETIC Empty B'])ids.push((await rpc(p,'CREATE_LIBRARY_SECTION',{section:{topicId:t.id,expectedTopicRevision:(await rpc(p,'GET_LIBRARY_TOPIC',{id:t.id})).organizationRevision,title,operationId:op()}})).sectionId);
 const e=await rpc(p,'CONTINUE_THINKING',{thought:{topicId:t.id,body:'SYNTHETIC protected prose\n\n中文 paragraph',operationId:op()}});
 return {topic:t.id,defaultId:t.sectionId,ids,entry:e.id};
};
for(const variant of ['source','release'])test('TOPIC-05.5 native contextual Section rename/order and protected prose '+variant,{timeout:120000},async()=>{
 const borrowed=process.env.TOPIC_PROMOTION_RELEASE_PATH;const release=variant==='release'?borrowed||await mkdtemp(resolve(tmpdir(),'paia-section-actions-')):null;
 if(release&&!borrowed)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release||resolve('.')}),p=h.archive;
 try{
  await p.setViewportSize({width:1280,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const f=await seedSections(p);
  assert.ok(f.defaultId,'the original create acknowledgement identifies the actual default Section');
  const bodyBefore=(await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body;
  const sections=async()=>(await rpc(p,'GET_LIBRARY_SECTION_PROJECTION',{options:{topicId:f.topic,limit:100}})).items;
  await thoughtPrimary(p,'thoughts');await p.locator('.personal-topic-block[data-topic-id="'+f.topic+'"] .personal-topic-link').click();
  const host=id=>p.locator('#original-reading-body .topic-section[data-section-id="'+id+'"]'),directory=id=>p.locator('.topic-section-directory button[data-section-id="'+id+'"]'),summary=p.locator('#topic-menu summary');
  const installFocusTrace=()=>p.evaluate(async()=>{const {TopicController}=await import('./topic-workspace.js');globalThis.__sectionFocusTrace=[];const focus=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(...args){if(this.matches('summary,.topic-section'))__sectionFocusTrace.push({nativeFocus:this.tagName,section:this.dataset.sectionId||null,connected:this.isConnected,inert:!!this.closest('[inert]'),stack:new Error().stack.split('\n').slice(1,5)});return focus.apply(this,args);};for(const name of ['focusSection','resetTopicReader']){const original=TopicController.prototype[name];TopicController.prototype[name]=async function(...args){const start={method:name,section:this.activeSectionId,serial:this.serial,saved:!!args[0]?.saved,anchor:args[0]?.saved?.sectionAnchor?{revision:args[0].saved.sectionAnchor.revision,title:args[0].saved.sectionAnchor.title}:null};const result=await original.apply(this,args);__sectionFocusTrace.push({...start,currentSection:this.activeSectionId,currentSerial:this.serial,activeAtReturn:document.activeElement?.tagName,sectionAtReturn:document.activeElement?.dataset.sectionId||null,workspaceInert:document.querySelector('.workspace')?.inert,result:typeof result==='boolean'?result:null,state:result&&typeof result==='object'?{stale:result.stale,anchorUnavailable:result.anchorUnavailable,sectionRestoreRefused:result.sectionRestoreRefused,errorNext:result.errorNext,paintRefused:result.paintRefused}:null});return result;};}});await installFocusTrace();
  const arrived=async(id,title)=>{try{await eventually(async()=>await host(id).count()===1&&await directory(id).getAttribute('aria-current')==='true'&&await host(id).evaluate(n=>document.activeElement===n),'exact selected Section host has native arrival focus');}catch(error){console.log('SECTION_NATIVE_FOCUS_TRACE',JSON.stringify(await p.evaluate(()=>({trace:globalThis.__sectionFocusTrace||[],active:document.activeElement?.id,activeTag:document.activeElement?.tagName,notice:document.getElementById('notice').textContent}))));throw error;}if(title!==undefined)assert.equal(await directory(id).textContent(),title);assert.equal(await p.locator('#original-reading-body .topic-section').count(),1,'no visible or hidden sibling prose');assert.equal(await host(id).locator('h2,.topic-section-actions').count(),0,'scoped prose has no repeated heading or retired menu');};
  const choose=async(id,title)=>{const select=p.locator('.topic-section-select');if(await select.isVisible())await select.selectOption(id);else await directory(id).click();await arrived(id,title);};
  const openTopicMenu=async()=>{if(!await summary.evaluate(n=>n.parentElement.open)){await summary.focus();await p.keyboard.press('Enter');}};
  const createSection=async(label='新建章节')=>{await openTopicMenu();assert.equal(await p.locator('#topic-create-section').textContent(),label);await p.locator('#topic-create-section').focus();await p.keyboard.press('Enter');};
  const openStructure=async({touch=null,expectOpen=true}={})=>{await openTopicMenu();const control=p.locator('#topic-structure');if(touch){const r=await control.boundingBox();await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await control.focus();await p.keyboard.press('Enter');}if(expectOpen)await p.locator('#library-dialog[open] .topic-structure-row').first().waitFor();};
  const structureRow=async id=>{const section=(await sections()).find(row=>row.id===id);assert.ok(section);return p.locator('#library-dialog[open] .topic-structure-row').filter({has:p.getByRole('heading',{level:3,name:section.title||'正文',exact:true})});};
  const activate=async(id,label)=>{await openStructure();const row=await structureRow(id);assert.equal(await row.count(),1);await row.getByRole('button',{name:label,exact:true}).focus();await p.keyboard.press('Enter');};
  await choose(f.ids[1],'SYNTHETIC Empty B');assert.equal(await host(f.ids[1]).locator('[data-entry-id]').count(),0);
  // Creation uses the real low-frequency Topic owner and exact durable ACK.
  const initialSections=await sections();await createSection();await p.locator('#library-form input[name="title"]').fill('SYNTHETIC cancelled Section');await p.keyboard.press('Escape');assert.deepEqual(await sections(),initialSections,'cancel never mutates the Section projection');
  await createSection();await p.locator('#library-form input[name="title"]').fill('SYNTHETIC keyboard-created Section');
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage;globalThis.__sectionCreateBusy={sent:0,release:null};globalThis.__sectionCreateRestore=()=>{chrome.runtime.sendMessage=send;};chrome.runtime.sendMessage=function(message,...args){const result=send.call(this,message,...args);if(message?.type!=='CREATE_LIBRARY_SECTION')return result;__sectionCreateBusy.sent++;return Promise.resolve(result).then(reply=>new Promise(resolve=>{__sectionCreateBusy.release=()=>resolve(reply);}));};});
  try{
   await p.keyboard.press('Enter');await eventually(()=>p.evaluate(()=>typeof __sectionCreateBusy.release==='function'),'hold the actual creation reply while the original mutation remains pending');
   await openTopicMenu();const busy=p.locator('#topic-create-section');assert.equal(await busy.isDisabled(),true,'the real pending toolbar prevents a second structural request');
   for(const key of ['Enter','Space']){await busy.evaluate(n=>n.focus());assert.equal(await busy.evaluate(n=>document.activeElement===n),false,'disabled creation cannot acquire native focus');await p.keyboard.press(key);await openTopicMenu();}
   const r=await busy.boundingBox();await p.mouse.click(r.x+r.width/2,r.y+r.height/2);assert.equal(await p.evaluate(()=>__sectionCreateBusy.sent),1,'native keyboard and pointer cannot duplicate the in-flight creation');
  }finally{await p.evaluate(()=>{__sectionCreateBusy.release?.();__sectionCreateRestore();});}
  let created;await eventually(async()=>{created=(await sections()).find(row=>row.title==='SYNTHETIC keyboard-created Section');return !!created;},'new named Section is durably acknowledged');
  await arrived(created.id,'SYNTHETIC keyboard-created Section');assert.equal(await p.locator('#topic-create-section').isEnabled(),true);
  assert.equal(await host(created.id).locator('[data-entry-id]').count(),0);assert.equal((await sections()).length,initialSections.length+1);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,bodyBefore);
  await p.reload();await installFocusTrace();await directory(created.id).waitFor();assert.equal(await directory(created.id).textContent(),'SYNTHETIC keyboard-created Section');assert.equal((await sections()).filter(row=>row.id===created.id).length,1);
  await activate(f.ids[1],'重命名');await p.locator('#library-form input[name="title"]').fill('SYNTHETIC Renamed B');await p.locator('#library-form button[type="submit"]').click();
  await arrived(f.ids[1],'SYNTHETIC Renamed B');assert.equal((await sections()).find(s=>s.id===f.ids[1]).title,'SYNTHETIC Renamed B');
  await activate(f.ids[1],'向上移动');await eventually(async()=>{const ids=(await sections()).map(s=>s.id);return ids.indexOf(f.ids[1])<ids.indexOf(f.ids[0]);},'empty Section moves before A');
  await eventually(async()=>{const ids=await p.locator('.topic-section-directory button[data-section-id]').evaluateAll(ns=>ns.map(n=>n.dataset.sectionId));return ids.indexOf(f.ids[1])>=0&&ids.indexOf(f.ids[1])<ids.indexOf(f.ids[0]);},'actual directory reflects protected human Section order');await arrived(f.ids[1],'SYNTHETIC Renamed B');
  await activate(f.ids[1],'向下移动');await eventually(async()=>{const ids=(await sections()).map(s=>s.id);return ids.indexOf(f.ids[1])>ids.indexOf(f.ids[0]);},'Section moves down');
  await eventually(async()=>{const ids=await p.locator('.topic-section-directory button[data-section-id]').evaluateAll(ns=>ns.map(n=>n.dataset.sectionId));return ids.indexOf(f.ids[0])>=0&&ids.indexOf(f.ids[1])>ids.indexOf(f.ids[0]);},'directory reflects the completed down operation');await arrived(f.ids[1],'SYNTHETIC Renamed B');
  // A stale rename proposal may not overwrite a concurrent canonical rename.
  await activate(f.ids[1],'重命名');const current=(await sections()).find(s=>s.id===f.ids[1]);await rpc(p,'EDIT_LIBRARY_SECTION',{edit:{topicId:f.topic,sectionId:f.ids[1],expectedRevision:current.revision,title:'SYNTHETIC concurrent B',operationId:crypto.randomUUID()}});
  await p.locator('#library-form input[name="title"]').fill('SYNTHETIC stale B');await p.locator('#library-form button[type="submit"]').click();await arrived(f.ids[1],'SYNTHETIC concurrent B');assert.equal((await sections()).find(s=>s.id===f.ids[1]).title,'SYNTHETIC concurrent B');
  await choose(f.defaultId);await p.evaluate(()=>{globalThis.__sectionEvents=[];for(const type of ['compositionstart','compositionend','focusout'])document.addEventListener(type,e=>globalThis.__sectionEvents.push([type,e.target.closest('[data-entry-id]')?.dataset.entryId]),true);});
  const prose=p.locator('[data-entry-id="'+f.entry+'"] [data-entry-field="body"]');await prose.focus();await prose.evaluate(n=>{globalThis.__actionIME=n;n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));n.textContent+=' SYNTHETIC IME draft';n.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText'}));});
  await openStructure({expectOpen:false});assert.equal(await p.locator('#library-dialog').evaluate(n=>n.open),false,'a composing canonical Entry cannot open structural mutation controls');assert.equal(await prose.evaluate(n=>n===globalThis.__actionIME&&n.isConnected),true);assert.match(await prose.textContent(),/IME draft/);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,bodyBefore,JSON.stringify(await p.evaluate(()=>globalThis.__sectionEvents)));
  await prose.evaluate((n,body)=>{n.textContent=body;n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));n.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));},bodyBefore);
  await p.reload();await directory(f.ids[1]).waitFor();await choose(f.ids[1],'SYNTHETIC concurrent B');assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,bodyBefore);
  const dir='work/qa-topic05-section-actions/'+variant;await mkdir(dir,{recursive:true});await p.screenshot({path:dir+'/section-actions.png',fullPage:true});
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>p.locator('#topic-create-section').textContent().then(text=>text==='New Section'));
  {
   const beforeEnglish=await sections();await createSection('New Section');
   assert.equal(await p.locator('#library-dialog-title').textContent(),'New Section');assert.equal(await p.locator('#library-form input').getAttribute('aria-label'),'Section name');assert.equal(await p.locator('#library-form button[type="submit"]').textContent(),'Create Section');assert.equal(await p.locator('#library-dialog-close').textContent(),'Close');
   await p.locator('#library-form input').fill('SYNTHETIC 中文 Section name');await p.locator('#library-dialog-close').click();assert.equal(await p.locator('#library-dialog').evaluate(n=>n.open),false);assert.deepEqual(await sections(),beforeEnglish,'English Close cancels without creating');
   await createSection('New Section');await p.locator('#library-form input').fill('SYNTHETIC 中文 Section name');await p.getByRole('button',{name:'Create Section',exact:true}).click();let englishCreated;await eventually(async()=>{englishCreated=(await sections()).find(s=>s.title==='SYNTHETIC 中文 Section name');return !!englishCreated;},'English create persists exact user name');await arrived(englishCreated.id,'SYNTHETIC 中文 Section name');assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,bodyBefore);
  }
  const cdp=await h.context.newCDPSession(p),checks=[];
  try{for(const language of ['en','zh-CN']){
   await rpc(p,'UPDATE_PREFERENCES',{changes:{language,appearance:'dark'}});await eventually(()=>p.evaluate(lang=>document.documentElement.lang===lang,language==='en'?'en':'zh-CN'));
   assert.equal(await p.locator('#topic-create-section').textContent(),language==='en'?'New Section':'新建章节','live language updates the existing creation control');
   await p.setViewportSize({width:320,height:900});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await openStructure({touch:cdp});
   const row=await structureRow(f.ids[1]);assert.deepEqual(await row.locator('button').allTextContents(),language==='en'?['Rename','Merge Sections','Move up','Move down','Section version history','Promote to an independent Topic']:['重命名','合并章节','向上移动','向下移动','章节版本历史','提升为独立主题']);
   await row.evaluate(async n=>{globalThis.__retainedStructureRow=n;globalThis.__sectionActionScale=[...n.querySelectorAll('button')].map(el=>({el,style:el.getAttribute('style')}));for(const {el}of __sectionActionScale)el.style.fontSize=parseFloat(getComputedStyle(el).fontSize)*2+'px';await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
   const geometry=await p.evaluate(()=>({coarse:matchMedia('(pointer:coarse)').matches,overflow:document.documentElement.scrollWidth-innerWidth,controls:[]}));assert.equal(geometry.coarse,true);assert.ok(geometry.overflow<=2);
   for(const control of await row.locator('button').all()){
    await control.scrollIntoViewIfNeeded();const g=await control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {text:el.textContent,opacity:getComputedStyle(el).opacity,width:r.width,height:r.height,left:r.left,right:r.right,hit:hit===el||el.contains(hit),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};});geometry.controls.push(g);assert.ok(g.width>=44&&g.height>=44,JSON.stringify(g));assert.ok(g.left>=0&&g.right<=322&&g.hit,JSON.stringify(g));assert.ok(g.scrollWidth<=g.clientWidth,JSON.stringify(g));assert.equal(g.opacity,'1','Section action labels remain fully legible');
   }
   assert.equal(await row.evaluate(n=>n===globalThis.__retainedStructureRow),true,'text scaling and native scrolling retain the exact live control owner');checks.push({language,...geometry});await p.screenshot({path:dir+'/section-actions-'+language+'-320-dark-text200-touch.png',fullPage:true});
   await p.evaluate(()=>{for(const {el,style}of __sectionActionScale)if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);delete globalThis.__sectionActionScale;});await p.keyboard.press('Escape');assert.equal(await summary.evaluate(n=>document.activeElement===n),true,'native modal Escape returns to its actual Topic menu invoker');
  }}finally{await cdp.detach();await writeFile(dir+'/presentation.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,checks,syntheticTextScaling:true},null,2));}
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();if(release&&!borrowed)await rm(release,{recursive:true,force:true});}
});
