import {chooseConsumerGroup as chooseGroup} from './harness/settings-consumer-presentation.mjs';
import {historicalBackupItems} from './harness/historical-backup-browser.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
async function consent(page){const action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()));await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true);const onboarding=await rpc(page,'GET_ONBOARDING');assert.equal(onboarding.step,'history');assert.equal(onboarding.historyState,'not_started');assert.equal(await page.locator('#onboarding-history-step').isVisible(),false,'Archive hides the card without skipping optional import');}

async function openData(page){
 const compact=await page.evaluate(()=>innerWidth<768);
 await eventually(()=>page.evaluate(compact=>{const button=document.querySelector('.sidebar [data-view="settings"]'),menu=document.getElementById('archive-compact-navigation');return compact?button?.parentElement?.id==='archive-compact-nav-items'&&menu.hidden===false:button?.parentElement?.classList.contains('sidebar-bottom');},compact),'Settings primary control has settled in its real breakpoint owner');
 if(compact){await page.locator('#archive-compact-navigation > summary').click();await page.locator('#archive-compact-nav-items [data-view="settings"]').click();}else await page.locator('.sidebar-bottom [data-view="settings"]').click();await eventually(()=>page.locator('#settings-panel').isVisible());await chooseGroup(page,'data');}
async function shot(page,name){await mkdir('work/ux-r6',{recursive:true});await page.screenshot({path:`work/ux-r6/${name}.png`,fullPage:true});}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}

async function assertDataOwners(page){
 const group=page.locator('[data-group="data"]');
 for(const id of ['backup-settings','r6-source-records']){
  const item=page.locator(`#${id}`);assert.equal(await item.count(),1,`${id} keeps one DOM owner`);assert.equal(await item.evaluate(el=>el.closest('.ux-settings-group')?.dataset.group),'data',`${id} remains in its Data destination`);
 }
 const destinations=await group.locator(':scope > details.ux-settings-detail > summary').allTextContents();assert.deepEqual(destinations,['从已有 PAIA 备份恢复','已移除的内容']);assert.equal(await group.locator('#settings-storage').count(),1);assert.equal(await page.locator('#r6-data-status').count(),1);assert.equal(await page.locator('#r6-data-status').evaluate(node=>node.closest('dialog')?.id),'settings-storage-dialog');assert.equal(await page.locator('#product-diagnostics').isVisible(),false,'fault-only maintenance is not an ordinary Data destination');
 assert.equal(await page.locator('#backup-settings #r6-complete-export').count(),0,'complete export is not nested inside Backup');
 assert.equal(await page.locator('#backup-create').count(),0);assert.equal(await page.locator('#backup-settings #backup-choose').count(),1);
 assert.equal(await page.locator('#r6-complete-export,#r6-export-json,#r6-export-markdown').count(),0);
 assert.equal(await page.locator('#r6-data-status #r6-storage-estimate').count(),1);assert.equal(await page.locator('#r6-last-backup').count(),0);
 assert.equal(await page.locator('#r6-source-records [data-view="archive"]').count(),1,'scoped Source Records keeps its existing navigation owner');
 for(const id of ['backup-choose','backup-restore'])assert.equal(await page.locator(`#${id}`).count(),1,`${id} is not duplicated`);
assert.equal(await group.locator('#settings-ai-context').count(),0,'Context has no duplicate Data owner');
}

