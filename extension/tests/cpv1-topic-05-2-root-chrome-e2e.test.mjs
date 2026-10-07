import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
async function rootReady(p,count){
 await eventually(async()=>{
  const loaded=await p.locator('.personal-topic-block').count();if(loaded<count)await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  return loaded===count&&await p.locator('#thought-continuous-sentinel').getAttribute('data-terminal')==='true';
 },`all ${count} Personal Topics reach a real end`,30000);
 await p.waitForFunction(()=>history.state?.paiaReader?.view==='thoughts'&&!history.state?.paiaReader?.topicId&&!document.querySelector('.workspace').inert);
 await p.evaluate(()=>scrollTo(0,0));
}
// The continuous reader owns real Section nodes; the prior temporary Root
// anchor is intentionally absent. Assert the exact durable target and focus.
async function assertSectionTarget(p,topicId,sectionId,title){
 const node=p.locator(`#topic-body .topic-section[data-section-id="${sectionId}"]`),heading=node.locator(':scope > .section-heading > h2');
 await node.waitFor({state:'visible'});assert.equal(await node.count(),1,'one canonical Section target');
 assert.equal(await heading.textContent(),title,'the exact named Section is rendered');
 await eventually(()=>heading.evaluate(el=>document.activeElement===el),'Section navigation completes at its own heading');
 assert.equal(await p.evaluate(()=>history.state?.paiaReader?.topicId),topicId,'the Section belongs to the intended Topic');
 assert.equal(await heading.evaluate(el=>document.activeElement===el),true,'the canonical Section heading owns focus');
}
async function multipleHitSearch(p,topic){
 const needle='SYNTHETIC_MULTI_ROOT_NEEDLE',current=await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id});
 await rpc(p,'EDIT_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:current.revision,changes:{name:needle+' Topic'},operationId:crypto.randomUUID()}});
 const sections=(await rpc(p,'GET_LIBRARY_TOPIC_SECTIONS',{options:{topicId:topic.id,limit:100}})).items,targets=[topic.sections[0],topic.sections.at(-1)],entries=[];
 for(let i=0;i<targets.length;i++){
  const section=sections.find(row=>row.sectionId===targets[i]);await rpc(p,'EDIT_LIBRARY_SECTION',{edit:{topicId:topic.id,sectionId:section.sectionId,expectedRevision:section.revision,title:needle+' Section '+i,operationId:crypto.randomUUID()}});
  const entry=await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topic.id,body:needle+' '+(i?'BETA':'ALPHA')+' exact independent expression',operationId:crypto.randomUUID()}}),path=(await rpc(p,'GET_LIBRARY_PATHS',{id:entry.id})).find(row=>row.topicId===topic.id),owner=await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id});
  await rpc(p,'PLACE_LIBRARY_ENTRY',{placement:{topicId:topic.id,sectionId:section.sectionId,entryId:entry.id,expectedEntryRevision:entry.revision,expectedPlacementRevision:path.placement.revision,expectedTopicRevision:owner.organizationRevision,operationId:crypto.randomUUID()}});entries.push(await rpc(p,'GET_LIBRARY_ENTRY',{id:entry.id}));
 }
 await rootReady(p,144);const tile=p.locator(`.personal-topic-block[data-topic-id="${topic.id}"]`),footprint=()=>tile.evaluate(node=>{const r=node.getBoundingClientRect();return [node.dataset.rootSlot,r.x,r.y+scrollY,r.width,r.height];}),before=await footprint(),visited=[];
 await p.locator('#thought-search').fill(needle);await eventually(()=>tile.locator('.personal-root-match-status').textContent().then(text=>text==='1 / 5'),'Topic, two Sections and two Entries are all reachable hits');
 for(let i=0;i<5;i++){
  const key=await tile.getAttribute('data-search-hit-key'),[kind,entryId,sectionId]=JSON.parse(key);visited.push({kind,entryId,sectionId});assert.deepEqual(await footprint(),before,'match stepping retains the original Topic rectangle');
  if(kind==='entry'||kind==='section'){
   const action=tile.locator(kind==='entry'?'.personal-entry-match':'.personal-root-search-extra.personal-section-link'),columns=()=>p.locator('#thought-list').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),beforeColumns=await columns();
   await action.focus();
   for(const width of [1420,1440]){
    await p.setViewportSize({width,height:1000});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await columns(),beforeColumns,'active search resize follows the same-column layout path');assert.equal(await tile.getAttribute('data-search-hit-key'),key,'resize preserves the exact selected match identity');assert.equal(await action.isVisible(),true,'resize keeps selected Entry or Section activation reachable');assert.equal(await tile.locator('.personal-topic-sections > .personal-section-link:not(.personal-root-search-extra)').evaluateAll(nodes=>nodes.every(node=>node.hidden)),true,'resize never reveals the ordinary overview behind a selected result');assert.equal(await action.evaluate(node=>node===document.activeElement),true,'resize keeps exact result focus');
   }
   assert.deepEqual(await footprint(),before,'returning width restores the same Topic search footprint');
  }
  if(kind==='entry'){
   await rpc(p,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:true}});await eventually(()=>tile.locator('.personal-entry-preview').isHidden());assert.equal(await tile.locator('.personal-entry-mask-label').isVisible(),true);
   assert.equal(await tile.locator('.personal-entry-match,.personal-root-match-nav').evaluateAll(nodes=>nodes.some(node=>[node,...node.querySelectorAll('*')].some(el=>/ALPHA|BETA/.test((el.getAttribute('title')||'')+' '+(el.getAttribute('aria-label')||''))))),false,'masked snippets do not escape into match controls');
   await tile.locator('.personal-entry-match').focus();await p.keyboard.press('Enter');const field=p.locator(`[data-entry-id="${entryId}"] [data-entry-field="body"]`);await field.waitFor({state:'visible'});assert.equal(await field.textContent(),entries.find(row=>row.id===entryId).body);await eventually(()=>field.evaluate(node=>node===document.activeElement),'Entry navigation completes at its own canonical target');assert.equal(await field.evaluate(node=>node===document.activeElement),true,'each Entry opens its own canonical target');
  }else if(kind==='section'){
   await tile.locator('.personal-root-search-extra.personal-section-link').focus();await p.keyboard.press('Enter');await assertSectionTarget(p,topic.id,sectionId,needle+' Section '+targets.indexOf(sectionId));
  }else{assert.equal(kind,'topic');await tile.locator('.personal-topic-link').focus();await p.keyboard.press('Enter');await p.locator('#thought-document').waitFor({state:'visible'});}
  await p.waitForFunction(id=>history.state?.paiaReader?.topicId===id&&document.querySelector('.workspace')?.dataset.state==='ready'&&!document.querySelector('.workspace').inert,topic.id);
  await p.locator('#back').evaluate(node=>node.focus({preventScroll:true}));await p.keyboard.press('Enter');await tile.locator('.personal-root-match-status').waitFor({state:'visible'});
  await eventually(async()=>await p.locator('#thought-search').inputValue()===needle&&await tile.getAttribute('data-search-hit-key')===key,'Back keeps the same selected hit and query');
  if(kind!=='topic')await eventually(()=>p.evaluate(key=>document.activeElement?.dataset.rootMatchKey===key,key),'Back restores the activated exact match focus');
  if(kind==='entry'){await rpc(p,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:false}});await eventually(()=>tile.locator('.personal-entry-preview').isVisible());}
  await tile.locator('[data-root-match-step="next"]').focus();await p.keyboard.press('Enter');await eventually(()=>tile.locator('.personal-root-match-status').textContent().then(text=>text===`${(i+1)%5+1} / 5`),'keyboard advances only the preview within this Topic');
 }
 assert.deepEqual(visited.map(row=>row.kind).sort(),['entry','entry','section','section','topic']);assert.deepEqual(new Set(visited.filter(row=>row.kind==='entry').map(row=>row.entryId)),new Set(entries.map(row=>row.id)));assert.deepEqual(new Set(visited.filter(row=>row.kind==='section').map(row=>row.sectionId)),new Set(targets));
 await p.locator('#thought-search').fill('');await rootReady(p,144);assert.equal(await tile.locator('.personal-root-search-extra').count(),0);assert.deepEqual(await footprint(),before);for(const entry of entries)assert.deepEqual(await rpc(p,'GET_LIBRARY_ENTRY',{id:entry.id}),entry,'search navigation cannot rewrite body, provenance or revision');
 return {matchedTopics:1,hits:5,entryTargets:2,sectionTargets:2,keyboard:true,backIdentity:true,mask:true,slotStable:true};
}
async function deepRootHistory(p){
 const tile=p.locator('.personal-topic-block[data-root-slot="100"]'),title=tile.locator('.personal-topic-link');
 await tile.evaluate(node=>scrollBy(0,node.getBoundingClientRect().top-240));
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await title.evaluate(node=>node.focus({preventScroll:true}));
 const before=await tile.evaluate(node=>({id:node.dataset.topicId,slot:node.dataset.rootSlot,top:node.getBoundingClientRect().top,scroll:scrollY}));
 assert.ok(before.scroll>3000,'history starts deep in the real 144-Topic extent');
 assert.ok(before.top>=120&&before.top<500,'the selected identity has a visible viewport-relative anchor');
 const topicReady=()=>p.waitForFunction(id=>history.state?.paiaReader?.topicId===id&&document.querySelector('.workspace')?.dataset.state==='ready'&&!document.querySelector('.workspace').inert,before.id);
 const rootReturned=async()=>{
  await eventually(async()=>await p.evaluate(()=>history.state?.paiaReader?.view==='thoughts'&&!history.state?.paiaReader?.topicId&&!document.querySelector('.workspace').inert)&&await tile.isVisible()&&await title.evaluate(node=>document.activeElement===node),'Back restores the deep Topic identity and native link focus');
  await eventually(()=>tile.evaluate((node,top)=>Math.abs(node.getBoundingClientRect().top-top)<=2,before.top),'Back restores the same Topic viewport-relative position');
  const after=await tile.evaluate(node=>({id:node.dataset.topicId,slot:node.dataset.rootSlot,top:node.getBoundingClientRect().top}));
  assert.equal(after.id,before.id);assert.equal(after.slot,before.slot);assert.ok(Math.abs(after.top-before.top)<=2,'identity-relative Back never substitutes the top of Root or a stale document offset');
 };
 await p.keyboard.press('Enter');await topicReady();await p.goBack();await rootReturned();
 await p.goForward();await topicReady();await p.goBack();await rootReturned();
 return {topicId:before.id,slot:before.slot,viewportTop:before.top,back:true,forward:true,secondBack:true};
}
async function traceSelection(target){
 await target.evaluate(node=>{
  globalThis.__rootSelectionTrace=[];globalThis.__rootSelectionTraceAbort?.abort();const controller=new AbortController();globalThis.__rootSelectionTraceAbort=controller;
  const sample=event=>{if(__rootSelectionTrace.length>=100)return;const selected=getSelection(),rect=node.getBoundingClientRect(),hit=Number.isFinite(event.clientX)?document.elementFromPoint(event.clientX,event.clientY):null;__rootSelectionTrace.push({type:event.type,at:performance.now(),trusted:event.isTrusted===true,prevented:event.defaultPrevented,buttons:event.buttons,x:event.clientX,y:event.clientY,target:event.target?.tagName,targetClass:typeof event.target?.className==='string'?event.target.className:null,hit:hit?.tagName,hitTopic:hit?.closest('[data-topic-id]')?.dataset.topicId,selected:selected?.toString().length||0,anchorInTitle:node.contains(selected?.anchorNode),focusInTitle:node.contains(selected?.focusNode),connected:node.isConnected,inert:!!node.closest('[inert]'),documentFocused:document.hasFocus(),visibility:document.visibilityState,draggable:node.draggable,userSelect:getComputedStyle(node).userSelect,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}});};
  for(const type of ['pointerdown','mousedown','selectstart','dragstart','mousemove','mouseup','click','selectionchange'])document.addEventListener(type,sample,{signal:controller.signal});sample({type:'before-drag',target:node});
 });
}
for(const variant of ['source','release'])test('TOPIC-05.2 actual Root renders real durable Section overview and stable144 Topic slots '+variant,{timeout:180000},async()=>{
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:resolve(variant==='release'?'work/current-release':'.')}),p=h.archive,output='work/qa-topic05-root/'+variant;await mkdir(output,{recursive:true});
 try{
  await p.setViewportSize({width:1440,height:1000});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const topics=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),items=[];
   for(let i=0;i<30;i++){
    const a=await s.createTopic({name:`SYNTHETIC ${String(i).padStart(3,'0')} 个人主题`,operationId:crypto.randomUUID()}),sections=[];
    for(let j=0;j<i%6;j++){const section=await s.createSection({topicId:a.id,expectedTopicRevision:(await s.topic(a.id)).organizationRevision,title:j===2?'中文 Mixed 👩🏽‍💻 é 很长的分区名称 / '.repeat(5):`SYNTHETIC 分区 ${j}`,operationId:crypto.randomUUID()});sections.push(section.sectionId);}
    items.push({...a,sections});
   }return items;
  });
  await thoughtPrimary(p,'thoughts');await rootReady(p,30);assert.equal(await p.locator('.personal-topic-block .summary,.personal-topic-block small,.personal-topic-block details').count(),0);
  assert.equal(await p.locator('#thought-root-source > button').isVisible(),true,'existing Add Thought remains reachable');assert.equal(await p.locator('#thought-root-source > .library-actions > summary').isVisible(),true,'existing overflow remains reachable');
  assert.equal(await p.locator('#thought-list').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),4,'wide workspace reaches four columns');
  const titleOnly=p.locator(`.personal-topic-block[data-topic-id="${topics[0].id}"]`);assert.equal(await titleOnly.locator('.personal-section-link').count(),0);assert.equal(await titleOnly.locator('.personal-topic-link').getAttribute('href').then(x=>x.includes('paia-thought?topic=')),true);
  await p.screenshot({path:output+'/30-wide.png',fullPage:true});
  for(const count of [50,100,144]){
   const extra=await p.evaluate(async({from,to})=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),out=[];for(let i=from;i<to;i++)out.push(await s.createTopic({name:`SYNTHETIC ${String(i).padStart(3,'0')} 个人主题`,operationId:crypto.randomUUID()}));return out;},{from:topics.length,to:count});topics.push(...extra);
   await p.reload();await rootReady(p,count);await p.screenshot({path:`${output}/${count}-wide.png`,fullPage:true});
  }
  await p.reload();await eventually(()=>p.locator('.personal-topic-block').count().then(n=>n===144),'remembered extent hydrates without scrolling through blank reserved slots',30000);
  await rootReady(p,144);
  await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topics[0].id,operationId:crypto.randomUUID(),body:'SYNTHETIC PRIVATE_ROOT_NEEDLE'}});await rootReady(p,144);await p.locator('#thought-search').fill('PRIVATE_ROOT_NEEDLE');
  const preview=p.locator('.personal-entry-preview').filter({hasText:'SYNTHETIC PRIVATE_ROOT_NEEDLE'});await preview.waitFor();await rpc(p,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:true}});await eventually(()=>preview.isHidden(),'existing privacy choice masks the actual Root search body');assert.equal(await p.locator('.personal-entry-mask-label').first().isVisible(),true);assert.equal(await titleOnly.locator('.personal-topic-link').isVisible(),true,'organization labels stay readable');assert.equal(await preview.evaluate(node=>[node,node.parentElement].some(el=>el.getAttribute('title')?.includes('PRIVATE_ROOT_NEEDLE')||el.getAttribute('aria-label')?.includes('PRIVATE_ROOT_NEEDLE'))),false,'body is never copied into masking-bypass attributes');await rpc(p,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:false}});await eventually(()=>preview.isVisible(),'explicitly restoring previews exposes the same current match');await p.locator('#thought-search').fill('');await rootReady(p,144);
  const multipleMatches=await multipleHitSearch(p,topics[5]);
  const sectionLink=p.locator(`.personal-topic-block[data-topic-id="${topics[1].id}"] .personal-section-link:not([hidden])`).first(),sectionHref=await sectionLink.getAttribute('href'),sectionTitle=await sectionLink.textContent();
  await sectionLink.focus();await p.keyboard.press('Enter');await assertSectionTarget(p,topics[1].id,topics[1].sections[0],sectionTitle);
  await p.goBack();await eventually(()=>p.locator('.personal-topic-block').count().then(n=>n===144),'Back returns complete Root');await eventually(()=>p.evaluate(id=>document.activeElement?.dataset.sectionId===id,topics[1].sections[0]),'Back restores the activated Section link focus');
  const linked=await h.context.newPage();await linked.goto(sectionHref);await linked.bringToFront();await assertSectionTarget(linked,topics[1].id,topics[1].sections[0],sectionTitle);await linked.reload();await assertSectionTarget(linked,topics[1].id,topics[1].sections[0],sectionTitle);await linked.close();await p.bringToFront();
  const first=p.locator(`.personal-topic-block[data-topic-id="${topics[0].id}"] .personal-topic-link`);await first.scrollIntoViewIfNeeded();await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const r=await first.boundingBox();assert.ok(r&&r.y>=0&&r.y+r.height<=await p.evaluate(()=>innerHeight),'native selection target is wholly inside the current viewport');await traceSelection(first);assert.equal(await first.evaluate(node=>getComputedStyle(node).userSelect),'text','native title has an explicit selectable text subtree');await p.mouse.move(r.x+5,r.y+12);await p.mouse.down();await p.mouse.move(r.x+Math.min(r.width-8,150),r.y+12,{steps:12});await p.mouse.up();assert.equal(await p.locator('#thought-document').isVisible(),false,'selection does not activate the Topic');const selection=await p.evaluate(()=>getSelection().toString());await writeFile(output+'/selection.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,trace:await p.evaluate(()=>globalThis.__rootSelectionTrace||[])}));assert.ok(selection.length>0);assert.equal(await first.evaluate(node=>{const selected=getSelection();return node.contains(selected.anchorNode)&&node.contains(selected.focusNode);}),true,'native drag selects only the intended Topic title');
  const sectionOwner=await rpc(p,'GET_LIBRARY_TOPIC_SECTIONS',{options:{topicId:topics[3].id}}),edited=sectionOwner.items.find(x=>x.sectionId===topics[3].sections[0]);await rpc(p,'EDIT_LIBRARY_SECTION',{edit:{topicId:topics[3].id,sectionId:edited.sectionId,expectedRevision:edited.revision,title:'SYNTHETIC changed unrelated Section',operationId:crypto.randomUUID()}});await eventually(()=>p.locator(`.personal-topic-block[data-topic-id="${topics[3].id}"]`).textContent().then(x=>x.includes('changed unrelated')),'unrelated Section refresh settles while a single native title selection remains pinned');assert.equal(await p.evaluate(()=>getSelection().toString()),selection,'unrelated metadata update preserves the native selection');
  const beforeResize=await first.evaluate(node=>{globalThis.__rootResizeSelectedTitle=node;return {scroll:scrollY,columns:getComputedStyle(document.getElementById('thought-list')).gridTemplateColumns.split(' ').length,width:document.getElementById('thought-list').clientWidth,slots:[...document.querySelectorAll('.personal-topic-block')].map(row=>[row.dataset.topicId,row.dataset.rootSlot])};});
  await p.setViewportSize({width:1420,height:1000});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const afterResize=await first.evaluate(node=>({sameNode:node===globalThis.__rootResizeSelectedTitle,scroll:scrollY,columns:getComputedStyle(document.getElementById('thought-list')).gridTemplateColumns.split(' ').length,width:document.getElementById('thought-list').clientWidth,selection:getSelection().toString(),endpoints:node.contains(getSelection().anchorNode)&&node.contains(getSelection().focusNode),slots:[...document.querySelectorAll('.personal-topic-block')].map(row=>[row.dataset.topicId,row.dataset.rootSlot])}));
  assert.notEqual(afterResize.width,beforeResize.width,'actual available Root width changed');assert.equal(afterResize.columns,beforeResize.columns,'resize exercises the same-column path');assert.equal(afterResize.sameNode,true);assert.equal(afterResize.selection,selection);assert.equal(afterResize.endpoints,true);assert.ok(Math.abs(afterResize.scroll-beforeResize.scroll)<=2,'same-column layout preserves scroll');assert.deepEqual(afterResize.slots,beforeResize.slots);
  await p.setViewportSize({width:1440,height:1000});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await p.evaluate(()=>getSelection().toString()),selection,'returning width keeps the original native selection');await p.evaluate(()=>{getSelection().removeAllRanges();delete globalThis.__rootResizeSelectedTitle;});
  await p.locator('#thought-search').focus();await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'A');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement.id),'thought-search');
  const boxes=()=>p.locator('.personal-topic-block').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>{const r=node.getBoundingClientRect();return [node.dataset.topicId,{slot:node.dataset.rootSlot,x:r.x,y:r.y+scrollY,width:r.width,height:r.height}];}))),before=await boxes(),target=topics[4],current=await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id});
  await rpc(p,'EDIT_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:current.revision,changes:{name:'SYNTHETIC renamed 中文'},operationId:crypto.randomUUID()}});await eventually(()=>p.locator(`.personal-topic-block[data-topic-id="${target.id}"] h2`).textContent().then(x=>x==='SYNTHETIC renamed 中文'));await rootReady(p,144);
  const renamed=await boxes();for(const id of Object.keys(before))assert.deepEqual(renamed[id],before[id],'rename preserves every address and footprint');
  const live=await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id});await rpc(p,'REMOVE_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:live.revision,operationId:crypto.randomUUID()}});await rootReady(p,143);const removed=await boxes();assert.equal(removed[target.id],undefined);for(const id of Object.keys(removed))assert.deepEqual(removed[id],before[id],'remove leaves a blank address');
  const removedOwner=(await rpc(p,'GET_LIBRARY_REMOVED_TOPICS')).items.find(row=>row.id===target.id);assert.ok(removedOwner,'the same removed Topic is recoverable through its existing owner');
  await rpc(p,'RESTORE_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:removedOwner.revision,operationId:crypto.randomUUID()}});await rootReady(p,144);
  const restored=await boxes();assert.deepEqual(restored,before,'restoring the same identity recovers its vacant address without moving any peer');assert.equal((await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id})).name,'SYNTHETIC renamed 中文','restore preserves the human rename');
  const restoredOwner=await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id});await rpc(p,'REMOVE_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:restoredOwner.revision,operationId:crypto.randomUUID()}});await rootReady(p,143);
  const added=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC new identity in hole',operationId:crypto.randomUUID()}});await rootReady(p,144);assert.equal((await boxes())[added.id].slot,before[target.id].slot);
  const wide=await boxes();for(const width of [1024,768,390,320,1440]){await p.setViewportSize({width,height:1000});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2);const actual=await p.locator('#thought-list').evaluate(node=>({columns:getComputedStyle(node).gridTemplateColumns.split(' ').length,width:node.clientWidth}));assert.equal(actual.columns,Math.max(1,Math.min(4,Math.floor((actual.width+16)/240))));await p.screenshot({path:`${output}/144-${width}.png`,fullPage:width===1440});}assert.deepEqual(await boxes(),wide,'return to viewport restores addresses');
  const deepHistory=await deepRootHistory(p);
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__rootRestore=()=>chrome.runtime.sendMessage=send;chrome.runtime.sendMessage=(message,...args)=>message.type==='GET_LIBRARY_ROOT_PROJECTION'?Promise.resolve({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'}):send(message,...args);});await thoughtPrimary(p,'thoughts');await eventually(()=>p.locator('#library-read-retry').isVisible(),'outage exposes retry');assert.equal(await p.locator('.personal-topic-block').count(),144,'ordinary read failure retains current blocks');await p.evaluate(()=>__rootRestore());await p.locator('#library-read-retry').click();await rootReady(p,144);
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  await writeFile(output+'/result.json',JSON.stringify({status:'PASS',head:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,actualCounts:[30,50,100,144],renameStable:true,deleteBlank:true,newIdentityReusesHole:true,responsiveReturn:true,deleteRestore:true,deepHistory,multipleMatches,activeSearchSameColumnResize:true,nativeSection:true,newTabRefresh:true,backFocus:true,selection:true,sameColumnResize:true,outageRetry:true}));
 }catch(error){await writeFile(output+'/failure.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,error:String(error),stack:error.stack,state:await p.evaluate(()=>({scrollY,viewport:{width:innerWidth,height:innerHeight},selectionLength:getSelection()?.toString().length||0,selectionTrace:globalThis.__rootSelectionTrace||[],search:document.getElementById('thought-search')?.value,status:document.getElementById('thought-continuous-status')?.textContent,history:history.state?.paiaReader}))})).catch(()=>{});await p.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await h.close();}
});
