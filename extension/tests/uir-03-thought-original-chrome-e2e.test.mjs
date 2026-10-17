import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
import {thoughtPrimary,openThoughtReadingOptions} from './harness/current-thought-navigation.mjs';
import {waitArchiveWindow} from './harness/archive-navigator.mjs';
import {installLibraryFixtureObservation,failWithBoundedEvidence} from './harness/uir03-worker-fixture.mjs';

const execFileAsync=promisify(execFile);
const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{
  const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
  assert.equal(response.ok,true,JSON.stringify(response));
  return response.data;
};
const nav=thoughtPrimary;

async function ready(h){
  const page=h.archive;
  h.libraryWorker=h.context.serviceWorkers().find(worker=>worker.url()===`chrome-extension://${h.extensionId}/background/service-worker.js`);assert.ok(h.libraryWorker,'the original native worker is running');
  await h.libraryWorker.evaluate(installLibraryFixtureObservation);
  await rpc(page,'GET_STATUS');
  await eventually(()=>h.libraryWorker.evaluate(()=>!!globalThis.__uir03Library?.owner),'observe the existing LibraryRunner through its ordinary wake');
  await h.libraryWorker.evaluate(()=>__uir03Library.restoreWake());
  const action=page.locator('#enable-consent');
  await action.waitFor({state:'visible'});
  await eventually(async()=>!(await action.isDisabled()),'UIR-03 consent action is available');
  await action.click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-03 consent is durable');
  if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
  return page;
}

async function seed(page,h,prefix){
  const names=[
    `${prefix} 一个足够长的稳定主题名称，用于验证标题自然换行而不是固定两行裁切`,
    `${prefix} 稳定主题二`,
    `${prefix} 稳定主题三`
  ];
  const topics=[];
  for(let i=0;i<names.length;i++){
    const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:names[i],operationId:op()}});
    topics.push({...topic,name:names[i]});
    await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${prefix}_THOUGHT_${i}_A 这是主题 ${i+1} 的第一段完整思想正文。\n它保留真实换行，不是卡片摘要。`}});
    await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${prefix}_THOUGHT_${i}_B 第二段正文用于连续阅读、日期和工具层级验证。`}});
  }
  topics[0].readingIds=(await rpc(page,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topics[0].id,sort:'asc',limit:40}})).items.map(x=>x.entry.id);
  for(let i=0;i<45;i++){
    const thought=await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topics[0].id,body:`${prefix}_LATER_${String(i).padStart(2,'0')} 独立留下的后续记录，保留原话与创建时间。`}});
    topics[0].readingIds.push(thought.id);
  }
  topics[0].unknownIds=[];
  for(let i=0;i<2;i++){
    const thought=await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topics[0].id,body:`${prefix}_UNKNOWN_${i} 这条旧记录没有可靠时间，原话和章节成员仍完整保留。`}});
    topics[0].unknownIds.push(thought.id);
  }
  // Synthesize legacy missing/invalid dates through the real repository only
  // in this isolated fixture; normal creation must retain its actual date.
  await h.libraryWorker.evaluate(async ({topicId,ids})=>{
    const {invalidateThoughtTopicIndex}=await import(chrome.runtime.getURL('core/thought-read-index.js'));
    const store=globalThis.__uir03Library.owner.store;
    await store.foundationWrite(async t=>{
      for(let i=0;i<ids.length;i++){const row=await t.get('thoughts',ids[i]);row.createdAt=i===0?null:'invalid legacy time';await t.put('thoughts',row);for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===ids[i]){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}}
      await invalidateThoughtTopicIndex(store,t,topicId,{sourceTime:true});
    });
  },{topicId:topics[0].id,ids:topics[0].unknownIds});
  topics[0].summary=`${prefix} 这是保留完整来源表达的真实内容线索。 `.repeat(40);
  const current=await rpc(page,'GET_LIBRARY_TOPIC',{id:topics[0].id});
  topics[0].defaultSectionId=current.defaultSectionId;assert.equal(typeof topics[0].defaultSectionId,'string','fixture reads the canonical default Section identity');
  await rpc(page,'EDIT_LIBRARY_TOPIC',{edit:{id:current.id,expectedRevision:current.revision,changes:{summary:topics[0].summary},operationId:op()}});
  await rpc(page,'RECORD_TOPIC_READ',{id:topics[1].id});
  return topics;
}

async function shot(page,name,{fullPage=true}={}){
  await mkdir('work/ux-r3',{recursive:true});
  await page.screenshot({path:`work/ux-r3/${name}.png`,fullPage});
}

async function assertOffline(h){
  assert.equal(h.deepSeekRequests.length,0,'UIR-03 home/original journey makes no Provider request');
  assert.equal(h.extensionNetworkRequests,0,'UIR-03 home/original journey makes no extension external request');
  assert.equal(h.externalRequests,0,'UIR-03 home/original journey makes no unexpected external request');
  assert.deepEqual(h.errors,[]);
}