async function readOnlyDetails(page,variant){
 const viewport=page.viewportSize(),saved=(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences,originalLanguage=await page.evaluate(()=>document.documentElement.lang);
 try{await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'en',appearance:'dark'}});await eventually(()=>page.evaluate(()=>document.documentElement.lang==='en'));await page.setViewportSize({width:320,height:900});for(const [group,id]of [['data','settings-storage'],['privacy','settings-supported-sites-open']]){await chooseGroup(page,group);const row=page.locator('#'+id),dialog=page.locator('#'+id+'-dialog');await row.focus();await page.keyboard.press('Enter');await dialog.waitFor({state:'visible'});assert.equal(await dialog.getAttribute('aria-labelledby'),id+'-title');assert.equal(await dialog.locator('.ux-settings-detail-close').evaluate(node=>document.activeElement===node),true);await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(node=>node.contains(document.activeElement)),true,'native modal retains keyboard focus');await dialog.evaluate(node=>{globalThis.__detailFont=[...node.querySelectorAll('h2,p,button')].map(el=>({el,size:el.style.fontSize}));for(const {el}of __detailFont)el.style.fontSize=(parseFloat(getComputedStyle(el).fontSize)*2)+'px';});assert.ok(await dialog.evaluate(node=>node.scrollWidth-node.clientWidth)<=2);await shot(page,`set2-${variant}-${id}-320-dark-en-2x`);await dialog.evaluate(()=>{for(const {el,size}of __detailFont)el.style.fontSize=size;delete globalThis.__detailFont;});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await row.evaluate(node=>document.activeElement===node),true);await row.click();await dialog.waitFor({state:'visible'});await page.evaluate(()=>history.back());await dialog.waitFor({state:'hidden'});assert.equal(await page.locator('#settings-panel').isVisible(),true);assert.equal(await row.evaluate(node=>document.activeElement===node),true,'Browser Back returns to the same destination');}
 await chooseGroup(page,'data');await page.evaluate(()=>{globalThis.__storageEstimate=navigator.storage.estimate.bind(navigator.storage);navigator.storage.estimate=async()=>({quota:1048576});});try{await page.locator('#settings-storage').click();await eventually(async()=>/not available/.test(await page.locator('#r6-storage-estimate').textContent()));assert.match(await page.locator('#settings-storage').textContent(),/Unknown/);await page.keyboard.press('Escape');await page.evaluate(()=>{navigator.storage.estimate=async()=>{throw Error('synthetic estimate failure');};});await page.locator('#settings-storage').click();await eventually(async()=>/Could not read/.test(await page.locator('#r6-storage-estimate').textContent()));assert.equal(await page.locator('#r6-storage-estimate').isVisible(),true);assert.match(await page.locator('#settings-storage').textContent(),/Unavailable/);await shot(page,`set2-${variant}-storage-read-error`);await page.keyboard.press('Escape');}finally{await page.evaluate(()=>{navigator.storage.estimate=__storageEstimate;delete globalThis.__storageEstimate;});}
 }finally{await page.evaluate(()=>{for(const {el,size}of globalThis.__detailFont||[])el.style.fontSize=size;delete globalThis.__detailFont;for(const dialog of document.querySelectorAll('.ux-settings-detail-dialog[open]'))dialog.close();});if(viewport)await page.setViewportSize(viewport);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:saved.language,appearance:saved.appearance}});await eventually(()=>page.evaluate(language=>document.documentElement.lang===language,originalLanguage));await chooseGroup(page,'data');}
}

async function rejectAndReselectBackup(page,backupBytes){
 const destination=page.locator('details').filter({has:page.locator('#backup-settings')});if(!await page.locator('#backup-choose').isVisible())await destination.locator(':scope > summary').click();
 const invalid={name:'S05-invalid.paia-backup',mimeType:'application/x-ndjson',buffer:Buffer.from('{"not":"a PAIA backup"}\n')};
 const choose=async files=>{const picker=page.waitForEvent('filechooser');await page.locator('#backup-choose').click();await (await picker).setFiles(files);};
 await page.evaluate(()=>{globalThis.__s05Picker=document.getElementById('backup-choose');globalThis.__s05File=document.getElementById('backup-file');});
 await choose(invalid);await page.locator('#backup-settings[data-inspection-failure]').waitFor();await eventually(()=>page.locator('#backup-failure-return').isEnabled());
 assert.equal(await page.locator('#backup-restore').isDisabled(),true);assert.equal(await page.locator('h1:visible').count(),1);assert.equal(await page.locator('#backup-failure-page-title').isVisible(),true);assert.equal((await page.locator('#history-settings:visible,#onboarding-history-step:visible').count())===1,false,'backup rejection isolates the history destination');
 const reason=await page.locator('#backup-status').innerText();await choose([]);assert.equal(await page.locator('#backup-status').innerText(),reason,'empty picker result leaves the rejected inspection visible');
 await choose(invalid);await eventually(()=>page.locator('#backup-failure-return').isEnabled());assert.equal(await page.locator('#backup-status').innerText(),reason,'the same rejected file can be chosen again');
 await page.locator('#backup-failure-return').focus();await page.keyboard.press('Enter');await page.locator('#backup-settings[data-inspection-failure]').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.activeElement?.id),'backup-choose');assert.equal((await page.locator('#history-settings:visible,#onboarding-history-step:visible').count())===1,true,'backup return restores the history destination');assert.equal(await page.locator('#r6-export-json').count(),0);await assertDataOwners(page);
 await choose(invalid);await page.locator('#backup-settings[data-inspection-failure]').waitFor();await eventually(()=>page.locator('#backup-choose').isEnabled());
 await choose({name:'UIR-04-data.paia-backup',mimeType:'application/x-ndjson',buffer:backupBytes});await page.locator('#backup-preview').waitFor({state:'visible'});
 assert.equal(await page.locator('#backup-settings[data-inspection-failure]').count(),0);assert.equal(await page.locator('#backup-failure-page-title').isVisible(),false);assert.equal((await page.locator('#history-settings:visible,#onboarding-history-step:visible').count())===1,true,'backup return restores the history destination');
 assert.equal(await page.evaluate(()=>globalThis.__s05Picker===document.getElementById('backup-choose')&&globalThis.__s05File===document.getElementById('backup-file')),true,'failed and valid inspections keep the same picker and file owners');
 await page.evaluate(()=>{delete globalThis.__s05Picker;delete globalThis.__s05File;});
}

