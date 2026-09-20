import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const op=()=>crypto.randomUUID();
const visibleAnchor=page=>page.evaluate(()=>{const rows=[...document.querySelectorAll('#thought-list [data-topic-id]')],node=rows.find(x=>{const r=x.getBoundingClientRect();return r.bottom>120&&r.top<innerHeight;});return node?{id:node.dataset.topicId,top:node.getBoundingClientRect().top,scrollY}:null;});
async function rpc(page,type,fields={}){
 return page.evaluate(async({type,fields})=>{const r=await chrome.runtime.sendMessage({type,...fields});if(!r?.ok)throw Error(r?.error||'RPC_FAILED');return r.data;},{type,fields});
}

test('ANS-07 Chrome root is continuous, bounded, restorable and Provider-free',{timeout:150000},async()=>{
 const h=await FakeChatGPT.start(),page=h.archive;
 try{
  await page.setViewportSize({width:1280,height:720});
  await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
  const seed=await page.evaluate(async()=>{
   const {LibraryDocumentsStore}=await import('../core/library-documents-store.js');
   const s=new LibraryDocumentsStore(chrome.storage.local),topics=[];
   for(let i=0;i<244;i++){const t=await s.createTopic({name:'ANS07_ROOT_'+String(i).padStart(3,'0'),operationId:crypto.randomUUID()});topics.push(t.id);}
   await new Promise(resolve=>setTimeout(resolve,12));
   const target=await s.createTopic({name:'ANS07_DEEP_SEARCH_TARGET',operationId:crypto.randomUUID()});topics.push(target.id);
   const entries=[];
   for(let i=0;i<130;i++){const e=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'ANS07 entry '+String(i).padStart(3,'0'),type:'idea',formation:'explicit',evidence:[]});entries.push(e);}
   entries.sort((a,b)=>a.id.localeCompare(b.id));
   for(const e of entries.slice(0,45)){
    const t=await s.topic(topics[0]);
    await s.placeEntry({topicId:topics[0],entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,operationId:crypto.randomUUID()});
   }
   const independent=entries.slice(45).map(e=>e.id);
   await s.drainLibraryMaintenance();
   return {targetId:target.id,independent,topicCount:topics.length};
  });
  const firstUnplaced=await rpc(page,'GET_LIBRARY_UNPLACED',{options:{limit:40}});
  assert.equal(firstUnplaced.items.length,0,'first unplaced source page is intentionally empty');
  assert.ok(firstUnplaced.nextCursor,'empty unplaced page is not terminal');

  await page.locator('[data-view=thoughts]').click();
  await eventually(async()=>await page.locator('#thought-list [data-topic-id]').count()>=40,'first root batch',30000);
  assert.equal(await page.locator('#thought-more').count(),0);
  assert.doesNotMatch(await page.locator('#thought-panel').innerText(),/下一部分/);
  const firstCount=await page.locator('#thought-list [data-topic-id]').count();

  const sentinel=page.locator('#thought-continuous-sentinel');await sentinel.focus();await sentinel.press('Enter');
  await eventually(async()=>await page.locator('#thought-list [data-topic-id]').count()>firstCount,'keyboard continuous load',20000);
  assert.equal(await sentinel.evaluate(el=>document.activeElement===el),true,'continuous load does not steal focus');

  for(let i=0;i<8&&(await page.locator('#thought-list [data-topic-id]').count())<240;i++){
   await sentinel.scrollIntoViewIfNeeded();
   await page.evaluate(()=>document.getElementById('thought-continuous-sentinel').scrollIntoView({block:'end'}));
   const before=await page.locator('#thought-list [data-topic-id]').count();
   await eventually(async()=>{const n=await page.locator('#thought-list [data-topic-id]').count();return n>before||/末尾/.test(await page.locator('#thought-continuous-status').textContent());},'scroll continuous load',15000);
  }
  const loaded=await page.locator('#thought-list [data-topic-id]').count();assert.ok(loaded>=240,'at least six 40-item batches are reachable');
  await mkdir('work/ans-07',{recursive:true});await page.screenshot({path:'work/ans-07/root-six-batches.png'});

  const beforeLayout=await visibleAnchor(page);
  await page.evaluate(()=>{const menu=document.querySelector('#thought-home-tools details.library-actions');menu.open=true;[...menu.querySelectorAll('button')].find(b=>b.textContent.includes('列表 / 网格')).click();});
  await pause(250);
  const afterLayout=await visibleAnchor(page);assert.equal(afterLayout.id,beforeLayout.id);assert.ok(Math.abs(afterLayout.top-beforeLayout.top)<90,'layout switch retains visible key');

  const targetRow=page.locator('#thought-list [data-topic-id]').nth(150);await targetRow.scrollIntoViewIfNeeded();
  const beforeOpen=await visibleAnchor(page),openedId=await targetRow.getAttribute('data-topic-id');
  await targetRow.click();await eventually(async()=>!(await page.locator('#thought-document').isHidden()),'topic opened');
  await page.locator('#back').click();
  await eventually(async()=>await page.locator('#thought-list [data-topic-id="'+openedId+'"]').count()===1,'root snapshot restored',20000);
  await eventually(async()=>{const a=await visibleAnchor(page);return a?.id===beforeOpen.id&&Math.abs(a.scrollY-beforeOpen.scrollY)<140;},'root scroll restored',20000);
  const afterBack=await visibleAnchor(page);assert.equal(afterBack.id,beforeOpen.id);assert.ok(Math.abs(afterBack.scrollY-beforeOpen.scrollY)<140,'back returns to prior root scroll');
  await page.screenshot({path:'work/ans-07/root-return-restored.png'});

  await page.locator('#thought-search').fill('ANS07_DEEP_SEARCH_TARGET');
  await eventually(async()=>(await page.locator('#thought-list').innerText()).includes('ANS07_DEEP_SEARCH_TARGET'),'search beyond first root batch',30000);
  assert.ok((await page.locator('#thought-list').innerText()).includes('ANS07_DEEP_SEARCH_TARGET'));
  await page.locator('#thought-search').fill('');
  await eventually(async()=>await page.locator('#thought-list [data-topic-id]').count()>=40,'root returns after search',20000);

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

  const perf=await page.evaluate(async()=>{
   const call=async(options)=>{const r=await chrome.runtime.sendMessage({type:'LIBRARY_INDEX_PAGE',options});if(!r?.ok)throw Error(r?.error||'RPC_FAILED');return r.data;};
   const first=await call({mode:'stable',limit:40}),cursor=first.nextCursor,samples=[];let operations;
   for(let i=0;i<30;i++){const start=performance.now(),next=await call({mode:'stable',limit:40,cursor});samples.push(performance.now()-start);operations=next.operations;}
   const sorted=[...samples].sort((a,b)=>a-b),p95=sorted[Math.ceil(sorted.length*.95)-1];
   return {p95,samples,operations,firstOperations:first.operations};
  });
  assert.ok(perf.p95<=750,'warmed next-chunk p95 <= 750 ms');
  assert.ok(perf.operations.indexRowsRead<=40&&perf.operations.topicRowsRead<=40);
  assert.equal(perf.operations.buildRowsScanned,0);

  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
  const evidence={topicCount:seed.topicCount,rootLoaded:loaded,unplacedCount:85,emptyUnplacedPage:true,keyboardLoad:true,scrollRestore:true,deepSearch:true,p95:perf.p95,operations:perf.operations,externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,deepSeekRequests:h.deepSeekRequests.length};
  await writeFile('work/ans-07/evidence.json',JSON.stringify(evidence,null,2));
  console.log('ANS07_BROWSER_EVIDENCE '+JSON.stringify(evidence));
 }finally{await h.close();}
});
