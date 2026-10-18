import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {eventually} from './fake-chatgpt.mjs';
import {thoughtPrimary} from './current-thought-navigation.mjs';
import {waitArchiveWindow} from './archive-navigator.mjs';

const rpc=async(page,type,fields={})=>{const reply=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(reply.ok,true,JSON.stringify(reply));return reply.data;};
// PRE_SECTION preserves deliberate raw-data access in Settings. These helpers
// exercise that native route; they never invoke OriginalSurface or mint IDs.
export async function rawDocumentMenu(page){
 const button=page.locator('#document-menu');
 if(!await button.isVisible()){const compact=page.locator('#archive-compact-navigation');assert.equal(await compact.isVisible(),true);if(!await compact.evaluate(node=>node.open))await compact.locator(':scope>summary').click();}
 await button.click();
}
export async function openRawDocument(page,documentId){
 const result=await rpc(page,'GET_PAGE',{page:{view:'archive',documentId,limit:1}}),canonical=result.conversations.find(row=>row.id===documentId);assert.ok(canonical);
 await thoughtPrimary(page,'settings');await page.locator('#settings-panel').waitFor({state:'visible'});const data=page.locator('[data-settings-group="data"]');if(!await data.isVisible()){await page.locator('#ux-settings-group-back').click();await data.waitFor({state:'visible'});}await data.click();await page.locator('#ux-settings-data-group').waitFor({state:'visible'});await page.locator('#settings-source-records').click();
 await eventually(()=>page.locator('body').getAttribute('data-paia-space').then(value=>value==='archive'));
 const window=await waitArchiveWindow(page,{text:canonical.userTitle||canonical.originalConversationTitle});assert.equal(await window.getAttribute('data-document-id'),documentId);await window.click();
 await eventually(async()=>await page.locator('#document-body .original-prose').count()>0&&await page.evaluate(id=>history.state?.paiaReader?.documentId===id,documentId),'same canonical raw Source document is rendered');
 return canonical;
}
export async function openRawInputOriginal(page,inputId){
 // Synthetic failure metadata follows the original RPCs without adding a
 // retry, substituting a target, or weakening the unique Source assertion.
 await page.evaluate(()=>{
  const original=chrome.runtime.sendMessage.bind(chrome.runtime),trace=[];
  const record=row=>{trace.push({at:Date.now(),...row});if(trace.length>100)trace.shift();};
  const changed=message=>{if(message.type==='ARCHIVE_CHANGED')record({event:message.type,cause:message.cause});};
  const dialog=document.getElementById('info-dialog'),closed=()=>record({event:'dialog.close',surface:dialog.dataset.readingSurface});dialog.addEventListener('close',closed);
  chrome.runtime.onMessage.addListener(changed);
  globalThis.__rawOriginalTrace={original,trace,changed,dialog,closed};
  chrome.runtime.sendMessage=function(message,...rest){
   const result=original(message,...rest);
   if(!['GET_PAGE','GET_INPUT','PAIA_ARCHIVE_ORIGINAL_PAGE'].includes(message.type)||!result?.then)return result;
   result.then(reply=>{const data=reply?.data;record({type:message.type,page:message.page?{view:message.page.view,documentId:message.page.documentId,expectedGeneration:message.page.expectedGeneration,cursor:!!message.page.cursor}:undefined,id:message.id,ok:reply?.ok,error:reply?.error,generation:data?.dataGeneration??data?.generation,epoch:data?.recoveryEpoch,nextCursor:!!data?.nextCursor,ids:data?.library?.blocks?.map(row=>({id:row.id,revision:row.revision,documentId:row.documentId,sourceIds:row.provenance?.map(ref=>ref.sourceRecordId)}))});},error=>record({type:message.type,error:error?.name||'Error'}));return result;
  };
 });
 let failed=false;try{
 const input=await rpc(page,'GET_INPUT',{id:inputId});assert.equal(input.id,inputId);const sourceId=input.sourceRecordId||input.originalTextReference;assert.ok(sourceId);assert.ok(input.provenance.some(row=>row.sourceRecordId===sourceId));
 await openRawDocument(page,input.documentId);
 const prose=page.locator('.archive-block[data-record-id="'+sourceId+'"] .original-prose');await prose.waitFor({state:'visible'});await prose.click({button:'right'});await page.getByRole('menuitem',{name:'查看关联 Input 原始内容',exact:true}).click();
 await eventually(async()=>await page.locator('#info-dialog').evaluate(node=>node.open)&&await page.locator('#info-content .source-original').count()===1,'explicit linked Input Original has one qualified canonical Source');
 return {input,sourceId,prose};
 }catch(error){
  failed=true;try{const evidence=await page.locator('html').evaluate(()=>{const dialog=document.getElementById('info-dialog'),content=document.getElementById('info-content');return {trace:globalThis.__rawOriginalTrace?.trace,route:history.state,dialog:{open:dialog?.open,surface:dialog?.dataset.readingSurface,sources:content?.querySelectorAll('.source-original').length,choices:content?.querySelectorAll('[data-original-input-id]').length,status:content?.querySelector('[role=status]')?.textContent},space:document.body.dataset.paiaSpace};},null,{timeout:1000});
  await mkdir('work/raw-source-original',{recursive:true});await writeFile('work/raw-source-original/failed-navigation-'+Date.now()+'.json',JSON.stringify(evidence,null,2));}catch{}throw error;
 }finally{if(process.env.PAIA_RAW_DEVELOPMENT_TRACE==='1')try{const trace=await page.locator('html').evaluate(()=>globalThis.__rawOriginalTrace?.trace,null,{timeout:1000});await mkdir('work/raw-source-original',{recursive:true});await writeFile('work/raw-source-original/navigation-trace.json',JSON.stringify({head:process.env.GITHUB_SHA||null,failed,trace},null,2));}catch{}try{await page.locator('html').evaluate(()=>{const saved=globalThis.__rawOriginalTrace;if(saved){chrome.runtime.sendMessage=saved.original;chrome.runtime.onMessage.removeListener(saved.changed);saved.dialog.removeEventListener('close',saved.closed);delete globalThis.__rawOriginalTrace;}},null,{timeout:1000});}catch(error){if(!failed)throw error;}}
}
export async function returnRawToInput(page,inputId){
 await rawDocumentMenu(page);await page.getByRole('menuitem',{name:'定位到 Input Archive',exact:true}).click();
 await eventually(()=>page.locator('body').getAttribute('data-paia-space').then(value=>value==='library'));
 const field=page.locator('.library-prose[data-edit-id="'+inputId+'"]');await field.waitFor({state:'visible'});return field;
}
