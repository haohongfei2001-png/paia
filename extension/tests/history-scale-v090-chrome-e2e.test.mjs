import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';import {conversation} from './fixtures/history-v090.mjs';import {productReply,productHistory} from './fixtures/product-history-v080.mjs';import {zip} from './fixtures/import-zip.mjs';
const rpc=async(h,type,extra={})=>{const r=await h.archive.evaluate(x=>chrome.runtime.sendMessage(x),{type,...extra});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
for(const count of process.env.PAIA_HISTORY_STRESS==='100000'?[100000]:[1000,10000])test('visible Chrome '+count+' history import: responsive progress, searchable last page and no automatic AI',{timeout:count===100000?900000:240000},async()=>{
 const h=await FakeChatGPT.start({headless:false,onboarding:true,deepSeekFixture:productReply});try{
  await mkdir('work/history-v090',{recursive:true});await h.archive.locator('#onboarding-start').click();await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('#onboarding-history').click();
  const conversations=Array.from({length:count/50},(_,i)=>{const c=conversation(i+1,50);for(const [j,n]of Object.values(c.mapping).slice(1).entries())n.message.content.parts=[count===1000?productHistory[j].text:'Synthetic historical statement '+i+' / '+j+' preserving a meaningful personal idea.'];return c;});
  Object.values(conversations.at(-1).mapping).at(-1).message.content.parts=['UNIQUE_LATE_HISTORICAL_MATCH'];
  const file=zip([{name:'conversations.json',text:JSON.stringify(conversations)}]),buffer=Buffer.from(await file.arrayBuffer());
  await h.archive.locator('#history-file-consent').check();await h.archive.locator('#history-file').setInputFiles({name:'synthetic-history-scale.zip',mimeType:'application/zip',buffer});
  const checking=Date.now();await eventually(()=>h.archive.locator('#history-commit').isEnabled(),'scale preflight ready',count===100000?180000:90000);const preflightMs=Date.now()-checking;
  assert.equal((await rpc(h,'GET_PAGE',{page:{view:'library',limit:50}})).documents.length,0);
  // A page heartbeat measures event-loop delay during import, including actual UI updates.
  await h.archive.evaluate(()=>{window.scaleProbe={ticks:0,maxGapMs:0,last:performance.now()};window.scaleProbe.timer=setInterval(()=>{const now=performance.now();window.scaleProbe.maxGapMs=Math.max(window.scaleProbe.maxGapMs,now-window.scaleProbe.last);window.scaleProbe.last=now;window.scaleProbe.ticks++;},50);});
  const pageCdp=await h.context.newCDPSession(h.archive);const heapBefore=await pageCdp.send('Runtime.getHeapUsage');
  const start=Date.now();await h.archive.locator('#history-commit').click();await eventually(()=>h.archive.locator('#history-success').isVisible(),'scale commit complete',count===100000?600000:150000);const importMs=Date.now()-start;
  const heapAfter=await pageCdp.send('Runtime.getHeapUsage');
  const heartbeat=await h.archive.evaluate(()=>{clearInterval(window.scaleProbe.timer);return {ticks:window.scaleProbe.ticks,maxGapMs:window.scaleProbe.maxGapMs};});
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.ok(heartbeat.ticks>0);assert.ok(heartbeat.maxGapMs<3000,'page must remain responsive');
  const latest=await rpc(h,'IMPORT_LATEST');assert.equal(latest.lastImport.counts.added,count);await h.archive.screenshot({path:'work/history-v090/scale-'+count+'-complete.png'});
  await h.archive.locator('#history-read').click();const searchStart=Date.now();await h.archive.locator('#search').fill('UNIQUE_LATE_HISTORICAL_MATCH');await eventually(async()=>await h.archive.locator('.search-input-result').count()>0||await h.archive.locator('#document-list').textContent().then(t=>t.includes('UNIQUE_LATE_HISTORICAL_MATCH')),'late history search finds match',count===100000?180000:60000);const searchMs=Date.now()-searchStart;
  await h.archive.screenshot({path:'work/history-v090/scale-'+count+'-search.png'});
  let explicitOriginalRequests=0,explicitAIRequests=0;
  if(count===1000){
   await rpc(h,'FILTER_MODE',{mode:'off'});await rpc(h,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-history-scale-key'}});await h.archive.locator('[data-view="thoughts"]').click();
   assert.equal((await rpc(h,'GET_ORIGINAL_ORGANIZER_STATUS')).pendingInput,1000);
   await h.archive.locator('[data-view=settings]').click();await h.archive.locator('#bounded-original-start').click();await h.archive.locator('[name="requests"]').selectOption('3');await h.archive.locator('[name="inputs"]').selectOption('50');await h.archive.locator('#library-form button[type="submit"]').click();
   await eventually(async()=>(await rpc(h,'GET_BOUNDED_ORGANIZER'))?.state==='completed','explicit bounded complete',60000);explicitOriginalRequests=h.deepSeekRequests.length;assert.equal(explicitOriginalRequests,3);
   const topic=(await rpc(h,'LIBRARY_INDEX_PAGE',{options:{mode:'all'}})).items[0];
   await rpc(h,'UPDATE_AI_PRESENTATION',{userActionId:crypto.randomUUID(),topicId:topic.id});explicitAIRequests=h.deepSeekRequests.length-explicitOriginalRequests;assert.equal(explicitAIRequests,1);
   await h.archive.locator('[data-view=thoughts]').click();await h.archive.locator('.topic-index-row').first().click();await h.archive.locator('#topic-body .entry-prose').first().waitFor();await h.archive.screenshot({path:'work/history-v090/scale-1000-thoughts.png'});
  }
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);await writeFile('work/history-v090/chrome-scale-'+count+'.json',JSON.stringify({syntheticOnly:true,visibleChrome:true,inputs:count,preflightMs,importMs,searchMs,heartbeat,pageHeapUsedBeforeBytes:heapBefore.usedSize,pageHeapUsedAfterBytes:heapAfter.usedSize,heapScope:'archive page only; excludes worker and IndexedDB',importRequests:0,explicitOriginalRequests,explicitAIRequests,externalRequests:h.externalRequests,errors:h.errors},null,2));
 }finally{await h.close();}
});
