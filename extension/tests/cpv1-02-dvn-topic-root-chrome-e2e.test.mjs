import {openD5ThoughtRoot,observeD5ThoughtRootScroll,verifyD5ThoughtRootTextZoom} from './harness/d5-thought-root.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
const release=mkdtempSync(join(tmpdir(),'paia-d2-root-'));
test.after(()=>rmSync(release,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',release],{encoding:'utf8'}));
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
const op=()=>crypto.randomUUID();
const blocks='#thought-list article.personal-topic-block';
const blockFor=(p,id)=>p.locator(`${blocks}[data-topic-id="${id}"]`);
const settleRoot=p=>eventually(()=>p.evaluate(()=>!!globalThis.__d5RootOwner&&!!__d5RootOwner.homeCollection&&!__d5RootOwner.homeRestoring&&!__d5RootOwner.homeWindowShifting&&!__d5RootOwner.homeCollection?.loading&&!__d5RootOwner.homeCollection?.hydration),'Root read and identity-anchor restoration settle');
const bodyFree=value=>assert.doesNotMatch(JSON.stringify(value),/"(?:body|thoughtText|summary|rootCue|snippet|recent)"|SYNTHETIC_DENSE_CUE/,'normal Root metadata never carries an Entry body, summary or excerpt');

for(const variant of ['source','release'])test(`D2 Personal Topic root preserves legacy service receipts, exact search excerpts and worker chronology (${variant})`,{timeout:120000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;let d5;
 try{
  await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const name='SYNTHETIC 长主题名称 '+('长期保留原话与不确定性 '.repeat(6)),query='D2_SEARCH_NEEDLE',body='  SYNTHETIC 我可能更适合消费产品，但现在样本还太少。👩‍💻 é\n'+query+' '+('不自动改写结论。'.repeat(30));
  const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name,operationId:op()}}),created=await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body,topicId:topic.id}});
  const original=await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id}),provenance=await rpc(p,'GET_LIBRARY_PROVENANCE',{id:created.id});
  const excerpt=await rpc(p,'ADD_TO_TOPICS',{selection:{operationId:op(),kind:'thought',id:created.id,expectedRevision:original.revision,span:{start:0,end:11},topicIds:[topic.id]}}),originalExcerpt=await rpc(p,'GET_LIBRARY_ENTRY',{id:excerpt.id});
  // Real durable Sections, including one mixed-script label that wraps under
  // text enlargement and more named Sections than the bounded Root overview.
  const sections=[];
  for(const title of ['中文 Mixed 👩🏽‍💻 é 保留完整的分区名称','SYNTHETIC 第二分区','SYNTHETIC 第三分区','SYNTHETIC 第四分区','SYNTHETIC 第五分区','SYNTHETIC 第六分区']){
   const current=await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id});sections.push(await rpc(p,'CREATE_LIBRARY_SECTION',{section:{topicId:topic.id,expectedTopicRevision:current.organizationRevision,title,operationId:op()}}));
  }
  await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local);await s.foundationWrite(t=>t.put('meta',{id:'thought-layout:v1',version:1,layout:'grid'}));await s.repository.close();});
  await p.reload();await observeD5ThoughtRootScroll(p);await thoughtPrimary(p,'thoughts');
  const row=blockFor(p,topic.id);await eventually(()=>row.count().then(n=>n===1));await settleRoot(p);
  // Existing stored preference migration remains a compatibility receipt. It
  // does not make the superseded compact list the current visual authority.
  assert.equal((await rpc(p,'GET_THOUGHT_LAYOUT')).layout,'list');
  const migration=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local);const value=await s.repository.transaction(false,t=>t.get('meta','thought-layout:v1'));await s.repository.close();return value;});
  assert.equal(migration.previousLayout,'grid');assert.equal(migration.migration,'desktop-vnext-compact');
  const legacy=await rpc(p,'LIBRARY_INDEX_PAGE',{options:{mode:'stable'}}),cue=legacy.items.find(x=>x.id===topic.id).rootCue;
  assert.equal(cue.text,body.slice(cue.range.start,cue.range.end));assert.equal(cue.entryId,created.id);
  const root=await rpc(p,'GET_LIBRARY_ROOT_PROJECTION',{options:{limit:40,sectionLimit:4}}),item=root.items.find(x=>x.id===topic.id);bodyFree(root);
  assert.deepEqual(item.sectionOverview.items.map(x=>x.id),sections.slice(0,4).map(x=>x.sectionId));assert.equal(item.sectionOverview.complete,false);
  assert.equal(await row.locator('.personal-topic-link').textContent(),name);assert.equal(await row.locator('.personal-topic-link').getAttribute('title'),name,'full stored title remains available');
  assert.deepEqual(await row.locator('.personal-section-link').evaluateAll(nodes=>nodes.map(node=>node.dataset.sectionId)),sections.slice(0,4).map(x=>x.sectionId));
  assert.equal(await row.locator('.summary,small,.personal-entry-preview').count(),0,'normal blocks contain no default excerpt, recency or count');assert.equal(await p.locator('.topic-compact-row,.topic-index-row,.topic-grid,.topic-tile').count(),0,'superseded compact/tile markup is absent');
  const timeline=await rpc(p,'GET_LIBRARY_TOPIC_TIMELINE',{options:{topicId:topic.id}});
  assert.equal(timeline.overview.total,2);assert.equal(timeline.overview.unknownCount,1);assert.equal(timeline.items.find(x=>x.entry.id===excerpt.id).entry.expressionTime.basis,'unknown');
  mkdirSync('work/qa-dvn-topic-root',{recursive:true});const matrix=[];d5=await openD5ThoughtRoot(h,variant);
  for(const appearance of ['light','dark']){
   await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});
   for(const width of [1440,1280,1024,768,390,320]){
    await p.setViewportSize({width,height:900});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,`${appearance}/${width}: ${overflow}`);
    const style=await row.evaluate(el=>({border:getComputedStyle(el).borderRadius,title:el.querySelector('.personal-topic-link').textContent,sectionIds:[...el.querySelectorAll('.personal-section-link')].map(x=>x.dataset.sectionId)}));
    assert.ok(parseFloat(style.border)<=6,'light independent blocks use shared small-radius geometry');assert.equal(style.title,name);assert.deepEqual(style.sectionIds,sections.slice(0,4).map(x=>x.sectionId),'responsive fitting never rewrites durable names or IDs');
    await p.screenshot({path:`work/qa-dvn-topic-root/${variant}-${appearance}-${width}.png`});matrix.push({appearance,width,overflow});await d5.capture(width,appearance);
   }
  }
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>row.locator('.personal-topic-more').textContent().then(x=>x==='Continue reading'));assert.equal(await p.locator('#thought-search').getAttribute('placeholder'),'Search thoughts, topics or text…');assert.doesNotMatch(await p.locator('#thought-home-tools,#thought-root-source').allTextContents().then(rows=>rows.join(' ')),/[\u3400-\u9fff]/,'root product controls follow English locale');
  assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id})).body,body);assert.deepEqual(await rpc(p,'GET_LIBRARY_PROVENANCE',{id:created.id}),provenance,'Root projection and responsive/search controls preserve provenance');assert.deepEqual(await rpc(p,'GET_LIBRARY_ENTRY',{id:excerpt.id}),originalExcerpt,'Root presentation preserves the original selected expression');
  await p.evaluate(()=>globalThis.__d5ThoughtRootNodes=[document.getElementById('thought-search'),document.getElementById('thought-home-tools')]);await thoughtPrimary(p,'settings');await eventually(()=>p.locator('#settings-panel').isVisible(),'Settings navigation completes before checking off-route controls');assert.equal(await p.locator('#thought-root-header').isVisible(),false);assert.equal(await p.locator('#thought-root-source').isVisible(),false);assert.equal(await p.locator('#thought-topic-header').isVisible(),false);await thoughtPrimary(p,'thoughts');await eventually(()=>row.isVisible());assert.equal(await p.evaluate(()=>__d5ThoughtRootNodes[0]===document.getElementById('thought-search')&&__d5ThoughtRootNodes[1]===document.getElementById('thought-home-tools')&&__d5ThoughtRootNodes.every(node=>node.isConnected)),true,'route handoff keeps the same control/listener owners');

  await p.locator('#thought-search').fill(query);await eventually(()=>row.locator('.personal-entry-preview').isVisible(),'real Entry search exposes the transient exact excerpt');
  const match=(await rpc(p,'GET_LIBRARY_ROOT_SEARCH',{options:{query,limit:40}})).items.find(x=>x.entryId===created.id);assert.ok(match);assert.equal(match.paths[0].topicId,topic.id);assert.equal(match.snippet,await row.locator('.personal-entry-preview').textContent());assert.ok(body.includes(match.snippet.replace(/^…|…$/g,'')),'search excerpt is a literal bounded slice of the authoritative Unicode body');
  // Hold an actual successful pre-edit search response, then mutate the real
  // Entry owner. A late reply must not resurrect the old transient excerpt.
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2RestoreSend=()=>chrome.runtime.sendMessage=send;globalThis.__d2Held=[];chrome.runtime.sendMessage=(message,...args)=>{const result=send(message,...args);return message.type==='GET_LIBRARY_ROOT_SEARCH'?Promise.resolve(result).then(value=>new Promise(resolve=>__d2Held.push({value,finish:()=>resolve(value)}))):result;};});
  await p.evaluate(()=>{void __d5RootOwner.refresh();});await eventually(()=>p.evaluate(()=>__d2Held.some(row=>row.value?.data?.items?.some(item=>item.kind==='entry'))),'actual pre-edit search response is held');
  const live=await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id}),replacement=query+' SYNTHETIC newer independent expression 👩‍💻 é';
  await rpc(p,'EDIT_LIBRARY_FIELDS',{edit:{operationId:op(),id:live.id,expectedRevision:live.revision,expectedFieldRevisions:live.fieldRevisions,changes:{body:replacement}}});
  await eventually(()=>p.locator('.personal-entry-preview').count().then(n=>n===0),'mutation synchronously clears the old transient search excerpt');
  await p.evaluate(old=>{globalThis.__d2StaleRendered=false;globalThis.__d2CueObserver=new MutationObserver(()=>{if(document.getElementById('thought-list').textContent.includes(old))__d2StaleRendered=true;});__d2CueObserver.observe(document.getElementById('thought-list'),{subtree:true,childList:true,characterData:true});__d2RestoreSend();for(const held of __d2Held)held.finish();},match.snippet);
  await eventually(()=>row.locator('.personal-entry-preview').textContent().then(text=>text===replacement),'queued fresh search uses the edited authoritative Entry');
  assert.equal(await p.evaluate(()=>__d2StaleRendered),false,'late pre-mutation search response never resurrects its excerpt');await p.evaluate(()=>__d2CueObserver.disconnect());
  assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id})).body,replacement);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:excerpt.id})).body,originalExcerpt.body,'editing the canonical Entry never rewrites the independent selected expression');
  await p.locator('#thought-search').fill('');await eventually(()=>row.locator('.personal-entry-preview').count().then(n=>n===0));await settleRoot(p);assert.equal(await row.locator('.personal-section-link').count(),4,'clearing search restores real Section overview');

  // Exercise the production invalidation owner only. These synthetic causes
  // grant no Source purge authority and perform no deletion or B-02 decision.
  for(const cause of ['EDIT_DOCUMENT','PURGE_SOURCE']){
   const invalidated=await p.evaluate(cause=>{const owner=__d5RootOwner;owner.invalidateHomeSnapshot({cause});return {nodes:document.querySelectorAll('#thought-list article.personal-topic-block').length,home:owner.homeCollection,page:owner.homePage,search:owner.rootPreSearch,base:owner.rootBaseCollection};},cause);
   assert.deepEqual(invalidated,{nodes:0,home:null,page:null,search:null,base:null},cause+' drops metadata and transient owners before any reread');
   await p.evaluate(()=>__d5RootOwner.refresh());await eventually(()=>row.isVisible());await settleRoot(p);
  }
  await verifyD5ThoughtRootTextZoom(p,variant);
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  await d5.finish();writeFileSync(`work/qa-dvn-topic-root/${variant}.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,matrix,text200Reflow:true,legacyMigrationReceipt:true,realSectionOverview:true,exactSearchExcerpt:true,staleSearchInvalidated:true,sourceInvalidationOwner:true,purgeExecuted:false,sourceUnchanged:true,zeroProviderCalls:true},null,2));
 }finally{await d5?.close();await h.close();}
});

for(const variant of ['source','release'])test(`D2 actual300 metadata-only Topic slots, exact replay and search/Back (${variant})`,{timeout:180000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;
 try{
  await p.setViewportSize({width:1440,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const seed=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),ids=[];
   for(let i=0;i<300;i++){const topic=await s.createTopic({name:'D2_DENSE_'+String(i).padStart(3,'0')+' '+(i%17===0?'这是保留完整名称的长主题，'.repeat(12):'合成主题'),operationId:crypto.randomUUID()});await s.editTopic({id:topic.id,expectedRevision:topic.revision,changes:{summary:'SYNTHETIC_DENSE_CUE_'+i+' '+('有归属的人工说明。'.repeat(300))},operationId:crypto.randomUUID()});ids.push(topic.id);}
   // Warm only the existing compatibility maintenance; Root itself must use
   // bounded GET_LIBRARY_ROOT_PROJECTION metadata reads.
   let cursor=null;do{const page=await s.libraryIndexPage({mode:'stable',cursor,limit:40});cursor=page.nextCursor;}while(cursor);await s.drainLibraryMaintenance();await s.repository.close();return {ids};
  });
  await observeD5ThoughtRootScroll(p);
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2ProjectionReads=[];
   chrome.runtime.sendMessage=async(message,...args)=>{const result=await send(message,...args);if(message.type==='GET_LIBRARY_ROOT_PROJECTION')__d2ProjectionReads.push({limit:message.options?.limit,sectionLimit:message.options?.sectionLimit,cursor:message.options?.cursor||null,ok:result?.ok,count:result?.data?.items?.length,ids:result?.data?.items?.map(item=>item.id),payload:JSON.stringify(result?.data)});return result;};
  });
  await thoughtPrimary(p,'thoughts');await eventually(()=>p.locator(blocks).count().then(n=>n>=40));
  const sentinel=p.locator('#thought-continuous-sentinel');
  for(let i=0;i<10;i++){
   if(await p.evaluate(()=>__d5RootOwner.homeCollection?.terminal))break;
   const before=await p.evaluate(()=>__d5RootOwner.homeCollection.items.length);await sentinel.focus();await sentinel.press('Enter');
   await eventually(()=>p.evaluate(n=>__d5RootOwner.homeCollection.items.length>n||__d5RootOwner.homeCollection.terminal,before),'native continuation reaches every bounded metadata page');
  }
  await eventually(()=>p.evaluate(()=>__d5RootOwner.homeCollection.terminal),'actual Root terminal');await settleRoot(p);
  const audit=await p.evaluate(()=>{const w=__d5RootOwner,r=w.homeCollection;return {ids:r.items.map(x=>x.ref.id),extent:r.items.length,retainedMetadata:r.bodies.size,dtos:[...r.bodies.values()],snapshot:r.snapshot(),metadata:r.pageMeta,slots:w.personalRoot.slots.snapshot(),mounted:document.querySelectorAll('#thought-list article.personal-topic-block').length,reads:__d2ProjectionReads};});
  assert.deepEqual([...audit.ids].sort(),[...seed.ids].sort());assert.equal(audit.extent,300);assert.equal(audit.mounted,300,'stable metadata slots are not the superseded 120 body window');assert.equal(audit.retainedMetadata,300);bodyFree(audit.dtos);bodyFree(audit.metadata);bodyFree(audit.snapshot);bodyFree(audit.slots);assert.doesNotMatch(JSON.stringify(audit.snapshot),/D2_DENSE|这是保留完整名称/,'replay snapshots contain IDs and authority, never labels or bodies');
  assert.ok(audit.reads.length>=8,'300 actual IDs require multiple bounded projection pages');for(const read of audit.reads){assert.equal(read.ok,true);assert.equal(read.limit,40);assert.equal(read.sectionLimit,4);assert.ok(read.count<=40);bodyFree(JSON.parse(read.payload));}
  assert.equal(await p.locator(`${blocks} .summary,${blocks} small,${blocks} .personal-entry-preview`).count(),0);
  const addresses=()=>p.locator(blocks).evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.dataset.topicId,node.dataset.rootSlot]))),originalAddresses=await addresses();
  const row=p.locator(blocks).nth(60),id=await row.getAttribute('data-topic-id'),target=blockFor(p,id);await row.scrollIntoViewIfNeeded();await row.locator('.personal-topic-link').focus();await settleRoot(p);
  const anchor=await row.evaluate(node=>({id:node.dataset.topicId,top:node.getBoundingClientRect().top}));await row.locator('.personal-topic-link').click();await eventually(()=>p.locator('#thought-document').isVisible());assert.equal(await p.locator('#thought-root-header').isVisible(),false);assert.equal(await p.locator('#thought-root-source').isVisible(),false);assert.equal(await p.locator('#thought-topic-header').isVisible(),true);assert.equal(await p.locator('#thought-topic-header #topic-search').count(),1,'same sole Topic search lives in the route-fenced header');
  assert.equal(await p.locator(blocks).count(),0,'hidden Root holds no old interactive nodes or closures');assert.equal(await p.evaluate(()=>__d5RootOwner.homeCollection.bodies.size),0,'Topic route releases even metadata DTOs');bodyFree(await p.evaluate(()=>__d5RootOwner.homePositions.get('home')));
  const replayStart=await p.evaluate(()=>__d2ProjectionReads.length);await p.locator('#back').click();await eventually(()=>target.count().then(n=>n===1),'Back refetches the exact prior extent');await settleRoot(p);
  await eventually(()=>target.evaluate((node,a)=>Math.abs(node.getBoundingClientRect().top-a.top)<=2,anchor),'Back restores the exact identity-relative anchor');assert.equal(await p.evaluate(()=>__d5RootOwner.homeCollection.items.length),300);assert.deepEqual(await addresses(),originalAddresses);assert.ok(await p.evaluate(start=>__d2ProjectionReads.length>start,replayStart),'Back performs real projection refetch');
  await eventually(()=>target.locator('.personal-topic-link').evaluate(node=>document.activeElement===node),'Back restores the actual native link focus');
  await p.locator('#thought-search').fill('D2_DENSE_007');await eventually(()=>p.locator(`${blocks}:not(.personal-topic-nonmatch)`).count().then(n=>n===1),'full Root search finds the exact Topic while preserving all slots');assert.equal(await p.locator(blocks).count(),300);assert.match(await p.locator(`${blocks}:not(.personal-topic-nonmatch)`).innerText(),/D2_DENSE_007/);assert.deepEqual(await addresses(),originalAddresses);bodyFree(await p.evaluate(()=>__d5RootOwner.rootPreSearch));
  await p.locator('#thought-search').fill('');await eventually(()=>p.locator(`${blocks}.personal-topic-nonmatch`).count().then(n=>n===0));await settleRoot(p);await eventually(()=>target.evaluate((node,a)=>Math.abs(node.getBoundingClientRect().top-a.top)<=2,anchor),'closing Root search restores the exact prior reading anchor');assert.equal(await p.evaluate(()=>__d5RootOwner.homeCollection.items.length),300);assert.deepEqual(await addresses(),originalAddresses);
  const wheel=await p.evaluate(()=>({scrollY,firstVisible:[...document.querySelectorAll('#thought-list article.personal-topic-block')].findIndex(n=>n.getBoundingClientRect().bottom>140),focused:document.activeElement===document.getElementById('thought-search')}));assert.equal(wheel.focused,true);assert.ok(wheel.scrollY>500,'wheel fixture starts inside the real 300-Topic extent');await p.mouse.move(800,450);await p.mouse.wheel(0,-700);
  await eventually(()=>p.evaluate(before=>scrollY<before.scrollY&&[...document.querySelectorAll('#thought-list article.personal-topic-block')].findIndex(n=>n.getBoundingClientRect().bottom>140)<before.firstVisible,wheel),'deliberate wheel reveals earlier stable slots while empty Root search keeps focus');assert.equal(await p.evaluate(()=>document.activeElement===document.getElementById('thought-search')),true);assert.deepEqual(await addresses(),originalAddresses);await settleRoot(p);

  // Exact replay of the terminal metadata extent fails visibly, without an
  // automatic retry. The same explicit Retry control hydrates it on demand.
  await target.scrollIntoViewIfNeeded();await target.locator('.personal-topic-link').focus();const retryAnchor=await target.evaluate(node=>({id:node.dataset.topicId,top:node.getBoundingClientRect().top}));await target.locator('.personal-topic-link').press('Enter');await eventually(()=>p.locator('#thought-document').isVisible(),'native Enter activates the Topic link');
  await p.evaluate(()=>{globalThis.__d2RootSend=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2RootFailures=0;chrome.runtime.sendMessage=(message,...args)=>{if(message.type==='GET_LIBRARY_ROOT_PROJECTION'){__d2RootFailures++;return Promise.resolve({ok:false,error:'STORAGE_FAILED'});}return __d2RootSend(message,...args);};});
  await p.locator('#back').click();await eventually(()=>p.locator('#thought-continuous-retry').isVisible(),'failed exact terminal replay exposes Retry');assert.equal(await p.evaluate(()=>__d5RootOwner.homeCollection.terminal),true);assert.ok(await p.evaluate(()=>__d2RootFailures>0),'failure injector intercepted a real new projection read');const failures=await p.evaluate(()=>__d2RootFailures);await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>__d2RootFailures),failures,'failed replay is never automatically retried');
  await p.evaluate(()=>chrome.runtime.sendMessage=__d2RootSend);await p.locator('#thought-continuous-retry').click();await eventually(()=>p.locator('#thought-continuous-retry').isHidden(),'explicit terminal replay retry succeeds');await settleRoot(p);
  try{
   assert.equal(await p.locator(blocks).count(),300);bodyFree(await p.evaluate(()=>[...__d5RootOwner.homeCollection.bodies.values()]));await eventually(()=>target.evaluate((node,a)=>Math.abs(node.getBoundingClientRect().top-a.top)<=2,retryAnchor),'Retry restores the exact prior anchor');await eventually(()=>target.locator('.personal-topic-link').evaluate(node=>document.activeElement===node),'Retry restores the native activated link focus');
   assert.ok(await p.locator(blocks).evaluateAll(nodes=>nodes.some(node=>{const r=node.getBoundingClientRect();return r.bottom>140&&r.top<innerHeight&&node.innerText.trim();})),'explicit retry returns usable visible blocks');assert.deepEqual(await addresses(),originalAddresses);
  }finally{mkdirSync('work/qa-dvn-topic-root',{recursive:true});writeFileSync(`work/qa-dvn-topic-root/${variant}-retry-diagnostics.json`,JSON.stringify(await p.evaluate(()=>({trace:__d5RootScroll,scrollY,anchor:__d5RootOwner.homeHydrationAnchor,restoring:__d5RootOwner.homeRestoring,shifting:__d5RootOwner.homeWindowShifting,extent:__d5RootOwner.homeCollection.items.length,rows:[...document.querySelectorAll('#thought-list article.personal-topic-block')].map(n=>({key:n.dataset.rootKey,top:n.getBoundingClientRect().top}))})),null,2));await p.screenshot({path:`work/qa-dvn-topic-root/${variant}-dense-refetch.png`});}
  await target.locator('.personal-topic-link').press('Enter');await eventually(()=>p.locator('#thought-document').isVisible(),'keyboard activation remains usable after Retry');await p.locator('#back').click();await eventually(()=>target.locator('.personal-topic-link').evaluate(node=>document.activeElement===node),'keyboard Back returns focus to the exact Topic link');await settleRoot(p);
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  writeFileSync(`work/qa-dvn-topic-root/${variant}-dense.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,topics:300,retainedMetadata:audit.retainedMetadata,boundedProjectionPages:40,bodyFreeSnapshots:true,hiddenRootReleased:true,exactBack:true,fullRootSearch:true,explicitTerminalRetry:true,keyboardActivationAndFocus:true,focusedWheel:true,zeroProviderCalls:true},null,2));
 }finally{mkdirSync('work/qa-dvn-topic-root',{recursive:true});writeFileSync(`work/qa-dvn-topic-root/${variant}-root-final-diagnostics.json`,JSON.stringify(await p.evaluate(()=>({trace:globalThis.__d5RootScroll,failures:globalThis.__d2RootFailures,scrollY,active:document.activeElement?.outerHTML?.slice(0,400),extent:globalThis.__d5RootOwner?.homeCollection?.items.length,loading:globalThis.__d5RootOwner?.homeCollection?.loading,error:globalThis.__d5RootOwner?.homeCollection?.errorKind,shifting:globalThis.__d5RootOwner?.homeWindowShifting,restoring:globalThis.__d5RootOwner?.homeRestoring,rows:[...document.querySelectorAll('#thought-list article.personal-topic-block')].map(n=>({key:n.dataset.rootKey,top:n.getBoundingClientRect().top}))})),null,2));await p.screenshot({path:`work/qa-dvn-topic-root/${variant}-root-final.png`});await h.close();}
});

