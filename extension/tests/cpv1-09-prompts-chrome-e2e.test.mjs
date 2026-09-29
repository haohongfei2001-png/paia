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
   for(const kind of ['opacity','inert','aria-hidden']){
    const invisible=session.prepare('新模板');
    if(kind==='opacity')form.style.opacity='0';else form.setAttribute(kind,kind==='inert'?'':'true');
    refuses(invisible,{mode:'append'},'PROMPT_TARGET_UNAVAILABLE');
    if(kind==='opacity')form.style.opacity='';else form.removeAttribute(kind);
    refuses(invisible,{mode:'append'},'PROMPT_INSERT_STALE');
   }
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

test('CPV1-09 P2 current template identity and cancellation fence native insertion across actual worker reads',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);await clipboardOracle(p);const original=await h.state();
  const body='完整已保存模板 🧑🏽‍💻 é\n'+'保留长正文与代码 '.repeat(1000)+'\n最后否定：不得自动发送。';
  const one=await rpc(p,'PAIA_PROMPT_CREATE',{template:{id:'insertion-saved-one',text:body,pinned:true,sourceRefs:[]}});
  const two=await rpc(p,'PAIA_PROMPT_CREATE',{template:{id:'insertion-saved-two',text:body+'\n第二项完整正文',pinned:true,sourceRefs:[]}});
  const results=await p.evaluate(async ({one,two,body})=>{
   const {createPromptInputSession}=await import('./prompt-input-session.js');
   const {createPromptInsertionController}=await import('./prompt-insertion-controller.js');
   const field=document.createElement('textarea'),form=document.createElement('form'),send=document.createElement('button');
   send.type='submit';form.append(field,send);document.body.append(form);
   let inputs=0,sends=0,reads=0,holdNext=false,release=null,unknownNext=false,hostileNext=false,errorCodeReads=0;
   field.addEventListener('input',()=>inputs++);form.addEventListener('submit',e=>{e.preventDefault();sends++;});send.addEventListener('click',()=>sends++);
   const runtime=async (type,fields)=>{
    const r=await chrome.runtime.sendMessage({type,...fields});if(!r.ok)throw {code:r.error};return r.data;
   };
   const readTemplate=async selected=>{
    reads++;const row=await runtime('PAIA_PROMPT_READ',selected);
    if(unknownNext){unknownNext=false;throw Error('private body must not enter failure messages');}
    if(hostileNext){hostileNext=false;const error={};Object.defineProperty(error,'code',{get(){errorCodeReads++;throw Error('private error getter');}});throw error;}
    if(holdNext){holdNext=false;await new Promise(resolve=>{release=resolve;});}
    return row;
   };
   const controller=createPromptInsertionController({readTemplate,session:createPromptInputSession(field)});
   const select=row=>({id:row.id,expectedRevision:row.revision});
   const refuses=async (operation,expected)=>{
    let code=null,message=null;try{await operation();}catch(e){code=e.code;message=e.message;}
    if(code!==expected||message!==expected)throw Error('finite refusal mismatch: '+code);return code;
   };
   const observations=[];
   const first=await controller.prepare(select(one));const applied=await first.commit({mode:'append'});
   observations.push({kind:'success',body:field.value,applied,inputs,sends,reads});
   await refuses(()=>first.commit({mode:'append'}),'PROMPT_INSERT_STALE');
   const stale=await controller.prepare(select(one));
   const edited=await runtime('PAIA_PROMPT_EDIT',{id:one.id,change:{expectedRevision:one.revision,text:body+'\n另一个窗口的修改'}});
   await refuses(()=>stale.commit({mode:'replace',replaceConfirmed:true}),'PROMPT_STALE');
   observations.push({kind:'template-drift',body:field.value,inputs,sends});
   const draft=await controller.prepare(select(edited));field.value='新的人工草稿，不得覆盖';
   await refuses(()=>draft.commit({mode:'replace',replaceConfirmed:true}),'PROMPT_INSERT_STALE');
   const missing=await controller.prepare(select(edited));
   await runtime('PAIA_PROMPT_REMOVE',{id:edited.id,change:{expectedRevision:edited.revision}});
   await refuses(()=>missing.commit({mode:'replace',replaceConfirmed:true}),'PROMPT_UNAVAILABLE');
   observations.push({kind:'removed',body:field.value,inputs,sends});
   const pending=await controller.prepare(select(two));holdNext=true;
   const cancelling=pending.commit({mode:'replace',replaceConfirmed:true});
   while(!release)await new Promise(resolve=>setTimeout(resolve,0));
   const cancelled=pending.cancel();release();release=null;
   await refuses(()=>cancelling,'PROMPT_INSERT_STALE');
   observations.push({kind:'cancelled-read',body:field.value,cancelled,inputs,sends});
   holdNext=true;const oldPrepare=controller.prepare(select(two));
   while(!release)await new Promise(resolve=>setTimeout(resolve,0));
   const current=await controller.prepare(select(two));release();release=null;
   await refuses(()=>oldPrepare,'PROMPT_INSERT_STALE');
   await current.commit({mode:'append'});
   observations.push({kind:'superseded-read',body:field.value,inputs,sends});
   const duplicate=await controller.prepare(select(two));holdNext=true;
   const firstCommit=duplicate.commit({mode:'replace',replaceConfirmed:true});
   while(!release)await new Promise(resolve=>setTimeout(resolve,0));
   await refuses(()=>duplicate.commit({mode:'replace',replaceConfirmed:true}),'PROMPT_INSERT_STALE');
   release();release=null;await refuses(()=>firstCommit,'PROMPT_INSERT_STALE');
   if(field.value!=='新的人工草稿，不得覆盖'+'\n'+two.text||inputs!==2||sends!==0)throw Error('concurrent commit had an effect');
   const unknown=await controller.prepare(select(two));unknownNext=true;
   await refuses(()=>unknown.commit({mode:'replace',replaceConfirmed:true}),'PROMPT_INSERT_UNAVAILABLE');
   const hostile=await controller.prepare(select(two));hostileNext=true;
   await refuses(()=>hostile.commit({mode:'replace',replaceConfirmed:true}),'PROMPT_INSERT_UNAVAILABLE');
   if(errorCodeReads!==0)throw Error('foreign error accessor was invoked');
   const foreign=await controller.prepare(select(two));const beforeInvalid=reads;
   await refuses(()=>foreign.commit({mode:'append',send:true}),'PROMPT_INSERT_INVALID');
   if(reads!==beforeInvalid)throw Error('surplus command reached reader');
   let getterReads=0;const accessor={id:two.id};Object.defineProperty(accessor,'expectedRevision',{enumerable:true,get(){getterReads++;return two.revision;}});
   await refuses(()=>controller.prepare(accessor),'PROMPT_INSERT_INVALID');
   observations.push({kind:'unknown-and-invalid',body:field.value,getterReads,inputs,sends});
   const leaving=await controller.prepare(select(two));holdNext=true;
   const disposal=leaving.commit({mode:'replace',replaceConfirmed:true});
   while(!release)await new Promise(resolve=>setTimeout(resolve,0));
   controller.dispose();release();
   await refuses(()=>disposal,'PROMPT_INSERT_STALE');
   observations.push({kind:'disposed',body:field.value,inputs,sends});
   form.remove();return observations;
  },{one,two,body});
  assert.deepEqual(results[0],{kind:'success',body,applied:{mode:'append',characters:body.length},inputs:1,sends:0,reads:2});
  assert.deepEqual(results[1],{kind:'template-drift',body,inputs:1,sends:0});
  const draft='新的人工草稿，不得覆盖';
  assert.deepEqual(results[2],{kind:'removed',body:draft,inputs:1,sends:0});
  assert.deepEqual(results[3],{kind:'cancelled-read',body:draft,cancelled:true,inputs:1,sends:0});
  const final=draft+'\n'+two.text;
  assert.deepEqual(results[4],{kind:'superseded-read',body:final,inputs:2,sends:0});
  assert.deepEqual(results[5],{kind:'unknown-and-invalid',body:final,getterReads:0,inputs:2,sends:0});
  assert.deepEqual(results[6],{kind:'disposed',body:final,inputs:2,sends:0});
  const templates=await rpc(p,'PAIA_PROMPT_PAGE');assert.equal(templates.total,1);assert.equal(templates.items[0].text,two.text);
  assert.deepEqual((await h.state()).records,original.records);assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.deepEqual(await copied(p),[]);assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});


