import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT, eventually} from './harness/fake-chatgpt.mjs';

test('CPV1-01.4 storage pressure gives one safe next action without hiding the local archive',
  {timeout:180000},async()=>{
    let h;
    try {
      h=await FakeChatGPT.start({headless:true});
      const page=await h.context.newPage();
      await page.setViewportSize({width:320,height:640});
      await page.goto(`chrome-extension://${h.extensionId}/ui/popup.html`);
      await page.locator('#check-update').waitFor();
      await page.evaluate(()=>{
        const send=chrome.runtime.sendMessage.bind(chrome.runtime);
        chrome.runtime.sendMessage=async message=>{
          const response=await send(message);
          if(message?.type!=='GET_PAGE'||!response?.ok)return response;
          return {...response,data:{...response.data,diagnostics:{...response.data.diagnostics,
            status:'STORAGE_FULL',lastError:{code:'STORAGE_FULL',at:new Date().toISOString()}}}};
        };
      });
      await page.evaluate(()=>chrome.storage.local.set({'paia-test-recovery-pulse':Date.now()}));
      await eventually(async()=>await page.locator('#recovery-card').isVisible());
      assert.match(await page.locator('#recovery-title').textContent(),/本机空间不足/);
      assert.match(await page.locator('#recovery-detail').textContent(),/先打开 PAIA 导出备份/);
      assert.equal(await page.locator('#recovery-action').textContent(),'打开 PAIA 备份');
      assert.equal(await page.locator('#open-archive').isEnabled(),true);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=2,`320px popup recovery has no horizontal overflow: ${overflow}`);
      assert.deepEqual(h.errors,[]);
    } finally { await h?.close(); }
  });

test('CPV1-01.4 archive read failure retains a bounded retry and hides raw error detail',
  {timeout:180000},async()=>{
    let h;
    try {
      h=await FakeChatGPT.start({headless:true});
      const page=await h.context.newPage();
      await page.goto(`chrome-extension://${h.extensionId}/ui/popup.html`);
      await page.locator('#check-update').waitFor();
      await page.evaluate(()=>{
        const send=chrome.runtime.sendMessage.bind(chrome.runtime);
        let fail=true;
        chrome.runtime.sendMessage=async message=>{
          if(message?.type==='GET_PAGE'&&fail){
            fail=false;
            return {ok:false,error:'SYNTHETIC_PRIVATE_DETAIL'};
          }
          return send(message);
        };
      });
      await page.evaluate(()=>chrome.storage.local.set({'paia-test-recovery-pulse':Date.now()}));
      await eventually(async()=>await page.locator('#recovery-card').isVisible());
      assert.match(await page.locator('#recovery-title').textContent(),/无法读取本机档案状态/);
      assert.equal(await page.locator('#recovery-action').textContent(),'重试读取');
      assert.doesNotMatch(await page.locator('body').textContent(),/SYNTHETIC_PRIVATE_DETAIL/);
      await page.locator('#recovery-action').click();
      await eventually(async()=>!(await page.locator('#recovery-card').isVisible()));
      assert.equal(await page.locator('#open-archive').isEnabled(),true);
      assert.deepEqual(h.errors,[]);
    } finally { await h?.close(); }
  });
