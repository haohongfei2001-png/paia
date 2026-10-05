import {verifyD5NativeEdit} from './harness/d5-native-edit.mjs';
import {compareD5ReadingSurfaces} from './harness/d5-reading-surfaces.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';

const releaseRoot=mkdtempSync(join(tmpdir(),'paia-dvn-direct-edit-release-'));
test.after(()=>rmSync(releaseRoot,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',releaseRoot],{encoding:'utf8'}));
const rpc=async(page,type,fields={})=>{
 const reply=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(reply?.ok,true,JSON.stringify(reply));return reply.data;
};
async function fixture(variant,count=2){
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:releaseRoot}:{}),p=h.archive;
 try{
  await p.setViewportSize({width:390,height:844});
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const title='SYNTHETIC direct-edit Conversation',messages=[
   {id:'dvn-direct-message-000',text:'SYNTHETIC 原始表达 👩‍💻 é 保留不确定性。\n第二行保持完整。'},
   {id:'dvn-direct-message-001',text:'SYNTHETIC 第二条输入保持独立，不能跨输入修改。'},
   ...Array.from({length:count-2},(_,i)=>({id:'dvn-direct-message-'+(i+2),text:'SYNTHETIC paged Input '+(i+2)+' 独立完整的来源和工作内容。'}))
  ];
  await h.open({id:'dvn-direct',title,base:1609459200,messages});
  await eventually(async()=>(await h.state()).records.length===messages.length,'both real Source records captured');
  const documentId=(await h.state()).library.blocks[0].documentId;
  await eventually(async()=>{
   const result=await rpc(p,'PAIA_ARCHIVE_NAV_STATUS',{page:{selectedDocumentId:documentId}});
   return result.selectedPath?.available&&result.selectedPath.groupKind==='unassigned';
  },'verified ordinary Conversation membership settles before opening Navigator');
  await rpc(p,'SET_ENABLED',{enabled:false});await p.bringToFront();await openArchiveWindow(p,{text:title});
  await eventually(()=>p.locator('.library-prose').count().then(n=>n===Math.min(count,40)));
  await eventually(()=>p.locator('#scope-search').isEnabled(),'Reader route is admitted');
  const field=p.locator('.library-prose').first(),id=await field.getAttribute('data-edit-id');
  return {h,p,field,id,documentId};
 }catch(error){await h.close();throw error;}
}
async function assertEditable(p){
 assert.equal(await p.locator('.reader-mobile-edit,#reader-title-edit').count(),0,'legacy Edit/Done controls are absent, not hidden');
 assert.deepEqual(await p.locator('#document-title,.library-prose').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('contenteditable'))),['plaintext-only','plaintext-only','plaintext-only']);
}
async function settleReaderPresentation(p,width=p.viewportSize().width){
 await eventually(()=>p.evaluate(width=>{
  const get=id=>document.getElementById(id),compact=width<768,desktop=width>=1024;
  return innerWidth===width&&get('archive-compact-navigation').hidden===!compact&&get('archive-navigator').parentElement.id==='archive-reader-navigator-slot'&&get('scope-search-host').parentElement.id===(desktop?'archive-reader-search-slot':'reader-search-slot')&&get('back').parentElement.id==='archive-reader-back-slot'&&get('archive-navigator-toggle').parentElement.id===(compact?'archive-compact-reader-actions':desktop?'reader-compact-tools':'archive-reader-back-slot')&&get('document-menu').parentElement.id===(compact?'archive-compact-reader-actions':'reader-heading-actions');
 },width),'existing Reader controls reach their D7 responsive slots');
}
async function openDocumentMenu(p){
 await settleReaderPresentation(p);
 const compact=p.locator('#archive-compact-navigation');
 if(await compact.isVisible()&&!await compact.evaluate(node=>node.open))await compact.locator('summary').click();
 assert.equal(await p.locator('#document-menu').isVisible(),true,'document action is exposed through the current native disclosure');
 await p.locator('#document-menu').click();
}
function offline(h){assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);}
async function evidence(p,variant,name){
 mkdirSync('work/qa-dvn-direct-edit',{recursive:true});
 await p.screenshot({path:`work/qa-dvn-direct-edit/${variant}-${name}.png`,fullPage:false});
}
for(const variant of ['source','release']){
 test(`D1 direct editing at every width retains native selection, unfinished IME and acknowledged body/title across Back and reload (${variant})`,{timeout:90000},async()=>{
  const {h,p,field,id,documentId}=await fixture(variant);
  try{
   const before=await h.state(),inputBefore=await rpc(p,'GET_INPUT',{id});await assertEditable(p);
   await field.evaluate(el=>{
    globalThis.__directNodes=[document.getElementById('document-title'),...document.querySelectorAll('.library-prose')];
    el.focus();const start=el.firstChild.textContent.indexOf('👩‍💻'),end=start+'👩‍💻 é'.length;
    getSelection().setBaseAndExtent(el.firstChild,start,el.firstChild,end);
    globalThis.__directRange={node:el.firstChild,start,end,text:getSelection().toString()};
   });
   const measurements=[];
   for(const width of [1440,1280,1024,768,390,320]){
    await p.setViewportSize({width,height:844});await settleReaderPresentation(p,width);await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    await assertEditable(p);
    assert.equal(await p.evaluate(()=>__directNodes.every(node=>node.isConnected)&&document.activeElement===__directNodes[1]),true,'resize keeps the same active editor nodes');
    // Compare against the captured DOM range, not a re-derived normalized string.
    assert.equal(await p.evaluate(()=>{const s=getSelection();return s.anchorNode===__directRange.node&&s.focusNode===__directRange.node&&s.anchorOffset===__directRange.start&&s.focusOffset===__directRange.end&&s.toString()===__directRange.text;}),true,'complete emoji and combining selection survives resize');
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow<=2,`${width}px Reader overflow ${overflow}`);
    const geometry=await p.evaluate(()=>({rail:document.querySelector('.sidebar').getBoundingClientRect().width,nav:document.querySelector('#archive-reader-navigator-slot').getBoundingClientRect().width,display:getComputedStyle(document.querySelector('#document-panel')).display,rootSlot:document.querySelectorAll('#archive-root-navigator-slot > #archive-navigator').length,readerSlot:document.querySelectorAll('#archive-reader-navigator-slot > #archive-navigator').length,navigators:document.querySelectorAll('#archive-navigator').length}));
    assert.equal(geometry.rootSlot,0);assert.equal(geometry.readerSlot,1,'one contextual navigator in its explicit Reader slot');assert.equal(geometry.navigators,1,'responsive search/back slots never duplicate the navigator');
    // D6.2 RESPONSIVE defines the whole navigation column, including its border.
    if(width>=1024){assert.equal(Math.round(geometry.rail),width>=1280?184:160);assert.equal(Math.round(geometry.nav),width>=1440?312:width>=1280?280:240);assert.equal(geometry.display,'block');}
    else if(width>=768){assert.equal(Math.round(geometry.rail),64);assert.equal(geometry.display,'block');}
    await eventually(()=>p.locator('.reader-selection').isVisible(),'native selection exposes its adjacent toolbar');
    const toolbar=await p.locator('.reader-selection').boundingBox();
    assert.ok(toolbar.x>=15&&toolbar.x+toolbar.width<=width-15,'toolbar stays inside horizontal viewport at '+width);
    assert.ok(toolbar.y>=15&&toolbar.y+toolbar.height<=844-15,'toolbar stays inside vertical viewport at '+width);
    const selected=await p.evaluate(()=>{const r=getSelection().getRangeAt(0).getBoundingClientRect();return {top:r.top,bottom:r.bottom}});
    assert.ok(toolbar.y>=selected.bottom+7||toolbar.y+toolbar.height<=selected.top-7,'toolbar does not cover the selected text at '+width);
    await evidence(p,variant,`selection-${width}`);measurements.push({width,overflow,geometry});
   }
   await field.evaluate(el=>{getSelection().collapseToEnd();el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.textContent='SYNTHETIC 未完成拼音 ni';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText',data:'ni'}));});
   for(const width of [768,1440,320]){await p.setViewportSize({width,height:844});await assertEditable(p);assert.equal(await field.textContent(),'SYNTHETIC 未完成拼音 ni');}
   await pause(900);assert.equal((await rpc(p,'GET_INPUT',{id})).revision,inputBefore.revision,'unfinished composition has no partial persisted revision');
   await p.locator('#back').click();assert.equal(await p.locator('#document-panel').isVisible(),true,'Back cannot discard unfinished composition');
   assert.equal(await p.evaluate(()=>document.querySelector('.library-prose')===__directNodes[1]),true);
   assert.equal((await rpc(p,'GET_INPUT',{id})).revision,inputBefore.revision);
   const finalText='SYNTHETIC 完整中文 👩‍💻 é 保持换行。\n结束组合后才保存。';
   await field.evaluate((el,text)=>{el.textContent=text;el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:text}));el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));},finalText);
   await eventually(async()=>(await rpc(p,'GET_INPUT',{id})).libraryText===finalText,'complete composition receives the real worker commit');
   await p.locator('#document-title').fill('SYNTHETIC human working title');await field.focus();
   await eventually(async()=>(await h.state()).conversations.find(doc=>doc.id===documentId)?.userTitle==='SYNTHETIC human working title','direct title editing also waits for durable acknowledgement');
   await p.locator('#back').click();await eventually(()=>p.locator('#collection-panel').isVisible());
   await openArchiveWindow(p,{text:'SYNTHETIC human working title'});await eventually(()=>p.locator('.library-prose').first().isVisible());await assertEditable(p);
   assert.equal(await p.locator(`[data-edit-id="${id}"]`).textContent(),finalText);await p.reload();
   await eventually(()=>p.locator(`[data-edit-id="${id}"]`).isVisible());await assertEditable(p);
   assert.equal(await p.locator(`[data-edit-id="${id}"]`).textContent(),finalText);
   assert.equal(await p.locator('#document-title').textContent(),'SYNTHETIC human working title');
   assert.deepEqual((await h.state()).records,before.records,'body/title edits never rewrite immutable Source');offline(h);
   writeFileSync(`work/qa-dvn-direct-edit/${variant}-matrix.json`,JSON.stringify({status:'PASS',evidence:'SYNTHETIC_BROWSER',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,measurements,noExternalRequests:true},null,2));
  }finally{await h.close();}
 });
 test(`D1 selection keyboard handoff preserves exact Unicode and refuses a stale selected body (${variant})`,{timeout:90000},async()=>{
  const {h,p,field,id}=await fixture(variant);
  try{
   await field.evaluate(el=>{el.focus();const text=el.firstChild,start=text.textContent.indexOf('👩‍💻'),end=start+'👩‍💻 é'.length;getSelection().setBaseAndExtent(text,start,text,end);});
   await eventually(()=>p.locator('.reader-selection').isVisible());await p.keyboard.press('Alt+s');
   assert.equal(await p.locator('.reader-selection button').first().evaluate(el=>el===document.activeElement),true,'keyboard reaches actions without requiring pointer selection');
   await p.evaluate(()=>{globalThis.__dvnCopied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__dvnCopied=text;}}});});
   await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>__dvnCopied),'👩‍💻 é','keyboard copy uses exact original Unicode range');
   await p.keyboard.press('Escape');await eventually(async()=>!await p.locator('.reader-selection').isVisible(),'Escape dismisses only the visual toolbar');
   assert.equal(await p.evaluate(()=>getSelection().toString()),'👩‍💻 é','Escape preserves the native selected range');
   assert.equal(await field.evaluate(el=>document.activeElement===el),true,'Escape restores the original contenteditable focus without scrolling');
   await p.keyboard.press('Alt+s');await eventually(()=>p.locator('.reader-selection').isVisible(),'explicit keyboard action reopens the dismissed selection');
   // Hold focus in the toolbar while a new Input body arrives. The preserved
   // snapshot must be refused, rather than silently selecting shifted offsets.
   await field.evaluate(el=>{el.textContent='SYNTHETIC changed before selected action';});
   await p.locator('.reader-selection button[data-single-input]').first().click();
   await eventually(async()=>/重新选择/.test(await p.locator('#notice').textContent()),'stale selection gets explicit feedback');
   assert.equal(await p.locator('dialog[open]').count(),0,'no Topic chooser receives an incorrectly shifted substring');
   assert.equal((await rpc(p,'GET_INPUT',{id})).libraryText,null,'refused selection itself does not persist the changed DOM');
   offline(h);
  }finally{await h.close();}
 });
 test(`D1 narrow failed direct edit retains full buffer, cross-Input copy/boundary and retry without an Edit mode (${variant})`,{timeout:90000},async()=>{
  const {h,p,field,id}=await fixture(variant);
  try{
   const before=await h.state(),worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
   await worker.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='blocks'&&value?.value?.libraryText?.includes('SYNTHETIC_DIRECT_FAILED')){IDBObjectStore.prototype.put=put;throw new DOMException('Synthetic direct-edit storage failure','QuotaExceededError');}return put.call(this,value,...args);};});
   const draft='SYNTHETIC_DIRECT_FAILED 完整草稿 👩‍💻 é\n'+('未保存段落完整保留。\n'.repeat(60))+'SYNTHETIC 完整尾标记 END 👩‍💻 é';await field.fill(draft);
   await eventually(()=>p.locator('#retry').isVisible(),'actual failed transaction exposes Retry');
   await p.setViewportSize({width:320,height:844});await assertEditable(p);assert.equal(await field.innerText(),draft);
   assert.equal((await rpc(p,'GET_INPUT',{id})).libraryText,before.library.blocks.find(b=>b.id===id).libraryText);
   await p.locator('#back').click();assert.equal(await p.locator('#document-panel').isVisible(),true);assert.equal(await field.innerText(),draft);
   await p.evaluate(()=>{globalThis.__directCopied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__directCopied=text;}}});});
   await p.locator('#reader-copy-buffer').click();assert.equal(await p.evaluate(()=>__directCopied),[draft,await p.locator('.library-prose').nth(1).innerText()].join('\n\n'),'recovery Copy retains every character including the long tail');
   await p.evaluate(()=>{const fields=[...document.querySelectorAll('.library-prose')],range=document.createRange();range.setStart(fields[0].firstChild,0);range.setEnd(fields[1].firstChild,12);getSelection().removeAllRanges();getSelection().addRange(range);globalThis.__directCrossText=getSelection().toString();globalThis.__directCrossAllowed=fields[0].dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'deleteByCut'}));});
   assert.equal(await p.evaluate(()=>__directCrossAllowed),false,'cross-Input mutation remains refused');await eventually(()=>p.locator('.reader-selection').isVisible());
   await p.locator('.reader-selection button').first().click();assert.equal(await p.evaluate(()=>__directCopied===__directCrossText),true,'cross-Input Copy is precisely the selected native text');
   assert.equal(await field.innerText(),draft);await evidence(p,variant,'failed-direct-edit');
   await p.locator('#retry').click();await eventually(async()=>(await rpc(p,'GET_INPUT',{id})).libraryText===draft);await assertEditable(p);
   assert.deepEqual((await h.state()).records,before.records);offline(h);
  }finally{await h.close();}
 });
 test(`D1 responsive presentation cannot reopen the editor-owned pending whole-Conversation removal lock (${variant})`,{timeout:90000},async()=>{
  const {h,p}=await fixture(variant,101);
  try{
   const before=await h.state(),mountedIds=await p.locator('.library-prose').evaluateAll(nodes=>nodes.map(el=>el.dataset.editId));assert.equal(mountedIds.length,40);
   await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__directRemovalWrites=0;globalThis.__directPageReads=0;chrome.runtime.sendMessage=async message=>{
    if(message.type==='GET_PAGE'&&message.page?.documentId&&message.page?.cursor){__directPageReads++;const reply=await send(message);await new Promise(resolve=>globalThis.__releaseDirectPage=resolve);return reply;}
    if(message.type==='EDIT_DOCUMENT'&&message.edit?.removeScope){__directRemovalWrites++;await new Promise(resolve=>globalThis.__releaseDirectRemoval=resolve);}return send(message);
   };window.scrollTo(0,document.documentElement.scrollHeight);window.dispatchEvent(new Event('scroll'));});
   await eventually(()=>p.evaluate(()=>typeof __releaseDirectPage==='function'),'real next-page response is in flight before removal acquires the lock');
   await openDocumentMenu(p);await p.getByRole('menuitem',{name:/移出整段对话|Remove entire conversation/}).click();
   await p.locator('dialog[data-removal-target][open]').getByRole('button',{name:/确认移出整段对话|Confirm entire conversation removal/}).click();
   await eventually(()=>p.evaluate(()=>typeof __releaseDirectRemoval==='function'),'actual removal request is in flight');
   await p.evaluate(async()=>{__releaseDirectPage();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   assert.deepEqual(await p.locator('.library-prose').evaluateAll(nodes=>nodes.map(el=>el.dataset.editId)),mountedIds,'a response started before the lock cannot append editable rows');
   for(const width of [1440,768,320,1280]){
    await p.setViewportSize({width,height:844});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    assert.deepEqual(await p.locator('#document-title,.library-prose').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('contenteditable'))),Array(mountedIds.length+1).fill('false'),'resize must not bypass the existing transaction lock');
    assert.equal(await p.locator('#document-page').getAttribute('aria-busy'),'true');
    await p.evaluate(()=>{window.scrollTo(0,document.documentElement.scrollHeight);window.dispatchEvent(new Event('scroll'));});
    assert.equal(await p.evaluate(()=>__directPageReads),1,'held removal refuses new page requests');
    assert.deepEqual(await p.locator('.library-prose').evaluateAll(nodes=>nodes.map(el=>el.dataset.editId)),mountedIds);
   }
   assert.deepEqual((await h.state()).library.blocks,before.library.blocks,'held request has not changed Working Inputs');await evidence(p,variant,'pending-removal');
   await p.evaluate(()=>__releaseDirectRemoval());await eventually(()=>p.locator('#collection-panel').isVisible(),'whole removal completes through its actual owner');
   assert.equal(await p.evaluate(()=>__directRemovalWrites),1);assert.equal((await h.state()).library.blocks.every(b=>b.excluded),true);assert.deepEqual((await h.state()).records,before.records);offline(h);
  }finally{await h.close();}
 });
}

for(const variant of ['source','release'])test(`D5 actual Selection, Original and History match canonical transient geometry without changing evidence (${variant})`,{timeout:120000},()=>compareD5ReadingSurfaces({variant,extensionPath:variant==='release'?releaseRoot:null}));

for(const variant of ['source','release'])for(const segment of ['bulk','reload','selection','sentinel','range'])test(`D5 native ${segment} multiline fill, Enter, Shift+Enter, selection, undo and reload keep exact Working text (${variant})`,{timeout:120000},async()=>{const context=await fixture(variant);try{await verifyD5NativeEdit({...context,variant,segment});}finally{await context.h.close();}});
