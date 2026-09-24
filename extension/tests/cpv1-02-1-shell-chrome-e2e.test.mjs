import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{
 const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(result.ok,true,JSON.stringify(result));
 return result.data;
};

test('CPV1-02.1 shell keeps one container and route through search, Reader and browser history',{timeout:180000},async()=>{
 let harness;
 try{
  harness=await FakeChatGPT.start({onboarding:true});
  const page=harness.archive;
  await page.locator('#enable-consent').waitFor({state:'visible'});
  await eventually(async()=>!(await page.locator('#enable-consent').isDisabled()),'consent action is ready');
  await page.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent persists');
  await page.locator('#onboarding-skip').click();
  await harness.open({id:'cpv1-021-shell',title:'CPV1 shell conversation',base:1609459200,messages:[{id:'cpv1-021-input',text:'CPV1_SHELL_SEARCH unique saved idea'}]});
  await eventually(async()=>(await harness.state()).records.some(row=>row.originalText.includes('CPV1_SHELL_SEARCH')),'synthetic capture persists');
  await page.bringToFront();
  await eventually(()=>page.locator('#archive-navigator:not([hidden]) .archive-navigator-group-toggle').first().isVisible(),'Archive groups are visible');
  for(const group of await page.locator('.archive-navigator-group-toggle').all()){
   await group.click();
   if(await page.locator('.archive-navigator-window').count())break;
  }
  const rootWindow=page.locator('.archive-navigator-window').first();
  await eventually(()=>rootWindow.isVisible(),'captured Conversation appears in the Archive tree');
  await eventually(()=>page.locator('.archive-navigator-window-cue').first().isVisible(),'bounded local content cue is visible');
  assert.match(await page.locator('.archive-navigator-window-cue').first().textContent(),/CPV1_SHELL_SEARCH unique saved idea/);
  assert.match(await page.locator('.archive-navigator-window-time').first().textContent(),/2021/);
  await eventually(async()=>await page.locator('#archive-source-scope option[value="chatgpt"]').count()===1,'source scope reflects captured provider');
  await page.locator('#archive-source-scope').selectOption('chatgpt');
  await eventually(async()=>await page.evaluate(()=>history.state?.paiaReader?.sourceKey)==='chatgpt','source scope belongs to the shell route');
  await eventually(()=>rootWindow.isVisible(),'scoping to ChatGPT keeps its Conversation visible');
  assert.equal(await page.locator('#sync-history').isVisible(),false);
  await page.locator('#archive-root-overflow summary').click();
  assert.equal(await page.locator('#archive-root-history').isVisible(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download'),
   page.locator('#archive-root-export-json').click()
  ]);
  assert.match(download.suggestedFilename(),/^archive-export-.*\.json$/);
  await page.locator('#archive-root-overflow summary').click();
  await page.locator('#archive-root-history').click();
  await eventually(()=>page.locator('#history-dialog').isVisible(),'root import opens existing verified import flow');
  await page.locator('#history-close').click();
  await eventually(async()=>!(await page.locator('#history-dialog').isVisible()),'import closes without changing the archive');
  await page.locator('#search').fill('CPV1_SHELL_SEARCH');
  await eventually(async()=>await page.evaluate(()=>history.state?.paiaReader?.searchQuery)==='CPV1_SHELL_SEARCH','shell route owns scope search');
  await eventually(async()=>await page.locator('#document-list .conversation-document').count()===1,'source-scoped search returns the captured Conversation');
  await page.locator('#search').fill('');
  await eventually(async()=>await page.evaluate(()=>history.state?.paiaReader?.searchQuery)==='','clearing search updates the same route');
  await eventually(()=>rootWindow.isVisible(),'source metadata transition keeps the open Conversation reachable');
  await rootWindow.click();
  await eventually(()=>page.locator('#document-panel').isVisible(),'Reader is the visible container');
  assert.equal(await page.locator('#collection-panel').isVisible(),false);
  assert.equal(await page.locator('#primary-nav').count(),1);
  assert.equal(await page.locator('#search').count(),1);
  const documentId=await page.evaluate(()=>history.state?.paiaReader?.documentId);
  assert.ok(documentId,'Reader route contains a Conversation');
  await page.evaluate(()=>history.back());
  await eventually(()=>page.locator('#collection-panel').isVisible(),'Back restores the Archive container');
  assert.equal(await page.evaluate(()=>history.state?.paiaReader?.documentId),null);
  assert.equal(await page.locator('#archive-source-scope').inputValue(),'chatgpt');
  await eventually(()=>rootWindow.isVisible(),'Back restores the same Conversation in the Archive tree');
  await page.evaluate(()=>history.forward());
  await eventually(()=>page.locator('#document-panel').isVisible(),'Forward restores the Reader container');
  assert.equal(await page.evaluate(()=>history.state?.paiaReader?.documentId),documentId);
  await page.evaluate(()=>history.back());
  await eventually(()=>rootWindow.isVisible(),'a second Back keeps the Conversation reachable');
  assert.equal(harness.externalRequests,0);
 }finally{await harness?.close();}
});
