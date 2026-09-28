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
  // A changed saved template cannot silently open a stale Source action.
  const otherEdit=edited+'\n另一窗口保存的模板版本。';
  await rpc(p,'PAIA_PROMPT_EDIT',{id:candidateId,change:{expectedRevision:2,text:otherEdit}});
  await p.locator('.prompt-record-open').click();
  await eventually(()=>p.locator('#prompt-status').textContent().then(t=>t.includes('内容已更新')));
  assert.equal(await p.locator('#info-dialog').isVisible(),false);
  assert.equal(await p.locator('#prompt-dialog').isVisible(),true);
  assert.equal(await p.locator('#prompt-body').inputValue(),edited);
  assert.deepEqual(await copied(p),[edited]);assert.deepEqual((await h.state()).records,sources);
  await p.locator('#prompt-refresh').click();await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  await selectPrompt(p,'.prompt-choose[data-prompt-id="'+candidateId+'"]');
  assert.equal(await p.locator('#prompt-body').inputValue(),otherEdit);
  await p.locator('.prompt-record-open').click();await eventually(()=>p.locator('#info-dialog').isVisible());
  assert.equal(await p.locator('#prompt-dialog').isVisible(),false);
  assert.equal(await p.locator('#info-dialog .source-original').textContent(),body);
  assert.equal(await p.locator('#info-dialog .source-original svg').count(),0);
  assert.equal(await p.evaluate(()=>globalThis.promptInjected),undefined);
  assert.equal(await p.locator('#info-dialog h2').textContent(),'查看当时记录');
  assert.equal(await p.evaluate(()=>document.activeElement===document.querySelector('#info-dialog h2')),true);
  await p.locator('#close-info').click();await eventually(()=>p.evaluate(()=>document.activeElement?.id==='prompt-open'));
  assert.equal(await p.locator('#info-content').textContent(),'');
  // Native keyboard reopening returns to the same current full saved template.
  await p.keyboard.press('Enter');await eventually(async()=>!await p.locator('#prompt-refresh').isDisabled());
  await selectPrompt(p,'.prompt-choose[data-prompt-id="'+candidateId+'"]');
  assert.equal(await p.locator('#prompt-body').inputValue(),otherEdit);
  const closed=await p.evaluate(()=>{document.querySelector('#prompt-close').click();return {open:document.querySelector('#prompt-dialog').open,body:document.querySelector('#prompt-body').value,list:document.querySelector('#prompt-list').textContent};});
  assert.deepEqual(closed,{open:false,body:'',list:''},'owned close clears private DOM synchronously, before queued native close event');
  await eventually(()=>p.evaluate(()=>document.activeElement?.id==='prompt-open'));
  assert.equal(await p.locator('#prompt-body').inputValue(),'');
  assert.equal(await p.locator('#prompt-list').textContent(),'');
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

