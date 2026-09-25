import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {inputDigest} from '../scripts/compatibility-gate.mjs';
import {FakeChatGPT,eventually,pause,conversation} from './harness/fake-chatgpt.mjs';
async function openCapturedReader(page){
 await page.bringToFront();
 await eventually(()=>page.locator('#archive-navigator').isVisible(),'Archive Navigator is visible');
 const group=page.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();
 await eventually(()=>group.isVisible(),'captured conversation group is visible');
 if(await group.getAttribute('aria-expanded')!=='true')await group.click();
 const window=page.locator('.archive-navigator-window').first();
 await eventually(()=>window.isVisible(),'captured conversation is visible');
 await window.click();
 await eventually(()=>page.locator('.library-prose').first().isVisible(),'Reader opens');
}


test('Smart Filter isolated Chrome: capture, Light reading, full search/context, keep, Off and no document controls',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({headless:false});try{
  const p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const c=conversation('smart-filter-chrome');c.messages=[{id:'synthetic-smart-001',text:'继续'},{id:'synthetic-smart-002',text:'继续，但不要修改原始数据'},{id:'synthetic-smart-003',text:'好的，就选第二个'},{id:'synthetic-smart-004',text:'请继续'},{id:'synthetic-smart-005',text:'这个呢'}];
  const chat=await h.open(c,{arrival:'empty'});await chat.evaluate(c=>{window.fake.render(c);for(const root of document.querySelectorAll('#messages > div')){const article=document.createElement('article');article.dataset.testid='conversation-turn-'+root.dataset.messageId;root.before(article);article.append(root);if(root.dataset.messageId==='synthetic-smart-005'){const image=document.createElement('span');image.dataset.testid='attachment-image';image.textContent='SYNTHETIC_ATTACHMENT_CONTENT_NOT_CAPTURED';article.append(image);}}},c);
  await eventually(async()=>(await h.state()).records.length===5);
  await eventually(async()=>(await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length===2);
  const baseline=(await h.state()).records;assert.ok(baseline.every(r=>!r.originalText.includes('SYNTHETIC_ATTACHMENT')));
  await p.locator('[data-view="library"]').click();await openCapturedReader(p);await eventually(async()=>await p.locator('.library-prose:visible').count()===3);await p.locator('#document-filter-toggle').click();await eventually(async()=>await p.locator('.library-prose:visible').count()===5);assert.equal(await p.locator('.filtered-input-note').count(),2);assert.deepEqual((await h.state()).records,baseline);await p.locator('#document-filter-toggle').click();await eventually(async()=>await p.locator('.library-prose:visible').count()===3);assert.equal(await p.locator('#document-panel').getByText('智能过滤内容',{exact:true}).count(),0);assert.equal(await p.locator('#filter-onboarding:visible').count(),0);
  await p.locator('#back').click();await p.locator('[data-view="library"]').click();await p.locator('#search').fill('请继续');await eventually(async()=>await p.locator('#empty-list').isVisible(),'ordinary archive search hides Smart Filter content');await p.locator('#search-include-filtered').check();await p.locator('.search-input').waitFor();assert.equal(await p.locator('.filter-search-label').textContent(),'智能过滤内容');await mkdir('work',{recursive:true});await p.screenshot({path:'work/smart-filter-search-synthetic.png',fullPage:true});await p.locator('.search-input').click();await eventually(async()=>(await p.locator('.library-prose').allTextContents()).includes('请继续'));await p.locator('#document-search').fill('请继续');await eventually(async()=>await p.locator('#document-search-status').textContent().then(value=>value.includes('没有匹配输入')),'conversation search also hides filtered content by default');await p.locator('#document-search-include-filtered').check();await eventually(async()=>await p.locator('.document-search-hit').count()===1,'explicit conversation scope finds filtered Input');
  assert.equal((await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length,2);
  await p.locator('#back').click();await p.locator('#search').fill('');await p.locator('[data-view="settings"]').click();await p.locator('[name="smart-filter-mode"][value="light"]').waitFor();await eventually(async()=>await p.locator('[name="smart-filter-mode"][value="light"]').isChecked(),'Settings must render the persisted Light mode');assert.equal(await p.locator('[name="smart-filter-mode"][value="light"]').isChecked(),true);await p.locator('#filter-recent-open').click();await p.locator('.filter-recent-row').first().waitFor();await p.screenshot({path:'work/smart-filter-recent-synthetic.png',fullPage:true});await p.locator('.filter-recent-row').first().getByRole('button',{name:'恢复到 Input Archive'}).click();await eventually(async()=>(await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length===1);await p.locator('#filter-recent-close').click();await p.locator('[name="smart-filter-mode"][value="off"]').check();await p.locator('[data-view="library"]').click();await openCapturedReader(p);await eventually(async()=>await p.locator('.library-prose:visible').count()===5);
  await p.locator('[data-view="settings"]').click();await p.locator('[name="smart-filter-mode"][value="light"]').check();await p.locator('[data-view="library"]').click();await openCapturedReader(p);await eventually(async()=>await p.locator('.library-prose:visible').count()===4);
  const fields=p.locator('.library-prose');await fields.first().fill('Synthetic protected edit');await eventually(async()=>(await h.state()).library.blocks.some(b=>b.libraryText==='Synthetic protected edit'));await fields.first().press(process.platform==='darwin'?'Meta+z':'Control+z');await eventually(async()=>!(await h.state()).library.blocks.some(b=>b.libraryText==='Synthetic protected edit'));
  await p.locator('.library-block .reader-more').first().click();await p.getByRole('menuitem',{name:'从档案移除'}).click();await eventually(async()=>(await h.state()).library.blocks.some(b=>b.excluded));await p.locator('#notice').getByRole('button',{name:'撤销',exact:true}).click();await eventually(async()=>(await h.state()).library.blocks.every(b=>!b.excluded));assert.deepEqual((await h.state()).records,baseline);
  await mkdir('work',{recursive:true});await p.screenshot({path:'work/smart-filter-reading-synthetic.png',fullPage:true});await p.locator('[data-view="settings"]').click();await p.screenshot({path:'work/smart-filter-settings-synthetic.png',fullPage:true});
  await h.restartWorker();assert.equal((await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length,1);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);await writeFile('work/smart-filter-ui-evidence.json',JSON.stringify({productVersion:await p.evaluate(()=>chrome.runtime.getManifest().version),scope:'isolated-synthetic',runtimeDigest:await inputDigest({runtimeOnly:true}),defaultLight:true,readingFilter:true,fullSearch:true,contextDoesNotKeep:true,restoreProtects:true,lightOff:true,editUndo:true,removalUndo:true,workerRestart:true,explicitReaderShowAll:true,noDocumentFilterModeControls:true,sourceTimesUnchanged:true,networkRequests:0},null,2)+'\n');
 }finally{await h.close();}
});

test('VS-04 Reader keeps a filtered Input without changing Source',{timeout:75000},async()=>{
 const h=await FakeChatGPT.start({headless:false});
 try{
  const p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const c=conversation('vs04-filter-keep');c.messages=[{id:'vs04-keep-001',text:'继续'},{id:'vs04-keep-002',text:'继续，但不要修改原始数据'},{id:'vs04-keep-003',text:'好的，就选第二个'},{id:'vs04-keep-004',text:'请继续'},{id:'vs04-keep-005',text:'这个呢'}];
  const chat=await h.open(c,{arrival:'empty'});await chat.evaluate(c=>{window.fake.render(c);for(const root of document.querySelectorAll('#messages > div')){const article=document.createElement('article');article.dataset.testid='conversation-turn-'+root.dataset.messageId;root.before(article);article.append(root);}},c);
  await eventually(async()=>(await h.state()).records.length===5);
  await eventually(async()=>(await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length===2);
  const original=(await h.state()).records;
  await p.locator('[data-view="library"]').click();await openCapturedReader(p);
  await eventually(async()=>await p.locator('.library-prose:visible').count()===3);
  await p.locator('#document-filter-toggle').click();
  await eventually(async()=>await p.locator('.library-prose:visible').count()===5);
  assert.equal(await p.locator('.filtered-input-note').count(),2);
  await p.locator('.filtered-input-note button').first().click();
  await eventually(async()=>(await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length===1);
  await eventually(async()=>await p.locator('.filtered-input-note').count()===1);
  await p.locator('#document-filter-toggle').click();
  await eventually(async()=>await p.locator('.library-prose:visible').count()===4);
  assert.deepEqual((await h.state()).records,original);
  assert.equal(h.extensionNetworkRequests,0);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('presence evidence is bounded, body-free, attachment/reference-aware and unknown without complete scope',{timeout:60000},async()=>{
 const h=await FakeChatGPT.start();try{const p=await h.open(conversation('presence-synthetic'),{arrival:'empty'});
  const result=await p.evaluate(async source=>{
   // Synthetic page only: exercise packaged isolated-world helper with no private content.
   const script=document.createElement('script');script.textContent=source;document.head.append(script);
   const cases=[];for(const extra of ['', '<span data-testid="attachment-file">PRIVATE_SYNTHETIC_FILENAME</span>','<a href="https://example.invalid">PRIVATE_SYNTHETIC_URL</a>','<div data-message-author-role="assistant">NEVER_READ</div>','<div>'.repeat(260)+'</div>'.repeat(260),'<span>UNCLASSIFIED_SYNTHETIC_CONTENT</span>']){
    const article=document.createElement('article');article.dataset.testid='conversation-turn-presence';article.innerHTML='<div data-message-author-role="user"><div class="whitespace-pre-wrap">继续</div></div>'+extra;document.body.append(article);article.querySelectorAll=()=>{throw Error('SYNTHETIC_UNBOUNDED_ENUMERATION');};const root=article.firstElementChild;cases.push(globalThis.PAIAInputPresence.collect(root,root.firstElementChild));article.remove();
   }return cases;
  },await (await import('node:fs/promises')).readFile('adapter/input-presence.js','utf8'));
  assert.deepEqual(result[0],{version:1,attachment:'absent',reference:'absent',confidence:'verified'});assert.equal(result[1].attachment,'present');assert.equal(result[2].reference,'present');assert.equal(result[3].confidence,'unknown');assert.equal(result[4].confidence,'unknown');assert.equal(result[5].confidence,'unknown');assert.ok(!JSON.stringify(result).includes('PRIVATE'));
 }finally{await h.close();}
});

test('first input event protects even when immediate Undo leaves no changed text to autosave',{timeout:60000},async()=>{
 const h=await FakeChatGPT.start();try{const p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();const c=conversation('instant-undo-synthetic');c.messages=[{id:'instant-undo-source',text:'继续'}];const chat=await h.open(c,{arrival:'empty'});await chat.evaluate(c=>{window.fake.render(c);const root=document.querySelector('#messages > div'),article=document.createElement('article');article.dataset.testid='conversation-turn-0';root.before(article);article.append(root);},c);await eventually(async()=>(await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length===1);
  const before=await h.state();await p.locator('[data-view="settings"]').click();await p.locator('[name="smart-filter-mode"][value="off"]').check();await p.locator('[data-view="library"]').click();await openCapturedReader(p);const field=p.locator('.library-prose');await field.fill('Synthetic brief edit');await field.press(process.platform==='darwin'?'Meta+z':'Control+z');await eventually(async()=>await field.textContent()==='继续');await eventually(async()=>(await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length===0);await p.locator('[data-view="settings"]').click();await p.locator('[name="smart-filter-mode"][value="light"]').check();await p.locator('[data-view="library"]').click();await openCapturedReader(p);await field.waitFor();assert.equal(await field.textContent(),'继续');assert.deepEqual((await h.state()).records,before.records);assert.equal((await h.state()).library.blocks[0].libraryText,null);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('VS-04 universal search requires explicit inclusion of Smart Filter content',{timeout:60000},async()=>{
 const h=await FakeChatGPT.start({headless:false});
 try{
  const p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const c=conversation('vs04-filter-search');c.messages=[{id:'vs04-filtered',text:'继续'},{id:'vs04-visible',text:'这个想法值得长期记录'}];
  await h.open(c);await eventually(async()=>(await h.state()).records.length===2);
  await eventually(async()=>(await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}))).data.items.length===1);
  const original=(await h.state()).records;
  await p.evaluate(()=>document.dispatchEvent(new CustomEvent('paia:search-open')));
  const root=p.locator('#universal-search-dialog');
  await root.locator('input[type="search"]').fill('继续');
  await eventually(async()=>await root.locator('.universal-status').textContent().then(value=>value.includes('没有匹配内容')),'ordinary search excludes filtered Input');
  assert.equal(await root.locator('.universal-hit').count(),0);
  await root.locator('.universal-filters summary').click();
  await root.getByLabel('包含智能过滤内容').check();
  await eventually(async()=>await root.locator('.universal-hit').count()===1,'explicit filtered search returns saved Input');
  assert.equal(await root.locator('.filter-search-label').textContent(),'智能过滤内容');
  assert.deepEqual((await h.state()).records,original);
  assert.equal(h.extensionNetworkRequests,0);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('VS-04 archive search narrows by observed Source date without changing saved Inputs',{timeout:75000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  await h.open({id:'vs04-date-early',title:'Earlier',base:1609459200,messages:[{id:'vs04-date-early-input',text:'DATE_SCOPE earlier synthetic content with full context'}]});
  await h.open({id:'vs04-date-late',title:'Later',base:1609632000,messages:[{id:'vs04-date-late-input',text:'DATE_SCOPE later synthetic content with full context'}]});
  await eventually(async()=>(await h.state()).records.length===2);
  const before=(await h.state()).records;
  const dates=before.map(row=>row.sourceSentAt?.slice(0,10)).sort();
  assert.equal(new Set(dates).size,2);
  await p.locator('[data-view="library"]').click();await p.locator('#search').fill('DATE_SCOPE');
  await eventually(async()=>await p.locator('.search-input').count()===2,'both dates appear before scoping');
  await p.locator('#archive-search-date-scope summary').click();
  await p.locator('#search-date-start').fill(dates[1]);await p.locator('#search-date-end').fill(dates[1]);
  await eventually(async()=>await p.locator('.search-input').count()===1,'date scope finds the later Source');
  assert.match(await p.locator('.search-input').first().textContent(),/later synthetic/);
  assert.deepEqual((await h.state()).records,before);
  assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
