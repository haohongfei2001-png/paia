import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';

for(const mode of ['throws','pending'])test('Settings exits running when its trusted message handler '+mode,{timeout:60000},async()=>{
 const root=new URL('../',import.meta.url).pathname,dir=await mkdtemp(join(tmpdir(),'paia-message-complete-'));let h;
 try{
  await cp(root,dir,{recursive:true,filter:path=>!/(\/.git(?:\/|$)|\/work(?:\/|$)|\/outputs(?:\/|$))/.test(path)});
  const worker=join(dir,'background/service-worker.js'),ui=join(dir,'ui/archive.js');
  await writeFile(worker,(await readFile(worker,'utf8'))+`\nconst syntheticHandle=handle;handle=async(request,sender)=>{if(request?.type==='UPDATE_ORIGINAL_LIBRARY_VIEW'){${mode==='throws'?"throw new Error('SYNTHETIC_PRIVATE_ERROR_DO_NOT_DISPLAY');":"return new Promise(()=>{});"}}return syntheticHandle(request,sender);};\n`);
  // Same watchdog logic; compressed clock only in this disposable test build.
  await writeFile(ui,(await readFile(ui,'utf8')).replace(',35000)',',200)'));
  h=await FakeChatGPT.start({extensionPath:dir});const page=h.archive;
  await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await h.open(conversation('message-'+mode));await eventually(async()=>(await h.state()).records.length===3);await page.locator('[data-view=settings]').click();
  const button=page.locator('#original-organizer-status + button');if(!await button.isVisible())await page.locator('#organizer-advanced > summary').click();await button.click();const expected=mode==='throws'?'INTERNAL_RUNTIME_ERROR':'MESSAGE_RESPONSE_TIMEOUT';
  await eventually(async()=>(await page.locator('#original-organizer-trace').textContent()).includes(expected));assert.equal(await button.textContent(),'重试');assert.equal(await button.isEnabled(),true);assert.equal(await page.locator('#original-organizer-cost-note').isVisible(),true);
  const text=await page.locator('#original-organizer-trace').textContent();assert.match(text,new RegExp(expected));assert.match(text,new RegExp('阶段：'+(mode==='throws'?'message_handler':'message_response')));assert.doesNotMatch(await page.locator('body').textContent(),/SYNTHETIC_PRIVATE_ERROR|状态暂不可用/);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
