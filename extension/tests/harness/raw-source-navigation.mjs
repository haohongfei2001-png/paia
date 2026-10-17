import assert from 'node:assert/strict';
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
 const input=await rpc(page,'GET_INPUT',{id:inputId});assert.equal(input.id,inputId);const sourceId=input.sourceRecordId||input.originalTextReference;assert.ok(sourceId);assert.ok(input.provenance.some(row=>row.sourceRecordId===sourceId));
 await openRawDocument(page,input.documentId);
 const prose=page.locator('.archive-block[data-record-id="'+sourceId+'"] .original-prose');await prose.waitFor({state:'visible'});await prose.click({button:'right'});await page.getByRole('menuitem',{name:'查看关联 Input 原始内容',exact:true}).click();
 await eventually(async()=>await page.locator('#info-dialog').evaluate(node=>node.open)&&await page.locator('#info-content .source-original').count()===1,'explicit linked Input Original has one qualified canonical Source');
 return {input,sourceId,prose};
}
export async function returnRawToInput(page,inputId){
 await rawDocumentMenu(page);await page.getByRole('menuitem',{name:'定位到 Input Archive',exact:true}).click();
 await eventually(()=>page.locator('body').getAttribute('data-paia-space').then(value=>value==='library'));
 const field=page.locator('.library-prose[data-edit-id="'+inputId+'"]');await field.waitFor({state:'visible'});return field;
}
