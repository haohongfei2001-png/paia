import {openRetainedSearchComponent} from './harness/retained-search-component.mjs';
import {settleContextCapture,assertContextUnavailable,contextSafetySnapshot,observeContextEffects,assertNoContextEffects,assertNoContextSession} from './current-context-scope-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

import {openArchiveWindow,waitArchiveWindow} from './harness/archive-navigator.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}

test('Round 4.9 current release: Archive capture, Reader, retained Search and Revisit preserve data while Context remains unavailable',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive,text='ROUND49_CORE_LOOP 我想把 PAIA 变成一个会让我主动回来阅读、找回并继续使用自己表达的地方。';
  await consent(p);
  await h.open({id:'round49-loop',title:'Round 4.9 Core Loop',base:1609459200,messages:[{id:'round49-one',text}]});
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText===text),'core-loop Input is captured');

  await eventually(async()=>await p.locator('#archive-reader-navigator-slot').isVisible(),'Archive starts with its narrow directory');
  assert.equal(await p.locator('#document-title').textContent(),'');assert.equal(await p.locator('#document-body').textContent(),'');
  assert.equal(await p.locator('#primary-nav [data-view="memory"]').count(),1,'approved local Context has one ordinary launcher');
  assert.equal(await p.locator('.sidebar-bottom [data-view="memory"]').count(),0,'For AI must not have a duplicate secondary navigation entry');
  assert.equal(await p.locator('#archive-root-recent,#archive-root-continue').count(),0,'root shortcuts remain retired');

  // Capture -> read: the Archive home should return to the canonical Reader,
  // not a duplicate dashboard document view.
  // Retain real worker results but delay onboarding UI reads to exercise the stale-root refresh race.
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async message=>{const result=await send(message);if(message.type==='GET_ONBOARDING')await new Promise(resolve=>setTimeout(resolve,120));return result;};});
  await openArchiveWindow(p,{text:'Round 4.9 Core Loop'});
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('ROUND49_CORE_LOOP'),'recently captured opens canonical Input Reader');
  const sourceInput=p.locator('.library-block').filter({hasText:'ROUND49_CORE_LOOP'}).locator('.library-prose');
  assert.equal(await p.locator('.core-loop-reuse').count(),0,'Reader no longer adds a persistent per-Input material button');

  // Reader retains its normal menu, with the withdrawn material action absent.
  // Legacy Context events cannot create a selection or grant access.
  let memoryStatus=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}});assert.equal(memoryStatus.config.includeUnorganizedInputs,false);
  await settleContextCapture(h);const before=await contextSafetySnapshot(p);await observeContextEffects(p);
  await sourceInput.click({button:'right'});assert.equal(await p.locator('#context-menu').isVisible(),true);
  assert.equal(await p.locator('#context-menu button').filter({hasText:'加入本次材料'}).count(),0);
  await p.keyboard.press('Escape');await assertContextUnavailable(p);
  await assertNoContextSession(p);assert.equal(await p.locator('#document-panel').isVisible(),true,'unavailable reuse leaves the real Reader open');
  assert.deepEqual(await contextSafetySnapshot(p),before);
  memoryStatus=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}});assert.equal(memoryStatus.config.includeUnorganizedInputs,false,'unavailable reuse grants no future automatic retrieval');
  await assertNoContextEffects(p,h);

  // Return to the Archive home and prove that page-scoped retrieval and Revisit remain
  // first-class tasks; the retained cross-surface coordinator has no material selection.
  await p.locator('#primary-nav [data-view="library"]').click();
  await eventually(async()=>await p.locator('#archive-reader-navigator-slot').isVisible(),'return to blank Archive');
  const windowButton=await waitArchiveWindow(p,{text:'Round 4.9 Core Loop'});
  const directoryState=()=>p.locator('.archive-navigator-group-toggle').evaluateAll(nodes=>nodes.map(node=>({key:node.dataset.ansNavKey,expanded:node.getAttribute('aria-expanded')})));
  const beforeDirectory={id:await windowButton.getAttribute('data-document-id'),text:await windowButton.textContent(),groups:await directoryState()};
  const worker=h.context.serviceWorkers()[0];await worker.evaluate(()=>{void chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'CAPTURE'}).catch(()=>{});});await pause(250);
  await eventually(()=>windowButton.isVisible(),'refreshed directory remains reachable');
  assert.deepEqual({id:await windowButton.getAttribute('data-document-id'),text:await windowButton.textContent(),groups:await directoryState()},beforeDirectory,'same Archive data retains directory contents and expansion across navigator refresh');
  assert.equal(await p.locator('#document-title').textContent(),'');assert.equal(await p.locator('#document-body').textContent(),'');assert.equal(await p.locator('.archive-navigator-window[aria-current]').count(),0);
  assert.equal(await p.locator('#universal-search-open').isVisible(),false,'normal Archive home exposes no global Search launcher');
  assert.equal(await p.locator('#archive-select-materials').count(),0,'Archive root duplicate selection launcher stays removed');
  await assertContextUnavailable(p);
  await openRetainedSearchComponent(p,{types:['input','thought','ai']});
  assert.match((await p.locator('#universal-search-title').textContent()).trim(),/找回以前的表达|Find an earlier expression/i);
  const box=p.getByRole('searchbox',{name:'全局搜索'});await box.fill('ROUND49_CORE_LOOP');
  await eventually(async()=>await p.locator('#universal-search-dialog .universal-hit').count()>0,'Find returns the captured Input');
  await assertNoContextSession(p);assert.equal(await p.locator('#universal-search-dialog .universal-context,.universal-selection,.universal-hit input[type=checkbox]').count(),0,'retained search has no material selection controls');
  await p.locator('.universal-close').click();
  await p.locator('#primary-nav [data-view="library"]').click();await eventually(()=>p.locator('#archive-reader-navigator-slot').isVisible(),'return from retained search to Archive');

  await p.evaluate(()=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'revisit'}})));
  await eventually(async()=>await p.locator('#revisit-panel').isVisible(),'home Return opens existing Revisit service');
  assert.match(await p.locator('.revisit-intro').textContent(),/不表示|does not mark/i);
  await p.locator('.revisit-close').click();

  const popup=await h.context.newPage();await popup.goto(`chrome-extension://${h.extensionId}/ui/popup.html`);
  await eventually(async()=>(await popup.locator('#open-archive').textContent()).trim()==='打开 PAIA','popup primary action opens PAIA');
  assert.equal(await popup.getByText('产品验证 / Passport',{exact:true}).isVisible(),false,'internal validation is not a primary popup action');
  await popup.close();
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
