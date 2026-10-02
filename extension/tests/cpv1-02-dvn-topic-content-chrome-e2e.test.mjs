import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
const release=mkdtempSync(join(tmpdir(),'paia-d2-content-'));
test.after(()=>rmSync(release,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',release],{encoding:'utf8'}));
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
for(const variant of ['source','release'])test(`D2 Content trusted chronology, bounded bodies and exact return (${variant})`,{timeout:180000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;
 try{
  await p.setViewportSize({width:1440,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const seed=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC 跨章节的真实表达时间与不确定性',operationId:op()}),other=await s.createSection({topicId:topic.id,title:'SYNTHETIC 不决定年代的人工章节',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()}),records=[];
   for(let i=0;i<165;i++){const at=new Date(Date.UTC(i%2?2021:2023,0,1)+i*1000).toISOString();s.clock=()=>at;const row=await s.continueThinking({operationId:op(),body:'SYNTHETIC_CONTENT_'+i+' '+(i%2?'访谈者说“我不愿意”，我还没做判断。':'我可能更适合消费产品，但现在样本还太少。')+' 👩‍💻 é\n'+('这是保留语气和归属的原话。'.repeat(8)),topicId:topic.id});records.push({id:row.id,at,i});if(i%3===0){const entry=await s.entry(row.id);await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:other.sectionId,expectedPlacementRevision:(await s.entryPaths(entry.id))[0].placement.revision,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});}}
   await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===records[164].id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
   const ordered=records.slice(0,164).sort((a,b)=>a.at.localeCompare(b.at)).map(row=>row.id);ordered.push(records[164].id);
   await s.repository.close();
   const {ThoughtWorkspace}=await import('../ui/thoughts.js'),create=ThoughtWorkspace.prototype.createTopicReader;ThoughtWorkspace.prototype.createTopicReader=function(...args){globalThis.__d2Content=this;return create.apply(this,args);};
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2ContentReads=[];chrome.runtime.sendMessage=(message,...args)=>Promise.resolve(send(message,...args)).then(result=>{if(message.type==='TOPIC_DOCUMENT_PAGE'&&result?.ok)__d2ContentReads.push({options:message.options,ids:result.data.items.map(row=>row.entry.id)});return result;});
   return {topicId:topic.id,ordered,records};
  });
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`[data-topic-id="${seed.topicId}"]`).click();
  await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>=40),'first Content page');
  const next=p.locator('#topic-continuous-after');
  for(let i=0;i<6;i++){if(/末尾/.test(await p.locator('#topic-continuous-after-status').textContent()))break;const before=await p.evaluate(()=>__d2Content.topicReader.items.length);await next.evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await eventually(()=>p.evaluate(n=>__d2Content.topicReader.items.length>n||__d2Content.topicReader.terminalNext,before));}
  await eventually(()=>p.evaluate(()=>__d2Content.topicReader.terminalNext),'complete Content extent');
  const full=await p.evaluate(()=>({ids:__d2Content.topicReader.items.map(row=>row.entry.id),bodies:__d2Content.topicReader.items.filter(row=>!row.unloaded).length,meta:JSON.stringify(__d2Content.topicReader.pageMeta),snapshot:JSON.stringify(__d2Content.topicReader.snapshot()),editorRows:__d2Content.editor.entry.entries.size}));
  assert.deepEqual(full.ids,seed.ordered);assert.ok(full.bodies<=120);assert.ok(full.editorRows<=120);assert.ok(!full.meta.includes('SYNTHETIC_CONTENT_'));assert.ok(!full.snapshot.includes('SYNTHETIC_CONTENT_'));assert.equal(await p.locator('#original-reading-body [data-entry-id]').count(),120);
  const unknown=p.locator(`[data-entry-id="${seed.records[164].id}"]`);assert.match(await unknown.locator('.entry-sent-time').textContent(),/时间未知/);assert.equal(await unknown.getAttribute('data-expression-year'),'unknown');
  const mounted=await p.locator('#original-reading-body [data-entry-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.entryId));assert.deepEqual(mounted,seed.ordered.slice(-120),'the renderer does not regroup chronology by section');
  await p.locator('#original-reading-body [data-entry-id]').first().scrollIntoViewIfNeeded();
  mkdirSync('work/qa-dvn-topic-content',{recursive:true});const matrix=[];
  for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const width of [1440,1280,1024,768,390,320]){await p.setViewportSize({width,height:900});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,`${appearance}/${width}: ${overflow}`);await p.screenshot({path:`work/qa-dvn-topic-content/${variant}-${appearance}-${width}.png`});matrix.push({appearance,width,overflow});}}
  await p.setViewportSize({width:1440,height:900});const target=seed.ordered[140];await p.locator(`[data-entry-id="${target}"]`).scrollIntoViewIfNeeded();
  await p.locator('#topic-search').evaluate(input=>{input.value='SYNTHETIC_CONTENT_1 访谈者';input.dispatchEvent(new Event('input',{bubbles:true}));});await eventually(()=>p.locator('#original-reading-body [data-entry-id]').evaluateAll((nodes,id)=>nodes.length===1&&nodes[0].dataset.entryId===id,seed.records[1].id),'search reaches early unmounted expression');
  await p.locator('#topic-search').fill('');await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'closing search restores reading extent');assert.equal(await p.evaluate(()=>__d2Content.topicReader.items.length),165);
  await p.locator('#back').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'root return refetches saved window');assert.equal(await p.evaluate(()=>__d2Content.topicReader.items.length),165);
  await p.evaluate(()=>scrollTo(0,0));await eventually(()=>p.locator(`[data-entry-id="${seed.ordered[0]}"]`).count().then(n=>n===1),'evicted first window refetched');assert.ok(await p.evaluate(()=>__d2ContentReads.some(read=>read.options.anchorId&&read.options.expectedReadGeneration)));
  assert.ok(await p.evaluate(()=>__d2Content.topicReader.items.filter(row=>!row.unloaded).length<=120));
  // Reliable-time enrichment/invalidation may regroup clean rows, but cannot move a live IME owner.
  const composing=p.locator('#original-reading-body [data-entry-field="body"]').first();
  const composition=await composing.evaluate(field=>{globalThis.__d2ImeNode=field.closest('[data-entry-id]');globalThis.__d2ImeParent=__d2ImeNode.parentElement;const original=field.textContent;field.focus();field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));field.textContent='SYNTHETIC 未提交中文';const range=document.createRange();range.setStart(field.firstChild,8);range.collapse(true);getSelection().removeAllRanges();getSelection().addRange(range);return {id:__d2ImeNode.dataset.entryId,original};});
  await p.evaluate(async({id})=>{const {OrganizerStore}=await import('../core/organizer/store.js'),{invalidateThoughtTopicIndex}=await import('../core/thought-read-index.js'),s=new OrganizerStore(chrome.storage.local);await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}await invalidateThoughtTopicIndex(s,t,__d2Content.id,{sourceTime:true});});await s.repository.close();await __d2Content.refresh();},composition);
  const ime=await p.evaluate(()=>({same:document.querySelector('[data-entry-id="'+__d2ImeNode.dataset.entryId+'"]')===__d2ImeNode,parent:__d2ImeNode.parentElement===__d2ImeParent,text:__d2ImeNode.querySelector('[data-entry-field="body"]').textContent,caret:getSelection().anchorOffset}));assert.equal(ime.same,true);assert.equal(ime.parent,true);assert.equal(ime.text,'SYNTHETIC 未提交中文');assert.equal(ime.caret,8);
  await p.evaluate(({original})=>{const field=__d2ImeNode.querySelector('[data-entry-field="body"]');field.textContent=original;field.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));field.blur();getSelection().removeAllRanges();},composition);
  // The next authority refresh must preserve the new note, without restoring a cached generation.

  const held=seed.ordered[100],fresh=await rpc(p,'GET_LIBRARY_ENTRY',{id:held});await rpc(p,'EDIT_LIBRARY_FIELDS',{edit:{operationId:crypto.randomUUID(),id:held,expectedRevision:fresh.revision,expectedFieldRevisions:fresh.fieldRevisions,changes:{note:'SYNTHETIC_FRESH_NOTE'}}});
  await eventually(()=>p.evaluate(()=>__d2Content.topicReader&&!__d2Content.topicReader.stale),'reconcile fresh Content generation');
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  writeFileSync(`work/qa-dvn-topic-content/${variant}.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,matrix,entries:165,trustedGlobalChronology:true,unknownLegacy:true,boundedBodies:full.bodies,bodyFreeExtent:true,searchReturn:true,rootReturn:true,exactRefRefetch:true,timeChangeImePreserved:true,zeroProviderCalls:true},null,2));
 }finally{await h.close();}
});