test('CPV1-09 P2 trusted human full-template review protects draft and manual-copy fallback',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);await clipboardOracle(p);const original=await h.state();
  const body='完整人工模板 🧑🏽‍💻 é\n<svg onload="globalThis.promptReviewInjected=true">\n'+
   '全部正文、空白与代码必须保留 '.repeat(1000)+'\n最后否定：不得自动发送或截断。';
  const saved=await rpc(p,'PAIA_PROMPT_CREATE',{template:{id:'human-insertion-review',text:body,pinned:true,sourceRefs:[]}});
  const other=await rpc(p,'PAIA_PROMPT_CREATE',{template:{id:'human-insertion-cancel',text:body+'\n第二模板',pinned:true,sourceRefs:[]}});
  const draft='现有人工草稿 🧑🏽‍💻 é\n不得覆盖。';
  await p.evaluate(async ({saved,other,draft})=>{
   const {createPromptInsertionReview}=await import('./prompt-insertion-review.js');
   const target=document.createElement('textarea'),form=document.createElement('form'),send=document.createElement('button'),trigger=document.createElement('button');
   target.id='review-target';target.value=draft;send.type='submit';send.id='review-send';send.textContent='Send';
   trigger.type='button';trigger.id='review-trigger';trigger.textContent='Review Prompt';
   // A visible synthetic target surface coexists with the complete archive
   // shell. Its invokers must receive a real pointer gesture without bypassing
   // hit testing or removing/weakening the original product fixture.
   const surface=document.createElement('section');surface.id='prompt-review-fixture';
   surface.setAttribute('aria-label','Synthetic native input and trusted Prompt invokers');
   surface.style.cssText='position:fixed;top:12px;right:12px;width:480px;max-width:calc(100vw - 24px);padding:12px;z-index:2147483647;background:white;';
   form.append(target,send);surface.append(form,trigger);document.body.append(surface);
   globalThis.promptReviewCounts={inputs:0,sends:0,reads:0};globalThis.promptReviewHold=false;globalThis.promptReviewRelease=null;
   target.addEventListener('input',()=>globalThis.promptReviewCounts.inputs++);
   form.addEventListener('submit',e=>{e.preventDefault();globalThis.promptReviewCounts.sends++;});
   send.addEventListener('click',()=>globalThis.promptReviewCounts.sends++);
   const readTemplate=async fields=>{
    globalThis.promptReviewCounts.reads++;
    const result=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_READ',...fields});
    if(!result.ok)throw {code:result.error};
    if(globalThis.promptReviewHold){globalThis.promptReviewHold=false;await new Promise(resolve=>{globalThis.promptReviewRelease=resolve;});}
    return result.data;
   };
   const review=createPromptInsertionReview({target,trigger,selection:{id:saved.id,expectedRevision:saved.revision},readTemplate});
   trigger.addEventListener('click',event=>void review.open(event));
   // Scripted page clicks cannot grant an insertion/read gesture.
   trigger.click();
   globalThis.promptReviewRefs={review,target,trigger,form,readTemplate,createPromptInsertionReview,other};
  },{saved,other,draft});
  assert.equal(await p.locator('.prompt-insertion-review[open]').count(),0);
  assert.deepEqual(await p.evaluate(()=>globalThis.promptReviewCounts),{inputs:0,sends:0,reads:0});
  const review=p.locator('.prompt-insertion-review'),preview=review.locator('textarea[aria-label="完整模板正文"]'),
   before=review.locator('textarea[aria-label="当前草稿全文"]');
  const append=review.getByRole('button',{name:'追加到当前草稿',exact:true}),
   replace=review.getByRole('button',{name:'替换整个草稿',exact:true}),
   copy=review.getByRole('button',{name:'复制完整正文',exact:true}),
   close=review.getByRole('button',{name:'取消',exact:true});
  assert.equal(await p.locator('#review-trigger').evaluate(node=>{
   const box=node.getBoundingClientRect();
   return document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)===node;
  }),true,'actual trusted invoker must pass native pointer hit testing');
  await p.locator('#review-trigger').click();
  await eventually(async()=>!await copy.isDisabled(),'complete current review finishes');
  assert.equal(await preview.inputValue(),body);assert.equal(await before.inputValue(),draft);
  assert.equal(await review.locator('svg').count(),0);assert.equal(await p.evaluate(()=>globalThis.promptReviewInjected),undefined);
  assert.equal(await replace.isDisabled(),true);assert.equal(await append.isDisabled(),false);
  await append.click();
  await eventually(async()=>/完整正文已写入/.test(await review.getByRole('status').textContent()));
  assert.equal(await p.locator('#review-target').inputValue(),draft+'\n'+body);
  assert.equal(await preview.inputValue(),'');assert.equal(await before.inputValue(),'');
  assert.deepEqual(await p.evaluate(()=>globalThis.promptReviewCounts),{inputs:1,sends:0,reads:2});
  assert.deepEqual(await copied(p),[]);await p.keyboard.press('Escape');
  assert.equal(await review.isVisible(),false);assert.equal(await preview.inputValue(),'');assert.equal(await before.inputValue(),'');
  await p.evaluate(()=>{globalThis.promptReviewRefs.target.value='另一个完整草稿';});
  await p.locator('#review-trigger').click();await eventually(async()=>!await copy.isDisabled());
  assert.equal(await before.inputValue(),'另一个完整草稿');assert.equal(await replace.isDisabled(),true);
  await review.getByLabel('我确认替换此输入框中的整个现有草稿',{exact:true}).check();
  assert.equal(await replace.isDisabled(),false);await replace.click();
  await eventually(async()=>/完整正文已写入/.test(await review.getByRole('status').textContent()));
  assert.equal(await p.locator('#review-target').inputValue(),body);
  assert.deepEqual(await p.evaluate(()=>globalThis.promptReviewCounts),{inputs:2,sends:0,reads:4});
  await close.click();
  await p.evaluate(()=>{const target=globalThis.promptReviewRefs.target;target.value='保留只读草稿';target.readOnly=true;});
  await p.locator('#review-trigger').click();await eventually(async()=>!await copy.isDisabled());
  assert.equal(await preview.inputValue(),body);assert.equal(await before.inputValue(),'');
  assert.equal(await append.isDisabled(),true);assert.equal(await replace.isDisabled(),true);
  await copy.click();await eventually(async()=>/完整正文已复制/.test(await review.getByRole('status').textContent()));
  assert.deepEqual(await copied(p),[body]);assert.equal(await p.locator('#review-target').inputValue(),'保留只读草稿');
  assert.equal(await p.evaluate(()=>globalThis.promptReviewCounts.inputs),2);await close.click();
  // Clipboard refusal preserves the entire existing system-copy fallback.
  await p.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
   writeText:async()=>{throw Error('synthetic clipboard denied');},readText:()=>{throw Error('clipboard read forbidden');}
  }});});
  await p.locator('#review-trigger').click();await eventually(async()=>!await copy.isDisabled());await copy.click();
  await eventually(async()=>await p.locator('.reading-copy-dialog[open]').count()===1);
  assert.equal(await p.locator('.reading-copy-dialog textarea').inputValue(),body);
  assert.equal(await p.locator('#review-target').inputValue(),'保留只读草稿');
  await p.locator('.reading-copy-dialog').getByRole('button',{name:'完成',exact:true}).click();
  await close.click();assert.equal(await preview.inputValue(),'');assert.equal(await before.inputValue(),'');
  await clipboardOracle(p);
  // Modern rich-text is explicitly unsupported and exposes only full manual copy.
  await p.evaluate(()=>{
   const {createPromptInsertionReview,readTemplate,other}=globalThis.promptReviewRefs;
   const rich=document.createElement('div'),trigger=document.createElement('button');
   rich.contentEditable='true';rich.id='review-rich';rich.textContent='现有富文本草稿，不得改写';
   trigger.id='review-rich-trigger';trigger.type='button';trigger.textContent='Review unsupported';
   document.querySelector('#prompt-review-fixture').append(rich,trigger);
   const review=createPromptInsertionReview({target:rich,trigger,selection:{id:other.id,expectedRevision:other.revision},readTemplate});
   trigger.addEventListener('click',event=>void review.open(event));globalThis.promptRichReview=review;
  });
  assert.equal(await p.locator('#review-rich-trigger').evaluate(node=>{
   const box=node.getBoundingClientRect();
   return document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)===node;
  }),true,'unsupported target still requires an actual hittable invoker');
  await p.locator('#review-rich-trigger').click();
  const richReview=p.locator('.prompt-insertion-review[open]');
  await eventually(async()=>!await richReview.getByRole('button',{name:'复制完整正文',exact:true}).isDisabled());
  assert.equal(await richReview.locator('textarea[aria-label="完整模板正文"]').inputValue(),other.text);
  assert.equal(await richReview.locator('textarea[aria-label="当前草稿全文"]').inputValue(),'');
  assert.equal(await richReview.getByRole('button',{name:'追加到当前草稿',exact:true}).isDisabled(),true);
  await richReview.getByRole('button',{name:'复制完整正文',exact:true}).click();
  await eventually(async()=>(await copied(p)).length===1);assert.deepEqual(await copied(p),[other.text]);
  assert.equal(await p.locator('#review-rich').textContent(),'现有富文本草稿，不得改写');
  await richReview.getByRole('button',{name:'取消',exact:true}).click();
  await p.evaluate(()=>globalThis.promptRichReview.dispose());
  await p.evaluate(()=>{globalThis.promptReviewRefs.target.readOnly=false;globalThis.promptReviewRefs.target.value='新的人工草稿';});
  await p.locator('#review-trigger').click();await eventually(async()=>!await copy.isDisabled());
  await rpc(p,'PAIA_PROMPT_EDIT',{id:saved.id,change:{expectedRevision:saved.revision,text:body+'\n外部新修订'}});
  await append.click();await eventually(async()=>/模板已更新/.test(await review.getByRole('status').textContent()));
  assert.equal(await p.locator('#review-target').inputValue(),'新的人工草稿');
  assert.equal(await p.evaluate(()=>globalThis.promptReviewCounts.inputs),2);assert.equal(await append.isDisabled(),true);
  await copy.click();await eventually(async()=>/模板已更新/.test(await review.getByRole('status').textContent()));
  assert.deepEqual(await copied(p),[other.text]);assert.equal(await preview.inputValue(),'');await close.click();
  // A completed real worker response held across cancel cannot repopulate
  // either visible or hidden private DOM, or grant insertion/copy on arrival.
  await p.evaluate(()=>{
   const {createPromptInsertionReview,readTemplate,other,target,trigger,review}=globalThis.promptReviewRefs;
   review.dispose();
   const next=createPromptInsertionReview({target,trigger,selection:{id:other.id,expectedRevision:other.revision},readTemplate});
   trigger.addEventListener('click',event=>void next.open(event));globalThis.promptNextReview=next;globalThis.promptReviewHold=true;
  });
  await p.locator('#review-trigger').click();await eventually(async()=>await p.evaluate(()=>!!globalThis.promptReviewRelease));
  const pending=p.locator('.prompt-insertion-review[open]');
  await pending.getByRole('button',{name:'取消',exact:true}).click();
  await p.evaluate(async()=>{globalThis.promptReviewRelease();await new Promise(resolve=>setTimeout(resolve,0));});
  assert.equal(await p.locator('.prompt-insertion-review[open]').count(),0);
  for(const value of await p.locator('.prompt-insertion-review textarea').evaluateAll(nodes=>nodes.map(e=>e.value)))assert.equal(value,'');
  assert.equal(await p.locator('#review-target').inputValue(),'新的人工草稿');
  assert.equal(await p.evaluate(()=>globalThis.promptReviewCounts.inputs),2);
  assert.equal(await p.evaluate(()=>globalThis.promptReviewCounts.sends),0);assert.deepEqual(await copied(p),[other.text]);
  assert.equal(await p.locator('#review-send').isEnabled(),true);
  await p.evaluate(()=>{globalThis.promptNextReview.dispose();const refs=globalThis.promptReviewRefs;refs.form.remove();refs.trigger.remove();document.querySelector('#review-rich').remove();document.querySelector('#review-rich-trigger').remove();document.querySelector('#prompt-review-fixture').remove();});
  const templates=await rpc(p,'PAIA_PROMPT_PAGE');assert.equal(templates.total,2);
  assert.equal(templates.items.find(row=>row.id===saved.id).text,body+'\n外部新修订');
  assert.equal(templates.items.find(row=>row.id===other.id).text,other.text);
  assert.deepEqual((await h.state()).records,original.records);assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});


