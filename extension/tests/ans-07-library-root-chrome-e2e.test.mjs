import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {testANS07SeedAdmission} from './harness/ans07-seed-admission-native.mjs';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const seedObserver=(await readFile(new URL('./harness/ans07-seed-evidence.mjs',import.meta.url),'utf8')).replaceAll('export function','function');
const publicationObserver=(await readFile(new URL('./harness/historical-publication-evidence.mjs',import.meta.url),'utf8')).replaceAll('export function','function');

const op=()=>crypto.randomUUID();
const rootBlocks='#thought-list article.personal-topic-block';
const blockIds=page=>page.locator(rootBlocks).evaluateAll(nodes=>nodes.map(node=>node.dataset.topicId));
const rootSlots=page=>page.locator(rootBlocks).evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.dataset.topicId,node.dataset.rootSlot])));
const bodyFree=value=>assert.doesNotMatch(JSON.stringify(value),/"(?:body|thoughtText|summary|rootCue|snippet|recent)"|ANS07 entry/,'Root projections and replay snapshots contain no Entry body or default cue');
const visibleAnchor=page=>page.evaluate(()=>{const rows=[...document.querySelectorAll('#thought-list article.personal-topic-block[data-topic-id]')],node=rows.find(x=>{const r=x.getBoundingClientRect();return r.bottom>120&&r.top<innerHeight;});return node?{id:node.dataset.topicId,top:node.getBoundingClientRect().top,scrollY}:null;});
async function rpc(page,type,fields={}){
 return page.evaluate(async({type,fields})=>{const r=await chrome.runtime.sendMessage({type,...fields});if(!r?.ok)throw Error(r?.error||'RPC_FAILED');return r.data;},{type,fields});
}

