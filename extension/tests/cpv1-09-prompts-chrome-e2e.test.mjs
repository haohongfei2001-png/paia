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
  const p=h.archive;await enable(p);await h.open(conversation('mywrite-local-preserve',1000));
  await eventually(async()=>(await h.state()).library.blocks.length===2,'complete original canonical Input projection finishes before the draft proof');
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
