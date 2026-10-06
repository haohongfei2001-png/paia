import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openD5ThoughtReading} from './harness/d5-thought-reading.mjs';
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
const settleContent=p=>eventually(()=>p.evaluate(()=>{const owner=__d2Content,reader=owner.topicReader;return document.getElementById('thought-document').dataset.state==='ready'&&!document.getElementById('topic-body').inert&&!owner.topicWindowShifting&&reader&&!reader.hydrating&&!reader.hydrationPromise&&!reader.loadingNext&&!reader.loadingPrevious;}),'current Content window settles');
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
for(const variant of ['source','release'])test(`D2 Content trusted chronology, bounded bodies and exact return (${variant})`,{timeout:180000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;
 try{
  await p.setViewportSize({width:1440,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const seed=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC 跨章节的真实表达时间与不确定性',operationId:op()}),other=await s.createSection({topicId:topic.id,title:'SYNTHETIC 不决定年代的人工章节',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()}),records=[];
   for(let i=0;i<165;i++){const at=new Date(Date.UTC(i%2?2021:2023,0,1)+i*1000).toISOString();s.clock=()=>at;const row=await s.continueThinking({operationId:op(),body:i===10?'SYNTHETIC_LARGE_BODY '+('长表达'.repeat(18000)):'SYNTHETIC_CONTENT_'+i+' '+(i%2?'访谈者说“我不愿意”，我还没做判断。':'我可能更适合消费产品，但现在样本还太少。')+' 👩‍💻 é\n'+('这是保留语气和归属的原话。'.repeat(8)),topicId:topic.id});records.push({id:row.id,at,i});if(i%3===0){const entry=await s.entry(row.id);await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:other.sectionId,expectedPlacementRevision:(await s.entryPaths(entry.id))[0].placement.revision,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});}}
   await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===records[164].id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
   const ordered=records.slice(0,164).sort((a,b)=>a.at.localeCompare(b.at)).map(row=>row.id);ordered.push(records[164].id);
   await s.repository.close();
   const {ThoughtWorkspace}=await import('../ui/thoughts.js'),create=ThoughtWorkspace.prototype.createTopicReader;ThoughtWorkspace.prototype.createTopicReader=function(...args){globalThis.__d2Content=this;return create.apply(this,args);};
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2ContentReads=[];chrome.runtime.sendMessage=(message,...args)=>{const openIntent=globalThis.__d2Content?.openIntent;return Promise.resolve(send(message,...args)).then(result=>{if(message.type==='TOPIC_DOCUMENT_PAGE'&&result?.ok){const read={options:message.options,ids:result.data.items.map(row=>row.entry.id),openIntent};__d2ContentReads.push(read);globalThis.__d2ReturnEvidence?.record('page-result',{...read,generation:result.data.coverage?.activeGeneration,cursorInvalid:result.data.cursorInvalid||false});}return result;});};
   return {topicId:topic.id,ordered,records};
  });
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`[data-topic-id="${seed.topicId}"]`).click();
  await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>=40),'first Content page');
  await p.evaluate(installReturnEvidence,{topicId:seed.topicId,targetId:seed.ordered[140]});
  assert.equal(await p.locator('#topic-time-order [data-reading-sort]').count(),1,'one frozen order toggle');assert.equal(await p.locator('#original-reading-body .reading-copy').count(),0,'Copy remains in row overflow');
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
  // Preserve the original rapid pointer path, without a new settle before Back.
  // Its native auto-scroll may advance the window before the trusted click.
  await p.locator('#back').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));
  const rapidSaved=await p.evaluate(topicId=>{
   const events=__d2ReturnEvidence.events,index=events.findLastIndex(row=>row.name==='click'&&row.detail.id==='back'&&row.detail.trusted),click=events[index];
   const record=events.slice(index+1).filter(row=>row.name==='rememberContent:returned'&&row.state.topicId===topicId&&row.state.saved).at(-1);
   if(!click||!record||record.state.openIntent!==click.state.openIntent+1)throw Error('TRUSTED_BACK_DEPARTURE_NOT_CAPTURED');
   return structuredClone({clickAt:click.at,savedAt:record.at,readCount:record.state.readCount,snapshot:record.state.saved});
  },seed.topicId);
  assert.deepEqual(rapidSaved.snapshot.extent,seed.ordered);assert.ok(rapidSaved.snapshot.anchor,'rapid pointer retains its actual saved anchor');const rapidAnchorIndex=seed.ordered.indexOf(rapidSaved.snapshot.anchor.id);assert.ok(rapidAnchorIndex>=rapidSaved.snapshot.windowStart&&rapidAnchorIndex<rapidSaved.snapshot.windowStart+120,'saved anchor belongs to its saved body window');
  await p.locator(`[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-entry-id="${rapidSaved.snapshot.anchor.id}"]`).count().then(n=>n===1),'rapid pointer return refetches the actual saved anchor');
  const rapidPointer=await assertReturnedWindow(p,{ids:rapidSaved.snapshot.extent,references:rapidSaved.snapshot.references,windowStart:rapidSaved.snapshot.windowStart,generation:rapidSaved.snapshot.generation,target:{id:rapidSaved.snapshot.anchor.id,top:rapidSaved.snapshot.anchor.top},readCount:rapidSaved.readCount},'rapid pointer return');rapidPointer.trustedDeparture=rapidSaved;
  const returnPaths={rapidPointer},retainPaths=()=>writeFileSync(`work/qa-dvn-topic-content/${variant}-return-paths.json`,JSON.stringify(returnPaths,null,2));retainPaths();
  await p.mouse.wheel(0,1000000);await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'rapid return continues forward to the original deep entry');await settleContent(p);rapidPointer.continuedTo140=true;retainPaths();
  await p.mouse.wheel(0,-1000000);await eventually(()=>p.locator(`[data-entry-id="${seed.ordered[0]}"]`).count().then(n=>n===1),'rapid return continues backward to the first entry');await settleContent(p);rapidPointer.continuedTo0=true;retainPaths();
  await p.mouse.wheel(0,1000000);await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'deep keyboard departure is reachable through actual paging');await p.locator(`[data-entry-id="${target}"]`).scrollIntoViewIfNeeded();
  // Back lives in the page header. Pointer activation of an offscreen locator
  // first scrolls to that header and intentionally changes the reading window.
  // Keep the deep-window contract on a real keyboard activation without scroll.
  await settleContent(p);const deepDeparture=await p.evaluate(contentReturnState,target);assert.ok(deepDeparture.scroll>0&&deepDeparture.target?.top>=0&&deepDeparture.target.top<deepDeparture.height);assert.ok(deepDeparture.windowStart>0);assert.deepEqual(deepDeparture.ids,seed.ordered);
  await p.locator('#back').evaluate(node=>node.focus({preventScroll:true}));const focused=await p.evaluate(contentReturnState,target);assert.equal(focused.active,'back');assert.equal(focused.scroll,deepDeparture.scroll);assert.equal(focused.windowStart,deepDeparture.windowStart);assert.deepEqual(focused.anchor,deepDeparture.anchor);assert.deepEqual(focused.target,deepDeparture.target);
  await p.keyboard.press('Enter');await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-entry-id="${target}"]`).count().then(n=>n===1),'root return refetches saved window');assert.equal(await p.evaluate(()=>__d2Content.topicReader.items.length),165);
  const deepKeyboard=await assertReturnedWindow(p,deepDeparture,'deep keyboard return');returnPaths.deepKeyboard=deepKeyboard;retainPaths();
  await p.evaluate(()=>scrollTo(0,0));await eventually(()=>p.locator(`[data-entry-id="${seed.ordered[0]}"]`).count().then(n=>n===1),'evicted first window refetched');assert.ok(await p.evaluate(()=>__d2ContentReads.some(read=>read.options.anchorId&&read.options.expectedReadGeneration)));
  await settleContent(p);const topDeparture=await p.evaluate(contentReturnState,seed.ordered[0]);assert.equal(topDeparture.scroll,0);assert.equal(topDeparture.windowStart,0);assert.deepEqual(topDeparture.ids,seed.ordered);assert.ok(topDeparture.back.top>=0&&topDeparture.back.bottom<=topDeparture.height,'pointer Back is already in the viewport');
  await p.locator('#back').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-entry-id="${seed.ordered[0]}"]`).count().then(n=>n===1),'pointer root return refetches its actual departure window');assert.equal(await p.evaluate(()=>__d2Content.topicReader.items.length),165);
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
  await p.locator('#topic-search').fill('SYNTHETIC_LARGE_BODY');await eventually(()=>large.count().then(n=>n===1),'large-body search remains full domain');await large.getByRole('button',{name:'读取完整内容',exact:true}).click();await large.locator('[data-entry-field="body"]').waitFor();assert.equal(await large.locator('[data-entry-field="body"]').textContent(),'SYNTHETIC_LARGE_BODY '+('长表达'.repeat(18000)));await p.locator('#topic-heading h1').click();await p.evaluate(()=>__d2Content.renderTopicReader());assert.equal(await p.evaluate(id=>__d2Content.editor.entry.entries.has(id),seed.records[10].id),true,'clean expanded large body remains owned through a benign render');
  await large.locator('[data-entry-field="body"]').evaluate(node=>{node.focus();node.textContent+=' SYNTHETIC_SAVED_TAIL';node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));});await eventually(async()=>(await rpc(p,'GET_LIBRARY_ENTRY',{id:seed.records[10].id})).body.endsWith(' SYNTHETIC_SAVED_TAIL'),'editing the expanded large body is durably saved');await p.locator('#topic-heading h1').click();
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  writeFileSync(`work/qa-dvn-topic-content/${variant}.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,matrix,entries:165,trustedGlobalChronology:true,unknownLegacy:true,boundedBodies:full.bodies,bodyFreeExtent:true,searchReturn:true,rootReturn:true,returnPaths,exactRefRefetch:true,timeChangeImePreserved:true,largeBodyEditorOwner:true,resizeImePreserved:true,localeCaptionOnly:true,singleOrderControl:true,zeroProviderCalls:true},null,2));
  await retainReturnEvidence(p,variant);
 }catch(error){await retainReturnEvidence(p,variant,error);throw error;}finally{await h.close();}
});


// The visual/preference journey owns a separate real reader instance. The
// original complete-extent journey above keeps its exact pre-Q5 interaction state.
for(const variant of ['source','release'])test(`D5 Content paired reading roles, preferences and pointer targets (${variant})`,{timeout:180000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;let d5;
 try{
  await p.setViewportSize({width:1440,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const seed=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC 跨章节的真实表达时间与不确定性',operationId:op()}),other=await s.createSection({topicId:topic.id,title:'SYNTHETIC 不决定年代的人工章节',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()}),records=[];
   for(let i=0;i<165;i++){const at=new Date(Date.UTC(i%2?2021:2023,0,1)+i*1000).toISOString();s.clock=()=>at;const row=await s.continueThinking({operationId:op(),body:i===10?'SYNTHETIC_LARGE_BODY '+('长表达'.repeat(18000)):'SYNTHETIC_CONTENT_'+i+' '+(i%2?'访谈者说“我不愿意”，我还没做判断。':'我可能更适合消费产品，但现在样本还太少。')+' 👩‍💻 é\n'+('这是保留语气和归属的原话。'.repeat(8)),topicId:topic.id});records.push({id:row.id,at,i});if(i%3===0){const entry=await s.entry(row.id);await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:other.sectionId,expectedPlacementRevision:(await s.entryPaths(entry.id))[0].placement.revision,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});}}
   await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===records[164].id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
   const ordered=records.slice(0,164).sort((a,b)=>a.at.localeCompare(b.at)).map(row=>row.id);ordered.push(records[164].id);
   await s.repository.close();
   const {ThoughtWorkspace}=await import('../ui/thoughts.js'),create=ThoughtWorkspace.prototype.createTopicReader;ThoughtWorkspace.prototype.createTopicReader=function(...args){globalThis.__d2Content=this;return create.apply(this,args);};
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2ContentReads=[];chrome.runtime.sendMessage=(message,...args)=>Promise.resolve(send(message,...args)).then(result=>{if(message.type==='TOPIC_DOCUMENT_PAGE'&&result?.ok)__d2ContentReads.push({options:message.options,ids:result.data.items.map(row=>row.entry.id)});return result;});
   return {topicId:topic.id,ordered,records};
  });
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`[data-topic-id="${seed.topicId}"]`).click();
  await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>=40),'first Content page');
  d5=await openD5ThoughtReading(h,variant,'content',seed.ordered[0]);
  for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const width of [1440,1280,1024,768,390,320]){await p.setViewportSize({width,height:900});await d5.capture(width,appearance);}}
  await d5.verifyPreferences();await d5.verifyTextZoom();await d5.finishInteractions();await d5.verifyHeaderInteractions();
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);await d5.finish();
 }finally{try{await d5?.close();}finally{await h.close();}}
});
