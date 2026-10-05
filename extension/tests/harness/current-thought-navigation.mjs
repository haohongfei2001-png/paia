import assert from 'node:assert/strict';
import {eventually} from './fake-chatgpt.mjs';

// Follow the current disclosures; never activate a hidden control or change a guard.
export async function thoughtPrimary(page,view){
 const target=page.locator(`.sidebar [data-view="${view}"]`);
 await eventually(()=>target.evaluate(node=>innerWidth<768?node.parentElement.id==='archive-compact-nav-items':node.parentElement.id==='primary-nav'||node.parentElement.classList.contains('sidebar-bottom')),'primary control reaches its breakpoint owner');
 if(await target.evaluate(node=>!!node.closest('#archive-compact-navigation:not([open])')))await page.locator('#archive-compact-nav-label').click();
 await target.click();
 // Same-space navigation may retain the disclosure; close it through Escape.
 if(await page.locator('#archive-compact-navigation').evaluate(node=>node.open))await page.keyboard.press('Escape');
}
export async function openThoughtMenu(page){
 const menu=page.locator('#topic-menu>.library-actions');
 if(!await menu.evaluate(node=>node.open))await menu.locator(':scope>summary').click();
 assert.equal(await menu.evaluate(node=>node.open),true);
}
export async function thoughtHistoryAction(page,id){
 await openThoughtMenu(page);await page.locator('#'+id).click();
}
export async function openThoughtReadingOptions(page){
 const options=page.locator('#thought-document .dvn-topic-options');
 if(!await options.evaluate(node=>node.open))await options.locator(':scope>summary').click();
 assert.equal(await options.evaluate(node=>node.open),true);
}
