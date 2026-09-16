import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};

async function consent(page){
 const action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()));await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true);
 if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
}
async function openSettings(page){await page.locator('.sidebar-bottom [data-view="settings"]').click();await eventually(()=>page.locator('#settings-panel').isVisible(),'Settings opens');}
async function chooseGroup(page,key){const select=page.locator('#ux-settings-group-switch');if(await select.isVisible())await select.selectOption(key);else await page.locator(`[data-settings-group="${key}"]`).click();await page.locator(`[data-group="${key}"]`).waitFor({state:'visible'});}
async function shot(page,name){await mkdir('work/ux-r6',{recursive:true});await page.screenshot({path:`work/ux-r6/${name}.png`,fullPage:true});}
async function assertOwner(page,selector,key){const count=await page.locator(selector).count();assert.equal(count,1,`${selector} keeps one DOM owner`);assert.equal(await page.locator(selector).evaluate(el=>el.closest('.ux-settings-group')?.dataset.group),key,`${selector} projects into ${key}`);}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}

async function sourceJourney(h){
 const page=h.archive;await consent(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',readingWidth:'wide'}});await page.setViewportSize({width:1440,height:900});await openSettings(page);
 assert.equal(await page.locator('h1:visible').count(),1,'Settings owns one visible h1');assert.equal((await page.locator('#ux-settings-title').textContent()).trim(),'设置');
 const boxes=await page.evaluate(()=>{const nav=document.querySelector('.ux-settings-nav').getBoundingClientRect(),body=document.querySelector('.ux-settings-body').getBoundingClientRect();return {nav:nav.width,body:body.width,gap:body.x-nav.right};});
 assert.ok(boxes.nav>=179&&boxes.nav<=181,`desktop Settings nav is 180px; got ${boxes.nav}`);assert.ok(boxes.body>=830&&boxes.body<=842,`desktop Settings body is capped near 840px; got ${boxes.body}`);assert.ok(boxes.gap>=31&&boxes.gap<=33,`desktop Settings gap is 32px; got ${boxes.gap}`);
 assert.equal(await page.locator('#ux-settings-group-switch').isVisible(),false,'mobile switch stays hidden on desktop');assert.equal(await page.locator('.ux-settings-nav>[data-settings-group]:visible').count(),6,'desktop keeps six group navigation actions');

 await eventually(()=>page.locator('#reader-revisit-settings').count().then(n=>n===1),'Reading controller projects Revisit settings');await eventually(()=>page.locator('#thought-reverse-edit').count().then(n=>n===1),'Thought controller projects reverse-edit setting');
 for(const [selector,key] of [
  ['#enabled-state','content'],['#toggle-capture','content'],['#smart-filter-settings','content'],['#history-settings','content'],
  ['#ux-appearance','reading'],['#ux-language','reading'],['#ux-font-size','reading'],['#ux-reading-width','reading'],['#time-display','reading'],['#time-emphasis','reading'],['#reader-revisit-settings','reading'],
  ['#deepseek-settings','ai'],['#library-updates','ai'],['#library-updates-drawer','ai'],
  ['#memory-settings','privacy'],['#r6-hide-content-previews','privacy'],
  ['#backup-settings','data'],['#r6-complete-export','data'],['#manage-excluded','data'],['#legacy-entry','data'],
  ['#library-management','advanced'],['#product-diagnostics','advanced'],['#diagnostics','advanced'],['#prune-revisions','advanced'],['#thought-reverse-edit','advanced']
 ])await assertOwner(page,selector,key);
 const sourceButton=page.locator('[data-group="data"] [data-view="archive"]');assert.equal(await sourceButton.count(),1,'scoped Source Records entry belongs to Data & devices');
 await shot(page,'uir-04-settings-content-1440x900-light');

 await chooseGroup(page,'reading');const width=page.locator('#ux-reading-width');assert.equal(await width.inputValue(),'wide');
 await page.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__uir04Send=send;chrome.runtime.sendMessage=async message=>message?.type==='UPDATE_PREFERENCES'&&message?.changes?.readingWidth==='narrow'?{ok:false,error:'STORAGE_FAILED'}:send(message);});
 await width.selectOption('narrow');await eventually(async()=>(await width.inputValue())==='wide','failed preference write rolls the same control back');assert.match(await page.locator('#ux-settings-feedback').textContent(),/恢复原值/);await page.evaluate(()=>{chrome.runtime.sendMessage=globalThis.__uir04Send;delete globalThis.__uir04Send;});
 await page.locator('#ux-language').selectOption('en');await eventually(async()=>await page.evaluate(()=>document.documentElement.lang)==='en');assert.deepEqual(await page.locator('#ux-settings-group-switch option').allTextContents(),['Content & capture','Reading & appearance','AI','Privacy & external use','Data & devices','Advanced']);
 await page.locator('#ux-language').selectOption('zh-CN');await eventually(async()=>await page.evaluate(()=>document.documentElement.lang)==='zh-CN');
 await rpc(page,'SET_ENABLED',{enabled:false});await page.reload();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true);await openSettings(page);assert.equal((await rpc(page,'GET_STATUS')).enabled,false,'opening Settings never resumes paused capture');assert.match(await page.locator('#enabled-state').textContent(),/暂停/);

 await page.setViewportSize({width:390,height:844});const switcher=page.locator('#ux-settings-group-switch');assert.equal(await switcher.isVisible(),true,'<800px uses the current-group switcher');assert.equal(await page.locator('.ux-settings-nav>[data-settings-group]:visible').count(),0,'mobile does not duplicate the six desktop tabs');const mobile=await switcher.boundingBox();assert.ok(mobile&&mobile.height>=44,'mobile group switch target is at least 44px');
 await switcher.selectOption('privacy');await eventually(()=>page.locator('[data-group="privacy"]').isVisible());await page.evaluate(()=>{globalThis.__uir04PrivacyOwner=document.getElementById('memory-settings');});await switcher.focus();await switcher.selectOption('data');await switcher.selectOption('privacy');assert.equal(await page.evaluate(()=>globalThis.__uir04PrivacyOwner===document.getElementById('memory-settings')),true,'mobile switching reuses the same control owner');assert.equal(await page.evaluate(()=>document.activeElement?.id),'ux-settings-group-switch','group switching keeps navigation focus');assert.equal(await page.locator('#memory-settings').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=2,'mobile Settings has no root horizontal overflow');
 await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');await shot(page,'uir-04-settings-privacy-390x844-dark');await assertNoNetwork(h);
}

