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
  await eventually(()=>page.locator('.conversation-document').first().isVisible(),'conversation row is visible');
  await page.locator('#search').fill('CPV1_SHELL_SEARCH');
  await eventually(async()=>await page.evaluate(()=>history.state?.paiaReader?.searchQuery)==='CPV1_SHELL_SEARCH','shell route owns scope search');
  await page.locator('#search').fill('');
  await eventually(async()=>await page.evaluate(()=>history.state?.paiaReader?.searchQuery)==='','clearing search updates the same route');
  await page.locator('.conversation-document').first().click();
  await eventually(()=>page.locator('#document-panel').isVisible(),'Reader is the visible container');
  assert.equal(await page.locator('#collection-panel').isVisible(),false);
  assert.equal(await page.locator('#primary-nav').count(),1);
  assert.equal(await page.locator('#search').count(),1);
  const documentId=await page.evaluate(()=>history.state?.paiaReader?.documentId);
  assert.ok(documentId,'Reader route contains a Conversation');
  await page.evaluate(()=>history.back());
  await eventually(()=>page.locator('#collection-panel').isVisible(),'Back restores the Archive container');
  assert.equal(await page.evaluate(()=>history.state?.paiaReader?.documentId),null);
  await page.evaluate(()=>history.forward());
  await eventually(()=>page.locator('#document-panel').isVisible(),'Forward restores the Reader container');
  assert.equal(await page.evaluate(()=>history.state?.paiaReader?.documentId),documentId);
  assert.deepEqual(harness.externalRequests,[]);
 }finally{await harness?.close();}
});
