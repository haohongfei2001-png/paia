import {measureSettingsGeometry,materializeSettingsBaseline,captureSettingsBaseline,compareD5Settings} from './harness/d5-settings-presentation.mjs';
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
async function consentAndRefreshOrder(page){
 const refused=await page.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_ORDER_PREFERENCE'}));
 assert.equal(refused.ok,false);assert.equal(refused.error,'CONSENT_REQUIRED','real worker still refuses before consent');
 await page.evaluate(()=>{
  const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__uir04OrderCalls=[];window.__uir04OrderOwner=document.getElementById('archive-order-mode');window.__uir04RestoreOrderSend=()=>{chrome.runtime.sendMessage=send;};
  chrome.runtime.sendMessage=async message=>{if(message.type==='PAIA_ARCHIVE_ORDER_PREFERENCE')window.__uir04OrderCalls.push({...message});return send(message);};
 });
 try{
  await consent(page);
  await eventually(async()=>/使用 PAIA 稳定顺序/.test(await page.locator('#archive-order-status').textContent()),'confirmed consent refreshes archive order automatically without reload or manual choice');
  const proof=await page.evaluate(()=>({calls:window.__uir04OrderCalls,sameOwner:window.__uir04OrderOwner===document.getElementById('archive-order-mode'),mode:document.getElementById('archive-order-mode').value}));
  assert.ok(proof.calls.length>0,'the successful state follows a real preference read');assert.ok(proof.calls.every(message=>Object.keys(message).length===1&&message.type==='PAIA_ARCHIVE_ORDER_PREFERENCE'),'automatic recovery only reads the preference');assert.equal(proof.sameOwner,true);assert.equal(proof.mode,'paia');
 }finally{await page.evaluate(()=>{window.__uir04RestoreOrderSend();delete window.__uir04RestoreOrderSend;delete window.__uir04OrderCalls;delete window.__uir04OrderOwner;});}
}
async function openSettings(page){await page.locator('.sidebar-bottom [data-view="settings"]').click();await eventually(()=>page.locator('#settings-panel').isVisible(),'Settings opens');}
async function chooseGroup(page,key){const select=page.locator('#ux-settings-group-switch');if(await select.isVisible())await select.selectOption(key);else await page.locator(`[data-settings-group="${key}"]`).click();await page.locator(`[data-group="${key}"]`).waitFor({state:'visible'});}
async function shot(page,name){await mkdir('work/ux-r6',{recursive:true});await page.screenshot({path:`work/ux-r6/${name}.png`,fullPage:true});}
async function assertOwner(page,selector,key){const count=await page.locator(selector).count();assert.equal(count,1,`${selector} keeps one DOM owner`);assert.equal(await page.locator(selector).evaluate(el=>el.closest('.ux-settings-group')?.dataset.group),key,`${selector} projects into ${key}`);}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}

async function sourceJourney(h){
 const page=h.archive;await consentAndRefreshOrder(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',readingWidth:'wide'}});await page.setViewportSize({width:1440,height:900});await openSettings(page);
 assert.equal(await page.locator('h1:visible').count(),1,'Settings owns one visible h1');assert.equal((await page.locator('#ux-settings-title').textContent()).trim(),'设置');
 const boxes=await measureSettingsGeometry(page);
 assert.ok(Math.abs(boxes.nav-880)<=2,`desktop Settings group row is 880px; got ${boxes.nav}`);assert.ok(Math.abs(boxes.body-880)<=2,`desktop Settings body uses the declared 880px cap; got ${boxes.body}`);assert.ok(Math.abs(boxes.navX-boxes.bodyX)<=2,'group navigation and body share the same reading column');assert.ok(Math.abs(boxes.gap-28)<=2,`group navigation is above the body with 28px gap; got ${boxes.gap}`);
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
 const page=h.archive;await consentAndRefreshOrder(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await page.setViewportSize({width:1440,height:900});await openSettings(page);
 const geometry=await measureSettingsGeometry(page);assert.ok(Math.abs(geometry.nav-880)<=2&&Math.abs(geometry.body-880)<=2&&Math.abs(geometry.navX-geometry.bodyX)<=2&&Math.abs(geometry.gap-28)<=2,'built release keeps the declared 880px single reading column and 28px vertical group gap');
 await assertOwner(page,'#r6-hide-content-previews','privacy');await assertOwner(page,'#r6-complete-export','data');assert.equal(await page.locator('#filter-advanced').count(),0,'release-only diagnostics pruning still applies');
 await page.setViewportSize({width:390,height:844});const switcher=page.locator('#ux-settings-group-switch');await switcher.selectOption('data');await eventually(()=>page.locator('[data-group="data"]').isVisible());assert.equal(await switcher.isVisible(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=2);await shot(page,'uir-04-current-release-settings-data-390x844-light');await assertNoNetwork(h);
}

test('UIR-04 Settings keeps one six-group owner projection while applying the single reading column and same-control mobile switch in source and built release Chrome',{timeout:300000},async()=>{
 let source;try{source=await FakeChatGPT.start({onboarding:true});await sourceJourney(source);}finally{await source?.close();}
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let release;try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});await releaseJourney(release);}finally{await release?.close();}
});


// Before evidence executes the exact adopted source, retaining the old geometry contract.
test('D5 S01 records adopted Settings geometry before its presentation replacement',{timeout:120000},async()=>{
 const extensionPath=await materializeSettingsBaseline();let h;
 try{h=await FakeChatGPT.start({extensionPath,onboarding:true});const page=h.archive;await consent(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await eventually(()=>page.evaluate(()=>document.documentElement.lang==='zh-CN'&&document.documentElement.dataset.paiaTheme==='light'));await page.setViewportSize({width:1440,height:900});await openSettings(page);await captureSettingsBaseline(h);await assertNoNetwork(h);}
 finally{await h?.close();}
});
for(const variant of ['source','release'])test(`D5 S01 Settings preserves six group owners with paired reading-column, keyboard and reflow evidence (${variant})`,{timeout:240000},async()=>{
 if(variant==='release')await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let h;try{h=await FakeChatGPT.start({...(variant==='release'?{extensionPath:'work/current-release'}:{}),onboarding:true});const page=h.archive;await consent(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await eventually(()=>page.evaluate(()=>document.documentElement.lang==='zh-CN'&&document.documentElement.dataset.paiaTheme==='light'));await page.setViewportSize({width:1440,height:900});await openSettings(page);await compareD5Settings(h,variant);await assertNoNetwork(h);}
 finally{await h?.close();}
});