test('CPV1-09 P2 keyboard review preserves unresolved composition across blur and reopen',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);await clipboardOracle(p);const original=await h.state();
  const body='完整键盘模板 🧑🏽‍💻 é\n'+'保留全部空白、代码和否定 '.repeat(1000)+'\n最后否定：不得自动发送。';
  const draft='完整未完成输入草稿 中文 🧑🏽‍💻 é\n'+'不得覆盖现有内容 '.repeat(1000);
  const saved=await rpc(p,'PAIA_PROMPT_CREATE',{template:{id:'keyboard-composition-review',text:body,pinned:true,sourceRefs:[]}});
  await p.evaluate(async ({saved,draft})=>{
   const {createPromptInsertionReview}=await import('./prompt-insertion-review.js');
   const surface=document.createElement('section'),form=document.createElement('form'),target=document.createElement('textarea'),
    trigger=document.createElement('button'),send=document.createElement('button');
   surface.id='keyboard-review-fixture';
   surface.style.cssText='position:fixed;top:12px;right:12px;width:480px;max-width:calc(100vw - 24px);padding:12px;z-index:2147483647;background:white;';
   target.id='keyboard-review-target';target.value=draft;
   trigger.id='keyboard-review-trigger';trigger.type='button';trigger.textContent='Keyboard Prompt review';
   send.id='keyboard-review-send';send.type='submit';send.textContent='Send';
   form.append(target,send);surface.append(form,trigger);document.body.append(surface);
   const counts={reads:0,draftReads:0,inputs:0,sends:0},prototype=HTMLTextAreaElement.prototype,
    value=Object.getOwnPropertyDescriptor(prototype,'value');
   Object.defineProperty(prototype,'value',{...value,get(){
    if(this===target)counts.draftReads++;return value.get.call(this);
   }});
   target.addEventListener('input',()=>counts.inputs++);
   form.addEventListener('submit',event=>{event.preventDefault();counts.sends++;});
   send.addEventListener('click',()=>counts.sends++);
   const readTemplate=async selection=>{
    counts.reads++;const row=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_READ',...selection});
    if(!row.ok)throw {code:row.error};return row.data;
   };
   const review=createPromptInsertionReview({target,trigger,selection:{id:saved.id,expectedRevision:saved.revision},readTemplate});
   trigger.addEventListener('click',event=>void review.open(event));
   globalThis.keyboardPromptReview={target,trigger,review,counts,prototype,value,surface};
  },{saved,draft});
  await p.locator('#keyboard-review-target').focus();
  // Synthetic lifecycle uncertainty on an actual hosted Chrome native input:
  // this does not certify physical OS/Chinese IME behavior or a provider page.
  await p.evaluate(()=>globalThis.keyboardPromptReview.target.dispatchEvent(
   new CompositionEvent('compositionstart',{bubbles:true,data:'尚未结束的中文输入'})));
  await p.locator('#keyboard-review-trigger').focus();await p.keyboard.press('Enter');
  const review=p.locator('.prompt-insertion-review[open]'),preview=review.locator('textarea[aria-label="完整模板正文"]'),
   before=review.locator('textarea[aria-label="当前草稿全文"]'),
   copy=review.getByRole('button',{name:'复制完整正文',exact:true}),
   append=review.getByRole('button',{name:'追加到当前草稿',exact:true});
  await eventually(async()=>!await copy.isDisabled());
  assert.match(await review.getByRole('status').textContent(),/输入法尚未结束/);
  assert.equal(await preview.inputValue(),body);assert.equal(await before.inputValue(),'');
  assert.equal(await append.isDisabled(),true);
  assert.equal(await review.getByRole('button',{name:'替换整个草稿',exact:true}).isDisabled(),true);
  assert.deepEqual(await p.evaluate(()=>globalThis.keyboardPromptReview.counts),{reads:1,draftReads:0,inputs:0,sends:0});
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('.prompt-insertion-review[open]').count(),0);
  assert.equal(await p.evaluate(()=>document.activeElement===globalThis.keyboardPromptReview.trigger),true);
  for(const value of await p.locator('.prompt-insertion-review textarea').evaluateAll(nodes=>nodes.map(n=>n.value)))assert.equal(value,'');
  // Closing and opening a fresh controller cannot manufacture compositionend.
  await p.keyboard.press('Space');await eventually(async()=>!await copy.isDisabled());
  assert.match(await review.getByRole('status').textContent(),/输入法尚未结束/);
  assert.equal(await before.inputValue(),'');assert.equal(await append.isDisabled(),true);
  assert.deepEqual(await p.evaluate(()=>globalThis.keyboardPromptReview.counts),{reads:2,draftReads:0,inputs:0,sends:0});
  assert.equal(await p.evaluate(()=>{const r=globalThis.keyboardPromptReview;return r.value.get.call(r.target);}),draft);
  await p.keyboard.press('Escape');
  await p.evaluate(()=>globalThis.keyboardPromptReview.target.dispatchEvent(
   new CompositionEvent('compositionend',{bubbles:true,data:'已明确结束的中文输入'})));
  await p.keyboard.press('Enter');await eventually(async()=>!await append.isDisabled());
  assert.equal(await preview.inputValue(),body);assert.equal(await before.inputValue(),draft);
  await append.focus();await p.keyboard.press('Enter');
  await eventually(async()=>/完整正文已写入/.test(await review.getByRole('status').textContent()));
  assert.equal(await p.evaluate(()=>{const r=globalThis.keyboardPromptReview;return r.value.get.call(r.target);}),draft+'\n'+body);
  assert.deepEqual(await p.evaluate(()=>globalThis.keyboardPromptReview.counts),{reads:4,draftReads:3,inputs:1,sends:0});
  assert.equal(await preview.inputValue(),'');assert.equal(await before.inputValue(),'');
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(()=>document.activeElement===globalThis.keyboardPromptReview.trigger),true);
  assert.equal(await p.locator('#keyboard-review-send').isEnabled(),true);assert.deepEqual(await copied(p),[]);
  await p.evaluate(()=>{const r=globalThis.keyboardPromptReview;r.review.dispose();Object.defineProperty(r.prototype,'value',r.value);r.surface.remove();});
  const templates=await rpc(p,'PAIA_PROMPT_PAGE');assert.equal(templates.total,1);assert.equal(templates.items[0].text,body);
  assert.deepEqual((await h.state()).records,original.records);assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});