// Failure-only metadata for the real Section boundary action. Forward the
// existing owner methods unchanged; no body, Source text or Provider data.
async function installSectionBoundaryEvidence(page,variant){
 await page.evaluate(async variant=>{
  const {ThoughtWorkspace}=await import(chrome.runtime.getURL('ui/thoughts.js')),events=[];
  const trace=globalThis.__uir03SectionBoundary={variant,owner:null,events};
  trace.snapshot=()=>{
   const owner=trace.owner,reader=owner?.topicReader,button=document.getElementById('topic-next-year'),rect=button?.getBoundingClientRect(),style=button?getComputedStyle(button):null,body=document.getElementById('original-reading-body');
   const editor=value=>value?{dirty:value.dirty?.(),saving:!!value.saving,composing:!!(value.composing||value.surface?.composing||value.entry?.surface?.composing)}:null;
   return {topicId:owner?.id,sectionId:owner?.activeSectionId,provider:owner?.topicProviderKey,selectedProvider:document.getElementById('topic-source-scope')?.value,serial:owner?.serial,intent:owner?.openIntent,view:owner?.view,annualBusy:!!owner?.annualTransitionBusy,refresh:owner?.refreshRun?{queued:owner.refreshRun.queued}:null,
    reader:reader?{scope:reader.scopeSectionId,provider:reader.providerKey,ids:reader.items.map(row=>row.entry.id),reportedTerminalPrevious:reader.state().terminalPrevious,currentYear:reader.currentYear,nextYear:reader.nextYear,openedYears:reader.openedYears,indexing:reader.indexing,initialized:reader.initialized,terminalNext:reader.terminalNext,terminalPrevious:reader.terminalPrevious,loadingNext:reader.loadingNext,loadingPrevious:reader.loadingPrevious,hydrating:reader.hydrating,stale:reader.stale,references:reader.items.length,windowRevision:reader.windowRevision,bodyRevision:reader.bodyRevision,errorNext:reader.errorNext?.code||reader.errorNext?.message||null,errorPrevious:reader.errorPrevious?.code||reader.errorPrevious?.message||null}:null,
    button:button?{hidden:button.hidden,disabled:button.disabled,connected:button.isConnected,display:style.display,visibility:style.visibility,rect:{top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height}}:null,
    frontier:{terminal:document.getElementById('topic-continuous-after')?.dataset.terminal,hidden:document.getElementById('topic-continuous-after')?.hidden},documentState:document.getElementById('thought-document')?.dataset.state,inert:document.getElementById('topic-body')?.inert,bodyHidden:body?.hidden,mounted:body?.querySelectorAll('[data-entry-id]').length||0,mountedIds:[...body?.querySelectorAll('[data-entry-id]')||[]].map(node=>node.dataset.entryId),before:{hidden:document.getElementById('topic-continuous-before')?.hidden,terminal:document.getElementById('topic-continuous-before')?.dataset.terminal},sections:[...body?.querySelectorAll('.topic-section')||[]].map(node=>node.dataset.sectionId),active:{tag:document.activeElement?.tagName,id:document.activeElement?.id,entryId:document.activeElement?.closest('[data-entry-id]')?.dataset.entryId,editable:document.activeElement?.contentEditable},editors:{editor:editor(owner?.editor),ai:editor(owner?.aiEditor),dialog:editor(owner?.dialogEditor)},writer:owner?.sectionEndWriter?{hasDraft:owner.sectionEndWriter.hasDraft(),connected:owner.sectionEndWriter.field?.isConnected}:null};
  };
  trace.record=(name,detail={})=>{try{events.push({at:performance.now(),name,detail,state:trace.snapshot()});if(events.length>64)events.shift();}catch(error){events.push({name,diagnosticError:String(error)});if(events.length>64)events.shift();}};
  for(const name of ['open','flushEditors','createTopicReader','updateTopicContinuous','openNextTopicYear']){
   const original=ThoughtWorkspace.prototype[name];ThoughtWorkspace.prototype[name]=function(...args){trace.owner=this;trace.record(name+':start');const result=original.apply(this,args);trace.record(name+':returned');if(['open','flushEditors','openNextTopicYear'].includes(name)&&result?.then)result.then(value=>trace.record(name+':settled',{value}),error=>trace.record(name+':rejected',{code:error?.code,name:error?.name}));return result;};
  }
  document.addEventListener('click',event=>{if(event.target.closest?.('#topic-next-year'))trace.record('year-click',{trusted:event.isTrusted});},true);
  document.addEventListener('change',event=>{if(event.target.id==='topic-source-scope')trace.record('source-change',{selected:event.target.value,trusted:event.isTrusted});},true);
  new MutationObserver(records=>{for(const record of records)if(['topic-next-year','topic-body','original-reading-body','thought-document'].includes(record.target.id))trace.record('attribute:'+record.attributeName,{id:record.target.id});}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden','disabled','inert','data-state']});
 },variant);
}

async function provenanceRoleJourney(page,h,topics,{release=false}={}){
  const seeded=await h.libraryWorker.evaluate(async({topicId,prefix})=>{
    const store=globalThis.__uir03Library.owner.store;
      const status=await store.status(),chatId='vs05-role-'+crypto.randomUUID();
      await store.capture({epoch:status.epoch,adapterVersion:'0.3.0',chat:{id:chatId,url:'https://chatgpt.com/c/'+chatId,title:'VS05 synthetic provenance'},
        messages:[['primary','主要表达'],['supporting','补充表达'],['context_only','辅助上下文表达']].map(([role,text],index)=>({sourceMessageId:role,pageOrder:index+1,originalText:prefix+' '+text}))});
      await store.finishFoundation();
      const inputs=await store.run(()=>store.repository.transaction(false,async t=>{
        const result={};for(const block of await t.all('blocks')){const record=await t.get('records',block.value.originalTextReference);if(record?.value?.originalText?.startsWith(prefix+' '))result[record.value.originalText]=block.value.id;}return result;
      }));
      const specs=[['primary','主要表达'],['supporting','补充表达'],['context_only','辅助上下文表达']].map(([role,text])=>({inputId:inputs[prefix+' '+text],role,selectedFields:['body']}));
      const evidence=await store.evidenceFor(specs),entry=await store.createEntry({operationId:crypto.randomUUID(),actor:'user',body:prefix+' 保留人工表达，同时区分直接来源和辅助上下文。',type:'idea',formation:'synthesized',evidence});
      const topic=await store.topic(topicId);
      const placed=await store.placeEntry({entryId:entry.id,topicId,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,operationId:crypto.randomUUID()});
      if(placed.conflict)throw Error('synthetic provenance placement conflict');
      return {id:entry.id,chatId,roles:specs.map(({role,inputId})=>({role,inputId})),sourceRecordIds:[...new Set(evidence.flatMap(row=>row.sourceRecordIds))]};
  },{topicId:topics[1].id,prefix:release?'VS05_ROLE_RELEASE':'VS05_ROLE_SOURCE'});
  const {id}=seeded,before=await rpc(page,'GET_LIBRARY_ENTRY',{id});
  const destination=await rpc(page,'GET_LIBRARY_TOPIC',{id:topics[1].id});
  await installSectionBoundaryEvidence(page,release?'release':'source');
  await page.setViewportSize({width:1440,height:900});
  try{
   await page.locator('#back').click();
   await eventually(()=>page.locator('#thought-list').isVisible(),'return to Topic scanning after original reading');
  }catch(error){
   const diagnostic=await page.evaluate(()=>({state:__uir03SectionBoundary.snapshot(),events:__uir03SectionBoundary.events,route:{space:document.body.dataset.paiaSpace,history:history.state,thoughtListHidden:document.getElementById('thought-list')?.hidden,thoughtDocumentHidden:document.getElementById('thought-document')?.hidden},dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>({id:n.id})),status:{save:document.getElementById('save-status')?.textContent}}));
   console.info('UIR03_BACK_FAILURE '+JSON.stringify(diagnostic));throw error;
  }
  await page.locator('.personal-topic-link[data-topic-id="'+topics[1].id+'"]').click();
  const entry=page.locator('#original-reading-body [data-entry-id="'+id+'"]');
  await eventually(()=>page.evaluate(({name,sectionId})=>{
    const doc=document.getElementById('thought-document'),body=document.getElementById('original-reading-body'),sections=[...(body?.querySelectorAll('.topic-section')||[])],rows=[...(body?.querySelectorAll('[data-entry-id]')||[])];
    return doc?.dataset.state==='ready'&&!document.getElementById('topic-body').inert&&document.querySelector('#topic-heading h1')?.textContent===name&&document.querySelector('.topic-section-select')?.value===sectionId&&sections.length===1&&sections[0].dataset.sectionId===sectionId&&rows.length>0&&rows.every(row=>row.dataset.sectionId===sectionId);
  },{name:destination.name,sectionId:destination.defaultSectionId}),'same canonical Topic and Section finish their qualified initial paint before traversal');
  // UX_CONTRACT section2.4 keeps this mixed-source synthesis undated; its
  // capture/derivation time cannot move it into the two real dated expressions.
  // Reach it through the existing Section's actual explicit year boundary.
  await exhaustSection(page,3);
  await entry.waitFor({state:'visible'});
  const sectionBefore=await page.locator('#original-reading-body [data-entry-id]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.entryId,sectionId:node.dataset.sectionId,body:node.querySelector('[data-entry-field="body"]').textContent})));
  const openedBefore=await page.evaluate(()=>[...__uir03SectionBoundary.owner.topicReader.openedYears]);
  // Current UX0 -> PRE_YEAR0 -> PRE_SECTION3 explicitly retires per-Entry
  // Source actions, including overflow. Preserve actual evidence via its
  // unchanged service and the existing deliberate raw-source destination.
  assert.equal(await entry.locator('.entry-provenance').getAttribute('open'),null);
  assert.equal(await entry.locator('.entry-provenance').evaluate(node=>node.hidden),true,'normal reading exposes no recurring provenance panel');
  await entry.locator('.library-actions summary').click();
  assert.equal(await entry.getByRole('button',{name:/^(来源|查看来源|查看依据|查看原文|查看输入)$/}).count(),0,'the retired per-Entry Source CTA is absent even in overflow');
  await page.keyboard.press('Escape');
  const provenance=await rpc(page,'GET_LIBRARY_PROVENANCE',{id});
  assert.deepEqual({count:provenance.count,primary:provenance.primary,supporting:provenance.supporting,contextOnly:provenance.contextOnly},{count:3,primary:1,supporting:1,contextOnly:1});
  const byRole=(a,b)=>a.role.localeCompare(b.role);
  assert.deepEqual(provenance.items.map(({role,inputId,availability})=>({role,inputId,availability})).sort(byRole),seeded.roles.map(row=>({...row,availability:'resolvable'})).sort(byRole),'all three exact original Inputs retain their distinct real evidence roles and resolvability');
  for(const item of provenance.items){assert.ok(Number.isSafeInteger(item.usedVersion));assert.equal(item.currentVersion,item.usedVersion,'each role still resolves the exact evidence version used');}
  const index=await rpc(page,'GET_PAGE',{page:{view:'archive',limit:100}}),documents=index.documents.filter(row=>row.sourceConversationId===seeded.chatId);
  assert.equal(documents.length,1,'the actual synthetic Source conversation has one raw-data identity');
  const sourceDocument=documents[0],sourcePage=await rpc(page,'GET_PAGE',{page:{view:'archive',documentId:sourceDocument.id,limit:100}});
  assert.deepEqual(new Set(sourcePage.records.map(row=>row.id)),new Set(seeded.sourceRecordIds),'all three captured original Source identities remain intact');
  assert.equal(sourcePage.records.length,3);assert.equal(new Set(seeded.roles.map(row=>row.inputId)).size,3);
  const originalInputs=await Promise.all(seeded.roles.map(row=>rpc(page,'GET_INPUT',{id:row.inputId})));
  assert.deepEqual(new Set(originalInputs.map(row=>row.id)),new Set(seeded.roles.map(row=>row.inputId)));
  assert.deepEqual(new Set(originalInputs.map(row=>row.originalTextReference)),new Set(seeded.sourceRecordIds),'each exact role Input still points to its actual captured original');
  await nav(page,'settings');await page.locator('[data-settings-group="data"]').click();await page.locator('#ux-settings-data-group').waitFor({state:'visible'});
  await page.locator('#settings-source-records').click();
  await eventually(()=>page.locator('body').getAttribute('data-paia-space').then(space=>space==='archive'),'the existing Settings raw-source destination opens through its real route');
  // The current Navigator intentionally hides the legacy conversation list.
  // Use its real disclosures/continuations, then prove the same canonical ID.
  const sourceWindow=await waitArchiveWindow(page,{text:sourceDocument.userTitle||sourceDocument.originalConversationTitle,label:'the actual synthetic raw Source conversation is reachable through its current Navigator'});
  assert.equal(await sourceWindow.getAttribute('data-document-id'),sourceDocument.id,'visible navigation resolves the exact original Source document, never a same-title substitute');
  await sourceWindow.click();
  await eventually(()=>page.locator('#document-body .archive-block').count().then(count=>count===3),'the actual raw Source reader renders all three synthetic originals');
  for(const original of sourcePage.records){
    const raw=page.locator('#document-body .archive-block[data-record-id="'+original.id+'"] .original-prose');
    assert.equal(await raw.isVisible(),true,'each exact original Source record is genuinely visible');
    assert.deepEqual(Buffer.from(await raw.textContent(),'utf8'),Buffer.from(original.originalText,'utf8'),'low-frequency inspection preserves exact original UTF-8 bytes');
    assert.equal(await raw.evaluate(node=>node.isContentEditable),false,'immutable Source is genuinely read-only');
  }
  const originalsAfter=await rpc(page,'GET_PAGE',{page:{view:'archive',documentId:sourceDocument.id,limit:100}});
  assert.deepEqual(originalsAfter.records,sourcePage.records,'raw-data inspection changes no original bytes, hashes, identity or timestamps');
  assert.deepEqual(await rpc(page,'GET_LIBRARY_PROVENANCE',{id}),provenance,'raw Source inspection preserves all role/version/availability bindings');
  assert.deepEqual(await Promise.all(seeded.roles.map(row=>rpc(page,'GET_INPUT',{id:row.inputId}))),originalInputs,'raw Source inspection does not rewrite the original role-bound Working Inputs');
  await shot(page,release?'vs05-release-raw-source-records':'vs05-source-raw-source-records');
  await nav(page,'thoughts');
  await page.locator('.personal-topic-link[data-topic-id="'+destination.id+'"]').click();
  await eventually(()=>page.evaluate(({name,sectionId})=>document.getElementById('thought-document')?.dataset.state==='ready'&&!document.getElementById('topic-body')?.inert&&document.querySelector('#topic-heading h1')?.textContent===name&&document.querySelector('.topic-section-select')?.value===sectionId&&[...document.querySelectorAll('#original-reading-body [data-entry-id]')].some(node=>node.dataset.sectionId===sectionId),{name:destination.name,sectionId:destination.defaultSectionId}),'raw-data inspection returns through the real same Topic and Section owner');
  await entry.waitFor({state:'visible'});
  assert.equal(await entry.locator('[data-entry-field="body"]').textContent(),before.body,'the exact restored Entry retains its canonical body before any traversal');
  await recoverOpenedSectionPrefix(page,destination,sectionBefore,openedBefore);
  await exhaustSection(page,3);await entry.waitFor({state:'visible'});
  assert.deepEqual(await page.locator('#original-reading-body [data-entry-id]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.entryId,sectionId:node.dataset.sectionId,body:node.querySelector('[data-entry-field="body"]').textContent}))),sectionBefore,'normal bidirectional reading recovers all three exact original IDs, order, Section and bodies');
  const after=await rpc(page,'GET_LIBRARY_ENTRY',{id});
  assert.equal(after.body,before.body);assert.equal(after.revision,before.revision,'deliberate source inspection never edits human content');
}


// An exact restored target can start in the last of already opened years.
// Recover that existing prefix only through the genuinely visible native edge.
async function recoverOpenedSectionPrefix(page,destination,expectedRows,openedYears){
 const expected=new Map(expectedRows.map(row=>[row.id,row])),before=page.locator('#topic-continuous-before');
 const state=()=>page.evaluate(()=>{const owner=globalThis.__uir03SectionBoundary?.owner,reader=owner?.topicReader,node=document.getElementById('topic-continuous-before');return {topicId:owner?.id,sectionId:owner?.activeSectionId,scope:reader?.scopeSectionId,view:owner?.view,openedYears:[...reader?.openedYears||[]],firstYear:reader?.items[0]?.readingYear,globalTerminalPrevious:reader?.state().terminalPrevious,loading:!!(reader?.loadingPrevious||reader?.loadingNext||reader?.hydrating),indexing:reader?.indexing,stale:reader?.stale,error:reader?.errorPrevious?.code||reader?.errorPrevious?.message||reader?.errorNext?.code||reader?.errorNext?.message||reader?.hydrationError?.message||null,beforeHidden:node?.hidden,terminal:node?.dataset.terminal,count:document.querySelectorAll('#original-reading-body [data-entry-id]').length};});
 try{
  for(let turn=0;turn<8;turn++){
   const current=await state();assert.equal(current.topicId,destination.id);assert.equal(current.sectionId,destination.defaultSectionId);assert.equal(current.scope,destination.defaultSectionId);assert.equal(current.view,'original');assert.deepEqual(current.openedYears,openedYears,'prefix traversal never opens an unrequested year');assert.equal(current.stale,false);assert.equal(current.error,null);
   const rows=await page.locator('#original-reading-body [data-entry-id]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.entryId,sectionId:node.dataset.sectionId,body:node.querySelector('[data-entry-field="body"]').textContent})));
   for(const row of rows)assert.deepEqual(row,expected.get(row.id),'every restored row keeps its exact original Section/body');
   if(rows.length===expectedRows.length)return;
   assert.ok(openedYears.indexOf(current.firstYear)>0,'only an earlier already-opened year can require this native previous action');
   await before.waitFor({state:'visible'});
   const ready=await state();if(ready.count===expectedRows.length)return;
   assert.equal(ready.beforeHidden,false);assert.equal(ready.globalTerminalPrevious,false,'the real current frontier permits reading an already-opened prefix');
   await before.focus();assert.equal(await page.evaluate(()=>document.activeElement?.id),'topic-continuous-before');
   await before.press('Enter');
   await eventually(async()=>{const next=await state();assert.equal(next.topicId,destination.id);assert.equal(next.sectionId,destination.defaultSectionId);assert.deepEqual(next.openedYears,openedYears);assert.equal(next.error,null);return next.count>rows.length&&!next.loading&&!next.indexing&&!next.stale;},'the trusted visible previous control paints more of the same already-opened Section',30000);
  }
  assert.fail('already-opened Section prefix did not reach its original bounded extent');
 }catch(error){try{const evidence=await page.evaluate(()=>{const trace=globalThis.__uir03SectionBoundary;return trace?{variant:trace.variant,events:trace.events,final:trace.snapshot()}:null;});await mkdir('work/ux-r3',{recursive:true});await writeFile(`work/ux-r3/uir03-opened-prefix-failure-${evidence?.variant||'unknown'}.json`,JSON.stringify({kind:'synthetic-body-free-native-prefix-diagnostic',error:{name:error.name,message:error.message,stack:error.stack},state:await state(),evidence},null,2));}catch(diagnosticError){console.error('UIR03_PREFIX_DIAGNOSTIC_FAILED',diagnosticError?.name||'Error');}throw error;}
}

// Traverse only this synthetic selected Section through its real page/year
// controls. Each later year needs its own visible explicit activation.
async function exhaustSection(page,expected){
 const after=page.locator('#topic-continuous-after'),nextYear=page.locator('#topic-next-year');
 for(let boundary=0;boundary<8;boundary++){
  await eventually(async()=>{await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));return await nextYear.isVisible()||await after.getAttribute('data-terminal')==='true';},'actual selected-year boundary completes',30000);
  if(await nextYear.isVisible()){
   const previousLabel=await nextYear.textContent();
   try{await nextYear.click();await eventually(()=>nextYear.evaluate((node,label)=>node.hidden||node.textContent!==label,previousLabel),'the explicit year boundary is consumed before another boundary action',30000);}
   catch(error){try{const evidence=await page.evaluate(()=>{const trace=globalThis.__uir03SectionBoundary;return trace?{variant:trace.variant,events:trace.events,final:trace.snapshot()}:null;});await mkdir('work/ux-r3',{recursive:true});await writeFile(`work/ux-r3/uir03-section-boundary-failure-${evidence?.variant||'unknown'}.json`,JSON.stringify({kind:'synthetic-body-free-boundary-diagnostic',error:{name:error.name,message:error.message,stack:error.stack},boundary,expected,evidence},null,2));}catch(diagnosticError){console.error('UIR03_BOUNDARY_DIAGNOSTIC_FAILED',diagnosticError?.name||'Error');}throw error;}
   continue;
  }
  // Terminal metadata can precede the native body paint of the admitted year.
  try{await eventually(()=>page.evaluate(expected=>document.getElementById('thought-document')?.dataset.state==='ready'&&!document.getElementById('topic-body')?.inert&&document.getElementById('topic-continuous-after')?.dataset.terminal==='true'&&document.getElementById('topic-next-year')?.hidden===true&&document.querySelectorAll('#original-reading-body [data-entry-id]').length===expected,expected),'the complete selected Section reaches its exact native painted extent',30000);}
  catch(error){try{const evidence=await page.evaluate(()=>{const trace=globalThis.__uir03SectionBoundary;return trace?{variant:trace.variant,events:trace.events,final:trace.snapshot()}:null;});await mkdir('work/ux-r3',{recursive:true});await writeFile(`work/ux-r3/uir03-section-terminal-failure-${evidence?.variant||'unknown'}.json`,JSON.stringify({kind:'synthetic-body-free-section-terminal-diagnostic',error:{name:error.name,message:error.message,stack:error.stack},boundary,expected,evidence},null,2));}catch(diagnosticError){console.error('UIR03_TERMINAL_DIAGNOSTIC_FAILED',diagnosticError?.name||'Error');}throw error;}
  assert.equal(await page.locator('#original-reading-body [data-entry-id]').count(),expected,'all real synthetic Section identities are mounted without skipping a year');return;
 }
 assert.fail('synthetic Section did not reach its bounded actual end');
}

// A native selection changes its value before the guarded Source read settles.
// Wait for that actual replacement reader, not the old scope's terminal DOM.
async function selectSettledTopicSource(page,scope,value,topic){
 await page.evaluate(()=>{const trace=globalThis.__uir03SectionBoundary;trace.previousSourceReader=trace.owner.topicReader;});
 try{
  await scope.selectOption(value);
  await eventually(()=>page.evaluate(({value,topicId,sectionId})=>{
   const trace=globalThis.__uir03SectionBoundary,owner=trace?.owner,reader=owner?.topicReader,select=document.getElementById('topic-source-scope'),provider=value||null;
   return !!reader&&reader!==trace.previousSourceReader&&owner.id===topicId&&owner.activeSectionId===sectionId&&reader.scopeSectionId===sectionId&&(owner.topicProviderKey??null)===provider&&(reader.providerKey??null)===provider&&select.value===value&&!select.disabled&&document.getElementById('thought-document')?.dataset.state==='ready'&&!document.getElementById('topic-body')?.inert&&reader.initialized&&!reader.indexing&&!reader.loadingNext&&!reader.loadingPrevious&&!reader.hydrating&&!reader.stale&&!reader.errorNext&&!reader.errorPrevious&&!reader.hydrationError&&[...document.querySelectorAll('#original-reading-body [data-entry-id]')].some(row=>row.dataset.sectionId===sectionId);
  },{value,topicId:topic.id,sectionId:topic.defaultSectionId}),'the native Source choice publishes its own qualified Topic/Section reader before year traversal',30000);
 }finally{await page.evaluate(()=>{delete globalThis.__uir03SectionBoundary?.previousSourceReader;});}
}

async function topicSourceScopeJourney(page,h,topics,{release=false}={}){
 const seeded=await h.libraryWorker.evaluate(async ({topicId,prefix})=>{
  const {ImportLedger}=await import(chrome.runtime.getURL('core/import/ledger.js'));
  const {ImportCoordinator}=await import(chrome.runtime.getURL('core/import/coordinator.js'));
  const {getOfficialExportAdapter}=await import(chrome.runtime.getURL('core/import/registry.js'));
  const store=globalThis.__uir03Library.owner.store;
   const ledger=new ImportLedger(store),coordinator=new ImportCoordinator({transport:(method,query)=>ledger[method](query,'vs05-browser-scope'),resolveAdapter:getOfficialExportAdapter});
   const id='vs05-browser-claude-'+crypto.randomUUID(),data=[{uuid:id,name:prefix+' Scope shared Claude',current_leaf_message_uuid:id+'-answer',chat_messages:[
    {uuid:id+'-human',sender:'human',created_at:'2026-01-02T03:04:05.000Z',parent_message_uuid:null,content:[{type:'text',text:prefix+' Scope shared Claude'}]},
    {uuid:id+'-answer',sender:'assistant',created_at:'2026-01-02T03:04:06.000Z',parent_message_uuid:id+'-human',content:[{type:'text',text:'Synthetic assistant excluded'}]}
   ]}];
   await coordinator.select(new Blob([JSON.stringify(data)]),{consent:true});await coordinator.preflight();await coordinator.commit();await store.finishFoundation();
   const inputs=await store.run(()=>store.repository.transaction(false,async t=>{
    const out={};for(const row of await t.all('blocks')){const record=await t.get('records',row.value.originalTextReference);if(record?.value?.originalText===prefix+' Scope shared Claude')out.claude=row.value.id;if(record?.value?.originalText===prefix+' 主要表达')out.chatgpt=row.value.id;}return out;
   }));
   const created={};
   for(const [name,specs]of [['claude',[['claude','primary']]],['mixed',[['chatgpt','primary'],['claude','supporting']]]]){
    const evidence=await store.evidenceFor(specs.map(([provider,role])=>({inputId:inputs[provider],role,selectedFields:['body']})));
    const entry=await store.createEntry({operationId:crypto.randomUUID(),actor:'user',body:prefix+' Scope shared '+name,type:'idea',formation:name==='mixed'?'synthesized':'explicit',evidence}),topic=await store.topic(topicId);
    const placed=await store.placeEntry({entryId:entry.id,topicId,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,operationId:crypto.randomUUID()});if(placed.conflict)throw Error('scope fixture conflict');created[name]=entry.id;
   }
   return created;
 },{topicId:topics[1].id,prefix:release?'VS05_ROLE_RELEASE':'VS05_ROLE_SOURCE'});
 const before=await Promise.all([seeded.claude,seeded.mixed].map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id})));
 const topicBefore=await rpc(page,'GET_LIBRARY_TOPIC',{id:topics[1].id});
 await page.reload();
 await installSectionBoundaryEvidence(page,release?'release':'source');
 await eventually(async()=>await page.locator('#thought-document').isVisible()&&await page.locator('#topic-heading h1').textContent()===topicBefore.name,'reload restores the same Topic reading route');
 await page.locator('#back').click();
 await eventually(async()=>await page.locator('.personal-topic-link[data-topic-id="'+topics[1].id+'"]').isVisible(),'explicit back returns to the same Topic in root scanning');
 await page.locator('.personal-topic-link[data-topic-id="'+topics[1].id+'"]').click();
 const scope=page.locator('#topic-source-scope'),body=page.locator('#original-reading-body');
 await eventually(async()=>await scope.locator('option[value="claude"]').count()===1,'real imported Claude source becomes selectable');
 await eventually(async()=>await scope.getAttribute('aria-busy')==='false','source selector completes the bounded provider-index build');
 const available=await rpc(page,'PAIA_ARCHIVE_NAV_PAGE',{page:{groupKind:'providers',limit:40,mode:'paia'}});
 assert.equal(available.coverage.state,'complete','selector waits for real source-index readiness');
 assert.ok(available.items.some(item=>item.providerKey==='claude'),'official imported source is present in the completed index');

 assert.equal(await page.locator('#thought-panel input[type="search"]').count(),0,'source selection does not revive retired Topic search');
 await openThoughtReadingOptions(page);await selectSettledTopicSource(page,scope,'claude',topicBefore);
 await exhaustSection(page,2);assert.equal(await body.locator('[data-entry-id="'+seeded.mixed+'"]').count(),1,'Claude view contains direct and mixed evidence only');
 assert.equal(await body.locator('[data-entry-id="'+seeded.claude+'"]').count(),1);
 assert.equal(await page.locator('[data-reading-start="asc"]').isDisabled(),true,'a source-scoped view cannot falsely use whole-Topic time endpoints');
 assert.match(await page.locator('#topic-search-count').textContent(),/当前来源内容/);
 // The lexical owner remains a compatibility service; the approved reader has no search UI.
 let lexical;await eventually(async()=>{lexical=await rpc(page,'GET_LIBRARY_SECTION_READING',{options:{topicId:topics[1].id,providerKey:'claude',query:'Scope shared claude',sort:'asc',limit:40}});return !lexical.indexing&&!lexical.cursorInvalid;},'real provider-scoped lexical owner completes');
 assert.deepEqual(lexical.items.map(item=>item.entry.id),[seeded.claude]);assert.equal(await scope.inputValue(),'claude');assert.equal(await body.locator('[data-entry-id]').count(),2,'compatibility query never filters the actual selected Section');
 await openThoughtReadingOptions(page);await selectSettledTopicSource(page,scope,'chatgpt',topicBefore);
 await exhaustSection(page,2);assert.equal(await body.locator('[data-entry-id="'+seeded.claude+'"]').count(),0,'ChatGPT view includes the mixed identity and existing role-bound expression');
 assert.equal(await body.locator('[data-entry-id="'+seeded.mixed+'"]').count(),1);
 await openThoughtReadingOptions(page);await selectSettledTopicSource(page,scope,'claude',topicBefore);
 await eventually(async()=>await body.locator('[data-entry-id="'+seeded.claude+'"]').count()===1);
 await page.locator('#back').click();await page.locator('.personal-topic-link[data-topic-id="'+topics[1].id+'"]').click();
 await eventually(async()=>await scope.inputValue()==='claude','return preserves actual provider scope');await exhaustSection(page,2);
 await openThoughtReadingOptions(page);await selectSettledTopicSource(page,scope,'',topicBefore);
 await exhaustSection(page,5);
 assert.equal(await page.locator('[data-reading-start="asc"]').isDisabled(),false);
 const after=await Promise.all([seeded.claude,seeded.mixed].map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id})));
 for(let i=0;i<before.length;i++){assert.equal(after[i].body,before[i].body);assert.equal(after[i].revision,before[i].revision);}

 await page.locator('#back').click();
 const rootScope=page.locator('#thought-source-scope'),rootList=page.locator('#thought-list'),blocks=rootList.locator('article.personal-topic-block');
 await eventually(async()=>await blocks.count()===3,'Root returns the same three independent Topic identities');
 assert.equal(await rootScope.isHidden(),true,'the retired Root Source control cannot create a second organization view');
 assert.equal(await page.locator('#thought-panel input[type="search"]').count(),0,'Root has no retired local Thought search');
 // Preserve the real source-scoped owner contract independently of the retired
 // Root selector. Topic reading above still exercises its actual visible UI.
 const scopedReads=[];
 const collectScoped=async options=>{
  const items=[],seen=new Set();let cursor=null,current;
  do{
   current=await rpc(page,'LIBRARY_INDEX_PAGE',{options:{mode:'stable',...options,cursor,limit:40}});
   scopedReads.push({query:!!options.query,provider:options.providerKey??null,cursor:!!cursor,next:!!current.nextCursor,cursorInvalid:current.cursorInvalid===true,complete:current.complete===true,indexing:current.indexing===true,items:current.items.length,placementRowsRead:current.operations?.placementRowsRead??null});if(scopedReads.length>64)scopedReads.shift();
   if(current.cursorInvalid)return {...current,items:[]};
   assert.ok(current.items.length<=40,'source compatibility keeps the existing request bound');assert.ok((current.operations?.placementRowsRead||0)<=40,'source admission reads at most40 placement descriptors per page');
   items.push(...current.items);cursor=current.nextCursor;
   if(cursor){const key=JSON.stringify(cursor);assert.equal(seen.has(key),false,'scoped continuation must make progress');seen.add(key);}
  }while(cursor);
  return {...current,items};
 };
 for(const providerKey of ['claude','chatgpt']){
  let scoped;await eventually(async()=>{scoped=await collectScoped({providerKey});return scoped.complete===true&&!scoped.cursorInvalid;},'source-scoped compatibility reaches its real terminal page');
  assert.deepEqual(scoped.items.map(row=>row.id),[topics[1].id],'direct-source compatibility keeps the single mixed Topic without independent-only Topics');
  assert.ok(scoped.items.every(row=>row.readRef?.kind==='topic'),'stable DTO identities come from the existing Topic read references');
 }
 let scopedSearch;
 try{await eventually(async()=>{scopedSearch=await collectScoped({providerKey:'claude',query:'Scope shared claude'});return scopedSearch.complete===true&&!scopedSearch.cursorInvalid;},'source lexical compatibility reaches a complete current index');}
 catch(error){
  const variant=release?'release':'source',fallback={variant,reads:scopedReads,diagnosticUnavailable:true};
  await failWithBoundedEvidence(error,{fallback,read:async()=>({variant,reads:scopedReads,worker:await h.libraryWorker.evaluate(()=>__uir03Library.read())}),persist:async diagnostic=>{await mkdir('work/ux-r3',{recursive:true});await writeFile(`work/ux-r3/${variant}-lexical-failure.json`,JSON.stringify(diagnostic,null,2));},report:diagnostic=>console.info('UIR03_LEXICAL_FAILURE '+JSON.stringify(diagnostic))});
 }
 assert.ok(scopedSearch.items.some(row=>row.entryId===seeded.claude),'actual source-scoped lexical owner returns the direct Claude expression');
 assert.ok(scopedSearch.items.every(row=>row.entryId===seeded.claude),'direct-source search never admits independent or nonmatching bodies');
 assert.equal(await rootList.locator('small,.summary').count(),0,'normal metadata blocks publish no misleading source counts or body excerpts');
 const addresses=await blocks.evaluateAll(nodes=>nodes.map(node=>[node.dataset.topicId,node.dataset.rootSlot]));
 // Preserve the exact legacy search handoff/Back race through its original
 // production controller. The approved Root has no query field or result cards.
 const exact=scopedSearch.items.find(row=>row.entryId===seeded.claude);assert.ok(exact);
 await page.evaluate(async()=>{const {ThoughtWorkspace}=await import(chrome.runtime.getURL('ui/thoughts.js')),proto=ThoughtWorkspace.prototype,open=proto.open;window.vs05OwnerRestore=()=>proto.open=open;proto.open=function(...args){window.vs05SearchOwner=this;return open.apply(this,args);};});
 await rootList.locator('.personal-topic-link[data-topic-id="'+topics[1].id+'"]').click();await eventually(()=>body.locator('[data-entry-id]').count().then(n=>n>0));await page.locator('#back').click();
 await page.evaluate(()=>vs05OwnerRestore());
 await page.evaluate(async item=>{
  const owner=window.vs05SearchOwner,focus=owner.focusSection;window.vs05SearchRace={started:false,done:false};
  const gate=new Promise(resolve=>window.vs05SearchRace.release=resolve);
  owner.focusSection=async function(...args){window.vs05SearchRace.started=true;await gate;return focus.apply(this,args);};window.vs05SearchRace.restore=()=>owner.focusSection=focus;
  owner.openSearchResult(item).then(()=>window.vs05SearchRace.done=true,error=>{window.vs05SearchRace.error=String(error.message);window.vs05SearchRace.done=true;});
 },exact);
 try{
  await eventually(()=>page.evaluate(()=>vs05SearchRace.started),'real compatibility handoff reaches held Section focus');await eventually(()=>page.locator('#thought-document').isVisible());
  await page.locator('#back').click();await eventually(async()=>await rootList.isVisible()&&await blocks.count()===3,'Back wins before the delayed original continuation');
  await page.evaluate(()=>vs05SearchRace.release());await eventually(()=>page.evaluate(()=>vs05SearchRace.done));
  assert.equal(await page.locator('#library-dialog').evaluate(el=>el.open),false,'obsolete Entry focus cannot reopen a modal');assert.equal(await page.locator('#thought-document').isVisible(),false,'obsolete Section focus cannot replace Root');
 }finally{await page.evaluate(()=>{vs05SearchRace.release();vs05SearchRace.restore();});}
 await page.evaluate(item=>vs05SearchOwner.openSearchResult(item),exact);
 await eventually(async()=>await body.locator('[data-entry-id="'+seeded.claude+'"]').count()===1&&await page.locator('#library-dialog').evaluate(el=>!el.open),'original compatibility handoff reaches actual placement without standalone fallback');
 await page.locator('#back').click();await eventually(()=>rootList.isVisible());assert.deepEqual(await blocks.evaluateAll(nodes=>nodes.map(node=>[node.dataset.topicId,node.dataset.rootSlot])),addresses,'Back retains all actual identity addresses');
 let empty;await eventually(async()=>{empty=await collectScoped({query:'independent-only-never-in-source'});return empty.complete===true&&!empty.cursorInvalid;},'original lexical no-match reaches a complete result');assert.equal(empty.items.length,0);
 assert.equal(await blocks.count(),3);assert.equal(await rootList.locator('.personal-entry-preview,.personal-entry-match').count(),0,'compatibility search cannot publish retired Root body previews');
 assert.equal(await page.locator('#ai-presentation-toggle').isVisible(),false,'source root adds no AI control');
 await rootList.locator('.personal-topic-link[data-topic-id="'+topics[1].id+'"]').click();
 await eventually(async()=>await page.locator('#thought-document').isVisible());
 await shot(page,release?'vs05-release-topic-source-scope':'vs05-source-topic-source-scope');
 await assertOffline(h);
}