for(const variant of ['source','release'])test(`D2 Topic note preserves the existing recovery owner through conflict, failure and lost acknowledgement (${variant})`,{timeout:120000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive,outcomes=[];let activeMode='setup';
 try{
  await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  for(const mode of ['conflict','failure','lost-ack']){
   activeMode=mode;const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC_NOTE_'+mode,operationId:op()}}),current=await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id}),epoch=(await rpc(p,'GET_STATE')).recoveryEpoch,summary='SYNTHETIC_RECOVERED_TOPIC_NOTE_'+mode,operationId=op(),edit={id:topic.id,expectedRevision:current.revision,changes:{summary},operationId};
   await rpc(p,'PAIA_RECOVERY_DRAFT_SAVE',{draft:{epoch,kind:'topic_metadata',ownerId:topic.id,token:operationId,operation:{type:'EDIT_LIBRARY_TOPIC',edit}}});
   if(mode==='conflict')await rpc(p,'EDIT_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:current.revision,changes:{summary:'SYNTHETIC_NEWER_SAVED_NOTE'},operationId:op()}});
   else await p.evaluate(({operationId,mode})=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);let held=false;globalThis.__noteRestore=()=>chrome.runtime.sendMessage=send;globalThis.__noteAttempts=[];chrome.runtime.sendMessage=async(message,...args)=>{if(message.type==='EDIT_LIBRARY_TOPIC'&&message.edit.operationId===operationId){__noteAttempts.push(message.edit.operationId);globalThis.__noteRequests??=[];__noteRequests.push(JSON.stringify(message.edit));if(!held){held=true;if(mode==='lost-ack')await send(message,...args);return {ok:false,error:'STORAGE_FAILED'};}}return send(message,...args);};},{operationId,mode});
   await thoughtPrimary(p,'thoughts');await eventually(()=>p.locator(`article.personal-topic-block[data-topic-id="${topic.id}"]`).count().then(n=>n===1));await p.locator(`article.personal-topic-block[data-topic-id="${topic.id}"] .personal-topic-link`).click();
   const note=p.locator('#topic-note-editor'),field=note.locator('textarea');await eventually(()=>field.inputValue().then(value=>value===summary),'recovered summary is visible through the same metadata owner');assert.equal(await note.isVisible(),true);
   if(mode==='conflict'){
    assert.equal((await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id})).summary,'SYNTHETIC_NEWER_SAVED_NOTE','recovery never silently overwrites the newer version');
    await p.locator('#topic-menu summary').click();await p.locator('#topic-menu button').filter({hasText:/^主题说明$/}).click();assert.equal(await field.inputValue(),summary,'Topic note opens the conflicted owner without a blocking save');
    const compare=note.getByRole('button',{name:'核对说明版本',exact:true});await compare.evaluate(button=>{globalThis.__noteActivation=[];for(const type of ['pointerdown','focusin','pointerup','click'])button.addEventListener(type,()=>__noteActivation.push({type,y:button.getBoundingClientRect().y}));});await compare.click();const activation=await p.evaluate(()=>__noteActivation);assert.ok(activation.some(event=>event.type==='pointerdown')&&activation.some(event=>event.type==='click'),'the original pointer activation reaches the Compare action');assert.ok(Math.max(...activation.map(event=>event.y))-Math.min(...activation.map(event=>event.y))<=2,'focusout must not move the recovery action by clearing its conflict warning');await p.locator('#library-form select[name="decision"]').selectOption('mine');await p.locator('#library-form button[type="submit"]').click();
   }else await note.getByRole('button',{name:'重试保存说明',exact:true}).click();
   await eventually(async()=>(await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id})).summary===summary,'explicit recovery save reaches canonical Topic');await eventually(async()=>(await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{epoch,kind:'topic_metadata',ownerId:topic.id}}))===null,mode+' acknowledged recovery clears only its draft');
   if(mode!=='conflict'){assert.ok(await p.evaluate(()=>__noteAttempts.length>=2),mode+' reuses recovery operation on retry');assert.deepEqual(await p.evaluate(()=>[...new Set(__noteAttempts)]),[operationId]);await p.evaluate(()=>__noteRestore());}
   outcomes.push({mode,visibleDraft:true,durableSave:true,sameOwner:true});await p.locator('#back').click();
  }
  mkdirSync('work/qa-dvn-topic-root',{recursive:true});writeFileSync(`work/qa-dvn-topic-root/${variant}-note-recovery.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,outcomes,zeroProviderCalls:true},null,2));assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{mkdirSync('work/qa-dvn-topic-root',{recursive:true});writeFileSync(`work/qa-dvn-topic-root/${variant}-note-final-diagnostics.json`,JSON.stringify({activeMode,outcomes,details:await p.evaluate(()=>({activation:globalThis.__noteActivation,attempts:globalThis.__noteAttempts,requests:globalThis.__noteRequests,status:document.getElementById('save-status')?.textContent,summary:document.querySelector('#topic-note-editor textarea')?.value}))},null,2));await p.screenshot({path:`work/qa-dvn-topic-root/${variant}-note-final.png`});await h.close();}
});
