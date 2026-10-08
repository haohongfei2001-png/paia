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
// Read-only evidence for the existing synthetic return journey. This adds no
// navigation, wait, replacement handler, alternate assertion or production code.
function installReturnEvidence({topicId,targetId}){
 const owner=globalThis.__d2Content,events=[],limit=96,ids=rows=>(rows||[]).map(row=>row.entry?.id||row.id).slice(0,200);
 const saved=value=>value?{anchor:value.anchor||null,windowStart:value.windowStart,extent:ids(value.extent),references:(value.extent||[]).map(row=>({id:row.entry.id,revision:row.entry.revision})).slice(0,200),query:value.query,generation:value.generation}:null;
 const snapshot=()=>{
  const reader=owner.topicReader,body=document.getElementById('original-reading-body'),target=body?.querySelector(`[data-entry-id="${targetId}"]`),box=target?.getBoundingClientRect(),position=owner.contentPositions.get(topicId);
  return {topicId:owner.id,view:owner.view,mode:owner.originalMode,serial:owner.serial,statusEpoch:owner.statusEpoch,openIntent:owner.openIntent,readCount:globalThis.__d2ContentReads.length,query:document.getElementById('topic-search')?.value,scrollY,anchor:owner.topicAnchor(),targetId,target:box?{top:box.top,bottom:box.bottom}:null,mounted:[...body?.querySelectorAll('[data-entry-id]')||[]].map(node=>node.dataset.entryId).slice(0,200),reader:reader?{query:reader.query,ids:ids(reader.items),loaded:ids(reader.items.filter(row=>!row.unloaded)),windowStart:reader.windowStart,windowRevision:reader.windowRevision,stale:reader.stale,hydrating:reader.hydrating,loadingNext:reader.loadingNext,loadingPrevious:reader.loadingPrevious,errorNext:reader.errorNext?.code||reader.hydrationError?.code||null}:null,saved:saved(position?.snapshot),resume:saved(owner.contentResume),preSearch:saved(owner.contentPreSearch?.snapshot),navigationAnchor:owner.topicNavigationAnchor||null,documentState:document.getElementById('thought-document')?.dataset.state,bodyInert:document.getElementById('topic-body')?.inert,rootHidden:document.getElementById('thought-collection')?.hidden,documentHidden:document.getElementById('thought-document')?.hidden,active:document.activeElement?.id||document.activeElement?.tagName};
 };
 const trace=globalThis.__d2ReturnEvidence={enabled:false,complete:false,events,snapshot,record(name,detail={}){
  if(!this.enabled)return;
  try{events.push({at:performance.now(),name,detail,state:snapshot()});if(events.length>limit)events.shift();}catch(error){events.push({at:performance.now(),name,diagnosticError:String(error)});if(events.length>limit)events.shift();}
 }};
 document.getElementById('topic-search').addEventListener('input',()=>{if(!trace.complete){trace.enabled=true;trace.record('search-input');}},{capture:true});
 for(const name of ['pointerdown','click','focusin','keydown'])document.addEventListener(name,event=>{
  const node=event.target.closest?.('#back,[data-topic-id],#topic-search');
  if(node)trace.record(name,{id:node.id,topicId:node.dataset.topicId||null,trusted:event.isTrusted,key:event.key||null});
 },true);
 addEventListener('scroll',()=>trace.record('scroll'),{passive:true});
 for(const name of ['rememberContent','restoreContent','searchContent','open','shiftTopicWindow','resetTopicReader','renderTopicReader']){
  const original=owner[name];owner[name]=function(...args){
   trace.record(name+':start',{argument:typeof args[0]==='string'?args[0]:null});
   let result;try{result=original.apply(this,args);}catch(error){trace.record(name+':throw',{code:error?.code,message:String(error?.message||error)});throw error;}
   trace.record(name+':returned',{promise:typeof result?.then==='function'});
   if(name==='renderTopicReader'&&typeof result?.then==='function'){globalThis.__d2PendingRenders=(globalThis.__d2PendingRenders||0)+1;result.then(()=>globalThis.__d2PendingRenders--,()=>globalThis.__d2PendingRenders--);}
   return result;
  };
 }
}
async function retainReturnEvidence(p,variant,error=null){
 try{
  const evidence=await p.evaluate(()=>{const trace=globalThis.__d2ReturnEvidence;return trace?{events:trace.events,final:trace.snapshot(),reads:(globalThis.__d2ContentReads||[]).slice(-96)}:null;});
  mkdirSync('work/qa-dvn-topic-content',{recursive:true});
  writeFileSync(`work/qa-dvn-topic-content/${variant}-return-diagnostic.json`,JSON.stringify({kind:'synthetic-read-only-return-diagnostic',head:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,result:error?'FAIL':'PASS',error:error?{name:error.name,message:error.message,stack:error.stack}:null,evidence},null,2));
  if(error)await p.screenshot({path:`work/qa-dvn-topic-content/${variant}-return-failure.png`,timeout:5000});
 }catch(diagnosticError){console.error('D2_RETURN_DIAGNOSTIC_FAILED',String(diagnosticError));}
}
const settleContent=p=>eventually(()=>p.evaluate(async()=>{const ready=()=>{const owner=__d2Content,reader=owner.topicReader;return document.getElementById('thought-document').dataset.state==='ready'&&!document.getElementById('topic-body').inert&&!owner.topicWindowShifting&&!globalThis.__d2PendingRenders&&reader&&!reader.hydrating&&!reader.hydrationPromise&&!reader.loadingNext&&!reader.loadingPrevious;};const layout=()=>JSON.stringify({scroll:scrollY,window:__d2Content.topicReader?.windowStart,rows:[...document.querySelectorAll('#original-reading-body [data-entry-id]')].map(n=>[n.dataset.entryId,n.getBoundingClientRect().top,n.getBoundingClientRect().height])});if(!ready())return false;const before=layout();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return ready()&&layout()===before;}),'current Section render and reading geometry settle');
function contentReturnState(targetId){
 const owner=__d2Content,reader=owner.topicReader,target=document.querySelector(`[data-entry-id="${targetId}"]`),box=target?.getBoundingClientRect(),back=document.getElementById('back').getBoundingClientRect();
 return {scroll:scrollY,height:innerHeight,anchor:owner.topicAnchor(),windowStart:reader.windowStart,ids:reader.items.map(row=>row.entry.id),references:reader.items.map(row=>({id:row.entry.id,revision:row.entry.revision})),loaded:reader.items.filter(row=>!row.unloaded).map(row=>row.entry.id),generation:reader.coverage?.activeGeneration,stale:reader.stale,error:reader.errorNext?.code||reader.errorPrevious?.code||reader.hydrationError?.code||null,openIntent:owner.openIntent,target:box?{id:targetId,top:box.top,bottom:box.bottom}:null,back:{top:back.top,bottom:back.bottom},active:document.activeElement?.id,readCount:__d2ContentReads.length};
}
async function assertReturnedWindow(p,departure,label){
 await settleContent(p);const returned=await p.evaluate(contentReturnState,departure.target.id);
 assert.deepEqual(returned.ids,departure.ids,label+' retains all exact ordered IDs');assert.deepEqual(returned.references,departure.references,label+' retains exact reference revisions');assert.equal(returned.windowStart,departure.windowStart,label+' restores its departure body window');assert.ok(returned.loaded.length<=120,label+' keeps the body bound');assert.equal(returned.stale,false);assert.equal(returned.error,null);
 assert.ok(returned.target&&Math.abs(returned.target.top-departure.target.top)<=2,label+' restores the actual departure reading position');
 const reads=await p.evaluate(({start,intent})=>__d2ContentReads.slice(start).filter(read=>read.openIntent===intent),{start:departure.readCount,intent:returned.openIntent});assert.ok(reads.some(read=>read.options.anchorId&&read.options.expectedReadGeneration===departure.generation),label+' actually refetches the saved generation in this reopen');
 return {departure,returned,refetches:reads.map(read=>({anchorId:read.options.anchorId,expectedReadGeneration:read.options.expectedReadGeneration,ids:read.ids}))};
}
for(const variant of ['source','release'])test(`D2 Section durable order and truthful chronology, bounded bodies and exact return (${variant})`,{timeout:180000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;
 try{
  await p.setViewportSize({width:1440,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const seed=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC 跨章节的真实表达时间与不确定性',operationId:op()}),other=await s.createSection({topicId:topic.id,title:'SYNTHETIC 不决定年代的人工章节',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()}),records=[];
   for(let i=0;i<165;i++){const at=new Date(Date.UTC(i%2?2021:2023,0,1)+i*1000).toISOString();s.clock=()=>at;const row=await s.continueThinking({operationId:op(),body:i===10?'SYNTHETIC_LARGE_BODY '+('长表达'.repeat(18000)):'SYNTHETIC_CONTENT_'+i+' '+(i%2?'访谈者说“我不愿意”，我还没做判断。':'我可能更适合消费产品，但现在样本还太少。')+' 👩‍💻 é\n'+('这是保留语气和归属的原话。'.repeat(8)),topicId:topic.id});records.push({id:row.id,at,i});if(i%3===0){const entry=await s.entry(row.id);await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:other.sectionId,expectedPlacementRevision:(await s.entryPaths(entry.id))[0].placement.revision,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});}}
   await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===records[164].id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
   // Durable Section/Placement rank owns reading order; expression dates remain facts.
   const ordered=[...records.filter(row=>row.i%3!==0),...records.filter(row=>row.i%3===0)].map(row=>row.id);
   const defaultSectionId=(await s.libraryPlacement(topic.id,records[164].id)).sectionId;await s.repository.close();
   const {ThoughtWorkspace}=await import('../ui/thoughts.js'),create=ThoughtWorkspace.prototype.createTopicReader;ThoughtWorkspace.prototype.createTopicReader=function(...args){globalThis.__d2Content=this;return create.apply(this,args);};
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2ContentReads=[];chrome.runtime.sendMessage=(message,...args)=>{const openIntent=globalThis.__d2Content?.openIntent;return Promise.resolve(send(message,...args)).then(result=>{if(message.type==='GET_LIBRARY_SECTION_READING'&&result?.ok){const read={options:message.options,ids:result.data.items.map(row=>row.entry.id),openIntent};__d2ContentReads.push(read);globalThis.__d2ReturnEvidence?.record('page-result',{...read,generation:result.data.coverage?.activeGeneration,cursorInvalid:result.data.cursorInvalid||false});}return result;});};
   return {topicId:topic.id,sectionId:other.sectionId,defaultSectionId,ordered,records};
  });
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).click();
  await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>=40),'first Content page');
  await p.evaluate(installReturnEvidence,{topicId:seed.topicId,targetId:seed.ordered[140]});
  assert.equal(await p.locator('#topic-time-order [data-reading-sort]').count(),1,'one frozen order toggle');assert.equal(await p.locator('#original-reading-body .reading-copy').count(),0,'Copy remains in row overflow');
  const next=p.locator('#topic-continuous-after');
  for(let i=0;i<6;i++){if(/末尾/.test(await p.locator('#topic-continuous-after-status').textContent()))break;const before=await p.evaluate(()=>__d2Content.topicReader.items.length);await next.evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await eventually(()=>p.evaluate(n=>__d2Content.topicReader.items.length>n||__d2Content.topicReader.terminalNext,before));}
  await eventually(()=>p.evaluate(()=>__d2Content.topicReader.terminalNext),'complete Content extent');
  const full=await p.evaluate(()=>({ids:__d2Content.topicReader.items.map(row=>row.entry.id),bodies:__d2Content.topicReader.items.filter(row=>!row.unloaded).length,meta:JSON.stringify(__d2Content.topicReader.pageMeta),snapshot:JSON.stringify(__d2Content.topicReader.snapshot()),editorRows:__d2Content.editor.entry.entries.size}));
  assert.deepEqual(full.ids,seed.ordered);
  const times=await p.evaluate(async topicId=>{const rows=[];let cursor=null;do{const result=await chrome.runtime.sendMessage({type:'GET_LIBRARY_SECTION_READING',options:{topicId,cursor,limit:40}});if(!result.ok||result.data.cursorInvalid)throw Error('TIME_PROOF_READ_FAILED');rows.push(...result.data.items.map(row=>({id:row.entry.id,time:row.entry.expressionTime})));cursor=result.data.nextCursor;}while(cursor);return rows;},seed.topicId);assert.equal(times.length,165);for(const row of times){const known=seed.records.find(record=>record.id===row.id);if(known.i!==164)assert.equal(row.time.at,known.at,'actual expression time is not replaced by Section order');else assert.equal(row.time.basis,'unknown');}assert.ok(full.bodies<=120);assert.ok(full.editorRows<=120);assert.ok(!full.meta.includes('SYNTHETIC_CONTENT_'));assert.ok(!full.snapshot.includes('SYNTHETIC_CONTENT_'));assert.equal(await p.locator('#original-reading-body [data-entry-id]').count(),120);
  const unknown=p.locator(`[data-entry-id="${seed.records[164].id}"]`);assert.match(await unknown.locator('.entry-sent-time').textContent(),/时间未知/);assert.equal(await unknown.getAttribute('data-section-id'),seed.defaultSectionId);assert.equal(await unknown.getAttribute('data-expression-year'),null,'retired year grouping remains absent');
  const mounted=await p.locator('#original-reading-body [data-entry-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.entryId));assert.deepEqual(mounted,seed.ordered.slice(-120),'the renderer preserves exact durable Section/Placement order');
  await p.locator('#original-reading-body [data-entry-id]').first().scrollIntoViewIfNeeded();
  mkdirSync('work/qa-dvn-topic-content',{recursive:true});const matrix=[];
  for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const width of [1440,1280,1024,768,390,320]){await p.setViewportSize({width,height:900});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,`${appearance}/${width}: ${overflow}`);await p.screenshot({path:`work/qa-dvn-topic-content/${variant}-${appearance}-${width}.png`});matrix.push({appearance,width,overflow});}}
  await p.setViewportSize({width:1440,height:900});const target=seed.ordered[140];await p.locator(`[data-entry-id="${target}"]`).scrollIntoViewIfNeeded();
  await p.locator('#topic-search').evaluate(input=>{input.value='SYNTHETIC_CONTENT_1 访谈者';input.dispatchEvent(new Event('input',{bubbles:true}));});await eventually(()=>p.locator('#original-reading-body [data-entry-id]').evaluateAll((nodes,id)=>nodes.length===1&&nodes[0].dataset.entryId===id,seed.records[1].id),'search reaches early unmounted expression');
  await p.locator('#topic-search').fill('');await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'closing search restores reading extent');assert.equal(await p.evaluate(()=>__d2Content.topicReader.items.length),165);
  // Preserve the original rapid pointer path, without a new settle before Back.
  // Its native auto-scroll may advance the window before the trusted click.
  await p.locator('#back').click();await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));
  const rapidSaved=await p.evaluate(topicId=>{
   const events=__d2ReturnEvidence.events,index=events.findLastIndex(row=>row.name==='click'&&row.detail.id==='back'&&row.detail.trusted),click=events[index];
   const record=events.slice(index+1).filter(row=>row.name==='rememberContent:returned'&&row.state.topicId===topicId&&row.state.saved).at(-1);
   if(!click||!record||record.state.openIntent!==click.state.openIntent+1)throw Error('TRUSTED_BACK_DEPARTURE_NOT_CAPTURED');
   return structuredClone({clickAt:click.at,savedAt:record.at,readCount:record.state.readCount,snapshot:record.state.saved});
  },seed.topicId);
  assert.deepEqual(rapidSaved.snapshot.extent,seed.ordered);assert.ok(rapidSaved.snapshot.anchor,'rapid pointer retains its actual saved anchor');const rapidAnchorIndex=seed.ordered.indexOf(rapidSaved.snapshot.anchor.id);assert.ok(rapidAnchorIndex>=rapidSaved.snapshot.windowStart&&rapidAnchorIndex<rapidSaved.snapshot.windowStart+120,'saved anchor belongs to its saved body window');
  await p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-entry-id="${rapidSaved.snapshot.anchor.id}"]`).count().then(n=>n===1),'rapid pointer return refetches the actual saved anchor');
  const rapidPointer=await assertReturnedWindow(p,{ids:rapidSaved.snapshot.extent,references:rapidSaved.snapshot.references,windowStart:rapidSaved.snapshot.windowStart,generation:rapidSaved.snapshot.generation,target:{id:rapidSaved.snapshot.anchor.id,top:rapidSaved.snapshot.anchor.top},readCount:rapidSaved.readCount},'rapid pointer return');rapidPointer.trustedDeparture=rapidSaved;
  const returnPaths={rapidPointer},retainPaths=()=>writeFileSync(`work/qa-dvn-topic-content/${variant}-return-paths.json`,JSON.stringify(returnPaths,null,2));retainPaths();
  await p.mouse.wheel(0,1000000);await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'rapid return continues forward to the original deep entry');await settleContent(p);rapidPointer.continuedTo140=true;retainPaths();
  await p.mouse.wheel(0,-1000000);await eventually(()=>p.locator(`[data-entry-id="${seed.ordered[0]}"]`).count().then(n=>n===1),'rapid return continues backward to the first entry');await settleContent(p);rapidPointer.continuedTo0=true;retainPaths();
  await p.mouse.wheel(0,1000000);await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'deep keyboard departure is reachable through actual paging');await p.locator(`[data-entry-id="${target}"]`).scrollIntoViewIfNeeded();
  // Back lives in the page header. Pointer activation of an offscreen locator
  // first scrolls to that header and intentionally changes the reading window.
  // Keep the deep-window contract on a real keyboard activation without scroll.
  await settleContent(p);await p.locator(`[data-entry-id="${target}"]`).scrollIntoViewIfNeeded();await settleContent(p);const deepDeparture=await p.evaluate(contentReturnState,target);assert.ok(deepDeparture.scroll>0&&deepDeparture.target?.top>=0&&deepDeparture.target.top<deepDeparture.height);assert.ok(deepDeparture.windowStart>0);assert.deepEqual(deepDeparture.ids,seed.ordered);
  await p.locator('#back').evaluate(node=>node.focus({preventScroll:true}));const focused=await p.evaluate(contentReturnState,target);assert.equal(focused.active,'back');assert.equal(focused.scroll,deepDeparture.scroll);assert.equal(focused.windowStart,deepDeparture.windowStart);assert.deepEqual(focused.anchor,deepDeparture.anchor);assert.deepEqual(focused.target,deepDeparture.target);
  await p.keyboard.press('Enter');await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'root return refetches saved window');assert.equal(await p.evaluate(()=>__d2Content.topicReader.items.length),165);
  const deepKeyboard=await assertReturnedWindow(p,deepDeparture,'deep keyboard return');returnPaths.deepKeyboard=deepKeyboard;retainPaths();
  await p.evaluate(()=>scrollTo(0,0));await eventually(()=>p.locator(`[data-entry-id="${seed.ordered[0]}"]`).count().then(n=>n===1),'evicted first window refetched');assert.ok(await p.evaluate(()=>__d2ContentReads.some(read=>read.options.anchorId&&read.options.expectedReadGeneration)));
  await settleContent(p);await p.evaluate(()=>scrollTo(0,0));await frame(p);const topDeparture=await p.evaluate(contentReturnState,seed.ordered[0]);assert.equal(topDeparture.scroll,0);assert.equal(topDeparture.windowStart,0);assert.deepEqual(topDeparture.ids,seed.ordered);assert.ok(topDeparture.back.top>=0&&topDeparture.back.bottom<=topDeparture.height,'pointer Back is already in the viewport');
  await p.locator('#back').click();await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-entry-id="${seed.ordered[0]}"]`).count().then(n=>n===1),'pointer root return refetches its actual departure window');assert.equal(await p.evaluate(()=>__d2Content.topicReader.items.length),165);
  const topPointer=await assertReturnedWindow(p,topDeparture,'stable top pointer return');returnPaths.topPointer=topPointer;retainPaths();
  await p.evaluate(()=>{__d2ReturnEvidence.record('root-return-assertions-passed');__d2ReturnEvidence.enabled=false;__d2ReturnEvidence.complete=true;});
  assert.ok(await p.evaluate(()=>__d2Content.topicReader.items.filter(row=>!row.unloaded).length<=120));
  // Reliable-time enrichment/invalidation may regroup clean rows, but cannot move a live IME owner.
  const composing=p.locator('#original-reading-body [data-entry-field="body"]').first();
  const composition=await composing.evaluate(field=>{globalThis.__d2ImeNode=field.closest('[data-entry-id]');globalThis.__d2ImeParent=__d2ImeNode.parentElement;const original=field.textContent;field.focus();field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));field.textContent='SYNTHETIC 未提交中文';const range=document.createRange();range.setStart(field.firstChild,8);range.collapse(true);getSelection().removeAllRanges();getSelection().addRange(range);return {id:__d2ImeNode.dataset.entryId,original};});
  await p.evaluate(async({id})=>{const {OrganizerStore}=await import('../core/organizer/store.js'),{invalidateThoughtTopicIndex}=await import('../core/thought-read-index.js'),s=new OrganizerStore(chrome.storage.local);await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}await invalidateThoughtTopicIndex(s,t,__d2Content.id,{sourceTime:true});});await s.repository.close();await __d2Content.refresh();},composition);
  const ime=await p.evaluate(()=>({same:document.querySelector('[data-entry-id="'+__d2ImeNode.dataset.entryId+'"]')===__d2ImeNode,parent:__d2ImeNode.parentElement===__d2ImeParent,text:__d2ImeNode.querySelector('[data-entry-field="body"]').textContent,caret:getSelection().anchorOffset}));assert.equal(ime.same,true);assert.equal(ime.parent,true);assert.equal(ime.text,'SYNTHETIC 未提交中文');assert.equal(ime.caret,8);
  for(const width of [1440,1280,1024,768,390,320]){await p.setViewportSize({width,height:900});assert.deepEqual(await p.evaluate(()=>{const field=__d2ImeNode.querySelector('[data-entry-field="body"]');return {same:document.querySelector('[data-entry-id="'+__d2ImeNode.dataset.entryId+'"]')===__d2ImeNode,parent:__d2ImeNode.parentElement===__d2ImeParent,text:field.textContent,caret:getSelection().anchorOffset,editable:field.contentEditable};}),{same:true,parent:true,text:'SYNTHETIC 未提交中文',caret:8,editable:'plaintext-only'});}
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});assert.equal(await p.evaluate(()=>__d2ImeNode.querySelector('[data-entry-field="body"]').textContent),'SYNTHETIC 未提交中文');assert.equal(await p.locator('.thought-mobile-edit,.thought-mobile-done').count(),0);assert.equal((await rpc(p,'GET_THOUGHT_REVERSE_EDIT')).enabled,false);await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});
  await p.evaluate(({original})=>{const field=__d2ImeNode.querySelector('[data-entry-field="body"]');field.textContent=original;field.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));field.blur();getSelection().removeAllRanges();},composition);
  // The next authority refresh must preserve the new note, without restoring a cached generation.

  const held=seed.ordered[100],fresh=await rpc(p,'GET_LIBRARY_ENTRY',{id:held});await rpc(p,'EDIT_LIBRARY_FIELDS',{edit:{operationId:crypto.randomUUID(),id:held,expectedRevision:fresh.revision,expectedFieldRevisions:fresh.fieldRevisions,changes:{note:'SYNTHETIC_FRESH_NOTE'}}});
  await eventually(()=>p.evaluate(()=>__d2Content.topicReader&&!__d2Content.topicReader.stale),'reconcile fresh Content generation');
  const large=p.locator(`[data-entry-id="${seed.records[10].id}"]`);
  await p.locator('#topic-search').fill('SYNTHETIC_LARGE_BODY');await eventually(async()=>await p.evaluate(()=>__d2Content.topicReader?.query)==='SYNTHETIC_LARGE_BODY'&&await p.locator('#original-reading-body [data-entry-id]').evaluateAll((nodes,id)=>nodes.length===1&&nodes[0].dataset.entryId===id,seed.records[10].id),'large-body search settles to the exact full-domain result');await settleContent(p);await large.getByRole('button',{name:'读取完整内容',exact:true}).click();await large.locator('[data-entry-field="body"]').waitFor();assert.equal(await large.locator('[data-entry-field="body"]').textContent(),'SYNTHETIC_LARGE_BODY '+('长表达'.repeat(18000)));await p.locator('#topic-heading h1').click();await p.evaluate(()=>__d2Content.renderTopicReader());assert.equal(await p.evaluate(id=>__d2Content.editor.entry.entries.has(id),seed.records[10].id),true,'clean expanded large body remains owned through a benign render');
  await large.locator('[data-entry-field="body"]').evaluate(node=>{node.focus();node.textContent+=' SYNTHETIC_SAVED_TAIL';node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));});await eventually(async()=>(await rpc(p,'GET_LIBRARY_ENTRY',{id:seed.records[10].id})).body.endsWith(' SYNTHETIC_SAVED_TAIL'),'editing the expanded large body is durably saved');await p.locator('#topic-heading h1').click();
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  writeFileSync(`work/qa-dvn-topic-content/${variant}.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,matrix,entries:165,durableSectionOrder:true,truthfulExpressionTime:true,unknownLegacy:true,boundedBodies:full.bodies,bodyFreeExtent:true,searchReturn:true,rootReturn:true,returnPaths,exactRefRefetch:true,timeChangeImePreserved:true,largeBodyEditorOwner:true,resizeImePreserved:true,localeCaptionOnly:true,singleOrderControl:true,zeroProviderCalls:true},null,2));
  await retainReturnEvidence(p,variant);
 }catch(error){await retainReturnEvidence(p,variant,error);throw error;}finally{await h.close();}
});


// The visual/preference journey owns a separate real reader instance. The
// original complete-extent journey above keeps its exact pre-Q5 interaction state.
function installVisualWindowEvidence(targetId){
 const owner=__d2Content,events=[],snapshot=()=>{const r=owner.topicReader,n=document.querySelector(`[data-entry-id="${targetId}"] [data-entry-field="body"]`),box=n?.getBoundingClientRect();return {targetId,scrollY,width:innerWidth,active:document.activeElement?.id,rect:box?{top:box.top,bottom:box.bottom}:null,windowStart:r?.windowStart,windowRevision:r?.windowRevision,bodyRevision:r?.bodyRevision,ids:r?.items.map(x=>x.entry.id),loadingNext:r?.loadingNext,loadingPrevious:r?.loadingPrevious,hydrating:r?.hydrating,restoring:owner.topicRestoring(),anchor:owner.topicAnchor()};};
 const record=(name,detail={})=>{try{events.push({at:performance.now(),name,detail,state:snapshot()});}catch(error){events.push({at:performance.now(),name,diagnosticError:String(error)});}if(events.length>250)events.shift();};
 globalThis.__d5WindowEvidence={events,snapshot,record};
 for(const name of ['loadTopicContinuous','renderTopicReader','shiftTopicWindow']){const original=owner[name];owner[name]=function(...args){record(name+':start',{argument:args[0]});const result=original.apply(this,args);if(result?.then)result.then(()=>record(name+':end'),()=>record(name+':error'));return result;};}
 const original=window.scrollBy;window.scrollBy=function(...args){record('scrollBy',{args,stack:new Error().stack});return original.apply(this,args);};
 addEventListener('scroll',()=>record('scroll'),{passive:true});record('full-extent-before-section');
}
for(const variant of ['source','release'])test(`D5 Content paired reading roles, preferences and pointer targets (${variant})`,{timeout:180000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;let d5;
 try{
  await p.setViewportSize({width:1440,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const seed=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC 跨章节的真实表达时间与不确定性',operationId:op()}),other=await s.createSection({topicId:topic.id,title:'SYNTHETIC 不决定年代的人工章节',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()}),records=[];
   for(let i=0;i<165;i++){const at=new Date(Date.UTC(i%2?2021:2023,0,1)+i*1000).toISOString();s.clock=()=>at;const row=await s.continueThinking({operationId:op(),body:i===10?'SYNTHETIC_LARGE_BODY '+('长表达'.repeat(18000)):'SYNTHETIC_CONTENT_'+i+' '+(i%2?'访谈者说“我不愿意”，我还没做判断。':'我可能更适合消费产品，但现在样本还太少。')+' 👩‍💻 é\n'+('这是保留语气和归属的原话。'.repeat(8)),topicId:topic.id});records.push({id:row.id,at,i});if(i%3===0){const entry=await s.entry(row.id);await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:other.sectionId,expectedPlacementRevision:(await s.entryPaths(entry.id))[0].placement.revision,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});}}
   await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===records[164].id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
   // Durable Section/Placement rank owns reading order; expression dates remain facts.
   const ordered=[...records.filter(row=>row.i%3!==0),...records.filter(row=>row.i%3===0)].map(row=>row.id);
   const defaultSectionId=(await s.libraryPlacement(topic.id,records[164].id)).sectionId;await s.repository.close();
   const {ThoughtWorkspace}=await import('../ui/thoughts.js'),create=ThoughtWorkspace.prototype.createTopicReader;ThoughtWorkspace.prototype.createTopicReader=function(...args){globalThis.__d2Content=this;return create.apply(this,args);};
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2ContentReads=[];chrome.runtime.sendMessage=(message,...args)=>Promise.resolve(send(message,...args)).then(result=>{if(message.type==='GET_LIBRARY_SECTION_READING'&&result?.ok)__d2ContentReads.push({options:message.options,ids:result.data.items.map(row=>row.entry.id)});return result;});
   return {topicId:topic.id,sectionId:other.sectionId,defaultSectionId,ordered,records};
  });
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).click();
  await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>=40),'first Content page');
  // Establish the complete 165-reference fixture before measuring successive layouts.
  // The visual matrix must not race a still-streaming Section navigation.
  for(let i=0;i<6&&!await p.evaluate(()=>__d2Content.topicReader.terminalNext);i++){const count=await p.evaluate(()=>__d2Content.topicReader.items.length);await p.locator('#topic-continuous-after').evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await eventually(()=>p.evaluate(n=>!__d2Content.topicReader.loadingNext&&(__d2Content.topicReader.items.length>n||__d2Content.topicReader.terminalNext),count),'visual Section fixture completes the actual reference extent');}assert.equal(await p.evaluate(()=>__d2Content.topicReader.items.length),165);
  await p.evaluate(installVisualWindowEvidence,seed.records[0].id);
  await p.evaluate(id=>__d2Content.focusSection(id),seed.sectionId);
  await p.evaluate(()=>__d5WindowEvidence.record('after-section'));
  d5=await openSectionReading(h,variant,'content',seed.records[0].id);

  for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const width of [1440,1280,1024,768,390,320]){await p.evaluate(()=>__d5WindowEvidence.record('before-resize'));await p.setViewportSize({width,height:900});await p.evaluate(()=>__d5WindowEvidence.record('after-resize'));await d5.capture(width,appearance);}}
  await d5.verifyPreferences();await d5.verifyTextZoom();await d5.finishInteractions();await d5.verifyHeaderInteractions(seed.records[1].id);
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);await d5.finish();
 }finally{try{try{await writeFile(`work/qa-dvn-topic-content/${variant}-visual-window.json`,JSON.stringify(await p.evaluate(()=>({events:globalThis.__d5WindowEvidence?.events,final:globalThis.__d5WindowEvidence?.snapshot()})),null,2));}catch(error){console.error('D5_WINDOW_DIAGNOSTIC_FAILED',String(error));}await d5?.close();}finally{await h.close();}}
});

// Test-local successor to retired D5 year geometry; unchanged shared header owner.
import {measureTopicHeader,assertTopicHeader,verifyTopicHeaderInteractions} from './harness/d5-topic-header.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {openThoughtReference,thoughtLayout,thoughtPalette} from './harness/d7-thought-reference.mjs';
import {openThoughtReadingOptions} from './harness/current-thought-navigation.mjs';
const fonts={small:16,standard:17,large:19,xlarge:21};
const widths={narrow:640,standard:680,wide:720};
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function measure(page,kind,id,reference=false){return page.evaluate(({kind,id,reference})=>{
 const entry=document.querySelector(reference?'.year .input-entry':kind==='content'?`#original-reading-body [data-entry-id="${id}"]`:'[data-year-section="2023"] .topic-year-expression');
 const year=entry?.closest(reference?'.year':kind==='content'?'.topic-section':'.topic-year-section');
 const nodes={header:document.querySelector(reference?'.topbar':'.workspace-header'),container:document.querySelector(reference?'.workspace.context':'#thought-panel'),heading:document.querySelector(reference?'.row h1':'#topic-heading h1'),year,yearHeading:year?.querySelector(reference?'.year-title':kind==='content'?'.section-heading h2':':scope>h2'),entry,stamp:entry?.querySelector(reference?'time':'.entry-sent-time'),prose:entry?.querySelector(reference?'.prose':kind==='content'?'[data-entry-field="body"]':'.entry-prose')};
 if(kind==='years')nodes.yearsNav=document.querySelector(reference?'.years':'.topic-year-links');
 const metrics=Object.fromEntries(Object.entries(nodes).map(([key,node])=>{if(!node)throw Error('Missing D5 reading role '+key);const r=node.getBoundingClientRect(),c=getComputedStyle(node);return [key,{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,visible:r.bottom>0&&r.top<innerHeight,text:node.textContent,...Object.fromEntries(['fontSize','lineHeight','fontWeight','fontFamily','fontSynthesis','color','marginTop','marginBottom','paddingTop','paddingBottom','paddingLeft','paddingRight','gap','borderTopWidth','borderBottomWidth','borderRadius','boxShadow'].map(key=>[key,c[key]]))}];}));
 return {scrollY,viewport:{width:innerWidth,height:innerHeight},font:getComputedStyle(document.documentElement).getPropertyValue('--paia-prose-size'),readingWidth:getComputedStyle(document.documentElement).getPropertyValue('--paia-prose-width'),nodes:metrics};
 },{kind,id,reference});}
