import {centerRootSelectionTarget,rootSelectionTargetIsInterior} from './harness/root-selection-viewport.mjs';
import {qualifyRootViewport} from './harness/root-viewport-readiness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp,rm,cp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {runWithPreDispatchReadRetry} from './harness/pre-dispatch-read-retry.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
// Fixture-only acquisition: never replay an initialized callback or whole mutation.
async function seedRootTopics(s,preDispatch,{from,to,sections=false},events){
 const originalRun=s.run;let stage='initialize',failure=null,call=0;
 const add=event=>{events.push(event);if(events.length>128)events.shift();return event;};
 try{
  const initialized=add({stage,call:++call,attempt:1,entered:false});
  try{await originalRun.call(s,()=>{initialized.entered=true;});}catch(error){initialized.code=typeof error?.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'UNKNOWN';throw error;}
  if(!s.loaded)throw Error('Fixture store initialization did not complete');
  s.run=callback=>{const identity=++call;let attempt=0;return preDispatch(work=>{const event=add({stage,call:identity,attempt:++attempt,entered:false,initialized:s.loaded===true});return originalRun.call(s,()=>{event.entered=true;return work();}).catch(error=>{event.code=typeof error?.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'UNKNOWN';throw error;});},callback);};
  stage='foundation';await s.finishFoundation();const items=[];
  for(let i=from;i<to;i++){
   stage='create-topic-'+i;const a=await s.createTopic({name:`SYNTHETIC ${String(i).padStart(3,'0')} 个人主题`,operationId:crypto.randomUUID()}),ids=[];
   if(sections)for(let j=0;j<i%6;j++){stage='read-topic-'+i+'-'+j;const topic=await s.topic(a.id);stage='create-section-'+i+'-'+j;const section=await s.createSection({topicId:a.id,expectedTopicRevision:topic.organizationRevision,title:j===2?'中文 Mixed 👩🏽‍💻 é 很长的分区名称 / '.repeat(5):`SYNTHETIC 分区 ${j}`,operationId:crypto.randomUUID()});ids.push(section.sectionId);}
   items.push(sections?{...a,sections:ids}:a);
  }return items;
 }catch(error){failure=error;throw error;}finally{s.run=originalRun;try{await s.repository.close();}catch(error){add({stage:'close',name:error?.name||'Error'});if(!failure)throw error;}}
}
async function rootFixture(p,range){
 return p.evaluate('(async()=>{const {OrganizerStore}=await import("../core/organizer/store.js"),s=new OrganizerStore(chrome.storage.local);globalThis.__rootFixtureAcquisitions=[];return ('+seedRootTopics.toString()+')(s,('+runWithPreDispatchReadRetry.toString()+'),'+JSON.stringify(range)+',__rootFixtureAcquisitions);})()');
}
async function rootTypography(p,width){
 const selectors={topic:'.personal-topic-block .personal-topic-link',section:'.personal-topic-block .personal-section-link:not([hidden])'};
 const client=await p.context().newCDPSession(p);
 try{
  await client.send('DOM.enable');await client.send('CSS.enable');
  const {root}=await client.send('DOM.getDocument');const roles={};
  for(const [role,selector]of Object.entries(selectors)){
   const node=p.locator(selector).first();assert.ok(await node.count(),role+' typography owner exists');
   const computed=await node.evaluate(el=>{const c=getComputedStyle(el),r=el.getBoundingClientRect();return {text:el.textContent,topicId:el.closest('[data-topic-id]').dataset.topicId,sectionId:el.dataset.sectionId||null,width:r.width,height:r.height,...Object.fromEntries(['fontFamily','fontSize','lineHeight','fontWeight','fontSynthesis','letterSpacing','overflowWrap'].map(key=>[key,c[key]]))};});
   const {nodeId}=await client.send('DOM.querySelector',{nodeId:root.nodeId,selector});assert.ok(nodeId);
   const {fonts}=await client.send('CSS.getPlatformFontsForNode',{nodeId});
   assert.ok(fonts.some(font=>font.glyphCount>0),role+' reports actual rendered glyph fonts');
   assert.ok(parseFloat(computed.fontSize)>0&&parseFloat(computed.lineHeight)>0);
   roles[role]={...computed,platformFonts:fonts};
  }
  return {width,browserVersion:p.context().browser().version(),roles};
 }finally{await client.detach();}
}
// Current Root completion is metadata completion, never a retired preview state.
function rootViewportSettled(){
 const owner=globalThis.__rootReadOwner,collection=document.getElementById('thought-collection');
 return !!collection&&!owner?.refreshRun&&!owner?.readFailed&&!owner?.homeCollection?.loading&&!owner?.homeCollection?.hydration&&collection.getAttribute('aria-busy')!=='true'&&document.getElementById('library-read-retry')?.hidden!==false&&!document.querySelector('#thought-search,.personal-topic-preview,.personal-entry-preview');
}
async function rootReady(p,count){
 await p.evaluate(async()=>{if(globalThis.__rootReadProbe)return;globalThis.__rootReadProbe=[];const {ThoughtWorkspace}=await import('./thoughts.js'),original=ThoughtWorkspace.prototype.loadHomeNext;ThoughtWorkspace.prototype.loadHomeNext=async function(...args){globalThis.__rootReadOwner=this;const row={loading:this.homeCollection?.loading,hydrating:!!this.homeCollection?.hydration,items:this.homeCollection?.items?.length,cursor:!!this.homeCollection?.cursor};__rootReadProbe.push(row);if(__rootReadProbe.length>20)__rootReadProbe.shift();try{return await original.apply(this,args);}finally{row.after={loading:this.homeCollection?.loading,hydrating:!!this.homeCollection?.hydration,items:this.homeCollection?.items?.length,cursor:!!this.homeCollection?.cursor,terminal:this.homeCollection?.terminal};}};});
 await eventually(async()=>{
  const loaded=await p.locator('.personal-topic-block').count(),terminal=await p.locator('#thought-continuous-sentinel').getAttribute('data-terminal')==='true';if(loaded<count||!terminal)await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  return loaded===count&&terminal;
 },`all ${count} Personal Topics reach a real end`,30000);
 await p.waitForFunction(()=>history.state?.paiaReader?.view==='thoughts'&&!history.state?.paiaReader?.topicId&&!document.querySelector('.workspace').inert);
 await p.evaluate(()=>{const owner=globalThis.__rootReadOwner?.personalRoot?.previews;if(owner&&!owner.__geometryProbe){owner.__geometryProbe=true;const release=owner.release;owner.release=function(node,options){const p=node?.querySelector('.personal-topic-preview'),before=p?.getBoundingClientRect().height||0,min=p?.style.minHeight;const out=release.call(this,node,options),after=p?.getBoundingClientRect().height||0;if(before>after){const trace=globalThis.__previewGeometryTrace??=[];trace.push({slot:node.dataset.rootSlot,before,after,min,afterMin:p.style.minHeight,reserve:options?.reserve===true,visible:this.visible(node),awaitingMetadata:!!this.awaitingMetadata,stack:new Error().stack.split('\n').slice(2,5)});if(trace.length>40)trace.shift();}return out;};}scrollTo(0,0);});
 await p.evaluate(qualifyRootViewport);
 await eventually(()=>p.evaluate(rootViewportSettled),'current metadata directory settles before Root geometry measurement');
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
// The continuous reader owns real Section nodes; the prior temporary Root
// anchor is intentionally absent. Assert the exact durable target and focus.
async function assertSectionTarget(p,topicId,sectionId,title){
 const node=p.locator(`#topic-body .topic-section[data-section-id="${sectionId}"]`),directory=p.locator(`.topic-section-directory button[data-section-id="${sectionId}"]`);
 await node.waitFor({state:'visible'});assert.equal(await node.count(),1,'one canonical Section target');
 assert.equal(await directory.textContent(),title,'the exact named Section is identified by its real directory');
 assert.equal(await directory.getAttribute('aria-current'),'true','the same canonical Section is selected');
 assert.equal(await node.locator(':scope > .section-heading,:scope > h2').count(),0,'selected prose has no repeated Section headline');
 await eventually(()=>node.evaluate(el=>document.activeElement===el),'Section navigation completes at its own canonical host');
 assert.equal(await p.evaluate(()=>history.state?.paiaReader?.topicId),topicId,'the Section belongs to the intended Topic');
 assert.equal(await node.evaluate(el=>document.activeElement===el),true,'the canonical Section host owns focus');
}
async function multipleHitDirectory(p,topic,output){
 const needle='SYNTHETIC_MULTI_ROOT_NEEDLE',current=await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id});
 await rpc(p,'EDIT_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:current.revision,changes:{name:needle+' Topic'},operationId:crypto.randomUUID()}});
 const sections=(await rpc(p,'GET_LIBRARY_TOPIC_SECTIONS',{options:{topicId:topic.id,limit:100}})).items,targets=[topic.sections[0],topic.sections.at(-1)],entries=[];
 for(let i=0;i<targets.length;i++){
  const section=sections.find(row=>row.sectionId===targets[i]);await rpc(p,'EDIT_LIBRARY_SECTION',{edit:{topicId:topic.id,sectionId:section.sectionId,expectedRevision:section.revision,title:needle+' Section '+i,operationId:crypto.randomUUID()}});
  const entry=await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topic.id,body:needle+' '+(i?'BETA':'ALPHA')+' exact independent expression',operationId:crypto.randomUUID()}}),path=(await rpc(p,'GET_LIBRARY_PATHS',{id:entry.id})).find(row=>row.topicId===topic.id),owner=await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id});
  await rpc(p,'PLACE_LIBRARY_ENTRY',{placement:{topicId:topic.id,sectionId:section.sectionId,entryId:entry.id,expectedEntryRevision:entry.revision,expectedPlacementRevision:path.placement.revision,expectedTopicRevision:owner.organizationRevision,operationId:crypto.randomUUID()}});entries.push(await rpc(p,'GET_LIBRARY_ENTRY',{id:entry.id}));
 }
 await rootReady(p,144);const tile=p.locator(`.personal-topic-block[data-topic-id="${topic.id}"]`),footprint=()=>tile.evaluate(node=>{const r=node.getBoundingClientRect();return [node.dataset.rootSlot,r.x,r.y+scrollY,r.width,r.height];}),before=await footprint();
 assert.equal(await p.locator('#thought-search,.personal-root-search-extra,.personal-entry-preview,.personal-topic-preview').count(),0,'retired search/preview controls cannot return');
 let matches=[];await eventually(async()=>{matches=[];let cursor=null,authority;do{const page=await rpc(p,'GET_LIBRARY_ROOT_SEARCH',{options:{query:needle,limit:40,cursor,...(authority?{authority}:{})}});assert.notEqual(page.cursorInvalid,true);authority=page.authority;matches.push(...page.items);cursor=page.nextCursor;}while(cursor);return matches.filter(row=>(row.topicId||row.id)===topic.id||row.paths?.some(path=>path.topicId===topic.id)).length===5;},'the original shared search service still qualifies Topic, two Sections and two Entries');
 const hits=matches.filter(row=>(row.topicId||row.id)===topic.id||row.paths?.some(path=>path.topicId===topic.id));assert.deepEqual(hits.map(row=>row.kind).sort(),['entry','entry','section','section','topic']);assert.deepEqual(await footprint(),before,'a backend query cannot change directory geometry');
 const visited=[];
 for(const hit of hits){
  const path=hit.paths?.find(path=>path.topicId===topic.id),sectionId=hit.kind==='section'?(hit.sectionId||hit.id):path?.sectionId,entryId=hit.kind==='entry'?(hit.entryId||hit.id):null;visited.push({kind:hit.kind,sectionId,entryId});
  await tile.locator('.personal-topic-link').focus();await p.keyboard.press('Enter');await p.waitForFunction(id=>history.state?.paiaReader?.topicId===id&&!document.querySelector('.workspace').inert,topic.id);
  if(hit.kind!=='topic'){
   const control=p.locator(`.topic-section-directory button[data-section-id="${sectionId}"]`);await control.waitFor();await control.click();await assertSectionTarget(p,topic.id,sectionId,needle+' Section '+targets.indexOf(sectionId));
   if(entryId){const field=p.locator(`[data-entry-id="${entryId}"] [data-entry-field="body"]`);await field.waitFor();assert.equal(await field.textContent(),entries.find(row=>row.id===entryId).body);await field.click();assert.equal(await field.evaluate(node=>document.activeElement===node),true,'the actual selected Section exposes its exact canonical Entry');}
  }
  await p.locator('#back').click();await eventually(()=>tile.isVisible(),'Back restores the same Topic directory identity');assert.equal(await p.locator('#thought-search,.personal-root-search-extra,.personal-entry-preview').count(),0);assert.deepEqual(await footprint(),before,'directory return retains the original metadata slot');
 }
 assert.deepEqual(new Set(visited.filter(row=>row.kind==='entry').map(row=>row.entryId)),new Set(entries.map(row=>row.id)));assert.deepEqual(new Set(visited.filter(row=>row.kind==='section').map(row=>row.sectionId)),new Set(targets));
 await p.screenshot({path:output+'/qualified-directory-return.png'});for(const entry of entries)assert.deepEqual(await rpc(p,'GET_LIBRARY_ENTRY',{id:entry.id}),entry,'qualified query and directory navigation cannot rewrite canonical content');
 return {matchedTopics:1,backendHits:5,entryTargets:2,sectionTargets:2,keyboard:true,backIdentity:true,retiredSearchAbsent:true,slotStable:true};
}
async function deepRootHistory(p){
 const tile=p.locator('.personal-topic-block[data-root-slot="100"]'),title=tile.locator('.personal-topic-link');
 await tile.evaluate(node=>scrollBy(0,node.getBoundingClientRect().top-240));
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await title.evaluate(node=>node.focus({preventScroll:true}));
 const before=await tile.evaluate(node=>{const value={id:node.dataset.topicId,slot:node.dataset.rootSlot,top:node.getBoundingClientRect().top,scroll:scrollY};globalThis.__rootHistoryTrace=[{phase:'before',...value,anchor:globalThis.__rootReadOwner?.captureHomeAnchor()}];return value;});
 assert.ok(before.scroll>3000,'history starts deep in the real 144-Topic extent');
 assert.ok(before.top>=120&&before.top<500,'the selected identity has a visible viewport-relative anchor');
 const topicReady=()=>p.waitForFunction(id=>history.state?.paiaReader?.topicId===id&&document.querySelector('.workspace')?.dataset.state==='ready'&&!document.querySelector('.workspace').inert,before.id);
 const rootReturned=async()=>{
  await eventually(async()=>await p.evaluate(()=>history.state?.paiaReader?.view==='thoughts'&&!history.state?.paiaReader?.topicId&&!document.querySelector('.workspace').inert)&&await tile.isVisible()&&await title.evaluate(node=>document.activeElement===node),'Back restores the deep Topic identity and native link focus');
  await eventually(()=>tile.evaluate((node,top)=>{const actual=node.getBoundingClientRect().top,trace=globalThis.__rootHistoryTrace??=[];trace.push({phase:'returned',id:node.dataset.topicId,top:actual,expected:top,scroll:scrollY});if(trace.length>20)trace.splice(1,1);return Math.abs(actual-top)<=2;},before.top),'Back restores the same Topic viewport-relative position');
  const after=await tile.evaluate(node=>({id:node.dataset.topicId,slot:node.dataset.rootSlot,top:node.getBoundingClientRect().top}));
  assert.equal(after.id,before.id);assert.equal(after.slot,before.slot);assert.ok(Math.abs(after.top-before.top)<=2,'identity-relative Back never substitutes the top of Root or a stale document offset');
 };
 const traceDeparture=phase=>p.evaluate(phase=>{const owner=globalThis.__rootReadOwner,saved=owner?.homePositions?.get('home'),active=document.activeElement,trace=globalThis.__rootHistoryTrace??=[];trace.push({phase,scroll:scrollY,ownerId:owner?.id||null,nodes:owner?.personalRoot?.nodes?.size,activeTopic:active?.dataset.topicId||null,savedScroll:saved?.scroll,rootAnchor:saved?.rootAnchor||null});if(trace.length>30)trace.splice(1,1);},phase);
 await p.keyboard.press('Enter');await topicReady();await traceDeparture('before-first-back');await p.goBack();await rootReturned();
 await traceDeparture('before-forward');await p.goForward();await topicReady();await traceDeparture('before-second-back');await p.goBack();await rootReturned();
 return {topicId:before.id,slot:before.slot,viewportTop:before.top,back:true,forward:true,secondBack:true};
}
async function traceSelection(target){
 await target.evaluate(node=>{
  globalThis.__rootSelectionTrace=[];globalThis.__rootSelectionTraceAbort?.abort();const controller=new AbortController();globalThis.__rootSelectionTraceAbort=controller;
  const sample=event=>{if(__rootSelectionTrace.length>=100)return;const selected=getSelection(),rect=node.getBoundingClientRect(),hit=Number.isFinite(event.clientX)?document.elementFromPoint(event.clientX,event.clientY):null;__rootSelectionTrace.push({type:event.type,at:performance.now(),trusted:event.isTrusted===true,prevented:event.defaultPrevented,buttons:event.buttons,x:event.clientX,y:event.clientY,target:event.target?.tagName,targetClass:typeof event.target?.className==='string'?event.target.className:null,hit:hit?.tagName,hitTopic:hit?.closest('[data-topic-id]')?.dataset.topicId,selected:selected?.toString().length||0,scrollY,documentY:rect.top+scrollY,previewState:document.getElementById('thought-list')?.dataset.previewState,anchorInTitle:node.contains(selected?.anchorNode),focusInTitle:node.contains(selected?.focusNode),connected:node.isConnected,inert:!!node.closest('[inert]'),documentFocused:document.hasFocus(),visibility:document.visibilityState,draggable:node.draggable,userSelect:getComputedStyle(node).userSelect,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}});};
  for(const type of ['pointerdown','mousedown','selectstart','dragstart','mousemove','mouseup','click','selectionchange'])document.addEventListener(type,sample,{signal:controller.signal});sample({type:'before-drag',target:node});
 });
}
// Expose only the existing renderer from an isolated test copy. Calling the
// actual render owner reproduces a late unchanged-route render between focus
// and Enter; production files and the original Root journeys are untouched.
for(const variant of ['source','release'])test('TOPIC-05.2 unchanged Topic rendering retains keyboard Back focus '+variant,{timeout:60000},async()=>{
 const source=resolve('.'),dir=await mkdtemp(join(tmpdir(),'paia-root-back-focus-'));let h;
 try{
  if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',dir],{stdio:'pipe'});
  else await cp(source,dir,{recursive:true,filter:p=>!['node_modules','work','.git'].includes(p.slice(source.length+1).split('/')[0])});
  const module=join(dir,'ui/archive.js');await writeFile(module,(await readFile(module,'utf8'))+'\nexport {render as testActualRender};\n');
  h=await FakeChatGPT.start({extensionPath:dir});const p=h.archive;
  await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  await eventually(async()=>{const status=await rpc(p,'GET_STATUS');return status.consented===true&&status.enabled===true;},'consent publication is acknowledged before independent fixture mutation');
  const topic=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js');return new OrganizerStore(chrome.storage.local).createTopic({name:'SYNTHETIC keyboard Back',operationId:crypto.randomUUID()});});
  await thoughtPrimary(p,'thoughts');await p.locator('.personal-topic-link').first().click();
  await p.waitForFunction(id=>history.state?.paiaReader?.topicId===id&&document.querySelector('.workspace')?.dataset.state==='ready'&&!document.querySelector('.workspace').inert,topic.id);
  const focus=await p.evaluate(async()=>{const {testActualRender}=await import('./archive.js'),back=document.getElementById('back');back.focus({preventScroll:true});const before=document.activeElement===back;testActualRender();return {before,after:document.activeElement===back,hidden:back.hidden};});
  assert.deepEqual(focus,{before:true,after:true,hidden:false},'same-route render cannot transiently hide the focused Back button');
  await p.keyboard.press('Enter');await eventually(()=>p.evaluate(()=>!history.state?.paiaReader?.topicId),'one actual keyboard activation returns to Root');
  assert.equal(await p.locator('#back').isHidden(),true,'Root still has no Topic Back action');
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
for(const variant of ['source','release'])test('TOPIC-05.2 actual Root renders real durable Section overview and stable144 Topic slots '+variant,{timeout:180000},async()=>{
 const release=variant==='release'?await mkdtemp(join(tmpdir(),'paia-root-section-')):null;
 if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release||resolve('.')}),p=h.archive,output='work/qa-topic05-root/'+variant;await mkdir(output,{recursive:true});let failure=null;
 try{
  await p.setViewportSize({width:1440,height:1000});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  await eventually(async()=>{const status=await rpc(p,'GET_STATUS');return status.consented===true&&status.enabled===true;},'consent is durably acknowledged before independent Root setup');
  const topics=await rootFixture(p,{from:0,to:30,sections:true});
  await thoughtPrimary(p,'thoughts');await rootReady(p,30);assert.equal(await p.locator('.personal-topic-block .summary,.personal-topic-block small,.personal-topic-block details').count(),0);
  const rootActions=p.locator('#thought-home-tools .thought-root-actions');assert.equal(await p.locator('#thought-search').count(),0,'Root app search is retired');assert.equal(await rootActions.getByRole('button',{name:/^(写下想法|Write a thought)$/}).isVisible(),true,'the existing independent Entry writer remains reachable');assert.equal(await rootActions.locator('.library-actions > summary').isVisible(),true,'existing overflow remains reachable');assert.equal(await rootActions.getByRole('button',{name:/^(新建主题|New topic|Create topic)$/i}).count(),0,'no generic New Topic launcher returns');for(const control of await rootActions.locator(':scope > button,.library-actions > summary').all())assert.equal(await control.evaluate(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>=36&&node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'each retained Entry action owns a native hit target');
  assert.equal(await p.locator('#thought-list').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),3,'approved wide workspace uses three columns');
  const titleOnly=p.locator(`.personal-topic-block[data-topic-id="${topics[0].id}"]`);assert.equal(await titleOnly.locator('.personal-section-link').count(),0);assert.equal(await titleOnly.locator('.personal-topic-link').getAttribute('href').then(x=>x.includes('paia-thought?topic=')),true);
  await p.screenshot({path:output+'/30-wide.png',fullPage:true});
  for(const count of [50,100,144]){
   const extra=await rootFixture(p,{from:topics.length,to:count});topics.push(...extra);
   await p.reload();await rootReady(p,count);await p.screenshot({path:`${output}/${count}-wide.png`,fullPage:true});
  }
  await p.reload();await eventually(()=>p.locator('.personal-topic-block').count().then(n=>n===144),'remembered extent hydrates without scrolling through blank reserved slots',30000);
  await rootReady(p,144);
  const privateEntry=await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topics[0].id,operationId:crypto.randomUUID(),body:'SYNTHETIC PRIVATE_ROOT_NEEDLE'}});await rootReady(p,144);
  const privateTile=p.locator(`.personal-topic-block[data-topic-id="${topics[0].id}"]`);await privateTile.scrollIntoViewIfNeeded();
  assert.equal(await p.locator('.personal-topic-preview,.personal-entry-preview,#thought-search').count(),0,'normal Root contains no unsolicited preview or search');assert.equal((await privateTile.textContent()).includes('PRIVATE_ROOT_NEEDLE'),false);assert.equal(await privateTile.evaluate(node=>[node,...node.querySelectorAll('[title],[aria-label]')].some(el=>/PRIVATE_ROOT_NEEDLE/.test((el.getAttribute('title')||'')+' '+(el.getAttribute('aria-label')||'')))),false,'private body never enters masking-bypass attributes');
  for(const hideContentPreviews of [true,false]){await rpc(p,'UPDATE_PREFERENCES',{changes:{hideContentPreviews}});assert.equal(await p.locator('.personal-topic-preview,.personal-entry-preview').count(),0,'retired previews remain absent under both saved choices');}
  await privateTile.locator('.personal-topic-link').click();const privateField=p.locator(`[data-entry-id="${privateEntry.id}"] [data-entry-field="body"]`);await privateField.waitFor();assert.equal(await privateField.textContent(),'SYNTHETIC PRIVATE_ROOT_NEEDLE','explicit canonical reading still exposes the exact saved body');await p.goBack();await rootReady(p,144);
  const multipleMatches=await multipleHitDirectory(p,topics[5],output);
  const sectionLink=p.locator(`.personal-topic-block[data-topic-id="${topics[1].id}"] .personal-section-link:not([hidden])`).first(),sectionHref=await sectionLink.getAttribute('href'),sectionTitle=await sectionLink.textContent();
  await sectionLink.focus();await p.keyboard.press('Enter');await assertSectionTarget(p,topics[1].id,topics[1].sections[0],sectionTitle);
  await p.goBack();await eventually(()=>p.locator('.personal-topic-block').count().then(n=>n===144),'Back returns complete Root');await eventually(()=>p.evaluate(id=>document.activeElement?.dataset.sectionId===id,topics[1].sections[0]),'Back restores the activated Section link focus');
  const linked=await h.context.newPage();await linked.goto(sectionHref);await linked.bringToFront();await assertSectionTarget(linked,topics[1].id,topics[1].sections[0],sectionTitle);await linked.reload();await assertSectionTarget(linked,topics[1].id,topics[1].sections[0],sectionTitle);await linked.close();await p.bringToFront();
  const first=p.locator(`.personal-topic-block[data-topic-id="${topics[0].id}"] .personal-topic-link`);await first.evaluate(centerRootSelectionTarget);await p.evaluate(qualifyRootViewport);await eventually(()=>p.evaluate(rootViewportSettled),'selection viewport has the current qualified directory');await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await first.evaluate(rootSelectionTargetIsInterior),true,'native horizontal selection starts outside the browser edge-autoscroll band');const r=await first.boundingBox();assert.ok(r&&r.y>=0&&r.y+r.height<=await p.evaluate(()=>innerHeight),'native selection target is wholly inside the current viewport');await traceSelection(first);assert.equal(await first.evaluate(node=>getComputedStyle(node).userSelect),'text','native title has an explicit selectable text subtree');const glyph=await first.evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);const line=[...range.getClientRects()].find(rect=>rect.width>10&&rect.height>0);return line?{x:line.x,y:line.y,width:line.width,height:line.height}:null;});assert.ok(glyph&&glyph.width>10,'actual first rendered title line is selectable');await p.mouse.move(glyph.x+2,glyph.y+glyph.height/2);await p.mouse.down();await p.mouse.move(glyph.x+Math.min(glyph.width-2,150),glyph.y+glyph.height/2,{steps:12});await p.mouse.up();assert.equal(await p.locator('#thought-document').isVisible(),false,'selection does not activate the Topic');const selection=await p.evaluate(()=>getSelection().toString());await writeFile(output+'/selection.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,trace:await p.evaluate(()=>globalThis.__rootSelectionTrace||[])}));assert.ok(selection.length>0);assert.equal(await first.evaluate(node=>{const selected=getSelection();return node.contains(selected.anchorNode)&&node.contains(selected.focusNode);}),true,'native drag selects only the intended Topic title');
  const sectionOwner=await rpc(p,'GET_LIBRARY_TOPIC_SECTIONS',{options:{topicId:topics[3].id}}),edited=sectionOwner.items.find(x=>x.sectionId===topics[3].sections[0]);await rpc(p,'EDIT_LIBRARY_SECTION',{edit:{topicId:topics[3].id,sectionId:edited.sectionId,expectedRevision:edited.revision,title:'SYNTHETIC changed unrelated Section',operationId:crypto.randomUUID()}});await eventually(()=>p.locator(`.personal-topic-block[data-topic-id="${topics[3].id}"]`).textContent().then(x=>x.includes('changed unrelated')),'unrelated Section refresh settles while a single native title selection remains pinned');assert.equal(await p.evaluate(()=>getSelection().toString()),selection,'unrelated metadata update preserves the native selection');
  const beforeResize=await first.evaluate(node=>{globalThis.__rootResizeSelectedTitle=node;return {scroll:scrollY,columns:getComputedStyle(document.getElementById('thought-list')).gridTemplateColumns.split(' ').length,width:document.getElementById('thought-list').clientWidth,slots:[...document.querySelectorAll('.personal-topic-block')].map(row=>[row.dataset.topicId,row.dataset.rootSlot])};});
  // Both1440 and1420 retain the approved1060px workspace cap. Use a
  // genuinely narrower three-column workspace for this native-selection resize.
  await p.setViewportSize({width:1160,height:1000});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const afterResize=await first.evaluate(node=>({sameNode:node===globalThis.__rootResizeSelectedTitle,scroll:scrollY,columns:getComputedStyle(document.getElementById('thought-list')).gridTemplateColumns.split(' ').length,width:document.getElementById('thought-list').clientWidth,selection:getSelection().toString(),endpoints:node.contains(getSelection().anchorNode)&&node.contains(getSelection().focusNode),slots:[...document.querySelectorAll('.personal-topic-block')].map(row=>[row.dataset.topicId,row.dataset.rootSlot])}));
  await writeFile(output+'/same-column-resize.json',JSON.stringify({variant,before:beforeResize,after:afterResize}));
  assert.notEqual(afterResize.width,beforeResize.width,'actual available Root width changed');assert.equal(afterResize.columns,beforeResize.columns,'resize exercises the same-column path');assert.equal(afterResize.sameNode,true);assert.equal(afterResize.selection,selection);assert.equal(afterResize.endpoints,true);assert.ok(Math.abs(afterResize.scroll-beforeResize.scroll)<=2,'same-column layout preserves scroll');assert.deepEqual(afterResize.slots,beforeResize.slots);
  await p.setViewportSize({width:1440,height:1000});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await p.evaluate(()=>getSelection().toString()),selection,'returning width keeps the original native selection');await p.evaluate(()=>{getSelection().removeAllRanges();delete globalThis.__rootResizeSelectedTitle;});
  await first.focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'A');assert.equal(await p.evaluate(()=>document.getElementById('thought-list').contains(document.activeElement)),true);const keyboardFocus=await p.evaluate(()=>{globalThis.__rootDirectoryKeyboardTarget=document.activeElement;return true;});assert.equal(keyboardFocus,true);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement===__rootDirectoryKeyboardTarget),true,'no retired search shortcut takes directory focus');assert.equal(await p.locator('#thought-search').count(),0);
  await p.evaluate(qualifyRootViewport);await eventually(()=>p.evaluate(rootViewportSettled),'current metadata directory settles before rename geometry measurement');await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const boxes=()=>p.locator('.personal-topic-block').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>{const r=node.getBoundingClientRect();return [node.dataset.topicId,{slot:node.dataset.rootSlot,x:r.x,y:r.y+scrollY,width:r.width,height:r.height}];}))),before=await boxes(),target=topics[4],current=await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id});
  await rpc(p,'EDIT_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:current.revision,changes:{name:'SYNTHETIC renamed 中文'},operationId:crypto.randomUUID()}});await eventually(()=>p.locator(`.personal-topic-block[data-topic-id="${target.id}"] h2`).textContent().then(x=>x==='SYNTHETIC renamed 中文'));await rootReady(p,144);
  const renamed=await boxes();for(const id of Object.keys(before))assert.deepEqual(renamed[id],before[id],'rename preserves every address and footprint');
  // The metadata mutation journey keeps the surviving visible identity,
  // while every removed qualification is revoked before fresh reads.
  const survivor=p.locator(`.personal-topic-block[data-topic-id="${topics[0].id}"]`),survivorTitle=survivor.locator('.personal-topic-link');
  await survivor.evaluate(node=>scrollBy(0,node.getBoundingClientRect().top-240));await p.evaluate(qualifyRootViewport);await eventually(()=>p.evaluate(rootViewportSettled),'normal mutation metadata viewport is qualified');await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await survivorTitle.evaluate(node=>node.focus({preventScroll:true}));
  const survivorTop=await survivor.evaluate(node=>node.getBoundingClientRect().top);assert.equal(await survivor.locator('.personal-topic-preview,.personal-entry-preview').count(),0);assert.equal((await survivor.textContent()).includes('PRIVATE_ROOT_NEEDLE'),false);
  await p.evaluate(()=>{const root=__rootReadOwner.personalRoot,clear=root.clear;globalThis.__rootMutationReleases=[];globalThis.__restoreRootMutationClear=()=>{root.clear=clear;delete globalThis.__restoreRootMutationClear;};root.clear=function(...args){const nodes=[...this.nodes.values()],out=clear.apply(this,args);if(__rootMutationReleases.length<8)__rootMutationReleases.push({nodes:this.nodes.size,bodies:nodes.reduce((n,node)=>n+node.querySelectorAll('.personal-topic-preview button').length,0)});return out;};});
  try{
  const ordinary=await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id});await rpc(p,'REMOVE_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:ordinary.revision,operationId:crypto.randomUUID()}});
  const normalReady=async count=>{await eventually(async()=>await p.locator('.personal-topic-block').count()===count&&await p.evaluate(rootViewportSettled),'normal mutation current metadata directory settles');await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await eventually(()=>survivor.evaluate((node,top)=>Math.abs(node.getBoundingClientRect().top-top)<=2,survivorTop),'normal mutation preserves surviving identity viewport anchor');assert.equal(await survivorTitle.evaluate(node=>document.activeElement===node),true);};
  await normalReady(143);assert.ok((await p.evaluate(()=>__rootMutationReleases)).some(row=>row.nodes===0&&row.bodies===0),'real invalidation synchronously releases old nodes and bodies');
  const normalRemoved=(await rpc(p,'GET_LIBRARY_REMOVED_TOPICS')).items.find(row=>row.id===target.id);await rpc(p,'RESTORE_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:normalRemoved.revision,operationId:crypto.randomUUID()}});await normalReady(144);
  assert.equal(await survivor.locator('.personal-topic-preview,.personal-entry-preview').count(),0);assert.equal((await survivor.textContent()).includes('PRIVATE_ROOT_NEEDLE'),false);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:privateEntry.id})).body,'SYNTHETIC PRIVATE_ROOT_NEEDLE');
  const ordinaryBudget=await p.locator('#thought-list').evaluate(node=>({bodies:node.querySelectorAll('.personal-topic-preview button,.personal-entry-preview').length,chars:[...node.querySelectorAll('.personal-topic-preview button,.personal-entry-preview')].reduce((n,preview)=>n+preview.textContent.length,0),offscreen:[...node.querySelectorAll('.personal-topic-block')].filter(card=>{const r=card.getBoundingClientRect();return r.bottom<=0||r.top>=innerHeight;}).reduce((n,card)=>n+card.querySelectorAll('.personal-topic-preview button').length,0)}));assert.equal(await p.locator('.personal-topic-preview,.personal-entry-preview').count(),0);assert.equal(ordinaryBudget.bodies,0);assert.equal(ordinaryBudget.chars,0);assert.equal(ordinaryBudget.offscreen,0);
  const ordinaryColumns=new Map();for(const row of Object.values(await boxes())){const column=ordinaryColumns.get(row.x)||[];column.push(row);ordinaryColumns.set(row.x,column);}for(const column of ordinaryColumns.values()){column.sort((a,b)=>a.y-b.y);for(let i=1;i<column.length;i++)assert.ok(Math.abs(column[i].y-column[i-1].y-column[i-1].height-18)<=2,'ordinary restored flow has the retained UX section5 gutter and no permanent holes');}
  }finally{await p.evaluate(()=>globalThis.__restoreRootMutationClear?.());}
  // Compare the full directory under the same explicit body-free presentation.
  // Removed qualifications do not promise restoration of historically visited
  // offscreen preview shells; normal preview/anchor behavior is checked above.
  await rpc(p,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:true}});await rootReady(p,144);assert.equal(await p.locator('.personal-topic-preview button').count(),0);const structuralBefore=await boxes();
  const live=await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id});await rpc(p,'REMOVE_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:live.revision,operationId:crypto.randomUUID()}});await rootReady(p,143);const removed=await boxes();assert.equal(removed[target.id],undefined);
  // TL-PT1-UI-1.1 V2 supersedes permanent blank holes: keep identities and
  // deterministic order while each content-sized column closes its own gaps.
  for(const id of Object.keys(removed))assert.equal(removed[id].slot,structuralBefore[id].slot,'removal retains every surviving identity address');
  const columns=new Map();for(const box of Object.values(removed)){const key=Math.round(box.x),column=columns.get(key)||[];column.push(box);columns.set(key,column);}
  for(const column of columns.values()){column.sort((a,b)=>a.y-b.y);for(let index=1;index<column.length;index++)assert.ok(Math.abs(column[index].y-column[index-1].y-column[index-1].height-18)<=2,'content-sized column has only the retained UX section5 gutter, no permanent holes');}
  assert.ok(Object.keys(removed).some(id=>removed[id].x!==structuralBefore[id].x||removed[id].y!==structuralBefore[id].y),'committed removal actually closes the former gap');
  const removedOwner=(await rpc(p,'GET_LIBRARY_REMOVED_TOPICS')).items.find(row=>row.id===target.id);assert.ok(removedOwner,'the same removed Topic is recoverable through its existing owner');
  await rpc(p,'RESTORE_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:removedOwner.revision,operationId:crypto.randomUUID()}});await rootReady(p,144);
  const restored=await boxes();assert.deepEqual(restored,structuralBefore,'restoring the same identities restores deterministic content flow');assert.equal((await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id})).name,'SYNTHETIC renamed 中文','restore preserves the human rename');
  const restoredOwner=await rpc(p,'GET_LIBRARY_TOPIC',{id:target.id});await rpc(p,'REMOVE_LIBRARY_TOPIC',{edit:{id:target.id,expectedRevision:restoredOwner.revision,operationId:crypto.randomUUID()}});await rootReady(p,143);
  const added=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC new identity in hole',operationId:crypto.randomUUID()}});await rootReady(p,144);assert.equal((await boxes())[added.id].slot,structuralBefore[target.id].slot);
  const typography=[];const wide=await boxes();for(const width of [1024,768,390,320,1440]){await p.setViewportSize({width,height:1000});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2);const actual=await p.locator('#thought-list').evaluate(node=>({columns:getComputedStyle(node).gridTemplateColumns.split(' ').length,width:node.clientWidth}));assert.equal(actual.columns,Math.max(1,Math.min(3,Math.floor((actual.width+16)/240))));if(width===320||width===1440)typography.push(await rootTypography(p,width));await p.screenshot({path:`${output}/144-${width}.png`,fullPage:width===1440});}assert.deepEqual(await boxes(),wide,'return to viewport restores addresses');
  await writeFile(output+'/typography.json',JSON.stringify({variant,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),samples:typography},null,2));
  await rpc(p,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:false}});await rootReady(p,144);
  const deepHistory=await deepRootHistory(p);
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__rootRestore=()=>chrome.runtime.sendMessage=send;chrome.runtime.sendMessage=(message,...args)=>message.type==='GET_LIBRARY_ROOT_PROJECTION'?Promise.resolve({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'}):send(message,...args);});await p.evaluate(()=>globalThis.__rootReadOwner.refresh());await eventually(()=>p.locator('#library-read-retry').isVisible(),'ordinary refresh outage exposes retry');assert.equal(await p.locator('.personal-topic-block').count(),144,'ordinary read failure retains current blocks');await p.evaluate(()=>__rootRestore());await p.locator('#library-read-retry').click();await rootReady(p,144);
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  await writeFile(output+'/result.json',JSON.stringify({status:'PASS',head:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,actualCounts:[30,50,100,144],renameStable:true,deleteBlank:true,newIdentityReusesHole:true,responsiveReturn:true,deleteRestore:true,deepHistory,multipleMatches,directoryBackendTargets:true,retiredPreviewsAbsent:true,nativeSection:true,newTabRefresh:true,backFocus:true,selection:true,sameColumnResize:true,outageRetry:true}));
 }catch(error){failure=error;try{await writeFile(output+'/failure.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,error:String(error),stack:error.stack,state:await p.locator('html').evaluate(()=>({scrollY,viewport:{width:innerWidth,height:innerHeight},selectionLength:getSelection()?.toString().length||0,selectionTrace:globalThis.__rootSelectionTrace||[],fixtureAcquisitions:globalThis.__rootFixtureAcquisitions||[],historyTrace:globalThis.__rootHistoryTrace||[],geometryTrace:globalThis.__rootGeometryTrace||[],previewGeometryTrace:globalThis.__previewGeometryTrace||[],search:document.getElementById('thought-search')?.value,status:document.getElementById('thought-continuous-status')?.textContent,loaded:document.querySelectorAll('.personal-topic-block').length,readProbe:globalThis.__rootReadProbe,readOwner:globalThis.__rootReadOwner&&{items:__rootReadOwner.homeCollection?.items?.length,loading:__rootReadOwner.homeCollection?.loading,hydrating:!!__rootReadOwner.homeCollection?.hydration,cursor:!!__rootReadOwner.homeCollection?.cursor,terminal:__rootReadOwner.homeCollection?.terminal},terminal:document.getElementById('thought-continuous-sentinel')?.dataset.terminal,history:history.state?.paiaReader}),null,{timeout:1000})}));}catch(diagnostic){console.error('ROOT_FIXTURE_DIAGNOSTIC_UNAVAILABLE',diagnostic?.name||'Error');}await p.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});throw error;}finally{let cleanupError=null;try{await h.close();}catch(error){cleanupError=error;}try{if(release)await rm(release,{recursive:true,force:true});}catch(error){cleanupError||=error;}if(cleanupError){await writeFile(output+'/cleanup-failure.json',JSON.stringify({variant,name:cleanupError?.name||'Error',originalFailure:!!failure})).catch(()=>{});await rm(output+'/result.json',{force:true}).catch(()=>{});if(!failure)throw cleanupError;console.error('ROOT_FIXTURE_CLEANUP_FAILED',cleanupError?.name||'Error');}}
});
