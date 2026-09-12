import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}

test('Round 4.9 current release: Archive home closes capture -> read -> retrieve -> reuse',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive,text='ROUND49_CORE_LOOP 我想把 PAIA 变成一个会让我主动回来阅读、找回并继续使用自己表达的地方。';
  await consent(p);
  await h.open({id:'round49-loop',title:'Round 4.9 Core Loop',base:1609459200,messages:[{id:'round49-one',text}]});
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText===text),'core-loop Input is captured');

  await eventually(async()=>await p.locator('#core-loop-home').isVisible(),'Archive core-loop home is visible');
  assert.equal(await p.locator('#primary-nav [data-view="memory"]').count(),0,'AI Context is no longer primary navigation');
  assert.equal(await p.locator('.sidebar-bottom [data-view="memory"]').count(),1,'AI reuse remains available as a secondary action');
  assert.equal((await p.locator('.sidebar-bottom [data-view="memory"]').textContent()).trim(),'用于 AI');
  const recent=p.locator('#core-loop-continue');
  await eventually(async()=>!(await recent.isDisabled())&&(await recent.textContent()).includes('Round 4.9 Core Loop'),'recent document becomes the continue-reading target');

  // Capture -> read: the Archive home should return to the canonical Reader,
  // not a duplicate dashboard document view.
  await recent.click();
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('ROUND49_CORE_LOOP'),'continue-reading opens canonical Input Reader');
  const reuse=p.locator('.library-block').filter({hasText:'ROUND49_CORE_LOOP'}).locator('.core-loop-reuse');
  await eventually(async()=>await reuse.count()===1,'Reader exposes one bounded reuse action for the Input');

  // Read -> reuse: leaving Reader still goes through the existing save lifecycle,
  // then opens the local Context builder with a bounded query. Nothing is sent.
  await reuse.click();
  await eventually(async()=>await p.locator('#memory-builder').isVisible(),'Reader reuse reaches the existing local Context builder');
  const prepared=await p.locator('#memory-query').inputValue();
  assert.match(prepared,/重点参考我以前的这段表达/);assert.match(prepared,/ROUND49_CORE_LOOP/);assert.match(prepared,/继续围绕这段表达/);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);

  // Return to the Archive home and prove that retrieve/revisit are first-class
  // tasks there rather than hidden implementation pages.
  await p.locator('#primary-nav [data-view="library"]').click();
  await eventually(async()=>await p.locator('#core-loop-home').isVisible(),'return to Archive home');
  await p.locator('#core-loop-find').click();
  await eventually(async()=>await p.locator('#universal-search-dialog').evaluate(el=>el.open),'home Find opens Universal Search');
  assert.equal((await p.locator('#universal-search-title').textContent()).trim(),'找回以前的表达');
  const box=p.getByRole('searchbox',{name:'全局搜索'});await box.fill('ROUND49_CORE_LOOP');
  await eventually(async()=>await p.locator('#universal-search-dialog .universal-hit').count()>0,'Find returns the captured Input');
  assert.equal((await p.locator('#universal-search-dialog .universal-context').first().textContent()).trim(),'继续使用');
  await p.locator('.universal-close').click();

  await p.locator('#core-loop-return').click();
  await eventually(async()=>await p.locator('#revisit-dialog').evaluate(el=>el.open),'home Return opens existing Revisit service');
  assert.match(await p.locator('.revisit-intro').textContent(),/第一次打开回访/);
  await p.locator('.revisit-close').click();

  const popup=await h.context.newPage();await popup.goto(`chrome-extension://${h.extensionId}/ui/popup.html`);
  await eventually(async()=>(await popup.locator('#open-archive').textContent()).includes('回到 PAIA'),'popup primary action returns to PAIA');
  assert.equal(await popup.getByText('产品验证 / Passport',{exact:true}).isVisible(),false,'internal validation is not a primary popup action');
  await popup.close();
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
