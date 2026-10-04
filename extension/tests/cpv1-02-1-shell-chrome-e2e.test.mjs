import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
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
  await harness.open({id:'cpv1-021-shell',title:'CPV1 shell conversation · 很长的 Project 归属和窗口标题 with a deliberately long ending',base:1609459200,messages:[{id:'cpv1-021-input',text:'CPV1_SHELL_SEARCH unique saved idea'}]});
  await eventually(async()=>(await harness.state()).records.some(row=>row.originalText.includes('CPV1_SHELL_SEARCH')),'synthetic capture persists');
  await page.bringToFront();
  await eventually(()=>page.locator('#archive-navigator:not([hidden]) .archive-navigator-group-toggle').first().isVisible(),'Archive groups are visible');
  for(const group of await page.locator('.archive-navigator-group-toggle').all()){
   await group.click();
   if(await page.locator('.archive-navigator-window').count())break;
  }
  const rootWindow=page.locator('.archive-navigator-window').first();
  await eventually(()=>rootWindow.isVisible(),'captured Conversation appears in the Archive tree');
  assert.equal(await page.locator('#uir-archive-assist,#uir-archive-frame').count(),0,'Archive root does not render the legacy dashboard');
  assert.equal(await page.locator('#revisit-open').isVisible(),false,'Revisit stays out of the Archive header');
  assert.equal(await page.locator('#archive-root-recent,#archive-root-continue,.archive-navigator-window-cue,.archive-navigator-window-time,.archive-navigator-detail').count(),0,'Archive rows expose titles without retired shortcuts, previews, timestamps or detail controls');
  assert.equal(await page.locator('input[type="search"]:visible').count(),1,'Archive has one primary search');
  const searchBox=await page.locator('#scope-search').boundingBox(),treeBox=await page.locator('#archive-navigator').boundingBox();
  assert.ok(searchBox&&treeBox&&searchBox.y+searchBox.height<=treeBox.y,'primary search is above the Project tree');
  if(process.env.PAIA_BATCH_VISUAL_DIR){await mkdir(process.env.PAIA_BATCH_VISUAL_DIR,{recursive:true});await page.screenshot({path:process.env.PAIA_BATCH_VISUAL_DIR+'/archive-desktop.png',fullPage:true});}
  await eventually(async()=>await page.locator('#archive-source-scope option[value="chatgpt"]').count()===1,'source scope reflects captured provider');
  await page.locator('#archive-root-overflow summary').click();
  await page.locator('#archive-source-scope').selectOption('chatgpt');
  await eventually(async()=>await page.evaluate(()=>history.state?.paiaReader?.sourceKey)==='chatgpt','source scope belongs to the shell route');
  await page.locator('#archive-root-overflow summary').click();
  await eventually(()=>rootWindow.isVisible(),'scoping to ChatGPT keeps its Conversation visible');
  assert.equal(await page.locator('#sync-history').isVisible(),false);
  await page.locator('#archive-root-overflow summary').click();
  assert.equal(await page.locator('#archive-root-history').isVisible(),true,'Archive overflow exposes the verified import action');
  // Retain exact export-read generations if this guarded download refuses.
  await page.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__shellExportTrace=[];chrome.runtime.sendMessage=async message=>{const r=await send(message);if(message.type==='GET_PAGE')globalThis.__shellExportTrace.push({view:message.page?.view,providerKey:message.page?.providerKey,expectedGeneration:message.page?.expectedGeneration,ok:r.ok,error:r.error,generation:r.data?.dataGeneration,documents:r.data?.documents?.length,records:r.data?.records?.length});return r;};});
  let download;
  try{[download]=await Promise.all([
   page.waitForEvent('download'),
   page.locator('#archive-root-export-json').click()
  ]);}catch(error){
   await mkdir('work/qa-dvn-shell',{recursive:true});
   await writeFile('work/qa-dvn-shell/export-failure.json',JSON.stringify(await page.evaluate(()=>({trace:globalThis.__shellExportTrace,notice:document.querySelector('#notice')?.textContent,scope:document.querySelector('#archive-source-scope')?.value,searchDisabled:document.querySelector('#scope-search')?.disabled,route:history.state?.paiaReader})),null,2));
   await page.screenshot({path:'work/qa-dvn-shell/export-failure.png',fullPage:true});throw error;
  }
  await mkdir('work/qa-dvn-shell',{recursive:true});
  await writeFile('work/qa-dvn-shell/export-observation.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,trace:await page.evaluate(()=>globalThis.__shellExportTrace),download:download.suggestedFilename()},null,2));
  assert.match(download.suggestedFilename(),/^archive-export-.*\.json$/);
  await page.locator('#archive-root-overflow summary').click();
  await page.locator('#archive-root-history').click();
  await eventually(()=>page.locator('#history-dialog').isVisible(),'root import opens existing verified import flow');
  await page.locator('#history-close').click();
  await eventually(async()=>!(await page.locator('#history-dialog').isVisible()),'import closes without changing the archive');
  await page.locator('#scope-search').fill('CPV1_SHELL_SEARCH');
  await eventually(async()=>await page.locator('#scope-search').inputValue()==='CPV1_SHELL_SEARCH'&&await page.evaluate(()=>history.state?.paiaReader?.version===2&&typeof history.state?.paiaReader?.sessionKey==='string'&&!Object.hasOwn(history.state.paiaReader,'searchQuery')),'shell keeps its scope query in the view session, outside browser history');
  await eventually(async()=>await page.locator('#document-list .conversation-document').count()===1,'source-scoped search returns the captured Conversation');
  await page.locator('#scope-search').fill('');
  await eventually(async()=>await page.locator('#scope-search').inputValue()===''&&await page.evaluate(()=>!Object.hasOwn(history.state.paiaReader,'searchQuery')),'clearing search updates the same view session without putting query text into history');
  await eventually(()=>rootWindow.isVisible(),'source metadata transition keeps the open Conversation reachable');
  await rootWindow.click();
  await eventually(()=>page.locator('#document-panel').isVisible(),'Reader is the visible container');
  assert.equal(await page.locator('#collection-panel').isVisible(),false);
  assert.equal(await page.locator('#primary-nav').count(),1);
  assert.equal(await page.locator('#scope-search').count(),1);
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
  // The same row also exists in Reader's Navigator, so row visibility alone
  // cannot establish that the asynchronous Back navigation has completed.
  await eventually(()=>page.locator('#collection-panel').isVisible(),'second Back restores the Archive container before responsive checks');
  assert.equal(await page.evaluate(()=>history.state?.paiaReader?.documentId),null);
  await eventually(()=>rootWindow.isVisible(),'a second Back keeps the Conversation reachable');
  await page.setViewportSize({width:320,height:700});
  await eventually(()=>rootWindow.isVisible(),'the same Conversation remains available at phone width');
  const phoneRoute=await page.evaluate(()=>({route:history.state?.paiaReader,collectionHidden:document.querySelector('#collection-panel').hidden,readerHidden:document.querySelector('#document-panel').hidden,overflowHidden:document.querySelector('#archive-root-overflow').hidden,navigatorParent:document.querySelector('#archive-navigator').parentElement.id,width:innerWidth}));
  assert.equal(await page.locator('#archive-root-overflow summary').isVisible(),true,'Archive overflow remains visible at phone width; settled state '+JSON.stringify(phoneRoute));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'long source title does not create horizontal page overflow');
  if(process.env.PAIA_BATCH_VISUAL_DIR)await page.screenshot({path:process.env.PAIA_BATCH_VISUAL_DIR+'/archive-320.png',fullPage:true});
  assert.equal(harness.externalRequests,0);
 }finally{await harness?.close();}
});
