import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
const visibleAnchor=page=>page.evaluate(()=>{const rows=[...document.querySelectorAll('#topic-body [data-entry-id]')],node=rows.find(x=>{const r=x.getBoundingClientRect();return r.bottom>140&&r.top<innerHeight;})||rows[0];return node?{id:node.dataset.entryId,top:node.getBoundingClientRect().top,scrollY}:null;});

test('ANS-08 Chrome Topic Reader is continuous, bidirectional, windowed and Provider-free',{timeout:180000},async()=>{
 const h=await FakeChatGPT.start({headless:false}),page=h.archive;
 try{
  await page.setViewportSize({width:1280,height:720});
  await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
  const seed=await page.evaluate(async()=>{
   const [{OrganizerStore},{refreshEntryIndex}]=await Promise.all([import('../core/organizer/store.js'),import('../core/thought-model.js')]);
   const s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),pad=n=>String(n).padStart(4,'0'),rank=n=>String(n*1024).padStart(12,'0');
   const topic=await s.createTopic({name:'ANS08_CONTINUOUS_TOPIC',operationId:op()}),first=await s.continueThinking({operationId:op(),body:'ANS08 body 0000',topicId:topic.id});
   await s.foundationWrite(async t=>{
    const live=await t.get('topics',topic.id),template=await t.get('thoughts',first.id),basePlacement=await t.get('placements',JSON.stringify([topic.id,live.activeLayoutGeneration,first.id])),baseSection=await t.get('sections',JSON.stringify([topic.id,live.activeLayoutGeneration,live.defaultSectionId])),sectionIds=[live.defaultSectionId];
    baseSection.rank=rank(1);await t.put('sections',baseSection);
    for(let i=1;i<12;i++){const sectionId='ans08-browser-section-'+pad(i);sectionIds.push(sectionId);await t.put('sections',{...structuredClone(baseSection),id:JSON.stringify([topic.id,live.activeLayoutGeneration,sectionId]),sectionId,isDefault:false,title:'ANS08 section '+pad(i),rank:rank(i+1),revision:0});}
    for(let i=0;i<440;i++){const id=i===0?first.id:'ans08-browser-entry-'+pad(i),sectionIndex=i%12,sectionId=sectionIds[sectionIndex],at=new Date(Date.UTC(2026,0,1)+i*1000).toISOString(),row=i===0?template:{...structuredClone(template),id};row.thoughtText='ANS08 body '+pad(i);row.title='';row.createdAt=at;row.updatedAt=at;row.createdSequence=(template.createdSequence||1)+i;row.updatedSequence=(template.updatedSequence||1)+i;row.sourceRecordIds=[];row.provenanceType='user_created';refreshEntryIndex(row);await t.put('thoughts',row);await t.put('placements',{...structuredClone(basePlacement),id:JSON.stringify([topic.id,live.activeLayoutGeneration,id]),entryId:id,sectionId,sectionRank:rank(sectionIndex+1),rank:rank(Math.floor(i/12)+1),revision:0,lifecycle:'active',activeKey:0});}
    live.organizationRevision++;live.countVersion=(live.countVersion||0)+1;await t.put('topics',live);
   });
   await s.repository.close();return {topicId:topic.id,count:440};
  });

  await page.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.ans08Trace={topicPages:[],tracked:[]};window.ans08RestoreSend=()=>chrome.runtime.sendMessage=send;
   chrome.runtime.sendMessage=(message,...args)=>{const out=send(message,...args);return Promise.resolve(out).then(result=>{if(message?.type==='TOPIC_DOCUMENT_PAGE'&&result?.ok)window.ans08Trace.topicPages.push({options:structuredClone(message.options||{}),ids:(result.data?.items||[]).map(x=>x.entry.id),operations:result.data?.operations||null,indexing:result.data?.indexing===true});if(message?.type==='GET_LIBRARY_TRACKED_ENTRIES')window.ans08Trace.tracked.push(message.options?.ids?.length||0);return result;});};
  });

  await page.locator('[data-view=thoughts]').click();
  await eventually(async()=>await page.locator('[data-topic-id="'+seed.topicId+'"]').count()===1,'topic root',30000);
  await page.locator('[data-topic-id="'+seed.topicId+'"]').click();
  await eventually(async()=>await page.locator('#topic-body [data-entry-id]').count()>0,'topic initial rows',30000);
  assert.equal(await page.locator('#topic-next').count(),0);assert.equal(await page.locator('#topic-previous').count(),0);assert.doesNotMatch(await page.locator('#thought-document').innerText(),/下一部分|上一部分/);

  const firstId=await page.locator('#topic-body [data-entry-id]').first().getAttribute('data-entry-id'),sentinel=page.locator('#topic-continuous-after');
  for(let i=0;i<12;i++){
   const before=await page.evaluate(()=>window.ans08Trace.topicPages.length),status=await page.locator('#topic-continuous-after-status').textContent();if(/末尾/.test(status))break;
   await sentinel.focus();await sentinel.press('Enter');
   await eventually(async()=>await page.evaluate(n=>window.ans08Trace.topicPages.length>n,before)||/末尾/.test(await page.locator('#topic-continuous-after-status').textContent()),'next continuous chunk',20000);
  }
  await eventually(async()=>/末尾/.test(await page.locator('#topic-continuous-after-status').textContent()),'topic terminal',30000);
  const trace=await page.evaluate(()=>structuredClone(window.ans08Trace.topicPages)),forward=trace.filter(x=>x.options?.direction!=='prev'&&!x.indexing),flat=forward.flatMap(x=>x.ids),unique=[...new Set(flat)];
  assert.equal(unique.length,seed.count,'every Topic entry is reachable');assert.equal(flat.length,unique.length,'forward traversal has no duplicate entries');
  const domAfter=await page.locator('#topic-body [data-entry-id]').count();assert.ok(domAfter<=120,'clean DOM is bounded to about 3x40 entries');assert.equal(await page.locator('#topic-body [data-entry-id="'+firstId+'"]').count(),0,'early clean row is windowed out');

  const readsBeforeReturn=await page.evaluate(()=>window.ans08Trace.topicPages.length);
  await sentinel.scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,0));
  await eventually(async()=>await page.locator('#topic-body [data-entry-id="'+firstId+'"]').count()===1,'loaded window rematerializes upward',30000);
  assert.equal(await page.evaluate(()=>window.ans08Trace.topicPages.length),readsBeforeReturn,'revisiting an already loaded window does not re-read the server');
  assert.ok(await page.locator('#topic-body [data-entry-id]').count()<=120);

  await page.locator('#topic-outline>summary').click();const deepSection='ANS08 section 0011';await page.locator('#topic-section-nav').getByRole('button',{name:deepSection,exact:true}).click();
  await eventually(async()=>await page.locator('.topic-section').filter({hasText:deepSection}).count()===1,'deep section seek',20000);

  const beforeSort=await visibleAnchor(page);assert.ok(beforeSort?.id);await page.locator('[data-reading-sort=desc]').click();
  await eventually(async()=>await page.locator('#topic-body [data-entry-id="'+beforeSort.id+'"]').count()===1,'sort keeps content anchor',20000);
  const afterSort=await page.locator('#topic-body [data-entry-id="'+beforeSort.id+'"]').evaluate(n=>({top:n.getBoundingClientRect().top}));assert.ok(Math.abs(afterSort.top-beforeSort.top)<180,'sort retains visible anchor');

  const beforeBack=await visibleAnchor(page);await page.locator('#back').click();await eventually(async()=>await page.locator('[data-topic-id="'+seed.topicId+'"]').count()===1,'back to root',20000);await page.locator('[data-topic-id="'+seed.topicId+'"]').click();
  await eventually(async()=>await page.locator('#topic-body [data-entry-id="'+beforeBack.id+'"]').count()===1,'topic return anchor',30000);

  const perf=await page.evaluate(async topicId=>{
   const call=async options=>{const r=await chrome.runtime.sendMessage({type:'TOPIC_DOCUMENT_PAGE',options});if(!r?.ok)throw Error(r?.error||'RPC_FAILED');return r.data;},first=await call({topicId,sort:'asc',limit:40}),cursor=first.nextCursor,samples=[];let operations=null;
   if(!cursor)throw Error('NO_CURSOR');for(let i=0;i<30;i++){const at=performance.now(),next=await call({topicId,sort:'asc',cursor,limit:40});samples.push(performance.now()-at);operations=next.operations;}const sorted=[...samples].sort((a,b)=>a-b);return {p95:sorted[Math.ceil(sorted.length*.95)-1],operations,samples};
  },seed.topicId);
  assert.ok(perf.p95<=750,'warmed Topic next-chunk p95 <= 750 ms');assert.equal(perf.operations.buildRowsScanned,0);assert.ok(perf.operations.descriptorRowsRead<=40);

  await mkdir('work/ans-08',{recursive:true});await page.screenshot({path:'work/ans-08/topic-continuous.png',fullPage:true});
  const evidence={entries:seed.count,forwardReachable:unique.length,domAfter,upwardRematerialized:true,serverReadsOnLoadedReturn:0,deepSection:true,sortAnchor:true,returnAnchor:true,p95:perf.p95,operations:perf.operations,externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,deepSeekRequests:h.deepSeekRequests.length};
  await writeFile('work/ans-08/topic-continuous.json',JSON.stringify(evidence,null,2));console.log('ANS08_CONTINUOUS_EVIDENCE '+JSON.stringify(evidence));
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{await page.evaluate(()=>window.ans08RestoreSend?.()).catch(()=>{});await h.close();}
});