test('CPV1-09 a queued native close cannot erase a reopened Prompt invocation',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);await clipboardOracle(p);
  const text='重新打开后的完整人工模板 🧑🏽‍💻 é\n'+'保留人工正文 '.repeat(1000)+'\n最后否定：不要发送。';
  const saved=await rpc(p,'PAIA_PROMPT_CREATE',{template:{id:'native-close-reopen',text}});
  const result=await p.evaluate(async saved=>{
   const {PromptPanel}=await import('./prompt-panel.js');
   const panel=new PromptPanel();await panel.open(document.querySelector('#prompt-open'));await panel.choose(saved);
   const closedEvent=new Promise(resolve=>panel.dialog.addEventListener('close',resolve,{once:true}));
   panel.closeDialog();
   const cleared={body:panel.body.value,list:panel.list.textContent,selected:panel.selected};
   // Reopen within the same task, before Chrome emits the old queued close.
   panel.dialog.showModal();panel.show(saved);
   await closedEvent;
   const current={open:panel.dialog.open,body:panel.body.value,selectedId:panel.selected?.id,cleared};
   panel.closeDialog();panel.dialog.remove();return current;
  },saved);
  assert.deepEqual(result,{open:true,body:text,selectedId:saved.id,cleared:{body:'',list:'',selected:null}});
  assert.deepEqual((await rpc(p,'PAIA_PROMPT_READ',{id:saved.id,expectedRevision:1})),saved);
  assert.deepEqual(await copied(p),[]);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-09 P2 native input session protects full drafts, IME and target drift without send or clipboard',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);await clipboardOracle(p);const original=await h.state();
  const body='完整人工表达 🧑🏽‍💻 é\n'+ '保留代码、空白与换行 '.repeat(1000)+'\n最后否定：不要发送。';
  const results=await p.evaluate(async body=>{
   const {createPromptInputSession}=await import('./prompt-input-session.js');
   const form=document.createElement('form'),field=document.createElement('textarea'),send=document.createElement('button');
   send.type='submit';send.textContent='发送';form.append(field,send);document.body.append(form);
   let inputs=0,sends=0,reads=0;
   form.addEventListener('submit',e=>{e.preventDefault();sends++;});send.addEventListener('click',()=>sends++);
   field.addEventListener('input',()=>inputs++);
   // An own accessor cannot replace the native full-draft value getter/setter.
   Object.defineProperty(field,'value',{configurable:true,get(){reads++;return 'forged private draft';},set(){throw Error('non-native setter');}});
   const native=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
   const get=()=>native.get.call(field),set=text=>native.set.call(field,text);
   const session=createPromptInputSession(field),observations=[];
   const refuses=(token,choice,expected)=>{
    let code=null;try{token.commit(choice);}catch(error){code=error.code;}
    if(code!==expected)throw Error('expected '+expected+' received '+code);
   };
   const empty=session.prepare(body);const written=empty.commit({mode:'append'});
   observations.push({kind:'empty',body:get(),written,inputs,sends,reads});
   refuses(empty,{mode:'append'},'PROMPT_INSERT_STALE');
   set('  现有人工草稿 🧑🏽‍💻 é\n不要改写。 ');
   const draft=get(),append=session.prepare('后续完整模板');
   append.commit({mode:'append'});
   observations.push({kind:'append',body:get(),draft,inputs,sends,reads});
   const before=get(),reject=session.prepare(body);refuses(reject,{mode:'replace'},'PROMPT_REPLACE_CONFIRMATION_REQUIRED');
   observations.push({kind:'replace-refusal',body:get(),before,inputs,sends});
   const replacement=session.prepare(body);replacement.commit({mode:'replace',replaceConfirmed:true});
   observations.push({kind:'replace',body:get(),inputs,sends});
   const changed=session.prepare('新模板');set('在确认窗口期间写入的新草稿');refuses(changed,{mode:'replace',replaceConfirmed:true},'PROMPT_INSERT_STALE');
   observations.push({kind:'value-drift',body:get(),inputs,sends});
   const eventDrift=session.prepare('新模板');field.dispatchEvent(new InputEvent('input',{bubbles:true}));
   refuses(eventDrift,{mode:'replace',replaceConfirmed:true},'PROMPT_INSERT_STALE');
   field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'输入法内容'}));
   let composing=null;try{session.prepare(body);}catch(e){composing=e.code;}
   field.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'输入法内容'}));
   observations.push({kind:'ime',code:composing,body:get(),inputs,sends});
   const normalization=session.prepare('模板\r\n必须保留原样');
   refuses(normalization,{mode:'append'},'PROMPT_INPUT_NORMALIZATION');
   field.maxLength=3;const maximum=session.prepare('完整正文');refuses(maximum,{mode:'replace',replaceConfirmed:true},'PROMPT_INSERT_LIMIT');field.removeAttribute('maxlength');
   const readonly=session.prepare('新模板');field.readOnly=true;refuses(readonly,{mode:'append'},'PROMPT_TARGET_UNAVAILABLE');field.readOnly=false;
   const cancel=session.prepare('新模板');const cancelled=cancel.cancel();refuses(cancel,{mode:'append'},'PROMPT_INSERT_STALE');
   const prior=session.prepare('新模板');let invalidPreview=null;
   try{session.prepare('   ');}catch(e){invalidPreview=e.code;}
   if(invalidPreview!=='PROMPT_INSERT_INVALID')throw Error('invalid preview was admitted');
   refuses(prior,{mode:'append'},'PROMPT_INSERT_STALE');
   const hidden=session.prepare('新模板');form.style.visibility='hidden';
   refuses(hidden,{mode:'append'},'PROMPT_TARGET_UNAVAILABLE');form.style.visibility='';
   refuses(hidden,{mode:'append'},'PROMPT_INSERT_STALE');
   const beforeUnavailable=session.prepare('新模板');form.style.visibility='hidden';let unavailable=null;
   try{session.prepare(body);}catch(e){unavailable=e.code;}
   if(unavailable!=='PROMPT_TARGET_UNAVAILABLE')throw Error('hidden preview was admitted');
   form.style.visibility='';refuses(beforeUnavailable,{mode:'append'},'PROMPT_INSERT_STALE');
   const surplus=session.prepare('新模板');refuses(surplus,{mode:'append',send:true},'PROMPT_INSERT_INVALID');
   field.focus();const late=createPromptInputSession(field);let unknown=null;
   try{late.prepare(body);}catch(e){unknown=e.code;}late.dispose();field.blur();
   const replaced=session.prepare('新模板'),other=document.createElement('textarea');other.value='新窗口输入，不得覆盖';field.replaceWith(other);
   refuses(replaced,{mode:'replace',replaceConfirmed:true},'PROMPT_TARGET_UNAVAILABLE');
   observations.push({kind:'target-drift',other:other.value,cancelled,unknown,inputs,sends,reads});
   session.dispose();form.remove();return observations;
  },body);
  assert.deepEqual(results[0],{kind:'empty',body,written:{mode:'append',characters:body.length},inputs:1,sends:0,reads:0});
  assert.equal(results[1].body,results[1].draft+'\n后续完整模板');assert.equal(results[1].inputs,2);assert.equal(results[1].sends,0);assert.equal(results[1].reads,0);
  assert.equal(results[2].body,results[2].before);assert.equal(results[2].inputs,2);assert.equal(results[2].sends,0);
  assert.equal(results[3].body,body);assert.equal(results[3].inputs,3);assert.equal(results[3].sends,0);
  assert.equal(results[4].body,'在确认窗口期间写入的新草稿');assert.equal(results[4].inputs,3);assert.equal(results[4].sends,0);
  assert.equal(results[5].code,'PROMPT_COMPOSING');assert.equal(results[5].body,results[4].body);assert.equal(results[5].sends,0);
  assert.deepEqual(results[6],{kind:'target-drift',other:'新窗口输入，不得覆盖',cancelled:true,unknown:'PROMPT_COMPOSITION_UNKNOWN',inputs:4,sends:0,reads:0});
  assert.deepEqual((await h.state()).records,original.records);assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.deepEqual(await copied(p),[]);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