async function releaseJourney(h){
 const page=h.archive;await consent(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await page.setViewportSize({width:1440,height:900});await openSettings(page);
 const geometry=await page.evaluate(()=>{const nav=document.querySelector('.ux-settings-nav').getBoundingClientRect(),body=document.querySelector('.ux-settings-body').getBoundingClientRect();return [nav.width,body.width,body.x-nav.right];});assert.ok(geometry[0]>=179&&geometry[0]<=181&&geometry[1]>=830&&geometry[1]<=842&&geometry[2]>=31&&geometry[2]<=33,'built release keeps the 180 / 840 / 32 Settings frame');
 await assertOwner(page,'#r6-hide-content-previews','privacy');await assertOwner(page,'#r6-complete-export','data');assert.equal(await page.locator('#filter-advanced').count(),0,'release-only diagnostics pruning still applies');
 await page.setViewportSize({width:390,height:844});const switcher=page.locator('#ux-settings-group-switch');await switcher.selectOption('data');await eventually(()=>page.locator('[data-group="data"]').isVisible());assert.equal(await switcher.isVisible(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=2);await shot(page,'uir-04-current-release-settings-data-390x844-light');await assertNoNetwork(h);
}

test('UIR-04 Settings keeps one six-group owner projection while applying the 180/840 desktop frame and same-control mobile switch in source and built release Chrome',{timeout:300000},async()=>{
 let source;try{source=await FakeChatGPT.start({onboarding:true});await sourceJourney(source);}finally{await source?.close();}
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let release;try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});await releaseJourney(release);}finally{await release?.close();}
});