test('CPV1-09 P2 two archive tabs preserve current templates and drafts across native target replacement',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);await clipboardOracle(p);
  const c=conversation('prompt-multitab-original');
  c.messages=c.messages.slice(0,1);
  c.messages[0].text='完整历史人工 Source 中文 🧑🏽‍💻 é\n'+'原文、代码、空白与否定均不得改写 '.repeat(1000)+'\n最后否定：不得自动发送。';
  await h.open(c);await eventually(async()=>(await h.state()).library.blocks.length===1);
  const original=await h.state(),body='完整共享模板 中文 🧑🏽‍💻 é\n'+'必须保留整段内容与换行 '.repeat(1000)+'\n不得发送。',
   currentBody=body+'\n第二个标签中明确保存的完整版本。',
   firstDraft='第一个标签的完整现有草稿\n'+'不得跨标签改写 '.repeat(1000),
   secondDraft='第二个标签的完整现有草稿\n'+'不得覆盖新输入框 '.repeat(1000),
   replacementDraft='页面替换后的完整新草稿\n'+'不能隐式重新绑定或发送 '.repeat(1000);
  const saved=await rpc(p,'PAIA_PROMPT_CREATE',{template:{id:'multitab-current-template',text:body,pinned:true,sourceRefs:[]}});
  const q=await h.context.newPage();q.on('pageerror',error=>h.errors.push(error.message));
  await q.goto(p.url());await q.locator('#prompt-open').waitFor({state:'visible'});await clipboardOracle(q);
  const install=async(page,draft)=>page.evaluate(async({saved,draft})=>{
   const {createPromptInsertionReview}=await import('./prompt-insertion-review.js');
   const surface=document.createElement('section'),form=document.createElement('form'),
    target=document.createElement('textarea'),trigger=document.createElement('button'),send=document.createElement('button');
   surface.id='multitab-review-fixture';
   surface.style.cssText='position:fixed;bottom:12px;left:12px;width:480px;max-width:calc(100vw - 24px);padding:12px;z-index:2147483647;background:white;';
   target.id='multitab-review-target';target.value=draft;
   trigger.id='multitab-review-trigger';trigger.type='button';trigger.textContent='Review current template';
   send.id='multitab-review-send';send.type='submit';send.textContent='Send';
   form.append(target,send);surface.append(form,trigger);document.body.append(surface);
   const counts={reads:0,inputs:0,sends:0},tracked=[];
   const observe=field=>{
    field.addEventListener('input',()=>counts.inputs++);
    const nativeAdd=field.addEventListener.bind(field),nativeRemove=field.removeEventListener.bind(field),listeners=new Map();
    const owned=new Set(['input','beforeinput','compositionstart','compositionend','focus','blur']);
    field.addEventListener=(type,listener,options)=>{
     if(owned.has(type)){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(listener);}
     return nativeAdd(type,listener,options);
    };
    field.removeEventListener=(type,listener,options)=>{listeners.get(type)?.delete(listener);return nativeRemove(type,listener,options);};
    tracked.push({field,listeners});return field;
   };
   observe(target);form.addEventListener('submit',event=>{event.preventDefault();counts.sends++;});
   send.addEventListener('click',()=>counts.sends++);
   const readTemplate=async selection=>{
    counts.reads++;const row=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_READ',...selection});
    if(!row.ok)throw {code:row.error};return row.data;
   };
   const state={target,trigger,send,surface,counts,tracked,observe,readTemplate,createPromptInsertionReview,review:null};
   state.review=createPromptInsertionReview({target,trigger,selection:{id:saved.id,expectedRevision:saved.revision},readTemplate});
   trigger.addEventListener('click',event=>void state.review.open(event));
   globalThis.multitabPromptReview=state;
  },{saved,draft});
  await install(p,firstDraft);await install(q,secondDraft);
  const dialog=page=>page.locator('.prompt-insertion-review[open]');
  const append=page=>dialog(page).getByRole('button',{name:'追加到当前草稿',exact:true});
  const active=page=>page.evaluate(()=>globalThis.multitabPromptReview.tracked.reduce(
   (sum,row)=>sum+[...row.listeners.values()].reduce((n,set)=>n+set.size,0),0));
  const counts=page=>page.evaluate(()=>({...globalThis.multitabPromptReview.counts}));
  for(const page of [p,q]){
   assert.equal(await active(page),6,'one constant target tracker; no tracker per preview');
   await page.locator('#multitab-review-trigger').click();await eventually(async()=>!await append(page).isDisabled());
   assert.equal(await dialog(page).locator('textarea[aria-label="完整模板正文"]').inputValue(),body);
  }
  assert.equal(await dialog(p).locator('textarea[aria-label="当前草稿全文"]').inputValue(),firstDraft);
  assert.equal(await dialog(q).locator('textarea[aria-label="当前草稿全文"]').inputValue(),secondDraft);
  // The second actual extension tab edits shared canonical IndexedDB through the
  // trusted worker. A held preview in the first tab cannot apply that old row.
  await q.keyboard.press('Escape');
  assert.equal(await dialog(q).count(),0);assert.equal(await active(q),6);
  const edited=await rpc(q,'PAIA_PROMPT_EDIT',{id:saved.id,change:{expectedRevision:saved.revision,text:currentBody}});
  assert.equal(edited.revision,saved.revision+1);
  assert.equal((await rpc(p,'PAIA_PROMPT_READ',{id:saved.id,expectedRevision:edited.revision})).text,currentBody);
  assert.equal(await dialog(p).locator('textarea[aria-label="完整模板正文"]').inputValue(),body);
  await append(p).click();await eventually(async()=>/模板已更新/.test(await dialog(p).getByRole('status').textContent()));
  assert.equal(await p.locator('#multitab-review-target').inputValue(),firstDraft);
  assert.deepEqual(await counts(p),{reads:2,inputs:0,sends:0});
  assert.deepEqual(await counts(q),{reads:1,inputs:0,sends:0});
  await p.keyboard.press('Escape');
  for(const page of [p,q])for(const value of await page.locator('.prompt-insertion-review textarea').evaluateAll(nodes=>nodes.map(n=>n.value)))assert.equal(value,'');
  // Only an explicit fresh review may select the edited template. It still owns
  // the originally reviewed native field, even after the page replaces that field.
  await q.evaluate(edited=>{
   const s=globalThis.multitabPromptReview;s.review.dispose();
   s.review=s.createPromptInsertionReview({target:s.target,trigger:s.trigger,
    selection:{id:edited.id,expectedRevision:edited.revision},readTemplate:s.readTemplate});
  },edited);
  assert.equal(await active(q),6);
  await q.locator('#multitab-review-trigger').click();await eventually(async()=>!await append(q).isDisabled());
  assert.equal(await dialog(q).locator('textarea[aria-label="完整模板正文"]').inputValue(),currentBody);
  await q.evaluate(replacementDraft=>{
   const s=globalThis.multitabPromptReview,replacement=document.createElement('textarea');
   replacement.id=s.target.id;replacement.value=replacementDraft;s.observe(replacement);
   s.target.replaceWith(replacement);s.replacement=replacement;
  },replacementDraft);
  await append(q).click();await eventually(async()=>/输入框当前不可用/.test(await dialog(q).getByRole('status').textContent()));
  assert.equal(await q.locator('#multitab-review-target').inputValue(),replacementDraft);
  assert.equal(await q.evaluate(()=>globalThis.multitabPromptReview.target.value),secondDraft);
  assert.equal(await p.locator('#multitab-review-target').inputValue(),firstDraft);
  assert.deepEqual(await counts(q),{reads:3,inputs:0,sends:0});
  // Drift refuses insertion; explicit full manual copy remains independently
  // authorized against the current saved revision, with no provider action.
  await dialog(q).getByRole('button',{name:'复制完整正文',exact:true}).click();
  await eventually(async()=>(await copied(q)).length===1);
  assert.deepEqual(await copied(q),[currentBody]);assert.deepEqual(await copied(p),[]);
  assert.deepEqual(await counts(q),{reads:4,inputs:0,sends:0});
  await q.keyboard.press('Escape');
  await q.evaluate(edited=>{
   const s=globalThis.multitabPromptReview;s.review.dispose();s.target=s.replacement;
   s.review=s.createPromptInsertionReview({target:s.target,trigger:s.trigger,
    selection:{id:edited.id,expectedRevision:edited.revision},readTemplate:s.readTemplate});
  },edited);
  assert.equal(await active(q),6,'old detached target tracker removed before explicit rebind');
  await q.locator('#multitab-review-trigger').click();await eventually(async()=>!await append(q).isDisabled());
  assert.equal(await dialog(q).locator('textarea[aria-label="当前草稿全文"]').inputValue(),replacementDraft);
  await append(q).click();await eventually(async()=>/完整正文已写入/.test(await dialog(q).getByRole('status').textContent()));
  assert.equal(await q.locator('#multitab-review-target').inputValue(),replacementDraft+'\n'+currentBody);
  assert.equal(await p.locator('#multitab-review-target').inputValue(),firstDraft);
  assert.deepEqual(await counts(q),{reads:6,inputs:1,sends:0});
  assert.deepEqual(await counts(p),{reads:2,inputs:0,sends:0});
  assert.deepEqual(await copied(q),[currentBody]);assert.deepEqual(await copied(p),[]);
  for(const page of [p,q]){
   assert.equal(await page.locator('#multitab-review-send').isEnabled(),true);
   if(await dialog(page).count())await page.keyboard.press('Escape');
   for(const value of await page.locator('.prompt-insertion-review textarea').evaluateAll(nodes=>nodes.map(n=>n.value)))assert.equal(value,'');
   const before=await counts(page);
   await page.evaluate(()=>globalThis.multitabPromptReview.review.dispose());
   assert.equal(await active(page),0,'dispose removes every owned tracker on all historical targets');
   await page.locator('#multitab-review-trigger').click();
   assert.equal(await dialog(page).count(),0);assert.deepEqual(await counts(page),before);
   await page.evaluate(()=>globalThis.multitabPromptReview.surface.remove());
  }
  const templates=await rpc(p,'PAIA_PROMPT_PAGE');assert.equal(templates.total,1);
  assert.equal(templates.items[0].text,currentBody);assert.equal(templates.items[0].revision,edited.revision);
  assert.deepEqual((await h.state()).records,original.records);assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-10 inactive local MyWrite uses actual Chrome IndexedDB across two clients and a complete restart',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);const fixture=conversation('mywrite-local-preserve',1000);
  const captured=await h.open(fixture);await h.ready(captured);
  await eventually(async()=>(await h.state()).library.blocks.length===fixture.messages.length,'all three source identities finish projecting before the draft proof');
  assert.deepEqual((await h.state()).records.map(r=>r.originalText),fixture.messages.map(m=>m.text));
  assert.deepEqual((await h.state()).records.map(r=>r.sourceMessageId),fixture.messages.map(m=>m.id));
  const original=await h.state();
  const q=await h.context.newPage();await q.goto(p.url());await q.waitForSelector('#prompt-open');
  const full=Array.from({length:1000},(_,i)=>'移动想法第'+i+'段🧭：保留全文和否定词，不要概括。\n').join('')+'尾部：绝对不要自动发送。';
  for(const page of [p,q])await page.evaluate(async ()=>{
   const {MyWriteDraftStore}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
   globalThis.myWriteClock=1720000000000;
   globalThis.myWriteLocal=new MyWriteDraftStore({
    name:'paia-mywrite-chrome-v1',clock:()=>globalThis.myWriteClock
   });
  });
  const first=await p.evaluate(async text=>myWriteLocal.save({
   id:'draft:mobile',expectedRevision:0,text,topicId:null,operationId:'save:first'
  }),full);
  assert.equal(first.text,full);assert.equal(first.revision,1);assert.equal(first.createdAt,1720000000000);
  assert.deepEqual(await q.evaluate(()=>myWriteLocal.read('draft:mobile')),first);
  const changed=full+'\n另一会话完整更正，绝对不要截掉尾部。';
  const second=await q.evaluate(async text=>{
   myWriteClock=1720000000100;
   return myWriteLocal.save({id:'draft:mobile',expectedRevision:1,text,
    topicId:'topic:optional',operationId:'save:second'});
  },changed);
  assert.equal(second.text,changed);assert.equal(second.createdAt,first.createdAt);
  assert.equal(second.updatedAt,1720000000100);assert.equal(second.revision,2);
  const stale=await p.evaluate(async text=>{
   try{await myWriteLocal.save({id:'draft:mobile',expectedRevision:1,text,
    topicId:null,operationId:'save:stale'});return 'UNEXPECTED_SUCCESS';}
   catch(error){return {code:error.code,message:error.message};}
  },full+'\n第一个会话未提交的正文。');
  assert.deepEqual(stale,{code:'MYWRITE_CONFLICT',message:'MYWRITE_CONFLICT'});
  assert.deepEqual(await p.evaluate(()=>myWriteLocal.read('draft:mobile')),second);
  assert.deepEqual(await q.evaluate(async text=>myWriteLocal.save({
   id:'draft:mobile',expectedRevision:1,text,topicId:'topic:optional',operationId:'save:second'
  }),changed),second,'exact committed retry never adds a third revision');
  await p.evaluate(()=>myWriteLocal.close());await q.evaluate(()=>myWriteLocal.close());
  await h.restartWorker();await p.reload();await p.waitForSelector('#prompt-open');
  const recovered=await p.evaluate(async ()=>{
   const {MyWriteDraftStore}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
   globalThis.myWriteLocal=new MyWriteDraftStore({name:'paia-mywrite-chrome-v1'});
   return myWriteLocal.read('draft:mobile');
  });
  assert.deepEqual(recovered,second,'real IndexedDB retains complete local work after both clients close, worker restart and page reload');
  const review=await p.evaluate(()=>myWriteLocal.review('draft:mobile',2));
  assert.equal(review.text,changed);assert.equal(review.authorRole,'human');assert.equal(review.origin,'mywrite');
  assert.equal(review.createdAt,first.createdAt);assert.equal(review.topicId,'topic:optional');
  assert.deepEqual(await p.evaluate(()=>myWriteLocal.read('draft:mobile')),second);
  const tombstone=await p.evaluate(()=>myWriteLocal.remove({
   id:'draft:mobile',expectedRevision:2,operationId:'delete:explicit'
  }));
  assert.equal(tombstone.revision,3);assert.equal(tombstone.lifecycle,'deleted');
  assert.equal(tombstone.text,null);assert.equal(tombstone.topicId,null);
  const denied=await p.evaluate(async text=>{
   try{await myWriteLocal.save({id:'draft:mobile',expectedRevision:2,text,
    topicId:null,operationId:'save:old-device'});return 'UNEXPECTED_SUCCESS';}
   catch(error){return {code:error.code,message:error.message};}
  },full);
  assert.deepEqual(denied,{code:'MYWRITE_DELETED',message:'MYWRITE_DELETED'});
  assert.deepEqual(await p.evaluate(()=>myWriteLocal.read('draft:mobile')),tombstone);
  await p.evaluate(()=>myWriteLocal.close());
  assert.deepEqual((await h.state()).records,original.records);
  assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-10 inactive MyWrite composer preserves complete typing, explicit persistence, conflict and delayed recovery',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);const fixture=conversation('mywrite-composer-source',1100);
  const captured=await h.open(fixture);await h.ready(captured);
  await eventually(async()=>(await h.state()).library.blocks.length===fixture.messages.length);
  const original=await h.state();
  const q=await h.context.newPage();await q.goto(p.url());await q.waitForSelector('#prompt-open');
  const full=Array.from({length:1000},(_,i)=>'写作第'+i+'段🧭：保留原文、空白和否定词，不要概括。\n').join('')+'尾部：绝对不要自动发送。';
  async function mount(page,{hold=false}={}){
   await page.evaluate(async hold=>{
    const {MyWriteDraftStore,MyWriteDraftError}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
    const {createMyWriteComposer}=await import(chrome.runtime.getURL('ui/mywrite-composer.js'));
    globalThis.composerError=MyWriteDraftError;
    globalThis.composerStore=new MyWriteDraftStore({name:'paia-mywrite-composer-v1',clock:()=>1720000000000});
    globalThis.originalComposerRead=composerStore.read.bind(composerStore);
    if(hold)composerStore.read=async id=>{const row=await originalComposerRead(id);await new Promise(resolve=>globalThis.releaseComposerRead=resolve);return row;};
    globalThis.composer=createMyWriteComposer({document,store:composerStore,draftId:'draft:composer',
     topics:[{id:'topic:optional',label:'我的 Topic'}]});
    composer.element.id='mywrite-fixture';
    composer.element.style.cssText+=';position:fixed;inset:16px;overflow:auto;z-index:2147483647';
    document.body.append(composer.element);
    if(!hold)await composer.ready;
   },hold);
  }
  await mount(p);
  const editor=page=>page.getByRole('textbox',{name:'草稿正文',exact:true});
  const save=page=>page.getByRole('button',{name:'保存本地草稿',exact:true});
  const preview=page=>page.getByRole('textbox',{name:'完整草稿正文',exact:true});
  const status=page=>page.locator('#mywrite-fixture [role=status]');
  const review=page=>page.getByRole('button',{name:'查看完整草稿',exact:true});
  assert.equal(await editor(p).inputValue(),'');assert.equal(await save(p).isDisabled(),true);
  assert.equal(await p.evaluate(()=>composer.getDraftReference()),null);
  await editor(p).fill(full);await p.getByRole('combobox',{name:'草稿 Topic'}).selectOption('topic:optional');
  assert.equal(await editor(p).inputValue(),full);assert.equal(await review(p).isDisabled(),true);
  assert.equal(await p.evaluate(()=>composerStore.read('draft:composer')),null,'typing alone has no Source or persistence effect');
  await p.evaluate(()=>document.querySelector('#mywrite-fixture button').click());
  assert.equal(await p.evaluate(()=>composerStore.read('draft:composer')),null,'scripted activation cannot save');
  await save(p).focus();await p.keyboard.press('Enter');await eventually(async()=>await status(p).textContent()==='本地草稿已保存。');
  const first=await p.evaluate(()=>composerStore.read('draft:composer'));
  assert.equal(first.text,full);assert.equal(first.revision,1);assert.equal(first.createdAt,1720000000000);
  assert.equal(first.topicId,'topic:optional');
  assert.deepEqual(await p.evaluate(()=>composer.getDraftReference()),{id:first.id,revision:first.revision});await review(p).click();
  await eventually(async()=>await preview(p).isVisible());
  assert.equal(await preview(p).inputValue(),full);assert.equal(await preview(p).getAttribute('readonly'),'');
  assert.match(await status(p).textContent(),/2024-07-03T09:46:40.000Z/);
  await p.getByRole('button',{name:'关闭预览',exact:true}).click();
  assert.equal(await preview(p).isVisible(),false);
  assert.equal(await p.locator('#mywrite-fixture [aria-label="完整草稿正文"]').inputValue(),'');
  const amended=full+'\n更正全文；保留尾部，不要截断。';
  await editor(p).fill(amended);
  // Inject quota at the actual native object-store put. Production transaction
  // abort and classification remain in use, with complete baseline retained.
  await p.evaluate(()=>{
   globalThis.originalComposerPut=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(...args){
    IDBObjectStore.prototype.put=originalComposerPut;
    throw new DOMException('PRIVATE_QUOTA_CANARY','QuotaExceededError');
   };
  });
  await save(p).click();await eventually(async()=>/本地空间不足/.test(await status(p).textContent()));
  assert.equal(await editor(p).inputValue(),amended);assert.deepEqual(await p.evaluate(()=>composerStore.read('draft:composer')),first);
  assert.equal(await save(p).isDisabled(),false);assert.doesNotMatch(await status(p).textContent(),/PRIVATE_/);
  // Commit the actual full transaction, then lose its acknowledgement once.
  await p.evaluate(()=>{
   globalThis.originalComposerSave=composerStore.save.bind(composerStore);
   composerStore.save=async command=>{const row=await originalComposerSave(command);
    composerStore.save=originalComposerSave;throw new composerError('MYWRITE_UNAVAILABLE');};
  });
  await save(p).click();await eventually(async()=>/暂不可用/.test(await status(p).textContent()));
  const committed=await p.evaluate(()=>composerStore.read('draft:composer'));
  assert.equal(committed.text,amended);assert.equal(committed.revision,2);
  assert.equal(await editor(p).inputValue(),amended);
  await save(p).click();await eventually(async()=>await status(p).textContent()==='本地草稿已保存。');
  assert.deepEqual(await p.evaluate(()=>composerStore.read('draft:composer')),committed,'exact lost acknowledgement retry adds no version');

  await mount(q);assert.equal(await editor(q).inputValue(),amended);
  const other=amended+'\n另一窗口完成的更正。';
  await editor(q).fill(other);await save(q).click();
  await eventually(async()=>await status(q).textContent()==='本地草稿已保存。');
  const second=await q.evaluate(()=>composerStore.read('draft:composer'));
  assert.equal(second.text,other);assert.equal(second.revision,3);assert.equal(second.createdAt,first.createdAt);
  const unsaved=amended+'\n第一个窗口未提交的完整正文。';
  await editor(p).fill(unsaved);await save(p).click();
  await eventually(async()=>/另一窗口/.test(await status(p).textContent()));
  assert.equal(await editor(p).inputValue(),unsaved);assert.equal(await save(p).isDisabled(),true);
  assert.equal(await review(p).isDisabled(),true);assert.deepEqual(await p.evaluate(()=>composerStore.read('draft:composer')),second);
  await p.getByRole('button',{name:'保留正文并另存新草稿',exact:true}).click();
  await eventually(async()=>await status(p).textContent()==='本地草稿已保存。');
  const all=await p.evaluate(async ()=>{
   const db=await composerStore.open();return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readonly'),request=tx.objectStore('drafts').getAll();let rows;
    request.onsuccess=()=>{rows=request.result;};tx.oncomplete=()=>resolve(rows);tx.onabort=()=>reject(Error('read refused'));
   });
  });
  assert.equal(all.length,2);const forked=all.find(row=>row.id!=='draft:composer');
  assert.equal(forked.text,unsaved);assert.equal(forked.revision,1);assert.equal(forked.topicId,'topic:optional');
  assert.deepEqual(all.find(row=>row.id==='draft:composer'),second);
  await review(p).click();await eventually(async()=>await preview(p).isVisible());
  assert.equal(await preview(p).inputValue(),unsaved);
  assert.deepEqual(await p.evaluate(()=>composer.getDraftReference()),{id:forked.id,revision:forked.revision});
  await p.getByRole('button',{name:'关闭预览',exact:true}).click();
  await p.evaluate(()=>{const real=composerStore.review.bind(composerStore);composerStore.review=async(...args)=>{
   const row=await real(...args);await new Promise(resolve=>globalThis.releaseComposerReview=resolve);return row;
  };});
  await review(p).click();await eventually(async()=>await p.evaluate(()=>typeof releaseComposerReview==='function'));
  await p.evaluate(()=>{composer.dispose();releaseComposerReview();composerStore.close();});
  assert.equal(await p.evaluate(()=>composer.getDraftReference()),null);
  assert.equal(await p.locator('#mywrite-fixture').count(),0);

  await q.evaluate(()=>{composer.dispose();composerStore.close();});
  await h.restartWorker();await q.reload();await q.waitForSelector('#prompt-open');
  await mount(q,{hold:true});
  await eventually(async()=>await q.evaluate(()=>typeof releaseComposerRead==='function'));
  const duringRead=full+'\n恢复尚未完成时，新键入的全文。';
  await editor(q).fill(duringRead);
  await q.evaluate(async()=>{releaseComposerRead();await composer.ready;});
  assert.equal(await editor(q).inputValue(),duringRead,'a delayed recovery cannot replace new typing');
  assert.equal(await save(q).isDisabled(),true);assert.match(await status(q).textContent(),/未被替换/);
  assert.deepEqual(await q.evaluate(()=>originalComposerRead('draft:composer')),second);
  await q.evaluate(()=>{composer.dispose();composerStore.close();});
  assert.equal(await q.locator('#mywrite-fixture').count(),0);
  assert.deepEqual((await h.state()).records,original.records);assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});


