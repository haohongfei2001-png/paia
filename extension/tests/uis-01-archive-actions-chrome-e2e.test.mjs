import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

async function consent(page){
  const action=page.locator('#enable-consent');
  await action.waitFor({state:'visible'});
  await eventually(async()=>!(await action.isDisabled()),'consent action is available');
  await action.click();
  await eventually(()=>page.locator('#onboarding-skip').isVisible(),'optional history onboarding appears');
  await page.locator('#onboarding-skip').click();
  await eventually(async()=>!(await page.locator('#onboarding-history-step').isVisible()),'optional history onboarding closes');
}

async function openArchiveMenu(page){
  const trigger=page.locator('#document-menu');
  await trigger.waitFor({state:'visible'});
  await trigger.click();
  await eventually(()=>page.locator('#context-menu').isVisible(),'Archive action menu opens');
  return trigger;
}

async function download(page,format){
  await openArchiveMenu(page);
  const pending=page.waitForEvent('download');
  await page.locator(`#archive-action-export-${format}`).click();
  const item=await pending;
  return readFile(await item.path(),'utf8');
}

test('UIS-01 quiets Archive root and consolidates history/export actions without changing export semantics',{timeout:120000},async()=>{
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
    await eventually(async()=>await page.locator('.conversation-document').count()===2,'Archive root has both documents');

    assert.equal(await page.locator('.core-loop-intro').isVisible(),false,'redundant Archive intro is hidden');
    assert.equal(await page.locator('#core-loop-browse-title').count(),0,'Browse by source heading is removed');
    assert.equal(await page.locator('#sync-history').isVisible(),false,'standalone history button is not visible');
    assert.equal(await page.locator('#export-menu').isVisible(),false,'legacy export details are not visible');
    assert.equal(await page.locator('#document-menu:visible').count(),1,'Archive root reuses one visible overflow action control');
    assert.equal(await page.locator('#core-loop-continue').count(),1,'recent/continue capability remains mounted');
    assert.equal(await page.locator('#core-loop-return').count(),1,'Revisit capability remains mounted');

    const trigger=await openArchiveMenu(page);
    assert.equal(await trigger.getAttribute('aria-haspopup'),'menu');
    assert.equal(await trigger.getAttribute('aria-expanded'),'true');
    await page.locator('#archive-action-history').waitFor({state:'visible'});
    await page.locator('#archive-action-export-json').waitFor({state:'visible'});
    await page.locator('#archive-action-export-markdown').waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    await eventually(async()=>!(await page.locator('#context-menu').isVisible()),'Escape closes Archive action menu');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'document-menu','Escape returns focus to Archive overflow control');

    await openArchiveMenu(page);
    await page.locator('#archive-action-history').click();
    await eventually(()=>page.locator('#history-dialog').evaluate(el=>el.open),'history completion remains reachable from overflow menu');
    await page.locator('#history-close').click();
    await eventually(()=>page.locator('#history-dialog').isHidden(),'history completion closes normally');

    await page.locator('[data-view="settings"]').click();
    await eventually(()=>page.locator('#settings-panel').isVisible(),'Settings opens');
    await page.locator('[data-settings-group="data"]').click();
    await eventually(()=>page.locator('#r6-source-records').isVisible(),'Data & devices shows Source Records entry');
    assert.equal(await page.locator('#document-menu').isVisible(),false,'Archive overflow is not exposed in Settings');
    assert.equal(await page.locator('#r6-complete-export').isVisible(),true,'complete export remains a separate Settings surface');
    assert.match(await page.locator('#r6-complete-export').textContent(),/完整导出/,'complete export keeps its distinct identity');
    assert.match(await page.locator('#r6-source-records').textContent(),/不是完整导出/,'Source Records explains that current-scope export is not complete export');

    await page.locator('#r6-source-records button').click();
    await eventually(()=>page.locator('#collection-panel').isVisible(),'Source Records root opens');
    await page.locator('#search').fill('UIS01_EXPORT_FILTER_A');
    await eventually(async()=>await page.locator('.conversation-document').count()===1,'Source Records filter narrows the current scope');
    const json=JSON.parse(await download(page,'json'));
    assert.equal(json.format,'personal-ai-input-archive');
    assert.equal(json.schemaVersion,2);
    assert.equal(json.recordCount,1,'JSON export preserves current Source Records filter semantics');
    assert.equal(json.records[0].originalText,'UIS01_EXPORT_FILTER_A 只用于档案动作测试。');
    assert.ok(json.records[0].capturedAt,'raw export still includes capture time evidence');
    assert.ok(Object.hasOwn(json.records[0],'sourceSentAt'),'raw export still includes source-send-time field');

    const markdown=await download(page,'markdown');
    assert.match(markdown,/UIS01_EXPORT_FILTER_A/,'Markdown export remains reachable from the same overflow menu');
    assert.doesNotMatch(markdown,/UIS01_EXPORT_FILTER_B/,'Markdown export preserves the current Source Records filter');
    assert.match(markdown,/发送时间:/);
    assert.match(markdown,/捕获时间:/);

    assert.equal(h.deepSeekRequests.length,0,'UIS-01 navigation/import/export entry changes invoke no Provider');
    assert.equal(h.extensionNetworkRequests,0,'UIS-01 makes no extension external request');
    assert.equal(h.externalRequests,0,'UIS-01 makes no unexpected external request');
    assert.deepEqual(h.errors,[]);
  } finally {
    await h?.close();
  }
});
