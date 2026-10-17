import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
const visibleAnchor=page=>page.evaluate(()=>{const rows=[...document.querySelectorAll('#topic-body [data-entry-id]')],node=rows.find(x=>{const r=x.getBoundingClientRect();return r.bottom>140&&r.top<innerHeight;})||rows[0];return node?{id:node.dataset.entryId,top:node.getBoundingClientRect().top,scrollY}:null;});

// Fixture-only worker observation: no module imports, RPC responses, business
// reads or storage.get wrapping. This records observed transaction windows,
// not method phases, store queue wait, or a performance acceptance substitute.
function installAns08PerformanceDiagnostics({topicId}){
 const report={schema:2,status:'UNAVAILABLE',instrumented:false,probeOverheadMs:'UNKNOWN',sampleLimit:30,pendingLimit:128,
  scope:'OBSERVED_READONLY_TRANSACTION_WINDOWS_NOT_AUTHORITY_OR_ACCEPTANCE',observationErrors:0,
  timingCaveats:['Probe overhead is included in the original RPC timings.','Original listeners may start transactions before this observer; those are not counted.','Other worker work within a request-start window may be included; this does not prove causality.','Transaction durations can overlap and are not additive page time.','The last window closes at diagnostic collection, not at the original RPC response.'],samples:[]};
 const prototype=globalThis.IDBDatabase?.prototype,descriptor=prototype&&Object.getOwnPropertyDescriptor(prototype,'transaction'),messages=globalThis.chrome?.runtime?.onMessage;
 if(globalThis.__ans08PerformanceDiagnostics){report.reason='ALREADY_INSTALLED';return report;}
 if(typeof descriptor?.value!=='function'||!descriptor.configurable||typeof messages?.addListener!=='function'||typeof messages?.removeListener!=='function'||typeof globalThis.IDBTransaction?.prototype?.addEventListener!=='function'||typeof globalThis.IDBTransaction?.prototype?.removeEventListener!=='function'){report.reason='CAPABILITY_UNAVAILABLE';return report;}
 const original=descriptor.value,pending=new Set(),now=()=>performance.now();let active=null,windowStart=0,wrapped=false,enabled=true;
 const finishWindow=()=>{if(active)active.observedWindowMs=now()-windowStart;};
 const observe=message=>{
  try{
   const options=message?.options;
   if(message?.type==='TOPIC_DOCUMENT_PAGE'&&options?.topicId===topicId&&options.cursor&&options.sort==='asc'&&options.limit===40){
    finishWindow();active=null;
    if(report.samples.length<30){windowStart=now();active={index:report.samples.length,readonlyTransactions:0,completed:0,aborted:0,pending:0,droppedObservations:0,otherMessages:0,transactionTotalMs:0,transactionMaxMs:0,firstTransactionOffsetMs:null,lastSettlementOffsetMs:null};report.samples.push(active);}
   }else if(active)active.otherMessages++;
  }catch{report.observationErrors++;}
  return false; // Never a Promise, response, or claim on the message channel.
 };
 const restore=()=>{
  enabled=false;finishWindow();active=null;let failed=false;
  try{messages.removeListener(observe);}catch{failed=true;}
  if(wrapped)try{Object.defineProperty(prototype,'transaction',descriptor);wrapped=false;}catch{failed=true;}
  for(const remove of pending)try{remove();}catch{failed=true;}
  pending.clear();report.cleanup=failed?'FAILED':'RESTORED';if(failed)report.status='CLEANUP_FAILED';
 };
 try{
  Object.defineProperty(prototype,'transaction',{...descriptor,value:function(...args){
   const transaction=Reflect.apply(original,this,args); // Preserve native this, args, return and throw.
   const sample=enabled&&active;
   if(sample)try{
    if(transaction.mode==='readonly'){
     sample.readonlyTransactions++;
     if(pending.size>=128){sample.droppedObservations++;return transaction;}
     const at=now();sample.firstTransactionOffsetMs??=at-windowStart;let settled=false;
     const remove=()=>{transaction.removeEventListener('complete',complete);transaction.removeEventListener('abort',abort);pending.delete(remove);};
     const settle=aborted=>{if(settled)return;settled=true;try{const elapsed=now()-at;sample.pending--;sample[aborted?'aborted':'completed']++;sample.transactionTotalMs+=elapsed;sample.transactionMaxMs=Math.max(sample.transactionMaxMs,elapsed);sample.lastSettlementOffsetMs=now()-sampleStart;}catch{report.observationErrors++;}finally{try{remove();}catch{report.observationErrors++;}}};
     const sampleStart=windowStart,complete=()=>settle(false),abort=()=>settle(true);
     pending.add(remove);sample.pending++;
     try{transaction.addEventListener('complete',complete);transaction.addEventListener('abort',abort);}catch{sample.pending--;sample.droppedObservations++;try{remove();}catch{}report.observationErrors++;}
    }
   }catch{report.observationErrors++;}
   return transaction;
  }});wrapped=true;
  messages.addListener(observe);
  report.status='INSTALLED';report.instrumented=true;
  globalThis.__ans08PerformanceDiagnostics={report,restore};
 }catch{report.reason='SETUP_FAILED';restore();}
 return {status:report.status,instrumented:report.instrumented,reason:report.reason,cleanup:report.cleanup};
}


