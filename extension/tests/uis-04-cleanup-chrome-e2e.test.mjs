import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
const rpc=async(page,type,fields={})=>{
  const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
  assert.equal(result.ok,true,JSON.stringify(result));return result.data;
};
const nav=(page,view)=>page.locator(view==='settings'?'.sidebar-bottom [data-view="settings"]':`#primary-nav [data-view="${view}"]`).click();
async function noRemovedControls(page){
  for(const selector of ['#universal-search-open','#thought-recent','#core-loop-browse-title'])assert.equal(await page.locator(selector).count(),0,selector+' cannot be recreated');
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
      await nav(page,'thoughts');
      await eventually(()=>page.locator('#thought-search').isVisible(),'Thought root is ready');
      assert.equal(await page.locator('input[type="search"]:visible').count(),1);
      assert.equal(await page.locator('#ai-presentation-toggle').isVisible(),false);
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
    await page.locator('#archive-select-materials').click();
    await eventually(()=>page.locator('#universal-search-dialog').isVisible(),'explicit material selection still opens internal search');
    await page.locator('#universal-search-dialog input[type="search"]').fill('UIS04_KEEP_INTERNAL_MATERIAL');
    await eventually(async()=>await page.locator('#universal-search-dialog .universal-hit').count()===1,'internal coordinator finds the synthetic input');
    await page.locator('#universal-search-dialog .universal-context').click();
    await eventually(async()=>await page.evaluate(async()=>{
      const {getMaterialTray}=await import(chrome.runtime.getURL('ui/material-tray.js'));return getMaterialTray()?.data?.items.length===1;
    }),'explicit selection reaches the existing material tray');
    await page.locator('.universal-close').click();
    await eventually(()=>page.locator('#search').isVisible(),'closing selection restores scoped Archive search');
    await noRemovedControls(page);
    assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  }finally{await h.close();}
});