test('CPV1-10 MyWrite changed typing resolves committed lost acknowledgements without replay or overwriting another client',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);const fixture=conversation('mywrite-ack-continuity',1200);
  const captured=await h.open(fixture);await h.ready(captured);
  await eventually(async()=>(await h.state()).library.blocks.length===fixture.messages.length);
  const original=await h.state();
  const q=await h.context.newPage();await q.goto(p.url());await q.waitForSelector('#prompt-open');
  const full=Array.from({length:1000},(_,i)=>'回执第'+i+'段🧭：保留全文，不要替换新的输入。\n').join('')+'完整尾部，绝对不要自动发送。';
  for(const page of [p,q])await page.evaluate(async()=>{
   const {MyWriteDraftStore,MyWriteDraftError}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
   globalThis.ackError=MyWriteDraftError;
   globalThis.ackStore=new MyWriteDraftStore({name:'paia-mywrite-ack-continuity-v1',clock:()=>1720000000000});
   globalThis.actualAckSave=ackStore.save.bind(ackStore);
   globalThis.actualAckRead=ackStore.read.bind(ackStore);
  });
  await p.evaluate(async()=>{
   const {createMyWriteComposer}=await import(chrome.runtime.getURL('ui/mywrite-composer.js'));
   globalThis.ackComposer=createMyWriteComposer({document,store:ackStore,draftId:'draft:continuity',
    topics:[{id:'topic:optional',label:'我的 Topic'}]});
   ackComposer.element.id='mywrite-ack-fixture';
   ackComposer.element.style.cssText+=';position:fixed;inset:16px;overflow:auto;z-index:2147483647';
   document.body.append(ackComposer.element);await ackComposer.ready;
  });
  const editor=p.getByRole('textbox',{name:'草稿正文',exact:true});
  const save=p.getByRole('button',{name:'保存本地草稿',exact:true});
  const status=p.locator('#mywrite-ack-fixture [role=status]');
  const read=()=>p.evaluate(()=>actualAckRead('draft:continuity'));
  const saved=()=>eventually(async()=>await status.textContent()==='本地草稿已保存。');
  await editor.fill(full);
  // Commit real IndexedDB first and hold only its acknowledgement. More
  // trusted typing must survive the late result while the baseline advances.
  await p.evaluate(()=>{
   ackStore.save=async command=>{
    const row=await actualAckSave(command);
    await new Promise(resolve=>globalThis.releaseAckSave=resolve);
    ackStore.save=actualAckSave;return row;
   };
  });
  await save.click();await eventually(async()=>await p.evaluate(()=>typeof releaseAckSave==='function'));
  const changed=full+'\n首次回执未到时的新正文。';
  await editor.fill(changed);await p.evaluate(()=>releaseAckSave());
  await eventually(async()=>/当前更改尚未保存/.test(await status.textContent()));
  assert.equal(await editor.inputValue(),changed);assert.equal((await read()).text,full);
  assert.equal((await read()).revision,1);assert.equal(await save.isDisabled(),false);
  await p.evaluate(()=>{
   ackStore.save=async command=>{await actualAckSave(command);
    ackStore.save=actualAckSave;throw new ackError('MYWRITE_UNAVAILABLE');};
  });
  await save.click();await eventually(async()=>/暂不可用/.test(await status.textContent()));
  const committed=await read();assert.equal(committed.text,changed);assert.equal(committed.revision,2);
  const clickBody=full+'\n回执丢失后继续编辑的完整正文。';
  const laterBody=clickBody+'\n核对回执期间又键入的尾部。';
  await editor.fill(clickBody);
  await p.getByRole('combobox',{name:'草稿 Topic'}).selectOption('topic:optional');
  await p.evaluate(()=>{
   ackStore.read=async id=>{const row=await actualAckRead(id);
    await new Promise(resolve=>globalThis.releaseAckRead=resolve);
    ackStore.read=actualAckRead;return row;
   };
  });
  await save.click();await eventually(async()=>await p.evaluate(()=>typeof releaseAckRead==='function'));
  assert.equal(await save.isDisabled(),true);
  await editor.fill(laterBody);await p.evaluate(()=>releaseAckRead());
  await eventually(async()=>/当前更改尚未保存/.test(await status.textContent()));
  const reconciled=await read();
  assert.equal(reconciled.revision,3,'one new revision after actual readback; old body is never replayed');
  assert.equal(reconciled.text,clickBody);assert.equal(reconciled.topicId,'topic:optional');
  assert.equal(reconciled.createdAt,committed.createdAt);
  assert.equal(await editor.inputValue(),laterBody);
  assert.deepEqual(await p.evaluate(()=>ackComposer.getDraftReference()),{id:committed.id,revision:3});
  await save.click();await saved();const current=await read();
  assert.equal(current.text,laterBody);assert.equal(current.revision,4);
  // An actual put abort is not a committed lost ACK. Changed typing saves
  // directly from the unchanged baseline without writing the aborted body.
  const aborted=full+'\n这一次完整正文遇到空间不足。';
  await editor.fill(aborted);await p.evaluate(()=>{
   const real=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(...args){
    IDBObjectStore.prototype.put=real;
    throw new DOMException('PRIVATE_ABORTED_ACK','QuotaExceededError');
   };
  });
  await save.click();await eventually(async()=>/本地空间不足/.test(await status.textContent()));
  assert.deepEqual(await read(),current);
  const afterAbort=full+'\n空间恢复后重新更正的完整正文。';
  await editor.fill(afterAbort);await save.click();await saved();
  const fifth=await read();assert.equal(fifth.revision,5);assert.equal(fifth.text,afterAbort);
  assert.equal(fifth.createdAt,current.createdAt);assert.equal(fifth.topicId,'topic:optional');
  // A second actual connection changes the authority after a committed lost
  // ACK. Readback must block the old client rather than adopt that other work.
  const uncertainBody=full+'\n再次丢失回执时保存的全文。';
  await editor.fill(uncertainBody);await p.evaluate(()=>{
   ackStore.save=async command=>{await actualAckSave(command);
    ackStore.save=actualAckSave;throw new ackError('MYWRITE_UNAVAILABLE');};
  });
  await save.click();await eventually(async()=>/暂不可用/.test(await status.textContent()));
  assert.equal((await read()).revision,6);assert.equal((await read()).text,uncertainBody);
  const otherBody=full+'\n另一窗口当前已经完成的全文。';
  const other=await q.evaluate(async text=>actualAckSave({
   id:'draft:continuity',expectedRevision:6,text,topicId:null,operationId:'save:other-window'
  }),otherBody);
  const unsaved=full+'\n本窗口回执未确认后的完整未保存工作。';
  await editor.fill(unsaved);await save.click();
  await eventually(async()=>/另一窗口/.test(await status.textContent()));
  assert.equal(await editor.inputValue(),unsaved);assert.equal(await save.isDisabled(),true);
  assert.equal(await p.getByRole('button',{name:'查看完整草稿',exact:true}).isDisabled(),true);
  assert.deepEqual(await read(),other);assert.equal(other.revision,7);assert.equal(other.text,otherBody);
  assert.doesNotMatch(await status.textContent(),/PRIVATE_/);
  await p.evaluate(()=>{ackComposer.dispose();ackStore.close();});await q.evaluate(()=>ackStore.close());
  assert.equal(await p.locator('#mywrite-ack-fixture').count(),0);
  assert.deepEqual((await h.state()).records,original.records);
  assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-10 explicit metadata discovery protects unsaved work and recovers full drafts after a real restart',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);const fixture=conversation('mywrite-discovery-source',1300);
  const captured=await h.open(fixture);await h.ready(captured);
  await eventually(async()=>(await h.state()).library.blocks.length===fixture.messages.length);
  const original=await h.state();
  const q=await h.context.newPage();await q.goto(p.url());await q.waitForSelector('#prompt-open');
  const full=Array.from({length:1000},(_,i)=>'找回草稿第'+i+'段🧭：保留完整原文、空白和否定词，不要概括。\n').join('')+'尾部：绝对不要自动发送。';
  const saved=await p.evaluate(async text=>{
   const {MyWriteDraftStore}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
   globalThis.recoveryStore=new MyWriteDraftStore({name:'paia-mywrite-recovery-chrome-v1',clock:()=>1720000000000});
   const rows=[];
   for(let i=0;i<43;i++)rows.push(await recoveryStore.save({
    id:'draft:'+String(i).padStart(3,'0'),expectedRevision:0,text:text+'\nPRIVATE_RECOVERY_BODY_'+i,
    topicId:i%2?'topic:optional':null,operationId:'save:seed:'+i
   }));
   await recoveryStore.remove({id:'draft:011',expectedRevision:1,operationId:'delete:seed'});
   return rows;
  },full);
  await q.evaluate(async()=>{
   const {MyWriteDraftStore}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
   globalThis.recoveryStore=new MyWriteDraftStore({name:'paia-mywrite-recovery-chrome-v1',clock:()=>1720000009000});
  });
  async function mount(){
   await p.evaluate(async()=>{
    const {createMyWriteComposer}=await import(chrome.runtime.getURL('ui/mywrite-composer.js'));
    const {createMyWriteRecovery}=await import(chrome.runtime.getURL('ui/mywrite-recovery.js'));
    globalThis.makeRecoveryComposer=createMyWriteComposer;globalThis.makeRecovery=createMyWriteRecovery;
    const container=document.createElement('div');container.id='draft-recovery-fixture';
    // The detached owner has its own bounded scroll surface. Archive's fixed
    // sidebar must not intercept natural pointer pagination or composer input.
    container.style.cssText='position:fixed;inset:16px;overflow:auto;z-index:2147483646;background:#fff';
    document.body.append(container);
    const topics=[{id:'topic:optional',label:'保留全文'},{id:'topic:new',label:'当前更正'}];
    globalThis.recoveryComposer=createMyWriteComposer({document,store:recoveryStore,draftId:'draft:active',topics});
    container.append(recoveryComposer.element);await recoveryComposer.ready;
    globalThis.recoverySelections=[];globalThis.recoveryListCalls=0;
    globalThis.actualRecoveryList=recoveryStore.list.bind(recoveryStore);
    recoveryStore.list=options=>{recoveryListCalls++;return actualRecoveryList(options);};
    globalThis.recoveryPicker=createMyWriteRecovery({document,store:recoveryStore,topics,onChoose:async reference=>{
     recoverySelections.push(reference);
     if(!recoveryComposer.canReplace())return false;
     recoveryComposer.dispose();
     recoveryComposer=createMyWriteComposer({document,store:recoveryStore,draftId:reference.id,topics});
     container.prepend(recoveryComposer.element);await recoveryComposer.ready;return true;
    }});
    container.append(recoveryPicker.element);
   });
  }
  await mount();
  const picker=()=>p.locator('#draft-recovery-fixture .mywrite-recovery');
  const status=()=>picker().getByRole('status');
  const rows=()=>picker().getByRole('list',{name:'已保存草稿'}).getByRole('button');
  const find=()=>picker().getByRole('button',{name:'查找本地草稿',exact:true});
  const more=()=>picker().getByRole('button',{name:'更多本地草稿',exact:true});
  const editor=()=>p.locator('#draft-recovery-fixture .mywrite-composer').getByRole('textbox',{name:'草稿正文',exact:true});
  const selections=()=>p.evaluate(()=>recoverySelections);
  await p.evaluate(()=>document.querySelector('.mywrite-recovery button').click());
  assert.equal(await p.evaluate(()=>recoveryListCalls),0);assert.equal(await rows().count(),0);
  const unsaved=full+'\nPRIVATE_UNSAVED_CURRENT';
  await editor().fill(unsaved);
  await find().focus();await p.keyboard.press('Enter');
  await eventually(async()=>await rows().count()===20&&!await rows().first().isDisabled());
  assert.equal(await p.evaluate(()=>recoveryListCalls),1);
  assert.doesNotMatch(await picker().textContent(),/PRIVATE_|不要概括|draft:|save:/);
  assert.match(await rows().first().textContent(),/2024-07-03T09:46:40.000Z/);
  await p.evaluate(()=>document.querySelector('.mywrite-recovery li button').click());
  assert.deepEqual(await selections(),[]);
  await rows().first().click();await eventually(async()=>/请先保存/.test(await status().textContent()));
  assert.equal(await editor().inputValue(),unsaved);
  assert.equal((await selections()).length,1);
  assert.deepEqual(Object.keys((await selections())[0]).sort(),['createdAt','id','revision','topicId','updatedAt']);
  assert.equal(await p.evaluate(()=>recoveryStore.read('draft:active')),null);
  await more().click();await eventually(async()=>await rows().count()===40&&!await rows().first().isDisabled());
  await more().click();await eventually(async()=>await rows().count()===42&&!await rows().first().isDisabled());
  assert.equal(await more().isVisible(),false);
  const metadata=await p.evaluate(()=>actualRecoveryList({limit:40,after:null}));
  assert.equal(metadata.items.length,40);assert.doesNotMatch(JSON.stringify(metadata),/PRIVATE_|text|lastWriteId/);
  const tail=await p.evaluate(after=>actualRecoveryList({limit:40,after}),metadata.after);
  assert.deepEqual([...metadata.items,...tail.items].map(x=>x.id),saved.filter(x=>x.id!=='draft:011').map(x=>x.id));
  const changed=full+'\nPRIVATE_OTHER_WINDOW_COMPLETE';
  const current=await q.evaluate(text=>recoveryStore.save({
   id:'draft:000',expectedRevision:1,text,topicId:'topic:new',operationId:'save:other-current'
  }),changed);
  await rows().first().click();await eventually(async()=>/更改或删除/.test(await status().textContent()));
  assert.equal((await selections()).length,1);assert.equal(await editor().inputValue(),unsaved);
  assert.deepEqual(await p.evaluate(()=>recoveryStore.read('draft:000')),current);
  await p.locator('#draft-recovery-fixture .mywrite-composer').getByRole('button',{name:'保存本地草稿',exact:true}).click();
  await eventually(async()=>await p.evaluate(()=>recoveryComposer.canReplace()));
  const active=await p.evaluate(()=>recoveryStore.read('draft:active'));assert.equal(active.text,unsaved);assert.equal(active.revision,1);
  // Refresh is explicit and observes the second client's actual current version.
  await find().click();await eventually(async()=>await rows().count()===20&&!await rows().first().isDisabled());
  await rows().first().focus();await p.keyboard.press('Enter');
  await eventually(async()=>/已恢复/.test(await status().textContent()));
  assert.equal(await editor().inputValue(),changed);
  assert.equal(await p.locator('#draft-recovery-fixture .mywrite-composer').getByRole('combobox',{name:'草稿 Topic'}).inputValue(),'topic:new');
  assert.deepEqual(await p.evaluate(()=>recoveryComposer.getDraftReference()),{id:'draft:000',revision:2});
  assert.equal((await selections()).length,2);
  assert.deepEqual(await p.evaluate(()=>recoveryStore.read('draft:active')),active);
  // A late readonly page cannot restore a disposed picker's DOM or hand off work.
  await p.evaluate(()=>{
   globalThis.lateSelectionCount=0;globalThis.lateListFinished=false;
   const heldStore={list:options=>new Promise(resolve=>{
    globalThis.finishLateList=async()=>{resolve(await actualRecoveryList(options));lateListFinished=true;};
   }),review:recoveryStore.review.bind(recoveryStore)};
   const wrapper=document.createElement('div');wrapper.id='late-recovery-fixture';
   wrapper.style.cssText='position:fixed;inset:16px;overflow:auto;z-index:2147483647;background:#fff';
   document.body.append(wrapper);
   globalThis.latePicker=makeRecovery({document,store:heldStore,onChoose:()=>{lateSelectionCount++;return true;}});
   wrapper.append(latePicker.element);
  });
  await p.locator('#late-recovery-fixture').getByRole('button',{name:'查找本地草稿'}).click();
  await p.evaluate(async()=>{latePicker.dispose();await finishLateList();});
  await eventually(async()=>await p.evaluate(()=>lateListFinished));
  assert.equal(await p.locator('#late-recovery-fixture .mywrite-recovery').count(),0);
  assert.equal(await p.evaluate(()=>lateSelectionCount),0);
  await p.evaluate(()=>{recoveryPicker.dispose();recoveryComposer.dispose();recoveryStore.close();});
  await q.evaluate(()=>recoveryStore.close());await q.close();
  await h.restartWorker();await p.reload();await p.waitForSelector('#prompt-open');
  await p.evaluate(async()=>{
   const {MyWriteDraftStore}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
   globalThis.recoveryStore=new MyWriteDraftStore({name:'paia-mywrite-recovery-chrome-v1'});
  });
  await mount();
  assert.equal(await p.evaluate(()=>recoveryListCalls),0);
  assert.equal(await editor().inputValue(),unsaved,'saved current work also survives complete client closure');
  await find().click();await eventually(async()=>await rows().count()===20&&!await rows().first().isDisabled());
  await rows().first().click();await eventually(async()=>/已恢复/.test(await status().textContent()));
  assert.equal(await editor().inputValue(),changed);
  assert.deepEqual(await p.evaluate(()=>recoveryStore.read('draft:000')),current);
  assert.deepEqual(await p.evaluate(()=>recoveryStore.read('draft:active')),active);
  assert.equal((await p.evaluate(()=>recoveryStore.read('draft:011'))).text,null);
  await p.locator('#draft-recovery-fixture .mywrite-composer').getByRole('button',{name:'查看完整草稿',exact:true}).click();
  await eventually(async()=>await p.locator('#draft-recovery-fixture').getByRole('textbox',{name:'完整草稿正文',exact:true}).isVisible());
  assert.equal(await p.locator('#draft-recovery-fixture').getByRole('textbox',{name:'完整草稿正文',exact:true}).inputValue(),changed);
  assert.match(await p.locator('#draft-recovery-fixture .mywrite-composer').getByRole('status').textContent(),/2024-07-03T09:46:40.000Z/);
  await p.evaluate(()=>{recoveryPicker.dispose();recoveryComposer.dispose();recoveryStore.close();});
  assert.deepEqual((await h.state()).records,original.records);
  assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-10 local workspace keeps complete unsaved work across new draft and reviewed recovery races',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);const fixture=conversation('mywrite-workspace-source',1400);
  const captured=await h.open(fixture);await h.ready(captured);
  await eventually(async()=>(await h.state()).library.blocks.length===fixture.messages.length);
  const original=await h.state();
  const q=await h.context.newPage();await q.goto(p.url());await q.waitForSelector('#prompt-open');
  const full=Array.from({length:1000},(_,i)=>'写作工作区第'+i+'段🧭：完整正文，不要删除否定词、空白或尾部。\n').join('')+'尾部：不要自动发送或生成 Source。';
  const retained=full+'\nPRIVATE_RETAINED_SAVED',unsaved=full+'\nPRIVATE_UNSAVED_ACTIVE';
  const changed=full+'\nPRIVATE_CHANGED_OTHER_WINDOW';
  for(const page of [p,q])await page.evaluate(async()=>{
   const {MyWriteDraftStore}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
   globalThis.workspaceStore=new MyWriteDraftStore({name:'paia-mywrite-workspace-chrome-v1',clock:()=>1720000000000});
   globalThis.actualWorkspaceRead=workspaceStore.read.bind(workspaceStore);
  });
  const saved=await p.evaluate(text=>workspaceStore.save({id:'draft:000',expectedRevision:0,text,
   topicId:'topic:optional',operationId:'save:retained'}),retained);
  const collision=await p.evaluate(async()=>{
   const {createMyWriteComposer}=await import(chrome.runtime.getURL('ui/mywrite-composer.js'));
   const probe=createMyWriteComposer({document,store:workspaceStore,draftId:'draft:000',expectedRevision:0});
   const result=await probe.ready;
   const state={result,body:probe.element.querySelector('textarea').value,reference:probe.getDraftReference()};
   probe.dispose();return state;
  });
  assert.deepEqual(collision,{result:{ok:false,code:'MYWRITE_CONFLICT'},body:'',reference:null});
  assert.deepEqual(await p.evaluate(()=>actualWorkspaceRead('draft:000')),saved);
  await p.setViewportSize({width:390,height:844});
  async function mount(){
   await p.evaluate(async()=>{
    const {createMyWriteWorkspace}=await import(chrome.runtime.getURL('ui/mywrite-workspace.js'));
    globalThis.makeWorkspace=createMyWriteWorkspace;
    globalThis.workspace=createMyWriteWorkspace({document,store:workspaceStore,draftId:'draft:active',
     topics:[{id:'topic:optional',label:'保留完整表达'},{id:'topic:changed',label:'另一窗口更正'}]});
    workspace.element.id='mywrite-workspace-fixture';
    workspace.element.style.cssText+=';position:fixed;inset:12px;width:auto;overflow:auto;z-index:2147483647;font-size:24px';
    document.body.append(workspace.element);await workspace.ready;
   });
  }
  await mount();
  const owner=()=>p.locator('#mywrite-workspace-fixture');
  const composer=()=>owner().locator('.mywrite-composer');
  const editor=()=>composer().getByRole('textbox',{name:'草稿正文',exact:true});
  const save=()=>composer().getByRole('button',{name:'保存本地草稿',exact:true});
  const create=()=>owner().getByRole('button',{name:'新建本地草稿',exact:true});
  const picker=()=>owner().locator('.mywrite-recovery');
  const find=()=>picker().getByRole('button',{name:'查找本地草稿',exact:true});
  const rows=()=>picker().getByRole('list',{name:'已保存草稿'}).getByRole('button');
  const ref=()=>p.evaluate(()=>workspace.getDraftReference());
  const currentSave=async()=>{await save().click();await eventually(async()=>await p.evaluate(()=>workspace.canReplace()));return ref();};
  await editor().fill(unsaved);
  await create().click();assert.equal(await editor().inputValue(),unsaved);assert.equal(await ref(),null);
  await find().click();await eventually(async()=>await rows().count()===1&&!await rows().first().isDisabled());
  await rows().first().click();
  await eventually(async()=>/请先保存/.test(await picker().getByRole('status').textContent()));
  assert.equal(await editor().inputValue(),unsaved);assert.equal(await ref(),null);
  const activeRef=await currentSave();assert.equal(activeRef.id,'draft:active');assert.equal(activeRef.revision,1);
  const active=await p.evaluate(()=>actualWorkspaceRead('draft:active'));assert.equal(active.text,unsaved);
  await rows().first().focus();await p.keyboard.press('Enter');
  await eventually(async()=>await editor().inputValue()===retained);
  assert.deepEqual(await ref(),{id:saved.id,revision:1});
  assert.equal(await composer().getByRole('combobox',{name:'草稿 Topic'}).inputValue(),'topic:optional');
  await p.evaluate(()=>document.querySelector('#mywrite-workspace-fixture > button').click());
  assert.deepEqual(await ref(),{id:saved.id,revision:1});assert.equal(await editor().inputValue(),retained);
  await create().click();await eventually(async()=>await editor().inputValue()===''&&await p.evaluate(()=>workspace.canReplace()));
  assert.equal(await ref(),null);
  const fresh=full+'\nPRIVATE_NEW_COMPLETE';
  await editor().fill(fresh);const freshRef=await currentSave();
  assert.notEqual(freshRef.id,saved.id);assert.notEqual(freshRef.id,activeRef.id);
  assert.equal((await p.evaluate(id=>actualWorkspaceRead(id),freshRef.id)).text,fresh);
  await find().click();await eventually(async()=>await rows().count()===3&&!await rows().first().isDisabled());
  // Let the picker review its actual saved revision, then hold only the
  // subsequent composer read. Another actual client changes it in that gap.
  await p.evaluate(()=>{
   let matchingReads=0;
   workspaceStore.read=async id=>{
    if(id==='draft:000'&&++matchingReads===2){
     await new Promise(resolve=>globalThis.resumeWorkspaceRead=resolve);
     workspaceStore.read=actualWorkspaceRead;
    }
    return actualWorkspaceRead(id);
   };
  });
  await rows().first().click();await eventually(async()=>await p.evaluate(()=>typeof resumeWorkspaceRead==='function'));
  const current=await q.evaluate(text=>workspaceStore.save({id:'draft:000',expectedRevision:1,text,
   topicId:'topic:changed',operationId:'save:other-current'}),changed);
  await p.evaluate(()=>resumeWorkspaceRead());
  await eventually(async()=>/更改或删除/.test(await picker().getByRole('status').textContent()));
  assert.equal(await editor().inputValue(),fresh);assert.deepEqual(await ref(),freshRef);
  assert.deepEqual(await p.evaluate(()=>actualWorkspaceRead('draft:000')),current);
  await find().click();await eventually(async()=>await rows().count()===3&&!await rows().first().isDisabled());
  // Even a matching read cannot erase typing in the still-live old editor.
  await p.evaluate(()=>{
   let matchingReads=0;
   workspaceStore.read=async id=>{
    const row=await actualWorkspaceRead(id);
    if(id==='draft:000'&&++matchingReads===2){
     await new Promise(resolve=>globalThis.resumeWorkspaceTyping=resolve);
     workspaceStore.read=actualWorkspaceRead;
    }
    return row;
   };
  });
  await rows().first().click();await eventually(async()=>await p.evaluate(()=>typeof resumeWorkspaceTyping==='function'));
  const newer=fresh+'\nPRIVATE_TYPED_DURING_RECOVERY';await editor().fill(newer);
  await p.evaluate(()=>resumeWorkspaceTyping());
  await eventually(async()=>/请先保存/.test(await picker().getByRole('status').textContent()));
  assert.equal(await editor().inputValue(),newer);assert.deepEqual(await ref(),freshRef);
  assert.equal((await p.evaluate(id=>actualWorkspaceRead(id),freshRef.id)).text,fresh);
  const updatedFresh=await currentSave();assert.deepEqual(updatedFresh,{id:freshRef.id,revision:2});
  assert.equal((await p.evaluate(id=>actualWorkspaceRead(id),freshRef.id)).text,newer);
  await rows().first().click();await eventually(async()=>await editor().inputValue()===changed);
  assert.deepEqual(await ref(),{id:saved.id,revision:2});
  assert.equal(await composer().getByRole('combobox',{name:'草稿 Topic'}).inputValue(),'topic:changed');
  assert.equal(await p.evaluate(()=>{
   const root=workspace.element;
   return root.scrollWidth<=root.clientWidth+1&&getComputedStyle(root.querySelector('textarea')).fontSize==='24px';
  }),true,'the complete stacked workspace fits a narrow large-text viewport without horizontal clipping');
  // A held selected body cannot recreate private DOM after owner disposal.
  await find().click();await eventually(async()=>await rows().count()===3&&!await rows().first().isDisabled());
  await p.evaluate(()=>{
   let matchingReads=0;
   workspaceStore.read=async id=>{
    const row=await actualWorkspaceRead(id);
    if(id==='draft:000'&&++matchingReads===2){
     await new Promise(resolve=>globalThis.resumeWorkspaceDispose=resolve);
     workspaceStore.read=actualWorkspaceRead;
    }
    return row;
   };
  });
  await rows().first().click();await eventually(async()=>await p.evaluate(()=>typeof resumeWorkspaceDispose==='function'));
  await p.evaluate(()=>{workspace.dispose();resumeWorkspaceDispose();});
  assert.equal(await owner().count(),0);assert.equal(await ref(),null);
  await p.evaluate(()=>workspaceStore.close());await q.evaluate(()=>workspaceStore.close());await q.close();
  await h.restartWorker();await p.reload();await p.waitForSelector('#prompt-open');
  await p.evaluate(async()=>{
   const {MyWriteDraftStore}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
   globalThis.workspaceStore=new MyWriteDraftStore({name:'paia-mywrite-workspace-chrome-v1'});
   globalThis.actualWorkspaceRead=workspaceStore.read.bind(workspaceStore);
  });
  await mount();assert.equal(await editor().inputValue(),unsaved);assert.deepEqual(await ref(),activeRef);
  await find().click();await eventually(async()=>await rows().count()===3&&!await rows().first().isDisabled());
  await rows().first().click();await eventually(async()=>await editor().inputValue()===changed);
  assert.deepEqual(await ref(),{id:saved.id,revision:2});
  assert.deepEqual(await p.evaluate(()=>actualWorkspaceRead('draft:000')),current);
  assert.deepEqual(await p.evaluate(()=>actualWorkspaceRead('draft:active')),active);
  await composer().getByRole('button',{name:'查看完整草稿',exact:true}).click();
  await eventually(async()=>composer().getByRole('textbox',{name:'完整草稿正文',exact:true}).isVisible());
  assert.equal(await composer().getByRole('textbox',{name:'完整草稿正文',exact:true}).inputValue(),changed);
  assert.match(await composer().getByRole('status').textContent(),/2024-07-03T09:46:40.000Z/);
  await p.evaluate(()=>{workspace.dispose();workspaceStore.close();});
  assert.deepEqual((await h.state()).records,original.records);
  assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-10 offline cold writing and abrupt page closure recover complete acknowledged drafts',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();let offlineSession=null;
 try{
  let p=h.archive;await enable(p);const fixture=conversation('mywrite-offline-source',1500);
  const captured=await h.open(fixture);await h.ready(captured);
  await eventually(async()=>(await h.state()).library.blocks.length===fixture.messages.length);
  const original=await h.state();await captured.close();
  const localURL=p.url();
  const full=Array.from({length:1000},(_,i)=>'离线写作第'+i+'段🧭：保留换行、空白、Unicode 和否定，不要自动发送。\n').join('')+
   '完整尾部：不要生成 Source，不要丢失最后一段。';
  const first=full+'\nPRIVATE_OFFLINE_FIRST',corrected=full+'\nPRIVATE_OFFLINE_CORRECTED';
  const resumed=full+'\nPRIVATE_OFFLINE_RESUMED';
  async function enforceOfflineTarget(){
   // The restart harness attaches/detaches a CDP session on this page.
   // Reapply genuine Chromium network emulation on the owned current target
   // after that lifecycle boundary; never replace navigator or the oracle.
   offlineSession=await h.context.newCDPSession(p);
   await offlineSession.send('Network.enable');
   await offlineSession.send('Network.emulateNetworkConditions',{
    offline:true,latency:0,downloadThroughput:0,uploadThroughput:0
   });
   assert.equal(await p.evaluate(()=>navigator.onLine),false);
  }
  await h.context.setOffline(true);
  await enforceOfflineTarget();
  assert.equal(await p.evaluate(()=>navigator.onLine),false);
  async function mount({hold=false,clock=1720000000000}={}){
   await p.evaluate(async({hold,clock})=>{
    const {MyWriteDraftStore}=await import(chrome.runtime.getURL('core/mywrite-draft.js'));
    const {createMyWriteWorkspace}=await import(chrome.runtime.getURL('ui/mywrite-workspace.js'));
    globalThis.offlineStore=new MyWriteDraftStore({name:'paia-mywrite-offline-chrome-v1',clock:()=>clock});
    globalThis.offlineRead=offlineStore.read.bind(offlineStore);
    if(hold)offlineStore.read=async id=>{
     await new Promise(resolve=>globalThis.releaseOfflineRead=resolve);
     offlineStore.read=offlineRead;return offlineRead(id);
    };
    globalThis.offlineWorkspace=createMyWriteWorkspace({document,store:offlineStore,draftId:'draft:offline',
     topics:[{id:'topic:offline',label:'离线完整想法'},{id:'topic:corrected',label:'已更正'}]});
    offlineWorkspace.element.id='mywrite-offline-fixture';
    offlineWorkspace.element.style.cssText+=';position:fixed;inset:12px;width:auto;overflow:auto;z-index:2147483647';
    document.body.append(offlineWorkspace.element);
    if(!hold)await offlineWorkspace.ready;
   },{hold,clock});
  }
  const owner=()=>p.locator('#mywrite-offline-fixture');
  const composer=()=>owner().locator('.mywrite-composer');
  const editor=()=>composer().getByRole('textbox',{name:'草稿正文',exact:true});
  const topic=()=>composer().getByRole('combobox',{name:'草稿 Topic'});
  const save=()=>composer().getByRole('button',{name:'保存本地草稿',exact:true});
  const reference=()=>p.evaluate(()=>offlineWorkspace.getDraftReference());
  const saveComplete=async()=>{
   assert.equal(await p.evaluate(()=>navigator.onLine),false);
   await save().click();await eventually(async()=>await p.evaluate(()=>offlineWorkspace.canReplace()));
   return p.evaluate(()=>offlineRead('draft:offline'));
  };
  await mount({hold:true});
  await eventually(async()=>await p.evaluate(()=>typeof releaseOfflineRead==='function'));
  // Cold start remains writable while local persistence opens; its reply
  // cannot replace trusted complete typing or invent an acknowledgement.
  await editor().fill(first);await topic().selectOption('topic:offline');
  assert.equal(await reference(),null);assert.equal(await save().isDisabled(),true);
  await p.evaluate(async()=>{releaseOfflineRead();await offlineWorkspace.ready;});
  assert.equal(await editor().inputValue(),first);
  assert.equal(await topic().inputValue(),'topic:offline');
  const savedFirst=await saveComplete();
  assert.equal(savedFirst.text,first);assert.equal(savedFirst.revision,1);
  assert.equal(savedFirst.createdAt,1720000000000);assert.equal(savedFirst.topicId,'topic:offline');
  await editor().fill(corrected);await topic().selectOption('topic:corrected');
  const savedCorrected=await saveComplete();
  assert.equal(savedCorrected.text,corrected);assert.equal(savedCorrected.revision,2);
  assert.equal(savedCorrected.createdAt,savedFirst.createdAt);
  assert.equal(savedCorrected.topicId,'topic:corrected');
  // Abruptly close the whole client without calling owner.dispose/store.close.
  // Chrome destroys that heap and connection; recovery must use committed IDB.
  await p.close();offlineSession=null;
  p=await h.context.newPage();h.archive=p;
  p.on('pageerror',error=>h.errors.push(error.message));
  await p.goto(localURL);await p.waitForSelector('#prompt-open');
  assert.equal(await p.evaluate(()=>navigator.onLine),false);
  await h.restartWorker();
  await enforceOfflineTarget();
  await mount({clock:1720000060000});
  assert.equal(await editor().inputValue(),corrected);
  assert.equal(await topic().inputValue(),'topic:corrected');
  assert.deepEqual(await reference(),{id:'draft:offline',revision:2});
  assert.deepEqual(await p.evaluate(()=>offlineRead('draft:offline')),savedCorrected);
  const picker=owner().locator('.mywrite-recovery');
  await picker.getByRole('button',{name:'查找本地草稿',exact:true}).click();
  const rows=picker.getByRole('list',{name:'已保存草稿'}).getByRole('button');
  await eventually(async()=>await rows.count()===1&&!await rows.first().isDisabled());
  assert.equal(await rows.first().textContent().then(text=>text.includes('PRIVATE_')),false);
  await editor().fill(resumed);
  const savedResumed=await saveComplete();
  assert.equal(savedResumed.text,resumed);assert.equal(savedResumed.revision,3);
  assert.equal(savedResumed.createdAt,savedFirst.createdAt);assert.equal(savedResumed.updatedAt,1720000060000);
  assert.equal(savedResumed.topicId,'topic:corrected');
  await composer().getByRole('button',{name:'查看完整草稿',exact:true}).click();
  const preview=composer().getByRole('textbox',{name:'完整草稿正文',exact:true});
  await eventually(async()=>preview.isVisible());
  assert.equal(await preview.inputValue(),resumed);
  assert.match(await composer().getByRole('status').textContent(),/2024-07-03T09:46:40.000Z/);
  assert.equal(await p.evaluate(()=>navigator.onLine),false);
  await p.evaluate(()=>{offlineWorkspace.dispose();offlineStore.close();});
  assert.deepEqual((await h.state()).records,original.records);
  assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{try{await offlineSession?.detach();}finally{await h.close();}}
});