test('ANS-07 Chrome root is continuous, bounded, restorable and Provider-free',{timeout:150000},async()=>{
 const h=await FakeChatGPT.start(),page=h.archive;
 try{
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(`(()=>{${seedObserver}\n${publicationObserver}\n globalThis.__ans07ObserveConsent=observeANS07Consent;globalThis.__ans07ObserveSeed=observeANS07Seed;globalThis.__ans07ObservePublication=observeHistoricalPublication;})()`);
  await page.evaluate(()=>{
   globalThis.__ans07SeedTrace={phase:'consent',consent:{dispatched:0,settled:0,acknowledged:0},completed:{topics:0,entries:0,placements:0}};
   Object.defineProperty(__ans07SeedTrace,'stage',{enumerable:true,get:()=>__ans07SeedTrace.phase});
   globalThis.__ans07Consent=__ans07ObserveConsent(chrome.runtime,__ans07SeedTrace);
  });
  await page.locator('#enable-consent').waitFor({state:'visible'});await page.locator('#enable-consent').click();
  try{await page.evaluate(()=>__ans07Consent.complete());}finally{await page.evaluate(()=>__ans07Consent.stop());}
  const seed=await page.evaluate(async()=>{
   const {LibraryDocumentsStore}=await import('../core/library-documents-store.js');
   const trace=__ans07SeedTrace;trace.consentAtSeedStart={...trace.consent};
   const s=new LibraryDocumentsStore(chrome.storage.local),topics=[];
   trace.phase='construct';const stopPublication=__ans07ObservePublication(s,chrome.storage,'personalAIArchive',trace),stopSeed=__ans07ObserveSeed(s,trace);let primary;
   try{
   for(let i=0;i<299;i++){trace.phase='topic-'+i;const t=await s.createTopic({name:'ANS07_ROOT_'+String(i).padStart(3,'0'),operationId:crypto.randomUUID()});topics.push(t.id);trace.completed.topics++;}
   await new Promise(resolve=>setTimeout(resolve,12));
   trace.phase='target-topic';const target=await s.createTopic({name:'ANS07_DEEP_SEARCH_TARGET',operationId:crypto.randomUUID()});topics.push(target.id);trace.completed.topics++;
   // Current Root enumerates stable IDs, not creation recency. Keep the same
   // 300 Topics and swap only synthetic names so the target is truly beyond
   // the first 40-ID projection page on every run.
   trace.phase='swap-target-names';const deepId=[...topics].sort().at(-1);
   if(deepId!==target.id){const previous=await s.topic(target.id),deep=await s.topic(deepId);await s.editTopic({id:previous.id,expectedRevision:previous.revision,changes:{name:deep.name},operationId:crypto.randomUUID()});await s.editTopic({id:deep.id,expectedRevision:deep.revision,changes:{name:'ANS07_DEEP_SEARCH_TARGET'},operationId:crypto.randomUUID()});}
   const entries=[];
   for(let i=0;i<130;i++){trace.phase='entry-'+i;const e=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'ANS07 entry '+String(i).padStart(3,'0'),type:'idea',formation:'explicit',evidence:[]});entries.push(e);trace.completed.entries++;}
   entries.sort((a,b)=>a.id.localeCompare(b.id));
   for(const e of entries.slice(0,45)){trace.phase='placement-'+trace.completed.placements;
    const t=await s.topic(topics[0]);
    await s.placeEntry({topicId:topics[0],entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,operationId:crypto.randomUUID()});trace.completed.placements++;
   }
   const independent=entries.slice(45).map(e=>e.id);
   trace.phase='drain-library';await s.drainLibraryMaintenance();trace.phase='complete';
   return {targetId:deepId,topics,independent,topicCount:topics.length};
   }catch(error){primary=error;trace.failed=true;try{trace.persisted=await s.repository.transaction(false,async t=>({topics:await t.count('topics'),entries:await t.count('thoughts')}),['topics','thoughts']);}catch{trace.persisted='UNAVAILABLE';}throw error;}finally{try{stopSeed();stopPublication();}catch(error){if(!primary)throw error;}}
  }).catch(async error=>{try{console.error('ANS07_SEED_FAILURE',JSON.stringify(await page.evaluate(()=>__ans07SeedTrace)));}catch(diagnosticError){console.error('ANS07_SEED_DIAGNOSTIC_FAILED',diagnosticError.name);}throw error;});
  console.log('ANS07_SEED_COMPLETE',JSON.stringify(await page.evaluate(()=>__ans07SeedTrace)));
  const firstUnplaced=await rpc(page,'GET_LIBRARY_UNPLACED',{options:{limit:40}});
  assert.equal(firstUnplaced.items.length,0,'first unplaced source page is intentionally empty');
  assert.ok(firstUnplaced.nextCursor,'empty unplaced page is not terminal');

  await page.evaluate(async()=>{
   const {TopicController}=await import('../ui/topic-workspace.js'),create=TopicController.prototype.createHomeCollection;
   TopicController.prototype.createHomeCollection=function(...args){globalThis.__ans07Root=this;return create.apply(this,args);};
   globalThis.__ans07RouteTrace=[];
   const trace=(owner,method,phase)=>{const saved=owner.homePositions?.get('home'),list=document.getElementById('thought-list');__ans07RouteTrace.push({method,phase,id:owner.id,serial:owner.serial,scroll:scrollY,savedScroll:saved?.scroll,rootAnchor:saved?.rootAnchor,returnRows:saved?.returnGeometry?.geometry?.rows?.length,pendingRows:owner.rootReturnGeometry?.geometry?.rows?.length,geometryEpoch:owner.personalRoot?.previews?.geometryEpoch,restoring:owner.homeRestoring,listHeight:list?.getBoundingClientRect().height,listHidden:!!list?.closest('[hidden]')});if(__ans07RouteTrace.length>80)__ans07RouteTrace.shift();};
   for(const name of ['open','leave','renderHomeReader']){const method=TopicController.prototype[name];TopicController.prototype[name]=async function(...args){trace(this,name,'before');try{return await method.apply(this,args);}finally{trace(this,name,'after');}};}
   const restore=TopicController.prototype.restoreHomeAnchor;TopicController.prototype.restoreHomeAnchor=function(...args){trace(this,'restoreHomeAnchor','before');const result=restore.apply(this,args);requestAnimationFrame(()=>requestAnimationFrame(()=>trace(this,'restoreHomeAnchor','settled')));return result;};
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__ans07ProjectionReads=[];
   chrome.runtime.sendMessage=async(message,...args)=>{const response=await send(message,...args);if(message.type==='GET_LIBRARY_ROOT_PROJECTION')__ans07ProjectionReads.push({limit:message.options?.limit,sectionLimit:message.options?.sectionLimit,ok:response?.ok,page:response?.data});return response;};
  });
  await page.locator('[data-view=thoughts]').click();
  await eventually(async()=>await page.locator('#thought-list article.personal-topic-block[data-topic-id]').count()>=40,'first root batch',30000);
  assert.equal(await page.locator('#thought-more').count(),0);
  assert.doesNotMatch(await page.locator('#thought-panel').innerText(),/下一部分/);
  const firstCount=await page.locator('#thought-list article.personal-topic-block[data-topic-id]').count();assert.equal((await blockIds(page)).includes(seed.targetId),false,'deep search target is outside the actual first mounted projection page');

  // Home search is retired. Its shared lexical service must still discover
  // never-mounted identities without expanding or filtering this directory.
  const searchTab=await h.context.newPage();searchTab.on('pageerror',error=>h.errors.push(error.message));
  try{
   await searchTab.goto(page.url().split('#')[0]);await searchTab.locator('[data-view=thoughts]').click();await eventually(()=>searchTab.locator(rootBlocks).count().then(n=>n>=40),'fresh tab mounts its initial bounded Root extent');
   assert.equal((await blockIds(searchTab)).includes(seed.targetId),false,'deep target has never been mounted in this tab before the service query');assert.equal(await searchTab.locator('#thought-search,.personal-root-search-extra,.personal-entry-preview').count(),0,'retired Home search and previews are absent');
   const matches=[];let cursor=null,authority;
   do{const result=await rpc(searchTab,'GET_LIBRARY_ROOT_SEARCH',{options:{query:'ANS07_DEEP_SEARCH_TARGET',limit:40,cursor,...(authority?{authority}:{})}});assert.notEqual(result.cursorInvalid,true);assert.ok(result.items.length<=40);authority=result.authority;matches.push(...result.items);cursor=result.nextCursor;}while(cursor);
   const match=matches.find(item=>(item.topicId||item.id)===seed.targetId);assert.ok(match,'the original trusted lexical service retrieves the absent identity');assert.ok(JSON.stringify(match).includes('ANS07_DEEP_SEARCH_TARGET'));assert.equal((await blockIds(searchTab)).includes(seed.targetId),false,'a backend query cannot mount an unsolicited UI result');assert.equal(await searchTab.locator('#thought-search,.personal-root-search-extra').count(),0);
  }finally{await searchTab.close();}
  assert.equal(await page.locator(rootBlocks).count(),firstCount,'service lookup in another tab cannot expand this tab’s visited Root extent');

  const sentinel=page.locator('#thought-continuous-sentinel');await sentinel.focus();await sentinel.press('Enter');
  await eventually(async()=>await page.locator('#thought-list article.personal-topic-block[data-topic-id]').count()>firstCount,'keyboard continuous load',20000);
  assert.equal(await sentinel.evaluate(el=>document.activeElement===el),true,'continuous load does not steal focus');

  for(let i=0;i<10&&Number(await page.locator('#thought-list').getAttribute('data-loaded-extent'))<300;i++){
   await sentinel.scrollIntoViewIfNeeded();
   await page.evaluate(()=>document.getElementById('thought-continuous-sentinel').scrollIntoView({block:'end'}));
   const before=Number(await page.locator('#thought-list').getAttribute('data-loaded-extent'));
   await eventually(async()=>{const n=Number(await page.locator('#thought-list').getAttribute('data-loaded-extent'));return n>before||/末尾/.test(await page.locator('#thought-continuous-status').textContent());},'scroll continuous load',15000);
  }
  const loaded=Number(await page.locator('#thought-list').getAttribute('data-loaded-extent'));assert.equal(loaded,300,'every approved dense-root Topic is reachable');
  assert.equal(await page.locator(rootBlocks).count(),300,'all 300 stable metadata slots remain mounted');assert.deepEqual((await blockIds(page)).sort(),[...seed.topics].sort(),'Root renders exactly the 300 real seeded identities');assert.equal(Number(await page.locator('#thought-list').getAttribute('data-retained-bodies')),0,'normal Root retains no canonical body or excerpt');
  const rootAudit=await page.evaluate(()=>({reads:__ans07ProjectionReads,snapshot:__ans07Root.homeCollection.snapshot(),metadata:__ans07Root.homeCollection.pageMeta,dtos:[...__ans07Root.homeCollection.bodies.values()],slots:__ans07Root.personalRoot.slots.snapshot()}));
  assert.ok(rootAudit.reads.length>=8,'300 identities require multiple bounded projection pages');for(const read of rootAudit.reads){assert.equal(read.ok,true);assert.equal(read.limit,40);assert.equal(read.sectionLimit,4);assert.ok(read.page.items.length<=40);bodyFree(read.page);}for(const value of [rootAudit.snapshot,rootAudit.metadata,rootAudit.dtos,rootAudit.slots])bodyFree(value);assert.doesNotMatch(JSON.stringify(rootAudit.snapshot),/ANS07_ROOT|ANS07_DEEP_SEARCH_TARGET/,'replay stores identity references instead of labels');
  const stableIds=await blockIds(page),stableSlots=await rootSlots(page);
  await mkdir('work/ans-07',{recursive:true});await page.screenshot({path:'work/ans-07/root-six-batches.png'});

  const beforeLayout=await visibleAnchor(page);
  await rpc(page,'SET_THOUGHT_LAYOUT',{layout:'grid'});
  assert.equal((await rpc(page,'GET_THOUGHT_LAYOUT')).layout,'list','retired layout service keeps its compatibility receipt');
  const afterRetiredLayout=await rpc(page,'GET_LIBRARY_ROOT_PROJECTION',{options:{limit:40,sectionLimit:4}});assert.equal(afterRetiredLayout.authority,rootAudit.snapshot.authority,'retired layout input preserves the current Root replay authority');assert.notEqual(afterRetiredLayout.indexing,true);bodyFree(afterRetiredLayout);
  await eventually(async()=>{
   const node=page.locator('#thought-list article.personal-topic-block[data-topic-id="'+beforeLayout.id+'"]');
   return await node.evaluate((el,before)=>{const r=el.getBoundingClientRect();return r.bottom>120&&r.top<innerHeight&&Math.abs(r.top-before.top)<=2;},beforeLayout);
  },'exact captured layout key retains visible position',20000);
  const afterLayout=await page.locator('#thought-list article.personal-topic-block[data-topic-id="'+beforeLayout.id+'"]').evaluate(el=>({id:el.dataset.topicId,top:el.getBoundingClientRect().top}));
  assert.equal(afterLayout.id,beforeLayout.id);
  assert.ok(Math.abs(afterLayout.top-beforeLayout.top)<=2,'deprecated layout request retains the same visible key');
  assert.equal(await page.locator('#thought-list').evaluate(el=>el.classList.contains('personal-topic-grid')&&getComputedStyle(el).display==='grid'),true,'current Personal Topic grid survives the retired layout command');assert.deepEqual(await blockIds(page),stableIds,'legacy layout command cannot reorder Topic identities');assert.deepEqual(await rootSlots(page),stableSlots,'legacy layout command cannot repack stable addresses');

  const targetRow=page.locator('#thought-list article.personal-topic-block[data-topic-id]').nth(60);await targetRow.scrollIntoViewIfNeeded();
  const beforeOpen=await visibleAnchor(page),openedId=await targetRow.getAttribute('data-topic-id'),openedTop=await targetRow.evaluate(node=>node.getBoundingClientRect().top);
  await targetRow.locator('.personal-topic-link').click();await eventually(async()=>!(await page.locator('#thought-document').isHidden()),'topic opened');
  await page.locator('#back').click();
  await eventually(async()=>await page.locator('#thought-list article.personal-topic-block[data-topic-id="'+openedId+'"]').count()===1,'root snapshot restored',20000);
  try{await eventually(async()=>{const a=await visibleAnchor(page);return a?.id===beforeOpen.id&&Math.abs(a.top-beforeOpen.top)<=2;},'root scroll restored',20000);}finally{const after=await visibleAnchor(page),exact=await page.locator('#thought-list article.personal-topic-block[data-topic-id="'+beforeOpen.id+'"]').evaluate(node=>({top:node.getBoundingClientRect().top,height:node.getBoundingClientRect().height}));await writeFile('work/ans-07/back-diagnostics.json',JSON.stringify({trace:await page.evaluate(()=>__ans07RouteTrace),beforeOpen,after,exact,clicked:{id:openedId,beforeTop:openedTop,afterTop:await targetRow.evaluate(node=>node.getBoundingClientRect().top)},extent:await page.locator('#thought-list').getAttribute('data-loaded-extent')},null,2));await page.screenshot({path:'work/ans-07/back-diagnostics.png'});}
  assert.ok(Math.abs(await targetRow.evaluate(node=>node.getBoundingClientRect().top)-openedTop)<=2,'Back also retains the activated Topic viewport offset');
  const afterBack=await visibleAnchor(page);assert.equal(afterBack.id,beforeOpen.id);assert.ok(Math.abs(afterBack.top-beforeOpen.top)<=2,'back returns the exact key to its prior viewport offset');assert.equal(Number(await page.locator('#thought-list').getAttribute('data-loaded-extent')),300,'Back preserves the complete visited extent');
  await page.screenshot({path:'work/ans-07/root-return-restored.png'});

  const beforeLookup=await visibleAnchor(page),beforeLookupClickedTop=await targetRow.evaluate(node=>node.getBoundingClientRect().top);
  assert.equal(await page.locator('#thought-search,.personal-root-search-extra,.personal-entry-preview').count(),0,'the complete Root remains a Topic/Section metadata directory');
  const lookup=await rpc(page,'GET_LIBRARY_ROOT_SEARCH',{options:{query:'ANS07_DEEP_SEARCH_TARGET',limit:40}});assert.ok(lookup.items.some(item=>(item.topicId||item.id)===seed.targetId),'the full directory preserves original shared query eligibility');
  assert.deepEqual(await blockIds(page),stableIds);assert.deepEqual(await rootSlots(page),stableSlots);const afterLookup=await visibleAnchor(page);assert.equal(afterLookup.id,beforeLookup.id);assert.ok(Math.abs(afterLookup.top-beforeLookup.top)<=2,'a service query cannot move the current directory anchor');assert.ok(Math.abs(await targetRow.evaluate(node=>node.getBoundingClientRect().top)-beforeLookupClickedTop)<=2);assert.equal(await page.locator(rootBlocks+'.personal-topic-nonmatch').count(),0,'no stale invisible query hides directory identities');

  const unplacedButton=page.locator('#library-unplaced');await unplacedButton.waitFor({state:'visible'});await unplacedButton.click();
  await eventually(async()=>await page.locator('[data-unplaced-id]').count()>0,'continuous unplaced crosses empty first page',20000);
  const unplacedSentinel=page.locator('#unplaced-continuous-sentinel');await unplacedSentinel.focus();await unplacedSentinel.press('Enter');
  for(let i=0;i<5&&(await page.locator('[data-unplaced-id]').count())<85;i++){
   const before=await page.locator('[data-unplaced-id]').count();
   await page.evaluate(()=>document.getElementById('unplaced-continuous-sentinel').scrollIntoView({block:'end'}));
   await eventually(async()=>{const n=await page.locator('[data-unplaced-id]').count();return n>before||/末尾/.test(await page.locator('#unplaced-continuous-status').textContent());},'unplaced continuous batch',20000);
  }
  await eventually(async()=>await page.locator('[data-unplaced-id]').count()===85,'all independent thoughts reachable',20000);
  assert.match(await page.locator('#unplaced-continuous-status').textContent(),/末尾/);
  assert.deepEqual((await page.locator('[data-unplaced-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.unplacedId))).sort(),[...seed.independent].sort(),'all 85 exact independent Entry identities survive the Root migration');

  const perf=await page.evaluate(async()=>{
   const call=async(options)=>{const r=await chrome.runtime.sendMessage({type:'LIBRARY_INDEX_PAGE',options});if(!r?.ok)throw Error(r?.error||'RPC_FAILED');return r.data;};
   const first=await call({mode:'stable',limit:40}),cursor=first.nextCursor,samples=[];let operations;
   for(let i=0;i<30;i++){const start=performance.now(),next=await call({mode:'stable',limit:40,cursor});samples.push(performance.now()-start);operations=next.operations;}
   const sorted=[...samples].sort((a,b)=>a-b),p95=sorted[Math.ceil(sorted.length*.95)-1];
   return {p95,samples,operations,firstOperations:first.operations};
  });
  await writeFile('work/ans-07/compatibility-performance.json',JSON.stringify(perf,null,2));
  assert.ok(perf.p95<=750,'warmed next-chunk p95 <= 750 ms');
  assert.ok(perf.operations.indexRowsRead<=40&&perf.operations.topicRowsRead<=40);
  assert.equal(perf.operations.buildRowsScanned,0);
  // Keep the original compatibility-index work/performance bounds above, and
  // apply the same latency budget to the actual current Root projection.
  const projectionPerf=await page.evaluate(async()=>{
   const call=async options=>{const response=await chrome.runtime.sendMessage({type:'GET_LIBRARY_ROOT_PROJECTION',options});if(!response?.ok)throw Error(response?.error||'RPC_FAILED');return response.data;};
   const first=await call({limit:40,sectionLimit:4}),cursor=first.nextCursor,samples=[],pages=[];
   for(let i=0;i<30;i++){const start=performance.now(),page=await call({limit:40,sectionLimit:4,cursor});samples.push(performance.now()-start);pages.push(page);}
   const sorted=[...samples].sort((a,b)=>a-b);return {p95:sorted[Math.ceil(sorted.length*.95)-1],samples,first,pages};
  });
  assert.ok(projectionPerf.first.nextCursor,'current projection has a real continuation');assert.equal(projectionPerf.first.items.length,40);for(const page of projectionPerf.pages){assert.equal(page.cursorInvalid,undefined);assert.equal(page.items.length,40);bodyFree(page);}assert.ok(projectionPerf.p95<=750,'current Root projection warmed next-chunk p95 <= 750 ms');

  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  const evidence={topicCount:seed.topicCount,rootLoaded:loaded,unplacedCount:85,emptyUnplacedPage:true,keyboardLoad:true,scrollRestore:true,deepBackendSearch:true,retiredSearchAbsent:true,stableSlots:true,bodyFreeRoot:true,projectionPageLimit:40,projectionP95:projectionPerf.p95,p95:perf.p95,operations:perf.operations,externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,deepSeekRequests:h.deepSeekRequests.length};
  await writeFile('work/ans-07/evidence.json',JSON.stringify(evidence,null,2));
  console.log('ANS07_BROWSER_EVIDENCE '+JSON.stringify(evidence));
 }finally{await h.close();}
});

// Keep the controlled admission regressions in the existing Browser8 owner.
testANS07SeedAdmission(test);
