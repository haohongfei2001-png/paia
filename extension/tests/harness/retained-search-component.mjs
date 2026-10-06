import assert from 'node:assert/strict';
import {eventually} from './fake-chatgpt.mjs';

// Component regression only: D7's ordinary For AI route is display-only.
// Exercise the installed search owner through its existing event contract;
// never enable Context, substitute an owner, or claim a current user launcher.
export async function openRetainedSearchComponent(page,{types=['input']}={}){
 const context=()=>page.evaluate(async()=>{
  const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));
  return getContextController();
 });
 assert.equal(await context(),null,'the retired Context has no owner or material session');
 await page.evaluate(types=>document.dispatchEvent(new CustomEvent('paia:search-open',{detail:{types}})),types);
 await eventually(()=>page.locator('#universal-search-dialog').isVisible(),'installed search component accepts its existing consent-checked event');
 assert.equal(await context(),null,'opening retained search cannot initialize Context');
}
