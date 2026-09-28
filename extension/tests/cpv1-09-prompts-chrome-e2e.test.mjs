import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';

const rpc=(page,type,fields={})=>page.evaluate(async ({type,fields})=>{
 const result=await chrome.runtime.sendMessage({type,...fields});
 if(!result.ok)throw new Error(result.error);return result.data;
},{type,fields});
async function enable(page){await page.locator('#consent-check').check();await page.locator('#enable-consent').click();}
async function open(page){await page.locator('#prompt-open').click();await eventually(async()=>!await page.locator('#prompt-refresh').isDisabled(),'Prompt readonly page finishes');}
async function selectPrompt(page,selector='.prompt-choose'){
 await page.locator(selector).click();
 // A DOM click does not await the asynchronous worker READ/TRACE command.
 // Wait for its controls to settle, then retain the exact full-body assertions.
 await eventually(async()=>await page.locator('.prompt-editor').isVisible()&&!await page.locator('#prompt-body').isDisabled(),'selected complete Prompt command finishes');
}
async function copied(page){return page.evaluate(()=>globalThis.promptCopies);}
async function clipboardOracle(page){
 await page.evaluate(()=>{globalThis.promptCopies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
  writeText:async text=>{globalThis.promptCopies.push(text);},readText:()=>{throw new Error('clipboard read forbidden');}
 }});});
}

