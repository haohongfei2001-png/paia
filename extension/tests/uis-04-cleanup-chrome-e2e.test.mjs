import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
const rpc=async(page,type,fields={})=>{
  const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
  assert.equal(result.ok,true,JSON.stringify(result));return result.data;
};
const nav=(page,view)=>page.locator(view==='settings'?'.sidebar-bottom [data-view="settings"]':`#primary-nav [data-view="${view}"]`).click();
async function noRemovedControls(page){
  for(const selector of ['#universal-search-open','#thought-recent','#thought-organize-tools','#core-loop-browse-title'])assert.equal(await page.locator(selector).count(),0,selector+' cannot be recreated');
}
test('UIS-04 cleanup survives locale/navigation changes and preserves Revisit and explicit material selection',{timeout:180000},async()=>{
  const h=await FakeChatGPT.start({onboarding:true});
  try{
    const page=h.archive;
    await page.locator('#enable-consent').click();
    await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent is durable');
    if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
    await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
    await h.open({id:'uis04-cleanup',title:'UIS04 清理验证',base:1609459200,messages:[{id:'uis04-input',text:'UIS04_KEEP_INTERNAL_MATERIAL 本地材料仍可明确选择。'}]});
    await eventually(async()=>(await h.state()).records.length===1,'synthetic input is captured');
    const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:'UIS04 保留阅读元数据',operationId:crypto.randomUUID()}});
    await rpc(page,'CONTINUE_THINKING',{thought:{topicId:topic.id,body:'UIS04 独立思想保持原样。',operationId:crypto.randomUUID()}});
    await rpc(page,'RECORD_TOPIC_READ',{id:topic.id});
    await page.bringToFront();await nav(page,'library');
    await eventually(()=>page.locator('#revisit-open').isVisible(),'Revisit mounts without a dummy search button');
    await page.evaluate(async()=>{
      const search=await import(chrome.runtime.getURL('ui/universal-search.js'));
      const revisit=await import(chrome.runtime.getURL('ui/revisit.js'));
      search.installUniversalSearch();search.installUniversalSearch();revisit.installRevisit();revisit.installRevisit();
    });
    assert.equal(await page.locator('#universal-search-dialog').count(),1,'internal search installation is idempotent');
    assert.equal(await page.locator('#revisit-open').count(),1,'Revisit installation is idempotent');
    for(const language of ['en','zh-CN']){
      await nav(page,'settings');
      await rpc(page,'UPDATE_PREFERENCES',{changes:{language}});
      await eventually(async()=>await page.evaluate(()=>document.documentElement.lang)===language,'locale applied');
      assert.equal(await page.locator('input[type="search"]:visible').count(),0,'Settings has no search');
      await page.evaluate(()=>{for(const init of [{key:'/'},{key:'k',metaKey:true},{key:'f',ctrlKey:true}])document.dispatchEvent(new KeyboardEvent('keydown',{...init,bubbles:true,cancelable:true}));});
      await pause(60);await noRemovedControls(page);
      assert.equal(await page.locator('#universal-search-dialog').isVisible(),false,'Settings shortcuts do not open the picker');
await page.locator('.ux-settings-nav [data-settings-group="ai"]').click();
assert.equal(await page.locator('#ux-settings-ai-group #organizer-reading-actions').count(),1,'the existing organizer has one Settings AI owner');
assert.equal(await page.locator('#organizer-reading-actions').isVisible(),true);
await eventually(()=>page.locator('#original-library-update').isVisible(),'single-pass organizer is reachable after bounded local status loads');
await eventually(()=>page.locator('#original-library-update').isEnabled(),'the available single-pass action is not left in an unknown-status disabled state');
assert.equal(h.deepSeekRequests.length,0,'loading Settings organizer status is not authorization');
await page.locator('#organizer-batch-actions > summary').click();
assert.equal(await page.locator('#bounded-original-start').isVisible(),true);
assert.equal(await page.locator('#bounded-ai-start').isVisible(),true);
await page.locator('#bounded-original-start').click();
await eventually(()=>page.locator('#library-dialog').isVisible(),'Settings reaches the unchanged bounded confirmation');
assert.equal(await page.locator('#library-form [name="requests"]').inputValue(),'1');
await page.locator('#library-dialog-close').click();
await eventually(async()=>!(await page.locator('#library-dialog').isVisible()),'cancel leaves the Provider unauthorized');
await page.locator('#organizer-batch-actions > summary').click();
assert.equal(h.deepSeekRequests.length,0);
      await nav(page,'thoughts');
      await eventually(()=>page.locator('#thought-search').isVisible(),'Thought root is ready');
      assert.equal(await page.locator('input[type="search"]:visible').count(),1);
      assert.equal(await page.locator('#ai-presentation-toggle').isVisible(),false);
assert.equal(await page.locator('#thought-panel #organizer-reading-actions').count(),0,'Thought root cannot own a collapsed AI organizer');
assert.equal(await page.locator('#organizer-reading-actions').isVisible(),false,'Settings organizer stays outside the Thought root');
      await noRemovedControls(page);
      const index=await rpc(page,'LIBRARY_INDEX_PAGE',{options:{mode:'stable'}});
      assert.ok(index.recent.some(item=>item.id===topic.id),'recent metadata survives presentation cleanup');
      await nav(page,'library');
      await eventually(()=>page.locator('#search').isVisible(),'Archive root is ready');
      assert.equal(await page.locator('input[type="search"]:visible').count(),1);
      await noRemovedControls(page);
    }
    await page.locator('#revisit-open').focus();await page.keyboard.press('Enter');
    await eventually(()=>page.locator('#revisit-panel').isVisible(),'keyboard opens the retained Revisit owner');
    await page.locator('.revisit-close').click();
    await eventually(()=>page.locator('#search').isVisible(),'Revisit returns to Archive');
    assert.equal(await page.locator('#archive-select-materials').count(),0,'Archive root duplicate material launcher stays removed');
    await page.locator('#primary-nav [data-view="memory"]').click();
    await eventually(()=>page.locator('#material-workbench').isVisible(),'For AI material surface is available');
    await page.getByRole('button',{name:'从档案选择',exact:true}).click();
    await eventually(()=>page.locator('#universal-search-dialog').isVisible(),'retained material selection still opens internal search');
    await page.locator('#universal-search-dialog input[type="search"]').fill('UIS04_KEEP_INTERNAL_MATERIAL');
    await eventually(async()=>await page.locator('#universal-search-dialog .universal-hit').count()===1,'internal coordinator finds the synthetic input');
    await page.locator('#universal-search-dialog .universal-context').click();
    await eventually(async()=>await page.evaluate(async()=>{
      const {getMaterialTray}=await import(chrome.runtime.getURL('ui/material-tray.js'));return getMaterialTray()?.data?.items.length===1;
    }),'explicit selection reaches the existing material tray');
    await page.locator('.universal-close').click();
    await eventually(()=>page.locator('#material-workbench').isVisible(),'closing selection restores For AI');
    await nav(page,'library');
    await eventually(()=>page.locator('#search').isVisible(),'Archive scoped search remains reachable');
    await noRemovedControls(page);
    assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  }finally{await h.close();}
});