test('CPV1-10 stacked product surfaces retain complete Archive input at narrow widths and large text',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await enable(p);
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',fontSize:'xlarge'}});
  const full=Array.from({length:1000},(_,i)=>'窄屏阅读第'+i+'段🧭：保留空白、换行、Unicode 和否定，不要自动发送。\n').join('')+
   '完整尾部：不要截断，不要生成另一份 Source。';
  const fixture=conversation('mywrite-mobile-access-source',1700);
  fixture.messages=[{...fixture.messages[0],text:full}];
  const captured=await h.open(fixture);await h.ready(captured);
  await eventually(async()=>(await h.state()).library.blocks.length===1);
  const original=await h.state();await captured.close();
  const nav=view=>p.locator('#primary-nav [data-view="'+view+'"]');
  const reflow=async()=>assert.ok(await p.evaluate(()=>
   document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),
   'actual product surface must reflow without root horizontal scrolling');
  const root=async()=>{
   await eventually(()=>p.locator('#archive-root-main').isVisible());
   await eventually(async()=>await p.locator('#archive-root-recent').isVisible()&&
    !await p.locator('#archive-root-recent').isDisabled());
  };
  await root();
  for(const width of [390,320]){
   await p.setViewportSize({width,height:844});
   await reflow();
   assert.equal(await nav('library').getAttribute('aria-current'),'page');
   for(const view of ['library','thoughts','memory']){
    const control=nav(view);assert.equal(await control.isVisible(),true);
    const box=await control.boundingBox();
    assert.ok(box&&box.width>=44&&box.height>=44,'narrow primary routes keep usable targets');
   }
   await p.locator('#archive-root-recent').click();
   await eventually(()=>p.locator('#document-panel').isVisible());
   const prose=p.locator('.library-prose').first();await eventually(()=>prose.isVisible());
   // Stress the actual reader's supported prose variable at 24px. This is
   // hosted reflow evidence, not OS Dynamic Type or physical-device proof.
   await p.evaluate(()=>document.documentElement.style.setProperty('--paia-prose-size','24px'));
   assert.equal(await prose.evaluate(el=>getComputedStyle(el).fontSize),'24px');
   assert.equal(await prose.textContent(),full);
   await reflow();
   await p.locator('#back').click();await root();
   await nav('thoughts').focus();await p.keyboard.press('Enter');
   await eventually(()=>p.locator('#thought-panel').isVisible());
   assert.equal(await nav('thoughts').getAttribute('aria-current'),'page');await reflow();
   assert.equal(await p.locator('#memory-panel').isVisible(),false);
   await nav('memory').focus();await p.keyboard.press('Enter');
   await eventually(()=>p.locator('#memory-panel').isVisible());
   await eventually(()=>p.locator('#material-workbench').isVisible());
   assert.equal(await nav('memory').getAttribute('aria-current'),'page');
   assert.equal(await p.locator('#material-workbench').count(),1);
   assert.equal(await p.locator('.material-tray-layout').evaluate(el=>getComputedStyle(el).display),'block');
   assert.equal(await p.locator('.material-drawer').isVisible(),false);
   assert.equal(await p.locator('.app-shell').evaluate(el=>el.inert),false);
   assert.equal(await p.locator('#material-workbench').evaluate(el=>!!el.closest('#memory-panel')),true);
   assert.equal(await p.locator('#material-output-text').count(),0);
   await reflow();
   await nav('library').focus();await p.keyboard.press('Enter');await root();
   assert.equal(await p.evaluate(()=>location.hash+location.search),'');
   const current=await h.state();
   assert.deepEqual(current.records,original.records);
   assert.deepEqual(current.library.blocks,original.library.blocks);
   assert.deepEqual(current.memoryAccessPolicy,original.memoryAccessPolicy);
  }
  await h.restartWorker();await p.reload();await p.waitForSelector('#prompt-open');await root();
  await p.locator('#archive-root-recent').click();
  try{await eventually(()=>p.locator('.library-prose').first().isVisible());}
  catch{
   const signal=await p.evaluate(()=>({recentHidden:document.getElementById('archive-root-recent')?.hidden,recentDisabled:document.getElementById('archive-root-recent')?.disabled,readerHidden:document.getElementById('document-panel')?.hidden,view:history.state?.paiaReader?.view,hasDocument:!!history.state?.paiaReader?.documentId,errorVisible:!document.getElementById('error')?.hidden}));
   assert.fail('post-restart Archive reader did not open: '+JSON.stringify(signal));
  }
  assert.equal(await p.locator('.library-prose').first().textContent(),full);
  assert.deepEqual((await h.state()).records,original.records);
  assert.deepEqual((await h.state()).library.blocks,original.library.blocks);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