// A new independent expression may precede the qualified retained anchor in
// the same opened year. Use the real visible backward frontier to reveal it.
async function revealCommittedExpression(page,topic,entryId){
 const read=()=>page.evaluate(()=>globalThis.__uir03SectionBoundary.snapshot()),target=page.locator('#original-reading-body [data-entry-id="'+entryId+'"]'),before=page.locator('#topic-continuous-before');
 const same=state=>state.topicId===topic.id&&state.sectionId===topic.defaultSectionId&&state.reader?.scope===topic.defaultSectionId&&state.provider===null&&state.reader.provider===null&&state.view==='original';
 await eventually(async()=>{const state=await read(),reader=state.reader;return same(state)&&state.documentState==='ready'&&!state.inert&&reader.initialized&&!reader.loadingNext&&!reader.loadingPrevious&&!reader.hydrating&&!reader.indexing&&!reader.stale&&!reader.errorNext;},'the committed expression keeps a qualified same-Topic/Section all-source reader',30000);
 const openedYears=(await read()).reader.openedYears;
 const check=state=>{assert.equal(same(state),true);assert.deepEqual(state.reader.openedYears,openedYears,'revealing the committed expression never opens another year');assert.equal(state.reader.stale,false);assert.equal(state.reader.errorNext,null);assert.equal(state.reader.errorPrevious,null);};
 const mounted=async()=>{await eventually(async()=>{const state=await read();check(state);assert.ok(state.reader.ids.includes(entryId),'the admitted committed expression remains in the same qualified reader');return state.mountedIds.includes(entryId)&&await target.count()===1;},'the already-admitted exact committed expression finishes its original reader paint',30000);};
 for(let turn=0;turn<8;turn++){
  const state=await read();check(state);
  if(state.reader.ids.includes(entryId)){await mounted();return;}
  await eventually(async()=>{const current=await read();check(current);return current.reader.ids.includes(entryId)||await before.isVisible();},'the same qualified reader exposes its target or actual previous frontier',30000);
  const ready=await read();check(ready);
  // The real previous owner publishes canonical IDs/terminal state before
  // renderTopicReader finishes hydration and generation-qualified DOM paint.
  // An admitted target needs that paint, not another nonexistent frontier.
  if(ready.reader.ids.includes(entryId)){await mounted();return;}
  assert.equal(ready.before.hidden,false);assert.equal(ready.reader.reportedTerminalPrevious,false,'the actual current reader has a legitimate previous range');
  await before.focus();assert.equal(await page.evaluate(()=>document.activeElement?.id),'topic-continuous-before');await before.press('Enter');
  await eventually(async()=>{const next=await read();assert.equal(same(next),true);assert.deepEqual(next.reader.openedYears,openedYears);assert.equal(next.reader.errorNext,null);assert.equal(next.reader.errorPrevious,null);const advanced=next.mounted>ready.mounted||JSON.stringify(next.reader.ids)!==JSON.stringify(ready.reader.ids)||ready.reader.terminalPrevious===false&&next.reader.terminalPrevious===true;return next.serial===ready.serial&&advanced&&!next.reader.loadingNext&&!next.reader.loadingPrevious&&!next.reader.hydrating&&!next.reader.indexing&&!next.reader.stale;},'native previous reading advances a qualified range or exhausts its current year',30000);
  // Exhausting an empty unknown-year frontier is only intermediate progress.
  // The next original native action must still reach the exact committed ID.
 }
 assert.fail('the committed expression was not reached through its bounded real previous ranges');
}

