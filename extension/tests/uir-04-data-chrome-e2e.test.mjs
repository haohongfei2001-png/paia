import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
async function consent(page){const action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()));await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true);if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();}
async function chooseGroup(page,key){const select=page.locator('#ux-settings-group-switch');if(await select.isVisible())await select.selectOption(key);else await page.locator(`[data-settings-group="${key}"]`).click();await page.locator(`[data-group="${key}"]`).waitFor({state:'visible'});}
async function openData(page){await page.locator('.sidebar-bottom [data-view="settings"]').click();await eventually(()=>page.locator('#settings-panel').isVisible());await chooseGroup(page,'data');}
async function shot(page,name){await mkdir('work/ux-r6',{recursive:true});await page.screenshot({path:`work/ux-r6/${name}.png`,fullPage:true});}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}

async function assertDataOwners(page){
 const group=page.locator('[data-group="data"]');
 for(const id of ['backup-settings','r6-complete-export','r6-data-status','r6-source-records']){
  const item=page.locator(`#${id}`);assert.equal(await item.count(),1,`${id} keeps one DOM owner`);assert.equal(await item.evaluate(el=>el.parentElement?.dataset.group),'data',`${id} belongs directly to Data & devices`);
 }
 const order=await group.evaluate((root)=>['backup-settings','r6-complete-export','r6-data-status','r6-source-records'].map(id=>[...root.children].findIndex(el=>el.id===id)));
 assert.ok(order.every((value,index)=>value>=0&&(index===0||value>order[index-1])),`data owners stay ordered: ${order.join(',')}`);
 assert.equal(await page.locator('#backup-settings #r6-complete-export').count(),0,'complete export is not nested inside Backup');
 assert.equal(await page.locator('#backup-settings #backup-create').count(),1);assert.equal(await page.locator('#backup-settings #backup-choose').count(),1);
 assert.equal(await page.locator('#r6-complete-export #r6-export-json').count(),1);assert.equal(await page.locator('#r6-complete-export #r6-export-markdown').count(),1);
 assert.equal(await page.locator('#r6-data-status #r6-storage-estimate').count(),1);assert.equal(await page.locator('#r6-data-status #r6-last-backup').count(),1);
 assert.equal(await page.locator('#r6-source-records [data-view="archive"]').count(),1,'scoped Source Records keeps its existing navigation owner');
 for(const id of ['backup-create','backup-choose','backup-restore','r6-export-json','r6-export-markdown'])assert.equal(await page.locator(`#${id}`).count(),1,`${id} is not duplicated`);
 assert.match(await group.textContent(),/不是完整导出/);assert.match(await group.textContent(),/未提供设备同步/);
}

async function sourceAndBackup(marker){
 const h=await FakeChatGPT.start({onboarding:true});let backupBytes;
 try{
  const page=h.archive;await consent(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
  await h.open({id:'uir04-data-source',title:'UIR-04 数据恢复',base:1609459200,messages:[{id:'uir04-data-message',text:marker}]});await eventually(async()=>(await h.state()).records.some(row=>row.originalText===marker));await page.bringToFront();
  await page.setViewportSize({width:1440,height:900});await openData(page);await assertDataOwners(page);await eventually(async()=>!(await page.locator('#r6-storage-estimate').textContent()).includes('正在读取'));
  const openDownload=page.waitForEvent('download');await page.locator('#r6-export-json').click();const openPath=await (await openDownload).path(),bundle=JSON.parse(await readFile(openPath,'utf8'));assert.equal(bundle.format,'PAIA Open Export');assert.ok(bundle.records.some(row=>row.role==='immutable_source_record'&&row.originalText===marker));
  const backupDownload=page.waitForEvent('download');await page.locator('#backup-create').click();const backup=await backupDownload;backupBytes=await readFile(await backup.path());await eventually(async()=>/最近成功创建备份/.test(await page.locator('#r6-last-backup').textContent()));
  await shot(page,'uir-04-data-1440x900-light');await page.setViewportSize({width:390,height:844});await assertDataOwners(page);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=2);await shot(page,'uir-04-data-390x844-light');await assertNoNetwork(h);
 }finally{await h.close();}
 return backupBytes;
}

async function restoreJourney(backupBytes,marker){
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const page=h.archive;await consent(page);await openData(page);await page.locator('#backup-file').setInputFiles({name:'UIR-04-data.paia-backup',mimeType:'application/x-ndjson',buffer:backupBytes});
  await eventually(()=>page.locator('#backup-preview').isVisible(),'restore preview is explicit');assert.equal(await page.locator('#backup-restore').isEnabled(),true,'validated empty-library restore requires the explicit confirm action');assert.match(await page.locator('#backup-status').textContent(),/请核对/);await shot(page,'uir-04-data-restore-preview');
  await page.locator('#backup-restore').click();await eventually(async()=>/恢复已完成/.test(await page.locator('#backup-status').textContent()),'explicit restore completes');
  const index=await rpc(page,'GET_PAGE',{page:{view:'archive',limit:100}}),doc=index.documents.find(row=>row.originalConversationTitle==='UIR-04 数据恢复');assert.ok(doc?.id);const records=await rpc(page,'GET_PAGE',{page:{view:'archive',documentId:doc.id,limit:100}});assert.ok(records.records.some(row=>row.originalText===marker));await assertDataOwners(page);await assertNoNetwork(h);
 }finally{await h.close();}
}

async function releaseJourney(){
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});const h=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});
 try{const page=h.archive;await consent(page);await page.setViewportSize({width:390,height:844});await openData(page);await assertDataOwners(page);assert.equal(await page.locator('#filter-advanced').count(),0,'current release keeps diagnostics pruning');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=2);await shot(page,'uir-04-current-release-data-390x844-light');await assertNoNetwork(h);}finally{await h.close();}
}

test('UIR-04 Data & devices separates Backup, complete export, local status and scoped Source owners while preserving explicit restore in source and current release Chrome',{timeout:300000},async()=>{
 const marker='UIR04_DATA_PRIVATE synthetic input for local-only data presentation.';const backupBytes=await sourceAndBackup(marker);assert.ok(backupBytes?.length);await restoreJourney(backupBytes,marker);await releaseJourney();
});