test('CPV1-09 Prompts full human candidate, fixed template, edit, trace and manual copy survive restart',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);const c=conversation('cpv1-prompt-panel');
  const body='完整人工表达 🧑🏽‍💻 é\n<svg onload="globalThis.promptInjected=true">\n'+
   '保留代码、空白与换行 '.repeat(500)+'\n最后否定：不要发送，也不要上传。';
  c.messages=c.messages.slice(0,1);c.messages[0].text=body;
  await h.open(c);await eventually(async()=>(await h.state()).library.blocks.length===1);
  const sources=(await h.state()).records;await clipboardOracle(p);await open(p);
  await p.locator('#prompt-candidates').click();
  await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  // Maintenance may honestly invalidate a readonly snapshot. Only explicit UI
  // refresh is allowed here; no source mutation/provider replay or weaker oracle.
  for(let i=0;i<4&&await p.locator('.prompt-choose').count()===0;i++){
   await p.locator('#prompt-refresh').click();await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  }
  assert.equal(await p.locator('.prompt-choose').count(),1);
  assert.equal(await p.locator('.prompt-preview').textContent(),body);
  assert.equal(await p.locator('.prompt-preview svg').count(),0);
  assert.equal(await p.evaluate(()=>globalThis.promptInjected),undefined);
  await selectPrompt(p);
  assert.equal(await p.locator('#prompt-body').inputValue(),body);
  assert.equal(await p.locator('#prompt-body').getAttribute('readonly'),'');
  assert.deepEqual(await copied(p),[]);
  await p.locator('#prompt-save').click();await eventually(()=>p.locator('#prompt-status').textContent().then(t=>t==='模板已保存。Input 原文保留。'));
  let templates=await rpc(p,'PAIA_PROMPT_PAGE');assert.equal(templates.total,1);
  const candidateId=templates.items[0].id;
  assert.equal(templates.items[0].text,body);assert.equal(templates.items[0].sourceRefs.length,1);
  await p.locator('#prompt-copy').click();await eventually(async()=>(await copied(p)).length===1);
  assert.deepEqual(await copied(p),[body]);
  assert.equal(await p.locator('.prompt-source-open').count(),1);
  await p.locator('.prompt-source-open').click();
  await eventually(()=>p.locator('#prompt-dialog').isVisible().then(v=>!v));
  await eventually(()=>p.locator('.library-prose').first().isVisible());
  assert.equal(await p.locator('.library-prose').first().textContent(),body);
  await open(p);await selectPrompt(p);
  const edited=body+'\n模板中的人工补充，仅由我保存。';
  await p.locator('#prompt-body').fill(edited);await p.locator('#prompt-pinned').uncheck();
  await p.locator('#prompt-copy').click();
  assert.equal(await p.locator('#prompt-status').textContent(),'请先保存当前编辑，再复制完整正文。');
  assert.deepEqual(await copied(p),[body]);
  await p.locator('#prompt-save').click();await eventually(async()=>(await rpc(p,'PAIA_PROMPT_READ',{id:candidateId,expectedRevision:2})).text===edited);
  assert.equal((await rpc(p,'PAIA_PROMPT_READ',{id:candidateId,expectedRevision:2})).pinned,false);
  assert.deepEqual((await h.state()).records,sources);
  await p.locator('#prompt-new').click();await p.locator('#prompt-body').fill('继续');
  await p.locator('#prompt-save').click();await eventually(async()=>(await rpc(p,'PAIA_PROMPT_PAGE')).total===2);
  const fixed=(await rpc(p,'PAIA_PROMPT_PAGE')).items.find(t=>t.id!==candidateId);
  assert.equal(fixed.text,'继续');assert.deepEqual(fixed.sourceRefs,[]);
  await p.locator('#prompt-close').click();await h.restartWorker();await p.reload();
  await clipboardOracle(p);await open(p);
  assert.equal((await rpc(p,'PAIA_PROMPT_PAGE')).total,2);
  await selectPrompt(p,'.prompt-choose[data-prompt-id="'+candidateId+'"]');
  assert.equal(await p.locator('#prompt-body').inputValue(),edited);
  await p.locator('#prompt-copy').click();await eventually(async()=>(await copied(p)).length===1);
  assert.deepEqual(await copied(p),[edited]);assert.deepEqual((await h.state()).records,sources);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-09 Prompts pagination, stale copy, dirty close and template-only removal retain original data',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);
  for(let i=0;i<26;i++)await rpc(p,'PAIA_PROMPT_CREATE',{template:{id:'page-'+String(i).padStart(2,'0'),text:'固定完整模板 '+i,pinned:i===0}});
  await clipboardOracle(p);const sources=(await h.state()).records;await open(p);
  assert.equal(await p.locator('.prompt-choose').count(),25);
  await p.locator('#prompt-next').click();await eventually(async()=>await p.locator('.prompt-choose').count()===1);
  await p.locator('#prompt-previous').click();await eventually(async()=>await p.locator('.prompt-choose').count()===25);
  await selectPrompt(p,'.prompt-choose[data-prompt-id="page-00"]');
  await p.locator('#prompt-body').fill('尚未保存的完整人工草稿');
  p.once('dialog',d=>d.dismiss());await p.locator('#prompt-close').click();
  assert.equal(await p.locator('#prompt-dialog').isVisible(),true);
  assert.equal(await p.locator('#prompt-body').inputValue(),'尚未保存的完整人工草稿');
  assert.equal((await rpc(p,'PAIA_PROMPT_READ',{id:'page-00',expectedRevision:1})).text,'固定完整模板 0');
  p.once('dialog',d=>d.accept());await p.locator('#prompt-close').click();await open(p);
  await selectPrompt(p,'.prompt-choose[data-prompt-id="page-00"]');
  await rpc(p,'PAIA_PROMPT_EDIT',{id:'page-00',change:{expectedRevision:1,text:'外部窗口已保存的新版本'}});
  await p.locator('#prompt-copy').click();await eventually(()=>p.locator('#prompt-status').textContent().then(t=>t.includes('内容已更新')));
  assert.deepEqual(await copied(p),[]);
  assert.equal(await p.locator('#prompt-body').inputValue(),'固定完整模板 0');
  await p.locator('#prompt-refresh').click();await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  await selectPrompt(p,'.prompt-choose[data-prompt-id="page-00"]');
  assert.equal(await p.locator('#prompt-body').inputValue(),'外部窗口已保存的新版本');
  p.once('dialog',d=>d.accept());await p.locator('#prompt-remove').click();
  await eventually(async()=>(await rpc(p,'PAIA_PROMPT_PAGE')).total===25);
  const refusal=await p.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_PROMPT_READ',id:'page-00',expectedRevision:3}));
  assert.deepEqual(refusal,{ok:false,error:'PROMPT_UNAVAILABLE'});
  assert.deepEqual((await h.state()).records,sources);assert.deepEqual(await copied(p),[]);
  await p.locator('#prompt-query').fill('固定完整模板 25');await p.locator('#prompt-refresh').click();
  await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  assert.equal(await p.locator('.prompt-choose').count(),1);
  assert.equal(await p.locator('.prompt-preview').textContent(),'固定完整模板 25');
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-09 committed candidate with lost response cannot duplicate on explicit retry; delayed full read blocks actions',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);const c=conversation('cpv1-prompt-lost-response');
  const body='人工模板 🧑🏽‍💻 é\n'+ '保留完整正文、空白和否定。 '.repeat(500)+'\n不要自动发送。';
  c.messages=c.messages.slice(0,1);c.messages[0].text=body;
  await h.open(c);await eventually(async()=>(await h.state()).library.blocks.length===1);
  const original=await h.state();await clipboardOracle(p);await open(p);
  await p.locator('#prompt-candidates').click();await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  for(let i=0;i<4&&await p.locator('.prompt-choose').count()===0;i++){
   await p.locator('#prompt-refresh').click();await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  }
  assert.equal(await p.locator('.prompt-choose').count(),1);
  assert.equal(await p.locator('.prompt-preview').textContent(),body);
  await selectPrompt(p);assert.equal(await p.locator('#prompt-body').inputValue(),body);
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);
   globalThis.promptRealSend=send;globalThis.promptCreateIds=[];let lost=false;
   chrome.runtime.sendMessage=async message=>{
    if(message.type!=='PAIA_PROMPT_CREATE')return send(message);
    globalThis.promptCreateIds.push(message.template.id);
    const result=await send(message);
    if(result.ok&&!lost){lost=true;throw new Error('message channel interrupted');}
    return result;
   };
  });
  await p.locator('#prompt-save').click();
  await eventually(()=>p.locator('#prompt-status').textContent().then(t=>t==='保存结果尚未确认。当前内容保留，请刷新已保存模板后核对。'));
  assert.equal(await p.locator('#prompt-body').inputValue(),body);
  assert.equal(await p.locator('#prompt-body').getAttribute('readonly'),'');
  let page=await rpc(p,'PAIA_PROMPT_PAGE');assert.equal(page.total,1);
  const saved=page.items[0];assert.equal(saved.text,body);assert.equal(saved.sourceRefs.length,1);assert.equal(saved.revision,1);
  assert.deepEqual(await p.evaluate(()=>globalThis.promptCreateIds),[saved.id]);
  // Only the user's second click may retry. It keeps the exact committed ID.
  await p.locator('#prompt-save').click();
  await eventually(()=>p.locator('#prompt-status').textContent().then(t=>t.includes('内容已更新')));
  assert.deepEqual(await p.evaluate(()=>globalThis.promptCreateIds),[saved.id,saved.id]);
  page=await rpc(p,'PAIA_PROMPT_PAGE');assert.equal(page.total,1);assert.deepEqual(page.items[0],saved);
  assert.equal(await p.locator('#prompt-body').inputValue(),body);assert.deepEqual(await copied(p),[]);
  assert.deepEqual((await h.state()).records,original.records);
  assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  await p.evaluate(()=>{chrome.runtime.sendMessage=globalThis.promptRealSend;});
  await p.locator('#prompt-saved').click();await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  await p.evaluate(id=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.promptReadHeld=false;
   chrome.runtime.sendMessage=async message=>{
    const result=await send(message);
    if(message.type==='PAIA_PROMPT_READ'&&message.id===id){
     globalThis.promptReadHeld=true;
     await new Promise(resolve=>{globalThis.promptReleaseRead=resolve;});
    }
    return result;
   };
  },saved.id);
  await p.locator('.prompt-choose[data-prompt-id="'+saved.id+'"]').click();
  await eventually(()=>p.evaluate(()=>globalThis.promptReadHeld===true));
  assert.equal(await p.locator('#prompt-body').isDisabled(),true);
  assert.equal(await p.locator('#prompt-save').isDisabled(),true);
  assert.equal(await p.locator('#prompt-copy').isDisabled(),true);
  await p.keyboard.press('Escape');assert.equal(await p.locator('#prompt-dialog').isVisible(),true);
  assert.deepEqual(await copied(p),[]);
  await p.evaluate(()=>{globalThis.promptReleaseRead();});
  await eventually(async()=>!await p.locator('#prompt-body').isDisabled());
  assert.equal(await p.locator('#prompt-body').inputValue(),body);
  assert.equal(await p.locator('#prompt-body').getAttribute('readonly'),null);
  assert.equal(await p.locator('.prompt-source-open').count(),saved.sourceRefs.length);
  await p.evaluate(()=>{chrome.runtime.sendMessage=globalThis.promptRealSend;});
  await p.locator('#prompt-copy').click();await eventually(async()=>(await copied(p)).length===1);
  assert.deepEqual(await copied(p),[body]);
  assert.deepEqual((await h.state()).records,original.records);
  assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