// A transaction window can contain background work after the measured RPC.
// Stop admission and restore immediately: never wait for unrelated transactions
// or call a censored duration complete. Original RPC/performance gates are separate.
function collectAns08PerformanceDiagnostics(setup){
 const state=globalThis.__ans08PerformanceDiagnostics;
 if(!state)return {...setup,status:'UNAVAILABLE',reason:setup.reason??'OBSERVER_LOST',samples:[]};
 try{
  state.restore();const report=state.report;
  report.pendingAtCutoff=report.samples.reduce((sum,sample)=>sum+sample.pending,0);
  report.collectionBoundary='AFTER_ORIGINAL_RPC_SAMPLES_STOP_AND_RESTORE';
  for(const sample of report.samples)sample.censoredTransactions=sample.pending;
  report.status=report.cleanup!=='RESTORED'?'CLEANUP_FAILED':report.observationErrors||report.samples.length!==30||report.samples.some(sample=>sample.readonlyTransactions===0||sample.droppedObservations)?'INCOMPLETE':report.pendingAtCutoff?'OBSERVED_CENSORED':'OBSERVED';
  return report;
 }finally{delete globalThis.__ans08PerformanceDiagnostics;}
}

test('ANS-08 Chrome Topic Reader is continuous, bidirectional, windowed and Provider-free',{timeout:180000},async t=>{
 const h=await FakeChatGPT.start({headless:true}),page=h.archive;
 try{
  await page.setViewportSize({width:1280,height:720});
  await page.locator('#enable-consent').waitFor({state:'visible'});await page.locator('#enable-consent').click();
  const seed=await page.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),pad=n=>String(n).padStart(4,'0'),rank=n=>String(n*1024).padStart(12,'0');
   s.clock=()=> '2026-01-01T00:00:00.000Z';
   const topic=await s.createTopic({name:'ANS08_CONTINUOUS_TOPIC',operationId:op()}),sectionIds=[topic.sectionId],sections=[];
   for(let i=1;i<12;i++){const section=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'ANS08 section '+pad(i),rank:rank(i+1),operationId:op()});sectionIds.push(section.sectionId);sections.push({id:section.sectionId,title:'ANS08 section '+pad(i),ids:[]});}
   // Freeze actual original-writer expression receipts. A cloned createdAt is
   // not chronology authority, and unknown dates must not fake one year.
   const defaultIds=[];
   for(let i=0;i<440;i++){
    const sectionIndex=i<240?0:1+(i-240)%11;
    s.clock=()=>new Date(Date.UTC(2026,0,1)+i*1000).toISOString();
    const entry=await s.continueThinking({operationId:op(),body:'ANS08 body '+pad(i),topicId:topic.id,sectionId:sectionIds[sectionIndex]});
    (sectionIndex===0?defaultIds:sections[sectionIndex-1].ids).push(entry.id);
   }
   await s.repository.close();return {topicId:topic.id,defaultSectionId:topic.sectionId,count:440,defaultCount:240,defaultIds,sections,deepSectionId:sections.at(-1).id};
  });

  await page.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.ans08Trace={topicPages:[],tracked:[]};window.ans08RestoreSend=()=>chrome.runtime.sendMessage=send;
   chrome.runtime.sendMessage=(message,...args)=>{const out=send(message,...args);return Promise.resolve(out).then(result=>{if(message?.type==='GET_LIBRARY_SECTION_READING'&&message.options?.limit===40&&result?.ok)window.ans08Trace.topicPages.push({options:structuredClone(message.options||{}),ids:(result.data?.items||[]).map(x=>x.entry.id),operations:result.data?.operations||null,indexing:result.data?.indexing===true});if(message?.type==='GET_LIBRARY_TRACKED_ENTRIES')window.ans08Trace.tracked.push(message.options?.ids?.length||0);return result;});};
  });

  await page.locator('[data-view=thoughts]').click();
  await eventually(async()=>await page.locator('.personal-topic-link[data-topic-id="'+seed.topicId+'"]').count()===1,'topic root',30000);
  await page.locator('.personal-topic-link[data-topic-id="'+seed.topicId+'"]').click();
  await eventually(async()=>await page.locator('#topic-body [data-entry-id]').count()>0,'topic initial rows',30000);
  // Named Sections have real human ranks before the default. Select the
  // large original scope explicitly; keep its initial40 read in the trace.
  await page.locator('.topic-section-directory button[data-section-id="'+seed.defaultSectionId+'"]').click();
  await eventually(async()=>await page.locator('.topic-section-directory button[data-section-id="'+seed.defaultSectionId+'"]').getAttribute('aria-current')==='true'&&await page.locator('#topic-body .topic-section[data-section-id="'+seed.defaultSectionId+'"] [data-entry-id]').count()===40,'selected large default Section initial40',30000);
  assert.equal(await page.locator('#topic-next').count(),0);assert.equal(await page.locator('#topic-previous').count(),0);assert.doesNotMatch(await page.locator('#thought-document').innerText(),/下一部分|上一部分/);

  const initialIds=await page.locator('#topic-body .topic-section[data-section-id="'+seed.defaultSectionId+'"] [data-entry-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.entryId)),firstId=initialIds[0],sentinel=page.locator('#topic-continuous-after');
  assert.equal(initialIds.length,40,'the selected scope initially mounts the original40 members');
  for(let i=0;i<12;i++){
   const before=await page.evaluate(()=>window.ans08Trace.topicPages.length),status=await page.locator('#topic-continuous-after-status').textContent();if(/末尾/.test(status))break;
   await sentinel.focus();await sentinel.press('Enter');
   await eventually(async()=>await page.evaluate(n=>window.ans08Trace.topicPages.length>n,before)||/末尾/.test(await page.locator('#topic-continuous-after-status').textContent()),'next continuous chunk',20000);
  }
  await eventually(async()=>/末尾/.test(await page.locator('#topic-continuous-after-status').textContent()),'topic terminal',30000);
  const trace=await page.evaluate(()=>structuredClone(window.ans08Trace.topicPages)),forward=trace.filter(x=>x.options?.scopeSectionId===seed.defaultSectionId&&x.options?.direction!=='prev'&&!x.options?.anchorId&&!x.indexing),flat=forward.flatMap(x=>x.ids),unique=[...new Set(flat)];
  assert.equal(unique.length,seed.defaultCount,'every Entry of the selected large default Section is reachable');assert.equal(flat.length,unique.length,'forward traversal has no duplicate entries');
  // Expression pages scan the global bounded descriptor window before
  // qualifying this Section, so earlier sibling-only windows legitimately
  // carry no items. Keep them in trace; the first material page must match
  // the exact40 originally mounted by this selected scope.
  assert.deepEqual(forward.find(row=>row.ids.length)?.ids,initialIds,'the selected scope initial40 stays part of its complete traversal');assert.deepEqual([...unique].sort(),[...seed.defaultIds].sort(),'the large traversal contains the exact original default members');
  const domAfter=await page.locator('#topic-body [data-entry-id]').count();assert.ok(domAfter<=120,'clean DOM is bounded to about 3x40 entries');assert.equal(await page.locator('#topic-body [data-entry-id="'+firstId+'"]').count(),0,'early clean row is windowed out');

  const readsBeforeReturn=await page.evaluate(()=>window.ans08Trace.topicPages.length);
  await sentinel.scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,0));
  await eventually(async()=>await page.locator('#topic-body [data-entry-id="'+firstId+'"]').count()===1,'loaded window rematerializes upward',30000);
  const refetches=await page.evaluate(n=>window.ans08Trace.topicPages.slice(n),readsBeforeReturn);assert.ok(refetches.length>0&&refetches.every(row=>row.options.anchorId&&row.options.expectedReadGeneration),'an evicted window refetches exact generation-bound refs rather than retaining all bodies');assert.ok(Number(await page.locator('#original-reading-body').getAttribute('data-retained-bodies'))<=120);
  assert.ok(await page.locator('#topic-body [data-entry-id]').count()<=120);

  // The real directory replaces retired Home/Reader search. Its twelve
  // independent scopes still expose the entire440-Entry corpus exactly once.
  assert.equal(await page.locator('#thought-search,#topic-search').count(),0);
  assert.equal(await page.locator('.topic-section-directory button').count(),12);
  const corpus=new Set(unique),controlsBefore=await rpc(page,'GET_ORGANIZER_CONTROLS');
  for(const section of seed.sections){
   await page.locator('.topic-section-directory button[data-section-id="'+section.id+'"]').click();
   await eventually(()=>page.locator('.topic-section-directory button[data-section-id="'+section.id+'"]').getAttribute('aria-current').then(value=>value==='true'),'selected original Section',20000);
   // Assert the real navigation's focus before deliberately moving focus to
   // the continuation sentinel below; paging must not be mistaken for arrival.
   await eventually(()=>page.locator('#topic-body .topic-section[data-section-id="'+section.id+'"]').evaluateAll(nodes=>nodes.length===1&&document.activeElement===nodes[0]),'native Section arrival focuses its actual scoped host',20000);
   for(let n=0;n<12;n++){
    if(/末尾/.test(await page.locator('#topic-continuous-after-status').textContent()))break;
    const before=await page.evaluate(()=>window.ans08Trace.topicPages.length);await sentinel.focus();await sentinel.press('Enter');
    await eventually(async()=>await page.evaluate(count=>window.ans08Trace.topicPages.length>count,before)||/末尾/.test(await page.locator('#topic-continuous-after-status').textContent()),'scoped Section continuation',20000);
   }
   await eventually(()=>page.locator('#topic-continuous-after-status').textContent().then(text=>/末尾/.test(text)),'actual Section boundary',30000);
   await eventually(()=>page.locator('#topic-body .topic-section[data-section-id="'+section.id+'"] [data-entry-id]').count().then(count=>count===section.ids.length),'all actual sibling Section rows',20000);
   // Initial Topic entry already read the first ranked named scope before
   // selecting default. Returning resumes that reader and rehydrates its
   // existing refs by anchor; retain its original forward page as well as
   // the later continuation, excluding only those duplicate anchor reads.
   const part=await page.evaluate(sectionId=>window.ans08Trace.topicPages.filter(row=>row.options.scopeSectionId===sectionId&&row.options.direction!=='prev'&&!row.indexing&&!row.options.anchorId).flatMap(row=>row.ids),section.id);
   assert.equal(part.length,section.ids.length,'one forward scoped traversal retains every Section member');assert.equal(new Set(part).size,part.length,'each Section traversal has no duplicate Entry');
   assert.deepEqual([...part].sort(),[...section.ids].sort());
   for(const id of part){assert.equal(corpus.has(id),false,'directory scopes do not leak or repeat sibling Entries');corpus.add(id);}
   assert.equal(await page.locator('#topic-body .topic-section').count(),1,'only the selected Section is mounted');
  }
  assert.equal(corpus.size,seed.count,'all440Entries across12actualSections remain reachable');
  const deep=seed.sections.at(-1),deepSection=deep.title,deepSectionId=deep.id;
  const activeDirectory=page.locator('.topic-section-directory button[data-section-id="'+deepSectionId+'"]'),activeHost=page.locator('#topic-body .topic-section[data-section-id="'+deepSectionId+'"]');
  assert.equal(await activeDirectory.textContent(),deepSection,'the actual selected directory retains the full Section label');assert.equal(await activeDirectory.getAttribute('aria-current'),'true');
  assert.equal(await activeHost.locator(':scope > .section-heading,:scope > h2').count(),0,'selected prose does not repeat the Section headline');
  assert.equal(await page.locator('.topic-section[data-section-id="'+deepSectionId+'"] [data-entry-id]').first().getAttribute('data-entry-id'),deep.ids.at(-1),'the selected Section starts at its real newest qualified expression');
  assert.equal(await page.locator('#topic-order-toggle').count(),1,'approved chronology retains its original compact owner');
  assert.equal((await rpc(page,'GET_ORGANIZER_CONTROLS')).readingSort,controlsBefore.readingSort,'Section selection does not rewrite global reading preference');
  const sectionAnchor=await visibleAnchor(page);assert.ok(sectionAnchor?.id);
  await page.locator('.topic-section-directory button[data-section-id="'+deepSectionId+'"]').evaluate(node=>node.focus({preventScroll:true}));const afterDirectoryFocus=await visibleAnchor(page);assert.equal(afterDirectoryFocus?.id,sectionAnchor.id);assert.ok(Math.abs(afterDirectoryFocus.top-sectionAnchor.top)<=2,'directory focus preserves the Section pixel anchor');await page.keyboard.press('Escape');
  assert.equal((await visibleAnchor(page))?.id,sectionAnchor.id,'closing an idle directory interaction preserves current reading anchor');

  const beforeBack=await visibleAnchor(page);await page.locator('#back').click();await eventually(async()=>await page.locator('.personal-topic-link[data-topic-id="'+seed.topicId+'"]').count()===1,'back to root',20000);await page.locator('.personal-topic-link[data-topic-id="'+seed.topicId+'"]').click();
  await eventually(async()=>await page.locator('#topic-body [data-entry-id]').count()>0,'Topic reopens with readable entries',30000);
  // The historical 2026-10-06 owner defer is retained in prior receipts. The
  // current durable-Section route now runs the original return-anchor assertion;
  // separate current-route tests additionally verify revision/text offset.
  await t.test('ANS-08 current durable-Section Topic return position',async()=>{
   await eventually(async()=>await page.locator('#topic-body [data-entry-id="'+beforeBack.id+'"]').count()===1,'topic return anchor',30000);
  });

  // Keep the original one warmup RPC, then install observers before the same 30 calls.
  const warmedCursor=await page.evaluate(async topicId=>{
   const r=await chrome.runtime.sendMessage({type:'TOPIC_DOCUMENT_PAGE',options:{topicId,sort:'asc',limit:40}});if(!r?.ok)throw Error(r?.error||'RPC_FAILED');
   if(!r.data.nextCursor)throw Error('NO_CURSOR');return r.data.nextCursor;
  },seed.topicId);
  const performanceWorker=h.context.serviceWorkers().find(worker=>worker.url()===`chrome-extension://${h.extensionId}/background/service-worker.js`);
  let diagnosticSetup={status:'UNAVAILABLE',reason:'WORKER_UNAVAILABLE'},diagnosticError;
  try{if(performanceWorker)diagnosticSetup=await performanceWorker.evaluate(installAns08PerformanceDiagnostics,{topicId:seed.topicId});}
  catch{diagnosticSetup={status:'UNAVAILABLE',reason:'SETUP_EVALUATION_FAILED'};}
  if(diagnosticSetup.status!=='INSTALLED')diagnosticError=new Error('ANS08_DIAGNOSTICS_SETUP_UNAVAILABLE');
  let perf,perfError;
  try{perf=await page.evaluate(async({topicId,cursor})=>{
   const call=async options=>{const r=await chrome.runtime.sendMessage({type:'TOPIC_DOCUMENT_PAGE',options});if(!r?.ok)throw Error(r?.error||'RPC_FAILED');return r.data;},samples=[];let operations=null;
   for(let i=0;i<30;i++){const at=performance.now(),next=await call({topicId,sort:'asc',cursor,limit:40});samples.push(performance.now()-at);operations=next.operations;}const sorted=[...samples].sort((a,b)=>a-b);return {p95:sorted[Math.ceil(sorted.length*.95)-1],operations,samples};
  },{topicId:seed.topicId,cursor:warmedCursor});}catch(error){perfError=error;}finally{
   try{
    const diagnostics=performanceWorker?await performanceWorker.evaluate(collectAns08PerformanceDiagnostics,diagnosticSetup):{...diagnosticSetup,samples:[]};
    if(!['OBSERVED','OBSERVED_CENSORED'].includes(diagnostics.status))diagnosticError=new Error('ANS08_DIAGNOSTICS_NOT_COMPLETE');
    await mkdir('work/ans-08',{recursive:true});
    await writeFile('work/ans-08/topic-performance-worker.json',JSON.stringify(diagnostics,null,2));
   }catch(error){diagnosticError=error;try{await mkdir('work/ans-08',{recursive:true});await writeFile('work/ans-08/topic-performance-worker.json',JSON.stringify({status:'UNAVAILABLE',reason:'COLLECTION_FAILED',setup:diagnosticSetup,samples:[]},null,2));}catch{}if(perfError)console.error('ANS08_DIAGNOSTIC_COLLECTION_FAILED; original RPC error preserved');}
  }
  if(perfError)throw perfError;
  await mkdir('work/ans-08',{recursive:true});
  await writeFile('work/ans-08/topic-performance.json',JSON.stringify(perf,null,2));
  console.log('ANS08_TOPIC_PERFORMANCE '+JSON.stringify(perf));
  assert.ok(perf.p95<=750,'warmed Topic next-chunk p95 <= 750 ms');assert.equal(perf.operations.buildRowsScanned,0);assert.ok(perf.operations.descriptorRowsRead<=40);
  const sectionPerf=await page.evaluate(async({topicId,scopeSectionId})=>{
   const call=async options=>{const r=await chrome.runtime.sendMessage({type:'GET_LIBRARY_SECTION_READING',options});if(!r?.ok)throw Error(r?.error||'RPC_FAILED');return r.data;},first=await call({topicId,scopeSectionId,limit:40}),cursor=first.nextCursor,samples=[],operationSamples=[];let operations=null;
   if(!cursor)throw Error('NO_SECTION_CURSOR');for(let i=0;i<30;i++){const at=performance.now(),next=await call({topicId,scopeSectionId,cursor,limit:40});samples.push(performance.now()-at);operations=next.operations;operationSamples.push(operations);}const sorted=[...samples].sort((a,b)=>a-b);return {p95:sorted[Math.ceil(sorted.length*.95)-1],operations,samples,operationSamples};
  },{topicId:seed.topicId,scopeSectionId:seed.defaultSectionId});
  await writeFile('work/ans-08/section-performance.json',JSON.stringify(sectionPerf,null,2));
  console.log('ANS08_SECTION_PERFORMANCE '+JSON.stringify(sectionPerf));
  assert.ok(sectionPerf.p95<=750,'actual warmed Section next-chunk p95 <= 750 ms');assert.equal(sectionPerf.operationSamples.length,30);for(const sample of sectionPerf.operationSamples){assert.ok(sample.placementCandidates<=40);assert.ok(sample.hydratedEntries<=40);}


  await mkdir('work/ans-08',{recursive:true});await page.screenshot({path:'work/ans-08/topic-continuous.png',fullPage:true});
  const evidence={entries:seed.count,forwardReachable:corpus.size,selectedSectionReachable:unique.length,actualSections:12,domAfter,upwardRematerialized:true,serverReadsOnLoadedReturn:refetches.length,boundedBodyRefetch:true,deepSection:true,durableSectionEntry:true,readingPreferenceUnchanged:true,returnAnchor:beforeBack.id,readableAfterReturn:true,deferredChecks:[],p95:perf.p95,operations:perf.operations,sectionPerf,externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,deepSeekRequests:h.deepSeekRequests.length};
  await writeFile('work/ans-08/topic-continuous.json',JSON.stringify(evidence,null,2));console.log('ANS08_CONTINUOUS_EVIDENCE '+JSON.stringify(evidence));
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  if(diagnosticError)throw diagnosticError;
 }finally{await page.evaluate(()=>window.ans08RestoreSend?.()).catch(()=>{});await h.close();}
});
