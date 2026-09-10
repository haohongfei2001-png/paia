import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {conversation,branched} from './fixtures/history-v090.mjs';import {zip} from './fixtures/import-zip.mjs';
const send=(h,type,extra={})=>h.archive.evaluate(async({type,extra})=>{const r=await chrome.runtime.sendMessage({type,...extra});if(!r.ok)throw Error(r.error);return r.data;},{type,extra});
async function pick(h,blob,name='synthetic-export.zip'){
 await h.archive.locator('#history-file-consent').check();const chosen=h.archive.waitForEvent('filechooser');await h.archive.locator('#history-choose').click();
 await(await chosen).setFiles({name,mimeType:name.endsWith('.zip')?'application/zip':'application/json',buffer:Buffer.from(await blob.arrayBuffer())});
 await eventually(()=>h.archive.locator('#history-commit').isEnabled(),'history preflight ready',30000);
}
test('visible fresh onboarding, ZIP shards, preview, import, review, restart and Settings are local only',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({headless:false,onboarding:true});try{
  await mkdir('work/history-v090',{recursive:true});await h.archive.locator('#onboarding-start').waitFor();
  assert.match(await h.archive.locator('#onboarding-welcome').textContent(),/保存、整理并重新阅读/);
  assert.equal((await send(h,'GET_STATUS')).consented,false);
  await h.archive.screenshot({path:'work/history-v090/onboarding.png'});
  await h.archive.locator('#onboarding-start').click();await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();
  await h.archive.locator('#onboarding-history').waitFor();await h.archive.locator('#onboarding-history').click();
  const file=zip([{name:'folder/conversations-1.json',text:JSON.stringify([branched()])},{name:'renamed-chat-file.json',text:JSON.stringify({conversations:[conversation(2,5)]})},{name:'account.json',text:'NEVER_DECODE_ACCOUNT'}]);
  await pick(h,file);assert.equal((await h.state()).records.length,0);
  assert.match(await h.archive.locator('#history-format').textContent(),/ZIP.*MB.*2 个窗口.*8 条用户文字/);await h.archive.screenshot({path:'work/history-v090/preview.png'});
  await h.archive.locator('#history-commit').click();await eventually(async()=>await h.archive.locator('#history-success').isVisible(),'history completed',30000);
  const state=await h.state();assert.equal(state.records.length,8);assert.equal(state.library.blocks.filter(x=>x.branchStatus).length,1);
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);
  await h.archive.screenshot({path:'work/history-v090/completed.png'});await h.archive.locator('#history-review').click();
  await h.archive.locator('.conversation-document').first().click();await h.archive.locator('.excluded-prose').first().click({button:'right'});
  await h.archive.locator('#context-menu button').filter({hasText:'恢复到 Input Archive'}).click();
  await h.archive.locator('[data-view="library"]').click();await h.archive.locator('.conversation-document').first().click();await h.archive.locator('.library-prose').first().waitFor();assert.ok(await h.archive.locator('.library-prose').count()>0);
  await h.archive.locator('[data-view="settings"]').click();await eventually(async()=>(await h.archive.locator('#history-latest').textContent()).includes('新增 8'));
  await h.archive.screenshot({path:'work/history-v090/settings.png'});await h.restartWorker();await h.archive.reload();
  await h.archive.locator('#sync-history').waitFor();assert.equal(await h.archive.locator('#onboarding-welcome').isVisible(),false);assert.equal((await send(h,'GET_ONBOARDING')).historyState,'partial');
  await h.archive.locator('#sync-history').click();await pick(h,file);await h.archive.locator('#history-commit').click();await eventually(()=>h.archive.locator('#history-success').isVisible(),'repeat complete',30000);
  assert.equal((await h.state()).records.length,8);await h.archive.locator('#history-thoughts').click();
  assert.equal((await send(h,'GET_ORIGINAL_ORGANIZER_STATUS')).pendingInput,8);
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  await writeFile('work/history-v090/browser.json',JSON.stringify({synthetic:true,visibleChrome:true,profile:'chatgpt-mapping-v1',realExportVerified:false,sourceCount:8,duplicateImport:true,branchUserConfirmation:true,workerRestart:true,automaticProviderRequests:h.extensionNetworkRequests,externalRequests:h.externalRequests,errors:h.errors},null,2));
 }finally{await h.close();}
});
test('fresh skip is remembered; unknown file cannot expose private strings or commit',{timeout:60000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});try{
  await h.archive.locator('#onboarding-start').click();await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('#onboarding-skip').click();await h.archive.reload();await h.archive.locator('#sync-history').waitFor();
  assert.equal(await h.archive.locator('#onboarding-history-step').isVisible(),false);assert.equal((await send(h,'GET_ONBOARDING')).historyState,'skipped');
  await h.archive.locator('#sync-history').click();await h.archive.locator('#history-file-consent').check();await h.archive.locator('#history-file').setInputFiles({name:'synthetic-private-filename.json',mimeType:'application/json',buffer:Buffer.from('{"title":"SYNTHETIC_PRIVATE_TITLE","body":"SYNTHETIC_PRIVATE_BODY"}')});
  await eventually(async()=>(await h.archive.locator('#history-status').textContent()).includes('无法可靠识别'));assert.equal(await h.archive.locator('#history-commit').isDisabled(),true);
  assert.equal((await h.state()).records.length,0);assert.deepEqual((await send(h,'IMPORT_TASKS')).tasks,[]);assert.ok(!(await h.archive.locator('#history-dialog').textContent()).includes('SYNTHETIC_PRIVATE'));assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
