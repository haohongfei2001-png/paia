import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
const release=mkdtempSync(join(tmpdir(),'paia-iah11-results-'));
test.after(()=>rmSync(release,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',release],{encoding:'utf8'}));
const out=new URL('../work/iah11-results/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
for(const variant of ['source','release'])test(`IAH11 actual Input-first results preserve selection, native activation and flat narrow/dark presentation (${variant})`,{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({headless:true,...(variant==='release'?{extensionPath:release}:{})}),p=h.archive;
 try{
  // Controlled receiver delivery race only: the worker and IDB remain real.
  await p.addInitScript(()=>{const add=chrome.runtime.onMessage.addListener.bind(chrome.runtime.onMessage);window.__iahHeldNotices=[];window.__iahNoticeTrace=[];window.__iahHoldCause=null;chrome.runtime.onMessage.addListener=listener=>add((...args)=>{const message=args[0];if(message?.type==='ARCHIVE_CHANGED'&&window.__iahHoldCause===message.cause){window.__iahHeldNotices.push(()=>{window.__iahNoticeTrace.push({phase:'delivered',cause:message.cause});return listener(...args);});window.__iahNoticeTrace.push({phase:'held',cause:message.cause});return;}return listener(...args);});});await p.reload();
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const title='SYNTHETIC_TITLE_ONLY '+ 'LongSyntheticLocation'.repeat(16);
  const text='SYNTHETIC_NEEDLE Do not publish unless approved. 中文 👩‍💻 é. İx ＱＺ';
  const initialSource=await h.open({id:'iah11-results',title,base:1609459200,messages:[{id:'iah11-input',text}]});
  await eventually(async()=>(await h.state()).records.length===1);
  await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),{SourceStructureStore}=await import('../core/source-structure-store.js');
   const store=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(store);await store.finishFoundation();
   const conversationRef={platform:'chatgpt',sourceConversationId:'iah11-results'},previous=await structure.conversation(conversationRef);
   const projectRef={providerKey:'chatgpt',namespace:'iah-source-fixture',projectId:'source-project'};
   const evidence={id:'iah-source-path',contractId:'iah.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:1,evidenceKind:'relationship',digest:'1'.repeat(64)};
   await structure.observeConversation({conversationRef,expectedRevision:previous?.relationshipRevision||0,observedAt:new Date(Math.max(Date.now(),Date.parse(previous?.lastObservedAt||'')||0)+1000).toISOString(),evidence,membership:{state:'project',projectRef},projectName:'Synthetic source Project',sourceStatus:'observed_active'});
   await structure.observeProject({projectRef,expectedRevision:0,observedAt:new Date(Date.now()+2000).toISOString(),evidence:{...evidence,id:'iah-source-project'},currentName:'Synthetic source Project',sourceStatus:'observed_active'});
  });
  assert.equal(await p.locator('#scope-search').getAttribute('placeholder'),'搜索全部档案');await p.locator('#scope-search').fill('SYNTHETIC_NEEDLE');await eventually(()=>p.locator('.search-input').count().then(n=>n===1));
  const row=p.locator('.search-input');assert.equal(await row.locator(':scope > :first-child').textContent(),text);assert.equal(await row.locator('.search-result-path').textContent(),'ChatGPT · Synthetic source Project · '+title);assert.equal(await row.locator('.search-title-match').count(),0);
  // Native pointer drag must not become activation. No programmatic Selection
  // and no forced clicks stand in for the actual text-selection gesture.
  await p.bringToFront();const box=await row.locator('.search-excerpt').boundingBox();await p.mouse.move(box.x+5,box.y+8);await p.mouse.down();await p.mouse.move(box.x+180,box.y+8,{steps:12});await p.mouse.up();
  assert.ok(await p.evaluate(()=>document.getSelection().toString().length>0),'real pointer drag selects excerpt');assert.equal(await p.locator('#document-panel').isVisible(),false,'selection does not open Reader');
  await row.focus();await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());assert.match(await p.locator('#document-body').textContent(),/Do not publish unless approved/);assert.equal(await p.locator('#reader-scope-search').getAttribute('placeholder'),'在此对话中查找');assert.equal(await p.locator('#scope-search').inputValue(),'SYNTHETIC_NEEDLE','opening Reader retains the separate Archive query');
  assert.equal(await p.locator('#back .archive-back-label').textContent(),'返回搜索结果','Back names the recorded search origin');
  const originKey=await p.evaluate(()=>history.state.paiaReader.originKey);assert.match(originKey,/^[a-f0-9-]{36}$/);
  await eventually(()=>p.evaluate(()=>{const id=history.state.paiaReader.documentId;return [...document.querySelectorAll('.archive-navigator-window')].some(node=>node.dataset.documentId===id&&node.getAttribute('aria-current')==='page');}),'current Reader Conversation is ready in the async Navigator before composition');
  await p.evaluate(()=>{window.__iahHistoryWrites=[];const original=history.replaceState;history.replaceState=function(...args){window.__iahHistoryWrites.push({route:args[0]?.paiaReader,stack:new Error().stack});return original.apply(this,args);};});
  await p.evaluate(async()=>{const {ArchiveNavigator}=await import('./archive-navigator.js'),original=ArchiveNavigator.prototype.restoreNavigation;window.__iahOriginRestores=[];ArchiveNavigator.prototype.restoreNavigation=function(...args){window.__iahOriginRestores.push({snapshot:structuredClone(args[0]),stack:new Error().stack});return original.apply(this,args);};window.__iahRestoreNavigatorTrace=()=>{ArchiveNavigator.prototype.restoreNavigation=original;};});
  const composingField=p.locator('#document-body [data-edit-id]').first();await composingField.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));
  const guardedRoute=await p.evaluate(()=>{window.__iahComposingNode=document.querySelector('#document-body [data-edit-id]');return {route:structuredClone(history.state.paiaReader),length:history.length,text:window.__iahComposingNode.textContent,query:document.querySelector('#scope-search').value,scope:[document.querySelector('#archive-source-scope').value,document.querySelector('#search-date-start').value,document.querySelector('#search-date-end').value,document.querySelector('#search-include-filtered').checked],tree:[...document.querySelectorAll('.archive-navigator-window')].map(n=>[n.dataset.documentId,n.getAttribute('aria-current')])};});await p.locator('#back').click();await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await p.locator('#document-panel').isVisible(),true,'native composing Reader refuses origin return');const afterGuard=await p.evaluate(()=>({route:structuredClone(history.state.paiaReader),length:history.length,text:document.querySelector('#document-body [data-edit-id]').textContent,query:document.querySelector('#scope-search').value,scope:[document.querySelector('#archive-source-scope').value,document.querySelector('#search-date-start').value,document.querySelector('#search-date-end').value,document.querySelector('#search-include-filtered').checked],tree:[...document.querySelectorAll('.archive-navigator-window')].map(n=>[n.dataset.documentId,n.getAttribute('aria-current')]),sameNode:window.__iahComposingNode===document.querySelector('#document-body [data-edit-id]')}));writeFileSync(out+variant+'-ime-history.json',JSON.stringify({before:guardedRoute,after:afterGuard,trace:await p.evaluate(()=>({history:window.__iahHistoryWrites,restores:window.__iahOriginRestores}))},null,2));assert.deepEqual(await p.evaluate(()=>window.__iahOriginRestores),[],'rejected composition never applies a saved Navigator origin');await p.evaluate(()=>window.__iahRestoreNavigatorTrace());delete guardedRoute.tree;delete afterGuard.tree;assert.equal(afterGuard.sameNode,true,'composition keeps the exact editor node');delete afterGuard.sameNode;for(const captured of [guardedRoute,afterGuard]){assert.ok(Number.isSafeInteger(captured.route.anchor.offset)&&captured.route.anchor.offset>=0);delete captured.route.anchor.offset;}assert.deepEqual(afterGuard,guardedRoute,'refused composition keeps route identity, origin, history length, body, query and scope; live caret offset and independent tree indexing may update');
  await composingField.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));

  await p.evaluate(()=>{window.__iahLocaleNode=document.querySelector('#document-body [data-edit-id]');window.__iahLocaleText=window.__iahLocaleNode.textContent;});
  for(const [language,label]of [['en','Back to search results'],['zh-CN','返回搜索结果']]){
   const changed=await p.evaluate(language=>chrome.runtime.sendMessage({type:'UPDATE_PREFERENCES',changes:{language}}),language);assert.equal(changed.ok,true);
   await eventually(()=>p.locator('#back .archive-back-label').textContent().then(text=>text===label),'Back responds to real live language preference');
   assert.equal(await p.evaluate(()=>window.__iahLocaleNode===document.querySelector('#document-body [data-edit-id]')&&window.__iahLocaleNode.textContent===window.__iahLocaleText),true,'live locale preserves the exact editable node and body');
  }
  await p.locator('#reader-scope-search').fill('approved');
  await p.locator('.sidebar [data-view="settings"]').click();await eventually(()=>p.locator('#settings-panel').isVisible());
  await p.locator('#ux-settings-back').click();await eventually(()=>p.locator('#document-panel').isVisible());assert.equal(await p.locator('#reader-scope-search').inputValue(),'approved','Settings retains Reader Find independently');assert.equal(await p.evaluate(()=>history.state.paiaReader.originKey),originKey);
  const beforeReturn=await p.evaluate(()=>history.length);
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  assert.equal(await p.evaluate(()=>history.length),beforeReturn,'explicit origin return replaces Reader, avoiding another Reader/result cycle');
  assert.equal(await p.locator('#scope-search').inputValue(),'SYNTHETIC_NEEDLE');assert.equal(await row.evaluate(n=>n===document.activeElement),true,'same Input identity receives origin focus');
  await row.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());
  await p.evaluate(()=>history.back());await eventually(()=>p.locator('#collection-panel').isVisible());assert.equal(await p.locator('#scope-search').inputValue(),'SYNTHETIC_NEEDLE');
  await p.evaluate(()=>history.forward());await eventually(()=>p.locator('#document-panel').isVisible());assert.equal(await p.locator('#reader-scope-search').inputValue(),'approved');
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());await p.locator('#scope-search').fill('SYNTHETIC_TITLE_ONLY');await eventually(()=>p.locator('.search-title-match').count().then(n=>n===1));assert.equal(await row.locator('.search-excerpt mark').count(),0);
  for(const {name,width,dark} of [{name:'wide',width:1440,dark:false},{name:'narrow',width:320,dark:false},{name:'narrow-dark',width:320,dark:true}]){
   await p.setViewportSize({width,height:900});await p.evaluate(dark=>document.documentElement.dataset.paiaTheme=dark?'dark':'light',dark);await row.scrollIntoViewIfNeeded();assert.equal(await row.evaluate(el=>getComputedStyle(el).borderRadius),'0px');assert.equal(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'result reflows without horizontal overflow');await p.screenshot({path:out+variant+'-'+name+'.png'});
  }
  await p.setViewportSize({width:1440,height:900});
  const inputId=await row.getAttribute('data-input-id');
  const readInput=()=>p.evaluate(async id=>{const r=await chrome.runtime.sendMessage({type:'GET_INPUT',id});if(!r.ok)throw Error(JSON.stringify(r));return r.data;},inputId);
  const before=await readInput(),unicode=[];
  await row.focus();await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible(),'title-only hit opens current Input');
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.doesNotMatch(await p.locator('#notice').textContent(),/匹配.*(?:变化|改变|不再)|(?:match|phrase).*(?:changed|no longer)/i,'original title-only hit is not a vanished body match');assert.deepEqual(await readInput(),before);
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  for(const [query,original] of [['x','x'],['qz','ＱＺ'],['é','é']]){
   await p.locator('#scope-search').fill(query);
   await eventually(async()=>await row.locator('.search-excerpt mark').allTextContents().then(values=>values.includes(original)),'Unicode result marks the original glyphs');
   await row.focus();await p.keyboard.press('Enter');
   await eventually(()=>p.locator('#document-panel').isVisible(),'Unicode result opens actual Reader');
   const rangeEvidence=()=>p.evaluate(({inputId,original})=>{
    const field=document.querySelector('[data-edit-id="'+inputId+'"]');
    const ranges=[...(CSS.highlights.get('paia-search')||[])].filter(range=>field?.contains(range.startContainer));
    return {body:field?.textContent,ranges:ranges.map(range=>({text:range.toString(),start:range.startOffset,end:range.endOffset,visible:range.getBoundingClientRect().height>0})),matched:ranges.some(range=>range.toString()===original)};
   },{inputId,original});
   await eventually(async()=>(await rangeEvidence()).matched,'actual Reader CSS Range uses original Unicode');
   const evidence=await rangeEvidence();assert.equal(evidence.body,text);assert.ok(evidence.ranges.some(range=>range.text===original&&range.visible));
   assert.deepEqual(await readInput(),before,'search arrival never changes canonical Input or revision');unicode.push({query,original,...evidence});
   await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  }
  writeFileSync(out+variant+'-unicode.json',JSON.stringify({inputId,before,after:await readInput(),unicode},null,2));
  await p.locator('#scope-search').fill('SYNTHETIC_NEEDLE');await eventually(()=>row.count().then(n=>n===1));await row.focus();await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());assert.equal(await p.locator('#scope-search').inputValue(),'SYNTHETIC_NEEDLE','ordinary Back preserves Archive query');
  await row.focus();await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());
  await p.locator('#primary-nav [data-view="library"]').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  assert.equal(await p.locator('#scope-search').inputValue(),'','primary Archive starts a fresh query');assert.equal(await p.locator('#document-panel').isVisible(),false);assert.equal(await p.locator('.search-input').count(),0);assert.equal(await p.locator('#scope-search').getAttribute('placeholder'),'搜索全部档案');

  assert.match(initialSource.url(),/\/c\/iah11-results$/);await initialSource.close(); // End this completed synthetic capture before the later independent working-edit proof.
  const filteredChat={id:'iah11-filter-context',title:'SYNTHETIC_FILTER_CONTEXT',base:1609459300,messages:[{id:'iah11-normal',text:'SYNTHETIC_NORMAL_CONTEXT'},{id:'iah11-filter-before',text:'继续'},{id:'iah11-filter-target',text:'请继续'},{id:'iah11-filter-after',text:'开始吧'}]};
  const filteredSource=await h.open(filteredChat);await eventually(async()=>(await h.state()).records.length===5);
  await eventually(async()=>{const r=await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}));return r.ok&&r.data.items.length===3;},'three actual captured Inputs are filtered');
  const capture=(await h.state()).records,targetRecord=capture.find(r=>r.originalText==='请继续'),normalRecord=capture.find(r=>r.originalText==='SYNTHETIC_NORMAL_CONTEXT');
  assert.ok(targetRecord&&normalRecord);const targetId='block:'+targetRecord.id,normalId='block:'+normalRecord.id;
  const filterState=()=>p.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('paia-archive');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{const names=['records','blocks','filterInputs','filterIntents','inputStates','revisions'],tx=db.transaction(names,'readonly');return Object.fromEntries(await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const r=tx.objectStore(name).getAll();r.onsuccess=()=>resolve([name,r.result]);r.onerror=()=>reject(r.error);}))))}finally{db.close();}});
  const filterBefore=await filterState();
  assert.equal(await p.locator('#search-include-filtered').isChecked(),true,'ordinary Archive Find includes filtered Inputs without an explicit checkbox action');await p.locator('#scope-search').fill('请继续');
  const filteredRow=p.locator('.search-input[data-input-id="'+targetId+'"]');await eventually(()=>filteredRow.count().then(n=>n===1),'explicit filtered search exposes target');await filteredRow.focus();await p.keyboard.press('Enter');
  await eventually(()=>p.locator('[data-edit-id="'+targetId+'"]').isVisible(),'filtered target arrives in real Reader');
  const visibleIds=()=>p.locator('#document-body [data-edit-id]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.editId));
  assert.deepEqual((await visibleIds()).sort(),[normalId,targetId].sort(),'temporary target does not reveal either filtered neighbour');
  assert.equal(await p.locator('[data-edit-id="'+targetId+'"]').textContent(),'请继续');
  assert.deepEqual(await filterState(),filterBefore,'temporary reveal never Keep/protects or rewrites originals/revisions');
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());await p.locator('#scope-search').fill('');
  const group=p.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();await eventually(()=>group.isVisible());if(await group.getAttribute('aria-expanded')!=='true')await group.click();
  const ordinary=p.locator('.archive-navigator-window').filter({hasText:'SYNTHETIC_FILTER_CONTEXT'});await eventually(()=>ordinary.isVisible());await ordinary.click();
  await eventually(async()=>JSON.stringify(await visibleIds())===JSON.stringify([normalId]),'ordinary Reader again hides every filtered Input');
  assert.deepEqual(await filterState(),filterBefore,'ordinary return does not persist temporary visibility');
  assert.equal(await p.locator('#back .archive-back-label').textContent(),'返回项目浏览','tree origin has its own truthful normal-flow label');
  await p.locator('#reader-scope-search').fill('请继续');const readerFilteredHit=p.locator('.document-search-hit[data-input-id="'+targetId+'"]');await eventually(()=>readerFilteredHit.count().then(n=>n===1),'ordinary Reader Find includes eligible filtered Input');
  assert.deepEqual(await visibleIds(),[normalId],'search coverage does not change normal Reader visibility before activation');await readerFilteredHit.click();await eventually(()=>p.locator('[data-edit-id="'+targetId+'"]').isVisible());
  assert.deepEqual((await visibleIds()).sort(),[normalId,targetId].sort(),'Reader Find activation only temporarily reveals its matching Input');assert.deepEqual(await filterState(),filterBefore,'Reader Find and arrival do not Keep/protect or rewrite any source/working/filter state');
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());await ordinary.click();await eventually(async()=>JSON.stringify(await visibleIds())===JSON.stringify([normalId]),'unrelated ordinary reopen discards Reader Find temporary reveal');

  writeFileSync(out+variant+'-filter-context.json',JSON.stringify({targetId,normalId,visibleIds:await visibleIds(),unchanged:true},null,2));
  await filteredSource.close(); // Later navigation reads the verified captured owner, not this completed host.
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  await p.locator('#scope-search').fill('SYNTHETIC_NEEDLE');await eventually(()=>p.locator('.search-input').count().then(n=>n===1));await p.locator('.search-input').press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());
  const sibling=p.locator('.archive-navigator-window').filter({hasText:'SYNTHETIC_FILTER_CONTEXT'});await eventually(()=>sibling.isVisible());await sibling.click();await eventually(async()=>JSON.stringify(await visibleIds())===JSON.stringify([normalId]));
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());assert.equal(await p.locator('#scope-search').inputValue(),'','tree sibling establishes a tree origin rather than inheriting search');assert.equal(await sibling.evaluate(n=>n===document.activeElement),true,'tree origin restores exact Conversation focus');
  await p.locator('#scope-search').fill('SYNTHETIC_NEEDLE');await eventually(()=>p.locator('.search-input').count().then(n=>n===1));
  await sibling.click();await eventually(async()=>JSON.stringify(await visibleIds())===JSON.stringify([normalId]));
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());assert.equal(await p.locator('#scope-search').inputValue(),'SYNTHETIC_NEEDLE','tree activation from visible Search preserves its actual prior query');await eventually(()=>p.locator('.search-input').count().then(n=>n===1));assert.equal(await sibling.evaluate(n=>n===document.activeElement),true);
  const deepText='SYNTHETIC_DEEP_START '+('Long original paragraph. 中文🙂\n'.repeat(700))+' SYNTHETIC_DEEP_MATCH';
  const deepSource=await h.open({id:'iah11-deep',title:'SYNTHETIC_DEEP_DOCUMENT',base:1609459400,messages:Array.from({length:161},(_,i)=>({id:'iah11-deep-'+i,text:i===160?deepText:'SYNTHETIC_DEEP_NORMAL '+i}))});
  await eventually(async()=>(await h.state()).records.length===166,'complete deep synthetic capture');
  await p.locator('#scope-search').fill('SYNTHETIC_DEEP_NORMAL');await eventually(()=>p.locator('.search-input').count().then(n=>n===50));
  const firstPage=await p.locator('.search-input').evaluateAll(rows=>rows.map(n=>n.dataset.inputId));
  await p.locator('.pagination').getByRole('button',{name:'下一部分',exact:true}).click();await eventually(()=>p.locator('.search-input').first().getAttribute('data-input-id').then(id=>id!==firstPage[0]));
  const secondPage=await p.locator('.search-input').evaluateAll(rows=>rows.map(n=>n.dataset.inputId)),selectedOrigin=p.locator('.search-input').nth(3),selectedId=await selectedOrigin.getAttribute('data-input-id');
  await selectedOrigin.focus();const originTop=await selectedOrigin.evaluate(n=>n.getBoundingClientRect().top);await selectedOrigin.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  assert.deepEqual(await p.locator('.search-input').evaluateAll(rows=>rows.map(n=>n.dataset.inputId)),secondPage,'origin restores the exact second result page after canonical reread');
  const returnedOrigin=p.locator('.search-input[data-input-id="'+selectedId+'"]');assert.equal(await returnedOrigin.evaluate(n=>n===document.activeElement),true);assert.ok(Math.abs(await returnedOrigin.evaluate(n=>n.getBoundingClientRect().top)-originTop)<=2,'identity-relative result position is restored');
  const deepRecord=(await h.state()).records.find(r=>r.originalText===deepText);assert.ok(deepRecord);const deepId='block:'+deepRecord.id;
  await p.locator('#scope-search').fill('SYNTHETIC_DEEP_MATCH');const deepRow=p.locator('.search-input[data-input-id="'+deepId+'"]');await eventually(()=>deepRow.count().then(n=>n===1));await deepRow.focus();await p.keyboard.press('Enter');
  await eventually(()=>p.locator('[data-edit-id="'+deepId+'"]').isVisible(),'deep final Input opens outside initial window');
  const deepRange=()=>p.evaluate(id=>{const node=document.querySelector('[data-edit-id="'+id+'"]'),range=[...(CSS.highlights.get('paia-search')||[])].find(r=>node?.contains(r.startContainer)&&r.toString()==='SYNTHETIC_DEEP_MATCH'),rect=range?.getBoundingClientRect();return {text:node?.textContent,range:range?.toString(),visible:!!rect&&rect.height>0&&rect.top>=0&&rect.bottom<=innerHeight};},deepId);
  await eventually(async()=>(await deepRange()).visible,'actual occurrence at end of long Input arrives in viewport');assert.equal((await deepRange()).text,deepText);assert.ok(await p.locator('#document-body [data-edit-id]').count()<=120,'deep arrival stays bounded');writeFileSync(out+variant+'-deep-arrival.json',JSON.stringify(await deepRange()));
  await deepSource.close(); // Stop idle capture polling before independent Archive mutation proofs.
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());await p.locator('#scope-search').fill('SYNTHETIC_NEEDLE');await eventually(()=>p.locator('.search-input[data-input-id="'+inputId+'"]').count().then(n=>n===1));
  const owner=await h.context.newPage();await owner.goto(p.url());
  // Delay only real background-search delivery; keep the original visible row
  // while a second trusted owner writes. Reader/current-body reads are untouched.
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__iahOriginalSend=send;window.__iahHeldSearch=[];chrome.runtime.sendMessage=async(...args)=>{const result=await send(...args);if(args[0]?.type==='SEARCH_INPUTS')await new Promise(resolve=>window.__iahHeldSearch.push(resolve));return result;};});
  const currentText='SYNTHETIC_CURRENT_CHANGED_BODY';
  try{
   const result=await owner.evaluate(async({id,currentText})=>chrome.runtime.sendMessage({type:'UPDATE_LIBRARY',id,changes:{libraryText:currentText}}),{id:inputId,currentText});assert.equal(result.ok,true,JSON.stringify(result));
   const committed=await readInput(),persistedBeforeArrival=await filterState();
   const staleRow=p.locator('.search-input[data-input-id="'+inputId+'"]');assert.match(await staleRow.textContent(),/SYNTHETIC_NEEDLE/);await staleRow.focus();await p.keyboard.press('Enter');
   await eventually(()=>p.locator('[data-edit-id="'+inputId+'"]').textContent().then(t=>t===currentText),'activation loads current working bytes');
   const staleRanges=await p.evaluate(()=>[...(CSS.highlights.get('paia-search')||[])].map(r=>r.toString()));assert.ok(!staleRanges.some(t=>t.includes('SYNTHETIC_NEEDLE')),'old phrase is never replayed');
   const changed=await readInput();assert.ok(changed.revision>before.revision);assert.equal(changed.libraryText,currentText);
   await eventually(async()=>/匹配.*(?:变化|改变|不再)|(?:match|phrase).*(?:changed|no longer)/i.test(await p.locator('#notice').textContent()),'current activation explains the changed body match');
   assert.deepEqual(await readInput(),committed,'arrival does not introduce another Input revision');assert.deepEqual(await filterState(),persistedBeforeArrival,'arrival does not persist a match notice or rewrite filter intent');
   assert.match(await p.locator('#notice').textContent(),/匹配.*(?:变化|改变|不再)|(?:match|phrase).*(?:changed|no longer)/i,'surviving Input whose prior body match vanished explains the changed match');
  }finally{await p.evaluate(()=>{chrome.runtime.sendMessage=window.__iahOriginalSend;for(const resolve of window.__iahHeldSearch)resolve();delete window.__iahOriginalSend;delete window.__iahHeldSearch;});await owner.close();}
  await p.reload();await eventually(()=>p.locator('#document-panel').isVisible());await eventually(()=>p.locator('#scope-search').isEnabled());
  assert.equal(await p.locator('#back .archive-back-label').textContent(),'返回档案','cold origin does not claim exact search return');await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());assert.equal(await p.locator('#document-panel').isVisible(),false);assert.equal(await p.locator('#scope-search').inputValue(),'','lost same-tab origin safely returns to neutral Archive');assert.match(await p.locator('#notice').textContent(),/原搜索状态已不可用|original search state is unavailable/i,'lost recorded origin explains the neutral fallback');
  for(const [action,index]of [['remove',0],['purge',1]]){
   const phrase='SYNTHETIC_DEEP_NORMAL '+index,record=(await h.state()).records.find(row=>row.originalText===phrase),target='block:'+record.id;
   await p.locator('#scope-search').fill(phrase);const stale=p.locator('.search-input[data-input-id="'+target+'"]');await eventually(()=>stale.count().then(n=>n===1));
   const writer=await h.context.newPage();await writer.goto(p.url());
   await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__iahOriginalSend=send;window.__iahHeldSearch=[];chrome.runtime.sendMessage=async(...args)=>{const result=await send(...args);if(args[0]?.type==='SEARCH_INPUTS')await new Promise(resolve=>window.__iahHeldSearch.push(resolve));return result;};});
   try{
    if(action==='purge'){const preflight=await writer.evaluate(id=>chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT',id}),record.id);assert.equal(preflight.ok,true,JSON.stringify(preflight));assert.equal(preflight.data.state,'unambiguous');}
    const response=await writer.evaluate(({action,target,sourceId})=>chrome.runtime.sendMessage(action==='remove'?{type:'EXCLUDE_LIBRARY',id:target,excluded:true}:{type:'PURGE_SOURCE',id:sourceId,confirm:true}),{action,target,sourceId:record.id});assert.equal(response.ok,true,JSON.stringify(response));
    assert.match(await stale.textContent(),/SYNTHETIC_DEEP_NORMAL/);await stale.focus();await p.keyboard.press('Enter');
    await eventually(async()=>/原搜索结果已不可用|original search result is unavailable/i.test(await p.locator('#notice').textContent()),'held '+action+' hit reports unavailable');
    assert.equal(await p.locator('#document-body [data-edit-id]').count(),0,'unavailable '+action+' hit does not substitute neighboring Inputs');
    assert.equal(await p.evaluate(()=>[...(CSS.highlights.get('paia-search')||[])].filter(range=>range.startContainer.isConnected).length),0,'unavailable hit has no current target highlight');
   }finally{await p.evaluate(()=>{chrome.runtime.sendMessage=window.__iahOriginalSend;for(const resolve of window.__iahHeldSearch)resolve();delete window.__iahOriginalSend;delete window.__iahHeldSearch;});await writer.close();}
   await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());assert.equal(await p.locator('.search-input[data-input-id="'+target+'"]').count(),0,'removed/purged hit stays absent after canonical search reread');
  }
  for(const [action,index]of [['edit',150],['changed',151],['remove',152],['purge',153]]){
   const phrase='SYNTHETIC_DEEP_NORMAL '+index,record=(await h.state()).records.find(row=>row.originalText===phrase),target='block:'+record.id;
   await p.locator('#scope-search').fill(phrase);const globalHit=p.locator('.search-input[data-input-id="'+target+'"]');await eventually(()=>globalHit.count().then(n=>n===1));await globalHit.click();await eventually(()=>p.locator('[data-edit-id="'+target+'"]').isVisible());
   await p.locator('#reader-scope-search').fill(phrase);const hit=p.locator('.document-search-hit[data-input-id="'+target+'"]');await eventually(()=>hit.count().then(n=>n===1));
   const writer=await h.context.newPage();await writer.goto(p.url());
   await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__iahOriginalSend=send;window.__iahHeldSearch=[];chrome.runtime.sendMessage=async(...args)=>{const result=await send(...args);if(args[0]?.type==='SEARCH_INPUTS')await new Promise(resolve=>window.__iahHeldSearch.push(resolve));return result;};});
   await p.evaluate(cause=>{window.__iahHoldCause=cause;window.__iahNoticeTrace=[];},action==='remove'?'EXCLUDE_LIBRARY':action==='purge'?'PURGE_SOURCE':'UPDATE_LIBRARY');
   try{
    if(action==='purge'){const preflight=await writer.evaluate(id=>chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT',id}),record.id);assert.equal(preflight.ok,true);assert.equal(preflight.data.state,'unambiguous');}
    const currentText=action==='edit'?phrase+' CURRENT REVISION':'SYNTHETIC_READER_CHANGED_CURRENT';
    const mutation=await writer.evaluate(({action,target,sourceId,currentText})=>chrome.runtime.sendMessage(action==='remove'?{type:'EXCLUDE_LIBRARY',id:target,excluded:true}:action==='purge'?{type:'PURGE_SOURCE',id:sourceId,confirm:true}:{type:'UPDATE_LIBRARY',id:target,changes:{libraryText:currentText}}),{action,target,sourceId:record.id,currentText});assert.equal(mutation.ok,true,JSON.stringify(mutation));
    await eventually(()=>p.evaluate(()=>window.__iahHeldNotices.length>0),'target mutation notification is queued');assert.match(await hit.textContent(),/SYNTHETIC_DEEP_NORMAL/);await hit.click();
    if(action==='remove'||action==='purge'){
     await eventually(async()=>/原搜索结果已不可用|original search result is unavailable/i.test(await p.locator('#notice').textContent()),'held Reader Find '+action+' explains unavailable');assert.equal(await p.locator('#document-body [data-edit-id]').count(),0,'Reader Find never substitutes a neighbor');
    }else{
     await eventually(()=>p.locator('[data-edit-id="'+target+'"]').textContent().then(value=>value===currentText),'Reader Find opens current working revision');
     if(action==='changed')await eventually(async()=>/匹配.*变化|match has changed/i.test(await p.locator('#notice').textContent()),'Reader Find explains vanished body match');
     else await eventually(()=>p.evaluate(({target,phrase})=>[...(CSS.highlights.get('paia-search')||[])].some(range=>document.querySelector('[data-edit-id="'+target+'"]')?.contains(range.startContainer)&&range.toString()===phrase),{target,phrase}),'Reader Find highlights current matching text');
    }
   }finally{await p.evaluate(()=>{chrome.runtime.sendMessage=window.__iahOriginalSend;for(const resolve of window.__iahHeldSearch)resolve();delete window.__iahOriginalSend;delete window.__iahHeldSearch;window.__iahHoldCause=null;const pending=window.__iahHeldNotices.splice(0);for(const deliver of pending)deliver();});const trace=await p.evaluate(()=>window.__iahNoticeTrace);assert.ok(trace.length>0);assert.deepEqual(trace.filter(x=>x.phase==='delivered').map(x=>x.cause),trace.filter(x=>x.phase==='held').map(x=>x.cause),'all delayed callbacks delivered in original order');assert.equal(await p.evaluate(()=>window.__iahHeldNotices.length),0);writeFileSync(out+variant+'-reader-find-'+action+'-delivery.json',JSON.stringify(trace,null,2));await writer.close();}
   await p.locator('#primary-nav [data-view="library"]').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  }
  assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