async function openSectionReading(h,variant,kind,id){
 const p=h.archive,ref=await openThoughtReference(h,kind==='content'?'T02':'T04'),directory=`work/qa-dvn-topic-${kind}/d7`;
 const saved=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences,rows=[],failures=[],preferences=[],targets=[],headers=[],headerInteractions=[];
 await mkdir(directory,{recursive:true});await p.emulateMedia({reducedMotion:'reduce'});
 const persist=result=>writeFile(`${directory}/${variant}.json`,JSON.stringify({result,head:process.env.PAIA_TESTED_HEAD,variant,kind,rows,failures,preferences,targets,headers,headerInteractions,scope:'TOPIC-05.4 durable Section roles with retained D6.2 header, preference and interaction guarantees. T02 comparison is used only for unchanged header roles; retired year/tab composition is explicitly absent.'},null,2));
 const near=(a,b,label)=>{if(Math.abs(a-b)>2)failures.push(`${label}: ${a} != ${b}`);};
 const exact=(a,b,label)=>{if(a!==b)failures.push(`${label}: ${a} != ${b}`);};
 const body=()=>p.locator(kind==='content'?`[data-entry-id="${id}"] [data-entry-field="body"]`:'[data-year-section="2023"] .topic-year-expression .entry-prose').first();
 async function verifyPreference(label,fontSize,readingWidth){
  const measured=await measure(p,kind,id),n=measured.nodes,available=n.container.width-parseFloat(n.container.paddingLeft)-parseFloat(n.container.paddingRight),expectedWidth=Math.min(available,widths[readingWidth],760),expectedFont=fonts[fontSize];
  preferences.push({label,fontSize,readingWidth,expectedWidth,measured});await persist('PENDING');
  assert.equal(parseFloat(n.prose.fontSize),expectedFont,label+' saved body size');assert.ok(Math.abs(parseFloat(n.prose.lineHeight)-expectedFont*1.85)<.01,label+' body line height');assert.ok(Math.abs(n.year.width-expectedWidth)<=2,label+' exact saved reading-width formula');
  const actual=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;assert.equal(actual.fontSize,fontSize);assert.equal(actual.readingWidth,readingWidth);
 }
 async function overflowTarget(label){
  const trigger=p.locator(`[data-entry-id="${id}"] .entry-meta>.library-actions>summary`);await trigger.scrollIntoViewIfNeeded();await frame(p);
  const measured=await trigger.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);globalThis.__d5ReadingTrigger=node;return {width:r.width,height:r.height,hit:hit===node||node.contains(hit),pointerEvents:getComputedStyle(node).pointerEvents,coarse:matchMedia('(pointer:coarse)').matches};});
  targets.push({label,...measured});await persist('PENDING');assert.ok(measured.width>=44&&measured.height>=44,label+' actual44px target');assert.notEqual(measured.pointerEvents,'none');assert.equal(measured.hit,true,label+' uncovered target');
  await trigger.click();assert.equal(await trigger.evaluate(node=>node.parentElement.open),true,'pointer opens the owning menu');await p.keyboard.press('Escape');assert.equal(await trigger.evaluate(node=>!node.parentElement.open&&node===__d5ReadingTrigger&&document.activeElement===node),true,'Escape closes and returns focus to the same trigger');
 }
 return {
  async capture(width,theme){
   await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme),'D6.2 reading settled theme');
   await p.evaluate(()=>scrollTo(0,0));await frame(p);
   const production=await measure(p,kind,id),a=production.nodes,label=`${variant}/${kind}/${width}/${theme}`,layout=thoughtLayout(width),palette=thoughtPalette(theme);
   near(a.container.x,layout.rail,label+' workspace axis');near(a.container.width,width-layout.rail,label+' workspace width');near(a.heading.x,layout.rail+layout.gutter,label+' left reading axis');near(a.year.x,a.heading.x,label+' durable Section shares reading axis');
   for(const [key,value]of Object.entries({fontSize:width<768?'24px':'28px',lineHeight:width<768?'35px':'38px',fontWeight:'500',color:palette.text}))exact(a.heading[key],value,label+' heading.'+key);
   assert.match(a.heading.fontFamily,/Georgia/,'D6.2 serif heading role');
   assert.equal(await p.locator('#topic-original-tabs button').count(),0,'retired Content/Years tabs do not return');
   for(const [key,value]of Object.entries({fontSize:width<768?'20px':'22px',lineHeight:width<768?'30px':'33px',fontWeight:'500',marginBottom:'0px'}))exact(a.yearHeading[key],value,label+' yearHeading.'+key);
   for(const [key,value]of Object.entries({fontSize:'12px',lineHeight:'20px',marginBottom:'8px',color:await p.evaluate(()=>{const n=document.createElement('span');n.style.color='var(--muted)';document.body.append(n);const color=getComputedStyle(n).color;n.remove();return color;})}))exact(a.stamp[key],value,label+' stamp.'+key);
   exact(a.entry.marginBottom,kind==='years'?'20px':'32px',label+' entry.marginBottom');exact(a.year.paddingTop,'0px',label+' year.paddingTop');exact(a.year.borderBottomWidth,'0px',label+' year.borderBottomWidth');
   if(kind==='years')for(const [key,value]of Object.entries({gap:'12px',marginBottom:'24px'}))exact(a.yearsNav[key],value,label+' yearsNav.'+key);
   const current=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;await verifyPreference(label,current.fontSize,current.readingWidth);
   const stem=`${directory}/${variant}-${width}-${theme}`;await p.screenshot({path:stem+'-top-production.png'});const reference=await ref.capture(theme,stem+'-top-reference.png');
   const header={width,theme,production:await measureTopicHeader(p),reference};headers.push(header);await persist('PENDING');assertTopicHeader(header.production,reference,label);
   await p.evaluate(()=>__d5WindowEvidence?.record('before-body-scroll'));await body().scrollIntoViewIfNeeded();await p.evaluate(()=>__d5WindowEvidence?.record('after-body-scroll'));await frame(p);await p.evaluate(()=>__d5WindowEvidence?.record('after-body-frames'));
   const bodyProduction=await measure(p,kind,id);assert.ok(bodyProduction.nodes.prose.visible&&bodyProduction.nodes.prose.text.trim(),label+' actual body intersects viewport '+JSON.stringify({scroll:bodyProduction.scrollY,prose:bodyProduction.nodes.prose,section:bodyProduction.nodes.year}));
   await p.screenshot({path:stem+'-body-production.png'});rows.push({width,theme,production,reference,bodyProduction});await persist('PENDING');
   if(kind==='content'&&width<=390)await overflowTarget(label+' overflow');await p.evaluate(()=>scrollTo(0,0));await frame(p);
  },
  async verifyPreferences(){
   const initial=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;
   try{
    if(kind==='content')await body().evaluate(field=>{const node=field.firstChild,start=node.data.indexOf('👩‍💻');if(start<0)throw Error('Synthetic Unicode selection missing');globalThis.__d5PreferenceSelection={field,node,parent:field.parentElement,text:field.textContent,start,end:start+'👩‍💻'.length};const range=document.createRange();range.setStart(node,start);range.setEnd(node,__d5PreferenceSelection.end);getSelection().removeAllRanges();getSelection().addRange(range);});
    for(const width of [1440,767,320]){
     await p.setViewportSize({width,height:900});
     const combinations=[...Object.keys(fonts).map(fontSize=>({fontSize,readingWidth:'standard'})),...Object.keys(widths).map(readingWidth=>({fontSize:'standard',readingWidth}))];
     for(const changes of combinations){await rpc(p,'UPDATE_PREFERENCES',{changes});await eventually(()=>p.evaluate(({font,width})=>{const style=getComputedStyle(document.documentElement);return parseFloat(style.getPropertyValue('--paia-prose-size'))===font&&parseFloat(style.getPropertyValue('--paia-prose-width'))===width;},{font:fonts[changes.fontSize],width:widths[changes.readingWidth]}),'both saved reading preferences applied');await frame(p);await verifyPreference(`${width}/${changes.fontSize}/${changes.readingWidth}`,changes.fontSize,changes.readingWidth);
      if(kind==='content'){const selectionState=await p.evaluate(()=>{const s=__d5PreferenceSelection,selection=getSelection();return {sameNode:s.node===s.field.firstChild,sameParent:s.field.parentElement===s.parent,sameText:s.field.textContent===s.text,sameAnchor:selection.anchorNode===s.node,sameFocus:selection.focusNode===s.node,start:selection.anchorOffset,end:selection.focusOffset,expectedStart:s.start,expectedEnd:s.end,connected:s.field.isConnected,anchorName:selection.anchorNode?.nodeName,focusName:selection.focusNode?.nodeName,active:document.activeElement?.id,selected:selection.toString()};});assert.ok(selectionState.sameNode&&selectionState.sameParent&&selectionState.sameText&&selectionState.sameAnchor&&selectionState.sameFocus&&selectionState.start===selectionState.expectedStart&&selectionState.end===selectionState.expectedEnd,'reading preferences preserve exact authored node and Unicode selection '+JSON.stringify({width,changes,...selectionState}));}
     }
    }
   }finally{
    if(kind==='content')await p.evaluate(()=>{getSelection().removeAllRanges();delete globalThis.__d5PreferenceSelection;});await rpc(p,'UPDATE_PREFERENCES',{changes:{fontSize:initial.fontSize,readingWidth:initial.readingWidth}});await p.setViewportSize({width:1440,height:900});await frame(p);await persist('PENDING');
   }
   if(kind==='content'){
    const session=await h.context.newCDPSession(p);
    try{
     await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await openThoughtReadingOptions(p);assert.equal(await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),true,'actual coarse media query');
     const controls=await p.locator('#topic-toolbar :is(button,summary),#topic-reading-controls :is(button,summary,select),#topic-source-scope,#topic-outline>summary,#topic-original-tabs button').evaluateAll(nodes=>nodes.map(node=>({node,r:node.getBoundingClientRect()})).filter(({r})=>r.width&&r.height).map(({node,r})=>({id:node.id,text:node.textContent,width:r.width,height:r.height})));
     targets.push({label:'desktop coarse visible controls',controls});await persist('PENDING');assert.ok(controls.length>0);for(const control of controls)assert.ok(control.width>=44&&control.height>=44,`coarse control44px ${control.id||control.text}`);
     await p.locator('.dvn-topic-options>summary').click();await overflowTarget('desktop coarse overflow');
    }finally{await session.send('Emulation.setTouchEmulationEnabled',{enabled:false});await session.detach();await p.evaluate(()=>scrollTo(0,0));await frame(p);}
   }
  },
  async verifyTextZoom(){
   await p.setViewportSize({width:320,height:900});const before=await measure(p,kind,id);
   try{
    await p.evaluate(()=>{globalThis.__d5ReadingZoom=[...document.querySelectorAll('#thought-document h1,#thought-document h2,#thought-document p,#thought-document button,#thought-document summary,#thought-document select,#thought-document .entry-prose,#thought-document .entry-sent-time')].map(node=>({node,prior:node.style.getPropertyValue('font-size'),priority:node.style.getPropertyPriority('font-size'),size:parseFloat(getComputedStyle(node).fontSize)}));for(const item of __d5ReadingZoom)item.node.style.setProperty('font-size',(item.size*2)+'px','important');});
    await p.evaluate(()=>__d5WindowEvidence?.record('before-body-scroll'));await body().scrollIntoViewIfNeeded();await p.evaluate(()=>__d5WindowEvidence?.record('after-body-scroll'));await frame(p);await p.evaluate(()=>__d5WindowEvidence?.record('after-body-frames'));const measured=await measure(p,kind,id),overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    targets.push({label:'320px 200% text',overflow,measured});await persist('PENDING');await p.screenshot({path:`${directory}/${variant}-text200-320.png`});assert.equal(parseFloat(measured.nodes.prose.fontSize),parseFloat(before.nodes.prose.fontSize)*2,'actual prose computed size doubles');assert.ok(overflow<=2,'200% reading text has no horizontal page overflow');assert.ok(measured.nodes.prose.visible&&measured.nodes.prose.text.trim(),'200% actual body is visible');
    if(kind==='content')await overflowTarget('320px 200% text overflow');
   }finally{await p.evaluate(()=>{for(const item of globalThis.__d5ReadingZoom||[])item.node.style.setProperty('font-size',item.prior,item.priority);delete globalThis.__d5ReadingZoom;scrollTo(0,0);});await p.setViewportSize({width:1440,height:900});await frame(p);}
  },
  async finishInteractions(){
   if(kind!=='content')return;
   const observe=label=>p.evaluate(label=>{const active=document.activeElement,selection=getSelection();return {label,active:{tag:active?.tagName,id:active?.id,entryId:active?.closest('[data-entry-id]')?.dataset.entryId||null},pins:[...__d2Content.editor.entry.protectedIds()],selectionCollapsed:selection?.isCollapsed,openEntryMenus:[...document.querySelectorAll('#original-reading-body [data-entry-id] details[open]')].map(node=>node.closest('[data-entry-id]').dataset.entryId)};},label);
   const before=await observe('after exact menu focus return');targets.push(before);await persist('PENDING');assert.equal(before.active.entryId,id,'the added menu journey retains its exact first-entry invoker');assert.deepEqual(before.pins,[id],'the existing owner protects that focused entry');
   await p.locator('#topic-heading h1').click();await frame(p);const after=await observe('neutral heading focus before original paging journey');targets.push(after);await persist('PENDING');assert.equal(after.active.entryId,null);assert.deepEqual(after.pins,[],'explicitly leave the completed interaction before testing the unpinned120-row paging window');assert.deepEqual(after.openEntryMenus,[]);
  },
  async verifyHeaderInteractions(searchMatchId){assert.equal(kind,'content','native additions stay in the isolated Content visual fixture');try{await verifyTopicHeaderInteractions(h,variant,searchMatchId,{directory,persist,interactions:headerInteractions});}catch(error){failures.push('header interactions: '+error.message);await persist('FAIL');throw error;}},
  async state(name,selector){const target=p.locator(selector).first();await target.scrollIntoViewIfNeeded();assert.ok((await target.textContent()).trim());await p.screenshot({path:`${directory}/${variant}-${name}.png`});},
  async finish(){await persist(failures.length?'FAIL':'PASS');assert.deepEqual(failures,[],'all observed fixed Thought reading comparisons must pass');},
  async close(){await ref.close();await p.emulateMedia({reducedMotion:'no-preference'});await rpc(p,'UPDATE_PREFERENCES',{changes:{fontSize:saved.fontSize,readingWidth:saved.readingWidth}});}
 };
}
