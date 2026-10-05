import assert from 'node:assert/strict';
import {eventually} from './fake-chatgpt.mjs';

// Component regression only: D7's ordinary For AI route is display-only.
// Exercise the installed search owner through its existing event contract;
// never enable Context, substitute an owner, or claim a current user launcher.
export async function openRetainedSearchComponent(page,{types=['input']}={}){
 const context=()=>page.evaluate(async()=>{
  const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));
  const owner=getContextController();return {disabled:owner?.disabled,data:owner?.data,hidden:owner?.root.hidden};
 });
 assert.deepEqual(await context(),{disabled:true,data:null,hidden:true},'the withdrawn Context owner stays disabled without a material session');
 await page.evaluate(types=>document.dispatchEvent(new CustomEvent('paia:search-open',{detail:{types}})),types);
 await eventually(()=>page.locator('#universal-search-dialog').isVisible(),'installed search component accepts its existing consent-checked event');
 assert.deepEqual(await context(),{disabled:true,data:null,hidden:true},'opening retained search cannot initialize Context');
}
