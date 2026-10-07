import assert from 'node:assert/strict';
import {eventually} from './fake-chatgpt.mjs';
import {chooseConsumerGroup} from './settings-consumer-presentation.mjs';

// Uses the existing Prompt fixture and its live card: no second browser/seed.
export async function settingsPromptPositionEvidence({h,page,card,orb,rpc,engineering}){
 const settings=h.archive,reset=settings.locator('#settings-prompt-position-reset'),feedback=settings.locator('#settings-prompt-position-feedback');
 await settings.setViewportSize({width:1280,height:900});
 await settings.locator('.sidebar-bottom [data-view="settings"]').click();
 await chooseConsumerGroup(settings,'ai');await eventually(()=>reset.isEnabled());
 // Exercise the restored style and detail presenters in the same runtime before
 // resetting the concurrently open Prompt card. Neither may change Prompt data.
 const families=await rpc(engineering,'PAIA_PROMPT_QUERY',{includeHidden:true});
 await settings.locator('#settings-ai-style-open').click();
 await eventually(()=>settings.locator('#settings-ai-style-original').isEnabled());
 await settings.locator('#settings-ai-style-original').click();
 await eventually(async()=>(await rpc(settings,'PAIA_SETTINGS_AI_STYLE')).value==='original'&&await settings.locator('#settings-ai-style-original').isChecked()&&await settings.locator('#settings-ai-style-original').isEnabled());
 await settings.locator('#settings-ai-style-original').press('Escape');
 assert.equal(await settings.locator('#settings-ai-style-open').evaluate(n=>document.activeElement===n),true);
 await chooseConsumerGroup(settings,'data');await settings.locator('#settings-storage').click();await settings.locator('#settings-storage-dialog').waitFor();
 await settings.locator('#settings-storage-dialog .ux-settings-detail-close').press('Escape');
 assert.equal(await settings.locator('#settings-storage').evaluate(n=>document.activeElement===n),true);
 await chooseConsumerGroup(settings,'ai');
 await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Alt+ArrowLeft');
 const saved=()=>settings.evaluate(async()=>(await chrome.storage.local.get('promptSurfaceV1')).promptSurfaceV1);
 await eventually(async()=>!!(await saved()).position);
 const before=await saved(),f=card(),draft='Settings reset keeps this unsaved card draft 中文 🙂';let cdp;
 try{
  await f.locator('#new').click();const edit=f.getByRole('textbox',{name:'复用文本'});await edit.fill(draft);await edit.focus();
  cdp=await h.context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'汉',selectionStart:1,selectionEnd:1});
  assert.match(await edit.inputValue(),/Settings reset keeps this unsaved card draft/);
  // Complete native composition before crossing to another real tab; the
  // separate retained test proves uninterrupted IME during a worker reset.
  await cdp.send('Input.insertText',{text:'汉'});await cdp.detach();cdp=null;const composed=await edit.inputValue();
  await settings.evaluate(()=>{globalThis.__resetSend=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async message=>message.type==='PAIA_PROMPT_SURFACE_RESET_POSITION'?{ok:false,error:'STORAGE_FAILED'}:__resetSend(message);});
  await reset.click();await eventually(async()=>/未获确认|not confirmed/.test(await feedback.textContent()));
  assert.deepEqual(await saved(),before);assert.equal(await reset.evaluate(n=>document.activeElement===n),true);assert.equal(card(),f);assert.equal(await edit.inputValue(),composed);
  // The actual owner commits, but its acknowledgement is lost at the page
  // transport boundary. The UI must retain an error and reconcile durable state.
  await settings.evaluate(()=>{chrome.runtime.sendMessage=async message=>{const response=await __resetSend(message);return message.type==='PAIA_PROMPT_SURFACE_RESET_POSITION'?{ok:false,error:'STORAGE_FAILED'}:response;};});
  await reset.click();await eventually(async()=>{const s=await saved();return s.position===null&&s.positionGeneration===(before.positionGeneration??0)+1;});
  await eventually(async()=>await reset.isEnabled()&&/未获确认|not confirmed/.test(await feedback.textContent()));
  assert.equal(await reset.evaluate(n=>document.activeElement===n),true);assert.equal(card(),f);assert.equal(await edit.inputValue(),composed);assert.equal((await saved()).open,true);
  await settings.evaluate(()=>{chrome.runtime.sendMessage=__resetSend;delete globalThis.__resetSend;});
  await reset.click();await eventually(async()=>/位置已重置|Position reset/.test(await feedback.textContent()));
  assert.equal((await saved()).positionGeneration,(before.positionGeneration??0)+2);assert.equal(await reset.evaluate(n=>document.activeElement===n),true);
  assert.equal(card(),f);assert.equal(await edit.inputValue(),composed);assert.equal(await orb.isVisible(),true);
  assert.deepEqual(await rpc(engineering,'PAIA_PROMPT_QUERY',{includeHidden:true}),families);
  assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
 }finally{
  await settings.evaluate(()=>{if(globalThis.__resetSend){chrome.runtime.sendMessage=__resetSend;delete globalThis.__resetSend;}});
  if(cdp){await cdp.send('Input.insertText',{text:'汉'}).catch(()=>{});await cdp.detach();}
  if(await f.locator('#editor').isVisible())await f.getByRole('button',{name:'取消',exact:true}).click();
  await eventually(()=>f.locator('#refresh').isEnabled());
 }
}
