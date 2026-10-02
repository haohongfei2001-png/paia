import assert from 'node:assert/strict';
import {eventually} from './fake-chatgpt.mjs';
export async function confirmCompiledContext(page){
 await eventually(()=>page.locator('#context-confirm-review').isVisible(),'compiled output awaits human review');
 assert.equal(await page.locator('[data-output=copy]').isDisabled(),true,'compile does not permit release');
 await page.locator('#context-confirm-review').click();
 await eventually(()=>page.locator('[data-output=copy]').isEnabled(),'explicit review permits release');
}
export async function previewReviewedContext(page){
 const purpose=page.locator('[data-material-edit=purpose]');
 if(await purpose.isVisible()&&!await purpose.inputValue())await purpose.fill('Inspect these explicitly selected synthetic materials');
 await page.locator('#material-preview').click();await confirmCompiledContext(page);
}
