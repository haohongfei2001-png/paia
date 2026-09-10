import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';

const root=new URL('../',import.meta.url).pathname;

test('isolated Chrome exits running when DeepSeek response headers arrive but the body stalls',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-original-timeout-'));let h;
 try{
  await cp(root,dir,{recursive:true,filter:path=>!/(\/\.git(?:\/|$)|\/work(?:\/|$)|\/outputs(?:\/|$))/.test(path)});
  const workerPath=join(dir,'background/service-worker.js');
  await writeFile(workerPath,(await readFile(workerPath,'utf8'))+`\nlet originalTimeoutCalls=0;deepSeekProvider.timeoutMs=1000;deepSeekProvider.fetchImpl=async()=>{originalTimeoutCalls++;return {status:200,ok:true,headers:{get:()=>null},text:async()=>await new Promise(()=>{})};};globalThis.originalTimeoutSynthetic={store,get calls(){return originalTimeoutCalls;}};\n`);
  h=await FakeChatGPT.start({extensionPath:dir});const page=h.archive;
  await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await h.open(conversation('original-timeout-visible'));await eventually(async()=>(await h.state()).records.length===3);
  await page.locator('[data-view=settings]').click();await page.locator('#deepseek-api-key').fill('synthetic-browser-key');await page.locator('#deepseek-save').click();await eventually(async()=>await page.locator('#deepseek-status').textContent().then(x=>x.includes('已配置')));await page.locator('#organizer-advanced > summary').click();await eventually(async()=>await page.locator('#original-organizer-status').textContent().then(x=>x.includes('3 条待整理')));
  const button=page.locator('#original-organizer-status + button');if(!await button.isVisible())await page.locator('#organizer-advanced > summary').click();await button.click();const worker=h.context.serviceWorkers().find(x=>x.url().includes(h.extensionId));await eventually(async()=>await worker.evaluate(()=>globalThis.originalTimeoutSynthetic.calls===1));await eventually(async()=>await page.locator('#original-organizer-trace').textContent().then(x=>x.includes('本次 API 请求：1')));for(let i=0;i<4;i++){await page.locator('[data-view=settings]').click();await page.evaluate(()=>chrome.runtime.sendMessage({type:'GET_ORIGINAL_ORGANIZER_STATUS'}));}assert.equal(await worker.evaluate(()=>globalThis.originalTimeoutSynthetic.calls),1);await eventually(async()=>await page.locator('#original-organizer-trace').textContent().then(x=>x.includes('PROVIDER_TIMEOUT')),'UI must show a concrete timeout');assert.equal(await button.isEnabled(),true);assert.equal(await button.textContent(),'重试');assert.equal(await page.locator('#original-organizer-cost-note').isVisible(),true);assert.match(await page.locator('#original-organizer-trace').textContent(),/阶段：body_reading[\s\S]*HTTP：200[\s\S]*错误：PROVIDER_TIMEOUT/);
  const safe=await worker.evaluate(async()=>{const s=globalThis.originalTimeoutSynthetic.store,status=await s.originalOrganizerStatus(),entries=await s.entryPage();return {processed:status.bootstrap.processed,state:status.state,lastError:status.lastError,entryCount:entries.items.length,calls:globalThis.originalTimeoutSynthetic.calls,phase:status.diagnostics.stage,httpStatus:status.diagnostics.httpStatus};});assert.deepEqual(safe,{processed:0,state:'failed',lastError:'PROVIDER_TIMEOUT',entryCount:0,calls:1,phase:'body_reading',httpStatus:200});assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