async function independentThoughtRelationJourney(page,h,topics,{release=false}={}){
 await page.setViewportSize({width:1440,height:900});
 const dialog=page.locator('#topic-action-dialog'),content=page.locator('#library-dialog-content');
 const prefix=release?'VS05_RELEASE_NEW':'VS05_SOURCE_NEW',standaloneBody=prefix+' 独立想法，不需要主题或关联。';
 const started=Date.now();
 // Fixture creation uses the guarded worker. Current Write holds Save; this is
 // an existing-content/relations UI audit, never a compose-save success claim.
 const seededStandalone=await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),body:standaloneBody}});
 await page.locator('#back').click();await eventually(()=>page.locator('#thought-list').isVisible());
 if(!await page.locator('#library-unplaced-list').isVisible())await page.locator('#library-unplaced').click();
 await page.locator(`[data-unplaced-id="${seededStandalone.id}"]`).click();
 await eventually(async()=>await content.locator('[data-entry-field="body"]').textContent()===standaloneBody,'seeded independent Thought opens through its actual Unplaced control');
 const standaloneId=await content.locator('[data-entry-id]').getAttribute('data-entry-id');assert.equal(standaloneId,seededStandalone.id);
 const standalone=await rpc(page,'GET_LIBRARY_ENTRY',{id:standaloneId});
 assert.ok(Date.parse(standalone.createdAt)>=started&&Date.parse(standalone.createdAt)<=Date.now(),'creation time comes from this guarded fixture commit, not quoted history');
 assert.deepEqual(await rpc(page,'GET_LIBRARY_PATHS',{id:standaloneId}),[],'optional Topic can be omitted');
 assert.deepEqual((await rpc(page,'COMPARE_THOUGHT_INPUT',{id:standaloneId})).relations,[],'independent save does not infer a relation');
 assert.equal(standalone.provenanceType,'user_created');
 await page.locator('#library-dialog-close').click();

 await page.locator(`.personal-topic-link[data-topic-id="${topics[1].id}"]`).click();await eventually(()=>page.locator('#thought-document').isVisible());
 const row=page.locator('#original-reading-body [data-entry-id]').first(),targetId=await row.getAttribute('data-entry-id');
 const before=await rpc(page,'GET_LIBRARY_ENTRY',{id:targetId}),responseBody=prefix+' 回应后独立保存，不重写原内容。';
 const expectedBodySha256=await page.evaluate(async body=>{const {hashText}=await import(chrome.runtime.getURL('core/dedupe.js'));return hashText(body);},before.body);
 const rejected=await page.evaluate(thought=>chrome.runtime.sendMessage({type:'CONTINUE_THINKING',thought}),{operationId:op(),body:responseBody,topicId:topics[1].id,relation:{id:targetId,expectedRevision:before.revision,expectedBodySha256}});assert.equal(rejected.error,'FEATURE_UNAVAILABLE','retired explicit response relation cannot create any new Thought');
 assert.deepEqual(await rpc(page,'GET_LIBRARY_ENTRY',{id:targetId}),before,'rejected relation leaves the original body and revision intact');
 const response=await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),body:responseBody,topicId:topics[1].id}}),responseId=response.id;
 const responseRow=page.locator(`#original-reading-body [data-entry-id="${responseId}"]`),responseTopic=await rpc(page,'GET_LIBRARY_TOPIC',{id:topics[1].id});
 const committed=await rpc(page,'GET_LIBRARY_ENTRY',{id:responseId}),committedPaths=await rpc(page,'GET_LIBRARY_PATHS',{id:responseId});assert.equal(committed.body,responseBody);assert.equal(committed.provenanceType,'user_created');assert.deepEqual(committedPaths.map(path=>[path.topicId,path.sectionId]),[[responseTopic.id,responseTopic.defaultSectionId]],'the exact committed expression belongs to this canonical Topic/Section');
 try{await revealCommittedExpression(page,responseTopic,responseId);await eventually(()=>responseRow.locator('[data-entry-field="body"]').textContent().then(body=>body===responseBody),'independent Thought remains available');}
 catch(error){try{const canonical=await rpc(page,'GET_LIBRARY_ENTRY',{id:responseId}),paths=await rpc(page,'GET_LIBRARY_PATHS',{id:responseId}),evidence=await page.evaluate(()=>{const trace=globalThis.__uir03SectionBoundary;return trace?{variant:trace.variant,events:trace.events,final:trace.snapshot()}:null;});await mkdir('work/ux-r3',{recursive:true});await writeFile(`work/ux-r3/uir03-independent-expression-failure-${release?'release':'source'}.json`,JSON.stringify({kind:'synthetic-body-free-independent-expression-diagnostic',error:{name:error.name,message:error.message,stack:error.stack},canonical:{id:canonical.id,createdAt:canonical.createdAt,revision:canonical.revision,lifecycle:canonical.lifecycle,provenanceType:canonical.provenanceType,bodyMatches:canonical.body===responseBody,sourceRecordCount:canonical.sourceRecordIds?.length},paths:paths.map(row=>({topicId:row.topicId,sectionId:row.sectionId,placementId:row.placement?.id,placementRevision:row.placement?.revision})),evidence},null,2));}catch(diagnosticError){console.error('UIR03_INDEPENDENT_DIAGNOSTIC_FAILED',diagnosticError?.name||'Error');}throw error;}
 assert.notEqual(responseId,targetId);
 assert.deepEqual((await rpc(page,'COMPARE_THOUGHT_INPUT',{id:responseId})).relations,[],'independent save invents no response relation');
 const originalAfter=await rpc(page,'GET_LIBRARY_ENTRY',{id:targetId});assert.equal(originalAfter.body,before.body);assert.equal(originalAfter.revision,before.revision,'revealing the new independent expression never rewrites the original');
 await responseRow.locator('.library-actions summary').click();assert.equal(await responseRow.getByRole('button',{name:'查看关联',exact:true}).count(),0);assert.equal(await responseRow.getByRole('button',{name:'回应',exact:true}).count(),0);await page.keyboard.press('Escape');
 await shot(page,release?'vs05-release-independent-no-response':'vs05-source-independent-no-response');
 await assertOffline(h);
}

