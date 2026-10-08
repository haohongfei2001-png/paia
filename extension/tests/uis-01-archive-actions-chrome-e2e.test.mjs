import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

async function consent(page){
  const action=page.locator('#enable-consent');
  await action.waitFor({state:'visible'});
  await eventually(async()=>!(await action.isDisabled()),'consent action is available');
  await action.click();
  assert.equal(await page.locator('#onboarding-history-step').isVisible(),false,'blank root has no history onboarding');
}

async function openArchiveMenu(page){
  const trigger=page.locator('#archive-root-overflow summary');
  await trigger.waitFor({state:'visible'});
  await trigger.click();
  await eventually(()=>page.locator('#archive-root-overflow').evaluate(el=>el.open),'Archive action menu opens');
  return trigger;
}

test('UIS-01 quiets Archive root and keeps history reachable while retired exports refuse without side effects',{timeout:120000},async()=>{
  let h;
  try{
    h=await FakeChatGPT.start({onboarding:true});
    const page=h.archive;
    await consent(page);
    await h.open({id:'uis01_source_a_20260917',title:'UIS-01 合成档案 A',base:1609459200,messages:[
      {id:'UIS01-A-MESSAGE',text:'UIS01_EXPORT_FILTER_A 只用于档案动作测试。'}
    ]});
    await h.open({id:'uis01_source_b_20260917',title:'UIS-01 合成档案 B',base:1609462800,messages:[
      {id:'UIS01-B-MESSAGE',text:'UIS01_EXPORT_FILTER_B 第二条合成输入。'}
    ]});
    await eventually(async()=>(await h.state()).records.length===2,'synthetic Archive records captured');
    await page.bringToFront();
    await eventually(async()=>await page.locator('.archive-navigator-group-toggle').count()>0,'Archive directory has captured content');

    assert.equal(await page.locator('.core-loop-intro').isVisible(),false,'redundant Archive intro is hidden');
    assert.equal(await page.locator('#core-loop-browse-title').count(),0,'Browse by source heading is removed');
    assert.equal(await page.locator('#sync-history').count(),0,'standalone history button is retired');
    assert.equal(await page.locator('#export-menu').count(),0,'legacy export details are retired');
    assert.equal(await page.locator('#archive-root-overflow summary:visible').count(),1,'Archive root has one visible overflow action control');assert.equal(await page.locator('#document-menu').isVisible(),false,'Reader document menu is not a root action');
    assert.equal(await page.locator('#archive-root-recent,#archive-root-continue').count(),0,'retired root shortcuts are removed from the DOM');
    assert.equal(await page.locator('#revisit-open').isVisible(),false,'Revisit does not add root chrome');

    const trigger=await openArchiveMenu(page);
    assert.deepEqual(await trigger.evaluate(node=>({tag:node.tagName,parent:node.parentElement.tagName,popup:node.getAttribute('aria-haspopup')})),{tag:'SUMMARY',parent:'DETAILS',popup:null},'Archive actions use a native disclosure that also contains the source chooser');
    assert.equal(await page.locator('#archive-root-overflow .archive-root-overflow-actions').getAttribute('role'),'group');
    await eventually(async()=>await trigger.getAttribute('aria-expanded')==='true','overflow announces expanded state');
    await page.locator('#archive-root-history').waitFor({state:'visible'});
    assert.equal(await page.locator('#archive-root-export-json,#archive-root-export-markdown').count(),0);
    await page.locator('#archive-source-scope').focus();await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'archive-source-scope','native source selection keeps its own arrow-key behavior');
    await page.locator('#archive-source-scope').selectOption('');
    const actionKeys=()=>page.locator('#archive-root-overflow .archive-root-overflow-actions button').evaluateAll(nodes=>nodes.map(node=>node.id||node.dataset.view));
    assert.deepEqual(await actionKeys(),['filter-recent-open','revisit','archive-root-history'],'SET2 contextual actions keep their explicit order and single owners');
    const order=page.locator('#archive-order-mode');await eventually(async()=>!await order.isDisabled(),'source-order control is ready');
    assert.equal(await order.inputValue(),'paia');await order.focus();await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'archive-order-mode','native order selection keeps its own arrow-key behavior');
    assert.equal(await order.inputValue(),'paia','ArrowUp at the first native option does not enter the action list or change the setting');
    const activeAction=()=>page.evaluate(()=>document.activeElement?.id||document.activeElement?.dataset.view);
    await trigger.focus();await page.keyboard.press('ArrowDown');
    assert.equal(await activeAction(),'filter-recent-open','arrow navigation enters the first contextual action');
    for(const expected of ['revisit','archive-root-history','filter-recent-open']){await page.keyboard.press('ArrowDown');assert.equal(await activeAction(),expected,'ArrowDown visits each action and wraps');}
    await page.keyboard.press('ArrowUp');assert.equal(await activeAction(),'archive-root-history','ArrowUp wraps to the retained history action');
    await page.keyboard.press('Home');assert.equal(await activeAction(),'filter-recent-open','Home reaches the first action');
    await page.keyboard.press('End');
    assert.equal(await activeAction(),'archive-root-history','End still reaches the retained history action');
    await page.keyboard.press('Escape');
    await eventually(async()=>!(await page.locator('#archive-root-overflow').evaluate(el=>el.open)),'Escape closes Archive action menu');
    assert.equal(await page.evaluate(()=>document.activeElement?.closest('details')?.id),'archive-root-overflow','Escape returns focus to Archive overflow control');
    assert.equal(await trigger.evaluate(node=>document.activeElement===node),true,'Escape returns focus to the exact disclosure trigger');

    await openArchiveMenu(page);await page.locator('#filter-recent-open').click();
    await eventually(()=>page.locator('#filter-recent-dialog').evaluate(node=>node.open),'moved filter discovery opens its existing dialog');
    await page.locator('#filter-recent-close').click();await eventually(()=>page.locator('#filter-recent-dialog').isHidden(),'filter discovery closes normally');
    assert.equal(await page.locator('#filter-recent-open').evaluate(node=>document.activeElement===node),true,'native dialog close returns focus to its filter trigger');
    await page.keyboard.press('Escape');await eventually(async()=>!await page.locator('#archive-root-overflow').evaluate(node=>node.open),'dismiss filter menu before reopening another action');
    await openArchiveMenu(page);await page.locator('#archive-root-overflow [data-view="revisit"]').click();
    await eventually(()=>page.locator('#revisit-panel').isVisible(),'moved Revisit entry reaches its existing owner');
    assert.equal(await page.locator('#archive-root-overflow').evaluate(node=>node.open),false,'leaving Archive closes its contextual menu');
    await page.locator('.sidebar [data-view="library"]').click();await eventually(()=>page.locator('#collection-panel').isVisible(),'return to Archive before retained history flow');
    await openArchiveMenu(page);
    await page.locator('#archive-root-history').click();
    await eventually(()=>page.locator('#history-dialog').evaluate(el=>el.open),'history completion remains reachable from overflow menu');
    await page.locator('#history-close').click();
    await eventually(()=>page.locator('#history-dialog').isHidden(),'history completion closes normally');

    await page.locator('[data-view="settings"]').click();
    await eventually(()=>page.locator('#settings-panel').isVisible(),'Settings opens');
    await page.locator('[data-settings-group="data"]').click();
    await eventually(()=>page.locator('#r6-source-records').isVisible(),'Data & devices shows Source Records entry');
    assert.equal(await page.locator('#archive-root-overflow').isVisible(),false,'Archive overflow is not exposed in Settings');
    assert.equal(await page.locator('#r6-complete-export').count(),0,'complete export implementation has no UI owner');
    await page.locator('#r6-source-records button').click();
    await eventually(()=>page.locator('#collection-panel').isVisible(),'Source Records root opens');
    await page.locator('#scope-search').fill('UIS01_EXPORT_FILTER_A');
    await eventually(async()=>await page.locator('.conversation-document').count()===1,'Source Records filter narrows the current scope');
    const before=await h.state();let downloads=0;page.on('download',()=>downloads++);for(const type of ['PAIA_BACKUP_BEGIN_EXPORT','PAIA_BACKUP_EXPORT_PAGE','PAIA_MEMORY_SHARE']){const result=await page.evaluate(type=>chrome.runtime.sendMessage({type}),type);assert.equal(result.error,'FEATURE_UNAVAILABLE');}assert.deepEqual(await h.state(),before,'retired export requests preserve all archive data');assert.equal(downloads,0);

    assert.equal(h.deepSeekRequests.length,0,'UIS-01 navigation/import/export entry changes invoke no Provider');
    assert.equal(h.extensionNetworkRequests,0,'UIS-01 makes no extension external request');
    assert.equal(h.externalRequests,0,'UIS-01 makes no unexpected external request');
    assert.deepEqual(h.errors,[]);
  } finally {
    await h?.close();
  }
});