async function sourceAndBackup(marker){
 const h=await FakeChatGPT.start({onboarding:true});let backupBytes;
 try{
  const page=h.archive;await consent(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
  await h.open({id:'uir04-data-source',title:'UIR-04 数据恢复',base:1609459200,messages:[{id:'uir04-data-message',text:marker}]});await eventually(async()=>(await h.state()).records.some(row=>row.originalText===marker));await page.bringToFront();
  await page.setViewportSize({width:1440,height:900});await openData(page);await assertDataOwners(page);await eventually(async()=>!(await page.locator('#r6-storage-estimate').textContent()).includes('正在读取'));
  await readOnlyDetails(page,'source');const before=await h.state();backupBytes=Buffer.from((await historicalBackupItems(page)).map(row=>JSON.stringify(row)).join('\n')+'\n');assert.deepEqual(await h.state(),before,'historical fixture encoding is read-only');
  await shot(page,'uir-04-data-1440x900-light');await page.setViewportSize({width:390,height:844});await assertDataOwners(page);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=2);await shot(page,'uir-04-data-390x844-light');await assertNoNetwork(h);
 }finally{await h.close();}
 return backupBytes;
}

async function restoreJourney(backupBytes,marker){
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const page=h.archive;await consent(page);await openData(page);const before=await h.state();await rejectAndReselectBackup(page,backupBytes);assert.deepEqual(await h.state(),before,'rejected/preview-only inspections never change the current library');
  await eventually(()=>page.locator('#backup-preview').isVisible(),'restore preview is explicit');assert.equal(await page.locator('#backup-restore').isEnabled(),true,'validated empty-library restore requires the explicit confirm action');assert.match(await page.locator('#backup-status').textContent(),/请核对/);await shot(page,'uir-04-data-restore-preview');
  await page.locator('#backup-restore').click();await eventually(async()=>/恢复已完成/.test(await page.locator('#backup-status').textContent()),'explicit restore completes');
  const index=await rpc(page,'GET_PAGE',{page:{view:'archive',limit:100}}),doc=index.documents.find(row=>row.originalConversationTitle==='UIR-04 数据恢复');assert.ok(doc?.id);const records=await rpc(page,'GET_PAGE',{page:{view:'archive',documentId:doc.id,limit:100}});assert.ok(records.records.some(row=>row.originalText===marker));await assertDataOwners(page);await assertNoNetwork(h);
 }finally{await h.close();}
}

async function releaseJourney(backupBytes){
 const releasePath=await mkdtemp(join(tmpdir(),'paia-uir04-data-release-'));await execFileAsync('python3',['scripts/build_current_release.py',releasePath],{cwd:process.cwd(),maxBuffer:16*1024*1024});const h=await FakeChatGPT.start({extensionPath:releasePath,onboarding:true});
 try{const page=h.archive;await consent(page);await page.setViewportSize({width:390,height:844});await openData(page);await assertDataOwners(page);await readOnlyDetails(page,'release');assert.equal(await page.locator('#filter-advanced').count(),0,'current release keeps diagnostics pruning');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=2);await shot(page,'uir-04-current-release-data-390x844-light');const before=await h.state();await rejectAndReselectBackup(page,backupBytes);assert.deepEqual(await h.state(),before,'release inspection never commits a restore');assert.equal(await page.locator('#backup-restore').isEnabled(),true);await page.locator('#backup-cancel').click();assert.equal(await page.locator('#backup-preview').isVisible(),false);await assertNoNetwork(h);}finally{await h.close();await rm(releasePath,{recursive:true,force:true});}
}

test('UIR-04 Data & devices separates Backup, complete export, local status and scoped Source owners while preserving explicit restore in source and current release Chrome',{timeout:300000},async()=>{
 const marker='UIR04_DATA_PRIVATE synthetic input for local-only data presentation.';const backupBytes=await sourceAndBackup(marker);assert.ok(backupBytes?.length);await restoreJourney(backupBytes,marker);await releaseJourney(backupBytes);
});
