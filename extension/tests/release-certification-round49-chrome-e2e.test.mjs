import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}

test('Round 4.9 current release: Archive home closes capture -> read -> retrieve -> reuse',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive,text='ROUND49_CORE_LOOP 我想把 PAIA 变成一个会让我主动回来阅读、找回并继续使用自己表达的地方。';
  await consent(p);
  await h.open({id:'round49-loop',title:'Round 4.9 Core Loop',base:1609459200,messages:[{id:'round49-one',text}]});
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText===text),'core-loop Input is captured');

  await eventually(async()=>await p.locator('#archive-root-main').isVisible(),'Archive core-loop home is visible');
  assert.equal(await p.locator('#primary-nav [data-view="memory"]').count(),1,'For AI remains a primary root under DELTA-01');
  assert.match((await p.locator('#primary-nav [data-view="memory"]').textContent()).trim(),/用于 AI|For AI/i);
  assert.equal(await p.locator('.sidebar-bottom [data-view="memory"]').count(),0,'For AI must not have a duplicate secondary navigation entry');
  const recent=p.locator('#archive-root-recent');
  await eventually(async()=>!(await recent.isDisabled())&&(await recent.textContent()).includes('Round 4.9 Core Loop'),'recently captured document becomes the Archive home target');
  assert.match(await recent.textContent(),/最近收录|Recently saved/i);

  // Capture -> read: the Archive home should return to the canonical Reader,
  // not a duplicate dashboard document view.
  // Retain real worker results but delay onboarding UI reads to exercise the stale-root refresh race.
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async message=>{const result=await send(message);if(message.type==='GET_ONBOARDING')await new Promise(resolve=>setTimeout(resolve,120));return result;};});
  await recent.click();
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('ROUND49_CORE_LOOP'),'recently captured opens canonical Input Reader');
  const sourceInput=p.locator('.library-block').filter({hasText:'ROUND49_CORE_LOOP'}).locator('.library-prose');
  assert.equal(await p.locator('.core-loop-reuse').count(),0,'Reader no longer adds a persistent per-Input material button');

  // The retained Input more menu still supports explicit one-off reuse without
  // silently opting unorganized Inputs into future AI Context retrieval.
  let memoryStatus=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}});assert.equal(memoryStatus.config.includeUnorganizedInputs,false);
  await sourceInput.click({button:'right'});await p.locator('#context-menu button').filter({hasText:'加入本次材料'}).click();await eventually(()=>p.locator('#material-preview').isVisible(),'Input more menu adds the exact saved Input to the tray');
  await p.locator('#material-preview').click();await eventually(()=>p.locator('#material-output-text').isVisible(),'Reader selection reaches trusted manual Preview');
  assert.match(await p.locator('#material-output-text').textContent(),/ROUND49_CORE_LOOP/);
  memoryStatus=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}});assert.equal(memoryStatus.config.includeUnorganizedInputs,false,'explicit manual selection grants no future automatic retrieval');
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);

  // Return to the Archive home and prove that page-scoped retrieval and Revisit remain
  // first-class tasks; the retained cross-surface coordinator is only an internal material-selection task.
  await p.locator('#primary-nav [data-view="library"]').click();
  await eventually(async()=>await p.locator('#archive-root-main').isVisible(),'return to Archive home');
  await p.locator('.conversation-document').first().evaluate(el=>{globalThis.__round49StableDocument=el;});const worker=h.context.serviceWorkers()[0];await worker.evaluate(()=>{void chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'CAPTURE'}).catch(()=>{});});await pause(250);assert.equal(await p.locator('.conversation-document').first().evaluate(el=>el===globalThis.__round49StableDocument),true,'same Archive data keeps the same document action node');
  assert.equal(await p.locator('#universal-search-open').isVisible(),false,'normal Archive home exposes no global Search launcher');
  assert.equal(await p.locator('#archive-select-materials').count(),0,'Archive root duplicate selection launcher stays removed');
  await p.locator('#primary-nav [data-view="memory"]').click();await eventually(()=>p.locator('#material-workbench').isVisible(),'For AI material surface opens');
  const backToMaterials=p.getByRole('button',{name:/返回材料|Back to materials/});if(await backToMaterials.isVisible().catch(()=>false))await backToMaterials.click();
  await p.getByRole('button',{name:/从档案选择|Choose from Archive/}).click();
  await eventually(async()=>await p.locator('#universal-search-dialog').isVisible(),'retained material tray opens the internal Search coordinator');
  assert.match((await p.locator('#universal-search-title').textContent()).trim(),/找回以前的表达|Find an earlier expression/i);
  const box=p.getByRole('searchbox',{name:'全局搜索'});await box.fill('ROUND49_CORE_LOOP');
  await eventually(async()=>await p.locator('#universal-search-dialog .universal-hit').count()>0,'Find returns the captured Input');
  assert.match((await p.locator('#universal-search-dialog .universal-context').first().textContent()).trim(),/已在本次材料中|Already selected/i);
  await p.locator('.universal-close').click();
  await p.locator('#primary-nav [data-view="library"]').click();await eventually(()=>p.locator('#archive-root-main').isVisible(),'return from material selection to Archive');

  await p.locator('#revisit-open').click();
  await eventually(async()=>await p.locator('#revisit-panel').isVisible(),'home Return opens existing Revisit service');
  assert.match(await p.locator('.revisit-intro').textContent(),/不表示|does not mark/i);
  await p.locator('.revisit-close').click();

  const popup=await h.context.newPage();await popup.goto(`chrome-extension://${h.extensionId}/ui/popup.html`);
  await eventually(async()=>(await popup.locator('#open-archive').textContent()).includes('回到 PAIA'),'popup primary action returns to PAIA');
  assert.equal(await popup.getByText('产品验证 / Passport',{exact:true}).isVisible(),false,'internal validation is not a primary popup action');
  await popup.close();
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