async function homeAndOriginalJourney(page,h,topics,{release=false}={}){
  await page.bringToFront();
  await nav(page,'thoughts');
  await eventually(async()=>await page.locator('#thought-list article.personal-topic-block').count()===3,'Thought home renders the seeded Topics');
  assert.equal(await page.locator('#thought-panel input[type="search"]').count(),0,'approved Thought Root retires search');
  assert.equal(await page.locator('#library-view-switch').isVisible(),false,'Thought root hides AI presentation controls until a Topic is open');
  assert.equal(await page.locator('#ai-presentation-toggle').isVisible(),false,'Thought root has no visible AI organize toggle');
  assert.equal(await page.locator('#thought-recent').count(),0,'Thought root no longer renders 最近阅读');
  const index=await rpc(page,'LIBRARY_INDEX_PAGE',{options:{mode:'stable'}});
  assert.ok(index.recent?.some(item=>item.id===topics[1].id),'recent-read metadata remains available behind the removed root section');
  const homeMenu=page.locator('#thought-home-tools .thought-root-actions .library-actions').first();
  await homeMenu.locator('summary').click();
  assert.equal(await homeMenu.getByRole('button',{name:'添加主题',exact:true}).count(),0,'Root retires generic manual Topic creation');
  assert.equal(await homeMenu.getByRole('button',{name:'列表 / 网格',exact:true}).count(),0,'current Personal Topic layout has no competing layout switch');
  assert.equal(await homeMenu.getByRole('button',{name:'整理新增内容',exact:true}).count(),0,'root menu no longer starts AI organization');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#thought-home-tools .thought-root-actions').getByRole('button',{name:'写下想法',exact:true}).isVisible(),true,'independent Thought creation remains reachable');

  await page.setViewportSize({width:1440,height:900});
  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
  await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light','light theme applies');
  // Current UX_CONTRACT section0 retains PRE_YEAR sections0/5: Root uses its real Topic cards, without a duplicate page headline.
  assert.equal(await page.locator('h1:visible').count(),0,'approved Thought Root has no duplicate visible page heading');
  assert.equal(await page.locator('#thought-root-heading h1,.thought-root-eyebrow').count(),0,'retired Root headline nodes have no hidden owner');
  assert.equal(await page.locator('#thought-list').isVisible(),true,'the actual seeded Topic list remains the visible Home owner');
  assert.equal(await page.locator('#thought-document').isVisible(),false,'Topic document stays out of the home view');
  assert.equal((await rpc(page,'GET_THOUGHT_LAYOUT')).layout,'list','retired layout service retains its compatibility receipt');
  await eventually(async()=>await page.locator('#thought-list').evaluate(el=>el.classList.contains('personal-topic-grid')),'current stable Personal Topic grid applies');
  assert.equal(await page.locator('#thought-list').evaluate(el=>getComputedStyle(el).display),'grid');
  const rootRows=page.locator('#thought-list article.personal-topic-block'),geometry=await rootRows.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,width:r.width,height:r.height,id:node.dataset.topicId,slot:node.dataset.rootSlot};}));
  assert.equal(new Set(geometry.map(row=>row.left)).size,3,'three actual identities occupy separate stable blocks in the wide grid');
  assert.ok(geometry.every(row=>Math.abs(row.width-geometry[0].width)<=2),'independent Root blocks retain equal track widths');
  assert.ok(Math.max(...geometry.map(row=>row.height))-Math.min(...geometry.map(row=>row.height))>12,'approved content-sized blocks distinguish wrapped and short titles without fixed-height padding');
  const title=page.locator(`.personal-topic-link[data-topic-id="${topics[0].id}"]`),canonical=(await rpc(page,'GET_LIBRARY_TOPIC',{id:topics[0].id})).name;
  assert.equal(await title.textContent(),canonical);assert.equal(await title.getAttribute('title'),canonical,'bounded title presentation retains the full canonical name');
  const rootCue=(await rpc(page,'LIBRARY_INDEX_PAGE',{options:{mode:'stable'}})).items.find(item=>item.id===topics[0].id).rootCue;
  assert.equal(rootCue.kind,'human_cue');assert.equal(rootCue.text,topics[0].summary.slice(rootCue.range.start,rootCue.range.end));assert.ok(rootCue.text.length<=140);assert.equal(rootCue.truncated,true,'legacy summary owner remains unchanged');
  const projection=await rpc(page,'GET_LIBRARY_ROOT_PROJECTION',{options:{limit:40,sectionLimit:4}});assert.doesNotMatch(JSON.stringify(projection),/"(?:body|summary|rootCue|snippet)"/,'normal Root never reads the preserved human summary as a preview');
  assert.equal(await rootRows.locator('.summary,.personal-entry-preview,.personal-section-link,.personal-topic-more:visible').count(),0,'untitled default-only Topics show their title without invented Sections or previews');
  await shot(page,release?'vs05-release-thought-list-1440x900-light':'vs05-thought-list-1440x900-light');

  if(!release){
    await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});
    await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','dark theme applies');
    await shot(page,'uir-03-thought-home-1440x900-dark');
    await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
    await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light');
  }

  await page.setViewportSize({width:1200,height:800});
  await eventually(()=>page.locator('#thought-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length===Math.max(1,Math.min(3,Math.floor((el.clientWidth+16)/240)))),'1200px Root refits to the actual remaining workspace width');
  const cardWidth=await page.locator('#thought-list article.personal-topic-block').first().evaluate(el=>el.getBoundingClientRect().width);
  assert.ok(cardWidth>=224,`Topic blocks keep the current minimum readable track width; got ${cardWidth}`);
  assert.equal(await title.evaluate(el=>getComputedStyle(el).webkitLineClamp),'2','Root title previews have the adopted two-line limit and retain their complete accessible name');

  await page.setViewportSize({width:390,height:844});
  await eventually(()=>page.locator('#thought-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length===1),'compact Root resize settles');
  const mobileColumns=await page.locator('#thought-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(mobileColumns,1,'Thought home becomes one column on the mobile-like viewport');
  const homeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(homeOverflow<=2,`390px Thought home has no root horizontal overflow; got ${homeOverflow}`);
  const topicLinkBox=await page.locator('#thought-list .personal-topic-link').first().boundingBox();
  assert.ok(topicLinkBox&&topicLinkBox.width>=44&&topicLinkBox.height>=44,'native Topic activation remains a44px touch target');

  await page.setViewportSize({width:1440,height:900});
  await page.locator(`.personal-topic-link[data-topic-id="${topics[0].id}"]`).click();
  await eventually(()=>page.locator('#thought-document').isVisible(),'Topic opens from the existing home owner');
  await eventually(()=>page.locator('#original-reading-body .topic-section').count().then(count=>count>0),'Original content renders in the existing Topic document');
  assert.equal(await page.locator('#topic-heading h1').count(),1,'Topic keeps its canonical accessible identity heading');
  assert.equal(await page.locator('#view-title').isVisible(),false,'global Thought Library title no longer competes with the Topic h1');
  assert.equal(await page.locator('#topic-heading>p').count(),0,'normal Content does not publish an unlabelled generated summary');await page.locator('#topic-menu summary').click();await page.getByRole('button',{name:'主题说明',exact:true}).click();assert.equal(await page.getByLabel('你写的主题说明',{exact:true}).inputValue(),topics[0].summary,'the complete protected human cue remains editable from its existing metadata owner');await page.getByRole('button',{name:'收起说明',exact:true}).click();
  assert.equal(await page.locator('#back').isVisible(),true,'Topic keeps the existing return path');

  const shell=await page.locator('#thought-document').boundingBox();
  const section=await page.locator('#original-reading-body .topic-section').first().boundingBox();
  assert.ok(shell&&section&&Math.abs(shell.x-228)<=2,'approved184px navigation plus44px workspace gutter retains the absolute reading axis');assert.ok(shell.width<=936&&shell.width>216,'Topic retains the inherited bounded workspace cap');assert.ok(shell&&section&&Math.abs(shell.width-(section.width+216))<=2,'approved Topic shell has an independent216px directory axis');assert.ok(Math.abs(section.x-shell.x-216)<=2,'prose starts after the actual independent Section directory');
  assert.ok(section.width<=722,`Original prose keeps the saved 640/680/720px reading-width boundary; got ${section?.width}`);
  assert.ok(shell.width-section.width>120,'Topic shell and readable prose width remain distinct');
  assert.equal(await page.locator('#thought-panel input[type="search"]').count(),0,'normal Topic reading retires search');
  assert.equal(await page.locator('#library-view-switch').isVisible(),true,'AI presentation controls appear only with a concrete open Topic');
  assert.equal(await page.locator('#ai-presentation-toggle').isVisible(),true,'Topic keeps its contextual AI presentation switch');
  assert.equal(await page.locator('#create-entry').count(),0,'old Continue action is retired; the canonical end writer remains the writing owner');
  const topicMenu=page.locator('#topic-menu .library-actions');
  await topicMenu.locator('summary').click();
  assert.equal(await topicMenu.getByRole('button',{name:'导出主题',exact:true}).count(),0,'cancelled Topic export has no menu action');
  assert.equal(await page.getByRole('button',{name:'导出思想库',exact:true}).count(),0,'no whole-Library export scope is invented');
  await page.keyboard.press('Escape');

  const firstId=topics[0].readingIds[0],latestId=topics[0].readingIds.at(-1);
  const beforeFirst=await rpc(page,'GET_LIBRARY_ENTRY',{id:firstId}),beforeLatest=await rpc(page,'GET_LIBRARY_ENTRY',{id:latestId});
  const unknownBefore=await Promise.all(topics[0].unknownIds.map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id})));
  const originalSort=(await rpc(page,'GET_ORGANIZER_CONTROLS')).readingSort;
  let lexical;await eventually(async()=>{lexical=await rpc(page,'GET_LIBRARY_SECTION_READING',{options:{topicId:topics[0].id,query:'_THOUGHT_0_A',sort:'asc',limit:40}});return !lexical.indexing&&!lexical.cursorInvalid;},'retained canonical lexical query completes');assert.deepEqual(lexical.items.map(item=>item.entry.id),[firstId]);
  assert.equal(await page.locator('#topic-time-jumps summary').isVisible(),false,'retired time-jump menu stays absent');
  assert.equal(await page.locator('#topic-outline').isVisible(),true,'actual Section directory remains independently reachable');
  await eventually(async()=>{await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));return await page.locator('#topic-next-year').isVisible();},'current actual year reaches its explicit unknown-year boundary beyond40 rows',30000);
  assert.equal(await page.locator('#topic-next-year').textContent(),'↓ 日期未记录');await page.locator('#topic-next-year').click();await eventually(()=>page.locator('.thought-inline-draft').isVisible(),'explicit unknown-year append reaches the actual whole Section end');
  const entry=id=>page.locator(`#original-reading-body [data-entry-id="${id}"]`);
  assert.equal(await entry(latestId).count(),1,'later canonical Entry remains reachable beyond the first page');
  await entry(latestId).scrollIntoViewIfNeeded();assert.equal(await entry(latestId).isVisible(),true,'later Entry is actually rendered in the current reading surface');
  assert.equal(await page.locator('#topic-search').count(),0,'retained lexical compatibility never revives reader search');
  assert.equal((await rpc(page,'GET_ORGANIZER_CONTROLS')).readingSort,originalSort,'Section reading does not overwrite the saved chronological preference');
  assert.ok(await page.locator('#original-reading-body [data-entry-id]').count()<=120,'Topic keeps its bounded continuous reading window');
  assert.equal(await page.locator('#original-reading-body .topic-expression-year,.topic-unknown-time').count(),0,'Content preserves real Sections instead of manufacturing year groups');
  for(const id of topics[0].unknownIds){
    assert.equal(await entry(id).count(),1,'missing/invalid legacy time does not hide an Entry');
    assert.equal(await entry(id).locator('.entry-sent-time').textContent(),'时间未知','legacy gaps never become 1970 or Invalid Date');
    assert.equal(await entry(id).getAttribute('data-section-id'),topics[0].defaultSectionId,'unknown-time Entry retains its durable Section membership');
    assert.equal(await entry(id).evaluate(node=>node.closest('.topic-section').dataset.sectionId),topics[0].defaultSectionId,'presentation uses that same durable Section');
  }
  await shot(page,release?'vs05-release-unknown-time':'vs05-source-unknown-time');
  await eventually(async()=>{await page.evaluate(()=>scrollTo(0,0));return await entry(firstId).count()===1;},'backward continuous reading returns to the original first Entry',30000);
  const firstField=entry(firstId).locator('[data-entry-field="body"]');await firstField.focus();
  assert.equal(await firstField.evaluate(node=>document.activeElement===node),true,'the canonical original editor remains keyboard focusable');
  const afterFirst=await rpc(page,'GET_LIBRARY_ENTRY',{id:firstId}),afterLatest=await rpc(page,'GET_LIBRARY_ENTRY',{id:latestId});
  assert.equal(afterFirst.body,beforeFirst.body);assert.equal(afterFirst.revision,beforeFirst.revision);
  assert.equal(afterLatest.body,beforeLatest.body);assert.equal(afterLatest.revision,beforeLatest.revision,'continuous navigation changes no human content or revision');
  const unknownAfter=await Promise.all(topics[0].unknownIds.map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id})));
  for(let i=0;i<unknownBefore.length;i++){assert.equal(unknownAfter[i].body,unknownBefore[i].body);assert.equal(unknownAfter[i].revision,unknownBefore[i].revision);}
  await shot(page,release?'uir-03-current-release-topic-original-1440x900-light':'uir-03-topic-original-1440x900-light');

  if(!release){
    await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});
    await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');
    assert.notEqual(await page.locator('#thought-document').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','dark Topic does not force a white document shell');
    await shot(page,'uir-03-topic-original-1440x900-dark');
    await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
    await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light');

    for(const [width,height] of [[1024,768],[390,844]]){
      await page.setViewportSize({width,height});
      await pause(80);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=2,`${width}px Topic has no root horizontal overflow; got ${overflow}`);
      if(width===390){
        const directoryBox=await page.locator('.topic-section-select').boundingBox();const continueBox=await page.locator('.thought-inline-draft').boundingBox();assert.ok(directoryBox&&directoryBox.height>=44,'mobile actual Section selector keeps a44px target');assert.ok(continueBox&&continueBox.height>=44,'mobile actual end writer keeps a44px target '+JSON.stringify({continueBox,field:await page.locator('.thought-inline-draft').evaluate(node=>({font:getComputedStyle(node).fontSize,minHeight:getComputedStyle(node).minHeight,padding:getComputedStyle(node).padding,lineHeight:getComputedStyle(node).lineHeight,connected:node.isConnected}))}));
        await shot(page,'uir-03-topic-original-390x844-light',{fullPage:false});
      }
    }
  }

  await provenanceRoleJourney(page,h,topics,{release});
  await topicSourceScopeJourney(page,h,topics,{release});
  await independentThoughtRelationJourney(page,h,topics,{release});
  await assertOffline(h);
}

test('UIR-03 Thought home and Topic Original presentation keep existing identity, editing owners and reading width in source and built release Chrome',{timeout:300000},async()=>{
  let source;
  try{
    source=await FakeChatGPT.start({onboarding:true});
    const page=await ready(source);
    const topics=await seed(page,source,'UIR03_SOURCE');
    await homeAndOriginalJourney(page,source,topics);
  }finally{
    await source?.close();
  }

  const releasePath=await mkdtemp(join(tmpdir(),'paia-uir03-release-'));
  let release;
  try{
    await execFileAsync('python3',['scripts/build_current_release.py',releasePath],{cwd:process.cwd(),maxBuffer:16*1024*1024});
    release=await FakeChatGPT.start({extensionPath:releasePath,onboarding:true});
    const page=await ready(release);
    const topics=await seed(page,release,'UIR03_RELEASE');
    await homeAndOriginalJourney(page,release,topics,{release:true});
  }finally{
    await release?.close();
    await rm(releasePath,{recursive:true,force:true});
  }
});
