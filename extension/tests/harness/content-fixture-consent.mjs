import assert from 'node:assert/strict';

// A Playwright click acknowledges event dispatch, not the original consent
// publisher. Do not start the independent, dated fixture Store until the real
// UI and worker have observed the completed grant. No write is retried here.
export async function awaitContentFixtureConsent(page){
 await page.locator('#consent-panel').waitFor({state:'hidden'});
 const result=await page.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATUS'}));
 assert.equal(result?.ok,true,'original status read succeeds after consent presentation settles');
 assert.equal(result.data?.consented,true,'fixture requires the original acknowledged or reconciled consent');
 assert.equal(result.data?.enabled,true,'fixture capture is enabled by the original owner');
 return {consented:true,enabled:true};
}
