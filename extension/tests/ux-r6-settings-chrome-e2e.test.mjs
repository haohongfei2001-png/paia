import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){const action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()),'local-save consent actionable');await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent durable');}

test('UX-R6 Settings exposes complete data exit, durable privacy mask and truthful local capability states across release sizes',{timeout:180000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=h.archive,text='UXR6_PORTABLE 私人合成输入，仅用于完整导出与跨尺寸验收。';await consent(p);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  await h.open({id:'ux-r6-portable',title:'UX-R6 portable synthetic',base:1609459200,messages:[{id:'ux-r6-message-1',text}]});await eventually(async()=>(await h.state()).records.some(x=>x.originalText===text),'synthetic Source captured');
  await p.bringToFront();await p.locator('.sidebar-bottom [data-view="settings"]').click();await eventually(()=>p.locator('#settings-panel').isVisible(),'Settings opens');
  assert.deepEqual(await p.locator('.ux-settings-nav button').allTextContents(),['内容与收录','阅读与外观','AI','隐私与对外使用','数据与设备','高级']);
  await p.locator('[data-settings-group="data"]').click();await eventually(()=>p.locator('#ux-r6-open-export').isVisible(),'complete export control appears in Data & devices');
  const dataText=await p.locator('[data-group="data"]').textContent();assert.match(dataText,/当前版本未提供设备同步/);assert.match(dataText,/完整导出/);assert.match(dataText,/本机存储/);assert.match(dataText,/创建备份/);assert.match(dataText,/从备份恢复/);
  await eventually(async()=>((await p.locator('#ux-r6-storage-status').textContent())||'').trim().length>0,'storage estimate resolves honestly');
  assert.doesNotMatch(await p.locator('#ux-r6-storage-status').textContent(),/无限|unlimited/i);

  const openDownload=p.waitForEvent('download');await p.locator('#ux-r6-export-json').click();const open=await openDownload,openText=await readFile(await open.path(),'utf8'),payload=JSON.parse(openText);
  assert.equal(payload.format,'PAIA Open Export');assert.equal(payload.privacy.credentialsIncluded,false);assert.ok(payload.roles.source.sections.sources.length>=1);assert.ok(payload.roles.input.sections.inputs.length>=1);assert.doesNotMatch(openText,/UXR6_FAKE_API_KEY|"apiKey"/);
  await eventually(async()=>/文件已生成|File generated/.test(await p.locator('#ux-r6-export-status').textContent()),'open export reports generated, not remote saved');

  const backupDownload=p.waitForEvent('download');await p.locator('#backup-create').click();await backupDownload;await eventually(async()=>/备份已生成并开始下载/.test(await p.locator('#backup-status').textContent()),'backup generation completes');await eventually(async()=>!/尚无本浏览器记录/.test(await p.locator('#ux-r6-backup-last').textContent()),'browser-local backup generation record updates');

  await p.locator('[data-settings-group="privacy"]').click();const mask=p.locator('#privacy-preview-mask');await eventually(()=>mask.isVisible(),'privacy preview mask is in Privacy & external use');assert.equal(await mask.isChecked(),false);await mask.check();await eventually(async()=>await p.evaluate(()=>document.documentElement.dataset.paiaPrivatePreview)==='hidden','preview mask applies without reload');
  await p.reload();await eventually(async()=>await p.evaluate(()=>document.documentElement.dataset.paiaPrivatePreview)==='hidden','preview mask survives page reload');assert.equal(await p.locator('#privacy-preview-mask').isChecked(),true);
  assert.match(await p.locator('#ux-r6-privacy-preview').textContent(),/不是加密|not encryption/i);

  await mkdir('work/ux-r6',{recursive:true});for(const [width,height] of [[1440,900],[1024,768],[390,844],[320,720]]){await p.setViewportSize({width,height});await p.locator('[data-settings-group="data"]').click();await p.screenshot({path:`work/ux-r6/settings-data-${width}x${height}.png`,fullPage:true});const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow<=2,`R6 Settings must reflow at ${width}px; overflow=${overflow}`);assert.equal(await p.locator('#ux-r6-export-json').isVisible(),true);}
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
