import {mkdir} from 'node:fs/promises';
import {chineseInputs} from './harness/original-complete.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const reply=request=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:JSON.parse(request.messages[1].content).inputs.map(input=>({inputRef:input.ref,topic:{proposedName:'虚构原话主题'},section:{proposedName:'思考过程'},type:'idea',spans:[],uncertain:false}))})}}]});
const rpc=async(page,type,fields={})=>{const r=await page.evaluate(args=>chrome.runtime.sendMessage(args),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};

test('native trusted MV3 fetch completes 20 Chinese Inputs in four manual batches and visible Topic Document',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start({deepSeekFixture:reply});
 try{
  const page=h.archive;
  await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
  await h.open({id:'complete-native',title:'虚构验收',base:1609459200,messages:chineseInputs.map((text,i)=>({id:'native-'+i,text}))});
  await eventually(async()=>(await h.state()).records.length===20);
  await page.locator('[data-view=settings]').click();await page.locator('#deepseek-api-key').fill('synthetic-native-key');await page.locator('#deepseek-save').click();
  await eventually(async()=>(await page.locator('#deepseek-status').textContent()).includes('已配置'));
  assert.equal(h.deepSeekRequests.length,0);await rpc(page,'SET_ORGANIZER_CONTROLS',{changes:{batchMode:'compact'}});
  for(let batch=0;batch<4;batch++){
   if(!await page.locator('#original-organizer-status + button').isVisible())await page.locator('#organizer-advanced > summary').click();await page.locator('#original-organizer-status + button').click();
   await eventually(async()=>{const o=await rpc(page,'GET_ORIGINAL_ORGANIZER_STATUS');if(o.state==='failed')assert.fail(JSON.stringify(o.diagnostics));return o.state==='completed'&&o.bootstrap.processed===(batch+1)*5;},'native request completes');
   await eventually(async()=>(await page.locator('#original-organizer-trace').textContent()).includes('阶段：completed'));
   assert.equal(h.deepSeekRequests.length,batch+1);await pause(100);assert.equal(h.deepSeekRequests.length,batch+1);
  }
  const state=await rpc(page,'GET_ORIGINAL_ORGANIZER_STATUS');assert.equal(state.bootstrap.processed,20);assert.equal(state.bootstrap.state,'completed');assert.equal(state.diagnostics.committedItemCount,5);
  await mkdir(new URL('../work/v080-legacy-original-chrome/',import.meta.url),{recursive:true});await page.screenshot({path:new URL('../work/v080-legacy-original-chrome/01-completed-settings.png',import.meta.url).pathname,fullPage:true});
  await page.locator('[data-view=thoughts]').click();await eventually(async()=>await page.locator('.topic-index-row').count()===1);await page.locator('.topic-index-row').click();
  await eventually(async()=>await page.locator('#topic-body .entry-prose').count()===19&& (await page.locator('#topic-body').textContent()).includes(chineseInputs[0]));
  await page.screenshot({path:new URL('../work/v080-legacy-original-chrome/02-topic-document.png',import.meta.url).pathname,fullPage:true});
  await h.restartWorker();assert.equal((await rpc(page,'GET_DEEPSEEK_STATUS')).hasCredential,true);assert.equal((await rpc(page,'GET_ORIGINAL_ORGANIZER_STATUS')).diagnostics.dailyRequestCount,4);
  await page.locator('[data-view=settings]').click();await page.reload();await page.locator('[data-view=settings]').click();await pause(250);
  assert.equal(h.deepSeekRequests.length,4);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('native Chrome failure, retry warning, partial commit, closing Settings and incremental action',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();let calls=0,mode='failure',release;await mkdir(new URL('../work/v080-legacy-original-chrome/',import.meta.url),{recursive:true});
 try{
  await h.context.route('https://api.deepseek.com/**',async route=>{
   calls++;assert.ok(route.request().serviceWorker());assert.equal(route.request().url(),'https://api.deepseek.com/chat/completions');
   if(mode==='failure')return route.fulfill({status:401,contentType:'application/json',body:'{}'});
   const body=JSON.parse(route.request().postData()),output=reply(body),data=JSON.parse(output.choices[0].message.content);
   if(mode==='partial')data.items[4].spans=[{start:0,end:999999}];
   if(mode==='delayed')await new Promise(resolve=>{release=resolve;});
   output.choices[0].message.content=JSON.stringify(data);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(output)});
  });
  let page=h.archive;await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
  const chat=await h.open({id:'complete-partial',title:'虚构部分成功',base:1609459200,messages:chineseInputs.slice(0,5).map((text,i)=>({id:'partial-'+i,text}))});
  await eventually(async()=>(await h.state()).records.length===5);await page.locator('[data-view=settings]').click();await page.locator('#deepseek-api-key').fill('synthetic-native-key');await page.locator('#deepseek-save').click();
  await eventually(async()=>(await page.locator('#deepseek-status').textContent()).includes('已配置'));assert.equal(await page.locator('#deepseek-api-key').inputValue(),'');assert.equal(calls,0);
  if(!await page.locator('#original-organizer-status + button').isVisible())await page.locator('#organizer-advanced > summary').click();await page.locator('#original-organizer-status + button').click();await eventually(async()=>(await page.locator('#original-organizer-trace').textContent()).includes('INVALID_CREDENTIAL'));
  assert.equal(calls,1);assert.match(await page.locator('#original-organizer-cost-note').textContent(),/重试将再次调用 DeepSeek API/);assert.equal(await page.locator('#original-organizer-cost-note').isVisible(),true);
  await page.screenshot({path:new URL('../work/v080-legacy-original-chrome/03-provider-failure.png',import.meta.url).pathname,fullPage:true});
  mode='partial';if(!await page.locator('#original-organizer-status + button').isVisible())await page.locator('#organizer-advanced > summary').click();await page.locator('#original-organizer-status + button').click();
  await eventually(async()=>{const o=await rpc(page,'GET_ORIGINAL_ORGANIZER_STATUS');return o.state==='completed'&&o.bootstrap.processed===5;});
  await eventually(async()=>(await page.locator('#original-organizer-trace').textContent()).includes('已提交：4 / 5'));
  assert.equal(calls,2);assert.equal((await rpc(page,'GET_ORIGINAL_ORGANIZER_STATUS')).diagnostics.manualInputCount,1);
  await page.screenshot({path:new URL('../work/v080-legacy-original-chrome/04-partial-commit.png',import.meta.url).pathname,fullPage:true});
  await h.send(chat,{id:'partial-next',text:'虚构新增：完成首次整理后只处理这一条新增原话。'});await eventually(async()=>(await h.state()).records.length===6);
  await page.locator('[data-view=settings]').click();await eventually(async()=>await page.locator('#original-organizer-status + button').isEnabled());assert.equal(calls,2);
  mode='delayed';if(!await page.locator('#original-organizer-status + button').isVisible())await page.locator('#organizer-advanced > summary').click();await page.locator('#original-organizer-status + button').click();await eventually(()=>!!release);assert.equal(calls,3);await page.close();release();
  page=await h.context.newPage();h.archive=page;await page.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);await page.locator('[data-view=settings]').click();
  await eventually(async()=>{const o=await rpc(page,'GET_ORIGINAL_ORGANIZER_STATUS');return o.state==='completed'&&o.pendingInput===0;});assert.equal(calls,3);
  await page.locator('#deepseek-clear').click();await eventually(async()=>(await page.locator('#deepseek-status').textContent())==='未配置');assert.equal(calls,3);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('native request interrupted by MV3 worker replacement is outcome_unknown and never automatically resent',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();let calls=0,release;
 try{
  await h.context.route('https://api.deepseek.com/**',async route=>{calls++;const body=JSON.parse(route.request().postData());await new Promise(resolve=>{release=resolve;});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(reply(body))}).catch(()=>{});});
  const page=h.archive;await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await h.open({id:'complete-interrupt',title:'虚构中断验收',base:1609459200,messages:[{id:'interrupt-1',text:'虚构用户原话：中断后应保留待处理状态。'}]});await eventually(async()=>(await h.state()).records.length===1);
  await page.locator('[data-view=settings]').click();await page.locator('#deepseek-api-key').fill('synthetic-native-key');await page.locator('#deepseek-save').click();await eventually(async()=>(await page.locator('#deepseek-status').textContent()).includes('已配置'));
  if(!await page.locator('#original-organizer-status + button').isVisible())await page.locator('#organizer-advanced > summary').click();await page.locator('#original-organizer-status + button').click();await eventually(()=>calls===1);await h.restartWorker();release();
  const state=await rpc(page,'GET_ORIGINAL_ORGANIZER_STATUS');assert.equal(state.lastError,'OUTCOME_UNKNOWN');assert.equal(state.bootstrap.processed,0);assert.equal(state.diagnostics.providerRequestState,'outcome_unknown');assert.equal((await rpc(page,'GET_DEEPSEEK_STATUS')).hasCredential,true);
  await page.reload();await page.locator('[data-view=settings]').click();assert.equal(await page.locator('#original-organizer-trace').isVisible(),false);await page.locator('#organizer-advanced > summary').click();await eventually(async()=>(await page.locator('#original-organizer-trace').textContent()).includes('OUTCOME_UNKNOWN'));await pause(300);assert.equal(calls,1);assert.equal((await rpc(page,'LIBRARY_INDEX_PAGE')).items.length,0);
 }finally{release?.();await h.close();}
});
